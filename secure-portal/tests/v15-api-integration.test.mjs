import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {nickname,randomToken,digest,encryptionKey,seal,open,canSeeRecord,escapeCSV,isSafeOrigin} from '../lib/security.mjs';
import {validateEntry,sharedSelection,validateSessionEntry,drivePolicyEnabled} from '../lib/record-contract.mjs';

// Compile the actual API handler with stub external adapters; no Netlify DB, real users or Google API are accessed.
const src=readFileSync(new URL('../netlify/functions/api.mjs',import.meta.url),'utf8')
 .replace(/^import .*;\s*$/gm,'')
 .replace('export default async function handler(req)','async function handler(req)')
 .replace('export const config=','const config=');
const key=randomBytes(32),uuid='e2a919ff-045c-44c5-bb23-0c1c28458016';
const student={id:'u-student',role:'student',therapist_id:'u-therapist',student_id:null};
const therapist={id:'u-therapist',role:'therapist',therapist_id:null,student_id:null};
const parent={id:'u-parent',role:'parent',therapist_id:'u-therapist',student_id:'u-student'};
let actor=student,record={},oauth=null,deletes=0,savedClinician=null,queryLog=[];
const pool={
 async query(sql,params=[]){
  queryLog.push(sql);
  if(sql.includes('FROM portal_sessions s JOIN portal_users'))return {rows:[actor]};
  if(sql.includes('SELECT id,therapist_id,shared_at,drive_file_id FROM portal_records'))return {rows:record.id===params[0]&&record.author_id===params[1]?[{...record}]:[]};
  if(sql.includes('UPDATE portal_records SET shared_at=NULL')){assert.equal(params[0],record.id);record.shared_at=null;record.shared_nonce=null;record.shared_auth_tag=null;record.encrypted_shared_payload=null;return {rowCount:1,rows:[]};}
  if(sql.includes('SELECT * FROM portal_oauth WHERE therapist_id'))return {rows:oauth?[oauth]:[]};
  if(sql.includes('UPDATE portal_records SET drive_file_id=NULL')){if(record.id===params[0]&&record.drive_file_id===params[2]&&!record.shared_at){record.drive_file_id=null;return {rowCount:1}}return {rowCount:0};}
  if(sql.includes("FROM portal_users WHERE id=$1 AND role='student' AND therapist_id=$2"))return {rows:params[0]==='u-student'&&params[1]==='u-therapist'?[{id:'u-student'}]:[]};
  if(sql.includes('INSERT INTO portal_session_notes')){savedClinician={studentId:params[0],therapistId:params[1],nonce:params[2],auth_tag:params[3],encrypted_payload:params[4]};return {rows:[]};}
  if(sql.includes('SELECT id,drive_file_id FROM portal_records'))return {rows:record.drive_file_id&&!record.shared_at?[{id:record.id,drive_file_id:record.drive_file_id}]:[]};
  if(sql.includes('SELECT folder_id FROM portal_oauth'))return {rows:oauth?[{folder_id:'folder'}]:[]};
  if(sql==='BEGIN'||sql==='COMMIT'||sql==='ROLLBACK')return {rows:[]};
  throw Error('Unhandled mock DB SQL: '+sql.slice(0,140));
 },
 async connect(){return {query:(sql,params)=>pool.query(sql,params),release(){}};}
};
const processMock={env:{RECORD_ENCRYPTION_KEY:key.toString('base64'),APP_ORIGIN:'https://clinic.test',GOOGLE_CLIENT_ID:'client',GOOGLE_CLIENT_SECRET:'secret'}};
const externalFetch=async(url,options={})=>{
 if(String(url).includes('oauth2.googleapis.com'))return new Response(JSON.stringify({access_token:'fake-token'}),{status:200,headers:{'Content-Type':'application/json'}});
 if(String(url).includes('googleapis.com/drive/v3/files/')&&options.method==='DELETE'){deletes++;return new Response(null,{status:204});}
 throw Error('Unexpected network call: '+String(url));
};
const factory=new Function('getDatabase','randomUUID','timingSafeEqual','generateRegistrationOptions','verifyRegistrationResponse','generateAuthenticationOptions','verifyAuthenticationResponse','nickname','randomToken','digest','encryptionKey','seal','open','canSeeRecord','escapeCSV','isSafeOrigin','validateEntry','sharedSelection','validateSessionEntry','drivePolicyEnabled','fetch','process',src+'\nreturn handler');
const handler=factory(()=>({pool}),randomUUID,timingSafeEqual,()=>{},()=>{},()=>{},()=>{},nickname,randomToken,digest,encryptionKey,seal,open,canSeeRecord,escapeCSV,isSafeOrigin,validateEntry,sharedSelection,validateSessionEntry,drivePolicyEnabled,externalFetch,processMock);
const call=async(path,body,method='POST')=>{
 const token='s'.repeat(35);
 const options={method,headers:{origin:'https://clinic.test',cookie:'__Host-ildan_sid='+token}};
 if(method==='POST'){options.headers['Content-Type']='application/json';options.body=JSON.stringify(body||{});}
 const response=await handler(new Request('https://clinic.test/api/'+path,options));
 return {status:response.status,data:await response.json()};
};
const reset=({withDrive=false,connected=false}={})=>{
 actor=student;deletes=0;queryLog=[];savedClinician=null;
 record={id:uuid,author_id:student.id,therapist_id:therapist.id,shared_at:new Date(),shared_nonce:'n',shared_auth_tag:'tag',encrypted_shared_payload:'encrypted',drive_file_id:withDrive?'google-file-1':null};
 const encrypted=seal('offline-mock-refresh-token',key);oauth=connected?{encrypted_refresh_token:encrypted.encrypted_payload,nonce:encrypted.nonce,auth_tag:encrypted.auth_tag,folder_id:'folder'}:null;
};

test('author share cancellation clears shared keys atomically but retains their private record',async()=>{
 reset();const res=await call('unshare',{recordId:uuid});
 assert.equal(res.status,200);assert.equal(res.data.serverAccessRevoked,true);
 assert.equal(res.data.remoteCopyStatus,'not_synced');assert.equal(record.shared_at,null);assert.equal(record.encrypted_shared_payload,null);
 assert.equal(record.author_id,student.id);
 assert(queryLog.some(x=>x.includes('WHERE id=$1 AND author_id=$2 FOR UPDATE')));
});
test('another student or parent cannot revoke someone else\'s record',async()=>{
 reset();actor=parent;const res=await call('unshare',{recordId:uuid});
 assert.equal(res.status,403);assert(record.shared_at);
});
test('revoke access first and transparently flag an undeleted Google copy',async()=>{
 reset({withDrive:true});const res=await call('unshare',{recordId:uuid});
 assert.equal(res.status,200);assert.equal(res.data.remoteCopyStatus,'pending');
 assert.equal(record.shared_at,null);assert.equal(record.drive_file_id,'google-file-1');
});
test('with consent-enabled Google settings and existing token, remote file deletion is acknowledged',async()=>{
 reset({withDrive:true,connected:true});const res=await call('unshare',{recordId:uuid});
 assert.equal(res.status,200);assert.equal(res.data.remoteCopyStatus,'deleted');
 assert.equal(deletes,1);assert.equal(record.drive_file_id,null);
});
test('restricted therapist cleanup retries pending Drive copy without restoring share',async()=>{
 reset({withDrive:true,connected:true});actor=therapist;record.shared_at=null;
 const res=await call('drive/cleanup',{});
 assert.equal(res.status,200);assert.equal(res.data.deleted,1);assert.equal(record.shared_at,null);
});
test('student cannot trigger therapist cleanup, including by passing record identifiers',async()=>{
 reset({withDrive:true,connected:true});actor=student;record.shared_at=null;
 const res=await call('drive/cleanup',{recordId:uuid});assert.equal(res.status,403);assert.equal(deletes,0);
});
test('therapist clinical v15 notes are saved in AES-GCM with all necessary source fields',async()=>{
 reset();actor=therapist;
 const fields={studentReport:'가상 학생 진술',parentReport:'가상 보호자 보고',observation:'직접 관찰',workingHypothesis:'잠정 가설',alternatives:'다른 가능성',burdenReview:'부담 또는 반복 확인이 보고됨',erpReview:'적합성 평가가 필요함'};
 const res=await call('session-notes',{studentId:'u-student',entry:fields});
 assert.equal(res.status,201);assert(savedClinician);
 const decrypted=JSON.parse(open(savedClinician,key));
 assert.deepEqual(decrypted,fields);assert(!savedClinician.encrypted_payload.includes('가상 학생'));
});
test('non-therapist notes cannot be forged via the clinical endpoint',async()=>{
 reset();actor=parent;const res=await call('session-notes',{studentId:'u-student',entry:{workingHypothesis:'forged'}});
 assert.equal(res.status,403);assert.equal(savedClinician,null);
});
test('Google Drive status returns disabled backup as default',async()=>{
 reset();actor=therapist;const r=await call('drive/status',null,'GET');
 assert.equal(r.status,200);assert.equal(r.data.backupEnabled,false);
});

import { getDatabase } from '@netlify/database';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { nickname, randomToken, digest, encryptionKey, seal, open, canSeeRecord, escapeCSV, isSafeOrigin } from '../../lib/security.mjs';

const env=(name)=>typeof Netlify!=='undefined'?Netlify.env.get(name):process.env[name];
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const fail=(msg,status=400)=>json({error:msg},status);
const LIMIT=24000;
const clean=(s,max=2500)=>String(s??'').trim().slice(0,max);
const safeBody=async(req)=>{const type=req.headers.get('content-type')??'';if(!type.startsWith('application/json'))throw new Error('JSON 요청만 지원합니다.');if(Number(req.headers.get('content-length')||0)>LIMIT)throw new Error('기록이 너무 깁니다.');const raw=await req.text();if(raw.length>LIMIT)throw new Error('기록이 너무 깁니다.');const obj=JSON.parse(raw);if(!obj||Array.isArray(obj)||typeof obj!=='object')throw new Error('잘못된 요청입니다.');return obj;};
const dbConn=()=>getDatabase().pool;
const eq=(a,b)=>{const aa=Buffer.from(a||''),bb=Buffer.from(b||'');return aa.length===bb.length&&timingSafeEqual(aa,bb);};
const cookieName='__Host-ildan_sid';
const sessionCookie=(token,maxAge,req)=>`${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(req.url).hostname==='localhost'?'':'; Secure'}`;
const getToken=req=>{const cookies=req.headers.get('cookie')??'';const hit=cookies.match(/(?:^|;\s*)__Host-ildan_sid=([^;]+)/);return hit?.[1]??'';};
const publicUser=(u)=>({id:u.id,nickname:u.nickname,displayName:u.display_name,role:u.role,therapistId:u.therapist_id,studentId:u.student_id});
async function identity(db,req){const token=getToken(req);if(token.length<30)return null;const {rows}=await db.query('SELECT u.* FROM portal_sessions s JOIN portal_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW()',[digest(token)]);return rows[0]??null;}
async function newSession(db,user,req){const token=randomToken(32),age=['admin','therapist'].includes(user.role)?43200:604800;await db.query('INSERT INTO portal_sessions(token_hash,user_id,expires_at) VALUES ($1,$2,NOW()+($3::integer * interval \'1 second\'))',[digest(token),user.id,age]);return json({user:publicUser(user)},200,{'Set-Cookie':sessionCookie(token,age,req)});}
const ENTRY_KEYS=['date','event','thought','next','observation','message','note','category','mood','energy','body','action','response','impact','sketch','time','context','origin'];
function validateEntry(e){
 if(!e||Array.isArray(e)||typeof e!=='object')throw new Error('기록 내용을 확인해 주세요.');
 const obj={};for(const k of ENTRY_KEYS){if(e[k]===undefined||e[k]===null)continue;if(typeof e[k]!=='string')throw new Error('문자 기록만 입력할 수 있어요.');const max=k==='sketch'?5500:1200;const value=clean(e[k],max);if(value)obj[k]=value;}
 if(obj.date){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(obj.date)||Number.isNaN(Date.parse(obj.date+'T00:00:00Z'))||new Date(obj.date+'T00:00:00Z').toISOString().slice(0,10)!==obj.date)throw new Error('관찰 날짜를 확인해 주세요.');
 }
 if(obj.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(obj.time))throw new Error('관찰 시간을 확인해 주세요.');
 if(obj.origin&&!['직접 관찰','아이가 말함','가족에게 들음'].includes(obj.origin))throw new Error('정보 출처를 확인해 주세요.');
 if(!Object.values(obj).some(Boolean))throw new Error('기록을 한 가지 이상 입력해 주세요.');
 if(obj.sketch){let paths;try{paths=JSON.parse(obj.sketch)}catch{throw new Error('그림 내용이 올바르지 않습니다.')}if(!Array.isArray(paths)||paths.length>240)throw new Error('그림 내용이 너무 큽니다.');let points=0;for(const stroke of paths){if(!Array.isArray(stroke)||stroke.length>240)throw new Error('그림 내용이 올바르지 않습니다.');points+=stroke.length;for(const p of stroke){if(!Array.isArray(p)||p.length!==2||!p.every(Number.isInteger)||p[0]<0||p[0]>760||p[1]<0||p[1]>380)throw new Error('그림 내용이 올바르지 않습니다.')}}if(points>240)throw new Error('그림 내용이 너무 큽니다.');}
 if(JSON.stringify(obj).length>14000)throw new Error('기록이 너무 깁니다.');return obj;
}
function sharedSelection(entry,requested){
 if(!Array.isArray(requested)||requested.length<1||requested.length>ENTRY_KEYS.length||requested.some(k=>typeof k!=='string'||!ENTRY_KEYS.includes(k)))throw new Error('공유할 항목을 선택해 주세요.');
 const selected={};for(const k of new Set(requested)){if(entry[k])selected[k]=entry[k]}
 if(!Object.keys(selected).some(k=>!['date','time','origin'].includes(k)))throw new Error('공유할 관찰 내용이나 전달사항을 선택해 주세요.');
 if(entry.date)selected.date=entry.date;
 if(entry.time)selected.time=entry.time;
 return selected;
}
function unpackShared(record,key){if(!record.shared_nonce||!record.shared_auth_tag||!record.encrypted_shared_payload)throw new Error('공유 범위가 없는 기록입니다.');return JSON.parse(open({...record,nonce:record.shared_nonce,auth_tag:record.shared_auth_tag,encrypted_payload:record.encrypted_shared_payload},key));}

async function listRecords(db,u,key){let rows=[];
 if(u.role==='therapist'){
  const r=await db.query(`SELECT r.*, a.nickname AS writer, s.nickname AS student FROM portal_records r JOIN portal_users a ON a.id=r.author_id JOIN portal_users s ON s.id=r.student_id WHERE r.therapist_id=$1 AND s.therapist_id=$1 AND r.shared_at IS NOT NULL AND r.encrypted_shared_payload IS NOT NULL ORDER BY r.created_at DESC LIMIT 250`,[u.id]);rows=r.rows;
 } else if(u.role==='student'||u.role==='parent'){
  rows=(await db.query(`SELECT r.*, a.nickname AS writer, s.nickname AS student FROM portal_records r JOIN portal_users a ON a.id=r.author_id JOIN portal_users s ON s.id=r.student_id WHERE r.author_id=$1 ORDER BY r.created_at DESC LIMIT 250`,[u.id])).rows;
 } else return [];
 return rows.filter(r=>canSeeRecord(u,r,u.role==='therapist')).map(r=>{try{return {id:r.id,kind:r.kind,author:r.writer,student:r.student,shared:!!r.shared_at,createdAt:r.created_at,driveSynced:!!r.drive_file_id,entry:u.role==='therapist'?unpackShared(r,key):JSON.parse(open(r,key))};}catch(e){return {id:r.id,error:'복호화 실패',createdAt:r.created_at};}});
}

function challengeFromCredential(credential){
 const raw=credential?.response?.clientDataJSON;
 if(typeof raw!=='string'||raw.length>8000||!/^[a-zA-Z0-9_-]+$/.test(raw))throw new Error('잘못된 패스키 인증 자료입니다.');
 const decoded=JSON.parse(Buffer.from(raw,'base64url').toString('utf8'));
 if(typeof decoded.challenge!=='string'||decoded.challenge.length>512||!/^[a-zA-Z0-9_-]+$/.test(decoded.challenge))throw new Error('잘못된 패스키 인증 자료입니다.');
 return decoded.challenge;
}

function safeGoogleConfig(){return !!(env('GOOGLE_CLIENT_ID')&&env('GOOGLE_CLIENT_SECRET')&&env('APP_ORIGIN')?.startsWith('https://'));}
async function googleAccess(refresh){const body=new URLSearchParams({client_id:env('GOOGLE_CLIENT_ID'),client_secret:env('GOOGLE_CLIENT_SECRET'),refresh_token:refresh,grant_type:'refresh_token'});const resp=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body});const data=await resp.json();if(!resp.ok||!data.access_token)throw new Error('구글 계정 재인증이 필요합니다.');return data.access_token;}
async function folderFor(access){const resp=await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink',{method:'POST',headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json'},body:JSON.stringify({name:'일단써봄_담당기록',mimeType:'application/vnd.google-apps.folder',description:'학생/학부모가 담당 치료사에게 공유한 기록만 저장됩니다.'})});const data=await resp.json();if(!resp.ok||!data.id)throw new Error('구글 드라이브 폴더 생성 실패');return data.id;}
async function uploadDrive(access,folderId,record,entry){const meta={name:`ildan_${record.id}.json`,mimeType:'application/json',parents:[folderId]};const content=JSON.stringify({recordId:record.id,studentNickname:record.student,authorNickname:record.writer,kind:record.kind,createdAt:record.created_at,entry},null,2);const boundary=`ildan_${randomToken(12)}`;const body=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${content}\r\n--${boundary}--`;
 const resp=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{Authorization:`Bearer ${access}`,'Content-Type':`multipart/related; boundary=${boundary}`},body});const out=await resp.json();if(!resp.ok||!out.id)throw new Error('구글 드라이브 저장 실패');return out.id;
}
async function autoBackup(db,recordId,therapistId,key){
 try{
  if(!safeGoogleConfig())return false;
  const oauth=(await db.query('SELECT * FROM portal_oauth WHERE therapist_id=$1',[therapistId])).rows[0];if(!oauth)return false;
  const record=(await db.query(`SELECT r.*,a.nickname writer,s.nickname student FROM portal_records r JOIN portal_users a ON a.id=r.author_id JOIN portal_users s ON s.id=r.student_id WHERE r.id=$1 AND r.therapist_id=$2 AND s.therapist_id=$2 AND r.shared_at IS NOT NULL AND r.encrypted_shared_payload IS NOT NULL AND r.drive_file_id IS NULL`,[recordId,therapistId])).rows[0];if(!record)return false;
  const refresh=open({...oauth,encrypted_payload:oauth.encrypted_refresh_token},key),access=await googleAccess(refresh);
  const file=await uploadDrive(access,oauth.folder_id,record,unpackShared(record,key));
  await db.query('UPDATE portal_records SET drive_file_id=$1 WHERE id=$2 AND therapist_id=$3',[file,record.id,therapistId]);
  return true;
 }catch(error){console.error('Google Drive backup pending',error?.name||'error');return false;}
}
export default async function handler(req){const path=new URL(req.url).pathname.replace(/^\/api\/?/,'');if(!new URL(req.url).pathname.startsWith('/api/'))return fail('경로 오류',404);
if(!['GET','POST'].includes(req.method))return fail('허용되지 않은 방식',405);
if(req.method==='POST'&&!isSafeOrigin(req))return fail('요청 출처 확인 실패',403);
let db;try{db=dbConn();encryptionKey(env('RECORD_ENCRYPTION_KEY'));}catch(e){return fail('서버 초기 설정이 아직 완료되지 않았습니다.',503);}
const key=encryptionKey(env('RECORD_ENCRYPTION_KEY'));
try{
 if(path==='health'&&req.method==='GET')return json({ready:true,driveIntegrationConfigured:safeGoogleConfig()});
 if(path==='therapists'&&req.method==='GET'){const result=await db.query("SELECT id,display_name FROM portal_users WHERE role='therapist' ORDER BY display_name LIMIT 100");return json({therapists:result.rows});}

 // Common passkey authentication for every role. Passkeys never expose biometric data to this service.
 if(path.startsWith('passkeys/')&&req.method==='POST'){
  if(!env('APP_ORIGIN')||!/^https:\/\//.test(env('APP_ORIGIN')))return fail('패스키 서버 주소 설정이 필요합니다.',503);
  const origin=new URL(env('APP_ORIGIN')).origin;
  if(new URL(req.url).origin!==origin)return fail('패스키 인증 주소가 일치하지 않습니다.',403);
  const rpID=new URL(origin).hostname;
  const b=await safeBody(req);
  if(path==='passkeys/enroll/options'){
   const code=String(b.invite??'').trim(),reset=String(b.resetCode??'').trim(),setup=String(b.setupToken??'').trim();
   if([!!code,!!reset,!!setup].filter(Boolean).length!==1)return fail('초대코드, 재등록 코드 또는 관리자 설정코드가 필요합니다.',400);
   let userId=randomUUID(),role=null,nick='',inviteHash=null,resetHash=null,selected=null,kind='invite';
   if(reset){
    const row=(await db.query(`SELECT u.* FROM portal_password_resets r JOIN portal_users u ON u.id=r.user_id WHERE r.code_hash=$1 AND r.used_at IS NULL AND r.expires_at>NOW()`,[digest(reset)])).rows[0];
    if(!row)return fail('재등록 코드가 만료되었거나 사용되었습니다.',403);
    userId=row.id;role=row.role;nick=row.nickname;resetHash=digest(reset);kind='recovery';
   }else if(setup){
    if(!env('INITIAL_ADMIN_SETUP_TOKEN')||!eq(env('INITIAL_ADMIN_SETUP_TOKEN'),setup))return fail('관리자 설정코드가 일치하지 않습니다.',403);
    if((await db.query("SELECT 1 FROM portal_users WHERE role='admin' LIMIT 1")).rows.length)return fail('관리자가 이미 등록되어 있습니다.',403);
    nick=nickname(b.nickname);role='admin';kind='setup';
   }else{
    if(code.length<20)return fail('초대코드를 확인해 주세요.',403);
    const invite=(await db.query('SELECT * FROM portal_invites WHERE code_hash=$1 AND used_by IS NULL AND expires_at>NOW()',[digest(code)])).rows[0];
    if(!invite)return fail('초대코드가 만료되었거나 이미 사용되었습니다.',403);
    role=invite.role;nick=nickname(b.nickname);inviteHash=digest(code);
    if(b.selectedRole&&String(b.selectedRole)!==role)return fail('선택한 사용자 유형과 초대코드가 일치하지 않습니다.',403);
    if(role!=='therapist'){
     selected=String(b.selectedTherapistId??'');
     if(selected!==String(invite.therapist_id))return fail('선택한 담당 치료사와 초대코드가 일치하지 않습니다.',403);
    }
   }
   if(kind!=='recovery'&&(await db.query('SELECT 1 FROM portal_users WHERE nickname=$1',[nick])).rows.length)return fail('이미 사용 중인 닉네임입니다.',409);
   const options=await generateRegistrationOptions({rpName:'일단써봄',rpID,userID:new Uint8Array(Buffer.from(userId.replaceAll('-',''),'hex')),userName:nick,userDisplayName:nick,attestationType:'none',authenticatorSelection:{residentKey:'required',userVerification:'required'},timeout:120000});
   await db.query(`INSERT INTO portal_passkey_challenges(challenge_hash,kind,user_id,nickname,role,invite_hash,reset_hash,selected_therapist_id,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,NOW()+INTERVAL '5 minutes')`,[digest(options.challenge),kind,userId,nick,role,inviteHash,resetHash,selected]);
   return json({options});
  }
  if(path==='passkeys/enroll/verify'){
   const credential=b.credential;if(!credential||credential.type!=='public-key')return fail('패스키 응답이 없습니다.',400);
   const challenge=challengeFromCredential(credential);
   const client=await db.connect();try{
    await client.query('BEGIN');
    const r=(await client.query("SELECT * FROM portal_passkey_challenges WHERE challenge_hash=$1 AND kind IN ('invite','setup','recovery') AND expires_at>NOW() FOR UPDATE",[digest(challenge)])).rows[0];
    if(!r){await client.query('ROLLBACK');return fail('패스키 등록 시간이 만료되었습니다. 다시 시작해 주세요.',403);}
    const result=await verifyRegistrationResponse({response:credential,expectedChallenge:challenge,expectedOrigin:origin,expectedRPID:rpID,requireUserVerification:true});
    if(!result.verified||!result.registrationInfo){await client.query('ROLLBACK');return fail('기기 본인 확인이 완료되지 않았습니다.',403);}
    const info=result.registrationInfo,passkey=info.credential;
    let user=null;
    if(r.kind==='recovery'){
     const reset=(await client.query(`SELECT * FROM portal_password_resets WHERE code_hash=$1 AND user_id=$2 AND used_at IS NULL AND expires_at>NOW() FOR UPDATE`,[r.reset_hash,r.user_id])).rows[0];
     if(!reset){await client.query('ROLLBACK');return fail('재등록 코드가 이미 사용되었습니다.',403);}
     user=(await client.query('SELECT * FROM portal_users WHERE id=$1 FOR UPDATE',[r.user_id])).rows[0];
     if(!user){await client.query('ROLLBACK');return fail('해당 계정을 찾을 수 없습니다.',404);}
     await client.query('DELETE FROM portal_passkeys WHERE user_id=$1',[user.id]);
     await client.query('DELETE FROM portal_sessions WHERE user_id=$1',[user.id]);
     await client.query('UPDATE portal_password_resets SET used_at=NOW() WHERE code_hash=$1',[r.reset_hash]);
    }else if(r.kind==='setup'){
     await client.query('SELECT pg_advisory_xact_lock(77122026)');
     if((await client.query("SELECT 1 FROM portal_users WHERE role='admin' LIMIT 1")).rows.length){await client.query('ROLLBACK');return fail('관리자가 이미 등록되어 있습니다.',403);}
     user=(await client.query("INSERT INTO portal_users(id,nickname,display_name,role) VALUES($1,$2,$3,'admin') RETURNING *",[r.user_id,r.nickname,'관리자'])).rows[0];
    }else{
     const inv=(await client.query(`SELECT * FROM portal_invites WHERE code_hash=$1 AND used_by IS NULL AND expires_at>NOW() FOR UPDATE`,[r.invite_hash])).rows[0];
     if(!inv||inv.role!==r.role||(inv.role!=='therapist'&&String(inv.therapist_id)!==String(r.selected_therapist_id))){await client.query('ROLLBACK');return fail('초대코드가 유효하지 않습니다.',403);}
     user=(await client.query('INSERT INTO portal_users(id,nickname,display_name,role,therapist_id,student_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[r.user_id,r.nickname,r.nickname,inv.role,inv.role==='therapist'?null:inv.therapist_id,inv.role==='parent'?inv.student_id:null])).rows[0];
     await client.query('UPDATE portal_invites SET used_by=$1 WHERE code_hash=$2',[user.id,r.invite_hash]);
    }
    await client.query(`INSERT INTO portal_passkeys(credential_id,user_id,public_key,counter,transports) VALUES($1,$2,$3,$4,$5)`,[passkey.id,user.id,Buffer.from(passkey.publicKey).toString('base64'),passkey.counter,JSON.stringify(passkey.transports??[])]);
    await client.query('DELETE FROM portal_passkey_challenges WHERE challenge_hash=$1',[digest(challenge)]);
    await client.query('COMMIT');return await newSession(db,user,req);
   }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  }
  if(path==='passkeys/login/options'){
   const options=await generateAuthenticationOptions({rpID,userVerification:'required',allowCredentials:[],timeout:120000});
   await db.query("INSERT INTO portal_passkey_challenges(challenge_hash,kind,expires_at) VALUES($1,'login',NOW()+INTERVAL '5 minutes')",[digest(options.challenge)]);
   return json({options});
  }
  if(path==='passkeys/login/verify'){
   const credential=b.credential;if(!credential||credential.type!=='public-key'||typeof credential.id!=='string')return fail('패스키 확인 응답이 없습니다.');
   const challenge=challengeFromCredential(credential);
   const client=await db.connect();try{
    await client.query('BEGIN');
    const c=(await client.query("SELECT * FROM portal_passkey_challenges WHERE challenge_hash=$1 AND kind='login' AND expires_at>NOW() FOR UPDATE",[digest(challenge)])).rows[0];
    if(!c){await client.query('ROLLBACK');return fail('로그인 시간이 만료되었습니다.',403);}
    const pass=(await client.query('SELECT * FROM portal_passkeys WHERE credential_id=$1 FOR UPDATE',[credential.id])).rows[0];
    if(!pass){await client.query('ROLLBACK');return fail('등록되지 않은 패스키입니다.',403);}
    const res=await verifyAuthenticationResponse({response:credential,expectedChallenge:challenge,expectedOrigin:origin,expectedRPID:rpID,requireUserVerification:true,credential:{id:pass.credential_id,publicKey:new Uint8Array(Buffer.from(pass.public_key,'base64')),counter:Number(pass.counter),transports:JSON.parse(pass.transports??'[]')}});
    if(!res.verified){await client.query('ROLLBACK');return fail('본인 확인에 실패했습니다.',403);}
    const user=(await client.query('SELECT * FROM portal_users WHERE id=$1',[pass.user_id])).rows[0];if(!user){await client.query('ROLLBACK');return fail('계정을 찾지 못했습니다.',403);}
    await client.query('UPDATE portal_passkeys SET counter=$1,last_used_at=NOW() WHERE credential_id=$2',[res.authenticationInfo.newCounter,pass.credential_id]);
    await client.query('DELETE FROM portal_passkey_challenges WHERE challenge_hash=$1',[digest(challenge)]);
    await client.query('COMMIT');return await newSession(db,user,req);
   }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  }
  return fail('지원되지 않는 인증 기능입니다.',404);
 }
 const u=await identity(db,req);if(!u)return fail('로그인이 필요합니다.',401);
 if(path==='me'&&req.method==='GET')return json({user:publicUser(u)});
 if(path==='logout'&&req.method==='POST'){await db.query('DELETE FROM portal_sessions WHERE token_hash=$1',[digest(getToken(req))]);return json({ok:true},200,{'Set-Cookie':sessionCookie('',0,req)});}
 if(path==='invites'&&req.method==='POST'){
  if(!['admin','therapist'].includes(u.role))return fail('초대 권한이 없습니다.',403);const b=await safeBody(req);const role=String(b.role??'');let teacher=null,student=null;
  if(u.role==='admin'&&role!=='therapist')return fail('관리자는 치료사만 초대할 수 있습니다.',403);
  if(u.role==='therapist'&&!['student','parent'].includes(role))return fail('허용되지 않은 역할입니다.',403);
  if(u.role==='therapist'){teacher=u.id;if(role==='parent'){student=String(b.studentId??'');const t=await db.query("SELECT id FROM portal_users WHERE id=$1 AND role='student' AND therapist_id=$2",[student,u.id]);if(!t.rows.length)return fail('담당 학생이 아닙니다.',403);}}
  const code=randomToken(24);await db.query(`INSERT INTO portal_invites(code_hash,role,therapist_id,student_id,created_by,expires_at) VALUES ($1,$2,$3,$4,$5,NOW()+INTERVAL '7 days')`,[digest(code),role,teacher,student,u.id]);return json({invite:code,role,expiresInDays:7});
 }
 if(path==='reset/create'&&req.method==='POST'){
  if(!['admin','therapist'].includes(u.role))return fail('재설정 권한이 없습니다.',403);const b=await safeBody(req);const id=String(b.userId??'');let allowed=false;
  if(u.role==='admin'){allowed=!!(await db.query("SELECT 1 FROM portal_users WHERE id=$1 AND role='therapist'",[id])).rows.length;}
  else{allowed=!!(await db.query("SELECT 1 FROM portal_users WHERE id=$1 AND role IN ('student','parent') AND therapist_id=$2",[id,u.id])).rows.length;}
  if(!allowed)return fail('담당 계정이 아닙니다.',403);const code=randomToken(32);await db.query("INSERT INTO portal_password_resets(code_hash,user_id,issued_by,expires_at) VALUES ($1,$2,$3,NOW()+INTERVAL '30 minutes')",[digest(code),id,u.id]);return json({resetCode:code,expiresInMinutes:30});
 }
 if(path==='accounts'&&req.method==='GET'){
  if(u.role==='admin'){const x=await db.query("SELECT id,nickname,display_name,role FROM portal_users WHERE role='therapist' ORDER BY display_name");return json({accounts:x.rows});}
  if(u.role==='therapist'){const x=await db.query("SELECT id,nickname,display_name,role FROM portal_users WHERE role IN ('student','parent') AND therapist_id=$1 ORDER BY role,display_name",[u.id]);return json({accounts:x.rows});}
  return fail('권한이 없습니다.',403);
 }
 if(path==='students'&&req.method==='GET'){
  if(u.role!=='therapist')return fail('치료사만 확인할 수 있습니다.',403);const {rows}=await db.query("SELECT id,nickname,display_name FROM portal_users WHERE role='student' AND therapist_id=$1 ORDER BY created_at DESC LIMIT 200",[u.id]);return json({students:rows});
 }
 if(path==='records'&&req.method==='POST'){
  if(!['student','parent'].includes(u.role))return fail('학생·학부모만 기록할 수 있습니다.',403);
  const b=await safeBody(req),entry=validateEntry(b.entry),shared=b.share===true;
  if(u.role==='parent'&&(!entry.date||!['observation','response','impact','message'].some(k=>entry[k])))return fail('관찰 날짜와 한 가지 이상의 내용을 확인해 주세요.');
  const student=u.role==='student'?u.id:u.student_id,teacher=u.therapist_id;
  if(!student||!teacher)return fail('담당 학생·치료사 연결이 없습니다.',403);
  if((await db.query("SELECT 1 FROM portal_users WHERE id=$1 AND therapist_id=$2 AND role='student'",[student,teacher])).rows.length===0)return fail('담당 연결이 올바르지 않습니다.',403);
  const privatePayload=seal(JSON.stringify(entry),key),selected=shared?sharedSelection(entry,b.sharedFields):null,publicPayload=selected?seal(JSON.stringify(selected),key):null;
  const res=await db.query(`INSERT INTO portal_records(author_id,therapist_id,student_id,kind,nonce,auth_tag,encrypted_payload,shared_nonce,shared_auth_tag,encrypted_shared_payload,shared_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CASE WHEN $11::boolean THEN NOW() ELSE NULL END) RETURNING id,created_at,shared_at`,[u.id,teacher,student,u.role,privatePayload.nonce,privatePayload.auth_tag,privatePayload.encrypted_payload,publicPayload?.nonce??null,publicPayload?.auth_tag??null,publicPayload?.encrypted_payload??null,shared]);
  const driveSynced=shared?await autoBackup(db,res.rows[0].id,teacher,key):false;
  return json({record:{id:res.rows[0].id,shared:!!res.rows[0].shared_at,createdAt:res.rows[0].created_at,driveSynced}},201);
 }
 if(path==='records'&&req.method==='GET')return json({records:await listRecords(db,u,key)});
 if(path==='share'&&req.method==='POST'){
  if(!['student','parent'].includes(u.role))return fail('작성자만 공유할 수 있습니다.',403);
  const b=await safeBody(req);const c=await db.connect();let out;
  try{await c.query('BEGIN');const rs=await c.query('SELECT * FROM portal_records WHERE id=$1 AND author_id=$2 FOR UPDATE',[String(b.recordId??''),u.id]);const rec=rs.rows[0];
   if(!rec){await c.query('ROLLBACK');return fail('내 기록이 아닙니다.',403)}
   if(rec.shared_at){await c.query('ROLLBACK');return fail('이미 공유된 기록입니다. 추가 공유는 새 기록으로 작성해 주세요.',409)}
   const payload=sharedSelection(JSON.parse(open(rec,key)),b.sharedFields);const sealed=seal(JSON.stringify(payload),key);
   await c.query('UPDATE portal_records SET shared_nonce=$1,shared_auth_tag=$2,encrypted_shared_payload=$3,shared_at=NOW() WHERE id=$4 AND author_id=$5',[sealed.nonce,sealed.auth_tag,sealed.encrypted_payload,rec.id,u.id]);await c.query('COMMIT');out={id:rec.id,therapistId:rec.therapist_id};
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
  const driveSynced=await autoBackup(db,out.id,out.therapistId,key);return json({ok:true,shared:true,driveSynced});
 }
 if(path==='session-notes'&&req.method==='GET'){
  if(u.role!=='therapist')return fail('치료사 전용 메모입니다.',403);
  const rs=await db.query(`SELECT n.*,s.nickname AS student_nickname FROM portal_session_notes n JOIN portal_users s ON s.id=n.student_id WHERE n.therapist_id=$1 AND s.therapist_id=$1 ORDER BY n.created_at DESC LIMIT 150`,[u.id]);
  return json({notes:rs.rows.map(n=>({id:n.id,studentNickname:n.student_nickname,createdAt:n.created_at,entry:JSON.parse(open(n,key))}))});
 }
 if(path==='session-notes'&&req.method==='POST'){
  if(u.role!=='therapist')return fail('치료사 전용 메모입니다.',403);
  const b=await safeBody(req);const studentId=String(b.studentId??'');
  if(!(await db.query("SELECT 1 FROM portal_users WHERE id=$1 AND role='student' AND therapist_id=$2",[studentId,u.id])).rows.length)return fail('담당 학생만 선택할 수 있습니다.',403);
  if(!b.entry||typeof b.entry!=='object'||Array.isArray(b.entry))return fail('메모를 확인해 주세요.');
  const entry={};for(const k of ['observation','question','plan']){if(b.entry[k]!==undefined){if(typeof b.entry[k]!=='string')return fail('올바르지 않은 메모 내용입니다.');entry[k]=clean(b.entry[k],1200)}}
  if(!Object.values(entry).some(Boolean))return fail('메모를 하나 이상 작성해 주세요.');
  const sealed=seal(JSON.stringify(entry),key);await db.query('INSERT INTO portal_session_notes(student_id,therapist_id,nonce,auth_tag,encrypted_payload) VALUES($1,$2,$3,$4,$5)',[studentId,u.id,sealed.nonce,sealed.auth_tag,sealed.encrypted_payload]);return json({ok:true},201);
 }
 if(path==='drive/status'&&req.method==='GET'){
  if(u.role!=='therapist')return fail('치료사만 연결할 수 있습니다.',403);const r=await db.query('SELECT folder_id FROM portal_oauth WHERE therapist_id=$1',[u.id]);return json({connected:!!r.rows.length,configured:safeGoogleConfig(),folderUrl:r.rows[0]?`https://drive.google.com/drive/folders/${encodeURIComponent(r.rows[0].folder_id)}`:null});
 }
 if(path==='drive/start'&&req.method==='GET'){
  if(u.role!=='therapist')return fail('치료사 전용입니다.',403);if(!safeGoogleConfig())return fail('관리자 구글 OAuth 설정이 아직 없습니다.',503);const state=randomToken(32);await db.query("INSERT INTO portal_oauth_states(state_hash,therapist_id,expires_at) VALUES ($1,$2,NOW()+INTERVAL '10 minutes')",[digest(state),u.id]);const params=new URLSearchParams({client_id:env('GOOGLE_CLIENT_ID'),redirect_uri:env('APP_ORIGIN')+'/api/drive/callback',response_type:'code',scope:'https://www.googleapis.com/auth/drive.file',access_type:'offline',prompt:'consent',state});return Response.redirect('https://accounts.google.com/o/oauth2/v2/auth?'+params,302);
 }
 if(path==='drive/callback'&&req.method==='GET'){
  if(u.role!=='therapist')return fail('치료사 전용입니다.',403);const qs=new URL(req.url).searchParams;const state=qs.get('state')||'';const code=qs.get('code')||'';if(!state||!code)return fail('구글 인증에 실패했습니다.',400);const c=await db.connect();try{await c.query('BEGIN');const r=await c.query('DELETE FROM portal_oauth_states WHERE state_hash=$1 AND therapist_id=$2 AND expires_at>NOW() RETURNING therapist_id',[digest(state),u.id]);await c.query('COMMIT');if(!r.rows.length)return fail('구글 인증 상태가 만료되었습니다.',403);}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  const resp=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:env('GOOGLE_CLIENT_ID'),client_secret:env('GOOGLE_CLIENT_SECRET'),redirect_uri:env('APP_ORIGIN')+'/api/drive/callback',grant_type:'authorization_code'})});const tok=await resp.json();if(!resp.ok||!tok.refresh_token||!tok.access_token)return fail('구글 재인증이 필요합니다.',400);const folder=await folderFor(tok.access_token);const s=seal(tok.refresh_token,key);await db.query(`INSERT INTO portal_oauth(therapist_id,encrypted_refresh_token,nonce,auth_tag,folder_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(therapist_id) DO UPDATE SET encrypted_refresh_token=EXCLUDED.encrypted_refresh_token,nonce=EXCLUDED.nonce,auth_tag=EXCLUDED.auth_tag,folder_id=EXCLUDED.folder_id`,[u.id,s.encrypted_payload,s.nonce,s.auth_tag,folder]);return Response.redirect(env('APP_ORIGIN')+'/?drive=connected',302);
 }
 if(path==='drive/sync'&&req.method==='POST'){
  if(u.role!=='therapist')return fail('치료사 전용입니다.',403);const o=await db.query('SELECT * FROM portal_oauth WHERE therapist_id=$1',[u.id]);if(!o.rows.length)return fail('담당 치료사의 구글 계정을 먼저 연결해야 합니다.',409);const token=open({...o.rows[0],encrypted_payload:o.rows[0].encrypted_refresh_token},key),access=await googleAccess(token);
  const q=await db.query(`SELECT r.*,a.nickname writer,s.nickname student FROM portal_records r JOIN portal_users a ON a.id=r.author_id JOIN portal_users s ON s.id=r.student_id WHERE r.therapist_id=$1 AND s.therapist_id=$1 AND r.shared_at IS NOT NULL AND r.encrypted_shared_payload IS NOT NULL AND r.drive_file_id IS NULL ORDER BY r.created_at LIMIT 20`,[u.id]);let synced=0;
  for(const r of q.rows){const entry=unpackShared(r,key);const fileid=await uploadDrive(access,o.rows[0].folder_id,r,entry);await db.query('UPDATE portal_records SET drive_file_id=$1 WHERE id=$2 AND therapist_id=$3',[fileid,r.id,u.id]);synced++;}return json({synced,remainingMayExist:q.rows.length===20});
 }
 return fail('없는 기능입니다.',404);
}catch(e){console.error('Portal API failure',e.code||e.name||'unknown');if(e.code==='23505')return fail('이미 등록된 값입니다.',409);if(e.name==='SyntaxError')return fail('잘못된 입력입니다.');if(e.message?.startsWith('닉네임')||e.message?.startsWith('기록')||e.message?.startsWith('잘못된'))return fail(e.message);return fail('작업을 처리하지 못했습니다. 관리자에게 문의해 주세요.',500);}
}
export const config={path:'/api/*'};
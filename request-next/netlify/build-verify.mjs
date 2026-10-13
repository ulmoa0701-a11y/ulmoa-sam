/*
 * Habom isolated staging deployment gate.
 * Runs automatically in Netlify Builds using real Netlify Database and
 * deploy-scoped Blobs (builds cannot safely write to site-wide stores).
 * NEVER uploads user content. Every synthetic record is deleted in finally.
 */
import {writeFile} from 'node:fs/promises';
import {getDatabase} from '@netlify/database';
import {getDeployStore} from '@netlify/blobs';
import {createHash,randomUUID,randomBytes} from 'node:crypto';
import worker from '../src/worker.js';
import {createNetlifyEnv} from './adapter.mjs';

const EXPECTED_SITE='f9c910bc-97fe-482e-8b84-dc2ba8584907';
const EXPECTED_BRANCH='feature/habom-unified-secure-20261012';
let diagnosticStage='startup';
const noSecrets=(e)=>e instanceof Error?e.name:'UnknownError';
const assert=(test,description)=>{if(!test)throw Error('check failed: '+description);};
async function check(){
 if(process.env.NETLIFY!=='true')throw Error('Only run this gate in Netlify Builds');
 if(process.env.SITE_ID!==EXPECTED_SITE)throw Error('Refusing build check outside the isolated Habom Netlify project');
 if(!['production','deploy-preview','branch-deploy'].includes(process.env.CONTEXT)||process.env.BRANCH!==EXPECTED_BRANCH){
  throw Error('Unexpected branch or Netlify context: build gate refuses to skip on this dedicated project');
 }
 diagnosticStage='database-client';
 const database=getDatabase();
 diagnosticStage='deploy-blob-client';
 const blobs=getDeployStore({name:'habom-build-check-files',consistency:'strong'});
 // Production must use its real locked-down configuration; preview builds use
 // generated, never-persisted dummy keys so no real admin secret is copied to PRs.
 const preview=process.env.CONTEXT!=='production';
 const adminKey=preview?randomBytes(32).toString('hex'):(process.env.HABOM_ADMIN_KEY||'');
 const rateSalt=preview?randomBytes(32).toString('hex'):(process.env.HABOM_RATE_SALT||'');
 diagnosticStage='adaptor';
 const env=createNetlifyEnv({database,files:blobs,adminKey,rateSalt});
 const ip='build-check-'+randomUUID();
 const rateHash=createHash('sha256').update(rateSalt+':'+ip).digest('hex');
 let id=null,receipt=null,attachedKey=null,successful=false;
 const request=async(path,options={})=>{
  const req=new Request('https://habom-build-check.invalid'+path,{
   ...options,
   headers:{'cf-connecting-ip':ip,...(options.headers||{})}
  });
  return worker.fetch(req,env);
 };
 try{
  diagnosticStage='database-health';
  let res=await request('/api/health');
  assert(res.status===200,'real DB health');
  let d=await res.json();assert(d.ok&&d.database==='ready','real DB response');
  console.log('HABOM BUILD GATE: real PostgreSQL query passed');

  const marker='HABOM_BUILD_'+randomUUID().replace(/-/g,'');
  const form=new FormData();
  for(const [k,v] of Object.entries({
   visibility:'hidden',category:'질문',title:'자동점검 쪽지',
   body:marker,nickname:'자동검증',anonymous:'false',role:'',
   consent:'true',website:''
  }))form.set(k,v);
  form.set('attachment',new File(['%PDF-1.4\n'],'test.pdf',{type:'application/pdf'}));
  diagnosticStage='post-and-blob-write';
  res=await request('/api/posts',{method:'POST',body:form});
  assert(res.status===201,'insert private test message and deploy-scoped PDF');
  d=await res.json();
  id=d.id;receipt=d.receipt;
  assert(/^[a-f0-9-]{36}$/.test(id)&&/^[a-f0-9]{64}$/.test(receipt),'valid author receipt');
  console.log('HABOM BUILD GATE: private post + PDF stored in real Netlify services');

  diagnosticStage='private-feed';
  res=await request('/api/posts');
  assert(res.status===200,'public feed');
  const feed=await res.text();
  assert(!feed.includes(id)&&!feed.includes(marker)&&!feed.includes(receipt),'private post not exposed publicly');
  assert((await request('/api/mine/'+id)).status===403,'reject missing receipt');
  assert((await request('/api/mine/'+id,{headers:{'X-Receipt-Token':'0'.repeat(64)}})).status===403,'reject wrong receipt');
  res=await request('/api/mine/'+id,{headers:{'X-Receipt-Token':receipt}});
  assert(res.status===200,'accept correct receipt');
  d=await res.json();assert(d.post.body===marker,'private text round trip');

  assert((await request('/api/mine/'+id+'/file')).status===403,'reject unauthorized file read');
  assert((await request('/api/public/'+id+'/file')).status===404,'hide private file on public route');
  diagnosticStage='private-blob-read';
  res=await request('/api/mine/'+id+'/file',{headers:{'X-Receipt-Token':receipt}});
  assert(res.status===200,'read authorized private file');
  assert((await res.text())==='%PDF-1.4\n','private PDF bytes round trip');

  // Remember the synthetic blob key solely for verification after removal.
  diagnosticStage='postgres-blob-key';
  const rows=await database.sql.unsafe('SELECT attachment_key FROM posts WHERE id=$1',[id]);
  attachedKey=rows[0]?.attachment_key||null;
  assert(attachedKey?.startsWith('private/'+id+'/'),'test attachment key isolation');
  console.log('HABOM BUILD GATE: public/private access controls and PDF bytes passed');

  const denied=await request('/api/admin/posts');
  assert(denied.status===403,'unauthorized admin denied');
  diagnosticStage='admin-reply';
  res=await request('/api/admin/posts/'+id,{
   method:'POST',
   headers:{Authorization:'Bearer '+adminKey,'Content-Type':'application/json'},
   body:JSON.stringify({
    status:'답변 완료',reply:'자동점검 답장',publicTitle:'비밀글입니다',
    metadataApproved:false,attachmentApproved:false
   })
  });
  assert(res.status===200,'admin reply stored');
  res=await request('/api/mine/'+id,{headers:{'X-Receipt-Token':receipt}});
  d=await res.json();
  assert(d.post.reply==='자동점검 답장','author can see reply');
  assert(!(await (await request('/api/posts')).text()).includes(marker),'private reply remains hidden');
  console.log('HABOM BUILD GATE: admin-authenticated reply and author read passed');
  successful=true;
 }finally{
  let cleanupFailure=null;
  if(id){
   diagnosticStage='cleanup';
   try{
    if(receipt){
     const removed=await request('/api/mine/'+id,{method:'DELETE',headers:{'X-Receipt-Token':receipt}});
     assert(removed.status===200,'author deletion accepted');
    }else{
     // A 201 without receipt should not occur; clean synthetic row anyway.
     if(attachedKey)await blobs.delete(attachedKey);
     await database.sql.unsafe('DELETE FROM posts WHERE id=$1',[id]);
    }
    const verify=await database.sql.unsafe('SELECT COUNT(*)::int AS n FROM posts WHERE id=$1',[id]);
    assert(verify[0]?.n===0,'synthetic database record removed');
    if(attachedKey)assert(await blobs.get(attachedKey,{type:'blob',consistency:'strong'})===null,'synthetic PDF removed');
   }catch(e){cleanupFailure=e;}
  }
  try{await database.sql.unsafe('DELETE FROM rate_limits WHERE key=$1',[rateHash]);}
  catch(e){cleanupFailure=cleanupFailure||e;}
  if(cleanupFailure)throw Error('cleanup failed ('+noSecrets(cleanupFailure)+')');
  if(successful){diagnosticStage='passed';console.log('HABOM BUILD GATE: ALL PASS; synthetic post/PDF/rate-key deleted');}
 }
 if(!successful)throw Error('Diagnostics incomplete');
}
try{
 await check();
 // Visible only behind the existing Netlify SSO protection. Contains no secrets.
 await writeFile('site/build-gate-proof.json',JSON.stringify({
  status:'passed',database:'real Netlify PostgreSQL',
  attachments:'deploy-scoped Netlify Blobs',
  checks:['hidden post','receipt security','private PDF bytes','admin reply','full cleanup'],
  version:1,context:process.env.CONTEXT||'unknown',site:EXPECTED_SITE
 },null,2));
 console.log('HABOM BUILD GATE: non-sensitive deployment proof emitted');
 await writeFile('site/habom-diagnostic-passed.html','<!doctype html><title>Staging build verification passed</title><p>Staging build verification passed and synthetic records were removed.</p>');
}
catch(e){
 // Temporary preview-only diagnosis: emit safe stage name as an HTML filename
 // that the Netlify deploy summary can list. Never expose exception messages.
 const stage=diagnosticStage.replace(/[^a-z0-9-]/g,'').slice(0,45)||'unexpected';
 console.error('HABOM BUILD GATE: diagnostic stage '+stage);
 if(process.env.CONTEXT==='deploy-preview'){
  await writeFile('site/habom-diagnostic-failed-'+stage+'.html','<!doctype html><title>Staging verification not passed</title><p>Verification failed; this deploy is not approved for use.</p>');
  console.log('HABOM BUILD GATE: generated non-sensitive diagnostic page for preview only');
 }else{
  process.exitCode=1;
 }
}

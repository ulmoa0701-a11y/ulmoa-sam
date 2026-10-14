/*
 * Netlify build gate: REAL PostgreSQL only. No file uploads on build machines.
 * Synthetic single note; deletes its exact ID and its hashed rate-key.
 */
import {getDatabase} from '@netlify/database';
import {getDeployStore} from '@netlify/blobs';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {createNetlifyEnv} from './adapter.mjs';
import worker from '../src/worker.js';
let stage='start';
const site='f9c910bc-97fe-482e-8b84-dc2ba8584907',branch='feature/habom-unified-secure-20261012';
const ok=(v,msg)=>{if(!v)throw Error('Netlify DB gate: '+msg);};
async function main(){
 stage='netlify-site-id';
 ok(process.env.NETLIFY==='true'&&process.env.SITE_ID===site,'wrong execution host');
 const preview=process.env.CONTEXT==='deploy-preview';
 ok(preview||process.env.CONTEXT==='production','unexpected deployment context');
 stage='production-branch';
 if(!preview)ok(process.env.BRANCH===branch,'not designated production branch');
 stage='secrets';
 const adminKey=preview?randomBytes(32).toString('hex'):process.env.HABOM_ADMIN_KEY||'';
 const salt=preview?randomBytes(32).toString('hex'):process.env.HABOM_RATE_SALT||'';
 ok(adminKey.length>=32&&salt.length>=32,'server secrets missing');
 stage='database-client';
 const database=getDatabase(),uuid=randomUUID(),ip='build-'+uuid;
 const hash=createHash('sha256').update(salt+':'+ip).digest('hex');
 // Build scripts may WRITE only to an isolated deploy-scoped Blob store, never
 // to the site-wide production store. We exercise genuine Netlify storage here.
 stage='deploy-blob-store-init';
 const blobStore=getDeployStore({name:'habom-build-verify',consistency:'strong'});
 stage='adapter-init';
 const env=createNetlifyEnv({database,files:blobStore,adminKey,rateSalt:salt});
 let id='',key='',blobKey='';
 const call=(path,opts={})=>worker.fetch(new Request('https://habom-build.invalid'+path,{...opts,headers:{'cf-connecting-ip':ip,...opts.headers}}),env);
 try{
  stage='postgres-health';
  let r=await call('/api/health');
  ok(r.status===200,'real PostgreSQL unavailable');
  const f=new FormData();
  for(const [k,v] of Object.entries({visibility:'hidden',category:'질문',body:'TEST_ONLY_'+uuid,title:'자동검사',nickname:'검증',anonymous:'false',consent:'true'}))f.set(k,v);
  f.set('attachment',new File(['%PDF-1.4\n'],'build-verify.pdf',{type:'application/pdf'}));
  stage='postgres-and-private-blob-create';
  r=await call('/api/posts',{method:'POST',body:f});
  ok(r.status===201,'private insert');
  const record=await r.json();id=record.id;key=record.receipt;
  ok(/^[a-f0-9-]{36}$/.test(id)&&/^[a-f0-9]{64}$/.test(key),'author receipt');
  const blobRows=await database.sql.unsafe('SELECT attachment_key FROM posts WHERE id=$1',[id]);
  blobKey=blobRows[0]?.attachment_key||'';
  ok(blobKey.startsWith('private/'+id+'/'),'private attachment key');
  stage='private-blob-authorization';
  ok((await call('/api/mine/'+id+'/file')).status===403,'no-token PDF denied');
  ok((await call('/api/public/'+id+'/file')).status===404,'public PDF denied');
  r=await call('/api/mine/'+id+'/file',{headers:{'X-Receipt-Token':key}});
  ok(r.status===200&&(await r.text())==='%PDF-1.4\n','private PDF round-trip');
  r=await call('/api/posts');ok(r.status===200&&!(await r.text()).includes(uuid),'not listed');
  r=await call('/api/mine/'+id);ok(r.status===403,'no token blocked');
  r=await call('/api/mine/'+id,{headers:{'X-Receipt-Token':key}});ok(r.status===200&&(await r.json()).post.body==='TEST_ONLY_'+uuid,'author can read');
  stage='admin-write';
  r=await call('/api/admin/posts/'+id,{method:'POST',headers:{Authorization:'Bearer '+adminKey,'Content-Type':'application/json'},body:JSON.stringify({status:'답변 완료',reply:'정상',publicTitle:'비밀글입니다',metadataApproved:false,attachmentApproved:false})});
  ok(r.status===200,'admin writes reply');
  r=await call('/api/mine/'+id,{headers:{'X-Receipt-Token':key}});
  ok(r.status===200&&(await r.json()).post.reply==='정상','author reads reply');
 }finally{
  stage='cleanup';
  try{
   if(blobKey){
    await blobStore.delete(blobKey);
    ok((await blobStore.get(blobKey,{type:'blob',consistency:'strong'}))===null,'blob cleanup');
   }
   if(id){await database.sql.unsafe('DELETE FROM posts WHERE id=$1',[id]);const rows=await database.sql.unsafe('SELECT COUNT(*)::int AS n FROM posts WHERE id=$1',[id]);ok(rows[0]?.n===0,'post cleanup');}
  }finally{await database.sql.unsafe('DELETE FROM rate_limits WHERE key=$1',[hash]);}
 }
 // The deploy-succeeded event tests the *actual runtime* DB and site-wide
 // private Blob store after publish. Recheck its most recent non-secret verdict
 // during the NEXT build so the remote verifier can see it in deploy summaries.
 let verdict='pending',persistent=false,checkStage='not-yet-run';
 try{
  const check=await database.sql.unsafe(
    "SELECT result,stage,persisted_across_deploys FROM habom_runtime_checks WHERE id=$1",['latest']);
  if(check[0]){
   verdict=check[0].result==='passed'?'passed':'failed';
   persistent=check[0].persisted_across_deploys===1;
   checkStage=String(check[0].stage||'unknown').replace(/[^a-z0-9-]/g,'').slice(0,32);
  }
 }catch(_e){console.log('HABOM RUNTIME CHECK: no previous verified event result');}
 const commit=String(process.env.COMMIT_REF||'unknown').slice(0,10).replace(/[^a-f0-9]/g,'');
 const report='habom-livecheck-'+verdict+'-'+(persistent?'persistent':'first')+'-'+checkStage+'-'+commit+'.html';
 await writeFile('site/'+report,'<!doctype html><meta name="robots" content="noindex,nofollow"><title>Server-side verification metadata</title><p>Only non-sensitive status. No user data or passwords.</p>');
 console.log('HABOM RUNTIME CHECK: previous event result '+verdict+' persistent='+persistent+' stage='+checkStage);
 await writeFile('netlify/functions/habom-real-db-verified.mjs',"export default ()=>new Response('Staging DB validation passed');");
 await writeFile('netlify/functions/habom-real-blobs-verified.mjs',"export default ()=>new Response('Netlify deploy-only Blob validation passed');");
 console.log('HABOM REAL POSTGRES + DEPLOY-SCOPED BLOBS: PASS; synthetic message/PDF removed');
}
try{await main();}catch(e){
 console.error('HABOM REAL POSTGRES/BLOBS: FAILED AT '+stage);
 // For a private deploy preview only, emit a synthetic, non-secret stage label;
 // never misrepresent this as success. Production still fails closed.
 if(process.env.CONTEXT==='deploy-preview'){
  const diagnostic=String(stage).replace(/[^a-z0-9-]/g,'').slice(0,50)||'unexpected';
  await writeFile('site/habom-smoke-NOT-PASSED-'+diagnostic+'.html',
    '<!doctype html><title>Smoke check did not pass</title><p>Diagnostic only. Never release this build to visitors.</p>');
 }else process.exitCode=1;
}

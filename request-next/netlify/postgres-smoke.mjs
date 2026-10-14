/*
 * Netlify build gate: REAL PostgreSQL only. No file uploads on build machines.
 * Synthetic single note; deletes its exact ID and its hashed rate-key.
 */
import {getDatabase} from '@netlify/database';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {createNetlifyEnv} from './adapter.mjs';
import worker from '../src/worker.js';
const site='f9c910bc-97fe-482e-8b84-dc2ba8584907',branch='feature/habom-unified-secure-20261012';
const ok=(v,msg)=>{if(!v)throw Error('Netlify DB gate: '+msg);};
async function main(){
 ok(process.env.NETLIFY==='true'&&process.env.SITE_ID===site,'wrong execution host');
 const preview=process.env.CONTEXT==='deploy-preview';
 ok(preview||process.env.CONTEXT==='production','unexpected deployment context');
 if(!preview)ok(process.env.BRANCH===branch,'not designated production branch');
 const adminKey=preview?randomBytes(32).toString('hex'):process.env.HABOM_ADMIN_KEY||'';
 const salt=preview?randomBytes(32).toString('hex'):process.env.HABOM_RATE_SALT||'';
 ok(adminKey.length>=32&&salt.length>=32,'server secrets missing');
 const database=getDatabase(),uuid=randomUUID(),ip='build-'+uuid;
 const hash=createHash('sha256').update(salt+':'+ip).digest('hex');
 const env=createNetlifyEnv({database,files:{async set(){throw Error('No file upload in build gate')},async get(){return null},async delete(){}},adminKey,rateSalt:salt});
 let id='',key='';
 const call=(path,opts={})=>worker.fetch(new Request('https://habom-build.invalid'+path,{...opts,headers:{'cf-connecting-ip':ip,...opts.headers}}),env);
 try{
  let r=await call('/api/health');
  ok(r.status===200,'real PostgreSQL unavailable');
  const f=new FormData();
  for(const [k,v] of Object.entries({visibility:'hidden',category:'질문',body:'TEST_ONLY_'+uuid,title:'자동검사',nickname:'검증',anonymous:'false',consent:'true'}))f.set(k,v);
  r=await call('/api/posts',{method:'POST',body:f});
  ok(r.status===201,'private insert');
  const record=await r.json();id=record.id;key=record.receipt;
  ok(/^[a-f0-9-]{36}$/.test(id)&&/^[a-f0-9]{64}$/.test(key),'author receipt');
  r=await call('/api/posts');ok(r.status===200&&!(await r.text()).includes(uuid),'not listed');
  r=await call('/api/mine/'+id);ok(r.status===403,'no token blocked');
  r=await call('/api/mine/'+id,{headers:{'X-Receipt-Token':key}});ok(r.status===200&&(await r.json()).post.body==='TEST_ONLY_'+uuid,'author can read');
  r=await call('/api/admin/posts/'+id,{method:'POST',headers:{Authorization:'Bearer '+adminKey,'Content-Type':'application/json'},body:JSON.stringify({status:'답변 완료',reply:'정상',publicTitle:'비밀글입니다',metadataApproved:false,attachmentApproved:false})});
  ok(r.status===200,'admin writes reply');
  r=await call('/api/mine/'+id,{headers:{'X-Receipt-Token':key}});
  ok(r.status===200&&(await r.json()).post.reply==='정상','author reads reply');
 }finally{
  try{
   if(id){await database.sql.unsafe('DELETE FROM posts WHERE id=$1',[id]);const rows=await database.sql.unsafe('SELECT COUNT(*)::int AS n FROM posts WHERE id=$1',[id]);ok(rows[0]?.n===0,'post cleanup');}
  }finally{await database.sql.unsafe('DELETE FROM rate_limits WHERE key=$1',[hash]);}
 }
 await writeFile('netlify/functions/habom-real-db-verified.mjs',"export default ()=>new Response('Staging DB validation passed');");
 console.log('HABOM REAL POSTGRES: PASS; test message removed');
}
try{await main();}catch(e){console.error('HABOM REAL POSTGRES: FAIL '+(e?.message||'').slice(0,120));process.exitCode=1;}

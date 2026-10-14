/* PostgreSQL integration: actual SQL syntax, parameter binding and privacy path.
 * CI uses ephemeral postgres service only. Never accesses user databases.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import worker from '../src/worker.js';
import {createNetlifyEnv} from '../netlify/adapter.mjs';

test('temporary PostgreSQL schema works through Netlify adapter for public/private and author rights',async()=>{
 const client=new pg.Client({host:process.env.PGHOST||'127.0.0.1',port:Number(process.env.PGPORT||5432),user:process.env.PGUSER||'habom',password:process.env.PGPASSWORD||'only-test-not-a-real-secret',database:process.env.PGDATABASE||'habomtest'});
 await client.connect();
 try{
   const migration=resolve(dirname(fileURLToPath(import.meta.url)),'../netlify/database/migrations/20261012160000_create_habom_posts.sql');
   await client.query(await readFile(migration,'utf8'));
   await client.query(await readFile(resolve(dirname(fileURLToPath(import.meta.url)),'../netlify/database/migrations/20261014113000_runtime_checks.sql'),'utf8'));
   const database={sql:{unsafe:async(sql,params)=>{const res=await client.query(sql,params);return res.rows;}}};
   const blobs=new Map();
   const files={
     async set(key,val){blobs.set(key,val);},
     async get(key){return blobs.get(key)||null;},
     async delete(key){blobs.delete(key);}
   };
   const env=createNetlifyEnv({database,files,adminKey:'postgres-ci-admin-secret-is-isolated-42chars',rateSalt:'postgres-ci-rate-salt-only-for-tests-40chars'});
   async function call(path,method='GET',payload=null,headers={}){
     const init={method,headers};
     if(payload)init.body=payload;
     const r=await worker.fetch(new Request('https://ci.local'+path,init),env);
     const t=await r.text();
     return {status:r.status,data:JSON.parse(t)};
   }
   function form(mode,text){
     const f=new FormData();
     for(const [k,v] of Object.entries({visibility:mode,category:'질문',title:'통합 쪽지',body:text,nickname:'가상 이용자',anonymous:'false',role:'보호자',consent:mode==='public'?'false':'true'}))f.set(k,v);
     return f;
   }
   const publicPost=await call('/api/posts','POST',form('public','공개 테스트 내용'));
   assert.equal(publicPost.status,201);
   const privatePost=await call('/api/posts','POST',form('hidden','CI 비공개 테스트 내용'));
   assert.equal(privatePost.status,201);
   const listing=await call('/api/posts');
   assert.equal(listing.data.posts.length,0,'public note must await admin approval');
   assert.equal(listing.data.locked.length,0);
   const approve=await call('/api/admin/posts/'+publicPost.data.id,'POST',
    JSON.stringify({status:'확인 중',reply:'',publicTitle:'',metadataApproved:true,attachmentApproved:false}),
    {Authorization:'Bearer postgres-ci-admin-secret-is-isolated-42chars','Content-Type':'application/json'});
   assert.equal(approve.status,200);
   const released=await call('/api/posts');
   assert.equal(released.data.posts.length,1);
   assert.equal(released.data.posts[0].body,'공개 테스트 내용');
   assert.doesNotMatch(JSON.stringify(listing.data),/CI 비공개 테스트 내용/);
   assert.equal((await call('/api/mine/'+privatePost.data.id)).status,403);
   const mine=await call('/api/mine/'+privatePost.data.id,'GET',null,{'X-Receipt-Token':privatePost.data.receipt});
   assert.equal(mine.status,200);
   assert.equal(mine.data.post.body,'CI 비공개 테스트 내용');
   const deleted=await call('/api/mine/'+privatePost.data.id,'DELETE',null,{'X-Receipt-Token':privatePost.data.receipt});
   assert.equal(deleted.status,200);
   const rows=await client.query('SELECT id FROM posts');
   assert.equal(rows.rows.length,1);
   console.log('PASS POSTGRES: migration applied, public/private safely separated and secret deleted');
 }finally{
   await client.end();
 }
});

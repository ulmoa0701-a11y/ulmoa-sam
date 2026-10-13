import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {createNetlifyEnv} from '../netlify/adapter.mjs';

function fixture(){
 const posts=[]; const files=new Map();const sqlCalls=[];
 const database={sql:{unsafe:async(query,args)=>{
  sqlCalls.push({query,args});
  if(query.startsWith('SELECT COUNT(*)'))return [{n:0}];
  if(query.startsWith('INSERT INTO posts')){
   const names=query.match(/INSERT INTO posts \(([^)]+)\)/)[1].split(',').map(x=>x.trim());
   posts.push(Object.assign(Object.fromEntries(names.map((n,i)=>[n,args[i]])),{
     metadata_approved:0,attachment_approved:0,reply:'',replied_at:null,status:'접수',public_title:'비밀글입니다'
   }));return [];
  }
  if(query.startsWith('INSERT INTO rate_limits'))return [];
  if(query.startsWith("SELECT id,category,title,body,link,display_name,role,created_at,reply,replied_at,attachment_key,attachment_approved FROM posts")){
   return posts.filter(p=>p.visibility==='public');
  }
  if(query.startsWith("SELECT id,category,public_title,display_name,created_at,status,attachment_key,reply FROM posts")){
   return posts.filter(p=>p.visibility==='list'&&p.metadata_approved===1);
  }
  if(query.startsWith('SELECT attachment_key,attachment_name,attachment_approved,visibility FROM posts WHERE id=')){
   const row=posts.find(p=>p.id===args[0]);return row?[row]:[];
  }
  if(query.startsWith('SELECT * FROM posts WHERE id=')){
   const row=posts.find(p=>p.id===args[0]);return row?[row]:[];
  }
  if(query.startsWith('SELECT * FROM posts ORDER BY'))return posts;
  if(query.startsWith('UPDATE posts SET')){
   const p=posts.find(x=>x.id===args[6]);assert.ok(p);
   [p.status,p.reply,p.replied_at,p.metadata_approved,p.public_title,p.attachment_approved]=args.slice(0,6);return [];
  }
  throw Error('unhandled SQL: '+query);
 }}};
 const blobs={
   async set(key,blob){files.set(key,blob);},
   async get(key){return files.get(key)||null;},
   async delete(key){files.delete(key);}
 };
 return {db:database,blobs,posts,sqlCalls};
}
const key='admin-testing-secret-key-40-characters-long';
const salt='rate-testing-secret-key-40-characters-long';
function form(mode,over={}){
 const f=new FormData();
 Object.entries({visibility:mode,category:'질문',title:'',body:mode==='public'?'공개 메모':'PRIVATE MESSAGE CONTENT',nickname:'가상 작성자',anonymous:'false',role:'보호자',link:'',consent:mode==='public'?'false':'true',...over}).forEach(([k,v])=>f.set(k,String(v)));
 return f;
}
async function request(env,path,method='GET',body,headers={}){
 const res=await worker.fetch(new Request('https://example.test'+path,{method,body,headers}),env);
 return {status:res.status,text:await res.text()};
}
test('Netlify adapter handles one DB for public and private but returns no secret',async()=>{
 const x=fixture();
 const env=createNetlifyEnv({database:x.db,files:x.blobs,adminKey:key,rateSalt:salt});
 let a=await request(env,'/api/posts','POST',form('public'));assert.equal(a.status,201);
 let b=await request(env,'/api/posts','POST',form('hidden',{email:'hidden@example.test',consent:'true'}));assert.equal(b.status,201);
 const receipt=JSON.parse(b.text);
 const feed=await request(env,'/api/posts');
 assert.equal(feed.status,200);
 assert.ok(feed.text.includes('공개 메모'));
 assert.ok(!feed.text.includes('PRIVATE MESSAGE CONTENT'));
 assert.ok(!feed.text.includes('hidden@example.test'));
 assert.ok(!feed.text.includes(receipt.receipt));
 assert.equal((await request(env,'/api/mine/'+receipt.id)).status,403);
 const mine=await request(env,'/api/mine/'+receipt.id,'GET',null,{'X-Receipt-Token':receipt.receipt});
 assert.equal(mine.status,200);
 assert.ok(mine.text.includes('hidden@example.test'));
 assert.ok(x.sqlCalls.some(c=>c.query.includes('WHERE id=$1')&&c.args[0]===receipt.id));
});

test('Netlify adapter stores file privately and gates file download',async()=>{
 const x=fixture(),env=createNetlifyEnv({database:x.db,files:x.blobs,adminKey:key,rateSalt:salt});
 const data=form('list');
 data.set('attachment',new File([new Uint8Array([37,80,68,70,45,49,46,55,10])],'private.pdf',{type:'application/pdf'}));
 const created=await request(env,'/api/posts','POST',data);
 assert.equal(created.status,201);
 const rec=JSON.parse(created.text);
 assert.equal((await request(env,'/api/mine/'+rec.id+'/file')).status,403);
 assert.equal((await request(env,'/api/public/'+rec.id+'/file')).status,404);
 assert.equal((await request(env,'/api/mine/'+rec.id+'/file','GET',null,{'X-Receipt-Token':rec.receipt})).status,200);
});

test('Netlify adapter fails closed if the database, blob store or secrets are absent',()=>{
 const fixtureData=fixture();
 assert.throws(()=>createNetlifyEnv({database:fixtureData.db,files:fixtureData.blobs,adminKey:'short',rateSalt:salt}),/Required secrets/);
 assert.throws(()=>createNetlifyEnv({database:null,files:fixtureData.blobs,adminKey:key,rateSalt:salt}),/database unavailable/);
 assert.throws(()=>createNetlifyEnv({database:fixtureData.db,files:null,adminKey:key,rateSalt:salt}),/blob store unavailable/);
});

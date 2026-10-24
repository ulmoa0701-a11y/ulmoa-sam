import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

class MockDB {
 constructor(){this.posts=[];this.rate=[];}
 prepare(sql){
   const db=this;
   const query={args:[],bind(...args){this.args=args;return this;},
    async first(){
      const a=this.args;
      if(sql.includes('FROM habom_runtime_checks'))return null;
      if(sql.includes('COUNT(*)'))return {n:db.rate.filter(x=>x.key===a[0]&&x.created_at>a[1]).length};
      if(sql.includes('FROM posts WHERE id='))return db.posts.find(x=>x.id===a[0])||null;
      throw Error('unexpected first: '+sql);
    },
    async all(){
      if(sql.includes("visibility='public'"))return {results:db.posts.filter(x=>x.visibility==='public'&&x.metadata_approved===1).reverse()};
      if(sql.includes("visibility='list'"))return {results:db.posts.filter(x=>x.visibility==='list'&&x.metadata_approved===1).reverse()};
      if(sql.includes('FROM posts ORDER BY'))return {results:[...db.posts].reverse()};
      throw Error('unexpected all: '+sql);
    },
    async run(){
      const a=this.args;
      if(sql.startsWith('INSERT INTO posts')){
        const names=sql.match(/INSERT INTO posts \(([^)]+)\)/)[1].split(',').map(x=>x.trim());
        const post=Object.fromEntries(names.map((n,i)=>[n,a[i]]));
        Object.assign(post,{reply:'',replied_at:null,status:'접수',metadata_approved:0,attachment_approved:0,public_title:'비밀글입니다'});
        db.posts.push(post);return {success:true};
      }
      if(sql.startsWith('INSERT INTO rate_limits')){db.rate.push({key:a[0],created_at:a[1]});return {success:true};}
      if(sql.startsWith('DELETE FROM posts')){db.posts=db.posts.filter(p=>p.id!==a[0]);return {success:true};}
      if(sql.startsWith('UPDATE posts')){
        const row=db.posts.find(x=>x.id===a[6]);assert.ok(row);
        [row.status,row.reply,row.replied_at,row.metadata_approved,row.public_title,row.attachment_approved]=a.slice(0,6);return {success:true};
      }
      throw Error('unexpected run: '+sql);
    }
   };
   return query;
 }
}
class MockR2{
 constructor(){this.map=new Map();}
 async put(key,stream){this.map.set(key,await new Response(stream).arrayBuffer());}
 async get(key){const data=this.map.get(key);return data?{body:new Blob([data]).stream()}:null;}
 async delete(key){this.map.delete(key);}
}
function makeEnv(){return {DB:new MockDB(),FILES:new MockR2(),ASSETS:{fetch:()=>new Response('staging')},ADMIN_KEY:'admin-test-key-that-is-at-least-32-characters-long',RATE_SALT:'rate-limit-test-salt-at-least-32-chars'};}
const base='https://example.test';
const privateText='비공개 문의 원문 TEST ONLY';
async function call(env,path,method='GET',body=null,headers={}){
 const options={method,headers};
 if(body instanceof FormData)options.body=body;
 else if(body!==null){options.body=JSON.stringify(body);options.headers={'Content-Type':'application/json',...headers};}
 return worker.fetch(new Request(base+path,options),env);
}
function form(mode='public',overrides={}){
 const data=new FormData();
 const fields={visibility:mode,category:'질문',title:'문의 제목',body:mode==='public'?'안녕하세요':privateText,nickname:'시험 작성자',anonymous:'false',role:'보호자',link:'',website:'',consent:mode==='public'?'false':'true',...overrides};
 Object.entries(fields).forEach(([k,v])=>data.append(k,String(v)));
 return data;
}
async function create(env,data){const res=await call(env,'/api/posts','POST',data);return {status:res.status,data:await res.json()};}
function adminHeaders(){return {Authorization:'Bearer admin-test-key-that-is-at-least-32-characters-long'};}

test('public and secret posts remain server-separated, no secret data in feed',async()=>{
 const env=makeEnv();
 const a=await create(env,form('public'));assert.equal(a.status,201);
 const b=await create(env,form('list',{email:'private@example.test',consent:'true'}));assert.equal(b.status,201);
 const c=await create(env,form('hidden',{email:'hidden@example.test',consent:'true'}));assert.equal(c.status,201);
 const feed=await call(env,'/api/posts');assert.equal(feed.status,200);
 const raw=await feed.text();const obj=JSON.parse(raw);
 assert.equal(obj.posts.length,0);assert.equal(obj.locked.length,0);
 assert.ok(!raw.includes('안녕하세요'),'unapproved public post must not appear');
 const approve=await call(env,'/api/admin/posts/'+a.data.id,'POST',{status:'확인 중',reply:'',publicTitle:'',metadataApproved:true,attachmentApproved:false},adminHeaders());
 assert.equal(approve.status,200);
 const approvedFeed=await call(env,'/api/posts'),after=await approvedFeed.json();
 assert.equal(after.posts.length,1);
 assert.equal(after.posts[0].body,'안녕하세요');
 for(const secret of [privateText,'private@example.test','hidden@example.test',b.data.receipt,c.data.receipt])assert.ok(!raw.includes(secret),'feed leaked '+secret);
 assert.equal(after.posts[0].body,'안녕하세요');
 const unauthorized=await call(env,'/api/mine/'+b.data.id);assert.equal(unauthorized.status,403);
 const wrong=await call(env,'/api/mine/'+b.data.id,'GET',null,{'X-Receipt-Token':c.data.receipt});assert.equal(wrong.status,403);
 const authorized=await call(env,'/api/mine/'+b.data.id,'GET',null,{'X-Receipt-Token':b.data.receipt});
 assert.equal(authorized.status,200);assert.equal((await authorized.json()).post.email,'private@example.test');
});

test('admin review only publishes manually approved masked locked metadata',async()=>{
 const env=makeEnv();const b=await create(env,form('list',{title:'아동 실명 포함 원문',email:'private@example.test',consent:'true'}));
 const fail=await call(env,'/api/admin/posts');assert.equal(fail.status,403);
 const success=await call(env,'/api/admin/posts','GET',null,adminHeaders());assert.equal(success.status,200);
 const res=await call(env,'/api/admin/posts/'+b.data.id,'POST',{status:'답변 완료',reply:'접수 완료입니다',publicTitle:'잠금글입니다',metadataApproved:true,attachmentApproved:false},adminHeaders());
 assert.equal(res.status,200);
 const feed=await call(env,'/api/posts');const raw=await feed.text(),obj=JSON.parse(raw);
 assert.equal(obj.locked.length,1);assert.equal(obj.locked[0].title,'잠금글입니다');
 assert.equal(obj.locked[0].maskedName,'시**');
 assert.equal(obj.locked[0].hasReply,true);
 assert.ok(!raw.includes('아동 실명 포함 원문'));assert.ok(!raw.includes(privateText));assert.ok(!raw.includes('private@example.test'));
 const mine=await call(env,'/api/mine/'+b.data.id,'GET',null,{'X-Receipt-Token':b.data.receipt});
 assert.equal((await mine.json()).post.reply,'접수 완료입니다');
});

test('private attachment remains inaccessible without token; public attachment needs approval',async()=>{
 const env=makeEnv();const data=form('public');
 data.append('attachment',new File([new Uint8Array([37,80,68,70,45,49,46,55,10])],'test.pdf',{type:'application/pdf'}));
 const a=await create(env,data);assert.equal(a.status,201);
 assert.equal((await call(env,'/api/public/'+a.data.id+'/file')).status,404);
 const wrong=await call(env,'/api/mine/'+a.data.id+'/file');assert.equal(wrong.status,403);
 const right=await call(env,'/api/mine/'+a.data.id+'/file','GET',null,{'X-Receipt-Token':a.data.receipt});
 assert.equal(right.status,200);assert.equal(right.headers.get('Content-Type'),'application/octet-stream');
 await call(env,'/api/admin/posts/'+a.data.id,'POST',{status:'접수',reply:'',publicTitle:'',metadataApproved:false,attachmentApproved:true},adminHeaders());
 assert.equal((await call(env,'/api/public/'+a.data.id+'/file')).status,404,'file must remain hidden until public message approved');
 await call(env,'/api/admin/posts/'+a.data.id,'POST',{status:'확인 중',reply:'',publicTitle:'',metadataApproved:true,attachmentApproved:true},adminHeaders());
 const nowPublic=await call(env,'/api/public/'+a.data.id+'/file');assert.equal(nowPublic.status,200);
});

test('invalid private consent, personal details in public, and script disguises are rejected',async()=>{
 const env=makeEnv();
 assert.equal((await create(env,form('list',{email:'ask@example.test',consent:'false'}))).status,400);
 assert.equal((await create(env,form('public',{body:'연락처 010-1234-5678'}))).status,400);
 const disguised=form('list');disguised.append('attachment',new File(['<svg><script>alert(1)</script></svg>'],'fake.pdf',{type:'application/pdf'}));
 assert.equal((await create(env,disguised)).status,415);
});


test('all private content requires affirmative consent and rejects cross-site writes',async()=>{
 const env=makeEnv();
 assert.equal((await create(env,form('hidden',{consent:'false'}))).status,400);
 assert.equal((await create(env,form('list',{consent:'false'}))).status,400);
 const originBlock=await call(env,'/api/posts','POST',form('public'),{'Origin':'https://attacker.example.test'});
 assert.equal(originBlock.status,403);
 const fetchSiteBlock=await call(env,'/api/posts','POST',form('public'),{'Sec-Fetch-Site':'cross-site'});
 assert.equal(fetchSiteBlock.status,403);
 const allowed=await call(env,'/api/posts','POST',form('public'),{'Origin':'https://example.test'});
 assert.equal(allowed.status,201);
});


test('only receipt holder can delete a v2 post and its file',async()=>{
 const env=makeEnv(),data=form('hidden');
 data.set('attachment',new File([new Uint8Array([37,80,68,70,45,49])],'note.pdf',{type:'application/pdf'}));
 const post=await create(env,data);assert.equal(post.status,201);
 const id=post.data.id,token=post.data.receipt;
 assert.equal(env.DB.posts.length,1);assert.equal(env.FILES.map.size,1);
 assert.equal((await call(env,'/api/mine/'+id,'DELETE')).status,403);
 assert.equal((await call(env,'/api/mine/'+id,'DELETE',null,{'X-Receipt-Token':'f'.repeat(64)})).status,403);
 assert.equal(env.DB.posts.length,1);
 assert.equal((await call(env,'/api/mine/'+id,'DELETE',null,{'X-Receipt-Token':token})).status,200);
 assert.equal(env.DB.posts.length,0);assert.equal(env.FILES.map.size,0);
 assert.equal((await call(env,'/api/mine/'+id,'GET',null,{'X-Receipt-Token':token})).status,403);
});

test('read-only health checks database without exposing posts or secrets',async()=>{
 const env=makeEnv();
 const created=await create(env,form('hidden',{body:'SENSITIVE-HEALTH-TEST-NOT-PUBLIC'}));
 assert.equal(created.status,201);
 const health=await call(env,'/api/health');
 assert.equal(health.status,200);
 const data=await health.json();
 assert.deepEqual(data,{ok:true,service:'habom',database:'ready',liveCheck:{status:'pending'}});
 const raw=JSON.stringify(data);
 assert.ok(!raw.includes('SENSITIVE-HEALTH-TEST-NOT-PUBLIC'));
 assert.ok(!raw.includes(created.data.receipt));
});

test('moderator-only permanent deletion removes sensitive post and PDF',async()=>{
 const env=makeEnv(),file=new File([new Uint8Array([37,80,68,70,45,49])],'sample.pdf',{type:'application/pdf'});
 const data=form('hidden');data.set('attachment',file);
 const created=await create(env,data);assert.equal(created.status,201);
 assert.equal(env.FILES.map.size,1);
 assert.equal((await call(env,'/api/admin/posts/'+created.data.id,'DELETE')).status,403);
 assert.equal(env.FILES.map.size,1);
 assert.equal((await call(env,'/api/admin/posts/'+created.data.id,'DELETE',null,adminHeaders())).status,200);
 assert.equal(env.DB.posts.length,0);assert.equal(env.FILES.map.size,0);
 assert.equal((await call(env,'/api/mine/'+created.data.id,'GET',null,{'X-Receipt-Token':created.data.receipt})).status,403);
});

/* End-to-end HTTP integration: real browser -> HTTP request -> real API core ->
 * isolated, in-memory database and file store. No deployed or personal data.
 */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import worker from '../src/worker.js';

class DB {
 constructor(){this.posts=[];this.rate=[];}
 prepare(sql){
  const db=this;
  return {
   args:[],
   bind(...a){this.args=a;return this;},
   async first(){
    const a=this.args;
    if(sql.startsWith('SELECT COUNT(*)'))return {n:db.rate.filter(x=>x.key===a[0]&&x.created_at>a[1]).length};
    if(sql.includes('FROM posts WHERE id='))return db.posts.find(x=>x.id===a[0])||null;
    throw Error('Unexpected SELECT first: '+sql);
   },
   async all(){
    if(sql.includes("visibility='public'"))return {results:db.posts.filter(x=>x.visibility==='public')};
    if(sql.includes("visibility='list'"))return {results:db.posts.filter(x=>x.visibility==='list'&&x.metadata_approved===1)};
    if(sql.includes('FROM posts ORDER BY'))return {results:db.posts};
    throw Error('Unexpected SELECT all: '+sql);
   },
   async run(){
    const a=this.args;
    if(sql.startsWith('INSERT INTO posts')){
     const fields=sql.match(/INSERT INTO posts \(([^)]+)\)/)[1].split(',').map(x=>x.trim());
     const post=Object.fromEntries(fields.map((name,i)=>[name,a[i]]));
     Object.assign(post,{metadata_approved:0,attachment_approved:0,reply:'',replied_at:null,status:'접수',public_title:'비밀글입니다'});
     db.posts.push(post);return {success:true};
    }
    if(sql.startsWith('INSERT INTO rate_limits')){db.rate.push({key:a[0],created_at:a[1]});return {success:true};}
    if(sql.startsWith('UPDATE posts SET')){
     const p=db.posts.find(x=>x.id===a[6]);
     if(!p)throw Error('No matching id for update');
     [p.status,p.reply,p.replied_at,p.metadata_approved,p.public_title,p.attachment_approved]=a.slice(0,6);
     return {success:true};
    }
    if(sql.startsWith('DELETE FROM posts')){db.posts=db.posts.filter(x=>x.id!==a[0]);return {success:true};}
    throw Error('Unexpected SQL run: '+sql);
   }
  };
 }
}
class Files {
 constructor(){this.map=new Map();}
 async put(key,body){this.map.set(key,await new Response(body).arrayBuffer());}
 async get(key){const b=this.map.get(key);return b?{body:new Blob([b]).stream()}:null;}
 async delete(key){this.map.delete(key);}
}
const db=new DB(),files=new Files();
const key='separate-test-admin-key-for-this-run-with-40-characters';
const env={DB:db,FILES:files,ADMIN_KEY:key,RATE_SALT:'isolated-test-rate-salt-greater-than-32-characters',ASSETS:{fetch:()=>new Response('Not found',{status:404})}};
const staticDir=join(dirname(fileURLToPath(import.meta.url)),'../site');
const siteAssets={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/styles.css':'styles.css'};
const server=createServer(async(req,res)=>{
 try{
  const incoming=new URL(req.url,'http://127.0.0.1:'+server.address().port);
  if(incoming.pathname.startsWith('/api/')){
   const headers=new Headers(req.headers);
   headers.delete('cf-connecting-ip');
   headers.set('cf-connecting-ip',req.socket.remoteAddress||'local-test');
   const body=['GET','HEAD'].includes(req.method)?undefined:req;
   const fetchReq=new Request(incoming.href,{method:req.method,headers,body,...(body?{duplex:'half'}:{})});
   const response=await worker.fetch(fetchReq,env);
   res.writeHead(response.status,Object.fromEntries(response.headers));
   return res.end(Buffer.from(await response.arrayBuffer()));
  }
  const filename=siteAssets[incoming.pathname];
  if(!filename){res.writeHead(404);return res.end();}
  const bytes=await readFile(join(staticDir,filename));
  res.writeHead(200,{'Content-Type':filename.endsWith('.css')?'text/css':filename.endsWith('.js')?'text/javascript':'text/html; charset=utf-8'});
  res.end(bytes);
 }catch(e){console.error('HTTP test-server error:',e.message);res.writeHead(500);res.end('error');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:390,height:844},locale:'ko-KR'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.locator('#nickname').fill('가상 보호자');
 await page.locator('#body').fill('실제 HTTP로 등록한 공개 쪽지');
 await page.locator('#sendButton').click();
 await page.locator('#receiptCode').waitFor({state:'visible'});
 await page.waitForFunction(()=>document.querySelector('#publicFeed').textContent.includes('실제 HTTP로 등록한 공개 쪽지'));
 const publicReceipt=await page.locator('#receiptCode').inputValue();
 assert.match(publicReceipt,/^[a-f0-9-]{36}\.[a-f0-9]{64}$/);
 assert.equal(db.posts.length,1);
 console.log('PASS HTTP: public post goes through real form, server, database and feed');

 await page.locator('input[value="hidden"]').check();
 await page.locator('#nickname').fill('가상 비밀 이용자');
 await page.locator('#body').fill('PRIVATE_TEST_ONLY_NEVER_PUBLIC');
 await page.locator('#consent').check();
 await page.locator('#attachment').setInputFiles({name:'private.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7\n')});
 await page.locator('#sendButton').click();
 await page.waitForFunction(previous=>document.querySelector('#receiptCode').value!==previous,publicReceipt);
 const secretReceipt=await page.locator('#receiptCode').inputValue();
 const [privateId,privateToken]=secretReceipt.split('.');
 assert.equal(db.posts.length,2);assert.equal(files.map.size,1);
 const feedText=await (await fetch(base+'/api/posts')).text();
 assert.doesNotMatch(feedText,/PRIVATE_TEST_ONLY_NEVER_PUBLIC|가상 비밀 이용자|private.pdf/);
 const wrong=await fetch(base+'/api/mine/'+privateId,{headers:{'X-Receipt-Token':'a'.repeat(64)}});
 assert.equal(wrong.status,403);
 const mine=await fetch(base+'/api/mine/'+privateId,{headers:{'X-Receipt-Token':privateToken}});
 assert.equal(mine.status,200);
 assert.equal((await mine.json()).post.body,'PRIVATE_TEST_ONLY_NEVER_PUBLIC');
 assert.equal((await fetch(base+'/api/mine/'+privateId+'/file')).status,403);
 const file=await fetch(base+'/api/mine/'+privateId+'/file',{headers:{'X-Receipt-Token':privateToken}});
 assert.equal(file.status,200);assert.equal(file.headers.get('Content-Type'),'application/octet-stream');
 console.log('PASS HTTP: full private post + PDF, no public leak, invalid code denied, right code allowed');

 const admin=await fetch(base+'/api/admin/posts',{headers:{Authorization:'Bearer '+key}});
 assert.equal(admin.status,200);assert.equal((await admin.json()).posts.length,2);
 assert.equal((await fetch(base+'/api/admin/posts')).status,403);
 const saved=await fetch(base+'/api/admin/posts/'+privateId,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({status:'답변 완료',reply:'검토했어요',publicTitle:'비밀 문의',metadataApproved:true,attachmentApproved:false})});
 assert.equal(saved.status,200);
 const afterReply=await fetch(base+'/api/mine/'+privateId,{headers:{'X-Receipt-Token':privateToken}});
 assert.equal((await afterReply.json()).post.reply,'검토했어요');
 const afterFeed=await (await fetch(base+'/api/posts')).text();
 assert.doesNotMatch(afterFeed,/PRIVATE_TEST_ONLY_NEVER_PUBLIC|비밀 문의/);
 console.log('PASS HTTP: authenticated owner reply, hidden mode never listed');

 await page.locator('#postId').fill(privateId);
 await page.locator('#postToken').fill(privateToken);
 await page.locator('#mineForm button[type="submit"]').click();
 await page.locator('.delete-own').waitFor({state:'visible'});
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('.delete-own').click();
 await page.waitForFunction(()=>document.querySelector('#mineStatus').textContent.includes('삭제했어요'));
 assert.equal(db.posts.length,1);assert.equal(files.map.size,0);
 assert.equal((await fetch(base+'/api/mine/'+privateId,{headers:{'X-Receipt-Token':privateToken}})).status,403);
 assert.deepEqual(errors,[],'browser has runtime errors');
 console.log('PASS HTTP: author deletion irreversibly removes private post and attachment');

 await page.locator('input[value="list"]').check();
 await page.locator('#nickname').fill('가상 작성자');
 await page.locator('#body').fill('LOCKED_PRIVATE_BODY_ONLY');
 await page.locator('#consent').check();
 await page.locator('#sendButton').click();
 await page.waitForFunction(previous=>document.querySelector('#receiptCode').value!==previous,secretReceipt);
 const lockedReceipt=await page.locator('#receiptCode').inputValue();
 const lockedId=lockedReceipt.split('.')[0];
 const beforeApproval=await (await fetch(base+'/api/posts')).text();
 assert.ok(!beforeApproval.includes('LOCKED_PRIVATE_BODY_ONLY'));
 assert.ok(!beforeApproval.includes(lockedId));
 const approved=await fetch(base+'/api/admin/posts/'+lockedId,{
  method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
  body:JSON.stringify({status:'확인 중',reply:'',publicTitle:'공개 허용된 잠금 쪽지',metadataApproved:true,attachmentApproved:false})
 });
 assert.equal(approved.status,200);
 const afterApproval=await (await fetch(base+'/api/posts')).text();
 assert.ok(afterApproval.includes('공개 허용된 잠금 쪽지'));
 assert.ok(!afterApproval.includes('LOCKED_PRIVATE_BODY_ONLY'));
 assert.ok(!afterApproval.includes('가상 작성자'));
 await page.locator('#refresh').click();
 await page.waitForFunction(()=>document.querySelector('#lockedFeed').textContent.includes('공개 허용된 잠금 쪽지'));
 console.log('PASS HTTP: locked metadata only after admin approval; never leaks private body');

 await page.screenshot({path:'habom-real-http-390.png',fullPage:true});
 console.log('PASS HTTP INTEGRATION: browser/server/read/write/permissions/reply/delete');
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}

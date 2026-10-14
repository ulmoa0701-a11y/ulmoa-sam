/* One-shot non-personal production smoke test for the explicitly authorized public launch.
 * Checks the ACTUAL Netlify function, PostgreSQL and site-wide private Blob store.
 * Creates only a synthetic hidden post, then deletes it in a finally block.
 * Never prints access receipts, tokens or private body content.
 */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

const base='https://habom-unified-private-staging.netlify.app';
const unique='HABOM_RELEASE_TEST_'+randomUUID();
let id='',token='',cleanupFailure='',checks=0;
const check=(v,label)=>{assert.ok(v,label);checks++;};
const req=async(path,options={})=>fetch(base+path,{cache:'no-store',redirect:'manual',...options});

try{
 const health=await req('/api/health');
 check(health.status===200,'real Netlify database health must return 200; received '+health.status);
 const data=await health.json();
 check(data.ok===true&&data.database==='ready','database is not ready');
 console.log('PASS LIVE: Netlify function and database');

 const form=new FormData();
 for(const [k,v] of Object.entries({
  visibility:'hidden',category:'질문',title:'자동 점검',body:unique,
  nickname:'자동검증',anonymous:'false',role:'',consent:'true',website:''
 }))form.set(k,v);
 form.set('attachment',new File(['%PDF-1.4\n'],'synthetic.pdf',{type:'application/pdf'}));
 const created=await req('/api/posts',{method:'POST',body:form});
 check(created.status===201,'real Netlify private post/PDF insert; status '+created.status);
 const json=await created.json();
 id=json.id;token=json.receipt;
 check(/^[a-f0-9-]{36}$/.test(id)&&/^[a-f0-9]{64}$/.test(token),'valid receipt response');
 console.log('PASS LIVE: synthetic hidden post and PDF stored');

 const publicList=await req('/api/posts');
 check(publicList.status===200,'public feed');
 const raw=await publicList.text();
 check(!raw.includes(unique)&&!raw.includes(id)&&!raw.includes(token),'hidden content or token in public feed');
 check((await req('/api/mine/'+id)).status===403,'author-only access enforced');
 check((await req('/api/mine/'+id,{headers:{'X-Receipt-Token':'0'.repeat(64)}})).status===403,'wrong receipt denied');
 const mine=await req('/api/mine/'+id,{headers:{'X-Receipt-Token':token}});
 check(mine.status===200,'valid receipt allowed');
 const own=await mine.json();
 check(own.post.body===unique,'private body roundtrip');
 check((await req('/api/mine/'+id+'/file')).status===403,'private file denied without token');
 check((await req('/api/public/'+id+'/file')).status===404,'private file denied on public route');
 const privateFile=await req('/api/mine/'+id+'/file',{headers:{'X-Receipt-Token':token}});
 check(privateFile.status===200,'private PDF retrieval');
 check((await privateFile.text())==='%PDF-1.4\n','PDF content roundtrip');
 console.log('PASS LIVE: no private data leak, receipt permission, real persistent PDF bytes');

}finally{
 if(id&&token){
  try{
   const deleted=await req('/api/mine/'+id,{method:'DELETE',headers:{'X-Receipt-Token':token}});
   if(deleted.status!==200)throw Error('delete status '+deleted.status);
   check((await req('/api/mine/'+id,{headers:{'X-Receipt-Token':token}})).status===403,'delete persisted');
   console.log('PASS LIVE: synthetic post and attachment deleted');
  }catch(e){cleanupFailure=e instanceof Error?e.message:'unknown cleanup error';}
 }
 if(cleanupFailure){console.error('CRITICAL: cleanup error '+cleanupFailure);process.exitCode=1;}
}
console.log('LIVE NETLIFY REAL-BACKEND TEST PASS: '+checks+' checks');

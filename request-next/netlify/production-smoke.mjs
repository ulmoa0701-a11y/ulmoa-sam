/*
 * Real Netlify BUILD smoke test for the private Habom staging project.
 * Production Netlify database + deploy-ISOLATED Blobs. Synthetic only.
 * All created posts, files and rate keys are deleted in finally.
 * Never runs on public sites or other teams.
 */
import {getDatabase} from '@netlify/database';
import {getDeployStore} from '@netlify/blobs';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import worker from '../src/worker.js';
import {createNetlifyEnv} from './adapter.mjs';

const SITE='f9c910bc-97fe-482e-8b84-dc2ba8584907';
const TARGET_BRANCH='feature/habom-unified-secure-20261012';
let failedStage='startup';
const assert=(ok,what)=>{if(!ok)throw Error('Verification failed: '+what)};
const getJSON=async(response)=>response.json();
async function run(){
  failedStage='environment-netlify';
  if(process.env.NETLIFY!=='true')throw Error('Requires Netlify build runtime');
  failedStage='environment-context';
  if(!['production','deploy-preview'].includes(process.env.CONTEXT))
    throw Error('Unrecognized deploy context');
  failedStage='environment-site-branch';
  if(process.env.SITE_ID!==SITE||process.env.BRANCH!==TARGET_BRANCH)
    throw Error('Staging build identity does not match. Refusing to access data.');
  failedStage='environment-secrets';
  const isPreview=process.env.CONTEXT==='deploy-preview';
  // Fresh keys are scoped to this build; the real admin key is never needed in PRs.
  const adminKey=isPreview?randomBytes(32).toString('hex'):(process.env.HABOM_ADMIN_KEY||'');
  const rateSalt=isPreview?randomBytes(32).toString('hex'):(process.env.HABOM_RATE_SALT||'');
  assert(adminKey.length>=32&&rateSalt.length>=32,'production environment variables');
  failedStage='database-client';
  const database=getDatabase();
  failedStage='blob-client';
  const blobStore=getDeployStore({name:'habom-build-integration',consistency:'strong'});
  failedStage='server-adapter';
  const env=createNetlifyEnv({database,files:blobStore,adminKey,rateSalt});
  const pseudoIP='habom-integration-'+randomUUID();
  const hashedIP=createHash('sha256').update(rateSalt+':'+pseudoIP).digest('hex');
  let postId='',receipt='',blobKey='',verified=false;
  async function call(path,options={}){
    const headers=new Headers(options.headers||{});
    headers.set('cf-connecting-ip',pseudoIP);
    return worker.fetch(new Request('https://staging-test.invalid'+path,{
      ...options,headers
    }),env);
  }
  try{
    failedStage='database-query';
    let response=await call('/api/health');
    assert(response.status===200,'database HTTP health status');
    assert((await getJSON(response)).database==='ready','database read query');
    const nonce=randomBytes(16).toString('hex');
    const text='HABOM_BUILD_TEST_'+nonce;
    const form=new FormData();
    for(const [k,v] of Object.entries({
      visibility:'hidden',category:'질문',title:'테스트용 임시 메모',
      body:text,nickname:'자동테스트',anonymous:'false',role:'',consent:'true',website:''
    }))form.set(k,v);
    form.set('attachment',new File(['%PDF-1.4\n'],'synthetic.pdf',{type:'application/pdf'}));
    failedStage='private-post-write';
    response=await call('/api/posts',{method:'POST',body:form});
    assert(response.status===201,'create synthetic private post');
    const obj=await getJSON(response);
    postId=obj.id;receipt=obj.receipt;
    assert(/^[a-f0-9-]{36}$/.test(postId)&&/^[a-f0-9]{64}$/.test(receipt),'author receipt');
    failedStage='postgres-attachment-read';
    const postRows=await database.sql.unsafe('SELECT attachment_key FROM posts WHERE id=$1',[postId]);
    blobKey=postRows[0]?.attachment_key||'';
    assert(blobKey.startsWith('private/'+postId+'/'),'attachment key');

    failedStage='private-visibility';
    response=await call('/api/posts');
    assert(response.status===200,'list public posts');
    const feed=await response.text();
    assert(!feed.includes(text)&&!feed.includes(postId)&&!feed.includes(receipt),'secret not leaked in public feed');
    assert((await call('/api/mine/'+postId)).status===403,'unauthorized read blocked');
    assert((await call('/api/mine/'+postId,{headers:{'X-Receipt-Token':'f'.repeat(64)}})).status===403,'wrong receipt blocked');
    response=await call('/api/mine/'+postId,{headers:{'X-Receipt-Token':receipt}});
    assert(response.status===200&&(await getJSON(response)).post.body===text,'author can read private post');
    assert((await call('/api/public/'+postId+'/file')).status===404,'file not public');
    assert((await call('/api/mine/'+postId+'/file')).status===403,'file not readable without receipt');
    failedStage='private-blob-read';
    response=await call('/api/mine/'+postId+'/file',{headers:{'X-Receipt-Token':receipt}});
    assert(response.status===200&&(await response.text())==='%PDF-1.4\n','authorized private PDF roundtrip');

    assert((await call('/api/admin/posts')).status===403,'admin unauthorized');
    failedStage='admin-reply';
    response=await call('/api/admin/posts/'+postId,{method:'POST',headers:{
      Authorization:'Bearer '+adminKey,'Content-Type':'application/json'
    },body:JSON.stringify({status:'답변 완료',reply:'임시 시험 답장',publicTitle:'비밀글입니다',metadataApproved:false,attachmentApproved:false})});
    assert(response.status===200,'admin response stored');
    response=await call('/api/mine/'+postId,{headers:{'X-Receipt-Token':receipt}});
    assert(response.status===200&&(await getJSON(response)).post.reply==='임시 시험 답장','owner reads response');
    verified=true;
  }finally{
    failedStage='test-data-cleanup';
    let cleanupError=null;
    try{
      if(postId){
        // Directly delete the unique synthetic record. Never touch other IDs.
        if(blobKey)await blobStore.delete(blobKey);
        await database.sql.unsafe('DELETE FROM posts WHERE id=$1',[postId]);
        const exists=await database.sql.unsafe('SELECT COUNT(*)::integer AS n FROM posts WHERE id=$1',[postId]);
        assert(exists[0]?.n===0,'no test post leftover');
        if(blobKey)assert(await blobStore.get(blobKey,{type:'blob',consistency:'strong'})===null,'no test PDF leftover');
      }
    }catch(e){cleanupError=e;}
    try{await database.sql.unsafe('DELETE FROM rate_limits WHERE key=$1',[hashedIP]);}
    catch(e){cleanupError=cleanupError||e;}
    if(cleanupError)throw Error('Synthetic test cleanup was not verified');
  }
  failedStage='final-verification';
  assert(verified,'all production database + deploy-scoped Blob tests');
  await writeFile('site/integration-verified.json',JSON.stringify({
    verified:true,environment:'isolated-staging-build',database:'real Netlify PostgreSQL',
    attachment:'deploy-scoped Blob (production persistent store requires separate browser test)',
    checks:'private post, file bytes, forbidden access, admin reply, cleanup'
  }));
  if(process.env.CONTEXT==='deploy-preview')
    await writeFile('netlify/functions/habom-check-success.mjs',"export default ()=>new Response('Synthetic test cleaned');");
  console.log('HABOM LIVE DB & DEPLOY-SCOPED BLOB INTEGRATION: VERIFIED; TEST DATA REMOVED');
}
try{await run()}catch(error){
  // PRIVATE STAGING DIAGNOSTIC ONLY: do not print or record secrets, names, values,
  // SQL errors, request bodies or author tokens. Report only this fixed stage label.
  console.error('HABOM LIVE CHECK STOPPED AT STAGE: '+failedStage);
  await writeFile('site/staging-deploy-check.json',JSON.stringify({
    status:'needs-attention',stage:failedStage,
    netlifyFlag:process.env.NETLIFY==='true',
    contextIsProduction:process.env.CONTEXT==='production',
    expectedSite:process.env.SITE_ID===SITE,
    expectedBranch:process.env.BRANCH===TARGET_BRANCH,
    secretKeysPresent:process.env.CONTEXT==='deploy-preview'?'not-needed':!!process.env.HABOM_ADMIN_KEY&&!!process.env.HABOM_RATE_SALT
  }));
  // A synthetic no-data function shows the safe failure stage in Netlify's
  // read-only deploy metadata, without exposing secret keys or DB contents.
  if(process.env.CONTEXT==='deploy-preview')
    await writeFile('netlify/functions/habom-check-failed-'+failedStage+'.mjs',"export default ()=>new Response('Build probe did not pass');");
  else process.exitCode=1;
}

// Regression: when the first transfer task needs help but a later new transfer is solved
// without help, the completed practice record must include the later independent success.
// No images/CSS are changed here.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
const getState=page=>page.evaluate(()=>window.__moaMissionQA());
async function take(page,n){
 for(let i=0;i<n;i++)await page.locator('.supply-items button[data-mission="take"]').first().click();
}
async function completeShare(page,wrong=false){
 const x=(await getState(page)).task;
 if(wrong){await take(page,x.n-1);await page.locator('[data-mission="submit"]').click();
  assert.equal((await getState(page)).attempts,1);
  await take(page,1);
 } else await take(page,x.n);
 await page.locator('[data-mission="submit"]').click();
 assert.equal(await page.locator('.success').count(),1,'completed share should show visual result');
 await page.locator('[data-mission="advance"]').click();
}
async function completeSession(page,firstTransferNeedsHelp){
 // Intro/demo is a model, not a counted learner answer.
 await page.locator('[data-mission="continue"]').click();
 assert.equal((await getState(page)).step,1);
 for(let step=1;step<=7;step++){
  const before=await getState(page);assert.equal(before.step,step);
  await completeShare(page,firstTransferNeedsHelp&&step===4);
  if((await getState(page)).phase==='chapter-end')return step;
 }
 throw Error('Session never reached chapter-end');
}
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto(base+'/math-garden/mission.html',{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
 await page.locator('[data-mission="start"]').click();
 let step=await completeSession(page,true);
 assert.equal(step,6,'a failed first transfer should allow practice at step 5 and a later independent transfer at step 6');
 let result=(await getState(page)).review;
 assert.equal(result.criteriaMet,true,'later independent transfer must count');
 assert.equal(result.transfer,true,'transfer recovery should be reported');
 assert.equal(result.independent,3,'two probe trials plus final transfer, not prompted first transfer');
 assert.equal(result.supported,2,'guided and assisted first transfer are supported, but successfully solved practice is not');
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('moa-numbers-guided-pilot-v1')));
 assert.equal(saved.share.sessions.length,1,'store one anonymous session summary');
 assert.equal(saved.share.sessions[0].transfer,true,'persist corrected evaluation');
 assert.equal(saved.share.sessions[0].independent,3,'do not include helped-first-transfer as independent');
 await page.locator('[data-mission="repeat"]').click();
 step=await completeSession(page,false);
 assert.equal(step,4,'early completion is valid after first independent transfer success');
 saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('moa-numbers-guided-pilot-v1')));
 assert.equal(saved.share.sessions.length,2,'keep previous progress instead of overwriting');
 assert.equal(saved.share.sessions[0].independent,3);
 assert.equal(saved.share.sessions[1].transfer,true);
 assert.ok(saved.share.sessions.every(s=>Number.isFinite(s.at)&&typeof s.criteriaMet==='boolean'));
 await page.reload();
 const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('moa-numbers-guided-pilot-v1')));
 assert.equal(persisted.share.sessions.length,2,'bounded histories survive reload');
 assert.deepEqual(errors,[],'no JavaScript errors');
 await context.close();
 console.log('PASS: assisted first transfer, independent later transfer, no false mastery, early success, local 2-session history, reload');
}catch(e){console.error('MISSION TRANSFER RECOVERY QA FAIL',e);process.exitCode=1}
finally{await browser.close()}

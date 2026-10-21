import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
const out='qa/math-mission-artifacts';fs.mkdirSync(out,{recursive:true});
let successes=0;
async function task(page){
 return page.evaluate(()=>window.__moaMissionQA());
}
async function loadConcept(page,index){
 if(index===0)await page.locator('[data-mission=start]').click();
 else await page.locator('[data-mission=next-chapter]').click();
 const s=await task(page);assert.equal(s.conceptIndex,index);
 assert.equal(s.phase,'demo','model must be displayed before child is asked');
 await page.locator('[data-mission=continue]').click();
 assert.equal((await task(page)).step,1);
}
async function pick(page,quantity){
 for(let i=0;i<quantity;i++){
   await page.locator('.supply-items [data-mission=take]').first().click();
 }
}
async function submit(page,index,kind,wrong=false){
 const s=await task(page);const x=s.task;assert.equal(s.phase,'task');
 if(index===0){
   if(wrong){
     await pick(page,x.n-1);
     await page.locator('[data-mission=submit]').click();
     assert.ok((await page.locator('#feedbackSlot').textContent()).includes('친구'));
     assert.equal((await task(page)).step,s.step,'wrong count must not finish');
     await page.locator('[data-mission=submit]').click();
     assert.ok((await page.locator('.scaffold').count())===1,'two errors must show matching scaffold');
     await pick(page,1);
   }else await pick(page,x.n);
   assert.equal(await page.locator('.packed-food .food').count(),x.n);
   await page.locator('[data-mission=submit]').click();
 }
 if(index===1){
   const correct=x.want==='more'?(x.a>x.b?'a':'b'):(x.a<x.b?'a':'b');
   await page.locator('[data-mission=choose][data-side="'+correct+'"]').click();
 }
 if(index===2){
  const needed=x.total-x.have;
  await pick(page,needed);
  await page.locator('[data-mission=submit]').click();
 }
 assert.equal((await task(page)).phase,'task','success state requires a success outcome scene');
 assert.ok(await page.locator('.success').count(),index+' '+kind+' did not yield story consequence');
 successes++;
 await page.locator('[data-mission=advance]').click();
}
async function exercise(viewport){
 const context=await browser.newContext({viewport:{width:viewport,height:viewport<500?844:900},reducedMotion:'reduce'});
 const page=await context.newPage();const errs=[];page.on('pageerror',e=>errs.push(e.message));
 const response=await page.goto(base+'/math-garden/mission.html',{waitUntil:'domcontentloaded'});
 assert.equal(response.status(),200);
 for(const file of ['mission.js','mission.css','assets/woodland-friends.svg','assets/forest-world.svg']){
  const r=await page.request.get(base+'/math-garden/'+file);assert.equal(r.status(),200,file+' not served');
 }
 const code=await (await page.request.get(base+'/math-garden/mission.js')).text();
 assert.ok(!code.includes('speechSynthesis'),'AI narrator should not appear');
 assert.ok(await page.locator('[data-mission=start]').isVisible());
 await page.screenshot({path:path.join(out,'mission-intro-'+viewport+'.png')});
 await loadConcept(page,0);
 await page.screenshot({path:path.join(out,'mission-demo-'+viewport+'.png')});
 for(let i=0;i<3;i++){
  if(i>0)await loadConcept(page,i);
  for(let step=1;step<=4;step++){
   let x=await task(page);
   assert.equal(x.step,step);
   if(step===2||step===4)await page.screenshot({path:path.join(out,'mission-'+viewport+'-'+i+'-'+step+'.png')});
   await submit(page,i,x.task.kind,i===0&&step===2);
  }
  assert.equal((await task(page)).phase,'chapter-end','chapter should finish after 2 independent outcomes and transfer');
  const review=(await task(page)).review;
  assert.ok(review.criteriaMet,'clean independent and transfer criteria should be met');
  if(i===0){assert.equal(review.independent,2,'assisted solved task must not count independently');}
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('moa-numbers-guided-pilot-v1')));
  assert.ok(saved[['share','compare','make'][i]],'per-concept record missing');
 }
 await page.locator('[data-mission=next-chapter]').click();
 assert.equal((await task(page)).phase,'intro','story must wrap to beginning');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 assert.ok(overflow<=3,'horizontal overflow '+viewport+' '+overflow);
 assert.deepEqual(errs,[],'JavaScript errors');
 await context.close();
}
try{
 for(const size of [390,1280])await exercise(size);
 const page=await browser.newPage();
 await page.goto(base+'/math-garden/',{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('.mission-front-link[href="./mission.html"]').count(),1,'game entry point missing');
 assert.ok(await page.locator('#startButton').count(),'old 15 play modes are still reachable');
 await page.close();
 console.log('PASS: guided adventure 3 concepts, model/guided/independent/transfer, wrong attempts, pairing hint, progress record, return to 15 modes; '+successes+' solved rounds');
}catch(e){console.error('MATH MISSION QA FAILURE',e);process.exitCode=1}finally{await browser.close()}

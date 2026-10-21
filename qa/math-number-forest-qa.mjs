import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
const artifacts='qa/math-forest-artifacts';fs.mkdirSync(artifacts,{recursive:true});
const stages=['share','glance','compare','count','numeral','zero','path','ten','compose','equal','sum','take','pattern','shapes','length'];
const errors=[];
async function solve(page,index,iteration){
 const q=await page.evaluate(()=>window.__numberForestQA.getTask());
 assert.equal(q.mode,stages[index],`expected ${stages[index]}, got ${q.mode}`);
 if(q.mode==='share')for(let k=0;k<q.n;k++)await page.locator('.friend-card:not([disabled])').first().click();
 if(q.mode==='glance'||q.mode==='numeral')await page.locator('.number-tile[data-n="'+q.n+'"]').click();
 if(q.mode==='compare'||q.mode==='length'){
  if(index===2&&iteration===0){
   const wrong=q.right==='a'?'b':'a';
   await page.locator('.island-choice[data-key="'+wrong+'"]').click();
   await page.locator('.island-choice[data-key="'+wrong+'"]').click();
   assert.ok(await page.locator('.learning-model').count(),'after two errors show a pictorial example, not an unearned correct answer');
   assert.equal(await page.locator('.coach-target').count(),0,'first help must not point at correct choice');
  }
  await page.locator('[data-key="'+q.right+'"]').click()
 }
 if(q.mode==='count'){
  for(let k=0;k<q.n;k++)await page.locator('.harvest-btn:not([disabled])').first().click();
  assert.equal(await page.locator('.storybook-reward').count(),0,'collecting all fruit alone must not prove cardinality');
  assert.equal(await page.locator('.final-count .number-tile').count(),3,'total number must be checked');
  await page.locator('.final-count .number-tile[data-n="'+q.n+'"]').click();
 }
 if(q.mode==='zero'||q.mode==='path')await page.locator('.number-tile[data-n="'+q.n+'"]').click();
 if(q.mode==='ten'||q.mode==='compose'||q.mode==='equal'){
  if(q.advanced)await page.locator('.number-tile[data-n="'+(q.n-q.have)+'"]').click();
  else for(let k=q.have;k<q.n;k++)await page.locator('.tap-add').click()
 }
 if(q.mode==='sum')await page.locator('.number-tile[data-n="'+q.n+'"]').click();
 if(q.mode==='take'){
  for(let k=0;k<q.take;k++)await page.locator('.harvest-btn:not([disabled])').first().click();
  assert.ok(await page.locator('.number-tile').count(),'take-away should not automatically mark correct when fruits removed');
  await page.locator('.number-tile[data-n="'+(q.n-q.take)+'"]').click()
 }
 if(q.mode==='pattern')await page.locator('.seed-choice[data-kind="'+q.answer+'"]').click();
 if(q.mode==='shapes')await page.locator('.shape-choice[data-kind="'+q.opts[q.n]+'"]').click();
 assert.ok(await page.locator('.storybook-reward').count(),`stage ${index}, round ${iteration} did not complete`);
}
try{
 let completed=0;
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:900},reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const resp=await page.goto(base+'/math-garden/',{waitUntil:'domcontentloaded'});
  assert.ok(resp?.ok(),'game route failed');
  for(const asset of ['assets/forest-world.svg','assets/woodland-friends.svg','v2.css','learning.css','learning-engine.js','game.js']){
   const a=await page.request.get(base+'/math-garden/'+asset);assert.equal(a.status(),200,'missing asset '+asset);
  }
  const js=await (await page.request.get(base+'/math-garden/game.js')).text();
  assert.ok(!js.includes('speechSynthesis'),'computer Korean narrator still present');
  assert.ok(await page.locator('#startButton').isVisible(),'start button missing');
  await page.screenshot({path:path.join(artifacts,'math-story-home-'+width+'.png')});
  await page.locator('#startButton').click();
  assert.equal((await page.evaluate(()=>window.__numberForestQA.stages())).length,15);
  await page.locator('#soundToggle').click();assert.equal(await page.locator('#soundToggle').getAttribute('aria-pressed'),'false');
  await page.locator('#soundToggle').click();assert.equal(await page.locator('#soundToggle').getAttribute('aria-pressed'),'true');
  for(let i=0;i<stages.length;i++){
   assert.equal((await page.evaluate(()=>window.__numberForestQA.getState())).stage,i);
   if([0,1,3,7,10,12,13,14].includes(i))await page.screenshot({path:path.join(artifacts,'math-story-game-'+width+'-'+i+'.png')});
   for(let j=0;j<5;j++){
    const before=await page.evaluate(()=>window.__numberForestQA.getState());
    assert.equal(before.phase,['explore','model','independent','transfer','review'][j]);
    if(j===1)assert.equal(before.modelUsed,true,'model phase must demonstrate before independent practice');
    await solve(page,i,j);completed++;
    if(j<4)await page.waitForFunction(expected=>{const s=window.__numberForestQA.getState();return s.round===expected&&!s.locked},j+1,{timeout:8000});
   }
   await page.locator('.storybook-finish').waitFor({state:'visible',timeout:8000});
   const learning=await page.evaluate(()=>window.__numberForestQA.getLearning());
   assert.equal(learning.attempts,5);
   assert.equal(learning.transfer,1,'different representation phase should be solved unaided');
   assert.equal(learning.independent,3,'only independent, transfer and review trials count');
   assert.equal(learning.ready,true,'valid check result should be available');
   await page.locator('.storybook-finish [data-act=next]').click();
  }
  assert.equal((await page.evaluate(()=>window.__numberForestQA.getState())).stage,0,'stage cycle broken');
  await page.locator('#stageToggle').click();assert.equal(await page.locator('.stage-select').count(),15,'all stages should be freely accessible');
  await page.locator('.stage-select[data-i="12"]').click();assert.equal((await page.evaluate(()=>window.__numberForestQA.getState())).stage,12);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0,'horizontal overflow');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('moa-number-forest-v3')));
  assert.equal(Object.keys(saved).length,15,'progress missing for some activities');
  assert.ok(Object.values(saved).every(v=>v.verifiedSessions===1),'each completed learning check must be recorded independently');
  assert.equal(saved.share.supportedTotal,1,'model trials should be recorded as supported');
  assert.equal(saved.compare.supportedTotal,2,'wrong-answer trial and guided model must not inflate independent learning');
  if(width===390){await page.reload();assert.ok(await page.locator('#startButton').isVisible(),'game should survive reload')}
  await context.close()
 }
 const site=await browser.newPage({viewport:{width:390,height:844}});
 await site.goto(base+'/gardens/',{waitUntil:'domcontentloaded'});
 assert.ok(await site.locator('#learning .math-feature[href="../math-garden/"]').isVisible(),'garden entry missing');
 await site.goto(base+'/',{waitUntil:'domcontentloaded'});
 assert.ok(await site.locator('.math-home-feature[href="math-garden/"]').isVisible(),'home entry missing');
 await site.close();
 assert.deepEqual(errors,[],'browser JavaScript errors');
 console.log('PASS Number Forest Learning V3 — '+completed+' actual completed rounds / 15 modes / 2 viewport sizes, files loaded, voice synthesis absent, progress and hint checks');
}catch(e){console.error('FAIL Number Forest V2',e);process.exitCode=1}
finally{await browser.close()}

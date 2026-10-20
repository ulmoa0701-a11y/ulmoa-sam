'use strict';
// Actual child-like interactions, not direct nextRound() shortcuts.
// This test does not constitute an assessment of any child's abilities.
const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const base='http://127.0.0.1:8765/thinking-garden/';
async function pickUntil(page,selector,max=30){
 for(let i=0;i<max;i++){
  if(await page.locator('.round-gate button').count())return;
  const target=page.locator(selector).first();
  assert.ok(await target.count(),'Missing playable target '+selector);
  await target.click();
 }
 assert.fail('Too many actions without completing '+selector);
}
async function solve(page,id){
 if(id==='sameShape'){
  const shape=await page.locator('.shape-target').textContent();
  const correct=page.locator('.basic-choice').filter({hasText:shape}).first();
  assert.ok(await correct.count(),'Shape target has no selectable match');
  await correct.click();
 }else if(id==='memory'){
  const order=await page.evaluate(()=>[...document.querySelectorAll('.memory-strip .memory-tile')].map(el=>{
   const dot=el.querySelector('.memory-dot');
   return dot?'color:'+dot.style.backgroundColor:'animal:'+el.querySelector('.memory-animal')?.textContent.trim();
  }));
  await page.locator('.memory-ready').click();
  for(const value of order){
   const index=await page.evaluate(key=>[...document.querySelectorAll('.memory-choice:not(.used)')].findIndex(el=>{
    const dot=el.querySelector('.memory-dot');
    const here=dot?'color:'+dot.style.backgroundColor:'animal:'+el.querySelector('.memory-animal')?.textContent.trim();
    return here===key;
   }),value);
   assert.ok(index>=0,'Memory cannot reproduce visible study token '+value);
   await page.locator('.memory-choice:not(.used)').nth(index).click();
  }
 }else if(id==='flower')await pickUntil(page,'.object-btn[data-good="1"]:not(.picked)');
 else if(id==='hide')await pickUntil(page,'.leaf-has-clue:not(.opened)');
 else if(id==='path')await pickUntil(page,'.trail-node.ready:not(.visited)');
 else if(id==='calm'){
  await page.locator('#signalBtn.go').waitFor({state:'visible',timeout:10000});
  await page.locator('#signalBtn.go').click();
 }else if(id==='inside'){
  for(let i=0;i<9&&!await page.locator('.round-gate button').count();i++)
   await page.locator('#insideZone').click({position:{x:45+i%3*38,y:50}});
 }else if(id==='targets')await pickUntil(page,'.wake-target:not(.wake-decoy):not(.awake)');
 else if(id==='paint')await pickUntil(page,'#paintGrid i:not(.painted)');
 else if(id==='water')await pickUntil(page,'.wilt[data-good="1"]:not(.bloom)');
 else throw Error('Unknown gameplay '+id);
 await page.locator('.round-gate button').waitFor({state:'visible',timeout:10000});
}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const summary=[];
 try{
  for(const viewport of [{name:'mobile',width:390,height:844},{name:'desktop',width:1280,height:900}]){
   const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},reducedMotion:'reduce'});
   const page=await context.newPage();page.setDefaultTimeout(11000);
   const failures=[];page.on('pageerror',e=>failures.push(e.message));
   for(const id of ['sameShape','memory','flower','hide','path','calm','inside','targets','paint','water']){
    await page.goto(base+'?game='+id,{waitUntil:'load'});
    assert.ok(await page.locator('#introScreen.active').isVisible(),viewport.name+' '+id+' intro');
    await page.locator('#sessionRounds').selectOption('5');
    await page.locator('#introStart').click();
    assert.equal(await page.evaluate(()=>state.roundTotal),5,'wrong session length');
    const rounds=['sameShape','memory','flower'].includes(id)?5:2;
    for(let round=0;round<rounds;round++){
     if(round===0&&id==='sameShape'){
      const shape=await page.locator('.shape-target').textContent();
      const wrong=page.locator('.basic-choice').filter({hasNotText:shape}).first();
      await wrong.click();
      assert.equal(await page.evaluate(()=>state.basicRecords[0].firstAttempt),'X','wrong shape first attempt not logged');
     }
     if(round===0&&id==='flower'){
      await page.locator('.object-btn[data-good="0"]').first().click();
      assert.equal(await page.evaluate(()=>state.basicRecords[0].gardenFirst),'X','wrong flower first attempt not logged');
     }
     await solve(page,id);
     if(round===0&&id==='sameShape')assert.deepEqual(
      await page.evaluate(()=>[state.basicRecords[0].firstAttempt,state.basicRecords[0].finalCorrect]),
      ['X','O'],'self-correction must be recorded separately');
     await page.locator('.round-gate button').click();
     if(round===rounds-1&&rounds===5){
      await page.locator('#resultScreen.active').waitFor();
      const result=await page.locator('#resultMessage').textContent();
      assert.ok(result.includes('5개 미션'),viewport.name+' '+id+' incorrectly reports a fixed number: '+result);
      assert.equal(await page.locator('.basic-observation').count(),1,'missing teacher observation');
      await page.locator('#resultScreen [data-go="home"]').click();
     }else await page.waitForFunction(n=>document.querySelector('#stageLabel')?.textContent.trim()===n,(round+2)+' / 5');
    }
    if(rounds!==5)await page.locator('#backHome').click();
    summary.push({device:viewport.name,game:id,realSolved:rounds,finished:rounds===5});
   }
   assert.deepEqual(failures,[],viewport.name+' JavaScript errors');
   await context.close();
  }
 }finally{await browser.close()}
 console.log(JSON.stringify({title:'actual game choices not skipped',cases:summary.length,solvedRounds:summary.reduce((n,r)=>n+r.realSolved,0),finishedSessions:summary.filter(r=>r.finished).length,summary},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
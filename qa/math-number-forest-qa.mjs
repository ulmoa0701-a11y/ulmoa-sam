import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('playwright-core');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
const artifacts='qa/math-forest-artifacts';fs.mkdirSync(artifacts,{recursive:true});
let roundCount=0;
async function doRound(page,idx){
 const task=await page.evaluate(()=>window.__numberForestQA.getTask());
 assert.ok(task,'missing task');assert.equal(task.mode,['share','compare','count','numeral','compose','equal','sum'][idx]);
 if(idx===0)for(let i=0;i<task.n;i++)await page.locator('.friend-card:not([disabled])').first().click();
 if(idx===1){
  if(roundCount===4){await page.locator('.choice-island[data-side="'+(task.side==='left'?'right':'left')+'"]').click();await page.locator('.choice-island[data-side="'+(task.side==='left'?'right':'left')+'"]').click();assert.ok(await page.locator('.coach-target').count(),'2 errors should reveal help')}
  await page.locator('.choice-island[data-side="'+task.side+'"]').click()
 }
 if(idx===2)for(let i=0;i<task.n;i++)await page.locator('.crop-btn:not([disabled])').first().click();
 if(idx===3)await page.locator('.number-tile[data-value="'+task.n+'"]').click();
 if(idx===4)for(let i=task.left;i<task.target;i++)await page.locator('[data-action=add]').click();
 if(idx===5)for(let i=task.right;i<task.target;i++)await page.locator('[data-action=equal]').click();
 if(idx===6)await page.locator('.number-tile[data-value="'+task.total+'"]').click();
 assert.equal(await page.locator('.round-done').count(),1,'no feedback after successful round '+idx);
 roundCount++;
}
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:width<600?844:880},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(base+'/math-garden/',{waitUntil:'domcontentloaded'});
  assert.ok(response.ok());assert.ok(await page.locator('#startButton').isVisible());
  await page.screenshot({path:path.join(artifacts,'math-forest-start-'+width+'.png')});
  await page.locator('#startButton').click();
  assert.equal(await page.locator('.friend-card').count(),(await page.evaluate(()=>window.__numberForestQA.getTask())).n);
  if(width===390){
   await page.locator('#soundToggle').click();
   assert.equal(await page.locator('#soundToggle').getAttribute('aria-pressed'),'false');
   await page.locator('#soundToggle').click();
   assert.equal(await page.locator('#soundToggle').getAttribute('aria-pressed'),'true');
  }
  for(let i=0;i<7;i++){
   assert.equal((await page.evaluate(()=>window.__numberForestQA.getState())).stage,i);
   await page.screenshot({path:path.join(artifacts,'math-forest-stage-'+width+'-'+i+'.png')});
   for(let r=0;r<4;r++){
    await doRound(page,i);
    if(r<3)await page.waitForFunction(exp=>{const s=window.__numberForestQA.getState();return s.round===exp&&!s.locked},r+1,{timeout:5000});
   }
   await page.locator('.stage-done').waitFor({state:'visible',timeout:5000});
   await page.locator('.stage-done [data-action=next]').click();
  }
  assert.equal((await page.evaluate(()=>window.__numberForestQA.getState())).stage,0,'last stage did not wrap');
  await page.locator('#stageToggle').click();
  assert.equal(await page.locator('.stage-select').count(),7);
  await page.locator('.stage-select[data-stage="4"]').click();
  assert.equal((await page.evaluate(()=>window.__numberForestQA.getState())).stage,4,'free stage choice failed');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=3,'screen horizontally overflowed by '+overflow+'px');
  assert.deepEqual(errors,[],'page JS errors');
  if(width===390){
   const p=await page.evaluate(()=>JSON.parse(localStorage.getItem('moa-number-forest-v1')));
   assert.equal(Object.keys(p).length,7,'no locally saved progress');
   await page.reload();
   assert.ok(await page.locator('#startButton').isVisible(),'reload broke opening screen');
  }
  await page.close()
 }
 const portal=await browser.newPage({viewport:{width:390,height:844}});
 await portal.goto(base+'/gardens/',{waitUntil:'domcontentloaded'});
 assert.ok(await portal.locator('#learning .math-feature[href="../math-garden/"]').isVisible(),'learning-garden entry missing');
 await portal.goto(base+'/',{waitUntil:'domcontentloaded'});
 assert.equal(await portal.locator('.hb-shortcut-card[href="math-garden/"]').count(),1,'homepage quick link missing');
 await portal.close();
 console.log('PASS: seven games, 56 completed rounds, hint handling, local state, stage selection, responsive desktop/mobile and homepage/gardens links');
}catch(e){console.error('NUMBER FOREST QA FAILED',e);process.exitCode=1}
finally{await browser.close()}
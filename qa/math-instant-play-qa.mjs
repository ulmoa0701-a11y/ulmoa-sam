import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('playwright-core');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
try {
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:width===390?844:900},reducedMotion:'reduce'});
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
  const r=await page.goto(base+'/math-garden/mission.html',{waitUntil:'domcontentloaded'});assert.equal(r.status(),200);
  const before=await page.evaluate(()=>window.__moaMissionQA());
  assert.equal(before.phase,'task','no mandatory splash or tutorial before the first touch');
  assert.equal(before.step,1);
  assert.equal(await page.locator('[data-mission=start], [data-mission=continue]').count(),0);
  assert.equal(await page.locator('[data-mission=take]').count(),before.task.n+2);
  assert.equal(await page.locator('.hungry-friend').count(),before.task.n);
  assert.equal(await page.locator('.guided-preview').count(),0,'do not display a teaching panel before exploration');
  // Child needs only the action elements: tap a nut and then an animal, with no reading.
  for(let i=0;i<before.task.n;i++){
   await page.locator('[data-mission=take]').first().click();
   assert.equal((await page.evaluate(()=>window.__moaMissionQA())).selected,1);
   await page.locator('button.feed-friend:not([disabled])').first().click();
  }
  assert.equal(await page.locator('.success').count(),1);
  assert.equal(await page.locator('[data-mission=advance]').count(),1,'manual skip still available');
  // Without touching any "next" button, the game carries on to the next scene itself.
  await page.waitForFunction(()=>window.__moaMissionQA().step===2 && window.__moaMissionQA().phase==='task',null,{timeout:7500});
  assert.equal(await page.locator('button.feed-friend:not([disabled])').count(),3,'new scene is immediately playable');
  // Help is optional and accessible even without a mandatory tutorial.
  assert.equal(await page.locator('.scaffold').count(),0);
  await page.locator('#visualHint').click();
  assert.equal(await page.locator('.scaffold').count(),1,'visual support available only when asked');
  assert.ok(await page.locator('[data-mission=take]').first().isVisible());
  assert.deepEqual(pageErrors,[]);
  await page.close();
 }
 console.log('PASS zero-instruction experience: interactive first frame, acorn-to-plate feedback, no start/demo gate, auto next scene, optional help, 390px and 1280px');
}catch(e){console.error('MATH INSTANT PLAY QA FAILURE',e);process.exitCode=1}
finally{await browser.close()}

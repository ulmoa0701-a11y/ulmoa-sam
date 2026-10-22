import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('playwright-core');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
let count=0;
async function inspect(page){return page.evaluate(()=>window.__moaMissionQA())}
async function pick(page,n){for(let i=0;i<n;i++)await page.locator('.supply-items [data-mission="take"]').first().click()}
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:900},reducedMotion:'reduce'});
  const page=await context.newPage(),exceptions=[];
  page.on('pageerror',e=>exceptions.push(e.message));
  const res=await page.goto(base+'/math-garden/mission.html',{waitUntil:'domcontentloaded'});
  assert.equal(res.status(),200);
  assert.equal((await page.request.get(base+'/math-garden/mission-play.css')).status(),200);
  await page.locator('[data-mission="start"]').click();
  await page.locator('[data-mission="continue"]').click();
  let q=(await inspect(page)).task;
  assert.equal(q.kind,'guided');
  assert.equal(await page.locator('button.feed-friend').count(),q.n);
  await page.locator('button.feed-friend:not([disabled])').first().click();
  assert.equal((await inspect(page)).selected,0,'tapping a friend with empty basket must not invent food');
  assert.ok(await page.locator('.supply.need-food').count(),'show a picture-based empty-basket cue');
  await pick(page,1);
  await page.locator('button.feed-friend:not([disabled])').first().click();
  let state=await inspect(page);
  assert.equal(state.served.length,1);
  assert.equal(state.selected,0);
  assert.equal(state.taken,1,'food already given must remain removed from the tree');
  assert.equal(await page.locator('.dish-filled').count(),1,'a served friend must be visibly fed');
  await pick(page,1);
  await page.locator('button.feed-friend:not([disabled])').first().click();
  assert.equal(await page.locator('.success').count(),1,'delivery should complete without any separate submit button');
  assert.equal((await inspect(page)).served.length,q.n);
  await page.locator('[data-mission="advance"]').click();
  q=(await inspect(page)).task;assert.equal(q.kind,'probe');
  await pick(page,q.n+1);
  for(let i=0;i<q.n;i++)await page.locator('button.feed-friend:not([disabled])').first().click();
  state=await inspect(page);
  assert.equal(state.selected,1,'one unneeded fruit should remain in basket');
  assert.equal(state.served.length,q.n);
  assert.equal(await page.locator('.success').count(),0,'over-picking cannot register as immediate independent success');
  await page.locator('[data-mission="undo"]').first().click();
  assert.equal(await page.locator('.success').count(),1,'returning leftover fruit should resolve story');
  const last=(await inspect(page)).results.at(-1);
  assert.equal(last.clean,false,'self-correction after overprepare must not be recorded as a first-try independent probe');
  await page.locator('[data-mission="advance"]').click();
  q=(await inspect(page)).task;
  await pick(page,q.n);
  await page.locator('[data-mission="submit"]').click();
  assert.equal(await page.locator('.success').count(),1,'one-tap delivery is retained as an accessible alternative');
  assert.deepEqual(exceptions,[],'all actions must avoid page errors');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=3,'mobile/desktop should not add horizontal overflow: '+width+' '+overflow);
  count++;
  await context.close();
 }
 console.log('PASS child-first math delivery: feed one friend, food stock, filled plates, too many fruit, undo to recover, no false independent record, one-tap alternative, mobile+desktop ('+count+' screen sizes)');
}catch(e){console.error('MATH DIRECT DELIVERY QA FAILURE',e);process.exitCode=1}
finally{await browser.close()}

'use strict';
const {chromium}=require('playwright-core'),assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',x=>errors.push(x.message));
await page.goto('http://127.0.0.1:8765/thinking-garden/',{waitUntil:'load'});
assert.equal(await page.locator('.library-card').count(),26);
for(const card of await page.locator('.library-card[data-open]').evaluateAll(els=>els.map(x=>x.dataset.open)))assert.ok(await page.evaluate(id=>MoaClinicalBridge.dataFor(id)!==null,card),'missing clinical bridge '+card);
await page.locator('[data-open="festivalPlan"]').click();
assert.equal(await page.locator('#introScreen .moa-clinical-bridge').count(),1);
await page.locator('#slowLevel').selectOption('2');
await page.locator('#slowTeacherDetails summary').click();
await page.locator('#strategyAuto').check();
await page.locator('#introStart').click();
for(let round=0;round<2;round++){
const n=await page.evaluate(()=>state.strategy.r.tasks.length);
for(let i=0;i<n;i++)await page.locator('[data-plan=choose][data-i="'+i+'"]').click();
await page.locator('[data-plan=check]').click();assert.ok(await page.locator('.strategy-done').isVisible());
await page.locator('[data-core=next]').click();
await page.waitForFunction(n=>document.querySelector('#stageLabel')?.textContent.trim()===n,(round+2)+' / 5');
}
assert.equal(await page.evaluate(()=>state.strategy.currentLevel),3,'correct streak must increase 2 to 3');
await page.locator('.strategy-quest .strategy-teacher summary').click();
await page.locator('.strategy-quest [data-core="teacher-cue"]').click();
assert.equal(await page.evaluate(()=>state.strategy.r.teacherCues),1,'teacher-provided cue must be recorded separately');
await page.locator('[data-core="pause"]').click();
assert.ok(await page.locator('.strategy-done').isVisible(),'a pause must stop the current task without skipping it');
await page.locator('[data-core="resume"]').click();
assert.equal(await page.evaluate(()=>state.strategy.r.pauses),1,'paused round must be resumed, not discarded');
for(let attempt=0;attempt<2;attempt++){
const n=await page.evaluate(()=>state.strategy.r.tasks.length);
for(const i of [2,0,1,3].slice(0,n))await page.locator('[data-plan=choose][data-i="'+i+'"]').click();
await page.locator('[data-plan=check]').click();await page.locator('[data-plan=recover]').click();
}
assert.equal(await page.evaluate(()=>state.strategy.r.errors),2);
await page.locator('[data-core=rest]').click();await page.locator('[data-core=next]').click();
await page.waitForFunction(()=>document.querySelector('#stageLabel')?.textContent.trim()==='4 / 5');
assert.equal(await page.evaluate(()=>state.strategy.currentLevel),2,'repeated errors must reduce difficulty');
assert.deepEqual(await page.evaluate(()=>{const r=state.strategy.records[2];return [r.first,r.final,r.errors,r.support,r.teacherCues,r.pauses]}),['X','-',2,2,1,1],'first/final/cue/pause observations must be distinct');
await page.locator('#backHome').click();
await page.locator('[data-open="resetRescue"]').click();await page.locator('#introStart').click();
await page.evaluate(()=>{state.strategy.r.suggested=(state.strategy.r.target+1)%5;renderRound()});
await page.locator('[data-rec=question]').click();
assert.equal(await page.evaluate(()=>state.strategy.r.first),null,'asking to check is not a correct answer');
await page.locator('[data-rec=pick][data-id="'+(await page.evaluate(()=>state.strategy.r.target))+'"]').click();
assert.equal(await page.evaluate(()=>state.strategy.records[0].first),'O');
assert.deepEqual(errors,[]);await browser.close();console.log('PASS clinical bridge for 26 games; dynamic difficulty increase/decrease; self-check does not inflate correctness');
})().catch(e=>{console.error(e);process.exit(1)});
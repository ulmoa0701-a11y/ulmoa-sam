'use strict';
const {chromium}=require('playwright-core'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
fs.mkdirSync('qa/curated-share-screenshots',{recursive:true});
for(const vp of [{name:'mobile',width:390,height:844},{name:'desktop',width:1280,height:900}]){
const page=await browser.newPage({viewport:{width:vp.width,height:vp.height}});page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8765/thinking-garden/',{waitUntil:'load'});
assert.ok(await page.locator('.library-card').count()>=26);
await page.locator('#moaPlannerLaunch').click();assert.ok(await page.locator('#moaPlanBuilder').evaluate(x=>x.open));
for(const id of ['slowName','festivalPlan','slowPdf'])await page.locator('#moaPlanSelection input[value="'+id+'"]').check();
await page.locator('#moaPlanLevel').selectOption('2');await page.locator('#moaPlanRounds').selectOption('10');
await page.locator('.moa-plan-create').click();const url=await page.locator('#moaPlanLink').inputValue();
assert.ok(url.includes('?plan='));assert.ok(!url.includes('child'));
await page.screenshot({path:'qa/curated-share-screenshots/'+vp.name+'-builder.png'});
const parent=await browser.newPage({viewport:{width:vp.width,height:vp.height}});parent.setDefaultTimeout(12000);const perr=[];parent.on('pageerror',e=>perr.push(e.message));
await parent.goto(url,{waitUntil:'load'});
assert.ok(await parent.locator('#moaAssignedHome').isVisible());
assert.equal(await parent.locator('.moa-assigned-item').count(),3);
assert.equal(await parent.locator('#gardenGamePanel:visible').count(),0);
assert.equal(await parent.locator('.site-home-link:visible').count(),0);
await parent.screenshot({path:'qa/curated-share-screenshots/'+vp.name+'-parent.png'});
await parent.locator('.moa-assigned-item').filter({hasText:'친구 이름 탐정'}).locator('button').click();
assert.equal(await parent.locator('#introScreen.active').count(),1);
assert.equal(await parent.locator('#slowLevel').inputValue(),'2');
assert.equal(await parent.locator('#sessionRounds').inputValue(),'12');
await parent.locator('#introBack').click();assert.ok(await parent.locator('#moaAssignedHome').isVisible());
await parent.locator('.moa-assigned-item').filter({hasText:'축제 준비'}).locator('button').click();
assert.equal(await parent.locator('#sessionRounds').inputValue(),'10');
await parent.locator('#introStart').click();assert.equal(await parent.locator('#gameScreen.active').count(),1);
await parent.locator('#backHome').click();assert.ok(await parent.locator('#moaAssignedHome').isVisible());
await parent.locator('.moa-assigned-item').filter({hasText:'차근차근 인지활동지'}).locator('button').click();
assert.ok(await parent.locator('#moaAssignedEmbed').isVisible());
await parent.locator('#moaAssignedEmbed .moa-assigned-exit').click();assert.equal(await parent.locator('#moaAssignedEmbed').count(),0);
await parent.locator('.moa-assigned-item').filter({hasText:'축제 준비'}).locator('button').click();
await parent.locator('#introStart').click();
for(let round=1;round<=10;round++){
 const n=await parent.evaluate(()=>state.strategy.r.tasks.length);
 for(let k=0;k<n;k++)await parent.locator('[data-plan=choose][data-i="'+k+'"]').click();
 await parent.locator('[data-plan=check]').click();
 assert.ok(await parent.locator('.strategy-done').isVisible(),'festival completion step '+round);
 await parent.locator('[data-core=next]').click();
 if(round===10){await parent.locator('#resultScreen.active').waitFor();}
 else if(round===5){await parent.locator('#practiceContinue').waitFor();await parent.locator('#practiceContinue').click();}
 else await parent.waitForFunction(n=>document.querySelector('#stageLabel')?.textContent.trim()===n,(round+1)+' / 10');
}
assert.ok(await parent.locator('#resultScreen .moa-clinical-bridge').count()===1,'home-transfer prompt missing');
assert.ok(await parent.locator('.moa-assigned-next').count()>=1,'assigned next action missing');
await parent.locator('.moa-assigned-next').last().click();
assert.ok(await parent.locator('#moaAssignedHome').isVisible(),'assignment after result');
assert.ok((await parent.locator('.moa-assigned-progress').innerText()).includes('1개'),'session-only journey progress missing');
assert.deepEqual(perr,[]);assert.deepEqual(errors,[]);await parent.close();await page.close();
}
await browser.close();console.log('PASS curated-only share links and direct parent games/worksheets on mobile/desktop');
})().catch(e=>{console.error(e);process.exit(1)});
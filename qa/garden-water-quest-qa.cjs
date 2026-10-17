'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright-core');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROME_BIN,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
for(const vp of [{width:390,height:844,name:'mobile'},{width:1280,height:900,name:'desktop'}]){
const page=await browser.newPage({viewport:{width:vp.width,height:vp.height}});page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
for(const rounds of [5,10,15,20]){
await page.goto('http://127.0.0.1:8765/thinking-garden/',{waitUntil:'load'});
await page.locator('[data-open="water"]').click();await page.locator('#sessionRounds').selectOption(String(rounds));await page.locator('#introStart').click();
for(let i=0;i<rounds;i++){
const wrong=page.locator('.water-quest .healthy').first();await wrong.click();
assert.equal(await page.evaluate(()=>state.basicRecords[state.round].waterMistakes),1,'wrong watering click not recorded');
const valid=page.locator('.water-quest .needs-water');const total=await valid.count();
for(let n=0;n<total;n++)await valid.nth(n).click();
assert.equal(await page.locator('.water-quest .bloom').count(),total,'all selected flowers must bloom');
assert.ok((await page.locator('#waterGardenGrowth').innerText()).trim().length>1,'no visibly growing garden');
assert.deepEqual(await page.evaluate(()=>{const o=state.basicRecords[state.round];return [o.firstChoice,o.waterChoices,o.waterMistakes]}),['불필요',total+1,1]);
await page.locator('.round-gate button').click();
if(i+1<rounds&&((i+1)%5===0)&&rounds>=10){await page.locator('#practiceContinue').waitFor();await page.locator('#practiceContinue').click();}
if(i+1<rounds)await page.waitForFunction(next=>state.round===next&&!state.advancing&&!!document.querySelector('.water-quest'),i+1);
}
await page.locator('#resultScreen.active').waitFor();
assert.equal(await page.evaluate(()=>state.basicRecords.length),rounds,'round observations missing');
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+4),true,'horizontal overflow');
console.log('PASS water quest '+vp.name+' '+rounds+' rounds');
}
assert.deepEqual(errors,[]);await page.close();
}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});

'use strict';
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
  for(const vp of [{name:'mobile',width:390,height:844},{name:'desktop',width:1280,height:900}]){
   const page=await browser.newPage({viewport:vp});page.setDefaultTimeout(12000);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   for(const length of [5,10,15,20]){
    await page.goto('http://127.0.0.1:8765/thinking-garden/',{waitUntil:'load'});
    await page.locator('[data-open="slowName"]').click();
    await page.locator('#sessionRounds').selectOption(String(length));
    await page.locator('#introStart').click();
    const visit=[];
    for(let round=0;round<length;round++){
     const token=await page.locator('.slow-name-picture').innerText();
     visit.push(token.trim());
     assert.ok(await page.locator('.slow-name-quest').isVisible(),'quest absent');
     await page.locator('[data-slow="ready"]').click();
     if(round===0){
      await page.locator('[data-slow="name-wrong"]').click();
      await page.locator('[data-slow="retryName"]').click();
     }
     await page.locator('[data-slow="name-right"]').click();
     assert.ok(await page.locator('.slow-name-arrival').isVisible(),'no visible reward for successful response');
     await page.locator('[data-slow="next"]').click();
     if(round+1<length&&((round+1)%5===0)){
      await page.locator('#practiceContinue').waitFor();
      await page.locator('#practiceContinue').click();
     }
     if(round+1<length)await page.locator('.slow-name-picture').waitFor();
    }
    await page.locator('#resultScreen.active').waitFor();
    assert.equal((await page.evaluate(()=>state.slowLook.records)).length,length,'missing clinical observations');
    assert.deepEqual(await page.evaluate(()=>[state.slowLook.records[0].first,state.slowLook.records[0].final,state.slowLook.records[0].retries]),['X','O',1],'wrong-to-correct first response distorted');
    assert.equal(new Set(visit.slice(0,Math.min(6,length))).size,Math.min(6,length),'repeated stimuli inside the first six-round block');
    for(let start=6;start+6<=length;start+=6)assert.equal(new Set(visit.slice(start,start+6)).size,6,'later block repeats stimuli');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+4),true,'horizontal scrolling / cut-off on '+vp.name);
    console.log('PASS name quest '+vp.name+' '+length+' rounds, unique blocks, error recovery and visual arrival');
   }
   assert.deepEqual(errors,[],'uncaught browser errors');
   await page.close();
  }
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});

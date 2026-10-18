'use strict';
const {chromium}=require('playwright-core'),assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
try{
for(const vp of [{name:'mobile',width:390,height:844},{name:'desktop',width:1280,height:900}]){
 const page=await browser.newPage({viewport:vp});page.setDefaultTimeout(14000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const length of [5,10]){
  await page.goto('http://127.0.0.1:8765/thinking-garden/',{waitUntil:'load'});
  await page.locator('[data-open="calm"]').click();await page.locator('#sessionRounds').selectOption(String(length));await page.locator('#introStart').click();
  for(let i=0;i<length;i++){
   if(i===0){for(let k=0;k<3;k++)await page.locator('#signalBtn.wait,#signalBtn.caution').click();}
   await page.locator('#signalBtn.go').waitFor({timeout:7500});await page.locator('#signalBtn.go').click();
   await page.locator('.round-gate button').click();
   if(i+1<length&&length>=10&&(i+1)%5===0){await page.locator('#practiceContinue').waitFor();await page.locator('#practiceContinue').click();}
   if(i+1<length)await page.waitForFunction(next=>state.round===next&&!!document.querySelector('#signalBtn'),i+1);
  }
  await page.locator('#resultScreen.active').waitFor();
  assert.deepEqual(await page.evaluate(()=>[state.basicRecords[0].signalFirst,state.basicRecords[0].earlySignalTaps,state.basicRecords[0].greenSignalTaps]),['기다림 중 누름',3,1],'early taps should be observed, not restart the wait');
  console.log('PASS signal game '+vp.name+' '+length+' rounds, calm wait and clinical taps');
 }
 for(const length of [5,10,15,20]){
  await page.goto('http://127.0.0.1:8765/thinking-garden/',{waitUntil:'load'});
  await page.locator('[data-open="inside"]').click();await page.locator('#sessionRounds').selectOption(String(length));await page.locator('#introStart').click();
  for(let i=0;i<length;i++){
   if(i===0)await page.locator('#insideStage').click({position:{x:10,y:10}});
   const need=await page.evaluate(()=>3+practiceStep());
   const zone=page.locator('#insideZone');await zone.focus();
   for(let j=0;j<need;j++)await page.keyboard.press('Enter');
   assert.equal(await zone.locator('i').count(),need,'keyboard should plant the visible stars');
   await page.locator('.round-gate button').click();
   if(i+1<length&&length>=10&&(i+1)%5===0){await page.locator('#practiceContinue').waitFor();await page.locator('#practiceContinue').click();}
   if(i+1<length)await page.waitForFunction(next=>state.round===next&&!!document.querySelector('#insideZone'),i+1);
  }
  await page.locator('#resultScreen.active').waitFor();
  assert.deepEqual(await page.evaluate(()=>[state.basicRecords[0].fenceFirst,state.basicRecords[0].fenceOutside,state.basicRecords[0].fenceKeyboard]),['울타리 밖',1,3],'boundary and keyboard must be observed separately');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+4),true,'fence game mobile overflow');
  console.log('PASS fence game '+vp.name+' '+length+' rounds, keyboard and spatial observations');
 }
 assert.deepEqual(errors,[],'uncaught page exceptions');
 await page.close();
}
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

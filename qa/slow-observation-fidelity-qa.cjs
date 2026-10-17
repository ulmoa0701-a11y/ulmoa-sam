'use strict';
/* Child-initiated review != teacher button != prompted retry.
   These event counts are descriptive session observations, not clinical scores. */
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const size of [{label:'mobile',width:390,height:844},{label:'desktop',width:1280,height:900}]){
   const page=await browser.newPage({viewport:{width:size.width,height:size.height}});page.setDefaultTimeout(12000);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   async function launch(game){
    await page.goto('http://127.0.0.1:8765/thinking-garden/',{waitUntil:'load'});
    await page.locator('[data-open="'+game+'"]').click();
    await page.locator('#introStart').click();
   }
   await launch('slowMemory');
   await page.locator('[data-slow="hide"]').click();
   await page.locator('[data-slow="show"]').click();
   await page.locator('[data-slow="hide"]').click();
   await page.locator('[data-slow="skip"]').click();
   let r=await page.evaluate(()=>state.slowLook.records[0]);
   assert.deepEqual([r.selfChecks,r.teacherCues,r.hint,r.first,r.final],[1,0,false,'미확인','미평가'],size.label+' voluntary recheck incorrectly counted as teacher guidance');
   await launch('slowName');
   await page.locator('[data-slow="ready"]').click();
   await page.locator('[data-slow="name-wrong"]').click();
   await page.locator('[data-slow="retryName"]').click();
   await page.locator('[data-slow="name-right"]').click();
   r=await page.evaluate(()=>state.slowLook.records[0]);
   assert.deepEqual([r.first,r.final,r.retries,r.selfChecks,r.teacherCues,r.hint],['X','O',1,0,0,false],size.label+' prompted retry was wrongly logged as an external cue');
   await launch('slowScan');
   await page.locator('.slow-task .slow-teacher-details summary').click();
   await page.locator('[data-slow="hint"]').click();
   await page.locator('[data-slow="hint"]').click();
   await page.locator('[data-slow="skip"]').click();
   r=await page.evaluate(()=>state.slowLook.records[0]);
   assert.deepEqual([r.selfChecks,r.teacherCues,r.hint],[0,2,true],size.label+' teacher guidance-button count not separated');
   await page.locator('[data-slow="next"]').click();
   await page.locator('#backHome').click();
   assert.deepEqual(errors,[],'unexpected browser exceptions');
   console.log('PASS '+size.label+' independent memory recheck, teacher-guidance button, prompted naming recovery');
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

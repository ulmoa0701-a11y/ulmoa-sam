const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const base=process.env.TEST_BASE_URL||'https://ulmoa0701-a11y.github.io/ulmoa-sam';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const width of [390,1280]){
   const context=await browser.newContext({viewport:{width,height:845}});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('requestfailed',r=>{if(r.url().includes('grade-play'))errors.push('request '+r.url()+': '+r.failure()?.errorText)});
   let response=await page.goto(base+'/math-garden/grade-play/?g=3&t=2&u=2&s=0',{waitUntil:'load',timeout:30000});
   assert(response?.ok(),width+' main page');
   await page.waitForSelector('.hands-shell',{timeout:15000});
   const ready=await page.evaluate(()=>({core:!!window.MoaHandsOnCore,ui:!!window.MoaHandsOn,app:!!window.MoaUnitApp,kind:document.querySelector('.hands-shell')?.dataset.kind,overflow:document.documentElement.scrollWidth-innerWidth}));
   assert(ready.core&&ready.ui&&ready.app,JSON.stringify(ready)+' missing public JS');
   assert(ready.kind==='circle','3-2 circle task not interactive: '+ready.kind);
   assert(ready.overflow<=3,width+' overflow '+ready.overflow);
   await page.locator('.hands-actions .hands-check').click();await page.locator('#next').click();
   const phase=await page.locator('.hands-shell').getAttribute('data-phase');
   assert(phase==='guided','not advanced from worked example');
   assert(await page.locator('.hands-actions .hands-help').count()===1,'helper not interactive');
   assert.equal(errors.length,0,errors.join('; '));
   await context.close();
   console.log('PUBLIC_MATH_PASS '+width);
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
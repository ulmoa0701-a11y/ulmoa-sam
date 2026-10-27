'use strict';
const fs=require('node:fs');
const {chromium}=require('playwright-core');
(async()=>{
 const out='qa/garden-choice-gallery-artifacts';fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const errors=[],failed=[];
 try{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push({where:'catalog',message:e.message}));
  page.on('response',r=>{if(r.status()>=400)failed.push({status:r.status(),url:r.url()})});
  await page.goto('https://ulmoa0701-a11y.github.io/ulmoa-sam/gardens/',{waitUntil:'load'});
  await page.locator('#gardenSearch').fill('꽃만');
  await page.locator('.play-card-enhanced[data-game="flower"] .play-preview-btn').click();
  const frame=await (await page.locator('#previewLive').elementHandle()).contentFrame();
  frame.on('pageerror',e=>errors.push({where:'game',message:e.message}));
  await frame.locator('#introStart').waitFor({state:'visible',timeout:30000});
  const snapshot=await frame.evaluate(()=>{
   const intro=document.querySelector('#introScreen');
   const start=document.querySelector('#introStart');
   const list=document.querySelector('#homeScreen');
   const style=e=>e?{display:getComputedStyle(e).display,visibility:getComputedStyle(e).visibility,opacity:getComputedStyle(e).opacity,rect:e.getBoundingClientRect().toJSON()}:null;
   return {url:location.href,title:document.title,readyState:document.readyState,introClass:intro?.className,intro:style(intro),start:style(start),homeClass:list?.className,home:style(list),bodyClass:document.body.className,styleSheets:[...document.styleSheets].map(x=>x.href)};
  });
  await page.screenshot({path:out+'/public-diagnostic.png',fullPage:false});
  const data={snapshot,errors,failed,iframeSrc:await page.locator('#previewLive').getAttribute('src')};
  fs.writeFileSync(out+'/public-diagnostic.json',JSON.stringify(data,null,2));
  console.log('PUBLIC_DIAGNOSTIC '+JSON.stringify(data));
  await context.close();
 }finally{await browser.close()}
})().catch(e=>{console.error('PUBLIC_DIAGNOSTIC_ERROR',e);process.exitCode=1});

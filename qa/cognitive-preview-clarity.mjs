import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
const exe=process.env.CHROME_BIN||'/usr/bin/google-chrome';
const browser=await chromium.launch({headless:true,executablePath:exe,args:['--no-sandbox','--disable-dev-shm-usage']});
const errs=[],reports=[];fs.mkdirSync('qa/cognitive-preview-screens',{recursive:true});
const must=(yes,message)=>{if(!yes)errs.push(message)};
for(const [type,width,height] of [['desktop',1366,900],['tablet',768,1000],['mobile',390,844],['small',360,740]]){
 const ctx=await browser.newContext({viewport:{width,height},isMobile:width<=390,hasTouch:width<=390});
 const page=await ctx.newPage(),jsErrors=[];page.on('pageerror',e=>jsErrors.push(e.message));
 const response=await page.goto(base+'/thinking-garden/',{waitUntil:'networkidle'});
 must(response?.ok(),type+' HTTP response');
 const cards=page.locator('#gardenGamePanel .library-card[data-open]');
 must(await cards.count()===26,type+' 26 games present');
 // Catalog decoration is added by a separate script; wait for its 26 final cards.
 await page.waitForFunction(() => document.querySelectorAll('#gardenGamePanel .card-shot-preview').length === 26, null, {timeout: 15000});
 must(await page.locator('#gardenGamePanel .card-shot-preview').count()===26,type+' 26 authentic previews present');
 must(await page.locator('#gardenGamePanel .card-shot-preview .cp-mission').count()===0,type+' old emoji mockups removed');
 const inspect=await page.locator('#gardenGamePanel .card-shot-preview').evaluateAll(async elements=>{
   return await Promise.all(elements.map(async el=>{
     const img=el.querySelector('.card-shot-screen img'),probe=new Image();
     const id=el.closest('[data-open]')?.dataset.open||'unknown';
     probe.src=img.src;
     let ok=false;try{await probe.decode();ok=probe.naturalWidth>100&&probe.naturalHeight>50}catch(_){}
     return {id,ok,src:img.getAttribute('src'),steps:el.querySelectorAll('.card-shot-steps>span:not(.card-shot-arrow),.card-shot-steps>strong').length,
       label:el.querySelector('.card-shot-mode')?.textContent||''};
   }));
 });
 must(inspect.length===26,type+' image count');
 must(inspect.every(x=>x.ok),type+' broken images '+inspect.filter(x=>!x.ok).map(x=>x.id).join(','));
 must(inspect.every(x=>x.steps===2&&x.label.length>1),type+' missing distinct action steps');
 const a=inspect.find(x=>x.id==='slowPlace'),b=inspect.find(x=>x.id==='slowBlock');
 must(a?.label!==b?.label,type+' positional vs rotation labels are distinct');
 must(a?.src?.includes('slowPlace-play.jpg')&&b?.src?.includes('slowBlock-play.jpg'),type+' screenshots map to respective games');
 const widthOk=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3);
 must(widthOk,type+' horizontal scrolling');
 const block=page.locator('#gardenGamePanel .library-card[data-open="slowBlock"]');
 const place=page.locator('#gardenGamePanel .library-card[data-open="slowPlace"]');
 if(type==='desktop'||type==='mobile'){
   await place.screenshot({path:'qa/cognitive-preview-screens/'+type+'-place.png'});
   await block.screenshot({path:'qa/cognitive-preview-screens/'+type+'-block.png'});
 }
 await block.click();
 must(await page.locator('#introScreen').isVisible(),type+' block game launches');
 must(jsErrors.length===0,type+' JS runtime errors: '+jsErrors.join('; '));
 reports.push({type,width,allImages:inspect.length,loaded:inspect.filter(x=>x.ok).length,gameOpened:true,horizontalOverflow:!widthOk,jsErrors});
 await ctx.close();
}
await browser.close();
console.log(JSON.stringify({reports,failures:errs},null,2));if(errs.length)process.exit(1);

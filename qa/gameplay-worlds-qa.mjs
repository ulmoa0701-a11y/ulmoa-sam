import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright-core');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
const ids=['slowScan','slowPlace','slowBlock','slowName','slowMemory','slowEveryday'];
const errors=[],reports=[];fs.mkdirSync('qa/gameplay-world-screens',{recursive:true});
const assert=(b,message)=>{if(!b)errors.push(message)};
for(const [profile,width] of [['desktop',1366],['mobile',390]]){
 const page=await browser.newPage({viewport:{width,height:860}});
 const exceptions=[];page.on('pageerror',e=>exceptions.push(e.message));
 for(const id of ids){
  await page.goto(base+'/thinking-garden/',{waitUntil:'domcontentloaded'});
  await page.locator('#gardenGamePanel .library-card[data-open="'+id+'"]').click();
  await page.locator('#introStart').click();
  const root=page.locator('#gameArea .slow-task.moa-scene-'+id);
  await root.waitFor({state:'visible',timeout:10000});
  assert(await root.locator('.moa-world-scene-head').count()===1,profile+'/'+id+' game narrative scene missing');
  assert(await root.locator('.moa-world-art').count()===1,profile+'/'+id+' user illustration missing');
  assert(await root.locator('.slow-teacher-details').count()===1,profile+'/'+id+' clinician controls disappeared');
  assert(await root.locator('[data-slow="pause"]').count()===1,profile+'/'+id+' pause support disappeared');
  if(id==='slowBlock'){
   assert(await root.locator('[data-block="rotate"]').count()===1,profile+'/'+id+' real rotation lost');
   assert(await root.locator('[data-block="undo"]').count()===1,profile+'/'+id+' real undo lost');
   await root.locator('[data-block="place"]').first().click();
   assert(await page.locator('#gameArea .brick-joined-horizontal').count()===2,
     profile+'/'+id+' long brick must render as one joined pair, not two independent squares');
  }else if(id==='slowMemory'){
   assert(await root.locator('.moa-world-meter:visible').count()===0,profile+'/'+id+' cue leaks memory');
   await root.locator('[data-slow="hide"]').click();
   const newRoot=page.locator('#gameArea .slow-task.moa-scene-slowMemory');
   await newRoot.locator('[data-slow="cell"]').first().click();
   assert(await newRoot.locator('.moa-world-meter:visible').count()===1,profile+'/'+id+' progress unavailable after concealment');
  }else if(id==='slowName'){
   assert(await root.locator('.slow-name-picture').count()===1,profile+'/'+id+' naming stimulus missing');
  }else{
   const button=root.locator('button[data-slow="cell"]').first();
   if(await button.count())await button.click();
  }
  if(id!=='slowName'){
   const counter=page.locator('#gameArea .moa-world-count').first();
   assert(await counter.count()===1,profile+'/'+id+' selection counter missing');
   const text=await counter.innerText();
   assert(/^\d+\s*\/\s*\d+$/.test(text),profile+'/'+id+' malformed counter '+text);
  }
  const fit=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3);
  assert(fit,profile+'/'+id+' horizontal scrolling');
  if(['slowPlace','slowBlock','slowMemory','slowName'].includes(id))
   await page.locator('#gameArea .slow-task').screenshot({path:'qa/gameplay-world-screens/'+profile+'-'+id+'.png'});
  reports.push({profile,id,world:true,mobileOverflow:!fit,exceptions:exceptions.slice()});
  exceptions.length=0;
 }
 await page.close();
}
await browser.close();
console.log(JSON.stringify({count:reports.length,reports,errors},null,2));if(errors.length)process.exit(1);

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
   const joined=await page.locator('#gameArea .brick-joined-horizontal').allTextContents();
   assert(joined.join('').split('🧱').length-1===1,
     profile+'/'+id+' a single connected brick is drawn as two separate objects');
  }else if(id==='slowMemory'){
   assert(await root.locator('.moa-world-meter:visible').count()===0,profile+'/'+id+' cue leaks memory');
   await root.locator('[data-slow="hide"]').click();
   const newRoot=page.locator('#gameArea .slow-task.moa-scene-slowMemory');
   await newRoot.locator('[data-slow="cell"]').first().click();
   // Visual counters refresh after the native click handler; wait for the
   // rendered response rather than reading the previous animation frame.
   await page.waitForFunction(()=>document.querySelector('#gameArea .moa-world-count')?.textContent?.trim()==='1');
   assert(await newRoot.locator('.moa-world-meter:visible').count()===1,profile+'/'+id+' progress unavailable after concealment');
   const recallLabel=await newRoot.locator('.moa-world-meter').innerText();
   assert(!recallLabel.includes('/'),profile+'/'+id+' target-count cue leaks during recall: '+recallLabel);
   assert(await newRoot.locator('.moa-world-count').innerText()==='1',profile+'/'+id+' selected count incorrect');
   assert(await newRoot.locator('.moa-world-rail:visible').count()===0,profile+'/'+id+' target-size rail leaks');
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
   assert(id==='slowMemory'?/^\d+$/.test(text):/^\d+\s*\/\s*\d+$/.test(text),
      profile+'/'+id+' malformed counter '+text);
  }
  // Verify true success and a non-success ending using real game controls.
  if(id==='slowPlace'){
   const samples=root.locator('.slow-map-pair > div:first-child .slow-board .slow-tile');
   const replies=root.locator('.slow-map-pair > div:nth-child(2) .slow-board button.slow-tile');
   for(let i=0;i<await samples.count();i++){
    const expected=(await samples.nth(i).getAttribute('class')).includes('shown');
    const pressed=await replies.nth(i).getAttribute('aria-pressed')==='true';
    if(expected!==pressed)await replies.nth(i).click();
   }
   await root.locator('[data-slow="check"]').click();
   await page.waitForTimeout(40);
   assert(await root.evaluate(el=>el.classList.contains('moa-scene-finished')),
     profile+'/'+id+' correct solution lacks completion styling');
   assert(await root.locator('.moa-world-ending').count()===1,profile+'/'+id+' correct solution lacks earned ending');
  }
  if(id==='slowScan'){
   await root.locator('[data-slow="skip"]').click();
   await page.waitForTimeout(40);
   assert(!await root.evaluate(el=>el.classList.contains('moa-scene-finished')),
     profile+'/'+id+' skipped attempt incorrectly celebrated');
   assert(await root.locator('.moa-world-ending').count()===0,
     profile+'/'+id+' skipped attempt shows success art');
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

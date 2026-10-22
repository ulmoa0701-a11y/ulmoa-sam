import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
const failures=[],results=[];
const check=(ok,msg)=>{if(!ok)failures.push(msg)};
fs.mkdirSync('qa/moa-missions-play-artifacts',{recursive:true});
for(const [mode,width] of [['mobile',390],['desktop',1366]]){
 for(const game of ['money','change','feel']){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  const page=await context.newPage();const faults=[];
  page.on('pageerror',e=>faults.push(e.message));
  await page.goto(base+'/thinking-garden/games/moa-missions/?game='+game,{waitUntil:'domcontentloaded',timeout:27000});
  if(game==='money')await page.locator('[data-level="normal"]').click();
  if(game==='change')await page.locator('[data-level="hard"]').click();
  await page.locator('#startGame').click();
  await page.locator('#playScreen:not([hidden])').waitFor();
  const voice=page.locator('#missionListen');
  check(await voice.isVisible(),mode+' '+game+' missing listening button');
  await voice.click();
  if(game==='money'){
   const pick=page.locator('[data-money="100"]');
   await pick.click();
   check((await page.locator('#cartSum').innerText()).includes('100'),mode+' tapped 100 not put in basket');
   check(await page.locator('.bag-money-piece').count()===1,mode+' money piece not interactive');
   await page.locator('.bag-money-piece').click();
   check(await page.locator('.bag-money-piece').count()===0,mode+' removed piece still in basket');
   await page.screenshot({path:'qa/moa-missions-play-artifacts/money-'+mode+'.png'});
  }
  if(game==='change'){
   await page.locator('[data-action="changed-go"]').click();
   check(await page.locator('.inventory-options .item-pick').count()>3,mode+' schoolbag item choices missing');
   const item=page.locator('.inventory-options .item-pick').first();
   await item.click();
   check(await page.locator('.assembled-cart .item-chip').count()===1,mode+' item did not enter backpack');
   await page.locator('.inventory-options .item-pick.added').first().click();
   check(await page.locator('.assembled-cart .item-chip').count()===0,mode+' item cannot be taken back out');
   await page.screenshot({path:'qa/moa-missions-play-artifacts/change-'+mode+'.png'});
  }
  if(game==='feel'){
   check(await page.locator('.story-stage .story-cast img').count()===1,mode+' story character art missing');
   await page.locator('[data-say-scene]').click();
   check(await page.locator('.emotion-options .choice').count()===3,mode+' emotion alternatives missing');
   await page.locator('.emotion-options .choice').first().click();
   check(await page.locator('.response-options .choice').count()===3,mode+' response stage missing');
   await page.locator('[data-say-scene]').click();
   await page.locator('.response-options .choice').first().click();
   check(await page.locator('.reflect-note').count()===1,mode+' nuanced reflection absent');
   check(await page.locator('[data-action="next"]').count()===1,mode+' no next scene action');
   await page.screenshot({path:'qa/moa-missions-play-artifacts/feel-'+mode+'.png'});
  }
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  check(overflow<=8,mode+' '+game+' horizontal overflow '+overflow);
  check(faults.length===0,mode+' '+game+' JS errors '+faults.join(','));
  results.push({mode,width,game});
  await context.close();
 }
}
await browser.close();
fs.writeFileSync('qa/moa-missions-play-artifacts/results.json',JSON.stringify({results,failures},null,2));
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log('PASS: mobile and desktop gameplay interactions in money, schoolbag and feelings');

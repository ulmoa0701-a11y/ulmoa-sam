import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
const errors=[],results=[];
const check=(ok,msg)=>{if(!ok)errors.push(msg)};
fs.mkdirSync('qa/native-scenes-screens',{recursive:true});
for(const [name,width] of [['pc',1366],['mobile',390]]){
 const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'});
 const page=await context.newPage();
 const faults=[];page.on('pageerror',e=>faults.push(e.message));
 async function open(id){
  await page.goto(base+'/thinking-garden/?game='+id,{waitUntil:'domcontentloaded'});
  await page.locator('#introStart').click();
  await page.locator('#gameScreen.active').waitFor({state:'visible'});
 }
 await open('sameShape');
 const shapeTarget=page.locator('.shape-target');
 const targetColor=await shapeTarget.evaluate(el=>getComputedStyle(el).color);
 const colors=await page.locator('.basic-choice').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).color));
 check(colors.every(color=>color===targetColor),name+' beginning shape game changes a non-target color');
 const shape=(await shapeTarget.innerText()).trim();
 await page.locator('.basic-choice[data-shape="'+shape+'"]').click();
 check(await page.locator('.shape-reunited').count()===1,name+' shape reunion is not tied to a correct match');
 await page.locator('.round-gate button').waitFor({state:'visible',timeout:4000});
 check(await page.locator('.round-gate button').count()===1,name+' shape completion does not advance');
 await page.screenshot({path:'qa/native-scenes-screens/'+name+'-shape.png'});
 await open('flower');
 await page.locator('.object-btn[data-good="1"]').first().click();
 check(await page.locator('.flower-picked').count()===1,name+' flower was not collected');
 check((await page.locator('#flowerCollected').innerText()).includes('1 /'),name+' flower progress did not increase');
 await page.screenshot({path:'qa/native-scenes-screens/'+name+'-flower.png'});
 await open('hide');
 await page.locator('.leaf-has-clue').first().click();
 check(await page.locator('.leaf-has-clue.opened .leaf-discovery').count()===1,name+' clue leaf does not reveal a friend');
 await open('path');
 await page.locator('.trail-node.ready').first().click();
 check((await page.locator('#pathStepCount').innerText()).startsWith('1 /'),name+' runner route failed to advance');
 await open('inside');
 const zone=page.locator('#insideZone');
 await zone.click({position:{x:5,y:5}});
 const placed=await zone.locator('i').first().evaluate(el=>{
  const rect=el.parentElement.getBoundingClientRect();
  return {left:parseFloat(el.style.left),top:parseFloat(el.style.top),width:rect.width,height:rect.height};
 });
 check(placed.left>=12&&placed.top>=12&&placed.left<=placed.width-12&&placed.top<=placed.height-12,
  name+' edge-positioned star escaped play fence '+JSON.stringify(placed));
 await open('targets');
 await page.locator('.wake-target:not(.wake-decoy)').first().click();
 check(await page.locator('.wake-target.awake').count()===1,name+' seed did not grow when selected');
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+4),name+' horizontal overflow');
 check(faults.length===0,name+' JavaScript exceptions '+faults.join(','));
 results.push({name,width,checked:['sameShape','flower','hide','path','inside','targets'],scriptErrors:faults});
 await context.close();
}
await browser.close();
console.log(JSON.stringify({results,errors},null,2));
if(errors.length)process.exit(1);

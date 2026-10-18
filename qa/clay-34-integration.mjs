import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[],results=[],checks=[];
function check(ok,detail){checks.push({ok:!!ok,detail});if(!ok)errors.push(detail)}
for(const [size,w,h] of [['desktop',1366,850],['tablet',768,1024],['mobile',390,844],['small',360,740]]){
 const context=await browser.newContext({viewport:{width:w,height:h},isMobile:w<=390,hasTouch:w<=390});
 const page=await context.newPage();
 const jsErrors=[];page.on('pageerror',err=>jsErrors.push(err.message));
 await page.goto(base+'/gardens/',{waitUntil:'networkidle'});
 check(await page.locator('.play-card-enhanced[data-game]').count()===34,size+': total 34 cards');
 check(await page.locator('.moa-clay-card-corner').count()===34,size+': every garden card has a clay companion');
 const img=await page.evaluate(async()=>{
  const element=document.querySelector('.moa-clay-card-corner');
  const style=getComputedStyle(element);
  const path=style.backgroundImage.slice(5,-2);
  const img=new Image();img.src=path;
  try{await img.decode();return {w:img.naturalWidth,h:img.naturalHeight,path}}catch(e){return {error:String(e),path}}
 });
 check(img.w===960&&img.h===960,size+': atlas 960x960 loaded '+JSON.stringify(img).slice(0,150));
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+3),size+': garden no page overflow');
 const toggle=page.locator('#gardenPictureMode');await toggle.click();
 check(await page.locator('.play-card-enhanced:visible').count()===34,size+': all 34 available in picture mode');
 await toggle.click();
 await page.goto(base+'/thinking-garden/',{waitUntil:'networkidle'});
 const num=await page.locator('#gardenGamePanel .library-card[data-open]').count();
 check(num>=24,size+': native games preserved '+num);
 check(await page.locator('#gardenGamePanel .moa-clay-library-badge').count()>=24,size+': native game cards illustrated');
 await page.locator('#gardenGamePanel .library-card[data-open="memory"]').first().click();
 check(await page.locator('#introScreen .moa-clay-intro-badge[data-clay-key="memory"]').count()===1,size+': mission intro companion');
 await page.locator('#introStart').click();
 check(await page.locator('#gameScreen .moa-clay-playing-badge[data-clay-key="memory"]').count()===1,size+': real game companion');
 for(const key of ['change','feel','money']){
  await page.goto(base+'/thinking-garden/games/moa-missions/?game='+key,{waitUntil:'domcontentloaded'});
  check(await page.locator('.mission-banner .moa-clay-mission-badge[data-clay-key="'+key+'"]').count()===1,size+': mission '+key+' intro');
 }
 await page.goto(base+'/thinking-garden/games/hand-mirror/',{waitUntil:'domcontentloaded'});
 check(await page.locator('#intro .moa-clay-hand-badge').count()===1,size+': hand-mirror');
 await page.goto(base+'/thinking-garden/games/rescue/',{waitUntil:'domcontentloaded'});
 check(await page.locator('.topbar .moa-clay-header-badge').count()===1,size+': rescue');
 await page.goto(base+'/thinking-garden/games/rhythm-touch/',{waitUntil:'domcontentloaded'});
 check(await page.locator('.heading .moa-clay-intro-badge').count()===1,size+': rhythm');
 await page.goto(base+'/thinking-garden/recorder/',{waitUntil:'domcontentloaded'});
 check(await page.locator('.rec-welcome .moa-clay-recorder-badge').count()===1,size+': recorder');
 await page.goto(base+'/breath-garden/',{waitUntil:'domcontentloaded'});
 check(await page.locator('.game-choice .moa-clay-breath-choice').count()===3,size+': all 3 breath choices');
 results.push({size,dimensions:[w,h],garden_cards:34,native_cards:num,atlas_size:[img.w,img.h],new_js_errors:jsErrors.slice(0,5)});
 await context.close();
}
await browser.close();
console.log(JSON.stringify({results,failures:errors,checks:checks.length},null,2));
if(errors.length)process.exit(1);

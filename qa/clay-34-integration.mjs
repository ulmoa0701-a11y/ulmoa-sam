import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const fs=require('node:fs');
fs.mkdirSync('qa/clay-34-artifacts',{recursive:true});
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
 // Exercise actual missing-screenshot state (some older game covers lack playable captures).
 const rescueMedia=page.locator('.play-card-enhanced[data-game="rescue"] .play-card-media');
 await rescueMedia.evaluate(el=>el.classList.add('no-real-shot'));
 await page.waitForTimeout(35);
 const fallback=await rescueMedia.evaluate(el=>{
   const img=el.querySelector('img.real-shot'),art=el.querySelector('.moa-clay-card-corner');
   const a=art.getBoundingClientRect(),m=el.getBoundingClientRect();
   return {imageHidden:getComputedStyle(img).opacity==='0',icon:a.width,centered:Math.abs((a.left+a.width/2)-(m.left+m.width/2))<4,
     caption:el.querySelector('.shot-caption')?.textContent};
 });
 check(fallback.imageHidden&&fallback.icon>=100&&fallback.centered&&fallback.caption==='게임 대표 그림',
   size+': missing screenshot gets large, truthful illustration '+JSON.stringify(fallback));
 await rescueMedia.evaluate(el=>el.classList.remove('no-real-shot'));
 const previewButton=page.locator('.play-card-enhanced[data-game="rescue"] .play-preview-btn');
 await previewButton.click();
 const previewVisual=page.locator('.preview-visual');
 check(await previewVisual.locator('.moa-clay-preview-art[data-clay-key="rescue"]').count()===1,
   size+': preview modal keeps matching artwork as fallback');
 await previewVisual.evaluate(el=>el.classList.add('no-real-shot'));
 check(await previewVisual.locator('.moa-clay-preview-art').evaluate(el=>getComputedStyle(el).display!=='none'),
   size+': preview modal never becomes blank');
 await page.locator('.preview-close').click();

 const img=await page.evaluate(async()=>{
  const element=document.querySelector('.moa-clay-card-corner');
  const style=getComputedStyle(element);
  const path=style.backgroundImage.slice(5,-2);
  const img=new Image();img.src=path;
  try{await img.decode();return {w:img.naturalWidth,h:img.naturalHeight,path}}catch(e){return {error:String(e),path}}
 });
 check(img.w===960&&img.h===960,size+': atlas 960x960 loaded '+JSON.stringify(img).slice(0,150));
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+3),size+': garden no page overflow');
 if(size==='desktop'||size==='mobile')await page.screenshot({path:'qa/clay-34-artifacts/garden-'+size+'.png',fullPage:true});
 const toggle=page.locator('#gardenPictureMode');await toggle.click();
 check(await page.locator('.play-card-enhanced:visible').count()===34,size+': all 34 available in picture mode');
 await toggle.click();
 await page.goto(base+'/thinking-garden/',{waitUntil:'networkidle'});
 const num=await page.locator('#gardenGamePanel .library-card[data-open]').count();
 check(num>=24,size+': native games preserved '+num);
 check(await page.locator('#gardenGamePanel .moa-clay-library-badge').count()>=24,size+': native game cards illustrated');
 const nativeCover=await page.locator('#gardenGamePanel .library-card[data-open="memory"]').evaluate(el=>{
    const img=el.querySelector('img'),art=el.querySelector('.moa-clay-library-badge');
    const bounds=art.getBoundingClientRect();
    return {originalHidden:getComputedStyle(img).display==='none',
      newWidth:Math.round(bounds.width),newVisible:getComputedStyle(art).display!=='none',
      leading:el.classList.contains('has-clay-leading-art')};
 });
 check(nativeCover.originalHidden&&nativeCover.newVisible&&nativeCover.leading&&nativeCover.newWidth>95,
   size+': native game uses real per-game character cover '+JSON.stringify(nativeCover));
 if(size==='desktop'||size==='mobile')await page.screenshot({path:'qa/clay-34-artifacts/native-art-'+size+'.png',fullPage:true});

 await page.locator('#gardenGamePanel .library-card[data-open="memory"]').first().click();
 check(await page.locator('#introScreen .moa-clay-intro-badge[data-clay-key="memory"]').count()===1,size+': mission intro companion');
 await page.locator('#introStart').click();
 check(await page.locator('#gameScreen .moa-clay-playing-badge[data-clay-key="memory"]').count()===1,size+': real game companion');
 if(size==='desktop'||size==='mobile')await page.screenshot({path:'qa/clay-34-artifacts/memory-game-'+size+'.png',fullPage:true});
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

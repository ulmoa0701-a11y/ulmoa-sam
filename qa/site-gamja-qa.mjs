import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const base='http://127.0.0.1:8765';
const out=path.resolve('qa/site-gamja-qa-artifacts');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({
  headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']
});
const plans=[
  {name:'mobile360',width:360,height:640,pages:['/','/thinking-garden/','/music-garden/','/notes/','/request/']},
  {name:'mobile390',width:390,height:844,pages:['/','/thinking-garden/','/music-garden/','/about/','/notes/','/materials/','/info/','/parents/','/request/','/brain-map/']},
  {name:'tablet768',width:768,height:1024,pages:['/','/thinking-garden/','/music-garden/','/materials/']},
  {name:'desktop1366',width:1366,height:768,pages:['/','/thinking-garden/','/music-garden/','/notes/','/brain-map/']},
  {name:'desktop1600',width:1600,height:900,pages:['/','/thinking-garden/','/music-garden/','/about/']}
];
// Legacy filename retained; this suite now guards approved readable editorial typography.
const results=[],failures=[];
const assert=(condition,msg)=>{if(!condition)failures.push(msg)};
for(const plan of plans){
 const context=await browser.newContext({viewport:{width:plan.width,height:plan.height},deviceScaleFactor:1});
 const page=await context.newPage();
 for(const p of plan.pages){
   const errors=[];
   const onError=e=>errors.push(e.message);
   page.on('pageerror',onError);
   let res;
   try{res=await page.goto(base+p,{waitUntil:'domcontentloaded',timeout:22000})}
   catch(e){failures.push(plan.name+': '+p+' page did not load '+e.message);continue}
   // The stylesheet is shared, but the exact same font also must load in pages that
   // did not previously import Google Fonts (the two standalone gardens).
   const reading=await page.evaluate(async()=>{
      await document.fonts.ready;
      const first=document.querySelector('h1, h2');
      const nav=document.querySelector('nav a, .category-tab, .garden-format-tabs button, .site-home');
      const b=document.body;
      const aboutParagraph=document.querySelector('.about-story .story-section p');
      const sizeOf=s=>{const e=document.querySelector(s);return e?parseFloat(getComputedStyle(e).fontSize):null};
      return {
       cssLoaded:!!document.querySelector('link[href*="habom-gamja-font.css"]'),
       bodyFont:getComputedStyle(b).fontFamily,
       aboutParagraphFont:aboutParagraph?getComputedStyle(aboutParagraph).fontFamily:null,
       aboutParagraphSize:aboutParagraph?parseFloat(getComputedStyle(aboutParagraph).fontSize):null,
       homeDoorSize:sizeOf('.garden-door strong'),
       homeFeatureCaptionSize:sizeOf('.desk-collage.featured-two .feature-card small'),
       homeShortcutTitleSize:sizeOf('.hb-shortcut-text b'),
       homeShortcutCaptionSize:sizeOf('.hb-shortcut-text small'),
       headingFont:first&&getComputedStyle(first).fontFamily,
       headingName:first?.textContent?.trim().slice(0,70),
       navFont:nav&&getComputedStyle(nav).fontFamily,
       readableTitleLoaded:[...document.fonts].some(f=>f.family.replaceAll('"','')==='Gowun Dodum'&&f.status==='loaded'),
       brainSubheadingFont:document.querySelector('.map-panel-heading h2')?
         getComputedStyle(document.querySelector('.map-panel-heading h2')).fontFamily:null,
       brainMaruLoaded:[...document.fonts].some(f=>f.family.replaceAll('"','')==='MaruBuriSemiBold'&&f.status==='loaded'),
       brainPenLoaded:[...document.fonts].some(f=>f.family.replaceAll('"','')==='Nanum Pen Script'&&f.status==='loaded'),
       viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,
       headerWidth:first?.scrollWidth,headerClientWidth:first?.clientWidth,
       resourceTabs:document.querySelectorAll('[data-garden-view]').length,
       gameCards:document.querySelectorAll('.library-card,.game-card').length,
       bodyHeight:document.documentElement.scrollHeight
      };
   });
   assert(res?.ok(),plan.name+' '+p+': HTTP failure');
   const isBrainMap=p==='/brain-map/';
   const isGarden=p==='/thinking-garden/'||p==='/music-garden/';
   // The brain map explicitly uses its own approved educational font hierarchy.
   // All other pages keep their existing shared readable-typography contract.
   if(isBrainMap){
     assert(!reading.cssLoaded,plan.name+' '+p+': unexpected global Gamja override on brain map');
     assert(reading.bodyFont.startsWith('"Pretendard Variable"'),plan.name+' '+p+': incorrect Pretendard body '+reading.bodyFont);
     assert(reading.headingFont?.includes('Nanum Pen Script'),plan.name+' '+p+': handwritten hero missing '+reading.headingFont);
     assert(reading.brainSubheadingFont?.includes('MaruBuriSemiBold'),plan.name+' '+p+': MaruBuri section heading missing');
     assert(reading.brainMaruLoaded,plan.name+' '+p+': MaruBuri SemiBold face not loaded');
     assert(reading.brainPenLoaded,plan.name+' '+p+': Nanum Pen Script face not loaded');
   }else{
     assert(reading.cssLoaded,plan.name+' '+p+': shared typography stylesheet absent');
     const expectedBody=isGarden?'"Gamja Flower"':'"Pretendard Variable"';
     assert(reading.bodyFont.startsWith(expectedBody),plan.name+' '+p+': incorrect body font '+reading.bodyFont);
     assert(reading.headingFont?.startsWith('"Gowun Dodum"'),plan.name+' '+p+': incorrect headline font '+reading.headingFont);
     assert(reading.readableTitleLoaded,plan.name+' '+p+': Gowun Dodum title face did not load');
   }
   if(reading.navFont)assert(reading.navFont.startsWith('"Pretendard Variable"'),plan.name+' '+p+': nav link inconsistent '+reading.navFont);
   if(p==='/'){
     assert(reading.homeDoorSize>=17,plan.name+': game door text too small '+reading.homeDoorSize);
     assert(reading.homeFeatureCaptionSize>=12,plan.name+': polaroid caption too small '+reading.homeFeatureCaptionSize);
     assert(reading.homeShortcutTitleSize>=17,plan.name+': shortcut title too small '+reading.homeShortcutTitleSize);
     assert(reading.homeShortcutCaptionSize>=14,plan.name+': shortcut caption too small '+reading.homeShortcutCaptionSize);
   }
   if(p==='/about/'){
     assert(reading.aboutParagraphFont?.startsWith('"Pretendard Variable"'),plan.name+' '+p+': about story body font inconsistent '+reading.aboutParagraphFont);
     assert(reading.aboutParagraphSize>=15,plan.name+' '+p+': about story copy too small '+reading.aboutParagraphSize);
   }
   if(['/', '/thinking-garden/','/music-garden/'].includes(p)){
     assert(reading.scrollWidth<=plan.width+3,plan.name+' '+p+': unexpected horizontal overflow '+reading.scrollWidth);
   }
   if(p==='/thinking-garden/')assert(reading.gameCards===13&&reading.resourceTabs===3,plan.name+': existing cognitive games/tabs changed');
   if(p==='/music-garden/')assert(reading.gameCards===2&&reading.resourceTabs===3,plan.name+': existing music games/tabs changed');
   if(plan.name==='mobile360'||(plan.name==='mobile390'&&['/','/notes/','/materials/','/thinking-garden/','/music-garden/'].includes(p))||(['desktop1366','desktop1600'].includes(plan.name)&&['/','/thinking-garden/','/music-garden/','/about/'].includes(p))){
    await page.screenshot({path:path.join(out,plan.name+'-'+(p==='/'?'home':p.split('/')[1])+'.png'),fullPage:true,timeout:12000});
   }
   assert(errors.length===0,plan.name+' '+p+': JavaScript errors '+errors.join('; '));
   results.push({viewport:plan.name,path:p,...reading,errors});
   page.off('pageerror',onError);
 }
 await context.close();
}
await browser.close();
const json={results,failures};
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(json,null,2));
console.log(JSON.stringify(json,null,2));
if(failures.length)process.exitCode=1;

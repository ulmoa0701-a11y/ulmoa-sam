import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const base='http://127.0.0.1:8765';
const out=path.resolve('qa/site-gamja-qa-artifacts'); // historic artifact path; tests now verify the 3-role typography
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
      const accent=document.querySelector('body.notebook-home .hero-copy h1 em, body.about-page .story-hello-bubble .story-hello, body.glossary-page .gcat-head h1');
      const featureTitle=document.querySelector('.desk-collage.featured-two .feature-card b');
      const aboutParagraph=document.querySelector('.about-story .story-section p');
      const homeTitle=document.querySelector('body.notebook-home .hero-copy h1');
      const homeIntro=document.querySelector('body.notebook-home .hero-lead');
      const homeLink=document.querySelector('body.notebook-home .hero-copy .maker-link');
      const sizeOf=s=>{const e=document.querySelector(s);return e?parseFloat(getComputedStyle(e).fontSize):null};
      return {
       cssLoaded:!!document.querySelector('link[href*="habom-gamja-font.css"]'),
       bodyFont:getComputedStyle(b).fontFamily,
       aboutParagraphFont:aboutParagraph?getComputedStyle(aboutParagraph).fontFamily:null,
       accentFont:accent?getComputedStyle(accent).fontFamily:null,
       featureTitleFont:featureTitle?getComputedStyle(featureTitle).fontFamily:null,
       aboutParagraphSize:aboutParagraph?parseFloat(getComputedStyle(aboutParagraph).fontSize):null,
       homeHeroText:homeTitle?.textContent?.replace(/\s+/g,'')||null,
       homeHeroClipped:homeTitle?homeTitle.scrollWidth>homeTitle.clientWidth+3:null,
       homeHeroIntroSize:homeIntro?parseFloat(getComputedStyle(homeIntro).fontSize):null,
       homeHeroKicker:document.querySelector('body.notebook-home .hero-overline')?.textContent?.trim()||null,
       homeHeroLinkText:homeLink?.textContent?.trim()||null,
       homeHeroLinkTarget:homeLink?.getAttribute('href')||null,
       homeHeroDuplicateDoors:document.querySelectorAll('body.notebook-home .hero-copy .garden-door').length,
       homeFeaturedGardens:document.querySelectorAll('body.notebook-home .desk-collage.featured-two > a.feature-card').length,
       homeMusicApprovedImage:!!document.querySelector('body.notebook-home .feature-music img[src*="moa-music-garden-approved.webp"]'),
       homeBreathShortcut:!!document.querySelector('body.notebook-home .hb-shortcuts a[href="breath-garden/"]'),
       homeSocialNavPosition:document.querySelector('body.notebook-home .note-footer .footer-social')?getComputedStyle(document.querySelector('body.notebook-home .note-footer .footer-social')).position:null,
       homeSocialLinks:document.querySelectorAll('body.notebook-home .note-footer .footer-social a').length,
       homeFeatureCaptionSize:sizeOf('.desk-collage.featured-two .feature-card small'),
       homeShortcutTitleSize:sizeOf('.hb-shortcut-text b'),
       homeShortcutCaptionSize:sizeOf('.hb-shortcut-text small'),
       headingFont:first&&getComputedStyle(first).fontFamily,
       headingName:first?.textContent?.trim().slice(0,70),
       navFont:nav&&getComputedStyle(nav).fontFamily,
       actualBodyFontLoaded:[...document.fonts].some(f=>f.family.replaceAll('"','')==='Pretendard Variable'&&f.status==='loaded'),
       actualHeadingFontLoaded:[...document.fonts].some(f=>f.family.replaceAll('"','')==='Habom MaruBuri'&&f.status==='loaded'),
       actualPenFontLoaded:[...document.fonts].some(f=>f.family.replaceAll('"','')==='Nanum Pen Script'&&f.status==='loaded'),
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
   if(p==='/brain-map/'){
     // Brain map has its own approved local font hierarchy, without the shared CSS.
     assert(!reading.cssLoaded,plan.name+' '+p+': brain map typography must remain independent');
     assert(reading.bodyFont.startsWith('"Pretendard Variable"'),plan.name+' '+p+': brain body incorrect '+reading.bodyFont);
     assert(reading.headingFont?.includes('Nanum Pen Script'),plan.name+' '+p+': brain point handwriting missing '+reading.headingFont);
     assert(reading.brainSubheadingFont?.includes('MaruBuriSemiBold'),plan.name+' '+p+': brain subheading font missing '+reading.brainSubheadingFont);
     assert(reading.brainMaruLoaded,plan.name+' '+p+': brain MaruBuri did not load');
     assert(reading.brainPenLoaded,plan.name+' '+p+': brain Nanum Pen did not load');
   }else{
     assert(reading.cssLoaded,plan.name+' '+p+': shared typography stylesheet absent');
     assert(reading.bodyFont.startsWith('"Pretendard Variable"'),plan.name+' '+p+': incorrect body font '+reading.bodyFont);
     if(p==='/notes/'){
       assert(reading.headingFont?.includes('Nanum Pen Script'),plan.name+' '+p+': 알아봄 one-line handwriting title missing '+reading.headingFont);
     }else{
       assert(reading.headingFont?.startsWith('"Habom MaruBuri"'),plan.name+' '+p+': incorrect headline font '+reading.headingFont);
     }
     assert(reading.actualBodyFontLoaded,plan.name+' '+p+': Pretendard Korean webfont did not load');
     assert(reading.actualHeadingFontLoaded,plan.name+' '+p+': MaruBuri SemiBold did not load');
   }
   if(reading.navFont)assert(reading.navFont.startsWith('"Pretendard Variable"'),plan.name+' '+p+': nav link inconsistent '+reading.navFont);
   if(['/', '/about/', '/notes/'].includes(p)){
      assert(reading.accentFont?.includes('Nanum Pen Script'),plan.name+' '+p+': point handwriting missing '+reading.accentFont);
      assert(reading.actualPenFontLoaded,plan.name+' '+p+': Nanum Pen Script did not load for accent');
   }
   if(p==='/'){
     assert(reading.featureTitleFont?.startsWith('"Habom MaruBuri"'),plan.name+': card title is not MaruBuri '+reading.featureTitleFont);
     assert(reading.homeHeroText==='해보고싶은게많아서,일단해봄.',plan.name+': homepage and About tagline mismatch '+reading.homeHeroText);
     assert(reading.homeHeroKicker==='만들면서 배우는 작은 작업실',plan.name+': headline eyebrow is missing');
     assert(reading.homeHeroIntroSize>=15,plan.name+': welcome explanation too small '+reading.homeHeroIntroSize);
     assert(!reading.homeHeroClipped,plan.name+': headline text is clipped');
     assert(reading.homeHeroLinkTarget==='about/' && reading.homeHeroLinkText?.includes('만든 이야기'),plan.name+': About story link missing');
     assert(reading.homeHeroDuplicateDoors===0,plan.name+': redundant garden menu still in hero');
     assert(reading.homeFeaturedGardens===2,plan.name+': approved garden cards changed '+reading.homeFeaturedGardens);
     assert(reading.homeMusicApprovedImage,plan.name+': approved music garden art missing');
     assert(reading.homeBreathShortcut,plan.name+': breathing garden lost homepage access');
     assert(reading.homeSocialNavPosition==='static',plan.name+': social links float over game buttons '+reading.homeSocialNavPosition);
     assert(reading.homeSocialLinks===4,plan.name+': original social destinations changed '+reading.homeSocialLinks);
     assert(reading.homeFeatureCaptionSize>=12,plan.name+': polaroid caption too small '+reading.homeFeatureCaptionSize);
     assert(reading.homeShortcutTitleSize>=16,plan.name+': shortcut title too small '+reading.homeShortcutTitleSize);
     assert(reading.homeShortcutCaptionSize>=13,plan.name+': shortcut caption too small '+reading.homeShortcutCaptionSize);
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
   if(plan.name==='mobile360'||(plan.name==='mobile390'&&['/','/notes/','/materials/','/thinking-garden/','/music-garden/','/brain-map/'].includes(p))||(['desktop1366','desktop1600'].includes(plan.name)&&['/','/thinking-garden/','/music-garden/','/about/'].includes(p))){
    const screenshot=await page.screenshot({path:path.join(out,plan.name+'-'+(p==='/'?'home':p.split('/')[1])+'.png'),fullPage:true,timeout:12000});
    const screenshotWidth=screenshot.readUInt32BE(16); // PNG IHDR width: catches absolute/flex overflow that scrollWidth misses
    assert(screenshotWidth<=plan.width+3,plan.name+' '+p+': screenshot wider than viewport '+screenshotWidth+' > '+plan.width);
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

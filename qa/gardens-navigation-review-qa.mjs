import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');

const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
const output='qa/gardens-navigation-review-artifacts';
const failures=[];
const check=(ok,msg)=>{if(!ok)failures.push(msg)};
fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({
 headless:true,
 executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
 args:['--no-sandbox']
});
const expected=['#cognitive','#thinking','#learning','#music','#heart'];
const report=[];
for(const width of [320,360,390,768,1366]){
 const context=await browser.newContext({viewport:{width,height:width<=390?844:900},deviceScaleFactor:1});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto(base+'/gardens/',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForTimeout(550);
 await page.evaluate(()=>document.fonts.ready);
 const stats=await page.evaluate(()=>{
  const rect=sel=>{
   const element=document.querySelector(sel);
   if(!element)return null;
   const r=element.getBoundingClientRect();
   return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};
  };
  const nav=document.querySelector('.garden-jumps');
  const links=[...nav.querySelectorAll('a.garden-jump')];
  const h1=document.querySelector('.garden-hero h1');
  const image=document.querySelector('.garden-hero .moa-page-guide__portrait');
  const loadedStyle=[...document.querySelectorAll('link[rel="stylesheet"]')].map(x=>x.getAttribute('href'));
  return {
   overflow:document.documentElement.scrollWidth-innerWidth,
   nav:rect('.garden-jumps'),
   links:links.map(a=>({
    href:a.getAttribute('href'),
    title:a.querySelector('strong')?.textContent,
    text:a.querySelector('small')?.textContent,
    size:(()=>{const r=a.getBoundingClientRect();return {width:r.width,height:r.height,x:r.x}})(),
    style:{borderRadius:getComputedStyle(a).borderRadius,background:getComputedStyle(a).backgroundColor}
   })),
   colCount:getComputedStyle(nav).gridTemplateColumns.split(' ').length,
   hero:rect('.garden-hero'),title:rect('.garden-hero h1'),image:rect('.garden-hero .moa-page-guide__portrait'),
   headerTitle:h1?.textContent,
   searchInput:!!document.querySelector('#gardenSearch'),
   searchPanel:rect('.garden-search-panel'),
   pictureToggle:rect('#gardenPictureMode'),
   count:document.querySelectorAll('.play-card-enhanced').length,
   sections:document.querySelectorAll('.garden-section').length,
   activeImages:[...document.querySelectorAll('.garden-hero img')].map(img=>img.currentSrc),
   currentCSS:loadedStyle.some(s=>s.includes('navigation-review.css')),
   rejectedMapCSS:loadedStyle.some(s=>s.includes('story-map.css')),
  };
 });
 report.push({width,...stats});
 check(response?.ok(),width+': page request failed');
 check(stats.currentCSS&&!stats.rejectedMapCSS,width+': review CSS absent or rejected map CSS active');
 check(stats.count===34&&stats.sections===5,width+': game list or garden sections changed');
 check(stats.links.length===5&&stats.links.map(x=>x.href).join('|')===expected.join('|'),width+': original garden anchors changed');
 check(stats.links.every(x=>x.size.height>=44&&x.size.width>=44),width+': garden target too small');
 check(stats.links.every(x=>x.title&&x.text),width+': garden title or description missing');
 check(stats.links.every(x=>x.style.borderRadius==='0px'),width+': rejected box-like garden cards remain');
 check(stats.colCount===(width<=700?2:5),width+': wrong garden directory column count '+stats.colCount);
 check(stats.overflow<=3,width+': horizontal overflow '+stats.overflow);
 check(stats.hero&&stats.hero.height<(width<=700?230:175),width+': introductory hero too tall '+stats.hero?.height);
 check(stats.image&&stats.image.height>0,width+': approved Moa character unexpectedly hidden');
 check(stats.searchInput&&stats.pictureToggle,width+': search or picture mode missing');
 check(errors.length===0,width+': JS errors: '+errors.join(' / '));
 await page.screenshot({path:output+'/first-viewport-'+width+'.png',animations:'disabled'});
 await page.locator('.garden-hero').screenshot({path:output+'/hero-'+width+'.png',animations:'disabled'});
 await page.locator('.garden-jumps').screenshot({path:output+'/directory-'+width+'.png',animations:'disabled'});
 if(width===390){
  await page.locator('#gardenSearch').fill('돈 계산');
  const moneyCount=await page.locator('#learning .play-card-enhanced:not([hidden])').count();
  check(moneyCount>=1,'390: search should find money game');
  await page.locator('#gardenSearchClear').click();
  check(await page.locator('#cognitive').isVisible(),'390: clearing search should restore cognitive garden');
  const toggle=page.locator('#gardenPictureMode');
  await toggle.click();
  check(await toggle.getAttribute('aria-pressed')==='true','390: picture mode cannot be activated');
  await toggle.click();
  check(await toggle.getAttribute('aria-pressed')==='false','390: picture mode cannot be deactivated');
  await page.locator('.garden-jumps a[href="#thinking"]').click();
  check(new URL(page.url()).hash==='#thinking','390: thinking garden navigation broken');
  check(await page.locator('#thinking .play-start-btn').count()===3,'390: thinking garden game count changed');
 }
 await context.close();
}
await browser.close();
fs.writeFileSync(output+'/report.json',JSON.stringify({passed:failures.length===0,failures,report},null,2));
if(failures.length){
 console.error('GARDEN REVIEW QA FAILED: '+JSON.stringify(failures,null,2));
 process.exit(1);
}
console.log('PASS: garden navigation layout, 34 games, search, picture mode and 320/360/390/768/1366 screenshots.');

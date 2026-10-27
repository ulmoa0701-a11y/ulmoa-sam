import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const origin='http://127.0.0.1:8765';
const dir=path.resolve('qa/launch-readiness-artifacts');
fs.mkdirSync(dir,{recursive:true});
const failures=[],results=[];
const check=(condition,message)=>{if(!condition)failures.push(message)};
const browser=await chromium.launch({
 headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
 args:['--no-sandbox']
});
for(const [label,width,height] of [
 ['mobile360',360,640],['mobile390',390,844],
 ['tablet768',768,1024],['desktop1366',1366,768],['desktop1600',1600,900]
]){
 const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
 const page=await ctx.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  const home=await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:25000});
  check(home?.ok(),label+': homepage HTTP failure');
  const state=await page.evaluate(()=>{
    const links=[...document.querySelectorAll('.hb-shortcut-grid>a')];
    return {
      title:document.querySelector('.hero-copy h1')?.textContent?.replace(/\s+/g,'').trim(),
      metaRobots:document.querySelector('meta[name="robots"]')?.content,
      ogTitle:document.querySelector('meta[property="og:title"]')?.content,
      ogDescription:document.querySelector('meta[property="og:description"]')?.content,
      ogImage:document.querySelector('meta[property="og:image"]')?.content,
      primary:links.filter(x=>x.classList.contains('hb-shortcut-primary')).map(x=>x.getAttribute('href')),
      shortcuts:links.map(x=>x.getAttribute('href')),
      featured:[...document.querySelectorAll('.desk-collage.featured-two>a.feature-card')].map(x=>x.getAttribute('href')),
      approvedMusic:!!document.querySelector('.feature-music img[src*="moa-music-garden-approved.webp"]'),
      scrollWidth:document.documentElement.scrollWidth,
      navLabels:[...document.querySelectorAll('.note-nav a')].map(x=>x.textContent.trim()),
      searchField:!!document.querySelector('#toolSearch'),
      socialOverlay:document.querySelector('.note-footer .footer-social')
        ?getComputedStyle(document.querySelector('.note-footer .footer-social')).position:null
    };
  });
  check(state.title==='해보고싶은게많아서,일단해봄.',label+': title mismatch '+state.title);
  check(state.metaRobots?.includes('noindex'),label+': index enabled before privacy gate');
  check(!!state.ogTitle&&!!state.ogDescription&&state.ogImage?.startsWith('https://'),
    label+': social preview metadata missing');
  check(state.shortcuts.length===9 && new Set(state.shortcuts).size===9,label+': 9 distinct shortcut destinations are not preserved');
  check(state.primary.join('|')==='gardens/#cognitive|materials/|notes/',
    label+': game/material/learn first-visit order differs '+state.primary.join('|'));
  check(['music-garden/','gardens/#heart','brain-map/','parents/','support-first/','request/'].every(h=>state.shortcuts.includes(h)),
    label+': a secondary shortcut disappeared');
  check(state.featured.join('|')==='gardens/#cognitive|music-garden/'&&state.approvedMusic,
    label+': approved featured garden art or routes changed');
  check(state.scrollWidth<=width+3,label+': horizontal scrolling '+state.scrollWidth);
  check(state.socialOverlay==='static',label+': social bar covers homepage content');
  for(const href of state.shortcuts){
    const response=await page.request.get(origin+'/'+href);
    check(response.status()===200,label+': shortcut HTTP '+response.status()+' '+href);
  }
  await page.locator('#toolSearch').fill('하트악보');
  await page.locator('#mainSearch button[type="submit"]').click();
  check((await page.locator('#resultCount').textContent()).trim()==='1개',
    label+': homepage search result count did not filter correctly');
  await page.locator('#toolSearch').fill('');
  check((await page.locator('#resultCount').textContent()).trim()==='3개',
    label+': clearing search did not restore all tool cards');
  // The search button scrolls the page to #made. Reset before full-page
  // capture so a sticky header is not baked into the middle of the screenshot.
  await page.evaluate(()=>{window.scrollTo({top:0,left:0,behavior:'instant'});});
  await page.waitForTimeout(450);
  await page.screenshot({path:path.join(dir,label+'-home.png'),fullPage:true,timeout:18000});
  const community=await page.goto(origin+'/request/',{waitUntil:'domcontentloaded',timeout:25000});
  check(community?.ok(),label+': request page missing');
  const policy=await page.evaluate(()=>({
    robots:document.querySelector('meta[name="robots"]')?.content,
    notice:[...document.querySelectorAll('.community-provider-note')].map(x=>x.textContent.trim()),
    isPublic:!document.querySelector('#publicPostPanel')?.hidden,
    googleSrc:document.querySelector('.community-iframe')?.getAttribute('src')||'',
    hasJotformPrivacyLink:!!document.querySelector('.community-provider-note a[href="https://www.jotform.com/privacy/"]')
  }));
  check(policy.robots?.includes('noindex'),label+': private submission page unexpectedly indexable');
  check(policy.notice.length===2&&policy.notice[0].includes('Google Apps Script')&&
    policy.notice[1].includes('Jotform'),label+': provider disclosure not visible');
  check(policy.googleSrc.startsWith('https://script.google.com/macros/'),
    label+': public board iframe is not connected');
  check(policy.isPublic&&policy.hasJotformPrivacyLink,label+': privacy link/public tab not shown');
  await page.locator('#privatePostTab').click();
  const priv=await page.evaluate(()=>({
    selected:document.querySelector('#privatePostTab')?.getAttribute('aria-selected'),
    hidden:document.querySelector('#privatePostPanel')?.hidden,
    publicHidden:document.querySelector('#publicPostPanel')?.hidden,
    src:document.querySelector('#habomPrivateForm')?.getAttribute('src')||''
  }));
  check(priv.selected==='true'&&!priv.hidden&&priv.publicHidden&&
    priv.src.startsWith('https://form.jotform.com/'),label+': private tab form not loaded');
  await page.locator('#publicPostTab').click();
  check(await page.locator('#publicPostPanel').isVisible(),label+': return to public board failed');
  if(label==='mobile390'||label==='desktop1366'){
    await page.screenshot({path:path.join(dir,label+'-request.png'),fullPage:true,timeout:18000});
  }
  check(errors.length===0,label+': JavaScript page errors '+errors.join(' / '));
  results.push({viewport:label,width,height,home:state,request:policy,privateTab:priv,pageErrors:errors});
 }catch(error){failures.push(label+': '+String(error?.stack||error));}
 await ctx.close();
}
await browser.close();
const report={results,failures,summary:{testedViewports:results.length,failedChecks:failures.length}};
fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report.summary));
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}

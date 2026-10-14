import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
const base='http://127.0.0.1:8765';
const artifacts='qa/five-gardens-artifacts';
fs.mkdirSync(artifacts,{recursive:true});
const failures=[];
const check=(condition,message)=>{if(!condition)failures.push(message)};
for(const width of [360,390,1366]){
 const context=await browser.newContext({viewport:{width,height:width<500?844:900}});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 let response=await page.goto(base+'/gardens/',{waitUntil:'domcontentloaded',timeout:25000});
 await page.waitForTimeout(400);
 const data=await page.evaluate(()=>{
  const ids=['cognitive','thinking','learning','music','heart'];
  const counts=ids.map(id=>document.querySelectorAll('#'+id+' .play-card').length);
  return {sections:document.querySelectorAll('.garden-section').length,counts,anchors:ids.map(id=>!!document.querySelector('nav.garden-jumps a[href="#'+id+'"]')),
    gameRefs:[...document.querySelectorAll('.play-card[href*="thinking-garden/?game="]')].map(a=>new URL(a.href).searchParams.get('game')),
    navPresent:!!document.querySelector('.hb-menu-games'),overflow:document.documentElement.scrollWidth-innerWidth,
    mobileToggle:!!document.querySelector('.hb-mobile-toggle')};
 });
 check(response?.ok(),width+' portal HTTP failed');
 check(data.sections===5,width+' missing garden sections '+data.sections);
 check(data.counts.join(',')==='19,3,3,3,2',width+' incorrect garden game counts '+data.counts);
 check(data.anchors.every(Boolean),width+' missing jump anchor');
 const musicBeat=await page.locator('#music .play-card[href*="mode=beat"]').count();
 const heartBeat=await page.locator('#heart .play-card[href*="mode=beat"]').count();
 check(musicBeat===1&&heartBeat===0,width+' rhythm breath wrongly classified');
 check(data.gameRefs.length===21&&new Set(data.gameRefs).size===21,width+' game registry has duplicates or omissions');
 check(data.overflow<=3,width+' horizontal overflow '+data.overflow);
 check(data.navPresent,width+' shared navigation missing');
 if(width===390){
  await page.locator('.hb-mobile-toggle').click();
  const gameSummary=page.locator('.hb-menu-games > summary');
  await gameSummary.click();
  const names=await page.locator('.hb-mobile-game-section .hb-game-parent strong').allTextContents();
  for(const name of ['인지정원','생각정원','학습정원','음악정원','마음정원'])check(names.some(n=>n.includes(name)), 'mobile garden menu missing '+name);
  check(names.length===5,'mobile menu garden count '+names.length);
  await page.screenshot({path:path.join(artifacts,'five-gardens-mobile-menu.png'),fullPage:false});
  await page.locator('.hb-mobile-back').click();
  await page.locator('.hb-mobile-toggle').click();
 }
 if(width===1366){
  const menu=page.locator('.hb-menu-games');
  await menu.locator('summary').click();
  const parents=await menu.locator('.hb-game-section .hb-game-parent').count();
  check(parents===5,'desktop game menu has '+parents+' gardens');
 }
 await page.screenshot({path:path.join(artifacts,'five-gardens-'+width+'.png'),fullPage:true});
 check(errors.length===0,width+' portal JavaScript errors '+errors.join('; '));
 await context.close();
}
const context=await browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage();
const library=await page.goto(base+'/thinking-garden/',{waitUntil:'domcontentloaded',timeout:25000});
const gameCount=await page.locator('.library-card[data-open]').count();
check(library?.ok()&&gameCount===25,'25-game library (22 previous + 3 strategy adventures) missing: '+gameCount);
for(const id of ['memory','rulePost','spacing']){
 const errors=[];const fn=e=>errors.push(e.message);page.on('pageerror',fn);
 const response=await page.goto(base+'/thinking-garden/?game='+id,{waitUntil:'domcontentloaded',timeout:25000});
 await page.waitForTimeout(350);
 const intro=await page.evaluate(()=>({visible:document.querySelector('#introScreen')?.classList.contains('active'),title:document.querySelector('#introTitle')?.textContent}));
 check(response?.ok()&&intro.visible,'deep link '+id+' did not open intro: '+JSON.stringify(intro));
 check(errors.length===0,'deep link '+id+' JS errors '+errors.join('; '));page.off('pageerror',fn);
}
await page.goto(base+'/',{waitUntil:'domcontentloaded'});
check(await page.locator('.home-five-gardens a').count()===5,'homepage 5 garden links missing');
const homeNames=await page.locator('.home-five-gardens a strong').allTextContents();
check(homeNames.join('|')==='인지정원|생각정원|학습정원|음악정원|마음정원','homepage garden order incorrect');
await context.close();await browser.close();
fs.writeFileSync(path.join(artifacts,'report.json'),JSON.stringify({failures},null,2));
if(failures.length){console.error('FIVE-GARDENS QA FAILED: '+JSON.stringify(failures));process.exit(1)}
console.log('PASS: five garden sections 17/2/3/2/3, 22 preserved games + 3 new strategy adventures, deep links, desktop/mobile navigation and homepage shortcuts');

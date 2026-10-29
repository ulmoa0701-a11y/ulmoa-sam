import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',args:['--no-sandbox']});
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
const out='qa/five-gardens-map-artifacts';
fs.mkdirSync(out,{recursive:true});
const failures=[];
const assert=(ok,msg)=>{if(!ok)failures.push(msg)};
const paths=['cognitive','thinking','learning','music','heart'];
for(const width of [320,360,390,768,1366]){
 const context=await browser.newContext({viewport:{width,height:width<700?880:900},deviceScaleFactor:1});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const res=await page.goto(base+'/gardens/',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForTimeout(650);
 const map=page.locator('.garden-story-map');
 assert(res?.ok(),width+' gardens page HTTP error');
 assert(await map.count()===1,width+' exploration map missing');
 const snapshot=await page.evaluate(()=>{
  const n=document.querySelector('.garden-story-map');
  const rect=n.getBoundingClientRect();
  const links=[...n.querySelectorAll('.garden-jump')].map(a=>{
   const r=a.getBoundingClientRect();
   return {href:a.getAttribute('href'),name:a.querySelector('strong')?.textContent,
    subtitle:a.querySelector('small')?.textContent,center:[r.x+r.width/2,r.y+r.height/2],
    within:r.left>=rect.left-2&&r.right<=rect.right+2&&r.top>=rect.top-2&&r.bottom<=rect.bottom+2,
    minTouch:r.width>=44&&r.height>=44};
  });
  const style=getComputedStyle(n);
  return {width:rect.width,height:rect.height,
   bg:style.backgroundImage,overflow:document.documentElement.scrollWidth-innerWidth,
   links,games:document.querySelectorAll('.play-card-enhanced').length,
   oldLinks:document.querySelectorAll('nav.garden-jumps a').length};
 });
 assert(snapshot.width>0&&snapshot.height>0,width+' missing map dimensions');
 assert(snapshot.links.length===5&&snapshot.links.every(a=>a.within&&a.minTouch),width+' map hotspots off-screen or undersized '+JSON.stringify(snapshot.links));
 assert(snapshot.links.map(a=>a.href).join('|')===paths.map(x=>'#'+x).join('|'),width+' original garden anchors changed');
 assert(snapshot.links.every(a=>a.name&&a.subtitle),width+' sign has missing readable labels');
 assert(snapshot.bg.includes(width<=700?'map-portrait.svg':'map-landscape.svg'),width+' wrong map variant '+snapshot.bg);
 assert(snapshot.overflow<=3,width+' horizontal overflow '+snapshot.overflow);
 assert(snapshot.games===34,width+' 34 games must remain accessible; got '+snapshot.games);
 await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:out+'/first-screen-'+width+'.png'});
 await map.screenshot({path:out+'/map-'+width+'.png'});
 if(width===390){
  const heart=page.locator('nav.garden-story-map a[href="#heart"]');
  await heart.click();
  await page.waitForTimeout(350);
  assert(new URL(page.url()).hash==='#heart','map heart garden navigation broken');
  assert(await page.locator('#heart .play-start-btn').count()===3,'heart garden games changed');
 }
 const artName=width<=700?'portrait':'landscape';
 const art=await page.evaluate(async filename=>{
  const res=await fetch(filename);const txt=await res.text();
  const doc=new DOMParser().parseFromString(txt,'image/svg+xml');
  return {ok:res.ok,svg:doc.documentElement.localName==='svg',errors:doc.getElementsByTagName('parsererror').length,bytes:txt.length};
 },'map-'+artName+'.svg');
 assert(art.ok&&art.svg&&art.errors===0&&art.bytes>3000,width+' map SVG malformed '+JSON.stringify(art));
 assert(errors.length===0,width+' JS errors: '+errors.join(' / '));
 await context.close();
}
await browser.close();
fs.writeFileSync(out+'/report.json',JSON.stringify({failures,widths:[320,360,390,768,1366],mapLinks:5,preservedGames:34},null,2));
if(failures.length){console.error('STORY MAP QA FAILED:',failures);process.exit(1)}
console.log('PASS: responsive 320/360/390/768/1366 illustrated map, accessible five routes, preserved 34 games and no overflow');

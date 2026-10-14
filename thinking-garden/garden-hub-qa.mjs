import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const base='http://127.0.0.1:8765';
const out=path.resolve('thinking-garden/games/rhythm-touch/qa-artifacts');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
const failures=[],results=[];
function check(value,message){if(!value)failures.push(message)}
for(const [name,w,h] of [['desktop1600',1600,900],['desktop1366',1366,768],['mobile390',390,844],['mobile360',360,640],['tablet768',768,1024]]){
 const context=await browser.newContext({viewport:{width:w,height:h},isMobile:w<=700,hasTouch:w<=700});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const head=await page.goto(base+'/thinking-garden/',{waitUntil:'networkidle'});
 check(head.ok(),name+': thinking garden HTTP error');
 check(await page.locator('#gardenGamePanel .library-card').count()===14 && await page.locator('#gardenGamePanel .library-card[data-open]:not([data-open="slowLook"])').count()===13 && await page.locator('#gardenGamePanel .library-card[data-open="slowLook"]').count()===1,name+': original 13 games must remain alongside expedition');
 check(await page.locator('[data-garden-view]').count()===3,name+': cognitive views not found');
 check(await page.locator('#gardenGamePanel').isVisible(),name+': cognitive games not default');
 await page.locator('.category-tab[data-category="visual"]').click();
 check(await page.locator('#gardenGamePanel .library-card:visible').count()===5,name+': visual attention filter wrong');
 await page.locator('[data-garden-view="materials"]').click();
 const visualPdf=page.locator('#gardenResourceCards a[href*="/materials/#cognitiveShelf"]');
 check(await visualPdf.count()>=1,name+': visual attention resource shelf missing');
 check(await page.locator('#gardenGamePanel').isHidden()&&await page.locator('#gardenResourcePanel').isVisible(),name+': cognitive resource content did not replace game grid');
 await page.screenshot({path:out+'/'+name+'-cognitive-materials.png',fullPage:true});
 await page.locator('[data-garden-view="learn"]').click();
 check(await page.locator('#gardenResourceCards a[href*="/notes/#memo-attention-types"]').count()===1,name+': explanation not topic-specific');
 check(await page.locator('#gardenResourceCards a[href*="/notes/#memo-visual"]').count()===1,name+': visual perception explanation absent');
 await page.locator('.category-tab[data-category="memory"]').click();
 check(await page.locator('#gardenResourceCards a[href*="/notes/#memo-working-memory"]').count()===1,name+': memory topic did not update explanation');
 await page.locator('.category-tab[data-category="literacy"]').click();
 check(await page.locator('#gardenResourceCards a[href*="/notes/#memo-reading-fluency"]').count()===1,name+': reading-learning source missing');
 await page.locator('.category-tab[data-category="language"]').click();
 await page.locator('[data-garden-view="games"]').click();
 check(await page.locator('[data-garden-view="learn"]').getAttribute('aria-selected')==='true',name+': category with zero games should open existing information');
 check(await page.locator('#gardenResourceCards a[href*="/notes/#memo-receptive-expressive"]').count()===1,name+': language resource missing');
 await page.locator('.category-tab[data-category="visual"]').click();
 await page.locator('[data-garden-view="games"]').click();
 check(await page.locator('#gardenGamePanel .library-card:visible').count()===5,name+': game view not recovered after resources');
 check(await page.locator('.moa-related-links a[href="../materials/#socialShelf"]').count()===1,name+': social resources disappeared');
 const newLink=page.locator('[data-garden-view="materials"]');
 await newLink.focus();
 check(await newLink.evaluate(x=>document.activeElement===x),name+': resource tabs not keyboard focusable');
 await page.goto(base+'/thinking-garden/?category=visual&view=learn',{waitUntil:'networkidle'});
 check(await page.locator('.category-tab[data-category="visual"].active').count()===1&&await page.locator('#gardenResourcePanel').isVisible(),name+': shared topic/view deep link does not restore UI');
 await page.goto(base+'/music-garden/',{waitUntil:'networkidle'});
 check(await page.locator('#gardenGamePanel .game-card').count()===2,name+': original music games missing');
 check(await page.locator('[data-garden-topic]').count()>=6,name+': music topic filters missing');
 await page.locator('button[data-garden-topic="notation"]').click();
 check(await page.locator('[data-garden-view="materials"]').getAttribute('aria-selected')==='true',name+': notation without dedicated game must show real scores');
 check(await page.locator('#gardenResourceCards a[href$="/heart-score/"]').count()===1,name+': Heart Score source missing');
 check(await page.locator('#gardenResourceCards a[href*="twinkle_landscape.pdf"]').count()===1,name+': printable note score missing');
 await page.screenshot({path:out+'/'+name+'-music-scores.png',fullPage:true});
 await page.locator('[data-garden-view="learn"]').click();
 check(await page.locator('#gardenResourceCards').innerText().then(t=>t.includes('2/4')&&t.includes('4/4')),name+': music learning basics missing');
 await page.locator('button[data-garden-topic="recorder"]').click();
 check(await page.locator('#gardenResourceCards').innerText().then(t=>t.includes('운지')),name+': recorder information not filtered');
 await page.locator('[data-garden-view="games"]').click();
 check(await page.locator('.game-card:visible').count()===1&&await page.locator('.recorder-card:visible').count()===1,name+': recorder game link hidden or wrong');
 await page.locator('button[data-garden-topic="rhythm"]').click();
 check(await page.locator('.game-card:visible').count()===1&&await page.locator('.rhythm-card:visible').count()===1,name+': rhythm game link hidden or wrong');
 await page.goto(base+'/music-garden/?topic=notation&view=learn',{waitUntil:'networkidle'});
 check(await page.locator('[data-garden-topic="notation"].active').count()===1&&await page.locator('[data-garden-view="learn"].active').count()===1,name+': music deep links not respected');
 const layout=await page.evaluate(()=>{
  const cards=[...document.querySelectorAll('.moa-resource-card')].map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height}});
  return {scrollWidth:document.documentElement.scrollWidth,viewWidth:innerWidth,cards};
 });
 check(layout.scrollWidth<=w+2&&layout.cards.every(x=>x.left>=-1&&x.right<=w+2&&x.width>=130),name+': mobile panels overflow '+JSON.stringify(layout));
 check(!errors.length,name+': JavaScript errors '+errors.join(';'));
 results.push({name,viewport:[w,h],errors,renderedResources:layout.cards.length,overflow:layout.scrollWidth-w});
 await context.close();
}
const c=await browser.newContext();
for(const url of [
  '/materials/heart-score/twinkle_landscape.pdf',
  '/materials/heart-score/sixteenth-rhythm_landscape.pdf',
  '/materials/heart-score/dotted-rhythm_landscape.pdf'
]){
 const r=await c.request.get(base+url);
 check(r.ok()&&(r.headers()['content-type']||'').includes('pdf'),'Material PDF missing: '+url+' status '+r.status());
}
const notes=await c.newPage();await notes.goto(base+'/notes/',{waitUntil:'domcontentloaded'});
for(const id of ['memo-attention-types','memo-visual','memo-working-memory','memo-receptive-expressive','memo-reading-fluency','memo-visuospatial-working-memory']){
 check(await notes.locator('#'+id).count()===1,'Broken glossary anchor '+id);
}
await c.close();
await browser.close();
const summary={results,failures};
fs.writeFileSync(path.join(out,'garden-hub-qa.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
if(failures.length)process.exitCode=1;

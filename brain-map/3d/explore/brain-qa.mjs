import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const BASE=process.env.BRAIN_BASE||'http://127.0.0.1:8765/ulmoa-sam/';
const OUT='brain-map/3d/explore/qa-artifacts';
await mkdir(OUT,{recursive:true});
const browser=await chromium.launch({
  executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',
  headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-gpu-sandbox']
});
const report=[];
let success=false;
const sha=b=>createHash('sha256').update(b).digest('hex');
async function checkPage(page,name){
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(BASE+'brain-map/3d/explore/?v=20261011-parent2',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>document.getElementById('viewerFallback')?.hidden===true,{timeout:25000});
 await page.locator('#brainCanvas').waitFor({state:'visible'});
 await page.waitForTimeout(500);
 const starting=await page.locator('#brainCanvas').screenshot({path:`${OUT}/${name}-initial.png`});
 await page.screenshot({path:`${OUT}/${name}-full-page.png`,fullPage:true});
 if(name==='mobile'){
   const controlLayout=await page.locator('.view-buttons button').evaluateAll(buttons=>
     buttons.map(b=>{const r=b.getBoundingClientRect();return {
       name:b.textContent.trim(),left:r.left,right:r.right,width:r.width,
       inViewport:r.left>=0 && r.right<=document.documentElement.clientWidth
     }}));
   assert.equal(controlLayout.length,6,'There must be six visible view/rotate buttons on mobile');
   assert.ok(controlLayout.every(b=>b.inViewport && b.width>65),
     'Mobile rotate buttons are clipped or too narrow: '+JSON.stringify(controlLayout));
   const buttonsGrid=await page.locator('.view-buttons').evaluate(e=>getComputedStyle(e).gridTemplateColumns);
   assert.equal(buttonsGrid.split(' ').length,3,'Mobile control layout must be a 3-column, 2-row grid');
 }

 assert.ok(starting.length>3000,'3D canvas screenshot is blank/too small');
 if(name==='mobile'){
   const edgeSamples=await page.evaluate(async b64=>{
     const img=new Image();
     img.src='data:image/png;base64,'+b64;
     await img.decode();
     const off=document.createElement('canvas');off.width=img.width;off.height=img.height;
     const ctx=off.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
     const data=ctx.getImageData(0,0,img.width,img.height).data;
     let hits=0;
     for(let y=Math.floor(img.height*.24);y<Math.floor(img.height*.80);y+=3){
       for(let x=0;x<=4;x+=2){
         const p=(y*img.width+x)*4,r=data[p],g=data[p+1],b=data[p+2];
         // The model colors are saturated; pale stage background is not.
         if(r<220 && (Math.abs(r-b)>25||Math.abs(g-b)>25))hits++;
       }
     }
     return hits;
   },starting.toString('base64'));
   assert.ok(edgeSamples<9,'mobile brain is clipped by the left canvas edge (samples='+edgeSamples+')');
 }
 await page.getByRole('button',{name:'앞에서'}).click();
 await page.waitForTimeout(500);
 assert.equal(await page.locator('[data-view="front"]').getAttribute('aria-pressed'),'true');
 const front=await page.locator('#brainCanvas').screenshot({path:`${OUT}/${name}-front.png`});
 assert.notEqual(sha(starting),sha(front),'front view must visibly change the canvas');
 await page.getByRole('button',{name:'위에서'}).click();
 await page.waitForTimeout(450);
 assert.equal(await page.locator('[data-view="top"]').getAttribute('aria-pressed'),'true');
 const top=await page.locator('#brainCanvas').screenshot({path:`${OUT}/${name}-top.png`});
 assert.notEqual(sha(front),sha(top),'top view must differ from front');
 assert.equal(await page.locator('.separation-panel').count(),0,'unnecessary split controls should be removed');
 assert.equal(await page.locator('[data-split]').count(),0);
 assert.equal(await page.locator('#separation').count(),0);
 await page.getByRole('button',{name:'자유 회전'}).click();
 const region=page.locator('#brainCanvas');
 const rect=await region.boundingBox();
 assert.ok(rect?.width>240&&rect.height>220,'canvas should have usable dimensions');
 const midX=rect.x+rect.width/2,midY=rect.y+rect.height/2;
 const before=await region.screenshot();
 await page.mouse.move(midX,midY);
 await page.mouse.down();
 await page.mouse.move(midX+120,midY+34,{steps:12});
 await page.mouse.up();
 await page.waitForTimeout(420);
 const after=await region.screenshot({path:`${OUT}/${name}-dragged.png`});
 assert.notEqual(sha(before),sha(after),'drag must rotate canvas to a different frame');
 await page.locator('[data-part="temporal"]').click();
 assert.match(await page.locator('#selectedName').textContent(),/측두엽/);
 // Parent-oriented learning: highlight while keeping anatomical hemispheres together.
 const tabs=page.locator('.hemisphere-tabs button');
 assert.equal(await tabs.count(),3);
 if(name==='mobile'){
   const tabBoxes=await tabs.evaluateAll(items=>items.map(e=>{
     const b=e.getBoundingClientRect();return {left:b.left,right:b.right,width:b.width};
   }));
   const viewport=await page.evaluate(()=>document.documentElement.clientWidth);
   assert.ok(tabBoxes.every(b=>b.left>=0&&b.right<=viewport&&b.width>=75),'Parent cards overflow mobile viewport');
 }
 await page.locator('[data-hemisphere="left"]').click();
 assert.match(await page.locator('#selectedName').textContent(),/좌뇌/);
 assert.match(await page.locator('#hemisphereDescription').textContent(),/좌뇌/);
 assert.equal(await page.locator('[data-hemisphere="left"]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('#stageShell').evaluate(e=>e.classList.contains('hemisphere-focus')),true);
 assert.equal(await page.locator('[data-view="front"]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('.separation-panel').count(),0);
 await page.waitForTimeout(550);
 const leftShot=await page.locator('#brainCanvas').screenshot({path:`${OUT}/${name}-left-highlight.png`});
 await page.locator('[data-hemisphere="right"]').click();
 assert.match(await page.locator('#selectedName').textContent(),/우뇌/);
 assert.match(await page.locator('#hemisphereDescription').textContent(),/우뇌/);
 assert.equal(await page.locator('[data-hemisphere="right"]').getAttribute('aria-pressed'),'true');
 await page.waitForTimeout(450);
 const rightShot=await page.locator('#brainCanvas').screenshot({path:`${OUT}/${name}-right-highlight.png`});
 assert.notEqual(sha(leftShot),sha(rightShot),'left/right highlights must change the 3D brain');
 await page.locator('[data-part="hemisphere-both"]').click();
 assert.match(await page.locator('#selectedName').textContent(),/양쪽 뇌가 함께/);
 assert.match(await page.locator('#hemisphereDescription').textContent(),/양쪽 뇌/);
 assert.equal(await page.locator('[data-hemisphere="both"]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('#separation').count(),0);
 await page.locator('[data-part="temporal"]').click();
 assert.equal(await page.locator('#stageShell').evaluate(e=>e.classList.contains('hemisphere-focus')),false);

 assert.equal(errors.length,0,'browser errors: '+errors.join('; '));
 report.push({name,status:'PASS',canvasBytes:starting.length,frontChanged:sha(starting)!==sha(front),topChanged:sha(front)!==sha(top),dragChanged:sha(before)!==sha(after)});
}
try{
 const desktop=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 await checkPage(desktop,'desktop');
 await desktop.close();
 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,isMobile:true});
 await checkPage(mobile,'mobile');
 await mobile.close();
 // Simplified first screen: only the picture and one explanation card, no duplicate callouts.
 for(const [label,width,height] of [['parent-desktop',1280,820],['parent-mobile',390,844]]){
   const pg=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,isMobile:width<600,hasTouch:width<600});
   const parentErrors=[];
   pg.on('pageerror',e=>parentErrors.push(String(e)));
   await pg.goto(BASE+'brain-map/3d/?v=20261011-simple1',{waitUntil:'load',timeout:30000});
   await pg.locator('.brain-stage img').waitFor({state:'visible'});
   assert.equal(await pg.locator('.map-callout').count(),0,'No duplicate labels printed over artwork');
   assert.equal(await pg.locator('.quick-parts').count(),0,'No redundant sidebar with the same six choices');
   assert.equal(await pg.locator('.map-views').count(),0,'No competing camera controls on parent overview');
   assert.equal(await pg.locator('.region-nav button').count(),6);
   assert.equal(await pg.locator('.detail-body').count(),1);
   assert.equal(await pg.locator('.daily-more').getAttribute('open'),null,'Extra examples start closed');
   assert.match(await pg.locator('#detailName').textContent(),/전두엽/);
   await pg.screenshot({path:`${OUT}/${label}-overview.png`,fullPage:true});
   await pg.locator('.region-nav [data-region="temporal"]').click();
   assert.match(await pg.locator('#detailName').textContent(),/측두엽/);
   assert.match(await pg.locator('#detailExample').textContent(),/이야기/);
   assert.equal(await pg.locator('.region-nav [data-region="temporal"]').getAttribute('aria-pressed'),'true');
   await pg.locator('.region-nav [data-region="occipital"]').click();
   assert.match(await pg.locator('#detailName').textContent(),/후두엽/);
   assert.match(await pg.locator('#detailSummary').textContent(),/시각/);
   await pg.locator('.brain-picture-actions .hit-label-frontal').click();
   assert.match(await pg.locator('#detailName').textContent(),/전두엽/);
   await pg.locator('.daily-more summary').click();
   assert.equal(await pg.locator('.activity-grid article').count(),4,'Previously approved four activity examples remain behind details');
   assert.equal(await pg.locator('.daily-more').getAttribute('open'),'');
   const href=await pg.locator('a.go-3d').getAttribute('href');
   assert.match(href,/explore\//,'3D exploration is still available as a separate link');
   const viewport=await pg.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
   assert.ok(viewport.scrollWidth<=viewport.clientWidth+1,'Overview must not overflow horizontally: '+JSON.stringify(viewport));
   assert.deepEqual(parentErrors,[],'No 2D page JavaScript runtime errors');
   report.push({name:label,status:'PASS',regionSelection:true,noDuplicateLabels:true,collapsedExamples:true,noHorizontalOverflow:true});
   await pg.close();
 }
 success=true;
}catch(e){report.push({name:'failure',status:'FAIL',error:String(e.stack||e)});}
finally{
 await writeFile(OUT+'/report.json',JSON.stringify({success,report},null,2));
 await browser.close();
 console.log(JSON.stringify({success,report},null,2));
 if(!success)process.exitCode=1;
}
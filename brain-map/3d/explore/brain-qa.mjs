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
 await page.goto(BASE+'brain-map/3d/explore/?v=20261010-friendly5',{waitUntil:'domcontentloaded',timeout:30000});
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
 await page.getByRole('button',{name:'좌뇌·우뇌 벌리기'}).click();
 const sep=page.locator('#separation');
 assert.equal(await sep.isDisabled(),false,'hemisphere separation slider should enable');
 assert.equal(await sep.inputValue(),'60','hemisphere split starts at 60 percent');
 await page.getByRole('button',{name:'부위별 벌리기'}).click();
 await sep.fill('90');
 assert.equal(await page.locator('#separationValue').textContent(),'90%');
 await page.getByRole('button',{name:'원래 위치'}).click();
 assert.equal(await sep.isDisabled(),true,'reset separation disables slider');
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
 const parent=await browser.newPage({viewport:{width:1280,height:820}});
 await parent.goto(BASE+'brain-map/3d/?v=20261010-friendly5',{waitUntil:'domcontentloaded',timeout:30000});
 await parent.locator('[data-view="front"]').click();
 const inner=parent.frameLocator('#brainViewerFrame');
 await inner.locator('#brainCanvas').waitFor({state:'visible',timeout:30000});
 await inner.locator('#viewerFallback').waitFor({state:'hidden',timeout:30000});
 assert.equal(await parent.locator('#inline3D').isVisible(),true,'3D mode should appear in parent map');
 await parent.locator('[data-view="side"]').click();
 assert.equal(await parent.locator('#inline3D').isVisible(),false,'side should return to approved picture');
 report.push({name:'embedded navigation',status:'PASS'});
 await parent.close();
 success=true;
}catch(e){report.push({name:'failure',status:'FAIL',error:String(e.stack||e)});}
finally{
 await writeFile(OUT+'/report.json',JSON.stringify({success,report},null,2));
 await browser.close();
 console.log(JSON.stringify({success,report},null,2));
 if(!success)process.exitCode=1;
}
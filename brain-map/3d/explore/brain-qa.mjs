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
 await page.goto(BASE+'brain-map/3d/explore/?v=20261010-toy4',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>document.getElementById('viewerFallback')?.hidden===true,{timeout:25000});
 await page.locator('#brainCanvas').waitFor({state:'visible'});
 await page.waitForTimeout(500);
 const starting=await page.locator('#brainCanvas').screenshot({path:`${OUT}/${name}-initial.png`});
 assert.ok(starting.length>3000,'3D canvas screenshot is blank/too small');
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
 await parent.goto(BASE+'brain-map/3d/?v=20261010-toy4',{waitUntil:'domcontentloaded',timeout:30000});
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
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {chromium}=require('playwright-core');
const BASE='http://127.0.0.1:8765/gardens/walkable-lab/';
const OUT='qa/artifacts/walkable-garden';
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  for(const [name,width,height] of [['desktop1654',1654,923],['mobile390',390,844]]){
   const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
   const page=await context.newPage();page.setDefaultTimeout(16000);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   try{
    const response=await page.goto(BASE,{waitUntil:'domcontentloaded'});
    assert.equal(response.status(),200);
    await page.waitForFunction(()=>document.body.classList.contains('third-person')&&document.querySelector('.three-landscape'),null,{timeout:20000});
    const before=await page.evaluate(()=>{
     const p=document.querySelector('#player'),r=document.querySelector('.three-actor').getBoundingClientRect();
     return {x:parseFloat(p.style.left),y:parseFloat(p.style.top),sprite:r.x+r.width/2};
    });
    await page.locator('#quick').focus();
    await page.keyboard.down('ArrowRight');await page.waitForTimeout(900);await page.keyboard.up('ArrowRight');
    const after=await page.evaluate(()=>{
     const p=document.querySelector('#player'),r=document.querySelector('.three-actor').getBoundingClientRect();
     return {x:parseFloat(p.style.left),y:parseFloat(p.style.top),sprite:r.x+r.width/2};
    });
    assert.ok(after.x>before.x+25,'3D mode did not walk after focused button');
    assert.ok(Math.abs(after.sprite-before.sprite)>8,'3D sprite appears frozen on screen');
    const ratio=await page.locator('.three-landscape').evaluate(c=>c.width/c.clientWidth);
    assert.ok(ratio<=1.05,'3D render pixel ratio unexpectedly too high: '+ratio);
    await page.screenshot({path:path.join(OUT,name+'-stable-camera.png')});
    await page.locator('#list').click();
    assert.equal(await page.locator('#results a').count(),34);
    assert.deepEqual(errors,[]);
    console.log('PASS stable 3D camera and focused-key movement',name,JSON.stringify({before,after,ratio}));
   }finally{await context.close()}
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
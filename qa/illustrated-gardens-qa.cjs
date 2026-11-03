'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright-core');
const root=process.env.QA_BASE || 'http://127.0.0.1:8765/gardens/illustrated-lab/';
const out=path.join(process.cwd(),'qa','artifacts','illustrated-25d');fs.mkdirSync(out,{recursive:true});
const cases=[['desktop1654',1654,923],['desktop1280',1280,850],['tablet768',768,980],['phone390',390,844],['phone360',360,740]];
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
 try{
 for(const [name,width,height] of cases){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
  const page=await context.newPage();page.setDefaultTimeout(18000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const r=await page.goto(root,{waitUntil:'domcontentloaded'});assert.equal(r.status(),200);
  await page.waitForFunction(()=>document.querySelector('#guideText')?.textContent.includes('정원을'),null,{timeout:18000});
  await page.locator('.landscape').evaluate(img=>img.decode());
  const image=await page.locator('.landscape').evaluate(img=>({ok:img.complete&&img.naturalWidth===1672,height:img.naturalHeight}));
  assert.equal(image.ok,true);
  assert.equal(await page.locator('button.landmark').count(),5);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=2,'horizontal scroll '+overflow);
  await page.screenshot({path:path.join(out,name+'-map.png')});
  const before=await page.locator('#player').evaluate(el=>parseFloat(el.style.left));
  await page.locator('#pickGarden').focus();
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(450);await page.keyboard.up('ArrowRight');
  const after=await page.locator('#player').evaluate(el=>parseFloat(el.style.left));
  assert.ok(after>before+35,'keyboard movement blocked '+before+' -> '+after);
  await page.locator('#pickGarden').click();
  assert.equal(await page.locator('#chooserDialog[open] .chooser-card').count(),5);
  await page.locator('#chooserDialog .chooser-card').first().click();
  await page.locator('#gardenDialog[open]').waitFor({timeout:12000});
  assert.equal(await page.locator('#gardenCards .game-card').count(),3);
  const href=await page.locator('#gardenCards a').first().getAttribute('href');
  assert.ok(href.startsWith('../../thinking-garden/'));
  await page.screenshot({path:path.join(out,name+'-cognitive.png')});
  await page.locator('#closeGarden').click();
  await page.locator('#allGames').click();
  assert.equal(await page.locator('#libraryResults a').count(),34);
  const expected=[21,3,4,3,3];
  for(let i=0;i<5;i++){
    await page.locator('#gardenFilters button').nth(i+1).click();
    assert.equal(await page.locator('#libraryResults a').count(),expected[i]);
  }
  await page.locator('#gardenFilters button').first().click();
  await page.locator('#librarySearch').fill('꽃만');
  assert.equal(await page.locator('#libraryResults a').count(),1);
  await page.locator('#librarySearch').fill('');
  await page.waitForTimeout(700);
  const broken=await page.locator('#libraryResults img').evaluateAll(imgs=>imgs.filter(img=>img.complete&&img.naturalWidth===0).length);
  assert.equal(broken,0,'game preview images fail');
  assert.deepEqual(errors,[],'page errors');
  console.log(JSON.stringify({device:name,viewport:width,background:image,moveDelta:after-before,locations:5,games:34,brokenImages:broken,errors:errors.length,status:'PASS'}));
  await context.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error('FAIL',e.stack||e);process.exitCode=1});

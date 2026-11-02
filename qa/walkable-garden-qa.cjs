'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright-core');
const BASE='http://127.0.0.1:8765/gardens/walkable-lab/';
const OUT=path.join('qa','artifacts','walkable-garden');
fs.mkdirSync(OUT,{recursive:true});
const cases=[['phone360',360,740],['phone390',390,844],['tablet768',768,980],['desktop1280',1280,850]];
const ids=['cognitive','thinking','learning','music','heart'],expected=[21,3,4,3,3];
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const results=[];
 try{
  for(const [name,width,height] of cases){
   const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
   const page=await context.newPage();page.setDefaultTimeout(12000);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   try{
    const response=await page.goto(BASE,{waitUntil:'networkidle'});
    assert.equal(response.status(),200);
    await page.waitForFunction(()=>!!document.querySelector('.portal')&&document.querySelector('#say').textContent.includes('길을 따라'));
    assert.equal(await page.locator('button.portal').count(),5);
    assert.equal((await page.request.get(BASE+'games.json')).status(),200);
    const map=await page.locator('.scene').evaluate(el=>({width:el.clientWidth,height:el.clientHeight,transform:getComputedStyle(el).transform}));
    assert.equal(map.width,1600);assert.equal(map.height,1000);
    const player=page.locator('#player');
    const start=await player.evaluate(el=>({left:parseFloat(el.style.left),top:parseFloat(el.style.top)}));
    // direct keyboard movement: no forced zoom or horizontal overflow.
    await page.locator('#viewport').click({position:{x:Math.max(30,Math.floor(width*.5)),y:Math.max(130,Math.floor((height-180)*.5))}});
    await page.keyboard.down('ArrowRight');await page.waitForTimeout(200);await page.keyboard.up('ArrowRight');
    const later=await player.evaluate(el=>parseFloat(el.style.left));
    assert.ok(later>start.left+7,'player failed to walk '+JSON.stringify({start,later}));
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    assert.ok(overflow<=3,'horizontal overflow '+overflow);
    await page.screenshot({path:path.join(OUT,name+'-map.png')});
    await page.locator('#quick').click();
    assert.equal(await page.locator('#panel[open] .activities .activity').count(),5);
    await page.locator('#panelClose').click();
    assert.equal(await page.locator('#panel[open]').count(),0);
    // A landmark outside the mobile camera must remain accessible through quick travel.
    await page.locator('#quick').click();
    await page.locator('#panel .activity button').first().click();
    await page.locator('#panel[open]').waitFor({timeout:16000});
    assert.equal(await page.locator('#panelTitle').innerText(),'인지정원');
    assert.equal(await page.locator('#activities .activity').count(),3);
    assert.equal(await page.locator('#pageNo').innerText(),'1 / 7');
    await page.locator('#nextSet').click();
    assert.equal(await page.locator('#pageNo').innerText(),'2 / 7');
    const link=await page.locator('#activities a').first().getAttribute('href');
    assert.ok(link.startsWith('../../thinking-garden/'));
    await page.screenshot({path:path.join(OUT,name+'-garden.png')});
    await page.locator('#panelClose').click();
    await page.locator('#list').click();
    assert.equal(await page.locator('#results a').count(),34);
    for(let i=0;i<ids.length;i++){
      await page.locator('#filters button').nth(i+1).click();
      assert.equal(await page.locator('#results a').count(),expected[i],ids[i]);
    }
    await page.locator('#filters button').first().click();
    await page.locator('#query').fill('꽃만');
    assert.equal(await page.locator('#results a').count(),1);
    await page.locator('#finderClose').click();
    assert.deepEqual(errors,[],errors.join('\n'));
    results.push({name,width,height,keyboard:true,landmark:true,games:34,overflow,pass:true});
   }finally{await context.close()}
  }
 }finally{await browser.close()}
 fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(results,null,2));
 console.log('PASS walkable garden: '+cases.length+' viewports, actual player movement, five zones, 34 game URLs, no runtime errors');
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright-core');
const BASE='http://127.0.0.1:8765/gardens/storybook-explore/';
const OUT=path.join('qa','artifacts','storybook-hd');
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const results=[];
 try{
  for(const [name,w,h] of [['desktop1654',1654,923],['desktop1280',1280,850],['tablet768',768,970],['mobile390',390,844],['mobile360',360,740]]){
   const context=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,reducedMotion:'reduce'});
   const page=await context.newPage();page.setDefaultTimeout(17000);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   try{
    const response=await page.goto(BASE,{waitUntil:'networkidle'});
    assert.equal(response.status(),200);
    const bg=await page.locator('.landscape').evaluate(x=>({width:x.naturalWidth,height:x.naturalHeight,loaded:x.complete}));
    assert.equal(bg.width,1672);
    assert.equal(bg.height,941);
    assert.equal(await page.locator('.portal').count(),5);
    await page.screenshot({path:path.join(OUT,name+'-world.png')});
    const left=await page.locator('#player').evaluate(el=>parseFloat(el.style.left));
    await page.locator('#goPlaza').focus();
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(520);
    await page.keyboard.up('ArrowRight');
    const right=await page.locator('#player').evaluate(el=>parseFloat(el.style.left));
    assert.ok(right>left+60,'Arrow key stopped after button focus');
    if(w<=800)await page.locator('[data-jump="learning"]').click();
    else await page.locator('.portal.learning button').click();
    await page.locator('dialog#gardenDialog[open]').waitFor({timeout:20000});
    assert.equal(await page.locator('#gardenTitle').innerText(),'학습정원');
    assert.equal(await page.locator('#gardenGames .game-card').count(),3);
    await page.locator('#nextGames').click();
    assert.equal(await page.locator('#pageInfo').innerText(),'2 / 2');
    await page.screenshot({path:path.join(OUT,name+'-garden.png')});
    await page.locator('#closeGarden').click();
    await page.locator('#openFinder').click();
    assert.equal(await page.locator('#findResults a').count(),34);
    await page.locator('#query').fill('꽃만');
    assert.ok(await page.locator('#findResults a').count()>=1,'search returned no flower game');
    await page.locator('#closeFinder').click();
    assert.deepEqual(errors,[]);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    assert.ok(overflow<=2,'page overflows viewport: '+overflow);
    results.push({name,w,h,background:bg,move:right-left,gameLinks:34,errors:0,result:'PASS'});
   }finally{await context.close();}
  }
 }finally{await browser.close();}
 fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(results,null,2));
 console.log('PASS five viewports, crisp source art, keyboard/touch navigation, all 34 original games');
})().catch(err=>{console.error(err.stack||err);process.exitCode=1});
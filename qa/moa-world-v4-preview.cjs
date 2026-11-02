'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright-core');
const ROOT='http://127.0.0.1:8765/gardens/v4-preview/';
const OUT=path.join(process.cwd(),'qa','artifacts','moa-world-v4');
fs.mkdirSync(OUT,{recursive:true});
const CASES=[['small360',360,740],['phone390',390,844],['tablet768',768,970],['desktop1280',1280,850]];
const counts={cognitive:21,thinking:3,learning:4,music:3,heart:3};
async function check(){
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const results=[];
 try{
  for(const [device,width,height] of CASES){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
   const page=await context.newPage();
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   try{
    const response=await page.goto(ROOT,{waitUntil:'domcontentloaded'});
    assert.equal(response.status(),200);
    assert.equal((await page.request.get(ROOT+'moa_gardens_world_v4_art.webp')).status(),200);
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('#destinations .destination').count(),5);
    assert.equal(await page.locator('#mobileJourney .journey-destination').count(),5);
    const isPhone=width<=600;
    assert.equal(await page.locator(isPhone?'#mobileJourney:visible':'#world:visible').count(),1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth),0,'page horizontal overflow');
    await page.screenshot({path:path.join(OUT,device+'-map.png')});
    for(const [id,n] of Object.entries(counts)){
     const selector=isPhone?'#mobileJourney button[data-garden="'+id+'"]':'#bottom button[data-section="'+id+'"]';
     await page.locator(selector).click();
     assert.equal(await page.locator('#room.is-active').count(),1);
     assert.equal(await page.locator('#roomCount').innerText(),n+' GAMES');
     assert.equal(await page.locator('#trail .stop').count(),Math.min(n,3));
     const href=await page.locator('#trail .stop-actions a').first().getAttribute('href');
     assert.ok(href.startsWith('https://ulmoa0701-a11y.github.io/ulmoa-sam/'));
     if(id==='cognitive'){
      await page.screenshot({path:path.join(OUT,device+'-cognitive.png')});
      await page.locator('#walkNext').click();
      assert.equal(await page.locator('#walkProgress').innerText(),'2 / 7');
      await page.locator('#walkPrev').click();
      assert.equal(await page.locator('#walkProgress').innerText(),'1 / 7');
      await page.locator('#trail .stop-actions button').first().click();
      await page.locator('dialog#preview[open]').waitFor();
      assert.equal(await page.locator('#previewFrame').getAttribute('src'),href);
      await page.locator('#previewClose').click();
      assert.equal(await page.locator('dialog#preview[open]').count(),0);
      assert.equal(await page.locator('#previewFrame').getAttribute('src'),null);
     }
     await page.locator('#roomBack').click();
     assert.equal(await page.locator('#room.is-active').count(),0);
    }
    await page.locator('#allTop').click();
    assert.equal(await page.locator('#libraryResults a').count(),34);
    await page.locator('#librarySearch').fill('꽃만');
    assert.equal(await page.locator('#libraryResults a').count(),1);
    await page.locator('#librarySearch').fill('');
    await page.locator('#libraryFilters button').filter({hasText:'학습정원'}).click();
    assert.equal(await page.locator('#libraryResults a').count(),4);
    await page.locator('#libraryBack').click();
    assert.equal(await page.locator('#library.is-active').count(),0);
    assert.deepEqual(errors,[]);
    results.push({device,width,height,placeCount:5,gameLinks:34,result:'PASS'});
   } finally{await context.close();}
  }
 }finally{await browser.close();}
 fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(results,null,2));
 console.log('PASS V4 preview UI: '+results.length+' viewports, five gardens, 34 game links, preview/search/routes');
}
check().catch(err=>{console.error(err.stack||err);process.exitCode=1});
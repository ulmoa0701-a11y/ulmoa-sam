'use strict';
// Mobile-first game discovery QA. Live iframe is the SAME route as Game Start,
// not a pre-generated JPEG; camera permissions are not requested on load.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright-core');
const base=(process.env.TEST_BASE_URL||'http://127.0.0.1:8765').replace(/\/$/,'');
const out='qa/garden-choice-gallery-artifacts';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,
   executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
   args:['--no-sandbox','--disable-dev-shm-usage']});
 const runs=[];
 try{
  for(const vp of [
   {device:'small-phone',width:360,height:740},
   {device:'phone',width:390,height:844},
   {device:'tablet',width:768,height:900},
   {device:'desktop',width:1280,height:850}
  ]){
   const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},reducedMotion:'reduce'});
   const page=await context.newPage();page.setDefaultTimeout(14000);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   try{
    const r=await page.goto(base+'/gardens/',{waitUntil:'load'});
    assert.equal(r.status(),200,'garden discovery route missing');
    await page.locator('.play-card-enhanced').first().waitFor();
    const count=await page.locator('.play-card-enhanced').count();
    assert.equal(count,34,'all 34 game choices preserved');
    assert.equal(await page.locator('#gardenSearch').count(),1,'search retained');
    assert.ok(await page.locator('.garden-filter-buttons').count()>=4,'topic filters retained');
    await page.locator('#gardenSearch').fill('꽃만');
    const flower=page.locator('.play-card-enhanced[data-game="flower"]');
    assert.ok(await flower.isVisible(),'flower game found by search');
    assert.equal(await page.locator('.play-card-enhanced:visible').count(),1,'search result should show one game');
    const metrics=await flower.evaluate(el=>{
      const media=el.querySelector('.play-card-media').getBoundingClientRect();
      const card=el.getBoundingClientRect();
      const details=el.querySelector('.play-card-details').getBoundingClientRect();
      return {card:{width:card.width,height:card.height},media:{width:media.width,height:media.height},
              details:{width:details.width},overflow:document.documentElement.scrollWidth-innerWidth};
    });
    assert.ok(metrics.overflow<=5,vp.device+' horizontal overflow '+metrics.overflow);
    if(vp.width<=390){
      assert.ok(metrics.card.height<=260,vp.device+' card still looks like giant screenshot '+metrics.card.height);
      assert.ok(metrics.media.width<=160,vp.device+' image is not a compact game illustration '+metrics.media.width);
      assert.ok(metrics.details.width>140,vp.device+' insufficient room for game name and start');
    }
    await flower.scrollIntoViewIfNeeded();
    await page.screenshot({path:out+'/'+vp.device+'-choice.png',fullPage:false});
    // The very same route is used in the preview and in the "game start" CTA.
    const expected=await flower.locator('.play-start-btn').getAttribute('href');
    await flower.locator('.play-preview-btn').click();
    const dialog=page.locator('#gardenPreviewDialog[open]');
    await dialog.waitFor({state:'visible'});
    const frame=page.locator('#previewLive');
    assert.equal(new URL(await frame.getAttribute('src')).pathname+new URL(await frame.getAttribute('src')).search,
      new URL(expected,base+'/gardens/').pathname+new URL(expected,base+'/gardens/').search,
      'live preview must use the exact actual game route');
    // A public iframe may briefly expose unstyled DOM before scripts/CSS finish.
    // Wait for the real active intro, not merely a button visible during loading.
    await page.frameLocator('#previewLive').locator('#introScreen.active').waitFor({state:'visible',timeout:30000});
    assert.equal(await page.frameLocator('#previewLive').locator('#introStart').isVisible(),true,'actual intro start button must be visible');
    assert.ok(await dialog.locator('.preview-play').isVisible(),'full screen start button missing');
    const modalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    assert.ok(modalOverflow<=5,'preview dialog caused body overflow');
    await page.screenshot({path:out+'/'+vp.device+'-live-preview.png',fullPage:false});
    await dialog.locator('.preview-close').click();
    assert.equal(await page.locator('#gardenPreviewDialog').evaluate(el=>el.open),false);
    assert.equal(await frame.getAttribute('src'),null,'closing must release live iframe/camera/media resources');
    // Camera game's real intro appears in preview without asking for camera yet.
    await page.locator('#gardenSearch').fill('손 모양');
    const hand=page.locator('.play-card-enhanced[data-game="hand-mirror"]');
    assert.ok(await hand.isVisible(),'hand mirror still discoverable');
    await hand.locator('.play-preview-btn').click();
    await page.frameLocator('#previewLive').locator('#cameraStart').waitFor({state:'visible'});
    assert.equal(await page.frameLocator('#previewLive').locator('#game').isVisible(),false,'camera must never start automatically in catalog');
    await page.locator('#gardenPreviewDialog .preview-close').click();
    assert.deepEqual(errors,[],vp.device+' uncaught errors');
    runs.push({device:vp.device,viewport:vp.width+'x'+vp.height,games:count,livePreview:true,compact:vp.width<=390?metrics.card.height<=260:true});
   }finally{await context.close()}
  }
 }finally{await browser.close()}
 assert.equal(runs.length,4);
 fs.writeFileSync(out+'/report.json',JSON.stringify({runs,scope:'responsive 34-choice browsing and actual-URL embedded game intros'},null,2)+'\n');
 console.log('PASS garden choice gallery and live real intro '+JSON.stringify(runs));
})().catch(e=>{console.error(e);process.exitCode=1});

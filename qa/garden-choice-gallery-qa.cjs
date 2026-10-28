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

    // Audit every card, not just one search result or three panoramic samples.
    // These are rendered-image/link checks, NOT proof of completing any game.
    if(vp.width<=390){
      const identities=await page.locator('.play-card-enhanced').evaluateAll(cards=>
        cards.map(card=>({
          key:card.dataset.game,
          title:card.dataset.title,
          href:card.querySelector('.play-start-btn')?.getAttribute('href')
        })));
      assert.equal(new Set(identities.map(item=>item.key)).size,34,'duplicate game identities');
      const audit=[];
      for(const item of identities){
        assert.ok(item.key&&item.title&&item.href,'game identity/title/link missing');
        await page.locator('#gardenSearch').fill(item.title);
        const card=page.locator('.play-card-enhanced[data-game="'+item.key+'"]');
        await card.waitFor({state:'visible'});
        await card.scrollIntoViewIfNeeded();
        await page.waitForFunction(key=>{
          const img=document.querySelector('.play-card-enhanced[data-game="'+key+'"] img.real-shot');
          return !!img&&img.complete&&img.naturalWidth>0;
        },item.key,{timeout:12000});
        const visual=await card.evaluate(el=>{
          const img=el.querySelector('img.real-shot');
          const title=el.querySelector('h3');
          const buttons=Array.from(el.querySelectorAll('.play-buttons > *'));
          const rect=el.getBoundingClientRect();
          return {
            imageWidth:img.naturalWidth,imageHeight:img.naturalHeight,
            fallback:img.dataset.fallbackStep||null,
            titleClipped:title.scrollHeight>title.clientHeight+2,
            cardWidth:rect.width,
            buttonHeights:buttons.map(button=>Math.round(button.getBoundingClientRect().height))
          };
        });
        assert.equal(visual.fallback,null,vp.device+' '+item.key+' uses fallback instead of its game preview');
        assert.equal(visual.titleClipped,false,vp.device+' '+item.key+' game title clipped');
        assert.ok(visual.buttonHeights.every(h=>h>=40),vp.device+' '+item.key+' tiny touch target');
        const target=new URL(item.href,base+'/gardens/');
        const response=await page.request.get(target.href);
        assert.equal(response.status(),200,vp.device+' '+item.key+' game route unavailable');
        await response.dispose();
        await card.screenshot({path:out+'/'+vp.device+'-all34-'+item.key+'.png'});
        audit.push({...item,...visual,status:200});
      }
      fs.writeFileSync(out+'/'+vp.device+'-all34-cards.json',JSON.stringify(audit,null,2)+'\n');
    }

    // Every game now has a scene-specific SVG; the real game route stays unchanged.
    // Assert 600x390 vector covers, not only that a low-res JPEG decoded.
    const visualIds=await page.locator('.play-card-enhanced').evaluateAll(cards=>cards.map(c=>c.dataset.game));
    assert.equal(visualIds.length,34);
    for(const game of visualIds){
      const card=page.locator('.play-card-enhanced[data-game="'+game+'"]');
      const title=await card.getAttribute('data-title');
      await page.locator('#gardenSearch').fill(title);
      await card.waitFor({state:'visible'});
      await card.scrollIntoViewIfNeeded();
      assert.equal(await card.getAttribute('data-preview-kind'),'activity-art',
        vp.device+' '+game+' wrong media class');
      const asset=await card.locator('img.real-shot').evaluate(async img=>{
        await img.decode();
        return {url:new URL(img.currentSrc).pathname,width:img.naturalWidth,height:img.naturalHeight,
          fallback:img.dataset.fallbackStep||null};
      });
      assert.equal(asset.url.endsWith('/gardens/previews/'+game+'-card.svg'),true,
        vp.device+' '+game+' no dedicated illustration');
      assert.equal(asset.width,600,vp.device+' '+game+' wrong illustration width');
      assert.equal(asset.height,390,vp.device+' '+game+' wrong illustration height');
      assert.equal(asset.fallback,null,vp.device+' '+game+' illustration failed to load');
      if(vp.width>390 || (vp.width<=390 && ['rescue','hand-mirror','flower','memory','money','recorder','feel'].includes(game)))\n        await card.screenshot({path:out+'/'+vp.device+'-'+game+'-series-art.png'});
    }
    assert.equal(await page.locator('.play-card-enhanced[data-preview-kind="activity-art"]').count(),
      34,'Every game should have a dedicated vector activity illustration');

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

'use strict';
/* New design preview only. Automated browser evidence is NOT actual child UX. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright-core');
const base='http://127.0.0.1:8765';
const out='qa/garden-trails-preview-artifacts';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage']});
 const runs=[];
 try{
  for(const vp of [
   {name:'small-phone',width:360,height:740},
   {name:'phone',width:390,height:844},
   {name:'tablet',width:768,height:900},
   {name:'desktop',width:1280,height:850}
  ]){
   const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},reducedMotion:'reduce'});
   const page=await context.newPage();
   page.setDefaultTimeout(15000);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   try{
    const response=await page.goto(base+'/gardens/',{waitUntil:'load'});
    assert.equal(response.status(),200);
    await page.locator('.garden-trails-active').waitFor();
    await page.evaluate(async()=>{await document.fonts.ready;});
    await page.locator('.garden-walk-node').first().waitFor();
    await page.waitForFunction(()=>document.querySelector('.garden-atlas-route .garden-path-sand')?.getAttribute('d')?.length>15);
    assert.equal(await page.locator('.garden-atlas a.garden-jump').count(),5);
    assert.equal(await page.locator('.garden-walk-node').count(),34);
    assert.equal(await page.locator('.garden-trail-section').count(),5);
    assert.equal(await page.locator('.garden-story-map').count(),0,'Rejected artwork is not reused');
    const nav=await page.locator('.garden-atlas').evaluate(el=>{
      const root=el.getBoundingClientRect();
      return [...el.querySelectorAll('a.garden-jump')].map(a=>{
       const b=a.getBoundingClientRect();return {href:a.getAttribute('href'),
        width:Math.round(b.width),height:Math.round(b.height),
        inside:b.left>=root.left-2&&b.right<=root.right+2&&b.top>=root.top-2&&b.bottom<=root.bottom+2};
      });
    });
    assert.deepEqual(nav.map(x=>x.href),['#cognitive','#thinking','#learning','#music','#heart']);
    assert.ok(nav.every(n=>n.inside&&n.width>=85&&n.height>=110),vp.name+' map navigation overflow '+JSON.stringify(nav));
    const mapHeight=await page.locator('.garden-atlas').evaluate(n=>n.getBoundingClientRect().height);
    assert.ok(mapHeight>=380,vp.name+' map too shallow');
    assert.equal(await page.locator('#cognitive .garden-walk-node:visible').count(),6,'Cognitive first six must be visible');
    const cognitive=page.locator('#cognitive .garden-walk');
    await page.locator('#cognitive').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>!!document.querySelector('#cognitive .garden-walk-route .garden-path-sand')?.getAttribute('d'));
    const nodes=await cognitive.locator('.garden-walk-node:visible').evaluateAll(cards=>cards.map(el=>{
     const art=el.querySelector('.play-card-media').getBoundingClientRect();
     const rect=el.getBoundingClientRect();
     const btns=[...el.querySelectorAll('.play-buttons > *')].map(b=>b.getBoundingClientRect());
     return {key:el.dataset.game,card:[Math.round(rect.width),Math.round(rect.height)],
      art:[Math.round(art.width),Math.round(art.height)],
      buttons:btns.map(b=>({width:Math.round(b.width),height:Math.round(b.height)})),
      titleClipped:el.querySelector('h3').scrollHeight>el.querySelector('h3').clientHeight+3};
    }));
    assert.ok(nodes.length===6);
    assert.ok(nodes.every(n=>n.art[0]>=90&&n.art[0]<=160),vp.name+' illustrated hotspots wrong size '+JSON.stringify(nodes));
    assert.ok(nodes.every(n=>n.buttons.length===2&&n.buttons.every(b=>b.height>=40&&b.width>=55)),
      vp.name+' buttons not tappable '+JSON.stringify(nodes));
    assert.ok(nodes.every(n=>!n.titleClipped),vp.name+' clipped garden sign');
    if(vp.width<=390)assert.ok(nodes.every(n=>n.card[1]<=260),vp.name+' node too tall');
    await page.locator('.garden-atlas').screenshot({path:path.join(out,vp.name+'-five-garden-map.png')});
    await cognitive.screenshot({path:path.join(out,vp.name+'-cognitive-path.png')});
    // Path is playable, not decorative-only. Tap the game illustration itself.
    await page.locator('#gardenSearch').fill('꽃만');
    const flower=page.locator('.garden-walk-node[data-game="flower"]');
    await flower.waitFor({state:'visible'});
    assert.equal(await page.locator('.garden-walk-node:visible').count(),1);
    await flower.locator('.play-card-media').click();
    const dialog=page.locator('#gardenPreviewDialog[open]');
    await dialog.waitFor();
    const url=await page.locator('#previewLive').getAttribute('src');
    const start=await flower.locator('.play-start-btn').getAttribute('href');
    assert.equal(new URL(url).href,new URL(start,base+'/gardens/').href);
    await dialog.locator('.preview-close').click();
    assert.equal(await page.locator('#previewLive').getAttribute('src'),null,'media resources kept after close');
    // Search and list fallback are genuinely reversible.
    await page.locator('#gardenSearch').fill('');
    const toggle=page.locator('#gardenTrailViewToggle');
    await toggle.click();
    assert.equal(await page.locator('body.garden-list-view').count(),1);
    assert.equal(await page.locator('.garden-walk-node').count(),34);
    await page.locator('#cognitive .garden-walk').screenshot({path:path.join(out,vp.name+'-accessible-list.png')});
    await toggle.click();
    assert.equal(await page.locator('body.garden-list-view').count(),0);
    // Check all 34 game links survive the new shape-based display.
    const all=await page.locator('.garden-walk-node').evaluateAll(cards=>cards.map(el=>({
     id:el.dataset.game,href:el.querySelector('.play-start-btn')?.href,
     art:el.querySelector('img.real-shot')?.getAttribute('src')
    })));
    assert.equal(new Set(all.map(x=>x.id)).size,34);
    assert.ok(all.every(x=>x.href&&x.art?.includes(x.id+'-card.svg')));
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    assert.ok(overflow<=5,vp.name+' horizontal overflow '+overflow);
    assert.deepEqual(errors,[],vp.name+' script exceptions '+errors);
    runs.push({viewport:vp.name,nav:5,gameNodes:34,firstVisible:6,
     horizontalOverflow:overflow,mediaPreview:true,listFallback:true,nodeSizes:nodes});
   }finally{await context.close()}
  }
 }finally{await browser.close()}
 assert.equal(runs.length,4);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({scope:'4 viewport responsive visual walk + real route, not child use or 34 complete sessions',runs},null,2));
 console.log('PASS interactive garden walk QA',JSON.stringify(runs.map(x=>({viewport:x.viewport,gameNodes:x.gameNodes,overflow:x.horizontalOverflow}))));
})().catch(err=>{console.error(err);process.exitCode=1});

'use strict';
/* Actual Chromium UI QA for the new living-world map.
   This is a navigation/visual test, not real-child clinical validation
   or proof that every game session was finished. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright-core');
const ROOT='http://127.0.0.1:8765';
const OUT='qa/living-world-artifacts';
fs.mkdirSync(OUT,{recursive:true});
const cases=[
 {name:'phone360',width:360,height:740},
 {name:'phone390',width:390,height:844},
 {name:'tablet768',width:768,height:970},
 {name:'desktop1280',width:1280,height:850}
];
const gardenIds=['cognitive','thinking','learning','music','heart'];
const expected={cognitive:21,thinking:3,learning:4,music:3,heart:3};
(async()=>{
 const browser=await chromium.launch({
  headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage']
 });
 const results=[];
 try{
  for(const config of cases){
   const context=await browser.newContext({
    viewport:{width:config.width,height:config.height},
    reducedMotion:'reduce',deviceScaleFactor:1
   });
   const page=await context.newPage();
   page.setDefaultTimeout(15000);
   const errs=[];page.on('pageerror',e=>errs.push(e.message));
   try{
    const response=await page.goto(ROOT+'/gardens/',{waitUntil:'load'});
    assert.equal(response.status(),200,'garden portal HTTP status');
    await page.locator('body.world-ready').waitFor({state:'attached'});
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('nav.world-map a.world-portal').count(),5);
    // v2 scenery should be a real stylesheet, with motion disabled when requested.
    const depth=await page.evaluate(()=>{
     const map=document.querySelector('nav.world-map');
     return {
      sheet:[...document.styleSheets].some(s=>s.href&&s.href.includes('world-depth-v2.css')),
      overlay:getComputedStyle(map,'::before').content,
      guideMotion:getComputedStyle(document.querySelector('.world-guide')).animationName,
      actorMotion:getComputedStyle(document.querySelector('.world-actor')).animationName
     };
    });
    assert.equal(depth.sheet,true,'storybook depth stylesheet not loaded');
    assert.notEqual(depth.overlay,'none','atmospheric layer missing');
    assert.equal(depth.guideMotion,'none','reduced-motion guide is still animated');
    assert.equal(depth.actorMotion,'none','reduced-motion actor is still animated');
    assert.equal(await page.locator('.world-game-stop').count(),34);
    assert.equal(await page.locator('.world-zone').count(),5);
    for(const id of gardenIds){
     assert.equal(await page.locator('#'+id+' .world-game-stop').count(),expected[id],id+' game count');
    }
    const asset=config.width<=680?'world-map-mobile.svg':'world-map-wide.svg';
    const source=await page.request.get(ROOT+'/gardens/'+asset);
    assert.equal(source.status(),200,'missing landscape '+asset);
    const raw=await source.text();
    assert.ok(raw.includes('viewBox=')&&raw.length>10000,'invalid decorative scenery '+asset);
    assert.equal(/<text\b/.test(raw),false,'baked words must never appear in background');
    await source.dispose();
    await page.waitForFunction(()=>[...document.querySelectorAll('nav.world-map a.world-portal')].every(a=>a.getBoundingClientRect().height>60));
    const map=await page.locator('nav.world-map').evaluate(el=>{
     const r=el.getBoundingClientRect();
     const destinations=[...el.querySelectorAll('a.world-portal')].map(a=>{
      const b=a.getBoundingClientRect();
      return {id:a.dataset.garden,inside:b.left>=r.left-3&&b.right<=r.right+3&&b.top>=r.top-3&&b.bottom<=r.bottom+3,
       rel:{left:Math.round(b.left-r.left),top:Math.round(b.top-r.top),right:Math.round(b.right-r.left),bottom:Math.round(b.bottom-r.top)},
       width:Math.round(b.width),height:Math.round(b.height),label:a.querySelector('strong')?.textContent?.trim()};
     });
     return {width:Math.round(r.width),height:Math.round(r.height),
      background:getComputedStyle(el).backgroundImage,destinations};
    });
    console.log('DEBUG MAP GEOMETRY '+config.name+' '+JSON.stringify(map));
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:path.join(OUT,config.name+'-full-page.png'),fullPage:true});
    await page.locator('nav.world-map').screenshot({path:path.join(OUT,config.name+'-world-map.png')});
    assert.ok(map.width>=300&&map.height>=(config.width<=680?500:350),'world map is not large enough');
    assert.ok(map.background.includes(asset),'wrong responsive world art '+map.background);
    assert.ok(map.destinations.every(x=>x.inside&&x.width>=90&&x.height>=75),'portal clipped '+JSON.stringify(map.destinations));
    assert.equal(new Set(map.destinations.map(x=>x.id)).size,5);
    const sceneRects=await page.locator('nav.world-map a.world-portal').evaluateAll(nodes=>nodes.map(a=>{
      const r=a.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};
    }));
    for(let i=0;i<sceneRects.length;i++)for(let j=i+1;j<sceneRects.length;j++){
      const a=sceneRects[i],b=sceneRects[j];
      const w=Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x));
      const h=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y));
      assert.ok(w*h<2500,'overlapping garden portals '+i+' '+j+' '+w*h);
    }
    assert.equal(await page.locator('nav.world-map img.world-actor').count(),5,'missing game world animals');
    await page.locator('nav.world-map img').evaluateAll(async imgs=>{await Promise.all(imgs.map(img=>img.decode().catch(()=>null)))});
    const bad=await page.locator('nav.world-map img').evaluateAll(imgs=>imgs.filter(x=>!x.complete||!x.naturalWidth).map(x=>x.src));
    assert.deepEqual(bad,[],'broken approved Moa character');
    await page.locator('nav.world-map').screenshot({path:path.join(OUT,config.name+'-world-map.png')});
    // Enter all five actual environments and return, preserving deep links.
    for(const id of gardenIds){
      await page.locator('nav.world-map a[href="#'+id+'"]').click();
      assert.equal(await page.locator('body.world-in-garden').count(),1);
      assert.equal(await page.locator('#'+id+'.world-zone-active').count(),1);
      const visible=await page.locator('section.world-zone').evaluateAll(zones=>zones.filter(z=>getComputedStyle(z).display!=='none').map(z=>z.id));
      assert.deepEqual(visible,[id]);
      await page.waitForFunction(id=>{
        const svg=document.querySelector('#'+id+' .world-winding-trail .world-trail-soil');
        return svg&&svg.getAttribute('d')?.length>20;
      },id);
      assert.equal(await page.locator('#'+id+' .world-winding-trail path').count(),3,'world path layering missing');
      await page.locator('#'+id+' .world-zone-landscape').screenshot({path:path.join(OUT,config.name+'-'+id+'-environment.png')});
      await page.locator('#'+id+' .world-trail').screenshot({path:path.join(OUT,config.name+'-'+id+'-game-stops.png')});
      // Test that real game routes and actual game previews still work.
      const first=page.locator('#'+id+' .world-game-stop').first();
      const link=first.locator('.play-start-btn');
      const href=await link.getAttribute('href');assert.ok(href&&href!=='#');
      await first.locator('.play-card-media').click();
      await page.locator('#gardenPreviewDialog[open]').waitFor();
      const src=await page.locator('#previewLive').getAttribute('src');
      assert.equal(new URL(src).href,new URL(href,ROOT+'/gardens/').href);
      await page.locator('#gardenPreviewDialog .preview-close').click();
      assert.equal(await page.locator('#previewLive').getAttribute('src'),null,'iframe resource not cleared');
      await page.locator('#'+id+' .world-back').click();
      assert.equal(await page.locator('body.world-in-garden').count(),0);
    }
    // Fallback list is reversible and includes original 34 game entries.
    await page.locator('#worldListToggle').click();
    assert.equal(await page.locator('body.world-list-mode').count(),1);
    assert.equal(await page.locator('.world-game-stop').count(),34);
    await page.locator('#worldListToggle').click();
    assert.equal(await page.locator('body.world-list-mode').count(),0);
    const search=page.locator('#gardenSearch');
    await search.fill('꽃만');
    assert.equal(await page.locator('body.world-list-mode').count(),1,'search should expose searchable game list');
    const hits=await page.locator('.world-game-stop:visible').count();
    assert.ok(hits>=1,'search returned no visible game');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    assert.ok(overflow<=5,'horizontal overflow '+overflow);
    assert.deepEqual(errs,[],'runtime exceptions '+errs);
    results.push({device:config.name,map,gameLinks:34,searchHits:hits,overflow,allDestinations:true});
   }finally{await context.close()}
  }
 }finally{await browser.close()}
 fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({
  scope:'4-viewport 5-destination browser navigation, actual link/preview and search; not game completion or child efficacy',results
 },null,2));
 assert.equal(results.length,4);
 console.log('PASS living-world map 4 viewports 5 garden destinations 34 real games',results.map(x=>x.device).join(', '));
})().catch(err=>{console.error(err.stack||err);process.exitCode=1;});

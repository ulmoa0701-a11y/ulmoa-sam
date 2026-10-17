'use strict';
// Curated-link smoke coverage for EVERY catalog game, not just the three sample cards.
// No real child data or network services are required.
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const base='http://127.0.0.1:8765/thinking-garden/';
function planUrl(items,opts={}){
 const payload={v:2,items,level:opts.level||1,rounds:opts.rounds||5,settings:opts.settings||{}};
 return base+'?plan='+Buffer.from(JSON.stringify(payload),'utf8').toString('base64url');
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const catalog=await browser.newPage();
  await catalog.goto(base,{waitUntil:'load'});
  const coreGames=await catalog.locator('.library-card[data-open]').evaluateAll(cards=>cards.map(card=>card.dataset.open));
  const standalone=['moaMoney','moaChange','moaFeel'];
  assert.equal(new Set(coreGames).size,coreGames.length,'duplicate catalog game identifiers');
  assert.ok(coreGames.length>=26,'the main game catalog is missing games');
  await catalog.locator('#moaPlannerLaunch').click();
  for(const id of standalone)assert.equal(await catalog.locator('#moaPlanSelection input[value="'+id+'"]').count(),1,id+' existing Moa Mission missing in selection');
  const games=[...coreGames,...standalone];
  await catalog.close();
  for(const vp of [{name:'mobile',width:390,height:844},{name:'desktop',width:1280,height:900}]){
   const page=await browser.newPage({viewport:{width:vp.width,height:vp.height}});
   page.setDefaultTimeout(12000);
   const failures=[];
   page.on('pageerror',e=>failures.push('JavaScript exception: '+e.message));
   for(const id of games){
    const marker=vp.name+'/'+id;
    await page.goto(planUrl([id]),{waitUntil:'load'});
    assert.ok(await page.locator('#moaAssignedHome').isVisible(),marker+' curated menu missing');
    assert.equal(await page.locator('.moa-assigned-item').count(),1,marker+' unexpected other activities');
    assert.equal(await page.locator('#gardenGamePanel:visible').count(),0,marker+' exposed full catalog');
    const preview=page.locator('.moa-assigned-item .moa-assigned-visual');
    assert.equal(await preview.count(),1,marker+' missing visual example');
    assert.equal(await preview.locator('.moa-assigned-visual-label').count(),1,marker+' missing image meaning');
    if(id==='handMirror'||standalone.includes(id)){
     assert.ok(await preview.locator('.moa-assigned-fallback-icons span').count()>=4,marker+' missing illustrated gameplay');
    }else{
     assert.equal(await preview.locator('.card-live-preview').count(),1,marker+' must reuse actual catalog gameplay example');
    }
    assert.ok(await preview.isVisible(),marker+' example hidden on device');
    const fit=await page.locator('.moa-assigned-item').evaluate(el=>{
     const box=el.getBoundingClientRect(),image=el.querySelector('.moa-assigned-visual').getBoundingClientRect();
     return image.width>190&&image.height>145&&image.left>=box.left-2&&image.right<=box.right+2&&document.documentElement.scrollWidth<=innerWidth+3;
    });
    assert.ok(fit,marker+' game image clipped, collapsed or mobile layout overflowing');
    await page.locator('.moa-assigned-item button.moa-assigned-start').click();
    if(await page.locator('#moaAssignedEmbed').count()){
     const frame=page.locator('#moaAssignedEmbed iframe');
     assert.ok((await frame.getAttribute('allow')).includes('camera'),marker+' iframe lacks camera permission');
     if(id==='moaMoney'){
      await page.waitForFunction(()=>!!document.querySelector('#moaAssignedEmbed iframe')?.contentWindow?.document?.readyState);
      await page.evaluate(()=>{document.querySelector('#moaAssignedEmbed iframe').contentWindow.location.href='/gardens/';});
      await page.locator('#moaAssignedEmbed').waitFor({state:'detached'});
     }else await page.locator('#moaAssignedEmbed .moa-assigned-exit').click();
    }else{
     assert.ok(await page.locator('#introScreen.active').isVisible(),marker+' game preview did not open');
     await page.locator('#introStart').click();
     assert.ok(await page.locator('#gameScreen.active').isVisible(),marker+' game did not start');
     await page.locator('#backHome').click();
    }
    assert.ok(await page.locator('#moaAssignedHome').isVisible(),marker+' did not return to selected activities');
    assert.equal(await page.locator('#gardenGamePanel:visible').count(),0,marker+' showed unrelated game cards on return');
   }
   // Screenshot the exact two-activity caregiver journey reported by the user.
   await page.goto(planUrl(['moaChange','rescue']),{waitUntil:'load'});
   assert.equal(await page.locator('.moa-assigned-item').count(),2);
   assert.equal(await page.locator('.moa-assigned-item .moa-assigned-visual').count(),2);
   assert.equal(await page.locator('.moa-assigned-item .card-live-preview').count(),1,'rescue must display catalog sample');
   assert.equal(await page.locator('.moa-assigned-item .moa-assigned-fallback-icons').count(),1,'changing supplies needs pictorial preview');
   await page.screenshot({path:'qa/curated-share-screenshots/'+vp.name+'-visual-parent.png',fullPage:true});
   assert.deepEqual(failures,[],vp.name+' console exceptions');
   console.log('PASS '+vp.name+': '+games.length+' curated game entries, launch and selected-list return');
   await page.close();
  }
  const materials=await browser.newPage();
  for(const item of ['slowPdf','slowSheets','clinicalGuide']){
   await materials.goto(planUrl([item]),{waitUntil:'load'});
   assert.equal(await materials.locator('.moa-assigned-item').count(),1,item+' material missing');
   await materials.locator('.moa-assigned-item button').click();
   const iframe=materials.locator('#moaAssignedEmbed iframe');
   assert.ok(await iframe.getAttribute('src'),item+' iframe URL empty');
   await materials.locator('#moaAssignedEmbed .moa-assigned-exit').click();
  }
  const pdf=await materials.request.get('http://127.0.0.1:8765/materials/slow-look/worksheets-16p.pdf');
  assert.equal(pdf.status(),200,'printable activity PDF must remain available');
  await materials.goto(base+'?plan=not-a-valid-token',{waitUntil:'load'});
  assert.ok(await materials.locator('.moa-plan-invalid').isVisible(),'invalid plans need clear fallback');
  await materials.close();
  console.log('PASS curated materials, printable PDF URL, malformed-link fallback, no authentication or personal data');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

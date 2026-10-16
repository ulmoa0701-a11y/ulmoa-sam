'use strict';
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
 const base=process.env.SLOW_LOOK_BASE||'http://127.0.0.1:8765/';
 const out='qa/slow-look-screenshots';fs.mkdirSync(out,{recursive:true});
 const names=['slowScan','slowPlace','slowBlock','slowName','slowMemory','slowEveryday'];
 const categories={slowScan:'visual',slowPlace:'space',slowBlock:'space',slowName:'language',slowMemory:'memory',slowEveryday:'life'};
 for(const vp of [{width:390,height:844,label:'mobile'},{width:1280,height:900,label:'desktop'}]){
  const page=await browser.newPage({viewport:vp,deviceScaleFactor:1});
  page.setDefaultTimeout(12000);const errors=[];
  page.on('pageerror',e=>errors.push(e.stack||e.message));
  await page.goto(base+'thinking-garden/',{waitUntil:'load'});
  assert.ok(await page.locator('#gardenGamePanel .library-card').count()>=25);
  assert.equal(await page.locator('#gardenGamePanel .library-card[data-open^="slow"]').count(),6);
  for(const mode of names){
   await page.locator('.category-tab[data-category="'+categories[mode]+'"]').click();
   const card=page.locator('button.library-card[data-open="'+mode+'"]');
   assert.ok(await card.isVisible(),mode+' card hidden');
   assert.ok(await card.locator('.card-live-preview').count()===1,mode+' missing individual illustrated preview');
   await card.click();
   assert.equal(await page.locator('#introScreen.active').count(),1,mode+' intro not native');
   assert.equal(await page.locator('#slowLookControls:visible').count(),1,mode+' training options absent');
   assert.equal(await page.locator('#slowNameOnly:visible').count(),0,mode+' naming setup must start collapsed');
   assert.equal(await page.locator('#slowCueGroup:visible').count(),0,mode+' teacher setting must be collapsed');
   await page.locator('#slowTeacherDetails summary').click();
   assert.equal(await page.locator('#slowCueGroup:visible').count(),1,mode+' optional cue should be available');
   assert.equal(await page.locator('#slowNameOnly:visible').count(),mode==='slowName'?1:0,mode+' name response controls must be game-specific');
   await page.locator('#slowTeacherDetails summary').click();
   await page.screenshot({path:out+'/'+vp.label+'-'+mode+'-intro.png'});
   await page.locator('#introStart').click();
   assert.equal(await page.locator('#gameScreen.active').count(),1,mode+' game not native');
   assert.ok(page.url().endsWith('/thinking-garden/'),mode+' navigated away from garden');
   const rounds=mode==='slowName'?6:5;
   for(let i=0;i<rounds;i++){
    assert.ok(await page.locator('#gameArea .slow-task').count()===1,mode+' task missing on round '+i);
    if(mode==='slowName'){
      await page.locator('[data-slow="ready"]').click();
      assert.ok(await page.locator('[data-slow="name-right"]').isVisible());
      await page.locator('[data-slow="name-right"]').click();
    }else if(mode==='slowMemory'){
      await page.locator('[data-slow="hide"]').click();
      assert.ok(await page.locator('[data-slow="cell"]').count()>0);
      await page.locator('[data-slow="skip"]').click();
    }else if(mode==='slowScan'){
      const flowers=page.locator('.slow-scan button[data-slow="cell"]');
      const cells=await flowers.count();
      for(let j=0;j<cells;j++)if((await flowers.nth(j).innerText()).includes('🌼'))await flowers.nth(j).click();
      await page.locator('[data-slow="check"]').click();
      assert.ok(await page.locator('[data-slow="next"]').isVisible(),'correct visual search rejected');
    }else if(mode==='slowPlace'||mode==='slowBlock'){
      const sample=page.locator('.slow-map-pair .slow-board').first();
      const cells=sample.locator('.slow-tile');const count=await cells.count();
      const target=page.locator('.slow-map-pair .slow-board').last().locator('button[data-slow="cell"]');
      for(let j=0;j<count;j++)if((await cells.nth(j).getAttribute('class')).includes('shown'))await target.nth(j).click();
      await page.locator('[data-slow="check"]').click();
      assert.ok(await page.locator('[data-slow="next"]').isVisible(),mode+' correct spatial copy rejected');
    }else if(mode==='slowEveryday'){
      await page.locator('.slow-bag [data-slow="cell"]').first().click();
      await page.locator('[data-slow="check"]').click();
      if(await page.locator('[data-slow="next"]').count()===0)await page.locator('[data-slow="skip"]').click();
    }
    if(i===0)await page.screenshot({path:out+'/'+vp.label+'-'+mode+'-play.png'});
    await page.locator('[data-slow="next"]').click();
    if(i===rounds-1)await page.locator('#resultScreen.active').waitFor();
    else await page.waitForFunction(expected=>document.querySelector('#stageLabel')?.textContent.trim()===expected, String(i+2)+' / '+rounds);
   }
   assert.equal(await page.locator('#resultScreen .slow-result-extra').count(),1);
   assert.ok(await page.locator('#resultScreen .slow-teacher-details').count()>=1);
   await page.screenshot({path:out+'/'+vp.label+'-'+mode+'-result.png'});
   await page.locator('#resultScreen [data-go="home"]').click();
   assert.equal(await page.locator('#homeScreen.active').count(),1);
  }
  assert.deepEqual(errors,[],vp.label+' JavaScript errors');
  await page.goto(base+'thinking-garden/',{waitUntil:'load'});
  await page.locator('#gardenView-materials').click();
  assert.ok(await page.locator('a.moa-resource-card[href*="slow-look"]').count()>=2);
  await page.goto(base+'materials/',{waitUntil:'load'});
  await page.locator('button.book-button[data-download="slow-look/worksheets-16p.pdf"]').click();
  assert.ok(await page.locator('#materialDialog').evaluate(x=>x.open));
  assert.equal(await page.locator('#materialDownload').getAttribute('href'),'slow-look/worksheets-16p.pdf');
  assert.equal((await page.request.get(base+'materials/slow-look/worksheets-16p.pdf')).status(),200);
  await page.goto(base+'materials/slow-look/',{waitUntil:'load'});
  assert.equal(await page.locator('.sheet').count(),16);
  assert.deepEqual(errors,[],vp.label+' final JavaScript errors');
  await page.close();
 }
 await browser.close();
 console.log('PASS six individually previewed native garden games, 5/6 rounds each, PC/mobile, 16-page worksheets');
})().catch(e=>{console.error(e);process.exit(1)});

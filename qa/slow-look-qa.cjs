'use strict';
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
 const base=process.env.SLOW_LOOK_BASE||'http://127.0.0.1:8765/';
 const out='qa/slow-look-screenshots';fs.mkdirSync(out,{recursive:true});
 const names=['scan','place','block','name','memory','everyday'];
 for(const vp of [{width:390,height:844,label:'mobile'},{width:1280,height:900,label:'desktop'}]){
  const page=await browser.newPage({viewport:vp,deviceScaleFactor:1});page.setDefaultTimeout(5000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'thinking-garden/games/slow-look/',{waitUntil:'load'});
  await page.locator('.mode').first().waitFor();
  assert.equal(await page.locator('button.mode').count(),6);
  await page.screenshot({path:out+'/'+vp.label+'-home.png',fullPage:true});
  for(const mode of names){
   await page.locator('[data-action=start][data-mode='+mode+']').click();
   if(mode==='name')await page.locator('#nameGo').click();
   assert.match(await page.locator('.taskHead h1').innerText(),/탐험|건축가/);
   assert.equal(await page.locator('[data-action=finish]').count(),1);
   if(mode==='name'){
    await page.locator('[data-action=ready]').click();
    await page.locator('[data-action=score][data-correct=yes]').click();
    assert.ok(await page.locator('[data-action=next]').count()===1);
   } else if(mode==='memory'){
    await page.locator('[data-action=hideModel]').click();
    assert.ok(await page.locator('button[data-action=cell]').count()>=9);
   } else {
    assert.ok(await page.locator('button[data-action=cell]').count()>0,mode);
    await page.locator('button[data-action=cell]').first().click();
    await page.locator('button[data-action=check]').click();
   }
   await page.screenshot({path:out+'/'+vp.label+'-'+mode+'.png'});
   await page.locator('[data-action=finish]').click();
   assert.ok(await page.locator('.statrow .stat').count()===3);
   await page.locator('#homeBtn').click();
   assert.ok(await page.locator('button.mode').count()===6);
  }
  assert.deepEqual(errors,[],'Unexpected JS errors '+vp.label);
  await page.goto(base+'thinking-garden/',{waitUntil:'load'});
  assert.ok(await page.locator('a.library-card[href="games/slow-look/"]').count()===1);
  await page.locator('[data-category=space].category-tab').click();
  assert.ok(await page.locator('a.library-card[href="games/slow-look/"]').isVisible());
  await page.locator('#gardenView-materials').click();
  assert.ok(await page.locator('a.moa-resource-card[href*="slow-look"]').count()>=2);
  await page.goto(base+'materials/',{waitUntil:'load'});
  await page.locator('button.book-button[data-download="slow-look/worksheets-16p.pdf"]').click();
  assert.ok(await page.locator('#materialDialog').evaluate(x=>x.open));
  assert.equal(await page.locator('#materialDownload').getAttribute('href'),'slow-look/worksheets-16p.pdf');
  const link=await page.request.get(base+'materials/slow-look/worksheets-16p.pdf');
  assert.equal(link.status(),200);
  await page.goto(base+'materials/slow-look/',{waitUntil:'load'});
  assert.equal(await page.locator('.sheet').count(),16);
  await page.screenshot({path:out+'/'+vp.label+'-worksheets.png'});
  assert.deepEqual(errors,[],'Unexpected JS errors end '+vp.label);
  await page.close();
 }
 await browser.close();
 console.log('PASS 2 viewports, all 6 game modes, worksheet PDF, garden/resources/materials navigation');
})().catch(e=>{console.error(e);process.exit(1)});

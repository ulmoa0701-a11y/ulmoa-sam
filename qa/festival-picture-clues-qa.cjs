'use strict';
/* Picture clue accessibility and non-memorized response order; performance is not diagnosis. */
const {chromium}=require('playwright-core'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
 try{
  for(const vp of [{width:390,height:844,name:'mobile'},{width:1280,height:900,name:'desktop'}]){
   const page=await browser.newPage({viewport:vp});page.setDefaultTimeout(14000);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   for(const level of ['1','2','3']){
    await page.goto('http://127.0.0.1:8765/thinking-garden/',{waitUntil:'load'});
    await page.locator('[data-open="festivalPlan"]').click();
    await page.locator('#slowLevel').selectOption(level);
    await page.locator('#slowTeacherDetails summary').click();
    await page.locator('#strategyAuto').uncheck();
    await page.locator('#introStart').click();
    const orders=[];
    for(let round=0;round<5;round++){
     const r=await page.evaluate(()=>({level:state.strategy.r.level,pool:state.strategy.r.pool,clues:state.strategy.r.tasks.length-1}));
     orders.push(r.pool.join(','));
     assert.equal(await page.locator('.festival-clue').count(),r.clues,'missing picture-first relation cards');
     assert.equal(await page.locator('.festival-clue-flow').count(),r.clues,'missing icon before/after relationships');
     assert.equal(await page.locator('.festival-clue-friend').count(),r.clues,'missing custom characters');
     assert.equal(await page.locator('.festival-clue-flow').first().getAttribute('aria-label')!==null,true);
     assert.equal(/은\\(는\\)|을\\(를\\)/.test(await page.locator('.festival-picture-evidence').innerText()),false,'unnatural grammatical placeholders');
     if(round===0){
      await page.evaluate(()=>state.sound=false);
      await page.locator('.festival-clue [data-plan="listen"]').first().click();
      assert.ok((await page.locator('.strategy-feedback').innerText()).includes('소리를 켜면'),'optional listening feedback missing when muted');
     }
     const n=await page.evaluate(()=>state.strategy.r.tasks.length);
     if(round===2){
      for(const i of [2,0,1,3].slice(0,n))await page.locator('[data-plan="choose"][data-i="'+i+'"]').click();
      await page.locator('[data-plan="check"]').click();
      await page.locator('[data-plan="recover"]').click();
     }
     for(let i=0;i<n;i++)await page.locator('[data-plan="choose"][data-i="'+i+'"]').click();
     await page.locator('[data-plan="check"]').click();
     assert.ok(await page.locator('.strategy-done').isVisible(),'festival mission did not finish');
     await page.locator('[data-core="next"]').click();
     if(round<4)await page.waitForFunction(next=>state.round===next&&!!document.querySelector('.festival-clue'),round+1);
    }
    assert.ok(new Set(orders).size>=2,'fixed choice layout lets children memorize click positions');
    await page.locator('#resultScreen.active').waitFor();
    assert.equal(await page.evaluate(()=>state.strategy.records.length),5);
    assert.deepEqual(await page.evaluate(()=>[state.strategy.records[2].first,state.strategy.records[2].final,state.strategy.records[2].errors]),['X','O',1]);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+4),true,'festival cards overflow viewport '+vp.name);
    console.log('PASS festival '+vp.name+' level='+level+' 5 complete quests, picture clues, optional listening and distinct orders');
   }
   assert.deepEqual(errors,[],'uncaught browser errors');
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

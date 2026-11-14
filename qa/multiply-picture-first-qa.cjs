const {chromium}=require('playwright-core'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765',route='/math-garden/grade-play/concept-multiply/';
 fs.mkdirSync('qa/picture-multiply-artifacts',{recursive:true});
 try{
 for(const width of [360,390,768,1280]){
   const ctx=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'});
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   let res=await page.goto(base+route,{waitUntil:'load',timeout:30000});
   assert(res&&res.ok(),'game HTTP OK '+width);
   assert.equal(await page.locator('#packSource .ten-tray .apple').count(),10,'source pack must VISIBLY contain ten individual apples');
   assert.equal(await page.locator('#targetApples span').count(),12,'level 0 must picture 12 target apples');
   assert.equal(await page.locator('#mathKeypad button').count(),12,'touch numeric keypad');
   assert(await page.locator('#voiceBtn').isVisible(),'pictorial speech control');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert(overflow<=3,'horizontal overflow '+width+' : '+overflow);
   // 12 x 3: physically build one 10 pack + two individual apples
   await page.locator('#tenPlus').click();
   assert.equal(await page.locator('#basketPreview .ten-tray .apple').count(),10,'picked pack displays apples in basket');
   await page.locator('#onePlus').click({clickCount:2,delay:50});
   assert((await page.locator('#basketTotal').textContent()).includes('12 / 12'),'basket count incorrect');
   await page.locator('#buildConfirm').click();
   assert(await page.locator('#deliverStage').isVisible(),'delivery phase after build');
   assert.equal(await page.locator('#friendGrid button.friend').count(),3,'3 friends visible');
   await page.locator('#friendGrid button.friend:not(.delivered)').first().click();
   assert.equal(await page.locator('#friendGrid .delivered .ten-tray .apple').count(),10,'delivery box must keep its ten apples');
   for(let i=0;i<2;i++)await page.locator('#friendGrid button.friend:not(.delivered)').first().click();
   assert(await page.locator('#deliveryNext').isEnabled());
   await page.locator('#deliveryNext').click();
   for(const digits of ['30','6','36']){
     assert(await page.locator('#mathStage').isVisible(),'math phase active');
     for(const digit of digits)await page.locator('#mathKeypad button[data-key="'+digit+'"]').click();
     await page.locator('#mathConfirm').click();
   }
   assert(await page.locator('#winStage').isVisible(),'finish visible after 12x3');
   await page.screenshot({path:'qa/picture-multiply-artifacts/finish-'+width+'.png',fullPage:true});
   if(width===390){
      // Check all 3 real problems: no text reading needed to play; tap pictures and numbers
      for(const [lv,tens,ones,friends,digits] of [[1,3,1,9,['270','9','279']],[2,4,2,3,['120','6','126']]]){
        await page.locator('[data-stage="'+lv+'"]').click();
        assert.equal(await page.locator('#targetApples span').count(),tens*10+ones);
        for(let i=0;i<tens;i++)await page.locator('#tenPlus').click();
        for(let i=0;i<ones;i++)await page.locator('#onePlus').click();
        assert.equal(await page.locator('#basketPreview .ten-tray .apple').count(),tens*10);
        await page.locator('#buildConfirm').click();
        assert.equal(await page.locator('#friendGrid button.friend').count(),friends);
        for(let i=0;i<friends;i++)await page.locator('#friendGrid button.friend:not(.delivered)').first().click();
        await page.screenshot({path:'qa/picture-multiply-artifacts/delivery-'+lv+'.png',fullPage:true});
        await page.locator('#deliveryNext').click();
        for(const digitText of digits){
          for(const digit of digitText)await page.locator('#mathKeypad button[data-key="'+digit+'"]').click();
          await page.locator('#mathConfirm').click();
        }
        assert(await page.locator('#winStage').isVisible(),'not completed '+lv);
      }
      await page.locator('[data-stage="0"]').click();
      assert.equal(await page.locator('#targetApples span').count(),12);
      await page.locator('#voiceBtn').click();
      assert.equal(await page.locator('#voiceBtn').getAttribute('aria-pressed'),'true');
      await page.locator('#tenPlus').click();
      await page.screenshot({path:'qa/picture-multiply-artifacts/build-mobile.png',fullPage:true});
   }
   assert.equal(errors.length,0,'uncaught JS error at '+width+' '+errors.join(';'));
   await ctx.close();
   console.log('PASS '+width+'px: 10 visible fruits, complete game, no console errors');
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
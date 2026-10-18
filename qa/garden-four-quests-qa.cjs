'use strict';
/* Full child-paced browser journeys for four native games. These are interaction
   observations, not a diagnostic score or proof of transfer to everyday life. */
const {chromium}=require('playwright-core'),assert=require('node:assert/strict');
const fs=require('node:fs');
const url='http://127.0.0.1:8765/thinking-garden/';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
 fs.mkdirSync('qa/four-quest-screenshots',{recursive:true});
 try{
  for(const viewport of [{name:'mobile',width:390,height:844},{name:'desktop',width:1280,height:900}]){
   const page=await browser.newPage({viewport});page.setDefaultTimeout(14000);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   for(const game of ['flower','hide','path','targets']){
    for(const count of [5,10,15,20]){
     await page.goto(url,{waitUntil:'load'});
     await page.locator('[data-open="'+game+'"]').click();
     await page.locator('#sessionRounds').selectOption(String(count));
     await page.locator('#introStart').click();
     for(let round=0;round<count;round++){
      assert.equal(await page.evaluate(()=>state.round),round,'wrong round in '+game);
      if(game==='flower'){
       const wrong=page.locator('.flower-quest .object-btn[data-good="0"]');
       if(round===0)await wrong.first().click();
       const good=page.locator('.flower-quest .object-btn[data-good="1"]'),n=await good.count();
       await good.first().click();
       if(round===0)await good.first().click(); // duplicate should not earn a second reward
       for(let i=1;i<n;i++)await good.nth(i).click();
       assert.equal(await page.locator('#flowerHarvest .flower-picked').count(),n,'collected flowers should visibly remain in the scene');
      }
      if(game==='hide'){
       if(round===0)await page.locator('.leaf-no-clue:not(.opened)').first().click();
       const found=page.locator('.leaf-has-clue'),n=await found.count();
       await found.first().click();
       if(round===0)await found.first().click();
       for(let i=1;i<n;i++)await found.nth(i).click();
       assert.equal(await page.locator('#leafRescued .leaf-rescued').count(),n,'rescue must appear in the friends shelter');
      }
      if(game==='path'){
       if(round===0)await page.locator('.trail-node:not([data-i="0"])').first().click();
       const n=await page.locator('.trail-node').count();
       const firstPosition=await page.locator('#trailRunner').evaluate(e=>e.style.left+'|'+e.style.top);
       await page.locator('.trail-node[data-i="0"]').click();
       if(round===0)await page.locator('.trail-node[data-i="0"]').click();
       const secondPosition=await page.locator('#trailRunner').evaluate(e=>e.style.left+'|'+e.style.top);
       assert.notEqual(firstPosition,secondPosition,'Ru must physically move to the next route node');
       for(let i=1;i<n;i++)await page.locator('.trail-node[data-i="'+i+'"]').click();
       assert.equal(await page.locator('.trail-node.visited').count(),n,'path progress not maintained');
      }
      if(game==='targets'){
       const sleeping=page.locator('.wake-target[data-ready="0"]'),n=await sleeping.count();
       if(await page.evaluate(()=>practiceStep()>=2))assert.ok(await page.locator('.wake-target.wake-decoy').count()>=1,'harder rounds should introduce already-bloomed distractors');
       if(round===2)await page.locator('.wake-target.wake-decoy').first().click();
       await sleeping.first().click();
       if(round===0)await page.locator('.wake-target.awake').first().click();
       for(let i=1;i<n;i++)await sleeping.first().click();
       assert.equal(await page.locator('#wakeGardenProgress .wake-progress-bloom').count(),n,'garden blooms should match successful choices');
      }
      if(round===0){
       const obs=await page.evaluate(()=>{const o=state.basicRecords[0];return {first:o.gardenFirst,choices:o.gardenChoices,errors:o.gardenErrors||0,repeats:o.gardenRepeat||0,done:o.gardenFinished}});
       assert.equal(obs.first,game==='targets'?'O':'X',game+' initial child response');
       assert.equal(obs.errors,game==='targets'?0:1,game+' errors counted from choice not sound');
       assert.equal(obs.repeats,1,game+' repeated tap separately counted');
       assert.equal(obs.done,true,game+' mission completion not recorded');
      }
      await page.locator('.round-gate button').click();
      if(round+1<count&&count>=10&&(round+1)%5===0){await page.locator('#practiceContinue').waitFor();await page.locator('#practiceContinue').click();}
      if(round+1<count)await page.waitForFunction(([id,next])=>state.round===next&&!state.advancing&&!!document.querySelector(id==='flower'?'.flower-quest':id==='hide'?'.leaf-clue-game':id==='path'?'.path-quest':'.wake-garden'),[game,round+1]);
     }
     await page.locator('#resultScreen.active').waitFor();
     assert.equal(await page.evaluate(()=>state.basicRecords.length),count,'observation count '+game);
     assert.equal(await page.evaluate(()=>state.basicRecords.every(x=>x.gardenFinished===true)),true,'completed missions '+game);
     await page.locator('.basic-observation summary').click();
     assert.ok((await page.locator('.basic-observation-items').innerText()).includes('첫 선택'),'teacher should see actual choices');
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+4),true,'mobile viewport overflow '+game);
     if(count===5)await page.screenshot({path:'qa/four-quest-screenshots/'+viewport.name+'-'+game+'.png',fullPage:false});
     console.log('PASS four-quest '+viewport.name+' '+game+' '+count+' rounds; world events and clinical records');
    }
   }
   assert.deepEqual(errors,[],'browser exceptions '+viewport.name);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

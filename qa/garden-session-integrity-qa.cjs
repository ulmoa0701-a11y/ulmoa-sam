'use strict';
/* Game-content QA, not a cognitive assessment. Chromium actually renders the
   installed Moa games at 390px and 1280px; no child profile or paid API. */
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
 try{
  for(const vp of [{name:'mobile',width:390,height:844},{name:'desktop',width:1280,height:900}]){
   const page=await browser.newPage({viewport:{width:vp.width,height:vp.height}});
   page.setDefaultTimeout(15000);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8765/thinking-garden/',{waitUntil:'load'});
   const ids=await page.locator('#gardenGamePanel .library-card[data-open]').evaluateAll(nodes=>nodes.map(x=>x.dataset.open));
   assert.equal(new Set(ids).size,ids.length,'duplicate game ID in garden');
   assert.ok(ids.length>=26,'catalog shrank');
   for(const id of ids){
     assert.equal(await page.locator('.library-card[data-open="'+id+'"]').count(),1,'duplicate card '+id);
     assert.ok(await page.evaluate(id=>!!window.MoaClinicalBridge?.dataFor(id),id),'missing offline/observation bridge '+id);
   }
   for(const id of ['rulePost','mirrorPond','sceneDetect']){
    await page.evaluate(x=>openPreview(x),id);
    await page.locator('#slowLevel').selectOption('3');
    await page.locator('#sessionRounds').selectOption('20');
    await page.locator('#introStart').click();
    const variations=[];
    for(let round=0;round<20;round++){
     const value=await page.evaluate(round=>{
      state.round=round;renderRound();
      const d=state.novel.roundData;
      if(state.game==='rulePost'){
       return {key:d.packages.map(p=>p.color+':'+p.stamp).join('|'),answerCount:d.packages.length,rule:d.rule};
      }
      if(state.game==='mirrorPond'){
       const keys=d.choices.map(x=>x.icons.join('|'));
       return {key:d.source.join('|')+'|'+d.operation,answerCount:d.choices.filter(x=>x.type===d.operation).length,uniqueChoices:new Set(keys).size};
      }
      const different=d.before.map((v,i)=>v!==d.after[i]?i:-1).filter(i=>i!==-1);
      return {key:d.before.join('|')+'|'+d.changed,answerCount:different.length,changed:d.changed};
     },round);
     variations.push(value.key);
     assert.equal(value.answerCount,id==='rulePost'?3:1,id+' ambiguous target at '+round);
     if(id==='mirrorPond')assert.equal(value.uniqueChoices,3,'visually identical mirror choices at '+round);
    }
    assert.equal(new Set(variations).size,20,'only '+new Set(variations).size+' distinct '+id+' activities in 20 rounds');
    if(id==='sceneDetect'){
     await page.evaluate(()=>{state.round=0;renderRound()});
     const original=await page.locator('.novel-story-object').allTextContents();
     await page.locator('[data-novel-action=reveal]').click();
     const changed=await page.locator('.novel-story-object').allTextContents();
     assert.notDeepEqual(original,changed);
     await page.locator('[data-novel-action=peek]').click();
     const lookedBack=await page.locator('.novel-story-object').allTextContents();
     assert.deepEqual(lookedBack,original,'previous scene must replace current scene while checking');
     assert.equal(await page.locator('[data-novel-action=change]').count(),0,'hidden buttons must not allow answering');
     await page.locator('[data-novel-action=back]').click();
     assert.deepEqual(await page.locator('.novel-story-object').allTextContents(),changed,'restore changed scene');
    }
    await page.locator('#backHome').click();
   }
   // A rest before any response is not an incorrect response.
   await page.evaluate(()=>openPreview('festivalPlan'));
   await page.locator('#slowLevel').selectOption('1');
   await page.locator('#introStart').click();
   await page.locator('[data-core=rest]').click();
   const record=await page.evaluate(()=>state.strategy.records[0]);
   assert.equal(record.first,'-','unattempted problem must not count as incorrect');
   assert.equal(record.final,'-','rested problem must remain unscored');
   assert.equal(await page.evaluate(()=>state.strategy.strain),0,'rest alone must not trigger an adaptive penalty');
   assert.equal(await page.evaluate(()=>state.strategy.maxLevel),3,'starting at easy must be allowed to reach advanced after independent success');
   assert.deepEqual(errors,[],'client errors on '+vp.name);
   console.log('PASS '+vp.name+': '+ids.length+' games have observation metadata, three 20-question content banks and valid rest semantics');
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

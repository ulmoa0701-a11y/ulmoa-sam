'use strict';
/* Real browser play-through. Confirms situations, not clinical transfer. */
const {chromium}=require('playwright-core'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const vp of [{name:'mobile',width:390,height:844},{name:'desktop',width:1280,height:900}]){
   const page=await browser.newPage({viewport:{width:vp.width,height:vp.height}});
   page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
   for(const length of [5,10,15,20]){
    for(const level of [1,2,3]){
     await page.goto('http://127.0.0.1:8765/thinking-garden/',{waitUntil:'load'});
     assert.equal(await page.evaluate(()=>MoaBagScenes.storyCount),20,'story bank not loaded');
     assert.equal(await page.evaluate(()=>MoaBagScenes.validate()),true);
     await page.locator('[data-open="slowEveryday"]').click();
     await page.locator('#slowLevel').selectOption(String(level));
     await page.locator('#sessionRounds').selectOption(String(length));
     await page.locator('#introStart').click();
     const seen=[];
     for(let round=0;round<length;round++){
      const view=await page.evaluate(()=>{
       const p=MoaBagScenes.makePlan(state.round,state.slowLook.level);
       const buttons=[...document.querySelectorAll('.slow-bag [data-slow="cell"]')];
       return {round:state.round,title:p.title,choices:p.choices.map(x=>x.id),correct:p.choices.filter(x=>x.correct).map(x=>x.id),buttons:buttons.length,scene:document.querySelector('.slow-bag-scene')?.textContent||'',width:document.documentElement.scrollWidth,window:innerWidth};
      });
      assert.equal(view.round,round,'round not advanced');
      assert.ok(view.scene.length>=2,'child scenario illustration missing');
      assert.equal(view.buttons,level+5,'wrong number of choice buttons');
      assert.equal(view.correct.length,level,'difficulty failed to change number of objects');
      assert.equal(new Set(view.choices).size,view.choices.length,'duplicate choice');
      assert.ok(view.width<=view.window+4,'horizontal scroll '+vp.name+'/'+length+'/'+level+'/'+round);
      seen.push(view.title);
      if(round===0){
       await page.locator('[data-slow="pause"]').click();
       assert.ok(await page.locator('.slow-pause-panel').isVisible(),'rest view missing');
       assert.ok(!(await page.locator('.slow-bag-story').isVisible()),'uncompleted scene visible during rest');
       await page.locator('[data-slow="resume"]').click();
       assert.equal(await page.locator('.slow-bag-story').isVisible(),true);
       const result=await page.evaluate(()=>{
        const plan=MoaBagScenes.makePlan(state.round,state.slowLook.level);
        const decoy=plan.choices.findIndex(x=>!x.correct);
        document.querySelectorAll('.slow-bag [data-slow="cell"]')[decoy].click();
        document.querySelector('[data-slow="check"]').click();
        return {first:state.slowLook.firstCorrect,attempts:state.slowLook.attempts};
       });
       assert.deepEqual(result,{first:false,attempts:1},'initial wrong choice not recorded');
      }
      await page.evaluate(()=>{
       const p=MoaBagScenes.makePlan(state.round,state.slowLook.level);
       const buttons=[...document.querySelectorAll('.slow-bag [data-slow="cell"]')];
       buttons.forEach((button,i)=>{
        const shouldSelect=p.choices[i].correct;
        if(button.getAttribute('aria-pressed')!==String(shouldSelect))button.click();
       });
       document.querySelector('[data-slow="check"]').click();
      });
      assert.ok(await page.locator('.slow-bag-arrival').isVisible(),'objects did not enter the bag at completion');
      assert.equal(await page.locator('.slow-bag-arrival').locator('.slow-bag-ready-icons').count(),1);
      await page.locator('[data-slow="next"]').click();
      if(round+1<length&&length>=10&&(round+1)%5===0){
       await page.locator('#practiceContinue').waitFor();
       await page.locator('#practiceContinue').click();
      }
      if(round+1<length)await page.waitForFunction(x=>state.round===x&&!!document.querySelector('.slow-bag-story'),round+1);
     }
     await page.locator('#resultScreen.active').waitFor();
     assert.equal(new Set(seen).size,length,'repeated situation within one session');
     const rec=await page.evaluate(()=>state.slowLook.records);
     assert.equal(rec.length,length,'missing clinical observation rows');
     assert.deepEqual([rec[0].first,rec[0].final,rec[0].retries,rec[0].pauses],['X','O',1,1],'first error, final recovery and pause must differ');
     assert.equal(rec.slice(1).filter(x=>x.first==='O'&&x.final==='O').length,length-1,'successful round not counted');
     console.log('PASS '+vp.name+' '+length+' rounds level '+level+' unique everyday situations, full completion, error recovery, pause and scene');
    }
   }
   assert.deepEqual(errors,[],'uncaught browser errors');
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

'use strict';
/* Browser checks reflect real game tasks, not child ability. */
const {chromium}=require('playwright-core'),assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
try{
for(const vp of [{name:'mobile',width:390,height:844},{name:'desktop',width:1280,height:900}]){
 const page=await browser.newPage({viewport:{width:vp.width,height:vp.height}});
 page.setDefaultTimeout(12000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/thinking-garden/',{waitUntil:'load'});
 for(const id of ['classroomMove','resetRescue']){
  for(const level of [1,2,3]){
   await page.evaluate(id=>openPreview(id),id);
   await page.locator('#slowLevel').selectOption(String(level));
   await page.locator('#sessionRounds').selectOption('20');
   await page.locator('#introStart').click();
   const seen=new Set();
   for(let round=0;round<20;round++){
    const v=await page.evaluate(round=>{
     state.round=round;renderRound();
     const r=state.strategy.r;
     if(state.game==='classroomMove'){
      return {key:r.tasks.map(x=>x.item+'@'+x.pos).join('|'),
        tasks:r.tasks.length,
        positions:r.tasks.map(x=>x.pos),
        correctGrid:r.tasks.every(t=>t.pos>=0&&t.pos<9&&t.pos!==4&&t.origin!==t.pos),
        completeGrid:document.querySelectorAll('.strategy-room-grid .strategy-room-square').length===9};
     }
     return {key:r.target+'|'+r.suggested,
       tasks:1,positions:[r.target],correctGrid:r.target!==undefined&&r.suggested!==undefined};
    },round);
    assert.ok(v.correctGrid,id+' impossible instruction or position at '+level+':'+round);
    if(id==='classroomMove'){
      assert.equal(v.tasks,level+1,'unexpected target load at '+level+':'+round);
      assert.equal(new Set(v.positions).size,v.tasks,'two items demand one spot');
      assert.ok(v.completeGrid,'missing nine cells');
    }
    assert.ok(!seen.has(v.key),id+' repeats a full mission at level '+level+':'+round);
    seen.add(v.key);
   }
   assert.equal(seen.size,20);
   await page.locator('#backHome').click();
  }
 }

 // Earned completion is verified by actual child-style actions, not by
 // programmatically forcing a success state or using an instructor shortcut.
 for(const id of ['resetRescue','classroomMove','festivalPlan']){
  await page.goto('http://127.0.0.1:8765/thinking-garden/?game='+id,{waitUntil:'domcontentloaded'});
  await page.locator('#introStart').click();
  await page.locator('[data-core="rest"]').click();
  assert.equal(await page.locator('.strategy-outcome-rest').count(),1,id+' skipped attempt should look neutral');
  assert.equal(await page.locator('.strategy-outcome-success').count(),0,id+' skipping must not earn celebration');
  await page.goto('http://127.0.0.1:8765/thinking-garden/?game='+id,{waitUntil:'domcontentloaded'});
  await page.locator('#introStart').click();
  if(id==='resetRescue'){
   await page.locator('[data-rec="question"]').click();
   const target=await page.evaluate(()=>state.strategy.r.target);
   await page.locator('[data-rec="pick"][data-id="'+target+'"]').click();
  }else if(id==='classroomMove'){
   const targets=await page.evaluate(()=>state.strategy.r.tasks.map(t=>({item:t.item,pos:t.pos})));
   for(const target of targets){
    await page.locator('[data-room="item"][data-i="'+target.item+'"]').click();
    await page.locator('[data-room="pos"][data-i="'+target.pos+'"]').click();
    await page.locator('[data-room="check"]').click();
   }
  }else{
   const count=await page.evaluate(()=>state.strategy.r.tasks.length);
   for(let n=0;n<count;n++)await page.locator('[data-plan="choose"][data-i="'+n+'"]').click();
   await page.locator('[data-plan="check"]').click();
  }
  assert.equal(await page.locator('.strategy-outcome-success').count(),1,id+' real solved scene should celebrate');
  assert.equal(await page.locator('.strategy-done [class^="strategy-win-"]').count(),1,id+' does not show unique earned scene');
 }

 assert.deepEqual(errors,[],'JS exceptions');
 console.log('PASS '+vp.name+' : classroom / rescue 20 unique game scenarios for all 3 difficulty levels');
 await page.close();
}
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

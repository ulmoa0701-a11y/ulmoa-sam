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
 assert.deepEqual(errors,[],'JS exceptions');
 console.log('PASS '+vp.name+' : classroom / rescue 20 unique game scenarios for all 3 difficulty levels');
 await page.close();
}
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

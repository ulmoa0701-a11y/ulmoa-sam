'use strict';
/* Real Chromium audit: 5/10/15/20 native game sessions, distinct
   memory and shape stimuli, and non-linear path routes. No clinical
   efficacy conclusions or precision claims are inferred from these tests. */
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base='http://127.0.0.1:8765/thinking-garden/';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 fs.mkdirSync('qa/practice-session-screenshots',{recursive:true});
 try{
  for(const viewport of [{name:'phone',width:390,height:844},{name:'desktop',width:1280,height:900}]){
   const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height}});
   page.setDefaultTimeout(12000);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base,{waitUntil:'load'});
   for(const count of [5,10,15,20]){
    // Unlike the approved external Phaser rescue game, these are native garden
    // games whose session length is configured in this screen.
    await page.evaluate(()=>openPreview('memory'));
    await page.locator('#sessionRounds').selectOption(String(count));
    await page.locator('#introStart').click();
    assert.equal(await page.evaluate(()=>state.roundTotal),count,'memory ignored '+count+' problem selection');
    await page.locator('#backHome').click();
   }
   await page.evaluate(()=>openPreview('memory'));
   await page.locator('#sessionRounds').selectOption('20');
   await page.locator('#introStart').click();
   const memories=[];
   for(let i=0;i<20;i++){
    const sample=await page.evaluate(n=>{
     state.round=n;renderRound();
     const tiles=[...document.querySelectorAll('.memory-strip .memory-tile')];
     const key=tiles.map(t=>t.querySelector('.memory-dot')?.style.backgroundColor||t.textContent.trim()).join('|');
     return {type:missionText.textContent.includes('색')?'color':'animal',len:tiles.length,key};
    },i);
    memories.push(sample.type+'|'+sample.len+'|'+sample.key);
   }
   assert.equal(new Set(memories).size,20,'a child encountered the same recall prompt twice in 20 rounds');
   await page.locator('#backHome').click();
   await page.evaluate(()=>openPreview('sameShape'));
   await page.locator('#sessionRounds').selectOption('20');
   await page.locator('#introStart').click();
   const shapes=[];
   for(let i=0;i<20;i++){
    const item=await page.evaluate(n=>{
     state.round=n;renderRound();
     const target=document.querySelector('.shape-target').textContent.trim();
     return {target,matching:[...document.querySelectorAll('.basic-choice')].filter(x=>x.dataset.shape===target).length,total:document.querySelectorAll('.basic-choice').length};
    },i);
    shapes.push(item.target);
    assert.equal(item.matching,1,'shape task must have exactly one answer at '+i);
    assert.ok(item.total>=3&&item.total<=6,'invalid distractor count '+i);
   }
   for(let start=0;start+6<=shapes.length;start+=6)assert.equal(new Set(shapes.slice(start,start+6)).size,6,'six-shape coverage absent '+start);
   await page.locator('#backHome').click();
   await page.evaluate(()=>openPreview('path'));
   await page.locator('#sessionRounds').selectOption('20');
   await page.locator('#introStart').click();
   const routes=[],firstPositions=[];
   for(let i=0;i<20;i++){
    const route=await page.evaluate(n=>{
     state.round=n;renderRound();
     const cards=[...document.querySelectorAll('.trail-node')];
     return {route:cards.slice().sort((a,b)=>+a.dataset.i-+b.dataset.i).map(x=>x.textContent).join(''),first:cards.findIndex(x=>x.classList.contains('ready')),
     unique:new Set(cards.map(x=>x.dataset.i)).size,len:cards.length};
    },i);
    assert.equal(route.unique,route.len,'route index duplicated '+i);
    assert.equal(route.len,4+Math.min(Math.min(4,i%5),3),'unexpected route length '+i);
    routes.push(route.route);firstPositions.push(route.first);
   }
   assert.equal(new Set(routes).size,20,'20 rounds still show identical path stories');
   assert.ok(firstPositions.some(i=>i!==0),'highlighted path always starts in first button');
   await page.evaluate(()=>{state.round=0;renderRound()});
   for(let i=0;i<4;i++)await page.locator('.trail-node[data-i="'+i+'"]').click();
   assert.equal(await page.locator('.trail-node.visited').count(),4,'path selection was not ordered by indicated step');
   await page.screenshot({path:'qa/practice-session-screenshots/'+viewport.name+'-path-diversity.png'});
   assert.deepEqual(errors,[],'JavaScript exceptions: '+viewport.name);
   console.log('PASS '+viewport.name+' 20 unique memory tasks, 20 distinct paths, 6-target shapes, count options 5/10/15/20');
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

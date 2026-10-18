'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright-core');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
 try{
  for(const device of [{name:'mobile',width:390,height:844},{name:'desktop',width:1280,height:900}]){
   const page=await browser.newPage({viewport:{width:device.width,height:device.height}});
   page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8765/thinking-garden/',{waitUntil:'load'});
   for(const id of ['slowPlace','slowBlock','slowMemory']){
    for(const level of [1,2,3]){
     await page.evaluate(x=>openPreview(x),id);
     await page.locator('#slowLevel').selectOption(String(level));
     await page.locator('#sessionRounds').selectOption('20');
     await page.locator('#introStart').click();
     const seen=new Set(),side=level===3?4:3,need=level===1?2:level===2?3:4;
     for(let i=0;i<20;i++){
      const trial=await page.evaluate(i=>{
       state.round=i;renderRound();
       const sample=document.querySelector('.slow-map-pair .slow-board');
       if(!sample)throw Error('missing model grid');
       return [...sample.children].flatMap((tile,j)=>tile.classList.contains('shown')?[j]:[]);
      },i);
      assert.equal(trial.length,need,id+' target quantity '+level+'/'+i);
      assert.equal(new Set(trial).size,need,id+' overlapping blocks');
      const cells=new Set(trial),visited=new Set([trial[0]]),open=[trial[0]];
      while(open.length){const at=open.pop(),r=Math.floor(at/side),c=at%side;
       for(const q of [r>0?at-side:-1,r<side-1?at+side:-1,c>0?at-1:-1,c<side-1?at+1:-1])
        if(q>=0&&cells.has(q)&&!visited.has(q)){visited.add(q);open.push(q)}
      }
      assert.equal(visited.size,need,id+' task contains isolated, confusing blocks');
      seen.add(trial.join(','));
     }
     assert.equal(seen.size,level===1?12:20,id+' unique physical patterns at level '+level);
     await page.locator('#backHome').click();
    }
   }
   await page.evaluate(()=>openPreview('slowName'));
   await page.locator('#introStart').click();
   await page.locator('[data-slow=ready]').click();
   await page.locator('[data-slow=name-wrong]').click();
   assert.equal(await page.evaluate(()=>state.slowLook.teacherCues),0,'an error is NOT a teacher-provided hint');
   await page.locator('.slow-task .slow-teacher-details summary').click();
   await page.locator('.slow-task [data-slow=hint]').click();
   assert.equal(await page.evaluate(()=>state.slowLook.teacherCues),1,'actual provided hint must be captured');
   assert.deepEqual(errors,[],'browser errors');
   console.log('PASS '+device.name+' 3 spatial games x 3 difficulties x 20 rounds; clinical hint attribution');
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

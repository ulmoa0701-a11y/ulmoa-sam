'use strict';
const {chromium}=require('playwright-core'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const viewport of [{name:'mobile',width:390,height:844},{name:'desktop',width:1280,height:900}]){
   const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height}});
   page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
   for(const level of [1,2,3]){
    for(const length of [5,10,15,20]){
     await page.goto('http://127.0.0.1:8765/thinking-garden/',{waitUntil:'load'});
     await page.locator('[data-open="slowBlock"]').click();
     await page.locator('#slowLevel').selectOption(String(level));
     await page.locator('#sessionRounds').selectOption(String(length));
     await page.locator('#introStart').click();
     let turns=0;
     for(let round=0;round<length;round++){
      const done=await page.evaluate((first)=>{
       const s=state.slowLook,n=s.level===3?4:3;
       if(!window.MoaBlockBuilder||!document.querySelector('.slow-block-story'))throw Error('architect controls missing');
       if(document.querySelectorAll('.slow-block-board').length!==2)throw Error('no spatial target and build area');
       const tiles=[...document.querySelector('.slow-block-board').querySelectorAll('.slow-tile')];
       const target=tiles.map((t,i)=>t.classList.contains('shown')?Math.floor(i/n)+','+(i%n):null).filter(Boolean);
       const quota=MoaBlockBuilder.quota(target.length);
       const adjacent=(pos,dir)=>{const [r,c]=pos.split(',').map(Number);return dir==='right'?r+','+(c+1):(r+1)+','+c};
       function solve(left,doubles,singles){
        if(!left.length)return doubles===0&&singles===0?[]:null;
        const first=left[0];
        if(doubles>0)for(const dir of ['right','down']){
         const next=adjacent(first,dir);
         if(left.includes(next)){
          const rest=solve(left.filter(x=>x!==first&&x!==next),doubles-1,singles);
          if(rest)return [{keys:[first,next],dir},...rest];
         }
        }
        if(singles>0){const rest=solve(left.filter(x=>x!==first),doubles,singles-1);if(rest)return [{keys:[first],dir:'right'},...rest];}
        return null;
       }
       const parts=solve(target,quota.double,quota.single);
       if(!parts)throw Error('Generated architect target cannot be built at level '+s.level+' round '+state.round);
       function click(sel){const b=document.querySelector(sel);if(!b||b.disabled)throw Error('Unavailable control '+sel);b.click();}
       if(first){
        click('[data-block="place"][data-key="0,0"]');
        click('[data-block="undo"]');
        if(s.blockEdits!==1||s.selected.size!==0)throw Error('Undo did not restore empty grid');
       }
       let rotated=0;
       for(const part of parts){
        const kind=part.keys.length===2?'double':'single';
        if(s.blockMode!==kind)click('[data-block="'+kind+'"]');
        if(kind==='double'&&s.blockDir!==part.dir){click('[data-block="rotate"]');rotated++;}
        click('[data-block="place"][data-key="'+part.keys[0]+'"]');
       }
       const selected=[...s.selected].sort().join('|');
       if(selected!==target.sort().join('|'))throw Error('Tiles selected not equal to goal '+selected+' / '+target);
       if(s.blockParts.length!==parts.length)throw Error('Incorrect piece count');
       click('[data-slow="check"]');
       if(!document.querySelector('.slow-block-built'))throw Error('No built-house event after successful construction');
       if(document.documentElement.scrollWidth>innerWidth+4)throw Error('Architect overflows '+innerWidth+'px');
       return {pieces:parts.length,rotated,notes:state.slowLook.records.at(-1)?.note};
      },round===0);
      turns+=done.rotated;
      await page.locator('[data-slow="next"]').click();
      if(round+1<length&&length>=10&&(round+1)%5===0){await page.locator('#practiceContinue').waitFor();await page.locator('#practiceContinue').click();}
      if(round+1<length)await page.waitForFunction(x=>state.round===x&&!!document.querySelector('.slow-block-story'),round+1);
     }
     await page.locator('#resultScreen.active').waitFor();
     const observations=await page.evaluate(()=>state.slowLook.records);
     assert.equal(observations.length,length);
     assert.equal(observations.filter(x=>x.first==='O'&&x.final==='O').length,length);
     assert.ok(observations[0].note.includes('조립 수정 1회'),'self-correction from undo was lost');
     assert.ok(turns>0,'rotation was never needed across '+length+' rounds');
     console.log('PASS block builder '+viewport.name+' level '+level+' length '+length+' physical two-piece assembly, rotations, self-correction and in-game house');
    }
   }
   assert.deepEqual(errors,[]);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

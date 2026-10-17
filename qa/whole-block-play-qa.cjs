'use strict';
/* Child-facing real play: move/rotate an entire construction piece to match
   the demonstrated spatial arrangement. Checks independent answer solvability,
   real button inputs, feedback and records. Does not measure treatment effect. */
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const url='http://127.0.0.1:8765/thinking-garden/';
function normalized(points){
 const minR=Math.min(...points.map(p=>p[0])),minC=Math.min(...points.map(p=>p[1]));
 return points.map(([r,c])=>(r-minR)+','+(c-minC)).sort().join('|');
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const vp of [{name:'mobile',width:390,height:844,level:'1',lengths:[5,10,15,20]},{name:'desktop',width:1280,height:900,level:'3',lengths:[5,20]}]){
   const page=await browser.newPage({viewport:{width:vp.width,height:vp.height}});page.setDefaultTimeout(14000);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   for(const rounds of vp.lengths){
    await page.goto(url,{waitUntil:'load'});
    await page.locator('[data-open="slowBlock"]').click();
    await page.locator('#slowLevel').selectOption(vp.level);
    await page.locator('#sessionRounds').selectOption(String(rounds));
    await page.locator('#introStart').click();
    assert.ok(await page.locator('.slow-block-board').isVisible());
    assert.equal(await page.locator('.slow-block-controls button').count(),5,'movement / rotation controls missing');
    assert.equal(await page.locator('.slow-map-pair .slow-board').count(),2);
    for(let round=0;round<rounds;round++){
     let target=await page.locator('.slow-block-pair>div:first-child .slow-board').evaluate(board=>{
      const side=Math.round(Math.sqrt(board.children.length));
      return [...board.children].flatMap((child,i)=>child.classList.contains('shown')?[[Math.floor(i/side),i%side]]:[]);
     });
     const desired=normalized(target),minR=Math.min(...target.map(p=>p[0])),minC=Math.min(...target.map(p=>p[1]));
     let matched=false;
     for(let rot=0;rot<4;rot++){
      const sample=await page.locator('.slow-block-filled').evaluateAll(nodes=>nodes.map(n=>n.dataset.key.split(',').map(Number)));
      if(normalized(sample)===desired){matched=true;break;}
      await page.locator('[data-slow="block-rotate"]').click();
     }
     assert.ok(matched,'target must be buildable by rotating one whole piece at round '+round);
     await page.locator('[data-slow="block-anchor"][data-key="'+minR+','+minC+'"]').click();
     assert.ok(await page.locator('[data-slow="check"]').isEnabled());
     await page.locator('[data-slow="check"]').click();
     assert.ok(await page.locator('.slow-block-complete').isVisible(),'construction must change the game scene');
     const rec=await page.evaluate(()=>state.slowLook.records.at(-1));
     assert.deepEqual([rec.first,rec.final],['O','O'],'solved scene must correspond to actual response');
     assert.ok(rec.moves>0,'rotation/placement actions not observed');
     if(round+1<rounds){
      await page.locator('[data-slow="next"]').click();
      if(rounds>=10&&(round+1)%5===0)await page.locator('#practiceContinue').click();
      await page.waitForFunction(next=>state.round===next&&!state.advancing&&!!document.querySelector('.slow-block-board'),round+1);
     }else{
      await page.locator('[data-slow="next"]').click();
      await page.locator('#resultScreen.active').waitFor();
     }
    }
    assert.equal(await page.evaluate(()=>state.slowLook.records.length),rounds,'lost practice-round records');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+4),true,'page overflows viewport');
    console.log('PASS whole-piece spatial construction '+vp.name+' level='+vp.level+' rounds='+rounds);
   }
   await page.goto(url,{waitUntil:'load'});
   await page.locator('[data-open="slowPlace"]').click();await page.locator('#introStart').click();
   assert.ok(await page.locator('.slow-map-pair button[data-slow="cell"]').count()>0,'position-copy activity must remain separate from construction');
   assert.equal(await page.locator('.slow-block-controls').count(),0,'construction controls leaked into position copying');
   assert.deepEqual(errors,[],'browser JS errors');
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

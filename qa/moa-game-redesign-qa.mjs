import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
const failures=[],results=[];
const check=(v,s)=>{if(!v)failures.push(s)};
const artifact='qa/moa-game-redesign-artifacts';fs.mkdirSync(artifact,{recursive:true});
const shared=['memory','spacing','spelling','sameShape','flower','hide','path','calm','inside','targets','resetRescue','classroomMove','festivalPlan','rulePost','mirrorPond','sceneDetect','slowScan','slowPlace','slowBlock','slowName','slowMemory','slowEveryday','paint','water'];
const standalone=[
 ['rescue','/thinking-garden/games/rescue/'],['hand-mirror','/thinking-garden/games/hand-mirror/'],
 ['money','/thinking-garden/games/moa-missions/?game=money'],
 ['change','/thinking-garden/games/moa-missions/?game=change'],
 ['feel','/thinking-garden/games/moa-missions/?game=feel'],
 ['rhythm-touch','/thinking-garden/games/rhythm-touch/'],
 ['recorder','/thinking-garden/recorder/'],
 ['strength','/breath-garden/?mode=strength'],['long','/breath-garden/?mode=long'],['beat','/breath-garden/?mode=beat']
];
for(const width of [390,1366]){
 const context=await browser.newContext({viewport:{width,height:width===390?844:900},reducedMotion:'reduce'});
 const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message.slice(0,180)));
 for(const id of shared){
  errors.length=0;
  try{
   const res=await page.goto(base+'/thinking-garden/?game='+id,{waitUntil:'domcontentloaded',timeout:26000});
   check(res?.ok(),width+' '+id+' HTTP error');
   await page.locator('#introStart').click({timeout:9000});
   await page.waitForTimeout(80);
   check(await page.locator('#gameScreen.active').isVisible(),width+' '+id+' playable game missing');
   const compass=page.locator('.moa-play-compass');
   check(await compass.isVisible(),width+' '+id+' task guide missing');
   check((await compass.locator('.moa-compass-goal').textContent()).trim().length>4,width+' '+id+' objective empty');
   await compass.locator('.moa-compass-help').click();
   check(await compass.locator('.moa-compass-steps li').count()===3,width+' '+id+' action steps missing');
   const horizontal=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   check(horizontal<=6,width+' '+id+' horizontal overflow '+horizontal);
   // All 24 shared gameplay areas are captured, not only their gallery cards.
   // Keeping one capture per viewport makes visual regression review possible.
   const gameRoot=page.locator('#gameArea');
   check(await gameRoot.count()===1,width+' '+id+' no actual playable area');
   check((await gameRoot.innerHTML()).length>80,width+' '+id+' empty gameplay stage');
   await gameRoot.screenshot({path:path.join(artifact,id+'-'+(width===390?'mobile':'desktop')+'-play.png'),timeout:12000});
   if(id==='hide'){
     const clues=await page.locator('.leaf-has-clue').count();
     check(clues>=2,width+' leaf game has no observable clues');
     check(await page.locator('.leaf-no-clue').count()>=1,width+' leaves need distractors');
     check(await page.locator('.leaf-example').isVisible(),width+' leaf clue needs picture-only example');
     check((await page.locator('.leaf-has-clue .leaf-trail').first().textContent()).includes('🐾'),width+' footprint should be recognizable');
     await page.locator('.leaf-no-clue').first().click();
     check((await page.locator('#miniCount').textContent()).includes('0 /'),width+' empty leaf must not count');
     await page.locator('.leaf-has-clue').first().click();
     check((await page.locator('#miniCount').textContent()).includes('1 /'),width+' clue-based leaf must count');
    }
   if(id==='sameShape')check(await page.locator('.shape-adventure .shape-target').count()===1,width+' shape target is not visually separated');
   if(id==='flower'){
    check(await page.locator('.flower-basket').count()===1,width+' flower basket missing');
    await page.locator('.flower-collect .object-btn[data-good="1"]').first().click();
    check((await page.locator('#flowerCollected').textContent()).includes('1 /'),width+' collected flower not tracked');
   }
   if(id==='targets'){
    check(await page.locator('.wake-scene-head').count()===1,width+' wake seeds need a goal scene');
    await page.locator('.wake-target').first().click();
    check(await page.locator('.wake-target.awake').count()===1,width+' tapped seed did not bloom');
   }
   if(id==='paint'){
    check(await page.locator('#paintGrid i').count()>=12,width+' paint cells missing');
    await page.evaluate(()=>{
      const cells=document.querySelectorAll('#paintGrid i'),grid=document.querySelector('#paintGrid');
      const first=cells[0].getBoundingClientRect(),fourth=cells[3].getBoundingClientRect();
       cells[0].dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',pointerId:1,clientX:first.x+first.width/2,clientY:first.y+first.height/2}));
       grid.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'touch',pointerId:1,clientX:fourth.x+fourth.width/2,clientY:fourth.y+fourth.height/2}));
       grid.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:1,clientX:fourth.x+fourth.width/2,clientY:fourth.y+fourth.height/2}));
    });
    check(await page.locator('#paintGrid i.painted').count()>=4,width+' fast touch drag skipped an intermediate cell');
   }
   check(errors.length===0,width+' '+id+' JavaScript errors '+errors.join('; '));
   results.push({id,width,result:'checked'});
  }catch(e){failures.push(width+' '+id+' error '+String(e).slice(0,370))}
 }
 await context.close();
}
for(const [id,url] of standalone){
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message.slice(0,180)));
 try{
  const r=await page.goto(base+url,{waitUntil:'domcontentloaded',timeout:25000});
  check(r?.ok(),id+' standalone HTTP error');
  await page.waitForTimeout(160);
  if(id==='rescue'){
    try{await page.locator('#game canvas').first().waitFor({state:'attached',timeout:13000});}
    catch{check(false,'rescue Phaser canvas did not start after Korean font readiness')}
  }
  const help=page.locator('.moa-quick-guide');
  check(await help.isVisible(),id+' standalone goal missing');
  const goal=await help.locator('.moa-quick-goal').textContent();
  check(goal.trim().length>10,id+' standalone objective too vague');
  await help.locator('.moa-quick-toggle').click();
  check(await help.locator('.moa-quick-steps li').count()===3,id+' standalone guide steps missing');
  check(await help.locator('.moa-quick-steps').isVisible(),id+' standalone steps not expanded');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  check(overflow<=9,id+' standalone mobile overflow '+overflow);
  await page.screenshot({path:path.join(artifact,id+'-mobile-entry.png'),fullPage:false});
  check(errors.length===0,id+' page script errors '+errors.join('; '));
  results.push({id,width:390,result:'checked'});
 }catch(e){failures.push(id+' standalone exception '+String(e).slice(0,350))}
 await context.close();
}
await browser.close();
fs.writeFileSync(path.join(artifact,'report.json'),JSON.stringify({checked:results.length,expected:shared.length*2+standalone.length,playAreasCaptured:shared.length*2,standaloneEntryScreens:standalone.length,failures,results},null,2));
if(failures.length){console.error('MOA 34-GAME QA FAILED '+JSON.stringify(failures));process.exit(1)}
console.log('PASS: '+shared.length+' shared games in mobile+desktop and '+standalone.length+' independent playable game help screens, no script errors');

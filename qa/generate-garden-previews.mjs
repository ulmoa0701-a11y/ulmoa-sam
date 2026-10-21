import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const repoRoot=process.cwd(),outDir=path.join(repoRoot,'gardens','previews');
fs.mkdirSync(outDir,{recursive:true});
const base='http://127.0.0.1:8765';
const nativeIds=['memory','sameShape','flower','hide','path','calm','inside','targets','sceneDetect','slowScan','slowPlace','slowBlock','slowName','slowMemory','paint','water','resetRescue','classroomMove','rulePost','mirrorPond','festivalPlan','spacing','spelling','slowEveryday'];
const specials=[
 ['rescue','/thinking-garden/games/rescue/','#gameScreen','#appShell,.app-shell,main'],
 ['hand-mirror','/thinking-garden/games/hand-mirror/','#play','#app,.shell,.panel,main'],
 ['change','/thinking-garden/games/moa-missions/?game=change','#playScreen','#gameArea'],
 ['money','/thinking-garden/games/moa-missions/?game=money','#playScreen','#gameArea'],
 ['feel','/thinking-garden/games/moa-missions/?game=feel','#playScreen','#gameArea'],
 ['rhythm-touch','/thinking-garden/games/rhythm-touch/','#gameScreen','#gameArea,main'],
 ['recorder','/thinking-garden/recorder/','#gameScreen','#gameArea,main'],
 ['beat','/breath-garden/?mode=beat','#gameScreen','#gameScreen,main'],
 ['strength','/breath-garden/?mode=strength','#gameScreen','#gameScreen,main'],
 ['long','/breath-garden/?mode=long','#gameScreen','#gameScreen,main']
];
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const report=[];
const settings={type:'jpeg',quality:79,animations:'disabled',timeout:7000};
async function snap(page,selector,name,record){
 // CSS comma selector matching is DOM-ordered. Try candidate gameplay
 // regions in explicit priority order rather than capturing their parent.
 for(const region of selector.split(',').map(x=>x.trim()).filter(Boolean)){
  const loc=page.locator(region).first();
  try{
   if(!await loc.isVisible())continue;
   const box=await loc.boundingBox();
   if(!box||box.width<80||box.height<65)continue;
   await loc.screenshot({...settings,path:path.join(outDir,name+'.jpg')});
   if(record)record.playSelector=region;
   return true;
  }catch{/* Try next visible interactive region. */}
 }
 return false;
}
async function capture(id,url,{native=false}={}){
 const context=await browser.newContext({viewport:{width:1024,height:740},deviceScaleFactor:1,reducedMotion:'reduce',permissions:[]});
 const page=await context.newPage();
 const entry={id,url,preview:false,play:false,errors:[]};
 page.on('pageerror',e=>entry.errors.push(e.message.slice(0,100)));
 try{
  const r=await page.goto(base+url,{waitUntil:'domcontentloaded',timeout:21000});
  if(!r?.ok())throw Error('HTTP '+r?.status());
  // Wait for readable Korean webfonts before screenshotting game text.
  await page.evaluate(async()=>{if(document.fonts?.ready)await document.fonts.ready;});
  await page.waitForTimeout(450);
  if(id==='rescue'){
   // Its Phaser game now waits for Korean font loading before creating the canvas.
   try {await page.locator('#game canvas').first().waitFor({state:'visible',timeout:10000});await page.waitForTimeout(450);}
   catch {entry.errors.push('rescue canvas unavailable after Korean font readiness');}
  }
  if(native){
   entry.preview=await snap(page,'#introPreview',id);
   const start=page.locator('#introStart');
   if(await start.isVisible()){
    await start.click({timeout:2000});await page.waitForTimeout(420);
    if(id==='memory'){
     // A genuine recall choice and a partly filled picnic basket communicate
     // the game's distinctive action better than its static study phase.
     const first=await page.locator('.memory-strip .memory-tile').first().evaluate(el=>{
      const dot=el.querySelector('.memory-dot');
      return dot?{type:'color',value:dot.style.backgroundColor}:{type:'animal',value:el.querySelector('.memory-animal')?.textContent?.trim()};
     });
     await page.locator('.memory-ready').click();
     const index=await page.locator('.memory-choice').evaluateAll((items,answer)=>items.findIndex(el=>{
      const dot=el.querySelector('.memory-dot');
      const token=dot?{type:'color',value:dot.style.backgroundColor}:{type:'animal',value:el.querySelector('.memory-animal')?.textContent?.trim()};
      return token.type===answer.type&&token.value===answer.value;
     }),first);
     if(index<0)throw Error('Memory answer not found in recalled choices');
     await page.locator('.memory-choice').nth(index).click();
     await page.locator('.basket-slot.filled').first().waitFor({state:'visible'});
     entry.playState='recall-with-basket';
    }else if(id==='paint'){
     // A blank 12-cell frame is not an informative game photo.
     const tiles=page.locator('#paintGrid i');
     for(let i=0;i<4;i++)await tiles.nth(i).click();
     if(await page.locator('#paintGrid i.painted').count()!==4)throw Error('Flower path did not grow');
     entry.playState='flower-trail-growing';
    }else if(id==='inside'){
     await page.locator('#insideZone').click({position:{x:76,y:66}});
     await page.locator('#insideZone').click({position:{x:135,y:74}});
     if(await page.locator('#insideZone i').count()<2)throw Error('Stars were not planted');
     entry.playState='planted-stars';
    }else if(id==='targets'){
     await page.locator('.wake-target[data-ready="0"]').first().click();
     await page.locator('.wake-target[data-ready="0"]').first().click();
     if(await page.locator('.wake-target.awake').count()<2)throw Error('Seeds did not bloom');
     entry.playState='growing-garden';
    }
    entry.play=await snap(page,'#gameArea .slow-task,#gameArea .basic-game,#gameArea .garden-adventure,#gameArea .novel-game,#gameArea > :first-child,#gameArea,#gameWorld',id+'-play',entry);
   }
  }else if(id==='recorder'){
   // The recorder's actual exercise is #practiceScreen, not #gameScreen.
   // Never publish the home screen as a successful game screenshot.
   entry.preview=await snap(page,'#homeScreen',id);
   await page.locator('#homeScreen [data-start="easy"]').click({timeout:2500});
   await page.locator('#practiceScreen').waitFor({state:'visible',timeout:5000});
   await page.waitForFunction(()=>{
    const stage=document.querySelector('#practiceScreen');
    return stage&&!stage.hidden&&stage.querySelectorAll('#guideRecorder .hole').length===8
      &&stage.querySelectorAll('#playerRecorder .hole').length===8;
   },{timeout:5000});
   entry.play=await snap(page,'#practiceScreen',id+'-play',entry);
   if(!entry.play)throw Error('Recorder practice stage was not photographed');
   entry.playState='practice';
  }else if(['money','change','feel'].includes(id)){
   await page.locator('#startGame').click({timeout:1500});
   await page.locator('#playScreen').waitFor({state:'visible',timeout:4000});
   await page.waitForTimeout(240);
   // The first gameArea child can be a tiny coin; include the actual
   // instruction, task, answer controls and progress in the photo.
   entry.play=await snap(page,'#playScreen',id+'-play',entry);
   entry.preview=await snap(page,'.mission-banner',id);
  }else if(id==='hand-mirror'){
   entry.preview=await snap(page,'.intro',id);
   try{await page.locator('#touchStart').click({timeout:900});await page.waitForTimeout(260);
     entry.play=await snap(page,'.garden-stage,#viewer,.play-panel,#play,.shell main',id+'-play',entry);
   }catch{}
  }else if(id==='rescue'){
   entry.preview=await snap(page,'.app-shell',id);
   // The rescue title and briefing buttons are rendered inside Phaser's
   // canvas, not as DOM buttons. Drive the real two-click player route.
   const canvas=page.locator('#game canvas').first();
   await canvas.waitFor({state:'visible',timeout:12000});
   await page.waitForFunction(()=>{
    const sm=window.moaRescueGame?.scene;
    return !!sm&&(sm.isActive('landtitle')||sm.isActive('title'));
   },null,{timeout:12000});
   const wide=await page.evaluate(()=>window.moaRescueGame.scene.isActive('landtitle'));
   const rect=await canvas.boundingBox();
   if(!rect||rect.width<300||rect.height<250)throw Error('Rescue canvas is too small');
   if(!wide)throw Error('Desktop rescue capture unexpectedly opened portrait scene');
   await canvas.click({position:{x:Math.round(rect.width*.5),y:Math.round(rect.height*(619/760))}});
   await page.waitForFunction(()=>window.moaRescueGame?.scene?.isActive('landmission'),null,{timeout:10000});
   await canvas.click({position:{x:Math.round(rect.width*(754/1200)),y:Math.round(rect.height*(498/760))}});
   await page.waitForFunction(()=>{
    const scene=window.moaRescueGame?.scene?.getScene('landmission');
    return scene?.sys?.isActive()&&scene.targets?.length>=2&&!scene.lock;
   },null,{timeout:10000});
   entry.play=await snap(page,'#game canvas',id+'-play',entry);
   if(!entry.play)throw Error('Rescue mission animals were not photographed');
   entry.playState='mission';
  }else{
   entry.preview=await snap(page,'main',id);
   if(id==='strength'){await page.locator('#chooseStrength').click({timeout:1000}).catch(()=>{});}
   if(id==='long'){await page.locator('#chooseLong').click({timeout:1000}).catch(()=>{});}
   if(id==='beat'){await page.locator('#chooseBeat').click({timeout:1000}).catch(()=>{});}
   await page.waitForTimeout(280);
   entry.play=await snap(page,'.game-area,.game-scene,#gameScreen:not([hidden]),main',id+'-play',entry);
  }
  // If the game stage requires a camera or another input, preserve its authentic intro/preview.
  if(!entry.play&&entry.preview){fs.copyFileSync(path.join(outDir,id+'.jpg'),path.join(outDir,id+'-play.jpg'));entry.play=true;entry.introOnly=true;entry.playSelector='preview-fallback';}
  if(!entry.preview&&entry.play){fs.copyFileSync(path.join(outDir,id+'-play.jpg'),path.join(outDir,id+'.jpg'));entry.preview=true;}
  if(!entry.play&&!entry.preview){entry.errors.push('No meaningful visible game region captured');}
 }catch(e){entry.errors.push(String(e).slice(0,170));}
 finally{report.push(entry);await context.close()}
}
for(const id of nativeIds)await capture(id,'/thinking-garden/?game='+id,{native:true});
for(const [id,url] of specials)await capture(id,url);
await browser.close();
const ok=report.filter(x=>x.play&&x.preview),notOk=report.filter(x=>!x.play||!x.preview);
const missedNative=report.filter(x=>nativeIds.includes(x.id)&&(!x.playSelector||!x.playSelector.startsWith('#gameArea')));
if(missedNative.length){console.error('Native game screenshot shows an intro or full page, not play: '+missedNative.map(x=>x.id+':'+(x.playSelector||'none')).join(', '));process.exitCode=1;}
for(const [id,stage] of [['memory','recall-with-basket'],['paint','flower-trail-growing'],['inside','planted-stars'],['targets','growing-garden']]){
 const item=report.find(x=>x.id===id);
 if(!item?.play||item.playState!==stage||!item.playSelector?.startsWith('#gameArea')){
  console.error('Game card is not a demonstrated play state: '+id);
  process.exitCode=1;
 }
}
const rescue=report.find(x=>x.id==='rescue');
if(!rescue?.play||rescue.playState!=='mission'||rescue.playSelector!=='#game canvas'){
 console.error('Rescue preview is not a validated, playable search mission');
 process.exitCode=1;
}
const recorder=report.find(x=>x.id==='recorder');
if(!recorder?.play||recorder.playState!=='practice'||recorder.playSelector!=='#practiceScreen'){
 console.error('Recorder preview is not a validated, interactive fingering exercise');
 process.exitCode=1;
}

fs.writeFileSync(path.join(outDir,'capture-report.json'),JSON.stringify({count:report.length,ok:ok.length,notOk:notOk.map(x=>({id:x.id,errors:x.errors})),report},null,2));
console.log(JSON.stringify({requested:report.length,ok:ok.length,introOnly:ok.filter(x=>x.introOnly).map(x=>x.id),missing:notOk.map(x=>x.id)},null,2));
if(notOk.length){console.error('Missing captures: '+notOk.map(x=>x.id).join(', '));process.exitCode=1}
if(ok.length<28){console.error('Too few live captures; abort publishing misleading fallback images.');process.exitCode=1}

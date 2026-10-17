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
async function snap(page,selector,name){
 const loc=page.locator(selector).first();
 try{
  if(!await loc.isVisible())return false;
  const box=await loc.boundingBox();
  if(!box||box.width<80||box.height<65)return false;
  await loc.screenshot({...settings,path:path.join(outDir,name+'.jpg')});
  return true;
 }catch{return false}
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
    await start.click({timeout:2000});await page.waitForTimeout(600);
    // Capture the hands-on puzzle rather than the whole page, tiny instructions or header.
    entry.play=await snap(page,'#gameArea .basic-game, #gameArea .novel-quest, #gameArea .strategy-quest, #gameArea .slow-native, #gameArea',id+'-play');
   }
  }else if(['money','change','feel'].includes(id)){
   await page.locator('#startGame').click({timeout:1500});await page.waitForTimeout(240);
   entry.play=await snap(page,'#gameArea',id+'-play');
   entry.preview=await snap(page,'.mission-banner',id);
  }else if(id==='hand-mirror'){
   entry.preview=await snap(page,'.intro',id);
   try{await page.locator('#touchStart').click({timeout:900});await page.waitForTimeout(260);
     entry.play=await snap(page,'#game .viewer, #game .garden-scene, #game .camera-panel, #game',id+'-play');
   }catch{}
  }else if(id==='rescue'){
   entry.preview=await snap(page,'.app-shell',id);
   for(const sel of ['#startBtn','#startMission','#goBtn','#beginBtn','button:has-text("출동")','button:has-text("시작")']){
     const b=page.locator(sel).first();
     if(await b.isVisible().catch(()=>false)){await b.click({timeout:1000}).catch(()=>{});await page.waitForTimeout(320);break}
   }
   entry.play=await snap(page,'#game canvas, #gameScreen .game-world, .rescue-scene, #gameScreen, .app-shell',id+'-play');
  }else{
   entry.preview=await snap(page,'main',id);
   if(id==='strength'){await page.locator('#chooseStrength').click({timeout:1000}).catch(()=>{});}
   if(id==='long'){await page.locator('#chooseLong').click({timeout:1000}).catch(()=>{});}
   if(id==='beat'){await page.locator('#chooseBeat').click({timeout:1000}).catch(()=>{});}
   await page.waitForTimeout(280);
   entry.play=await snap(page,'#gameArea:visible, #gameScreen:not([hidden]), .game-scene, .game-area, main',id+'-play');
  }
  // If the game stage requires a camera or another input, preserve its authentic intro/preview.
  if(!entry.play&&entry.preview){fs.copyFileSync(path.join(outDir,id+'.jpg'),path.join(outDir,id+'-play.jpg'));entry.play=true;entry.introOnly=true;}
  if(!entry.preview&&entry.play){fs.copyFileSync(path.join(outDir,id+'-play.jpg'),path.join(outDir,id+'.jpg'));entry.preview=true;}
  if(!entry.play&&!entry.preview){entry.errors.push('No meaningful visible game region captured');}
  entry.focusedPlay=entry.play&&!entry.introOnly;
 }catch(e){entry.errors.push(String(e).slice(0,170));}
 finally{report.push(entry);await context.close()}
}
for(const id of nativeIds)await capture(id,'/thinking-garden/?game='+id,{native:true});
for(const [id,url] of specials)await capture(id,url);
await browser.close();
const ok=report.filter(x=>x.play&&x.preview),notOk=report.filter(x=>!x.play||!x.preview);
fs.writeFileSync(path.join(outDir,'capture-report.json'),JSON.stringify({count:report.length,ok:ok.length,notOk:notOk.map(x=>({id:x.id,errors:x.errors})),report},null,2));
console.log(JSON.stringify({requested:report.length,ok:ok.length,introOnly:ok.filter(x=>x.introOnly).map(x=>x.id),missing:notOk.map(x=>x.id)},null,2));
if(ok.length<28){console.error('Too few live captures; abort publishing misleading fallback images.');process.exit(1)}

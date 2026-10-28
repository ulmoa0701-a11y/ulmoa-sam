import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const repoRoot=process.cwd(),outDir=path.join(repoRoot,'qa','garden-internal-design-artifacts');
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
let currentDevice='pc',screenWidth=1280,screenHeight=900;
const settings={type:'png',animations:'disabled',timeout:14000};
async function snap(page,selector,name,record){
 // CSS comma selector matching is DOM-ordered. Try candidate gameplay
 // regions in explicit priority order rather than capturing their parent.
 for(const region of selector.split(',').map(x=>x.trim()).filter(Boolean)){
  const loc=page.locator(region).first();
  try{
   if(!await loc.isVisible())continue;
   const box=await loc.boundingBox();
   if(!box||box.width<80||box.height<65)continue;
   await loc.screenshot({...settings,path:path.join(outDir,currentDevice+'-'+name+'.png')});
   if(record)record.playSelector=region;
   return true;
  }catch{/* Try next visible interactive region. */}
 }
 return false;
}
async function capture(id,url,{native=false}={}){
 const context=await browser.newContext({viewport:{width:screenWidth,height:screenHeight},isMobile:screenWidth<=500,hasTouch:screenWidth<=500,deviceScaleFactor:1,reducedMotion:'reduce',permissions:[]});
 const page=await context.newPage();
 const entry={id,url,device:currentDevice,viewport:[screenWidth,screenHeight],preview:false,play:false,playState:null,errors:[]};
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
  }else if(id==='rhythm-touch'){
   entry.preview=await snap(page,'main',id);
   await page.locator('#startBtn').click({timeout:3500});
   await page.waitForTimeout(350);
   entry.play=await snap(page,'.game',id+'-play',entry);
   entry.playState='song-started';
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
   // Phaser has two real layouts. Click their actual title/briefing controls,
   // never mark the portrait title screen as completed gameplay.
   const worldWidth=wide?1200:720,worldHeight=wide?760:1280;
   const titleStart={x:wide?600:360,y:wide?619:1030};
   const dispatch={x:wide?754:360,y:wide?498:827};
   const sceneName=wide?'landmission':'mission';
   await canvas.click({position:{x:Math.round(rect.width*titleStart.x/worldWidth),y:Math.round(rect.height*titleStart.y/worldHeight)}});
   await page.waitForFunction(name=>window.moaRescueGame?.scene?.isActive(name),sceneName,{timeout:10000});
   await canvas.click({position:{x:Math.round(rect.width*dispatch.x/worldWidth),y:Math.round(rect.height*dispatch.y/worldHeight)}});
   await page.waitForFunction(name=>{
    const scene=window.moaRescueGame?.scene?.getScene(name);
    return scene?.sys?.isActive()&&!scene.lock&&(name==='landmission'?scene.targets?.length>=2:scene.actors?.length>=2);
   },sceneName,{timeout:10000});
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
  if(!entry.play){entry.introOnly=true;entry.errors.push('Playable state not confirmed; intro is NOT gameplay');}
  if(!entry.preview&&entry.play){entry.errors.push('No intro/first impression captured');}
 }catch(e){entry.errors.push(String(e).slice(0,170));}
 finally{
  // Layout findings are measured from the actual game page, not from its catalog card.
  try{
   entry.metrics=await page.evaluate(()=>{
    const vw=innerWidth,vh=innerHeight;
    const visible=el=>{const box=el.getBoundingClientRect(),st=getComputedStyle(el);return box.width>2&&box.height>2&&st.visibility!=='hidden'&&st.display!=='none'&&Number(st.opacity)>0};
    const nodes=[...document.querySelectorAll('button,a[href],input,select,[role="button"]')].filter(visible);
    const touchTooSmall=nodes.filter(el=>{const b=el.getBoundingClientRect();return (b.width<36||b.height<36)&&!el.matches('[hidden]')}).slice(0,18).map(el=>({name:(el.getAttribute('aria-label')||el.textContent||el.id||el.className||'').trim().slice(0,45),size:[Math.round(el.getBoundingClientRect().width),Math.round(el.getBoundingClientRect().height)]}));
    const clipped=[...document.querySelectorAll('h1,h2,h3,p,label,button,small,strong')].filter(visible).filter(el=>{const st=getComputedStyle(el);return (st.overflowX==='hidden'||st.overflowY==='hidden')&&(el.scrollWidth>el.clientWidth+6||el.scrollHeight>el.clientHeight+6)}).slice(0,16).map(el=>({tag:el.tagName,name:(el.innerText||el.textContent||'').trim().slice(0,65),width:el.clientWidth,scrollWidth:el.scrollWidth,height:el.clientHeight,scrollHeight:el.scrollHeight}));
    const broken=[...document.images].filter(el=>visible(el)&&el.complete&&el.naturalWidth===0).map(el=>el.getAttribute('src')).slice(0,12);
    const candidates=['#gameArea','#gameScreen','#playScreen','#practiceScreen','#play','#viewer','#featherStage','#longProgress','#beatScene','#game canvas','.game'];
    const stage=candidates.map(selector=>({selector,el:document.querySelector(selector)})).find(x=>x.el&&visible(x.el));
    const b=stage?.el?.getBoundingClientRect();
    return {documentWidth:document.documentElement.scrollWidth,viewportWidth:vw,viewportHeight:vh,scrollHeight:document.documentElement.scrollHeight,horizontalOverflow:Math.max(0,document.documentElement.scrollWidth-vw),stage:stage?{selector:stage.selector,rect:{x:Math.round(b.x),y:Math.round(b.y),width:Math.round(b.width),height:Math.round(b.height),bottom:Math.round(b.bottom)}}:null,visibleControls:nodes.length,touchTooSmall,clipped,broken,fontsReady:document.fonts?.status};
   });
   await page.screenshot({path:path.join(outDir,currentDevice+'-'+id+'-whole-page.png'),fullPage:true,animations:'disabled',timeout:18000});
  }catch(e){entry.errors.push('Visual diagnostics: '+String(e).slice(0,160));}
  report.push(entry);await context.close();
 }
}
// Screenshots of genuine intro and game-stage states on two physical viewport sizes.
// This audit does not claim a playable mission for intro-only camera/portrait screens.
for(const vp of [
 {name:'mobile-390',width:390,height:844},
 {name:'desktop-1280',width:1280,height:900},
 {name:'small-mobile-360',width:360,height:740}
].filter(v=>!process.env.QA_DEVICE||v.name===process.env.QA_DEVICE)){
 currentDevice=vp.name;screenWidth=vp.width;screenHeight=vp.height;
 for(const id of nativeIds)await capture(id,'/thinking-garden/?game='+id,{native:true});
 for(const [id,url] of specials)await capture(id,url);
}
await browser.close();
const expected=34*(process.env.QA_DEVICE?1:3), missing=report.filter(x=>!x.play);
const hard=report.filter(x=>x.metrics?.horizontalOverflow>6||x.metrics?.broken?.length>0||x.errors.some(e=>/HTTP 404|SyntaxError/.test(e)));
const summary={scope:'34 game INTERNAL UI desktop/mobile screenshot and automated layout inspection; first interaction where supported; camera and breathing remain synthetic/unverified',head:process.env.GITHUB_SHA||null,total:report.length,expected,visualPlayConfirmed:report.filter(x=>x.play).length,introOnly:missing.map(x=>({id:x.id,device:x.device,reason:x.errors})),hardFailures:hard.map(x=>({id:x.id,device:x.device,metrics:x.metrics,errors:x.errors})),metrics:report};
fs.writeFileSync(path.join(outDir,'report.json'),JSON.stringify(summary,null,2)+'\n');
console.log('GARDEN-INTERNAL-VISUAL '+JSON.stringify({total:summary.total,expected,visualPlayConfirmed:summary.visualPlayConfirmed,introOnly:summary.introOnly,hardFailures:summary.hardFailures.map(x=>({id:x.id,device:x.device}))}));
if(report.length!==expected||hard.length)process.exitCode=1;

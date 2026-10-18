import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright-core';

const base=(process.env.TEST_BASE_URL||'http://127.0.0.1:8765').replace(/\/$/,'');
const out='qa/hand-mirror-artifacts/'+(process.env.LIVE_TEST?'live':'staging');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN,args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
const url=base+'/thinking-garden/games/hand-mirror/';
const results=[];
const fakeModel=[
 'export const FilesetResolver={forVisionTasks:async()=>({})};',
 'export const HandLandmarker={createFromOptions:async()=>({',
 'detectForVideo(){',
 'if(globalThis.__modelError)throw new Error("model-inference-test-error");',
 'const count=globalThis.__hands??1;',
 'const pattern={palm:[1,1,1,1],fist:[0,0,0,0],one:[1,0,0,0],two:[1,1,0,0],three:[1,1,1,0],pinky:[0,0,0,1],outerThree:[1,0,1,1]};',
 'const poses=globalThis.__handPoses||Array(count).fill(globalThis.__pose||"fist");',
 'const hands=poses.slice(0,count).map((kind,index)=>{',
 'const a=Array.from({length:21},()=>({x:.5,y:.85}));',
 '[[5,6,8],[9,10,12],[13,14,16],[17,18,20]].forEach(([m,p,t],i)=>{',
 'a[m]={x:.22+i*.12+index*.1,y:.65};a[p]={x:.22+i*.12+index*.1,y:.5};',
 'a[t]={x:.22+i*.12+index*.1,y:pattern[kind][i]===1?.19:.60};',
 '});return a;',
 '});',
 'return {landmarks:hands};',
 '},close(){globalThis.__modelClosed=(globalThis.__modelClosed||0)+1}',
 '})};'
].join('\n');
async function ctx(viewport){
 const c=await browser.newContext({viewport,locale:'ko-KR',permissions:['camera']});
 const p=await c.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{
   globalThis.__pose='fist';globalThis.__hands=1;globalThis.__brightness=120;globalThis.__modelError=false;
   const old=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(...args){
     const x=old.apply(this,args);
     if(this.width===30&&this.height===22&&x){
       const orig=x.getImageData.bind(x);
       x.getImageData=function(...a){
         if(globalThis.__brightness===null)throw new Error('unreadable brightness');
         const data=orig(...a);
         for(let i=0;i<data.data.length;i+=4){
           data.data[i]=data.data[i+1]=data.data[i+2]=globalThis.__brightness;
         }
         return data;
       };
     }
     return x;
   };
 });
 await p.route('**/vision_bundle.mjs',r=>r.fulfill({status:200,contentType:'text/javascript',headers:{'access-control-allow-origin':'*'},body:fakeModel}));
 return {c,p,errors};
}
const wait=(p,fn,timeout=14000)=>p.waitForFunction(fn,null,{timeout});
async function prepared(p,mode='garden',hands=1){
 await p.goto(url,{waitUntil:'domcontentloaded'});
 if(mode!=='garden'){
   await p.locator('[data-mode="'+mode+'"]').click();
 }
 await p.evaluate(n=>{window.__hands=n;},hands);
 await p.locator('#cameraStart').click();
 await wait(p,()=>document.querySelector('#video')?.classList.contains('is-ready'),20000);
 await wait(p,()=>document.querySelector('#cameraCheck').hidden,15000);
 assert.equal(await p.locator('#viewer').getAttribute('data-phase'),'play',mode+' enters play');
}
async function screenSizes(){
 for(const viewport of [{width:320,height:640},{width:360,height:740},{width:390,height:844},{width:430,height:932},{width:768,height:1024},{width:1280,height:800},{width:844,height:390}]){
   const c=await browser.newContext({viewport}),p=await c.newPage(),errors=[];
   p.on('pageerror',e=>errors.push(e.message));
   await p.goto(url);
   assert.equal(await p.locator('.mode[data-mode]:visible').count(),5,'Every game is visible without an accordion at '+viewport.width);
   assert.equal(await p.locator('#advancedModes').count(),0,'No hidden menu for game choices');
   await p.locator('#touchStart').click();
   assert.equal(await p.locator('#game').isVisible(),true);
   const info=await p.evaluate(()=>({
     width:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,
     viewerParent:document.querySelector('#gardenScene')?.parentElement?.id,
     second:!document.querySelector('.game-right')?.getBoundingClientRect().height,
     flower:!document.querySelector('#gardenScene')?.hidden,
     children:document.querySelectorAll('#gardenTouchDock .choices .choice').length
   }));
   assert.ok(info.width<=info.clientWidth+2,'No sideways scroll at '+JSON.stringify(viewport)+': '+JSON.stringify(info));
   assert.equal(info.viewerParent,'viewer');
   assert.equal(info.second,true);
   assert.equal(info.flower,true);
   assert.equal(info.children,2);
   assert.deepEqual(errors,[]);
   if(viewport.width===320||viewport.width===844)await p.screenshot({path:out+'/edge-layout-'+viewport.width+'x'+viewport.height+'.png',fullPage:true});
   results.push({case:'viewport '+viewport.width+'x'+viewport.height,pass:true});
   await c.close();
 }
}
async function missingOrExtraHands(){
 const {c,p,errors}=await ctx({width:390,height:844});
 await p.goto(url);
 await p.evaluate(()=>{window.__hands=2;window.__handPoses=['fist','fist'];});
 await p.locator('#cameraStart').click();
 await wait(p,()=>document.querySelector('#video').classList.contains('is-ready'),20000);
 assert.equal(await p.locator('#cameraCheck').isVisible(),true,'Two hands must not pass single-hand preflight');
 await wait(p,()=>document.querySelector('#cameraCheckText').textContent.includes('한 손만'),7000);
 assert.match(await p.locator('#cameraCheckText').innerText(),/한 손만/);
 assert.equal(await p.locator('#gardenHudFlower').innerText(),'🌷 0 / 3');
 await p.evaluate(()=>{window.__hands=1;window.__handPoses=['fist'];});
 await wait(p,()=>document.querySelector('#cameraCheck').hidden);
 await wait(p,()=>document.querySelector('#acornActor')?.dataset.state==='caught');
 await p.evaluate(()=>{window.__hands=0;});
 await wait(p,()=>document.querySelector('#acornActor').hidden,3500);
 await wait(p,()=>!document.querySelector('#cameraProblem').hidden,12500);
 assert.match(await p.locator('#cameraProblemTitle').innerText(),/손이 아직 안 보여요/);
 await p.evaluate(()=>{window.__hands=1;window.__handPoses=['one'];});
 await wait(p,()=>document.querySelector('#cameraProblem').hidden,6000);
 assert.equal(await p.locator('#acornActor').isVisible(),true,'Acorn returns with correct hand');
 assert.deepEqual(errors,[]);
 await p.locator('#pause').click();
 results.push({case:'extra hands, missing hand, reacquisition',pass:true});
 await c.close();
}
async function darknessAndRecovery(){
 const {c,p,errors}=await ctx({width:390,height:844});
 await prepared(p);
 await wait(p,()=>document.querySelector('#acornActor')?.dataset.state==='caught');
 await p.evaluate(()=>{window.__pose='one';});
 await wait(p,()=>document.querySelector('#liveTitle').textContent.includes('보자기! 도토리 놓기'),8500);
 await p.evaluate(()=>{window.__brightness=0;window.__pose='one';});
 await wait(p,()=>document.querySelector('#cameraProblem').hidden===false,10000);
 assert.match(await p.locator('#cameraProblemTitle').innerText(),/어두워요/);
 await p.evaluate(()=>{window.__pose='palm';});
 await p.waitForTimeout(1700);
 assert.equal(await p.locator('.garden-bed[data-growth="flower"]').count(),0,'Dark room must not score even matching model results');
 assert.equal(await p.locator('#acornActor').isVisible(),false,'Do not paint a fake tracked acorn in dark frame');
 await p.evaluate(()=>{window.__brightness=120;window.__pose='one';});
 await wait(p,()=>document.querySelector('#cameraProblem').hidden,7000);
 await p.evaluate(()=>{window.__pose='palm';});
 await wait(p,()=>document.querySelector('.garden-bed[data-growth="flower"]'),8000);
 assert.equal(await p.locator('#gardenHudFlower').innerText(),'🌷 1 / 3');
 await p.screenshot({path:out+'/edge-dark-recovered.png',fullPage:true});
 assert.deepEqual(errors,[]);
 await c.close();
 results.push({case:'dark camera rejects false success and recovers',pass:true});
}
async function frozenVideo(){
 const {c,p,errors}=await ctx({width:390,height:844});
 await prepared(p);
 await p.evaluate(()=>{
   const video=document.querySelector('#video');
   const fixed=video.currentTime;
   Object.defineProperty(video,'currentTime',{configurable:true,get(){return window.__freeze?fixed:video.__proto__.currentTime;}});
   window.__freeze=true;
 });
 await wait(p,()=>!document.querySelector('#cameraProblem').hidden,11000);
 assert.match(await p.locator('#cameraProblemTitle').innerText(),/멈췄어요/);
 assert.equal(await p.locator('#acornActor').isVisible(),false);
 await p.screenshot({path:out+'/edge-frozen-frame.png',fullPage:true});
 await p.locator('#cameraToTouch').click();
 assert.equal(await p.locator('#kindBadge').innerText(),'👆 화면 정답 고르기');
 await p.locator('.choices button[data-pose="fist"]').click();
 assert.match(await p.locator('#viewerBadge').innerText(),/도토리/);
 assert.deepEqual(errors,[]);
 await c.close();
 results.push({case:'frozen camera recovery to explicit touch',pass:true});
}
async function permissions(){
 for(const [name,needle] of [['NotAllowedError',/권한/],['NotFoundError',/카메라가 없어요/],['NotReadableError',/다른 앱/],['OverconstrainedError',/인터넷 연결/]]){
  const c=await browser.newContext({viewport:{width:390,height:844}}),p=await c.newPage();
  await p.addInitScript(err=>{
   Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{const e=new Error('mock');e.name=err;throw e;}}});
  },name);
  await p.goto(url);await p.locator('#cameraStart').click();
  await wait(p,()=>!document.querySelector('#cameraProblem').hidden,8000);
  assert.match(await p.locator('#cameraProblemText').innerText(),needle,name);
  assert.equal(await p.locator('#kindBadge').innerText(),'📷 손 인식','No false fallback');
  await p.locator('#cameraToTouch').click();
  assert.equal(await p.locator('#kindBadge').innerText(),'👆 화면 정답 고르기');
  await c.close();
  results.push({case:'permission '+name,pass:true});
 }
}
async function wrongAnswerAndReplay(){
 const c=await browser.newContext({viewport:{width:390,height:844}}),p=await c.newPage();
 await p.goto(url);await p.locator('#mute').click();
 assert.match(await p.locator('#mute').innerText(),/🔇/);
 await p.locator('#touchStart').click();
 await p.locator('.choices button[data-pose="palm"]').click();
 assert.equal(await p.locator('#gardenHudFlower').innerText(),'🌷 0 / 3');
 await p.locator('.choices button[data-pose="fist"]').click();
 await p.evaluate(()=>document.querySelector('.choices button[data-pose="palm"]').click());
 assert.equal(await p.locator('#gardenScene').getAttribute('data-acorn'),'held','Double response ignored during reward');
 for(let i=1;i<6;i++){
  await p.locator('#next').click();
  await p.locator('.choices button[data-pose="'+(i%2===0?'fist':'palm')+'"]').click();
 }
 await p.locator('#next').click();
 assert.equal(await p.locator('#finish').isVisible(),true);
 await p.locator('#again').click();
 assert.equal(await p.locator('#gardenHudFlower').innerText(),'🌷 0 / 3','Replay resets garden');
 assert.match(await p.locator('#mute').innerText(),/🔇/,'User mute preference persists');
 await p.locator('#pause').click();
 await p.locator('[data-mode="fingers"]').click();
 await p.locator('#touchStart').click();
 assert.equal(await p.locator('#choices').evaluate(e=>e.parentElement.id),'gardenTouchDock','Other story mode keeps its answers in one play scene');
 await p.locator('#pause').click();
 await c.close();
 results.push({case:'wrong choice, double input, replay, mute, advanced mode',pass:true});
}
async function rapidStopAndPermission(){
 const c=await browser.newContext({viewport:{width:390,height:844}}),p=await c.newPage();
 await p.addInitScript(()=>{
  window.__lateStopCount=0;
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{
   getUserMedia:()=>new Promise(resolve=>{window.__resolveLateCamera=()=>{
     resolve({getTracks:()=>[{stop(){window.__lateStopCount++}}]});
   }})
  }});
 });
 await p.goto(url);await p.locator('#cameraStart').click();
 await p.locator('#pause').click();
 await p.evaluate(()=>window.__resolveLateCamera());
 await p.waitForTimeout(200);
 assert.equal(await p.evaluate(()=>window.__lateStopCount),1,'Late camera permission must stop discarded video track');
 assert.equal(await p.locator('#game').isVisible(),false);
 await c.close();
 results.push({case:'late permission response after cancel releases track',pass:true});
}
async function allCameraModes(){
 // All five games are exercised in camera mode, not just tested as touch choices.
 for(const mode of ['copy','fingers','memory','both']){
  const {c,p,errors}=await ctx({width:390,height:844});
  await p.goto(url,{waitUntil:'domcontentloaded'});
  await p.locator('[data-mode="'+mode+'"]').click();
  await p.evaluate(args=>{window.__hands=args.hands;window.__pose='fist';}, {hands:mode==='both'?1:1});
  await p.locator('#cameraStart').click();
  await wait(p,()=>document.querySelector('#video').classList.contains('is-ready'),20000);
  if(mode==='both'){
   await wait(p,()=>document.querySelector('#cameraCheckText').textContent.includes('두 손을'),8000);
   assert.equal(await p.locator('#cameraCheck').isVisible(),true,'Both mode cannot start with one hand');
   await p.evaluate(()=>{window.__hands=2;window.__handPoses=['palm','palm'];});
  }
  await wait(p,()=>document.querySelector('#cameraCheck').hidden,12000);
  if(mode==='memory'){
   assert.equal(await p.locator('#ready').isVisible(),true,'Memory camera waits for deliberate remember action');
   assert.equal(await p.locator('#sequence .step').count(),2);
   await p.waitForTimeout(1500);
   assert.equal(await p.locator('#ready').isVisible(),true,'Memory preview never expires automatically');
   await p.locator('#ready').click();
   assert.equal(await p.locator('#ghostGuides').isVisible(),false,'Recall hides demonstrated answer');
   assert.equal(await p.locator('#adventureSceneObjects svg').count(),0,'Camera recall shows no answer shapes');
   assert.equal(await p.locator('#adventureSceneObjects .stone-placeholder').count(),2,'Recall shows neutral stepping stones, not gesture answers');
   assert.equal(await p.locator('#gardenHud').isVisible(),true,'Path progress stays in camera');
   await p.evaluate(()=>{window.__pose='palm';});
   await wait(p,()=>document.querySelector('#flowerLabel').textContent.includes('1'),8500);
   await p.evaluate(()=>{window.__pose='one';});
   await wait(p,()=>document.querySelector('#flowerLabel').textContent.includes('2'),10500);
   await wait(p,()=>document.querySelector('#ready').hidden===false,6500);
   assert.equal(await p.locator('#sequence .step').count(),2,'Next memory round is shown');
  }else if(mode==='copy'){
   assert.equal(await p.locator('#guideToggle').isVisible(),true,'Copy camera visual guide can be hidden');
   assert.equal(await p.locator('#modelCard').isVisible(),true,'The child sees a real target model on the stage');
   assert.equal(await p.locator('#adventureScene').isVisible(),true,'Bubbles fill along the same frame');
   assert.match(await p.locator('#liveTitle').innerText(),/손바닥을 펴서 풍선을 띄워/);
   assert.equal(await p.locator('#adventureActor').getAttribute('data-action'),'release','Open palm sets release action');
   assert.equal(await p.locator('#adventureActor').getAttribute('data-mode'),'copy','Live bubble has its own physical-looking illustration');
   assert.equal(await p.locator('#adventureActorEmoji').evaluate(e=>getComputedStyle(e,'::before').content),'""','Balloon shape is rendered, not a floating emoji');
   await p.locator('#guideToggle').click();
   assert.equal(await p.locator('#modelCard').isVisible(),false);
   await p.locator('#guideToggle').click();
   assert.equal(await p.locator('#modelCard').isVisible(),true);
   await p.evaluate(()=>{window.__pose='palm';});
   await wait(p,()=>document.querySelector('#flowerLabel').textContent.includes('1'),9000);
   assert.equal(await p.locator('#adventureActor').getAttribute('data-state'),'success','Balloon reacts to matching pose');
   assert.equal(await p.locator('#adventureActorEmoji').evaluate(e=>getComputedStyle(e,'::before').animationName),'moa-copy-float');
   await wait(p,()=>document.querySelector('#adventureActor')?.dataset.action==='grab',8500);
   assert.match(await p.locator('#liveTitle').innerText(),/주먹으로 풍선을 꼭 잡아/);
   await p.evaluate(()=>{window.__pose='fist';});
   await wait(p,()=>document.querySelector('#flowerLabel').textContent.includes('2'),9000);
   assert.equal(await p.locator('#adventureActorEmoji').evaluate(e=>getComputedStyle(e,'::before').animationName),'moa-copy-grab');
   await wait(p,()=>document.querySelector('#adventureActor')?.dataset.taps==='1',8500);
   assert.match(await p.locator('#liveTitle').innerText(),/손가락 하나로 풍선 톡/);
   await p.evaluate(()=>{window.__pose='one';});
   await wait(p,()=>document.querySelector('#flowerLabel').textContent.includes('3'),9000);
   assert.equal(await p.locator('#adventureActorEmoji').evaluate(e=>getComputedStyle(e,'::before').animationName),'moa-copy-tap-one');
  }else if(mode==='fingers'){
   assert.equal(await p.locator('#modelCard').isVisible(),true);
   assert.equal(await p.locator('#liveCompare').isVisible(),false);
   await p.evaluate(()=>{window.__pose='one';});
   await wait(p,()=>document.querySelectorAll('#fingerStars:not([hidden]) .finger-star[data-lit="yes"]:not([hidden])').length===1,9000);
   assert.equal(await p.locator('#adventureActor').isVisible(),false,'Floating star cluster does not cover the learner');
   await wait(p,()=>document.querySelector('#flowerLabel').textContent.includes('1'),9000);
   assert.equal(await p.locator('#adventureActorEmoji').innerText(),'⭐','One-finger goal lights one star');
   await wait(p,()=>document.querySelectorAll('#fingerStars .finger-star:not([hidden])').length===2,7000);
   assert.equal(await p.locator('#fingerStars .finger-star:not([hidden])').count(),2,'Two separate fingertips receive star targets');
   await p.evaluate(()=>{window.__pose='two';});
   await wait(p,()=>document.querySelectorAll('#fingerStars .finger-star[data-lit="yes"]:not([hidden])').length===2,9000);
   await wait(p,()=>document.querySelector('#flowerLabel').textContent.includes('2'),9000);
   assert.equal(await p.locator('#adventureActorEmoji').innerText(),'⭐⭐','Two-finger goal lights two stars');
   await wait(p,()=>document.querySelectorAll('#fingerStars .finger-star:not([hidden])').length===3,7000);
   await p.evaluate(()=>{window.__pose='three';});
   await wait(p,()=>document.querySelectorAll('#fingerStars .finger-star[data-lit="yes"]:not([hidden])').length===3,9000);
   await wait(p,()=>document.querySelector('#flowerLabel').textContent.includes('3'),9000);
   assert.equal(await p.locator('#adventureActorEmoji').innerText(),'⭐⭐⭐','Three-finger goal lights three stars');
    await wait(p,()=>document.querySelector('#gardenHudRound').textContent.startsWith('4'),9000);
    await p.evaluate(()=>{window.__pose='palm';});
    await p.waitForTimeout(1500);
    assert.equal(await p.locator('#flowerLabel').innerText(),'🌼 3','Four fingers cannot answer a one-finger goal');
    assert.equal(await p.locator('#fingerStars .finger-star[data-lit="yes"]').count(),0,'Too many fingers do not light stars');
    assert.match(await p.locator('#viewerBadge').innerText(),/3개 접어/,'Count-specific instruction');
    await p.evaluate(()=>{window.__pose='pinky';});
    await wait(p,()=>document.querySelector('#flowerLabel').textContent.includes('4'),10500);
    assert.equal(await p.locator('#fingerStars .finger-star[data-finger="3"]').getAttribute('data-lit'),'yes','Pinky-only star appears at the pinky');
    await wait(p,()=>document.querySelector('#gardenHudRound').textContent.startsWith('5'),9000);
    await p.evaluate(()=>{window.__pose='outerThree';});
    await wait(p,()=>document.querySelector('#flowerLabel').textContent.includes('5'),10500);
    assert.equal(await p.locator('#fingerStars .finger-star[data-finger="3"]').getAttribute('data-lit'),'yes','Any three-finger combination accepted');
  }else if(mode==='both'){
   assert.equal(await p.locator('#adventureActor').getAttribute('data-mode'),'both','Bilateral stage has a treasure door object');
   assert.equal(await p.locator('#adventureActorEmoji').evaluate(e=>getComputedStyle(e,'::before').content),'""','Door is drawn with original frame illustration');
   await wait(p,()=>document.querySelector('#flowerLabel').textContent.includes('1'),8500);
   assert.equal(await p.locator('#adventureActor').getAttribute('data-state'),'success','Both matching hands open the door');
   await p.evaluate(()=>{window.__handPoses=['fist','fist'];});
   await wait(p,()=>document.querySelector('#flowerLabel').textContent.includes('2'),11000);
   await p.evaluate(()=>{window.__handPoses=['fist','palm'];});
   await wait(p,()=>document.querySelector('#flowerLabel').textContent.includes('3'),11500);
   assert.equal(await p.locator('#cameraCheck').isVisible(),false,'Bilateral camera remains calibrated');
   assert.equal(await p.locator('#adventureSceneObjects .adventure-token[data-state="done"]').count(),3,'Three of four locks are open');
  }
  assert.equal(await p.locator('.game-right').isVisible(),false,'Every camera mode is now single stage');
  assert.equal(await p.locator('#adventureScene').isVisible(),true,'Every camera game has its own active reward scene');
  assert.deepEqual(errors,[],mode+' has no unexpected page errors');
  await p.screenshot({path:out+'/all-camera-'+mode+'.png',fullPage:true});
  await p.locator('#pause').click();
  await c.close();
  results.push({case:'camera '+mode+' full mode smoke',pass:true});
 }
}
async function brokenModelAndRetry(){
 const {c,p,errors}=await ctx({width:390,height:844});
 await prepared(p);
 await p.evaluate(()=>{window.__pose='one';window.__modelError=true;});
 await wait(p,()=>!document.querySelector('#cameraProblem').hidden,12500);
 assert.match(await p.locator('#cameraProblemTitle').innerText(),/손 인식이 중단/);
 assert.equal(await p.locator('#acornActor').isVisible(),false,'Acorn hidden during recognition failure');
 await p.evaluate(()=>{window.__pose='fist';window.__modelError=false;});
 await p.locator('#retryCamera').click();
 await wait(p,()=>document.querySelector('#cameraCheck').hidden&&document.querySelector('#cameraProblem').hidden,20000);
 await wait(p,()=>document.querySelector('#acornActor')?.dataset.state==='caught',9500);
 assert.deepEqual(errors,[]);
 await p.locator('#pause').click();await c.close();
 results.push({case:'model inference errors show reconnect and recover',pass:true});
}
async function cameraFlip(){
 const {c,p,errors}=await ctx({width:390,height:844});
 await prepared(p);
 await p.evaluate(()=>{window.__pose='one';});
 await p.locator('#flip').click();
 assert.equal(await p.locator('#cameraCheck').isVisible(),true,'Switch camera requires new calibration');
 await wait(p,()=>document.querySelector('#cameraCheck').hidden,17500);
 assert.equal(await p.locator('#video').evaluate(e=>e.classList.contains('front')),false,'Back camera preview not mirrored');
 await p.locator('#flip').click();
 await wait(p,()=>document.querySelector('#cameraCheck').hidden,17500);
 assert.equal(await p.locator('#video').evaluate(e=>e.classList.contains('front')),true,'Front camera preview mirrored');
 assert.deepEqual(errors,[]);
 await p.locator('#pause').click();await c.close();
 results.push({case:'front/back camera change and recalibration',pass:true});
}
async function cameraModelOffline(){
 const c=await browser.newContext({viewport:{width:390,height:844},permissions:['camera']});
 const p=await c.newPage();
 await p.route('**/vision_bundle.mjs',route=>route.abort('failed'));
 await p.goto(url);await p.locator('#cameraStart').click();
 await wait(p,()=>!document.querySelector('#cameraProblem').hidden,10000);
 assert.match(await p.locator('#cameraProblemText').innerText(),/인터넷 연결/);
 assert.equal(await p.locator('#cameraToTouch').isVisible(),true);
 await p.locator('#cameraToTouch').click();
 assert.equal(await p.locator('#kindBadge').innerText(),'👆 화면 정답 고르기');
 await c.close();
 results.push({case:'hand model/CDN offline safe fallback',pass:true});
}
async function run(){
 await screenSizes();
 await permissions();
 await wrongAnswerAndReplay();
 await rapidStopAndPermission();
 await missingOrExtraHands();
 await darknessAndRecovery();
 await frozenVideo();
 await allCameraModes();
 await brokenModelAndRetry();
 await cameraFlip();
 await cameraModelOffline();
 console.log('PASS extended hand mirror adversarial QA',JSON.stringify(results));
}
try{await run()}finally{await browser.close()}
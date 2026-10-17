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
 'const pattern={palm:[1,1,1,1],fist:[0,0,0,0],one:[1,0,0,0],two:[1,1,0,0],three:[1,1,1,0]};',
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
   await p.locator('#advancedModes summary').click();
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
 await p.locator('#advancedModes summary').click();
 await p.locator('[data-mode="fingers"]').click();
 await p.locator('#touchStart').click();
 assert.equal(await p.locator('#choices').evaluate(e=>e.parentElement.id),'standardControls','Other mode restores controls');
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
async function run(){
 await screenSizes();
 await permissions();
 await wrongAnswerAndReplay();
 await rapidStopAndPermission();
 await missingOrExtraHands();
 await darknessAndRecovery();
 await frozenVideo();
 console.log('PASS extended hand mirror adversarial QA',JSON.stringify(results));
}
try{await run()}finally{await browser.close()}
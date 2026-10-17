import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {chromium} from 'playwright-core';
const require=createRequire(import.meta.url);
const core=require('../thinking-garden/games/hand-mirror/core.js');
const base=(process.env.TEST_BASE_URL||'http://127.0.0.1:8765').replace(/\/$/,'');
const output='qa/hand-mirror-artifacts/'+(process.env.LIVE_TEST?'live':'staging');
fs.mkdirSync(output,{recursive:true});
function hand(kind){
 const arr=Array.from({length:21},()=>({x:.5,y:.85}));
 [[5,6,8],[9,10,12],[13,14,16],[17,18,20]].forEach(([m,p,t],i)=>{
  arr[m]={x:.28+i*.12,y:.65};arr[p]={x:.28+i*.12,y:.5};
  arr[t]={x:.28+i*.12,y:core.PATTERNS[kind][i]===1?.19:.60};
 });
 return arr;
}
for(const kind of ['palm','fist','one','two','three'])assert.equal(core.pose(hand(kind)),kind);
const fingerTest=core.fingerFeedback(hand('one'),'palm');
assert.deepEqual(fingerTest.matched,[true,false,false,false],'Guide distinguishes correct index from 3 fingers needing correction');
assert.equal(fingerTest.count,1);
assert.equal(core.fingerFeedback(hand('palm'),'palm').count,4);
assert.equal(core.fingerFeedback([],'fist'),null);
assert.equal(core.pose([]),null);
assert.equal(core.match([hand('palm'),hand('fist')],['fist','palm']),true);
assert.equal(core.match([hand('one')],['fist']),false);
assert.ok(Object.values(core.TITLES).every(t=>!/검지|중지|약지|새끼손가락/.test(t)));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN,args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
const goals={garden:['fist','palm','fist','palm','fist','palm'],copy:['palm','fist','one','two','three','palm'],fingers:['one','two','three','one','three','two'],both:['palm,palm','fist,fist','palm,fist','one,one']};
async function pickMode(page,mode){
 if(mode!=='garden')await page.locator('#advancedModes summary').click();
 await page.locator('[data-mode="'+mode+'"]').click();
}
async function touchFlow(page,mode,patterns){
 await page.goto(base+'/thinking-garden/games/hand-mirror/',{waitUntil:'domcontentloaded'});
 await pickMode(page,mode);
 await page.locator('#touchStart').click();
 assert.equal(await page.locator('#game').isVisible(),true,mode+' launched');
 for(let i=0;i<patterns.length;i++){
  assert.equal(await page.locator('#roundLabel').innerText(),(i+1)+' / '+patterns.length,mode+' round');
  await page.locator('.choices button[data-pose="'+patterns[i]+'"]').click();
  assert.match(await page.locator('#message').innerText(),mode==='garden'?/씨앗|꽃/:/성공/);
  await page.locator('#next').click();
 }
 assert.equal(await page.locator('#finish').isVisible(),true,mode+' completed');
 if(mode==='garden'){
  assert.match(await page.locator('#finishInfo').innerText(),/꽃 3송이/);
  assert.equal(await page.locator('#gardenScene .garden-bed[data-growth="flower"]').count(),3,'Three flowers grew');
 }else assert.match(await page.locator('#finishInfo').innerText(),/화면 정답 선택 연습/);
}
async function memoryFlow(page){
 await page.goto(base+'/thinking-garden/games/hand-mirror/',{waitUntil:'domcontentloaded'});
 await pickMode(page,'memory');
 await page.locator('#touchStart').click();
 const seq=[['palm','one'],['one','fist'],['two','palm','fist'],['three','one','palm']];
 for(let i=0;i<seq.length;i++){
  assert.equal(await page.locator('#ready').isVisible(),true);
  await page.locator('#ready').click();
  assert.equal(await page.locator('#targetEmoji').innerText(),'❔','Memory answer concealed');
  for(const pose of seq[i]){
   await page.locator('.choices button[data-pose="'+pose+'"]').click();
   assert.match(await page.locator('#message').innerText(),/성공/);
   await page.locator('#next').click();
  }
 }
 assert.equal(await page.locator('#finish').isVisible(),true);
}
async function visualAndRecovery(width,height,label){
 const c=await browser.newContext({viewport:{width,height},locale:'ko-KR'});
 const p=await c.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/thinking-garden/',{waitUntil:'domcontentloaded'});
 const card=p.locator('.library-card[data-open="handMirror"]');
 assert.equal(await card.count(),1,'Garden native library card');
 await card.click();
 await p.waitForURL('**/thinking-garden/games/hand-mirror/');
 assert.equal(await p.locator('h1').innerText(),'모아의 마법 꽃밭 🌼');
 assert.equal(await p.locator('.garden-mode').getAttribute('aria-pressed'),'true');
 await p.screenshot({path:output+'/new-home-'+label+'.png',fullPage:true});
 for(const [mode,patterns] of Object.entries(goals))await touchFlow(p,mode,patterns);
 await memoryFlow(p);
 const cp=await c.newPage();
 cp.on('pageerror',e=>errors.push(e.message));
 await cp.addInitScript(()=>{Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:()=>new Promise(()=>{})}});});
 await cp.goto(base+'/thinking-garden/games/hand-mirror/',{waitUntil:'domcontentloaded'});
 await cp.locator('#cameraStart').click();
 assert.equal(await cp.locator('#cameraCheck').isVisible(),true,'Real camera must first be calibrated');
 assert.equal(await cp.locator('#liveTask').isVisible(),false,'No task before calibration');
 assert.equal(await cp.locator('#ghostGuides').isVisible(),false,'No target obstructing setup');
 assert.equal(await cp.locator('#flowerLabel').innerText(),'🌼 0 / 3','Actual number of bloomed flowers');
 assert.equal(await cp.locator('#cameraProblem').isVisible(),false);
 await cp.screenshot({path:output+'/camera-preflight-'+label+'.png',fullPage:true});
 await cp.evaluate(()=>{document.getElementById('cameraProblem').hidden=false;});
 assert.equal(await cp.locator('#cameraProblem').isVisible(),true,'Problem recovery accessible');
 await cp.locator('#cameraToTouch').click();
 assert.equal(await cp.locator('#kindBadge').innerText(),'👆 화면 정답 고르기');
 assert.equal(await cp.locator('.choices .choice').count(),2,'Only simple garden options in touch mode');
 await cp.close();
 await p.goto(base+'/thinking-garden/games/hand-mirror/');
 await p.addInitScript(()=>{Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{const e=new Error('denied');e.name='NotAllowedError';throw e;}}})});
 await p.reload();
 await p.locator('#cameraStart').click();
 await p.waitForFunction(()=>!document.getElementById('cameraProblem').hidden,null,{timeout:15000});
 assert.equal(await p.locator('#kindBadge').innerText(),'📷 손 인식','Failure never silently switches to touch');
 assert.match(await p.locator('#cameraProblemText').innerText(),/권한/,'Permission-specific recovery');
 await p.locator('#cameraToTouch').click();
 assert.equal(await p.locator('#kindBadge').innerText(),'👆 화면 정답 고르기');
 assert.ok((await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=2,'No horizontal overflow');
 assert.deepEqual(errors,[],'No uncaught errors');
 await c.close();
 return {label,ok:true};
}
async function fakeVideoGarden(){
 const c=await browser.newContext({viewport:{width:390,height:844},permissions:['camera'],locale:'ko-KR'});
 const p=await c.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 const fakeModule=[
 'export const FilesetResolver={forVisionTasks:async()=>({})};',
 'export const HandLandmarker={createFromOptions:async()=>({detectForVideo(){',
 'const a=Array.from({length:21},()=>({x:.5,y:.85}));',
 '[[5,6,8],[9,10,12],[13,14,16],[17,18,20]].forEach(([m,p,t],i)=>{',
 'a[m]={x:.28+i*.12,y:.65};a[p]={x:.28+i*.12,y:.5};',
 'a[t]={x:.28+i*.12,y:globalThis.__testPalm?.19:(globalThis.__testOne&&i===0?.19:.60)};',
 '});return {landmarks:[a]};},close(){}})};'
 ].join('\n');
 await p.route('**/vision_bundle.mjs',r=>r.fulfill({status:200,contentType:'text/javascript',headers:{'access-control-allow-origin':'*'},body:fakeModule}));
 await p.goto(base+'/thinking-garden/games/hand-mirror/',{waitUntil:'domcontentloaded'});
 await p.locator('#cameraStart').click();
 assert.equal(await p.locator('#cameraCheck').isVisible(),true,'Before model ready, must show preflight');
 assert.equal(await p.locator('#flowerLabel').innerText(),'🌼 0 / 3','No early bloomed flower');
 await p.waitForFunction(()=>document.querySelector('#video').classList.contains('is-ready'),null,{timeout:20000});
 await p.waitForFunction(()=>document.querySelector('#cameraCheck').hidden&&document.querySelector('#viewer').dataset.phase==='play',null,{timeout:20000});
 assert.equal(await p.locator('#video').evaluate(v=>v.videoWidth>0),true,'Video stream produced pixels');
 assert.equal(await p.locator('#modelCard').isVisible(),true,'Real hand demo is visible instead of tiny static sticker');
 assert.equal(await p.locator('#modelSymbol').innerText(),'✊','Fist target uses instantly recognizable demonstration');
 assert.equal(await p.locator('#modelTitle').innerText(),'주먹 쥐기');
 assert.equal(await p.locator('#ghostGuides').isVisible(),false,'Old static tiny diagram is hidden in garden');
 await p.waitForFunction(()=>document.getElementById('flowerLabel').textContent.includes('0'),null,{timeout:6000});
 await p.waitForFunction(()=>document.querySelector('.garden-bed[data-growth="seed"]'),null,{timeout:15000});
 assert.equal(await p.locator('.garden-bed[data-growth="seed"]').count(),1,'Fist plants seed');
 assert.equal(await p.locator('#cameraProblem').isVisible(),false);
 await p.evaluate(()=>{window.__testOne=true});
 await p.locator('#next').click();
 assert.equal(await p.locator('#modelSymbol').innerText(),'✋','Target demonstration changes to open palm');
 await p.waitForFunction(()=>document.getElementById('liveCompareTitle').textContent==='내 손 1 / 4',null,{timeout:12000});
 assert.match(await p.locator('#liveCompareCue').innerText(),/주황 점.*더 펴/,'Targeted finger-extension cue rather than static model');
 assert.equal(await p.locator('#liveCompare').getAttribute('data-state'),'adjust');
 await p.screenshot({path:output+'/live-finger-correction-mobile.png',fullPage:true});
 await p.evaluate(()=>{window.__testOne=false;window.__testPalm=true});
 await p.waitForFunction(()=>document.querySelector('.garden-bed[data-growth="flower"]'),null,{timeout:15000});
 assert.equal(await p.locator('.garden-bed[data-growth="flower"]').count(),1,'Palm grows flower');
 assert.equal(await p.locator('#flowerLabel').innerText(),'🌼 1 / 3','Count real flowers rather than hand motions');
 await p.screenshot({path:output+'/garden-video-and-bloom-mobile.png',fullPage:true});
 await p.locator('#pause').click();
 assert.equal(await p.locator('#game').isVisible(),false,'Stop ends game and stream');
 assert.deepEqual(errors,[],'Camera mock has no uncaught JS errors');
 await c.close();
}
try{
 const results=[await visualAndRecovery(1280,800,'desktop'),await visualAndRecovery(390,844,'mobile')];
 await fakeVideoGarden();
 console.log('PASS magic garden and legacy gesture QA',JSON.stringify(results));
}finally{await browser.close();}

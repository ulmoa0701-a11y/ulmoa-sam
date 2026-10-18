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
const pinky=hand('one');
pinky[8]={...pinky[8],y:.60};pinky[20]={...pinky[20],y:.19};
assert.equal(core.countMatch([pinky],'one'),true,'Any ONE finger must pass finger-count adventure');
assert.equal(core.match([pinky],['one']),false,'Exact copy-game model remains unchanged');
assert.equal(core.countMatch([hand('palm')],'one'),false,'Four fingers are not one finger');
assert.equal(core.countMatch([hand('one'),hand('one')],'one'),false,'Other hand cannot answer for learner');
assert.equal(core.countMatch([hand('two')],'two'),true);
assert.equal(core.countMatch([hand('three')],'three'),true);
assert.equal(core.countMatch([hand('fist')],'one'),false);

assert.equal(core.pose([]),null);
assert.equal(core.match([hand('palm'),hand('fist')],['fist','palm']),true);
assert.equal(core.match([hand('one')],['fist']),false);
assert.ok(Object.values(core.TITLES).every(t=>!/검지|중지|약지|새끼손가락/.test(t)));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN,args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
const goals={garden:['fist','palm','fist','palm','fist','palm'],copy:['palm','fist','one','two','three','palm'],fingers:['one','two','three','one','three','two'],both:['palm,palm','fist,fist','palm,fist','one,one']};
async function pickMode(page,mode){
 assert.equal(await page.locator('[data-mode="'+mode+'"]').isVisible(),true,'Every mode is visible without expanding a menu');
 await page.locator('[data-mode="'+mode+'"]').click();
}
async function touchFlow(page,mode,patterns){
 await page.goto(base+'/thinking-garden/games/hand-mirror/',{waitUntil:'domcontentloaded'});
 await pickMode(page,mode);
 await page.locator('#touchStart').click();
 assert.equal(await page.locator('#game').isVisible(),true,mode+' launched');
 if(mode==='garden'){
  assert.equal(await page.locator('#gardenScene').evaluate(el=>el.parentElement.id),'viewer','Flowerbed must be INSIDE same stage as camera');
  assert.equal(await page.locator('#gardenHud').isVisible(),true,'Mission progress lives inside game stage');
  assert.equal(await page.locator('.game-right').isVisible(),false,'No second lower game panel');
  assert.equal(await page.locator('#gardenTouchDock').isVisible(),true,'Touch controls share the same stage');
  assert.equal(await page.locator('#choices').evaluate(el=>el.parentElement.id),'gardenTouchDock','Choices are inside the stage');
  assert.equal(await page.locator('#gardenTouchPreview').isVisible(),true,'Touch demo occupies same screen');
  assert.ok(await page.evaluate(()=>document.querySelector('#viewer').getBoundingClientRect().bottom<=window.innerHeight),'Entire garden play stage fits viewport');
 }else{
  assert.equal(await page.locator('#choices').evaluate(el=>el.parentElement.id),'gardenTouchDock','All modes choose answers inside one stage');
  assert.equal(await page.locator('.game-right').isVisible(),false,'No lower scoring panel in playful modes');
  assert.equal(await page.locator('#adventureScene').isVisible(),true,'Mode-specific story rewards share live play field');
  assert.equal(await page.locator('#gardenHud').isVisible(),true,'Progress stays with action');
  assert.equal(await page.locator('#gardenTouchPreview').isVisible(),true,'Target illustration visible in the same stage');
  assert.ok(await page.evaluate(()=>document.querySelector('#viewer').getBoundingClientRect().bottom<=innerHeight),'One stage fits mobile viewport');
 }

 for(let i=0;i<patterns.length;i++){
  assert.equal(await page.locator('#roundLabel').innerText(),(i+1)+' / '+patterns.length,mode+' round');
  await page.locator('.choices button[data-pose="'+patterns[i]+'"]').click();
  assert.match(await page.locator('#message').innerText(),mode==='garden'?/도토리|꽃/:/풍선|별|자물쇠/);
  if(mode==='garden'){
   const expected=i%2===0?'held':'planted';
   assert.equal(await page.locator('#gardenScene').getAttribute('data-acorn'),expected,'Acorn must be '+expected+' after round '+(i+1));
   assert.equal(await page.locator('#gardenHudRound').innerText(),(i+1)+' / 6','One in-camera stage progress readout');
   assert.equal(await page.locator('#gardenHudFlower').innerText(),'🌷 '+Math.floor((i+1)/2)+' / 3','One in-camera flower counter');
  }else{
   const tokens=page.locator('#adventureSceneObjects .adventure-token[data-state="done"]');
   assert.equal(await tokens.count(),i+1,mode+' lights one story reward per successful gesture');
  }
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
  assert.equal(await page.locator('#adventureScene').isVisible(),true);
  assert.equal(await page.locator('#adventureSceneObjects svg').count(),seq[i].length,'Preview includes all sample hand poses');
  await page.locator('#ready').click();
  assert.equal(await page.locator('#adventureSceneObjects svg').count(),0,'Recall must never show stored hand figures');
  assert.equal(await page.locator('#gardenTouchPreview').innerText().then(t=>t.includes('❔')),true,'Touch recall shows question, not goal');
  assert.equal(await page.locator('#targetEmoji').innerText(),'❔','Memory answer concealed');
  for(const pose of seq[i]){
   await page.locator('.choices button[data-pose="'+pose+'"]').click();
   assert.match(await page.locator('#message').innerText(),/발판|기억/);
   await page.locator('#next').click();
  }
 }
 assert.equal(await page.locator('#finish').isVisible(),true);
 assert.equal(await page.locator('#adventureSceneObjects svg').count(),0,'Memory answer figures are absent on completed recall');
}
async function visualAndRecovery(width,height,label){
 const c=await browser.newContext({viewport:{width,height},locale:'ko-KR'});
 const p=await c.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/',{waitUntil:'domcontentloaded'});
 const homeCognitive=p.locator('a[href="gardens/#cognitive"]:visible');
 assert.ok(await homeCognitive.count()>=1,'Home page has cognitive garden entry');
 await homeCognitive.first().click();
 await p.waitForURL('**/gardens/#cognitive');
 await p.waitForLoadState('domcontentloaded');
 const catalog=p.locator('a[href*="/thinking-garden/games/hand-mirror/"],a[href*="../thinking-garden/games/hand-mirror/"]');
 await catalog.waitFor({state:'attached',timeout:10000});
 assert.equal(await catalog.count(),1,'One acorn flower garden listing in the main directory');
 assert.match(await p.locator('body').innerText(),/모아의 마법 꽃밭/,'Main home directory shows the current flower-garden title');
 assert.match(await catalog.getAttribute('href'),/thinking-garden\/games\/hand-mirror\//,'Main directory uses the actual game destination');
 await catalog.click();
 await p.waitForURL('**/thinking-garden/games/hand-mirror/');
 await p.locator('h1').waitFor({state:'attached',timeout:10000});
 assert.equal(await p.locator('h1').innerText(),'모아의 마법 꽃밭 🌼','Main homepage navigation opens current game');
 await p.goto(base+'/thinking-garden/',{waitUntil:'domcontentloaded'});
 const card=p.locator('.library-card[data-open="handMirror"]');
 assert.match(await card.innerText(),/모아의 마법 꽃밭/,'Secondary library title matches new game');

 assert.equal(await card.count(),1,'Garden native library card');
 await card.click();
 await p.waitForURL('**/thinking-garden/games/hand-mirror/');
 assert.equal(await p.locator('h1').innerText(),'모아의 마법 꽃밭 🌼');
 assert.equal(await p.locator('.garden-mode').getAttribute('aria-pressed'),'true');
 const selectable=p.locator('#intro [data-mode]');
 assert.equal(await selectable.count(),5,'Five game modes are offered visibly');
 assert.equal(await p.locator('#advancedModes summary').count(),0,'No hidden secondary-game accordion');
 assert.equal(await p.locator('#advancedModes .mode:visible').count(),4,'All four other activities are always shown');
 for(const key of ['garden','copy','fingers','memory','both']){
  const modeCard=p.locator('#intro [data-mode="'+key+'"]');
  assert.equal(await modeCard.isVisible(),true,key+' readily discoverable');
  await modeCard.click();
  assert.equal(await modeCard.getAttribute('aria-pressed'),'true',key+' gets clear selected state');
  assert.ok((await p.locator('#selectedModeLabel').innerText()).length>2,'Selected game printed above start controls');
  assert.equal(await p.locator('#cameraStart').isVisible(),true,'Camera start always discoverable');
  assert.equal(await p.locator('#touchStart').isVisible(),true,'Touch practice always discoverable');
 }
 await p.locator('[data-mode="garden"]').click();
 assert.equal(await p.locator('#intro [data-mode="garden"]').getAttribute('aria-pressed'),'true','Garden default restored');
 await p.screenshot({path:output+'/all-five-choices-'+label+'.png',fullPage:true});
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
 assert.equal(await p.locator('#modelCard').isVisible(),false,'Acorn game emphasizes a real camera-tracked nut rather than a redundant demo card');
 assert.equal(await p.locator('#acornActor').isVisible(),true,'Acorn appears in the hand area');
 assert.equal(await p.locator('#gardenScene').evaluate(el=>el.parentElement.id),'viewer','In-camera flowerbed instead of second screen');
 assert.equal(await p.locator('.game-right').isVisible(),false,'Second panel hidden on camera');
 assert.equal(await p.locator('#gardenHud').isVisible(),true,'Camera progress stays in same screen');
 assert.equal(await p.locator('#gardenTouchDock').isVisible(),false,'No touch controls in camera mode');
 assert.ok(await p.evaluate(()=>document.querySelector('#viewer').getBoundingClientRect().bottom<=window.innerHeight),'Mobile camera game stage is visible without scroll');

 assert.equal(await p.locator('#acornActor img').evaluate(e=>e.complete&&e.naturalWidth>0),true,'Real acorn asset loaded in camera overlay');
 assert.equal(await p.locator('#acornActor').getAttribute('data-state'),'waiting','Before fist gesture the acorn waits to be caught');
 assert.match(await p.locator('#liveTitle').innerText(),/도토리 잡기/,'Child can read a short game objective');
 assert.equal(await p.locator('#ghostGuides').isVisible(),false,'Old static tiny diagram is hidden in garden');
 await p.waitForFunction(()=>document.getElementById('flowerLabel').textContent.includes('0'),null,{timeout:6000});
 await p.waitForFunction(()=>document.querySelector('.garden-bed[data-growth="seed"]'),null,{timeout:15000});
 assert.equal(await p.locator('.garden-bed[data-growth="seed"]').count(),1,'Fist catches the acorn');
 assert.equal(await p.locator('#acornActor').getAttribute('data-state'),'caught','Acorn visually attaches to the clenched hand');
 assert.equal(await p.locator('#cameraProblem').isVisible(),false);
 await p.evaluate(()=>{window.__testOne=true});
 // Camera mode intentionally has no Next button: the flowerbed advances automatically.
 assert.equal(await p.locator('#next').isVisible(),false,'Camera garden is automatic, not button driven');
 await p.waitForFunction(()=>document.getElementById('liveTitle').textContent.includes('보자기! 도토리 놓기'),null,{timeout:8000});
 assert.match(await p.locator('#liveTitle').innerText(),/보자기! 도토리 놓기/,'Next goal automatically prompts release');
 await p.waitForFunction(()=>document.getElementById('viewerBadge').textContent.includes('보자기처럼 손을'),null,{timeout:12000});
 assert.equal(await p.locator('#liveCompare').isVisible(),false,'Scoring panel no longer obstructs the acorn play');
 assert.match(await p.locator('#viewerBadge').innerText(),/주먹을 활짝 펴|도토리/,'Short actionable feedback inside camera');
 await p.screenshot({path:output+'/live-finger-correction-mobile.png',fullPage:true});
 await p.evaluate(()=>{window.__testOne=false;window.__testPalm=true});
 await p.waitForFunction(()=>document.querySelector('.garden-bed[data-growth="flower"]'),null,{timeout:15000});
 assert.equal(await p.locator('.garden-bed[data-growth="flower"]').count(),1,'Palm grows flower');
 assert.equal(await p.locator('#acornActor').getAttribute('data-state'),'released','Open hand visibly releases the acorn');
 assert.equal(await p.locator('#gardenScene').getAttribute('data-acorn'),'planted','Acorn reaches flower garden');
 assert.equal(await p.locator('#flowerLabel').innerText(),'🌼 1 / 3','Count real flowers rather than hand motions');
 assert.equal(await p.locator('#gardenHudFlower').innerText(),'🌷 1 / 3','Camera overlay flower count tracks bloom');
 assert.equal(await p.locator('#gardenScene .garden-bed[data-growth="flower"]').count(),1,'Bloom stays in the same video frame');
 await p.screenshot({path:output+'/garden-video-and-bloom-mobile.png',fullPage:true});
 await p.locator('#pause').click();
 assert.equal(await p.locator('#game').isVisible(),false,'Stop ends game and stream');
 await p.goto(base+'/thinking-garden/games/hand-mirror/',{waitUntil:'domcontentloaded'});
 await p.locator('[data-mode="fingers"]').click();
 await p.locator('#cameraStart').click();
 await p.waitForFunction(()=>document.querySelector('#cameraCheck').hidden&&document.querySelector('#modelCard svg'),null,{timeout:18000});
 assert.equal(await p.locator('#modelCard').isVisible(),true,'Finger exploration uses big illustrated hand sample');
 assert.equal(await p.locator('#modelSymbol svg').isVisible(),true,'Illustrated gesture is visible in camera');
 assert.equal(await p.locator('#ghostGuides').isVisible(),false,'No duplicate ghost hand in finger mission');
 assert.equal(await p.locator('#liveCompare').isVisible(),false,'No confusing 1/4 scoring box');
 assert.equal(await p.locator('#liveLegend').isVisible(),false,'No secondary verbose color text');
 assert.ok((await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=2,'Mobile camera has no horizontal overflow');
 await p.screenshot({path:output+'/finger-explore-simple-mobile.png',fullPage:true});
 await p.locator('#pause').click();
 assert.deepEqual(errors,[],'Camera mock has no uncaught JS errors');
 await c.close();
}
try{
 const results=[await visualAndRecovery(1280,800,'desktop'),await visualAndRecovery(390,844,'mobile')];
 await fakeVideoGarden();
 console.log('PASS magic garden and legacy gesture QA',JSON.stringify(results));
}finally{await browser.close();}

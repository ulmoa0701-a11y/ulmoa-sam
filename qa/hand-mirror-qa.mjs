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
 [[5,6,8],[9,10,12],[13,14,16],[17,18,20]].forEach(([a,b,c],i)=>{
  arr[a]={x:.32+i*.11,y:.65};arr[b]={x:.32+i*.11,y:.5};
  arr[c]={x:.32+i*.11,y:core.PATTERNS[kind][i]===1?.19:.60};
 });
 return arr;
}
for(const kind of ['palm','fist','one','two','three'])assert.equal(core.pose(hand(kind)),kind,'Pose recognition '+kind);
assert.ok(Object.values(core.TITLES).every(t=>!/검지|중지|약지|새끼손가락/.test(t)),'Main game does not require anatomy vocabulary');
assert.equal(core.pose([]),null);
assert.equal(core.match([hand('palm'),hand('fist')],['fist','palm']),true,'Unordered two-hand match');
assert.equal(core.match([hand('palm')],['palm','palm']),false,'Requires two separately recognized hands');
assert.equal(core.match([hand('one')],['palm']),false,'Reject different pose');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN,args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
const checks=[];
const goals={copy:['palm','fist','one','two','three','palm'],fingers:['one','two','three','one','three','two'],both:['palm,palm','fist,fist','palm,fist','one,one']};
async function touchFlow(page,mode,patterns){
 await page.goto(base+'/thinking-garden/games/hand-mirror/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-mode="'+mode+'"]').click();
 await page.locator('#touchStart').click();
 assert.equal(await page.locator('#game').isVisible(),true,mode+' starts');
 for(let i=0;i<patterns.length;i++){
  assert.equal(await page.locator('#roundLabel').innerText(),(i+1)+' / '+patterns.length);
  await page.locator('.choices [data-pose="'+patterns[i]+'"]').click();
  assert.match(await page.locator('#message').innerText(),/성공/);
  await page.locator('#next').click();
 }
 assert.equal(await page.locator('#finish').isVisible(),true,mode+' finishes');
 assert.match(await page.locator('#finishInfo').innerText(),/화면 정답 선택 연습/);
}
async function memoryFlow(page){
 await page.goto(base+'/thinking-garden/games/hand-mirror/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-mode="memory"]').click();
 await page.locator('#touchStart').click();
 const sequences=[['palm','one'],['one','fist'],['two','palm','fist'],['three','one','palm']];
 for(let i=0;i<sequences.length;i++){
  assert.equal(await page.locator('#ready').isVisible(),true,'No time limit memory preview');
  assert.match(await page.locator('#targetTitle').innerText(),/기억하기/);
  await page.locator('#ready').click();
  assert.equal(await page.locator('#targetEmoji').innerText(),'❔','Answer hidden during recall');
  for(const goal of sequences[i]){
   await page.locator('.choices [data-pose="'+goal+'"]').click();
   assert.match(await page.locator('#message').innerText(),/성공/);
   await page.locator('#next').click();
  }
 }
 assert.equal(await page.locator('#finish').isVisible(),true,'Memory play finishes');
}
async function simulatedLiveCamera(width,height,label){
 const context=await browser.newContext({viewport:{width,height},permissions:['camera'],locale:'ko-KR'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 // Fake Chromium camera provides changing test pixels; only MediaPipe model is mocked.
 // This validates camera stream/play(), MediaPipe invocation, pose classification and reward without accessing a real camera.
 await page.route('**/vision_bundle.mjs',route=>route.fulfill({status:200,contentType:'text/javascript',headers:{'access-control-allow-origin':'*'},body:`
 export const FilesetResolver={forVisionTasks:async()=>({})};
 export const HandLandmarker={createFromOptions:async()=>({
  detectForVideo(){
    const a=Array.from({length:21},()=>({x:.5,y:.85}));
    [[5,6,8],[9,10,12],[13,14,16],[17,18,20]].forEach(([m,p,t],i)=>{
      a[m]={x:.28+i*.12,y:.65};a[p]={x:.28+i*.12,y:.5};a[t]={x:.28+i*.12,y:.19};
    });
    return {landmarks:[a]};
  },
  close(){}
 })};
 `}));
 await page.goto(base+'/thinking-garden/games/hand-mirror/',{waitUntil:'domcontentloaded'});
 await page.locator('#cameraStart').click();
 await page.waitForFunction(()=>document.querySelector('#video').classList.contains('is-ready'),{timeout:20000}).catch(()=>{});
 assert.equal(await page.locator('#video').getAttribute('class')?.then(x=>x?.includes('is-ready')),true,'Mock camera video actually begins playing');
 await page.waitForFunction(()=>document.getElementById('flowerLabel').textContent.includes('1'),null,{timeout:15000});
 assert.match(await page.locator('#message').innerText(),/성공/,'Recognized pose progresses in camera mode');
 assert.equal(await page.locator('#cameraProblem').isVisible(),false,'No false black camera warning during valid playback');
 assert.equal(await page.locator('#kindBadge').innerText(),'📷 손 인식');
 assert.equal(await page.locator('#viewer').getAttribute('data-match'),'no'===await page.locator('#viewer').getAttribute('data-match')?'no':'yes');
 await page.screenshot({path:output+'/live-mock-camera-'+label+'.png',fullPage:true});
 await page.locator('#pause').click();
 assert.equal(await page.locator('#game').isVisible(),false,'Camera stopped on exit');
 assert.deepEqual(errors,[],'No mocked-camera page errors');
 await context.close();
}
async function main(width,height,label){
 const c=await browser.newContext({viewport:{width,height},locale:'ko-KR'});
 const page=await c.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/thinking-garden/',{waitUntil:'domcontentloaded'});
 const card=page.locator('.library-card[data-open="handMirror"]');
 assert.equal(await card.count(),1,'Game is a native garden card');
 assert.equal(await card.isVisible(),true,'Game discoverable on garden screen');
 assert.match(await page.locator('#gardenProgress').innerText(),/26/,'Garden count updated');
 await card.click();
 await page.waitForURL('**/thinking-garden/games/hand-mirror/');
 assert.equal(await page.locator('h1').innerText(),'반짝손 따라하기 ✨');
 await page.screenshot({path:output+'/home-'+label+'.png',fullPage:true});
 for(const [mode,pattern] of Object.entries(goals))await touchFlow(page,mode,pattern);
 await memoryFlow(page);
 // Pending camera permission simulates a real first-use camera gate without downloading external models.
 const cameraPage=await c.newPage();
 cameraPage.on('pageerror',e=>errors.push(e.message));
 await cameraPage.addInitScript(()=>{Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:()=>new Promise(()=>{})}})});
 await cameraPage.goto(base+'/thinking-garden/games/hand-mirror/',{waitUntil:'domcontentloaded'});
 await cameraPage.locator('[data-mode="fingers"]').click();
 await cameraPage.locator('#cameraStart').click();
 assert.equal(await cameraPage.locator('#liveTask').isVisible(),true,'Target instruction projected inside camera');
 assert.equal(await cameraPage.locator('#ghostGuides [data-pose="one"] svg').isVisible(),true,'Open index finger projected as actual hand diagram');
 assert.equal(await cameraPage.locator('#ghostGuides [data-pose="one"] svg .open-finger').count(),1,'One finger visually highlighted to extend');
 assert.equal(await cameraPage.locator('#ghostGuides [data-pose="one"] svg .folded-finger').count(),3,'Other fingers shown as folded');
 assert.match(await cameraPage.locator('#liveLegend').innerText(),/노란 손가락/,'Child-facing color cue inside video');
 assert.doesNotMatch(await cameraPage.locator('#liveTitle').innerText(),/검지|중지|약지|새끼/,'No finger jargon on main instruction');

 assert.equal(await cameraPage.locator('#targetPanel').isVisible(),false,'No duplicate giant prompt below camera');
 assert.equal(await cameraPage.locator('#cameraHold').isVisible(),true,'Hold feedback displayed inside camera');
 assert.equal(await cameraPage.locator('#guideToggle').isVisible(),true,'Option to hide projection');
 assert.equal(await cameraPage.locator('#cameraProblem').isVisible(),false,'No spurious camera warning while permission pending');
 assert.equal(await cameraPage.locator('#retryCamera').count(),1,'Troubleshooting offers camera reconnect');
 assert.equal(await cameraPage.locator('#cameraToTouch').count(),1,'Troubleshooting offers touch choice');
 assert.equal(await cameraPage.locator('#ghostGuides svg rect').count(),0,'Avoid misleading rectangular finger bars');

 await cameraPage.locator('#guideToggle').click();
 assert.equal(await cameraPage.locator('#ghostGuides').isVisible(),false,'Child can hide projected hand');
 await cameraPage.locator('#guideToggle').click();
 assert.equal(await cameraPage.locator('#ghostGuides').isVisible(),true,'Projection can be re-enabled');
 await cameraPage.evaluate(()=>{
  document.querySelector('#cameraProblem').hidden=false;
 });
 assert.equal(await cameraPage.locator('#cameraProblem').isVisible(),true,'Visible camera troubleshooting instead of unexplained black preview');
 await cameraPage.locator('#cameraToTouch').click();
 assert.equal(await cameraPage.locator('#kindBadge').innerText(),'👆 화면 정답 고르기','Visible opt-in touch fallback');
 assert.equal(await cameraPage.locator('#cameraProblem').isVisible(),false,'Recovery message closes in touch mode');
 await cameraPage.locator('#pause').click();
 await cameraPage.locator('[data-mode="fingers"]').click();
 await cameraPage.locator('#cameraStart').click();

 assert.ok((await cameraPage.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=2,'No camera-screen horizontal overflow');
 await cameraPage.screenshot({path:output+'/camera-projection-'+label+'.png',fullPage:true});
 await cameraPage.locator('#pause').click();
 await cameraPage.locator('[data-mode="memory"]').click();
 await cameraPage.locator('#cameraStart').click();
 assert.equal(await cameraPage.locator('#ghostGuides .ghost-hand').count(),2,'Memory preview shows two projected gesture samples');
 await cameraPage.locator('#ready').click();
 assert.equal(await cameraPage.locator('#ghostGuides').isVisible(),false,'Memory answer is hidden during recall');
 assert.match(await cameraPage.locator('#liveTitle').innerText(),/기억한 손 모양/,'Prompt does not reveal remembered answer');
 await cameraPage.close();
 await page.goto(base+'/thinking-garden/games/hand-mirror/',{waitUntil:'domcontentloaded'});
 await page.addInitScript(()=>{Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{throw new Error('Permission blocked in test')}}})});
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#cameraStart').click();
 await page.waitForFunction(()=>document.getElementById('kindBadge').textContent.includes('화면 정답 고르기'));
 assert.match(await page.locator('#message').innerText(),/카메라 연결이 안 됐어/,'Clear camera fallback');
 assert.equal(await page.locator('.choices .choice').count(),5,'Fallback touch selections');
 assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=2,'No horizontal overflow');
 await page.screenshot({path:output+'/camera-fallback-'+label+'.png',fullPage:true});
 assert.deepEqual(errors,[],'No uncaught JavaScript errors: '+label);
 checks.push({label,width,height,ok:true});
 await c.close();
}
try{await main(1280,800,'desktop');await main(390,844,'mobile');await simulatedLiveCamera(390,844,'mobile');console.log('PASS hand mirror QA',JSON.stringify(checks));}finally{await browser.close();}

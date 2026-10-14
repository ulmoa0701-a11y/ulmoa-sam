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
assert.equal(core.pose([]),null);
assert.equal(core.match([hand('palm'),hand('fist')],['fist','palm']),true,'Unordered two-hand match');
assert.equal(core.match([hand('palm')],['palm','palm']),false,'Requires two separately recognized hands');
assert.equal(core.match([hand('one')],['palm']),false,'Reject different pose');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN,args:['--no-sandbox']});
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
 await page.goto(base+'/thinking-garden/games/hand-mirror/',{waitUntil:'domcontentloaded'});
 await page.addInitScript(()=>{Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{throw new Error('Permission blocked in test')}}})});
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#cameraStart').click();
 await page.waitForFunction(()=>document.getElementById('kindBadge').textContent.includes('화면 정답 고르기'));
 assert.match(await page.locator('#message').innerText(),/카메라를 사용할 수 없어/,'Graceful fallback');
 assert.equal(await page.locator('.choices .choice').count(),5,'Fallback touch selections');
 assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=2,'No horizontal overflow');
 await page.screenshot({path:output+'/camera-fallback-'+label+'.png',fullPage:true});
 assert.deepEqual(errors,[],'No uncaught JavaScript errors: '+label);
 checks.push({label,width,height,ok:true});
 await c.close();
}
try{await main(1280,800,'desktop');await main(390,844,'mobile');console.log('PASS hand mirror QA',JSON.stringify(checks));}finally{await browser.close();}

'use strict';
// Synthetic microphone signal exercises the production audio-analysis path.
// It is NOT a physical microphone, measured breath, real device, or child validation.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright-core');
const root=(process.env.TEST_BASE_URL||'http://127.0.0.1:8765').replace(/\/$/,'');
const folder='qa/breath-synthetic-e2e-artifacts';
fs.mkdirSync(folder,{recursive:true});
const setSignal=(page,value)=>page.evaluate(v=>{window.__qaAmp=v},value);
async function newPage(browser,viewport){
 const context=await browser.newContext({viewport,locale:'ko-KR',reducedMotion:'reduce'});
 const page=await context.newPage();
 await page.addInitScript(()=>{
  window.__qaAmp=0; let seed=123456789;
  const track={enabled:true,stop(){}};
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{
   getUserMedia:async()=>({getTracks:()=>[track],getAudioTracks:()=>[track]})
  }});
  class MockAudioContext{
   constructor(){this.state='running'}
   async resume(){}
   async close(){}
   createMediaStreamSource(){return {connect(){}}}
   createAnalyser(){return {fftSize:2048,smoothingTimeConstant:0,
    getFloatTimeDomainData(arr){
     const amp=track.enabled?window.__qaAmp:0;
     for(let i=0;i<arr.length;i++){
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      arr[i]=amp*((seed/4294967296)*2-1);
     }
    }
   }}
  }
  window.AudioContext=MockAudioContext;window.webkitAudioContext=MockAudioContext;
 });
 await page.goto(root+'/breath-garden/',{waitUntil:'load'});
 return {page,context};
}
async function waitReady(page){
 await page.locator('#micDetail').getByText(/마이크 연결됨/).waitFor({timeout:6000}).catch(async()=>{
  await page.waitForFunction(()=>document.querySelector('#micDetail')?.textContent.includes('마이크 연결됨'),null,{timeout:6000});
 });
 await page.waitForTimeout(1900);
}
async function strength(page){
 await page.locator('#chooseStrength').click();
 await waitReady(page);
 const blows=[2,3,2,2];
 for(let stage=0;stage<4;stage++){
  for(let attempt=0;attempt<blows[stage];attempt++){
   await setSignal(page,.11);
   await page.waitForTimeout(2500);
   await setSignal(page,0);
   await page.waitForTimeout(1200);
   const stamps=await page.locator('#strengthStamps').innerText();
   assert.ok((stamps.match(/🌼/gu)||[]).length>=attempt+1,
     'strength stage '+(stage+1)+' attempt '+(attempt+1)+' did not score: '+stamps);
  }
  await page.locator('#nextOverlay:visible').waitFor({timeout:5000});
  const next=page.locator('#micButton');
  if(await next.isVisible())await next.click();
  if(stage===3)await page.locator('#successScreen:visible').waitFor({timeout:12000});
  else await page.waitForFunction(n=>document.querySelector('#strengthStep')?.textContent.includes(n+'/4'),stage+2,{timeout:12000});
 }
 assert.match(await page.locator('#winTitle').innerText(),/바람꽃/);
}
async function long(page){
 await page.locator('#chooseLong').click();
 await page.locator('#longDuration [data-seconds="3"]').click();
 await waitReady(page);
 await setSignal(page,.11);await page.waitForTimeout(4500);
 await setSignal(page,0);await page.waitForTimeout(2100);
 assert.match(await page.locator('#longProgress').innerText(),/2 \/ 2|1 \/ 2 완료/);
 await setSignal(page,.11);await page.waitForTimeout(4500);
 await setSignal(page,0);
 await page.locator('#successScreen:visible').waitFor({timeout:8500});
 assert.match(await page.locator('#winTitle').innerText(),/두 번 성공/);
}
async function beat(page){
 await page.locator('#chooseBeat').click();
 await waitReady(page);
 let score=0;
 for(let attempt=0;attempt<20&&score<4;attempt++){
  await setSignal(page,0);
  await page.waitForFunction(()=>document.querySelector('#beatCue')?.textContent.includes('준비'),null,{timeout:9000});
  await page.waitForFunction(()=>document.querySelector('#beatCue')?.textContent.includes('후~'),null,{timeout:9000});
  await setSignal(page,.11);
  await page.waitForTimeout(1000);
  await setSignal(page,0);
  await page.waitForTimeout(650);
  score=(String(await page.locator('#beatCount').innerText()).match(/🌼/gu)||[]).length;
 }
 assert.equal(score,4,'four scored beat windows did not complete; got '+score);
 await page.locator('#successScreen:visible').waitFor({timeout:4500});
 assert.match(await page.locator('#winTitle').innerText(),/박자 바람 성공/);
}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const report=[];
 try{
  for(const device of [{name:'desktop',width:1280,height:900},{name:'mobile',width:390,height:844}]){
   for(const [name,run] of [['strength',strength],['long',long],['beat',beat]]){
    const {page,context}=await newPage(browser,{width:device.width,height:device.height});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    try{
     await run(page);
     assert.deepEqual(errors,[],'uncaught page errors');
     const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
     assert.ok(overflow<=4,'horizontal overflow '+overflow);
     await page.screenshot({path:folder+'/'+device.name+'-'+name+'.png',fullPage:true});
     report.push({device:device.name,mode:name,syntheticAudioPathCompleted:true});
    }finally{await context.close()}
   }
  }
 }finally{await browser.close()}
 fs.writeFileSync(folder+'/report.json',JSON.stringify({scope:'synthetic AudioContext analyser and mocked microphone only; no real hardware, breathing or human testing',report},null,2)+'\n');
 assert.equal(report.length,6);
 console.log('PASS synthetic microphone full-goal regression '+JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1});

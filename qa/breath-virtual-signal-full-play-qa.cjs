'use strict';
/* End-to-end browser control using a deterministic SYNTHETIC analyser signal.
   No real microphone or real exhalation is measured. We never call finish(),
   strengthTick(), longTick(), beatTick(), or manipulate game stage/score.
   We drive the real app timers by changing only the mock microphone samples. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright-core');
const base=(process.env.TEST_BASE_URL||'http://127.0.0.1:8765').replace(/\/$/,'');
const out='qa/breath-virtual-signal-artifacts';
fs.mkdirSync(out,{recursive:true});
const modeButtons={strength:'#chooseStrength',long:'#chooseLong',beat:'#chooseBeat'};
const widths=[{name:'mobile',width:390,height:844},{name:'desktop',width:1280,height:900}];
function fakeMicrophone(){
 const ctl={signal:'quiet',reads:0,mics:0,tracksStopped:0};
 Object.defineProperty(window,'__gardenMockMicrophone',{configurable:true,value:ctl});
 let seed=391919;
 class FakeAudioContext{
  resume(){return Promise.resolve()}
  close(){return Promise.resolve()}
  createMediaStreamSource(){return {connect(){}}}
  createAnalyser(){return {
   fftSize:2048,smoothingTimeConstant:0,
   getFloatTimeDomainData(a){
    ctl.reads++;
    const scale=ctl.signal==='blow'?0.116:ctl.signal==='strong'?0.30:0;
    for(let i=0;i<a.length;i++){
     seed=(Math.imul(seed,1664525)+1013904223)>>>0;
     a[i]=(((seed>>>8)/16777215)*2-1)*scale;
    }
   }
  }}
 }
 Object.defineProperty(window,'AudioContext',{configurable:true,value:FakeAudioContext});
 Object.defineProperty(window,'webkitAudioContext',{configurable:true,value:FakeAudioContext});
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{
  async getUserMedia(c){
   if(c.video!==false||!c.audio)throw Error('unexpected microphone request');
   ctl.mics++;
   const track={kind:'audio',enabled:true,stop(){ctl.tracksStopped++}};
   return {getTracks:()=>[track],getAudioTracks:()=>[track]};
  }
 }});
}
async function signal(p,value){await p.evaluate(v=>{window.__gardenMockMicrophone.signal=v},value)}
async function run(p,id,viewport){
 await p.goto(base+'/breath-garden/',{waitUntil:'load'});
 await p.locator(modeButtons[id]).click();
 await p.locator('#playScreen:visible').waitFor();
 await p.waitForFunction(()=>window.__gardenMockMicrophone.mics>=1);
 // The page waits for microphone calibration and shows a preparation interval.
 await p.waitForTimeout(2900);
 if(id==='long'){
  assert.match(await p.locator('#targetDuration').innerText(),/2초/);
  await signal(p,'blow');
  await p.waitForFunction(()=>document.querySelector('#longProgress')?.textContent.includes('1 / 2 완료'),null,{timeout:7000});
  await signal(p,'quiet');
  await p.waitForFunction(()=>document.querySelector('#longProgress')?.textContent.includes('2 / 2번 도전'),null,{timeout:5500});
  await signal(p,'blow');
  await p.locator('#successScreen:visible').waitFor({timeout:9000});
  assert.match(await p.locator('#winTitle').innerText(),/두 번 성공/);
 }else if(id==='strength'){
  const counts=[2,3,2,2];
  for(let stage=0;stage<counts.length;stage++){
   await p.waitForFunction(n=>document.querySelector('#strengthStep')?.textContent.includes((n+1)+'/4'),stage,{timeout:11000});
   for(let round=0;round<counts[stage];round++){
    await signal(p,'blow');
    await p.waitForFunction(()=>document.querySelector('#breathTask')?.textContent.includes('잠깐 쉬어요'),null,{timeout:6500});
    await signal(p,'quiet');
    await p.waitForFunction(n=>[...document.querySelectorAll('#strengthStamps')].flatMap(x=>x.textContent.match(/🌼/g)||[]).length>=n,round+1,{timeout:5500});
   }
  }
  await p.locator('#successScreen:visible').waitFor({timeout:12500});
  assert.match(await p.locator('#winTitle').innerText(),/바람꽃/);
 }else if(id==='beat'){
  let scored=0;
  for(let attempt=0;attempt<14&&scored<4;attempt++){
   await signal(p,'quiet');
   await p.waitForFunction(()=>document.querySelector('#beatCue')?.textContent.includes('준비'),null,{timeout:6000});
   await p.waitForFunction(()=>document.querySelector('#beatCue')?.textContent.includes('후'),null,{timeout:6000});
   await signal(p,'blow');
   await p.waitForTimeout(1030);
   scored=(await p.locator('#beatCount').innerText().catch(()=>'' )).match(/🌼/g)?.length||0;
  }
  await p.locator('#successScreen:visible').waitFor({timeout:5000});
  assert.equal(scored,4,'four separated beats need four genuine scoring events');
  assert.match(await p.locator('#winTitle').innerText(),/박자 바람/);
 }
 assert.ok((await p.evaluate(()=>window.__gardenMockMicrophone.reads))>35,'fake sample stream did not flow through analyser');
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=4),viewport.name+'/'+id+' horizontal overflow');
 await p.screenshot({path:out+'/'+viewport.name+'-'+id+'-win.png',fullPage:true});
 return {device:viewport.name,game:id,result:'completed',virtualMic:true,reads:await p.evaluate(()=>window.__gardenMockMicrophone.reads)};
}
(async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage']});
 const results=[];
 try{
  for(const viewport of widths){
   const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},reducedMotion:'reduce'});
   await context.addInitScript(fakeMicrophone);
   const page=await context.newPage();
   page.setDefaultTimeout(14000);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   try{
    for(const game of ['long','strength','beat']){
     results.push(await run(page,game,viewport));
    }
    assert.deepEqual(errors,[],viewport.name+' uncaught JavaScript errors');
   }finally{await context.close()}
  }
 }finally{await browser.close()}
 assert.equal(results.length,6);
 fs.writeFileSync(out+'/report.json',JSON.stringify({scope:'synthetic audio signal only: NOT physical mic, sound, breath strength, real child or therapeutic validation',results},null,2)+'\n');
 console.log('PASS virtual microphone full-play '+JSON.stringify({sessions:results.length,games:['strength','long','beat'],results}));
})().catch(e=>{console.error(e);process.exitCode=1});

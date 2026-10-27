'use strict';
// Real UI completion for recorder fingering, with correct/incorrect choices.
// This checks virtual buttons; it cannot verify real recorder sound or camera accuracy.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright-core');
const root=(process.env.TEST_BASE_URL||'http://127.0.0.1:8765').replace(/\/$/,'');
const out='qa/recorder-full-play-artifacts';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage']});
 const report=[];
 try{
  for(const device of [{id:'mobile',width:390,height:844},{id:'desktop',width:1280,height:900}]){
   const ctx=await browser.newContext({viewport:{width:device.width,height:device.height},reducedMotion:'reduce'});
   const page=await ctx.newPage();page.setDefaultTimeout(11000);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   try{
    for(const mode of ['easy','normal']){
     await page.goto(root+'/thinking-garden/recorder/',{waitUntil:'load'});
     if(mode==='normal')await page.locator('.rec-advanced summary').click();
     await page.locator('[data-start="'+mode+'"]').click();
     const rounds=mode==='easy'?6:10;
     for(let i=0;i<rounds;i++){
      const marker=device.id+'/'+mode+'/'+(i+1);
      await page.locator('#practiceScreen:visible').waitFor();
      assert.match(await page.locator('#roundTitle').innerText(),new RegExp((i+1)+' / '+rounds),marker+' label');
      // Normal mode intentionally hides the model. Reveal using the normal hint control.
      if(!(await page.locator('#guideRecorder .hole.on').count()))await page.locator('#hintBtn').click();
      const expected=await page.locator('#guideRecorder .hole.on').evaluateAll(els=>els.map(x=>x.dataset.hole));
      assert.ok(expected.length>=2 && expected.length<=4,marker+' wrong reference fingering');
      if(i===0){
       await page.locator('#playerRecorder .hole[data-hole="7"]').click();
       await page.locator('#checkBtn').click();
       assert.equal(await page.locator('#nextBtn').isVisible(),false,marker+' incorrect fingering accepted');
       assert.match(await page.locator('#feedback').innerText(),/열어볼까|막아보자|열려 있어/,marker+' missing guidance');
       await page.locator('#playerRecorder .hole[data-hole="7"]').click();
      }
      for(const hole of expected)await page.locator('#playerRecorder .hole[data-hole="'+hole+'"]').click();
      if(mode==='normal')await page.locator('#checkBtn').click();
      await page.locator('#nextBtn:visible').waitFor({timeout:3500});
      assert.match(await page.locator('#feedback').innerText(),/완성/,marker+' no success feedback');
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
      assert.ok(overflow<=4,marker+' horizontal overflow: '+overflow);
      await page.locator('#nextBtn').click();
      if((i+1)%3===0&&i<rounds-1){
       await page.locator('#bridgeScreen:visible').waitFor();
       assert.ok(await page.locator('#bridgeNote').isVisible(),marker+' physical practice bridge missing');
       await page.locator('#bridgeSkip').click();
      }
     }
     await page.locator('#finishScreen:visible').waitFor();
     assert.ok((await page.locator('#resultSummary').innerText()).includes(rounds+'개'),device.id+'/'+mode+' bad summary');
     assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('moa-garden:completed')||'{}').recorder),true);
     report.push({device:device.id,mode,rounds,completed:true,wrongAndRecovered:true});
     await page.screenshot({path:out+'/'+device.id+'-'+mode+'-result.png',fullPage:true});
     await page.locator('#finishHome').click();
     assert.equal(await page.locator('#homeScreen').isVisible(),true);
    }
    assert.deepEqual(errors,[],device.id+' JavaScript errors');
   }finally{await ctx.close()}
  }
 }finally{await browser.close()}
 assert.equal(report.length,4);
 assert.equal(report.reduce((n,r)=>n+r.rounds,0),32);
 fs.writeFileSync(out+'/report.json',JSON.stringify({scope:'real virtual fingering clicks only; no physical recorder or real-user testing',sessions:4,rounds:32,report},null,2)+'\n');
 console.log('PASS recorder real full-play '+JSON.stringify({sessions:4,rounds:32,report}));
})().catch(err=>{console.error(err);process.exitCode=1});

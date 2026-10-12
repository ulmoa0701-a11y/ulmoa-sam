import {chromium} from 'playwright-core';
const URL='https://ulmoa0701-a11y.github.io/ulmoa-sam/boomwhacker/';
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const results=[];
try{
 for(const mobile of [false,true]){
  for(const mode of ['interlude','music','voice']){
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1366,height:900}});
   const page=await context.newPage(),jsErrors=[];
   page.on('pageerror',e=>jsErrors.push(e.message));
   const result={mobile,mode,ok:false};
   try{
    let deployed=false;
    for(let attempt=0;attempt<16;attempt++){
     const pageUrl=URL+'?song=twinkle&guidesLiveQa='+Date.now();
     const response=await page.goto(pageUrl,{waitUntil:'domcontentloaded',timeout:18000});
     deployed=!!response?.ok()&&await page.locator('#introMode option[value="voice"]').count()===1
       &&await page.locator('#introHelp').count()===1;
     if(deployed)break;
     await page.waitForTimeout(4000);
    }
    if(!deployed)throw Error('LIVE site has not deployed new three start choices');
    if(mobile)await page.locator('#mobileSettingsBtn').click();
    await page.locator('#introMode').selectOption(mode);
    result.choice=await page.locator('#introMode').inputValue();
    result.help=await page.locator('#introHelp').innerText();
    if(mobile)await page.locator('#mobileSettingsClose').click();
    await page.evaluate(()=>{
     window.__actualSpoken=[];
     Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
      cancel(){},getVoices(){return []},
      speak(u){window.__actualSpoken.push({text:u.text,language:u.lang,rate:u.rate})}
     }});
     if(!window.SpeechSynthesisUtterance)window.SpeechSynthesisUtterance=function(text){this.text=text};
     window.__actualClock=[];
     const origMelody=scheduleMelodyTone,origMR=scheduleMrTrack;
     scheduleMelodyTone=function(...args){window.__actualClock.push({kind:'melody',note:args[2],at:args[3]});return origMelody(...args)};
     scheduleMrTrack=function(...args){window.__actualClock.push({kind:'mr',at:args[2]});return origMR(...args)};
    });
    result.audio=await page.evaluate(async guideMode=>{
     const plan=instrumentalPreludePlan(),step=beatMs();
     const ac=new OfflineAudioContext(1,Math.ceil(44100*(plan.durationMs/1000+1)),44100);
     if(guideMode==='interlude')scheduleInterludeMusic(ac,ac.destination,.05,step,plan.meter);
     else scheduleRhythmGuide(ac,ac.destination,.05,plan.beats,step,plan.meter);
     const audio=(await ac.startRendering()).getChannelData(0);
     let strength=0;
     for(let i=Math.floor(.07*44100);i<Math.floor(.25*44100);i++)strength+=Math.abs(audio[i]);
     return{beats:plan.beats,firstBallOffsetMs:plan.firstBallOffsetMs,energy:Math.round(strength)};
    },mode);
    await page.locator(mobile?'#playBtn':'#startBtn').click();
    result.start=await page.evaluate(()=>({
     active:introActive,mode:introMode,beatCount:introCountBeats,preview:introPreviewBeats,
     pulse:document.querySelector('#introPulse').innerText,spoken:window.__actualSpoken.slice()
    }));
    await page.waitForFunction(()=>introActive&&document.querySelectorAll('.fall').length>0,null,{timeout:9000});
    result.descending=await page.evaluate(()=>({balls:document.querySelectorAll('.fall').length,playing,introActive,
      compact:document.querySelector('#introOverlay').classList.contains('preludePlaying')}));
    if(mode==='voice'){
     await page.waitForFunction(()=>window.__actualSpoken.length>=2,null,{timeout:3200});
     result.spoken=await page.evaluate(()=>window.__actualSpoken.slice());
    }
    await page.waitForFunction(()=>!introActive&&playing,null,{timeout:16000});
    result.handoff=await page.evaluate(()=>({
      playing,introActive,elapsed,first:firstNoteMs(),mix:mixMode,clock:window.__actualClock.slice(),
      resetSpeech:typeof window.speechSynthesis
    }));
    const first=result.handoff.clock.find(x=>x.kind==='melody'),mr=result.handoff.clock.find(x=>x.kind==='mr');
    result.ok=result.choice===mode&&result.audio.energy>10&&result.audio.beats>=4
      &&result.start.active&&result.start.mode===mode&&result.start.beatCount===0
      &&result.start.preview===result.audio.beats&&result.descending.balls>0
      &&result.descending.introActive&&!result.descending.playing&&result.descending.compact
      &&result.handoff.playing&&Math.abs(result.handoff.elapsed-result.handoff.first)<150
      &&first?.note==='도'&&!!mr&&Math.abs(first.at-mr.at)<.003&&!jsErrors.length;
    if(mode==='voice')result.ok=result.ok&&result.spoken[0]?.text==='하나'
      &&result.spoken[1]?.text==='둘'&&result.spoken[0]?.language==='ko-KR';
   }catch(err){result.error=String(err)}
   result.jsErrors=jsErrors;
   console.log('LIVE_THREE_GUIDES='+JSON.stringify(result));
   results.push(result);
   await context.close();
  }
 }
}finally{await browser.close()}
if(results.length!==6||results.some(x=>!x.ok))process.exitCode=1;

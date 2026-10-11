import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {chromium} from 'playwright-core';
const root=path.resolve('.');
const out=path.join(root,'boomwhacker','interlude-qa-artifacts');
fs.mkdirSync(out,{recursive:true});
const results=[];
const song={title:'간주 검증곡',timeN:2,timeD:4,bpm:140,
  measures:[[{note:'도',dur:1,lyric:'하'},{note:'솔',dur:1,lyric:'나'}],[{note:'미',dur:1,lyric:'둘'},{note:'솔',dur:1,lyric:'셋'}]]};
let server,browser;
try{
 server=http.createServer((req,res)=>{
  const requested=new URL(req.url,'http://127.0.0.1').pathname;
  let file=path.resolve(root,'.'+decodeURIComponent(requested));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end()}
  if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)){res.writeHead(404);return res.end()}
  res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':'application/octet-stream');
  fs.createReadStream(file).pipe(res);
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1366,height:900},acceptDownloads:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const result={mobile};
  try{
   await page.goto('http://127.0.0.1:'+server.address().port+'/boomwhacker/',{waitUntil:'domcontentloaded'});
   await page.evaluate(x=>localStorage.setItem('ulmoaBoomTransfer',JSON.stringify(x)),song);
   await page.reload({waitUntil:'domcontentloaded'});
   if(mobile){await page.locator('#mobileSettingsBtn').click();result.settingsOpen=await page.locator('#introMode').isVisible();}
   await page.locator('#introMode').selectOption('interlude');
   const info=await page.evaluate(()=>({mode:introMode,bpm,meter:currentSong.timeN,song:currentSong.title,
     beat:beatMs(),firstNote:firstNoteMs(),view:playView}));
   result.info=info;
   if(info.mode!=='interlude'||info.song!==song.title||info.bpm<35||info.bpm>140||Math.abs(info.beat-60000/info.bpm)>1)throw Error('Incorrect musical interlude selected '+JSON.stringify(info));
   if(mobile)await page.locator('#mobileSettingsClose').click();
   const audioProbe=await page.evaluate(async()=>{
    const ac=new OfflineAudioContext(1,44100*4,44100);
    const g=ac.createGain();g.connect(ac.destination);
    scheduleInterludeAccompaniment(ac,g,.05,6,beatMs(),2);
    const rendered=await ac.startRendering(),d=rendered.getChannelData(0);
    const power=(a,b)=>{let energy=0;for(let i=Math.floor(a*44100);i<Math.min(d.length,Math.floor(b*44100));i++)energy+=Math.abs(d[i]);return Math.round(energy)};
    return {firstBeat:power(0,.3),secondBeat:power(.45,.7),laterBar:power(.9,1.2)};
   });
   result.audioProbe=audioProbe;
   if(audioProbe.firstBeat<=5||audioProbe.secondBeat<=5||audioProbe.laterBar<=5)throw Error('Interlude is not true audible chordal accompaniment '+JSON.stringify(audioProbe));
   await page.locator(mobile?'#playBtn':'#startBtn').click();
   result.start=await page.evaluate(()=>({mode:introMode,active:introActive,beats:introBeats,durationMs:introDurationMs,heading:document.querySelector('#introHeading').innerText,gain:!!introGain}));
   if(!result.start.active||result.start.beats!==6||result.start.heading!=='반주 간주를 듣고 들어가요'||!result.start.gain)throw Error('Interlude did not start '+JSON.stringify(result.start));
   await page.evaluate(()=>{introStartPerf=performance.now()-(introDurationMs+15);introFrame(performance.now())});
   await page.waitForTimeout(90);
   result.handoff=await page.evaluate(()=>({introActive,playing,leadGain:!!leadInGain,elapsed,firstNote:firstNoteMs(),beat:beatMs(),sound}));
   if(result.handoff.introActive||!result.handoff.playing||!result.handoff.leadGain||result.handoff.elapsed>=1000)throw Error('No real falling-note handoff '+JSON.stringify(result.handoff));
   await page.locator('#resetBtn').click();
   result.reset=await page.evaluate(()=>({playing,introActive,leadGain:!!leadInGain}));
   if(result.reset.playing||result.reset.introActive||result.reset.leadGain)throw Error('Lead was not safely cancelled');
   await page.locator('#playViewSelect').selectOption('score');
   await page.locator(mobile?'#playBtn':'#startBtn').click();
   await page.evaluate(()=>{introStartPerf=performance.now()-(introDurationMs+15);introFrame(performance.now())});
   result.scoreStart=await page.evaluate(()=>({view:playView,introActive,playing,leadGain:!!leadInGain,elapsed,first:scoreStartMs()}));
   if(result.scoreStart.introActive||!result.scoreStart.playing||result.scoreStart.leadGain||result.scoreStart.elapsed<result.scoreStart.first-100)throw Error('Score mode first-note alignment wrong');
   await page.locator('#resetBtn').click();
   result.ok=errors.length===0;
   result.errors=errors;
  }catch(err){result.ok=false;result.error=String(err);result.errors=errors}
  results.push(result);console.log('BOOM_INTERLUDE_QA='+JSON.stringify(result));
  await page.screenshot({path:path.join(out,'interlude-'+(mobile?'mobile':'desktop')+'.png'),fullPage:true}).catch(()=>{});
  await context.close();
 }
}finally{await browser?.close();if(server)await new Promise(done=>server.close(done))}
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
if(results.length!==2||results.some(x=>!x.ok))process.exitCode=1;

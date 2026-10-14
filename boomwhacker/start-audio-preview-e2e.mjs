import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright-core';

const root=path.resolve('.');
const dir=path.join(root,'boomwhacker','audio-preview-artifacts');
fs.mkdirSync(dir,{recursive:true});
const server=http.createServer((req,res)=>{
 let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end()}
 if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.wav')?'audio/wav':file.endsWith('.css')?'text/css':'text/javascript');
 fs.createReadStream(file).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const outputs=[],types=['interlude','music','kids','soft'];
try{
 // Simulate a child pressing Play before a slow mobile data connection
 // has delivered the real piano. Never silently play synthetic fallback.
 const delayed=await browser.newPage({viewport:{width:390,height:844}});
 await delayed.route('**/audio/mats-helgesson-piano.mp3',async route=>{
   await new Promise(done=>setTimeout(done,1600));await route.continue();
 });
 await delayed.goto('http://127.0.0.1:'+server.address().port+'/boomwhacker/?song=twinkle',{waitUntil:'domcontentloaded'});
 await delayed.locator('#playBtn').click();
 const early=await delayed.evaluate(()=>({
   waiting:pianoStartPending,loaded:pianoLoadState,playing,introActive,
   text:document.querySelector('#startBtn').textContent
 }));
 if(!early.waiting||early.loaded!=='loading'||early.playing||early.introActive||!early.text.includes('준비 중'))
   throw Error('Piano audio started BEFORE sample load '+JSON.stringify(early));
 await delayed.waitForFunction(()=>pianoLoadState==='ready'&&introActive&&!pianoStartPending,null,{timeout:14000});
 const resumed=await delayed.evaluate(()=>({
   ready:pianoLoadState,playing,introActive,waiting:pianoStartPending,
   sampleSeconds:pianoBuffer?.duration??0
 }));
 if(resumed.ready!=='ready'||!resumed.introActive||resumed.waiting||resumed.sampleSeconds<38)
   throw Error('Piano audio failed to start AFTER decode '+JSON.stringify(resumed));
 console.log('BOOM_SLOW_MOBILE_PIANO='+JSON.stringify({early,resumed}));
 await delayed.close();
 const page=await browser.newPage({acceptDownloads:true,viewport:{width:1280,height:900}});
 await page.goto('http://127.0.0.1:'+server.address().port+'/boomwhacker/?song=twinkle',{waitUntil:'networkidle'});
 if(await page.locator('#introMode option[value="voice"]').count())throw Error('Voice choice still present');
 await page.waitForFunction(()=>pianoLoadState==='ready'||pianoLoadState==='unavailable',null,{timeout:12000});
 const loaded=await page.evaluate(()=>({state:pianoLoadState,seconds:pianoBuffer?.duration??0}));
 if(loaded.state!=='ready'||loaded.seconds<38)throw Error('Real piano samples not decoded '+JSON.stringify(loaded));
 console.log('ACOUSTIC_PIANO_LOADED='+JSON.stringify(loaded));
 for(const bpmValue of [66,100,140]){
  await page.locator('#tempo').evaluate((el,value)=>{el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}))},bpmValue);
  for(const mode of types){
   const filename='boomwhacker-'+bpmValue+'bpm-'+mode+'.wav';
   const downloadPromise=page.waitForEvent('download',{timeout:20000});
   const stat=await page.evaluate(async ({mode,filename})=>{
    const rate=22050,plan=instrumentalPreludePlan(),delay=.10;
    const ac=new OfflineAudioContext(1,Math.ceil(rate*(plan.durationMs/1000+.85)),rate);
    const output=ac.createGain();
    output.gain.value=.72;output.connect(ac.destination);
    if(plan.durationMs<6500||plan.bars%2)throw Error('Introduction is too short or not an even-bar phrase');
    let playedPiano=0;
    const original=sampledPiano;
    sampledPiano=function(...args){const played=original(...args);if(played)playedPiano++;return played};
    try{
     if(mode==='interlude')scheduleInterludeMusic(ac,output,delay,beatMs(),plan.meter);
     else if(mode==='music')scheduleRhythmGuide(ac,output,delay,plan.beats,beatMs(),plan.meter);
     else{mrStyle=mode;scheduleBuiltinMr(ac,output,delay,0,.70)}
    }finally{sampledPiano=original}
    if(mode!=='music'&&playedPiano<8)throw Error('Piano sample not used in '+mode+'; '+playedPiano);
    const samples=(await ac.startRendering()).getChannelData(0);
    const data=new ArrayBuffer(samples.length*2+44),view=new DataView(data);
    const text=(offset,s)=>{for(let i=0;i<s.length;i++)view.setUint8(offset+i,s.charCodeAt(i))};
    text(0,'RIFF');view.setUint32(4,data.byteLength-8,true);text(8,'WAVE');
    text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);
    view.setUint16(22,1,true);view.setUint32(24,rate,true);
    view.setUint32(28,rate*2,true);view.setUint16(32,2,true);
    view.setUint16(34,16,true);text(36,'data');view.setUint32(40,samples.length*2,true);
    let peak=0,sum=0;
    for(let i=0;i<samples.length;i++){
      const v=Math.max(-1,Math.min(1,samples[i]));
      peak=Math.max(peak,Math.abs(v));sum+=v*v;
      view.setInt16(44+i*2,Math.round(v*32767),true);
    }
    const blob=new Blob([data],{type:'audio/wav'});
    const href=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=href;link.download=filename;document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(href),5000);
    return {mode,bpm,beats:plan.beats,meter:plan.meter,duration:plan.durationMs,pianoSampleNotes:playedPiano,
      peak:Number(peak.toFixed(4)),rms:Number(Math.sqrt(sum/samples.length).toFixed(4))};
   },{mode,filename,bpm:bpmValue});
   const dl=await downloadPromise;
   await dl.saveAs(path.join(dir,filename));
   stat.bytes=fs.statSync(path.join(dir,filename)).size;
   if(stat.bytes<4000||stat.peak<.005||stat.rms<.001)throw Error('Silent/weird preview '+JSON.stringify(stat));
   outputs.push(stat);
   console.log('BOOM_AUDIO_PREVIEW='+JSON.stringify(stat));
  }
 }
 // Real rendered listening samples of all NEW songs and two easy versions.
 // Automatic pitch and volume checks do not replace a teacher's listening.
 const classroomSongs=[
  ['moa-signal',3],['moa-space',5],['moa-party',8],['moa-breeze',3],
  ['twinkle',3],['plane',5]
 ];
 for(const [key,difficulty] of classroomSongs){
  await page.locator('#sampleSelect').selectOption(key);
  await page.locator('#levels button[data-level="'+difficulty+'"]').click();
  const filename='classroom-'+key+'-'+difficulty+'note-melody-mr.wav';
  const waitDownload=page.waitForEvent('download',{timeout:20000});
  const stats=await page.evaluate(async (filename)=>{
   const rate=22050,bufferSec=(events.at(-1).start+events.at(-1).dur-firstNoteMs())/1000+1.3;
   const ac=new OfflineAudioContext(1,Math.ceil(rate*bufferSec),rate),bus=ac.createGain();
   bus.gain.value=.70;bus.connect(ac.destination);
   const start=.06;
   // The backing audio includes every original note; difficulty hides only falling cues.
   for(const e of events)if(e.note!=='쉼'&&FREQ[e.note])
    scheduleMelodyTone(ac,bus,e.note,start+(e.start-firstNoteMs())/1000,'piano',.64,e.dur);
   scheduleBuiltinMr(ac,bus,start,0,.48);
   const data=(await ac.startRendering()).getChannelData(0);
   const wav=new ArrayBuffer(data.length*2+44),v=new DataView(wav),word=(off,s)=>{
    for(let i=0;i<s.length;i++)v.setUint8(off+i,s.charCodeAt(i));
   };
   word(0,'RIFF');v.setUint32(4,wav.byteLength-8,true);word(8,'WAVE');
   word(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);
   v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);
   v.setUint16(32,2,true);v.setUint16(34,16,true);word(36,'data');v.setUint32(40,data.length*2,true);
   let peak=0,energy=0;
   for(let i=0;i<data.length;i++){const sample=Math.max(-1,Math.min(1,data[i]));v.setInt16(44+2*i,Math.round(sample*32767),true);peak=Math.max(peak,Math.abs(sample));energy+=sample*sample;}
   const blob=new Blob([wav],{type:'audio/wav'}),url=URL.createObjectURL(blob),link=document.createElement('a');
   link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();
   setTimeout(()=>URL.revokeObjectURL(url),5000);
   return{song:currentSong.title,key:currentSong.key,level,notes:events.length,arrangedNotes,peak,
    rms:Math.sqrt(energy/data.length),seconds:bufferSec,skipped:events.filter(e=>e.note!=='쉼'&&!e.active).length};
  },filename);
  const file=await waitDownload;await file.saveAs(path.join(dir,filename));
  if(stats.arrangedNotes!==0||stats.peak<.008||stats.rms<.002||stats.peak>=.98||!fs.statSync(path.join(dir,filename)).size)
   throw Error('Invalid classroom audio '+JSON.stringify(stats));
  outputs.push({kind:'classroom',...stats,filename});console.log('CLASSROOM_AUDIO_PREVIEW='+JSON.stringify(stats));
 }
 fs.writeFileSync(path.join(dir,'measurements.json'),JSON.stringify(outputs,null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
if(outputs.length!==18)process.exitCode=1;

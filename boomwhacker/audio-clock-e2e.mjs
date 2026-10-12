// Real elapsed-time browser validation: first six melody notes must be
// booked in advance by the WebAudio clock, not played by animation frames.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright-core';
const root=path.resolve('.');
let server,browser;
const outcomes=[];
try{
 server=http.createServer((req,res)=>{
  let filename=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!filename.startsWith(root+path.sep)||!fs.existsSync(filename)){res.writeHead(404);return res.end()}
  if(fs.statSync(filename).isDirectory())filename=path.join(filename,'index.html');
  if(!fs.existsSync(filename)){res.writeHead(404);return res.end()}
  res.setHeader('Content-Type',filename.endsWith('.css')?'text/css':filename.endsWith('.js')?'text/javascript':filename.endsWith('.html')?'text/html':'application/octet-stream');
  fs.createReadStream(filename).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1366,height:900}});
  const errors=[],out={mobile};
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://127.0.0.1:'+server.address().port+'/boomwhacker/?song=twinkle',{waitUntil:'domcontentloaded'});
   await page.locator('#tempo').evaluate(el=>{el.value='120';el.dispatchEvent(new Event('input',{bubbles:true}))});
   await page.evaluate(()=>{
    window.__musicAudit={notes:[],render:[],mr:null};
    const origNote=scheduleMelodyTone,origMr=scheduleMrTrack,origDraw=draw;
    scheduleMelodyTone=function(...args){
     window.__musicAudit.notes.push({note:args[2],when:args[3],bookedAt:args[0].currentTime,duration:args[6]});
     return origNote(...args);
    };
    scheduleMrTrack=function(...args){
     if(window.__musicAudit.mr===null)window.__musicAudit.mr=args[2];
     return origMr(...args);
    };
    draw=function(...args){
     if(playing&&audioCtx&&audioRenderSongStartAt){
      for(let i=0;i<6;i++)if(!window.__musicAudit.render.some(r=>r.i===i)&&elapsed>=events[i].start)
       window.__musicAudit.render.push({i,note:events[i].note,time:audioCtx.currentTime,elapsed,when:audioRenderSongStartAt+(events[i].start-firstNoteMs())/1000});
     }
     return origDraw(...args);
    };
   });
   await page.locator(mobile?'#playBtn':'#startBtn').click();
   await page.waitForFunction(()=>window.__musicAudit.notes.length>=6&&window.__musicAudit.render.length>=6,null,{timeout:23000});
   const data=await page.evaluate(()=>({...window.__musicAudit,beat:beatMs(),bpm}));
   const expected=['도','도','솔','솔','라','라'],first=data.notes[0].when;
   const melodic=data.notes.slice(0,6).map((n,i)=>({pitch:n.note,errorMs:Math.round((n.when-first-i*data.beat/1000)*1000),advanceMs:Math.round((n.when-n.bookedAt)*1000),durationMs:n.duration}));
   const visual=data.render.slice(0,6).map(r=>({i:r.i,pitch:r.note,lateMs:Math.round((r.time-r.when)*1000)}));
   const maxPitchDrift=Math.max(...melodic.map(x=>Math.abs(x.errorMs)));
   const maxVisualDelay=Math.max(...visual.map(x=>Math.max(0,x.lateMs)));
   out.data={melodic,visual,maxPitchDrift,maxVisualDelay,beat:data.beat,mr:data.mr,first};
   out.ok=data.bpm===120&&expected.every((x,i)=>melodic[i].pitch===x)&&
     maxPitchDrift<=5&&melodic.slice(1).every(x=>x.advanceMs>=60)&&
     Math.abs(first-data.mr)<=.003&&maxVisualDelay<65&&!errors.length;
   await page.locator('#resetBtn').click();
   out.stopped=await page.evaluate(()=>({playing,songBus:!!songMelodyGain,mrSource:!!mrSource,songClock:audioRenderSongStartAt}));
   if(out.stopped.playing||out.stopped.songBus||out.stopped.mrSource||out.stopped.songClock)out.ok=false;
   out.errors=errors;
  }catch(e){out.ok=false;out.error=String(e);out.errors=errors;}
  outcomes.push(out);
  console.log('BOOM_LIVE_AUDIO_CLOCK_QA='+JSON.stringify(out));
  await page.close();
 }
}finally{
 await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));
}
if(outcomes.length!==2||outcomes.some(x=>!x.ok))process.exitCode=1;

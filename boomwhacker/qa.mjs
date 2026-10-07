import { chromium } from 'playwright-core';
import fs from 'node:fs';

const ROOT='http://127.0.0.1:8765';
const BASE=ROOT+'/boomwhacker/';
const HEART=ROOT+'/heart-score/';
const CHROME=process.env.CHROME_BIN||'/usr/bin/google-chrome';
const out='boomwhacker/qa-artifacts';
fs.mkdirSync(out,{recursive:true});
const failures=[];
const report=[];
const check=(ok,msg)=>{if(!ok)failures.push(msg)};
function makeWav(seconds=.8,freq=180,sampleRate=22050){
  const samples=Math.floor(seconds*sampleRate),dataBytes=samples*2,b=Buffer.alloc(44+dataBytes);
  b.write('RIFF',0);b.writeUInt32LE(36+dataBytes,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sampleRate,24);b.writeUInt32LE(sampleRate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(dataBytes,40);
  for(let i=0;i<samples;i++){const env=Math.min(1,i/(sampleRate*.02))*Math.max(0,1-i/samples),v=Math.sin(2*Math.PI*freq*i/sampleRate)*.32*env;b.writeInt16LE(Math.max(-32767,Math.min(32767,Math.round(v*32767))),44+i*2)}
  return b;
}
const browser=await chromium.launch({headless:true,executablePath:CHROME,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});

async function basicCase(name,width,height){
  const context=await browser.newContext({viewport:{width,height}});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
  const response=await page.goto(BASE,{waitUntil:'networkidle'});
  check(response?.ok(),`${name}: HTTP response not OK`);
  check((await page.title()).includes('붐웨커 Studio'),`${name}: wrong title`);
  const robots=await page.locator('meta[name=robots]').getAttribute('content');
  check(robots==='noindex,nofollow',`${name}: robots guardrail changed (${robots})`);
  check(await page.locator('.tube').count()===8,`${name}: expected 8 tubes`);
  check(await page.locator('.laneLabel').count()===8,`${name}: expected 8 lanes`);
  const fallSize=await page.locator('.fall').first().evaluate(el=>parseFloat(getComputedStyle(el).width));
  check(fallSize>=(width<=800?44:56),`${name}: falling note is still too small (${fallSize}px)`);
  check(await page.locator('.beat').count()>0,`${name}: score did not render`);
  check(await page.locator('#lyricTrack').count()===1,`${name}: lyric track missing`);
  check(await page.locator('.lyricSyllable').count()>5,`${name}: lyric track did not render a continuous line`);
  const tubeLabelColors=await page.locator('.tube').evaluateAll(xs=>xs.map(x=>({note:x.dataset.note,color:getComputedStyle(x.querySelector('.tubeLabel')).color})));
  const tubeColorMap=Object.fromEntries(tubeLabelColors.map(x=>[x.note,x.color]));
  check(tubeColorMap['도']==='rgb(235, 36, 39)'&&tubeColorMap['레']==='rgb(246, 133, 31)'&&tubeColorMap['미']==='rgb(251, 237, 27)'&&tubeColorMap['파']==='rgb(115, 200, 74)'&&tubeColorMap['솔']==='rgb(0, 163, 154)'&&tubeColorMap['라']==='rgb(75, 74, 168)'&&tubeColorMap['시']==='rgb(216, 58, 155)',`${name}: pitch-colored note labels are wrong: ${JSON.stringify(tubeColorMap)}`);
  check(await page.locator('#sampleSelect option').count()===15,`${name}: sample selector should contain current + 14 samples`);
  check(await page.locator('#videoBtn').count()===1,`${name}: video export button missing`);
  check(await page.locator('#melodySelect').count()===1,`${name}: melody selector missing`);
  check(await page.locator('#melodySelect option').count()===4,`${name}: melody selector should have 4 choices`);
  check((await page.locator('#melodySelect').inputValue())==='boom',`${name}: default melody should be Boomwhacker`);
  check(await page.locator('#mixModes button').count()===3,`${name}: mix mode should have 3 choices`);
  check(await page.locator('#mixModes button.on').getAttribute('data-mix')==='melody',`${name}: default mix mode should be melody only`);
  check(await page.locator('#mrFile').count()===1,`${name}: MR file input missing`);
  check(await page.locator('#mrVolume').count()===1,`${name}: MR volume control missing`);
  check((await page.locator('#mrVolume').inputValue())==='85',`${name}: default MR volume should be 85%`);
  check(await page.locator('#watermarkOpt').isChecked(),`${name}: watermark should default on`);
  check(await page.locator('#creditOpt').isChecked(),`${name}: intro/outro should default on`);
  const videoInfo=await page.evaluate(()=>({supported:window.__boomVideoQA?.supported(),mime:window.__boomVideoQA?.mime(),brand:window.__boomVideoQA?.brand(),colors:window.__boomVideoQA?.colors(),melody:window.__boomVideoQA?.melody(),mix:window.__boomVideoQA?.mix(),lyrics:window.__boomVideoQA?.lyrics(),preview:window.__boomVideoQA?.preview()}));
  check(videoInfo.supported===true,`${name}: browser video export capability missing`);
  check(String(videoInfo.mime||'').startsWith('video/webm'),`${name}: WebM recorder mime missing`);
  check(videoInfo.brand?.brand==='울모아쌤'&&videoInfo.brand?.handle==='@ulmoa__sam',`${name}: video brand metadata wrong`);
  check(videoInfo.colors?.도==='#EB2427'&&videoInfo.colors?.레==='#F6851F'&&videoInfo.colors?.미==='#FBED1B'&&videoInfo.colors?.파==='#73C84A'&&videoInfo.colors?.솔==='#00A39A'&&videoInfo.colors?.라==='#4B4AA8'&&videoInfo.colors?.시==='#D83A9B',`${name}: Boomwhacker color mapping wrong`);
  check(videoInfo.melody?.mode==='boom'&&Object.keys(videoInfo.melody?.options||{}).length===4,`${name}: melody QA metadata wrong`);
  check(videoInfo.mix?.mode==='melody'&&Object.keys(videoInfo.mix?.options||{}).length===3&&videoInfo.mix?.mrReady===true&&videoInfo.mix?.mrKind==='auto'&&!videoInfo.mix?.mrLoaded,`${name}: mix QA metadata wrong`);
  check((videoInfo.lyrics?.items?.length||0)>5,`${name}: continuous lyric window missing`);
  check(videoInfo.preview?.w===1280&&videoInfo.preview?.h===720&&String(videoInfo.preview?.data||'').startsWith('data:image/png'),`${name}: 16:9 video preview render failed`);
  let overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth));
  check(overflow<=1,`${name}: horizontal overflow ${overflow}px`);
  if(width>=801){
    const visible=await page.evaluate(()=>{
      const ids=['startBtn','restartBtn','videoBtn','fullBtn'],out={};
      for(const id of ids){const el=document.getElementById(id),r=el?.getBoundingClientRect();out[id]=r?{top:r.top,bottom:r.bottom,left:r.left,right:r.right}:null}
      const controls=document.querySelector('.controls')?.getBoundingClientRect();
      return {vh:innerHeight,scrollY,controls:controls?{top:controls.top,bottom:controls.bottom,height:controls.height}:null,items:out};
    });
    for(const id of ['startBtn','restartBtn','videoBtn','fullBtn']){
      const r=visible.items[id];check(!!r&&r.top>=0&&r.bottom<=visible.vh,`${name}: ${id} is not visible without page scroll (${JSON.stringify(r)} / vh ${visible.vh})`);
    }
    check(visible.controls?.bottom<=visible.vh,`${name}: desktop control panel exceeds viewport (${JSON.stringify(visible.controls)} / vh ${visible.vh})`);
  }

  await page.locator('#levels button[data-level="3"]').click();
  check(await page.locator('.tube:not(.inactive)').count()===3,`${name}: 3-note mode active tube count wrong`);
  await page.locator('#levels button[data-level="5"]').click();
  check(await page.locator('.tube:not(.inactive)').count()===5,`${name}: 5-note mode active tube count wrong`);
  await page.locator('#levels button[data-level="8"]').click();
  check(await page.locator('.tube:not(.inactive)').count()===8,`${name}: 8-note mode active tube count wrong`);

  await page.locator('#sampleSelect').selectOption('bear');
  check((await page.locator('#songTitle').innerText())==='곰 세 마리',`${name}: bear sample did not load`);
  check(await page.locator('.beat').count()>20,`${name}: bear sample score is unexpectedly short`);
  await page.locator('#sampleSelect').selectOption('butterfly-d');
  check((await page.locator('#songTitle').innerText()).includes('D장조'),`${name}: transposed sample did not load`);
  check(await page.locator('.beat.unsupported').count()>0,`${name}: chromatic notes were not marked out of base range`);
  check((await page.locator('#rangeNote').innerText()).includes('다른 음으로 바꾸지 않고'),`${name}: safe out-of-range explanation missing`);
  await page.locator('#sampleSelect').selectOption('twinkle');

  await page.locator('#tempo').evaluate((el)=>{el.value='80';el.dispatchEvent(new Event('input',{bubbles:true}))});
  check((await page.locator('#bpmLabel').innerText()).includes('80 BPM'),`${name}: BPM control failed`);
  const lyricBefore=(await page.locator('.lyric').allInnerTexts()).join('').trim();
  await page.locator('#lyricBtn').click();
  const lyricAfter=(await page.locator('.lyric').allInnerTexts()).join('').trim();
  check(lyricBefore.length>0&&lyricAfter.length===0,`${name}: lyric toggle failed`);
  await page.locator('#lyricBtn').click();
  await page.locator('#soundBtn').click();
  check((await page.locator('#soundBtn').innerText()).includes('🔇'),`${name}: sound toggle failed`);
  await page.locator('#soundBtn').click();
  await page.locator('#melodySelect').selectOption('piano');
  check((await page.evaluate(()=>window.__boomVideoQA.melody().mode))==='piano',`${name}: piano melody selection failed`);
  await page.locator('#melodySelect').selectOption('xylophone');
  check((await page.evaluate(()=>window.__boomVideoQA.melody().mode))==='xylophone',`${name}: xylophone melody selection failed`);
  await page.locator('#melodySelect').selectOption('none');
  check((await page.evaluate(()=>window.__boomVideoQA.melody().mode))==='none',`${name}: no-melody selection failed`);
  await page.locator('#melodySelect').selectOption('boom');

  await page.evaluate(()=>{elapsed=1350;draw();updateTime();updateLyricTrack(true)});
  check(await page.locator('.lyricSyllable.active').count()===1,`${name}: current lyric syllable is not highlighted`);
  const activeBorder=await page.locator('.lyricSyllable.active').evaluate(el=>getComputedStyle(el).borderTopColor);
  check(activeBorder==='rgb(235, 36, 39)',`${name}: current lyric syllable does not use its Boomwhacker color (${activeBorder})`);
  await page.locator('#startBtn').click();
  await page.waitForTimeout(550);
  const progress=parseFloat((await page.locator('#progressFill').evaluate(el=>getComputedStyle(el).width)))||0;
  check(progress>0,`${name}: playback progress did not advance`);
  await page.locator('#playBtn').click();
  await page.locator('#resetBtn').click();
  const fillStyle=await page.locator('#progressFill').getAttribute('style')||'';
  check(fillStyle.includes('0%'),`${name}: reset did not return progress to zero`);

  await page.locator('#fullBtn').click();
  check(await page.locator('body').evaluate(el=>el.classList.contains('fullscreen')),`${name}: fullscreen class not enabled`);
  await page.evaluate(async()=>{document.body.classList.remove('fullscreen');if(document.fullscreenElement){try{await document.exitFullscreen()}catch(e){}}});
  check(!(await page.locator('body').evaluate(el=>el.classList.contains('fullscreen'))),`${name}: fullscreen class not disabled`);
  await page.locator('.tube[data-note="도"]').click();
  overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth));
  check(overflow<=1,`${name}: horizontal overflow after interactions ${overflow}px`);
  await page.screenshot({path:`${out}/${name}.png`,fullPage:true});
  check(errors.length===0,`${name}: JS errors: ${errors.join(' | ')}`);
  report.push({name,width,height,overflow,errors,beats:await page.locator('.beat').count(),tubeLabelColors,lyricSyllables:await page.locator('.lyricSyllable').count()});
  await context.close();
}

for(const [name,w,h] of [['mobile360',360,800],['mobile390',390,844],['mobile412',412,915],['tablet768',768,1024],['desktop1366short',1366,768],['desktop1600short',1600,800],['desktop1366',1366,900]]) await basicCase(name,w,h);

{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE,{waitUntil:'networkidle'});
  const defaultMr=await page.evaluate(()=>window.__boomVideoQA.mix());
  const autoBalance=await page.evaluate(async()=>{
    const A=window.OfflineAudioContext||window.webkitOfflineAudioContext;
    const render=async(kind)=>{const ac=new A(1,44100*3,44100);mrBuffer=null;mrVolume=.85;if(kind==='melody')scheduleMelodyTone(ac,ac.destination,'도',.05,'boom');else if(kind==='mr')scheduleBuiltinMr(ac,ac.destination,.05,0,.85);else{scheduleMelodyTone(ac,ac.destination,'도',.05,'boom');scheduleBuiltinMr(ac,ac.destination,.05,0,.85)}const b=await ac.startRendering(),d=b.getChannelData(0);let energy=0,peak=0;for(const v of d){const a=Math.abs(v);energy+=a;peak=Math.max(peak,a)}return{energy,peak}};
    return{melody:await render('melody'),mr:await render('mr'),both:await render('both')};
  });
  check(autoBalance.mr.energy>autoBalance.melody.energy*.45,'mr: automatic MR is still too quiet versus melody '+JSON.stringify(autoBalance));
  check(autoBalance.mr.peak>.08,'mr: automatic MR peak is too low '+JSON.stringify(autoBalance));
  check(autoBalance.both.peak<.98,'mr: combined output clips '+JSON.stringify(autoBalance));
  report.push({name:'autoMrBalance',autoBalance});
  check(defaultMr.mrReady===true&&defaultMr.mrKind==='auto'&&!defaultMr.mrLoaded,'mr: built-in automatic MR is not ready by default');
  check((await page.locator('#mrStatus').innerText()).includes('기본 자동 MR'),'mr: built-in MR status is not visible');
  await page.locator('#mixModes button[data-mix="both"]').click();
  await page.locator('#startBtn').click();
  await page.waitForTimeout(120);
  check(await page.evaluate(()=>!!mrSource),'mr: built-in automatic MR did not schedule');
  await page.locator('#playBtn').click();
  check(await page.evaluate(()=>mrSource===null),'mr: pausing did not stop built-in automatic MR');
  await page.locator('#mrFile').setInputFiles({name:'qa-mr.wav',mimeType:'audio/wav',buffer:makeWav(1.1,176)});
  await page.waitForFunction(()=>window.__boomVideoQA?.mix().mrLoaded===true);
  const loaded=await page.evaluate(()=>window.__boomVideoQA.mix());
  check(loaded.mrLoaded===true&&loaded.mrKind==='file'&&loaded.mrName==='qa-mr.wav','mr: file did not decode or did not replace automatic MR');
  check((await page.locator('#mrStatus').innerText()).includes('MR 준비됨'),'mr: ready status missing');
  await page.locator('#mixModes button[data-mix="both"]').click();
  check((await page.evaluate(()=>window.__boomVideoQA.mix().mode))==='both','mr: melody+MR mode failed');
  await page.locator('#mrVolume').evaluate(el=>{el.value='40';el.dispatchEvent(new Event('input',{bubbles:true}))});
  check(Math.abs((await page.evaluate(()=>window.__boomVideoQA.mix().mrVolume))-.4)<.01,'mr: volume control failed');
  await page.locator('#startBtn').click();
  await page.waitForTimeout(120);
  check(await page.evaluate(()=>!!mrSource),'mr: live MR source was not scheduled');
  await page.locator('#playBtn').click();
  check(await page.evaluate(()=>mrSource===null),'mr: pause did not stop MR source');
  const mixProbe=await page.evaluate(async()=>{
    const A=window.OfflineAudioContext||window.webkitOfflineAudioContext;
    const render=async(mode)=>{const ac=new A(1,44100*2,44100);mixMode=mode;melodyMode='boom';if(wantsMelody())scheduleMelodyTone(ac,ac.destination,'도',.05,melodyMode);if(wantsMr())scheduleMrTrack(ac,ac.destination,.05,0,.4);const b=await ac.startRendering(),d=b.getChannelData(0);let energy=0,peak=0;for(const v of d){const a=Math.abs(v);energy+=a;peak=Math.max(peak,a)}return{energy,peak}};
    return{melody:await render('melody'),both:await render('both'),mr:await render('mr')};
  });
  check(mixProbe.melody.energy>10&&mixProbe.mr.energy>10&&mixProbe.both.energy>10,'mr: one or more audio mix modes are silent');
  check(new Set([Math.round(mixProbe.melody.energy),Math.round(mixProbe.both.energy),Math.round(mixProbe.mr.energy)]).size===3,'mr: mix modes are not measurably distinct');
  await page.locator('#mixModes button[data-mix="mr"]').click();
  check((await page.evaluate(()=>window.__boomVideoQA.mix().mode))==='mr','mr: MR-only mode failed');
  await page.locator('#mixModes button[data-mix="melody"]').click();
  check((await page.evaluate(()=>window.__boomVideoQA.mix().mode))==='melody','mr: melody-only mode failed');
  check(errors.length===0,'mr: page errors '+errors.join(' | '));
  report.push({name:'mrMix',loaded,mixProbe});
  await page.screenshot({path:out+'/mr-mix390.png',fullPage:true});
  await context.close();
}

{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  await page.goto(BASE,{waitUntil:'networkidle'});
  const transfer={title:'QA 전달곡',timeN:3,timeD:4,bpm:72,measures:[[{note:'도',dur:1,lyric:'가'},{note:'미',dur:1,lyric:'나'},{note:'솔',dur:1,lyric:'다'}]]};
  await page.evaluate(x=>localStorage.setItem('ulmoaBoomTransfer',JSON.stringify(x)),transfer);
  await page.reload({waitUntil:'networkidle'});
  check((await page.locator('#songTitle').innerText())==='QA 전달곡','transfer: song title not loaded from localStorage');
  check((await page.locator('#songMeta').innerText()).includes('3/4'),'transfer: meter not loaded');
  check(await page.locator('.beat').count()===3,'transfer: note count mismatch');
  check(await page.evaluate(()=>localStorage.getItem('ulmoaBoomTransfer'))===null,'transfer: one-time payload was not consumed');
  await page.screenshot({path:`${out}/transfer390.png`,fullPage:true});
  await context.close();
}

{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(HEART+'?song=bear',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1000);
  check(await page.locator('#boomwhackerBtn').count()===1,'heart integration: Boomwhacker button missing');
  check((await page.locator('meta[name=robots]').getAttribute('content'))==='noindex,nofollow','heart integration: robots guardrail changed');
  check((await page.locator('#titleInput').inputValue())==='곰 세 마리','heart integration: bear sample did not load before transfer');
  await page.locator('#boomwhackerBtn').click();
  await page.waitForURL('**/boomwhacker/');
  await page.waitForTimeout(300);
  check((await page.locator('#songTitle').innerText())==='곰 세 마리','heart integration: transferred song title mismatch');
  check((await page.locator('#songMeta').innerText()).includes('4/4'),'heart integration: transferred meter mismatch');
  check(await page.locator('.beat').count()>20,'heart integration: transferred notes missing');
  check(errors.length===0,'heart integration: page errors '+errors.join(' | '));
  await page.screenshot({path:`${out}/heart-to-boom390.png`,fullPage:true});
  await context.close();
}

{
  const context=await browser.newContext({viewport:{width:1366,height:900}});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE,{waitUntil:'networkidle'});
  await page.evaluate(()=>{const c=videoCanvas();c.id='qaExportFrame';c.style.width='640px';c.style.height='360px';document.body.appendChild(c);videoScene(c.getContext('2d'),2200)});
  await page.locator('#qaExportFrame').screenshot({path:out+'/video-export-frame.png'});
  const melodyProbe=await page.evaluate(async()=>{
    const A=window.OfflineAudioContext||window.webkitOfflineAudioContext;
    const render=async(mode)=>{const ac=new A(1,22050,22050);scheduleMelodyTone(ac,ac.destination,'도',.02,mode);const b=await ac.startRendering(),d=b.getChannelData(0);let energy=0,peak=0;for(const v of d){const a=Math.abs(v);energy+=a;peak=Math.max(peak,a)}return {energy,peak}};
    return {none:await render('none'),piano:await render('piano'),xylophone:await render('xylophone'),boom:await render('boom')};
  });
  check(melodyProbe.none.energy===0,'melody probe: none should be silent');
  check(melodyProbe.piano.energy>10&&melodyProbe.xylophone.energy>10&&melodyProbe.boom.energy>10,'melody probe: one or more melody voices are silent');
  check(new Set([Math.round(melodyProbe.piano.energy),Math.round(melodyProbe.xylophone.energy),Math.round(melodyProbe.boom.energy)]).size===3,'melody probe: timbres are not measurably distinct');
  report.push({name:'melodyProbe',melodyProbe});
  const probe=await page.evaluate(async()=>{
    const c=document.createElement('canvas');c.width=640;c.height=360;c.id='qaVideoCanvas';c.style.width='640px';c.style.height='360px';document.body.appendChild(c);
    const x=c.getContext('2d');x.fillStyle='#f7fbff';x.fillRect(0,0,c.width,c.height);x.fillStyle='#17233b';x.font='700 34px sans-serif';x.fillText('울모아쌤 붐웨커 영상 QA',40,100);
    const stream=c.captureStream(10),mime=window.__boomVideoQA.mime(),chunks=[],rec=new MediaRecorder(stream,{mimeType:mime});
    rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
    const done=new Promise((resolve,reject)=>{rec.onstop=resolve;rec.onerror=e=>reject(e.error||new Error('recorder error'))});
    rec.start(100);
    for(let i=0;i<24;i++){x.fillStyle=i%2?'#38a7e8':'#ef4444';x.clearRect(0,140,c.width,180);x.fillRect(30+(i%10)*50,180,45,80);await new Promise(r=>setTimeout(r,55))}
    if(rec.state==='recording')rec.requestData();await new Promise(r=>setTimeout(r,180));rec.stop();await done;stream.getTracks().forEach(t=>t.stop());
    return {size:new Blob(chunks,{type:mime}).size,mime,brand:window.__boomVideoQA.brand()};
  });
  check(probe.size>1000,'video probe: MediaRecorder produced no usable bytes');
  check(String(probe.mime).startsWith('video/webm'),'video probe: unexpected mime '+probe.mime);
  check(probe.brand?.copy?.includes('영상·편집 © 울모아쌤'),'video probe: copyright mark missing');
  await page.locator('#qaVideoCanvas').screenshot({path:out+'/video-frame-probe.png'});
  check(errors.length===0,'video probe: page errors '+errors.join(' | '));
  report.push({name:'videoProbe',bytes:probe.size,mime:probe.mime});
  await context.close();
}
await browser.close();
fs.writeFileSync(`${out}/report.json`,JSON.stringify({failures,report},null,2));
console.log(JSON.stringify({failures,report},null,2));
if(failures.length) process.exit(1);

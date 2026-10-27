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
  // A new song should open with a clear, completely empty falling-note area.
  check(await page.locator('.fall').count()===0,`${name}: a note appeared before pressing play`);
  const fallConfig=await page.evaluate(()=>window.__boomVideoQA.fall());
  check(fallConfig.leadMs===3100&&fallConfig.travelMs===3100&&fallConfig.spawnDelayMs===0,
    `${name}: the first note still enters too quickly ${JSON.stringify(fallConfig)}`);
  await page.evaluate(()=>{elapsed=firstNoteMs()-FALL_TRAVEL_MS+950;draw()});
  const fallSize=await page.locator('.fall').first().evaluate(el=>parseFloat(getComputedStyle(el).width));
  check(fallSize>=(width<=800?56:76),`${name}: falling note is still too small (${fallSize}px)`);
  await page.evaluate(()=>{elapsed=0;draw()});
  check(await page.locator('.fall').count()===0,`${name}: notes must be invisible again after reset`);
  check(await page.locator('#scoreRows .beat').count()>0,`${name}: sidebar score did not render`);
  check(await page.locator('#scoreStageGrid .beat').count()===await page.locator('#scoreRows .beat').count(),`${name}: animated score and sidebar have different note counts`);
  check(await page.locator('#playViewSelect option').count()===2,`${name}: exactly two playing views required`);
  check(await page.locator('#scorePngBtn').count()===1&&await page.locator('#scorePdfBtn').count()===1,`${name}: PNG or PDF score export missing`);
  check((await page.locator('#playViewSelect').inputValue())==='fall',`${name}: initial playing view should remain the familiar falling-notes mode`);
  check(await page.locator('#lyricTrack').count()===1,`${name}: lyric track missing`);
  const words=await page.evaluate(()=>{
    const source=lyricWordBreakIndices(),track=document.querySelector('#lyricTrack');
    return {label:track.getAttribute('aria-label'),gaps:track.querySelectorAll('.lyricWordSpace').length,
      breaks:[...source],sample:currentSong.key};
  });
  check(words.sample==='twinkle'&&words.label.includes('반짝반짝 작은 별')&&
    words.gaps>=2, `${name}: little star lyrics still run together ${JSON.stringify(words)}`);
  check(await page.locator('.lyricSyllable').count()>5,`${name}: lyric track did not render a continuous line`);
  if(width<=800)check(await page.locator('.lyricSyllable').count()<=9,`${name}: mobile lyric line is overcrowded`);
  const tubeLabelColors=await page.locator('.tube').evaluateAll(xs=>xs.map(x=>({note:x.dataset.note,color:getComputedStyle(x.querySelector('.tubeLabel')).color})));
  const tubeColorMap=Object.fromEntries(tubeLabelColors.map(x=>[x.note,x.color]));
  check(tubeColorMap['도']==='rgb(235, 36, 39)'&&tubeColorMap['레']==='rgb(246, 133, 31)'&&tubeColorMap['미']==='rgb(251, 237, 27)'&&tubeColorMap['파']==='rgb(115, 200, 74)'&&tubeColorMap['솔']==='rgb(0, 163, 154)'&&tubeColorMap['라']==='rgb(75, 74, 168)'&&tubeColorMap['시']==='rgb(216, 58, 155)',`${name}: pitch-colored note labels are wrong: ${JSON.stringify(tubeColorMap)}`);
  check(await page.evaluate(()=>document.querySelectorAll('#sampleSelect option').length===SAMPLES.length+1),`${name}: song list must contain every sample + custom option`);
  check(await page.locator('#videoBtn').count()===1,`${name}: video export button missing`);
  check(await page.locator('#stageFsBtn').count()===1,`${name}: stage fullscreen shortcut missing`);
  check(await page.locator('#stageFsBtn').isVisible(),`${name}: stage fullscreen shortcut is not visible`);
  check(await page.locator('#stageFsBtn svg path').count()===1,`${name}: fullscreen icon SVG is missing`);
  check(await page.locator('#displayModeSelect').count()===1,`${name}: display mode selector missing`);
  check(await page.locator('#displayModeSelect option').count()===4,`${name}: display mode selector should have 4 choices`);
  check((await page.locator('#displayModeSelect').inputValue())==='note',`${name}: display mode should default to note names`);
  check(await page.locator('#introMode').count()===1,`${name}: intro mode setting missing`);
  check(await page.locator('#introMode').inputValue()==='interlude',`${name}: audible song melody intro must default on`);
  check(await page.locator('#introOverlay').count()===1,`${name}: readiness overlay missing`);
  const initialTempo=await page.evaluate(()=>window.__boomVideoQA.tempo());
  check(initialTempo.bpm===Math.round(initialTempo.sourceBpm*.72),`${name}: default playback tempo should be gentle ${JSON.stringify(initialTempo)}`);
  check(initialTempo.bpm<=75&&initialTempo.min===35&&initialTempo.max===140,`${name}: playback speed default/range is too fast ${JSON.stringify(initialTempo)}`);
  check((await page.locator('#bpmLabel').innerText())===initialTempo.bpm+' BPM',`${name}: tempo slider label out of sync with actual beat`);
  check((await page.locator('#tempo').inputValue())===String(initialTempo.bpm),`${name}: speed slider is not at effective playback BPM`);
  check((await page.locator('#introMode option[value="music"]').innerText()).includes('박자'),`${name}: beat label missing`);
  // Preserve the established beat-only visual/score regressions independently
  // from the new default 3-2-1 + complete musical phrase test.
  await page.locator('#introMode').evaluate(el=>{el.value='music';el.dispatchEvent(new Event('change',{bubbles:true}))});
  check(await page.locator('#melodySelect').count()===1,`${name}: melody selector missing`);
  check(await page.locator('#melodySelect option').count()===4,`${name}: melody selector should have 4 choices`);
  check((await page.locator('#melodySelect').inputValue())==='piano',`${name}: default melody should be acoustic piano`);
  check(await page.locator('#melodyVolume').count()===1,`${name}: melody volume control missing`);
  check((await page.locator('#melodyVolume').inputValue())==='70',`${name}: default melody volume should be 70%`);
  check(await page.locator('#mixModes button').count()===3,`${name}: mix mode should have 3 choices`);
  check(await page.locator('#mixModes button.on').getAttribute('data-mix')==='both',`${name}: auto-MR should play on the song downbeat by default`);
  check(await page.locator('#mrFile').count()===1,`${name}: MR file input missing`);
  check(await page.locator('#mrVolume').count()===1,`${name}: MR volume control missing`);
  check((await page.locator('#mrVolume').inputValue())==='70',`${name}: default MR volume should be 70%`);
  check((await page.locator('#melodyPct').innerText())==='70%',`${name}: melody volume label should start at 70%`);
  check((await page.locator('#mrPct').innerText())==='70%',`${name}: MR volume label should start at 70%`);
  check(await page.locator('#watermarkOpt').isChecked(),`${name}: watermark should default on`);
  check(await page.locator('#creditOpt').isChecked(),`${name}: intro/outro should default on`);
  const videoInfo=await page.evaluate(()=>({supported:window.__boomVideoQA?.supported(),mime:window.__boomVideoQA?.mime(),brand:window.__boomVideoQA?.brand(),colors:window.__boomVideoQA?.colors(),melody:window.__boomVideoQA?.melody(),mix:window.__boomVideoQA?.mix(),display:window.__boomVideoQA?.display(),lyrics:window.__boomVideoQA?.lyrics(),preview:window.__boomVideoQA?.preview()}));
  check(videoInfo.supported===true,`${name}: browser video export capability missing`);
  check(String(videoInfo.mime||'').startsWith('video/webm'),`${name}: WebM recorder mime missing`);
  check(videoInfo.brand?.brand==='울모아쌤'&&videoInfo.brand?.handle==='@ulmoa__sam',`${name}: video brand metadata wrong`);
  check(videoInfo.colors?.도==='#EB2427'&&videoInfo.colors?.레==='#F6851F'&&videoInfo.colors?.미==='#FBED1B'&&videoInfo.colors?.파==='#73C84A'&&videoInfo.colors?.솔==='#00A39A'&&videoInfo.colors?.라==='#4B4AA8'&&videoInfo.colors?.시==='#D83A9B',`${name}: Boomwhacker color mapping wrong`);
  check(videoInfo.melody?.mode==='piano'&&Object.keys(videoInfo.melody?.options||{}).length===4&&Math.abs(videoInfo.melody?.volume-.70)<.001,`${name}: melody QA metadata wrong`);
  check(videoInfo.mix?.mode==='both'&&Object.keys(videoInfo.mix?.options||{}).length===3&&videoInfo.mix?.mrReady===true&&videoInfo.mix?.mrKind==='auto'&&!videoInfo.mix?.mrLoaded,`${name}: mix QA metadata wrong`);
  check(videoInfo.display?.mode==='note'&&Object.keys(videoInfo.display?.options||{}).length===4&&videoInfo.display?.labels?.[0]==='도',`${name}: display QA metadata wrong`);
  check((videoInfo.lyrics?.items?.length||0)>5,`${name}: continuous lyric window missing`);
  check(videoInfo.preview?.w===1280&&videoInfo.preview?.h===720&&String(videoInfo.preview?.data||'').startsWith('data:image/png'),`${name}: 16:9 video preview render failed`);
  let overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth));
  check(overflow<=1,`${name}: horizontal overflow ${overflow}px`);
  if(width<=412){
    const mobileFold=await page.evaluate(()=>({
      stageTop:document.querySelector('.stagePanel')?.getBoundingClientRect().top,
      controlsHeight:document.querySelector('.controls')?.getBoundingClientRect().height,
      headerHeight:document.querySelector('.top')?.getBoundingClientRect().height
    }));
    check(mobileFold.stageTop<780,`${name}: mobile settings still require too much scrolling before play area ${JSON.stringify(mobileFold)}`);
    check(mobileFold.controlsHeight<690,`${name}: mobile controls are still too tall ${JSON.stringify(mobileFold)}`);
  }
  if(width>=1180){
    const oneScreen=await page.evaluate(()=>({
      viewport:innerHeight,
      scrollHeight:document.documentElement.scrollHeight,
      bodyScrollHeight:document.body.scrollHeight,
      controls:document.querySelector('.controls')?.getBoundingClientRect(),
      stage:document.querySelector('.stagePanel')?.getBoundingClientRect(),
      score:document.querySelector('.score')?.getBoundingClientRect(),
      video:document.querySelector('#videoBtn')?.getBoundingClientRect(),
      start:document.querySelector('#startBtn')?.getBoundingClientRect()
    }));
    check(oneScreen.scrollHeight<=oneScreen.viewport+1&&oneScreen.bodyScrollHeight<=oneScreen.viewport+1,`${name}: desktop page still needs vertical scrolling ${JSON.stringify(oneScreen)}`);
    for(const [key,r] of Object.entries({controls:oneScreen.controls,stage:oneScreen.stage,score:oneScreen.score,video:oneScreen.video,start:oneScreen.start})){
      check(!!r&&r.top>=0&&r.bottom<=oneScreen.viewport+1,`${name}: ${key} is outside one-screen viewport ${JSON.stringify(r)}`);
    }
  }
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

  if(width<=800){
    const mobile=await page.evaluate(()=>({
      top:document.querySelector('.stagePanel').getBoundingClientRect().top,
      bottom:document.querySelector('.playbar').getBoundingClientRect().bottom,
      vh:innerHeight,scrollHeight:document.documentElement.scrollHeight
    }));
    check(mobile.top<180,`${name}: the play area must start near top on mobile ${JSON.stringify(mobile)}`);
    check(mobile.bottom<=mobile.vh+1,`${name}: playback controls below mobile viewport ${JSON.stringify(mobile)}`);
    check(mobile.scrollHeight<=mobile.vh+2,`${name}: mobile should not require page scrolling ${JSON.stringify(mobile)}`);
    check(await page.locator('#mobileSongSelect').isVisible(),`${name}: quick song selector missing`);
    await page.locator('#mobileSongSelect').selectOption('bear');
    check((await page.locator('#stageTitle').innerText())==='곰 세 마리',`${name}: quick song selector did not load bear`);
    check((await page.locator('#sampleSelect').inputValue())==='bear',`${name}: quick song and settings song out of sync`);
    await page.locator('#mobileSongSelect').selectOption('twinkle');
    await page.locator('#mobileScoreBtn').click();
    check(await page.locator('#mobileScoreSheet').isVisible(),`${name}: score sheet did not open`);
    check(await page.locator('.score .beat').count()>0,`${name}: score sheet is empty`);
    await page.locator('#mobileScoreClose').click();
    check(!(await page.locator('#mobileScoreSheet').isVisible()),`${name}: score sheet did not close`);
    await page.locator('#mobileSettingsBtn').click();
    check(await page.locator('#mobileSettingsSheet').isVisible(),`${name}: settings sheet did not open`);
  }
  await page.locator('#levels button[data-level="3"]').click();
  check(await page.locator('.tube:not(.inactive)').count()===3,`${name}: 3-note mode active tube count wrong`);
  await page.locator('#levels button[data-level="5"]').click();
  check(await page.locator('.tube:not(.inactive)').count()===5,`${name}: 5-note mode active tube count wrong`);
  await page.locator('#levels button[data-level="8"]').click();
  check(await page.locator('.tube:not(.inactive)').count()===8,`${name}: 8-note mode active tube count wrong`);

  // Users choose a subset; the full original notes, downbeat and MR stay unchanged.
  const fullSong=await page.evaluate(()=>({
    original:events.map(e=>[e.note,e.start,e.dur]),chords:playbackMeasures.map((_,i)=>chordForMeasure(i).name),first:firstNoteMs()
  }));
  await page.locator('#levels button[data-level="custom"]').click();
  check(await page.locator('#customNoteDialog').isVisible(),name+': custom picker did not open');
  check(await page.locator('#customNoteChoices button').count()===8,name+': picker does not show all eight pitches');
  check((await page.locator('#customNoteChoices button[data-note="높은도"] small').innerText()).includes('공'),name+': note choices must preview the number of falling balls');
  for(const note of ['도','미','레'])await page.locator('#customNoteChoices button[data-note="'+note+'"]').click();
  check((await page.locator('#customNoteStatus').innerText()).includes('2개'),name+': picker note count wrong');
  await page.locator('#customNoteApply').click();
  const custom=await page.evaluate(()=>({
    ...window.__boomVideoQA.noteSelection(),chords:playbackMeasures.map((_,i)=>chordForMeasure(i).name),
    first:firstNoteMs(),local:JSON.parse(localStorage.getItem('ulmoaBoomCustomNotes')||'null'),
    label:document.querySelector('#rangeNote')?.textContent,fileName:scoreFileName('pdf')
  }));
  check(custom.level==='custom'&&custom.selected.join(',')==='레,솔',name+': wrong custom selected notes '+JSON.stringify(custom));
  check((await page.locator('.tube:not(.inactive)').count())===2,name+': custom mode active tubes not exactly two');
  check(custom.activeBalls===await page.evaluate(()=>events.filter(e=>e.note==='레'||e.note==='솔').length),name+': custom ball count wrong');
  check(JSON.stringify(custom.original)===JSON.stringify(fullSong.original),name+': custom selection altered melody or note timing');
  check(JSON.stringify(custom.chords)===JSON.stringify(fullSong.chords)&&custom.first===fullSong.first,
    name+': custom selection altered MR harmony or first beat');
  check(custom.local?.join(',')==='레,솔',name+': custom choice not saved');
  check(custom.label.includes('원곡 전체 그대로')&&custom.fileName.includes('직접선택-레-솔'),
    name+': custom-note explanation or PDF filename missing');
  await page.locator('#levels button[data-level="custom"]').click();
  check(await page.locator('#customNoteChoices button[data-note="솔"]').getAttribute('aria-pressed')==='true',
    name+': reopening custom picker lost saved choice');
  await page.locator('#customNoteChoices button[data-note="솔"]').click();
  await page.locator('#customNoteChoices button[data-note="레"]').click();
  check((await page.locator('#customNoteStatus').innerText()).includes('최소 1개'),
    name+': custom picker should prevent zero selected notes');
  await page.locator('#customNoteCancel').click();
  check((await page.evaluate(()=>window.__boomVideoQA.noteSelection().selected.join(',')))==='레,솔',
    name+': cancelling a new edit changed saved custom notes');
  await page.locator('#levels button[data-level="8"]').click();
  check(await page.locator('.tube:not(.inactive)').count()===8,name+': 8-note preset failed after custom');
  check((await page.evaluate(()=>window.__boomVideoQA.noteSelection().saved.join(',')))==='레,솔',
    name+': switching to a preset deleted custom selection');


  await page.locator('#sampleSelect').selectOption('moa-signal');
  check((await page.locator('#songTitle').innerText())==='모아의 출발 신호',`${name}: revised start cue title not applied`);
  check(await page.evaluate(()=>currentSong.measures[1].map(x=>x.lyric).join('')==='출발!'),`${name}: start cue lyric and melody syllables don't agree`);
  await page.locator('#sampleSelect').selectOption('bear');
  check((await page.locator('#songTitle').innerText())==='곰 세 마리',`${name}: bear sample did not load`);
  check(await page.locator('.beat').count()>20,`${name}: bear sample score is unexpectedly short`);
  await page.locator('#sampleSelect').selectOption('butterfly-d');
  check((await page.locator('#songTitle').innerText()).includes('D장조'),`${name}: transposed sample did not load`);
  check(await page.locator('.beat.unsupported').count()>0,`${name}: chromatic notes were not marked out of base range`);
  check((await page.locator('#rangeNote').innerText()).includes('나머지')&&(await page.locator('#rangeNote').innerText()).includes('멜로디와 MR'),`${name}: 8-note visual limits should not imply muted original audio`);
  await page.locator('#sampleSelect').selectOption('twinkle');

  await page.locator('#tempo').evaluate((el)=>{el.value='80';el.dispatchEvent(new Event('input',{bubbles:true}))});
  check((await page.locator('#bpmLabel').innerText()).includes('80 BPM'),`${name}: BPM control failed`);
  check(await page.evaluate(()=>currentSong.bpm===92),`${name}: adjusting practice speed must not overwrite source song tempo`);
  await page.locator('#sampleSelect').selectOption('bear');
  const bearTempo=await page.evaluate(()=>window.__boomVideoQA.tempo());
  check(bearTempo.bpm===75,`${name}: changing song should apply a calm default without resetting to fast source tempo ${JSON.stringify(bearTempo)}`);
  await page.locator('#sampleSelect').selectOption('twinkle');
  check(await page.evaluate(()=>window.__boomVideoQA.tempo().bpm===80),`${name}: manual song tempo must be restored after switching songs`);
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
  await page.locator('#melodyVolume').evaluate(el=>{el.value='30';el.dispatchEvent(new Event('input',{bubbles:true}))});
  check(Math.abs((await page.evaluate(()=>window.__boomVideoQA.melody().volume))-.3)<.001,`${name}: melody volume slider failed`);
  await page.locator('#melodyVolume').evaluate(el=>{el.value='70';el.dispatchEvent(new Event('input',{bubbles:true}))});
  if(width<=800)await page.locator('#mobileSettingsClose').click();

  await page.locator('#displayModeSelect').selectOption('instrument');
  check(await page.locator('#displayModal').isVisible(),`${name}: instrument editor did not auto-open`);
  check(await page.locator('#instrumentAddToggle').isVisible(),`${name}: custom instrument toggle missing`);
  check(!(await page.locator('#instrumentAddBox').evaluate(el=>el.classList.contains('open'))),`${name}: custom instrument form should start collapsed`);
  await page.locator('#instrumentAddToggle').click();
  check(await page.locator('#instrumentAddBox').evaluate(el=>el.classList.contains('open')),`${name}: custom instrument form did not open`);
  check(await page.locator('#displayModal').isVisible(),`${name}: instrument editor did not open`);
  check(await page.locator('#displayInputs select[data-instrument-index]').count()===8,`${name}: instrument editor should have 8 lane selectors`);
  check(await page.locator('#addInstrumentBtn').count()===1,`${name}: add-instrument button missing`);
  await page.locator('#newInstrumentIcon').fill('🛎️');
  await page.locator('#newInstrumentName').fill('차임');
  await page.locator('#addInstrumentBtn').click();
  const addedInstrument=await page.evaluate(()=>window.__boomVideoQA.display().instrumentLibrary.find(x=>x.name==='차임'));
  if(!addedInstrument?.id){
    const diag=await page.evaluate(()=>({
      icon:document.querySelector('#newInstrumentIcon')?.value,
      name:document.querySelector('#newInstrumentName')?.value,
      note:document.querySelector('#displayDialogDesc')?.textContent,
      mode:displayMode,library:instrumentLibrary.map(x=>({id:x.id,icon:x.icon,name:x.name})),
      editorOpen:document.querySelector('#displayModal')?.classList.contains('open'),
      addedButton:!!document.querySelector('#addInstrumentBtn')
    }));
    throw new Error(`${name}: custom instrument was not added to library ${JSON.stringify(diag)}`);
  }
  check(await page.locator('#displayInputs select[data-instrument-index="0"] option[value="'+addedInstrument.id+'"]').count()===1,`${name}: custom instrument option was not rebuilt`);
  await page.locator('#displayInputs select[data-instrument-index="0"]').selectOption(addedInstrument.id);
  await page.locator('#displayApplyBtn').click();
  check((await page.locator('.laneLabel').first().innerText())==='🛎️',`${name}: selected custom instrument did not update lane`);
  check((await page.locator('.tube[data-note="도"] .tubeLabel').innerText())==='🛎️',`${name}: selected custom instrument did not update tube`);
  await page.evaluate(()=>{elapsed=firstNoteMs()-FALL_TRAVEL_MS+950;draw()});
  check((await page.locator('.fall .fallLabel').first().innerText())==='🛎️',`${name}: selected custom instrument did not update falling note`);
  const instrumentState=await page.evaluate(()=>window.__boomVideoQA.display());
  check(instrumentState.mode==='instrument'&&instrumentState.labels[0]==='🛎️'&&instrumentState.instrumentLibrary.some(x=>x.name==='차임'),`${name}: instrument state not propagated to video data`);
  await page.locator('#displayModeSelect').selectOption('name');
  check(await page.locator('#displayModal').isVisible(),`${name}: name editor did not open`);
  await page.locator('#displayInputs input[data-display-index="0"]').fill('민준');
  await page.locator('#displayInputs input[data-display-index="1"]').fill('서연');
  await page.locator('#displayApplyBtn').click();
  check((await page.locator('.laneLabel').first().innerText())==='민준',`${name}: child name did not update lane`);
  check((await page.locator('.tube[data-note="도"] .tubeLabel').innerText())==='민준',`${name}: child name did not update tube`);
  await page.evaluate(()=>{elapsed=firstNoteMs()-FALL_TRAVEL_MS+950;draw()});
  check((await page.locator('.fall .fallLabel').first().innerText())==='민준',`${name}: child name did not update falling note`);
  const displayState=await page.evaluate(()=>window.__boomVideoQA.display());
  check(displayState.mode==='name'&&displayState.labels[0]==='민준'&&displayState.labels[1]==='서연',`${name}: display state not propagated to video data`);
  await page.locator('#displayModeSelect').selectOption('custom');
  await page.locator('#displayInputs input[data-display-index="0"]').fill('손뼉');
  await page.locator('#displayApplyBtn').click();
  check((await page.locator('.tube[data-note="도"] .tubeLabel').innerText())==='손뼉',`${name}: custom display did not update tube`);
  await page.locator('#displayModeSelect').selectOption('note');
  check((await page.locator('.tube[data-note="도"] .tubeLabel').innerText())==='도',`${name}: note-name display did not restore`);

  await page.evaluate(()=>{elapsed=firstNoteMs()+100;draw();updateTime();updateLyricTrack(true)});
  check(await page.locator('.lyricSyllable.active').count()===1,`${name}: current lyric syllable is not highlighted`);
  if(width<=800){
    const noteEdge=await page.evaluate(()=>{const e=document.querySelector('.fall'),st=document.querySelector('#stage');return e&&st?{note:e.getBoundingClientRect().toJSON(),stage:st.getBoundingClientRect().toJSON()}:null});
    check(noteEdge.note.left>=noteEdge.stage.left-1&&noteEdge.note.right<=noteEdge.stage.right+1,`${name}: falling note clipped at stage edge ${JSON.stringify(noteEdge)}`);
  }
  const activeBorder=await page.locator('.lyricSyllable.active').evaluate(el=>getComputedStyle(el).borderTopColor);
  check(activeBorder==='rgb(235, 36, 39)',`${name}: current lyric syllable does not use its Boomwhacker color (${activeBorder})`);
  await page.locator('#resetBtn').click();
  // Animated score mode is a second rendering of the very same event timeline.
  await page.locator('#playViewSelect').selectOption('score');
  const scoreView=await page.evaluate(()=>window.__boomVideoQA.view());
  check(scoreView.mode==='score'&&scoreView.scoreTiles===scoreView.sideTiles&&scoreView.scoreTiles>10,
    `${name}: score view does not render the same notes as the side score ${JSON.stringify(scoreView)}`);
  check(await page.locator('#scoreStage').isVisible(),`${name}: animated score stage is hidden`);
  const cardGeom=await page.evaluate(()=>{
    const grid=document.querySelector('#scoreStageGrid'),card=grid.querySelector('.beat'),
      note=card.querySelector('.note'),lyric=card.querySelector('.lyric'),
      box=x=>x.getBoundingClientRect();
    return {cardH:box(card).height,noteH:box(note).height,lyricH:box(lyric).height,
      cardBottom:box(card).bottom,lyricBottom:box(lyric).bottom,gridH:grid.clientHeight,scrollH:grid.scrollHeight,
      lyricText:lyric.textContent};
  });
  check(cardGeom.cardH>=cardGeom.noteH+cardGeom.lyricH-3&&cardGeom.lyricBottom<=cardGeom.cardBottom+1,
    `${name}: animated score cards clip their note or lyric ${JSON.stringify(cardGeom)}`);
  if(width<=800)check(cardGeom.scrollH>cardGeom.gridH&&cardGeom.lyricText==='반',
    `${name}: mobile score should scroll and show readable lyrics ${JSON.stringify(cardGeom)}`);
  const highlighted=await page.evaluate(()=>{elapsed=events[5].start+55;draw();return {on:[...document.querySelectorAll('#scoreStageGrid .scoreActive')].map(e=>Number(e.dataset.eventIndex)),
    side:[...document.querySelectorAll('#scoreRows .scoreActive')].map(e=>[...e.parentElement.children].indexOf(e)),
    next:[...document.querySelectorAll('#scoreStageGrid .scoreNext')].map(e=>Number(e.dataset.eventIndex))}});
  check(JSON.stringify(highlighted.on)==='[5]'&&JSON.stringify(highlighted.side)==='[5]'&&JSON.stringify(highlighted.next)==='[6]',
    `${name}: active score and next beat do not follow playback ${JSON.stringify(highlighted)}`);
  if(name==='mobile390'||name==='desktop1366')await page.screenshot({path:`${out}/${name}-score-mode.png`,fullPage:false});
  await page.locator('#playViewSelect').selectOption('fall');
  check(!(await page.locator('#scoreStage').isVisible()),`${name}: falling mode must hide expanded score`);
  await page.locator('#resetBtn').click();
  // Three guide choices share one musical timebase and show balls during sound.
  check(await page.locator('#introMode option[value="voice"]').count()===0,name+': removed spoken guide returned');
  check(await page.locator('#introMode option[value="music"]').count()===1,name+': beat guide missing');
  check(await page.locator('#introMode option[value="interlude"]').count()===1,name+': musical intro missing');
  for(const selected of ['interlude','music']){
    await page.locator('#introMode').evaluate((el,mode)=>{el.value=mode;el.dispatchEvent(new Event('change',{bubbles:true}))},selected);
    await page.locator(width<=800?'#playBtn':'#startBtn').click();
    const started=await page.evaluate(()=>({
      ...window.__boomVideoQA.intro(),mode:introMode,expected:instrumentalPreludePlan().beats,
      firstBallOffset:instrumentalPreludePlan().firstBallOffsetMs,firstNoteMs:firstNoteMs(),firstBeat:document.querySelector('#introPulse').innerText
    }));
    check(started.active&&started.mode===selected&&started.countBeats===0&&started.previewBeats===started.expected
       &&started.beats===started.expected&&started.durationMs>=6500&&started.firstBallOffset>=0,
       name+': '+selected+' guide not beat-aligned '+JSON.stringify(started));
    check(await page.locator('#introOverlay').evaluate(el=>el.classList.contains('preludePlaying')),
       name+': '+selected+' hides descending balls');
    if(selected==='music')check(started.firstBeat==='쿵',name+': no strong first beat');
    const descending=await page.evaluate(()=>{
      const p=instrumentalPreludePlan(),offset=p.firstBallOffsetMs+Math.min(740,firstNoteMs()/2);
      const origin=introAudioStartAt;introAudioStartAt=audioCtx.currentTime-offset/1000;
      introFrame(performance.now());
      const count=document.querySelectorAll('.fall').length;
      introAudioStartAt=origin;return count;
    });
    check(descending>0,name+': '+selected+' no descending balls');
    await page.locator('#resetBtn').click();
    check(!(await page.locator('#introOverlay').isVisible()),name+': '+selected+' reset failed');
  }
  check(await page.locator('#introMode option[value="count"]').count()===0,name+': obsolete numeric countdown option remains');
  check(await page.locator('#introMode option[value="voice"]').count()===0,name+': obsolete spoken countdown option remains');
  await page.locator('#introMode').evaluate(el=>{el.value='instant';el.dispatchEvent(new Event('change',{bubbles:true}))});
  await page.locator(width<=800?'#playBtn':'#startBtn').click();
  check(await page.evaluate(()=>playing&&!introActive),name+': immediate start broken');
  await page.locator('#resetBtn').click();
  const fillStyle=await page.locator('#progressFill').getAttribute('style')||'';
  check(fillStyle.includes('0%'),`${name}: reset did not return progress to zero`);

  check((await page.locator('#fullBtn').innerText()).includes('수업 전체화면'),`${name}: classroom fullscreen label missing`);
  check(await page.locator('#fsExitBtn').count()===1,`${name}: fullscreen exit button missing`);
  await page.locator('#stageFsBtn').click();
  check(await page.locator('body').evaluate(el=>el.classList.contains('fullscreen')),`${name}: stage shortcut did not enable classroom fullscreen`);
  check(await page.locator('#fsExitBtn').isVisible(),`${name}: fullscreen exit button is not visible`);
  const fsGeom=await page.evaluate(()=>({vh:innerHeight,stage:document.querySelector('.stage')?.getBoundingClientRect().height,controls:getComputedStyle(document.querySelector('.controls')).display,score:getComputedStyle(document.querySelector('.score')).display}));
  check(fsGeom.stage>fsGeom.vh*.72,`${name}: fullscreen stage does not fill viewport ${JSON.stringify(fsGeom)}`);
  check(fsGeom.controls==='none'&&fsGeom.score==='none',`${name}: setup panels still visible in classroom fullscreen`);
  // Regression for a 1600px browser: dashboard's 310px left grid column
  // must never constrain the fullscreen performance area.
  const fallFullGeom=await page.evaluate(()=>({
    viewport:innerWidth,app:document.querySelector('.app').getBoundingClientRect().toJSON(),
    panel:document.querySelector('.stagePanel').getBoundingClientRect().toJSON(),
    stage:document.querySelector('#stage').getBoundingClientRect().toJSON()
  }));
  check(fallFullGeom.panel.width>fallFullGeom.viewport*.92&&fallFullGeom.stage.width>fallFullGeom.viewport*.92,
    `${name}: fall fullscreen still trapped in first dashboard column ${JSON.stringify(fallFullGeom)}`);
  const fallReadability=await page.evaluate(()=>{
    elapsed=firstNoteMs()-FALL_TRAVEL_MS+900;draw();
    const note=document.querySelector('.fall'),style=el=>el?getComputedStyle(el):null;
    return {full:document.body.classList.contains('fullscreen'),circle:parseFloat(style(note)?.width||'0'),
      noteText:parseFloat(style(note?.querySelector('.fallLabel'))?.fontSize||'0'),
      lane:parseFloat(style(document.querySelector('.laneLabel'))?.fontSize||'0'),
      tube:parseFloat(style(document.querySelector('.tubeLabel'))?.fontSize||'0'),
      lyric:parseFloat(style(document.querySelector('.lyricSyllable'))?.fontSize||'0'),
      spaces:document.querySelector('#lyricTrack')?.querySelectorAll('.lyricWordSpace').length};
  });
  if(width>=801)check(fallReadability.circle>=104&&fallReadability.noteText>=22&&
    fallReadability.lane>=16&&fallReadability.tube>=16&&fallReadability.lyric>=25,
    `${name}: PC fullscreen still has tiny falling notes or text ${JSON.stringify(fallReadability)}`);
  if(name==='desktop1366')await page.screenshot({path:`${out}/${name}-enlarged-falling-lyrics.png`,fullPage:false});
  await page.evaluate(()=>{elapsed=0;draw()});
  await page.screenshot({path:`${out}/${name}-class-fullscreen.png`,fullPage:false});
  await page.locator('#playViewSelect').selectOption('score');
  const scoreFs=await page.evaluate(()=>{
    const rect=sel=>document.querySelector(sel).getBoundingClientRect().toJSON(),
      grid=document.querySelector('#scoreStageGrid'),
      cards=[...grid.querySelectorAll('.beat')];
    const first=cards[0]?.getBoundingClientRect().toJSON();
    const lastInFirstRow=cards.findLast?.(el=>el.getBoundingClientRect().top===first?.top);
    return {viewport:innerWidth,viewportH:innerHeight,app:rect('.app'),layout:rect('.layout'),
      panel:rect('.stagePanel'),stage:rect('#stage'),score:rect('#scoreStage'),
      grid:rect('#scoreStageGrid'),first,columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      cardWidth:first?.width,cardHeight:first?.height,scrollable:grid.scrollHeight>grid.clientHeight,
      overflowX:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth)};
  });
  check(scoreFs.app.width>scoreFs.viewport*.94&&scoreFs.panel.width>scoreFs.viewport*.92&&
    scoreFs.stage.width>scoreFs.viewport*.92&&scoreFs.grid.width>scoreFs.viewport*.86,
    `${name}: score fullscreen does not fill viewport ${JSON.stringify(scoreFs)}`);
  check(scoreFs.first&&scoreFs.first.width>=65&&scoreFs.first.height>=95&&scoreFs.columns>=3&&
    scoreFs.first.right<=scoreFs.viewport+1&&scoreFs.overflowX<=1,
    `${name}: score fullscreen cards are clipped or squashed ${JSON.stringify(scoreFs)}`);
  check(scoreFs.scrollable,`${name}: long score must scroll internally in fullscreen ${JSON.stringify(scoreFs)}`);
  if(name==='desktop1366'||name==='mobile390'||name==='desktop1600short')
    await page.screenshot({path:`${out}/${name}-score-fullscreen.png`,fullPage:false});
  // Restore mode before checking legacy fall behavior.
  await page.locator('#playViewSelect').selectOption('fall');
  await page.locator('#fsExitBtn').click();
  check(!(await page.locator('body').evaluate(el=>el.classList.contains('fullscreen'))),`${name}: classroom fullscreen exit failed`);
  await page.locator('.tube[data-note="도"]').click();
  overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth));
  check(overflow<=1,`${name}: horizontal overflow after interactions ${overflow}px`);
  await page.screenshot({path:`${out}/${name}.png`,fullPage:true});
  check(errors.length===0,`${name}: JS errors: ${errors.join(' | ')}`);
  report.push({name,width,height,overflow,errors,beats:await page.locator('.beat').count(),tubeLabelColors,lyricSyllables:await page.locator('.lyricSyllable').count(),displayMode:await page.locator('#displayModeSelect').inputValue()});
  await context.close();
}

// Real browser download checks: file headers, full note count, A4 PDF paging.
{
  const context=await browser.newContext({viewport:{width:1366,height:900},acceptDownloads:true});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE,{waitUntil:'networkidle'});
  const save=async(kind)=>{
    const selector=kind==='pdf'?'#scorePdfBtn':'#scorePngBtn';
    const [download]=await Promise.all([page.waitForEvent('download'),page.locator(selector).click()]);
    const path=out+'/actual-score-'+kind+(kind==='pdf'?'.pdf':'.png');
    await download.saveAs(path);
    return {name:download.suggestedFilename(),buf:fs.readFileSync(path)};
  };
  const baseNotes=await page.locator('#scoreRows .beat').count();
  const png=await save('png');
  check(png.name.includes('색깔악보')&&png.buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
    'score export: downloaded PNG signature or filename invalid');
  const pngW=png.buf.readUInt32BE(16),pngH=png.buf.readUInt32BE(20);
  check(pngW===1240&&pngH>=400&&png.buf.length>10000,
    'score export: image is clipped or too small '+JSON.stringify({pngW,pngH,size:png.buf.length,baseNotes}));
  const pdf=await save('pdf');
  const pdfText=pdf.buf.toString('latin1');
  check(pdf.name.includes('색깔악보')&&pdfText.startsWith('%PDF-1.4')&&pdfText.includes('%%EOF')&&pdfText.includes('/Count 1'),
    'score export: single-page PDF structure or filename invalid');
  check(pdf.buf.length>10000&&pdfText.includes('/MediaBox [0 0 595.28 841.89]'),
    'score export: PDF missing printable A4 portrait page');
  // Long song must NOT clip notes at the bottom: append pages instead.
  await page.evaluate(()=>{const originals=[...events];events=Array.from({length:110},(_,i)=>({...originals[i%originals.length],index:i,start:FIRST_NOTE_LEAD_MS+i*beatMs()}));renderScore()});
  const long=await save('pdf');
  const longText=long.buf.toString('latin1');
  check(longText.includes('/Count 3')&&((longText.match(/\/Type \/Page \/Parent/g)||[]).length===3),
    'score export: long PDF was not split into three pages');
  check(errors.length===0,'score export: JS errors '+errors.join(' | '));
  report.push({name:'scoreExport',pngBytes:png.buf.length,pngSize:pngW+'x'+pngH,pdfBytes:pdf.buf.length,longPdfBytes:long.buf.length,pdfPages:3,notes:baseNotes});
  await context.close();
}

// The score version must START ON its first note the instant '작' ends.
// Falling notes retain their 3.1-second descent, so test the two independently.
for(const [label,w,h] of [['mobile-score-immediate',390,844],['desktop-score-immediate',1366,900]]){
  const context=await browser.newContext({viewport:{width:w,height:h}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE,{waitUntil:'networkidle'});
  await page.locator('#introMode').evaluate(el=>{el.value='music';el.dispatchEvent(new Event('change',{bubbles:true}))});
  await page.locator('#playViewSelect').selectOption('score');
  const original=await page.evaluate(()=>window.__boomVideoQA.scoreTiming());
  check(original.firstEvent?.note==='도'&&original.secondEvent?.note==='도',
    label+': the first two test notes should be 도, 도 '+JSON.stringify(original));
  check(original.firstScoreBeatMs>=3000,label+': fall runway was lost in score event data');
  await page.locator(w<=800?'#playBtn':'#startBtn').click();
  let started=await page.evaluate(()=>window.__boomVideoQA.intro());
  check(started.active&&started.countBeats===0&&started.beats>=4,
     label+': guided start must not add countdown '+JSON.stringify(started));
   await page.waitForFunction(()=>!introActive&&playing,null,{timeout:16000});
   // Visual handoff now arms a little before the real downbeat, so wait
   // for the AUDIO clock to reach note 1, not an arbitrary 130 ms delay.
   await page.waitForFunction(()=>{
     const t=window.__boomVideoQA.scoreTiming();
     return playing&&t.elapsed>=t.firstScoreBeatMs+12
       &&!!document.querySelector('#scoreStageGrid .scoreActive');
   },null,{timeout:3500});
  const first=await page.evaluate(()=>({
    timing:window.__boomVideoQA.scoreTiming(),active:[...document.querySelectorAll('#scoreStageGrid .scoreActive')].map(e=>Number(e.dataset.eventIndex)),
    side:[...document.querySelectorAll('#scoreRows .scoreActive')].map(e=>[...e.parentElement.children].indexOf(e)),
    volume:Number(document.querySelector('#progressFill').style.width.replace('%',''))
  }));
  check(first.active.join(',')==='0'&&first.side.join(',')==='0'&&
    first.timing.elapsed>=first.timing.firstScoreBeatMs&&first.timing.elapsed<first.timing.secondEvent.start,
    label+': first 도 must appear on MR downbeat '+JSON.stringify(first));
  check(first.timing.visibleTime.startsWith('0:00')&&first.volume<5,
    label+': score mode should show 0:00, not a 3.1s fake lead '+JSON.stringify(first));
  await page.waitForTimeout(Math.max(0,Math.ceil(await page.evaluate(()=>events[1].start-elapsed))+60));
  const second=await page.evaluate(()=>({active:[...document.querySelectorAll('#scoreStageGrid .scoreActive')].map(e=>Number(e.dataset.eventIndex)),
    side:[...document.querySelectorAll('#scoreRows .scoreActive')].map(e=>[...e.parentElement.children].indexOf(e)),
    elapsed,time:document.querySelector('#timeLabel').textContent}));
  check(second.active.join(',')==='1'&&second.side.join(',')==='1',
    label+': the second 도 must pulse on the next actual beat '+JSON.stringify(second));
  await page.screenshot({path:`${out}/${label}.png`,fullPage:false});
  await page.locator('#resetBtn').click();
  await page.locator('#introMode').evaluate(el=>{el.value='instant';el.dispatchEvent(new Event('change',{bubbles:true}))});
  await page.locator(w<=800?'#playBtn':'#startBtn').click();
  await page.waitForTimeout(95);
  const instant=await page.evaluate(()=>window.__boomVideoQA.scoreTiming());
  check(instant.elapsed>=instant.firstScoreBeatMs&&!instant.introActive,
    label+': immediate-start setting in score mode still waits 3.1s '+JSON.stringify(instant));
  await page.locator('#resetBtn').click();
  await page.locator('#playViewSelect').selectOption('fall');
  await page.locator(w<=800?'#playBtn':'#startBtn').click();
  await page.waitForTimeout(100);
  const fall=await page.evaluate(()=>window.__boomVideoQA.scoreTiming());
  check(fall.elapsed<350&&fall.elapsed<fall.firstScoreBeatMs-2000,
    label+': falling mode must keep its original descent time '+JSON.stringify(fall));
  check(errors.length===0,label+': runtime errors '+errors.join('; '));
  report.push({name:label,first,second,instant,fall});
  await context.close();
}

for(const [name,w,h] of [['mobile360',360,800],['mobile390',390,844],['mobile412',412,915],['tablet768',768,1024],['desktop1366short',1366,768],['desktop1600short',1600,800],['desktop1366',1366,900]]) await basicCase(name,w,h);

// Karaoke must never paginate inside a Korean word. In particular, the last
// reprise of 작은별 must show "아름답게" instead of the broken "름답게".
for(const [screen,w,h] of [['lyricPhone390',390,844],['lyricDesktop1366',1366,900],['lyricNarrowDesktop1024',1024,768]]){
 const ctx=await browser.newContext({viewport:{width:w,height:h}});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(BASE,{waitUntil:'networkidle'});
 const result=await page.evaluate(()=>{
  const original={song:currentSong,section:practiceSection,t:elapsed};
  const report=[];
  for(const key of ['twinkle','plane','butterfly','bear','school-bell']){
   const sample=findSample(key);if(!sample)continue;
   currentSong=clone(sample);practiceSection='all';refreshPracticeSections();build();
   const full=LYRIC_WORDS[key]||'',joined=events.filter(e=>e.lyric).map(e=>String(e.lyric).replace(/\s/g,'')).join('');
   const hasWords=full.replace(/\s/g,'')===joined;
   let incomplete=[],clipped=[],activeMiss=[];
   for(const e of events.filter(e=>e.lyric)){
    elapsed=e.start+10;updateLyricTrack(true);
    const track=document.querySelector('#lyricTrack'),label=track.getAttribute('aria-label')||'';
    if(hasWords&&!full.includes(label))incomplete.push({at:e.start,label});
    const line=track.querySelector('.lyricLine'),bounds=line?.getBoundingClientRect(),outer=track.getBoundingClientRect();
    if(bounds&&(bounds.left<outer.left-2||bounds.right>outer.right+2))clipped.push({at:e.start,label,left:bounds.left,right:bounds.right,width:outer.width});
    if(track.querySelectorAll('.lyricSyllable.active').length!==1)activeMiss.push(e.start);
   }
   report.push({key,hasWords,incomplete,clipped,activeMiss});
  }
  currentSong=original.song;practiceSection=original.section;elapsed=original.t;refreshPracticeSections();build();
  return report;
 });
 check(result.some(x=>x.key==='twinkle'&&x.hasWords),screen+': cannot match twinkle text to known words');
 // All builtin lyrics should have a real validated word map, not just fixed
 // sung-phrase timing. This catches missing spaces in classroom songs.
 const wordAudit=await page.evaluate(()=>{
  const old={song:currentSong,section:practiceSection,t:elapsed},out=[];
  try{
   for(const song of SAMPLES.filter(s=>s.category!=='박자 연습')){
    currentSong=clone(song);practiceSection='all';refreshPracticeSections();build();
    const actual=events.filter(e=>eHasLyric(e)).map(e=>String(e.lyric).replace(/\s/g,'')).join('');
    const text=LYRIC_WORDS[song.key]||'';
    const boundary=lyricWordBreakIndices();
    const firstPhrase=lyricWindowAt(firstNoteMs()+10,18,document.querySelector('#lyricTrack').clientWidth-34);
    out.push({key:song.key,text,valid:actual===text.replace(/\s/g,''),
      gaps:boundary.size,first:firstPhrase.items.map((x,i)=>(i&&boundary.has(x.i)?' ':'')+String(x.e.lyric).trim()).join('')});
   }
  }finally{currentSong=old.song;practiceSection=old.section;elapsed=old.t;refreshPracticeSections();build()}
  return out;
 });
 for(const x of wordAudit){
  check(x.valid,screen+': invalid or absent song word spacing map '+JSON.stringify(x));
  check(x.gaps>=1,screen+': all songs need spaces in their subtitles '+JSON.stringify(x));
 }
 const wordBySong=Object.fromEntries(wordAudit.map(x=>[x.key,x]));
 check(wordBySong['spring-outing']?.first==='나리나리 개나리',
   screen+': spring outing opening does not preserve Korean spaces '+JSON.stringify(wordBySong['spring-outing']));
 check(wordBySong['hometown-spring']?.first==='나의 살던 고향은' &&
       wordBySong['hometown-spring']?.text.includes('차린 동네') &&
       !wordBySong['hometown-spring']?.text.includes('차리인'),
   screen+': hometown spring natural lyrics remain incorrect '+JSON.stringify(wordBySong['hometown-spring']));
 check(wordBySong.bicycle?.first==='따르릉 따르릉',
   screen+': bicycle opening lacks word spacing '+JSON.stringify(wordBySong.bicycle));
 report.push({name:screen+'-all-songs-word-audit',all:wordAudit.map(x=>({key:x.key,first:x.first,gaps:x.gaps}))});

 for(const x of result){
  check(x.incomplete.length===0,screen+': lyric fragment at '+x.key+': '+JSON.stringify(x.incomplete.slice(0,3)));
  check(x.clipped.length===0,screen+': karaoke overflow at '+x.key+': '+JSON.stringify(x.clipped.slice(0,3)));
  check(x.activeMiss.length===0,screen+': wrong active syllable at '+x.key);
 }
 // Musical lyric phrases MUST match how the songs are sung, not just avoid
 // splitting words. A lone "동쪽" after "비치네" is a regression.
 const phraseCase=await page.evaluate(()=>{
  const before={song:currentSong,section:practiceSection,t:elapsed};
  const samples=['twinkle','plane','butterfly','rabbit','same','bear','school-bell'];
  const results=[];
  try{
   for(const key of SAMPLES.filter(s=>s.category!=='박자 연습').map(song=>song.key)){
    currentSong=clone(findSample(key));practiceSection='all';refreshPracticeSections();build();
    const seen=new Set(),lines=[],notFull=[];
    for(const e of events.filter(x=>eHasLyric(x))){
     const view=lyricWindowAt(e.start+10,18,document.querySelector('#lyricTrack').clientWidth-34);
     const line=view.items.map((item,j)=>(j&&lyricWordBreakIndices().has(item.i)?' ':'')+String(item.e.lyric).trim()).join('');
     if(!seen.has(view.start)){seen.add(view.start);lines.push(line)}
     if(!view.items.some(x=>x.i===e.index))notFull.push(e.index);
    }
    const starts=musicalLyricStarts(events.map((e,i)=>({e,i})).filter(x=>eHasLyric(x.e)),lyricWordBreakIndices());
    results.push({key,lines,hasMusicalPhrases:!!starts,expectedPhrases:LYRIC_PHRASE_BARS[key]?.length||0,notFull});
   }
   currentSong=clone(findSample('twinkle'));practiceSection='4';refreshPracticeSections();build();
   const section=lyricWindowAt(firstNoteMs()+20,18,document.querySelector('#lyricTrack').clientWidth-34)
      .items.map((x,j)=>(j&&lyricWordBreakIndices().has(x.i)?' ':'')+x.e.lyric).join('');
   results.push({key:'twinkle-4bars',lines:[section],hasMusicalPhrases:true,notFull:[]});
  }finally{
   currentSong=before.song;practiceSection=before.section;elapsed=before.t;refreshPracticeSections();build();
  }
  return results;
 });
 const expectTwinkle=[
  '반짝반짝 작은 별','아름답게 비치네','동쪽 하늘에서도',
  '서쪽 하늘에서도','반짝반짝 작은 별','아름답게 비치네'
 ];
 const songLines=Object.fromEntries(phraseCase.map(x=>[x.key,x.lines]));
 check(JSON.stringify(songLines.twinkle)===JSON.stringify(expectTwinkle),
   screen+': small star lyrics not grouped into six SINGABLE lines '+JSON.stringify(songLines.twinkle));
 check(JSON.stringify(songLines.plane)===JSON.stringify([
  '떴다 떴다 비행기','날아라 날아라','높이 높이 날아라','우리 비행기'
 ]),screen+': plane phrases do not match musical cadence '+JSON.stringify(songLines.plane));
 check(songLines['twinkle-4bars']?.join('')==='아름답게 비치네',
   screen+': 4-measure practice must show only its musical phrase '+JSON.stringify(songLines['twinkle-4bars']));
 for(const p of phraseCase){
  check(p.hasMusicalPhrases&&p.notFull.length===0,screen+': broken phrase grouping '+JSON.stringify(p));
  if(p.key!=='twinkle-4bars')check(p.lines.length===p.expectedPhrases,
    screen+': phrase counts must match the actual score sections '+JSON.stringify(p));
 }
 report.push({name:screen+'-sung-phrases',phraseCase});


 // Real timing exercises: musical 3/5-note contours without added lyrics;
 // four distinct subdivisions, eight 4/4 measures and the same beat counter.
 const rhythmChecks=await page.evaluate(()=>{
  const prev={song:currentSong,section:practiceSection,t:elapsed,level,bpm},results=[];
  try{
   for(const key of ['beat-basic','beat-half','sixteenth','dotted']){
    currentSong=clone(findSample(key));level=8;practiceSection='all';elapsed=0;bpm=selectedTempo(currentSong);
    refreshPracticeSections();build();updateRhythmGuide();updateLyricTrack(true);
    const b=beatMs(),bars=playbackMeasures.map(bar=>bar.reduce((a,e)=>a+Number(e.dur),0));
    const visual={
      counter:document.querySelector('#lyricTrack')?.getAttribute('aria-label'),
      label:document.querySelector('#lyricBtn')?.textContent,
      selected:document.querySelector('#rhythmGuide')?.classList.contains('show'),
      guide:document.querySelector('#rhythmGuide')?.innerText,
      active:events.filter(e=>e.active).length,
      notes:events.map(e=>e.note),
      distinctBars:new Set(playbackMeasures.map(bar=>bar.map(e=>e.note).join(','))).size,
      t:events.map(e=>e.start)
    };
    elapsed=firstNoteMs()+30;updateLyricTrack(true);
    const beat1=document.querySelector('#lyricTrack')?.getAttribute('aria-label');
    elapsed=firstNoteMs()+b+30;updateLyricTrack(true);
    const beat2=document.querySelector('#lyricTrack')?.getAttribute('aria-label');
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),videoCues=[];
    const originalFillText=ctx.fillText.bind(ctx);
    ctx.fillText=(word,...args)=>{videoCues.push(String(word));return originalFillText(word,...args)};
    videoLyricBar(ctx,0,8,8,480,58);
    videoLyricBar(ctx,firstNoteMs()+30,8,8,480,58);
    const fullNotes=events.map(e=>[e.note,e.start,e.dur]);
    const fullChords=playbackMeasures.map((_,i)=>chordForMeasure(i).name);
    let masksPreserveSong=true;
    for(const mask of [3,5,8]){
     level=mask;build();
     masksPreserveSong &&= JSON.stringify(events.map(e=>[e.note,e.start,e.dur]))===JSON.stringify(fullNotes)
      &&JSON.stringify(playbackMeasures.map((_,i)=>chordForMeasure(i).name))===JSON.stringify(fullChords)
      &&events.every(e=>e.active===ALLOWED[mask].has(e.note));
    }
    level=8;build();updateRhythmGuide();
    results.push({key,category:currentSong.category,title:currentSong.title,beats:bars,
      measures:bars.length,pitches:[...new Set(visual.notes)],distinctBars:visual.distinctBars,
      masksPreserveSong,allActive:visual.active===events.length,lyrics:events.filter(e=>e.lyric).length,
      countReady:visual.counter,count1:beat1,count2:beat2,videoCues,toggleLabel:visual.label,
      guide:visual.selected,help:visual.guide,
      validTiming:events.every((e,i)=>!i||e.start>=events[i-1].start+events[i-1].dur-1)});
   }
   return {groups:[...document.querySelectorAll('#sampleSelect optgroup')].map(x=>x.label),
       items:[...document.querySelectorAll('#sampleSelect optgroup')].map(x=>[x.label,x.querySelectorAll('option').length]),
       results};
  }finally{
   currentSong=prev.song;level=prev.level;practiceSection=prev.section;elapsed=prev.t;bpm=prev.bpm;
   refreshPracticeSections();build();updateRhythmGuide();
  }
 });
 check(JSON.stringify(rhythmChecks.groups)===JSON.stringify(['동요','붐웨커 연습곡','박자 연습']),
   screen+': misleading song categories remain '+JSON.stringify(rhythmChecks.groups));
 check(rhythmChecks.items.at(-1)?.[1]===4,screen+': all four rhythm exercises must be visible');
 for(const x of rhythmChecks.results)check(x.measures===8&&x.beats.every(n=>n===4)&&
   x.category==='박자 연습'&&x.pitches.length===(['beat-half','dotted'].includes(x.key)?5:3)&&
   x.distinctBars>=4&&x.masksPreserveSong&&x.allActive&&x.lyrics===0&&x.guide&&
   x.countReady==='박자 연습 준비'&&x.count1==='박자 세기 1'&&x.count2==='박자 세기 2'&&
   x.toggleLabel==='박자 세기'&&x.videoCues[0]==='준비'&&x.videoCues[1]?.includes('[1]')&&x.validTiming,
   screen+': invalid real beat exercise '+JSON.stringify(x));
 // Old locally saved single-note samples must rehydrate as the updated
 // melodic originals, while hand-imported scores must remain untouched.
 const rhythmMigration=await page.evaluate(()=>{
  const raw=localStorage.getItem('ulmoaBoomLast'),priorKey=currentSampleKey;
  try{
   const sample=clone(findSample('beat-half'));
   sample.measures=sample.measures.map(bar=>bar.map(e=>({...e,note:'도'})));
   sample.sampleKey='beat-half';
   localStorage.setItem('ulmoaBoomLast',JSON.stringify(sample));
   const migrated=loadSong();
   const updated=migrated.measures.flat().some(e=>e.note!=='도');
   const custom={...sample,category:'직접 만든 곡',sampleKey:''};
   localStorage.setItem('ulmoaBoomLast',JSON.stringify(custom));
   const untouched=JSON.stringify(loadSong().measures)===JSON.stringify(custom.measures);
   return {updated,untouched};
  }finally{
   if(raw===null)localStorage.removeItem('ulmoaBoomLast');else localStorage.setItem('ulmoaBoomLast',raw);
   currentSampleKey=priorKey;
  }
 });
 check(rhythmMigration.updated&&rhythmMigration.untouched,screen+': saved melody migration damaged originals or user scores');
 report.push({name:screen+'-rhythm-lessons',rhythmChecks,rhythmMigration});

 const end=await page.evaluate(()=>{
  currentSong=clone(findSample('twinkle'));practiceSection='all';refreshPracticeSections();build();
  const lyrics=events.filter(e=>e.lyric);elapsed=lyrics[lyrics.length-6].start+10;updateLyricTrack(true);
  return document.querySelector('#lyricTrack').getAttribute('aria-label');
 });
 check(end.includes('아름답게')&&!end.startsWith('름답게'),screen+': little star last line starts mid-word '+end);
 await page.locator('#lyricTrack').screenshot({path:out+'/'+screen+'-last-word.png'});
 check(errors.length===0,screen+': lyric runtime errors '+errors.join(' | '));
 report.push({name:screen,end,wordLines:result.map(x=>({song:x.key,naturalWordMap:x.hasWords}))});
 await ctx.close();
}


{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  await page.goto(BASE,{waitUntil:'networkidle'});
  await page.locator('#displayModeSelect').selectOption('instrument');
  await page.evaluate(()=>{elapsed=firstNoteMs()-FALL_TRAVEL_MS+950;draw()});
  const instrumentFall=await page.locator('.fall').first().evaluate(el=>({w:parseFloat(getComputedStyle(el).width),label:getComputedStyle(el.querySelector('.fallLabel')).fontSize}));
  check(instrumentFall.w>=52,'display screenshot: mobile falling note should stay large in instrument mode');
  await page.screenshot({path:out+'/display-instrument390.png',fullPage:true});
  check((await page.locator('.tube[data-note="라"] .tubeLabel').innerText())==='🎺','display screenshot: instrument icon mapping wrong');
  await page.locator('#displayCloseBtn').click();
  await page.locator('#displayModeSelect').selectOption('name');
  await page.locator('#displayInputs input[data-display-index="0"]').fill('민준');
  await page.locator('#displayInputs input[data-display-index="1"]').fill('서연');
  await page.locator('#displayInputs input[data-display-index="2"]').fill('지우');
  await page.locator('#displayApplyBtn').click();
  await page.waitForFunction(()=>document.querySelector('.laneLabel')?.textContent==='민준');
  await page.evaluate(()=>{elapsed=firstNoteMs()-FALL_TRAVEL_MS+950;draw()});
  check(await page.locator('.fall .fallLabel').count()>0,'display screenshot: child-name falling note missing');
  await page.screenshot({path:out+'/display-names390.png',fullPage:true});
  check((await page.locator('.laneLabel').nth(0).innerText())==='민준'&&(await page.locator('.laneLabel').nth(1).innerText())==='서연','display screenshot: child names not visible');
  await context.close();
}

{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE,{waitUntil:'networkidle'});
  await page.locator('#mobileSettingsBtn').click();
  await page.locator('#introMode').evaluate(el=>{el.value='instant';el.dispatchEvent(new Event('change',{bubbles:true}))});
  const defaultMr=await page.evaluate(()=>window.__boomVideoQA.mix());
  const autoBalance=await page.evaluate(async()=>{
    const A=window.OfflineAudioContext||window.webkitOfflineAudioContext;
    const render=async(kind)=>{const ac=new A(1,44100*3,44100);mrBuffer=null;mrVolume=1;if(kind==='melody')scheduleMelodyTone(ac,ac.destination,'도',.05,'boom');else if(kind==='mr')scheduleBuiltinMr(ac,ac.destination,.05,0,1);else{scheduleMelodyTone(ac,ac.destination,'도',.05,'boom');scheduleBuiltinMr(ac,ac.destination,.05,0,1)}const b=await ac.startRendering(),d=b.getChannelData(0);let energy=0,peak=0;for(const v of d){const a=Math.abs(v);energy+=a;peak=Math.max(peak,a)}return{energy,peak}};
    return{melody:await render('melody'),mr:await render('mr'),both:await render('both')};
  });
  check(autoBalance.mr.energy>autoBalance.melody.energy*1.2,'mr: automatic MR is still not prominent enough versus melody '+JSON.stringify(autoBalance));
  check(autoBalance.mr.peak>.22,'mr: automatic MR peak is too low '+JSON.stringify(autoBalance));
  check(autoBalance.both.peak<.98,'mr: combined output clips '+JSON.stringify(autoBalance));
  const halfMr=await page.evaluate(async()=>{const A=window.OfflineAudioContext||window.webkitOfflineAudioContext;const ac=new A(1,44100*3,44100);mrBuffer=null;scheduleBuiltinMr(ac,ac.destination,.05,0,.5);const b=await ac.startRendering(),d=b.getChannelData(0);let peak=0,energy=0;for(const v of d){const a=Math.abs(v);peak=Math.max(peak,a);energy+=a}return{peak,energy}});
  check(halfMr.peak>.11&&halfMr.energy>autoBalance.melody.energy*.55,'mr: automatic MR should remain clearly audible around 50% '+JSON.stringify({halfMr,autoBalance}));
  report.push({name:'autoMrBalance',autoBalance,halfMr});
  check(defaultMr.mrReady===true&&defaultMr.mrKind==='auto'&&!defaultMr.mrLoaded,'mr: built-in automatic MR is not ready by default');
  check((await page.locator('#mrStatus').innerText()).includes('자동 MR 준비됨'),'mr: automatic backing status is not visible');
  await page.locator('#mixModes button[data-mix="both"]').click();
  await page.locator('#startBtn').click();
  await page.waitForTimeout(120);
  check(await page.evaluate(()=>!!mrSource),'mr: built-in automatic MR did not schedule');
  await page.locator('#startBtn').click();
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
  await page.locator('#startBtn').click();
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
  check(await page.locator('#scoreRows .beat').count()===3&&await page.locator('#scoreStageGrid .beat').count()===3,'transfer: note count mismatch');
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
    const render=async(mode,volume=.65)=>{const ac=new A(1,22050,22050);scheduleMelodyTone(ac,ac.destination,'도',.02,mode,volume);const b=await ac.startRendering(),d=b.getChannelData(0);let energy=0,peak=0;for(const v of d){const a=Math.abs(v);energy+=a;peak=Math.max(peak,a)}return {energy,peak}};
    return {none:await render('none'),piano:await render('piano'),xylophone:await render('xylophone'),boom:await render('boom'),boomLow:await render('boom',.2),boomHigh:await render('boom',1)};
  });
  check(melodyProbe.none.energy===0,'melody probe: none should be silent');
  check(melodyProbe.piano.energy>10&&melodyProbe.xylophone.energy>10&&melodyProbe.boom.energy>10,'melody probe: one or more melody voices are silent');
  check(new Set([Math.round(melodyProbe.piano.energy),Math.round(melodyProbe.xylophone.energy),Math.round(melodyProbe.boom.energy)]).size===3,'melody probe: timbres are not measurably distinct');
  check(melodyProbe.boomHigh.energy>melodyProbe.boomLow.energy*3.5,'melody probe: volume control does not materially change output');
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
  check(probe.brand?.copy?.includes('자체 제작 화면·편집 © 울모아쌤'),'video probe: content-specific copyright mark missing');
  await page.locator('#qaVideoCanvas').screenshot({path:out+'/video-frame-probe.png'});
  check(errors.length===0,'video probe: page errors '+errors.join(' | '));
  report.push({name:'videoProbe',bytes:probe.size,mime:probe.mime});
  await context.close();
}
// Persist the user's actual custom selection across reload and song changes.
{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(BASE,{waitUntil:'networkidle'});
 await page.locator('#mobileSettingsBtn').click();
 await page.locator('#levels button[data-level="custom"]').click();
 await page.locator('#customNoteChoices button[data-note="높은도"]').click();
 for(const n of ['도','미','솔'])await page.locator('#customNoteChoices button[data-note="'+n+'"]').click();
 await page.locator('#customNoteApply').click();
 const before=await page.evaluate(()=>window.__boomVideoQA.noteSelection());
 check(before.level==='custom'&&before.selected.join(',')==='높은도','persistence: picking just high C failed '+JSON.stringify(before));
 await page.reload({waitUntil:'networkidle'});
 const after=await page.evaluate(()=>window.__boomVideoQA.noteSelection());
 check(after.level==='custom'&&after.selected.join(',')==='높은도','persistence: custom notes/mode did not reload '+JSON.stringify(after));
 check(await page.locator('.tube:not(.inactive)').count()===1,'persistence: saved note did not remain the only active tube');
 check((await page.locator('#rangeNote').innerText()).includes('선택한 음이 없어서 공이 내려오지 않아요'),
   'persistence: an empty target song should explain why no balls fall');
 await page.locator('#mobileSongSelect').selectOption('bear');
 const newSong=await page.evaluate(()=>window.__boomVideoQA.noteSelection());
 check(newSong.level==='custom'&&newSong.selected.join(',')==='높은도',
   'persistence: changing songs unexpectedly reset custom note selection');
 check(errors.length===0,'persistence: page errors '+errors.join(' | '));
 report.push({name:'customNotePersistence',before,after,newSong:{level:newSong.level,selected:newSong.selected}});
 await context.close();
}

 
// Public YouTube export is not the same as classroom export. The guardrail
// must reject third-party songs, custom scores, external MR and child names.
for(const [name,w,h] of [['publishMobile390',390,844],['publishDesktop1366',1366,900]]){
 const context=await browser.newContext({viewport:{width:w,height:h}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(BASE,{waitUntil:'networkidle'});
 const inspection=await page.evaluate(async()=>{
  const blocked=[],savedStatus=$('#publicStatus').textContent;
  chooseSample('twinkle');
  blocked.push({case:'known song',...publicVideoEligibility()});
  chooseSample('moa-signal');
  const original=publicVideoEligibility();
  const allowed=window.__boomVideoQA.publicExport();
  const former=displayMode;
  displayMode='name';blocked.push({case:'child name display',...publicVideoEligibility()});displayMode=former;
  const oldMr=mrBuffer,oldName=mrName;mrBuffer={duration:20};mrName='external';
  blocked.push({case:'external MR',...publicVideoEligibility()});mrBuffer=oldMr;mrName=oldName;
  currentSong.measures[0][0].note='라';blocked.push({case:'modified score',...publicVideoEligibility()});
  chooseSample('beat-half');
  await exportVideo({publicMode:true});
  const noAgreement=$('#publicStatus').textContent;
  $('#publicRightsOpt').checked=true;
  chooseSample('moa-space');
  const agreementReset=$('#publicRightsOpt').checked;
  const introText=[],outroText=[];
  const canvas=videoCanvas(),ctx=canvas.getContext('2d');
  const old=ctx.fillText.bind(ctx);ctx.fillText=(text,...args)=>{outroText.push(String(text));return old(text,...args)};
  videoOutro(ctx,true);
  return {original,allowed,blocked,noAgreement,agreementReset,savedStatus,
   description:publicVideoDescription(),outroText,
   isPublicPanelPresent:!!$('#publicVideoPanel'),hasCopyButton:!!$('#publicCreditBtn'),
   hasCheckbox:!!$('#publicRightsOpt'),current:publicVideoEligibility()};
 });
 check(inspection.original.ok&&inspection.allowed.eligible.ok&&inspection.current.ok,
  name+': self-composed originals in public mode mistakenly blocked '+JSON.stringify(inspection));
 check(inspection.allowed.sampleKeys.length===8, name+': public whitelist unexpectedly changed');
 check(inspection.blocked.length===4&&inspection.blocked.every(x=>!x.ok),
  name+': copied song/custom score/external MR/child identifier was allowed '+JSON.stringify(inspection.blocked));
 check(inspection.noAgreement.includes('체크')&&!inspection.agreementReset,
  name+': consent is not required or survives switching songs '+JSON.stringify(inspection));
 check(inspection.description.includes('Mats Helgesson')&&inspection.description.includes('creativecommons.org/licenses/by/4.0/')&&
   inspection.description.includes('musictheory')&&inspection.description.includes('pitch-shifted'),
  name+': attribution links or modification details missing '+inspection.description);
 check(inspection.outroText.some(x=>x.includes('Mats Helgesson'))&&
   inspection.outroText.some(x=>x.includes('creativecommons.org/licenses/by/4.0/'))&&
   inspection.outroText.every(x=>!x.includes('무단 재배포·재판매 금지')),
  name+': public video outro omits license or falsely reserves CC audio '+JSON.stringify(inspection.outroText));
 check(inspection.isPublicPanelPresent&&inspection.hasCopyButton&&inspection.hasCheckbox,
  name+': public access controls missing');
 check(errors.length===0,name+': runtime errors '+errors.join(' / '));
 report.push({name,publicExport:{allowed:inspection.original.ok,
  rejected:inspection.blocked.map(x=>x.case),agreementReset:inspection.agreementReset,
  missingAgreement:inspection.noAgreement,hasCredits:inspection.outroText.some(x=>x.includes('Mats Helgesson'))}});
 await context.close();
}

// Separate V2 preview smoke; original heart player is not modified.
async function heartV2Smoke(){
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto(ROOT+'/boomwhacker/heart-playalong-v2/',{waitUntil:'networkidle'});
 check(response?.ok(),'heartV2: preview page must load');
 check(await page.locator('#score').count()===1,'heartV2: score stage missing');
 check(await page.locator('#keys .note').count()===8,'heartV2: original note buttons missing');
 check(await page.locator('#song option').count()>=8,'heartV2: original songs missing');
 const dimensions=await page.locator('#score').evaluate(c=>({width:c.width,height:c.height}));
 check(dimensions.width===1200&&dimensions.height===620,'heartV2: unexpected canvas size');
 await page.locator('[data-theme="night"]').click();
 check(await page.locator('[data-theme="night"]').getAttribute('aria-pressed')==='true','heartV2: theme switch failed');
 await page.locator('#notes').selectOption('3');
 await page.locator('#keys .note').first().click();
 await page.locator('#play').click();
 await page.waitForTimeout(180);
 check((await page.locator('#play').textContent()).includes('일시정지'),'heartV2: start button did not start');
 await page.locator('#play').click();
 await page.screenshot({path:out+'/heartV2-mobile-390.png',fullPage:true});
 check(!errors.length,'heartV2: runtime exceptions '+errors.join(' / '));
 report.push({name:'heartV2Preview',dimensions,errors});
 await context.close();
}
await heartV2Smoke();


/* Independent V4 immersive stage test. Existing V1/V2/V3 remain unchanged. */
async function heartV4Smoke(){
 for(const cfg of [{name:"desktop",width:1440,height:900},{name:"mobile",width:390,height:844}]){
  const ctx=await browser.newContext({viewport:{width:cfg.width,height:cfg.height},deviceScaleFactor:1});
  const page=await ctx.newPage();const errors=[];
  page.on("pageerror",e=>errors.push("pageerror: "+e.message));
  page.on("console",m=>{if(m.type()==="error")errors.push("console: "+m.text())});
  const resp=await page.goto(ROOT+"/boomwhacker/heart-playalong-v4/",{waitUntil:"networkidle"});
  check(resp?.ok(),"V4 "+cfg.name+": isolated immersive route HTTP error");
  check((await page.title()).includes("모아의 하트 산책"),"V4 "+cfg.name+": title missing");
  check(await page.locator("#score").count()===1,"V4 "+cfg.name+": canvas missing");
  check(await page.locator(".transport #play").count()===1,"V4 "+cfg.name+": stage controls missing");
  check(await page.locator("#keys .key").count()===8,"V4 "+cfg.name+": canonical 8 note buttons missing");
  check(await page.locator("#song option").count()>=8,"V4 "+cfg.name+": original score collection missing");
  check(!(await page.locator("#drawer").evaluate(el=>el.open)),"V4 "+cfg.name+": settings drawer must start closed");
  const data=await page.evaluate(()=>{
   const q=window.__HEART_V4_QA__;if(!q)return null;
   const page=q.pageAt(1),g=q.geometry(0,page);
   const left=q.stepPose(.25,g),right=q.stepPose(.75,g);
   const holdFirst=q.stepPose(.35,g),holdLast=q.stepPose(.88,g);
   const noLift=q.stepPose(.5,g);
   const stepRange=[0,.1,.18,.25,.35,.5,.63,.75,.88,.99].map(x=>q.stepPose(x,g).lift);
   return {canvas:{w:document.querySelector("#score").width,h:document.querySelector("#score").height},
    stage:document.querySelector("#stage").getBoundingClientRect().toJSON(),
    page,heartWidth:g.w,footstepMode:q.getState().motion,
    left,right,holdFirst,holdLast,noLift,stepRange,
    eventsSolid:q.beatParts(1),eventsSplit:q.beatParts(0),assets:q.assets()};
  });
  check(!!data,"V4 "+cfg.name+": QA hook missing");
  if(data){
   check((cfg.name==="mobile"?data.canvas.w===820:data.canvas.w===1440),
    "V4 "+cfg.name+": wrong native canvas resolution");
   check((cfg.name==="mobile"?data.page.barsPerLine===1:data.page.barsPerLine===2),
    "V4 "+cfg.name+": viewport score rows incorrect");
   check(data.heartWidth*data.stage.width/data.canvas.w>=60,
    "V4 "+cfg.name+": notation too small");
   check(data.footstepMode==="footsteps","V4 "+cfg.name+": quiet footstep mode not default");
   check(data.left.x+10<data.right.x &&
      data.left.lift<.01&&data.right.lift<.01,
    "V4 "+cfg.name+": left and right contact points incorrect");
   const midCross=await page.evaluate(()=>{
     const q=window.__HEART_V4_QA__,g=q.geometry(0,q.pageAt(0)),p=q.stepPose(.55,g);
     return {x:p.x,left:p.left,right:p.right};
   });
   check(midCross.x>midCross.left+(midCross.right-midCross.left)*.2 &&
     midCross.x<midCross.right-(midCross.right-midCross.left)*.2,
     "V4 "+cfg.name+": Moa crosses too abruptly instead of travelling gently");
   const easedPulse=await page.evaluate(()=>{
     const q=window.__HEART_V4_QA__;
     return [q.beatCue(.25,.25),q.beatCue(.09,.25),q.beatCue(.17,.25)];
   });
   check(Math.abs(easedPulse[0]-1)<1e-6&&easedPulse[1]<.00001&&
     easedPulse[2]>0&&easedPulse[2]<1,
     "V4 "+cfg.name+": footstep pulse should fade smoothly");
   const markerFade=await page.evaluate(()=>{
     const q=window.__HEART_V4_QA__;
     return ["footsteps","heart"].map(kind=>({
       kind,before:q.guideOpacity(.249,.25,kind),after:q.guideOpacity(.251,.25,kind)
     }));
   });
   check(markerFade.every(m=>Math.abs(m.before-m.after)<.04),
     "V4 "+cfg.name+": contact-marker brightness must not jump "+JSON.stringify(markerFade));
   check(data.stepRange.filter(x=>x>1).length>=2 &&
     data.stepRange.every(x=>x<data.heartWidth*.031) &&
     Math.abs(data.holdFirst.x-data.left.x)<.1 &&
     Math.abs(data.holdLast.x-data.right.x)<.1,
    "V4 "+cfg.name+": two brief steps must HOLD between contacts, with small lifts");
   check(data.eventsSolid.length===1&&data.eventsSplit.length>=2,
    "V4 "+cfg.name+": original whole-heart and split-heart musical grammar changed");
   check(["forest","night","classroom","heart-frame","moa"].every(n=>data.assets[n]),
    "V4 "+cfg.name+": original visual assets missing");
  }
  // Meter-specific proof: same two crest contacts across 2/4, 3/4 and 4/4.
  // Selecting songs changes only the authored score, never the visual beat landmarks.
  const meterProof=await page.evaluate(()=>{
    const picker=document.querySelector("#song"),q=window.__HEART_V4_QA__;
    return [2,3,4].map(meter=>{
      const idx=window.__PERFORMANCE_SCORES__.findIndex(s=>s.meter===meter);
      if(idx<0)return {meter,found:false};
      picker.value=String(idx);picker.dispatchEvent(new Event("change",{bubbles:true}));
      const source=window.__PERFORMANCE_SCORES__[idx];
      const page=q.pageAt(.5),first=q.geometry(0,page),last=q.geometry(meter-1,page);
      const left=q.stepPose(.25,first),right=q.stepPose(.75,first);
      return {meter,found:true,reported:q.getState().meter,
        beats:source.beats,bars:source.bars.length,barWidth:last.x-first.x,
        crestOrder:left.x<right.x,landingDistance:right.x-left.x,
        noteCount:source.events.length,expectedNotes:source.bars.reduce((sum,b)=>sum+b.events.length,0)};
    });
  });
  check(meterProof.every(x=>x.found&&x.reported===x.meter&&
    x.beats===x.bars*x.meter&&x.barWidth>0&&x.crestOrder&&
    x.landingDistance>0&&x.noteCount===x.expectedNotes),
    "V4 "+cfg.name+": 2/4, 3/4 or 4/4 score/guide geometry invalid "+JSON.stringify(meterProof));
  // Exact sixteenth division remains four independent note events inside ONE heart.
  await page.locator("#song").evaluate(el=>{el.value="6";el.dispatchEvent(new Event("change",{bubbles:true}))});
  const quarterProof=await page.evaluate(()=>{
    const q=window.__HEART_V4_QA__,p=q.beatParts(16);
    return {meter:q.getState().meter,count:p.length,
      divisions:p.map(x=>[x.from,x.to])};
  });
  check(quarterProof.meter===4&&quarterProof.count===4&&
    quarterProof.divisions.every((p,i)=>Math.abs(p[0]-i*.25)<1e-6&&
      Math.abs(p[1]-(i+1)*.25)<1e-6),
    "V4 "+cfg.name+": sixteenth-note subdivision damaged "+JSON.stringify(quarterProof));
  await page.locator("#song").evaluate(el=>{el.value="0";el.dispatchEvent(new Event("change",{bubbles:true}))});
  check(await page.locator('[data-guide]').count()===3,
    "V4 "+cfg.name+": user must have three distinct guide options");
  // Rendering must truly differ, not just change a selected label.
  const fingerprints=await page.evaluate(()=>{
    const q=window.__HEART_V4_QA__,out={};
    for(const m of ["footsteps","heart","moa"]){
      document.querySelector('[data-guide="'+m+'"]').click();
      q.render(.6);
      out[m]=document.querySelector("#score").toDataURL();
    }
    document.querySelector('[data-guide="footsteps"]').click();
    q.render(-2);
    return Object.fromEntries(Object.entries(out).map(([k,v])=>[k,v]));
  });
  check(new Set(Object.values(fingerprints)).size===3,
    "V4 "+cfg.name+": all three options must render different actual frames");
  await page.screenshot({path:out+"/heartV4-"+cfg.name+"-forest.png",fullPage:true});
  await page.evaluate(()=>window.__HEART_V4_QA__.render(.75));
  await page.locator("#stage").screenshot({path:out+"/heartV4-"+cfg.name+"-footsteps.png"});
  await page.locator('[data-guide="heart"]').click();
  await page.evaluate(()=>window.__HEART_V4_QA__.render(.75));
  await page.locator("#stage").screenshot({path:out+"/heartV4-"+cfg.name+"-heart-guide.png"});
  await page.locator('[data-guide="moa"]').click();
  await page.evaluate(()=>window.__HEART_V4_QA__.render(.75));
  await page.locator("#stage").screenshot({path:out+"/heartV4-"+cfg.name+"-moa-quiet.png"});
  await page.locator('[data-guide="footsteps"]').click();
  await page.evaluate(()=>window.__HEART_V4_QA__.render(-2));
  await page.locator("#drawer summary").click();
  await page.locator('[data-theme="night"]').click();
  check(await page.locator('[data-theme="night"]').getAttribute("aria-pressed")==="true",
    "V4 "+cfg.name+": night theme unavailable");
  await page.screenshot({path:out+"/heartV4-"+cfg.name+"-night.png",fullPage:true});
  await page.locator('[data-theme="classroom"]').click();
  await page.screenshot({path:out+"/heartV4-"+cfg.name+"-classroom.png",fullPage:true});
  await page.locator("#song").selectOption("1");
  check((await page.locator("#hudTitle").textContent()).length>1,"V4 "+cfg.name+": original song selection not updating title");
  await page.locator('[data-guide="moa"]').click();
  check((await page.evaluate(()=>window.__HEART_V4_QA__.getState().motion))==="moa",
    "V4 "+cfg.name+": Moa guide mode not selected");
  await page.locator('[data-guide="heart"]').click();
  check((await page.evaluate(()=>window.__HEART_V4_QA__.getState().motion))==="heart",
    "V4 "+cfg.name+": heart-only guide mode not selected");
  await page.locator('[data-guide="footsteps"]').click();
  check((await page.locator('[data-guide="footsteps"]').getAttribute("aria-pressed"))==="true",
    "V4 "+cfg.name+": footstep guide mode control not accessible");
  await page.locator("#tempo").selectOption("0.75");
  await page.locator("#notes").selectOption("3");
  await page.locator(".key").first().click();
  await page.locator("#play").click();await page.waitForTimeout(2250);
  check((await page.locator("#play span").textContent())==="일시정지","V4 "+cfg.name+": play should start");
  const audible=await page.evaluate(()=>window.__HEART_V4_QA__.getState());
  check(audible.audioState==="running"&&audible.beat>=.5&&audible.playedCount>=2,
    "V4 "+cfg.name+": actual original melody onsets must begin after count-in "+JSON.stringify(audible));
  check((await page.locator("#status").textContent()).includes("한 박"),
    "V4 "+cfg.name+": playback status must describe ONE heart as ONE beat");
  const beforeTempo=await page.evaluate(()=>window.__HEART_V4_QA__.getState());
  await page.locator("#tempo").selectOption("1.15");
  const afterTempo=await page.evaluate(()=>window.__HEART_V4_QA__.getState());
  check(afterTempo.playing&&afterTempo.speed===1.15&&
    Math.abs(afterTempo.beat-beforeTempo.beat)<.3,
    "V4 "+cfg.name+": live tempo switch restarted the piece or jumped in time "+
      JSON.stringify({beforeTempo,afterTempo}));
  await page.waitForTimeout(110);
  const advanced=await page.evaluate(()=>window.__HEART_V4_QA__.getState());
  check(advanced.beat>afterTempo.beat,
    "V4 "+cfg.name+": visual beat clock stalled after live tempo change");
  await page.locator("#play").click();
  check((await page.locator("#play span").textContent())==="이어서 연주",
    "V4 "+cfg.name+": pause should offer resume, not restart");
  const paused=await page.evaluate(()=>window.__HEART_V4_QA__.getState());
  await page.locator("#tempo").selectOption("1");
  const pausedChange=await page.evaluate(()=>window.__HEART_V4_QA__.getState());
  check(!pausedChange.playing&&pausedChange.speed===1&&
    Math.abs(pausedChange.beat-paused.beat)<.001,
    "V4 "+cfg.name+": changing tempo while paused reset the playhead");
  await page.locator("#play").click();await page.waitForTimeout(100);
  const resumed=await page.evaluate(()=>window.__HEART_V4_QA__.getState());
  check(resumed.playing&&resumed.beat>pausedChange.beat,
    "V4 "+cfg.name+": playback failed to continue after pausing and changing tempo");
  await page.locator("#play").click();
  await page.locator("#restart").click();
  check((await page.locator("#play span").textContent())==="연주 시작"&&
    Math.abs((await page.evaluate(()=>window.__HEART_V4_QA__.getState().beat))+
      (await page.evaluate(()=>window.__HEART_V4_QA__.getState().meter)))<.001,
    "V4 "+cfg.name+": explicit restart should return to count-in");
  check(!errors.length,"V4 "+cfg.name+": JavaScript/browser error: "+errors.join(" / "));
  report.push({name:"heartV4-"+cfg.name,checks:"complete",data,errors});
  await ctx.close();
 }
}
await heartV4Smoke();

// Quiet accessibility mode must not pulse within the beat.
async function heartV4ReducedMotion(){
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:"reduce"});
 const page=await ctx.newPage();
 const response=await page.goto(ROOT+"/boomwhacker/heart-playalong-v4/",{waitUntil:"networkidle"});
 check(!!response?.ok(),"V4 reduced motion route failed");
 const qa=await page.evaluate(()=>{
   const q=window.__HEART_V4_QA__,canvas=document.querySelector("#score");
   q.render(.25);const a=canvas.toDataURL();
   q.render(.75);const b=canvas.toDataURL();
   return {effective:q.effectiveGuide(),unchanged:a===b};
 });
 check(qa.effective==="heart"&&qa.unchanged,
   "V4 reduced-motion markers must stay visually static within each beat "+JSON.stringify(qa));
 await ctx.close();
}
await heartV4ReducedMotion();

await browser.close();
fs.writeFileSync(`${out}/report.json`,JSON.stringify({failures,report},null,2));
console.log(JSON.stringify({failures,report},null,2));
if(failures.length) process.exit(1);

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
  check(await page.locator('#sampleSelect option').count()===15,`${name}: sample selector should contain current + 14 samples`);
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
   await page.waitForTimeout(130);
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

/* 모아의 바람놀이터 — independent child-friendly breathing games.
   Signal level = relative non-tonal microphone SOUND, not physical wind strength, direction
   or medically measured breathing. No audio is saved, transmitted or recorded.
   Gentle, comfortable exhale only; no instruction to force/hyperventilate. */
(()=>{
'use strict';
const $=id=>document.getElementById(id), clamp=(n,a,b)=>Math.max(a,Math.min(n,b));
const el={
 home:$('homeScreen'),play:$('playScreen'),win:$('successScreen'),
 chooseStrength:$('chooseStrength'),chooseLong:$('chooseLong'),chooseBeat:$('chooseBeat'),chooseCalm:$('chooseCalm'),
 voicePreview:$('voicePreview'),previewBtn:$('previewBtn'),mute:$('muteBtn'),
 modeTitle:$('modeTitle'),modeEmoji:$('modeEmoji'),back:$('backHome'),restart:$('restart'),
 strengthScene:$('strengthScene'),longScene:$('longScene'),beatScene:$('beatScene'),calmScene:$('calmScene'),scene:$('scene'),
 calmCircle:$('calmCircle'),calmArt:$('calmArt'),calmCue:$('calmCue'),calmRound:$('calmRound'),calmGarden:$('calmGarden'),calmDecor:$('calmDecor'),calmEnough:$('calmEnough'),longProgress:$('longProgress'),
 feather:$('feather'),windLine:$('windLine'),balloon:$('balloon'),duration:$('duration'),
 sceneGoal:$('sceneGoal'),flowerResult:$('flowerResult'),pinwheelWheel:$('pinwheelWheel'),candleFlame:$('candleFlame'),
 strengthStages:[$('featherStage'),$('flowerStage'),$('pinwheelStage'),$('candleStage')],
 flowerBlooms:[$('flowerBloom0'),$('flowerBloom1'),$('flowerBloom2')],
 targetDuration:$('targetDuration'),beatOrb:$('beatOrb'),beatEmoji:$('beatEmoji'),beatCue:$('beatCue'),beatCount:$('beatCount'),
 mainHint:$('mainHint'),levelIcon:$('levelIcon'),levelText:$('levelText'),meter:$('levelMeter'),meterFill:$('meterFill'),
 legend:[...document.querySelectorAll('.color-legend span')],
 strengthOptions:$('strengthOptions'),strengthStep:$('strengthStep'),strengthStamps:$('strengthStamps'),longOptions:$('longOptions'),beatOptions:$('beatOptions'),calmOptions:$('calmOptions'),autoFlowTip:$('autoFlowTip'),
 flowTrack:$('flowTrack'),breathTask:$('breathTask'),holdTrack:$('holdTrack'),holdFill:$('holdFill'),
 nextOverlay:$('nextOverlay'),nextArt:$('nextArt'),nextMessage:$('nextMessage'),nextDescription:$('nextDescription'),nextCountdown:$('nextCountdown'),
 durationBtns:[...document.querySelectorAll('#longDuration button')],beatBtns:[...document.querySelectorAll('#beatSpeed button')],calmBtns:[...document.querySelectorAll('#calmPresets button')],calmRoundBtns:[...document.querySelectorAll('#calmRounds button')],
 micButton:$('micButton'),statusNote:$('statusNote'),runningTip:$('runningTip'),
 winTitle:$('winTitle'),winDescription:$('winDescription'),playAgain:$('playAgain'),chooseAgain:$('chooseAgain'),
 sensitivity:$('sensitivity'),sensitivityName:$('sensitivityName'),voiceSelect:$('voiceSelect'),voiceAvailability:$('voiceAvailability'),voiceDetail:$('voiceDetail'),
 micDetail:$('micDetail'),demoBtn:$('demoBtn'),teacher:$('teacherPanel'),autoNext:$('autoNext'),pauseLength:$('pauseLength'),recalibrate:$('recalibrate'),inputDiagnostic:$('inputDiagnostic'),colorHelp:$('colorHelp')
};
const ACTS=[
 {title:'깃털',icon:'🪶',blows:2,hold:1.00,tip:'깃털을 오른쪽 별로 보내요!',goal:'🪶 불면 깃털이 오른쪽으로 가요',earned:'깃털이 앞으로 갔어!'},
 {title:'꽃 피우기',icon:'🌼',blows:3,hold:1.15,tip:'후~ 불고 쉬면 꽃이 하나씩 피어요!',goal:'🌱 바람 한 번에 꽃 한 송이!',earned:'꽃 한 송이가 피었어!'},
 {title:'바람개비',icon:'🌻',blows:2,hold:1.20,tip:'후~ 불면 바람개비만 빙글빙글!',goal:'🌻 불면 바람개비가 돌아요',earned:'바람개비가 돌았어!'},
 {title:'촛불',icon:'🕯️',blows:2,hold:1.10,tip:'촛불은 그대로, 불꽃만 살랑!',goal:'🕯️ 불꽃만 살짝 흔들어 봐요',earned:'불꽃이 살짝 흔들렸어!'}
];
const CALM={
 flower:{icon:'🌷',decor:'🌷　🕯️',title:'꽃향기와 촛불',inhale:3000,exhale:4000,inhaleText:'꽃향기를 맡는 것처럼 편안히 들이쉬어요',exhaleText:'촛불이 흔들릴 만큼 살살 내쉬어요'},
 balloon:{icon:'🎈',decor:'🎈　🎈',title:'풍선 배 호흡',inhale:3000,exhale:5000,inhaleText:'배를 편안하게 부풀려요',exhaleText:'배가 천천히 내려가요'},
 star:{icon:'⭐',decor:'✨　⭐　✨',title:'별빛 호흡',inhale:2500,exhale:3500,inhaleText:'별빛을 따라 들이쉬어요',exhaleText:'반짝이며 천천히 내쉬어요'},
 wave:{icon:'🌊',decor:'🌊　🐚　🌊',title:'파도 호흡',inhale:3000,exhale:4500,inhaleText:'파도가 다가올 때 들이쉬어요',exhaleText:'파도가 멀어질 때 천천히 내쉬어요'},
 leaf:{icon:'🍃',decor:'🍂　🍃　🍂',title:'나뭇잎 호흡',inhale:2500,exhale:4500,inhaleText:'나뭇잎이 올라갈 때 들이쉬어요',exhaleText:'나뭇잎이 내려올 때 천천히 내쉬어요'}
};
const S={
 screen:'home',mode:'strength',playing:false,demo:false,muted:false,
 microphone:null,context:null,analyser:null,samples:null,frame:0,token:0,lastFrame:0,
 calibratingUntil:0,calibration:[],noiseFloor:.006,reference:.22,hasReference:false,
 raw:0,level:0,band:'idle',voice:false,voiceURI:'auto',voices:[],sensitivity:3,
 displayBand:'idle',pendingBand:'idle',pendingBandFor:0,voiceEvidence:0,inputPercent:0,diagnosticFrames:0,
 holdTarget:2,holdTime:0,gapTime:0,windAngle:0,longCompleted:0,longAwaitRelease:false,longReleasedFor:0,longRest:0,longCelebrating:false,readyUntil:0,
 autoTimer:0,autoRaf:0,autoEndAt:0,calmPreset:'flower',calmRunning:false,calmPaused:false,calmStartedAt:0,calmElapsed:0,calmCycles:3,calmCompleted:0,calmEarly:false,calmCueKey:'',
 actIndex:0,blowCount:0,blowHold:0,needsRelease:false,releaseTime:0,intermission:false,
 bpmPeriod:1900,beatStart:0,beatScore:0,beatHold:0,lastSlot:-1,slotCredited:false,beatReady:false
};
function show(where){
 S.screen=where;
 el.home.hidden=where!=='home';el.play.hidden=where!=='play';el.win.hidden=where!=='win';
}
/* Exactly the voice policy used by Moa Rescue: Google Korean online first,
   original rate and pitch, no generic Korean adult voice substitution. */
function voiceIsGoogle(v){
 const lang=String(v.lang||'').replace('_','-');
 const name=String(v.name||'')+' '+String(v.voiceURI||'');
 return /^ko(?:-|$)/i.test(lang)&&/(google|구글)/i.test(name);
}
function voiceSelected(){
 const direct=S.voices.find(v=>v.voiceURI===S.voiceURI);
 if(direct)return direct;
 return [...S.voices].sort((a,b)=>{
  const online=v=>v.localService===false||/online|온라인|network/i.test(v.name+' '+v.voiceURI);
  return Number(online(b))-Number(online(a))||String(a.name).localeCompare(String(b.name),'ko');
 })[0]||null;
}
function refreshVoices(){
 const engine=window.speechSynthesis;
 S.voices=engine?.getVoices?engine.getVoices().filter(voiceIsGoogle):[];
 const chosen=voiceSelected();
 if(typeof Option!=='undefined'){
  el.voiceSelect.replaceChildren(new Option('Google 한국어 · 자동 추천','auto'));
  S.voices.forEach(v=>el.voiceSelect.add(new Option(v.name+(v.localService?' · 기기':' · 온라인'),v.voiceURI)));
  el.voiceSelect.value=S.voices.some(v=>v.voiceURI===S.voiceURI)?S.voiceURI:'auto';
 }
 el.voiceDetail.textContent=chosen?'🌼 실제 선택된 목소리: '+chosen.name+(chosen.localService?' · 기기':' · 온라인'):'이 기기에서는 Google 한국어 음성을 찾지 못했어요. 일반 성인 목소리로 자동 바꾸지 않아요.';
 el.voiceAvailability.textContent=chosen?'🔊 모아 구조대와 같은 Google 한국어: '+chosen.name:'🔇 Google 한국어 목소리가 없어요. 시각 게임은 계속할 수 있어요.';
 el.voicePreview.disabled=!chosen;el.previewBtn.disabled=!chosen;
}
function speech(text,force=false){
 if(S.muted||!window.speechSynthesis||typeof SpeechSynthesisUtterance==='undefined')return false;
 if(S.playing&&!force)return false;
 if(!S.voices.length)refreshVoices();
 const v=voiceSelected();if(!v)return false;
 try{
  const synth=window.speechSynthesis;synth.cancel();
  const utterance=new SpeechSynthesisUtterance(String(text));
  utterance.lang='ko-KR';utterance.voice=v;
  utterance.rate=1;utterance.pitch=1;utterance.volume=.95;
  utterance.onerror=e=>{if(!['interrupted','canceled'].includes(e.error))el.voiceAvailability.textContent='Google 목소리 재생에 실패했어요. 브라우저와 인터넷 연결을 확인해주세요.'};
  synth.speak(utterance);return true;
 }catch(e){el.voiceAvailability.textContent='Google 한국어 음성 재생에 실패했어요.';return false}
}
function speakPreview(){if(S.playing){el.statusNote.textContent='마이크를 멈춘 다음 음성을 들어보세요.';return}speech('안녕! 나 모아야! 살살 불고, 쉬고, 다시 후~! 우리 같이 해볼까?',true)}
function stopAll(){
 S.token++;
 if(S.autoTimer){clearTimeout(S.autoTimer);S.autoTimer=0}
 if(S.autoRaf){cancelAnimationFrame(S.autoRaf);S.autoRaf=0}
 S.autoEndAt=0;
 el.nextOverlay.hidden=true;el.runningTip.hidden=true;el.play.classList.remove('is-running');
 S.calmRunning=false;S.calmPaused=false;
 if(S.frame){cancelAnimationFrame(S.frame);S.frame=0}
 if(S.microphone){for(const t of S.microphone.getTracks())t.stop();S.microphone=null}
 if(S.context){try{S.context.close().catch(()=>{})}catch(e){}S.context=null}
 S.analyser=null;S.samples=null;S.playing=false;S.demo=false;S.lastFrame=0;
 el.micButton.disabled=false;el.micButton.hidden=false;el.micButton.textContent='🎤 마이크 켜기';
 el.micDetail.textContent='마이크 미연결 · 녹음·업로드·저장 없음';
}
function resetRuntime(){
 S.holdTime=0;S.gapTime=0;S.longCompleted=0;S.longAwaitRelease=false;S.longReleasedFor=0;S.longRest=0;S.longCelebrating=false;S.readyUntil=0;S.actIndex=0;S.blowCount=0;S.blowHold=0;S.needsRelease=false;S.releaseTime=0;S.intermission=false;
 S.windAngle=0;S.calmCompleted=0;S.calmEarly=false;S.calmCueKey='';S.calmElapsed=0;S.calmRunning=false;S.calmPaused=false;S.calmStartedAt=0;
 el.nextOverlay.hidden=true;el.holdFill.style.width='0%';
 S.beatScore=0;S.beatHold=0;S.beatStart=0;S.lastSlot=-1;S.slotCredited=false;S.beatReady=false;S.band='idle';S.level=0;S.displayBand='idle';S.pendingBand='idle';S.pendingBandFor=0;S.voiceEvidence=0;
 el.meterFill.style.width='0%';el.duration.innerHTML='0.0 <small>초</small>';
 renderMode();renderLevel(0,'idle');
}
function renderFlowerProgress(){
 // Flowers bloom ONLY when a counted breath finishes and the child rests.
 // They never slide sideways or imitate a feather.
 const flowers=['🌼','🌸','🌷'];
 el.flowerBlooms.forEach((item,i)=>{
  const bloomed=S.actIndex>1||(S.actIndex===1&&S.blowCount>i);
  item.textContent=bloomed?flowers[i]:'🌱';
  item.classList.toggle('bloomed',bloomed);
 });
 el.flowerResult.textContent=S.actIndex===1&&S.blowCount>0
  ?'🌼 꽃 '+S.blowCount+'송이 피었어!'
  :'후~ 불고 쉬면 꽃이 피어요!';
}
function updateStrengthVisual(level,dt=0){
 if(S.mode!=='strength')return;
 // Only the object named by the stage moves.
 el.windLine.style.opacity=(.15+Math.min(level,.8)*.55).toFixed(2);
 el.windLine.style.transform='translateX('+Math.round(level*25)+'px)';
 if(S.actIndex===0){
  el.feather.style.left=(18+level*50).toFixed(1)+'%';
  el.feather.style.transform='translate(-50%,-50%) rotate('+(-15+level*22).toFixed(1)+'deg)';
 }else if(S.actIndex===2){
  // No autonomous looping: the rotor advances strictly with detected input.
  const speed=level<.05?0:level*205;
  S.windAngle=(S.windAngle+speed*dt)%360;
  el.pinwheelWheel.style.transform='rotate('+S.windAngle.toFixed(1)+'deg)';
 }else if(S.actIndex===3){
  // Candle body stays fixed; ONLY the flame bends with the strength.
  const tilt=level*34;
  el.candleFlame.style.transform='rotate('+tilt.toFixed(1)+'deg)';
 }
}
function renderMode(){
 el.calmEnough.hidden=S.mode!=='calm';
 el.modeTitle.textContent=({strength:'바람의 힘',long:'오래 후~',beat:'박자 바람',calm:'숨 고르기'})[S.mode];
 el.modeEmoji.textContent=({strength:'🪶',long:'🎈',beat:'🎶',calm:'🌷'})[S.mode];
 el.scene.dataset.mode=S.mode;el.play.dataset.mode=S.mode;
 el.strengthScene.hidden=S.mode!=='strength';el.longScene.hidden=S.mode!=='long';el.beatScene.hidden=S.mode!=='beat';el.calmScene.hidden=S.mode!=='calm';
 el.strengthOptions.hidden=S.mode!=='strength';el.longOptions.hidden=S.mode!=='long';el.beatOptions.hidden=S.mode!=='beat';el.calmOptions.hidden=S.mode!=='calm';
 el.micButton.hidden=false;
 el.micButton.textContent=S.mode==='calm'?(S.calmRunning?'⏸ 잠깐 쉬기':S.calmPaused?'▶ 다시 이어하기':'▶ 숨놀이 시작'):S.playing?'⏸ 마이크 멈추기':'🎤 마이크 다시 켜기';
 if(S.mode==='strength'){
  const a=ACTS[S.actIndex];
  el.strengthStep.textContent=a.icon+' '+a.title+' · '+(S.actIndex+1)+'/4';
  el.strengthStamps.textContent=Array.from({length:a.blows},(_,i)=>i<S.blowCount?'🌼':'⚪').join(' ');
  el.mainHint.textContent=S.intermission?'🎉 성공! '+a.earned:a.tip;
  el.flowTrack.hidden=false;el.breathTask.hidden=false;el.holdTrack.hidden=false;
  [...el.flowTrack.children].forEach((x,i)=>{x.classList.toggle('current',i===S.actIndex);x.classList.toggle('done',i<S.actIndex)});
  el.breathTask.textContent='🌬️ '+(S.blowCount+1)+' / '+a.blows+'번 · 부드럽게 불어봐!';
  el.holdFill.style.width='0%';
  el.sceneGoal.textContent=a.goal;
  el.strengthStages.forEach((stage,i)=>{stage.hidden=i!==S.actIndex});
  renderFlowerProgress();
 }else if(S.mode==='long'){
  el.flowTrack.hidden=true;el.breathTask.hidden=true;el.holdTrack.hidden=true;
  el.targetDuration.textContent=S.holdTarget+'초 동안 부드럽게!';
  el.mainHint.textContent='코로 편안히 숨을 들이쉬고, 후~';
  el.duration.innerHTML=S.holdTime.toFixed(1)+' <small>초</small>';
  el.longProgress.textContent='🌱 '+(S.longCompleted+1)+' / 2번 도전';
 }else if(S.mode==='beat'){
  el.flowTrack.hidden=true;el.breathTask.hidden=true;el.holdTrack.hidden=true;
  el.mainHint.textContent='준비 → 후~! 빛나는 박자에 맞춰!';
  el.beatCount.textContent=Array.from({length:4},(_,i)=>i<S.beatScore?'🌼':'⚪').join(' ');
 }else{
  el.flowTrack.hidden=true;el.breathTask.hidden=true;el.holdTrack.hidden=true;
  const cfg=CALM[S.calmPreset];
  el.mainHint.textContent=cfg.title+' · 편안하게 '+S.calmCycles+'번';
  el.calmArt.textContent=cfg.icon;el.calmDecor.textContent=cfg.decor;el.calmScene.dataset.preset=S.calmPreset;el.calmScene.dataset.phase='ready';el.calmCue.textContent='편안히 준비!';
  el.calmGarden.textContent=Array.from({length:S.calmCycles},(_,i)=>i<S.calmCompleted?'🌼':'○').join(' ');
  el.calmRound.textContent='1 / '+S.calmCycles;
 }
 el.autoFlowTip.textContent=S.mode==='strength'?'🌼 꽃을 다 모으면 다음 놀이로 자동 이동해요.':S.mode==='calm'?'🌷 마이크 없이 그림을 따라해요. 힘들면 언제든 쉬어요.':'🌿 시작한 뒤에는 목표까지 이어져요.';
}
function chooseMode(mode){
 stopAll();S.mode=mode;show('play');resetRuntime();
 el.teacher.open=false;el.statusNote.textContent=mode==='calm'?'🌷 그림을 따라 편안히 호흡해요.':'🎤 아래 버튼을 눌러 바람을 들려줘!';
 S.reference=.22;S.hasReference=false;S.pendingBand='idle';S.pendingBandFor=0;S.voiceEvidence=0;
}
function finish(){
 stopAll();show('win');
 const titles={strength:'바람꽃이 활짝!',long:'길게 후~ 두 번 성공!',beat:'박자 바람 성공!',calm:S.calmEarly?'오늘은 여기까지!':'숨 고르기 완료!'};
 el.winTitle.textContent=titles[S.mode];el.winDescription.textContent=S.mode==='long'?S.holdTarget+'초 바람 신호를 두 번 이어봤어!':S.mode==='beat'?'네 번의 박자에 맞춰 불었어!':S.mode==='calm'?(S.calmEarly?'편안히 따라가다가 여기에서 멈췄어. 충분해!':'그림을 따라 '+S.calmCycles+'번 호흡 리듬을 살펴봤어.'):'깃털 보내기·꽃 피우기·바람개비 돌리기·불꽃 흔들기를 모두 해냈어!';
 speech('야호! 참 잘했어!',true);
}
function rms(a){let sum=0;for(let i=0;i<a.length;i++)sum+=a[i]*a[i];return Math.sqrt(sum/a.length)}
function voicePattern(a){
 if(!a||a.length<1400)return 0;
 let best=0;
 for(let lag=54;lag<=420;lag+=6){
  let dot=0,e1=0,e2=0;
  for(let i=0;i<930;i+=4){const x=a[i],y=a[i+lag];dot+=x*y;e1+=x*x;e2+=y*y}
  best=Math.max(best,dot/Math.sqrt(e1*e2+1e-12));
 }
 return best;
}
function classify(data){
 const amp=rms(data);
 const periodic=amp>.011?voicePattern(data):0;
 const voiced=amp>.014&&periodic>.67;
 const threshold=Math.max(.008,S.noiseFloor*2.6);
 // Comfortable first blow maps near half-scale. A clearly stronger sound can
 // reach red. Old 3.2x factor over-normalized and often made red unreachable.
 const excess=Math.max(0,amp-threshold);
 if(!voiced&&!S.hasReference&&excess>.020){
  S.reference=clamp(excess*2.05,.095,.48);
  S.hasReference=true;
 }
 const gain=[0,.65,.82,1,1.19,1.42][S.sensitivity]||1;
 const strength=clamp(excess*gain/Math.max(.095,S.reference),0,1);
 return {amp,periodic,voiced,strength:voiced?0:strength};
}
/* Keep feedback readable: a color change needs sustained evidence.
   Hysteresis prevents small noise fluctuations from toggling nearby colors. */
function bandOf(level,voiced){
 if(voiced)return 'voice';
 if(level<.055)return 'idle';
 if(level<.19)return 'weak';
 if(level<.76)return 'good';
 return 'strong';
}
function stableBand(level,voiced,dt){
 S.voiceEvidence=clamp(S.voiceEvidence+(voiced?dt:-dt*2),0,1);
 const sustainedVoice=S.voiceEvidence>=.31;
 let candidate=bandOf(level,sustainedVoice);
 const previous=S.displayBand;
 if(!sustainedVoice){
  if(previous==='good'&&level>=.13&&level<.83)candidate='good';
  if(previous==='strong'&&level>.67)candidate='strong';
  if(previous==='weak'&&level>=.035&&level<.25)candidate='weak';
  if(previous==='idle'&&level<.10)candidate='idle';
 }
 if(candidate===previous){S.pendingBand=candidate;S.pendingBandFor=0;return previous}
 if(candidate!==S.pendingBand){S.pendingBand=candidate;S.pendingBandFor=0}
 S.pendingBandFor+=dt;
 const dwell=candidate==='idle'?.17:candidate==='voice'?.36:.21;
 if(S.pendingBandFor>=dwell){
  S.displayBand=candidate;S.pendingBandFor=0;return candidate;
 }
 return previous;
}
function renderLevel(level,band){
 S.level=level;S.band=band;
 el.scene.dataset.color=band;
 el.meterFill.style.width=Math.round(level*100)+'%';
 el.meterFill.style.background=band==='good'?'var(--green)':band==='strong'?'var(--red)':'var(--blue)';
 el.meter.setAttribute('aria-valuenow',String(Math.round(level*100)));
 const labels={idle:['🌱','후~ 준비!'],weak:['💙','조금만 더~'],good:['💚','지금 좋아!'],strong:['❤️','조금 세! 살살~'],voice:['🗣️','목소리 대신 바람!']};
 const l=labels[band]||labels.idle;
 el.levelIcon.textContent=l[0];el.levelText.textContent=l[1];
 el.legend.forEach((e,i)=>e.classList.toggle('active',['weak','good','strong'][i]===band));
 // Stage-specific motion is handled separately; no flower/candle body is moved.
 el.balloon.style.transform='scale('+(1+level*.18).toFixed(2)+')';
}
function strengthTick(band,dt){
 if(S.intermission)return;
 const stage=ACTS[S.actIndex];
 if(band==='good'){
  if(!S.needsRelease){
   S.blowHold=Math.min(stage.hold,S.blowHold+dt);
   if(S.blowHold>=stage.hold)S.needsRelease=true;
  }
  el.holdFill.style.width=Math.round(S.blowHold/stage.hold*100)+'%';
  el.breathTask.textContent=S.needsRelease?'✅ 이제 잠깐 쉬어요!':'🌬️ 후~ '+Math.max(0,stage.hold-S.blowHold).toFixed(1)+'초 더';
  S.releaseTime=0;
  el.statusNote.textContent=S.needsRelease?'🌼 잘했어! 잠깐 쉬어!':'💚 조금 더 이어서 후~';
 }else if(['weak','idle','voice'].includes(band)){
  S.releaseTime+=dt;
  if(S.needsRelease&&S.releaseTime>=.32){
   S.blowCount++;S.needsRelease=false;S.blowHold=0;S.releaseTime=0;
   el.strengthStamps.textContent=Array.from({length:stage.blows},(_,i)=>i<S.blowCount?'🌼':'⚪').join(' ');
   renderFlowerProgress();
   el.holdFill.style.width='0%';
   el.breathTask.textContent='🌼 '+S.blowCount+' / '+stage.blows+'번 완료!';
   if(S.blowCount>=stage.blows){
    S.intermission=true;el.statusNote.textContent='🌼 '+stage.earned+' 다음 놀이로 가볼까?';
    el.micButton.textContent=S.actIndex===ACTS.length-1?'🎉 완성하기':'▶ 다음 바람';
    // Stop capturing during praise, avoiding microphone hearing speakers.
    if(S.microphone){for(const track of S.microphone.getAudioTracks?.()||[])track.enabled=false}
    S.playing=false;speech(stage.title+' 성공! 잘했어!',true);
    el.mainHint.textContent='🌼 성공! '+stage.earned;
    scheduleNextStrength();
   }else {el.statusNote.textContent='🌼 '+stage.earned+' 다시 후~';el.breathTask.textContent='🌱 좋아! 잠깐 쉬었다가 다시 후~'}
  }else if(!S.needsRelease&&S.releaseTime>.30){S.blowHold=0;el.holdFill.style.width='0%';el.statusNote.textContent='💨 편안하게 후~ 했다가 쉬기!'}
 }else{
  if(!S.needsRelease){S.blowHold=Math.max(0,S.blowHold-dt*2);el.holdFill.style.width=Math.round(S.blowHold/stage.hold*100)+'%'}
  S.releaseTime=0;el.statusNote.textContent='🌱 힘을 조금 줄여볼까?';
 }
}
function longTick(band,dt){
 // 두 번의 편안한 시도 사이에는 바람을 멈추고 쉬는 시간이 있습니다.
 if(S.longCelebrating)return;
 if(S.longAwaitRelease){
  S.longRest+=dt;
  S.longReleasedFor=['idle','weak','voice'].includes(band)?S.longReleasedFor+dt:0;
  el.statusNote.textContent='🌼 첫 번째 성공! 바람을 멈추고 잠깐 쉬어요.';
  el.longProgress.textContent='🌼 1 / 2 완료 · 쉬는 중';
  if(S.longRest>=1.5&&S.longReleasedFor>=.4){
   S.longAwaitRelease=false;S.holdTime=0;S.gapTime=0;
   el.duration.innerHTML='0.0 <small>초</small>';
   el.longProgress.textContent='🌱 2 / 2번 도전';
   el.statusNote.textContent='🌬️ 준비되면 두 번째 후~!';
  }
  return;
 }
 if(band==='good'){
  S.gapTime=0;S.holdTime+=dt;el.statusNote.textContent='💚 좋아, 그 바람으로 쭉~';
 }else if(['idle','weak','voice'].includes(band)){
  S.gapTime+=dt;if(S.gapTime>.42){S.holdTime=0;el.statusNote.textContent='🌱 괜찮아! 다시 천천히 시작!'}
 }else{
  S.gapTime+=dt;if(S.gapTime>.45)S.holdTime=0;
  el.statusNote.textContent='🌿 힘을 살짝 줄이면서 이어봐!';
 }
 el.duration.innerHTML=Math.min(S.holdTime,S.holdTarget).toFixed(1)+' <small>초</small>';
 if(S.holdTime>=S.holdTarget){
  S.longCompleted++;
  if(S.longCompleted===1){
   S.longAwaitRelease=true;S.longRest=0;S.longReleasedFor=0;
   el.longProgress.textContent='🌼 1 / 2 완료 · 쉬는 중';
  }else{
   S.longCelebrating=true;S.playing=false;
   el.longProgress.textContent='🌼 🌼 두 번 모두 성공!';
   el.statusNote.textContent='🎉 두 번 성공! 잠시 후 완성 화면이 나와요.';
   if(S.microphone)for(const t of S.microphone.getAudioTracks?.()||[])t.enabled=false;
   const token=S.token;
   S.autoTimer=setTimeout(()=>{S.autoTimer=0;if(S.screen==='play'&&S.mode==='long'&&S.token===token)finish()},2800);
  }
 }
}
function beatTick(band,dt,now){
 // One 0.85–1.15s visible exhale window, followed by a clearly visible rest window.
 // Four on-beat exhalations; continuous blowing across rests does NOT score another beat.
 const period=S.bpmPeriod,elapsed=Math.max(0,now-S.beatStart),slot=Math.floor(elapsed/period);
 const phase=(elapsed%period)/period,blow=phase>=.22&&phase<.72;
 if(slot!==S.lastSlot){S.lastSlot=slot;S.slotCredited=false;S.beatHold=0;S.beatReady=(band==='idle'||band==='weak')}
 el.beatOrb.classList.toggle('blow',blow);
 el.beatEmoji.textContent=blow?'🌬️':'🌱';
 el.beatCue.textContent=blow?'후~!':'준비!';
 if(!blow){
  if(band==='idle'||band==='weak')S.beatReady=true;
  S.beatHold=0;
  el.statusNote.textContent='🌱 잠깐 쉬고, 초록빛이 켜지면 후~';
 }else if(!S.slotCredited&&S.beatReady){
  if(band==='good'){
   S.beatHold+=dt;
   el.statusNote.textContent='💚 딱 맞았어! 이어서 후~';
   if(S.beatHold>=.28){
    S.slotCredited=true;S.beatScore++;S.beatHold=0;
    el.beatCount.textContent=Array.from({length:4},(_,i)=>i<S.beatScore?'🌼':'⚪').join(' ');
    if(S.beatScore===4){finish();return}
   }
  }else{
   S.beatHold=0;
   el.statusNote.textContent=band==='strong'?'🌿 조금 약하게~':'🌬️ 초록빛에서 후~';
  }
 }else el.statusNote.textContent='🌼 좋아! 다음 박자를 기다려!';
}

function calmTick(now){
 if(!S.calmRunning||S.screen!=='play')return;
 const cfg=CALM[S.calmPreset],span=cfg.inhale+cfg.exhale;
 const elapsed=Math.max(0,now-S.calmStartedAt);
 const cycle=Math.floor(elapsed/span);
 S.calmCompleted=Math.min(cycle,S.calmCycles);
 el.calmGarden.textContent=Array.from({length:S.calmCycles},(_,i)=>i<S.calmCompleted?'🌼':'○').join(' ');
 if(cycle>=S.calmCycles){
  S.calmRunning=false;finish();return;
 }
 const phase=elapsed%span,inhale=phase<cfg.inhale;
 const remainder=inhale?cfg.inhale-phase:span-phase;
 const progress=inhale?phase/cfg.inhale:1-(phase-cfg.inhale)/cfg.exhale;
 el.calmCircle.style.transform='scale('+(0.78+progress*.23).toFixed(3)+')';
 el.calmCircle.dataset.phase=inhale?'in':'out';el.calmScene.dataset.phase=inhale?'in':'out';
 const cueKey=cycle+':'+(inhale?'in':'out');
 if(S.calmCueKey!==cueKey){S.calmCueKey=cueKey;speech(inhale?'편안히 들이쉬어요':'천천히 내쉬어요');}
 el.calmArt.textContent=cfg.icon;
 el.calmCue.textContent=(inhale?'들이쉬기':'내쉬기')+' '+Math.max(1,Math.ceil(remainder/1000));
 el.calmRound.textContent=(cycle+1)+' / '+S.calmCycles;
 el.statusNote.textContent=inhale?cfg.inhaleText:cfg.exhaleText;
 S.frame=requestAnimationFrame(tick);
}
function startOrPauseCalm(){
 if(S.calmRunning){
  S.calmElapsed=Math.max(0,performance.now()-S.calmStartedAt);
  S.calmRunning=false;S.calmPaused=true;
  if(S.frame){cancelAnimationFrame(S.frame);S.frame=0}
  el.micButton.textContent='▶ 다시 이어하기';
  el.statusNote.textContent='쉬어도 괜찮아. 준비되면 이어가기!';
  el.runningTip.hidden=true;el.play.classList.remove('is-running');
  return;
 }
 if(S.calmPaused){
  S.calmStartedAt=performance.now()-S.calmElapsed;
 }else{
  S.calmElapsed=0;S.calmStartedAt=performance.now()+700;
 }
 S.calmRunning=true;S.calmPaused=false;S.lastFrame=0;
 if(!S.calmElapsed)S.calmCueKey='';
 el.micButton.textContent='⏸ 잠깐 쉬기';
 el.statusNote.textContent='편안한 자세로 그림을 따라해요.';
 el.runningTip.hidden=false;el.play.classList.add('is-running');
 S.frame=requestAnimationFrame(tick);
}
function updateAutoCountdown(){
 if(!S.intermission||S.screen!=='play'||!S.autoEndAt)return;
 const remaining=Math.max(0,Math.ceil((S.autoEndAt-performance.now())/1000));
 el.nextCountdown.textContent=remaining>0?remaining+'초 후 자동으로 다음 놀이!':'다음 놀이를 준비해요!';
 el.autoFlowTip.textContent='🌼 '+el.nextCountdown.textContent;
 S.autoRaf=requestAnimationFrame(updateAutoCountdown);
}
function nextStrengthStage(){
 if(!S.intermission||S.screen!=='play'||S.mode!=='strength')return false;
 if(S.autoTimer){clearTimeout(S.autoTimer);S.autoTimer=0}
 if(S.autoRaf){cancelAnimationFrame(S.autoRaf);S.autoRaf=0}
 S.autoEndAt=0;el.nextOverlay.hidden=true;
 el.micButton.hidden=false;el.runningTip.hidden=false;el.play.classList.add('is-running');
 if(S.actIndex===ACTS.length-1){finish();return true}
 S.actIndex++;S.blowCount=0;S.blowHold=0;S.needsRelease=false;
 S.releaseTime=0;S.intermission=false;S.windAngle=0;
 if(S.microphone){for(const tr of S.microphone.getAudioTracks?.()||[])tr.enabled=true}
 S.playing=Boolean(S.microphone);S.lastFrame=0;
 renderMode();el.statusNote.textContent='🌬️ 다음 놀이야! 천천히 해봐.';
 try{window.speechSynthesis?.cancel()}catch(e){}
 if(S.playing){S.frame=requestAnimationFrame(tick)}else startMic();
 return true;
}
function scheduleNextStrength(){
 const a=ACTS[S.actIndex];
 el.nextOverlay.hidden=false;el.runningTip.hidden=true;el.play.classList.remove('is-running');
 el.nextArt.textContent=a.icon;
 el.nextMessage.textContent=a.earned;
 el.nextDescription.textContent=S.actIndex===ACTS.length-1?'네 가지 놀이를 다 해냈어!':'다음은 '+ACTS[S.actIndex+1].title+'!';
 el.micButton.hidden=false;
 el.micButton.textContent=S.actIndex===ACTS.length-1?'▶ 완성 화면 보기':'▶ 다음 놀이';
 if(!el.autoNext.checked){
  el.nextCountdown.textContent='준비되면 아래 버튼을 눌러요.';
  el.autoFlowTip.textContent='🌼 지금은 잠깐 쉬는 시간! 아래 버튼으로 이어가기.';
  return;
 }
 // During automatic transitions, remove the competing next-button affordance.
 el.micButton.hidden=true;
 const token=S.token;
 const delay=Math.max(6000,Number(el.pauseLength.value)||8000);
 S.autoEndAt=performance.now()+delay;
 if(S.autoRaf)cancelAnimationFrame(S.autoRaf);
 S.autoRaf=requestAnimationFrame(updateAutoCountdown);
 S.autoTimer=setTimeout(()=>{
  S.autoTimer=0;
  if(S.token!==token||S.screen!=='play'||!S.intermission)return;
  nextStrengthStage();
 },delay);
}
function tick(now){
 if(S.screen!=='play')return;
 if(S.mode==='calm'){calmTick(now);return}
 if(!(S.playing||S.demo))return;
 const dt=clamp(S.lastFrame?now-S.lastFrame:0,0,85)/1000;
 S.lastFrame=now;
 if(S.playing&&now<S.calibratingUntil){
  S.analyser.getFloatTimeDomainData(S.samples);
  S.calibration.push(rms(S.samples));
  renderLevel(0,'idle');el.statusNote.textContent='🤫 잠깐 조용히 기다려줘!';
  S.frame=requestAnimationFrame(tick);return;
 }
 if(S.playing&&S.calibration.length){
  S.calibration.sort((a,b)=>a-b);
  S.noiseFloor=S.calibration[Math.floor(S.calibration.length*.65)]||.006;
  S.calibration=[];
  el.micDetail.textContent='🎤 마이크 연결됨 · 바람 소리만 기기에서 분석 · 저장 없음';
  // Anchor the beat clock after mic warm-up, not when permission dialog opens.
  if(S.mode==='beat')S.beatStart=now+800;
 }
 if(S.playing&&now<S.readyUntil){renderLevel(0,'idle');el.statusNote.textContent='🌱 그림을 보고 준비해요. 잠시 후 후~!';S.frame=requestAnimationFrame(tick);return}
 let level=0,voiced=false;
 if(S.demo){
  level=.1+.46*(.5+.5*Math.sin(now/550));
 }else{
  S.analyser.getFloatTimeDomainData(S.samples);
  const c=classify(S.samples);
  voiced=c.voiced;
  // Time-aware envelope smoothing works consistently on 60/120Hz displays.
  const tau=c.strength>S.level?.19:.33;
  const alpha=dt>0?1-Math.exp(-dt/tau):.26;
  level=S.level+(c.strength-S.level)*alpha;
  S.inputPercent=Math.round(c.strength*100);
  if(++S.diagnosticFrames%12===0)el.inputDiagnostic.textContent='현재 상대적인 소리 강도 '+S.inputPercent+'% · 민감도 '+S.sensitivity+'/5';
 }
 const band=stableBand(level,voiced,dt);
 renderLevel(level,band);
 updateStrengthVisual(level,dt);
 if(!S.demo&&dt){
  if(S.mode==='strength')strengthTick(band,dt);
  if(S.mode==='long')longTick(band,dt);
  if(S.mode==='beat')beatTick(band,dt,now);
 }
 if((S.playing||S.demo)&&!S.intermission&&S.screen==='play')S.frame=requestAnimationFrame(tick);
}
async function startMic(){
 if(S.mode==='calm'){startOrPauseCalm();return}
 if(S.playing){stopAll();el.statusNote.textContent='마이크를 멈췄어요.';return}
 if(S.intermission){nextStrengthStage();return}
 stopAll();
 const token=S.token;
 el.micButton.disabled=true;el.statusNote.textContent='🎤 마이크 연결 중…';
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('getUserMedia is unavailable');
  const mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
  if(token!==S.token){for(const t of mic.getTracks())t.stop();return}
  S.microphone=mic;
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)throw Error('WebAudio not available');
  const context=new AC();S.context=context;await context.resume();
  if(token!==S.token)return;
  const analyser=context.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=0;
  context.createMediaStreamSource(mic).connect(analyser);
  S.analyser=analyser;S.samples=new Float32Array(analyser.fftSize);
  S.playing=true;S.demo=false;S.calibratingUntil=performance.now()+800;S.readyUntil=S.calibratingUntil+1800;S.lastFrame=0;S.calibration=[];
  el.runningTip.hidden=false;el.play.classList.add('is-running');
  S.noiseFloor=.006;S.reference=.22;S.hasReference=false;S.level=0;S.displayBand='idle';S.pendingBand='idle';S.pendingBandFor=0;S.voiceEvidence=0;S.diagnosticFrames=0;
  if(S.mode==='beat')S.beatStart=0;
  el.micButton.textContent='■ 마이크 멈춤';el.micDetail.textContent='잠깐 조용히 · 마이크 주변 소리 확인 중';
  try{window.speechSynthesis?.cancel()}catch(e){}
  S.frame=requestAnimationFrame(tick);
 }catch(e){
  stopAll();
  el.statusNote.textContent=e?.name==='NotAllowedError'?'마이크 사용 권한을 허용해 주세요.':'마이크를 연결하지 못했어요. 브라우저 설정을 확인해 주세요.';
  el.micDetail.textContent=String(e?.name||e?.message||'마이크 오류');
 }finally{el.micButton.disabled=false}
}
function restart(){
 const mode=S.mode;stopAll();S.mode=mode;show('play');resetRuntime();
 el.statusNote.textContent=S.mode==='calm'?'▶ 숨놀이를 시작해요.':'🎤 준비됐으면 다시 시작해요!';
}
function demo(){
 if(S.mode==='calm'){startOrPauseCalm();return}
 if(S.playing){el.micDetail.textContent='마이크를 끈 뒤 화면 체험을 시작해 주세요.';return}
 if(S.demo){stopAll();return}
 if(S.screen==='home')chooseMode('strength');
 S.demo=true;S.lastFrame=0;el.micButton.textContent='🧪 색깔 체험 중';
 el.micDetail.textContent='🧪 시각 체험 모드 — 실제 바람을 인식하지 않습니다.';
 S.frame=requestAnimationFrame(tick);
}
el.chooseStrength.addEventListener('click',()=>{chooseMode('strength');startMic()});
el.chooseLong.addEventListener('click',()=>{chooseMode('long');startMic()});
el.chooseBeat.addEventListener('click',()=>{chooseMode('beat');startMic()});
el.chooseCalm.addEventListener('click',()=>{chooseMode('calm');startOrPauseCalm()});
el.back.addEventListener('click',()=>{stopAll();show('home')});
el.restart.addEventListener('click',restart);
el.playAgain.addEventListener('click',()=>{const mode=S.mode;chooseMode(mode);if(mode==='calm')startOrPauseCalm();else startMic();});
el.chooseAgain.addEventListener('click',()=>{stopAll();show('home')});
el.micButton.addEventListener('click',startMic);
el.voicePreview.addEventListener('click',speakPreview);
el.previewBtn.addEventListener('click',speakPreview);
el.mute.addEventListener('click',()=>{S.muted=!S.muted;el.mute.textContent=S.muted?'🔇':'♫';if(S.muted)try{window.speechSynthesis?.cancel()}catch(e){}});
el.durationBtns.forEach(btn=>btn.addEventListener('click',()=>{
 S.holdTarget=Number(btn.dataset.seconds);el.durationBtns.forEach(x=>x.classList.toggle('selected',x===btn));S.holdTime=0;S.gapTime=0;S.longCompleted=0;S.longAwaitRelease=false;S.longReleasedFor=0;S.longRest=0;S.longCelebrating=false;renderMode()
}));
el.calmEnough.addEventListener('click',()=>{S.calmEarly=true;finish()});
el.calmRoundBtns.forEach(btn=>btn.addEventListener('click',()=>{
 const wasRunning=S.calmRunning;
 S.calmCycles=Number(btn.dataset.rounds)||3;
 el.calmRoundBtns.forEach(x=>x.classList.toggle('selected',x===btn));
 if(S.frame){cancelAnimationFrame(S.frame);S.frame=0}
 S.calmElapsed=0;S.calmRunning=false;S.calmPaused=false;S.calmCompleted=0;S.calmEarly=false;S.calmCueKey='';
 renderMode();
 // An active exercise restarts automatically when a teacher changes its repetitions.
 // The child never needs a second, unexplained Start tap.
 if(wasRunning)startOrPauseCalm();
 else el.statusNote.textContent='🌱 준비되면 숨놀이를 시작해요.';
}));
el.calmBtns.forEach(btn=>btn.addEventListener('click',()=>{
 S.calmPreset=CALM[btn.dataset.calm]?btn.dataset.calm:'flower';
 el.calmBtns.forEach(x=>x.classList.toggle('selected',x===btn));
 if(S.frame){cancelAnimationFrame(S.frame);S.frame=0}
 S.calmElapsed=0;S.calmRunning=false;S.calmPaused=false;S.calmCompleted=0;S.calmEarly=false;S.calmCueKey='';
 renderMode();startOrPauseCalm();
}));
el.beatBtns.forEach(btn=>btn.addEventListener('click',()=>{
 S.bpmPeriod=btn.dataset.beat==='slow'?1900:1450;el.beatBtns.forEach(x=>x.classList.toggle('selected',x===btn));
 S.beatScore=0;S.beatHold=0;S.lastSlot=-1;S.beatStart=performance.now()+800;renderMode()
}));
el.sensitivity.addEventListener('input',()=>{S.sensitivity=Number(el.sensitivity.value);el.sensitivityName.textContent=['','아주 둔감','둔감','보통','민감','아주 민감'][S.sensitivity]});
el.recalibrate.addEventListener('click',()=>{
 S.hasReference=false;S.reference=.22;S.level=0;S.displayBand='idle';S.pendingBand='idle';S.pendingBandFor=0;S.voiceEvidence=0;
 el.inputDiagnostic.textContent='기준 초기화됨 · 평소처럼 편안하게 후~';
 if(S.screen==='play'){S.blowHold=0;S.needsRelease=false;S.releaseTime=0;S.holdTime=0;S.gapTime=0;}
});
el.voiceSelect.addEventListener('change',()=>{S.voiceURI=el.voiceSelect.value;refreshVoices();if(!S.playing)speakPreview()});
el.demoBtn.addEventListener('click',demo);
el.autoNext.addEventListener('change',()=>{
 if(!S.intermission)return;
 if(S.autoTimer){clearTimeout(S.autoTimer);S.autoTimer=0}
 if(S.autoRaf){cancelAnimationFrame(S.autoRaf);S.autoRaf=0}
 S.autoEndAt=0;
 scheduleNextStrength();
});
el.pauseLength.addEventListener('change',()=>{
 if(!S.intermission)return;
 if(S.autoTimer){clearTimeout(S.autoTimer);S.autoTimer=0}
 if(S.autoRaf){cancelAnimationFrame(S.autoRaf);S.autoRaf=0}
 S.autoEndAt=0;
 scheduleNextStrength();
});
window.addEventListener('pagehide',stopAll);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&S.playing)stopAll()});
if(window.speechSynthesis?.addEventListener)window.speechSynthesis.addEventListener('voiceschanged',refreshVoices);
refreshVoices();
const directMode=(typeof location!=='undefined'?new URLSearchParams(location.search).get('mode'):null);
if(['strength','long','beat'].includes(directMode))chooseMode(directMode);
else show('home');
})();
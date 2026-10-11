/* 모아의 바람놀이터 — independent child-friendly breathing games.
   Signal level = relative non-tonal microphone SOUND, not physical wind strength, direction
   or medically measured breathing. No audio is saved, transmitted or recorded.
   Gentle, comfortable exhale only; no instruction to force/hyperventilate. */
(()=>{
'use strict';
const $=id=>document.getElementById(id), clamp=(n,a,b)=>Math.max(a,Math.min(n,b));
const el={
 home:$('homeScreen'),play:$('playScreen'),win:$('successScreen'),
 chooseStrength:$('chooseStrength'),chooseLong:$('chooseLong'),chooseBeat:$('chooseBeat'),
 voicePreview:$('voicePreview'),previewBtn:$('previewBtn'),mute:$('muteBtn'),
 modeTitle:$('modeTitle'),modeEmoji:$('modeEmoji'),back:$('backHome'),restart:$('restart'),
 strengthScene:$('strengthScene'),longScene:$('longScene'),beatScene:$('beatScene'),scene:$('scene'),
 feather:$('feather'),windLine:$('windLine'),balloon:$('balloon'),duration:$('duration'),
 targetDuration:$('targetDuration'),beatOrb:$('beatOrb'),beatEmoji:$('beatEmoji'),beatCue:$('beatCue'),beatCount:$('beatCount'),
 mainHint:$('mainHint'),levelIcon:$('levelIcon'),levelText:$('levelText'),meter:$('levelMeter'),meterFill:$('meterFill'),
 legend:[...document.querySelectorAll('.color-legend span')],
 strengthOptions:$('strengthOptions'),strengthStep:$('strengthStep'),strengthStamps:$('strengthStamps'),longOptions:$('longOptions'),beatOptions:$('beatOptions'),
 durationBtns:[...document.querySelectorAll('#longDuration button')],beatBtns:[...document.querySelectorAll('#beatSpeed button')],
 micButton:$('micButton'),statusNote:$('statusNote'),
 winTitle:$('winTitle'),winDescription:$('winDescription'),playAgain:$('playAgain'),chooseAgain:$('chooseAgain'),
 sensitivity:$('sensitivity'),sensitivityName:$('sensitivityName'),voiceSelect:$('voiceSelect'),voiceAvailability:$('voiceAvailability'),voiceDetail:$('voiceDetail'),
 micDetail:$('micDetail'),demoBtn:$('demoBtn'),teacher:$('teacherPanel')
};
const ACTS=[
 {title:'깃털',icon:'🪶',blows:2,hold:.65,tip:'깃털을 살살 움직여봐!'},
 {title:'꽃길',icon:'🌈',blows:3,hold:.75,tip:'꽃길을 알록달록!'},
 {title:'바람개비',icon:'🌻',blows:2,hold:.9,tip:'빙글빙글, 천천히!'},
 {title:'촛불',icon:'🕯️',blows:2,hold:.75,tip:'촛불을 끄지 말고 흔들기!'}
];
const S={
 screen:'home',mode:'strength',playing:false,demo:false,muted:false,
 microphone:null,context:null,analyser:null,samples:null,frame:0,token:0,lastFrame:0,
 calibratingUntil:0,calibration:[],noiseFloor:.006,reference:.4,hasReference:false,
 raw:0,level:0,band:'idle',voice:false,voiceURI:'auto',voices:[],sensitivity:3,
 holdTarget:2,holdTime:0,gapTime:0,
 actIndex:0,blowCount:0,blowHold:0,needsRelease:false,releaseTime:0,intermission:false,
 bpmPeriod:1900,beatStart:0,beatScore:0,beatHold:0,lastSlot:-1,slotCredited:false,beatReady:false
};
function show(where){
 S.screen=where;
 el.home.hidden=where!=='home';el.play.hidden=where!=='play';el.win.hidden=where!=='win';
}
function voiceIsKorean(v){return /^ko([-_]|$)/i.test(String(v.lang||''))||/korean|한국어/i.test(v.name||'')}
function voiceIsGoogle(v){return voiceIsKorean(v)&&/google|구글/i.test((v.name||'')+' '+(v.voiceURI||''))}
function voiceSelected(){return S.voices.find(v=>v.voiceURI===S.voiceURI)||[...S.voices].sort((a,b)=>{
 const score=v=>(voiceIsGoogle(v)?100:0)+(v.localService===false?10:0);
 return score(b)-score(a);
})[0]||null}
function refreshVoices(){
 const engine=window.speechSynthesis;
 S.voices=engine?.getVoices?engine.getVoices().filter(voiceIsKorean):[];
 const chosen=voiceSelected();
 if(typeof Option!=='undefined'){
  el.voiceSelect.replaceChildren(new Option('한국어 자동 선택 · Google 우선','auto'));
  for(const v of S.voices)el.voiceSelect.add(new Option((voiceIsGoogle(v)?'🌼 ':'🎙️ ')+v.name,v.voiceURI));
  el.voiceSelect.value=S.voices.some(v=>v.voiceURI===S.voiceURI)?S.voiceURI:'auto';
 }
 el.voiceDetail.textContent=chosen?(voiceIsGoogle(chosen)?'🌼 Google 한국어 음성 사용 가능':'기기 한국어 음성 사용: '+chosen.name):'목록에 한국어 음성이 없어도 기기 기본 음성 재생을 시도해요.';
 el.voiceAvailability.textContent=chosen?(voiceIsGoogle(chosen)?'🔊 Google 한국어 목소리를 먼저 들어보세요.':'🔊 기기에서 사용 가능한 한국어 음성: '+chosen.name):'🔊 기기 기본 한국어 음성으로 듣기를 시도할 수 있어요.';
}
function speech(text,force=false){
 if(S.muted||!window.speechSynthesis||typeof SpeechSynthesisUtterance==='undefined')return false;
 if(S.playing&&!force)return false;
 try{
  const t=window.speechSynthesis;t.cancel();
  const u=new SpeechSynthesisUtterance(text);u.lang='ko-KR';u.volume=1;u.rate=1;u.pitch=1;
  const v=voiceSelected();if(v)u.voice=v;
  u.onerror=e=>{if(!['canceled','interrupted'].includes(e.error))el.voiceAvailability.textContent='🔇 음성 재생 실패. 브라우저·기기 볼륨을 확인해 주세요.'};
  t.speak(u);return true;
 }catch(e){el.voiceAvailability.textContent='🔇 음성 재생을 지원하지 않아요.';return false}
}
function speakPreview(){if(S.playing){el.statusNote.textContent='마이크를 멈춘 다음 음성을 들어보세요.';return}speech('안녕! 나 모아야! 살살 불고, 쉬고, 다시 후~! 우리 같이 해볼까?',true)}
function stopAll(){
 S.token++;
 if(S.frame){cancelAnimationFrame(S.frame);S.frame=0}
 if(S.microphone){for(const t of S.microphone.getTracks())t.stop();S.microphone=null}
 if(S.context){try{S.context.close().catch(()=>{})}catch(e){}S.context=null}
 S.analyser=null;S.samples=null;S.playing=false;S.demo=false;S.lastFrame=0;
 el.micButton.disabled=false;el.micButton.textContent='🎤 마이크 켜기';
 el.micDetail.textContent='마이크 미연결 · 녹음·업로드·저장 없음';
}
function resetRuntime(){
 S.holdTime=0;S.gapTime=0;S.actIndex=0;S.blowCount=0;S.blowHold=0;S.needsRelease=false;S.releaseTime=0;S.intermission=false;
 S.beatScore=0;S.beatHold=0;S.beatStart=0;S.lastSlot=-1;S.slotCredited=false;S.beatReady=false;S.band='idle';S.level=0;
 el.meterFill.style.width='0%';el.duration.innerHTML='0.0 <small>초</small>';
 renderMode();renderLevel(0,'idle');
}
function renderMode(){
 el.modeTitle.textContent=({strength:'바람의 힘',long:'오래 후~',beat:'박자 바람'})[S.mode];
 el.modeEmoji.textContent=({strength:'🪶',long:'🎈',beat:'🎶'})[S.mode];
 el.scene.dataset.mode=S.mode;
 el.strengthScene.hidden=S.mode!=='strength';el.longScene.hidden=S.mode!=='long';el.beatScene.hidden=S.mode!=='beat';
 el.strengthOptions.hidden=S.mode!=='strength';el.longOptions.hidden=S.mode!=='long';el.beatOptions.hidden=S.mode!=='beat';
 el.micButton.textContent=S.playing?'■ 마이크 멈춤':'🎤 마이크 켜기';
 if(S.mode==='strength'){
  const a=ACTS[S.actIndex];el.feather.textContent=a.icon;el.strengthStep.textContent=a.icon+' '+a.title+' · '+(S.actIndex+1)+'/4';
  el.strengthStamps.textContent=Array.from({length:a.blows},(_,i)=>i<S.blowCount?'🌼':'⚪').join(' ');
  el.mainHint.textContent=S.intermission?'🎉 성공! 다음 놀이로!':a.tip;
 }else if(S.mode==='long'){
  el.targetDuration.textContent=S.holdTarget+'초 동안 부드럽게!';
  el.mainHint.textContent='코로 편안히 숨을 들이쉬고, 후~';
  el.duration.innerHTML=S.holdTime.toFixed(1)+' <small>초</small>';
 }else{
  el.mainHint.textContent='준비 → 후~! 빛나는 박자에 맞춰!';
  el.beatCount.textContent=Array.from({length:4},(_,i)=>i<S.beatScore?'🌼':'⚪').join(' ');
 }
}
function chooseMode(mode){
 stopAll();S.mode=mode;show('play');resetRuntime();
 el.teacher.open=false;el.statusNote.textContent='🎤 아래 버튼을 눌러 바람을 들려줘!';
 S.reference=.40;S.hasReference=false;
}
function finish(){
 stopAll();show('win');
 const titles={strength:'바람꽃이 활짝!',long:'길게 후~ 성공!',beat:'박자 바람 성공!'};
 el.winTitle.textContent=titles[S.mode];el.winDescription.textContent=S.mode==='long'?S.holdTarget+'초 동안 편안히 내쉬었어!':S.mode==='beat'?'네 번의 박자에 맞춰 불었어!':'깃털·꽃길·바람개비·촛불 모두 해냈어!';
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
 // Do not map a first soft blow straight to red. A normal blow defines roughly 1/3 scale.
 // Even at the highest sensitivity red requires substantially more energy than that first blow.
 if(!voiced&&!S.hasReference&&amp>threshold+.035){
  S.reference=clamp((amp-S.noiseFloor)*3.2,.38,1.15);
  S.hasReference=true;
 }
 const gain=[0,.6,.82,1,1.15,1.28][S.sensitivity];
 const strength=clamp(Math.max(0,amp-threshold)*gain/S.reference,0,1);
 return {amp,periodic,voiced,strength:voiced?0:strength};
}
function bandOf(strength,voiced){
 if(voiced)return 'voice';
 if(strength<.07)return 'idle';
 if(strength<.20)return 'weak';
 if(strength<=.90)return 'good';
 return 'strong';
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
 el.feather.style.transform='translateX('+Math.round(level*155)+'px) rotate('+(-15+level*30)+'deg)';
 el.windLine.style.transform='translateX('+Math.round(level*70)+'px)';
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
  S.releaseTime=0;
  el.statusNote.textContent=S.needsRelease?'🌼 잘했어! 잠깐 쉬어!':'💚 조금 더 이어서 후~';
 }else if(['weak','idle','voice'].includes(band)){
  S.releaseTime+=dt;
  if(S.needsRelease&&S.releaseTime>=.32){
   S.blowCount++;S.needsRelease=false;S.blowHold=0;S.releaseTime=0;
   el.strengthStamps.textContent=Array.from({length:stage.blows},(_,i)=>i<S.blowCount?'🌼':'⚪').join(' ');
   if(S.blowCount>=stage.blows){
    S.intermission=true;el.statusNote.textContent='🌼 잘했어! 다음 꽃도 만나자!';
    el.micButton.textContent=S.actIndex===ACTS.length-1?'🎉 완성하기':'▶ 다음 바람';
    // Stop capturing during praise, avoiding microphone hearing speakers.
    if(S.microphone){for(const track of S.microphone.getAudioTracks?.()||[])track.enabled=false}
    S.playing=false;speech(stage.title+' 성공! 잘했어!',true);
   }else el.statusNote.textContent='🌼 좋아! 다시 한 번 후~';
  }else if(!S.needsRelease&&S.releaseTime>.30){S.blowHold=0;el.statusNote.textContent='💨 편안하게 후~ 했다가 쉬기!'}
 }else{
  if(!S.needsRelease)S.blowHold=Math.max(0,S.blowHold-dt*2);
  S.releaseTime=0;el.statusNote.textContent='🌱 힘을 조금 줄여볼까?';
 }
}
function longTick(band,dt){
 if(band==='good'){
  S.gapTime=0;S.holdTime+=dt;
  el.statusNote.textContent='💚 좋아, 그 바람으로 쭉~';
 }else if(['idle','weak','voice'].includes(band)){
  S.gapTime+=dt;
  if(S.gapTime>.42){
   S.holdTime=0;
   el.statusNote.textContent='🌱 괜찮아! 다시 천천히 시작!';
  }
 }else{
  S.gapTime+=dt;
  if(S.gapTime>.45)S.holdTime=0;
  el.statusNote.textContent='🌿 힘을 살짝 줄이면서 이어봐!';
 }
 el.duration.innerHTML=Math.min(S.holdTime,S.holdTarget).toFixed(1)+' <small>초</small>';
 if(S.holdTime>=S.holdTarget)finish();
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
function tick(now){
 if(S.screen!=='play'||!(S.playing||S.demo))return;
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
 let level=0,voiced=false;
 if(S.demo){
  level=.1+.46*(.5+.5*Math.sin(now/550));
 }else{
  S.analyser.getFloatTimeDomainData(S.samples);
  const c=classify(S.samples);
  voiced=c.voiced;
  level=voiced?0:(S.level*.68+c.strength*.32);
 }
 const band=bandOf(level,voiced);
 renderLevel(level,band);
 if(!S.demo&&dt){
  if(S.mode==='strength')strengthTick(band,dt);
  if(S.mode==='long')longTick(band,dt);
  if(S.mode==='beat')beatTick(band,dt,now);
 }
 if((S.playing||S.demo)&&!S.intermission&&S.screen==='play')S.frame=requestAnimationFrame(tick);
}
async function startMic(){
 if(S.playing){stopAll();el.statusNote.textContent='마이크를 멈췄어요.';return}
 if(S.intermission){
  if(S.actIndex>=ACTS.length-1){finish();return}
  S.actIndex++;S.blowCount=0;S.blowHold=0;S.needsRelease=false;S.releaseTime=0;S.intermission=false;
  if(S.microphone){for(const track of S.microphone.getAudioTracks?.()||[])track.enabled=true}
  S.playing=Boolean(S.microphone);S.lastFrame=0;
  renderMode();el.statusNote.textContent='🌬️ 다음 꽃도 살살 불어봐!';
  try{window.speechSynthesis?.cancel()}catch(e){}
  if(S.playing){S.frame=requestAnimationFrame(tick);return}
 }
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
  S.playing=true;S.demo=false;S.calibratingUntil=performance.now()+800;S.lastFrame=0;S.calibration=[];
  S.noiseFloor=.006;S.reference=.40;S.hasReference=false;S.level=0;
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
 el.statusNote.textContent='🎤 마이크를 켜고 다시 시작해요!';
}
function demo(){
 if(S.playing){el.micDetail.textContent='마이크를 끈 뒤 화면 체험을 시작해 주세요.';return}
 if(S.demo){stopAll();return}
 if(S.screen==='home')chooseMode('strength');
 S.demo=true;S.lastFrame=0;el.micButton.textContent='🧪 색깔 체험 중';
 el.micDetail.textContent='🧪 시각 체험 모드 — 실제 바람을 인식하지 않습니다.';
 S.frame=requestAnimationFrame(tick);
}
el.chooseStrength.addEventListener('click',()=>chooseMode('strength'));
el.chooseLong.addEventListener('click',()=>chooseMode('long'));
el.chooseBeat.addEventListener('click',()=>chooseMode('beat'));
el.back.addEventListener('click',()=>{stopAll();show('home')});
el.restart.addEventListener('click',restart);
el.playAgain.addEventListener('click',()=>chooseMode(S.mode));
el.chooseAgain.addEventListener('click',()=>{stopAll();show('home')});
el.micButton.addEventListener('click',startMic);
el.voicePreview.addEventListener('click',speakPreview);
el.previewBtn.addEventListener('click',speakPreview);
el.mute.addEventListener('click',()=>{S.muted=!S.muted;el.mute.textContent=S.muted?'🔇':'♫';if(S.muted)try{window.speechSynthesis?.cancel()}catch(e){}});
el.durationBtns.forEach(btn=>btn.addEventListener('click',()=>{
 S.holdTarget=Number(btn.dataset.seconds);el.durationBtns.forEach(x=>x.classList.toggle('selected',x===btn));S.holdTime=0;S.gapTime=0;renderMode()
}));
el.beatBtns.forEach(btn=>btn.addEventListener('click',()=>{
 S.bpmPeriod=btn.dataset.beat==='slow'?1900:1450;el.beatBtns.forEach(x=>x.classList.toggle('selected',x===btn));
 S.beatScore=0;S.beatHold=0;S.lastSlot=-1;S.beatStart=performance.now()+800;renderMode()
}));
el.sensitivity.addEventListener('input',()=>{S.sensitivity=Number(el.sensitivity.value);el.sensitivityName.textContent=['','아주 둔감','둔감','보통','민감','아주 민감'][S.sensitivity]});
el.voiceSelect.addEventListener('change',()=>{S.voiceURI=el.voiceSelect.value;refreshVoices();if(!S.playing)speakPreview()});
el.demoBtn.addEventListener('click',demo);
window.addEventListener('pagehide',stopAll);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&S.playing)stopAll()});
if(window.speechSynthesis?.addEventListener)window.speechSynthesis.addEventListener('voiceschanged',refreshVoices);
refreshVoices();
const directMode=(typeof location!=='undefined'?new URLSearchParams(location.search).get('mode'):null);
if(['strength','long','beat'].includes(directMode))chooseMode(directMode);
else show('home');
})();
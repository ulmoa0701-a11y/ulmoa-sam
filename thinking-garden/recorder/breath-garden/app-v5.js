/* 모아의 바람정원 — child-focused, local-only WebAudio breath-signal experiment.
   IMPORTANT: nonperiodic microphone noise does NOT measure airflow, direction or pressure.
   A teacher should confirm real outward airflow, e.g. with a loose paper strip.
   Voice/ambient sound rejection is heuristic, not a clinical instrument. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const el={
 intro:$('intro'),lesson:$('lesson'),transition:$('transition'),final:$('final'),
 start:$('start'),homeButton:$('homeButton'),soundToggle:$('soundToggle'),
 sound:$('soundToggle'),scene:$('scene'),feather:$('featherArt'),pinwheel:$('pinwheelRotor'),flame:$('candleFlame'),
 rainbowFill:$('rainbowFill'),wind:$('windGust'),meter:$('meter'),meterFill:$('meterFill'),
 stateIcon:$('stateIcon'),stateText:$('stateText'),missionSymbol:$('missionSymbol'),missionTitle:$('missionTitle'),
 missionHint:$('missionHint'),fillBar:$('fillBar'),progressLabel:$('progressLabel'),breathGoal:$('breathGoal'),breathDots:$('breathDots'),breathInstruction:$('breathInstruction'),
 micStart:$('micStart'),feedback:$('feedback'),resultArt:$('resultArt'),resultTitle:$('resultTitle'),
 resultCaption:$('resultCaption'),continue:$('continue'),replay:$('replay'),
 teacher:$('teacher'),voiceStyle:$('voiceStyle'),voiceStyleLabel:$('voiceStyleLabel'),voicePreview:$('voicePreview'),
 introVoicePreview:$('introVoicePreview'),introVoiceNote:$('introVoiceNote'),voiceAvailability:$('voiceAvailability'),sensitivity:$('sensitivity'),sensitivityValue:$('sensitivityValue'),
 testStrength:$('testStrength'),testLabel:$('testLabel'),tryDemo:$('tryDemo'),stopDemo:$('stopDemo'),
 retryMic:$('retryMic'),deviceInfo:$('deviceInfo'),
 flower:[document.querySelector('.flower1'),document.querySelector('.flower2'),document.querySelector('.flower3'),document.querySelector('.flower4')],
 chips:[document.querySelector('.colors .weak'),document.querySelector('.colors .nice'),document.querySelector('.colors .hard')],
 dots:[0,1,2,3].map(i=>$('dot'+i))
};
const STEPS=[
 {kind:'feather',symbol:'🪶',title:'깃털을 살살!',hint:'바람으로 앞으로 보내봐!',needed:2,hold:.75,ending:'와아! 깃털이 살랑살랑!',reward:'🪶🌼'},
 {kind:'rainbow',symbol:'🌈',title:'꽃길을 색칠해!',hint:'초록 바람으로 천천히!',needed:3,hold:.85,ending:'우와아! 예쁜 꽃길이다!',reward:'🌈🌸'},
 {kind:'pinwheel',symbol:'🌻',title:'바람개비 빙글!',hint:'부드럽게 돌려볼까?',needed:2,hold:1.00,ending:'야호! 빙글빙글~!',reward:'🌻✨'},
 {kind:'candle',symbol:'🕯️',title:'촛불을 살짝!',hint:'끄지 말고 흔들어 봐!',needed:3,hold:.80,ending:'오오! 촛불이 살랑살랑!',reward:'🕯️🌼'}
];
const S={
 screen:'intro',stage:0,progress:0,band:'idle',strength:0,previousBand:'idle',
 mode:'none',muted:false,stream:null,context:null,analyser:null,samples:null,
 lastTime:0,raf:0,token:0,calibratingUntil:0,noiseFloor:.004,quietSamples:[],
 sensitivity:3,testingLevel:0,angle:0,lastRecognized:'idle',lastSpoken:'',
 measurements:0,voiced:false,voiceScore:0,voices:[],lastVoiceName:'',voiceURI:'google-auto',
 breathCount:0,breathHold:0,releaseHold:0,holdingDone:false,referenceRms:.30,referenceLearned:false,
 lastRawAmp:0,lastMessage:'',voiceFailed:false
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const step=()=>STEPS[S.stage];
const prefix='실제 바람 측정이 아니라 마이크 소리 신호의 대략적인 세기입니다.';
/* Google Korean voice first (same as Moa Rescue). If not installed, use another available Korean
   voice and disclose its name. If no voices are listed, try system ko-KR TTS, never claim child voice.
   Browser speech is free and device-dependent; there is no guaranteed child voice. */
const GOOGLE_SPEECH_KEY='moa-breath:voice-google';
try{S.voiceURI=localStorage.getItem(GOOGLE_SPEECH_KEY)||'google-auto'}catch(e){}
function isKoreanVoice(v){
 const lang=String(v.lang||'').replace('_','-');
 const name=String(v.name||'')+' '+String(v.voiceURI||'');
 return /^ko(?:-|$)/i.test(lang)||/한국어|korean/i.test(name);
}
function isGoogleKorean(v){
 const name=String(v.name||'')+' '+String(v.voiceURI||'');
 return isKoreanVoice(v)&&/(google|구글)/i.test(name);
}
function preferredVoice(){
 const list=S.voices;
 if(!list.length)return null;
 return [...list].sort((a,b)=>{
  const score=v=>(isGoogleKorean(v)?100:0)+(v.localService===false?10:0)+
    (/female|여성|sunhi|seoyeon|yuna|yumi/i.test(v.name||'')?1:0);
  return score(b)-score(a)||String(a.name).localeCompare(String(b.name),'ko');
 })[0];
}
function chosenVoice(){
 return S.voices.find(v=>v.voiceURI===S.voiceURI)||preferredVoice();
}
function displayVoiceState(voice){
 const isGoogle=voice&&isGoogleKorean(voice);
 el.voiceStyleLabel.textContent=voice?(isGoogle?'Google 한국어':voice.name):'기본 한국어 시도';
 el.voiceAvailability.textContent=voice
  ?(isGoogle?'✅ Google 한국어 목소리 연결됨.':'ℹ️ 이 기기는 Google 한국어가 없어 다른 한국어 목소리를 사용해요: '+voice.name)
  :'ℹ️ 등록된 한국어 목소리가 없어요. 기기의 기본 한국어 음성으로 재생을 시도해요.';
 el.introVoiceNote.textContent=voice
  ?(isGoogle?'🔊 Google 한국어 목소리 듣기':'🔊 한국어 목소리 듣기 (Google 미지원)')
  :'🔊 기본 한국어 음성을 시험해볼 수 있어요.';
 el.introVoicePreview.disabled=false;el.voicePreview.disabled=false;
}
function refreshVoices(){
 const engine=window.speechSynthesis;
 S.voices=engine?.getVoices?engine.getVoices().filter(isKoreanVoice):[];
 const select=el.voiceStyle;
 if(select&&typeof Option!=='undefined'){
  select.replaceChildren(new Option('🌼 Google 한국어 우선 · 자동 선택','google-auto'));
  S.voices.forEach(v=>select.add(new Option((isGoogleKorean(v)?'🌼 ':'🎙️ ')+v.name+(v.localService?' · 기기':' · 온라인'),v.voiceURI)));
  select.value=S.voices.some(v=>v.voiceURI===S.voiceURI)?S.voiceURI:'google-auto';
 }
 displayVoiceState(chosenVoice());
}
function speak(text,force=false){
 if(S.muted)return false;
 if(S.mode==='mic'&&!force)return false;
 if(S.lastSpoken===text&&!force)return false;
 const synth=window.speechSynthesis;
 if(!synth||typeof SpeechSynthesisUtterance==='undefined'){
  el.voiceAvailability.textContent='이 브라우저는 음성 재생을 지원하지 않아요.';
  el.introVoiceNote.textContent='🔇 이 기기에서는 음성 재생이 지원되지 않아요.';
  return false;
 }
 if(!S.voices.length)refreshVoices();
 const voice=chosenVoice();
 try{
  synth.cancel();
  const u=new SpeechSynthesisUtterance(text);u.lang='ko-KR';
  if(voice)u.voice=voice;
  u.rate=1;u.pitch=1;u.volume=1;
  let started=false;
  u.onstart=()=>{
   started=true;S.voiceFailed=false;
   el.introVoiceNote.textContent=voice?'🔊 재생 중: '+voice.name:'🔊 기본 한국어 목소리 재생 중';
  };
  u.onerror=e=>{
   if(['interrupted','canceled'].includes(e.error))return;
   S.voiceFailed=true;
   const message='🔇 음성 재생에 실패했어요. 기기 볼륨·브라우저 설정을 확인해 주세요.';
   el.voiceAvailability.textContent=message;
   el.introVoiceNote.textContent=message;
  };
  S.lastSpoken=text;
  S.lastVoiceName=voice?.name||'기기 기본 한국어';
  synth.speak(u);
  return true;
 }catch(e){
  S.voiceFailed=true;
  el.introVoiceNote.textContent='🔇 음성을 재생하지 못했어요. 소리 설정을 확인해주세요.';
  return false;
 }
}
if(window.speechSynthesis?.addEventListener)window.speechSynthesis.addEventListener('voiceschanged',refreshVoices);
refreshVoices();
function praise(){
 if(S.mode==='mic'&&S.stream){
  for(const t of (S.stream.getAudioTracks?.()||[]))t.enabled=false;
 }
 S.lastSpoken='';
 speak(step().ending,true);
}
function show(which){
 S.screen=which;
 for(const name of ['intro','lesson','transition','final'])el[name].hidden=name!==which;
}
function progressVisual(){
 // The bar fills only during one sustained breath, not for a fleeting blow.
 const holdRatio=clamp(S.breathHold/step().hold,0,1);
 el.fillBar.style.width=(holdRatio*100).toFixed(1)+'%';
 el.progressLabel.textContent=S.breathCount+' / '+step().needed;
 el.breathGoal.textContent='🌬️ 후~ '+step().needed+'번!';
 el.breathDots.textContent=Array.from({length:step().needed},(_,i)=>i<S.breathCount?'🌼':'⚪').join(' ');
 if(S.stage===1){
  const ratio=clamp((S.breathCount+holdRatio*.8)/step().needed,0,1);
  el.rainbowFill.style.width=(ratio*100).toFixed(1)+'%';
  el.flower.forEach((item,i)=>item.classList.toggle('on',ratio>(i+1)/5));
 }
}
function registerGoodBreath(){
 S.breathCount=Math.min(step().needed,S.breathCount+1);
 S.progress=S.breathCount;
 S.breathHold=0;S.releaseHold=0;S.holdingDone=false;
 progressVisual();
 if(S.breathCount>=step().needed)return true;
 el.breathInstruction.textContent='🌼 좋아! 다시 후~';
 return false;
}
function setStage(index){
 S.stage=index;S.progress=0;S.breathCount=0;S.breathHold=0;S.releaseHold=0;S.holdingDone=false;S.band='idle';S.previousBand='idle';S.strength=0;S.lastRecognized='idle';
 el.scene.dataset.scene=step().kind;
 el.missionSymbol.textContent=step().symbol;
 el.missionTitle.textContent=step().title;
 el.missionHint.textContent=step().hint;
 el.rainbowFill.style.width='0%';
 el.flower.forEach(x=>x.classList.remove('on'));
 el.flame.style.transform='rotate(0deg)';
 el.feather.style.transform='translateX(0px) rotate(-15deg)';
 el.breathInstruction.textContent='💨 천천히 후~ 1초, 그리고 잠깐 쉬기!';
 progressVisual();
 el.dots.forEach((x,i)=>{
  x.classList.toggle('completed',i<S.stage);x.classList.toggle('current',i===S.stage);
 });
 renderStrength(0,'idle',false);
 el.feedback.textContent='💨 조용히 후~';
 el.micStart.textContent=S.mode==='mic'?'■ 마이크 멈춤':S.mode==='demo'?'🧪 체험 중':'🎤 다시 시작하기!';
}
function enterPlay(){
 stopAll();
 el.teacher.open=false;
 show('lesson');setStage(0);
 startMic();
}
function stopAll(){
 S.token++;
 if(S.raf){cancelAnimationFrame(S.raf);S.raf=0;}
 const st=S.stream;S.stream=null;
 if(st){for(const track of st.getTracks())track.stop();}
 const ctx=S.context;S.context=null;
 if(ctx){try{ctx.close().catch(()=>{})}catch(e){}}
 S.analyser=null;S.samples=null;S.mode='none';S.calibratingUntil=0;S.lastTime=0;
 S.referenceRms=.30;S.referenceLearned=false;
 el.micStart.textContent='🎤 마이크 켜기!';
 el.deviceInfo.textContent='마이크 미연결 · 저장·업로드 없음';
}
function resetHome(){
 stopAll();show('intro');S.lastSpoken='';
}
function computeRms(data){
 let sum=0;
 for(let i=0;i<data.length;i++)sum+=data[i]*data[i];
 return Math.sqrt(sum/data.length);
}
function periodicity(data){
 // Normalized autocorrelation: high for sustained voiced vowels/notes.
 // Samples with wind turbulence typically have low periodicity.
 // Sparse lag/sample sweep chosen to stay inexpensive on mobile devices.
 if(!data||data.length<1024)return 0;
 let best=0;
 for(let lag=55;lag<=430;lag+=5){
  let ab=0,aa=0,bb=0;
  for(let i=0;i<960;i+=4){
   const x=data[i],y=data[i+lag];
   ab+=x*y;aa+=x*x;bb+=y*y;
  }
  const p=ab/Math.sqrt(aa*bb+1e-12);
  if(p>best)best=p;
 }
 return best;
}
function classifyMic(samples,noiseFloor,setting,referenceRms=.30){
 const rms=computeRms(samples);
 const periodic=rms>.012?periodicity(samples):0;
 // Input strength is relative to device's observed natural blow; not measured airflow force.
 const gain=[0,.55,.72,1,1.24,1.5][setting]||1;
 const threshold=Math.max(.012,noiseFloor*2.8);
 const strength=clamp((rms-threshold)*gain/Math.max(.21,referenceRms),0,1);
 // Fundamental, stable voiced speech: not reliable evidence of a real outward air stream.
 const voiced=rms>.014&&periodic>.65;
 return {rms,periodic,voiced,strength:voiced?0:strength,rawStrength:strength};
}
function mapBand(value,voiced){
 if(voiced)return 'voice';
 if(value<.065)return 'idle';
 if(value<.19)return 'weak';
 if(value<=.86)return 'good';
 return 'strong';
}
function renderStrength(strength,band,voice){
 S.strength=strength;S.band=band;
 el.scene.dataset.band=band;
 el.meterFill.style.width=Math.round(strength*100)+'%';
 el.meterFill.style.background=band==='good'?'var(--green)':band==='strong'?'var(--red)':'var(--blue)';
 el.meter.setAttribute('aria-valuenow',String(Math.round(strength*100)));
 el.chips.forEach((x,i)=>x.classList.toggle('active',['weak','good','strong'][i]===band));
 const feedback={
  idle:['🌱','조용히 후~','천천히 바람 보내기!'],
  weak:['💙','조금 더~','파랑 · 살짝 더!'],
  good:['💚','좋아, 좋아!','초록 · 지금 딱 좋아!'],
  strong:['❤️','살살~','빨강 · 살짝만 약하게!'],
  voice:['🗣️','목소리 대신 후~','소리 말고 입바람! 선생님이 같이 볼게.']
 };
 const msg=feedback[band]||feedback.idle;
 el.stateIcon.textContent=msg[0];
 el.stateText.textContent=msg[1];
 el.feedback.textContent=msg[2];
 if(S.holdingDone&&band==='good')el.feedback.textContent='✅ 좋아! 이제 입을 쉬어줘!';
 // Parallel visual cues so color is not the only indication.
 const power=band==='voice'?0:strength;
 const featherDistance=Math.round(power*190);
 el.feather.style.transform='translateX('+featherDistance+'px) rotate('+(-15+power*30)+'deg)';
 el.wind.style.transform='translateX('+Math.round(power*55)+'px)';
 el.wind.style.opacity=(.18+power*.84).toFixed(2);
 if(S.stage===3){
  const tilt=band==='strong'?28:band==='good'?16:band==='weak'?7:0;
  el.flame.style.transform='rotate('+tilt+'deg)';
 }
 if(S.stage===2){
  // Rotor is advanced by the actual frame duration in tick(); here only its readout updates.
 }
}
function tick(now,manual){
 if(S.screen!=='lesson'||!['mic','demo'].includes(S.mode))return;
 const dt=clamp(S.lastTime?now-S.lastTime:0,0,90)/1000;
 S.lastTime=now;
 if(S.mode==='mic'&&now<S.calibratingUntil){
  if(S.analyser&&S.samples){
   S.analyser.getFloatTimeDomainData(S.samples);
   const amp=computeRms(S.samples);
   S.quietSamples.push(amp);
  }
  renderStrength(0,'idle',false);
  el.feedback.textContent='🤫 잠깐 조용히 기다려줘!';
  S.raf=requestAnimationFrame(tick);
  return;
 }
 if(S.mode==='mic'&&S.quietSamples.length){
  S.quietSamples.sort((a,b)=>a-b);
  S.noiseFloor=S.quietSamples[Math.floor(S.quietSamples.length*.55)]||.004;
  S.quietSamples=[];
  el.deviceInfo.textContent='마이크 연결됨 · 실제 바람 측정 아님 · 음성 기록 없음';
 }
 let strength=0,voice=false;
 if(S.mode==='demo'){
  strength=S.testingLevel;
 }else if(S.analyser&&S.samples){
  S.analyser.getFloatTimeDomainData(S.samples);
  // Learn the sound amplitude of this child's first natural aperiodic blow so a gentle
  // blow does not immediately become "too strong" because the microphone is close.
  const preliminary=classifyMic(S.samples,S.noiseFloor,S.sensitivity,S.referenceRms);
  voice=preliminary.voiced;
  if(!voice&&!S.referenceLearned&&preliminary.rms>S.noiseFloor+.035){
    S.referenceRms=clamp((preliminary.rms-S.noiseFloor)*1.65,.21,.9);
    S.referenceLearned=true;
  }
  const data=classifyMic(S.samples,S.noiseFloor,S.sensitivity,S.referenceRms);
  S.lastRawAmp=data.rms;
  strength=voice?0:(S.strength*.68+data.strength*.32);
  S.measurements++;
  S.voiced=voice;S.voiceScore=data.periodic;
  if(S.measurements%20===0){
   el.deviceInfo.textContent='마이크 감지 중 · 음성 구별은 추정치 · 저장 없음';
  }
 }
 const band=mapBand(strength,voice);
 renderStrength(strength,band,voice);
 if(dt>0){
  if(S.stage===2){
   const speed=band==='good'?140:band==='strong'?245:band==='weak'?50:0;
   S.angle=(S.angle+speed*dt)%360;
   el.pinwheel.style.transform='rotate('+S.angle.toFixed(1)+'deg)';
  }
  if(band==='good'){
   S.releaseHold=0;
   if(!S.holdingDone){
    S.breathHold+=dt;
    if(S.breathHold>=step().hold){
     S.breathHold=step().hold;
     S.holdingDone=true;
     el.breathInstruction.textContent='🌼 잘했어! 이제 잠깐 쉬어!';
    }
    progressVisual();
   }else{
    el.breathInstruction.textContent='🌼 이제 잠깐 쉬어!';
   }
  }else if(band==='idle'||band==='weak'||band==='voice'){
   S.releaseHold+=dt;
   if(S.holdingDone&&S.releaseHold>=.32){
    if(registerGoodBreath()){stageComplete();return}
   }else if(!S.holdingDone&&S.releaseHold>.32){
    // Too-short blows do not earn a flower; restart when breathing out again.
    S.breathHold=0;progressVisual();
    el.breathInstruction.textContent='💨 천천히 후~ 1초, 그리고 잠깐 쉬기!';
   }
  }else if(band==='strong'){
   // A stronger noise cannot earn progress. Let child recover; don't punish a spike.
   S.releaseHold=0;
   if(!S.holdingDone){
    S.breathHold=0;progressVisual();
   }
   el.breathInstruction.textContent='🐢 살짝만 약하게~';
  }
 }
 S.raf=requestAnimationFrame(tick);
}
function stageComplete(){
 if(S.screen!=='lesson')return;
 // Stop scoring and freeze view; the child chooses when to proceed.
 if(S.raf)cancelAnimationFrame(S.raf);
 S.raf=0;
 show('transition');
 el.resultArt.textContent=step().reward;
 el.resultTitle.textContent=step().ending;
 el.resultCaption.textContent=S.mode==='demo'?'🧪 색깔 체험! 실제 바람 연습은 아니야.':'우와! 다음에도 해볼까?';
 el.continue.textContent=S.stage===STEPS.length-1?'🎵 리코더로!':'▶ 다음!';
 // Pause scoring before praise; disable mic track to prevent acoustic feedback.
 praise();
}
function nextStep(){
 if(S.mode==='mic'){try{speechSynthesis.cancel()}catch(e){};if(S.stream){for(const t of (S.stream.getAudioTracks?.()||[]))t.enabled=true}}
 if(S.stage===STEPS.length-1){
  stopAll();show('final');speak('꽃길 완성! 이제 진짜 리코더 소리에 도전해 보자!');return;
 }
 const next=S.stage+1;
 show('lesson');
 setStage(next);
 S.lastTime=0;
 if(S.mode==='mic'||S.mode==='demo'){
  S.raf=requestAnimationFrame(tick);
 }
 if(S.mode==='demo')speak(step().title);
}
async function startMic(){
 if(S.stream&&S.mode==='mic'){stopAll();el.feedback.textContent='마이크를 멈췄어요.';return}
 stopAll();
 const token=S.token;
 el.micStart.disabled=true;
 el.feedback.textContent='🎤 마이크 권한을 준비하고 있어요…';
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('지원되지 않는 브라우저');
  const stream=await navigator.mediaDevices.getUserMedia({
   audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},
   video:false
  });
  if(token!==S.token){stream.getTracks().forEach(x=>x.stop());return}
  // Own the newly granted stream before any subsequent operation can throw.
  // Error cleanup must stop tracks even when WebAudio is unsupported.
  S.stream=stream;
  const A=window.AudioContext||window.webkitAudioContext;
  if(!A)throw new Error('WebAudio를 지원하지 않아요');
  const context=new A();
  S.context=context;
  await context.resume();
  if(token!==S.token)return;
  S.analyser=context.createAnalyser();
  S.analyser.fftSize=2048;S.analyser.smoothingTimeConstant=0;
  context.createMediaStreamSource(stream).connect(S.analyser);
  S.samples=new Float32Array(S.analyser.fftSize);
  S.mode='mic';S.noiseFloor=.004;S.quietSamples=[];S.measurements=0;S.referenceRms=.30;S.referenceLearned=false;
  S.calibratingUntil=performance.now()+700;
  S.lastTime=0;
  S.lastSpoken='';
  try{if('speechSynthesis'in window)speechSynthesis.cancel()}catch(e){}
  el.micStart.textContent='■ 마이크 멈춤';
  el.deviceInfo.textContent='🎤 잠깐 조용히 · 주변 소리 기준 확인 중';
  S.raf=requestAnimationFrame(tick);
 }catch(e){
  stopAll();
  const msg=e?.name==='NotAllowedError'?'마이크 권한을 허용해 주세요.':'마이크를 연결하지 못했어요. 선생님과 확인해 주세요.';
  el.feedback.textContent=msg;el.deviceInfo.textContent=String(e?.name||e?.message||'마이크 오류');
 }finally{el.micStart.disabled=false}
}
function startDemo(){
 stopAll();
 if(S.screen!=='lesson')show('lesson');
 // A teacher demo starts its current stage fresh; no prior real-mic progress leaks in.
 S.mode='demo';setStage(S.stage);S.lastTime=0;S.testingLevel=Number(el.testStrength.value)/100;
 el.micStart.textContent='🧪 색깔 체험 중';
 el.deviceInfo.textContent='🧪 체험 모드 · 마이크 미사용 · 진짜 바람 판정 아님';
 el.feedback.textContent='🧪 민감도 체험 중. 선생님이 슬라이더를 움직일 수 있어요.';
 S.raf=requestAnimationFrame(tick);
}
function resetCurrent(){
 stopAll();show('lesson');setStage(0);
}
el.start.addEventListener('click',enterPlay);
el.voiceStyle.addEventListener('change',()=>{
 S.voiceURI=el.voiceStyle.value;
 try{localStorage.setItem(GOOGLE_SPEECH_KEY,S.voiceURI)}catch(e){}
 S.lastSpoken='';
 refreshVoices();
 if(S.mode!=='mic')speak('안녕! 나는 모아야. 우리 같이 바람 놀이 해볼까?',true);
});
function previewGoogle(){
 if(S.mode==='mic'){el.voiceAvailability.textContent='마이크 감지 중에는 안내 음성을 재생하지 않아요. 멈춘 후 다시 눌러주세요.';return}
 S.lastSpoken='';refreshVoices();
 speak('안녕! 나 모아야! 우리 같이 후~ 불어볼까? 와! 잘했어!',true);
}
el.voicePreview.addEventListener('click',previewGoogle);
el.introVoicePreview.addEventListener('click',previewGoogle);
el.homeButton.addEventListener('click',resetHome);
el.soundToggle.addEventListener('click',()=>{
 S.muted=!S.muted;el.soundToggle.textContent=S.muted?'🔇':'🔊';
 el.soundToggle.setAttribute('aria-label',S.muted?'안내 소리 켜기':'안내 소리 끄기');
 if(S.muted&&'speechSynthesis'in window)try{speechSynthesis.cancel()}catch(e){}
});
el.micStart.addEventListener('click',startMic);
el.continue.addEventListener('click',nextStep);
el.replay.addEventListener('click',enterPlay);
el.sensitivity.addEventListener('input',()=>{
 S.sensitivity=Number(el.sensitivity.value);S.referenceLearned=false;S.referenceRms=.30;
 el.sensitivityValue.textContent=['','아주 둔감','둔감','보통','민감','아주 민감'][S.sensitivity];
});
el.testStrength.addEventListener('input',()=>{
 S.testingLevel=Number(el.testStrength.value)/100;
 el.testLabel.textContent=S.testingLevel<.065?'없음':S.testingLevel<.19?'파랑':S.testingLevel<=.86?'초록':'빨강';
 if(S.mode!=='mic'&&S.screen==='lesson')renderStrength(S.testingLevel,mapBand(S.testingLevel,false),false);
});
el.tryDemo.addEventListener('click',startDemo);
el.stopDemo.addEventListener('click',()=>{stopAll();if(S.screen==='lesson')renderStrength(0,'idle',false)});
el.retryMic.addEventListener('click',()=>{
 if(S.screen!=='lesson'){show('lesson');setStage(S.stage)}
 startMic();
});
window.addEventListener('pagehide',stopAll);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&S.mode==='mic')stopAll()});
show('intro');
})();

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
 missionHint:$('missionHint'),fillBar:$('fillBar'),progressLabel:$('progressLabel'),
 micStart:$('micStart'),feedback:$('feedback'),resultArt:$('resultArt'),resultTitle:$('resultTitle'),
 resultCaption:$('resultCaption'),continue:$('continue'),replay:$('replay'),
 teacher:$('teacher'),sensitivity:$('sensitivity'),sensitivityValue:$('sensitivityValue'),
 testStrength:$('testStrength'),testLabel:$('testLabel'),tryDemo:$('tryDemo'),stopDemo:$('stopDemo'),
 retryMic:$('retryMic'),deviceInfo:$('deviceInfo'),
 flower:[document.querySelector('.flower1'),document.querySelector('.flower2'),document.querySelector('.flower3'),document.querySelector('.flower4')],
 chips:[document.querySelector('.colors .weak'),document.querySelector('.colors .nice'),document.querySelector('.colors .hard')],
 dots:[0,1,2,3].map(i=>$('dot'+i))
};
const STEPS=[
 {kind:'feather',symbol:'🪶',title:'깃털을 살살!',hint:'바람으로 앞으로 보내봐!',needed:1.5,ending:'깃털이 움직였어!',reward:'🪶🌼'},
 {kind:'rainbow',symbol:'🌈',title:'꽃길을 색칠해!',hint:'초록 바람으로 천천히!',needed:2.7,ending:'꽃길이 알록달록!',reward:'🌈🌸'},
 {kind:'pinwheel',symbol:'🌻',title:'바람개비 빙글!',hint:'부드럽게 돌려볼까?',needed:1.8,ending:'빙글빙글 돌아갔어!',reward:'🌻✨'},
 {kind:'candle',symbol:'🕯️',title:'촛불을 살짝!',hint:'끄지 말고 흔들어 봐!',needed:1.4,ending:'부드럽게 흔들었어!',reward:'🕯️🌼'}
];
const S={
 screen:'intro',stage:0,progress:0,band:'idle',strength:0,previousBand:'idle',
 mode:'none',muted:false,stream:null,context:null,analyser:null,samples:null,
 lastTime:0,raf:0,token:0,calibratingUntil:0,noiseFloor:.004,quietSamples:[],
 sensitivity:3,testingLevel:0,angle:0,lastRecognized:'idle',lastSpoken:'',
 measurements:0,voiced:false,voiceScore:0
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const step=()=>STEPS[S.stage];
const prefix='실제 바람 측정이 아니라 마이크 소리 신호의 대략적인 세기입니다.';
function speak(text){
 if(S.muted||!('speechSynthesis'in window))return;
 if(S.mode==='mic')return; // no speaker feedback into the microphone
 if(S.lastSpoken===text)return;
 S.lastSpoken=text;
 try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ko-KR';u.rate=.82;u.pitch=1.04;speechSynthesis.speak(u)}catch(e){}
}
function show(which){
 S.screen=which;
 for(const name of ['intro','lesson','transition','final'])el[name].hidden=name!==which;
}
function progressVisual(){
 const ratio=clamp(S.progress/step().needed,0,1);
 el.fillBar.style.width=(ratio*100).toFixed(1)+'%';
 el.progressLabel.textContent=ratio>.99?'다 찾았어!':ratio<.01?'시작!':'🌱 → 🌼';
 if(S.stage===1){
  el.rainbowFill.style.width=(ratio*100).toFixed(1)+'%';
  el.flower.forEach((item,i)=>item.classList.toggle('on',ratio>(i+1)/5));
 }
}
function setStage(index){
 S.stage=index;S.progress=0;S.band='idle';S.previousBand='idle';S.strength=0;S.lastRecognized='idle';
 el.scene.dataset.scene=step().kind;
 el.missionSymbol.textContent=step().symbol;
 el.missionTitle.textContent=step().title;
 el.missionHint.textContent=step().hint;
 el.rainbowFill.style.width='0%';
 el.flower.forEach(x=>x.classList.remove('on'));
 el.flame.style.transform='rotate(0deg)';
 el.feather.style.transform='translateX(0px) rotate(-15deg)';
 progressVisual();
 el.dots.forEach((x,i)=>{
  x.classList.toggle('completed',i<S.stage);x.classList.toggle('current',i===S.stage);
 });
 renderStrength(0,'idle',false);
 el.feedback.textContent='짧게 후~ 불어 볼까?';
 el.micStart.textContent=S.mode==='mic'?'■ 마이크 멈춤':S.mode==='demo'?'🧪 체험 중':'🎤 마이크 켜기!';
}
function enterPlay(){
 stopAll();
 el.teacher.open=false;
 show('lesson');setStage(0);
 speak('바람으로 깃털을 움직여 볼까?');
}
function stopAll(){
 S.token++;
 if(S.raf){cancelAnimationFrame(S.raf);S.raf=0;}
 const st=S.stream;S.stream=null;
 if(st){for(const track of st.getTracks())track.stop();}
 const ctx=S.context;S.context=null;
 if(ctx){try{ctx.close().catch(()=>{})}catch(e){}}
 S.analyser=null;S.samples=null;S.mode='none';S.calibratingUntil=0;S.lastTime=0;
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
function classifyMic(samples,noiseFloor,setting){
 const rms=computeRms(samples);
 const periodic=rms>.009?periodicity(samples):0;
 // 5 means more sensitive; do not let background calibration drop below .0035.
 const gain=[0,0.50,0.70,1,1.35,1.70][setting]||1;
 const threshold=Math.max(.006,noiseFloor*2.8);
 const excess=Math.max(0,rms-threshold)*gain;
 const strength=clamp(excess/.11,0,1);
 // Voiced speech and flute/recorder sounds should not count as breath gusts.
 const voiced=rms>.013&&periodic>.65;
 return {rms,periodic,voiced,strength:voiced?0:strength,rawStrength:strength};
}
function mapBand(value,voiced){
 if(voiced)return 'voice';
 if(value<.065)return 'idle';
 if(value<.35)return 'weak';
 if(value<=.68)return 'good';
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
  idle:['🌱','살살 불어볼까?','바람을 조금만 보내봐!'],
  weak:['💙','조금만 더!','파랑 · 바람이 약해요'],
  good:['💚','딱 좋아!','초록 · 이 바람을 기억해!'],
  strong:['❤️','살짝 줄여봐!','빨강 · 너무 세지 않게!'],
  voice:['🗣️','조용히 후~','목소리·음악처럼 들려요. 바람인지 선생님과 확인해요.']
 };
 const msg=feedback[band]||feedback.idle;
 el.stateIcon.textContent=msg[0];
 el.stateText.textContent=msg[1];
 el.feedback.textContent=msg[2];
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
  const data=classifyMic(S.samples,S.noiseFloor,S.sensitivity);
  voice=data.voiced;
  // Smooth only valid aperiodic events; voice recognition resets immediately.
  strength=voice?0:(S.strength*.67+data.strength*.33);
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
   S.progress+=dt;
   progressVisual();
   if(S.progress>=step().needed){stageComplete();return}
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
 el.resultCaption.textContent=S.mode==='demo'?'🧪 색 변화 체험 성공! 실제 바람 인식은 아니에요.':'좋아! 다음 놀이도 해볼까?';
 el.continue.textContent=S.stage===STEPS.length-1?'🎵 리코더로!':'▶ 다음!';
 // A speaking prompt on the transition screen must never increase scoring.
 if(S.mode!=='mic')speak(step().ending);
}
function nextStep(){
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
  const A=window.AudioContext||window.webkitAudioContext;
  if(!A)throw new Error('WebAudio를 지원하지 않아요');
  const context=new A();
  S.stream=stream;S.context=context;
  await context.resume();
  if(token!==S.token)return;
  S.analyser=context.createAnalyser();
  S.analyser.fftSize=2048;S.analyser.smoothingTimeConstant=0;
  context.createMediaStreamSource(stream).connect(S.analyser);
  S.samples=new Float32Array(S.analyser.fftSize);
  S.mode='mic';S.noiseFloor=.004;S.quietSamples=[];S.measurements=0;
  S.calibratingUntil=performance.now()+1100;
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
 S.mode='demo';S.lastTime=0;S.testingLevel=Number(el.testStrength.value)/100;
 el.micStart.textContent='🧪 색깔 체험 중';
 el.deviceInfo.textContent='🧪 체험 모드 · 마이크 미사용 · 진짜 바람 판정 아님';
 el.feedback.textContent='🧪 민감도 체험 중. 선생님이 슬라이더를 움직일 수 있어요.';
 S.raf=requestAnimationFrame(tick);
}
function resetCurrent(){
 stopAll();show('lesson');setStage(0);
}
el.start.addEventListener('click',enterPlay);
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
 S.sensitivity=Number(el.sensitivity.value);
 el.sensitivityValue.textContent=['','아주 둔감','둔감','보통','민감','아주 민감'][S.sensitivity];
});
el.testStrength.addEventListener('input',()=>{
 S.testingLevel=Number(el.testStrength.value)/100;
 el.testLabel.textContent=S.testingLevel<.065?'없음':S.testingLevel<.35?'파랑':S.testingLevel<=.68?'초록':'빨강';
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

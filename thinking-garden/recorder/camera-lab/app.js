/* Camera Lab v1 — hand proximity, NOT airtight hole closure. No image storage/upload. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const P='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35';
const MODEL='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const fingers=[{name:'검지',label:'첫 번째 꽃',tip:8,icon:'☝️',flower:'🌼',note:'시',speak:'검지를 첫 번째 구멍 가까이 가져가 볼까?'},{name:'중지',label:'두 번째 꽃',tip:12,icon:'✌️',flower:'🌷',note:'라',speak:'검지는 그대로. 중지를 그 아래 구멍으로 움직여 보자.'},{name:'약지',label:'세 번째 꽃',tip:16,icon:'🖐️',flower:'🌸',note:'솔',speak:'약지를 세 번째 구멍 쪽으로 가져가 보자.'}];
const S={phase:'idle',mode:'none',facing:'environment',stream:null,landmarker:null,targets:[],lastFrame:-1,raf:0,hand:null,lastNear:0,nearSince:0,index:0,blooms:[false,false,false],mute:false,loadPromise:null,token:0,progress:0,simMoving:false,simTip:null};
const video=$('camVideo'),canvas=$('camCanvas'),ctx=canvas.getContext('2d',{alpha:false});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const dist=(a,b)=>Math.hypot((a.x-b.x)*canvas.width,(a.y-b.y)*canvas.height)/Math.min(canvas.width,canvas.height);
const label=(t,el='status')=>{$(el).textContent=t};
function speak(text){if(S.mute||!('speechSynthesis' in window))return;try{speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(text);u.lang='ko-KR';u.rate=.82;u.pitch=1.07;speechSynthesis.speak(u)}catch{}}
function ding(n){if(S.mute)return;try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;let a=new A(),o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.value=660+n*120;g.gain.setValueAtTime(.001,a.currentTime);g.gain.exponentialRampToValueAtTime(.07,a.currentTime+.03);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.25);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+.26);o.onended=()=>a.close()}catch{}}
function markStep(){
 document.querySelectorAll('[data-flower]').forEach((b,i)=>{b.classList.toggle('awake',S.blooms[i]);b.classList.toggle('now',i===S.index&&S.phase==='play');});
 $('stepIcon').textContent=fingers[Math.min(S.index,2)].icon;
 $('stepName').textContent=fingers[Math.min(S.index,2)].name;
 $('stepTag').textContent=S.index+1+' / 3';
 $('bigInstruction').textContent=S.phase==='completed'?'다 찾았어!':'여기로 손가락!';
 $('kidHelp').textContent=S.phase==='completed'?'구멍을 완전히 막았는지는 선생님과 확인해요.':fingers[Math.min(S.index,2)].name+' 손가락을 가까이';
 $('handScore').textContent=S.blooms.filter(Boolean).length+'/3';
 $('fingerProgress').style.width=Math.round(S.progress*100)+'%';
}
function setPhase(phase){
 S.phase=phase;$('idleActions').hidden=phase!=='idle';
 $('setupPanel').hidden=phase!=='calibrate';
 $('playPanel').hidden=!(phase==='play'||phase==='won'||phase==='completed');
 $('finishPanel').hidden=phase!=='completed';
 $('liveNotice').hidden=!(S.mode==='camera'&&phase!=='idle');
 $('demoNotice').hidden=!(S.mode==='demo'&&phase!=='idle');
 $('stopBtn').hidden=phase==='idle';
 $('reverseBtn').disabled=S.mode!=='camera';
 $('resetCalib').disabled=S.mode!=='camera'||phase==='idle';
 markStep();refreshSetup();
}
function refreshSetup(){
 const total=S.targets.length;
 $('calCount').textContent=total+' / 3';
 $('calPrompt').textContent=total<3?['① 실제 리코더의 맨 위 구멍을 눌러 주세요','② 그 아래 두 번째 구멍을 눌러 주세요','③ 세 번째 구멍을 눌러 주세요'][total]:'구멍 세 곳을 지정했어요!';
 $('beginPlay').disabled=total!==3;
 $('calHint').textContent=total<3?'선생님이 화면에 보이는 실제 구멍을 직접 선택해 주세요.':'이제 아이의 손가락 움직임을 확인할 수 있어요.';
}
function emptyTargets(){S.targets=[];S.index=0;S.nearSince=0;S.progress=0;S.blooms=[false,false,false];refreshSetup();markStep()}
function stopLoop(){if(S.raf)cancelAnimationFrame(S.raf);S.raf=0;}
function stopCamera(){stopLoop();S.token++;if(S.stream){S.stream.getTracks().forEach(t=>t.stop());S.stream=null}video.srcObject=null;S.hand=null;S.simTip=null;S.lastFrame=-1;S.nearSince=0;S.progress=0;if(S.landmarker){try{S.landmarker.close()}catch{}S.landmarker=null}S.loadPromise=null;}
function stopAll(){stopCamera();S.mode='none';S.phase='idle';emptyTargets();setPhase('idle');drawIdle();label('카메라를 켜면 실제 손 움직임을 확인할 수 있어요.');}
async function loadLandmarker(){
 const mod=await import(P+'/vision_bundle.mjs');
 const vision=await mod.FilesetResolver.forVisionTasks(P+'/wasm');
 return mod.HandLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:MODEL,delegate:'CPU'},runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.55,minTrackingConfidence:.5,minHandPresenceConfidence:.5});
}
async function openCamera(){
 stopCamera();S.mode='camera';S.phase='loading';emptyTargets();setPhase('loading');label('카메라를 연결하는 중…');drawIdle('카메라 연결 중');
 let id=S.token;
 if(!navigator.mediaDevices?.getUserMedia){stopAll();label('이 기기는 카메라를 지원하지 않아요.');return}
 try{
  const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:S.facing},width:{ideal:640},height:{ideal:480}},audio:false});
  if(id!==S.token){stream.getTracks().forEach(t=>t.stop());return}
  S.stream=stream;video.srcObject=stream;await video.play();if(id!==S.token)return;
  canvas.width=video.videoWidth||640;canvas.height=video.videoHeight||480;
  label('손가락 인식 모델을 불러오는 중…');
  S.loadPromise=loadLandmarker();S.landmarker=await S.loadPromise;
  if(id!==S.token){S.landmarker?.close();return}
  S.lastFrame=-1;S.mode='camera';setPhase('calibrate');label('선생님이 실제 리코더의 앞구멍 3곳을 표시해 주세요.');
  drawLoop();speak('선생님과 함께 리코더 구멍 세 곳을 확인해요.');
 }catch(err){
  const reason=err?.name==='NotAllowedError'?'카메라 권한이 필요해요.':err?.name==='NotFoundError'?'카메라를 찾지 못했어요.':'카메라 또는 손 인식 모델을 시작하지 못했어요.';
  stopCamera();S.mode='none';setPhase('idle');drawIdle('연결 실패');label(reason+' 다시 시도하거나 체험 모드를 이용해 주세요.');
 }
}
function demoStart(){
 stopCamera();S.mode='demo';canvas.width=640;canvas.height=480;
 emptyTargets();S.targets=[{x:.5,y:.31},{x:.5,y:.46},{x:.5,y:.61}];S.index=0;S.simMoving=false;S.simTip={x:.16,y:.38};setPhase('play');label('체험 모드: 실제 카메라를 사용하지 않습니다.');drawLoop();speak('검지를 첫 번째 동그라미 쪽으로 움직여 볼까?');
}
function startPlay(){if(S.targets.length!==3||S.mode!=='camera')return;S.index=0;S.blooms=[false,false,false];S.nearSince=0;S.progress=0;setPhase('play');label('손가락을 목표 구멍 가까이 움직여 봐요.');speak(fingers[0].speak);}
function picture(){
 ctx.clearRect(0,0,canvas.width,canvas.height);
 if(S.mode==='camera'&&video.readyState>=2){ctx.save();ctx.translate(canvas.width,0);ctx.scale(-1,1);ctx.drawImage(video,0,0,canvas.width,canvas.height);ctx.restore();}
 else{
  let gr=ctx.createLinearGradient(0,0,0,canvas.height);gr.addColorStop(0,'#dcf0fc');gr.addColorStop(1,'#daf0dd');ctx.fillStyle=gr;ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.textAlign='center';ctx.fillStyle='#295d4d';ctx.font='900 '+Math.round(canvas.width/18)+'px system-ui';ctx.fillText(S.mode==='demo'?'🧪 체험 화면':'📷 카메라로 리코더를 비춰요',canvas.width/2,canvas.height*.16);
  if(S.mode==='demo'){ctx.save();ctx.strokeStyle='#c59868';ctx.lineWidth=25;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(canvas.width*.5,canvas.height*.22);ctx.lineTo(canvas.width*.5,canvas.height*.75);ctx.stroke();ctx.restore();}
 }
}
function drawAnnotations(points){
 const w=canvas.width,h=canvas.height;
 S.targets.forEach((t,i)=>{
  let active=i===S.index&&S.phase==='play';
  ctx.beginPath();ctx.arc(t.x*w,t.y*h,Math.max(20,w*.037),0,Math.PI*2);
  ctx.lineWidth=active?8:4;ctx.strokeStyle=active?'#ffce69':'#ffffff';ctx.stroke();
  ctx.beginPath();ctx.arc(t.x*w,t.y*h,Math.max(15,w*.03),0,Math.PI*2);
  ctx.fillStyle=active?'rgba(255,205,94,.28)':'rgba(36,100,75,.29)';ctx.fill();
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 '+Math.max(21,w*.032)+'px system-ui';ctx.fillStyle='#ffffff';ctx.fillText(i+1,t.x*w,t.y*h+1);
 });
 if(points&&points.length>=21){
  const bones=[[0,1,2,3,4],[0,5,6,7,8],[0,9,10,11,12],[0,13,14,15,16],[0,17,18,19,20],[5,9,13,17]];
  ctx.strokeStyle='#6ef3bd';ctx.lineWidth=Math.max(3,w*.005);
  for(const chain of bones){ctx.beginPath();chain.forEach((i,k)=>{const p=points[i];if(!p)return;const x=(1-p.x)*w,y=p.y*h;if(k)ctx.lineTo(x,y);else ctx.moveTo(x,y)});ctx.stroke();}
  for(const i of [8,12,16]){
   let p=points[i];if(!p)continue;let cx=(1-p.x)*w,cy=p.y*h;
   ctx.beginPath();ctx.arc(cx,cy,Math.max(10,w*.015),0,2*Math.PI);ctx.fillStyle='#fff';ctx.fill();ctx.lineWidth=4;ctx.strokeStyle='#237653';ctx.stroke();
  }
 }
 if(S.simTip&&S.mode==='demo'&&S.phase==='play'){
  const p=S.simTip;ctx.beginPath();ctx.arc(p.x*w,p.y*h,24,0,Math.PI*2);ctx.fillStyle='#fff3ce';ctx.fill();ctx.strokeStyle='#e5a54c';ctx.lineWidth=6;ctx.stroke();ctx.font='29px system-ui';ctx.fillText('☝️',p.x*w,p.y*h-3);
 }
 if(S.phase==='calibrate'&&S.mode==='camera'){ctx.fillStyle='#142e2688';ctx.fillRect(0,h-62,w,62);ctx.font='bold '+Math.max(16,w*.028)+'px system-ui';ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText('구멍 '+(S.targets.length+1)+'번 터치',w/2,h-32);}
}
function scoreCurrent(){
 if(S.phase!=='play'||S.index>=3)return;
 let t=S.targets[S.index],p=null;
 if(S.mode==='demo')p=S.simTip;
 else if(S.hand?.length>=21){let v=S.hand[fingers[S.index].tip];p={x:1-v.x,y:v.y};}
 if(!p){S.progress=0;S.nearSince=0;$('fingerProgress').style.width='0%';return}
 const d=dist(t,p),near=d<.105;
 if(near){
  if(!S.nearSince)S.nearSince=performance.now();
  S.progress=clamp((performance.now()-S.nearSince)/800,0,1);
 }else{S.nearSince=0;S.progress=0}
 $('fingerProgress').style.width=Math.round(S.progress*100)+'%';
 if(S.progress===1)winStep(false);
}
function winStep(byTeacher){
 if(S.phase!=='play')return;
 S.phase='won';
 S.blooms[S.index]=true;S.progress=0;S.nearSince=0;S.simMoving=false;
 $('resultIcon').textContent=fingers[S.index].flower;
 $('resultTitle').textContent=byTeacher?'함께 찾았어!':'가까이 왔어!';
 $('resultCaption').textContent='구멍을 막았는지는 따로 확인해요.';
 ding(S.index);markStep();
 $('winOverlay').hidden=false;label(byTeacher?'선생님이 접근 위치를 확인했어요.':'손가락이 표시된 구멍 근처에 잠시 머물렀어요.');
 speak('찾았어! 다음 친구를 만나 볼까?');
}
function nextStep(){
 $('winOverlay').hidden=true;
 if(S.index===2){S.phase='completed';setPhase('completed');label('앞쪽 세 구멍 접근 놀이 완료! 실제 운지 정확성은 확인하지 않았어요.');speak('모두 찾아봤네!');return}
 S.index++;S.phase='play';S.progress=0;S.nearSince=0;
 if(S.mode==='demo')S.simTip={x:.16,y:.38};markStep();
 label(fingers[S.index].name+' 손가락을 표시한 위치로 움직여 봐요.');speak(fingers[S.index].speak);
}
function drawLoop(now){
 stopLoop();
 let last=0;
 const step=timestamp=>{
  if(S.mode==='none')return;
  if(S.mode==='camera'&&video.readyState>=2&&S.landmarker&&timestamp-last>85){
   if(video.currentTime!==S.lastFrame){
    S.lastFrame=video.currentTime;
    try{const r=S.landmarker.detectForVideo(video,timestamp);S.hand=r.landmarks?.[0]||null;}catch{S.hand=null}
   }
   last=timestamp;
  }
  if(S.mode==='demo'&&S.simMoving&&S.phase==='play'){
   const t=S.targets[S.index];S.simTip.x+=(t.x-S.simTip.x)*.065;S.simTip.y+=(t.y-S.simTip.y)*.065;
  }
  picture();drawAnnotations(S.hand);scoreCurrent();
  S.raf=requestAnimationFrame(step);
 };
 S.raf=requestAnimationFrame(step);
}
function drawIdle(message='📷 카메라 시작을 눌러요'){canvas.width=640;canvas.height=480;picture();ctx.font='900 30px system-ui';ctx.textAlign='center';ctx.fillStyle='#2a6447';ctx.fillText(message,canvas.width/2,canvas.height*.72)}
canvas.addEventListener('pointerdown',e=>{
 if(S.mode!=='camera'||S.phase!=='calibrate'||S.targets.length>=3)return;
 const r=canvas.getBoundingClientRect();const x=clamp((e.clientX-r.left)/r.width,0,1),y=clamp((e.clientY-r.top)/r.height,0,1);
 S.targets.push({x,y});ding(S.targets.length);refreshSetup();
 if(S.targets.length===3)label('세 구멍 위치가 지정됐어요. 놀이를 시작할 수 있어요.');
});
$('startCamera').addEventListener('click',openCamera);
$('startDemo').addEventListener('click',demoStart);
$('reverseBtn').addEventListener('click',()=>{S.facing=S.facing==='environment'?'user':'environment';openCamera()});
$('stopBtn').addEventListener('click',stopAll);
$('resetCalib').addEventListener('click',()=>{if(S.mode!=='camera')return;emptyTargets();setPhase('calibrate');label('구멍 3곳을 다시 눌러 주세요.')});
$('beginPlay').addEventListener('click',startPlay);
$('demoApproach').addEventListener('click',()=>{if(S.mode!=='demo'||S.phase!=='play')return;S.simMoving=true;});
$('teacherConfirm').addEventListener('click',()=>winStep(true));
$('nextStep').addEventListener('click',nextStep);
$('restart').addEventListener('click',()=>S.mode==='demo'?demoStart():S.mode==='camera'?(emptyTargets(),setPhase('calibrate')):stopAll());
$('readPrompt').addEventListener('click',()=>speak(S.phase==='play'?fingers[S.index].speak:'선생님과 함께 리코더의 구멍을 찾아봐요.'));
$('muteBtn').addEventListener('click',()=>{S.mute=!S.mute;$('muteBtn').textContent=S.mute?'🔇':'🔊';if(S.mute&&'speechSynthesis'in window)speechSynthesis.cancel()});
window.addEventListener('pagehide',stopCamera);
window.addEventListener('visibilitychange',()=>{if(document.hidden&&S.mode==='camera')stopAll()});
setPhase('idle');drawIdle();
})();
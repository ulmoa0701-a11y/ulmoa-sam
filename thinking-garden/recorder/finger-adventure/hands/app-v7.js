/* Two Hands V6 — camera fingertip proximity is not proof of hole closure.
 * 2-hand recognition uses CALIBRATED actual left/right hand labels, not assumed selfie handedness.
 * Everything stays in memory. No media recording, upload, storage or analytics.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const W=720,H=540;
const CDN='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35';
const MODEL='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const tasks=[
 {id:'L1',title:'왼손 검지!',icon:'☝️',side:'L',tip:[8],goal:[{hand:'L',id:8,x:.51,y:.40}],say:'왼손 검지를 첫 번째 동그라미에!'},
 {id:'L2',title:'왼손 검지 + 중지!',icon:'✌️',side:'L',tip:[8,12],goal:[{hand:'L',id:8,x:.51,y:.41},{hand:'L',id:12,x:.51,y:.56}],say:'왼손 검지와 중지를 두 동그라미에 함께!'},
 {id:'R1',title:'오른손 검지!',icon:'☝️',side:'R',tip:[8],goal:[{hand:'R',id:8,x:.51,y:.65}],say:'오른손 검지를 아래 동그라미에!'},
 {id:'R2',title:'오른손 검지 + 중지!',icon:'✌️',side:'R',tip:[8,12],goal:[{hand:'R',id:8,x:.51,y:.62},{hand:'R',id:12,x:.51,y:.78}],say:'오른손 검지와 중지를 두 동그라미에 함께!'},
 {id:'B1',title:'왼손·오른손 검지!',icon:'👐',side:'B',tip:[8],goal:[{hand:'L',id:8,x:.30,y:.50},{hand:'R',id:8,x:.70,y:.50}],say:'왼손 검지와 오른손 검지를 동시에!'},
 {id:'B2',title:'양손 두 개씩!',icon:'🙌',side:'B',tip:[8,12],goal:[{hand:'L',id:8,x:.29,y:.39},{hand:'L',id:12,x:.29,y:.61},{hand:'R',id:8,x:.71,y:.39},{hand:'R',id:12,x:.71,y:.61}],say:'양손 검지와 중지를 함께, 네 동그라미에!'}
];
const S={route:'free',part:'touch',lessonPos:0,phase:'choose',kind:'none',facing:'user',flipLabels:false,model:null,stream:null,cam:null,lastTime:-1,lastSeen:0,raf:0,token:0,hands:[],labels:{L:null,R:null},calStep:0,calSince:0,calName:null,taskIndex:0,armed:false,ready:false,hold:0,progress:0,taps:new Set(),lastFrame:0,mute:false,status:'',mismatch:''};
const video=$('video'),canvas=$('stage'),ctx=canvas.getContext('2d',{alpha:false});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const dist=(a,b)=>Math.hypot((a.x-b.x)*W,(a.y-b.y)*H)/H;
const guidedTouch=['L1','L2','R1'];
const guidedCamera=['L1','L2','R1','R2','B1'];
const task=()=>tasks[S.taskIndex];
function lessonSteps(){return S.part==='touch'?guidedTouch:guidedCamera}
function setTask(id){const index=tasks.findIndex(t=>t.id===id);if(index>=0)S.taskIndex=index}
function lessonTask(){setTask(lessonSteps()[S.lessonPos])}
function progressDots(){
 const box=$('lessonDots'),count=S.route==='guided'?lessonSteps().length:1;
 box.innerHTML='';
 for(let i=0;i<count;i++){
   const dot=document.createElement('span');
   dot.textContent=i<S.lessonPos?'★':i===S.lessonPos?'●':'○';
   dot.className=i<S.lessonPos?'finished':i===S.lessonPos?'active':'pending';
   box.appendChild(dot);
 }
}
function say(s){if(S.mute||!('speechSynthesis'in window))return;try{speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(s);u.lang='ko-KR';u.rate=.83;u.pitch=1.06;speechSynthesis.speak(u)}catch(e){}}
function beep(freq=620){if(S.mute)return;try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;let a=new A(),o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.001,a.currentTime);g.gain.exponentialRampToValueAtTime(.045,a.currentTime+.03);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.22);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+.24);o.onended=()=>a.close().catch(()=>{})}catch(e){}}
function panel(name){for(const id of ['choosePanel','bridgePanel','calibrationPanel','playPanel','rewardPanel','transferPanel'])$(id).hidden=id!==name;
 $('cover').hidden=name!=='choosePanel';}
function status(text){S.status=text;$('status').textContent=text}
function stop(){S.token++;if(S.raf)cancelAnimationFrame(S.raf);S.raf=0;if(S.stream){S.stream.getTracks().forEach(x=>x.stop());S.stream=null}video.srcObject=null;if(S.model){try{S.model.close()}catch(e){}S.model=null}S.hands=[];S.lastTime=-1}
function reset(){stop();S.phase='choose';S.kind='none';S.route='free';S.part='touch';S.lessonPos=0;S.labels={L:null,R:null};S.calStep=0;S.taskIndex=0;S.taps.clear();S.armed=false;S.ready=false;S.progress=0;S.hold=0;$('flip').disabled=true;$('recalibrate').disabled=true;status('원하는 놀이를 선택해 봐!');$('modeBadge').textContent='연습 선택';$('viewTitle').textContent='👀 손가락을 보여줘!';panel('choosePanel');draw()}
function taskSelect(id){S.route='free';setTask(id);document.querySelectorAll('[data-mission]').forEach(x=>x.classList.toggle('selected',x.dataset.mission===id));status(task().title+' — 카메라 또는 터치 체험을 선택해 주세요.')}
async function createModel(){const mod=await import(CDN+'/vision_bundle.mjs');const vision=await mod.FilesetResolver.forVisionTasks(CDN+'/wasm');return mod.HandLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:MODEL,delegate:'CPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.60,minHandPresenceConfidence:.57,minTrackingConfidence:.54})}
async function startCamera(){
 stop();S.kind='camera';S.phase='loading';panel('calibrationPanel');$('calTitle').textContent='카메라 준비 중…';$('calIcon').textContent='📷';status('카메라 권한과 손 인식 모델을 준비하고 있어요.');let token=S.token;
 try{
 if(!navigator.mediaDevices?.getUserMedia)throw Error('NO_CAMERA');
 let stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:S.facing},width:{ideal:640},height:{ideal:480}},audio:false});
 if(token!==S.token){stream.getTracks().forEach(t=>t.stop());return}
 S.stream=stream;video.srcObject=stream;await video.play();if(token!==S.token)return;
 S.model=await createModel();if(token!==S.token){S.model.close();return}
 S.labels={L:null,R:null};S.calStep=0;S.calSince=0;S.calName=null;
 $('flip').disabled=false;$('recalibrate').disabled=false;
 startCalibration();loopStart();say('선생님과 먼저 왼손 오른손을 확인해 볼까?');
 }catch(e){stop();S.kind='none';S.phase='choose';panel('choosePanel');status(e?.name==='NotAllowedError'?'카메라 권한을 허용해야 해요.':e?.name==='NotFoundError'?'카메라를 찾지 못했어요.':'손 인식 모델 또는 카메라 연결 실패. 체험 모드를 이용해 보세요.');draw()}
}
function startCalibration(){
 S.phase='cal';S.calStep=0;S.calSince=0;S.calName=null;S.labels={L:null,R:null};S.progress=0;panel('calibrationPanel');drawCalibration();status('선생님과 왼손, 오른손을 하나씩 확인해요.');
}
function drawCalibration(){
 let left=S.calStep===0;
 $('calStage').textContent='손 확인 · '+(left?'1':'2')+'/2';
 $('calIcon').textContent=left?'🫲':'🫱';
 $('calTitle').textContent=(left?'왼손':'오른손')+'만 보여줘!';
 $('calText').textContent='다른 손은 화면 밖으로 빼고 1초 동안 보여줘.';
 $('calMeter').style.width=Math.round(S.progress*100)+'%';
}
function beginDemo(){stop();S.kind='demo';S.phase='play';S.taps.clear();$('modeBadge').textContent='👆 터치 체험';startMission();status('터치 체험: 동그라미를 하나씩 눌러 모두 켜 보세요. 실제 손 인식이 아니에요.');}
function startMission(){
 S.phase='play';S.armed=false;S.ready=false;S.hold=0;S.progress=0;S.taps.clear();
 const t=task();$('playEmoji').textContent=t.side==='L'?'🫲 '+t.icon:t.side==='R'?'🫱 '+t.icon:t.icon;$('playTitle').textContent=t.title;
 $('playInstruction').textContent=t.goal.length===1?'한 손가락을 반짝이는 곳으로!':(S.kind==='demo'?'동그라미를 하나씩 찾아봐!':'손가락들을 동시에 보여줘!');
 $('missionPosition').textContent=S.route==='guided'?
  (S.part==='touch'?'👆 그림에서 ':'📷 실제 손 ')+(S.lessonPos+1)+' / '+lessonSteps().length:
  '선생님 자유연습';
 progressDots();
 $('playMeter').style.width='0%';$('ready').hidden=false;$('playHint').textContent='그림을 보고 준비한 다음 시작!';
 $('viewTitle').textContent='🎯 '+t.title;$('modeBadge').textContent=S.kind==='camera'?'📷 손 인식':'👆 터치 체험';
 panel('playPanel');draw();say(t.say+' 준비되면 시작!');
}
function ready(){if(S.phase!=='play')return;S.ready=true;S.armed=false;S.hold=0;S.progress=0;S.taps.clear();$('ready').hidden=true;
 $('playHint').textContent=S.kind==='demo'?'동그라미를 하나씩 눌러 켜 보자.':'손가락을 목표 밖에서 시작하고 천천히 옮겨 보자.';
 say(task().say);
}
function pointsVisible(h){const vw=video.videoWidth||640,vh=video.videoHeight||480,sc=Math.max(W/vw,H/vh),ox=(W-vw*sc)/2,oy=(H-vh*sc)/2;
 return h.map(p=>({x:(S.facing==='user'?W-(ox+p.x*vw*sc):(ox+p.x*vw*sc))/W,y:(oy+p.y*vh*sc)/H}))}
function handSet(result){
 const out=[],hands=result?.landmarks||[],sides=result?.handednesses||[];
 for(let i=0;i<hands.length;i++){
  const cls=sides[i]?.[0];if(!cls||!hands[i]||hands[i].length<21||cls.score<.58)continue;
  out.push({raw:cls.categoryName,score:cls.score,pts:pointsVisible(hands[i])});
 }
 return out;
}
function calibrateFrame(now,fresh){
 if(!fresh||S.phase!=='cal')return;
 const q=S.hands;
 if(q.length!==1){S.calSince=0;S.calName=null;S.progress=0;drawCalibration();status('손 하나만 보여줘!');return}
 const candidate=q[0].raw;
 if(!['Left','Right'].includes(candidate)){S.calSince=0;S.progress=0;return}
 if(S.calStep===1&&candidate===S.labels.L){S.calSince=0;S.progress=0;status('두 손이 같은 방향으로 인식됐어. 손을 바꿔 다시 보여줘.');drawCalibration();return}
 if(S.calName!==candidate){S.calName=candidate;S.calSince=now}
 S.progress=clamp((now-S.calSince)/900,0,1);drawCalibration();
 if(S.progress>=1){
  if(S.calStep===0){S.labels.L=candidate;S.calStep=1;S.calSince=0;S.calName=null;S.progress=0;drawCalibration();beep();say('이번에는 오른손!')}
  else{S.labels.R=candidate;S.progress=0;beep(800);startMission();status('두 손 확인 완료! 그림을 보고 시작해 봐.')}
 }
}
function finger(h,id){return h?.pts?.[id]||null}
function evaluate(){
 const t=task();const targetHands={};
 for(const side of ['L','R']){const raw=S.labels[side];const matching=S.hands.filter(h=>h.raw===raw);targetHands[side]=raw&&matching.length===1?matching[0]:null;}
 const uses=[...new Set(t.goal.map(g=>g.hand))];
 if(uses.some(side=>!targetHands[side]))return {ok:false,reason:uses.length===2?'👐 두 손 모두 보여줘!':'✋ 목표 손이 안 보여!'};
 if(S.hands.length===2&&S.hands[0].raw===S.hands[1].raw)return{ok:false,reason:'👐 두 손을 다시 확인해 줘!'};
 const radius=.068;
 for(const goal of t.goal){
  const h=targetHands[goal.hand],p=finger(h,goal.id);
  if(!p)return {ok:false,reason:'손가락이 가려졌어'};
  const d=dist(p,goal);if(d>=radius)return{ok:false,reason:'☝️ 반짝이는 동그라미 가까이!'};
  // Reject different fingers touching the current target closer than its required tip.
  for(const side of ['L','R']){const hh=targetHands[side];if(!hh)continue;
   for(const id of [4,8,12,16,20]){
    if(hh===h&&id===goal.id)continue;
    const pt=finger(hh,id);if(!pt)continue;
    const other=dist(pt,goal);
    if(other<Math.max(radius*.72,d+.018))return{ok:false,reason:'✋ 다른 손가락이 가까워!'};
   }
  }
 }
 return {ok:true,reason:'✨ 좋아! 그대로!'};
}
function scoring(now,fresh){
 if(S.phase!=='play'||!S.ready||S.kind!=='camera')return;
 if(!fresh){if(now-S.lastSeen>280){S.hold=0;S.progress=0;$('playMeter').style.width='0%'}return}
 const check=evaluate();
 // Require an initial observation away from ALL targets after Ready.
 if(!S.armed){
  if(!check.ok&&check.reason.includes('가까이')){S.armed=true;$('playHint').textContent='✨ 이제 반짝이는 곳으로!'}
  else if(!check.ok&&check.reason.includes('안 보여')){S.armed=true;$('playHint').textContent='✨ 이제 손을 목표로 가져가!'}
  else $('playHint').textContent='먼저 목표에서 손가락을 떨어뜨려 줘!';
  return;
 }
 if(!check.ok){S.hold=0;S.progress=0;$('playMeter').style.width='0%';$('playHint').textContent=check.reason;return}
 if(!S.hold)S.hold=now;
 S.progress=clamp((now-S.hold)/1400,0,1);$('playMeter').style.width=Math.round(S.progress*100)+'%';
 $('playHint').textContent='✨ 두 손가락 위치 좋아! 조금만 그대로!';
 if(S.progress>=1)reward();
}
function reward(){
 if(S.phase!=='play')return;
 S.phase='reward';S.ready=false;S.hold=0;S.progress=0;
const rewards=S.route==='guided'?(S.part==='touch'?['🌱','🌼','🌈']:['🌱','🌼','🦋','🌈','🎶']):['🌱','🌼','🐣','🦋','🌈','🎶'];
$('rewardArt').textContent=rewards[S.route==='guided'?S.lessonPos:S.taskIndex];
 $('rewardTitle').textContent=S.kind==='demo'?'잘 찾았어!':'손가락 위치 찾았어!';
 $('rewardSubtitle').textContent=S.kind==='demo'?'그림 속 위치를 하나씩 찾아봤어. 실제 동시 사용은 아직 확인하지 않았어.':'카메라에서 목표 손가락 끝이 같은 순간 위치에 가까웠어. 실제 운지는 별도 확인해요.';
 $('nextMission').textContent=S.route==='guided'?
 (S.lessonPos===lessonSteps().length-1?(S.part==='touch'?'📷 이제 내 손!':'🎼 내 리코더!'):'▶ 다음!'):
 '⌂ 다른 놀이';
 panel('rewardPanel');beep(770);say('찾았어! 다음에도 도전해 볼까?');
}
function nextMission(){
 if(S.route!=='guided'){reset();return}
 if(S.lessonPos<lessonSteps().length-1){
  S.lessonPos++;lessonTask();startMission();
  status('다음 그림! 한 번 더 해볼까?');return;
 }
 if(S.part==='touch'){
  S.phase='bridge';panel('bridgePanel');status('손가락 자리 찾기 완료! 이제 실제 손을 연습해 보자.');
  say('이번에는 카메라로 진짜 손가락을 움직여 볼까?');return;
 }
 transfer();
}
function transfer(){
 stop();S.kind='none';S.phase='transfer';panel('transferPanel');
 $('realCheck').checked=false;setRealLink(false);
 status('선생님과 내 리코더의 손가락 위치를 찾아보자.');draw();
 say('이번엔 내 리코더를 잡아볼까? 선생님과 같이!');
}
function setRealLink(confirmed){
 $('playReal').classList.toggle('locked',!confirmed);
 $('playReal').setAttribute('aria-disabled',String(!confirmed));
 $('playReal').tabIndex=confirmed?0:-1;
 $('realHint').textContent=confirmed?'🎵 이제 연주하러 가자!':'선생님과 실제 리코더를 잡아본 다음 열려요.';
}
function guidedStart(){
 reset();$('teacherSettings').open=false;S.route='guided';S.part='touch';S.lessonPos=0;lessonTask();
 beginDemo();status('첫 번째 놀이! 큰 동그라미를 찾아보자.');
}
function bridgeStartCamera(){
 S.route='guided';S.part='camera';S.lessonPos=0;lessonTask();
 startCamera();
}
function makeRealTransfer(){transfer()}
function draw(){
 ctx.clearRect(0,0,W,H);
 if(S.kind==='camera'&&S.stream&&video.readyState>=2){
  const vw=video.videoWidth||640,vh=video.videoHeight||480,sc=Math.max(W/vw,H/vh),ox=(W-vw*sc)/2,oy=(H-vh*sc)/2;
  ctx.save();if(S.facing==='user'){ctx.translate(W,0);ctx.scale(-1,1)}ctx.drawImage(video,ox,oy,vw*sc,vh*sc);ctx.restore();
  ctx.fillStyle='rgba(230,252,229,.08)';ctx.fillRect(0,0,W,H);
 }else{
  const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#bedff9');grad.addColorStop(1,'#d5ecd0');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#90c9a0';ctx.beginPath();ctx.ellipse(W*.5,H*1.04,W*.71,H*.32,0,0,7);ctx.fill();
 }
 if(!['play','reward'].includes(S.phase))return;
 const t=task();
 if(t.side==='B'){
  ctx.fillStyle='rgba(255,255,255,.45)';ctx.fillRect(W/2-2,36,4,H-60);
  ctx.fillStyle='#246b51';ctx.textAlign='center';ctx.font='900 30px system-ui';ctx.fillText('왼손',W*.29,72);ctx.fillText('오른손',W*.71,72);
 }else{
  // Recorder-shaped instructional silhouette; not a real instrument photo.
  ctx.save();ctx.globalAlpha=.54;
  ctx.fillStyle='#f6e5bd';ctx.strokeStyle='#9e8055';ctx.lineWidth=4;
  ctx.beginPath();ctx.roundRect(W*.51-36,H*.16,72,H*.77,22);ctx.fill();ctx.stroke();
  ctx.fillStyle='#64523b';ctx.fillRect(W*.51-21,H*.20,42,11);
  for(let i=0;i<6;i++){ctx.beginPath();ctx.arc(W*.51,H*(.38+i*.09),12,0,7);ctx.fill()}
  ctx.restore();
 }
 for(let i=0;i<t.goal.length;i++){
  const p=t.goal[i],x=p.x*W,y=p.y*H,active=S.taps.has(i);
  ctx.beginPath();ctx.arc(x,y,active?49:44,0,7);ctx.fillStyle=active?'rgba(76,194,105,.38)':'rgba(255,224,130,.36)';ctx.fill();
  ctx.lineWidth=active?9:7;ctx.strokeStyle=active?'#319762':'#dc9a36';ctx.stroke();
  ctx.beginPath();ctx.arc(x,y,30,0,7);ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.stroke();
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 19px system-ui';
  ctx.fillStyle=active?'#20553c':'#4f4430';ctx.fillText((p.hand==='L'?'L':'R')+(p.id===8?'①':'②'),x,y);
 }
 if(S.kind==='camera'&&S.phase==='play'){
  for(const hand of S.hands){for(const tip of [8,12]){
   const p=finger(hand,tip);if(!p)continue;
   ctx.beginPath();ctx.arc(p.x*W,p.y*H,13,0,7);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#318d6b';ctx.lineWidth=4;ctx.stroke();
  }}
 }
}
function frame(now){
 if(S.kind==='none')return;
 let fresh=S.kind==='demo';
 if(S.kind==='camera'&&S.model&&video.readyState>=2&&video.currentTime!==S.lastTime){
  S.lastTime=video.currentTime;
  try{const res=S.model.detectForVideo(video,now);S.hands=handSet(res);S.lastSeen=now;fresh=true}catch(e){S.hands=[];fresh=true;S.lastSeen=now}
 }
 if(S.phase==='cal')calibrateFrame(now,fresh);
 if(S.phase==='play')scoring(now,fresh);
 draw();S.raf=requestAnimationFrame(frame);
}
function loopStart(){if(S.raf)cancelAnimationFrame(S.raf);S.raf=requestAnimationFrame(frame)}
function demoTap(e){
 if(S.kind!=='demo'||S.phase!=='play'||!S.ready)return;
 const rect=canvas.getBoundingClientRect();const scale=Math.min(rect.width/W,rect.height/H);
 const mx=(rect.width-W*scale)/2,my=(rect.height-H*scale)/2;
 const px=(e.clientX-rect.left-mx)/scale/W,py=(e.clientY-rect.top-my)/scale/H;
 const t=task(),closest=t.goal.map((p,i)=>({i,d:Math.hypot((p.x-px)*W,(p.y-py)*H)/H})).sort((a,b)=>a.d-b.d)[0];
 if(!closest||closest.d>.095)return;
 S.taps.add(closest.i);beep(450+closest.i*90);draw();
 $('playHint').textContent='✨ '+S.taps.size+' / '+t.goal.length+' 터치했어!';
 S.progress=S.taps.size/t.goal.length;$('playMeter').style.width=Math.round(S.progress*100)+'%';
 if(S.taps.size===t.goal.length)reward();
}
function changeFacing(){if(S.kind!=='camera')return;S.facing=S.facing==='user'?'environment':'user';startCamera()}
function restartMission(){if(S.kind!=='none')startMission()}
function switchHands(){if(S.kind==='camera')startCalibration()}
document.querySelectorAll('[data-mission]').forEach(button=>button.addEventListener('click',()=>taskSelect(button.dataset.mission)));
$('guidedStart').addEventListener('click',guidedStart);
$('bridgeCamera').addEventListener('click',bridgeStartCamera);
$('bridgeReal').addEventListener('click',makeRealTransfer);
$('realCheck').addEventListener('change',()=>{
 setRealLink($('realCheck').checked)
});
$('playReal').addEventListener('click',event=>{
 if(!$('realCheck').checked)event.preventDefault();
});
$('beginCamera').addEventListener('click',startCamera);
$('beginDemo').addEventListener('click',beginDemo);
$('voice').addEventListener('click',()=>{S.mute=!S.mute;$('voice').textContent=S.mute?'🔇':'🔊';if(S.mute&&'speechSynthesis'in window)speechSynthesis.cancel()});
$('exit').addEventListener('click',reset);
$('flip').addEventListener('click',changeFacing);
$('recalibrate').addEventListener('click',switchHands);
$('calSkip').addEventListener('click',startCalibration);
$('ready').addEventListener('click',ready);
$('hear').addEventListener('click',()=>say(task().say));
$('retry').addEventListener('click',restartMission);
$('nextMission').addEventListener('click',nextMission);
$('otherMission').addEventListener('click',reset);
$('transferBack').addEventListener('click',reset);
canvas.addEventListener('pointerdown',demoTap);
window.addEventListener('pagehide',stop);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&S.kind==='camera')reset()});
taskSelect('L1');reset();
})();
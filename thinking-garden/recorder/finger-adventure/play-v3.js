/* Moa Recorder AR finger adventure — image-free private camera processing.
   A detected fingertip near a visual target DOES NOT verify a sealed recorder hole. */
(()=>{'use strict';
const $=id=>document.getElementById(id),W=720,H=540,visionVersion='0.10.35';
const CDN='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@'+visionVersion;
const MODEL='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const fingers=[{name:'검지',icon:'☝️',tip:8,flower:'🌼',say:'검지를 반짝이는 첫 번째 구멍 가까이 움직여 보자.'},
{name:'중지',icon:'✌️',tip:12,flower:'🌷',say:'이번에는 중지야. 바로 아래 구멍으로 움직여 보자.'},
{name:'약지',icon:'🖐️',tip:16,flower:'🌸',say:'마지막은 약지야. 아래 구멍으로 움직여 보자.'}];
const VIRTUAL=[{x:.53,y:.38},{x:.53,y:.51},{x:.53,y:.64}];
const S={phase:'intro',stage:0,step:0,mode:'none',facing:'user',cam:null,model:null,hand:null,points:[],lastFrame:-1,requestId:0,raf:0,dwell:0,progress:0,demoMoving:false,demoTip:{x:.15,y:.45},mute:false,successes:[0,0,0],inputKind:'none',modelLoading:false,resumeReal:false,demoPressed:false,winTimer:null,nearLast:0,mic:null,audio:null,analyser:null,fft:null,micFrames:0,micDwell:0,lastWarning:'',camModelReady:false};
const vid=$('vid'),cv=$('view'),g=cv.getContext('2d',{alpha:false});cv.width=W;cv.height=H;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
const setText=(id,txt)=>{$(id).textContent=txt};
function speak(msg){if(S.mute||!('speechSynthesis'in window))return;try{speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(msg);u.lang='ko-KR';u.rate=.82;u.pitch=1.05;speechSynthesis.speak(u)}catch(e){}}
function tone(freq=725){if(S.mute)return;try{let A=window.AudioContext||window.webkitAudioContext;if(!A)return;let c=new A(),o=c.createOscillator(),v=c.createGain();o.type='sine';o.frequency.value=freq;v.gain.setValueAtTime(.0001,c.currentTime);v.gain.exponentialRampToValueAtTime(.06,c.currentTime+.03);v.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.25);o.connect(v).connect(c.destination);o.start();o.stop(c.currentTime+.27);o.onended=()=>c.close().catch(()=>{})}catch(e){}}
const stageName=['그림에 톡!','하나씩 톡!','내 리코더','소리 도전'];
function show(id){for(const n of ['introPanel','gamePanel','winPanel','calPanel','soundPanel','finishPanel'])$(n).hidden=n!==id;}
function stopFrames(){if(S.raf)cancelAnimationFrame(S.raf);S.raf=0}
function stopMic(){if(S.mic){S.mic.getTracks().forEach(t=>t.stop());S.mic=null}if(S.audio){S.audio.close().catch(()=>{});S.audio=null}S.analyser=null;S.fft=null;S.micFrames=0;S.micDwell=0;$('micStart').disabled=false;$('micStart').textContent='🎤 시작';}
function stopCamera(){S.requestId++;stopFrames();if(S.cam){S.cam.getTracks().forEach(t=>t.stop());S.cam=null}vid.srcObject=null;S.hand=null;S.lastFrame=-1;if(S.model){try{S.model.close()}catch(e){}S.model=null}S.camModelReady=false}
function closeAll(){if(S.winTimer){clearTimeout(S.winTimer);S.winTimer=null}stopCamera();stopMic();$('winView').hidden=true}
function drawBg(){let grad=g.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#b4e0fa');grad.addColorStop(1,'#ebf8e9');g.fillStyle=grad;g.fillRect(0,0,W,H);g.fillStyle='#fff7bb';g.beginPath();g.arc(W*.87,H*.15,44,0,7);g.fill();g.fillStyle='#93c995';g.beginPath();g.ellipse(W*.5,H*1.10,W*.8,H*.43,0,0,Math.PI*2);g.fill()}
function mirror(){return S.facing==='user'}
function projection(p){let vw=vid.videoWidth||640,vh=vid.videoHeight||480,scale=Math.max(W/vw,H/vh),ox=(W-vw*scale)/2,oy=(H-vh*scale)/2,x=ox+p.x*vw*scale,y=oy+p.y*vh*scale;return{x:mirror()?W-x:x,y}}
function drawVideo(){
 if(S.mode!=='camera'||!S.cam||vid.readyState<2){drawBg();return}
 const vw=vid.videoWidth||640,vh=vid.videoHeight||480,scale=Math.max(W/vw,H/vh),sw=vw*scale,sh=vh*scale,ox=(W-sw)/2,oy=(H-sh)/2;
 g.save();if(mirror()){g.translate(W,0);g.scale(-1,1);g.drawImage(vid,ox,oy,sw,sh)}else g.drawImage(vid,ox,oy,sw,sh);g.restore();
 g.fillStyle='rgba(244,251,244,.12)';g.fillRect(0,0,W,H);
}
function roundRect(x,y,w,h,r,fill,stroke,lw=3){g.beginPath();g.roundRect(x,y,w,h,r);if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.lineWidth=lw;g.strokeStyle=stroke;g.stroke()}}
function virtualRecorder(){
 // A simple semi-transparent overlay for targeting, not a photograph of a particular recorder.
 const cx=VIRTUAL[0].x*W,top=H*.14;
 g.save();g.globalAlpha=.78;roundRect(cx-52,top,104,94,21,'#fae6c5','#947856',4);roundRect(cx-28,top+29,57,12,6,'#6b573e',null);
 roundRect(cx-43,top+85,86,H*.69,20,'#faead0','#9a7e59',5);roundRect(cx-37,top+92,73,H*.66,16,'#f5e2bf',null);
 for(let i=0;i<3;i++){const p=VIRTUAL[i];g.beginPath();g.arc(p.x*W,p.y*H,21,0,Math.PI*2);g.fillStyle='#40392e';g.fill();g.strokeStyle='#e5d1a4';g.lineWidth=5;g.stroke()}
 g.restore();
}
function targets(){return S.stage===2?S.points:VIRTUAL}
function aim(){return targets()[S.step]}
function drawAim(){
 if(!['gamePanel','winPanel'].includes(S.currentPanel)||!['virtual','sequence','real'].includes(S.phase))return;
 const p=aim();if(!p)return;const x=p.x*W,y=p.y*H;
 g.save();g.strokeStyle='#ffffff';g.lineWidth=8;g.beginPath();g.arc(x,y,51,0,Math.PI*2);g.stroke();
 g.strokeStyle='#eda94d';g.lineWidth=9;g.setLineDash([15,9]);g.beginPath();g.arc(x,y,46,0,Math.PI*2);g.stroke();g.setLineDash([]);
 g.fillStyle='rgba(255,237,168,.15)';g.beginPath();g.arc(x,y,43,0,Math.PI*2);g.fill();
 g.font='900 31px system-ui';g.textAlign='center';g.fillStyle='white';g.strokeStyle='#276f56';g.lineWidth=5;g.strokeText(String(S.step+1),x,y+11);g.fillText(String(S.step+1),x,y+11);
 g.restore();
}
function drawHandTip(){const p=fingertip();if(!p||!['virtual','sequence','real'].includes(S.phase))return;g.save();
 g.beginPath();g.arc(p.x*W,p.y*H,19,0,7);g.fillStyle='#fff';g.fill();g.strokeStyle='#1d805f';g.lineWidth=6;g.stroke();
 g.restore();
}
function fingertip(){
 if(S.mode==='demo')return S.demoTip;
 if(!S.hand||!S.hand[fingers[S.step].tip])return null;
 const p=projection(S.hand[fingers[S.step].tip]);return{x:p.x/W,y:p.y/H};
}
function drawFrame(){
 drawVideo();
 if(S.phase==='virtual'||S.phase==='sequence'||(S.phase==='intro'&&S.mode==='none'))virtualRecorder();
 if(S.phase==='real'||S.phase==='calibrate')for(let i=0;i<S.points.length;i++){if(S.phase==='real'&&i!==S.step)continue;const p=S.points[i];g.strokeStyle='#1a7857';g.lineWidth=5;g.beginPath();g.arc(p.x*W,p.y*H,22,0,7);g.stroke();g.fillStyle='#fff';g.font='900 21px system-ui';g.textAlign='center';g.fillText(i+1,p.x*W,p.y*H+7)}
 drawAim();drawHandTip();
 if(S.phase==='intro'&&S.mode==='none'){g.font='900 35px system-ui';g.textAlign='center';g.fillStyle='#2d6c52';g.fillText('☝️  +  🎶  =  🌼',W/2,H*.9)}
}
function updateNav(){for(let i=0;i<4;i++){const el=$('nav'+i);el.classList.toggle('done',i<S.stage);el.classList.toggle('now',i===S.stage);}}
function choosePanel(id){S.currentPanel=id;show(id);$('winView').hidden=id!=='winPanel';updateNav();$('switchCam').disabled=S.mode!=='camera';$('calAgain').disabled=S.mode!=='camera'||S.stage!==2;}
function setStep(){
 S.progress=0;S.dwell=0;S.nearLast=0;S.demoMoving=false;S.demoTip=null;S.demoPressed=false;
 const f=fingers[S.step];setText('fingerIcon',f.icon);setText('fingerLabel',f.name);setText('stepNum',(S.step+1)+' / 3');
 setText('message',S.stage===0?'여기!':S.stage===1?'하나 더!':'내 리코더!');
 setText('stageTag',stageName[S.stage]);setText('sceneTag',S.mode==='demo'?'🧪 체험 화면':S.stage===2?'🎼 내 진짜 리코더':'🌱 리코더 그림');
 setText('camTitle',S.stage===2?'📷 진짜 리코더':'📷 그림 속 리코더');
 setText('camHint',S.stage===2?'실제 악기를 움직이지 않고 손가락을 가까이':'손가락 끝의 흰 점을 동그라미 안으로');
 $('bar').style.width='0%';$('demoMove').hidden=S.mode!=='demo';$('actionHint').textContent=S.mode==='demo'?'☝️ 화면에 손가락을 대고 구멍까지 끌어 봐!':'☝️ 실제 손가락을 구멍 가까이 움직여 봐!';cv.style.touchAction=S.mode==='demo'?'none':'auto';
 choosePanel('gamePanel');speak(f.say);
}
function startPlay(stage=0){
 S.stage=stage;S.phase=['virtual','sequence','real'][stage];S.step=0;
 S.successes[stage]=0;setStep();
}
function next(){
 if(S.currentPanel!=='winPanel')return;
 if(S.winTimer){clearTimeout(S.winTimer);S.winTimer=null}
 if(S.step<2){S.step++;setStep();return}
 if(S.stage===0||S.stage===1){startPlay(S.stage+1);if(S.stage===2)startCalibration();return}
 if(S.stage===2){enterAudio();return}
}
function win(source='camera'){
 if(S.currentPanel!=='gamePanel')return;
 S.dwell=0;S.progress=0;S.demoMoving=false;
 S.successes[S.stage]++;
 setText('viewWinIcon',fingers[S.step].flower);
 setText('viewWinTitle',source==='demo'?'찾았어!':source==='teacher'?'선생님과 찾았어!':'가까이 왔어!');
 const needsStepButton=S.step===2;
 $('viewNext').hidden=!needsStepButton;
 setText('viewWinCaption',needsStepButton?'▶ 다음 놀이를 눌러줘!':'곧 다음 손가락으로!');
 setText('winFlower',fingers[S.step].flower);
 setText('winText',source==='teacher'?'같이 찾았어!':source==='demo'?'체험 성공!':'가까이 왔어!');
 setText('winHelp','구멍을 완전히 막은 것은 아직 확인하지 않았어요.');
 setText('winNext',S.step===2?(S.stage===2?'🎵 소리 내기!':'▶ 다음 놀이!'):'➡️ 다음 손가락!');
 choosePanel('winPanel');tone(570+S.step*145);speak('찾았어! 다음 손가락!');
 if(!needsStepButton){S.winTimer=setTimeout(()=>{S.winTimer=null;if(S.currentPanel==='winPanel')next()},1450)}

}
function dist(a,b){return Math.hypot((a.x-b.x)*W,(a.y-b.y)*H)/Math.min(W,H)}
function score(now){
 if(S.currentPanel!=='gamePanel'||!['virtual','sequence','real'].includes(S.phase))return;
 const target=aim(),tip=fingertip();
 if(!target||!tip){if(now-S.nearLast>220){S.dwell=0;S.progress=0}$('bar').style.width=(S.progress*100).toFixed(0)+'%';return}
 const limit=S.stage===0?.17:S.stage===1?.15:.125;
 const near=dist(target,tip)<limit;
 if(near){if(!S.dwell)S.dwell=now;S.nearLast=now}
 if(!near&&(now-S.nearLast)>200){S.dwell=0;S.progress=0}
 else if(S.dwell){S.progress=clamp((now-S.dwell)/(S.stage===2?760:600),0,1)}

 $('bar').style.width=(S.progress*100).toFixed(0)+'%';
 if(S.progress>=1)win(S.mode==='demo'?'demo':'camera');
}
function loop(now){
 if(S.mode==='none')return;
 if(S.mode==='camera'&&S.model&&vid.readyState>=2&&vid.currentTime!==S.lastFrame){
   S.lastFrame=vid.currentTime;
   try{const r=S.model.detectForVideo(vid,now);S.hand=r.landmarks?.[0]||null}catch(e){S.hand=null}
 }
 
 drawFrame();score(now);S.raf=requestAnimationFrame(loop);
}
function runLoop(){stopFrames();S.raf=requestAnimationFrame(loop)}
async function makeModel(){
 const mod=await import(CDN+'/vision_bundle.mjs');
 const vision=await mod.FilesetResolver.forVisionTasks(CDN+'/wasm');
 return await mod.HandLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:MODEL,delegate:'CPU'},numHands:1,runningMode:'VIDEO',minHandDetectionConfidence:.57,minTrackingConfidence:.5,minHandPresenceConfidence:.5});
}
async function startCamera(){
 closeAll();S.mode='camera';S.phase='loading';S.stage=0;S.step=0;S.points=[];
 choosePanel('introPanel');$('cameraStart').disabled=true;setText('status','카메라와 손 인식 모델을 준비하고 있어요…');
 let token=S.requestId;
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw Error('NO_CAMERA');
  const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:S.facing},width:{ideal:640},height:{ideal:480}},audio:false});
  if(token!==S.requestId){stream.getTracks().forEach(t=>t.stop());return}
  S.cam=stream;vid.srcObject=stream;await vid.play();
  if(token!==S.requestId)return;
  // MediaPipe tracks 21 points locally, but downloading its files requires internet.
  S.model=await makeModel();
  if(token!==S.requestId){S.model?.close();return}
  $('cameraStart').disabled=false;setText('status','손가락을 동그라미로 가져가 봐요.');if(S.resumeReal){S.resumeReal=false;startCalibration()}else startPlay(0);runLoop();
 }catch(e){
  closeAll();S.mode='none';S.phase='intro';choosePanel('introPanel');$('cameraStart').disabled=false;
  setText('status',e?.name==='NotAllowedError'?'카메라 권한이 필요해요.':e?.name==='NotFoundError'?'카메라를 찾을 수 없어요.':'카메라 또는 손 인식 모델 연결에 실패했어요.');
  drawFrame();
 }
}
function startDemo(stage=0){closeAll();S.mode='demo';S.facing='user';S.points=[];setText('status','체험 모드: 화면에 손가락을 직접 대고 끌어 보세요. 실제 카메라 인식은 아니에요.');startPlay(stage);runLoop()}
function startCalibration(){
 S.phase='calibrate';S.stage=2;S.step=0;S.points=[];S.dwell=0;S.progress=0;$('beginReal').disabled=true;setText('stageTag','내 리코더');setText('camTitle','🎼 진짜 내 리코더');setText('sceneTag','👩‍🏫 구멍 표시');
 if(S.mode==='demo')S.points=[...VIRTUAL.map(v=>({...v}))];
 if(S.mode==='demo'){startPlay(2);return}
 setText('calCount','0 / 3');setText('calInstruction','1번 구멍!');
 setText('status','선생님이 실제 리코더의 구멍을 맨 위부터 차례로 표시해 주세요.');
 choosePanel('calPanel');speak('선생님이 리코더 구멍을 표시해 줄 거야.');
}
function pointerMark(event){
 if(S.phase!=='calibrate'||S.mode!=='camera'||S.points.length>=3)return;
 const rect=cv.getBoundingClientRect(),scale=Math.min(rect.width/W,rect.height/H),ow=W*scale,oh=H*scale,ox=(rect.width-ow)/2,oy=(rect.height-oh)/2;
 const px=(event.clientX-rect.left-ox)/scale,py=(event.clientY-rect.top-oy)/scale;
 if(px<0||px>W||py<0||py>H)return;
 S.points.push({x:px/W,y:py/H});
 tone(480+S.points.length*110);
 setText('calCount',S.points.length+' / 3');
 setText('calInstruction',S.points.length===3?'다 준비됐어!':(S.points.length+1)+'번 구멍!');
 if(S.points.length===3){$('beginReal').disabled=false;setText('status','준비 완료. 실제 리코더를 고정한 상태로 연습해요.')}
}
function enterAudio(){
 stopCamera();S.mode='none';S.phase='audio';S.stage=3;setText('stageTag','소리 도전');setText('sceneTag','🎵 소리 듣기');setText('camTitle','🎵 진짜 리코더 소리');setText('audioNote','시');setText('audioStatus','🎤 리코더 소리를 들어볼까?');
 choosePanel('soundPanel');drawFrame();speak('내 리코더로 시 소리를 내 볼까?');
}
async function startMicrophone(){
 if(S.phase!=='audio')return;
 if(S.mic){stopMic();setText('audioStatus','🎤 다시 시도할 수 있어요.');return}
 if(!navigator.mediaDevices?.getUserMedia){setText('audioStatus','이 기기에는 마이크 기능이 없어요.');return}
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
  if(S.phase!=='audio'){stream.getTracks().forEach(t=>t.stop());return}
  S.mic=stream;const A=window.AudioContext||window.webkitAudioContext;if(!A)throw Error('Audio unsupported');
  S.audio=new A();await S.audio.resume();
  S.analyser=S.audio.createAnalyser();S.analyser.fftSize=4096;S.analyser.smoothingTimeConstant=0;
  S.audio.createMediaStreamSource(stream).connect(S.analyser);S.fft=new Float32Array(4096);
  setText('audioStatus','🎤 듣고 있어요…');
  $('micStart').textContent='■ 그만';
  const run=()=>{
   if(!S.mic||!S.analyser||S.phase!=='audio')return;
   S.analyser.getFloatTimeDomainData(S.fft);let f=pitch(S.fft,S.audio.sampleRate);
   if(f&&Math.abs(1200*Math.log2(f/987.77))<90){S.micFrames++;if(!S.micDwell)S.micDwell=performance.now();
    setText('audioStatus','🎶 좋아! 조금만 더!');
    if(S.micFrames>=9&&performance.now()-S.micDwell>350){soundSuccess('mic');return}
   }else{S.micFrames=0;S.micDwell=0}
   S.raf=requestAnimationFrame(run);
  };
  S.raf=requestAnimationFrame(run);
 }catch(e){stopMic();setText('audioStatus',e?.name==='NotAllowedError'?'마이크 권한이 필요해요.':'소리 인식에 실패했어요.');$('micStart').textContent='🎤 시작';}
}
function pitch(b,sr){let e=0;for(let i=0;i<b.length;i++)e+=b[i]*b[i];if(Math.sqrt(e/b.length)<.018)return null;let lag=0,quality=-1;
 for(let n=Math.floor(sr/1080);n<=Math.ceil(sr/760);n++){let dot=0,aa=0,bb=0;for(let i=0;i<b.length-n;i+=2){let a=b[i],d=b[i+n];dot+=a*d;aa+=a*a;bb+=d*d}let k=dot/Math.sqrt(aa*bb+1e-12);if(k>quality){quality=k;lag=n}}
 return quality>.82&&lag>0?sr/lag:null;
}
function soundSuccess(source){if(S.phase!=='audio')return;stopMic();S.phase='completed';setText('finishEmoji',source==='mic'?'🌼🌷🌸':'🌷🌼🌸');setText('finishTitle','소리꽃 성공!');setText('finishDetail',source==='mic'?'마이크가 시 음을 감지했어요. 실제 운지 정확도는 선생님이 확인해 주세요.':'선생님이 실제 시 음을 확인했어요.');
 finish();
}
function finish(){stopMic();S.phase='completed';S.stage=3;setText('stageTag','완료');choosePanel('finishPanel');speak('멋져! 오늘도 리코더에 도전했어.')}
function home(){closeAll();cv.style.touchAction='auto';S.mode='none';S.phase='intro';S.stage=0;S.step=0;S.points=[];S.dwell=0;S.progress=0;S.successes=[0,0,0];S.resumeReal=false;setText('status','카메라로 손가락을 따라 움직여 봐요.');$('cameraStart').disabled=false;$('micStart').textContent='🎤 시작';choosePanel('introPanel');drawFrame()}
function flip(){if(S.mode!=='camera')return;S.resumeReal=S.mode==='camera'&&S.stage===2;S.facing=S.facing==='user'?'environment':'user';startCamera()}
$('cameraStart').addEventListener('click',startCamera);
$('demoStart').addEventListener('click',()=>startDemo(0));
$('pick0').addEventListener('click',()=>startDemo(0));
$('pick1').addEventListener('click',()=>startDemo(1));
$('pick2').addEventListener('click',()=>{S.resumeReal=true;startCamera()});
$('pick3').addEventListener('click',()=>enterAudio());
$('demoMove').addEventListener('click',()=>speak('화면에 손가락을 대고, 반짝이는 동그라미까지 천천히 끌어 보자.'));
$('next').addEventListener('click',next);$('viewNext').addEventListener('click',next);
$('beginReal').addEventListener('click',()=>{if(S.points.length===3)startPlay(2)});
$('calAgain').addEventListener('click',()=>{if(S.mode==='camera'&&S.stage===2)startCalibration()});
function pointerToDemo(event){
 if(S.mode!=='demo'||S.currentPanel!=='gamePanel')return;
 const r=cv.getBoundingClientRect(),s=Math.min(r.width/W,r.height/H),dx=(r.width-W*s)/2,dy=(r.height-H*s)/2;
 const x=(event.clientX-r.left-dx)/s,y=(event.clientY-r.top-dy)/s;
 S.demoTip={x:clamp(x/W,0,1),y:clamp(y/H,0,1)};
}
cv.addEventListener('pointerdown',e=>{
 if(S.mode==='demo'&&S.currentPanel==='gamePanel'){
  S.demoPressed=true;try{cv.setPointerCapture?.(e.pointerId)}catch(err){}pointerToDemo(e);return;
 }
 pointerMark(e);
});
cv.addEventListener('pointermove',e=>{if(S.demoPressed)pointerToDemo(e)});
function releasePointer(){if(S.mode==='demo'){S.demoPressed=false;S.demoTip=null;S.progress=0;S.dwell=0;$('bar').style.width='0%'}}
cv.addEventListener('pointerup',releasePointer);
cv.addEventListener('pointercancel',releasePointer);
$('switchCam').addEventListener('click',flip);
$('stopCam').addEventListener('click',home);
$('micStart').addEventListener('click',startMicrophone);
$('soundSkip').addEventListener('click',()=>{setText('finishTitle','오늘도 연습했어!');setText('finishDetail','구멍 위치 연습을 마쳤어요. 정확한 소리 연주는 다음에 도전해요.');setText('finishEmoji','🌱🌱🌱');finish()});
$('teacherNear').addEventListener('click',()=>win('teacher'));
$('teacherSound').addEventListener('click',()=>soundSuccess('teacher'));
$('again').addEventListener('click',home);
$('voice').addEventListener('click',()=>{S.mute=!S.mute;setText('voice',S.mute?'🔇':'🔊');if(S.mute&&'speechSynthesis' in window)speechSynthesis.cancel()});
$('hear').addEventListener('click',()=>speak(S.phase==='intro'?'모아와 리코더 놀이를 해 볼까?':S.phase==='calibrate'?'선생님이 구멍을 표시해요.':S.phase==='audio'?'리코더로 시 소리를 불어 봐.':fingers[S.step].say));
window.addEventListener('pagehide',closeAll);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&S.cam)home()});
home();
})();
/* Moa Hand Mirror: browser-local visual observation, no recording, no upload. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const core=window.HandMirrorCore;
if(!core)throw new Error('Gesture matcher unavailable');
const CDN='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35';
const MODEL='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const POSES=['palm','fist','one','two','three'];
const MODE={garden:'모아의 마법 꽃밭',copy:'모아 손 따라하기',fingers:'손가락 탐험',memory:'반짝손 기억길',both:'두 손 협동'};
const ROUNDS={
 garden:[['fist'],['palm'],['fist'],['palm'],['fist'],['palm']],
 copy:[['palm'],['fist'],['one'],['two'],['three'],['palm']],
 fingers:[['one'],['two'],['three'],['one'],['three'],['two']],
 memory:[['palm','one'],['one','fist'],['two','palm','fist'],['three','one','palm']],
 both:[['palm','palm'],['fist','fist'],['palm','fist'],['one','one']]
};
const CONNECTIONS=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17],[5,9],[9,13],[13,17]];
let S={mode:'copy',kind:'none',phase:'intro',round:0,part:0,success:0,token:0,raf:0,model:null,stream:null,facing:'user',lastFrame:-1,lastObserved:0,matchSince:0,readyToMatch:true,rearmSince:0,winTimer:0,silent:false,camHands:[],loading:false,guideVisible:true,connectTimer:0,firstVideoFrame:0,firstHandSeen:0,darkFrameSince:0,lastLightCheck:0,cameraReady:false,readySince:0,frameLightOk:false,lightChecked:false};
let audio=null;
const video=$('video'),canvas=$('overlay'),ctx=canvas.getContext('2d');
const now=()=>performance.now();
const current=()=>ROUNDS[S.mode][S.round];
const currentGoal=()=>S.mode==='memory'?[current()[S.part]]:current();
const goalText=()=>currentGoal().map(x=>core.TITLES[x]).join(' + ');
const goalEmoji=()=>currentGoal().map(x=>core.EMOJI[x]).join(' ');
/* Transparent anatomical-style visual sample. Finger states, not pixel alignment, are scored. */
function handArt(kind){
 const pattern=core.PATTERNS[kind];if(!pattern)return '';
 // Rounded fingers with separate bent joints; no rectangular bars or fake instrument holes.
 const columns=[{x:43,w:24,tip:34},{x:69,w:25,tip:19},{x:97,w:24,tip:27},{x:124,w:22,tip:47}];
 const fingers=columns.map(({x,w,tip},i)=>{
  const ext=pattern[i]===1,end=ext?tip:108;
  const mid=x+w/2,arc=Math.min(w/2,12);
  const shape='M '+x+' 140 L '+x+' '+(end+arc)+' Q '+x+' '+end+' '+mid+' '+end+' Q '+(x+w)+' '+end+' '+(x+w)+' '+(end+arc)+' L '+(x+w)+' 140 Z';
  return '<g class="'+(ext?'open-finger':'folded-finger')+'" data-finger="'+i+'">'+
    '<path d="'+shape+'" fill="'+(ext?'#ffe6a0':'#c1d5c9')+'" stroke="'+(ext?'#b9752d':'#88a595')+'" stroke-width="'+(ext?4.5:3)+'" stroke-linejoin="round"/>'+
    (ext?'<path d="M '+(mid-5)+' '+(end+14)+' Q '+mid+' '+(end+9)+' '+(mid+5)+' '+(end+14)+'" stroke="#fff9dc" stroke-width="3" fill="none"/>':'')+
    '<circle cx="'+mid+'" cy="'+(end+12)+'" r="'+(ext?6:3)+'" fill="'+(ext?'#fff6bb':'#adc9b5')+'" stroke="'+(ext?'#ba802e':'#829f8e')+'" stroke-width="1.5"/></g>';
 }).join('');
 const thumb=kind==='palm'?
  '<path d="M55 158 C39 146 24 121 16 113 C4 101 0 113 4 128 C8 148 24 167 43 183" fill="#ffe6a0" stroke="#b9752d" stroke-width="4"/>':
  '<path d="M56 156 C36 147 22 151 20 160 C20 168 34 176 47 184" fill="#c1d5c9" stroke="#88a595" stroke-width="3"/>';
 const palm='<path d="M39 139 C39 125 48 118 61 118 L139 118 C154 118 161 132 161 147 L159 174 C156 193 141 202 123 202 L72 202 C53 201 40 185 39 170 Z" fill="#e3f5de" stroke="#43856d" stroke-width="4"/>'+
  '<path d="M61 152 Q92 163 131 153" stroke="#95c6ab" stroke-width="3" fill="none" opacity=".7"/>';
 return '<svg class="hand-pose" data-hand-pose="'+kind+'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 177 212" aria-hidden="true" focusable="false">'+thumb+fingers+palm+'</svg>';
}
function gestureFigure(kind,side=''){
 return '<div class="ghost-hand" data-pose="'+kind+'">'+handArt(kind)+'<small>'+ (side?side+' · ':'')+core.TITLES[kind]+'</small></div>';
}
function renderGuide(){
 const camera=isCamera(),preview=isMemory()&&S.phase==='memorize',recall=isMemory()&&!preview&&S.phase!=='reward';
 const active=camera&&!recall&&S.phase!=='setup';
 $('game').classList.toggle('is-camera',camera);
 $('viewer').dataset.phase=preview?'memorize':S.phase;
 $('liveTask').hidden=!camera||S.phase==='setup';
 $('liveTitle').textContent=preview?'손 그림을 보고 기억해!':recall?'기억한 손 모양 만들기!':S.phase==='reward'?'🌼 손동작 성공!':goalText();
 $('liveLegend').textContent=recall?'기억한 대로 해볼까?':preview?'노란 손가락 위치도 함께 기억해!':'🟡 노란 손가락 쭉! · 연한 손가락 접기';
 $('guideToggle').hidden=!camera||recall;
 $('cameraHold').hidden=!camera||preview||S.phase==='setup';
 $('ghostGuides').hidden=!active||!S.guideVisible;
 $('ghostGuides').classList.toggle('is-hidden',!active||!S.guideVisible);
 if(!active){$('ghostGuides').replaceChildren();return;}
 const poses=preview?current():currentGoal();
 $('ghostGuides').innerHTML=poses.map((p,i)=>gestureFigure(p,preview?'순서 '+(i+1):poses.length>1?(i===0?'첫 손':'다음 손'):'')).join('');
 $('ghostGuides').classList.toggle('is-matched',S.phase==='reward');
}

const isCamera=()=>S.kind==='camera';
const isMemory=()=>S.mode==='memory';
const isGarden=()=>S.mode==='garden';
const timeouts=()=>{if(S.winTimer)clearTimeout(S.winTimer);S.winTimer=0};
function show(id){for(const key of ['intro','game','finish'])$(key).hidden=key!==id;$('home').hidden=id==='intro';}
function message(s){if($('message').textContent!==s)$('message').textContent=s;if($('viewerBadge').textContent!==s)$('viewerBadge').textContent=s;}
function sound(){if(S.silent)return;try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;if(!audio)audio=new A();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(670,audio.currentTime);o.frequency.linearRampToValueAtTime(930,audio.currentTime+.17);g.gain.setValueAtTime(.001,audio.currentTime);g.gain.exponentialRampToValueAtTime(.045,audio.currentTime+.02);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.26);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.28)}catch(e){}}
function stopCamera(){
 S.token++;clearTimeout(S.connectTimer);S.connectTimer=0;S.firstVideoFrame=0;S.firstHandSeen=0;S.darkFrameSince=0;S.lastLightCheck=0;S.readySince=0;S.frameLightOk=false;S.lightChecked=false;S.cameraReady=false;S.loading=false;
 $('cameraCheck').hidden=true;$('cameraCheckFill').style.width='0%';
 video.classList.remove('is-ready');hideCameraProblem();

 if(S.raf)cancelAnimationFrame(S.raf);
 S.raf=0;
 if(S.stream){S.stream.getTracks().forEach(t=>t.stop());S.stream=null;}
 video.srcObject=null;
 if(S.model){try{S.model.close()}catch(e){}S.model=null;}
 S.camHands=[];S.lastFrame=-1;S.matchSince=0;S.lastObserved=0;S.loading=false;
 $('viewer').dataset.match='no';$('cameraHoldFill').style.width='0%';
 const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);
}
function showCameraProblem(title,detail){
 if(!isCamera())return;
 $('cameraProblemTitle').textContent=title;
 $('cameraProblemText').textContent=detail;
 $('cameraProblem').hidden=false;
 $('placeholder').hidden=true;
}
function hideCameraProblem(){$('cameraProblem').hidden=true;}
function frameBrightness(){
 if(!video.videoWidth||!video.videoHeight)return null;
 try{
  const c=document.createElement('canvas');c.width=30;c.height=22;
  const g=c.getContext('2d',{willReadFrequently:true});
  g.drawImage(video,0,0,30,22);
  const a=g.getImageData(0,0,30,22).data;let sum=0;
  for(let i=0;i<a.length;i+=4)sum+=(a[i]+a[i+1]+a[i+2])/3;
  return sum/(a.length/4);
 }catch(e){return null;}
}
function reset(){timeouts();stopCamera();S.phase='intro';S.kind='none';show('intro');}
function gardenUpdate(){
 $('gardenScene').hidden=!isGarden();
 if(!isGarden())return;
 const msgs=['🌰 주먹을 쥐고 씨앗 잡기','🌷 손을 펴면 첫 꽃이 피어요','🌰 주먹을 쥐고 다음 씨앗 잡기','🌻 손을 펴서 꽃 피우기','🌰 마지막 씨앗 잡기','🌼 손을 펴서 꽃밭 완성!'];
 const flowers=['🌷','🌻','🌼'];
 const round=Math.min(S.round,5);
 $('gardenStory').textContent=S.phase==='reward'?(S.success%2===1?'✨ 씨앗을 잡았어!':'🎉 꽃이 피었어!'):msgs[round];
 $('gardenCaption').textContent=S.phase==='reward'?'손이 움직이니까 정원이 자라났어!':'손 모양이 맞으면 정원이 바뀌어요';
 document.querySelectorAll('.garden-bed').forEach((el,i)=>{
  const growth=S.success >= (i+1)*2?'flower':S.success===(i*2)+1?'seed':'empty';
  el.dataset.growth=growth;
  el.querySelector('.garden-plant').textContent=flowers[i];
 });
}
function modeSelected(m){S.mode=m;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===m)));}
function taskOptions(){
 const types=S.mode==='both'?[['palm','palm'],['fist','fist'],['palm','fist'],['one','one']]:POSES.map(p=>[p]);
 const options=$('choices');options.replaceChildren();
 for(const typeset of types){const b=document.createElement('button');b.type='button';b.className='choice';b.dataset.pose=typeset.join(',');
 const icon=document.createElement('span');icon.className='choice-art';icon.innerHTML=typeset.map(p=>handArt(p)).join('');
 const small=document.createElement('small');small.textContent=typeset.map(p=>core.TITLES[p]).join(' + ');
 b.append(icon,small);b.addEventListener('click',()=>answerTouch(typeset));options.appendChild(b);}
}
function updateSteps(preview){
 const el=$('sequence');el.replaceChildren();el.hidden=!isMemory();
 if(!isMemory())return;
 current().forEach((pose,i)=>{const span=document.createElement('span');span.className='step'+(i<S.part?' done':i===S.part?' current':'');
 span.innerHTML=preview||i<S.part?handArt(pose):'?';
 el.appendChild(span);});
}
function render(){
 if(S.round>=ROUNDS[S.mode].length){finish();return;}
 $('game').classList.toggle('is-garden',isGarden());
 const preparing=isCamera()&&!S.cameraReady;
 const memoryPreview=isMemory()&&S.phase==='memorize';
 $('roundLabel').textContent=(S.round+1)+' / '+ROUNDS[S.mode].length;
 $('flowerLabel').textContent='🌼 '+S.success;
 $('viewName').textContent=MODE[S.mode];$('kindBadge').textContent=isCamera()?'📷 손 인식':'👆 화면 정답 고르기';
 $('taskTitle').textContent=isMemory()?'🧠 순서를 기억해 볼까?':MODE[S.mode];
 $('targetEmoji').innerHTML=memoryPreview?current().map(p=>handArt(p)).join('<span style="font-size:25px">→</span>'):isMemory()?'❔':currentGoal().map(p=>handArt(p)).join('');
 $('targetEmoji').classList.toggle('has-hands',!isMemory()||memoryPreview);
 $('targetTitle').textContent=memoryPreview?'동작 '+current().length+'개 기억하기':isMemory()?(S.part+1)+'번째 손동작!':goalText();
 $('targetHelp').textContent=memoryPreview?'다 살펴봤으면 아래 버튼을 눌러!':isMemory()?'방금 본 모양을 기억해서 만들어 봐!':isCamera()?'반투명 그림은 참고용! 똑같은 자리에 놓지 않아도 돼.':'모양을 흉내 내며 답을 골라 봐!';
 $('ready').hidden=!memoryPreview;
 $('next').hidden=true;
 $('meter').style.width='0%';
 $('choices').hidden=isCamera()||memoryPreview||preparing;
 $('cameraCheck').hidden=!preparing;
 $('cameraCheckText').textContent=preparing?'내 손이 카메라에 보이면 꽃밭이 시작돼요.':'카메라 준비 완료';
 $('cameraCheckFill').style.width='0%';
 if(!isCamera()&&!memoryPreview)taskOptions();
 updateSteps(memoryPreview);
 $('flip').hidden=!isCamera();
 $('targetPanel').hidden=isCamera();
 $('cameraHoldFill').style.width='0%';
 $('viewer').dataset.match='no';
 renderGuide();
 $('placeholder').hidden=isCamera()&&S.model!==null;
 if(!isCamera())$('placeholder').innerHTML='<span class="hand">👀</span>모양을 흉내 내면서 아래에서 답을 골라 줘!';
 $('video').hidden=!isCamera();canvas.hidden=!isCamera();
 gardenUpdate();
 S.matchSince=0;S.lastObserved=0;S.rearmSince=0;
 if(preparing){S.phase='setup';message('먼저 카메라에서 손을 찾아 볼게요.');}
 else if(memoryPreview){S.phase='memorize';message('모아가 보여준 순서를 기억해 볼까? 시간 제한은 없어!');}
 else if(S.phase!=='reward'){
  S.phase='play';message(isCamera()?'손을 보여줘! 모양이 맞으면 꽃이 피어.':'손 모양을 따라 한 뒤 알맞은 그림을 골라!');
 }
}
function start(kind){
 timeouts();stopCamera();
 S.kind=kind;S.round=0;S.part=0;S.success=0;S.cameraReady=false;S.readySince=0;S.phase=kind==='camera'?'setup':isMemory()?'memorize':'play';
 S.readyToMatch=true;S.guideVisible=true;$('guideToggle').setAttribute('aria-pressed','true');$('guideToggle').textContent='👋 손 그림 숨기기';show('game');render();
 if(kind==='camera')startCamera();
}
async function startCamera(){
 clearTimeout(S.connectTimer);hideCameraProblem();
 const own=++S.token;S.loading=true;S.model=null;S.camHands=[];S.cameraReady=false;S.readySince=0;S.frameLightOk=false;S.lightChecked=false;S.phase='setup';render();S.lastLightCheck=0;
 S.connectTimer=setTimeout(()=>{if(own===S.token&&S.loading)showCameraProblem('카메라 준비가 오래 걸려요','권한 허용 여부와 인터넷 연결을 확인해 봐. 다시 연결하거나 화면 놀이로 바꿀 수 있어.');},10000);
 $('placeholder').hidden=false;$('placeholder').innerHTML='<span class="hand">📷</span>카메라와 손 인식을 준비하고 있어요…';renderGuide();
 message('카메라 연결 중…');
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw Error('이 브라우저에서 카메라를 사용할 수 없어요.');
  const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:S.facing},width:{ideal:640},height:{ideal:480}},audio:false});
  if(own!==S.token){stream.getTracks().forEach(t=>t.stop());return;}
  S.stream=stream;video.srcObject=stream;video.classList.toggle('front',S.facing==='user');await video.play();
  const mod=await import(CDN+'/vision_bundle.mjs');
  const vision=await mod.FilesetResolver.forVisionTasks(CDN+'/wasm');
  const model=await mod.HandLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:MODEL,delegate:'CPU'},numHands:2,runningMode:'VIDEO',minHandDetectionConfidence:.60,minTrackingConfidence:.5,minHandPresenceConfidence:.55});
  if(own!==S.token){model.close();return;}
  S.model=model;S.loading=false;clearTimeout(S.connectTimer);S.connectTimer=0;S.lastLightCheck=0;$('placeholder').hidden=true;hideCameraProblem();renderGuide();
  message('카메라에 손이 잘 보이면 자동으로 꽃밭이 시작돼요.');
  tick();
 }catch(e){
  if(own!==S.token)return;
  console.warn('hand mirror camera unavailable',e);
  S.loading=false;clearTimeout(S.connectTimer);S.connectTimer=0;
  if(S.stream){S.stream.getTracks().forEach(t=>t.stop());S.stream=null;}
  video.srcObject=null;video.classList.remove('is-ready');
  $('placeholder').hidden=true;S.phase='setup';
  const name=e?.name||'';
  const reason=name==='NotAllowedError'?'카메라 권한이 허용되지 않았어요. 브라우저에서 카메라 사용을 허용해야 해요.':
    name==='NotFoundError'?'연결된 카메라가 없어요. 카메라가 있는 기기에서 다시 시도해요.':
    name==='NotReadableError'?'다른 앱이 카메라를 사용 중일 수 있어요. 앱을 닫고 다시 연결해요.':
    '카메라나 손 인식 모델이 준비되지 않았어요. 인터넷 연결을 확인한 후 다시 시도해요.';
  showCameraProblem('카메라를 시작하지 못했어요',reason);
 }
}
function drawHands(hands){
 const rect=$('viewer').getBoundingClientRect(),w=Math.round(rect.width),h=Math.round(rect.height),dpr=Math.min(window.devicePixelRatio||1,2);
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 if(!w||!h||!video.videoWidth||!video.videoHeight)return;
 const scale=Math.max(w/video.videoWidth,h/video.videoHeight),offX=(w-video.videoWidth*scale)/2,offY=(h-video.videoHeight*scale)/2;
 function xy(p){let x=offX+p.x*video.videoWidth*scale;return [S.facing==='user'?w-x:x,offY+p.y*video.videoHeight*scale]}
 for(const hand of hands){
  ctx.lineWidth=3;ctx.strokeStyle='#aaffda';ctx.shadowBlur=5;ctx.shadowColor='#1e7555';
  for(const [a,b] of CONNECTIONS){const q=xy(hand[a]),r=xy(hand[b]);ctx.beginPath();ctx.moveTo(...q);ctx.lineTo(...r);ctx.stroke();}
  ctx.shadowBlur=0;for(const t of [4,8,12,16,20]){const [x,y]=xy(hand[t]);ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fillStyle='#ffecab';ctx.fill();ctx.strokeStyle='#337e61';ctx.lineWidth=2;ctx.stroke();}
 }
}
function tick(){
 if(!isCamera()||!S.model||S.phase==='intro')return;
 const t=now();
 if(video.readyState>=2&&video.currentTime!==S.lastFrame){
  S.lastFrame=video.currentTime;S.firstVideoFrame ||= t;video.classList.add('is-ready');
  if(t-S.lastLightCheck>1500){
   S.lastLightCheck=t;const light=frameBrightness();
   S.lightChecked=light!==null;S.frameLightOk=light!==null&&light>=14;
   if(light!==null&&light<14){S.darkFrameSince ||= t;if(t-S.darkFrameSince>2800)showCameraProblem('화면이 너무 어두워요','밝은 곳에서 손을 비춰 봐. 계속 검으면 카메라를 바꿔 보거나 다시 연결할 수 있어.');}
   else{S.darkFrameSince=0;if(!$('cameraProblem').hidden)hideCameraProblem();}
  }
  try{
   const r=S.model.detectForVideo(video,t);S.camHands=r.landmarks||[];
   if(S.camHands.length)S.firstHandSeen=t;
   drawHands(S.camHands);
   if(S.phase==='setup'){cameraCalibration(t);}
   else evaluate(t);
  }catch(e){S.camHands=[];S.matchSince=0;}
  if(!S.camHands.length&&t-S.firstVideoFrame>7000&&!S.firstHandSeen&&S.darkFrameSince===0&&$('cameraProblem').hidden){
    showCameraProblem('손이 아직 안 보여요','한 손을 화면 가운데 조금 떨어뜨려 보여줘. 움직여도 안 보이면 카메라를 다시 연결해 봐.');
  }
 }else if(t-S.lastObserved>500){S.matchSince=0;$('meter').style.width='0%';}
 if(!S.firstVideoFrame&&S.model&&t-S.lastLightCheck>8000){showCameraProblem('카메라 영상을 확인할 수 없어요','카메라 권한이나 다른 앱의 카메라 사용을 확인한 뒤 다시 연결해 봐.');}
 S.raf=requestAnimationFrame(tick);
}
function cameraCalibration(t){
 if(S.phase!=='setup'||S.cameraReady)return;
 if(!S.lightChecked){
  $('cameraCheckText').textContent='화면 밝기를 확인하고 있어요…';return;
 }
 if(!S.frameLightOk){
  S.readySince=0;$('cameraCheckFill').style.width='0%';
  $('cameraCheckText').textContent='화면이 어두워요. 밝은 곳으로 옮겨 봐요.';return;
 }
 if(!S.camHands.length){
  S.readySince=0;$('cameraCheckFill').style.width='0%';
  $('cameraCheckText').textContent='손바닥이 보이도록 손을 들어줘!';return;
 }
 if(!S.readySince)S.readySince=t;
 const pct=Math.min(100,Math.round(100*(t-S.readySince)/650));
 $('cameraCheckFill').style.width=pct+'%';
 $('cameraCheckText').textContent='손을 찾았어! 조금만 더 보여줘.';
 if(pct>=100){
  S.cameraReady=true;S.readySince=0;
  S.phase=isMemory()?'memorize':'play';
  render();
  $('cameraCheck').hidden=true;
  message(isGarden()?'좋아! 주먹을 쥐고 첫 씨앗을 잡아보자.':'좋아! 손 모양을 따라해 봐.');
 }
}
function evaluate(t){
 if(S.phase!=='play')return;
 S.lastObserved=t;
 const ok=core.match(S.camHands,currentGoal());
 if(!S.readyToMatch){
  if(!ok){if(!S.rearmSince)S.rearmSince=t;if(t-S.rearmSince>300){S.readyToMatch=true;S.rearmSince=0;}}
  else S.rearmSince=0;
  $('cameraHoldFill').style.width='0%';$('viewer').dataset.match='no';message('손 모양을 한 번 바꾸고 다시 해볼까?');return;
 }
 if(!ok){
  S.matchSince=0;$('meter').style.width='0%';$('cameraHoldFill').style.width='0%';$('viewer').dataset.match='no';
  const need=currentGoal().length===2?'두 손을 함께 보여줘!':'노란 손가락은 쭉 펴고, 연한 손가락은 접어봐!';
  message(S.camHands.length===0?'손이 보이면 천천히 시작해!':need);return;
 }
 if(!S.matchSince)S.matchSince=t;
 const progress=Math.max(0,Math.min(1,(t-S.matchSince)/950));
 $('meter').style.width=Math.round(progress*100)+'%';
 $('cameraHoldFill').style.width=Math.round(progress*100)+'%';$('viewer').dataset.match='yes';
 message('좋아! 그 모양을 조금만 유지해!');
 if(progress>=1){S.readyToMatch=false;accept();}
}
function answerTouch(typeset){
 if(S.phase!=='play'||isCamera())return;
 if(core.match(typeset.map(x=>fakePose(x)),currentGoal()))accept();
 else{message('다른 모양이야. 기억한 손 모양을 다시 떠올려 봐!');}
}
function fakePose(kind){
 // Touch answers are intentionally explicit selection; never described as camera tracking.
 const pattern=core.PATTERNS[kind];if(!pattern)return [];
 const points=Array.from({length:21},()=>({x:.5,y:.85}));
 [[5,6,8],[9,10,12],[13,14,16],[17,18,20]].forEach(([a,b,c],i)=>{
  points[a]={x:.32+i*.11,y:.65};points[b]={x:.32+i*.11,y:.5};
  points[c]={x:.32+i*.11,y:pattern[i]===1?.19:.60};
 });
 return points;
}
function accept(){
 if(S.phase!=='play')return;
 S.phase='reward';S.matchSince=0;S.success++;sound();
 $('meter').style.width='100%';$('cameraHoldFill').style.width='100%';$('flowerLabel').textContent='🌼 '+S.success;
 $('choices').hidden=true;$('ready').hidden=true;
 if(isMemory()){
  const correct=current()[S.part];
  $('targetEmoji').innerHTML=handArt(correct);$('targetEmoji').classList.add('has-hands');$('targetTitle').textContent=core.TITLES[correct];
  updateSteps(false);
 }
 if(isGarden()){gardenUpdate();message(S.success%2===1?'🌰 씨앗을 잡았어!':'🌷 손을 펴서 꽃이 피었어!');}
 else message('🌼 성공! 손가락 꽃이 피었어!');
 renderGuide();
 $('next').hidden=false;
 $('next').textContent=isMemory()&&S.part<current().length-1?'다음 동작 →':'다음으로 →';
 S.winTimer=setTimeout(advance,isMemory()&&S.part<current().length-1?1700:2600);
}
function advance(){
 if(S.phase!=='reward')return;
 timeouts();
 if(isMemory()&&S.part<current().length-1){
  S.part++;S.phase='play';render();return;
 }
 S.round++;S.part=0;S.phase=isMemory()?'memorize':'play';
 if(S.round>=ROUNDS[S.mode].length){finish();return;}
 render();
}
function finish(){
 timeouts();stopCamera();S.phase='finish';
 $('finishInfo').textContent=isGarden()?'꽃 3송이를 피웠어!'+(S.kind==='touch'?' (그림을 골라서 완성한 꽃밭)':' (카메라 손동작으로 완성한 꽃밭)'):MODE[S.mode]+'에서 '+S.success+'번의 손동작을 해봤어!'+(S.kind==='touch'?' (화면 정답 선택 연습)':' (카메라 손 모양 인식)');
 $('transfer').textContent=isGarden()?'🌷 실제로도 해볼까? 씨앗이나 블록을 쥐었다 놓고, 손을 크게 펼치는 활동으로 이어갈 수 있어요. 이 게임은 손 힘을 평가하지 않아요.':S.mode==='fingers'?'🌷 이어서 실제로 해보기: 스티커 떼기·종이 집기·집게 열고 닫기로 이어가요. 손의 힘은 화면만으로 평가하지 않아요.':
  S.mode==='both'?'🌷 이어서 실제로 해보기: 두 손으로 종이를 잡고 찢기, 블록 맞추기 등을 해봐요.':
  S.mode==='memory'?'🌷 이어서 실제로 해보기: 두세 동작 순서를 보고 집게·블록·단추 활동에도 적용해 봐요.':
  '🌷 이어서 실제로 해보기: 작은 블록 잡기·옮기기, 엄지와 검지로 종이 집기 등에 연결해 봐요.';
 show('finish');
}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>modeSelected(b.dataset.mode)));
$('cameraStart').addEventListener('click',()=>start('camera'));
$('touchStart').addEventListener('click',()=>start('touch'));
$('ready').addEventListener('click',()=>{if(S.phase!=='memorize')return;S.phase='play';render();S.readyToMatch=true;});
$('next').addEventListener('click',advance);
$('home').addEventListener('click',reset);$('pause').addEventListener('click',reset);$('finishHome').addEventListener('click',reset);
$('again').addEventListener('click',()=>start(S.kind==='camera'?'camera':'touch'));
$('flip').addEventListener('click',()=>{if(!isCamera())return;stopCamera();S.facing=S.facing==='user'?'environment':'user';startCamera();});
$('retryCamera').addEventListener('click',()=>{if(!isCamera())return;stopCamera();startCamera();});
$('cameraToTouch').addEventListener('click',()=>{if(!isCamera())return;stopCamera();S.kind='touch';S.phase=isMemory()?'memorize':'play';render();message('화면에서 그림을 골라 볼까? 카메라 인식과는 다른 연습이야.');});
$('guideToggle').addEventListener('click',()=>{S.guideVisible=!S.guideVisible;$('guideToggle').setAttribute('aria-pressed',String(S.guideVisible));$('guideToggle').textContent=S.guideVisible?'👋 손 그림 숨기기':'👋 손 그림 보이기';renderGuide();});
$('mute').addEventListener('click',()=>{S.silent=!S.silent;$('mute').textContent=S.silent?'🔇 효과음':'🔊 효과음';});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&isCamera()){reset();}});
window.addEventListener('pagehide',()=>{stopCamera();if(audio){audio.close().catch(()=>{});audio=null;}});
modeSelected('garden');
})();
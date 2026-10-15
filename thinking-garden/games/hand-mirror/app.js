/* Moa Hand Mirror: browser-local visual observation, no recording, no upload. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const core=window.HandMirrorCore;
if(!core)throw new Error('Gesture matcher unavailable');
const CDN='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35';
const MODEL='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const POSES=['palm','fist','one','two','three'];
const MODE={copy:'모아 손 따라하기',fingers:'손가락 탐험',memory:'반짝손 기억길',both:'두 손 협동'};
const ROUNDS={
 copy:[['palm'],['fist'],['one'],['two'],['three'],['palm']],
 fingers:[['one'],['two'],['three'],['one'],['three'],['two']],
 memory:[['palm','one'],['one','fist'],['two','palm','fist'],['three','one','palm']],
 both:[['palm','palm'],['fist','fist'],['palm','fist'],['one','one']]
};
const CONNECTIONS=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17],[5,9],[9,13],[13,17]];
let S={mode:'copy',kind:'none',phase:'intro',round:0,part:0,success:0,token:0,raf:0,model:null,stream:null,facing:'user',lastFrame:-1,lastObserved:0,matchSince:0,readyToMatch:true,rearmSince:0,winTimer:0,silent:false,camHands:[],loading:false,guideVisible:true};
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
 const xs=[45,70,97,124],widths=[22,23,23,20],openTops=[30,17,27,44];
 let fingers='';
 for(let i=0;i<4;i++){
  const y=pattern[i]?openTops[i]:105,w=widths[i];
  fingers+='<rect x="'+xs[i]+'" y="'+y+'" width="'+w+'" height="'+(141-y)+'" rx="'+(w/2)+'" fill="#d9f7e5" stroke="#318363" stroke-width="4"/>';
 }
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 223" aria-hidden="true" focusable="false">'+
 '<path d="M49 119 Q35 96 23 102 Q11 110 22 130 L45 164" fill="#d9f7e5" stroke="#318363" stroke-width="4"/>'+
 fingers+
 '<rect x="38" y="116" width="117" height="90" rx="31" fill="#d9f7e5" stroke="#318363" stroke-width="4"/>'+
 pattern.map((opened,i)=>'<circle cx="'+(xs[i]+widths[i]/2)+'" cy="'+(opened?openTops[i]+11:113)+'" r="6" fill="'+(opened?'#51c28e':'#f1b65d')+'"/>').join('')+
 '</svg>';
}
function gestureFigure(kind,side=''){
 return '<div class="ghost-hand" data-pose="'+kind+'">'+handArt(kind)+'<small>'+ (side?side+' · ':'')+core.TITLES[kind]+'</small></div>';
}
function renderGuide(){
 const camera=isCamera(),preview=isMemory()&&S.phase==='memorize',recall=isMemory()&&!preview&&S.phase!=='reward';
 const active=camera&&!recall;
 $('game').classList.toggle('is-camera',camera);
 $('viewer').dataset.phase=preview?'memorize':S.phase;
 $('liveTask').hidden=!camera;
 $('liveTitle').textContent=preview?'순서를 보고 기억해!':recall?'기억한 손 모양 만들기!':S.phase==='reward'?'🌼 손동작 성공!':goalText();
 $('guideToggle').hidden=!camera||recall;
 $('cameraHold').hidden=!camera||preview;
 $('ghostGuides').hidden=!active||!S.guideVisible;
 $('ghostGuides').classList.toggle('is-hidden',!active||!S.guideVisible);
 if(!active){$('ghostGuides').replaceChildren();return;}
 const poses=preview?current():currentGoal();
 $('ghostGuides').innerHTML=poses.map((p,i)=>gestureFigure(p,preview?'순서 '+(i+1):poses.length>1?(i===0?'첫 손':'다음 손'):'')).join('');
 $('ghostGuides').classList.toggle('is-matched',S.phase==='reward');
}

const isCamera=()=>S.kind==='camera';
const isMemory=()=>S.mode==='memory';
const timeouts=()=>{if(S.winTimer)clearTimeout(S.winTimer);S.winTimer=0};
function show(id){for(const key of ['intro','game','finish'])$(key).hidden=key!==id;$('home').hidden=id==='intro';}
function message(s){$('message').textContent=s;$('viewerBadge').textContent=s;}
function sound(){if(S.silent)return;try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;if(!audio)audio=new A();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(670,audio.currentTime);o.frequency.linearRampToValueAtTime(930,audio.currentTime+.17);g.gain.setValueAtTime(.001,audio.currentTime);g.gain.exponentialRampToValueAtTime(.045,audio.currentTime+.02);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.26);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.28)}catch(e){}}
function stopCamera(){
 S.token++;
 if(S.raf)cancelAnimationFrame(S.raf);
 S.raf=0;
 if(S.stream){S.stream.getTracks().forEach(t=>t.stop());S.stream=null;}
 video.srcObject=null;
 if(S.model){try{S.model.close()}catch(e){}S.model=null;}
 S.camHands=[];S.lastFrame=-1;S.matchSince=0;S.lastObserved=0;S.loading=false;
 $('viewer').dataset.match='no';$('cameraHoldFill').style.width='0%';
 const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);
}
function reset(){timeouts();stopCamera();S.phase='intro';S.kind='none';show('intro');}
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
 const memoryPreview=isMemory()&&S.phase==='memorize';
 $('roundLabel').textContent=(S.round+1)+' / '+ROUNDS[S.mode].length;
 $('flowerLabel').textContent='🌼 '+S.success;
 $('viewName').textContent=MODE[S.mode];$('kindBadge').textContent=isCamera()?'📷 손 인식':'👆 화면 정답 고르기';
 $('taskTitle').textContent=isMemory()?'🧠 순서를 기억해 볼까?':MODE[S.mode];
 $('targetEmoji').innerHTML=memoryPreview?current().map(p=>handArt(p)).join('<span style="font-size:25px">→</span>'):isMemory()?'❔':currentGoal().map(p=>handArt(p)).join('');
 $('targetEmoji').classList.toggle('has-hands',!isMemory()||memoryPreview);
 $('targetTitle').textContent=memoryPreview?'동작 '+current().length+'개 기억하기':isMemory()?(S.part+1)+'번째 손동작!':goalText();
 $('targetHelp').textContent=memoryPreview?'다 살펴봤으면 아래 버튼을 눌러!':isMemory()?'방금 본 모양을 기억해서 만들어 봐!':isCamera()?'카메라 앞에서 손 모양을 바꾸어 봐!':'모양을 흉내 내며 답을 골라 봐!';
 $('ready').hidden=!memoryPreview;
 $('next').hidden=true;
 $('meter').style.width='0%';
 $('choices').hidden=isCamera()||memoryPreview;
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
 S.matchSince=0;S.lastObserved=0;S.rearmSince=0;
 if(memoryPreview){S.phase='memorize';message('모아가 보여준 순서를 기억해 볼까? 시간 제한은 없어!');}
 else if(S.phase!=='reward'){
  S.phase='play';message(isCamera()?'손을 보여줘! 모양이 맞으면 꽃이 피어.':'손 모양을 따라 한 뒤 알맞은 그림을 골라!');
 }
}
function start(kind){
 timeouts();stopCamera();
 S.kind=kind;S.round=0;S.part=0;S.success=0;S.phase=isMemory()?'memorize':'play';
 S.readyToMatch=true;S.guideVisible=true;$('guideToggle').setAttribute('aria-pressed','true');$('guideToggle').textContent='👋 손 그림 숨기기';show('game');render();
 if(kind==='camera')startCamera();
}
async function startCamera(){
 const own=++S.token;S.loading=true;S.model=null;S.camHands=[];
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
  S.model=model;S.loading=false;$('placeholder').hidden=true;renderGuide();
  if(S.phase==='memorize')message('동작 순서를 본 뒤 시작해!');else message('손을 천천히 보여줘. 조금 유지하면 인식해!');
  tick();
 }catch(e){
  if(own!==S.token)return;
  console.warn('hand mirror camera unavailable',e);
  stopCamera();S.kind='touch';
  $('placeholder').hidden=false;
  render();
  message('이 기기에서 카메라를 사용할 수 없어 화면 연습으로 바꿨어. 실제 손 인식은 아니야.');
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
  S.lastFrame=video.currentTime;
  try{const r=S.model.detectForVideo(video,t);S.camHands=r.landmarks||[];drawHands(S.camHands);evaluate(t);}
  catch(e){S.camHands=[];S.matchSince=0;}
 }else if(t-S.lastObserved>500){S.matchSince=0;$('meter').style.width='0%';}
 S.raf=requestAnimationFrame(tick);
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
  const need=currentGoal().length===2?'두 손을 함께 보여줘!':'손이 잘 보이게 조금 떨어져 보여줘!';
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
  $('targetEmoji').textContent=core.EMOJI[correct];$('targetTitle').textContent=core.TITLES[correct];
  updateSteps(false);
 }
 message('🌼 성공! 손가락 꽃이 피었어!');
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
 $('finishInfo').textContent=MODE[S.mode]+'에서 '+S.success+'번의 손동작을 해봤어!'+(S.kind==='touch'?' (화면 정답 선택 연습)':' (카메라 손 모양 인식)');
 $('transfer').textContent=S.mode==='fingers'?'🌷 이어서 실제로 해보기: 스티커 떼기·종이 집기·집게 열고 닫기로 이어가요. 손의 힘은 화면만으로 평가하지 않아요.':
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
$('guideToggle').addEventListener('click',()=>{S.guideVisible=!S.guideVisible;$('guideToggle').setAttribute('aria-pressed',String(S.guideVisible));$('guideToggle').textContent=S.guideVisible?'👋 손 그림 숨기기':'👋 손 그림 보이기';renderGuide();});
$('mute').addEventListener('click',()=>{S.silent=!S.silent;$('mute').textContent=S.silent?'🔇 효과음':'🔊 효과음';});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&isCamera()){reset();}});
window.addEventListener('pagehide',()=>{stopCamera();if(audio){audio.close().catch(()=>{});audio=null;}});
modeSelected('copy');
})();
(()=>{'use strict';
const $=s=>document.getElementById(s);
const tasks=[
{note:'시',en:'B',pitch:987.77,noteNumber:1,newFinger:'검지',closed:[1],intro:'리코더 뒤 구멍에 엄지를 놓아 봐.',front:'앞면 맨 위 구멍에 검지를 올려 봐.',scene:'첫 번째 꽃'},
{note:'라',en:'A',pitch:880,noteNumber:2,newFinger:'중지',closed:[1,2],intro:'검지는 그대로. 아래 구멍에 중지를 더 올려 봐.',front:'중지를 하나 더 올려 봐.',scene:'두 번째 꽃'},
{note:'솔',en:'G',pitch:783.99,noteNumber:3,newFinger:'약지',closed:[1,2,3],intro:'검지와 중지는 그대로. 약지를 한 개 더 올려 봐.',front:'약지를 하나 더 올려 봐.',scene:'세 번째 꽃'}
];
let state={phase:'welcome',index:0,sub:0,blooms:[false,false,false],practices:[false,false,false],verified:[false,false,false],mute:false,micEnabled:false,detectedPitch:0};
let audioCtx=null,stream=null,analyser=null,raf=0,buffer=null,micToken=0,stableFrom=0,firstMatch=0;
const sectionIds=['welcome','finger','sound','reward','finish'];
function section(phase){
 if(state.phase==='sound'&&phase!=='sound')stopMic();
 state.phase=phase;
 for(const id of sectionIds)$('screen-'+id).hidden=id!==phase;
 $('teacherPanel').open=false;
 const micToggle=$('micToggle');micToggle.textContent=state.mute?'🔇':'🔊';
 updateProgress();
}
function updateProgress(){
 for(let i=0;i<3;i++){
  const dot=$('progress-'+i),plant=$('plant-'+i);
  dot.classList.toggle('active',i===state.index&&state.phase!=='finish');
  dot.classList.toggle('bloomed',state.blooms[i]);
  dot.textContent=state.blooms[i]?'🌸':state.practices[i]?'🌱':i===state.index?'🌷':'🌱';
  plant.classList.toggle('bloom',state.blooms[i]);
  plant.classList.toggle('practice',state.practices[i]&&!state.blooms[i]);plant.setAttribute('aria-label',state.blooms[i]?'피어난 꽃':state.practices[i]?'연습한 꽃봉오리':'잠든 꽃');
 }
 const bloomCount=state.blooms.filter(Boolean).length;
 $('gardenCount').textContent='꽃 '+bloomCount+' / 3';
}
function balloon(message){$('speech').textContent=message;}
function say(text){
 if(state.mute||!('speechSynthesis' in window))return;
 try{window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ko-KR';u.rate=.78;u.pitch=1.08;window.speechSynthesis.speak(u)}catch(e){}
}
function promptStage(){const t=tasks[state.index];if(state.index===0&&state.sub===0)return t.intro;return t.front}
function side(){return state.index===0&&state.sub===0?'back':'front'}
function renderFingers(){
 const t=tasks[state.index],rear=side()==='back';
 $('fingerTitle').textContent=rear?'엄지!':t.newFinger+'!';
 $('fingerName').textContent=rear?'엄지':t.newFinger;
 $('fingerEmoji').textContent=rear?'👍':'👆';
 $('fingerSmall').textContent=rear?'뒤쪽 구멍':state.index===0?'맨 위 구멍':'그 아래 구멍';
 $('recorderSide').textContent=rear?'뒤쪽':'앞쪽';
 $('front-holes').hidden=rear;
 $('back-hole').hidden=!rear;
 for(let i=1;i<=3;i++){
  const hole=$('hole-'+i);
  hole.classList.toggle('covered',t.closed.includes(i));
  hole.classList.toggle('focus',!rear&&i===t.noteNumber);
 }
 $('back-hole').classList.toggle('focus',rear);
 $('fingerGo').innerHTML=rear?'<span class="huge">▶</span><span>다음!</span>':'<span class="huge">🎤</span><span>불어보기!</span>';
 balloon(rear?'👍 뒤에 엄지!':'👆 '+t.newFinger+'!');
 $('sceneNote').textContent=rear?'👍 뒤쪽 엄지':t.note+' · '+t.newFinger;
 section('finger');say(promptStage());
}
function begin(){
 state.index=0;state.sub=0;state.blooms=[false,false,false];state.practices=[false,false,false];state.verified=[false,false,false];
 renderFingers();
}
function nextFinger(){
 if(state.index===0&&state.sub===0){state.sub=1;renderFingers();return}
 state.practices[state.index]=true;
 $('soundNote').textContent=tasks[state.index].note;
 balloon('🎵 소리를 들려줘!');
 $('sceneNote').textContent='🎶 '+tasks[state.index].note+' 소리';
 $('soundStatus').className='pitchstatus';
 $('soundStatus').textContent='🎤 준비됐어?';
 $('listen').disabled=false;
 $('listen').innerHTML='<span class="huge">🎤</span><span>시작!</span>';
 section('sound');say(tasks[state.index].note+' 소리를 불어 보자.');
}
function playNote(freq,duration=.46){
 try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;const ctx=new A(),o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=freq;g.gain.setValueAtTime(.0001,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.065,ctx.currentTime+.025);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration);o.connect(g).connect(ctx.destination);o.start();o.stop(ctx.currentTime+duration+.02);o.onended=()=>ctx.close().catch(()=>{})}catch(e){}
}
function stopMic(){
 micToken++;if(raf)cancelAnimationFrame(raf);raf=0;
 if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
 if(audioCtx){audioCtx.close().catch(()=>{});audioCtx=null}
 analyser=null;buffer=null;stableFrom=0;firstMatch=0;state.micEnabled=false;
 $('listen').disabled=false;$('listen').innerHTML='<span class="huge">🎤</span><span>시작!</span>';
}
function estimatePitch(buf,sr){
 let pow=0;for(let i=0;i<buf.length;i++){pow+=buf[i]*buf[i]}
 const rms=Math.sqrt(pow/buf.length);if(rms<.016)return null;
 const lo=Math.max(1,Math.floor(sr/1080)),hi=Math.min(buf.length/2,Math.ceil(sr/730));let bestLag=0,best=-1;
 for(let lag=lo;lag<=hi;lag++){let dot=0,aa=0,bb=0;for(let i=0;i<buf.length-lag;i+=2){const a=buf[i],b=buf[i+lag];dot+=a*b;aa+=a*a;bb+=b*b}const corr=dot/Math.sqrt(aa*bb+1e-10);if(corr>best){best=corr;bestLag=lag}}
 return best>.81?sr/bestLag:null;
}
async function beginMic(){
 if(state.phase!=='sound')return;
 if(state.micEnabled){stopMic();$('soundStatus').className='pitchstatus';$('soundStatus').textContent='🎤 다시 시작할 수 있어!';return;}
 if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){problem('🎤 마이크 지원이 안 돼요');return}
 stopMic();state.micEnabled=true;
 const token=micToken;
 $('soundStatus').className='pitchstatus listening';$('soundStatus').textContent='🎤 듣고 있어요…';
 $('listen').disabled=false;$('listen').innerHTML='<span class="huge">■</span><span>그만!</span>';
 if(window.speechSynthesis)window.speechSynthesis.cancel();
 try{
  stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
  if(token!==micToken||state.phase!=='sound'){stopMic();return}
  const A=window.AudioContext||window.webkitAudioContext;if(!A)throw Error('AudioContext missing');
  audioCtx=new A();await audioCtx.resume();if(token!==micToken||state.phase!=='sound'){stopMic();return}
  analyser=audioCtx.createAnalyser();analyser.fftSize=4096;analyser.smoothingTimeConstant=0;
  audioCtx.createMediaStreamSource(stream).connect(analyser);
  buffer=new Float32Array(analyser.fftSize);
  let count=0;
  function loop(){
   if(token!==micToken||state.phase!=='sound'||!analyser)return;
   analyser.getFloatTimeDomainData(buffer);
   const f=estimatePitch(buffer,audioCtx.sampleRate),target=tasks[state.index].pitch;
   if(f){
    const cents=Math.abs(1200*Math.log2(f/target));
    if(cents<85){
     if(!stableFrom)stableFrom=performance.now();
     count++;
     $('soundStatus').className='pitchstatus listening';
     $('soundStatus').textContent='🎶 좋아, 조금만 더!';
     if(count>=10&&performance.now()-stableFrom>330){state.detectedPitch=f;success('microphone');return}
    }else{stableFrom=0;count=0;$('soundStatus').textContent='🎶 '+tasks[state.index].note+' 소리를 찾아봐!'}
   }else{stableFrom=0;count=0}
   raf=requestAnimationFrame(loop);
  }
  raf=requestAnimationFrame(loop);
 }catch(err){stopMic();problem(err?.name==='NotAllowedError'?'🎤 마이크 권한을 확인해 주세요':'🎤 소리를 듣지 못했어요')}
}
function problem(message){$('soundStatus').className='pitchstatus problem';$('soundStatus').textContent=message;balloon('🌷 괜찮아!');$('listen').disabled=false}
function success(origin){
 if(state.phase!=='sound')return;
 stopMic();
 state.verified[state.index]=origin;
 state.blooms[state.index]=true;
 updateProgress();
 $('rewardFlower').textContent=['🌼','🌷','🌸'][state.index];
 $('rewardTitle').textContent='꽃이 피었어!';
 $('rewardNote').textContent=origin==='microphone'?'🎶 소리가 들렸어!':'👩‍🏫 선생님이 소리를 확인했어';
 $('rewardGo').textContent=state.index===2?'🌈 완성!':'▶ 다음!';
 balloon('🌸 꽃이 피었어!');
 $('sceneNote').textContent='🌸 꽃 '+state.blooms.filter(Boolean).length+'/3';
 section('reward');playNote(tasks[state.index].pitch,.31);say('꽃이 피었어! 멋진 소리야!');
}
function practiceOnly(){
 if(state.phase!=='sound')return;
 stopMic();
 state.practices[state.index]=true;
 $('rewardFlower').textContent='🌱';
 $('rewardTitle').textContent='다음에 또!';
 $('rewardNote').textContent='오늘은 손가락 연습까지';
 $('rewardGo').textContent=state.index===2?'🌈 정원 보기':'▶ 다음!';
 balloon('🌱 다음에 또 해보자!');
 $('sceneNote').textContent='🌱 손가락 연습';
 section('reward');say('손가락을 연습했네. 다음에 또 해보자!');
}
function advance(){
 if(state.index===2){
  $('finishEmoji').textContent=state.blooms.some(Boolean)?'🌼🌷🌸':'🌱🌱🌱';
  $('finishTitle').textContent=state.blooms.every(Boolean)?'꽃이 활짝!':'오늘은 여기까지!';
  balloon('🌼 또 만나!');
  section('finish');say('오늘의 모험 끝! 또 놀자!');return;
 }
 state.index++;state.sub=1;renderFingers();
}
function home(){stopMic();state.phase='welcome';state.index=0;state.sub=0;state.blooms=[false,false,false];state.practices=[false,false,false];balloon('🌱 꽃이 자고 있어!');$('sceneNote').textContent='🌱 잠든 꽃 친구들';section('welcome')}
function jump(){const i=Number($('levelChoose').value);if(!Number.isInteger(i)||i<0||i>2)return;stopMic();state.index=i;state.sub=i===0?0:1;renderFingers()}
function toggleMute(){state.mute=!state.mute;$('micToggle').textContent=state.mute?'🔇':'🔊';if(state.mute&&window.speechSynthesis)window.speechSynthesis.cancel()}
$('start').addEventListener('click',begin);
$('fingerGo').addEventListener('click',nextFinger);
$('repeat').addEventListener('click',()=>say(promptStage()));
$('preview').addEventListener('click',()=>playNote(tasks[state.index].pitch));
$('listen').addEventListener('click',beginMic);
$('playTarget').addEventListener('click',()=>playNote(tasks[state.index].pitch));
$('practiceSkip').addEventListener('click',practiceOnly);
$('teacherConfirm').addEventListener('click',()=>success('teacher'));
$('rewardGo').addEventListener('click',advance);
$('again').addEventListener('click',home);
$('home').addEventListener('click',home);
$('micToggle').addEventListener('click',toggleMute);
$('introAudio').addEventListener('click',()=>say('안녕! 모아랑 리코더로 잠든 꽃을 깨워 보자. 시작 버튼을 눌러 봐.'));
$('jump').addEventListener('click',jump);
window.addEventListener('pagehide',stopMic);
home();
})();

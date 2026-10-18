"use strict";
(()=>{
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const NOTES=["도","레","미","파","솔","라","시","높은 도"];
const COLORS=["#f19b8f","#f3b880","#ead277","#9bcc91","#8dbfcf","#b4a2d8","#e5aac8","#f19b8f"];
const FREQ=[261.63,293.66,329.63,349.23,392,440,493.88,523.25];
const MODES={
 echo:{title:"모아의 소리를 듣고 따라해!",desc:"소리를 들은 다음 같은 순서로 눌러요.",label:"리듬 대화",help:"귀로 듣고 같은 순서로 색깔 악기를 눌러요. 틀려도 다시 듣고 계속할 수 있어요.",pad:"순서대로 눌러요"},
 memory:{title:"반짝인 순서를 기억해!",desc:"불빛을 보고 같은 순서로 눌러요.",label:"기억의 불빛",help:"차례로 반짝이는 색깔 악기를 기억했다가 같은 순서로 눌러요.",pad:"반짝인 순서대로 눌러요"},
 missing:{title:"어떤 음이 사라졌을까?",desc:"전체 음악을 듣고 빠진 음을 찾아요.",label:"사라진 음",help:"음악을 먼저 듣고, 두 번째 들을 때 빈칸에 빠진 음을 찾아요.",pad:"빈칸에 맞는 음을 눌러요"},
 compare:{title:"두 음악이 똑같을까?",desc:"첫 번째와 두 번째 음악을 듣고 비교해요.",label:"같을까? 다를까?",help:"두 음악을 들은 뒤 같은지 다른지 선택해요. 변화가 작아지면 다시 들어도 좋아요.",pad:"아래에서 같은지 다른지 골라요"},
 signal:{title:"초록이면 연주! 빨강이면 쉬기!",desc:"신호를 보고 연주하거나 잠시 멈춰요.",label:"신호를 기다려",help:"초록 불일 때 표시된 음을 눌러요. 빨강 불에서는 기다려요. 각 신호는 잠깐씩 나타나요.",pad:"초록 신호에서만 연주해요"},
 composer:{title:"내 손으로 짧은 노래 만들기",desc:"색깔 악기를 눌러 나만의 선율을 만들어요.",label:"꼬마 작곡가",help:"색깔 악기를 눌러 4개 이상의 음을 만들고, 완성한 노래를 다시 들어요. 이 기기에서만 저장할 수 있어요.",pad:"음을 눌러 순서대로 만들어요"},
 ensemble:{title:"나의 음으로 합주를 완성해!",desc:"전체 음악은 흐르고, 맡은 음만 연주해요.",label:"우리들의 합주단",help:"1번 또는 2번 역할을 고르세요. 음악 전체가 들리는 동안 내 음만 화면에 강조돼요. 화면 악기를 누를 때만 반응을 확인해요.",pad:"내 차례의 음만 연주해요"},
 maze:{title:"어떤 길이 같은 소리일까?",desc:"출발점의 선율과 똑같은 길을 찾아요.",label:"소리 미로",help:"출발점의 짧은 음악을 듣고, 왼쪽·오른쪽 길의 소리를 각각 들어본 뒤 같은 길을 선택해요.",pad:"길의 소리를 먼저 비교해요"}
};
const BARS=5;
const state={mode:"echo",level:2,range:5,round:1,phase:"ready",seq:0,sound:true,pattern:[],alt:[],reply:[],answer:-1,missing:-1,same:false,question:0,signal:[],signalStep:0,signalResponded:false,signalWrong:false,score:0,role:0,ensemble:[],playingBeat:0,attempts:0,seenIndex:-1,reward:"",playing:false,composer:[]};
const cvs=$("#scene"), c=cvs.getContext("2d");
let audio=null, raf=0, toastTimer=0;const padEls=$$(".pad");
function palette(){return state.range===3?[0,2,4]:state.range===5?[0,1,2,4,5]:[0,1,2,3,4,5,6,7]}
function noteIndex(n){return NOTES.indexOf(n)}
function noteAt(i){return NOTES[i]}
function pretty(n){return n==="높은 도"?"도↑":n}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function shuffle(a){return a.slice().sort(()=>Math.random()-.5)}
function seqNotes(len){const pool=palette();const res=[];for(let i=0;i<len;i++){let p=pick(pool);if(res.length&&pool.length>2&&Math.random()>.35){while(p===res.at(-1))p=pick(pool)}res.push(p)}return res}
function label(msg,sub=""){ $("#prompt").textContent=msg;$("#subPrompt").textContent=sub;$("#scene").setAttribute("aria-label",MODES[state.mode].label+": "+msg)}
function feedback(s){$("#feedback").textContent=s}
function button(name,action,sub="",cls=""){const b=document.createElement("button");b.type="button";b.className=cls;b.innerHTML="<b></b><small></small>";b.querySelector("b").textContent=name;b.querySelector("small").textContent=sub;b.onclick=action;return b}
function choices(items){const area=$("#choices");area.replaceChildren();for(const it of items)area.appendChild(button(it.label,it.action,it.sub||"",it.cls||""));area.hidden=!items.length}
function setPhase(phase){state.phase=phase;$("#start").disabled=["show","listen","signal-running","ensemble-running","composer-listen"].includes(phase);$("#replay").disabled=["ready","complete","signal-running","ensemble-running","composer-listen"].includes(phase);updatePads();render()}
function updatePads(){const allowed=palette();for(const p of padEls){const idx=noteIndex(p.dataset.note),on=allowed.includes(idx),special=state.mode==="ensemble"&&state.role!==0&&idx%2!==state.role-1;p.classList.toggle("dim",!on||special);p.disabled=!on||state.mode==="compare"||state.mode==="maze"||state.phase==="show"||state.phase==="listen"||state.phase==="composer-listen";p.setAttribute("aria-disabled",String(p.disabled))}
 $("#padHelp").textContent=MODES[state.mode].pad;
 $(".instrument-panel").hidden=state.mode==="compare"||state.mode==="maze";
}
function setRound(){const total=state.mode==="composer"?1:BARS;$("#roundLabel").textContent=state.mode==="composer"?"나의 작품":state.round+" / "+total;$("#roundFill").style.width=((state.round-1)/total*100)+"%"}
function resetAudio(){if(audio){audio.close().catch(()=>{});audio=null}}
function invalidate(){state.seq++;state.playing=false;cancelAnimationFrame(raf);raf=0;resetAudio();state.seenIndex=-1;padEls.forEach(p=>p.classList.remove("flash"))}
function reset(keepMode=true){invalidate();state.round=1;state.score=0;state.phase="ready";state.pattern=[];state.alt=[];state.reply=[];state.signal=[];state.signalStep=0;state.attempts=0;state.answer=-1;state.reward="";state.playingBeat=0;state.question=0;choices([]);$("#start").textContent="놀이 시작";label("시작을 눌러요","준비되면 음악을 들어요");feedback("같은 음악도 여러 방법으로 즐길 수 있어요.");setRound();updatePads();render()}
function changeMode(mode){if(!MODES[mode])return;state.mode=mode;$$(".mode-card").forEach((b,i)=>{const on=b.dataset.mode===mode;b.classList.toggle("on",on);b.setAttribute("aria-pressed",String(on))});$("#modeTag").textContent=(Object.keys(MODES).indexOf(mode)+1)+" / 8 · "+MODES[mode].label;$("#gameTitle").textContent=MODES[mode].title;$("#gameDescription").textContent=MODES[mode].desc;$("#how").textContent=MODES[mode].help;reset();if(mode==="composer"){try{const v=JSON.parse(localStorage.getItem("ulmoaPlaylabComposerV1")||"[]");if(Array.isArray(v)&&v.length<=16&&v.every(x=>Number.isInteger(x)&&x>=0&&x<=7))state.composer=v}catch(e){}}
 render()}
async function ensureAudio(){if(!state.sound)return null;try{if(!audio){const AC=window.AudioContext||window.webkitAudioContext;if(!AC){feedback("이 환경은 소리가 지원되지 않아요.");return null}audio=new AC()}if(audio.state==="suspended")await audio.resume();return audio}catch(e){feedback("소리를 시작하지 못했어요. 기기의 소리 설정을 확인해 주세요.");return null}}
function tone(idx,dur=.32,volume=.14){const ac=audio;if(!state.sound||!ac||ac.state==="closed")return;const now=ac.currentTime+.004,g=ac.createGain();g.gain.setValueAtTime(.0005,now);g.gain.exponentialRampToValueAtTime(volume,now+.018);g.gain.exponentialRampToValueAtTime(.0005,now+dur+.1);g.connect(ac.destination);
 for(const [mul,shape,vol] of [[1,"triangle",1],[2,"sine",.17]]){const o=ac.createOscillator(),gn=ac.createGain();o.type=shape;o.frequency.value=FREQ[idx]*mul;gn.gain.value=vol;o.connect(gn);gn.connect(g);o.start(now);o.stop(now+dur+.12)}}
function padFlash(idx,ms=250){const p=padEls[idx];if(!p)return;p.classList.add("flash");clearTimeout(p._flashTimer);p._flashTimer=setTimeout(()=>p.classList.remove("flash"),ms)}
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
function alive(ticket){return ticket===state.seq}
async function playNotes(notes,{visual=false,interval=620,missing=-1,token=state.seq}={}){
 await ensureAudio();if(!alive(token))return false;
 for(let i=0;i<notes.length;i++){if(!alive(token))return false;state.seenIndex=visual?i:-1;state.question=missing;const idx=notes[i];if(i!==missing){tone(idx,.25);if(visual)padFlash(idx,Math.max(200,interval*.64))}render();await wait(interval);if(!alive(token))return false}
 state.seenIndex=-1;render();return true
}
function lengthForLevel(){return [0,2,3,4][state.level]+Math.floor((state.round-1)/3)}
function difficultyInterval(){return [0,790,610,460][state.level]}
async function openRound(regenerate=true){
 invalidate();const token=state.seq;state.reply=[];state.seenIndex=-1;state.attempts=0;choices([]);setRound();
 if(regenerate){const len=lengthForLevel();state.pattern=seqNotes(len);state.alt=[];state.missing=-1;
  if(state.mode==="missing")state.missing=Math.floor(Math.random()*len);
  if(state.mode==="compare"){state.same=Math.random()<.5;state.alt=state.pattern.slice();if(!state.same){const idx=Math.floor(Math.random()*len),other=palette().filter(x=>x!==state.pattern[idx]);state.alt[idx]=pick(other)}}
  if(state.mode==="maze"){state.same=Math.random()<.5;state.alt=state.pattern.slice();const idx=Math.floor(Math.random()*len),other=palette().filter(x=>x!==state.pattern[idx]);state.alt[idx]=pick(other);state.answer=state.same?0:1}
  if(state.mode==="signal"){state.signal=Array.from({length:6+state.level},(_,i)=>({on:i===0?true:Math.random()<.66,note:pick(palette())}));state.signalStep=0;state.signalWrong=false;state.signalResponded=false}
  if(state.mode==="ensemble"){state.ensemble=Array.from({length:16},(_,i)=>({note:pick(palette()),beat:i}));state.role=state.role||1;state.playingBeat=0}
 }
 if(state.mode==="composer"){composerStart();return}
 if(state.mode==="signal"){await beginSignal(token);return}
 if(state.mode==="ensemble"){await beginEnsemble(token);return}
 setPhase("show");$("#start").textContent="진행 중";label(state.mode==="memory"?"색깔 순서를 봐요":"음악을 잘 들어요",state.mode==="memory"?"반짝이는 순서를 기억해요":"아직 대답하지 않아도 돼요.");
 if(state.mode==="echo"||state.mode==="memory"){const ok=await playNotes(state.pattern,{visual:state.mode==="memory",interval:difficultyInterval(),token});if(!ok)return;state.reply=[];setPhase("answer");label("이제 내 차례!","같은 순서로 악기를 눌러요");feedback("기억나는 순서대로 눌러보세요.");}
 if(state.mode==="missing"){if(!await playNotes(state.pattern,{visual:true,interval:difficultyInterval(),token}))return;await wait(480);if(!alive(token))return;label("이번엔 어떤 음이 빠졌을까?","물음표 자리에 맞는 음을 골라요.");if(!await playNotes(state.pattern,{visual:true,interval:difficultyInterval(),missing:state.missing,token}))return;setPhase("answer");feedback("빈칸에 들어갈 음을 찾아 눌러요.");}
 if(state.mode==="compare"){if(!await playNotes(state.pattern,{interval:difficultyInterval(),token}))return;await wait(500);if(!alive(token))return;label("두 번째 음악을 들어요","처음과 같은지 귀로 비교해요.");if(!await playNotes(state.alt,{interval:difficultyInterval(),token}))return;setPhase("answer");choices([{label:"똑같아요",sub:"=",action:()=>answerChoice(state.same===true)},{label:"달라요",sub:"≠",action:()=>answerChoice(state.same===false)}]);label("똑같을까? 다를까?","아래에서 하나를 골라요.");feedback("잘 듣고 비교했어요. 어떤 것 같나요?");}
 if(state.mode==="maze"){if(!await playNotes(state.pattern,{interval:difficultyInterval(),token}))return;setPhase("answer");showMazeChoices();label("왼쪽과 오른쪽 길을 들어봐요","처음 들었던 소리와 같은 길은 어디일까요?");feedback("길의 소리를 들어본 뒤 선택해요.");}
}
function showMazeChoices(){choices([
 {label:"왼쪽 길 듣기",sub:"왼쪽 소리",action:()=>previewMaze(0)},
 {label:"오른쪽 길 듣기",sub:"오른쪽 소리",action:()=>previewMaze(1)},
 {label:"왼쪽으로",sub:"왼쪽 선택",cls:"main-choice",action:()=>answerChoice(state.answer===0)},
 {label:"오른쪽으로",sub:"오른쪽 선택",cls:"main-choice",action:()=>answerChoice(state.answer===1)}
 ])}
async function previewMaze(side){if(state.phase!=="answer")return;invalidate();const token=state.seq;state.phase="listen";choices([]);label(side===0?"왼쪽 길을 들어요":"오른쪽 길을 들어요","소리가 끝나면 길을 골라요.");await playNotes(side===state.answer?state.pattern:state.alt,{interval:difficultyInterval(),token});if(!alive(token))return;setPhase("answer");showMazeChoices();label("어느 길로 갈까요?","처음과 같은 음악이 들린 길을 골라요.")}
function answerChoice(correct){if(state.phase!=="answer")return;if(correct){finishRound("좋아! 소리를 잘 구별했어.")}else{state.attempts++;feedback("조금 달랐네. 다시 듣고 고를 수 있어요.");label("다시 한 번 들어볼까?","여러 번 들어도 괜찮아요.");}}
function finishRound(message){
 if(!["answer","signal-running","ensemble-running"].includes(state.phase))return;
 state.seq++;state.phase="feedback";state.score++;feedback(message);label("잘했어!","다음 놀이가 곧 시작돼요.");choices([]);$("#start").textContent="다음 놀이";setRound();$("#roundFill").style.width=(state.round/BARS*100)+"%";render();const ticket=state.seq;
 if(state.round>=BARS){setTimeout(()=>{if(!alive(ticket))return;state.phase="complete";label("이야기를 완성했어!","또 하고 싶으면 처음부터 시작해요.");feedback("다섯 번의 놀이를 모두 마쳤어요. 실제 붐웨커 연주는 별도로 확인해요.");$("#start").textContent="처음부터 다시";$("#start").disabled=false;render()},800)}
 else setTimeout(()=>{if(!alive(ticket))return;state.round++;openRound(true).catch(err=>fail(err))},950)
}
function fail(err){invalidate();state.phase="ready";label("잠시 멈췄어요","다시 시작을 누를 수 있어요.");feedback("기기에 문제가 생겼어요: "+err.message);$("#start").disabled=false;render()}
function padInput(idx){
 padFlash(idx,190);if(state.sound){ensureAudio().then(()=>tone(idx,.24,.13)).catch(()=>{})}
 if(state.phase==="composer"){if(state.composer.length>=([0,8,12,16][state.level])){feedback("음표 칸을 모두 채웠어요. 만들어진 노래를 들어봐요.");return}state.composer.push(idx);try{localStorage.setItem("ulmoaPlaylabComposerV1",JSON.stringify(state.composer))}catch(e){}composerActions();render();return}
 if(state.phase==="signal-running"){const step=state.signal[state.signalStep];if(!step||state.signalResponded)return;if(!step.on){state.signalWrong=true;feedback("빨간 신호에서는 잠깐 쉬어요.");render();return}if(step.note===idx){state.signalResponded=true;state.score++;feedback("초록 신호에 맞게 연주했어요.");}else feedback("이번에는 표시된 다른 색을 찾아볼까요?");render();return}
 if(state.phase==="ensemble-running"){const now=state.playingBeat,eligible=state.ensemble.find(e=>!e.done&&Math.abs(e.beat-now)<.42&&e.note===idx&&roleFits(e.note));if(eligible){eligible.done=true;state.score++;feedback("내 차례의 음을 연주했어요.");}else feedback("내 차례를 기다렸다가 해당 음을 연주해요.");render();return}
 if(state.phase!=="answer")return;
 if(state.mode==="missing"){if(idx===state.pattern[state.missing])finishRound("빠진 음을 찾았어!");else{state.attempts++;feedback("조금 다른 소리야. 다시 들어보고 찾아볼까?");}return}
 if(state.mode!=="echo"&&state.mode!=="memory")return;
 const next=state.pattern[state.reply.length];if(next===idx){state.reply.push(idx);if(state.reply.length===state.pattern.length)finishRound("같은 순서로 완성했어!");else{feedback(state.reply.length+"개를 기억했어요. 다음 소리는 뭘까?");render()}}
 else{state.attempts++;feedback("괜찮아. 같은 순서로 다시 들어볼 수 있어요.");if(state.attempts>=2){label("힌트를 줄게","다시 듣기를 누르면 천천히 들려요.")}render()}
}
function composerActions(){choices([
 {label:"내 노래 듣기",sub:"음악 재생",cls:"main-choice",action:()=>listenComposition()},
 {label:"하나 지우기",sub:"마지막 음",action:()=>{state.composer.pop();composerSave();composerActions();render()}},
 {label:"다시 만들기",sub:"모든 음 삭제",action:()=>{state.composer=[];composerSave();composerActions();render()}},
 {label:"이 기기에 저장",sub:"기기 안에만 보관",action:()=>{composerSave();feedback("이 기기에 저장했어요. 다른 기기로 자동 공유되지는 않아요.")}}
]);$("#roundLabel").textContent=state.composer.length+" / "+[0,8,12,16][state.level]+"음";$("#roundFill").style.width=(state.composer.length/[0,8,12,16][state.level]*100)+"%";}
function composerSave(){try{localStorage.setItem("ulmoaPlaylabComposerV1",JSON.stringify(state.composer))}catch(e){}}
function composerStart(){state.phase="composer";label("색깔 악기로 노래를 만들어요","4개 이상의 음을 만들면 들어볼 수 있어요.");feedback("악기를 누를 때마다 선율이 하나씩 추가돼요.");composerActions();updatePads();render();$("#start").textContent="작곡 중"}
async function listenComposition(){if(state.phase!=="composer"||state.composer.length<4){feedback("음표를 4개 이상 넣으면 노래를 들을 수 있어요.");return}invalidate();const ticket=state.seq;state.phase="composer-listen";choices([]);updatePads();label("내가 만든 노래를 들어요","음표가 차례대로 빛나요.");await playNotes(state.composer,{visual:true,interval:([0,650,540,450][state.level]),token:ticket});if(!alive(ticket))return;state.phase="composer";updatePads();composerActions();label("내가 만든 노래!","다시 들어보거나 음을 더 추가해요.");feedback("내가 고른 음으로 만든 멜로디예요.")}
async function beginSignal(token){
 setPhase("signal-running");state.signalStep=0;state.score=0;choices([]);$("#start").textContent="신호 진행 중";$("#replay").disabled=true;const period=[0,2050,1660,1420][state.level];
 for(let i=0;i<state.signal.length;i++){
  if(!alive(token))return;state.signalStep=i;state.signalResponded=false;state.signalWrong=false;state.seenIndex=-1;
  const s=state.signal[i];label(s.on?"초록! "+pretty(noteAt(s.note))+" 연주":"빨강! 기다려요",s.on?"표시된 음을 눌러요":"아무것도 누르지 않고 기다려요");feedback("신호 "+(i+1)+" / "+state.signal.length);render();
  await wait(period);
  if(!alive(token))return;
  if(!s.on&&!state.signalWrong){state.score++;feedback("멈추는 신호를 지켰어요.")}
 }
 if(!alive(token))return;
 state.phase="answer";feedback("신호 "+state.signal.length+"개 중 화면 입력으로 "+state.score+"개 반응했어요.");finishRound("멈추고 연주하는 연습을 마쳤어요. ("+state.score+"/"+state.signal.length+")");
}
function roleFits(idx){return state.role===0||idx%2===state.role-1}
async function beginEnsemble(token){
 state.phase="answer";label("합주 역할을 골라요","1번·2번 중 내 담당 음을 선택해요.");const make=()=>choices([
 {label:"1번 연주자",sub:"1·3·5·7번째 색",cls:state.role===1?"main-choice":"",action:()=>{state.role=1;make();render()}},
 {label:"2번 연주자",sub:"2·4·6·8번째 색",cls:state.role===2?"main-choice":"",action:()=>{state.role=2;make();render()}},
 {label:"모두 함께",sub:"모든 음",cls:state.role===0?"main-choice":"",action:()=>{state.role=0;make();render()}},
 {label:"합주 출발",sub:"노래 시작",action:()=>startEnsemble(token)}
 ]);make();updatePads();render();$("#start").textContent="합주 출발"}
async function startEnsemble(initialToken){if(!alive(initialToken))return;invalidate();const token=state.seq;state.phase="ensemble-running";state.playingBeat=-2;state.ensemble.forEach(e=>e.done=false);choices([]);updatePads();$("#start").textContent="합주 중";label("둘, 하나, 출발!","내 역할의 색깔이 올 때만 연주해요.");await ensureAudio();if(!alive(token))return;
 const tempo=[0,790,640,520][state.level],start=performance.now();
 for(let i=0;i<state.ensemble.length;i++){
  if(!alive(token))return;
  const e=state.ensemble[i];state.playingBeat=i;
  tone(e.note,.29,.10);feedback("마디 "+(Math.floor(i/4)+1)+"/4 · 전체 음악은 그대로 들려요.");render();
  await wait(tempo);if(!alive(token))return;
 }
 state.phase="answer";const achieved=state.ensemble.filter(x=>x.done&&roleFits(x.note)).length;finishRound("합주 끝! 화면 입력으로 "+achieved+"개의 담당 음을 맞췄어요.");
}
function replay(){
 if(state.mode==="composer"){listenComposition();return}
 if(state.mode==="signal"||state.mode==="ensemble"){reset();openRound(true).catch(fail);return}
 if(state.phase==="ready"||state.phase==="complete"){feedback("시작을 누르면 첫 음악이 들려요.");return}
 if(state.mode==="maze"){invalidate();const tk=state.seq;state.phase="show";choices([]);label("처음 소리를 다시 들어요","듣고 나서 어느 길인지 선택해요.");playNotes(state.pattern,{interval:difficultyInterval(),token:tk}).then(ok=>{if(!ok)return;setPhase("answer");showMazeChoices();label("어느 길이 똑같을까?","왼쪽과 오른쪽 길을 다시 들어볼 수 있어요.")});return}
 openRound(false).catch(fail);
}
function start(){
 if(state.mode==="composer"){if(state.phase!=="composer")composerStart();return}
 if(state.phase==="complete"){reset();openRound(true).catch(fail);return}
 if(state.phase==="ready"||state.phase==="feedback"||state.phase==="answer"){openRound(state.phase==="ready"||state.phase==="feedback").catch(fail)}
}
function ui(){
 $$(".mode-card").forEach(b=>b.addEventListener("click",()=>changeMode(b.dataset.mode)));
 padEls.forEach(p=>p.addEventListener("pointerdown",e=>{if(p.disabled)return;e.preventDefault();padInput(noteIndex(p.dataset.note))}));
 $("#start").addEventListener("click",start);$("#replay").addEventListener("click",replay);$("#reset").addEventListener("click",()=>reset());
 $("#sound").addEventListener("click",()=>{state.sound=!state.sound;$("#sound").textContent=state.sound?"소리 켜짐":"소리 꺼짐";$("#sound").setAttribute("aria-pressed",String(state.sound));if(!state.sound)resetAudio();feedback(state.sound?"소리를 켰어요.":"소리를 껐어요.")});
 $("#level").addEventListener("change",e=>{state.level=Number(e.target.value);reset();feedback("난이도를 바꿨어요. 준비되면 다시 시작해요.")});
 $("#range").addEventListener("change",e=>{state.range=Number(e.target.value);reset();feedback("사용할 음을 "+state.range+"개로 바꿨어요.")});
 document.addEventListener("keydown",e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||/^(SELECT|INPUT|TEXTAREA)$/.test(document.activeElement.tagName))return;if(/^[1-8]$/.test(e.key)){const idx=Number(e.key)-1;if(palette().includes(idx)&&!padEls[idx].disabled){e.preventDefault();padInput(idx)}}});
 document.addEventListener("visibilitychange",()=>{if(document.hidden&&state.phase!=="ready"&&state.phase!=="complete"){reset();feedback("화면을 다시 열었어요. 안전하게 처음부터 시작할 수 있어요.")}});
}
function gradient(top,bottom){const g=c.createLinearGradient(0,0,0,375);g.addColorStop(0,top);g.addColorStop(1,bottom);return g}
function box(x,y,w,h,color,r=0){c.fillStyle=color;c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h);c.fill()}
function circ(x,y,r,color,outline){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill();if(outline){c.strokeStyle=outline;c.lineWidth=3;c.stroke()}}
function line(x,y,xx,yy,color,width=3){c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.strokeStyle=color;c.lineWidth=width;c.lineCap="round";c.stroke()}
function text(v,x,y,size=24,color="#30505b",align="center",weight="800"){c.fillStyle=color;c.textAlign=align;c.textBaseline="middle";c.font=weight+" "+size+"px Pretendard,SUIT,'Malgun Gothic',sans-serif;c.fillText(String(v),x,y)}
function waveform(x,y,amplitude,color){for(let i=-4;i<=4;i++){const h=10+(1-Math.abs(i)/5)*amplitude+(i%2)*9;line(x+i*17,y-h/2,x+i*17,y+h/2,color,7)}}
function badge(x,y,n,r=29,outline="#fff"){const idx=typeof n==="number"?n:noteIndex(n);circ(x,y,r,COLORS[idx],outline);text(pretty(NOTES[idx]),x,y,r*.67,"#254650")}
function windows(){const w=cvs.width,h=cvs.height;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w,h)}
function background(){
 const theme={echo:["#e4f4ee","#d0e9dd"],memory:["#f3edf8","#e7dbf2"],missing:["#edf4ed","#d4e7d7"],compare:["#e8f0f9","#d3e3f3"],signal:["#f6f1ea","#f4e3cb"],composer:["#fff5df","#f4ebd1"],ensemble:["#eff1fc","#dce0f5"],maze:["#e8f6f4","#d0ebe6"]}[state.mode];
 box(0,0,1080,375,gradient(...theme));circ(900,60,190,"#ffffff47");circ(143,350,185,"#ffffff38");line(10,336,1070,336,"#ffffffa0",2);
}
function drawEcho(){
 circ(252,235,92,"#f9d2a8","#ffffffa0");circ(835,235,92,"#a2d3be","#ffffffa0");circ(236,217,7,"#506c6b");circ(272,217,7,"#506c6b");circ(817,217,7,"#506c6b");circ(854,217,7,"#506c6b");line(235,247,270,247,"#ca9682",4);line(819,247,849,247,"#699b8c",4);
 if(state.phase==="show")waveform(545,218,52,"#579f99");else{for(let i=0;i<state.pattern.length;i++){circ(457+i*48-(state.pattern.length-3)*24,204,14,i<state.reply.length?"#569e87":"#ffffffa8")}}
 text(state.phase==="show"?"먼저 들어요":"이제 내 차례",550,305,26,"#668a80");
}
function drawMemory(){
 for(let i=0;i<6;i++){const x=200+i*138,y=235;circ(x,y,49,"#ffffffb4");if(state.phase==="show"&&state.seenIndex===i){circ(x,y,34,COLORS[state.pattern[i]]||"#c8cab9")}else{circ(x,y,32,i<state.reply.length?"#83bfaa":"#d5dbec")}}
 text(state.phase==="show"?"빛을 따라 기억해":"기억한 순서대로 눌러",540,320,24,"#6a718a");
}
function drawMissing(){
 const list=state.pattern.length?state.pattern:Array.from({length:4},(_,i)=>palette()[i%palette().length]);const width=Math.min(145,770/list.length),total=list.length*width;
 for(let i=0;i<list.length;i++){const x=540-total/2+i*width+width/2,hidden=state.missing===i&&state.phase==="answer";box(x-width*.43,182,width*.86,94,"#fffcf6",19);if(hidden){text("?",x,227,46,"#d88f80")}else if(state.phase!=="ready"&&state.phase!=="show"&&state.phase!=="answer"){badge(x,228,list[i],32)}else if(state.phase==="show"&&state.seenIndex===i){badge(x,228,list[i],32)}else if(state.phase==="answer"){badge(x,228,list[i],32)}else{text("♪",x,228,36,"#b0bcaa")}}
 if(state.phase==="answer"){const x=540-total/2+state.missing*width+width/2;box(x-width*.43,182,width*.86,94,"#fff6d8",19);text("?",x,227,47,"#bb8b66")}
 text("소리의 빈칸을 찾아요",540,315,22,"#7b897e");
}
function drawCompare(){
 box(126,167,332,137,"#ffffff95",25);box(623,167,332,137,"#ffffff95",25);
 text("첫 번째",293,182,20,"#688e9d");text("두 번째",791,182,20,"#688e9d");
 waveform(293,241,state.phase==="show"?66:42,"#83a9d3");waveform(790,241,state.phase==="show"?43:58,"#94c0b0");
 circ(540,234,34,"#f7fcfa");text("?",540,234,31,"#688b8d");
}
function drawSignal(){
 box(397,129,285,201,"#415e66",39);const active=state.signal[state.signalStep]||{on:true,note:palette()[0]};circ(468,228,58,active.on?"#88d7a6":"#ed8f86","#f9f6e4");circ(610,228,57,active.on?"#b3bbbe":"#ec8f7e","#f9f6e4");if(active.on){text("연주",468,230,21,"#274e41");badge(850,227,active.note,49)}else{text("잠깐",610,231,22,"#603f3c");text("멈춰요",854,226,35,"#ae766f")}box(153,199,131,51,"#ffffffa9",14);text((state.signalStep+1)+" / "+(state.signal.length||8),218,224,25,"#5a7780");
}
function drawComposer(){
 const ns=state.composer,slots=[0,1,2,3,4,5,6,7],per=8;
 for(let i=0;i<slots.length;i++){const x=168+i*108;box(x-44,179,86,86,ns[i]!==undefined?"#ffffffe8":"#ffffff65",18);if(ns[i]!==undefined)badge(x,222,ns[i],27);else{text("+",x,220,35,"#b9c7b0")}}
 text(ns.length+"개의 음으로 만든 나의 노래",540,322,24,"#947d57");
}
function drawEnsemble(){
 const ns=state.ensemble;
 for(let i=0;i<2;i++){box(86+i*489,168,440,141,i===0?"#fce6d5":"#e5e9fa",25);text((i+1)+"번 연주자",180+i*489,201,24,i===0?"#9d6957":"#6876a7");text(i===0?"도·미·솔·시":"레·파·라·높은 도",300+i*489,255,21,"#75828a")}
 if(state.phase==="ensemble-running"){box(86+(state.role===2?489:0),312,440,7,"#7aab96",3);const ev=ns[Math.floor(state.playingBeat)]||ns[0];if(ev)badge(540,143,ev.note,38)}
 else text("내가 맡을 색을 골라요",540,340,18,"#777d99");
}
function drawMaze(){
 line(539,285,539,238,"#cdbb93",18);line(539,238,318,184,"#cdbb93",18);line(539,238,756,184,"#cdbb93",18);
 box(155,168,274,113,"#ffffffc9",23);box(650,168,275,113,"#ffffffc9",23);
 circ(287,222,39,state.phase==="listen"?"#f1d7a6":"#a8c9c7");circ(786,222,39,state.phase==="listen"?"#f1d7a6":"#a8c9c7");
 text("왼쪽",287,223,22,"#40636f");text("오른쪽",786,223,22,"#40636f");
 box(474,296,133,40,"#e8d4a6",12);text("출발점",540,315,20,"#7a6b56");
}
const SCENE={echo:drawEcho,memory:drawMemory,missing:drawMissing,compare:drawCompare,signal:drawSignal,composer:drawComposer,ensemble:drawEnsemble,maze:drawMaze};
function render(){windows();background();SCENE[state.mode]();$("#start").disabled=["show","listen","signal-running","ensemble-running","composer-listen"].includes(state.phase);$("#replay").disabled=["ready","complete","signal-running","ensemble-running","composer-listen"].includes(state.phase);updatePads()}
ui();changeMode("echo");render();
window.__playlabQA={modes:Object.keys(MODES),state:()=>({mode:state.mode,level:state.level,range:state.range,round:state.round,phase:state.phase,pattern:state.pattern.slice(),alt:state.alt.slice(),reply:state.reply.slice(),same:state.same,missing:state.missing,score:state.score,role:state.role,composer:state.composer.slice(),notes:palette().map(i=>NOTES[i]),answer:state.answer,signal:state.signal.map(x=>({...x})),signalStep:state.signalStep}),
 selectMode:changeMode,reset,openRound,playNotes,padInput,listenComposition,answerChoice,previewMaze,composerStart,setPhase,render,
 forceAnswer:()=>{const m=state.mode;if(m==="echo"||m==="memory"){state.phase="answer";state.reply=[];for(const n of state.pattern)padInput(n)}else if(m==="missing"){state.phase="answer";padInput(state.pattern[state.missing])}else if(m==="compare"||m==="maze"){state.phase="answer";answerChoice(true)}},
 answerSignal:()=>{state.phase="signal-running";const s=state.signal[state.signalStep];if(s&&s.on)padInput(s.note)}
};
})();

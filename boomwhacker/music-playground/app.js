"use strict";
(()=>{
const N=["도","레","미","파","솔","라","시","높은 도"];
const COLORS={"도":"#eb8076","레":"#efaf72","미":"#ead578","파":"#96c987","솔":"#8dc1cc","라":"#b8a4de","시":"#e9a4c8","높은 도":"#eb8076"};
const FREQ={"도":261.626,"레":293.665,"미":329.628,"파":349.228,"솔":391.995,"라":440,"시":493.883,"높은 도":523.251};
const GAMES={
detect:{name:"소리탐정",title:"어디에서 소리가 달라졌을까?",help:"두 번 듣고 바뀐 자리를 골라요.",pad:"소리 확인: 각 색깔 악기를 눌러 소리를 들을 수 있어요."},
memory:{name:"기억의 불빛",title:"어떤 순서로 울렸을까?",help:"불빛과 소리를 기억한 뒤 같은 순서로 연주해요.",pad:"기억한 순서대로 아래 색깔 악기를 누르면 돼요."},
dialogue:{name:"리듬 대화",title:"모아의 리듬에 대답해요",help:"모아가 연주한 박자 간격을 듣고 북으로 대답해요.",pad:"이 게임은 화면 중앙의 큰 북을 눌러요. 붐웨커 소리 자체는 자동 채점하지 않아요."},
signal:{name:"신호 기다려",title:"초록불에는 연주, 회색불에는 기다려요",help:"잠깐 나타나는 신호를 보고 연주할지 기다릴지 결정해요.",pad:"이 게임은 중앙의 연주 버튼을 사용해요. 짧은 신호가 끝날 때까지 기다려도 좋아요."},
missing:{name:"사라진 음",title:"멜로디에서 어떤 음이 사라졌을까?",help:"먼저 온전한 선율을 듣고, 소리가 빠진 자리를 찾아요.",pad:"빈칸에 들어갈 음을 아래 색깔 악기 중에서 골라요."},
compose:{name:"꼬마 작곡가",title:"나만의 작은 멜로디 만들기",help:"음과 길이를 선택해 노래를 만들고 바로 들어요.",pad:"아래 색깔 악기를 누르면 악보에 음이 추가돼요. 최대 여덟 음이에요."}
};
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const visual=$("#visual"),action=$("#actionRow"),message=$("#message");
const pads=$$(".note-pad");
let mode="detect",level=3,tempo="normal",quiet=false,round=1,phase="ready",correct=0;
let challenge=null,input=[],matched=false,reveal=false,duration=1,composition=[],playedAt=[],waiting=false;
let token=1,timers=[],audio=null,activePos=-1,lastChoice=-1,feedback="",signalIndex=0,signalAnswered=false,signalScore=0;
const maxRounds=5, maxSignal=8, storeKey="ulmoa_music_playground_composition_v1";
function selectable(){return level===3?["도","미","솔"]:level===5?["도","레","미","솔","라"]:N}
function randomInt(max){return Math.floor(Math.random()*max)}
function randomNote(){const a=selectable();return a[randomInt(a.length)]}
function alternate(note){const a=selectable().filter(n=>n!==note);return a[randomInt(a.length)]}
function maskName(s){return s==="높은 도"?"도↑":s}
function pickSeq(len=4){const result=[];for(let i=0;i<len;i++){let p=randomNote();if(i>0&&p===result[i-1]&&Math.random()<.65)p=alternate(p);result.push(p)}return result}
function escape(s){return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
function msg(s){message.textContent=s}
function status(s){$("#sceneState").textContent=s}
function hint(s){$("#sceneHint").textContent=s}
function btn(id,label,primary=false,disabled=false,cls=""){return '<button type="button" class="act '+(primary?"primary ":"")+cls+'" data-action="'+id+'"'+(disabled?" disabled":"")+'>'+label+"</button>"}
function padCss(note){return 'style="--note-color:'+COLORS[note]+'"'}
function cancel(){token++;for(const t of timers)clearTimeout(t);timers=[];activePos=-1;waiting=false;signalAnswered=false;highlightPad(null)}
function later(ms,cb){const at=token;const id=setTimeout(()=>{timers=timers.filter(x=>x!==id);if(at===token)cb()},Math.max(0,ms));timers.push(id);return id}
function beatMs(){return tempo==="slow"?880:620}
function ensureAudio(){
 try{if(!audio){const C=window.AudioContext||window.webkitAudioContext;if(!C){msg("소리를 재생할 수 없는 브라우저예요. Chrome이나 Edge를 이용해 주세요.");return null}audio=new C()}if(audio.state==="suspended")audio.resume().catch(()=>{});return audio}catch(e){msg("이 브라우저에서는 소리 재생이 제한돼요.");return null}
}
function tone(note,ms=360,speaker=.13){
 const c=ensureAudio();if(!c)return;
 const now=c.currentTime+.008,osc=c.createOscillator(),osc2=c.createOscillator(),vol=c.createGain();
 const end=now+Math.max(0.09,ms/1000);
 osc.type="triangle";osc.frequency.setValueAtTime(FREQ[note]||440,now);
 osc2.type="sine";osc2.frequency.setValueAtTime((FREQ[note]||440)*2,now);
 const h=c.createGain();h.gain.value=.12;osc2.connect(h);h.connect(vol);
 vol.gain.setValueAtTime(.001,now);vol.gain.exponentialRampToValueAtTime(Math.max(.002,speaker),now+.025);vol.gain.exponentialRampToValueAtTime(.001,end);
 osc.connect(vol);vol.connect(c.destination);osc.start(now);osc2.start(now);osc.stop(end+.02);osc2.stop(end+.02)
}
function clickSound(ms=180){const c=ensureAudio();if(!c)return;const now=c.currentTime+.006,osc=c.createOscillator(),gain=c.createGain();osc.type="sine";osc.frequency.setValueAtTime(235,now);osc.frequency.exponentialRampToValueAtTime(95,now+ms/1000);gain.gain.setValueAtTime(.001,now);gain.gain.exponentialRampToValueAtTime(.22,now+.009);gain.gain.exponentialRampToValueAtTime(.001,now+ms/1000);osc.connect(gain);gain.connect(c.destination);osc.start(now);osc.stop(now+ms/1000+.02)}
function highlightPad(note){pads.forEach(p=>p.classList.toggle("highlight",p.dataset.note===note))}
function updatePads(){const ns=selectable(),active=mode==="memory"&&phase==="input"||mode==="missing"&&phase==="answer"||mode==="compose";pads.forEach(p=>{const on=ns.includes(p.dataset.note);p.classList.toggle("disabled",!on);p.disabled=!on;p.setAttribute("aria-pressed","false")});$("#padHelp").textContent=GAMES[mode].pad;$("#notePanel").classList.toggle("interaction-active",active)}
function updateStats(){const total=mode==="signal"?maxSignal:mode==="compose"?8:maxRounds,v=mode==="signal"?signalIndex:mode==="compose"?composition.length:round;$("#roundLabel").textContent=mode==="compose"?v+" / 8개":v+" / "+total;const completed=mode==="signal"?signalIndex:mode==="compose"?composition.length:(phase==="result"?round:round-1);$("#progressFill").style.width=Math.max(0,Math.min(100,completed/total*100))+"%"}
function activateGame(id){
 if(!GAMES[id])return;
 cancel();mode=id;round=1;correct=0;phase="ready";challenge=null;input=[];matched=false;reveal=false;feedback="";signalIndex=0;signalScore=0;
 $$(".game-choice").forEach(b=>{const selected=b.dataset.game===id;b.classList.toggle("selected",selected);b.setAttribute("aria-pressed",String(selected))});
 $("#gameTag").textContent=GAMES[id].name;$("#gameTitle").textContent=GAMES[id].title;$("#gameHelp").textContent=GAMES[id].help;
 const url=new URL(location.href);url.searchParams.set("game",id);history.replaceState(null,"",url);
 render();msg(id==="compose"?"색을 눌러 나만의 멜로디를 만들어요.":"시작을 누르면 "+GAMES[id].name+" 게임이 열려요.");
}
function resetRound(){cancel();phase="ready";challenge=null;input=[];reveal=false;matched=false;feedback="";render();msg("시작을 누르면 소리와 그림이 나와요.")}
function render(){
 updateStats();updatePads();
 if(mode==="detect")renderDetect();
 if(mode==="memory")renderMemory();
 if(mode==="dialogue")renderDialogue();
 if(mode==="signal")renderSignal();
 if(mode==="missing")renderMissing();
 if(mode==="compose")renderCompose();
}
function renderDetect(){
 const show=phase==="result";const slots=Array.from({length:4},(_,i)=>'<div class="number-cell '+(show&&i===challenge.diff?"changed ":"")+(i===activePos?"current ":"")+'">'+(show?maskName(challenge.a[i]):i+1)+'</div>').join("");
 const slots2=Array.from({length:4},(_,i)=>'<div class="number-cell '+(show&&i===challenge.diff?"changed ":"")+(i===activePos+4?"current ":"")+'">'+(show?maskName(challenge.b[i]):i+1)+'</div>').join("");
 visual.innerHTML='<div class="pair"><div class="pair-group"><span class="pair-label">첫 번째 소리</span><div class="number-cells">'+slots+'</div></div><span class="pair-separator" aria-hidden="true">→</span><div class="pair-group"><span class="pair-label">두 번째 소리</span><div class="number-cells">'+slots2+'</div></div></div><div class="subprompt">'+(phase==="answer"?"어느 자리가 달라졌나요?":show?"달라진 자리는 "+(challenge.diff+1)+"번째예요.":"한 번 더 들으면 다른 자리가 나와요.")+"</div>";
 hint(phase==="answer"?"바뀐 자리 번호를 골라요":"첫 소리와 두 번째 소리를 비교해요");status(phase==="demo"?"듣는 중":phase==="result"?"확인":phase==="answer"?"선택": "준비");
 if(phase==="ready")action.innerHTML=btn("start","소리 듣기",true);
 else if(phase==="demo")action.innerHTML=btn("busy","듣는 중",false,true);
 else if(phase==="answer")action.innerHTML='<div class="answer-grid">'+[1,2,3,4].map(n=>'<button type="button" data-index="'+(n-1)+'" class="choice-answer" aria-label="'+n+'번째 자리">'+n+'</button>').join("")+'</div>'+btn("replay","다시 듣기");
 else action.innerHTML=btn("next",round>=maxRounds?"처음부터":"다음 문제",true)+btn("replay","다시 듣기");
}
function setupDetect(){challenge={a:pickSeq(4),b:null,diff:randomInt(4)};challenge.b=challenge.a.slice();challenge.b[challenge.diff]=alternate(challenge.b[challenge.diff])}
function playDetect(){
 if(!challenge)setupDetect();
 cancel();phase="demo";activePos=-1;render();msg("두 번 들려주는 네 음을 잘 들어요.");
 const sep=tempo==="slow"?710:530;
 for(let i=0;i<8;i++){
  const n=i<4?challenge.a[i]:challenge.b[i-4],when=i*sep+(i>=4?670:0);
  later(when,()=>{activePos=i;tone(n,sep*.7);render()})
 }
 later(8*sep+840,()=>{activePos=-1;phase="answer";render();msg("두 번째에 달라진 자리를 골라요.")});
}
function answerDetect(idx){if(phase!=="answer")return;const yes=idx===challenge.diff;correct+=Number(yes);phase="result";reveal=true;lastChoice=idx;render();msg(yes?"찾았어요! "+(idx+1)+"번째 음이 달라졌어요.":"다른 소리는 "+(challenge.diff+1)+"번째였어요. 다시 들어도 괜찮아요.")}
function renderMemory(){
 const length=challenge?.seq.length||Math.min(5,round+1);
 const dots=Array.from({length},(_,i)=>'<div class="light-dot '+(i===activePos?"active":i<input.length?"done":"")+'">'+(phase==="result"&&challenge?maskName(challenge.seq[i]):i<input.length?"●":i+1)+'</div>').join("");
 visual.innerHTML='<div class="prompt">'+(phase==="demo"?"듣고 기억해요":phase==="input"?"이제 같은 순서로 연주해요":phase==="result"?"순서 확인": "불빛과 소리를 기억해요")+'</div><div class="light-sequence">'+dots+'</div><div class="subprompt">'+(phase==="input"?input.length+" / "+length+"개 입력":"음이 울리는 순서를 따라가요")+"</div>";
 status(phase==="demo"?"기억하기":phase==="input"?"연주 차례":phase==="result"?"결과":"준비");hint("음표 순서를 기억하고 같은 색을 눌러요");
 action.innerHTML=phase==="ready"?btn("start","기억 시작",true):phase==="demo"?btn("busy","듣는 중",false,true):phase==="input"?btn("replay","다시 듣기")+btn("reset","새 문제"):btn("next",matched?"다음 단계":"같은 순서 다시",true)+btn("replay","다시 듣기");
}
function setupMemory(){challenge={seq:pickSeq(Math.min(5,round+1))};input=[];matched=false}
function playMemory(){if(!challenge)setupMemory();cancel();phase="demo";input=[];render();msg("불빛과 소리를 기억해요.");
 const step=tempo==="slow"?940:730;
 challenge.seq.forEach((n,i)=>later(i*step+190,()=>{activePos=i;tone(n,step*.61);highlightPad(n);render()}));
 later(challenge.seq.length*step+260,()=>{activePos=-1;phase="input";highlightPad(null);render();msg("아래 색깔 악기를 기억한 순서대로 눌러요.")});
}
function memoryPad(note){if(phase!=="input")return;input.push(note);const idx=input.length-1;const okay=note===challenge.seq[idx];if(!okay){phase="result";matched=false;render();msg("이 부분에서 다른 소리가 나왔어요. 같은 순서를 다시 들어볼 수 있어요.");return}
 if(input.length===challenge.seq.length){phase="result";matched=true;correct++;render();msg("순서가 모두 맞았어요. 다음 단계에서는 한 음이 더 늘어나요.");return}
 render();msg(input.length+"개 기억했어요. 다음 음도 찾아요.");
}
const RHYTHMS=[[0,1,2,3],[0,.5,1.5,2.5,3],[0,.5,1,1.5,2.5,3],[0,.75,1.5,2,3],[0,.5,1,2,2.5,3]];
function renderDialogue(){
 const times=challenge?.rhythm||RHYTHMS[Math.min(4,round-1)];
 const beats=times.map((p,i)=>'<div class="rhythm-beat '+(i===activePos?"active":phase==="input"&&i<input.length?"done":"")+'" title="'+(p+1)+'박">●</div>').join("");
 visual.innerHTML='<div class="prompt">'+(phase==="demo"?"모아의 차례":phase==="input"?"이번에는 내 차례":phase==="result"?"리듬을 들으며 다시 해볼까요?":"리듬을 듣고 대답해요")+'</div><div class="dialogue-group">'+beats+'</div>'+(phase==="input"?'<button type="button" class="drum" id="drum" aria-label="북을 치기">탁!</button>':'<div class="subprompt">같은 길이의 음악이 아니라, 박자 사이의 간격을 기억하는 게임이에요.</div>');
 status(phase==="demo"?"모아 차례":phase==="input"?"내 차례":phase==="result"?"결과":"준비");hint("음 높이보다 소리 사이의 간격을 들어요");
 action.innerHTML=phase==="ready"?btn("start","리듬 듣기",true):phase==="demo"?btn("busy","듣는 중",false,true):phase==="input"?btn("replay","다시 듣기")+btn("reset","다시 시작"):btn("next",matched?"다음 리듬":"같은 리듬 다시",true)+btn("replay","다시 듣기");
}
function setupDialogue(){challenge={rhythm:RHYTHMS[Math.min(4,round-1)]};input=[];playedAt=[];matched=false}
function playDialogue(){if(!challenge)setupDialogue();cancel();phase="demo";input=[];playedAt=[];render();msg("모아가 먼저 두드려요. 소리 사이의 간격을 들어요.");
 const times=challenge.rhythm,ms=beatMs();
 times.forEach((b,i)=>later(260+b*ms,()=>{activePos=i;clickSound(210);render()}));
 later(650+times.at(-1)*ms+360,()=>{phase="input";activePos=-1;render();msg("이제 큰 북을 같은 리듬으로 두드려요.")});
}
function drumTap(){if(mode!=="dialogue"||phase!=="input"||!challenge)return;const now=performance.now();playedAt.push(now);input.push("탁");clickSound(180);render();
 const el=$("#drum");if(el){el.classList.add("pressed");later(160,()=>$("#drum")?.classList.remove("pressed"))}
 if(playedAt.length===challenge.rhythm.length){const base=playedAt[0],ref=challenge.rhythm,beat=beatMs();matched=playedAt.every((time,i)=>Math.abs((time-base)-ref[i]*beat)<=Math.max(210,beat*.34));phase="result";correct+=Number(matched);render();msg(matched?"리듬 간격을 잘 맞췄어요. 다음 리듬이 기다려요.":"소리 사이의 간격이 조금 달랐어요. 다시 들으며 연습할 수 있어요.");}
 else msg(playedAt.length+" / "+challenge.rhythm.length+"번 연주했어요.")
}
function renderSignal(){
 const cue=phase==="cue"?challenge?.type:"idle";
 visual.innerHTML='<div class="signal-display '+(cue==="go"?"go":cue==="stop"?"stop":"idle")+'" aria-label="'+(cue==="go"?"초록, 연주":cue==="stop"?"회색, 기다리기":"신호 대기")+'">'+(cue==="go"?"●":cue==="stop"?"−":"○")+'</div><div class="subprompt">'+(cue==="go"?"초록! 연주할 차례":cue==="stop"?"회색! 잠깐 기다리기":phase==="result"?"신호 게임이 끝났어요":"초록이면 연주, 회색이면 기다려요")+"</div>";
 hint("신호가 잠깐 나타나면 판단해요");status(phase==="cue"?"신호 확인":phase==="feedback"?"다음 신호 준비":phase==="result"?"완료":phase==="ready"?"준비":"잠시 대기");
 action.innerHTML=phase==="ready"?btn("start","신호 시작",true):phase==="cue"?btn("signalTap","연주!",true,false,"inline"):phase==="result"?btn("resetSignal","다시 도전",true):btn("busy","잠시 기다려요",false,true);
}
function setupSignal(){const x=Array.from({length:maxSignal},(_,i)=>i%2?"stop":"go");for(let i=x.length-1;i>0;i--){const j=randomInt(i+1);[x[i],x[j]]=[x[j],x[i]]}challenge={signals:x};signalIndex=0;signalScore=0}
function startSignal(){cancel();setupSignal();phase="feedback";render();msg("준비! 초록 신호에만 화면의 연주 버튼을 눌러요.");later(350,nextSignal)}
function nextSignal(){
 if(signalIndex>=maxSignal){phase="result";render();msg("끝! "+maxSignal+"번의 신호 중 "+signalScore+"번 신호를 잘 구별했어요.");return}
 signalAnswered=false;challenge.type=challenge.signals[signalIndex];phase="cue";render();tone(challenge.type==="go"?"솔":"도",150,.09);
 const answerWindow=tempo==="slow"?1900:1450;
 later(answerWindow,()=>settleSignal(false))
}
function signalTap(){if(phase!=="cue"||signalAnswered)return;settleSignal(true)}
function settleSignal(tapped){
 if(phase!=="cue"||signalAnswered)return;
 // Cancel only this cue's pending timeout; new tasks must use a fresh token.
 const type=challenge.type;cancel();signalAnswered=true;
 const okay=(type==="go"&&tapped)||(type==="stop"&&!tapped);signalScore+=Number(okay);signalIndex++;
 phase="feedback";render();
 msg(okay?(tapped?"초록을 보고 연주했어요.":"회색을 보고 잘 기다렸어요."):(type==="go"?"초록 신호가 지나갔어요. 다음에는 눌러볼 수 있어요.":"회색은 기다리는 신호예요. 다음 것을 준비해요."));
 later(660,nextSignal)
}
function renderMissing(){
 const seq=challenge?.seq||Array.from({length:4},()=>null),miss=challenge?.gap??2;
 const row=seq.map((n,i)=>'<div class="melody-note '+(i===miss&&!reveal?"missing":reveal&&i===miss?"revealed":"known")+' '+(activePos===i?"active":"")+'" '+(i!==miss||reveal?padCss(n):"")+'>'+(i===miss&&!reveal?"?":n?maskName(n):"●")+"</div>").join("");
 visual.innerHTML='<div class="prompt">'+(phase==="demo"?"먼저 전체 음악, 다음에는 빈칸 음악":phase==="answer"?"? 자리에 어떤 소리가 있었나요?":phase==="result"?"사라진 음의 자리":"빈자리를 찾아요")+'</div><div class="melody-list">'+row+'</div><div class="subprompt">'+(phase==="answer"?"아래 악기 중에서 골라요":"멜로디는 네 음으로 이루어져요")+"</div>";
 hint("완전한 선율을 듣고 빈 음을 찾아요");status(phase==="demo"?"듣는 중":phase==="answer"?"음 고르기":phase==="result"?"확인":"준비");
 action.innerHTML=phase==="ready"?btn("start","멜로디 듣기",true):phase==="demo"?btn("busy","듣는 중",false,true):phase==="answer"?btn("replay","다시 듣기"):btn("next",round>=maxRounds?"처음부터":"다음 빈칸",true)+btn("replay","다시 듣기");
}
function setupMissing(){challenge={seq:pickSeq(4),gap:1+randomInt(2)};reveal=false}
function playMissing(){if(!challenge)setupMissing();cancel();phase="demo";reveal=false;render();msg("첫 번째에는 전부, 두 번째에는 한 음을 빼고 연주해요.");
 const ms=tempo==="slow"?800:590;
 for(let pass=0;pass<2;pass++){
  for(let i=0;i<4;i++){
   const when=pass*(4*ms+900)+i*ms+140;
   later(when,()=>{activePos=i;if(pass===0||i!==challenge.gap)tone(challenge.seq[i],ms*.74);render()})
  }
 }
 later(8*ms+1250,()=>{activePos=-1;phase="answer";render();msg("빈칸에 들어갈 음을 아래 악기에서 골라요.")})
}
function missingPad(note){if(phase!=="answer")return;matched=note===challenge.seq[challenge.gap];correct+=Number(matched);phase="result";reveal=true;render();msg(matched?"바로 그 음이에요! 빈칸을 찾았어요.":"빈칸에는 "+maskName(challenge.seq[challenge.gap])+" 소리가 있었어요. 다시 들어볼 수 있어요.")}
function renderCompose(){
 const slots=Array.from({length:8},(_,i)=>{
  const n=composition[i];
  return n?'<div class="composer-slot '+(i===activePos?"active":"")+'" '+padCss(n.note)+'><span>'+maskName(n.note)+'</span><small>'+n.dur+'박</small></div>':'<div class="composer-slot composer-empty">'+(i+1)+'</div>'
 }).join("");
 visual.innerHTML='<div class="prompt">내 노래 '+composition.length+' / 8음</div><div class="composer-board">'+slots+'</div><div class="duration-pick" aria-label="음 길이 고르기">'+[.5,1,2].map(d=>'<button type="button" data-dur="'+d+'" class="'+(d===duration?"selected":"")+'" aria-pressed="'+(d===duration)+'">'+(d===.5?"짧게":d===1?"한 박":"길게")+'</button>').join("")+"</div>";
 hint("악보는 이 브라우저에만 보관돼요");status(phase==="demo"?"재생 중":composition.length===8?"여덟 음 완성":"만들기");
 action.innerHTML=btn("playComposition","내 노래 듣기",true,composition.length===0||phase==="demo")+btn("undo","하나 지우기",false,composition.length===0||phase==="demo")+btn("clearComposition","모두 지우기",false,composition.length===0||phase==="demo")+btn("saveComposition","내 기기에 저장",false,composition.length===0||phase==="demo");
}
function composePad(note){if(phase==="demo")return;if(composition.length>=8){msg("여덟 음을 모두 만들었어요. 듣거나 하나 지울 수 있어요.");return}composition.push({note,dur:duration});render();msg(maskName(note)+" 음을 "+(duration===.5?"짧게":duration===1?"한 박":"길게")+" 넣었어요.");}
function playComposition(){if(composition.length===0||phase==="demo")return;cancel();phase="demo";render();msg("내가 만든 멜로디가 재생돼요.");let cursor=100;const single=beatMs();
 composition.forEach((e,i)=>{later(cursor,()=>{activePos=i;tone(e.note,Math.min(e.dur*single*.83,1400));highlightPad(e.note);render()});cursor+=single*e.dur});
 later(cursor+150,()=>{phase="ready";activePos=-1;highlightPad(null);render();msg("직접 만든 멜로디를 다시 바꿀 수도 있어요.")})
}
function saveComposition(){if(!composition.length)return;try{localStorage.setItem(storeKey,JSON.stringify(composition));msg("현재 기기 브라우저에 저장했어요. 다른 기기로 자동 공유되지는 않아요.")}catch(e){msg("이 브라우저에서는 저장할 수 없어요. 화면에서 멜로디를 확인할 수 있어요.")}}
function loadComposition(){try{const j=JSON.parse(localStorage.getItem(storeKey)||"[]");if(Array.isArray(j))composition=j.slice(0,8).filter(v=>v&&N.includes(v.note)&&[.5,1,2].includes(v.dur))}catch(e){composition=[]}}
function nextRound(){
 if(mode==="memory"||mode==="dialogue"){if(!matched){if(mode==="memory")playMemory();else playDialogue();return}}
 if(round>=maxRounds){round=1;correct=0} else round++;
 cancel();challenge=null;phase="ready";reveal=false;input=[];matched=false;render();msg("다음 게임을 시작할 준비가 됐어요.")
}
function start(){if(mode==="detect"){if(!challenge)setupDetect();playDetect()}
 else if(mode==="memory"){if(!challenge)setupMemory();playMemory()}
 else if(mode==="dialogue"){if(!challenge)setupDialogue();playDialogue()}
 else if(mode==="signal"){startSignal()}
 else if(mode==="missing"){if(!challenge)setupMissing();playMissing()}
}
function onAction(key){
 if(key==="busy")return;
 if(key==="start"){start();return}
 if(key==="replay"){if(mode==="detect")playDetect();if(mode==="memory")playMemory();if(mode==="dialogue")playDialogue();if(mode==="missing")playMissing();return}
 if(key==="next"){if(mode==="detect"||mode==="memory"||mode==="dialogue"||mode==="missing")nextRound();return}
 if(key==="reset"){resetRound();return}
 if(key==="signalTap"){signalTap();return}
 if(key==="resetSignal"){resetRound();return}
 if(key==="playComposition"){playComposition();return}
 if(key==="undo"){composition.pop();render();msg("마지막 음을 지웠어요.");return}
 if(key==="clearComposition"){composition=[];render();msg("빈 악보가 되었어요.");return}
 if(key==="saveComposition"){saveComposition();return}
}
function padHit(note){
 if(!selectable().includes(note))return;
 if(mode==="memory"&&phase==="input"){tone(note,240);memoryPad(note);return}
 if(mode==="missing"&&phase==="answer"){tone(note,300);missingPad(note);return}
 if(mode==="compose"){tone(note,250);composePad(note);return}
 tone(note,220);const el=pads.find(p=>p.dataset.note===note);if(!el)return;el.classList.add("highlight");later(170,()=>el.classList.remove("highlight"));
}
$$(".game-choice").forEach(el=>el.addEventListener("click",()=>activateGame(el.dataset.game)));
pads.forEach(el=>el.addEventListener("click",()=>padHit(el.dataset.note)));
action.addEventListener("click",e=>{
 const a=e.target.closest("[data-action]"),index=e.target.closest("[data-index]");
 if(index&&mode==="detect"&&phase==="answer"){answerDetect(Number(index.dataset.index));return}
 if(a)onAction(a.dataset.action);
});
visual.addEventListener("click",e=>{
 const d=e.target.closest("[data-dur]");if(d&&mode==="compose"){duration=Number(d.dataset.dur);render();return}
 if(e.target.closest("#drum")&&mode==="dialogue"){drumTap()}
});
$("#level").addEventListener("change",e=>{level=Number(e.target.value);if(mode==="compose"){render();msg("사용할 음의 수가 달라졌어요. 기존에 만든 음표는 그대로 유지해요.")}else{resetRound();msg("이제 "+level+"음으로 연습해요.")}});
$("#tempo").addEventListener("change",e=>{tempo=e.target.value;cancel();if(mode!=="compose")resetRound();else if(phase==="demo")phase="ready";render();msg(tempo==="slow"?"느린 속도로 연습해요.":"보통 속도로 연습해요.")});
$("#quiet").addEventListener("change",e=>{quiet=e.target.checked;document.body.classList.toggle("low-motion",quiet)});
window.addEventListener("keydown",e=>{
 if(e.ctrlKey||e.altKey||e.metaKey||/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||""))return;
 if(/^[1-8]$/.test(e.key)&&!e.repeat){const n=N[Number(e.key)-1];if(!$("#notePads").contains(document.activeElement))padHit(n)}
 if(e.code==="Space"&&!e.repeat&&mode==="dialogue"&&phase==="input"&&!e.target.closest("button")){e.preventDefault();drumTap()}
});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&(phase==="demo"||phase==="cue"||phase==="feedback")){cancel();phase="ready";challenge=null;render();msg("다시 시작하면 처음부터 들을 수 있어요.")}});
loadComposition();
const initial=new URL(location.href).searchParams.get("game");
activateGame(GAMES[initial]?initial:"detect");
window.__musicPlaygroundQA={
 get:()=>({mode,level,tempo,round,phase,correct,challenge:challenge?JSON.parse(JSON.stringify(challenge)):null,input:[...input],duration,composition:composition.map(n=>({...n})),signalIndex,signalScore,token,timers:timers.length}),
 games:Object.keys(GAMES),setMode:activateGame,padHit,onAction,answerDetect,drumTap,setupDetect,setupMemory,setupDialogue,setupMissing,
 forceReady:()=>{cancel();phase="ready";render()},
 forceAnswer:()=>{cancel();phase=mode==="memory"||mode==="dialogue"?"input":"answer";render()},
 forceSignal:(type)=>{cancel();challenge={signals:[type],type};phase="cue";signalIndex=0;render()},
 getSongKeys:()=>N.slice()
};
})();
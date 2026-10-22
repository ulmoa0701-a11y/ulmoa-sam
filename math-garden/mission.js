/* Guided discovery pilot, not a diagnostic or efficacy-tested curriculum.
   Principles: explicit modelling, concrete manipulation, feedback, fading, varied exemplars,
   independent transfer probes separately counted. No speech synthesis or telemetry. */
(()=>{'use strict';
const $=id=>document.getElementById(id),play=$('play'),stage=$('stage');
const storeKey='moa-numbers-guided-pilot-v1';
const CONCEPTS=[
 {key:'share',name:'첫 번째 숲길',title:'간식을 골고루!',kicker:'숲속 간식 배달',short:'친구마다 한 개씩'},
 {key:'compare',name:'두 번째 숲길',title:'어느 쪽이 더 많을까?',kicker:'두 갈래 오솔길',short:'수량 비교'},
 {key:'make',name:'세 번째 숲길',title:'빈자리 채우기',kicker:'반짝 꽃밭',short:'수의 구성'}
];
const templates={
 share:[{kind:'demo',n:2,animal:'rabbit',fruit:'acorn'},{kind:'guided',n:2,animal:'bear',fruit:'acorn'},{kind:'probe',n:3,animal:'fox',fruit:'acorn'},{kind:'probe',n:4,animal:'rabbit',fruit:'acorn'},{kind:'transfer',n:3,animal:'bird',fruit:'berry'},{kind:'practice',n:2,animal:'frog',fruit:'berry'},{kind:'transfer',n:4,animal:'bear',fruit:'berry'}],
 compare:[{kind:'demo',a:2,b:3,want:'more',fruit:'acorn'},{kind:'guided',a:2,b:4,want:'more',fruit:'acorn'},{kind:'probe',a:4,b:2,want:'less',fruit:'acorn'},{kind:'probe',a:3,b:4,want:'more',fruit:'berry'},{kind:'transfer',a:4,b:3,want:'less',fruit:'berry'},{kind:'practice',a:2,b:3,want:'less',fruit:'berry'},{kind:'transfer',a:3,b:2,want:'more',fruit:'acorn'}],
 make:[{kind:'demo',total:4,have:2,fruit:'acorn'},{kind:'guided',total:4,have:3,fruit:'acorn'},{kind:'probe',total:5,have:2,fruit:'acorn'},{kind:'probe',total:5,have:4,fruit:'berry'},{kind:'transfer',total:6,have:2,fruit:'berry'},{kind:'practice',total:4,have:1,fruit:'berry'},{kind:'transfer',total:5,have:3,fruit:'acorn'}]
};
const state={concept:0,step:1,selected:0,taken:0,served:[],attempts:0,hints:0,flagged:false,sound:true,locked:false,view:'task',results:[],timer:0,review:null};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;'}[c]));
const unit=(type='acorn',small=false)=>'<span class="food '+(type==='berry'?'berry':'acorn')+' '+(small?'mini':'')+'" aria-hidden="true"></span>';
const friend=(name,i)=>'<svg class="forest-friend" viewBox="'+(150*['rabbit','bear','fox','frog','bird'].indexOf(name))+' 0 150 180" aria-hidden="true"><use href="./assets/woodland-friends.svg#'+name+'"/></svg>';
const dot=(filled,type)=>'<span class="match-slot '+(filled?'occupied':'empty')+'">'+(filled?unit(type,true):'')+'</span>';
const current=()=>templates[CONCEPTS[state.concept].key][Math.min(state.step,6)];
const practice=()=>state.step===5||state.step===6;
function save(){try{const prior=JSON.parse(localStorage.getItem(storeKey)||'{}');const safe=prior&&typeof prior==='object'&&!Array.isArray(prior)?prior:{};safe[CONCEPTS[state.concept].key]={...state.review,updated:Date.now()};localStorage.setItem(storeKey,JSON.stringify(safe))}catch(e){}}
function sfx(ok=true){if(!state.sound)return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;const ctx=window.__moaMissionSound||(window.__moaMissionSound=new Audio());ctx.resume?.();let t=ctx.currentTime;for(let i=0;i<(ok?2:1);i++){const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.value=ok?[493.9,659.3][i]:220;gain.gain.setValueAtTime(.0001,t+i*.09);gain.gain.exponentialRampToValueAtTime(.045,t+i*.09+.015);gain.gain.exponentialRampToValueAtTime(.0001,t+i*.09+.18);osc.connect(gain);gain.connect(ctx.destination);osc.start(t+i*.09);osc.stop(t+i*.09+.2)}}catch(e){}}
function setStatus(s=''){ $('status').textContent=s }
function say(k,t){$('kicker').textContent=k;$('instruction').textContent=t}
function progress(){ $('chapters').innerHTML=CONCEPTS.map((x,i)=>'<span class="chapter-dot '+(i<state.concept?'completed':i===state.concept?'active':'')+'" title="'+x.short+'">'+(i+1)+'</span>').join('') }
function scene(t){play.innerHTML=t}
function stepAction(action,body,label='',extra=''){return '<button type="button" data-mission="'+action+'" '+extra+' class="'+(action==='submit'||action==='continue'?'btn action':'interaction')+'" aria-label="'+esc(label)+'">'+body+'</button>'}
function helpButton(show=true){$('help').hidden=!show;$('change').hidden=!show}
function resetConcept(i){
 clearTimeout(state.timer);Object.assign(state,{concept:i,step:1,selected:0,taken:0,served:[],attempts:0,hints:0,flagged:false,locked:false,view:'task',results:[],review:null});
 $('missionTitle').textContent=CONCEPTS[i].title;helpButton(true);progress();draw();
}
function demoVisual(task,key){
 if(key==='share'){return '<div class="demo-friends">'+Array.from({length:task.n},(_,i)=>'<div class="demo-pair">'+friend(task.animal,i)+dot(true,task.fruit)+'</div>').join('')+'</div><div class="visual-equation">'+task.n+'명의 친구 · '+task.n+'개의 간식</div>'}
 if(key==='compare'){return '<div class="compare-pair"><div class="quantity pile">'+Array.from({length:task.a},()=>unit(task.fruit)).join('')+'</div><div class="match-instruction">›</div><div class="quantity pile">'+Array.from({length:task.b},()=>unit(task.fruit)).join('')+'</div></div><div class="one-to-one">'+Array.from({length:Math.max(task.a,task.b)},(_,i)=>'<div class="matching-row">'+dot(i<task.a,task.fruit)+dot(i<task.b,task.fruit)+'</div>').join('')+'</div>'}
 return '<div class="make-board">'+Array.from({length:task.total},(_,i)=>dot(i<task.have,task.fruit)).join('')+'</div><div class="visual-equation">'+task.have+'개가 있어요. 빈자리만큼 더 필요해요.</div>';
}
function fruitTray(type,selected,stock,taken=selected){return '<div class="supply"><div class="supply-items">'+Array.from({length:Math.max(0,stock-taken)},(_,i)=>stepAction('take',unit(type),'간식 하나 담기','data-index="'+i+'"')).join('')+'</div><p class="supply-caption">숲속 나무</p></div><div class="delivery"><div class="packed-food">'+Array.from({length:selected},()=>stepAction('undo',unit(type,true),'담은 간식 하나 꺼내기')).join('')+'</div><div class="basket-body"></div><p class="supply-caption">내 배달 바구니</p></div>'}
function shareBoard(x){
 const n=x.n;
 return '<div class="friends-line">'+Array.from({length:n},(_,i)=>{
  const fed=state.served.includes(i);
  return '<button type="button" class="hungry-friend feed-friend '+(fed?'friend-fed':'')+'" data-mission="serve" data-friend="'+i+'" aria-label="'+(fed?'간식 받은 친구':'친구에게 간식 하나 주기')+'" '+(fed?'disabled':'')+'>'+
   friend(x.animal,i)+'<span class="dish '+(fed?'dish-filled':'')+'" aria-hidden="true">'+(fed?unit(x.fruit,true):'')+'</span></button>';
 }).join('')+'</div><div class="delivery-line">'+fruitTray(x.fruit,state.selected,n+2,state.taken)+'</div>';
}
function compareBoard(x){
 // Show the rule by example rather than making the child read 'more' or 'less'.
 // The example does not reveal whether left or right is correct in the actual scene.
 const more=x.want==='more';
 const sample='<div class="quantity-guide" role="img" aria-label="'+(more?'더 많은 수량의 길':'더 적은 수량의 길')+'">'+
 '<div class="quantity-example '+(more?'goal-example':'')+'">'+unit(x.fruit,true)+unit(x.fruit,true)+unit(x.fruit,true)+'</div>'+
 '<div class="quantity-example '+(!more?'goal-example':'')+'">'+unit(x.fruit,true)+'</div></div>';
 return sample+'<div class="compare-path">'+['a','b'].map((k,i)=>
 stepAction('choose','<div class="path-stand"><div class="fruit-pile">'+
 Array.from({length:x[k]},()=>unit(x.fruit)).join('')+'</div><span class="path-arch"></span></div>',i===0?'왼쪽':'오른쪽','data-side="'+k+'"')).join('')+'</div>';
}
function makeBoard(x){
 // The object visibly occupies one empty slot per tap; there is no separate "correct answer" button.
 const stock=x.total-x.have+3-state.selected;
 return '<div class="make-layout"><div class="make-board">'+
 Array.from({length:x.total},(_,i)=>dot(i<x.have+state.selected,x.fruit)).join('')+
 '</div><div class="delivery-line make-pickup"><div class="supply"><div class="supply-items">'+
 Array.from({length:Math.max(0,stock)},(_,i)=>stepAction('take',unit(x.fruit),'열매로 빈자리 하나 채우기','data-index="'+i+'"')).join('')+
 '</div></div></div></div>';
}
function phaseText(x){if(x.kind==='guided')return '숲속 친구들';if(x.kind==='transfer')return '새 친구 등장';if(x.kind==='probe')return '숲길 탐험';return '다음 장소'}
function draw(){
 if(!state.view||state.view==='intro')return;
 const x=current(),key=CONCEPTS[state.concept].key;
 state.view='task';
 const lab=phaseText(x);
 let headline=key==='share'?'친구마다 하나씩 담아 줘':key==='compare'?(x.want==='more'?'더 많은 쪽으로 출발!':'더 적은 쪽으로 출발!'):'빈자리를 채울 만큼 담아 줘';
 say(lab,headline);
 const board=key==='share'?shareBoard(x):key==='compare'?compareBoard(x):makeBoard(x);
 scene('<div class="quest"><div class="quest-head"><span class="quest-chip">'+lab+'</span><div class="quest-pips">'+Array.from({length:Math.min(state.step,5)},()=>'<i></i>').join('')+'</div></div><div class="quest-board">'+board+'</div>'+(key==='share'?'<div class="quest-actions compact-alt">'+stepAction('submit','한 번에 주기','모든 친구에게 한 번에 간식을 주기')+'</div>':'')+'<div class="feedback-slot" id="feedbackSlot" aria-live="polite"></div></div>');
 if(state.flagged){const label=$('feedbackSlot');if(label){label.innerHTML='<div class="feedback-error">다시 살펴볼 수 있어.</div>'+(state.hints?'<div class="scaffold">'+renderPairing(x,key)+'</div>':'')}}
}
function renderPairing(x,key){
 if(key==='compare'){
  return '<div class="one-to-one">'+Array.from({length:Math.max(x.a,x.b)},(_,i)=>'<div class="matching-row">'+dot(i<x.a,x.fruit)+dot(i<x.b,x.fruit)+'</div>').join('')+'</div><p>하나씩 짝지어 보면 어디가 남을까?</p>';
 }
 const wanted=key==='share'?x.n:x.total-x.have;return '<div class="help-model"><span>필요한 자리</span><div class="match-row">'+Array.from({length:wanted},(_,i)=>dot(i<(key==='share'?state.selected+state.served.length:state.selected),x.fruit)).join('')+'</div></div><p>빈자리와 담은 간식을 하나씩 짝지어 볼까?</p>'
}
function help(manual=false){
 if(state.locked||state.view!=='task')return;
 state.flagged=true;state.hints++;
 const x=current(),key=CONCEPTS[state.concept].key;let slot=$('feedbackSlot');
 if(!slot)return;slot.innerHTML='<div class="scaffold">'+renderPairing(x,key)+'</div>';
 setStatus('하나씩 짝지어 살펴볼 수 있어.');
}
function feedback(isCorrect){
 const x=current(),key=CONCEPTS[state.concept].key;
 if(isCorrect){state.locked=true;sfx(true);
  const clean=x.kind!=='guided'&&x.kind!=='demo'&&!state.flagged&&state.attempts===0&&state.hints===0;
  state.results.push({kind:x.kind,clean,concept:key});
  if(x.kind==='guided')setStatus('잘했어. 이제 혼자 해볼 차례야.');else if(clean)setStatus('이번에는 혼자 해결했어!');else setStatus('도움을 받고 해결했어. 다음에는 새로 해볼 수 있어.');
  const outcome=key==='compare'?'숲길이 열렸어!':key==='share'?'친구들이 배부르게 먹었어!':'꽃밭에 꽃이 피었어!';
  const story=key==='share'?'<div class="success-line">'+Array.from({length:x.n},(_,i)=>'<div class="served">'+friend(x.animal,i)+unit(x.fruit,true)+'</div>').join('')+'</div>':key==='compare'?'<div class="open-gate"></div>':'<div class="make-board">'+Array.from({length:x.total},()=>dot(true,x.fruit)).join('')+'</div>';
  state.view='success';
  scene('<div class="success"><h2>'+outcome+'</h2>'+story+'<p>숲길이 이어졌어!</p>'+stepAction('advance','계속 탐험 →','다음 놀이로 이동')+'</div>');
  // The world continues on its own; no reading or finding a "next" button is required.
  clearTimeout(state.timer);
  state.timer=setTimeout(()=>{if(state.view==='success'&&state.locked)advance()},1800);
  return
 }
 state.attempts++;state.flagged=true;sfx(false);
 const xtext=key==='share'?(state.selected+state.served.length<x.n?'아직 간식을 못 받은 친구가 있어.':'간식이 조금 남겠어.') :key==='make'?(state.selected<x.total-x.have?'빈자리가 남아 있어.':'간식이 자리를 넘쳤어.'):'짝을 지어 보면 차이가 보여.';
 setStatus(xtext);
 const slot=$('feedbackSlot');if(slot){slot.innerHTML='<div class="feedback-error">'+xtext+'</div>'+(state.attempts>=2?'<div class="scaffold">'+renderPairing(x,key)+'</div>':'');}
 if(state.attempts>=2)state.hints++;
}
function assess(){const r=state.results.filter(z=>z.kind==='probe'||z.kind==='transfer');const clean=r.filter(z=>z.clean),transfer=r.find(z=>z.kind==='transfer');
 return {independent:clean.length,transfer:!!transfer?.clean,attempted:r.length,supported:state.results.length-clean.length,criteriaMet:clean.length>=2&&!!transfer?.clean}
}
function advance(){
 clearTimeout(state.timer);state.locked=false;state.selected=0;state.taken=0;state.served=[];state.attempts=0;state.hints=0;state.flagged=false;
 const nextStep=state.step+1;const review=assess();
 if(nextStep===5 && review.criteriaMet){chapterEnd();return}
 if(nextStep>=templates[CONCEPTS[state.concept].key].length){chapterEnd();return}
 state.step=nextStep;draw()
}
function chapterEnd(){
 const result=assess();
 state.review=result;save();state.view='chapter-end';helpButton(false);
 say(CONCEPTS[state.concept].kicker,'숲속 친구들이 다음 장소를 기다려요');
 scene('<div class="chapter-result"><div class="bloom" aria-hidden="true"></div>'+
 '<h2>숲길 하나가 환해졌어!</h2><div class="forest-chapter-reward" aria-hidden="true">'+
 friend('rabbit',0)+friend('bear',1)+'</div>'+
 stepAction('next-chapter',state.concept===2?'다시 숲속으로':'다음 숲길 →','다음 숲길')+'</div>');
 // No score, skill judgment, test report or completion dialog is required to keep playing.
 clearTimeout(state.timer);
 state.timer=setTimeout(()=>{if(state.view==='chapter-end'){
  if(state.concept===CONCEPTS.length-1)resetConcept(0);else resetConcept(state.concept+1);
 }},2500);
}
function handle(act,el){
 if(act==='start'||act==='restart'){resetConcept(0);return}
 if(act==='next-chapter'){if(state.concept===2){resetConcept(0);return}resetConcept(state.concept+1);return}
 if(act==='repeat'){resetConcept(state.concept);return}
 if(act==='advance'){if(state.view==='success')advance();return}
 if(state.view!=='task'||state.locked)return;
 const x=current(),key=CONCEPTS[state.concept].key;

 if(act==='take'){
  const max=key==='share'?x.n+2:x.total-x.have+3;
  if(state.taken>=max){setStatus('나무에 더는 간식이 없어. 바구니에서 다시 꺼낼 수 있어.');return}
  state.selected++;state.taken++;sfx(true);
  if(key==='make'&&state.selected===x.total-x.have){feedback(true);return}
  draw();return;
 }
 if(act==='undo'){
  if(state.selected>0){
   state.selected--;state.taken--;
   if(key==='share'&&state.served.length===x.n&&state.selected===0){feedback(true);return}
   draw();
  }
  return;
 }
 if(act==='serve'&&key==='share'){
  const i=Number(el.dataset.friend);
  if(!Number.isInteger(i)||i<0||i>=x.n||state.served.includes(i))return;
  if(state.selected<1){
   setStatus('바구니가 비었어. 나무에서 간식을 가져와 줘.');
   $('play').querySelector('.supply')?.classList.add('need-food');
   return;
  }
  state.selected--;state.served.push(i);
  // Feed the friend immediately, rather than requiring a separate "submit" quiz.
  if(state.served.length===x.n&&state.selected===0){feedback(true);return}
  if(state.served.length===x.n&&state.selected>0){
   state.attempts++;state.flagged=true;
   draw();setStatus('친구들은 먹었어! 바구니에 간식이 더 남아 있네.');
   return;
  }
  sfx(true);draw();return;
 }
 if(act==='submit'){
  if(key==='share'){
   const needed=x.n-state.served.length;
   if(state.selected===needed){
    // One-tap alternative for children who cannot accurately target each animal.
    state.served=Array.from({length:x.n},(_,i)=>i);state.selected=0;
    feedback(true);
   }else feedback(false);
  } else feedback(state.selected===x.total-x.have);
  return;
 }
 if(act==='choose'){const correct=x.want==='more'?(x.a>x.b?'a':'b'):(x.a<x.b?'a':'b');feedback(el.dataset.side===correct);return}
}
play.addEventListener('click',e=>{const b=e.target.closest('[data-mission]');if(b)handle(b.dataset.mission,b)});
$('visualHint').addEventListener('click',()=>help(true));$('help').addEventListener('click',()=>help(true));
$('sound').addEventListener('click',()=>{state.sound=!state.sound;$('sound').setAttribute('aria-pressed',String(state.sound));$('sound').textContent=state.sound?'소리 켜짐':'소리 꺼짐'});
$('restart').addEventListener('click',()=>resetConcept(0));$('change').addEventListener('click',()=>{if(state.view==='task'||state.view==='demo')chapterEnd()});
progress();resetConcept(0);
// Read-only state for deterministic browser QA. No personal data is recorded.
Object.defineProperty(window,'__moaMissionQA',{value:()=>({concept:CONCEPTS[state.concept].key,conceptIndex:state.concept,step:state.step,selected:state.selected,taken:state.taken,served:[...state.served],phase:state.view,attempts:state.attempts,hints:state.hints,flagged:state.flagged,task:{...current()},results:state.results.map(x=>({...x})),review:state.review?{...state.review}:null}),configurable:false});
})();
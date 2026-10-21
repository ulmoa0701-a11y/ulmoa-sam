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
const state={concept:0,step:0,selected:0,attempts:0,hints:0,flagged:false,sound:true,locked:false,view:'intro',results:[],timer:0,review:null};
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
 clearTimeout(state.timer);Object.assign(state,{concept:i,step:0,selected:0,attempts:0,hints:0,flagged:false,locked:false,view:'game',results:[],review:null});
 $('missionTitle').textContent=CONCEPTS[i].title;helpButton(true);progress();draw();
}
function showIntro(){
 state.view='intro';helpButton(false);$('missionTitle').textContent='도토리 배달 대작전';progress();say('모아의 숫자 숲','간식이 필요한 친구들이 있어!');
 scene('<div class="intro"><div class="intro-bag" aria-hidden="true">'+unit()+unit('berry')+unit()+'</div><div class="intro-title">친구들의 부탁을 해결할까?</div><p>직접 담고, 비교하고, 부족한 만큼 채워서 숲길을 열어요.</p>'+stepAction('start','배달 출발 →','숲속 배달 시작')+'</div>');
}
function demoVisual(task,key){
 if(key==='share'){return '<div class="demo-friends">'+Array.from({length:task.n},(_,i)=>'<div class="demo-pair">'+friend(task.animal,i)+dot(true,task.fruit)+'</div>').join('')+'</div><div class="visual-equation">'+task.n+'명의 친구 · '+task.n+'개의 간식</div>'}
 if(key==='compare'){return '<div class="compare-pair"><div class="quantity pile">'+Array.from({length:task.a},()=>unit(task.fruit)).join('')+'</div><div class="match-instruction">›</div><div class="quantity pile">'+Array.from({length:task.b},()=>unit(task.fruit)).join('')+'</div></div><div class="one-to-one">'+Array.from({length:Math.max(task.a,task.b)},(_,i)=>'<div class="matching-row">'+dot(i<task.a,task.fruit)+dot(i<task.b,task.fruit)+'</div>').join('')+'</div>'}
 return '<div class="make-board">'+Array.from({length:task.total},(_,i)=>dot(i<task.have,task.fruit)).join('')+'</div><div class="visual-equation">'+task.have+'개가 있어요. 빈자리만큼 더 필요해요.</div>';
}
function demo(){const x=current(),key=CONCEPTS[state.concept].key;
 state.view='demo';say('모아가 먼저 보여줄게','한 번 보고, 다음에는 직접 해볼까?');
 scene('<div class="lesson"><div class="lesson-lead">'+demoVisual(x,key)+'</div><div class="lesson-foot"><span class="observation">보는 차례 · 기록하지 않아요</span>'+stepAction('continue','내가 해볼래 →','모아의 시범을 보고 다음으로')+'</div></div>')}
function fruitTray(type,selected,stock){return '<div class="supply"><div class="supply-items">'+Array.from({length:stock},(_,i)=>stepAction('take',unit(type),'간식 하나 담기','data-index="'+i+'"')).join('')+'</div><p class="supply-caption">숲속 나무</p></div><div class="delivery"><div class="packed-food">'+Array.from({length:selected},()=>stepAction('undo',unit(type,true),'담은 간식 하나 꺼내기')).join('')+'</div><div class="basket-body"></div><p class="supply-caption">내 배달 바구니</p></div>'}
function shareBoard(x){
 const n=x.n;
 return '<div class="friends-line">'+Array.from({length:n},(_,i)=>'<div class="hungry-friend">'+friend(x.animal,i)+'<span class="dish" aria-hidden="true"></span></div>').join('')+'</div><div class="delivery-line">'+fruitTray(x.fruit,state.selected,n+2)+'</div>';
}
function compareBoard(x){return '<div class="compare-path">'+['a','b'].map((k,i)=>stepAction('choose','<div class="path-stand"><div class="fruit-pile">'+Array.from({length:x[k]},()=>unit(x.fruit)).join('')+'</div><span class="path-arch"></span></div>',i===0?'왼쪽':'오른쪽','data-side="'+k+'"')).join('')+'</div>'}
function makeBoard(x){return '<div class="make-layout"><div class="make-board">'+Array.from({length:x.total},(_,i)=>dot(i<x.have+state.selected,x.fruit)).join('')+'</div><div class="delivery-line">'+fruitTray(x.fruit,state.selected,x.total-x.have+3)+'</div></div>'}
function phaseText(x){if(x.kind==='guided')return '함께 연습';if(x.kind==='transfer')return '새로운 상황';if(x.kind==='probe')return '혼자 해보기';return '한 번 더 연습'}
function draw(){
 if(!state.view||state.view==='intro')return;
 const x=current(),key=CONCEPTS[state.concept].key;
 if(x.kind==='demo'){demo();return}
 state.view='task';
 const lab=phaseText(x);
 let headline=key==='share'?'친구마다 하나씩 담아 줘':key==='compare'?(x.want==='more'?'더 많은 쪽으로 출발!':'더 적은 쪽으로 출발!'):'빈자리를 채울 만큼 담아 줘';
 say(lab,headline);
 const board=key==='share'?shareBoard(x):key==='compare'?compareBoard(x):makeBoard(x);
 const feedback=state.attempts>0?'':null;
 scene('<div class="quest"><div class="quest-head"><span class="quest-chip">'+lab+'</span><div class="quest-pips">'+Array.from({length:Math.min(state.step,5)},()=>'<i></i>').join('')+'</div></div><div class="quest-board">'+board+'</div>'+(key==='compare'?'':'<div class="quest-actions">'+stepAction('submit','배달하기 →','선택한 간식으로 배달하기')+'</div>')+'<div class="feedback-slot" id="feedbackSlot" aria-live="polite"></div></div>');
 if(state.flagged){const label=document.querySelector('#feedbackSlot');if(label)label.textContent='아직 연습 중이야. 다시 해봐도 돼.'}
}
function renderPairing(x,key){
 if(key==='compare'){
  return '<div class="one-to-one">'+Array.from({length:Math.max(x.a,x.b)},(_,i)=>'<div class="matching-row">'+dot(i<x.a,x.fruit)+dot(i<x.b,x.fruit)+'</div>').join('')+'</div><p>하나씩 짝지어 보면 어디가 남을까?</p>';
 }
 const wanted=key==='share'?x.n:x.total-x.have;return '<div class="help-model"><span>필요한 자리</span><div class="match-row">'+Array.from({length:wanted},(_,i)=>dot(i<state.selected,x.fruit)).join('')+'</div></div><p>빈자리와 담은 간식을 하나씩 짝지어 볼까?</p>'
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
  const outcome=key==='compare'?'숲길이 반짝 열렸어!':key==='share'?'모두 간식을 받았어!':'꽃밭에 꽃이 피었어!';
  const story=key==='share'?'<div class="success-line">'+Array.from({length:x.n},(_,i)=>'<div class="served">'+friend(x.animal,i)+unit(x.fruit,true)+'</div>').join('')+'</div>':key==='compare'?'<div class="open-gate"></div>':'<div class="make-board">'+Array.from({length:x.total},()=>dot(true,x.fruit)).join('')+'</div>';
  scene('<div class="success"><h2>'+outcome+'</h2>'+story+'<p>다음 장소가 기다리고 있어!</p>'+stepAction('advance','계속 탐험 →','다음 놀이로 이동')+'</div>');
  return
 }
 state.attempts++;state.flagged=true;sfx(false);
 const xtext=key==='share'?(state.selected<x.n?'아직 간식을 못 받은 친구가 있어.':'간식이 조금 남겠어.') :key==='make'?(state.selected<x.total-x.have?'빈자리가 남아 있어.':'간식이 자리를 넘쳤어.'):'짝을 지어 보면 차이가 보여.';
 setStatus(xtext);
 const slot=$('feedbackSlot');if(slot){slot.innerHTML='<div class="feedback-error">'+xtext+'</div>'+(state.attempts>=2?renderPairing(x,key):'');}
 if(state.attempts>=2)state.hints++;
}
function assess(){const r=state.results.filter(z=>z.kind==='probe'||z.kind==='transfer');const clean=r.filter(z=>z.clean),transfer=r.find(z=>z.kind==='transfer');
 return {independent:clean.length,transfer:!!transfer?.clean,attempted:r.length,supported:state.results.length-clean.length,criteriaMet:clean.length>=2&&!!transfer?.clean}
}
function advance(){
 clearTimeout(state.timer);state.locked=false;state.selected=0;state.attempts=0;state.hints=0;state.flagged=false;
 const nextStep=state.step+1;const review=assess();
 if(nextStep===5 && review.criteriaMet){chapterEnd();return}
 if(nextStep>=templates[CONCEPTS[state.concept].key].length){chapterEnd();return}
 state.step=nextStep;draw()
}
function chapterEnd(){
 const result=assess();state.review=result;save();state.view='chapter-end';helpButton(false);
 const heading=result.criteriaMet?'혼자 해결한 장면이 늘었어!':'이 부분은 조금 더 연습할 수 있어';
 say(CONCEPTS[state.concept].kicker,'숲길의 작은 목표를 마쳤어');
 const pct=result.attempted?Math.round(100*result.independent/result.attempted):0;
 scene('<div class="chapter-result"><div class="bloom" aria-hidden="true"></div><h2>'+heading+'</h2><p>도움 없이 해결한 새 문제 '+result.independent+'개 · 새로운 상황 '+(result.transfer?'혼자 해결':'추가 연습 필요')+'</p><small>기록은 놀이 중 반응만 나타내며 수학 능력의 확정적 판정이 아니에요.</small><div class="result-actions">'+stepAction('repeat','이 숲길 다시 놀기','현재 개념을 다시 연습')+stepAction('next-chapter',state.concept===2?'모험 처음으로':'다음 숲길로 →','다음 모험으로')+'</div></div>');
}
function handle(act,el){
 if(act==='start'){resetConcept(0);return}
 if(act==='continue'){state.step=1;state.view='task';draw();return}
 if(act==='next-chapter'){if(state.concept===2){showIntro();return}resetConcept(state.concept+1);return}
 if(act==='repeat'){resetConcept(state.concept);return}
 if(act==='advance'){advance();return}
 if(state.view!=='task'||state.locked)return;
 const x=current(),key=CONCEPTS[state.concept].key;
 if(act==='take'){const max=x.kind==='demo'?10:key==='share'?x.n+2:x.total-x.have+3;if(state.selected>=max){setStatus('바구니가 꽉 찼어. 필요 없는 간식을 꺼낼 수 있어.');return}state.selected++;sfx(true);draw();return}
 if(act==='undo'){if(state.selected>0){state.selected--;draw()}return}
 if(act==='submit'){feedback(state.selected===(key==='share'?x.n:x.total-x.have));return}
 if(act==='choose'){const correct=x.want==='more'?(x.a>x.b?'a':'b'):(x.a<x.b?'a':'b');feedback(el.dataset.side===correct);return}
}
play.addEventListener('click',e=>{const b=e.target.closest('[data-mission]');if(b)handle(b.dataset.mission,b)});
$('visualHint').addEventListener('click',()=>help(true));$('help').addEventListener('click',()=>help(true));
$('sound').addEventListener('click',()=>{state.sound=!state.sound;$('sound').setAttribute('aria-pressed',String(state.sound));$('sound').textContent=state.sound?'소리 켜짐':'소리 꺼짐'});
$('restart').addEventListener('click',()=>showIntro());$('change').addEventListener('click',()=>{if(state.view==='task'||state.view==='demo')chapterEnd()});
progress();showIntro();
// Read-only state for deterministic browser QA. No personal data is recorded.
Object.defineProperty(window,'__moaMissionQA',{value:()=>({concept:CONCEPTS[state.concept].key,conceptIndex:state.concept,step:state.step,selected:state.selected,phase:state.view,attempts:state.attempts,hints:state.hints,flagged:state.flagged,task:{...current()},results:state.results.map(x=>({...x})),review:state.review?{...state.review}:null}),configurable:false});
})();
/* Guided discovery pilot, not a diagnostic or efficacy-tested curriculum.
   Principles: explicit modelling, concrete manipulation, feedback, fading, varied exemplars,
   independent transfer probes separately counted. No speech synthesis or telemetry. */
(()=>{'use strict';
const $=id=>document.getElementById(id),play=$('play'),stage=$('stage'),feedbackFlash=$('feedbackFlash');
let flashTimer=0;
const storeKey='moa-numbers-guided-pilot-v1';
const CONCEPTS=[
 {key:'share',name:'첫 번째 숲길',title:'간식을 골고루!',kicker:'숲속 간식 배달',short:'친구마다 한 개씩'},
 {key:'compare',name:'두 번째 숲길',title:'어느 쪽이 더 많을까?',kicker:'두 갈래 오솔길',short:'수량 비교'},
 {key:'make',name:'세 번째 숲길',title:'빈자리 채우기',kicker:'반짝 꽃밭',short:'수의 구성'}
];
const MAP_ICONS={share:'tree',compare:'fork',make:'flower'};
const TRAVEL_LINES={share:'오솔길을 따라 걷다 보니, 배고픈 친구들이 나무 아래 모여 있어요!',compare:'두 갈래로 갈라지는 오솔길 앞에 도착했어요. 더미를 비교해서 길을 선택해요!',make:'반짝이는 꽃밭에 도착했어요. 빈자리를 채우면 꽃이 활짝 필 거예요!'};
const ICONS={
 play:'<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
 check:'<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>',
 cross:'<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
 arrowRight:'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
 mapReturn:'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 20l-6-2V5l6 2m0 13l6-2m-6 2V7m6 11l6 2V7l-6-2m0 15V5m0 0L9 7"/></svg>',
 retry:'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 1 3 6.7M3 12v6h6"/></svg>',
 speakerOn:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19 6a9 9 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
 speakerOff:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9l5 5M21 9l-5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
 home:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/></svg>',
 hint:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
 shuffle:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h3.5L15 17h3M17 7h-3.5L5 17H3"/><path d="M17 4l3 3-3 3M17 20l3-3-3-3"/></svg>'
};
const srLabel=s=>'<span class="sr-only">'+s+'</span>';
const templates={
 share:[{kind:'demo',n:2,animal:'rabbit',fruit:'acorn'},{kind:'guided',n:2,animal:'bear',fruit:'acorn'},{kind:'probe',n:3,animal:'fox',fruit:'acorn'},{kind:'probe',n:4,animal:'rabbit',fruit:'acorn'},{kind:'transfer',n:3,animal:'bird',fruit:'berry'},{kind:'practice',n:2,animal:'frog',fruit:'berry'},{kind:'transfer',n:4,animal:'bear',fruit:'berry'}],
 compare:[{kind:'demo',a:2,b:3,want:'more',fruit:'acorn'},{kind:'guided',a:2,b:4,want:'more',fruit:'acorn'},{kind:'probe',a:4,b:2,want:'less',fruit:'acorn'},{kind:'probe',a:3,b:4,want:'more',fruit:'berry'},{kind:'transfer',a:4,b:3,want:'less',fruit:'berry'},{kind:'practice',a:2,b:3,want:'less',fruit:'berry'},{kind:'transfer',a:3,b:2,want:'more',fruit:'acorn'}],
 make:[{kind:'demo',total:4,have:2,fruit:'acorn'},{kind:'guided',total:4,have:3,fruit:'acorn'},{kind:'probe',total:5,have:2,fruit:'acorn'},{kind:'probe',total:5,have:4,fruit:'berry'},{kind:'transfer',total:6,have:2,fruit:'berry'},{kind:'practice',total:4,have:1,fruit:'berry'},{kind:'transfer',total:5,have:3,fruit:'acorn'}]
};
const state={concept:0,step:0,selected:0,taken:0,served:[],attempts:0,hints:0,flagged:false,sound:true,locked:false,view:'intro',results:[],timer:0,review:null,unlocked:0};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;'}[c]));
const unit=(type='acorn',small=false)=>'<span class="food '+(type==='berry'?'berry':'acorn')+' '+(small?'mini':'')+'" aria-hidden="true"></span>';
const friend=(name,i,happy)=>'<img class="forest-friend clay-photo" src="./assets/mission-v4/characters/'+name+'_'+(happy?'happy':'waiting')+'.png" alt="">';
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
 clearTimeout(state.timer);Object.assign(state,{concept:i,step:0,selected:0,taken:0,served:[],attempts:0,hints:0,flagged:false,locked:false,view:'game',results:[],review:null});
 $('missionTitle').textContent=CONCEPTS[i].title;helpButton(true);progress();draw();
}
function showIntro(){
 state.view='intro';helpButton(false);$('missionTitle').textContent='도토리 배달 대작전';progress();say('모아의 숫자 숲','간식이 필요한 친구들이 있어!');
 scene('<div class="intro"><div class="intro-bag" aria-hidden="true">'+unit()+unit('berry')+unit()+'</div><div class="intro-title">친구들의 부탁을 해결할까?</div><p>직접 담고, 비교하고, 부족한 만큼 채워서 숲길을 열어요.</p>'+stepAction('start',ICONS.play+srLabel('배달 출발'),'숲속 배달 시작')+'</div>');
}
function showMap(){
 state.view='map';helpButton(false);$('missionTitle').textContent='모아의 숫자 숲 지도';progress();
 say('숲속 지도','어느 숲길로 떠나볼까?');
 const allDone=state.unlocked>=CONCEPTS.length;
 const nodes=CONCEPTS.map((cpt,i)=>{
  const st=i<state.unlocked?'done':i===state.unlocked?'current':'locked';
  const badge='<span class="map-node-badge icon-'+MAP_ICONS[cpt.key]+'" aria-hidden="true"></span>';
  const label='<span class="map-node-label">'+cpt.name+'</span><span class="map-node-sub">'+cpt.short+'</span>';
  const check=st==='done'?'<span class="map-node-check" aria-hidden="true">\u2713</span>':'';
  if(st==='locked')return '<div class="map-node locked" aria-hidden="true">'+badge+label+'</div>';
  return '<button type="button" data-mission="travel-to" data-node="'+i+'" class="map-node interaction '+st+'" aria-label="'+esc(cpt.name+' 으로 이동')+'">'+badge+label+check+'</button>';
 }).join('<div class="map-connector" aria-hidden="true"></div>');
 scene('<div class="overworld">'+(allDone?'<p class="overworld-complete">세 숲길을 모두 걸었어요! 다시 놀러 가 볼까?</p>':'')+'<div class="map-path">'+nodes+'</div></div>');
}
function travelBeat(){
 state.view='travel';helpButton(false);
 const key=CONCEPTS[state.concept].key;
 say(CONCEPTS[state.concept].kicker,'길을 걷는 중');
 scene('<div class="travel-scene"><span class="map-node-badge travel-badge icon-'+MAP_ICONS[key]+'" aria-hidden="true"></span><div class="travel-steps" aria-hidden="true"><i></i><i></i><i></i></div><p>'+TRAVEL_LINES[key]+'</p>'+stepAction('arrive',ICONS.arrowRight+srLabel('도착했어요'),'다음 장소에 도착')+'</div>');
}
function demoVisual(task,key){
 if(key==='share'){return '<div class="demo-friends">'+Array.from({length:task.n},(_,i)=>'<div class="demo-pair">'+friend(task.animal,i)+dot(true,task.fruit)+'</div>').join('')+'</div><div class="visual-equation">'+task.n+'명의 친구 · '+task.n+'개의 간식</div>'}
 if(key==='compare'){return '<div class="compare-pair"><div class="quantity pile">'+Array.from({length:task.a},()=>unit(task.fruit)).join('')+'</div><div class="match-instruction">›</div><div class="quantity pile">'+Array.from({length:task.b},()=>unit(task.fruit)).join('')+'</div></div><div class="one-to-one">'+Array.from({length:Math.max(task.a,task.b)},(_,i)=>'<div class="matching-row">'+dot(i<task.a,task.fruit)+dot(i<task.b,task.fruit)+'</div>').join('')+'</div>'}
 return '<div class="make-board">'+Array.from({length:task.total},(_,i)=>dot(i<task.have,task.fruit)).join('')+'</div><div class="visual-equation">'+task.have+'개가 있어요. 빈자리만큼 더 필요해요.</div>';
}
function demo(){const x=current(),key=CONCEPTS[state.concept].key;
 state.view='demo';say('모아가 먼저 보여줄게','한 번 보고, 다음에는 직접 해볼까?');
 scene('<div class="lesson"><div class="lesson-lead">'+demoVisual(x,key)+'</div><div class="lesson-foot"><span class="observation">보는 차례 · 기록하지 않아요</span>'+stepAction('continue',ICONS.arrowRight+srLabel('내가 해볼래'),'모아의 시범을 보고 다음으로')+'</div></div>')}
function fruitTray(type,selected,stock,taken=selected){return '<div class="supply"><div class="supply-items"><div class="tree-pile">'+Array.from({length:Math.max(0,stock-taken)},(_,i)=>stepAction('take',unit(type),'간식 하나 담기','data-index="'+i+'"')).join('')+'</div></div><p class="supply-caption">숲속 나무</p></div><div class="delivery"><div class="packed-food"><div class="basket-pile">'+Array.from({length:selected},()=>stepAction('undo',unit(type,true),'담은 간식 하나 꺼내기')).join('')+'</div></div><p class="supply-caption">내 배달 바구니</p></div>'}
function shareBoard(x){
 const n=x.n;
 return '<div class="friends-line">'+Array.from({length:n},(_,i)=>{
  const fed=state.served.includes(i);
  return '<button type="button" class="hungry-friend feed-friend '+(fed?'friend-fed':'')+'" data-mission="serve" data-friend="'+i+'" aria-label="'+esc(fed?'간식 받은 친구':'친구에게 간식 하나 주기')+'" '+(fed?'disabled':'')+'>'+friend(x.animal,i)+'<span class="dish '+(fed?'dish-filled':'')+'" aria-hidden="true">'+(fed?unit(x.fruit,true):'')+'</span></button>';
 }).join('')+'</div><div class="delivery-line">'+fruitTray(x.fruit,state.selected,n+2,state.taken)+'</div>';
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
 scene('<div class="quest"><div class="quest-head"><span class="quest-chip">'+lab+'</span><div class="quest-pips">'+Array.from({length:Math.min(state.step,5)},()=>'<i></i>').join('')+'</div></div><div class="quest-board">'+board+'</div>'+(key==='share'?'<div class="quest-actions">'+stepAction('submit',ICONS.check+srLabel('한 번에 주기'),'모든 친구에게 한 번에 간식 주기')+'</div>':'')+'<div class="feedback-slot" id="feedbackSlot" aria-live="polite"></div></div>');
 if(x.kind==='guided'&&!state.flagged){const label=$('feedbackSlot');if(label)label.innerHTML='<div class="guided-preview">'+renderPairing(x,key)+'</div>';} else if(state.flagged){const label=$('feedbackSlot');if(label)label.textContent='다시 살펴볼 수 있어.'}
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
function flashFeedback(ok){
 if(!feedbackFlash)return;
 feedbackFlash.innerHTML=ok?ICONS.check:ICONS.cross;
 feedbackFlash.className='feedback-flash show '+(ok?'ok':'no');
 clearTimeout(flashTimer);
 flashTimer=setTimeout(()=>{feedbackFlash.className='feedback-flash'},650);
}
function feedback(isCorrect){
 flashFeedback(isCorrect);
 const x=current(),key=CONCEPTS[state.concept].key;
 if(isCorrect){state.locked=true;sfx(true);
  const clean=x.kind!=='guided'&&x.kind!=='demo'&&!state.flagged&&state.attempts===0&&state.hints===0;
  state.results.push({kind:x.kind,clean,concept:key});
  if(x.kind==='guided')setStatus('잘했어. 이제 혼자 해볼 차례야.');else if(clean)setStatus('이번에는 혼자 해결했어!');else setStatus('도움을 받고 해결했어. 다음에는 새로 해볼 수 있어.');
  const outcome=key==='compare'?'숲길이 반짝 열렸어!':key==='share'?'모두 간식을 받았어!':'꽃밭에 꽃이 피었어!';
  const story=key==='share'?'<div class="success-line">'+Array.from({length:x.n},(_,i)=>'<div class="served">'+friend(x.animal,i,true)+unit(x.fruit,true)+'</div>').join('')+'</div>':key==='compare'?'<div class="open-gate"></div>':'<div class="make-board">'+Array.from({length:x.total},()=>dot(true,x.fruit)).join('')+'</div>';
  scene('<div class="success"><h2>'+outcome+'</h2>'+story+'<p>다음 장소가 기다리고 있어!</p>'+stepAction('advance',ICONS.arrowRight+srLabel('계속 탐험'),'다음 놀이로 이동')+'</div>');
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
 const result=assess();state.review=result;save();if(state.concept>=state.unlocked)state.unlocked=state.concept+1;state.view='chapter-end';helpButton(false);
 const heading=result.criteriaMet?'혼자 해결한 장면이 늘었어!':'이 부분은 조금 더 연습할 수 있어';
 say(CONCEPTS[state.concept].kicker,'숲길의 작은 목표를 마쳤어');
 const pct=result.attempted?Math.round(100*result.independent/result.attempted):0;
 scene('<div class="chapter-result"><div class="bloom" aria-hidden="true"><div class="confetti"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div><h2>'+heading+'</h2><p>도움 없이 해결한 새 문제 '+result.independent+'개 · 새로운 상황 '+(result.transfer?'혼자 해결':'추가 연습 필요')+'</p><small>기록은 놀이 중 반응만 나타내며 수학 능력의 확정적 판정이 아니에요.</small><div class="result-actions">'+stepAction('repeat',ICONS.retry+srLabel('이 숲길 다시 놀기'),'현재 개념을 다시 연습')+stepAction('next-chapter',ICONS.mapReturn+srLabel('지도로 돌아가기'),'숲속 지도로 돌아가기')+'</div></div>');
}
function handle(act,el){
 if(act==='start'){showMap();return}
 if(act==='continue'){travelBeat();return}
 if(act==='arrive'){helpButton(true);state.step=1;state.view='task';draw();return}
 if(act==='travel-to'){resetConcept(Number(el.dataset.node));return}
 if(act==='next-chapter'){showMap();return}
 if(act==='repeat'){resetConcept(state.concept);return}
 if(act==='advance'){advance();return}
 if(state.view!=='task'||state.locked)return;
 const x=current(),key=CONCEPTS[state.concept].key;
 if(act==='take'){const max=x.kind==='demo'?10:key==='share'?x.n+2:x.total-x.have+3;if(state.taken>=max){setStatus('나무에 간식이 더 없어. 바구니에서 다시 꺼낼 수 있어.');return}state.selected++;state.taken++;sfx(true);if(key==='make'&&state.selected===x.total-x.have){feedback(true);return}draw();return}
 if(act==='undo'){if(state.selected>0){state.selected--;state.taken--;if(key==='share'&&state.served.length===x.n&&state.selected===0){feedback(true);return}draw()}return}
 if(act==='serve'&&key==='share'){
  const i=Number(el.dataset.friend);
  if(!Number.isInteger(i)||i<0||i>=x.n||state.served.includes(i))return;
  if(state.selected<1){setStatus('바구니가 비었어. 나무에서 간식을 가져와 줘.');$('play').querySelector('.supply')?.classList.add('need-food');return}
  state.selected--;state.served.push(i);
  if(state.served.length===x.n&&state.selected===0){feedback(true);return}
  if(state.served.length===x.n&&state.selected>0){state.attempts++;state.flagged=true;draw();setStatus('친구들은 먹었어! 바구니에 간식이 더 남아 있네.');return}
  sfx(true);draw();return;
 }
 if(act==='submit'){
  if(key==='share'){const needed=x.n-state.served.length;if(state.selected===needed){state.served=Array.from({length:x.n},(_,i)=>i);state.selected=0;feedback(true)}else feedback(false);return}
  feedback(state.selected===x.total-x.have);return;
 }
 if(act==='choose'){const correct=x.want==='more'?(x.a>x.b?'a':'b'):(x.a<x.b?'a':'b');feedback(el.dataset.side===correct);return}
}
play.addEventListener('click',e=>{const b=e.target.closest('[data-mission]');if(b)handle(b.dataset.mission,b)});
$('visualHint').addEventListener('click',()=>help(true));$('help').addEventListener('click',()=>help(true));
$('sound').addEventListener('click',()=>{state.sound=!state.sound;$('sound').setAttribute('aria-pressed',String(state.sound));$('sound').setAttribute('aria-label',state.sound?'효과음 끄기':'효과음 켜기');$('sound').innerHTML=(state.sound?ICONS.speakerOn:ICONS.speakerOff)+srLabel(state.sound?'소리 켜짐':'소리 꺼짐')});
$('restart').addEventListener('click',()=>showIntro());$('change').addEventListener('click',()=>{if(state.view==='task'||state.view==='demo')chapterEnd()});
$('sound').innerHTML=ICONS.speakerOn+srLabel('소리 켜짐');
$('restart').innerHTML=ICONS.home+srLabel('새 모험');
$('help').innerHTML=ICONS.hint+srLabel('그림 힌트');
$('change').innerHTML=ICONS.shuffle+srLabel('잠깐 다른 놀이');
progress();showIntro();
// Read-only state for deterministic browser QA. No personal data is recorded.
Object.defineProperty(window,'__moaMissionQA',{value:()=>({concept:CONCEPTS[state.concept].key,conceptIndex:state.concept,step:state.step,selected:state.selected,taken:state.taken,served:[...state.served],phase:state.view,attempts:state.attempts,hints:state.hints,flagged:state.flagged,task:{...current()},results:state.results.map(x=>({...x})),review:state.review?{...state.review}:null}),configurable:false});
})();
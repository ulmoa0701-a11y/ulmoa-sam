/* Fused forest world: persistent village (gather/pet/build) + quest engine (share/compare/make).
   mission.js and village.js are both left completely untouched by this file — this is new,
   additive content that ports their logic rather than modifying them.
   Quest scoring/independent-vs-assisted logic is ported verbatim from mission.js: no change to
   how correctness, hints, attempts, or clean/independent results are computed.
   The one new bridge point is in chapterEnd(): finishing a quest chapter credits a flat,
   performance-independent reward to the shared village currency (see style-guide.md for why
   the reward does not scale with how well the child did). */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const play=$('play'),stage=$('stage'),feedbackFlash=$('feedbackFlash');
let flashTimer=0;
const GATHER_COOLDOWN_MS=9000;
const gatherCooldownUntil={acorns:0,berries:0};
const storeKey='moa-forest-world-v1';
const A='./assets/mission-v4/',V='./assets/village-v1/';

/* ---------- shared icon set (deduped from mission.js + village.js) ---------- */
const ICONS={
 play:'<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
 check:'<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>',
 cross:'<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
 arrowRight:'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
 mapReturn:'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 20l-6-2V5l6 2m0 13l6-2m-6 2V7m6 11l6 2V7l-6-2m0 15V5m0 0L9 7"/></svg>',
 retry:'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 1 3 6.7M3 12v6h6"/></svg>',
 speakerOn:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19 6a9 9 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
 speakerOff:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9l5 5M21 9l-5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
 hint:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
 shuffle:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h3.5L15 17h3M17 7h-3.5L5 17H3"/><path d="M17 4l3 3-3 3M17 20l3-3-3-3"/></svg>',
 tree:'<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M12 2 6 11h3l-4 6h5v5h4v-5h5l-4-6h3z"/></svg>',
 heart:'<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-10-9.3C.4 7.9 2.8 4 6.6 4c2 0 3.6 1.1 4.4 2.6C11.8 5.1 13.4 4 15.4 4c3.8 0 6.2 3.9 4.6 7.7C19.5 16.4 12 21 12 21z"/></svg>',
 house:'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/></svg>',
 paw:'<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><circle cx="7" cy="8" r="2.3"/><circle cx="12" cy="6" r="2.3"/><circle cx="17" cy="8" r="2.3"/><ellipse cx="12" cy="15" rx="5.5" ry="4.5"/></svg>'
};
const srLabel=s=>'<span class="sr-only">'+s+'</span>';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- quest content (verbatim from mission.js) ---------- */
const CONCEPTS=[
 {key:'share',name:'첫 번째 숲길',title:'간식을 골고루!',kicker:'숲속 간식 배달',short:'친구마다 한 개씩'},
 {key:'compare',name:'두 번째 숲길',title:'어느 쪽이 더 많을까?',kicker:'두 갈래 오솔길',short:'수량 비교'},
 {key:'make',name:'세 번째 숲길',title:'빈자리 채우기',kicker:'반짝 꽃밭',short:'수의 구성'},
 {key:'bridge',name:'네 번째 숲길',title:'끊어진 다리 복구',kicker:'끊어진 다리',short:'길이 합치기'},
 {key:'shop',name:'다섯 번째 숲길',title:'여우네 수상한 가게',kicker:'여우네 가게',short:'숫자·그림 주문'},
 {key:'transform',name:'여섯 번째 숲길',title:'변신하는 숫자 숲',kicker:'변신하는 숲',short:'모양이 달라도 똑같은 수'},
 {key:'journey',name:'일곱 번째 숲길',title:'새로운 마을 탐험',kicker:'새 마을 입구',short:'배운 걸 새 마을에서'}
];
const MAP_ICONS={share:'tree',compare:'fork',make:'flower',bridge:'bridge',shop:'shop',transform:'transform',journey:'journey'};
const TRAVEL_LINES={share:'오솔길을 따라 걷다 보니, 배고픈 친구들이 나무 아래 모여 있어요!',compare:'두 갈래로 갈라지는 오솔길 앞에 도착했어요. 더미를 비교해서 길을 선택해요!',make:'반짝이는 꽃밭에 도착했어요. 빈자리를 채우면 꽃이 활짝 필 거예요!',bridge:'숲길을 걷다 보니 다리가 끊어져 있어요! 나무 판자를 이어서 다리를 고쳐 볼까?',shop:'오솔길 끝에 여우네 가게가 보여요! 손님이 적어준 주문만큼 담아 드려 볼까?',transform:'숲 속 빈터에 도착했어요! 모양이 달라져도 수가 똑같은 걸 찾아볼까?',journey:'오솔길 끝에 처음 보는 마을이 나타났어요! 그동안 배운 걸로 새 마을 친구들을 도와줄까?'};
const templates={
 share:[{kind:'demo',n:2,animal:'rabbit',fruit:'acorn'},{kind:'guided',n:2,animal:'bear',fruit:'acorn'},{kind:'probe',n:3,animal:'fox',fruit:'acorn'},{kind:'probe',n:4,animal:'rabbit',fruit:'acorn'},{kind:'transfer',n:3,animal:'bird',fruit:'berry'},{kind:'practice',n:2,animal:'frog',fruit:'berry'},{kind:'transfer',n:4,animal:'bear',fruit:'berry'}],
 compare:[{kind:'demo',a:2,b:3,want:'more',fruit:'acorn'},{kind:'guided',a:2,b:4,want:'more',fruit:'acorn'},{kind:'probe',a:4,b:2,want:'less',fruit:'acorn'},{kind:'probe',a:3,b:4,want:'more',fruit:'berry'},{kind:'transfer',a:4,b:3,want:'less',fruit:'berry'},{kind:'practice',a:2,b:3,want:'less',fruit:'berry'},{kind:'transfer',a:3,b:2,want:'more',fruit:'acorn'}],
 make:[{kind:'demo',total:4,have:2,fruit:'acorn'},{kind:'guided',total:4,have:3,fruit:'acorn'},{kind:'probe',total:5,have:2,fruit:'acorn'},{kind:'probe',total:5,have:4,fruit:'berry'},{kind:'transfer',total:6,have:2,fruit:'berry'},{kind:'practice',total:4,have:1,fruit:'berry'},{kind:'transfer',total:5,have:3,fruit:'acorn'}],
 bridge:[{kind:'demo',target:4,pieces:[1,3],material:'plain'},{kind:'guided',target:5,pieces:[2,3,1],material:'plain'},{kind:'probe',target:5,pieces:[1,4,2,3],material:'plain'},{kind:'probe',target:6,pieces:[2,4,1,3],material:'plain'},{kind:'transfer',target:4,pieces:[1,1,2,3],material:'mossy'},{kind:'practice',target:5,pieces:[2,2,3,1],material:'mossy'},{kind:'transfer',target:6,pieces:[3,3,2,1],material:'plain'}],
 shop:[{kind:'demo',qty:3,repr:'dots',customer:'fox',fruit:'acorn'},{kind:'guided',qty:3,repr:'numeral',customer:'rabbit',fruit:'acorn'},{kind:'probe',qty:4,repr:'dots',customer:'frog',fruit:'acorn'},{kind:'probe',qty:2,repr:'numeral',customer:'bird',fruit:'berry'},{kind:'transfer',qty:5,repr:'dots',customer:'bear',fruit:'berry'},{kind:'practice',qty:3,repr:'numeral',customer:'fox',fruit:'berry'},{kind:'transfer',qty:4,repr:'numeral',customer:'rabbit',fruit:'acorn'}],
 transform:[
  {kind:'demo',ref:{count:3,fruit:'acorn'}},
  {kind:'guided',ref:{count:3,fruit:'acorn'},options:{a:{count:3,arr:'spread'},b:{count:4,arr:'cluster'}},correct:'a'},
  {kind:'probe',ref:{count:4,fruit:'acorn'},options:{a:{count:5,arr:'spread'},b:{count:4,arr:'cluster'}},correct:'b'},
  {kind:'probe',ref:{count:2,fruit:'acorn'},options:{a:{count:2,arr:'spread'},b:{count:3,arr:'cluster'}},correct:'a'},
  {kind:'transfer',ref:{count:5,fruit:'berry'},options:{a:{count:4,arr:'cluster'},b:{count:5,arr:'spread'}},correct:'b'},
  {kind:'practice',ref:{count:3,fruit:'berry'},options:{a:{count:3,arr:'cluster'},b:{count:2,arr:'spread'}},correct:'a'},
  {kind:'transfer',ref:{count:4,fruit:'acorn'},options:{a:{count:3,arr:'spread'},b:{count:4,arr:'cluster'}},correct:'b'}
 ],
 journey:[
  {kind:'demo',mech:'share',n:2,animal:'rabbit',fruit:'shell'},
  {kind:'guided',mech:'share',n:3,animal:'bear',fruit:'flower'},
  {kind:'probe',mech:'compare',a:3,b:5,want:'more',fruit:'shell'},
  {kind:'probe',mech:'make',total:5,have:3,fruit:'flower'},
  {kind:'transfer',mech:'shop',qty:4,repr:'numeral',customer:'frog',fruit:'shell'},
  {kind:'practice',mech:'share',n:3,animal:'bird',fruit:'shell'},
  {kind:'transfer',mech:'make',total:6,have:2,fruit:'flower'}
 ]
};

/* ---------- unified state: village fields persist fully; quest mid-task fields are
   session-only (same behaviour mission.js already had — a reload always starts a chapter
   fresh at its demo). unlocked (map progress) and per-concept review logs are new additions
   to what's persisted, since village.js's pattern already does full persistence and losing
   map progress on every reload would be a regression relative to that. */
const DEFAULT_PERSIST={acorns:0,berries:0,feedCount:0,hunger:60,buildings:[],sound:true,lastFed:0,tab:'gather',unlocked:0,reviewLog:{}};
/* Mid-task quest progress (which step, what's selected/served/placed, attempts/hints/flagged,
   the accumulated per-step results this chapter attempt) is now ALSO persisted, so returning to
   the quest tab mid-task -- or reloading mid-task -- resumes at the same step with the same
   in-progress state instead of restarting at that chapter's demo. This does not change what
   feedback()/assess()/advance() compute, only what survives a reload/tab-switch. 'locked' and
   'review' stay session-only: 'locked' is a transient success-animation flag (safe to drop --
   worst case a reload right after solving re-shows the task board instead of the success screen,
   which is a known minor gap, not a correctness issue), and 'review' is only set at chapterEnd. */
const QUEST_PERSIST_FIELDS=['concept','step','selected','taken','served','planksPlaced','attempts','hints','flagged','view','results'];
const SESSION_DEFAULTS={concept:0,step:0,selected:0,taken:0,served:[],planksPlaced:[],attempts:0,hints:0,flagged:false,locked:false,view:'map',results:[],timer:0,review:null};
const state=(()=>{
 let persisted={};
 try{const s=JSON.parse(localStorage.getItem(storeKey)||'{}');if(s&&typeof s==='object'&&!Array.isArray(s))persisted=s}catch(e){}
 return Object.assign({},DEFAULT_PERSIST,SESSION_DEFAULTS,persisted);
})();
if(!Array.isArray(state.buildings))state.buildings=[];
if(!state.reviewLog||typeof state.reviewLog!=='object')state.reviewLog={};
if(!Array.isArray(state.served))state.served=[];
if(!Array.isArray(state.planksPlaced))state.planksPlaced=[];
if(!Array.isArray(state.results))state.results=[];
if(!Number.isInteger(state.concept)||state.concept<0||state.concept>=CONCEPTS.length)state.concept=0;
function save(){try{
 const persist={acorns:state.acorns,berries:state.berries,feedCount:state.feedCount,hunger:state.hunger,buildings:state.buildings,sound:state.sound,lastFed:state.lastFed,tab:state.tab,unlocked:state.unlocked,reviewLog:state.reviewLog};
 QUEST_PERSIST_FIELDS.forEach(k=>{persist[k]=state[k]});
 localStorage.setItem(storeKey,JSON.stringify(persist));
}catch(e){}}
function sfx(ok=true){if(!state.sound)return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;const ctx=window.__moaForestSound||(window.__moaForestSound=new Audio());ctx.resume?.();let t=ctx.currentTime;for(let i=0;i<(ok?2:1);i++){const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.value=ok?[493.9,659.3][i]:220;gain.gain.setValueAtTime(.0001,t+i*.09);gain.gain.exponentialRampToValueAtTime(.045,t+i*.09+.015);gain.gain.exponentialRampToValueAtTime(.0001,t+i*.09+.18);osc.connect(gain);gain.connect(ctx.destination);osc.start(t+i*.09);osc.stop(t+i*.09+.2)}}catch(e){}}

/* 'shell' is a data-model fruit id (see templates' fruit:'shell'), but it cannot double as the
   CSS class name: forest-world.css already has an unrelated page-wrapper rule `.shell{min-height:
   100vh}` (shared with mission.html/village.html), and a span sharing that class name inherited
   100vh, inflating its ancestor .interaction button to match -- the root cause of the "take"
   button on journey's shop step reporting an off-screen, full-viewport-height bounding box.
   Mapped to a distinct CSS class ('seashell') here only; the fruit id itself is untouched. */
const FRUIT_CSS_CLASS={berry:'berry',flower:'flower',shell:'seashell'};
const unit=(type='acorn',small=false)=>'<span class="food '+(FRUIT_CSS_CLASS[type]||'acorn')+' '+(small?'mini':'')+'" aria-hidden="true"></span>';
const friend=(name,i,happy)=>'<img class="forest-friend clay-photo" src="'+A+'characters/'+name+'_'+(happy?'happy':'waiting')+'.png" alt="">';
const dot=(filled,type)=>'<span class="match-slot '+(filled?'occupied':'empty')+'">'+(filled?unit(type,true):'')+'</span>';
const wantHint=more=>'<div class="want-hint" aria-hidden="true"><span class="want-pile small '+(!more?'target':'')+'"></span><span class="want-pile big '+(more?'target':'')+'"></span></div>';
const current=()=>templates[CONCEPTS[state.concept].key][Math.min(state.step,6)];
function setStatus(s=''){ $('status').textContent=s }
function say(k,t){$('kicker').textContent=k;$('instruction').textContent=t}
function progress(){ $('chapters').innerHTML=CONCEPTS.map((x,i)=>'<span class="chapter-dot '+(i<state.unlocked?'completed':i===state.unlocked?'active':'')+'" title="'+x.short+'">'+(i+1)+'</span>').join('') }
function scene(t){play.innerHTML=t}
function stepAction(action,body,label='',extra=''){return '<button type="button" data-mission="'+action+'" '+extra+' class="'+(action==='submit'||action==='continue'?'btn action':'interaction')+'" aria-label="'+esc(label)+'">'+body+'</button>'}
function helpButton(show=true){$('help').hidden=!show;$('change').hidden=!show}
function resetConcept(i){
 clearTimeout(state.timer);Object.assign(state,{concept:i,step:0,selected:0,taken:0,served:[],planksPlaced:[],attempts:0,hints:0,flagged:false,locked:false,view:'game',results:[],review:null});
 $('missionTitle').textContent=CONCEPTS[i].title;helpButton(true);progress();draw();
}
function showMap(){
 state.view='map';helpButton(false);$('missionTitle').textContent='숲길 모험';progress();
 say('숲속 지도','어느 숲길로 떠나볼까?');
 const allDone=state.unlocked>=CONCEPTS.length;
 const nodes=CONCEPTS.map((cpt,i)=>{
  const st=i<state.unlocked?'done':i===state.unlocked?'current':'locked';
  const badge='<span class="map-node-badge icon-'+MAP_ICONS[cpt.key]+'" aria-hidden="true"></span>';
  const label='<span class="map-node-label">'+cpt.name+'</span><span class="map-node-sub">'+cpt.short+'</span>';
  const check=st==='done'?'<span class="map-node-check" aria-hidden="true">✓</span>':'';
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
 if(key==='bridge'){return '<div class="bridge-stage"><div class="plank-dock">'+task.pieces.map(len=>'<span class="plank plank-'+len+' '+(task.material==='mossy'?'mossy':'')+'" aria-hidden="true"></span>').join('')+'</div></div><div class="visual-equation">'+task.pieces.join(' + ')+' = '+task.target+'</div>'}
 if(key==='shop'){return '<div class="order-demo">'+friend(task.customer,0)+orderCard(task)+'</div><div class="visual-equation">'+task.qty+'개를 주문했어요</div>'}
 if(key==='transform'){return '<div class="compare-pair">'+groupVisual(task.ref.count,task.ref.fruit,'cluster')+'<div class="match-instruction" aria-hidden="true">›</div>'+groupVisual(task.ref.count,task.ref.fruit,'spread')+'</div><div class="visual-equation">'+task.ref.count+'개, 모양만 바뀌었어요</div>'}
 return '<div class="make-board">'+Array.from({length:task.total},(_,i)=>dot(i<task.have,task.fruit)).join('')+'</div><div class="visual-equation">'+task.have+'개가 있어요. 빈자리만큼 더 필요해요.</div>';
}
function orderCard(x){
 if(x.repr==='numeral')return '<div class="order-card numeral" aria-hidden="true">'+x.qty+'</div>';
 return '<div class="order-card dots" aria-hidden="true">'+Array.from({length:x.qty},()=>'<span class="order-dot"></span>').join('')+'</div>';
}
function shopBoard(x){
 return '<div class="shop-counter">'+friend(x.customer,0)+orderCard(x)+'</div><div class="delivery-line">'+fruitTray(x.fruit,state.selected,x.qty+3,state.taken)+'</div>';
}
function groupVisual(count,fruit,arr){return '<div class="quantity pile transform-arr-'+arr+'">'+Array.from({length:count},()=>unit(fruit)).join('')+'</div>'}
function transformBoard(x){
 return '<div class="transform-ref-row">'+groupVisual(x.ref.count,x.ref.fruit,'cluster')+'</div><p class="supply-caption">기준</p><div class="compare-path transform-options">'+
  ['a','b'].map(k=>{
   const o=x.options[k];
   return stepAction('pick-match','<div class="path-stand">'+groupVisual(o.count,x.ref.fruit,o.arr)+'</div>',k==='a'?'왼쪽 묶음 선택':'오른쪽 묶음 선택','data-group="'+k+'"');
  }).join('')+'</div>';
}
function demo(){const x=current(),key=CONCEPTS[state.concept].key,dKey=x.mech||key;
 state.view='demo';say('모아가 먼저 보여줄게','한 번 보고, 다음에는 직접 해볼까?');
 scene('<div class="lesson"><div class="lesson-lead">'+demoVisual(x,dKey)+'</div><div class="lesson-foot"><span class="observation">보는 차례 · 기록하지 않아요</span>'+stepAction('continue',ICONS.arrowRight+srLabel('내가 해볼래'),'모아의 시범을 보고 다음으로')+'</div></div>')}
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
function bridgeBoard(x){
 const placed=x.pieces.map((len,i)=>state.planksPlaced.includes(i)
  ?stepAction('remove-plank','<span class="plank plank-'+len+' '+(x.material==='mossy'?'mossy':'')+'" aria-hidden="true"></span>','놓은 판자 다시 빼기','data-piece="'+i+'"')
  :'').join('');
 const palette=x.pieces.map((len,i)=>state.planksPlaced.includes(i)
  ?''
  :stepAction('place-plank','<span class="plank plank-'+len+' '+(x.material==='mossy'?'mossy':'')+'" aria-hidden="true"></span>','판자 하나 놓기','data-piece="'+i+'"')
 ).join('');
 return '<div class="bridge-stage"><div class="plank-dock">'+placed+'</div></div><p class="supply-caption">끊어진 다리</p><div class="plank-tray">'+palette+'</div><p class="supply-caption">나무 판자</p>';
}

function phaseText(x){if(x.kind==='guided')return '함께 연습';if(x.kind==='transfer')return '새로운 상황';if(x.kind==='probe')return '혼자 해보기';return '한 번 더 연습'}
function draw(){
 if(!state.view)return;
 const x=current(),key=CONCEPTS[state.concept].key,dKey=x.mech||key;
 if(x.kind==='demo'){demo();return}
 state.view='task';
 const lab=phaseText(x);
 let headline=dKey==='share'?'친구마다 하나씩 담아 줘':dKey==='compare'?(x.want==='more'?'더 많은 쪽으로 출발!':'더 적은 쪽으로 출발!'):dKey==='bridge'?'길이에 맞게 판자를 놓아 줘':dKey==='shop'?'주문한 만큼 담아 줘':dKey==='transform'?'기준과 똑같은 수를 찾아 줘':'빈자리를 채울 만큼 담아 줘';
 say(lab,headline);
 const board=dKey==='share'?shareBoard(x):dKey==='compare'?compareBoard(x):dKey==='bridge'?bridgeBoard(x):dKey==='shop'?shopBoard(x):dKey==='transform'?transformBoard(x):makeBoard(x);
 scene('<div class="quest"><div class="quest-head"><span class="quest-chip">'+lab+'</span>'+(dKey==='compare'?wantHint(x.want==='more'):'')+'<div class="quest-pips">'+Array.from({length:Math.min(state.step,5)},()=>'<i></i>').join('')+'</div></div><div class="quest-board">'+board+'</div>'+(dKey==='share'||dKey==='shop'?'<div class="quest-actions">'+stepAction('submit',ICONS.check+srLabel(dKey==='shop'?'주문 담아 드리기':'한 번에 주기'),dKey==='shop'?'주문한 만큼 담아 드리기':'모든 친구에게 한 번에 간식 주기')+'</div>':'')+'<div class="feedback-slot" id="feedbackSlot" aria-live="polite"></div></div>');
 if(x.kind==='guided'&&!state.flagged){const label=$('feedbackSlot');if(label)label.innerHTML='<div class="guided-preview">'+renderPairing(x,dKey)+'</div>';} else if(state.flagged){const label=$('feedbackSlot');if(label)label.textContent='다시 살펴볼 수 있어.'}
}
function renderPairing(x,key){
 if(key==='bridge'){
  const placedSum=state.planksPlaced.reduce((s,i)=>s+x.pieces[i],0);
  return '<p>지금까지 놓은 길이: '+placedSum+' · 필요한 길이: '+x.target+'</p>';
 }
 if(key==='compare'){
  return '<div class="one-to-one">'+Array.from({length:Math.max(x.a,x.b)},(_,i)=>'<div class="matching-row">'+dot(i<x.a,x.fruit)+dot(i<x.b,x.fruit)+'</div>').join('')+'</div><p>하나씩 짝지어 보면 어디가 남을까?</p>';
 }
 if(key==='transform'){
  const correctCount=x.options[x.correct].count;
  return '<div class="one-to-one">'+Array.from({length:Math.max(x.ref.count,correctCount)},(_,i)=>'<div class="matching-row">'+dot(i<x.ref.count,x.ref.fruit)+dot(i<correctCount,x.ref.fruit)+'</div>').join('')+'</div><p>하나씩 짝지어 보면 똑같을까?</p>';
 }
 const wanted=key==='share'?x.n:key==='shop'?x.qty:x.total-x.have;return '<div class="help-model"><span>필요한 자리</span><div class="match-row">'+Array.from({length:wanted},(_,i)=>dot(i<(key==='share'?state.selected+state.served.length:state.selected),x.fruit)).join('')+'</div></div><p>빈자리와 담은 간식을 하나씩 짝지어 볼까?</p>'
}
function help(){
 if(state.locked||state.view!=='task')return;
 state.flagged=true;state.hints++;save();
 const x=current(),key=CONCEPTS[state.concept].key,dKey=x.mech||key;let slot=$('feedbackSlot');
 if(!slot)return;slot.innerHTML='<div class="scaffold">'+renderPairing(x,dKey)+'</div>';
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
 const x=current(),key=CONCEPTS[state.concept].key,dKey=x.mech||key;
 if(isCorrect){state.locked=true;sfx(true);
  const clean=x.kind!=='guided'&&x.kind!=='demo'&&!state.flagged&&state.attempts===0&&state.hints===0;
  state.results.push({kind:x.kind,clean,concept:key});
  if(x.kind==='guided')setStatus('잘했어. 이제 혼자 해볼 차례야.');else if(clean)setStatus('이번에는 혼자 해결했어!');else setStatus('도움을 받고 해결했어. 다음에는 새로 해볼 수 있어.');
  const outcome=dKey==='compare'?'숲길이 반짝 열렸어!':dKey==='share'?'모두 간식을 받았어!':dKey==='bridge'?'다리가 다시 이어졌어!':dKey==='shop'?'여우가 활짝 웃었어요!':dKey==='transform'?'모양이 달라도 똑같은 수야!':'꽃밭에 꽃이 피었어!';
  const story=dKey==='share'?'<div class="success-line">'+Array.from({length:x.n},(_,i)=>'<div class="served">'+friend(x.animal,i,true)+unit(x.fruit,true)+'</div>').join('')+'</div>':dKey==='compare'?'<div class="open-gate"></div>':dKey==='bridge'?'<div class="bridge-stage solved"><div class="plank-dock">'+x.pieces.map((len,i)=>state.planksPlaced.includes(i)?'<span class="plank plank-'+len+' '+(x.material==='mossy'?'mossy':'')+'" aria-hidden="true"></span>':'').join('')+'</div></div>':dKey==='shop'?'<div class="shop-counter"><div class="served">'+friend(x.customer,0,true)+'</div></div>':dKey==='transform'?groupVisual(x.ref.count,x.ref.fruit,'cluster'):'<div class="make-board">'+Array.from({length:x.total},()=>dot(true,x.fruit)).join('')+'</div>';
  scene('<div class="success"><h2>'+outcome+'</h2>'+story+'<p>다음 장소가 기다리고 있어!</p>'+stepAction('advance',ICONS.arrowRight+srLabel('계속 탐험'),'다음 놀이로 이동')+'</div>');
  return
 }
 state.attempts++;state.flagged=true;sfx(false);
 const xtext=dKey==='share'?(state.selected+state.served.length<x.n?'아직 간식을 못 받은 친구가 있어.':'간식이 조금 남겠어.') :dKey==='make'?(state.selected<x.total-x.have?'빈자리가 남아 있어.':'간식이 자리를 넘쳤어.'):dKey==='shop'?(state.selected<x.qty?'주문한 만큼 안 담겼어.':'너무 많이 담았어.'):dKey==='transform'?'다시 세어 볼까?':'짝을 지어 보면 차이가 보여.';
 setStatus(xtext);
 const scaffoldAt=dKey==='compare'?1:2;
 const slot=$('feedbackSlot');if(slot){slot.innerHTML='<div class="feedback-error">'+xtext+'</div>'+(state.attempts>=scaffoldAt?'<div class="scaffold">'+renderPairing(x,dKey)+'</div>':'');}
 if(state.attempts>=scaffoldAt)state.hints++;
}
function assess(){const r=state.results.filter(z=>z.kind==='probe'||z.kind==='transfer');const clean=r.filter(z=>z.clean),transfer=r.find(z=>z.kind==='transfer');
 return {independent:clean.length,transfer:!!transfer?.clean,attempted:r.length,supported:state.results.length-clean.length,criteriaMet:clean.length>=2&&!!transfer?.clean}
}
function advance(){
 clearTimeout(state.timer);state.locked=false;state.selected=0;state.taken=0;state.served=[];state.planksPlaced=[];state.attempts=0;state.hints=0;state.flagged=false;
 const nextStep=state.step+1;const review=assess();
 if(nextStep===5 && review.criteriaMet){chapterEnd();return}
 if(nextStep>=templates[CONCEPTS[state.concept].key].length){chapterEnd();return}
 state.step=nextStep;draw()
}
/* The one new bridge to the village: a flat, performance-independent reward. It does not
   scale with independent/assisted ratio — scaling it would make the reward an implicit
   penalty signal, which conflicts with this whole project's no-punishment design principle.
   The amount (+3 acorns, +2 berries) is an arbitrary balance choice, not a researched value. */
const CHAPTER_REWARD={acorns:3,berries:2};
function chapterEnd(){
 const result=assess();state.review=result;
 state.reviewLog[CONCEPTS[state.concept].key]={...result,updated:Date.now()};
 if(state.concept>=state.unlocked)state.unlocked=state.concept+1;
 state.acorns+=CHAPTER_REWARD.acorns;state.berries+=CHAPTER_REWARD.berries;
 save();
 state.view='chapter-end';helpButton(false);
 const heading=result.criteriaMet?'혼자 해결한 장면이 늘었어!':'이 부분은 조금 더 연습할 수 있어';
 say(CONCEPTS[state.concept].kicker,'숲길의 작은 목표를 마쳤어');
 scene('<div class="chapter-result"><div class="bloom" aria-hidden="true"><div class="confetti">'+('<i></i>'.repeat(8))+'</div></div><h2>'+heading+'</h2><p>도움 없이 해결한 새 문제 '+result.independent+'개 · 새로운 상황 '+(result.transfer?'혼자 해결':'추가 연습 필요')+'</p><div class="quest-reward" aria-label="보상으로 받은 자원"><span class="reward-chip">'+unit('acorn')+'<b>+'+CHAPTER_REWARD.acorns+'</b></span><span class="reward-chip">'+unit('berry')+'<b>+'+CHAPTER_REWARD.berries+'</b></span></div><small>기록은 놀이 중 반응만 나타내며 수학 능력의 확정적 판정이 아니에요.</small><div class="result-actions">'+stepAction('repeat',ICONS.retry+srLabel('이 숲길 다시 놀기'),'현재 개념을 다시 연습')+stepAction('next-chapter',ICONS.mapReturn+srLabel('지도로 돌아가기'),'숲속 지도로 돌아가기')+'</div></div>');
 resourceRow();
}
function questHandle(act,el){
 if(act==='continue'){travelBeat();return}
 if(act==='arrive'){helpButton(true);state.step=1;state.view='task';draw();return}
 if(act==='travel-to'){resetConcept(Number(el.dataset.node));return}
 if(act==='next-chapter'){showMap();return}
 if(act==='repeat'){resetConcept(state.concept);return}
 if(act==='advance'){advance();return}
 if(state.view!=='task'||state.locked)return;
 const x=current(),key=CONCEPTS[state.concept].key,dKey=x.mech||key;
 if(act==='take'){const max=x.kind==='demo'?10:dKey==='share'?x.n+2:dKey==='shop'?x.qty+3:x.total-x.have+3;if(state.taken>=max){setStatus('나무에 간식이 더 없어. 바구니에서 다시 꺼낼 수 있어.');return}state.selected++;state.taken++;sfx(true);if(dKey==='make'&&state.selected===x.total-x.have){feedback(true);return}draw();return}
 if(act==='undo'){if(state.selected>0){state.selected--;state.taken--;if(dKey==='share'&&state.served.length===x.n&&state.selected===0){feedback(true);return}draw()}return}
 if(act==='serve'&&dKey==='share'){
  const i=Number(el.dataset.friend);
  if(!Number.isInteger(i)||i<0||i>=x.n||state.served.includes(i))return;
  if(state.selected<1){setStatus('바구니가 비었어. 나무에서 간식을 가져와 줘.');play.querySelector('.supply')?.classList.add('need-food');return}
  state.selected--;state.served.push(i);
  if(state.served.length===x.n&&state.selected===0){feedback(true);return}
  if(state.served.length===x.n&&state.selected>0){state.attempts++;state.flagged=true;draw();setStatus('친구들은 먹었어! 바구니에 간식이 더 남아 있네.');return}
  sfx(true);draw();return;
 }
 if(act==='submit'){
  if(dKey==='share'){const needed=x.n-state.served.length;if(state.selected===needed){state.served=Array.from({length:x.n},(_,i)=>i);state.selected=0;feedback(true)}else feedback(false);return}
  if(dKey==='shop'){feedback(state.selected===x.qty);return}
  feedback(state.selected===x.total-x.have);return;
 }
 if(act==='choose'){const correct=x.want==='more'?(x.a>x.b?'a':'b'):(x.a<x.b?'a':'b');feedback(el.dataset.side===correct);return}
 if(act==='pick-match'&&dKey==='transform'){feedback(el.dataset.group===x.correct);return}
 if(act==='place-plank'&&dKey==='bridge'){
  const i=Number(el.dataset.piece);
  if(!Number.isInteger(i)||i<0||i>=x.pieces.length||state.planksPlaced.includes(i))return;
  state.planksPlaced.push(i);sfx(true);
  const sum=state.planksPlaced.reduce((s,j)=>s+x.pieces[j],0);
  if(sum===x.target){feedback(true);return}
  draw();return;
 }
 if(act==='remove-plank'&&dKey==='bridge'){
  const i=Number(el.dataset.piece);
  const idx=state.planksPlaced.indexOf(i);
  if(idx<0)return;
  const sumBefore=state.planksPlaced.reduce((s,j)=>s+x.pieces[j],0);
  if(sumBefore>x.target){state.attempts++;state.flagged=true}
  state.planksPlaced.splice(idx,1);sfx(true);draw();return;
 }
}
play.addEventListener('click',e=>{const b=e.target.closest('[data-mission]');if(b){questHandle(b.dataset.mission,b);save()}});
$('visualHint').addEventListener('click',help);$('help').addEventListener('click',help);
$('change').addEventListener('click',()=>{if(state.view==='task'||state.view==='demo')chapterEnd()});
$('help').innerHTML=ICONS.hint+srLabel('그림 힌트');
$('change').innerHTML=ICONS.shuffle+srLabel('잠깐 다른 놀이');

/* ---------- village content (ported from village.js) ---------- */
const PALETTE=[
 {type:'flower',cost:{acorns:2,berries:0},img:A+'objects/reward_flower.png',w:46},
 {type:'basket',cost:{acorns:3,berries:0},img:A+'objects/basket_empty.png',w:50},
 {type:'cottage',cost:{acorns:5,berries:2},img:V+'objects/cottage.png',w:72},
 {type:'bridge-deco',cost:{acorns:4,berries:1},img:'./assets/forest-world-v1/objects/bridge_gap.png',w:62},
 {type:'path-sign',cost:{acorns:3,berries:1},img:A+'map/path_fork.png',w:50}
];
function resourceRow(){
 $('resourceBar').innerHTML=
  '<div class="res"><img src="'+A+'objects/acorn_single.png" alt=""><span>'+state.acorns+'</span></div>'+
  '<div class="res"><img src="'+A+'objects/berry_single.png" alt=""><span>'+state.berries+'</span></div>';
}
function floatPop(hostEl,imgSrc){
 const p=document.createElement('img');
 p.src=imgSrc;p.className='float-pop';p.setAttribute('aria-hidden','true');
 hostEl.appendChild(p);
 setTimeout(()=>p.remove(),700);
}
function renderGather(){
 const now=Date.now();
 const cool=kind=>gatherCooldownUntil[kind]>now?'disabled':'';
 $('gatherSpots').innerHTML=
  '<button type="button" class="spot" data-spot="acorns" '+cool('acorns')+' aria-label="'+esc('나무에서 도토리 모으기')+'"><img src="'+A+'objects/acorn_tree.png" alt=""></button>'+
  '<button type="button" class="spot" data-spot="berries" '+cool('berries')+' aria-label="'+esc('딸기 모으기')+'"><img src="'+A+'objects/berry_single.png" alt="" class="berry-spot-img"></button>';
}
function petStage(){return state.feedCount>=20?3:state.feedCount>=12?2:state.feedCount>=5?1:0}
function renderPet(){
 const happy=Date.now()-state.lastFed<900;
 const stage=petStage();
 const pips=Array.from({length:5},(_,i)=>'<span class="pip '+(i<Math.ceil(state.hunger/20)?'filled':'')+'">'+ICONS.paw+'</span>').join('');
 $('petScene').innerHTML=
  '<div class="pet-wrap stage-'+stage+'">'+
   (stage>=2?'<img class="pet-crown" src="'+A+'objects/reward_flower.png" alt="">':'')+
   (stage>=3?'<img class="pet-side-flower" src="'+A+'objects/reward_flower.png" alt="">':'')+
   '<img class="pet-photo" src="'+A+'characters/bear_'+(happy?'happy':'waiting')+'.png" alt="">'+
  '</div>'+
  '<div class="hunger-row" aria-label="배고픔 정도">'+pips+'</div>'+
  '<div class="feed-tray">'+
   '<button type="button" class="feed-btn" data-feed="acorns" '+(state.acorns<=0?'disabled':'')+' aria-label="도토리로 먹이주기"><img src="'+A+'objects/acorn_single.png" alt=""></button>'+
   '<button type="button" class="feed-btn" data-feed="berries" '+(state.berries<=0?'disabled':'')+' aria-label="딸기로 먹이주기"><img src="'+A+'objects/berry_single.png" alt=""></button>'+
  '</div>';
}
function renderBuild(){
 $('buildPlot').innerHTML = state.buildings.map(b=>{
  const def=PALETTE.find(p=>p.type===b.type);
  return '<img class="placed pop" src="'+def.img+'" style="width:'+def.w+'px" alt="">';
 }).join('') || '<p class="plot-empty-hint" aria-hidden="true"></p>';
 $('buildPalette').innerHTML = PALETTE.map(p=>{
  const can=state.acorns>=p.cost.acorns && state.berries>=p.cost.berries;
  const costBits=[
   p.cost.acorns?'<span class="cost-chip"><img src="'+A+'objects/acorn_single.png" alt="">'+p.cost.acorns+'</span>':'',
   p.cost.berries?'<span class="cost-chip"><img src="'+A+'objects/berry_single.png" alt="">'+p.cost.berries+'</span>':''
  ].join('');
  return '<button type="button" class="palette-item '+(can?'':'cant')+'" data-build="'+p.type+'" aria-label="'+esc(p.type+' 짓기')+'"><img src="'+p.img+'" alt="" style="width:'+Math.min(p.w,44)+'px"><span class="cost-row">'+costBits+'</span></button>';
 }).join('');
}
function renderVillageAll(){ resourceRow(); renderGather(); renderPet(); renderBuild(); }

function showTab(tab){
 state.tab=tab;save();
 ['quest','gather','pet','build'].forEach(t=>{ $('panel'+t[0].toUpperCase()+t.slice(1)).hidden = t!==tab; });
 Array.from($('tabbar').children).forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.tab===tab)));
 renderVillageAll();
}
function buildTabbar(){
 $('tabbar').innerHTML=[
  ['gather',ICONS.tree,'모으기'],
  ['quest',ICONS.mapReturn,'숲길 모험'],
  ['pet',ICONS.heart,'반려동물'],
  ['build',ICONS.house,'짓기']
 ].map(([t,icon,label])=>'<button type="button" class="tab-btn" data-tab="'+t+'" aria-pressed="false" aria-label="'+label+'">'+icon+srLabel(label)+'</button>').join('');
 $('tabbar').addEventListener('click',e=>{
  const b=e.target.closest('[data-tab]');if(!b)return;
  showTab(b.dataset.tab);
 });
}

$('world').addEventListener('click',e=>{
 const spot=e.target.closest('[data-spot]');
 if(spot && !spot.disabled){
  const kind=spot.dataset.spot;
  if(gatherCooldownUntil[kind]>Date.now())return;
  state[kind]++;save();sfx(true);
  gatherCooldownUntil[kind]=Date.now()+GATHER_COOLDOWN_MS;
  spot.classList.remove('bounce');void spot.offsetWidth;spot.classList.add('bounce');
  floatPop(spot,kind==='acorns'?A+'objects/acorn_single.png':A+'objects/berry_single.png');
  resourceRow();renderBuild();renderPet();
  spot.disabled=true;
  setTimeout(()=>{if(state.tab==='gather')renderGather();},GATHER_COOLDOWN_MS);
  return;
 }
 const feedBtn=e.target.closest('[data-feed]');
 if(feedBtn && !feedBtn.disabled){
  const kind=feedBtn.dataset.feed;
  if(state[kind]<=0)return;
  state[kind]--;state.hunger=Math.min(100,state.hunger+20);state.feedCount++;state.lastFed=Date.now();save();sfx(true);
  resourceRow();renderPet();renderBuild();
  setTimeout(renderPet,850);
  return;
 }
 const buildBtn=e.target.closest('[data-build]');
 if(buildBtn){
  const type=buildBtn.dataset.build;
  const def=PALETTE.find(p=>p.type===type);
  const can=state.acorns>=def.cost.acorns && state.berries>=def.cost.berries;
  if(!can){
   buildBtn.classList.remove('shake');void buildBtn.offsetWidth;buildBtn.classList.add('shake');
   sfx(false);
   return;
  }
  state.acorns-=def.cost.acorns;state.berries-=def.cost.berries;
  state.buildings.push({type});save();sfx(true);
  resourceRow();renderBuild();
  return;
 }
});

$('sound').addEventListener('click',()=>{
 state.sound=!state.sound;save();
 $('sound').setAttribute('aria-pressed',String(state.sound));
 $('sound').setAttribute('aria-label',state.sound?'효과음 끄기':'효과음 켜기');
 $('sound').innerHTML=(state.sound?ICONS.speakerOn:ICONS.speakerOff)+srLabel(state.sound?'소리 켜짐':'소리 꺼짐');
});

/* ---------- init ---------- */
$('sound').innerHTML=(state.sound?ICONS.speakerOn:ICONS.speakerOff)+srLabel(state.sound?'소리 켜짐':'소리 꺼짐');
buildTabbar();
progress();
/* Resume mid-quest state (see QUEST_PERSIST_FIELDS) instead of always restarting at the map --
   demo/travel/task are each pure functions of the restored state, safe to re-render directly. */
if(state.view==='task'&&state.step>0){helpButton(true);draw()}
else if(state.view==='demo'){helpButton(true);demo()}
else if(state.view==='travel'){helpButton(false);travelBeat()}
else{showMap()}
resourceRow();
showTab(state.tab||'gather');

Object.defineProperty(window,'__moaForestWorldQA',{value:()=>({
 acorns:state.acorns,berries:state.berries,feedCount:state.feedCount,hunger:state.hunger,petStage:petStage(),buildings:state.buildings.map(b=>b.type),tab:state.tab,
 unlocked:state.unlocked,concept:CONCEPTS[state.concept].key,conceptIndex:state.concept,step:state.step,selected:state.selected,taken:state.taken,served:[...state.served],phase:state.view,attempts:state.attempts,hints:state.hints,flagged:state.flagged,task:{...current()},results:state.results.map(x=>({...x})),review:state.review?{...state.review}:null
}),configurable:false});
})();

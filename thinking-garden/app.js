const $=(s)=>document.querySelector(s), $$=(s)=>[...document.querySelectorAll(s)];
const screens={home:$('#homeScreen'),intro:$('#introScreen'),game:$('#gameScreen'),result:$('#resultScreen')};
const area=$('#gameArea'),toast=$('#gameToast'),world=$('#gameWorld');
const missionText=$('#missionText'),missionSub=$('#missionSub'),guide=$('#guideCharacter');
const STORE={seeds:'moa-garden:seeds',done:'moa-garden:completed',sound:'moa-garden:sound'};
let state={game:null,previewGame:null,round:0,roundTotal:5,practiceLevel:'easy',practiceCount:10,practiceRounds:[],score:0,total:Number(localStorage.getItem(STORE.seeds)||0),sound:localStorage.getItem(STORE.sound)!=='off',lock:false,lastSpeech:'',timers:[]};
let completed=readCompleted();
const meta={
 rescue:{title:'모아 구조대!',kicker:'홍의 구조숲',theme:'find',friend:'assets/friend-hong.png'},
 memory:{title:'기억꽃길 이어가기',kicker:'루의 기억길',theme:'memory',friend:'assets/friend-ru.png'},
 spacing:{title:'띄어쓰기 다리 놓기',kicker:'샘의 띄어쓰기길',theme:'spacing',friend:'assets/friend-saem.png'},
 spelling:{title:'고장 난 간판 고치기',kicker:'티의 글자수리소',theme:'spelling',friend:'assets/friend-ti.png'},
 sameShape:{title:'쌍둥이 모양 찾기',kicker:'홍의 기초찾기뜰',theme:'find',friend:'assets/friend-hong.png'},
 flower:{title:'꽃만 쏙쏙 찾기',kicker:'홍의 꽃밭탐험',theme:'find',friend:'assets/friend-hong.png'},
 hide:{title:'잎사귀 숨은친구',kicker:'홍의 숨바꼭질숲',theme:'find',friend:'assets/friend-hong.png'},
 path:{title:'반짝이 길 따라가기',kicker:'루의 순서길',theme:'memory',friend:'assets/friend-ru.png'},
 calm:{title:'초록불에 톡!',kicker:'루의 멈춤정원',theme:'memory',friend:'assets/friend-ru.png'},
 inside:{title:'정원 안에 별 심기',kicker:'샘의 별밭',theme:'spacing',friend:'assets/friend-saem.png'},
 targets:{title:'하나씩 깨우기',kicker:'샘의 톡톡정원',theme:'spacing',friend:'assets/friend-saem.png'},
 paint:{title:'정원길 쓱싹 칠하기',kicker:'샘의 색칠길',theme:'spacing',friend:'assets/friend-saem.png'},
 water:{title:'시든 꽃 깨우기',kicker:'홍의 물방울정원',theme:'find',friend:'assets/friend-hong.png'}
};

// 연습형 게임에만 적용됩니다. 다른 게임은 기존 5스테이지 구조를 유지합니다.
const LITERACY_GAMES=new Set(['spacing','spelling']);
const LEVEL_NAMES={easy:'쉬움',normal:'보통',hard:'어려움'};
const DEFAULT_COUNTS={easy:10,normal:20,hard:30};
function practiceKey(game,q){return game==='spacing'?q.join(' '):q.before+'|'+q.right+'|'+q.after}
function choosePracticeRounds(game,level,count){
 const bank=game==='spacing'?literacySpacingBank[level]:literacySpellingBank[level];
 if(!Array.isArray(bank)||bank.length<count)throw new Error('연습 문제은행이 부족합니다.');
 const storageKey='moa-garden:practiced:'+game+':'+level;
 let used=[];try{const v=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(v))used=v}catch{}
 const usedSet=new Set(used);
 const candidates=shuffle(bank);
 const ordered=[...candidates.filter(q=>!usedSet.has(practiceKey(game,q))),...candidates.filter(q=>usedSet.has(practiceKey(game,q)))];
 const result=ordered.slice(0,count);
 const newUsed=new Set([...used.filter(k=>bank.some(q=>practiceKey(game,q)===k)),...result.map(q=>practiceKey(game,q))]);
 try{localStorage.setItem(storageKey,JSON.stringify(newUsed.size===bank.length?result.map(q=>practiceKey(game,q)): [...newUsed]))}catch{}
 return result;
}
const literacyLevelPreviews={
 spacing:{
  easy:'<div class="pv-instruction">띄어야 할 곳을 찾아요</div><div class="pv-glued">학교에가요</div><div class="pv-space-arrow">톡! ↓</div><div class="pv-spaced"><span>학교에</span><span>가요</span></div>',
  normal:'<div class="pv-instruction">말 덩어리가 세 개예요</div><div class="pv-glued">나는학교에서공부해요</div><div class="pv-space-arrow">톡! ↓</div><div class="pv-spaced"><span>나는</span><span>학교에서</span><span>공부해요</span></div>',
  hard:'<div class="pv-instruction">문장이 길어져도 천천히 찾아요</div><div class="pv-glued">비가많이와서우산을썼어요</div><div class="pv-space-arrow">톡! ↓</div><div class="pv-spaced"><span>비가</span><span>많이</span><span>와서</span><span>우산을</span><span>썼어요</span></div>'
 },
 spelling:{
  easy:'<div class="pv-instruction">비슷한 글자를 구별해요</div><div class="pv-sign">숙제를 다 <b>?</b></div><div class="pv-options"><span class="preview-pulse">했어요</span><span>햇어요</span></div>',
  normal:'<div class="pv-instruction">헷갈리는 표현을 비교해요</div><div class="pv-sign">이제 가도 <b>?</b></div><div class="pv-options"><span class="preview-pulse">돼요</span><span>되요</span></div>',
  hard:'<div class="pv-instruction">문장 뜻을 생각하고 골라요</div><div class="pv-sign">오늘은 <b>?</b> 기분이 좋아요</div><div class="pv-options"><span class="preview-pulse">왠지</span><span>웬지</span></div>'
 }
};
function updatePracticeControls(){
 $$('#literacyPracticeControls [data-level]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.level===state.practiceLevel)));
 $$('#literacyPracticeControls [data-count]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.count)===state.practiceCount)));
 $('#practiceNotice').textContent=`${LEVEL_NAMES[state.practiceLevel]} · ${state.practiceCount}문제 · 같은 회기 안에서 중복 없이 연습해요.`;
 $('#previewRoundInfo').textContent=`선택한 ${state.practiceCount}문제를 풀어요.`;
 if(LITERACY_GAMES.has(state.previewGame))$('#introPreview').innerHTML=literacyLevelPreviews[state.previewGame][state.practiceLevel];
}

const previewExamples={
 rescue:`<div class="pv-rescue-radio">📡 무전 도착! <b>노란 큰 오리</b></div><div class="pv-rescue-field"><span>🌳</span><span class="duck">🦆</span><span>🌿</span><span>🐷</span><span class="van">🚐</span></div>`,
 memory:`<div class="pv-instruction">순서를 기억해요</div><div class="pv-sequence"><i class="blue"></i><b>→</b><i class="yellow"></i><b>→</b><i class="green"></i></div><div class="pv-hint">충분히 본 뒤 ‘준비됐어요’를 누르면 가려져요</div>`,
 spacing:`<div class="pv-instruction">붙어 있는 문장에서 띄울 곳을 찾아요</div><div class="pv-glued">오늘은학교에가요</div><div class="pv-space-arrow">톡! ↓</div><div class="pv-spaced"><span>오늘은</span><span>학교에</span><span>가요</span></div>`,
 spelling:`<div class="pv-instruction">고장 난 글자를 고쳐요</div><div class="pv-sign">숙제를 다 <b>?</b></div><div class="pv-options"><span class="preview-pulse">했어요</span><span>햇어요</span></div>`,
 sameShape:`<div class="pv-instruction">색이 달라도 같은 모양은?</div><div class="pv-target" style="color:#ffd45b">★</div><div class="pv-options shapes"><span style="color:#ffd45b">●</span><span class="preview-pulse" style="color:#6bb7ff">★</span><span style="color:#69c77d">▲</span><span style="color:#9b83e8">■</span></div>`,
 flower:`<div class="pv-instruction">꽃만 골라요</div><div class="pv-options emoji"><span class="preview-pulse">🌷</span><span>🍃</span><span class="preview-pulse">🌼</span><span>🪨</span><span>🍄</span></div>`,
 hide:`<div class="pv-instruction">잎사귀를 열어 숨어 있는 친구를 찾아요</div><div class="pv-options emoji"><span>🍃</span><span class="preview-pulse">🍃<small>🐞</small></span><span>🍃</span><span>🍃</span></div>`,
 path:`<div class="pv-instruction">반짝이는 곳부터 차례대로</div><div class="pv-path"><span class="ready">🌱</span><b>→</b><span>🌼</span><b>→</b><span>🍃</span><b>→</b><span>🌸</span></div>`,
 calm:`<div class="pv-instruction">빨간불엔 기다리고 초록불에 톡!</div><div class="pv-lights"><span>🔴<small>기다려요</small></span><b>→</b><span class="preview-pulse">🟢<small>지금!</small></span></div>`,
 inside:`<div class="pv-instruction">울타리 안에만 별을 심어요</div><div class="pv-field"><div class="pv-fence"><span>⭐</span><span class="preview-pulse">⭐</span></div><i>×</i></div>`,
 targets:`<div class="pv-instruction">하나씩 빠뜨리지 않고 눌러요</div><div class="pv-dots"><span>🌼</span><span class="preview-pulse">○</span><span>○</span><span>🌼</span><span>○</span></div>`,
 paint:`<div class="pv-instruction">정해진 길 안을 쓱싹 채워요</div><div class="pv-paint">${'<i></i>'.repeat(18)}</div>`,
 water:`<div class="pv-instruction">시든 꽃에만 물을 줘요</div><div class="pv-options emoji"><span>🌻<small>✓</small></span><span class="preview-pulse">🥀<small>💧</small></span><span>🌷<small>✓</small></span><span class="preview-pulse">🥀<small>💧</small></span></div>`
};
function openPreview(id){
  const m=meta[id],card=document.querySelector(`[data-open="${id}"]`); if(!m||!card)return;
  state.previewGame=id;
  $('#introKicker').textContent=m.kicker;
  $('#introTitle').textContent=m.title;
  $('#introDesc').textContent=card.querySelector('p')?.textContent||'게임 방법을 보고 시작해요.';
  $('#introFriend').src=m.friend;
  $('#introTags').innerHTML=[...card.querySelectorAll('.skill-tags i')].map(x=>`<span>${x.textContent}</span>`).join('');
  $('#introPreview').innerHTML=previewExamples[id]||'<div class="pv-instruction">게임 예시를 보고 시작해요.</div>';
  const isPractice=LITERACY_GAMES.has(id);
  $('#literacyPracticeControls').hidden=!isPractice;
  $('#previewRoundInfo').textContent='실제 게임은 5스테이지로 진행돼요.';
  if(isPractice)updatePracticeControls();
  show('intro');
}

function readCompleted(){try{return JSON.parse(localStorage.getItem(STORE.done)||'{}')}catch{return{}}}
function clearTimers(){state.timers.forEach(clearTimeout);state.timers=[]}
function later(fn,ms){const t=setTimeout(fn,ms);state.timers.push(t);return t}
function show(name){Object.values(screens).forEach(x=>x.classList.remove('active'));screens[name].classList.add('active');document.body.classList.toggle('playing',name==='game');document.body.classList.toggle('game-result',name==='result');scrollTo({top:0,behavior:'smooth'})}
function updateHome(){ $('#seedBank').textContent=`🌱 ${state.total}`;const count=Object.keys(meta).filter(id=>completed[id]).length+(completed.recorder?1:0);$('#gardenProgress').textContent=`완료한 게임 ${count} / ${document.querySelectorAll('.library-card').length}`;

$$('[data-open]').forEach(b=>b.classList.toggle('completed',!!completed[b.dataset.open])) }
const basicShapes=[['●','#ff7b76'],['■','#6bb7ff'],['▲','#69c77d'],['★','#ffd45b'],['◆','#9b83e8'],['♥','#ff8db2']];
function renderSameShape(){const n=Math.min(3+state.round,6),idx=Math.floor(Math.random()*basicShapes.length),target=basicShapes[idx],targetShape=target[0],targetColor=target[1],correctColor=basicShapes[(idx+2)%basicShapes.length][1];missionText.textContent='색이 달라도 같은 모양을 찾아요!';missionSub.textContent='색이 같아도 모양이 다르면 다른 친구예요. 모양만 비교해요.';say(missionText.textContent);const others=shuffle(basicShapes.filter(x=>x[0]!==targetShape));let opts=[{shape:targetShape,color:correctColor},{shape:others[0][0],color:targetColor},...others.slice(1,n-1).map(x=>({shape:x[0],color:x[1]}))];opts=shuffle(opts.slice(0,n));area.innerHTML=`<div class="basic-game"><div class="shape-target" style="color:${targetColor}">${targetShape}</div><div class="basic-choice-grid">${opts.map(x=>`<button class="basic-choice" data-shape="${x.shape}" style="color:${x.color}">${x.shape}</button>`).join('')}</div></div>`;$$('.basic-choice').forEach(b=>b.onclick=()=>{if(state.lock)return;if(b.dataset.shape===targetShape){b.classList.add('correct');addSeeds(10);sfx('ok');flash('모양이 같은 쌍둥이 찾았다! ✨');roundGate(area.querySelector('.basic-game'),'다음 모양 ▶',450)}else{b.classList.add('wrong');sfx('no');flash('색 말고 모양을 다시 비교해봐요.');later(()=>b.classList.remove('wrong'),400)}})}
function renderFlower(){const need=3+Math.min(state.round,2),flowers=['🌷','🌼','🌸','🌻','🌺'],distractors=['🍃','🪨','🍄','🌱'];const good=Array.from({length:need},(_,i)=>flowers[(i+state.round)%flowers.length]);const bad=Array.from({length:3+state.round},(_,i)=>distractors[i%distractors.length]);const pool=shuffle([...good.map(x=>({x,good:true})),...bad.map(x=>({x,good:false}))]);let found=0;missionText.textContent=`꽃 ${need}송이만 찾아요!`;missionSub.textContent='모양이 달라도 꽃이면 맞아요. 잎·돌·버섯은 지나가요.';say(missionText.textContent);area.innerHTML=`<div class="basic-game"><div class="mini-count" id="miniCount">🌼 0 / ${need}</div><div class="object-grid">${pool.map(o=>`<button class="object-btn" data-good="${o.good?1:0}">${o.x}</button>`).join('')}</div></div>`;$$('.object-btn').forEach(b=>b.onclick=()=>{if(state.lock||b.classList.contains('picked'))return;if(b.dataset.good==='1'){b.classList.add('picked');found++;$('#miniCount').textContent=`🌼 ${found} / ${need}`;addSeeds(Math.ceil(10/need));sfx('ok');if(found===need){flash('꽃바구니 완성!');roundGate(area.querySelector('.basic-game'),'다음 꽃밭 ▶',500)}}else{b.classList.add('wrong');sfx('no');flash('꽃 종류만 골라봐요.');later(()=>b.classList.remove('wrong'),350)}})}
function renderHide(){const total=6+state.round,need=2+Math.floor(state.round/2),spots=shuffle([...Array(total).keys()]).slice(0,need),bugs=new Set(spots);let found=0;missionText.textContent=`잎사귀 아래 친구 ${need}마리를 찾아요!`;missionSub.textContent='하나씩 열어보고 숨어 있는 친구를 찾아요.';say(missionText.textContent);area.innerHTML=`<div class="basic-game"><div class="mini-count" id="miniCount">🐞 0 / ${need}</div><div class="leaf-game">${[...Array(total).keys()].map(i=>`<button class="leaf-btn" data-i="${i}">🍃</button>`).join('')}</div></div>`;$$('.leaf-btn').forEach(b=>b.onclick=()=>{if(b.classList.contains('opened')||state.lock)return;b.classList.add('opened');const ok=bugs.has(+b.dataset.i);b.textContent=ok?'🐞':'🌱';sfx(ok?'ok':'tap');if(ok){found++;$('#miniCount').textContent=`🐞 ${found} / ${need}`;addSeeds(Math.ceil(10/need));if(found===need){flash('숨은 친구 다 찾았다!');roundGate(area.querySelector('.basic-game'),'다음 숨바꼭질 ▶',500)}}})}
function renderPath(){const len=4+Math.min(state.round,3),icons=['🌱','🌼','🍃','🌸','🌿','🌻','🌷'],seq=icons.slice(0,len);let pos=0;missionText.textContent='반짝이는 길을 차례로 따라가요!';missionSub.textContent='지금 반짝이는 곳을 찾아 한 칸씩 이동해요.';say(missionText.textContent);area.innerHTML=`<div class="basic-game"><div class="trail-game">${seq.map((x,i)=>`<button class="trail-node ${i===0?'ready':''}" data-i="${i}">${x}</button>`).join('')}<div class="trail-runner" id="trailRunner">🦋</div></div></div>`;$$('.trail-node').forEach(b=>b.onclick=()=>{if(state.lock)return;const i=+b.dataset.i;if(i!==pos){b.classList.add('wrong');sfx('no');flash('반짝이는 곳부터!');later(()=>b.classList.remove('wrong'),350);return}b.classList.remove('ready');b.classList.add('visited');pos++;addSeeds(Math.ceil(10/len));sfx('ok');if(pos<len)$$('.trail-node')[pos].classList.add('ready');else{flash('길 완성! 🦋');roundGate(area.querySelector('.basic-game'),'다음 길 ▶',500)}})}
function renderCalm(){let ready=false;const useYellow=state.round>=2;missionText.textContent=useYellow?'빨강·노랑은 기다리고 초록에 톡!':'초록불에만 눌러 건너요!';missionSub.textContent=useYellow?'빨간불과 노란불에는 기다리고, 초록불에만 눌러요.':'차가 지나갈 때는 기다리고 초록 신호가 켜졌을 때만 눌러요.';say(missionText.textContent);area.innerHTML='<div class="basic-game calm-game road-game"><div class="traffic-scene"><div class="traffic-light"><i class="red on"></i><i class="yellow"></i><i class="green"></i></div><div class="road"><span class="road-car">🚗</span><div class="zebra"><i></i><i></i><i></i><i></i><i></i></div><img class="road-moa" src="assets/moa-default.png" alt=""><span class="road-goal">🌳</span></div><button id="signalBtn" class="signal-btn wait"><span>🔴</span><b>기다려요</b></button><p id="signalMsg">차가 지나가요. 손을 쉬고 기다려요.</p></div></div>';const b=$('#signalBtn'),scene=area.querySelector('.traffic-scene'),light=scene.querySelector('.traffic-light'),car=scene.querySelector('.road-car');const goGreen=()=>{ready=true;light.querySelector('.red').classList.remove('on');light.querySelector('.yellow').classList.remove('on');light.querySelector('.green').classList.add('on');b.className='signal-btn go';b.innerHTML='<span>🟢</span><b>지금 건너요!</b>';$('#signalMsg').textContent='초록불! 지금 톡!';sfx('ok')};const arm=()=>{ready=false;scene.classList.remove('cross-success');light.querySelector('.red').classList.add('on');light.querySelector('.yellow').classList.remove('on');light.querySelector('.green').classList.remove('on');b.className='signal-btn wait';b.innerHTML='<span>🔴</span><b>기다려요</b>';$('#signalMsg').textContent='차가 지나가요. 손을 쉬고 기다려요.';car.classList.remove('drive');void car.offsetWidth;car.classList.add('drive');later(()=>{if(useYellow){light.querySelector('.red').classList.remove('on');light.querySelector('.yellow').classList.add('on');b.className='signal-btn caution';b.innerHTML='<span>🟡</span><b>조금 더 기다려요</b>';$('#signalMsg').textContent='노란불도 아직 기다려요.';later(goGreen,650+Math.random()*500)}else goGreen()},1100+Math.random()*1200)};b.onclick=()=>{if(state.lock)return;if(!ready){sfx('no');scene.classList.add('too-soon');flash(light.querySelector('.yellow').classList.contains('on')?'노란불도 기다려요! 초록불까지 기다려요.':'아직 빨간불이에요! 차가 지나간 뒤 기다려요.');later(()=>scene.classList.remove('too-soon'),450);clearTimers();arm()}else{scene.classList.add('cross-success');addSeeds(10);sfx('ok');flash('안전하게 건넜어요! 🚦');roundGate(scene,'다음 길 건너기 ▶',950)}};arm()}

function renderInside(){const need=3+state.round;let placed=0;missionText.textContent=`울타리 안에 별 ${need}개를 심어요!`;missionSub.textContent='넓은 들판 중 연두색 울타리 안에만 별을 심어요.';say(missionText.textContent);area.innerHTML=`<div class="basic-game"><div class="mini-count" id="miniCount">⭐ 0 / ${need}</div><div class="inside-stage-new" id="insideStage"><div class="inside-zone" id="insideZone"><span>울타리 안</span></div></div></div>`;const stage=$('#insideStage'),z=$('#insideZone');stage.onclick=e=>{if(state.lock||placed>=need)return;if(!e.target.closest('#insideZone')){sfx('no');flash('울타리 안에 심어봐요.');const p=document.createElement('b');p.className='outside-ripple';p.style.left=`${e.offsetX}px`;p.style.top=`${e.offsetY}px`;stage.appendChild(p);later(()=>p.remove(),420);return}const r=z.getBoundingClientRect(),star=document.createElement('i');star.textContent='⭐';star.style.left=`${e.clientX-r.left}px`;star.style.top=`${e.clientY-r.top}px`;z.appendChild(star);placed++;$('#miniCount').textContent=`⭐ ${placed} / ${need}`;addSeeds(Math.ceil(10/need));sfx('ok');if(placed===need){flash('별밭 완성!');roundGate(area.querySelector('.basic-game'),'다음 별밭 ▶',500)}}}
function renderTargets(){const total=4+state.round*2;let done=0;missionText.textContent='동그라미를 하나씩 모두 깨워요!';missionSub.textContent='같은 곳을 두 번 누르지 않고 빠뜨리지 않게 찾아요.';say(missionText.textContent);area.innerHTML=`<div class="basic-game"><div class="mini-count" id="miniCount">✨ 0 / ${total}</div><div class="target-grid-new">${Array.from({length:total},()=>'<button class="wake-target">○</button>').join('')}</div></div>`;$$('.wake-target').forEach(b=>b.onclick=()=>{if(state.lock||b.classList.contains('awake'))return;b.classList.add('awake');b.textContent='🌼';done++;$('#miniCount').textContent=`✨ ${done} / ${total}`;addSeeds(Math.ceil(10/total));sfx('ok');if(done===total){flash('모두 깨어났어!');roundGate(area.querySelector('.basic-game'),'다음 깨우기 ▶',500)}})}
function renderPaint(){const total=12+state.round*3;let done=0,drawing=false;missionText.textContent='정원길을 쓱싹 채워요!';missionSub.textContent='누른 채 움직이거나 칸을 톡톡 눌러 안쪽을 채워요.';say(missionText.textContent);area.innerHTML=`<div class="basic-game"><div class="mini-count" id="miniCount">🖍️ 0%</div><div class="paint-grid-new" id="paintGrid">${Array.from({length:total},()=>'<i></i>').join('')}</div></div>`;const fill=cell=>{if(state.lock||cell.classList.contains('painted'))return;cell.classList.add('painted');done++;$('#miniCount').textContent=`🖍️ ${Math.round(done/total*100)}%`;if(done===total){addSeeds(10);sfx('ok');flash('정원길 완성!');roundGate(area.querySelector('.basic-game'),'다음 색칠길 ▶',500)}};const g=$('#paintGrid');g.onpointerdown=e=>{drawing=true;if(e.target.tagName==='I')fill(e.target)};g.onpointerover=e=>{if(drawing&&e.target.tagName==='I')fill(e.target)};g.onclick=e=>{if(e.target.tagName==='I')fill(e.target)};g.onpointerup=()=>drawing=false;g.onpointerleave=()=>drawing=false}
function renderWater(){const total=3+state.round;let done=0;const flowers=['🌷','🌼','🌸','🌻','🌺','🌹','🪻'];const items=shuffle([...Array.from({length:total},(_,i)=>({wilt:true,flower:flowers[i%flowers.length]})),...Array.from({length:2+Math.floor(state.round/2)},(_,i)=>({wilt:false,flower:flowers[(i+3)%flowers.length]}))]);missionText.textContent=`시든 꽃 ${total}송이만 깨워요!`;missionSub.textContent='이미 활짝 핀 꽃은 그대로 두고, 시든 꽃에만 물을 주세요.';say(missionText.textContent);area.innerHTML=`<div class="basic-game"><div class="mini-count" id="miniCount">💧 0 / ${total}</div><div class="water-grid-new">${items.map(o=>`<button class="wilt ${o.wilt?'needs-water':'healthy'}" data-good="${o.wilt?1:0}" data-flower="${o.flower}">${o.wilt?'🥀':o.flower}<small>${o.wilt?'💧':'✓'}</small></button>`).join('')}</div></div>`;$$('.wilt').forEach(b=>b.onclick=()=>{if(state.lock||b.classList.contains('bloom'))return;if(b.dataset.good!=='1'){b.classList.add('wrong');sfx('no');flash('이 꽃은 이미 싱싱해요. 시든 꽃을 찾아요.');later(()=>b.classList.remove('wrong'),380);return}b.classList.add('bloom');b.firstChild.textContent=b.dataset.flower;done++;$('#miniCount').textContent=`💧 ${done} / ${total}`;addSeeds(Math.ceil(10/total));sfx('ok');if(done===total){flash('시든 꽃을 모두 깨웠어!');roundGate(area.querySelector('.basic-game'),'다음 물주기 ▶',500)}})}

function goHome(){clearTimers();speechSynthesis?.cancel?.();state.game=null;updateHome();show('home')}
function addSeeds(n){state.score+=n;state.total+=n;localStorage.setItem(STORE.seeds,state.total);$('#seedBank').textContent=`🌱 ${state.total}`;$('#scoreLabel').textContent=`🌱 ${state.score}`}
function say(text){state.lastSpeech=text;if(!state.sound||!('speechSynthesis'in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ko-KR';u.rate=.88;speechSynthesis.speak(u)}
function sfx(kind='ok'){if(!state.sound)return;try{const C=window.AudioContext||window.webkitAudioContext,c=new C(),o=c.createOscillator(),g=c.createGain();o.type=kind==='ok'?'triangle':'sine';const a=kind==='ok'?640:230,b=kind==='ok'?960:160;o.frequency.setValueAtTime(a,c.currentTime);o.frequency.exponentialRampToValueAtTime(b,c.currentTime+.16);g.gain.setValueAtTime(.07,c.currentTime);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.19);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+.2)}catch{}}
function flash(text){toast.textContent=text;toast.classList.add('show');clearTimeout(flash.t);flash.t=setTimeout(()=>toast.classList.remove('show'),1150)}
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function updateProgress(){const total=state.roundTotal;$('#stageLabel').textContent=`${Math.min(state.round+1,total)} / ${total}`;$('#progressBar').style.width=`${state.round/total*100}%`;const badge=$('#missionBadge');if(badge)badge.textContent=`미션 ${Math.min(state.round+1,total)}` }
function startGame(id){clearTimers();state.game=id;state.round=0;state.score=0;state.lock=false;state.roundTotal=LITERACY_GAMES.has(id)?state.practiceCount:5;state.practiceRounds=LITERACY_GAMES.has(id)?choosePracticeRounds(id,state.practiceLevel,state.roundTotal):[];const m=meta[id];$('#gameTitle').textContent=m.title;$('#gameKicker').textContent=m.kicker;$('#scoreLabel').textContent='🌱 0';guide.src=m.friend;world.className=`game-world theme-${m.theme}`;show('game');updateProgress();renderRound()}
function renderRound(){clearTimers();state.lock=false;area.innerHTML='';({rescue:renderFind,memory:renderMemory,spacing:renderSpacing,spelling:renderSpelling,sameShape:renderSameShape,flower:renderFlower,hide:renderHide,path:renderPath,calm:renderCalm,inside:renderInside,targets:renderTargets,paint:renderPaint,water:renderWater}[state.game])()}
function nextRound(delay=700){state.lock=true;later(()=>{state.round++;if(state.round>=state.roundTotal)return finishGame();updateProgress();renderRound()},delay)}
function finishGame(){completed[state.game]=true;localStorage.setItem(STORE.done,JSON.stringify(completed));$('#progressBar').style.width='100%';const m=meta[state.game];$('#resultCharacter').src=m.friend;$('#resultTitle').textContent=state.score>=state.roundTotal*9?'정원이 활짝 깨어났어!':state.score>=state.roundTotal*6?'정원 한 칸 완성!':'끝까지 길을 만들었어!';$('#resultMessage').textContent=LITERACY_GAMES.has(state.game)?`${LEVEL_NAMES[state.practiceLevel]} · ${state.roundTotal}문제를 끝까지 풀었어요!`:`${m.kicker}의 5개 미션을 모두 지나왔어요.`;$('#resultScore').textContent=`🌱 ${state.score}`;later(()=>show('result'),500)}
function rewardAt(el){const r=el.getBoundingClientRect(),w=world.getBoundingClientRect(),p=document.createElement('span');p.className='leaf-pop';p.textContent='🌱';p.style.left=`${r.left-w.left+r.width/2}px`;p.style.top=`${r.top-w.top+r.height/2}px`;world.appendChild(p);later(()=>p.remove(),800)}
function roundGate(parent,label='다음 미션 ▶',delay=500,speech=''){
 state.lock=true;
 if(speech)say(speech);
 later(()=>{const gate=document.createElement('div');gate.className='round-gate';gate.innerHTML='<span class="gate-spark">✨</span><strong>미션 성공!</strong>';const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{b.disabled=true;nextRound(0)};gate.appendChild(b);parent.appendChild(gate)},delay)
}

const animals=[['토끼','🐰'],['돼지','🐷'],['소','🐮'],['오리','🦆']];
const colors={노란:['#ffd45b','노란'],파란:['#6bb7ff','파란'],초록:['#69c77d','초록'],빨간:['#ff7b76','빨간']};
const findRounds=[
 {kind:'single',color:'노란',size:'큰',animal:'오리'},
 {kind:'single',color:'파란',size:'큰',animal:'토끼'},
 {kind:'group',color:'파란',size:'큰'},
 {kind:'group',color:'초록',size:'큰'},
 {kind:'group',color:'빨간',size:'작은'}
];
function animalCard(a,color,size){return{animal:a,color,size}}
function animalSvg(type,color){
 const fur=colors[color]?.[0]||'#ffd45b',ink='#25443a',white='#fff8ef';
 const common=`viewBox="0 0 100 100" class="animal-svg" aria-hidden="true" style="--fur:${fur};--ink:${ink};--white:${white}"`;
 if(type==='토끼')return `<svg ${common}><ellipse cx="50" cy="68" rx="29" ry="23" fill="var(--fur)" stroke="var(--ink)" stroke-width="4"/><ellipse cx="35" cy="24" rx="10" ry="23" fill="var(--fur)" stroke="var(--ink)" stroke-width="4"/><ellipse cx="65" cy="24" rx="10" ry="23" fill="var(--fur)" stroke="var(--ink)" stroke-width="4"/><circle cx="50" cy="49" r="25" fill="var(--fur)" stroke="var(--ink)" stroke-width="4"/><circle cx="41" cy="46" r="3.8" fill="var(--ink)"/><circle cx="59" cy="46" r="3.8" fill="var(--ink)"/><path d="M46 56 Q50 61 54 56" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="54" r="3" fill="#ff9da8"/></svg>`;
 if(type==='돼지')return `<svg ${common}><ellipse cx="50" cy="68" rx="31" ry="22" fill="var(--fur)" stroke="var(--ink)" stroke-width="4"/><path d="M27 35 L18 22 L37 27Z M73 35 L82 22 L63 27Z" fill="var(--fur)" stroke="var(--ink)" stroke-width="4"/><circle cx="50" cy="48" r="27" fill="var(--fur)" stroke="var(--ink)" stroke-width="4"/><ellipse cx="50" cy="57" rx="13" ry="9" fill="#ffc2c9" stroke="var(--ink)" stroke-width="3"/><circle cx="45" cy="57" r="2" fill="var(--ink)"/><circle cx="55" cy="57" r="2" fill="var(--ink)"/><circle cx="40" cy="44" r="3.5" fill="var(--ink)"/><circle cx="60" cy="44" r="3.5" fill="var(--ink)"/></svg>`;
 if(type==='소')return `<svg ${common}><rect x="18" y="50" width="64" height="35" rx="17" fill="var(--fur)" stroke="var(--ink)" stroke-width="4"/><path d="M31 31 L19 21 L23 38 M69 31 L81 21 L77 38" fill="#f1d8a5" stroke="var(--ink)" stroke-width="4"/><circle cx="50" cy="44" r="25" fill="var(--fur)" stroke="var(--ink)" stroke-width="4"/><path d="M31 54 Q39 45 47 54 Q56 44 69 51" fill="var(--white)" opacity=".9"/><ellipse cx="50" cy="58" rx="14" ry="9" fill="#f5c9b2" stroke="var(--ink)" stroke-width="3"/><circle cx="41" cy="43" r="3.5" fill="var(--ink)"/><circle cx="59" cy="43" r="3.5" fill="var(--ink)"/></svg>`;
 return `<svg ${common}><ellipse cx="48" cy="66" rx="31" ry="22" fill="var(--fur)" stroke="var(--ink)" stroke-width="4"/><circle cx="61" cy="39" r="19" fill="var(--fur)" stroke="var(--ink)" stroke-width="4"/><path d="M76 39 L95 46 L76 51Z" fill="#ffad43" stroke="var(--ink)" stroke-width="3"/><ellipse cx="42" cy="65" rx="16" ry="11" fill="var(--white)" opacity=".55"/><circle cx="66" cy="35" r="3.5" fill="var(--ink)"/><path d="M25 82 Q19 92 16 88 M53 84 Q51 94 46 90" fill="none" stroke="#d58f32" stroke-width="4" stroke-linecap="round"/></svg>`;
}
function rescueTargetMarkup(q){
 const targetAnimals=q.kind==='single'?[animals.find(a=>a[0]===q.animal)]:animals;
 return targetAnimals.map(a=>`<span class="radio-target ${q.size==='작은'?'small':''}" aria-hidden="true">${animalSvg(a[0],q.color)}</span>`).join('');
}
function renderFind(){
 const q=findRounds[state.round],need=q.kind==='single'?1:4;let found=new Set();
 world.classList.add('rescue-v6-world');
 missionText.textContent=q.kind==='single'?`${q.color} ${q.size} ${q.animal}를 찾아줘!`:`${q.color} ${q.size} 동물 네 친구를 찾아줘!`;
 missionSub.textContent='무전을 듣고 구조 현장에서 같은 친구를 찾아 구조차로 보내요.';say(missionText.textContent);
 let cards=[];
 if(q.kind==='single'){
  const ta=animals.find(a=>a[0]===q.animal);cards=[animalCard(ta,q.color,q.size),animalCard(ta,q.color,q.size==='큰'?'작은':'큰'),animalCard(ta,q.color==='노란'?'파란':'노란',q.size),animalCard(animals[(animals.indexOf(ta)+1)%4],q.color,q.size)];
  while(cards.length<8){const a=animals[Math.floor(Math.random()*4)],c=Object.keys(colors)[Math.floor(Math.random()*4)],z=Math.random()>.5?'큰':'작은';if(!cards.some(x=>x.animal[0]===a[0]&&x.color===c&&x.size===z))cards.push(animalCard(a,c,z))}
 }else{
  animals.forEach(a=>cards.push(animalCard(a,q.color,q.size)));cards.push(animalCard(animals[0],q.color,q.size));cards.push(animalCard(animals[1],q.color,q.size==='큰'?'작은':'큰'));cards.push(animalCard(animals[2],q.color==='초록'?'노란':'초록',q.size));cards.push(animalCard(animals[3],q.color==='빨간'?'파란':'빨간',q.size));
 }
 const scene=document.createElement('div');scene.className='rescue-v6';
 const radio=document.createElement('div');radio.className='rescue-radio';radio.innerHTML=`<div class="radio-wave">📡</div><div class="radio-copy"><small>구조대 무전</small><b>${q.kind==='single'?`${q.color} ${q.size} ${q.animal}`:`${q.color} ${q.size} 동물 4종`}</b><span>${q.kind==='single'?'현장 어딘가에 숨어 있어!':'토끼·돼지·소·오리를 한 마리씩!'}</span></div><div class="radio-targets">${rescueTargetMarkup(q)}</div><button type="button" class="radio-replay" aria-label="무전 다시 듣기">🔊</button>`;
 radio.querySelector('.radio-replay').onclick=()=>say(missionText.textContent);
 const field=document.createElement('div');field.className=`rescue-field scene-${['pond','meadow','forest','creek','sunset'][state.round]}`;
 field.innerHTML=`<span class="field-prop sun">☀️</span><span class="field-prop tree a">🌳</span><span class="field-prop tree b">🌲</span><span class="field-prop bush a">🌿</span><span class="field-prop bush b">🌿</span><span class="field-prop rock">🪨</span><div class="rescue-counter">구조 <b id="rescueCount">0</b>/${need}</div><div class="rescue-van"><div class="van-seats">${Array.from({length:need},(_,i)=>`<span data-seat="${i}">?</span>`).join('')}</div><div class="van-body">🚐<small>모아 구조대</small></div></div>`;
 const positions=shuffle([{x:14,y:19},{x:49,y:16},{x:81,y:22},{x:23,y:40},{x:65,y:39},{x:12,y:61},{x:47,y:59},{x:82,y:61}]);
 const shuffled=shuffle(cards);
 const seats=[...field.querySelectorAll('[data-seat]')],truck=field.querySelector('.rescue-van');
 const land=x=>{
  const idx=q.kind==='single'?0:animals.findIndex(a=>a[0]===x.animal[0]),seat=seats[idx];
  seat.innerHTML=`<span class="seat-animal">${animalSvg(x.animal[0],q.color)}</span>`;seat.classList.add('filled');$('#rescueCount').textContent=String(found.size);
 };
 shuffled.forEach((x,i)=>{
  const pos=positions[i%positions.length],b=document.createElement('button');b.type='button';b.className=`rescue-creature ${x.size==='작은'?'small':'big'}`;b.style.left=`${pos.x}%`;b.style.top=`${pos.y}%`;b.innerHTML=`<span class="creature-art">${animalSvg(x.animal[0],x.color)}</span><span class="sr-only">${x.size} ${x.color} ${x.animal[0]}</span>`;
  b.onclick=()=>{if(state.lock||b.classList.contains('rescue-fly')||b.classList.contains('rescued-away'))return;const basic=x.color===q.color&&x.size===q.size,ok=q.kind==='single'?basic&&x.animal[0]===q.animal:basic&&!found.has(x.animal[0]);
   if(!ok){b.classList.add('spooked');sfx('no');flash(basic&&q.kind==='group'&&found.has(x.animal[0])?'이미 구조한 친구야! 다른 친구를 찾아줘.':'무전 속 친구와 달라! 다시 찾아봐.');later(()=>b.classList.remove('spooked'),520);return}
   found.add(x.animal[0]);const br=b.getBoundingClientRect(),tr=truck.getBoundingClientRect();b.style.setProperty('--fly-x',`${tr.left+tr.width/2-(br.left+br.width/2)}px`);b.style.setProperty('--fly-y',`${tr.top+tr.height/3-(br.top+br.height/2)}px`);b.classList.add('rescue-fly');sfx('ok');flash('찾았다! 구조차로 이동 중! 🚨');
   later(()=>{b.classList.add('rescued-away');land(x);rewardAt(truck);addSeeds(q.kind==='single'?10:3);const done=q.kind==='single'||found.size===4;if(done){state.lock=true;field.classList.add('all-safe');flash('구조 완료! 모두 안전해요 🎉');roundGate(scene,'다음 구조 현장 ▶',650)}},820)
  };field.appendChild(b)
 });
 scene.append(radio,field);area.appendChild(scene)
}

const memoryColors=[['파랑','#64adff'],['노랑','#ffd04f'],['초록','#67c67d'],['빨강','#ff7770']];
function renderMemory(){
 const type=state.round%2===0?'color':'animal',len=state.round<2?3:4,seq=type==='color'?shuffle(memoryColors).slice(0,len):shuffle(animals).slice(0,len);
 missionText.textContent=type==='color'?`${len}개의 색 순서를 기억해요!`:`${len}마리 순서를 기억해요!`;
 missionSub.textContent='주문표를 충분히 보고 준비되면 바구니에 같은 순서로 담아요.';say(missionText.textContent);
 const stage=document.createElement('div');stage.className='memory-stage memory-picnic';
 const ticket=document.createElement('div');ticket.className='memory-ticket';ticket.innerHTML='<b>🧾 피크닉 주문표</b><small>순서를 눈으로 보고 말로 한 번 되뇌어봐요.</small>';
 const strip=document.createElement('div');strip.className='memory-strip';
 const visual=x=>type==='color'?`<span class="memory-dot" style="background:${x[1]}"></span>`:`<span class="memory-animal">${x[1]}</span>`;
 seq.forEach((x,i)=>{const d=document.createElement('div');d.className='memory-tile';d.dataset.slot=String(i);d.innerHTML=visual(x);strip.appendChild(d)});
 const basket=document.createElement('div');basket.className='memory-basket';basket.innerHTML=`<b>🧺 내 바구니</b><div>${Array.from({length:len},(_,i)=>`<span class="basket-slot" data-basket="${i}">?</span>`).join('')}</div>`;
 const study=document.createElement('div');study.className='memory-study-actions';study.innerHTML='<button class="memory-ready" type="button">준비됐어요 ✓</button><small>시간 제한 없음 · 충분히 보고 시작해요.</small>';
 const path=document.createElement('div');path.className='garden-path picnic-path';path.innerHTML='<span class="vine"></span><span class="picnic-goal">🧺</span><img class="walker" src="assets/moa-default.png" alt="">';
 stage.append(ticket,strip,study,basket,path);area.appendChild(stage);
 let choices=null,pos=0,peekUsed=false,peekTimer=null;
 const hideTicket=()=>{[...strip.children].forEach((d,i)=>{d.classList.add('hidden');d.innerHTML=`<span class="memory-question">${i+1}</span>`})};
 const revealTicket=()=>{[...strip.children].forEach((d,i)=>{d.classList.remove('hidden');d.innerHTML=visual(seq[i])})};
 const beginRecall=()=>{if(choices)return;hideTicket();ticket.classList.add('folded');study.innerHTML='<button class="memory-peek" type="button">👀 주문표 한 번 더 보기</button><small>막히면 한 번만 다시 볼 수 있어요.</small>';
  choices=document.createElement('div');choices.className='memory-choices';const pool=type==='color'?memoryColors:animals;shuffle(pool).forEach(x=>{const b=document.createElement('button');b.className='memory-choice';b.dataset.value=x[0];b.innerHTML=visual(x);choices.appendChild(b)});stage.insertBefore(choices,basket);
  const peek=study.querySelector('.memory-peek');peek.onclick=()=>{if(peekUsed||state.lock)return;peekUsed=true;peek.disabled=true;peek.textContent='👀 주문표 확인 중…';revealTicket();ticket.classList.remove('folded');choices.classList.add('paused');clearTimeout(peekTimer);peekTimer=setTimeout(()=>{hideTicket();ticket.classList.add('folded');choices.classList.remove('paused');peek.textContent='주문표 다시 보기 사용함 ✓'},1800)};
  choices.onclick=e=>{const b=e.target.closest('button');if(!b||state.lock||choices.classList.contains('paused')||b.classList.contains('used'))return;if(b.dataset.value===seq[pos][0]){const bs=basket.querySelector(`[data-basket="${pos}"]`);bs.innerHTML=visual(seq[pos]);bs.classList.add('filled');b.classList.add('used','correct');pos++;sfx('ok');addSeeds(Math.ceil(10/len));path.querySelector('.vine').style.width=`${pos/len*100}%`;path.querySelector('.walker').style.left=`${Math.min(86,pos/len*86)}%`;flash(pos===len?'주문을 정확히 담았어요! 피크닉 출발 🌿':`${pos}번째 물건을 담았어요!`);if(pos===len){stage.classList.add('delivered');choices.classList.add('paused');revealTicket();ticket.classList.remove('folded');const review=seq.map(x=>x[0]).join(', ');roundGate(stage,'다음 주문 ▶',650,`${review}. 이 순서였어요.`)}}else{b.classList.add('wrong');sfx('no');flash('주문 순서를 다시 떠올려봐요.');later(()=>b.classList.remove('wrong'),430)}};
 };
 study.querySelector('.memory-ready').onclick=beginRecall;
}

// 띄어쓰기 문제는 literacy-banks.js에서 난이도별로 공급합니다.
function renderSpacing(){const answer=state.practiceRounds[state.round],plain=answer.join(''),correct=new Set(),opened=new Set();let cursor=0;answer.slice(0,-1).forEach(w=>{cursor+=w.length;correct.add(cursor)});missionText.textContent='띄울 곳을 눌러 다리를 만들어요!';missionSub.textContent='띄어야 할 글자 사이를 톡 누르면 다리 판자가 하나씩 생겨요.';say('붙어 있는 문장에서 띄어야 할 자리를 찾아 다리를 완성해 주세요.');const scene=document.createElement('div');scene.className='spacing-scene bridge-adventure';const count=document.createElement('div');count.className='mini-count';count.textContent=`🪵 다리 판자 0 / ${correct.size}`;const line=document.createElement('div');line.className='spacing-line'+(plain.length>=17?' is-long':'');const bridge=document.createElement('div');bridge.className='spacing-bridge';bridge.innerHTML=`<span class="bridge-bank left">🌳</span><div class="plank-track">${[...correct].map((p,i)=>`<i class="game-plank" data-plank="${p}">${i+1}</i>`).join('')}</div><span class="bridge-bank right">🏡</span><img class="bridge-runner" src="assets/moa-default.png" alt=""></div>`;const review=document.createElement('div');review.className='spacing-review';[...plain].forEach((ch,i)=>{const c=document.createElement('span');c.className='spacing-char';c.textContent=ch;line.appendChild(c);if(i<plain.length-1){const gap=document.createElement('button');gap.className='space-gap';gap.dataset.pos=String(i+1);gap.setAttribute('aria-label',`${i+1}번째 글자 뒤 띄어쓰기`);gap.innerHTML='<i></i>';gap.onclick=()=>{if(state.lock||gap.classList.contains('opened'))return;const pos=Number(gap.dataset.pos);if(correct.has(pos)){gap.classList.add('opened');opened.add(pos);const plank=bridge.querySelector(`[data-plank="${pos}"]`);if(plank)plank.classList.add('built');count.textContent=`🪵 다리 판자 ${opened.size} / ${correct.size}`;sfx('ok');addSeeds(Math.ceil(10/correct.size));flash('판자 한 칸 연결!');if(opened.size===correct.size){line.classList.add('complete');bridge.classList.add('complete');review.innerHTML=`<b>말 덩어리 확인</b><div>${answer.map((w,i)=>`<span data-word="${i}">${w}</span>`).join('')}</div>`;say(answer.join(', '));answer.forEach((w,i)=>later(()=>{review.querySelectorAll('span').forEach(x=>x.classList.remove('active'));review.querySelector(`[data-word="${i}"]`)?.classList.add('active')},250+i*360));flash('띄어쓰기 다리 완성! 말 덩어리도 다시 확인해요 🌱');roundGate(scene,'다음 다리 ▶',Math.max(1100,answer.length*360+450))}}else{gap.classList.add('wrong');scene.classList.add('splash');sfx('no');flash('앗, 여기는 붙여 읽어요. 다른 곳에 판자를 놓아봐요.');later(()=>{gap.classList.remove('wrong');scene.classList.remove('splash')},500)}};line.appendChild(gap)}});const helper=document.createElement('div');helper.className='spacing-helper';helper.innerHTML='<span>👆</span><b>띄어야 하는 글자 사이를 누르면 다리가 이어져요</b>';scene.append(count,line,bridge,review,helper);area.appendChild(scene)}

// 맞춤법 문제는 literacy-banks.js에서 난이도별로 공급합니다.
function renderSpelling(){const q=state.practiceRounds[state.round],shops=[['모아 빵집','🥐'],['책꽃이 서점','📚'],['초록 분식집','🍜'],['샘 문구점','✏️'],['정원 안내소','🪧']],shopInfo=shops[state.round%shops.length];missionText.textContent=`${shopInfo[0]} 간판을 고쳐요!`;missionSub.textContent=state.practiceLevel==='easy'?'비슷한 글자 모양을 천천히 비교하면 가게 불이 켜져요.':'알맞은 맞춤법·띄어쓰기 표현을 골라 가게를 열어요.';say('간판에서 물음표 자리에 알맞은 표현을 골라 가게를 열어 주세요.');const shop=document.createElement('div');shop.className='repair-shop shop-quest';const storefront=document.createElement('div');storefront.className='storefront';storefront.innerHTML=`<div class="shop-awning"><span>${shopInfo[1]}</span><b>${shopInfo[0]}</b></div><div class="shop-window">✨</div><div class="shop-door"><span>🔒</span><small>수리하면 OPEN</small></div>`;const wrap=document.createElement('div');wrap.className='sign-wrap';const sign=document.createElement('div');sign.className='broken-sign neon-sign';sign.innerHTML=`${q.before}<b>?</b>${q.after||''}`;const choices=document.createElement('div');choices.className='repair-choices';const tip=document.createElement('div');tip.className='repair-tip';tip.textContent='🔧 두 표현을 비교해서 고장 난 부분을 고쳐요.';const review=document.createElement('div');review.className='spelling-review';shuffle([q.right,q.wrong]).forEach(w=>{const b=document.createElement('button');b.className='repair-choice';b.textContent=w;b.onclick=()=>{if(state.lock)return;if(w===q.right){b.classList.add('correct');sign.classList.add('fixed');sign.innerHTML=`${q.before}<b>${q.right}</b>${q.after||''}`;tip.textContent='💡 '+q.tip;review.innerHTML=`<small>한 번 더 확인</small><strong>${q.before}<b>${q.right}</b>${q.after||''}</strong>`;shop.classList.add('shop-open');storefront.querySelector('.shop-door').innerHTML='<span>🚪</span><small>OPEN!</small>';sfx('ok');addSeeds(10);rewardAt(b);flash('간판 수리 완료! 맞는 표현을 한 번 더 확인해요 ✨');roundGate(shop,'다음 간판 ▶',900,`${q.before}${q.right}${q.after||''}`)}else{b.classList.add('wrong');sign.classList.add('flicker');sfx('no');tip.textContent='🔧 아직 불이 안 켜졌어요. 두 모양을 다시 비교해봐요.';flash('간판이 깜빡! 다시 살펴봐요.');later(()=>{b.classList.remove('wrong');sign.classList.remove('flicker')},520)}};choices.appendChild(b)});wrap.append(sign,choices,tip,review);shop.append(storefront,wrap);area.appendChild(shop)}

$$('[data-open]').forEach(b=>b.addEventListener('click',()=>{
 if(b.dataset.open==='rescue'){location.href='games/rescue/';return}
 if(b.dataset.open==='recorder'){location.href='recorder/';return}
 openPreview(b.dataset.open)
}));
$$('#literacyPracticeControls [data-level]').forEach(b=>b.addEventListener('click',()=>{
 state.practiceLevel=b.dataset.level;state.practiceCount=DEFAULT_COUNTS[state.practiceLevel];updatePracticeControls();
}));
$$('#literacyPracticeControls [data-count]').forEach(b=>b.addEventListener('click',()=>{
 state.practiceCount=Number(b.dataset.count);updatePracticeControls();
}));
$('#introStart').addEventListener('click',()=>{if(state.previewGame==='rescue'){location.href='games/rescue/';return}if(state.previewGame)startGame(state.previewGame)});
$('#introBack').addEventListener('click',goHome);
$('#introList').addEventListener('click',goHome);
$$('[data-go="home"]').forEach(b=>b.addEventListener('click',goHome));
$('#backHome').addEventListener('click',goHome);$('#retryGame').addEventListener('click',()=>startGame(state.game));
$('#speakMission').addEventListener('click',()=>say(state.lastSpeech||missionText.textContent));
$('#scrollToGarden').addEventListener('click',()=>$('#gardenMap').scrollIntoView({behavior:'smooth'}));
$('#soundToggle').addEventListener('click',()=>{state.sound=!state.sound;localStorage.setItem(STORE.sound,state.sound?'on':'off');if(!state.sound)speechSynthesis?.cancel?.();updateSound();sfx('ok')});
function updateSound(){$('#soundToggle').textContent=state.sound?'🔊':'🔇';$('#soundToggle').setAttribute('aria-label',state.sound?'소리 끄기':'소리 켜기')}
updateSound();updateHome();

const deepGame=new URLSearchParams(location.search).get('game');if(deepGame&&meta[deepGame])openPreview(deepGame);

// V2 library filters
let currentCategory='all',currentSubtopic='all';
const libraryCards=[...document.querySelectorAll('.library-card')];
const categoryTabs=[...document.querySelectorAll('.category-tab')];
const subtopicTabs=[...document.querySelectorAll('.subtopic-tab')];
const subtopicByCategory={all:['all','condition','sequence','spacing','spelling','basicfind','focus','spacebasic','fingering'],visual:['all','condition','basicfind','focus'],memory:['all','sequence','focus'],literacy:['all','spacing','spelling'],language:['all'],space:['all','spacebasic'],music:['all','fingering'],life:['all']};
function applyLibraryFilters(){const allowed=subtopicByCategory[currentCategory]||['all'];if(!allowed.includes(currentSubtopic))currentSubtopic='all';subtopicTabs.forEach(b=>{const ok=allowed.includes(b.dataset.subtopic);b.hidden=!ok;b.classList.toggle('active',b.dataset.subtopic===currentSubtopic)});let visible=0;libraryCards.forEach(card=>{const cat=currentCategory==='all'||card.dataset.category===currentCategory,sub=currentSubtopic==='all'||card.dataset.subtopic===currentSubtopic,showCard=cat&&sub;card.hidden=!showCard;if(showCard)visible++});const empty=document.getElementById('emptyCategory');if(empty)empty.hidden=visible!==0}
categoryTabs.forEach(b=>b.addEventListener('click',()=>{currentCategory=b.dataset.category;currentSubtopic='all';categoryTabs.forEach(x=>x.classList.toggle('active',x===b));applyLibraryFilters()}));
subtopicTabs.forEach(b=>b.addEventListener('click',()=>{currentSubtopic=b.dataset.subtopic;subtopicTabs.forEach(x=>x.classList.toggle('active',x===b));applyLibraryFilters()}));
const mapToggle=document.getElementById('mapToggle'),miniWorld=document.getElementById('miniWorld');if(mapToggle&&miniWorld)mapToggle.addEventListener('click',()=>{const opening=miniWorld.hidden;miniWorld.hidden=!opening;mapToggle.textContent=opening?'🌿 정원 세계관 접기':'🌿 정원 세계관으로 한눈에 보기'});
applyLibraryFilters();

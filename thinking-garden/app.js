const $=(s)=>document.querySelector(s), $$=(s)=>[...document.querySelectorAll(s)];
const screens={home:$('#homeScreen'),intro:$('#introScreen'),game:$('#gameScreen'),result:$('#resultScreen')};
const area=$('#gameArea'),toast=$('#gameToast'),world=$('#gameWorld');
const missionText=$('#missionText'),missionSub=$('#missionSub'),guide=$('#guideCharacter');
const STORE={seeds:'moa-garden:seeds',done:'moa-garden:completed',sound:'moa-garden:sound'};
let state={game:null,previewGame:null,round:0,roundTotal:5,basicLevel:1,sessionCount:5,practiceLevel:'easy',practiceCount:10,practiceRounds:[],score:0,total:Number(localStorage.getItem(STORE.seeds)||0),sound:localStorage.getItem(STORE.sound)!=='off',lock:false,lastSpeech:'',timers:[]};
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
 slowScan:{title:'꽃과 단서 찾기',kicker:'홍의 꽃찾기숲',theme:'find',friend:'assets/friend-hong.png'},
 slowPlace:{title:'정원 지도 따라 놓기',kicker:'샘의 지도정원',theme:'spacing',friend:'assets/friend-saem.png'},
 slowBlock:{title:'블록 건축가',kicker:'샘의 블록공방',theme:'spacing',friend:'assets/friend-saem.png'},
 slowName:{title:'친구 이름 탐정',kicker:'샘의 이름탐정숲',theme:'find',friend:'assets/friend-saem.png'},
 slowMemory:{title:'꽃자리 기억하기',kicker:'루의 꽃기억길',theme:'memory',friend:'assets/friend-ru.png'},
 slowEveryday:{title:'가방 준비 탐험',kicker:'샘의 생활준비길',theme:'spacing',friend:'assets/friend-saem.png'},
 resetRescue:{title:'꼬인 신호 구조대',kicker:'홍의 구조 방송국',theme:'find',friend:'assets/friend-hong.png'},
 classroomMove:{title:'우리 교실 이사작전',kicker:'샘의 새 교실',theme:'spacing',friend:'assets/friend-saem.png'},
 festivalPlan:{title:'축제 준비 대작전',kicker:'루의 정원 축제',theme:'memory',friend:'assets/friend-ru.png'},
 rulePost:{title:'바뀌는 바람우체국',kicker:'샘의 바람우체국',theme:'spacing',friend:'assets/friend-saem.png'},
 mirrorPond:{title:'거울연못의 비밀',kicker:'루의 거울연못',theme:'memory',friend:'assets/friend-ru.png'},
 sceneDetect:{title:'숲속 장면 탐정',kicker:'홍의 사건현장',theme:'find',friend:'assets/friend-hong.png'},
 water:{title:'시든 꽃 깨우기',kicker:'홍의 물방울정원',theme:'find',friend:'assets/friend-hong.png'}
};

// 연습형 게임에만 적용됩니다. 다른 게임은 기존 5스테이지 구조를 유지합니다.
const LITERACY_GAMES=new Set(['spacing','spelling']);
const BASIC_GAMES=new Set(['rescue','memory','sameShape','flower','hide','path','calm','inside','targets','paint','water']);
function basicObservation(){if(!BASIC_GAMES.has(state.game))return null;const index=state.round;const arr=state.basicRecords||(state.basicRecords=[]);return arr[index]||(arr[index]={round:index+1,rewardEvents:0,wrongFeedback:0,firstFeedback:null,completed:false});}
function recordBasic(type){const r=basicObservation();if(!r)return;if(type==='correct'){r.rewardEvents++;if(r.firstFeedback===null)r.firstFeedback='보상 발생'}else if(type==='wrong'){r.wrongFeedback++;if(r.firstFeedback===null)r.firstFeedback='오반응 피드백'}}
function finishBasicRound(){const r=basicObservation();if(r)r.completed=true;}
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
 resetRescue:`<div class="pv-instruction">🤖 길잡이가 알려준 친구가 맞을까요?</div><div class="pv-options emoji"><span>📻🐰</span><span>→</span><span>🤖🐱</span><span>✋</span></div><div class="pv-hint">잠깐 멈추어 현재 목표를 다시 확인해요.</div>`,
 classroomMove:`<div class="pv-instruction">🪑 책상 오른쪽에 연필을 놓아요</div><div class="pv-options emoji"><span>▫</span><span>🪑</span><span>✏️</span><span>→</span><span>✅</span></div><div class="pv-hint">그림 복사가 아닌 실제 공간 언어 지시예요.</div>`,
 festivalPlan:`<div class="pv-instruction">🎪 준비 순서는 어떻게 될까요?</div><div class="pv-options emoji"><span>🌱</span><span>→</span><span>💧</span><span>→</span><span>🌸</span></div><div class="pv-hint">친구들의 단서를 조합하여 계획을 세워요.</div>`,
 rulePost:`<div class="pv-instruction">바람에 따라 배달 규칙이 바뀌어요</div><div class="pv-options emoji"><span>✉️⭐</span><span>→</span><span>📮🟨</span><span>📮🍀</span></div><div class="pv-hint">지금 규칙이 색깔인지 그림인지 먼저 확인해요.</div>`,
 mirrorPond:`<div class="pv-instruction">거울에 비친 그림은 어떻게 달라질까요?</div><div class="pv-options emoji"><span>🐸</span><span>🌼</span><span>↔</span><span>🌼</span><span>🐸</span></div><div class="pv-hint">모양의 위치를 머릿속으로 바꾸어 봐요.</div>`,
 sceneDetect:`<div class="pv-instruction">첫 장면을 기억하고 달라진 곳을 찾아요</div><div class="pv-options emoji"><span>🌳</span><span>🐰</span><span>→</span><span>🌳</span><span>🐱</span></div><div class="pv-hint">시간 제한 없이 충분히 본 뒤 선택해요.</div>`,
 slowScan:`<div class="pv-instruction">잎과 돌 사이에서 꽃을 찾아요</div><div class="pv-options emoji"><span>🍃</span><span class="preview-pulse">🌼</span><span>🌱</span><span class="preview-pulse">🌼</span></div>`,
 slowPlace:`<div class="pv-instruction">같은 위치에 꽃을 심어요</div><div class="pv-options emoji"><span>🌼</span><span>▫</span><span>→</span><span class="preview-pulse">🌼</span><span>▫</span></div>`,
 slowBlock:`<div class="pv-instruction">블록이 맞닿는 자리를 살펴요</div><div class="pv-options emoji"><span>🧱</span><span>🧱</span><span>→</span><span class="preview-pulse">🧱</span><span>🧱</span></div>`,
 slowName:`<div class="pv-instruction">충분히 보고 생각한 뒤 이름을 말해요</div><div class="pv-options emoji"><span>🐶</span><span>🐰</span><span>🐱</span></div>`,
 slowMemory:`<div class="pv-instruction">꽃이 있던 자리를 기억해요</div><div class="pv-sequence"><i class="blue"></i><b>→</b><i class="yellow"></i><b>→</b><i class="green"></i></div><div class="pv-hint">보기를 가린 뒤 위치를 표시해요</div>`,
 slowEveryday:`<div class="pv-instruction">가방에 넣을 물건을 찾아요</div><div class="pv-options emoji"><span>📖</span><span class="preview-pulse">✏️</span><span>🧽</span><span>📏</span></div>`,
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
  const isSlow=window.SlowLookNative?.isNew(id),isNovel=window.NovelGarden?.isNew(id),isStrategy=window.StrategyGarden?.isNew(id);
  const training=!isPractice&&id!=='rescue';
  $('#slowLookControls').hidden=!training;
  const sessionBlock=$('#extendedPracticeControls');sessionBlock.hidden=!training;
  if(training){const counts=id==='slowName'?[6,12,18,24]:[5,10,15,20];const selected=$('#sessionRounds');selected.innerHTML=counts.map((n,i)=>`<option value="${n}">${['가볍게','꾸준히','충분히','길게'][i]} · ${n}문제</option>`).join('');selected.value=String(counts[0]);}
  // Do not expose controls intended for one activity in any unrelated game.
  $('#slowNameOnly').hidden=id!=='slowName';
  $('#slowCueGroup').hidden=!isSlow;
  $('#strategyAutoGroup').hidden=!isStrategy;
  const teacher=$('#slowTeacherDetails');teacher.hidden=!(isSlow||isStrategy);teacher.open=false;
  $('#previewRoundInfo').textContent=isPractice?'읽기·쓰기 문제를 골라요.':training?'문제 수를 골라 충분히 연습할 수 있어요.':'미션을 차근차근 시작해요.';
  if(isPractice)updatePracticeControls();
  window.MoaClinicalBridge?.intro(id);
  show('intro');
}

function readCompleted(){try{return JSON.parse(localStorage.getItem(STORE.done)||'{}')}catch{return{}}}
function clearTimers(){state.timers.forEach(clearTimeout);state.timers=[]}
function later(fn,ms){const t=setTimeout(fn,ms);state.timers.push(t);return t}
function show(name){Object.values(screens).forEach(x=>x.classList.remove('active'));screens[name].classList.add('active');document.body.classList.toggle('playing',name==='game');document.body.classList.toggle('game-result',name==='result');scrollTo({top:0,behavior:'smooth'})}
function updateHome(){ $('#seedBank').textContent=`🌱 ${state.total}`;const count=Object.keys(meta).filter(id=>completed[id]).length;$('#gardenProgress').textContent=`완료한 게임 ${count} / ${document.querySelectorAll('.library-card').length}`;

$$('[data-open]').forEach(b=>b.classList.toggle('completed',!!completed[b.dataset.open])) }
const basicShapes=[['●','#ff7b76'],['■','#6bb7ff'],['▲','#69c77d'],['★','#ffd45b'],['◆','#9b83e8'],['♥','#ff8db2']];
function renderSameShape(){
 // A complete six-shape cycle comes before any shape repeats. Change the start
 // between sessions while leaving the single target attribute (shape) stable.
 const n=Math.min(3+practiceStep(),6),idx=(state.round+state.shapeOffset)%basicShapes.length;
 const target=basicShapes[idx],targetShape=target[0],targetColor=target[1];
 const correctColor=basicShapes[(idx+2)%basicShapes.length][1];
 missionText.textContent='모양이 같은 쌍둥이를 찾아요!';
 missionSub.textContent='색이 달라도 모양이 같을 수 있어요. 모양에 주목해요.';
 say(missionText.textContent);
 const others=shuffle(basicShapes.filter(x=>x[0]!==targetShape));
 const opts=shuffle([{shape:targetShape,color:correctColor},{shape:others[0][0],color:targetColor},...others.slice(1,n-1).map(x=>({shape:x[0],color:x[1]}))].slice(0,n));
 area.innerHTML='<div class="basic-game shape-adventure"><div class="shape-scene-title">🔎 모아의 쌍둥이 찾기</div><div class="shape-instructions"><strong>이 모양과 같은 친구는?</strong><span>색이 달라도 괜찮아요</span></div><div class="shape-target" style="color:'+targetColor+'" aria-label="기준 모양">'+targetShape+'</div><p class="shape-subhead">아래 모양 중에서 골라요</p><div class="basic-choice-grid">'+opts.map(x=>'<button type="button" class="basic-choice" data-shape="'+x.shape+'" aria-label="모양 '+x.shape+'" style="color:'+x.color+'">'+x.shape+'</button>').join('')+'</div></div>';
 $$('.basic-choice').forEach(b=>b.onclick=()=>{
  if(state.lock)return;
  if(b.dataset.shape===targetShape){b.classList.add('correct');addSeeds(10);sfx('ok');flash('같은 모양 찾았어요! 🌟');roundGate(area.querySelector('.basic-game'),'다음 쌍둥이 ▶',450)}
  else{b.classList.add('wrong');sfx('no');flash('색 말고 모양을 다시 비교해봐요.');later(()=>b.classList.remove('wrong'),400)}
 });
}
function renderFlower(){
 const need=3+Math.min(practiceStep(),2),flowers=['🌷','🌼','🌸','🌻','🌺'],distractors=['🍃','🪨','🍄','🌱'];
 const good=Array.from({length:need},(_,i)=>flowers[(i+practiceStep())%flowers.length]);
 const bad=Array.from({length:3+practiceStep()},(_,i)=>distractors[i%distractors.length]);
 const pool=shuffle([...good.map(x=>({x,good:true})),...bad.map(x=>({x,good:false}))]);
 let found=0;
 missionText.textContent='모아의 꽃바구니를 채워요!';
 missionSub.textContent='꽃이라면 종류가 달라도 좋아요. 잎·돌·버섯은 지나가요.';
 say(missionText.textContent);
 area.innerHTML='<div class="basic-game flower-collect"><div class="flower-basket"><span aria-hidden="true">🧺</span><div><strong>꽃바구니</strong><p id="flowerCollected">🌼 0 / '+need+'송이</p></div></div><p class="flower-scene-hint">꽃만 찾아 바구니에 담아줘요!</p><div class="object-grid">'+pool.map(o=>'<button type="button" class="object-btn" data-good="'+(o.good?1:0)+'">'+o.x+'</button>').join('')+'</div></div>';
 $$('.object-btn').forEach(b=>b.onclick=()=>{
  if(state.lock||b.classList.contains('picked'))return;
  if(b.dataset.good==='1'){
   b.classList.add('picked');found++;$('#flowerCollected').textContent='🌼 '+found+' / '+need+'송이';
   const basket=area.querySelector('.flower-basket > span');basket.textContent=found===need?'💐':'🧺';
   addSeeds(Math.ceil(10/need));sfx('ok');
   if(found===need){flash('꽃바구니 가득! 💐');roundGate(area.querySelector('.basic-game'),'다음 꽃밭 ▶',500)}
  }else{b.classList.add('wrong');sfx('no');flash('꽃 종류만 골라봐요.');later(()=>b.classList.remove('wrong'),350)}
 });
}
function renderHide(){
 const total=6+practiceStep(),need=2+Math.floor(practiceStep()/2),level=Math.min(3,1+Math.floor(practiceStep()/2));
 const spots=shuffle([...Array(total).keys()]).slice(0,need),bugs=new Set(spots);
 let found=0,misses=0;
 missionText.textContent='작은 발자국을 따라 숨은 친구를 찾아요!';
 missionSub.textContent='발자국 🐾이 있는 잎사귀를 열면 무당벌레를 찾을 수 있어요.';
 say(missionText.textContent);
 const leaves=[...Array(total).keys()].map(i=>{
  const clue=bugs.has(i),dew=!clue&&level===3&&i%2===0;
  const trail=clue?'🐾':dew?'💧':'';
  const label=clue?'발자국이 있는 잎사귀':dew?'이슬방울이 있는 잎사귀':'흔적이 없는 잎사귀';
  return '<button class="leaf-btn '+(clue?'leaf-has-clue':'leaf-no-clue')+'" data-i="'+i+'" type="button" aria-label="'+label+'"><span class="leaf-cover" aria-hidden="true">🍃</span><span class="leaf-trail" aria-hidden="true">'+(trail||'&nbsp;')+'</span></button>';
 }).join('');
 area.innerHTML='<div class="basic-game leaf-clue-game leaf-level-'+level+'"><div class="mini-count" id="miniCount">🐞 0 / '+need+'</div><div class="leaf-example" aria-label="발자국을 보고 잎사귀를 열어 무당벌레 찾기"><span>🐾</span><span>→</span><span>🍃</span><span>→</span><span>🐞</span></div><p class="leaf-rule">🐾 발자국을 찾아 잎사귀를 열어요.'+(level===3?' 💧 이슬방울과 구분해요.':'')+'</p><div class="leaf-game">'+leaves+'</div></div>';
 area.querySelectorAll('.leaf-btn').forEach(b=>b.onclick=()=>{
  if(b.classList.contains('opened')||state.lock)return;
  const ok=bugs.has(+b.dataset.i);
  b.classList.add('opened');
  b.innerHTML='<span class="leaf-discovery" aria-hidden="true">'+(ok?'🐞':'🌱')+'</span>';
  b.setAttribute('aria-label',ok?'무당벌레를 찾았어요':'빈 잎사귀예요');
  sfx(ok?'ok':'tap');
  if(ok){
   found++;$('#miniCount').textContent='🐞 '+found+' / '+need;addSeeds(Math.ceil(10/need));
   if(found===need){flash('발자국을 따라 숨은 친구를 모두 찾았어요!');roundGate(area.querySelector('.basic-game'),'다음 잎사귀 ▶',500)}
  }else{
   misses++;flash('여긴 발자국이 없어요. 🐾 모양을 다시 찾아요.');
   if(misses>=2)area.querySelectorAll('.leaf-has-clue:not(.opened)').forEach(x=>x.classList.add('leaf-hint'));
  }
 });
}
function renderPath(){
 const len=4+Math.min(practiceStep(),3);
 const icons=['🌱','🌼','🍃','🌸','🌿','🌻','🌷'];
 // Rotate 20 different opening pairs per session; target is still the currently lit spot.
 const start=(state.round+state.pathOffset)%icons.length;
 const second=(start+1+Math.floor(state.round/icons.length))%icons.length;
 const seq=[icons[start],icons[second],...shuffle(icons.filter((_,i)=>i!==start&&i!==second))].slice(0,len);
 // Each route moves the lit button around the grid rather than a fixed left-to-right path.
 const order=shuffle([...Array(len).keys()]);
 if(order.every((x,i)=>x===i))order.unshift(order.pop());
 let pos=0;
 missionText.textContent='반짝이는 길을 차례로 따라가요!';
 missionSub.textContent='위치가 바뀌어도 지금 빛나는 곳을 따라가면 돼요.';
 say(missionText.textContent);
 area.innerHTML='<div class="basic-game trail-adventure"><div class="trail-scene-hint" aria-hidden="true">✨ → ☝️ → 🦋</div><div class="trail-game">'+
  seq.map((x,i)=>'<button type="button" class="trail-node '+(i===0?'ready':'')+'" data-i="'+i+'" style="order:'+order[i]+'" aria-label="'+(i===0?'지금 누를 반짝이는 자리':'아직 차례가 아닌 자리')+'">'+x+'</button>').join('')+
  '<div class="trail-runner" id="trailRunner" aria-hidden="true">🦋</div></div></div>';
 area.querySelectorAll('.trail-node').forEach(b=>b.onclick=()=>{
  if(state.lock)return;
  const i=Number(b.dataset.i);
  if(i!==pos){b.classList.add('wrong');sfx('no');flash('빛나는 자리를 찾아요.');later(()=>b.classList.remove('wrong'),350);return;}
  b.classList.remove('ready');b.classList.add('visited');b.setAttribute('aria-label','이미 지나간 자리');
  pos++;addSeeds(Math.ceil(10/len));sfx('ok');
  const runner=$('#trailRunner');if(runner)runner.textContent='🦋 '+ '✨'.repeat(Math.min(pos,7));
  if(pos<len){const next=area.querySelectorAll('.trail-node')[pos];next.classList.add('ready');next.setAttribute('aria-label','지금 누를 반짝이는 자리');}
  else{flash('길 완성! 🦋');roundGate(area.querySelector('.basic-game'),'다음 길 ▶',500);}
 });
}
function renderCalm(){let ready=false;const useYellow=practiceStep()>=2;missionText.textContent=useYellow?'빨강·노랑은 기다리고 초록에 톡!':'초록불에만 눌러 건너요!';missionSub.textContent=useYellow?'빨간불과 노란불에는 기다리고, 초록불에만 눌러요.':'차가 지나갈 때는 기다리고 초록 신호가 켜졌을 때만 눌러요.';say(missionText.textContent);area.innerHTML='<div class="basic-game calm-game road-game"><div class="traffic-scene"><div class="traffic-light"><i class="red on"></i><i class="yellow"></i><i class="green"></i></div><div class="road"><span class="road-car">🚗</span><div class="zebra"><i></i><i></i><i></i><i></i><i></i></div><img class="road-moa" src="assets/moa-default.png" alt=""><span class="road-goal">🌳</span></div><button id="signalBtn" class="signal-btn wait"><span>🔴</span><b>기다려요</b></button><p id="signalMsg">차가 지나가요. 손을 쉬고 기다려요.</p></div></div>';const b=$('#signalBtn'),scene=area.querySelector('.traffic-scene'),light=scene.querySelector('.traffic-light'),car=scene.querySelector('.road-car');const goGreen=()=>{ready=true;light.querySelector('.red').classList.remove('on');light.querySelector('.yellow').classList.remove('on');light.querySelector('.green').classList.add('on');b.className='signal-btn go';b.innerHTML='<span>🟢</span><b>지금 건너요!</b>';$('#signalMsg').textContent='초록불! 지금 톡!';sfx('ok')};const arm=()=>{ready=false;scene.classList.remove('cross-success');light.querySelector('.red').classList.add('on');light.querySelector('.yellow').classList.remove('on');light.querySelector('.green').classList.remove('on');b.className='signal-btn wait';b.innerHTML='<span>🔴</span><b>기다려요</b>';$('#signalMsg').textContent='차가 지나가요. 손을 쉬고 기다려요.';car.classList.remove('drive');void car.offsetWidth;car.classList.add('drive');later(()=>{if(useYellow){light.querySelector('.red').classList.remove('on');light.querySelector('.yellow').classList.add('on');b.className='signal-btn caution';b.innerHTML='<span>🟡</span><b>조금 더 기다려요</b>';$('#signalMsg').textContent='노란불도 아직 기다려요.';later(goGreen,650+Math.random()*500)}else goGreen()},1100+Math.random()*1200)};b.onclick=()=>{if(state.lock)return;if(!ready){sfx('no');scene.classList.add('too-soon');flash(light.querySelector('.yellow').classList.contains('on')?'노란불도 기다려요! 초록불까지 기다려요.':'아직 빨간불이에요! 차가 지나간 뒤 기다려요.');later(()=>scene.classList.remove('too-soon'),450);clearTimers();arm()}else{scene.classList.add('cross-success');addSeeds(10);sfx('ok');flash('안전하게 건넜어요! 🚦');roundGate(scene,'다음 길 건너기 ▶',950)}};arm()}

function renderInside(){
 const need=3+practiceStep();let placed=0;const planted=[];
 missionText.textContent=`울타리 안에 별 ${need}개를 심어요!`;
 missionSub.textContent='울타리 안의 서로 다른 자리에 별을 심어 정원을 완성해요.';
 say(missionText.textContent);
 area.innerHTML=`<div class="basic-game"><div class="mini-count" id="miniCount">⭐ 0 / ${need}</div><div class="inside-stage-new" id="insideStage"><div class="inside-zone" id="insideZone"><span>울타리 안</span></div></div></div>`;
 const stage=$('#insideStage'),z=$('#insideZone');
 stage.onclick=e=>{
  if(state.lock||placed>=need)return;
  if(!e.target.closest('#insideZone')){
   sfx('tap');flash('아직 울타리 밖이에요.');
   const p=document.createElement('b');p.className='outside-ripple';
   const rect=stage.getBoundingClientRect();p.style.left=`${e.clientX-rect.left}px`;p.style.top=`${e.clientY-rect.top}px`;
   stage.appendChild(p);later(()=>p.remove(),420);return;
  }
  const r=z.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
  const minimumGap=Math.max(24,Math.min(39,r.width/11));
  if(planted.some(p=>Math.hypot(p.x-x,p.y-y)<minimumGap)){
   sfx('tap');flash('이미 별이 있어요. 빈 자리에도 심어봐요.');return;
  }
  const star=document.createElement('i');star.textContent='⭐';
  star.style.left=`${x}px`;star.style.top=`${y}px`;z.appendChild(star);
  planted.push({x,y});placed++;$('#miniCount').textContent=`⭐ ${placed} / ${need}`;
  addSeeds(Math.ceil(10/need));sfx('ok');
  if(placed===need){flash('별밭 완성!');roundGate(area.querySelector('.basic-game'),'다음 별밭 ▶',500)}
 };
}
function renderTargets(){
 const total=4+practiceStep()*2,distractors=1+Math.floor(practiceStep()/2);let done=0;
 missionText.textContent='잠든 꽃씨를 하나씩 깨워요!';
 missionSub.textContent='이미 꽃이 핀 자리는 그대로 두고, 아직 잠든 꽃씨만 찾아요.';
 say(missionText.textContent);
 const items=shuffle([
  ...Array.from({length:total},()=>({seed:true})),
  ...Array.from({length:distractors},(_,i)=>({seed:false,flower:['🌼','🌷','🌻'][i%3]}))
 ]);
 area.innerHTML='<div class="basic-game wake-garden"><div class="wake-scene-head"><span aria-hidden="true">🌱 → 🌼</span><div><strong>모아의 꽃씨 정원</strong><p id="miniCount">피어난 꽃 0 / '+total+'</p></div></div>'+
  '<div class="target-grid-new">'+items.map(o=>o.seed?
   '<button class="wake-target" type="button" aria-label="아직 잠든 꽃씨">🌱</button>':
   '<span class="wake-grown" role="img" aria-label="이미 핀 꽃, 건드리지 않아요">'+o.flower+'</span>'
  ).join('')+'</div></div>';
 $('.wake-target').forEach(b=>b.onclick=()=>{
  if(state.lock||b.classList.contains('awake'))return;
  b.classList.add('awake');b.textContent='🌼';b.setAttribute('aria-label','꽃이 피었어요');done++;
  $('#miniCount').textContent='피어난 꽃 '+done+' / '+total;addSeeds(Math.ceil(10/total));sfx('ok');
  if(done===total){flash('잠든 꽃씨를 모두 깨웠어요! 🌻');roundGate(area.querySelector('.basic-game'),'다음 꽃씨 ▶',500)}
 });
}
function renderPaint(){
 const total=12+practiceStep()*3;let done=0,drawing=false,activePointer=null,lastPoint=null;
 missionText.textContent='정원길을 쓱싹 채워요!';
 missionSub.textContent='손가락으로 길을 쭉 이으면 지나간 칸이 채워져요.';
 say(missionText.textContent);
 area.innerHTML=`<div class="basic-game"><div class="mini-count" id="miniCount">🖍️ 0%</div><div class="paint-grid-new" id="paintGrid">${Array.from({length:total},()=>'<i></i>').join('')}</div></div>`;
 const g=$('#paintGrid');
 const fill=cell=>{
  if(state.lock||!cell||cell.parentElement!==g||cell.tagName!=='I'||cell.classList.contains('painted'))return;
  cell.classList.add('painted');done++;
  $('#miniCount').textContent=`🖍️ ${Math.round(done/total*100)}%`;
  if(done===total){addSeeds(10);sfx('ok');flash('정원길 완성!');roundGate(area.querySelector('.basic-game'),'다음 색칠길 ▶',500)}
 };
 const paintAt=(x,y)=>fill(document.elementFromPoint(x,y));
 const paintTrail=(x,y)=>{
  if(!drawing)return;
  if(lastPoint){
   const dx=x-lastPoint.x,dy=y-lastPoint.y,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/7));
   for(let k=1;k<=steps;k++)paintAt(lastPoint.x+dx*k/steps,lastPoint.y+dy*k/steps);
  }else paintAt(x,y);
  lastPoint={x,y};
 };
 const end=e=>{
  if(!drawing||activePointer!==e.pointerId)return;
  if(e.type==='pointerup')paintTrail(e.clientX,e.clientY);
  drawing=false;lastPoint=null;activePointer=null;
  try{if(g.hasPointerCapture(e.pointerId))g.releasePointerCapture(e.pointerId)}catch{}
 };
 g.addEventListener('pointerdown',e=>{
  if(state.lock||drawing)return;
  drawing=true;activePointer=e.pointerId;lastPoint=null;
  try{g.setPointerCapture(e.pointerId)}catch{}
  paintTrail(e.clientX,e.clientY);e.preventDefault();
 });
 g.addEventListener('pointermove',e=>{
  if(!drawing||activePointer!==e.pointerId)return;
  if(e.pointerType==='mouse'&&e.buttons===0){drawing=false;activePointer=null;lastPoint=null;return}
  paintTrail(e.clientX,e.clientY);
 });
 g.addEventListener('pointerup',end);
 g.addEventListener('pointercancel',end);
 g.addEventListener('lostpointercapture',()=>{drawing=false;activePointer=null;lastPoint=null});
 g.addEventListener('click',e=>{if(e.target.tagName==='I')fill(e.target)});
}

function renderWater(){const total=3+practiceStep();let done=0;const flowers=['🌷','🌼','🌸','🌻','🌺','🌹','🪻'];const items=shuffle([...Array.from({length:total},(_,i)=>({wilt:true,flower:flowers[i%flowers.length]})),...Array.from({length:2+Math.floor(practiceStep()/2)},(_,i)=>({wilt:false,flower:flowers[(i+3)%flowers.length]}))]);missionText.textContent=`시든 꽃 ${total}송이만 깨워요!`;missionSub.textContent='이미 활짝 핀 꽃은 그대로 두고, 시든 꽃에만 물을 주세요.';say(missionText.textContent);area.innerHTML=`<div class="basic-game"><div class="mini-count" id="miniCount">💧 0 / ${total}</div><div class="water-grid-new">${items.map(o=>`<button class="wilt ${o.wilt?'needs-water':'healthy'}" data-good="${o.wilt?1:0}" data-flower="${o.flower}">${o.wilt?'🥀':o.flower}<small>${o.wilt?'💧':'✓'}</small></button>`).join('')}</div></div>`;$$('.wilt').forEach(b=>b.onclick=()=>{if(state.lock||b.classList.contains('bloom'))return;if(b.dataset.good!=='1'){b.classList.add('wrong');sfx('no');flash('이 꽃은 이미 싱싱해요. 시든 꽃을 찾아요.');later(()=>b.classList.remove('wrong'),380);return}b.classList.add('bloom');b.firstChild.textContent=b.dataset.flower;done++;$('#miniCount').textContent=`💧 ${done} / ${total}`;addSeeds(Math.ceil(10/total));sfx('ok');if(done===total){flash('시든 꽃을 모두 깨웠어!');roundGate(area.querySelector('.basic-game'),'다음 물주기 ▶',500)}})}

function goHome(){clearTimers();speechSynthesis?.cancel?.();state.game=null;updateHome();window.MoaAssignment?.returnToPlan();show('home')}
function addSeeds(n){recordBasic('correct');state.score+=n;state.total+=n;localStorage.setItem(STORE.seeds,state.total);$('#seedBank').textContent=`🌱 ${state.total}`;$('#scoreLabel').textContent=`🌱 ${state.score}`}
function say(text){state.lastSpeech=text;if(!state.sound||!('speechSynthesis'in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ko-KR';u.rate=.88;speechSynthesis.speak(u)}
function sfx(kind='ok'){if(kind==='no')recordBasic('wrong');if(!state.sound)return;try{const C=window.AudioContext||window.webkitAudioContext,c=new C(),o=c.createOscillator(),g=c.createGain();o.type=kind==='ok'?'triangle':'sine';const a=kind==='ok'?640:230,b=kind==='ok'?960:160;o.frequency.setValueAtTime(a,c.currentTime);o.frequency.exponentialRampToValueAtTime(b,c.currentTime+.16);g.gain.setValueAtTime(.07,c.currentTime);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.19);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+.2)}catch{}}
function flash(text){toast.textContent=text;toast.classList.add('show');clearTimeout(flash.t);flash.t=setTimeout(()=>toast.classList.remove('show'),1150)}
function shuffle(a){const copy=[...a];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}return copy}
function practiceStep(){return Math.min(4,(state.round%5)+Math.max(0,state.basicLevel-1))}
function updateProgress(){const total=state.roundTotal;$('#stageLabel').textContent=`${Math.min(state.round+1,total)} / ${total}`;$('#progressBar').style.width=`${state.round/total*100}%`;const badge=$('#missionBadge');if(badge)badge.textContent=`미션 ${Math.min(state.round+1,total)}` }
function startGame(id){clearTimers();state.game=id;state.round=0;state.score=0;state.lock=false;state.basicRecords=[];state.memorySeen=new Set();state.shapeOffset=Math.floor(Math.random()*basicShapes.length);state.pathOffset=Math.floor(Math.random()*7);state.basicLevel=Math.max(1,Math.min(3,Number($('#slowLevel').value)||1));const isSlow=window.SlowLookNative?.isNew(id);state.slowLook=isSlow?window.SlowLookNative.setUp(id,{level:$('#slowLevel')?.value,cue:$('#slowCue')?.value,kind:$('#slowKind')?.value,response:$('#slowResponse')?.value}):null;const isNovel=window.NovelGarden?.isNew(id);state.novel=isNovel?window.NovelGarden.setup(id,{level:$('#slowLevel')?.value,cue:$('#slowCue')?.value}):null;const isStrategy=window.StrategyGarden?.isNew(id);state.strategy=isStrategy?window.StrategyGarden.setup(id,{level:$('#slowLevel')?.value,cue:$('#slowCue')?.value,adaptive:$('#strategyAuto')?.checked}):null;state.sessionCount=Number($('#sessionRounds').value)||5;state.roundTotal=LITERACY_GAMES.has(id)?state.practiceCount:((id==='rescue')?5:state.sessionCount);state.practiceRounds=LITERACY_GAMES.has(id)?choosePracticeRounds(id,state.practiceLevel,state.roundTotal):[];const m=meta[id];$('#gameTitle').textContent=m.title;$('#gameKicker').textContent=m.kicker;$('#scoreLabel').textContent='🌱 0';guide.src=m.friend;world.className=`game-world theme-${m.theme}`;show('game');updateProgress();renderRound()}
function renderRound(){clearTimers();state.lock=false;state.advancing=false;area.innerHTML='';if(window.StrategyGarden?.isNew(state.game)){window.StrategyGarden.render(state.game,{state,area,missionText,missionSub,guide,addSeeds,sfx,nextRound});return;}if(window.NovelGarden?.isNew(state.game)){window.NovelGarden.render(state.game,{state,area,missionText,missionSub,guide,addSeeds,sfx,nextRound});return;}if(window.SlowLookNative?.isNew(state.game)){window.SlowLookNative.render(state.game,{state,area,missionText,missionSub,guide,say,flash,addSeeds,sfx,nextRound});return;}({rescue:renderFind,memory:renderMemory,spacing:renderSpacing,spelling:renderSpelling,sameShape:renderSameShape,flower:renderFlower,hide:renderHide,path:renderPath,calm:renderCalm,inside:renderInside,targets:renderTargets,paint:renderPaint,water:renderWater}[state.game])()}
function nextRound(delay=700){if(state.advancing)return;state.advancing=true;finishBasicRound();state.lock=true;later(()=>{state.round++;if(state.round>=state.roundTotal)return finishGame();if(state.roundTotal>=10&&state.round%5===0){state.advancing=false;area.innerHTML=`<section class="practice-break"><span class="break-art" aria-hidden="true">🌿</span><h3>잠깐 쉬어가는 정원</h3><p>${state.round}문제를 완료했어요. 눈과 손을 쉬었다가 다음 이야기를 시작해도 돼요.</p><div class="break-steps"><span>🌱 숨 고르기</span><span>👀 눈 쉬기</span><span>🧠 다음 문제는 새롭게 확인하기</span></div><div class="break-actions"><button type="button" class="primary" id="practiceContinue">준비됐어요 · 이어하기 →</button><button type="button" id="practiceStop">오늘은 여기까지</button></div></section>`;$('#practiceContinue').onclick=()=>{updateProgress();renderRound()};$('#practiceStop').onclick=()=>finishGame(true);return;}updateProgress();renderRound()},delay)}
function finishGame(early=false){if(!early){completed[state.game]=true;localStorage.setItem(STORE.done,JSON.stringify(completed));}$('#progressBar').style.width=(early?Math.round(state.round/state.roundTotal*100):100)+'%';const m=meta[state.game];$('#resultCharacter').src=m.friend;$('#resultTitle').textContent=state.score>=state.roundTotal*9?'정원이 활짝 깨어났어!':state.score>=state.roundTotal*6?'정원 한 칸 완성!':'끝까지 길을 만들었어!';$('#resultMessage').textContent=window.StrategyGarden?.isNew(state.game)?'어떤 단서를 보고 실수를 다시 확인했는지 살펴봤어요.':window.NovelGarden?.isNew(state.game)?'오늘은 새로운 방법으로 살펴보고, 실수 후 다시 확인하는 연습을 했어요.':window.SlowLookNative?.isNew(state.game)?'모아와 함께 차근차근 확인하는 연습을 했어요.':LITERACY_GAMES.has(state.game)?`${LEVEL_NAMES[state.practiceLevel]} · ${state.roundTotal}문제를 끝까지 풀었어요!`:`${m.kicker}의 ${state.roundTotal}개 미션을 모두 지나왔어요.`;if(early){$('#resultTitle').textContent='오늘 연습 여기까지 🌿';$('#resultMessage').textContent=`${state.round}문제 연습했어요. 쉬었다가 다시 시작할 수 있어요.`;}
 $('#resultScore').textContent=`🌱 ${state.score}`;document.querySelector('.practice-result-summary')?.remove();document.querySelector('.basic-observation')?.remove();if(BASIC_GAMES.has(state.game)&&state.basicRecords?.length){const panel=document.createElement('details');panel.className='basic-observation';panel.innerHTML='<summary>선생님 관찰 · 문제별 조작 피드백</summary><div class="basic-observation-items"></div><button class="basic-observation-export" type="button">관찰기록 CSV 다운로드</button><small>오반응 피드백은 해당 게임이 실제로 제공한 피드백을 센 횟수입니다. 검사 점수나 정확도·발달 수준을 뜻하지 않습니다.</small>';const list=state.basicRecords;panel.querySelector('.basic-observation-items').textContent=list.map(r=>r.round+'번: 첫 피드백 '+(r.firstFeedback||'기록 없음')+' / 오반응 피드백 '+r.wrongFeedback+'회 / 보상 발생 '+r.rewardEvents+'회').join(' · ');panel.querySelector('.basic-observation-export').onclick=()=>{const rows=[['미션','첫 피드백','오반응 피드백 횟수','보상 발생 횟수'],...list.map(r=>[r.round,r.firstFeedback||'',r.wrongFeedback,r.rewardEvents])];const csv='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');const u=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='모아_기초게임_관찰.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)};document.querySelector('.result-garden').appendChild(panel)}if(!LITERACY_GAMES.has(state.game)&&state.game!=='rescue'){const p=document.createElement('p');p.className='practice-result-summary';p.innerHTML=`<strong>${state.roundTotal}문제 중 ${early?state.round:state.roundTotal}문제를 연습했어요.</strong>일부 기초 게임은 첫 반응의 정확도를 측정하지 않고 보상·오반응 피드백만 기록해요. 연습은 여러 회기에 나눌 수 있어요.`;document.querySelector('.result-garden').appendChild(p)};document.querySelector('.slow-result-extra')?.remove();document.querySelector('.novel-results')?.remove();document.querySelector('.strategy-results')?.remove();if(state.slowLook)window.SlowLookNative.addSummary(state.slowLook,document.querySelector('.result-garden'));if(state.novel)window.NovelGarden.summary(state.novel,document.querySelector('.result-garden'));if(state.strategy)window.StrategyGarden.summary(state.strategy,document.querySelector('.result-garden'));later(()=>{show('result');window.MoaClinicalBridge?.result(state.game);window.MoaAssignment?.afterResult(state.game)},500)}
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
 const q=findRounds[practiceStep()],need=q.kind==='single'?1:4;let found=new Set();
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
 const field=document.createElement('div');field.className=`rescue-field scene-${['pond','meadow','forest','creek','sunset'][practiceStep()]}`;
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
function makeMemorySequence(type,len){
 const pool=type==='color'?memoryColors:animals,variants=[];
 const visit=(picked,rest)=>{
  if(picked.length===len){variants.push(picked);return;}
  for(let i=0;i<rest.length;i++)visit([...picked,rest[i]],rest.filter((_,j)=>j!==i));
 };
 visit([],pool);
 const seen=state.memorySeen||(state.memorySeen=new Set());
 const key=seq=>type+'|'+len+'|'+seq.map(x=>x[0]).join('|');
 const fresh=variants.filter(seq=>!seen.has(key(seq)));
 const choices=fresh.length?fresh:variants;
 const seq=choices[Math.floor(Math.random()*choices.length)];
 seen.add(key(seq));
 return seq;
}
function renderMemory(){
 const type=practiceStep()%2===0?'color':'animal',len=practiceStep()<2?3:4,seq=makeMemorySequence(type,len);
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
 let choices=null,pos=0,peekUsed=false;
 const hideTicket=()=>{[...strip.children].forEach((d,i)=>{d.classList.add('hidden');d.innerHTML=`<span class="memory-question">${i+1}</span>`})};
 const revealTicket=()=>{[...strip.children].forEach((d,i)=>{d.classList.remove('hidden');d.innerHTML=visual(seq[i])})};
 const beginRecall=()=>{if(choices)return;hideTicket();ticket.classList.add('folded');study.innerHTML='<button class="memory-peek" type="button">👀 주문표 한 번 더 보기</button><small>막히면 한 번만 다시 볼 수 있어요.</small>';
  choices=document.createElement('div');choices.className='memory-choices';const pool=type==='color'?memoryColors:animals;shuffle(pool).forEach(x=>{const b=document.createElement('button');b.className='memory-choice';b.dataset.value=x[0];b.innerHTML=visual(x);choices.appendChild(b)});stage.insertBefore(choices,basket);
  const peek=study.querySelector('.memory-peek');peek.onclick=()=>{
   if(state.lock||peek.disabled)return;
   if(!peekUsed){
    peekUsed=true;revealTicket();ticket.classList.remove('folded');
    choices.classList.add('paused');
    peek.textContent='다 봤어요 · 이어하기 ▶';
    return;
   }
   hideTicket();ticket.classList.add('folded');choices.classList.remove('paused');
   peek.disabled=true;peek.textContent='한 번 더 확인했어요 ✓';
  };
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
 if(b.dataset.open==='handMirror'){location.href='games/hand-mirror/';return}
 if(b.dataset.open==='rhythmTouch'){location.href='games/rhythm-touch/';return}
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
let currentCategory='all',currentSubtopic='all',currentExperience='all';
const libraryCards=[...document.querySelectorAll('.library-card')];
const categoryTabs=[...document.querySelectorAll('.category-tab')];
const subtopicTabs=[...document.querySelectorAll('.subtopic-tab')];
const subtopicByCategory={all:['all','condition','sequence','spacing','spelling','basicfind','focus','spacebasic'],visual:['all','condition','basicfind','focus'],memory:['all','sequence','focus'],literacy:['all','spacing','spelling'],language:['all'],space:['all','spacebasic'],life:['all']};
function applyLibraryFilters(){const allowed=subtopicByCategory[currentCategory]||['all'];if(!allowed.includes(currentSubtopic))currentSubtopic='all';subtopicTabs.forEach(b=>{const ok=allowed.includes(b.dataset.subtopic);b.hidden=!ok;b.classList.toggle('active',b.dataset.subtopic===currentSubtopic)});let visible=0;libraryCards.forEach(card=>{const cat=currentCategory==='all'||card.dataset.category===currentCategory,sub=currentSubtopic==='all'||card.dataset.subtopic===currentSubtopic,experience=currentExperience==='all'||(currentExperience==='story'?(card.dataset.experience==='story'):(card.dataset.experience!=='story')),showCard=cat&&sub&&experience;card.hidden=!showCard;if(showCard)visible++});const empty=document.getElementById('emptyCategory');if(empty)empty.hidden=visible!==0}
const experienceTabs=[...document.querySelectorAll('[data-experience-filter]')];experienceTabs.forEach(b=>b.addEventListener('click',()=>{currentExperience=b.dataset.experienceFilter;experienceTabs.forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});applyLibraryFilters();}));
categoryTabs.forEach(b=>b.addEventListener('click',()=>{currentCategory=b.dataset.category;currentSubtopic='all';categoryTabs.forEach(x=>x.classList.toggle('active',x===b));applyLibraryFilters()}));
subtopicTabs.forEach(b=>b.addEventListener('click',()=>{currentSubtopic=b.dataset.subtopic;subtopicTabs.forEach(x=>x.classList.toggle('active',x===b));applyLibraryFilters()}));
const mapToggle=document.getElementById('mapToggle'),miniWorld=document.getElementById('miniWorld');if(mapToggle&&miniWorld)mapToggle.addEventListener('click',()=>{const opening=miniWorld.hidden;miniWorld.hidden=!opening;mapToggle.textContent=opening?'🌿 정원 세계관 접기':'🌿 정원 세계관으로 한눈에 보기'});

applyLibraryFilters();
window.MoaAssignment?.init({openPreview,goHome,show});
// Top-navigation category links: select the existing category without changing game logic.
const routeCategory=new URLSearchParams(location.search).get('category');
// Old shared-library links should land in the new music hub, not show unrelated cognitive games.
if(routeCategory==='music')location.replace('../music-garden/');
if(routeCategory && Object.prototype.hasOwnProperty.call(subtopicByCategory,routeCategory)){
  const routeTab=categoryTabs.find(tab=>tab.dataset.category===routeCategory);
  if(routeTab)routeTab.click();
}

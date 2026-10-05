const $=(s)=>document.querySelector(s), $$=(s)=>[...document.querySelectorAll(s)];
const screens={home:$('#homeScreen'),intro:$('#introScreen'),game:$('#gameScreen'),result:$('#resultScreen')};
const area=$('#gameArea'),toast=$('#gameToast'),world=$('#gameWorld');
const missionText=$('#missionText'),missionSub=$('#missionSub'),guide=$('#guideCharacter');
const STORE={seeds:'moa-garden:seeds',done:'moa-garden:completed',sound:'moa-garden:sound'};
let state={game:null,previewGame:null,round:0,score:0,total:Number(localStorage.getItem(STORE.seeds)||0),sound:localStorage.getItem(STORE.sound)!=='off',lock:false,lastSpeech:'',timers:[]};
let completed=readCompleted();
const meta={
 rescue:{title:'딱 맞는 친구 찾기',kicker:'홍의 찾기숲',theme:'find',friend:'assets/friend-hong.png'},
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

const previewExamples={
 rescue:`<div class="pv-instruction">큰 · 노란 · 오리를 찾아요</div><div class="pv-row pv-size-demo"><span class="pv-animal pv-big" style="background:#ffd45b">🐰</span><span class="pv-animal pv-big preview-pulse" style="background:#ffd45b">🦆</span><span class="pv-animal pv-small" style="background:#ffd45b">🦆</span><span class="pv-animal pv-big" style="background:#6bb7ff">🐮</span></div>`,
 memory:`<div class="pv-instruction">순서를 기억해요</div><div class="pv-sequence"><i class="blue"></i><b>→</b><i class="yellow"></i><b>→</b><i class="green"></i></div><div class="pv-hint">잠시 뒤 가려지면 같은 순서로 눌러요</div>`,
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
  show('intro');
}

function readCompleted(){try{return JSON.parse(localStorage.getItem(STORE.done)||'{}')}catch{return{}}}
function clearTimers(){state.timers.forEach(clearTimeout);state.timers=[]}
function later(fn,ms){const t=setTimeout(fn,ms);state.timers.push(t);return t}
function show(name){Object.values(screens).forEach(x=>x.classList.remove('active'));screens[name].classList.add('active');scrollTo({top:0,behavior:'smooth'})}
function updateHome(){ $('#seedBank').textContent=`🌱 ${state.total}`;const count=Object.keys(meta).filter(id=>completed[id]).length;$('#gardenProgress').textContent=`완료한 게임 ${count} / 13`;

$$('[data-open]').forEach(b=>b.classList.toggle('completed',!!completed[b.dataset.open])) }
const basicShapes=[['●','#ff7b76'],['■','#6bb7ff'],['▲','#69c77d'],['★','#ffd45b'],['◆','#9b83e8'],['♥','#ff8db2']];
function renderSameShape(){const n=Math.min(3+state.round,6),idx=Math.floor(Math.random()*basicShapes.length),target=basicShapes[idx],targetShape=target[0],targetColor=target[1],correctColor=basicShapes[(idx+2)%basicShapes.length][1];missionText.textContent='색이 달라도 같은 모양을 찾아요!';missionSub.textContent='색이 같아도 모양이 다르면 다른 친구예요. 모양만 비교해요.';say(missionText.textContent);const others=shuffle(basicShapes.filter(x=>x[0]!==targetShape));let opts=[{shape:targetShape,color:correctColor},{shape:others[0][0],color:targetColor},...others.slice(1,n-1).map(x=>({shape:x[0],color:x[1]}))];opts=shuffle(opts.slice(0,n));area.innerHTML=`<div class="basic-game"><div class="shape-target" style="color:${targetColor}">${targetShape}</div><div class="basic-choice-grid">${opts.map(x=>`<button class="basic-choice" data-shape="${x.shape}" style="color:${x.color}">${x.shape}</button>`).join('')}</div></div>`;$$('.basic-choice').forEach(b=>b.onclick=()=>{if(state.lock)return;if(b.dataset.shape===targetShape){b.classList.add('correct');addSeeds(10);sfx('ok');flash('모양이 같은 쌍둥이 찾았다! ✨');nextRound(650)}else{b.classList.add('wrong');sfx('no');flash('색 말고 모양을 다시 비교해봐요.');later(()=>b.classList.remove('wrong'),400)}})}
function renderFlower(){const need=3+Math.min(state.round,2),flowers=['🌷','🌼','🌸','🌻','🌺'],distractors=['🍃','🪨','🍄','🌱'];const good=Array.from({length:need},(_,i)=>flowers[(i+state.round)%flowers.length]);const bad=Array.from({length:3+state.round},(_,i)=>distractors[i%distractors.length]);const pool=shuffle([...good.map(x=>({x,good:true})),...bad.map(x=>({x,good:false}))]);let found=0;missionText.textContent=`꽃 ${need}송이만 찾아요!`;missionSub.textContent='모양이 달라도 꽃이면 맞아요. 잎·돌·버섯은 지나가요.';say(missionText.textContent);area.innerHTML=`<div class="basic-game"><div class="mini-count" id="miniCount">🌼 0 / ${need}</div><div class="object-grid">${pool.map(o=>`<button class="object-btn" data-good="${o.good?1:0}">${o.x}</button>`).join('')}</div></div>`;$$('.object-btn').forEach(b=>b.onclick=()=>{if(state.lock||b.classList.contains('picked'))return;if(b.dataset.good==='1'){b.classList.add('picked');found++;$('#miniCount').textContent=`🌼 ${found} / ${need}`;addSeeds(Math.ceil(10/need));sfx('ok');if(found===need){flash('꽃바구니 완성!');nextRound(650)}}else{b.classList.add('wrong');sfx('no');flash('꽃 종류만 골라봐요.');later(()=>b.classList.remove('wrong'),350)}})}
function renderHide(){const total=6+state.round,need=2+Math.floor(state.round/2),spots=shuffle([...Array(total).keys()]).slice(0,need),bugs=new Set(spots);let found=0;missionText.textContent=`잎사귀 아래 친구 ${need}마리를 찾아요!`;missionSub.textContent='하나씩 열어보고 숨어 있는 친구를 찾아요.';say(missionText.textContent);area.innerHTML=`<div class="basic-game"><div class="mini-count" id="miniCount">🐞 0 / ${need}</div><div class="leaf-game">${[...Array(total).keys()].map(i=>`<button class="leaf-btn" data-i="${i}">🍃</button>`).join('')}</div></div>`;$$('.leaf-btn').forEach(b=>b.onclick=()=>{if(b.classList.contains('opened')||state.lock)return;b.classList.add('opened');const ok=bugs.has(+b.dataset.i);b.textContent=ok?'🐞':'🌱';sfx(ok?'ok':'tap');if(ok){found++;$('#miniCount').textContent=`🐞 ${found} / ${need}`;addSeeds(Math.ceil(10/need));if(found===need){flash('숨은 친구 다 찾았다!');nextRound(700)}}})}
function renderPath(){const len=4+Math.min(state.round,3),icons=['🌱','🌼','🍃','🌸','🌿','🌻','🌷'],seq=icons.slice(0,len);let pos=0;missionText.textContent='반짝이는 길을 차례로 따라가요!';missionSub.textContent='지금 반짝이는 곳을 찾아 한 칸씩 이동해요.';say(missionText.textContent);area.innerHTML=`<div class="basic-game"><div class="trail-game">${seq.map((x,i)=>`<button class="trail-node ${i===0?'ready':''}" data-i="${i}">${x}</button>`).join('')}<div class="trail-runner" id="trailRunner">🦋</div></div></div>`;$$('.trail-node').forEach(b=>b.onclick=()=>{if(state.lock)return;const i=+b.dataset.i;if(i!==pos){b.classList.add('wrong');sfx('no');flash('반짝이는 곳부터!');later(()=>b.classList.remove('wrong'),350);return}b.classList.remove('ready');b.classList.add('visited');pos++;addSeeds(Math.ceil(10/len));sfx('ok');if(pos<len)$$('.trail-node')[pos].classList.add('ready');else{flash('길 완성! 🦋');nextRound(700)}})}
function renderCalm(){let ready=false;missionText.textContent='빨간불에는 기다리고, 초록불에 톡!';missionSub.textContent='먼저 누르지 않고 신호가 바뀔 때까지 기다려요.';say(missionText.textContent);area.innerHTML='<div class="basic-game calm-game"><button id="signalBtn" class="signal-btn wait"><span>🔴</span><b>기다려요</b></button><p id="signalMsg">손을 쉬고 기다려요.</p></div>';const b=$('#signalBtn');const arm=()=>{ready=false;b.className='signal-btn wait';b.innerHTML='<span>🔴</span><b>기다려요</b>';later(()=>{ready=true;b.className='signal-btn go';b.innerHTML='<span>🟢</span><b>지금!</b>';$('#signalMsg').textContent='지금 톡!';sfx('ok')},850+Math.random()*850)};b.onclick=()=>{if(state.lock)return;if(!ready){sfx('no');flash('조금 빨랐어요. 다시 기다려요.');clearTimers();arm()}else{addSeeds(10);sfx('ok');flash('기다렸다가 성공!');nextRound(650)}};arm()}
function renderInside(){const need=3+state.round;let placed=0;missionText.textContent=`울타리 안에 별 ${need}개를 심어요!`;missionSub.textContent='넓은 들판 중 연두색 울타리 안에만 별을 심어요.';say(missionText.textContent);area.innerHTML=`<div class="basic-game"><div class="mini-count" id="miniCount">⭐ 0 / ${need}</div><div class="inside-stage-new" id="insideStage"><div class="inside-zone" id="insideZone"><span>울타리 안</span></div></div></div>`;const stage=$('#insideStage'),z=$('#insideZone');stage.onclick=e=>{if(state.lock||placed>=need)return;if(!e.target.closest('#insideZone')){sfx('no');flash('울타리 안에 심어봐요.');const p=document.createElement('b');p.className='outside-ripple';p.style.left=`${e.offsetX}px`;p.style.top=`${e.offsetY}px`;stage.appendChild(p);later(()=>p.remove(),420);return}const r=z.getBoundingClientRect(),star=document.createElement('i');star.textContent='⭐';star.style.left=`${e.clientX-r.left}px`;star.style.top=`${e.clientY-r.top}px`;z.appendChild(star);placed++;$('#miniCount').textContent=`⭐ ${placed} / ${need}`;addSeeds(Math.ceil(10/need));sfx('ok');if(placed===need){flash('별밭 완성!');nextRound(700)}}}
function renderTargets(){const total=4+state.round*2;let done=0;missionText.textContent='동그라미를 하나씩 모두 깨워요!';missionSub.textContent='같은 곳을 두 번 누르지 않고 빠뜨리지 않게 찾아요.';say(missionText.textContent);area.innerHTML=`<div class="basic-game"><div class="mini-count" id="miniCount">✨ 0 / ${total}</div><div class="target-grid-new">${Array.from({length:total},()=>'<button class="wake-target">○</button>').join('')}</div></div>`;$$('.wake-target').forEach(b=>b.onclick=()=>{if(state.lock||b.classList.contains('awake'))return;b.classList.add('awake');b.textContent='🌼';done++;$('#miniCount').textContent=`✨ ${done} / ${total}`;addSeeds(Math.ceil(10/total));sfx('ok');if(done===total){flash('모두 깨어났어!');nextRound(650)}})}
function renderPaint(){const total=12+state.round*3;let done=0,drawing=false;missionText.textContent='정원길을 쓱싹 채워요!';missionSub.textContent='누른 채 움직이거나 칸을 톡톡 눌러 안쪽을 채워요.';say(missionText.textContent);area.innerHTML=`<div class="basic-game"><div class="mini-count" id="miniCount">🖍️ 0%</div><div class="paint-grid-new" id="paintGrid">${Array.from({length:total},()=>'<i></i>').join('')}</div></div>`;const fill=cell=>{if(state.lock||cell.classList.contains('painted'))return;cell.classList.add('painted');done++;$('#miniCount').textContent=`🖍️ ${Math.round(done/total*100)}%`;if(done===total){addSeeds(10);sfx('ok');flash('정원길 완성!');nextRound(700)}};const g=$('#paintGrid');g.onpointerdown=e=>{drawing=true;if(e.target.tagName==='I')fill(e.target)};g.onpointerover=e=>{if(drawing&&e.target.tagName==='I')fill(e.target)};g.onclick=e=>{if(e.target.tagName==='I')fill(e.target)};g.onpointerup=()=>drawing=false;g.onpointerleave=()=>drawing=false}
function renderWater(){const total=3+state.round;let done=0;const flowers=['🌷','🌼','🌸','🌻','🌺','🌹','🪻'];const items=shuffle([...Array.from({length:total},(_,i)=>({wilt:true,flower:flowers[i%flowers.length]})),...Array.from({length:2+Math.floor(state.round/2)},(_,i)=>({wilt:false,flower:flowers[(i+3)%flowers.length]}))]);missionText.textContent=`시든 꽃 ${total}송이만 깨워요!`;missionSub.textContent='이미 활짝 핀 꽃은 그대로 두고, 시든 꽃에만 물을 주세요.';say(missionText.textContent);area.innerHTML=`<div class="basic-game"><div class="mini-count" id="miniCount">💧 0 / ${total}</div><div class="water-grid-new">${items.map(o=>`<button class="wilt ${o.wilt?'needs-water':'healthy'}" data-good="${o.wilt?1:0}" data-flower="${o.flower}">${o.wilt?'🥀':o.flower}<small>${o.wilt?'💧':'✓'}</small></button>`).join('')}</div></div>`;$$('.wilt').forEach(b=>b.onclick=()=>{if(state.lock||b.classList.contains('bloom'))return;if(b.dataset.good!=='1'){b.classList.add('wrong');sfx('no');flash('이 꽃은 이미 싱싱해요. 시든 꽃을 찾아요.');later(()=>b.classList.remove('wrong'),380);return}b.classList.add('bloom');b.firstChild.textContent=b.dataset.flower;done++;$('#miniCount').textContent=`💧 ${done} / ${total}`;addSeeds(Math.ceil(10/total));sfx('ok');if(done===total){flash('시든 꽃을 모두 깨웠어!');nextRound(650)}})}

function goHome(){clearTimers();speechSynthesis?.cancel?.();state.game=null;updateHome();show('home')}
function addSeeds(n){state.score+=n;state.total+=n;localStorage.setItem(STORE.seeds,state.total);$('#seedBank').textContent=`🌱 ${state.total}`;$('#scoreLabel').textContent=`🌱 ${state.score}`}
function say(text){state.lastSpeech=text;if(!state.sound||!('speechSynthesis'in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ko-KR';u.rate=.88;speechSynthesis.speak(u)}
function sfx(kind='ok'){if(!state.sound)return;try{const C=window.AudioContext||window.webkitAudioContext,c=new C(),o=c.createOscillator(),g=c.createGain();o.type=kind==='ok'?'triangle':'sine';const a=kind==='ok'?640:230,b=kind==='ok'?960:160;o.frequency.setValueAtTime(a,c.currentTime);o.frequency.exponentialRampToValueAtTime(b,c.currentTime+.16);g.gain.setValueAtTime(.07,c.currentTime);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.19);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+.2)}catch{}}
function flash(text){toast.textContent=text;toast.classList.add('show');clearTimeout(flash.t);flash.t=setTimeout(()=>toast.classList.remove('show'),1150)}
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function updateProgress(){ $('#stageLabel').textContent=`${Math.min(state.round+1,5)} / 5`;$('#progressBar').style.width=`${state.round/5*100}%` }
function startGame(id){clearTimers();state.game=id;state.round=0;state.score=0;state.lock=false;const m=meta[id];$('#gameTitle').textContent=m.title;$('#gameKicker').textContent=m.kicker;$('#scoreLabel').textContent='🌱 0';guide.src=m.friend;world.className=`game-world theme-${m.theme}`;show('game');updateProgress();renderRound()}
function renderRound(){clearTimers();state.lock=false;area.innerHTML='';({rescue:renderFind,memory:renderMemory,spacing:renderSpacing,spelling:renderSpelling,sameShape:renderSameShape,flower:renderFlower,hide:renderHide,path:renderPath,calm:renderCalm,inside:renderInside,targets:renderTargets,paint:renderPaint,water:renderWater}[state.game])()}
function nextRound(delay=700){state.lock=true;later(()=>{state.round++;if(state.round>=5)return finishGame();updateProgress();renderRound()},delay)}
function finishGame(){completed[state.game]=true;localStorage.setItem(STORE.done,JSON.stringify(completed));$('#progressBar').style.width='100%';const m=meta[state.game];$('#resultCharacter').src=m.friend;$('#resultTitle').textContent=state.score>=46?'정원이 활짝 깨어났어!':state.score>=34?'정원 한 칸 완성!':'끝까지 길을 만들었어!';$('#resultMessage').textContent=`${m.kicker}의 5개 미션을 모두 지나왔어요.`;$('#resultScore').textContent=`🌱 ${state.score}`;later(()=>show('result'),500)}
function rewardAt(el){const r=el.getBoundingClientRect(),w=world.getBoundingClientRect(),p=document.createElement('span');p.className='leaf-pop';p.textContent='🌱';p.style.left=`${r.left-w.left+r.width/2}px`;p.style.top=`${r.top-w.top+r.height/2}px`;world.appendChild(p);later(()=>p.remove(),800)}

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
function renderFind(){const q=findRounds[state.round],color=colors[q.color];let found=new Set();missionText.textContent=q.kind==='single'?`${q.color} ${q.size} ${q.animal}를 찾아 주세요!`:`${q.color} ${q.size} 동물을 종류별로 하나씩 찾아 주세요!`;missionSub.textContent=q.kind==='single'?'색 · 크기 · 종류, 세 가지를 모두 보고 골라요.':'토끼 · 돼지 · 소 · 오리를 한 마리씩 모아요.';say(missionText.textContent);let cards=[];
 if(q.kind==='single'){const ta=animals.find(a=>a[0]===q.animal);cards=[animalCard(ta,q.color,q.size),animalCard(ta,q.color,q.size==='큰'?'작은':'큰'),animalCard(ta,q.color==='노란'?'파란':'노란',q.size),animalCard(animals[(animals.indexOf(ta)+1)%4],q.color,q.size)];while(cards.length<8){const a=animals[Math.floor(Math.random()*4)],c=Object.keys(colors)[Math.floor(Math.random()*4)],s=Math.random()>.5?'큰':'작은';if(!cards.some(x=>x.animal[0]===a[0]&&x.color===c&&x.size===s))cards.push(animalCard(a,c,s))}}
 else{animals.forEach(a=>cards.push(animalCard(a,q.color,q.size)));cards.push(animalCard(animals[0],q.color,q.size));cards.push(animalCard(animals[1],q.color,q.size==='큰'?'작은':'큰'));cards.push(animalCard(animals[2],q.color==='초록'?'노란':'초록',q.size));cards.push(animalCard(animals[3],q.color==='빨간'?'파란':'빨간',q.size))}
 const board=document.createElement('div');board.className='find-board';shuffle(cards).forEach(x=>{const b=document.createElement('button');b.className=`find-card ${x.size==='작은'?'small':''}`;b.innerHTML=`<span class="animal-bubble" style="background:${colors[x.color][0]}"><span class="animal ${x.size==='작은'?'animal-small':'animal-large'}">${x.animal[1]}</span></span><span class="sr-only">${x.size} ${x.color} ${x.animal[0]}</span>`;b.onclick=()=>{if(state.lock||b.classList.contains('correct'))return;const basic=x.color===q.color&&x.size===q.size;const ok=q.kind==='single'?basic&&x.animal[0]===q.animal:basic&&!found.has(x.animal[0]);if(ok){found.add(x.animal[0]);b.classList.add('correct');rewardAt(b);sfx('ok');addSeeds(q.kind==='single'?10:3);flash(q.kind==='single'?'찾았다! 🌱':`${x.animal[0]} 찾기 성공!`);if(q.kind==='single'||found.size===4)nextRound(850)}else{b.classList.add('wrong');sfx('no');flash(basic&&q.kind==='group'&&found.has(x.animal[0])?'같은 종류는 이미 찾았어요.':'조건을 한 번 더 살펴봐요.');later(()=>b.classList.remove('wrong'),430)}};board.appendChild(b)});area.appendChild(board)}

const memoryColors=[['파랑','#64adff'],['노랑','#ffd04f'],['초록','#67c67d'],['빨강','#ff7770']];
function renderMemory(){
 const type=state.round%2===0?'color':'animal',len=state.round<2?3:4,seq=type==='color'?shuffle(memoryColors).slice(0,len):shuffle(animals).slice(0,len);
 missionText.textContent=type==='color'?`${len}개의 색 순서를 기억해요!`:`${len}마리의 순서를 기억해요!`;
 missionSub.textContent='눈으로 보고, 말로 한 번 되뇌어 본 뒤 기억길을 이어요.';say(missionText.textContent);
 const stage=document.createElement('div');stage.className='memory-stage';
 const strip=document.createElement('div');strip.className='memory-strip';
 const visual=x=>type==='color'?`<span class="memory-dot" style="background:${x[1]}"></span>`:`<span class="memory-animal">${x[1]}</span>`;
 seq.forEach((x,i)=>{const d=document.createElement('div');d.className='memory-tile';d.dataset.slot=String(i);d.innerHTML=visual(x);strip.appendChild(d)});
 const path=document.createElement('div');path.className='garden-path';path.innerHTML='<span class="vine"></span><img class="walker" src="assets/moa-default.png" alt="">';stage.append(strip,path);area.appendChild(stage);
 later(()=>{
  [...strip.children].forEach((d,i)=>{d.classList.add('hidden');d.innerHTML=`<span class="memory-question">${i+1}</span>`});
  const choices=document.createElement('div');choices.className='memory-choices';const pool=type==='color'?memoryColors:animals;
  shuffle(pool).forEach(x=>{const b=document.createElement('button');b.className='memory-choice';b.dataset.value=x[0];b.innerHTML=visual(x);choices.appendChild(b)});
  stage.insertBefore(choices,path);let pos=0;
  choices.onclick=e=>{const b=e.target.closest('button');if(!b||state.lock||b.classList.contains('used'))return;
   if(b.dataset.value===seq[pos][0]){const slot=strip.children[pos];slot.classList.remove('hidden');slot.classList.add('recalled');slot.innerHTML=visual(seq[pos]);b.classList.add('used','correct');pos++;sfx('ok');addSeeds(Math.ceil(10/len));path.querySelector('.vine').style.width=`${pos/len*100}%`;path.querySelector('.walker').style.left=`${Math.min(90,pos/len*90)}%`;flash(pos===len?'기억꽃길 완성! 🌿':`${pos}번째 기억 성공!`);if(pos===len)nextRound(900)}
   else{b.classList.add('wrong');sfx('no');flash('순서를 다시 떠올려봐요.');later(()=>b.classList.remove('wrong'),430)}
  }
 },1750+state.round*180)
}

const sentenceRounds=[
 ['밥을','먹어요'],
 ['학교에','가요'],
 ['나는','축구를','좋아해요'],
 ['엄마에게','카톡을','보내요'],
 ['오늘은','책을','15분씩','읽어요']
];
function renderSpacing(){const answer=sentenceRounds[state.round],plain=answer.join(''),correct=new Set(),opened=new Set();let cursor=0;answer.slice(0,-1).forEach(w=>{cursor+=w.length;correct.add(cursor)});missionText.textContent='붙어 있는 문장에 띄어쓰기 길을 만들어요!';missionSub.textContent='띄어야 할 곳을 톡 눌러요. 글자는 쓰지 않아도 돼요.';say(`${answer.join(' ')}. 어디에서 띄어야 하는지 찾아 톡 눌러 주세요.`);const scene=document.createElement('div');scene.className='spacing-scene';const count=document.createElement('div');count.className='mini-count';count.textContent=`띄어쓰기 0 / ${correct.size}`;const line=document.createElement('div');line.className='spacing-line';[...plain].forEach((ch,i)=>{const c=document.createElement('span');c.className='spacing-char';c.textContent=ch;line.appendChild(c);if(i<plain.length-1){const gap=document.createElement('button');gap.className='space-gap';gap.dataset.pos=String(i+1);gap.setAttribute('aria-label',`${i+1}번째 글자 뒤 띄어쓰기`);gap.innerHTML='<i></i>';gap.onclick=()=>{if(state.lock||gap.classList.contains('opened'))return;const pos=Number(gap.dataset.pos);if(correct.has(pos)){gap.classList.add('opened');opened.add(pos);count.textContent=`띄어쓰기 ${opened.size} / ${correct.size}`;sfx('ok');addSeeds(Math.ceil(10/correct.size));if(opened.size===correct.size){state.lock=true;line.classList.add('complete');flash('띄어쓰기 길 완성! 🌱');later(()=>nextRound(0),1050)}}else{gap.classList.add('wrong');sfx('no');flash('여기는 붙여 읽어요. 다른 곳을 찾아봐요.');later(()=>gap.classList.remove('wrong'),430)}};line.appendChild(gap)}});const helper=document.createElement('div');helper.className='spacing-helper';helper.innerHTML='<span>👆</span><b>글자 사이를 눌러 빈칸을 만들어요</b>';scene.append(count,line,helper);area.appendChild(scene)}

const spellRounds=[
 {before:'숙제를 다 ',right:'했어요',wrong:'햇어요',tip:'과거형은 ‘했어요’처럼 ㅆ을 써요.'},
 {before:'책을 다 ',right:'읽었어요',wrong:'읽엇어요',tip:'‘었어요’의 받침은 ㅆ이에요.'},
 {before:'이제 가도 ',right:'돼요',wrong:'되요',tip:'‘되어요’를 줄이면 ‘돼요’예요.'},
 {before:'나도 ',right:'할 수',wrong:'할수',after:' 있어요',tip:'‘수’는 앞말과 띄어 써요.'},
 {before:'어디 가요',right:'?',wrong:'!',tip:'묻는 문장 끝에는 물음표를 붙여요.',punct:true}
];
function renderSpelling(){const q=spellRounds[state.round];missionText.textContent='간판에서 이상한 곳을 고쳐 주세요!';missionSub.textContent=state.round<2?'ㅅ과 ㅆ처럼 비슷한 글자도 천천히 비교해요.':'맞춤법·띄어쓰기·문장부호를 하나씩 고쳐요.';say(`${q.before}${q.right}${q.after||''}. 알맞은 것을 골라 주세요.`);const shop=document.createElement('div');shop.className='repair-shop';const helper=document.createElement('div');helper.className='repair-friend';helper.innerHTML='<img src="assets/friend-ti.png" alt="">';const wrap=document.createElement('div');wrap.className='sign-wrap';const sign=document.createElement('div');sign.className='broken-sign';sign.innerHTML=`${q.before}<b>?</b>${q.after||''}`;const choices=document.createElement('div');choices.className='repair-choices';const tip=document.createElement('div');tip.className='repair-tip';shuffle([q.right,q.wrong]).forEach(w=>{const b=document.createElement('button');b.className='repair-choice';b.textContent=w;b.onclick=()=>{if(state.lock)return;if(w===q.right){state.lock=true;b.classList.add('correct');sign.classList.add('fixed');sign.innerHTML=`${q.before}<b>${q.right}</b>${q.after||''}`;tip.textContent=q.tip;sfx('ok');addSeeds(10);rewardAt(b);flash('간판 수리 완료! ✨');later(()=>nextRound(0),1050)}else{b.classList.add('wrong');sfx('no');tip.textContent='두 모양을 다시 비교해봐요.';flash('조금만 더 살펴봐요.');later(()=>b.classList.remove('wrong'),430)}};choices.appendChild(b)});wrap.append(sign,choices,tip);shop.append(helper,wrap);area.appendChild(shop)}

$$('[data-open]').forEach(b=>b.addEventListener('click',()=>openPreview(b.dataset.open)));
$('#introStart').addEventListener('click',()=>{if(state.previewGame)startGame(state.previewGame)});
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
const subtopicByCategory={all:['all','condition','sequence','spacing','spelling','basicfind','focus','spacebasic'],visual:['all','condition','basicfind','focus'],memory:['all','sequence','focus'],literacy:['all','spacing','spelling'],language:['all'],space:['all','spacebasic'],life:['all']};
function applyLibraryFilters(){const allowed=subtopicByCategory[currentCategory]||['all'];if(!allowed.includes(currentSubtopic))currentSubtopic='all';subtopicTabs.forEach(b=>{const ok=allowed.includes(b.dataset.subtopic);b.hidden=!ok;b.classList.toggle('active',b.dataset.subtopic===currentSubtopic)});let visible=0;libraryCards.forEach(card=>{const cat=currentCategory==='all'||card.dataset.category===currentCategory,sub=currentSubtopic==='all'||card.dataset.subtopic===currentSubtopic,showCard=cat&&sub;card.hidden=!showCard;if(showCard)visible++});const empty=document.getElementById('emptyCategory');if(empty)empty.hidden=visible!==0}
categoryTabs.forEach(b=>b.addEventListener('click',()=>{currentCategory=b.dataset.category;currentSubtopic='all';categoryTabs.forEach(x=>x.classList.toggle('active',x===b));applyLibraryFilters()}));
subtopicTabs.forEach(b=>b.addEventListener('click',()=>{currentSubtopic=b.dataset.subtopic;subtopicTabs.forEach(x=>x.classList.toggle('active',x===b));applyLibraryFilters()}));
const mapToggle=document.getElementById('mapToggle'),miniWorld=document.getElementById('miniWorld');if(mapToggle&&miniWorld)mapToggle.addEventListener('click',()=>{const opening=miniWorld.hidden;miniWorld.hidden=!opening;mapToggle.textContent=opening?'🌿 정원 세계관 접기':'🌿 정원 세계관으로 한눈에 보기'});
applyLibraryFilters();


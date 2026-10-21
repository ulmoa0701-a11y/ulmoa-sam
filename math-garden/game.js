/* 모아의 숫자 숲 V2 — 아동 스스로 조작하는 놀이형 기초수학. 음성합성 사용 안 함. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const board=$('playfield'),note=$('status'),stageGrid=$('stageGrid');
const STAGES=[
 {id:'share',name:'간식 나눠 주기',goal:'일대일 대응',chapter:'숲속 간식'},
 {id:'glance',name:'한눈에 열매 찾기',goal:'작은 수량 알아차리기',chapter:'숲속 간식'},
 {id:'compare',name:'많은 쪽? 적은 쪽?',goal:'수량 비교',chapter:'숲속 간식'},
 {id:'count',name:'열매 수확하기',goal:'하나씩 세고 전체 이해',chapter:'숲속 간식'},
 {id:'numeral',name:'숫자 표지판',goal:'수량과 숫자 연결',chapter:'숫자 오솔길'},
 {id:'zero',name:'텅 빈 바구니',goal:'0의 의미',chapter:'숫자 오솔길'},
 {id:'path',name:'사라진 징검다리',goal:'수의 순서',chapter:'숫자 오솔길'},
 {id:'ten',name:'꽃잎 빈자리',goal:'5·10 구조와 수 만들기',chapter:'숫자 오솔길'},
 {id:'compose',name:'도토리 창고',goal:'전체와 부분',chapter:'도토리 작업장'},
 {id:'equal',name:'양쪽 똑같이',goal:'수량 맞추기',chapter:'도토리 작업장'},
 {id:'sum',name:'열매 기차',goal:'합치기',chapter:'도토리 작업장'},
 {id:'take',name:'다람쥐가 가져가요',goal:'덜어내기',chapter:'도토리 작업장'},
 {id:'pattern',name:'반짝 씨앗 길',goal:'규칙 반복',chapter:'모양 놀이터'},
 {id:'shapes',name:'모양 문 열기',goal:'기초 도형 구별',chapter:'모양 놀이터'},
 {id:'length',name:'길이가 다른 다리',goal:'길이 비교',chapter:'모양 놀이터'}
];
const CHAPTERS=[...new Set(STAGES.map(s=>s.chapter))];
const roundsPerStage=5,storageKey='moa-number-forest-v2';
let stats={};
try{const s=JSON.parse(localStorage.getItem(storageKey)||'{}');if(s&&typeof s==='object')stats=s}catch(_){}
const info=id=>{const x=stats[id];return x&&typeof x==='object'?x:{completed:0,clean:0,errors:0}};
let scene={stage:0,round:0,task:null,errors:0,hints:0,locked:false,started:false,sound:true,transition:0,idle:0,totalInStage:0,cleanInStage:0};
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1)),shuf=(l)=>l.map(x=>({x,r:Math.random()})).sort((a,b)=>a.r-b.r).map(x=>x.x);
const cap=(id,base=3,max=10)=>Math.min(max,Math.max(base,base+Math.floor(info(id).clean/5)-Math.floor(info(id).errors/12)));
const dots=n=>'<span class="dots" aria-label="'+n+'개">'+Array.from({length:n},(_,i)=>'<i class="count-dot" aria-hidden="true"></i>').join('')+'</span>';
const fruit=(i,kind='acorn')=>'<span class="new-fruit '+kind+'" aria-hidden="true"><i></i></span>';
const fruits=(n,kind='acorn')=>Array.from({length:n},(_,i)=>fruit(i,kind)).join('');
const options=(n,min=0,max=10)=>{const a=new Set([n]);const near=shuf(Array.from({length:max-min+1},(_,i)=>i+min).filter(v=>v!==n).sort((x,y)=>Math.abs(x-n)-Math.abs(y-n)).slice(0,7));for(const v of near){a.add(v);if(a.size===3)break}return shuf([...a])};
const tiles=(arr,action='number')=>'<div class="number-options">'+arr.map(n=>'<button type="button" class="number-tile" data-act="'+action+'" data-n="'+n+'" aria-label="숫자 '+n+'">'+n+'</button>').join('')+'</div>';
const chars=['rabbit','bear','fox','frog','bird'];
const char=(i)=>'<svg class="character-sprite" viewBox="'+(i%5*150)+' 0 150 180" aria-hidden="true"><use href="./assets/woodland-friends.svg#'+chars[i%5]+'"/></svg>';
const touch=(act,label,inside,other='')=>'<button type="button" class="'+other+'" data-act="'+act+'" aria-label="'+label+'">'+inside+'</button>';
const basket=(inside,label='열매 바구니')=>'<div class="storybook-basket" role="img" aria-label="'+label+'"><div class="basket-rim"></div><div class="basket-inside">'+inside+'</div></div>';
const center=(inner)=>'<div class="storybook-scene">'+inner+'</div>';
const stamp=(text)=>'<span class="wood-label">'+text+'</span>';
const build=(total,filled)=>'<div class="tenframe" aria-label="전체 '+total+'자리 중 '+filled+'자리 찼어요">'+Array.from({length:total},(_,i)=>'<span class="ten-cell '+(i<filled?'cell-filled':'')+'">'+(i<filled?fruit(i):'')+'</span>').join('')+'</div>';
function setMessage(t,cl=''){note.textContent=t;note.className='status '+cl}
function guide(t){$('guideKicker').textContent=STAGES[scene.stage].chapter;$('guideText').textContent=t}
function fx(){if(!scene.sound)return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;let c=window.__moaPlayAudio||(window.__moaPlayAudio=new Audio());c.resume?.();const o=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter(),now=c.currentTime;o.type='sine';o.frequency.setValueAtTime(440,now);o.frequency.exponentialRampToValueAtTime(520,now+.065);f.type='lowpass';f.frequency.value=900;g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.035,now+.015);g.gain.exponentialRampToValueAtTime(.0001,now+.14);o.connect(f);f.connect(g);g.connect(c.destination);o.start(now);o.stop(now+.15)}catch(_){}}
function save(id){let v=info(id);stats[id]={completed:v.completed+1,clean:v.clean+scene.cleanInStage,errors:v.errors+Math.max(0,scene.totalInStage-scene.cleanInStage)};try{localStorage.setItem(storageKey,JSON.stringify(stats))}catch(_){}}
function showSeeds(){$('seedProgress').innerHTML=Array.from({length:roundsPerStage},(_,i)=>'<span class="seed '+(i<scene.round?'filled':'')+'"></span>').join('');$('seedProgress').setAttribute('aria-label','진행 '+scene.round+'/'+roundsPerStage)}
function map(){
 stageGrid.innerHTML=CHAPTERS.map((ch,k)=>'<section class="map-chapter"><h3>'+ch+'</h3><div class="map-doors">'+STAGES.map((s,i)=>s.chapter===ch?'<button data-act="choose" data-i="'+i+'" class="stage-select '+(scene.started&&scene.stage===i?'active':'')+'" type="button"><span class="number">'+(i+1)+'</span><strong>'+s.name+'</strong></button>':'').join('')+'</div></section>').join('')
}
function updateStage(){scene.locked=false;$('stageName').textContent=STAGES[scene.stage].name;$('hintButton').hidden=false;$('restartButton').hidden=false;showSeeds();map()}
function start(i){
 if(scene.transition)clearTimeout(scene.transition);if(scene.idle)clearTimeout(scene.idle);
 scene={...scene,stage:i,round:0,task:null,errors:0,hints:0,locked:false,started:true,totalInStage:0,cleanInStage:0,transition:0,idle:0};
 $('stagePanel').hidden=true;$('stageToggle').setAttribute('aria-expanded','false');updateStage();round()
}
function getTask(){
 const m=STAGES[scene.stage].id,n=cap(m,3,9);
 let q={mode:m,prompt:''};
 if(m==='share'){q.n=rnd(2,Math.min(5,n));q.fed=[];q.prompt='배고픈 친구에게 하나씩'}
 if(m==='glance'){q.n=rnd(1,Math.min(5,n));q.opts=options(q.n,1,6);q.prompt='반짝 열매는 몇 개?'}
 if(m==='compare'){q.a=rnd(1,n);q.b=rnd(1,n);if(q.a===q.b)q.b=q.a===n?q.a-1:q.a+1;q.want=Math.random()<.5?'more':'less';q.right=q.want==='more'?(q.a>q.b?'a':'b'):(q.a<q.b?'a':'b');q.prompt=q.want==='more'?'열매가 더 많은 쪽':'열매가 더 적은 쪽'}
 if(m==='count'){q.n=rnd(2,n);q.picked=[];q.prompt='열매를 모두 수확해요'}
 if(m==='numeral'){q.n=rnd(1,n);q.opts=options(q.n,1,Math.max(6,n));q.prompt='열매에 맞는 숫자'}
 if(m==='zero'){q.n=rnd(0,2);q.opts=shuf([0,1,2]);q.prompt='바구니에 몇 개 있을까?'}
 if(m==='path'){q.from=rnd(0,Math.max(1,n-3));q.missing=rnd(1,3);q.n=q.from+q.missing;q.opts=options(q.n,0,Math.max(6,n+3));q.prompt='없어진 숫자 징검다리'}
 if(m==='ten'){q.n=rnd(3,Math.min(10,n+2));q.have=rnd(1,q.n-1);q.added=0;q.advanced=info(m).clean>=4;q.opts=options(q.n-q.have,1,Math.min(9,q.n));q.prompt='꽃잎 빈자리 채우기'}
 if(m==='compose'){q.n=rnd(3,Math.min(10,n+2));q.have=rnd(1,q.n-1);q.added=0;q.advanced=info(m).clean>=4;q.opts=options(q.n-q.have,1,Math.min(9,q.n));q.prompt='창고에 모자란 열매'}
 if(m==='equal'){q.n=rnd(3,Math.min(10,n+2));q.have=rnd(1,q.n-1);q.added=0;q.advanced=info(m).clean>=4;q.opts=options(q.n-q.have,1,Math.min(9,q.n));q.prompt='양쪽을 똑같이'}
 if(m==='sum'){q.a=rnd(1,Math.max(2,Math.floor(n/2)+1));q.b=rnd(1,Math.max(2,Math.floor(n/2)+1));q.n=q.a+q.b;q.opts=options(q.n,2,Math.min(12,n+3));q.prompt='모두 합치면 몇 개?'}
 if(m==='take'){q.n=rnd(3,Math.min(10,n+2));q.take=rnd(1,q.n-1);q.gone=[];q.opts=options(q.n-q.take,0,Math.max(8,n+1));q.answering=false;q.prompt='다람쥐가 가져갈 열매'}
 if(m==='pattern'){q.a=Math.random()<.5?'berry':'gold';q.b=q.a==='berry'?'gold':'berry';q.answer=Math.random()<.5?q.a:q.b;q.seq=Array.from({length:5},(_,i)=>[q.a,q.b][(i+(q.answer===q.a?1:0))%2]);q.answer=q.seq[4];q.prompt='다음에 올 씨앗은?'}
 if(m==='shapes'){q.n=rnd(0,2);q.opts=shuf(['circle','triangle','square']);q.prompt='나무 문에 맞는 모양'}
 if(m==='length'){q.a=rnd(100,182);q.b=rnd(205,290);if(Math.random()<.5)[q.a,q.b]=[q.b,q.a];q.want=Math.random()<.5?'long':'short';q.right=q.want==='long'?(q.a>q.b?'a':'b'):(q.a<q.b?'a':'b');q.prompt=q.want==='long'?'더 긴 다리를 골라요':'더 짧은 다리를 골라요'}
 return q
}
function round(){scene.errors=0;scene.hints=0;scene.locked=false;scene.task=getTask();updateStage();guide(scene.task.prompt);draw();setMessage('');scene.idle=setTimeout(()=>{if(!scene.locked)hint(true)},8500)}
function draw(){
 const q=scene.task;if(!q)return;
 const key=q.mode,which=(v,n)=>'<div class="food-plate">'+dots(n)+'</div>';
 const scenes={
 share:()=>center('<div class="friend-porch">'+Array.from({length:q.n},(_,i)=>touch('feed','친구 '+(i+1)+'에게 열매 주기',char(i)+'<span class="mini-plate">'+(q.fed.includes(i)?fruit(i):'<span class="plate-empty"></span>')+'</span>','friend-card '+(q.fed.includes(i)?'fed':'')) .replace('data-act="feed"','data-act="feed" data-i="'+i+'" '+(q.fed.includes(i)?'disabled':''))).join('')+'</div>'+basket(fruits(q.n-q.fed.length),'남은 열매 '+(q.n-q.fed.length)+'개')),
 glance:()=>center('<div class="display-gem">'+dots(q.n)+'</div>'+tiles(q.opts)),
 compare:()=>center('<div class="fork-choice">'+['a','b'].map(key=>touch('compare',key==='a'?'왼쪽 '+q.a+'개':'오른쪽 '+q.b+'개','<span class="island-cluster">'+dots(q[key])+'</span><span class="island-edge"></span>','island-choice').replace('data-act="compare"','data-act="compare" data-key="'+key+'"')).join('')+'</div>'),
 count:()=>center('<div class="harvest-yard"><div class="harvest-patch">'+Array.from({length:q.n},(_,i)=>touch('pick','열매 '+(i+1)+' 수확하기',fruit(i),'harvest-btn '+(q.picked.includes(i)?'collected':'' )).replace('data-act="pick"','data-act="pick" data-i="'+i+'" '+(q.picked.includes(i)?'disabled':''))).join('')+'</div>'+basket('<span class="basket-number">'+q.picked.length+'</span>'+fruits(q.picked.length),'수확한 열매 '+q.picked.length+'개')+'</div>'),
 numeral:()=>center('<div class="display-gem">'+dots(q.n)+'</div>'+tiles(q.opts)),
 zero:()=>center(basket(fruits(q.n),'열매 '+q.n+'개')+tiles(q.opts,'zero')),
 path:()=>center('<div class="number-path">'+Array.from({length:5},(_,i)=>i===q.missing?'<span class="missing-stone">?</span>':'<span class="path-stone">'+(q.from+i)+'</span>').join('')+'</div>'+tiles(q.opts,'path')),
 ten:()=>center(stamp(q.n+'칸 꽃밭')+build(q.n,q.have+q.added)+(q.advanced?tiles(q.opts,'build'):'<div class="action-pad">'+touch('add','씨앗 한 개 더 심기',fruit(0)+'<span>한 개 심기</span>','tap-add')+'</div>')),
 compose:()=>center(stamp(q.n+'개 모아야 해요')+build(q.n,q.have+q.added)+(q.advanced?tiles(q.opts,'build'):'<div class="action-pad">'+touch('add','도토리 한 개 더하기',fruit(0)+'<span>한 개 놓기</span>','tap-add')+'</div>')),
 equal:()=>center('<div class="equal-mats"><div class="equal-mat">'+dots(q.n)+'</div><div class="equal-mat">'+dots(q.have+q.added)+'</div></div>'+(q.advanced?tiles(q.opts,'build'):'<div class="action-pad">'+touch('add','오른쪽에 열매 한 개 더하기',fruit(0)+'<span>한 개 놓기</span>','tap-add')+'</div>')),
 sum:()=>center('<div class="two-baskets">'+basket(fruits(q.a),'첫 바구니 '+q.a+'개')+'<span class="math-operator">+</span>'+basket(fruits(q.b),'두 번째 바구니 '+q.b+'개')+'</div>'+tiles(q.opts,'sum')),
 take:()=>center('<div class="take-scene"><div class="take-garden">'+Array.from({length:q.n},(_,i)=>touch('takepick','열매 '+(i+1)+' 가져가기',fruit(i),'harvest-btn '+(q.gone.includes(i)?'collected':'' )).replace('data-act="takepick"','data-act="takepick" data-i="'+i+'" '+(q.gone.includes(i)?'disabled':''))).join('')+'</div><span class="take-indicator">'+fruit(0)+'<b>× '+q.take+'</b></span></div>'+(q.answering?tiles(q.opts,'takeanswer'):'<div class="tiny-visual-guide">'+stamp('열매 '+q.take+'개를 다람쥐에게 주세요')+'</div>')),
 pattern:()=>center('<div class="pattern-track">'+q.seq.slice(0,4).map(x=>'<span class="pattern-pocket">'+fruit(0,x)+'</span>').join('')+'<span class="pattern-pocket pattern-hole">?</span></div><div class="seed-choice-row">'+['berry','gold'].map(kind=>touch('pattern','이 씨앗을 다음 자리에 넣기',fruit(0,kind),'seed-choice').replace('data-act="pattern"','data-act="pattern" data-kind="'+kind+'"')).join('')+'</div>'),
 shapes:()=>center('<div class="shape-lock">'+shape(q.opts[q.n])+'</div><div class="shape-options">'+q.opts.map((x,i)=>touch('shape','모양 '+x+' 선택',shape(x),'shape-choice').replace('data-act="shape"','data-act="shape" data-kind="'+x+'"')).join('')+'</div>'),
 length:()=>center('<div class="bridge-options">'+['a','b'].map(key=>touch('length',(key==='a'?'왼':'오른')+'쪽 다리','<span class="bridge-road" style="width:'+q[key]+'px"><span></span></span>','bridge-choice').replace('data-act="length"','data-act="length" data-key="'+key+'"')).join('')+'</div>')
 };
 board.innerHTML=(scenes[key]||scenes.share)();
}
function shape(which){const bodies={circle:'<circle cx="55" cy="55" r="34"/>',triangle:'<path d="M55 17L93 88H17Z"/>',square:'<rect x="20" y="20" width="70" height="70" rx="9"/>'};return '<svg class="shape-svg" viewBox="0 0 110 110" role="img" aria-label="'+which+'">'+bodies[which]+'</svg>'}
function hint(quiet=false){
 if(scene.locked||!scene.task)return;scene.hints++;
 board.querySelectorAll('.coach-target').forEach(x=>x.classList.remove('coach-target'));
 const q=scene.task;
 let query={
 share:'.friend-card:not([disabled])',glance:'.number-tile[data-n="'+q.n+'"]',
 compare:'.island-choice[data-key="'+q.right+'"]',count:'.harvest-btn:not([disabled])',numeral:'.number-tile[data-n="'+q.n+'"]',
 zero:'.number-tile[data-n="'+q.n+'"]',path:'.number-tile[data-n="'+q.n+'"]',
 ten:q.advanced?'.number-tile[data-n="'+(q.n-q.have)+'"]':'.tap-add',
 compose:q.advanced?'.number-tile[data-n="'+(q.n-q.have)+'"]':'.tap-add',
 equal:q.advanced?'.number-tile[data-n="'+(q.n-q.have)+'"]':'.tap-add',
 sum:'.number-tile[data-n="'+q.n+'"]',
 take:q.answering?'.number-tile[data-n="'+(q.n-q.take)+'"]':'.harvest-btn:not([disabled])',
 pattern:'.seed-choice[data-kind="'+q.answer+'"]',shapes:'.shape-choice[data-kind="'+(q.opts?.[q.n]??'')+'"]',length:'.bridge-choice[data-key="'+q.right+'"]'
 }[q.mode];
 const el=board.querySelector(query);if(el)el.classList.add('coach-target');
 if(!quiet)setMessage('빛나는 곳을 살펴봐요');
}
function mistake(){scene.errors++;setMessage('천천히 다시 살펴볼까?','try');if(scene.errors>=2)hint()}
function good(){
 if(scene.locked)return;scene.locked=true;if(scene.idle)clearTimeout(scene.idle);
 scene.round++;scene.totalInStage++;if(!scene.hints&&!scene.errors)scene.cleanInStage++;
 fx();showSeeds();setMessage('숲에 꽃이 한 송이 피었어요','win');
 board.innerHTML='<div class="storybook-reward"><div class="petal-bloom" aria-hidden="true"><span></span><span></span><span></span><span></span><i></i></div><p>다음 숲길이 열려요</p></div>';
 if(scene.round===roundsPerStage){save(STAGES[scene.stage].id);scene.transition=setTimeout(stageEnd,1000)}
 else scene.transition=setTimeout(round,850)
}
function stageEnd(){scene.transition=0;const next=(scene.stage+1)%STAGES.length;guide('꽃길이 이어졌어요!');
 board.innerHTML='<div class="storybook-finish"><div class="finish-forest"><div class="flower-coin"></div>'+char(2)+'</div><h2>'+STAGES[scene.stage].name+'</h2><p>꽃 한 송이를 피웠어요</p><div class="finish-actions">'+touch('next','다음 놀이','다음 숲길 →','primary-button')+touch('again','같은 놀이 반복','한 번 더','secondary-button')+'</div></div>';
 setMessage('천천히 다시 놀아도 좋아요');
}
function doneOrRender(){if(scene.task.added+scene.task.have>=scene.task.n)good();else{draw();fx()}}
function act(k,b){
 if(k==='choose'){start(Number(b.dataset.i));return}
 if(k==='next'){start((scene.stage+1)%STAGES.length);return}
 if(k==='again'){start(scene.stage);return}
 if(scene.locked||!scene.task)return;const q=scene.task;
 if(scene.idle){clearTimeout(scene.idle);scene.idle=0}
 if(k==='feed'){const n=Number(b.dataset.i);if(q.fed.includes(n))return;q.fed.push(n);if(q.fed.length>=q.n)good();else{draw();fx()}}
 if(k==='compare'||k==='length'){if(b.dataset.key===q.right)good();else mistake()}
 if(k==='glance'||k==='number'||k==='zero'||k==='path'||k==='sum'||k==='takeanswer'){const n=Number(b.dataset.n),answer=q.mode==='take'?q.n-q.take:q.n;if(n===answer)good();else mistake()}
 if(k==='pick'){const n=Number(b.dataset.i);if(q.picked.includes(n))return;q.picked.push(n);if(q.picked.length===q.n)good();else{draw();fx()}}
 if(k==='add'){q.added++;doneOrRender()}
 if(k==='build'){if(Number(b.dataset.n)===q.n-q.have)good();else mistake()}
 if(k==='takepick'){const n=Number(b.dataset.i);if(q.gone.includes(n))return;q.gone.push(n);if(q.gone.length===q.take){q.answering=true;draw();fx();setMessage('몇 개가 남았을까?')}else{draw();fx()}}
 if(k==='pattern'){if(b.dataset.kind===q.answer)good();else mistake()}
 if(k==='shape'){if(b.dataset.kind===q.opts[q.n])good();else mistake()}
 if(!scene.locked&&!scene.idle)scene.idle=setTimeout(()=>hint(true),8500)
}
board.addEventListener('click',e=>{if(e.target.closest('#startButton')){start(0);return}const b=e.target.closest('[data-act]');if(b)act(b.dataset.act,b)});
stageGrid.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(b)act(b.dataset.act,b)});
$('stageToggle').addEventListener('click',()=>{const v=$('stagePanel');v.hidden=!v.hidden;$('stageToggle').setAttribute('aria-expanded',String(!v.hidden));map()});
$('soundToggle').addEventListener('click',()=>{scene.sound=!scene.sound;$('soundToggle').textContent=scene.sound?'효과음 켜짐':'효과음 꺼짐';$('soundToggle').setAttribute('aria-pressed',String(scene.sound))});
$('hintButton').addEventListener('click',()=>hint());
$('restartButton').addEventListener('click',()=>start(scene.stage));
$('hearButton').addEventListener('click',()=>hint());
$('hearButton').setAttribute('aria-label','그림 힌트 보기');$('hearButton').title='그림 힌트 보기';
$('hearButton').innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13c2-3 4-4 8-4s7 1 9 4c-2 4-5 6-9 6s-7-2-8-6Z"/><circle cx="12" cy="13" r="2.5"/></svg>';
$('soundToggle').textContent='효과음 켜짐';
map();showSeeds();guide('누르면 바로 놀이 시작!');
Object.defineProperty(window,'__numberForestQA',{configurable:false,value:{getState:()=>({stage:scene.stage,round:scene.round,mode:scene.task?.mode,locked:scene.locked,errors:scene.errors,hints:scene.hints}),getTask:()=>scene.task?JSON.parse(JSON.stringify(scene.task)):null,getStats:()=>JSON.parse(JSON.stringify(stats)),stages:()=>STAGES.map(s=>s.id)}});
})();
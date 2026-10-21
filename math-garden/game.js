/* 모아의 숫자 숲. 개인정보 수집·외부 호출 없는 독립형 수량 놀이. */
(() => {
'use strict';
const $ = (id) => document.getElementById(id);
const world = $('playfield'), info = $('status');
const stages = [
  {id:'share',name:'숲속 간식',short:'한 친구에게 하나씩',focus:'일대일 대응'},
  {id:'compare',name:'열매 많은 쪽',short:'어느 쪽이 더 많을까?',focus:'수량 비교'},
  {id:'count',name:'열매 수확',short:'하나씩 바구니에 담기',focus:'하나씩 세기'},
  {id:'numeral',name:'숫자 표지판',short:'열매 수와 숫자 잇기',focus:'수량·숫자 연결'},
  {id:'compose',name:'빈자리 채우기',short:'모자란 만큼 채워요',focus:'수의 구성'},
  {id:'equal',name:'같은 만큼 나누기',short:'양쪽에 똑같이!',focus:'수량 관계'},
  {id:'sum',name:'열매 기차',short:'함께 모으면 몇 개?',focus:'덧셈 기초'}
];
const roundsPerStage = 4;
const memoryKey='moa-number-forest-v1';
let stored={};
try { const s=JSON.parse(localStorage.getItem(memoryKey)||'{}');if(s&&typeof s==='object'&&!Array.isArray(s))stored=s } catch(_) {}
const progress={};
stages.forEach(s=>progress[s.id]=Math.max(0,Math.min(100,Number(stored[s.id])||0)));
const state={stage:0,round:0,game:null,errors:0,hints:0,locked:false,started:false,sound:true,nextTimeout:null};
const rng=(min,max)=>min+Math.floor(Math.random()*(max-min+1));
const shuffle=(items)=>{const a=items.slice();for(let i=a.length-1;i>0;i--){const j=rng(0,i);[a[i],a[j]]=[a[j],a[i]]}return a};
const cap=(stageId,low=2,high=6)=>Math.min(high,low+Math.floor(progress[stageId]/4));
const dot=(i)=>'<span class="dot" aria-hidden="true"></span>';
const dots=(n)=>'<div class="dots" aria-hidden="true">'+Array.from({length:n},(_,i)=>dot(i)).join('')+'</div>';
const fruit=(i)=>'<span class="fruit '+(i%4===1?'blue':i%4===2?'gold':'')+'" aria-hidden="true"></span>';
const fruits=(n)=>Array.from({length:n},(_,i)=>fruit(i)).join('');
const slots=(total,filled)=>Array.from({length:total},(_,i)=>'<span class="empty-slot '+(i<filled?'slot-full':'')+'" aria-hidden="true"></span>').join('');
function message(text,kind=''){info.textContent=text;info.className='status '+kind}
function guide(kicker,text){$('guideKicker').textContent=kicker;$('guideText').textContent=text}
function promptFor(){if(!state.started)return '숲속 친구들이 기다리고 있어. 출발 버튼을 눌러 줘.';const g=state.game;if(!g)return '어느 숲으로 놀러 갈까?';return g.voice||g.prompt}
function talk(text){if(!state.sound||!('speechSynthesis' in window))return;try{window.speechSynthesis.cancel();const utter=new SpeechSynthesisUtterance(text);utter.lang='ko-KR';utter.rate=.9;utter.pitch=1.05;utter.volume=.95;window.speechSynthesis.speak(utter)}catch(_){}}
function ding(){if(!state.sound)return;try{let ctx=window.__moaAudio;if(!ctx){const API=window.AudioContext||window.webkitAudioContext;if(!API)return;ctx=window.__moaAudio=new API()}if(ctx.state==='suspended')ctx.resume().catch(()=>{});for(let k=0;k<2;k++){const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+k*.12;o.type='sine';o.frequency.setValueAtTime([587.33,783.99][k],t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.065,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.27);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.28)}}catch(_){}}
function saveProgress(id){progress[id]=(progress[id]||0)+1;try{localStorage.setItem(memoryKey,JSON.stringify(progress))}catch(_){}}
function stagePanel(){
 $('stageGrid').innerHTML=stages.map((s,i)=>'<button type="button" class="stage-select '+(state.started&&state.stage===i?'active':'')+'" data-action="choose" data-stage="'+i+'" aria-label="'+(i+1)+'번째 놀이: '+s.name+'"><span class="number">'+(i+1)+'</span><strong>'+s.name+'</strong></button>').join('');
}
function seeds(){const p=$('seedProgress');p.innerHTML=Array.from({length:roundsPerStage},(_,i)=>'<span class="seed '+(i<state.round?'filled':'')+'" aria-hidden="true"></span>').join('');p.setAttribute('aria-label',roundsPerStage+'번 중 '+state.round+'번 완료')}
function beginStage(index){
 if(state.nextTimeout){clearTimeout(state.nextTimeout);state.nextTimeout=null}
 if('speechSynthesis' in window)try{window.speechSynthesis.cancel()}catch(_){}
 state.started=true;state.stage=index;state.round=0;state.locked=false;state.errors=0;state.hints=0;
 $('restartButton').hidden=false;$('hintButton').hidden=false;$('stageName').textContent=stages[index].name;
 $('stagePanel').hidden=true;$('stageToggle').setAttribute('aria-expanded','false');stagePanel();newRound()
}
function chooseDistinct(max){
 const a=rng(1,max);let b=rng(1,max);if(a===b)b=a===max?a-1:a+1;return [a,b]
}
function choices(target,max=9){const out=new Set([target]);const pool=shuffle(Array.from({length:max},(_,i)=>i+1).filter(x=>x!==target).sort((a,b)=>Math.abs(a-target)-Math.abs(b-target)).slice(0,5));for(const n of pool){if(out.size>=3)break;out.add(n)}return shuffle([...out])}
function newRound(){
 state.errors=0;state.hints=0;state.locked=false;
 const s=stages[state.stage],max=cap(s.id,3,6);let g={mode:s.id,prompt:'',voice:''};
 switch(s.id){
 case 'share':g.n=rng(2,Math.min(5,max+1));g.fed=[];g.prompt='친구마다 열매 하나씩!';g.voice='친구에게 열매를 하나씩 나눠 줘. 먹지 못한 친구를 눌러 봐.';break;
 case 'compare':{const [a,b]=chooseDistinct(Math.max(3,max));g.a=a;g.b=b;g.side=a>b?'left':'right';g.prompt='열매가 더 많은 쪽은?';g.voice='어느 쪽 열매가 더 많을까? 많은 쪽을 눌러 줘.';break}
 case 'count':g.n=rng(2,Math.min(6,max+1));g.picked=[];g.prompt='열매를 하나씩 모아 줘!';g.voice='열매를 하나씩 눌러 바구니에 담아 보자.';break;
 case 'numeral':g.n=rng(1,Math.max(3,max));g.opts=choices(g.n,Math.max(5,max));g.prompt='같은 수의 숫자 표지판을 찾아!';g.voice='열매가 몇 개일까? 똑같은 숫자 표지판을 눌러 봐.';break;
 case 'compose':g.target=rng(3,Math.max(4,max+1));g.left=rng(1,g.target-1);g.right=0;g.prompt='빈자리를 열매로 채워 줘!';g.voice='비어 있는 자리에 열매를 하나씩 더해서 모두 채워 줘.';break;
 case 'equal':g.target=rng(2,Math.max(3,max));g.left=g.target;g.right=rng(1,g.target-1);g.prompt='양쪽 열매를 똑같이!';g.voice='양쪽이 똑같이 되도록 오른쪽에 열매를 더해 줘.';break;
 case 'sum':g.a=rng(1,Math.max(2,Math.ceil(max/2)));g.b=rng(1,Math.max(2,Math.floor(max/2)));g.total=g.a+g.b;g.opts=choices(g.total,Math.max(6,max+2));g.prompt='두 바구니를 합치면 몇 개?';g.voice='두 바구니의 열매를 함께 모으면 몇 개일까? 숫자 문을 열어 봐.';break;
 }
 state.game=g;$('stageName').textContent=s.name;seeds();render();
 message('숲에서 '+(state.round+1)+'번째 놀이 중');talk(g.voice)
}
function friend(color,index,fed){return '<button type="button" class="friend-card '+(fed?'fed':'')+'" data-action="feed" data-index="'+index+'" '+(fed?'disabled':'')+' aria-label="'+(index+1)+'번째 친구'+(fed?', 열매 받음':', 열매 주기')+'"><span class="animal" style="--fur:'+color+'"><span class="face"><i></i><i></i></span><span class="nose"></span></span><span class="plate">'+(fed?fruit(index):'')+'</span></button>'}
function render(){
 const g=state.game;if(!g)return;guide(stages[state.stage].name,g.prompt);const html={
  share:()=>'<div class="scenario"><p class="scene-heading">빈 접시를 눌러 간식 배달</p><div class="friends">'+Array.from({length:g.n},(_,i)=>friend(['#dcae85','#b3b9dd','#ddb0a1','#c2c88d','#acbca2'][i],i,g.fed.includes(i))).join('')+'</div><div class="supply-tray" aria-label="준비된 열매">'+fruits(g.n-g.fed.length)+'</div></div>',
  compare:()=>'<div class="scenario"><p class="scene-heading">두 곳을 살펴보자!</p><div class="choice-row"><button type="button" class="choice-island" data-action="compare" data-side="left" aria-label="왼쪽, 열매 '+g.a+'개">'+dots(g.a)+'<span class="island-base"></span></button><button type="button" class="choice-island" data-action="compare" data-side="right" aria-label="오른쪽, 열매 '+g.b+'개">'+dots(g.b)+'<span class="island-base"></span></button></div></div>',
  count:()=>'<div class="scenario"><p class="scene-heading">열매를 톡톡 눌러 담아요</p><div class="count-scene"><div class="count-crops">'+Array.from({length:g.n},(_,i)=>'<button type="button" class="crop-btn '+(g.picked.includes(i)?'picked':'')+'" '+(g.picked.includes(i)?'disabled':'')+' data-action="pick" data-index="'+i+'" aria-label="'+(i+1)+'번째 열매 담기">'+fruit(i)+'</button>').join('')+'</div><div class="basket" aria-label="바구니에 '+g.picked.length+'개 담음"><strong class="big-count">'+g.picked.length+'</strong><span class="collected">'+fruits(g.picked.length)+'</span></div></div></div>',
  numeral:()=>'<div class="scenario"><p class="scene-heading">이 열매들은 몇 개?</p><div class="target-dots" role="img" aria-label="열매 '+g.n+'개">'+dots(g.n)+'</div><div class="number-options">'+g.opts.map(n=>'<button type="button" class="number-tile" data-action="number" data-value="'+n+'" aria-label="숫자 '+n+'">'+n+'</button>').join('')+'</div></div>',
  compose:()=>'<div class="scenario"><p class="scene-heading">나무 판에 빈자리만큼 열매 담기</p><div class="build-total" aria-label="총 '+g.target+'칸 중 '+(g.left+g.right)+'칸 채워짐">'+slots(g.target,g.left+g.right)+'</div><div class="build-scene"><div class="building"><strong>이미 온 열매</strong>'+dots(g.left)+'</div><div class="building"><strong>내가 더한 열매</strong>'+dots(g.right)+'</div></div><div class="action-pad"><button class="tap-add" type="button" data-action="add" aria-label="열매 한 개 더하기">열매 하나 더 <span aria-hidden="true">＋</span></button></div></div>',
  equal:()=>'<div class="scenario"><p class="scene-heading">오른쪽에도 똑같이 담아 줘</p><div class="build-scene"><div class="building"><strong>왼쪽</strong>'+dots(g.left)+'</div><div class="building"><strong>오른쪽</strong>'+dots(g.right)+'</div></div><div class="build-total">'+slots(g.target,g.right)+'</div><div class="action-pad"><button class="tap-add" type="button" data-action="equal" aria-label="오른쪽 바구니에 열매 하나 더하기">열매 하나 더 <span aria-hidden="true">＋</span></button></div></div>',
  sum:()=>'<div class="scenario"><p class="scene-heading">열매를 모두 모아 문을 열어 줘</p><div class="pair-scene"><div class="pair-mat" aria-label="열매 '+g.a+'개">'+dots(g.a)+'</div><span class="pair-plus" aria-hidden="true">＋</span><div class="pair-mat" aria-label="열매 '+g.b+'개">'+dots(g.b)+'</div></div><div class="number-options">'+g.opts.map(n=>'<button type="button" class="number-tile" data-action="sum" data-value="'+n+'" aria-label="숫자 '+n+'">'+n+'</button>').join('')+'</div></div>'
 }[g.mode]();
 world.innerHTML=html
}
function help(){
 if(state.locked||!state.game)return;
 const g=state.game;world.querySelectorAll('.coach-target').forEach(el=>el.classList.remove('coach-target'));
 let selector='';
 if(g.mode==='share')selector='.friend-card:not(:disabled)';
 else if(g.mode==='compare')selector='.choice-island[data-side="'+g.side+'"]';
 else if(g.mode==='count')selector='.crop-btn:not(:disabled)';
 else if(g.mode==='numeral')selector='.number-tile[data-value="'+g.n+'"]';
 else if(g.mode==='compose')selector='[data-action=add]';
 else if(g.mode==='equal')selector='[data-action=equal]';
 else if(g.mode==='sum')selector='.number-tile[data-value="'+g.total+'"]';
 const target=world.querySelector(selector);if(target)target.classList.add('coach-target');
 state.hints++;message('빛나는 곳을 살펴봐!');talk('빛나는 곳을 눌러 봐.')
}
function retry(){state.errors++;message(state.errors>=2?'빛나는 곳이 단서야!':'다른 쪽도 살펴볼까?','try');if(state.errors>=2)help()}
function completeRound(){
 if(state.locked)return;state.locked=true;ding();if('speechSynthesis' in window)try{window.speechSynthesis.cancel()}catch(_){}
 state.round++;seeds();message('친구가 웃고 있어! 다음 놀이가 이어져.','win');
 const last=state.round>=roundsPerStage;
 const words=['좋아, 길이 열렸어!','친구들이 기뻐해!','한 걸음 더 왔어!','숲이 환해졌어!'];
 guide('모아의 숫자 숲',last?'한 곳을 모두 탐험했어!':'숲길이 조금 더 열렸어!');
 world.innerHTML='<div class="round-done"><div class="reward-flower" aria-hidden="true">✓</div><h2>'+words[(state.round-1)%words.length]+'</h2><p>'+(last?'다음 숲길도 열려 있어.':'새로운 열매가 기다리고 있어!')+'</p></div>';
 talk(last?'멋져. 다음 숲길도 탐험할 수 있어.':'좋아! 다음에도 해 보자.');
 if(last){saveProgress(stages[state.stage].id);state.nextTimeout=setTimeout(showStageComplete,1100)}
 else{state.nextTimeout=setTimeout(newRound,1050)}
}
function showStageComplete(){
 state.nextTimeout=null;seeds();
 const next=(state.stage+1)%stages.length;
 const allDone=state.stage===stages.length-1;
 guide('숲속 꽃이 피었어!',allDone?'원하는 숲길을 다시 골라 봐!':'다음 숲길이 기다리고 있어!');
 world.innerHTML='<div class="stage-done"><div class="reward-flower" aria-hidden="true">✓</div><h2>'+stages[state.stage].name+' 탐험 성공!</h2><p>숲에 새로운 꽃이 피었어.</p><div class="complete-actions"><button type="button" class="primary-button" data-action="next">'+(allDone?'처음 숲부터 다시':'다음 숲길로')+' →</button><button type="button" class="secondary-button" data-action="again">이 놀이 또 하기</button></div></div>';
 message('다른 놀이를 눌러 자유롭게 이동할 수도 있어.','win')
}
function perform(action,el){
 if(action==='choose'){beginStage(Number(el.dataset.stage));return}
 if(action==='next'){beginStage((state.stage+1)%stages.length);return}
 if(action==='again'){beginStage(state.stage);return}
 if(state.locked||!state.game)return;
 const g=state.game;
 switch(action){
 case 'feed':{const i=Number(el.dataset.index);if(g.fed.includes(i))return;g.fed.push(i);if(g.fed.length===g.n)completeRound();else{render();message('한 친구가 열매를 받았어.');ding()}break}
 case 'compare':if(el.dataset.side===g.side)completeRound();else retry();break;
 case 'pick':{const i=Number(el.dataset.index);if(g.picked.includes(i))return;g.picked.push(i);if(g.picked.length===g.n)completeRound();else{render();message(g.picked.length+'개 담았어!');ding()}break}
 case 'number':if(Number(el.dataset.value)===g.n)completeRound();else retry();break;
 case 'add':g.right++;if(g.left+g.right>=g.target)completeRound();else{render();message('빈자리가 '+(g.target-g.left-g.right)+'칸 남았어.');ding()}break;
 case 'equal':g.right++;if(g.right>=g.target)completeRound();else{render();message('조금만 더!');ding()}break;
 case 'sum':if(Number(el.dataset.value)===g.total)completeRound();else retry();break;
 }
}
world.addEventListener('click',e=>{if(e.target.id==='startButton'){beginStage(0);return}const el=e.target.closest('[data-action]');if(el)perform(el.dataset.action,el)});
$('stageGrid').addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(el)perform(el.dataset.action,el)});
$('soundToggle').addEventListener('click',()=>{state.sound=!state.sound;$('soundToggle').setAttribute('aria-pressed',String(state.sound));$('soundToggle').setAttribute('aria-label',state.sound?'소리 끄기':'소리 켜기');$('soundToggle').textContent=state.sound?'소리 켜짐':'소리 꺼짐';if(!state.sound&&'speechSynthesis' in window)try{window.speechSynthesis.cancel()}catch(_){};if(state.sound)talk(promptFor())});
$('hearButton').addEventListener('click',()=>talk(promptFor()));
$('stageToggle').addEventListener('click',()=>{const panel=$('stagePanel');panel.hidden=!panel.hidden;$('stageToggle').setAttribute('aria-expanded',String(!panel.hidden));stagePanel()});
$('hintButton').addEventListener('click',help);
$('restartButton').addEventListener('click',()=>beginStage(state.stage));
stagePanel();seeds();guide('숲속 친구들이 기다려','함께 열매를 모으며 놀아 볼까?');
// 자동화 QA에서만 사용. 실사용 기록이나 개인정보를 노출하지 않음.
Object.defineProperty(window,'__numberForestQA',{value:{getState:()=>({stage:state.stage,round:state.round,mode:state.game?.mode,locked:state.locked}),getTask:()=>state.game?JSON.parse(JSON.stringify(state.game)):null},configurable:false});
})();
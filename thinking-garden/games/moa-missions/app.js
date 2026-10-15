(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('ko-KR')+'원';
const query=new URLSearchParams(location.search);
const chosen=['money','change','feel'].includes(query.get('game'))?query.get('game'):'money';
const config={
 money:{title:'모아의 화폐 가게',garden:'✏️ 모아의 학습정원',hash:'learning',
  subtitle:'돈을 알아보고, 필요한 금액을 만들어봐요.',
  intro:'오늘은 모아의 작은 가게가 열렸어요. 돈의 이름을 익히고 물건값을 맞춰봐요.',
  levels:[['쉬움','동전·지폐 하나씩 알아보기'],['보통','필요한 금액 직접 만들기'],['도전','모아의 가게에서 물건값 내기']]},
 change:{title:'바뀐 준비물 찾기',garden:'👀 모아의 인지정원',hash:'cognitive',
  subtitle:'기억한 목록에 바뀐 내용을 반영해요.',
  intro:'모아가 내일 준비할 물건을 알려줬어요. 목록을 살펴보고 바뀐 준비물을 찾아봐요.',
  levels:[['쉬움','물건 3개 중 하나가 바뀌어요'],['보통','물건 4개 중 두 가지가 바뀌어요'],['도전','준비물이 추가되거나 빠져요']]},
 feel:{title:'마음 이야기 탐험',garden:'💛 모아의 마음정원',hash:'heart',
  subtitle:'상황을 보고 마음을 짐작하고, 할 말을 골라봐요.',
  intro:'친구가 어떤 마음일지는 한 가지 답으로 정해지지 않아요. 상황을 보고 마음과 다음 행동을 생각해봐요.',
  levels:[['쉬움','짧고 친숙한 상황'],['보통','서로 다른 입장 생각하기'],['도전','여러 마음이 섞일 수 있는 상황']]}
};
const opts=['easy','normal','hard'];let state={game:chosen,level:'easy',index:0,stage:'',correct:0,attempts:0,locked:false,selected:[],chosenFeeling:'',options:[],audio:false};
let lastSpokenStage='';let roundMax=12;let lastSessionComplete=0;
const game=config[chosen];
$('gardenBack').href='../../../gardens/#'+game.hash;
$('resultGarden').href='../../../gardens/#'+game.hash;
$('gardenName').textContent=game.garden;
$('gameTitle').textContent=game.title;
$('gameTagline').textContent=game.subtitle;
$('introText').textContent=game.intro;
document.title=game.title+' | 일단 해봄';
const levelList=$('levelList');
game.levels.forEach((a,i)=>{
 const b=document.createElement('button');b.type='button';b.className='level-card';b.dataset.level=opts[i];
 b.innerHTML='<strong>'+esc(a[0])+'</strong><small>'+esc(a[1])+'</small><span aria-hidden="true">↗</span>';
 b.addEventListener('click',()=>{state.level=opts[i];updateLevels()});levelList.append(b);
});
function updateLevels(){levelList.querySelectorAll('button').forEach(b=>{const selected=b.dataset.level===state.level;b.classList.toggle('chosen',selected);b.setAttribute('aria-pressed',String(selected))})}
updateLevels();
function updateRounds(){
 document.querySelectorAll('#roundOptions [data-rounds]').forEach(b=>{
  const chosen=Number(b.dataset.rounds)===roundMax;
  b.classList.toggle('chosen',chosen);b.setAttribute('aria-pressed',String(chosen));
 });
 $('roundPlan').textContent=roundMax+'미션을 선택했어요. 4미션마다 꽃이 피어요. 중간에 쉬어도 괜찮아요.';
}
document.querySelectorAll('#roundOptions [data-rounds]').forEach(b=>b.addEventListener('click',()=>{roundMax=Number(b.dataset.rounds);updateRounds();}));
updateRounds();
function show(screen){['intro','play','result'].forEach(id=>$(id+'Screen').hidden=id!==screen)}
function roundItem(bank){
 // Rotate across a larger problem bank rather than replaying the first 4 cases.
 const offset=state.sessionSeed||0;
 return bank[(state.index+offset)%bank.length];
}
function htmlButton(label,action,extra){return '<button type="button" '+(extra||'')+' data-action="'+action+'">'+esc(label)+'</button>'}
function setScene(title,desc,label){
 $('missionHeading').textContent=title;$('missionDescription').textContent=desc||'';
 $('sceneLabel').textContent=label||'도전 '+(state.index+1);
 $('roundCount').textContent=(state.index+1)+' / '+roundMax;
 const petals=Math.floor(state.index/4);
 $('gardenProgress').textContent=state.index>0&&state.index%4===0?'🌸 모아가 새 꽃을 발견했어요!':(['🌱 씨앗을 심어요','🌿 싹을 키워요','🌼 꽃을 피워요','🌷 새로운 정원도 가봐요','🌻 함께 꽃밭을 완성해요'][Math.min(4,petals)]);
 $('seedCount').textContent='🌼 '+petals+'송이';
 $('progressFill').style.width=(state.index/roundMax*100)+'%';
 $('gameArea').innerHTML='';$('feedback').textContent='';$('feedback').className='feedback';$('gameActions').innerHTML='';
 const voiceKey=state.index+'/'+(state.stage||'main');if(state.audio&&lastSpokenStage!==voiceKey){lastSpokenStage=voiceKey;speak(title+'. '+desc);}
}
function feedback(message,positive=false){$('feedback').textContent=message;$('feedback').className='feedback'+(positive?' good':'');}
function nextAction(message){
 state.locked=true;
 $('gameActions').innerHTML='<button type="button" data-action="next" class="primary-action">'+(state.index===roundMax-1?'오늘 놀이 마치기':'다음 미션 →')+'</button>';
 if(message)feedback(message,true);
}
function advance(){state.index++;state.locked=false;state.selected=[];state.stage='';state.options=[];state.attempts=0;state.chosenFeeling='';state.chosenResponse=null;
 if(state.index>=roundMax){finish();return}draw();
}
function finish(){
 show('result');$('progressFill').style.width='100%';
 $('resultFlowers').textContent='🌼'.repeat(Math.max(1,Math.floor(roundMax/4)))+' 🌱';
 const count=state.correct;
 $('resultHeading').textContent='오늘의 미션 완료!';
 if(chosen==='feel'){$('resultText').textContent='서로 다른 마음과 대응 방법을 '+roundMax+'가지 상황에서 생각해봤어요. 실제 마음은 사람마다 다를 수 있어요.'}
 else if(chosen==='change'){$('resultText').textContent=roundMax+'개의 바뀐 준비물 미션을 끝냈어요. 첫 시도에 맞힌 문제 '+count+'개. 다시 살펴본 과정도 중요한 연습이에요.'}
 else {$('resultText').textContent=roundMax+'개의 돈 미션을 끝냈어요. 첫 시도에 맞힌 문제 '+count+'개. 실수해도 다시 맞춰볼 수 있어요.'}
}
// Real money appearance is not reproduced. The denominations are deliberately printed as learning cues.
const moneyVals=[100,500,1000,5000];
function moneyChip(value){
 const paper=value>=1000;
 return '<span class="currency '+(paper?'paper':'coin')+' value-'+value+'"><span>'+ (paper?'지폐':'동전')+'</span><strong>'+value.toLocaleString('ko-KR')+'</strong><small>원</small></span>';
}
function moneyRound(){
 if(state.level==='easy')return {kind:'read',value:moneyVals[state.index%4]};
 const prices=state.level==='normal'?[300,600,1100,800]:[1300,2400,3600,4500];
 const goods=['🍎 사과 바구니','📒 작은 공책','🌻 꽃씨 꾸러미','🎁 선물 상자'];
 return {kind:'make',value:prices[state.index],item:goods[state.index]};
}
function drawMoney(){
 const r=moneyRound();
 if(r.kind==='read'){
  setScene('어떤 돈인가요?','숫자와 돈의 종류를 살펴보고 금액을 골라요.','화폐 알아보기');
  const distractors=moneyVals.filter(x=>x!==r.value);
  const answers=[r.value,distractors[(state.index+1)%3],distractors[(state.index+2)%3]];
  state.options=answers.sort((a,b)=>((a+state.index*3)%7)-((b+state.index*3)%7));
  $('gameArea').innerHTML='<div class="currency-stage"><span class="currency-large">'+moneyChip(r.value)+'</span><p>이 돈의 금액을 골라요.</p></div><div class="choice-grid">'+state.options.map(x=>'<button type="button" class="choice" data-value="'+x+'">'+fmt(x)+'</button>').join('')+'</div>';
  return;
 }
 setScene(state.level==='hard'?'가게에서 물건값 내기':'목표 금액 만들기','동전·지폐를 눌러 필요한 금액을 담아봐요. 담은 돈은 다시 뺄 수 있어요.','돈 만들기');
 const denominations=state.level==='normal'?[100,500,1000]:[100,500,1000];
 const curr=state.selected.reduce((s,n)=>s+n,0);
 const itemHTML=state.level==='hard'?'<p class="item-banner">'+esc(r.item)+'</p>':'';
 $('gameArea').innerHTML='<div class="money-target">'+itemHTML+'<small>필요한 금액</small><strong>'+fmt(r.value)+'</strong></div><div class="money-cart"><small>지금 담은 돈</small><strong id="cartSum">'+fmt(curr)+'</strong><div id="cartItems" class="cart-pieces">'+(state.selected.map(n=>moneyChip(n)).join('')||'<span class="empty-cart">아직 담은 돈이 없어요.</span>')+'</div></div><p class="tiny-instruction">아래 돈을 눌러 담아요.</p><div class="money-palette">'+denominations.map(n=>'<button type="button" class="money-pick" data-money="'+n+'">'+moneyChip(n)+'</button>').join('')+'</div>';
 $('gameActions').innerHTML=htmlButton('↶ 마지막 돈 빼기','undo','class="secondary-action"')+htmlButton('다시 담기','clear','class="secondary-action"')+htmlButton('이 금액으로 확인','check','class="primary-action"');
}
const itemLabels={pen:['✏️','연필'],book:['📒','공책'],water:['💧','물병'],eraser:['🧽','지우개'],apple:['🍎','사과'],folder:['📁','파일'],glue:['🧴','풀'],ruler:['📏','자'],notebook:['📓','수첩'],tissue:['🧻','휴지'],pencilcase:['🖍️','필통'],scissors:['✂️','가위'],snack:['🥪','간식'],hat:['🧢','모자'],cloth:['🧣','손수건']};
const changedBank={
 easy:[
 {base:['pen','book','water'],after:['pen','eraser','water'],note:'공책 대신 지우개를 챙기세요.',wrong:['pen','book','eraser']},
 {base:['glue','ruler','apple'],after:['glue','folder','apple'],note:'자 대신 파일을 챙기세요.',wrong:['folder','ruler','apple']},
 {base:['tissue','pencilcase','water'],after:['tissue','pencilcase','hat'],note:'물병 대신 모자를 챙기세요.',wrong:['tissue','hat','water']},
 {base:['scissors','pen','snack'],after:['ruler','pen','snack'],note:'가위 대신 자를 챙기세요.',wrong:['scissors','ruler','snack']}
 ],
 normal:[
 {base:['pen','book','water','ruler'],after:['eraser','book','hat','ruler'],note:'연필은 지우개로, 물병은 모자로 바뀌었어요.',wrong:['eraser','book','water','hat']},
 {base:['apple','glue','folder','tissue'],after:['snack','glue','folder','cloth'],note:'사과는 간식으로, 휴지는 손수건으로 바뀌었어요.',wrong:['apple','glue','folder','cloth']},
 {base:['water','notebook','hat','pen'],after:['water','book','hat','eraser'],note:'수첩은 공책으로, 연필은 지우개로 바뀌었어요.',wrong:['water','book','eraser','pen']},
 {base:['scissors','ruler','pencilcase','apple'],after:['glue','ruler','pencilcase','snack'],note:'가위는 풀로, 사과는 간식으로 바뀌었어요.',wrong:['scissors','ruler','pencilcase','snack']}
 ],
 hard:[
 {base:['pen','book','water','eraser','glue'],after:['pen','book','eraser','glue','hat'],note:'물병은 빼고 모자를 추가하세요.',wrong:['pen','book','water','glue','hat']},
 {base:['ruler','notebook','apple','tissue','folder'],after:['ruler','notebook','tissue','folder','snack'],note:'사과는 빼고 간식을 추가하세요.',wrong:['ruler','notebook','apple','folder','snack']},
 {base:['hat','pen','glue','scissors','water'],after:['hat','pen','glue','water','cloth'],note:'가위는 빼고 손수건을 추가하세요.',wrong:['hat','pen','scissors','water','cloth']},
 {base:['eraser','apple','book','folder','tissue'],after:['eraser','apple','book','pencilcase','tissue'],note:'파일은 빼고 필통을 추가하세요.',wrong:['eraser','apple','folder','pencilcase','tissue']}
 ]};
function itemView(id){const item=itemLabels[id];return '<span class="item-chip"><span aria-hidden="true">'+item[0]+'</span><b>'+esc(item[1])+'</b></span>'}
function listView(arr){return '<div class="item-line">'+arr.map(itemView).join('')+'</div>'}
function drawChange(){
 const r=roundItem(changedBank[state.level]);if(!state.stage)state.stage='remember';
 if(state.stage==='remember'){
  setScene('모아의 준비물을 기억해요','천천히 살펴보세요. 충분히 기억한 뒤 다음으로 넘어가요.','처음 목록');
  $('gameArea').innerHTML='<div class="bag-scene"><span class="bag-icon" aria-hidden="true">🎒</span><p>처음 준비물</p>'+listView(r.base)+'</div>';
  $('gameActions').innerHTML=htmlButton('기억했어요! 바뀐 목록 보기 →','changed-go','class="primary-action"');
 }else{
  setScene('이제 무엇을 챙길까요?','처음 목록에서 바뀐 내용을 반영해 골라봐요.','바뀐 안내');
  const decoy=r.wrong;
  const vals=[r.after,r.base,decoy];
  state.options=[vals[(state.index+1)%3],vals[(state.index+2)%3],vals[state.index%3]];
  $('gameArea').innerHTML='<div class="change-note"><span aria-hidden="true">📣</span><strong>'+esc(r.note)+'</strong></div><p class="tiny-instruction">바뀐 준비물 목록을 골라요.</p><div class="list-options">'+state.options.map((list,i)=>'<button type="button" class="list-choice" data-list-index="'+i+'"><span>목록 '+(i+1)+'</span>'+listView(list)+'</button>').join('')+'</div>';
  $('gameActions').innerHTML=htmlButton('↶ 처음 목록 다시 보기','changed-back','class="secondary-action"');
 }
}
const storyBank={
 easy:[
 {icon:'🎒',scene:'친구가 가방을 열어보더니 아끼는 필통이 없다고 해요.',feelings:['걱정돼요','속상해요','당황해요'],actions:[['같이 찾아볼까? 하고 물어봐요.','먼저 물어보면 친구가 원하는 도움을 알 수 있어요.'],['조금 기다렸다가 괜찮은지 물어요.','혼자 살펴볼 시간이 필요할 수도 있어요.'],['선생님께 같이 이야기할지 물어요.','도움이 더 필요할 때 선택할 수 있는 방법이에요.']]},
 {icon:'🎨',scene:'친구가 열심히 그린 그림을 누군가 구겼어요.',feelings:['속상해요','화가 나요','놀랐어요'],actions:[['어떤 일이 있었는지 들어봐요.','친구의 이야기를 듣는 것도 도움이 될 수 있어요.'],['새 종이가 필요한지 물어봐요.','친구가 원하면 현실적인 도움을 줄 수 있어요.'],['선생님께 알릴지 함께 의논해요.','상황이 어려우면 믿을 만한 어른과 의논할 수 있어요.']]},
 {icon:'🎈',scene:'친구가 생일 파티에 초대받았어요. 처음 만나는 아이들도 온대요.',feelings:['기대돼요','긴장돼요','설레요'],actions:[['같이 가는 사람을 물어봐요.','친구가 같이 가길 원할 수도 있어요.'],['기대되는 것을 물어봐요.','친구가 재미있는 생각을 이야기할 수 있어요.'],['걱정되는 것이 있는지 물어봐요.','친구가 긴장하는 부분이 있을 수도 있어요.']]},
 {icon:'🧩',scene:'친구가 어려운 퍼즐 앞에 오래 앉아 있어요.',feelings:['답답해요','궁금해요','집중돼요'],actions:[['힌트가 필요한지 물어봐요.','먼저 묻고 도와주면 좋아요.'],['조용히 기다려줘요.','집중하는 중이라면 기다려주는 게 편할 수 있어요.'],['같이 해볼지 물어봐요.','친구가 원한다면 함께 도전할 수도 있어요.']]}
 ],
 normal:[
 {icon:'⚽',scene:'친구가 공놀이하자고 했는데 다른 친구들은 그림 그리기를 하고 싶대요.',feelings:['서운해요','아쉬워요','괜찮아요'],actions:[['두 활동을 번갈아 할지 이야기해요.','함께 정할 수 있는 방법을 찾을 수 있어요.'],['친구가 원하는 다른 놀이를 물어요.','서로 원하는 것이 다를 수 있다는 점을 알 수 있어요.'],['오늘은 각자 다른 놀이를 하자고 해요.','꼭 같은 놀이를 할 필요는 없어요.']]},
 {icon:'🧃',scene:'친구가 가져온 음료를 다른 친구가 허락 없이 마셨어요.',feelings:['화가 나요','당황해요','별일 아니라고 느껴요'],actions:[['내 음료는 먼저 물어봐 줘라고 말해요.','자신의 경계를 표현하는 방법이에요.'],['왜 그랬는지 물어봐요.','먼저 상황을 확인할 수도 있어요.'],['필요하면 선생님에게 이야기해요.','스스로 해결하기 어려울 때 도움을 구할 수 있어요.']]},
 {icon:'📢',scene:'발표하고 싶은 친구가 있는데, 다른 친구가 계속 먼저 말하고 있어요.',feelings:['답답해요','긴장돼요','기다릴 수 있어요'],actions:[['저도 말해도 될까요? 하고 말해요.','차례를 요청할 수 있어요.'],['발표 순서를 같이 정하자고 해요.','차례를 보이게 만들 수도 있어요.'],['선생님에게 순서를 도와달라고 해요.','도움이 필요하면 요청할 수 있어요.']]},
 {icon:'🪁',scene:'친구가 약속한 시간보다 늦게 왔어요. 이유는 아직 몰라요.',feelings:['걱정돼요','서운해요','괜찮아요'],actions:[['무슨 일이 있었는지 먼저 물어요.','사정을 듣기 전에는 이유를 알 수 없어요.'],['다음에는 연락해 주면 좋겠다고 말해요.','내가 바라는 점을 설명할 수 있어요.'],['기다리면서 어떤 마음이었는지 말해요.','서운함이나 걱정을 차분히 말해볼 수 있어요.']]}
 ],
 hard:[
 {icon:'🎭',scene:'친구가 웃으며 괜찮다고 말했지만 목소리는 작고 자꾸 자리를 피하려고 해요.',feelings:['불편할 수도 있어요','정말 괜찮을 수도 있어요','말하기 싫을 수도 있어요'],actions:[['말하고 싶을 때 이야기해도 된다고 해요.','상대가 말할 시간을 스스로 정할 수 있어요.'],['지금 도움이 필요한지 짧게 물어요.','상대의 선택을 존중하며 확인할 수 있어요.'],['바로 이유를 캐묻지 않고 기다려요.','계속 묻는 것이 부담스러울 수도 있어요.']]},
 {icon:'📝',scene:'친구가 조별 과제에서 자기 의견을 말하지 않았어요. 아무도 이유를 물어보지 않았대요.',feelings:['할 말이 없을 수도 있어요','말할 기회를 기다렸을 수도 있어요','긴장했을 수도 있어요'],actions:[['네 생각도 듣고 싶어라고 말해요.','참여를 요청하되 선택권을 남길 수 있어요.'],['생각할 시간을 줄지 물어봐요.','바로 대답하기 어려울 수도 있어요.'],['글로 의견을 낼 수 있는지 물어봐요.','말하기 외에도 참여하는 방법이 있어요.']]},
 {icon:'📱',scene:'친구에게 메시지를 보냈는데 답장이 없어요. 아직 읽었는지는 몰라요.',feelings:['기다려도 괜찮아요','걱정돼요','서운해요'],actions:[['조금 더 기다려봐요.','상대가 바쁠 수 있어요.'],['급한 일이라면 한 번 더 간단히 물어요.','필요와 긴급함을 분명히 할 수 있어요.'],['다른 사람에게도 도움을 요청해요.','답을 꼭 한 사람에게만 받아야 하는 건 아니에요.']]},
 {icon:'🪑',scene:'친구가 옆자리에 앉아도 된다고 했지만 잠시 조용히 있고 싶다고 해요.',feelings:['혼자 있고 싶을 수 있어요','피곤할 수 있어요','친구가 싫은 건 아닐 수 있어요'],actions:[['그래, 쉬었다 이야기하자고 해요.','상대의 쉬고 싶은 마음을 존중할 수 있어요.'],['다음에 함께할지 물어봐요.','나중에 다시 만날 수 있어요.'],['자리를 옮겨 조용히 시간을 줘요.','말보다 행동으로 배려할 수도 있어요.']]}
 ]};
function drawFeel(){
 const r=roundItem(storyBank[state.level]);if(!state.stage)state.stage='emotion';
 if(state.stage==='emotion'){
  setScene('어떤 마음일 수 있을까요?','여러 마음이 가능해요. 가장 먼저 떠오르는 생각을 골라봐요.','상황 살펴보기');
  $('gameArea').innerHTML='<div class="story-card"><span class="story-icon" aria-hidden="true">'+r.icon+'</span><p>'+esc(r.scene)+'</p></div><div class="emotion-options">'+r.feelings.map((v,i)=>'<button type="button" class="choice" data-feeling="'+i+'">'+esc(v)+'</button>').join('')+'</div>';
 }else if(state.stage==='response'){
  setScene('어떻게 해볼까요?','방법을 골라보고 어떤 일이 생길지 생각해봐요.','함께 생각하기');
  $('gameArea').innerHTML='<div class="story-card small"><span class="story-icon" aria-hidden="true">'+r.icon+'</span><p>'+esc(r.scene)+'</p></div><p class="selected-feeling">조금 전 생각한 마음: <strong>'+esc(state.chosenFeeling)+'</strong></p><div class="response-options">'+r.actions.map((a,i)=>'<button type="button" class="choice" data-response="'+i+'">'+esc(a[0])+'</button>').join('')+'</div>';
 }else{setScene('생각을 나눠봤어요','정답이 하나로 정해진 상황은 아니에요. 사람마다 다르게 느끼고 반응할 수 있어요.','함께 돌아보기');
 $('gameArea').innerHTML='<div class="reflect-note"><span aria-hidden="true">💬</span><strong>'+esc(state.chosenFeeling)+'</strong><p>'+esc(state.chosenResponse[1])+'</p><small>다른 마음이나 대응 방법도 가능한지 함께 이야기해봐요.</small></div>';
 nextAction('어떤 방법이 좋을지는 상대의 마음과 상황에 따라 달라질 수 있어요.');
 }
}
function draw(){state.locked=false;if(chosen==='money')drawMoney();else if(chosen==='change')drawChange();else drawFeel()}
function start(){
 state.index=0;state.correct=0;state.attempts=0;state.stage='';state.selected=[];state.locked=false;state.options=[];state.sessionSeed=(lastSessionComplete++*5);lastSpokenStage='';
 show('play');draw();
}
$('startGame').addEventListener('click',start);
$('exitGame').addEventListener('click',()=>show('intro'));
$('playAgain').addEventListener('click',start);
$('gameArea').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||state.locked)return;
 if(chosen==='money'){
  if(b.dataset.value!==undefined){const n=Number(b.dataset.value),expected=moneyRound().value;state.attempts++;if(n===expected){if(state.attempts===1)state.correct++;nextAction('맞았어요! '+fmt(expected)+'이에요.')}else feedback('다시 살펴봐요. 그림에 적힌 금액과 비교해도 좋아요.');return;}
  if(b.dataset.money!==undefined){if(state.selected.length>=20){feedback('너무 많이 담았어요. 하나씩 다시 살펴봐요.');return}state.selected.push(Number(b.dataset.money));drawMoney();return;}
 }
 if(chosen==='change'&&b.dataset.listIndex!==undefined){
  const answer=roundItem(changedBank[state.level]).after;const chosenList=state.options[Number(b.dataset.listIndex)];
  state.attempts++;if(chosenList.join('|')===answer.join('|')){if(state.attempts===1)state.correct++;nextAction('변경된 목록을 잘 반영했어요!')}else feedback('한 가지씩 비교해봐요. 처음 목록을 다시 볼 수도 있어요.');return;
 }
 if(chosen==='feel'){
  const r=roundItem(storyBank[state.level]);
  if(b.dataset.feeling!==undefined){state.chosenFeeling=r.feelings[Number(b.dataset.feeling)];state.stage='response';draw();return;}
  if(b.dataset.response!==undefined){state.chosenResponse=r.actions[Number(b.dataset.response)];state.stage='reflect';draw();return;}
 }
});
$('gameActions').addEventListener('click',e=>{
 const b=e.target.closest('button[data-action]');if(!b)return;
 const action=b.dataset.action;
 if(action==='next'){advance();return;}
 if(action==='check'&&chosen==='money'&&!state.locked){
  const target=moneyRound().value,sum=state.selected.reduce((s,v)=>s+v,0);
  state.attempts++;
  if(sum===target){if(state.attempts===1)state.correct++;nextAction('맞았어요! '+fmt(target)+'을 정확히 만들었어요.')}
  else feedback(sum>target?'조금 많아요. '+fmt(sum-target)+'만큼 더 담았어요.':'조금 부족해요. '+fmt(target-sum)+'을 더 담아야 해요.');
  return;
 }
 if(action==='undo'){state.selected.pop();drawMoney();return;}
 if(action==='clear'){state.selected=[];drawMoney();return;}
 if(action==='changed-go'){state.stage='choose';draw();return;}
 if(action==='changed-back'){state.stage='remember';draw();return;}
});
function speak(text){
 if(!state.audio||!('speechSynthesis' in window))return;
 window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='ko-KR';utterance.rate=0.9;window.speechSynthesis.speak(utterance);
}
$('soundButton').addEventListener('click',()=>{
 state.audio=!state.audio;$('soundButton').setAttribute('aria-pressed',String(state.audio));
 $('soundButton').textContent=state.audio?'🔊 안내 읽기 켜짐':'🔇 안내 읽기';
 if(!state.audio){window.speechSynthesis?.cancel?.()}else speak($('missionHeading').textContent+' '+$('missionDescription').textContent);
});
show('intro');
})();

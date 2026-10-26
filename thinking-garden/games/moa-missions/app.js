(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('ko-KR')+'원';
function withParticle(noun,withJong,withoutJong){
 const code=noun.charCodeAt(noun.length-1);
 const jong=code>=0xAC00&&code<=0xD7A3?(code-0xAC00)%28:0;
 return noun+(jong&&(withJong!=='으로'||jong!==8)?withJong:withoutJong);
}
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
 $('gameArea').classList.remove('mission-cleared');
 const voiceKey=state.index+'/'+(state.stage||'main');if(state.audio&&lastSpokenStage!==voiceKey){lastSpokenStage=voiceKey;speak(title+'. '+desc);}
}
function feedback(message,positive=false){$('feedback').textContent=message;$('feedback').className='feedback'+(positive?' good':'');}
function nextAction(message){
 state.locked=true;
 $('gameArea').classList.add('mission-cleared');
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

const easyMoneyBank=[
 {kind:'read',value:100},{kind:'read',value:500},{kind:'read',value:1000},{kind:'read',value:5000},
 {kind:'sum',pieces:[100,100,100],value:300},{kind:'sum',pieces:[500,100],value:600},
 {kind:'read',value:50},{kind:'sum',pieces:[500,500],value:1000},
 {kind:'sum',pieces:[1000,500],value:1500},{kind:'sum',pieces:[100,100,500],value:700},
 {kind:'read',value:10},{kind:'sum',pieces:[50,50,100],value:200},
 {kind:'sum',pieces:[500,500,100],value:1100},{kind:'sum',pieces:[1000,100,100],value:1200},
 {kind:'sum',pieces:[100,500,100],value:700},{kind:'sum',pieces:[500,500,500],value:1500},
 {kind:'sum',pieces:[1000,500,100],value:1600},{kind:'sum',pieces:[500,100,100,100],value:800},
 {kind:'sum',pieces:[1000,1000,500],value:2500},{kind:'sum',pieces:[1000,500,500],value:2000}
];
const moneyNormalPrices=[300,600,1100,800,1500,2500,700,1300,1600,900,1800,2400,400,1400,2300,2000,2700,1900,2200,2600];
const moneyHardPrices=[1300,2400,3600,4500,1800,3300,2700,4100,5200,3400,1500,2800,4600,3700,5400,4200,5600,3900,6200,4800];
const shopGoods=['🍎 사과 바구니','📒 작은 공책','🌻 꽃씨 꾸러미','🎁 선물 상자','🥪 간식 꾸러미','🖍️ 색연필','🧼 비누','🍌 바나나','📓 수첩','🌼 꽃 화분','🧩 작은 퍼즐','🥛 우유','⚽ 장난감 공','🍪 쿠키','✂️ 가위','🖇️ 클립','🥕 당근','🌸 꽃다발','🪁 연','📦 준비물 상자'];
function moneyRound(){
 const offset=state.sessionSeed||0;
 if(state.level==='easy')return easyMoneyBank[(state.index+offset)%easyMoneyBank.length];
 const prices=state.level==='normal'?moneyNormalPrices:moneyHardPrices;
 const n=(state.index+offset)%prices.length;
 const price=prices[n],item=shopGoods[n];
 if(state.level==='hard'&&state.index%4===2){
  const paid=Math.ceil((price+100)/1000)*1000;
  return {kind:'change',price,paid,value:paid-price,item};
 }
 return {kind:'make',value:price,item};
}
function buildMoneyChoices(r){
 const value=r.value;
 if(r.kind==='read'){
  const bank=[10,50,100,500,1000,5000,10000];
  const near=bank.filter(v=>v!==value).sort((a,b)=>Math.abs(Math.log(a/value))-Math.abs(Math.log(b/value)));
  return [value,near[0],near[1]].sort((a,b)=>((a*13+state.index*7)%17)-((b*13+state.index*7)%17));
 }
 const candidates=[value+100,Math.max(0,value-100),value+500,Math.max(0,value-500),value+200,Math.max(0,value-200)].filter(v=>v>0&&v!==value);
 const options=[value,...new Set(candidates)].slice(0,3);
 return options.sort((a,b)=>((a+state.index*19)%13)-((b+state.index*19)%13));
}
function drawMoney(){
 const r=moneyRound();
 if(r.kind==='read'||r.kind==='sum'){
  const sum=r.kind==='sum';
  setScene(sum?'돈을 합쳐보세요':'어떤 돈인가요?',sum?'돈이 몇 원인지 하나씩 더해봐요.':'숫자와 돈의 종류를 살펴보고 골라요.',sum?'금액 세기':'화폐 알아보기');
  state.options=buildMoneyChoices(r);
  const moneyView=sum?r.pieces.map(moneyChip).join(''):moneyChip(r.value);
  $('gameArea').innerHTML='<div class="currency-stage '+(sum?'currency-multiple':'')+'"><span class="currency-large">'+moneyView+'</span><p>'+(sum?'이 돈을 모두 합하면 얼마인가요?':'이 돈은 얼마인가요?')+'</p></div><div class="choice-grid">'+state.options.map(x=>'<button type="button" class="choice" data-value="'+x+'">'+fmt(x)+'</button>').join('')+'</div>';
  return;
 }
 const change=r.kind==='change';
 setScene(change?'거스름돈 계산하기':state.level==='hard'?'모아의 가게에서 계산하기':'금액을 만들어봐요',
  change?'손님이 낸 돈에서 물건값을 뺀 거스름돈을 담아봐요.':'동전·지폐를 눌러 필요한 금액을 담아봐요. 돈은 다시 뺄 수 있어요.',change?'거스름돈 돌려주기':'돈 만들기');
 const denominations=[100,500,1000,5000];
 const curr=state.selected.reduce((sum,n)=>sum+n,0);
 const itemHTML=state.level==='hard'?'<p class="item-banner">'+esc(r.item)+'</p>':'';
 const changeNote=change?'<div class="change-receipt">손님이 낸 돈 <b>'+fmt(r.paid)+'</b> − 물건값 <b>'+fmt(r.price)+'</b></div>':'';
 $('gameArea').innerHTML='<div class="money-target">'+itemHTML+changeNote+'<small>'+(change?'돌려줄 거스름돈':'필요한 금액')+'</small><strong>'+fmt(r.value)+'</strong></div><div class="money-cart"><small>지금 담은 돈</small><strong id="cartSum">'+fmt(curr)+'</strong><div id="cartItems" class="cart-pieces">'+(state.selected.map((n,i)=>'<button type="button" class="bag-money-piece" data-remove-index="'+i+'" aria-label="'+fmt(n)+' 가방에서 꺼내기">'+moneyChip(n)+'<span class="bag-remove">×</span></button>').join('')||'<span class="empty-cart">아직 담은 돈이 없어요.</span>')+'</div></div><p class="tiny-instruction">아래 돈을 눌러 담아요.</p><div class="money-palette">'+denominations.map(n=>'<button type="button" class="money-pick" data-money="'+n+'">'+moneyChip(n)+'</button>').join('')+'</div>';
 $('gameActions').innerHTML=htmlButton('↶ 마지막 돈 빼기','undo','class="secondary-action"')+htmlButton('모두 다시 담기','clear','class="secondary-action"')+htmlButton(change?'거스름돈 확인':'금액 확인','check','class="primary-action"');
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

// Additional genuinely different list updates rather than the same four cases looping.
function changedRound(){
 const bank=changedBank[state.level],n=state.index+(state.sessionSeed||0);
 if(n<bank.length)return bank[n];
 const ids=Object.keys(itemLabels),len=state.level==='easy'?3:state.level==='normal'?4:5;
 const index=n-bank.length,start=(index*3+Math.floor(index/5))%ids.length;
 const base=Array.from({length:len},(_,i)=>ids[(start+i*7)%ids.length]);
 const after=[...base];let note='',wrong;
 const replacement=skip=>ids.find((name,i)=>!skip.includes(name)&&(i+index)%3===0)||ids.find(name=>!skip.includes(name));
 if(state.level==='easy'){
  const at=index%len,old=base[at],fresh=replacement(base);
  after[at]=fresh;
  note=itemLabels[old][1]+' 대신 '+withParticle(itemLabels[fresh][1],'을','를')+' 챙기세요.';
  wrong=[...base];wrong[at]=replacement([...base,fresh]);
 }else if(state.level==='normal'){
  const ix=index%len,jx=(ix+2)%len;
  const oldA=base[ix],oldB=base[jx],newA=replacement(base),newB=replacement([...base,newA]);
  after[ix]=newA;after[jx]=newB;
  note=withParticle(itemLabels[oldA][1],'은','는')+' '+withParticle(itemLabels[newA][1],'으로','로')+', '+
   withParticle(itemLabels[oldB][1],'은','는')+' '+withParticle(itemLabels[newB][1],'으로','로')+' 바뀌었어요.';
  wrong=[...base];wrong[ix]=newA;
 }else{
  const at=index%len,removed=base[at],added=replacement(base);
  wrong=[...base];
  // The challenge level intentionally alternates actual add, remove and replace tasks.
  if(index%3===0){
   after.push(added);wrong.push(replacement([...base,added]));
   note=withParticle(itemLabels[added][1],'을','를')+' 추가하세요.';
  }else if(index%3===1){
   after.splice(at,1);wrong.splice((at+1)%len,1);
   note=withParticle(itemLabels[removed][1],'은','는')+' 빼세요.';
  }else{
   after.splice(at,1,added);
   wrong[(at+1)%len]=replacement([...base,...after]);
   note=withParticle(itemLabels[removed][1],'은','는')+' 빼고 '+withParticle(itemLabels[added][1],'을','를')+' 추가하세요.';
  }
 }
 return {base,after,note,wrong};
}
function itemView(id){const item=itemLabels[id];return '<span class="item-chip"><span aria-hidden="true">'+item[0]+'</span><b>'+esc(item[1])+'</b></span>'}
function listView(arr){return '<div class="item-line">'+arr.map(itemView).join('')+'</div>'}
function drawChange(){
 const r=changedRound();
 if(!state.stage)state.stage='remember';
 if(state.stage==='remember'){
  setScene('모아의 준비물을 기억해요','천천히 살펴보세요. 충분히 기억한 뒤 다음으로 넘어가요.','처음 목록');
  $('gameArea').innerHTML='<div class="bag-scene"><span class="bag-icon" aria-hidden="true">🎒</span><p>처음 준비물</p>'+listView(r.base)+'</div>';
  $('gameActions').innerHTML=htmlButton('기억했어요! 바뀐 목록 보기 →','changed-go','class="primary-action"');
 }else if(state.stage==='assemble'){
  setScene('직접 준비물을 챙겨요','바뀐 지시대로 챙길 물건을 모두 골라봐요. 같은 물건을 두 번 담지는 않아요.','실제 준비물 챙기기');
  const all=[...new Set([...r.base,...r.after,...r.wrong])];
  const pool=all.slice().sort((a,b)=>((itemLabels[a][1].charCodeAt(0)+state.index)%11)-((itemLabels[b][1].charCodeAt(0)+state.index)%11));
  $('gameArea').innerHTML='<div class="change-note"><span aria-hidden="true">📣</span><strong>'+esc(r.note)+'</strong></div><div class="assembled-cart"><strong>내 가방 ('+state.selected.length+'개)</strong>'+listView(state.selected)+'</div><p class="tiny-instruction">아래 물건을 눌러 넣거나 빼요.</p><div class="inventory-options">'+pool.map(id=>'<button type="button" data-item="'+esc(id)+'" class="item-pick'+(state.selected.includes(id)?' added':'')+'" aria-pressed="'+state.selected.includes(id)+'">'+itemView(id)+'</button>').join('')+'</div>';
  $('gameActions').innerHTML=htmlButton('↶ 처음 목록 보기','changed-back','class="secondary-action"')+htmlButton('이대로 챙기기','check-list','class="primary-action"');
 }else{
  setScene('이제 무엇을 챙길까요?','처음 목록에서 바뀐 내용을 반영해 골라봐요.','바뀐 안내');
  const vals=[r.after,r.base,r.wrong];
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

/* Extra episodes: 20 different situations per level before a scenario repeats. Each
 * option is a possible interpretation, never a diagnostic or 'correct' feeling. */
const extraStoryBank=[
 {icon:'🧸',
  scenes:['친구가 빌려준 인형이 조금 찢어졌어요.','친구에게 빌린 물건을 돌려주려는데 작은 흠집이 생겼어요.','빌린 물건에 흠집이 생겼지만 친구는 아직 알아차리지 못한 것 같아요.'],
  feelings:['미안할 수 있어요','걱정될 수 있어요','어떻게 할지 고민될 수 있어요'],
  actions:[['물건에 생긴 일을 솔직히 이야기해요.','숨기지 않고 알려주는 선택이에요.'],
           ['어떻게 고치면 좋을지 함께 물어봐요.','친구가 원하는 해결 방법을 들을 수 있어요.'],
           ['어른의 도움을 받아 해결해요.','혼자 해결하기 어려울 때 도움을 구할 수 있어요.']]},
 {icon:'🏀',
  scenes:['친구가 공을 던졌는데 잘 잡지 못했어요.','놀이 중 실수하자 친구가 잠깐 고개를 숙였어요.','시합에서 실수한 친구에게 팀원들이 아무 말도 하지 않았어요.'],
  feelings:['아쉬울 수 있어요','괜찮을 수도 있어요','속상할 수 있어요'],
  actions:[['괜찮은지 물어봐요.','도움이 필요한지 먼저 확인할 수 있어요.'],
           ['같이 다시 해볼지 물어봐요.','친구가 원하면 재도전할 수 있어요.'],
           ['잠깐 쉬었다 하자고 해요.','쉬는 시간도 도움이 될 수 있어요.']]},
 {icon:'🗓️',
  scenes:['친구와 놀기로 했는데 비가 많이 와요.','기다리던 야외 활동이 비 때문에 취소됐어요.','함께 만든 계획이 갑자기 취소됐는데 친구의 반응을 잘 모르겠어요.'],
  feelings:['아쉬울 수 있어요','다른 일이 기대될 수 있어요','속상할 수 있어요'],
  actions:[['다른 날 다시 만날지 물어봐요.','일정을 새로 정하는 방법이에요.'],
           ['실내에서 할 수 있는 일을 생각해봐요.','계획을 유연하게 바꿀 수 있어요.'],
           ['오늘은 쉬고 싶을지 물어봐요.','상대의 의향을 존중하는 방법이에요.']]},
 {icon:'🍪',
  scenes:['친구가 간식을 가져왔지만 나눠주지는 않았어요.','모두가 간식을 먹는데 내 몫은 없었어요.','간식을 나눠 먹는 상황에서 누구는 받았고 누구는 받지 못했어요.'],
  feelings:['아쉬울 수 있어요','별생각 없을 수도 있어요','서운할 수 있어요'],
  actions:[['나도 먹을 수 있는지 물어봐요.','상대에게 요청은 할 수 있어요.'],
           ['나눠주지 않아도 괜찮다고 생각해요.','다른 사람의 물건은 주인이 결정할 수 있어요.'],
           ['내가 먹을 것을 따로 준비해요.','다른 방법을 찾을 수도 있어요.']]},
 {icon:'🪄',
  scenes:['친구가 새 장난감을 보여줬어요.','친구가 자랑하던 물건을 내가 실수로 떨어뜨렸어요.','친구의 새 물건을 둘러싼 관심 때문에 다른 친구가 소외된 것 같아요.'],
  feelings:['신날 수 있어요','긴장할 수 있어요','불편할 수 있어요'],
  actions:[['무슨 장난감인지 물어봐요.','관심을 표현하는 방법이에요.'],
           ['함께 놀아도 되는지 물어봐요.','허락받는 것이 중요해요.'],
           ['다른 친구도 같이 볼지 물어봐요.','함께 참여할 방법을 생각할 수 있어요.']]},
 {icon:'🎤',
  scenes:['친구가 노래를 부르기 전에 손을 꼭 쥐고 있어요.','발표를 앞둔 친구가 웃고 있지만 말을 줄였어요.','공연을 준비한 친구가 기대되면서도 자꾸 실수할까 걱정한다고 말했어요.'],
  feelings:['떨릴 수 있어요','기대될 수 있어요','두 마음이 함께 있을 수 있어요'],
  actions:[['어떤 마음인지 물어봐요.','한 가지 표정만으로 단정하지 않을 수 있어요.'],
           ['응원해도 되는지 물어봐요.','원하는 응원 방식이 다를 수 있어요.'],
           ['혼자 연습할 시간을 줘요.','집중하고 싶을 수도 있어요.']]},
 {icon:'🎲',
  scenes:['친구가 게임에서 졌어요.','지는 일이 계속되자 친구가 말수가 줄었어요.','친구가 지고 난 뒤 한 번 더 하겠다고 했지만 표정이 어두워요.'],
  feelings:['아쉬울 수 있어요','괜찮을 수도 있어요','화가 날 수 있어요'],
  actions:[['한 번 더 하고 싶은지 물어봐요.','친구가 스스로 선택할 수 있어요.'],
           ['규칙을 바꿔서 해볼지 제안해요.','놀이 방식을 협의할 수 있어요.'],
           ['잠깐 다른 놀이를 해요.','쉬거나 전환하는 방법도 있어요.']]},
 {icon:'🌳',
  scenes:['친구가 혼자 벤치에 앉아 있어요.','쉬는 시간마다 혼자 있는 친구가 보여요.','친구가 혼자 있고 싶다고 했는데 다른 친구가 계속 말을 걸어요.'],
  feelings:['편안할 수도 있어요','외로울 수도 있어요','조용히 쉬고 싶을 수 있어요'],
  actions:[['함께할지 한 번 물어봐요.','함께하고 싶은지 확인하는 방법이에요.'],
           ['혼자 쉬고 싶다면 존중해요.','혼자 있는 것이 잘못된 것은 아니에요.'],
           ['나중에 같이할지 물어봐요.','시간을 선택할 수 있게 할 수 있어요.']]},
 {icon:'🚌',
  scenes:['버스를 놓쳐서 친구가 늦었어요.','친구가 약속에 늦으면서 연락도 하지 못했대요.','기다리던 친구는 걱정했고, 늦은 친구도 당황했을 것 같아요.'],
  feelings:['당황할 수 있어요','걱정될 수 있어요','미안할 수 있어요'],
  actions:[['무슨 일이 있었는지 먼저 물어요.','이유를 확인하는 것이 도움이 돼요.'],
           ['다음엔 연락해 주면 좋겠다고 말해요.','자신이 바라는 점을 구체적으로 말할 수 있어요.'],
           ['늦은 친구의 마음도 물어봐요.','서로의 입장을 알아볼 수 있어요.']]},
 {icon:'📚',
  scenes:['친구가 책을 읽는데 옆에서 소란스러워요.','조용히 공부하고 싶은 친구와 이야기하고 싶은 친구가 함께 있어요.','조용한 장소가 필요한데 친구들이 계속 이야기를 걸어요.'],
  feelings:['집중하기 어려울 수 있어요','답답할 수 있어요','괜찮을 수도 있어요'],
  actions:[['조금 조용히 해줄 수 있는지 물어요.','정중히 요청하는 방법이에요.'],
           ['조용한 곳으로 옮겨요.','장소를 바꾸는 선택도 가능해요.'],
           ['언제 같이 이야기할지 정해요.','두 사람의 바람을 조정할 수 있어요.']]},
 {icon:'🎂',
  scenes:['친구의 생일을 깜빡했어요.','친구의 생일을 뒤늦게 알았는데 친구가 아무 말도 하지 않았어요.','친구의 생일을 잊은 사람이 미안해하고, 생일인 친구는 괜찮다고 해요.'],
  feelings:['서운할 수 있어요','괜찮을 수도 있어요','미안할 수 있어요'],
  actions:[['늦게라도 축하한다고 말해요.','진심을 표현할 수 있어요.'],
           ['잊어서 미안했다고 말해요.','실수를 인정하는 방법이에요.'],
           ['친구의 기분을 물어봐요.','상대가 어떻게 느꼈는지 확인할 수 있어요.']]},
 {icon:'🖍️',
  scenes:['친구가 색연필을 빌려달라고 했어요.','내가 쓰는 색연필을 계속 빌려달라고 해요.','계속 부탁하는 친구에게 거절했더니 친구가 말을 줄였어요.'],
  feelings:['부담스러울 수 있어요','괜찮을 수도 있어요','서운할 수 있어요'],
  actions:[['지금 쓰고 있어서 나중에 빌려줄게라고 해요.','상황을 설명하며 경계를 말할 수 있어요.'],
           ['지금은 빌려주기 어렵다고 말해요.','거절해도 괜찮아요.'],
           ['다른 색을 써도 될지 물어봐요.','가능한 대안을 찾을 수 있어요.']]},
 {icon:'🧑‍🤝‍🧑',
  scenes:['두 친구가 서로 다른 놀이를 하고 싶대요.','모둠에서 하고 싶은 활동이 서로 달라 의견이 엇갈려요.','친구 두 명이 각자 자기 의견을 고집해 모둠 활동이 멈췄어요.'],
  feelings:['답답할 수 있어요','고민될 수 있어요','다른 생각이 재미있을 수도 있어요'],
  actions:[['각자 원하는 걸 먼저 들어봐요.','서로의 바람을 정확히 알 수 있어요.'],
           ['순서를 정해 번갈아 해요.','모두가 기회를 가질 수도 있어요.'],
           ['모두 괜찮은 다른 놀이를 찾아봐요.','새로운 대안을 만드는 방법이에요.']]},
 {icon:'🚲',
  scenes:['친구가 자전거를 배우다가 멈췄어요.','친구가 여러 번 넘어지고 나서 다시 타기를 망설여요.','친구가 다시 타겠다고 말하지만 넘어질까 봐 걱정도 한다고 해요.'],
  feelings:['무서울 수 있어요','아쉬울 수 있어요','도전하고 싶을 수 있어요'],
  actions:[['쉬었다가 해도 된다고 말해요.','선택할 시간을 줄 수 있어요.'],
           ['헬멧이나 안전장비를 확인해요.','안전을 먼저 살피는 방법이에요.'],
           ['도움을 원하는지 물어봐요.','원치 않는 도움을 강요하지 않을 수 있어요.']]},
 {icon:'🫧',
  scenes:['친구가 비눗방울 놀이를 그만하고 싶대요.','친구는 더 놀고 싶지만 나는 피곤해졌어요.','한 친구는 놀이를 계속하고 싶어 하고 다른 친구는 쉬고 싶어 해요.'],
  feelings:['아쉬울 수 있어요','피곤할 수 있어요','괜찮을 수도 있어요'],
  actions:[['쉬고 싶다고 솔직하게 말해요.','자신의 상태를 표현할 수 있어요.'],
           ['잠깐 쉬었다 다시할지 이야기해요.','함께 시간을 조정할 수 있어요.'],
           ['각자 다른 활동을 하기로 해요.','항상 같이 할 필요는 없어요.']]},
 {icon:'🏫',
  scenes:['새로운 친구가 반에 왔어요.','새로 온 친구가 쉬는 시간에 교실 문 근처에 서 있어요.','새로 온 친구가 아직 친한 친구가 없는 것 같지만 혼자 있고 싶은지는 몰라요.'],
  feelings:['낯설 수 있어요','궁금할 수 있어요','편안할 수도 있어요'],
  actions:[['교실을 안내해줄지 물어봐요.','도움이 필요한지 확인할 수 있어요.'],
           ['함께 놀고 싶은지 물어봐요.','선택할 수 있도록 초대할 수 있어요.'],
           ['혼자 살펴볼 시간을 줘요.','혼자 있을 권리도 존중할 수 있어요.']]}
];
function storyRound(){
 const base=storyBank[state.level];
 const extras=extraStoryBank.map((entry,i)=>({
  icon:entry.icon,
  scene:entry.scenes[opts.indexOf(state.level)],
  feelings:entry.feelings,
  actions:entry.actions
 }));
 return roundItem([...base,...extras]);
}

function drawFeel(){
 const r=storyRound();if(!state.stage)state.stage='emotion';
 if(state.stage==='emotion'){
  setScene('어떤 마음일 수 있을까요?','여러 마음이 가능해요. 가장 먼저 떠오르는 생각을 골라봐요.','상황 살펴보기');
  $('gameArea').innerHTML='<div class="story-card story-stage"><div class="story-cast"><img src="../../assets/moa-discovery.png" alt="" aria-hidden="true"><span class="story-icon" aria-hidden="true">'+r.icon+'</span></div><p>'+esc(r.scene)+'</p><button type="button" class="story-listen" data-say-scene>상황 듣기 ▶</button></div><div class="emotion-options">'+r.feelings.map((v,i)=>'<button type="button" class="choice" data-feeling="'+i+'">'+esc(v)+'</button>').join('')+'</div>';
 }else if(state.stage==='response'){
  setScene('어떻게 해볼까요?','방법을 골라보고 어떤 일이 생길지 생각해봐요.','함께 생각하기');
  $('gameArea').innerHTML='<div class="story-card small story-stage"><div class="story-cast"><img src="../../assets/moa-discovery.png" alt="" aria-hidden="true"><span class="story-icon" aria-hidden="true">'+r.icon+'</span></div><p>'+esc(r.scene)+'</p><button type="button" class="story-listen" data-say-scene>상황 듣기 ▶</button></div><p class="selected-feeling">조금 전 생각한 마음: <strong>'+esc(state.chosenFeeling)+'</strong></p><div class="response-options">'+r.actions.map((a,i)=>'<button type="button" class="choice" data-response="'+i+'">'+esc(a[0])+'</button>').join('')+'</div>';
 }else{setScene('생각을 나눠봤어요','정답이 하나로 정해진 상황은 아니에요. 사람마다 다르게 느끼고 반응할 수 있어요.','함께 돌아보기');
 $('gameArea').innerHTML='<div class="reflect-note"><span aria-hidden="true">💬</span><strong>'+esc(state.chosenFeeling)+'</strong><p>'+esc(state.chosenResponse[1])+'</p><small>만약 상대가 예상과 다르게 반응한다면? 마음을 다시 물어보거나 다른 방법을 생각할 수도 있어요.</small></div>';
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
 const b=e.target.closest('button');if(!b)return;
 if(chosen==='feel'&&b.hasAttribute('data-say-scene')){speak(storyRound().scene,{force:true});return;}
 if(state.locked)return;
 if(chosen==='money'){
  if(b.dataset.value!==undefined){const n=Number(b.dataset.value),expected=moneyRound().value;state.attempts++;if(n===expected){if(state.attempts===1)state.correct++;nextAction('맞았어요! '+fmt(expected)+'이에요.')}else feedback('다시 살펴봐요. 그림에 적힌 금액과 비교해도 좋아요.');return;}
  if(b.dataset.removeIndex!==undefined){state.selected.splice(Number(b.dataset.removeIndex),1);drawMoney();return;}
  if(b.dataset.money!==undefined){
   if(state.selected.length>=20){feedback('너무 많이 담았어요. 하나씩 다시 살펴봐요.');return}
   const value=Number(b.dataset.money);state.selected.push(value);drawMoney();
   if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)$('cartItems')?.lastElementChild?.classList.add('bag-money-arrived');
   $('gameArea').querySelector('[data-money="'+value+'"]')?.focus({preventScroll:true});return;
  }
 }
 if(chosen==='change'&&b.dataset.item!==undefined){
 const item=b.dataset.item;
 const removing=state.selected.includes(item);
 if(removing)state.selected=state.selected.filter(x=>x!==item);
 else state.selected.push(item);
 drawChange();
 if(!removing&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)$('gameArea').querySelector('.assembled-cart .item-chip:last-child')?.classList.add('bag-money-arrived');
 $('gameArea').querySelector('[data-item="'+item+'"]')?.focus({preventScroll:true});return;
 }
 if(chosen==='change'&&b.dataset.listIndex!==undefined){
  const answer=changedRound().after;const chosenList=state.options[Number(b.dataset.listIndex)];
  state.attempts++;if(chosenList.join('|')===answer.join('|')){if(state.attempts===1)state.correct++;nextAction('변경된 목록을 잘 반영했어요!')}else feedback('한 가지씩 비교해봐요. 처음 목록을 다시 볼 수도 있어요.');return;
 }
 if(chosen==='feel'){
  const r=storyRound();
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
  if(sum===target){if(state.attempts===1)state.correct++;nextAction('맞았어요! '+fmt(target)+'을 정확히 만들었어요.');$('gameActions').insertAdjacentHTML('afterbegin',htmlButton('다른 방법으로 만들기','remake','class="secondary-action"'))}
  else feedback(sum>target?'조금 많아요. '+fmt(sum-target)+'만큼 더 담았어요.':'조금 부족해요. '+fmt(target-sum)+'을 더 담아야 해요.');
  return;
 }
 if(action==='remake'){state.locked=false;state.selected=[];drawMoney();feedback('같은 금액을 다른 돈으로도 만들어볼까요?');return;}
 if(action==='undo'){state.selected.pop();drawMoney();return;}
 if(action==='clear'){state.selected=[];drawMoney();return;}
 if(action==='changed-go'){state.stage=state.level==='hard'&&state.index%2===0?'assemble':'choose';draw();return;}
 if(action==='check-list'&&chosen==='change'){
  const expected=changedRound().after;
  state.attempts++;
  if(state.selected.length===expected.length&&state.selected.every(v=>expected.includes(v))){
   if(state.attempts===1)state.correct++;nextAction('준비물을 모두 바르게 챙겼어요!');
  }else feedback('목록을 다시 비교해봐요. 필요한 물건은 '+expected.length+'개예요.');
  return;
 }
 if(action==='changed-back'){state.stage='remember';draw();return;}
});
function speak(text,{force=false}={}){
 if((!state.audio&&!force)||!('speechSynthesis' in window))return;
 try{window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='ko-KR';utterance.rate=.88;window.speechSynthesis.speak(utterance)}
 catch{feedback('이 기기에서는 소리 안내를 재생할 수 없어요.')}
}
document.getElementById('missionListen')?.addEventListener('click',()=>{
 const title=$('missionHeading').textContent;
 const cue=chosen==='feel'?storyRound().scene:chosen==='change'?changedRound().note:($('missionDescription').textContent||'');
 speak(title+'. '+cue,{force:true});
});
$('soundButton').addEventListener('click',()=>{
 state.audio=!state.audio;$('soundButton').setAttribute('aria-pressed',String(state.audio));
 $('soundButton').textContent=state.audio?'🔊 안내 읽기 켜짐':'🔇 안내 읽기';
 if(!state.audio){window.speechSynthesis?.cancel?.()}else speak($('missionHeading').textContent+' '+$('missionDescription').textContent);
});
show('intro');
})();

(()=>{'use strict';
const $=id=>document.getElementById(id), STEPS=[['🧺','담아보기'],['👀','그림·덧셈'],['✖️','곱셈식'],['🔟','자리 나누기'],['✏️','혼자 풀기']];
const REVIEW=[
 [{a:23,b:2,type:'symbol'},{a:14,b:3,type:'symbol'},{a:12,b:3,type:'story',thing:'📚',container:'🎒',word:'책가방이 3개 있어요. 가방 하나에 책이 12권씩 있어요. 모두 몇 권일까요?'},{a:32,b:3,type:'symbol'}],
 [{a:21,b:3,type:'symbol'},{a:24,b:2,type:'symbol'},{a:13,b:4,type:'story',thing:'🖍️',container:'📦',word:'상자 4개가 있어요. 상자 하나에 색연필 13자루씩 들어 있어요. 모두 몇 자루일까요?'},{a:22,b:3,type:'symbol'}],
 [{a:14,b:4,type:'symbol'},{a:32,b:2,type:'symbol'},{a:23,b:3,type:'story',thing:'🧸',container:'🧺',word:'바구니 3개가 있어요. 바구니 하나에 인형이 23개씩 들어 있어요. 인형은 모두 몇 개일까요?'},{a:11,b:4,type:'symbol'}]
];
const S={step:0,sub:0,groups:[0,0,0],active:0,round:0,done:false,incorrect:0,assisted:false,stageHint:false,typed:'',testIndex:0,testScore:0,testTotalErrors:0,testHelp:0,testRun:0,voice:false,scoreList:[]};
const apple=(size='')=>'<span class="apple '+size+'" aria-hidden="true">🍎</span>';
const ten=(small=false)=>'<span class="tenframe'+(small?' small':'')+'" role="img" aria-label="사과 10개">'+Array.from({length:10},()=>apple()).join('')+'</span>';
const group=n=>Array.from({length:n},()=>apple('sm')).join('');
const html=(id,content)=>{$(id).innerHTML=content};
const cur=()=>STEPS[S.step];
function say(message){if(!S.voice || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window))return;try{window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(message);utterance.lang='ko-KR';utterance.rate=.86;window.speechSynthesis.speak(utterance)}catch{}}
function stageHint(message){S.assisted=true;S.stageHint=true;message=message||'그림을 다시 보고 묶음 수와 한 묶음의 개수를 비교해 봐.';feedback('💡 '+message,'helped');say(message)}
function feedback(message,type=''){$('feedback').textContent=message;$('feedback').className='feedback '+type}
function progress(){html('progress',STEPS.map(([icon,label],i)=>'<div class="progress-item '+(i===S.step?'active':i<S.step?'done':'')+'" aria-current="'+(S.step===i?'step':'false')+'"><span class="p-icon">'+icon+'</span><span>'+label+'</span></div>').join(''))}
function setupStep(){
 S.sub=0;S.round=0;S.groups=[0,0,0];S.active=0;S.incorrect=0;S.assisted=false;S.stageHint=false;S.done=false;S.typed='';
 progress();$('stepChip').textContent=(S.step+1)+' / 5 · '+cur()[0];$('stepTitle').textContent=cur()[1];$('advance').hidden=true;
 $('helper').hidden=S.step===5;
 render();window.scrollTo({top:0,behavior:'smooth'});
}
function gotoStep(step){S.step=Math.max(0,Math.min(4,step));setupStep()}
function scene(values,kind='apple',mode='plain'){
 return '<div class="scene-grid">'+Array.from({length:values.length},(_,i)=>{
 const n=values[i],item=kind==='apple'?group(n):Array.from({length:n},()=>'<span class="apple sm" aria-hidden="true">'+kind+'</span>').join('');
 return '<div class="scene-card"><span class="scene-object" aria-hidden="true">'+['🐰','🐻','🐿️','🦊','🦔'][i%5]+'</span><div class="basket-items" aria-label="'+(i+1)+'번째 묶음 '+n+'개">'+item+'</div>'+(mode==='digits'?'<strong>'+n+'</strong>':'')+'</div>';
 }).join('')+'</div>';
}
function tensScene(a,b,focus='all'){
 const tens=Math.floor(a/10),ones=a%10;
 return '<div class="scene-grid">'+Array.from({length:b},(_,i)=>{
 const t=Array.from({length:tens},()=>ten(true)).join(''),s=Array.from({length:ones},()=>apple('xs')).join('');
 return '<div class="scene-card"><span class="scene-object" aria-hidden="true">'+['🐰','🐻','🐿️','🦊','🦔','🐼','🐸','🐹','🐯'][i]+'</span><div class="ten-visual '+(focus==='ones'?'deemph':'')+'" aria-label="10개 묶음 '+tens+'개">'+t+'</div><div class="small-apple-row '+(focus==='tens'?'deemph':'')+'" aria-label="낱개 '+ones+'개">'+s+'</div></div>';
 }).join('')+'</div>';
}
function showChoice(q,items,correct,hint){
 $('prompt').textContent=q;html('options',items.map((x,i)=>'<button type="button" data-choice="'+i+'">'+x+'</button>').join(''));$('options').hidden=false;$('keypad').hidden=true;
 S.expected=String(correct);S.hint=hint||'그림을 한 묶음씩 살펴봐.';S.done=false;
 $('advance').hidden=true;feedback('👀　→　👆');
}
function askedAnswer(value,button){
 if(S.done)return;
 if(String(value)===S.expected){
  S.done=true;
  if(button)button.classList.add('correct');
  Array.from($('options').querySelectorAll('button')).forEach(x=>x.disabled=true);
  feedback('✅ 맞았어! 스스로 확인했어. 🌼','good');
  $('advance').hidden=false;S.incorrect=0;S.assisted=false;say('맞았어요! 다음으로 가 볼까요?');
 }else{
  S.incorrect++;S.assisted=true;S.testTotalErrors+=S.step===4?1:0;
  if(button)button.classList.add('wrong');
  feedback('↶　👀 다시 살펴봐.','retry');
  say('다시 생각해 봐요. 그림이나 곱셈식을 확인해 보세요.');
  if(S.incorrect>=2)$('helper').classList.add('encourage');
 }
}
$('options').addEventListener('click',e=>{const b=e.target.closest('button[data-choice]');if(!b||b.disabled)return;askedAnswer(b.textContent,b)});
function renderFill(){
 $('stepTitle').textContent='사과를 직접 담아봐';
 $('prompt').textContent=S.active<3?'🍎 2개씩 → 🧺 3개':'🧺 🧺 🧺 → 🍎 모두 몇 개?';
 const boxes=S.groups.map((c,i)=>{
  const slots=Array.from({length:2},(_,k)=>k<c?apple('sm'):'<span class="basket-empty" aria-hidden="true"></span>').join('');
  return '<div class="basket-card '+(i===S.active?'active':'')+'"><span class="basket-face" aria-hidden="true">'+['🐰','🐻','🐿️'][i]+'</span><span class="basket-icon">🧺</span><span class="basket-items">'+slots+'</span><span class="basket-count">'+c+' / 2</span></div>';
 }).join('');
 html('stage','<div class="basket-grid">'+boxes+'</div>'+(S.active<3?'<div class="pick-controls"><button id="addOne" class="tap-apple" type="button" aria-label="사과 한 개를 현재 바구니에 담기">'+apple()+' <span>+1 👆</span></button><button id="undoOne" class="icon-back" type="button" aria-label="마지막 사과 한 개 되돌리기" '+(S.groups[S.active]===0?'disabled':'')+'>↶</button></div>':'<div class="math-display">2 + 2 + 2 = ?</div>'));
 $('helper').hidden=false;
 if(S.active<3){html('options','');$('keypad').hidden=true;feedback('🍎 👆 → 🧺');return}
 showChoice('🧺 3개 · 2개씩 → 모두?', ['6','5','8'],'6','2개씩 세 바구니에 있어. 2 + 2 + 2를 계산해 봐.');
}
function renderRepresent(){
 $('stepTitle').textContent='그림이 덧셈이 돼';
 html('stage',scene([3,3,3,3])+(S.sub===0?'<div class="math-display">3 · 3 · 3 · 3</div>':'<div class="math-display">3 + 3 + 3 + 3 = ?</div>'));
 $('helper').hidden=false;
 if(S.sub===0)showChoice('👀 그림을 나타내는 덧셈은?', ['3 + 3 + 3 + 3','3 + 4','4 + 4 + 4'],'3 + 3 + 3 + 3','친구 네 명이 각각 3개씩 가지고 있어.');
 else showChoice('3 + 3 + 3 + 3 = ?', ['9','12','15'],'12','3을 네 번 더해 봐.');
}
function renderSymbol(){
 $('stepTitle').textContent='곱셈식으로 바꿔봐';
 html('stage',scene([4,4,4])+(S.sub===0?'<div class="number-sentence">🍎 4개씩 · 🧺 3묶음</div>':'<div class="math-display">4 × 3 ↔ ?</div>'));
 $('helper').hidden=false;
 if(S.sub===0)showChoice('👀 그림에 맞는 곱셈식은?', ['4 × 3','4 + 3','4 × 4'],'4 × 3','한 묶음에 4개, 그런 묶음이 3개야. 4를 3번 더하는 뜻이야.');
 else showChoice('4 × 3과 같은 덧셈은?', ['4 + 4 + 4','4 + 3','3 + 3 + 3'],'4 + 4 + 4','4개씩 3묶음이니까 4를 세 번 더해.');
}
function guidedItems(){
 const data=[{a:12,b:3},{a:31,b:3}][S.round],tenVal=Math.floor(data.a/10)*10,ones=data.a%10;
 const result=[
 {label:data.a+' = ? + ?',choices:[tenVal+' + '+ones,tenVal+' + '+data.b,data.a+' + '+ones],answer:tenVal+' + '+ones,hint:'사과 '+data.a+'개를 10개 묶음과 낱개로 나누어 봐.'},
 {label:tenVal+' × '+data.b+' = ?',choices:[String(tenVal*data.b),String(tenVal*(data.b+1)),String(tenVal+data.b)],answer:String(tenVal*data.b),hint:'10개 묶음이 몇 개인지 세고 10을 곱해.'},
 {label:ones+' × '+data.b+' = ?',choices:[String(ones*data.b),String(ones+data.b),String(ones*data.b+2)],answer:String(ones*data.b),hint:'각 친구에게 낱개 사과가 '+ones+'개씩 있어.'},
 {label:(tenVal*data.b)+' + '+(ones*data.b)+' = ?',choices:[String(data.a*data.b),String(data.a*data.b+3),String(tenVal*data.b)],answer:String(data.a*data.b),hint:'십의 자리 곱셈 결과와 일의 자리 곱셈 결과를 더해.'}
 ];return {data,result,item:result[S.sub]};
}
function renderGuided(){
 const {data,item}=guidedItems();
 $('stepTitle').textContent=S.round===0?'12 × 3 : 10개씩 묶어봐':'31 × 3 : 자리를 나눠봐';
 const focus=S.sub===1?'tens':S.sub===2?'ones':'all';
 html('stage',tensScene(data.a,data.b,focus)+'<div class="number-sentence">'+item.label+'</div>');
 $('helper').hidden=false;
 showChoice('🔟 그림을 보고 계산해 봐',item.choices,item.answer,item.hint);
}
function currentTest(){return REVIEW[S.testRun%REVIEW.length][S.testIndex]}
function renderTest(){
 const data=currentTest();
 $('stepTitle').textContent='새 문제, 혼자 풀어봐';
 $('prompt').textContent=(S.testIndex+1)+' / 4　✏️　답을 직접 입력해 봐';
 const symbols=data.type==='story'?'<div class="context-card"><span class="context-icons">'+data.container+'　'+data.thing+' '+data.a+'　×　'+data.b+'</span>'+data.word+'<br><button type="button" id="readProblem" class="helper" aria-label="상황 문제 음성으로 듣기">🔊 듣기</button></div>':'<div class="math-display">'+data.a+' × '+data.b+' = ?</div><p class="support-note">그림 없이 계산해 봐. 계산식은 스스로 만들 수 있어.</p>';
 html('stage',symbols);
 $('options').hidden=true;html('options','');$('keypad').hidden=false;
 $('helper').hidden=false;$('advance').hidden=true;
 html('keypad','<div class="keypad-screen" id="typed" role="status" aria-label="입력한 숫자">'+(S.typed||'？')+'</div>'+[[1,2,3],[4,5,6],[7,8,9],['⌫',0,'✔']].map(row=>row.map(k=>'<button type="button" data-key="'+k+'" class="'+(k==='✔'?'key-check':k==='⌫'?'key-delete':'')+'">'+k+'</button>').join('')).join(''));
 feedback('✏️　→　✔');S.done=false;
}
function submitTest(){
 const question=currentTest();if(S.done)return;
 if(!S.typed){feedback('🔢　숫자를 눌러 봐.','retry');return}
 const ok=Number(S.typed)===question.a*question.b;
 if(ok){
  if(S.incorrect===0&&!S.assisted)S.testScore++;
  S.scoreList.push({q:question.a+' × '+question.b,firstTry:S.incorrect===0&&!S.assisted,hints:S.stageHint,errors:S.incorrect});
  S.done=true;$('advance').hidden=false;$('keypad').hidden=true;
  feedback('✅　잘 풀었어! 🌼','good');say('맞았어요. 다음 문제로 넘어가요.');
 }else{
  S.incorrect++;S.testTotalErrors++;
  feedback('↶　다시 계산해 봐.','retry');
  say('아직 달라요. 십의 자리와 일의 자리를 나눠 계산해 보세요.');
  if(S.incorrect>=2)stageHint('예: 23 × 2는 20 × 2와 3 × 2로 나눌 수 있어. 같은 방법을 적용해 봐.');
 }
}
$('keypad').addEventListener('click',e=>{
 const btn=e.target.closest('button[data-key]');if(!btn||S.step!==4||S.done)return;
 const key=btn.dataset.key;
 if(key==='✔')submitTest();else if(key==='⌫')S.typed=S.typed.slice(0,-1);else if(S.typed.length<4)S.typed+=key;
 $('typed').textContent=S.typed||'？';
});
document.addEventListener('keydown',e=>{
 if(S.step!==4||S.done||!$('keypad')||$('keypad').hidden)return;
 if(e.key>='0'&&e.key<='9'){if(S.typed.length<4)S.typed+=e.key}
 else if(e.key==='Backspace'){S.typed=S.typed.slice(0,-1)}
 else if(e.key==='Enter'){submitTest()}
 else return;
 $('typed').textContent=S.typed||'？';
});
$('stage').addEventListener('click',e=>{
 if(S.step===0&&!S.done&&S.active<3){
  if(e.target.closest('#addOne')){
   if(S.groups[S.active]>=2)return;S.groups[S.active]++;
   if(S.groups[S.active]===2){S.active++;say('친구 한 명의 바구니가 가득 찼어요.');}
   renderFill();
  }
  if(e.target.closest('#undoOne')&&S.groups[S.active]>0){S.groups[S.active]--;renderFill()}
 }
 if(e.target.closest('#readProblem')&&S.step===4){S.assisted=true;S.stageHint=true;S.testHelp++;say(currentTest().word)}
});
$('helper').addEventListener('click',()=>{
 if(S.step===4){
  S.testHelp++;S.stageHint=true;S.assisted=true;
  const q=currentTest(),t=Math.floor(q.a/10)*10,o=q.a%10;
  stageHint(q.a+' = '+t+' + '+o+'. 따라서 '+q.a+' × '+q.b+'는 '+t+' × '+q.b+'와 '+o+' × '+q.b+'로 나누어 계산할 수 있어.');
  return;
 }
 if(S.step===0){
  stageHint('사과 하나를 누르면 바구니에 하나씩 들어가. 두 개를 채우고 다른 친구에게도 똑같이 넣어 봐.');
 }else stageHint(S.hint||'같은 수의 묶음을 차례대로 세어 봐.');
});
$('advance').addEventListener('click',()=>{
 if(!S.done)return;
 if(S.step===0){gotoStep(1);return}
 if(S.step===1){if(S.sub===0){S.sub=1;S.done=false;S.incorrect=0;S.assisted=false;renderRepresent()}else gotoStep(2);return}
 if(S.step===2){if(S.sub===0){S.sub=1;S.done=false;S.incorrect=0;S.assisted=false;renderSymbol()}else gotoStep(3);return}
 if(S.step===3){
  if(S.sub<3){S.sub++;S.done=false;S.incorrect=0;S.assisted=false;renderGuided()}
  else if(S.round===0){S.round=1;S.sub=0;S.done=false;S.incorrect=0;S.assisted=false;renderGuided()}
  else gotoStep(4);return;
 }
 if(S.step===4){
  if(S.testIndex<3){S.testIndex++;S.typed='';S.incorrect=0;S.assisted=false;S.stageHint=false;renderTest()}
  else showResult();
 }
});
$('retryStep').addEventListener('click',()=>{
 if(S.step===4){S.testIndex=0;S.testScore=0;S.testTotalErrors=0;S.testHelp=0;S.scoreList=[];S.testRun++;S.typed=''}
 setupStep();
});
function showResult(){
 S.step=5;progress();$('stepChip').textContent='🎓 독립 연습 확인';$('stepTitle').textContent='내가 푼 새 문제';
 $('prompt').textContent='맞힌 개수보다 혼자 해결했는지가 중요해.';
 const pass=S.testScore>=3&&S.testHelp===0;
 html('stage','<div class="score-card"><span style="font-size:55px">'+(pass?'🌼':'🌱')+'</span><strong>첫 시도 독립 해결</strong><div class="score">'+S.testScore+' / 4</div><p class="score-note">'+(pass?'이번 네 문제는 도움 없이 대부분 풀었어. 새로운 문제로 한 번 더 확인해 볼까?':'지금은 연습을 더 해보면 좋아. 십의 자리와 일의 자리를 나누어 계산해 보자.')+'</p><p class="score-note">💡 도움·듣기 '+S.testHelp+'회 · ↶ 다시 시도 '+S.testTotalErrors+'회</p><div class="next-choice"><button type="button" id="revisit" >🔟 계산 원리 다시</button><button type="button" class="main" id="retryTest">✏️ 새 문제 다시</button><a class="helper" href="../?g=3&t=2">단원 목록 ↗</a></div></div>');
 $('options').hidden=true;$('keypad').hidden=true;$('helper').hidden=true;$('advance').hidden=true;
 feedback('배운 것을 다른 문제에도 써 보는 연습이 필요해.');
 $('revisit').addEventListener('click',()=>gotoStep(3));
 $('retryTest').addEventListener('click',()=>{S.testRun++;S.testIndex=0;S.testScore=0;S.testTotalErrors=0;S.testHelp=0;S.scoreList=[];gotoStep(4)});
}
function render(){
 $('options').hidden=false;$('keypad').hidden=true;$('advance').hidden=true;
 $('helper').classList.remove('encourage');
 if(S.step===0)renderFill();
 if(S.step===1)renderRepresent();
 if(S.step===2)renderSymbol();
 if(S.step===3)renderGuided();
 if(S.step===4)renderTest();
}
$('voice').addEventListener('click',()=>{
 if(!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window)){feedback('이 기기는 음성 안내를 지원하지 않아.','retry');return}
 S.voice=!S.voice;$('voice').setAttribute('aria-pressed',String(S.voice));$('voice').setAttribute('aria-label',S.voice?'음성 안내 끄기':'한국어 음성 안내 켜기');$('voice').textContent=S.voice?'🔊':'🔈';
 if(S.voice)say($('stepTitle').textContent+'. '+$('prompt').textContent);else window.speechSynthesis.cancel();
});
window.MathLearningQA={getState:()=>({...S}),gotoStep,questions:REVIEW};
gotoStep(0);
})();
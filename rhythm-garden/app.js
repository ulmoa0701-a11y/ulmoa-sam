(()=>{'use strict';
const M=window.MoaPlay,$=M.$;
const bank={2:[[1,0],[0,1]],3:[[1,0,1],[0,1,1],[1,1,0]],4:[[1,0,1,0],[0,1,1,0],[1,1,0,1],[0,1,0,1]]};
let length=2,question=0,target=[1,0],answers=[],heard=false,correct=0,trials=0,makerLen=4,maker=Array(8).fill(false),turnLen=4,turn=[];
function mark(count,values,activeAt=-1,answer=false){
 const box=$(answer?'answerMarks':'echoMarks');box.style.setProperty('--count',String(count));box.replaceChildren();
 for(let i=0;i<count;i++){let d=document.createElement('div');d.className='mark';if(i===activeAt)d.classList.add('current');
 const value=values[i];if(value===1){d.classList.add('done');d.textContent='👏'}else if(value===0){d.classList.add('rest');d.textContent='🤫'}else d.textContent=String(i+1);
 box.append(d)}
}
function chooseNew(change=true){M.halt();$('listen').disabled=false;$('listenAgain').disabled=false;if(change)question++;let arr=bank[length];target=arr[question%arr.length].slice();answers=[];heard=false;mark(length,[]);mark(length,[],-1,true);
 $('hit').disabled=true;$('rest').disabled=true;$('checkEcho').disabled=true;M.putStatus('echoStatus','🔊 먼저 듣기를 눌러요.')}
function renderHint(){if(heard&&$('showHint').checked)mark(length,target);else mark(length,[])}
document.querySelectorAll('[data-length]').forEach(b=>b.addEventListener('click',()=>{length=Number(b.dataset.length);document.querySelectorAll('[data-length]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));question=0;chooseNew(false)}));
function demo(){M.halt();heard=false;$('hit').disabled=true;$('rest').disabled=true;$('listen').disabled=true;$('listenAgain').disabled=true;answers=[];mark(length,[],-1,true);
 M.putStatus('echoStatus','👂 듣고 있어요. 소리와 쉼을 구별해 보세요.');
 const ok=M.sequence(length,650,i=>{mark(length,[],i);if(target[i])M.instrument('clap',.13)},err=>{
  $('listen').disabled=false;$('listenAgain').disabled=false;
  if(err){M.putStatus('echoStatus',err.message,'warn');return}
  heard=true;$('hit').disabled=false;$('rest').disabled=false;renderHint();
  M.putStatus('echoStatus','이제 👏 소리 또는 🤫 쉼을 순서대로 눌러요.');
 });
 if(!ok){$('listen').disabled=false;$('listenAgain').disabled=false}
}
$('listen').addEventListener('click',demo);$('listenAgain').addEventListener('click',demo);
$('newEcho').addEventListener('click',()=>chooseNew(true));$('showHint').addEventListener('change',renderHint);
function input(v){if(!heard||answers.length>=length)return;answers.push(v);if(v){try{M.instrument('clap',.10)}catch(e){}}
 mark(length,answers,-1,true);$('checkEcho').disabled=answers.length!==length;M.putStatus('echoStatus',answers.length===length?'✓ 확인하기를 눌러요.':answers.length+'번째 박을 골랐어요.')}
$('hit').addEventListener('click',()=>input(1));$('rest').addEventListener('click',()=>input(0));
$('eraseEcho').addEventListener('click',()=>{answers=[];mark(length,answers,-1,true);$('checkEcho').disabled=true;M.putStatus('echoStatus','다시 하나씩 눌러요.')});
$('checkEcho').addEventListener('click',()=>{
 if(answers.length!==length)return;
 const win=answers.every((v,i)=>v===target[i]);trials++;if(win)correct++;
 $('echoCount').textContent='확인 '+trials+'회 · 일치 '+correct+'회';
 if(win)M.putStatus('echoStatus','🎉 순서가 똑같아요! 다음 문제도 해볼까요?','win');
 else {mark(length,target);M.putStatus('echoStatus','🙂 조금 달라요. 위의 박과 쉼을 보고 다시 들어볼 수 있어요.','warn')}
 $('checkEcho').disabled=true;
});
$('copyEcho').addEventListener('click',()=>M.copy(M.noteText('리듬정원 · 순서 따라하기',[
 '연습 박 수: '+length,'확인한 응답: '+trials+'회','일치한 응답: '+correct+'회',
 '참고: 정답 그림 단서 '+($('showHint').checked?'사용':'미사용')
]),'echoStatus'));
function makerDraw(){const e=$('makerGrid');e.replaceChildren();
 for(let i=0;i<makerLen;i++){let b=document.createElement('button');b.type='button';b.className='cell';b.dataset.step=i;b.textContent=maker[i]?'👏':'·';b.setAttribute('aria-label',(i+1)+'번째 박 '+(maker[i]?'소리':'쉼'));b.setAttribute('aria-pressed',String(maker[i]));b.addEventListener('click',()=>{maker[i]=!maker[i];makerDraw();M.putStatus('makerStatus',(i+1)+'번째 칸을 '+(maker[i]?'켰어요.':'껐어요.'));if(maker[i]){try{M.instrument('clap',.12)}catch(e){}}});e.append(b)}
}
document.querySelectorAll('[data-maker-length]').forEach(b=>b.addEventListener('click',()=>{M.halt();makerLen=Number(b.dataset.makerLength);document.querySelectorAll('[data-maker-length]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));makerDraw()}));
$('makerPlay').addEventListener('click',()=>{M.putStatus('makerStatus','▶ 한 칸씩 들려요.');
 M.sequence(makerLen,60000/Number($('makerTempo').value),i=>{document.querySelectorAll('#makerGrid .cell').forEach(x=>x.classList.toggle('current',Number(x.dataset.step)===i));if(maker[i])M.instrument('clap',.14)},err=>{document.querySelectorAll('#makerGrid .cell').forEach(x=>x.classList.remove('current'));M.putStatus('makerStatus',err?err.message:'다 들었어요. 칸을 고쳐서 다시 들어봐요.',err?'warn':'')});
});
$('makerStop').addEventListener('click',()=>{M.halt();document.querySelectorAll('#makerGrid .cell').forEach(x=>x.classList.remove('current'));M.putStatus('makerStatus','재생을 멈췄어요.')});
$('makerSample').addEventListener('click',()=>{M.halt();maker=Array(8).fill(false);[0,2,4,6].filter(i=>i<makerLen).forEach(i=>maker[i]=true);makerDraw();M.putStatus('makerStatus','예시를 넣었어요. 들어보기를 눌러요.')});
$('makerReset').addEventListener('click',()=>{M.halt();maker=Array(8).fill(false);makerDraw();M.putStatus('makerStatus','모든 칸을 지웠어요.')});
function turnDraw(){const e=$('turnMarks');e.style.setProperty('--count',String(turnLen));e.replaceChildren();
 for(let i=0;i<turnLen;i++){const d=document.createElement('div');d.className='mark';let v=turn[i];if(v===1){d.classList.add('done');d.textContent='👏'}else if(v===0){d.classList.add('rest');d.textContent='🤫'}else d.textContent=String(i+1);e.append(d)}
 const done=turn.length===turnLen;$('whoseTurn').textContent=done?'🎶 둘이 만든 리듬 완성!':(turn.length%2===0?'👩‍🏫 선생님 차례':'🧒 아이 차례');
 $('whoseTurn').classList.toggle('child',!done&&turn.length%2===1);
 $('turnHit').disabled=done;$('turnRest').disabled=done;$('turnPlay').disabled=!done;
}
function resetTurn(){M.halt();turn=[];turnDraw();M.putStatus('turnStatus','선생님부터 한 박씩 골라요.')}
document.querySelectorAll('[data-turn-length]').forEach(b=>b.addEventListener('click',()=>{turnLen=Number(b.dataset.turnLength);document.querySelectorAll('[data-turn-length]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));resetTurn()}));
function addTurn(v){if(turn.length>=turnLen)return;M.halt();turn.push(v);if(v)try{M.instrument('clap',.13)}catch(e){}turnDraw();M.putStatus('turnStatus',turn.length===turnLen?'만든 리듬을 함께 들어봐요.':turn.length+'박을 만들었어요. 다음 사람 차례!')}
$('turnHit').addEventListener('click',()=>addTurn(1));$('turnRest').addEventListener('click',()=>addTurn(0));
$('turnNew').addEventListener('click',resetTurn);$('turnUndo').addEventListener('click',()=>{M.halt();turn.pop();turnDraw();M.putStatus('turnStatus','마지막 한 박을 지웠어요.')});
$('turnPlay').addEventListener('click',()=>{if(turn.length!==turnLen)return;M.sequence(turnLen,650,i=>{const ms=[...$('turnMarks').children];ms.forEach((x,n)=>x.classList.toggle('current',n===i));if(turn[i])M.instrument('clap',.13)},err=>{[...$('turnMarks').children].forEach(x=>x.classList.remove('current'));M.putStatus('turnStatus',err?err.message:'차례로 만든 리듬을 들었어요.',err?'warn':'')})});
function showMode(mode){M.halt();$('listen').disabled=false;$('listenAgain').disabled=false;['echo','make','turn'].forEach(t=>{$(t+'Mode').hidden=mode!==t});document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.mode===mode)));
 const url=new URL(location.href);url.searchParams.set('mode',mode);history.replaceState(null,'',url);
}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>showMode(b.dataset.mode)));
chooseNew(false);maker=Array(8).fill(false);maker[0]=maker[2]=true;makerDraw();turnDraw();
const query=new URLSearchParams(location.search).get('mode');if(['echo','make','turn'].includes(query))showMode(query);
})();

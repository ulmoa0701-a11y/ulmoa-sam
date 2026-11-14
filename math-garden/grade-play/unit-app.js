/* Elementary units launcher. 2022 curriculum-aligned original practice, not textbook replicas. */
(function(){'use strict';
const C=window.MoaMathCurriculum,E=window.MoaUnitEngine;
if(!C||!E)return;
const el=id=>document.getElementById(id);
const state={grade:3,term:2,unit:0,sub:0,round:0,firstTry:0,assisted:false,solved:false,current:null,active:false};
const safeUrl=u=>{try{history.replaceState(null,'',u)}catch{}};
const url=(u=null,s=null)=>{let q='?g='+state.grade+'&t='+state.term;if(u!==null)q+='&u='+u;if(s!==null)q+='&s='+s;return location.pathname+q};
const key=(g,t,u,s)=>'moa-unit-math-v2-'+g+'-'+t+'-'+u+'-'+s;
const read=(g,t,u,s)=>{try{return JSON.parse(localStorage.getItem(key(g,t,u,s))||'null')}catch{return null}};
const save=(g,t,u,s,n)=>{try{localStorage.setItem(key(g,t,u,s),JSON.stringify({completed:true,at:new Date().toISOString(),firstTry:n,rounds:5}))}catch{}};
const $grades=el('grades'),$terms=el('terms'),$units=el('unitList');
const get=()=>C.get(state.grade,state.term);
el('catalogStats').innerHTML='<span>'+C.counts.terms+'개 학기</span><span>'+C.counts.units+'개 대단원</span><span>'+C.counts.topics+'개 소단원 놀이</span>';
function init(){
 const q=new URLSearchParams(location.search),g=Number(q.get('g')),t=Number(q.get('t'));
 if(Number.isInteger(g)&&g>=1&&g<=6)state.grade=g;
 if(t===1||t===2)state.term=t;
 $grades.innerHTML=Array.from({length:6},(_,i)=>'<button type="button" class="grade" data-grade="'+(i+1)+'" aria-pressed="false">'+(i+1)+'학년<small>'+(i<2?'기초 수학':i<4?'수학 탐험':'수학 도전')+'</small></button>').join('');
 $terms.innerHTML=[1,2].map(x=>'<button type="button" class="term" data-term="'+x+'" aria-pressed="false">'+x+'학기</button>').join('');
 $grades.addEventListener('click',e=>{const b=e.target.closest('[data-grade]');if(b)select(+b.dataset.grade,state.term)});
 $terms.addEventListener('click',e=>{const b=e.target.closest('[data-term]');if(b)select(state.grade,+b.dataset.term)});
 $units.addEventListener('click',e=>{const b=e.target.closest('[data-unit][data-sub]');if(b)play(+b.dataset.unit,+b.dataset.sub)});
 $units.addEventListener('toggle',e=>{const d=e.target;if(!d.matches('details.unit-card')||!d.open)return;Array.from($units.querySelectorAll('details.unit-card')).forEach(x=>{if(x!==d)x.open=false})},true);
 el('backToUnits').addEventListener('click',back);
 el('again').addEventListener('click',()=>play(state.unit,state.sub));
 el('another').addEventListener('click',back);
 el('hint').addEventListener('click',()=>{if(!state.active||state.solved)return;state.assisted=true;const f=el('feedback');f.textContent=state.current.hint;f.dataset.status='hint'});
 el('next').addEventListener('click',next);
 el('answers').addEventListener('click',e=>{const b=e.target.closest('button[data-answer]');if(!b||state.solved||!state.active)return;
   const ans=b.dataset.answer;if(ans===state.current.answer){state.solved=true;if(!state.assisted)state.firstTry++;
     b.classList.add('correct');el('answers').querySelectorAll('button').forEach(x=>x.disabled=true);
     el('hint').hidden=true;el('next').hidden=false;el('next').textContent=state.round===4?'모험 마무리 →':'다음 문제 →';
     const f=el('feedback');f.dataset.status='correct';f.textContent=state.assisted?'다시 생각하고 해결했어! 🌷':'스스로 찾았어! 🌼';
     progress(state.round+1);
   }else{state.assisted=true;b.classList.add('incorrect');b.disabled=true;
     const f=el('feedback');f.dataset.status='incorrect';f.textContent='조금 달라. 그림을 다시 보거나 힌트를 눌러 봐.'}
 });
 select(state.grade,state.term,false);
 const u=Number(q.get('u')),s=Number(q.get('s'));
 if(q.has('u')&&q.has('s')&&Number.isInteger(u)&&Number.isInteger(s)&&u>=0&&u<get().length&&s>=0&&s<get()[u].subtopics.length)play(u,s,false);
}
function select(grade,term,scroll=true){
 state.grade=grade;state.term=term;state.active=false;
 el('play').hidden=true;el('browse').hidden=false;
 Array.from($grades.children).forEach(x=>x.setAttribute('aria-pressed',String(+x.dataset.grade===grade)));
 Array.from($terms.children).forEach(x=>x.setAttribute('aria-pressed',String(+x.dataset.term===term)));
 el('selectedTerm').textContent=grade+'학년 '+term+'학기';
 const units=get();el('unitCount').textContent=units.length+'개 단원';
 $units.innerHTML=units.map((u,i)=>'<details class="unit-card" '+(i===0?'open':'')+' data-index="'+i+'"><summary><span class="unit-n">'+(i+1)+'</span><span><span class="unit-name">'+u.name+'</span><span class="unit-count">'+u.subtopics.length+'개 소단원</span></span><span class="unit-chevron" aria-hidden="true">›</span></summary><div class="subunit-list">'+u.subtopics.map((x,j)=>{
  const done=read(grade,term,i,j),medal=done?'🌼':'🌱';
  return '<button type="button" class="subunit" data-unit="'+i+'" data-sub="'+j+'"><span class="medal" aria-hidden="true">'+medal+'</span><span><b>'+(j+1)+'. '+x.title+'</b><small>'+(done?'한 번 해본 놀이':'5문제 · 다시 도전 가능')+'</small></span><span class="arrow" aria-hidden="true">→</span></button>';
 }).join('')+'</div></details>').join('');
 safeUrl(url());if(scroll)el('unit-title').scrollIntoView({behavior:'smooth',block:'start'});
}
function play(unit,sub,scroll=true){
 const units=get();if(!units[unit]||!units[unit].subtopics[sub])return;
 state.unit=unit;state.sub=sub;state.round=0;state.firstTry=0;state.assisted=false;state.solved=false;state.active=true;
 el('browse').hidden=true;el('play').hidden=false;el('done').hidden=true;el('questionPanel').hidden=false;
 el('playPath').textContent=state.grade+'학년 · '+state.term+'학기';
 el('playUnit').textContent=(unit+1)+'단원 · '+units[unit].name;
 el('play-title').textContent=units[unit].subtopics[sub].title;
 safeUrl(url(unit,sub));render();if(scroll)el('play').scrollIntoView({behavior:'smooth',block:'start'});
}
function progress(n){
 el('progress').style.width=(n*20)+'%';
 el('flowers').textContent='🌼'.repeat(n)+'○'.repeat(5-n);
 el('flowers').setAttribute('aria-label','5문제 중 '+n+'문제 해결');
}
function render(){
 state.solved=false;state.assisted=false;state.current=E.problem(get()[state.unit].subtopics[state.sub].mode);
 el('roundCount').textContent=(state.round+1)+' / 5 · 천천히 골라 봐';
 el('question').textContent=state.current.question;
 el('picture').innerHTML=state.current.art;
 const answers=el('answers');answers.replaceChildren();
 for(const choice of state.current.options){const b=document.createElement('button');b.type='button';b.className='answer';b.textContent=choice;b.dataset.answer=choice;answers.append(b)}
 const f=el('feedback');f.textContent='준비되면 답을 눌러 봐.';f.dataset.status='';
 el('hint').hidden=false;el('next').hidden=true;progress(state.round);
}
function next(){
 if(!state.solved)return;
 state.round++;
 if(state.round<5){render();el('question').tabIndex=-1;el('question').focus({preventScroll:true});return}
 el('questionPanel').hidden=true;el('done').hidden=false;progress(5);
 save(state.grade,state.term,state.unit,state.sub,state.firstTry);
 el('resultText').textContent='5문제를 모두 풀었어! 도움 없이 첫 시도에 찾은 문제는 '+state.firstTry+'개야. 힌트를 보고 푼 문제도 소중한 연습이야.';
 el('done').querySelector('h3').tabIndex=-1;el('done').querySelector('h3').focus({preventScroll:true});
}
function back(){select(state.grade,state.term,false);const d=$units.querySelectorAll('details')[state.unit];if(d){d.open=true;Array.from($units.querySelectorAll('details')).forEach(x=>{if(x!==d)x.open=false})}el('browse').scrollIntoView({behavior:'smooth',block:'start'})}
window.MoaUnitApp={select,play,back,state};
init();
})();
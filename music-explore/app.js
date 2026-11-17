(()=>{'use strict';
const M=window.MoaPlay,$=M.$;
const specs={
 tempo:{title:'빠르게? 천천히?',intro:'같은 소리를 네 번 들려줘요. 소리 사이의 시간 간격만 달라져요.',icons:['🐢','🐇'],labels:['천천히','빠르게'],samples:['🐢 느린 소리 들어보기','🐇 빠른 소리 들어보기']},
 pitch:{title:'높게? 낮게?',intro:'같은 악기와 길이로 한 음을 들려줘요. 음의 높이만 달라져요.',icons:['⬇️','⬆️'],labels:['낮은 소리','높은 소리'],samples:['⬇️ 낮은 음 들어보기','⬆️ 높은 음 들어보기']},
 dynamic:{title:'작게? 크게?',intro:'같은 높이와 길이로 한 음을 들려줘요. 소리의 세기만 달라져요.',icons:['🔉','🔊'],labels:['작은 소리','큰 소리'],samples:['🔉 작은 소리 들어보기','🔊 큰 소리 들어보기']}
};
let concept='tempo',target=0,heard=false,answered=false,level=0,counts={tempo:{n:0,yes:0},pitch:{n:0,yes:0},dynamic:{n:0,yes:0}};
function ready(v){document.querySelectorAll('[data-answer]').forEach(b=>b.disabled=!v)}
function updateCounts(){const x=counts[concept];$('trialCount').textContent='응답 '+x.n+'회 · 구별 성공 '+x.yes+'회'}
function configure(c){M.halt();concept=c;document.querySelectorAll('[data-concept]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.concept===c)));
 const d=specs[c];$('questionTitle').textContent=d.title;$('explanation').textContent=d.intro;
 $('leftEmoji').textContent=d.icons[0];$('leftLabel').textContent=d.labels[0];$('rightEmoji').textContent=d.icons[1];$('rightLabel').textContent=d.labels[1];
 $('exampleLow').textContent=d.samples[0];$('exampleHigh').textContent=d.samples[1];
 updateCounts();next();const url=new URL(location.href);url.searchParams.set('concept',c);history.replaceState(null,'',url)}
function next(){M.halt();$('exampleLow').disabled=false;$('exampleHigh').disabled=false;target=Math.random()<.5?0:1;heard=false;answered=false;ready(false);$('soundVisual').classList.remove('playing');$('playQuestion').disabled=false;$('playAgain').disabled=false;M.putStatus('result','🔊 먼저 문제 듣기를 눌러요.')}
function sound(c,value,done){M.halt();
 try{M.ensure()}catch(e){done(e);return}
 $('soundVisual').classList.add('playing');
 if(c==='tempo'){
  const contrast={0:[700,325],1:[830,240],2:[700,325],3:[575,460]}[level];const interval=contrast[value];
  M.sequence(4,interval,()=>M.tone(392,.115,.12),err=>{ $('soundVisual').classList.remove('playing');done(err)});
 }else{
  const pitch=c==='pitch'?({0:[261.63,523.25],1:[196,587.33],2:[329.63,440],3:[349.23,392]}[level][value]):392;
  const volume=c==='dynamic'?({0:[.028,.15],1:[.028,.17],2:[.065,.14],3:[.09,.115]}[level][value]):.12;
  try{M.tone(pitch,volume,.45,'sine');M.schedule(()=>{$('soundVisual').classList.remove('playing');done(null)},590)}catch(e){$('soundVisual').classList.remove('playing');done(e)}
 }
}
function listen(){heard=false;ready(false);$('playQuestion').disabled=true;$('playAgain').disabled=true;M.putStatus('result','👂 잘 들어보세요.');sound(concept,target,err=>{
 $('playQuestion').disabled=false;$('playAgain').disabled=false;
 if(err){M.putStatus('result',err.message,'warn');return}
 heard=true;if(!answered)ready(true);M.putStatus('result',answered?'같은 소리를 다시 들었어요. 새 문제를 선택해 주세요.':'이제 두 그림 중 하나를 눌러요.');
})}
document.querySelectorAll('[data-concept]').forEach(b=>b.addEventListener('click',()=>configure(b.dataset.concept)));
$('playQuestion').addEventListener('click',listen);$('playAgain').addEventListener('click',listen);$('newQuestion').addEventListener('click',next);
document.querySelectorAll('[data-answer]').forEach(b=>b.addEventListener('click',()=>{
 if(!heard||answered)return;answered=true;ready(false);const choice=Number(b.dataset.answer),win=choice===target;
 const cnt=counts[concept];cnt.n++;if(win)cnt.yes++;updateCounts();
 M.putStatus('result',win?'🎉 맞았어요! '+specs[concept].labels[target]+' 소리예요.':'🙂 이번 소리는 '+specs[concept].labels[target]+'였어요. 다시 듣고 새 문제에 도전해요.',win?'win':'warn');
}));
function example(value){M.putStatus('result',specs[concept].labels[value]+' 비교 예시를 들어봐요.');$('exampleLow').disabled=true;$('exampleHigh').disabled=true;
 sound(concept,value,err=>{$('exampleLow').disabled=false;$('exampleHigh').disabled=false;if(err)M.putStatus('result',err.message,'warn');else M.putStatus('result','비교했어요. 위의 문제를 다시 들을 수 있어요.')});
}
$('exampleLow').addEventListener('click',()=>example(0));$('exampleHigh').addEventListener('click',()=>example(1));
$('clearLog').addEventListener('click',()=>{counts={tempo:{n:0,yes:0},pitch:{n:0,yes:0},dynamic:{n:0,yes:0}};updateCounts();M.putStatus('result','이번 회기의 응답 횟수를 초기화했어요.')});
$('copyLog').addEventListener('click',()=>M.copy(M.noteText('음악탐험 · 익명 관찰 기록',[
 '빠르기: '+counts.tempo.n+'회 응답 / '+counts.tempo.yes+'회 일치',
 '높낮이: '+counts.pitch.n+'회 응답 / '+counts.pitch.yes+'회 일치',
 '셈여림: '+counts.dynamic.n+'회 응답 / '+counts.dynamic.yes+'회 일치',
 '지도 방식: 예시 듣기 후 2지선다 사용 가능'
]),'result'));
window.addEventListener('moa:music-level',e=>{const n=Number(e.detail?.level);if(![1,2,3].includes(n))return;level=n;document.documentElement.dataset.musicLevel=String(n);next();M.putStatus('result','이제 '+n+'단계 소리를 들어 보세요.')});
const query=new URLSearchParams(location.search).get('concept');configure(specs[query]?query:'tempo');
})();

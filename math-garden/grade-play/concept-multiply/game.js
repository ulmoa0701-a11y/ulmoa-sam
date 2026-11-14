/* 모아의 생각놀이터: 목표 그림 → 한 번 누르는 행동 → 즉각 변화.
   금액 만들기 놀이의 직접 담기, 숫자 단위 놀이의 10칸 상자 표상을 바탕으로 새로 제작.
   개념 이해·치료 효과를 검증하는 도구가 아니며 서버로 기록을 전송하지 않음. */
(()=>{
'use strict';
const LEVELS=[
 {each:2,friends:2,choices:[3,4,5]},
 {each:3,friends:2,choices:[5,7,6]},
 {each:4,friends:3,choices:[12,8,16]},
 {each:12,friends:3,choices:[24,36,39]},
 {each:31,friends:3,choices:[93,63,96]},
 {each:31,friends:9,choices:[270,279,288]},
 {each:42,friends:3,choices:[126,86,129]}
];
const FRIENDS=['friend-hong.png','friend-ru.png','friend-saem.png','friend-ti.png'];
const asset=i=>'../../../thinking-garden/assets/'+FRIENDS[i%FRIENDS.length];
const $=id=>document.getElementById(id);
const S={level:0,friend:0,baskets:[],phase:'fill',voice:false,locked:false,retries:0,hintUsed:0};
const n=()=>LEVELS[S.level],wantedPacks=()=>Math.floor(n().each/10),wantedSingles=()=>n().each%10;
const APPLE='<svg viewBox="0 0 64 64" class="apple-svg" aria-hidden="true"><defs><linearGradient id="appleGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f47c6f"/><stop offset="75%" stop-color="#d53e47"/></linearGradient></defs><path d="M31 17C26 10 15 12 11 18 2 31 12 53 23 55c4 1 6-2 9-2s5 3 9 2c11-2 21-24 12-37-4-6-16-8-22-1z" fill="url(#appleGrad)" stroke="#b9353b" stroke-width="2"/><path d="M32 16c1-6 3-10 7-13" stroke="#795b37" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M32 12C25 3 16 4 14 6c3 9 11 12 18 9z" fill="#6aa85a" stroke="#4d894e" stroke-width="1.7"/><ellipse cx="19" cy="26" rx="4" ry="7" fill="#ffd6c5" opacity=".65" transform="rotate(21 19 26)"/></svg>';
const apple=cls=>APPLE.replace('class="apple-svg"','class="apple-svg '+(cls||'')+'"');
const pack=cls=>'<span class="tenframe '+(cls||'')+'" role="img" aria-label="사과 열 개">'+Array.from({length:10},()=>apple('')).join('')+'</span>';
const ghostPack=cls=>'<span class="tenframe ghost '+(cls||'')+'" aria-hidden="true">'+Array.from({length:10},()=>'<span class="ghost-dot"></span>').join('')+'</span>';
const speechAvailable=()=>('speechSynthesis' in window&&'SpeechSynthesisUtterance' in window);
function speak(message){
 if(!S.voice||!speechAvailable())return;
 try{window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(message);utterance.lang='ko-KR';utterance.rate=.86;window.speechSynthesis.speak(utterance)}catch{}
}
function instruction(){
 if(S.phase==='fill'){
  const c=n();return c.each+'개씩 '+c.friends+'명의 친구에게 사과를 주어요. 아래쪽 사과 그림을 눌러 위의 바구니를 채워 보세요. 열 개 묶음이 필요한 마을에서는 사과 열 개가 들어 있는 상자도 눌러 보세요.';
 }
 if(S.phase==='count')return '친구들의 바구니를 보면서 모든 사과가 몇 개인지 세고, 아래 숫자 중 하나를 눌러요.';
 return '사과 배달 성공! 다음 마을을 눌러서 다른 수로 도전해 보세요.';
}
$('sound').addEventListener('click',()=>{
 if(!speechAvailable()){$('kidFeedback').textContent='🔇　👀 👆 🧺';return}
 S.voice=!S.voice;$('sound').setAttribute('aria-pressed',String(S.voice));
 $('sound').setAttribute('aria-label',S.voice?'음성 안내 끄기':'음성 안내 켜기');
 $('sound').textContent=S.voice?'🔊':'🔈';
 if(S.voice)speak(instruction());else window.speechSynthesis.cancel();
});
function reset(level){
 const m=LEVELS.length;
 S.level=Math.max(0,Math.min(m-1,level));
 S.friend=0;S.baskets=Array.from({length:n().friends},()=>({packs:0,singles:0}));
 S.phase='fill';S.locked=false;S.retries=0;S.hintUsed=0;
 $('levelList').innerHTML=LEVELS.map((x,i)=>'<button type="button" data-level="'+i+'" aria-pressed="'+String(S.level===i)+'">'+(i+1)+'단계　🍎 '+x.each+' × '+x.friends+'</button>').join('');
 $('levelList').querySelectorAll('[data-level]').forEach(b=>b.addEventListener('click',()=>{$('.level-switch')?.removeAttribute('open');reset(+b.dataset.level)}));
 $('stageNumber').textContent='🌱 '+(S.level+1)+' / '+LEVELS.length;
 $('flowers').innerHTML=Array.from({length:LEVELS.length},(_,i)=>'<span class="'+(i<S.level?'grown':'')+'">'+(i<S.level?'🌼':'○')+'</span>').join('');
 $('playScreen').hidden=false;$('countScreen').hidden=true;$('winScreen').hidden=true;
 $('ruleApple').innerHTML=apple('small');
 $('sourceApple').innerHTML=apple('');
 $('sourcePack').innerHTML=pack('');
 $('packSource').hidden=wantedPacks()===0;
 $('appleSource').hidden=wantedSingles()===0;
 renderFill();
 speak(instruction());
}
function showFeedback(msg,type=''){
 $('kidFeedback').className='kid-feedback '+type;
 $('kidFeedback').textContent=msg;
}
function basketUnits(b,ghosts=false,compact=false){
 const result=[];
 for(let i=0;i<wantedPacks();i++)result.push(i<b.packs?pack(compact?'tiny':''):ghosts?ghostPack('small'):'');
 for(let i=0;i<wantedSingles();i++)result.push(i<b.singles?apple(compact?'tiny':'small'):ghosts?'<span class="slot" aria-hidden="true"></span>':'');
 return result.join('');
}
function progressCount(b){return b.packs*10+b.singles}
function renderTrack(){
 const track=$('friendTrack');track.replaceChildren();
 S.baskets.forEach((b,i)=>{
   const sp=document.createElement('div');sp.className='friend-step '+(i<S.friend?'done':i===S.friend?'active':'');
   sp.setAttribute('aria-label',(i+1)+'번째 친구 '+(i<S.friend?'배달 완료':i===S.friend?'배달 중':'차례 대기'));
   sp.innerHTML='<img src="'+asset(i)+'" alt="" loading="eager">';
   track.appendChild(sp);
 });
}
function renderFill(){
 if(S.phase!=='fill')return;
 const c=n(),b=S.baskets[S.friend],num=progressCount(b);
 renderTrack();
 $('goalMath').textContent=c.each+' × '+c.friends;
 $('friendPortrait').src=asset(S.friend);
 $('friendPortrait').alt='배달을 기다리는 '+(S.friend+1)+'번째 친구';
 $('targetCount').textContent=num+' / '+c.each;
 $('basketItems').innerHTML=basketUnits(b,true,false);
 $('basketFrame').setAttribute('aria-label','목표 '+c.each+'개 중 '+num+'개 담은 바구니');
 $('undo').hidden=num===0||S.locked;
 $('sourceApple').classList.toggle('highlight',b.packs===wantedPacks()&&b.singles<wantedSingles());
 $('packSource').classList.toggle('highlight',b.packs<wantedPacks());
 $('appleSource').disabled=S.locked||b.singles>=wantedSingles();
 $('packSource').disabled=S.locked||b.packs>=wantedPacks();
 if(num===0)showFeedback('👆 🍎　→　🧺');
 else if(num===c.each)showFeedback('✅　🌼','good');
 else showFeedback('🧺 '+num+' / '+c.each+'　🍎');
}
function sparkle(element){
 if(!element||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const r=element.getBoundingClientRect();
 const s=document.createElement('span');s.className='sparkle';s.textContent='✨';
 s.style.left=(r.left+r.width/2)+'px';s.style.top=r.top+'px';
 document.body.append(s);window.setTimeout(()=>s.remove(),710);
}
function fly(token,source){
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const start=source.getBoundingClientRect(),dest=$('basketItems').getBoundingClientRect();
 const span=document.createElement('span');span.className='fly';
 span.style.left=(start.left+start.width/2)+'px';span.style.top=(start.top+start.height/2)+'px';
 span.innerHTML=token==='packs'?pack('tiny'):apple('small');
 document.body.append(span);
 const dx=dest.left+dest.width/2-(start.left+start.width/2),dy=dest.top+dest.height/2-(start.top+start.height/2);
 const anim=span.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:'translate(calc(-50% + '+dx+'px), calc(-50% + '+dy+'px)) scale(.45)',opacity:.15}],{duration:410,easing:'ease-out'});
 anim.onfinish=()=>span.remove();anim.oncancel=()=>span.remove();
}
function add(kind){
 if(S.phase!=='fill'||S.locked)return;
 const b=S.baskets[S.friend];
 if(kind==='packs' && (wantedPacks()===0||b.packs>=wantedPacks())){showFeedback('👀 ↶','retry');speak('이미 상자를 다 담았어요.');return}
 if(kind==='singles' && (wantedSingles()===0||b.singles>=wantedSingles())){showFeedback('👀 ↶','retry');speak('이미 낱개 사과를 다 담았어요.');return}
 const src=$(kind==='packs'?'packSource':'appleSource');
 b[kind]++;fly(kind,src);renderFill();
 if(progressCount(b)===n().each){
  S.locked=true;renderFill();sparkle($('basketFrame'));
  speak('참 잘했어요! '+(S.friend+1)+'번째 친구에게 사과를 다 담았어요.');
  window.setTimeout(()=>{
   if(S.phase!=='fill')return;
   if(S.friend===n().friends-1){S.phase='count';renderCount();}
   else{S.friend++;S.locked=false;renderFill();}
  },620);
 }
}
$('appleSource').addEventListener('click',()=>add('singles'));
$('packSource').addEventListener('click',()=>add('packs'));
$('undo').addEventListener('click',()=>{
 if(S.phase!=='fill'||S.locked)return;
 const b=S.baskets[S.friend];
 if(b.singles)b.singles--;else if(b.packs)b.packs--;
 renderFill();speak('되돌렸어요. 다시 넣어 보세요.');
});
function renderCount(){
 const c=n();
 $('playScreen').hidden=true;$('countScreen').hidden=false;$('winScreen').hidden=true;
 $('countEquation').textContent=c.each+' × '+c.friends+' = ?';
 $('countApple').innerHTML=apple('');
 $('collectedFriends').innerHTML=S.baskets.map((b,i)=>'<div class="collected-basket" aria-label="'+(i+1)+'번째 친구 사과 '+c.each+'개"><img src="'+asset(i)+'" alt=""><span class="collected-items">'+basketUnits(b,false,true)+'</span></div>').join('');
 $('choiceGrid').replaceChildren();
 c.choices.forEach(x=>{
  const btn=document.createElement('button');btn.type='button';btn.className='choice';btn.textContent=String(x);
  btn.setAttribute('aria-label','사과 모두 '+x+'개');
  btn.addEventListener('click',()=>{
    if(S.phase!=='count')return;
    if(x===c.each*c.friends){
      btn.classList.add('correct');S.phase='win';sparkle(btn);
      $('countFeedback').textContent='🌼 ✅';
      speak('맞았어요. 모두 '+x+'개! 사과 배달 성공!');
      window.setTimeout(()=>{if(S.phase==='win')renderWin()},500);
    }else{
      btn.classList.add('wrong');S.retries++;
      $('countFeedback').className='kid-feedback retry';
      $('countFeedback').textContent='👀 🧺　🔄';
      speak('한 번 더 바구니를 보면서 세어 봐요.');
      window.setTimeout(()=>btn.classList.remove('wrong'),450);
    }
  });
  $('choiceGrid').append(btn);
 });
 $('countFeedback').className='kid-feedback';
 $('countFeedback').textContent='👀 🍎　→　🔢';
 $('countScreen').scrollIntoView({behavior:'smooth',block:'start'});
 speak(instruction());
}
$('recount').addEventListener('click',()=>{
 const cards=[...$('collectedFriends').children];
 cards.forEach((card,i)=>{
  window.setTimeout(()=>{card.style.outline='3px solid #8cc697';card.style.background='#f4fae4';
   window.setTimeout(()=>{card.style.outline='';card.style.background=''},600)},i*520);
 });
 speak('각 친구의 바구니를 차례로 살펴보세요.');
});
function renderWin(){
 $('countScreen').hidden=true;$('winScreen').hidden=false;
 const c=n();
 $('winFriends').innerHTML=Array.from({length:c.friends},(_,i)=>'<img src="'+asset(i)+'" alt="">').join('');
 $('winEquation').textContent=c.each+' × '+c.friends+' = '+c.each*c.friends;
 $('nextLevel').innerHTML=S.level===LEVELS.length-1?'다시 처음부터 <span>▶</span>':'다음 마을 <span>▶</span>';
 $('winScreen').scrollIntoView({behavior:'smooth',block:'start'});
 speak(instruction());
}
$('again').addEventListener('click',()=>reset(S.level));
$('nextLevel').addEventListener('click',()=>reset((S.level+1)%LEVELS.length));
const query=new URLSearchParams(location.search),fromUrl=Number(query.get('stage'));
reset(query.has('stage')&&Number.isInteger(fromUrl)&&fromUrl>=0&&fromUrl<LEVELS.length?fromUrl:0);
})();
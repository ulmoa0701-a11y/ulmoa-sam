/* Concise in-game goal and controls for independently hosted MoA games.
 * No changes to camera, microphone, scoring, timing or game mechanics. */
(()=>{
'use strict';
const map={
 rescue:{icon:'📡',label:'숨은 친구 찾기',goal:'무전의 색·크기·동물을 보고 맞는 친구를 찾아요.',steps:['단서 듣기','조건 모두 비교하기','알맞은 친구 구조하기']},
 'hand-mirror':{icon:'✋',label:'손 모양 따라하기',goal:'화면의 손 모양을 보고 손가락을 움직여요.',steps:['손 모양 보기','손으로 따라하기','모양 확인하기']},
 money:{icon:'🪙',label:'돈 세고 물건값 내기',goal:'돈의 금액을 구별하고 필요한 만큼 담아봐요.',steps:['물건값·목표 금액 보기','동전과 지폐 담기','금액 확인하기']},
 change:{icon:'🎒',label:'바뀐 준비물 기억하기',goal:'처음 목록을 기억하고 바뀐 준비물을 챙겨요.',steps:['처음 목록 기억','변경 안내 보기','바뀐 목록 고르기']},
 feel:{icon:'💛',label:'상황 속 마음 생각하기',goal:'서로 다른 마음과 대처 방법을 생각해봐요.',steps:['상황 살펴보기','가능한 마음 고르기','어떻게 말할지 생각하기']},
 'rhythm-touch':{icon:'🥁',label:'박자에 맞춰 누르기',goal:'노래를 듣고 알맞은 박자에 건반을 눌러요.',steps:['노래 듣고 건반 살펴보기','출발 신호 기다리기','박자 맞춰 누르기']},
 recorder:{icon:'🎶',label:'리코더 운지 연습',goal:'운지 그림을 보고 손가락 위치를 연습해요.',steps:['연습할 음 선택','손가락 위치 살펴보기','운지 모양 따라하기']},
 strength:{icon:'🪶',label:'바람 세기 조절하기',goal:'편안한 범위에서 바람의 세기를 조절해봐요.',steps:['세기 기준 확인','살살 또는 조금 세게 불기','변화 살펴보기']},
 long:{icon:'🍃',label:'바람 일정하게 내쉬기',goal:'무리하지 않고 편안하게 숨을 내쉬어봐요.',steps:['편안하게 준비','천천히 바람 내쉬기','쉬었다가 다시하기']},
 beat:{icon:'🎵',label:'박자 바람',goal:'음악의 박자를 듣고 맞춰 바람을 불어요.',steps:['박자 소리 듣기','출발 신호 확인','맞춰 바람 불기']}
};
const path=location.pathname;
function which(){
 if(path.includes('/games/rescue/'))return 'rescue';
 if(path.includes('/games/hand-mirror/'))return 'hand-mirror';
 if(path.includes('/games/moa-missions/'))return new URLSearchParams(location.search).get('game')||'money';
 if(path.includes('/games/rhythm-touch/'))return 'rhythm-touch';
 if(path.includes('/recorder/'))return 'recorder';
 if(path.includes('/breath-garden/'))return ['strength','long','beat'].includes(new URLSearchParams(location.search).get('mode'))?new URLSearchParams(location.search).get('mode'):null;
 return null;
}
const wrapper=document.createElement('aside');
wrapper.className='moa-quick-guide';
wrapper.setAttribute('aria-label','오늘의 놀이와 방법');
wrapper.innerHTML='<div class="moa-quick-guide-line"><span class="moa-quick-icon" aria-hidden="true">🧩</span><span class="moa-quick-summary"><strong class="moa-quick-title"></strong><span class="moa-quick-goal"></span></span><button type="button" class="moa-quick-toggle" aria-expanded="false" aria-controls="moaQuickSteps">방법 3단계 ▾</button></div><ol class="moa-quick-steps" id="moaQuickSteps" hidden></ol>';
const toggle=wrapper.querySelector('button'),steps=wrapper.querySelector('ol');
toggle.addEventListener('click',()=>{const expanded=toggle.getAttribute('aria-expanded')==='true';toggle.setAttribute('aria-expanded',String(!expanded));steps.hidden=expanded;toggle.textContent=expanded?'방법 3단계 ▾':'방법 접기 ▴'});
function update(id){
 const m=map[id];
 if(!m){wrapper.hidden=true;return;}
 wrapper.hidden=false;wrapper.querySelector('.moa-quick-icon').textContent=m.icon;
 wrapper.querySelector('.moa-quick-title').textContent=m.label;
 wrapper.querySelector('.moa-quick-goal').textContent=m.goal;
 steps.replaceChildren();
 m.steps.forEach((step,i)=>{const li=document.createElement('li'),n=document.createElement('b'),label=document.createElement('span');n.textContent=String(i+1);label.textContent=step;li.append(n,label);steps.append(li)});
 steps.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.textContent='방법 3단계 ▾';
}
const target=path.includes('/games/rescue/')?document.querySelector('.topbar'):
 document.querySelector('main')||document.querySelector('header');
if(!target)return;
if(path.includes('/games/rescue/')){wrapper.classList.add('moa-guide-floating');document.body.append(wrapper)}
else if(target.tagName.toLowerCase()==='main')target.prepend(wrapper);
else target.after(wrapper);
if(path.includes('/breath-garden/')){
 for(const [selector,id] of [['#chooseStrength','strength'],['#chooseLong','long'],['#chooseBeat','beat']]){
  document.querySelector(selector)?.addEventListener('click',()=>update(id));
 }
}
update(which());
})();
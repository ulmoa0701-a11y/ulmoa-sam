/* 울모아 음악정원: 교사용 난이도 설정 + 아동 집중 화면. 기기 내에서만 동작. */
(()=>{'use strict';
const path=location.pathname,kind=path.includes('/rhythm-garden/')?'rhythm':path.includes('/ensemble-garden/')?'ensemble':path.includes('/music-explore/')?'explore':null;
if(!kind)return;
const $=id=>document.getElementById(id),hero=document.querySelector('.hero'),sheet=document.querySelector('.sheet');
if(!hero||!sheet)return;
const help={
 rhythm:['👂 🔊 듣기 → 👏 / 🤫 누르기','🎵 노란 칸을 눌러 박자를 만들어요.','🤝 한 번씩 번갈아 골라요.'],
 ensemble:['🎹 악기 그림을 눌러요.','🎼 칸을 누르고 ▶ 눌러요.','🎶 함께 소리 내고 들어봐요.'],
 explore:['👂 소리 듣기 → 그림 고르기','🔊 들은 소리에 맞는 그림을 눌러요.','🐢↔🐇 차이를 자세히 들어봐요.']
};
const root=document.createElement('section');root.className='learning-toolbar';root.setAttribute('aria-label','음악놀이 수업 시작 설정');
root.innerHTML=[
 '<div class="learning-toolbar-top"><strong>🌱 수업 시작</strong><div class="learning-toggle-group">',
 '<button type="button" id="learnerToggle" class="learning-toggle" aria-pressed="false">🧒 아동 화면</button>',
 '<button type="button" id="teacherToggle" class="learning-toggle current" aria-pressed="true">⚙️ 선생님 설정</button></div></div>',
 '<div id="levelTools" class="learning-settings"><span class="learning-label">난이도 한 가지만 선택</span><div class="learning-levels" role="group" aria-label="난이도 3단계">',
 '<button type="button" data-lesson-level="1" aria-pressed="false"><b>① 처음</b><small>시범·적은 수</small></button>',
 '<button type="button" data-lesson-level="2" aria-pressed="false"><b>② 연습</b><small>한 단계 늘리기</small></button>',
 '<button type="button" data-lesson-level="3" aria-pressed="false"><b>③ 도전</b><small>스스로 구별하기</small></button>',
 '</div><p id="levelExplain" class="learning-explain" role="status">단계를 누르면 게임 설정이 바뀝니다. 시작 전 아동의 반응 방식을 확인하세요.</p>',
 '<a class="learning-bridge-link" href="../music-play/practice.html">🎸 🎹 🪈 실물 악기로 이어서 하기 →</a></div>',
 '<div class="child-guide" id="childGuide" hidden><span class="guide-emojis" aria-hidden="true">👂 ▶️ 👆 ⭐</span>',
 '<strong id="guideText"></strong><button type="button" id="speakGuide">🔈 방법 듣기</button></div>'
].join('');
hero.insertAdjacentElement('afterend',root);
const explain={
 rhythm:['2박 듣기 + 정답 그림 단서 / 4박 만들기','3박 듣기 + 그림 단서 없음 / 4박 만들기','4박 듣기 + 그림 단서 없음 / 8박 만들기'],
 ensemble:['악기 1개만 화면에 / 혼자 듣고 선택','악기 2개 / 각각 듣고 합치기','악기 4개 / 역할 나누어 합주'],
 explore:['소리 차이가 큰 두 가지 비교','소리 차이가 보통인 두 가지 비교','소리 차이가 작은 두 가지 비교 (기기 환경에 따라 구별 어려울 수 있음)']
};
let currentLevel=null,child=false;
function activateLevel(n){
 currentLevel=n;
 document.querySelectorAll('[data-lesson-level]').forEach(x=>x.setAttribute('aria-pressed',String(Number(x.dataset.lessonLevel)===n)));
 document.getElementById('levelExplain').textContent=explain[kind][n-1];
 if(kind==='rhythm'){
  document.querySelector('[data-length="'+[2,3,4][n-1]+'"]')?.click();
  document.querySelector('[data-maker-length="'+(n===3?8:4)+'"]')?.click();
  document.querySelector('[data-turn-length="'+(n===3?6:4)+'"]')?.click();
  const hint=$('showHint');if(hint){hint.checked=n===1;hint.dispatchEvent(new Event('change'))}
  document.querySelector('[data-mode="echo"]')?.click();
 }else if(kind==='ensemble'){
  document.querySelector('[data-parts="'+[1,2,4][n-1]+'"]')?.click();
 }else{
  window.dispatchEvent(new CustomEvent('moa:music-level',{detail:{level:n}}));
 }
}
function updateGuide(){
 const text=kind==='rhythm'&&$('makeMode')&&!$('makeMode').hidden?help.rhythm[1]
  :kind==='rhythm'&&$('turnMode')&&!$('turnMode').hidden?help.rhythm[2]
  :kind==='ensemble'&&$('livePanel')&&!$('livePanel').hidden?help.ensemble[0]
  :kind==='ensemble'?help.ensemble[1]:help[kind][0];
 $('guideText').textContent=text;
}
function activateChild(on){
 child=on;document.body.classList.toggle('music-child',on);
 $('learnerToggle').classList.toggle('current',on);$('teacherToggle').classList.toggle('current',!on);
 $('learnerToggle').setAttribute('aria-pressed',String(on));$('teacherToggle').setAttribute('aria-pressed',String(!on));
 $('childGuide').hidden=!on;$('levelTools').hidden=on;
 if(on&&currentLevel===null)activateLevel(1);
 updateGuide();
}
root.querySelectorAll('[data-lesson-level]').forEach(x=>x.addEventListener('click',()=>activateLevel(Number(x.dataset.lessonLevel))));
$('learnerToggle').addEventListener('click',()=>activateChild(true));$('teacherToggle').addEventListener('click',()=>activateChild(false));
$('speakGuide').addEventListener('click',()=>{
 if(!('speechSynthesis' in window)){$('speakGuide').textContent='음성 안내 미지원';return}
 try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance($('guideText').textContent);u.lang='ko-KR';u.rate=.85;speechSynthesis.speak(u)}
 catch(e){$('speakGuide').textContent='음성 안내 미지원'}
});
const obs=new MutationObserver(()=>{if(child)updateGuide()});
for(const id of ['echoMode','makeMode','turnMode','composePanel','livePanel'])if($(id))obs.observe($(id),{attributes:true,attributeFilter:['hidden']});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&child)activateChild(false)});
updateGuide();
})();

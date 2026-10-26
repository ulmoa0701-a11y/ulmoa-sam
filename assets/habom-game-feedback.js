/* Game feedback launcher: no client-side collection; submission stays with Jotform. */
(function(){
'use strict';
if(document.getElementById('habomFeedbackLauncher'))return;
const src=document.currentScript?.src||'';
const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('habom-game-feedback.css',src).href;document.head.appendChild(css);
const FORM='https://form.jotform.com/262983367931066';
const NAMES={rescue:'모아 구조대',memory:'기억꽃길 이어가기',spacing:'띄어쓰기 다리 놓기',spelling:'고장 난 간판 고치기',sameShape:'쌍둥이 모양 찾기',flower:'꽃만 쏙쏙 찾기',hide:'잎사귀 숨은친구',path:'반짝이 길 따라가기',calm:'초록불에 톡',inside:'정원 안에 별 심기',targets:'하나씩 깨우기',sceneDetect:'숲속 장면 탐정',slowScan:'꽃과 단서 찾기',slowPlace:'정원 지도 따라 놓기',slowBlock:'블록 건축가',slowName:'친구 이름 탐정',slowMemory:'꽃자리 기억하기',paint:'정원길 쓱싹 칠하기',water:'시든 꽃 깨우기',resetRescue:'꼬인 신호 구조대',classroomMove:'우리 교실 이사작전',festivalPlan:'축제 준비 대작전',rulePost:'바뀌는 바람우체국',mirrorPond:'거울연못의 비밀',slowEveryday:'가방 준비 탐험',moaMoney:'모아의 화폐 가게',moaChange:'바뀐 준비물 찾기',moaFeel:'마음 이야기 탐험',rhythmTouch:'박자꽃 톡톡',recorderPlay:'리코더 마법정원',breathStrength:'바람의 힘',breathLong:'오래 후',breathBeat:'박자 바람',handMirror:'모아의 마법 꽃밭'};
function currentGameId(){
 const p=new URLSearchParams(location.search),s=location.pathname;
 if(s.includes('/games/moa-missions/'))return {money:'moaMoney',change:'moaChange',feel:'moaFeel'}[p.get('game')]||'moaMoney';
 if(s.includes('/games/hand-mirror/'))return 'handMirror';
 if(s.includes('/games/rescue/'))return 'rescue';
 if(s.includes('/games/rhythm-touch/'))return 'rhythmTouch';
 if(s.includes('/recorder/'))return 'recorderPlay';
 if(s.includes('/breath-garden/'))return {strength:'breathStrength',long:'breathLong',beat:'breathBeat'}[p.get('mode')]||'breathStrength';
 if(p.get('game'))return p.get('game');
 try{if(typeof state==='object'&&state&&typeof state.game==='string')return state.game}catch(_){}
 return '';
}
function gameName(){return NAMES[currentGameId()]||document.title.split('|')[0].trim().slice(0,75)||'모아 게임'}
const launcher=document.createElement('button');launcher.id='habomFeedbackLauncher';launcher.type='button';launcher.textContent='오류·아이디어 알리기';launcher.setAttribute('aria-haspopup','dialog');launcher.setAttribute('aria-controls','habomFeedbackBackdrop');
document.body.appendChild(launcher);
const backdrop=document.createElement('div');
backdrop.id='habomFeedbackBackdrop';backdrop.hidden=true;
backdrop.innerHTML='<div id="habomFeedbackSheet" role="dialog" aria-modal="true" aria-labelledby="habomFeedbackHeading"><div id="habomFeedbackTop"><h2 id="habomFeedbackHeading">게임을 더 좋게 만들기</h2><button id="habomFeedbackClose" type="button" aria-label="의견 창 닫기">×</button></div><div id="habomFeedbackInfo"><strong id="habomFeedbackGame"></strong><p>버튼이 안 눌리거나 추가하고 싶은 게 있나요? 몇 번만 눌러 알려주세요. 이름이나 학교는 쓰지 않아요.</p></div><iframe id="habomFeedbackFrame" title="게임 오류와 아이디어 접수 양식" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe><div id="habomFeedbackFoot"><span>외부 Jotform으로 접수되며 공개되지 않아요.</span><a id="habomFeedbackExternal" target="_blank" rel="noopener noreferrer">새 창으로 열기</a></div></div>';
document.body.appendChild(backdrop);
const close=backdrop.querySelector('#habomFeedbackClose'),frame=backdrop.querySelector('#habomFeedbackFrame');
function openFeedback(){
 const name=gameName();
 // Only a public game title is passed. No player ID, answers, grades or medical data.
 const link=FORM+'?'+new URLSearchParams({gameName:name}).toString();
 backdrop.querySelector('#habomFeedbackGame').textContent='게임: '+name;
 frame.src=link;backdrop.querySelector('#habomFeedbackExternal').href=link;
 backdrop.hidden=false;close.focus();
}
function closeFeedback(){backdrop.hidden=true;frame.removeAttribute('src');launcher.focus()}
launcher.addEventListener('click',openFeedback);
close.addEventListener('click',closeFeedback);
backdrop.addEventListener('click',e=>{if(e.target===backdrop)closeFeedback()});
backdrop.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeFeedback()}});
function addResultButton(){
 const target=document.querySelector('#resultScreen .result-actions, #resultScreen .resultActions, #results .resultActions, #finish .start-actions, .result .action-row');
 if(!target||document.getElementById('habomFeedbackAtFinish'))return;
 const b=document.createElement('button');b.type='button';b.id='habomFeedbackAtFinish';b.textContent='이 게임 고쳐줬으면 하는 점';
 b.addEventListener('click',openFeedback);target.appendChild(b);
}
addResultButton();const obs=new MutationObserver(addResultButton);
obs.observe(document.body,{subtree:true,childList:true});
window.addEventListener('pagehide',()=>obs.disconnect());
})();

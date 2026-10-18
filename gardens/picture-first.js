/* 모아의 다섯 정원: 부모/치료사 상세 보기와 아동용 그림 우선 보기를 선택적으로 전환.
 * 원본 게임, 카드 미리보기, 기존 검색·필터·딥링크는 변경하지 않습니다. */
(()=>{
  'use strict';
  const panel=document.querySelector('.garden-search-panel');
  const cards=document.querySelectorAll('.garden-section .play-card-enhanced');
  if(!panel || cards.length!==34) return;
  if(document.querySelector('#gardenPictureMode'))return;
  const control=document.createElement('button');
  control.id='gardenPictureMode';
  control.type='button';
  control.className='garden-picture-toggle';
  control.setAttribute('aria-pressed','false');
  control.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.4" cy="9.1" r="1.6"/><path d="m3 16 5-4 3.6 2.8 2.7-2 6.7 4.4"/></svg><span>그림 크게 보기</span>';
  const note=document.createElement('p');
  note.className='garden-picture-description';
  note.id='gardenPictureHelp';
  note.textContent='그림 크게 보기에서는 게임 제목과 시작 버튼만 남아 글을 읽기 어려운 어린이도 게임을 쉽게 고를 수 있어요.';
  panel.append(control,note);
  note.hidden=true;
  control.setAttribute('aria-describedby','gardenPictureHelp');
  function setPictureMode(on){
    document.body.classList.toggle('garden-picture-mode',on);
    control.setAttribute('aria-pressed',String(on));
    control.querySelector('span').textContent=on?'자세히 보기':'그림 크게 보기';
    note.hidden=!on;
  }
  control.addEventListener('click',()=>setPictureMode(control.getAttribute('aria-pressed')!=='true'));
})();
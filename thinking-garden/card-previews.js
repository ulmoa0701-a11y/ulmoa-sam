(() => {
  const gameFix = document.createElement('style');
  gameFix.textContent = `
    .guide-panel>img{position:static!important;left:auto!important;bottom:auto!important;grid-column:1!important;grid-row:1!important;align-self:center!important;justify-self:center!important}
    .guide-copy{grid-column:2!important;grid-row:1!important;min-width:0!important;width:auto!important}
    .guide-copy h3{word-break:keep-all!important;overflow-wrap:normal!important;max-width:none!important}
    .guide-copy p{word-break:keep-all!important;overflow-wrap:break-word!important;max-width:none!important}
    @media(max-width:560px){.guide-panel>img{position:static!important}.guide-copy{grid-column:2!important}.guide-panel{min-height:0!important}}
  `;
  document.head.appendChild(gameFix);

  // These are actual Chrome-captured play scenes, NOT decorative square/emoji mockups.
  // The two observable actions distinguish games with overlapping skill categories.
  const GUIDE={"rescue":["무전 단서 듣기","친구 찾아 구조하기","듣고 찾기"],"memory":["주문표 순서 보기","순서대로 바구니에 담기","기억하고 담기"],"spacing":["붙은 문장 읽기","띄어쓸 곳 누르기","글자 사이 찾기"],"spelling":["잘못된 간판 보기","맞는 표현으로 고치기","맞춤법 선택"],"sameShape":["기준 모양 살피기","똑같은 모양 고르기","모양 비교"],"flower":["찾을 꽃 확인","꽃만 골라 누르기","꽃 찾기"],"hide":["발자국 단서 찾기","잎사귀 열어 친구 찾기","단서 탐색"],"handMirror":["손 모양 관찰하기","카메라 앞에서 따라 하기","손동작 따라 하기"],"path":["빛나는 자리 보기","차례대로 누르기","순서 누르기"],"calm":["신호등 색 살피기","초록불에만 움직이기","기다렸다 누르기"],"inside":["울타리 선 보기","안쪽에 별 심기","영역 안 누르기"],"targets":["잠든 꽃씨 살피기","빠짐없이 하나씩 깨우기","하나씩 확인"],"paint":["칠할 길 살피기","선 안쪽을 따라 칠하기","범위 칠하기"],"resetRescue":["로봇 안내 들어보기","틀리면 멈춰 재확인","오류 찾아 고치기"],"classroomMove":["물건 위치 지시 듣기","정해진 자리에 옮기기","지시대로 옮기기"],"festivalPlan":["친구들의 단서 살피기","준비 순서 정하기","순서 계획"],"rulePost":["새로 바뀐 규칙 보기","새 기준으로 배달하기","규칙 전환"],"mirrorPond":["원래 모양 보기","거울·회전 모양 고르기","방향 비교"],"sceneDetect":["처음 장면 기억하기","달라진 자리 찾아내기","변화 찾기"],"slowScan":["찾을 꽃 단서 보기","여러 곳에서 찾아내기","단서 탐색"],"slowPlace":["꽃이 놓인 자리 보기","같은 칸에 꽃 놓기","위치 따라 놓기"],"slowBlock":["블록 모양 살피기","방향 돌려 조립하기","회전해 조립"],"slowName":["동물·색을 살펴보기","이름 생각해 말하기","보고 말하기"],"slowMemory":["꽃이 있던 자리 보기","가린 뒤 같은 자리 찾기","위치 기억"],"slowEveryday":["날씨·상황 알아보기","필요한 물건 챙기기","생활 준비"],"water":["시든 꽃 구별하기","찾아서 하나씩 물 주기","돌보고 확인"]};
  const PREVIEW_VERSION='?v=20261021-playstate4';
  const escapeText=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  document.querySelectorAll('#gardenGamePanel .library-card[data-open]').forEach(card=>{
    const id=card.dataset.open,guide=GUIDE[id];
    const photoId=id==='handMirror'?'hand-mirror':id;
    if(!guide || card.querySelector('.card-live-preview'))return;
    const [first,second,mode]=guide;
    const panel=document.createElement('div');
    panel.className='card-live-preview card-shot-preview preview-'+id;
    panel.setAttribute('aria-hidden','true');
    panel.innerHTML='<div class="card-shot-screen"><img loading="lazy" decoding="async" alt="" src="../gardens/previews/'+encodeURIComponent(photoId)+'-play.jpg'+PREVIEW_VERSION+'"></div>'+
      '<div class="card-shot-info"><span class="card-shot-label">실제 게임 장면</span><b class="card-shot-mode">'+escapeText(mode)+'</b></div>'+
      '<div class="card-shot-steps"><span>'+escapeText(first)+'</span><span class="card-shot-arrow" aria-hidden="true">→</span><strong>'+escapeText(second)+'</strong></div>';
    const img=panel.querySelector('img');
    img.addEventListener('error',()=>{
      panel.classList.add('card-shot-missing');
      const screen=panel.querySelector('.card-shot-screen');
      screen.textContent='게임 미리보기 이미지를 표시할 수 없어요.';
      panel.querySelector('.card-shot-label').textContent='미리보기 없음';
    });
    card.append(panel);
    const cta=card.querySelector('strong');
    if(cta)cta.textContent='게임 시작 →';
  });

  const applyGameChrome = () => {
    const game = document.getElementById('gameScreen');
    if (!game) return;
    const title = document.getElementById('gameTitle')?.textContent || '';
    game.dataset.gameTitle = title;
  };
  const observer = new MutationObserver(applyGameChrome);
  const gameTitle = document.getElementById('gameTitle');
  if (gameTitle) observer.observe(gameTitle, {childList:true, subtree:true, characterData:true});
  applyGameChrome();
})();
/* 일단 해봄 공통 메뉴: 실제 공개 콘텐츠 경로만 사용 */
(()=>{
  'use strict';
  const nav=document.querySelector('.note-header .note-nav, .sub-header .sub-nav');
  if(!nav)return;
  const root=nav.classList.contains('note-nav')?'':'../';
  const U=(p)=>root+p;
  const groups=[
    {id:'games',name:'게임',icon:'🎮',items:[
      ['모아의 생각정원','전체 인지·음악 게임',U('thinking-garden/')],
      ['시각·주의 게임','조건찾기·시각탐색',U('thinking-garden/?category=visual#gardenMap')],
      ['기억·집행 게임','순서·기억·억제',U('thinking-garden/?category=memory#gardenMap')],
      ['읽기·쓰기 게임','맞춤법·띄어쓰기',U('thinking-garden/?category=literacy#gardenMap')],
      ['공간·구성 게임','눈손협응',U('thinking-garden/?category=space#gardenMap')]]},
    {id:'music',name:'음악·악보',icon:'🎵',items:[
      ['하트색깔악보 Studio','악보 직접 만들기',U('heart-score/')],
      ['붐웨커 Studio','색깔 건반·연주',U('boomwhacker/')],
      ['박자 맞추기','박자꽃 톡톡 게임',U('thinking-garden/games/rhythm-touch/')],
      ['리코더 운지','손가락 연습 게임',U('thinking-garden/recorder/')],
      ['완성된 색깔악보','PNG·PDF 자료',U('materials/#musicShelf')]]},
    {id:'materials',name:'활동지',icon:'📂',items:[
      ['자료실 전체','인쇄·다운로드 자료',U('materials/')],
      ['인지·기초학습','차근차근 자료',U('materials/#cognitiveShelf')],
      ['사회성·의사소통','관계·사과 연습 자료',U('materials/#socialShelf')],
      ['생활·자기관리','일상생활 자료',U('materials/#lifeShelf')],
      ['음악활동 자료','하트색깔악보',U('materials/#musicShelf')]]},
    {id:'terms',name:'용어사전',icon:'📖',href:U('notes/')},
    {id:'brain',name:'3D 뇌지도',icon:'🧠',href:U('brain-map/')},
    {id:'parents',name:'부모님 자료',icon:'💛',items:[
      ['부모님 도움자료','주제별 안내·관찰 메모',U('parents/')],
      ['말·의사소통','언어·표현 살펴보기',U('parents/#speech')],
      ['주의·기억·학습','일상에서 관찰하기',U('parents/#attention')],
      ['감정·행동','상황과 반응 기록하기',U('parents/#emotion')],
      ['사회성·친구관계','놀이와 관계',U('parents/#social')],
      ['생활·자립','일상생활의 작은 단계',U('parents/#daily')]]},
    {id:'support',name:'지원정보',icon:'🧭',items:[
      ['지원정보 전체','공식 정보 모아보기',U('info/')],
      ['바우처·치료비','지원·신청정보',U('info/#voucher')],
      ['특수교육·학교','선정·학교생활',U('info/#special')],
      ['부모·가족 지원','양육·돌봄 제도',U('info/#family')],
      ['지역별 지원','지역 서비스 찾기',U('info/#local')]]},
    {id:'more',name:'더보기',icon:'⋯',items:[
      ['울모아쌤 소개','사이트를 만든 사람',U('about/')],
      ['자료·아이디어 제안','소통하기',U('request/')],
      ['개발 중 미리보기','테스트 공간',U('test/')]]}
  ];
  const esc=(v)=>String(v).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const submenu=(g)=>g.items.map(([title,desc,url])=>'<a href="'+esc(url)+'"><b>'+esc(title)+'</b><span>'+esc(desc)+'</span></a>').join('');
  const item=(g)=>g.href
    ? '<a class="hb-nav-link" href="'+esc(g.href)+'"><span class="hb-nav-emoji" aria-hidden="true">'+g.icon+'</span>'+esc(g.name)+'</a>'
    : '<details class="hb-menu hb-menu-'+esc(g.id)+'"><summary><span class="hb-nav-emoji" aria-hidden="true">'+g.icon+'</span>'+esc(g.name)+'<span class="hb-chevron" aria-hidden="true">⌄</span></summary><div class="hb-dropdown"><div class="hb-drop-title">'+esc(g.name)+' 바로가기</div>'+submenu(g)+'</div></details>';
  nav.classList.add('hb-nav');
  nav.setAttribute('aria-label','사이트 주요 메뉴');
  nav.innerHTML='<button class="hb-mobile-toggle" type="button" aria-expanded="false" aria-controls="hb-nav-links"><span aria-hidden="true">☰</span> 전체메뉴</button><div class="hb-nav-links" id="hb-nav-links">'+groups.map(item).join('')+'</div><button class="hb-quick-search" type="button" aria-label="바로 찾기 열기"><span aria-hidden="true">⌕</span><span class="hb-search-text">찾기</span></button>';
  const links=nav.querySelector('.hb-nav-links'),toggle=nav.querySelector('.hb-mobile-toggle');
  const closeMenus=(except)=>nav.querySelectorAll('details[open]').forEach(d=>{if(d!==except)d.open=false});
  const closeMobile=()=>{nav.classList.remove('hb-mobile-open');toggle.setAttribute('aria-expanded','false')};
  toggle.addEventListener('click',()=>{const opened=nav.classList.toggle('hb-mobile-open');toggle.setAttribute('aria-expanded',String(opened));if(!opened)closeMenus()});
  nav.querySelectorAll('.hb-menu').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)closeMenus(d)}));
  links.addEventListener('click',(e)=>{if(e.target.closest('a'))closeMobile()});
  document.addEventListener('click',(e)=>{if(!nav.contains(e.target)){closeMenus();closeMobile()}});
  document.addEventListener('keydown',(e)=>{if(e.key==='Escape'){closeMenus();closeMobile()}});
  const known=[
    ['모아의 생각정원','게임 인지 시각탐색 주의 집중 기억 읽기 쓰기 공간',U('thinking-garden/')],
    ['시각·주의 게임','조건찾기 주의 시각탐색 집중력',U('thinking-garden/?category=visual#gardenMap')],
    ['기억·집행 게임','작업기억 순서기억 집행기능 억제',U('thinking-garden/?category=memory#gardenMap')],
    ['읽기·쓰기 게임','띄어쓰기 맞춤법 문해',U('thinking-garden/?category=literacy#gardenMap')],
    ['하트색깔악보 Studio','악보 계이름 하트 악보 만들기 음악',U('heart-score/')],
    ['붐웨커 Studio','붐웨커 색깔 건반 음악',U('boomwhacker/')],
    ['리코더 운지','리코더 운지 손가락 음악게임',U('thinking-garden/recorder/')],
    ['박자꽃 톡톡','리듬 박자 음악게임',U('thinking-garden/games/rhythm-touch/')],
    ['인지·기초학습 활동지','인지 기초학습 시각주의 자료 pdf 차근차근',U('materials/#cognitiveShelf')],
    ['사회성·의사소통 활동지','사회성 관계 사과 대화 자료 pdf',U('materials/#socialShelf')],
    ['생활·자기관리 활동지','자립 일상 자기관리 자료',U('materials/#lifeShelf')],
    ['음악활동 자료','악보 나비야 작은별 pdf png',U('materials/#musicShelf')],
    ['용어사전','용어 단어 인지 작업기억 촉구 aac 언어 심리 사전',U('notes/')],
    ['3D 뇌지도','뇌그림 전두엽 두정엽 측두엽 후두엽 뇌 공부',U('brain-map/')],
    ['부모님 도움자료','부모 가정 활동 양육 언어 감정 행동 사회성',U('parents/')],
    ['부모님 관찰 메모','부모 상담 준비 관찰 기록 인쇄',U('parents/#observation')],
    ['바우처·치료비 지원','발달재활 바우처 치료비',U('info/#voucher')],
    ['특수교육·학교','특수교육 선정 학교 교육',U('info/#special')],
    ['부모·가족 복지 지원','양육 가족 돌봄 지원',U('info/#family')],
    ['울모아쌤 소개','제작자 소개',U('about/')],
    ['개발 중 프로그램','테스트 미리보기',U('test/')]
  ];
  const dialog=document.createElement('dialog');dialog.className='hb-find-dialog';dialog.setAttribute('aria-label','사이트에서 바로 찾기');
  dialog.innerHTML='<div class="hb-find-head"><div><span>일단 해봄</span><h2>무엇을 찾고 있나요?</h2></div><button type="button" class="hb-find-close" aria-label="닫기">×</button></div><label class="hb-find-input"><span aria-hidden="true">⌕</span><input type="search" autocomplete="off" placeholder="예: 작업기억, 붐웨커, 바우처" aria-label="사이트 콘텐츠 찾기"></label><p class="hb-find-helper">등록된 게임·자료·정보 바로가기에서 찾아요.</p><div class="hb-find-results" aria-live="polite"></div>';
  document.body.appendChild(dialog);
  const input=dialog.querySelector('input'),results=dialog.querySelector('.hb-find-results');
  const render=()=>{
    const terms=input.value.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    const matches=known.filter(([title,keywords])=>terms.every(t=>(title+' '+keywords).toLocaleLowerCase().includes(t))).slice(0,12);
    results.replaceChildren();
    if(!matches.length){const p=document.createElement('p');p.textContent='일치하는 바로가기가 없어요. 다른 단어로 검색해 주세요.';results.appendChild(p);return}
    for(const [title,keywords,url] of matches){
      const a=document.createElement('a');a.href=url;a.className='hb-find-result';
      const b=document.createElement('b');b.textContent=title;
      const small=document.createElement('span');small.textContent=keywords.split(' ').slice(0,5).join(' · ');
      a.append(b,small);results.appendChild(a)
    }
  };
  nav.querySelector('.hb-quick-search').addEventListener('click',()=>{closeMenus();closeMobile();input.value='';render();if(typeof dialog.showModal==='function'){dialog.showModal();input.focus()}});
  dialog.querySelector('.hb-find-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',(e)=>{if(e.target===dialog)dialog.close()});
  input.addEventListener('input',render);
  const current=location.pathname.split('/').filter(Boolean).slice(-1)[0]||'';
  nav.querySelectorAll('.hb-nav-link, .hb-dropdown a').forEach(a=>{try{if(new URL(a.href).pathname===location.pathname)a.setAttribute('aria-current','page')}catch{}});
})();
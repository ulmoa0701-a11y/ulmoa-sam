/* 일단 해봄 공통 메뉴: 실제 공개 콘텐츠 경로만 사용 */
(()=>{
  'use strict';
  const nav=document.querySelector('.note-header .note-nav, .sub-header .sub-nav');
  if(!nav)return;
  const root=nav.classList.contains('note-nav')?'':'../';
  const U=(p)=>root+p;
  const groups=[
    {id:'games',name:'게임',icon:'🎮',sections:[
      {name:'모아의 인지정원',icon:'👀',desc:'기초 인지 · 20개',href:U('gardens/#cognitive'),links:[
        ['같은 모양 찾기','시각변별 · 기초인지',U('thinking-garden/?game=sameShape')],
        ['순서 기억하기','기억 · 순서화',U('thinking-garden/?game=memory')],
        ['신호에 맞춰 멈추기','억제 · 신호대기',U('thinking-garden/?game=calm')],
        ['블록 위치 맞추기','시공간 · 눈손협응',U('thinking-garden/?game=slowBlock')]]},
      {name:'모아의 생각정원',icon:'🧩',desc:'추론·규칙 · 3개',href:U('gardens/#thinking'),links:[
        ['바뀌는 바람우체국','규칙전환 · 인지적 유연성',U('thinking-garden/?game=rulePost')],
        ['거울연못의 비밀','공간추론 · 회전',U('thinking-garden/?game=mirrorPond')]]},
      {name:'모아의 학습정원',icon:'✏️',desc:'읽기·생활 · 3개',href:U('gardens/#learning'),links:[
        ['띄어쓰기 다리 놓기','문장 · 어절',U('thinking-garden/?game=spacing')],
        ['고장 난 간판 고치기','맞춤법 · 표현',U('thinking-garden/?game=spelling')],
        ['가방 준비 탐험','생활학습 · 준비물',U('thinking-garden/?game=slowEveryday')]]},
      {name:'모아의 음악정원',icon:'🎵',desc:'리듬·리코더 · 3개',href:U('gardens/#music'),links:[
        ['박자꽃 톡톡!','리듬 · 박자',U('thinking-garden/games/rhythm-touch/')],
        ['리코더 마법정원','운지 · 음악놀이',U('thinking-garden/recorder/')],
        ['박자 바람','박자에 맞춰 불기',U('breath-garden/?mode=beat')]]},
      {name:'모아의 마음정원',icon:'💛',desc:'호흡부터 · 2가지',href:U('gardens/#heart'),links:[
        ['바람의 힘','바람 세기 조절',U('breath-garden/?mode=strength')],
        ['오래 후~','바람 이어가기',U('breath-garden/?mode=long')]]}
    ]},
    {id:'music',name:'음악도구',icon:'🎼',items:[
      ['하트색깔악보 Studio','악보 직접 만들기',U('heart-score/')],
      ['붐웨커 Studio','색깔 건반·연주',U('boomwhacker/')],
      ['완성된 색깔악보','PNG·PDF 자료',U('materials/#musicShelf')]]},
    {id:'materials',name:'활동지',icon:'📂',items:[
      ['자료실 전체','인쇄·다운로드 자료',U('materials/')],
      ['인지·기초학습','차근차근 자료',U('materials/#cognitiveShelf')],
      ['사회성·의사소통','관계·사과 연습 자료',U('materials/#socialShelf')],
      ['생활·자기관리','일상생활 자료',U('materials/#lifeShelf')],
      ['음악활동 자료','하트색깔악보',U('materials/#musicShelf')]]},
    {id:'terms',name:'알아봄',icon:'📖',href:U('notes/')},
    {id:'story',name:'이야기해봄',icon:'💬',href:U('request/')},
    {id:'brain',name:'3D 뇌지도',icon:'🧠',href:U('brain-map/')},
    {id:'parents',name:'찾아봄',icon:'🔎',items:[
      ['찾아봄 전체','발달·행동·일상별 안내',U('parents/')],
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
      ['개발 중 미리보기','테스트 공간',U('test/')]]}
  ];
  const esc=(v)=>String(v).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const submenu=(g)=>g.sections
    ? '<div class="hb-game-groups">'+g.sections.map(section=>
        '<section class="hb-game-section" aria-label="'+esc(section.name)+'">'+
          '<a class="hb-game-parent" href="'+esc(section.href)+'"><strong>'+section.icon+' '+esc(section.name)+'</strong><span>'+esc(section.desc)+' <span aria-hidden="true">→</span></span></a>'+
          '<div class="hb-game-children" role="group" aria-label="'+esc(section.name)+' 세부 게임">'+
            section.links.map(([title,desc,url])=>'<a class="hb-game-child" href="'+esc(url)+'"><b>'+esc(title)+'</b><span>'+esc(desc)+'</span></a>').join('')+
          '</div></section>').join('')+'</div>'
    : g.items.map(([title,desc,url])=>'<a href="'+esc(url)+'"><b>'+esc(title)+'</b><span>'+esc(desc)+'</span></a>').join('');
  const item=(g)=>g.href
    ? '<a class="hb-nav-link" href="'+esc(g.href)+'"><span class="hb-nav-emoji" aria-hidden="true">'+g.icon+'</span>'+esc(g.name)+'</a>'
    : '<details class="hb-menu hb-menu-'+esc(g.id)+'"><summary><span class="hb-nav-emoji" aria-hidden="true">'+g.icon+'</span>'+esc(g.name)+'<span class="hb-chevron" aria-hidden="true">⌄</span></summary><div class="hb-dropdown"><div class="hb-drop-title">'+esc(g.name)+' 바로가기</div>'+submenu(g)+'</div></details>';
  nav.classList.add('hb-nav');
  nav.setAttribute('aria-label','사이트 주요 메뉴');
  nav.innerHTML='<button class="hb-mobile-toggle" type="button" aria-expanded="false" aria-controls="hb-nav-links"><span aria-hidden="true">☰</span> 전체메뉴</button><div class="hb-nav-links" id="hb-nav-links">'+groups.map(item).join('')+'</div><button class="hb-quick-search" type="button" aria-label="바로 찾기 열기"><span aria-hidden="true">⌕</span><span class="hb-search-text">찾기</span></button>';
  const links=nav.querySelector('.hb-nav-links'),toggle=nav.querySelector('.hb-mobile-toggle');
  // Compact mobile navigation: swap the 2-column category grid for the chosen category's buttons.
  const mobileCategory=document.createElement('section');
  mobileCategory.className='hb-mobile-category';
  mobileCategory.hidden=true;
  mobileCategory.setAttribute('aria-label','선택한 카테고리');
  mobileCategory.innerHTML='<div class="hb-mobile-category-head"><button type="button" class="hb-mobile-back">← 전체 카테고리</button><strong class="hb-mobile-category-name"></strong></div><div class="hb-mobile-subgrid"></div>';
  links.appendChild(mobileCategory);
  const mobileBack=mobileCategory.querySelector('.hb-mobile-back');
  const mobileSubgrid=mobileCategory.querySelector('.hb-mobile-subgrid');
  const compactView=()=>window.matchMedia('(max-width:1199px)').matches;
  function resetMobileCategory(){
    links.classList.remove('hb-show-subcategory');
    mobileCategory.hidden=true;
    mobileSubgrid.replaceChildren();
    mobileSubgrid.classList.remove('hb-mobile-game-groups');
  }
  mobileBack.addEventListener('click',()=>{
    resetMobileCategory();
    const categoryButton=links.querySelector('.hb-menu summary');
    categoryButton?.focus();
  });
  nav.querySelectorAll('.hb-menu > summary').forEach(summary=>{
    summary.addEventListener('click',event=>{
      if(!compactView()||!nav.classList.contains('hb-mobile-open'))return;
      event.preventDefault(); // No native details expansion on compact screens.
      const menu=summary.parentElement;
      const label=menu.querySelector('.hb-nav-emoji')?.nextSibling?.textContent?.trim()||summary.textContent.replace('⌄','').trim();
      mobileCategory.querySelector('.hb-mobile-category-name').textContent=label;
      mobileSubgrid.replaceChildren();
      const sections=[...menu.querySelectorAll('.hb-game-section')];
      mobileSubgrid.classList.toggle('hb-mobile-game-groups',sections.length>0);
      if(sections.length){
        // Keep both garden names as clickable parents, with children visibly nested below.
        sections.forEach(section=>{
          const box=document.createElement('section');
          box.className='hb-mobile-game-section';
          box.append(section.querySelector('.hb-game-parent').cloneNode(true),
            section.querySelector('.hb-game-children').cloneNode(true));
          mobileSubgrid.appendChild(box);
        });
      }else{
        menu.querySelectorAll('.hb-dropdown a').forEach(link=>{
          const tile=document.createElement('a');
          tile.className='hb-mobile-subtile';
          tile.href=link.getAttribute('href');
          const title=document.createElement('b');
          title.textContent=link.querySelector('b')?.textContent||link.textContent.trim();
          const description=document.createElement('small');
          description.textContent=link.querySelector('span')?.textContent||'바로가기';
          tile.append(title,description);
          mobileSubgrid.appendChild(tile);
        });
      }
      links.classList.add('hb-show-subcategory');
      mobileCategory.hidden=false;
      mobileBack.focus({preventScroll:true});
    });
  });
  const closeMenus=(except)=>nav.querySelectorAll('details[open]').forEach(d=>{if(d!==except)d.open=false});
  const closeMobile=()=>{resetMobileCategory();nav.classList.remove('hb-mobile-open');toggle.setAttribute('aria-expanded','false')};
  toggle.addEventListener('click',()=>{const opened=nav.classList.toggle('hb-mobile-open');toggle.setAttribute('aria-expanded',String(opened));if(!opened){resetMobileCategory();closeMenus()}});
  nav.querySelectorAll('.hb-menu').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)closeMenus(d)}));
  links.addEventListener('click',(e)=>{if(e.target.closest('a')){closeMobile();closeMenus()}});
  document.addEventListener('click',(e)=>{if(!nav.contains(e.target)){closeMenus();closeMobile()}});
  document.addEventListener('keydown',(e)=>{if(e.key==='Escape'){closeMenus();closeMobile()}});
  const known=[
    ['모아의 다섯 정원','게임 정원 인지 생각 학습 음악 마음 전체 모아',U('gardens/')],
    ['모아의 인지정원','기초인지 시지각 주의 기억 억제 눈손협응',U('gardens/#cognitive')],
    ['모아의 생각정원','추론 사고 규칙전환 문제해결 공간추론',U('gardens/#thinking')],
    ['모아의 학습정원','국어 한글 맞춤법 띄어쓰기 생활학습 수학',U('gardens/#learning')],
    ['모아의 음악정원','음악 리듬 박자 리코더 악기',U('gardens/#music')],
    ['모아의 마음정원','감정 정서 사회성 관계 바람 호흡 휴식',U('gardens/#heart')],
    ['시각·주의 게임','조건찾기 주의 시각탐색 집중력',U('gardens/#cognitive')],
    ['기억·집행 게임','작업기억 순서기억 반응억제',U('gardens/#cognitive')],
    ['읽기·쓰기 게임','띄어쓰기 맞춤법 한글 문해',U('gardens/#learning')],
    ['하트색깔악보 Studio','악보 계이름 하트 악보 만들기 음악',U('heart-score/')],
    ['붐웨커 Studio','붐웨커 색깔 건반 음악',U('boomwhacker/')],
    ['리코더 운지','리코더 운지 손가락 음악게임',U('thinking-garden/recorder/')],
    ['박자꽃 톡톡','리듬 박자 음악게임',U('thinking-garden/games/rhythm-touch/')],
    ['인지·기초학습 활동지','인지 기초학습 시각주의 자료 pdf 차근차근',U('materials/#cognitiveShelf')],
    ['사회성·의사소통 활동지','사회성 관계 사과 대화 자료 pdf',U('materials/#socialShelf')],
    ['생활·자기관리 활동지','자립 일상 자기관리 자료',U('materials/#lifeShelf')],
    ['음악활동 자료','악보 나비야 작은별 pdf png',U('materials/#musicShelf')],
    ['알아봄 · 용어사전','용어 단어 인지 작업기억 촉구 aac 언어 심리 사전',U('notes/')],
    ['3D 뇌지도','뇌그림 전두엽 두정엽 측두엽 후두엽 뇌 공부',U('brain-map/')],
    ['이야기해봄','질문 답변 소통 자료 요청 아이디어 제안 비밀글',U('request/')],
    ['찾아봄 · 상황별 정보','보호자 가족 교사 부모 가정 활동 양육 언어 감정 행동 사회성',U('parents/')],
    ['관찰 메모','보호자 교사 부모 상담 준비 관찰 기록 인쇄',U('parents/#observation')],
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
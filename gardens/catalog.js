/* MoA five-garden discovery layer. Does not alter original games or navigation links. */
(()=>{
'use strict';
const PREVIEW_VERSION='?v=20261019-realplay2';
const CATALOG={"rescue":{"title":"숨은 친구 찾기","action":"무전의 단서를 듣고 알맞은 친구를 찾아요.","focus":"find","focusLabel":"찾기·집중","life":"준비물이나 물건에서 필요한 것 찾기","steps":["단서 듣기","친구 찾기","구조하기"]},"memory":{"title":"색과 순서 기억하기","action":"보여준 색과 동물 순서대로 담아요.","focus":"memory","focusLabel":"기억하기","life":"여러 단계 지시의 순서 기억하기","steps":["주문표 보기","순서 기억하기","같은 순서로 담기"]},"sameShape":{"title":"같은 모양 찾기","action":"기준 모양과 똑같은 모양을 골라요.","focus":"find","focusLabel":"찾기·집중","life":"비슷한 글자나 도형 구별하기","steps":["기준 보기","여러 모양 비교하기","같은 모양 선택"]},"flower":{"title":"꽃만 골라 찾기","action":"여러 그림 중 꽃만 골라 눌러요.","focus":"find","focusLabel":"찾기·집중","life":"필요한 대상만 구별하기","steps":["찾을 대상 확인","그림 둘러보기","꽃만 선택"]},"hide":{"title":"발자국 따라 숨은 친구 찾기","action":"발자국이 보이는 잎사귀를 골라 무당벌레를 찾아요.","focus":"find","focusLabel":"탐색·확인","life":"눈에 보이는 흔적을 단서로 목표 위치 찾기","steps":["발자국 찾기","그 잎사귀 열기","친구 확인"]},"path":{"title":"표시되는 길 따라 누르기","action":"다음에 빛나는 자리를 보고 하나씩 눌러요.","focus":"follow","focusLabel":"순서 따라하기","life":"시각 신호의 차례를 따라 누르는 연습","steps":["지금 빛나는 자리 보기","그 자리 누르기","다음 빛 확인하기"]},"calm":{"title":"신호 기다렸다 누르기","action":"빨간불엔 기다리고 초록불에 움직여요.","focus":"inhibit","focusLabel":"기다리기·조절","life":"차례와 시작 신호 기다리기","steps":["불빛 확인","빨간불에는 대기","초록불에 반응"]},"inside":{"title":"울타리 안에 별 심기","action":"정해진 선 안쪽만 눌러 별을 심어요.","focus":"space","focusLabel":"위치·구성","life":"영역과 경계 구별하기","steps":["울타리 확인","안쪽 구별","별 심기"]},"targets":{"title":"꽃씨 하나씩 깨우기","action":"아직 잠든 꽃씨를 한 개씩 찾아 꽃을 피워요.","focus":"find","focusLabel":"찾기·빠뜨리지 않기","life":"할 일을 하나씩 확인하고 빠뜨리지 않기","steps":["꽃씨 둘러보기","잠든 꽃씨 누르기","꽃 모두 피웠는지 확인"]},"sceneDetect":{"title":"장면에서 달라진 곳 찾기","action":"이전 장면과 비교해 바뀐 곳을 찾아요.","focus":"memory","focusLabel":"기억하기","life":"바뀐 정보 알아차리기","steps":["처음 장면 보기","변한 장면 살펴보기","달라진 곳 찾기"]},"slowScan":{"title":"단서 따라 목표 찾기","action":"잎과 돌 사이에서 목표 꽃을 찾아요.","focus":"find","focusLabel":"찾기·집중","life":"문제 속 필요한 정보 놓치지 않기","steps":["찾을 단서 확인","여러 위치 살펴보기","놓친 것 점검"]},"slowPlace":{"title":"위치 보고 그대로 놓기","action":"본 그림의 꽃 위치를 따라 놓아요.","focus":"space","focusLabel":"위치·구성","life":"위치 관계 파악하기","steps":["그림의 자리 보기","같은 위치 찾기","꽃 놓기"]},"slowBlock":{"title":"블록 모양 맞춰 만들기","action":"블록의 모양과 맞닿는 자리를 살펴요.","focus":"space","focusLabel":"위치·구성","life":"모양 구성과 공간 관계 익히기","steps":["블록 배치 보기","알맞은 자리 비교","모양 완성"]},"slowName":{"title":"보고 이름 정확히 말하기","action":"그림의 색과 동물을 확인해 대답해요.","focus":"listen","focusLabel":"보고·듣고 따라하기","life":"보고 확인한 내용 말로 표현하기","steps":["그림 관찰","이름 생각","확인하고 말하기"]},"slowMemory":{"title":"꽃이 있던 자리 기억하기","action":"꽃을 본 뒤 가려진 자리에서 찾아요.","focus":"memory","focusLabel":"기억하기","life":"물건을 둔 위치 기억하기","steps":["꽃 위치 보기","화면 가리기","같은 자리 고르기"]},"paint":{"title":"경계 안쪽 칠하기","action":"선을 벗어나지 않게 길을 칠해요.","focus":"space","focusLabel":"위치·구성","life":"정해진 범위 안에서 손 조절하기","steps":["칠할 영역 확인","손 움직이기","빈 곳 확인"]},"water":{"title":"시든 꽃 빠짐없이 찾기","action":"시든 꽃을 하나씩 찾아 물을 줘요.","focus":"find","focusLabel":"찾기·집중","life":"하던 일을 빠뜨리지 않고 마치기","steps":["시든 꽃 찾기","한 송이씩 누르기","남은 꽃 확인"]},"resetRescue":{"title":"잘못된 신호 알아차리기","action":"틀린 안내를 발견하고 다시 확인해요.","focus":"inhibit","focusLabel":"기다리기·조절","life":"멈추고 실수 다시 점검하기","steps":["안내 확인","틀린 신호 알아차리기","멈춰 재확인"]},"classroomMove":{"title":"지시 듣고 물건 옮기기","action":"물건을 알맞은 위치로 옮겨요.","focus":"listen","focusLabel":"보고·듣고 따라하기","life":"교실 물건 정리와 위치 지시 따르기","steps":["지시 확인","물건·자리 찾기","알맞게 옮기기"]},"hand-mirror":{"title":"손 모양 따라하기","action":"손가락이나 양손 모양을 보고 따라해요.","focus":"motor","focusLabel":"손동작 따라하기","life":"손 모양과 동작 순서 익히기","steps":["손동작 모델 보기","손으로 따라하기","모양 비교"]},"change":{"title":"바뀐 준비물 기억하기","action":"처음 목록에서 바뀐 물건을 골라요.","focus":"memory","focusLabel":"기억하기","life":"변경된 준비물이나 약속 반영하기","steps":["처음 목록 기억","바뀐 안내 확인","새 목록 만들기"]},"rulePost":{"title":"바뀐 규칙 알아차리기","action":"이전 규칙 대신 새로운 규칙을 적용해요.","focus":"rule","focusLabel":"규칙 바꾸기","life":"상황에 맞게 기준 전환하기","steps":["처음 규칙 익히기","바뀐 규칙 확인","새 기준으로 선택"]},"mirrorPond":{"title":"거울에 비친 모양 찾기","action":"뒤집히거나 돌아간 그림을 찾아요.","focus":"reason","focusLabel":"비교·추론","life":"좌우와 방향의 차이 비교하기","steps":["원래 모양 확인","방향 비교","같은 결과 찾기"]},"festivalPlan":{"title":"단서로 준비 순서 정하기","action":"단서를 이용해 축제 준비 순서를 정해요.","focus":"plan","focusLabel":"계획·문제해결","life":"해야 할 일의 순서 정하기","steps":["해야 할 일 살펴보기","단서 연결","순서 계획"]},"spacing":{"title":"띄어쓸 자리 찾기","action":"붙어 있는 문장에서 띄어쓸 곳을 골라요.","focus":"korean","focusLabel":"한글·국어","life":"문장을 어절로 나누어 읽기","steps":["문장 읽기","띄어쓸 곳 찾기","확인"]},"spelling":{"title":"틀린 글자 고치기","action":"간판 속 헷갈리는 표현을 고쳐요.","focus":"korean","focusLabel":"한글·국어","life":"맞춤법과 글자 구별하기","steps":["간판 보기","맞는 표현 비교","간판 고치기"]},"slowEveryday":{"title":"가방에 필요한 물건 담기","action":"준비물을 확인하고 알맞게 챙겨요.","focus":"life","focusLabel":"생활학습","life":"학교나 외출 준비하기","steps":["필요한 물건 확인","물건 찾기","가방에 담기"]},"money":{"title":"돈 세고 물건값 내기","action":"동전·지폐로 금액을 만들고 계산해요.","focus":"math","focusLabel":"돈·수학","life":"가게에서 계산하고 거스름돈 확인하기","steps":["화폐 구별","목표 금액 만들기","물건값 계산"]},"rhythm-touch":{"title":"박자에 맞춰 누르기","action":"리듬에 맞춰 화면을 톡톡 눌러요.","focus":"rhythm","focusLabel":"리듬·박자","life":"음악에 맞춰 타이밍 맞추기","steps":["리듬 듣기","박자 기다리기","맞춰 누르기"]},"recorder":{"title":"리코더 손가락 연습","action":"운지 그림을 보고 리코더를 연습해요.","focus":"instrument","focusLabel":"악기·운지","life":"악기 연주를 위한 손가락 움직임","steps":["운지 그림 보기","손가락 따라하기","소리 확인"]},"beat":{"title":"박자에 맞춰 바람 불기","action":"음악의 박자에 맞춰 후~ 불어요.","focus":"rhythm","focusLabel":"리듬·박자","life":"리듬에 따라 호흡 타이밍 조절하기","steps":["박자 선택","신호 듣기","맞춰 바람 불기"]},"strength":{"title":"바람 세기 조절하기","action":"바람을 살살 또는 세게 조절해봐요.","focus":"breath","focusLabel":"호흡·쉼","life":"바람의 세기 차이 알아차리기","steps":["세기 신호 보기","바람 불기","변화 살펴보기"]},"long":{"title":"바람 일정하게 이어가기","action":"정해진 시간 동안 바람을 이어가요.","focus":"breath","focusLabel":"호흡·쉼","life":"천천히 바람 내보내는 연습","steps":["시간 고르기","바람 이어가기","내 호흡 살펴보기"]},"feel":{"title":"상황 속 마음 생각하기","action":"친구의 마음과 여러 대응 방법을 생각해요.","focus":"emotion","focusLabel":"감정·관계","life":"친구의 입장과 내 표현 방법 생각하기","steps":["상황 살펴보기","가능한 마음 생각","대응 방법 고르기"]}};
const FILTERS={
 cognitive:[['all','전체 보기'],['find','👀 찾기·집중'],['memory','🧠 기억하기'],['follow','➡️ 순서 따라하기'],['inhibit','✋ 기다리기·조절'],['space','📍 위치·구성'],['listen','👂 보고·듣고'],['motor','🤲 손동작']],
 thinking:[['all','전체 보기'],['rule','🔁 규칙 바꾸기'],['reason','🧩 비교·추론'],['plan','🗺️ 계획 세우기']],
 learning:[['all','전체 보기'],['korean','📖 한글·국어'],['math','🪙 돈·수학'],['life','🎒 생활학습']],
 music:[['all','전체 보기'],['rhythm','🥁 리듬·박자'],['instrument','🎶 악기·운지']],
 heart:[['all','전체 보기'],['emotion','💛 감정·관계'],['breath','🌬️ 호흡·쉼']]
};
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>Array.from(root.querySelectorAll(s));
function esc(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function keyFor(href){
 const url=new URL(href,location.href),p=url.pathname, q=url.searchParams;
 if(p.includes('/moa-missions/'))return q.get('game');
 if(p.includes('/breath-garden/'))return q.get('mode');
 if(p.includes('/rhythm-touch/'))return 'rhythm-touch';
 if(p.includes('/hand-mirror/'))return 'hand-mirror';
 if(p.includes('/rescue/'))return 'rescue';
 if(p.includes('/recorder/'))return 'recorder';
 return q.get('game');
}
const modal=document.createElement('dialog');modal.className='garden-preview-dialog';modal.id='gardenPreviewDialog';
modal.innerHTML='<div class="preview-dialog-header"><span class="preview-overline">게임 미리보기</span><button type="button" class="preview-close" aria-label="미리보기 닫기">✕</button></div><div class="preview-dialog-content"><div class="preview-visual"><div class="preview-frame-switch" role="group" aria-label="게임 화면 종류"><button type="button" data-frame="play" aria-pressed="true">놀이 장면</button><button type="button" data-frame="intro" aria-pressed="false">시작 안내</button></div><img id="previewShot" alt="실제 게임 예시 화면" /><div class="preview-fallback" hidden>화면 미리보기를 준비하고 있어요.</div></div><div class="preview-info"><p class="preview-type" id="previewType"></p><h2 id="previewTitle"></h2><p class="preview-action" id="previewAction"></p><h3>어떻게 놀아요?</h3><ol id="previewSteps"></ol><div class="preview-life"><small>활동에서 연습하는 것</small><p id="previewLife"></p></div><p class="preview-note">게임 속 친구의 색은 활동 분류나 난이도를 나타내지 않아요. 실제 게임에서 만나는 친구예요.</p><a id="previewPlay" class="preview-play" href="#">바로 게임 시작 →</a></div></div>';
document.body.append(modal);
$('.preview-close',modal).addEventListener('click',()=>modal.close());
modal.addEventListener('click',e=>{if(e.target===modal)modal.close()});
let lastPreviewTrigger=null;
modal.addEventListener('close',()=>lastPreviewTrigger?.focus());
const supportDialog=typeof modal.showModal==='function';
function imageFallback(img,key,old){
 img.onerror=()=>{
  if(!img.dataset.fallbackStep){
   img.dataset.fallbackStep='intro';
   img.alt=(CATALOG[key]?.title||'게임')+' 실제 시작 안내 화면';
   const cap=img.closest('.play-card-media')?.querySelector('.shot-caption');
   if(cap)cap.textContent='게임 시작 화면';
   img.src='previews/'+key+'.jpg'+PREVIEW_VERSION;return
  }
  if(img.dataset.fallbackStep==='intro'){
   img.dataset.fallbackStep='character';img.closest('.preview-visual, .play-card-media')?.classList.add('no-real-shot');
   const cap=img.closest('.play-card-media')?.querySelector('.shot-caption');if(cap)cap.textContent='게임 대표 캐릭터';
   img.src=old||'../thinking-garden/assets/moa-discovery.png';return
  }
  img.onerror=null;img.closest('.preview-visual, .play-card-media')?.classList.add('no-real-shot');
  const cap=img.closest('.play-card-media')?.querySelector('.shot-caption');if(cap)cap.textContent='이미지를 표시할 수 없어요';
 };
}
function openPreview(key,href,trigger){
 const item=CATALOG[key];if(!item)return;
 lastPreviewTrigger=trigger;
 $('#previewType').textContent=item.focusLabel;
 $('#previewTitle').textContent=item.title;
 $('#previewAction').textContent=item.action;
 $('#previewSteps').innerHTML=item.steps.map(t=>'<li>'+esc(t)+'</li>').join('');
 $('#previewLife').textContent=item.life;
 $('#previewPlay').href=href;
 const img=$('#previewShot');
 function setFrame(frame){
  modal.querySelectorAll('[data-frame]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.frame===frame)));
  img.closest('.preview-visual')?.classList.remove('no-real-shot');
  img.alt=item.title+(frame==='play'?' 실제 놀이 장면':' 실제 시작 안내 화면');
  img.dataset.fallbackStep='';
  img.src='previews/'+key+(frame==='play'?'-play':'')+'.jpg'+PREVIEW_VERSION;
  imageFallback(img,key,trigger.closest('.play-card')?.dataset.character);
 }
 modal.querySelectorAll('[data-frame]').forEach(b=>{b.onclick=()=>setFrame(b.dataset.frame)});
 setFrame('play');
 if(supportDialog)modal.showModal();else {modal.setAttribute('open','');modal.scrollIntoView({behavior:'smooth'})}
}
const sections=$$('.garden-section');let total=0;
for(const section of sections){
 const area=section.id,oldCards=$$('a.play-card',section),filterDefs=FILTERS[area]||[['all','전체']];
 let replaced=0;
 for(const a of oldCards){
  const href=a.getAttribute('href'),key=keyFor(href),item=CATALOG[key];
  if(!item){console.warn('Missing game metadata:',href);continue}
  const prevImg=$('img',a),originalImage=prevImg?.getAttribute('src')||'../thinking-garden/assets/moa-discovery.png';
  const originalTitle=$('.play-card-body strong',a)?.textContent?.trim()||item.title;
  const card=document.createElement('article');
  card.className='play-card play-card-enhanced';
  card.dataset.game=key;card.dataset.focus=item.focus;card.dataset.character=originalImage;
  card.dataset.title=item.title;card.dataset.oldName=originalTitle;
  card.dataset.search=[item.title,originalTitle,item.action,item.focusLabel,item.life,...item.steps].join(' ').toLocaleLowerCase('ko-KR');
  card.innerHTML='<div class="play-card-media"><img loading="lazy" decoding="async" class="real-shot" src="previews/'+esc(key)+'-play.jpg'+PREVIEW_VERSION+'" alt="'+esc(item.title)+' 실제 게임 예시" /><span class="shot-caption">실제 게임 화면</span></div>'+
    '<div class="play-card-details"><p class="play-activity">'+esc(item.focusLabel)+'</p><h3>'+esc(item.title)+'</h3>'+
    (originalTitle!==item.title?'<p class="play-story-name">'+esc(originalTitle)+'</p>':'')+
    '<p class="play-simple-desc">'+esc(item.action)+'</p><p class="play-life-one-line" title="'+esc(item.life)+'">생활 연결 · '+esc(item.life)+'</p>'+
    '<div class="play-buttons"><button type="button" class="play-preview-btn">미리보기</button><a class="play-start-btn" href="'+esc(href)+'">바로 하기 <span aria-hidden="true">→</span></a></div></div>';
  const img=$('img.real-shot',card);
  imageFallback(img,key,originalImage);
  $('.play-preview-btn',card).addEventListener('click',e=>openPreview(key,href,e.currentTarget));
  a.replaceWith(card);replaced++;
 }
 total+=replaced;
 if(replaced>0){
  const controls=document.createElement('div');controls.className='garden-discovery-controls';
  controls.innerHTML='<div class="garden-filter-title"><strong>어떤 활동을 찾고 있나요?</strong><span>캐릭터 색이 아니라 활동 방법으로 구분했어요.</span></div>'+
  '<div class="garden-filter-buttons" role="group" aria-label="'+area+' 활동 고르기">'+
  filterDefs.map(([value,label])=>'<button type="button" data-focus="'+esc(value)+'" aria-pressed="'+(value==='all')+'" class="'+(value==='all'?'is-current':'')+'">'+esc(label)+'</button>').join('')+'</div>'+
  '<p class="garden-filter-count" aria-live="polite"><b>'+replaced+'</b>개 게임을 볼 수 있어요.</p>';
  const list=$('.plays',section);list.before(controls);
  const buttons=$$('button[data-focus]',controls);
  buttons.forEach(button=>button.addEventListener('click',()=>{
    section.dataset.activeFocus=button.dataset.focus;
    buttons.forEach(x=>{const active=x===button;x.classList.toggle('is-current',active);x.setAttribute('aria-pressed',String(active))});
    section.dataset.expanded='false';
    refreshResults();
  }));
  if(area==='cognitive'){
    const more=document.createElement('div');more.className='garden-more-wrap';
    more.innerHTML='<button type="button" class="garden-more-button" aria-expanded="false">더 많은 게임 보기</button>';
    list.after(more);
    more.querySelector('button').addEventListener('click',()=>{section.dataset.expanded=String(section.dataset.expanded!=='true');refreshResults()});
  }
 }
}

/* Search the entire collection without making visitors memorize which garden holds a game. */
const introNote=$('.garden-note');
const searchPanel=document.createElement('section');
searchPanel.className='garden-search-panel';
searchPanel.setAttribute('aria-label','전체 게임 찾기');
searchPanel.innerHTML='<div class="garden-search-title"><span aria-hidden="true">🔎</span><div><strong>어떤 게임이 필요하세요?</strong><small>기억, 준비물, 돈 계산, 박자처럼 찾아보세요.</small></div></div>'+
 '<div class="garden-search-controls"><label class="sr-only" for="gardenSearch">게임 검색</label><input id="gardenSearch" type="search" autocomplete="off" placeholder="예: 기억, 기다리기, 돈, 박자" /><button type="button" id="gardenSearchClear" hidden>지우기</button></div>'+
 '<p class="garden-search-status" id="gardenSearchStatus" role="status" aria-live="polite"></p>';
introNote.before(searchPanel);
const searchInput=$('#gardenSearch'),searchClear=$('#gardenSearchClear'),searchStatus=$('#gardenSearchStatus');
function refreshResults(){
 const query=searchInput.value.trim().toLocaleLowerCase('ko-KR');
 let grandTotal=0;
 for(const section of sections){
  const filter=section.dataset.activeFocus||'all';
  const cards=Array.from(section.querySelectorAll('.play-card-enhanced'));
  const matches=cards.filter(card=>(filter==='all'||card.dataset.focus===filter)&&(!query||card.dataset.search.includes(query)));
  const limit=!query&&section.id==='cognitive'&&filter==='all'&&section.dataset.expanded!=='true'?6:Infinity;
  cards.forEach(card=>{card.hidden=!matches.includes(card)||matches.indexOf(card)>=limit});
  const visible=Math.min(limit,matches.length);
  grandTotal+=matches.length;
  section.hidden=!!query&&!matches.length;
  const counter=$('.garden-filter-count',section);
  if(counter)counter.innerHTML='<b>'+matches.length+'</b>개 게임'+(visible<matches.length?' 중 '+visible+'개 먼저 보기':'');
  const more=$('.garden-more-wrap',section);
  if(more){
   more.hidden=!!query||filter!=='all'||matches.length<=6;
   const button=$('.garden-more-button',more);
   if(button){const expanded=section.dataset.expanded==='true';button.textContent=expanded?'접기 ↑':'나머지 '+(matches.length-6)+'개 게임 더 보기 ↓';button.setAttribute('aria-expanded',String(expanded))}
  }
 }
 searchClear.hidden=!query;
 searchStatus.textContent=query?(grandTotal?grandTotal+'개 게임을 찾았어요.':'일치하는 게임이 없어요. 다른 말로 다시 찾아볼 수 있어요.'):'';
}
searchInput.addEventListener('input',()=>{for(const section of sections){section.dataset.activeFocus='all';Array.from(section.querySelectorAll('button[data-focus]')).forEach(b=>{const active=b.dataset.focus==='all';b.classList.toggle('is-current',active);b.setAttribute('aria-pressed',String(active))});}refreshResults()});
searchInput.addEventListener('keydown',e=>{if(e.key==='Escape'){searchInput.value='';refreshResults()}});
searchClear.addEventListener('click',()=>{searchInput.value='';refreshResults();searchInput.focus()});
Array.from(document.querySelectorAll('.garden-jumps a')).forEach(a=>a.addEventListener('click',()=>{if(searchInput.value){searchInput.value='';refreshResults()}}));
refreshResults();

console.info('Garden discovery ready:',total,'games');
})();
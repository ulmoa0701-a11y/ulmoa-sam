/* Shared references only: the original files, term pages and games remain their source of truth. */
(()=>{
'use strict';
const entries={
 cognitive:{
  materials:[
   {areas:['visual','space'],kind:'활동지 · PDF',title:'차근차근 · 시각변별 활동',desc:'같은 것·다른 것·모양 찾기를 인쇄해서 활용하는 자료',path:'materials/#cognitiveShelf'},
   {areas:['space'],kind:'활동지 · PDF',title:'큰 공간에 표시해요',desc:'넓은 영역을 보고 표시하는 기초 시각·공간 활동',path:'materials/#cognitiveShelf'},
   {areas:['memory','visual'],kind:'활용 안내 · PDF',title:'차근차근 활용가이드',desc:'기초활동을 활용할 때 참고하는 기존 안내 자료',path:'materials/#cognitiveShelf'},
   {areas:['life'],kind:'활동지 · PDF',title:'생활·자기관리 자료',desc:'일상과 자기점검 활동지를 모아둔 자료 책장',path:'materials/#lifeShelf'}
  ],
  learn:[
   {areas:['visual'],kind:'개념 · 알아봄',title:'선택주의와 지속주의',desc:'필요한 자극에 집중하는 것과 그 집중을 이어가는 것의 차이',path:'notes/#memo-attention-types'},
   {areas:['visual','space'],kind:'개념 · 알아봄',title:'시각주의와 시지각',desc:'시각정보에 주의를 두는 과정과 보고 해석하는 과정을 구분해요',path:'notes/#memo-visual'},
   {areas:['memory'],kind:'개념 · 알아봄',title:'작업기억',desc:'필요한 정보를 잠시 유지하면서 사용하는 과정',path:'notes/#memo-working-memory'},
   {areas:['memory'],kind:'개념 · 알아봄',title:'실행기능과 억제통제',desc:'목표를 위해 기억하고 멈추고 계획하는 과정을 살펴봐요',path:'notes/#memo-executive'},
   {areas:['literacy','language'],kind:'개념 · 알아봄',title:'음운인식',desc:'말소리의 구조를 알아차리고 나누고 합치는 능력',path:'notes/#memo-phonological-awareness'},
   {areas:['literacy'],kind:'개념 · 알아봄',title:'읽기유창성',desc:'글을 정확하고 자연스럽게 이어 읽는다는 것',path:'notes/#memo-reading-fluency'},
   {areas:['language'],kind:'개념 · 알아봄',title:'수용언어와 표현언어',desc:'이해하는 말과 표현하는 말의 차이',path:'notes/#memo-receptive-expressive'},
   {areas:['space'],kind:'개념 · 알아봄',title:'시공간 작업기억',desc:'본 위치·모양·순서를 잠시 기억하며 활용하기',path:'notes/#memo-visuospatial-working-memory'},
   {areas:['life'],kind:'개념 · 알아봄',title:'계획과 조직화',desc:'목표와 순서, 시간, 준비물을 정리하는 과정',path:'notes/#memo-planning-organization'},
   {areas:['life','memory'],kind:'보호자·교사 정보',title:'일상에서 주의·기억 살펴보기',desc:'어떤 과제와 환경에서 참여하기 쉬운지 관찰할 항목',path:'parents/#attention'},
   {areas:['life'],kind:'보호자·교사 정보',title:'생활·자립 살펴보기',desc:'일상생활의 절차와 필요한 도움을 관찰할 항목',path:'parents/#daily'}
  ]
 },
 music:{
  materials:[
   {areas:['rhythm','notation'],kind:'악보 자료 · PDF',title:'16분 리듬 예시',desc:'4/4박자 안에서 16분음표 길이를 살펴보는 울모아 제작 자료',path:'materials/heart-score/sixteenth-rhythm_landscape.pdf'},
   {areas:['rhythm','notation'],kind:'악보 자료 · PDF',title:'점8분·16분 리듬 예시',desc:'점8분음표와 16분음표 길이를 비교하는 울모아 제작 자료',path:'materials/heart-score/dotted-rhythm_landscape.pdf'},
   {areas:['notation','recorder'],kind:'색깔악보 · PDF',title:'작은별 색깔악보',desc:'계이름을 보며 연주 순서를 따라가는 인쇄용 악보',path:'materials/heart-score/twinkle_landscape.pdf'},
   {areas:['notation','recorder'],kind:'음악 도구',title:'하트색깔악보 Studio',desc:'직접 악보를 만들거나 공개된 샘플곡을 불러오는 도구',path:'heart-score/'},
   {areas:['rhythm','notation','recorder'],kind:'음악 자료 책장',title:'색깔악보 전체 보기',desc:'나비야·작은별·리듬 예시 등 기존 음악 자료를 모아보기',path:'materials/#musicShelf'}
  ],
  learn:[
   {areas:['rhythm'],kind:'기초 개념',title:'박자와 리듬은 무엇이 다를까요?',desc:'박자는 일정하게 세는 흐름, 리듬은 소리와 쉼을 길고 짧게 배치한 모양이에요.',path:'materials/#musicShelf'},
   {areas:['rhythm','notation'],kind:'기초 개념',title:'2/4와 4/4박자 읽기',desc:'2/4는 한 마디에 4분음표 기준 두 박, 4/4는 네 박을 담아요. 악보 예시로 비교해요.',path:'materials/#musicShelf'},
   {areas:['notation'],kind:'기초 개념',title:'계이름을 눈으로 따라가기',desc:'도·레·미처럼 음의 이름을 확인하고 악보의 순서대로 소리를 연결해요.',path:'heart-score/'},
   {areas:['recorder'],kind:'연습 안내',title:'리코더 운지부터 살펴보기',desc:'손가락으로 구멍을 덮는 위치를 보고, 익숙해지면 소리와 연결해요.',path:'thinking-garden/recorder/'}
  ]
 }
};
const names={games:'게임·활동',materials:'활동지·자료',learn:'알아보기'};
const root=document.querySelector('[data-moa-garden]');
if(!root)return;
const garden=root.dataset.moaGarden,source=entries[garden];
if(!source)return;
const group=root.querySelector('#gardenGamePanel'),resources=root.querySelector('#gardenResourcePanel');
const cards=root.querySelector('#gardenResourceCards');
const message=root.querySelector('#gardenResourceNote');
const buttons=[...root.querySelectorAll('[data-garden-view]')];
const subjects=[...root.querySelectorAll('[data-garden-topic]')];
let view=new URLSearchParams(location.search).get('view')||'games';
if(!Object.hasOwn(names,view))view='games';
let topic=garden==='music'?new URLSearchParams(location.search).get('topic')||'all':'all';
if(garden==='music'&&!subjects.some(b=>b.dataset.gardenTopic===topic))topic='all';
const siblingPath=p=>new URL('../'+p,location.href).href;
function listFor(type,area){
 const all=source[type]||[];
 return area==='all'?all:all.filter(e=>e.areas.includes(area));
}
function el(tag,cls,text){const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x}
function render(type,area){
 cards.replaceChildren();
 const data=listFor(type,area);
 const fragment=document.createDocumentFragment();
 for(const item of data){
  const a=el('a','moa-resource-card');
  a.href=siblingPath(item.path);
  if(item.path.endsWith('.pdf')){a.target='_blank';a.rel='noopener';a.setAttribute('aria-label',item.title+' PDF 새 창에서 보기')}
  a.append(el('span','moa-resource-type',item.kind),el('strong','moa-resource-title',item.title),el('span','moa-resource-desc',item.desc),el('span','moa-resource-arrow',item.path.endsWith('.pdf')?'PDF 보기 ↗':'자세히 보기 →'));
  fragment.append(a);
 }
 cards.append(fragment);
 const empty=data.length===0;
 const title=type==='materials'?'이 분야의 인쇄 자료는 아직 따로 정리되지 않았어요.':'이 분야의 설명은 아직 따로 정리되지 않았어요.';
 message.replaceChildren();
 if(empty)message.append(el('span','',title),' ',Object.assign(el('a','','전체 자료 책장 보기 →'),{href:siblingPath(type==='materials'?'materials/':'notes/')}));
 else message.append(el('span','','기존 자료·정보의 원본으로 연결돼요. 수정과 업데이트는 원본 한 곳에서 관리합니다.'));
 message.hidden=false;
}
function setView(next,updateURL=true){
 view=next;
 if(garden==='music'&&view==='games'){
  root.querySelectorAll('.game-card').forEach(c=>c.hidden=topic!=='all'&&c.dataset.gardenTopic!==topic);
  if(![...root.querySelectorAll('.game-card')].some(c=>!c.hidden))view='materials';
 }
 if(garden==='cognitive'&&view==='games'){
  const selected=root.querySelector('.category-tab.active')?.dataset.category||'all';
  const hasGames=[...root.querySelectorAll('.library-card')].some(c=>selected==='all'||c.dataset.category===selected);
  if(!hasGames)view='learn';
 }
 group.hidden=view!=='games';
 resources.hidden=view==='games';
 buttons.forEach(b=>{const active=b.dataset.gardenView===view;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1});
 resources.setAttribute('aria-labelledby','gardenView-'+view);
 if(view!=='games')render(view,garden==='cognitive'?(root.querySelector('.category-tab.active')?.dataset.category||'all'):topic);
 if(updateURL){
  const u=new URL(location.href);
  if(view==='games')u.searchParams.delete('view');else u.searchParams.set('view',view);
  if(garden==='music'){if(topic==='all')u.searchParams.delete('topic');else u.searchParams.set('topic',topic)}
  history.replaceState(null,'',u.pathname+u.search+u.hash);
 }
}
buttons.forEach(b=>b.addEventListener('click',()=>setView(b.dataset.gardenView)));
if(garden==='cognitive'){
 root.querySelectorAll('.category-tab').forEach(b=>b.addEventListener('click',()=>setView(view)));
}else{
 subjects.forEach(b=>b.addEventListener('click',()=>{
  topic=b.dataset.gardenTopic;
  subjects.forEach(x=>{const active=x===b;x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active))});
  setView(view);
 }));
 subjects.forEach(b=>{const active=b.dataset.gardenTopic===topic;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
}
setView(view,false);
})();

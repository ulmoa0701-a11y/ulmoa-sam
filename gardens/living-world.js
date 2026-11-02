/* Living-world navigation V1: original, separate from rejected PR #528.
   Use real garden destinations and 34 actual game URLs. No fake UI art.
   Default UI remains the original gallery if this script cannot initialize. */
(()=>{
'use strict';
const nav=document.querySelector('nav.garden-jumps');
const sections=[...document.querySelectorAll('section.garden-section')];
const cards=[...document.querySelectorAll('.play-card-enhanced')];
const search=document.querySelector('#gardenSearch');
if(!nav||sections.length!==5||cards.length!==34)return;
const ids=['cognitive','thinking','learning','music','heart'];
const counts={};
for(const s of sections){
 counts[s.id]=s.querySelectorAll('.play-card-enhanced').length;
 if(!ids.includes(s.id))return;
}
if(ids.reduce((n,id)=>n+counts[id],0)!==34)return;
document.body.classList.add('world-ready');
nav.classList.add('world-map');
nav.setAttribute('aria-label','모아의 다섯 정원 — 실제 탐험 장소');
const intro=document.createElement('div');
intro.className='world-intro';
intro.innerHTML='<span class="world-intro-icon" aria-hidden="true">✦</span><span>모아와 함께 가보고 싶은 정원을 골라봐!</span><span class="world-intro-caption">각 장소에 들어가면 실제 게임을 만나볼 수 있어요.</span>';
nav.before(intro);
// The live page heading is already directly above the map; no baked or duplicate title.
const guide=document.createElement('img');
guide.src='../assets/moa-hello-wave-20261012.webp';
guide.alt='';guide.className='world-guide';
guide.loading='lazy';guide.decoding='async';
nav.append(guide);
const worldFriends={
 cognitive:'rabbit-blue',thinking:'duck-green',learning:'pig-yellow',
 music:'cow-blue',heart:'rabbit-red'
};
for(const [place,friend] of Object.entries(worldFriends)){
 const actor=document.createElement('img');
 actor.src='../thinking-garden/games/rescue/art/illustrated/'+friend+'.webp';
 actor.alt='';actor.className='world-actor world-actor-'+place;
 actor.setAttribute('aria-hidden','true');actor.decoding='async';actor.loading='lazy';
 nav.append(actor);
}
const gardenLinks=[...nav.querySelectorAll('a.garden-jump')];
for(const a of gardenLinks){
 const id=(a.getAttribute('href')||'').slice(1);
 if(!ids.includes(id))continue;
 a.classList.add('world-portal');
 a.dataset.garden=id;
 a.setAttribute('aria-label',a.querySelector('strong')?.textContent?.trim()+' — '+counts[id]+'개 게임을 탐험하기');
 const sub=a.querySelector('span:not(.jump-symbol):not(.jump-arrow)');
 const n=document.createElement('em');n.className='world-count';n.textContent=counts[id]+'개 게임';
 sub?.append(n);
}
const bar=document.createElement('div');bar.className='world-actions';
const switcher=document.createElement('button');
switcher.type='button';switcher.id='worldListToggle';switcher.className='world-list-toggle';
switcher.setAttribute('aria-pressed','false');switcher.textContent='☷ 전체 게임 목록 보기';
bar.append(switcher);
const help=document.createElement('p');help.className='world-footnote';
help.textContent='정원은 난이도나 능력의 순위가 아니에요. 원하는 곳부터 시작해도 좋아요.';
bar.append(help);
nav.after(bar);
const backs=[];
for(const s of sections){
 s.classList.add('world-zone');
 const header=document.createElement('div');header.className='world-zone-top';
 const back=document.createElement('button');back.type='button';
 back.className='world-back';back.textContent='← 다섯 정원 지도로';
 back.setAttribute('aria-label',s.querySelector('h2')?.textContent+'에서 다섯 정원 지도로 돌아가기');
 header.append(back);s.prepend(header);backs.push(back);
 const key=s.id;
 s.dataset.world=key;
 const scene=document.createElement('div');
 scene.className='world-zone-landscape';scene.setAttribute('aria-hidden','true');
 const sceneTitle=document.createElement('span');
 sceneTitle.textContent={cognitive:'기억의 나무집',thinking:'생각이 자라는 연못',
 learning:'배움의 책방',music:'소리의 연주 무대',heart:'마음이 쉬는 꽃집'}[key];
 sceneTitle.className='world-zone-scene-label';scene.setAttribute('role','presentation');
 scene.append(sceneTitle);
 s.querySelector('.garden-section-heading')?.after(scene);
 const field=s.querySelector('.plays');
 if(field){
  field.classList.add('world-trail');
  let index=0;
  for(const card of field.querySelectorAll('.play-card-enhanced')){
   card.classList.add('world-game-stop');
   card.style.setProperty('--stop-phase',index++%3);
   const media=card.querySelector('.play-card-media');
   const preview=card.querySelector('.play-preview-btn');
   if(media&&preview){
    media.tabIndex=0;media.setAttribute('role','button');
    media.setAttribute('aria-label',card.dataset.title+' 게임 화면 미리보기');
    media.addEventListener('click',()=>preview.click());
    media.addEventListener('keydown',e=>{
     if(e.key==='Enter'||e.key===' '){e.preventDefault();preview.click();}
    });
   }
  }
 }
}
let active=null,list=false;
function goToGarden(id,push){
 const target=sections.find(s=>s.id===id);if(!target)return;
 list=false;active=id;
 document.body.classList.remove('world-list-mode');
 document.body.classList.add('world-in-garden');
 for(const s of sections){s.classList.toggle('world-zone-active',s.id===id);}
 switcher.setAttribute('aria-pressed','false');switcher.textContent='☷ 전체 게임 목록 보기';
 if(push)history.pushState({garden:id},'',location.pathname+location.search+'#'+id);
 requestAnimationFrame(()=>target.scrollIntoView({behavior:'instant',block:'start'}));
}
function backToMap(push){
 active=null;list=false;
 document.body.classList.remove('world-list-mode','world-in-garden');
 for(const s of sections)s.classList.remove('world-zone-active');
 switcher.setAttribute('aria-pressed','false');switcher.textContent='☷ 전체 게임 목록 보기';
 if(push)history.pushState({garden:null},'',location.pathname+location.search);
 requestAnimationFrame(()=>nav.scrollIntoView({behavior:'instant',block:'start'}));
}
function listMode(){
 active=null;list=true;
 document.body.classList.remove('world-in-garden');
 document.body.classList.add('world-list-mode');
 for(const s of sections)s.classList.remove('world-zone-active');
 switcher.setAttribute('aria-pressed','true');switcher.textContent='✿ 정원 지도로 돌아가기';
 requestAnimationFrame(()=>sections[0]?.scrollIntoView({behavior:'instant',block:'start'}));
}
for(const a of gardenLinks){
 a.addEventListener('click',e=>{
  const id=a.dataset.garden;if(!ids.includes(id))return;
  e.preventDefault();goToGarden(id,true);
 });
}
for(const b of backs)b.addEventListener('click',()=>backToMap(true));
switcher.addEventListener('click',()=>list?backToMap(true):listMode());
search?.addEventListener('input',()=>{
 if(search.value.trim())listMode();
});
window.addEventListener('popstate',()=>{
 const id=decodeURIComponent(location.hash.slice(1));
 if(ids.includes(id))goToGarden(id,false);else backToMap(false);
});
// A path winds through actual interactive game landmarks. The path is
// decorative SVG only; the original keyboard-focusable buttons remain HTML.
const trails=[];
for(const zone of sections){
 const field=zone.querySelector('.world-trail');
 if(!field)continue;
 const line=document.createElementNS('http://www.w3.org/2000/svg','svg');
 line.setAttribute('class','world-winding-trail');
 line.setAttribute('aria-hidden','true');line.setAttribute('focusable','false');
 line.setAttribute('preserveAspectRatio','none');
 field.prepend(line);
 trails.push({zone,field,line,cards:[...field.querySelectorAll('.world-game-stop')]});
}
function redrawTrails(){
 if(!document.body.classList.contains('world-in-garden'))return;
 for(const {zone,field,line,cards:stops} of trails){
  if(!zone.classList.contains('world-zone-active'))continue;
  const root=field.getBoundingClientRect();
  const shown=stops.filter(card=>!card.hidden&&getComputedStyle(card).display!=='none');
  const points=shown.map(card=>{
   const el=card.querySelector('.play-card-media')||card;
   const b=el.getBoundingClientRect();
   return{x:b.left-root.left+b.width*.5,y:b.top-root.top+b.height*.56};
  });
  const width=Math.max(1,field.clientWidth),height=Math.max(1,field.clientHeight);
  line.setAttribute('viewBox','0 0 '+width+' '+height);
  line.setAttribute('width',width);line.setAttribute('height',height);
  let d='';
  for(let i=0;i<points.length;i++){
   const p=points[i];
   if(i===0){d='M '+p.x+' '+p.y;continue}
   const a=points[i-1],dy=p.y-a.y,dx=p.x-a.x;
   if(Math.abs(dy)<15){
    d+=' Q '+(a.x+p.x)/2+' '+(a.y-31)+' '+p.x+' '+p.y;
   }else{
    d+=' C '+(a.x+dx*.25)+' '+(a.y+dy*.50)+' '+(p.x-dx*.25)+' '+(p.y-dy*.50)+' '+p.x+' '+p.y;
   }
  }
  line.innerHTML='<path class="world-trail-ridge" d="'+d+'"/>'+
  '<path class="world-trail-soil" d="'+d+'"/>'+
  '<path class="world-trail-light" d="'+d+'"/>';
 }
}
let pendingFrame=0;
function scheduleTrail(){
 if(pendingFrame)return;
 pendingFrame=requestAnimationFrame(()=>{pendingFrame=0;redrawTrails()});
}
const zonesObserver=new MutationObserver(scheduleTrail);
for(const {field,cards:stops} of trails){
 for(const card of stops)zonesObserver.observe(card,{attributes:true,attributeFilter:['hidden']});
 const btn=field.parentElement.querySelector('.garden-more-button');
 btn?.addEventListener('click',scheduleTrail);
}
window.addEventListener('resize',scheduleTrail,{passive:true});
const resizeWatcher=new ResizeObserver(scheduleTrail);
for(const {field} of trails)resizeWatcher.observe(field);
for(const a of gardenLinks)a.addEventListener('click',scheduleTrail);
for(const b of backs)b.addEventListener('click',scheduleTrail);
switcher.addEventListener('click',scheduleTrail);
const initial=decodeURIComponent(location.hash.slice(1));
if(ids.includes(initial))goToGarden(initial,false);
scheduleTrail();
console.info('Five living gardens ready: 5 real world portals, '+cards.length+' original game entries; reversible accessible list.');
})();
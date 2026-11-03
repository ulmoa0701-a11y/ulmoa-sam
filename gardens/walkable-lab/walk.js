(()=>{'use strict';
const el=id=>document.getElementById(id);
const scene=el('scene'),viewport=el('viewport'),player=el('player'),say=el('say'),interact=el('interact');
const panel=el('panel'),finder=el('finder');
const ids=['cognitive','thinking','learning','music','heart'];
const points={cognitive:{x:300,y:392},thinking:{x:1090,y:451},learning:{x:358,y:883},music:{x:1160,y:873},heart:{x:802,y:942}};
const centers={cognitive:{x:300,y:277},thinking:{x:1090,y:340},learning:{x:358,y:786},music:{x:1160,y:767},heart:{x:802,y:882}};
const pictures={cognitive:'friend-hong.png',thinking:'friend-ru.png',learning:'friend-saem.png',music:'friend-ti.png',heart:'moa-discovery.png'};
function previewAsset(g){
 const href=g.href||'';
 const known=(href.match(/\/games\/(hand-mirror|rescue|rhythm-touch)\//)||[])[1];
 const mode=(href.match(/[?&]mode=([^&]+)/)||[])[1];
 const key=(href.match(/[?&]game=([^&]+)/)||[])[1]||
  known||(href.includes('/recorder/')?'recorder':mode||'');
 return /^[a-zA-Z][a-zA-Z-]*$/.test(key)?'../previews/'+key+'-card.svg':null;
}
function thumb(g){
 const img=document.createElement('img');img.loading='lazy';img.decoding='async';img.alt='';
 img.src=previewAsset(g)||'../../thinking-garden/assets/'+pictures[g.garden];
 img.addEventListener('error',()=>{img.src='../../thinking-garden/assets/'+pictures[g.garden]}, {once:true});
 return img;
}
const portal=[...document.querySelectorAll('[data-portal]')], places=[...document.querySelectorAll('.place')];
let data=null, all=[], selected='all', current=null, page=0, nearby=null, walkTarget=null, waypoints=[], autoOpen=null, scale=1,camX=0,camY=0,last=0,raf=0;
const pos={x:800,y:535},keys=new Set(), held=new Set();
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const num=(x,a,b)=>Math.max(a,Math.min(b,x));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const sayText=s=>{if(say.textContent!==s)say.textContent=s};
const dialogsOpen=()=>panel.open||finder.open;
function camera(){
 const w=viewport.clientWidth,h=viewport.clientHeight;
 const isSmall=w<760;
 scale=isSmall?num(Math.min(w/510,h/700),.57,.94):Math.min(w/1600,h/1000,1.08);
 camX=isSmall?num(w*.52-pos.x*scale,w-1600*scale,0):(w-1600*scale)/2;
 camY=isSmall?num(h*.56-pos.y*scale,h-1000*scale,0):(h-1000*scale)/2;
 scene.style.transform='translate('+camX+'px,'+camY+'px) scale('+scale+')';
}
function draw(){
 player.style.left=pos.x+'px';player.style.top=pos.y+'px';
 let nearest=null,minDist=1e9;
 for(const id of ids){const d=distance(pos,points[id]);if(d<minDist){nearest=id;minDist=d}}
 const eligible=minDist<145?nearest:null;
 if(nearby!==eligible){nearby=eligible;places.forEach(p=>p.classList.toggle('near',p.dataset.place===nearby));}
 interact.disabled=!nearby;interact.textContent=nearby&&data?'🚪 '+data[nearby].name+' 들어가기':'가까운 정원에서 입장';
 if(nearby&&data){sayText(data[nearby].name+'에 도착했어! 들어가서 게임을 찾아볼까?')}
 else if(!walkTarget&&!waypoints.length){sayText('길을 따라 움직여 봐! 정원에 다가가면 들어갈 수 있어.')}
 camera();
}
function walkTo(dest,id){
 if(dialogsOpen())return;
 autoOpen=id||null;
 const pt={x:num(dest.x,65,1535),y:num(dest.y,145,945)};
 if(distance(pos,pt)>420&&distance(pos,{x:800,y:550})>290){waypoints=[{x:800,y:550},pt]}
 else waypoints=[pt];
 walkTarget=waypoints.shift();
 sayText('모아가 정원을 향해 걸어가고 있어…');
}
function interactGarden(id){
 if(!data||!data[id])return;
 current=id;page=0;
 showActivities();
 el('panelTabs').replaceChildren();
 panel.showModal();
 el('panelClose').focus();
}
function showActivities(){
 if(!data||!current)return;
 const d=data[current];
 const chunks=Math.ceil(d.games.length/3);
 page=num(page,0,chunks-1);
 el('panelTitle').textContent=d.name;
 el('panelDesc').textContent=d.subtitle+' · 총 '+d.games.length+'개 게임. 원하는 것을 바로 시작할 수 있어.';
 el('panelHint').textContent='🌿 '+d.hint;
 el('pageNo').textContent=(page+1)+' / '+chunks;
 el('prevSet').disabled=page===0;
 el('nextSet').disabled=page>=chunks-1;
 const list=d.games.slice(page*3,page*3+3);
 const root=el('activities');root.replaceChildren();
 for(const g of list){
  const box=document.createElement('article');box.className='activity';
  const art=document.createElement('div');art.className='art';
  art.append(thumb({...g,garden:current}));
  const copy=document.createElement('div');copy.className='copy';
  const h=document.createElement('h3');h.textContent=g.title;
  const link=document.createElement('a');link.href='../../'+g.href;link.textContent='게임 시작 →';
  copy.append(h,link);box.append(art,copy);root.append(box);
 }
}
function openQuick(){
 if(!data)return;
 current=null;
 el('panelTitle').textContent='어디부터 탐험할까?';
 el('panelDesc').textContent='정원을 골라주면 모아가 그곳으로 걸어가요.';
 el('panelHint').textContent='바로 이동';
 const root=el('activities');root.replaceChildren();
 for(const id of ids){
  const d=data[id],box=document.createElement('article');box.className='activity';
  const art=document.createElement('div');art.className='art';const img=document.createElement('img');img.src='../../thinking-garden/assets/'+pictures[id];img.alt='';art.append(img);
  const copy=document.createElement('div');copy.className='copy';const h=document.createElement('h3');h.textContent=d.name+' · '+d.games.length+'개';
  const btn=document.createElement('button');btn.textContent='여기로 이동 →';btn.style.cssText='background:#357456;color:white;border:none;border-radius:30px;padding:12px;width:100%;min-height:44px;font-weight:800';btn.addEventListener('click',()=>{panel.close();walkTo(points[id],id)});
  copy.append(h,btn);box.append(art,copy);root.append(box);
 }
 el('panelTabs').replaceChildren();el('pageNo').textContent='';el('prevSet').hidden=true;el('nextSet').hidden=true;
 panel.showModal();el('panelClose').focus();
}
function openGarden(id){
 el('prevSet').hidden=false;el('nextSet').hidden=false;
 interactGarden(id);
}
function fillFilters(){
 const root=el('filters');root.replaceChildren();
 for(const id of ['all',...ids]){
  const b=document.createElement('button');b.textContent=id==='all'?'전체':data[id].name;b.type='button';b.setAttribute('aria-pressed',String(id===selected));
  b.addEventListener('click',()=>{selected=id;renderFinder()});root.append(b);
 }
}
function renderFinder(){
 if(!data)return;
 fillFilters();
 const q=el('query').value.trim().toLowerCase();
 const filtered=all.filter(g=>(selected==='all'||g.garden===selected)&&g.title.toLowerCase().includes(q));
 const result=el('results');result.replaceChildren();
 for(const g of filtered){
  const a=document.createElement('a');a.className='result-card';a.href='../../'+g.href;
  const preview=document.createElement('span');preview.className='result-card-image';preview.append(thumb(g));
  const body=document.createElement('span');body.className='result-card-copy';
  const title=document.createElement('strong');title.textContent=g.title;
  const small=document.createElement('small');small.textContent=data[g.garden].name;
  const arrow=document.createElement('span');arrow.className='result-card-arrow';arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');
  body.append(small,title);a.append(preview,body,arrow);result.append(a);
 }
 if(!filtered.length){const p=document.createElement('p');p.textContent='찾은 게임이 없어요. 다른 이름을 입력해보세요.';result.append(p)}
}
function openFinder(){if(!data)return;selected='all';el('query').value='';renderFinder();finder.showModal();el('query').focus()}
function canMove(nx,ny){
 if(nx<46||ny<150||nx>1550||ny>963)return false;
 // The central pond is an actual obstacle, not an image-only warning.
 const dx=(nx-1090)/168,dy=(ny-293)/92;
 if(dx*dx+dy*dy<1)return false;
 return true;
}
function move(dt){
 if(dialogsOpen()){player.classList.remove('moving');return}
 let mx=0,my=0;
 if(keys.has('arrowleft')||keys.has('a')||held.has('left'))mx--;
 if(keys.has('arrowright')||keys.has('d')||held.has('right'))mx++;
 if(keys.has('arrowup')||keys.has('w')||held.has('up'))my--;
 if(keys.has('arrowdown')||keys.has('s')||held.has('down'))my++;
 const manual=mx||my,step=Math.min(dt,.05)*210;
 if(manual){walkTarget=null;waypoints=[];autoOpen=null;
  const len=Math.hypot(mx,my);mx/=len;my/=len;
 } else if(walkTarget){
  const dx=walkTarget.x-pos.x,dy=walkTarget.y-pos.y,len=Math.hypot(dx,dy);
  if(len<step+4){pos.x=walkTarget.x;pos.y=walkTarget.y;walkTarget=waypoints.shift()||null;
   if(!walkTarget&&autoOpen){const dest=autoOpen;autoOpen=null;openGarden(dest)}}
  else{mx=dx/len;my=dy/len}
 }
 if(mx||my){
  if(mx<-.08)player.classList.add('facing-left');else if(mx>.08)player.classList.remove('facing-left');
  if(canMove(pos.x+mx*step,pos.y+my*step))pos.x+=mx*step;
  if(canMove(pos.x,pos.y+my*step))pos.y+=my*step;
 }
 player.classList.toggle('moving',!!(mx||my)&&!reduced);
 draw();
}
function tick(time){const dt=last?(time-last)/1000:.016;last=time;move(dt);raf=requestAnimationFrame(tick)}
function onKey(e){
 const key=e.key.toLowerCase();
 if(dialogsOpen())return;
 if(['arrowleft','arrowright','arrowup','arrowdown','w','a','s','d',' '].includes(key)){
  if(e.target.closest('button,input,a'))return;
  e.preventDefault();keys.add(key)
 }
 if((key==='enter'||key==='e')&&nearby&&!e.target.closest('button,input,a')){e.preventDefault();openGarden(nearby)}
}
function bind(){
 window.addEventListener('keydown',onKey);
 window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
 window.addEventListener('blur',()=>{keys.clear();held.clear()});
 for(const b of document.querySelectorAll('.pad button')){
  const dir=b.dataset.dir;
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);held.add(dir);walkTarget=null;waypoints=[];autoOpen=null});
  const release=()=>held.delete(dir);
  b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);
 }
 for(const b of portal){b.addEventListener('click',e=>{e.stopPropagation();walkTo(points[b.dataset.portal],b.dataset.portal)})}
 viewport.addEventListener('pointerup',e=>{
  if(document.body.classList.contains('third-person'))return;
  if(e.target.closest('button,.pad,.hud'))return;
  if(dialogsOpen())return;
  const b=viewport.getBoundingClientRect();
  const x=(e.clientX-b.left-camX)/scale,y=(e.clientY-b.top-camY)/scale;
  walkTo({x,y},null);
 });
 el('interact').addEventListener('click',()=>nearby&&openGarden(nearby));
 el('returnCenter').addEventListener('click',()=>walkTo({x:800,y:535}));
 el('quick').addEventListener('click',openQuick);
 el('list').addEventListener('click',openFinder);
 el('accessibleList').addEventListener('click',openFinder);
 el('panelClose').addEventListener('click',()=>panel.close());
 el('finderClose').addEventListener('click',()=>finder.close());
 el('prevSet').addEventListener('click',()=>{page--;showActivities()});
 el('nextSet').addEventListener('click',()=>{page++;showActivities()});
 el('query').addEventListener('input',renderFinder);
 window.addEventListener('moa-world-move',event=>{
   const {x,y}=event.detail||{};
   if(Number.isFinite(x)&&Number.isFinite(y))walkTo({x,y});
 });
 window.addEventListener('resize',camera);
}
async function init(){
 bind();draw();raf=requestAnimationFrame(tick);
 try{
  const r=await fetch('games.json',{cache:'no-store'});if(!r.ok)throw Error('게임 데이터 HTTP '+r.status);
  const j=await r.json();data=j.gardens;all=ids.flatMap(id=>data[id].games.map(g=>({...g,garden:id})));
  if(all.length!==34)throw Error('게임 수 '+all.length+'개 / 기대 34개');
  for(const id of ids){if(!data[id]||!points[id])throw Error('누락 정원 '+id)}
  console.info('Walkable garden laboratory ready: five places, 34 original game routes');
 }catch(err){console.error(err);sayText('게임 목록을 불러오지 못했어요. 기존 목록으로 이동해 주세요.');
  const a=document.createElement('a');a.href='../';a.textContent='기존 게임 목록 열기';say.append(a)}
}
init();
})();
(()=>{'use strict';
const $=id=>document.getElementById(id);
const viewport=$('viewport'), world=$('world'), avatar=$('player'), message=$('message'), enter=$('enter');
const gardenDialog=$('gardenDialog'), findDialog=$('findDialog');
const W=1672,H=941, order=['cognitive','thinking','learning','music','heart'];
const points={
 cognitive:{x:515,y:343}, thinking:{x:1150,y:333},
 learning:{x:460,y:630}, music:{x:1215,y:641}, heart:{x:830,y:822}
};
const fallbackArt={cognitive:'friend-hong.png',thinking:'friend-ru.png',learning:'friend-saem.png',music:'friend-ti.png',heart:'moa-discovery.png'};
let data=null,games=[],active=null,selected='all',currentPage=0,nearby=null;
const pos={x:830,y:495}, keys=new Set(),pad=new Set();
let target=null,route=[],autoEnter=null,last=0,scale=1,offsetX=0,offsetY=0,prepared=false;
const prefersReduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function dialogsOpen(){return gardenDialog.open||findDialog.open}
function announce(text){if(message.textContent!==text)message.textContent=text}
function viewportSize(){return {w:Math.max(1,viewport.clientWidth),h:Math.max(1,viewport.clientHeight)}}
function setCamera(immediate=false){
 const {w,h}=viewportSize();
 scale=Math.max(w/W,h/H); // fixed scale for each screen size, never zoom during play
 const tx=clamp(w/2-pos.x*scale,Math.min(0,w-W*scale),0);
 const ty=clamp(h/2-pos.y*scale,Math.min(0,h-H*scale),0);
 if(!prepared||immediate){offsetX=tx;offsetY=ty;prepared=true}
 else {
  const px=pos.x*scale+offsetX, py=pos.y*scale+offsetY;
  const outX=px<w*.28||px>w*.72, outY=py<h*.28||py>h*.73;
  if(outX)offsetX+=(tx-offsetX)*.12;
  if(outY)offsetY+=(ty-offsetY)*.12;
 }
 world.style.transform=`translate3d(${offsetX.toFixed(2)}px,${offsetY.toFixed(2)}px,0) scale(${scale.toFixed(5)})`;
}
function playerDraw(moving){
 avatar.style.left=pos.x+'px';avatar.style.top=pos.y+'px';
 avatar.style.scale=(.67+pos.y/H*.46).toFixed(3);
 avatar.classList.toggle('moving',!!moving&&!prefersReduced);
 setCamera();
 const candidate=order.reduce((best,id)=>{const d=distance(pos,points[id]);return d<best.dist?{id,dist:d}:best},{id:null,dist:Infinity});
 const found=candidate.dist<115?candidate.id:null;
 if(found!==nearby){
  nearby=found;document.querySelectorAll('.portal').forEach(el=>el.classList.toggle('near',el.dataset.garden===nearby));
  enter.disabled=!nearby;
  enter.textContent=nearby&&data?data[nearby].name+' 들어가기':'가까운 정원에서 입장';
  if(nearby&&data)announce(data[nearby].name+'에 도착했어! 여기서 게임을 만나볼까?');
  else if(!target)announce('정원을 누르거나 길을 따라 움직여 봐!');
 }
}
function walk(destination,id=null){
 if(dialogsOpen())return;
 autoEnter=id;
 const d={x:clamp(destination.x,45,W-45),y:clamp(destination.y,155,H-32)};
 const delta=distance(pos,d);
 // Pass through the fountain plaza when traversing between distant gardens.
 route=delta>570&&distance(pos,{x:830,y:485})>170?[{x:830,y:485},d]:[d];
 target=route.shift();announce('모아가 정원을 향해 걸어가고 있어…');
}
function movement(dt){
 if(dialogsOpen()){avatar.classList.remove('moving');return}
 let dx=(keys.has('arrowright')||keys.has('d')||pad.has('right')?1:0)-(keys.has('arrowleft')||keys.has('a')||pad.has('left')?1:0);
 let dy=(keys.has('arrowdown')||keys.has('s')||pad.has('down')?1:0)-(keys.has('arrowup')||keys.has('w')||pad.has('up')?1:0);
 const speed=265*clamp(dt,0,.06),manual=!!(dx||dy);
 if(manual){target=null;route=[];autoEnter=null;const size=Math.hypot(dx,dy);dx/=size;dy/=size}
 else if(target){
  const dist=distance(pos,target);
  if(dist<=speed+5){
   pos.x=target.x;pos.y=target.y;
   target=route.shift()||null;
   if(!target&&autoEnter){const id=autoEnter;autoEnter=null;openGarden(id)}
  }else{dx=(target.x-pos.x)/dist;dy=(target.y-pos.y)/dist}
 }
 if(dx||dy){pos.x=clamp(pos.x+dx*speed,30,W-30);pos.y=clamp(pos.y+dy*speed,150,H-25);
  if(dx<-.1)avatar.style.setProperty('--face',-1);else if(dx>.1)avatar.style.setProperty('--face',1);
 }
 playerDraw(dx||dy||!!target);
}
function frame(now){const dt=last?Math.min((now-last)/1000,.06):.016;last=now;movement(dt);requestAnimationFrame(frame)}
function imageFor(game,id){
 const href=game.href||'';const known=(href.match(/\/games\/(hand-mirror|rescue|rhythm-touch)\//)||[])[1];
 const mode=(href.match(/[?&]mode=([^&]+)/)||[])[1];const key=(href.match(/[?&]game=([^&]+)/)||[])[1]||known||(href.includes('/recorder/')?'recorder':mode||'');
 const img=document.createElement('img');img.loading='lazy';img.decoding='async';img.alt='';
 img.src=/^[a-zA-Z][a-zA-Z-]*$/.test(key)?'../previews/'+key+'-card.svg':'../../thinking-garden/assets/'+fallbackArt[id];
 img.onerror=()=>{img.onerror=null;img.src='../../thinking-garden/assets/'+fallbackArt[id]};
 return img;
}
function makeCard(game,id,compact=false){
 const item=document.createElement(compact?'a':'article');item.className=compact?'find-result':'game-card';
 if(compact){item.href='../../'+game.href;
  item.append(imageFor(game,id));const text=document.createElement('span');const small=document.createElement('small');small.textContent=data[id].name;
  const strong=document.createElement('strong');strong.textContent=game.title;text.append(small,strong);item.append(text);
 }else{
  const art=document.createElement('div');art.className='game-art';art.append(imageFor(game,id));
  const copy=document.createElement('div');copy.className='game-copy';const title=document.createElement('h3');title.textContent=game.title;
  const link=document.createElement('a');link.href='../../'+game.href;link.textContent='게임 시작하기 →';copy.append(title,link);item.append(art,copy);
 }
 return item;
}
function showGames(){
 const id=active,group=data[id],perPage=3,total=Math.ceil(group.games.length/perPage);
 currentPage=clamp(currentPage,0,total-1);
 $('gardenTitle').textContent=group.name;$('gardenSubtitle').textContent=group.subtitle+' · 원하는 게임을 골라봐.';
 $('gardenCount').textContent='전체 '+group.games.length+'개 게임';
 $('pageInfo').textContent=(currentPage+1)+' / '+total;
 $('prevGames').disabled=currentPage===0;$('nextGames').disabled=currentPage===total-1;
 const container=$('gardenGames');container.replaceChildren(...group.games.slice(currentPage*perPage,currentPage*perPage+perPage).map(g=>makeCard(g,id)));
}
function openGarden(id){if(!data||!data[id])return;active=id;currentPage=0;showGames();gardenDialog.showModal();$('closeGarden').focus()}
function renderFinder(){
 if(!data)return;
 $('filters').replaceChildren(...['all',...order].map(id=>{
  const b=document.createElement('button');b.type='button';b.textContent=id==='all'?'전체 34개':data[id].name;b.setAttribute('aria-pressed',String(id===selected));
  b.addEventListener('click',()=>{selected=id;renderFinder()});return b;
 }));
 const q=$('query').value.trim().toLowerCase();const matches=games.filter(g=>(selected==='all'||g.garden===selected)&&g.title.toLowerCase().includes(q));
 const result=$('findResults');result.replaceChildren(...matches.map(g=>makeCard(g,g.garden,true)));
 if(!matches.length){const p=document.createElement('p');p.textContent='찾은 게임이 없어요. 검색어를 바꿔볼까요?';result.append(p)}
}
function bindControls(){
 window.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();if(dialogsOpen()||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k)){e.preventDefault();keys.add(k)}
  if((k==='enter'||k==='e')&&nearby&&!e.target.closest('a,input,textarea')){e.preventDefault();openGarden(nearby)}
 });
 window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
 window.addEventListener('blur',()=>{keys.clear();pad.clear()});
 for(const button of document.querySelectorAll('[data-move]')){
  const dir=button.dataset.move;
  button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);pad.add(dir);target=null;route=[];autoEnter=null});
  button.addEventListener('pointerup',()=>pad.delete(dir));button.addEventListener('pointercancel',()=>pad.delete(dir));
  button.addEventListener('lostpointercapture',()=>pad.delete(dir));
 }
 for(const button of document.querySelectorAll('.portal button')){
  button.addEventListener('click',e=>{e.stopPropagation();const id=button.closest('.portal').dataset.garden;walk(points[id],id)})
 }
 for(const button of document.querySelectorAll('[data-jump]'))button.addEventListener('click',()=>{const id=button.dataset.jump;walk(points[id],id)});
 viewport.addEventListener('pointerup',e=>{
  if(e.target.closest('button,.guide,.viewport-actions,.mobile-gardens,.move-pad'))return;
  if(dialogsOpen()||e.button!==0)return;
  const rect=viewport.getBoundingClientRect();
  const x=(e.clientX-rect.left-offsetX)/scale, y=(e.clientY-rect.top-offsetY)/scale;
  walk({x,y});
 });
 enter.addEventListener('click',()=>nearby&&openGarden(nearby));
 $('goPlaza').addEventListener('click',()=>walk({x:830,y:495}));
 $('openFinder').addEventListener('click',()=>{if(!data)return;selected='all';$('query').value='';renderFinder();findDialog.showModal();$('query').focus()});
 $('query').addEventListener('input',renderFinder);
 $('closeGarden').addEventListener('click',()=>gardenDialog.close());$('closeFinder').addEventListener('click',()=>findDialog.close());
 $('prevGames').addEventListener('click',()=>{currentPage--;showGames()});$('nextGames').addEventListener('click',()=>{currentPage++;showGames()});
 window.addEventListener('resize',()=>setCamera(true));
}
async function initialize(){
 bindControls();playerDraw(false);setCamera(true);requestAnimationFrame(frame);
 try{
  const r=await fetch('../walkable-lab/games.json',{cache:'no-cache'});if(!r.ok)throw Error('HTTP '+r.status);
  const result=await r.json();data=result.gardens;games=order.flatMap(id=>data[id].games.map(g=>({...g,garden:id})));
  if(games.length!==34)throw Error('게임 개수 불일치: '+games.length);
  for(const id of order)if(!data[id])throw Error('누락된 정원: '+id);
  announce('정원을 누르거나 길을 따라 움직여 봐!');
 }catch(e){console.error('Garden data loading failed',e);announce('게임 정보를 불러오지 못했어. 기존 정원에서 게임을 골라보자.');
  const a=document.createElement('a');a.href='../';a.textContent='기존 게임 목록 열기';message.append(a)}
}
initialize();
})();
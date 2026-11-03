(()=>{'use strict';
 const W=1672,H=941,BASE='../../';
 const $=id=>document.getElementById(id);
 const viewport=$('viewport'),scene=$('scene'),player=$('player'),guideText=$('guideText');
 const chooser=$('chooserDialog'),gardenDialog=$('gardenDialog'),library=$('libraryDialog');
 const ids=['cognitive','thinking','learning','music','heart'];
 const arrival={
  cognitive:{x:452,y:348},thinking:{x:981,y:369},learning:{x:442,y:683},
  music:{x:1365,y:374},heart:{x:1270,y:717}
 };
 const graph={
  plaza:{x:834,y:731},fountain:{x:837,y:566},left:{x:570,y:499},right:{x:1091,y:511},
  cognitive:arrival.cognitive,thinking:arrival.thinking,learning:arrival.learning,
  music:arrival.music,heart:arrival.heart
 };
 const connections=[['plaza','fountain'],['fountain','left'],['fountain','right'],
  ['left','cognitive'],['left','learning'],['right','thinking'],['right','music'],['right','heart']];
 const pos={...graph.plaza};
 const keys=new Set(),pressed=new Set(), reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
 const state={scale:1,tx:0,ty:0,viewWidth:0,viewHeight:0,data:null,all:[],near:null,destination:null,route:[],currentGarden:null,page:0,filter:'all',walk:false,raf:0,last:0,guide:''};
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const lerp=(a,b,t)=>a+(b-a)*t;
 const allDialogs=()=>[chooser,gardenDialog,library];
 const modalOpen=()=>allDialogs().some(d=>d.open);
 function say(message){if(state.guide!==message){state.guide=message;guideText.textContent=message}}
 function preventTextInput(target){return Boolean(target?.closest('input,textarea,select,[contenteditable="true"]'))}
 function nearestPointOnLine(p,a,b){
  const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/Math.max(1,dx*dx+dy*dy),0,1);
  return {x:a.x+dx*t,y:a.y+dy*t};
 }
 function nearestPathPoint(p){
  let best={x:graph.plaza.x,y:graph.plaza.y},dd=Infinity;
  for(const [a,b] of connections){const q=nearestPointOnLine(p,graph[a],graph[b]);const d=dist(q,p);if(d<dd){best=q;dd=d}}
  return {point:best,distance:dd};
 }
 function getNearestNode(p){
  let result='plaza',best=Infinity;
  for(const [id,n] of Object.entries(graph)){let d=dist(n,p);if(d<best){best=d;result=id}}
  return result;
 }
 function planRoute(target){
  const begin=getNearestNode(pos);
  const score=new Map(Object.keys(graph).map(id=>[id,Infinity])),prev=new Map(),unseen=new Set(Object.keys(graph));
  score.set(begin,0);
  while(unseen.size){
   let chosen=null,lowest=Infinity;
   for(const id of unseen){if(score.get(id)<lowest){chosen=id;lowest=score.get(id)}}
   if(!chosen||chosen===target)break;
   unseen.delete(chosen);
   for(const [a,b] of connections){const neighbor=a===chosen?b:b===chosen?a:null;if(!neighbor||!unseen.has(neighbor))continue;
    const s=lowest+dist(graph[chosen],graph[neighbor]);if(s<score.get(neighbor)){score.set(neighbor,s);prev.set(neighbor,chosen)}}
  }
  const names=[target];let at=target;let guard=0;
  while(at!==begin&&guard++<20){at=prev.get(at);if(!at)break;names.unshift(at)}
  // Take the closest graph landmark, then follow known unobstructed stone paths.
  return names.map(id=>({...graph[id]})).filter((q,i)=>i!==0||dist(pos,q)>45);
 }
 function goToGarden(id){
  if(!state.data||!state.data[id])return;
  if(modalOpen())allDialogs().forEach(d=>d.open&&d.close());
  if(dist(pos,arrival[id])<108){enterGarden(id);return}
  state.destination=id;state.route=planRoute(id);
  if(!state.route.length)state.route=[{...arrival[id]}];
  say(state.data[id].name+'으로 가는 길이야!');
 }
 function goToPlaza(){
  if(modalOpen())allDialogs().forEach(d=>d.open&&d.close());
  state.destination='plaza';state.route=planRoute('plaza');if(!state.route.length)state.route=[{...graph.plaza}];
  say('중앙 광장으로 돌아가고 있어.');
 }
 function isBlocked(p){
  // Keep the character off water and the interiors of buildings, while allowing the paths to be explored.
  const obstacle=[
   [844,258,203,96],    // waterfall and pond
   [257,556,210,135],   // library walls
   [1439,224,235,111],  // music stage
   [1410,562,178,96],   // rose arbor
   [260,220,165,115]    // tree-house platform
  ];
  for(const [x,y,rx,ry] of obstacle){const dx=(p.x-x)/rx,dy=(p.y-y)/ry;if(dx*dx+dy*dy<1)return true}
  return false;
 }
 function moveBy(dx,dy){
  let did=false;
  const nx={x:clamp(pos.x+dx,60,W-60),y:pos.y};
  if(!isBlocked(nx)){did=did||Math.abs(nx.x-pos.x)>.03;pos.x=nx.x}
  const ny={x:pos.x,y:clamp(pos.y+dy,210,H-38)};
  if(!isBlocked(ny)){did=did||Math.abs(ny.y-pos.y)>.03;pos.y=ny.y}
  return did;
 }
 function doManual(dt){
  let dx=0,dy=0;
  if(keys.has('arrowleft')||keys.has('a')||pressed.has('left'))dx--;
  if(keys.has('arrowright')||keys.has('d')||pressed.has('right'))dx++;
  if(keys.has('arrowup')||keys.has('w')||pressed.has('up'))dy--;
  if(keys.has('arrowdown')||keys.has('s')||pressed.has('down'))dy++;
  if(!dx&&!dy)return false;
  if(state.route.length||state.destination){state.route=[];state.destination=null;say('좋아! 이제 모아를 직접 움직여 봐.');}
  const len=Math.hypot(dx,dy);
  dx=dx/len*dt*215;dy=dy/len*dt*215;
  if(dx<-.02)player.classList.add('left');else if(dx>.02)player.classList.remove('left');
  return moveBy(dx,dy);
 }
 function doAuto(dt){
  if(!state.route.length)return false;
  const target=state.route[0],deltaX=target.x-pos.x,deltaY=target.y-pos.y,len=Math.hypot(deltaX,deltaY);
  const step=Math.min(240*dt,len);
  if(len<step+5){
   pos.x=target.x;pos.y=target.y;state.route.shift();
   if(!state.route.length){const finished=state.destination;state.destination=null;
    if(finished&&finished!=='plaza')setTimeout(()=>{if(!modalOpen())enterGarden(finished)},170);
    else say('중앙 광장에 돌아왔어. 다른 정원에도 가볼까?');
   }
  }else{
   const vx=deltaX/len*step,vy=deltaY/len*step;
   if(vx<-.02)player.classList.add('left');else if(vx>.02)player.classList.remove('left');
   pos.x+=vx;pos.y+=vy;
  }
  return true;
 }
 function resize(){
  const w=Math.max(1,viewport.clientWidth),h=Math.max(1,viewport.clientHeight);
  state.viewWidth=w;state.viewHeight=h;
  // Fixed scale until the viewport resizes; no zooming or spinning while walking.
  state.scale=Math.max(w/W,h/H);
  updateCamera(true);
 }
 function updateCamera(force=false){
  const {scale,viewWidth:w,viewHeight:h}=state;
  const minX=Math.min(0,w-W*scale),minY=Math.min(0,h-H*scale);
  const targetX=clamp(w*.5-pos.x*scale,minX,0);
  const targetY=clamp(h*.58-pos.y*scale,minY,0);
  const k=force||reduced?.999:.14;
  state.tx=lerp(state.tx,targetX,k);state.ty=lerp(state.ty,targetY,k);
  scene.style.transform=`translate3d(${state.tx.toFixed(2)}px,${state.ty.toFixed(2)}px,0) scale(${scale.toFixed(5)})`;
 }
 function updateNear(){
  let nearest=null,d=Infinity;
  for(const id of ids){const z=dist(pos,arrival[id]);if(z<d){d=z;nearest=id}}
  const near=d<125?nearest:null;
  if(near!==state.near){
   state.near=near;
   document.querySelectorAll('.landmark').forEach(b=>b.classList.toggle('near',b.dataset.garden===near));
   const btn=$('nearby');btn.disabled=!near;
   btn.textContent=near?'🚪 '+state.data?.[near]?.name+' 입장하기':'가까이 가면 입장할 수 있어';
   if(near&&!state.destination)say(state.data[near].name+'에 도착했어. 들어가 볼까?');
  }
 }
 function tick(t){
  const dt=state.last?clamp((t-state.last)/1000,0,.075):.016;state.last=t;
  const moving=modalOpen()?false:(doManual(dt)||doAuto(dt));
  state.walk=moving;player.classList.toggle('walking',moving&&!reduced);
  player.style.left=pos.x.toFixed(2)+'px';player.style.top=pos.y.toFixed(2)+'px';
  updateCamera();if(state.data)updateNear();
  state.raf=requestAnimationFrame(tick);
 }
 function imageForGame(g){
  const href=g.href||'';
  const named=href.match(/\/games\/(hand-mirror|rescue|rhythm-touch)\//)?.[1]||
    (href.includes('/recorder/')?'recorder':null);
  const gameKey=href.match(/[?&]game=([^&]+)/)?.[1];
  const mode=href.match(/[?&]mode=([^&]+)/)?.[1];
  const key=named||gameKey||mode||'flower';
  const img=document.createElement('img');img.src='../previews/'+encodeURIComponent(key)+'-card.svg';img.alt='';img.loading='lazy';img.decoding='async';
  img.onerror=()=>{img.onerror=null;img.src='../previews/flower-card.svg'};
  return img;
 }
 function buildGameCard(g){
  const box=document.createElement('article');box.className='game-card';
  const art=document.createElement('div');art.className='art';art.appendChild(imageForGame(g));
  const details=document.createElement('div');details.className='details';
  const title=document.createElement('h3');title.textContent=g.title;
  const action=document.createElement('a');action.href=BASE+g.href;action.textContent='게임 시작 →';action.setAttribute('aria-label',g.title+' 시작하기');
  details.append(title,action);box.append(art,details);return box;
 }
 function enterGarden(id){
  if(!state.data||!state.data[id])return;
  state.currentGarden=id;state.page=0;renderGarden();gardenDialog.showModal();$('closeGarden').focus();
 }
 function renderGarden(){
  const id=state.currentGarden,info=state.data?.[id];if(!info)return;
  const pages=Math.ceil(info.games.length/3);state.page=clamp(state.page,0,pages-1);
  $('gardenTitle').textContent=info.name;
  $('gardenIntro').textContent=info.subtitle+' · 마음에 드는 게임을 골라 바로 시작해 봐.';
  $('gardenBadge').textContent=info.games.length+'개 게임';
  const cards=$('gardenCards');cards.replaceChildren(...info.games.slice(state.page*3,state.page*3+3).map(g=>buildGameCard(g)));
  $('pageIndicator').textContent=(state.page+1)+' / '+pages;
  $('previousPage').disabled=state.page===0;$('nextPage').disabled=state.page===pages-1;
 }
 function showChooser(){
  if(!state.data)return;
  const cards=$('chooserCards');cards.replaceChildren();
  const cropPosition={
   cognitive:'-30px -38px',thinking:'-291px -65px',learning:'-1px -200px',music:'-585px -48px',heart:'-583px -210px'
  };
  for(const id of ids){
   const g=state.data[id];const btn=document.createElement('button');btn.type='button';btn.className='chooser-card';
   const pic=document.createElement('span');pic.className='scene-crop';pic.style.backgroundPosition=cropPosition[id];
   const label=document.createElement('span');label.className='card-title';const title=document.createElement('span');title.textContent=g.name;
   const desc=document.createElement('small');desc.textContent=g.games.length+'개 게임 · 여기로 이동 →';
   label.append(title,desc);btn.append(pic,label);
   btn.addEventListener('click',()=>{chooser.close();goToGarden(id)});
   cards.append(btn);
  }
  chooser.showModal();$('closeChooser').focus();
 }
 function renderFilters(){
  const root=$('gardenFilters');root.replaceChildren();
  for(const id of ['all',...ids]){
   const btn=document.createElement('button');btn.type='button';btn.textContent=id==='all'?'전체':state.data[id].name;
   btn.setAttribute('aria-pressed',String(state.filter===id));btn.addEventListener('click',()=>{state.filter=id;renderLibrary()});root.append(btn);
  }
 }
 function renderLibrary(){
  if(!state.data)return;
  renderFilters();const q=$('librarySearch').value.trim().toLowerCase();
  const games=state.all.filter(g=>(state.filter==='all'||g.garden===state.filter)&&g.title.toLowerCase().includes(q));
  const root=$('libraryResults');root.replaceChildren();
  for(const g of games){
   const a=document.createElement('a');a.className='library-card';a.href=BASE+g.href;
   a.append(imageForGame(g));const text=document.createElement('div');const cat=document.createElement('small');cat.textContent=state.data[g.garden].name;
   const title=document.createElement('strong');title.textContent=g.title;text.append(cat,title);
   const arrow=document.createElement('span');arrow.className='arrow';arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');a.append(text,arrow);root.append(a);
  }
  if(!games.length){const p=document.createElement('p');p.textContent='찾은 게임이 없어. 다른 이름으로 검색해 봐.';root.append(p)}
 }
 function showLibrary(){if(!state.data)return;state.filter='all';$('librarySearch').value='';renderLibrary();library.showModal();$('librarySearch').focus()}
 function bind(){
  for(const btn of document.querySelectorAll('[data-garden]'))btn.addEventListener('click',e=>{e.stopPropagation();goToGarden(btn.dataset.garden)});
  $('pickGarden').addEventListener('click',showChooser);$('allGames').addEventListener('click',showLibrary);
  $('goPlaza').addEventListener('click',goToPlaza);$('nearby').addEventListener('click',()=>state.near&&enterGarden(state.near));
  $('closeGarden').addEventListener('click',()=>gardenDialog.close());
  $('closeChooser').addEventListener('click',()=>chooser.close());
  $('closeLibrary').addEventListener('click',()=>library.close());
  $('previousPage').addEventListener('click',()=>{state.page--;renderGarden()});$('nextPage').addEventListener('click',()=>{state.page++;renderGarden()});
  $('librarySearch').addEventListener('input',renderLibrary);
  window.addEventListener('keydown',e=>{
   const k=e.key.toLowerCase();if(modalOpen()||preventTextInput(e.target))return;
   if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k)){e.preventDefault();keys.add(k)}
   if((k==='enter'||k==='e')&&state.near&&!e.target.closest('button,a')){e.preventDefault();enterGarden(state.near)}
  });
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur',()=>{keys.clear();pressed.clear()});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();pressed.clear()}});
  for(const b of document.querySelectorAll('[data-direction]')){
   const dir=b.dataset.direction;
   b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);pressed.add(dir)});
   for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>pressed.delete(dir));
  }
  viewport.addEventListener('pointerup',e=>{
   if(e.button!==0||modalOpen()||e.target.closest('button,.touch-pad,.guide,.quick-controls,.map-tip'))return;
   const rect=viewport.getBoundingClientRect();const x=(e.clientX-rect.left-state.tx)/state.scale;
   const y=(e.clientY-rect.top-state.ty)/state.scale;
   const clicked={x,y};
   const closest=ids.map(id=>({id,d:dist(clicked,arrival[id])})).sort((a,b)=>a.d-b.d)[0];
   if(closest.d<120){goToGarden(closest.id);return}
   const snap=nearestPathPoint(clicked);
   state.destination=null;state.route=[snap.point];say('모아가 길을 따라 이동하고 있어.');
  });
  window.addEventListener('resize',resize,{passive:true});
 }
 async function init(){
  bind();resize();state.raf=requestAnimationFrame(tick);
  try{
   const result=await fetch('../walkable-lab/games.json',{cache:'no-cache'});if(!result.ok)throw Error('게임 목록 HTTP '+result.status);
   const data=await result.json();state.data=data.gardens;
   if(!ids.every(id=>state.data[id]))throw Error('정원 데이터 일부가 누락됨');
   state.all=ids.flatMap(id=>state.data[id].games.map(g=>({...g,garden:id})));
   if(state.all.length!==34)throw Error('게임 개수 검증 실패: '+state.all.length);
   say('정원을 눌러 보거나, 방향키로 걸어가 봐!');
   console.info('Moa illustrated exploration ready: 5 gardens, 34 original game links');
  }catch(error){
   console.error('Garden loading error',error);
   say('게임 목록을 불러오지 못했어. 기존 지도로 이동해 보자.');
   const fallback=document.createElement('a');fallback.href='../v4-preview/';fallback.textContent='기존 게임 지도 열기';fallback.style.cssText='position:absolute;right:15px;bottom:80px;z-index:6;background:white;border-radius:99px;padding:12px';
   viewport.append(fallback);
  }
 }
 init();
})();
/* Interactive garden walk. No rejected bitmap/SVG map is used.
   Progressive enhancement: every original game link and all 34 catalog
   cards remain in the DOM, searchable, keyboard accessible and reversible. */
(()=>{
'use strict';
const sections=[...document.querySelectorAll('.garden-section')];
const nav=document.querySelector('nav.garden-jumps');
const panel=document.querySelector('.garden-search-panel');
if(!nav||!panel||sections.length!==5||
   document.querySelectorAll('.play-card-enhanced').length!==34)return;
const NS='http://www.w3.org/2000/svg';
const themes={cognitive:'초록 숲길',thinking:'보랏빛 연못길',learning:'열매 오솔길',music:'소리 숲길',heart:'마음 쉼터'};
const images={
 cognitive:'flower',thinking:'mirrorPond',learning:'slowEveryday',
 music:'recorder',heart:'feel'
};
document.body.classList.add('garden-trails-active');
nav.classList.add('garden-atlas');
nav.setAttribute('aria-label','다섯 정원 탐험 지도');
const instruction=document.createElement('p');
instruction.className='garden-trail-instruction';
instruction.innerHTML='<span aria-hidden="true">✦</span> 길 위의 그림을 누르면 정원과 게임을 둘러볼 수 있어요.';
nav.before(instruction);
for(const a of nav.querySelectorAll('a.garden-jump')){
 const area=a.getAttribute('href')?.slice(1);
 if(!images[area])continue;
 const img=document.createElement('img');
 img.className='garden-atlas-art';
 img.src='previews/'+images[area]+'-card.svg?v=20261028-art34-v1';
 img.alt='';img.width=126;img.height=126;img.decoding='async';
 a.prepend(img);
 a.setAttribute('aria-label',a.querySelector('strong')?.textContent?.trim()+'으로 이동');
}
const listToggle=document.createElement('button');
listToggle.type='button';listToggle.id='gardenTrailViewToggle';
listToggle.className='garden-view-switch';
listToggle.setAttribute('aria-pressed','false');
listToggle.innerHTML='<span aria-hidden="true">☷</span><span>목록으로 보기</span>';
listToggle.setAttribute('aria-label','34개 게임을 일반 목록으로 보기');
panel.append(listToggle);
const svg=(host,cls)=>{
 const el=document.createElementNS(NS,'svg');
 el.setAttribute('class',cls);
 el.setAttribute('aria-hidden','true');
 el.setAttribute('focusable','false');
 el.setAttribute('preserveAspectRatio','none');
 host.prepend(el);return el;
};
const atlasPath=svg(nav,'garden-route-lines garden-atlas-route');
const trails=[];
for(const section of sections){
 const field=section.querySelector('.plays');
 if(!field)continue;
 field.classList.add('garden-walk');
 field.setAttribute('role','group');
 field.setAttribute('aria-label',(section.querySelector('h2')?.textContent||'정원')+' 게임 길');
 section.classList.add('garden-trail-section');
 section.dataset.gardenTheme=section.id;
 const line=svg(field,'garden-route-lines garden-walk-route');
 const deco=document.createElement('div');
 deco.className='garden-walk-decor';deco.setAttribute('aria-hidden','true');
 field.prepend(deco);
 const cards=[...field.querySelectorAll('.play-card-enhanced')];
 for(const card of cards){
  card.classList.add('garden-walk-node');
  const media=card.querySelector('.play-card-media');
  const preview=card.querySelector('.play-preview-btn');
  if(!media||!preview)continue;
  media.tabIndex=0;
  media.setAttribute('role','button');
  media.setAttribute('aria-label',card.dataset.title+' 실제 게임 화면 미리보기');
  media.addEventListener('click',()=>preview.click());
  media.addEventListener('keydown',e=>{
   if(e.key==='Enter'||e.key===' '){e.preventDefault();preview.click()}
  });
 }
 trails.push({section,field,line,deco,cards});
}
function curve(points){
 if(!points.length)return'';
 let d='M '+points[0].x.toFixed(1)+' '+points[0].y.toFixed(1);
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dy=b.y-a.y,dx=b.x-a.x;
  const sweep=Math.abs(dy)>35;
  const c1=sweep?{x:a.x+dx*.10,y:a.y+dy*.56}:{x:a.x+dx*.54,y:a.y-24};
  const c2=sweep?{x:b.x-dx*.10,y:b.y-dy*.56}:{x:a.x+dx*.46,y:b.y+24};
  d+=' C '+c1.x.toFixed(1)+' '+c1.y.toFixed(1)+' '+c2.x.toFixed(1)+' '+c2.y.toFixed(1)+' '+b.x.toFixed(1)+' '+b.y.toFixed(1);
 }
 return d;
}
function center(host,node,selector){
 const area=host.getBoundingClientRect();
 const b=(node.querySelector(selector)||node).getBoundingClientRect();
 return{x:b.left-area.left+b.width/2,y:b.top-area.top+b.height*.52};
}
function paint(host,layer,nodes,selector){
 const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
 const points=nodes.map(x=>center(host,x,selector));
 layer.setAttribute('viewBox','0 0 '+w+' '+h);
 layer.setAttribute('width',w);
 layer.setAttribute('height',h);
 const d=curve(points);
 layer.innerHTML='<path class="garden-path-edge" d="'+d+'"/>'+
 '<path class="garden-path-sand" d="'+d+'"/>'+
 '<path class="garden-path-dots" d="'+d+'"/>';
 return points;
}
function decorate(trail,rows){
 // These are restrained, CSS-painted scenery details, never a composite
 // image posing as the game itself. Decorative and ignored by assistive tech.
 const motifs=['tree','bloom','shrub','pond','bloom','tree','shrub'];
 const colors=trail.section.id;
 const count=Math.max(5,Math.min(15,rows*2+2));
 const pieces=[];
 for(let i=0;i<count;i++){
  const row=Math.floor(i/2);
  const x=i%2===0?(7+(i*9)%10):(87-(i*7)%10);
  const y=(row+.52)/Math.max(rows,1)*100;
  const type=motifs[(i+colors.length)%motifs.length];
  pieces.push('<span class="garden-scenery garden-scenery-'+type+'" style="left:'+x+'%;top:'+y.toFixed(2)+'%"></span>');
 }
 trail.deco.innerHTML=pieces.join('');
}
function render(){
 const mapMode=!document.body.classList.contains('garden-list-view');
 if(mapMode)paint(nav,atlasPath,[...nav.querySelectorAll('.garden-jump')],'.garden-atlas-art');
 else atlasPath.innerHTML='';
 const cols=window.innerWidth>=1000?3:2;
 for(const trail of trails){
  const shown=trail.cards.filter(el=>!el.hidden&&!trail.section.hidden);
  if(!mapMode){
   trail.cards.forEach(c=>{c.style.gridColumn='';c.style.gridRow=''});
   trail.line.innerHTML='';trail.deco.innerHTML='';
   continue;
  }
  shown.forEach((card,i)=>{
   const row=Math.floor(i/cols);
   const n=i%cols;
   card.style.gridColumn=String(row%2?cols-n:n+1);
   card.style.gridRow=String(row+1);
  });
  trail.cards.filter(c=>!shown.includes(c)).forEach(c=>{c.style.gridColumn='';c.style.gridRow=''});
  const rows=Math.max(1,Math.ceil(shown.length/cols));
  trail.field.style.setProperty('--garden-rows',rows);
  decorate(trail,rows);
  if(!trail.section.hidden)paint(trail.field,trail.line,shown,'.play-card-media');
  else trail.line.innerHTML='';
 }
}
let task=0;
function schedule(){
 if(task)return;
 task=requestAnimationFrame(()=>{task=0;render()});
}
// The older picture-only mode belongs to the original accessible list.
// Switching to it must not hide the descriptions when it is switched back.
const pictureSwitch=document.querySelector('#gardenPictureMode');
if(pictureSwitch)pictureSwitch.addEventListener('click',()=>{
 if(!document.body.classList.contains('garden-list-view'))listToggle.click();
});
listToggle.addEventListener('click',()=>{
 const isList=document.body.classList.toggle('garden-list-view');
 listToggle.setAttribute('aria-pressed',String(isList));
 listToggle.setAttribute('aria-label',isList?'정원 산책 지도로 다시 보기':'34개 게임을 일반 목록으로 보기');
 listToggle.lastElementChild.textContent=isList?'정원 길로 보기':'목록으로 보기';
 schedule();
});
const observer=new MutationObserver(schedule);
for(const {section,cards} of trails){
 observer.observe(section,{attributes:true,attributeFilter:['hidden']});
 for(const card of cards)observer.observe(card,{attributes:true,attributeFilter:['hidden']});
}
window.addEventListener('resize',schedule,{passive:true});
const ro=new ResizeObserver(schedule);
ro.observe(nav);
for(const {field} of trails)ro.observe(field);
for(const img of nav.querySelectorAll('.garden-atlas-art'))img.addEventListener('load',schedule,{once:true});
schedule();
console.info('Interactive five gardens ready: 5 garden destinations, 34 searchable game nodes, reversible list.');
})();
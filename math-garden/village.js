/* Free-play village: gather, feed a pet, build decorations. No forced order, no correctness gate.
   Reuses mission-v4 clay assets (tree/basket/acorn/berry/bear/flower) plus one new asset (cottage). */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const A='./assets/mission-v4/',V='./assets/village-v1/';
const storeKey='moa-village-pilot-v1';
const ICONS={
 speakerOn:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19 6a9 9 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
 speakerOff:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9l5 5M21 9l-5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
 tree:'<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M12 2 6 11h3l-4 6h5v5h4v-5h5l-4-6h3z"/></svg>',
 heart:'<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-10-9.3C.4 7.9 2.8 4 6.6 4c2 0 3.6 1.1 4.4 2.6C11.8 5.1 13.4 4 15.4 4c3.8 0 6.2 3.9 4.6 7.7C19.5 16.4 12 21 12 21z"/></svg>',
 house:'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/></svg>',
 paw:'<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><circle cx="7" cy="8" r="2.3"/><circle cx="12" cy="6" r="2.3"/><circle cx="17" cy="8" r="2.3"/><ellipse cx="12" cy="15" rx="5.5" ry="4.5"/></svg>'
};
const srLabel=s=>'<span class="sr-only">'+s+'</span>';
const state=(()=>{
 try{const s=JSON.parse(localStorage.getItem(storeKey)||'{}');
  return Object.assign({acorns:0,berries:0,feedCount:0,hunger:60,tab:'gather',sound:true,lastFed:0},s&&typeof s==='object'?s:{});
 }catch(e){return {acorns:0,berries:0,feedCount:0,hunger:60,tab:'gather',sound:true,lastFed:0}}
})();
function save(){try{localStorage.setItem(storeKey,JSON.stringify(state))}catch(e){}}
function sfx(ok=true){if(!state.sound)return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;const ctx=window.__moaVillageSound||(window.__moaVillageSound=new Audio());ctx.resume?.();let t=ctx.currentTime;const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.value=ok?660:330;gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.045,t+.015);gain.gain.exponentialRampToValueAtTime(.0001,t+.16);osc.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+.18)}catch(e){}}

const PALETTE=[
 {type:'flower',cost:{acorns:2,berries:0},img:A+'objects/reward_flower.png',w:46},
 {type:'basket',cost:{acorns:3,berries:0},img:A+'objects/basket_empty.png',w:50},
 {type:'cottage',cost:{acorns:5,berries:2},img:V+'objects/cottage.png',w:72}
];

function resourceRow(){
 $('resourceBar').innerHTML=
  '<div class="res"><img src="'+A+'objects/acorn_single.png" alt=""><span>'+state.acorns+'</span></div>'+
  '<div class="res"><img src="'+A+'objects/berry_single.png" alt=""><span>'+state.berries+'</span></div>';
}

function floatPop(hostEl,imgSrc){
 const p=document.createElement('img');
 p.src=imgSrc;p.className='float-pop';p.setAttribute('aria-hidden','true');
 hostEl.appendChild(p);
 setTimeout(()=>p.remove(),700);
}

function renderGather(){
 $('gatherSpots').innerHTML=
  '<button type="button" class="spot" data-spot="acorns" aria-label="'+esc('나무에서 도토리 모으기')+'"><img src="'+A+'objects/acorn_tree.png" alt=""></button>'+
  '<button type="button" class="spot" data-spot="berries" aria-label="'+esc('딸기 모으기')+'"><img src="'+A+'objects/berry_single.png" alt="" class="berry-spot-img"></button>';
}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}

function petStage(){return state.feedCount>=12?2:state.feedCount>=5?1:0}
function renderPet(){
 const happy=Date.now()-state.lastFed<900;
 const stage=petStage();
 const pips=Array.from({length:5},(_,i)=>'<span class="pip '+(i<Math.ceil(state.hunger/20)?'filled':'')+'">'+ICONS.paw+'</span>').join('');
 $('petScene').innerHTML=
  '<div class="pet-wrap stage-'+stage+'">'+
   (stage>=2?'<img class="pet-crown" src="'+A+'objects/reward_flower.png" alt="">':'')+
   '<img class="pet-photo" src="'+A+'characters/bear_'+(happy?'happy':'waiting')+'.png" alt="">'+
  '</div>'+
  '<div class="hunger-row" aria-label="배고픔 정도">'+pips+'</div>'+
  '<div class="feed-tray">'+
   '<button type="button" class="feed-btn" data-feed="acorns" '+(state.acorns<=0?'disabled':'')+' aria-label="도토리로 먹이주기"><img src="'+A+'objects/acorn_single.png" alt=""></button>'+
   '<button type="button" class="feed-btn" data-feed="berries" '+(state.berries<=0?'disabled':'')+' aria-label="딸기로 먹이주기"><img src="'+A+'objects/berry_single.png" alt=""></button>'+
  '</div>';
}

function renderBuild(){
 $('buildPlot').innerHTML = state.buildings.map(b=>{
  const def=PALETTE.find(p=>p.type===b.type);
  return '<img class="placed pop" src="'+def.img+'" style="width:'+def.w+'px" alt="">';
 }).join('') || '<p class="plot-empty-hint" aria-hidden="true"></p>';
 $('buildPalette').innerHTML = PALETTE.map(p=>{
  const can=state.acorns>=p.cost.acorns && state.berries>=p.cost.berries;
  const costBits=[
   p.cost.acorns?'<span class="cost-chip"><img src="'+A+'objects/acorn_single.png" alt="">'+p.cost.acorns+'</span>':'',
   p.cost.berries?'<span class="cost-chip"><img src="'+A+'objects/berry_single.png" alt="">'+p.cost.berries+'</span>':''
  ].join('');
  return '<button type="button" class="palette-item '+(can?'':'cant')+'" data-build="'+p.type+'" aria-label="'+esc(p.type+' 짓기')+'"><img src="'+p.img+'" alt="" style="width:'+Math.min(p.w,44)+'px"><span class="cost-row">'+costBits+'</span></button>';
 }).join('');
}

function renderAll(){ resourceRow(); renderGather(); renderPet(); renderBuild(); }

function showTab(tab){
 state.tab=tab;save();
 ['gather','pet','build'].forEach(t=>{ $('panel'+t[0].toUpperCase()+t.slice(1)).hidden = t!==tab; });
 Array.from($('tabbar').children).forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.tab===tab)));
 renderAll();
}

function buildTabbar(){
 $('tabbar').innerHTML=[
  ['gather',ICONS.tree,'모으기'],
  ['pet',ICONS.heart,'반려동물'],
  ['build',ICONS.house,'짓기']
 ].map(([t,icon,label])=>'<button type="button" class="tab-btn" data-tab="'+t+'" aria-pressed="false" aria-label="'+label+'">'+icon+srLabel(label)+'</button>').join('');
 $('tabbar').addEventListener('click',e=>{
  const b=e.target.closest('[data-tab]');if(!b)return;
  showTab(b.dataset.tab);
 });
}

$('stage').addEventListener('click',e=>{
 const spot=e.target.closest('[data-spot]');
 if(spot){
  const kind=spot.dataset.spot;
  state[kind]++;save();sfx(true);
  spot.classList.remove('bounce');void spot.offsetWidth;spot.classList.add('bounce');
  floatPop(spot,kind==='acorns'?A+'objects/acorn_single.png':A+'objects/berry_single.png');
  resourceRow();renderBuild();renderPet();
  return;
 }
 const feedBtn=e.target.closest('[data-feed]');
 if(feedBtn && !feedBtn.disabled){
  const kind=feedBtn.dataset.feed;
  if(state[kind]<=0)return;
  state[kind]--;state.hunger=Math.min(100,state.hunger+20);state.feedCount++;state.lastFed=Date.now();save();sfx(true);
  resourceRow();renderPet();renderBuild();
  setTimeout(renderPet,850);
  return;
 }
 const buildBtn=e.target.closest('[data-build]');
 if(buildBtn){
  const type=buildBtn.dataset.build;
  const def=PALETTE.find(p=>p.type===type);
  const can=state.acorns>=def.cost.acorns && state.berries>=def.cost.berries;
  if(!can){
   buildBtn.classList.remove('shake');void buildBtn.offsetWidth;buildBtn.classList.add('shake');
   sfx(false);
   return;
  }
  state.acorns-=def.cost.acorns;state.berries-=def.cost.berries;
  state.buildings.push({type});save();sfx(true);
  resourceRow();renderBuild();
  return;
 }
});

$('sound').addEventListener('click',()=>{
 state.sound=!state.sound;save();
 $('sound').setAttribute('aria-pressed',String(state.sound));
 $('sound').setAttribute('aria-label',state.sound?'효과음 끄기':'효과음 켜기');
 $('sound').innerHTML=(state.sound?ICONS.speakerOn:ICONS.speakerOff)+srLabel(state.sound?'소리 켜짐':'소리 꺼짐');
});

if(!Array.isArray(state.buildings))state.buildings=[];
$('sound').innerHTML=(state.sound?ICONS.speakerOn:ICONS.speakerOff)+srLabel(state.sound?'소리 켜짐':'소리 꺼짐');
buildTabbar();
renderAll();
showTab(state.tab||'gather');

Object.defineProperty(window,'__moaVillageQA',{value:()=>({acorns:state.acorns,berries:state.berries,feedCount:state.feedCount,hunger:state.hunger,stage:petStage(),buildings:state.buildings.map(b=>b.type),tab:state.tab}),configurable:false});
})();

/* MoA cognitive garden: scene direction and meaningful interaction feedback.
   Never alters target generation, answer grading, observation, or session length. */
(()=>{'use strict';
const gameArea=document.getElementById('gameArea');
const world=document.getElementById('gameWorld');
if(!gameArea||!world)return;
const descriptions={
slowScan:{name:'꽃 찾기 탐험',short:'숲속의 꽃만 찾기',steps:['숲속 꽃 찾기','꽃만 눌러 표시'],goal:'발견한 꽃'},
slowPlace:{name:'샘의 지도 정원',short:'지도를 보고 같은 자리에 심기',steps:['지도 속 자리 확인','내 꽃밭 같은 칸에 심기'],goal:'심은 꽃'},
slowBlock:{name:'샘의 블록 공방',short:'블록을 돌려서 집 조립하기',steps:['블록을 고르고 돌리기','빈자리에 블록 조립'],goal:'채운 칸'},
slowName:{name:'친구 이름 탐정',short:'친구를 보고 이름 말하거나 고르기',steps:['동물이나 색 관찰','이름 말하기 또는 선택'],goal:''},
slowMemory:{name:'루의 기억 꽃밭',short:'꽃자리를 기억한 뒤 복원하기',steps:['꽃이 있는 자리 보기','보기 가린 후 다시 놓기'],goal:'기억해서 심은 꽃'},
slowEveryday:{name:'모아의 준비 여행',short:'상황에 맞는 물건 가방에 담기',steps:['날씨와 상황 확인','필요한 물건 가방에 담기'],goal:'고른 준비물'}
};
const keys=Object.keys(descriptions);
const originalClass='moa-redesigned-world';
function identify(){
 const title=document.getElementById('gameTitle')?.textContent?.trim()||'';
 const native={slowScan:'꽃과 단서 찾기',slowPlace:'정원 지도 따라 놓기',slowBlock:'블록 건축가',slowName:'친구 이름 탐정',slowMemory:'꽃자리 기억하기',slowEveryday:'가방 준비 탐험'};
 return keys.find(k=>native[k]===title)||null;
}
function amount(root,id){
 if(id==='slowBlock')return root.querySelectorAll('.slow-block-board button.slow-tile.picked').length;
 return root.querySelectorAll('.slow-board button.slow-tile.picked').length;
}
function total(root,id){
 if(id==='slowBlock')return root.querySelectorAll('.slow-block-board .slow-tile.shown').length;
 if(id==='slowScan')return (root.querySelector('.slow-mission-label')?.textContent.match(/(\d+)송이/)||[])[1]*1||0;
 if(id==='slowEveryday')return (root.querySelector('.slow-mission-label')?.textContent.match(/(\d+)개/)||[])[1]*1||0;
 return root.querySelectorAll('.slow-map-pair .slow-board .slow-tile.shown').length;
}
function update(root,id){
 const meter=root.querySelector('.moa-world-meter');if(!meter)return;
 const isMemoryHidden=id==='slowMemory'&&!!root.querySelector('[data-slow="hide"]');
 meter.hidden=id==='slowName'||isMemoryHidden;
 if(meter.hidden)return;
 const n=total(root,id),v=amount(root,id);
 const max=Math.max(1,n);meter.querySelector('.moa-world-count').textContent=v+' / '+n;
 meter.querySelector('.moa-world-fill').style.width=Math.min(100,Math.round(v/max*100))+'%';
 const completed=!!root.querySelector('[data-slow="next"]');
 root.classList.toggle('moa-scene-finished',completed);
 if(completed&&!root.querySelector('.moa-world-ending')){
  const ending=document.createElement('div');ending.className='moa-world-ending';ending.setAttribute('aria-hidden','true');
  ending.innerHTML='<span class="moa-ending-flowers">✿ ✦ ✿</span>';
  root.appendChild(ending);
 }
}
function decorate(){
 const root=gameArea.querySelector('.slow-task');
 if(!root)return;
 const id=identify(),meta=descriptions[id];
 if(!meta)return;
 world.dataset.moaPlayworld=id;
 root.classList.add(originalClass,'moa-scene-'+id);
 if(!root.querySelector('.moa-world-scene-head')){
  const head=document.createElement('section');head.className='moa-world-scene-head';
  head.innerHTML='<span class="moa-world-art" aria-hidden="true"></span><div class="moa-world-scene-copy"><small>모아의 생각정원 · '+meta.short+'</small><strong>'+meta.name+'</strong><span class="moa-world-do">'+meta.steps[0]+' <b aria-hidden="true">→</b> '+meta.steps[1]+'</span></div>';
  root.prepend(head);
  const oldStep=root.querySelector('.slow-step');
  if(oldStep)oldStep.hidden=true;
  if(meta.goal){
   const meter=document.createElement('div');meter.className='moa-world-meter';meter.setAttribute('aria-label',meta.goal+' 진행 현황');
   meter.innerHTML='<span class="moa-world-goal">'+meta.goal+'</span><span class="moa-world-count" aria-live="polite">0 / 0</span><div class="moa-world-rail"><span class="moa-world-fill"></span></div>';
   const target=root.querySelector('.slow-map-pair,.slow-block-story,.slow-board,.slow-bag-quest,.slow-name-picture');
   (target||root.firstElementChild).before(meter);
  }
 }
 update(root,id);
}
new MutationObserver(decorate).observe(gameArea,{childList:true});
document.addEventListener('click',e=>{
 if(!e.target.closest('#gameArea .slow-task'))return;
 // The original handler owns game state; visual feedback follows it.
 window.setTimeout(decorate,0);
},false);
decorate();
})();
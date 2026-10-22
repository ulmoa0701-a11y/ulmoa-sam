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
 const visible=root.querySelectorAll('.slow-map-pair .slow-board .slow-tile.shown').length;
 if(id==='slowMemory'){
  const stage=document.getElementById('stageLabel')?.textContent||'';
  if(visible){world.dataset.moaMemoryCount=String(visible);world.dataset.moaMemoryRound=stage;}
  return world.dataset.moaMemoryRound===stage?Number(world.dataset.moaMemoryCount)||0:visible;
 }
 return visible;
}
function update(root,id){
 const meter=root.querySelector('.moa-world-meter');
 const memory=id==='slowMemory';
 const recalling=memory&&!!root.querySelector('[data-slow="show"]');
 if(meter){
  // During encoding, no progress hints. During recall, never reveal how many
  // locations were in the sample: target count is a retrieval cue.
  meter.hidden=id==='slowName'||(memory&&!recalling);
  if(!meter.hidden){
   const v=amount(root,id),count=meter.querySelector('.moa-world-count');
   const rail=meter.querySelector('.moa-world-rail');
   if(memory){
    meter.querySelector('.moa-world-goal').textContent='내가 표시한 자리';
    count.textContent=String(v);
    rail.hidden=true;
    meter.setAttribute('aria-label','내가 표시한 자리 '+v+'개');
   }else{
    const n=total(root,id);
    count.textContent=v+' / '+n;
    rail.hidden=false;
    meter.querySelector('.moa-world-fill').style.width=Math.min(100,Math.round(v/Math.max(1,n)*100))+'%';
   }
  }
 }
 const message=root.querySelector('.slow-feedback')?.textContent||'';
 const completed=!!root.querySelector('[data-slow="next"]');
 const correct=completed&&message.includes('정원을 정확하게 살폈어요');
 root.classList.toggle('moa-scene-finished',correct);
 root.classList.toggle('moa-scene-needs-review',!completed&&message.includes('다시 확인해요'));
 const awaitingName=id==='slowName'&&!!root.querySelector('.slow-name-choice,.slow-teacher-choice');
 root.classList.toggle('moa-scene-name-answer',awaitingName);
 // A skipped or incorrectly completed round must never display success art.
 const existing=root.querySelector('.moa-world-ending');
 if(!correct){existing?.remove();return;}
 if(!existing){
  const ending=document.createElement('div');ending.className='moa-world-ending';ending.setAttribute('aria-hidden','true');
  ending.innerHTML='<span class="moa-world-trophy"></span>';
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
// Make a chosen object visibly travel from the shelf into the packed bag.
// Works for correct and incorrect selections alike: this is interaction feedback,
// not an answer hint. Never touches scoring or the task's selection set.
function moveSelectedItem(tile,root){
 if(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return;
 if(typeof tile.animate!=='function')return;
 const bag=root.querySelector('.slow-bag-progress'),icon=tile.textContent.trim();
 if(!bag||!icon)return;
 const from=tile.getBoundingClientRect(),to=bag.getBoundingClientRect();
 if(!from.width||!to.width)return;
 const move=document.createElement('span');
 move.className='moa-moving-item';
 move.textContent=icon;
 move.setAttribute('aria-hidden','true');
 move.style.left=(from.left+from.width/2-22)+'px';
 move.style.top=(from.top+from.height/2-22)+'px';
 document.body.appendChild(move);
 const dx=to.left+to.width/2-(from.left+from.width/2);
 const dy=to.top+to.height/2-(from.top+from.height/2);
 const animation=move.animate([
  {transform:'translate(0px,0px) scale(1)',opacity:1},
  {transform:'translate('+dx+'px,'+dy+'px) scale(.55)',opacity:.35}
 ],{duration:400,easing:'cubic-bezier(.25,.6,.3,1)'});
 animation.onfinish=()=>move.remove();
 animation.oncancel=()=>move.remove();
}
new MutationObserver(decorate).observe(gameArea,{childList:true});
document.addEventListener('click',e=>{
 const root=e.target.closest('#gameArea .slow-task');
 if(!root)return;
 const tile=e.target.closest('button.slow-tile[data-slow="cell"]');
 if(tile&&root.classList.contains('moa-scene-slowEveryday')&&tile.classList.contains('picked')){
  moveSelectedItem(tile,root);
 }
 // The original handler owns game state; visual feedback follows it.
 window.setTimeout(decorate,0);
},false);
decorate();
})();
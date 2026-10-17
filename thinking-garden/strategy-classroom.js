/* Classroom relocation: follow verbal spatial relationships, not copied patterns. */
(()=>{
'use strict';
const things=[['연필','✏️'],['가방','🎒'],['물병','🧃'],['책','📚'],['지우개','🧽'],['우산','☂️']];
const advanced=[[1,2,3,6],[7,6,5,2],[3,0,1,2],[5,8,7,6],[1,0,3,6]];
const simple=[[1,3],[5,7],[3,1],[7,5],[1,7]];
const cells=[0,1,2,3,5,6,7,8],cardinal=[1,3,5,7];
function arrangements(pool,size){
 const result=[];
 function visit(order,remaining){
  if(order.length===size){result.push(order);return;}
  for(let i=0;i<remaining.length;i++)visit([...order,remaining[i]],remaining.filter((_,j)=>j!==i));
 }
 visit([],pool);return result;
}
// 12 basic layouts, 336 three-object layouts, 1680 four-object layouts.
// The first five approved patterns stay in place; later cases no longer
// repeat the same five spatial relationships.
const easyLayouts=arrangements(cardinal,2);
const normalLayouts=arrangements(cells,3).filter(x=>!advanced.some(a=>a.slice(0,3).join(',')===x.join(',')));
const hardLayouts=arrangements(cells,4).filter(x=>!advanced.some(a=>a.join(',')===x.join(',')));
function choosePlaces(round,level){
 if(round<5)return level===1?simple[round]:advanced[round].slice(0,level===2?3:4);
 if(level===1)return easyLayouts[((round-5)*5)%easyLayouts.length];
 const choices=level===2?normalLayouts:hardLayouts;
 const stride=level===2?17:79;
 return choices[((round-5)*stride)%choices.length];
}
function relative(origin,target){
 const dr=Math.floor(target/3)-Math.floor(origin/3),dc=target%3-origin%3;
 return (dc<0?'왼쪽':dc>0?'오른쪽':'')+(dc!==0&&dr!==0?' ':'')+(dr<0?'위':dr>0?'아래':'');
}
window.StrategyGarden.register('classroomMove',{
 begin(s,r,round){
  const n=r.level===1?2:r.level===2?3:4;
  const places=choosePlaces(round,r.level);
  r.tasks=places.map((pos,i)=>({item:(round+i)%things.length,pos,origin:r.level===3&&i%2===1?places[i-1]:4,reference:r.level===3&&i%2===1?(round+i-1)%things.length:null}));
  r.doneItems={};r.step=0;r.selectedItem=null;r.selectedPos=null;r.phase='arrange';
 },
 view({r,body,rerender,assist,fail,complete}){
  const task=r.tasks[r.step],base=task.reference===null?'책상':things[task.reference][0];
  const phrase=relative(task.origin,task.pos),help=r.errors>=2;
  const clue='<div class="strategy-story-head"><span>🏫 샘의 새 교실</span><h3>친구들이 물건을 찾기 쉽게 정리해요.</h3></div><div class="strategy-clue"><small>지금 놓을 물건</small><strong>'+things[task.item][1]+' '+things[task.item][0]+'은(는) '+base+'의 <u>'+phrase+'</u>에 있어야 해요.</strong><p>① 물건 고르기 → ② 자리 고르기 → ③ 확인하기</p></div>';
  if(r.phase==='reset'){
   body.innerHTML=clue+'<div class="strategy-reset"><h3>🧭 기준부터 다시 살펴봐요.</h3><p>어디를 기준으로 왼쪽·오른쪽·위·아래인지 확인해요. 한 번에 잘되지 않아도 괜찮아요.</p><button data-room="recover" class="strategy-primary">✋ 기준 확인하고 다시 놓기</button></div>';
  }else{
   const options=[task.item,(task.item+1)%things.length,(task.item+2)%things.length];
   const picker='<div class="strategy-small-heading">① 옮길 물건을 골라요</div><div class="strategy-items">'+options.map(i=>'<button type="button" data-room="item" data-i="'+i+'" aria-pressed="'+(r.selectedItem===i)+'">'+things[i][1]+'<small>'+things[i][0]+'</small></button>').join('')+'</div>';
   let squares='';
   for(let i=0;i<9;i++){
    const found=r.doneItems[i],center=i===4;
    const icon=center?'🪑':found!==undefined?things[found][1]:r.selectedPos===i?'＋':'';
    const text=center?'책상':found!==undefined?things[found][0]:'빈 자리';
    if(center)squares+='<div class="strategy-room-square center"><span>'+icon+'</span><small>'+text+'</small></div>';
    else squares+='<button type="button" data-room="pos" data-i="'+i+'" class="strategy-room-square '+(r.selectedPos===i?'chosen':'')+(help&&Math.floor(i/3)===Math.floor(task.pos/3)?' row-help':'')+'" aria-pressed="'+(r.selectedPos===i)+'" '+(found!==undefined?'disabled':'')+'><span>'+icon+'</span><small>'+text+'</small></button>';
   }
   const room='<div class="strategy-small-heading">② 교실에서 놓을 자리를 골라요</div><div class="strategy-room-grid">'+squares+'</div>';
   const check='<div class="strategy-room-check"><span>정리한 물건 '+r.step+' / '+r.tasks.length+'</span><button type="button" data-room="check" class="strategy-primary" '+(r.selectedItem===null||r.selectedPos===null?'disabled':'')+'>이곳에 놓기 ✓</button></div>';
   body.innerHTML=clue+picker+room+(help?'<p class="strategy-helptext">힌트: 줄의 위치부터 비교해 보아요.</p>':'')+check;
  }
  body.addEventListener('click',e=>{
   const b=e.target.closest('button[data-room]');if(!b||b.disabled)return;
   const action=b.dataset.room,i=Number(b.dataset.i);
   if(action==='recover'){r.phase='arrange';assist('책상 또는 이미 놓은 물건을 기준으로 다시 살펴봤어요.');return;}
   if(action==='item'){r.selectedItem=i;rerender();return;}
   if(action==='pos'){r.selectedPos=i;rerender();return;}
   if(action==='check'){
    if(r.selectedItem===task.item&&r.selectedPos===task.pos){
     r.doneItems[task.pos]=task.item;r.step++;r.selectedItem=null;r.selectedPos=null;
     r.message='좋아요! 공간관계를 잘 확인하고 놓았어요.';
     if(r.step===r.tasks.length){complete(true,'언어 단서를 이용하여 '+r.tasks.length+'개 물건 배치 완수');return;}
     r.phase='arrange';rerender();
    }else{
     fail('물건 이름과 위치 관계를 하나씩 다시 살펴봐요.');
    }
   }
  });
 }
});
})();
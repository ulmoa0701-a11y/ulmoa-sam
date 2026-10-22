/* Block architect: assemble adjacent 2-cell bricks instead of tapping
   individual target squares like the separate position-copy activity.
   All controls are tappable (no fine drag-and-drop required). */
(()=>{
'use strict';
function quota(n){return {double:Math.floor(n/2),single:n%2}}
function fresh(s){s.blockParts=[];s.blockEdits=0;s.blockMode='double';s.blockDir='right';s.blockMessage='';}
function hasRoom(s,size,count){
 return s.blockParts.filter(p=>p.keys.length===size).length<count;
}
function model(s,target,n){
 const q=quota(target.length),used2=s.blockParts.filter(p=>p.keys.length===2).length,used1=s.blockParts.filter(p=>p.keys.length===1).length;
 const grid=(example)=>'<div class="slow-board slow-block-board" style="--side:'+n+'" role="group" aria-label="'+(example?'따라 만들 모양':'블록 조립 자리')+'">'+Array.from({length:n*n},(_,i)=>{
  const row=Math.floor(i/n),col=i%n,key=row+','+col,marked=example&&target.includes(key),placed=s.selected.has(key);
  const piece=!example&&placed?s.blockParts.find(p=>p.keys.includes(key)):null;
  const horizontal=piece?.keys.length===2&&piece.keys.every(k=>k.split(',')[0]===String(row));
  const segment=piece?.keys.length===2?(horizontal?'brick-joined-horizontal':'brick-joined-vertical'):piece?'brick-single':'';
  const pieceClass=segment+(piece?.keys[0]===key?' brick-start':' brick-end');
  return example?'<div class="slow-tile '+(marked?'shown':'')+'">'+(marked?'🧱':'')+'</div>':'<button type="button" data-block="place" data-key="'+key+'" class="slow-tile '+(placed?'picked '+pieceClass:'')+'" aria-label="'+(row+1)+'행 '+(col+1)+'열에서 조립" aria-pressed="'+placed+'">'+(placed?'🧱':'')+'</button>';
 }).join('')+'</div>';
 const dir=s.blockDir==='right'?'↔️ 가로':'↕️ 세로';
 const controls='<div class="slow-block-tools"><div class="slow-block-pieces"><button type="button" data-block="double" class="'+(s.blockMode==='double'?'selected':'')+'" '+(used2>=q.double?'disabled':'')+' aria-pressed="'+(s.blockMode==='double')+'">🧱🧱 긴 블록 <small>'+(q.double-used2)+'개 남음</small></button>'+(q.single?'<button type="button" data-block="single" class="'+(s.blockMode==='single'?'selected':'')+'" '+(used1>=q.single?'disabled':'')+' aria-pressed="'+(s.blockMode==='single')+'">🧱 작은 블록 <small>'+(q.single-used1)+'개 남음</small></button>':'')+'</div><div class="slow-block-other"><button type="button" data-block="rotate" '+(s.blockMode==='single'?'disabled':'')+'>🔄 방향 바꾸기 '+dir+'</button><button type="button" data-block="undo" '+(s.blockParts.length?'':'disabled')+'>↩ 되돌리기</button></div></div>';
 return '<div class="slow-block-story"><img src="assets/friend-saem.png" alt=""><div><strong>샘의 블록 건축 공방</strong><span>블록을 고르고 돌려서 집 모양을 완성해요!</span></div><span aria-hidden="true">🏗️</span></div><div class="slow-map-pair slow-build-pair"><div><b>완성할 집</b>'+grid(true)+'</div><div><b>내가 조립할 집</b>'+grid(false)+'</div></div>'+controls+'<p class="slow-block-feedback" role="status" aria-live="polite">'+(s.blockMessage||'🧱 블록 선택 → 조립할 칸 누르기')+'</p>';
}
function action(s,act,key,n,targetCount){
 const q=quota(targetCount),parts=s.blockParts;
 if(act==='rotate'){s.blockDir=s.blockDir==='right'?'down':'right';s.blockMessage='블록을 '+(s.blockDir==='right'?'가로':'세로')+'로 돌렸어요.';return;}
 if(act==='double'||act==='single'){
  const size=act==='double'?2:1;
  if(!hasRoom(s,size,size===2?q.double:q.single)){s.blockMessage='이 블록은 모두 사용했어요.';return;}
  s.blockMode=act;s.blockMessage='블록을 놓을 첫 칸을 눌러요.';return;
 }
 if(act==='undo'){
  const last=parts.pop();if(last){last.keys.forEach(k=>s.selected.delete(k));s.blockEdits++;}
  s.blockMode=parts.filter(p=>p.keys.length===2).length<q.double?'double':'single';
  s.blockMessage='마지막 블록을 다시 꺼냈어요.';return;
 }
 if(act!=='place')return;
 const size=s.blockMode==='single'?1:2;
 if(!hasRoom(s,size,size===2?q.double:q.single)){
  s.blockMessage='이 종류의 블록은 다 썼어요. 되돌리기를 눌러 바꿀 수 있어요.';return;
 }
 const [r,c]=key.split(',').map(Number);
 const second=s.blockDir==='right'?r+','+(c+1):(r+1)+','+c;
 const keys=size===1?[key]:[key,second];
 if(keys.some(k=>{const [row,col]=k.split(',').map(Number);return row<0||col<0||row>=n||col>=n||s.selected.has(k)})){
  s.blockMessage='블록이 겹치거나 칸 밖으로 나갔어요. 다른 자리에 놓아요.';return;
 }
 keys.forEach(k=>s.selected.add(k));parts.push({keys});
 const complete=parts.filter(p=>p.keys.length===2).length>=q.double;
 if(complete&&q.single&&parts.filter(p=>p.keys.length===1).length<q.single)s.blockMode='single';
 s.blockMessage='블록 '+parts.length+'개를 놓았어요! 완성 모양과 비교해요.';
}
window.MoaBlockBuilder={fresh,model,action,quota};
})();
/* A recovery practice adventure: don't automatically follow mistaken suggestions. */
(()=>{
'use strict';
const friends=[['토끼','🐰'],['고양이','🐱'],['곰','🐻'],['개구리','🐸'],['강아지','🐶']];
window.StrategyGarden.register('resetRescue',{
 begin(s,r,round){
  r.target=(round*2+1+Math.floor(round/5))%friends.length;
  r.suggested=round%5===0||round%5===2?r.target:(r.target+1+(r.level===3?1:0))%friends.length;
  r.phase='signal';r.checked=false;
 },
 view({r,round,body,rerender,assist,fail,complete}){
  const [name,emoji]=friends[r.target], [sname,semoji]=friends[r.suggested];
  const header='<div class="strategy-story-head"><span>📻 숲속 긴급 방송</span><h3>길 잃은 친구를 찾아 주세요!</h3></div>';
  const target='<div class="strategy-distress"><small>찾아야 하는 친구</small><strong>'+emoji+' '+name+'</strong></div>';
  const helper='<div class="strategy-robot"><span class="strategy-robot-emoji">🤖</span><div><small>자동 길잡이가 추천했어요</small><strong>'+semoji+' '+sname+'</strong></div></div>';
  let main=header+target+helper;
  if(r.phase==='signal'){
   main+='<p class="strategy-prompt">길잡이가 추천한 친구가 맞을까요?</p><div class="strategy-two-actions"><button data-rec="trust" class="strategy-primary">✅ 그대로 구조하기</button><button data-rec="question">🔍 잠깐, 다시 확인하기</button></div>';
  }else if(r.phase==='reset'){
   main+='<div class="strategy-reset"><h3>🌿 잠깐 멈춤!</h3><p>앞의 선택과 지금 찾는 친구가 섞였을 수도 있어요.<br>눈으로 다시 보고 → 생각하고 → 고르면 돼요.</p><button data-rec="recover" class="strategy-primary">✋ 준비됐어요 · 다시 고르기</button></div>';
  }else{
   const reduced=r.errors>=2;
   const n=reduced?2:r.level===1?3:r.level===2?4:5;
   const ids=[r.target,...Array.from({length:friends.length},(_,i)=>(r.target+1+i)%friends.length)].slice(0,n);
   main+='<p class="strategy-prompt">방송에서 찾는 친구는 누구였죠?</p><div class="strategy-friend-grid">'+ids.map(i=>'<button data-rec="pick" data-id="'+i+'"><span>'+friends[i][1]+'</span><strong>'+friends[i][0]+'</strong></button>').join('')+'</div>';
   if(reduced)main+='<p class="strategy-helptext">선택지를 조금 줄였어요. 목표를 다시 확인하고 선택해요.</p>';
  }
  body.innerHTML=main;
  body.addEventListener('click',e=>{
   const b=e.target.closest('button[data-rec]');if(!b||b.disabled)return;
   const action=b.dataset.rec;
   if(action==='trust'){
    if(r.suggested===r.target){r.first=true;complete(true,'자동 안내와 구조 요청을 정확히 비교');}
    else fail('길잡이와 방송이 서로 다르네요. 방송에서 찾는 친구를 다시 살펴봐요.');
    return;
   }
   if(action==='question'){
    if(r.first===null)r.checked=true; // self-check is helpful, but not proof that the first answer was correct
    r.phase='choose';r.checked=true;r.message='좋아요. 안내를 그대로 따르지 않고 스스로 확인해 봐요.';rerender();return;
   }
   if(action==='recover'){r.phase='choose';assist('멈춘 뒤 구조 요청을 다시 확인했어요. 천천히 골라도 됩니다.');return;}
   if(action==='pick'){
    if(Number(b.dataset.id)===r.target){complete(true,r.checked?'스스로 안내를 확인한 뒤 구조':'오답 뒤 전략을 사용하여 구조');}
    else fail('요청한 친구와 선택한 친구가 다를 수 있어요. 잠깐 멈춰볼까요?');
   }
  });
 }
});
})();
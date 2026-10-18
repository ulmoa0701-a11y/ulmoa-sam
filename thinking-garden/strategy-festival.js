/* Multi-clue festival planning: use precedence statements to organize real-life actions. */
(()=>{
'use strict';
const tasks=[
 [['화분 놓기','🪴'],['씨앗 심기','🌱'],['물 주기','💧'],['꽃 구경','🌸']],
 [['책 꺼내기','📖'],['책 읽기','👀'],['책 제자리','📚'],['친구에게 소개','🙋']],
 [['재료 모으기','🧺'],['작품 만들기','🧩'],['완성 확인','✅'],['전시하기','🎨']],
 [['손 씻기','🧼'],['도시락 담기','🍱'],['돗자리 펴기','🪑'],['함께 먹기','😋']],
 [['지도 살펴보기','🗺️'],['길 찾기','🧭'],['친구 만나기','🤝'],['목적지 도착','🏁']],
  [['손 닦기','🧻'],['꽃병 준비','🏺'],['꽃 꽂기','💐'],['책상 꾸미기','🎀']],
  [['알람 듣기','⏰'],['이불 정리','🛏️'],['세수하기','🧼'],['옷 입기','👕']],
  [['필요한 책 정하기','📝'],['책장 찾기','📚'],['책 빌리기','📖'],['기록하기','✍️']],
  [['재활용품 분류','♻️'],['상자 접기','📦'],['종이 담기','📰'],['정리하기','🧹']],
  [['씨앗 고르기','🌱'],['흙 담기','🪴'],['씨앗 심기','🌿'],['물 주기','💧']],
  [['장보기 목록 확인','📝'],['물건 찾기','🛒'],['계산하기','💳'],['가방에 담기','🛍️']],
  [['공연 시간 확인','🕒'],['자리 찾기','🎟️'],['공연 관람','🎶'],['박수 치기','👏']],
  [['양치 도구 준비','🪥'],['치약 묻히기','🧴'],['양치하기','😁'],['입 헹구기','💧']],
  [['친구에게 연락','📱'],['만날 장소 정하기','🗺️'],['출발하기','🚶'],['친구 만나기','🤝']],
  [['그림 고르기','🖼️'],['종이 준비','📄'],['색칠하기','🖍️'],['벽에 전시','🎨']],
  [['컵 준비','🥤'],['물 따라주기','💧'],['함께 마시기','🥛'],['컵 정리','🧽']],
  [['문제 살펴보기','🔍'],['방법 고르기','🧠'],['풀어보기','✏️'],['답 확인하기','✅']],
  [['신발 준비','👟'],['모자 챙기기','🧢'],['현관 나가기','🚪'],['산책하기','🌿']],
  [['버스 노선 보기','🚌'],['정류장 찾기','🚏'],['버스 타기','🎫'],['내릴 곳 확인','📍']],
  [['날씨 확인','☀️'],['우산 고르기','☂️'],['신발 신기','👟'],['현관 나가기','🚪']],
  [['체육복 준비','👕'],['운동화 신기','👟'],['준비운동','🤸'],['운동 시작','🏃']],
  [['색연필 고르기','🖍️'],['도화지 펴기','📄'],['그림 그리기','🎨'],['사용한 도구 정리','🧺']],
  [['입장권 챙기기','🎟️'],['차례 지켜 입장','🚪'],['동물 관찰','🐠'],['본 것 이야기하기','💬']],
  [['초대장 확인','💌'],['공연장 찾아가기','🏛️'],['자리에 앉기','🪑'],['공연 보기','🎭']],
  [['재료 확인','📝'],['냉장고에서 꺼내기','🥕'],['간식 만들기','🥣'],['도구 정리','🧽']],
  [['관찰할 나무 정하기','🌳'],['나무 찾아가기','🚶'],['모양 관찰','👀'],['본 것 기록하기','✍️']],
  [['놀이 정하기','🎲'],['역할 나누기','🤝'],['함께 놀이하기','🎉'],['장난감 정리','🧸']],
  [['시간표 확인','🗓️'],['필요한 교과서 고르기','📚'],['가방 챙기기','🎒'],['등교하기','🏫']],
  [['약속 시간 확인','🕒'],['교통카드 챙기기','💳'],['정류장에 가기','🚏'],['버스 타기','🚌']]
];
function rotateChoices(ids,last){
 const result=[...ids];
 for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
 if(last===result.join(',')&&result.length>1)result.push(result.shift());
 return result;
}
window.StrategyGarden.register('festivalPlan',{
 begin(s,r,round){
  r.tasks=tasks[round%tasks.length].slice(0,r.level===3?4:3);
  r.pool=rotateChoices(Array.from({length:r.tasks.length},(_,i)=>i),s.lastFestivalPool);
  s.lastFestivalPool=r.pool.join(',');
  r.chosen=[];r.phase='plan';
 },
 view({r,round,body,feedback,rerender,assist,fail,complete,ctx}){
  const count=r.tasks.length,seq=r.tasks;
  const clues=Array.from({length:count-1},(_,i)=>({
   before:seq[i],after:seq[i+1],
   text:'먼저 '+seq[i][0]+', 그다음 '+seq[i+1][0],
   friend:['assets/friend-hong.png','assets/friend-saem.png','assets/friend-ru.png'][i%3]
  }));
  // Reordering the clue cards raises planning demand, without rotating the
  // actual answer keys or requiring a child to decode grammatical placeholders.
  if(r.level>=2&&clues.length>=2)clues.push(clues.shift());
  if(r.level===3&&clues.length===3)[clues[0],clues[1]]=[clues[1],clues[0]];
  const story='<div class="strategy-story-head"><span>🎪 모아의 축제 정원</span><h3>친구들의 이야기를 듣고 축제를 준비해요!</h3></div><div class="strategy-festival-banner">🎈　🌱　🎉　🌷　🎁</div>';
  const evidence='<div class="strategy-evidence festival-picture-evidence"><strong>친구들이 알려준 순서 단서'+(r.level>=2?' · 카드 순서가 섞여 있어요':'')+'</strong>'+clues.map((clue,i)=>'<div class="festival-clue" data-clue="'+i+'"><img src="'+clue.friend+'" alt="" class="festival-clue-friend"><div class="festival-clue-flow" aria-label="'+clue.text+'"><div class="festival-clue-item"><span aria-hidden="true">'+clue.before[1]+'</span><strong>'+clue.before[0]+'</strong></div><span class="festival-clue-arrow" aria-hidden="true">→</span><div class="festival-clue-item"><span aria-hidden="true">'+clue.after[1]+'</span><strong>'+clue.after[0]+'</strong></div></div><button type="button" data-plan="listen" data-clue="'+i+'" aria-label="순서 단서 '+(i+1)+' 듣기">단서 듣기</button></div>').join('')+'</div>';
  if(r.phase==='reset'){
   body.innerHTML=story+evidence+'<div class="strategy-reset"><h3>🌿 잠깐 멈춰서 단서 확인!</h3><p>무엇을 먼저 해야 할까요? 한 가지 단서씩 확인한 뒤 다시 순서를 정해요.</p><button type="button" data-plan="recover" class="strategy-primary">✋ 준비되면 다시 계획하기</button></div>';
  }else{
   const order='<div class="strategy-small-heading">내가 정한 준비 순서</div><div class="strategy-order-slots">'+Array.from({length:count},(_,i)=>'<div class="strategy-order-slot"><small>'+(i+1)+'번째</small><span>'+(r.chosen[i]===undefined?'❔':seq[r.chosen[i]][1])+'</span><strong>'+(r.chosen[i]===undefined?'비어 있어요':seq[r.chosen[i]][0])+'</strong></div>').join('')+'</div>';
   const pool='<div class="strategy-small-heading">준비 카드를 하나씩 누르세요</div><div class="strategy-plan-cards">'+r.pool.map(i=>'<button type="button" data-plan="choose" data-i="'+i+'" '+(r.chosen.includes(i)?'disabled':'')+'><span>'+seq[i][1]+'</span><strong>'+seq[i][0]+'</strong></button>').join('')+'</div>';
   const buttons='<div class="strategy-plan-actions"><button type="button" data-plan="undo">↩ 마지막 카드 취소</button><button type="button" data-plan="clear">처음부터</button><button type="button" data-plan="check" class="strategy-primary" '+(r.chosen.length!==count?'disabled':'')+'>축제 준비 확인 ✓</button></div>';
   body.innerHTML=story+evidence+order+pool+buttons+(r.errors>=2?'<p class="strategy-helptext">도움: 첫 번째 준비는 '+seq[0][1]+' '+seq[0][0]+'이에요.</p>':'');
  }
  body.addEventListener('click',e=>{
   const b=e.target.closest('button[data-plan]');if(!b||b.disabled)return;
   const act=b.dataset.plan,i=Number(b.dataset.i);
   if(act==='listen'){
    const clue=clues[Number(b.dataset.clue)];if(!clue)return;
    if(ctx?.state?.sound&&'speechSynthesis' in window&&'SpeechSynthesisUtterance' in window){
     try{speechSynthesis.cancel();const voice=new SpeechSynthesisUtterance(clue.text);voice.lang='ko-KR';voice.rate=.82;speechSynthesis.speak(voice);}catch{feedback.textContent='단서 그림을 보고 순서를 확인해요.';}
    }else feedback.textContent='소리를 켜면 단서를 들을 수 있어요. 그림도 함께 볼 수 있어요.';
    return;
   }
   if(act==='recover'){r.chosen=[];r.phase='plan';assist('단서를 다시 읽고 새 순서를 계획했어요.');return;}
   if(act==='choose'){if(!r.chosen.includes(i)){r.chosen.push(i);rerender();}return;}
   if(act==='undo'){r.chosen.pop();rerender();return;}
   if(act==='clear'){r.chosen=[];rerender();return;}
   if(act==='check'){
    if(r.chosen.length!==count)return;
    if(r.chosen.every((id,index)=>index===id)){complete(true,'서로 다른 '+(count-1)+'개 순서 단서를 종합하여 축제 계획 완성');}
    else{r.chosen=[];fail('단서를 다시 살펴보고 어느 준비가 먼저인지 생각해 봐요.');}
   }
  });
 }
});
})();
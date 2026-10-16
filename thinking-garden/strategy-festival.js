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
  [['버스 노선 보기','🚌'],['정류장 찾기','🚏'],['버스 타기','🎫'],['내릴 곳 확인','📍']]
];
window.StrategyGarden.register('festivalPlan',{
 begin(s,r,round){
  r.tasks=tasks[round%tasks.length].slice(0,r.level===3?4:3);
  r.pool=r.tasks.length===4?[2,0,3,1]:[2,0,1];
  r.chosen=[];r.phase='plan';
 },
 view({r,body,rerender,assist,fail,complete}){
  const count=r.tasks.length,seq=r.tasks;
  const clues=Array.from({length:count-1},(_,i)=>({friend:['🐰','🐻','🐱'][i],text:seq[i][1]+' '+seq[i][0]+'을(를) 먼저 하고, 그다음 '+seq[i+1][1]+' '+seq[i+1][0]+'을(를) 해야 해요.'}));
  const story='<div class="strategy-story-head"><span>🎪 모아의 축제 정원</span><h3>친구들의 이야기를 듣고 축제를 준비해요!</h3></div><div class="strategy-festival-banner">🎈　🌱　🎉　🌷　🎁</div>';
  const evidence='<div class="strategy-evidence"><strong>📜 친구들이 알려준 순서 단서</strong>'+clues.map(c=>'<div class="strategy-witness"><span>'+c.friend+'</span><p>'+c.text+'</p></div>').join('')+'</div>';
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
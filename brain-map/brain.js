/* 일단 해봄 — 모두 읽을 수 있는 초등·학부모 뇌지도: 추가 설명만 선택형 */
(()=>{
 'use strict';
 const data={
  frontal:{name:'전두엽',icon:'💡',fact:'오늘 할 일을 생각하고, 차례를 정하거나 잠깐 멈출 때 여러 뇌 부분과 함께 일해요.'},
  parietal:{name:'두정엽',icon:'✋',fact:'눈을 감고 내 손의 위치를 느끼거나, 퍼즐 조각이 들어갈 자리를 찾을 때 중요해요.'},
  temporal:{name:'측두엽',icon:'👂',fact:'친구가 하는 말을 듣고 이해할 때 관여해요. 기억을 만드는 데에는 이 안쪽의 해마도 중요해요.'},
  occipital:{name:'후두엽',icon:'👀',fact:'그림의 선과 모양, 글자 모양을 보는 초기 과정에 중요해요. 의미를 아는 일은 다른 부분과 함께해요.'},
  cerebellum:{name:'소뇌',icon:'⚽',fact:'공을 잡으려고 팔을 뻗거나 걸을 때 균형과 움직임의 타이밍을 맞추도록 도와요.'},
  brainstem:{name:'뇌줄기',icon:'💗',fact:'잠잘 때도 숨을 쉬고 심장이 뛰도록 돕는, 생명을 유지하는 기본적인 일을 해요.'}
 };
 const nodes=[...document.querySelectorAll('.lobe-card[data-region]')];
 const shapes=[...document.querySelectorAll('#brainMap [data-brain-region]')];
 const detail=document.getElementById('simpleDetail');
 const title=document.getElementById('simpleDetailTitle');
 const text=document.getElementById('simpleDetailText');
 const icon=document.getElementById('simpleDetailIcon');
 const close=document.getElementById('detailClose');
 if(nodes.length!==6||shapes.length!==6||![detail,title,text,icon,close].every(Boolean))return;
 function select(key){
  const d=data[key];if(!d)return;
  title.textContent=d.name;text.textContent=d.fact;icon.textContent=d.icon;
  detail.hidden=false;
  nodes.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.region===key)));
  shapes.forEach(g=>{
   const active=g.dataset.brainRegion===key;
   g.toggleAttribute('data-active',active);
   g.setAttribute('aria-pressed',String(active));
  });
 }
 function reset(){
  detail.hidden=true;
  nodes.forEach(b=>b.setAttribute('aria-pressed','false'));
  shapes.forEach(g=>{g.removeAttribute('data-active');g.setAttribute('aria-pressed','false');});
 }
 nodes.forEach(button=>button.addEventListener('click',()=>select(button.dataset.region)));
 shapes.forEach(group=>{
  group.addEventListener('click',()=>select(group.dataset.brainRegion));
  group.addEventListener('keydown',event=>{
   if(event.key==='Enter'||event.key===' '){event.preventDefault();select(group.dataset.brainRegion);}
  });
 });
 close.addEventListener('click',reset);
 reset();
})();
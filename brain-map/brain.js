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
 // The current six-lobe diagram remains the default. The second tab is a genuine
 // DOM/SVG lesson with live selection, not a flattened generated image.
 const viewTabs=[...document.querySelectorAll('[data-brain-view]')];
 const viewPanels={lobes:document.getElementById('lobesView'),hemispheres:document.getElementById('hemispheresView')};
 const sideButtons=[...document.querySelectorAll('[data-hemi-select]')];
 const heroSvg=document.querySelector('.hemi-hero-svg');
 const focus=document.getElementById('hemiFocus');
 const sideCopy={
  left:['💬 좌뇌를 살펴봐요','말과 문장의 일부 과정에서 상대적으로 더 많이 참여해요.'],
  right:['🧭 우뇌를 살펴봐요','공간 파악과 말투의 감정 단서에 상대적으로 더 관여할 수 있어요.'],
  both:['🤝 함께 일하는 뇌','좌뇌와 우뇌는 한 팀이에요.']
 };
 function selectSide(key){
  const parts=sideCopy[key];if(!parts||!focus||!heroSvg)return;
  sideButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.hemiSelect===key)));
  heroSvg.setAttribute('data-focused',key);
  focus.querySelector('b').textContent=parts[0];
  focus.querySelector('span').textContent=parts[1];
 }
 function chooseView(key,updateHash=true){
  if(!viewPanels[key])return;
  for(const [name,panel] of Object.entries(viewPanels)){
   panel.hidden=name!==key;
  }
  viewTabs.forEach(button=>button.setAttribute('aria-selected',String(button.dataset.brainView===key)));
  const intro=document.getElementById('mapIntroText');
  if(intro)intro.textContent=key==='hemispheres'?'좌뇌와 우뇌가 맡는 일을 비교하고, 함께하는 활동도 살펴봐요.':'색깔을 따라가면 뇌의 이름과 하는 일을 쉽게 알 수 있어요.';
  if(updateHash)window.history.replaceState(null,'',key==='hemispheres'?'#hemispheres':'#lobes');
 }
 for(const button of viewTabs){
  button.addEventListener('click',()=>chooseView(button.dataset.brainView));
  button.addEventListener('keydown',e=>{
    if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;
    e.preventDefault();
    const next=button.dataset.brainView==='lobes'?'hemispheres':'lobes';
    chooseView(next);
    viewTabs.find(b=>b.dataset.brainView===next)?.focus();
  });
 }
 for(const button of sideButtons){
  const activate=()=>selectSide(button.dataset.hemiSelect);
  button.addEventListener('click',activate);
  if(button.tagName.toLowerCase()==='g'){
   button.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}
   });
  }
 }
 // Familiar situations connect the comparison to daily life without assigning
 // an entire activity exclusively to one half of the brain.
 const sceneData={
  talk:{title:'💬 친구와 대화할 때',body:'말을 골라 문장을 만들고, 목소리의 느낌과 표정을 살펴요. 여러 뇌 영역이 함께해요.'},
  read:{title:'📖 책을 읽을 때',body:'글자 모양을 보고, 말소리와 뜻을 연결하고, 집중해요. 양쪽 뇌의 여러 영역이 함께해요.'},
  ball:{title:'⚽ 공놀이할 때',body:'공의 위치를 보고, 몸을 움직이고, 타이밍을 맞춰요. 두 반구와 여러 뇌 영역이 함께해요.'},
  solve:{title:'🧩 문제를 해결할 때',body:'필요한 정보를 찾고, 방법을 비교하고, 선택해요. 한쪽 뇌만으로 하는 일이 아니에요.'}
 };
 const sceneButtons=[...document.querySelectorAll('[data-brain-scene]')];
 const sceneTitle=document.getElementById('hemiSceneTitle');
 const sceneText=document.getElementById('hemiSceneText');
 function selectScene(key){
  if(!sceneData[key]||!sceneTitle||!sceneText)return;
  sceneButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.brainScene===key)));
  sceneTitle.textContent=sceneData[key].title;
  sceneText.textContent=sceneData[key].body;
  selectSide('both');
 }
 sceneButtons.forEach(b=>b.addEventListener('click',()=>selectScene(b.dataset.brainScene)));
 selectScene('talk');
 // Three short retrieval questions, immediate explanatory feedback, no score
 // or personality/brain-type judgement.
 const questions=[
  {q:'말과 문장을 만드는 데 상대적으로 더 많이 참여하는 쪽은?',options:['좌뇌','우뇌'],answer:0,
   good:'맞아요! 많은 사람에게서 좌뇌의 언어 관련 영역이 더 크게 참여해요. 우뇌도 함께해요.',
   review:'많은 사람에게서는 좌뇌가 상대적으로 더 관여해요. 우뇌도 언어 활동에 함께 참여해요.'},
  {q:'말투에 담긴 감정의 단서를 알아차리는 데 상대적으로 더 관여하는 쪽은?',options:['좌뇌','우뇌'],answer:1,
   good:'맞아요! 우뇌가 상대적으로 더 관여할 수 있어요. 양쪽 뇌가 함께 듣고 이해해요.',
   review:'말투의 감정 단서에는 우뇌가 상대적으로 더 관여할 수 있어요. 좌뇌도 함께해요.'},
  {q:'책을 읽거나 공놀이할 때 우리 뇌는 어떻게 일할까요?',options:['한쪽만 일해요','양쪽이 함께해요'],answer:1,
   good:'맞아요! 양쪽 뇌와 여러 영역이 한 팀으로 일해요.',
   review:'책 읽기와 공놀이는 여러 기능이 필요한 활동이에요. 양쪽 뇌가 함께 일해요.'}
 ];
 const qText=document.getElementById('hemiQuizQuestion');
 const qProgress=document.getElementById('hemiQuizProgress');
 const qButtons=[...document.querySelectorAll('[data-hemi-answer]')];
 const qResponse=document.getElementById('hemiQuizResponse');
 const qNext=document.getElementById('hemiQuizNext');
 let qIndex=0,answered=false;
 function showQuestion(){
  const q=questions[qIndex];answered=false;
  qText.textContent=q.q;qProgress.textContent=(qIndex+1)+' / '+questions.length;
  qButtons.forEach((b,i)=>{b.textContent=q.options[i];b.disabled=false;b.setAttribute('aria-pressed','false');b.removeAttribute('data-correct');});
  qResponse.hidden=true;qResponse.textContent='';qNext.hidden=true;
 }
 qButtons.forEach(button=>button.addEventListener('click',()=>{
  if(answered)return;
  answered=true;
  const answer=Number(button.dataset.hemiAnswer),q=questions[qIndex],correct=answer===q.answer;
  qButtons.forEach((b,i)=>{b.disabled=true;b.setAttribute('aria-pressed',String(i===answer));if(i===q.answer)b.setAttribute('data-correct','true');});
  qResponse.hidden=false;
  qResponse.textContent=(correct?'✓ ':'💡 ')+(correct?q.good:q.review);
  qResponse.dataset.result=correct?'right':'review';
  qNext.hidden=false;
  qNext.textContent=qIndex===questions.length-1?'처음부터 다시':'다음 문제 →';
 }));
 qNext?.addEventListener('click',()=>{
  qIndex=(qIndex+1)%questions.length;showQuestion();
  qText?.focus?.();
 });
 showQuestion();
 selectSide('both');
 chooseView(location.hash==='#hemispheres'?'hemispheres':'lobes',false);
 window.addEventListener('hashchange',()=>chooseView(location.hash==='#hemispheres'?'hemispheres':'lobes',false));

})();
/* 일단 해봄 — 모두 읽을 수 있는 초등·학부모 뇌지도: 추가 설명만 선택형 */
(()=>{
 'use strict';
 const data={
  frontal:{name:'전두엽',icon:'💡',fact:'전두엽은 계획을 세우고 행동을 조절하는 데 중요해요. 예를 들어 ‘숙제부터 하고 놀자’고 순서를 정하거나, 차례가 올 때까지 기다릴 때 다른 뇌 영역과 함께해요.'},
  parietal:{name:'두정엽',icon:'✋',fact:'두정엽은 몸에서 오는 감각과 공간 정보를 처리하는 데 중요해요. 눈을 감고 손의 위치를 느끼거나, 퍼즐 조각이 들어갈 자리를 찾을 때 다른 영역과 함께해요.'},
  temporal:{name:'측두엽',icon:'👂',fact:'측두엽은 소리와 언어의 여러 정보를 처리하는 데 관여해요. 친구 말을 이해하고 익숙한 목소리를 알아들을 때 중요해요. 안쪽 해마는 새로운 기억 형성에 관여해요.'},
  occipital:{name:'후두엽',icon:'👀',fact:'후두엽은 눈으로 본 정보를 처음 분석하는 과정에 중요해요. 글자 모양이나 그림의 선을 볼 때 활동하고, 무엇인지 알아보는 일은 다른 부분과 함께해요.'},
  cerebellum:{name:'소뇌',icon:'⚽',fact:'소뇌는 균형과 움직임의 정확한 타이밍을 돕고 연습한 동작을 다듬는 데 관여해요. 공을 잡거나 계단을 오를 때 다른 운동 영역과 함께해요.'},
  brainstem:{name:'뇌줄기',icon:'💗',fact:'뇌줄기는 숨쉬기와 심장박동 같은 기본 생명 기능의 조절에 중요해요. 자고 있을 때도 이 기능들이 이어지도록 다른 신체 조절 체계와 함께 작동해요.'}
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
  talk:{title:'💬 친구와 대화할 때',body:'친구가 “괜찮아”라고 하면 말의 뜻을 이해하고, 목소리 높낮이와 표정을 함께 살펴요. 듣기·말하기·감정 단서 처리에 여러 영역이 관여해요.'},
  read:{title:'📖 책을 읽을 때',body:'“고양이가 의자 밑에 있어요”를 읽을 때 글자 모양을 보고 말소리·뜻을 연결하고, 고양이가 어디 있을지 떠올려요. 여러 뇌 영역이 협력해요.'},
  map:{title:'🧭 길을 찾을 때',body:'“교실에서 왼쪽으로 돌아 도서관에 가자”를 듣고 방향을 기억해요. 말 이해·공간 파악·움직임을 함께 사용해요.'},
  ball:{title:'⚽ 공놀이할 때',body:'날아오는 공의 위치와 속도를 살피고, 양손과 몸의 움직임을 조절해요. 눈·운동 영역·소뇌 등 여러 곳이 함께 일해요.'},
  music:{title:'🎵 노래 부를 때',body:'가사를 떠올리고 음의 높낮이와 박자를 들으며 목소리와 호흡을 맞춰요. 음악은 우뇌 한쪽만의 일이 아니에요.'},
  draw:{title:'🎨 그림을 그릴 때',body:'집을 그리려면 모양과 위치를 생각하고, 종이 위에 배치하고, 손을 조절해요. 모양·움직임·계획이 함께 필요해요.'},
  bag:{title:'🎒 가방을 챙길 때',body:'“필통→책→물통” 순서를 기억하고 물건의 위치를 찾고 가방에 넣어요. 기억·공간 파악·손 움직임이 함께해요.'},
  feeling:{title:'🙂 친구 기분을 살필 때',body:'“정말 잘했네!”라는 말도 기쁜 목소리인지 비꼬는 말투인지 살펴요. 말뜻뿐 아니라 억양·표정·상황을 함께 고려해야 해요.'}
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
 // Three short questions at a time, with three rotating sets. These are
 // recall prompts, not a hemisphere/personality test.
 const questionSets=[
  [
   {q:'말과 문장을 만드는 데 상대적으로 더 많이 참여하는 쪽은?',options:['좌뇌','우뇌'],answer:0,
    good:'맞아요! 많은 사람에게서 좌뇌의 언어 관련 영역이 더 크게 참여해요. 우뇌도 함께해요.',
    review:'많은 사람에게서는 좌뇌가 상대적으로 더 관여해요. 우뇌도 언어 활동에 함께 참여해요.'},
   {q:'말투에 담긴 감정의 단서를 알아차리는 데 상대적으로 더 관여하는 쪽은?',options:['좌뇌','우뇌'],answer:1,
    good:'맞아요! 우뇌가 상대적으로 더 관여할 수 있어요. 양쪽 뇌가 함께 듣고 이해해요.',
    review:'말투의 감정 단서에는 우뇌가 상대적으로 더 관여할 수 있어요. 좌뇌도 함께해요.'},
   {q:'책을 읽거나 공놀이할 때 우리 뇌는 어떻게 일할까요?',options:['한쪽만 일해요','양쪽이 함께해요'],answer:1,
    good:'맞아요! 양쪽 뇌와 여러 영역이 한 팀으로 일해요.',
    review:'책 읽기와 공놀이는 여러 기능이 필요한 활동이에요. 양쪽 뇌가 함께 일해요.'}
  ],
  [
   {q:'왼손을 움직일 때 주로 관여하는 운동 영역은 어느 쪽에 있을까요?',options:['좌뇌','우뇌'],answer:1,
    good:'맞아요! 왼손 움직임은 반대쪽인 우뇌 운동 영역이 주로 조절해요. 다른 영역도 협력해요.',
    review:'왼손은 반대쪽인 우뇌 운동 영역이 주로 조절해요. 그렇다고 우뇌만 쓰는 건 아니에요.'},
   {q:'“괜찮아”라는 말에서 친구 기분을 짐작하려면?',options:['말뜻만 살펴요','말투·표정·상황도 살펴요'],answer:1,
    good:'맞아요! 같은 말도 말투와 상황에 따라 다르게 느껴져요. 여러 영역이 함께 처리해요.',
    review:'말뜻만으로는 알기 어려워요. 말투·표정·상황 같은 단서도 함께 살펴요.'},
   {q:'좌뇌와 우뇌 사이에서 정보를 주고받는 데 중요한 연결 통로는?',options:['뇌량','두 반구는 연결되지 않아요'],answer:0,
    good:'맞아요! 뇌량은 좌우 뇌 사이에 정보를 전달하는 중요한 신경섬유 다발이에요.',
    review:'뇌량이라는 신경섬유 다발이 좌우 뇌를 이어줘요. 뇌 속에 있어서 바깥 그림에는 보이지 않아요.'}
  ],
  [
   {q:'물건의 위치·방향을 살필 때 상대적으로 더 관여할 수 있는 쪽은?',options:['좌뇌','우뇌'],answer:1,
    good:'맞아요! 공간 처리의 일부는 우뇌가 상대적으로 더 관여하는 경향이 있어요. 좌뇌도 함께해요.',
    review:'공간 파악의 일부는 우뇌가 상대적으로 더 관여할 수 있어요. 좌뇌도 참여해요.'},
   {q:'그림을 그리고 노래를 부를 때는?',options:['우뇌만 일해요','여러 뇌 영역이 함께해요'],answer:1,
    good:'맞아요! 미술·음악·창의력도 한쪽 반구만 담당하는 일이 아니에요.',
    review:'미술과 음악에는 보기·듣기·기억·움직임 등이 필요해요. 양쪽 뇌가 협력해요.'},
   {q:'오른손잡이이고 수학을 좋아하면 좌뇌형일까요?',options:['네, 좌뇌형이에요','아니요, 그렇게 나눌 수 없어요'],answer:1,
    good:'맞아요! 손잡이나 잘하는 과목으로 사람을 좌뇌형·우뇌형으로 나누지 않아요.',
    review:'손잡이와 좋아하는 과목만으로 좌뇌형·우뇌형을 정하는 것은 과학적으로 뒷받침되지 않아요.'}
  ]
 ];
 const qText=document.getElementById('hemiQuizQuestion');
 const qProgress=document.getElementById('hemiQuizProgress');
 const qButtons=[...document.querySelectorAll('[data-hemi-answer]')];
 const qResponse=document.getElementById('hemiQuizResponse');
 const qNext=document.getElementById('hemiQuizNext');
 let qIndex=0,roundIndex=0,answered=false;
 const questions=()=>questionSets[roundIndex];
 function showQuestion(){
  const q=questions()[qIndex];answered=false;
  qText.textContent=q.q;qProgress.textContent=(qIndex+1)+' / '+questions().length;
  qButtons.forEach((b,i)=>{b.textContent=q.options[i];b.disabled=false;b.setAttribute('aria-pressed','false');b.removeAttribute('data-correct');});
  qResponse.hidden=true;qResponse.textContent='';qNext.hidden=true;
 }
 qButtons.forEach(button=>button.addEventListener('click',()=>{
  if(answered)return;
  answered=true;
  const answer=Number(button.dataset.hemiAnswer),q=questions()[qIndex],correct=answer===q.answer;
  qButtons.forEach((b,i)=>{b.disabled=true;b.setAttribute('aria-pressed',String(i===answer));if(i===q.answer)b.setAttribute('data-correct','true');});
  qResponse.hidden=false;
  qResponse.textContent=(correct?'✓ ':'💡 ')+(correct?q.good:q.review);
  qResponse.dataset.result=correct?'right':'review';
  qNext.hidden=false;
  qNext.textContent=qIndex===questions().length-1?'다른 3문제 →':'다음 문제 →';
 }));
 qNext?.addEventListener('click',()=>{
  if(qIndex===questions().length-1){roundIndex=(roundIndex+1)%questionSets.length;qIndex=0;}
  else qIndex+=1;
  showQuestion();
  qText?.focus?.();
 });
 showQuestion();
 selectSide('both');
 chooseView(location.hash==='#hemispheres'?'hemispheres':'lobes',false);
 window.addEventListener('hashchange',()=>chooseView(location.hash==='#hemispheres'?'hemispheres':'lobes',false));

})();
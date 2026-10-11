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

 // Each summary square opens one structured, self-contained explanation.
 // Terms describe processes, not individual "brain types" or diagnostic traits.
 const topicData={
  speech:{
   side:'좌뇌',title:'말하고 문장 만들기',
   intro:'생각이나 경험을 다른 사람에게 말로 전하려면 낱말을 떠올리고 차례를 정해 표현해야 해요.',
   steps:[
    ['낱말 떠올리기','먹은 음식을 설명하려고 “사과”라는 낱말을 찾는 일이에요.'],
    ['문장 만들기','“나는 아침에 사과를 먹었어”처럼 낱말을 문장으로 연결해요.'],
    ['소리 내어 말하기','입·혀·숨의 움직임을 맞춰 상대방에게 들리게 말해요.']
   ],
   examples:['어제 있었던 일을 친구에게 두 문장으로 이야기하기','원하는 물건을 “빨간 색연필 주세요”라고 설명하기'],
   terms:[
    ['어휘','우리가 알고 있거나 사용하는 낱말이에요.'],
    ['문장','낱말을 연결하여 뜻을 전달하는 말의 묶음이에요.'],
    ['언어 산출','떠올린 생각을 말이나 글로 표현하는 과정이에요.']
   ],
   note:'말하기는 좌뇌 언어 영역이 상대적으로 많이 관여하는 경우가 많지만, 말의 감정·소리 조절 등에는 우뇌도 함께해요.'
  },
  phonics:{
   side:'좌뇌',title:'말소리와 글자 연결',
   intro:'말소리를 듣고 구별하고, 그 소리를 글자와 연결하는 활동이에요. 읽기에도 중요한 여러 과정 중 하나예요.',
   steps:[
    ['소리 구별하기','“바”와 “파”가 같은 소리인지 다른 소리인지 들어봐요.'],
    ['글자와 짝짓기','들은 “바” 소리를 글자 ‘바’와 연결해요.'],
    ['소리 이어 읽기','‘ㄱ’과 ‘ㅏ’ 같은 소리를 연결해 글자를 읽는 데 활용해요.']
   ],
   examples:['“달”과 “딸”의 첫소리가 다른지 듣기','책에서 ‘나’라는 글자를 보고 “나”라고 소리 내어 읽기'],
   terms:[
    ['음운','말의 뜻을 구별하는 데 쓰이는 말소리의 단위예요.'],
    ['음운 변별','두 말소리가 같은지 다른지 구분하는 능력이에요.'],
    ['글자-소리 대응','글자와 그 글자가 나타내는 말소리를 연결하는 일이에요.']
   ],
   note:'듣기·읽기에는 청각 영역, 시각 영역, 언어 네트워크 등이 함께 필요해요. 좌뇌 한곳만 담당하지 않아요.'
  },
  syntax:{
   side:'좌뇌',title:'말의 순서 이해하기',
   intro:'문장에 들어 있는 낱말과 조사를 살펴 “누가 무엇을 했는지” 알아내는 일이에요.',
   steps:[
    ['누가 했는지 찾기','“강아지가 공을 물었어”에서 주인공은 강아지예요.'],
    ['무엇을 했는지 찾기','강아지가 한 행동은 “물었어”예요.'],
    ['말을 바꿔 비교하기','“고양이가 강아지를 쫓아”와 “강아지가 고양이를 쫓아”는 뜻이 달라요.']
   ],
   examples:['“공을 상자 안에 넣어 줘”라는 지시를 듣고 따라 하기','그림을 보고 “누가 누구를 밀었을까?”에 답하기'],
   terms:[
    ['어순','낱말들이 문장 안에 놓이는 차례예요.'],
    ['조사','‘이/가’, ‘을/를’처럼 낱말의 역할을 알려주는 말이에요.'],
    ['통사','낱말들이 문장을 이루는 규칙과 구조를 뜻해요.']
   ],
   note:'언어의 순서·문장 구조에는 좌뇌 영역이 상대적으로 많이 관여할 수 있지만, 문장의 뜻을 이해할 때는 여러 영역이 협력해요.'
  },
  'right-hand':{
   side:'좌뇌',title:'오른쪽 몸 움직이기',
   intro:'뇌의 왼쪽 운동 영역은 오른쪽 손과 발의 움직임을 주로 조절해요.',
   steps:[
    ['움직임 준비하기','오른손을 들거나 연필을 움직일 준비를 해요.'],
    ['근육에 신호 보내기','운동 신경 경로를 따라 오른쪽 근육이 움직이도록 신호를 보내요.'],
    ['움직임 고치기','눈과 몸에서 받은 정보를 이용해 손의 위치와 힘을 조절해요.']
   ],
   examples:['오른손으로 이름을 쓰거나 점을 잇기','오른발로 공을 차고 몸의 균형 잡기'],
   terms:[
    ['운동 피질','움직임을 조절하는 데 중요한 대뇌 겉부분이에요.'],
    ['반대쪽 조절','왼쪽 뇌가 주로 오른쪽 몸을, 오른쪽 뇌가 주로 왼쪽 몸을 조절하는 특징이에요.'],
    ['협응','여러 근육과 감각 정보를 맞춰 부드럽게 움직이는 일이에요.']
   ],
   note:'오른손으로 글씨를 쓸 때 좌뇌 운동 영역뿐 아니라 양쪽의 운동 관련 영역, 감각 영역, 소뇌 등도 함께 작동해요.'
  },
  space:{
   side:'우뇌',title:'공간과 위치 살피기',
   intro:'물건의 자리·거리·방향을 파악할 때 우뇌의 일부 공간 처리 영역이 상대적으로 더 관여하는 경향이 있어요.',
   steps:[
    ['어디에 있는지 보기','물통이 책상 위인지 아래인지 찾아봐요.'],
    ['방향 비교하기','책상 오른쪽에 가방이 있는지 왼쪽에 있는지 살펴봐요.'],
    ['자리 기억하기','방금 본 물건의 위치를 떠올려 다시 찾아요.']
   ],
   examples:['책상 아래에 떨어진 지우개 찾기','그림 속 자동차가 나무의 왼쪽인지 오른쪽인지 말하기'],
   terms:[
    ['공간','물건이 놓이고 우리가 움직이는 자리와 범위를 말해요.'],
    ['상대적 위치','두 물건의 위치를 서로 비교한 것이에요.'],
    ['시공간 처리','보이는 모양·거리·위치를 알아내고 활용하는 과정이에요.']
   ],
   note:'공간 파악은 우뇌만의 일이 아니에요. 좌뇌와 시각·기억·운동 관련 영역도 함께 참여해요.'
  },
  intonation:{
   side:'우뇌',title:'말투에 담긴 느낌',
   intro:'같은 말이라도 높낮이·강세·속도에 따라 다르게 들릴 수 있어요. 우뇌는 이런 감정적 말투 단서에 상대적으로 더 관여할 수 있어요.',
   steps:[
    ['목소리 높낮이 듣기','“괜찮아!”가 밝게 들리는지 힘없이 들리는지 살펴봐요.'],
    ['어느 말을 강조했는지 듣기','“지금 가자”와 “지금 가자!”처럼 강세 차이를 들어봐요.'],
    ['다른 단서와 함께 생각하기','표정·상황·말뜻을 함께 살펴 친구의 뜻을 짐작해요.']
   ],
   examples:['친구의 “고마워”가 즐겁게 들리는지 들어보기','같은 “그래”라는 말도 표정과 상황에 따라 의미가 달라질 수 있음을 이야기하기'],
   terms:[
    ['억양','말할 때 소리 높이가 오르내리는 모양이에요.'],
    ['강세','특정 음절이나 말을 더 강하게 강조하는 것이에요.'],
    ['감정 단서','상대방의 기분을 짐작할 때 참고하는 말투·표정·상황 등의 정보예요.']
   ],
   note:'말투를 듣고 기분을 완벽히 알 수 있는 것은 아니에요. 감정은 사람과 상황마다 다르고 좌뇌·우뇌가 모두 관여해요.'
  },
  attention:{
   side:'우뇌',title:'넓은 공간 주의',
   intro:'한곳만 보지 않고 주변의 여러 위치를 살피는 능력이에요. 우뇌의 주의 네트워크가 공간 주의에 중요한 역할을 해요.',
   steps:[
    ['주의 넓히기','눈앞 한 물건뿐 아니라 주변에 다른 물건도 있는지 둘러봐요.'],
    ['위치 옮겨 보기','왼쪽부터 오른쪽까지 차례로 살펴봐요.'],
    ['빠진 부분 확인하기','찾으려는 물건이 없는 쪽도 다시 살펴봐요.']
   ],
   examples:['교실 그림에서 벽·창문·칠판을 골고루 찾아보기','숨어 있는 물건 그림에서 한쪽만 보지 않고 전체를 살펴보기'],
   terms:[
    ['주의','필요한 정보에 마음과 감각을 기울이는 과정이에요.'],
    ['공간 주의','공간 속 어떤 위치에 주의를 둘지 조절하는 일이에요.'],
    ['시각 탐색','눈으로 여러 곳을 살피며 원하는 물건을 찾는 행동이에요.']
   ],
   note:'공간 주의는 단순히 “우뇌가 왼쪽만 본다”는 뜻이 아니에요. 좌우 뇌의 주의 네트워크가 함께 일하고 양상도 달라질 수 있어요.'
  },
  'left-hand':{
   side:'우뇌',title:'왼쪽 몸 움직이기',
   intro:'뇌의 오른쪽 운동 영역은 왼쪽 손과 발의 움직임을 주로 조절해요.',
   steps:[
    ['움직임 준비하기','왼손을 들거나 물건을 잡을 준비를 해요.'],
    ['근육에 신호 보내기','운동 신경 경로를 따라 왼쪽 근육을 움직이도록 해요.'],
    ['두 손 맞춰 쓰기','종이를 잡는 손과 글씨를 쓰는 손처럼 양손을 함께 조절해요.']
   ],
   examples:['왼손으로 블록을 쌓거나 손가락을 하나씩 펴기','양손으로 종이를 잡고 접기'],
   terms:[
    ['운동 피질','손·발 등 몸의 움직임을 조절하는 데 중요한 영역이에요.'],
    ['반대쪽 조절','뇌의 한쪽이 몸의 반대쪽 움직임을 주로 조절하는 특징이에요.'],
    ['양손 협응','오른손과 왼손을 서로 맞춰 쓰는 능력이에요.']
   ],
   note:'왼손의 움직임에도 양쪽 운동 네트워크가 함께 관여할 수 있어요. 왼손잡이라고 “우뇌형”인 것은 아니에요.'
  }
 };
 const topicDialog=document.getElementById('hemiTopicDialog');
 const topicOpeners=[...document.querySelectorAll('[data-hemi-topic]')];
 const topicUI={
  side:document.getElementById('hemiTopicSide'),
  title:document.getElementById('hemiTopicTitle'),
  intro:document.getElementById('hemiTopicIntro'),
  steps:document.getElementById('hemiTopicSteps'),
  examples:document.getElementById('hemiTopicExamples'),
  words:document.getElementById('hemiTopicWords'),
  boundary:document.getElementById('hemiTopicBoundary')
 };
 let topicOpener=null;
 function putText(parent,tag,content,className){
  const node=document.createElement(tag);node.textContent=content;
  if(className)node.className=className;
  parent.append(node);
  return node;
 }
 function openTopic(key,opener){
  const topic=topicData[key];
  if(!topic||!topicDialog||Object.values(topicUI).some(n=>!n))return;
  topicOpener=opener;
  topicUI.side.textContent=(topic.side==='좌뇌'?'🔵 ':'🟡 ')+topic.side+' · 기능을 더 쪼개서 알아봐요';
  topicUI.title.textContent=topic.title;topicUI.intro.textContent=topic.intro;
  topicUI.steps.replaceChildren();topicUI.examples.replaceChildren();topicUI.words.replaceChildren();
  topic.steps.forEach(([name,detail])=>{
   const li=document.createElement('li');
   putText(li,'b',name);
   putText(li,'p',detail);
   topicUI.steps.append(li);
  });
  topic.examples.forEach(ex=>putText(topicUI.examples,'li',ex));
  topic.terms.forEach(([term,meaning])=>{
   const row=document.createElement('div');
   row.className='hemi-topic-term';
   putText(row,'dt',term);putText(row,'dd',meaning);
   topicUI.words.append(row);
  });
  topicUI.boundary.textContent='꼭 기억해요 · '+topic.note;
  topicDialog.dataset.side=topic.side==='좌뇌'?'left':'right';
  topicDialog.showModal();
  document.getElementById('hemiTopicClose')?.focus();
 }
 topicOpeners.forEach(b=>b.addEventListener('click',()=>openTopic(b.dataset.hemiTopic,b)));
 document.getElementById('hemiTopicClose')?.addEventListener('click',()=>topicDialog?.close());
 document.getElementById('hemiTopicDone')?.addEventListener('click',()=>topicDialog?.close());
 topicDialog?.addEventListener('click',e=>{if(e.target===topicDialog)topicDialog.close();});
 topicDialog?.addEventListener('close',()=>{if(topicOpener?.isConnected)topicOpener.focus();topicOpener=null;});
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
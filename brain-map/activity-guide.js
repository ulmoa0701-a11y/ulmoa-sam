/* Activity guidance for the brain-map. Educational examples, not clinical training or diagnosis. */
(()=>{
 const data={
  talk:{
   title:'💬 친구와 질문 주고받기',aim:'질문을 듣고 답하거나 다시 물으며 대화의 차례를 주고받아요.',prep:'좋아하는 놀이·간식 같은 익숙한 주제 한 가지, 필요하면 사진·AAC',
   steps:[['하나 물어보기','상대가 “어떤 놀이가 좋아?”처럼 질문 하나를 해요.'],['편하게 답하기','말·사진 선택·가리키기·AAC 중 편한 방법으로 답해요.'],['차례 바꾸기','“너는?”이라고 물어보거나 질문 그림을 건네고 상대의 답을 들어요.']],
   easy:'좋아하는 놀이 사진 두 장 중 하나를 고르고 상대방의 답을 함께 들어요. 질문은 대신 읽어도 돼요.',
   challenge:'상대의 답을 듣고 “왜?” 또는 “어디에서?”처럼 이어지는 질문 하나를 고르거나 해봐요.',
   watch:'질문 이해와 차례 주고받기 중 어디서 도움이 필요한지 살펴봐요. 말의 길이로 판단하지 않아요.',
   why:'듣기·질문 이해·대답 선택·차례 기다리기 등 다양한 기능이 함께 필요해요.',
   note:'대답을 강요하지 않아요. 말하기가 어렵다면 시선·그림·AAC로 참여해요.'
  },
  read:{
   title:'📖 읽고 위치 찾아보기',aim:'문장의 뜻을 실제 위치와 연결해요.',prep:'“고양이가 의자 밑에 있어요” 같은 짧은 문장과 그림 또는 장난감',
   steps:[['읽거나 듣기','한 문장을 보고 읽거나 누군가 읽어 주는 말을 들어요.'],['자리 찾기','그림이나 장난감을 문장에 맞는 자리에 놓거나 가리켜요.'],['바꾸어 보기','“밑에”를 “위에”로 바꿔 다시 놓아봐요.']],
   easy:'글자 대신 음성으로 듣고 위·아래 두 위치 중 하나를 고르게 해요.',
   challenge:'앞·뒤·옆을 포함한 문장을 두 개 차례로 듣고 실행해요.',
   watch:'글자 읽기와 문장 뜻 이해의 어려움을 구분해 살펴봐요.',
   why:'시각·말소리·뜻·공간 판단·움직임이 함께 쓰여요.',
   note:'문자를 읽기 어렵다면 듣고 가리키는 방식으로 참여해요.'
  },
  map:{
   title:'🧭 교실 안 작은 길 찾아가기',aim:'출발점에서 목적지까지 지나갈 곳을 보고 순서대로 찾아가요.',prep:'방 안의 출발 장소(문), 도착 장소(책상), 중간 표식(의자) 한 곳',
   steps:[['시작과 끝 보기','문 앞에서 출발해 책상까지 가는 길을 함께 살펴봐요.'],['지나갈 곳 고르기','“의자를 지나 책상으로”처럼 지나갈 장소를 정하고 가리켜요.'],['길 따라가기','직접 이동하거나 손가락·말·AAC로 인형이 갈 길을 안내해요.']],
   easy:'가까운 출발점과 도착점만 사용하고 화살표 한 장으로 방향을 보여줘요.',
   challenge:'중간 표식을 두 곳으로 늘리거나 출발점을 바꾸어 다른 길을 찾아봐요.',
   watch:'목적지 확인·지나갈 순서 기억·경로 선택 중 어떤 도움이 필요한지 살펴봐요. 이동 속도로 판단하지 않아요.',
   why:'말·그림 단서 이해, 공간 파악, 순서 기억, 움직임 계획에 여러 영역이 함께 관여해요.',
   note:'안전한 실내에서 보호자와 함께해요. 이동이 어렵다면 종이 지도에서 손가락이나 시선으로 경로를 선택해요.'
  },
  ball:{
   title:'⚽ 공을 굴리고 받아보기',aim:'움직이는 물체를 보면서 손의 타이밍을 맞춰봐요.',prep:'부드러운 공과 장애물이 없는 바닥 공간',
   steps:[['어디 있는지 보기','공이 어디 있는지 함께 보고 손으로 가리켜요.'],['굴려 보내기','가까운 상대에게 공을 바닥으로 천천히 굴려요.'],['멈춰 보기','오는 공을 손으로 멈춰 보고 빠르기를 이야기해요.']],
   easy:'큰 부드러운 공을 가까이에서 아주 천천히 굴려요.',
   challenge:'공의 시작 방향을 바꾸거나 거리만 조금 늘려요.',
   watch:'공을 따라보는지, 손이 언제 움직이는지, 속도를 조절하는지 살펴봐요.',
   why:'시각·공간 판단·움직임 계획·운동 조절·소뇌가 함께해요.',
   note:'세게 던지지 않아요. 움직임이 불편하면 공의 위치를 가리키는 것으로 대신해요.'
  },
  music:{
   title:'🎵 노래와 박자 바꾸기',aim:'소리·가사·박자 중 한 가지 단서를 느끼고 비교해요.',prep:'익숙하고 짧은 노래 한 줄 또는 손뼉 박자',
   steps:[['짧게 듣기','노래 한 줄이나 짧은 박자를 한 번 들어요.'],['하나 골라 따라가기','가사·허밍·손뼉 중 편한 방법 하나로 참여해요.'],['바꾸고 비교하기','조금 빠르게 또는 느리게 바꿔 어떤 점이 다른지 표현해요.']],
   easy:'한 음이나 손뼉 두 번 정도로 줄여요.',
   challenge:'같은 가사로 박자를 바꾸거나 같은 박자로 가사를 바꿔봐요.',
   watch:'어떤 변화를 알아차리는지와 소리에 대한 부담을 따로 살펴봐요.',
   why:'청각·언어·기억·운동 관련 영역이 함께 필요해요.',
   note:'소리에 민감하면 음량을 낮추거나 소리 대신 손짓만 이용해요.'
  },
  draw:{
   title:'🎨 보고 그림 완성하기',aim:'그림 속 모양을 보고 그리거나 조각으로 배치하여 작은 그림을 만들어요.',prep:'집과 나무가 있는 간단한 그림 한 장, 종이·굵은 펜 또는 집·나무 그림 조각',
   steps:[['그림 살펴보기','그림에서 집과 나무를 찾아 각 모양을 함께 살펴봐요.'],['그리거나 놓기','집과 나무를 그리거나 준비한 그림 조각을 골라 종이에 배치해요.'],['나란히 비교하기','원본 그림과 만든 그림을 나란히 놓고 같은 점 하나를 가리켜요.']],
   easy:'그리기 대신 그림 조각 두 개 중 하나를 고르게 해요. 시선 선택이나 대신 붙여주기도 가능해요.',
   challenge:'원본을 잠깐 본 뒤 가리고, 기억나는 모양을 하나 더 그리거나 조각으로 배치해요.',
   watch:'모양을 살펴보기·표현 방식 고르기·그리거나 배치하기 중 필요한 도움을 구분해요. 그림 솜씨는 평가하지 않아요.',
   why:'시각적 형태 인식·계획·그림 또는 대체 표현·손 움직임 등 여러 기능이 협력해요.',
   note:'손 움직임이 불편하면 아동이 고른 조각을 보호자가 대신 붙여도 돼요.'
  },
  bag:{
   title:'🎒 가방 챙기는 순서 정하기',aim:'필요한 물건을 찾아 순서를 정하고 확인해요.',prep:'필통·책·물통 중 익숙한 물건 2~3개와 가방',
   steps:[['찾기','가방에 넣을 물건을 한 개씩 찾아요.'],['차례 정하기','넣을 순서를 가리키거나 그림으로 늘어놓아요.'],['넣고 확인하기','정한 순서로 넣고 빠진 물건이 없는지 함께 확인해요.']],
   easy:'물건 두 개와 순서 그림부터 시작해요.',
   challenge:'그림 없이 해보거나 넣을 순서 조건을 하나 더 추가해요.',
   watch:'물건 찾기·순서 기억하기·손으로 넣기 중 어떤 과정이 어려운지 구분해요.',
   why:'주의·기억·언어 이해·공간 파악·운동이 함께 쓰여요.',
   note:'잊어버리면 목록을 다시 보여줘요. 실패를 강조하지 않아요.'
  },
  feeling:{
   title:'🙂 말투와 상황 함께 살피기',aim:'같은 말도 상황에 따라 달라질 수 있음을 알아봐요.',prep:'“괜찮아” 같은 짧은 표현과 편안한 대화 상대',
   steps:[['두 번 듣기','같은 말을 밝은 말투와 조용한 말투로 들어요.'],['단서 모으기','말투 말고 표정이나 그 말이 나온 상황도 살펴봐요.'],['확인하기','“지금 괜찮아?”처럼 물어볼 문장을 함께 생각해요.']],
   easy:'말투 비교가 어렵다면 그림 상황 한 가지에서 시작해요.',
   challenge:'같은 말이 서로 다른 상황에서 쓰이는 예를 찾아봐요.',
   watch:'상대의 마음을 맞혔는지보다 어떤 단서를 참고했는지 살펴봐요.',
   why:'말뜻·억양·표정·상황 이해를 함께 사용해요.',
   note:'목소리나 표정만 보고 상대 마음을 단정하지 않아요. 감정 연기를 강요하지 않아요.'
  }
 };
 const elements={
  title:document.getElementById('hemiActivityTitle'),
  aim:document.getElementById('hemiActivityAim'),
  prep:document.getElementById('hemiActivityPrep'),
  steps:document.getElementById('hemiActivitySteps'),
  easy:document.getElementById('hemiActivityEasy'),
  challenge:document.getElementById('hemiActivityChallenge'),
  observe:document.getElementById('hemiActivityObserve'),
  why:document.getElementById('hemiActivityWhy'),
  note:document.getElementById('hemiActivityNote'),
  options:document.getElementById('hemiActivityOptions')
 };
 function select(key){
  const a=data[key];if(!a||!elements.title)return;
  elements.title.textContent=a.title;
  elements.aim.textContent=a.aim;
  elements.prep.textContent=a.prep;
  elements.steps.replaceChildren();
  a.steps.forEach(([name,description])=>{
   const li=document.createElement('li');
   const title=document.createElement('strong');title.textContent=name;
   const copy=document.createElement('p');copy.textContent=description;
   li.append(title,copy);elements.steps.append(li);
  });
  elements.easy.textContent=a.easy;
  elements.challenge.textContent=a.challenge;
  elements.observe.textContent=a.watch;
  elements.why.textContent='함께 필요한 기능 · '+a.why;
  elements.note.textContent='참고 · '+a.note;
  elements.options.open=false;
 }
 const buttons=[...document.querySelectorAll('[data-brain-scene]')];
 buttons.forEach(button=>button.addEventListener('click',()=>select(button.dataset.brainScene)));
 select('talk');
})();
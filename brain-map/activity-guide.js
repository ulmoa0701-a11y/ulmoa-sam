/* Activity guidance for the brain-map. Educational examples, not clinical training or diagnosis. */
(()=>{
 const data={
  talk:{
   title:'💬 하루 이야기 나누기',aim:'한 가지 경험을 떠올려 다른 사람에게 전해요.',prep:'익숙한 일상 이야기, 필요하면 사진 한 장',
   steps:[['고르기','오늘 있었던 일 하나를 고르거나 그림으로 가리켜요.'],['전하기','누구와 무엇을 했는지 말·그림·몸짓으로 표현해요.'],['이어 가기','상대가 “그다음에는?”이라고 물으면 한 가지 더 알려줘요.']],
   easy:'사진 두 장 중 하나를 고르고 단어 하나 또는 손짓으로 답해도 돼요.',
   challenge:'처음·중간·끝 순서로 전하고 상대에게 질문도 해봐요.',
   watch:'경험 고르기, 말의 순서, 주고받는 방식 등을 살펴봐요. 말의 양만 평가하지 않아요.',
   why:'기억·낱말 찾기·문장 만들기·상대방 이해가 함께 필요해요.',
   note:'말하기를 강요하지 않고 관심 있는 주제로 시작해요.'
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
   title:'🧭 물건의 자리 설명하기',aim:'기준이 되는 물건을 정해 위치를 알려줘요.',prep:'컵·지우개·연필 등 물건 3개와 책상',
   steps:[['기준 정하기','컵을 가운데 두고 컵을 기준으로 삼아요.'],['위치 찾기','지우개를 컵 앞이나 뒤에 놓고 그 위치를 말하거나 가리켜요.'],['역할 바꾸기','상대가 알려 준 자리에 물건을 놓아봐요.']],
   easy:'물건 2개로 앞·뒤 한 쌍부터 시작해요.',
   challenge:'보는 방향을 바꾸거나 두 단계 지시를 해봐요.',
   watch:'기준을 이해하는지, 시점이 바뀔 때 어떻게 반응하는지 관찰해요.',
   why:'언어 이해·시공간 파악·주의·운동 조절이 연결돼요.',
   note:'왼쪽·오른쪽은 보는 위치에 따라 달라질 수 있으니 기준을 알려줘요.'
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
   title:'🎨 그림에서 위치 말하기',aim:'위치를 계획하고 자신이 놓은 물건의 자리를 설명해요.',prep:'종이와 연필 또는 옮길 수 있는 그림·스티커 2개',
   steps:[['기준 놓기','집을 종이 가운데에 그리거나 붙여요.'],['하나 더 놓기','집 옆에 나무를 그리거나 붙여요.'],['자리 설명하기','“나무가 집 옆에 있어요”처럼 위치를 설명해요.']],
   easy:'직접 그리기 대신 그림 카드를 가리키거나 옮겨요.',
   challenge:'그림 두 개의 자리를 바꾸고 설명도 다시 해봐요.',
   watch:'위치를 계획하는 일과 그리기·말하기의 부담을 구분해요.',
   why:'보기·공간 관계·계획·언어·손 움직임이 함께 필요해요.',
   note:'그림 솜씨로 판단하지 않아요. 손 사용이 어려우면 가리키기로 바꿔요.'
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
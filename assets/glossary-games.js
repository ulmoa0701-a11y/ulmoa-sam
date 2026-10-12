/* 알아봄 · 상황으로 이해해봄
 * 교육용 가상 사례를 여러 관점에서 살펴보는 활동. 진단·평가·치료 처방 아님.
 * 보호자의 응답은 브라우저 메모리에서만 사용하며 저장·전송하지 않는다.
 * 상황/출처 데이터는 기존 알아봄 사전과 연결해 단일 원문을 재사용한다.
 */
(function(){
"use strict";
const CASES=[
  {id:"noise",scene:"distracted",level:"start",term:"memo-attention",
    ask:"소리가 날 때 멈춘 모습에서 어떤 점이 궁금하세요?",
    look:[["주변 소리","어떤 소리에서 멈췄고 조용할 때는 어떻게 참여하는지 비교해요."],["활동의 흥미","좋아하는 활동이나 익숙한 활동에서도 비슷한지 살펴봐요."],["피로와 컨디션","잠을 충분히 잤는지, 활동 시간이 길지는 않았는지도 단서가 돼요."]],
    help:[["환경을 조금 바꾸기","주변 소리를 줄인 뒤 참여가 달라지는지 살펴볼 수 있어요."],["활동을 짧게 나누기","오래 집중해야 하는 활동이라면 쉬는 시간을 사이에 둘 수 있어요."],["눈에 보이는 안내","지금 할 일 한 가지를 그림이나 말로 짧게 알려주는 방법도 있어요."]],
    follow:"언제, 어떤 소리에서, 얼마나 자주 멈추는지 구체적으로 남겨볼까요?",
    talk:"어떤 환경에서 참여가 편해지고 어려워지는지 같이 살펴보고 싶어요.",
    guard:"소리에 반응했다는 사실만으로 주의력 문제라고 할 수 없어요."},
  {id:"instructions",scene:"instructions",level:"start",term:"memo-working-memory",
    ask:"여러 지시 중 하나를 놓친 상황, 무엇을 더 알고 싶나요?",
    look:[["지시 길이","한 가지씩 말할 때와 두세 가지를 이어 말할 때를 비교해요."],["말 이해","지시에 쓰인 낱말과 표현을 정확히 이해했는지도 확인해요."],["듣는 환경","TV 소리나 다른 활동이 있었는지 함께 살펴봐요."]],
    help:[["지시를 나눠 말하기","한 번에 하나씩 전달하고 다음 단계로 이어갈 수 있어요."],["그림·순서표 보여주기","해야 할 순서를 눈에 보이게 제시할 수도 있어요."],["이해를 확인하기","다시 설명해 달라고 하기보다 무엇을 해야 하는지 행동으로 확인해볼 수 있어요."]],
    follow:"하나씩 알려주면 가능한지, 말 대신 그림을 보여주면 달라지는지 살펴봐요.",
    talk:"여러 지시 중 어떤 단계에서 놓치는지 함께 확인해보고 싶어요.",
    guard:"실행하지 않은 이유가 반드시 작업기억 때문인 것은 아니에요."},
  {id:"change",scene:"switch",level:"start",term:"memo-flexibility",
    ask:"놀이 규칙이 갑자기 바뀌었을 때, 어떤 관점이 떠오르나요?",
    look:[["변화를 미리 알았나요?","예고가 있었을 때와 갑작스러운 변화일 때의 반응을 비교해요."],["규칙을 이해했나요?","새 규칙을 알고도 어렵게 느끼는지, 규칙 자체를 모르는지도 달라요."],["감정·상황","기대하던 활동이 끝나서 속상했을 가능성도 살펴볼 수 있어요."]],
    help:[["바뀔 것을 예고하기","그림이나 짧은 말로 다음 규칙을 먼저 알릴 수 있어요."],["한 부분만 바꾸기","여러 규칙을 한꺼번에 바꾸지 않고 단계적으로 시도해 볼 수 있어요."],["감정을 인정하기","당황하거나 아쉬웠는지 먼저 확인하고 선택할 시간을 줄 수도 있어요."]],
    follow:"어떤 종류의 변경에서 특히 어려워하는지 구분해봐요.",
    talk:"변화를 미리 알려주었을 때와 갑작스러울 때 어떤 차이가 있을까요?",
    guard:"규칙을 따르기 어려운 것이 곧 고집이나 의지 부족을 뜻하지 않아요."},
  {id:"story",scene:"story",level:"start",term:"memo-narrative-discourse",
    ask:"오늘 일을 설명하다가 순서가 뒤섞였다면 어떤 점을 볼까요?",
    look:[["시간 순서","무슨 일이 먼저 일어났는지 떠올리는 데 도움이 필요한지 봐요."],["언어 표현","일은 알고 있지만 문장으로 이어 말하기 어려운지도 살펴봐요."],["이야기 상대","질문이 너무 빠르거나 길지는 않았는지도 중요해요."]],
    help:[["사진이나 그림 놓기","처음·중간·끝에 맞는 그림을 함께 배열해볼 수 있어요."],["짧게 한 가지씩 묻기","‘누가 있었어?’처럼 질문 하나로 시작해 이어갈 수 있어요."],["말할 시간 주기","답을 재촉하지 않고 떠올릴 시간을 줄 수도 있어요."]],
    follow:"그림이 있을 때와 말로만 이야기할 때 차이가 있는지 살펴봐요.",
    talk:"경험을 떠올리는 것과 이야기를 이어 말하는 것을 나눠 살펴보고 싶어요.",
    guard:"이야기를 순서대로 말하기 어려워도 경험을 이해하지 못했다는 뜻은 아니에요."},
  {id:"asking",scene:"asking",level:"start",term:"memo-aac",
    ask:"어른 손을 이끄는 행동이 보였어요. 어떤 점을 먼저 알아볼까요?",
    look:[["원하는 것","어디로 데려가려고 하는지, 무엇이 필요한지 살펴봐요."],["표현 방법","말뿐 아니라 눈길, 손짓, 그림 등 사용하는 표현도 살펴봐요."],["주변의 반응","요청했을 때 주변에서 어떻게 반응했는지도 알아볼 수 있어요."]],
    help:[["의미를 확인하고 응답","무엇이 필요한지 확인하고 가능한 범위에서 요청에 반응해요."],["선택할 표현 제공","그림, 몸짓, 말 등 이용할 수 있는 방법을 함께 마련할 수 있어요."],["익숙한 상황에서 연습","자주 필요로 하는 도움을 요청하는 경험을 반복해볼 수 있어요."]],
    follow:"같은 요청을 누구에게, 어떤 방식으로 전달하는지 살펴봐요.",
    talk:"지금 아이가 편하게 사용하는 의사소통 방법을 함께 찾고 싶어요.",
    guard:"말이 아니어도 소통일 수 있어요. 그림이나 손짓을 억지로 없앨 필요는 없어요."},
  {id:"reading",scene:"reading",level:"start",term:"memo-inferential-comprehension",
    ask:"문장을 읽지만 이야기를 설명하기 어려워요. 무엇이 궁금한가요?",
    look:[["글자 읽기","낱말과 문장을 얼마나 정확하게 읽는지 살펴봐요."],["말뜻 이해","읽은 문장을 쉽게 풀어 말하면 이해하는지 살펴봐요."],["이야기 연결","인물의 이유나 마음을 짐작하는 질문이 특히 어려운지도 구분해봐요."]],
    help:[["짧은 글부터 보기","한 문장씩 읽고 누가 무엇을 했는지 확인할 수 있어요."],["그림과 함께 읽기","이야기의 상황을 그림으로 보여줄 수도 있어요."],["답의 단서 찾아보기","질문의 답을 알려주기 전, 글에서 단서를 함께 찾을 수 있어요."]],
    follow:"글자를 읽을 때의 어려움인지 내용 이해의 어려움인지 나눠 관찰해봐요.",
    talk:"읽기 정확도와 이야기 이해 중 어디에서 도움이 필요한지 궁금해요.",
    guard:"잘 읽는 모습이 곧 모든 내용을 이해한다는 뜻도, 질문에 답하지 못했다는 것이 이해 부족의 증거도 아니에요."},
  {id:"refusal",scene:"refusal",level:"more",term:"memo-abc-observation",
    ask:"쓰기 활동 앞에서 자리를 벗어났어요. 무엇을 더 살펴볼까요?",
    look:[["과제의 특성","쓰는 양, 난이도, 도구 사용이 부담스럽지는 않았는지 봐요."],["행동 전후의 상황","활동 안내 직전과 자리를 벗어난 뒤 무슨 일이 있었는지 기록해요."],["몸 상태·감정","피로, 통증, 불안, 휴식 필요 등도 배제하지 않아요."]],
    help:[["과제량과 난이도 조정","하기 쉬운 시작 단계부터 제시해 반응을 살펴볼 수 있어요."],["도움 요청 방법 마련","어려울 때 도움이나 잠깐 쉴 시간을 요청할 방법을 알려줄 수 있어요."],["상황을 반복 관찰","언제 반복되는지 기록하고 적절한 지원은 전문가와 함께 조정할 수 있어요."]],
    follow:"발생 전·행동·발생 후를 사실대로 여러 번 적고, 평소 가능한 상황도 함께 비교해봐요.",
    talk:"쓰기 자체의 부담인지, 주변 반응이나 다른 조건과 관련 있는지 같이 살펴보고 싶어요.",
    guard:"ABC 기록 한 번만으로 행동의 기능이나 의도를 결정하지 않아요. 위험 행동은 안전 확보가 우선이에요."},
  {id:"context",scene:"context",level:"more",term:"memo-pragmatics",
    ask:"상황에 따라 말뜻을 다르게 받아들였어요. 무엇을 구분할까요?",
    look:[["표현 자체의 뜻","비유·반어를 접해본 경험이 있는지 살펴봐요."],["맥락 단서","표정, 말투, 앞뒤 이야기를 함께 제공했을 때 달라지는지 봐요."],["이해 확인 방식","‘무슨 뜻이야?’라는 질문이 어려운 건 아닌지도 생각해봐요."]],
    help:[["상황 두 개 비교","같은 말을 다른 장면에서 사용해 보며 뜻을 비교할 수 있어요."],["말을 직접적으로 바꾸기","중요한 안내라면 오해하기 쉬운 표현을 피할 수 있어요."],["표정·그림 곁들이기","말투와 상황을 그림으로 함께 알려볼 수 있어요."]],
    follow:"어떤 말과 어떤 상황에서 어려움이 반복되는지 예시를 적어봐요.",
    talk:"말의 뜻을 모르는지, 상황에 따라 달라지는 의미가 어려운지 함께 보고 싶어요.",
    guard:"한 가지 농담을 이해하지 못했다고 특정 언어·사회성 문제로 단정할 수 없어요."},
  {id:"planning",scene:"planning",level:"more",term:"memo-planning-organization",
    ask:"준비물은 꺼냈지만 시작하지 못해요. 어디를 더 볼까요?",
    look:[["첫 단계가 분명한가요?","무엇부터 해야 할지 알고 있는지 확인해요."],["활동 요구가 적절한가요?","너무 어렵거나 긴 과제는 아닌지 살펴봐요."],["시작할 환경·시간","방해 자극이 많거나 충분한 준비 시간이 없는지도 봐요."]],
    help:[["첫 단계만 보여주기","‘첫 줄 쓰기’처럼 바로 시작할 수 있는 한 가지를 제시해볼 수 있어요."],["순서표 활용","해야 할 일을 눈에 보이는 몇 단계로 나눌 수 있어요."],["시작 전 확인하기","준비물과 목표를 함께 확인하고 필요한 시간을 줄 수 있어요."]],
    follow:"시작 전, 하는 중, 마무리 중 언제 가장 자주 멈추는지 봐요.",
    talk:"계획과 실행 중 어느 부분에서 막히는지 함께 확인하고 싶어요.",
    guard:"시작하지 못하는 것이 곧 게으름이나 의지가 부족하다는 뜻은 아니에요."},
  {id:"express",scene:"express",level:"more",term:"memo-aac",
    ask:"그림을 가리키며 물을 요청했어요. 어떤 점을 알아볼까요?",
    look:[["의사소통 의도","언제 그림을 사용하는지, 무엇을 전하려는지 살펴봐요."],["이해·선택의 편안함","그림 위치나 수가 현재 사용하기 적절한지 봐요."],["상대의 반응","그림으로 요청했을 때 상대가 알아듣고 반응하는지 봐요."]],
    help:[["요청에 반응하기","그림으로 전달한 뜻을 인정하고 적절히 반응할 수 있어요."],["필요한 그림을 정리하기","자주 쓰는 것을 손쉽게 찾을 수 있도록 배치할 수 있어요."],["다양한 소통 인정","말·그림·몸짓을 상황에 맞게 함께 사용할 수 있어요."]],
    follow:"필요할 때 스스로 표현하는지, 여러 사람과 상황에서 사용하는지 살펴봐요.",
    talk:"지금 가장 편하게 사용하는 의사소통 수단을 함께 살펴보고 싶어요.",
    guard:"AAC가 반드시 발화를 줄인다는 근거는 없으며 개인의 요구에 맞춘 지원이 중요해요."},
  {id:"recall",scene:"recall",level:"more",term:"memo-retrieval",
    ask:"첫 글자 힌트가 있으면 단어를 떠올려요. 무엇이 궁금한가요?",
    look:[["힌트의 효과","첫 글자·그림·선택지 중 무엇이 도움이 되는지 살펴봐요."],["처음 배울 때의 모습","배우는 단계에서 이해하고 반복할 기회가 있었는지 봐요."],["기억을 떠올리는 시간","기다렸을 때 스스로 답을 찾는 경우도 있는지 봐요."]],
    help:[["떠올릴 시간 주기","답을 바로 알려주기보다 잠깐 생각할 여유를 줄 수 있어요."],["단서 조금씩 제공","글자나 그림 등 필요한 정도의 단서를 줄 수 있어요."],["시간 간격 두고 다시 보기","배운 내용을 다른 날 다시 떠올리는 기회를 만들 수 있어요."]],
    follow:"단서가 있을 때와 없을 때, 시간이 지난 뒤 어떤 차이가 있는지 살펴봐요.",
    talk:"기억하는 과정과 다시 떠올리는 과정을 나누어 살펴보고 싶어요.",
    guard:"답이 바로 떠오르지 않았다고 전혀 배우지 못했다는 뜻은 아니에요."},
  {id:"access",scene:"access",level:"more",term:"memo-udl",
    ask:"말보다 그림이 있을 때 순서를 잘 따라요. 어떤 점이 중요할까요?",
    look:[["정보를 제시한 방법","말만 들었을 때와 그림을 함께 봤을 때 무엇이 다른지 비교해요."],["과제의 단계 수","순서가 여러 개라 기억할 부담이 큰 건 아닌지 봐요."],["스스로 참여한 정도","그림을 보는 것에서 실제 행동까지 연결되는지 살펴봐요."]],
    help:[["그림·말 함께 제시","같은 목표를 다양한 방법으로 안내할 수 있어요."],["단계를 나눠 보여주기","복잡한 순서를 한눈에 볼 수 있게 정리할 수 있어요."],["선호·필요 확인","그림이 누구에게나 답이라는 전제 없이 개인별로 맞춰볼 수 있어요."]],
    follow:"어떤 목표에서 어떤 안내 방식이 특히 도움이 되는지 살펴봐요.",
    talk:"목표는 그대로 두고 안내 방법을 바꾸면 참여가 어떻게 달라질까요?",
    guard:"시각 자료가 도움 된다는 사실만으로 청각처리 문제나 특정 장애를 추정할 수 없어요."}
];
const MODE={
 observe:{title:"행동의 단서 찾기",tag:"관찰 돋보기",desc:"한 장면을 여러 각도에서 살펴봐요.",intro:"어떤 점이 궁금하세요?",icon:"🔎",choices:"look"},
 support:{title:"도움 방법 생각하기",tag:"도움 주머니",desc:"상황에 따라 달라질 수 있는 지원 방법을 비교해봐요.",intro:"어떤 방법을 먼저 생각해볼까요?",icon:"🌱",choices:"help"}
};
const LEVEL={start:"익숙한 장면 5개",more:"조금 더 생각할 장면 5개"};
function e(tag,cls,txt){const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;}
function mix(input){const a=input.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function mount({host,byId,situations,openTerm}){
 if(!host)return null;
 const scenes=new Map(situations.map(s=>[s.id,s]));
 for(const c of CASES){
   if(!scenes.has(c.scene)||!byId.has(c.term)||!["start","more"].includes(c.level)||c.look.length!==3||c.help.length!==3||!c.guard||!c.talk)throw Error("상황 학습 자료 확인: "+c.id);
 }
 let round=null;
 const lastByMode=new Map();
 const button=(text,cl,fn)=>{const b=e("button",cl,text);b.type="button";b.addEventListener("click",fn);return b;};
 const title=text=>{const h=e("h3","gcat-game-title",text);h.tabIndex=-1;return h;};
 const focusTitle=()=>host.querySelector(".gcat-game-title")?.focus({preventScroll:true});
 function hub(){
   round=null;host.dataset.gameStage="hub";delete host.dataset.gameMode;host.replaceChildren();
   const intro=e("div","gcat-game-hub-intro");
   intro.append(title("모아와 함께 상황을 살펴봐요"),e("p",null,"무엇이 정답인지 시험 보지 않아요. 아이의 모습을 여러 관점에서 보고, 궁금한 점을 하나씩 찾아봐요."));
   const deck=e("div","gcat-game-deck");
   for(const mode of ["observe","support"]){
     const item=MODE[mode],card=e("article","gcat-game-mode-card");
     card.dataset.learningMode=mode;
     card.append(e("span","gcat-game-mode-icon",item.icon+" "+item.tag),e("h4",null,item.title),e("p",null,item.desc));
     const actions=e("div","gcat-game-mode-actions");
     for(const level of ["start","more"]){
       const b=button(LEVEL[level],"gcat-game-start"+(level==="more"?" secondary":""),()=>start(mode,level));
       b.dataset.gameStart=mode;b.dataset.level=level;actions.append(b);
     }
     card.append(actions);deck.append(card);
   }
   host.append(intro,deck,e("p","gcat-game-note","이 게임은 가상의 교육용 사례를 살펴보는 활동이에요. 선택은 검사 결과나 양육 능력을 평가하지 않으며, 특정 아동의 진단·행동 원인·치료 방법을 정하지 않습니다. 선택 내용은 저장·전송하지 않아요."));
 }
 function start(mode,level){
   const key=mode+":"+level;
   const bank=CASES.filter(c=>c.level===level);
   const previous=lastByMode.get(key)||[];
   const fresh=mix(bank.filter(c=>!previous.includes(c.id)));
   const rest=mix(bank.filter(c=>previous.includes(c.id)));
   const items=[...fresh,...rest].slice(0,5);
   lastByMode.set(key,items.map(c=>c.id));
   round={mode,level,items,index:0,selected:null,order:new Map(),notes:[]};
   show();
   focusTitle();
 }
 function show(){
   if(!round)return;
   const c=round.items[round.index],scene=scenes.get(c.scene),mode=MODE[round.mode];
   host.dataset.gameStage=round.selected===null?"question":"reflect";
   host.dataset.gameMode=round.mode;host.replaceChildren();
   const progress=e("div","gcat-game-progress");
   progress.append(e("span",null,mode.title+" · "+(round.level==="start"?"익숙한 장면":"더 생각하기")),
     e("strong",null,(round.index+1)+" / "+round.items.length));host.append(progress);
   const bar=e("div","gcat-game-progress-bar"),fill=e("span");
   fill.style.width=((round.index+1)/round.items.length*100)+"%";bar.append(fill);host.append(bar);
   const card=e("section","gcat-game-question");card.dataset.gameQuestion=c.id;
   card.append(e("span","gcat-game-kicker",round.mode==="observe"?"모아의 관찰 돋보기":"모아의 도움 주머니"),
     e("p","gcat-game-scene",scene.title+" — "+scene.scene),title(round.mode==="observe"?c.ask:mode.intro));
   const hint=e("p","gcat-game-hint",round.mode==="observe"?"모두 살펴볼 가치가 있는 관점이에요. 지금 가장 궁금한 것부터 골라봐요.":"상황에 따라 도움이 달라질 수 있어요. 먼저 생각나는 방법을 골라봐요.");
   card.append(hint);
   const choices=e("div","gcat-game-choices"),values=c[mode.choices];
   if(!round.order.has(c.id))round.order.set(c.id,mix([0,1,2]));
   for(const [position,index] of round.order.get(c.id).entries()){
     const o=values[index];
     const b=button("","gcat-game-choice",()=>choose(index));
     b.dataset.choiceIndex=String(index);b.dataset.gameChoice="true";
     b.setAttribute("aria-pressed",String(round.selected===index));
     b.append(e("span","gcat-game-choice-number",String(position+1)),e("span","gcat-game-choice-text",o[0]));
     if(round.selected!==null){
       b.disabled=true;
       if(round.selected===index)b.classList.add("selected");
     }
     choices.append(b);
   }
   card.append(choices);
   if(round.selected===null){
     const all=button("하나만 고르기 어렵다면 · 모두 살펴보기","gcat-game-skip",()=>choose(-1));
     all.dataset.gameExploreAll="true";card.append(all);
   }else{
     const fb=e("section","gcat-game-feedback");
     fb.dataset.gameFeedback="true";fb.setAttribute("aria-live","polite");
     fb.append(e("strong",null,"이렇게도 볼 수 있어요."),e("p","gcat-game-why",round.mode==="observe"?"각각 다른 정보를 알려줄 수 있는 관점이에요. 어느 하나만으로 이유를 확정하지 않아요.":"방법마다 적절한 상황이 달라요. 아이의 반응을 살피며 조정할 수 있어요."));
     const perspectives=e("div","gcat-game-perspectives");
     for(const index of round.order.get(c.id)){
       const option=values[index],picked=index===round.selected;
       const section=e("div","gcat-game-perspective"+(picked?" selected":""));
       section.append(e("strong",null,(picked?"내가 고른 관점 · ":"")+option[0]),e("p",null,option[1]));
       perspectives.append(section);
     }
     fb.append(perspectives);
     const note=e("div","gcat-game-takeaway");
     note.append(e("strong",null,"이런 점도 살펴봐요"),e("p",null,c.follow),
       e("strong",null,"이렇게 이야기할 수도 있어요"),e("p",null,c.talk),
       e("p","gcat-game-caution",c.guard));
     fb.append(note);
     const more=e("details","gcat-game-reference");
     more.append(e("summary",null,"관련 개념과 참고자료는 궁금할 때만 보기"));
     const detail=e("div","gcat-game-reference-links");
     const ref=button("관련 개념·그림 알아보기 ↗","gcat-game-ref",()=>openTerm(c.term,ref));
     ref.dataset.gameTermId=c.term;detail.append(ref);
     if(scene.source&&scene.source[1]){
       const link=e("a","gcat-game-source",scene.source[0]+" ↗");
       link.href=scene.source[1];link.target="_blank";link.rel="noopener noreferrer";detail.append(link);
     }
     more.append(detail);fb.append(more);card.append(fb);
     const next=button(round.index+1===round.items.length?"돌아보기 →":"다음 장면 →","gcat-game-next",advance);
     next.dataset.gameNext="true";card.append(next);
   }
   host.append(card);
 }
 function choose(index){
   if(!round||round.selected!==null)return;
   const c=round.items[round.index],choice=c[MODE[round.mode].choices];
   round.selected=index;
   round.notes.push({id:c.id,scene:scenes.get(c.scene).title,chosen:index===-1?"여러 관점 모두 살펴보기":choice[index][0]});
   show();
   const fb=host.querySelector(".gcat-game-feedback");if(fb){fb.tabIndex=-1;fb.focus({preventScroll:true});}
 }
 function advance(){
   if(!round||round.selected===null)return;
   round.index++;round.selected=null;
   if(round.index===round.items.length){done();return;}
   show();focusTitle();
 }
 function done(){
   host.dataset.gameStage="done";host.dataset.gameMode=round.mode;host.replaceChildren();
   const box=e("section","gcat-game-done");
   box.append(e("span","gcat-game-kicker","오늘의 관찰 여행 끝"),title(round.items.length+"가지 장면을 살펴봤어요."),
     e("p","gcat-game-score","몇 개 맞혔는지보다, 어떤 점이 더 궁금해졌는지가 중요해요."),
     e("p","gcat-game-remark","내가 골랐던 관점들을 다시 볼까요? 정답이나 평가 점수는 남지 않아요."));
   const recap=e("div","gcat-game-recap");
   for(const entry of round.notes){
     const item=e("div","gcat-game-recap-row");
     item.append(e("strong",null,entry.scene),e("span",null,entry.chosen));recap.append(item);
   }
   box.append(recap);
   const controls=e("div","gcat-game-finish-actions");
   const mode=round.mode,level=round.level;
   const replay=button("다른 장면 살펴보기","gcat-game-next",()=>start(mode,level));
   replay.dataset.gameReplay="true";controls.append(replay);
   controls.append(button("다른 활동 골라보기","gcat-game-secondary",()=>{hub();focusTitle();}));
   box.append(controls);host.append(box);focusTitle();
 }
 hub();
 return {reset:hub,counts:{cases:CASES.length,activities:CASES.length*2}};
}
window.HabomGlossaryGames={mount,counts:{cases:CASES.length,activities:CASES.length*2}};
})();
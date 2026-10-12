/* 알아봄 게임: 개념 회상과 상황 속 관찰 연습. 검사·진단 도구 아님. 답과 기록은 저장·전송하지 않는다. */
(function(){
"use strict";
const TERM_BANK=[
  {id:"working",level:"start",term:"memo-working-memory",q:"숫자를 잠깐 기억한 채 거꾸로 말할 때 특히 관련 있는 능력은?",options:["memo-working-memory","memo-short-term-memory","memo-reading-fluency"],why:"정보를 잠깐 기억하는 데 더해, 그 정보를 바꾸거나 이용하는 능력이 작업기억이에요.",hook:"기억하며 이용하기"},
  {id:"planning",level:"start",term:"memo-planning-organization",q:"숙제 전에 준비물을 챙기고 할 일의 순서를 정하는 것은?",options:["memo-planning-organization","memo-reinforcement","memo-retrieval"],why:"목표와 순서, 준비물을 정리하는 것은 계획과 조직화에 해당해요.",hook:"무엇부터 할지 정하기"},
  {id:"retrieve",level:"start",term:"memo-retrieval",q:"어제 배웠던 단어를 첫 글자 힌트를 듣고 다시 떠올렸어요. 이것은?",options:["memo-retrieval","memo-encoding","memo-consolidation"],why:"저장한 정보를 다시 꺼내는 과정을 인출이라고 해요.",hook:"배운 것을 다시 꺼내기"},
  {id:"aac",level:"start",term:"memo-aac",q:"말 대신 물 그림을 가리켜 '물 주세요'라는 뜻을 전했어요. 어떤 소통 방법과 관련 있을까요?",options:["memo-aac","memo-phonological-awareness","memo-reading-fluency"],why:"AAC는 그림·기호·몸짓 등으로 의사소통을 보완하거나 대체하는 방법이에요.",hook:"말 외에도 뜻 전하기"},
  {id:"analysis",level:"start",term:"memo-task-analysis",q:"손 씻기를 '수도꼭지 틀기 → 손 적시기 → 비누 사용'처럼 작은 순서로 나눠요. 이것은?",options:["memo-task-analysis","memo-modeling","memo-time-delay"],why:"복잡한 활동을 배울 수 있는 작은 단계로 나누는 과제분석이에요.",hook:"큰 일을 작은 단계로"},
  {id:"flex",level:"start",term:"memo-flexibility",q:"놀이 규칙이 바뀌자 새로운 방법을 시도해요. 가장 가까운 개념은?",options:["memo-flexibility","memo-inhibition","memo-short-term-memory"],why:"바뀐 상황에 맞게 생각이나 방법을 조정하는 인지적 유연성과 관련 있어요.",hook:"변화에 맞춰 방법 바꾸기"},
  {id:"abc",level:"more",term:"memo-abc-observation",q:"행동이 일어나기 전, 실제 행동, 그 뒤에 일어난 일을 나누어 기록하는 방법은?",options:["memo-abc-observation","memo-fba","memo-modeling"],why:"ABC 기록은 행동 전후 상황을 나눠 적는 방법으로, 기능적 행동평가 전체와 같지는 않아요.",hook:"행동의 전·중·후 기록"},
  {id:"monitor",level:"more",term:"memo-performance-monitoring",q:"활동하는 도중 빠뜨린 단계가 없는지 확인하고 바로잡는 것은?",options:["memo-performance-monitoring","memo-consolidation","memo-phonological-awareness"],why:"과제를 진행하며 실수나 진행 상태를 확인하는 수행점검이에요.",hook:"하는 중에 바로 확인"},
  {id:"inference",level:"more",term:"memo-inferential-comprehension",q:"동화에 직접 쓰이지 않은 인물의 마음을 앞뒤 내용으로 짐작해요. 가장 가까운 것은?",options:["memo-inferential-comprehension","memo-reading-fluency","memo-visual"],why:"글에 직접 나오지 않은 의미를 단서로 추론하는 능력과 연결돼요.",hook:"숨은 뜻 짐작하기"},
  {id:"pragmatics",level:"more",term:"memo-pragmatics",q:"같은 말이라도 상대와 상황에 따라 다르게 쓰는 언어능력은?",options:["memo-pragmatics","memo-semantics","memo-morphosyntax"],why:"상황과 상대, 목적을 고려한 언어 사용은 화용언어의 중요한 부분이에요.",hook:"상황에 맞게 소통하기"},
  {id:"general",level:"more",term:"memo-generalization",q:"치료실에서 배운 인사를 학교에서도 사용하게 됐어요. 관련 있는 개념은?",options:["memo-generalization","memo-encoding","memo-processing-speed"],why:"배운 기술을 다른 장소나 사람과도 쓰는 것은 일반화의 예시예요.",hook:"배운 것을 다른 곳에서 사용"},
  {id:"udl",level:"more",term:"memo-udl",q:"처음부터 글·그림·음성 등 여러 방식으로 같은 수업 내용을 이해하도록 설계해요. 무엇일까요?",options:["memo-udl","memo-prompting","memo-time-delay"],why:"보편적 학습설계는 학습 장벽을 줄이도록 참여·이해·표현에 선택지를 마련해요.",hook:"처음부터 여러 배움의 길"}
];
const SITUATION_BANK=[
  {id:"noise",level:"start",scene:"distracted",q:"소리가 나면 하던 일을 멈추는 장면이에요. 무엇을 먼저 살펴볼까요?",choices:["조용한 환경과 소음 있는 환경에서 참여 모습이 다른지 비교해요.","한 번 보고 주의력이 낮다고 결론 내려요.","소리 날 때마다 더 강하게 주의를 줘요."],why:"환경이 달라졌을 때 반응이 어떻게 달라지는지 살피면 도움이 돼요. 한 장면만으로 원인을 알 수는 없어요.",term:"memo-attention"},
  {id:"instructions",level:"start",scene:"instructions",q:"여러 가지 지시 중 하나를 잊었어요. 어떻게 시작하면 좋을까요?",choices:["지시를 짧게 나누어 말하고 이해한 정도를 살펴봐요.","많은 지시를 한꺼번에 외우도록 계속 반복해요.","이 모습만으로 작업기억이 약하다고 결론 내려요."],why:"지시 길이, 언어 이해, 소음 등 여러 요인이 영향을 줄 수 있어요. 간단하게 바꾸고 비교해 볼 수 있어요.",term:"memo-working-memory"},
  {id:"change",level:"start",scene:"switch",q:"놀이 규칙이 바뀌자 당황했어요. 도움이 될 수 있는 방법은?",choices:["바뀌는 내용을 먼저 보여주고 변화한 부분을 한 가지씩 알려줘요.","익숙한 방법은 무조건 못 쓰게 해요.","하기 싫어서 그런 것이라고 단정해요."],why:"변화를 예고하고 필요한 도움을 조절하면 적응하는 데 도움이 될 수 있어요.",term:"memo-flexibility"},
  {id:"story",level:"start",scene:"story",q:"이야기의 순서가 자꾸 뒤섞여요. 어떤 활동이 도움이 될까요?",choices:["그림 세 장으로 처음·중간·끝을 나누어 배열해 봐요.","이야기하기는 건너뛰고 단어만 외워요.","단어를 잘 아니까 이야기하기도 충분하다고 봐요."],why:"이야기 순서를 그림으로 나타내면 사건을 연결해 표현하는 연습이 될 수 있어요.",term:"memo-narrative-discourse"},
  {id:"asking",level:"start",scene:"asking",q:"도움을 요청할 때 어른 손을 끌어당겨요. 무엇이 더 적절할까요?",choices:["손짓도 표현으로 받아들이고 말·그림 등 다른 요청 방법도 알려줘요.","말로 요청할 때까지 반응하지 않아요.","손을 끌면 소통하려는 뜻이 아니라고 봐요."],why:"말 외의 행동에도 소통 의도가 담길 수 있어요. 쓸 수 있는 방법을 다양하게 지원해요.",term:"memo-aac"},
  {id:"reading",level:"start",scene:"reading",q:"글을 소리 내어 읽지만 뜻을 설명하기 어려워해요. 먼저 어떻게 볼까요?",choices:["글자 읽기와 내용 이해를 나누어 살펴봐요.","소리 내어 읽으니 내용도 이해했다고 봐요.","읽는 속도만 높이면 뜻도 이해한다고 판단해요."],why:"글자를 읽는 정확도와 내용을 이해하는 정도는 관련되지만 같은 능력이 아니에요.",term:"memo-inferential-comprehension"},
  {id:"refusal",level:"more",scene:"refusal",q:"쓰기 활동 전에 자리를 벗어나는 일이 반복돼요. 첫 관찰로 적절한 것은?",choices:["직전 요구와 행동, 이후 상황을 여러 번 사실대로 기록해요.","한 번 보고 관심받으려는 행동이라고 판단해요.","자리를 벗어난 이유를 질문 하나로 확정해요."],why:"반복 ABC 관찰은 행동과 환경의 관계를 살피는 데 도움이 돼요. 원인을 확정하는 검사는 아니에요.",term:"memo-abc-observation"},
  {id:"context",level:"more",scene:"context",q:"말의 숨은 뜻을 놓칠 때 도움이 되는 활동은?",choices:["같은 표현을 서로 다른 상황에 넣어 의미를 비교해 봐요.","모든 말은 글자 그대로 해석해야 한다고 알려줘요.","상황 이해가 어려우니 모든 단어를 모른다고 생각해요."],why:"화용언어에는 말 자체뿐 아니라 상대와 맥락을 고려하는 과정도 포함돼요.",term:"memo-pragmatics"},
  {id:"planning",level:"more",scene:"planning",q:"준비물은 꺼냈지만 시작하지 못해요. 무엇을 먼저 살펴볼까요?",choices:["시작하기·순서 정하기·마무리 중 어디에서 멈추는지 봐요.","시작을 못 했으니 의지가 없는 것이라고 봐요.","활동을 전부 한꺼번에 지시해요."],why:"어느 단계에서 막히는지 살펴야 필요한 도움을 구체화하기 쉬워요.",term:"memo-planning-organization"},
  {id:"express",level:"more",scene:"express",q:"아이에게 물 그림이 중요한 표현 방법일 때 어떻게 할까요?",choices:["그림 요청도 의사소통으로 인정하고 필요한 소통 방법을 함께 지원해요.","그림을 쓰면 말이 줄 수 있으니 바로 없애요.","그림을 가리켜도 의미가 없는 행동이라고 봐요."],why:"AAC는 표현 가능성을 넓히기 위한 방법이에요. 말 사용을 방해한다고 단정할 수 없어요.",term:"memo-aac"},
  {id:"memory",level:"more",scene:"recall",q:"첫 글자 힌트를 들으면 단어를 떠올려요. 어떻게 이해하는 게 좋을까요?",choices:["힌트가 있을 때와 없을 때의 차이를 살펴봐요.","못 떠올리면 배운 적이 없는 것으로 봐요.","기억력 부족이라고 바로 진단해요."],why:"기억을 형성하는 과정과 이미 기억한 것을 꺼내는 과정이 다를 수 있어요.",term:"memo-retrieval"},
  {id:"access",level:"more",scene:"access",q:"말로 설명할 때보다 그림을 보면 순서를 따라가기 쉬워해요. 수업은 어떻게 구성할까요?",choices:["같은 목표를 글·그림·시범 등으로 제시할 수 있게 해요.","같은 방식으로만 배워야 공평하다고 봐요.","그림이 필요하니 다른 수업도 어려울 거라고 단정해요."],why:"다양한 방식으로 정보를 접하고 표현하게 하는 설계는 학습 접근성을 높이는 데 도움이 될 수 있어요.",term:"memo-udl"}
];
function el(tag,cls,value){
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(value!==undefined)node.textContent=value;
  return node;
}
function shuffle(a){
  const b=a.slice();
  for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}
  return b;
}
function mount({host,byId,situations,openTerm}){
  if(!host)return null;
  const scenarioById=new Map(situations.map(s=>[s.id,s]));
  for(const q of TERM_BANK)if(![q.term,...q.options].every(id=>byId.has(id))||!q.options.includes(q.term)||new Set(q.options).size!==3)throw Error("용어 게임 데이터: "+q.id);
  for(const q of SITUATION_BANK)if(!scenarioById.has(q.scene)||!byId.has(q.term)||q.choices.length!==3)throw Error("상황 게임 데이터: "+q.id);
  let round=null;
  function btn(text,cls,click){const e=el("button",cls,text);e.type="button";e.addEventListener("click",click);return e;}
  function title(text){const e=el("h3","gcat-game-title",text);e.tabIndex=-1;return e;}
  function focusTitle(){host.querySelector(".gcat-game-title")?.focus({preventScroll:true});}
  function hub(){
    round=null;host.dataset.gameStage="hub";host.replaceChildren();
    const intro=el("div","gcat-game-hub-intro");
    intro.append(title("어떤 게임을 해볼까요?"),el("p",null,"각 5문제. 제한시간도 탈락도 없어요. 헷갈리면 설명을 보고 다시 익혀봐요."));
    host.append(intro);
    const deck=el("div","gcat-game-deck");
    for(const mode of ["terms","situations"]){
      const card=el("article","gcat-game-mode-card");
      card.append(el("span","gcat-game-mode-icon",mode==="terms"?"가나다":"상황"),el("h4",null,mode==="terms"?"용어 연결하기":"상황에서 선택하기"),
        el("p",null,mode==="terms"?"짧은 설명을 보고 알맞은 용어 고르기":"생활 속 장면을 보고 먼저 살펴볼 점 고르기"));
      const actions=el("div","gcat-game-mode-actions");
      for(const level of ["start","more"]){
        const b=btn(level==="start"?"기초 5문제 시작":"응용 5문제 시작","gcat-game-start"+(level==="more"?" secondary":""),()=>start(mode,level));
        b.dataset.gameStart=mode;b.dataset.level=level;actions.append(b);
      }
      card.append(actions);deck.append(card);
    }
    host.append(deck,el("p","gcat-game-note","교육용 연습 문제예요. 어떤 행동의 원인이나 진단을 결정하지 않으며, 답과 결과를 저장하지 않아요."));
  }
  function start(mode,level,review){
    const bank=mode==="terms"?TERM_BANK:SITUATION_BANK;
    const items=Array.isArray(review)?shuffle(review):shuffle(bank.filter(q=>q.level===level)).slice(0,5);
    if(!items.length){hub();return;}
    round={mode,level,items,index:0,selected:null,hits:0,missed:[],review:!!review};
    question();focusTitle();
  }
  function question(){
    host.dataset.gameStage="question";host.replaceChildren();
    const q=round.items[round.index],isTerms=round.mode==="terms",chosen=round.selected;
    const progress=el("div","gcat-game-progress");
    progress.append(el("span",null,(isTerms?"용어 연결하기":"상황에서 선택하기")+" · "+(round.level==="start"?"기초":"응용")+(round.review?" · 다시 익히기":"")),
      el("strong",null,(round.index+1)+" / "+round.items.length));
    host.append(progress);
    const bar=el("div","gcat-game-progress-bar"),fill=el("span");fill.style.width=((round.index+1)*100/round.items.length)+"%";bar.append(fill);host.append(bar);
    const card=el("section","gcat-game-question");card.dataset.gameQuestion=q.id;
    card.append(el("span","gcat-game-kicker",isTerms?"뜻을 읽고 알맞은 말을 골라요":"이럴 때 무엇을 먼저 살펴볼까요?"));
    if(!isTerms){const s=scenarioById.get(q.scene);card.append(el("p","gcat-game-scene",s.title+" — "+s.scene));}
    card.append(title(q.q));
    const choices=el("div","gcat-game-choices");
    const shuffled=shuffle((isTerms?q.options:q.choices).map((x,i)=>({x,i})));
    for(const [n,o] of shuffled.entries()){
      const right=isTerms?o.x===q.term:o.i===0;
      const label=isTerms?byId.get(o.x).title:o.x;
      const b=btn("","gcat-game-choice",()=>choose(o.i));
      b.dataset.gameAnswer=String(right);b.dataset.choiceIndex=String(o.i);
      b.append(el("span","gcat-game-choice-number",String(n+1)),el("span","gcat-game-choice-text",label));
      if(chosen!==null){
        b.disabled=true;
        if(right)b.classList.add("correct");
        else if(chosen===o.i)b.classList.add("missed");
      }
      choices.append(b);
    }
    card.append(choices);
    if(chosen===null){
      const skip=btn("모르겠어요 · 설명 보기","gcat-game-skip",()=>choose(-1));skip.dataset.gameSkip="true";card.append(skip);
    }else{
      const right=isTerms?q.options[chosen]===q.term:chosen===0;
      const info=el("div","gcat-game-feedback");info.dataset.gameFeedback="true";info.setAttribute("role","status");info.setAttribute("aria-live","polite");
      info.append(el("strong",null,right?"맞아요!":"괜찮아요. 설명을 보고 기억해봐요."),
        el("p","gcat-game-answer","기억할 답: "+(isTerms?byId.get(q.term).title:q.choices[0])),
        el("p","gcat-game-why",q.why));
      if(isTerms)info.append(el("p","gcat-game-hook","한 줄 기억: "+q.hook));
      const link=btn("원래 용어 설명·그림·근거 보기 ↗","gcat-game-ref",()=>openTerm(q.term,link));
      link.dataset.gameTermId=q.term;info.append(link);card.append(info);
      const next=btn(round.index+1===round.items.length?"결과 보기 →":"다음 문제 →","gcat-game-next",advance);
      next.dataset.gameNext="true";card.append(next);
    }
    host.append(card);
  }
  function choose(which){
    if(!round||round.selected!==null)return;
    const q=round.items[round.index];
    const right=round.mode==="terms"?q.options[which]===q.term:which===0;
    round.selected=which;
    if(right)round.hits++;else round.missed.push(q);
    question();
    const fb=host.querySelector(".gcat-game-feedback");if(fb){fb.tabIndex=-1;fb.focus({preventScroll:true});}
  }
  function advance(){
    if(!round||round.selected===null)return;
    round.index++;round.selected=null;
    if(round.index<round.items.length){question();focusTitle();}else done();
  }
  function done(){
    host.dataset.gameStage="done";host.replaceChildren();
    const card=el("section","gcat-game-done");
    card.append(el("span","gcat-game-kicker","이번 연습 끝"),title("하나씩 알아봤어요!"),
      el("p","gcat-game-score",round.items.length+"문제 중 "+round.hits+"개를 바로 골랐어요."),
      el("p","gcat-game-remark",round.missed.length?"헷갈린 문제는 다시 살펴봐도 좋아요.":"다음에도 뜻을 다시 떠올려 보면 좋아요."));
    const actions=el("div","gcat-game-finish-actions");
    if(round.missed.length){
      const missed=round.missed.slice();
      const retry=btn("헷갈린 "+missed.length+"문제 다시 익히기","gcat-game-next",()=>start(round.mode,round.level,missed));
      retry.dataset.gameReview="true";actions.append(retry);
    }
    const mode=round.mode,level=round.level;
    const replay=btn("다른 5문제 더","gcat-game-secondary",()=>start(mode,level));
    replay.dataset.gameReplay="true";actions.append(replay);
    actions.append(btn("다른 게임 골라보기","gcat-game-secondary",()=>{hub();focusTitle();}));
    card.append(actions);host.append(card);focusTitle();
  }
  hub();
  return {reset:hub};
}
window.HabomGlossaryGames={mount,counts:{terms:TERM_BANK.length,situations:SITUATION_BANK.length}};
})();
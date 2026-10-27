(() => {
"use strict";
// First conversation, not a diagnostic instrument: answers live in memory only.
// No cookies, analytics, persistence, fetch calls, or background transmission.
const $=id=>document.getElementById(id);
const stages=["spark","topic","moment","pace","wish"];
const context={
 school:{
  prompt:"학교에서 가장 신경 쓰이는 순간이 있다면?",
  hint:"공부 이야기뿐 아니라, 학교에서 보내는 하루를 생각해도 돼.",
  choices:[["arrival","학교에 가거나 들어갈 때","☀"],["lesson","수업·과제를 시작할 때","▤"],["people","학교에서 누군가와 있을 때","♧"],["expect","성적이나 기대가 신경 쓰일 때","✧"]],
  reflect:{arrival:"하루가 시작되기 전부터 여러 생각이 들 수도 있겠네. 구체적인 이유는 나중에 말해도 괜찮아.",lesson:"일을 시작하는 순간이 유독 부담스러울 수도 있지. 어떤 도움이 편할지 함께 찾아볼 수 있어.",people:"학교에서 누군가와 있을 때가 떠오르는구나. 사람 이름은 말하지 않아도 돼.",expect:"기대나 평가가 마음에 걸릴 수도 있겠네. 점수보다 네가 경험하는 일이 더 궁금해."},
  follow:{
   arrival:{question:"학교에 가거나 들어갈 때, 무엇이 가장 신경 쓰여?",choices:["집에서 나서기가 부담돼","교실에 들어가는 순간이 어려워","학교에서 누구를 만날지 걱정돼"]},
   lesson:{question:"수업이나 과제를 시작할 때, 어떤 점이 어려워?",choices:["설명이 잘 이해되지 않아","해야 할 일이 너무 많게 느껴져","틀리거나 실수할까 걱정돼"]},
   people:{question:"학교에서 사람을 만날 때, 어떤 점이 불편해?",choices:["먼저 말을 걸기 어려워","상대가 나를 어떻게 볼지 걱정돼","함께 있어도 편하지 않을 때가 있어"]},
   expect:{question:"성적이나 기대가 신경 쓰일 때, 어떤 생각이 들어?",choices:["잘해야 한다는 부담이 있어","다른 사람과 비교하게 돼","실수하거나 혼날까 걱정돼"]}
  }
 },
 people:{
  prompt:"사람들 사이에서 어떤 순간이 떠올라?",
  hint:"친구, 가족, 온라인에서 만나는 사람 모두 괜찮아.",
  choices:[["begin","먼저 말을 꺼내야 할 때","♧"],["reply","누가 나한테 질문할 때","❞"],["alone","같이 있어도 혼자인 느낌일 때","☾"],["trouble","오해가 생기거나 부딪힐 때","↗"]],
  reflect:{begin:"말을 시작하는 일이 쉽지 않을 수 있겠네. 말없이 함께 활동하면서 시작해도 돼.",reply:"누가 물어볼 때 바로 답하는 게 부담스러울 수도 있겠어. 기다려 주는 방식도 있어.",alone:"함께 있는데도 혼자 같다고 느끼는 순간이 있구나. 그 느낌을 이해하는 데 서두르지 않을게.",trouble:"사람 사이에서 일이 꼬이는 순간이 떠오르는구나. 누가 옳고 그른지 여기서 정하지 않아도 돼."},
  follow:{
   begin:{question:"먼저 말을 꺼내야 할 때, 어떤 점이 어려워?",choices:["어떻게 시작할지 모르겠어","상대 반응이 걱정돼","말을 꺼내기까지 시간이 필요해"]},
   reply:{question:"질문을 받으면 어떤 순간이 어려워?",choices:["바로 대답해야 할 것 같아","무슨 말을 해야 할지 모르겠어","내 생각을 말로 정리하기 어려워"]},
   alone:{question:"사람들과 함께 있어도 혼자 같을 때, 어떤 느낌이 가까워?",choices:["대화에 끼기 어려워","내 이야기를 이해받지 못한 것 같아","그냥 따로 있고 싶을 때가 있어"]},
   trouble:{question:"오해나 갈등이 생길 때, 어떤 점이 어려워?",choices:["내 뜻을 설명하기 어려워","상대가 화낼까 걱정돼","그 일을 계속 생각하게 돼"]}
  }
 },
 mood:{
  prompt:"내 마음이나 몸이 힘들게 느껴지는 때는?",
  hint:"왜 그런지 정확히 설명하지 못해도 괜찮아.",
  choices:[["wake","아침에 일어날 때","☀"],["start","무언가 하려고 할 때","↗"],["night","저녁이나 잠들기 전","☾"],["unexpected","갑자기 이유를 모르겠을 때","✧"]],
  reflect:{wake:"아침에 시작하는 일이 쉽지 않은 날도 있지. 어떻게 느껴지는지 차차 이야기해도 돼.",start:"해야 할 일이 앞에 놓일 때 몸과 마음이 같이 무거워질 수 있어.",night:"하루가 끝날 때 여러 생각이 떠오를 수 있겠네. 자세한 이야기는 네 속도로 해도 돼.",unexpected:"이유가 바로 떠오르지 않아도 이상한 건 아니야. 지금은 그 사실만 알아도 돼."},
  follow:{
   wake:{question:"아침에 일어날 때, 어떤 점이 가장 어려워?",choices:["아직 잠이 덜 깬 것 같아","하루를 시작할 힘이 부족해","오늘 할 일이 생각나서 부담돼"]},
   start:{question:"무언가 하려고 할 때, 어떤 점이 어려워?",choices:["시작할 기운이 잘 안 나","어디서부터 해야 할지 막막해","잘할 수 있을지 걱정돼"]},
   night:{question:"저녁이나 잠들기 전에는 무엇이 신경 쓰여?",choices:["낮에 있었던 일이 생각나","내일 할 일이 걱정돼","쉽게 편안해지지 않아"]},
   unexpected:{question:"갑자기 기분이 달라질 때, 어떤 점이 어려워?",choices:["어떤 기분인지 잘 모르겠어","왜 그런지 이유가 안 떠올라","다른 사람에게 설명하기 어려워"]}
  }
 },
 day:{
  prompt:"집이나 일상에서는 어떤 순간이 좀 어렵게 느껴져?",
  hint:"누구에 관한 일인지는 말하지 않아도 돼.",
  choices:[["talk","집에서 누군가와 이야기할 때","❞"],["plan","해야 할 일을 시작할 때","▤"],["change","예상했던 것과 달라질 때","↗"],["alone","혼자 해결해야 할 때","☾"]],
  reflect:{talk:"집에서 이야기하는 방식이 마음에 걸릴 수도 있겠네. 여기서 누구의 잘못인지 정하진 않을게.",plan:"하루의 일을 시작하거나 챙기는 게 부담스러울 때가 있지.",change:"예상 밖의 일이 생기면 편하지 않을 수 있어. 어떤 점이 필요한지 같이 살펴볼 수 있겠네.",alone:"혼자 감당해야 하는 순간이 떠오르는구나. 도움을 청할 방법도 천천히 생각해볼 수 있어."},
  follow:{
   talk:{question:"집에서 누군가와 이야기할 때, 어떤 점이 어려워?",choices:["내 말을 끝까지 하기 어려워","상대가 어떻게 반응할지 걱정돼","말을 어디서부터 해야 할지 모르겠어"]},
   plan:{question:"해야 할 일을 시작할 때, 어떤 점이 가장 어려워?",choices:["어디서부터 해야 할지 모르겠어","시작하려고 해도 자꾸 망설여져","혼자 하기에는 부담스러워"]},
   change:{question:"예상과 다르게 일이 흘러가면, 어떤 점이 불편해?",choices:["그다음에 뭘 해야 할지 모르겠어","계획을 다시 세우기 어려워","마음이 편해지는 데 시간이 걸려"]},
   alone:{question:"혼자 해결해야 할 때, 어떤 점이 어려워?",choices:["어디서부터 해야 할지 모르겠어","물어보거나 확인할 사람이 필요해","잘못할까 봐 걱정돼"]}
  }
 }
};
const data={
 spark:{
  kicker:"가벼운 이야기부터",
  question:"요즘 조금 편하거나 재미있는 순간은?",
  hint:"대단한 취미가 아니어도 좋아. 그냥 떠오르는 걸 골라줘.",
  choices:[["game","게임·영상에 빠질 때","✦"],["create","무언가 만들거나 해볼 때","✎"],["rest","혼자 조용히 쉬는 시간","☾"],["friend","좋아하는 사람과 있을 때","♧"]],
  reflect:{game:"그 시간에는 네가 좋아하는 무언가가 있나 봐. 지금 자세히 설명하지 않아도 돼.",create:"무언가 직접 해보는 게 좋은 편이구나. 잘해야만 재미있는 건 아니지.",rest:"혼자 쉬는 시간이 편하구나. 네가 편한 시간은 소중해.",friend:"좋아하는 사람과 함께 있는 시간이 떠오르는구나. 누구인지는 알려주지 않아도 돼."},
  follow:{
   game:{question:"게임이나 영상이 좋은 건 어떤 점 때문이야?",choices:["내가 직접 선택할 수 있어서","좋아하는 장면이나 내용을 볼 수 있어서","잠깐 다른 생각을 할 수 있어서"]},
   create:{question:"무언가 만들어볼 때, 어떤 순간이 가장 좋아?",choices:["내 아이디어대로 해볼 때","조금씩 완성되어 갈 때","새로운 걸 시도해 볼 때"]},
   rest:{question:"혼자 쉴 때, 어떤 점이 가장 편해?",choices:["아무것도 하지 않아도 돼서","누구에게 대답하지 않아도 돼서","좋아하는 걸 내 속도로 할 수 있어서"]},
   friend:{question:"좋아하는 사람과 있을 때, 무엇이 좋아?",choices:["내 이야기를 편하게 할 수 있어서","굳이 말을 하지 않아도 돼서","함께 웃거나 활동할 수 있어서"]}
  }
 },
 topic:{
  kicker:"오늘 이야기의 방향",
  question:"요즘 신경 쓰이거나 더 이야기해 보고 싶은 건?",
  hint:"어려운 일이 없어도 괜찮아. 중요한 걸 골라야 하는 것도 아니야.",
  choices:[["school","학교·공부","▤"],["people","친구·사람 관계","♧"],["mood","기분·에너지","☾"],["day","집·일상생활","⌂"],["none","특별히 떠오르는 건 없어","○"]],
  reflect:{school:"학교와 관련된 일이구나. 공부만이 아니라 학교에서의 하루 전체를 생각해도 돼.",people:"사람 사이의 이야기가 떠올랐구나. 누군가의 이름이나 자세한 사건은 적지 않아도 돼.",mood:"기분이나 에너지가 신경 쓰이는구나. 이유를 바로 찾을 필요는 없어.",day:"집이나 하루를 보내는 이야기가 떠올랐구나. 사적인 일을 자세히 적지 않아도 괜찮아.",none:"알겠어. 어려운 일이 꼭 있어야 여기서 이야기할 수 있는 건 아니니까."},
  follow:null
 },
 pace:{
  kicker:"너에게 맞는 방식",
  question:"처음 보는 사람과 이야기할 때, 어떤 방식이 편할까?",
  hint:"상담도 네가 편한 방식으로 시작하면 좋겠어.",
  choices:[["wait","생각할 시간을 충분히 주기","☾"],["write","고르거나 글로 이야기하기","✎"],["play","같이 무언가 하면서 시작하기","✦"],["talk","그냥 말로 이야기하기","❞"]],
  reflect:{wait:"바로 답하지 않아도 되는 시간이 필요하구나. 상담자에게도 알려줄 수 있어.",write:"선택지나 글로 전하는 방법이 더 편할 수 있겠네. 꼭 말로만 표현할 필요는 없어.",play:"서로 마주 앉아 질문만 하기보다 무언가 함께 해보는 게 좋겠어.",talk:"말로 나누는 게 편하구나. 꼭 정리된 문장으로 말하지 않아도 돼."},
  follow:{
   wait:{question:"생각할 시간을 줄 때, 어떻게 해주면 좋을까?",choices:["질문한 뒤 천천히 기다려주기","대답을 재촉하지 않기","말 대신 적을 시간 주기"]},
   write:{question:"선택지나 글로 답할 때, 어떤 게 더 편할까?",choices:["짧은 보기 중에서 고르기","내 말로 한두 문장 적기","그림이나 사진을 가리키기"]},
   play:{question:"함께 활동하며 시작한다면, 무엇이 좋을까?",choices:["간단한 게임부터 하기","무언가 같이 만들어보기","나란히 앉아 각자 해보기"]},
   talk:{question:"말로 이야기할 때, 어떻게 물어봐 주면 좋을까?",choices:["짧게 하나씩 물어보기","예시를 먼저 들어주기","내 말을 끝까지 들어주기"]}
  }
 },
 wish:{
  kicker:"다음에 이어갈 이야기",
  question:"다음 만남에서 가장 먼저 해보고 싶은 건?",
  hint:"지금 정하지 않아도 돼. 오늘 고른 걸 나중에 바꿀 수도 있어.",
  choices:[["interest","내가 좋아하는 것부터 이야기","✦"],["scene","어려웠던 순간 하나만 살펴보기","☾"],["together","게임이나 활동을 함께 해보기","♧"],["unsure","지금은 정하지 않고 생각해 보기","○"]],
  reflect:{interest:"좋아하는 것부터 시작하면 더 편할 수 있겠네. 무엇을 좋아하는지 네가 직접 보여줘도 돼.",scene:"한 장면만 천천히 알아보자는 거구나. 거기서부터 시작하면 되겠어.",together:"말을 많이 하지 않아도 함께 활동하며 알아갈 수 있겠네.",unsure:"좋아. 지금 결정하지 않아도 다음에 다시 고를 수 있어."},
  follow:null
 }
};
const prompts={start:"안녕. 나는 모아야. 잘 대답하려고 애쓰지 않아도 돼. 네가 편한 순간부터 이야기해볼까?",
 spark:"첫 번째는 가벼운 질문이었어. 이제 지금의 너에게 더 중요한 이야기가 있는지 궁금해.",
 topic:"조금 더 구체적으로 떠오르는 순간이 있을까? 없어도 괜찮아.",
 moment:"다음엔 내가 어떻게 물어보면 편할지 생각해볼까?",
 pace:"마지막으로 다음 만남을 어떻게 시작하면 좋을지 물어볼게.",
 wish:"이제 오늘 고른 이야기를 같이 볼까?"};
const records=Object.fromEntries(stages.map(id=>[id,{choice:null,detail:null,note:""}]));
 let position=0,started=false,complete=false;
const isBranch=()=>Boolean(context[records.topic.choice]);
const stageAt=i=>stages[i];
const config=id=>id==="moment"?(context[records.topic.choice]||{prompt:"조금 더 말해보고 싶은 순간이 있을까?",hint:"구체적인 게 떠오르지 않아도 괜찮아.",choices:[["none","아직 떠오르지 않아","○"]],reflect:{none:"지금 정확히 떠올릴 필요는 없어."},follow:null}):data[id];
const choiceLabel=(id,key)=>{
 if(key==="unknown")return"지금은 잘 모르겠어";
 if(key==="pass")return"이 질문은 넘어갔어";
 if(key==="own")return"내 말로 이야기했어";
 return config(id).choices.find(v=>v[0]===key)?.[1]||"";
};
function append(tag,cls,text,parent){
 const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;parent.append(el);return el;
}
function revoke(){
 $("copy").disabled=true;$("print").disabled=true;
 $("copy-fallback").hidden=true;$("full-text-fallback").value="";
}
function clearFrom(start){
 for(let i=start;i<stages.length;i++){const a=records[stages[i]];a.choice=null;a.detail=null;a.note="";}
 revoke();
}
function refreshThread(){
 const area=$("thread");area.replaceChildren();
 append("div","thread-date","모아와 나 · 처음 나누는 이야기",area);
 const hello=append("div","chat-row moa",undefined,area);
 append("img","chat-avatar",undefined,hello).src="../../assets/moa-hello-wave-20261012.webp";
 append("p","chat-bubble",prompts.start,hello);
 for(let i=0;i<position;i++){
  const id=stageAt(i),a=records[id],cfg=config(id);
  if(!a.choice)continue;
  if(a.choice!=="pass"){
   const mine=append("div","chat-row self",undefined,area);
   const label=choiceLabel(id,a.choice);
   append("p","chat-bubble",label+(a.detail?" · "+a.detail:""),mine);
  }
  const reply=append("div","chat-row moa",undefined,area);
  append("img","chat-avatar",undefined,reply).src="../../assets/moa-hello-wave-20261012.webp";
  let reflection=a.choice==="pass"?"알겠어. 이 질문은 건너뛸게.":a.choice==="unknown"?"지금 모르겠어도 괜찮아. 바로 정하지 않아도 돼.":a.choice==="own"?"네 말로 전해줬구나. 내용은 내가 분석하지 않고 그대로 남겨둘게.":cfg.reflect[a.choice]||"말해줘서 고마워. 정답은 없어.";
  append("p","chat-bubble",reflection,reply);
 }
}
function card(c,selected){
 const b=document.createElement("button");b.type="button";b.className="choice"+(selected?" active":"");b.dataset.choice=c[0];b.setAttribute("aria-pressed",String(selected));
 append("span","choice-symbol",c[2],b);append("span","choice-label",c[1],b);
 b.addEventListener("click",()=>choose(c[0]));
 return b;
}
function render(){
 if(!started||complete)return;
 const id=stageAt(position),cfg=config(id),a=records[id];
 $("intro").hidden=true;$("result").hidden=true;$("conversation").hidden=false;
 refreshThread();
 $("question-kicker").textContent=(data[id]?.kicker||"조금 더 알아가기")+" · 모아";
 $("question-title").textContent=cfg.question||cfg.prompt;
 $("question-hint").textContent=cfg.hint;
 const grid=$("choice-grid");grid.replaceChildren();
 cfg.choices.forEach(c=>grid.append(card(c,a.choice===c[0])));
 $("unknown").classList.toggle("active",a.choice==="unknown");
 $("pass").classList.toggle("active",a.choice==="pass");
 const follow=$("more-talk"),list=$("detail-choices");list.replaceChildren();
 const followup=cfg.follow?.[a.choice];
 const show=Boolean(followup?.choices?.length);
 follow.hidden=!show;
 if(show){
  $("more-label").textContent=followup.question;
  $("more-help").textContent="추가 질문이야. 하나만 골라도 되고, 그냥 이어가도 돼.";
  followup.choices.forEach(v=>{
   const b=append("button","detail-chip"+(a.detail===v?" active":""),v,list);
   b.type="button";b.setAttribute("aria-pressed",String(a.detail===v));
   b.addEventListener("click",()=>{revoke();a.detail=a.detail===v?null:v;render();});
  });
 }
 $("own-panel").hidden=true;$("own-toggle").setAttribute("aria-expanded","false");
 $("own-input").value=a.note;
 $("own-toggle").hidden=a.choice==="pass"||a.choice==="unknown";
 $("back").disabled=position===0;
 $("next").disabled=!a.choice;
 $("next").innerHTML=position===stages.length-1?'우리 이야기 돌아보기 <span aria-hidden="true">→</span>':'이어가기 <span aria-hidden="true">→</span>';
 $("panel-tip").textContent=a.choice==="pass"?"좋아, 넘어가자.":a.choice==="unknown"?"모르겠다는 대답도 괜찮아.":a.choice?"선택한 답은 언제든 바꿀 수 있어.":"고르거나 건너뛰어도 돼";
 // Keep the conversation readable without auto-focusing a button or stealing keyboard focus.
 if(document.activeElement!==$("question-title"))$("question-panel").scrollIntoView({behavior:"instant",block:"start"});
}
function choose(key){
 const id=stageAt(position),a=records[id];
 if(a.choice!==key){clearFrom(position+1);a.choice=key;a.detail=null;if(key!=="own")a.note="";revoke();}
 render();
}
function moveForward(){
 if(!started||complete)return;
 const id=stageAt(position);
 if(!records[id].choice)return;
 if(position===stages.length-1){finish();return;}
 if(id==="topic"&&!isBranch()){position=3;}
 else position++;
 render();
}
function moveBack(){
 if(position===0)return;
 if(position===3&&!isBranch())position=1;else position--;
 render();
}
function saveOwn(){
 const value=$("own-input").value.trim().slice(0,160);
 if(!value){$("panel-tip").textContent="남기고 싶은 말이 있을 때만 적어도 돼.";return;}
 const id=stageAt(position),a=records[id];
 revoke();clearFrom(position+1);
 if(!a.choice||a.choice==="pass"||a.choice==="unknown"){a.choice="own";a.detail=null;}a.note=value;
 render();$("panel-tip").textContent="네 말 그대로 남겼어. 상담자에게 자동 전달되진 않아.";
}

const storyLabels={spark:"내가 편해지는 순간",topic:"요즘 내 마음에 걸리는 것",moment:"특히 떠오른 순간",pace:"내가 편한 대화 방법",wish:"다음에 해보고 싶은 것"};
const dateText=()=>new Intl.DateTimeFormat("ko-KR",{year:"numeric",month:"long",day:"numeric"}).format(new Date());
const hasAnswer=a=>Boolean(a?.choice&&a.choice!=="pass"&&a.choice!=="unknown");
function chosen(id){
 const a=records[id];return a.choice==="pass"?"이 이야기는 넘어가기로 했어":a.choice===null?"이번에는 이야기하지 않았어":choiceLabel(id,a.choice);
}
function letterIntro(){
 const intro=["오늘 모아와 처음 이야기를 나눴어."];
 if(hasAnswer(records.spark))intro.push("네가 편한 순간으로 고른 건 ‘"+chosen("spark")+"’이었어.");
 if(hasAnswer(records.topic)&&records.topic.choice!=="none")intro.push("그리고 ‘"+chosen("topic")+"’에 관한 이야기도 꺼내봤어.");
 else if(records.topic.choice==="none")intro.push("특별히 떠오르는 고민이 없다는 대답도 그대로 남겨뒀어.");
 if(records.spark.choice===null&&records.topic.choice===null)intro.push("오늘은 잠깐 만나본 것만으로도 괜찮아.");
 intro.push("오늘 네가 직접 고른 말들을 아래에 모았어. 이 답이 너의 전부를 설명하는 건 아니야.");
 return intro.join(" ");
}
function letterNext(){
 const wish=records.wish,pace=records.pace;
 const sentences=[];
 if(hasAnswer(wish)&&wish.choice!=="unsure")sentences.push("다음에는 ‘"+chosen("wish")+"’부터 해봐도 좋겠어.");
 else sentences.push("다음에 꼭 무엇을 할지 지금 정하지 않아도 돼.");
 if(hasAnswer(pace))sentences.push("‘"+chosen("pace")+"’ 방식으로 시작하는 것도 기억해둘게.");
 sentences.push("오늘과 생각이 달라지면 그때 다시 이야기해도 괜찮아.");
 return sentences.join(" ");
}
const reflectionFeedback={response:"",note:""};
function feedbackText(){
 return [reflectionFeedback.response,reflectionFeedback.note].filter(Boolean).join(" · ");
}
function updateReflectionFeedback(){
 const text=feedbackText();
 $("reflection-response").hidden=!text;
 $("reflection-response").textContent=text?"내가 읽고 덧붙인 말 · "+text:"";
 $("copy-fallback").hidden=true;$("full-text-fallback").value="";
 $("share-status").textContent="";
}
function clearReflectionFeedback(){
 reflectionFeedback.response="";reflectionFeedback.note="";
 $("reflection-note").value="";
 document.querySelectorAll("[data-response]").forEach(b=>b.setAttribute("aria-pressed","false"));
 updateReflectionFeedback();
}
function renderReflection(){
 const view=window.MoaLetterReflection.compose(records);
 $("reflection-title").textContent=view.title;
 const area=$("reflection-parts");area.replaceChildren();
 for(const part of view.parts){
  const row=append("div","reflection-part",undefined,area);
  append("h3","",part.label,row);append("p","",part.text,row);
 }
 $("reflection-warm").textContent=view.warm;
 $("reflection-step").textContent=view.step;
 updateReflectionFeedback();
}
function recap(){
 const box=$("recap-items");box.replaceChildren();
 stages.forEach((id,index)=>{
  const a=records[id],item=append("article","memory-card"+(a.choice===null||a.choice==="pass"?" memory-muted":""),undefined,box);
  item.dataset.chapter=id;
  const no=append("span","memory-no",String(index+1).padStart(2,"0"),item);
  no.setAttribute("aria-hidden","true");
  const body=append("div","memory-copy",undefined,item);
  append("span","memory-label",storyLabels[id],body);
  append("h3","memory-answer",chosen(id),body);
  if(a.detail)append("p","memory-detail","조금 더 이야기한 말 · "+a.detail,body);
  if(a.note)append("p","memory-note","내가 직접 적은 말 · "+a.note,body);
 });
 $("letter-message").textContent=letterIntro();
 $("letter-next").textContent=letterNext();
 $("letter-date").textContent=dateText();
}
function fullReport(){
 const view=window.MoaLetterReflection.compose(records);
 const lines=["모아의 첫 번째 편지","나에 대해 알게 된 작은 이야기들",dateText(),"","안녕, 너에게.",letterIntro(),""];
 lines.push("■ 오늘의 답에서 발견한 이야기",view.title);
 for(const part of view.parts)lines.push(part.label+": "+part.text);
 lines.push("모아의 한마디: "+view.warm,"작은 다음 한 걸음: "+view.step,"숙제는 아니야. 마음이 달라지면 바꿔도 돼.");
 if(feedbackText())lines.push("내가 읽고 덧붙인 말: "+feedbackText());
 lines.push("");
 for(const id of stages){
  const a=records[id];
  lines.push("■ "+storyLabels[id]);
  lines.push("  "+chosen(id));
  if(a.detail)lines.push("  조금 더 이야기한 말: "+a.detail);
  if(a.note)lines.push("  내가 직접 적은 말: "+a.note);
  lines.push("");
 }
 lines.push("다음 이야기는 네 속도로");
 lines.push(letterNext());
 lines.push("","너의 첫 이야기를 함께한, 모아가.");
 lines.push("※ 오늘 직접 고른 말을 정리한 기록이며 검사·진단 결과가 아니야.");
 return lines.join("\n");
}
function guide(){
 const root=$("guide-items");root.replaceChildren();
 const points=[
 ["spark","학생이 편안함을 느끼는 구체적 상황을 함께 탐색합니다. 떠올리지 못해도 장점이 없다는 뜻은 아닙니다."],
 ["topic","학생과 보호자의 관심사를 구분해 듣고, 어떤 일이 걱정되는지 학생 자신의 언어로 확인합니다."],
 ["moment","특정 장면에서의 상황·촉발 맥락·지원 필요성을 개방형으로 탐색합니다. 선택만으로 원인이나 장애를 단정하지 않습니다."],
 ["pace","말·글·그림·활동·대기 시간 중 실제로 편한 소통 방식과 필요한 조정을 확인합니다."],
 ["wish","첫 회기에 학생이 동의할 수 있는 작고 구체적인 공동 활동을 함께 정합니다."]
 ];
 for(const [id,t] of points){
  if(records[id].choice&&records[id].choice!=="pass"){
   const p=append("p","guide-point",t,root);
   p.dataset.topic=id;
  }
 }
 if(!root.childElementCount)append("p","guide-point","오늘은 학생에게 편안함과 비밀보장 안내를 우선하고, 다음에 이야기할 의사를 확인합니다.",root);
}
function finish(){
 complete=true;
 $("intro").hidden=true;$("conversation").hidden=true;$("result").hidden=false;
 recap();renderReflection();guide();
 $("copy").disabled=false;$("print").disabled=false;
 $("copy-fallback").hidden=true;$("share-status").textContent="";
 window.scrollTo({top:0,behavior:"instant"});
 $("result-title").focus({preventScroll:true});
}
function begin(){
 started=true;complete=false;position=0;
 $("intro").hidden=true;render();window.scrollTo({top:0,behavior:"instant"});
 $("question-title").focus({preventScroll:true});
}
function reset(){
 clearReflectionFeedback();
 for(const id of stages){records[id]={choice:null,detail:null,note:""};}
 revoke();position=0;complete=false;started=false;
 $("conversation").hidden=true;$("result").hidden=true;$("intro").hidden=false;
 window.scrollTo({top:0,behavior:"instant"});
 $("welcome-title").focus?.({preventScroll:true});
}
document.querySelectorAll("[data-response]").forEach(button=>button.addEventListener("click",()=>{
 reflectionFeedback.response=button.dataset.response;
 document.querySelectorAll("[data-response]").forEach(b=>b.setAttribute("aria-pressed",String(b===button)));
 updateReflectionFeedback();
}));
$("reflection-note").addEventListener("input",()=>{
 reflectionFeedback.note=$("reflection-note").value.slice(0,240).trim();updateReflectionFeedback();
});
$("start").addEventListener("click",begin);
$("early-end").addEventListener("click",()=>{started=true;finish();});
$("end-now").addEventListener("click",finish);
$("restart").addEventListener("click",reset);
$("back").addEventListener("click",moveBack);
$("next").addEventListener("click",moveForward);
$("pass").addEventListener("click",()=>{choose("pass");moveForward();});
$("unknown").addEventListener("click",()=>choose("unknown"));
$("own-toggle").addEventListener("click",()=>{
 const showing=$("own-panel").hidden;$("own-panel").hidden=!showing;$("own-toggle").setAttribute("aria-expanded",String(showing));
 if(showing)$("own-input").focus();
});
$("own-save").addEventListener("click",saveOwn);
$("own-input").addEventListener("input",()=>{revoke();$("panel-tip").textContent="아직 저장하지 않은 말이야. '이 말로 남길래'를 누르면 이 대화 안에만 남아.";});
$("revise").addEventListener("click",()=>{clearReflectionFeedback();revoke();complete=false;position=0;render();window.scrollTo({top:0,behavior:"instant"});});
$("copy").addEventListener("click",async()=>{
 if($("copy").disabled||$("result").hidden)return;
 const val=fullReport();
 try{
  if(!navigator.clipboard||!window.isSecureContext)throw new Error("clipboard unavailable");
  await navigator.clipboard.writeText(val);
  $("copy-fallback").hidden=true;
  $("share-status").textContent="편지 전체를 복사했어. 어디에 붙여넣을지는 네가 정할 수 있어.";
 }catch{
  $("full-text-fallback").value=val;
  $("copy-fallback").hidden=false;
  $("full-text-fallback").focus();
  $("full-text-fallback").select();
  $("share-status").textContent="자동 복사가 어려워서 전체 편지를 아래에 보여줬어. 직접 선택해 복사할 수 있어.";
 }
});
$("print").addEventListener("click",()=>{
 if($("print").disabled||$("result").hidden)return;
 window.print();
});
$("privacy-open").addEventListener("click",()=>{if(typeof $("privacy-dialog").showModal==="function")$("privacy-dialog").showModal();else $("about").open=true;});
window.addEventListener("pageshow",ev=>{if(ev.persisted)location.reload();});
})();
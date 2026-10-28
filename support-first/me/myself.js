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
let coverChoice=null; // Custom cover art never classifies personality.
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
let lastRenderedPosition=-1;
function refreshThread(){
 const area=$("thread");area.replaceChildren();
 const previous=stages.slice(0,position).filter(id=>records[id].choice);
 if(!previous.length){
  area.hidden=true;
  $("side-remember-text").textContent="네가 고를 첫 이야기를 기다리고 있어";
  return;
 }
 area.hidden=false;
 append("span","thread-caption","여기까지 네가 고른 말",area);
 const trail=append("div","story-trail",undefined,area);
 for(const id of previous){
  const answer=records[id],segment=append("div","trail-card",undefined,trail);
  append("span","trail-label",storyLabels[id]||"오늘의 이야기",segment);
  let caption=answer.choice==="pass"?"넘어간 질문":answer.choice==="unknown"?"아직 모르겠어":(choiceLabel(id,answer.choice)+(answer.detail?" · "+answer.detail:""));
  append("strong","trail-answer",caption||"내 말로 이야기했어",segment);
 }
 const last=previous.map(id=>records[id]).filter(a=>a.choice!=="pass"&&a.choice!=="unknown").at(-1);
 $("side-remember-text").textContent=last?(last.detail||choiceLabel(previous.filter(id=>records[id].choice!=="pass"&&records[id].choice!=="unknown").at(-1),last.choice)):"건너뛰어도 네 이야기야";
}
function card(c,selected,index){
 const b=document.createElement("button");b.type="button";b.className="choice"+(selected?" active":"");b.dataset.choice=c[0];b.setAttribute("aria-pressed",String(selected));
 append("span","choice-symbol",String(index+1).padStart(2,"0"),b);
 append("span","choice-label",c[1],b);
 append("span","choice-indicator",selected?"✓":"↗",b).setAttribute("aria-hidden","true");
 b.addEventListener("click",()=>choose(c[0]));
 return b;
}
function render(){
 if(!started||complete)return;
 const id=stageAt(position),cfg=config(id),a=records[id];
 $("intro").hidden=true;$("result").hidden=true;$("conversation").hidden=false;
 refreshThread();
 const actualStep=position+1;
 $("progress-count").textContent=String(actualStep).padStart(2,"0")+" / "+String(stages.length).padStart(2,"0");
 $("progress-bar").style.width=(actualStep/stages.length*100)+"%";
 $("progress-track").setAttribute("aria-valuenow",String(actualStep));
 $("question-kicker").textContent=(data[id]?.kicker||"조금 더 알아가기")+" · 모아";
 $("question-title").textContent=cfg.question||cfg.prompt;
 $("question-hint").textContent=cfg.hint;
 const grid=$("choice-grid");grid.replaceChildren();
 cfg.choices.forEach((c,i)=>grid.append(card(c,a.choice===c[0],i)));
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
 $("next").innerHTML=position===stages.length-1?'내 이야기 한 장 받기 <span aria-hidden="true">→</span>':'다음 이야기 <span aria-hidden="true">→</span>';
 $("panel-tip").textContent=a.choice==="pass"?"좋아, 넘어가자.":a.choice==="unknown"?"모르겠다는 대답도 괜찮아.":a.choice?"선택한 답은 언제든 바꿀 수 있어.":"고르거나 건너뛰어도 돼";
 // Keep the conversation readable without auto-focusing a button or stealing keyboard focus.
 if(lastRenderedPosition!==position&&document.activeElement!==$("question-title"))$("question-panel").scrollIntoView({behavior:"instant",block:"start"});
 lastRenderedPosition=position;
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
const themes={
 rest:{name:"달빛 쉼터",symbol:"🐰",caption:"조용히 쉬는 시간이 편하다는 네 선택에서 달빛 쉼터를 떠올렸어.",title:"조용한 시간을 담은"},
 game:{name:"별빛 탐험길",symbol:"🦊",caption:"게임이나 영상을 좋아하는 순간을 골라서 별빛 탐험길로 꾸몄어.",title:"좋아하는 장면에서 시작한"},
 create:{name:"반짝이는 작업실",symbol:"🐿️",caption:"무언가 만들고 해보는 시간이 좋다고 골라서 작은 작업실로 꾸몄어.",title:"만드는 순간이 담긴"},
 friend:{name:"함께하는 모닥불",symbol:"🦦",caption:"좋아하는 사람과 함께하는 시간을 골라서 따뜻한 모닥불을 떠올렸어.",title:"함께하는 시간이 담긴"},
 neutral:{name:"첫 장의 새싹",symbol:"🌱",caption:"오늘 아직 정하지 않은 이야기는 빈 페이지처럼 열어뒀어.",title:"나만의 첫"}
};
const coverTheme=()=>themes[coverChoice||records.spark.choice]||themes.neutral;
const coverId=()=>coverChoice|| (themes[records.spark.choice]?records.spark.choice:"neutral");
function renderCover(){
 const theme=coverTheme(),id=coverId();
 $("letter-page").dataset.storyTheme=id;
 $("cover-name").textContent=theme.name;
 $("cover-symbol").textContent=theme.symbol;
 $("cover-reason").textContent=coverChoice?"이 표지는 네가 직접 고른 그림이야. 오늘의 답과 성격을 분류하지는 않아.":theme.caption;
 $("result-title").textContent=window.MoaLetterReflection.compose(records).title;
 $("cover-choose").setAttribute("aria-expanded",String(!$("cover-options").hidden));
 const choices=$("cover-options");choices.replaceChildren();
 for(const [key,item] of Object.entries(themes)){
  const btn=append("button","cover-swatch",item.symbol+" "+item.name,choices);
  btn.type="button";btn.setAttribute("aria-pressed",String(id===key));btn.dataset.theme=key;
  btn.addEventListener("click",()=>{
   coverChoice=key;
   choices.hidden=true;
   $("cover-choose").setAttribute("aria-expanded","false");
   renderCover();
   $("share-status").textContent="";
  });
 }
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
// A short, literal first screen. All expanded explanations remain separately available.
function glance(records,view){
 const a=id=>records[id]||{};
 const key=(a("topic").choice||"")+"."+(a("moment").choice||"");
 const suggestions={
  "school.arrival":["학교에 가기 전, 가장 힘든 순간 하나 고르기","학교에 가는 길에 이 부분이 어려워. 같이 봐줄래?"],
  "school.lesson":["완성된 예시 하나 보고, 첫 번째 할 일 정하기","어떻게 시작하는지 예시 하나만 보여줄래?"],
  "school.people":["조금 편했던 자리 한 곳 떠올리기","어떤 자리에서 더 편한지 같이 찾아줄래?"],
  "school.expect":["이번에 어디까지 하면 되는지 한 가지 정하기","어디까지 하면 되는지 기준을 알려줄래?"],
  "people.begin":["지금 함께 보고 있는 것으로 한마디 시작해 보기","첫마디를 같이 골라줄래?"],
  "people.reply":["대답하기 전에 생각할 시간 요청하기","잠깐 생각할 시간을 줄래?"],
  "people.alone":["함께하고 싶은지 잠깐 쉬고 싶은지 고르기","어떤 게 편한지 내 얘기부터 들어줄래?"],
  "people.trouble":["실제로 들은 말과 내 생각을 나눠 적기","그 말이 어떤 뜻이었는지 확인해도 될까?"],
  "mood.wake":["아침에 가장 힘든 순간 하나 적기","아침에 이 부분이 힘들어. 같이 살펴봐줄래?"],
  "mood.start":["지금 할 수 있는 첫 동작 하나 정하기","시작할 때 이 부분이 어려워. 같이 봐줄래?"],
  "mood.night":["떠오르는 생각 하나만 적어두기","이 생각이 자꾸 떠올라. 나중에 같이 이야기할래?"],
  "mood.unexpected":["기분이 바뀌기 전 상황 하나 떠올리기","무슨 기분인지 아직 몰라. 같이 살펴봐줄래?"],
  "day.talk":["말하기 전에 끝까지 들어달라고 부탁하기","내 말부터 끝까지 들어줄래?"],
  "day.plan":["첫 번째로 할 일 하나만 고르기","뭐부터 해야 할지 같이 정해줄래?"],
  "day.change":["바뀐 점 하나 확인하고, 다음 할 일 하나 고르기","계획이 바뀌어서 헷갈려. 다음 한 가지만 같이 정해줄래?"],
  "day.alone":["혼자 해볼 부분과 물어볼 부분 나누기","이 부분은 내가 해볼게. 여기는 확인해줄래?"]
 };
 const overrides={
  "계획을 다시 세우기 어려워":["그대로인 것·바뀐 것 하나씩 적고, 다음 일 하나 정하기","계획이 바뀌면 다시 정하기 어려워. 같이 정해줄래?"],
  "그다음에 뭘 해야 할지 모르겠어":["바뀐 뒤 첫 번째로 할 일 하나만 정하기","계획이 바뀌어서 헷갈려. 다음에 뭐부터 할까?"],
  "마음이 편해지는 데 시간이 걸려":["새 계획을 확인한 뒤 잠깐 쉬는 시간 갖기","바뀐 건 알겠어. 잠깐 마음 정리할 시간 줄래?"],
  "설명이 잘 이해되지 않아":["완성된 예시 하나 보고, 첫 번째 할 일 확인하기","설명이 잘 안 잡혀. 예시 하나 보여줄래?"],
  "해야 할 일이 너무 많게 느껴져":["지금 할 일 하나만 골라 눈앞에 두기","한 번에 많아서 어려워. 첫 번째 일부터 같이 정해줄래?"],
  "틀리거나 실수할까 걱정돼":["평가 없이 한 번 연습해 보기","틀릴까 걱정돼. 먼저 연습해 봐도 될까?"],
  "하루를 시작할 힘이 부족해":["아침에 하기 어려운 일 한 가지 도움 요청하기","아침에 기운이 부족해. 이 부분을 도와줄래?"],
  "시작할 기운이 잘 안 나":["기운이 없는 순간을 말하고 함께 살펴보기","시작할 기운이 안 나. 내 상태를 같이 봐줄래?"]
 };
 const chosenDetail=a("moment").detail;
 const scene= a("moment").choice&&!["unknown","pass","none"].includes(a("moment").choice)?choiceLabel("moment",a("moment").choice):
  a("topic").choice&&!["unknown","pass","none"].includes(a("topic").choice)?choiceLabel("topic",a("topic").choice):"오늘은 아직 고르지 않았어";
 const heading=chosenDetail|| (scene==="오늘은 아직 고르지 않았어"?"아직 정하지 않아도 괜찮아":scene);
 const pair=overrides[chosenDetail]||suggestions[key];
 const action=pair?.[0]||(scene==="오늘은 아직 고르지 않았어"?"필요할 때 다시 시작하기":"어떤 도움이 필요한지 한 가지 직접 고르기");
 const request=pair?.[1]||(scene==="오늘은 아직 고르지 않았어"?"오늘은 여기까지만 할래.":"내가 원하는 방식으로 다시 이야기해볼래?");
 const note=["moment","topic"].map(id=>a(id).note?.trim()).find(Boolean)||"";
 return {scene,heading,action,request,note,expanded:view};
}
function renderResultFacts(){
 const area=$("result-facts");area.replaceChildren();
 const content=[];
 const spark=records.spark,moment=records.moment,pace=records.pace,topic=records.topic,wish=records.wish;
 if(hasAnswer(spark)&&spark.choice!=="own")content.push(["내가 편한 순간",chosen("spark")+(spark.detail?" · "+spark.detail:""),"01"]);
 if(hasAnswer(moment)&&moment.choice!=="none"&&moment.choice!=="own")content.push(["내가 이야기한 장면",chosen("moment")+(moment.detail?" · "+moment.detail:""),"02"]);
 else if(hasAnswer(topic)&&topic.choice!=="none"&&topic.choice!=="own")content.push(["요즘 이야기하고 싶은 것",chosen("topic"),"02"]);
 if(hasAnswer(pace)&&pace.choice!=="own")content.push(["나에게 편한 대화",chosen("pace"),"03"]);
 if(content.length<3&&hasAnswer(wish)&&wish.choice!=="unsure"&&wish.choice!=="own")content.push(["다음에 해보고 싶은 것",chosen("wish"),"04"]);
 if(!content.length){
  const box=append("div","result-fact result-fact-empty",undefined,area);
  append("span","fact-value","오늘은 고르지 않은 이야기가 더 많아. 모아가 대신 결정하지 않을게.",box);
  return;
 }
 for(const [label,value,num] of content.slice(0,3)){
  const node=append("div","result-fact",undefined,area);
  append("span","fact-index",num,node);
  const body=append("div","fact-copy",undefined,node);
  append("span","fact-label",label,body);
  append("strong","fact-value",value,body);
 }
}
function renderReflection(){
 const view=window.MoaLetterReflection.compose(records);
 const mini=glance(records,view);
 $("result-title").textContent=mini.heading;
 renderResultFacts();
 $("insight-scene").textContent=mini.scene;
 $("reflection-step").textContent=mini.action;
 $("reflection-request").textContent=mini.request;
 $("letter-subtitle").textContent="네가 직접 고른 말이야. 맞지 않으면 바꿔도 돼.";
 $("insight-original").hidden=!mini.note;
 $("insight-original").textContent=mini.note?"네가 직접 남긴 말 · “"+mini.note+"”":"";
 const area=$("reflection-parts");area.replaceChildren();
 for(const part of view.parts){
  const row=append("div","reflection-part",undefined,area);
  append("h3","",part.label,row);append("p","",part.text,row);
 }
 $("reflection-warm").textContent=view.warm;
 $("reflection-check").textContent=view.check;
 $("reflection-optional").textContent=view.optional;
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
 $("letter-date").textContent=dateText();
 renderCover();
}
function fullReport(){
 const view=window.MoaLetterReflection.compose(records);
 const mini=glance(records,view);
 const lines=["모아가 너에게 보낸 편지",mini.heading,dateText(),"오늘의 표지: "+coverTheme().name,"", "선택한 답에서 생각해 본 제안이야. 성격검사·진단 결과는 아니야."];
 lines.push("내가 고른 장면: "+mini.scene,"","딱 한 가지 해볼 일",mini.action,"","필요할 때 이렇게 말해도 돼",mini.request);
 if(mini.note)lines.push("내가 직접 쓴 말: "+mini.note);
 lines.push("","추가 설명 (선택)");
 for(const part of view.parts)lines.push(part.label,part.text);
 lines.push("어떤 점이 달라지는지 확인하기",view.check,"",view.warm,view.optional);
 if(feedbackText())lines.push("","내가 읽고 덧붙인 말: "+feedbackText());
 const discoveryLines=window.MoaSelfDiscovery.lines();
 if(discoveryLines.length)lines.push("",...discoveryLines);
 lines.push("","내가 남긴 답 전체 — 원래 응답");
 for(const id of stages){
  const a=records[id];lines.push("",storyLabels[id],chosen(id));
  if(a.detail)lines.push("추가 답변: "+a.detail);
  if(a.note)lines.push("내가 직접 적은 말: "+a.note);
 }
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
 const scene=records.moment.choice&&!["unknown","pass","none"].includes(records.moment.choice)?chosen("moment"):"";
 window.MoaSelfDiscovery.show({topic:records.topic.choice,scene});
 complete=true;
 $("intro").hidden=true;$("conversation").hidden=true;$("result").hidden=false;
 recap();renderReflection();guide();
 $("cover-options").hidden=true;
 $("copy").disabled=false;$("print").disabled=false;
 $("copy-fallback").hidden=true;$("share-status").textContent="";
 window.scrollTo({top:0,behavior:"instant"});
 $("result-title").focus({preventScroll:true});
}
function begin(){
 started=true;complete=false;position=0;lastRenderedPosition=-1;
 $("intro").hidden=true;render();window.scrollTo({top:0,behavior:"instant"});
 $("question-title").focus({preventScroll:true});
}
function reset(){
 window.MoaSelfDiscovery.clear();
 clearReflectionFeedback();
 for(const id of stages){records[id]={choice:null,detail:null,note:""};}
 revoke();position=0;complete=false;started=false;coverChoice=null;lastRenderedPosition=-1;
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
window.MoaSelfDiscovery.init(()=>{});
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
$("revise").addEventListener("click",()=>{window.MoaSelfDiscovery.clear();clearReflectionFeedback();revoke();complete=false;position=0;render();window.scrollTo({top:0,behavior:"instant"});});
$("cover-choose").addEventListener("click",()=>{const o=$("cover-options");o.hidden=!o.hidden;$("cover-choose").setAttribute("aria-expanded",String(!o.hidden));});
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
// Print the complete original answers even when the student kept the transcript collapsed.
let transcriptWasOpen=null;
let extraPrintState=[];
window.addEventListener("beforeprint",()=>{
 if($("result").hidden||$("print").disabled||transcriptWasOpen!==null)return;
 const details=document.querySelector(".memory-disclosure");
 if(!details)return;
 extraPrintState=[...document.querySelectorAll(".insight-check,.discovery-disclosure")].map(el=>[el,el.open]);
 for(const [el] of extraPrintState)el.open=true;
 transcriptWasOpen=details.open;
 details.open=true;
});
window.addEventListener("afterprint",()=>{
 const details=document.querySelector(".memory-disclosure");
 if(details&&transcriptWasOpen!==null){details.open=transcriptWasOpen;transcriptWasOpen=null;}
 for(const [el,open] of extraPrintState)el.open=open;
 extraPrintState=[];
});
$("privacy-open").addEventListener("click",()=>{if(typeof $("privacy-dialog").showModal==="function")$("privacy-dialog").showModal();else $("about").open=true;});
window.addEventListener("pageshow",ev=>{if(ev.persisted)location.reload();});
})();
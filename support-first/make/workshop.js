(() => {
"use strict";

// This is a browser-only creative exercise. No networking, persistence, analytics,
// identity collection, automated peer contact, or AI requests are performed here.
const worlds={
  forest:{name:"달빛 숲",where:"달빛 숲",detail:"반딧불이 길을 비추는 숲",challenge:"만든 길이 생각보다 좁아서 지나갈 수 없어."},
  space:{name:"별빛 정거장",where:"별빛 정거장",detail:"지도가 아직 완성되지 않은 우주 정거장",challenge:"우주선이 움직이지 않아. 어디부터 살펴보면 좋을까?"},
  ocean:{name:"바닷속 마을",where:"바닷속 마을",detail:"물결 아래 작은 마을",challenge:"마을로 가는 문이 잠겨 있어. 다음에 무엇을 할까?"}
};
const heroes={
  maker:{name:"발명가",style:"서로 다른 물건을 조합하는 발명가",strength:"새로운 방법을 생각해내는"},
  explorer:{name:"탐험가",style:"조심스럽게 주변을 둘러보는 탐험가",strength:"모르는 것을 하나씩 찾아보는"},
  guardian:{name:"길잡이",style:"뒤처진 친구를 기다릴 줄 아는 길잡이",strength:"함께 갈 방법을 생각하는"}
};
const quests={
  bridge:{title:"새로운 길을 만드는 이야기",task:"길이 막혔어. 지나갈 수 있는 방법을 함께 찾아보자.",wonder:"막힌 길을 지나갈 수 있게 도울 방법은 무엇일까?"},
  friend:{title:"누군가를 만나는 이야기",task:"아직 혼자 있는 이웃이 있어. 꼭 말을 걸지 않아도 함께할 방법이 있을까?",wonder:"상대가 편한 방법으로 다가가려면 무엇이 필요할까?"},
  signal:{title:"비밀 신호를 찾아가는 이야기",task:"어디선가 신호가 도착했어. 이게 무엇인지 알아보는 첫 단서를 골라보자.",wonder:"이 신호가 무엇인지 아직 모를 때 먼저 확인할 것은 무엇일까?"}
};
const responses={
  try:{title:"방법을 바꾸는 것도 시도야.",description:"처음 방법이 안 맞으면 다른 길을 찾아볼 수 있어. 아직 정답을 정할 필요는 없어."},
  help:{title:"도움 부탁은 중요한 선택이야.",description:"누군가에게 필요한 것을 설명하고 도움받는 것도 스스로 문제를 해결하는 방법이야."},
  rest:{title:"쉬었다 해도 괜찮아.",description:"잠깐 멈추는 건 그만큼 몸과 마음을 살피는 선택이야. 다시 할지는 네가 정해."}
};
const cheers={
  kind:"“혼자 있는 친구에게도 편지가 도착한다는 생각이 마음에 들어.”\n실제 전송되지 않은 연습 문장이야.",
  ask:"“그 우체국에서 가장 처음 보낼 편지는 누구에게 가?”\n실제 전송되지 않은 연습 문장이야.",
  idea:"“편지를 배달하는 작은 배를 같이 만들어보는 건 어때?”\n실제 전송되지 않은 연습 문장이야.",
  quiet:"조용히 살펴보는 것도 한 가지 참여 방법이야. 답장을 꼭 해야 하는 건 아니야."
};
const nextMessages={
  world:"좋아. 다음에는 완전히 다른 세계를 만들어볼 수 있겠네.",
  person:"누군가와 함께해보고 싶다는 생각도 좋네. 안전하고 편한 사람부터 시작하면 돼.",
  learn:"만들고 싶은 게 생겨서 더 배우고 싶은 거구나. 무엇부터 알아볼지 함께 고를 수 있어.",
  later:"오늘은 여기까지 해도 좋아. 다음에 다시 할지는 네가 정해."
};
const savedState=Object.freeze({world:"forest",hero:"maker",quest:"bridge"});
const state={...savedState,idea:"",next:null};
const byId=id=>document.getElementById(id);
let combinations=0;
const groups=[
 {selector:"[data-world]",key:"world"},
 {selector:"[data-hero]",key:"hero"},
 {selector:"[data-quest]",key:"quest"}
];
function setPressed(selector,active){
 document.querySelectorAll(selector).forEach(button=>{
  const matches=button.dataset[selector.slice(6,-1)]===active;
  button.setAttribute("aria-pressed",String(matches));
 });
}
function render(){
 const w=worlds[state.world],h=heroes[state.hero],q=quests[state.quest];
 const stage=document.querySelector(".stage");
 stage.dataset.world=state.world;stage.dataset.hero=state.hero;
 byId("scene-label").textContent=w.name+" · "+h.name;
 byId("sceneDesc").textContent=w.detail+"에서 "+h.style+"가 "+q.title+"를 시작하는 장면";
 byId("story-title").textContent=w.name+"의 "+h.name;
 byId("story-text").textContent=w.detail+"에서 "+h.name+"가 새로운 생각을 꺼냈어. "+q.task+" "+q.wonder;
 byId("challenge-situation").textContent=state.quest==="bridge"?w.challenge:state.quest==="friend"?"새 친구가 아직 아무 대답도 하지 않아. 어떤 방법이 편할까?":"신호를 해독하다가 단서가 부족해졌어. 어떻게 해볼까?";
 byId("idea-preview").textContent=summaryText(false);
 byId("scene-serial").textContent="함께 고른 장면";
 groups.forEach(({selector,key})=>document.querySelectorAll(selector).forEach(b=>b.setAttribute("aria-pressed",String(b.dataset[key]===state[key]))));
}
function summaryText(includeNotes=true){
 const w=worlds[state.world],h=heroes[state.hero],q=quests[state.quest];
 return (includeNotes?"일단 해봄 · 오늘 만든 이야기\n":"")+
  "세계: "+w.name+"\n주인공: "+h.name+"\n이야기: "+q.title+
  (state.idea.trim()?"\n내가 더한 아이디어: "+state.idea.trim():"\n더할 아이디어는 아직 비워두었어.")+
  (includeNotes&&state.next?"\n다음에 해보고 싶은 것: "+({
    world:"다른 세계 만들기",person:"누군가와 함께 해보기",learn:"더 배우고 만들어보기",later:"오늘은 여기까지"
  }[state.next]):"");
}
function updateGroup(key,value){
 if(!Object.prototype.hasOwnProperty.call(state,key))return;
 if(!(key==="world"?worlds:key==="hero"?heroes:quests)[value])return;
 state[key]=value;
 render();
 byId("challenge-result").hidden=true;
 document.querySelectorAll("[data-response]").forEach(x=>x.setAttribute("aria-pressed","false"));
}
groups.forEach(({selector,key})=>{
 document.querySelectorAll(selector).forEach(b=>b.addEventListener("click",()=>updateGroup(key,b.dataset[key])));
});
byId("surprise").addEventListener("click",()=>{
 // A fixed nonrandom tour ensures every option is predictable and testable.
 const tours=[
  ["space","explorer","signal"],
  ["ocean","guardian","friend"],
  ["forest","maker","bridge"],
  ["forest","explorer","friend"],
  ["space","guardian","bridge"],
  ["ocean","maker","signal"]
 ];
 const [world,hero,quest]=tours[combinations%tours.length];
 combinations++;
 state.world=world;state.hero=hero;state.quest=quest;
 render();byId("challenge-result").hidden=true;
 document.querySelectorAll("[data-response]").forEach(b=>b.setAttribute("aria-pressed","false"));
});
byId("reset").addEventListener("click",()=>{
 state.world=savedState.world;state.hero=savedState.hero;state.quest=savedState.quest;
 state.idea="";state.next=null;
 byId("my-idea").value="";byId("char-count").textContent="0 / 160";
 byId("challenge-result").hidden=true;
 byId("reaction-preview").textContent="아직 아무것도 고르지 않았어. 구경만 해도 좋아.";
 byId("closing-message").textContent="여기까지 온 것만으로 오늘 해본 일이 생겼어. 다음은 네가 정해도 돼.";
 document.querySelectorAll("[data-response],[data-cheer],[data-next]").forEach(b=>b.setAttribute("aria-pressed","false"));
 byId("share-status").textContent="";
 render();
});
byId("my-idea").addEventListener("input",event=>{
 state.idea=event.target.value.slice(0,160);
 byId("char-count").textContent=state.idea.length+" / 160";
 byId("idea-preview").textContent=summaryText(false);
});
document.querySelectorAll("[data-response]").forEach(b=>{
 b.setAttribute("aria-pressed","false");
 b.addEventListener("click",()=>{
  const answer=responses[b.dataset.response];
  if(!answer)return;
  document.querySelectorAll("[data-response]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));
  byId("result-headline").textContent=answer.title;
  byId("result-description").textContent=answer.description;
  byId("challenge-result").hidden=false;
 });
});
byId("again").addEventListener("click",()=>{
 byId("challenge-result").hidden=true;
 document.querySelectorAll("[data-response]").forEach(b=>b.setAttribute("aria-pressed","false"));
});
document.querySelectorAll("[data-cheer]").forEach(b=>b.addEventListener("click",()=>{
 const message=cheers[b.dataset.cheer];if(!message)return;
 document.querySelectorAll("[data-cheer]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));
 byId("reaction-preview").textContent=message;
}));
document.querySelectorAll("[data-next]").forEach(b=>b.addEventListener("click",()=>{
 const message=nextMessages[b.dataset.next];if(!message)return;
 state.next=b.dataset.next;
 document.querySelectorAll("[data-next]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));
 byId("closing-message").textContent=message;
}));
byId("copy-summary").addEventListener("click",async()=>{
 const status=byId("share-status");
 try{
  if(!navigator.clipboard||!window.isSecureContext)throw Error("not supported");
  await navigator.clipboard.writeText(summaryText(true));
  status.textContent="문장을 복사했어. 공유 전 개인정보가 없는지 확인해줘.";
 }catch{
  status.textContent="자동 복사가 어려워. 위 '지금 우리가 만든 이야기'를 직접 선택해 복사할 수 있어.";
 }
});
byId("print").addEventListener("click",()=>window.print());
render();
})();
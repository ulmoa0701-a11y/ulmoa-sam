(() => {
"use strict";
// This is a self-exploration activity, not a screening, diagnosis, or scoring tool.
// Answers stay in memory only. No network, analytics, account or storage calls.
const prompts=[
 {short:"즐거운 순간",question:"무언가 할 때 시간이 금방 가?",hint:"잘하는 걸 고르라는 뜻이 아니야. 좋아하는 걸 두 개 골라도 괜찮아.",options:[
 ["game","게임을 하거나 보기","게임 속에서 놀 때","◈"],
 ["make","직접 만들거나 꾸미기","그림·영상·게임 등","✦"],
 ["music","음악·영상 즐기기","듣고 보고 즐길 때","♫"],
 ["story","이야기 상상하기","캐릭터·세계·이야기","✎"],
 ["quiet","혼자 조용히 쉬기","내 시간을 보낼 때","☾"],
 ["unknown","아직 잘 모르겠어","그것도 괜찮아","?"]]},
 {short:"편한 소통 방법",question:"다른 사람과 있을 때 뭐가 더 편해?",hint:"상대나 그날의 기분에 따라 달라질 수도 있어.",options:[
 ["text","글이나 타자로 말하기","천천히 적을 수 있어","⌨"],
 ["voice","목소리로 이야기하기","말로 전하는 게 편해","♫"],
 ["picture","그림·표정·선택지","보고 고르는 방식","▣"],
 ["together","같이 무언가 하기","말보다는 활동으로","✦"],
 ["listen","먼저 듣거나 보기","바로 답하지 않기","◌"],
 ["unknown","아직 잘 모르겠어","지금은 넘어가도 돼","?"]]},
 {short:"도움이 되는 것",question:"어려울 때 어떤 게 도움이 될까?",hint:"꼭 어려움을 말하지 않아도 돼. 평소 편했던 방법을 떠올려도 좋아.",options:[
 ["time","생각할 시간을 주기","서두르지 않고 기다리기","◷"],
 ["example","먼저 예시를 보여주기","어떻게 하는지 구경하기","▤"],
 ["step","한 번에 하나씩 하기","작은 단계로 나누기","①"],
 ["along","누군가 함께해 주기","내가 고르는 속도로","✳"],
 ["break","잠깐 쉬었다 다시 하기","쉬고 싶은 마음 존중","☕"],
 ["unknown","아직 잘 모르겠어","나중에 발견해도 돼","?"]]},
 {short:"해보고 싶은 것",question:"언젠가 이런 것도 해보고 싶어?",hint:"큰 꿈을 정해야 하는 건 아니야. 작은 호기심 하나면 충분해.",options:[
 ["create","내가 좋아하는 것 만들기","게임·이야기·음악 등","✦"],
 ["express","내 생각 조금 더 표현하기","글이나 말, 그림으로","✎"],
 ["connect","누군가와 함께해 보기","마음 편한 사람부터","♡"],
 ["life","학교·일상에서 작은 시도","나에게 맞는 속도로","↗"],
 ["discover","내가 좋아하는 것 찾기","아직 몰랐던 내 취향","◈"],
 ["unknown","지금은 정하지 않을래","그것도 내 선택이야","—"]]}
];
const answers=prompts.map(()=>[]);
let step=0;
const byId=id=>document.getElementById(id);
const questionCard=byId("question-card");
const profile=byId("profile");
const choiceGrid=byId("answers");
function paint(){
 const p=prompts[step];
 byId("current-step").textContent=String(step+1).padStart(2,"0");
 byId("question-label").textContent=String(step+1).padStart(2,"0")+" · "+p.short;
 byId("question-title").textContent=p.question;
 byId("question-help").textContent=p.hint;
 byId("previous").disabled=step===0;
 byId("next").innerHTML=step===3?"나의 지도 보기 <span aria-hidden=\"true\">→</span>":"다음 이야기 <span aria-hidden=\"true\">→</span>";
 document.querySelectorAll("[data-rail]").forEach((rail,index)=>{
  rail.classList.toggle("rail-on",index===step);
  rail.classList.toggle("rail-done",index<step);
 });
 choiceGrid.replaceChildren(...p.options.map(([id,title,desc,symbol])=>{
  const button=document.createElement("button");
  button.type="button";button.className="answer";button.dataset.choice=id;
  button.setAttribute("aria-pressed",String(answers[step].includes(id)));
  const symbolEl=document.createElement("span");symbolEl.className="sym";symbolEl.setAttribute("aria-hidden","true");symbolEl.textContent=symbol;
  const titleEl=document.createElement("span");titleEl.className="answer-name";titleEl.textContent=title;
  const descEl=document.createElement("span");descEl.className="answer-note";descEl.textContent=desc;
  button.append(symbolEl,titleEl,descEl);
  button.addEventListener("click",()=>{
   const current=answers[step];
   if(id==="unknown"){answers[step]=current.includes(id)?[]:["unknown"];}
   else if(current.includes(id)){answers[step]=current.filter(x=>x!==id);}
   else {answers[step]=current.filter(x=>x!=="unknown").slice(-1).concat(id);}
   paintSelection();
  });
  return button;
 }));
 paintSelection();
}
function paintSelection(){
 choiceGrid.querySelectorAll("button[data-choice]").forEach(button=>button.setAttribute("aria-pressed",String(answers[step].includes(button.dataset.choice))));
 const length=answers[step].length;
 byId("selection-note").textContent=length?length+"개 골랐어. 바꾸거나 그냥 넘어가도 돼.":"마음에 드는 걸 골라도 좋고, 그냥 넘어가도 돼.";
}
function go(next){
 if(next<0||next>3)return;
 step=next;profile.hidden=true;questionCard.hidden=false;
 paint();
 byId("question-title").focus({preventScroll:true});
}
function labelFor(group,index){
 const arr=answers[index];
 if(!arr.length)return "아직 고르지 않았어";
 const map=new Map(group.options.map(o=>[o[0],o[1]]));
 return arr.map(key=>map.get(key)||"").filter(Boolean).join(" · ");
}
function showProfile(){
 questionCard.hidden=true;profile.hidden=false;
 byId("current-step").textContent="04";
 document.querySelectorAll("[data-rail]").forEach(rail=>{rail.classList.remove("rail-on");rail.classList.add("rail-done");});
 const grid=byId("profile-grid");grid.replaceChildren(...prompts.map((p,index)=>{
  const tile=document.createElement("article");tile.className="profile-tile";
  const head=document.createElement("h4");head.textContent=String(index+1).padStart(2,"0")+" · "+p.short;
  const body=document.createElement("p");body.textContent=labelFor(p,index);
  if(!answers[index].length)body.className="empty";
  tile.append(head,body);return tile;
 }));
 byId("profile-title").focus({preventScroll:true});
}
function fullCard(){
 const text=["일단 해봄 | 오늘의 나에 대한 작은 단서","이건 검사가 아니라 내가 오늘 직접 고른 이야기야."];
 prompts.forEach((p,index)=>text.push(p.short+": "+labelFor(p,index)));
 const note=byId("one-idea").value.trim();
 if(note)text.push("내가 더하고 싶은 말: "+note);
 text.push("오늘의 선택은 나중에 바뀌어도 괜찮아.");
 return text.join("\n");
}
byId("previous").addEventListener("click",()=>go(step-1));
byId("next").addEventListener("click",()=>step===3?showProfile():go(step+1));
byId("edit-answers").addEventListener("click",()=>go(0));
byId("one-idea").addEventListener("input",e=>byId("idea-count").textContent=e.target.value.length+" / 120");
byId("copy-card").addEventListener("click",async()=>{
 const status=byId("copy-status");
 try{
  if(!navigator.clipboard||!window.isSecureContext)throw Error("unavailable");
  await navigator.clipboard.writeText(fullCard());
  status.textContent="내 지도를 복사했어. 다른 사람에게 보여줄지는 네가 정하면 돼.";
 }catch{status.textContent="자동 복사가 지원되지 않아. 카드 내용을 직접 보거나 인쇄할 수 있어.";}
});
byId("print-card").addEventListener("click",()=>window.print());
paint();
})();
(() => {
"use strict";
// No storage, network, AI transmission, scoring, accounts, or recording.
const pages=[
 {question:"뭐 할 때 재밌어?",short:"좋아하는 것",choices:[
  ["game","게임","game","sage"],["create","그림·만들기","make","cream"],
  ["music","음악·영상","music","rose"],["story","이야기·상상","story","blue"]]},
 {question:"어떻게 이야기하면 편해?",short:"편한 소통",choices:[
  ["text","글로 하기","keyboard","blue"],["voice","말로 하기","voice","rose"],
  ["pick","보고 고르기","pick","sage"],["together","같이 하면서","together","cream"]]},
 {question:"어떻게 도와주면 좋을까?",short:"도움이 되는 것",choices:[
  ["time","기다려 주기","time","sage"],["example","예시 보여주기","example","cream"],
  ["steps","하나씩 하기","steps","blue"],["rest","쉬어 가기","break","lavender"]]},
 {question:"뭘 해보고 싶어?",short:"해보고 싶은 것",choices:[
  ["make","내 작품 만들기","create","cream"],["express","내 생각 말하기","express","blue"],
  ["connect","누군가와 함께","connect","sage"],["explore","새로운 것 찾기","explore","rose"]]}
];
const chosen=pages.map(()=>[]);
let step=0;
const el=id=>document.getElementById(id);
const rail=[...document.querySelectorAll("[data-rail]")];
function updateSelection(){
 const selected=chosen[step];
 el("choices").querySelectorAll("button[data-choice]").forEach(btn=>btn.setAttribute("aria-pressed",String(selected.includes(btn.dataset.choice))));
 el("select-status").textContent=selected.length===0?"안 골라도 괜찮아":selected.length===1?"하나 골랐어. 더 골라도 돼.":"두 개 골랐어. 바꿔도 돼.";
}
function draw(focus=false){
 const page=pages[step],box=el("choices");
 el("step-counter").textContent=(step+1)+" / 4";
 el("question-title").textContent=page.question;
 el("question-hint").textContent="하나 또는 두 개만 골라봐";
 el("back").disabled=step===0;
 el("continue").innerHTML=(step===3?"나의 지도 보기":"다음")+' <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-arrow"></use></svg>';
 rail.forEach((r,i)=>{
  r.classList.toggle("active",i===step);
  r.classList.toggle("done",i<step);
 });
 box.replaceChildren(...page.choices.map(([key,label,icon,tone])=>{
   const button=document.createElement("button");
   button.className="choice";button.type="button";button.dataset.choice=key;
   button.setAttribute("aria-pressed","false");
   const art=document.createElement("span");art.className="art";art.dataset.tone=tone;
   const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
   svg.setAttribute("viewBox","0 0 80 80");svg.setAttribute("aria-hidden","true");
   const use=document.createElementNS("http://www.w3.org/2000/svg","use");
   use.setAttribute("href","#i-"+icon);svg.append(use);art.append(svg);
   const name=document.createElement("span");name.className="choice-label";name.textContent=label;
   button.append(art,name);
   button.addEventListener("click",()=>{
     const arr=chosen[step],index=arr.indexOf(key);
     if(index!==-1)arr.splice(index,1);
     else if(arr.length<2)arr.push(key);
     else {arr.shift();arr.push(key);}
     updateSelection();
   });
   return button;
 }));
 updateSelection();
 if(focus)el("question-title").focus({preventScroll:true});
}
function go(index){
 if(index<0||index>3)return;
 step=index;
 el("outcome").hidden=true;
 el("step-view").hidden=false;
 draw(true);
}
function asText(index){
 const labels=new Map(pages[index].choices.map(([key,label])=>[key,label]));
 return chosen[index].length?chosen[index].map(id=>labels.get(id)).join(" · "):"아직 모르겠어";
}
function summary(){
 return ["일단 해봄 | 나의 작은 지도","오늘 고른 것이라 나중에 바뀌어도 괜찮아.",...pages.map((p,i)=>p.short+": "+asText(i))].join("\n");
}
function finish(){
 el("step-view").hidden=true;
 el("outcome").hidden=false;
 rail.forEach(r=>{r.classList.remove("active");r.classList.add("done");});
 el("summary").replaceChildren(...pages.map((p,index)=>{
   const tile=document.createElement("div");tile.className="summary-item";
   const head=document.createElement("span");head.className="summary-heading";head.textContent=p.short;
   const ans=document.createElement("div");ans.className="summary-answer"+(chosen[index].length?"":" unknown");ans.textContent=asText(index);
   tile.append(head,ans);return tile;
 }));
 el("export-status").textContent="";
 el("outcome-title").focus({preventScroll:true});
}
el("back").addEventListener("click",()=>go(step-1));
el("continue").addEventListener("click",()=>step===3?finish():go(step+1));
el("edit").addEventListener("click",()=>go(0));
el("copy").addEventListener("click",async()=>{
 try{
  if(!window.isSecureContext||!navigator.clipboard)throw new Error("unsupported");
  await navigator.clipboard.writeText(summary());
  el("export-status").textContent="복사했어. 누구에게 보여줄지는 네가 정해.";
 }catch{
  el("export-status").textContent="복사가 안 됐어. 이 화면을 직접 보여줘도 괜찮아.";
 }
});
el("print").addEventListener("click",()=>window.print());
draw();
})();
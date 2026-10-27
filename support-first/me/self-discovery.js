/* A voluntary reflective prompt. No diagnoses, storage, requests, analytics, or interpretation of typed language. */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const feelings={
 school:["어디서부터 해야 할지 막막했어","실수하거나 틀릴까 걱정됐어","생각보다 기운이 부족했어","말로 설명하기 어려웠어"],
 people:["무슨 말을 해야 할지 막막했어","상대가 어떻게 볼지 걱정됐어","잠깐 혼자 있고 싶었어","이해받고 싶은 마음이 있었어"],
 mood:["기운이 잘 나지 않았어","생각이 많아졌어","쉬어도 마음이 편하지 않았어","어떤 기분인지 잘 모르겠어"],
 day:["어디서 시작할지 막막했어","잘못할까 봐 걱정됐어","혼자 다 해야 할 것 같았어","잠깐 멈추고 싶었어"],
 general:["생각이 많아졌어","마음이 잘 정리되지 않았어","잠깐 쉬고 싶었어","내 마음이 잘 모르겠어"]
};
const needs=["조금 더 생각할 시간","첫 단계부터 함께 정하기","판단하지 않고 내 말 듣기","내가 선택할 수 있는 여유","아직 무엇이 필요한지 모르겠어"];
const state={feeling:"",need:"",verdict:"",correction:"",scene:"",topic:""};
let onChange=()=>{};
const trimmed=id=>($(id)?.value||"").trim().slice(0,id==="discovery-correction"?240:160);
const feelValue=()=>trimmed("discovery-feeling-own")||state.feeling;
const needValue=()=>trimmed("discovery-need-own")||state.need;
const known=v=>v&&v!=="아직 무엇이 필요한지 모르겠어"&&v!=="어떤 기분인지 잘 모르겠어"&&v!=="내 마음이 잘 모르겠어";
function clear(){
 state.feeling="";state.need="";state.verdict="";state.correction="";state.scene="";state.topic="";
 ["discovery-feeling-own","discovery-need-own","discovery-correction"].forEach(id=>{if($(id))$(id).value="";});
 ["discovery-feelings","discovery-needs"].forEach(id=>$(id)?.replaceChildren());
 document.querySelectorAll("[data-discovery-confirm]").forEach(b=>b.setAttribute("aria-pressed","false"));
 if($("discovery-confirm"))$("discovery-confirm").hidden=true;
 if($("discovery-mirror-text"))$("discovery-mirror-text").textContent="아직 고르지 않았다면, 지금은 빈칸으로 남겨두자.";
}
function sceneText(){
 return state.scene&&state.scene!=="이 이야기는 넘어가기로 했어"&&state.scene!=="이번에는 이야기하지 않았어"
  ?state.scene:"오늘 떠오르는 어떤 장면";
}
function candidate(){
 const f=feelValue(),n=needValue(),scene=sceneText();
 if(known(f)&&known(n))return "‘"+scene+"’에서 너는 ‘"+f+"’에 가까웠고, 그때 ‘"+n+"’를 바랐을 수도 있어.";
 if(known(f))return "‘"+scene+"’에서 네 마음을 표현하는 말로 ‘"+f+"’를 골랐어.";
 if(known(n))return "‘"+scene+"’에서 네가 바랐을지 모르는 것으로 ‘"+n+"’를 골랐어.";
 return "";
}
function setVerdict(v){
 state.verdict=v;
 document.querySelectorAll("[data-discovery-confirm]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.discoveryConfirm===v)));
 refresh();
}
function refresh(){
 const val=candidate(),confirmation=$("discovery-confirm");
 $("discovery-mirror-text").textContent=val||"아직 고르지 않았다면, 지금은 빈칸으로 남겨두자.";
 confirmation.hidden=!val;
 if(!val){
  state.verdict="";
  document.querySelectorAll("[data-discovery-confirm]").forEach(b=>b.setAttribute("aria-pressed","false"));
 }
 onChange();
}
function choose(type,value){
 const current=state[type];
 state[type]=current===value?"":value;
 const field=type==="feeling"?"discovery-feeling-own":"discovery-need-own";
 $(field).value="";
 state.verdict="";state.correction="";
 $("discovery-correction").value="";
 document.querySelectorAll("[data-discovery-confirm]").forEach(b=>b.setAttribute("aria-pressed","false"));
 renderButtons(type);
 refresh();
}
function renderButtons(type){
 const list=$(type==="feeling"?"discovery-feelings":"discovery-needs");
 const choices=type==="feeling"?(feelings[state.topic]||feelings.general):needs;
 list.replaceChildren();
 for(const value of choices){
  const btn=document.createElement("button");
  btn.type="button";btn.className="discovery-chip";btn.textContent=value;
  btn.setAttribute("aria-pressed",String(state[type]===value));
  btn.addEventListener("click",()=>choose(type,value));list.append(btn);
 }
}
function changedInput(type){
 state[type]="";state.verdict="";
 document.querySelectorAll("[data-discovery-confirm]").forEach(b=>b.setAttribute("aria-pressed","false"));
 renderButtons(type);refresh();
}
function summary(){
 const text=candidate(),correction=trimmed("discovery-correction");
 if(!text&&!correction)return{has:false,text:"",verified:false};
 const status=state.verdict==="yes"?"내가 맞다고 확인한 말":state.verdict==="different"?"조금 다르게 느낀 말":state.verdict==="unsure"?"아직 잘 모르겠는 말":"아직 확인하지 않은 생각";
 const lines=[status+": "+(text||"내 말로 생각해 보는 중")];
 if(correction)lines.push("내가 직접 고쳐 쓴 말: "+correction);
 return{has:true,text:lines.join("\n"),verified:state.verdict==="yes"};
}
function lines(){
 const f=feelValue(),n=needValue(),snap=summary();
 if(!f&&!n&&!snap.has)return [];
 const data=["■ 한 장면 깊이 들여다보기","내가 떠올린 장면: "+sceneText()];
 if(f)data.push("내가 고른 느낌: "+f);
 if(n)data.push("그때 바랐던 것: "+n);
 if(snap.has)data.push(snap.text);
 data.push("※ 내가 직접 선택한 말이며, 확인하지 않은 해석은 사실로 단정하지 않아.");
 return data;
}
function show(args){
 clear();
 state.topic=args.topic||"";
 state.scene=args.scene||"";
 $("discovery-scene").textContent=sceneText();
 renderButtons("feeling");renderButtons("need");
 refresh();
}
function init(changeCallback){
 onChange=typeof changeCallback==="function"?changeCallback:()=>{};
 for(const [type,id] of [["feeling","discovery-feeling-own"],["need","discovery-need-own"]]){
  $(id).addEventListener("input",()=>{
   if($(id).value.length>160)$(id).value=$(id).value.slice(0,160);
   changedInput(type);
  });
 }
 $("discovery-correction").addEventListener("input",()=>{state.correction=trimmed("discovery-correction");onChange();});
 document.querySelectorAll("[data-discovery-confirm]").forEach(b=>b.addEventListener("click",()=>setVerdict(b.dataset.discoveryConfirm)));
}
root.MoaSelfDiscovery={init,show,clear,summary,lines,candidate};
})(window);

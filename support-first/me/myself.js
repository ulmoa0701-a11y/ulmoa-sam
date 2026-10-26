(() => {
"use strict";
// Confidentiality: this static page stores NOTHING. No backend, analytics,
// external API calls, persistent storage, automatic assessment, or submission.
const chapters=[
 {id:"interest",title:"서로 처음 만났어",scene:"처음부터 어려운 이야기를 할 필요는 없어.",tag:"01 · 편한 이야기부터",question:"어떤 때 조금 편해져?",help:"가까운 걸 골라도 되고, 그냥 넘어가도 돼.",prompt:"안녕, 모아야. 네가 요즘 좋아하는 것부터 천천히 알아볼까?",choices:[
  ["game","게임하는 시간","game","moss"],["music","음악·영상 보는 시간","media","rose"],["make","무언가 만드는 시간","build","sand"],["rest","혼자 쉬는 시간","pause","blue"]]},
 {id:"concern",title:"요즘 내 마음에 걸리는 것",scene:"누구에게나 신경 쓰이는 일이 있을 수 있어. 말하고 싶지 않아도 괜찮아.",tag:"02 · 요즘 신경 쓰이는 일",question:"요즘 가장 신경 쓰이는 건?",help:"여러 가지여도 괜찮아. 지금은 하나만 골라봐.",prompt:"지금 바꾸고 싶은 일이 있어? 아무것도 고르지 않아도 괜찮아.",choices:[
  ["school","학교·공부","example","blue"],["people","친구·사람 관계","friend","rose"],["feeling","기분·에너지","watch","moss"],["daily","집·일상생활","time","sand"]]},
 {id:"moment",title:"어떤 순간이 특히 그럴까?",scene:"정확한 이유를 몰라도 괜찮아. 기억나는 장면 하나만 살펴보자.",tag:"03 · 어려운 순간",question:"어느 순간이 더 어려워?",help:"가까운 게 없으면 넘어가도 돼.",prompt:"아까 고른 일과 관련해서 조금 더 물어봐도 될까?",choices:[
  ["start","시작하기 전","time","moss"],["during","하고 있는 중","solve","blue"],["talk","누군가와 있을 때","hangout","rose"],["after","끝나고 나서","pause","sand"]]},
 {id:"support",title:"나에게 맞는 도움",scene:"어려운 순간에 어떤 방식이 편한지도 중요해.",tag:"04 · 편한 소통과 도움",question:"어떻게 해주면 좀 편할까?",help:"지금은 모르겠다면 지나가도 돼.",prompt:"상담도 네게 편한 방식으로 시작하면 좋겠어.",choices:[
  ["time","기다려 주기","time","moss"],["text","글·선택지로 이야기","text","blue"],["example","예시를 함께 보기","example","sand"],["together","같이 무언가 하면서","together","rose"]]},
 {id:"wish",title:"다음은 함께 정해보자",scene:"오늘 다 말할 필요도, 당장 바뀌어야 할 필요도 없어.",tag:"05 · 상담에서 원하는 것",question:"여기서 어떤 도움을 받고 싶어?",help:"작고 구체적인 바람이어도 좋아.",prompt:"네 생각이 가장 중요해. 어떤 것부터 같이 해보면 좋겠어?",choices:[
  ["understand","내 마음·상황 정리하기","watch","moss"],["express","내 생각 표현하기","voice","blue"],["connect","사람과 함께하는 연습","hangout","rose"],["try","좋아하는 일 함께 해보기","build","sand"]]}
];
const concernContexts={
 school:{prompt:"학교와 관련해 어떤 순간이 제일 부담스러워?",choices:[["before","등교를 준비할 때"],["enter","교실에 들어갈 때"],["class","수업·과제할 때"],["peer","학교에서 사람을 만날 때"]]},
 people:{prompt:"사람들과 있을 때 어떤 부분이 어려워?",choices:[["start","먼저 말을 꺼낼 때"],["reply","질문에 대답할 때"],["misunderstand","오해·갈등이 생겼을 때"],["alone","함께 있어도 혼자인 느낌일 때"]]},
 feeling:{prompt:"기분이나 에너지가 언제 가장 신경 쓰여?",choices:[["morning","하루를 시작할 때"],["activity","무언가 해야 할 때"],["night","저녁이나 잠들기 전"],["unknown","이유를 설명하기 어려울 때"]]},
 daily:{prompt:"일상에서 어떤 순간이 가장 막막해?",choices:[["home","집에서 누군가와 이야기할 때"],["schedule","해야 할 일을 시작할 때"],["change","예상과 달라졌을 때"],["alone","혼자 해결해야 할 때"]]}
};
const reactions={
 interest:{game:"게임이 편한 시간일 수도 있겠네. 어떤 점이 좋은지도 골라볼래?",music:"좋아하는 음악이나 영상이 있구나. 그 시간의 어떤 점이 좋을까?",make:"직접 만들어보는 쪽이 끌리나 봐. 어떤 순간이 좋을까?",rest:"혼자 쉴 수 있는 시간도 중요하지. 어떤 점이 편할까?"},
 concern:{school:"학교나 공부에 관한 일이라고 골랐네. 구체적인 건 네가 말하고 싶은 만큼만 이야기해줘.",people:"친구나 사람 관계가 떠올랐구나. 특정한 사람의 이름을 말할 필요는 없어.",feeling:"기분이나 에너지가 신경 쓰인다고 골랐네. 이유를 지금 알 필요는 없어.",daily:"집이나 일상생활이 신경 쓰인다고 골랐네. 사적인 일을 자세히 적지 않아도 괜찮아."},
 moment:{before:"일이 시작되기 전이라고 골랐네. 그때 무엇이 부담인지 상담자와 함께 확인할 수 있어.",during:"하고 있는 도중이라고 골랐구나. 어떤 도움이 필요할지 같이 알아볼 수 있어.",talk:"다른 사람과 함께 있을 때가 떠오르는구나. 특정 인물을 말하지 않아도 돼.",after:"일이 끝난 뒤라고 골랐네. 자세한 이유는 상담할 때 천천히 이야기해도 돼."},
 support:{time:"생각할 시간이 필요하다는 말을 상담자에게 전할 수 있어.",text:"글이나 선택지를 사용하는 방법도 있어. 꼭 말로만 답할 필요는 없어.",example:"먼저 예시를 보는 게 편할 수 있겠네. 상담에서도 그렇게 해볼 수 있어.",together:"마주 앉아 질문만 하는 것보다 같이 활동하는 방식부터 시작할 수도 있어."},
 wish:{understand:"지금 상황을 차근차근 정리해보고 싶은 거구나. 어디부터 시작할지 함께 정하면 돼.",express:"내 생각을 좀 더 잘 전하고 싶다는 바람을 적어둘게.",connect:"사람과 연결되는 방법을 연습해보고 싶은 거구나. 네가 원하는 속도로 해볼 수 있어.",try:"좋아하는 일을 함께 시도해보고 싶구나. 그것부터 시작해도 좋아."}
};
const followups={
 interest:{prompt:"그 시간이 좋은 이유는?",choices:["내 마음대로 할 수 있어서","집중하다 보면 편해져서","즐겁거나 신나서"]},
 concern:{prompt:"이 문제를 어떻게 이야기하고 싶어?",choices:["말로 조금 해볼래","선택지·그림으로 할래","오늘은 더 얘기하지 않을래"]},
 moment:{prompt:"그때 나에게 가장 필요했던 건?",choices:["그냥 기다려 주는 것","설명이나 도움","잠시 자리를 벗어나는 것"]},
 support:{prompt:"그 방법을 쓸 수 있다면?",choices:["시작하기가 더 편할 것 같아","내 생각을 전하기 쉬울 것 같아","아직 잘 모르겠어"]},
 wish:{prompt:"어디부터 시도하고 싶어?",choices:["작은 것 하나만","함께 하나씩","지금은 생각해볼래"]}
};
const answers=chapters.map(()=>({choice:null,detail:null,own:"",sent:false}));
const disclose={interest:false,concern:false,moment:false,support:false,wish:false};
const discloseNotes={interest:false,concern:false,moment:false,support:false,wish:false};
let step=0,freeEdited=false;
function withdrawDisclosure(index){
 const id=chapters[index].id;
 disclose[id]=false;
 discloseNotes[id]=false;
}
const $=id=>document.getElementById(id);
function iconHTML(key) {
 // Inline SVG with icons as paths: distinctive editorial graphics, not childish emoji.
 const shape={
 game:'<rect x="14" y="29" width="72" height="43" rx="19"/><path d="M38 42v18M29 51h18"/><circle cx="68" cy="46" r="3"/><circle cx="77" cy="57" r="3"/>',
 media:'<path d="M23 53V45a27 27 0 0 1 54 0v8"/><rect x="18" y="51" width="15" height="25" rx="7"/><rect x="67" y="51" width="15" height="25" rx="7"/><path d="M73 75q-6 11-25 11"/>',
 build:'<path d="M26 25h48v48H26z"/><path d="M50 25v48M26 49h48"/><path d="M15 30 28 17M74 64l14-14"/>',
 hangout:'<circle cx="37" cy="34" r="12"/><circle cx="69" cy="38" r="10"/><path d="M14 81V70q0-22 23-22t23 22v11M58 57q20-11 31 11v13"/>',
 bulb:'<path d="M50 15a27 27 0 0 0-16 49v9h32v-9a27 27 0 0 0-16-49zM35 82h30M42 89h16"/><path d="M42 46l9 9 9-12"/>',
 design:'<path d="M48 14C20 14 11 36 17 56c7 24 35 28 41 15 5-12-3-13 6-21 7-6 19 4 24-10 4-16-19-26-40-26Z"/><circle cx="31" cy="38" r="4"/><circle cx="48" cy="28" r="4"/><circle cx="68" cy="37" r="4"/><circle cx="31" cy="57" r="4"/>',
 puzzle:'<path d="M22 24h23q-6 13 6 13t7-13h22v22q-13-5-13 8t13 7v19H58q5-14-7-14t-6 14H22V60q13 6 13-7t-13-6Z"/>',
 watch:'<circle cx="49" cy="49" r="28"/><circle cx="49" cy="49" r="9"/><path d="M77 24l10-10M17 18 8 9M49 15V6"/>',
 text:'<rect x="12" y="26" width="76" height="48" rx="8"/><path d="M23 39h7M38 39h7M53 39h7M68 39h7M24 51h6M38 51h7M53 51h7M32 64h37"/>',
 voice:'<rect x="38" y="14" width="25" height="47" rx="12"/><path d="M28 50q0 26 22 26t22-26M50 76v13M37 89h26"/>',
 show:'<rect x="16" y="19" width="68" height="59" rx="8"/><circle cx="35" cy="37" r="7"/><path d="m19 70 21-21 13 12 12-12 17 20"/>',
 together:'<path d="M16 39 39 22l11 8 14-7 22 17-22 31-14-8-14 8zM39 53l11 10M49 43l16 13"/>',
 time:'<circle cx="50" cy="50" r="32"/><path d="M50 29v23l15 11M37 8h26"/>',
 example:'<rect x="17" y="20" width="66" height="64" rx="8"/><path d="M28 35h44M28 48h35M28 61h26"/><path d="m54 72 6 6 11-13"/>',
 along:'<path d="M20 29h27q-4 14 7 14t8-14h20v24q-12-3-12 8t12 8v14H56q2-13-9-13t-7 13H20V65q12 4 12-8t-12-8Z"/>',
 pause:'<rect x="18" y="18" width="64" height="64" rx="19"/><path d="M42 36v28M59 36v28"/>',
 project:'<path d="M50 8 60 40l32 10-32 10-10 32-10-32L8 50l32-10z"/>',
 friend:'<circle cx="34" cy="37" r="12"/><circle cx="67" cy="37" r="12"/><path d="M12 81V68q0-17 22-17t22 17v13M50 70q3-19 17-19t21 17v13"/>',
 learn:'<path d="m7 40 43-20 43 20-43 20zM24 49v19q26 20 52 0V49M93 40v32"/>',
 discover:'<circle cx="46" cy="46" r="31"/><path d="m34 58 8-20 21-8-8 20zM46 15V7M46 85v7M15 46H7M85 46h7"/>'
 }[key]||'<circle cx="50" cy="50" r="25"/>';
 return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3.7">'+shape+'</g></svg>';
}

function clear(node){while(node.firstChild)node.removeChild(node.firstChild);}
const label=(chapter,choice)=>chapters.find(x=>x.id===chapter)?.choices.find(x=>x[0]===choice)?.[1]||"";
const activeConcern=()=>answers[1].choice;
function config(index){
 const data=chapters[index];
 if(index!==2)return {...data};
 const concern=activeConcern(),branch=concernContexts[concern];
 if(!branch)return {...data};
 return {...data,question:branch.prompt,choices:branch.choices.map((item,i)=>[item[0],item[1],["time","example","friend","watch"][i],["moss","blue","rose","sand"][i]])};
}
function buttonFor([key,title,icon,tone],chapter){
 const button=document.createElement("button");button.type="button";button.className="option";button.dataset.option=key;button.dataset.tone=tone;
 button.setAttribute("aria-pressed",String(answers[step].choice===key));
 const art=document.createElement("span");art.className="option-art";art.innerHTML=iconHTML(icon);
 const txt=document.createElement("span");txt.className="option-label";txt.textContent=title;
 button.append(art,txt);
 button.addEventListener("click",()=>{
  const old=answers[step].choice;
  withdrawDisclosure(step);
  answers[step]={choice:old===key?null:key,detail:null,own:"",sent:false};
  if(step===1&&old!==key){answers[2]={choice:null,detail:null,own:"",sent:false};withdrawDisclosure(2);}
  showReply();
 });
 return button;
}
const momentReactions={
 school:{
  before:"등교 준비할 때가 신경 쓰이는구나. 어떤 점이 어려운지는 네가 말하고 싶을 때 함께 알아보자.",
  enter:"교실에 들어갈 때가 떠오르는구나. 더 편하게 시작할 수 있는 방법이 있는지 같이 생각해볼 수 있어.",
  class:"수업이나 과제할 때라고 골랐네. 무엇이 부담인지 상담에서 천천히 알아봐도 돼.",
  peer:"학교에서 사람을 마주칠 때라고 골랐네. 누구인지 말하지 않아도 괜찮아."
 },
 people:{
  start:"먼저 말을 시작할 때가 떠오르는구나. 말하지 않고 시작하는 방법도 있어.",
  reply:"질문에 대답할 때라고 골랐네. 생각할 시간이나 다른 표현 방법이 필요할 수도 있겠어.",
  misunderstand:"오해나 갈등이 생기는 순간이라고 골랐네. 자세한 일은 꼭 지금 말하지 않아도 돼.",
  alone:"사람들과 있어도 혼자라고 느껴지는 순간을 골랐네. 그 마음을 이해하기 위해 더 천천히 이야기해도 돼."
 },
 feeling:{
  morning:"하루를 시작할 때가 특히 신경 쓰이는구나. 어떤 도움이 편한지 같이 살펴볼 수 있어.",
  activity:"무언가를 해야 할 때가 떠오르는구나. 시작하는 방식부터 조정할 수도 있어.",
  night:"저녁이나 잠들기 전이라고 골랐네. 잠과 기분에 관해 더 이야기할지는 네가 정해.",
  unknown:"이유를 말로 설명하기 어렵다고 골랐네. 지금 바로 알아야 하는 건 아니야."
 },
 daily:{
  home:"집에서 누군가와 이야기할 때라고 골랐네. 특정 사람이나 일을 말하지 않아도 괜찮아.",
  schedule:"해야 할 일을 시작할 때가 떠오르는구나. 한 번에 하나씩 시작하는 방법도 생각해볼 수 있어.",
  change:"예상과 달라졌을 때라고 골랐네. 그 순간 필요한 도움을 천천히 알아볼 수 있어.",
  alone:"혼자 해결해야 하는 순간을 골랐네. 도움을 청할 방법도 함께 찾아볼 수 있어."
 }
};
function replyText(){
 const choice=answers[step].choice;
 if(!choice)return"";
 if(step===2&&activeConcern()){
  const selected=config(2).choices.find(item=>item[0]===choice);
  return momentReactions[activeConcern()]?.[choice]||(selected?"‘"+selected[1]+"’이 떠오르는구나. 어떤 일이 있는지는 네가 이야기하고 싶을 때 더 알아봐도 돼.":"");
 }
 return reactions[chapters[step].id]?.[choice]||"네가 고른 내용을 그대로 기억해둘게. 왜 그랬는지는 단정하지 않을게.";
}
function showReply(){
 const conf=config(step),answer=answers[step],item=conf.choices.find(x=>x[0]===answer.choice);
 document.querySelectorAll(".option").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.option===answer.choice)));
 const isUnsure=answer.choice==="unsure";
 $("unsure").setAttribute("aria-pressed",String(isUnsure));
 $("reply-flow").hidden=!item&&!isUnsure;$("deeper").hidden=!item;
 if(isUnsure){
  $("my-reply").textContent="아직 잘 모르겠어";
  $("moa-reaction").textContent="알겠어. 오늘 바로 정하지 않아도 돼.";
  $("typed-exchange").hidden=true;
  return;
 }
 if(!item){$("typed-exchange").hidden=true;return;}
 $("my-reply").textContent=item[1];$("moa-reaction").textContent=replyText();
 const info=followups[chapters[step].id];
 $("reason-question").textContent=info.prompt;
 const reasons=$("reasons");clear(reasons);
 info.choices.forEach((text,i)=>{
  const b=document.createElement("button");b.type="button";b.className="reason";b.dataset.reason=String(i);
  b.textContent=text;b.setAttribute("aria-pressed",String(answer.detail===i));
  b.addEventListener("click",()=>{
   withdrawDisclosure(step);
   answer.detail=answer.detail===i?null:i;
   reasons.querySelectorAll("button").forEach(z=>z.setAttribute("aria-pressed",String(Number(z.dataset.reason)===answer.detail)));
   $("moa-followup").textContent=answer.detail===null?"":"고른 내용을 그대로 적어둘게. 자세한 이야기는 나중에 해도 괜찮아.";
  });
  reasons.append(b);
 });
 $("moa-followup").textContent=answer.detail===null?"":"고른 내용을 그대로 적어둘게. 자세한 이야기는 나중에 해도 괜찮아.";
 $("own-input").value=answer.own;
 $("own-words").open=answer.sent;
 $("typed-preview").textContent=answer.own;
 $("typed-exchange").hidden=!answer.sent||!answer.own.trim();
}
function paint(focus=false){
 const data=config(step);
 $("experience").hidden=false;$("result").hidden=true;
 $("scene").dataset.scene=["interest","team","voice","stuck","hope"][step];
 $("scene-number").textContent="SCENE "+String(step+1).padStart(2,"0");
 $("chapter-count").textContent=String(step+1).padStart(2,"0")+" / 05";
 $("scene-heading").textContent=data.title;$("scene-narrative").textContent=data.scene;
 $("scene-tag").textContent=data.tag;$("question").textContent=data.question;
 $("question-help").textContent=data.help;
 $("moa-prompt").textContent=step===2&&concernContexts[activeConcern()]?"아까 ‘"+label("concern",activeConcern())+"’이라고 골랐지. 무엇이 가장 어려운 순간인지 하나만 생각해볼까?":data.prompt;
 $("back").disabled=step===0;
 $("next").innerHTML=step===4?'이야기 정리하기 <span aria-hidden="true">→</span>':'다음 이야기 <span aria-hidden="true">→</span>';
 document.querySelectorAll("[data-progress]").forEach((el,i)=>{el.classList.toggle("on",i===step);el.classList.toggle("done",i<step);});
 const options=$("options");clear(options);
 data.choices.forEach(c=>options.append(buttonFor(c,data)));
 showReply();
 if(focus)$("question").focus({preventScroll:true});
}
function capture(){
 const answer=answers[step];
 if(!answer.choice||answer.choice==="unsure"){answer.own="";answer.sent=false;return;}
 answer.own=$("own-input").value.slice(0,120);
}
function next(){capture();if(step===4)finish();else{step++;paint(true);}}
function back(){if(step===0)return;capture();step--;paint(true);}
function skip(){
 withdrawDisclosure(step);
 answers[step]={choice:null,detail:null,own:"",sent:false};
 $("own-input").value="";
 if(step===1){answers[2]={choice:null,detail:null,own:"",sent:false};withdrawDisclosure(2);}
 next();
}
function unsure(){
 const wasUnsure=answers[step].choice==="unsure";
 withdrawDisclosure(step);
 answers[step]={choice:wasUnsure?null:"unsure",detail:null,own:"",sent:false};
 if(step===1){answers[2]={choice:null,detail:null,own:"",sent:false};withdrawDisclosure(2);}
 showReply();
}
function summaryItem(index){
 const answer=answers[index],cfg=config(index),selection=cfg.choices.find(x=>x[0]===answer.choice);
 return {id:chapters[index].id,label:chapters[index].tag.replace(/^\d+ · /,""),selection:selection?.[1]||(answer.choice==="unsure"?"아직 잘 모르겠어":null),why:answer.detail===null?null:followups[chapters[index].id].choices[answer.detail],own:answer.own.trim()};
}
function renderPreview(){
 const selected=chapters.map((c,i)=>summaryItem(i)).filter(it=>disclose[it.id]);
 const lines=["상담에서 내가 먼저 이야기하고 싶은 것"];
 selected.forEach(item=>{
   const line=item.selection?item.selection:"아직 정하지 않았어";
   lines.push("• "+item.label+": "+line);
   if(item.why)lines.push("  - 추가로 고른 답: "+item.why);
   if(item.own&&discloseNotes[item.id])lines.push("  - 내가 직접 쓴 말: "+item.own);
 });
 const content=selected.length?lines.join("\n"):"";
 $("intro-text").value=content;$("intro-text").readOnly=!selected.length;
 $("summary-empty").hidden=selected.length>0;
 $("copy").disabled=!selected.length;
 $("print").disabled=!selected.length;
 $("print-safe-body").textContent=content;
 freeEdited=false;$("copy-feedback").textContent="";
}
function buildShare(){
 const area=$("handoff-select");clear(area);
 chapters.forEach((chapter,i)=>{
  const d=summaryItem(i),outer=document.createElement("div");outer.className="handoff-row";
  const main=document.createElement("label");main.className="handoff-option";
  const c=document.createElement("input");c.type="checkbox";c.checked=disclose[chapter.id];c.dataset.share=chapter.id;
  const text=document.createElement("span");text.textContent=d.label+" · "+(d.selection||"건너뛰었어");
  main.append(c,text);outer.append(main);
  let noteCheckbox=null;
  if(d.own){
    const note=document.createElement("label");note.className="handoff-note";
    const check=document.createElement("input");check.type="checkbox";check.checked=disclose[chapter.id]&&discloseNotes[chapter.id];check.disabled=!disclose[chapter.id];check.dataset.note=chapter.id;
    noteCheckbox=check;
    const l=document.createElement("span");l.textContent="내가 직접 쓴 문장도 포함";note.append(check,l);outer.append(note);
    check.addEventListener("change",()=>{discloseNotes[chapter.id]=check.checked;renderPreview();});
  }
  c.addEventListener("change",()=>{
   disclose[chapter.id]=c.checked;
   if(!c.checked)discloseNotes[chapter.id]=false;
   if(noteCheckbox){noteCheckbox.checked=disclose[chapter.id]&&discloseNotes[chapter.id];noteCheckbox.disabled=!c.checked;}
   renderPreview();
  });
  area.append(outer);
 });
 renderPreview();
}
function buildHistory(){
 const area=$("discoveries");clear(area);
 chapters.forEach((chapter,i)=>{
  const d=summaryItem(i),card=document.createElement("article");card.className="discovery";
  const title=document.createElement("span");title.className="discovery-tag";title.textContent=d.label;
  const body=document.createElement("p");body.className="discovery-content";body.textContent=d.selection||"이번 이야기는 넘어갔어";
  card.append(title,body);
  if(d.why){const why=document.createElement("p");why.className="discovery-why";why.textContent=d.why;card.append(why);}
  if(d.own){const own=document.createElement("p");own.className="discovery-why";own.textContent="직접 적은 말: "+d.own;card.append(own);}
  area.append(card);
 });
 const questions=$("clinician-questions");clear(questions);
 const hints=[
 "학생이 스스로 좋아한다고 느끼는 경험의 구체적 맥락은 무엇인가? 없거나 모르겠다면 지금은 어떤 활동이 편한가?",
 "학생과 보호자가 호소하는 주제가 일치하는가? 학교·또래·기분·생활 문제의 발생 맥락과 강점은 무엇인가?",
 "선택한 순간의 환경·빈도·기능상 어려움은 어떠한가? 안전·괴롭힘·학대 가능성은 별도 면담에서 확인.",
 "학생이 실제로 편하게 응답하는 방식(말·글·그림·관찰·공동활동)과 필요한 조정은 무엇인가?",
 "학생이 원한 목표는 무엇인가? 첫 회기에서 바로 해볼 수 있는 작은 공동활동은 무엇인가?"
 ];
 hints.forEach((txt,i)=>{const p=document.createElement("p");p.textContent=String(i+1)+". "+txt;questions.append(p);});
}
function finish(){
 capture();$("experience").hidden=true;$("result").hidden=false;
 buildHistory();buildShare();
 $("result-title").focus({preventScroll:true});
}
$("back").addEventListener("click",back);
$("next").addEventListener("click",next);
$("skip").addEventListener("click",skip);
$("unsure").addEventListener("click",unsure);
$("finish-early").addEventListener("click",finish);
$("revisit").addEventListener("click",()=>paint(true));
$("own-input").addEventListener("input",e=>{
 withdrawDisclosure(step);
 answers[step].own=e.target.value.slice(0,120);
 answers[step].sent=false;$("typed-exchange").hidden=true;
});
$("own-send").addEventListener("click",()=>{
 const text=$("own-input").value.trim();
 if(!text)return;
 answers[step].own=text.slice(0,120);
 answers[step].sent=true;$("typed-preview").textContent=answers[step].own;$("typed-exchange").hidden=false;
});
$("intro-text").addEventListener("input",()=>{freeEdited=true;$("print-safe-body").textContent=$("intro-text").value;$("copy-feedback").textContent="";});
$("rebuild").addEventListener("click",renderPreview);
$("copy").addEventListener("click",async()=>{
 if($("copy").disabled)return;
 const status=$("copy-feedback");
 try{
  if(!navigator.clipboard||!window.isSecureContext)throw new Error("clipboard");
  await navigator.clipboard.writeText($("intro-text").value);
  status.textContent="복사했어. 직접 공유할 때 보여줄 내용을 확인해줘.";
 }catch{status.textContent="자동 복사가 어려워. 위 글을 직접 복사하거나 화면으로 보여줄 수 있어.";}
});
$("print").addEventListener("click",()=>{
 if($("print").disabled)return;
 $("print-safe-body").textContent=$("intro-text").value;
 window.print();
});
// Browser back-forward cache can preserve sensitive answers on shared devices.
window.addEventListener("pageshow",event=>{if(event.persisted)window.location.reload();});
paint();
})();
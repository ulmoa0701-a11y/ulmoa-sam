(() => {
"use strict";
// Private local reflection: never save or transmit responses; no tracking, no scoring.
const chapters = [
  {id:"interest",tag:"01 · 나다운 시간",title:"내 시간이 생겼다",scene:"토요일 오후. 아무도 무엇을 하라고 하지 않는다면.",question:"그때 나는 뭘 하고 있을까?",help:"잘하는 일 말고, 나도 모르게 손이 가는 것.",reason:"그 시간이 좋은 이유는?",reasons:["내 속도로 할 수 있어서","시간 가는 줄 모르겠어서","평가받지 않아서"],choices:[
    {id:"game",label:"게임에서 새로운 방법 찾기",visual:"game",tone:"moss",intro:"게임에서 새로운 방법과 규칙을 찾는 것",discovery:"게임 속에서 새로운 방법을 찾는 시간이 즐거운 편이야"},
    {id:"media",label:"음악·영상에 몰입하기",visual:"media",tone:"rose",intro:"음악이나 영상에 푹 빠져보는 것",discovery:"음악이나 영상에 몰입하는 시간이 즐거운 편이야"},
    {id:"build",label:"직접 만들고 고치기",visual:"build",tone:"sand",intro:"내 방식으로 무언가 만들고 고치는 것",discovery:"새로운 것을 만들어보고 수정하는 데 관심이 있어"},
    {id:"hangout",label:"누군가와 함께 놀기",visual:"hangout",tone:"blue",intro:"누군가와 함께 시간을 보내는 것",discovery:"다른 사람과 함께 활동할 때 즐거움을 느끼기도 해"}
  ]},
  {id:"team",tag:"02 · 다른 사람과 함께할 때",title:"우리의 첫 프로젝트",scene:"둘이 작은 게임이나 영상을 만들어보기로 했다. 내가 맡을 수 있는 역할은 무엇일까?",question:"어떤 역할부터 해볼까?",help:"앞에 나서는 역할만 중요한 건 아니야.",reason:"그 역할이 마음에 드는 이유는?",reasons:["아이디어를 생각하는 게 좋아서","차근차근 해볼 수 있어서","함께 결과를 만들고 싶어서"],choices:[
    {id:"idea",label:"아이디어 제안하기",visual:"bulb",tone:"sand",intro:"새로운 아이디어를 제안하는 역할",discovery:"무언가 함께 할 때 아이디어를 제안해보고 싶어"},
    {id:"design",label:"화면·캐릭터 만들기",visual:"design",tone:"rose",intro:"화면과 캐릭터를 구체적으로 만드는 역할",discovery:"함께 만드는 일에서 눈에 보이는 결과를 만드는 게 좋겠어"},
    {id:"solve",label:"문제 해결하기",visual:"puzzle",tone:"blue",intro:"막히는 문제를 해결해보는 역할",discovery:"함께하는 프로젝트에서 문제를 살펴보고 해결해보는 역할이 끌려"},
    {id:"observe",label:"먼저 살펴보고 돕기",visual:"watch",tone:"moss",intro:"먼저 살펴보고 필요한 순간 돕는 역할",discovery:"처음부터 앞에 나서기보다 충분히 살펴보고 참여하는 게 편해"}
  ]},
  {id:"voice",tag:"03 · 내 생각을 전할 때",title:"내 의견이 생겼다",scene:"함께 만든 장면에서 바꾸고 싶은 점이 생겼어. 다른 사람이 그걸 물어본다면.",question:"어떻게 표현하면 더 편할까?",help:"말하지 않아도 생각은 전할 수 있어.",reason:"그 방식이 편한 이유는?",reasons:["생각할 시간이 있어서","하고 싶은 말을 더 정확히 전해서","직접 해보이는 게 쉬워서"],choices:[
    {id:"text",label:"문자로 천천히 적기",visual:"text",tone:"blue",intro:"글로 차분하게 내 생각을 표현하는 것",discovery:"말로 바로 대답하는 것보다 글로 표현하는 쪽이 편할 수 있어"},
    {id:"voice",label:"말로 이야기하기",visual:"voice",tone:"sand",intro:"말로 생각을 주고받는 것",discovery:"말로 이야기하면서 생각을 풀어가는 방식이 편해"},
    {id:"show",label:"그림·결과로 보여주기",visual:"show",tone:"rose",intro:"그림이나 만든 결과를 보여주는 것",discovery:"그림이나 만든 결과로 내 생각을 전하는 방식이 좋아"},
    {id:"together",label:"함께 하면서 나누기",visual:"together",tone:"moss",intro:"같이 활동하면서 대화하는 것",discovery:"마주 앉아 질문받기보다 함께 무언가 할 때 이야기하기가 편해"}
  ]},
  {id:"stuck",tag:"04 · 막히는 순간에",title:"생각처럼 안 되는 날",scene:"작품을 만들다가 마음대로 되지 않는다. 내게 필요한 건 노력 부족이라는 말이 아니라.",question:"어떤 도움이 있으면 좋을까?",help:"잠깐 쉬는 것도 하나의 방법이야.",reason:"그게 도움이 될 것 같은 이유는?",reasons:["압박이 줄어들어서","다시 시도할 여유가 생겨서","어디서 막혔는지 알 수 있어서"],choices:[
    {id:"time",label:"생각할 시간 조금 더",visual:"clock",tone:"moss",intro:"서두르지 않고 생각할 시간을 갖는 것",discovery:"어려운 순간에는 생각할 시간을 조금 더 받으면 도움이 될 것 같아"},
    {id:"example",label:"예시부터 같이 보기",visual:"example",tone:"sand",intro:"예시를 함께 보면서 시작하는 것",discovery:"처음에는 예시를 보고 방법을 알아가면 도움이 될 것 같아"},
    {id:"along",label:"누군가와 같이 풀기",visual:"along",tone:"blue",intro:"누군가와 같이 방법을 찾아보는 것",discovery:"혼자 막힐 때 누군가와 방법을 찾는 게 도움이 될 것 같아"},
    {id:"pause",label:"잠깐 쉬고 다시 보기",visual:"pause",tone:"rose",intro:"잠시 쉬었다가 다시 살펴보는 것",discovery:"힘들 때는 잠깐 멈출 수 있는 시간이 필요해"}
  ]},
  {id:"hope",tag:"05 · 다음에 해볼 일",title:"내가 정하는 다음 장면",scene:"아직 모든 걸 잘할 필요는 없어. 다음 한 걸음을 내가 정할 수 있다면.",question:"어떤 걸 한번 해보고 싶어?",help:"작아도 좋아. 지금은 정하지 않아도 돼.",reason:"그걸 해보고 싶은 마음은 어디서 왔을까?",reasons:["재미있을 것 같아서","한 번은 해보고 싶어서","나한테 의미가 있을 것 같아서"],choices:[
    {id:"project",label:"내가 구상한 작품 완성",visual:"project",tone:"sand",intro:"내 아이디어로 작품 하나를 만들어보는 것",discovery:"내가 생각한 작품을 작은 것부터 직접 완성해보고 싶어"},
    {id:"friend",label:"편한 사람과 함께하기",visual:"friend",tone:"blue",intro:"편한 사람과 함께 무언가 시도하는 것",discovery:"마음이 편한 사람과 무언가를 함께 해보고 싶어"},
    {id:"learn",label:"궁금한 것 더 배워보기",visual:"learn",tone:"moss",intro:"관심 있는 것을 조금 더 배워보는 것",discovery:"관심이 생긴 것은 조금 더 배우고 시도해보고 싶어"},
    {id:"own",label:"아직 모르는 나 더 발견",visual:"discover",tone:"rose",intro:"내가 좋아하는 것부터 더 찾아보는 것",discovery:"아직 몰랐던 내 취향과 하고 싶은 일을 더 발견해보고 싶어"}
  ]}
];
const values=chapters.map(()=>({choice:null,reason:null,own:""}));let step=0,tone="casual",lastAuto="",manual=false;
const el=id=>document.getElementById(id);
const iconNames={game:"gamepad-2",media:"headphones",build:"blocks",hangout:"users",idea:"lightbulb",design:"palette",solve:"wrench",observe:"scan-eye",text:"keyboard",voice:"mic",show:"image",together:"handshake",time:"timer",example:"book-open",along:"puzzle",pause:"coffee",project:"sparkles",friend:"users-round",learn:"graduation-cap",own:"compass"};
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
function clear(element){while(element.firstChild)element.removeChild(element.firstChild);}
function makeOption(o){
 const button=document.createElement("button");button.type="button";button.className="option";button.dataset.option=o.id;button.dataset.tone=o.tone;
 button.setAttribute("aria-pressed",String(values[step].choice===o.id));
 const art=document.createElement("span");art.className="option-art";art.innerHTML=iconHTML(o.id);
 const title=document.createElement("span");title.className="option-label";title.textContent=o.label;
 button.append(art,title);
 button.addEventListener("click",()=>{const v=values[step];v.choice=v.choice===o.id?null:o.id;v.reason=null;paintSelection();});
 return button;
}
function paintSelection(){
 document.querySelectorAll(".option[data-option]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.option===values[step].choice)));
 const details=el("deeper"),v=values[step],ch=chapters[step];
 details.hidden=!v.choice;
 if(!v.choice)return;
 el("reason-question").textContent=ch.reason;
 const reasons=el("reasons");clear(reasons);
 ch.reasons.forEach((word,i)=>{
   const b=document.createElement("button");b.type="button";b.className="reason";b.dataset.reason=String(i);
   b.textContent=word;b.setAttribute("aria-pressed",String(v.reason===i));
   b.addEventListener("click",()=>{v.reason=v.reason===i?null:i;reasons.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(Number(x.dataset.reason)===v.reason)));});
   reasons.append(b);
 });
 el("own-input").value=v.own;el("own-words").open=false;
}
function paint(focus=false){
 const ch=chapters[step],v=values[step];
 el("chapter-count").textContent=String(step+1).padStart(2,"0")+" / 05";
 el("scene").dataset.scene=ch.id;
 el("scene").setAttribute("aria-label",ch.title+": "+ch.scene);
 el("scene-number").textContent="SCENE "+String(step+1).padStart(2,"0");
 el("scene-heading").textContent=ch.title;
 el("scene-narrative").textContent=ch.scene;
 el("scene-tag").textContent=ch.tag;el("question").textContent=ch.question;el("question-help").textContent=ch.help;
 el("back").disabled=step===0;
 el("next").innerHTML=step===chapters.length-1?'나의 이야기 보기 <span aria-hidden="true">→</span>':'다음 장면 <span aria-hidden="true">→</span>';
 document.querySelectorAll("[data-progress]").forEach((r,i)=>{r.classList.toggle("on",i===step);r.classList.toggle("done",i<step);});
 const options=el("options");clear(options);ch.choices.forEach(o=>options.append(makeOption(o)));
 paintSelection();
 if(focus)el("question").focus({preventScroll:true});
}
function capture(){values[step].own=el("own-input").value.slice(0,90);}
function goto(i){if(i<0||i>=chapters.length)return;capture();step=i;paint(true);}
function chosen(i){return chapters[i].choices.find(o=>o.id===values[i].choice);}
function detail(i){const ch=chapters[i],v=values[i],item=chosen(i);if(!item)return null;return {topic:ch.tag.slice(5),label:item.label,description:item.discovery,reason: v.reason===null?"":ch.reasons[v.reason],own:v.own};}
function chosenLines(key){
 const d=detail(chapters.findIndex(c=>c.id===key));return d;
}
function createText(){
 const [i,t,v,s,h]=chapters.map((c,index)=>detail(index));
 const include=key=>document.querySelector('[data-include="'+key+'"]').checked;
 const segments=[];
 if(tone==="casual"){
   if(i&&include("interest"))segments.push("저는 "+chapters[0].choices.find(o=>o.id===values[0].choice).intro+"에 관심이 있어요.");
   if(t&&include("team"))segments.push("함께 무언가 할 때는 "+chapters[1].choices.find(o=>o.id===values[1].choice).intro+"부터 해보고 싶어요.");
   if(v&&include("voice"))segments.push("생각을 전할 때는 "+chapters[2].choices.find(o=>o.id===values[2].choice).intro+"이 더 편해요.");
   if(s&&include("stuck"))segments.push("어려울 때는 "+chapters[3].choices.find(o=>o.id===values[3].choice).intro+"이 도움이 될 것 같아요.");
   if(h&&include("hope"))segments.push("앞으로는 "+chapters[4].choices.find(o=>o.id===values[4].choice).intro+"부터 시작해보고 싶어요.");
 }else{
   if(i&&include("interest"))segments.push("제가 관심 있는 건 "+chapters[0].choices.find(o=>o.id===values[0].choice).intro+"이에요.");
   if(t&&include("team"))segments.push("팀에서는 "+chapters[1].choices.find(o=>o.id===values[1].choice).intro+"을 맡아보고 싶어요.");
   if(v&&include("voice"))segments.push("의견을 나눌 때는 "+chapters[2].choices.find(o=>o.id===values[2].choice).intro+"이 편해요.");
   if(s&&include("stuck"))segments.push("막히는 순간에는 "+chapters[3].choices.find(o=>o.id===values[3].choice).intro+"이 도움이 돼요.");
   if(h&&include("hope"))segments.push("다음에는 "+chapters[4].choices.find(o=>o.id===values[4].choice).intro+"부터 시도해보고 싶어요.");
 }
 const reasons=chapters.map((c,index)=>({x:detail(index),included:include(c.id)})).filter(r=>r.x&&r.included&&r.x.reason);
 if(reasons.length)segments.push("제가 고른 이유는 ‘"+reasons[0].x.reason+"’예요.");
 const extras=chapters.map((c,index)=>({x:detail(index),included:include(c.id)})).filter(r=>r.x&&r.included&&r.x.own.trim()).map(r=>r.x.own.trim());
 if(extras.length)segments.push("그리고 제 말로 덧붙이면, "+extras.join(" / "));
 return segments.length?segments.join("\n\n"):"아직 어떤 말로 소개할지 모르겠어요. 천천히 알아가고 싶어요.";
}
function rebuild(){lastAuto=createText();el("intro-text").value=lastAuto;manual=false;el("copy-feedback").textContent="";}
function paintSummary(){
 const grid=el("discoveries");clear(grid);
 chapters.forEach((ch,i)=>{
   const d=detail(i),tile=document.createElement("article");tile.className="discovery";
   const k=document.createElement("span");k.className="discovery-tag";k.textContent=ch.tag;
   const summary=document.createElement("p");summary.className="discovery-content";summary.textContent=d?d.description:"이번 장면은 건너뛰었어. 나중에 다시 골라도 돼.";
   tile.append(k,summary);
   if(d&&d.reason){const why=document.createElement("p");why.className="discovery-why";why.textContent="왜? "+d.reason;tile.append(why);}
   grid.append(tile);
 });
}
function finish(){capture();el("experience").hidden=true;el("result").hidden=false;paintSummary();rebuild();el("result-title").focus({preventScroll:true});}
el("back").addEventListener("click",()=>goto(step-1));
el("skip").addEventListener("click",()=>{values[step]={choice:null,reason:null,own:""};el("own-input").value="";if(step===chapters.length-1)finish();else goto(step+1);});
el("next").addEventListener("click",()=>step===chapters.length-1?finish():goto(step+1));
el("own-input").addEventListener("input",e=>values[step].own=e.target.value.slice(0,90));
el("revisit").addEventListener("click",()=>{el("result").hidden=true;el("experience").hidden=false;paint(true);});
document.querySelectorAll("[data-tone]").forEach(button=>button.addEventListener("click",()=>{
 tone=button.dataset.tone;
 document.querySelectorAll("[data-tone]").forEach(b=>b.setAttribute("aria-pressed",String(b===button)));
 if(!manual)rebuild();else el("copy-feedback").textContent="직접 고친 소개문은 그대로 뒀어. 새 방식으로 바꾸려면 '다시 만들기'를 눌러줘.";
}));
document.querySelectorAll("[data-include]").forEach(box=>box.addEventListener("change",()=>{
 if(!manual)rebuild();else el("copy-feedback").textContent="수정한 글은 그대로 있어. 새 선택으로 다시 만들려면 '다시 만들기'를 눌러줘.";
}));
el("intro-text").addEventListener("input",()=>{manual=true;el("copy-feedback").textContent="";});
el("rebuild").addEventListener("click",rebuild);
el("copy").addEventListener("click",async()=>{
 const value=el("intro-text").value,status=el("copy-feedback");
 try{if(!navigator.clipboard||!window.isSecureContext)throw new Error("clipboard");await navigator.clipboard.writeText(value);status.textContent="소개문을 복사했어. 보내기 전에 내용을 직접 확인해줘.";}
 catch{status.textContent="복사가 안 됐어. 위 글을 직접 선택해 복사할 수 있어.";}
});
el("print").addEventListener("click",()=>window.print());
paint();
})();
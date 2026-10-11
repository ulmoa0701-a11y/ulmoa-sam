/* 해봄노트 42개 용어 통합 탐색기
 * 원래 용어노트 설명/사례/출처는 DOM 원문에서 읽기만 한다.
 * 기존 승인 그림 22장 유지 + 새 그림 10장 독립 추가. 이미지 잘라내기 없음.
 */
(function(){
"use strict";
const CATEGORY=[
  {id:"featured",label:"전체"},
  {id:"cognitive",label:"인지·실행"},
  {id:"memory-perception",label:"기억·지각"},
  {id:"language",label:"언어·소통"},
  {id:"intervention",label:"중재·수업"}
];
const COVERS={
  "memo-working-memory":[["작업기억","working-memory"]],
  "memo-short-term-memory":[["단기기억","short-term-memory"]],
  "memo-processing-speed":[["처리속도","processing-speed"]],
  "memo-attention":[["주의","attention"]],
  "memo-executive":[["실행기능","executive-function"]],
  "memo-inhibition":[["억제통제","inhibitory-control"]],
  "memo-flexibility":[["인지유연성","cognitive-flexibility"]],
  "memo-self-regulation":[["자기조절","self-regulation"]],
  "memo-memory":[["기억","memory"]],
  "memo-encoding":[["부호화","encoding"]],
  "memo-consolidation":[["기억공고화","consolidation"]],
  "memo-retrieval":[["인출","retrieval"]],
  "memo-visual":[["시지각","visual-perception"],["시각주의","visual-attention"]],
  "memo-auditory":[["청각처리","auditory-processing"]],
  "memo-receptive-expressive":[["수용언어","receptive-language"],["표현언어","expressive-language"]],
  "memo-pragmatics":[["화용언어","pragmatic-language"]],
  "memo-semantics":[["의미이해","semantic-understanding"]],
  "memo-aac":[["AAC","aac"]],
  "memo-prompting":[["촉구","prompting"]],
  "memo-reinforcement":[["강화","reinforcement"]],
  "memo-metacognition":[["메타인지","metacognition"]],
  "memo-planning-organization":[["계획과 조직화","planning-organization"]],
  "memo-performance-monitoring":[["수행점검","performance-monitoring"]],
  "memo-phonological-working-memory":[["음운작업기억","phonological-working-memory"]],
  "memo-visuospatial-working-memory":[["시공간 작업기억","visuospatial-working-memory"]],
  "memo-narrative-discourse":[["이야기담화","narrative-discourse"]],
  "memo-inferential-comprehension":[["추론이해","inferential-comprehension"]],
  "memo-reading-fluency":[["읽기유창성","reading-fluency"]],
  "memo-fba":[["기능적 행동평가(FBA)","functional-behavior-assessment"]],
  "memo-abc-observation":[["ABC 관찰기록","abc-observation"]]
};
const PNG_COVERS=new Set(["metacognition","planning-organization","performance-monitoring",
  "phonological-working-memory","visuospatial-working-memory","narrative-discourse",
  "inferential-comprehension","reading-fluency","functional-behavior-assessment","abc-observation"]);
function coverUrl(slug){
  return "../assets/glossary/cards/"+slug+(PNG_COVERS.has(slug)?".png":".webp");
}
const PAGE_SIZE=6;
const RELATED={
  "memo-working-memory":["memo-short-term-memory","memo-executive","memo-memory"],
  "memo-short-term-memory":["memo-working-memory","memo-memory"],
  "memo-processing-speed":["memo-attention","memo-working-memory"],
  "memo-attention":["memo-attention-types","memo-self-regulation","memo-processing-speed"],
  "memo-memory":["memo-encoding","memo-consolidation","memo-retrieval"],
  "memo-visual":["memo-attention-types","memo-auditory"],
  "memo-auditory":["memo-receptive-expressive","memo-visual"],
  "memo-receptive-expressive":["memo-pragmatics","memo-aac","memo-semantics"],
  "memo-aac":["memo-receptive-expressive","memo-prompting"],
  "memo-prompting":["memo-time-delay","memo-modeling","memo-reinforcement"],
  "memo-reinforcement":["memo-prompting","memo-generalization"],
  "memo-executive":["memo-working-memory","memo-inhibition","memo-flexibility"],
  "memo-phonological-awareness":["memo-articulation-phonology","memo-auditory"],
  "memo-metacognition":["memo-performance-monitoring","memo-self-regulation","memo-executive"],
  "memo-planning-organization":["memo-executive","memo-task-analysis","memo-performance-monitoring"],
  "memo-performance-monitoring":["memo-metacognition","memo-planning-organization","memo-self-regulation"],
  "memo-phonological-working-memory":["memo-working-memory","memo-phonological-awareness","memo-short-term-memory"],
  "memo-visuospatial-working-memory":["memo-working-memory","memo-visual","memo-short-term-memory"],
  "memo-narrative-discourse":["memo-inferential-comprehension","memo-receptive-expressive","memo-pragmatics"],
  "memo-inferential-comprehension":["memo-narrative-discourse","memo-semantics","memo-reading-fluency"],
  "memo-reading-fluency":["memo-phonological-awareness","memo-inferential-comprehension","memo-narrative-discourse"],
  "memo-fba":["memo-abc-observation","memo-replacement-behavior","memo-reinforcement"],
  "memo-abc-observation":["memo-fba","memo-replacement-behavior","memo-reinforcement"],
  "memo-replacement-behavior":["memo-fba","memo-abc-observation","memo-aac"],
  "memo-udl":["memo-visual-supports","memo-task-analysis","memo-modeling"]
};

/* 별도 그림이나 원문을 복제하지 않는 '상황 ↔ 용어 ↔ 개념 지도' 탐색 데이터.
 * 이 예시는 진단·평가 결론이 아니며, 실제 관찰에서는 환경·맥락을 함께 고려한다. */
const SITUATION_GROUPS=[
  {id:"attention",label:"주의·실행"},
  {id:"memory",label:"기억·학습"},
  {id:"language",label:"말·소통"},
  {id:"support",label:"행동·수업"}
];
// 보호자도 바로 이해하도록 사례는 관찰 가능한 장면으로 작성한다.
// 모든 사례는 설명을 돕기 위한 가상 예시이며 평가·진단을 대신하지 않는다.
const SITUATIONS=[
  {id:"distracted",group:"attention",title:"하다가 자꾸 다른 곳을 봐요",
    scene:"그림을 그리다가 옆에서 소리가 나면 손을 멈춰요.",
    observe:"조용한 곳에서도 그런지, 관심 있는 활동에서는 다른지",
    try:"주변 자극을 줄여보고 달라지는지 살펴보기",
    remember:"집중하기 어려운 이유는 한 가지가 아닐 수 있어요.",
    terms:["memo-attention","memo-attention-types","memo-inhibition"],
    source:["NIMH · 주의(Attention)","https://www.nimh.nih.gov/research/research-funded-by-nimh/rdoc/constructs/attention"]},
  {id:"planning",group:"attention",title:"해야 할 일을 순서대로 못 해요",
    scene:"준비물은 꺼냈는데 무엇부터 해야 할지 망설여요.",
    observe:"시작할 때 막히는지, 중간에 순서를 놓치는지",
    try:"할 일을 세 칸으로 나누어 하나씩 표시하기",
    remember:"계획을 세우는 힘과 하는 중에 확인하는 힘은 달라요.",
    terms:["memo-planning-organization","memo-performance-monitoring","memo-task-analysis"],
    source:["하버드 · 실행기능","https://developingchild.harvard.edu/resource-guides/guide-executive-function/"]},
  {id:"switch",group:"attention",title:"방법이 바뀌면 당황해요",
    scene:"익숙한 놀이 규칙이 바뀌자 참여를 멈춰요.",
    observe:"미리 알려줄 때와 갑자기 바뀔 때의 차이",
    try:"바뀌는 규칙을 먼저 보여주고 한 가지씩 연습하기",
    remember:"바꾸기 어려움과 하기 싫음은 같은 뜻이 아니에요.",
    terms:["memo-flexibility","memo-self-regulation","memo-visual-supports"],
    source:["하버드 · 실행기능 활동","https://developingchild.harvard.edu/resources/handouts-tools/activities-guide-enhancing-and-practicing-executive-function-skills/"]},
  {id:"instructions",group:"memory",title:"여러 가지를 말하면 하나를 잊어요",
    scene:"'가방 놓고 손 씻고 오자' 했더니 가방만 내려놓아요.",
    observe:"한 가지씩 말할 때는 어떤지, 소음이 있을 때 달라지는지",
    try:"한 번에 한두 가지씩 말하고 그림으로도 보여주기",
    remember:"잊어버리는 행동만으로 작업기억이 약하다고 단정할 수 없어요.",
    terms:["memo-working-memory","memo-phonological-working-memory","memo-auditory"],
    source:["NIMH · 작업기억","https://www.nimh.nih.gov/research/research-funded-by-nimh/rdoc/constructs/working-memory"]},
  {id:"recall",group:"memory",title:"배운 내용을 다시 떠올리기 어려워요",
    scene:"어제 배운 단어가 생각나지 않다가 첫 글자를 들으면 말해요.",
    observe:"힌트가 있을 때와 없을 때의 차이",
    try:"시간을 조금 띄워 떠올려 보고 필요한 경우 단서 주기",
    remember:"처음부터 잘 못 배운 것과 꺼내기 어려운 것은 다를 수 있어요.",
    terms:["memo-retrieval","memo-encoding","memo-memory"],
    source:["NIMH · 기억","https://www.nimh.nih.gov/research/research-funded-by-nimh/rdoc/constructs/declarative-memory"]},
  {id:"reading",group:"memory",title:"글은 읽는데 무슨 뜻인지 어려워해요",
    scene:"문장을 소리 내어 읽지만 '왜 그랬을까?'에는 답하기 어려워해요.",
    observe:"글자를 읽는 모습과 내용을 이해하는 모습을 따로 살펴보기",
    try:"짧은 이야기 뒤에 '누가?', '왜?'를 하나씩 물어보기",
    remember:"잘 읽는 것과 내용을 잘 이해하는 것은 같지 않아요.",
    terms:["memo-reading-fluency","memo-inferential-comprehension","memo-semantics"],
    source:["ASHA · 읽기와 쓰기","https://www.asha.org/practice-portal/clinical-topics/written-language-disorders/"]},
  {id:"story",group:"language",title:"이야기 순서가 자꾸 뒤섞여요",
    scene:"오늘 있었던 일을 말하지만 끝난 일을 먼저 이야기해요.",
    observe:"누가, 무엇을, 왜 했는지 이어서 말하는지",
    try:"그림 세 장을 처음·중간·끝 순서로 놓아보기",
    remember:"단어를 많이 알아도 이야기를 이어 말하기는 어려울 수 있어요.",
    terms:["memo-narrative-discourse","memo-receptive-expressive","memo-planning-organization"],
    source:["ASHA · 말과 언어","https://www.asha.org/practice-portal/clinical-topics/spoken-language-disorders/"]},
  {id:"context",group:"language",title:"말 속에 숨은 뜻을 놓쳐요",
    scene:"'와, 방이 정말 깨끗하네'라는 말을 상황과 다르게 받아들여요.",
    observe:"말의 앞뒤 상황과 상대의 표정을 함께 살펴보는지",
    try:"같은 말이 다른 상황에서 어떻게 쓰이는지 비교하기",
    remember:"말을 듣는 것과 상황에 맞게 이해하는 것은 달라요.",
    terms:["memo-pragmatics","memo-inferential-comprehension","memo-semantics"],
    source:["ASHA · 사회적 의사소통","https://www.asha.org/practice-portal/clinical-topics/social-communication-disorder/"]},
  {id:"express",group:"language",title:"말보다 그림이나 손짓으로 표현해요",
    scene:"물을 원할 때 말 대신 물 그림을 가리켜요.",
    observe:"어떤 방법으로, 누구에게, 무엇을 전달하는지",
    try:"말·손짓·그림 등 사용할 수 있는 소통 방법을 함께 두기",
    remember:"말 이외의 방법도 소중한 의사소통이에요.",
    terms:["memo-aac","memo-receptive-expressive","memo-joint-attention"],
    source:["ASHA · 보완대체의사소통","https://www.asha.org/practice-portal/professional-issues/augmentative-and-alternative-communication/"]},
  {id:"refusal",group:"support",title:"특정 활동 앞에서 반복해서 거부해요",
    scene:"쓰기 활동을 시작하자 자리를 벗어나요.",
    observe:"그 전에 무엇을 요청했고, 뒤에는 무슨 일이 있었는지",
    try:"여러 번 기록해 공통되는 상황이 있는지 확인하기",
    remember:"행동이 일어나는 이유는 기록 하나만으로 알 수 없어요.",
    terms:["memo-abc-observation","memo-fba","memo-replacement-behavior"],
    source:["PBIS · 기능적 행동평가","https://www.pbis.org/resource/tier-3-comprehensive-functional-behavior-assessment-fba-guide"]},
  {id:"asking",group:"support",title:"도움이 필요해도 말로 요청하지 못해요",
    scene:"뚜껑이 안 열릴 때 어른 손을 끌어당겨요.",
    observe:"정말 원하는 도움이 무엇인지, 어떻게 요청하는지",
    try:"'도와주세요'를 말·그림 등 편한 방법으로 알려주기",
    remember:"먼저 무엇을 원하는지 이해하는 것이 중요해요.",
    terms:["memo-replacement-behavior","memo-aac","memo-reinforcement"],
    source:["ASHA · 보완대체의사소통","https://www.asha.org/practice-portal/professional-issues/augmentative-and-alternative-communication/"]},
  {id:"access",group:"support",title:"같은 설명이어도 이해하기 어려운 사람이 있어요",
    scene:"말로 들으면 어렵지만 그림이 있으면 순서를 따라가요.",
    observe:"말·그림·시범 중 어떤 방식에서 이해가 쉬워지는지",
    try:"같은 목표를 여러 방식으로 알려주고 표현하게 하기",
    remember:"모두가 같은 방법으로 배워야 하는 것은 아니에요.",
    terms:["memo-udl","memo-visual-supports","memo-modeling"],
    source:["CAST · UDL 가이드라인","https://udlguidelines.cast.org/"]}
];
// 각 지도는 발달의 단계나 유일한 순서가 아니라 '중심 개념과의 관계'를 비교한다.
const CONNECTION_MAPS=[
  {id:"executive",label:"계획·점검",title:"시작하기, 해보기, 다시 확인하기",
    takeaway:"일을 계획하는 것과 하는 중에 살피는 것은 달라요.",
    example:"숙제할 때 무엇부터 할지 정한 뒤, 하면서 빠뜨린 게 있는지 확인해요.",
    note:"실행기능에는 여러 능력이 함께 관여해요. 항상 정해진 순서로 발달하거나 사용되는 것은 아니에요.",
    nodes:[["memo-executive","여러 기능을 함께 조절"],["memo-planning-organization","할 일과 순서를 정하기"],["memo-performance-monitoring","하는 중에 확인하기"],["memo-metacognition","내가 아는지·모르는지 돌아보기"]],
    source:["하버드 · 실행기능","https://developingchild.harvard.edu/resource-guides/guide-executive-function/"]},
  {id:"memory",label:"기억의 차이",title:"잠깐 기억하기와 기억하며 쓰기",
    takeaway:"잠깐 담아두기와 담아둔 정보를 이용하기는 달라요.",
    example:"숫자를 잠깐 외우기, 거꾸로 말하기, 블록 위치 기억하기를 비교해요.",
    note:"말소리 정보와 위치·모양 정보는 서로 다른 종류의 정보예요. 아래 개념들은 순서대로 거치는 단계가 아니에요.",
    nodes:[["memo-working-memory","기억하면서 이용하는 힘"],["memo-short-term-memory","잠깐 유지하는 측면"],["memo-phonological-working-memory","말소리를 기억하며 이용"],["memo-visuospatial-working-memory","위치·모양을 기억하며 이용"]],
    source:["NIMH · 작업기억","https://www.nimh.nih.gov/research/research-funded-by-nimh/rdoc/constructs/working-memory"]},
  {id:"language",label:"말과 이야기",title:"단어를 이해하고, 이야기를 잇고, 뜻을 짐작하기",
    takeaway:"단어를 아는 것만으로 긴 이야기가 쉬워지는 건 아니에요.",
    example:"그림책을 보고 무슨 일이 있었는지 말하고, 왜 그랬는지 짐작해요.",
    note:"이해·표현, 이야기 구성, 추론, 상황에 맞는 말 사용은 서로 영향을 주지만 같은 능력은 아니에요.",
    nodes:[["memo-receptive-expressive","말을 이해하고 표현"],["memo-narrative-discourse","일을 이야기로 연결"],["memo-inferential-comprehension","말에 없는 뜻 짐작"],["memo-pragmatics","상황에 맞는 말 사용"]],
    source:["ASHA · 말과 언어","https://www.asha.org/practice-portal/clinical-topics/spoken-language-disorders/"]},
  {id:"behavior",label:"행동 이해",title:"행동만 보지 말고 앞뒤 상황도 보기",
    takeaway:"왜 그런 행동을 하는지는 여러 자료를 살펴야 해요.",
    example:"쓰기 전에 자리를 벗어나는 행동이 언제 반복되는지 여러 번 기록해요.",
    note:"ABC 기록은 기능적 행동평가에 활용되는 자료 중 하나예요. 기록 하나만으로 행동의 이유를 확정할 수 없어요.",
    nodes:[["memo-fba","행동 이유를 자료로 살피는 평가"],["memo-abc-observation","행동 앞뒤를 기록하는 방법"],["memo-replacement-behavior","같은 필요를 다른 방식으로 표현"],["memo-reinforcement","행동이 반복되는 데 영향을 주는 결과"]],
    source:["PBIS · 기능적 행동평가","https://www.pbis.org/resource/tier-3-comprehensive-functional-behavior-assessment-fba-guide"]},
  {id:"teaching",label:"배우는 방법",title:"같은 목표, 다른 배움의 길",
    takeaway:"배우는 방법과 표현하는 방법은 달라도 괜찮아요.",
    example:"같은 내용을 말이나 그림으로 알려주고, 필요하면 시범도 보여줘요.",
    note:"수업 전체를 설계하는 원칙과 한 활동에서 주는 개별 도움은 서로 다른 개념이에요.",
    nodes:[["memo-udl","여러 방법으로 배울 길 설계"],["memo-visual-supports","그림이나 글자로 알려주기"],["memo-task-analysis","해야 할 일을 작은 단계로 나누기"],["memo-prompting","스스로 할 수 있도록 도움 조정"]],
    source:["CAST · UDL 가이드라인","https://udlguidelines.cast.org/"]}
];
// 표준 용어는 그대로 두고, 한눈에 읽히는 문장만 별도로 표시한다.
const SIMPLE_DEFINITIONS={
  "memo-working-memory":"잠깐 기억한 정보를 바로 써먹는 힘",
  "memo-short-term-memory":"정보를 잠깐 기억해 두기",
  "memo-processing-speed":"정보를 보고 생각해 반응하기까지 걸리는 시간",
  "memo-attention":"지금 필요한 것에 마음을 모으기",
  "memo-attention-types":"필요한 것을 골라 보기 / 그 상태를 이어가기",
  "memo-executive":"목표를 위해 계획하고, 멈추고, 바꾸는 여러 능력",
  "memo-inhibition":"바로 행동하기 전에 잠깐 멈추기",
  "memo-flexibility":"상황이 달라질 때 생각과 방법도 바꾸기",
  "memo-self-regulation":"주의와 감정, 행동을 상황에 맞게 조절하기",
  "memo-metacognition":"내가 아는지 모르는지 스스로 살펴보기",
  "memo-planning-organization":"무엇부터 할지 순서와 준비물 정하기",
  "memo-performance-monitoring":"하는 중에 빠뜨리거나 틀린 곳이 없는지 살피기",
  "memo-memory":"받아들이고, 남기고, 다시 떠올리기",
  "memo-encoding":"새로운 정보를 기억 속에 받아들이기",
  "memo-consolidation":"시간이 지나며 기억이 더 안정되기",
  "memo-retrieval":"배운 것을 필요할 때 다시 떠올리기",
  "memo-visual":"어디를 볼지 고르기 / 본 것을 알아보기",
  "memo-auditory":"소리를 듣는 능력 / 들은 소리 정보를 처리하는 능력",
  "memo-phonological-working-memory":"들은 말소리를 잠깐 기억하고 이용하기",
  "memo-visuospatial-working-memory":"위치나 모양을 잠깐 기억하고 이용하기",
  "memo-receptive-expressive":"말의 뜻 이해하기 / 내 생각을 표현하기",
  "memo-semantics":"단어와 문장의 뜻 이해하기",
  "memo-morphosyntax":"단어 모양과 문장을 만드는 규칙",
  "memo-pragmatics":"상황과 상대에 맞게 말하기",
  "memo-articulation-phonology":"말소리를 만드는 방법 / 말소리의 규칙",
  "memo-phonological-awareness":"말소리를 알아차리고 나누거나 합치기",
  "memo-aac":"말·손짓·그림 등 여러 방법으로 소통 돕기",
  "memo-joint-attention":"두 사람이 같은 것에 관심을 함께 두기",
  "memo-narrative-discourse":"여러 일을 연결해 하나의 이야기로 만들기",
  "memo-inferential-comprehension":"직접 말하지 않은 뜻을 단서로 짐작하기",
  "memo-reading-fluency":"글을 정확하고 자연스럽게 이어 읽기",
  "memo-generalization":"배운 것을 다른 곳에서도 쓰고 오래 이어가기",
  "memo-prompting":"스스로 할 수 있게 필요한 도움 주기",
  "memo-time-delay":"도움을 주기 전에 스스로 해볼 시간 두기",
  "memo-reinforcement":"어떤 결과 때문에 행동이 더 자주 나타나는 것",
  "memo-task-analysis":"복잡한 활동을 작은 순서로 나누기",
  "memo-visual-supports":"말뿐 아니라 그림이나 글자로도 알려주기",
  "memo-modeling":"먼저 보여주어 따라 배우도록 돕기",
  "memo-fba":"행동이 일어나는 이유를 여러 자료로 살피기",
  "memo-abc-observation":"행동 전·행동·행동 후를 나누어 기록하기",
  "memo-replacement-behavior":"필요를 더 안전하고 알맞은 방법으로 표현하기",
  "memo-udl":"처음부터 다양한 배움의 방법을 마련하기"
};

const TINT={
  "cognitive":"#ffeedb",
  "memory-perception":"#e5f0e3",
  "language":"#eee8fb",
  "intervention":"#e5f1fa"
};
const recentsKey="habom-glossary-recent-v1";
function node(tag,className,textValue){
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(textValue!==undefined)el.textContent=textValue;
  return el;
}
function storageGet(){
  try{
    const ids=JSON.parse(localStorage.getItem(recentsKey)||"[]");
    return Array.isArray(ids)?ids.filter(x=>typeof x==="string").slice(0,3):[];
  }catch(e){return [];}
}
function storageSave(ids){try{localStorage.setItem(recentsKey,JSON.stringify(ids));}catch(e){}}
function boot(){
  const shell=document.getElementById("glossaryCatalog");
  if(!shell)return;
  const sourceNotes=Array.from(document.querySelectorAll(".glossary-category .study-note"));
  const entries=sourceNotes.map(note=>{
    const title=note.querySelector("summary .study-summary-copy h3");
    const subtitle=note.querySelector("summary .study-summary-copy p");
    const source=note.querySelector(".study-paper");
    const cat=note.closest(".glossary-category");
    if(!title||!subtitle||!source||!cat)return null;
    return {
      id:note.id,
      title:title.textContent.trim(),
      subtitle:subtitle.textContent.trim(),
      category:cat.id,
      note:note,
      content:source,
      covers:COVERS[note.id]||[],
      search:(note.textContent+" "+note.getAttribute("data-search")+" "+(COVERS[note.id]||[]).map(c=>c[0]).join(" ")).toLocaleLowerCase("ko")
    };
  }).filter(Boolean);
  const byId=new Map(entries.map(entry=>[entry.id,entry]));
  const tabs=document.getElementById("gcatTabs");
  const modeAlbum=document.getElementById("gcatModeAlbum");
  const modeAll=document.getElementById("gcatModeAll");
  const pages=document.getElementById("gcatPages");
  const prev=document.getElementById("gcatPrev");
  const next=document.getElementById("gcatNext");
  const pageCount=document.getElementById("gcatPageCount");
  const search=document.getElementById("gcatSearch");
  const clear=document.getElementById("gcatClear");
  const count=document.getElementById("gcatCount");
  const resultsTitle=document.getElementById("gcatResultsTitle");
  const list=document.getElementById("gcatList");
  const noResults=document.getElementById("gcatEmpty");
  const recentsEl=document.getElementById("gcatRecent");
  const dialog=document.getElementById("gcatDialog");
  const dialogTitle=document.getElementById("gcatDialogTitle");
  const dialogBody=document.getElementById("gcatDialogBody");
  const close=document.getElementById("gcatDialogClose");
  const imageViewer=document.getElementById("gcatImageViewer");
  const imageViewerArt=document.getElementById("gcatImageViewerArt");
  const imageViewerClose=document.getElementById("gcatImageViewerClose");
  if(!tabs||!search||!list||!dialog||!imageViewer||!imageViewerArt||!imageViewerClose)return;
  let zoomReturn=null;
  imageViewerClose.addEventListener("click",()=>imageViewer.close());
  imageViewer.addEventListener("click",event=>{if(event.target===imageViewer)imageViewer.close();});
  imageViewer.addEventListener("close",()=>{if(zoomReturn&&zoomReturn.isConnected)zoomReturn.focus({preventScroll:true});zoomReturn=null;});
  let active="featured";
  let mode="album";
  let currentPage=0;
  // 32 full-sized original cards. Two independent covers can represent a paired concept.
  const albumItems=entries.flatMap(entry=>entry.covers.map((cover,index)=>({entry,cover,index})));
  // Data-driven counter: avoid stale numbers when a new illustration is added.
  const illustrationCount=albumItems.length;
  modeAlbum.querySelector("span").textContent=String(illustrationCount);
  modeAll.querySelector("span").textContent=String(entries.length);
  if(albumItems.length!==32)console.warn("그림 등록 갯수 확인:",albumItems.length);
  let recentIds=storageGet().filter(id=>byId.has(id));
  let lastOpener=null;

  // 원문을 변경하지 않고 팝업에만 읽기 순서가 있는 새 화면을 구성한다.
  // 30개 원본의 정보·예시·이미지·출처를 보존하고 참고 자료만 기본 접힘으로 둔다.
  function makeDisclosure(label,className,content){
    const details=node("details",className);
    details.appendChild(node("summary",null,label));
    details.appendChild(content);
    return details;
  }
  function buildReadingSheet(entry){
    const original=entry.content.cloneNode(true);
    const reading=node("div","study-paper gcat-reading-sheet");

    const definition=node("section","gcat-definition-section");
    definition.appendChild(node("span","gcat-section-kicker","한마디로"));
    definition.appendChild(node("h3","gcat-definition-headline",SIMPLE_DEFINITIONS[entry.id]||entry.subtitle));
    const core=original.querySelector(":scope > .study-core");
    if(core){
      const coreText=core.querySelector(":scope > p");
      if(coreText){
        coreText.classList.add("gcat-definition-explanation");
        definition.appendChild(node("span","gcat-original-definition-label","정확한 뜻"));
        definition.appendChild(coreText);
      }else{
        // 두 개념을 비교하는 용어는 문장 대신 원본 비교 설명을 핵심 뜻에 배치.
        const comparison=core.querySelector(":scope > .visual-pair");
        if(comparison){
          comparison.classList.add("gcat-definition-pair");
          definition.appendChild(comparison);
        }
      }
    }
    reading.appendChild(definition);

    const example=original.querySelector(":scope > .study-example");
    if(example){
      const section=node("section","gcat-example-section");
      section.appendChild(node("h3","gcat-section-heading","생활 속 예시"));
      section.appendChild(example);
      reading.appendChild(section);
    }
    const hints=node("section","gcat-hints-section");
    let hasHints=false;
    const contrast=original.querySelector(":scope > .study-contrast");
    if(contrast){hints.appendChild(contrast);hasHints=true;}
    if(core){
      const label=core.querySelector(":scope > small");
      if(label)label.remove(); // 기존 장식형 머리말은 새로운 단계 제목과 중복
      if(core.children.length){
        core.classList.add("gcat-structure-note");
        hints.appendChild(core);
        hasHints=true;
      }
    }
    const tags=original.querySelector(":scope > .study-tags");
    if(tags){hints.appendChild(tags);hasHints=true;}
    if(hasHints){
      hints.insertBefore(node("h3","gcat-section-heading","함께 알아둘 점"),hints.firstChild);
      reading.appendChild(hints);
    }

    const resourceActions=node("div","gcat-resource-actions");
    const visual=original.querySelector(":scope > .study-visual");
    if(visual){
      const holder=node("div","gcat-reference-image");
      holder.appendChild(visual);
      resourceActions.appendChild(makeDisclosure("참고 그림 보기","gcat-reference-disclosure",holder));
    }
    const more=original.querySelector(":scope > .study-more");
    if(more){
      const holder=node("div","gcat-reference-content");
      const extra=more.querySelector(":scope > div");
      if(extra)holder.append(...Array.from(extra.childNodes));
      else holder.append(...Array.from(more.childNodes).filter(el=>el.nodeType!==1||el.tagName!=="SUMMARY"));
      resourceActions.appendChild(makeDisclosure("더 알아보기 · 근거","gcat-reference-disclosure",holder));
    }

    if(resourceActions.childElementCount)reading.appendChild(resourceActions);

    // 예상하지 못한 원문 요소도 누락하지 않는다.
    const leftovers=Array.from(original.children).filter(el=>el!==core&&el!==example&&el!==contrast&&el!==tags&&el!==visual&&el!==more);
    if(leftovers.length){
      const extra=node("div","gcat-preserved-content");
      extra.append(...leftovers);
      reading.appendChild(extra);
    }
    return reading;
  }

  function openTerm(id,opener,chosenCover){
    const entry=byId.get(id);
    if(!entry)return;
    if(opener)lastOpener=opener;
    recentIds=[id,...recentIds.filter(x=>x!==id)].slice(0,3);
    storageSave(recentIds);
    renderRecent();
    dialogTitle.textContent=entry.title;
    dialogBody.replaceChildren();
    const reading=buildReadingSheet(entry);
    if(entry.covers.length){
      reading.classList.add("gcat-has-preview");
      const preview=node("aside","gcat-inline-art");
      const zoom=node("button","gcat-inline-art-zoom");
      zoom.type="button";
      zoom.setAttribute("aria-label",entry.title+" 그림 확대");
      zoom.title="그림 눌러 크게 보기";
      const art=node("img","gcat-inline-art-image");
      art.width=1122;art.height=1402;art.decoding="async";art.loading="eager";
      zoom.appendChild(art);
      const choose=index=>{
        const cover=entry.covers[index];
        art.src=coverUrl(cover[1]);
        art.alt=cover[0]+" 그림";
        preview.querySelectorAll(".gcat-art-choices button").forEach((btn,i)=>btn.setAttribute("aria-pressed",String(i===index)));
      };
      if(entry.covers.length>1){
        const buttons=node("div","gcat-art-choices");
        entry.covers.forEach((cover,i)=>{
          const btn=node("button",null,cover[0]);
          btn.type="button";
          btn.setAttribute("aria-pressed",String(i===0));
          btn.addEventListener("click",()=>choose(i));
          buttons.appendChild(btn);
        });
        preview.appendChild(buttons);
      }
      zoom.addEventListener("click",()=>{
        zoomReturn=zoom;
        imageViewerArt.src=art.src;
        imageViewerArt.alt=art.alt;
        imageViewer.showModal();
      });
      preview.appendChild(zoom);
      preview.appendChild(node("span","gcat-art-tip","그림을 누르면 확대돼요"));
      reading.insertBefore(preview,reading.children[1]||null);
      choose(chosenCover||0);
    }
    dialogBody.appendChild(reading);
    const suggestions=(RELATED[id]||entries.filter(x=>x.category===entry.category&&x.id!==id).slice(0,2).map(x=>x.id))
      .filter(key=>key!==id&&byId.has(key)).slice(0,3);
    if(suggestions.length){
      const group=node("nav","gcat-related");
      group.setAttribute("aria-label","연관 용어");
      group.appendChild(node("strong",null,"함께 알아보면 좋은 용어"));
      const row=node("div","gcat-related-items");
      suggestions.forEach(key=>{
        const button=node("button",null,byId.get(key).title+" ↗");
        button.type="button";
        button.addEventListener("click",()=>openTerm(key));
        row.appendChild(button);
      });
      group.appendChild(row);
      dialogBody.appendChild(group);
    }
    dialog.scrollTop=0;
    if(!dialog.open){
      if(typeof dialog.showModal==="function")dialog.showModal();
      else dialog.setAttribute("open","");
    }
  }
  function makeCard(item){
    const entry=item.entry;
    const hasArt=!!item.cover;
    const button=node("button","gcat-card "+(hasArt?"gcat-album-art":"gcat-album-text"));
    button.type="button";
    const accessibleName=hasArt?item.cover[0]:entry.title;
    button.setAttribute("aria-label",accessibleName+" 자세히 보기");
    button.dataset.id=entry.id;
    button.dataset.albumCover=hasArt?item.cover[1]:"";
    button.style.setProperty("--tint",TINT[entry.category]||"#fff0dd");
    if(hasArt){
      const img=node("img","gcat-album-image");
      img.src=coverUrl(item.cover[1]);
      img.alt=""; // The original drawing already contains the name and brief explanation.
      img.width=1122;
      img.height=1402;
      img.loading="lazy";
      img.decoding="async";
      button.appendChild(img);
    }else{
      const initial=node("span","gcat-album-symbol",entry.title.charAt(0));
      initial.setAttribute("aria-hidden","true");
      button.appendChild(initial);
      button.appendChild(node("span","gcat-album-title",entry.title));
      const decoration=node("span","gcat-album-text-note");
      decoration.setAttribute("aria-hidden","true");
      button.appendChild(decoration);
    }
    button.addEventListener("click",()=>openTerm(entry.id,button,item.index||0));
    return button;
  }
  function renderRecent(){
    recentsEl.replaceChildren();
    const available=recentIds.filter(id=>byId.has(id));
    recentsEl.hidden=!available.length;
    if(!available.length)return;
    recentsEl.appendChild(node("span","gcat-recent-label","최근 본 용어"));
    available.forEach(id=>{
      const btn=node("button",null,byId.get(id).title);
      btn.type="button";
      btn.addEventListener("click",()=>openTerm(id,btn));
      recentsEl.appendChild(btn);
    });
  }
  function renderTabs(){
    tabs.replaceChildren();
    CATEGORY.forEach(category=>{
      const title=category.id==="featured"?"전체 그림":category.label;
      const total=category.id==="featured"
        ?albumItems.length
        :albumItems.filter(item=>item.entry.category===category.id).length;
      const btn=node("button","gcat-tab");
      btn.type="button";
      btn.setAttribute("aria-label",title+" "+total+"개 보기");
      btn.setAttribute("aria-pressed",String(category.id===active&&!search.value.trim()));
      btn.dataset.tab=category.id;
      btn.appendChild(node("span","gcat-tab-title",title));
      btn.appendChild(node("span","gcat-tab-count",String(total)));
      btn.addEventListener("click",()=>{
        active=category.id;
        if(search.value)search.value="";
        currentPage=0;
        render();
      });
      tabs.appendChild(btn);
    });
  }
  // 42개 용어 전부: 이미지 대신 네 갈래의 텍스트 용어 지도.
  // 여기서는 페이지를 나누거나 그림 타일을 사용하지 않는다.
  const MAP_NOTE={
    cognitive:"생각하고 조절하기",
    "memory-perception":"기억하고 받아들이기",
    language:"이해하고 표현하기",
    intervention:"수업과 중재의 도움"
  };
  function mapTerm(entry){
    const button=node("button","gcat-map-term",entry.title);
    button.type="button";
    button.dataset.id=entry.id;
    button.setAttribute("aria-label",entry.title+" 설명 보기");
    button.addEventListener("click",()=>openTerm(entry.id,button));
    return button;
  }
  function renderTextOverview(q){
    const compact=q.replace(/\s+/g,"");
    const matches=entry=>entry.search.includes(q)||entry.search.replace(/\s+/g,"").includes(compact);
    const titleHit=entry=>[entry.title,...entry.covers.map(cover=>cover[0])]
      .some(title=>title.toLocaleLowerCase("ko").replace(/\s+/g,"").includes(compact));
    let visible=entries.filter(entry=>active==="featured"||entry.category===active);
    if(q){
      const exact=visible.filter(titleHit);
      visible=exact.length?exact:visible.filter(matches);
    }
    list.replaceChildren();
    if(visible.length){
      const layout=node("div","gcat-map-layout");
      layout.setAttribute("aria-label","네 분야 용어 지도");
      const hub=node("div","gcat-map-hub");
      hub.setAttribute("aria-hidden","true");
      hub.appendChild(node("span",null,"용어"));
      hub.appendChild(node("strong",null,"한눈에 보기"));
      layout.appendChild(hub);
      const groups=node("div","gcat-map-groups");
      CATEGORY.filter(c=>c.id!=="featured").forEach((category,i)=>{
        const items=visible.filter(entry=>entry.category===category.id);
        if(!items.length)return;
        const group=node("section","gcat-map-group gcat-map-"+category.id);
        group.style.setProperty("--branch-color",TINT[category.id]);
        group.setAttribute("aria-label",category.label+" "+items.length+"개");
        const header=node("div","gcat-map-group-head");
        const head=node("h3",null,category.label);
        header.appendChild(head);
        header.appendChild(node("span","gcat-map-group-count",items.length+"개"));
        group.appendChild(header);
        group.appendChild(node("p","gcat-map-group-note",MAP_NOTE[category.id]));
        const terms=node("div","gcat-map-terms");
        items.forEach(entry=>terms.appendChild(mapTerm(entry)));
        group.appendChild(terms);
        groups.appendChild(group);
      });
      layout.appendChild(groups);
      list.appendChild(layout);
    }
    resultsTitle.textContent=q?"용어 검색 결과":"분야별 용어 지도";
    count.textContent=visible.length+"개"+(q?" 찾음":"");
    noResults.hidden=visible.length>0;
    pages.hidden=true;
    shell.classList.remove("gcat-album-active","gcat-text-active");
    shell.classList.add("gcat-map-active");
    modeAlbum.setAttribute("aria-pressed","false");
    modeAll.setAttribute("aria-pressed","true");
    renderTabs();
  }
  function render(){
    const q=search.value.trim().toLocaleLowerCase("ko");
    if(mode==="all"){clear.hidden=!q;renderTextOverview(q);return;}
    shell.classList.remove("gcat-map-active");
    const qCompact=q.replace(/\s+/g,"");
    clear.hidden=!q;
    let visible=[];
    if(q){
      const matches=entry=>entry.search.includes(q)||entry.search.replace(/\s+/g,"").includes(qCompact);
      // Searches always cover every original glossary entry, even entries without artwork.
      // Favor the actual term/illustration title; search full explanations only if no title matches.
      const titleHit=entry=>[entry.title,...entry.covers.map(cover=>cover[0])].some(title=>title.toLocaleLowerCase("ko").replace(/\s+/g,"").includes(qCompact));
      const hitsByName=entries.filter(titleHit);
      const eligible=new Set((hitsByName.length?hitsByName:entries.filter(matches)).map(entry=>entry.id));
      const matchesFromAlbum=albumItems.filter(({entry,cover})=>{
        if(!eligible.has(entry.id))return false;
        if(entry.covers.length<2)return true;
        return cover[0].toLocaleLowerCase("ko").includes(q)||!hitsByName.length;
      });
      const drawnIds=new Set(matchesFromAlbum.map(item=>item.entry.id));
      const textMatches=entries.filter(entry=>eligible.has(entry.id)&&!drawnIds.has(entry.id)).map(entry=>({entry,cover:null,index:0}));
      visible=matchesFromAlbum.concat(textMatches);
      resultsTitle.textContent="검색 결과";
    }else if(mode==="album"){
      visible=albumItems.filter(item=>active==="featured"||item.entry.category===active);
      resultsTitle.textContent=active==="featured"?"그림 전체":CATEGORY.find(category=>category.id===active).label;
    }else{
      visible=entries.filter(entry=>active==="featured"||entry.category===active).map(entry=>({entry,cover:entry.covers[0]||null,index:0}));
      resultsTitle.textContent=active==="featured"?"전체 용어":CATEGORY.find(category=>category.id===active).label;
    }
    const pageMax=Math.max(1,Math.ceil(visible.length/PAGE_SIZE));
    currentPage=Math.max(0,Math.min(currentPage,pageMax-1));
    const pageItems=visible.slice(currentPage*PAGE_SIZE,(currentPage+1)*PAGE_SIZE);
    shell.classList.toggle("gcat-album-active",mode==="album"&&!q);
    shell.classList.toggle("gcat-text-active",mode==="all"||!!q);
    modeAlbum.setAttribute("aria-pressed",String(mode==="album"));
    modeAll.setAttribute("aria-pressed",String(mode==="all"));
    count.textContent=visible.length+"개"+(q?" 찾음":"");
    list.replaceChildren(...pageItems.map(makeCard));
    noResults.hidden=visible.length!==0;
    pages.hidden=pageMax<=1;
    prev.disabled=currentPage===0;
    next.disabled=currentPage>=pageMax-1;
    pageCount.textContent=(currentPage+1)+" / "+pageMax;
    renderTabs();
  }
  function setMode(nextMode){
    mode=nextMode;
    active="featured";
    currentPage=0;
    render();
  }
  modeAlbum.addEventListener("click",()=>setMode("album"));
  modeAll.addEventListener("click",()=>setMode("all"));
  prev.addEventListener("click",()=>{if(currentPage>0){currentPage--;render();resultsTitle.scrollIntoView({block:"nearest"});}});
  next.addEventListener("click",()=>{currentPage++;render();resultsTitle.scrollIntoView({block:"nearest"});});
  search.addEventListener("input",()=>{currentPage=0;render();});
  search.addEventListener("keydown",event=>{
    if(event.key==="Enter"){
      const first=list.querySelector(".gcat-card");
      if(first){event.preventDefault();first.click();}
    }
  });
  clear.addEventListener("click",()=>{search.value="";currentPage=0;render();search.focus();});
  close.addEventListener("click",()=>dialog.close());
  dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener("close",()=>{if(lastOpener&&lastOpener.isConnected)lastOpener.focus({preventScroll:true});lastOpener=null;});
  renderRecent();
  render();

  // 3가지 탐색은 한 페이지에서 전환하고 각 화면은 공유 가능한 URL을 갖는다.
  const journeyNav=document.getElementById("gcatJourneyNav");
  const journeyPanels={
    terms:document.getElementById("gcatTermPanel"),
    situations:document.getElementById("gcatSituationPanel"),
    connections:document.getElementById("gcatConnectionPanel")
  };
  const situationFilters=document.getElementById("gcatSituationFilters");
  const situationGrid=document.getElementById("gcatSituationGrid");
  const situationCount=document.getElementById("gcatSituationCount");
  const connectionFilters=document.getElementById("gcatConnectionFilters");
  const connectionDetail=document.getElementById("gcatConnectionDetail");
  let activeSituationGroup="all";
  let activeConnectionMap="executive";
  const validIds=new Set(entries.map(e=>e.id));
  for(const situation of SITUATIONS)for(const id of situation.terms)if(!validIds.has(id))console.error("없는 상황 연결 용어:",id);
  for(const map of CONNECTION_MAPS)for(const [id] of map.nodes)if(!validIds.has(id))console.error("없는 개념 연결 용어:",id);
  function termChip(id){
    const entry=byId.get(id);
    if(!entry)return null;
    const button=node("button","gcat-topic-term",entry.title+" ↗");
    button.type="button";
    button.dataset.termId=id;
    button.setAttribute("aria-label",entry.title+" 원래 용어 설명 열기");
    button.addEventListener("click",()=>openTerm(id,button));
    return button;
  }
  function renderSituations(){
    situationFilters.replaceChildren();
    [{id:"all",label:"전체"},...SITUATION_GROUPS].forEach(group=>{
      const button=node("button","gcat-filter-button",group.label);
      button.type="button";
      button.dataset.group=group.id;
      button.setAttribute("aria-pressed",String(activeSituationGroup===group.id));
      button.addEventListener("click",()=>{activeSituationGroup=group.id;renderSituations();});
      situationFilters.appendChild(button);
    });
    const list=SITUATIONS.filter(s=>activeSituationGroup==="all"||s.group===activeSituationGroup);
    situationCount.textContent=list.length+"가지 상황";
    situationGrid.replaceChildren();
    for(const situation of list){
      const group=SITUATION_GROUPS.find(g=>g.id===situation.group);
      const article=node("article","gcat-situation-card");
      article.id="gcat-situation-"+situation.id;
      article.dataset.group=situation.group;
      article.appendChild(node("span","gcat-situation-label",group.label));
      article.appendChild(node("h3",null,situation.title));
      const scene=node("p","gcat-scene",situation.scene);
      article.appendChild(scene);
      const focus=node("div","gcat-situation-focus");
      focus.appendChild(node("strong",null,"기억할 점"));
      focus.appendChild(node("span",null,situation.remember));
      article.appendChild(focus);
      const observations=node("div","gcat-situation-detail");
      observations.appendChild(node("strong",null,"이런 점을 살펴봐요"));
      observations.appendChild(node("p",null,situation.observe));
      article.appendChild(observations);
      const application=node("div","gcat-situation-detail gcat-situation-application");
      application.appendChild(node("strong",null,"도움이 될 수 있는 방법"));
      application.appendChild(node("p",null,situation.try));
      article.appendChild(application);
      const footer=node("div","gcat-situation-terms");
      footer.appendChild(node("strong",null,"연결되는 용어"));
      const chips=node("div","gcat-term-chips");
      for(const id of situation.terms){const chip=termChip(id);if(chip)chips.appendChild(chip);}
      footer.appendChild(chips);
      article.appendChild(footer);
      const reference=node("a","gcat-learning-reference","관련 개념의 참고자료 ↗");
      reference.href=situation.source[1];
      reference.target="_blank";
      reference.rel="noopener noreferrer";
      reference.setAttribute("aria-label",situation.source[0]+" 새 창에서 보기");
      article.appendChild(reference);
      situationGrid.appendChild(article);
    }
  }
  function renderConnections(){
    connectionFilters.replaceChildren();
    for(const map of CONNECTION_MAPS){
      const button=node("button","gcat-filter-button",map.label);
      button.type="button";
      button.dataset.map=map.id;
      button.setAttribute("aria-pressed",String(activeConnectionMap===map.id));
      button.addEventListener("click",()=>{activeConnectionMap=map.id;renderConnections();});
      connectionFilters.appendChild(button);
    }
    const map=CONNECTION_MAPS.find(m=>m.id===activeConnectionMap);
    const flow=node("div","gcat-concept-flow");
    flow.appendChild(node("p","gcat-concept-flow-title","중심 용어와 연결되는 말"));
    const main=map.nodes[0];
    const center=byId.get(main[0]);
    if(center){
      const root=node("button","gcat-concept-node gcat-concept-center");
      root.type="button";
      root.dataset.termId=main[0];
      root.appendChild(node("small",null,"중심 개념"));
      root.appendChild(node("strong",null,center.title));
      root.appendChild(node("span",null,main[1]));
      root.setAttribute("aria-label",center.title+" 용어 설명 열기");
      root.addEventListener("click",()=>openTerm(main[0],root));
      flow.appendChild(root);
    }
    flow.appendChild(node("p","gcat-concept-related-title","함께 알아보면 좋은 개념"));
    const related=node("div","gcat-concept-related-list");
    for(const [id,relation] of map.nodes.slice(1)){
      const entry=byId.get(id);
      if(!entry)continue;
      const button=node("button","gcat-concept-node");
      button.type="button";
      button.dataset.termId=id;
      const copy=node("span","gcat-concept-node-copy");
      copy.appendChild(node("strong",null,entry.title));
      copy.appendChild(node("small",null,relation));
      button.appendChild(copy);
      button.appendChild(node("span","gcat-concept-open","↗"));
      button.setAttribute("aria-label",entry.title+" 용어 설명 열기");
      button.addEventListener("click",()=>openTerm(id,button));
      related.appendChild(button);
    }
    flow.appendChild(related);
    const explanation=node("div","gcat-concept-explanation");
    explanation.appendChild(node("span","gcat-situation-label","개념을 쉽게 연결하기"));
    explanation.appendChild(node("h3",null,map.title));
    const takeaway=node("div","gcat-concept-takeaway");
    takeaway.appendChild(node("strong",null,"한 줄로 기억하기"));
    takeaway.appendChild(node("p",null,map.takeaway));
    explanation.appendChild(takeaway);
    const use=node("div","gcat-concept-usage");
    use.appendChild(node("strong",null,"생활 속에서는"));
    use.appendChild(node("p",null,map.example));
    explanation.appendChild(use);
    const note=node("div","gcat-concept-note");
    note.appendChild(node("strong",null,"헷갈리지 않으려면"));
    note.appendChild(node("p",null,map.note));
    explanation.appendChild(note);
    const reference=node("a","gcat-learning-reference",map.source[0]+" ↗");
    reference.href=map.source[1];
    reference.target="_blank";
    reference.rel="noopener noreferrer";
    explanation.appendChild(reference);
    connectionDetail.replaceChildren(explanation,flow);
  }
  function setJourney(view,updateUrl){
    if(!Object.prototype.hasOwnProperty.call(journeyPanels,view))view="terms";
    for(const [key,panel] of Object.entries(journeyPanels))panel.hidden=key!==view;
    journeyNav.querySelectorAll("button[data-view]").forEach(button=>{
      button.setAttribute("aria-pressed",String(button.dataset.view===view));
    });
    if(updateUrl){
      const url=new URL(location.href);
      if(view==="terms")url.searchParams.delete("view"); else url.searchParams.set("view",view);
      if(url.href!==location.href)history.pushState(null,"",url);
    }
  }
  journeyNav.querySelectorAll("button[data-view]").forEach(button=>{
    button.addEventListener("click",()=>setJourney(button.dataset.view,true));
  });
  window.addEventListener("popstate",()=>{
    setJourney(new URL(location.href).searchParams.get("view")||"terms",false);
  });
  renderSituations();
  renderConnections();
  setJourney(new URL(location.href).searchParams.get("view")||"terms",false);

  // 기존 공유 링크 /notes/#memo-aac 등의 직접 방문도 지원.
  const target=decodeURIComponent(location.hash.slice(1));
  if(byId.has(target))openTerm(target);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
else boot();
})();

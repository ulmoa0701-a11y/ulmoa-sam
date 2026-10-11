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
  {id:"language",label:"언어·소통"},
  {id:"support",label:"행동·지원"}
];
const SITUATIONS=[
  {id:"distracted",group:"attention",title:"다른 자극을 보느라 하던 활동을 놓쳐요",observe:"주변 자극이 많을 때와 적을 때 참여가 어떻게 달라지는지",try:"활동 시간과 환경을 조금씩 바꿔 반응 비교하기",terms:["memo-attention","memo-attention-types","memo-inhibition"]},
  {id:"planning",group:"attention",title:"계획은 세웠는데 순서대로 하기 어려워요",observe:"시작·순서 정하기·마무리 중 어느 단계에서 멈추는지",try:"할 일을 작은 단계로 나누고 완료한 단계 표시하기",terms:["memo-planning-organization","memo-performance-monitoring","memo-task-analysis"]},
  {id:"switch",group:"attention",title:"규칙이나 방법이 바뀌면 적응하기 어려워요",observe:"변화를 미리 알려줄 때와 갑자기 바뀔 때의 차이",try:"바뀔 내용을 미리 보여주고 한 가지씩 전환 연습하기",terms:["memo-flexibility","memo-self-regulation","memo-visual-supports"]},
  {id:"instructions",group:"memory",title:"여러 가지 지시를 들으면 일부를 빠뜨려요",observe:"지시 길이·주변 소음·그림 제공 여부에 따른 차이",try:"지시를 짧게 나누고 말과 시각정보를 함께 제시하기",terms:["memo-working-memory","memo-phonological-working-memory","memo-auditory"]},
  {id:"recall",group:"memory",title:"배웠던 것을 바로 떠올리기 어려워해요",observe:"힌트 없이 떠올릴 때와 단서를 제공했을 때의 차이",try:"배운 내용을 시간 간격을 두고 다시 떠올려 보기",terms:["memo-retrieval","memo-encoding","memo-memory"]},
  {id:"reading",group:"memory",title:"글은 읽는데 내용의 뜻은 잘 연결하지 못해요",observe:"읽기의 정확도·속도와 의미 이해를 따로 살펴보기",try:"짧은 문장을 읽고 핵심 내용과 숨은 이유 질문하기",terms:["memo-reading-fluency","memo-inferential-comprehension","memo-semantics"]},
  {id:"story",group:"language",title:"이야기할 때 사건의 순서가 자주 뒤섞여요",observe:"누가·무슨 일이·왜·어떻게 끝났는지 연결하는지",try:"처음·중간·끝을 그림으로 배열하고 이야기해 보기",terms:["memo-narrative-discourse","memo-receptive-expressive","memo-planning-organization"]},
  {id:"context",group:"language",title:"말은 알아듣지만 상황 속 숨은 뜻은 놓쳐요",observe:"앞뒤 맥락·표정·상대의 의도를 어느 정도 활용하는지",try:"같은 표현을 다른 상황에 놓고 의미를 비교해 보기",terms:["memo-pragmatics","memo-inferential-comprehension","memo-semantics"]},
  {id:"express",group:"language",title:"말보다 손짓이나 그림으로 더 잘 표현해요",observe:"어떤 방식으로 원하는 것을 스스로 전달하는지",try:"말 사용을 제한하지 않고 그림·제스처·AAC 선택지 제공하기",terms:["memo-aac","memo-receptive-expressive","memo-joint-attention"]},
  {id:"refusal",group:"support",title:"특정 활동을 시작할 때 거부 행동이 반복돼요",observe:"행동 직전의 요구와 이후 주변 반응을 기록하기",try:"여러 차례의 ABC 기록을 비교해 기능 가설 검토하기",terms:["memo-abc-observation","memo-fba","memo-replacement-behavior"]},
  {id:"asking",group:"support",title:"도움이 필요할 때 말 대신 행동으로 표현해요",observe:"언제 누구에게 어떤 도움을 요청하려는지",try:"'도와주세요'를 말·그림 등 적절한 방식으로 표현해 보기",terms:["memo-replacement-behavior","memo-aac","memo-reinforcement"]},
  {id:"access",group:"support",title:"같은 수업 방식으로는 참여가 어려운 사람이 있어요",observe:"정보를 이해하거나 표현할 때 생기는 장벽 확인하기",try:"글·그림·음성·반응 방식에 선택지 마련하기",terms:["memo-udl","memo-visual-supports","memo-modeling"]}
];
const CONNECTION_MAPS=[
  {id:"executive",label:"실행과 점검",title:"계획하고, 해보고, 다시 점검하기",
   lead:"실행기능 관련 개념을 실제 과제 흐름에 연결해 봐요.",
   example:"숙제를 시작하기 전 순서를 정하고, 하면서 잘 진행되는지 확인하는 상황",
   note:"메타인지는 자신의 이해와 전략을 돌아보는 과정과도 연결되지만, 모든 과제가 같은 순서로 진행되는 것은 아니에요.",
   nodes:[["memo-executive","관련 기능"],["memo-planning-organization","과제 시작 전에 계획"],["memo-performance-monitoring","하는 중에 점검"],["memo-metacognition","방법을 돌아보고 조정"]]},
  {id:"memory",label:"기억과 작업기억",title:"기억하는 정보의 종류와 쓰임",
   lead:"짧게 붙잡아 두는 정보가 말소리인지, 위치·모양인지 비교해요.",
   example:"들은 숫자를 따라 말하기와, 방금 본 블록 위치 기억하기를 비교하는 상황",
   note:"단기기억과 작업기억은 서로 연관되지만 완전히 같은 개념은 아니며, 과제에는 여러 기능이 함께 관여할 수 있어요.",
   nodes:[["memo-short-term-memory","잠시 유지하는 정보"],["memo-working-memory","유지하면서 활용"],["memo-phonological-working-memory","말소리 정보를 다룰 때"],["memo-visuospatial-working-memory","위치·형태 정보를 다룰 때"]]},
  {id:"language",label:"언어와 이야기",title:"말의 뜻부터 이야기의 맥락까지",
   lead:"단어를 아는 것과 이야기를 이해·표현하는 것은 어떻게 다를까요?",
   example:"그림책의 사건을 이야기하고, 인물이 왜 그런 행동을 했는지 추측하는 상황",
   note:"어휘·문장 이해, 담화, 추론은 서로 영향을 주지만 어느 하나만으로 언어능력을 판단할 수 없어요.",
   nodes:[["memo-receptive-expressive","언어 이해·표현"],["memo-narrative-discourse","사건을 연결해 이야기"],["memo-inferential-comprehension","드러나지 않은 뜻 추론"],["memo-pragmatics","상황과 상대를 고려"]]},
  {id:"behavior",label:"행동 이해와 지원",title:"관찰 자료에서 지원 계획까지",
   lead:"행동 자체보다 언제, 어떤 맥락에서 나타나는지를 함께 살펴봐요.",
   example:"요구 과제 전후에 반복되는 행동을 여러 번 관찰한 뒤 지원을 계획하는 상황",
   note:"ABC 기록만으로 행동의 기능을 확정할 수 없어요. 기능평가는 다양한 자료와 가설 검토가 필요합니다.",
   nodes:[["memo-abc-observation","전후 상황 기록"],["memo-fba","여러 자료로 기능 가설 검토"],["memo-replacement-behavior","필요를 표현하는 대안 지도"],["memo-reinforcement","적절한 행동을 유지하도록 지원"]]},
  {id:"teaching",label:"수업과 접근성",title:"배우기 쉽게 설계하고, 필요한 도움 주기",
   lead:"다양한 학습자가 참여하고 표현할 수 있도록 수업 환경을 살펴봐요.",
   example:"같은 학습 목표를 글·그림으로 제시하고, 수행 단계를 시각적으로 안내하는 상황",
   note:"UDL은 촉구·시각지원 등 개별 교수 전략과 연결될 수 있지만, 서로 동일한 개념은 아니에요.",
   nodes:[["memo-udl","처음부터 선택지 설계"],["memo-visual-supports","정보를 눈으로 확인"],["memo-task-analysis","복잡한 활동을 나누기"],["memo-prompting","필요한 도움을 조정"]]}
];

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
    definition.appendChild(node("span","gcat-section-kicker","핵심 뜻"));
    definition.appendChild(node("h3","gcat-definition-headline",entry.subtitle));
    const core=original.querySelector(":scope > .study-core");
    if(core){
      const coreText=core.querySelector(":scope > p");
      if(coreText){
        coreText.classList.add("gcat-definition-explanation");
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
      section.appendChild(node("h3","gcat-section-heading","이렇게 생각하면 쉬워요"));
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
      const observations=node("div","gcat-situation-detail");
      observations.appendChild(node("strong",null,"살펴볼 점"));
      observations.appendChild(node("p",null,situation.observe));
      article.appendChild(observations);
      const application=node("div","gcat-situation-detail gcat-situation-application");
      application.appendChild(node("strong",null,"활용 예시"));
      application.appendChild(node("p",null,situation.try));
      article.appendChild(application);
      const footer=node("div","gcat-situation-terms");
      footer.appendChild(node("strong",null,"관련 개념"));
      const chips=node("div","gcat-term-chips");
      for(const id of situation.terms){const chip=termChip(id);if(chip)chips.appendChild(chip);}
      footer.appendChild(chips);
      article.appendChild(footer);
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
    for(let i=0;i<map.nodes.length;i++){
      const [id,relation]=map.nodes[i];
      if(i){
        const bridge=node("div","gcat-concept-bridge");
        bridge.appendChild(node("span",null,"↓"));
        bridge.appendChild(node("em",null,relation));
        flow.appendChild(bridge);
      }
      const entry=byId.get(id);
      if(!entry)continue;
      const button=node("button","gcat-concept-node");
      button.type="button";
      button.dataset.termId=id;
      button.appendChild(node("strong",null,entry.title));
      button.appendChild(node("small",null,i===0?"연결 출발점":relation));
      button.setAttribute("aria-label",entry.title+" 용어 설명 열기");
      button.addEventListener("click",()=>openTerm(id,button));
      flow.appendChild(button);
    }
    const explanation=node("div","gcat-concept-explanation");
    explanation.appendChild(node("span","gcat-situation-label","개념 연결"));
    explanation.appendChild(node("h3",null,map.title));
    explanation.appendChild(node("p","gcat-concept-lead",map.lead));
    const use=node("div","gcat-concept-usage");
    use.appendChild(node("strong",null,"실제 상황에 대입하면"));
    use.appendChild(node("p",null,map.example));
    explanation.appendChild(use);
    const note=node("div","gcat-concept-note");
    note.appendChild(node("strong",null,"구분해서 이해하기"));
    note.appendChild(node("p",null,map.note));
    explanation.appendChild(note);
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

/* 해봄노트 30개 용어 통합 탐색기
 * 원래 용어노트 설명/사례/출처는 DOM 원문에서 읽기만 한다.
 * 이미지 12장 자르기/재생성/잘라 확대 없음.
 */
(function(){
"use strict";
const CATEGORY=[
  {id:"featured",label:"먼저 보기"},
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
  "memo-memory":[["기억","memory"]],
  "memo-visual":[["시지각","visual-perception"]],
  "memo-auditory":[["청각처리","auditory-processing"]],
  "memo-receptive-expressive":[["수용언어","receptive-language"],["표현언어","expressive-language"]],
  "memo-aac":[["AAC","aac"]],
  "memo-prompting":[["촉구","prompting"]],
  "memo-reinforcement":[["강화","reinforcement"]]
};
const FEATURED=["memo-working-memory","memo-short-term-memory","memo-attention","memo-receptive-expressive","memo-aac","memo-reinforcement"];
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
  "memo-phonological-awareness":["memo-articulation-phonology","memo-auditory"]
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
  if(!tabs||!search||!list||!dialog)return;
  let active="featured";
  let recentIds=storageGet().filter(id=>byId.has(id));
  let lastOpener=null;

  function openTerm(id,opener){
    const entry=byId.get(id);
    if(!entry)return;
    if(opener)lastOpener=opener;
    recentIds=[id,...recentIds.filter(x=>x!==id)].slice(0,3);
    storageSave(recentIds);
    renderRecent();
    dialogTitle.textContent=entry.title;
    dialogBody.replaceChildren();
    dialogBody.appendChild(node("p","gcat-dialog-lead",entry.subtitle));
    dialogBody.appendChild(entry.content.cloneNode(true));
    if(entry.covers.length){
      const details=node("details","gcat-art-disclosure");
      const summary=node("summary",null,entry.covers.length>1?"승인한 손그림 2장 크게 보기 ▾":"손그림 크게 보기 ▾");
      const artPanel=node("div","gcat-art-panel");
      const art=node("img");
      art.width=1122;art.height=1402;art.decoding="async";
      art.loading="eager";
      const choose=index=>{
        const cover=entry.covers[index];
        art.src="../assets/glossary/cards/"+cover[1]+".webp";
        art.alt=cover[0]+" 손그림 원본";
        artPanel.querySelectorAll(".gcat-art-choices button").forEach((btn,i)=>btn.setAttribute("aria-pressed",String(i===index)));
      };
      details.appendChild(summary);
      if(entry.covers.length>1){
        const buttons=node("div","gcat-art-choices");
        entry.covers.forEach((cover,i)=>{
          const btn=node("button",null,cover[0]);
          btn.type="button";
          btn.setAttribute("aria-pressed",String(i===0));
          btn.addEventListener("click",()=>choose(i));
          buttons.appendChild(btn);
        });
        artPanel.appendChild(buttons);
      }
      artPanel.appendChild(art);
      details.appendChild(artPanel);
      dialogBody.appendChild(details);
      choose(0);
    }
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
  function makeCard(entry){
    const button=node("button","gcat-card");
    button.type="button";
    button.setAttribute("aria-label",entry.title+" 자세히 보기");
    button.dataset.id=entry.id;
    button.style.setProperty("--tint",TINT[entry.category]||"#fff0dd");
    const thumb=node("span","gcat-thumb");
    thumb.setAttribute("aria-hidden","true");
    if(entry.covers.length){
      const img=node("img");
      img.src="../assets/glossary/cards/"+entry.covers[0][1]+".webp";
      img.alt="";
      img.width=1122;
      img.height=1402;
      img.loading="lazy";
      img.decoding="async";
      thumb.appendChild(img);
    }else{
      thumb.appendChild(node("span","gcat-thumb-letter",entry.title.charAt(0)));
    }
    const copy=node("span","gcat-card-copy");
    copy.appendChild(node("span","gcat-card-title",entry.title));
    copy.appendChild(node("span","gcat-card-sub",entry.subtitle));
    const chevron=node("span","gcat-chevron","›");
    chevron.setAttribute("aria-hidden","true");
    button.append(thumb,copy,chevron);
    button.addEventListener("click",()=>openTerm(entry.id,button));
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
      const btn=node("button","gcat-tab",category.label);
      btn.type="button";
      btn.setAttribute("aria-pressed",String(category.id===active));
      btn.dataset.tab=category.id;
      btn.addEventListener("click",()=>{
        active=category.id;
        if(search.value)search.value="";
        render();
      });
      tabs.appendChild(btn);
    });
  }
  function render(){
    const q=search.value.trim().toLocaleLowerCase("ko");
    const qCompact=q.replace(/\s+/g,"");
    clear.hidden=!q;
    let visible;
    if(q){
      visible=entries.filter(entry=>entry.search.includes(q)||entry.search.replace(/\s+/g,"").includes(qCompact));
      resultsTitle.textContent="검색 결과";
    }else if(active==="featured"){
      visible=FEATURED.map(id=>byId.get(id)).filter(Boolean);
      resultsTitle.textContent="먼저 볼 용어";
    }else{
      visible=entries.filter(entry=>entry.category===active);
      resultsTitle.textContent=CATEGORY.find(category=>category.id===active).label;
    }
    count.textContent=visible.length+"개"+(q?" 찾음":"");
    list.replaceChildren(...visible.map(makeCard));
    noResults.hidden=visible.length!==0;
    renderTabs();
  }
  search.addEventListener("input",render);
  search.addEventListener("keydown",event=>{
    if(event.key==="Enter"){
      const first=list.querySelector(".gcat-card");
      if(first){event.preventDefault();first.click();}
    }
  });
  clear.addEventListener("click",()=>{search.value="";render();search.focus();});
  close.addEventListener("click",()=>dialog.close());
  dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener("close",()=>{if(lastOpener&&lastOpener.isConnected)lastOpener.focus({preventScroll:true});lastOpener=null;});
  renderRecent();
  render();
  // 기존 공유 링크 /notes/#memo-aac 등의 직접 방문도 지원.
  const target=decodeURIComponent(location.hash.slice(1));
  if(byId.has(target))openTerm(target);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
else boot();
})();

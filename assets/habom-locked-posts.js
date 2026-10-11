/* 승인된 공개용 정보만 렌더링합니다. Jotform 원문/첨부파일은 절대 요청하지 않습니다. */
(function(){
  "use strict";
  var host=document.getElementById("habomLockedPosts");
  var items=document.getElementById("habomLockedItems");
  var state=document.getElementById("habomLockedState");
  if(!host||!items||!state)return;

  var SAFE_STATUSES={"접수":true,"확인 중":true,"답변 완료":true};
  var SAFE_KINDS={"자료 요청":true,"정보 공유":true,"질문":true,"함께 만들기":true,"기타":true};
  function text(value,max){
    if(typeof value!=="string")return "";
    return value.trim().slice(0,max);
  }
  function safe(value){
    if(!value)return true;
    // 승인된 메타데이터에서도 연락처·식별 번호 등은 차단합니다.
    return !(/[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(value)
      ||/(\+?82[-.\s]?)?0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}/.test(value)
      ||/\b\d{6}[-\s]?[1-4]\d{6}\b/.test(value)
      ||/https?:\/\//i.test(value));
  }
  function element(tag,classname,value){
    var node=document.createElement(tag);
    if(classname)node.className=classname;
    if(value!=null)node.textContent=value;
    return node;
  }
  function valid(entry){
    if(!entry||entry.visibility!=="list"||entry.approved!==true)return false;
    if(entry.has_attachment!=null&&typeof entry.has_attachment!=="boolean")return false;
    if(entry.content!=null||entry.body!=null||entry.email!=null||entry.phone!=null
      ||entry.attachment!=null||entry.files!=null||entry.link!=null)return false;
    var title=text(entry.public_title,70);
    var author=text(entry.nickname_masked,16);
    if(!safe(title)||!safe(author))return false;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(entry.created_at||"")))return false;
    return true;
  }
  function render(entry){
    var card=element("article","hbl-item");
    var top=element("div","hbl-row");
    var lock=element("span","hbl-lock","🔒 비밀글");
    var when=element("time","hbl-date",entry.created_at);
    when.setAttribute("datetime",entry.created_at);
    top.append(lock,when);

    var title=element("h3","hbl-title",text(entry.public_title,70)||"비밀글입니다");
    var meta=element("div","hbl-meta");
    var kind=SAFE_KINDS[entry.category]?entry.category:"기타";
    var name=text(entry.nickname_masked,16)||"익명";
    // 닉네임은 이미 검토·마스킹된 값만 전달되어야 합니다.
    if(name!=="익명"&&!name.includes("*")&&!name.includes("＊"))name="익명";
    meta.append(element("span","",kind),element("span","","·"),element("span","",name));
    if(entry.has_attachment===true)meta.append(element("span","hbl-attachment","· 📎 첨부파일 있음"));
    var status=SAFE_STATUSES[entry.status]?entry.status:"접수";
    var foot=element("div","hbl-foot");
    foot.append(element("span","","내용과 첨부파일은 공개되지 않습니다."),element("span","hbl-status",status));
    card.append(top,title,meta,foot);
    items.append(card);
  }
  fetch(new URL("./locked-posts.json",location.href),{cache:"no-store"})
    .then(function(response){if(!response.ok)throw Error("metadata not available");return response.json()})
    .then(function(data){
      if(!data||!Array.isArray(data.posts))throw Error("invalid data");
      var approved=data.posts.filter(valid).slice(0,30);
      approved.sort(function(a,b){return b.created_at.localeCompare(a.created_at)});
      if(approved.length){
        host.hidden=false;
        state.hidden=true;
        approved.forEach(render);
      }else{
        state.textContent="현재 목록 공개가 승인된 비밀글이 없어요.";
      }
      host.dataset.loaded="true";
    })
    .catch(function(){
      state.textContent="잠금글 목록을 불러오지 못했어요. 잠시 후 다시 확인해 주세요.";
      host.dataset.loaded="error";
    });
})();

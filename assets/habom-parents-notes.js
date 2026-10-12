/* 찾아봄 관찰 메모: 로컬 파일 저장/불러오기만. 서버 전송·스토리지 자동 저장 없음. */
(()=>{
  "use strict";
  const form=document.getElementById("parentsObservationForm");
  if(!form)return;
  const keys=["when","where","what","beforeAfter","strengthsQuestions"];
  const inputs=keys.map(key=>form.elements.namedItem(key));
  const status=document.getElementById("parentsSaveStatus");
  const input=document.getElementById("parentsFile");
  let dirty=false;
  const setStatus=message=>{status.textContent=message;};
  const hasContent=()=>inputs.some(el=>el.value.trim().length>0);
  form.addEventListener("input",()=>{
    dirty=hasContent();
    setStatus(dirty?"작성 중이에요. 다른 페이지로 이동하기 전에 파일로 저장하세요.":"아직 작성한 내용이 없어요.");
  });
  document.getElementById("parentsPrint").addEventListener("click",()=>window.print());
  document.getElementById("parentsSave").addEventListener("click",()=>{
    if(!hasContent()){setStatus("먼저 한 가지 이상 내용을 적어주세요.");return;}
    const values=Object.fromEntries(keys.map((key,i)=>[key,inputs[i].value]));
    const data={format:"habom-observation",version:1,savedAt:new Date().toISOString(),values};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url;
    link.download="찾아봄-관찰메모-"+new Date().toISOString().slice(0,10)+".json";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    dirty=false;
    setStatus("파일 다운로드를 요청했어요. 기기의 다운로드 목록에서 저장됐는지 확인하세요. 이후 수정한 내용은 다시 저장해야 해요.");
  });
  document.getElementById("parentsLoad").addEventListener("click",()=>input.click());
  input.addEventListener("change",async()=>{
    const file=input.files?.[0];
    input.value="";
    if(!file)return;
    if(file.size>200000){setStatus("파일이 너무 커요. 이 페이지에서 저장한 관찰 메모 파일을 선택해주세요.");return;}
    try{
      const content=JSON.parse(await file.text());
      const valid=content?.format==="habom-observation"&&content.version===1&&
        content.values&&keys.every(key=>typeof content.values[key]==="string"&&content.values[key].length<=12000);
      if(!valid){setStatus("이 페이지에서 저장한 형식의 파일이 아니에요.");return;}
      if(hasContent()&&!window.confirm("지금 작성 중인 내용을 불러온 파일로 바꿀까요? 저장하지 않은 내용은 사라집니다."))return;
      keys.forEach((key,i)=>{inputs[i].value=content.values[key];});
      dirty=false;
      setStatus("파일 내용을 불러왔어요. 내용을 수정했다면 다시 저장해주세요.");
      form.scrollIntoView({behavior:"smooth",block:"start"});
    }catch{
      setStatus("파일을 읽지 못했어요. 올바른 관찰 메모 파일인지 확인해주세요.");
    }
  });
  // Browser native alert is best-effort only. Keep the visible notice even where no alert is shown.
  window.addEventListener("beforeunload",event=>{
    if(!dirty)return;
    event.preventDefault();
    event.returnValue="";
  });
})();

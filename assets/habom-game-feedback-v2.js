/* Game feedback launcher: no client-side collection; submission stays with Jotform. */
(function(){
'use strict';
if(document.getElementById('habomFeedbackLauncher'))return;
const src=document.currentScript?.src||'';
const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('habom-game-feedback-v2.css',src).href;document.head.appendChild(css);
const FORM='https://form.jotform.com/262983367931066';
const NAMES={rescue:'모아 구조대',memory:'기억꽃길 이어가기',spacing:'띄어쓰기 다리 놓기',spelling:'고장 난 간판 고치기',sameShape:'쌍둥이 모양 찾기',flower:'꽃만 쏙쏙 찾기',hide:'잎사귀 숨은친구',path:'반짝이 길 따라가기',calm:'초록불에 톡',inside:'정원 안에 별 심기',targets:'하나씩 깨우기',sceneDetect:'숲속 장면 탐정',slowScan:'꽃과 단서 찾기',slowPlace:'정원 지도 따라 놓기',slowBlock:'블록 건축가',slowName:'친구 이름 탐정',slowMemory:'꽃자리 기억하기',paint:'정원길 쓱싹 칠하기',water:'시든 꽃 깨우기',resetRescue:'꼬인 신호 구조대',classroomMove:'우리 교실 이사작전',festivalPlan:'축제 준비 대작전',rulePost:'바뀌는 바람우체국',mirrorPond:'거울연못의 비밀',slowEveryday:'가방 준비 탐험',moaMoney:'모아의 화폐 가게',moaChange:'바뀐 준비물 찾기',moaFeel:'마음 이야기 탐험',rhythmTouch:'박자꽃 톡톡',recorderPlay:'리코더 마법정원',breathStrength:'바람의 힘',breathLong:'오래 후',breathBeat:'박자 바람',handMirror:'모아의 마법 꽃밭'};
function currentGameId(){
 const p=new URLSearchParams(location.search),s=location.pathname;
 if(s.includes('/games/moa-missions/'))return {money:'moaMoney',change:'moaChange',feel:'moaFeel'}[p.get('game')]||'moaMoney';
 if(s.includes('/games/hand-mirror/'))return 'handMirror';
 if(s.includes('/games/rescue/'))return 'rescue';
 if(s.includes('/games/rhythm-touch/'))return 'rhythmTouch';
 if(s.includes('/recorder/'))return 'recorderPlay';
 if(s.includes('/breath-garden/'))return {strength:'breathStrength',long:'breathLong',beat:'breathBeat'}[p.get('mode')]||'breathStrength';
 if(p.get('game'))return p.get('game');
 try{if(typeof state==='object'&&state&&typeof state.game==='string')return state.game}catch(_){}
 return '';
}
function gameName(){return NAMES[currentGameId()]||document.title.split('|')[0].trim().slice(0,75)||'모아 게임'}

// Only public game metadata is sent; names, answers, clinical history, camera and raw image are not.
const API="https://miohovwmhmtcvkurjamm.supabase.co/functions/v1/moa-game-feedback";
const privateSelector='video,iframe,input,textarea,select,[contenteditable],[data-feedback-private],[data-private],[data-screenshot-exclude],[class*="camera" i],[id*="camera" i],[class*="webcam" i],[id*="webcam" i],[class*="profile" i],[id*="profile" i],[class*="nickname" i],[id*="nickname" i],img[src^="blob:"],img[src^="data:"]';
const sensitiveText=/(?:[가-힣]{2,5}\s*(?:어린이|학생|아동|님)|(?:\d{2,3}-\d{3,4}-\d{4})|(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(?:주소|연락처|학교명|학생\s*이름)\s*[:：])/;
let reportImage=null,session=0,previousFocus=null,feedbackBusy=false;
let lastMeta=null;
const feedbackUi=document.createElement("div");
feedbackUi.id="habomFeedbackV2";
feedbackUi.hidden=true;
feedbackUi.innerHTML='<div id="habomFeedbackV2Dialog" role="dialog" aria-modal="true" aria-labelledby="habomFeedbackV2Title">'+
 '<div class="habom-fb-top"><h2 id="habomFeedbackV2Title">이 화면 제보하기</h2><button type="button" id="habomFbClose" aria-label="닫고 게임 이어하기">×</button></div>'+
 '<p id="habomFbContext"></p>'+
 '<fieldset id="habomFbKinds"><legend>어떤 점을 알려줄까요?</legend>'+
 '<label><input type="radio" name="habomFeedbackKind" value="bug">버튼·화면이 이상해요</label>'+
 '<label><input type="radio" name="habomFeedbackKind" value="confusing">어떻게 할지 어려워요</label>'+
 '<label><input type="radio" name="habomFeedbackKind" value="idea">추가했으면 좋겠어요</label>'+
 '<label><input type="radio" name="habomFeedbackKind" value="other">그 밖의 이야기</label></fieldset>'+
 '<label class="habom-fb-note">더 알려줄 내용이 있나요? (안 적어도 돼요)<textarea id="habomFbDetails" maxlength="500" rows="2" placeholder="예: 세 번째 꽃을 눌렀는데 움직이지 않았어요"></textarea></label>'+
 '<div id="habomFbCapture"><div class="habom-fb-capture-head"><strong>현재 화면 캡처</strong><span id="habomFbCaptureStatus" role="status">준비 중…</span></div>'+
 '<canvas id="habomFbPreview" aria-label="자동 가림처리한 제보 화면. 마우스나 손가락으로 더 가릴 수 있습니다"></canvas>'+
 '<div class="habom-fb-capture-actions"><button type="button" id="habomFbReset">가림 다시 시작</button><button type="button" id="habomFbNoImage">사진 빼고 보내기</button></div>'+
 '<p class="habom-fb-small">카메라와 입력칸 등은 촬영 전 제외해요. 빠진 개인정보가 있으면 사진 위를 문질러 가려주세요. 얼굴·이름의 자동 탐지는 완벽하지 않아요.</p>'+
 '<label class="habom-fb-confirm"><input type="checkbox" id="habomFbReviewed">캡처를 확인했고, 사람 얼굴·이름 등 개인정보가 남아 있지 않아요</label></div>'+
 '<p class="habom-fb-warning" id="habomFbWarning" role="status"></p>'+
 '<div class="habom-fb-bottom"><button type="button" id="habomFbSubmit">보내고 게임 계속하기</button><a id="habomFbFallback" target="_blank" rel="noopener noreferrer">기존 제보 양식</a></div>'+
 '<p class="habom-fb-footnote">접수 내용과 확인한 캡처는 Supabase 비공개 저장소에 보관하고 검토해요. 자동으로 코드를 변경하지 않아요.</p>'+
 '</div>';
document.body.appendChild(feedbackUi);
const $fb=id=>document.getElementById(id);
const preview=$fb("habomFbPreview");
const ctx=preview.getContext("2d",{willReadFrequently:true});
function isVisible(el){if(!el||el.hidden)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=="hidden"&&getComputedStyle(el).display!=="none"}
function screenLabel(){
 const screens=[["#resultScreen","게임 결과"],["#results","게임 결과"],["#finishScreen","게임 결과"],["#successScreen","게임 결과"],["#finish","게임 결과"],["#introScreen","시작 안내"],["#gameScreen","게임 진행"],["#homeScreen","게임 선택"]];
 return screens.find(x=>isVisible(document.querySelector(x[0])))?.[1]||(location.pathname.includes("/games/rescue/")?"구조대 게임 화면":"진행 중인 화면");
}
function meta(){
 const id=currentGameId()||"unknown";
 return {gameId:id,gameName:gameName(),screenName:screenLabel(),
  round:(document.querySelector("#stageLabel")?.textContent||document.querySelector("#progressText")?.textContent||"").trim().slice(0,80),
  version:"feedback-v2-20261027",
  viewportWidth:innerWidth,viewportHeight:innerHeight};
}
const launcher=document.createElement("button");launcher.id="habomFeedbackLauncher";launcher.type="button";launcher.textContent="이 화면 제보";launcher.setAttribute("aria-haspopup","dialog");launcher.setAttribute("aria-controls","habomFeedbackV2");document.body.appendChild(launcher);
let activeRound=null;
function clearPreview(){reportImage=null;preview.width=1;preview.height=1;preview.style.display="none";$fb("habomFbReviewed").checked=false;$fb("habomFbCaptureStatus").textContent="캡처 없음";$fb("habomFbReset").disabled=true}
async function setImage(image,expectedSession){
 const maxWidth=900,scale=Math.min(1,maxWidth/image.width,850/image.height);
 preview.width=Math.max(1,Math.floor(image.width*scale));preview.height=Math.max(1,Math.floor(image.height*scale));
 ctx.clearRect(0,0,preview.width,preview.height);ctx.drawImage(image,0,0,preview.width,preview.height);
 if(typeof window.FaceDetector==="function"){
  try{
   const detector=new window.FaceDetector({fastMode:true,maxDetectedFaces:25});
   const faces=await detector.detect(preview);
   for(const face of faces){const b=face.boundingBox,pad=Math.max(12,Math.round(b.width*.2));ctx.fillStyle="#203b31";ctx.fillRect(Math.max(0,b.x-pad),Math.max(0,b.y-pad),b.width+pad*2,b.height+pad*2)}
  }catch(_){}
 }
 if(expectedSession!==session||feedbackUi.hidden)return;
 preview.style.display="block";$fb("habomFbCaptureStatus").textContent="카메라·입력칸 자동 가림 · 사진을 확인해 주세요";
 $fb("habomFbReset").disabled=false;
 // This canvas contains the privacy-scrubbed preview. No raw stage capture is sent to the server.
 reportImage=true;
}
function renderBlock(el){
 el.style.setProperty("visibility","hidden","important");
 el.style.setProperty("opacity","0","important");
}
function scrubDocument(doc){
 doc.querySelectorAll(privateSelector).forEach(renderBlock);
 const walker=doc.createTreeWalker(doc.body,NodeFilter.SHOW_TEXT);
 let node;while(node=walker.nextNode()){
  if(sensitiveText.test(node.textContent||""))node.textContent="[개인정보 가림]";
 }
}
function target(){
 const candidates=["#resultScreen","#results","#finishScreen","#successScreen","#finish","#gameWorld","#gameScreen","#practiceScreen","#homeScreen","main"];
 return candidates.map(q=>document.querySelector(q)).find(isVisible)||document.body;
}
function loadCaptureLibrary(){
 if(window.html2canvas)return Promise.resolve(window.html2canvas);
 return new Promise((resolve,reject)=>{
  const script=document.createElement("script");
  script.src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
  script.referrerPolicy="no-referrer";script.crossOrigin="anonymous";
  script.onload=()=>window.html2canvas?resolve(window.html2canvas):reject(Error("capture library unavailable"));
  script.onerror=()=>reject(Error("capture library blocked"));
  document.head.appendChild(script);
  setTimeout(()=>{if(!window.html2canvas)reject(Error("capture timeout"))},10000);
 });
}
async function capturePhaser(){
 const game=window.moaRescueGame;
 if(!game?.renderer?.snapshot)return null;
 return new Promise(resolve=>{
  const timeout=setTimeout(()=>resolve(null),2500);
  try{game.renderer.snapshot(image=>{clearTimeout(timeout);resolve(image instanceof HTMLImageElement||image instanceof HTMLCanvasElement?image:null)})}
  catch(_){clearTimeout(timeout);resolve(null)}
 });
}
async function captureCurrent(mySession){
 try{
  // Camera-based hand tracking and private journal pages are NEVER screenshotted.
  if(location.pathname.includes("/games/hand-mirror/")||document.querySelector('video[srcObject]'))throw Error("camera_screen_protected");
  let shot=null;
  if(location.pathname.includes("/games/rescue/"))shot=await capturePhaser();
  if(!shot){
   const screenshot=await loadCaptureLibrary();
   shot=await screenshot(target(),{backgroundColor:"#f8f9f2",scale:Math.min(1.3,900/Math.max(1,target().getBoundingClientRect().width)),useCORS:false,allowTaint:false,logging:false,
    ignoreElements:e=>e.id==="habomFeedbackLauncher"||e.id==="habomFeedbackV2"||e.hasAttribute("data-screenshot-exclude"),
    onclone:scrubDocument});
  }
  if(mySession!==session||feedbackUi.hidden)return;
  await setImage(shot,mySession);
 }catch(err){
  if(mySession!==session)return;
  clearPreview();
  $fb("habomFbCaptureStatus").textContent=err.message==="camera_screen_protected"?"카메라 사용 게임은 화면 캡처를 보호해요":"이 화면은 안전하게 캡처할 수 없어 사진 없이 제보해요";
 }
}
async function begin(){
 if(feedbackBusy)return;
 previousFocus=document.activeElement;const mySession=++session;
 lastMeta=meta();activeRound=lastMeta.round;
 feedbackUi.hidden=false;
 $fb("habomFbContext").textContent=lastMeta.gameName+" · "+lastMeta.screenName+(lastMeta.round?" · "+lastMeta.round:"");
 $fb("habomFbWarning").textContent="";
 $fb("habomFbDetails").value="";
 feedbackUi.querySelectorAll('input[name="habomFeedbackKind"]').forEach(r=>r.checked=false);
 clearPreview();$fb("habomFbCaptureStatus").textContent="화면을 안전하게 준비하고 있어요…";
 $fb("habomFbFallback").href="https://form.jotform.com/262983367931066?"+new URLSearchParams({q2_textbox0:lastMeta.gameName});
 $fb("habomFbClose").focus();
 captureCurrent(mySession);
}
function close(){
 session++;feedbackUi.hidden=true;clearPreview();feedbackBusy=false;
 $fb("habomFbSubmit").disabled=false;$fb("habomFbSubmit").textContent="보내고 게임 계속하기";
 if(previousFocus?.isConnected)previousFocus.focus();
}
function imgJPEG(){
 let scale=1;
 const scratch=document.createElement("canvas");
 while(scale>0.25){
  scratch.width=Math.max(80,Math.round(preview.width*scale));
  scratch.height=Math.max(80,Math.round(preview.height*scale));
  scratch.getContext("2d").drawImage(preview,0,0,scratch.width,scratch.height);
  for(const quality of [.7,.5,.32]){
   const data=scratch.toDataURL("image/jpeg",quality);
   if(data.length<239000)return data;
  }
  scale*=.75;
 }
 throw Error("image_too_large");
}
async function submit(){
 if(feedbackBusy)return;
 const kind=feedbackUi.querySelector('input[name="habomFeedbackKind"]:checked')?.value;
 if(!kind){$fb("habomFbWarning").textContent="어떤 이야기인지 하나만 골라주세요";return}
 const attached=!!reportImage;
 if(attached&&!$fb("habomFbReviewed").checked){$fb("habomFbWarning").textContent="사진에 개인정보가 없는지 확인하거나 ‘사진 빼고 보내기’를 눌러주세요";return}
 const payload={...lastMeta,kind,description:$fb("habomFbDetails").value.slice(0,500),imageReviewed:attached};
 if(attached){try{payload.screenshot=imgJPEG()}catch(_){$fb("habomFbWarning").textContent="사진을 더 작게 만들 수 없어 첨부하지 못했어요. 사진 빼고 보내기를 눌러주세요";return}}
 feedbackBusy=true;$fb("habomFbSubmit").disabled=true;$fb("habomFbSubmit").textContent="보내는 중…";$fb("habomFbWarning").textContent="";
 try{
  const res=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
  const result=await res.json().catch(()=>({}));
  if(!res.ok||!result.ok)throw Error(result.error||"submit_failed");
  $fb("habomFbWarning").textContent="고마워요! 접수됐어요. 게임으로 돌아갈게요.";
  setTimeout(()=>{if(!feedbackUi.hidden)close()},1050);
 }catch(_){
  $fb("habomFbWarning").textContent="접수 완료를 확인할 수 없어요. 다시 보내면 중복 접수될 수 있어요. 기존 제보 양식을 이용할 수도 있습니다.";
  feedbackBusy=false;$fb("habomFbSubmit").disabled=false;$fb("habomFbSubmit").textContent="다시 보내기";
 }
}
$fb("habomFbClose").addEventListener("click",close);
$fb("habomFbSubmit").addEventListener("click",submit);
$fb("habomFbNoImage").addEventListener("click",()=>{session++;clearPreview();$fb("habomFbCaptureStatus").textContent="사진 제외됨 · 글로만 제보해요"});
$fb("habomFbReset").addEventListener("click",()=>{clearPreview();$fb("habomFbCaptureStatus").textContent="화면을 다시 준비하고 있어요…";captureCurrent(session)});
feedbackUi.addEventListener("keydown",e=>{if(e.key==="Escape"&&!feedbackBusy){e.preventDefault();close()}});
feedbackUi.addEventListener("click",e=>{if(e.target===feedbackUi&&!feedbackBusy)close()});
// Scrub paint is opaque (safer than reversible blur), done locally before image transmission.
let markStart=null;
function pos(e){const r=preview.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*preview.width,y:(e.clientY-r.top)/r.height*preview.height}}
preview.addEventListener("pointerdown",e=>{if(!reportImage)return;markStart=pos(e);preview.setPointerCapture(e.pointerId)});
preview.addEventListener("pointerup",e=>{
 if(!markStart||!reportImage)return;
 const end=pos(e),x=Math.min(markStart.x,end.x),y=Math.min(markStart.y,end.y);
 const w=Math.max(18,Math.abs(end.x-markStart.x)),h=Math.max(18,Math.abs(end.y-markStart.y));
 ctx.fillStyle="#203b31";ctx.fillRect(x,y,w,h);markStart=null;$fb("habomFbReviewed").checked=false;
});
preview.addEventListener("pointercancel",()=>markStart=null);
launcher.addEventListener("click",begin);
function attachFinish(){
 const slots=["#resultScreen .result-actions","#resultScreen .resultActions","#results .resultActions","#finish .start-actions","#finishScreen .action-row",".result .action-row","#successScreen"];
 const mount=slots.map(s=>document.querySelector(s)).find(Boolean);
 if(mount&&!document.getElementById("habomFeedbackAtFinish")){
  const b=document.createElement("button");b.type="button";b.id="habomFeedbackAtFinish";b.textContent="피드백 남기기";b.addEventListener("click",begin);mount.appendChild(b);
 }
}
function rescueFinish(){
 if(!location.pathname.includes("/games/rescue/"))return;
 const root=document.querySelector(".game-frame");if(!root)return;
 let button=document.getElementById("habomFeedbackRescueFinish");
 if(!button){button=document.createElement("button");button.id="habomFeedbackRescueFinish";button.type="button";button.textContent="피드백 남기기";button.addEventListener("click",begin);root.appendChild(button)}
 let finished=false;
 try{finished=!!window.moaRescueGame?.scene?.getScenes?.(true)?.some(s=>["result","landresult"].includes(s?.sys?.settings?.key))}catch(_){}
 button.hidden=!finished;
}
attachFinish();const observer=new MutationObserver(attachFinish);observer.observe(document.body,{subtree:true,childList:true});
const timer=location.pathname.includes("/games/rescue/")?setInterval(rescueFinish,1100):null;
window.addEventListener("pagehide",()=>{observer.disconnect();if(timer)clearInterval(timer)});
})();

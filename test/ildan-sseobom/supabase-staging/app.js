const $=(id)=>document.getElementById(id);const app=$('app'),account=$('account');
let me=null,records=[],students=[],therapists=[],view='login',drive={connected:false,configured:false};
let activeView='write';
const sanitize=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const hint=(s)=>`<div class="callout">${s}</div>`;
function toast(s){$('toast').textContent=s;$('toast').classList.add('visible');setTimeout(()=>$('toast').classList.remove('visible'),3400)}
import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.105.0/+esm';
const CFG=window.ILDAN_SUPABASE_CONFIG||{};
const configured=Boolean(/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(CFG.url||'')
 && /^sb_publishable_|^eyJ/.test(CFG.publishableKey||'')
 && /^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/ildan-api$/.test(CFG.apiUrl||''));
const supabase=configured?createClient(CFG.url,CFG.publishableKey,{
 auth:{persistSession:true,storage:window.sessionStorage,autoRefreshToken:true,detectSessionInUrl:false,experimental:{passkey:true}}
 } ):null;

const invitationParams=new URLSearchParams(location.hash.replace(/^#/,''));
let activeInvite=/^[0-9a-f]{64}$/.test(invitationParams.get('invite')||'')?invitationParams.get('invite'):null;
const inviteRoles={student:'학생',parent:'보호자'};
const canUsePasskey=()=>window.isSecureContext&&!!window.PublicKeyCredential&&!!navigator.credentials?.get;
function invitationUrl(code){
 if(!/^[0-9a-f]{64}$/.test(code))throw Error('초대코드가 유효하지 않습니다.');
 const url=new URL(location.href);
 url.search='';url.hash='invite='+code;
 return url.href;
}
async function publicInviteApi(path,code){
 if(!supabase)throw Error('Supabase 연결 정보를 확인할 수 없습니다.');
 const result=await fetch(CFG.apiUrl+'/'+path,{
  method:'POST',mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',
  headers:{'Content-Type':'application/json',apikey:CFG.publishableKey},
  body:JSON.stringify({code})
 });
 const data=await result.json().catch(()=>({}));
 if(!result.ok)throw Error(data.error||'초대 링크를 확인할 수 없습니다.');
 return data;
}
async function inviteLanding(){
 header();
 const code=activeInvite;
 if(!code){loginScreen();return;}
 app.innerHTML=`<section class="login-page invite-landing" aria-label="일단써봄 초대 링크">
  <div class="login-heading"><span class="eyebrow">WELCOME / 초대 링크</span>
  <h1>내 공간에<br><em>들어가기.</em></h1>
  <p>학생과 보호자의 기록 공간은 서로 분리돼 있어요.</p></div>
  <section class="login-window"><div class="login-body">
   <h2 id="inviteRoleTitle">초대 링크를 확인하고 있어요.</h2>
   <p id="inviteIntro" class="muted">이 화면을 열었다고 바로 등록되지는 않아요.</p>
   <p class="callout">처음 한 번 기기를 등록하면 이후 같은 브라우저에서는 간편하게 접속할 수 있어요.
   카카오톡에서 열려도 괜찮지만, 기기 인증이 지원되지 않으면 크롬·삼성 인터넷·사파리에서 열어 주세요.</p>
   <div class="buttons"><button class="button" id="inviteAccept" disabled>기기 등록하고 시작</button>
     <button class="button-ghost" id="inviteCopy" type="button">다른 브라우저에서 열 링크 복사</button></div>
   <p id="inviteStatus" class="muted" role="status" aria-live="polite"></p>
   <p class="muted">보호자 링크를 학생에게 전달해도 학생 화면이 되지는 않아요.
     링크는 한 번만 등록할 수 있으며, 분실 시 치료사에게 다시 발급받아야 합니다.</p>
  </div></section></section>`;
 $('inviteCopy').onclick=()=>navigator.clipboard.writeText(invitationUrl(code))
  .then(()=>toast('링크를 복사했습니다. 기본 브라우저에 붙여 넣어 주세요.'))
  .catch(()=>toast('이 브라우저에서는 복사가 제한됩니다. 브라우저 메뉴에서 링크 복사를 이용해 주세요.'));
 try{
  const meta=await publicInviteApi('invite-preview',code);
  $('inviteRoleTitle').textContent=(inviteRoles[meta.role]||'사용자')+' 전용 초대입니다.';
  $('inviteIntro').textContent='초대 링크를 받은 사람이 직접 처음 등록한 뒤에는 자신의 기록만 볼 수 있어요.';
  $('inviteStatus').textContent=!meta.registrationOpen
   ?'현재 최초 등록 기능을 안전 점검 중입니다. 링크 확인만 가능하며 등록은 아직 열리지 않았습니다.'
   :canUsePasskey()?'기기 인증을 진행할 수 있어요. 등록하기를 누르면 1회용 링크가 사용됩니다.'
    :'이 브라우저에서는 기기 인증이 지원되지 않을 수 있어요. 기본 브라우저에서 열어 주세요.';
  $('inviteAccept').disabled=!meta.registrationOpen||!canUsePasskey();
  $('inviteAccept').onclick=()=>loading($('inviteAccept'),async()=>{
    const r=await publicInviteApi('invite-register',code);
    const authResult=await supabase.auth.verifyOtp({token_hash:r.tokenHash,type:'magiclink'});
    if(authResult.error)throw Error('최초 로그인 처리에 실패했습니다. 담당 치료사에게 문의해 주세요.');
    activeInvite=null;history.replaceState(null,'',location.pathname+location.search);
    const passkeyResult=await supabase.auth.registerPasskey();
    if(passkeyResult.error){
      toast('기기 인증 등록에 실패했어요. 다른 기기로 접속하려면 담당 치료사에게 도움을 요청해 주세요.');
      await refreshAuth();return;
    }
    toast('기기 인증을 등록했어요. 이제 내 기록 공간으로 들어갑니다.');
    await refreshAuth();
  });
 }catch(e){$('inviteRoleTitle').textContent='초대 링크를 사용할 수 없습니다.';
   $('inviteStatus').textContent=e.message;$('inviteAccept').disabled=true;
 }
}
async function api(path,{method='GET',body}={}){
 if(!supabase)throw Error('Supabase 계정 연결 전입니다. 실제 정보를 입력할 수 없습니다.');
 const {data:{session},error}=await supabase.auth.getSession();
 if(error||!session?.access_token)throw Error('로그인이 필요합니다.');
 const headers={Authorization:'Bearer '+session.access_token,apikey:CFG.publishableKey};
 if(method!=='GET')headers['Content-Type']='application/json';
 const res=await fetch(CFG.apiUrl+'/'+path,{
  method,mode:'cors',credentials:'omit',headers,
  ...(method==='GET'?{}:{body:JSON.stringify(body??{})})
 });
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw Error(data.error||'연결 실패');
 return data;
}
function formValue(form,name){return form.elements[name]?.value?.trim()??''}
function header(){if(!me){account.innerHTML='<span class="role-chip">안전한 기록</span>';return}account.innerHTML=`<span>${sanitize(me.nickname)} <span class="role-chip">${me.role==='therapist'?'치료사':me.role==='student'?'학생':me.role==='parent'?'학부모':'관리자'}</span></span><button id="signOut">로그아웃</button>`;$('signOut').onclick=async()=>{if(supabase)await supabase.auth.signOut();me=null;records=[];activeView='write';render();};}
function hero(t,d){return `<div class="hero"><div class="eyebrow">WORKSPACE / ${sanitize(me?.role||'START')}</div><h1>${t}</h1><p>${d}</p></div>`;}
function loading(btn,task){btn.disabled=true;Promise.resolve(task()).catch(e=>toast(e.message)).finally(()=>btn.disabled=false)}
// The same passkey flow serves students, parents, therapists and administrators.
// Fingerprints/faces/PIN remain inside the device and are never sent to this page.
const fromB64=s=>Uint8Array.from(atob(String(s).replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(String(s).length/4)*4,'=')),c=>c.charCodeAt(0));
const toB64=x=>btoa(String.fromCharCode(...new Uint8Array(x))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
function passkeyAvailable(){return window.isSecureContext&&typeof PublicKeyCredential!=='undefined'&&!!navigator.credentials?.create&&!!navigator.credentials?.get;}
function createOptions(json){
 if(typeof PublicKeyCredential.parseCreationOptionsFromJSON==='function')return PublicKeyCredential.parseCreationOptionsFromJSON(json);
 return {...json,challenge:fromB64(json.challenge),user:{...json.user,id:fromB64(json.user.id)},excludeCredentials:(json.excludeCredentials||[]).map(x=>({...x,id:fromB64(x.id)}))};
}
function requestOptions(json){
 if(typeof PublicKeyCredential.parseRequestOptionsFromJSON==='function')return PublicKeyCredential.parseRequestOptionsFromJSON(json);
 return {...json,challenge:fromB64(json.challenge),allowCredentials:(json.allowCredentials||[]).map(x=>({...x,id:fromB64(x.id)}))};
}
function credentialPayload(cred){
 if(typeof cred.toJSON==='function')return cred.toJSON();
 const response=cred.response;
 const common={id:cred.id,rawId:toB64(cred.rawId),type:cred.type,clientExtensionResults:cred.getClientExtensionResults()};
 if(response.attestationObject)return {...common,response:{clientDataJSON:toB64(response.clientDataJSON),attestationObject:toB64(response.attestationObject),transports:response.getTransports?.()||[]}};
 return {...common,response:{clientDataJSON:toB64(response.clientDataJSON),authenticatorData:toB64(response.authenticatorData),signature:toB64(response.signature),userHandle:response.userHandle?toB64(response.userHandle):undefined}};
}
function errorPasskey(e){if(e?.name==='NotAllowedError')return '인증이 취소되었어요. 다시 로그인하기를 눌러주세요.';if(e?.name==='NotSupportedError'||e?.name==='SecurityError')return '이 기기에서는 패스키를 사용할 수 없습니다. 최신 브라우저의 HTTPS 연결을 확인해 주세요.';return e?.message||'본인 확인에 실패했습니다.';}
// Role is solely a navigation hint. The server decides access from verified session identity.
let chosenRole='student';
const roleNames={student:'학생',parent:'학부모',therapist:'치료사'};
function rolePicker(){return `<div class="role-picker" role="group" aria-label="사용자 구분 선택">
  <button type="button" data-login-role="student" class="role-choice${chosenRole==='student'?' active':''}" aria-pressed="${chosenRole==='student'}"><span class="role-glyph" aria-hidden="true">{ }</span><strong>학생</strong><small>내 기록</small></button>
  <button type="button" data-login-role="parent" class="role-choice${chosenRole==='parent'?' active':''}" aria-pressed="${chosenRole==='parent'}"><span class="role-glyph" aria-hidden="true">//</span><strong>학부모</strong><small>관찰·전달</small></button>
  <button type="button" data-login-role="therapist" class="role-choice${chosenRole==='therapist'?' active':''}" aria-pressed="${chosenRole==='therapist'}"><span class="role-glyph" aria-hidden="true">&lt;/&gt;</span><strong>치료사</strong><small>공유 기록</small></button>
 </div>`;}
// All roles use a registered device passkey. Phone numbers are never used as
// unauthenticated account secrets. No SMS or email challenge is sent here.
function clinicianPendingScreen(user){
 const id=String(user?.id||'');
 app.innerHTML=`<section class="login-page"><section class="login-window"><div class="login-body">
 <h2>계정 연결 확인 중</h2>
 <p>기기 인증이 되었어도 학생·보호자·치료사 권한은 자동으로 만들어지지 않습니다.
 담당자가 실제 사용자와 역할을 확인한 뒤 계정을 연결해야 합니다.</p>
 <label>내 계정 식별번호<input readonly id="clinicianVerifiedUid" value="${sanitize(id)}"></label>
 <p class="muted">이 번호를 공개 게시판에 올리지 마세요. 실제 학생·보호자 상담기록은 아직 저장할 수 없습니다.</p>
 <div class="buttons"><button id="clinicianRecheck" class="button" type="button">권한 다시 확인</button>
 <button id="clinicianSignOut" class="button-ghost" type="button">로그아웃</button></div>
 </div></section></section>`;
 $('clinicianRecheck').onclick=()=>refreshAuth();
 $('clinicianSignOut').onclick=async()=>{await supabase.auth.signOut();me=null;render()};
}
function loginScreen(){
 app.innerHTML=`<section class="login-page"><div class="login-heading"><span class="eyebrow">일단써봄 / PRIVATE</span>
 <h1>내 기록 공간에<br><em>로그인하기.</em></h1>
 <p>학생·보호자·치료사 모두 등록한 휴대전화에서 간편하게 로그인할 수 있어요.</p></div>
 <div class="login-layout"><section class="login-window"><div class="login-body">
 <h2>휴대전화로 로그인</h2>
 <p class="muted">문자 인증번호나 이메일은 받지 않습니다. 최초에 승인받아 등록한 기기로 지문·얼굴·기기 PIN 인증을 진행해요.</p>
 <button class="button" type="button" id="loginPasskey">휴대전화 기기 인증으로 로그인</button>
 <p class="muted" id="passkeySupportStatus" role="status"></p>
 <div class="callout"><strong>처음 사용하는 경우</strong>
 <p>학생·보호자: 담당 치료사가 보낸 개인별 링크를 열어 등록합니다.</p>
 <p>치료사: 운영자의 신원 확인과 계정 승인 후 최초 기기를 등록합니다.
 아직 치료사 첫 등록 기능은 검증 중이며, 휴대전화번호 입력만으로 치료사 권한을 발급하지 않습니다.</p>
 </div>
 <p class="muted">카카오톡에서 열었던 초대 링크는 기본 브라우저로 복사해 열 수 있습니다.
 브라우저가 달라지면 별도로 기기 인증이 필요할 수 있어요.</p>
 <p class="muted">개발용 검증 화면입니다. 실제 아동·상담 자료는 입력하지 마세요.</p>
 </div></section></div></section>`;
 const login=$('loginPasskey');
 login.disabled=!configured||!canUsePasskey();
 $('passkeySupportStatus').textContent=!configured
  ?'서버 연결 설정을 확인하고 있어요.'
  :!canUsePasskey()?'현재 브라우저는 기기 인증을 지원하지 않습니다. 크롬·삼성 인터넷·사파리에서 열어 주세요.'
  :'등록된 기기가 있으면 아래 인증 화면으로 연결됩니다. 처음 등록하는 계정은 운영자 승인이 필요합니다.';
 login.onclick=()=>loading(login,async()=>{
  const {error}=await supabase.auth.signInWithPasskey();
  if(error)throw Error('기기 인증에 실패했습니다. 패스키가 등록되었는지, Supabase의 패스키 기능이 켜져 있는지 확인해 주세요.');
  await refreshAuth();
 });
}
function enrollmentScreen(){
 app.innerHTML=`<div class="login-page"><section class="login-window"><div class="login-body">
 <h2>초대코드 등록</h2><p>기기 로그인은 확인됐지만 기관 역할 등록 전입니다. 담당 치료사에게 전달받은 일회용 코드를 입력하세요. 코드를 모르면 기록에 접근할 수 없습니다.</p>
 <form id="claimForm" class="form"><label>초대코드<input name="code" autocomplete="off" required minlength="32" maxlength="128"></label><button type="submit" class="button">계정 연결하기</button></form>
 <button type="button" id="claimLogout" class="button-ghost">로그아웃</button>
 <p class="muted">치료사 계정은 운영자가 실제 신원을 확인한 뒤 Supabase 관리 화면에서 직접 등록해야 합니다.</p>
 </div></section></div>`;
 $('claimForm').onsubmit=e=>{e.preventDefault();const form=e.currentTarget;loading(form.querySelector('button'),async()=>{
  await api('claim-invite',{method:'POST',body:{code:formValue(form,'code')}});
  await refreshAuth();
 })};
 $('claimLogout').onclick=async()=>{await supabase.auth.signOut();me=null;render()};
}
async function refreshAuth(){
 if(!supabase){me=null;render();return;}
 const {data:{session}}=await supabase.auth.getSession();
 if(!session){me=null;if(activeInvite)await inviteLanding();else render();return;}
 try{me=(await api('me')).user;activeView=me.role==='therapist'?'inbox':'write';render();}
 catch{
  me=null;header();
  const {data:{user}}=await supabase.auth.getUser();
  clinicianPendingScreen(user);
 }
}
function workspaceNav(items, selected){
 return `<nav class="workspace-nav" aria-label="내 공간 메뉴">${items.map(([id,ico,name,sub])=>`<button type="button" data-workspace-target="${id}" class="workspace-link${selected===id?' selected':''}" aria-current="${selected===id?'page':'false'}"><span class="w-icon" aria-hidden="true">${ico}</span><span class="w-copy"><strong>${name}</strong><small>${sub}</small></span></button>`).join('')}</nav>`;
}
function activateWorkspace(next){
 const views=[...document.querySelectorAll('[data-workspace-view]')];
 if(!views.some(x=>x.dataset.workspaceView===next)) next=views[0]?.dataset.workspaceView || next;
 activeView=next;
 views.forEach(el=>{el.hidden=el.dataset.workspaceView!==next});
 document.querySelectorAll('[data-workspace-target]').forEach(el=>{
  const isCurrent=el.dataset.workspaceTarget===next;
  el.classList.toggle('selected',isCurrent);
  el.setAttribute('aria-current',isCurrent?'page':'false');
 });
}
function bindWorkspace(){
 document.querySelectorAll('[data-workspace-target]').forEach(b=>b.addEventListener('click',()=>{
  activateWorkspace(b.dataset.workspaceTarget);paintSketches();if(me?.role==='parent'&&activeView==='calendar')renderParentCalendar();
  if(window.innerWidth<741)document.querySelector('.workspace-content')?.scrollIntoView({behavior:'smooth',block:'start'});
 }));
 activateWorkspace(activeView);
}
const NOTE_LABELS={childWords:'아이가 실제로 한 말',studentReport:'학생이 직접 말한 내용',parentReport:'보호자가 전한 내용',functionalImpact:'일상에서 확인된 영향',familyResponse:'가족·주변의 반응',workingHypothesis:'잠정적 이해·가설',alternatives:'다른 설명 가능성',uncertainty:'아직 확인되지 않은 점',burdenReview:'기록 사용 부담 검토',erpReview:'ERP 회기 검토 여부',erpTarget:'ERP 치료 목표·계획 (치료사 전용)',erpSafety:'ERP 경과·안전 검토',cbitReview:'CBIT 회기 검토 여부',cbitTarget:'CBIT 치료 목표·계획 (치료사 전용)',cbitContext:'틱 관련 맥락·기능 영향',note:'자유 기록',mood:'오늘의 상태',energy:'컨디션',thought:'떠오른 생각',body:'몸의 느낌',action:'해본 일',sketch:'그림',observation:'관찰한 사실',response:'주변 사람의 말·행동',impact:'일상에서 확인된 변화',message:'전달사항',event:'있었던 일',next:'다음 시도',date:'기록 날짜',time:'기록 시간',context:'당시 상황',origin:'정보 출처',title:'제목',experience:'내가 겪은 움직임·소리·반복행동',experienceImpact:'그때 생활에 있었던 변화',place:'장소',signals:'관찰한 모습(선택)',after:'이후에 이어진 일',abcBefore:'그전에 있었던 일 (A)',abcBehavior:'그때 실제로 한 말·행동 (B)',abcAfter:'그 직후에 있었던 일 (C)'};
function todayLocal(){const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;}
function nowLocalTime(){const d=new Date(),p=n=>String(n).padStart(2,'0');return `${p(d.getHours())}:${p(d.getMinutes())}`;}
/* Parent calendar v8: event date, not the entry creation timestamp. */
let parentCalendarMode='month',parentCalendarDate=todayLocal();
function isoDay(d){const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;}
function parseIsoDay(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s||'')))return null;const [y,m,d]=s.split('-').map(Number),v=new Date(y,m-1,d,12);return v.getFullYear()===y&&v.getMonth()===m-1&&v.getDate()===d?v:null;}
function dayShift(date,amount){const d=parseIsoDay(date)||new Date();d.setDate(d.getDate()+amount);return isoDay(d);}
function monthShift(date,amount){const d=parseIsoDay(date)||new Date();const orig=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+amount);const max=new Date(d.getFullYear(),d.getMonth()+1,0,12).getDate();d.setDate(Math.min(orig,max));return isoDay(d);}
function parentRecordDay(record){const day=record.entry?.date;if(parseIsoDay(day))return day;const created=new Date(record.createdAt);return Number.isNaN(created.valueOf())?todayLocal():isoDay(created);}
function parentCalendarHTML(){return `<div class="editor-bar"><span class="ide-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>calendar / my-notes</span><span class="editor-status">PRIVATE</span></div>
 <div class="editor-paper parent-calendar-wrap"><span class="tag">MY RECORDS</span><h2>생활 기록 달력</h2><p class="parent-calendar-caption">일이 있었던 날을 기준으로 보여요. 기록이 없는 날은 그대로 비워둬요.</p>
 <div class="calendar-toolbar"><div class="calendar-modes" role="group" aria-label="달력 보기 방식"><button type="button" data-cal-mode="month">월</button><button type="button" data-cal-mode="week">주</button><button type="button" data-cal-mode="day">일</button></div><div class="calendar-date-nav"><button type="button" data-cal-prev aria-label="이전 기간">‹</button><strong id="calendarPeriod" aria-live="polite"></strong><button type="button" data-cal-next aria-label="다음 기간">›</button><button type="button" class="calendar-today" data-cal-today>오늘</button></div></div>
 <div id="calendarOverview" aria-label="기록 달력"></div><div id="calendarDayDetails" class="calendar-details"></div></div>`;}
function renderParentCalendar(){
 const root=$('parentCalendar');if(!root||me?.role!=='parent')return;
 if(!parseIsoDay(parentCalendarDate))parentCalendarDate=todayLocal();
 const selected=parseIsoDay(parentCalendarDate),ym=selected.getFullYear(),mm=selected.getMonth(),index=new Map();
 records.filter(r=>r.kind==='parent').forEach(r=>{const date=parentRecordDay(r);if(!index.has(date))index.set(date,[]);index.get(date).push(r)});
 root.querySelectorAll('[data-cal-mode]').forEach(b=>{const on=b.dataset.calMode===parentCalendarMode;b.classList.toggle('current',on);b.setAttribute('aria-pressed',String(on))});
 const period=$('calendarPeriod'),overview=$('calendarOverview'),detail=$('calendarDayDetails'),weekdays=['월','화','수','목','금','토','일'];
 const monday=new Date(selected);monday.setDate(selected.getDate()-(selected.getDay()+6)%7);
 const weekEnd=new Date(monday);weekEnd.setDate(monday.getDate()+6);
 const dateLabel=d=>`${d.getMonth()+1}월 ${d.getDate()}일`;
 if(parentCalendarMode==='month')period.textContent=`${ym}년 ${mm+1}월`;
 else if(parentCalendarMode==='week')period.textContent=`${dateLabel(monday)} – ${dateLabel(weekEnd)}`;
 else period.textContent=`${ym}년 ${dateLabel(selected)}`;
 const weekday=(d)=>weekdays[(d.getDay()+6)%7];
 const dayButton=(d,isMonth)=>{const iso=isoDay(d),n=index.get(iso)?.length||0,selectedDay=iso===parentCalendarDate,otherMonth=isMonth&&d.getMonth()!==mm;
  return `<button type="button" class="calendar-day${selectedDay?' is-selected':''}${otherMonth?' is-outside':''}${iso===todayLocal()?' is-today':''}" data-cal-date="${iso}" aria-pressed="${selectedDay}" aria-label="${iso}, 메모 ${n}건"><span class="calendar-day-num">${d.getDate()}</span>${n?`<span class="calendar-day-count">${n}건</span>`:''}</button>`;};
 if(parentCalendarMode==='month'){
  const first=new Date(ym,mm,1,12),firstWeek=(first.getDay()+6)%7,last=new Date(ym,mm+1,0,12),slots=Math.ceil((firstWeek+last.getDate())/7)*7,start=new Date(ym,mm,1-firstWeek,12);
  const days=Array.from({length:slots},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return dayButton(d,true)}).join('');
  overview.innerHTML=`<div class="calendar-weekdays">${weekdays.map(d=>`<span>${d}</span>`).join('')}</div><div class="calendar-month-grid">${days}</div>`;
 }else if(parentCalendarMode==='week'){
  const days=Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(monday.getDate()+i);return `<div class="calendar-week-col"><span class="calendar-weekday">${weekday(d)}</span>${dayButton(d,false)}</div>`}).join('');
  overview.innerHTML=`<div class="calendar-week-grid">${days}</div>`;
 }else{
  overview.innerHTML=`<div class="calendar-day-overview"><span class="calendar-day-title">${dateLabel(selected)} (${weekday(selected)})</span><span class="calendar-day-summary">메모 ${index.get(parentCalendarDate)?.length||0}건</span></div>`;
 }
 const list=(index.get(parentCalendarDate)||[]).slice().sort((a,b)=>String(a.entry?.time||'99:99').localeCompare(String(b.entry?.time||'99:99')));
 const items=list.map(r=>{
  const entry=r.entry||{},time=entry.time?`${sanitize(entry.time)} · `:'',text=String(entry.observation||entry.message||entry.response||entry.impact||entry.context||'관찰 메모'),ex=text.length>105?text.slice(0,105)+'…':text,legacy=!parseIsoDay(entry.date);
  return `<details class="calendar-record"><summary><span class="calendar-record-copy"><span class="calendar-record-snippet">${time}${sanitize(ex)}</span><span class="calendar-record-meta">${r.shared?'담당 치료사에게 일부 공유':'나만 보기'}${legacy?' · 작성일 기준(관찰일 미지정)':''}</span></span><span class="calendar-open">열어보기</span></summary><div class="calendar-record-full">${prettyRecordEntry(entry)}<p class="calendar-created">작성: ${sanitize(new Date(r.createdAt).toLocaleString('ko-KR'))}</p></div></details>`;
 }).join('');
 detail.innerHTML=`<div class="calendar-details-heading"><strong>${ym}년 ${dateLabel(selected)} · 메모 ${list.length}건</strong><button type="button" data-cal-new ${parentCalendarDate>todayLocal()?'disabled aria-label="미래 날짜는 기록할 수 없습니다"':''}>+ 이 날짜에 메모하기</button></div>${items||'<p class="calendar-empty">이 날짜에 남긴 기록이 없어요. 꼭 기록하지 않아도 괜찮아요.</p>'}`;
 root.querySelectorAll('[data-cal-date]').forEach(b=>b.onclick=()=>{parentCalendarDate=b.dataset.calDate;renderParentCalendar();if(window.innerWidth<=740)document.querySelector('.calendar-details')?.scrollIntoView({block:'nearest',behavior:'smooth'})});
 root.querySelectorAll('[data-cal-mode]').forEach(b=>b.onclick=()=>{parentCalendarMode=b.dataset.calMode;renderParentCalendar()});
 root.querySelector('[data-cal-prev]').onclick=()=>{parentCalendarDate=parentCalendarMode==='month'?monthShift(parentCalendarDate,-1):dayShift(parentCalendarDate,parentCalendarMode==='week'?-7:-1);renderParentCalendar()};
 root.querySelector('[data-cal-next]').onclick=()=>{parentCalendarDate=parentCalendarMode==='month'?monthShift(parentCalendarDate,1):dayShift(parentCalendarDate,parentCalendarMode==='week'?7:1);renderParentCalendar()};
 root.querySelector('[data-cal-today]').onclick=()=>{parentCalendarDate=todayLocal();renderParentCalendar()};
 root.querySelector('[data-cal-new]').onclick=()=>{if(parentCalendarDate>todayLocal())return;activateWorkspace('write');const dt=$('entryForm')?.elements?.date;if(dt){dt.value=parentCalendarDate;dt.focus()}};
}

const STUDENT_EMOTIONS=["기쁨", "편안함", "설렘", "뿌듯함", "즐거움", "걱정", "답답함", "짜증"];
const STUDENT_MORE_EMOTIONS={"기분 좋은 순간": ["신남", "만족감", "고마움", "홀가분함", "안도감", "평온함", "기대감", "자신감", "뭉클함", "흥미로움"], "복잡하고 힘든 순간": ["긴장됨", "불안함", "초조함", "속상함", "서운함", "억울함", "화남", "슬픔", "외로움", "두려움", "부담스러움", "후회", "당황함", "혼란스러움", "실망함", "부끄러움", "질투", "막막함"], "그 밖의 느낌": ["피곤함", "지루함", "무덤덤함", "궁금함", "어색함", "귀찮음", "복잡함", "잘 모르겠음"]};
function dataForm(role){
 if(role==='parent')return `<form class="form entry-v5 parent-easy-form" id="entryForm" data-parent-mode="quick">
 <div class="parent-mode-header"><div class="journal-mode-switch" role="group" aria-label="보호자 기록 방식"><button type="button" class="journal-mode-btn active" data-parent-mode="quick" aria-pressed="true"><strong>간편 기록</strong><small>하나만 남겨도 돼요</small></button><button type="button" class="journal-mode-btn" data-parent-mode="detail" aria-pressed="false"><strong>자세히 기록</strong><small>상황과 앞뒤를 살펴봐요</small></button></div><p id="parentModeHint" class="student-mode-hint" aria-live="polite">기억나는 사실 한 가지만 남겨도 충분합니다.</p></div>
 <div class="parent-when"><label class="parent-date-field">일이 있었던 날짜 <input name="date" type="date" value="${todayLocal()}" max="${todayLocal()}" required></label><label class="parent-time-field">시간 <small>(선택)</small><input name="time" type="time"></label><label class="parent-location">장소 <small>(선택)</small><input name="place" maxlength="100" placeholder="기억나는 장소만 적어 주세요."></label></div>
 <p class="parent-date-hint">정확한 시간이 기억나지 않으면 비워 두셔도 돼요. 작성 시각은 별도로 자동 기록됩니다.</p>
 <label class="parent-main-label">어떤 일을 보거나 들으셨나요? <small>필수 · 360자 이내</small><textarea name="observation" maxlength="360" rows="3" required placeholder="기억나는 사실만 간단히. 원인이나 진단을 추측하지 않아도 됩니다."></textarea></label>
 <details class="entry-examples parent-examples"><summary>✎ 관찰 메모 예시 보기 <small>필요할 때만</small></summary><div class="entry-examples-body"><p>아래는 가상의 상황이에요. 실제로 확인한 내용만 적어 주세요.</p><div class="example-lines"><p><b>직접 본 일:</b> “책을 펼쳤다가 잠시 덮고 물을 마셨습니다.”</p><p><b>아이에게 들은 말:</b> “잠깐 쉬고 싶어요.”</p><p><b>확인하지 않은 추측:</b> “일부러 피하려고 한 것 같다”는 관찰 사실에 넣지 않아요.</p></div><p>모든 일을 기록할 필요는 없고, 한 가지 사실만 남겨도 충분합니다.</p></div></details>
 <label class="parent-source-field">이 내용은 어떻게 알게 되었나요? <small>선택 · 정확한 출처가 아니면 비워 두세요.</small><select name="origin"><option value="">출처를 선택하지 않음</option><option value="직접 관찰">직접 보거나 들었어요</option><option value="아이가 말함">아이에게 들었어요</option><option value="가족에게 들음">다른 가족에게 들었어요</option><option value="그 밖의 사람에게 들음">그 밖의 사람에게 들었어요</option></select></label>
 <p class="parent-fact-note">아이의 마음이나 의도를 단정하지 않아도 됩니다. 일부러 행동을 관찰하거나 횟수를 셀 필요도 없어요.</p>
 <div class="parent-mode-advanced">
 <details class="optional-fields abc-observation parent-abc"><summary>상황을 ABC로 살펴보기 <small>선택 · 일반 생활도 가능</small></summary><div class="optional-wrap">
 <p class="abc-help">ABC는 문제행동만을 기록하는 표가 아니에요. 일상에서 일어난 일을 전후 순서대로 관찰할 때 도움이 되는 보조 양식입니다. 빈칸은 비워 두어도 되고 원인을 추측할 필요도 없습니다.</p>
 <label>A · 그전에 어떤 상황이 있었나요? <small>활동·대화·주변 환경 등 직접 알게 된 내용</small><textarea name="context" maxlength="450" rows="2" placeholder="예: 가족이 외출 준비를 하고 있었어요."></textarea></label>
 <p class="abc-behavior-guide"><b>B · 그때 일어난 일</b>은 위의 ‘어떤 일을 보거나 들으셨나요?’ 칸에 적은 내용을 그대로 사용합니다. 두 번 쓸 필요 없어요.</p>
 <label>C · 그 직후에는 어떻게 되었나요? <small>이어진 사건이나 주변의 반응을 사실대로</small><textarea name="after" maxlength="450" rows="2" placeholder="예: 아이가 신발을 신고 밖으로 나갔어요."></textarea></label>
 <p class="abc-help">관찰 기록만으로 행동의 원인·기능이나 진단을 결론 내리지 않습니다.</p></div></details>
 <details class="optional-fields parent-more"><summary>당시 상황과 앞뒤 내용 더 남기기 <small>선택</small></summary><div class="optional-wrap">
 <label>그때 주변 사람이 한 말이나 행동이 있었나요? <small>선택</small><textarea name="response" maxlength="450" rows="2" placeholder="직접 보거나 들은 말과 행동만 적어 주세요."></textarea></label>
 <label>그 뒤 일상에서 확인된 변화가 있나요? <small>선택</small><textarea name="impact" maxlength="450" rows="2" placeholder="없거나 확인하지 못했다면 비워 두어도 됩니다."></textarea></label>
 <label>아이의 말을 그대로 기억하고 계신가요? <small>선택 · 직접 들은 표현만</small><textarea name="childWords" maxlength="450" rows="2" placeholder="예: \"지금은 쉬고 싶어.\" 정확히 기억나지 않으면 비워 두세요."></textarea></label>
 <label>치료사에게 별도로 전할 말 <small>선택 · 160자 이내</small><textarea name="message" maxlength="160" rows="2" placeholder="전할 내용이 없다면 비워 두세요."></textarea></label>
 </div></details>
 <details class="parent-type-optional"><summary>관찰 내용을 표시해 두기 <small>선택 · 생략 가능</small></summary><fieldset class="observed-type"><legend>눈에 띈 내용 <small>여러 개 선택 가능</small></legend>
 <div class="observed-type-grid">${['몸 움직임','소리·말','여러 번 한 행동','그 밖의 모습'].map((kind,i)=>`<label class="observed-type-chip"><input name="signalChoice" type="checkbox" value="${kind}"><span class="signal-glyph" aria-hidden="true">${['◌','♪','↻','＋'][i]}</span><span>${kind}</span></label>`).join('')}</div>
 <p>어느 항목에도 맞지 않으면 선택하지 않아도 돼요. 이것은 진단 분류가 아니에요.</p></fieldset></details>
 <details class="parent-guide"><summary>관찰 메모 작성 안내 <span>필요할 때만 열기</span></summary><div class="parent-guide-body">
 <p><b>기억나는 사실만 기록하면 됩니다.</b> 직접 본 일인지, 아이나 다른 사람에게 들은 이야기인지를 구분하면 치료사가 참고하기 좋아요.</p>
 <p>‘그전·당시 상황’은 원인을 찾는 질문이 아니에요. 하던 일, 앞서 있었던 사건, 주변의 소리·환경, 누군가의 말이나 행동 등 여러 상황을 포함할 수 있어요.</p>
 <p>그 일이 어떤 행동의 원인이라고 단정할 필요는 없고, 기억나지 않거나 확인하지 못한 내용은 비워 두어도 됩니다. 아이가 했던 말과 보호자가 추측한 생각은 서로 다릅니다.</p>
 <p class="parent-guide-tail">특정 행동을 일부러 찾아보거나 횟수를 계속 셀 필요는 없어요. 기록이 없는 날은 아무 일이 없었다는 뜻이 아니에요.</p>
 </div></details>
 </div><!-- /parent-mode-advanced -->
 <div class="privacy-panel parent-privacy"><label class="checkbox"><input type="checkbox" name="share"><span>담당 치료사에게 전달하기<small>선택하지 않으면 내 기록에만 남아요.</small></span></label><div id="sharePicker" class="share-picker" hidden>
 <p>관찰 내용을 공유하면 날짜·시간·장소·선택한 표시도 함께 전달돼요. 아래 추가 항목은 직접 고른 것만 보냅니다.</p>
 ${['observation','origin','context','childWords','response','after','impact','message'].map(k=>`<label><input type="checkbox" name="shareField" value="${k}" ${k==='observation'?'checked':''}><span>${NOTE_LABELS[k]}</span></label>`).join('')}
 </div></div>
 <button class="button entry-save" id="saveEntry">내 관찰 메모 저장</button><p class="parent-nudge">보호자는 관찰하거나 전해 들은 사실만 남기면 됩니다. 기록하지 않는 날도 괜찮습니다. 진단이나 원인 판단은 하지 않아도 됩니다. 실시간 상담·응급 연락창이 아닙니다.</p></form>`;
 return `<form class="form entry-v5 student-journal" id="entryForm" data-journal-mode="quick">
 <div class="student-mode-header"><div class="student-mode-title">어떤 방식으로 남길까?</div><div class="journal-mode-switch" role="group" aria-label="기록 상세 정도 선택"><button class="journal-mode-btn active" type="button" data-journal-mode="quick" aria-pressed="true"><strong>⚡ 간편 기록</strong><small>한두 줄이면 끝</small></button><button class="journal-mode-btn" type="button" data-journal-mode="detail" aria-pressed="false"><strong>▤ 자세히 기록</strong><small>필요한 만큼 더 쓰기</small></button></div><p class="student-mode-hint" id="journalModeHint" aria-live="polite">한 줄만 남겨도 돼. 나머지는 선택이야.</p></div>
 <section class="student-info-card" aria-label="기록 날짜, 시간, 장소">
 <div class="student-datetime-heading"><strong>언제, 어디에서?</strong><button type="button" id="studentSetNow" class="student-now-btn" aria-label="날짜와 시간을 현재 시각으로 설정">↻ 지금으로 설정</button></div>
 <div class="student-datetime-grid"><label class="student-date-field">날짜<input name="date" type="date" max="${todayLocal()}" value="${todayLocal()}"></label><label class="student-time-field">시간 <small>(선택)</small><input name="time" type="time" value="${nowLocalTime()}"></label><label class="student-place-field">장소 <small>(선택)</small><input name="place" maxlength="100" placeholder="기억나는 곳만"></label></div>
 <p class="student-datetime-hint">현재 날짜·시간 자동 입력 · 필요하면 직접 변경할 수 있어.</p>
 </section>
 <div class="student-mode-advanced">
 <div class="student-extra-grid"><label>제목 <small>(선택)</small><input name="title" maxlength="80" placeholder="제목 없이 써도 돼"></label></div>
 <div class="form-switcher" role="group" aria-label="기록 방식"><button type="button" class="format-btn active" data-format="text" aria-pressed="true">✎ 글쓰기</button><button type="button" class="format-btn" data-format="draw" aria-pressed="false">◇ 그림 그리기</button></div></div>
 <div id="textPanel"><label class="student-note-label">하고 싶은 이야기 <small>(짧아도 좋아)</small><textarea name="note" maxlength="4000" rows="5" placeholder="오늘 있었던 일, 좋은 일, 고민, 그냥 생각나는 말... 자유롭게."></textarea></label></div>
 <details class="entry-examples student-examples"><summary>✎ 어떻게 적을까? 짧은 예시 보기 <small>필요할 때만</small></summary><div class="entry-examples-body"><p>이건 가상의 예시야. 따라 쓸 필요 없이 네 이야기만 남기면 돼.</p><div class="example-lines"><p>“오늘 친구랑 점심시간에 이야기했어.”</p><p>“집에 와서 조금 쉬었어. 오늘 기분은 잘 모르겠어.”</p><p>“지금은 글보다 기분만 선택하고 싶어.”</p></div><p>한두 줄, 감정만, 또는 아무것도 적지 않아도 괜찮아.</p></div></details>
 <section class="student-emotion-quick" id="stateDetails" aria-label="그때의 감정 선택"><div class="student-emotion-title"><strong>그때 어떤 기분이었어?</strong> <small>선택 · 여러 개 또는 선택 안 함</small></div><div class="emotion-quick-body"><div class="emotion-grid" aria-label="감정 선택">${STUDENT_EMOTIONS.map(w=>`<label class="emotion-chip"><input name="emotionChoice" type="checkbox" value="${w}"><span>${w}</span></label>`).join('')}</div>
 <details class="emotion-more"><summary>다른 감정도 보기 <span>+ ${Object.values(STUDENT_MORE_EMOTIONS).flat().length}개</span></summary>${Object.entries(STUDENT_MORE_EMOTIONS).map(([group,words])=>`<div class="emotion-group"><p>${group}</p><div class="emotion-grid">${words.filter(w=>!STUDENT_EMOTIONS.includes(w)).map(w=>`<label class="emotion-chip"><input name="emotionChoice" type="checkbox" value="${w}"><span>${w}</span></label>`).join('')}</div></div>`).join('')}</details>
 <details class="emotion-extra-optional"><summary>내 말로 표현하거나 컨디션도 남기기 <small>(선택)</small></summary><div class="emotion-extra-fields"><label>내 말로 표현하기 <small>(선택)</small><input name="emotionOther" maxlength="100" placeholder="위에 없는 감정이나 내 표현"></label><label>컨디션 <small>(선택)</small><select name="energy"><option value="">선택하지 않음</option><option>괜찮음</option><option>기운 있음</option><option>조금 피곤함</option><option>많이 피곤함</option><option>잘 모르겠음</option></select></label></div></details></div></section>
 <div class="student-mode-advanced">
 <div id="drawPanel" hidden><div class="sketch-board"><canvas id="noteCanvas" width="760" height="380" aria-label="마우스나 손가락으로 그리는 그림 메모"></canvas></div><div class="sketch-actions"><span>손가락이나 마우스로 그릴 수 있어.</span><button type="button" id="undoStroke" class="button-ghost">↶ 되돌리기</button><button type="button" id="clearSketch" class="button-ghost">지우기</button></div></div>
 

 <details class="optional-fields student-experience"><summary>몸의 움직임·소리나 반복된 일이 있었어? <small>선택 · 그냥 넘어가도 돼</small></summary><div class="optional-wrap"><p class="experience-helper">틱인지 강박인지 구분할 필요 없어. 내가 직접 경험한 일을 내 말로 남기고 싶을 때만 써. 기록하지 않아도 괜찮아.</p><label>어떤 일이 있었어? <small>(선택)</small><textarea name="experience" maxlength="900" rows="3" placeholder="움직임, 소리, 반복하고 싶었던 일, 떠오른 생각 등 내가 겪은 일을 자유롭게"></textarea></label><label>일상에서 달라진 점이나 불편한 점이 있었어? <small>(선택)</small><textarea name="experienceImpact" maxlength="500" rows="2" placeholder="특별히 달라진 일이 없었다면 비워 둬도 돼."></textarea></label><p class="experience-footer">횟수를 세거나 정확하게 분석할 필요는 없어. 나만 보관하고 싶으면 공유를 선택하지 않으면 돼.</p></div></details>
 <details class="optional-fields abc-observation student-abc"><summary>그전에 → 그때 → 그다음 (ABC) <small>선택 · 그냥 넘어가도 돼</small></summary><div class="optional-wrap">
 <p class="abc-help">친구와 놀았던 일, 재미있었던 일, 힘들었던 일 등 어떤 상황이라도 좋아. 정답이나 원인을 찾는 활동은 아니야.</p>
 <label>A · 그전에는 무슨 일이 있었어?<textarea name="abcBefore" maxlength="500" rows="2" placeholder="예: 쉬는 시간에 친구를 만났어."></textarea></label>
 <label>B · 그때 어떤 말이나 행동이 있었어?<textarea name="abcBehavior" maxlength="500" rows="2" placeholder="예: 같이 놀자고 이야기했어."></textarea></label>
 <label>C · 바로 다음에는 어떤 일이 있었어?<textarea name="abcAfter" maxlength="500" rows="2" placeholder="예: 같이 운동장에 갔어."></textarea></label>
 <p class="abc-help">기억이 안 나면 비워 둬도 괜찮아. ABC를 썼다고 꼭 공유해야 하는 건 아니야.</p></div></details>
 <details class="optional-fields student-reflect"><summary>좀 더 적고 싶다면 <small>선택 · 정답 없음</small></summary><div class="optional-wrap"><label>떠오른 생각이나 이미지<textarea name="thought" maxlength="1200" placeholder="쓰고 싶은 내용이 있으면 적어도 돼."></textarea></label><label>몸에서 느낀 점<textarea name="body" maxlength="1000" placeholder="특별한 느낌이 없다면 비워 둬도 돼."></textarea></label><label>내가 했던 일이나 해보고 싶은 일<textarea name="action" maxlength="1000" placeholder="꼭 해결책을 적을 필요는 없어."></textarea></label></div></details>
 </div>
 <p id="journalHiddenNotice" class="journal-hidden-notice" hidden>자세히 기록에서 작성한 내용도 함께 보관돼. 다시 보려면 자세히 기록을 선택해.</p>
 <div class="privacy-panel student-share"><label class="checkbox"><input type="checkbox" name="share"><span>담당 치료사에게 기록 공유하기<small>기본 비공개 · 공유 내용은 직접 고를 수 있어.</small></span></label>
 <div id="sharePicker" class="share-picker" hidden><div class="student-share-bar"><strong>보낼 항목 선택</strong><div class="student-share-actions"><button type="button" class="button-ghost" id="studentSelectAll">전체 선택</button><button type="button" class="button-ghost" id="studentClearAll">선택 해제</button></div></div>
 ${['title','date','time','place','note','sketch','mood','energy','thought','body','action','experience','experienceImpact','abcBefore','abcBehavior','abcAfter'].map(k=>`<label class="student-share-field"><input type="checkbox" name="shareField" value="${k}"><span>${NOTE_LABELS[k]}</span></label>`).join('')}<p id="studentShareCount" aria-live="polite">보낼 항목을 선택해 줘. 작성하지 않은 항목은 선택되지 않아.</p><p>선택하지 않은 내용은 치료사에게 보내지 않아. 전송 전에 확인할 수 있어.</p></div></div>
 <button class="button entry-save" id="saveEntry">🔒 내 기록 저장</button><p class="student-save-note">매일 쓰지 않아도 괜찮아. 기록을 정확하게 쓰려 애쓸 필요도 없어. 실시간 상담·응급 연락창이 아니야. 체험판의 작성 중 내용은 이 브라우저 세션에만 임시 저장돼.</p>
 </form>`;
}function gatherEntry(f,role){
 const fields=role==='parent'?['date','time','place','observation','origin','context','childWords','response','after','impact','message']:['date','time','place','title','note','energy','thought','body','action','experience','experienceImpact','abcBefore','abcBehavior','abcAfter'];
 const entry={};fields.forEach(k=>{const value=formValue(f,k);if(value)entry[k]=value});
 if(role==='parent'){
  const kinds=[...f.querySelectorAll('input[name="signalChoice"]:checked')].map(x=>x.value);
  if(kinds.length)entry.signals=kinds.join(' / ');
 }else{
  const emotions=[...f.querySelectorAll('input[name="emotionChoice"]:checked')].map(x=>x.value);
  const custom=formValue(f,'emotionOther');if(custom)emotions.push(custom);
  if(emotions.length)entry.mood=emotions.join(' · ');
  if(sketchStrokes.length)entry.sketch=JSON.stringify(sketchStrokes);
 }
 return entry;
}

let sketchStrokes=[],sketchActive=false;
function bindSketch(){
 const canvas=$('noteCanvas');if(!canvas)return;const ctx=canvas.getContext('2d');
 const draw=()=>{ctx.clearRect(0,0,760,380);ctx.fillStyle='#fff';ctx.fillRect(0,0,760,380);ctx.strokeStyle='#5362cc';ctx.lineWidth=3.4;ctx.lineJoin='round';ctx.lineCap='round';sketchStrokes.forEach(stroke=>{if(!stroke.length)return;ctx.beginPath();ctx.moveTo(stroke[0][0],stroke[0][1]);if(stroke.length===1)ctx.lineTo(stroke[0][0]+.01,stroke[0][1]);else stroke.slice(1).forEach(p=>ctx.lineTo(p[0],p[1]));ctx.stroke()})};
 const xy=e=>{const r=canvas.getBoundingClientRect();return [Math.min(760,Math.max(0,Math.round((e.clientX-r.left)*760/r.width))),Math.min(380,Math.max(0,Math.round((e.clientY-r.top)*380/r.height)))]};
 const total=()=>sketchStrokes.reduce((a,b)=>a+b.length,0);
 canvas.addEventListener('pointerdown',e=>{if(total()>=240)return;canvas.setPointerCapture(e.pointerId);sketchActive=true;sketchStrokes.push([xy(e)]);draw()});
 canvas.addEventListener('pointermove',e=>{if(!sketchActive||total()>=240)return;const path=sketchStrokes[sketchStrokes.length-1],p=xy(e),q=path[path.length-1];if(Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1])>4){path.push(p);draw()}});
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,()=>{sketchActive=false});
 $('undoStroke').onclick=()=>{sketchStrokes.pop();draw()};$('clearSketch').onclick=()=>{sketchStrokes=[];draw()};draw();
}
function sharePreview(fields,entry){return fields.map(k=>{const v=String(entry[k]||'');return '• '+(NOTE_LABELS[k]||k)+': '+(k==='sketch'?'[아래 그림 전체 미리보기]':v)}).join('\n\n')}
function confirmSharedEntry(fields,entry){
 return new Promise(resolve=>{
  let d=document.getElementById('shareReviewDialog');
  if(!d){d=document.createElement('dialog');d.id='shareReviewDialog';d.className='share-review-dialog';d.innerHTML='<h2>담당 치료사에게 공유할 내용</h2><p class="share-review-help">아래 항목만 공유돼. 선택하지 않은 내용은 보내지 않아. 실제 체험판에서는 서버로 전송되지 않아.</p><pre class="share-review-body"></pre><div class="share-review-sketch"></div><p class="share-review-help">보낸 뒤에는 공유를 취소할 수 있지만 이미 별도로 복사된 자료까지 되돌릴 수는 없어.</p><div class="share-review-actions"><button type="button" data-cancel class="button-ghost">돌아가기</button><button type="button" data-approve class="button">이 내용 공유하기</button></div>';document.body.append(d);}
  d.querySelector('.share-review-body').textContent=sharePreview(fields,entry);
  const drawing=d.querySelector('.share-review-sketch');
  drawing.innerHTML=fields.includes('sketch')&&entry.sketch?'<div class="sketch-record" data-sketch="'+sanitize(entry.sketch)+'"><div class="sketch-mini-label">공유할 그림 전체</div><canvas width="760" height="380"></canvas></div>':'';
  let completed=false;const finish=ok=>{if(completed)return;completed=true;d.close();resolve(ok)};
  d.querySelector('[data-cancel]').onclick=()=>finish(false);
  d.querySelector('[data-approve]').onclick=()=>finish(true);
  d.oncancel=e=>{e.preventDefault();finish(false)};
  if(typeof d.showModal==='function'){d.showModal();paintSketches();}
  else resolve(confirm('담당 치료사에게 아래 내용만 공유할까?\n\n'+sharePreview(fields,entry)));
 });
}
function wireEntryForm(isParent){
 const f=$('entryForm'),button=$('saveEntry'),share=f.elements.share,area=$('sharePicker');
 const selectedKeys=()=>[...f.querySelectorAll('input[name="shareField"]:checked')].map(x=>x.value);
 const updateParentShare=()=>{
  if(!isParent)return;
  const detailsVisible=f.dataset.parentMode==='detail',entry=gatherEntry(f,'parent');
  f.querySelectorAll('input[name="shareField"]').forEach(x=>{
   const visible=detailsVisible||['observation','origin'].includes(x.value);
   if(!visible)x.checked=false;
   x.disabled=!visible||!entry[x.value];
   x.closest('label')?.classList.toggle('is-unavailable',x.disabled);
  });
 };
 const parentModeButtons=[...f.querySelectorAll('button[data-parent-mode]')];
 if(isParent){
  const sync=()=>{
   const mode=f.dataset.parentMode==='detail'?'detail':'quick';
   parentModeButtons.forEach(b=>{const active=b.dataset.parentMode===mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
   const hint=f.querySelector('#parentModeHint');if(hint)hint.textContent=mode==='detail'?'기록하고 싶은 상황만 추가해요. ABC도 선택 사항입니다.':'기억나는 사실 한 가지만 남겨도 충분합니다.';
   updateParentShare();
  };
  parentModeButtons.forEach(btn=>btn.addEventListener('click',()=>{f.dataset.parentMode=btn.dataset.parentMode;sync();f.dispatchEvent(new Event('change',{bubbles:true}))}));
  f.addEventListener('input',updateParentShare);
  f.addEventListener('change',updateParentShare);
  sync();
 }

 const updateStudentShare=()=>{
  if(isParent)return;
  const entry=gatherEntry(f,'student');
  f.querySelectorAll('input[name="shareField"]').forEach(x=>{
   const mode=f.dataset.journalMode||'quick';const available=!!entry[x.value]&&(mode==='detail'||['note','date','time','place','mood'].includes(x.value));x.disabled=!available;if(!available)x.checked=false;
   x.closest('label')?.classList.toggle('is-unavailable',!available);
  });
  const count=selectedKeys().length;const caption=$('studentShareCount');
  if(caption)caption.textContent=count?`${count}개 항목 선택됨 · 전송 전에 내용을 확인할 수 있어.`:'작성한 항목 중 보내고 싶은 것을 골라줘.';
 };
 share.onchange=()=>{area.hidden=!share.checked;button.textContent=isParent?(share.checked?'짧은 메모 전달하고 저장':'내 메모 저장하기'):(share.checked?'↗ 선택한 항목 공유하고 저장':'🔒 내 기록 저장');if(!isParent)updateStudentShare()};
 if(!isParent){
  const nowBtn=$('studentSetNow');if(nowBtn)nowBtn.onclick=()=>{const date=f.elements.date,time=f.elements.time;if(date)date.value=todayLocal();if(time)time.value=nowLocalTime();updateStudentShare();toast('날짜와 시간을 현재 시각으로 설정했어.');};
  const journalModeHint=$('journalModeHint');
  const modeButtons=[...f.querySelectorAll('button[data-journal-mode]')];
  modeButtons.forEach(modeButton=>modeButton.addEventListener('click',()=>{
    const mode=modeButton.dataset.journalMode;
    f.dataset.journalMode=mode;
    modeButtons.forEach(b=>{const active=b===modeButton;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    if(mode==='quick'&&$('drawPanel')&&!$('drawPanel').hidden){f.querySelector('[data-format="text"]')?.click();}
    if(journalModeHint)journalModeHint.textContent=mode==='quick'?'한 줄만 남겨도 돼. 나머지는 선택이야.':'감정·장소·그림·내 경험도 원하는 만큼 추가해 봐.';
    const extra=mode==='quick'&&['title','energy','thought','body','action','experience','experienceImpact','abcBefore','abcBehavior','abcAfter'].some(k=>!!formValue(f,k));
    const summary=$('journalHiddenNotice');if(summary)summary.hidden=!extra;
    updateStudentShare();
  }));
  sketchStrokes=[];bindSketch();
  document.querySelectorAll('[data-format]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-format]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b))});$('textPanel').hidden=b.dataset.format!=='text';$('drawPanel').hidden=b.dataset.format!=='draw';updateStudentShare()});
  f.addEventListener('input',updateStudentShare);f.addEventListener('change',updateStudentShare);
  $('studentSelectAll').onclick=()=>{updateStudentShare();f.querySelectorAll('input[name="shareField"]:not(:disabled)').forEach(x=>x.checked=true);updateStudentShare()};
  $('studentClearAll').onclick=()=>{f.querySelectorAll('input[name="shareField"]').forEach(x=>x.checked=false);updateStudentShare()};
  updateStudentShare();
 }
 f.onsubmit=async e=>{e.preventDefault();const entry=gatherEntry(f,me.role);
  const meaningful=isParent?!!entry.observation:['note','sketch','mood','energy','thought','body','action','experience','experienceImpact','abcBefore','abcBehavior','abcAfter'].some(k=>!!entry[k]);
  if(!meaningful){toast(isParent?'직접 보거나 들은 일을 한 문장만 적어 주세요.':'일기, 그림, 감정 등 한 가지 이상 남겨줘.');return;}
  if(isParent&&!entry.date){toast('일이 있었던 날짜를 선택해 주세요.');return;}
  const sharedFields=share.checked?selectedKeys().filter(k=>entry[k]):[];
  if(isParent&&share.checked&&sharedFields.includes('observation')){for(const k of ['date','time','place','signals'])if(entry[k]&&!sharedFields.includes(k))sharedFields.push(k);}
  if(share.checked&&!sharedFields.some(k=>!['date','time','place','title'].includes(k))){toast('공유할 내용을 한 가지 이상 골라줘.');return;}
  if(share.checked&&!(await confirmSharedEntry(sharedFields,entry)))return;
  loading(button,async()=>{await api('records',{method:'POST',body:{entry,share:share.checked,sharedFields}});if(isParent){parentCalendarDate=entry.date;parentCalendarMode='day';activeView='calendar'}else activeView='history';toast('내 기록에 저장했어.');await dashboard()});
 };
}

function prettyRecordEntry(entry){return Object.entries(entry??{}).map(([k,v])=> k==='sketch'?`<div class="sketch-record" data-sketch="${sanitize(v)}"><div class="sketch-mini-label">그림 메모</div><canvas width="760" height="380"></canvas></div>`:`<p><b>${sanitize(NOTE_LABELS[k]||k)}</b><br>${sanitize(v)}</p>`).join('');}
function paintSketches(){document.querySelectorAll('[data-sketch]').forEach(el=>{try{const arr=JSON.parse(el.dataset.sketch);if(!Array.isArray(arr)||arr.length>250)return;const ctx=el.querySelector('canvas').getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,760,380);ctx.strokeStyle='#5362cc';ctx.lineWidth=3.5;ctx.lineCap='round';ctx.lineJoin='round';arr.forEach(stroke=>{if(!Array.isArray(stroke)||!stroke.length)return;ctx.beginPath();stroke.slice(0,240).forEach((p,i)=>{if(!Array.isArray(p)||p.length!==2||!Number.isFinite(p[0])||!Number.isFinite(p[1]))return;const x=Math.max(0,Math.min(760,p[0])),y=Math.max(0,Math.min(380,p[1]));i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()});}catch(_){}})}
function parentObservationFacts(entry={}){
 const fields=[['date','관찰 날짜'],['time','시간'],['place','장소'],['origin','정보 출처'],['signals','관찰한 모습(선택)'],['observation','보거나 들은 내용'],['context','그전·당시 상황'],['childWords','아이가 실제로 한 말'],['response','주변 사람의 말·행동'],['after','이후에 이어진 일'],['impact','일상에서 확인된 변화'],['message','보호자 전달사항']];
 return `<div class="observed-facts"><p class="clinical-neutral">보호자가 전달한 기록입니다. 직접 관찰했는지 또는 전해 들었는지 확인하고, 해석과 판단은 치료사가 별도로 검토합니다.</p>${fields.filter(([k])=>entry[k]).map(([k,name])=>`<div class="observed-fact-row"><strong>${name}</strong><span>${sanitize(entry[k])}</span></div>`).join('')}</div>`;
}
function recordCards(list=records){
 if(!list.length)return '<div class="empty-state">아직 남겨둔 기록이 없습니다. 필요할 때만 작성해도 괜찮아요.</div>';
 return list.map(r=>{
  const time=sanitize(new Date(r.createdAt).toLocaleString('ko-KR'));
  const observed=r.entry?.date?`${r.kind==='parent'?'관찰':'기록'} ${sanitize(r.entry.date)}${r.entry.time?' '+sanitize(r.entry.time):''}${r.entry.place?' · '+sanitize(r.entry.place):''} · 작성 ${time}`:time;
  if(me.role==='therapist'&&r.kind==='student'){
   const text=String(r.entry?.note||r.entry?.experience||r.entry?.thought||r.entry?.action||r.entry?.mood||'');
   const short=text.length>120?text.slice(0,120)+'…':text;
   return `<article class="record archive-record"><div class="meta">학생 공유 기록 · ${observed} · ${sanitize(r.student)}</div><div class="parent-inbox-skim">${sanitize(short)||'선택된 공유 내용이 있어.'}</div><details class="parent-inbox-details"><summary>공유한 내용 전체 보기</summary><div class="parent-inbox-full">${prettyRecordEntry(r.entry)}</div></details><p class="muted">학생이 선택해 공유한 내용만 표시돼.</p></article>`;
  }
  if(me.role==='therapist'&&r.kind==='parent'){
   const field=String(r.entry?.observation||r.entry?.message||r.entry?.impact||r.entry?.response||'');
   const preview=field.length>110?field.slice(0,110)+'…':field;
   const place=r.entry?.place?' · '+sanitize(r.entry.place):'';
   const kinds=r.entry?.signals?' · '+sanitize(r.entry.signals):'';
   return `<article class="record parent-inbox-record"><div class="meta">보호자 기록 · ${observed}${place}${kinds} · ${sanitize(r.student)}</div><div class="parent-inbox-skim">${sanitize(preview)||'공유된 메모가 있어요.'}</div><details class="parent-inbox-details"><summary>전달 내용 더 보기</summary><div class="parent-inbox-full">${parentObservationFacts(r.entry)}<div class="muted">학생: ${sanitize(r.student)} · 작성자: ${sanitize(r.author)}</div></div></details></article>`;
  }
  return `<article class="record archive-record"><div class="meta">${observed} · ${r.kind==='student'?'학생':'학부모'} · ${r.shared?'치료사와 일부 공유':'나만 보기'}${r.driveSynced?' · 드라이브 백업':''}</div>${prettyRecordEntry(r.entry)}${!r.shared&&me.role!=='therapist'?`<div class="inline-share"><button class="button-ghost" type="button" data-share="${sanitize(r.id)}">선택해서 공유</button><div class="share-choices" data-share-panel="${sanitize(r.id)}" hidden><p>치료사에게 전달할 내용만 골라줘.</p>${me.role==='student'?`<div class="student-share-bar"><strong>내 기록 공유</strong><div class="student-share-actions"><button type="button" class="button-ghost" data-archive-all="${sanitize(r.id)}">전체 선택</button><button type="button" class="button-ghost" data-archive-clear="${sanitize(r.id)}">선택 해제</button></div></div>`:''}${Object.keys(r.entry??{}).map(k=>`<label><input type="checkbox" value="${sanitize(k)}"><span>${sanitize(NOTE_LABELS[k]||k)}</span></label>`).join('')}<button class="button" type="button" data-share-confirm="${sanitize(r.id)}">선택한 항목 전달</button></div></div>`:''}${r.shared&&me.role!=='therapist'?`<div class="inline-share"><button type="button" class="button-ghost" data-unshare="${sanitize(r.id)}">이후 공유 취소</button><small>이미 전달된 복사본은 별도 관리가 필요해.</small></div>`:''}${me.role==='therapist'?`<div class="muted">학생: ${sanitize(r.student)} · 작성자: ${sanitize(r.author)}</div>`:''}</article>`;
 }).join('');
}

function attachShares(){
 document.querySelectorAll('[data-share]').forEach(b=>b.onclick=()=>{const p=document.querySelector(`[data-share-panel="${b.dataset.share}"]`);if(!p)return;p.hidden=!p.hidden});
 for(const [key,value] of [['archiveAll',true],['archiveClear',false]])document.querySelectorAll(`[data-${key.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())}]`).forEach(b=>b.onclick=()=>{const id=b.dataset[key],panel=document.querySelector(`[data-share-panel="${id}"]`);if(panel)panel.querySelectorAll('input[type="checkbox"]').forEach(c=>c.checked=value)});
 document.querySelectorAll('[data-share-confirm]').forEach(b=>b.onclick=async()=>{
  const r=records.find(x=>x.id===b.dataset.shareConfirm),panel=document.querySelector(`[data-share-panel="${b.dataset.shareConfirm}"]`);if(!r||!panel)return;
  const fields=[...panel.querySelectorAll('input:checked')].map(x=>x.value).filter(k=>r.entry[k]);
  if(!fields.some(k=>!['date','time','place','title'].includes(k))){toast('공유할 내용을 한 가지 이상 골라줘.');return;}
  if(!(await confirmSharedEntry(fields,r.entry)))return;
  loading(b,async()=>{await api('share',{method:'POST',body:{recordId:r.id,sharedFields:fields}});toast('선택한 내용만 공유했어.');await dashboard()})
 });
 document.querySelectorAll('[data-unshare]').forEach(b=>b.onclick=()=>{
  if(!confirm('이 기록의 앞으로의 치료사 열람을 중단할까? 이미 별도로 저장되거나 전달된 복사본은 자동으로 삭제되지 않아.'))return;
  loading(b,async()=>{const result=await api('unshare',{method:'POST',body:{recordId:b.dataset.unshare}});toast(result.remoteCopyStatus==='pending'?'서버 열람을 중단했어. 드라이브 사본 삭제는 아직 확인되지 않았어.':'서버 열람을 중단했어. 별도로 전달된 복사본은 남을 수 있어.');await dashboard()})
 });
}

const CHOICE_LAB_SCENES=[
 {id:'time',icon:'✦',tab:'여유 시간',accent:'mint',title:'갑자기 20분이 생겼어.',desc:'예정보다 일찍 끝났어. 무엇을 해볼까?',options:[
  {label:'음악 한 곡',glyph:'♫',line:'음악을 켰어. 잠깐 다른 분위기로 전환!',code:'listen_to_music()',out:'음악 한 곡을 듣는 방법을 골랐어.'},
  {label:'게임 한 판',glyph:'▣',line:'가벼운 게임을 골라봤어.',code:'play_a_round()',out:'게임 한 판을 즐기는 방법을 골랐어.'},
  {label:'잠깐 쉬기',glyph:'☁',line:'아무것도 하지 않고 시간을 보내도 돼.',code:'take_a_break()',out:'잠깐 쉬어 가는 방법을 골랐어.'}]},
 {id:'team',icon:'◈',tab:'팀 활동',accent:'lavender',title:'새 프로젝트를 시작해.',desc:'함께 무언가를 만들기로 했어. 어떤 역할이 끌려?',options:[
  {label:'아이디어 내기',glyph:'✳',line:'아이디어를 하나 꺼내서 이야기해 봤어.',code:'share_an_idea()',out:'새로운 생각으로 시작했어.'},
  {label:'순서 정리',glyph:'☷',line:'어디부터 할지 간단히 정했어.',code:'make_a_plan()',out:'순서를 정하는 방식으로 시작했어.'},
  {label:'먼저 둘러보기',glyph:'◎',line:'다른 사람이 하는 걸 보고 방향을 잡았어.',code:'explore_first()',out:'천천히 살펴보는 방식으로 시작했어.'}]},
 {id:'game',icon:'⌘',tab:'새 게임',accent:'peach',title:'처음 보는 게임을 발견했어.',desc:'어떻게 시작해 보고 싶어?',options:[
  {label:'일단 플레이',glyph:'▶',line:'직접 움직여 보면서 알아봤어.',code:'start_playing()',out:'직접 해보는 방법을 골랐어.'},
  {label:'규칙 살펴보기',glyph:'≡',line:'규칙을 읽고 흐름을 알아봤어.',code:'read_the_rules()',out:'정보를 먼저 살펴보는 방법을 골랐어.'},
  {label:'다음에 하기',glyph:'↷',line:'지금은 지나가고 다음을 기약했어.',code:'save_for_later()',out:'다음 기회를 선택했어.'}]}
];
let choiceLabScene=0,choiceLabOption=-1;
function situationMarkup(){return `<div class="choice-lab" id="situation">
 <div class="choice-top"><span class="choice-top-label"><span aria-hidden="true">●</span> PLAYGROUND / IF · ELSE</span><span class="choice-count" id="choiceCount">01 / 03</span></div>
 <div class="choice-tabs" role="group" aria-label="장면 고르기">${CHOICE_LAB_SCENES.map((s,i)=>`<button type="button" data-choice-scene="${i}" aria-pressed="${i===choiceLabScene?'true':'false'}"><span aria-hidden="true">${s.icon}</span> ${s.tab}</button>`).join('')}</div>
 <div class="choice-scene choice-mint" id="choiceScene"><div class="choice-scene-art" aria-hidden="true"><span class="choice-art-chip">IF</span><span class="choice-art-route"></span><span class="choice-art-node">?</span></div><div class="choice-scene-text"><span class="choice-kicker">SCENE 01</span><h3 id="choiceTitle"></h3><p id="choiceDescription"></p></div></div>
 <div class="choice-columns"><div class="choice-actions"><div class="choice-section-head"><strong>이렇게 해볼래?</strong><span>하나만 골라봐</span></div><div class="choice-options" id="choiceOptions"></div></div>
 <div class="choice-result"><div class="choice-console-top"><span aria-hidden="true">● ● ●</span><span>output.log</span><span class="choice-console-status" id="choiceStatus">READY</span></div><div class="choice-console-content" aria-live="polite" aria-atomic="true" id="choiceOutput"><span class="choice-cursor">›</span><span>선택하면 결과가 나타나.</span></div><div class="choice-code" id="choiceCode"><span class="choice-ln">01</span> <span class="choice-keyword">if</span> (selected) {<br><span class="choice-ln">02</span> &nbsp; run(selected);<br><span class="choice-ln">03</span> }</div></div></div>
 <div class="choice-bottom"><span>정답 · 점수 · 기록 저장 없음</span><button type="button" id="choiceReset" class="choice-reset">↻ 다시 선택</button></div>
 </div>`;}
function attachSituation(){
 const root=document.querySelector('#situation');if(!root)return;
 const count=root.querySelector('#choiceCount'),title=root.querySelector('#choiceTitle'),desc=root.querySelector('#choiceDescription'),scene=root.querySelector('#choiceScene'),options=root.querySelector('#choiceOptions'),output=root.querySelector('#choiceOutput'),status=root.querySelector('#choiceStatus'),code=root.querySelector('#choiceCode');
 const draw=()=>{
  const s=CHOICE_LAB_SCENES[choiceLabScene];count.textContent=String(choiceLabScene+1).padStart(2,'0')+' / 03';title.textContent=s.title;desc.textContent=s.desc;
  scene.className='choice-scene choice-'+s.accent;
  root.querySelector('.choice-kicker').textContent='SCENE '+String(choiceLabScene+1).padStart(2,'0');
  root.querySelectorAll('[data-choice-scene]').forEach((b,i)=>{const on=i===choiceLabScene;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});
  options.innerHTML=s.options.map((o,i)=>`<button type="button" class="choice-option${i===choiceLabOption?' picked':''}" data-choice-option="${i}" aria-pressed="${i===choiceLabOption?'true':'false'}"><span class="choice-option-icon" aria-hidden="true">${o.glyph}</span><strong>${o.label}</strong><span aria-hidden="true" class="choice-arrow">↗</span></button>`).join('');
  if(choiceLabOption<0){status.textContent='READY';output.innerHTML='<span class="choice-cursor" aria-hidden="true">›</span><span>선택하면 결과가 나타나.</span>';code.innerHTML='<span class="choice-ln">01</span> <span class="choice-keyword">if</span> (selected) {<br><span class="choice-ln">02</span> &nbsp; run(selected);<br><span class="choice-ln">03</span> }';}
  else{const o=s.options[choiceLabOption];status.textContent='DONE';output.textContent=o.out;code.textContent='> '+o.code+'\n'+o.line;}
  options.querySelectorAll('[data-choice-option]').forEach(b=>b.onclick=()=>{choiceLabOption=Number(b.dataset.choiceOption);draw();});
 };
 root.querySelectorAll('[data-choice-scene]').forEach(b=>b.onclick=()=>{choiceLabScene=Number(b.dataset.choiceScene);choiceLabOption=-1;draw();});
 root.querySelector('#choiceReset').onclick=()=>{choiceLabOption=-1;draw();};
 draw();
}
function codingMarkup(){return `<div class="lab-shell">
  <div class="lab-tabbar"><span class="lab-dot" aria-hidden="true"></span><span>condition_lab.js</span><span class="lab-sub">로직 살펴보기 · 선택 활동</span></div>
  <div class="lab-layout">
   <div class="lab-editor"><div class="lab-overline">코드 미리보기 <span>JAVASCRIPT</span></div><pre id="codingCode" class="code"><span class="line-number">01</span> <span class="code-purple">const</span> weather = <span class="code-green">'sun'</span>;
<span class="line-number">02</span> <span class="code-purple">if</span> (weather === <span class="code-green">'sun'</span>) {
<span class="line-number">03</span>   action = <span class="code-green">'산책'</span>;
<span class="line-number">04</span> } <span class="code-purple">else</span> {
<span class="line-number">05</span>   action = <span class="code-green">'실내 활동'</span>;
<span class="line-number">06</span> }</pre></div>
   <div class="lab-controls"><label>날씨 조건 선택<select id="codingSelect"><option value="sun">맑음</option><option value="rain">비</option><option value="cloud">구름</option></select></label><button id="runCode" class="button">▶ 실행 결과 보기</button><div class="lab-result"><strong>OUTPUT</strong><div id="codeResult" aria-live="polite">조건을 고르고 실행해 봐.</div></div><p class="field-note">실제 코드를 실행하는 편집기가 아닌 조건문 실험이에요. 상담 기록과는 별개예요.</p></div>
  </div></div>`;}
function attachCoding(){
 const refresh=()=>{
  const value=$('codingSelect').value;
  const condition=value==='sun'?'sun':value==='rain'?'rain':'cloud';
  $('codingCode').innerHTML=`<span class="line-number">01</span> <span class="code-purple">const</span> weather = <span class="code-green">'${condition}'</span>;
<span class="line-number">02</span> <span class="code-purple">if</span> (weather === <span class="code-green">'sun'</span>) {
<span class="line-number">03</span>   action = <span class="code-green">'산책'</span>;
<span class="line-number">04</span> } <span class="code-purple">else</span> {
<span class="line-number">05</span>   action = <span class="code-green">'실내 활동'</span>;
<span class="line-number">06</span> }`;
  $('codeResult').textContent='▶ 실행하면 결과가 표시돼.';
 };
 $('codingSelect').onchange=refresh;
 $('runCode').onclick=()=>{const x=$('codingSelect').value;const act=x==='sun'?'산책':'실내 활동';$('codeResult').textContent=`출력: ${act}`;};
}
function studentHome(){
 const isParent=me.role==='parent';
 const items=isParent?[
  ['write','✎','1분 생활 메모','필요할 때만'],['calendar','▦','기록 달력','월·주·일'],['history','▤','내 기록','내가 쓴 내용']
 ]:[
  ['write','✎','기록하기','한 장이면 충분해'],['history','▤','내 기록','지난 기록 확인'],['coding','⌘','코딩 실험실','원하면 탐색하기']
 ];
 app.innerHTML=hero(isParent?'필요할 때만 짧게 남겨요.':'내가 남기고 싶은 한 페이지.',isParent?'모든 변화를 적을 필요는 없어요. 기억에 남은 한 가지면 충분해요.':'매일 써야 하는 숙제는 아니야. 기록한 내용은 기본적으로 나만 볼 수 있어.')+
 `<div class="workspace-shell"><aside class="workspace-sidebar"><div class="sidebar-label">EXPLORER <span class="sidebar-version">01</span></div>${workspaceNav(items,activeView)}<div class="sidebar-note"><span class="privacy-dot" aria-hidden="true"></span>공유는 내가 선택해요.<br><small>혼자만 볼 수도 있어요.</small></div></aside><div class="workspace-content">
 <section data-workspace-view="write" class="workspace-section"><div class="editor-bar"><span class="ide-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>${isParent?'observation.note':'my-note.md'}</span><span class="editor-status">NEW NOTE</span></div><div class="editor-paper"><span class="tag">01 / WRITE</span><h2>${isParent?'간단한 생활 메모':'새 페이지'}</h2><p>${isParent?'한 가지를 짧게 적어도 충분해요. 치료사에게 전달하지 않아도 돼요.':'글이나 그림으로 남겨도 되고, 그냥 둘러봐도 돼.'}</p>${dataForm(me.role)}</div></section>
 ${isParent?`<section data-workspace-view="calendar" id="parentCalendar" class="workspace-section" hidden>${parentCalendarHTML()}</section>`:''}
 <section data-workspace-view="history" class="workspace-section" hidden><div class="editor-bar"><span class="ide-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>my-notes.json</span></div><div class="editor-paper"><span class="tag">02 / ARCHIVE</span><h2>${isParent?'내 생활 메모':'내 서랍'}</h2><p>${isParent?'내가 남긴 메모만 보여요.':'내가 남긴 페이지들을 모아두는 곳이야.'}</p><div id="recordsHere">${recordCards()}</div></div></section>
 ${isParent?'':`<section data-workspace-view="coding" class="workspace-section" hidden><div class="editor-bar"><span class="ide-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>studio / playground</span></div><div class="editor-paper"><span class="tag">OPTIONAL / PLAY</span><h2>코딩 실험실</h2><p>조건을 바꿔 결과를 확인하는 작은 실험 공간이야. 기록하지 않고 그냥 놀아도 돼.</p>${codingMarkup()}<details class="optional-fields"><summary>간단한 선택 예시 살펴보기 <small>선택</small></summary><div class="optional-wrap">${situationMarkup()}</div></details></div></section>`}
 </div></div><p class="workspace-footer">일단써봄은 원하는 방식으로 경험을 남기는 개인 작업공간이야. 사용하고 싶은 때에만 열어도 돼.</p>`;
 wireEntryForm(isParent);attachShares();bindWorkspace();paintSketches();if(isParent)renderParentCalendar();
 if(!isParent){attachSituation();attachCoding();}

}
function exportCSV(){const labels=NOTE_LABELS;function cell(s){let x=String(s??'');if(/^[\s]*[=+\-@\t\r]/.test(x))x="'"+x;return '"'+x.replaceAll('"','""')+'"'}const rows=[['작성일','학생','작성자','유형','기록 내용'],...records.map(r=>[r.createdAt,r.student,r.author,r.kind,Object.entries(r.entry??{}).map(([k,v])=>(labels[k]||k)+': '+(k==='sketch'?'[그림 메모]':v)).join('\n')])];const csv='\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n');const u=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='일단써봄_담당치료사_공유기록.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),500)}
async function initSessionNotes(){
 const wrap=$('sessionSaved'),form=$('sessionForm');if(!wrap||!form)return;
 const display=async()=>{try{const out=await api('session-notes');wrap.innerHTML=(out.notes?.length?out.notes.map(n=>`<article class="record"><div class="meta">${sanitize(n.studentNickname||'학생')} · ${sanitize(new Date(n.createdAt).toLocaleDateString('ko-KR'))} · 치료사 전용</div>${prettyRecordEntry(n.entry)}</article>`).join(''):'<div class="empty-state">아직 회기 메모가 없습니다.</div>');}catch(e){wrap.textContent='회기 메모 기능 연결 전: '+e.message;}};
 form.onsubmit=e=>{e.preventDefault();const entry={};["studentReport","parentReport","observation","question","plan","functionalImpact","familyResponse","workingHypothesis","alternatives","uncertainty","burdenReview","erpReview","erpTarget","erpSafety","cbitReview","cbitTarget","cbitContext"].forEach(k=>{const v=formValue(form,k);if(v)entry[k]=v});if(!Object.keys(entry).length){toast('한 가지 이상 남겨주세요.');return;}loading(form.querySelector('button'),async()=>{await api('session-notes',{method:'POST',body:{studentId:formValue(form,'studentId'),entry}});form.reset();toast('회기 메모를 보관했어요.');await display()})};
 await display();
}
async function therapistHome(){const r=await Promise.all([api('students'),api('drive/status'),api('accounts')]);students=r[0].students;drive=r[1];const accounts=r[2].accounts;app.innerHTML=hero('오늘의 사례 공간','학생이 공유한 내용과 보호자 관찰을 구분해 보고, 다음 회기를 준비해요.')+`<div class="workspace-shell therapist-shell"><aside class="workspace-sidebar"><div class="sidebar-label">EXPLORER <span class="sidebar-version">02</span></div>${workspaceNav([['inbox','▣','공유 자료','학생·보호자'],['session','▤','회기 준비','치료사 메모'],['accounts','♙','계정 연결','초대·재등록'],['drive','↗','Google Drive','담당자 전용']],activeView)}<div class="sidebar-note">배정된 학생의 공유 기록만<br><small>담당 치료사가 확인할 수 있어요.</small></div></aside><div class="workspace-content"><div class="grid"><section class="panel highlight full" data-workspace-view="inbox"><span class="tag">01 / INBOX</span><h2>학생·보호자가 공유한 기록 <small>(${records.length}건)</small></h2><p>원문을 유지하며 작성자의 관점에 따라 구분해요. 자동으로 진단하거나 평가하지 않아요.</p><div class="buttons"><button id="refresh" class="button-ghost">↻ 새 기록 확인</button><button id="csv" class="button-ghost">CSV 다운로드</button></div><p class="parent-inbox-policy">보호자 메모는 <b>짧은 내용만 먼저</b> 보여요. 길게 작성한 원문은 필요할 때 펼쳐볼 수 있어요.</p><div class="filter-strip"><label>학생별 보기<select id="filterStudent"><option value="all">전체 학생</option>${students.map(s=>`<option value="${sanitize(s.nickname)}">${sanitize(s.nickname)}</option>`).join('')}</select></label><label>작성자 구분<select id="filterKind"><option value="all">전체</option><option value="student">학생 기록</option><option value="parent">학부모 전달</option></select></label></div><div id="inboxResults">${recordCards()}</div></section><section class="panel full case-panel" data-workspace-view="session" hidden><span class="tag">SESSION / THERAPIST ONLY</span><h2>회기 준비·메모</h2><p>학생이 선택해 공유한 내용과 실제 회기에서 확인한 내용을 분리해 기록합니다. 치료사의 가설은 관찰 사실이 아니며, 앱이 진단이나 치료 효과를 판단하지 않습니다. <b>로그인한 역할과 기록 접근은 서버에서 확인합니다.</b></p>
<form id="sessionForm" class="form clinician-form">
<label>담당 학생<select name="studentId" required>${students.map(s=>`<option value="${sanitize(s.id)}">${sanitize(s.nickname)}</option>`).join('')}</select></label>
<div class="clinician-quick-fields">
 <label>학생이 직접 이야기한 내용 <small>(선택)</small><textarea name="studentReport" maxlength="1200" rows="2" placeholder="학생의 표현을 가능하면 그대로. 공유 기록과 회기 진술은 구별해요."></textarea></label>
 <label>보호자에게 들은 내용 <small>(선택)</small><textarea name="parentReport" maxlength="1200" rows="2" placeholder="직접 관찰인지 전해 들은 내용인지 구분해 적어요."></textarea></label>
 <label>치료사가 직접 확인한 사실 <small>(선택)</small><textarea name="observation" maxlength="1200" rows="2" placeholder="회기에서 실제 관찰한 행동·상황. 원인이나 진단을 단정하지 않아요."></textarea></label>
 <label>다음 회기에 함께 살펴볼 것 <small>(선택)</small><textarea name="plan" maxlength="1200" rows="2" placeholder="학생과 합의한 목표 또는 질문. 기록하지 않는 선택도 존중해요."></textarea></label>
</div>
<details class="clinician-extra">
 <summary>사례개념화와 기록 부담 점검 <small>필요할 때만</small></summary>
 <div class="clinician-extra-inner">
  <p class="clinical-neutral">한 번의 기록만으로 틱·강박·불안 등을 구분하지 않습니다. 아래 내용은 표준화 검사나 진단 판정을 대신하지 않습니다.</p>
  <label>일상생활에 실제 어떤 영향이 있었나요?<textarea name="functionalImpact" maxlength="900" rows="2" placeholder="수면·학업·관계·시간 사용 등 확인된 영향. 확인되지 않았다면 비워 두세요."></textarea></label>
  <label>가족이나 주변의 반응은 무엇이었나요?<textarea name="familyResponse" maxlength="900" rows="2" placeholder="관찰한 대응만 기록. 가족 수용행동 여부를 자동 분류하지 않습니다."></textarea></label>
  <label>현재의 잠정적인 이해·가설<textarea name="workingHypothesis" maxlength="1000" rows="2" placeholder="사실과 분리하여 가설로만 작성. 단정하지 않습니다."></textarea></label>
  <label>다른 설명 가능성<textarea name="alternatives" maxlength="1000" rows="2" placeholder="습관·발달·감각·틱·강박·피로·상황 등 필요에 따라 검토"></textarea></label>
  <label>추가로 확인해야 할 내용<textarea name="uncertainty" maxlength="1000" rows="2" placeholder="아직 모르는 점과 확인 자료"></textarea></label>
  <label>기록 사용이 학생에게 부담이 되었나요? <small>(상담에서 확인, 선택)</small>
   <select name="burdenReview">
    <option value="">확인하지 않음 / 기록하지 않음</option>
    <option value="학생이 별다른 부담을 말하지 않음">학생이 별다른 부담을 말하지 않음</option>
    <option value="부담 또는 반복 확인이 보고됨">부담 또는 반복 확인이 보고됨</option>
    <option value="작성 축소·중단 또는 다른 방법을 합의함">작성 축소·중단 또는 다른 방법을 합의함</option>
   </select>
  </label>
  <label>회기에서 확인할 질문<textarea name="question" maxlength="1200" rows="2" placeholder="정답 확인이나 반복적인 안심 제공이 아닌 개방형 질문"></textarea></label>
 </div>
</details>
<details class="clinician-extra">
 <summary>CBT·ERP 회기 검토 <small>훈련받은 치료사만 · 선택</small></summary>
 <div class="clinician-extra-inner">
  <p class="clinical-neutral"><strong>치료사 전용 임상 메모입니다.</strong> 강박 증상을 확인했다는 표시가 아니며 자동 과제·노출·반응방지 지시를 생성하지 않습니다. 적합성 평가, 치료적 합의, 개별 안전 검토가 선행되어야 합니다.</p>
  <label>회기 검토 상태<select name="erpReview"><option value="">선택하지 않음</option><option value="적합성 평가가 필요함">적합성 평가가 필요함</option><option value="별도의 치료계획에서 검토 중">별도의 치료계획에서 검토 중</option><option value="이번 회기에 해당 없음">이번 회기에 해당 없음</option></select></label>
  <label>치료사 전용 목표·계획 메모<textarea name="erpTarget" maxlength="1200" rows="2" placeholder="실제 치료계획이 있는 경우에만 기재. 학생 앱에 자동 전달되지 않음."></textarea></label>
  <label>합의·안전·경과 관련 확인<textarea name="erpSafety" maxlength="1000" rows="2" placeholder="학생과의 합의, 치료 반응, 안전 관련 확인 필요사항"></textarea></label>
 </div>
</details>
<details class="clinician-extra">
 <summary>CBIT·틱 관련 회기 검토 <small>훈련받은 치료사만 · 선택</small></summary>
 <div class="clinician-extra-inner">
  <p class="clinical-neutral"><strong>치료사 전용 임상 메모입니다.</strong> 일기만으로 CBIT가 시행된 것은 아닙니다. 틱과 강박행동을 같은 것으로 간주하지 않으며 경쟁반응을 자동으로 추천하지 않습니다.</p>
  <label>회기 검토 상태<select name="cbitReview"><option value="">선택하지 않음</option><option value="적합성 평가가 필요함">적합성 평가가 필요함</option><option value="별도의 치료계획에서 검토 중">별도의 치료계획에서 검토 중</option><option value="이번 회기에 해당 없음">이번 회기에 해당 없음</option></select></label>
  <label>틱 관련 상황·기능적 영향<textarea name="cbitContext" maxlength="1000" rows="2" placeholder="회기에서 확인된 맥락과 일상생활 영향, 추측과 구분"></textarea></label>
  <label>치료사 전용 목표·계획 메모<textarea name="cbitTarget" maxlength="1200" rows="2" placeholder="치료 평가와 합의에 근거한 계획만. 학생 앱으로 자동 전송되지 않음."></textarea></label>
 </div>
</details>
<div class="clinician-save-row"><button class="button" type="submit">치료사 메모 보관</button><p>모든 항목은 선택입니다. 별도의 임상 평가·동의 절차와 치료기록을 대신하지 않습니다.</p></div>
</form><div id="sessionSaved"></div></section><section class="panel" data-workspace-view="accounts"><span class="tag">02 / ACCOUNTS</span><h2>학생·학부모 초대하기</h2><p>초대코드를 전달해 담당 학생·학부모를 연결해요.</p><form id="inviteForm" class="form"><label>초대할 사람<select name="role" id="inviteRole"><option value="student">학생</option><option value="parent">학부모</option></select></label><label id="studentPicker" class="hidden">연결할 학생<select name="studentId">${students.map(s=>`<option value="${sanitize(s.id)}">${sanitize(s.nickname)}</option>`).join('')}</select></label><button class="button">초대 링크 만들기</button></form><div id="inviteOutput"></div></section><section class="panel" data-workspace-view="accounts"><span class="tag">02 / ACCOUNT HELP</span><h2>계정 접근 도움말</h2><p>이메일 인증이 되지 않으면 담당 운영자에게 문의해 주세요. 계정은 역할별로 구분됩니다.</p><label>대상 계정<select id="resetUser">${accounts.map(a=>`<option value="${sanitize(a.id)}">${sanitize(a.nickname)} · ${a.role==='student'?'학생':'학부모'}</option>`).join('')}</select></label><div class="buttons"><button id="resetIssue" class="button-ghost" ${accounts.length?'':'disabled'}>재설정 코드 발급</button></div><div id="resetOutput"></div></section><section class="panel full" data-workspace-view="drive"><span class="tag">03 / GOOGLE DRIVE</span><h2>Google Drive</h2><p>${drive.connected?'내 구글 계정이 연결돼 있습니다.':'구글 계정 연결 전입니다. 학생 기록은 아직 자동 업로드되지 않습니다.'}</p><div class="buttons"><button id="googleConnect" class="button-ghost" ${drive.configured&&drive.backupEnabled?'':'disabled'}>${drive.connected?'구글 계정 다시 연결':'내 구글 계정 연결'}</button><button id="driveSync" class="button" ${drive.connected&&drive.backupEnabled?'':'disabled'}>공유 기록 백업</button>${drive.folderUrl?`<a class="button-ghost" href="${sanitize(drive.folderUrl)}" target="_blank" rel="noopener noreferrer">내 드라이브 폴더 열기 ↗</a>`:''}</div>${!drive.backupEnabled?hint('보존·삭제·동의 및 사본 처리 정책 검증 전까지 Google Drive 백업이 비활성화되어 있습니다. 서버 공유를 취소해도 기존 다운로드 파일은 자동으로 회수되지 않습니다.'):!drive.configured?hint('구글 OAuth 관리자 설정이 아직 끝나지 않았습니다.'):''}<p>삭제 확인이 필요한 사본은 치료사의 기록 관리자에게 문의하세요.</p></section></div></div></div>`;
attachShares();bindWorkspace();paintSketches();initSessionNotes();const rerenderInbox=()=>{const name=$('filterStudent').value,kind=$('filterKind').value;const list=records.filter(r=>(name==='all'||r.student===name)&&(kind==='all'||r.kind===kind));$('inboxResults').innerHTML=recordCards(list);paintSketches();};$('filterStudent').onchange=rerenderInbox;$('filterKind').onchange=rerenderInbox;$('refresh').onclick=()=>dashboard();$('csv').onclick=exportCSV;$('inviteRole').onchange=()=>{$('studentPicker').classList.toggle('hidden',$('inviteRole').value!=='parent')};$('inviteForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;loading(f.querySelector('button'),async()=>{const out=await api('invites',{method:'POST',body:{role:formValue(f,'role'),studentId:formValue(f,'studentId')}});const div=$('inviteOutput');div.innerHTML='<p class="muted">학생 또는 보호자 전용 링크입니다. 48시간 후 만료되며 처음 등록에 한 번만 사용됩니다. 카카오톡으로 개별 전달해 주세요.</p><textarea id="inviteCode" readonly></textarea><button class="button-ghost" type="button" id="copyCode">초대 링크 복사</button>';$('inviteCode').value=invitationUrl(out.invite);$('copyCode').onclick=()=>{navigator.clipboard.writeText(invitationUrl(out.invite)).then(()=>toast('링크를 복사했어요. 카카오톡으로 전달해 주세요.')).catch(()=>toast('복사가 차단돼 있습니다. 링크를 길게 눌러 복사해 주세요.'))}})};
$('resetIssue').disabled=true;$('googleConnect').onclick=()=>{location.assign('/api/drive/start')};$('driveSync').onclick=e=>loading(e.target,async()=>{const x=await api('drive/sync',{method:'POST'});toast(`${x.synced}건을 담당 치료사의 드라이브에 백업했습니다.`);await dashboard()});}
function adminHome(){app.innerHTML=hero('계정 운영','최초 관리자 계정은 기록을 읽을 수 없습니다. 치료사 초대만 발급할 수 있어요.')+`<div class="panel"><h2>치료사 초대코드 발급</h2><p>치료사도 학생·학부모와 같은 패스키 방식으로 등록합니다.</p><button id="inviteTherapist" class="button">치료사 초대코드 만들기</button><div id="adminInvite"></div></div>`;$('inviteTherapist').onclick=e=>loading(e.target,async()=>{const r=await api('invites',{method:'POST',body:{role:'therapist'}});const d=$('adminInvite');d.innerHTML='<p>코드를 복사해 치료사에게 개별 전달하세요. 7일간 유효합니다.</p><textarea readonly id="adminCode"></textarea>';$('adminCode').value=r.invite;})}
async function dashboard(){header();records=me.role==='admin'?[]:(await api('records')).records??[];if(me.role==='therapist')await therapistHome();else if(me.role==='admin')adminHome();else studentHome();}
function render(){header();if(!me)loginScreen();else dashboard().catch(e=>{app.innerHTML=hint('화면을 불러오지 못했어요. '+sanitize(e.message))})}
(async()=>{await refreshAuth()})();

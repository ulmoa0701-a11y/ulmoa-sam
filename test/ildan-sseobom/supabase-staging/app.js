const $=(id)=>document.getElementById(id);const app=$('app'),account=$('account');
let me=null,records=[],students=[],therapists=[],view='login',drive={connected:false,configured:false};
let activeView='write',editingPracticeRecord=null;
let clinicianRecordsLoadedAt=0,clinicianRefreshPending=null,clinicianRefreshVisible=null;
let notifyRefreshVisible=null,notifyTimer=null,notifyLoading=null,noticeCache=[];
let feedbackCache=new Map();
const sanitize=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const hint=(s)=>`<div class="callout">${s}</div>`;
function toast(s){$('toast').textContent=s;$('toast').classList.add('visible');setTimeout(()=>$('toast').classList.remove('visible'),3400)}
import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.105.0/+esm';
import {mediaWidget,attachPracticePhotos,getPracticePhotos,setPracticePhotos,savePracticeRecord,updatePracticeRecord,listPracticeRecords,deletePracticeRecord,markPracticeTransfer,photosMarkup} from './trial-media.mjs';
import {writtenDay,recordVolume,calendarIndex,monthVolume} from './record-calendar.mjs';
import {renderWritingCalendar as mountWritingCalendar} from './writing-calendar.mjs';
import {mountDailyCheckins} from './daily-checkin.mjs';
import {feedbackMarkup,installFeedbackActions} from './feedback-ui.mjs';
import {setupPushPanel} from './push-client.mjs';
const CFG=window.ILDAN_SUPABASE_CONFIG||{};
const configured=Boolean(/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(CFG.url||'')
 && /^sb_publishable_|^eyJ/.test(CFG.publishableKey||'')
 && /^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/ildan-api$/.test(CFG.apiUrl||''));
const supabase=configured?createClient(CFG.url,CFG.publishableKey,{
 auth:{persistSession:true,storage:{getItem:k=>sessionStorage.getItem(k)??localStorage.getItem(k),setItem:(k,v)=>{const persist=localStorage.getItem('ildanPersonalDevice')==='yes';(persist?localStorage:sessionStorage).setItem(k,v);(persist?sessionStorage:localStorage).removeItem(k)},removeItem:k=>{sessionStorage.removeItem(k);localStorage.removeItem(k)}},autoRefreshToken:true,detectSessionInUrl:true,experimental:{passkey:true}}
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
async function publicInviteApi(path,code,extra={}){
 if(!supabase)throw Error('Supabase 연결 정보를 확인할 수 없습니다.');
 const result=await fetch(CFG.apiUrl+'/'+path,{
  method:'POST',mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',
  headers:{'Content-Type':'application/json',apikey:CFG.publishableKey},
  body:JSON.stringify({code,...extra})
 });
 const data=await result.json().catch(()=>({}));
 if(!result.ok)throw Error(data.error||'초대 링크를 확인할 수 없습니다.');
 return data;
}
async function inviteLanding(){
 header();const code=activeInvite;
 if(!code){loginScreen();return;}
 app.innerHTML=`<section class="login-page invite-landing" aria-label="일단써봄 초대 링크">
  <div class="login-heading"><span class="eyebrow">WELCOME / 일단써봄</span>
   <h1>링크 하나로<br><em>바로 들어가봄.</em></h1>
   <p>별도 확인 번호·비밀번호·이메일 인증 없이 연결해요.</p></div>
  <section class="login-window"><div class="login-body">
   <h2 id="inviteRoleTitle">접속 링크 확인 중</h2>
   <p id="inviteStatus" role="status" aria-live="polite">계정에 연결하고 있어요. 잠시만 기다려 줘.</p>
   <button class="button" type="button" id="inviteRetry" hidden>다시 접속하기</button>
   <button class="button-ghost" type="button" id="inviteCopy">다른 브라우저에서 열 링크 복사</button>
   <p class="muted">같은 링크는 다음에도 사용할 수 있어요. 다만 링크를 받은 다른 사람도 접속할 수 있으므로 공유하지 말아 줘.</p>
   <p class="muted">현재 체험판은 실제 아동의 개인정보·상담기록을 저장할 수 없어.</p>
  </div></section></section>`;
 const status=$('inviteStatus'),retry=$('inviteRetry');
 $('inviteCopy').onclick=()=>navigator.clipboard.writeText(invitationUrl(code))
  .then(()=>toast('접속 링크를 복사했어. 원하는 브라우저에서 열어 줘.'))
  .catch(()=>toast('브라우저 메뉴에서 링크를 복사해 줘.'));
 const connect=async()=>{
  retry.hidden=true;status.textContent='연결하고 있어요...';
  try{
   const info=await publicInviteApi('invite-preview',code);
   $('inviteRoleTitle').textContent=(inviteRoles[info.role]||'사용자')+' 계정 연결';
   if(!info.registrationOpen)throw Error('사용할 수 없는 링크야. 담당 치료사에게 문의해 줘.');
   const out=await publicInviteApi('invite-register',code);
   localStorage.setItem('ildanPersonalDevice','yes');
   const {error}=await supabase.auth.verifyOtp({token_hash:out.tokenHash,type:'magiclink'});
   if(error)throw Error('로그인이 완료되지 않았어. 다시 접속하기를 눌러 줘.');
   activeInvite=null;history.replaceState(null,'',location.pathname+location.search);
   toast(out.reconnected?'기존 계정으로 다시 연결됐어.':'계정이 연결됐어. 다음에도 이 링크로 들어오면 돼.');
   await refreshAuth();
  }catch(e){
   status.textContent=e.message||'연결에 실패했어. 다시 시도해 줘.';
   retry.hidden=false;
  }
 };
 retry.onclick=connect;await connect();
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
function header(){if(!me){account.innerHTML='<span class="role-chip">안전한 기록</span>';return}account.innerHTML=`<span>${sanitize(me.nickname)} <span class="role-chip">${me.role==='therapist'?'치료사':me.role==='student'?'학생':me.role==='parent'?'학부모':'관리자'}</span></span><button id="signOut">로그아웃</button>`;attachTherapistDeviceRegistration();$('signOut').onclick=async()=>{if(supabase)await supabase.auth.signOut();me=null;records=[];activeView='write';render();};}
// Register a device only after verified Auth login AND manual role approval.
function attachTherapistDeviceRegistration(){
 if(me?.role!=='therapist'||me.trial||!supabase)return;
 const logout=$('signOut');if(!logout)return;
 const b=document.createElement('button');
 b.id='registerTherapistPasskey';b.type='button';b.textContent='이 기기 등록';
 b.disabled=!passkeyAvailable();
 b.title='승인된 치료사의 기기 인증 등록';
 logout.before(b);
 b.onclick=()=>loading(b,async()=>{
  const {error}=await supabase.auth.registerPasskey();
  if(error)throw Error('기기 등록을 완료하지 못했습니다. 브라우저나 Supabase 패스키 설정을 확인해 주세요.');
  toast('기기 등록을 완료했습니다. 다음부터는 등록한 기기로 로그인할 수 있어요.');
 });
}
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
 <p>본인 확인이 되었어도 학생·보호자·치료사 권한은 자동으로 만들어지지 않습니다.
 담당자가 실제 사용자와 역할을 확인한 뒤 계정을 연결해야 합니다.</p>
 <label>내 계정 식별번호<input readonly id="clinicianVerifiedUid" value="${sanitize(id)}"></label>
 <p class="muted">이 번호를 공개 게시판에 올리지 마세요. 실제 학생·보호자 상담기록은 아직 저장할 수 없습니다.</p>
 <div class="buttons"><button id="clinicianRecheck" class="button" type="button">권한 다시 확인</button>
 <button id="clinicianSignOut" class="button-ghost" type="button">로그아웃</button></div>
 </div></section></section>`;
 $('clinicianRecheck').onclick=()=>refreshAuth();
 $('clinicianSignOut').onclick=async()=>{await supabase.auth.signOut();me=null;render()};
}

async function trialAccountEmail(username){
 const name=String(username||'').trim().normalize('NFC').toLowerCase();
 const bytes=new TextEncoder().encode(name);
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 const hex=Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
 return 'trial-'+hex.slice(0,48)+'@members.ildan.example';
}
async function trialSignIn(username,password){
 const email=await trialAccountEmail(username);
 const result=await supabase.auth.signInWithPassword({email,password});
 if(result.error)throw Error('아이디 또는 비밀번호를 확인해 주세요.');
 await refreshAuth();
}
function loginScreen(){
 app.innerHTML=`<section class="login-page" aria-label="일단써봄 체험 로그인">
  <div class="login-heading"><span class="eyebrow">일단써봄 / 체험하기</span>
   <h1>복잡한 인증 없이,<br><em>일단 시작해봄.</em></h1>
   <p>치료사는 간단히 계정을 만들고, 학생과 보호자는 초대 링크로 연결해요.</p></div>
  <div class="login-layout"><section class="login-window"><div class="login-body">
  <div class="buttons" role="group" aria-label="계정 이용 방법">
   <button id="firstChoice" class="button" type="button">처음 이용해요</button>
   <button id="returnChoice" class="button-ghost" type="button">이미 계정이 있어요</button></div>
  <section id="firstLogin"><h2>치료사 체험 계정 만들기</h2>
   <p>이메일 인증 없이 아이디와 비밀번호만 정하면 바로 체험할 수 있어요.</p>
   <form id="trialSignupForm" class="form">
    <label>사용할 아이디<input name="username" autocomplete="username" minlength="3" maxlength="20" required
      placeholder="예: ulmoa_teacher"></label>
    <label>비밀번호<input name="password" type="password" autocomplete="new-password"
      minlength="8" maxlength="72" required placeholder="문자·숫자 포함 8글자 이상"></label>
    <label><input type="checkbox" id="rememberTrialDevice" checked> 이 기기에서 로그인 유지</label>
    <button class="button" type="submit">무료로 체험 시작하기</button>
   </form><p id="trialSignupStatus" role="status" class="muted">아이디와 비밀번호는 나중에 다시 접속할 때 필요해요.</p>
   <div class="callout"><strong>학생·보호자는?</strong>
    <p>치료사가 만든 별도 초대 링크를 받아 본인 확인 후 접속할 수 있어요.</p></div>
  </section>
  <section id="returnLogin" hidden><h2>기존 계정으로 로그인</h2>
   <form id="trialLoginForm" class="form">
    <label>아이디<input name="username" autocomplete="username" required
      placeholder="등록했던 아이디"></label>
    <label>비밀번호<input type="password" name="password" autocomplete="current-password" required
      placeholder="비밀번호"></label>
    <label><input type="checkbox" id="rememberLoginDevice" checked> 이 기기에서 로그인 유지</label>
    <button class="button" type="submit">로그인</button>
   </form><p class="muted">학생·보호자는 기존 초대 링크 또는 담당 치료사에게 재접속 링크를 요청해 주세요.</p>
  </section>
  <p class="muted">현재는 기능 체험 단계예요. 실명, 진단명, 실제 아동·상담 내용은 입력하지 마세요.</p>
  </div></section></div></section>`;
 const first=$('firstLogin'),ret=$('returnLogin'),a=$('firstChoice'),b=$('returnChoice');
 const toggle=(returning)=>{first.hidden=returning;ret.hidden=!returning;
  a.className=returning?'button-ghost':'button';b.className=returning?'button':'button-ghost';
  a.setAttribute('aria-pressed',String(!returning));b.setAttribute('aria-pressed',String(returning));};
 a.onclick=()=>toggle(false);b.onclick=()=>toggle(true);toggle(false);
 $('trialSignupForm').onsubmit=e=>{e.preventDefault();
  const form=e.currentTarget,btn=form.querySelector('button[type="submit"]');
  loading(btn,async()=>{
   if(!supabase)throw Error('계정 서버에 연결할 수 없습니다.');
   const username=formValue(form,'username').normalize('NFC').toLowerCase();
   const password=formValue(form,'password');
   if(!/^[a-z0-9가-힣_-]{3,20}$/.test(username))
    throw Error('아이디는 한글·영문·숫자·밑줄·하이픈 3~20글자로 입력해 주세요.');
   if(password.length<8||password.length>72||!/[A-Za-z가-힣]/.test(password)||!/[0-9]/.test(password))
    throw Error('비밀번호는 문자와 숫자를 포함한 8글자 이상이어야 합니다.');
   const r=await fetch(CFG.apiUrl+'/test-therapist-signup',{
    method:'POST',mode:'cors',credentials:'omit',
    headers:{'Content-Type':'application/json',apikey:CFG.publishableKey},
    body:JSON.stringify({username,password})
   });
   const result=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(result.error||'체험 계정 생성에 실패했습니다.');
   localStorage.setItem('ildanPersonalDevice',$('rememberTrialDevice').checked?'yes':'no');
   $('trialSignupStatus').textContent='계정이 만들어졌어요. 지금 로그인할게요.';
   await trialSignIn(username,password);
  });
 };
 $('trialLoginForm').onsubmit=e=>{e.preventDefault();
  const form=e.currentTarget,btn=form.querySelector('button[type="submit"]');
  loading(btn,async()=>{
   if(!supabase)throw Error('계정 서버에 연결할 수 없습니다.');
   localStorage.setItem('ildanPersonalDevice',$('rememberLoginDevice').checked?'yes':'no');
   await trialSignIn(formValue(form,'username'),formValue(form,'password'));
  });
 };
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
function renderWritingCalendar(){
 const root=$('writingCalendar');if(root&&['student','therapist'].includes(me?.role))mountWritingCalendar(root,{role:me.role,records:shownRecords(records),students:me.role==='therapist'?students:[],onNewRecord:()=>activateWorkspace('write')});
}

async function refreshDailyCheckins(){
 const root=$('dailyCheckin');
 if(!root||!me||!['student','parent','therapist'].includes(me.role))return;
 try{
  const result=await api('practice-checkins');
  if(!root.isConnected)return;
  mountDailyCheckins(root,{
   role:me.role,checkins:result.checkins||[],students,
   onSave:async value=>{
    try{await api('practice-checkins',{method:'POST',body:value});
     toast(value.share?'하루 체크를 저장하고 선생님에게 공유했어요.':'하루 체크를 나만 보기로 저장했어요.');
     await refreshDailyCheckins();
    }catch(e){toast('저장되지 않았어요: '+e.message)}
   },
   onDelete:async day=>{
    try{await api('practice-checkin-delete',{method:'POST',body:{day}});toast('이 날짜 체크를 삭제했어요.');await refreshDailyCheckins()}
    catch(e){toast('삭제하지 못했어요: '+e.message)}
   }
  });
 }catch(e){root.textContent='상태 체크 달력을 불러오지 못했어요. 연결을 확인하고 다시 열어 주세요.'}
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
  activateWorkspace(b.dataset.workspaceTarget);paintSketches();if(me?.role==='parent'&&activeView==='calendar')renderParentCalendar();if(activeView==='writingCalendar')renderWritingCalendar();
  if(activeView==='daily')void refreshDailyCheckins();
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
 <label class="parent-main-label">어떤 일을 보거나 들으셨나요? <small>선택 · 사진만 남겨도 됩니다</small><textarea name="observation" maxlength="360" rows="3" placeholder="기억나는 사실만 간단히. 원인이나 진단을 추측하지 않아도 됩니다."></textarea></label>
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
 ${mediaWidget()}
 <div class="privacy-panel parent-privacy trial-sharing-hidden" hidden aria-hidden="true"><label class="checkbox"><input type="checkbox" name="share" disabled><span>담당 치료사에게 전달하기<small>선택하지 않으면 내 기록에만 남아요.</small></span></label><div id="sharePicker" class="share-picker" hidden>
 <p>관찰 내용을 공유하면 날짜·시간·장소·선택한 표시도 함께 전달돼요. 아래 추가 항목은 직접 고른 것만 보냅니다.</p>
 ${['observation','origin','context','childWords','response','after','impact','message'].map(k=>`<label><input type="checkbox" name="shareField" value="${k}" ${k==='observation'?'checked':''}><span>${NOTE_LABELS[k]}</span></label>`).join('')}
 </div></div>
 <div class="practice-sync-box"><strong>연습용 서버에 저장</strong><p>가상 기록은 다른 기기에서도 다시 볼 수 있어요. 실제 아동의 개인정보·상담내용·사진은 아직 넣지 말아 주세요.</p><label><input name="practiceShare" type="checkbox"> 이 기록과 사진·그림을 담당 치료사에게도 공유하기</label></div>
 <button class="button entry-save" id="saveEntry">💾 연습 기록 저장하기</button><p class="parent-nudge">보호자는 관찰하거나 전해 들은 사실만 남기면 됩니다. 기록하지 않는 날도 괜찮습니다. 진단이나 원인 판단은 하지 않아도 됩니다. 실시간 상담·응급 연락창이 아닙니다.</p></form>`;
 return `<form class="form entry-v5 student-journal" id="entryForm" data-journal-mode="quick">
 <div class="student-mode-header"><div class="student-mode-title">어떤 방식으로 남길까?</div><div class="journal-mode-switch" role="group" aria-label="기록 상세 정도 선택"><button class="journal-mode-btn active" type="button" data-journal-mode="quick" aria-pressed="true"><strong>⚡ 간편 기록</strong><small>한두 줄이면 끝</small></button><button class="journal-mode-btn" type="button" data-journal-mode="detail" aria-pressed="false"><strong>▤ 자세히 기록</strong><small>필요한 만큼 더 쓰기</small></button></div><p class="student-mode-hint" id="journalModeHint" aria-live="polite">한 줄만 남겨도 돼. 나머지는 선택이야.</p></div>
 <section class="student-info-card" aria-label="기록 날짜, 시간, 장소">
 <div class="student-datetime-heading"><strong>언제, 어디에서?</strong><button type="button" id="studentSetNow" class="student-now-btn" aria-label="날짜와 시간을 현재 시각으로 설정">↻ 지금으로 설정</button></div>
 <div class="student-datetime-grid"><label class="student-date-field">날짜<input name="date" type="date" max="${todayLocal()}" value="${todayLocal()}"></label><label class="student-time-field">시간 <small>(선택)</small><input name="time" type="time" value="${nowLocalTime()}"></label><label class="student-place-field">장소 <small>(선택)</small><input name="place" maxlength="100" placeholder="기억나는 곳만"></label></div>
 <p class="student-datetime-hint">현재 날짜·시간 자동 입력 · 필요하면 직접 변경할 수 있어.</p>
 </section>
 <div class="student-mode-advanced">
 <div class="student-extra-grid"><label>제목 <small>(선택)</small><input name="title" maxlength="80" placeholder="제목 없이 써도 돼"></label></div>
 <p class="muted">글은 아래에 적고, 사진이나 그림은 저장 전에 원하는 만큼 추가할 수 있어.</p></div>
 <div id="textPanel"><label class="student-note-label">하고 싶은 이야기 <small>(짧아도 좋아)</small><textarea name="note" maxlength="4000" rows="5" placeholder="오늘 있었던 일, 좋은 일, 고민, 그냥 생각나는 말... 자유롭게."></textarea></label></div>
 <details class="entry-examples student-examples"><summary>✎ 어떻게 적을까? 짧은 예시 보기 <small>필요할 때만</small></summary><div class="entry-examples-body"><p>이건 가상의 예시야. 따라 쓸 필요 없이 네 이야기만 남기면 돼.</p><div class="example-lines"><p>“오늘 친구랑 점심시간에 이야기했어.”</p><p>“집에 와서 조금 쉬었어. 오늘 기분은 잘 모르겠어.”</p><p>“지금은 글보다 기분만 선택하고 싶어.”</p></div><p>한두 줄, 감정만, 또는 아무것도 적지 않아도 괜찮아.</p></div></details>
 <section class="student-emotion-quick" id="stateDetails" aria-label="그때의 감정 선택"><div class="student-emotion-title"><strong>그때 어떤 기분이었어?</strong> <small>선택 · 여러 개 또는 선택 안 함</small></div><div class="emotion-quick-body"><div class="emotion-grid" aria-label="감정 선택">${STUDENT_EMOTIONS.map(w=>`<label class="emotion-chip"><input name="emotionChoice" type="checkbox" value="${w}"><span>${w}</span></label>`).join('')}</div>
 <details class="emotion-more"><summary>다른 감정도 보기 <span>+ ${Object.values(STUDENT_MORE_EMOTIONS).flat().length}개</span></summary>${Object.entries(STUDENT_MORE_EMOTIONS).map(([group,words])=>`<div class="emotion-group"><p>${group}</p><div class="emotion-grid">${words.filter(w=>!STUDENT_EMOTIONS.includes(w)).map(w=>`<label class="emotion-chip"><input name="emotionChoice" type="checkbox" value="${w}"><span>${w}</span></label>`).join('')}</div></div>`).join('')}</details>
 <details class="emotion-extra-optional"><summary>내 말로 표현하거나 컨디션도 남기기 <small>(선택)</small></summary><div class="emotion-extra-fields"><label>내 말로 표현하기 <small>(선택)</small><input name="emotionOther" maxlength="100" placeholder="위에 없는 감정이나 내 표현"></label><label>컨디션 <small>(선택)</small><select name="energy"><option value="">선택하지 않음</option><option>괜찮음</option><option>기운 있음</option><option>조금 피곤함</option><option>많이 피곤함</option><option>잘 모르겠음</option></select></label></div></details></div></section>
 <div class="student-mode-advanced">
 
 

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
 ${mediaWidget()}
 <div class="privacy-panel student-share trial-sharing-hidden" hidden aria-hidden="true"><label class="checkbox"><input type="checkbox" name="share" disabled><span>담당 치료사에게 기록 공유하기<small>기본 비공개 · 공유 내용은 직접 고를 수 있어.</small></span></label>
 <div id="sharePicker" class="share-picker" hidden><div class="student-share-bar"><strong>보낼 항목 선택</strong><div class="student-share-actions"><button type="button" class="button-ghost" id="studentSelectAll">전체 선택</button><button type="button" class="button-ghost" id="studentClearAll">선택 해제</button></div></div>
 ${['title','date','time','place','note','sketch','mood','energy','thought','body','action','experience','experienceImpact','abcBefore','abcBehavior','abcAfter'].map(k=>`<label class="student-share-field"><input type="checkbox" name="shareField" value="${k}"><span>${NOTE_LABELS[k]}</span></label>`).join('')}<p id="studentShareCount" aria-live="polite">보낼 항목을 선택해 줘. 작성하지 않은 항목은 선택되지 않아.</p><p>선택하지 않은 내용은 치료사에게 보내지 않아. 전송 전에 확인할 수 있어.</p></div></div>
 <div class="practice-sync-box"><strong>연습용 서버에 저장해</strong><p>가상 기록은 휴대폰을 바꿔도 볼 수 있어. 진짜 학생의 개인정보나 상담 내용은 아직 적지 말아 줘.</p><label><input name="practiceShare" type="checkbox"> 이 기록과 사진·그림을 담당 치료사에게도 공유할래</label></div>
 <button class="button entry-save" id="saveEntry">💾 연습 기록 저장하기</button><p class="student-save-note">매일 쓰지 않아도 괜찮아. 기록을 정확하게 쓰려 애쓸 필요도 없어. 실시간 상담·응급 연락창이 아니야. 연습용 서버에 가상 기록을 저장할 수 있어. 실제 학생의 상담정보나 사진은 아직 입력하지 마.</p>
 </form>`;
}function gatherEntry(f,role){
 const fields=role==='parent'?['date','time','place','observation','origin','context','childWords','response','after','impact','message']:['date','time','place','title','note','energy','thought','body','action','experience','experienceImpact','abcBefore','abcBehavior','abcAfter'];
 const entry={};fields.forEach(k=>{const value=formValue(f,k);if(value)entry[k]=value});
 if(role==='parent'){
  if(sketchStrokes.length)entry.sketch=JSON.stringify(sketchStrokes);
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
 canvas.addEventListener('pointerdown',e=>{if(total()>=1200)return;canvas.setPointerCapture(e.pointerId);sketchActive=true;sketchStrokes.push([xy(e)]);draw()});
 canvas.addEventListener('pointermove',e=>{if(!sketchActive||total()>=1200)return;const path=sketchStrokes[sketchStrokes.length-1],p=xy(e),q=path[path.length-1];if(Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1])>4){path.push(p);draw()}});
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,()=>{sketchActive=false});
 $('undoStroke').onclick=()=>{sketchStrokes.pop();draw()};$('clearSketch').onclick=()=>{sketchStrokes=[];draw()};draw();
}
function sharePreview(fields,entry){return fields.map(k=>{const v=String(entry[k]||'');return '• '+(NOTE_LABELS[k]||k)+': '+(k==='sketch'?'[아래 그림 전체 미리보기]':v)}).join('\n\n')}
function confirmSharedEntry(fields,entry){
 return new Promise(resolve=>{
  let d=document.getElementById('shareReviewDialog');
  if(!d){d=document.createElement('dialog');d.id='shareReviewDialog';d.className='share-review-dialog';d.innerHTML='<h2>담당 치료사에게 공유할 내용</h2><p class="share-review-help">아래 항목만 공유돼. 선택하지 않은 내용은 보내지 않아. 가상 기록에 한해 연습용 서버로 전송돼.</p><pre class="share-review-body"></pre><div class="share-review-sketch"></div><p class="share-review-help">보낸 뒤에는 공유를 취소할 수 있지만 이미 별도로 복사된 자료까지 되돌릴 수는 없어.</p><div class="share-review-actions"><button type="button" data-cancel class="button-ghost">돌아가기</button><button type="button" data-approve class="button">이 내용 공유하기</button></div>';document.body.append(d);}
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

async function uploadPracticePhotos(existing=null,sources=getPracticePhotos()){
 const photos=sources,paths=[];
 for(const src of photos){
  if(!src.startsWith('data:image/jpeg;base64,')){
   const i=existing?.entry?.photos?.indexOf(src)??-1;
   const oldPath=i>=0?existing?.photoPaths?.[i]:null;
   if(!oldPath)throw Error('이전에 저장한 사진을 확인할 수 없어. 내 기록을 새로 열어 줘.');
   paths.push(oldPath);
   continue;
  }
  const signed=await api('practice-media-sign',{method:'POST',body:{}});
  if(!signed.token||!signed.path||signed.bucket!=='ildan-practice-media')throw Error('사진 업로드 준비에 실패했어.');
  const bytes=Uint8Array.from(atob(src.split(',')[1]),c=>c.charCodeAt(0));
  const blob=new Blob([bytes],{type:'image/jpeg'});
  if(blob.size>signed.maxBytes)throw Error('사진이 너무 커서 업로드할 수 없어.');
  const {error}=await supabase.storage.from(signed.bucket).uploadToSignedUrl(signed.path,signed.token,blob,{contentType:'image/jpeg'});
  if(error)throw Error('사진 업로드에 실패했어. 연결 상태를 확인해 줘. '+error.message);
  paths.push(signed.path);
 }
 return paths;
}
function compactSketchForCloud(entry){
 if(!entry.sketch)return entry;
 try{
  const strokes=JSON.parse(entry.sketch);
  if(!Array.isArray(strokes))return entry;
  const trimmed=strokes.filter(x=>Array.isArray(x)&&x.length).slice(0,60);
  const simplified=trimmed.map(stroke=>stroke.filter((p,i)=>i%Math.max(1,Math.ceil(stroke.length/Math.max(2,Math.floor(220/trimmed.length))))===0).slice(0,240));
  const remaining=simplified.reduce((a,b)=>a+b.length,0);
  if(remaining<=240)return {...entry,sketch:JSON.stringify(simplified)};
  return {...entry,sketch:JSON.stringify(simplified.map(x=>x.slice(0,4)))};
 }catch(_){return entry;}
}

function wireEntryForm(isParent){
 const f=$('entryForm'),button=$('saveEntry'),share=f.elements.share,area=$('sharePicker');
 const selectedKeys=()=>[...f.querySelectorAll('input[name="shareField"]:checked')].map(x=>x.value);
 sketchStrokes=[];
 if(editingPracticeRecord?.entry?.sketch){
  try{
   const previous=JSON.parse(editingPracticeRecord.entry.sketch);
   if(Array.isArray(previous)&&previous.length<=60
     &&previous.every(x=>Array.isArray(x)&&x.length<=240))
    sketchStrokes=previous;
  }catch(_){}
 }
 bindSketch();attachPracticePhotos(toast);
 if(editingPracticeRecord)setPracticePhotos(editingPracticeRecord.entry.photos||[]);
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
    if(journalModeHint)journalModeHint.textContent=mode==='quick'?'한 줄만 남겨도 돼. 나머지는 선택이야.':'감정·장소·그림·내 경험도 원하는 만큼 추가해 봐.';
    const extra=mode==='quick'&&['title','energy','thought','body','action','experience','experienceImpact','abcBefore','abcBehavior','abcAfter'].some(k=>!!formValue(f,k));
    const summary=$('journalHiddenNotice');if(summary)summary.hidden=!extra;
    updateStudentShare();
  }));
  f.addEventListener('input',updateStudentShare);f.addEventListener('change',updateStudentShare);
  $('studentSelectAll').onclick=()=>{updateStudentShare();f.querySelectorAll('input[name="shareField"]:not(:disabled)').forEach(x=>x.checked=true);updateStudentShare()};
  $('studentClearAll').onclick=()=>{f.querySelectorAll('input[name="shareField"]').forEach(x=>x.checked=false);updateStudentShare()};
  updateStudentShare();
 }
 f.onsubmit=async e=>{e.preventDefault();const entry=gatherEntry(f,me.role);
  const meaningful=(isParent?!!entry.observation:['note','sketch','mood','energy','thought','body','action','experience','experienceImpact','abcBefore','abcBehavior','abcAfter'].some(k=>!!entry[k]))||!!entry.sketch||getPracticePhotos().length>0;
  if(!meaningful){toast('글, 사진, 그림 중 하나만 있어도 괜찮아.');return;}
  if(isParent&&!entry.date){toast('일이 있었던 날짜를 선택해 주세요.');return;}
  loading(button,async()=>{
   const clean=compactSketchForCloud(entry),shareWithTherapist=Boolean(f.elements.practiceShare?.checked);
   const old=editingPracticeRecord;
   if(old?.local){
    const local={...clean},images=getPracticePhotos();if(images.length)local.photos=images;
    await updatePracticeRecord(me.id,old.id,local);
    editingPracticeRecord=null;activeView='history';await dashboard();
    toast('이 기기의 기존 기록을 수정했어.');
    return;
   }
   const paths=await uploadPracticePhotos(old);
   if(paths.length)clean.photos=paths;
   if(old){
    const out=await api('practice-update',{method:'POST',
     body:{recordId:old.id,expectedUpdatedAt:old.updatedAt,entry:clean,share:shareWithTherapist}});
    editingPracticeRecord=null;activeView='history';await dashboard();
    toast(out.photoCleanupPending?'내용은 수정됐어. 일부 사진 삭제를 다시 확인해야 해.':'수정 완료! 원래 기록이 업데이트됐어.');
   }else{
    await api('practice-records',{method:'POST',body:{entry:clean,share:shareWithTherapist}});
    activeView='history';await dashboard();
    toast(shareWithTherapist?'저장하고 담당 치료사에게 공유했어.':'연습용 서버에 저장했어. 다른 기기에서도 볼 수 있어.');
   }
   document.querySelector('[data-workspace-view="history"]')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
 };
}

// Preserve IndexedDB originals until server write is independently verified.
const transferInFlight=new Set();
const transferKeys=['date','event','thought','next','observation','message','note','category','mood','energy','body','action','response','impact','sketch','time','context','origin','place','signals','after','title','experience','experienceImpact','childWords','abcBefore','abcBehavior','abcAfter'];
function transferSignature(entry){
 const e=compactSketchForCloud(entry||{}),clean={};
 for(const k of transferKeys)if(typeof e[k]==='string'&&e[k].trim())clean[k]=e[k].trim();
 return JSON.stringify(clean);
}
function sourceEntryForTransfer(local){
 const entry={...(local.entry||{})};
 // Photo-only legacy notes need a date for the existing server-side validation; no invented words.
 if(Array.isArray(entry.photos)&&entry.photos.length&&!transferKeys.some(k=>typeof entry[k]==='string'&&entry[k].trim()))entry.date=writtenDay(local)||todayLocal();
 return entry;
}
function matchesDeviceCopy(local,cloud){
 if(!cloud?.practice||cloud.kind!==local.kind)return false;
 return transferSignature(sourceEntryForTransfer(local))===transferSignature(cloud.entry)
  &&(Array.isArray(local.entry?.photos)?local.entry.photos.length:0)===(Array.isArray(cloud.entry?.photos)?cloud.entry.photos.length:0);
}
async function migrateDeviceRecord(local){
 if(!['student','parent'].includes(me?.role)||!local?.local||local.owner!==me.id)throw Error('본인 기기에 저장된 기록만 옮길 수 있어요.');
 if(transferInFlight.has(local.id))return;
 transferInFlight.add(local.id);
 let savedOnServer=false;
 try{
  const before=(await api('practice-records')).records||[];
  const prior=before.filter(r=>matchesDeviceCopy(local,r));
  if(local.syncedTo&&before.some(r=>r.id===local.syncedTo)){await markPracticeTransfer(me.id,local.id,'done',local.syncedTo);return 'already';}
  // A previous request may have succeeded after the browser lost its reply.
  if(['sending','needs-review'].includes(local.transferState)){
   if(prior.length===1){await markPracticeTransfer(me.id,local.id,'done',prior[0].id);return 'recovered';}
   if(prior.length>1)throw Error('비슷한 서버 기록이 여러 개 있어요. 중복 전송을 막기 위해 자동 이전을 중단했어요.');
  }
  const photos=Array.isArray(local.entry?.photos)?local.entry.photos:[];
  if(photos.some(p=>typeof p!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p)))
   throw Error('예전 사진 형식을 자동으로 옮길 수 없어요. 원본은 유지되며, 사진을 다시 선택해야 해요.');
  await markPracticeTransfer(me.id,local.id,'sending');
  const entry=compactSketchForCloud(sourceEntryForTransfer(local));
  delete entry.photos;
  if(photos.length)entry.photos=await uploadPracticePhotos(null,photos);
  savedOnServer=true;
  const out=await api('practice-records',{method:'POST',body:{entry,share:false}});
  const cloudId=out.record?.id;
  if(!cloudId)throw Error('서버 저장 결과를 확인할 수 없어요. 기기 원본은 그대로 있어요.');
  const after=(await api('practice-records')).records||[];
  if(!after.some(r=>r.id===cloudId&&matchesDeviceCopy(local,r)))
   throw Error('서버에서 복사본을 확인하지 못했어요. 기기 원본은 그대로 있어요.');
  await markPracticeTransfer(me.id,local.id,'done',cloudId);
  return 'copied';
 }catch(e){
  await markPracticeTransfer(me.id,local.id,savedOnServer?'needs-review':'ready').catch(()=>{});
  throw e;
 }finally{transferInFlight.delete(local.id)}
}
function deviceOriginals(){return records.filter(r=>r.local&&r.syncedTo&&records.some(s=>s.practice&&s.id===r.syncedTo))}
function shownRecords(list=records){return list.filter(r=>!r.local||!r.syncedTo||!records.some(s=>s.practice&&s.id===r.syncedTo))}
function bindDeviceTransfer(){
 document.querySelectorAll('[data-practice-transfer]').forEach(b=>b.onclick=()=>loading(b,async()=>{
  const local=records.find(r=>r.id===b.dataset.practiceTransfer&&r.local);
  if(!local)throw Error('기기 원본을 찾지 못했어요. 새로고침해 주세요.');
  if(!confirm('이 기기의 기록을 연습용 서버에 비공개로 복사할까? 기기 원본은 삭제되지 않고, 치료사에게 자동 공유되지 않아.'))return;
  const status=await migrateDeviceRecord(local);
  await dashboard();toast(status==='recovered'?'이미 저장된 서버 기록을 확인했어.':'서버로 비공개 복사했어. 원본은 기기에 남아 있어.');
 }));
 const all=$('transferAllDevice');if(all)all.onclick=()=>loading(all,async()=>{
  const list=shownRecords(records).filter(r=>r.local&&!r.syncedTo);
  if(!list.length)return;
  if(!confirm(`기기의 임시 기록 ${list.length}건을 서버로 비공개 복사할까? 원본은 삭제하지 않으며 치료사에게 자동 공유하지 않아.`))return;
  let done=0;for(const record of list){
   try{await migrateDeviceRecord(record);done++;}
   catch(e){await dashboard();throw Error(`${done}건 확인 완료. 다음 기록에서 멈췄어요: ${e.message}`)}
  }
  await dashboard();toast(`${done}건을 서버에서 확인했어. 기기 원본은 유지돼.`);
 });
}
function prettyRecordEntry(entry){return Object.entries(entry??{}).map(([k,v])=> k==='photos'?photosMarkup(v):k==='sketch'?`<div class="sketch-record" data-sketch="${sanitize(v)}"><div class="sketch-mini-label">그림 메모</div><canvas width="760" height="380"></canvas></div>`:`<p><b>${sanitize(NOTE_LABELS[k]||k)}</b><br>${sanitize(v)}</p>`).join('');}
function paintSketches(){document.querySelectorAll('[data-sketch]').forEach(el=>{try{const arr=JSON.parse(el.dataset.sketch);if(!Array.isArray(arr)||arr.length>250)return;const ctx=el.querySelector('canvas').getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,760,380);ctx.strokeStyle='#5362cc';ctx.lineWidth=3.5;ctx.lineCap='round';ctx.lineJoin='round';arr.forEach(stroke=>{if(!Array.isArray(stroke)||!stroke.length)return;ctx.beginPath();stroke.slice(0,1200).forEach((p,i)=>{if(!Array.isArray(p)||p.length!==2||!Number.isFinite(p[0])||!Number.isFinite(p[1]))return;const x=Math.max(0,Math.min(760,p[0])),y=Math.max(0,Math.min(380,p[1]));i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()});}catch(_){}})}
function parentObservationFacts(entry={}){
 const fields=[['date','관찰 날짜'],['time','시간'],['place','장소'],['origin','정보 출처'],['signals','관찰한 모습(선택)'],['observation','보거나 들은 내용'],['context','그전·당시 상황'],['childWords','아이가 실제로 한 말'],['response','주변 사람의 말·행동'],['after','이후에 이어진 일'],['impact','일상에서 확인된 변화'],['message','보호자 전달사항']];
 return `<div class="observed-facts"><p class="clinical-neutral">보호자가 전달한 기록입니다. 직접 관찰했는지 또는 전해 들었는지 확인하고, 해석과 판단은 치료사가 별도로 검토합니다.</p>${fields.filter(([k])=>entry[k]).map(([k,name])=>`<div class="observed-fact-row"><strong>${name}</strong><span>${sanitize(entry[k])}</span></div>`).join('')}</div>`;
}
const recordFeedback=r=>feedbackMarkup(r,me?.role,feedbackCache.get(r.id));
async function loadFeedback(){try{const x=await api('practice-feedback');feedbackCache=new Map((x.feedback||[]).map(f=>[f.recordId,f]));}catch{feedbackCache=new Map();}}
function recordCards(list=records){
 list=shownRecords(list);
 if(!list.length)return '<div class="empty-state">아직 남겨둔 기록이 없습니다. 필요할 때만 작성해도 괜찮아요.</div>';
 return list.map(r=>{
  const time=sanitize(new Date(r.createdAt).toLocaleString('ko-KR'));
  const observed=r.entry?.date?`${r.kind==='parent'?'관찰':'기록'} ${sanitize(r.entry.date)}${r.entry.time?' '+sanitize(r.entry.time):''}${r.entry.place?' · '+sanitize(r.entry.place):''} · 작성 ${time}`:time;
  if(r.practice&&me.role!=='therapist')return `<article class="record archive-record practice-cloud-record"><div class="meta">연습용 서버 저장 · ${observed}${r.updatedAt&&new Date(r.updatedAt).getTime()-new Date(r.createdAt).getTime()>1000?' · 수정 '+sanitize(new Date(r.updatedAt).toLocaleString('ko-KR')):''} · ${r.shared?'치료사에게 공유 중':'나만 보기'}</div>${prettyRecordEntry(r.entry)}<div class="practice-record-actions"><button class="button-ghost" type="button" data-practice-edit="${sanitize(r.id)}">✎ 기록 수정하기</button>${r.shared?`<button class="button-ghost" data-practice-unshare="${sanitize(r.id)}">치료사 공유 취소</button>`:`<button class="button-ghost" data-practice-share="${sanitize(r.id)}">치료사에게 공유하기</button>`}<button class="button-ghost" data-practice-delete="${sanitize(r.id)}">연습 기록 삭제</button></div>${recordFeedback(r)}</article>`;
  if(r.local)return `<article class="record archive-record device-only-record"><div class="meta">이 기기에만 임시 보관 · ${observed}${r.updatedAt?' · 수정됨':''} · 치료사에게 전달되지 않음</div>${prettyRecordEntry(r.entry)}<div class="practice-record-actions"><button class="button" type="button" data-practice-transfer="${sanitize(r.id)}">${r.transferState==='needs-review'||r.transferState==='sending'?'서버 이전 결과 확인':'서버로 비공개 복사'}</button><button class="button-ghost" type="button" data-practice-edit="${sanitize(r.id)}">✎ 기록 수정하기</button><button class="button-ghost" type="button" data-delete-practice="${sanitize(r.id)}">이 기기에서 기록·사진 삭제</button></div></article>`;
  if(me.role==='therapist'&&r.kind==='student'){
   const photoCount=Array.isArray(r.entry?.photos)?r.entry.photos.length:0;
   const extras=[photoCount?`사진 ${photoCount}장`:'',r.entry?.sketch?'그림 포함':''].filter(Boolean).join(' · ');
   return `<article class="record archive-record shared-clinician-record" data-shared-record-id="${sanitize(r.id)}"><div class="meta">학생 공유 기록 · ${observed} · ${sanitize(r.student)}${extras?' · '+extras:''}</div><div class="shared-clinician-content">${prettyRecordEntry(r.entry)}</div>${recordFeedback(r)}</article>`;
  }
  if(me.role==='therapist'&&r.kind==='parent'){
   const photoCount=Array.isArray(r.entry?.photos)?r.entry.photos.length:0;
   const extras=[photoCount?`사진 ${photoCount}장`:'',r.entry?.sketch?'그림 포함':''].filter(Boolean).join(' · ');
   return `<article class="record parent-inbox-record shared-clinician-record" data-shared-record-id="${sanitize(r.id)}"><div class="meta">보호자 공유 기록 · ${observed} · ${sanitize(r.student)}${extras?' · '+extras:''}</div><div class="shared-clinician-content">${parentObservationFacts(r.entry)}${prettyRecordEntry(Object.fromEntries(['photos','sketch'].filter(k=>r.entry?.[k]).map(k=>[k,r.entry[k]])))}</div>${recordFeedback(r)}</article>`;
  }
  return `<article class="record archive-record"><div class="meta">${observed} · ${r.kind==='student'?'학생':'학부모'} · ${r.shared?'치료사와 일부 공유':'나만 보기'}${r.driveSynced?' · 드라이브 백업':''}</div>${prettyRecordEntry(r.entry)}${!r.shared&&me.role!=='therapist'?`<div class="inline-share"><button class="button-ghost" type="button" data-share="${sanitize(r.id)}">선택해서 공유</button><div class="share-choices" data-share-panel="${sanitize(r.id)}" hidden><p>치료사에게 전달할 내용만 골라줘.</p>${me.role==='student'?`<div class="student-share-bar"><strong>내 기록 공유</strong><div class="student-share-actions"><button type="button" class="button-ghost" data-archive-all="${sanitize(r.id)}">전체 선택</button><button type="button" class="button-ghost" data-archive-clear="${sanitize(r.id)}">선택 해제</button></div></div>`:''}${Object.keys(r.entry??{}).map(k=>`<label><input type="checkbox" value="${sanitize(k)}"><span>${sanitize(NOTE_LABELS[k]||k)}</span></label>`).join('')}<button class="button" type="button" data-share-confirm="${sanitize(r.id)}">선택한 항목 전달</button></div></div>`:''}${r.shared&&me.role!=='therapist'?`<div class="inline-share"><button type="button" class="button-ghost" data-unshare="${sanitize(r.id)}">이후 공유 취소</button><small>이미 전달된 복사본은 별도 관리가 필요해.</small></div>`:''}${me.role==='therapist'?`<div class="muted">학생: ${sanitize(r.student)} · 작성자: ${sanitize(r.author)}</div>`:''}</article>`;
 }).join('');
}

function attachShares(){
 bindDeviceTransfer();
 document.querySelectorAll('[data-practice-edit]').forEach(btn=>btn.onclick=()=>loading(btn,async()=>{
  const record=records.find(r=>(r.practice||r.local)&&r.id===btn.dataset.practiceEdit);
  if(!record)return toast('기록을 찾을 수 없어. 다시 열어 줘.');
  editingPracticeRecord=record;
  activeView='write';
  await dashboard();
  document.querySelector('[data-workspace-view="write"]')?.scrollIntoView({behavior:'smooth',block:'start'});
 }));
 const actionMap={'practice-share':'practice-share','practice-unshare':'practice-unshare','practice-delete':'practice-delete'};
 for(const type of Object.keys(actionMap))document.querySelectorAll('[data-'+type+']').forEach(btn=>btn.onclick=()=>loading(btn,async()=>{
  if(type==='practice-delete'&&!confirm('이 연습 기록과 서버의 첨부 사진을 삭제할까?'))return;
  if(type==='practice-share'&&!confirm('이 연습 기록의 글·사진·그림 전체를 담당 치료사에게 공유할까?'))return;
  if(type==='practice-unshare'&&!confirm('담당 치료사의 추가 열람을 중단할까? 이미 확인한 내용은 되돌릴 수 없어.'))return;
  await api(actionMap[type],{method:'POST',body:{recordId:btn.dataset[type.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]}});
  await dashboard();toast(type==='practice-delete'?'연습 기록을 삭제했어.':type==='practice-share'?'담당 치료사에게 공유했어.':'공유를 중단했어.');
 }));
 document.querySelectorAll('[data-delete-practice]').forEach(b=>b.onclick=()=>loading(b,async()=>{
  if(!confirm('이 기기의 임시 기록과 사진을 삭제할까? 삭제하면 복구할 수 없어.'))return;
  await deletePracticeRecord(me.id,b.dataset.deletePractice);toast('기기 임시 기록을 삭제했어.');await dashboard();
 }));
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
function populatePracticeEditor(isParent){
 const record=editingPracticeRecord,f=$('entryForm'),button=$('saveEntry');
 if(!record||!f||!(record.practice||record.local))return;
 const e=record.entry||{};
 if(isParent)f.querySelector('[data-parent-mode="detail"]')?.click();
 else f.querySelector('[data-journal-mode="detail"]')?.click();
 for(const [k,value] of Object.entries(e)){
  if(['photos','sketch','signals','mood'].includes(k)||typeof value!=='string')continue;
  const field=f.querySelector('[name="'+k+'"]');
  if(field&&['INPUT','TEXTAREA','SELECT'].includes(field.tagName))field.value=value;
 }
 if(isParent){
  const selected=String(e.signals||'').split(' / ');
  f.querySelectorAll('input[name="signalChoice"]').forEach(x=>{x.checked=selected.includes(x.value)});
 }else{
  const moods=String(e.mood||'').split(' · ').filter(Boolean);
  const options=[...f.querySelectorAll('input[name="emotionChoice"]')];
  options.forEach(x=>{x.checked=moods.includes(x.value)});
  const rest=moods.filter(x=>!options.some(o=>o.value===x));
  const other=f.querySelector('[name="emotionOther"]');if(other)other.value=rest.join(' · ');
 }
 if(e.sketch)document.getElementById('showDrawing')?.click();
 const share=f.querySelector('input[name="practiceShare"]');if(share)share.checked=!!record.shared;
 const title=document.createElement('div');title.className='practice-edit-header';title.role='status';
 title.innerHTML=record.local
  ?'<strong>✎ 이 기기에 저장된 기록 수정 중</strong><p>기존 내용·사진·그림을 변경해 이 기기에 다시 저장해요. 이 기록은 치료사에게 전달되지 않아요.</p>'
  :'<strong>✎ 기존 기록 수정 중</strong><p>내용과 사진·그림을 고친 뒤 저장하면 기존 기록에 반영돼요. 치료사 공유 여부도 변경할 수 있어요.</p>';
 if(record.local){const practicePanel=f.querySelector('.practice-sync-box');if(practicePanel)practicePanel.hidden=true;}
 f.prepend(title);
 button.textContent=record.local?'이 기기에 수정 저장하기':'수정 내용 저장하기';
 const cancel=document.createElement('button');cancel.type='button';cancel.id='cancelPracticeEdit';
 cancel.className='button-ghost';cancel.textContent='수정 취소';
 button.insertAdjacentElement('afterend',cancel);
 cancel.onclick=()=>{editingPracticeRecord=null;activeView='history';studentHome()};
 f.dispatchEvent(new Event('input',{bubbles:true}));
}
function studentHome(){
 const isParent=me.role==='parent';
 const items=isParent?[
  ['write','✎','1분 생활 메모','필요할 때만'],['daily','☾','하루 상태 체크','횟수만'],['calendar','▦','기록 달력','월·주·일'],['history','▤','내 기록','내가 쓴 내용']
 ]:[
  ['write','✎','기록하기','한 장이면 충분해'],['daily','☾','하루 상태 체크','횟수만'],['writingCalendar','▦','나의 기록 달력','날짜·횟수·분량'],['history','▤','내 기록','지난 기록 확인'],['coding','⌘','코딩 실험실','원하면 탐색하기']
 ];
 app.innerHTML=hero(isParent?'필요할 때만 짧게 남겨요.':'내가 남기고 싶은 한 페이지.',isParent?'모든 변화를 적을 필요는 없어요. 기억에 남은 한 가지면 충분해요.':'매일 써야 하는 숙제는 아니야. 기록한 내용은 기본적으로 나만 볼 수 있어.')+
 `<div class="workspace-shell"><aside class="workspace-sidebar"><div class="sidebar-label">EXPLORER <span class="sidebar-version">01</span></div>${workspaceNav(items,activeView)}<div class="sidebar-note"><span class="privacy-dot" aria-hidden="true"></span>공유는 내가 선택해요.<br><small>혼자만 볼 수도 있어요.</small></div></aside><div class="workspace-content">
 <section data-workspace-view="write" class="workspace-section"><div class="editor-bar"><span class="ide-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>${isParent?'observation.note':'my-note.md'}</span><span class="editor-status">NEW NOTE</span></div><div class="editor-paper"><span class="tag">01 / WRITE</span><h2>${isParent?'간단한 생활 메모':'새 페이지'}</h2><p>${isParent?'한 가지를 짧게 적어도 충분해요. 치료사에게 전달하지 않아도 돼요.':'글이나 그림으로 남겨도 되고, 그냥 둘러봐도 돼.'}</p>${dataForm(me.role)}</div></section>
 <section data-workspace-view="daily" id="dailyCheckin" class="workspace-section" hidden></section>
 ${isParent?`<section data-workspace-view="calendar" id="parentCalendar" class="workspace-section" hidden>${parentCalendarHTML()}</section>`:`<section data-workspace-view="writingCalendar" id="writingCalendar" class="workspace-section" hidden></section>`}
 <section data-workspace-view="history" class="workspace-section" hidden><div class="editor-bar"><span class="ide-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>my-notes.json</span></div><div class="editor-paper"><span class="tag">02 / ARCHIVE</span><h2>${isParent?'내 생활 메모':'내 서랍'}</h2><p>${isParent?'내가 남긴 메모만 보여요.':'내가 남긴 페이지들을 모아두는 곳이야.'}</p><div id="recordsHere">${recordCards()}</div>${records.some(r=>r.local&&!r.syncedTo)?`<div class="device-transfer-all"><button id="transferAllDevice" class="button">기기 임시 기록 모두 서버로 복사</button><p>원본을 지우지 않고 비공개 복사합니다. 담당 치료사에게는 따로 공유해야 보여요.</p></div>`:''}${deviceOriginals().length?`<details class="device-originals"><summary>기기에 남긴 이전 원본 ${deviceOriginals().length}건</summary><p>서버로 복사한 뒤에도 원본은 자동 삭제하지 않습니다.</p></details>`:''} </div></section>
 ${isParent?'':`<section data-workspace-view="coding" class="workspace-section" hidden><div class="editor-bar"><span class="ide-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>studio / playground</span></div><div class="editor-paper"><span class="tag">OPTIONAL / PLAY</span><h2>코딩 실험실</h2><p>조건을 바꿔 결과를 확인하는 작은 실험 공간이야. 기록하지 않고 그냥 놀아도 돼.</p>${codingMarkup()}<details class="optional-fields"><summary>간단한 선택 예시 살펴보기 <small>선택</small></summary><div class="optional-wrap">${situationMarkup()}</div></details></div></section>`}
 </div></div><p class="workspace-footer">일단써봄은 원하는 방식으로 경험을 남기는 개인 작업공간이야. 사용하고 싶은 때에만 열어도 돼.</p><details class="install-guide"><summary>휴대폰 홈 화면에 일단써봄 아이콘 추가하기</summary><p>안드로이드: 크롬 메뉴에서 <b>홈 화면에 추가</b> 또는 <b>앱 설치</b>를 선택해요. 아이폰: 사파리 공유 메뉴에서 <b>홈 화면에 추가</b>를 선택해요.</p><p>카카오톡 안에서 열었다면 먼저 크롬 또는 사파리로 열어야 할 수 있어요. 이 아이콘은 접속 바로가기이며, 서버 없이 기록하는 앱은 아닙니다.</p></details>`;
 wireEntryForm(isParent);attachShares();bindWorkspace();
 if(editingPracticeRecord)populatePracticeEditor(isParent);
 paintSketches();if(isParent)renderParentCalendar();else renderWritingCalendar();
 if(!isParent){attachSituation();attachCoding();}
 void refreshDailyCheckins();

}
// Browser polling is a supplement: the database notification entry is the source of truth.
function renderNotificationPanel(){
 const list=$('notificationList');if(!list||me?.role!=='therapist')return;
 const unread=noticeCache.filter(n=>!n.readAt).length;
 const counter=$('notificationCount');if(counter)counter.textContent=`(미확인 ${unread}건)`;
 const nav=document.querySelector('[data-workspace-target="alerts"] small');
 if(nav)nav.textContent=unread?`미확인 ${unread}건`:'공유 알림';
 list.innerHTML=noticeCache.length?noticeCache.map(n=>{
  const student=students.find(s=>s.id===n.studentId);
  const label=student?.nickname||'담당 학생';
  const when=new Date(n.createdAt);
  return `<article class="notification-row${n.readAt?' is-read':''}" data-notice-id="${sanitize(n.id)}">
   <div><strong>${sanitize(label)} · ${n.type==='updated'?'공유 기록 수정':'새 공유 기록'}</strong>
   <small>${sanitize(Number.isNaN(when.getTime())?'':when.toLocaleString('ko-KR'))} · ${n.readAt?'확인함':'미확인'}</small></div>
   <button type="button" class="button-ghost" data-notice-open="${sanitize(n.id)}">기록 확인</button>
  </article>`;
 }).join(''):'<p class="empty-state">새 공유 알림이 없습니다. 비공개 기록은 표시되지 않습니다.</p>';
 list.querySelectorAll('[data-notice-open]').forEach(b=>b.onclick=()=>loading(b,async()=>{
  const n=noticeCache.find(x=>x.id===b.dataset.noticeOpen);if(!n)return;
  await api('practice-notification-read',{method:'POST',body:{notificationId:n.id}});
  // Fetch CURRENT permissions before navigating to the shared content.
  const result=await api('practice-records');records=result.records??[];
  const stillVisible=records.some(x=>x.id===n.recordId);
  await loadNotifications(true);
  if(!stillVisible){toast('공유가 취소되었거나 담당 연결이 변경되었습니다.');return;}
  activateWorkspace('inbox');
  const select=$('filterStudent');const student=students.find(x=>x.id===n.studentId);
  if(select&&student)select.value=student.nickname;
  const kind=$('filterKind');if(kind)kind.value='all';
  const items=records.filter(r=>(select.value==='all'||r.student===select.value));
  $('inboxResults').innerHTML=recordCards(items);paintSketches();
  document.querySelectorAll('[data-shared-record-id]').forEach(e=>e.classList.toggle('notification-target',e.dataset.sharedRecordId===n.recordId));
  document.querySelector(`[data-shared-record-id="${n.recordId}"]`)?.scrollIntoView({block:'start',behavior:'smooth'});
 }));
}
async function loadNotifications(force=false){
 if(me?.role!=='therapist')return;
 if(notifyLoading)return notifyLoading;
 notifyLoading=(async()=>{
  const out=await api('practice-notifications');
  if(me?.role!=='therapist')return;
  noticeCache=Array.isArray(out.notifications)?out.notifications:[];
  renderNotificationPanel();
 })().catch(e=>{
  const list=$('notificationList');
  if(list)list.textContent='알림을 불러오지 못했습니다. 새 알림 확인을 눌러 다시 시도해 주세요.';
  if(force)toast('알림 확인 실패: '+e.message);
 }).finally(()=>{notifyLoading=null});
 return notifyLoading;
}
function startNotificationChecks(){
 if(notifyTimer)clearInterval(notifyTimer);
 notifyRefreshVisible=()=>loadNotifications(false);
 notifyTimer=setInterval(()=>{
  if(me?.role==='therapist'&&document.visibilityState==='visible')void loadNotifications(false);
 },30000);
 const btn=$('notificationRefresh');if(btn)btn.onclick=()=>void loadNotifications(true);
 void loadNotifications(false);
}

function exportCSV(){const labels=NOTE_LABELS;function cell(s){let x=String(s??'');if(/^[\s]*[=+\-@\t\r]/.test(x))x="'"+x;return '"'+x.replaceAll('"','""')+'"'}const rows=[['작성일','학생','작성자','유형','기록 내용'],...records.map(r=>[r.createdAt,r.student,r.author,r.kind,Object.entries(r.entry??{}).map(([k,v])=>(labels[k]||k)+': '+(k==='sketch'?'[그림 메모]':v)).join('\n')])];const csv='\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n');const u=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='일단써봄_담당치료사_공유기록.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),500)}
async function initSessionNotes(){
 const wrap=$('sessionSaved'),form=$('sessionForm');if(!wrap||!form)return;
 const display=async()=>{try{const out=await api('session-notes');wrap.innerHTML=(out.notes?.length?out.notes.map(n=>`<article class="record"><div class="meta">${sanitize(n.studentNickname||'학생')} · ${sanitize(new Date(n.createdAt).toLocaleDateString('ko-KR'))} · 치료사 전용</div>${prettyRecordEntry(n.entry)}</article>`).join(''):'<div class="empty-state">아직 회기 메모가 없습니다.</div>');}catch(e){wrap.textContent='회기 메모 기능 연결 전: '+e.message;}};
 form.onsubmit=e=>{e.preventDefault();const entry={};["studentReport","parentReport","observation","question","plan","functionalImpact","familyResponse","workingHypothesis","alternatives","uncertainty","burdenReview","erpReview","erpTarget","erpSafety","cbitReview","cbitTarget","cbitContext"].forEach(k=>{const v=formValue(form,k);if(v)entry[k]=v});if(!Object.keys(entry).length){toast('한 가지 이상 남겨주세요.');return;}loading(form.querySelector('button'),async()=>{await api('session-notes',{method:'POST',body:{studentId:formValue(form,'studentId'),entry}});form.reset();toast('회기 메모를 보관했어요.');await display()})};
 await display();
}
async function therapistHome(){const r=await Promise.all([api('students'),api('drive/status'),api('accounts')]);students=r[0].students;drive=r[1];const accounts=r[2].accounts;app.innerHTML=hero('오늘의 사례 공간','학생이 공유한 내용과 보호자 관찰을 구분해 보고, 다음 회기를 준비해요.')+`<div class="workspace-shell therapist-shell"><aside class="workspace-sidebar"><div class="sidebar-label">EXPLORER <span class="sidebar-version">02</span></div>${workspaceNav([['inbox','▣','공유 자료','학생·보호자'],['daily','☾','상태 체크 달력','공유된 체크'],['alerts','♧','새 공유 알림','미확인 기록'],['writingCalendar','▦','공유 기록 달력','학생별 월간'],['session','▤','회기 준비','치료사 메모'],['accounts','♙','계정 연결','초대·재등록'],['drive','↗','Google Drive','담당자 전용']],activeView)}<div class="sidebar-note">배정된 학생의 공유 기록만<br><small>담당 치료사가 확인할 수 있어요.</small></div></aside><div class="workspace-content"><div class="grid"><section class="panel highlight full" data-workspace-view="inbox"><span class="tag">01 / INBOX</span><h2>학생·보호자가 공유한 기록 <small id="inboxSharedCount">(${records.length}건)</small></h2><p>원문을 유지하며 작성자의 관점에 따라 구분해요. 자동으로 진단하거나 평가하지 않아요.</p><div class="buttons"><button id="refresh" class="button-ghost">↻ 새 기록 확인</button><button id="csv" class="button-ghost">CSV 다운로드</button></div><p class="parent-inbox-policy">공유받은 글·사진·그림은 펼치지 않아도 확인할 수 있습니다. 이 화면은 가상 기록 전용입니다.</p><div class="filter-strip"><label>학생별 보기<select id="filterStudent"><option value="all">전체 학생</option>${students.map(s=>`<option value="${sanitize(s.nickname)}">${sanitize(s.nickname)}</option>`).join('')}</select></label><label>작성자 구분<select id="filterKind"><option value="all">전체</option><option value="student">학생 기록</option><option value="parent">학부모 전달</option></select></label></div><div id="inboxResults">${recordCards()}</div></section><section data-workspace-view="daily" class="panel full" id="dailyCheckin" hidden></section><section data-workspace-view="alerts" class="panel full notification-panel" hidden><span class="tag">SHARED RECORD ALERTS</span><h2>새 공유 알림 <small id="notificationCount">(0)</small></h2><p>학생이나 보호자가 치료사에게 공유한 기록만 알려드립니다. 기록하지 않았거나 비공개로 저장한 내용은 알리지 않습니다.</p><div class="buttons"><button id="notificationRefresh" type="button" class="button-ghost">새 알림 확인</button></div><div id="notificationList" aria-live="polite" aria-label="공유 알림 목록"><p class="muted">알림을 확인하고 있습니다.</p></div><div id="pushSettings" aria-label="기기 푸시 알림 설정"></div></section><section data-workspace-view="writingCalendar" id="writingCalendar" class="panel full" hidden></section><section class="panel full case-panel" data-workspace-view="session" hidden><span class="tag">SESSION / THERAPIST ONLY</span><h2>회기 준비·메모</h2><p>학생이 선택해 공유한 내용과 실제 회기에서 확인한 내용을 분리해 기록합니다. 치료사의 가설은 관찰 사실이 아니며, 앱이 진단이나 치료 효과를 판단하지 않습니다. <b>로그인한 역할과 기록 접근은 서버에서 확인합니다.</b></p>
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
</form><div id="sessionSaved"></div></section><section class="panel" data-workspace-view="accounts"><span class="tag">02 / ACCOUNTS</span><h2>학생·보호자 연결하기</h2><p>학생을 한 번 등록하면 학생용·보호자용 접속 링크를 따로 만들 수 있어요.</p><h3>1. 학생 추가</h3>
 <form id="createStudentForm" class="form"><label>학생 이름 또는 별칭 <small>(체험판에서는 가명 권장)</small>
 <input name="alias" maxlength="30" placeholder="예: 민수, 지우(가명)" required autocomplete="off"></label>
 <button class="button" type="submit">학생 추가하기</button></form>
 <p class="muted">이름은 학생 목록과 연결 메뉴에 표시됩니다. 현재 체험 단계에서는 실제 아동의 개인정보 대신 가상 이름을 사용해 주세요.</p><div class="student-list-summary" aria-label="등록된 학생"><strong>등록된 학생 (${students.length}명)</strong>${students.length?`<div class="student-list-chips">${students.map(s=>`<span class="student-list-chip">${sanitize(s.nickname)}</span>`).join("")}</div>`:`<p class="muted">등록된 학생이 없어요. 위에서 먼저 추가해 주세요.</p>`}</div><h3>2. 학생·보호자에게 보낼 링크 만들기</h3><p class="muted" id="inviteExplainer">등록된 학생을 선택해 주세요.</p><form id="inviteForm" class="form"><label>초대할 사람<select name="role" id="inviteRole"><option value="student">학생</option><option value="parent">보호자</option></select></label><label id="studentPicker">대상 학생<select name="studentId" ${students.length?"":"disabled"}>${students.map(s=>`<option value="${sanitize(s.id)}">${sanitize(s.nickname)}</option>`).join('')}</select></label><button id="inviteSubmit" class="button" ${students.length?"":"disabled"}>학생 접속 링크 만들기</button></form><div id="inviteOutput"></div><section aria-label="발급한 초대 링크"><h3>초대 링크 관리</h3>
 <p>누구에게 보낸 링크인지 학생 이름과 구분해 표시합니다. 링크 자체는 발급 직후에만 복사할 수 있고, 잘못 전달한 링크는 취소할 수 있어요.</p>
 <div id="inviteList" role="status" aria-live="polite">목록을 불러오는 중입니다.</div></section></section><section class="panel" data-workspace-view="accounts"><span class="tag">02 / ACCOUNT HELP</span><h2>계정 접근 도움말</h2><p>기기를 바꾸거나 로그아웃해서 다시 접속해야 할 때 신원 확인 후 기존 계정용 링크를 새로 발급할 수 있어요.</p><label>대상 계정<select id="resetUser">${accounts.map(a=>`<option value="${sanitize(a.id)}">${sanitize(a.nickname)} · ${a.role==='student'?'학생':'학부모'}</option>`).join('')}</select></label><div class="buttons"><button id="resetIssue" class="button-ghost" ${accounts.length?'':'disabled'}>기존 계정 새 접속 링크 만들기</button></div><div id="resetOutput"></div></section><section class="panel full" data-workspace-view="drive"><span class="tag">03 / GOOGLE DRIVE</span><h2>Google Drive</h2><p>${drive.connected?'내 구글 계정이 연결돼 있습니다.':'구글 계정 연결 전입니다. 학생 기록은 아직 자동 업로드되지 않습니다.'}</p><div class="buttons"><button id="googleConnect" class="button-ghost" ${drive.configured&&drive.backupEnabled?'':'disabled'}>${drive.connected?'구글 계정 다시 연결':'내 구글 계정 연결'}</button><button id="driveSync" class="button" ${drive.connected&&drive.backupEnabled?'':'disabled'}>공유 기록 백업</button>${drive.folderUrl?`<a class="button-ghost" href="${sanitize(drive.folderUrl)}" target="_blank" rel="noopener noreferrer">내 드라이브 폴더 열기 ↗</a>`:''}</div>${!drive.backupEnabled?hint('보존·삭제·동의 및 사본 처리 정책 검증 전까지 Google Drive 백업이 비활성화되어 있습니다. 서버 공유를 취소해도 기존 다운로드 파일은 자동으로 회수되지 않습니다.'):!drive.configured?hint('구글 OAuth 관리자 설정이 아직 끝나지 않았습니다.'):''}<p>삭제 확인이 필요한 사본은 치료사의 기록 관리자에게 문의하세요.</p></section></div></div></div>`;
attachShares();bindWorkspace();paintSketches();initSessionNotes();renderWritingCalendar();startNotificationChecks();void setupPushPanel({api,toast});void refreshDailyCheckins();
const rerenderInbox=()=>{
 const name=$('filterStudent').value,kind=$('filterKind').value;
 const list=records.filter(r=>(name==='all'||r.student===name)&&(kind==='all'||r.kind===kind));
 $('inboxResults').innerHTML=recordCards(list);
 const count=$('inboxSharedCount');if(count)count.textContent=`(${records.length}건 · 현재 ${list.length}건)`;
 paintSketches();
};
const refreshClinicianInbox=(force=false)=>{
 if(!force&&Date.now()-clinicianRecordsLoadedAt<120000)return Promise.resolve(true);
 if(clinicianRefreshPending)return clinicianRefreshPending;
 clinicianRefreshPending=(async()=>{
  const incoming=await api('practice-records');
  if(me?.role!=='therapist')return false;
  records=incoming.records??[];
  clinicianRecordsLoadedAt=Date.now();
  await loadFeedback();rerenderInbox();renderWritingCalendar();
  return true;
 })().catch(e=>{toast('공유 기록을 새로 확인하지 못했습니다. 기존 화면은 유지됩니다. '+e.message);return false;})
 .finally(()=>{clinicianRefreshPending=null;});
 return clinicianRefreshPending;
};
clinicianRefreshVisible=refreshClinicianInbox;
const retriedPhotoIds=new Set();
$('inboxResults').addEventListener('error',event=>{
 const image=event.target;
 if(!(image instanceof HTMLImageElement)||!image.closest('.saved-photo-grid'))return;
 const id=image.closest('[data-shared-record-id]')?.dataset.sharedRecordId;
 if(!id)return;
 if(retriedPhotoIds.has(id)){
  const msg=document.createElement('span');msg.className='shared-photo-error';
  msg.textContent='이 사진을 불러올 수 없습니다. 새 기록 확인을 눌러 다시 시도할 수 있습니다.';
  image.replaceWith(msg);return;
 }
 retriedPhotoIds.add(id);
 void refreshClinicianInbox(true);
},true);
$('filterStudent').onchange=rerenderInbox;
$('filterKind').onchange=rerenderInbox;
$('refresh').onclick=()=>{retriedPhotoIds.clear();void refreshClinicianInbox(true);}
$('csv').onclick=exportCSV;$('createStudentForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;
  loading(f.querySelector('button'),async()=>{
   const created=await api('students',{method:'POST',body:{alias:formValue(f,'alias')}});
   toast('학생이 추가됐습니다. 이제 학생 또는 보호자 접속 링크를 만들 수 있어요.');
   activeView='accounts';await dashboard();
   const selected=$('inviteForm')?.elements?.studentId;
   if(selected&&created.student?.id)selected.value=created.student.id;
   $('inviteRole')?.focus();
  });
 };
 const updateInviteHelp=()=>{
  const studentMode=$('inviteRole').value==='student';
  $('inviteSubmit').textContent=studentMode?'학생 접속 링크 만들기':'보호자 접속 링크 만들기';
  $('inviteExplainer').textContent=studentMode
   ?'학생에게 이 링크를 보내면 바로 연결돼요. 같은 링크로 다시 들어올 수 있어요.'
   :'보호자에게 이 링크를 보내면 바로 연결돼요. 학생 공간과는 별도 계정이야.';
 };
 $('inviteRole').onchange=updateInviteHelp;updateInviteHelp();$('inviteForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;loading(f.querySelector('button'),async()=>{const out=await api('invites',{method:'POST',body:formValue(f,'role')==='student'
  ?{role:'student',targetUserId:formValue(f,'studentId')}
  :{role:'parent',studentId:formValue(f,'studentId')}});const selectedStudent=students.find(x=>x.id===formValue(f,'studentId'));
 const recipient=(selectedStudent?.nickname||'선택한 학생')+' · '+(formValue(f,'role')==='student'?'학생용':'보호자용');
 const div=$('inviteOutput');div.innerHTML='<p class="invite-issued-person"><strong>'+sanitize(recipient)+'</strong> 접속 링크를 만들었어요.</p><p class="muted">이 링크 하나로 계속 접속할 수 있어요. 다른 사람에게 전달하지 않도록 안내해 주세요.</p><textarea id="inviteCode" readonly aria-label="학생·보호자 접속 링크"></textarea><button class="button-ghost" type="button" id="copyCode">이 사람의 접속 링크 복사</button>';$('inviteCode').value=invitationUrl(out.invite);
refreshInviteList();$('copyCode').onclick=()=>{navigator.clipboard.writeText(invitationUrl(out.invite)).then(()=>toast('링크를 복사했어요. 카카오톡으로 전달해 주세요.')).catch(()=>toast('복사가 차단돼 있습니다. 링크를 길게 눌러 복사해 주세요.'))}})};
refreshInviteList();
$('resetIssue').onclick=()=>loading($('resetIssue'),async()=>{
 const id=$('resetUser').value,person=accounts.find(x=>x.id===id);
 if(!person||!['student','parent'].includes(person.role))throw Error('복구할 계정을 선택해 주세요.');
 const out=await api('invites',{method:'POST',body:{role:person.role,targetUserId:person.id}});
 const holder=$('resetOutput');
 holder.innerHTML='<p>기존 계정으로 연결되는 새 접속 링크야. 같은 링크로 언제든 다시 들어올 수 있어. 다른 사람에게 전달하지 않도록 안내해 줘.</p><textarea id="recoveryInviteUrl" readonly></textarea><button class="button-ghost" id="recoveryCopy" type="button">새 접속 링크 복사</button>';
 $('recoveryInviteUrl').value=invitationUrl(out.invite);
  $('recoveryCopy').onclick=()=>navigator.clipboard.writeText(invitationUrl(out.invite)).then(()=>toast('새 접속 링크를 복사했습니다.')).catch(()=>toast('브라우저 메뉴에서 링크 복사를 이용해 주세요.'));
 refreshInviteList();
});
$('googleConnect').onclick=()=>{location.assign('/api/drive/start')};$('driveSync').onclick=e=>loading(e.target,async()=>{const x=await api('drive/sync',{method:'POST'});toast(`${x.synced}건을 담당 치료사의 드라이브에 백업했습니다.`);await dashboard()});}

async function refreshInviteList(){
 const el=$('inviteList');if(!el||me?.role!=='therapist')return;
 try{
  const data=await api('invites'),list=data.invites||[];
  if(!list.length){el.textContent='아직 발급한 접속 링크가 없습니다.';return;}
  el.innerHTML=list.map(i=>{
   const studentId=i.role==='parent'?i.studentId:(i.targetUserId||i.usedBy||i.studentId);
   const student=students.find(s=>s.id===studentId);
   const studentName=student?.nickname||'대상 확인 필요';
   const isUnknown=!student;
   const label=i.role==='parent'?'보호자용':'학생용';
   const status=i.revoked?'취소됨':i.active?(i.used?'연결됨 · 다시 접속 가능':'아직 접속 전'):'사용할 수 없음';
   const date=new Date(i.createdAt||'').toLocaleDateString('ko-KR');
   return `<div class="invite-recipient-card ${i.revoked?'is-revoked':''}">
     <div class="invite-card-top"><span class="invite-person">${sanitize(studentName)}</span><span class="invite-kind">${label}</span></div>
     <p class="invite-state">${sanitize(status)} <small>· 발급 ${sanitize(date)}</small></p>
     ${isUnknown?'<p class="invite-unknown">이전 링크의 학생 이름을 확인할 수 없어요. 사용하지 말고 취소한 뒤 해당 학생을 선택해 새로 발급해 주세요.</p>':''}
     ${i.active?`<button type="button" class="button-ghost" data-revoke-digest="${sanitize(i.digest)}">이 접속 링크 취소</button>`:''}
    </div>`;
  }).join('');
  el.querySelectorAll('[data-revoke-digest]').forEach(button=>{
   button.onclick=()=>loading(button,async()=>{
    if(!window.confirm('이 학생·보호자 접속 링크를 취소할까요? 취소하면 다시 사용할 수 없습니다.'))return;
    await api('revoke-invite',{method:'POST',body:{digest:button.dataset.revokeDigest}});
    toast('접속 링크를 취소했어요. 필요하면 새 링크를 발급해 주세요.');
    await refreshInviteList();
   });
  });
 }catch(e){el.textContent='접속 링크 목록을 불러오지 못했어요. '+e.message;}
}
function adminHome(){app.innerHTML=hero('계정 운영','최초 관리자 계정은 기록을 읽을 수 없습니다. 치료사 초대만 발급할 수 있어요.')+`<div class="panel"><h2>치료사 초대코드 발급</h2><p>치료사도 학생·학부모와 같은 패스키 방식으로 등록합니다.</p><button id="inviteTherapist" class="button">치료사 초대코드 만들기</button><div id="adminInvite"></div></div>`;$('inviteTherapist').onclick=e=>loading(e.target,async()=>{const r=await api('invites',{method:'POST',body:{role:'therapist'}});const d=$('adminInvite');d.innerHTML='<p>코드를 복사해 치료사에게 개별 전달하세요. 7일간 유효합니다.</p><textarea readonly id="adminCode"></textarea>';$('adminCode').value=r.invite;})}
async function dashboard(){if(me?.role!=='therapist'&&activeView==='alerts')activeView='write';header();records=me.role==='admin'?[]:(await api('practice-records')).records??[];
 if(me.role!=='admin')await loadFeedback();
 if(me.role==='therapist')clinicianRecordsLoadedAt=Date.now();
 if(me.role==='student'||me.role==='parent'){try{records=[...(await listPracticeRecords(me.id)),...records]}catch(e){toast(e.message)}}
 if(editingPracticeRecord&&['student','parent'].includes(me.role))
  editingPracticeRecord=records.find(r=>r.id===editingPracticeRecord.id&&(r.practice||r.local))||null;
 if(me.role==='therapist')await therapistHome();else{if(notifyTimer){clearInterval(notifyTimer);notifyTimer=null;}notifyRefreshVisible=null;if(me.role==='admin')adminHome();else studentHome();}}
function render(){header();if(!me)loginScreen();else dashboard().catch(e=>{app.innerHTML=hint('화면을 불러오지 못했어요. '+sanitize(e.message))})}
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='visible'&&me?.role==='therapist'&&clinicianRefreshVisible)void clinicianRefreshVisible(false);
 if(document.visibilityState==='visible'&&me?.role==='therapist'&&notifyRefreshVisible)void notifyRefreshVisible();
});
if(new URLSearchParams(location.search).has('alerts')){activeView='alerts';history.replaceState(null,'',location.pathname+location.hash);}
navigator.serviceWorker?.addEventListener('message',event=>{
 if(event.data?.kind==='ildan-open-alerts'){activeView='alerts';if(me?.role==='therapist'){activateWorkspace('alerts');void loadNotifications(true);}}
});
installFeedbackActions(app,{isTherapist:()=>me?.role==='therapist',api,refresh:()=>dashboard(),toast,loading});
(async()=>{await refreshAuth()})();

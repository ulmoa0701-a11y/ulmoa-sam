const $=(id)=>document.getElementById(id);const app=$('app'),account=$('account');
let me=null,records=[],students=[],therapists=[],view='login',drive={connected:false,configured:false};
let activeView='write';
const sanitize=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const hint=(s)=>`<div class="callout">${s}</div>`;
function toast(s){$('toast').textContent=s;$('toast').classList.add('visible');setTimeout(()=>$('toast').classList.remove('visible'),3400)}
async function api(path,{method='GET',body}={}){const o={method,credentials:'same-origin',headers:{}};if(method!=='GET'){o.headers['Content-Type']='application/json';o.body=JSON.stringify(body??{})}const res=await fetch('/api/'+path,o);let data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||'서버 요청 실패');return data}
function formValue(form,name){return form.elements[name]?.value?.trim()??''}
function header(){if(!me){account.innerHTML='<span class="role-chip">안전한 기록</span>';return}account.innerHTML=`<span>${sanitize(me.nickname)} <span class="role-chip">${me.role==='therapist'?'치료사':me.role==='student'?'학생':me.role==='parent'?'학부모':'관리자'}</span></span><button id="signOut">로그아웃</button>`;$('signOut').onclick=async()=>{await api('logout',{method:'POST'});if(window.ILDAN_PREVIEW===true)window.PREVIEW_ROLE='guest';me=null;records=[];activeView='write';render();};}
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
function loginScreen(){
 const usable=passkeyAvailable();
 const demo=window.ILDAN_PREVIEW===true;
 const caption=demo?'화면 체험용 · 실제 로그인이나 기록 저장은 되지 않아요.':usable?'지문·얼굴인식 또는 기기 잠금으로 본인을 확인해요.':'이 기기는 패스키 인증을 지원하지 않아요. HTTPS와 브라우저를 확인해 주세요.';
 app.innerHTML=`<div class="login-page">
 <div class="login-heading"><span class="eyebrow">일단써봄 <span class="terminal-cursor">_</span> / YOUR WORKSPACE</span><h1>내 공간으로<br><em>접속하기<span class="code-period">.</span></em></h1><p>누구로 시작할지만 선택해 주세요.</p></div>
 <div class="login-layout"><section class="login-window" aria-labelledby="roleTitle"><div class="ide-titlebar"><span class="ide-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="ide-filename">login.tsx</span><span class="ide-language">LOGIN</span></div>
 <div class="login-body"><div class="login-step"><span class="step-no">01</span><div><h2 id="roleTitle">어떤 사용자세요?</h2><p>학생·학부모·치료사 모두 같은 방법으로 로그인해요.</p></div></div>${rolePicker()}
 <div class="login-step step-two"><span class="step-no">02</span><div><h2>간편 로그인</h2><p class="login-caption">${caption}</p></div></div>
 <button type="button" id="oneLogin" class="login-cta" ${usable||demo?'':'disabled'}><span class="cta-play">▶</span><span>${demo?'선택한 화면 체험하기':'패스키로 로그인'}</span><span aria-hidden="true">↗</span></button>
 <details class="enroll-details signup-options" ${view==='register'||view==='recovery'?'open':''}><summary>처음 이용하거나 기기를 바꿨나요?</summary>
 <div class="seg"><button type="button" id="newAccount" class="${view!=='recovery'?'on':''}">처음 등록</button><button type="button" id="recoverAccount" class="${view==='recovery'?'on':''}">기기 재등록</button></div>
 ${view==='recovery'?`<form class="form" id="recoveryForm"><p class="muted">신원을 확인한 담당자가 발급한 재등록 코드가 필요해요.</p><label>재등록 코드<input name="resetCode" required autocomplete="off"></label><button class="button" type="submit">다시 등록하기</button></form>`:
 `<form class="form" id="registerForm"><label class="${chosenRole==='therapist'?'hidden':''}">담당 치료사<select name="selectedTherapistId"><option value="">담당 치료사 선택</option>${therapists.map(t=>`<option value="${sanitize(t.id)}">${sanitize(t.display_name)}</option>`).join('')}</select></label><label>초대코드<input name="invite" autocomplete="off" placeholder="담당 치료사가 전달한 코드" required></label><label>닉네임<input name="nickname" minlength="3" maxlength="24" autocomplete="off" placeholder="실명 대신 나만의 닉네임" required></label><button class="button" type="submit">패스키 등록하기</button></form>`}
 </details><details class="enroll-details admin-details"><summary>운영자 최초 설정</summary><form id="setupForm" class="form"><label>관리자 설정코드<input name="setupToken" type="password" autocomplete="off" required></label><label>관리자 닉네임<input name="nickname" required minlength="3"></label><button class="button-ghost" type="submit">관리자 기기 등록</button></form></details>
 <div class="login-privacy"><span aria-hidden="true">◈</span> 비공개 기록은 작성자만, 공유한 기록은 담당 치료사만 확인해요.</div></div>
 <div class="ide-statusbar"><span><span class="live-dot"></span> ${demo?'DEMO MODE':'READY'}</span><span>PASSKEY / ROLE-BASED WORKSPACE</span></div></section>
 <aside class="login-code-preview" aria-label="프로그래밍 디자인 안내"><div class="ide-titlebar"><span class="ide-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="ide-filename">welcome.js</span><span class="ide-language">PREVIEW</span></div>
 <div class="code-lines" aria-hidden="true"><div><span class="ln">01</span><span class="syntax-purple">const</span> <span class="syntax-blue">workspace</span> = {</div><div><span class="ln">02</span>&nbsp;&nbsp;role: <span id="roleCode" class="syntax-orange">'${chosenRole}'</span>,</div><div><span class="ln">03</span>&nbsp;&nbsp;space: <span class="syntax-orange">'my own'</span>,</div><div><span class="ln">04</span>&nbsp;&nbsp;privacy: <span class="syntax-purple">true</span></div><div><span class="ln">05</span>};</div><div><span class="ln">06</span><span class="syntax-blue">open</span>(workspace); <span class="syntax-gray">// start</span></div></div>
 <div class="ide-terminal"><div class="terminal-header"><span>⌘</span> TERMINAL <span class="terminal-ready">● READY</span></div><div><span class="prompt">➜</span> 일단써봄 시작 준비</div><div><span class="prompt">✓</span> ${demo?'가상 계정 체험 가능':'기기 인증 후 시작'}</div></div></aside>
 </div></div>`;
 document.querySelectorAll('[data-login-role]').forEach(b=>b.onclick=()=>{chosenRole=b.dataset.loginRole;document.querySelectorAll('[data-login-role]').forEach(el=>{const on=el===b;el.classList.toggle('active',on);el.setAttribute('aria-pressed',on?'true':'false')});const txt=$('roleCode');if(txt)txt.textContent="'"+chosenRole+"'";const teacherRow=$('registerForm')?.elements.selectedTherapistId?.closest('label');if(teacherRow)teacherRow.classList.toggle('hidden',chosenRole==='therapist');});
 $('oneLogin').onclick=e=>loading(e.currentTarget,async()=>{
  if(demo){window.PREVIEW_ROLE=chosenRole;me={id:'preview-'+chosenRole,nickname:'가상 '+roleNames[chosenRole],role:chosenRole};activeView=chosenRole==='therapist'?'inbox':'write';await dashboard();return;}
  if(!passkeyAvailable())throw Error('이 기기는 패스키 인증을 지원하지 않습니다.');
  try{const r=await api('passkeys/login/options',{method:'POST',body:{}});const cr=await navigator.credentials.get({publicKey:requestOptions(r.options)});if(!cr)throw Error('인증이 완료되지 않았어요.');const out=await api('passkeys/login/verify',{method:'POST',body:{credential:credentialPayload(cr)}});
   if(out.user?.role!==chosenRole){await api('logout',{method:'POST'});throw Error('선택한 사용자 유형과 등록된 계정이 달라요. 자신의 역할을 선택해 주세요.');}
   me=out.user;activeView=chosenRole==='therapist'?'inbox':'write';await dashboard();
  }catch(err){throw Error(errorPasskey(err));}
 });
 $('newAccount').onclick=async()=>{view='register';try{therapists=(await api('therapists')).therapists}catch{}render()};
 $('recoverAccount').onclick=()=>{view='recovery';render()};
 if(view==='recovery')$('recoveryForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;loading(f.querySelector('button'),()=>enrollWithPasskey({resetCode:formValue(f,'resetCode')}))};
 else $('registerForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;loading(f.querySelector('button'),async()=>{await enrollWithPasskey({selectedTherapistId:formValue(f,'selectedTherapistId'),invite:formValue(f,'invite'),nickname:formValue(f,'nickname'),selectedRole:chosenRole})})};
 $('setupForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;loading(f.querySelector('button'),()=>enrollWithPasskey({setupToken:formValue(f,'setupToken'),nickname:formValue(f,'nickname')}))};
}
async function enrollWithPasskey(details){
 if(!passkeyAvailable())throw Error('기기에서 패스키를 지원하지 않습니다.');
 try{const r=await api('passkeys/enroll/options',{method:'POST',body:details});const cr=await navigator.credentials.create({publicKey:createOptions(r.options)});if(!cr)throw Error('기기 등록이 완료되지 않았어요.');const out=await api('passkeys/enroll/verify',{method:'POST',body:{credential:credentialPayload(cr)}});if(details.selectedRole&&out.user?.role!==details.selectedRole){await api('logout',{method:'POST'});throw Error('선택한 역할과 초대코드가 일치하지 않습니다.');}me=out.user;view='login';activeView=me.role==='therapist'?'inbox':'write';await dashboard();toast('기기 등록이 완료됐어요.');}catch(err){throw Error(errorPasskey(err));}
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
  activateWorkspace(b.dataset.workspaceTarget);paintSketches();
  if(window.innerWidth<741)document.querySelector('.workspace-content')?.scrollIntoView({behavior:'smooth',block:'start'});
 }));
 activateWorkspace(activeView);
}
const NOTE_LABELS={note:'자유 기록',mood:'오늘의 상태',energy:'컨디션',thought:'떠오른 생각',body:'몸의 느낌',action:'해본 일',sketch:'그림',observation:'관찰한 사실',response:'보호자의 대응',impact:'생활에서 달라진 점',message:'전달사항',event:'있었던 일',next:'다음 시도'};
function dataForm(role){
 if(role==='parent')return `<form class="form entry-v5" id="entryForm">
 <div class="soft-intro"><strong>일상에서 눈에 띈 일</strong><span>필요할 때만 남겨요. 모든 칸을 채울 필요는 없어요.</span></div>
 <label>관찰한 사실 <small>(선택)</small><textarea name="observation" maxlength="1200" placeholder="실제로 보고 들은 일, 수면이나 일상 변화 등"></textarea></label>
 <details class="optional-fields"><summary>내가 한 대응과 생활 영향도 적기 <small>선택</small></summary><div class="optional-wrap"><label>그때 내가 한 말이나 행동<textarea name="response" maxlength="1000" placeholder="어떻게 대응했는지 객관적으로 남길 수 있어요."></textarea></label><label>생활에 미친 영향<textarea name="impact" maxlength="1000" placeholder="변화가 있었거나 특별한 영향이 없었다면 그렇게 적어도 돼요."></textarea></label></div></details>
 <label>담당 치료사에게 전할 내용 <small>(선택)</small><textarea name="message" maxlength="1200" placeholder="궁금한 점이나 상담 시 전달할 내용"></textarea></label>
 <div class="privacy-panel"><label class="checkbox"><input type="checkbox" name="share"><span>치료사에게 선택해서 전달하기<small>체크하지 않으면 내 기록으로만 남아요.</small></span></label><div id="sharePicker" class="share-picker" hidden>${['observation','response','impact','message'].map(k=>`<label><input type="checkbox" name="shareField" value="${k}" ${k==='observation'||k==='message'?'checked':''}><span>${NOTE_LABELS[k]}</span></label>`).join('')}<p>체크한 항목에 작성한 내용만 치료사가 확인해요.</p></div></div>
 <button class="button entry-save" id="saveEntry">🔒 내 기록 저장</button></form>`;
 return `<form class="form entry-v5" id="entryForm">
 <div class="soft-intro"><strong>자유롭게 남기는 한 페이지</strong><span>글·그림·짧은 단어만 남겨도 돼. 오늘 꼭 작성할 필요는 없어.</span></div>
 <div class="form-switcher" role="group" aria-label="기록 방식"><button type="button" class="format-btn active" data-format="text" aria-pressed="true">✎ 글쓰기</button><button type="button" class="format-btn" data-format="draw" aria-pressed="false">◇ 그림 그리기</button></div>
 <div id="textPanel"><label>오늘 남기고 싶은 것 <small>(자유)</small><textarea name="note" maxlength="1200" rows="5" placeholder="오늘 있었던 일, 관심 있는 것, 떠오른 생각... 무엇이든 좋아."></textarea></label></div>
 <div id="drawPanel" hidden><div class="sketch-board"><canvas id="noteCanvas" width="760" height="380" aria-label="마우스나 손가락으로 그리는 그림 메모"></canvas></div><div class="sketch-actions"><span>손가락이나 마우스로 그려봐.</span><button type="button" id="undoStroke" class="button-ghost">↶ 되돌리기</button><button type="button" id="clearSketch" class="button-ghost">지우기</button></div></div>
 <details class="optional-fields" id="stateDetails"><summary>지금 상태도 남길까? <small>선택 · 건너뛰기 가능</small></summary><div class="optional-wrap"><label>오늘의 느낌<select name="mood"><option value="">선택하지 않음</option><option>편안함</option><option>기쁨</option><option>피곤함</option><option>답답함</option><option>긴장됨</option><option>잘 모르겠음</option><option>기타</option></select></label><label>컨디션<select name="energy"><option value="">선택하지 않음</option><option>괜찮음</option><option>기운 있음</option><option>조금 피곤함</option><option>많이 피곤함</option><option>잘 모르겠음</option></select></label></div></details>
 <details class="optional-fields"><summary>한 번 더 살펴보기 <small>선택 · 정답 없음</small></summary><div class="optional-wrap"><label>떠오른 생각이나 이미지<textarea name="thought" maxlength="1200" placeholder="생각나지 않으면 비워 두면 돼."></textarea></label><label>몸에서 느낀 것<textarea name="body" maxlength="1000" placeholder="특별한 느낌이 없다면 비워 둬도 돼."></textarea></label><label>내가 한 일, 혹은 시도해 본 것<textarea name="action" maxlength="1000" placeholder="실천 약속을 꼭 정할 필요는 없어."></textarea></label></div></details>
 <div class="privacy-panel"><label class="checkbox"><input type="checkbox" name="share"><span>치료사에게 일부 공유하기<small>원하는 항목만 고를 수 있어. 기본은 비공개야.</small></span></label><div id="sharePicker" class="share-picker" hidden>${['note','sketch','mood','energy','thought','body','action'].map(k=>`<label><input type="checkbox" name="shareField" value="${k}" ${k==='note'?'checked':''}><span>${NOTE_LABELS[k]}</span></label>`).join('')}<p>체크하지 않은 항목은 치료사에게 전달하지 않아요.</p></div></div>
 <button class="button entry-save" id="saveEntry">🔒 내 기록 저장</button></form>`;
}
function gatherEntry(f,role){
 const fields=role==='parent'?['observation','response','impact','message']:['note','mood','energy','thought','body','action'];
 const entry={};fields.forEach(k=>{const value=formValue(f,k);if(value)entry[k]=value});
 if(role==='student'&&sketchStrokes.length)entry.sketch=JSON.stringify(sketchStrokes);
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
function wireEntryForm(isParent){
 const f=$('entryForm'),button=$('saveEntry'),share=f.elements.share,area=$('sharePicker');
 share.onchange=()=>{area.hidden=!share.checked;button.textContent=share.checked?'↗ 선택한 내용 공유하고 저장':'🔒 내 기록 저장'};
 if(!isParent){sketchStrokes=[];bindSketch();document.querySelectorAll('[data-format]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-format]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b))});$('textPanel').hidden=b.dataset.format!=='text';$('drawPanel').hidden=b.dataset.format!=='draw';});}
 f.onsubmit=e=>{e.preventDefault();const entry=gatherEntry(f,me.role);if(!Object.keys(entry).length){toast('글이나 그림, 한 가지라도 남겨줘.');return;}
 const sharedFields=share.checked?[...f.querySelectorAll('input[name="shareField"]:checked')].map(x=>x.value).filter(k=>entry[k]):[];
 if(share.checked&&!sharedFields.length){toast('공유할 항목을 하나 이상 골라줘.');return;}
 if(share.checked&&!confirm('선택한 항목만 담당 치료사에게 전달할까요? 공유한 내용은 드라이브에 별도 백업될 수도 있어요.'))return;
 loading(button,async()=>{await api('records',{method:'POST',body:{entry,share:share.checked,sharedFields}});activeView='history';toast('내 기록에 저장했어.');await dashboard()});};
}
function prettyRecordEntry(entry){return Object.entries(entry??{}).map(([k,v])=> k==='sketch'?`<div class="sketch-record" data-sketch="${sanitize(v)}"><div class="sketch-mini-label">그림 메모</div><canvas width="760" height="380"></canvas></div>`:`<p><b>${sanitize(NOTE_LABELS[k]||k)}</b><br>${sanitize(v)}</p>`).join('');}
function paintSketches(){document.querySelectorAll('[data-sketch]').forEach(el=>{try{const arr=JSON.parse(el.dataset.sketch);if(!Array.isArray(arr)||arr.length>250)return;const ctx=el.querySelector('canvas').getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,760,380);ctx.strokeStyle='#5362cc';ctx.lineWidth=3.5;ctx.lineCap='round';ctx.lineJoin='round';arr.forEach(stroke=>{if(!Array.isArray(stroke)||!stroke.length)return;ctx.beginPath();stroke.slice(0,240).forEach((p,i)=>{if(!Array.isArray(p)||p.length!==2||!Number.isFinite(p[0])||!Number.isFinite(p[1]))return;const x=Math.max(0,Math.min(760,p[0])),y=Math.max(0,Math.min(380,p[1]));i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()});}catch(_){}})}
function recordCards(list=records){if(!list.length)return '<div class="empty-state">아직 남겨둔 기록이 없어. 필요할 때 한 장 만들어 봐.</div>';return list.map(r=>`<article class="record archive-record"><div class="meta">${sanitize(new Date(r.createdAt).toLocaleString('ko-KR'))} · ${r.kind==='student'?'학생':'학부모'} · ${r.shared?'치료사와 일부 공유':'나만 보기'}${r.driveSynced?' · 드라이브 백업':''}</div>${prettyRecordEntry(r.entry)}${!r.shared&&me.role!=='therapist'?`<div class="inline-share"><button class="button-ghost" type="button" data-share="${sanitize(r.id)}">선택해서 공유</button><div class="share-choices" data-share-panel="${sanitize(r.id)}" hidden><p>치료사에게 전달할 내용만 골라줘.</p>${Object.keys(r.entry??{}).map(k=>`<label><input type="checkbox" value="${sanitize(k)}" ${k==='note'||k==='observation'||k==='message'?'checked':''}><span>${sanitize(NOTE_LABELS[k]||k)}</span></label>`).join('')}<button class="button" type="button" data-share-confirm="${sanitize(r.id)}">선택한 항목 전달</button></div></div>`:''}${me.role==='therapist'?`<div class="muted">학생: ${sanitize(r.student)} · 작성자: ${sanitize(r.author)}</div>`:''}</article>`).join('');}
function attachShares(){document.querySelectorAll('[data-share]').forEach(b=>b.onclick=()=>{const p=document.querySelector(`[data-share-panel="${b.dataset.share}"]`);if(!p)return;p.hidden=!p.hidden});document.querySelectorAll('[data-share-confirm]').forEach(b=>b.onclick=()=>{const r=records.find(x=>x.id===b.dataset.shareConfirm),panel=document.querySelector(`[data-share-panel="${b.dataset.shareConfirm}"]`);if(!r||!panel)return;const fields=[...panel.querySelectorAll('input:checked')].map(x=>x.value).filter(k=>r.entry[k]);if(!fields.length){toast('공유할 항목을 골라줘.');return;}if(!confirm('고른 항목만 담당 치료사에게 전달할까?'))return;loading(b,async()=>{await api('share',{method:'POST',body:{recordId:r.id,sharedFields:fields}});toast('선택한 내용만 공유했어.');await dashboard()})})}


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
  ['write','✎','기록 남기기','관찰·전달사항'],['history','▤','내 기록','내가 쓴 내용']
 ]:[
  ['write','✎','기록하기','한 장이면 충분해'],['history','▤','내 기록','지난 기록 확인'],['coding','⌘','코딩 실험실','원하면 탐색하기']
 ];
 app.innerHTML=hero(isParent?'일상에서 본 것, 필요한 만큼.':'내가 남기고 싶은 한 페이지.','매일 써야 하는 숙제는 아니야. 기록한 내용은 기본적으로 나만 볼 수 있어.')+
 `<div class="workspace-shell"><aside class="workspace-sidebar"><div class="sidebar-label">EXPLORER <span class="sidebar-version">01</span></div>${workspaceNav(items,activeView)}<div class="sidebar-note"><span class="privacy-dot" aria-hidden="true"></span>공유는 내가 선택해요.<br><small>혼자만 볼 수도 있어요.</small></div></aside><div class="workspace-content">
 <section data-workspace-view="write" class="workspace-section"><div class="editor-bar"><span class="ide-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>${isParent?'observation.note':'my-note.md'}</span><span class="editor-status">NEW NOTE</span></div><div class="editor-paper"><span class="tag">01 / WRITE</span><h2>${isParent?'생활 메모':'새 페이지'}</h2><p>${isParent?'실제로 관찰한 일과 전달할 내용을 자유롭게 남겨요.':'글이나 그림으로 남겨도 되고, 그냥 둘러봐도 돼.'}</p>${dataForm(me.role)}</div></section>
 <section data-workspace-view="history" class="workspace-section" hidden><div class="editor-bar"><span class="ide-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>my-notes.json</span></div><div class="editor-paper"><span class="tag">02 / ARCHIVE</span><h2>내 서랍</h2><p>내가 남긴 페이지들을 모아두는 곳이야.</p><div id="recordsHere">${recordCards()}</div></div></section>
 ${isParent?'':`<section data-workspace-view="coding" class="workspace-section" hidden><div class="editor-bar"><span class="ide-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>studio / playground</span></div><div class="editor-paper"><span class="tag">OPTIONAL / PLAY</span><h2>코딩 실험실</h2><p>조건을 바꿔 결과를 확인하는 작은 실험 공간이야. 기록하지 않고 그냥 놀아도 돼.</p>${codingMarkup()}<details class="optional-fields"><summary>간단한 선택 예시 살펴보기 <small>선택</small></summary><div class="optional-wrap">${situationMarkup()}</div></details></div></section>`}
 </div></div><p class="workspace-footer">일단써봄은 원하는 방식으로 경험을 남기는 개인 작업공간이야. 사용하고 싶은 때에만 열어도 돼.</p>`;
 wireEntryForm(isParent);attachShares();bindWorkspace();paintSketches();
 if(!isParent){attachSituation();attachCoding();}

}

function exportCSV(){const labels=NOTE_LABELS;function cell(s){let x=String(s??'');if(/^[\s]*[=+\-@\t\r]/.test(x))x="'"+x;return '"'+x.replaceAll('"','""')+'"'}const rows=[['작성일','학생','작성자','유형','기록 내용'],...records.map(r=>[r.createdAt,r.student,r.author,r.kind,Object.entries(r.entry??{}).map(([k,v])=>(labels[k]||k)+': '+(k==='sketch'?'[그림 메모]':v)).join('\n')])];const csv='\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n');const u=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='일단써봄_담당치료사_공유기록.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),500)}
async function initSessionNotes(){
 const wrap=$('sessionSaved'),form=$('sessionForm');if(!wrap||!form)return;
 const display=async()=>{try{const out=await api('session-notes');wrap.innerHTML=(out.notes?.length?out.notes.map(n=>`<article class="record"><div class="meta">${sanitize(n.studentNickname||'학생')} · ${sanitize(new Date(n.createdAt).toLocaleDateString('ko-KR'))} · 치료사 전용</div>${prettyRecordEntry(n.entry)}</article>`).join(''):'<div class="empty-state">아직 회기 메모가 없습니다.</div>');}catch(e){wrap.textContent='회기 메모 기능 연결 전: '+e.message;}};
 form.onsubmit=e=>{e.preventDefault();const entry={};['observation','question','plan'].forEach(k=>{const v=formValue(form,k);if(v)entry[k]=v});if(!Object.keys(entry).length){toast('한 가지 이상 남겨주세요.');return;}loading(form.querySelector('button'),async()=>{await api('session-notes',{method:'POST',body:{studentId:formValue(form,'studentId'),entry}});form.reset();toast('회기 메모를 보관했어요.');await display()})};
 await display();
}
async function therapistHome(){const r=await Promise.all([api('students'),api('drive/status'),api('accounts')]);students=r[0].students;drive=r[1];const accounts=r[2].accounts;app.innerHTML=hero('오늘의 사례 공간','학생이 공유한 내용과 보호자 관찰을 구분해 보고, 다음 회기를 준비해요.')+`<div class="workspace-shell therapist-shell"><aside class="workspace-sidebar"><div class="sidebar-label">EXPLORER <span class="sidebar-version">02</span></div>${workspaceNav([['inbox','▣','공유 자료','학생·보호자'],['session','▤','회기 준비','치료사 메모'],['accounts','♙','계정 연결','초대·재등록'],['drive','↗','Google Drive','담당자 전용']],activeView)}<div class="sidebar-note">배정된 학생의 공유 기록만<br><small>담당 치료사가 확인할 수 있어요.</small></div></aside><div class="workspace-content"><div class="grid"><section class="panel highlight full" data-workspace-view="inbox"><span class="tag">01 / INBOX</span><h2>학생·보호자가 공유한 기록 <small>(${records.length}건)</small></h2><p>원문을 유지하며 작성자의 관점에 따라 구분해요. 자동으로 진단하거나 평가하지 않아요.</p><div class="buttons"><button id="refresh" class="button-ghost">↻ 새 기록 확인</button><button id="csv" class="button-ghost">CSV 다운로드</button></div><div class="filter-strip"><label>학생별 보기<select id="filterStudent"><option value="all">전체 학생</option>${students.map(s=>`<option value="${sanitize(s.nickname)}">${sanitize(s.nickname)}</option>`).join('')}</select></label><label>작성자 구분<select id="filterKind"><option value="all">전체</option><option value="student">학생 기록</option><option value="parent">학부모 전달</option></select></label></div><div id="inboxResults">${recordCards()}</div></section><section class="panel full case-panel" data-workspace-view="session" hidden><span class="tag">SESSION / THERAPIST ONLY</span><h2>회기 준비·메모</h2><p>치료사 전용 기록입니다. 공유한 학생·학부모에게 자동으로 노출되지 않아요.</p><form id="sessionForm" class="form"><label>담당 학생<select name="studentId" required>${students.map(s=>`<option value="${sanitize(s.id)}">${sanitize(s.nickname)}</option>`).join('')}</select></label><label>오늘 확인한 사실<textarea name="observation" maxlength="1200" placeholder="학생이 말한 내용 / 보호자가 관찰한 내용은 구분해서 기록"></textarea></label><label>확인이 필요한 점<textarea name="question" maxlength="1200" placeholder="아직 확인하지 못한 내용과 가설"></textarea></label><label>다음 회기에 함께 살펴볼 것<textarea name="plan" maxlength="1200" placeholder="합의한 목표나 다음 수업 방향"></textarea></label><button class="button">치료사 메모 보관</button></form><div id="sessionSaved"></div></section><section class="panel" data-workspace-view="accounts"><span class="tag">02 / ACCOUNTS</span><h2>학생·학부모 초대하기</h2><p>초대코드를 전달해 담당 학생·학부모를 연결해요.</p><form id="inviteForm" class="form"><label>초대할 사람<select name="role" id="inviteRole"><option value="student">학생</option><option value="parent">학부모</option></select></label><label id="studentPicker" class="hidden">연결할 학생<select name="studentId">${students.map(s=>`<option value="${sanitize(s.id)}">${sanitize(s.nickname)}</option>`).join('')}</select></label><button class="button">7일짜리 초대코드 만들기</button></form><div id="inviteOutput"></div></section><section class="panel" data-workspace-view="accounts"><span class="tag">02 / ACCOUNT HELP</span><h2>패스키 재등록 코드</h2><p>기기를 잃어버린 경우 신원 확인 후 30분짜리 재등록 코드를 발급합니다.</p><label>대상 계정<select id="resetUser">${accounts.map(a=>`<option value="${sanitize(a.id)}">${sanitize(a.nickname)} · ${a.role==='student'?'학생':'학부모'}</option>`).join('')}</select></label><div class="buttons"><button id="resetIssue" class="button-ghost" ${accounts.length?'':'disabled'}>재설정 코드 발급</button></div><div id="resetOutput"></div></section><section class="panel full" data-workspace-view="drive"><span class="tag">03 / GOOGLE DRIVE</span><h2>Google Drive</h2><p>${drive.connected?'내 구글 계정이 연결돼 있습니다.':'구글 계정 연결 전입니다. 학생 기록은 아직 자동 업로드되지 않습니다.'}</p><div class="buttons"><button id="googleConnect" class="button-ghost" ${drive.configured?'':'disabled'}>${drive.connected?'구글 계정 다시 연결':'내 구글 계정 연결'}</button><button id="driveSync" class="button" ${drive.connected?'':'disabled'}>공유 기록 백업</button>${drive.folderUrl?`<a class="button-ghost" href="${sanitize(drive.folderUrl)}" target="_blank" rel="noopener noreferrer">내 드라이브 폴더 열기 ↗</a>`:''}</div>${!drive.configured?hint('구글 OAuth 관리자 설정이 아직 끝나지 않았습니다. 인증을 완료하면 담당 치료사의 구글 계정에만 기록을 복사할 수 있습니다.'):''}</section></div></div></div>`;
attachShares();bindWorkspace();paintSketches();initSessionNotes();const rerenderInbox=()=>{const name=$('filterStudent').value,kind=$('filterKind').value;const list=records.filter(r=>(name==='all'||r.student===name)&&(kind==='all'||r.kind===kind));$('inboxResults').innerHTML=recordCards(list);paintSketches();};$('filterStudent').onchange=rerenderInbox;$('filterKind').onchange=rerenderInbox;$('refresh').onclick=()=>dashboard();$('csv').onclick=exportCSV;$('inviteRole').onchange=()=>{$('studentPicker').classList.toggle('hidden',$('inviteRole').value!=='parent')};$('inviteForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;loading(f.querySelector('button'),async()=>{const out=await api('invites',{method:'POST',body:{role:formValue(f,'role'),studentId:formValue(f,'studentId')}});const div=$('inviteOutput');div.innerHTML='<p class="muted">초대코드는 한 번만 사용할 수 있으며 7일 뒤 만료됩니다. 개인적인 방법으로 전달하세요.</p><textarea id="inviteCode" readonly></textarea><button class="button-ghost" type="button" id="copyCode">초대코드 복사</button>';$('inviteCode').value=out.invite;$('copyCode').onclick=()=>{navigator.clipboard.writeText(out.invite).then(()=>toast('초대코드를 복사했어요.'))}})};
$('resetIssue').onclick=e=>loading(e.target,async()=>{if(!confirm('대상자의 신원을 별도로 확인했나요?'))return;const result=await api('reset/create',{method:'POST',body:{userId:$('resetUser').value}});$('resetOutput').innerHTML='<p>30분 뒤 만료되는 재설정 코드입니다.</p><textarea readonly id="resetCode"></textarea>';$('resetCode').value=result.resetCode;});$('googleConnect').onclick=()=>{location.assign('/api/drive/start')};$('driveSync').onclick=e=>loading(e.target,async()=>{const x=await api('drive/sync',{method:'POST'});toast(`${x.synced}건을 담당 치료사의 드라이브에 백업했습니다.`);await dashboard()});}

function adminHome(){app.innerHTML=hero('계정 운영','최초 관리자 계정은 기록을 읽을 수 없습니다. 치료사 초대만 발급할 수 있어요.')+`<div class="panel"><h2>치료사 초대코드 발급</h2><p>치료사도 학생·학부모와 같은 패스키 방식으로 등록합니다.</p><button id="inviteTherapist" class="button">치료사 초대코드 만들기</button><div id="adminInvite"></div></div>`;$('inviteTherapist').onclick=e=>loading(e.target,async()=>{const r=await api('invites',{method:'POST',body:{role:'therapist'}});const d=$('adminInvite');d.innerHTML='<p>코드를 복사해 치료사에게 개별 전달하세요. 7일간 유효합니다.</p><textarea readonly id="adminCode"></textarea>';$('adminCode').value=r.invite;})}
async function dashboard(){header();records=me.role==='admin'?[]:(await api('records')).records??[];if(me.role==='therapist')await therapistHome();else if(me.role==='admin')adminHome();else studentHome();}
function render(){header();if(!me)loginScreen();else dashboard().catch(e=>{app.innerHTML=hint('화면을 불러오지 못했어요. '+sanitize(e.message))})}
(async()=>{try{me=(await api('me')).user}catch{me=null}render()})();

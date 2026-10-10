const $=(id)=>document.getElementById(id);const app=$('app'),account=$('account');
let me=null,records=[],students=[],therapists=[],view='login',drive={connected:false,configured:false};
let activeView='write';
const sanitize=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const hint=(s)=>`<div class="callout">${s}</div>`;
function toast(s){$('toast').textContent=s;$('toast').classList.add('visible');setTimeout(()=>$('toast').classList.remove('visible'),3400)}
async function api(path,{method='GET',body}={}){const o={method,credentials:'same-origin',headers:{}};if(method!=='GET'){o.headers['Content-Type']='application/json';o.body=JSON.stringify(body??{})}const res=await fetch('/api/'+path,o);let data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||'서버 요청 실패');return data}
function formValue(form,name){return form.elements[name]?.value?.trim()??''}
function header(){if(!me){account.innerHTML='<span class="role-chip">안전한 기록</span>';return}account.innerHTML=`<span>${sanitize(me.nickname)} <span class="role-chip">${me.role==='therapist'?'치료사':me.role==='student'?'학생':me.role==='parent'?'학부모':'관리자'}</span></span><button id="signOut">로그아웃</button>`;$('signOut').onclick=async()=>{await api('logout',{method:'POST'});me=null;records=[];activeView='write';render();};}
function hero(t,d){return `<div class="hero"><div class="eyebrow">ILDAN SSEOBOM · 나의 공간</div><h1>${t}</h1><p>${d}</p></div>`;}
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
function loginScreen(){
 const usable=passkeyAvailable();
 const desc=usable?'휴대폰·컴퓨터에 등록한 패스키로 본인을 확인해요. 지문·얼굴인식이나 기기 잠금을 사용할 수 있어요.':'이 기기에서 패스키를 사용할 수 없어요. 최신 브라우저나 다른 기기에서 다시 열어 주세요.';
 app.innerHTML=`<div class="welcome">${hero('내 공간, 한 번에 열기','학생·학부모·치료사 모두 같은 로그인 방법을 사용해요.')}
 <div class="panel"><div class="tag">SINGLE SIGN-IN</div><h2>일단, 들어가 볼까?</h2><p>${desc}</p><div class="buttons"><button id="oneLogin" type="button" class="button" ${usable?'':'disabled'}>↗ 내 공간 열기</button></div>
 <details class="enroll-details" ${view==='register'||view==='recovery'?'open':''}><summary>처음 시작하기 · 기기 바꾸기</summary>
 <p class="muted">처음 한 번만 담당 치료사의 초대코드로 계정을 등록해요. 비밀번호를 따로 기억하지 않아도 돼요.</p>
 <div class="seg"><button type="button" id="newAccount" class="${view!=='recovery'?'on':''}">처음 등록</button><button type="button" id="recoverAccount" class="${view==='recovery'?'on':''}">기기 변경·분실</button></div>
 ${view==='recovery'?`<form class="form" id="recoveryForm"><p class="muted">담당 치료사가 신원 확인 후 발급한 1회용 코드로 기기에 패스키를 다시 등록해요.</p><label>재등록 코드<input name="resetCode" required autocomplete="off"></label><button type="submit" class="button">새 기기에 등록하기</button></form>`:
 `<form class="form" id="registerForm"><label>담당 치료사<select name="selectedTherapistId"><option value="">담당 치료사를 선택해 주세요</option>${therapists.map(t=>`<option value="${sanitize(t.id)}">${sanitize(t.display_name)}</option>`).join('')}</select></label><label>초대코드<input name="invite" autocomplete="off" placeholder="담당 치료사가 전달한 코드" required></label><label>닉네임<input name="nickname" minlength="3" maxlength="24" autocomplete="off" placeholder="3~24자, 본명 대신 닉네임" required></label><button class="button" type="submit">내 계정 등록하기</button></form>`}
 </details><details class="enroll-details admin-details"><summary>운영자 전용 설정</summary><form id="setupForm" class="form"><label>관리자 설정코드<input name="setupToken" type="password" autocomplete="off" required></label><label>관리자 닉네임<input name="nickname" required minlength="3"></label><button class="button-ghost" type="submit">관리자 기기 등록</button></form></details>
 <p class="field-note">내 기록은 나만 볼 수 있어요. 직접 공유한 내용만 담당 치료사에게 전달돼요.</p></div></div>`;
 $('oneLogin').onclick=e=>loading(e.currentTarget,async()=>{
  if(!passkeyAvailable())throw Error('이 기기는 패스키를 지원하지 않습니다.');
  try{const r=await api('passkeys/login/options',{method:'POST',body:{}});const cr=await navigator.credentials.get({publicKey:requestOptions(r.options)});if(!cr)throw Error('본인 확인이 완료되지 않았어요.');const out=await api('passkeys/login/verify',{method:'POST',body:{credential:credentialPayload(cr)}});me=out.user;await dashboard();}catch(err){throw Error(errorPasskey(err));}
 });
 $('newAccount').onclick=async()=>{view='register';try{therapists=(await api('therapists')).therapists}catch{}render()};
 $('recoverAccount').onclick=()=>{view='recovery';render()};
 if(view==='recovery')$('recoveryForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;loading(f.querySelector('button'),()=>enrollWithPasskey({resetCode:formValue(f,'resetCode')}))};
 else $('registerForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;loading(f.querySelector('button'),()=>enrollWithPasskey({selectedTherapistId:formValue(f,'selectedTherapistId'),invite:formValue(f,'invite'),nickname:formValue(f,'nickname')}))};
 $('setupForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;loading(f.querySelector('button'),()=>enrollWithPasskey({setupToken:formValue(f,'setupToken'),nickname:formValue(f,'nickname')}))};
}
async function enrollWithPasskey(details){
 if(!passkeyAvailable())throw Error('기기에서 패스키를 지원하지 않습니다.');
 try{const r=await api('passkeys/enroll/options',{method:'POST',body:details});const cr=await navigator.credentials.create({publicKey:createOptions(r.options)});if(!cr)throw Error('기기 등록이 완료되지 않았어요.');const out=await api('passkeys/enroll/verify',{method:'POST',body:{credential:credentialPayload(cr)}});me=out.user;view='login';await dashboard();toast('기기 등록이 완료됐어요.');}catch(err){throw Error(errorPasskey(err));}
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
  activateWorkspace(b.dataset.workspaceTarget);
  if(window.innerWidth<741)document.querySelector('.workspace-content')?.scrollIntoView({behavior:'smooth',block:'start'});
 }));
 activateWorkspace(activeView);
}
function dataForm(role){if(role==='parent')return `<form class="form" id="entryForm"><label>관찰한 상황<textarea name="observation" maxlength="1200" placeholder="일상에서 실제로 관찰한 모습이나 변화" required></textarea></label><label>치료사에게 전할 내용<textarea name="message" maxlength="1200" placeholder="궁금한 점, 상담 시 전달사항"></textarea></label><label class="checkbox"><input type="checkbox" name="share"><span>담당 치료사에게 이 기록을 전달할게요. (선택하지 않으면 나만 볼 수 있어요.)</span></label><button class="button">관찰 기록 저장</button></form>`;
return `<form class="form" id="entryForm"><label>있었던 일<textarea name="event" maxlength="1200" placeholder="기억에 남는 일이 있으면 한 줄만 적어도 돼요." required></textarea></label><details class="optional-fields"><summary>생각이나 다음 행동도 적기 <small>선택</small></summary><div class="optional-wrap"><label>그때 떠오른 생각<textarea name="thought" maxlength="1200" placeholder="없으면 비워 둬도 괜찮아요."></textarea></label><label>다음에 해보고 싶은 것<textarea name="next" maxlength="1200" placeholder="답을 찾거나 꼭 실천할 필요는 없어요."></textarea></label></div></details><label class="checkbox"><input type="checkbox" name="share"><span>이 기록을 담당 치료사와 공유하기<br><small>체크하지 않으면 나만 볼 수 있어요.</small></span></label><button class="button" id="saveEntry">🔒 나만 보기로 저장</button></form>`;}
function recordCards(list=records){if(!list.length)return '<p>아직 작성된 기록이 없습니다.</p>';return list.map(r=>`<article class="record"><div class="meta">${sanitize(new Date(r.createdAt).toLocaleString('ko-KR'))} · ${r.kind==='student'?'학생':'학부모'} · ${r.shared?'담당 치료사에게 공유됨':'비공개'}${r.driveSynced?' · 드라이브 백업됨':''}</div>${r.entry?Object.entries(r.entry).map(([k,v])=>`<p><b>${({event:'있었던 일',thought:'떠오른 생각',next:'해보고 싶은 것',observation:'관찰 상황',message:'전달 사항',note:'메모',date:'날짜'})[k]||sanitize(k)}:</b> ${sanitize(v)}</p>`).join(''):'<p>기록 내용을 표시할 수 없습니다.</p>'}${(me.role==='student'||me.role==='parent')&&!r.shared?`<div class="buttons"><button class="button-ghost" data-share="${sanitize(r.id)}">담당 치료사에게 공유하기</button></div>`:''}${me.role==='therapist'?`<div class="muted">학생: ${sanitize(r.student)} · 작성자: ${sanitize(r.author)}</div>`:''}</article>`).join('');}
function attachShares(){document.querySelectorAll('[data-share]').forEach(b=>b.onclick=()=>{if(!confirm('이 기록을 담당 치료사에게 공유할까요? 이미 드라이브에 백업된 내용은 철회해도 자동 삭제되지 않습니다.'))return;loading(b,async()=>{await api('share',{method:'POST',body:{recordId:b.dataset.share}});toast('담당 치료사에게 공유되었어요.');await dashboard()})})}
function situationMarkup(){return `<div class="panel full" id="situation"><div class="tag">선택 활동 / 짧은 상황 연습</div><h3>메시지를 보냈는데 답장이 없어요.</h3><p>실제로 확인된 사실과, 아직 확인되지 않은 해석을 구분해 볼까요? 정답 맞히기보다는 여러 가능성을 생각하는 연습입니다.</p><div class="seg"><button type="button" data-scenario="fact">확인된 사실</button><button type="button" data-scenario="guess">가능한 해석</button><button type="button" data-scenario="next">다음에 할 일</button></div><div id="situationOutput" class="callout">원하는 버튼을 눌러 보세요.</div></div>`;}
function attachSituation(){document.querySelectorAll('[data-scenario]').forEach(btn=>btn.onclick=()=>{const s={fact:'메시지를 보냈고, 아직 답장이 없다는 사실만 알고 있어요.',guess:'바쁠 수도 있고, 메시지를 확인하지 못했을 수도 있어요. 지금은 이유를 알 수 없어요.',next:'나에게 중요한 일을 계속할 수도 있고, 나중에 필요한 연락을 다시 할 수도 있어요.'};$('situationOutput').textContent=s[btn.dataset.scenario];document.querySelectorAll('[data-scenario]').forEach(b=>{const selected=b===btn;b.classList.toggle('on',selected);b.setAttribute('aria-pressed',selected?'true':'false');});})}
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
  ['write','✎','기록하기','한 장이면 충분해'],['history','▤','내 기록','지난 기록 확인'],['situation','◇','상황 연습','다른 관점 보기'],['coding','⌘','코딩 실험실','선택해서 즐기기']
 ];
 app.innerHTML=hero(isParent?'관찰한 내용을 전해요':'필요할 때, 한 장만.','매일 작성할 필요는 없어요. 내 기록은 나만 보고, 공유할 내용은 직접 정할 수 있어요.')+
 `<div class="workspace-shell"><aside class="workspace-sidebar"><div class="sidebar-label">MY WORKSPACE <span class="sidebar-version">01</span></div>${workspaceNav(items,activeView)}<div class="sidebar-note"><span class="privacy-dot" aria-hidden="true"></span>공유는 내가 선택해요.<br><small>혼자만 볼 수도 있어요.</small></div></aside><div class="workspace-content">
 <section data-workspace-view="write" class="workspace-section"><div class="editor-bar"><span class="editor-dots" aria-hidden="true">● ● ●</span><span>${isParent?'observation.note':'my-note.md'}</span><span class="editor-status">NEW NOTE</span></div><div class="editor-paper"><span class="tag">01 / WRITE</span><h2>${isParent?'생활 관찰·전달사항':'어떤 일이 있었어?'}</h2><p>${isParent?'관찰한 상황을 간단히 적거나 치료사에게 전하고 싶은 말을 남길 수 있어요.':'기억에 남는 일이 있을 때만 적어도 돼. 한 줄이어도 충분해.'}</p>${dataForm(me.role)}</div></section>
 <section data-workspace-view="history" class="workspace-section" hidden><div class="editor-bar"><span class="editor-dots" aria-hidden="true">● ● ●</span><span>my-notes / list</span></div><div class="editor-paper"><span class="tag">02 / ARCHIVE</span><h2>내가 남긴 기록</h2><p>이 계정에서 내가 작성한 내용만 보여요.</p><div id="recordsHere">${recordCards()}</div></div></section>
 ${isParent?'':`<section data-workspace-view="situation" class="workspace-section" hidden><div class="editor-bar"><span class="editor-dots" aria-hidden="true">● ● ●</span><span>practice / perspectives</span></div><div class="editor-paper"><span class="tag">OPTIONAL / PRACTICE</span><h2>상황 연습</h2><p>어떤 일이 생겼을 때 여러 가능성을 가볍게 살펴볼 수 있어. 정답도 점수도 없어.</p>${situationMarkup()}</div></section>
 <section data-workspace-view="coding" class="workspace-section" hidden><div class="editor-bar"><span class="editor-dots" aria-hidden="true">● ● ●</span><span>studio / playground</span></div><div class="editor-paper"><span class="tag">OPTIONAL / PLAY</span><h2>코딩 실험실</h2><p>조건을 바꿔 결과를 확인하는 작은 실험 공간이야. 기록하지 않고 그냥 놀아도 돼.</p>${codingMarkup()}</div></section>`}
 </div></div><p class="workspace-footer">일단써봄은 생각을 이해하고 선택을 연습하기 위한 보조도구예요. 매일 쓰거나 불안을 반복해서 확인할 필요는 없어요.</p>`;
 $('entryForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;const entry=isParent?{observation:formValue(f,'observation'),message:formValue(f,'message')}:{event:formValue(f,'event'),thought:formValue(f,'thought'),next:formValue(f,'next')};const share=f.elements.share.checked;if(share&&!confirm('담당 치료사에게 이 기록을 공유할까요? 치료사가 드라이브에 복사한 기록은 공유 취소로 자동 삭제되지 않습니다.'))return;loading(f.querySelector('button'),async()=>{await api('records',{method:'POST',body:{entry,share}});activeView='history';toast('기록을 저장했어요.');await dashboard()})};
 attachShares();bindWorkspace();
 if(!isParent){attachSituation();attachCoding();const save=$('saveEntry'),share=$('entryForm').elements.share;share.addEventListener('change',()=>{save.textContent=share.checked?'↗ 저장하고 담당 치료사에게 공유':'나만 보기로 저장';})}
}
function exportCSV(){const labels={event:'있었던 일',thought:'떠오른 생각',next:'해보고 싶은 것',observation:'관찰한 상황',message:'전달사항'};function cell(s){let x=String(s??'');if(/^[\s]*[=+\-@\t\r]/.test(x))x="'"+x;return '"'+x.replaceAll('"','""')+'"'}const rows=[['작성일','학생','작성자','유형','기록 내용'],...records.map(r=>[r.createdAt,r.student,r.author,r.kind,Object.entries(r.entry??{}).map(([k,v])=>(labels[k]||k)+': '+v).join('\n')])];const csv='\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n');const u=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='일단써봄_담당치료사_공유기록.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),500)}
async function therapistHome(){const r=await Promise.all([api('students'),api('drive/status'),api('accounts')]);students=r[0].students;drive=r[1];const accounts=r[2].accounts;app.innerHTML=hero('담당 기록','담당 학생이 공유한 기록만 확인할 수 있어요. 학생·학부모의 비공개 기록은 표시되지 않아요.')+`<div class="workspace-shell therapist-shell"><aside class="workspace-sidebar"><div class="sidebar-label">THERAPIST DESK <span class="sidebar-version">01</span></div>${workspaceNav([['inbox','▣','도착한 기록','공유된 기록'],['accounts','♙','계정 연결','초대·재등록'],['drive','↗','Google Drive','담당자 전용']],activeView)}<div class="sidebar-note">배정된 학생의 공유 기록만<br><small>담당 치료사가 확인할 수 있어요.</small></div></aside><div class="workspace-content"><div class="grid"><section class="panel highlight full" data-workspace-view="inbox"><span class="tag">01 / INBOX</span><h2>담당 기록 <small>(${records.length}건)</small></h2><div class="buttons"><button id="refresh" class="button-ghost">↻ 새 기록 확인</button><button id="csv" class="button-ghost">CSV 다운로드</button></div><div class="filter-strip"><label>학생별 보기<select id="filterStudent"><option value="all">전체 학생</option>${students.map(s=>`<option value="${sanitize(s.nickname)}">${sanitize(s.nickname)}</option>`).join('')}</select></label><label>작성자 구분<select id="filterKind"><option value="all">전체</option><option value="student">학생 기록</option><option value="parent">학부모 전달</option></select></label></div><div id="inboxResults">${recordCards()}</div></section><section class="panel" data-workspace-view="accounts"><span class="tag">02 / ACCOUNTS</span><h2>학생·학부모 초대하기</h2><p>초대코드를 전달해 담당 학생·학부모를 연결해요.</p><form id="inviteForm" class="form"><label>초대할 사람<select name="role" id="inviteRole"><option value="student">학생</option><option value="parent">학부모</option></select></label><label id="studentPicker" class="hidden">연결할 학생<select name="studentId">${students.map(s=>`<option value="${sanitize(s.id)}">${sanitize(s.nickname)}</option>`).join('')}</select></label><button class="button">7일짜리 초대코드 만들기</button></form><div id="inviteOutput"></div></section><section class="panel" data-workspace-view="accounts"><span class="tag">02 / ACCOUNT HELP</span><h2>패스키 재등록 코드</h2><p>기기를 잃어버린 경우 신원 확인 후 30분짜리 재등록 코드를 발급합니다.</p><label>대상 계정<select id="resetUser">${accounts.map(a=>`<option value="${sanitize(a.id)}">${sanitize(a.nickname)} · ${a.role==='student'?'학생':'학부모'}</option>`).join('')}</select></label><div class="buttons"><button id="resetIssue" class="button-ghost" ${accounts.length?'':'disabled'}>재설정 코드 발급</button></div><div id="resetOutput"></div></section><section class="panel full" data-workspace-view="drive"><span class="tag">03 / GOOGLE DRIVE</span><h2>Google Drive</h2><p>${drive.connected?'내 구글 계정이 연결돼 있습니다.':'구글 계정 연결 전입니다. 학생 기록은 아직 자동 업로드되지 않습니다.'}</p><div class="buttons"><button id="googleConnect" class="button-ghost" ${drive.configured?'':'disabled'}>${drive.connected?'구글 계정 다시 연결':'내 구글 계정 연결'}</button><button id="driveSync" class="button" ${drive.connected?'':'disabled'}>공유 기록 백업</button>${drive.folderUrl?`<a class="button-ghost" href="${sanitize(drive.folderUrl)}" target="_blank" rel="noopener noreferrer">내 드라이브 폴더 열기 ↗</a>`:''}</div>${!drive.configured?hint('구글 OAuth 관리자 설정이 아직 끝나지 않았습니다. 인증을 완료하면 담당 치료사의 구글 계정에만 기록을 복사할 수 있습니다.'):''}</section></div></div></div>`;
attachShares();bindWorkspace();const rerenderInbox=()=>{const name=$('filterStudent').value,kind=$('filterKind').value;const list=records.filter(r=>(name==='all'||r.student===name)&&(kind==='all'||r.kind===kind));$('inboxResults').innerHTML=recordCards(list);};$('filterStudent').onchange=rerenderInbox;$('filterKind').onchange=rerenderInbox;$('refresh').onclick=()=>dashboard();$('csv').onclick=exportCSV;$('inviteRole').onchange=()=>{$('studentPicker').classList.toggle('hidden',$('inviteRole').value!=='parent')};$('inviteForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;loading(f.querySelector('button'),async()=>{const out=await api('invites',{method:'POST',body:{role:formValue(f,'role'),studentId:formValue(f,'studentId')}});const div=$('inviteOutput');div.innerHTML='<p class="muted">초대코드는 한 번만 사용할 수 있으며 7일 뒤 만료됩니다. 개인적인 방법으로 전달하세요.</p><textarea id="inviteCode" readonly></textarea><button class="button-ghost" type="button" id="copyCode">초대코드 복사</button>';$('inviteCode').value=out.invite;$('copyCode').onclick=()=>{navigator.clipboard.writeText(out.invite).then(()=>toast('초대코드를 복사했어요.'))}})};
$('resetIssue').onclick=e=>loading(e.target,async()=>{if(!confirm('대상자의 신원을 별도로 확인했나요?'))return;const result=await api('reset/create',{method:'POST',body:{userId:$('resetUser').value}});$('resetOutput').innerHTML='<p>30분 뒤 만료되는 재설정 코드입니다.</p><textarea readonly id="resetCode"></textarea>';$('resetCode').value=result.resetCode;});$('googleConnect').onclick=()=>{location.assign('/api/drive/start')};$('driveSync').onclick=e=>loading(e.target,async()=>{const x=await api('drive/sync',{method:'POST'});toast(`${x.synced}건을 담당 치료사의 드라이브에 백업했습니다.`);await dashboard()});}
function adminHome(){app.innerHTML=hero('계정 운영','최초 관리자 계정은 기록을 읽을 수 없습니다. 치료사 초대만 발급할 수 있어요.')+`<div class="panel"><h2>치료사 초대코드 발급</h2><p>치료사도 학생·학부모와 같은 패스키 방식으로 등록합니다.</p><button id="inviteTherapist" class="button">치료사 초대코드 만들기</button><div id="adminInvite"></div></div>`;$('inviteTherapist').onclick=e=>loading(e.target,async()=>{const r=await api('invites',{method:'POST',body:{role:'therapist'}});const d=$('adminInvite');d.innerHTML='<p>코드를 복사해 치료사에게 개별 전달하세요. 7일간 유효합니다.</p><textarea readonly id="adminCode"></textarea>';$('adminCode').value=r.invite;})}
async function dashboard(){header();records=me.role==='admin'?[]:(await api('records')).records??[];if(me.role==='therapist')await therapistHome();else if(me.role==='admin')adminHome();else studentHome();}
function render(){header();if(!me)loginScreen();else dashboard().catch(e=>{app.innerHTML=hint('화면을 불러오지 못했어요. '+sanitize(e.message))})}
(async()=>{try{me=(await api('me')).user}catch{me=null}render()})();

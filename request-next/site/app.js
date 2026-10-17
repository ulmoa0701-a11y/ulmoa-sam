/* Single writing UI: all post types use exactly the same fields and controls.
 * No secrets are stored in localStorage. The receipt lives only in memory or
 * in the optional URL fragment, which is never sent to the HTTP server.
 */
(function(){
'use strict';
const $=(q,root=document)=>root.querySelector(q);
const form=$('#postForm'), anon=$('#anonymous'),nick=$('#nickname'),secret=$('#secretOptions');
const status=$('#formStatus'),submit=$('#sendButton');
const receiptPanel=$('#receiptPanel'),receiptCode=$('#receiptCode');
const memo=$('#body'),memoCount=$('#memoCount'),category=$('#category');
let adminKey='',latestReceipt='',serverReady=false,sending=false;
function syncSend(){submit.disabled=!serverReady||sending;}
function updateCount(){memoCount.textContent=memo.value.length.toLocaleString('ko-KR')+' / 2,000';}
memo.addEventListener('input',updateCount);
document.querySelectorAll('.prompt-chip').forEach(chip=>chip.addEventListener('click',()=>{
  category.value=chip.dataset.kind;
  if(!memo.value.trim()){memo.value=chip.dataset.start||'';memo.dispatchEvent(new Event('input',{bubbles:true}));}
  memo.focus();memo.setSelectionRange(memo.value.length,memo.value.length);
}));
updateCount();syncSend();
function setStatus(el,msg,kind){el.textContent=msg;el.className='status'+(kind?' '+kind:'');}
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function selectMode(){
  const mode=$('input[name="visibility"]:checked').value;
  for(const choice of document.querySelectorAll('.choice'))choice.classList.toggle('selected',$('input',choice).checked);
  secret.hidden=mode==='public';$('#publicSafety').hidden=mode!=='public';
  if(mode==='public'){$('#email').value='';$('#phone').value='';$('#consent').checked=false;}
}
function syncAnon(){nick.disabled=anon.checked;nick.required=!anon.checked;nick.placeholder=anon.checked?'익명':'표시할 이름';}
anon.addEventListener('change',syncAnon);
for(const radio of document.querySelectorAll('input[name="visibility"]'))radio.addEventListener('change',selectMode);
syncAnon();selectMode();
async function sendForm(ev){
 ev.preventDefault();setStatus(status,'');
 if(!form.reportValidity())return;
 const mode=$('input[name="visibility"]:checked').value;
 if(mode!=='public'&&!$('#consent').checked){
   setStatus(status,'비공개 쪽지 보관·이용 동의를 선택해 주세요.','error');$('#consent').focus();return;
 }
 const file=$('#attachment').files[0];
 if(file&&file.size>4*1024*1024){setStatus(status,'첨부파일은 4MB 이하여야 해요.','error');return;}
 const data=new FormData(form);
 data.set('anonymous',anon.checked?'true':'false');
 data.set('consent',$('#consent').checked?'true':'false');
 sending=true;syncSend();submit.textContent='쪽지를 전하는 중…';
 try{
  const response=await fetch('./api/posts'.replace('./api','/api'),{method:'POST',body:data,credentials:'same-origin',cache:'no-store'});
  const result=await response.json();
  if(!response.ok||!result.ok)throw Error(result.error||'등록하지 못했어요.');
  latestReceipt=result.id+'.'+result.receipt;
  receiptCode.value=latestReceipt;
  receiptPanel.hidden=false;
  receiptPanel.scrollIntoView({block:'start',behavior:'smooth'});
  setStatus(status,mode==='public'?'쪽지가 도착했어요. 내용은 운영자 검토 후 공개돼요. 확인 코드를 보관해 주세요.':'쪽지가 도착했어요. 내 쪽지를 다시 확인할 수 있도록 코드를 보관해 주세요.','ok');
  form.reset();syncAnon();selectMode();updateCount();
  await loadFeed();
 }catch(err){setStatus(status,err.message||'연결을 확인해 주세요.','error');}
 finally{sending=false;syncSend();submit.innerHTML='<span aria-hidden="true">✉</span> 쪽지 보내기';}
}
form.addEventListener('submit',sendForm);
function receiptUrl(){return location.origin+location.pathname+'#mine='+encodeURIComponent(latestReceipt);}
$('#copyReceipt').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(receiptUrl());$('#copyReceipt').textContent='복사했어요';}
 catch{receiptCode.focus();receiptCode.select();setStatus(status,'코드를 선택해 직접 복사할 수 있어요.');}
});
$('#openMine').addEventListener('click',()=>{prefill(latestReceipt);$('#minePanel').scrollIntoView({block:'start',behavior:'smooth'});});
function prefill(code){const dot=code.indexOf('.');if(dot<0)return;$('#postId').value=code.slice(0,dot);$('#postToken').value=code.slice(dot+1);}
function postCard(p,locked=false){
 const card=el('article',undefined,'post');
 const meta=el('div',undefined,'post-meta');
 for(const text of [p.category,locked?p.maskedName:p.displayName,locked?p.date:new Date(p.createdAt).toLocaleDateString('ko-KR')]){
  if(text)meta.append(el('span',text,text===p.category?'kind':undefined));
 }
 card.append(meta,el('h3',locked?p.title:(p.title||'제목 없는 글')));
 if(!locked){
  card.append(el('p',p.body,'post-text'));
  if(p.link){try{const u=new URL(p.link);if(['https:','http:'].includes(u.protocol)){const a=el('a','관련 링크 ↗');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';card.append(a);}}catch{}}
  if(p.reply){const answer=el('div',undefined,'answer');answer.append(el('strong','울모아쌤의 답장'),el('p',p.reply,'post-text'));card.append(answer);}
 }else{card.append(el('p','본문과 첨부파일은 공개되지 않습니다. · '+p.status+(p.hasReply?' · 답변 완료':''),'muted'));}
 if(p.hasAttachment){if(locked)card.append(el('span',' · 📎 첨부 있음','muted'));else if(!p.visibility){const a=el('a','📎 승인된 첨부파일 받기');a.href='/api/public/'+encodeURIComponent(p.id)+'/file';a.rel='noopener noreferrer';card.append(a);}}
 return card;
}
async function loadFeed(){
 const pub=$('#publicFeed'),locked=$('#lockedFeed');
 pub.replaceChildren(el('p','글을 불러오는 중…','muted'));
 try{
  const r=await fetch('/api/posts',{credentials:'same-origin',cache:'no-store'});
  if(!r.ok)throw Error('server not ready');
  const d=await r.json();pub.replaceChildren();locked.replaceChildren();
  if(!Array.isArray(d.posts)||!Array.isArray(d.locked))throw Error('invalid response');
  serverReady=true;syncSend();
  if(!d.posts.length)pub.append(el('p','아직 공개된 쪽지가 없어요. 첫 번째 쪽지를 남겨보세요.','muted'));
  else d.posts.forEach(p=>pub.append(postCard(p)));
  if(!d.locked.length)locked.append(el('p','공개가 승인된 잠금글이 없어요.','muted'));
  else d.locked.forEach(p=>locked.append(postCard(p,true)));
 }catch{
  serverReady=false;syncSend();
  pub.replaceChildren(el('p','쪽지 접수 준비 중입니다. 서버가 연결되기 전까지는 글을 받지 않아요.','muted'));
  locked.replaceChildren(el('p','잠금글 목록을 불러올 수 없습니다.','muted'));
 }
}
$('#refresh').addEventListener('click',loadFeed);
async function seeMine(ev){
 ev.preventDefault();const id=$('#postId').value.trim(),code=$('#postToken').value.trim();
 const result=$('#mineResult');result.hidden=true;result.replaceChildren();setStatus($('#mineStatus'),'조회 중…');
 if(!/^[a-f0-9-]{36}$/.test(id)||!/^[a-f0-9]{64}$/.test(code)){setStatus($('#mineStatus'),'글 번호나 확인 코드를 확인해 주세요.','error');return;}
 try{
  const r=await fetch('/api/mine/'+encodeURIComponent(id),{headers:{'X-Receipt-Token':code},credentials:'same-origin',cache:'no-store'});
  if(!r.ok)throw Error('글 번호 또는 확인 코드가 맞지 않습니다.');
  const d=await r.json(),p=d.post;
  result.append(postCard({...p,title:p.title,body:p.body,displayName:p.displayName,createdAt:p.createdAt}));
  if(p.hasAttachment){
   const button=el('button','첨부파일 내려받기','secondary');
   button.type='button';
   button.addEventListener('click',()=>download('/api/mine/'+encodeURIComponent(id)+'/file',{'X-Receipt-Token':code},p.attachmentName));
   result.append(button);
  }
  const remove=el('button','이 쪽지 삭제하기','delete-own');
  remove.type='button';
  remove.addEventListener('click',async()=>{
   if(!window.confirm('이 쪽지와 첨부파일을 삭제할까요? 삭제하면 복구할 수 없어요.'))return;
   remove.disabled=true;
   try{
    const response=await fetch('/api/mine/'+encodeURIComponent(id),{
     method:'DELETE',headers:{'X-Receipt-Token':code},credentials:'same-origin',cache:'no-store'
    });
    if(!response.ok)throw Error('쪽지를 삭제하지 못했어요.');
    result.replaceChildren();result.hidden=true;
    $('#mineForm').reset();
    setStatus($('#mineStatus'),'쪽지와 첨부파일을 삭제했어요.','ok');
    await loadFeed();
   }catch(err){setStatus($('#mineStatus'),err.message,'error');remove.disabled=false;}
  });
  result.append(remove);
  result.hidden=false;setStatus($('#mineStatus'),'내 쪽지를 확인했어요.','ok');
 }catch(err){setStatus($('#mineStatus'),err.message,'error');}
}
$('#mineForm').addEventListener('submit',seeMine);
async function download(url,headers,name){
 try{
  const r=await fetch(url,{headers,credentials:'same-origin',cache:'no-store'});
  if(!r.ok)throw Error('파일을 내려받지 못했어요.');
  const blob=await r.blob(),a=document.createElement('a'),href=URL.createObjectURL(blob);
  a.href=href;a.download=name||'attachment';document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(href),15000);
 }catch(err){alert(err.message);}
}
$('#adminLoad').addEventListener('click',async()=>{
 const k=$('#adminKey').value.trim();const place=$('#adminPosts');
 if(k.length<32){setStatus($('#adminStatus'),'운영자 키를 확인해 주세요.','error');return;}
 try{
  const r=await fetch('/api/admin/posts',{headers:{Authorization:'Bearer '+k},credentials:'same-origin',cache:'no-store'});
  if(!r.ok)throw Error('운영자 인증에 실패했습니다.');
  const data=await r.json();adminKey=k;$('#adminKey').value='';
  $('#selfTestPanel').hidden=false;
  place.replaceChildren();
  if(!data.posts.length)place.append(el('p','접수된 글이 없습니다.','muted'));
  data.posts.forEach(renderAdmin);
  setStatus($('#adminStatus'),'운영자 목록을 불러왔어요.','ok');
 }catch(err){adminKey='';$('#selfTestPanel').hidden=true;setStatus($('#adminStatus'),err.message,'error');}
});
function renderAdmin(p){
 const wrapper=el('article',undefined,'admin-post');
 wrapper.append(el('h3',(p.visibility==='public'?'공개글':p.visibility==='list'?'잠금글':'완전 비공개')+' · '+(p.title||'제목 없음')),el('p',p.body,'post-text'),el('p',p.displayName+' / '+p.createdAt,'muted'));
 if(p.email||p.phone)wrapper.append(el('p','연락처: '+[p.email,p.phone].filter(Boolean).join(' / '),'muted'));
 const edit=el('div',undefined,'admin-edit');
 const statusSelect=el('select');
 for(const s of ['접수','확인 중','답변 완료']){const o=el('option',s);o.value=s;statusSelect.append(o);}statusSelect.value=p.status;
 const replyBox=el('textarea');replyBox.placeholder='운영자 답변';replyBox.maxLength=1200;replyBox.value=p.reply||'';
 const titleInput=el('input');titleInput.placeholder='잠금글 목록용 제목';titleInput.maxLength=70;titleInput.value=p.publicTitle||'비밀글입니다';
 const approve=el('input');approve.type='checkbox';approve.checked=p.metadataApproved;approve.disabled=p.visibility==='hidden';
 const attachApprove=el('input');attachApprove.type='checkbox';attachApprove.checked=p.attachmentApproved;
 const approveLabel=el('label',' 공개 승인 (공개글 본문 · 잠금글 목록)');approveLabel.prepend(approve);
 const attachLabel=el('label',' 공개글 첨부파일 별도 공개 승인');attachLabel.prepend(attachApprove);
 const save=el('button','답변·상태 저장');save.type='button';
 edit.append(el('label','상태'),statusSelect,el('label','답변'),replyBox,el('label','승인된 제목'),titleInput,approveLabel,attachLabel,save);
 if(p.hasAttachment){const button=el('button','첨부 확인 (운영자)','secondary');button.type='button';button.onclick=()=>download('/api/admin/posts/'+p.id+'/file',{Authorization:'Bearer '+adminKey},p.attachmentName);edit.append(button);}
 save.addEventListener('click',async()=>{
   save.disabled=true;
   try{
    const r=await fetch('/api/admin/posts/'+p.id,{method:'POST',headers:{Authorization:'Bearer '+adminKey,'Content-Type':'application/json'},body:JSON.stringify({status:statusSelect.value,reply:replyBox.value,publicTitle:titleInput.value,metadataApproved:approve.checked,attachmentApproved:attachApprove.checked}),credentials:'same-origin',cache:'no-store'});
    if(!r.ok){let d=await r.json();throw Error(d.error||'저장 실패');}
    save.textContent='저장 완료';await loadFeed();
   }catch(err){setStatus($('#adminStatus'),err.message,'error');}
   finally{save.disabled=false;}
 });
 const remove=el('button','글과 첨부파일 삭제','delete-own');remove.type='button';
 remove.addEventListener('click',async()=>{
   if(!window.confirm('이 글과 모든 첨부파일을 영구 삭제할까요? 이 작업은 되돌릴 수 없어요.'))return;
   remove.disabled=true;
   try{
     const res=await fetch('/api/admin/posts/'+encodeURIComponent(p.id),{
       method:'DELETE',headers:{Authorization:'Bearer '+adminKey},
       credentials:'same-origin',cache:'no-store'
     });
     if(!res.ok)throw Error('삭제하지 못했어요.');
     wrapper.remove();
     setStatus($('#adminStatus'),'선택한 글과 첨부파일을 삭제했어요.','ok');
     await loadFeed();
   }catch(err){setStatus($('#adminStatus'),err.message||'삭제 오류','error');remove.disabled=false;}
 });
 edit.append(remove);
 wrapper.append(edit);$('#adminPosts').append(wrapper);
}

/* A deliberately explicit, admin-only production-staging diagnostic.
 * Test input is synthetic; one private post and an 8-byte dummy PDF are purged
 * in finally. No secret, receipt or personal details are written to UI/logs.
 */
$('#adminSelfTest').addEventListener('click',async()=>{
 const button=$('#adminSelfTest'),place=$('#selfTestStatus');
 if(!adminKey){setStatus(place,'먼저 운영자 인증을 해주세요.','error');return;}
 button.disabled=true;
 let created=null,passes=0,problem='',cleanupError='';
 const label=(message)=>setStatus(place,message);
 const checked=(ok,message)=>{
  if(!ok)throw Error(message);
  passes++;
 };
 const api=async(url,options={})=>fetch(url,{cache:'no-store',credentials:'same-origin',...options});
 try{
  label('1/6 · 데이터베이스 응답 확인 중…');
  const health=await api('/api/health');
  checked(health.status===200,'데이터베이스 조회가 실패했어요.');
  const healthData=await health.json();
  checked(healthData.ok===true&&healthData.database==='ready','데이터베이스 응답을 확인할 수 없어요.');

  const marker='HABOM_TEST_'+crypto.randomUUID().replace(/-/g,'');
  const payload=new FormData();
  for(const [k,v] of Object.entries({
   visibility:'hidden',category:'질문',title:'자동 검증 중인 쪽지',
   body:marker,nickname:'자동검증',anonymous:'false',role:'',
   consent:'true',website:''
  }))payload.set(k,v);
  payload.set('attachment',new File(['%PDF-1.4\n'],'autocheck.pdf',{type:'application/pdf'}));
  label('2/6 · 가상 비공개 쪽지 저장 중…');
  const createdResponse=await api('/api/posts',{method:'POST',body:payload});
  if(!createdResponse.ok){
   const err=await createdResponse.json().catch(()=>({}));
   throw Error('시험 글을 저장하지 못했어요 ('+createdResponse.status+'). '+(err.error||''));
  }
  created=await createdResponse.json();
  checked(created.ok===true&&/^[a-f0-9-]{36}$/.test(created.id)&&/^[a-f0-9]{64}$/.test(created.receipt),'접수 확인 코드를 받지 못했어요.');
  const path='/api/mine/'+encodeURIComponent(created.id);
  const receiptHeader={'X-Receipt-Token':created.receipt};

  label('3/6 · 비밀글 공개 차단 및 본인 확인 중…');
  const feed=await api('/api/posts');
  checked(feed.status===200,'공개 목록 조회 오류');
  const feedText=await feed.text();
  checked(!feedText.includes(marker)&&!feedText.includes(created.id),'비밀글이 공개 목록에 노출됐어요.');
  const denied=await api(path);
  checked(denied.status===403,'확인 코드 없는 접근이 허용됐어요.');
  const owned=await api(path,{headers:receiptHeader});
  checked(owned.status===200,'작성자 확인 코드로 조회할 수 없어요.');
  const ownedData=await owned.json();
  checked(ownedData.post?.body===marker,'저장된 비밀글 내용이 맞지 않아요.');

  label('4/6 · 비공개 PDF 접근 권한 확인 중…');
  checked((await api(path+'/file')).status===403,'비공개 파일에 무단 접근이 가능해요.');
  checked((await api('/api/public/'+created.id+'/file')).status===404,'비공개 파일이 공개 경로에서 보입니다.');
  const file=await api(path+'/file',{headers:receiptHeader});
  checked(file.status===200,'작성자가 첨부파일을 받을 수 없어요.');
  checked((await file.text())==='%PDF-1.4\n','다운로드 파일 내용이 일치하지 않아요.');

  label('5/6 · 운영자 답변과 작성자 재조회 중…');
  const adminReply=await api('/api/admin/posts/'+created.id,{
   method:'POST',headers:{Authorization:'Bearer '+adminKey,'Content-Type':'application/json'},
   body:JSON.stringify({status:'답변 완료',reply:'자동검증 답장',publicTitle:'비밀글입니다',metadataApproved:false,attachmentApproved:false})
  });
  checked(adminReply.status===200,'운영자 답변을 저장할 수 없어요.');
  const ownedAgain=await api(path,{headers:receiptHeader});
  checked(ownedAgain.status===200,'답변 이후 작성자 조회 실패');
  const replyData=await ownedAgain.json();
  checked(replyData.post?.reply==='자동검증 답장','저장한 답변을 다시 읽을 수 없어요.');

  label('6/6 · 시험 쪽지와 첨부파일 삭제 중…');
 }catch(err){
  problem=err instanceof Error?err.message:'알 수 없는 오류가 발생했어요.';
 }finally{
  if(created?.id&&created?.receipt){
   try{
    const path='/api/mine/'+encodeURIComponent(created.id);
    const options={method:'DELETE',headers:{'X-Receipt-Token':created.receipt}};
    let removed=await api(path,options);
    if(!removed.ok)removed=await api(path,options);
    if(!removed.ok)throw Error('삭제 요청 실패 ('+removed.status+')');
    const verify=await api(path,{headers:{'X-Receipt-Token':created.receipt}});
    if(verify.status!==403)throw Error('삭제 후 재조회가 차단되지 않았습니다.');
    passes++;
   }catch(err){
    cleanupError='시험 쪽지 삭제 확인 실패: '+(err instanceof Error?err.message:'알 수 없는 오류');
   }
  }
  button.disabled=false;
  await loadFeed();
  const succeeded=!problem&&!cleanupError;
  if(succeeded){
   setStatus(place,'검증 통과 · '+passes+'개 항목 확인. 시험 글과 파일을 삭제했어요.','ok');
  }else{
   setStatus(place,'검증 미통과 · '+[problem,cleanupError].filter(Boolean).join(' / ')+(cleanupError?' (운영자 목록에서 시험 글을 확인해 주세요.)':''),'error');
  }
 }
});

if(location.hash.startsWith('#mine=')){try{prefill(decodeURIComponent(location.hash.slice(6)));}catch{}}
loadFeed();
})();

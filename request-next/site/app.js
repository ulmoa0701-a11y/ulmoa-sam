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
let adminKey='',latestReceipt='';
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
 if(mode!=='public'&&($('#email').value.trim()||$('#phone').value.trim())&&!$('#consent').checked){
   setStatus(status,'연락처 수집·이용 동의를 선택해 주세요.','error');$('#consent').focus();return;
 }
 const file=$('#attachment').files[0];
 if(file&&file.size>4*1024*1024){setStatus(status,'첨부파일은 4MB 이하여야 해요.','error');return;}
 const data=new FormData(form);
 data.set('anonymous',anon.checked?'true':'false');
 data.set('consent',$('#consent').checked?'true':'false');
 submit.disabled=true;submit.textContent='등록하고 있어요…';
 try{
  const response=await fetch('./api/posts'.replace('./api','/api'),{method:'POST',body:data,credentials:'omit',cache:'no-store'});
  const result=await response.json();
  if(!response.ok||!result.ok)throw Error(result.error||'등록하지 못했어요.');
  latestReceipt=result.id+'.'+result.receipt;
  receiptCode.value=latestReceipt;
  receiptPanel.hidden=false;
  receiptPanel.scrollIntoView({block:'start',behavior:'smooth'});
  setStatus(status,'글을 접수했어요. 확인 코드를 보관해 주세요.','ok');
  form.reset();syncAnon();selectMode();
  await loadFeed();
 }catch(err){setStatus(status,err.message||'연결을 확인해 주세요.','error');}
 finally{submit.disabled=false;submit.textContent='이야기 남기기';}
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
  if(p.reply){const answer=el('div',undefined,'answer');answer.append(el('strong','울모아쌤'),el('p',p.reply,'post-text'));card.append(answer);}
 }else{card.append(el('p','본문과 첨부파일은 공개되지 않습니다. · '+p.status+(p.hasReply?' · 답변 완료':''),'muted'));}
 if(p.hasAttachment){if(locked)card.append(el('span',' · 📎 첨부 있음','muted'));else{const a=el('a','📎 승인된 첨부파일 받기');a.href='/api/public/'+encodeURIComponent(p.id)+'/file';a.rel='noopener noreferrer';card.append(a);}}
 return card;
}
async function loadFeed(){
 const pub=$('#publicFeed'),locked=$('#lockedFeed');
 pub.replaceChildren(el('p','글을 불러오는 중…','muted'));
 try{
  const r=await fetch('/api/posts',{credentials:'omit',cache:'no-store'});
  if(!r.ok)throw Error('server not ready');
  const d=await r.json();pub.replaceChildren();locked.replaceChildren();
  if(!Array.isArray(d.posts)||!Array.isArray(d.locked))throw Error('invalid response');
  if(!d.posts.length)pub.append(el('p','아직 공개글이 없어요.','muted'));
  else d.posts.forEach(p=>pub.append(postCard(p)));
  if(!d.locked.length)locked.append(el('p','공개가 승인된 잠금글이 없어요.','muted'));
  else d.locked.forEach(p=>locked.append(postCard(p,true)));
 }catch{
  pub.replaceChildren(el('p','게시판 서버에 아직 연결되지 않았어요. 현재 개발판에서는 글을 받을 수 없습니다.','muted'));
  locked.replaceChildren(el('p','잠금글 목록을 불러올 수 없습니다.','muted'));
 }
}
$('#refresh').addEventListener('click',loadFeed);
async function seeMine(ev){
 ev.preventDefault();const id=$('#postId').value.trim(),code=$('#postToken').value.trim();
 const result=$('#mineResult');result.hidden=true;result.replaceChildren();setStatus($('#mineStatus'),'조회 중…');
 if(!/^[a-f0-9-]{36}$/.test(id)||!/^[a-f0-9]{64}$/.test(code)){setStatus($('#mineStatus'),'글 번호나 확인 코드를 확인해 주세요.','error');return;}
 try{
  const r=await fetch('/api/mine/'+encodeURIComponent(id),{headers:{'X-Receipt-Token':code},credentials:'omit',cache:'no-store'});
  if(!r.ok)throw Error('글 번호 또는 확인 코드가 맞지 않습니다.');
  const d=await r.json(),p=d.post;
  result.append(postCard({...p,title:p.title,body:p.body,displayName:p.displayName,createdAt:p.createdAt}));
  if(p.hasAttachment){
   const button=el('button','첨부파일 내려받기','secondary');
   button.type='button';
   button.addEventListener('click',()=>download('/api/mine/'+encodeURIComponent(id)+'/file',{'X-Receipt-Token':code},p.attachmentName));
   result.append(button);
  }
  result.hidden=false;setStatus($('#mineStatus'),'내 글을 확인했어요.','ok');
 }catch(err){setStatus($('#mineStatus'),err.message,'error');}
}
$('#mineForm').addEventListener('submit',seeMine);
async function download(url,headers,name){
 try{
  const r=await fetch(url,{headers,credentials:'omit',cache:'no-store'});
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
  const r=await fetch('/api/admin/posts',{headers:{Authorization:'Bearer '+k},credentials:'omit',cache:'no-store'});
  if(!r.ok)throw Error('운영자 인증에 실패했습니다.');
  const data=await r.json();adminKey=k;$('#adminKey').value='';
  place.replaceChildren();
  if(!data.posts.length)place.append(el('p','접수된 글이 없습니다.','muted'));
  data.posts.forEach(renderAdmin);
  setStatus($('#adminStatus'),'운영자 목록을 불러왔어요.','ok');
 }catch(err){adminKey='';setStatus($('#adminStatus'),err.message,'error');}
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
 const approve=el('input');approve.type='checkbox';approve.checked=p.metadataApproved;approve.disabled=p.visibility!=='list';
 const attachApprove=el('input');attachApprove.type='checkbox';attachApprove.checked=p.attachmentApproved;
 const approveLabel=el('label',' 잠금글 목록 공개 승인');approveLabel.prepend(approve);
 const attachLabel=el('label',' 공개글 첨부파일 별도 공개 승인');attachLabel.prepend(attachApprove);
 const save=el('button','답변·상태 저장');save.type='button';
 edit.append(el('label','상태'),statusSelect,el('label','답변'),replyBox,el('label','승인된 제목'),titleInput,approveLabel,attachLabel,save);
 if(p.hasAttachment){const button=el('button','첨부 확인 (운영자)','secondary');button.type='button';button.onclick=()=>download('/api/admin/posts/'+p.id+'/file',{Authorization:'Bearer '+adminKey},p.attachmentName);edit.append(button);}
 save.addEventListener('click',async()=>{
   save.disabled=true;
   try{
    const r=await fetch('/api/admin/posts/'+p.id,{method:'POST',headers:{Authorization:'Bearer '+adminKey,'Content-Type':'application/json'},body:JSON.stringify({status:statusSelect.value,reply:replyBox.value,publicTitle:titleInput.value,metadataApproved:approve.checked,attachmentApproved:attachApprove.checked}),credentials:'omit',cache:'no-store'});
    if(!r.ok){let d=await r.json();throw Error(d.error||'저장 실패');}
    save.textContent='저장 완료';await loadFeed();
   }catch(err){setStatus($('#adminStatus'),err.message,'error');}
   finally{save.disabled=false;}
 });
 wrapper.append(edit);$('#adminPosts').append(wrapper);
}
if(location.hash.startsWith('#mine=')){try{prefill(decodeURIComponent(location.hash.slice(6)));}catch{}}
loadFeed();
})();

// Teacher feedback on student-approved shared practice records only.
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const emojis={heart:'❤️',star:'⭐',clap:'👏',cheer:'🙌',smile:'😊'};
export function feedbackMarkup(record,role,saved){
 if(!record?.practice||!record.shared)return '';
 if(role==='therapist'){
  const options=[['','선택 안 함'],...Object.entries(emojis)].map(([v,x])=>
   `<option value="${v}"${(saved?.reaction||'')===v?' selected':''}>${x}${v?' 이모티콘':''}</option>`).join('');
  return `<form class="record-feedback-editor" data-record-feedback="${esc(record.id)}">
   <strong>💬 이 기록에 대한 선생님의 반응</strong>
   <div class="feedback-inputs"><label>이모티콘 <select name="reaction">${options}</select></label>
   <label>코멘트 <textarea name="text" rows="2" maxlength="320" placeholder="학생에게 전할 한마디나 질문">${esc(saved?.text||'')}</textarea></label></div>
   <div class="buttons"><button type="submit" class="button-ghost">${saved?'반응 수정하기':'반응 남기기'}</button>
   ${saved?`<button type="button" class="button-ghost" data-feedback-delete="${esc(record.id)}">반응 삭제</button>`:''}</div>
  </form>`;
 }
 if(!saved)return '';
 return `<aside class="record-feedback-view" aria-label="선생님이 남긴 반응"><strong>선생님의 한마디 ${emojis[saved.reaction]||''}</strong>${saved.text?`<p>${esc(saved.text)}</p>`:''}</aside>`;
}
export function installFeedbackActions(root,{isTherapist,api,refresh,toast,loading}){
 root.addEventListener('submit',event=>{
  const form=event.target.closest?.('form[data-record-feedback]');
  if(!form||!isTherapist())return;
  event.preventDefault();
  loading(form.querySelector('button[type=submit]'),async()=>{
   await api('practice-feedback',{method:'POST',body:{
    recordId:form.dataset.recordFeedback,reaction:form.elements.reaction.value||null,
    text:form.elements.text.value
   }});
   await refresh();toast('이 기록에 코멘트를 저장했어요.');
  });
 });
 root.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-feedback-delete]');
  if(!button||!isTherapist()||!confirm('이 코멘트를 삭제할까요?'))return;
  loading(button,async()=>{
   await api('practice-feedback-delete',{method:'POST',body:{recordId:button.dataset.feedbackDelete}});
   await refresh();toast('코멘트를 삭제했어요.');
  });
 });
}

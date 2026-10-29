// Daily check-in: optional once-per-day estimate, not a diagnosis or tic counter.
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const pad=n=>String(n).padStart(2,'0');
const dayKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=()=>dayKey(new Date());
const parse=raw=>{const x=new Date((raw||today())+'T12:00:00');return Number.isFinite(x.getTime())?x:new Date()};
const state={student:{day:today(),student:'all'},parent:{day:today(),student:'all'},therapist:{day:today(),student:'all'}};
const values=[['','선택 안 함'],['0','없었음'],['1','1번'],['2','2번'],['3','3번 이상']];
const categories=[
 ['waking','잠에서 깬 횟수','잠자다가 깬 것이 기억나는 경우'],
 ['movement','틱처럼 느낀 움직임·소리','정확한 틱 횟수나 진단이 아닌 스스로 느낀 경험'],
 ['worry','불안·걱정이 크게 느껴진 순간','작은 걱정을 모두 세지 않아도 괜찮아요']
];
const freqLabel=x=>x===null||x===undefined?'—':x===0?'0':x===3?'3+':String(x);
export function mountDailyCheckins(root,{role,checkins=[],students=[],onSave,onDelete}={}){
 if(!root||!state[role])return;
 const s=state[role],teacher=role==='therapist';
 const rows=checkins.filter(x=>!teacher||s.student==='all'||x.studentId===s.student);
 const selected=rows.filter(x=>x.day===s.day),own=teacher?null:selected[0]||null;
 const date=parse(s.day),y=date.getFullYear(),m=date.getMonth();
 const first=new Date(y,m,1,12),leading=(first.getDay()+6)%7,
  length=new Date(y,m+1,0,12).getDate(),size=Math.ceil((leading+length)/7)*7;
 const grid=Array.from({length:size},(_,i)=>{
  const d=new Date(y,m,1+i-leading,12),key=dayKey(d);
  const matches=rows.filter(x=>x.day===key),out=d.getMonth()!==m;
  return `<button type="button" class="daily-day${key===s.day?' selected':''}${out?' outside':''}" data-daily-date="${key}" aria-pressed="${key===s.day}" aria-label="${key}, ${matches.length?'체크 있음':'체크 없음'}"><span>${d.getDate()}</span>${matches.length?'<i aria-hidden="true"></i>':''}</button>`;
 }).join('');
 const monthRows=rows.filter(r=>r.day.startsWith(y+'-'+pad(m+1)+'-'));
 const countDays=new Set(monthRows.map(r=>r.day)).size;
 const options=x=>values.map(([value,label])=>`<option value="${value}"${x!==null&&x!==undefined&&String(x)===value?' selected':''}>${label}</option>`).join('');
 const fields=categories.map(([key,label,description])=>`<label class="daily-field"><span class="daily-field-label"><strong>${label}</strong><small>${description}</small></span><select name="${key}" aria-label="${label} 횟수">${options(own?.[key]??null)}</select></label>`).join('');
 const teacherRows=selected.map(x=>`<div class="daily-teacher-row"><b>${esc(students.find(v=>v.id===x.studentId)?.nickname||'담당 학생')} ${x.kind==='parent'?'· 보호자 체크':''}</b><div class="daily-count-pills">${categories.map(([key,name])=>`<span>${name.split('·')[0]} <strong>${freqLabel(x[key])}</strong></span>`).join('')}</div></div>`).join('');
 root.innerHTML=`<div class="editor-bar"><span class="ide-dots"><i></i><i></i><i></i></span><span>daily / check-in</span></div><div class="editor-paper daily-shell">
 <span class="tag">DAILY CHECK-IN</span><h2>${teacher?'학생 상태 체크 달력':'하루 상태 체크'}</h2>
 <p class="calendar-explain">${teacher?'학생·보호자가 선택해 공유한 체크만 표시해요. 빈 날은 증상이 없었다는 뜻이 아닙니다.':'한 번에 간단히 체크하고 끝내도 괜찮아. 매일 해야 하는 숙제가 아니고, 잘 기억나지 않으면 건너뛰어도 돼.'}</p>
 ${teacher?`<label class="calendar-student-picker">학생별 보기<select id="dailyStudent"><option value="all">전체 학생</option>${students.map(v=>`<option value="${esc(v.id)}"${v.id===s.student?' selected':''}>${esc(v.nickname)}</option>`).join('')}</select></label>`:''}
 <div class="writing-month-control"><button type="button" data-daily-prev aria-label="이전 달">‹</button><strong>${y}년 ${m+1}월</strong><button type="button" data-daily-next aria-label="다음 달">›</button><button type="button" data-daily-today>이번 달</button></div>
 <p class="daily-subtitle">이번 달 ${countDays}일 체크됨 · 횟수는 대략적인 자기보고예요.</p>
 <div class="calendar-weekdays">${['월','화','수','목','금','토','일'].map(x=>`<span>${x}</span>`).join('')}</div>
 <div class="daily-month-grid">${grid}</div>
 <section class="daily-selected" aria-label="선택한 날짜 체크">
 <h3>${esc(s.day)} ${teacher?'· 공유된 체크':'· 하루 체크'}</h3>
 ${teacher?(teacherRows||'<p class="calendar-empty">이 날짜에 공유된 체크가 없습니다.</p>'):
 `<form id="dailyForm">
  ${fields}
  <label class="daily-sharing"><input type="checkbox" name="share" ${own?.shared?'checked':''}/> <span>이 날짜의 체크만 선생님에게 공유하기</span></label>
  <p class="muted">선택 안 함은 ‘없었음(0번)’과 달라요. 기억나지 않는 항목은 비워 두세요.</p>
  <div class="buttons"><button type="submit" class="button">이 날짜 체크 ${own?'수정':'저장'}</button>${own?'<button type="button" class="button-ghost" id="dailyDelete">이 날짜 체크 삭제</button>':''}</div>
 </form>`}
 </section><p class="daily-ethics">상태 체크는 자신의 생활을 돌아보기 위한 선택형 메모예요. 의료적 진단이나 증상 횟수의 정확한 측정을 대신하지 않습니다. 자꾸 확인하고 싶어져 부담스럽다면 사용을 쉬어도 돼요.</p>
 </div>`;
 const draw=()=>mountDailyCheckins(root,{role,checkins,students,onSave,onDelete});
 root.querySelectorAll('[data-daily-date]').forEach(btn=>btn.onclick=()=>{s.day=btn.dataset.dailyDate;draw()});
 for(const [selector,step] of [['[data-daily-prev]',-1],['[data-daily-next]',1]])root.querySelector(selector).onclick=()=>{
  const d=parse(s.day),last=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+step);d.setDate(Math.min(last,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));s.day=dayKey(d);draw();
 };
 root.querySelector('[data-daily-today]').onclick=()=>{s.day=today();draw()};
 root.querySelector('#dailyStudent')?.addEventListener('change',e=>{s.student=e.target.value;draw()});
 const form=root.querySelector('#dailyForm');
 if(form)form.onsubmit=async event=>{
  event.preventDefault();const button=form.querySelector('button[type=submit]'),data={day:s.day,share:form.elements.share.checked};
  for(const [key] of categories){const raw=form.elements[key].value;data[key]=raw===''?null:Number(raw)}
  if([data.waking,data.movement,data.worry].every(x=>x===null)){root.querySelector('.daily-subtitle').textContent='한 항목 이상 골라 주세요. 모르겠으면 체크하지 않아도 돼요.';return}
  button.disabled=true;
  try{await onSave?.(data)}finally{if(button.isConnected)button.disabled=false}
 };
 root.querySelector('#dailyDelete')?.addEventListener('click',()=>{if(confirm('이 날짜 체크를 삭제할까요?'))onDelete?.(s.day)});
}

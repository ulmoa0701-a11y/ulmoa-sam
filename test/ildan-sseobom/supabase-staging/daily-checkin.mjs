// Guided, optional check-in. Count observable awakenings, use concrete anchored
// 3-step choices for lived difficulty. Never imply ratings are diagnostic scores.
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const pad=n=>String(n).padStart(2,'0');
const dayKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=()=>dayKey(new Date());
const parse=raw=>{const x=new Date((raw||today())+'T12:00:00');return Number.isFinite(x.getTime())?x:new Date()};
const state={student:{day:today(),student:'all'},parent:{day:today(),student:'all'},therapist:{day:today(),student:'all'}};
const questions=[
 {key:'sleepOnset',icon:'🌙',title:'잠들 때 어땠어?',sub:'선택한 날짜의 아침이 오기 전 잠자리에서',answers:['평소처럼 잤어','조금 뒤척였어','오래 뒤척여 힘들었어']},
 {key:'waking',icon:'💤',title:'자는 중에 몇 번 깼어?',sub:'잘 때 몇 번 깼는지 기억나는 만큼만',answers:['안 깼어','1번','2번','3번 이상'],unknown:4},
 {key:'repeating',icon:'🔁',title:'다시 하느라 하던 일이 늦어졌어?',sub:'예: 글씨를 다시 쓰거나 지나온 길로 돌아가기',answers:['늦어지지 않았어','잠깐 늦어졌어','오래 걸려 힘들었어']},
 {key:'worryImpact',icon:'💭',title:'걱정 때문에 하던 일을 멈췄어?',sub:'예: 공부를 시작하지 못하거나 하던 일을 멈추기',answers:['평소처럼 했어','잠깐 멈췄어','오래 멈춰 힘들었어']},
 {key:'ticBother',icon:'〰️',title:'저절로 나오는 움직임·소리가 불편했어?',sub:'정확한 틱 횟수는 셀 필요 없어. 오늘 생활이 불편했는지만 골라.',answers:['괜찮았어','조금 불편했어','많이 불편했어'],optional:true}
];
const validChoice=(q,x)=>Number.isInteger(x)&&x>=0&&x<q.answers.length||x===(q.unknown??3);
const readable=(q,value)=>{
 if(value===undefined||value===null)return '—';
 if(value===(q.unknown??3))return '잘 모르겠어';
 return q.answers[value]||'—';
};
const dailyState={student:false,parent:false};
export function mountDailyCheckins(root,{role,checkins=[],students=[],onSave,onDelete}={}){
 if(!root||!state[role])return;
 const s=state[role],teacher=role==='therapist';
 const rows=checkins.filter(x=>!teacher||s.student==='all'||x.studentId===s.student);
 const selected=rows.filter(x=>x.day===s.day),own=teacher?null:selected[0]||null;
 const date=parse(s.day),y=date.getFullYear(),m=date.getMonth();
 const offset=(new Date(y,m,1,12).getDay()+6)%7;
 const last=new Date(y,m+1,0,12).getDate(),size=Math.ceil((offset+last)/7)*7;
 const sleepNight=dayKey(new Date(y,m,date.getDate()-1,12));
 const grid=Array.from({length:size},(_,i)=>{
  const d=new Date(y,m,1+i-offset,12),key=dayKey(d);
  const matches=rows.filter(x=>x.day===key),out=d.getMonth()!==m;
  return `<button type="button" class="daily-day${key===s.day?' selected':''}${out?' outside':''}" data-daily-date="${key}" aria-pressed="${key===s.day}" aria-label="${key}, ${matches.length?'체크 있음':'체크 없음'}"><span>${d.getDate()}</span>${matches.length?'<i aria-hidden="true"></i>':''}</button>`;
 }).join('');
 const countDays=new Set(rows.filter(r=>r.day.startsWith(y+'-'+pad(m+1)+'-')).map(r=>r.day)).size;
 const card=q=>{
  const value=own?.[q.key];
  const choices=q.answers.map((label,index)=>`<button type="button" class="daily-choice${value===index?' selected':''}" aria-pressed="${value===index}" data-choice="${q.key}" data-choice-value="${index}">${label}</button>`).join('');
  const unknown=q.unknown??3;
  return `<div class="daily-tap-card" data-check-card="${q.key}">
    <div class="daily-tap-heading"><span class="daily-tap-icon" aria-hidden="true">${q.icon}</span><div><strong>${q.title}</strong>${q.sub?`<small>${q.sub}</small>`:''}</div></div>
    <input type="hidden" name="${q.key}" value="${validChoice(q,value)?value:''}">
    <div class="daily-choice-track" role="group" aria-label="${q.title}">${choices}</div>
    <button type="button" class="daily-unknown${value===unknown?' selected':''}" data-choice="${q.key}" data-choice-value="${unknown}" aria-pressed="${value===unknown}">잘 모르겠어</button>
   </div>`;
 };
 const teacherRows=selected.map(x=>`<div class="daily-teacher-row">
  <b>${esc(students.find(v=>v.id===x.studentId)?.nickname||'담당 학생')}${x.kind==='parent'?' · 보호자 체크':''}</b>
  <div class="daily-tally-grid">${questions.map(q=>`<div><span>${q.icon} ${q.title}</span><strong>${readable(q,x[q.key])}</strong></div>`).join('')}</div>
  ${(x.sleepOnset==null&&x.repeating==null&&x.worryImpact==null&&x.ticBother==null&&(x.movement!=null||x.worry!=null))?
   '<small class="muted">이전 버전에서 작성한 기록입니다. 오래된 숫자와 새로운 불편함 정도를 직접 비교하지 않습니다.</small>':''}
 </div>`).join('');
 const optionalShown=!!(teacher||dailyState[role]||own?.ticBother!==null&&own?.ticBother!==undefined);
 root.innerHTML=`<div class="editor-bar"><span class="ide-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>daily / check-in</span></div><div class="editor-paper daily-shell">
 <span class="tag">DAILY CHECK-IN</span><h2>${teacher?'공유된 하루 체크':'하루 체크 · 눌러서 끝!'}</h2>
 <p class="calendar-explain">${teacher?'공유하기를 선택한 기록만 보여요. 빈 날짜는 증상이 없었다는 뜻이 아닙니다.':'기억나는 것만 골라도 돼. 숫자를 계산하거나 계속 확인할 필요 없어.'}</p>
 ${teacher?`<label class="calendar-student-picker">학생별 보기<select id="dailyStudent"><option value="all">전체 학생</option>${students.map(v=>`<option value="${esc(v.id)}"${v.id===s.student?' selected':''}>${esc(v.nickname)}</option>`).join('')}</select></label>`:''}
 <div class="writing-month-control"><button type="button" data-daily-prev aria-label="이전 달">‹</button><strong>${y}년 ${m+1}월</strong><button type="button" data-daily-next aria-label="다음 달">›</button><button type="button" data-daily-today>이번 달</button></div>
 <p class="daily-subtitle">이번 달 ${countDays}일 체크됨 · 체크하지 않은 날도 괜찮아요.</p>
 <div class="calendar-weekdays">${['월','화','수','목','금','토','일'].map(x=>`<span>${x}</span>`).join('')}</div>
 <div class="daily-month-grid">${grid}</div>
 <section class="daily-selected" aria-label="선택한 날짜 체크">
 <h3>${esc(s.day)} ${teacher?'· 공유된 체크':'· 기억나는 만큼'}</h3>
 ${!teacher?`<p class="daily-sleep-night">🌙 수면 질문은 <b>${esc(sleepNight)} 밤 → ${esc(s.day)} 아침</b>에 관한 거야.</p>`:''}
 ${teacher?(teacherRows||'<p class="calendar-empty">이 날짜에 공유된 체크가 없습니다.</p>'):
 `<form id="dailyForm">
   <p class="daily-howto">⬅️ ➡️ 맞는 칸을 <b>한 번 눌러봐</b>. 움직여서 선택해도 돼. 고민되면 ‘잘 모르겠어’!</p>
   ${questions.filter(q=>!q.optional).map(card).join('')}
   <button type="button" class="daily-optional-toggle" id="dailyOptionalToggle" aria-expanded="${optionalShown}">${optionalShown?'− 선택 항목 접기':'＋ 몸의 움직임·소리도 체크할래? (선택)'}</button>
   <div id="dailyOptionalPanel" ${optionalShown?'':'hidden'}>${card(questions.find(q=>q.optional))}</div>
   <label class="daily-sharing"><input type="checkbox" name="share" ${own?.shared?'checked':''}/><span>체크한 내용 선생님에게 보여주기</span></label>
   <div class="buttons daily-submit"><button type="submit" class="button">저장하기 ✓</button>${own?'<button type="button" class="button-ghost" id="dailyDelete">이 날짜 체크 삭제</button>':''}</div>
   <p class="muted">모든 질문에 답할 필요 없어. 체크 결과가 마음에 안 들면 나중에 수정·삭제할 수 있어.</p>
  </form>`}
 </section><p class="daily-ethics">이건 생활을 돌아보는 메모야. 진단이나 정확한 증상 횟수 측정이 아니야. 체크가 부담스러우면 쉬어도 괜찮아.</p></div>`;
 const draw=()=>mountDailyCheckins(root,{role,checkins,students,onSave,onDelete});
 root.querySelectorAll('[data-daily-date]').forEach(btn=>btn.onclick=()=>{s.day=btn.dataset.dailyDate;draw()});
 for(const [selector,step] of [['[data-daily-prev]',-1],['[data-daily-next]',1]])root.querySelector(selector).onclick=()=>{
  const d=parse(s.day),n=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+step);
  d.setDate(Math.min(n,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));
  s.day=dayKey(d);draw();
 };
 root.querySelector('[data-daily-today]').onclick=()=>{s.day=today();draw()};
 root.querySelector('#dailyStudent')?.addEventListener('change',e=>{s.student=e.target.value;draw()});
 const form=root.querySelector('#dailyForm');
 if(form){
  const setChoice=(key,value)=>{
   const input=form.querySelector(`input[name="${key}"]`);if(!input)return;
   input.value=String(value);
   form.querySelectorAll(`[data-choice="${key}"]`).forEach(b=>{
    const selected=b.dataset.choiceValue===String(value);
    b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));
   });
  };
  form.querySelectorAll('[data-choice]').forEach(button=>button.addEventListener('click',()=>setChoice(button.dataset.choice,Number(button.dataset.choiceValue))));
  // Swipe controls have clickable button alternatives; no continuous clinical score.
  form.querySelectorAll('.daily-choice-track').forEach(track=>{
   let dragging=false;
   const choose=x=>{
    const key=track.closest('[data-check-card]')?.dataset.checkCard;
    const q=questions.find(q=>q.key===key);if(!q||q.answers.length!==3)return;
    const box=track.getBoundingClientRect(),fraction=Math.max(0,Math.min(.999,(x-box.left)/box.width));
    setChoice(key,Math.min(2,Math.floor(fraction*3)));
   };
   track.addEventListener('pointerdown',ev=>{if(!ev.isPrimary||ev.button!==0)return;dragging=true;track.setPointerCapture(ev.pointerId);choose(ev.clientX)});
   track.addEventListener('pointermove',ev=>{if(dragging)choose(ev.clientX)});
   const stop=()=>{dragging=false};track.addEventListener('pointerup',stop);track.addEventListener('pointercancel',stop);
  });
  const toggle=form.querySelector('#dailyOptionalToggle');
  toggle.onclick=()=>{
   dailyState[role]=toggle.getAttribute('aria-expanded')!=='true';
   toggle.setAttribute('aria-expanded',String(dailyState[role]));
   form.querySelector('#dailyOptionalPanel').hidden=!dailyState[role];
   toggle.textContent=dailyState[role]?'− 선택 항목 접기':'＋ 몸의 움직임·소리도 체크할래? (선택)';
  };
  form.onsubmit=async ev=>{
   ev.preventDefault();
   const button=form.querySelector('button[type=submit]');
   const data={day:s.day,share:form.elements.share.checked};
   for(const q of questions){
    const raw=form.elements[q.key].value;data[q.key]=raw===''?null:Number(raw);
   }
   if(questions.every(q=>data[q.key]===null)){
    root.querySelector('.daily-subtitle').textContent='기억나는 질문 하나만 골라도 돼. 부담스러우면 다음에 해도 괜찮아.';
    return;
   }
   button.disabled=true;
   try{await onSave?.(data)}finally{if(button.isConnected)button.disabled=false}
  };
 }
 root.querySelector('#dailyDelete')?.addEventListener('click',()=>{if(confirm('이 날짜 체크를 삭제할까요?'))onDelete?.(s.day)});
}

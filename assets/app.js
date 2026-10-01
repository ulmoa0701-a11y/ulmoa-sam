const $=(s,root=document)=>root.querySelector(s);const $$=(s,root=document)=>[...root.querySelectorAll(s)];

const search=$('#toolSearch');const cards=$$('.tool-card');const count=$('#resultCount');const empty=$('#emptyState');
function applySearch(raw=''){const q=raw.trim().toLowerCase();let visible=0;cards.forEach(card=>{const hay=(card.textContent+' '+(card.dataset.tags||'')).toLowerCase();const show=!q||hay.includes(q);card.hidden=!show;if(show)visible++});count.textContent=visible+'개';empty.hidden=visible!==0;document.querySelector('#try')?.scrollIntoView({behavior:'smooth',block:'start'})}
$('#mainSearch')?.addEventListener('submit',e=>{e.preventDefault();applySearch(search.value)});
$$('[data-search]').forEach(btn=>btn.addEventListener('click',()=>{search.value=btn.dataset.search;applySearch(btn.dataset.search)}));
search?.addEventListener('input',()=>{if(!search.value)applySearch('')});

const dialogs={makeup:$('#makeupDialog'),memo:$('#memoDialog')};
$$('.open-tool').forEach(btn=>btn.addEventListener('click',()=>dialogs[btn.dataset.tool]?.showModal()));
$$('.dialog-close').forEach(btn=>btn.addEventListener('click',()=>btn.closest('dialog')?.close()));
$$('dialog').forEach(d=>d.addEventListener('click',e=>{const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}));

const toast=$('#toast');let toastTimer;
function showToast(msg){toast.textContent=msg;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),1800)}


$('#compareTime')?.addEventListener('click',()=>{const p=$('#plannedAt').value;const a=$('#actualAt').value;const out=$('#compareResult');if(!p||!a){showToast('계획일시와 실제 제공일시를 모두 넣어주세요');return}const same=p===a;out.hidden=false;out.classList.toggle('changed',!same);if(same){out.innerHTML='<b>계획일시와 동일해요.</b><span>입력한 두 일시가 같습니다.</span>'}else{const pd=new Date(p),ad=new Date(a);const sameDay=pd.toDateString()===ad.toDateString();const detail=sameDay?'같은 날이지만 시간이 달라요.':'날짜가 달라요.';out.innerHTML='<b>보강·변경 회기 후보예요.</b><span>'+detail+' 울모아 기준에서는 계획일시와 실제 제공일시가 다르면 확인 대상입니다.</span>'}});

function value(id){return ($(id)?.value||'').trim()}
$('#makeMemo')?.addEventListener('click',()=>{const activity=value('#memoActivity'),response=value('#memoResponse'),support=value('#memoSupport');if(!activity&&!response&&!support){showToast('한 칸이라도 메모를 적어주세요');return}const lines=[];if(activity)lines.push('활동: '+activity);if(response)lines.push('반응: '+response);if(support)lines.push('지원/힌트: '+support);$('#memoText').textContent=lines.join('\n');$('#memoOutput').hidden=false});
$('#copyMemo')?.addEventListener('click',async()=>{const t=$('#memoText').textContent;try{await navigator.clipboard.writeText(t);showToast('메모를 복사했어요')}catch{showToast('복사가 안 되면 길게 눌러 복사해주세요')}});

applySearch('');
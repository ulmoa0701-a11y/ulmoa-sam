// Student-only opt-in device Web Push; no medical details, names, or raw notes in notifications.
const available=()=>window.isSecureContext&&'serviceWorker' in navigator
  &&'PushManager' in window&&'Notification' in window;
const decodeKey=k=>Uint8Array.from(atob(k.replace(/-/g,'+').replace(/_/g,'/')+
  '='.repeat((4-k.length%4)%4)),ch=>ch.charCodeAt(0));
const hash=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))]
  .map(x=>x.toString(16).padStart(2,'0')).join('');
const deviceLabel=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)?'내 아이폰':
  /Android/.test(navigator.userAgent)?'내 안드로이드':'내 컴퓨터';
let busy=false;
export async function setupStudentReminderPanel({api,toast}){
 const slot=document.getElementById('studentReminderPanel');
 if(!slot)return;
 slot.innerHTML=`<div class="editor-bar"><span class="ide-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>MY REMINDER</span><span class="editor-status">OPTIONAL</span></div>
 <div class="editor-paper">
  <span class="tag">🔔 / MY TIME</span><h2>내 알림 시간</h2>
  <p>기록하고 싶을 때 살짝 알려줄게. <b>매일 작성하지 않아도 괜찮아!</b> 알림은 언제든 끌 수 있어.</p>
  <div class="form"><label for="studentReminderTime">알림 받을 시간</label>
  <input id="studentReminderTime" type="time" min="08:00" max="22:00" step="60" value="19:00"/>
  <p class="muted">한국 시간 기준 · 오전 8시~밤 10시 · 하루 최대 한 번</p>
  <div class="buttons">
   <button id="studentReminderEnable" type="button" class="button">🔔 내 휴대폰에 알림 켜기</button>
   <button id="studentReminderSave" type="button" class="button-ghost">시간만 저장</button>
   <button id="studentReminderTest" type="button" class="button-ghost" hidden>지금 테스트 알림 보내기</button>
   <button id="studentReminderDisable" type="button" class="button-ghost" hidden>알림 끄기</button>
  </div><p id="studentReminderStatus" role="status" aria-live="polite" class="muted">알림 상태를 확인하고 있어.</p>
  <div class="reminder-inbox"><h3>🔔 알림함</h3>
    <p class="muted">최근 14번의 알림 발송 기록이야. 휴대폰에서 실제 수신했는지는 확인할 수 없어.</p>
    <div id="studentReminderHistory" aria-live="polite"><p>아직 알림이 없어.</p></div>
  </div>
  <details class="optional-fields"><summary>휴대폰에서 알림이 안 뜨면?</summary><div class="optional-wrap">
   <p>안드로이드에서는 크롬·삼성 인터넷에서 알림을 허용해 줘. 카카오톡 안에서 열었다면 기본 브라우저로 다시 열어 줘.</p>
   <p>아이폰에서는 사파리로 열고 <b>홈 화면에 추가</b>한 뒤, 추가한 일단써봄 아이콘으로 들어와서 알림을 켜야 해.</p>
   <p>휴대폰이 꺼져 있거나 절전 상태이거나 네트워크 연결이 불안정하면 알림이 늦거나 오지 않을 수 있어.</p>
  </div></details>
  <p class="muted">잠금화면에는 학생 이름, 기록 내용, 진단·상담 정보가 나타나지 않아. 개인 휴대폰에서만 알림을 설정해 줘.</p>
 </div></div>`;
 const status=slot.querySelector('#studentReminderStatus');
 const enable=slot.querySelector('#studentReminderEnable');
 const save=slot.querySelector('#studentReminderSave');
 const disable=slot.querySelector('#studentReminderDisable');
 const test=slot.querySelector('#studentReminderTest');
 const time=slot.querySelector('#studentReminderTime');
 const historyBox=slot.querySelector('#studentReminderHistory');
 let preference={enabled:false,time:'19:00',publicKey:null,subscriptions:[]};
 let reg=null,sub=null,linked=false;
 const validTime=()=>time.value>='08:00'&&time.value<='22:00'&&/^\d{2}:\d{2}$/.test(time.value);
 const refresh=async()=>{
  try{
   const r=await api('student-reminder-settings');
   preference=r;time.value=r.time||'19:00';
   const history=Array.isArray(r.history)?r.history:[];
   historyBox.replaceChildren();
   if(!history.length){
    const empty=document.createElement('p');empty.className='muted';empty.textContent='아직 알림이 없어.';historyBox.append(empty);
   }else for(const item of history){
    if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(item.day||''))continue;
    const row=document.createElement('p');row.className='reminder-history-entry';
    row.textContent=item.day+' · '+(item.providerAccepted?'기기로 발송 요청함':'전송이 확인되지 않음');
    historyBox.append(row);
   }
   if(!available()){
    enable.disabled=true;disable.hidden=!r.enabled;test.hidden=true;
    status.textContent='이 브라우저에서 휴대폰 알림을 쓸 수 없어. 크롬 또는 홈 화면에 추가한 앱에서 열어 줘.';
    return;
   }
   reg=await navigator.serviceWorker.getRegistration('./');
   sub=reg?await reg.pushManager.getSubscription():null;
   linked=false;
   if(sub)linked=(r.subscriptions||[]).some(x=>x.endpointHash===await hash(sub.endpoint));
   enable.hidden=linked&&r.enabled&&Notification.permission==='granted';
   disable.hidden=!r.enabled&&!linked;
   test.hidden=!linked||Notification.permission!=='granted';
   status.textContent=r.enabled&&linked&&Notification.permission==='granted'
    ?'🔔 이 기기에서 매일 '+r.time+'에 알림을 받도록 설정됐어. 실제 수신은 휴대폰 상태에 따라 달라질 수 있어.'
    :r.enabled&&!linked?'다른 기기에 알림이 설정되어 있거나, 이 기기 연결이 끊어졌어. 알림 켜기를 다시 눌러 줘.'
    :Notification.permission==='denied'?'알림이 차단되어 있어. 휴대폰 설정에서 브라우저 알림을 허용해 줘.'
    :'아직 이 기기의 알림이 꺼져 있어. 원하는 시간에 켤 수 있어.';
  }catch(e){status.textContent='알림 설정을 확인하지 못했어. '+(e?.message||'다시 시도해 줘.');}
 };
 async function run(button,job){if(busy)return;busy=true;button.disabled=true;
  try{await job();await refresh();}catch(e){status.textContent='설정 실패: '+(e?.message||'알림 설정을 확인해 줘.');}
  finally{busy=false;button.disabled=false;}
 }
 save.onclick=()=>run(save,async()=>{
  if(!validTime())throw Error('오전 8시부터 밤 10시 사이로 골라 줘.');
  await api('student-reminder-settings',{method:'POST',body:{enabled:!!preference.enabled,time:time.value}});
  toast('알림 시간을 저장했어.');
 });
 enable.onclick=()=>{
  if(busy)return;
  // This browser permission prompt occurs immediately in a real user click.
  const request=available()?Notification.requestPermission():Promise.resolve('unsupported');
  return run(enable,async()=>{
   if(!validTime())throw Error('오전 8시부터 밤 10시 사이로 골라 줘.');
   if(await request!=='granted')throw Error('휴대폰에서 알림을 허용해 줘.');
   await api('student-reminder-settings',{method:'POST',body:{enabled:false,time:time.value}});
   const settings=await api('student-reminder-settings');
   if(!settings.publicKey)throw Error('알림 서버가 준비되지 않았어.');
   reg=await navigator.serviceWorker.register('./push-sw.js',{scope:'./'});
   sub=await reg.pushManager.getSubscription();
   if(!sub)sub=await reg.pushManager.subscribe({
    userVisibleOnly:true,applicationServerKey:decodeKey(settings.publicKey)
   });
   await api('student-reminder-subscribe',{method:'POST',body:{subscription:sub.toJSON(),deviceLabel:deviceLabel()}});
   await api('student-reminder-settings',{method:'POST',body:{enabled:true,time:time.value}});
   toast('🔔 내 휴대폰에 알림을 켰어!');
  });
 };
 disable.onclick=()=>run(disable,async()=>{
  // Disabling server-side first prevents further scheduled sends even if browser unsubscribe fails.
  await api('student-reminder-settings',{method:'POST',body:{enabled:false,time:time.value||'19:00'}});
  const current=reg?await reg.pushManager.getSubscription():null;
  if(current&&linked){
   await api('student-reminder-unsubscribe',{method:'POST',body:{endpoint:current.endpoint}});
   await current.unsubscribe();
  }
  toast('알림을 껐어. 나중에 다시 켤 수 있어.');
 });
 test.onclick=()=>run(test,async()=>{
  const current=reg?await reg.pushManager.getSubscription():null;
  if(!current||!linked)throw Error('이 기기의 알림부터 켜 줘.');
  const r=await api('student-reminder-test',{method:'POST',body:{endpoint:current.endpoint}});
  if(r.providerAccepted)toast('테스트 알림을 보냈어. 휴대폰에 떴는지 확인해 줘.');
 });
 await refresh();
}

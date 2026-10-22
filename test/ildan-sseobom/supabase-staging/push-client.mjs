// Opt-in Web Push controls; do not request permission without a direct button click.
const supported=()=>window.isSecureContext&&'serviceWorker' in navigator
 && 'PushManager' in window&&'Notification' in window;
const decodeKey=key=>Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-key.length%4)%4)),c=>c.charCodeAt(0));
const label=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)?'iPhone 홈 화면':/Android/.test(navigator.userAgent)?'안드로이드':'PC 브라우저';
const endpointHash=async endpoint=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(endpoint)))).map(x=>x.toString(16).padStart(2,'0')).join('');
let active=false;
export async function setupPushPanel({api,toast}){
 const slot=document.getElementById('pushSettings');
 if(!slot)return;
 slot.innerHTML=`<section class="push-control"><h3>휴대폰 알림</h3>
  <p>학생·보호자가 <b>치료사에게 공유한 기록</b>만 알려드립니다. 휴대폰 알림에는 작성 내용이나 학생 이름이 나오지 않습니다.</p>
  <div id="pushStatus" role="status" aria-live="polite">알림 사용 가능 여부를 확인하고 있어요.</div>
  <div class="buttons">
    <button id="pushEnable" class="button" type="button">이 기기에서 알림 켜기</button>
    <button id="pushDisable" class="button-ghost" type="button" hidden>이 기기 알림 끄기</button>
    <button id="pushTest" class="button-ghost" type="button" hidden>테스트 알림 보내기</button>
  </div><p class="muted">안드로이드: 크롬에서 알림 허용. 아이폰: 사파리에서 홈 화면에 추가한 후 앱을 실행해 알림 허용. 알림을 꺼도 프로그램 내부 알림함은 남아요.</p></section>`;
 const status=document.getElementById('pushStatus'),enable=document.getElementById('pushEnable'),
  disable=document.getElementById('pushDisable'),test=document.getElementById('pushTest');
 let reg=null,sub=null,own=false;
 const refresh=async()=>{
  if(!slot.isConnected)return;
  if(!supported()){
   status.textContent='이 브라우저에서는 웹 푸시를 지원하지 않습니다. 아이폰은 홈 화면에 추가한 뒤 실행해야 합니다.';
   enable.disabled=true;return;
  }
  try{
   reg=await navigator.serviceWorker.getRegistration('./');
   sub=reg?await reg.pushManager.getSubscription():null;
   const backend=await api('push-status');
   if(sub){const hash=await endpointHash(sub.endpoint);own=(backend.subscriptions||[]).some(x=>x.endpointHash===hash);}
   if(sub&&!own){
    status.textContent='브라우저에 구독이 남아 있습니다. 알림 켜기를 눌러 서버에 다시 연결하세요.';
   }else if(sub&&own&&Notification.permission==='granted'){
    status.textContent='이 기기에서 알림을 받을 준비가 됐습니다. 푸시 제공자와 휴대폰 상태에 따라 전달이 지연될 수 있습니다.';
   }else if(Notification.permission==='denied'){
    status.textContent='알림이 차단되어 있어요. 브라우저 또는 휴대폰 설정에서 권한을 변경해야 합니다.';
   }else status.textContent='이 기기에서 알림이 꺼져 있어요.';
   enable.hidden=own&&Notification.permission==='granted';
   disable.hidden=!sub;test.hidden=!own;
  }catch(e){status.textContent='알림 상태를 확인하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.';}
 };
 enable.onclick=async()=>{
  if(active)return;active=true;enable.disabled=true;
  try{
   if(!supported())throw Error('이 기기에서는 푸시를 지원하지 않아요.');
   // Immediately after a real user gesture, not on page load.
   const permission=await Notification.requestPermission();
   if(permission!=='granted')throw Error('알림 권한이 허용되지 않았어요.');
   const config=await api('push-config');
   if(!config?.publicKey)throw Error('서버의 푸시 설정이 준비되지 않았어요.');
   reg=await navigator.serviceWorker.register('./push-sw.js',{scope:'./'});
   sub=await reg.pushManager.getSubscription();
   if(sub){const status=await api('push-status');const hash=await endpointHash(sub.endpoint);if(!(status.subscriptions||[]).some(x=>x.endpointHash===hash)){await sub.unsubscribe();sub=null;}}
   if(!sub)sub=await reg.pushManager.subscribe({
    userVisibleOnly:true,applicationServerKey:decodeKey(config.publicKey)
   });
   await api('push-subscribe',{method:'POST',body:{subscription:sub.toJSON(),deviceLabel:label()}});
   toast('이 기기에서 공유 기록 푸시 알림을 켰어요.');
  }catch(e){status.textContent='알림 연결 실패: '+e.message;}
  finally{active=false;enable.disabled=false;await refresh();}
 };
 disable.onclick=async()=>{
  if(active)return;active=true;disable.disabled=true;
  try{
   const existing=reg?await reg.pushManager.getSubscription():null;
   if(existing){
    await api('push-unsubscribe',{method:'POST',body:{endpoint:existing.endpoint}});
    await existing.unsubscribe();
   }
   toast('이 기기의 푸시 알림을 해제했어요.');
  }catch(e){status.textContent='알림 해제에 실패했습니다: '+e.message;}
  finally{disable.disabled=false;active=false;await refresh();}
 };
 test.onclick=async()=>{
  if(active)return;active=true;test.disabled=true;
  try{
   const current=reg?await reg.pushManager.getSubscription():null;
   if(!current||!own)throw Error('이 계정에 연결된 기기가 아닙니다.');
   await api('push-test',{method:'POST',body:{endpoint:current.endpoint}});
   toast('푸시 제공자에 테스트 메시지 전달을 요청했어요. 실제 기기 수신은 별도로 확인해야 합니다.');
  }catch(e){status.textContent='테스트 알림 실패: '+e.message;}
  finally{active=false;test.disabled=false;await refresh();}
 };
 await refresh();
}

/* 일단써봄 Web Push worker. No caching of auth, records, or encrypted files. */
self.addEventListener('push',event=>{
 let msg={};
 try{msg=event.data?.json()||{}}catch{}
 const body=msg.body==='공유 기록이 수정되었어요.'?'공유 기록이 수정되었어요.'
   :msg.body==='푸시 알림이 연결되었어요.'?'푸시 알림이 연결되었어요.'
   :'새로운 공유 기록이 도착했어요.';
 const scope=self.registration.scope;
 event.waitUntil(self.registration.showNotification('일단써봄',{
  body,icon:new URL('app-icon-192.png',scope).href,
  tag:body==='푸시 알림이 연결되었어요.'?'ildan-test':'ildan-shared',
  badge:new URL('app-icon-192.png',scope).href,
  renotify:false,data:{url:new URL('./?alerts=1',scope).href}
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  const url=new URL('./?alerts=1',self.registration.scope).href;
  const tabs=await clients.matchAll({type:'window',includeUncontrolled:true});
  const existing=tabs.find(c=>c.url.startsWith(self.registration.scope));
  if(existing){await existing.focus();existing.postMessage({kind:'ildan-open-alerts'});return;}
  await clients.openWindow(url);
 })());
});

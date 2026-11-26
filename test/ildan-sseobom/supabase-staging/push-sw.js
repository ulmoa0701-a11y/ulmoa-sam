/* 일단써봄 Web Push worker. NO caching auth tokens, records or private files. */
self.addEventListener('push',event=>{
 let msg={};
 try{msg=event.data?.json()||{};}catch{}
 const isStudent=msg.kind==='student-daily'||msg.kind==='student-test';
 const body=msg.kind==='student-daily'?'오늘도 일단 써볼까?':
  msg.kind==='student-test'?'알림 연결이 완료됐어요.':
  msg.body==='공유 기록이 수정되었어요.'?'공유 기록이 수정되었어요.':
  msg.body==='푸시 알림이 연결되었어요.'?'푸시 알림이 연결되었어요.':
  '새로운 공유 기록이 도착했어요.';
 const scope=self.registration.scope;
 event.waitUntil(self.registration.showNotification('일단써봄',{
  body,icon:new URL('app-icon-192.png',scope).href,
  badge:new URL('app-icon-192.png',scope).href,
  tag:isStudent?(msg.kind==='student-test'?'ildan-student-test':'ildan-student-daily'):
      (body==='푸시 알림이 연결되었어요.'?'ildan-test':'ildan-shared'),
  renotify:false,
  data:{type:isStudent?'student':'therapist'}
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  const kind=event.notification.data?.type==='student'?'student':'therapist';
  const url=new URL(kind==='student'?'./?reminder=1':'./?alerts=1',self.registration.scope).href;
  const tabs=await clients.matchAll({type:'window',includeUncontrolled:true});
  const existing=tabs.find(c=>c.url.startsWith(self.registration.scope));
  if(existing){
   await existing.focus();
   existing.postMessage({kind:kind==='student'?'ildan-open-writing':'ildan-open-alerts'});
   return;
  }
  await clients.openWindow(url);
 })());
});

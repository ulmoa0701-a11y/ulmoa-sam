// Private practice-only web push module. No minors' notes or identities in payload.
import {generateVapidKey,vapidPublicKey,send as pushSend} from 'jsr:@daaku/webpush@0.2.0';
const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function hash(input:string){const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input));return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function validEndpoint(raw:unknown){
 if(typeof raw!=='string'||raw.length<35||raw.length>2048)return false;
 try{const u=new URL(raw),h=u.hostname.toLowerCase();
  return u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&(
   h==='fcm.googleapis.com'||h==='updates.push.services.mozilla.com'||
   h==='push.services.mozilla.com'||h==='web.push.apple.com'||
   h.endsWith('.push.apple.com')||h.endsWith('.notify.windows.com')
  );
 }catch{return false}
}
function validSubscription(raw:any){
 if(!raw||!validEndpoint(raw.endpoint)||!raw.keys||
 !/^[A-Za-z0-9_-]{70,120}$/.test(String(raw.keys.p256dh||''))||
 !/^[A-Za-z0-9_-]{18,64}$/.test(String(raw.keys.auth||'')))return null;
 return {endpoint:String(raw.endpoint),keys:{p256dh:String(raw.keys.p256dh),auth:String(raw.keys.auth)}};
}
async function serverConfig(db:any,initialize=false){
 const read=await db.from('ildan_push_server_config').select('vapid_jwk,dispatch_token')
  .eq('singleton',true).maybeSingle();
 if(read.error)throw Error('PUSH_CONFIG_READ_FAILED');
 if(read.data||!initialize)return read.data;
 const created=await db.from('ildan_push_server_config').upsert({
  singleton:true,vapid_jwk:await generateVapidKey(),
  dispatch_token:[...crypto.getRandomValues(new Uint8Array(48))].map(v=>v.toString(16).padStart(2,'0')).join('')
 },{onConflict:'singleton',ignoreDuplicates:true});
 if(created.error)throw Error('PUSH_CONFIG_WRITE_FAILED');
 const fresh=await db.from('ildan_push_server_config').select('vapid_jwk,dispatch_token')
  .eq('singleton',true).single();
 if(fresh.error||!fresh.data)throw Error('PUSH_CONFIG_READ_FAILED');
 return fresh.data;
}
async function sendOne(config:any,sub:any,kind:string){
 await pushSend({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth_key}},
  JSON.stringify({title:'일단써봄',body:kind==='test'?'푸시 알림이 연결되었어요.':kind==='updated'?'공유 기록이 수정되었어요.':'새로운 공유 기록이 도착했어요.',
   tag:kind==='test'?'ildan-push-test':'ildan-shared-record',url:'./?alerts=1'}),
  {vapid:config.vapid_jwk,subscriber:'https://ulmoa.co.kr',ttl:3600,urgency:'normal'});
}
export async function pushCron(request:Request,db:any,send:(x:any,s?:number)=>Response){
 if(request.method!=='POST')return send({error:'POST 전용입니다.'},405);
 const config=await serverConfig(db);
 const received=request.headers.get('x-ildan-push-dispatch')||'';
 if(!config||!received||await hash(received)!==await hash(config.dispatch_token))return send({error:'권한이 없습니다.'},403);
 const now=new Date().toISOString();
 const {data:due,error}=await db.from('ildan_push_deliveries')
  .select('id,notification_id,subscription_id,attempts').is('provider_accepted_at',null)
  .lt('attempts',5).lte('next_attempt_at',now)
  .or('leased_until.is.null,leased_until.lt.'+now).order('next_attempt_at').limit(12);
 if(error)throw Error('PUSH_QUEUE_READ_FAILED');
 let accepted=0,retry=0;
 for(const job of due||[]){
  const {data:claimed}=await db.from('ildan_push_deliveries')
   .update({attempts:job.attempts+1,leased_until:new Date(Date.now()+120000).toISOString()})
   .eq('id',job.id).eq('attempts',job.attempts).is('provider_accepted_at',null)
   .lte('next_attempt_at',now).select('id').maybeSingle();
  if(!claimed)continue;
  const [e,s]=await Promise.all([
   db.from('ildan_share_notifications').select('id,record_id,therapist_id,student_id,event_type').eq('id',job.notification_id).maybeSingle(),
   db.from('ildan_push_subscriptions').select('id,therapist_id,endpoint,p256dh,auth_key').eq('id',job.subscription_id).maybeSingle()
  ]);
  const notice=e.data,sub=s.data;
  const current=notice?await db.from('ildan_practice_records').select('id').eq('id',notice.record_id)
   .eq('therapist_id',notice.therapist_id).eq('student_id',notice.student_id).not('shared_at','is',null).maybeSingle():null;
  const assigned=notice?await db.from('ildan_members').select('user_id').eq('user_id',notice.student_id)
   .eq('therapist_id',notice.therapist_id).eq('role','student').maybeSingle():null;
  if(!notice||!sub||notice.therapist_id!==sub.therapist_id||!current?.data||!assigned?.data){
   await db.from('ildan_push_deliveries').delete().eq('id',job.id);continue;
  }
  try{
   await sendOne(config,sub,notice.event_type);
   const {error:markErr}=await db.from('ildan_push_deliveries')
    .update({provider_accepted_at:new Date().toISOString(),leased_until:null,last_error:null}).eq('id',job.id);
   if(markErr)throw Error('PUSH_ACCEPT_MARK_FAILED');
   accepted++;
  }catch(err){
   retry++;
   if((err as any)?.permanent===true||[404,410].includes(Number((err as any)?.statusCode))){
    await db.from('ildan_push_subscriptions').delete().eq('id',sub.id).eq('therapist_id',sub.therapist_id);
   }else{
    const minutes=Math.min(30,2**Math.min(job.attempts+1,5));
    await db.from('ildan_push_deliveries').update({
     leased_until:null,next_attempt_at:new Date(Date.now()+60000*minutes).toISOString(),
     last_error:'PUSH_PROVIDER_FAILURE'
    }).eq('id',job.id);
   }
  }
 }
 return send({ok:true,providerAccepted:accepted,retryScheduled:retry});
}
export async function pushMember(name:string,request:Request,db:any,uid:string,role:string,
 send:(x:any,s?:number)=>Response,body:(r:Request)=>Promise<any>){
 if(role!=='therapist')return send({error:'치료사 전용입니다.'},403);
 if(name==='push-config'&&request.method==='GET'){
  const cfg=await serverConfig(db,true);
  return send({enabled:true,publicKey:await vapidPublicKey(cfg.vapid_jwk)});
 }
 if(name==='push-status'&&request.method==='GET'){
  const {data,error}=await db.from('ildan_push_subscriptions')
   .select('id,device_label,created_at,endpoint_hash').eq('therapist_id',uid).limit(10);
  if(error)throw Error('PUSH_STATUS_FAILED');
  return send({count:data?.length||0,subscriptions:(data||[]).map((d:any)=>({id:d.id,deviceLabel:d.device_label,createdAt:d.created_at,endpointHash:d.endpoint_hash}))});
 }
 if(name==='push-subscribe'&&request.method==='POST'){
  const input=await body(request),sub=validSubscription(input.subscription);
  if(!sub)return send({error:'지원되지 않는 푸시 구독입니다.'},400);
  const endpointHash=await hash(sub.endpoint);
  const {data:other,error:oe}=await db.from('ildan_push_subscriptions')
   .select('id,therapist_id').eq('endpoint_hash',endpointHash).maybeSingle();
  if(oe)throw Error('PUSH_OWNER_LOOKUP_FAILED');
  if(other&&other.therapist_id!==uid)return send({error:'다른 계정에 연결된 기기입니다.'},409);
  if(!other){
   const {count,error:ce}=await db.from('ildan_push_subscriptions')
    .select('id',{head:true,count:'exact'}).eq('therapist_id',uid);
   if(ce||Number(count)>=5)return send({error:'알림 기기는 최대 5대까지 연결 가능합니다.'},429);
  }
  const label=String(input.deviceLabel||'내 기기').replace(/[<>\x00-\x1f]/g,'').slice(0,28);
  const {error}=await db.from('ildan_push_subscriptions').upsert({
   therapist_id:uid,endpoint:sub.endpoint,endpoint_hash:endpointHash,
   p256dh:sub.keys.p256dh,auth_key:sub.keys.auth,device_label:label,
   updated_at:new Date().toISOString()
  },{onConflict:'endpoint_hash'});
  if(error)throw Error('PUSH_SUB_WRITE_FAILED');
  return send({ok:true});
 }
 if(name==='push-unsubscribe'&&request.method==='POST'){
  const input=await body(request);
  if(!validEndpoint(input.endpoint))return send({error:'구독 정보를 확인해 주세요.'},400);
  const {error}=await db.from('ildan_push_subscriptions').delete()
   .eq('therapist_id',uid).eq('endpoint_hash',await hash(input.endpoint));
  if(error)throw Error('PUSH_SUB_DELETE_FAILED');
  return send({ok:true});
 }
 if(name==='push-test'&&request.method==='POST'){
  const input=await body(request);
  if(!validEndpoint(input.endpoint))return send({error:'구독을 찾지 못했습니다.'},400);
  const {data:sub,error}=await db.from('ildan_push_subscriptions')
   .select('id,endpoint,p256dh,auth_key,last_test_at').eq('therapist_id',uid).eq('endpoint_hash',await hash(input.endpoint)).maybeSingle();
  if(error||!sub)return send({error:'이 기기의 구독을 확인할 수 없습니다.'},404);
  // Atomically limit test pushes to one message per device every 60 seconds.
  const older=new Date(Date.now()-60000).toISOString();
  const {data:claimed,error:cooldownError}=await db.from('ildan_push_subscriptions')
   .update({last_test_at:new Date().toISOString()}).eq('id',sub.id).eq('therapist_id',uid)
   .or('last_test_at.is.null,last_test_at.lt.'+older).select('id').maybeSingle();
  if(cooldownError)throw Error('PUSH_TEST_RATE_FAILED');
  if(!claimed)return send({error:'테스트 알림은 기기당 1분에 한 번만 보낼 수 있습니다.'},429);
  const cfg=await serverConfig(db);
  if(!cfg)return send({error:'푸시 서버 설정이 없습니다.'},503);
  try{await sendOne(cfg,sub,'test');}
  catch{return send({error:'푸시 서비스 전달에 실패했습니다. 알림 권한을 확인해 주세요.'},503);}
  return send({ok:true,providerAccepted:true,deviceArrivalUnverified:true});
 }
 return send({error:'지원하지 않는 알림 경로입니다.'},404);
}

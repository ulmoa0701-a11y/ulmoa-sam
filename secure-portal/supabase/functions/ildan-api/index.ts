// 일단써봄 — isolated Supabase Edge API migration (NOT a production-ready service).
// All user actions require Supabase Auth JWT except /health and CORS preflight.
// Supabase private service-role token NEVER leaves this server. RLS and explicit
// membership checks both matter: admin client BYPASSES RLS.
import {createClient} from 'npm:@supabase/supabase-js@2';
import {validateEntry,sharedSelection,validateSessionEntry} from './record-contract.mjs';

const encoder=new TextEncoder(),decoder=new TextDecoder();
const env=(s:string)=>Deno.env.get(s)||'';
const maxBody=28000;
type Obj=Record<string,unknown>;
const resp=(x:Obj,status=200,origin='')=>new Response(JSON.stringify(x),{
 status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}
});
const b64=(u:Uint8Array)=>btoa(String.fromCharCode(...u));
const unb64=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const hex=(u:Uint8Array)=>Array.from(u,c=>c.toString(16).padStart(2,'0')).join('');
async function digest(s:string){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(s))))}
let cachedKey:CryptoKey|null=null;
async function aesKey(){
 if(cachedKey)return cachedKey;
 const raw=env('RECORD_ENCRYPTION_KEY');if(!raw)throw Error('ENCRYPTION_KEY_MISSING');
 const bytes=unb64(raw);if(bytes.byteLength!==32)throw Error('ENCRYPTION_KEY_INVALID');
 cachedKey=await crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']);
 return cachedKey;
}
async function sealJSON(value:Obj){
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const data=encoder.encode(JSON.stringify(value));
 const buf=await crypto.subtle.encrypt({name:'AES-GCM',iv},await aesKey(),data);
 return {nonce:b64(iv),ciphertext:b64(new Uint8Array(buf))};
}
async function openJSON(nonce:string,ciphertext:string){
 if(!nonce||!ciphertext)throw Error('암호화된 내용을 확인할 수 없습니다.');
 const buf=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(nonce)},await aesKey(),unb64(ciphertext));
 return JSON.parse(decoder.decode(buf));
}
const requireText=(o:Obj,key:string)=>typeof o[key]==='string'?String(o[key]):'';
const roles=new Set(['student','parent','therapist']);
const endpoints=new Set(['me','records','share','unshare','session-notes','students','accounts','invites','claim-invite','invite-preview','invite-register','delete-record','revoke-invite','drive/status','health']);
const getRole=async(userDb:any,id:string)=>{
 const {data,error}=await userDb.from('ildan_members').select('user_id,role,therapist_id,student_id,display_alias').eq('user_id',id).maybeSingle();
 if(error)throw Error('ROLE_LOOKUP_FAILED');
 return data;
};
const getVerifiedAuth=async(request:Request)=>{
 const bearer=request.headers.get('authorization')||'';
 if(!/^Bearer [A-Za-z0-9._-]+$/.test(bearer))return null;
 const token=bearer.slice(7);
 const url=env('SUPABASE_URL'),pubkey=env('SUPABASE_ANON_KEY');
 if(!url||!pubkey)throw Error('AUTH_CONFIG_MISSING');
 const authClient=createClient(url,pubkey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await authClient.auth.getUser(token);
 if(error||!data?.user||!(data.user.email_confirmed_at||data.user.phone_confirmed_at))return null;
 const userDb=createClient(url,pubkey,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:bearer}}});
 return {user:data.user,userDb};
};
function adminDb(){
 const url=env('SUPABASE_URL'),secret=env('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!secret)throw Error('ADMIN_CONFIG_MISSING');
 return createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
}
const checkStudent=async(admin:any,studentId:string,therapistId:string)=>{
 const {data,error}=await admin.from('ildan_members').select('user_id').eq('user_id',studentId)
  .eq('role','student').eq('therapist_id',therapistId).maybeSingle();
 if(error)throw Error('STUDENT_LOOKUP_FAILED');return !!data;
};
async function body(request:Request){
 const raw=await request.text();if(raw.length>maxBody)throw Error('요청이 너무 깁니다.');
 const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))throw Error('잘못된 요청입니다.');
 return value;
}
export async function handle(request:Request):Promise<Response>{
 const origin=request.headers.get('origin')||'';
 const allowed=env('PUBLIC_SITE_ORIGIN')||'https://ulmoa0701-a11y.github.io'; // exact origin; staging only
 if(origin&&(!allowed||origin!==allowed))return resp({error:'허용되지 않은 출처입니다.'},403);
 const corsOrigin=origin&&allowed===origin?origin:'';
 const send=(payload:Obj,status=200)=>resp(payload,status,corsOrigin);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{
  ...(corsOrigin?{'Access-Control-Allow-Origin':corsOrigin,'Vary':'Origin'}:{}),
  'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Max-Age':'600'}});
 const p=new URL(request.url).pathname;
 const apiName=p.slice(p.indexOf('/ildan-api/')+11).replace(/^\/+|\/+$/g,'');
 if(!endpoints.has(apiName))return send({error:'경로를 찾을 수 없습니다.'},404);
 if(!['GET','POST'].includes(request.method))return send({error:'지원하지 않는 요청입니다.'},405);
 if(apiName==='health'&&request.method==='GET')return send({ready:!!(env('SUPABASE_URL')&&env('SUPABASE_ANON_KEY')&&env('SUPABASE_SERVICE_ROLE_KEY')&&env('RECORD_ENCRYPTION_KEY')),mode:'not-approved-for-clinical-use'});
 // Link previews do not consume invitation tokens. Useful in KakaoTalk in-app
 // browser and externally opened Chrome/Samsung Internet/Safari alike.
 // Hash fragments in invite URLs are never transmitted by the HTTP request.
 if(apiName==='invite-preview'&&request.method==='POST'){
  const b=await body(request),code=requireText(b,'code');
  if(!/^[0-9a-f]{64}$/.test(code))return send({error:'유효한 초대 링크가 아닙니다.'},400);
  const {data,error}=await adminDb().from('ildan_invites')
    .select('role,expires_at,verification_digest,target_user_id').eq('code_digest',await digest(code))
   .is('used_by',null).gt('expires_at',new Date().toISOString()).maybeSingle();
  if(error||!data)return send({error:'링크가 만료되었거나 이미 사용되었습니다.'},404);
  return send({role:data.role,expiresAt:data.expires_at,requiresDeviceSetup:false,registrationOpen:!!data.verification_digest,recovery:!!data.target_user_id,needsSeparateVerificationCode:true,
   notice:'링크를 열었다고 등록되지는 않습니다. 사용자의 확인 후 1회 등록합니다.'});
 }
 // Registration requires BOTH a 256-bit one-time link and an independent
 // 96-bit verification secret conveyed after an offline identity check.
 // Client confirmation is explicit; merely previewing a URL consumes nothing.
 if(apiName==='invite-register'&&request.method==='POST'){
  const b=await body(request),code=requireText(b,'code');
  const checkCode=requireText(b,'verificationCode').replace(/[-\s]/g,'').toLowerCase();
  if(!/^[0-9a-f]{64}$/.test(code)||!/^[0-9a-f]{24}$/.test(checkCode))
   return send({error:'초대 링크 또는 본인 확인 코드를 확인해 주세요.'},400);
  if(!env('SUPABASE_SERVICE_ROLE_KEY'))return send({error:'서버 설정 확인이 필요합니다.'},503);
  const admin=adminDb(),hash=await digest(code);
  const {data:invite,error:readError}=await admin.from('ildan_invites')
   .select('role,expires_at,target_user_id').eq('code_digest',hash)
   .eq('verification_digest',await digest(checkCode))
   .is('used_by',null).gt('expires_at',new Date().toISOString()).maybeSingle();
  if(readError||!invite)return send({error:'링크가 만료되었거나 본인 확인 코드가 맞지 않습니다.'},403);
  // Mint an internal, non-deliverable email identity. It is never an end-user
  // email address and the random password is NOT shown, stored, or reused.
  // Only verified passkeys will enable durable passwordless sign-in after signup.
  let uid='',email='',createdNew=false;
  if(invite.target_user_id){
   const {data:existing,error:existingError}=await admin.auth.admin.getUserById(invite.target_user_id);
   if(existingError||!existing?.user?.email)return send({error:'복구할 계정이 없습니다. 담당 치료사에게 문의해 주세요.'},404);
   uid=existing.user.id;email=existing.user.email;
  }else{
   const userId=crypto.randomUUID();
   email='member-'+userId+'@members.ildan.example';
   const password=hex(crypto.getRandomValues(new Uint8Array(32)));
   const {data:created,error:createError}=await admin.auth.admin.createUser({
    email,password,email_confirm:true,
    app_metadata:{enrollment:'clinic-invite',role:'unassigned'}
   });
   if(createError||!created?.user)return send({error:'계정 생성에 실패했습니다. 담당 치료사에게 문의해 주세요.'},503);
   uid=created.user.id;createdNew=true;
  }
  const {data:link,error:linkError}=await admin.auth.admin.generateLink({type:'magiclink',email});
  const tokenHash=link?.properties?.hashed_token;
  if(linkError||!tokenHash){
   if(createdNew)await admin.auth.admin.deleteUser(uid).catch(()=>{});
   return send({error:'기기 등록을 준비하지 못했습니다.'},503);
  }
  const {data:claimed,error:claimError}=await admin.rpc('ildan_claim_invite_for_user',{
   p_code_digest:hash,p_user_id:uid,p_verification_digest:await digest(checkCode)
  });
  if(claimError||claimed!==invite.role){
   await admin.auth.admin.deleteUser(uid).catch(()=>{});
   return send({error:'이미 사용된 링크이거나 등록이 허용되지 않았습니다.'},403);
  }
  return send({ok:true,role:claimed,tokenHash,otpType:'magiclink',
   mustRegisterPasskey:false,
   notice:'등록되었습니다. 이 기기의 브라우저에서 로그인 상태를 유지합니다. 기기를 바꾸면 치료사에게 다시 본인 확인을 요청해 주세요.'});
 }

 try{
  const auth=await getVerifiedAuth(request);
  if(!auth)return send({error:'인증된 로그인 세션이 필요합니다.'},401);
  const {user,userDb}=auth;const uid=user.id;
  const member=await getRole(userDb,uid);
  if(apiName==='claim-invite'&&request.method==='POST')
   return send({error:'과거 초대코드 등록 방식은 폐기되었습니다. 담당 치료사에게 새로운 링크를 요청해 주세요.'},410);
  if(!member||!roles.has(member.role))return send({error:'승인된 학생·보호자·치료사 계정이 아닙니다.'},403);
  const admin=adminDb();
  if(apiName==='me'&&request.method==='GET')return send({user:{id:uid,role:member.role,nickname:member.display_alias||member.role,therapistId:member.therapist_id,studentId:member.student_id}});
  if(apiName==='students'&&request.method==='GET'){
   if(member.role!=='therapist')return send({error:'치료사 전용입니다.'},403);
   const {data,error}=await userDb.from('ildan_members').select('user_id,display_alias').eq('therapist_id',uid).eq('role','student');
   if(error)throw Error('STUDENT_LIST_FAILED');
   return send({students:(data||[]).map((s:any)=>({id:s.user_id,nickname:s.display_alias||'학생'}))});
  }
  if(apiName==='accounts'&&request.method==='GET'){
   if(member.role!=='therapist')return send({error:'치료사 전용입니다.'},403);
   const {data,error}=await userDb.from('ildan_members').select('user_id,display_alias,role,student_id').eq('therapist_id',uid);
   if(error)throw Error('ACCOUNTS_FAILED');
   return send({accounts:(data||[]).map((x:any)=>({id:x.user_id,nickname:x.display_alias||x.role,role:x.role,studentId:x.student_id}))});
  }
  if(apiName==='invites'&&request.method==='GET'){
   if(member.role!=='therapist')return send({error:'치료사 전용입니다.'},403);
   const {data,error}=await admin.from('ildan_invites')
    .select('code_digest,role,student_id,target_user_id,created_at,expires_at,used_by')
    .eq('therapist_id',uid).order('created_at',{ascending:false}).limit(50);
   if(error)throw Error('INVITE_LIST_FAILED');
   return send({invites:(data||[]).map((x:any)=>({
    digest:x.code_digest,role:x.role,studentId:x.student_id,recovery:!!x.target_user_id,
    createdAt:x.created_at,expiresAt:x.expires_at,used:!!x.used_by,
    active:!x.used_by&&new Date(x.expires_at).getTime()>Date.now()
   }))});
  }
  if(apiName==='revoke-invite'&&request.method==='POST'){
   if(member.role!=='therapist')return send({error:'치료사 전용입니다.'},403);
   const b=await body(request),hash=requireText(b,'digest');
   if(!/^[0-9a-f]{64}$/.test(hash))return send({error:'초대 링크를 확인해 주세요.'},400);
   const now=new Date().toISOString();
   const {data,error}=await admin.from('ildan_invites').update({expires_at:now})
    .eq('code_digest',hash).eq('therapist_id',uid)
    .is('used_by',null).gt('expires_at',now).select('code_digest');
   if(error)throw Error('REVOKE_FAILED');
   if(!data?.length)return send({error:'이미 사용되거나 만료된 링크입니다.'},409);
   return send({ok:true,revoked:true});
  }
  if(apiName==='invites'&&request.method==='POST'){
   if(member.role!=='therapist')return send({error:'담당 치료사만 초대할 수 있습니다.'},403);
   const b=await body(request),role=requireText(b,'role');
   let studentId=requireText(b,'studentId')||null;
   const targetUserId=requireText(b,'targetUserId')||null;
   if(!['student','parent'].includes(role))return send({error:'초대할 사용자 구분이 올바르지 않습니다.'},400);
   if(targetUserId){
    if(!/^[0-9a-f-]{36}$/i.test(targetUserId))return send({error:'계정 번호를 확인해 주세요.'},400);
    const {data:target,error:targetError}=await admin.from('ildan_members')
     .select('user_id,role,student_id,therapist_id')
     .eq('user_id',targetUserId).eq('therapist_id',uid).eq('role',role).maybeSingle();
    if(targetError||!target)return send({error:'담당 계정만 복구할 수 있습니다.'},403);
    studentId=role==='parent'?target.student_id:null;
   }
   if(role==='parent'&&(!studentId||!(await checkStudent(admin,studentId,uid))))
    return send({error:'담당 학생을 선택해 주세요.'},403);
   if(role==='student'&&!targetUserId&&studentId)return send({error:'학생 초대 정보가 올바르지 않습니다.'},400);
   const token=hex(crypto.getRandomValues(new Uint8Array(32)));
   const verificationCode=hex(crypto.getRandomValues(new Uint8Array(12))).toUpperCase();
   const {error}=await admin.from('ildan_invites').insert({
    code_digest:await digest(token),verification_digest:await digest(verificationCode.toLowerCase()),
    role,therapist_id:uid,student_id:studentId,target_user_id:targetUserId,issued_by:uid,
    expires_at:new Date(Date.now()+48*60*60*1000).toISOString()
   });
   if(error)return send({error:'초대 생성에 실패했습니다.'},503);
   return send({invite:token,verificationCode,recovery:!!targetUserId,expiresInHours:48,
    notice:'확인 코드는 초대 링크와 같은 카카오톡 대화에 보내지 마세요. 치료사가 실제 신원을 확인하고 별도로 전달해야 합니다.'});
  }
  if(apiName==='records'&&request.method==='GET'){
   if(member.role==='therapist'){
    // Direct Data API RLS permits private ciphertext only to its author.
    // Re-verify student assignment before using the privileged service client,
    // and fetch ONLY shared ciphertext, never private ciphertext.
    const {data:assigned,error:assignmentError}=await admin.from('ildan_members')
      .select('user_id').eq('role','student').eq('therapist_id',uid);
    if(assignmentError)throw Error('ASSIGNMENT_LOOKUP_FAILED');
    const studentIds=(assigned||[]).map((x:any)=>x.user_id);
    if(!studentIds.length)return send({records:[]});
    const {data,error}=await admin.from('ildan_records')
      .select('id,author_id,student_id,kind,shared_nonce,shared_ciphertext,created_at')
      .eq('therapist_id',uid).in('student_id',studentIds)
      .not('shared_at','is',null).order('created_at',{ascending:false}).limit(200);
    if(error)throw Error('RECORD_LIST_FAILED');
    const records=await Promise.all((data||[]).map(async(r:any)=>({id:r.id,kind:r.kind,author:'공유 작성자',student:'담당 학생',studentId:r.student_id,createdAt:r.created_at,shared:true,entry:await openJSON(r.shared_nonce,r.shared_ciphertext)})));
    return send({records});
   }
   const {data,error}=await userDb.from('ildan_records').select('id,kind,private_nonce,private_ciphertext,shared_at,created_at').eq('author_id',uid).order('created_at',{ascending:false}).limit(200);
   if(error)throw Error('RECORD_LIST_FAILED');
   const records=await Promise.all((data||[]).map(async(r:any)=>({id:r.id,kind:r.kind,createdAt:r.created_at,shared:!!r.shared_at,author:member.display_alias||member.role,entry:await openJSON(r.private_nonce,r.private_ciphertext)})));
   return send({records});
  }
  // No clinical records may be collected until operator has audited consent,
  // email account ownership, retention/deletion and production security.
  // The default is fail closed; only explicit Edge secret enables writes.
  if(['records','session-notes','share'].includes(apiName)
      &&request.method==='POST'&&env('CLINICAL_WRITES_ENABLED')!=='true')
    return send({error:'개발 검증 중입니다. 실제 기록 저장·공유는 아직 활성화되지 않았습니다.'},503);
  if(apiName==='records'&&request.method==='POST'){
   if(!['student','parent'].includes(member.role))return send({error:'치료사는 학생·보호자 기록을 대신 작성할 수 없습니다.'},403);
   const b=await body(request),entry=validateEntry(b.entry) as Record<string,string>,share=b.share===true;
   if(member.role==='parent'&&(!entry.date||!entry.observation))return send({error:'관찰 날짜와 확인한 사실이 필요합니다.'},400);
   const studentId=member.role==='student'?uid:member.student_id;
   if(!studentId||!member.therapist_id||!(await checkStudent(admin,studentId,member.therapist_id)))return send({error:'담당 학생 연결을 확인할 수 없습니다.'},403);
   const priv=await sealJSON(entry);
   const chosen=share?sharedSelection(entry,b.sharedFields,member.role==='parent'):null;
   const shared=chosen?await sealJSON(chosen):null;
   const {data,error}=await admin.from('ildan_records').insert({
    author_id:uid,student_id:studentId,therapist_id:member.therapist_id,kind:member.role,
    private_nonce:priv.nonce,private_ciphertext:priv.ciphertext,
    shared_nonce:shared?.nonce||null,shared_ciphertext:shared?.ciphertext||null,
    shared_at:shared?new Date().toISOString():null
   }).select('id,created_at').single();
   if(error)throw Error('RECORD_SAVE_FAILED');
   return send({record:{id:data.id,createdAt:data.created_at,shared:!!shared}},201);
  }
  if(apiName==='share'&&request.method==='POST'){
   if(!['student','parent'].includes(member.role))return send({error:'작성자만 공유할 수 있습니다.'},403);
   const b=await body(request),id=requireText(b,'recordId');
   if(!/^[0-9a-f-]{36}$/i.test(id))return send({error:'기록 번호를 확인해 주세요.'},400);
   const {data:existing,error:readError}=await admin.from('ildan_records').select('id,kind,private_nonce,private_ciphertext,shared_at')
     .eq('id',id).eq('author_id',uid).maybeSingle();
   if(readError||!existing)return send({error:'내 기록만 공유할 수 있습니다.'},403);
   if(existing.shared_at)return send({error:'이미 공유한 기록입니다.'},409);
   if(existing.kind!==member.role)return send({error:'작성자 역할이 맞지 않습니다.'},403);
   const entry=await openJSON(existing.private_nonce,existing.private_ciphertext);
   const selected=sharedSelection(entry,b.sharedFields,member.role==='parent');
   const sealed=await sealJSON(selected);
   const {data,error}=await admin.from('ildan_records').update({
    shared_at:new Date().toISOString(),shared_nonce:sealed.nonce,shared_ciphertext:sealed.ciphertext
   }).eq('id',id).eq('author_id',uid).is('shared_at',null).select('id');
   if(error)throw Error('SHARE_FAILED');
   if(!data?.length)return send({error:'공유 상태가 변경됐습니다. 새로고침해 주세요.'},409);
   return send({ok:true,shared:true,driveSynced:false});
  }
  if(apiName==='unshare'&&request.method==='POST'){
   if(!['student','parent'].includes(member.role))return send({error:'작성자만 철회할 수 있습니다.'},403);
   const b=await body(request),id=requireText(b,'recordId');
   if(!/^[0-9a-f-]{36}$/i.test(id))return send({error:'기록 번호가 올바르지 않습니다.'},400);
   const {data,error}=await admin.from('ildan_records').update({shared_at:null,shared_nonce:null,shared_ciphertext:null})
      .eq('id',id).eq('author_id',uid).select('id');
   if(error)throw Error('UNSHARE_FAILED');
   if(!data?.length)return send({error:'내 기록을 찾을 수 없습니다.'},403);
   return send({ok:true,serverAccessRevoked:true,remoteCopyStatus:'not_synced',
    notice:'Supabase 이전 버전에는 Google Drive 백업이 비활성화되어 있습니다. 기존 외부 복사본은 별도 조치가 필요합니다.'});
  }
  if(apiName==='delete-record'&&request.method==='POST'){
   if(!['student','parent'].includes(member.role))return send({error:'작성자만 삭제할 수 있습니다.'},403);
   const b=await body(request),id=requireText(b,'recordId');
   if(!/^[0-9a-f-]{36}$/i.test(id))return send({error:'기록 번호를 확인해 주세요.'},400);
   const {data,error}=await admin.from('ildan_records').delete().eq('id',id).eq('author_id',uid).select('id');
   if(error)throw Error('DELETE_FAILED');
   return send({ok:!!data?.length});
  }
  if(apiName==='session-notes'&&member.role!=='therapist')return send({error:'치료사 전용 메모입니다.'},403);
  if(apiName==='session-notes'&&request.method==='GET'){
   const {data,error}=await userDb.from('ildan_session_notes').select('id,nonce,ciphertext,created_at,student_id').eq('therapist_id',uid).order('created_at',{ascending:false}).limit(150);
   if(error)throw Error('NOTE_LIST_FAILED');
   const notes=await Promise.all((data||[]).map(async(r:any)=>({id:r.id,studentNickname:'담당 학생',createdAt:r.created_at,entry:await openJSON(r.nonce,r.ciphertext)})));
   return send({notes});
  }
  if(apiName==='session-notes'&&request.method==='POST'){
   const b=await body(request),studentId=requireText(b,'studentId');
   if(!(await checkStudent(admin,studentId,uid)))return send({error:'담당 학생만 선택할 수 있습니다.'},403);
   const entry=validateSessionEntry(b.entry) as Record<string,string>,sealed=await sealJSON(entry);
   const {error}=await admin.from('ildan_session_notes').insert({therapist_id:uid,student_id:studentId,nonce:sealed.nonce,ciphertext:sealed.ciphertext});
   if(error)throw Error('NOTE_SAVE_FAILED');
   return send({ok:true},201);
  }
  if(apiName==='drive/status'&&request.method==='GET'){
   if(member.role!=='therapist')return send({error:'치료사 전용입니다.'},403);
   return send({connected:false,configured:false,backupEnabled:false,folderUrl:null});
  }
  return send({error:'기능이 아직 연결되지 않았습니다.'},404);
 }catch(e){
  // No stack traces, SQL statements or health records are exposed in error responses.
  const msg=(e instanceof Error?e.message:'');
  if(['ENCRYPTION_KEY_MISSING','ENCRYPTION_KEY_INVALID','ADMIN_CONFIG_MISSING','AUTH_CONFIG_MISSING'].includes(msg))
   return send({error:'서버 설정을 확인해 주세요.'},503);
  if(/기록|공유|관찰|메모|문자|날짜|시간|그림|입력|너무/.test(msg)&&!/_FAILED$/.test(msg))
   return send({error:'입력 항목을 확인해 주세요.'},400);
  console.error('Ildan API action failed',apiName,e instanceof Error?e.name:'error');
  return send({error:'서버에서 요청을 처리하지 못했습니다.'},500);
 }
}
Deno.serve(handle);

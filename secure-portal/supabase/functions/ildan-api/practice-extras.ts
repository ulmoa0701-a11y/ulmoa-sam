// Isolated, sandbox-only: therapist reactions and optional once-a-day self-report tallies.
// Nothing from private/unshared student notes is exposed to another role.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reactions=['heart','star','clap','cheer','smile'];
const today=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
function dayOK(raw:unknown):raw is string{
 if(typeof raw!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(raw)||raw>today()||raw<'2020-01-01')return false;
 const [y,m,d]=raw.split('-').map(Number),check=new Date(Date.UTC(y,m-1,d));
 return check.getUTCFullYear()===y&&check.getUTCMonth()===m-1&&check.getUTCDate()===d;
}
const frequency=(x:unknown)=>x===undefined||x===null?null:Number.isInteger(x)&&Number(x)>=0&&Number(x)<=3?x:NaN;
export async function practiceExtras(opts:{
 apiName:string;request:Request;admin:any;member:any;uid:string;
 send:(value:any,status?:number)=>Response;body:(request:Request)=>Promise<any>;
 seal:(v:Record<string,unknown>)=>Promise<{nonce:string,ciphertext:string}>;
 open:(nonce:string,ciphertext:string)=>Promise<Record<string,unknown>>;
 checkStudent:(admin:any,studentId:string,therapistId:string)=>Promise<boolean>;
}):Promise<Response>{
 const {apiName,request,admin,member,uid,send,body,seal,open,checkStudent}=opts;
 if(apiName==='practice-feedback'&&request.method==='GET'){
  let allowed:string[]=[];
  if(member.role==='therapist'){
   const {data:assigned,error:ae}=await admin.from('ildan_members')
    .select('user_id').eq('role','student').eq('therapist_id',uid);
   if(ae)throw Error('FEEDBACK_ASSIGNMENT_FAILED');
   const ids=(assigned||[]).map((x:any)=>x.user_id);
   if(ids.length){
    const {data,error}=await admin.from('ildan_practice_records').select('id')
     .eq('therapist_id',uid).in('student_id',ids).not('shared_at','is',null).limit(120);
    if(error)throw Error('FEEDBACK_VISIBLE_FAILED');allowed=(data||[]).map((x:any)=>x.id);
   }
  }else if(member.role==='student'||member.role==='parent'){
   const {data,error}=await admin.from('ildan_practice_records').select('id')
    .eq('author_id',uid).not('shared_at','is',null).limit(120);
   if(error)throw Error('FEEDBACK_VISIBLE_FAILED');allowed=(data||[]).map((x:any)=>x.id);
  }else return send({error:'계정 권한을 확인해 주세요.'},403);
  if(!allowed.length)return send({feedback:[]});
  const {data,error}=await admin.from('ildan_practice_feedback')
   .select('record_id,reaction,private_nonce,private_ciphertext,updated_at')
   .in('record_id',allowed);
  if(error)throw Error('FEEDBACK_LIST_FAILED');
  const rows=await Promise.all((data||[]).map(async(x:any)=>({
   recordId:x.record_id,reaction:x.reaction||null,
   text:x.private_nonce?String((await open(x.private_nonce,x.private_ciphertext)).text||''):'',
   updatedAt:x.updated_at
  })));
  return send({feedback:rows});
 }
 if((apiName==='practice-feedback'||apiName==='practice-feedback-delete')&&request.method==='POST'){
  if(member.role!=='therapist')return send({error:'담당 치료사 전용 기능입니다.'},403);
  const b=await body(request),id=String(b.recordId||'');
  if(!uuid.test(id))return send({error:'기록을 다시 선택해 주세요.'},400);
  const {data:record,error:re}=await admin.from('ildan_practice_records')
   .select('id,student_id').eq('id',id).eq('therapist_id',uid)
   .not('shared_at','is',null).maybeSingle();
  if(re||!record||!(await checkStudent(admin,record.student_id,uid)))
   return send({error:'현재 공유 중인 담당 학생 기록에만 코멘트할 수 있습니다.'},403);
  if(apiName==='practice-feedback-delete'){
   const {error}=await admin.from('ildan_practice_feedback').delete()
    .eq('record_id',id).eq('therapist_id',uid);
   if(error)throw Error('FEEDBACK_DELETE_FAILED');
   return send({ok:true,deleted:true});
  }
  const reaction=b.reaction===null||b.reaction===''?null:String(b.reaction||'');
  const text=typeof b.text==='string'?b.text.trim():'';
  if(reaction!==null&&!reactions.includes(reaction))return send({error:'허용된 이모티콘만 선택해 주세요.'},400);
  if([...text].length>320||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text))
   return send({error:'코멘트는 320자 이내로 작성해 주세요.'},400);
  if(!reaction&&!text)return send({error:'이모티콘 또는 코멘트를 입력해 주세요.'},400);
  const secret=text?await seal({text}):null;
  const {error}=await admin.from('ildan_practice_feedback').upsert({
   record_id:id,therapist_id:uid,reaction,
   private_nonce:secret?.nonce||null,private_ciphertext:secret?.ciphertext||null,
   updated_at:new Date().toISOString()
  },{onConflict:'record_id'});
  if(error)throw Error('FEEDBACK_SAVE_FAILED');
  return send({ok:true});
 }
 if(apiName==='practice-checkins'&&request.method==='GET'){
  if(member.role==='therapist'){
   const {data:assigned,error:ae}=await admin.from('ildan_members').select('user_id')
    .eq('therapist_id',uid).eq('role','student');
   if(ae)throw Error('CHECKIN_ASSIGNMENT_FAILED');
   const ids=(assigned||[]).map((x:any)=>x.user_id);
   if(!ids.length)return send({checkins:[]});
   const {data,error}=await admin.from('ildan_daily_checkins')
    .select('id,student_id,kind,day,waking_count,movement_count,worry_count,updated_at')
    .eq('therapist_id',uid).in('student_id',ids).not('shared_at','is',null)
    .order('day',{ascending:false}).limit(300);
   if(error)throw Error('CHECKIN_LIST_FAILED');
   return send({checkins:(data||[]).map((x:any)=>({
    id:x.id,studentId:x.student_id,kind:x.kind,day:x.day,
    waking:x.waking_count,movement:x.movement_count,worry:x.worry_count,
    shared:true,updatedAt:x.updated_at
   }))});
  }
  if(!['student','parent'].includes(member.role))return send({error:'접근할 수 없습니다.'},403);
  const {data,error}=await admin.from('ildan_daily_checkins')
   .select('id,day,waking_count,movement_count,worry_count,shared_at,updated_at')
   .eq('author_id',uid).order('day',{ascending:false}).limit(300);
  if(error)throw Error('CHECKIN_LIST_FAILED');
  return send({checkins:(data||[]).map((x:any)=>({
   id:x.id,day:x.day,waking:x.waking_count,movement:x.movement_count,
   worry:x.worry_count,shared:!!x.shared_at,updatedAt:x.updated_at
  }))});
 }
 if(apiName==='practice-checkins'&&request.method==='POST'){
  if(!['student','parent'].includes(member.role))return send({error:'작성자 전용입니다.'},403);
  const b=await body(request),day=b.day;
  if(!dayOK(day))return send({error:'오늘 또는 지나간 날짜를 선택해 주세요.'},400);
  const waking=frequency(b.waking),movement=frequency(b.movement),worry=frequency(b.worry);
  if([waking,movement,worry].some(x=>typeof x==='number'&&Number.isNaN(x))||
   [waking,movement,worry].every(x=>x===null))
   return send({error:'기억나는 항목 하나만 선택해도 됩니다.'},400);
  const studentId=member.role==='student'?uid:member.student_id;
  if(!studentId||!member.therapist_id||!(await checkStudent(admin,studentId,member.therapist_id)))
   return send({error:'담당 학생 연결을 확인할 수 없습니다.'},403);
  const {data:previous,error:pe}=await admin.from('ildan_daily_checkins')
   .select('shared_at').eq('author_id',uid).eq('day',day).maybeSingle();
  if(pe)throw Error('CHECKIN_PREVIOUS_FAILED');
  const share=b.share===true;
  const {error}=await admin.from('ildan_daily_checkins').upsert({
   author_id:uid,student_id:studentId,therapist_id:member.therapist_id,
   kind:member.role,day,waking_count:waking,movement_count:movement,worry_count:worry,
   shared_at:share?(previous?.shared_at||new Date().toISOString()):null,
   updated_at:new Date().toISOString()
  },{onConflict:'author_id,day'});
  if(error)throw Error('CHECKIN_SAVE_FAILED');
  return send({ok:true,shared:share,day});
 }
 if(apiName==='practice-checkin-delete'&&request.method==='POST'){
  if(!['student','parent'].includes(member.role))return send({error:'작성자 전용입니다.'},403);
  const b=await body(request);
  if(!dayOK(b.day))return send({error:'날짜를 확인해 주세요.'},400);
  const {error}=await admin.from('ildan_daily_checkins')
   .delete().eq('author_id',uid).eq('day',b.day);
  if(error)throw Error('CHECKIN_DELETE_FAILED');
  return send({ok:true,deleted:true});
 }
 return send({error:'지원하지 않는 기능입니다.'},405);
}

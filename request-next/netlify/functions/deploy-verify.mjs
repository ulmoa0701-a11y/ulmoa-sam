import {getDatabase} from '@netlify/database';
import {getStore} from '@netlify/blobs';
import {createNetlifyEnv} from '../adapter.mjs';
import worker from '../../src/worker.js';
import {randomUUID,randomBytes,createHash} from 'node:crypto';

/* Netlify event — actual production runtime, isolated to the SSO-protected site. */
const SITE='f9c910bc-97fe-482e-8b84-dc2ba8584907';
const PROBE='habom-system/persistence-test';
function ensure(v){if(!v)throw Error('Runtime integration did not pass');}
export default {
 async deploySucceeded(event){
  if(event?.site?.id!==SITE||event?.deploy?.context!=='production')return;
  let db=null,env=null,id='',key='',ipHash='',passed=false,persisted=false,stage='config';
  try {
   const adminKey=Netlify.env.get('HABOM_ADMIN_KEY')||'';
   const salt=Netlify.env.get('HABOM_RATE_SALT')||'';
   ensure(adminKey.length>=32&&salt.length>=32);
   db=getDatabase();
   const files=getStore({name:'habom-private-files',consistency:'strong'});
   env=createNetlifyEnv({database:db,files,adminKey,rateSalt:salt});
   const ip='habom-event-'+randomUUID();
   ipHash=createHash('sha256').update(salt+':'+ip).digest('hex');
   const call=(path,opts={})=>worker.fetch(new Request('https://event-test.invalid'+path,{...opts,headers:{'cf-connecting-ip':ip,...opts.headers}}),env);

   stage='persistent-storage';
   const previous=await files.get(PROBE,{type:'text',consistency:'strong'});
   persisted=!!previous?.startsWith('habom-check-');
   await files.set(PROBE,'habom-check-'+randomBytes(12).toString('hex'));
   ensure((await files.get(PROBE,{type:'text',consistency:'strong'}))?.startsWith('habom-check-'));

   stage='post-and-file';
   const marker='HABOM_EVENT_TEST_'+randomUUID();
   const form=new FormData();
   for(const [k,v] of Object.entries({visibility:'hidden',category:'질문',title:'자동 점검',body:marker,nickname:'가상',anonymous:'false',consent:'true'}))form.set(k,v);
   form.set('attachment',new File(['%PDF-1.4\n'],'test.pdf',{type:'application/pdf'}));
   let res=await call('/api/posts',{method:'POST',body:form});
   ensure(res.status===201);
   const created=await res.json();id=created.id;key=created.receipt;
   const rows=await db.sql.unsafe('SELECT attachment_key FROM posts WHERE id=$1',[id]);
   const fileKey=rows[0]?.attachment_key||'';
   ensure(fileKey.startsWith('private/'+id+'/'));

   stage='permissions';
   res=await call('/api/posts');ensure(res.status===200&&!(await res.text()).includes(marker));
   ensure((await call('/api/mine/'+id)).status===403);
   ensure((await call('/api/mine/'+id+'/file')).status===403);
   ensure((await call('/api/public/'+id+'/file')).status===404);
   res=await call('/api/mine/'+id+'/file',{headers:{'X-Receipt-Token':key}});
   ensure(res.status===200&&(await res.text())==='%PDF-1.4\n');

   stage='admin-reply';
   res=await call('/api/admin/posts/'+id,{method:'POST',headers:{Authorization:'Bearer '+adminKey,'Content-Type':'application/json'},body:JSON.stringify({status:'답변 완료',reply:'자동점검 답장',publicTitle:'비밀글입니다',metadataApproved:false,attachmentApproved:false})});
   ensure(res.status===200);
   res=await call('/api/mine/'+id,{headers:{'X-Receipt-Token':key}});
   ensure(res.status===200&&(await res.json()).post.reply==='자동점검 답장');
   passed=true;
  }catch(e){stage='failed-'+stage;}
  finally {
   try {
    if(env&&id){
     const row=await db.sql.unsafe('SELECT attachment_key FROM posts WHERE id=$1',[id]);
     if(row[0]?.attachment_key)await env.FILES.delete(row[0].attachment_key);
     await db.sql.unsafe('DELETE FROM posts WHERE id=$1',[id]);
     const after=await db.sql.unsafe('SELECT COUNT(*)::int AS n FROM posts WHERE id=$1',[id]);
     ensure(after[0]?.n===0);
    }
    if(db&&ipHash)await db.sql.unsafe('DELETE FROM rate_limits WHERE key=$1',[ipHash]);
   }catch(e){passed=false;stage='failed-cleanup';}
   if(db){
    try{
     const sql="INSERT INTO habom_runtime_checks (id,deploy_id,checked_at,result,stage,persisted_across_deploys) VALUES ('latest',$1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET deploy_id=excluded.deploy_id,checked_at=excluded.checked_at,result=excluded.result,stage=excluded.stage,persisted_across_deploys=excluded.persisted_across_deploys";
     await db.sql.unsafe(sql,[event.deploy.id,new Date().toISOString(),passed?'passed':'failed',passed?'complete':stage,persisted?1:0]);
    }catch(e){console.error('habom runtime check status persistence failed');}
   }
  }
 }
};

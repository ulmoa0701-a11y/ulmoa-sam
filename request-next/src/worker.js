/* 일단 해봄 이야기해봄 v2 — Cloudflare Worker + D1 + private R2
 * This is a separate staging implementation. Never publish without security QA.
 */
const KINDS = new Set(['자료 요청','정보 공유','질문','함께 만들기','사용 후기','기타']);
const MODES = new Set(['public','list','hidden']);
const MIME = {'application/pdf':'pdf','image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
const MAX_FILE = 4 * 1024 * 1024;
const MAX_BODY = 5 * 1024 * 1024;
const HEADERS = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
function reply(obj,status=200){return new Response(JSON.stringify(obj),{status,headers:HEADERS});}
function txt(x,n){return typeof x==='string'?x.trim().slice(0,n):'';}
function validLink(x){if(!x)return true;try{const u=new URL(x);return ['https:','http:'].includes(u.protocol)&&!!u.hostname;}catch{return false;}}
function isSensitive(s){return /[\w.+%-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?82[-.\s]?)?0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}|\b\d{6}[-\s]?[1-4]\d{6}\b|https?:\/\//i.test(s);}
function mask(n){if(n==='익명')return n;return n?Array.from(n)[0]+'**':'익명';}
function bytesHex(b){return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function hash(x){return bytesHex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(x)));}
function key(){return [...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function same(a,b){if(!a||!b)return false;const [x,y]=await Promise.all([hash(a),hash(b)]);let mismatch=0;for(let i=0;i<x.length;i++)mismatch|=x.charCodeAt(i)^y.charCodeAt(i);return mismatch===0;}
async function admin(req,env){const h=req.headers.get('authorization')||'';if(!env.ADMIN_KEY||env.ADMIN_KEY.length<32)return false;return same(h.startsWith('Bearer ')?h.slice(7):'',env.ADMIN_KEY);}
async function author(req,row){const token=req.headers.get('x-receipt-token')||'';if(token.length!==64||!row.access_hash)return false;const digest=await hash(token);let mismatch=0;for(let i=0;i<digest.length;i++)mismatch|=digest.charCodeAt(i)^row.access_hash.charCodeAt(i);return mismatch===0;}
function extractId(url){const a=url.pathname.split('/').filter(Boolean);return a[2]||'';}
function publicPost(row){return {id:row.id,category:row.category,title:row.title,body:row.body,link:row.link,displayName:row.display_name,role:row.role,createdAt:row.created_at,reply:row.reply,repliedAt:row.replied_at,hasAttachment:!!row.attachment_key&&row.attachment_approved===1};}
function personalPost(row){return {id:row.id,visibility:row.visibility,category:row.category,title:row.title,body:row.body,link:row.link,displayName:row.display_name,role:row.role,email:row.email,phone:row.phone,createdAt:row.created_at,reply:row.reply,repliedAt:row.replied_at,status:row.status,hasAttachment:!!row.attachment_key,attachmentName:row.attachment_name};}
function failNoStore(){return reply({error:'접근할 수 없습니다.'},403);}
async function fileType(file){
 const data=new Uint8Array(await file.slice(0,12).arrayBuffer());
 if(file.type==='application/pdf'&&[37,80,68,70,45].every((n,i)=>data[i]===n))return 'application/pdf';
 if(file.type==='image/png'&&[137,80,78,71,13,10,26,10].every((n,i)=>data[i]===n))return 'image/png';
 if(file.type==='image/jpeg'&&data[0]===255&&data[1]===216&&data[2]===255)return 'image/jpeg';
 if(file.type==='image/webp'&&String.fromCharCode(...data.slice(0,4))==='RIFF'&&String.fromCharCode(...data.slice(8,12))==='WEBP')return 'image/webp';
 return null;
}
async function rateLimit(env,req){
 const ip=req.headers.get('cf-connecting-ip')||'unattributed';
 const salt=env.RATE_SALT||'';
 if(salt.length<32)throw Error('RATE_SALT must be configured');
 const k=await hash(salt+':'+ip);
 const now=Date.now();
 const recent=await env.DB.prepare('SELECT COUNT(*) AS n FROM rate_limits WHERE key=? AND created_at>?').bind(k,now-10*60*1000).first();
 return {blocked:(recent?.n||0)>=3,k,now};
}
async function storePost(req,env){
 if(Number(req.headers.get('content-length')||0)>MAX_BODY)return reply({error:'첨부파일 용량이 너무 큽니다.'},413);
 const type=req.headers.get('content-type')||'';
 if(!type.includes('multipart/form-data'))return reply({error:'잘못된 전송 형식입니다.'},415);
 let f;try{f=await req.formData();}catch{return reply({error:'입력 내용을 읽을 수 없습니다.'},400);}
 if(txt(f.get('website'),200))return reply({ok:true},202);
 const mode=txt(f.get('visibility'),12),cat=txt(f.get('category'),20);
 const title=txt(f.get('title'),80),body=txt(f.get('body'),2000),link=txt(f.get('link'),500);
 const anon=f.get('anonymous')==='true';
 const nickname=anon?'익명':txt(f.get('nickname'),24);
 const role=txt(f.get('role'),40);
 const email=mode==='public'?'':txt(f.get('email'),150);
 const phone=mode==='public'?'':txt(f.get('phone'),40);
 const consent=f.get('consent')==='true';
 if(!MODES.has(mode)||!KINDS.has(cat)||!body||!nickname)return reply({error:'필수 항목을 확인해 주세요.'},400);
 if(!validLink(link))return reply({error:'http 또는 https 링크만 사용할 수 있어요.'},400);
 if(mode==='public'&&isSensitive([title,body,nickname].join(' ')))return reply({error:'공개글에는 연락처·개인정보를 포함하지 말아 주세요.'},400);
 if((email||phone)&&!consent)return reply({error:'연락처 수집 동의가 필요합니다.'},400);
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return reply({error:'이메일을 확인해 주세요.'},400);
 const upload=f.get('attachment');
 let mime='',fileName='',fileKey=null;
 if(upload instanceof File&&upload.size){
   if(upload.size>MAX_FILE)return reply({error:'첨부파일은 4MB 이하여야 해요.'},413);
   mime=await fileType(upload);
   if(!mime||!MIME[mime])return reply({error:'PDF·PNG·JPG·WEBP 파일만 첨부할 수 있어요.'},415);
   fileName=txt(upload.name,90).replace(/[\r\n\\/<>:"|?*\x00-\x1f]/g,'_')||'file.'+MIME[mime];
 }
 const lim=await rateLimit(env,req);
 if(lim.blocked)return reply({error:'잠시 후 다시 작성해 주세요.'},429);
 const id=crypto.randomUUID(),secret=key(),created=new Date().toISOString();
 if(mime){
   fileKey='private/'+id+'/'+crypto.randomUUID();
   await env.FILES.put(fileKey,upload.stream(),{httpMetadata:{contentType:'application/octet-stream'}});
 }
 try{
 await env.DB.prepare('INSERT INTO posts (id,visibility,category,title,body,link,display_name,role,email,phone,consent_at,access_hash,created_at,attachment_key,attachment_name,attachment_type) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
 .bind(id,mode,cat,title,body,link,nickname,role,email,phone,consent?created:null,await hash(secret),created,fileKey,fileName,mime).run();
 await env.DB.prepare('INSERT INTO rate_limits (key,created_at) VALUES (?,?)').bind(lim.k,lim.now).run();
 }catch(e){if(fileKey)await env.FILES.delete(fileKey);throw e;}
 return reply({ok:true,id,receipt:secret,createdAt:created},201);
}
async function readPosts(env){
 const pub=await env.DB.prepare("SELECT id,category,title,body,link,display_name,role,created_at,reply,replied_at,attachment_key,attachment_approved FROM posts WHERE visibility='public' ORDER BY created_at DESC LIMIT 40").all();
 const locks=await env.DB.prepare("SELECT id,category,public_title,display_name,created_at,status,attachment_key,reply FROM posts WHERE visibility='list' AND metadata_approved=1 ORDER BY created_at DESC LIMIT 40").all();
 return reply({posts:pub.results.map(publicPost),locked:locks.results.map(r=>({id:r.id,category:r.category,title:r.public_title,maskedName:mask(r.display_name),date:r.created_at.slice(0,10),status:r.status,hasAttachment:!!r.attachment_key,hasReply:!!r.reply}))});
}
async function readMine(req,env,id,isFile=false){
 const row=await env.DB.prepare('SELECT * FROM posts WHERE id=?').bind(id).first();
 if(!row||!(await author(req,row)))return failNoStore();
 if(isFile)return downloadFile(env,row);
 return reply({post:personalPost(row)});
}
async function downloadFile(env,row){
 if(!row.attachment_key)return reply({error:'첨부파일이 없습니다.'},404);
 const object=await env.FILES.get(row.attachment_key);
 if(!object)return reply({error:'파일을 찾을 수 없습니다.'},404);
 const name=encodeURIComponent(row.attachment_name||'attachment');
 return new Response(object.body,{headers:{'Content-Type':'application/octet-stream','Content-Disposition':"attachment; filename*=UTF-8''"+name,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
}
async function adminAction(req,env,url){
 if(!(await admin(req,env)))return failNoStore();
 if(req.method==='GET'&&url.pathname==='/api/admin/posts'){
  const data=await env.DB.prepare('SELECT * FROM posts ORDER BY created_at DESC LIMIT 100').all();
  return reply({posts:data.results.map(x=>({...personalPost(x),metadataApproved:!!x.metadata_approved,attachmentApproved:!!x.attachment_approved,publicTitle:x.public_title}))});
 }
 if(req.method==='POST'&&/^\/api\/admin\/posts\/[a-f0-9-]+$/.test(url.pathname)){
   const id=url.pathname.split('/').pop();
   const row=await env.DB.prepare('SELECT id,visibility FROM posts WHERE id=?').bind(id).first();
   if(!row)return reply({error:'글을 찾지 못했습니다.'},404);
   let body;try{body=await req.json();}catch{return reply({error:'잘못된 형식입니다.'},400);}
   const status=txt(body.status,20),replyText=txt(body.reply,1200),title=txt(body.publicTitle,70)||'비밀글입니다';
   const approved=row.visibility==='list'&&body.metadataApproved===true?1:0;
   if(!['접수','확인 중','답변 완료'].includes(status))return reply({error:'상태를 확인해 주세요.'},400);
   if(isSensitive(title))return reply({error:'공개용 제목에 개인정보를 포함할 수 없습니다.'},400);
   await env.DB.prepare('UPDATE posts SET status=?,reply=?,replied_at=?,metadata_approved=?,public_title=?,attachment_approved=? WHERE id=?')
     .bind(status,replyText,replyText?new Date().toISOString():null,approved,title,body.attachmentApproved===true?1:0,id).run();
   return reply({ok:true});
 }
 if(req.method==='GET'&&/^\/api\/admin\/posts\/[a-f0-9-]+\/file$/.test(url.pathname)){
  const id=url.pathname.split('/')[4];
  const row=await env.DB.prepare('SELECT * FROM posts WHERE id=?').bind(id).first();
  return row?downloadFile(env,row):reply({error:'없습니다.'},404);
 }
 return reply({error:'경로가 없습니다.'},404);
}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  try{
   if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
   if(request.method==='GET'&&url.pathname==='/api/posts')return readPosts(env);
   if(request.method==='POST'&&url.pathname==='/api/posts')return storePost(request,env);
   if(/^\/api\/public\/[a-f0-9-]+\/file$/.test(url.pathname)&&request.method==='GET'){
    const id=url.pathname.split('/')[3];
    const row=await env.DB.prepare("SELECT attachment_key,attachment_name,attachment_approved,visibility FROM posts WHERE id=?").bind(id).first();
    if(!row||row.visibility!=='public'||row.attachment_approved!==1)return reply({error:'공개할 수 없는 파일입니다.'},404);
    return downloadFile(env,row);
   }
   if(/^\/api\/mine\/[a-f0-9-]+(?:\/file)?$/.test(url.pathname)&&request.method==='GET'){
    const id=extractId(url),isFile=url.pathname.endsWith('/file');
    return readMine(request,env,id,isFile);
   }
   if(url.pathname.startsWith('/api/admin/'))return adminAction(request,env,url);
   return reply({error:'경로가 없습니다.'},404);
  }catch(e){console.error('habom-api',e?.message||'unknown');return reply({error:'서버 오류가 발생했습니다.'},500);}
 }
};
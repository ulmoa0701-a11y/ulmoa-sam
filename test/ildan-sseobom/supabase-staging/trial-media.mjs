// Trial-only media attachments. This module makes NO remote storage or record API calls.
// On-device practice contents are explicitly not suitable for identifiable child photos.
const LIMIT=4, DB='ildan-media-practice-v1';
let photos=[];
export function mediaWidget(){
 return `<section class="media-practice-panel" aria-label="사진 및 그림 추가">
 <div class="media-practice-heading"><strong>사진·그림 추가하기</strong><small>선택 · 글 없이도 가능</small></div>
 <p>직접 그리거나 사진 파일을 골라 넣을 수 있어. 사진과 그림을 함께 남겨도 돼.</p>
 <div class="media-practice-buttons">
  <button type="button" id="choosePhotos" class="button-ghost">▧ 사진 추가</button>
  <button type="button" id="capturePhoto" class="button-ghost">▣ 사진 촬영</button>
  <button type="button" id="showDrawing" class="button-ghost" aria-expanded="false">✎ 그림 그리기</button>
 </div>
 <input id="photoUpload" type="file" accept="image/*" multiple hidden aria-label="갤러리 또는 사진 파일에서 선택">
 <input id="photoCapture" type="file" accept="image/*" capture="environment" hidden aria-label="휴대폰으로 사진 촬영">
 <p id="photoProgress" role="status" aria-live="polite" class="muted">최대 4장 · 한 장당 12MB 이하 · JPG/PNG/WEBP 및 지원되는 HEIC</p>
 <div id="photoThumbnails" class="photo-thumbnails" aria-label="선택한 사진"></div>
 <div id="drawPanel" hidden>
  <div class="sketch-board"><canvas id="noteCanvas" width="760" height="380" aria-label="손가락 또는 마우스로 그리는 그림"></canvas></div>
  <div class="sketch-actions"><span>손가락이나 마우스로 그려 봐.</span>
   <button type="button" id="undoStroke" class="button-ghost">↶ 되돌리기</button>
   <button type="button" id="clearSketch" class="button-ghost">전부 지우기</button></div>
 </div>
 <p class="muted media-local-notice">사진과 그림을 연습용 서버에 저장하고, 원하면 담당 치료사에게 공유할 수 있어. 실제 아동 사진이나 상담정보는 아직 넣지 말아 줘.</p>
 </section>`;
}
export function getPracticePhotos(){return [...photos];}
export function setPracticePhotos(existing=[]){
 // The server provides only authenticated, short-lived signed URLs for old photos.
 const safe=existing.filter(src=>typeof src==='string'&&(
  /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(src)||
  /^https:\/\/miohovwmhmtcvkurjamm\.supabase\.co\/storage\/v1\/object\/sign\/ildan-practice-media\/[0-9a-f-]+\/[0-9a-f-]+\.jpg\?token=[A-Za-z0-9._%-]+(?:&[^"'<>]*)?$/.test(src)
 )).slice(0,LIMIT);
 photos=[...safe];preview();setStatus();
}

function preview(){
 const box=document.getElementById('photoThumbnails');if(!box)return;
 box.innerHTML=photos.map((src,i)=>`<figure class="photo-thumbnail">
  <img src="${src.replaceAll('&','&amp;').replaceAll('"','&quot;')}" alt="첨부한 사진 ${i+1}">
  <button type="button" data-remove-photo="${i}" aria-label="사진 ${i+1} 제거">× 제거</button>
 </figure>`).join('');
 for(const b of box.querySelectorAll('[data-remove-photo]')){
  b.onclick=()=>{photos.splice(Number(b.dataset.removePhoto),1);preview();setStatus();};
 }
}
function setStatus(message){
 const p=document.getElementById('photoProgress');if(p)p.textContent=message||`사진 ${photos.length}장 선택했어. 원하는 사진만 남길 수 있어.`;
}
async function convertPhoto(file){
 const allowed=/^image\/(jpeg|png|webp|heic|heif)$/i;
 if(!allowed.test(file.type)||file.size>12*1024*1024)throw Error('JPG·PNG·WEBP·지원되는 HEIC 파일만, 사진당 12MB 이하로 넣을 수 있어.');
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();img.src=url;
  await img.decode();
  if(!img.naturalWidth||!img.naturalHeight)throw Error('사진이 손상됐거나 이 브라우저에서 열 수 없는 형식이야.');
  let w=img.naturalWidth,h=img.naturalHeight,scale=Math.min(1,1440/Math.max(w,h));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
  const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('사진을 읽을 수 없어.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(img,0,0,canvas.width,canvas.height);
  // Canvas encoding strips source EXIF/GPS metadata and uses JPEG.
  let data=canvas.toDataURL('image/jpeg',.75);
  if(data.length>1700000)data=canvas.toDataURL('image/jpeg',.53);
  if(data.length>1700000){
   const smaller=document.createElement('canvas'),s=Math.min(1,960/Math.max(canvas.width,canvas.height));
   smaller.width=Math.max(1,Math.round(canvas.width*s));smaller.height=Math.max(1,Math.round(canvas.height*s));
   smaller.getContext('2d').drawImage(canvas,0,0,smaller.width,smaller.height);
   data=smaller.toDataURL('image/jpeg',.6);
  }
  if(!/^data:image\/jpeg;base64,/.test(data)||data.length>1700000)throw Error('사진이 너무 커서 넣을 수 없어. 더 작은 사진을 선택해 줘.');
  return data;
 }finally{URL.revokeObjectURL(url);}
}
export function attachPracticePhotos(notify=()=>{}){
 photos=[];preview();
 const choose=document.getElementById('choosePhotos'),camera=document.getElementById('capturePhoto');
 const show=document.getElementById('showDrawing');
 if(!choose||!camera||!show)return;
 choose.onclick=()=>document.getElementById('photoUpload').click();
 camera.onclick=()=>document.getElementById('photoCapture').click();
 show.onclick=()=>{
  const panel=document.getElementById('drawPanel');panel.hidden=!panel.hidden;
  show.setAttribute('aria-expanded',String(!panel.hidden));
  show.textContent=panel.hidden?'✎ 그림 그리기':'✎ 그림판 접기';
 };
 for(const id of ['photoUpload','photoCapture']){
  const picker=document.getElementById(id);
  picker.onchange=async()=>{
   const files=[...picker.files];picker.value='';
   setStatus('사진을 불러오고 있어...');
   for(const file of files){
    if(photos.length>=LIMIT){notify('사진은 최대 4장까지만 넣을 수 있어.');break;}
    try{photos.push(await convertPhoto(file));}catch(e){notify(e.message);}
   }
   preview();setStatus();
  };
 }
}
function openDb(){
 return new Promise((resolve,reject)=>{
  if(!window.indexedDB){reject(Error('이 브라우저에서는 임시 보관을 지원하지 않아.'));return;}
  const request=indexedDB.open(DB,1);
  request.onupgradeneeded=()=>{const db=request.result;
   if(!db.objectStoreNames.contains('records'))db.createObjectStore('records',{keyPath:'id'}).createIndex('owner','owner');
  };
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(Error('기기 보관함을 열 수 없어.'));
 });
}
export async function savePracticeRecord(owner,kind,entry){
 const db=await openDb();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction('records','readwrite');
  const item={id:'device-'+crypto.randomUUID(),owner,kind,entry,local:true,shared:false,createdAt:new Date().toISOString()};
  tx.objectStore('records').put(item);
  tx.oncomplete=()=>resolve(item);
  tx.onerror=()=>reject(Error('기기 용량이 부족하거나 브라우저 보관 기능이 차단됐어.'));
  tx.onabort=()=>reject(Error('기기 임시 저장에 실패했어.'));
 });}finally{db.close();}
}
export async function listPracticeRecords(owner){
 const db=await openDb();
 try{return await new Promise((resolve,reject)=>{
  const req=db.transaction('records','readonly').objectStore('records').index('owner').getAll(owner);
  req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,60));
  req.onerror=()=>reject(Error('기기 임시 보관 기록을 읽지 못했어.'));
 });}finally{db.close();}
}
export async function deletePracticeRecord(owner,id){
 const db=await openDb();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction('records','readwrite'),store=tx.objectStore('records');
  store.get(id).onsuccess=e=>{if(e.target.result?.owner===owner)store.delete(id);};
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(Error('기기에서 기록을 삭제하지 못했어.'));
 });}finally{db.close();}
}
export function photosMarkup(value){
 if(!Array.isArray(value))return '';
 const safe=value.slice(0,LIMIT).filter(src=>typeof src==='string'&&src.length<=1700000&&(
  /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(src)||
  /^https:\/\/miohovwmhmtcvkurjamm\.supabase\.co\/storage\/v1\/object\/sign\/ildan-practice-media\/[0-9a-f-]+\/[0-9a-f-]+\.jpg\?token=[A-Za-z0-9._%-]+(?:&[^"'<>]*)?$/.test(src)
  ));
 return `<div class="saved-photo-grid">${safe.map((src,i)=>`<figure><img alt="보관한 사진 ${i+1}" loading="lazy" src="${src.replaceAll('&','&amp;').replaceAll('"','&quot;')}"></figure>`).join('')}</div>`;
}

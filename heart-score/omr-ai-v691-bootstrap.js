/* Ulmoa AI OMR bootstrap v6.91 */
const ORT_VERSION='1.27.0';
const ORT_BASE=`https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
function loadScript(src){return new Promise((resolve,reject)=>{const old=[...document.scripts].find(s=>s.src===src);if(old){if(window.ort)return resolve();old.addEventListener('load',resolve,{once:true});old.addEventListener('error',()=>reject(new Error('AI 실행 엔진 다운로드 실패')),{once:true});return;}const s=document.createElement('script');s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('AI 실행 엔진 다운로드 실패'));document.head.appendChild(s);});}
async function boot(){
  if(!window.ort)await loadScript(`${ORT_BASE}ort.min.js`);
  if(!window.ort)throw new Error('AI 실행 엔진을 불러오지 못했습니다.');
  if(window.ort.env?.wasm){window.ort.env.wasm.wasmPaths=ORT_BASE;window.ort.env.wasm.numThreads=1;}
  await import('./omr-ai-v691.js?v=691');
  console.info('[Ulmoa] AI OMR bootstrap v6.91 ready',{ort:ORT_VERSION});
}
boot().catch(err=>{
  console.error('[Ulmoa] AI OMR bootstrap failed',err);
  const msg=err?.message||String(err),safe=String(msg).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const st=document.getElementById('imageStatus');if(st){st.className='status warn';st.textContent='분석 실패: '+msg;}
  const pages=document.getElementById('pages');if(pages)pages.innerHTML=`<div style="margin:24px auto;max-width:650px;padding:26px 22px;border:1px solid #f2c9c9;border-radius:22px;background:#fffafa;color:#7b2f36;overflow-wrap:anywhere;word-break:break-word"><div style="font-size:18px;font-weight:900">AI 악보인식 준비에 실패했어요</div><div style="margin-top:9px;line-height:1.6;font-weight:650">${safe}</div></div>`;
});

/*
 * Ulmoa Heart Score AI OMR adapter v6.85
 * Local browser runtime: ./omr-local-v682.js
 * Model: alexanderalber/satb-line-omr model-public-domain/omr-line.int8.onnx
 * Upstream commit c60823117a5c92b0c29f921dbca023e94026d279 — MIT.
 */

import * as omr from './omr-local-v682.js?v=684';

const W=window;
const ORT_VERSION='1.27.0';
const ORT_BASE=`https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
const MODEL_URL='https://raw.githubusercontent.com/alexanderalber/satb-line-omr/c60823117a5c92b0c29f921dbca023e94026d279/model-public-domain/omr-line.int8.onnx';
const legacyImport=W.importScoreFromFile;
let runtimePromise=null;

function el(id){return document.getElementById(id);}
function status(msg,type=''){
  if(typeof W.importStatus==='function')return W.importStatus(msg,type);
  const n=el('imageStatus');if(n){n.className='status'+(type?` ${type}`:'');n.textContent=msg;}
}
function preview(text,meta=''){if(typeof W.updateOcrPreview==='function')return W.updateOcrPreview(text,meta);}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function busy(label='새 악보를 분석하고 있어요…'){
  preview('');const pages=el('pages'),info=el('pageInfo');if(info)info.textContent='새 악보 분석 중';
  if(pages)pages.innerHTML=`<div style="margin:24px auto;max-width:620px;padding:28px 22px;border:1px solid #dbe3ef;border-radius:22px;background:#fff;text-align:center;font-weight:850;color:#233654;overflow-wrap:anywhere">🎼 ${esc(label)}<div style="margin-top:8px;font-size:13px;font-weight:600;color:#718096">이전 저장 결과는 새 분석 결과처럼 보여주지 않습니다.</div></div>`;
}
function stopped(msg){
  const pages=el('pages'),info=el('pageInfo');if(info)info.textContent='자동 변환 보류';
  if(pages)pages.innerHTML=`<div style="margin:24px auto;max-width:650px;padding:26px 22px;border:1px solid #f2c9c9;border-radius:22px;background:#fffafa;color:#7b2f36;overflow-wrap:anywhere;word-break:break-word"><div style="font-size:18px;font-weight:900">자동 변환을 중단했어요</div><div style="margin-top:9px;line-height:1.6;font-weight:650">${esc(msg)}</div><div style="margin-top:10px;font-size:13px;color:#8d6670">틀린 악보를 성공으로 표시하지 않습니다. MusicXML/MIDI는 그대로 사용할 수 있어요.</div></div>`;
}
function assertHost(){
  const names=['fileToCanvas','pdfToCanvases','emptyState','ev','nearestDuration','loadState','resetActiveLibrary','mergeImportedStates','summariseImportedState'];
  const missing=names.filter(n=>typeof W[n]!=='function');if(missing.length)throw new Error(`기존 악보 편집기 연결 실패: ${missing.join(', ')}`);
}
function loadScript(src){return new Promise((resolve,reject)=>{const old=[...document.scripts].find(s=>s.src===src);if(old){if(W.ort)return resolve();old.addEventListener('load',resolve,{once:true});old.addEventListener('error',()=>reject(new Error('AI 실행 엔진 다운로드 실패')),{once:true});return;}const s=document.createElement('script');s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('AI 실행 엔진 다운로드 실패'));document.head.appendChild(s);});}
async function ensureRuntime(){
  if(runtimePromise)return runtimePromise;
  runtimePromise=(async()=>{
    assertHost();
    if(!W.ort)await loadScript(`${ORT_BASE}ort.min.js`);
    if(!W.ort)throw new Error('AI 실행 엔진을 불러오지 못했습니다.');
    W.ort.env.wasm.wasmPaths=ORT_BASE;W.ort.env.wasm.numThreads=1;
    status('AI 모델을 처음 한 번 불러오고 있어요…');
    const session=await W.ort.InferenceSession.create(MODEL_URL,{executionProviders:['wasm'],graphOptimizationLevel:'disabled'});
    return{prep:omr,dec:omr,i2w:omr.i2wFromVocab(omr.VOCAB_TOKENS),session};
  })().catch(err=>{runtimePromise=null;throw err;});
  return runtimePromise;
}
function canvasGray(canvas){const ctx=canvas.getContext('2d',{willReadFrequently:true}),im=ctx.getImageData(0,0,canvas.width,canvas.height).data,out=new Float32Array(canvas.width*canvas.height);for(let i=0,j=0;i<im.length;i+=4,j++)out[j]=(im[i]*.299+im[i+1]*.587+im[i+2]*.114)/255;return out;}
function pitchName(p){if(!p?.step)return'';const ko={C:'도',D:'레',E:'미',F:'파',G:'솔',A:'라',B:'시'},flat={C:'도♭',D:'레♭',E:'미♭',F:'파♭',G:'솔♭',A:'라♭',B:'시♭'};let n=ko[p.step]||'';if(!n)return'';if(Number(p.alter)===1)n+='#';else if(Number(p.alter)===-1)n=flat[p.step]||n;if(Number(p.octave)>=5)n='높은'+n;return n;}
function eventFromIr(ir){if(!ir)return null;const div=Number(ir.duration?.divisions)||48,beats=W.nearestDuration(Math.max(.25,div/48));if(ir.kind==='rest')return W.ev('쉼',beats,'');if(ir.kind!=='note')return null;const note=pitchName(ir.pitch);return note?W.ev(note,beats,''):null;}
function toStateModel(lines,filename){
  let timeN=4,timeD=4,keyLabel='',current=[],measures=[],noteCount=0;const refs=[],conf=[];
  for(const line of lines){for(const ir of line.fragment){if(Number.isFinite(ir.confidence))conf.push(ir.confidence);if(ir.kind==='attribute'){if(ir.time?.num&&ir.time?.den){timeN=Number(ir.time.num);timeD=Number(ir.time.den);}if(Number.isFinite(ir.keyFifths)&&Number(ir.keyFifths)===0)keyLabel='C';continue;}if(ir.kind==='barline'){if(current.length){measures.push(current);current=[];}continue;}const e=eventFromIr(ir);if(!e)continue;current.push(e);if(ir.kind==='note')noteCount++;const b=ir.src?.bbox;if(b)refs.push({system:line.system,x:b[0]+b[2]/2,event:e});}if(current.length){measures.push(current);current=[];}}
  measures=measures.filter(m=>m?.length);const base=typeof W.fileBaseName==='function'?W.fileBaseName(filename):String(filename||'').replace(/\.[^.]+$/,'');
  return{state:{...W.emptyState(),title:base||'가져온 악보',pageOrientation:'landscape',timeN,timeD,keyLabel,measures},refs,noteCount,avgConfidence:conf.length?conf.reduce((a,b)=>a+b,0)/conf.length:0};
}

function pxGray(gray,w,h,x,y){
  x=Math.max(0,Math.min(w-1,Math.round(x)));y=Math.max(0,Math.min(h-1,Math.round(y)));
  return gray[y*w+x];
}
function visualBars(gray,w,h,line,threshold=.85){
  const b=line.input.box,sp=Number(b.lineSpacing)||10;
  const staffTop=(Number(b.y)||0)+(Number(b.padUp)||0),staffBottom=staffTop+4*sp;
  const x0=Math.max(0,Math.floor(Number(b.x)||0)),x1=Math.min(w-1,Math.ceil((Number(b.x)||0)+(Number(b.w)||0)));
  const noteXs=line.fragment.filter(v=>v.kind==='note'||v.kind==='rest').map(v=>{const q=v.src?.bbox;return q?q[0]+q[2]/2:null;}).filter(Number.isFinite);
  const modelBars=line.fragment.filter(v=>v.kind==='barline').map(v=>{const q=v.src?.bbox;return q?q[0]+q[2]/2:null;}).filter(Number.isFinite);
  const inkThr=Math.max(.82,Math.min(.92,Number(threshold)||.85));
  const sideThr=Math.min(.84,inkThr);
  const raw=[];
  for(let x=x0+2;x<=x1-2;x++){
    let cross=0;
    for(let k=0;k<4;k++){
      const y=staffTop+(k+.5)*sp;let hit=false;
      for(let dy=-2;dy<=2&&!hit;dy++)for(let dx=-1;dx<=1;dx++)if(pxGray(gray,w,h,x+dx,y+dy)<inkThr){hit=true;break;}
      if(hit)cross++;
    }
    if(cross===4)raw.push(x);
  }
  const groups=[];if(raw.length){let a=raw[0],z=a;for(let i=1;i<raw.length;i++){const x=raw[i];if(x<=z+1)z=x;else{groups.push([a,z]);a=z=x;}}groups.push([a,z]);}
  const scored=[];
  for(const g of groups){
    const x=(g[0]+g[1])/2,r=Math.max(5,Math.round(sp*1.4));let coreN=0,coreD=0,sideN=0,sideD=0;
    for(let y=Math.round(staffTop);y<=Math.round(staffBottom);y++){
      for(let dx=-1;dx<=1;dx++){coreD++;if(pxGray(gray,w,h,x+dx,y)<inkThr)coreN++;}
      for(let dx=-r;dx<=r;dx++){if(Math.abs(dx)<=3)continue;sideD++;if(pxGray(gray,w,h,x+dx,y)<sideThr)sideN++;}
    }
    const core=coreD?coreN/coreD:0,side=sideD?sideN/sideD:0;
    let score=core-2*side;
    const noteDist=noteXs.length?Math.min(...noteXs.map(v=>Math.abs(v-x))):9999;
    const modelDist=modelBars.length?Math.min(...modelBars.map(v=>Math.abs(v-x))):9999;
    if(noteDist<sp*1.25)score-=.52;
    if(modelDist<sp*1.8)score+=.42;
    const edge=Math.min(Math.abs(x-x0),Math.abs(x1-x));
    if(edge<sp*3)score+=.16;
    scored.push({x,score,source:'visual'});
  }
  for(const x of modelBars)scored.push({x,score:.52,source:'model'});
  scored.sort((a,b)=>b.score-a.score);
  const picked=[];
  for(const q of scored){
    if(q.score<.24)continue;
    if(picked.some(p=>Math.abs(p.x-q.x)<sp*2.2))continue;
    picked.push(q);
  }
  picked.sort((a,b)=>a.x-b.x);
  const edges=[];
  const left=picked.find(q=>q.x<x0+sp*6);
  const right=[...picked].reverse().find(q=>q.x>x1-sp*6);
  edges.push(left?.x??x0);
  for(const q of picked){
    if(q===left||q===right)continue;
    if(q.x<=edges[edges.length-1]+sp*6)continue;
    if(q.x>=x1-sp*4)continue;
    edges.push(q.x);
  }
  if((right?.x??x1)>edges[edges.length-1]+sp*5)edges.push(right?.x??x1);else edges[edges.length-1]=right?.x??x1;
  return edges.sort((a,b)=>a-b);
}
function toStateVisual(lines,filename,gray,w,h,threshold){
  let timeN=4,timeD=4,keyLabel='',measures=[],noteCount=0;const refs=[],conf=[];
  for(const line of lines){
    for(const ir of line.fragment){
      if(Number.isFinite(ir.confidence))conf.push(ir.confidence);
      if(ir.kind==='attribute'){if(ir.time?.num&&ir.time?.den){timeN=Number(ir.time.num);timeD=Number(ir.time.den);}if(Number.isFinite(ir.keyFifths)&&Number(ir.keyFifths)===0)keyLabel='C';}
    }
    const musical=line.fragment.filter(ir=>ir.kind==='note'||ir.kind==='rest').map(ir=>{const e=eventFromIr(ir),q=ir.src?.bbox;return e&&q?{ir,e,x:q[0]+q[2]/2}:null;}).filter(Boolean).sort((a,b)=>a.x-b.x);
    noteCount+=musical.filter(v=>v.ir.kind==='note').length;
    const bars=visualBars(gray,w,h,line,threshold);
    let used=false;
    if(bars.length>=2&&musical.length){
      const before=measures.length;
      for(let i=0;i<bars.length-1;i++){
        const left=bars[i],right=bars[i+1];
        const mm=musical.filter(v=>v.x>left&&v.x<right).map(v=>v.e);
        if(mm.length)measures.push(mm);
      }
      used=measures.length>before;
    }
    if(!used){
      let cur=[];
      for(const ir of line.fragment){
        if(ir.kind==='barline'){if(cur.length){measures.push(cur);cur=[];}continue;}
        const e=eventFromIr(ir);if(e)cur.push(e);
      }
      if(cur.length)measures.push(cur);
    }
    for(const v of musical)refs.push({system:line.system,x:v.x,event:v.e});
  }
  measures=measures.filter(m=>m?.length);const base=typeof W.fileBaseName==='function'?W.fileBaseName(filename):String(filename||'').replace(/\.[^.]+$/,'');
  return{state:{...W.emptyState(),title:base||'가져온 악보',pageOrientation:'landscape',timeN,timeD,keyLabel,measures},refs,noteCount,avgConfidence:conf.length?conf.reduce((a,b)=>a+b,0)/conf.length:0,segmentation:'visual'};
}
function candidateScore(b){
  const q=measureQa(b.state),m=b.state.measures.length;
  return q.exactRatio*100-q.over*10+Math.min(25,m)*.35+(b.avgConfidence||0)*5;
}
function measureQa(state){const target=Number(state.timeN)||4,scale=(Number(state.timeD)||4)/4,sums=(state.measures||[]).map(m=>m.reduce((a,e)=>a+(Number(e.dur)||0)*scale,0)),exact=sums.filter(v=>Math.abs(v-target)<.01).length,over=sums.filter(v=>v>target+.01).length;return{target,sums,exactRatio:sums.length?exact/sums.length:0,over};}
function filterMainInputs(pre,pageWidth){const all=pre.inputs||[];if(!all.length)return[];const maxW=Math.max(...all.map(v=>v.box?.w||0));let main=all.filter(v=>(v.box?.w||0)>=Math.max(pageWidth*.48,maxW*.60));if(!main.length)main=all.filter(v=>(v.box?.w||0)>=maxW*.72);main.sort((a,b)=>(a.box?.y||0)-(b.box?.y||0)||(a.box?.x||0)-(b.box?.x||0));const seen=new Set(),out=[];for(const input of main){const sys=input.box?.system;if(seen.has(sys))continue;seen.add(sys);out.push(input);}return out;}
function choosePreprocess(rt,gray,w,h){
  const thresholds=[.60,.72,.78,.82,.85,.88,.90];
  const candidates=[];
  for(const threshold of thresholds){
    const pre=rt.prep.preprocessPage(gray,w,h,{threshold});
    const inputs=filterMainInputs(pre,w);
    if(!inputs.length)continue;
    const widths=inputs.map(v=>Number(v.box?.w)||0).filter(Boolean);
    const spacings=inputs.map(v=>Number(v.box?.lineSpacing)||0).filter(Boolean);
    const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
    const cv=a=>{const m=mean(a);if(!m||a.length<2)return 0;return Math.sqrt(a.reduce((s,v)=>s+(v-m)*(v-m),0)/a.length)/m;};
    candidates.push({threshold,pre,inputs,count:inputs.length,widthCv:cv(widths),spacingCv:cv(spacings)});
  }
  if(!candidates.length)return null;
  for(const c of candidates){
    c.support=candidates.filter(o=>o!==c&&o.count===c.count&&Math.abs(o.threshold-c.threshold)<=.061).length;
    c.score=c.count*100+c.support*18-Math.min(30,c.widthCv*80)-Math.min(30,c.spacingCv*100)-Math.abs(c.threshold-.85)*5;
  }
  candidates.sort((a,b)=>b.score-a.score||b.count-a.count||Math.abs(a.threshold-.85)-Math.abs(b.threshold-.85));
  return candidates[0];
}
function lyricAdapter(lines,built){const bySystem=new Map();for(const r of built.refs){if(!bySystem.has(r.system))bySystem.set(r.system,[]);bySystem.get(r.system).push({x:r.x,event:r.event});}return{state:built.state,systems:lines.map(line=>{const b=line.input.box,sp=Number(b.lineSpacing)||10,staffTop=(Number(b.y)||0)+(Number(b.padUp)||0);return{staff:{spacing:sp,x0:Number(b.x)||0,x1:(Number(b.x)||0)+(Number(b.w)||0),lines:[0,1,2,3,4].map(k=>staffTop+k*sp)},events:bySystem.get(line.system)||[]};})};}
async function recognizeCanvas(canvas,filename,pageIndex){
  const rt=await ensureRuntime(),gray=canvasGray(canvas),chosen=choosePreprocess(rt,gray,canvas.width,canvas.height);if(!chosen)return{staffDetected:false};
  const {pre,inputs,threshold}=chosen;if(!(pre.inputs||[]).length)return{staffDetected:false};if(!inputs.length)return{staffDetected:true,ok:false,reason:'오선은 찾았지만 본문 악보 줄을 안정적으로 분리하지 못했습니다.'};
  status(`본문 악보 ${inputs.length}줄 감지 · 명암 보정 ${Math.round(threshold*100)}% · 음표 읽는 중…`);
  const lines=[];for(let i=0;i<inputs.length;i++){const input=inputs[i];status(`AI 악보 인식 ${i+1}/${inputs.length}줄 · 음높이·리듬 읽는 중…`);const tensor=new W.ort.Tensor('float32',input.data,[1,1,input.height,input.width]),res=await rt.session.run({input:tensor}),logits=res.logits;if(!logits?.data)continue;const dims=logits.dims||[],T=dims[dims.length-2],C=dims[dims.length-1];if(!T||!C)continue;const tokens=rt.dec.decodeLine(logits.data,T,C,rt.i2w),b=input.box,staff={page:pageIndex,system:i,staffIndex:0,bbox:[b.x,b.y,b.w,b.h],lineSpacingPx:b.lineSpacing,normSpacing:10},fragment=rt.dec.lineFragment(tokens,staff);lines.push({system:i,input,fragment,tokens});}
  if(!lines.length)return{staffDetected:true,ok:false,reason:'오선은 찾았지만 음표를 읽어내지 못했습니다.'};
  const modelBuilt=toStateModel(lines,filename),visualBuilt=toStateVisual(lines,filename,gray,canvas.width,canvas.height,threshold),built=candidateScore(visualBuilt)>=candidateScore(modelBuilt)?visualBuilt:modelBuilt,q=measureQa(built.state),staves=lines.length,suspiciousShort=staves>=3&&built.state.measures.length<=4,enough=built.noteCount>=Math.max(6,staves*3)&&built.state.measures.length>=Math.max(2,Math.floor(staves*.8)),rhythmOk=q.over===0&&(q.exactRatio>=.45||built.state.measures.length<=2),confOk=built.avgConfidence>=.45;
  if(suspiciousShort||!enough||!rhythmOk||!confOk)return{staffDetected:true,ok:false,reason:`AI가 ${staves}개 악보 줄을 찾았지만 결과 검증을 통과하지 못했습니다. (${built.state.measures.length}마디 · 음표 ${built.noteCount}개 · 박자일치 ${Math.round(q.exactRatio*100)}% · 신뢰도 ${Math.round(built.avgConfidence*100)}% · ${built.segmentation==='visual'?'인쇄 마디선':'AI 마디선'} 기준)`};
  if(typeof W.ocrCanvas==='function'&&typeof W.attachOcrToOmr==='function'){try{status('음표 인식 완료 · 제목과 가사 위치 확인 중…');const data=await W.ocrCanvas(canvas,'제목·가사 OCR');W.attachOcrToOmr(lyricAdapter(lines,built),data,filename);}catch(err){console.warn('AI OMR lyric OCR skipped',err);}}
  return{staffDetected:true,ok:true,state:built.state,staves,noteCount:built.noteCount,avgConfidence:built.avgConfidence,quality:q,threshold,segmentation:built.segmentation||'model'};
}
async function aiImport(file){
  if(!file)return;busy();status('AI 악보 인식 준비 중…');
  try{const isPdf=/pdf$/i.test(file.type)||/\.pdf$/i.test(file.name||''),canvases=isPdf?await W.pdfToCanvases(file,4,2.05):[await W.fileToCanvas(file,2200)],states=[],stats=[];let anyStaff=false;for(let i=0;i<canvases.length;i++){status(`${isPdf?'PDF':'이미지'} ${i+1}/${canvases.length} · 오선 찾는 중…`);const r=await recognizeCanvas(canvases[i],file.name,i);anyStaff=anyStaff||r.staffDetected;if(r.staffDetected&&!r.ok){stopped(r.reason);status('⚠ '+r.reason,'warn');return;}if(r.ok){states.push(r.state);stats.push(r);}}if(anyStaff&&states.length){const merged=W.mergeImportedStates(states,file.name);if(!merged)throw new Error('AI 인식 결과를 합치지 못했습니다.');W.resetActiveLibrary();W.loadState(merged);const notes=stats.reduce((a,v)=>a+v.noteCount,0),staves=stats.reduce((a,v)=>a+v.staves,0),avg=stats.reduce((a,v)=>a+v.avgConfidence,0)/stats.length;preview(W.summariseImportedState(merged),`AI OMR β · ${staves}줄 · ${merged.measures.length}마디 · 음표 ${notes}개 · 평균 신뢰도 ${Math.round(avg*100)}%`);status(`✓ AI 악보 초안 완료 · ${merged.measures.length}마디. 저장 전 원본과 계이름·리듬·쉼표·임시표를 대조해 주세요.`,'ok');return;}if(typeof legacyImport==='function'){status('오선보가 아니라 기존 계이름/OCR 방식으로 전환합니다…');return legacyImport(file);}throw new Error('악보 인식 방식을 선택하지 못했습니다.');}
  catch(err){console.error(err);const msg=err?.message||String(err);stopped(msg);status('분석 실패: '+msg,'warn');preview('');}
}

const input=el('imageScoreFile');if(input){input.onchange=async e=>{const f=e.target.files?.[0];if(!f)return;await aiImport(f);e.target.value='';};input.dataset.aiOmr='v685';}
W.importScoreFromFileAI=aiImport;
const st=el('imageStatus');if(st){st.className='status ok';st.innerHTML='🤖 <b>AI 악보인식 β 준비됨</b> · 모바일용 로컬 인식 모듈을 사용하고, 품질 검증 실패 시 잘못된 악보를 만들지 않고 중단합니다.';}
console.info('[Ulmoa] AI OMR v6.85 ready',{ort:ORT_VERSION,model:'int8-public-domain',adaptiveThreshold:true,hybridBarlines:true});

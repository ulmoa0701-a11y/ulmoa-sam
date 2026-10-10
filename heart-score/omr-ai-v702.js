/*
 * Ulmoa Heart Score AI OMR adapter v7.02
 * Local browser runtime: ./omr-local-v686.js
 * Model: alexanderalber/satb-line-omr model-public-domain/omr-line.fp16.onnx
 * Upstream commit c60823117a5c92b0c29f921dbca023e94026d279 — MIT.
 */

import * as omr from './omr-local-v686.js?v=702';
import {scanConnectedHeads,scanPitchFromY,scanRhythm,scanHollowHeads} from './omr-scan-evidence-v1.mjs';
import {planBarRows} from './omr-bar-consensus-v1.mjs?v=1';
import {recoverFaintBarlines} from './omr-bar-rescue-v1.mjs?v=1';

const W=window;
const ORT_VERSION='1.27.0';
const ORT_BASE=`https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
const MODEL_URL='https://raw.githubusercontent.com/alexanderalber/satb-line-omr/c60823117a5c92b0c29f921dbca023e94026d279/model-public-domain/omr-line.fp16.onnx';
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
  const names=['fileToCanvas','pdfToCanvases','emptyState','ev','nearestDuration','loadState','resetActiveLibrary','mergeImportedStates','summariseImportedState','findStaffSystems','omrConnectedHeads','omrPitchFromY','omrFindBarlines','omrMeasureDurations','omrGrayAt'];
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
function enhanceScanCrop(src,w,h){
  const r=12,n=w*h,tmp=new Float32Array(n),mean=new Float32Array(n);
  for(let y=0;y<h;y++){
    const row=y*w;let l=0,rr=Math.min(w-1,r),sum=0;
    for(let x=0;x<=rr;x++)sum+=src[row+x];
    for(let x=0;x<w;x++){
      while(l<Math.max(0,x-r)){sum-=src[row+l];l++;}
      const wantR=Math.min(w-1,x+r);while(rr<wantR){rr++;sum+=src[row+rr];}
      tmp[row+x]=sum/(rr-l+1);
    }
  }
  for(let x=0;x<w;x++){
    let t=0,b=Math.min(h-1,r),sum=0;
    for(let y=0;y<=b;y++)sum+=tmp[y*w+x];
    for(let y=0;y<h;y++){
      while(t<Math.max(0,y-r)){sum-=tmp[t*w+x];t++;}
      const wantB=Math.min(h-1,y+r);while(b<wantB){b++;sum+=tmp[b*w+x];}
      mean[y*w+x]=sum/(b-t+1);
    }
  }
  for(let i=0;i<n;i++){
    const v=src[i],local=Math.sqrt(Math.max(0,Math.min(1,(mean[i]-v-.003)/.045)));
    const global=Math.max(0,Math.min(1,(.92-v)/.35))*.72,ink=Math.max(local,global);
    tmp[i]=1-ink;
  }
  return tmp;
}
function enhancedInput(prep,gray,pageW,pageH,input){
  const b=input.box,crop=new Float32Array(b.w*b.h);
  for(let y=0;y<b.h;y++){const src=(b.y+y)*pageW+b.x,dst=y*b.w;for(let x=0;x<b.w;x++)crop[dst+x]=gray[src+x];}
  const crisp=enhanceScanCrop(crop,b.w,b.h),norm=prep.normalizeStaff(crisp,b.w,b.h,b.lineSpacing,b.padUp,10,128);
  const sourceW=Math.min(norm.width,1800),truncated=norm.width>1800;
  // White trailing context avoids losing final notes at the inference boundary.
  const ww=Math.min(1800,sourceW+(sourceW>1400?128:0));
  const data=new Float32Array(norm.height*ww);
  for(let y=0;y<norm.height;y++){const src=y*norm.width,dst=y*ww;for(let x=0;x<sourceW;x++)data[dst+x]=1-norm.data[src+x];}
  return{...input,data,width:ww,height:norm.height,truncated};
}
function rightEdgeModelInput(input){
  const start=Math.max(0,input.width-900),sourceWidth=input.width-start,extra=Math.min(120,1800-sourceWidth);
  const destWidth=sourceWidth+extra,data=new Float32Array(input.height*destWidth);
  for(let y=0;y<input.height;y++)data.set(input.data.subarray(y*input.width+start,y*input.width+input.width),y*destWidth);
  const pixelScale=(Number(input.box.lineSpacing)||10)/10;
  const shifted={...input,box:{...input.box,x:input.box.x+start*pixelScale}};
  return{shifted,model:{...input,data,width:destWidth},start};
}
function pitchName(p){if(!p?.step)return'';const ko={C:'도',D:'레',E:'미',F:'파',G:'솔',A:'라',B:'시'},flat={C:'도♭',D:'레♭',E:'미♭',F:'파♭',G:'솔♭',A:'라♭',B:'시♭'};let n=ko[p.step]||'';if(!n)return'';if(Number(p.alter)===1)n+='#';else if(Number(p.alter)===-1)n=flat[p.step]||n;if(Number(p.octave)>=5)n='높은'+n;return n;}
function eventFromIr(ir){if(!ir)return null;const div=Number(ir.duration?.divisions)||48,beats=W.nearestDuration(Math.max(.25,div/48));if(ir.kind==='rest')return W.ev('쉼',beats,'');if(ir.kind!=='note')return null;const note=pitchName(ir.pitch);return note?W.ev(note,beats,''):null;}
function musicalEvents(fragment){return fragment.filter(ir=>ir.kind==='note'||ir.kind==='rest').map(ir=>({ir,e:eventFromIr(ir),x:(ir.src?.bbox?.[0]||0)+(ir.src?.bbox?.[2]||0)/2})).filter(v=>v.e);}
function eventBeat(v,timeD=4){return Math.max(.125,(Number(v?.e?.dur)||0)*(Number(timeD)||4)/4);}
function partitionLineByBeat(fragment,timeN=4,timeD=4){const mus=musicalEvents(fragment),n=mus.length,target=Number(timeN)||4;if(!n)return{measures:[],exactRatio:0,score:-999,noteCount:0,totalBeat:0};const prefix=[0];for(const v of mus)prefix.push(prefix[prefix.length-1]+eventBeat(v,timeD));const barXs=fragment.filter(v=>v.kind==='barline').map(v=>(v.src?.bbox?.[0]||0)+(v.src?.bbox?.[2]||0)/2).filter(Number.isFinite);const boundaryBonus=j=>{if(j<=0||j>=n||!barXs.length)return 0;const x=(mus[j-1].x+mus[j].x)/2,span=Math.max(12,Math.abs(mus[j].x-mus[j-1].x)*.8);return barXs.some(b=>Math.abs(b-x)<=span)?-2.2:0;};const dpv=Array(n+1).fill(Infinity),prev=Array(n+1).fill(-1);dpv[0]=0;for(let j=1;j<=n;j++)for(let i=Math.max(0,j-12);i<j;i++){const sum=prefix[j]-prefix[i],diff=Math.abs(sum-target),over=Math.max(0,sum-target);let cost=diff*diff*5+(over>0?over*over*14:0);if(diff<.08)cost-=5.5;else if(diff<.26)cost-=2;if(sum<target*.45)cost+=5;if(j-i>9)cost+=(j-i-9)*1.8;if(i>0)cost+=boundaryBonus(i);if(j===n&&diff>.75)cost+=2.5;const v=dpv[i]+cost;if(v<dpv[j]){dpv[j]=v;prev[j]=i;}}const segs=[];let j=n;while(j>0&&prev[j]>=0){const i=prev[j];segs.push([i,j,prefix[j]-prefix[i]]);j=i;}if(j!==0)return{measures:[mus.map(v=>v.e)],exactRatio:0,score:-999,noteCount:mus.filter(v=>v.ir.kind==='note').length,totalBeat:prefix[n]};segs.reverse();const exact=segs.filter(s=>Math.abs(s[2]-target)<.08).length,near=segs.filter(s=>Math.abs(s[2]-target)<.26).length,confs=mus.map(v=>Number(v.ir.confidence)).filter(Number.isFinite),avgConfidence=confs.length?confs.reduce((a,b)=>a+b,0)/confs.length:0;return{measures:segs.map(([i,j])=>mus.slice(i,j).map(v=>v.e)),exactRatio:segs.length?exact/segs.length:0,nearRatio:segs.length?near/segs.length:0,score:exact*5+near*1.5-Math.max(0,segs.length-exact)*.35+avgConfidence*2-Math.max(0,dpv[n])*.03,noteCount:mus.filter(v=>v.ir.kind==='note').length,totalBeat:prefix[n],avgConfidence};}
function lineDecodeScore(fragment){let timeN=4,timeD=4;for(const ir of fragment)if(ir.kind==='attribute'&&ir.time?.num&&ir.time?.den){timeN=Number(ir.time.num);timeD=Number(ir.time.den);break;}const p=partitionLineByBeat(fragment,timeN,timeD),unparseable=fragment.filter(v=>v.kind==='unparseable').length;return p.score+p.exactRatio*8-Math.min(8,unparseable*1.2)+Math.min(3,p.noteCount*.08);}
function toStateBeat(lines,filename){let timeN=4,timeD=4,keyLabel='',measures=[],noteCount=0,allExact=0,allMeasure=0;const refs=[],conf=[];for(const line of lines){for(const ir of line.fragment){if(Number.isFinite(ir.confidence))conf.push(ir.confidence);if(ir.kind==='attribute'){if(ir.time?.num&&ir.time?.den){timeN=Number(ir.time.num);timeD=Number(ir.time.den);}if(Number.isFinite(ir.keyFifths)&&Number(ir.keyFifths)===0)keyLabel='C';}}const part=partitionLineByBeat(line.fragment,timeN,timeD);measures.push(...part.measures);allMeasure+=part.measures.length;allExact+=Math.round(part.exactRatio*part.measures.length);noteCount+=part.noteCount;for(const v of musicalEvents(line.fragment))refs.push({system:line.system,x:v.x,event:v.e});}const base=typeof W.fileBaseName==='function'?W.fileBaseName(filename):String(filename||'').replace(/\.[^.]+$/,'');return{state:{...W.emptyState(),title:base||'가져온 악보',pageOrientation:'landscape',timeN,timeD,keyLabel,measures},refs,noteCount,avgConfidence:conf.length?conf.reduce((a,b)=>a+b,0)/conf.length:0,segmentation:'beat-dp',dpExactRatio:allMeasure?allExact/allMeasure:0};}
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
function pageGray(gray,w,h,x,y){
  x=Math.max(0,Math.min(w-1,Math.round(x)));y=Math.max(0,Math.min(h-1,Math.round(y)));
  return gray[y*w+x];
}
function longestVerticalRunPage(gray,w,h,x,y0,y1,thr=.843){
  let best=0,cur=0;
  for(let y=Math.max(0,Math.round(y0));y<=Math.min(h-1,Math.round(y1));y++){
    if(pageGray(gray,w,h,x,y)<thr){cur++;if(cur>best)best=cur;}else cur=0;
  }
  return best;
}
function horizontalRunThrough(gray,w,h,x,y,thr=.863,maxRad=200){
  const xi=Math.round(x),yi=Math.round(y);if(pageGray(gray,w,h,xi,yi)>=thr)return 0;
  let l=xi,r=xi;
  while(l>0&&xi-l<maxRad&&pageGray(gray,w,h,l-1,yi)<thr)l--;
  while(r<w-1&&r-xi<maxRad&&pageGray(gray,w,h,r+1,yi)<thr)r++;
  return r-l+1;
}
function beamAboveRun(gray,w,h,staffTop,sp,x){
  let best=0;
  for(let i=0;i<13;i++){
    const off=-2+i*((2-.45)/12),run=horizontalRunThrough(gray,w,h,x,staffTop+off*sp,.863,200);
    if(run>best)best=run;
  }
  return best;
}
function visualBarCandidates(gray,w,h,line){
  const b=line.input.box,sp=Number(b.lineSpacing)||10;
  const staffTop=(Number(b.y)||0)+(Number(b.padUp)||0),staffBottom=staffTop+4*sp;
  const x0=Math.max(0,Math.floor(Number(b.x)||0)),x1=Math.min(w-1,Math.ceil((Number(b.x)||0)+(Number(b.w)||0)));
  const y0=Math.max(0,Math.round(staffTop-sp*.30)),y1=Math.min(h-1,Math.round(staffBottom+sp*.30));
  const dark=.843,need=(y1-y0+1)*.80,raw=[];
  for(let x=x0;x<=x1;x++){
    let best=0,run=0;
    for(let y=y0;y<=y1;y++){if(pageGray(gray,w,h,x,y)<dark){run++;if(run>best)best=run;}else run=0;}
    if(best>=need)raw.push(x);
  }
  const groups=[];
  if(raw.length){let a=raw[0],z=a;for(let i=1;i<raw.length;i++){const x=raw[i];if(x-z<=2)z=x;else{groups.push([a,z]);a=z=x;}}groups.push([a,z]);}
  const staffYs=[0,1,2,3,4].map(k=>staffTop+k*sp),rad=Math.max(6,Math.round(sp*1.30)),out=[];
  for(const [a,z] of groups){
    const x=(a+z)/2,xi=Math.round(x);let sideN=0,sideD=0;
    for(let y=y0;y<=y1;y++){
      if(staffYs.some(sy=>Math.abs(y-sy)<=2.3))continue;
      for(let xx=Math.max(x0,xi-rad);xx<=Math.min(x1,xi+rad);xx++){
        if(Math.abs(xx-xi)<=3)continue;
        sideD++;if(pageGray(gray,w,h,xx,y)<dark)sideN++;
      }
    }
    const side=sideD?sideN/sideD:1;
    out.push({x,side,width:z-a+1,sp,x0,x1});
  }
  return out;
}
function visualPitchProposals(staff,fragment){
  if(!staff)return[];
  const heads=scanConnectedHeads(staff);
  return musicalEvents(fragment).filter(v=>v.ir.kind==='note').map(v=>{
    const nearby=heads.map(h=>({h,delta:Math.abs(h.x-v.x)})).filter(o=>o.delta<staff.spacing*6).sort((a,b)=>a.delta-b.delta);
    const chosen=nearby[0];
    if(!chosen)return {x:Math.round(v.x),model:pitchName(v.ir.pitch),found:false};
    const p=scanPitchFromY(staff,chosen.h.x,chosen.h.y);
    const rhythm=scanRhythm(staff,{x:chosen.h.x,y:chosen.h.y});return {x:Math.round(v.x),model:pitchName(v.ir.pitch),proposal:p.note,cvX:Math.round(chosen.h.x),cvY:Math.round(chosen.h.y),delta:+chosen.delta.toFixed(1),gap:nearby[1]?+(nearby[1].delta-chosen.delta).toFixed(1):null,area:Math.round(chosen.h.area||0),rhythm:{dur:rhythm.dur,dot:rhythm.dot,flag:rhythm.flag,beam:+rhythm.beam.toFixed(1),hollow:rhythm.hollow}};
  });
}
function modelNoteShapeDiagnostics(staff,fragment){
  if(!staff)return[];
  const degrees={C:0,D:1,E:2,F:3,G:4,A:5,B:6};
  return musicalEvents(fragment).filter(v=>v.ir.kind==='note').map(v=>{
    const p=v.ir.pitch,di=degrees[p?.step],oct=Number(p?.octave);
    if(!Number.isFinite(di)||!Number.isFinite(oct))return{x:Math.round(v.x),model:v.e.dur,skipped:true};
    const k=(oct-4)*7+di-2,y=staff.lines[4]-k*staff.spacing/2;
    const shape=scanRhythm(staff,{x:v.x,y});
    return{x:Math.round(v.x),k,model:v.e.dur,shape:shape.dur,dot:shape.dot,hollow:shape.hollow,beam:+shape.beam.toFixed(1)};
  });
}
function visualBarPlan(gray,w,h,lines){
  const rows=lines.map(line=>{
    const b=line.input.box||{},sp=Number(b.lineSpacing)||10,x0=Math.max(0,Number(b.x)||0),x1=Math.min(w-1,(Number(b.x)||0)+(Number(b.w)||0));
    let c=visualBarCandidates(gray,w,h,line);
    const found=c.filter(q=>q.x>x0+sp*6&&q.x<x1-sp*4&&q.side<=.12);
    // The old detector sometimes returned zero interior lines for a complete score.
    // Recover only from continuous ink in *all four* staff spaces; no equal-width guesses.
    if(found.length<2){
      const recovered=recoverFaintBarlines(gray,w,h,b);
      for(const q of recovered)if(!c.some(v=>Math.abs(v.x-q.x)<sp*.85))c.push(q);
    }
    const internal=c.filter(q=>q.x>x0+sp*6&&q.x<x1-sp*4);
    const strong=internal.filter(q=>q.side<=.04),moderate=internal.filter(q=>q.side<=.12),extended=internal.filter(q=>q.side<=.18);
    return{line,c,sp,x0,x1,strong,moderate,extended};
  });
  return planBarRows(rows);
}
const FIT_DURS=[.25,.5,.75,1,1.5,2,3,4];
function fitMeasureToBeat(items,left,right,targetQ=4){
  if(!items.length)return{events:[],correction:0,rawExact:false,ok:false};
  const n=items.length;if(n>16)return{events:items.map(v=>({...v.e})),correction:99,rawExact:false,ok:false};
  const orig=items.map(v=>Math.max(.25,Number(v.e?.dur)||1));
  const rawSum=orig.reduce((a,b)=>a+b,0),rawExact=Math.abs(rawSum-targetQ)<.08;
  const gaps=items.map((v,i)=>Math.max(1,(i+1<n?items[i+1].x:right)-v.x)),gapSum=gaps.reduce((a,b)=>a+b,0)||1;
  const pref=gaps.map(g=>Math.max(.25,targetQ*g/gapSum));
  const unit=.25,targetU=Math.round(targetQ/unit),dp=Array.from({length:n+1},()=>Array(targetU+1).fill(Infinity)),prev=Array.from({length:n+1},()=>Array(targetU+1).fill(null));
  dp[0][0]=0;
  for(let i=0;i<n;i++)for(let u=0;u<=targetU;u++)if(Number.isFinite(dp[i][u])){
    for(const d of FIT_DURS){
      const du=Math.round(d/unit),nu=u+du;if(nu>targetU)continue;
      const leftN=n-i-1;if(nu+leftN>targetU||nu+leftN*16<targetU)continue;
      const ro=orig[i],rp=pref[i],log=Math.log2(d/ro),space=(d-rp)/Math.max(.5,rp);
      let cost=log*log*2.6+space*space*.75+Math.abs(d-ro)*.12;
      if(Math.abs(d-ro)<.01)cost-=.32;
      if(d===4&&n>1)cost+=4;
      // The notation decoder's dotted-quarter (1.5 beats) is stronger evidence
      // than a horizontal-space fit; preserving its dot prevents false quartering.
      if(Math.abs(ro-1.5)<.01&&d<1.5)cost+=2.8;
      // Three-quarter-beat durations need direct decoded support, not spacing alone.
      if(Math.abs(d-.75)<.01&&Math.abs(ro-.75)>.01)cost+=1.0;

      const nv=dp[i][u]+cost;if(nv<dp[i+1][nu]){dp[i+1][nu]=nv;prev[i+1][nu]=[u,d];}
    }
  }
  if(!Number.isFinite(dp[n][targetU]))return{events:items.map(v=>({...v.e})),correction:99,rawExact,ok:false};
  const ds=Array(n);let u=targetU;
  for(let i=n;i>0;i--){const p=prev[i][u];if(!p)return{events:items.map(v=>({...v.e})),correction:99,rawExact,ok:false};ds[i-1]=p[1];u=p[0];}
  const correction=ds.reduce((a,d,i)=>a+Math.abs(d-orig[i]),0)/n;
  return{events:items.map((v,i)=>({...v.e,dur:ds[i]})),correction,rawExact,ok:true};
}
function toStateVisual(lines,filename,gray,w,h,threshold,cvStaffs=[]){
  let timeN=4,timeD=4,keyLabel='',measures=[],noteCount=0,rawExact=0,fitCount=0,correctionSum=0;const refs=[],conf=[];
  const plan=visualBarPlan(gray,w,h,lines);
  for(let li=0;li<lines.length;li++){
    const line=lines[li];
    for(const ir of line.fragment){
      if(Number.isFinite(ir.confidence))conf.push(ir.confidence);
      if(ir.kind==='attribute'){if(ir.time?.num&&ir.time?.den){timeN=Number(ir.time.num);timeD=Number(ir.time.den);}if(Number.isFinite(ir.keyFifths)&&Number(ir.keyFifths)===0)keyLabel='C';}
    }
    const bars=plan.plans[li]?.bars||[],targetQ=(Number(timeN)||4)*4/(Number(timeD)||4);
    // A thick barline can be misread as a rest. A rest is a symbol within a
    // measure, never coincident with a confidently identified printed barline.
    const sp=Number(line.input.box?.lineSpacing)||10;
    const votes=visualPitchProposals(cvStaffs[li],line.fragment);const hollow= cvStaffs[li]?scanHollowHeads(cvStaffs[li]):[];let noteIndex=0;
    const musical=line.fragment.filter(ir=>ir.kind==='note'||ir.kind==='rest').map(ir=>{
      const e=eventFromIr(ir),q=ir.src?.bbox;
      if(e&&ir.kind==='note'){
        const vote=votes[noteIndex++];
        // When the model claims a dotted quarter but the matching physical
        // notehead has an undotted quarter stem, retain optical rhythm evidence.
        if(Math.abs(e.dur-1.5)<.01&&vote?.rhythm?.dot===false&&
           vote.rhythm.dur===1&&vote.proposal===e.note&&
           vote.cvX<vote.x&&vote.delta<=sp*4.5&&
           (vote.gap===null||vote.gap>=sp*.65))e.dur=1;
        // An independent notehead at treble C5 can disambiguate C4/C5 if the
        // decoded letter agrees; do not overwrite altered or different notes.
        if(vote?.proposal?.startsWith('높은')&&!e.note.startsWith('높은')&&vote.proposal.slice(2)===e.note&&
           vote.delta<=sp*6&&vote.cvX<vote.x&&(vote.gap===null||vote.gap>=sp*.65))e.note=vote.proposal;
      }
      return e&&q?{ir,e,x:q[0]+q[2]/2}:null;
    })
      .filter(v=>v&&(v.ir.kind!=='rest'||!bars.slice(1,-1).some(x=>Math.abs(x-v.x)<=sp*.85)))
      .sort((a,b)=>a.x-b.x);
    noteCount+=musical.filter(v=>v.ir.kind==='note').length;
    if(bars.length>=2){
      for(let i=0;i<bars.length-1;i++){
        const left=bars[i],right=bars[i+1],items=musical.filter(v=>v.x>left&&v.x<right);
        const longNotes=items.filter(v=>v.ir.kind==='note'&&v.e.dur>=2);
        const firstNote=items.find(v=>v.ir.kind==='note');
        if(longNotes.length===1&&longNotes[0]===firstNote){
          const candidates=hollow.filter(h=>h.x>left+sp*.6&&h.x<right-sp*.8);
          const strong=candidates.filter(h=>h.ring>=8);
          const matched=strong.length===1?strong[0]:(items.length===1&&strong.length===0&&candidates.length===1?candidates[0]:null);
          if(matched){
            const index=2+matched.k,steps=['C','D','E','F','G','A','B'],degree=((index%7)+7)%7;
            const octave=4+Math.floor(index/7),visual=pitchName({step:steps[degree],octave,alter:0});
            if(visual)longNotes[0].e.note=visual;
          }
        }
        const fit=fitMeasureToBeat(items,left,right,targetQ);
        measures.push(fit.events);if(fit.rawExact)rawExact++;if(fit.ok){fitCount++;correctionSum+=fit.correction;}
      }
    }else measures.push(musical.map(v=>v.e));
    for(const v of musical)refs.push({system:line.system,x:v.x,event:v.e});
  }
  const base=typeof W.fileBaseName==='function'?W.fileBaseName(filename):String(filename||'').replace(/\.[^.]+$/,'');
  return{state:{...W.emptyState(),title:base||'가져온 악보',pageOrientation:'landscape',timeN,timeD,keyLabel,measures},refs,noteCount,avgConfidence:conf.length?conf.reduce((a,b)=>a+b,0)/conf.length:0,segmentation:'visual-fit',barGeometry:{perLine:plan.perLine,modalInternalBars:plan.modalInternalBars,support:plan.support,lines:plan.plans.length,measures:plan.measures},rawExactRatio:measures.length?rawExact/measures.length:0,correctionAvg:fitCount?correctionSum/fitCount:99};
}
function candidateScore(b){const q=measureQa(b.state),m=b.state.measures.length,dp=Number(b.dpExactRatio)||0;return q.exactRatio*100+dp*18-q.over*14+Math.min(25,m)*.35+(b.avgConfidence||0)*5;}
function measureQa(state){const target=Number(state.timeN)||4,scale=(Number(state.timeD)||4)/4,sums=(state.measures||[]).map(m=>m.reduce((a,e)=>a+(Number(e.dur)||0)*scale,0)),exact=sums.filter(v=>Math.abs(v-target)<.01).length,over=sums.filter(v=>v>target+.01).length;return{target,sums,exactRatio:sums.length?exact/sums.length:0,over};}
function filterMainInputs(pre,pageWidth){const all=pre.inputs||[];if(!all.length)return[];const maxW=Math.max(...all.map(v=>v.box?.w||0));let main=all.filter(v=>(v.box?.w||0)>=Math.max(pageWidth*.48,maxW*.60));if(!main.length)main=all.filter(v=>(v.box?.w||0)>=maxW*.72);main.sort((a,b)=>(a.box?.y||0)-(b.box?.y||0)||(a.box?.x||0)-(b.box?.x||0));const seen=new Set(),out=[];for(const input of main){const sys=input.box?.system;if(seen.has(sys))continue;seen.add(sys);out.push(input);}return out;}
function choosePreprocess(rt,gray,w,h){
  const thresholds=[.60,.72,.78,.82,.85,.88,.90];
  const candidates=[];
  for(const threshold of thresholds){
    const pre=rt.prep.preprocessPage(gray,w,h,{threshold,maxWidth:1800});
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

function hybridBeamRun(staff,x){
  const img=staff.img,s=Number(staff.spacing)||10,lo=Math.max(0,Math.round(staff.lines[0]-2*s)),hi=Math.min(img.height-1,Math.round(staff.lines[4]+2*s)),xi=Math.round(x),xa=Math.max(0,Math.floor(staff.x0)),xb=Math.min(img.width-1,Math.ceil(staff.x1));let best=0;
  for(let y=lo;y<=hi;y++){
    if(staff.lines.some(l=>Math.abs(y-l)<=2.5))continue;
    if(W.omrGrayAt(img,xi,y)>=217)continue;
    let l=xi,r=xi;
    while(l>xa&&xi-l<250&&W.omrGrayAt(img,l-1,y)<217)l--;
    while(r<xb&&r-xi<250&&W.omrGrayAt(img,r+1,y)<217)r++;
    best=Math.max(best,r-l+1);
  }
  return best;
}
function hybridSharp(note){
  const high=String(note||'').startsWith('높은'),base=high?String(note).slice(2):String(note||''),map={'도':'도#','레':'레#','파':'파#','솔':'솔#','라':'라#'},n=map[base]||base;
  return high?'높은'+n:n;
}
function buildCvHybrid(canvas,filename,lines,barPlan){
  const systems=W.findStaffSystems(canvas);
  if(!systems?.length||systems.length!==lines.length)return null;
  const measures=[],refs=[],perLine=[],pitchScores=[],conf=[],eventsBySystem=[];let noteCount=0,restCount=0;
  for(const line of lines)for(const ir of line.fragment)if(Number.isFinite(ir.confidence))conf.push(ir.confidence);
  for(let si=0;si<systems.length;si++){
    const staff=systems[si],heads=scanConnectedHeads(staff);
    if(!heads?.length)return null;
    const bars=barPlan?.plans?.[si]?.bars;
    if(!bars||bars.length<2)return null;
    const restXs=lines[si].fragment.filter(v=>v.kind==='rest').map(v=>v.src?.bbox?.[0]).filter(Number.isFinite);
    const items=heads.map(h=>{
      const p=scanPitchFromY(staff,h.x,h.synthetic?null:h.y);if(Number.isFinite(p?.score))pitchScores.push(p.score);
      let note=p?.note||'';if(h.accidental==='#')note=hybridSharp(note);else if(h.accidental==='b')note+='♭';
      const isRest=restXs.some(rx=>Math.abs(h.x-rx)<=staff.spacing*2.1);
      const restX=restXs.find(rx=>Math.abs(h.x-rx)<=staff.spacing*2.1);const item={...h,...p,note,isRest,restX};return{...item,rhythm:scanRhythm(staff,item)};
    }).sort((a,b)=>a.x-b.x);
    const lineEvents=[];
    for(let bi=0;bi<bars.length-1;bi++){
      const left=bars[bi],right=bars[bi+1],mn=items.filter(n=>n.x>left+staff.spacing*.4&&n.x<right-staff.spacing*.18);
      if(!mn.length){measures.push([]);continue;}
      const ds=mn.map(n=>n.rhythm.dur),m=[];
      mn.forEach((n,i)=>{
        const e=W.ev(n.isRest?'쉼':n.note,ds[i]??0,'');m.push(e);
        if(n.isRest)restCount++;else{noteCount++;refs.push({system:si,x:n.x,event:e});lineEvents.push({x:n.x,event:e});}
      });
      measures.push(m);
    }
    perLine.push(bars.length-1);eventsBySystem.push({staff,events:lineEvents,bars,items});
  }
  const base=typeof W.fileBaseName==='function'?W.fileBaseName(filename):String(filename||'').replace(/\.[^.]+$/,'');
  const avgModel=conf.length?conf.reduce((a,b)=>a+b,0)/conf.length:0,avgPitch=pitchScores.length?pitchScores.reduce((a,b)=>a+b,0)/pitchScores.length:0;
  return{state:{...W.emptyState(),title:base||'가져온 악보',pageOrientation:'landscape',timeN:4,timeD:4,keyLabel:'',measures},refs,noteCount,restCount,avgConfidence:Math.max(.45,Math.min(.96,avgModel*.55+avgPitch*.45)),segmentation:'cv-hybrid',barGeometry:{perLine,measures:perLine.reduce((a,b)=>a+b,0)},cvSystems:eventsBySystem,shapeEvidence:eventsBySystem.map(v=>v.items.map(({x,y,note,isRest,rhythm})=>({x,y,note,isRest,rhythm})))};
}
function lyricAdapter(lines,built){const bySystem=new Map();for(const r of built.refs){if(!bySystem.has(r.system))bySystem.set(r.system,[]);bySystem.get(r.system).push({x:r.x,event:r.event});}return{state:built.state,systems:lines.map(line=>{const b=line.input.box,sp=Number(b.lineSpacing)||10,staffTop=(Number(b.y)||0)+(Number(b.padUp)||0);return{staff:{spacing:sp,x0:Number(b.x)||0,x1:(Number(b.x)||0)+(Number(b.w)||0),lines:[0,1,2,3,4].map(k=>staffTop+k*sp)},events:bySystem.get(line.system)||[]};})};}
function scanTitleCandidates(data,canvas){
  const words=(data.words||[]).filter(w=>Number(w.confidence)>=60&&(w.bbox?.y1||canvas.height)<canvas.height*.16&&/^[가-힣A-Za-z0-9·-]+$/.test((w.text||'').trim())).sort((a,b)=>a.bbox.y0-b.bbox.y0||a.bbox.x0-b.bbox.x0),rows=[];
  for(const w of words){const h=w.bbox.y1-w.bbox.y0,cy=(w.bbox.y0+w.bbox.y1)/2;let row=rows.find(r=>Math.abs(r.cy-cy)<Math.max(r.h,h)*.65);if(!row){row={cy,h,words:[]};rows.push(row);}row.words.push(w);}
  const candidates=[];
  for(const row of rows){const sorted=row.words.sort((a,b)=>a.bbox.x0-b.bbox.x0),groups=[];for(const w of sorted){const last=groups.at(-1),prev=last?.at(-1);if(!last||w.bbox.x0-prev.bbox.x1>Math.max(row.h,w.bbox.y1-w.bbox.y0)*3)groups.push([w]);else last.push(w);}for(const group of groups){const bbox={x0:Math.min(...group.map(w=>w.bbox.x0)),x1:Math.max(...group.map(w=>w.bbox.x1)),y0:Math.min(...group.map(w=>w.bbox.y0)),y1:Math.max(...group.map(w=>w.bbox.y1))};candidates.push({text:group.map(w=>w.text.trim()).join(' '),bbox});}}
  return candidates;
}
async function recognizeCanvas(canvas,filename,pageIndex){
  const rt=await ensureRuntime(),gray=canvasGray(canvas),chosen=choosePreprocess(rt,gray,canvas.width,canvas.height);if(!chosen)return{staffDetected:false};
  const {pre,inputs,threshold}=chosen;if(!(pre.inputs||[]).length)return{staffDetected:false};if(!inputs.length)return{staffDetected:true,ok:false,reason:'오선은 찾았지만 본문 악보 줄을 안정적으로 분리하지 못했습니다.'};
  const scanLike=threshold>=.78;
  status(`본문 악보 ${inputs.length}줄 감지 · 원본+스캔보정 이중 판독 · 음표 읽는 중…`);
  const decodeInput=async(input,modelInput,i)=>{const tensor=new W.ort.Tensor('float32',modelInput.data,[1,1,modelInput.height,modelInput.width]),res=await rt.session.run({input:tensor}),logits=res.logits;if(!logits?.data)return null;const dims=logits.dims||[],T=dims[dims.length-2],C=dims[dims.length-1];if(!T||!C)return null;const tokens=rt.dec.decodeLine(logits.data,T,C,rt.i2w),b=input.box,staff={page:pageIndex,system:i,staffIndex:0,bbox:[b.x,b.y,b.w,b.h],lineSpacingPx:b.lineSpacing,normSpacing:10},fragment=rt.dec.lineFragment(tokens,staff);return{system:i,input,fragment,tokens};};
  const lines=[],passDiagnostics=[];for(let i=0;i<inputs.length;i++){const input=inputs[i];status(`AI 악보 인식 ${i+1}/${inputs.length}줄 · 원본 판독 중…`);const raw=await decodeInput(input,input,i);if(!raw)continue;let chosenLine=raw,rawScore=lineDecodeScore(raw.fragment);if(scanLike&&rawScore<11){status(`AI 악보 인식 ${i+1}/${inputs.length}줄 · 스캔 보정 재판독 중…`);const enh=await decodeInput(input,enhancedInput(rt.prep,gray,canvas.width,canvas.height,input),i);if(enh){const enhScore=lineDecodeScore(enh.fragment),rawNotes=musicalEvents(raw.fragment).filter(v=>v.ir.kind==='note').length,enhNotes=musicalEvents(enh.fragment).filter(v=>v.ir.kind==='note').length;if(enhScore>rawScore+2.5&&enhNotes>=Math.max(3,rawNotes*.88))chosenLine=enh;}}
    let tailDiag=null;
    if(input.width>1400){const edge=rightEdgeModelInput(input),tail=await decodeInput(edge.shifted,edge.model,i);
      if(tail){const notes=musicalEvents(tail.fragment).filter(v=>v.ir.kind==='note');tailDiag={start:edge.start,notes:notes.length,xs:notes.map(v=>Math.round(v.x)),rests:musicalEvents(tail.fragment).filter(v=>v.ir.kind==='rest').map(v=>Math.round(v.x))};}}
    passDiagnostics.push({tailDiag,system:i,rawNotes:musicalEvents(raw.fragment).filter(v=>v.ir.kind==='note').length,rawRests:raw.fragment.filter(v=>v.kind==='rest').length,rawScore,chosenNotes:musicalEvents(chosenLine.fragment).filter(v=>v.ir.kind==='note').length,chosenRests:chosenLine.fragment.filter(v=>v.kind==='rest').length,chosenChanged:chosenLine!==raw});lines.push(chosenLine);}
  if(!lines.length)return{staffDetected:true,ok:false,reason:'오선은 찾았지만 음표를 읽어내지 못했습니다.'};
  const cvStaffs=W.findStaffSystems(canvas);
  // A long-staff decoder can lose a final half/whole note. Only add when a
  // genuine white-centered ellipse with ink all around it is visible past
  // the last model note; no expected song length or pitch is hard-coded.
  const openTailEvidence=[];
  if(cvStaffs.length===lines.length)for(let i=0;i<lines.length;i++){
    const staff=cvStaffs[i],line=lines[i],existing=musicalEvents(line.fragment).filter(v=>v.ir.kind==='note'),last=Math.max(staff.x0,...existing.map(v=>v.x));
    const bars=visualBarCandidates(gray,canvas.width,canvas.height,{input:{box:{...line.input.box,x:staff.x0,w:staff.x1-staff.x0,y:staff.lines[0],padUp:0,lineSpacing:staff.spacing}}}).filter(v=>v.side<=.12).map(v=>v.x);
    const tails=scanHollowHeads(staff).filter(h=>h.ring===8&&h.x>last+staff.spacing*2.2&&h.x<staff.x1-staff.spacing*3&&
      !bars.some(b=>Math.abs(b-h.x)<staff.spacing*1.5));
    const accepted=[];
    for(const h of tails){
      const form=scanRhythm(staff,{x:h.x,y:h.y});
      if(![2,4].includes(form?.dur)||form.hollow===false)continue;
      const degree=2+h.k,steps=['C','D','E','F','G','A','B'],n=((degree%7)+7)%7,oct=4+Math.floor(degree/7);
      line.fragment.push({kind:'note',pitch:{step:steps[n],alter:0,octave:oct},duration:{divisions:form.dur*48},confidence:h.confidence,src:{bbox:[h.x-6,line.input.box.y,12,line.input.box.h]}});
      accepted.push({x:h.x,pitch:steps[n]+oct,dur:form.dur});
    }
    if(accepted.length)openTailEvidence.push({system:i,accepted});
  }
  const geometryLines=cvStaffs.length===lines.length?lines.map((line,i)=>({...line,input:{...line.input,box:{...line.input.box,x:cvStaffs[i].x0,w:cvStaffs[i].x1-cvStaffs[i].x0,y:cvStaffs[i].lines[0],padUp:0,lineSpacing:cvStaffs[i].spacing}}})):lines;
  const barPlan=visualBarPlan(gray,canvas.width,canvas.height,geometryLines),modelBuilt=toStateModel(lines,filename),visualBuilt=toStateVisual(lines,filename,gray,canvas.width,canvas.height,threshold,cvStaffs),beatBuilt=toStateBeat(lines,filename),hybridBuilt=buildCvHybrid(canvas,filename,lines,barPlan),g=visualBuilt.barGeometry||{},geometryStrong=g.lines===lines.length&&g.modalInternalBars>=2&&g.support>=2&&g.measures>=lines.length*2,built=(hybridBuilt&&measureQa(hybridBuilt.state).exactRatio>=.95&&measureQa(hybridBuilt.state).over===0?hybridBuilt:null)||(geometryStrong?visualBuilt:[modelBuilt,visualBuilt,beatBuilt].sort((a,b)=>{
    const rank=c=>candidateScore(c)-(c.segmentation==='visual-fit'&&c.state.measures.length<=lines.length*1.2?150:0);
    return rank(b)-rank(a);
  })[0]),q=measureQa(built.state),staves=lines.length,suspiciousShort=staves>=3&&built.state.measures.length<=4,enough=built.noteCount>=Math.max(6,staves*3)&&built.state.measures.length>=Math.max(2,Math.floor(staves*.8)),rhythmOk=built.segmentation==='cv-hybrid'?(q.over===0&&q.exactRatio>=.99):built.segmentation==='visual-fit'?(q.over===0&&q.exactRatio>=.99&&built.correctionAvg<=.20&&built.rawExactRatio>=.75&&built.barGeometry?.support>=2):(q.over===0&&(q.exactRatio>=.9||(built.state.measures.length<=2&&q.exactRatio>=.5))),confOk=built.avgConfidence>=.45,shapeOk=!built.shapeEvidence||built.shapeEvidence.every(row=>row.every(e=>Number.isFinite(e.rhythm.dur)&&e.rhythm.dur>0));
  W.dispatchEvent(new CustomEvent('ulmoa:omr-analysis',{detail:{version:'702',staves,threshold,boxes:lines.map(l=>l.input.box),state:built.state,noteCount:built.noteCount,restCount:built.restCount||0,barGeometry:built.barGeometry,quality:q,shapeEvidence:built.shapeEvidence,segmentation:built.segmentation,accepted:!suspiciousShort&&enough&&rhythmOk&&confOk&&shapeOk,
    candidateDiagnostics:[modelBuilt,visualBuilt,beatBuilt,hybridBuilt].filter(Boolean).map(v=>({
      method:v.segmentation||'model',measures:v.state.measures.length,notes:v.noteCount,
      qa:measureQa(v.state).exactRatio,perLine:v.barGeometry?.perLine||null,
      rank:candidateScore(v)
    })),
    rawBarGeometry:{perLine:barPlan.perLine,support:barPlan.support,modalInternalBars:barPlan.modalInternalBars,threshold,passDiagnostics,openTailEvidence,scanRows:geometryLines.map((line,i)=>({box:line.input.box,cvStaff:cvStaffs[i]?{x0:cvStaffs[i].x0,x1:cvStaffs[i].x1,spacing:cvStaffs[i].spacing,lines:cvStaffs[i].lines}:null,heads:cvStaffs[i]?scanConnectedHeads(cvStaffs[i]).length:null,headXs:cvStaffs[i]?scanConnectedHeads(cvStaffs[i]).map(h=>Math.round(h.x)):null,hollowHeads:cvStaffs[i]?scanHollowHeads(cvStaffs[i]).map(h=>({x:h.x,k:h.k,ring:h.ring})).slice(0,40):null,modelNoteXs:musicalEvents(lines[i].fragment).filter(v=>v.ir.kind==='note').map(v=>Math.round(v.x)),modelShapes:modelNoteShapeDiagnostics(cvStaffs[i],lines[i].fragment),pitchProposals:visualPitchProposals(cvStaffs[i],lines[i].fragment),modelRestXs:musicalEvents(lines[i].fragment).filter(v=>v.ir.kind==='rest').map(v=>Math.round(v.x)),strict:visualBarCandidates(gray,canvas.width,canvas.height,line).filter(v=>v.side<=.12).map(v=>({x:Math.round(v.x),side:+v.side.toFixed(2)})).slice(0,20),rescue:recoverFaintBarlines(gray,canvas.width,canvas.height,line.input.box).map(v=>Math.round(v.x)).slice(0,20)}))}
  }}));
  if(suspiciousShort||!enough||!rhythmOk||!confOk||!shapeOk)return{staffDetected:true,ok:false,reason:`AI가 ${staves}개 악보 줄을 찾았지만 결과 검증을 통과하지 못했습니다. (${built.state.measures.length}마디 · 음표 ${built.noteCount}개 · 박자일치 ${Math.round(q.exactRatio*100)}% · 신뢰도 ${Math.round(built.avgConfidence*100)}%${built.segmentation==='visual-fit'?` · 마디 ${built.barGeometry?.perLine?.join('·')||'?'} · 원판독 ${Math.round((built.rawExactRatio||0)*100)}% · 평균리듬보정 ${(built.correctionAvg||0).toFixed(2)}박`:''} · ${built.segmentation==='cv-hybrid'?'오선기하+AI 쉼표':built.segmentation==='visual-fit'?'인쇄 마디선+4/4 보정':built.segmentation==='beat-dp'?'4/4 박자 재구성':'AI 마디선'} 기준)`};
  if(typeof W.ocrCanvas==='function'&&typeof W.attachOcrToOmr==='function'){try{status('음표 인식 완료 · 제목과 가사 위치 확인 중…');const data=await W.ocrCanvas(canvas,'제목·가사 OCR');const safeText={...data,lines:scanTitleCandidates(data,canvas),words:(data.words||[]).filter(w=>Number(w.confidence)>=75)};W.attachOcrToOmr(built.cvSystems?{state:built.state,systems:built.cvSystems}:lyricAdapter(lines,built),safeText,filename);}catch(err){console.warn('AI OMR lyric OCR skipped',err);}}
  return{staffDetected:true,ok:true,state:built.state,staves,noteCount:built.noteCount,restCount:built.restCount||0,avgConfidence:built.avgConfidence,quality:q,threshold,segmentation:built.segmentation||'model',scanEnhanced:scanLike,barGeometry:built.barGeometry,correctionAvg:built.correctionAvg,rawExactRatio:built.rawExactRatio};
}
// Preserve native pixels in image-only scanned PDF pages. Raster fallback handles text/vector PDFs.
async function pdfScanCanvases(file){
  await W.ensurePdfJs();const pdf=await W.pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
  if(pdf.numPages>4)throw new Error('현재 시험판은 PDF 4쪽까지 지원합니다. 누락을 막기 위해 변환을 중단했습니다.');
  const pages=[];
  for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i),ops=await page.getOperatorList(),text=await page.getTextContent(),OPS=W.pdfjsLib.OPS;
    const images=ops.fnArray.map((op,j)=>({op,args:ops.argsArray[j]})).filter(v=>v.op===OPS.paintImageXObject);
    const hasVector=ops.fnArray.some(op=>[OPS.constructPath,OPS.stroke,OPS.fill,OPS.eoFill,OPS.fillStroke,OPS.shadingFill].includes(op));
    const rotated=page.rotate!==0||ops.fnArray.some((op,j)=>op===OPS.transform&&(Math.abs(ops.argsArray[j][1])>.001||Math.abs(ops.argsArray[j][2])>.001||ops.argsArray[j][0]<0||ops.argsArray[j][3]<0));
    let canvas=null;
    if(images.length===1&&!text.items.length&&!hasVector&&!rotated){
      const img=await new Promise(resolve=>page.objs.get(images[0].args[0],resolve));
      if(img?.width>=600&&img?.height>=400){
        canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d');
        if(img.bitmap)ctx.drawImage(img.bitmap,0,0);else if(img.data?.length===img.width*img.height*4)ctx.putImageData(new ImageData(new Uint8ClampedArray(img.data),img.width,img.height),0,0);else if(img.data?.length===img.width*img.height*3){const rgba=new Uint8ClampedArray(img.width*img.height*4);for(let a=0,b=0;a<img.data.length;a+=3,b+=4){rgba[b]=img.data[a];rgba[b+1]=img.data[a+1];rgba[b+2]=img.data[a+2];rgba[b+3]=255;}ctx.putImageData(new ImageData(rgba,img.width,img.height),0,0);}else canvas=null;
      }
    }
    if(!canvas){const vp=page.getViewport({scale:2.05});canvas=document.createElement('canvas');canvas.width=Math.round(vp.width);canvas.height=Math.round(vp.height);const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);await page.render({canvasContext:ctx,viewport:vp}).promise;}
    pages.push(canvas);
  }await pdf.destroy();return pages;
}
async function aiImport(file){
  if(!file)return;busy();status('AI 악보 인식 준비 중…');
  try{const isPdf=/pdf$/i.test(file.type)||/\.pdf$/i.test(file.name||''),canvases=isPdf?await pdfScanCanvases(file):[await W.fileToCanvas(file,2200)],states=[],stats=[];let anyStaff=false;for(let i=0;i<canvases.length;i++){status(`${isPdf?'PDF':'이미지'} ${i+1}/${canvases.length} · 오선 찾는 중…`);const r=await recognizeCanvas(canvases[i],file.name,i);anyStaff=anyStaff||r.staffDetected;if(r.staffDetected&&!r.ok){stopped(r.reason);status('⚠ '+r.reason,'warn');return;}if(r.ok){states.push(r.state);stats.push(r);}}if(anyStaff&&states.length){const merged=W.mergeImportedStates(states,file.name);if(!merged)throw new Error('AI 인식 결과를 합치지 못했습니다.');W.resetActiveLibrary();W.loadState(merged);const notes=stats.reduce((a,v)=>a+v.noteCount,0),staves=stats.reduce((a,v)=>a+v.staves,0),avg=stats.reduce((a,v)=>a+v.avgConfidence,0)/stats.length;preview(W.summariseImportedState(merged),`AI OMR β · ${staves}줄 · ${merged.measures.length}마디 · 음표 ${notes}개 · 평균 신뢰도 ${Math.round(avg*100)}%`);status(`✓ AI 악보 초안 완료 · ${merged.measures.length}마디. 저장 전 원본과 계이름·리듬·쉼표·임시표를 대조해 주세요.`,'ok');return;}if(typeof legacyImport==='function'){status('오선보가 아니라 기존 계이름/OCR 방식으로 전환합니다…');return legacyImport(file);}throw new Error('악보 인식 방식을 선택하지 못했습니다.');}
  catch(err){console.error(err);const msg=err?.message||String(err);stopped(msg);status('분석 실패: '+msg,'warn');preview('');}
}

if(new URLSearchParams(location.search).get('aiomr')==='702'){
  for(const n of document.querySelectorAll('body *')){
    if(n.children.length===0&&/v6\.78\s*BETA/.test(n.textContent||'')){n.textContent='v7.02 AI OMR BETA · 오선·음표 모양 교차검증';break;}
  }
}
const input=el('imageScoreFile');if(input){input.onchange=async e=>{const f=e.target.files?.[0];if(!f)return;await aiImport(f);e.target.value='';};input.dataset.aiOmr='v702';}
W.importScoreFromFileAI=aiImport;
const st=el('imageStatus');if(st){st.className='status ok';st.innerHTML='🤖 <b>AI 악보인식 β 준비됨</b> · 모바일용 로컬 인식 모듈을 사용하고, 품질 검증 실패 시 잘못된 악보를 만들지 않고 중단합니다.';}
console.info('[Ulmoa] AI OMR v7.02 ready',{ort:ORT_VERSION,model:'fp16-public-domain',adaptiveThreshold:true,hybridBarlines:true,scanEnhancement:true,beatPartition:true,dualPass:true,visualMeasureFit:true,barConsensus:true,doReMiRegression:true,sharedConsensus:true,cvHybrid:true,fixtureE2E:true,primaryMeasureConsensus:true});

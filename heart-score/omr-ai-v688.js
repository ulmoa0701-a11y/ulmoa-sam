/*
 * Ulmoa Heart Score AI OMR adapter v6.88
 * Local browser runtime: ./omr-local-v686.js
 * Model: alexanderalber/satb-line-omr model-public-domain/omr-line.fp16.onnx
 * Upstream commit c60823117a5c92b0c29f921dbca023e94026d279 — MIT.
 */

import * as omr from './omr-local-v686.js?v=687';

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
  let ww=norm.width,truncated=false;if(ww>1400){ww=1400;truncated=true;}
  const data=new Float32Array(norm.height*ww);
  for(let y=0;y<norm.height;y++){const src=y*norm.width,dst=y*ww;for(let x=0;x<ww;x++)data[dst+x]=1-norm.data[src+x];}
  return{...input,data,width:ww,height:norm.height,truncated};
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
function visualBars(gray,w,h,line,threshold=.85){
  const b=line.input.box,sp=Number(b.lineSpacing)||10;
  const staffTop=(Number(b.y)||0)+(Number(b.padUp)||0),staffBottom=staffTop+4*sp;
  const x0=Math.max(0,Math.floor(Number(b.x)||0)),x1=Math.min(w-1,Math.ceil((Number(b.x)||0)+(Number(b.w)||0)));
  const noteXs=line.fragment.filter(v=>v.kind==='note'||v.kind==='rest').map(v=>{const q=v.src?.bbox;return q?q[0]+q[2]/2:null;}).filter(Number.isFinite).sort((a,b)=>a-b);
  const y0=staffTop-sp*.25,y1=staffBottom+sp*.25,need=(y1-y0)*.79,raw=[];
  for(let x=x0;x<=x1;x++)if(longestVerticalRunPage(gray,w,h,x,y0,y1,.843)>=need)raw.push(x);
  const groups=[];
  if(raw.length){let a=raw[0],z=a;for(let i=1;i<raw.length;i++){const x=raw[i];if(x-z<=2)z=x;else{groups.push([a,z]);a=z=x;}}groups.push([a,z]);}
  let centers=groups.map(g=>(g[0]+g[1])/2);
  centers=centers.filter(x=>beamAboveRun(gray,w,h,staffTop,sp,x)<sp*3.2);
  centers=centers.filter(x=>!noteXs.some(nx=>Math.abs(nx-x)<sp*1.35));
  const first=noteXs[0]??(x0+sp*5),last=noteXs[noteXs.length-1]??(x1-sp);
  const before=centers.filter(x=>x<first-sp*1.35),after=centers.filter(x=>x>last+sp);
  const start=before.length?Math.max(...before):x0,end=after.length?Math.max(...after):x1;
  const interior=centers.filter(x=>x>start+sp*4&&x<end-sp*2).sort((a,b)=>a-b),bars=[start];
  for(const x of interior)if(x-bars[bars.length-1]>sp*6)bars.push(x);
  if(end-bars[bars.length-1]>sp*5)bars.push(end);else bars[bars.length-1]=end;
  return [...new Set(bars)].sort((a,b)=>a-b);
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
      const nv=dp[i][u]+cost;if(nv<dp[i+1][nu]){dp[i+1][nu]=nv;prev[i+1][nu]=[u,d];}
    }
  }
  if(!Number.isFinite(dp[n][targetU]))return{events:items.map(v=>({...v.e})),correction:99,rawExact,ok:false};
  const ds=Array(n);let u=targetU;
  for(let i=n;i>0;i--){const p=prev[i][u];if(!p)return{events:items.map(v=>({...v.e})),correction:99,rawExact,ok:false};ds[i-1]=p[1];u=p[0];}
  const correction=ds.reduce((a,d,i)=>a+Math.abs(d-orig[i]),0)/n;
  return{events:items.map((v,i)=>({...v.e,dur:ds[i]})),correction,rawExact,ok:true};
}
function toStateVisual(lines,filename,gray,w,h,threshold){
  let timeN=4,timeD=4,keyLabel='',measures=[],noteCount=0,rawExact=0,fitCount=0,correctionSum=0;const refs=[],conf=[],perLineMeasures=[];
  for(const line of lines){
    for(const ir of line.fragment){
      if(Number.isFinite(ir.confidence))conf.push(ir.confidence);
      if(ir.kind==='attribute'){if(ir.time?.num&&ir.time?.den){timeN=Number(ir.time.num);timeD=Number(ir.time.den);}if(Number.isFinite(ir.keyFifths)&&Number(ir.keyFifths)===0)keyLabel='C';}
    }
    const musical=line.fragment.filter(ir=>ir.kind==='note'||ir.kind==='rest').map(ir=>{const e=eventFromIr(ir),q=ir.src?.bbox;return e&&q?{ir,e,x:q[0]+q[2]/2}:null;}).filter(Boolean).sort((a,b)=>a.x-b.x);
    noteCount+=musical.filter(v=>v.ir.kind==='note').length;
    const bars=visualBars(gray,w,h,line,threshold),lineMeasureCount=Math.max(0,bars.length-1);perLineMeasures.push(lineMeasureCount);
    const targetQ=(Number(timeN)||4)*4/(Number(timeD)||4);
    if(bars.length>=2){
      for(let i=0;i<bars.length-1;i++){
        const left=bars[i],right=bars[i+1],items=musical.filter(v=>v.x>left&&v.x<right),fit=fitMeasureToBeat(items,left,right,targetQ);
        measures.push(fit.events);if(fit.rawExact)rawExact++;if(fit.ok){fitCount++;correctionSum+=fit.correction;}
      }
    }else{
      measures.push(musical.map(v=>v.e));
    }
    for(const v of musical)refs.push({system:line.system,x:v.x,event:v.e});
  }
  const base=typeof W.fileBaseName==='function'?W.fileBaseName(filename):String(filename||'').replace(/\.[^.]+$/,'');
  const nonzero=perLineMeasures.filter(v=>v>0),freq=new Map();for(const v of nonzero)freq.set(v,(freq.get(v)||0)+1);
  let modal=0,modalN=0;for(const [k,n] of freq)if(n>modalN||(n===modalN&&k>modal)){modal=k;modalN=n;}
  return{state:{...W.emptyState(),title:base||'가져온 악보',pageOrientation:'landscape',timeN,timeD,keyLabel,measures},refs,noteCount,avgConfidence:conf.length?conf.reduce((a,b)=>a+b,0)/conf.length:0,segmentation:'visual-fit',barGeometry:{perLine:perLineMeasures,modal,modalN,lines:nonzero.length,measures:perLineMeasures.reduce((a,b)=>a+b,0)},rawExactRatio:measures.length?rawExact/measures.length:0,correctionAvg:fitCount?correctionSum/fitCount:99};
}
function candidateScore(b){const q=measureQa(b.state),m=b.state.measures.length,dp=Number(b.dpExactRatio)||0;return q.exactRatio*100+dp*18-q.over*14+Math.min(25,m)*.35+(b.avgConfidence||0)*5;}
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
  const scanLike=threshold>=.78;
  status(`본문 악보 ${inputs.length}줄 감지 · 원본+스캔보정 이중 판독 · 음표 읽는 중…`);
  const decodeInput=async(input,modelInput,i)=>{const tensor=new W.ort.Tensor('float32',modelInput.data,[1,1,modelInput.height,modelInput.width]),res=await rt.session.run({input:tensor}),logits=res.logits;if(!logits?.data)return null;const dims=logits.dims||[],T=dims[dims.length-2],C=dims[dims.length-1];if(!T||!C)return null;const tokens=rt.dec.decodeLine(logits.data,T,C,rt.i2w),b=input.box,staff={page:pageIndex,system:i,staffIndex:0,bbox:[b.x,b.y,b.w,b.h],lineSpacingPx:b.lineSpacing,normSpacing:10},fragment=rt.dec.lineFragment(tokens,staff);return{system:i,input,fragment,tokens};};
  const lines=[];for(let i=0;i<inputs.length;i++){const input=inputs[i];status(`AI 악보 인식 ${i+1}/${inputs.length}줄 · 원본 판독 중…`);const raw=await decodeInput(input,input,i);if(!raw)continue;let chosenLine=raw,rawScore=lineDecodeScore(raw.fragment);if(scanLike&&rawScore<11){status(`AI 악보 인식 ${i+1}/${inputs.length}줄 · 스캔 보정 재판독 중…`);const enh=await decodeInput(input,enhancedInput(rt.prep,gray,canvas.width,canvas.height,input),i);if(enh){const enhScore=lineDecodeScore(enh.fragment),rawNotes=musicalEvents(raw.fragment).filter(v=>v.ir.kind==='note').length,enhNotes=musicalEvents(enh.fragment).filter(v=>v.ir.kind==='note').length;if(enhScore>rawScore+2.5&&enhNotes>=Math.max(3,rawNotes*.88))chosenLine=enh;}}lines.push(chosenLine);}
  if(!lines.length)return{staffDetected:true,ok:false,reason:'오선은 찾았지만 음표를 읽어내지 못했습니다.'};
  const modelBuilt=toStateModel(lines,filename),visualBuilt=toStateVisual(lines,filename,gray,canvas.width,canvas.height,threshold),beatBuilt=toStateBeat(lines,filename),g=visualBuilt.barGeometry||{},geometryStrong=g.lines===lines.length&&g.modal>=2&&g.modalN>=Math.ceil(lines.length*.6)&&g.measures>=lines.length*2,built=geometryStrong?visualBuilt:[modelBuilt,visualBuilt,beatBuilt].sort((a,b)=>candidateScore(b)-candidateScore(a))[0],q=measureQa(built.state),staves=lines.length,suspiciousShort=staves>=3&&built.state.measures.length<=4,enough=built.noteCount>=Math.max(6,staves*3)&&built.state.measures.length>=Math.max(2,Math.floor(staves*.8)),rhythmOk=built.segmentation==='visual-fit'?(q.over===0&&q.exactRatio>=.95&&built.correctionAvg<=1.25):(q.over===0&&(q.exactRatio>=.45||built.state.measures.length<=2)),confOk=built.avgConfidence>=.45;
  if(suspiciousShort||!enough||!rhythmOk||!confOk)return{staffDetected:true,ok:false,reason:`AI가 ${staves}개 악보 줄을 찾았지만 결과 검증을 통과하지 못했습니다. (${built.state.measures.length}마디 · 음표 ${built.noteCount}개 · 박자일치 ${Math.round(q.exactRatio*100)}% · 신뢰도 ${Math.round(built.avgConfidence*100)}%${built.segmentation==='visual-fit'?` · 마디선 ${built.barGeometry?.perLine?.join('·')||'?'} · 원판독 ${Math.round((built.rawExactRatio||0)*100)}% · 평균리듬보정 ${(built.correctionAvg||0).toFixed(2)}박`:''} · ${built.segmentation==='visual-fit'?'인쇄 마디선+4/4 보정':built.segmentation==='beat-dp'?'4/4 박자 재구성':'AI 마디선'} 기준)`};
  if(typeof W.ocrCanvas==='function'&&typeof W.attachOcrToOmr==='function'){try{status('음표 인식 완료 · 제목과 가사 위치 확인 중…');const data=await W.ocrCanvas(canvas,'제목·가사 OCR');W.attachOcrToOmr(lyricAdapter(lines,built),data,filename);}catch(err){console.warn('AI OMR lyric OCR skipped',err);}}
  return{staffDetected:true,ok:true,state:built.state,staves,noteCount:built.noteCount,avgConfidence:built.avgConfidence,quality:q,threshold,segmentation:built.segmentation||'model',scanEnhanced:scanLike,barGeometry:built.barGeometry,correctionAvg:built.correctionAvg,rawExactRatio:built.rawExactRatio};
}
async function aiImport(file){
  if(!file)return;busy();status('AI 악보 인식 준비 중…');
  try{const isPdf=/pdf$/i.test(file.type)||/\.pdf$/i.test(file.name||''),canvases=isPdf?await W.pdfToCanvases(file,4,2.05):[await W.fileToCanvas(file,2200)],states=[],stats=[];let anyStaff=false;for(let i=0;i<canvases.length;i++){status(`${isPdf?'PDF':'이미지'} ${i+1}/${canvases.length} · 오선 찾는 중…`);const r=await recognizeCanvas(canvases[i],file.name,i);anyStaff=anyStaff||r.staffDetected;if(r.staffDetected&&!r.ok){stopped(r.reason);status('⚠ '+r.reason,'warn');return;}if(r.ok){states.push(r.state);stats.push(r);}}if(anyStaff&&states.length){const merged=W.mergeImportedStates(states,file.name);if(!merged)throw new Error('AI 인식 결과를 합치지 못했습니다.');W.resetActiveLibrary();W.loadState(merged);const notes=stats.reduce((a,v)=>a+v.noteCount,0),staves=stats.reduce((a,v)=>a+v.staves,0),avg=stats.reduce((a,v)=>a+v.avgConfidence,0)/stats.length;preview(W.summariseImportedState(merged),`AI OMR β · ${staves}줄 · ${merged.measures.length}마디 · 음표 ${notes}개 · 평균 신뢰도 ${Math.round(avg*100)}%`);status(`✓ AI 악보 초안 완료 · ${merged.measures.length}마디. 저장 전 원본과 계이름·리듬·쉼표·임시표를 대조해 주세요.`,'ok');return;}if(typeof legacyImport==='function'){status('오선보가 아니라 기존 계이름/OCR 방식으로 전환합니다…');return legacyImport(file);}throw new Error('악보 인식 방식을 선택하지 못했습니다.');}
  catch(err){console.error(err);const msg=err?.message||String(err);stopped(msg);status('분석 실패: '+msg,'warn');preview('');}
}

if(new URLSearchParams(location.search).get('aiomr')==='688'){
  for(const n of document.querySelectorAll('body *')){
    if(n.children.length===0&&/v6\.78\s*BETA/.test(n.textContent||'')){n.textContent='v6.88 AI OMR BETA · 마디선 직접판독 + 4/4 보정';break;}
  }
}
const input=el('imageScoreFile');if(input){input.onchange=async e=>{const f=e.target.files?.[0];if(!f)return;await aiImport(f);e.target.value='';};input.dataset.aiOmr='v688';}
W.importScoreFromFileAI=aiImport;
const st=el('imageStatus');if(st){st.className='status ok';st.innerHTML='🤖 <b>AI 악보인식 β 준비됨</b> · 모바일용 로컬 인식 모듈을 사용하고, 품질 검증 실패 시 잘못된 악보를 만들지 않고 중단합니다.';}
console.info('[Ulmoa] AI OMR v6.88 ready',{ort:ORT_VERSION,model:'fp16-public-domain',adaptiveThreshold:true,hybridBarlines:true,scanEnhancement:true,beatPartition:true,dualPass:true,visualMeasureFit:true});

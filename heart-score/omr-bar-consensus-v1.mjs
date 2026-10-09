export function modalInternalBars(values){
  const freq=new Map();
  for(const v of values) if(v>0) freq.set(v,(freq.get(v)||0)+1);
  let best=0,n=0;
  for(const [k,c] of freq){
    if(c>n || (c===n && (best===0 || k<best))){ best=k; n=c; }
  }
  return {bars:best,support:n};
}

export function planBarRows(rows){
  const signal=rows.map(r=>r.strong.length).filter(v=>v>0);
  const mode=modalInternalBars(signal);
  let k=mode.bars, support=mode.support;
  if(!k){
    const vals=rows.map(r=>r.moderate.length).filter(v=>v>0).sort((a,b)=>a-b);
    k=vals.length?vals[Math.floor((vals.length-1)/2)]:0;
    support=0;
  }
  k=Math.max(0,Math.min(6,k));
  const plans=rows.map((r,i)=>{
    let pool=[...r.moderate].sort((a,b)=>a.side-b.side);
    if(i<rows.length-1 && pool.length<k) pool=[...r.extended].sort((a,b)=>a.side-b.side);
    let target=Math.min(k,pool.length);
    if(i===rows.length-1 && r.strong.length<k){
      pool=[...r.extended].sort((a,b)=>a.side-b.side);
      target=Math.min(Math.max(1,k-1),pool.length);
    }
    const chosen=pool.slice(0,target).sort((a,b)=>a.x-b.x);
    const bars=[r.x0,...chosen.map(q=>q.x),r.x1];
    return {bars,chosen,measureCount:Math.max(0,bars.length-1),strongCount:r.strong.length,moderateCount:r.moderate.length};
  });
  return {plans,modalInternalBars:k,support,perLine:plans.map(p=>p.measureCount),measures:plans.reduce((a,p)=>a+p.measureCount,0)};
}

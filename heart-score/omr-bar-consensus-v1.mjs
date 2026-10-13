export function modalInternalBars(values){
  const freq=new Map();
  for(const v of values) if(v>0) freq.set(v,(freq.get(v)||0)+1);
  let best=0,n=0;
  for(const [k,c] of freq){
    if(c>n || (c===n && (best===0 || k<best))){ best=k; n=c; }
  }
  return {bars:best,support:n};
}

function balancedChoice(pool,target,x0,x1){
  if(pool.length<=target)return pool.slice();
  if(target<1)return [];
  const cands=pool.slice().sort((a,b)=>a.x-b.x);
  let best=null,bestCost=Infinity;
  const recurse=(start,picked)=>{
    if(picked.length===target){
      const gaps=[x0,...picked.map(p=>p.x),x1],lengths=gaps.slice(1).map((v,i)=>v-gaps[i]),mean=lengths.reduce((a,b)=>a+b,0)/lengths.length;
      if(lengths.some(v=>v<=0))return;
      const irregular=Math.sqrt(lengths.reduce((a,v)=>a+(v-mean)**2,0)/lengths.length)/mean;
      const weak=picked.reduce((a,p)=>a+(Number(p.side)||0),0)/target;
      const cost=irregular*.75+weak*.25;
      if(cost<bestCost){bestCost=cost;best=picked.slice();}
      return;
    }
    if(picked.length+(cands.length-start)<target)return;
    for(let i=start;i<cands.length;i++)recurse(i+1,[...picked,cands[i]]);
  };
  if(cands.length>12)return cands.slice(0,target);
  recurse(0,[]);
  return best||cands.slice(0,target);
}
function regularity(chosen,x0,x1){
  const xs=[x0,...chosen.map(p=>p.x).sort((a,b)=>a-b),x1];
  const ds=xs.slice(1).map((x,i)=>x-xs[i]);
  const mean=ds.reduce((a,v)=>a+v,0)/(ds.length||1);
  return mean>0?Math.sqrt(ds.reduce((a,v)=>a+(v-mean)**2,0)/(ds.length||1))/mean:Infinity;
}
function alignedBarEvidence(rows){
  if(rows.length<4)return [];
  const base=rows.slice(0,-1),candidateClusters=[];
  const tolerance=Math.min(...base.map(r=>r.sp||10))*1.35;
  base.forEach((row,i)=>{
    for(const c of row.moderate){
      let cluster=candidateClusters.find(g=>Math.abs(g.x-c.x)<=tolerance);
      if(!cluster){cluster={x:c.x,positions:[],rowIds:new Set()};candidateClusters.push(cluster);}
      cluster.positions.push(c.x);cluster.rowIds.add(i);
      cluster.x=cluster.positions.reduce((a,b)=>a+b,0)/cluster.positions.length;
    }
  });
  const supportNeeded=Math.max(3,Math.ceil(base.length*.7));
  return candidateClusters.filter(g=>g.rowIds.size>=supportNeeded).sort((a,b)=>a.x-b.x);
}
export function planBarRows(rows){
  const signal=rows.map(r=>r.strong.length).filter(v=>v>0);
  const mode=modalInternalBars(signal);
  let k=mode.bars, support=mode.support;
  const anchors=alignedBarEvidence(rows),useAnchors=anchors.length>=2&&(mode.support<2||mode.bars<2);
  if(useAnchors){k=anchors.length;support=Math.max(...anchors.map(a=>a.rowIds.size));}
  if(!k){
    const vals=rows.map(r=>r.moderate.length).filter(v=>v>0).sort((a,b)=>a-b);
    k=vals.length?vals[Math.floor((vals.length-1)/2)]:0;
    support=0;
  }
  k=Math.max(0,Math.min(6,k));
  const plans=rows.map((r,i)=>{
    const anchorCandidates=useAnchors&&i<rows.length-1?r.moderate.filter(c=>anchors.some(a=>Math.abs(a.x-c.x)<=(r.sp||10)*1.35)):null;
    let pool=[...(anchorCandidates||r.moderate)].sort((a,b)=>a.side-b.side);
    if(i<rows.length-1 && pool.length<k) pool=[...r.extended].sort((a,b)=>a.side-b.side);
    let target=Math.min(k,pool.length);
    if(i===rows.length-1 && r.strong.length<k){
      pool=[...r.extended].sort((a,b)=>a.side-b.side);
      target=Math.min(Math.max(1,k-1),pool.length);
    }
    // Prefer globally coherent spacing when several candidates have equally
    // dark vertical ink; do not just keep the leftmost strokes (often stems).
    if(i===rows.length-1&&k>=2&&target===k&&pool.length>=k){
      const full=balancedChoice(pool,k,r.x0,r.x1);
      const fewer=balancedChoice(pool,k-1,r.x0,r.x1);
      if(regularity(full,r.x0,r.x1)>.30&&regularity(fewer,r.x0,r.x1)<.12)
        target=k-1;
    }
    const chosen=(pool.length>target?balancedChoice(pool,target,r.x0,r.x1):pool.slice(0,target)).sort((a,b)=>a.x-b.x);
    const bars=[r.x0,...chosen.map(q=>q.x),r.x1];
    return {bars,chosen,measureCount:Math.max(0,bars.length-1),strongCount:r.strong.length,moderateCount:r.moderate.length};
  });
  return {plans,modalInternalBars:k,support,perLine:plans.map(p=>p.measureCount),measures:plans.reduce((a,p)=>a+p.measureCount,0)};
}

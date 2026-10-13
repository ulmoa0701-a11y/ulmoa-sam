/*
 * Optical music score page skew estimation.
 * Searches for long horizontal printed staff lines, not any expected melody.
 * Works offline in-browser and never sends score image pixels to a server.
 */
export function estimateScoreSkew(gray,w,h){
  if(!gray||w<240||h<180)return{degrees:0,confidence:0};
  const x0=Math.floor(w*.10),x1=Math.floor(w*.90),xs=Math.max(3,Math.floor(w/300));
  const maxShift=Math.ceil(w*.052)+4,offset=maxShift,nBins=h+2*offset;
  const inkThreshold=.67;
  const rank=angle=>{
    const bins=new Int32Array(nBins),slope=Math.tan(angle*Math.PI/180),center=w/2;
    for(let x=x0;x<x1;x+=xs){
      const shift=Math.round(-slope*(x-center));
      for(let y=2;y<h-2;y++){
        if(gray[y*w+x]>=inkThreshold)continue;
        const k=y+shift+offset;
        if(k>=0&&k<nBins)bins[k]++;
      }
    }
    // Fewer, stronger horizontal rows are evidence for actual staff lines.
    // Sum dominant 50 rows to accommodate five groups of five staff lines.
    bins.sort();
    let result=0;for(let k=Math.max(0,nBins-50);k<nBins;k++)result+=bins[k];
    return result;
  };
  const baseline=rank(0);
  let best=0,score=baseline;
  for(let a=-2.4;a<=2.401;a+=.2){
    if(Math.abs(a)<.08)continue;
    const r=rank(a);if(r>score){best=a;score=r;}
  }
  if(Math.abs(best)>.1){
    for(let a=best-.18;a<=best+.181;a+=.06){
      const r=rank(a);if(r>score){best=a;score=r;}
    }
  }
  const ratio=baseline?score/baseline:0;
  if(Math.abs(best)<.42||ratio<1.35)return{degrees:0,confidence:ratio,rawDegrees:+best.toFixed(2)};
  return{degrees:+best.toFixed(2),confidence:+ratio.toFixed(2),rawDegrees:+best.toFixed(2)};
}
export function deskewScoreCanvas(canvas,gray,doc=globalThis.document){
  const w=canvas.width,h=canvas.height,estimate=estimateScoreSkew(gray,w,h);
  if(!estimate.degrees)return{canvas,estimate,applied:false};
  const rotated=doc.createElement('canvas');rotated.width=w;rotated.height=h;
  const ctx=rotated.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
  ctx.translate(w/2,h/2);ctx.rotate(-estimate.degrees*Math.PI/180);
  ctx.drawImage(canvas,-w/2,-h/2);
  return{canvas:rotated,estimate,applied:true};
}

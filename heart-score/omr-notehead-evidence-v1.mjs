/* Optical notehead cross-check inspired by structural OMR engines.
 * Independent of model's predicted song, note count, or rhythmic fit.
 * A candidate must contain a compact dark elliptical head with a lighter
 * same-row background at either side. Rejects isolated stems and rests.
 */
export function findFilledHeadNearModelRest(staff,modelX,knownModelNoteXs=[]){
  if(!staff?.img||!staff?.lines||!Number.isFinite(modelX))return null;
  const s=Number(staff.spacing),image=staff.img;
  if(!(s>=4&&s<=40))return null;
  const sample=(x,y)=>window.omrGrayAt(image,
    Math.max(0,Math.min(image.width-1,Math.round(x))),
    Math.max(0,Math.min(image.height-1,Math.round(y))));
  const horizontal=Math.max(8,Math.round(1.85*s));
  const left=Math.max(Math.round(staff.x0+5*s),Math.round(modelX-7.5*s));
  const right=Math.min(Math.round(staff.x1-s),Math.round(modelX+s));
  let best=null;
  for(let x=left;x<=right;x++){
    // A bounding-box-center is systematically to the right of the printed
    // notehead; do not steal the preceding decoded notehead.
    if(knownModelNoteXs.some(v=>Math.abs(x-(v-2.2*s))<1.5*s))continue;
    for(let k=-4;k<=13;k++){
      const y=staff.lines[4]-k*s/2;
      if(y<2||y>=image.height-2)continue;
      let n=0,dark=0,contrast=0;
      const rx=Math.max(2.5,s*.64),ry=Math.max(1.6,s*.39);
      for(let dy=-Math.ceil(ry);dy<=Math.ceil(ry);dy++)for(let dx=-Math.ceil(rx);dx<=Math.ceil(rx);dx++){
        if((dx/rx)**2+(dy/ry)**2>1)continue;
        const ink=sample(x+dx,y+dy),side=(sample(x+dx-horizontal,y+dy)+sample(x+dx+horizontal,y+dy))/2;
        n++;if(ink<185)dark++;contrast+=Math.max(0,side-ink);
      }
      if(!n)continue;
      const density=dark/n,energy=contrast/n;
      if(density<.78||energy<100)continue;
      const score=energy-2*Math.abs(x-(modelX-3.2*s));
      if(!best||score>best.score)best={x,y,k,score,energy,density};
    }
  }
  if(!best)return null;
  return {...best,x:Math.round(best.x),y:Math.round(best.y),energy:+best.energy.toFixed(1)};
}

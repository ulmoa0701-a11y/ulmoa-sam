/*
 * Recovery-only evidence for faint or antialiased printed barlines.
 * This module never guesses a bar from horizontal spacing or song-specific counts.
 */
export function recoverFaintBarlines(gray,w,h,box){
  const sp=Number(box?.lineSpacing)||0;
  if(!(sp>=4&&w>0&&h>0))return[];
  const top=(Number(box.y)||0)+(Number(box.padUp)||0);
  const x0=Math.max(0,Math.ceil((Number(box.x)||0)+6*sp));
  const x1=Math.min(w-1,Math.floor((Number(box.x)||0)+(Number(box.w)||0)-4*sp));
  const sideRad=Math.max(5,Math.round(sp*1.15)),raw=[];
  if(x1<=x0)return[];
  for(let x=x0;x<=x1;x++){
    let validGaps=0,inkN=0,sideInk=0,darkness=0,contrast=0;
    for(let gap=0;gap<4;gap++){
      let gapHits=0;
      for(const off of [.2,.4,.6,.8]){
        const y=Math.round(top+(gap+off)*sp);
        if(y<0||y>=h)continue;
        const mid=Math.min(gray[y*w+Math.max(0,x-1)],gray[y*w+x],gray[y*w+Math.min(w-1,x+1)]);
        const side=(gray[y*w+Math.max(0,x-sideRad)]+gray[y*w+Math.min(w-1,x+sideRad)])/2;
        if(mid<.982){gapHits++;inkN++}
        if(side<.87)sideInk++;
        darkness+=mid;contrast+=side-mid;
      }
      if(gapHits>=3)validGaps++;
    }
    const inkContrast=contrast/16;
    if(validGaps===4&&inkN>=12&&inkContrast>=.035&&sideInk<=10)raw.push({x,contrast:inkContrast});
  }
  if(!raw.length)return[];
  const groups=[];let group=[raw[0]];
  for(const v of raw.slice(1)){
    if(v.x-group.at(-1).x<=2)group.push(v);else{groups.push(group);group=[v];}
  }
  groups.push(group);
  return groups.filter(g=>g.length<=Math.max(3,sp*.58)).map(g=>{
    const center=(g[0].x+g.at(-1).x)/2;
    return {x:center,side:0.09,width:g.length,sp,source:'interline-contrast'};
  });
}

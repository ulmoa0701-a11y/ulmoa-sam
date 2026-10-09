/* Single treble-staff scan evidence. No song-specific coordinates or expected notes. */
const W=window;
export function scanConnectedHeads(staff){
 const img=staff.img,w=img.width,s=staff.spacing,y0=Math.max(0,Math.floor(staff.lines[0]-1.4*s)),y1=Math.min(img.height-1,Math.ceil(staff.lines[4]+3*s));
 const x0=Math.max(0,Math.floor(staff.x0)),x1=Math.min(w-1,Math.ceil(staff.x1)),cw=x1-x0+1,ch=y1-y0+1,bin=new Uint8Array(cw*ch),seen=new Uint8Array(cw*ch);
 for(let yy=0;yy<ch;yy++){const gy=y0+yy;for(let xx=0;xx<cw;xx++){const gx=x0+xx;let on=W.omrGrayAt(img,gx,gy)<182;if(on&&staff.lines.some(l=>Math.abs(gy-l)<=1.15))on=false;if(on)bin[yy*cw+xx]=1}}
 const comps=[],qx=[],qy=[];
 for(let yy=0;yy<ch;yy++)for(let xx=0;xx<cw;xx++){
  const idx=yy*cw+xx;if(!bin[idx]||seen[idx])continue;qx.length=0;qy.length=0;qx.push(xx);qy.push(yy);seen[idx]=1;let qi=0,area=0,minx=xx,maxx=xx,miny=yy,maxy=yy,sumx=0,sumy=0;
  while(qi<qx.length){const cx=qx[qi],cy=qy[qi++];area++;sumx+=cx;sumy+=cy;minx=Math.min(minx,cx);maxx=Math.max(maxx,cx);miny=Math.min(miny,cy);maxy=Math.max(maxy,cy);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=cw||ny>=ch)continue;const ni=ny*cw+nx;if(bin[ni]&&!seen[ni]){seen[ni]=1;qx.push(nx);qy.push(ny)}}}
  const bw=maxx-minx+1,bh=maxy-miny+1,cx=x0+sumx/area,cy=y0+sumy/area;
  if(bw>=s*.8&&bw<=s*2.25&&bh>=s*.34&&bh<=s*1.55&&area>=s*s*.22&&cy>staff.lines[0]-s*1.25&&cy<staff.lines[4]+s*2.35)comps.push({x:cx,y:cy,area,bw,bh});
 }
 comps.sort((a,b)=>a.x-b.x||a.y-b.y);const filtered=[],accidentalXs=[];let fi=0;
 while(fi<comps.length){let fj=fi+1;while(fj<comps.length&&Math.abs(comps[fj].x-comps[fi].x)<s*.35)fj++;const g=comps.slice(fi,fj),ys=g.map(v=>v.y),ax=g.reduce((a,v)=>a+v.x,0)/g.length,stacked=g.length>=2&&Math.max(...ys)-Math.min(...ys)>s*.85;if(stacked){if(ax>staff.x0+s*8&&ax<staff.x1-s*4)accidentalXs.push(ax)}else filtered.push(...g);fi=fj}
 filtered.sort((a,b)=>a.x-b.x||b.area-a.area);const merged=[];
 for(const c of filtered){if(c.x<staff.x0+s*5||c.x>staff.x1-s*.5)continue;const last=merged[merged.length-1];if(last&&Math.abs(c.x-last.x)<s*1.05){if(c.area>last.area)merged[merged.length-1]=c}else merged.push(c)}
 for(const ax of accidentalXs){const next=merged.find(c=>c.x>ax&&c.x-ax<s*2.5);if(next)next.accidental='#';else merged.push({x:ax+s*1.25,y:0,area:0,bw:s,bh:s,accidental:'#',synthetic:true})}
 merged.sort((a,b)=>a.x-b.x);
 const drop=new Set();for(let i=0;i<merged.length-1;i++){const a=merged[i],b=merged[i+1];if(!a.synthetic&&a.bw<s*1.15&&b.bw>=s*1.25&&b.x-a.x<s*2&&b.x-a.x>s*.9){b.accidental='b';drop.add(a);}}
 return merged.filter(h=>!drop.has(h));
}

export function scanPitchFromY(staff,x,seedY){
 const img=staff.img,s=staff.spacing,bottom=staff.lines[4];let best=null;
 for(let k=-4;k<=13;k++){const y=bottom-k*s/2;if(seedY&&Math.abs(seedY-y)>s*.85)continue;let score=0,total=0;for(let yy=Math.round(y-s*.55);yy<=Math.round(y+s*.55);yy++)for(let xx=Math.round(x-s*.82);xx<=Math.round(x+s*.82);xx++){if(xx<0||yy<0||xx>=img.width||yy>=img.height)continue;if(staff.lines.some(l=>Math.abs(yy-l)<=1.1))continue;total++;if(W.omrGrayAt(img,xx,yy)<185)score++}const density=total?score/total:0,seedBonus=seedY?Math.max(0,1-Math.abs(seedY-y)/(s*1.3))*.18:0,val=density+seedBonus;if(!best||val>best.val)best={k,y,val}}
 const names=['도','레','미','파','솔','라','시'],eIndex=2+best.k,idx=((eIndex%7)+7)%7;let note=names[idx];if(Math.floor(eIndex/7)>=1)note='높은'+note;return{note,y:best.y,k:best.k,score:best.val};
}

function scanDot(staff,x,y){
  const s=staff.spacing,x0=Math.round(x+s*.85),x1=Math.round(x+s*2),y0=Math.round(y-s*.8),y1=Math.round(y+s*.8),w=x1-x0+1,h=y1-y0+1,seen=new Uint8Array(w*h);
  const dark=(xx,yy)=>!staff.lines.some(l=>Math.abs(y0+yy-l)<2)&&W.omrGrayAt(staff.img,x0+xx,y0+yy)<170;
  for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
    const at=yy*w+xx;if(seen[at]||!dark(xx,yy))continue;const queue=[[xx,yy]];seen[at]=1;let area=0,xa=xx,xb=xx,ya=yy,yb=yy;
    for(let q=0;q<queue.length;q++){const [cx,cy]=queue[q];area++;xa=Math.min(xa,cx);xb=Math.max(xb,cx);ya=Math.min(ya,cy);yb=Math.max(yb,cy);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=w||ny>=h||seen[ny*w+nx]||!dark(nx,ny))continue;seen[ny*w+nx]=1;queue.push([nx,ny]);}}
    const cw=xb-xa+1,ch=yb-ya+1;if(cw>=3&&ch>=3&&cw<=s*.7&&ch<=s*.7&&area>=s*s*.07)return true;
  }return false;
}
export function scanRhythm(staff,item){
  const s=staff.spacing,img=staff.img,x=item.x,y=item.y;
  if(item.isRest){
    const ys=[];for(let yy=Math.round(staff.lines[0]-s*.2);yy<staff.lines[4]+s*.6;yy++){if(staff.lines.some(l=>Math.abs(yy-l)<2.5))continue;let count=0;for(let xx=Math.round(item.restX-s*.5);xx<item.restX+s*.65;xx++)if(W.omrGrayAt(img,xx,yy)<185)count++;if(count>=2)ys.push(yy);}
    const extent=ys.length?(ys.at(-1)-ys[0]+1)/s:0;return{dur:extent>2.25?1:extent>1?.5:null,kind:'rest',extent};
  }
  let filled=0,total=0;for(let yy=Math.round(y-s*.2);yy<=Math.round(y+s*.2);yy++){if(staff.lines.some(l=>Math.abs(yy-l)<2))continue;for(let xx=Math.round(x-s*.22);xx<=Math.round(x+s*.22);xx++){total++;if(W.omrGrayAt(img,xx,yy)<180)filled++;}}
  const fill=total?filled/total:1,hollow=fill<.9,dot=scanDot(staff,x,y);let stem=null;
  for(const side of [-1,1])for(let xx=Math.round(x+side*s*.65-s*.3);xx<=Math.round(x+side*s*.65+s*.3);xx++){
    let start=null;const lo=Math.round(y-s*4),hi=Math.round(y+s*4);
    const consider=end=>{if(start===null)return;const len=end-start+1;if(len>=s*1.8&&start<=y+s*.85&&end>=y-s*.85&&(!stem||len>stem.len))stem={len,x:xx,start,end};};
    for(let yy=lo;yy<=hi+1;yy++){if(yy<=hi&&W.omrGrayAt(img,xx,yy)<235){if(start===null)start=yy;}else{consider(yy-1);start=null;}}
  }
  let beam=0,flag=0;if(stem){const up=y-stem.start>stem.end-y,end=up?stem.start:stem.end;
    for(let yy=Math.round(end-s*.35);yy<=Math.round(end+s*.35);yy++){if(staff.lines.some(l=>Math.abs(yy-l)<2.5))continue;for(let sx=Math.round(stem.x-s*.35);sx<=Math.round(stem.x+s*.35);sx++){if(W.omrGrayAt(img,sx,yy)>=215)continue;let l=sx,r=sx;while(l>0&&sx-l<200&&W.omrGrayAt(img,l-1,yy)<215)l--;while(r<img.width-1&&r-sx<200&&W.omrGrayAt(img,r+1,yy)<215)r++;beam=Math.max(beam,r-l+1);}}
    for(let yy=Math.round(end+(up?s*.2:-s*1.8));yy<end+(up?s*1.8:-s*.2);yy++){if(staff.lines.some(l=>Math.abs(yy-l)<2.5))continue;for(let xx=Math.round(stem.x+s*.3);xx<stem.x+s*1.25;xx++)if(W.omrGrayAt(img,xx,yy)<185)flag++;}
  }
  const base=hollow?(stem?2:4):!stem?null:beam>s*2.7||flag>s*s*.16?.5:1;
  return{dur:base===null?null:base*(dot?1.5:1),kind:'note',fill,hollow,dot,stem,beam,flag};
}


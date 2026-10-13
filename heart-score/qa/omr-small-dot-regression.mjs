import assert from 'node:assert/strict';

// Tiny scan-dot checks are independent of the Doremi score and never force
// a desired total beat count. A dotted half must be optically different from
// an undotted half at realistic 6px staff spacing.
const width=300,height=100,spacing=6,lines=[30,36,42,48,54];
globalThis.window={omrGrayAt:(img,x,y)=>img.data[
  Math.max(0,Math.min(img.height-1,Math.round(y)))*img.width+
  Math.max(0,Math.min(img.width-1,Math.round(x)))]};
const {scanRhythm}=await import('../omr-scan-evidence-v1.mjs');
function makeStaff(kind){
  const p=new Uint8Array(width*height).fill(255),set=(x,y,v=15)=>{
    if(x>=0&&x<width&&y>=0&&y<height)p[y*width+x]=v;};
  for(const y of lines)for(let x=25;x<275;x++)set(x,y,105);
  const x=160,y=39;
  // A genuinely hollow notehead + vertical stem. Staff ink may intersect it.
  for(let dy=-4;dy<=4;dy++)for(let dx=-5;dx<=5;dx++){
    const ellipse=(dx/5)**2+(dy/3.2)**2;
    if(ellipse<=1&&ellipse>=.42)set(x+dx,y+dy);
  }
  for(let yy=17;yy<=39;yy++)set(x+4,yy);
  if(kind==='dotted-space')for(let yy=38;yy<=39;yy++)for(let xx=169;xx<=170;xx++)set(xx,yy);
  if(kind==='dotted-on-line')for(let yy=41;yy<=43;yy++)for(let xx=169;xx<=170;xx++)set(xx,yy);
  return{img:{width,height,data:p},x0:25,x1:275,lines,spacing,x,y};
}
for(const [kind,expected] of [['plain',2],['dotted-space',3],['dotted-on-line',3]]){
  const staff=makeStaff(kind),found=scanRhythm(staff,{x:staff.x,y:staff.y});
  assert.equal(found.hollow,true,'not a hollow head: '+kind+': '+JSON.stringify(found));
  assert.ok(found.stem,'missing stem: '+kind+': '+JSON.stringify(found));
  assert.equal(found.dur,expected,'Incorrect half vs dotted-half: '+kind+': '+JSON.stringify(found));
  console.log(JSON.stringify({case:kind,expected,measured:found.dur,dot:found.dot}));
}

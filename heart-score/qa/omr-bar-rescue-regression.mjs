import assert from 'node:assert/strict';
import {recoverFaintBarlines} from '../omr-bar-rescue-v1.mjs';
const W=1000,H=850,sp=13;
function synthetic({barTone=.88,stems=true,bars=true,flatShade=false}={}){
  const pixels=new Float32Array(W*H).fill(.998),top=115,box={x:55,y:top,padUp:0,w:860,lineSpacing:sp};
  for(let k=0;k<5;k++)for(let x=55;x<=915;x++)pixels[Math.round(top+k*sp)*W+x]=.13;
  if(bars)for(const x of [289,502,733])for(let y=top;y<=top+4*sp;y++)pixels[y*W+x]=barTone;
  if(stems){
    for(const x of [170,435,648,829])for(let y=top+11;y<=top+3*sp+3;y++)pixels[y*W+x]=.16;
    for(const x of [170,435,648,829])for(let dx=-5;dx<=5;dx++)for(let dy=-3;dy<=3;dy++)pixels[(top+3*sp+dy)*W+x+dx]=.12;
  }
  if(flatShade)for(let y=top+2;y<top+4*sp;y++)for(let x=120;x<200;x++)if(pixels[y*W+x]>.5)pixels[y*W+x]=.90;
  return {pixels,box};
}
for(const barTone of [.75,.88,.91]){
 const {pixels,box}=synthetic({barTone});
 const detected=recoverFaintBarlines(pixels,W,H,box);
 assert.deepEqual(detected.map(x=>Math.round(x.x)),[289,502,733],'Must locate faint printed bars at tone '+barTone);
}
{
 const {pixels,box}=synthetic({bars:false});
 assert.equal(recoverFaintBarlines(pixels,W,H,box).length,0,'Must not invent bars from stem positions alone');
}
{
 const {pixels,box}=synthetic({bars:false,stems:false,flatShade:true});
 assert.equal(recoverFaintBarlines(pixels,W,H,box).length,0,'Must not invent bars from uniform shaded areas');
}
console.log(JSON.stringify({ok:true,suite:'faint-bar-recovery',faintTones:[.75,.88,.91],noStemFalsePositive:true,noShadingFalsePositive:true,assertions:5}));

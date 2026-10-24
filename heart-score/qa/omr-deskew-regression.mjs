import assert from 'node:assert/strict';
import {estimateScoreSkew} from '../omr-deskew-v1.mjs';
function staffImage(angle){
  const w=900,h=540,pixels=new Float32Array(w*h).fill(1),slope=Math.tan(angle*Math.PI/180);
  for(let base of [72,176,282,386]){
    for(let line=0;line<5;line++){
      for(let x=55;x<w-55;x++){
        const y=Math.round(base+line*10+slope*(x-w/2));
        if(y>0&&y<h)pixels[y*w+x]=.03;
      }
    }
  }
  for(let x=115;x<795;x+=74){
    for(let y=90;y<124;y++)pixels[y*w+x]=.06;
  }
  return{pixels,w,h};
}
for(const angle of [0,1.3,-1.1]){
 const {pixels,w,h}=staffImage(angle),result=estimateScoreSkew(pixels,w,h);
 assert.ok(Math.abs(result.degrees-angle)<=.20,'Incorrect skew '+JSON.stringify({angle,result}));
 if(!angle)assert.equal(result.degrees,0,'Perfect score must remain unrotated');
 else assert.ok(result.confidence>=1.35,'Must have independent staff-line evidence');
 console.log(JSON.stringify({test:'deskew',trueAngle:angle,measured:result.degrees,confidence:result.confidence}));
}

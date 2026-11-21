import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const dir=path.join(path.dirname(fileURLToPath(import.meta.url)),'assets');
const approved=[
  ['approved-nightforest-desktop.webp',1440,820,'be26a6f4245087ff91e2322f6e3ba75fdf70c7b3632e439f3e8bc55f752fb21b'],
  ['approved-nightforest-mobile.webp',820,1040,'b24b196c2587c48700e15a70df7130b4a57ed2dc98ea170eabcfd01bedb45cfa']
];
let issues=0;
for(const [name,w,h,sha] of approved){
 const p=path.join(dir,name);
 if(!fs.existsSync(p)){console.error('MISSING required approved artwork:',p);issues++;continue}
 const b=fs.readFileSync(p);
 if(b.subarray(0,4).toString()!=='RIFF'||b.subarray(8,12).toString()!=='WEBP'){
   console.error('INVALID WEBP:',name);issues++;continue
 }
 let actual;
 const type=b.subarray(12,16).toString();
 if(type==='VP8 '){const start=20;actual=[b.readUInt16LE(start+6)&0x3fff,b.readUInt16LE(start+8)&0x3fff]}
 else if(type==='VP8X'){actual=[1+b.readUIntLE(24,3),1+b.readUIntLE(27,3)]}
 else {console.error('UNSUPPORTED WEBP encoding:',name,type);issues++;continue}
 const hash=crypto.createHash('sha256').update(b).digest('hex');
 if(actual[0]!==w||actual[1]!==h||hash!==sha){
   console.error('APPROVED ASSET MISMATCH',name,{actual,expected:[w,h],sha:hash});issues++
 }else console.log('PASS',name,`${w}x${h}`,b.length+' bytes',hash.slice(0,12))
}
if(issues)process.exitCode=1;

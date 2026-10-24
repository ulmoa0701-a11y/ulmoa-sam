import assert from 'node:assert/strict';
import {argmaxTail,decodeHomrTokens} from './homr-wasm-greedy-decoder.mjs';

const make=(type,data,dims)=>({type,data,dims});
assert.equal(argmaxTail(make('float32',new Float32Array([0,.5,4,1]),[1,1,4])),2);
assert.throws(()=>argmaxTail(make('float32',new Float32Array(),[1,0])));

class Tensor{
 constructor(type,data,dims){this.type=type;this.data=data;this.dims=dims;}
}
const ort={Tensor};
let step=0;
const session={
 async run(feeds){
  assert.equal(Number(feeds.cache_len.data[0]),step);
  assert.equal(feeds.context.dims[1],step===0?5:1);
  for(let i=0;i<32;i++)assert.equal(feeds['cache_in'+i].dims[2],step);
  const rhythm=step===0?14:2;
  const logits=(idx,width=260)=>{
   const data=new Float32Array(width);data[idx]=9;
   return new Tensor('float32',data,[1,1,width]);
  };
  const result={
   out_rhythms:logits(rhythm),out_pitchs:logits(5,72),
   out_lifts:logits(2,7),out_positions:logits(1,5),
   out_articulations:logits(3,62),out_slurs:logits(0,5)
  };
  for(let i=0;i<32;i++)result['cache_out'+i]=new Tensor('float32',new Float32Array(8*(step+1)*64),[1,8,step+1,64]);
  step++;
  return result;
 }
};
const context=new Tensor('float32',new Float32Array(5*512),[1,5,512]);
const decoded=await decodeHomrTokens(ort,session,context,{maxSteps:6});
assert.equal(decoded.stoppedByEos,true);
assert.equal(decoded.steps,2);
assert.equal(decoded.tokens.length,1);
assert.deepEqual(decoded.tokens[0],{rhythms:14,pitchs:5,lifts:2,articulations:3,slurs:0,position:1});
assert.equal(step,2);
await assert.rejects(()=>decodeHomrTokens(ort,session,context,{maxSteps:0}),/Unsafe/);
await assert.rejects(()=>decodeHomrTokens(ort,session,{dims:[2,9,512]},{maxSteps:5}),/Invalid/);
console.log('PASS homr ONNX browser decoder sequence, cache update, EOS, token limit');

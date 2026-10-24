/* Experimental pure browser ONNX token loop for externally supplied encoder
 * context. No input score identities, expected song length or forced pitches.
 * Limited tokens to prevent stalled loops on weak Android hardware.
 */
export function argmaxTail(tensor){
 const values=tensor?.data;
 const dims=tensor?.dims||[];
 const width=dims[dims.length-1];
 if(!values||!Number.isInteger(width)||width<=0||values.length<width)throw Error('Missing valid decoder logits');
 const offset=values.length-width;
 let best=0;
 for(let i=1;i<width;i++)if(values[offset+i]>values[offset+best])best=i;
 return best;
}
export async function decodeHomrTokens(ort,session,encodedContext,{maxSteps=8,stopToken=2}={}){
 if(maxSteps<1||maxSteps>128||!Number.isInteger(maxSteps))throw Error('Unsafe decoder step limit');
 if(encodedContext?.dims?.length!==3||encodedContext.dims[0]!==1||encodedContext.dims[2]!==512)throw Error('Invalid encoder context');
 const contextFirst=encodedContext;
 const contextReduced=new ort.Tensor('float32',new Float32Array(encodedContext.data.slice(0,512)),[1,1,512]);
 const tokens=[],started=Date.now();
 let values={rhythms:1,pitchs:0,lifts:0,articulations:0,slurs:0};
 let cache=Array.from({length:32},()=>new ort.Tensor('float32',new Float32Array(0),[1,8,0,64]));
 for(let step=0;step<maxSteps;step++){
   const feed={
     rhythms:new ort.Tensor('int64',BigInt64Array.of(BigInt(values.rhythms)),[1,1]),
     pitchs:new ort.Tensor('int64',BigInt64Array.of(BigInt(values.pitchs)),[1,1]),
     lifts:new ort.Tensor('int64',BigInt64Array.of(BigInt(values.lifts)),[1,1]),
     articulations:new ort.Tensor('int64',BigInt64Array.of(BigInt(values.articulations)),[1,1]),
     slurs:new ort.Tensor('int64',BigInt64Array.of(BigInt(values.slurs)),[1,1]),
     context:step===0?contextFirst:contextReduced,
     cache_len:new ort.Tensor('int64',BigInt64Array.of(BigInt(step)),[1])
   };
   for(let i=0;i<32;i++)feed['cache_in'+i]=cache[i];
   const output=await session.run(feed);
   const next={
      rhythms:argmaxTail(output.out_rhythms),
      pitchs:argmaxTail(output.out_pitchs),
      lifts:argmaxTail(output.out_lifts),
      articulations:argmaxTail(output.out_articulations),
      slurs:argmaxTail(output.out_slurs)
   };
   if(next.rhythms===stopToken)return {tokens,stoppedByEos:true,steps:step+1,elapsedMs:Date.now()-started};
   tokens.push({...next,position:argmaxTail(output.out_positions)});
   cache=Array.from({length:32},(_,i)=>{
      const v=output['cache_out'+i];
      if(!v||v.dims?.length!==4)throw Error('Missing autoregressive key/value cache '+i);
      return v;
   });
   values=next;
 }
 return {tokens,stoppedByEos:false,steps:maxSteps,elapsedMs:Date.now()-started};
}

/* homr ONNX CPU/WASM transformer feasibility test only.
 * Loads official encoder/decoder sequentially into desktop and mobile-sized
 * Chromium. An encoder inference on blank input is a smoke test, not OMR.
 */
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const arg=(n,f)=>{let k=process.argv.indexOf('--'+n);return k<0?f:process.argv[k+1]};
const encoder=path.resolve(arg('encoder','')),decoder=path.resolve(arg('decoder',''));
const output=path.resolve(arg('output',path.join(__dirname,'.homr-transformer-probe.json')));
const mode=arg('mode','desktop'),dist=path.join(__dirname,'node_modules/onnxruntime-web/dist');
(async()=>{
 for(let p of [encoder,decoder])if(!fs.existsSync(p))throw Error('Missing original homr model '+p);
 let server,browser;
 try{
  server=http.createServer((req,res)=>{
   const pathname=new URL(req.url,'http://127.0.0.1').pathname;
   const file=pathname==='/encoder.onnx'?encoder:pathname==='/decoder.onnx'?decoder:
              pathname.startsWith('/ort/')?path.join(dist,path.basename(pathname)):null;
   if(!file||!fs.existsSync(file)){res.writeHead(404);return res.end();}
   res.setHeader('Content-Type',pathname.endsWith('.wasm')?'application/wasm':/\.(m?js)$/.test(pathname)?'text/javascript':'application/octet-stream');
   fs.createReadStream(file).pipe(res);
  });await new Promise(done=>server.listen(0,'127.0.0.1',done));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const mobile=mode==='android-simulated';
  const page=await browser.newPage({viewport:mobile?{width:412,height:915}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
  const report=await page.evaluate(async()=>{
   const result={encoder:{},decoder:{}};
   const js=document.createElement('script');js.src='/ort/ort.min.js';
   await new Promise((ok,no)=>{js.onload=ok;js.onerror=()=>no(new Error('WASM loader unavailable'));document.head.append(js);});
   ort.env.wasm.wasmPaths='/ort/';ort.env.wasm.numThreads=1;
   for(const name of ['encoder','decoder']){
    const m=result[name],start=performance.now();
    const response=await fetch('/'+name+'.onnx');
    if(!response.ok){m.error='Cannot fetch original model '+response.status;continue;}
    const bytes=new Uint8Array(await response.arrayBuffer());m.modelBytes=bytes.byteLength;
    try{
      const session=await ort.InferenceSession.create(bytes,{executionProviders:['wasm'],graphOptimizationLevel:'disabled'});
      m.initMs=Math.round(performance.now()-start);m.loaded=true;m.inputs=session.inputNames;
      m.outputs=session.outputNames;
      m.inputMetadata=session.inputMetadata||null;
      if(name==='encoder'){
        try{
          const data=new Float32Array(1*1*256*1280);
          const image=new ort.Tensor('float32',data,[1,1,256,1280]);
          const t=performance.now(),outs=await session.run({[session.inputNames[0]]:image});
          m.inferMs=Math.round(performance.now()-t);
          m.outputDims=Object.fromEntries(Object.entries(outs).map(([k,v])=>[k,v.dims]));
          m.realInference=true;
        }catch(e){m.inferenceError=String(e);}
      }
      await session.release?.();
    }catch(e){m.error=String(e);}
   }
   return result;
  }).catch(e=>({fatal:String(e),encoder:{},decoder:{}}));
  const out={mode,encoderSizeBytes:fs.statSync(encoder).size,decoderSizeBytes:fs.statSync(decoder).size,
    ...report,errors,fullHomrBrowserSupported:false,
    note:'Encoder inference uses blank synthetic image; decoder session loads only. No note inference or web OMR pipeline is claimed. Mobile is emulated.'};
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(out,null,2));
  console.log('HOMR_TRANSFORMER_BROWSER_PROBE='+JSON.stringify(out));
  if(!out.encoder?.loaded||!out.encoder?.realInference||!out.decoder?.loaded||errors.length)process.exitCode=1;
 }finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});

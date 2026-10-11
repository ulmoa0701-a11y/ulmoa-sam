/* Experimental (not deployed): load a REAL homr segmentation ONNX model
 * with browser WASM and run 320x320 inference. Tests Chromium and a
 * simulated Android-sized viewport only. Does NOT claim full homr parity.
 */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const arg=(n,f)=>{const i=process.argv.indexOf('--'+n);return i<0?f:process.argv[i+1]};
const model=path.resolve(arg('model',''));
const output=path.resolve(arg('output',path.join(__dirname,'.homr-browser-probe.json')));
const mode=arg('mode','desktop');
(async()=>{
 if(!model||!fs.existsSync(model))throw Error('No homr segmentation model file');
 const size=fs.statSync(model).size,dist=path.join(__dirname,'node_modules/onnxruntime-web/dist');
 let server,browser;
 try{
  server=http.createServer((req,res)=>{
   const request=new URL(req.url,'http://127.0.0.1');
   const name=decodeURIComponent(request.pathname);
   let file=name==='/model.onnx'?model:name.startsWith('/ort/')?path.join(dist,path.basename(name)):null;
   if(!file||!fs.existsSync(file)){res.writeHead(404);return res.end();}
   res.setHeader('Content-Type',name.endsWith('.wasm')?'application/wasm':(name.endsWith('.js')||name.endsWith('.mjs'))?'text/javascript':'application/octet-stream');
   fs.createReadStream(file).pipe(res);
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-features=SharedArrayBuffer']});
  const mobile=mode==='android-simulated';
  const page=await browser.newPage({viewport:mobile?{width:412,height:915}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('requestfailed',r=>errors.push(r.url()+' '+r.failure()?.errorText));
  const url='http://127.0.0.1:'+server.address().port;
  await page.goto(url,{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(async()=>{
   const info={steps:[],supported:false,realInference:false};
   const start=performance.now();
   const script=document.createElement('script');script.src='/ort/ort.min.js';
   await new Promise((ok,no)=>{script.onload=ok;script.onerror=()=>no(new Error('ORT JS not available'));document.head.append(script);});
   info.steps.push('onnxruntime-web-js-loaded');
   ort.env.wasm.wasmPaths='/ort/';ort.env.wasm.numThreads=1;
   const downloaded=await fetch('/model.onnx');
   if(!downloaded.ok)throw Error('Real homr model fetch status='+downloaded.status);
   const bytes=new Uint8Array(await downloaded.arrayBuffer());
   info.modelBytes=bytes.byteLength;info.loadMs=Math.round(performance.now()-start);
   let session;
   try{session=await ort.InferenceSession.create(bytes,{executionProviders:['wasm'],graphOptimizationLevel:'disabled'});}
   catch(error){info.createError=String(error);return info;}
   info.steps.push('real-homr-segnet-onnx-wasm-loaded');
   info.inputs=session.inputNames;info.outputs=session.outputNames;info.initMs=Math.round(performance.now()-start);
   const arr=new Float32Array(1*3*320*320);
   arr.fill(255);
   const tensor=new ort.Tensor('float32',arr,[1,3,320,320]);
   try{
     const t=performance.now(),results=await session.run({[session.inputNames[0]]:tensor});
     info.inferMs=Math.round(performance.now()-t);
     info.outputDims=Object.fromEntries(Object.entries(results).map(([k,v])=>[k,v.dims]));
     info.realInference=true;info.supported=true;
   }catch(error){info.inferError=String(error);}
   await session.release?.();
   return info;
  }).catch(err=>({supported:false,realInference:false,browserError:String(err)}));
  const report={model:'official-homr-segnet-ONNX',mode,modelBytes:size,...result,errors,
    fullHomrBrowserSupported:false,
    note:'Only segmentation is tested. Full homr also requires dewarp, staff reconstruction, transformer encoder+autoregressive decoder, MusicXML synthesis. Chromium mobile viewport != real Android.'};
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(report,null,2));
  console.log('HOMR_BROWSER_PROBE='+JSON.stringify(report));
  if(!report.realInference||errors.length)process.exitCode=1;
 }finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});

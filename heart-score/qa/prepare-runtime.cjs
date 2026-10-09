// Free, local dependencies only. Run npm ci in this directory first.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(process.argv[2]||path.join(__dirname,'.runtime'));
(async()=>{
 fs.mkdirSync(root,{recursive:true});
 const model=path.join(root,'omr-line.fp16.onnx'),expected='0edeb8f9a8103405239d7edbf48aa372158eb3e0cbbe696ec7dbaf768a75c39d';
 if(!fs.existsSync(model)){
  const response=await fetch('https://raw.githubusercontent.com/alexanderalber/satb-line-omr/c60823117a5c92b0c29f921dbca023e94026d279/model-public-domain/omr-line.fp16.onnx');
  if(!response.ok)throw Error(`Model download ${response.status}`);
  fs.writeFileSync(model,new Uint8Array(await response.arrayBuffer()));
 }
 if(crypto.createHash('sha256').update(fs.readFileSync(model)).digest('hex')!==expected)throw Error('Model checksum mismatch');
 fs.cpSync(path.join(__dirname,'node_modules/onnxruntime-web/dist'),path.join(root,'ort'),{recursive:true});
 const nm=path.join(root,'node_modules');if(!fs.existsSync(nm))fs.symlinkSync(path.join(__dirname,'node_modules'),nm,'dir');
 console.log(JSON.stringify({ok:true,runtime:root,modelSha256:expected}));
})().catch(e=>{console.error(e);process.exitCode=1;});

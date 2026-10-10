/* Real iframe -> file input -> ONNX/WASM -> editor state. No source rewriting. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const arg=(key,fallback)=>{const i=process.argv.indexOf('--'+key);return i<0?fallback:process.argv[i+1];};
const repo=path.resolve(__dirname,'../..'),fixture=path.resolve(arg('fixture','')),runtime=path.resolve(arg('runtime','')),out=path.resolve(arg('output','omr-e2e-results'));
const variant=arg('variant','original'),coreOnly=process.argv.includes('--core-only');
(async()=>{
 if(!fs.existsSync(fixture)||!fs.statSync(fixture).isFile())throw Error('A real --fixture file is required; missing fixtures cannot pass.');
 const truth=JSON.parse(fs.readFileSync(path.join(__dirname,'doremi-ground-truth.json'))),hash=crypto.createHash('sha256').update(fs.readFileSync(fixture)).digest('hex');
 if(variant==='original'&&hash!==truth.sha256)throw Error('Original fixture SHA256 mismatch');
 const model=path.join(runtime,'omr-line.fp16.onnx');if(crypto.createHash('sha256').update(fs.readFileSync(model)).digest('hex')!=='0edeb8f9a8103405239d7edbf48aa372158eb3e0cbbe696ec7dbaf768a75c39d')throw Error('Model hash mismatch');
 fs.mkdirSync(out,{recursive:true});const logs=[],requests=[],analyses=[];let browser,server;
 try{
  server=http.createServer((req,res)=>{let p=path.resolve(repo,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!p.startsWith(repo+path.sep)&&p!==repo){res.writeHead(403);return res.end();}if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');if(!fs.existsSync(p)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',p.endsWith('.mjs')||p.endsWith('.js')?'text/javascript':p.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(p).pipe(res);});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=arg('url',`http://127.0.0.1:${server.address().port}/heart-score/ai/`);
  browser=await chromium.launch({headless:true,...(arg('browser',null)?{executablePath:path.resolve(arg('browser'))}:{}),args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  const mobile=process.argv.includes('--mobile'),page=await browser.newPage({viewport:mobile?{width:412,height:915}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
  page.on('console',m=>logs.push({type:m.type(),text:m.text()}));page.on('pageerror',e=>logs.push({type:'pageerror',text:e.message}));page.on('requestfailed',r=>requests.push({url:r.url(),error:r.failure()?.errorText}));
  await page.route('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/**',r=>{const p=path.join(runtime,'ort',new URL(r.request().url()).pathname.split('/').pop());return r.fulfill({path:p,contentType:p.endsWith('.wasm')?'application/wasm':'text/javascript'});});
  await page.route('https://raw.githubusercontent.com/**/omr-line.fp16.onnx',r=>r.fulfill({path:model,contentType:'application/octet-stream'}));
  await page.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/**',r=>r.fulfill({path:path.join(runtime,'node_modules/pdfjs-dist/build',new URL(r.request().url()).pathname.split('/').pop()),contentType:'text/javascript'}));
  await page.route('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/**',r=>r.fulfill({path:path.join(runtime,'node_modules/tesseract.js/dist',new URL(r.request().url()).pathname.split('/').pop()),contentType:'text/javascript'}));
  await page.route('https://cdn.jsdelivr.net/npm/tesseract.js@*/dist/worker.min.js',r=>r.fulfill({path:path.join(runtime,'node_modules/tesseract.js/dist/worker.min.js'),contentType:'text/javascript'}));
  await page.route('https://cdn.jsdelivr.net/npm/tesseract.js-core@*/**',r=>{const f=new URL(r.request().url()).pathname.split('/').pop();return r.fulfill({path:path.join(runtime,'node_modules/tesseract.js-core',f),contentType:f.endsWith('.wasm')?'application/wasm':'text/javascript'});});
  await page.route('https://cdn.jsdelivr.net/npm/@tesseract.js-data/**',r=>{const suffix=new URL(r.request().url()).pathname.split('/@tesseract.js-data/')[1];return r.fulfill({path:path.join(runtime,'node_modules/@tesseract.js-data',suffix),contentType:'application/octet-stream'});});
  await page.exposeFunction('__captureOmrAnalysis',a=>analyses.push(a));
  await page.addInitScript(()=>window.addEventListener('ulmoa:omr-analysis',e=>window.__captureOmrAnalysis(e.detail)));
  await page.goto(url,{waitUntil:'domcontentloaded'});const frame=await (await page.waitForSelector('#app')).contentFrame();await frame.waitForURL('**/*aiomr=*');
  await frame.waitForFunction(()=>document.querySelector('#imageScoreFile')?.dataset.aiOmr==='v702');
  if(coreOnly)await frame.evaluate(()=>{window.ocrCanvas=undefined;});
  const start=Date.now();await frame.locator('#imageScoreFile').setInputFiles(fixture);
  await frame.waitForFunction(()=>/초안 완료|결과 검증|분석 실패|자동 변환/.test(document.querySelector('#imageStatus')?.textContent||''),{},{timeout:180000});
  const actual=await frame.evaluate(()=>({status:document.querySelector('#imageStatus').textContent,statusClass:document.querySelector('#imageStatus').className,state,visible:document.querySelector('#pages').innerText,pageInfo:document.querySelector('#pageInfo').textContent}));
  const {compareNotation}=await import('./omr-exact-validator.mjs');const draftComparison=analyses.at(-1)?.state?compareNotation({...analyses.at(-1),accepted:true},analyses.at(-1).state,truth):null;const comparison=process.argv.includes('--expect-reject')?{ok:false,errors:[],measures:analyses.at(-1)?.state?.measures?.length,notes:analyses.at(-1)?.noteCount,rests:analyses.at(-1)?.restCount}:compareNotation(analyses.at(-1),actual.state,truth);
  if(process.argv.includes('--expect-reject')){if(analyses.at(-1)?.accepted!==false||/초안 완료/.test(actual.status)||!actual.visible.includes('자동 변환을 중단'))comparison.errors.push('Invalid notation was not visibly rejected');}else if(!/초안 완료/.test(actual.status))comparison.errors.push('No UI success state');
  if(logs.some(l=>l.type==='pageerror'))comparison.errors.push('Unhandled browser error');
  comparison.ok=comparison.errors.length===0;
  const report={...comparison,draftComparison,variant,mobile,coreOnly,optionalTitleLyricsOcr:coreOnly?'excluded':'enabled',elapsedMs:Date.now()-start,fixtureSha256:hash,url,actual,analysis:analyses.at(-1),logs,requests};
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(report,null,2));await page.screenshot({path:path.join(out,'screen.png'),fullPage:true});console.log(JSON.stringify({ok:report.ok,variant,mobile,coreOnly,elapsedMs:report.elapsedMs,measures:report.measures,notes:report.notes,rests:report.rests,errors:report.errors.slice(0,12),errorCount:report.errors.length,status:actual.status,draftOnly:{ok:report.draftComparison?.ok,measures:report.draftComparison?.measures,notes:report.draftComparison?.notes,rests:report.draftComparison?.rests,errors:report.draftComparison?.errors?.slice(0,24),totalErrors:report.draftComparison?.errors?.length},keyLabel:report.analysis?.state?.keyLabel,candidates:report.analysis?.candidateDiagnostics,rawBarGeometry:report.analysis?.rawBarGeometry}));process.exitCode=report.ok?0:1;
 }catch(error){fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({ok:false,error:String(error),logs,requests,analyses},null,2));throw error;}finally{await browser?.close();await new Promise(resolve=>server?server.close(resolve):resolve());}
})().catch(e=>{console.error(e);process.exitCode=1;});

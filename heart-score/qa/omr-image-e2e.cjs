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
  await frame.waitForFunction(()=>/초안 완료|결과 검증|분석 실패|자동 변환|읽지 못했어요/.test(document.querySelector('#imageStatus')?.textContent||''),{},{timeout:180000});
  const actual=await frame.evaluate(()=>({status:document.querySelector('#imageStatus').textContent,statusClass:document.querySelector('#imageStatus').className,state,visible:document.querySelector('#pages').innerText,pageInfo:document.querySelector('#pageInfo').textContent}));
  const {compareNotation}=await import('./omr-exact-validator.mjs');const draftComparison=analyses.at(-1)?.state?compareNotation({...analyses.at(-1),accepted:true},analyses.at(-1).state,truth):null;const comparison=process.argv.includes('--no-staff')?{ok:false,errors:[],measures:0,notes:0,rests:0}:process.argv.includes('--expect-reject')?{ok:false,errors:[],measures:analyses.at(-1)?.state?.measures?.length,notes:analyses.at(-1)?.noteCount,rests:analyses.at(-1)?.restCount}:compareNotation(analyses.at(-1),actual.state,truth);
  if(process.argv.includes('--no-staff')){
    if(!actual.visible.includes('자동 변환을 중단')||
       !actual.visible.includes('오선이나 계이름을 읽지 못했어요')||
       !actual.visible.includes('오선 5줄과 음표가'))comparison.errors.push('No-staff upload did not show cause and retake steps');
    if(analyses.some(v=>v.accepted===true))comparison.errors.push('Blank image was incorrectly recognized as notation');
  }else if(process.argv.includes('--expect-reject')){if(analyses.at(-1)?.accepted!==false||/초안 완료/.test(actual.status)||!actual.visible.includes('자동 변환을 중단'))comparison.errors.push('Invalid notation was not visibly rejected');}else if(!/초안 완료/.test(actual.status))comparison.errors.push('No UI success state');
  const guidance=analyses.at(-1)?.rejection||null;
  const guidanceVisible=!!guidance&&actual.visible.includes(guidance.title)&&actual.visible.includes(guidance.action)&&actual.visible.includes('자동 변환을 중단');
  if(analyses.at(-1)?.accepted===false&&!guidanceVisible)comparison.errors.push('Rejected scan has no visible issue explanation or corrective advice');
  if(logs.some(l=>l.type==='pageerror'))comparison.errors.push('Unhandled browser error');
  comparison.ok=comparison.errors.length===0;
  // Emit a spatial diagnostic only for synthetic QA fixtures. Do not write
  // real uploaded user photographs into public CI artifacts.
  if(process.argv.includes('--overlay-bars')&&fixture.includes(path.join('heart-score','qa','.scan-debug'))){
    const geometry=analyses.at(-1)?.rawBarGeometry;
    if(geometry?.chosenBarXs?.length&&geometry?.scanRows?.length){
      const source='data:image/'+(fixture.toLowerCase().endsWith('.png')?'png':'jpeg')+';base64,'+fs.readFileSync(fixture).toString('base64');
      const overlay=await page.evaluate(async({source,geometry})=>{
        const img=new Image();img.src=source;await img.decode();
        const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
        const x=c.getContext('2d');x.drawImage(img,0,0);
        for(let i=0;i<geometry.scanRows.length;i++){
          const row=geometry.scanRows[i],b=row.box||{},sp=Number(b.lineSpacing)||8;
          const top=(Number(b.y)||0)+(Number(b.padUp)||0),bottom=top+4*sp;
          const picks=geometry.chosenBarXs[i]||[];
          x.save();x.lineWidth=2;
          for(const v of row.strict||[]){
            x.strokeStyle='rgba(225,135,18,.40)';x.beginPath();x.moveTo(v.x,top);x.lineTo(v.x,bottom);x.stroke();
          }
          for(const v of picks){
            x.lineWidth=3;x.strokeStyle='rgba(1,145,65,.98)';x.beginPath();x.moveTo(v.x,top-8);x.lineTo(v.x,bottom+8);x.stroke();
            x.fillStyle='#073';x.font='bold 12px Arial';x.fillText(String(v.x),v.x+4,top-7);
          }
          x.fillStyle='rgba(255,255,255,.90)';x.fillRect((Number(b.x)||0),top-27,235,18);
          x.fillStyle='#273';x.font='bold 14px Arial';x.fillText('row '+(i+1)+' / '+(picks.length+1)+' measures',Number(b.x)||0,top-13);
          x.restore();
        }
        return c.toDataURL('image/png').split(',')[1];
      },{source,geometry});
      fs.writeFileSync(path.join(out,'barline-overlay.png'),Buffer.from(overlay,'base64'));
    }
  }
  // Synthetic-fixture diagnostics only: localize missing events by exact printed
  // measure and keep the entire pitch/duration mismatch list. Never use the
  // ground truth to adjust recognizer output or to accept a bad import.
  const draftState=analyses.at(-1)?.state;
  const perBarDiagnostics=truth.measures.map((expected,i)=>{
    const actualBar=draftState?.measures?.[i]||[];
    const different=actualBar.length!==expected.length||expected.some((e,j)=>e.note!==actualBar[j]?.note||Math.abs(e.dur-(actualBar[j]?.dur??NaN))>1e-8);
    if(!different)return null;
    const row=(truth.perLine||[]).findIndex((_,r)=>i<(truth.perLine||[]).slice(0,r+1).reduce((a,b)=>a+b,0));
    const before=(truth.perLine||[]).slice(0,row).reduce((a,b)=>a+b,0),bar=i-before;
    const geometry=analyses.at(-1)?.rawBarGeometry;
    const scan=geometry?.scanRows?.[row],staff=scan?.cvStaff,bars=geometry?.chosenBarXs?.[row]||[];
    const x0=bar===0?staff?.x0:bars[bar-1]?.x;
    const x1=bar===bars.length?staff?.x1:bars[bar]?.x;
    return{bar:i+1,staffRow:row+1,region:Number.isFinite(x0)&&Number.isFinite(x1)?{x0:Math.round(x0),x1:Math.round(x1),y0:Math.round(staff.lines[0]-staff.spacing*5),y1:Math.round(staff.lines[4]+staff.spacing*4)}:null,
      expected,actual:actualBar,
      differences:expected.map((e,j)=>({event:j+1,expected:e,actual:actualBar[j]||null})).filter(v=>v.actual?.note!==v.expected.note||Math.abs((v.actual?.dur??NaN)-v.expected.dur)>1e-8),
      extra:actualBar.slice(expected.length)};
  }).filter(Boolean);
  if(perBarDiagnostics.length)console.log('OMR_PER_BAR_DIAGNOSTICS='+JSON.stringify({variant,mobile,perBarDiagnostics}));
  // These are CI-generated score variants, not real patient/user uploads.
  // Preserve a small original-pixel crop for each genuinely missing symbol,
  // so the next change can be justified by optical evidence rather than beats.
  if(fixture.includes(path.join('heart-score','qa','.scan-debug'))){
    const misses=perBarDiagnostics.filter(d=>d.region&&d.expected.length>d.actual.length).slice(0,4);
    for(const item of misses){
      const source='data:image/'+(fixture.toLowerCase().endsWith('.png')?'png':'jpeg')+';base64,'+fs.readFileSync(fixture).toString('base64');
      const crop=await page.evaluate(async({source,region})=>{
        const img=new Image();img.src=source;await img.decode();
        const margin=8,x=Math.max(0,region.x0-margin),y=Math.max(0,region.y0-margin);
        const width=Math.min(img.naturalWidth-x,region.x1-region.x0+margin*2),height=Math.min(img.naturalHeight-y,region.y1-region.y0+margin*2);
        const c=document.createElement('canvas');c.width=width;c.height=height;
        c.getContext('2d').drawImage(img,x,y,width,height,0,0,width,height);
        return c.toDataURL('image/png').split(',')[1];
      },{source,region:item.region});
      fs.writeFileSync(path.join(out,'missing-bar-'+item.bar+'.png'),Buffer.from(crop,'base64'));
      console.log('OMR_MISSING_CROP_BASE64 bar'+item.bar+' '+crop);
    }
  }
  const report={...comparison,draftComparison,guidance,guidanceVisible,perBarDiagnostics,variant,mobile,coreOnly,optionalTitleLyricsOcr:coreOnly?'excluded':'enabled',elapsedMs:Date.now()-start,fixtureSha256:hash,url,actual,analysis:analyses.at(-1),logs,requests};
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(report,null,2));await page.screenshot({path:path.join(out,'screen.png'),fullPage:true});console.log(JSON.stringify({ok:report.ok,variant,mobile,coreOnly,elapsedMs:report.elapsedMs,measures:report.measures,notes:report.notes,rests:report.rests,errors:report.errors.slice(0,12),errorCount:report.errors.length,status:actual.status,guidance:report.guidance?{code:report.guidance.code,title:report.guidance.title,action:report.guidance.action,visible:report.guidanceVisible}:null,draftOnly:{ok:report.draftComparison?.ok,measures:report.draftComparison?.measures,notes:report.draftComparison?.notes,rests:report.draftComparison?.rests,errors:report.draftComparison?.errors,totalErrors:report.draftComparison?.errors?.length},keyLabel:report.analysis?.state?.keyLabel,deskew:report.analysis?.deskew,deskewApplied:report.analysis?.deskewApplied,candidates:report.analysis?.candidateDiagnostics,rawBarGeometry:report.analysis?.rawBarGeometry}));process.exitCode=report.ok?0:1;
 }catch(error){fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({ok:false,error:String(error),logs,requests,analyses},null,2));throw error;}finally{await browser?.close();await new Promise(resolve=>server?server.close(resolve):resolve());}
})().catch(e=>{console.error(e);process.exitCode=1;});

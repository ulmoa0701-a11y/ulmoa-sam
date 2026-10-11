/* Import the REAL output from an external OMR engine through the production
 * MusicXML editor. Test on independent generated fixtures only.
 * No source rewriting, no scraping remote app and no score hard-coding.
 */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const arg=(name,def)=>{const ix=process.argv.indexOf('--'+name);return ix<0?def:process.argv[ix+1]};
const root=path.resolve(__dirname,'../..');
const fixture=path.resolve(arg('musicxml',''));
const target=path.resolve(arg('output',path.join(__dirname,'.interop-result.json')));
(async()=>{
 if(!fs.existsSync(fixture))throw Error('Missing real engine MusicXML file');
 const truth=JSON.parse(fs.readFileSync(path.join(__dirname,'doremi-ground-truth.json'),'utf8'));
 let browser,server;
 try{
  server=http.createServer((req,res)=>{
   const u=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+decodeURIComponent(u.pathname));
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
   const final=fs.statSync(file).isDirectory()?path.join(file,'index.html'):file;
   res.setHeader('Content-Type',final.endsWith('.html')?'text/html':final.endsWith('.js')?'text/javascript':'application/octet-stream');
   fs.createReadStream(final).pipe(res);
  });
  await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/heart-score/',{waitUntil:'domcontentloaded'});
  await page.locator('#xmlFile').waitFor();
  await page.locator('#xmlFile').setInputFiles(fixture);
  await page.waitForFunction(()=>/완료|분석 실패/.test(document.querySelector('#xmlStatus')?.textContent||''),{},{timeout:30000});
  const actual=await page.evaluate(()=>({status:document.querySelector('#xmlStatus').innerText,state:JSON.parse(JSON.stringify(state))}));
  const check=await import('./omr-exact-validator.mjs');
  const report=check.compareNotation({accepted:true,staves:truth.staves,barGeometry:{perLine:truth.perLine}},actual.state,truth);
  const result={ok:report.ok&&/완료/.test(actual.status),source:path.basename(fixture),status:actual.status,
    measures:report.measures,notes:report.notes,rests:report.rests,errors:report.errors,uncaught:errors};
  if(errors.length)result.ok=false;
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,JSON.stringify(result,null,2));
  console.log('HOMR_TO_HEART_SCORE='+JSON.stringify(result));
  if(!result.ok)process.exitCode=1;
 }finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});

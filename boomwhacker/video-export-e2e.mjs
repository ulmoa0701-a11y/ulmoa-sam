/* Real save-click E2E. Reports actual downloaded WebM and browser errors.
 * Existing generic Boomwhacker QA only checked export capability, never clicked.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {chromium} from 'playwright-core';
const root=path.resolve('.');
const artifactDir=path.join(root,'boomwhacker','video-qa-artifacts');
fs.mkdirSync(artifactDir,{recursive:true});
const baseSong={title:'영상저장 QA',timeN:1,timeD:4,bpm:180,measures:[[{note:'도',dur:1,lyric:'도'}]]};
const results=[];
let server,browser;
const serve=(req,res)=>{
 let pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
 let file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
 if(!fs.existsSync(file)){res.writeHead(404);res.end();return}
 if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 if(!fs.existsSync(file)){res.writeHead(404);res.end();return}
 res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')||file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream');
 fs.createReadStream(file).pipe(res);
};
try{
 server=http.createServer(serve);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 for(const scenario of [
  {name:'desktop-default-audio',width:1440,height:900,sound:true,credit:true},
  {name:'mobile-sized-muted',width:390,height:844,sound:false,credit:false},
  {name:'desktop-interlude-audio',width:1440,height:900,sound:true,credit:false,mode:'interlude'},
  {name:'desktop-beat-guide-audio',width:1440,height:900,sound:true,credit:false,mode:'music'},
  {name:'desktop-public-original',width:1366,height:900,sound:true,credit:false,mode:'instant',publicMode:true}
 ]){
  const context=await browser.newContext({viewport:{width:scenario.width,height:scenario.height},acceptDownloads:true});
  const page=await context.newPage(),jsErrors=[],consoleErrors=[];
  const result={name:scenario.name,clicked:false,downloaded:false,videoBytes:0,mime:'',jsErrors,consoleErrors};
  page.on('pageerror',e=>jsErrors.push(e.message));
  page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(msg.text())});
  try{
   await page.goto('http://127.0.0.1:'+server.address().port+'/boomwhacker/'+(scenario.publicMode?'?song=beat-basic':''),{waitUntil:'domcontentloaded'});
   if(!scenario.publicMode){
    await page.evaluate(song=>localStorage.setItem('ulmoaBoomTransfer',JSON.stringify(song)),baseSong);
    await page.reload({waitUntil:'domcontentloaded'});
   }
   await page.locator('#videoBtn').waitFor({state:'attached'});
   if(!scenario.sound)await page.evaluate(()=>{sound=false;});
   if(!scenario.credit)await page.evaluate(()=>{document.querySelector('#creditOpt').checked=false;});
   if(scenario.mode){await page.locator('#introMode').selectOption(scenario.mode);result.modeSelected=await page.locator('#introMode').inputValue()===scenario.mode}
   result.supported=await page.evaluate(()=>window.__boomVideoQA?.supported());
   result.initialStatus=await page.locator('#videoStatus').innerText();
   const pending=page.waitForEvent('download',{timeout:scenario.publicMode?100000:45000}).then(d=>({download:d})).catch(e=>({error:e.message}));
   if(scenario.width<=800){
     result.mobileQuickVisible=await page.locator('#mobileVideoBtn').isVisible();
     result.settingsHiddenInitially=!(await page.locator('#videoBtn').isVisible());
     await page.locator('#mobileVideoBtn').click({timeout:10000});
     result.settingsOpened=await page.locator('#mobileSettingsSheet').evaluate(e=>e.classList.contains('mobileOpen'));
   }else if(scenario.publicMode){
    await page.locator('#publicVideoPanel').evaluate(el=>el.open=true);
    result.publicCheck=await page.evaluate(()=>window.__boomVideoQA.publicExport());
    await page.locator('#publicRightsOpt').check();
    await page.locator('#publicVideoBtn').click({timeout:10000});
   }else await page.locator('#videoBtn').click({timeout:10000});
   result.progressVisible=await page.locator('#videoProgress').isVisible();
   result.progressButtonText=await page.locator('#videoBtn').innerText();
   result.clicked=true;
   const downloaded=await pending;
   result.finalStatus=await page.locator('#videoStatus').innerText();
   result.retryDownloadVisible=await page.locator('#videoDownloadLink').isVisible();
   result.retryDownloadHref=await page.locator('#videoDownloadLink').getAttribute('href');
   result.mobileStatusFontPx=Number.parseFloat(await page.locator('#videoStatus').evaluate(e=>getComputedStyle(e).fontSize));
   if(downloaded.download){
    const d=downloaded.download;
    result.downloaded=true;result.filename=d.suggestedFilename();
    const file=path.join(artifactDir,scenario.name+'.webm');
    await d.saveAs(file);
    const body=fs.readFileSync(file);
    result.videoBytes=body.length;result.ebml=body.length>4&&body.subarray(0,4).toString('hex')==='1a45dfa3';
    result.mime='video/webm';
   }else result.downloadError=downloaded.error;
   result.ok=!!(result.downloaded&&result.ebml&&result.videoBytes>2000&&!jsErrors.length&&!consoleErrors.length
      &&(scenario.width>800||(result.mobileQuickVisible&&result.settingsHiddenInitially&&result.settingsOpened))
      &&result.progressVisible&&result.retryDownloadVisible&&result.retryDownloadHref?.startsWith('blob:')
      &&result.mobileStatusFontPx>=10&&/영상 제작 완료/.test(result.finalStatus)
      &&(!scenario.mode||result.modeSelected)
      &&(!scenario.publicMode||(result.publicCheck?.eligible?.ok===true&&result.filename?.includes('유튜브공개검토용')
        &&result.videoBytes>30000&&result.finalStatus.includes('영상 제작 완료')
        &&await page.locator('#publicStatus').innerText().then(x=>x.includes('출처·설명문')))));
   console.log('VIDEO_EXPORT_E2E='+JSON.stringify(result));
  }catch(e){result.ok=false;result.exception=String(e);result.finalStatus=await page.locator('#videoStatus').innerText().catch(()=>'?');console.log('VIDEO_EXPORT_E2E='+JSON.stringify(result));}
  results.push(result);
  await context.close();
 }
}finally{
 await browser?.close();
 if(server)await new Promise(resolve=>server.close(resolve));
}
fs.writeFileSync(path.join(artifactDir,'results.json'),JSON.stringify(results,null,2));
if(results.length!==5||results.some(r=>!r.ok))process.exitCode=1;

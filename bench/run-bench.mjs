import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const chrome=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage','--enable-precise-memory-info','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const cases=[['playcanvas','http://127.0.0.1:4173/bench/playcanvas/'],['babylon','http://127.0.0.1:4173/bench/babylon/']];
const viewports=[['mobile',{width:390,height:844}],['desktop',{width:1536,height:864}]];
const results=[];
for(const [engine,url] of cases){for(const [device,viewport] of viewports){for(let run=1;run<=3;run++){
  const page=await browser.newPage();await page.setViewport(viewport);const cdp=await page.createCDPSession();await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  let bytes=0;const errors=[];const failed=[];cdp.on('Network.loadingFinished',e=>bytes+=e.encodedDataLength||0);page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('requestfailed',r=>failed.push(`${r.failure()?.errorText||'failed'} ${r.url()}`));
  const nav0=Date.now();let navError='';try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.__bench&&window.__bench.fps>0,{timeout:60000});await new Promise(r=>setTimeout(r,8000));}catch(e){navError=String(e)}
  const bench=await page.evaluate(()=>window.__bench||null).catch(()=>null);const metrics=await page.metrics().catch(()=>({}));const mem=await page.evaluate(()=>performance.memory?.usedJSHeapSize||null).catch(()=>null);
  results.push({engine,device,run,viewport,wallMs:Date.now()-nav0,bytes,bench,jsHeap:mem,metrics:{TaskDuration:metrics.TaskDuration,JSHeapUsedSize:metrics.JSHeapUsedSize},errors,failed,navError});
  await page.close();
}}}
await browser.close();
const summary={generatedAt:new Date().toISOString(),results};
fs.writeFileSync('bench-results.json',JSON.stringify(summary,null,2));
console.log('BENCH_RESULTS_START');console.log(JSON.stringify(summary,null,2));console.log('BENCH_RESULTS_END');
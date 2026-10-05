import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const chrome=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const cases=[['mobile',{width:390,height:844}],['desktop',{width:1536,height:864}]];
const results=[];
for(const [name,viewport] of cases){
  const page=await browser.newPage();await page.setViewport(viewport);
  const errors=[],failed=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('requestfailed',r=>failed.push(`${r.failure()?.errorText||'failed'} ${r.url()}`));
  const url='http://127.0.0.1:4173/lab-babylon/';
  const started=Date.now();let navError='';
  try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForFunction(()=>window.__gameState?.ready===true,{timeout:30000});await new Promise(r=>setTimeout(r,2500));}catch(e){navError=String(e)}
  const initial=await page.evaluate(()=>({state:window.__gameState||null,overflow:document.documentElement.scrollWidth>innerWidth,canvas:document.querySelectorAll('#game').length,mission:document.querySelector('#mission')?.textContent||'',guide:document.querySelector('.guide')?.innerText||'',buttons:[...document.querySelectorAll('.actions button')].map(b=>b.innerText)})).catch(()=>null);
  await page.screenshot({path:`next-${name}-start.png`,fullPage:true});
  let afterTalk=null;
  if(!navError&&initial?.state?.ready){
    await page.keyboard.down('ArrowRight');await new Promise(r=>setTimeout(r,1150));await page.keyboard.up('ArrowRight');
    await page.keyboard.down('ArrowDown');await new Promise(r=>setTimeout(r,900));await page.keyboard.up('ArrowDown');
    await new Promise(r=>setTimeout(r,500));await page.keyboard.press('e');
    await new Promise(r=>setTimeout(r,1000));
    afterTalk=await page.evaluate(()=>({state:window.__gameState,mission:document.querySelector('#mission')?.textContent||'',dialog:document.querySelector('#dialog')?.innerText||''}));
    await page.screenshot({path:`next-${name}-after-talk.png`,fullPage:true});
  }
  const cleanErrors=errors.filter(x=>!x.includes('favicon'));
  const pass=!!initial&&initial.state?.ready===true&&initial.state?.stage===0&&initial.state?.fps>0&&initial.canvas===1&&!initial.overflow&&initial.guide.includes('E')&&initial.guide.includes('Q')&&initial.guide.includes('F')&&afterTalk?.state?.stage===1&&cleanErrors.length===0&&failed.length===0&&!navError;
  results.push({name,viewport,wallMs:Date.now()-started,initial,afterTalk,errors:cleanErrors,failed,navError,pass});
  await page.close();
}
await browser.close();
const summary={generatedAt:new Date().toISOString(),results,pass:results.every(r=>r.pass)};fs.writeFileSync('next-smoke-results.json',JSON.stringify(summary,null,2));console.log('NEXT_SMOKE_START');console.log(JSON.stringify(summary,null,2));console.log('NEXT_SMOKE_END');if(!summary.pass)process.exit(1);
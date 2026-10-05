import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const chrome=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage();await page.setViewport({width:390,height:844});
const errors=[],failed=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('requestfailed',r=>failed.push(`${r.failure()?.errorText||'failed'} ${r.url()}`));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function hold(key,ms){await page.keyboard.down(key);await sleep(ms);await page.keyboard.up(key);await sleep(180)}
async function state(){return page.evaluate(()=>({state:window.__gameState,mission:document.querySelector('#mission')?.textContent||'',tip:document.querySelector('#bossTip')?.textContent||'',timer:document.querySelector('#timer')?.textContent||'',time:document.querySelector('#timeBadge')?.textContent||'',dialog:document.querySelector('#dialog')?.innerText||''}))}
async function waitStage(n,ms=12000){await page.waitForFunction(n=>window.__gameState?.stage===n,{timeout:ms},n);return state()}
await page.goto('http://127.0.0.1:4173/lab-babylon/',{waitUntil:'domcontentloaded',timeout:30000});await page.waitForFunction(()=>window.__gameState?.ready===true,{timeout:30000});await sleep(1200);
const checkpoints=[];checkpoints.push({label:'start',...(await state())});
// gardener
await hold('ArrowRight',1150);await hold('ArrowDown',900);await page.keyboard.press('e');checkpoints.push({label:'after-gardener',...(await waitStage(1))});
// approach WOODS until stage 2
await hold('ArrowRight',1500);await hold('ArrowDown',900);checkpoints.push({label:'woods-arrive',...(await waitStage(2,15000))});
// wait for first vulnerable window then apply three traps. The 7-minute session remains active even if missions complete early.
await page.waitForFunction(()=>document.querySelector('#bossTip')?.textContent?.includes('지금! Q'),{timeout:12000});
for(let i=0;i<3;i++){await page.keyboard.press('q');await sleep(420)}
checkpoints.push({label:'woods-done',...(await waitStage(3,8000))});
// pond keeper
await hold('ArrowUp',1200);await hold('ArrowLeft',350);await page.keyboard.press('e');checkpoints.push({label:'eye-start',...(await waitStage(4,8000))});
// EYE must chase the stationary player. Wait until close enough, then slash three times respecting hit cooldown.
await sleep(5200);for(let i=0;i<3;i++){await page.keyboard.press('f');await sleep(2500)}
checkpoints.push({label:'eye-done',...(await waitStage(5,9000))});
// traveler
await hold('ArrowRight',1050);await hold('ArrowUp',320);await page.keyboard.press('e');checkpoints.push({label:'smog-start',...(await waitStage(6,8000))});
// SMOG stays present while three 12s observation cycles run.
await page.screenshot({path:'next-full-smog-start.png',fullPage:true});
await sleep(37500);checkpoints.push({label:'missions-complete',...(await waitStage(7,8000))});
await page.screenshot({path:'next-full-complete.png',fullPage:true});
const final=await state();const cleanErrors=errors.filter(x=>!x.includes('favicon'));
const pass=checkpoints.some(x=>x.label==='woods-done'&&x.state.stage===3)&&checkpoints.some(x=>x.label==='eye-start'&&x.state.stage===4)&&checkpoints.some(x=>x.label==='eye-done'&&x.state.stage===5)&&checkpoints.some(x=>x.label==='smog-start'&&x.state.stage===6)&&final.state.stage===7&&final.timer.includes('/ 07:00')&&!final.time.includes('낮')&&final.state.fps>0&&cleanErrors.length===0&&failed.length===0;
const out={generatedAt:new Date().toISOString(),checkpoints,final,errors:cleanErrors,failed,pass};fs.writeFileSync('next-full-results.json',JSON.stringify(out,null,2));console.log('FULL_ROUTE_START');console.log(JSON.stringify(out,null,2));console.log('FULL_ROUTE_END');await browser.close();if(!pass)process.exit(1);
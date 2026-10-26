// End-to-end browser QA: all three bosses, using ordinary keyboard controls only.
// window.__ulmoaGameQa is read-only here; no previewBoss, runSmoke, teleport, or event injection.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const url='https://ulmoa0701-a11y.github.io/ulmoa-sam/lab/babylon-hotel-garden/';
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage();
await page.setViewport({width:1440,height:900});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const report={url,kind:'Actual full route: keyboard-only actions; state and DOM observed read-only',steps:[],errors:[],httpErrors:[],networkFailures:[],pass:false};
page.on('pageerror',e=>report.errors.push(String(e)));
page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});
page.on('response',r=>{if(r.status()>=400)report.httpErrors.push({status:r.status(),url:r.url()})});
page.on('requestfailed',r=>report.networkFailures.push({url:r.url(),error:r.failure()?.errorText}));
const state=()=>page.evaluate(()=>window.__ulmoaGameQa.state());
async function record(label){const s=await state();report.steps.push({label,time:new Date().toISOString(),stage:s.stage,player:s.player,woods:s.woods,eye:s.eye,smog:s.smog,lotus:s.lotus,bucket:s.bucket,mission:await page.$eval('#mission',e=>e.textContent)});console.log('FULL_ROUTE_STEP '+label+' '+JSON.stringify(report.steps.at(-1)));return s}
async function modal(){return page.$eval('#dialog',e=>e.classList.contains('show'))}
async function nextDialog(){await page.waitForFunction(()=>document.querySelector('#dialog')?.classList.contains('show'),{timeout:15000});await page.click('#dialogBtn');await wait(250)}
async function key(k,ms=350){await page.keyboard.down(k);await wait(ms);await page.keyboard.up(k);await wait(90)}
function projected(dx,dz){return {right:-.8*dx+.6*dz,up:-.6*dx-.8*dz}}
function direction(dx,dz){const p=projected(dx,dz);return Math.abs(p.right)>Math.abs(p.up)?(p.right>0?'ArrowRight':'ArrowLeft'):(p.up>0?'ArrowUp':'ArrowDown')}
async function walkTo(x,z,radius=4,timeout=50000){
 const started=Date.now();let pulses=0,near=false;
 await page.keyboard.down('Shift');
 try{
  while(Date.now()-started<timeout && pulses++<160){
   if(await modal())break;
   const s=await state(),dx=x-s.player[0],dz=z-s.player[1];
   if(Math.hypot(dx,dz)<radius){near=true;break}
   await key(direction(dx,dz),Math.min(450,Math.max(140,Math.round(Math.hypot(dx,dz)*35))));
  }
 }finally{await page.keyboard.up('Shift')}
 return {near,pulses,last:await state()};
}
async function pickFlower(){
 const before=(await state()).lotus;
 for(let turn=0;turn<8;turn++){
  const hint=await page.$eval('#hgRewardNav',e=>e.textContent).catch(()=>''),pickupLabel=await page.$eval('[data-action="talk"]',e=>e.textContent).catch(()=>'');
  if(pickupLabel.includes('연꽃 줍기'))break;
  const match=hint.match(/(\d+)m/);
  if(!match){await wait(200);continue}
  const distance=Number(match[1]);
  if(distance<=5)break;
  // Search for a nearer flower in real steps, using only the visible distance label.
  let best={distance,key:null};
  for(const k of ['ArrowUp','ArrowRight','ArrowDown','ArrowLeft']){
   await key(k,240);
   const next=await page.$eval('#hgRewardNav',e=>e.textContent);
   const m=next.match(/(\d+)m/);
   if(m&&Number(m[1])<best.distance){best={distance:Number(m[1]),key:k};break}
   await key(({ArrowUp:'ArrowDown',ArrowRight:'ArrowLeft',ArrowDown:'ArrowUp',ArrowLeft:'ArrowRight'})[k],240);
  }
  if(best.key===null)break;
 }
 await page.keyboard.down('e');await wait(1300);await page.keyboard.up('e');await wait(280);
 return (await state()).lotus===before+1;
}
async function playWoods(){
 await page.waitForFunction(()=>window.__ulmoaGameQa?.state().stage===2,{timeout:7000});
 let attempts=0;
 while((await state()).stage===2 && attempts++<9){
  await page.waitForFunction(()=>document.querySelector('#mission')?.textContent.includes('공격 준비!')||document.querySelector('#dialog')?.classList.contains('show'),{timeout:16000});
  if(await modal()){await nextDialog();continue}
  await key('ArrowDown',650);
  await page.waitForFunction(()=>document.querySelector('#mission')?.textContent.includes('지금 빈틈')||document.querySelector('#dialog')?.classList.contains('show'),{timeout:12000});
  if(await modal()){await nextDialog();continue}
  await page.keyboard.press('q');await wait(400);
  if(await modal())break;
  await wait(400);
 }
 const defeated=(await state()).woods.hits===2;
 if(await modal())await nextDialog();
 return defeated;
}
async function playEye(){
 let hits=0;
 for(let attempts=0;attempts<10 && hits<3;attempts++){
  await page.waitForFunction(()=>{
   const m=document.querySelector('#mission')?.textContent||'';
   return m.includes('가지 공격 준비!')||m.includes('지금 빈틈')||document.querySelector('#dialog')?.classList.contains('show');
  },{timeout:23000});
  if(await modal()){await nextDialog();continue}
  if((await page.$eval('#mission',e=>e.textContent)).includes('가지 공격 준비!'))await page.keyboard.press('Space');
  await page.waitForFunction(()=>document.querySelector('#mission')?.textContent.includes('지금 빈틈')||document.querySelector('#dialog')?.classList.contains('show'),{timeout:10000});
  if(await modal()){await nextDialog();continue}
  await page.keyboard.press('f');await wait(400);
  hits=(await state()).eye.hits;
  if(await modal()){await nextDialog();if((await state()).stage===5)break;continue}
 }
 const defeated=(await state()).eye.hits===3;
 if(await modal())await nextDialog();
 return defeated;
}
async function playSmog(){
 for(let cycle=0;cycle<3;cycle++){
  const arrival=await walkTo(29,-23,5.0,22000);
  if(!arrival.near && (await state()).smog.mode==='approach')throw Error('SMOG cannot approach cycle '+(cycle+1));
  await page.waitForFunction(()=>window.__ulmoaGameQa.state().smog.mode==='danger',{timeout:10000});
  const s=await state(),away=direction(s.player[0]-29,s.player[1]+23);
  await page.keyboard.down('Shift');await key(away,1000);await page.keyboard.up('Shift');
  await page.waitForFunction(c=>window.__ulmoaGameQa.state().smog.cycle>c,{timeout:7000},cycle);
  await record('SMOG dodge '+(cycle+1));
 }
 if((await state()).smog.mode!=='water')throw Error('SMOG did not unlock water stage');
 await walkTo(29,-23,5.2,20000);
 await page.keyboard.press('q');
 await page.waitForFunction(()=>window.__ulmoaGameQa.state().stage===7,{timeout:6500});
 if(await modal())await nextDialog();
 return !(await state()).smog.enabled;
}
try{
 await page.goto(url+'?full-route-qa='+encodeURIComponent(process.env.GITHUB_SHA||Date.now()),{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.__ulmoaGameQa?.state&&window.__hgShadersReady===true,{timeout:60000});
 await nextDialog();await record('start');
 report.gardener=await walkTo(-11,-2,4.0,27000);await page.keyboard.press('e');await nextDialog();await record('gardener');
 report.woodsArrival=await walkTo(20,18,4.9,65000);await nextDialog();await record('woods encounter');
 report.woodsWon=await playWoods();await record('woods defeated');
 report.woodsFlower=await pickFlower();await record('woods flower');
 report.pondArrival=await walkTo(4,-8,4.0,65000);await page.keyboard.press('e');await nextDialog();await record('pond keeper');
 report.eyeArrival=await walkTo(24,-15,4.8,65000);
 await record('EYE approached by keyboard');
 report.eyeWon=await playEye();await record('eye defeated');
 report.eyeFlower=await pickFlower();await record('eye flower');
 report.travelerArrival=await walkTo(-2,18,4.0,65000);await page.keyboard.press('e');await nextDialog();await record('traveler bucket');
 report.smogWon=await playSmog();await record('smog water');
 await walkTo(29,-23,4.5,18000);
 report.smogFlower=await pickFlower();const last=await record('stage 7 and third lotus');
 report.pass=report.woodsWon&&report.woodsFlower&&report.eyeWon&&report.eyeFlower&&last.stage===7&&report.smogWon&&report.smogFlower&&last.lotus===3&&last.bucket===false&&report.errors.length===0&&report.httpErrors.length===0&&report.networkFailures.length===0;
}catch(e){report.error=String(e)}
await page.screenshot({path:'hotel-garden-full-route.jpg',type:'jpeg',quality:55,fullPage:true}).catch(()=>{});
await browser.close();
report.generatedAt=new Date().toISOString();
fs.writeFileSync('hotel-garden-full-route.json',JSON.stringify(report,null,2));
console.log('HOTEL_GARDEN_FULL_ROUTE '+JSON.stringify({pass:report.pass,error:report.error,steps:report.steps.map(x=>({label:x.label,stage:x.stage,lotus:x.lotus,eyeHits:x.eye.hits,smogMode:x.smog.mode})),errors:report.errors}));
if(!report.pass)process.exitCode=1;

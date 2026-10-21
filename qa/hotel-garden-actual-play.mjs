// Public-site first-mission QA using real keyboard actions only (no state teleport).
import puppeteer from "puppeteer-core";
import fs from "node:fs";
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH||"/usr/bin/google-chrome",args:["--no-sandbox","--disable-dev-shm-usage","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const page=await browser.newPage();await page.setViewport({width:1440,height:900});
const errors=[],http=[];
page.on("pageerror",e=>errors.push(String(e)));
page.on("response",r=>{if(r.status()>=400)http.push({status:r.status(),url:r.url()})});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const report={url:"https://ulmoa0701-a11y.github.io/ulmoa-sam/lab/babylon-hotel-garden/",steps:[],errors,http};
async function state(){return page.evaluate(()=>window.__ulmoaGameQa?.state())}
async function record(step){report.steps.push({step,time:new Date().toISOString(),state:await state(),mission:await page.$eval("#mission",e=>e.textContent)})}
async function move(key,ms=380){await page.keyboard.down(key);await sleep(ms);await page.keyboard.up(key);await sleep(70)}
// World basis of the existing fixed screen-relative controls: UP=(-0.6,-0.8), RIGHT=(-0.8,+0.6).
// Choose the dominant projected axis, advancing in short pulses with live position feedback.
async function walkTo(x,z,radius=4.1,limitMs=80000){
 const start=Date.now();let iter=0,near=false;
 while(Date.now()-start<limitMs&&iter++<170){
  const s=await state();const [px,pz]=s.player;const dx=x-px,dz=z-pz;
  if(Math.hypot(dx,dz)<radius){near=true;break}
  const screenX=-.8*dx+.6*dz,screenY=-.6*dx-.8*dz;
  const axis=Math.abs(screenX)>=Math.abs(screenY)?"x":"y";
  const key=axis==="x"?(screenX>=0?"ArrowRight":"ArrowLeft"):(screenY>=0?"ArrowUp":"ArrowDown");
  await move(key,450);
  if(await page.$eval("#dialog",e=>e.classList.contains("show")))break;
 }
 return {near,iterations:iter,last:await state()};
}
async function clickDialog(){await page.waitForFunction(()=>document.querySelector("#dialog")?.classList.contains("show"),{timeout:9000});await page.click("#dialogBtn");await sleep(250)}
try{
 await page.goto(report.url+"?actual-qa="+Date.now(),{waitUntil:"domcontentloaded",timeout:60000});
 await page.waitForFunction(()=>window.__ulmoaGameQa?.state&&window.__hgShadersReady===true,{timeout:60000});
 await clickDialog();await record("started");
 report.gardener=await walkTo(-11,-2,4.1,55000);
 // E key press performs a real talk action; stage increments only after acknowledging dialog.
 await page.keyboard.press("e");await sleep(150);
 await clickDialog();await record("gardener talk");
 report.woods=await walkTo(20,18,4.6,100000);
 await clickDialog();await record("WOODS encounter");
 // Do not change game states for this test. Wait for natural windups, use Q on real vulnerable cues.
 let tries=0,hits=0;
 while((await state()).stage===2&&tries++<7){
  await page.waitForFunction(()=>{
   const m=document.querySelector("#mission")?.textContent||"";
   return m.includes("공격 준비!")||document.querySelector("#dialog")?.classList.contains("show");
  },{timeout:16000});
  if(await page.$eval("#dialog",e=>e.classList.contains("show"))){
   await clickDialog();continue;
  }
  // Real dodge during the 1.2s warning: move toward the boss so Q remains in range.
  await move("ArrowDown",670);
  await page.waitForFunction(()=>{
   const m=document.querySelector("#mission")?.textContent||"";
   return m.includes("지금 빈틈")||document.querySelector("#dialog")?.classList.contains("show");
  },{timeout:12000});
  if(await page.$eval("#dialog",e=>e.classList.contains("show"))){
   await clickDialog();continue;
  }
  await page.keyboard.press("q");await sleep(500);
  const snap=await state();hits=snap.woods.hits;
  if(await page.$eval("#dialog",e=>e.classList.contains("show"))){
   const message=await page.$eval("#dialogText",e=>e.textContent);
   if(message.includes("보스 공략 실패")){await clickDialog();continue}
   if(message.includes("공략 성공"))break;
  }
  await sleep(900);
 }
 report.hits=hits;await record("WOODS real Q traps");
 if(await page.$eval("#dialog",e=>e.classList.contains("show")))await clickDialog();
 // E held down for one full second collects the reward through normal keyboard listeners.
 await page.keyboard.down("e");await sleep(1450);await page.keyboard.up("e");await sleep(200);
 await record("WOODS actual hold E");
 const s=await state();
 report.pass=report.steps.some(x=>x.step==="gardener talk"&&x.state.stage===1)
   &&report.steps.some(x=>x.step==="WOODS encounter"&&x.state.stage===2)
   &&s.stage===3&&s.lotus===1&&errors.length===0&&http.length===0;
}catch(e){report.error=String(e);report.pass=false}
await page.screenshot({path:"hotel-garden-actual-play.jpg",type:"jpeg",quality:62,fullPage:true}).catch(()=>{});
await browser.close();
report.generatedAt=new Date().toISOString();
fs.writeFileSync("hotel-garden-actual-play.json",JSON.stringify(report,null,2));
console.log("HOTEL_GARDEN_REAL_KEYBOARD_QA "+JSON.stringify(report));
if(!report.pass)process.exitCode=1;

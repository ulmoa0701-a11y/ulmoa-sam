// Public-site first-mission QA using real keyboard actions only (no state teleport).
import puppeteer from "puppeteer-core";
import fs from "node:fs";
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH||"/usr/bin/google-chrome",args:["--no-sandbox","--disable-dev-shm-usage","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const page=await browser.newPage();await page.setViewport({width:1440,height:900});
const errors=[],http=[];
page.on("pageerror",e=>errors.push(String(e)));
page.on("response",r=>{if(r.status()>=400)http.push({status:r.status(),url:r.url()})});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const report={scenario:"Full route actual keyboard controls; no stage teleport or event injection",url:"https://ulmoa0701-a11y.github.io/ulmoa-sam/lab/babylon-hotel-garden/",steps:[],errors,http};
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

 const woodsState=await state();
 report.tests={woodsReal:woodsState.stage===3&&woodsState.lotus===1};
 await record("WOODS flower collected");
 // Stage 3: travel across the full map to pond keeper and interact with E, not a state override.
 report.pond=await walkTo(4,-8,4.1,80000);
 await page.keyboard.press("e");await sleep(260);await clickDialog();await record("pond keeper talk");
 report.tests.pondKeeper=(await state()).stage===4;
 // EYE: travel via normal movement until the pursuing enemy can start a telegraphed swing.
 report.eyeWalk=await walkTo(24,-15,4.2,70000);
 await record("EYE pursued");
 let eyeAttempts=0;
 while((await state()).stage===4&&eyeAttempts++<10){
  await page.waitForFunction(()=>{
   const m=document.querySelector("#mission")?.textContent||"";
   return m.includes("가지 공격 준비!")||document.querySelector("#dialog")?.classList.contains("show");
  },{timeout:21000});
  if(await page.$eval("#dialog",e=>e.classList.contains("show"))){await clickDialog();continue}
  await page.keyboard.press("Space");await sleep(1000);
  await page.waitForFunction(()=>{
   const m=document.querySelector("#mission")?.textContent||"";
   return m.includes("지금 빈틈!")||document.querySelector("#dialog")?.classList.contains("show");
  },{timeout:11000});
  if(await page.$eval("#dialog",e=>e.classList.contains("show"))){await clickDialog();continue}
  await page.keyboard.press("f");await sleep(500);
  await record("EYE real jump and F");
  if(await page.$eval("#dialog",e=>e.classList.contains("show"))){
   const dialog=await page.$eval("#dialogText",e=>e.textContent);
   if(dialog.includes("공략 성공")){await clickDialog();break}
   if(dialog.includes("보스 공략 실패")){await clickDialog();continue}
  }
 }
 if(await page.$eval("#dialog",e=>e.classList.contains("show")))await clickDialog();
 const eyeState=await state();
 report.tests.eyeReal=eyeState.stage===5&&eyeState.eye.hits===3;
 let eyeFlower=await page.evaluate(()=>window.__ulmoaGardenV2.state().flowerPositions.eye);
 if(eyeFlower)await walkTo(eyeFlower[0],eyeFlower[1],3.5,30000);
 await page.keyboard.down("e");await sleep(1500);await page.keyboard.up("e");await sleep(200);
 await record("EYE flower held-E");
 report.tests.eyePickup=(await state()).lotus===2;
 // Stage 5: obtain the bucket from the traveler by walking and talking.
 report.traveler=await walkTo(-2,18,4.1,95000);
 await page.keyboard.press("e");await sleep(300);
 await clickDialog();await record("traveler bucket");
 report.tests.bucket=(await state()).stage===6&&(await state()).bucket;
 // Stage 6: observe three times, retreat at heat warning, then approach again.
 report.smogWalk=await walkTo(29,-23,4.7,100000);
 let smogAttempts=0;
 while((await state()).stage===6&&(await state()).smog.mode!=="water"&&smogAttempts++<7){
  if((await state()).smog.mode!=="observe"){
   await walkTo(29,-23,4.6,19000);
  }
  await page.waitForFunction(()=>{
   const s=window.__ulmoaGameQa.state();return s.smog.mode==="danger"||s.smog.mode==="water"||document.querySelector("#dialog")?.classList.contains("show");
  },{timeout:22000});
  const stateNow=await state();
  if(stateNow.smog.mode==="water")break;
  if(await page.$eval("#dialog",e=>e.classList.contains("show"))){await clickDialog();continue}
  // Choose a direction pointing away from SMOG, using real keyboard presses.
  const [px,pz]=stateNow.player,dx=px-29,dz=pz+23;
  const screenX=-.8*dx+.6*dz,screenY=-.6*dx-.8*dz;
  const key=Math.abs(screenX)>=Math.abs(screenY)?(screenX>=0?"ArrowRight":"ArrowLeft"):(screenY>=0?"ArrowUp":"ArrowDown");
  await move(key,850);
  await sleep(350);
  await record("SMOG observed and retreated");
  if(await page.$eval("#dialog",e=>e.classList.contains("show")))await clickDialog();
 }
 report.tests.smogObserved=(await state()).smog.mode==="water";
 await walkTo(29,-23,5.3,35000);
 await page.keyboard.press("q");await sleep(1900);
 if(await page.$eval("#dialog",e=>e.classList.contains("show")))await clickDialog();
 await record("SMOG real water pour");
 report.tests.smogPoured=(await state()).stage===7&&!((await state()).smog.enabled);
 let smogFlower=await page.evaluate(()=>window.__ulmoaGardenV2.state().flowerPositions.smog);
 if(smogFlower)await walkTo(smogFlower[0],smogFlower[1],3.4,35000);
 await page.keyboard.down("e");await sleep(1450);await page.keyboard.up("e");await sleep(220);
 await record("SMOG flower held-E");
 report.tests.flowerThree=(await state()).lotus===3;
 report.pass=Object.values(report.tests).every(Boolean)&&errors.length===0&&http.length===0;

}catch(e){report.error=String(e);report.pass=false}
await page.screenshot({path:"hotel-garden-full-route.jpg",type:"jpeg",quality:62,fullPage:true}).catch(()=>{});
await browser.close();
report.generatedAt=new Date().toISOString();
fs.writeFileSync("hotel-garden-full-route.json",JSON.stringify(report,null,2));
console.log("HOTEL_GARDEN_FULL_REAL_ROUTE "+JSON.stringify(report));
if(!report.pass)process.exitCode=1;

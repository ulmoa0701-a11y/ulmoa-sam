// Mid-game play QA: start at EYE using the existing QA preview, then
// finish EYE and SMOG exclusively with normal keyboard inputs and NPC dialogs.
import puppeteer from "puppeteer-core";
import fs from "node:fs";
const target=process.env.HOTEL_GARDEN_TARGET||"https://ulmoa0701-a11y.github.io/ulmoa-sam/lab/babylon-hotel-garden/";
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH||"/usr/bin/google-chrome",args:["--no-sandbox","--disable-dev-shm-usage","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const page=await browser.newPage();await page.setViewport({width:1440,height:900});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const out={startedViaQaPreviewAtEye:true,tests:{},steps:[],errors:[],http:[],target};
page.on("pageerror",e=>out.errors.push(String(e)));
page.on("response",r=>{if(r.status()>=400)out.http.push({status:r.status(),url:r.url()})});
const state=()=>page.evaluate(()=>window.__ulmoaGameQa.state());
const mission=()=>page.$eval("#mission",e=>e.textContent);
const clickDialog=async()=>{await page.waitForFunction(()=>document.querySelector("#dialog")?.classList.contains("show"),{timeout:10000});await page.click("#dialogBtn");await sleep(250)};
const move=async(key,ms)=>{await page.keyboard.down(key);await sleep(ms);await page.keyboard.up(key);await sleep(100)};
const log=async(name)=>out.steps.push({name,state:await state(),mission:await mission()});
async function walkTo(x,z,radius=4.2,maxMs=100000){
 let k=0,within=false,begin=Date.now();
 while(Date.now()-begin<maxMs&&k++<220){
  const p=(await state()).player,dx=x-p[0],dz=z-p[1];
  if(Math.hypot(dx,dz)<=radius){within=true;break}
  const sx=-.8*dx+.6*dz,sy=-.6*dx-.8*dz;
  const key=Math.abs(sx)>Math.abs(sy)?(sx>=0?"ArrowRight":"ArrowLeft"):(sy>=0?"ArrowUp":"ArrowDown");
  await move(key,480);
  if(await page.$eval("#dialog",e=>e.classList.contains("show")))break;
 }
 return {within,iterations:k,player:(await state()).player};
}
try{
 await page.goto(target+"?eye-smog-qa="+Date.now(),{waitUntil:"domcontentloaded",timeout:60000});
 await page.waitForFunction(()=>window.__ulmoaGardenV2?.previewBoss&&window.__bench?.frames>2,{timeout:60000});
 await clickDialog();
 out.tests.eyeStagePrepared=await page.evaluate(()=>window.__ulmoaGardenV2.previewBoss("eye"));
 await log("EYE ready");
 let attempts=0;
 while((await state()).stage===4&&attempts++<10){
  await page.waitForFunction(()=>{
    const t=document.querySelector("#mission")?.textContent||"";
    return t.includes("가지 공격 준비!")||document.querySelector("#dialog")?.classList.contains("show");
  },{timeout:22000});
  if(await page.$eval("#dialog",e=>e.classList.contains("show"))){await clickDialog();continue}
  await page.keyboard.press("Space");await sleep(1050);
  await page.waitForFunction(()=>{
    const t=document.querySelector("#mission")?.textContent||"";
    return t.includes("지금 빈틈!")||document.querySelector("#dialog")?.classList.contains("show");
  },{timeout:9000});
  if(await page.$eval("#dialog",e=>e.classList.contains("show"))){await clickDialog();continue}
  await page.keyboard.press("f");await sleep(320);
  await log("EYE actual Space+F");
  if(await page.$eval("#dialog",e=>e.classList.contains("show"))){await clickDialog();break}
 }
 if(await page.$eval("#dialog",e=>e.classList.contains("show")))await clickDialog();
 out.tests.eyeReal=(await state()).stage===5&&(await state()).eye.hits===3;
 const eyeFlower=await page.evaluate(()=>window.__ulmoaGardenV2.state().flowerPositions.eye);
 if(eyeFlower)out.eyeRewardWalk=await walkTo(...eyeFlower,3.5,22000);
 await page.keyboard.down("e");await sleep(1450);await page.keyboard.up("e");
 out.tests.eyeLotus=(await state()).lotus>=1;await log("EYE flower");
 out.traveler=await walkTo(-2,18,4.1,95000);
 await page.keyboard.press("e");await sleep(240);await clickDialog();
 out.tests.bucket=(await state()).bucket&&(await state()).stage===6;
 await log("traveler bucket");
 out.smogWalk=await walkTo(29,-23,4.7,90000);
 for(let i=0;i<7&&((await state()).smog.mode!=="water");i++){
  if((await state()).smog.mode!=="observe")await walkTo(29,-23,4.6,25000);
  await page.waitForFunction(()=>{
    const mode=window.__ulmoaGameQa.state().smog.mode;
    return mode==="danger"||mode==="water"||document.querySelector("#dialog")?.classList.contains("show");
  },{timeout:18000});
  let current=await state();
  if(current.smog.mode==="water")break;
  if(await page.$eval("#dialog",e=>e.classList.contains("show"))){await clickDialog();continue}
  const dx=current.player[0]-29,dz=current.player[1]+23;
  const sx=-.8*dx+.6*dz,sy=-.6*dx-.8*dz;
  const key=Math.abs(sx)>Math.abs(sy)?(sx>=0?"ArrowRight":"ArrowLeft"):(sy>=0?"ArrowUp":"ArrowDown");
  await move(key,800);await sleep(300);
  await log("SMOG heat dodge");
 }
 out.tests.smogObserved=(await state()).smog.mode==="water";
 await walkTo(29,-23,5.4,25000);
 await page.keyboard.press("q");await sleep(1650);
 if(await page.$eval("#dialog",e=>e.classList.contains("show")))await clickDialog();
 out.tests.smogWater=(await state()).stage===7&&!(await state()).smog.enabled;
 await log("SMOG water poured");
 const flower=await page.evaluate(()=>window.__ulmoaGardenV2.state().flowerPositions.smog);
 if(flower)await walkTo(...flower,3.4,25000);
 await page.keyboard.down("e");await sleep(1500);await page.keyboard.up("e");
 await log("SMOG flower");
 out.tests.smogLotus=(await state()).lotus>=2;
 out.pass=Object.values(out.tests).every(Boolean)&&out.errors.length===0&&out.http.length===0;
}catch(e){out.error=String(e);out.pass=false}
out.generatedAt=new Date().toISOString();
await page.screenshot({path:"hotel-eye-smog-real-play.jpg",type:"jpeg",quality:60,fullPage:true}).catch(()=>{});
await browser.close();
fs.writeFileSync("hotel-eye-smog-real-play.json",JSON.stringify(out,null,2));
console.log("HOTEL_EYE_SMOG_REAL_PLAY "+JSON.stringify({pass:out.pass,tests:out.tests,steps:out.steps.map(x=>({name:x.name,stage:x.state?.stage})),error:out.error}));
if(!out.pass)process.exitCode=1;

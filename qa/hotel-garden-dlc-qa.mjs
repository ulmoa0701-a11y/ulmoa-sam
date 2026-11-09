// Public Babylon DLC end-to-end test. Uses real keyboard movement and dialogues
// after the established smoke test has completed the existing 3-boss quest.
import puppeteer from "puppeteer-core";
import fs from "node:fs";
fs.mkdirSync("qa/results",{recursive:true});
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH||"/usr/bin/google-chrome",args:["--no-sandbox","--disable-dev-shm-usage","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const page=await browser.newPage();await page.setViewport({width:1440,height:900});
const report={url:process.env.HOTEL_GARDEN_URL||"https://ulmoa0701-a11y.github.io/ulmoa-sam/lab/babylon-hotel-garden/",at:new Date().toISOString(),checks:{},steps:[],errors:[],httpErrors:[],pass:false};
page.on("pageerror",e=>report.errors.push(String(e)));
page.on("response",r=>{if(r.status()>=400)report.httpErrors.push({status:r.status(),url:r.url()})});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const state=()=>page.evaluate(()=>window.__ulmoaGardenDlc?.state());
const log=async(label)=>{const s=await state();report.steps.push({label,at:new Date().toISOString(),state:s});console.log("DLC_STEP",label,JSON.stringify(s));return s};
const check=(label,condition)=>{report.checks[label]=!!condition;console.log("DLC_CHECK",label,!!condition)};
const modal=()=>page.$eval("#dialog",e=>e.classList.contains("show"));
async function clickDialog(){if(await modal()){await page.keyboard.press("Enter");await wait(220)}}
async function hold(key,ms){await page.keyboard.down(key);await wait(ms);await page.keyboard.up(key);await wait(90)}
function direction(dx,dz){const sx=-.8*dx+.6*dz,sy=-.6*dx-.8*dz;return Math.abs(sx)>Math.abs(sy)?(sx>0?"ArrowRight":"ArrowLeft"):(sy>0?"ArrowUp":"ArrowDown")}
async function walkTo(x,z,radius=4,timeout=110000){
 let pulses=0,arrived=false;const start=Date.now();
 await page.keyboard.down("Shift");
 try{
  while(Date.now()-start<timeout&&pulses++<195){
   if(await modal())break;
   const s=await state(),dx=x-s.player[0],dz=z-s.player[2];
   if(Math.hypot(dx,dz)<radius){arrived=true;break}
   await hold(direction(dx,dz),Math.min(500,Math.max(150,Math.round(Math.hypot(dx,dz)*35))));
  }
 }finally{await page.keyboard.up("Shift")}
 return {arrived,pulses,state:await state()};
}
try {
 await page.goto(report.url+"?dlc-qa="+encodeURIComponent(process.env.GITHUB_SHA||Date.now()),{waitUntil:"domcontentloaded",timeout:60000});
 await page.waitForFunction(()=>window.__ulmoaGardenDlc?.state&&window.__hgShadersReady===true,{timeout:65000});
 let initial=await log("start locked");
 check("lockedUntilMainClear",initial.phase==="locked"&&!initial.shovel&&!initial.mansionVisible);
 check("mansionMeshExistsButHidden",initial.mansion3D&&!initial.mansionVisible);
 await clickDialog();
 const smoke=await page.evaluate(async()=>window.__ulmoaGardenV2.runSmoke());
 report.mainQuestSmoke={pass:smoke.pass,threeLotus:smoke.threeLotus,stage7:smoke.stage7,error:smoke.error};
 check("threeBossQuestCompleted",smoke.pass&&smoke.threeLotus&&smoke.stage7);
 await page.waitForFunction(()=>window.__ulmoaGardenDlc.state().phase==="meet",{timeout:15000});
 await clickDialog();
 let unlocked=await log("three lotus unlock");
 check("dlcUnlockAfterClear",unlocked.phase==="meet"&&unlocked.lotus===3&&unlocked.mainStage===7);
 const gardener=unlocked.gardener;
 let result=await walkTo(gardener[0],gardener[1],3.2,130000);
 console.log("DLC_WALK_GARDENER",JSON.stringify(result));
 console.log("DLC_GARDENER_BEFORE_E",JSON.stringify({state:await state(),dialog:await modal()}));
 check("reachGardenerWithKeyboard",result.arrived);
 await page.keyboard.press("e");await wait(350);
 console.log("DLC_GARDENER_AFTER_E",JSON.stringify({state:await state(),dialog:await modal(),shopOpen:await page.$eval("#hg4Shop",e=>e.classList.contains("open"))}));
 const gardenerText=await page.$eval("#dialogText",el=>el.textContent);
 check("gardenerMentionsDifferentSoil",gardenerText.includes("보랏빛 흙")&&gardenerText.includes("삽"));
 await clickDialog();
 let shovel=await log("gardener hands shovel");
 check("shovelAwarded",shovel.shovel&&shovel.phase==="dig");
 result=await walkTo(-17,-12,3.2,95000);
 check("walkToDifferentColorSoil",result.arrived);
 for(let i=1;i<=3;i++){await page.keyboard.press("e");await wait(710);const v=await log("dig "+i);check("dig"+i,v.digs===i)}
 let exposed=await state();
 check("ladderRevealedAfterThreeDigs",exposed.ladder&&exposed.phase==="ladder");
 check("ladderMeshExists",await page.evaluate(()=>document.getElementById("hg5Action")&&window.__ulmoaGardenDlc.state().ladder));
 await clickDialog();
 await page.keyboard.press("e");await wait(250);
 check("ladderDescentStarts",["descending","underground"].includes((await state()).phase));
 await page.waitForFunction(()=>window.__ulmoaGardenDlc.state().phase==="underground",{timeout:18000});
 let down=await log("underground arrived");
 check("separate3DUndergroundWorld",down.underground&&down.mansionVisible&&down.player[1]<-55);
 await clickDialog();
 await page.screenshot({path:"qa/results/hotel-garden-dlc-first-arrival.png"});
 result=await walkTo(17,-11,4.1,135000);
 console.log("DLC_WALK_MANSION",JSON.stringify(result));
 check("walkToGrandMansion",result.arrived);
 await page.screenshot({path:"qa/results/hotel-garden-dlc-mansion-front.png"});
 await page.keyboard.press("e");await wait(330);
 const entranceText=await page.$eval("#dialogText",e=>e.textContent);
 let mansion=await log("enter grand mansion");
 check("mansionEntranceDialog",entranceText.includes("저택")&&entranceText.includes("대리석"));
 check("mansionDoorOpenAndEntered",mansion.mansionEntered&&mansion.phase==="mansion");
 await clickDialog();
 await page.screenshot({path:"qa/results/hotel-garden-dlc-mansion-lobby.png"});
 check("originalStageAndLotusPreserved",mansion.mainStage===7&&mansion.lotus===3);
 check("noScriptErrors",report.errors.length===0);
 check("noHttpErrors",report.httpErrors.length===0);
}catch(e){report.error=String(e);report.errors.push(String(e))}
report.pass=Object.keys(report.checks).length>=20&&Object.values(report.checks).every(Boolean);
fs.writeFileSync("qa/results/hotel-garden-dlc-qa.json",JSON.stringify(report,null,2));
console.log("HOTEL_GARDEN_DLC_QA",JSON.stringify({pass:report.pass,error:report.error,checks:report.checks,steps:report.steps.map(v=>({label:v.label,phase:v.state.phase,pos:v.state.player}))}));
await browser.close();
if(!report.pass)process.exitCode=1;

// V6 browser regression: child playtest fixes, real keyboard and rendered states.
import puppeteer from "puppeteer-core";
import fs from "node:fs";
fs.mkdirSync("qa/results",{recursive:true});
const url=process.env.HOTEL_GARDEN_URL||"https://ulmoa0701-a11y.github.io/ulmoa-sam/lab/babylon-hotel-garden/";
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH||"/usr/bin/google-chrome",args:["--no-sandbox","--disable-dev-shm-usage","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const page=await browser.newPage();await page.setViewport({width:1440,height:900});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const report={at:new Date().toISOString(),url,checks:{},errors:[],http:[],pass:false};
page.on("pageerror",e=>report.errors.push(String(e)));
page.on("console",e=>{if(e.type()==="error")report.errors.push(e.text())});
page.on("response",r=>{if(r.status()>=400)report.http.push({status:r.status(),url:r.url()})});
const check=(name,ok)=>{report.checks[name]=!!ok;console.log("V6_CHECK",name,!!ok)};
const state=()=>page.evaluate(()=>window.__ulmoaGardenFeedbackV6.state());
try{
 await page.goto(url+"?v6-qa="+Date.now(),{waitUntil:"domcontentloaded",timeout:60000});
 await page.waitForFunction(()=>window.__hgShadersReady&&window.__ulmoaGardenFeedbackV6?.state(),{timeout:65000});
 const initial=await state();
 check("playerShoesMoveWithBothLegs",initial.shoesAttached);
 check("npcBootsFollowNPCFeet",initial.linkedFootwear===18);
 check("nightFlashlightInitiallyOff",!initial.flashlightOn);
 check("npcHasSolidBody",initial.peopleSolid);
 check("npcFootprintIsActuallyBlocked",await page.evaluate(()=>{
  const v=window.__ulmoaGardenFeedbackV6;
  return v.probeHuman(-3,1)&&!v.probeHuman(-40,-30);
 }));
 const visual=await page.evaluate(()=>({
  top:parseFloat(getComputedStyle(document.getElementById("hg4Combat")).top),
  hand:!!document.querySelector("#hg7FlashHint"),
  beam:!!window.__ulmoaGardenFeedbackV6
 }));
 check("nextAttackCardLowered",visual.top>=215);
 check("flashlightModelExists",visual.hand&&visual.beam);
 await page.click("#dialogBtn");await wait(300);
 const woods=await page.evaluate(()=>window.__ulmoaGardenV2.previewBoss("woods"));
 check("woodsPreviewEntersBattle",woods&&(await state()).stage===2);
 // Treat a shown success card as a blocking modal: enemy AI and timers must freeze.
 await page.evaluate(()=>document.getElementById("dialog").classList.add("show"));
 const before=await page.evaluate(()=>window.__ulmoaGameQa.state());
 await wait(2900);
 const after=await page.evaluate(()=>window.__ulmoaGameQa.state());
 const paused=await state();
 check("bossFrozenWhileVictoryCardVisible",before.woods.damage===after.woods.damage&&after.woods.hits===before.woods.hits&&paused.modalPaused);
 check("combatPanelHiddenUnderSuccessPopup",paused.combatDisplay==="none");
 await page.evaluate(()=>document.getElementById("dialog").classList.remove("show"));
 const smog=await page.evaluate(()=>window.__ulmoaGardenV2.previewBoss("smog"));
 await wait(550);
 const focus=await state();
 check("smogCameraFollowsPlayer",smog&&focus.stage===6&&focus.smogPlayerFocus!==null&&focus.smogPlayerFocus<.20);
 const lit=await page.evaluate(()=>window.__ulmoaGardenFeedbackV6.previewNight());
 await wait(550);
 const night=await state();
 check("flashlightAutoOnAtNight",lit&&night.nightEligible&&night.flashlightOn);
 check("flashlightHintVisible",await page.$eval("#hg7FlashHint",e=>getComputedStyle(e).display==="block"));
 await page.screenshot({path:"qa/results/hotel-garden-v6-night-flashlight.png"});
 check("noRuntimeErrors",report.errors.length===0);
 check("noHttpErrors",report.http.length===0);
}catch(e){report.error=String(e);report.errors.push(String(e))}
report.pass=Object.keys(report.checks).length>=12&&Object.values(report.checks).every(Boolean);
fs.writeFileSync("qa/results/hotel-garden-v6-qa.json",JSON.stringify(report,null,2));
console.log("HOTEL_GARDEN_V6_QA",JSON.stringify(report));
await browser.close();
if(!report.pass)process.exitCode=1;

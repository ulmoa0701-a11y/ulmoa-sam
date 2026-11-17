// V7 child playtest: real hand-emitted torch, light isolation, mobile HUD and lost-focus controls.
import puppeteer from "puppeteer-core";
import fs from "node:fs";
fs.mkdirSync("qa/results",{recursive:true});
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH||"/usr/bin/google-chrome",args:["--no-sandbox","--disable-dev-shm-usage","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const page=await browser.newPage();
await page.setViewport({width:1440,height:900});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const report={at:new Date().toISOString(),checks:{},errors:[],httpErrors:[],pass:false};
page.on("pageerror",e=>report.errors.push(String(e)));
page.on("console",e=>{if(e.type()==="error")report.errors.push(e.text())});
page.on("response",r=>{if(r.status()>=400)report.httpErrors.push({status:r.status(),url:r.url()})});
const check=(k,v)=>{report.checks[k]=!!v;console.log("V7_CHECK",k,!!v)};
const state=()=>page.evaluate(()=>window.__ulmoaGardenFeedbackV7.state());
try{
 const url=process.env.HOTEL_GARDEN_URL||"https://ulmoa0701-a11y.github.io/ulmoa-sam/lab/babylon-hotel-garden/";
 report.url=url;
 await page.goto(url+"?v7-qa="+Date.now(),{waitUntil:"domcontentloaded",timeout:60000});
 await page.waitForFunction(()=>window.__hgShadersReady&&window.__ulmoaGardenFeedbackV7?.state(),{timeout:65000});
 const initial=await state();
 check("torchOffDuringDay",!initial.torchOn&&!initial.torchBodyEnabled&&!initial.torchBeamEnabled&&initial.torchGlowIntensity===0);
 await page.click("#dialogBtn");
 await wait(350);
 await page.keyboard.down("ArrowUp");
 await wait(100);
 check("movementInputRecognized",(await state()).movementKeysHeld);
 await page.evaluate(()=>window.dispatchEvent(new Event("blur")));
 check("lostFocusReleasesMovement",!(await state()).movementKeysHeld);
 await page.keyboard.up("ArrowUp");
 const enabled=await page.evaluate(()=>window.__ulmoaGardenFeedbackV6.previewNight());
 await wait(600);
 const night=await state();
 check("torchEnabledAtNight",enabled&&night.torchOn&&night.torchBodyEnabled&&night.torchBeamEnabled);
 check("torchGlowIsIndependentOfGlobalNightLights",Math.abs(night.torchGlowIntensity-1.45)<.01);
 check("beamOriginAnchoredToHand",night.beamStartsAtHand<.03);
 await page.keyboard.down("ArrowUp");
 await wait(650);
 const moving=await state();
 await page.keyboard.up("ArrowUp");
 check("beamTracksMovingHand",moving.torchOn&&moving.beamStartsAtHand<.03);
 await page.screenshot({path:"qa/results/hotel-garden-v7-night-hand-torch.png"});
 await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1});
 await wait(350);
 const ui=await page.evaluate(()=>({
  mobile:innerWidth===390,
  combatTop:parseFloat(getComputedStyle(document.getElementById("hg4Combat")).top),
  torchHint:getComputedStyle(document.getElementById("hg7FlashHint")).display,
  touchMove:getComputedStyle(document.getElementById("touchMove")).display,
  touchAction:getComputedStyle(document.getElementById("touchAction")).display,
  overflow:document.documentElement.scrollWidth>innerWidth+8
 }));
 check("mobileCombatMessageNotAtVeryTop",ui.mobile&&ui.combatTop>=185&&ui.combatTop<=250);
 check("mobileControlsAndTorchHintVisible",ui.torchHint==="block"&&ui.touchMove!=="none"&&ui.touchAction!=="none");
 check("noMobileHorizontalOverflow",!ui.overflow);
 await page.screenshot({path:"qa/results/hotel-garden-v7-mobile-hud.png"});
 check("noJSConsoleErrors",report.errors.length===0);
 check("noHTTPFailures",report.httpErrors.length===0);
}catch(e){report.error=String(e);report.errors.push(String(e))}
report.pass=Object.keys(report.checks).length>=10&&Object.values(report.checks).every(Boolean);
fs.writeFileSync("qa/results/hotel-garden-v7-qa.json",JSON.stringify(report,null,2));
console.log("HOTEL_GARDEN_V7_QA",JSON.stringify(report));
await browser.close();
if(!report.pass)process.exitCode=1;

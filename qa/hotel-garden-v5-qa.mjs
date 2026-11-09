// V5 isolated browser regression for child play-test feedback.
import puppeteer from "puppeteer-core";
import fs from "node:fs";
fs.mkdirSync("qa/results",{recursive:true});
const url=process.env.HOTEL_GARDEN_URL||"https://ulmoa0701-a11y.github.io/ulmoa-sam/lab/babylon-hotel-garden/";
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH||"/usr/bin/google-chrome",args:["--no-sandbox","--disable-dev-shm-usage","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const page=await browser.newPage();await page.setViewport({width:1440,height:900});
const report={at:new Date().toISOString(),url,checks:{},errors:[],http:[],pass:false};
page.on("pageerror",e=>report.errors.push(String(e)));
page.on("response",r=>{if(r.status()>=400)report.http.push({status:r.status(),url:r.url()})});
const check=(k,v)=>{report.checks[k]=!!v;console.log("V5_CHECK",k,!!v)};
try{
 await page.goto(url+"?v5-qa="+Date.now(),{waitUntil:"domcontentloaded",timeout:60000});
 await page.waitForFunction(()=>window.__ulmoaGardenFeedbackV5?.state()&&window.__hgShadersReady===true,{timeout:65000});
 const start=await page.evaluate(()=>window.__ulmoaGardenFeedbackV5.state());
 check("playerShoeModelsExist",start.shoes);
 check("purpleSoilHiddenAtStart",!start.soilVisible&&start.phase==="locked");
 check("manorOnRightOfAvenue",start.manorLocation[0]===17&&start.manorLocation[1]===7&&start.door[1]===.1);
 check("23RealStairs",start.stairCount===23&&await page.evaluate(()=>!!window.__ulmoaGardenFeedbackV5&&!!document.querySelector("#hg6PlayerSilhouette")));
 const collision=await page.evaluate(()=>{
  const p=window.__ulmoaGardenFeedbackV5.probeCollision;
  return {
   house:p(-5,-4,"garden"),
   tree:p(-11,-8,"garden"),
   lamp:p(-2,-6,"garden"),
   pond:p(4,-3,"garden"),
   free:!p(-18,-6,"garden"),
   manorClosed:p(17,.1,"underground"),
   undergroundRoadClear:!p(-27,-12,"underground"),
   stairwellSealedUntilEntry:p(17,7+2,"underground")
  };
 });
 for(const [k,v]of Object.entries(collision))check("collision_"+k,v);
 check("woodsShortRangeDefined",start.woodsDangerRadius===8.2);
 await page.screenshot({path:"qa/results/hotel-garden-v5-garden.png"});
 const ui=await page.evaluate(()=>({hasSickle:!!document.getElementById("hg4SickleNote"),hasShop:!!document.getElementById("hg4Shop"),hasDlc:!!document.getElementById("hg5Quest"),hasSilhouette:!!document.getElementById("hg6PlayerSilhouette")}));
 check("previousFeaturesPreserved",Object.values(ui).every(Boolean));
 check("noBrowserErrors",report.errors.length===0);
 check("noHttpErrors",report.http.length===0);
}catch(e){report.error=String(e);report.errors.push(String(e))}
report.pass=Object.keys(report.checks).length>=15&&Object.values(report.checks).every(Boolean);
fs.writeFileSync("qa/results/hotel-garden-v5-qa.json",JSON.stringify(report,null,2));
console.log("HOTEL_GARDEN_V5_QA",JSON.stringify(report));
await browser.close();
if(!report.pass)process.exitCode=1;

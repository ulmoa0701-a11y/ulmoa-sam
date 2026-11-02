// Dedicated V4 public-site QA. Tests in-browser features without modifying saved player state on the user's device.
import puppeteer from "puppeteer-core";
import fs from "node:fs";
fs.mkdirSync("qa/results",{recursive:true});
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH||"/usr/bin/google-chrome",args:["--no-sandbox","--disable-dev-shm-usage","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const page=await browser.newPage();await page.setViewport({width:1440,height:900});
const report={url:"https://ulmoa0701-a11y.github.io/ulmoa-sam/lab/babylon-hotel-garden/",at:new Date().toISOString(),checks:{},errors:[],httpErrors:[]};
page.on("pageerror",e=>report.errors.push(String(e)));
page.on("response",r=>{if(r.status()>=400)report.httpErrors.push({status:r.status(),url:r.url()})});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const state=()=>page.evaluate(()=>window.__ulmoaGardenV4?.state());
const check=(name,value)=>{report.checks[name]=!!value;console.log("V4_CHECK",name,!!value)};
try{
 await page.goto(report.url+"?v=v4-20261102",{waitUntil:"domcontentloaded",timeout:60000});
 await page.waitForFunction(()=>window.__ulmoaGardenV4?.state()&&window.__hgShadersReady,{timeout:45000});
 const start=await state();
 check("v4Loaded",!!start);
 check("shopOnExistingHouse",start.shopExists&&start.shopIsOriginalBuilding);
 check("noSecondFreestandingShop",!start.detachedShopExists);
 check("npcAllPresentAtStart",start.allNpcs.every(Boolean));
 check("correctAreaLabel",await page.$eval("#area",e=>e.textContent.includes("호텔 밖 정원")&&!e.textContent.includes("호텔 앞 정원")));
 check("noPermanentGardenerTarget",await page.$eval("#target",e=>getComputedStyle(e).display==="none"));
 await page.keyboard.press("Enter");await sleep(150);
 check("enterAdvancesDialog",await page.$eval("#dialog",e=>!e.classList.contains("show")));
 const oldQText=await page.$eval("#notice",e=>e.textContent);await page.keyboard.press("q");await sleep(120);
 check("unneededQSilent",(await page.$eval("#notice",e=>e.textContent))===oldQText);
 // Walk to the shop with real keyboard actions. Test never changes game coordinates directly.
 const shopPos=[-5,-7.4];let arrived=false;
 for(let i=0;i<65;i++){
  const p=await page.evaluate(()=>window.__ulmoaGameQa.state().player);
  const dx=shopPos[0]-p[0],dz=shopPos[1]-p[1];
  if(Math.hypot(dx,dz)<3.25&&p[1]<-5.35){arrived=true;break}
  const sx=-.8*dx+.6*dz,sy=-.6*dx-.8*dz,axis=Math.abs(sx)>=Math.abs(sy)?(sx>0?"ArrowRight":"ArrowLeft"):(sy>0?"ArrowDown":"ArrowUp");
  await page.keyboard.down(axis);await sleep(310);await page.keyboard.up(axis);await sleep(60);
 }
 check("walkedToShopWithKeyboard",arrived);
 console.log("V4_SHOP_DIAG_BEFORE",JSON.stringify({state:await state(),game:await page.evaluate(()=>window.__ulmoaGameQa.state()),dialog:await page.$eval("#dialog",e=>e.className)}));
 if(arrived){
  await page.keyboard.press("e");await sleep(300);
  check("shopOpensAtOriginalHouseWithE",await page.$eval("#hg4Shop",e=>e.classList.contains("open")));
  await page.keyboard.press("Escape");await sleep(130);
  await page.keyboard.press("b");await sleep(400);
  console.log("V4_SHOP_DIAG_AFTER",JSON.stringify({state:await state(),overlay:await page.$eval("#hg4Shop",e=>e.className),shopButton:await page.$eval("#hg4ShopButton",e=>getComputedStyle(e).display)}));
  check("shopOpensByB",await page.$eval("#hg4Shop",e=>e.classList.contains("open")));
  const before=await state();
  const offers=await page.$$eval("#hg4Offers button",bs=>bs.map(b=>b.textContent));
  check("threeRandomSeedOffers",offers.length===3&&new Set(offers).size===3);
  const affordable=await page.$("#hg4Offers button:not([disabled])");
  if(affordable){await affordable.click();await sleep(130)}
  const after=await state();
  check("seedPurchaseWorks",after.coins<before.coins&&Object.values(after.bag).some(n=>n>0));
  await page.screenshot({path:"qa/results/hotel-garden-v4-shop.png"});
  await page.keyboard.press("Escape");await sleep(130);
  check("shopEscapeCloses",await page.$eval("#hg4Shop",e=>!e.classList.contains("open")));
  await page.keyboard.press("p");await sleep(180);
  const planted=await page.evaluate(()=>window.__ulmoaGardenV4.state().bag);
  check("seedPlantConsumesInventory",Object.values(planted).reduce((a,n)=>a+Number(n||0),0)<Object.values(after.bag).reduce((a,n)=>a+Number(n||0),0));
 }
 // Internal preview is only used for checking battle UI isolation. Full real-play checks run separately.
 const woodsPreview=await page.evaluate(()=>window.__ulmoaGardenV2.previewBoss("woods"));await sleep(1200);console.log("V4_BOSS_DIAG",JSON.stringify({preview:woodsPreview,state:await state(),game:await page.evaluate(()=>window.__ulmoaGameQa.state())}));
 let woods=await state();
 check("npcPresentDuringBoss",woods.allNpcs.every(Boolean));
 check("combatTimerVisible",woods.bossTimer);
 // Pressing E during battle, away from a collectible, must not produce NPC talk warning.
 const oldEText=await page.$eval("#notice",e=>e.textContent);await page.keyboard.press("e");await sleep(100);
 check("talkSilentDuringBoss",(await page.$eval("#notice",e=>e.textContent))===oldEText);
 const eyePreview=await page.evaluate(()=>window.__ulmoaGardenV2.previewBoss("eye"));await sleep(950);
 const oldEyeText=await page.$eval("#notice",e=>e.textContent);await page.keyboard.press("q");await sleep(130);
 check("qSilentInEyeBattle",(await page.$eval("#notice",e=>e.textContent))===oldEyeText);console.log("V4_EYE_DIAG",JSON.stringify({preview:eyePreview,state:await state()}));
 const screen=await state();
 check("npcPresentDuringEye",screen.allNpcs.every(Boolean));
 await page.screenshot({path:"qa/results/hotel-garden-v4-boss.png"});
 // Smoke checks three boss rewards, while pond-keeper sickle delivery requires separate actual dialogue QA.
 const smoke=await page.evaluate(async()=>await window.__ulmoaGardenV2.runSmoke());
 report.smoke={pass:smoke.pass,error:smoke.error,threeLotus:smoke.threeLotus};
 const end=await state();
 check("sickleWorldObjectExists",await page.$eval("#hg4SickleNote",e=>!!e));
 report.sickleRequiresRealPondTalk=true;
 check("bossRewardsGiveSeeds",end.coins>=3);
 check("npcPresentAfterBosses",end.allNpcs.every(Boolean));
 check("noFatalBrowserErrors",report.errors.length===0);
 check("noHttpErrors",report.httpErrors.length===0);
}catch(e){report.error=String(e);report.errors.push(String(e))}
report.pass=Object.keys(report.checks).length>=18&&Object.values(report.checks).every(Boolean);
fs.writeFileSync("qa/results/hotel-garden-v4-qa.json",JSON.stringify(report,null,2));
console.log("HOTEL_GARDEN_V4_QA",JSON.stringify(report));
await browser.close();
if(!report.pass)process.exitCode=1;

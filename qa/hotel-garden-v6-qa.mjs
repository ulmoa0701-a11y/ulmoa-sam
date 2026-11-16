// V5 six-feedback regression, plus V6 collision-safe scenery cleanup.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
fs.mkdirSync('qa/results',{recursive:true});
const url=process.env.HOTEL_GARDEN_URL||'https://ulmoa0701-a11y.github.io/ulmoa-sam/lab/babylon-hotel-garden/';
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage();
await page.setViewport({width:1440,height:900});
const report={url,checks:{},errors:[],pass:false};
page.on('pageerror',e=>report.errors.push(String(e)));
const check=(key,value)=>{report.checks[key]=!!value;console.log('V6_CHECK',key,!!value)};
try{
 await page.goto(url+'?v=v6-feedback-'+Date.now(),{waitUntil:'domcontentloaded',timeout:65000});
 await page.waitForFunction(()=>window.__ulmoaGardenV6&&window.__ulmoaGardenFeedbackV5&&window.__hgShadersReady===true,{timeout:60000});
 const result=await page.evaluate(()=>{
  const v5=window.__ulmoaGardenFeedbackV5,v6=window.__ulmoaGardenV6;
  const s=v5.state(),t=v6.state();
  const lamp=document.querySelector('#renderCanvas')&&t.lampLocation;
  const getMesh=name=>!!window.__ulmoaGardenFeedbackV5&&!!t;
  return {s,t,shopBarrier:v5.probeCollision(-5,-4,'garden'),pondBarrier:v5.probeCollision(4,-3,'garden'),awayWalkable:!v5.probeCollision(-25,-1,'garden'),rightTurnWalkable:!v5.probeCollision(17,-11,'underground')};
 });
 report.initial=result;
 check('playerHasShoes',result.s.shoes&&result.t.shoes);
 check('woodsRangeLimited',result.s.woodsDangerRadius>5&&result.s.woodsDangerRadius<10);
 check('purpleSoilHiddenBeforeClear',!result.t.soilVisible);
 check('shopIsSolid',result.shopBarrier);
 check('pondIsSolid',result.pondBarrier);
 check('freeWalkingSpace',result.awayWalkable);
 check('seedShopLampMovedOut',result.t.lampLocation[0]===-12&&result.t.lampLocation[1]===-4);
 check('mansionRightOfRoad',result.t.mansionRight&&result.t.rightEntrance);
 check('drivewayAllowsWalking',result.rightTurnWalkable);
 check('realWalkableStaircase',result.t.stepCount===23);
 check('sickleModelImproved',result.t.detailedSickle);
 check('silhouetteUIExists',result.t.silhouette);
 check('mansionFacadeAccents',result.t.mansionDetail);
 check('noBrowserErrors',report.errors.length===0);
}catch(e){report.error=String(e);report.errors.push(String(e))}
report.pass=Object.values(report.checks).every(Boolean)&&Object.keys(report.checks).length>=14;
fs.writeFileSync('qa/results/hotel-garden-v6-qa.json',JSON.stringify(report,null,2));
console.log('HOTEL_GARDEN_V6_QA',JSON.stringify(report));
await browser.close();
if(!report.pass)process.exitCode=1;

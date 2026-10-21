import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const target='https://ulmoa0701-a11y.github.io/ulmoa-sam/lab/babylon-hotel-garden/';
// 2026-10-21: verify child feedback v3 boss appearance, combat and reward wayfinding.
// Recheck actual held-E keydown/up and touch pointerdown/up against public bundle.
// Ensure stage transition camera captures the full WOODS silhouette rather than clipping it.
// Re-run against current public main to verify shader assets and single Babylon scene (2026-10-20).
const chrome=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const cases=[
  {name:'desktop',viewport:{width:1440,height:900}},
  {name:'mobile',viewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1}}
];
const results=[];
for(const test of cases){
  const page=await browser.newPage();
  await page.setViewport(test.viewport);
  const errors=[],networkFailures=[],httpErrors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('requestfailed',r=>networkFailures.push({url:r.url(),failure:r.failure()?.errorText}));
  page.on('response',r=>{if(r.status()>=400)httpErrors.push({status:r.status(),url:r.url()})});
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  const result={viewport:test.name,tests:{},errors,networkFailures,httpErrors};
  try {
    await page.goto(target+'?qa='+encodeURIComponent(process.env.GITHUB_SHA||Date.now()),{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>Boolean(window.__ulmoaGameQa?.state&&window.__ulmoaGardenV2?.runSmoke),{timeout:60000});
    await page.waitForFunction(()=>Number(window.__bench?.frames)>2,{timeout:15000});
    result.start=await page.evaluate(()=>{
      const rect=id=>{const el=document.getElementById(id);if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};
      const boxOverlap=(a,b)=>!!a&&!!b&&Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))>5&&Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y))>5;
      const target=rect('target'),lotus=rect('lotusHud'),bucket=rect('bucketHud');
      return {state:window.__ulmoaGameQa.state(),shaderReady:window.__hgShadersReady||false,shaderError:window.__hgShaderError||null,lotusNodes:document.querySelectorAll('#lotusHud').length,gameModules:[...document.querySelectorAll('script[type="module"]')].map(x=>x.src),fps:window.__bench.avgFps,frames:window.__bench.frames,canvas:document.querySelectorAll('canvas').length,overflow:document.documentElement.scrollWidth>window.innerWidth,
        lotusText:document.querySelector('#lotusHud')?.textContent||'',timer:document.querySelector('#timer')?.textContent||'',
        hudCollision:boxOverlap(target,lotus),target,lotus,bucket,dialogVisible:document.querySelector('#dialog')?.classList.contains('show')};
    });
    result.tests.load=result.start.canvas===1&&result.start.lotusNodes===1&&result.start.frames>2&&result.start.state?.stage===0&&result.start.dialogVisible&&result.start.shaderReady===true;
    result.tests.hud=!result.start.overflow&&result.start.lotusText.includes('0/3')&&!result.start.hudCollision&&result.start.timer==='07:00';
    await page.screenshot({path:'hotel-garden-'+test.name+'-start.jpg',type:'jpeg',quality:55,fullPage:true});
    await page.click('#dialogBtn');
    await sleep(300);
    let before=await page.evaluate(()=>window.__ulmoaGameQa.state().player);
    if(test.name==='mobile'){
      const btn=await page.$('#touchMove button[data-move="up"]');
      const r=await btn.boundingBox();
      await page.mouse.move(r.x+r.width/2,r.y+r.height/2);
      await page.mouse.down();await sleep(800);await page.mouse.up();
    }else{
      await page.keyboard.down('ArrowUp');await sleep(800);await page.keyboard.up('ArrowUp');
    }
    await sleep(150);
    let after=await page.evaluate(()=>window.__ulmoaGameQa.state().player);
    result.move={before,after,distance:+Math.hypot(after[0]-before[0],after[1]-before[1]).toFixed(2)};
    result.tests.movement=result.move.distance>0.15;
    await page.keyboard.down('Shift');await sleep(100);
    const shift=await page.evaluate(()=>window.__ulmoaGardenV2.state().sprinting);
    await page.keyboard.up('Shift');
    const shiftOff=await page.evaluate(()=>!window.__ulmoaGardenV2.state().sprinting);
    result.tests.shiftSprint=shift&&shiftOff;
    for(const boss of ['woods','eye','smog']){
      const ready=await page.evaluate(name=>window.__ulmoaGardenV2.previewBoss(name),boss);
      result.tests['preview_'+boss]=ready===true;
      await sleep(1100);
      await page.screenshot({path:'hotel-garden-'+test.name+'-boss-'+boss+'.jpg',type:'jpeg',quality:65,fullPage:true});
    }
    result.smoke=await page.evaluate(async()=>await window.__ulmoaGardenV2.runSmoke());
    result.tests.bossFlow=result.smoke?.pass===true;
    result.tests.endState=(await page.evaluate(()=>window.__ulmoaGameQa.state())).stage===7;
    await page.screenshot({path:'hotel-garden-'+test.name+'-smoke.jpg',type:'jpeg',quality:55,fullPage:true});
  }catch(e){result.error=String(e)}
  result.tests.noFatalError=!result.error&&errors.length===0&&networkFailures.length===0&&httpErrors.length===0;
  result.pass=Object.values(result.tests).every(Boolean);
  results.push(result);
  console.log('HOTEL_GARDEN_'+test.name.toUpperCase()+' '+JSON.stringify(result));
  await page.close();
}
await browser.close();
const report={generatedAt:new Date().toISOString(),url:target,kind:'real public browser loading and controls; internal event-path smoke (NOT full human playthrough)',results,pass:results.every(r=>r.pass)};
fs.writeFileSync('hotel-garden-public-qa.json',JSON.stringify(report,null,2));
console.log('HOTEL_GARDEN_PUBLIC_QA '+JSON.stringify({pass:report.pass,checks:results.map(r=>({viewport:r.viewport,tests:r.tests,smoke:r.smoke,error:r.error}))}));
if(!report.pass)process.exitCode=1;

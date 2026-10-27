import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { chromium } from "playwright-core";

// Test the deployed GitHub Pages address, not a local checkout.
const BASE="https://ulmoa0701-a11y.github.io/ulmoa-sam/boomwhacker/heart-playalong-v4/";
const OUT="boomwhacker/heart-playalong-v4/live-qa-artifacts";
fs.mkdirSync(OUT,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||"/usr/bin/google-chrome",args:["--no-sandbox","--autoplay-policy=no-user-gesture-required"]});
const report={url:BASE,checks:[],screenshots:[],errors:[]};
const check=(ok,msg)=>{if(!ok)throw Error(msg);report.checks.push(msg)};
try {
  const probe=await browser.newPage();
  let deployed=false,lastError="";
  for(let attempt=0;attempt<60;attempt++){
    try {
      const response=await probe.goto(BASE+"?v4_live="+Date.now(),{waitUntil:"domcontentloaded",timeout:20000});
      deployed=!!response?.ok()&&await probe.evaluate(()=>(
        document.querySelector(".heading > p")?.textContent.includes("하트 악보를 보며")&&
        typeof window.__HEART_V4_QA__?.getState==="function"&&
        typeof window.__HEART_V4_QA__.getState().speed==="number"
      ));
      if(deployed)break;
    }catch(e){lastError=String(e)}
    await new Promise(resolve=>setTimeout(resolve,5000));
  }
  check(deployed,"public V4 has deployed the newest PR build; "+lastError);
  await probe.close();
  for(const config of [{name:"pc-1440",width:1440,height:900},{name:"mobile-390",width:390,height:844}]){
    const context=await browser.newContext({viewport:{width:config.width,height:config.height},deviceScaleFactor:1});
    const page=await context.newPage();
    const errors=[];
    page.on("pageerror",e=>errors.push("JS "+e.message));
    page.on("console",m=>{
      if(m.type()==="error")errors.push("CONSOLE "+m.text()+" @ "+(m.location()?.url||"unknown"));
    });
    page.on("response",r=>{
      if(r.status()>=400)errors.push("HTTP "+r.status()+" "+r.url());
    });
    const response=await page.goto(BASE+"?view="+config.name+"&cache="+Date.now(),{waitUntil:"networkidle",timeout:25000});
    check(!!response?.ok(),config.name+": public HTTP success");
    check(await page.locator(".transport #play").isVisible(),config.name+": playback control available");
    const geometry=await page.evaluate(()=>{
      const q=window.__HEART_V4_QA__,stage=document.querySelector("#stage").getBoundingClientRect();
      return {nativeW:document.querySelector("#score").width,stageW:stage.width,
        viewport:innerWidth,scrollW:document.documentElement.scrollWidth,
        musicMeter:window.__PERFORMANCE_SCORES__.map(s=>s.meter),
        assets:q.assets(),mode:q.getState().motion};
    });
    check(geometry.nativeW===(config.width===390?820:1440),config.name+": native responsive score canvas");
    check(geometry.scrollW<=geometry.viewport+1,config.name+": no horizontal overflow");
    check([2,3,4].every(m=>geometry.musicMeter.includes(m)),config.name+": original 2/4 3/4 4/4 arrangements");
    check(Object.values(geometry.assets).every(Boolean),config.name+": public backdrop/heart/Moa assets");
    check(geometry.mode==="footsteps",config.name+": low-distraction default");
    await page.locator("#drawer summary").click();
    for(const theme of ["forest","night","classroom"]){
      await page.locator('[data-theme="'+theme+'"]').click();
      const signatures=[];
      for(const guide of ["footsteps","heart","moa"]){
        await page.locator('[data-guide="'+guide+'"]').click();
        const metrics=await page.evaluate(()=>{
          const q=window.__HEART_V4_QA__;q.render(.75);
          return {state:q.getState(),data:document.querySelector("#score").toDataURL()};
        });
        check(metrics.state.theme===theme&&metrics.state.motion===guide,config.name+": "+theme+" + "+guide+" mode");
        signatures.push(createHash("sha256").update(metrics.data).digest("hex"));
        const name=config.name+"-"+theme+"-"+guide+".png";
        await page.locator("#stage").screenshot({path:OUT+"/"+name});
        report.screenshots.push(name);
      }
      check(new Set(signatures).size===3,config.name+": "+theme+" guide modes must change actual canvas pixels");
    }
    await page.locator("#song").selectOption("0");
    await page.locator('[data-guide="footsteps"]').click();
    await page.locator("#tempo").selectOption("0.75");
    await page.locator("#play").click();
    await page.waitForTimeout(2250);
    const before=await page.evaluate(()=>window.__HEART_V4_QA__.getState());
    check(before.audioState==="running"&&before.beat>=.5&&before.playedCount>=2,
      config.name+": public melody really schedules original notes after count-in");
    await page.locator("#tempo").selectOption("1.15");
    const changed=await page.evaluate(()=>window.__HEART_V4_QA__.getState());
    check(changed.playing&&changed.speed===1.15&&Math.abs(changed.beat-before.beat)<.35,
      config.name+": live tempo keeps beat and playback");
    await page.locator("#play").click();
    check((await page.locator("#play span").textContent())==="이어서 연주",
      config.name+": correct paused/resume label");
    const paused=await page.evaluate(()=>window.__HEART_V4_QA__.getState());
    await page.locator("#tempo").selectOption("1");
    const preserved=await page.evaluate(()=>window.__HEART_V4_QA__.getState());
    check(!preserved.playing&&Math.abs(preserved.beat-paused.beat)<.001,
      config.name+": tempo keeps paused position");
    await page.locator("#play").click();
    await page.waitForTimeout(140);
    const resumed=await page.evaluate(()=>window.__HEART_V4_QA__.getState());
    check(resumed.playing&&resumed.beat>preserved.beat,config.name+": resume advances");
    await page.locator("#restart").click();
    const reset=await page.evaluate(()=>window.__HEART_V4_QA__.getState());
    check(!reset.playing&&Math.abs(reset.beat+reset.meter)<.001,config.name+": restart resets count-in");
    check(errors.length===0,config.name+": no JS or console errors: "+errors.join(" / "));
    await context.close();
  }
} catch(e) {
  report.errors.push(e?.stack||String(e));
  process.exitCode=1;
} finally {
  await browser.close();
  fs.writeFileSync(OUT+"/report.json",JSON.stringify(report,null,2));
  console.log(JSON.stringify({checks:report.checks.length,screenshots:report.screenshots.length,errors:report.errors,url:report.url},null,2));
}

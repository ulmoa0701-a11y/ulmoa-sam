import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { chromium } from "playwright-core";

// Test the deployed GitHub Pages address, not a local checkout.
const BASE="https://ulmoa0701-a11y.github.io/ulmoa-sam/boomwhacker/heart-playalong-v4/";
const OUT="boomwhacker/heart-playalong-v4/live-qa-artifacts";
const expectedHtml=fs.readFileSync("boomwhacker/heart-playalong-v4/index.html","utf8");
const expectedHash=createHash("sha256").update(expectedHtml).digest("hex");
fs.mkdirSync(OUT,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||"/usr/bin/google-chrome",args:["--no-sandbox","--autoplay-policy=no-user-gesture-required"]});
const report={url:BASE,expectedHash,checks:[],screenshots:[],errors:[],warnings:[]};
const check=(ok,msg)=>{if(!ok)throw Error(msg);report.checks.push(msg)};
try {
  const probe=await browser.newPage();
  let deployed=false,lastError="",lastHash="";
  for(let attempt=0;attempt<60;attempt++){
    try {
      const response=await probe.goto(BASE+"?v4_live="+Date.now(),{waitUntil:"domcontentloaded",timeout:20000});
      // Compare exact checked-out HTML bytes against real Pages response.
      // This avoids accepting yesterday's deployed page while today's build is pending.
      if(response?.ok()){
        lastHash=createHash("sha256").update(await response.text()).digest("hex");
        deployed=lastHash===expectedHash&&
          await probe.evaluate(()=>typeof window.__HEART_V4_QA__?.getState==="function");
      }
      if(deployed)break;
    }catch(e){lastError=String(e)}
    await new Promise(resolve=>setTimeout(resolve,5000));
  }
  check(deployed,"public V4 source matches current main commit (expected "+expectedHash+", seen "+lastHash+"); "+lastError);
  await probe.close();
  for(const config of [{name:"pc-1440",width:1440,height:900},{name:"mobile-390",width:390,height:844}]){
    const context=await browser.newContext({viewport:{width:config.width,height:config.height},deviceScaleFactor:1});
    const page=await context.newPage();
    const errors=[];
    page.on("pageerror",e=>errors.push("JS "+e.message));
    page.on("console",m=>{
      if(m.type()!=="error")return;
      const source=m.location()?.url||"unknown";
      if(/\/favicon\.ico(?:$|\?)/.test(source)&&/404/.test(m.text())){
        report.warnings.push("optional site-wide favicon: "+source);return;
      }
      errors.push("CONSOLE "+m.text()+" @ "+source);
    });
    page.on("response",r=>{
      if(r.status()<400)return;
      if(/\/favicon\.ico(?:$|\?)/.test(r.url())){
        report.warnings.push("optional site-wide favicon HTTP "+r.status()+": "+r.url());return;
      }
      errors.push("HTTP "+r.status()+" "+r.url());
    });
    const response=await page.goto(BASE+"?view="+config.name+"&cache="+Date.now(),{waitUntil:"networkidle",timeout:25000});
    check(!!response?.ok(),config.name+": public HTTP success");
    const liveHash=createHash("sha256").update(await response.text()).digest("hex");
    check(liveHash===expectedHash,config.name+": served the same HTML as current main checkout");
    check(await page.locator(".transport #play").isVisible(),config.name+": playback control available");
    const typography=await page.evaluate(async()=>{
      await Promise.all([
        document.fonts.load('28px "Gamja Flower"',"첫 번째 길"),
        document.fonts.load('32px "Jua"',"도미솔")
      ]);
      const q=window.__HEART_V4_QA__,state=q.fontState(),canvas=document.querySelector("#score");
      const ctx=canvas.getContext("2d"),original=ctx.fillText,calls=[];
      try {
        ctx.fillText=function(label,x,y,...args){
          if(["첫 번째 길","도","미","솔"].includes(label))calls.push({label,font:this.font});
          return original.call(this,label,x,y,...args);
        };
        q.render(.75);
      }finally{ctx.fillText=original}
      return {...state,calls,titleFontSize:getComputedStyle(document.querySelector(".heading h1")).fontSize};
    });
    check(typography.loaded.story&&typography.loaded.score&&typography.title.includes("Gamja Flower"),
      config.name+": actually loaded Gamja Flower and Jua fonts");
    check(typography.calls.some(x=>x.label==="첫 번째 길"&&x.font.includes("Gamja Flower"))&&
      typography.calls.some(x=>x.label==="도"&&x.font.includes("Jua")),
      config.name+": public canvas renders heart notes with Jua and story labels with Gamja Flower");
    const geometry=await page.evaluate(()=>{
      const q=window.__HEART_V4_QA__,stage=document.querySelector("#stage").getBoundingClientRect();
      return {nativeW:document.querySelector("#score").width,stageW:stage.width,
        viewport:innerWidth,scrollW:document.documentElement.scrollWidth,
        musicMeter:window.__PERFORMANCE_SCORES__.map(s=>s.meter),
        assets:q.assets(),mode:q.getState().motion};
    });
    check(geometry.nativeW>=(config.width===390?820:1440)*1.5,config.name+": high-density score canvas missing");
    check(geometry.scrollW<=geometry.viewport+1,config.name+": no horizontal overflow");
    check([2,3,4].every(m=>geometry.musicMeter.includes(m)),config.name+": original 2/4 3/4 4/4 arrangements");
    check(Object.values(geometry.assets).every(Boolean),config.name+": public backdrop/heart/Moa/night-forest/mobile assets");
    const scene=await page.evaluate(()=>window.__HEART_V4_QA__.sceneInfo());
    check(scene.loaded&&scene.scene===(config.width===390?"forest-enchanted-mobile":"forest-enchanted"),
      config.name+": public scene does not use the approved separate composition");
    const motion=await page.evaluate(()=>{
      const q=window.__HEART_V4_QA__,a=q.sceneMotionState(0),b=q.sceneMotionState(2500);
      q.render(-2,0);const first=document.querySelector("#score").toDataURL();
      q.render(-2,2500);const second=document.querySelector("#score").toDataURL();
      return {a,b,visiblyMoves:first!==second,frames:q.getState().ambientFrames};
    });
    check(motion.a.active&&motion.visiblyMoves&&Math.abs(motion.a.leftX-motion.b.leftX)>1,
      config.name+": public scenery movement missing");
    await page.waitForTimeout(340);
    check((await page.evaluate(()=>window.__HEART_V4_QA__.getState())).ambientFrames>motion.frames,
      config.name+": publicly deployed still image rather than a living scene");
    check(geometry.mode==="firefly",config.name+": single-firefly default");
    const grass=await page.evaluate(()=>{
      const q=window.__HEART_V4_QA__,state=q.getState();
      const tuft=q.grassPose(17,0),moved=q.grassPose(17,2650);
      return {count:state.grassTufts,
        rooted:tuft.x===moved.x&&tuft.y===moved.y,
        different:Math.abs(tuft.swing-moved.swing),
        withinLimit:Math.abs(tuft.swing)<=5&&Math.abs(moved.swing)<=5};
    });
    check(grass.count===(config.width===390?202:342)&&grass.rooted&&grass.different>.3&&grass.withinLimit,
      config.name+": original grass positions are not gently swaying in public build");
    await page.locator("#drawer summary").click();
    for(const theme of ["forest","night","classroom"]){
      await page.locator('[data-theme="'+theme+'"]').click();
      const signatures=[];
      for(const guide of ["sparkle","firefly","heart","moa"]){
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
      check(new Set(signatures).size===4,config.name+": "+theme+" all four guide modes must produce distinct canvas pixels");
    }
    const cueTiming=await page.evaluate(()=>{
      const q=window.__HEART_V4_QA__;
      return [.25,.5,.75].map(t=>q.guideState(t));
    });
    check(cueTiming[0].left===1&&cueTiming[0].right===0&&
      cueTiming[1].glow===0&&
      cueTiming[2].left===0&&cueTiming[2].right===1,
      config.name+": public guide lit both crests together or wrong half-beat timing");
    await page.locator("#song").selectOption("0");
    await page.locator('[data-guide="sparkle"]').click();
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

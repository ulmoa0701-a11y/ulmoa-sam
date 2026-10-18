const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const {chromium}=require("playwright-core");
(async()=>{
 const dir=path.join(__dirname,"qa-artifacts");fs.mkdirSync(dir,{recursive:true});
 const base=process.env.BASE_URL||"http://127.0.0.1:8765/boomwhacker/easy-performance/";
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||"/usr/bin/google-chrome",args:["--no-sandbox","--autoplay-policy=no-user-gesture-required"],downloadsPath:dir});
 const tests=[],errors=[],failures=[];
 try{
 for(const [name,width,height] of [["desktop",1366,900],["mobile",390,844]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<600,isMobile:width<600,acceptDownloads:true});
  page.on("pageerror",e=>errors.push(name+" pageerror "+e.message));page.on("console",m=>{if(m.type()==="error")errors.push(name+" console "+m.text())});
  await page.goto(base,{waitUntil:"domcontentloaded"});await page.waitForFunction(()=>Boolean(window.__performanceViewsQA__),{timeout:15000});
  const q=await page.evaluate(()=>window.__performanceViewsQA__);
  assert.equal(q.modes.length,5);
  assert.equal(q.scores.length,8);
  assert(q.scores.every(s=>s.measures>=6&&s.events>0),"all original exercises intact");
  assert(q.scores.find(s=>s.key==="moa-signal").meter===2);
  assert(q.scores.find(s=>s.key==="moa-breeze").meter===3);
  assert(q.scores.find(s=>s.key==="moa-space").meter===4);
  assert.equal(await page.locator("#keys button").count(),8);
  tests.push(name+": 8 exact original song selections, 2/4 3/4 4/4, 5 modes");
  const initial=await page.evaluate(()=>window.__performanceViewsQA__.state().score);
  assert.equal(await page.locator(".view-choice").count(),5);
  const images=[];
  for(const v of q.modes){
   await page.locator('.view-choice[data-view="'+v+'"]').click();
   await page.evaluate(()=>window.__performanceViewsQA__.at(3.25));
   assert.equal(await page.evaluate(()=>window.__performanceViewsQA__.state().view),v);
   assert.deepEqual(await page.evaluate(()=>window.__performanceViewsQA__.state().score),initial,"view switches cannot modify the audio or score");
   assert.equal(await page.locator(".view-choice.active").count(),1);
   const img=await page.locator("#display").screenshot();
   assert(img.length>3000);
   images.push(crypto.createHash("sha256").update(img).digest("hex"));
   await page.screenshot({path:path.join(dir,name+"-"+v+".png"),fullPage:true});
  }
  assert.equal(new Set(images).size,5,"five genuinely visually distinct playing scenes");
  tests.push(name+": five child-first performance views, same original notes and rhythms");
  await page.locator("#notes").selectOption("3");
  assert.equal(await page.locator("#keys button.off").count(),5);
  assert.deepEqual(await page.evaluate(()=>window.__performanceViewsQA__.state().score),initial);
  assert.deepEqual(await page.evaluate(()=>window.__performanceViewsQA__.state().mask),["도","미","솔"]);
  await page.locator("#notes").selectOption("8");
  assert.equal(await page.locator("#keys button.off").count(),0);
  assert.deepEqual(await page.evaluate(()=>window.__performanceViewsQA__.state().score),initial);
  tests.push(name+": 3/5/8 pitch masks never modify melody or rhythm");
  await page.locator("#notes").selectOption("5");
  assert.equal(await page.locator("#keys button.off").count(),3);
  assert.deepEqual(await page.evaluate(()=>window.__performanceViewsQA__.state().score),initial);
  for(const k of ["moa-signal","moa-breeze","beat-basic","beat-half","sixteenth","dotted"]){
   await page.locator("#song").selectOption(k);
   const s=await page.evaluate(()=>window.__performanceViewsQA__.state());assert.equal(s.song,k);assert(s.score.length>=6);
   await page.evaluate(()=>window.__performanceViewsQA__.at(2));
   const img=await page.locator("#display").screenshot();assert(img.length>2500);
  }
  tests.push(name+": original studio song changes and rhythm durations render correctly");
  await page.locator("#song").selectOption("moa-party");
  await page.locator("#tempo").selectOption("1.15");
  await page.locator("#section").selectOption("4");
  const beforeStart=await page.evaluate(()=>window.__performanceViewsQA__.state());
  assert.equal(beforeStart.section,"4");
  await page.locator("#overlayPlay").click();
  await page.waitForTimeout(410);
  const a=await page.evaluate(()=>window.__performanceViewsQA__.state());assert(a.playing&&a.clockAudio);
  await page.locator('.view-choice[data-view="clock"]').click();
  await page.waitForTimeout(350);
  const b=await page.evaluate(()=>window.__performanceViewsQA__.state());
  assert(b.playing&&b.clockAudio);assert(b.position>a.position,"view switch should not restart audible music");
  await page.locator("#play").click();
  assert.equal(await page.evaluate(()=>window.__performanceViewsQA__.state().playing),false);
  await page.locator("#play").click();
  await page.waitForTimeout(270);
  assert.equal(await page.evaluate(()=>window.__performanceViewsQA__.state().playing),true);
  await page.locator("#reset").click();
  await page.locator("#keys button").first().dispatchEvent("pointerdown");
  assert.equal(await page.evaluate(()=>window.__performanceViewsQA__.state().playing),false);
  tests.push(name+": audio-clock play, view switching without replay, pause, resume, reset");
  const viewport=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth,stage:document.querySelector("#stage").getBoundingClientRect()}));
  assert(viewport.scroll<=viewport.w+3,"horizontal overflow at "+width+"px "+JSON.stringify(viewport));
  assert(viewport.stage.y<345,"stage should not be pushed below blank header "+viewport.stage.y);
  tests.push(name+": responsive stage remains visible without oversized top whitespace or overflow");
  if(name==="desktop"){
   await page.locator("#song").selectOption("moa-signal");
   await page.locator("#section").selectOption("0");
   await page.locator('.view-choice[data-view="ribbon"]').click();
   const [download]=await Promise.all([page.waitForEvent("download",{timeout:65000}),page.locator("#record").click()]);
   const video=await download.path();
   assert(video&&fs.statSync(video).size>15000,"real MediaRecorder video must not be empty");
   assert(/\.(webm|mp4)$/i.test(download.suggestedFilename()));
   tests.push(name+": real 2/4 instrumental intro + full melody video recording exported");
  }
  await page.close();
 }
 assert.deepEqual(errors,[],"no JS errors");
 fs.writeFileSync(path.join(dir,"report.json"),JSON.stringify({status:"PASS",tests,errors,failures},null,2));
 console.log(JSON.stringify({status:"PASS",tests,errors}));
 }catch(err){failures.push(err.stack||String(err));fs.writeFileSync(path.join(dir,"report.json"),JSON.stringify({status:"FAIL",tests,errors,failures},null,2));console.error("PERFORMANCE-VIEWS FAIL\n"+failures[0]);process.exitCode=1}
 finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const {chromium}=require("playwright-core");
(async()=>{
 const dir=path.join(__dirname,"qa-artifacts");fs.mkdirSync(dir,{recursive:true});
 const base=process.env.BASE_URL||"http://127.0.0.1:8765/boomwhacker/heart-performance/";
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
  const heart=await page.evaluate(()=>{
    const q=window.__performanceViewsQA__;
    const original=q.state();
    q.selectSong("sixteenth");
    const fast=q.beatParts(16).filter(x=>x.onset);
    q.selectSong("dotted");
    const dotted=q.beatParts(0).filter(x=>x.onset);
    const heartPath=q.heartPath;
    q.selectSong(original.song);
    return {fast:fast.map(x=>Number((x.to-x.from).toFixed(2))),dotted:dotted.map(x=>Number((x.to-x.from).toFixed(2))),heartPath};
  });
  assert(heart.heartPath.includes("M50 84 C44 77 9 55 6 29"),"must use actual heart-score V contour");
  assert(heart.fast.some(n=>n===.25),"sixteenth rhythm must preserve a quarter-beat note inside a full-heart beat");
  assert(heart.dotted.includes(.75)&&heart.dotted.includes(.25),"dotted eighth + sixteenth must show 75% and 25% heart segments");
  tests.push(name+": canonical V-heart path, 16th and dotted 3:1 beat subdivisions");

  assert.equal(await page.evaluate(()=>window.__performanceViewsQA__.state().view),"two","the fixed two-line path is the default view");
  assert.equal(await page.locator(".view-choice.active").getAttribute("data-view"),"two");
  const staticTwoPage=await page.evaluate(()=>{
    const q=window.__performanceViewsQA__,original=q.state();
    q.selectSong("moa-space");q.at(.12);
    const first=q.twoPageAt(.12),key=q.twoBaseKey(first);
    const unchanged=q.twoBackground().toDataURL();
    q.at(first.pageBars*4-.025);
    const beforeChange=q.twoBackground().toDataURL();
    const lastInfo=q.twoPageAt(first.pageBars*4-.025);
    q.at(first.pageBars*4+.025);
    const nextInfo=q.twoPageAt(first.pageBars*4+.025);
    const newPage=q.twoBackground().toDataURL();
    q.selectSong("sixteenth");q.at(16.03);
    const hopStart=q.twoMoaPosition(16.03,q.twoPageAt(16.03));
    const hopEnd=q.twoMoaPosition(16.19,q.twoPageAt(16.19));
    q.selectSong(original.song);
    return {first,lastInfo,nextInfo,key,unchanged,beforeChange,newPage,
      hopStart:hopStart&&{x:hopStart.x,y:hopStart.y,row:hopStart.row},
      hopEnd:hopEnd&&{x:hopEnd.x,y:hopEnd.y,row:hopEnd.row},
      movement:q.moaTravel()};
  });
  assert.equal(staticTwoPage.first.barsPerLine,name==="mobile"?1:2,"responsive measures per line");
  assert.equal(staticTwoPage.first.pageBars,name==="mobile"?2:4,"both rows fit per page");
  assert.equal(staticTwoPage.first.page,staticTwoPage.lastInfo.page,"the score must NOT page-flip before both lines are finished");
  assert.equal(staticTwoPage.nextInfo.page,staticTwoPage.first.page+1,"page swaps only after TWO FULL LINES");
  assert.equal(staticTwoPage.unchanged,staticTwoPage.beforeChange,"score pixels must be bit-identical for every beat in the two fixed lines");
  assert.notEqual(staticTwoPage.unchanged,staticTwoPage.newPage,"the next two-line page must actually replace the completed page");
  assert(staticTwoPage.hopStart&&staticTwoPage.hopEnd,"Moa sprite needs concrete event anchors");
  assert(Math.abs(staticTwoPage.hopStart.x-staticTwoPage.hopEnd.x)>2,"Moa moves across the unmoving 16th-score beat");
  await page.locator(".more-controls summary").click();
  await page.locator("#moaMove").selectOption("walk");
  assert.equal(await page.evaluate(()=>window.__performanceViewsQA__.moaTravel()),"walk");
  await page.locator("#moaMove").selectOption("hop");
  assert.equal(await page.evaluate(()=>window.__performanceViewsQA__.moaTravel()),"hop");
  const prelude=await page.evaluate(()=>{const q=window.__performanceViewsQA__,original=q.state().song;q.selectSong("moa-breeze");q.at(-3);const first=q.twoPageAt(-3);q.selectSong(original);return first});
  assert.equal(prelude.page,0,"prelude shows first pair of fixed score lines");
  tests.push(name+": score visually frozen for both rows, whole-page swap exactly at end, sprite-only motion, hop/walk toggle");
  await page.locator(".view-choice[data-view=two]").click();
  await page.evaluate(()=>window.__performanceViewsQA__.at(2.15));
  await page.screenshot({path:path.join(dir,name+"-static-two-line-current.png"),fullPage:true});
  await page.evaluate(()=>{const q=window.__performanceViewsQA__;q.at(q.twoPageAt(0).pageBars*3+.05)});
  await page.screenshot({path:path.join(dir,name+"-static-two-line-next-page.png"),fullPage:true});


  const cues=await page.evaluate(()=>{
    const q=window.__performanceViewsQA__,original=q.state();
    q.selectSong("sixteenth");
    q.at(16.01);const a=q.cueAt(16.01),owned=q.assignedEvents();
    q.at(16.26);const b=q.cueAt(16.26);
    q.selectSong("dotted");q.at(.05);const dot=q.cueAt(.05);
    q.selectSong("moa-signal");q.at(.05);const full=q.cueAt(.05);
    q.selectSong(original.song);
    return {a:{now:a.now?.note,next:a.next?.start,beats:a.beats},b:{now:b.now?.note,next:b.next?.start},dot:{now:dot.now?.note,next:dot.next?.start},full:{next:full.next?.start},owned:owned.length};
  });
  assert(cues.owned>5,"actual assigned notes must exist");
  assert(cues.a.now,"the exact 16th note at current onset must be highlighted");
  assert(cues.a.next>16,"the next attack inside same heart must be forecast");
  assert(cues.b.now,"next quarter-beat attack must become current");
  assert(cues.dot.now,"dotted 0.75 note must be highlighted at onset");
  assert.equal(await page.locator("#cueNow").count(),1);
  assert.equal(await page.locator("#cueNext").count(),1);
  await page.locator("#notes").selectOption("3");
  const maskCues=await page.evaluate(()=>{
     const q=window.__performanceViewsQA__;q.selectSong("moa-signal");q.at(.05);
     const next=q.cueAt(.05).next,mask=q.state().mask;return {next:next?.note,mask};
  });
  assert(!maskCues.next||maskCues.mask.includes(maskCues.next),"next guide must skip unassigned pitches");
  await page.locator("#notes").selectOption("5");
  const mascot=await page.evaluate(async()=>{
    const urls=["../../thinking-garden/assets/moa-default.png","../../thinking-garden/assets/moa-cheer.png"];
    const imgs=await Promise.all(urls.map(async u=>{const i=new Image();i.src=u;try{await i.decode();return i.naturalWidth>10}catch(e){return false}}));
    return imgs;
  });
  assert(mascot.every(Boolean),"the actual existing Moa character artworks must load");
  tests.push(name+": current onset, 16th-note next cue, masked role forecast, and real Moa assets");


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
  await page.locator("#play").click();
  await page.waitForTimeout(410);
  const a=await page.evaluate(()=>window.__performanceViewsQA__.state());assert(a.playing&&a.clockAudio);
  await page.locator('.view-choice[data-view="bar"]').click();
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
  assert(viewport.stage.y<410,"stage should remain near the top after adding the predictive cue strip "+viewport.stage.y);
  tests.push(name+": responsive stage remains visible without oversized top whitespace or overflow");
  if(name==="desktop"){
   await page.locator("#song").selectOption("moa-signal");
   await page.locator("#section").selectOption("0");
   await page.locator('.view-choice[data-view="score"]').click();
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
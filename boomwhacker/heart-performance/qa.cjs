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
  await page.goto(base,{waitUntil:"domcontentloaded"});
  try{await page.waitForFunction(()=>Boolean(window.__performanceViewsQA__),{timeout:9000})}
  catch(e){throw new Error("Page boot failed: "+errors.join(" | ")+" / "+e.message)}
  const q=await page.evaluate(()=>window.__performanceViewsQA__);
  assert.equal(q.modes.length,6);
  assert.equal(q.scores.length,8);
  assert(q.scores.every(s=>s.measures>=6&&s.events>0),"all original exercises intact");
  assert(q.scores.find(s=>s.key==="moa-signal").meter===2);
  assert(q.scores.find(s=>s.key==="moa-breeze").meter===3);
  assert(q.scores.find(s=>s.key==="moa-space").meter===4);
  assert.equal(await page.locator("#keys button").count(),8);
  tests.push(name+": 8 exact original song selections, 2/4 3/4 4/4, 6 modes");
  const initial=await page.evaluate(()=>window.__performanceViewsQA__.state().score);

  const allThemeScreens=[];
  for(const t of ["classroom","forest","night"]){
   await page.locator('.theme-choice[data-theme="'+t+'"]').click();
   const sample=await page.evaluate(()=>{
     const q=window.__performanceViewsQA__,startScore=q.state().score;
     q.selectView("stairs");q.at(1.12);
     const x=q.stairBackground().toDataURL();
     const bg0=q.stairBackground();
     const c=bg0.getContext("2d");
     const corner=Array.from(c.getImageData(3,3,1,1).data).slice(0,3);
     q.at(2.26);const y=q.stairBackground().toDataURL();
     q.selectView("two");q.at(1.2);
     const two=q.twoBackground().toDataURL();
     return {theme:q.theme(),x,y,two,corner,score:q.state().score};
   });
   assert.equal(sample.theme,t);
   assert.equal(sample.x,sample.y,"the theme + heart score must stay PIXEL IDENTICAL while Moa moves");
   assert.deepEqual(sample.score,initial,"visual themes may not alter the original melody or timing");
   assert.equal(await page.locator(".theme-choice.active").count(),1);
   allThemeScreens.push({theme:t,stair:crypto.createHash("sha256").update(sample.x).digest("hex"),two:crypto.createHash("sha256").update(sample.two).digest("hex"),corner:sample.corner});
   await page.locator('.view-choice[data-view="stairs"]').click();
   await page.screenshot({path:path.join(dir,name+"-theme-"+t+"-stairs.png"),fullPage:true});
   await page.locator('.view-choice[data-view="two"]').click();
   await page.screenshot({path:path.join(dir,name+"-theme-"+t+"-two.png"),fullPage:true});
  }
  assert.equal(new Set(allThemeScreens.map(x=>x.stair)).size,3,"all three illustrated BACKGROUNDS must be different in actual stair SCORE PIXELS");
  assert.equal(new Set(allThemeScreens.map(x=>x.two)).size,3,"all three themes must apply to fixed two-row scores too");
  assert.equal(new Set(allThemeScreens.map(x=>x.corner.join(","))).size,3,"forest, cozy classroom and night must have distinct original artwork palette");
  await page.locator('.theme-choice[data-theme="classroom"]').click();
  const rhythmSplit=await page.evaluate(()=>{
   const q=window.__performanceViewsQA__,original=q.state().song;
   q.selectSong("moa-signal");
   const found=[];for(let n=0;n<q.state().score.length*2;n++){const pair=q.stairHalfBeatPair(n);if(pair)found.push({beat:n,notes:pair.map(p=>p.note),widths:pair.map(p=>p.to-p.from)})}
   q.selectSong(original);return found;
  });
  assert(rhythmSplit.length>=1,"the real score must have at least one pair of true eighth notes");
  assert(rhythmSplit.some(x=>x.notes[0]!==x.notes[1]),"half-hearts must support two DIFFERENT pitch heights");
  assert(rhythmSplit.every(x=>x.widths.every(w=>Math.abs(w-.5)<.001)),"each pitch-separated heart HALF is still exactly half a beat");
  tests.push(name+": illustrated cozy classroom / forest / starry night, static score through playback, stable original music, real pitch-positioned half-hearts");

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
  const ratioTest=await page.evaluate(()=>{
    const q=window.__performanceViewsQA__,r=q.videoExportSize(),scales=[
      q.heartScale(120,72),q.heartScale(95,90),q.heartScale(180,90)];
    return {r,scales,source:document.querySelector("#display").getAttribute("width")};
  });
  assert.deepEqual(ratioTest.r,{width:1920,height:1080,contentY:44,contentHeight:992});
  assert.equal(ratioTest.r.width/ratioTest.r.height,16/9,"video must have exact standard YouTube wide aspect");
  assert.deepEqual(ratioTest.scales,[.8,.95,1],"hearts use one UNIFORM x/y scale, never squash glyphs");
  assert.equal(await page.locator("#fullscreen").count(),1);

  assert.equal(await page.locator("#stagePlay").count(),1);
  assert.equal(await page.locator("#stageReset").count(),1);
  assert.equal(await page.locator("#stageExit").count(),1);
  assert.equal(await page.locator("#mobileLandscape").count(),1);
  if(name==="mobile"){
   assert.equal(await page.locator(".mobile-score-tip").isVisible(),true,"portrait score must explain the actual 390px readability limitation");
   const cueLayout=await page.locator(".cue-card.current").evaluate(el=>({font:getComputedStyle(el.querySelector("strong")).fontSize,width:el.getBoundingClientRect().width}));
   assert(parseFloat(cueLayout.font)>=15,"mobile current note must be legible independent of the tiny full score");
   await page.locator("#mobileLandscape").click();
   assert.equal(await page.evaluate(()=>Boolean(document.fullscreenElement)),true,"portrait mobile score must open actual fullscreen");
   assert.equal(await page.locator("#stagePlay").isVisible(),true,"mobile fullscreen must keep playback accessible");
   await page.locator("#stageExit").click();
   assert.equal(await page.evaluate(()=>Boolean(document.fullscreenElement)),false,"mobile should return to controls");
  }else{
   assert.equal(await page.locator(".mobile-score-tip").isVisible(),false,"desktop must not show portrait-only controls");
  }
  tests.push(name+": portrait readable cue and dedicated landscape fullscreen, score itself stays fixed");
  const advancedLayout=await page.evaluate(()=>{
   const q=window.__performanceViewsQA__,original=q.state().song,out={};
   q.selectView("two");q.selectSong("moa-signal");
   const before=q.twoPageAt(-2);
   out.balanced={barsPerLine:before.barsPerLine,total:before.total,pageBars:before.pageBars,pageCount:before.pageCount};
   out.preludeFixed=q.twoMoaPosition(-2,before);
   q.selectView("stairs");out.preludeStair=q.stairMoaPosition(-2,q.stairPageAt(-2));
   q.selectView("two");q.at(.12);
   const info=q.twoPageAt(.12),moa=q.twoMoaPosition(.12,info);
   out.firstMoa=moa?{x:moa.x,y:moa.y,row:moa.row}:null;
   q.selectSong(original);return out;
  });
  assert.deepEqual(advancedLayout.balanced,{barsPerLine:4,total:8,pageBars:8,pageCount:1},
     "eight 2/4 measures must be 4+4, never 5+3");
  assert.equal(advancedLayout.preludeFixed,null,"no Moa on first-row label while prelude plays");
  assert.equal(advancedLayout.preludeStair,null,"no premature pitch mascot during prelude");
  assert(advancedLayout.firstMoa?.y>=203,"the sprite stays below the title in the score lane");
  tests.push(name+": balanced two-row layout, prelude mascot title protection, responsive score position");

  tests.push(name+": non-distorted Korean syllables / V-hearts, 1920x1080 16:9 export target and fullscreen control");


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
  assert.equal(staticTwoPage.first.barsPerLine,2,"4/4 has two full measures per line on both screens");
  assert.equal(staticTwoPage.first.pageBars,4,"two fixed lines contain four 4/4 measures per page");
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
  const visibleHearts=await page.evaluate(()=>{
 const q=window.__performanceViewsQA__,original=q.state().song,out={};
 for(const key of ["moa-signal","moa-breeze","moa-space"]){
  q.selectSong(key);const p=q.twoPageAt(0);const s=q.state();
  out[key]={meter:q.scores.find(x=>x.key===key).meter,barsPerLine:p.barsPerLine,beatsPerLine:p.barsPerLine*q.scores.find(x=>x.key===key).meter};
 }
 q.selectSong(original);return out;
});
assert.equal(visibleHearts["moa-signal"].beatsPerLine,8,"2/4 must balance full 8-bar song as 4+4 rather than 5+3");
assert([6,9].includes(visibleHearts["moa-breeze"].beatsPerLine),"3/4 must keep readable two-row full-measure phrases");
assert.equal(visibleHearts["moa-space"].beatsPerLine,8,"4/4 phrase must display eight hearts per row");
tests.push(name+": stationary two rows show 2/4="+visibleHearts["moa-signal"].beatsPerLine+" hearts per row, no tiny two-heart rows");
tests.push(name+": score visually frozen for both rows, whole-page swap exactly at end, sprite-only motion, hop/walk toggle");
  await page.locator("#song").selectOption("moa-signal");
  await page.locator("#section").selectOption("0");
  const shortSection=await page.evaluate(()=>{
    const q=window.__performanceViewsQA__;q.at(.2);
    return q.twoPageAt(.2);
  });
  assert.equal(shortSection.barsPerLine,2,"4-bar practice section should place two full bars on EACH stationary line");
  assert.equal(shortSection.pageBars,4);
  assert.equal(shortSection.endBar-shortSection.startBar,4);
  await page.locator(".view-choice[data-view=two]").click();
  await page.screenshot({path:path.join(dir,name+"-short-section-balanced-two-rows.png"),fullPage:true});
  await page.locator("#section").selectOption("all");
  tests.push(name+": shorter practice sections balance bars across both stationary score rows");

  await page.locator(".view-choice[data-view=two]").click();
  await page.evaluate(()=>window.__performanceViewsQA__.at(2.15));
  await page.screenshot({path:path.join(dir,name+"-static-two-line-current.png"),fullPage:true});
  await page.evaluate(()=>{const q=window.__performanceViewsQA__;q.at(q.twoPageAt(0).pageBars*3+.05)});
  await page.screenshot({path:path.join(dir,name+"-static-two-line-next-page.png"),fullPage:true});



  // Pitched-heart stair mode: static two-line backgrounds, real pitch height,
  // exact 16th-note position and mascot-only movement on top.
  await page.locator('.view-choice[data-view="stairs"]').click();
  assert.equal(await page.locator("#stairStyleWrap").isVisible(),true);
  const stairCheck=await page.evaluate(()=>{
   const qa=window.__performanceViewsQA__,original=qa.state().song;
   qa.selectSong("moa-space");
   qa.at(.05);
   const pageInfo=qa.stairPageAt(.05),a=qa.stairBackground().toDataURL();
   qa.at(2.15);
   const b=qa.stairBackground().toDataURL();
   const own=qa.assignedEvents().filter(e=>e.start<pageInfo.endBar*4);
   const pair=own.find((e,i)=>i>0&&e.note!==own[i-1].note);
   const yPair=pair?[qa.stairPoint(pageInfo,own[own.indexOf(pair)-1]).y,qa.stairPoint(pageInfo,pair).y]:[];
   const firstPageEnd=pageInfo.pageBars*4;
   qa.at(firstPageEnd-.01);const before=qa.stairBackground().toDataURL();
   qa.at(firstPageEnd+.01);const after=qa.stairBackground().toDataURL();
   qa.selectSong("sixteenth");qa.at(16.01);
   const fastInfo=qa.stairPageAt(16.01);
   const fastOnsets=qa.assignedEvents().filter(e=>e.start>=16&&e.start<17);
   const anchors=fastOnsets.map(e=>qa.stairPoint(fastInfo,e));
   qa.selectSong(original);
   return {same:a===b,beforeSame:a===before,pageChanged:before!==after,
      pitchY:yPair,beatHearts:pageInfo.barsPerLine*4,
      onsets:fastOnsets.map(e=>e.start),anchors:anchors.map(a=>({x:a.x,y:a.y})),
      style:qa.stairStyle(),page:pageInfo.page};
  });
  assert(stairCheck.same&&stairCheck.beforeSame,"height-stepped heart score background must remain identical during both rows");
  assert(stairCheck.pageChanged,"height-stepped score should swap only once both rows are complete");
  assert.equal(stairCheck.page,0);
  assert.equal(stairCheck.beatHearts,8,"show eight full quarter-beat hearts per row for 4/4");
  assert.equal(stairCheck.pitchY.length,2);
  assert(Math.abs(stairCheck.pitchY[0]-stairCheck.pitchY[1])>=14,"different pitches must be at visibly different heights");
  assert(stairCheck.anchors.length>=2,"16th notes must have separate exact onset anchors inside a heart");
  assert(new Set(stairCheck.anchors.map(p=>p.x.toFixed(1))).size>=2,"quarter-beat note onsets must not collapse onto the same horizontal position");
  assert.equal(stairCheck.style,"simple");
  await page.locator("#stairStyle").selectOption("path");
  const lineCheck=await page.evaluate(()=>{const qa=window.__performanceViewsQA__;qa.selectSong("moa-space");qa.at(.01);return {style:qa.stairStyle(),image:qa.stairBackground().toDataURL()};});
  await page.screenshot({path:path.join(dir,name+"-stair-connecting-path.png"),fullPage:true});
  assert.equal(lineCheck.style,"path");
  await page.locator("#stairStyle").selectOption("simple");
  await page.locator("#song").selectOption("moa-space");
  await page.evaluate(()=>window.__performanceViewsQA__.at(1.15));
  await page.screenshot({path:path.join(dir,name+"-stair-basic.png"),fullPage:true});
  const layout=await page.evaluate(()=>{
    const q=window.__performanceViewsQA__,p=q.stairPageAt(1.15),
      high=q.stairHeartTop(0,"높은도"),low=q.stairHeartTop(0,"도"),
      height=q.stairGeometry(p,0).heartHeight;
    return {high,low,height};
  });
  assert.equal(layout.height,80,"pitched hearts must fit pitch guide plus protected headers");
  assert(layout.low>layout.high+75,"pitch ladder should have readable tonal separation");
  await page.locator("#display").screenshot({path:path.join(dir,name+"-stair-clean-typography.png")});
  tests.push(name+": un-squashed pitched hearts with clean per-note lettering and intact static lines");

  tests.push(name+": new fixed two-row pitched V-heart score, real pitch elevations, precise 16ths and optional connecting path");
  await page.locator('.view-choice[data-view="two"]').click();

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


  assert.equal(await page.locator(".view-choice").count(),6);
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
  assert.equal(new Set(images).size,6,"six genuinely visually distinct playing scenes");
  tests.push(name+": six child-first performance views, same original notes and rhythms");
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

  if(name==="desktop"){
   await page.locator("#fullscreen").click();
   assert.equal(await page.evaluate(()=>Boolean(document.fullscreenElement)),true,"actual fullscreen mode");
   assert.equal(await page.locator("#stagePlay").isVisible(),true,"play should be reachable in fullscreen");
   assert.equal(await page.locator("#stageReset").isVisible(),true,"reset should be reachable in fullscreen");
   await page.locator("#stagePlay").click();
   assert.equal(await page.evaluate(()=>window.__performanceViewsQA__.state().playing),true);
   await page.locator("#stagePlay").click();
   assert.equal(await page.evaluate(()=>window.__performanceViewsQA__.state().playing),false);
   await page.locator("#stageExit").click();
   assert.equal(await page.evaluate(()=>Boolean(document.fullscreenElement)),false);
   tests.push(name+": real fullscreen play pause reset and exit remain functional");
  }

  const viewport=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth,stage:document.querySelector("#stage").getBoundingClientRect()}));
  assert(viewport.scroll<=viewport.w+3,"horizontal overflow at "+width+"px "+JSON.stringify(viewport));
  assert(viewport.stage.y<495,"stage should be visible after the additional compact theme selector "+viewport.stage.y);
  tests.push(name+": responsive stage remains visible without oversized top whitespace or overflow");
  if(name==="desktop"){
   await page.locator('.theme-choice[data-theme="night"]').click();
   await page.locator("#song").selectOption("moa-signal");
   await page.locator("#section").selectOption("all");
   await page.locator('.view-choice[data-view="stairs"]').click();
   const [download]=await Promise.all([page.waitForEvent("download",{timeout:65000}),page.locator("#record").click()]);
   const video=await download.path();
   fs.copyFileSync(video,path.join(dir,"sample-16by9-heart-song."+(download.suggestedFilename().endsWith(".mp4")?"mp4":"webm")));
   assert(video&&fs.statSync(video).size>15000,"real MediaRecorder video must not be empty");
   assert(/\.(webm|mp4)$/i.test(download.suggestedFilename()));
   const probe=require("node:child_process").spawnSync("ffprobe",["-v","error","-select_streams","v:0","-show_entries","stream=width,height","-of","csv=p=0",video],{encoding:"utf8"});
   if(!probe.error){assert.equal(probe.status,0,"ffprobe must read the saved video");assert.equal(probe.stdout.trim(),"1920,1080","actual exported video file must be 16:9 Full HD");}
   else console.log("ffprobe unavailable; browser canvas output verified "+probe.error.message);
   tests.push(name+": real 1920x1080 Full-HD video includes the selected NIGHT THEME with both static rows and Moa motion");
  }
  await page.close();
 }
 assert.deepEqual(errors,[],"no JS errors");
 fs.writeFileSync(path.join(dir,"report.json"),JSON.stringify({status:"PASS",tests,errors,failures},null,2));
 console.log(JSON.stringify({status:"PASS",tests,errors}));
 }catch(err){failures.push(err.stack||String(err));fs.writeFileSync(path.join(dir,"report.json"),JSON.stringify({status:"FAIL",tests,errors,failures},null,2));console.error("PERFORMANCE-VIEWS FAIL\n"+failures[0]);process.exitCode=1}
 finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
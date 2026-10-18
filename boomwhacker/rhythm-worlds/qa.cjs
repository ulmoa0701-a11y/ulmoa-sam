// Six Rhythm Worlds independent browser QA. Run from repository root.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {chromium}=require("playwright-core");
(async()=>{
 const base=process.env.BASE_URL||"http://127.0.0.1:8765/boomwhacker/rhythm-worlds/";
 const dir=path.join(__dirname,"qa-artifacts");fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||"/usr/bin/google-chrome",headless:true,args:["--no-sandbox","--autoplay-policy=no-user-gesture-required"]});
 const problems=[],tests=[];
 async function runViewport(w,h,short){
  const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:1,hasTouch:w<600,isMobile:w<600});
  const errors=[];page.on("pageerror",err=>errors.push(String(err)));page.on("console",m=>{if(m.type()==="error")errors.push("console: "+m.text())});
  await page.goto(base,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>Boolean(window.__rhythmWorldsQA),{timeout:15000});
  const q=await page.evaluate(()=>window.__rhythmWorldsQA.songs);
  assert.equal(q.length,10,"six originals plus four rhythm exercises");
  assert(q.every(s=>s.bars===8&&s.beats===32&&s.events>0),"all songs are eight valid four-beat bars");
  assert(q.every(s=>s.notes>=3),"all songs use multiple notes");
  assert.equal(await page.locator(".world-card").count(),6);
  assert.equal(await page.locator(".pad").count(),8);
  tests.push(short+": world selectors and 10 original songs");
  const worlds=["garden","train","bridge","orchestra","stars","bakery"];
  for(const key of worlds){
   await page.locator('.world-card[data-world="'+key+'"]').click();
   const state=await page.evaluate(()=>window.__rhythmWorldsQA.state());
   assert.equal(state.world,key);
   assert.equal(state.song,key+"-song");
   assert(state.sequence.length>0);
   assert.equal(await page.locator(".world-card.active").count(),1);
   const screen=await page.locator("#scene").screenshot();
   assert(screen.length>2000,"nonempty game frame");
   await page.screenshot({path:path.join(dir,short+"-"+key+".png")});
  }
  tests.push(short+": six distinct selectable theme scenes");
  const before=await page.evaluate(()=>window.__rhythmWorldsQA.state().sequence);
  await page.locator("#notesSelect").selectOption("3");
  let state=await page.evaluate(()=>window.__rhythmWorldsQA.state());
  assert.equal(state.notesMode,3);assert.equal(state.visible.length,3);
  assert.deepEqual(state.sequence,before,"pitch masks cannot alter melody");
  assert.equal(await page.locator(".pad:not(.inactive)").count(),3);
  await page.locator("#notesSelect").selectOption("8");
  state=await page.evaluate(()=>window.__rhythmWorldsQA.state());
  assert.equal(state.visible.length,8);assert.deepEqual(state.sequence,before);
  tests.push(short+": 3/8 notes preserve full song");
  await page.locator("#songSelect").selectOption("beat-half");
  assert.equal(await page.evaluate(()=>window.__rhythmWorldsQA.state().song),"beat-half");
  await page.locator("#sectionSelect").selectOption("4");
  assert.equal(await page.evaluate(()=>window.__rhythmWorldsQA.state().sequence.length)>0,true);
  await page.locator("#sectionSelect").selectOption("all");
  await page.locator("#speedSelect").selectOption("1.2");
  assert.equal(await page.evaluate(()=>window.__rhythmWorldsQA.state().speed),1.2);
  tests.push(short+": song, section and tempo selection");
  await page.locator("#startBig").click();
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>window.__rhythmWorldsQA.state().playing),true);
  await page.locator("#playBtn").click();
  assert.equal(await page.evaluate(()=>window.__rhythmWorldsQA.state().playing),false);
  await page.locator(".pad[data-note='도']").click();
  assert.equal(await page.evaluate(()=>window.__rhythmWorldsQA.state().tapCount),1);
  await page.locator("#resetBtn").click();
  assert.equal(await page.evaluate(()=>window.__rhythmWorldsQA.state().tapCount),0);
  tests.push(short+": play pause pad keyboard reset");
  const bounds=await page.evaluate(()=>({vw:innerWidth,document:document.documentElement.scrollWidth,scene:document.querySelector("#scene").getBoundingClientRect().width}));
  assert(bounds.document<=bounds.vw+3,"unexpected horizontal overflow "+JSON.stringify(bounds));
  assert(bounds.scene>250,"game scene should remain playable");
  assert.deepEqual(errors,[],"no browser JavaScript errors");
  tests.push(short+": responsive "+w+"px without overflow or JS errors");
  await page.close();
 }
 try{
  await runViewport(1366,900,"desktop");
  await runViewport(390,844,"mobile");
  fs.writeFileSync(path.join(dir,"report.json"),JSON.stringify({failures:problems,passed:tests},null,2));
  console.log(JSON.stringify({status:"PASS",passed:tests,worlds:6,songs:10},null,2))
 }catch(e){problems.push(String(e.stack||e));fs.writeFileSync(path.join(dir,"report.json"),JSON.stringify({failures:problems,passed:tests},null,2));console.error(JSON.stringify({status:"FAIL",failures:problems,passed:tests},null,2));process.exitCode=1}
 finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1})
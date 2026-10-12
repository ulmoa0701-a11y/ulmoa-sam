/* 알아봄: 실제 브라우저에서 생활 장면 이해 게임 두 종류를 끝까지 시험한다.
   외부 API·입력 정보 저장 없음. 정답·점수 없이 여러 관점 비교와 학습 출처 연결 점검. */
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
(async()=>{
 const browser=await chromium.launch({headless:true});
 const base=process.env.GLOSSARY_QA_URL||"http://127.0.0.1:8765/notes/";
 const profiles=[["mobile-small",360,780],["mobile",390,844],["tablet",768,1024],["desktop",1440,900]];
 const shots=path.resolve("glossary-qa-screenshots");fs.mkdirSync(shots,{recursive:true});
 try{
  for(const [name,width,height] of profiles){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   const errors=[];page.on("pageerror",e=>errors.push(String(e)));
   await page.goto(base,{waitUntil:"networkidle",timeout:90000});
   assert.equal(await page.locator("#gcatSituationPanel").isVisible(),true,"original learning first");
   await page.locator("#gcatGamesFromSituations").click();
   assert.equal(await page.locator("#gcatGamesPanel").isVisible(),true,"games open from real-life examples");
   assert.equal(new URL(page.url()).searchParams.get("view"),"games","games deep link");
   assert.equal(await page.locator("#gcatGamesRoot").getAttribute("data-game-stage"),"hub","entry remains intuitive");
   assert.deepEqual(await page.locator(".gcat-game-mode-card").evaluateAll(cs=>cs.map(c=>c.dataset.learningMode)),["observe","support"],"left observation / right support");
   assert.deepEqual(await page.evaluate(()=>window.HabomGlossaryGames.counts),{cases:12,activities:24},"12 cases each studied two ways");
   assert((await page.locator(".gcat-game-note").innerText()).includes("진단"),"not mistaken for a diagnosis");
   assert.equal(await page.locator(".gcat-game-score").count(),0,"no scores on landing");
   await page.screenshot({path:path.join(shots,name+"-scene-learning-hub.png")});
   for(const mode of ["observe","support"]){
    for(const level of ["start","more"]){
     await page.locator('[data-game-start="'+mode+'"][data-level="'+level+'"]').click();
     assert.equal(await page.locator("#gcatGamesRoot").getAttribute("data-game-stage"),"question","five situation round starts");
     const ids=new Set();
     for(let i=0;i<5;i++){
      ids.add(await page.locator(".gcat-game-question").getAttribute("data-game-question"));
      assert.equal(await page.locator(".gcat-game-choice").count(),3,"three realistic perspectives");
      assert.equal(await page.locator('[data-game-answer]').count(),0,"no programmed correct answer");
      assert.equal(await page.locator(".gcat-game-score").count(),0,"no grading during activity");
      if(i===0)await page.locator('[data-game-explore-all="true"]').click();
      else if(i===1)await page.locator(".gcat-game-choice").last().press("Enter");
      else await page.locator(".gcat-game-choice").first().click();
      assert.equal(await page.locator("#gcatGamesRoot").getAttribute("data-game-stage"),"reflect","choice reveals reflection");
      assert.equal(await page.locator(".gcat-game-perspective").count(),3,"all plausible lenses explained");
      assert((await page.locator(".gcat-game-takeaway").innerText()).length>50,"practical observation and communication included");
      assert.equal(await page.locator(".gcat-game-choice.selected").count(),i===0?0:1,"chosen perspective highlighted, not scored");
      assert.equal(await page.locator(".gcat-game-ref").isVisible(),false,"terminology optional behind disclosure");
      assert.equal(await page.locator(".gcat-game-source").isVisible(),false,"research optional behind disclosure");
      if(i===0){
       await page.locator(".gcat-game-reference summary").click();
       assert.equal(await page.locator(".gcat-game-ref").isVisible(),true,"related term is optional");
       assert.equal(await page.locator(".gcat-game-source").isVisible(),true,"source link follows case");
       assert((await page.locator(".gcat-game-source").getAttribute("href")).startsWith("https://"),"trusted external source");
       await page.locator(".gcat-game-ref").click();
       assert.equal(await page.locator("#gcatDialog").evaluate(e=>e.open),true,"original detailed glossary opens");
       assert((await page.locator("#gcatDialogBody").innerText()).length>50,"original explanation retained");
       await page.locator("#gcatDialogClose").click();
      }
      await page.locator("[data-game-next=true]").click();
     }
     assert.equal(ids.size,5,"no repeating case within a round");
     assert.equal(await page.locator("#gcatGamesRoot").getAttribute("data-game-stage"),"done","five stages complete");
     assert.equal(await page.locator(".gcat-game-recap-row").count(),5,"chosen perspectives retained in memory on results only");
     assert((await page.locator(".gcat-game-score").textContent()).includes("어떤 점이 더 궁금"),"reflection replaces score");
     assert.equal(await page.locator("[data-game-review]").count(),0,"no wrong-answer review");
     assert.equal(await page.locator("[data-game-replay]").count(),1,"can explore another five situations");
     await page.locator(".gcat-game-finish-actions .gcat-game-secondary").click();
     assert.equal(await page.locator("#gcatGamesRoot").getAttribute("data-game-stage"),"hub","choice screen reusable");
    }
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,"no horizontal scroll");
   await page.locator("#gcatGamesBack").click();
   assert.equal(await page.locator("#gcatSituationPanel").isVisible(),true,"return to original situation page");
   await page.locator("#gcatJourneyNav [data-view=terms]").click();
   await page.locator("#gcatGamesFromTerms").click();
   assert.equal(await page.locator("#gcatGamesPanel").isVisible(),true,"game also reached from original term view");
   await page.locator("#gcatGamesBack").click();
   assert.equal(await page.locator("#gcatTermPanel").isVisible(),true,"returns to the correct starting view");
   await page.goto(new URL("?view=games",base).href,{waitUntil:"networkidle",timeout:90000});
   assert.equal(await page.locator("#gcatGamesPanel").isVisible(),true,"direct games link still works");
   assert.deepEqual(errors,[],name+" no browser JS errors");
   console.log(name+": PASS observation and support exploration, 4 five-case rounds, no correct scores, explanations, optional sources, glossary modal, URLs and responsive");
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
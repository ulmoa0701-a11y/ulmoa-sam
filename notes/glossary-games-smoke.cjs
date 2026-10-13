/* 알아봄: 단계별 단서 발견 → 지원 선택 → 가상 반응 → 비교 → 정리까지 실제 브라우저 검증 */
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
(async()=>{
 const browser=await chromium.launch({headless:true});
 const base=process.env.GLOSSARY_QA_URL||"http://127.0.0.1:8765/notes/";
 const profiles=[["mobile-small",360,780],["mobile",390,844],["tablet",768,1024],["desktop",1440,900]];
 const screenshots=path.resolve("glossary-qa-screenshots");fs.mkdirSync(screenshots,{recursive:true});
 try{
  for(const [name,width,height] of profiles){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   const errors=[];page.on("pageerror",x=>errors.push(String(x)));
   await page.goto(base,{waitUntil:"networkidle",timeout:90000});
   await page.locator("#gcatGamesFromSituations").click();
   assert.equal(await page.locator("#gcatGamesPanel").isVisible(),true,"game from real-life scenario");
   assert.deepEqual(await page.locator(".gcat-game-mode-card").evaluateAll(items=>items.map(x=>x.dataset.learningMode)),["observe","support"],"two distinct games");
   assert.deepEqual(await page.evaluate(()=>window.HabomGlossaryGames.counts),{cases:12,activities:24},"twelve fictional stories in two modes");
   assert((await page.locator(".gcat-game-note").innerText()).includes("가상"),"fictional rather than verified clinical outcomes");
   await page.screenshot({path:path.join(screenshots,name+"-new-games-hub.png")});
   for(const mode of ["observe","support"]){
    for(const level of ["start","more"]){
     await page.locator('[data-game-start="'+mode+'"][data-level="'+level+'"]').click();
     const ids=new Set();
     for(let i=0;i<3;i++){
      const game=page.locator("#gcatGamesRoot");
      const caseId=await page.locator(".gcat-game-question").getAttribute("data-game-question");
      ids.add(caseId);
      assert.equal(await page.locator("[data-game-answer]").count(),0,"no diagnostic/correct grade");
      if(mode==="observe"){
       assert.equal(await game.getAttribute("data-game-stage"),"clues","start by finding clue");
       assert.equal(await page.locator("[data-clue-index]").count(),3,"three genuinely different clues");
       await page.locator("[data-clue-index]").first().click();
       assert.equal(await game.getAttribute("data-game-stage"),"evidence","selected clue reveals new scene");
       const firstClue=await page.locator(".gcat-game-evidence p").innerText();
       assert(firstClue.length>20,"meaningful new fictional evidence revealed");
       if(i===0){
        await page.locator(".gcat-game-flow-actions .gcat-game-secondary").click();
        assert.equal(await page.locator("[data-clue-index]").count(),2,"discovered clue not repeated");
        await page.locator("[data-clue-index]").last().click();
        assert.equal(await page.locator(".gcat-game-evidence p").count(),1,"second clue changes story");
        assert.notEqual(await page.locator(".gcat-game-evidence p").innerText(),firstClue,"clue branch is different");
       }
       await page.locator(".gcat-game-flow-actions .gcat-game-next").click();
       assert.equal(await game.getAttribute("data-game-stage"),"supports","clue discovery leads to help choices");
      }else{
       assert.equal(await game.getAttribute("data-game-stage"),"supports","support lab starts with baseline evidence");
       assert.equal(await page.locator(".gcat-game-known-clues p").count(),1,"context given before support choice");
       if(i===0){
        await page.locator(".gcat-game-flow-actions .gcat-game-secondary").click();
        await page.locator("[data-clue-index]").last().click();
        assert.equal(await game.getAttribute("data-game-stage"),"evidence","support lab can investigate further");
        await page.locator(".gcat-game-flow-actions .gcat-game-next").click();
       }
      }
      assert.equal(await page.locator("[data-support-index]").count(),3,"three distinct possible supports");
      const first=page.locator("[data-support-index]").first();
      const firstIdx=await first.getAttribute("data-support-index");
      if(i===0)await first.press("Enter");else await first.click();
      assert.equal(await game.getAttribute("data-game-stage"),"outcome","different story outcome after support action");
      assert((await page.locator(".gcat-game-outcome p").innerText()).length>25,"fictional response is shown");
      assert((await page.locator(".gcat-game-disclaimer-inline").innerText()).includes("실제"),"fictional outcomes cannot be mistaken for predictions");
      assert.equal(await page.locator(".gcat-game-ref").isVisible(),false,"terminology hidden until voluntarily opened");
      if(i===0){
       const originalOutcome=await page.locator(".gcat-game-outcome p").innerText();
       await page.locator(".gcat-game-flow-actions .gcat-game-secondary").click();
       assert.equal(await game.getAttribute("data-game-stage"),"supports","compare a different support");
       const second=page.locator('[data-support-index]:not([data-support-index="'+firstIdx+'"])').first();
       await second.click();
       assert.equal(await game.getAttribute("data-game-stage"),"outcome","second support gives its own fictional outcome");
       assert.notEqual(await page.locator(".gcat-game-outcome p").innerText(),originalOutcome,"help selection changes story");
       assert.equal(await page.locator(".gcat-game-perspective").count(),2,"two help outcomes can be compared");
       await page.locator(".gcat-game-reference summary").click();
       assert.equal(await page.locator(".gcat-game-ref").isVisible(),true,"terminology voluntary");
       assert.equal(await page.locator(".gcat-game-source").isVisible(),true,"source voluntary");
       assert((await page.locator(".gcat-game-source").getAttribute("href")).startsWith("https://"));
       await page.locator(".gcat-game-ref").click();
       assert.equal(await page.locator("#gcatDialog").evaluate(x=>x.open),true,"original detailed note preserved");
       await page.locator("#gcatDialogClose").click();
       await page.screenshot({path:path.join(screenshots,name+"-"+mode+"-branch.png")});
      }
      await page.locator(".gcat-game-flow-actions .gcat-game-next").click();
     }
     assert.equal(ids.size,3,"round contains three unique cases");
     assert.equal(await page.locator("#gcatGamesRoot").getAttribute("data-game-stage"),"done","round ends");
     assert.equal(await page.locator(".gcat-game-recap-row").count(),3,"three scenario notes retained without storage");
     assert.equal(await page.locator("[data-game-answer]").count(),0,"never grades a caregiver");
     assert.equal(await page.locator("[data-game-replay]").count(),1,"can continue learning");
     await page.locator(".gcat-game-finish-actions .gcat-game-secondary").click();
     assert.equal(await page.locator("#gcatGamesRoot").getAttribute("data-game-stage"),"hub","back to game modes");
    }
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,"no horizontal overflow");
   await page.locator("#gcatGamesBack").click();
   assert.equal(await page.locator("#gcatSituationPanel").isVisible(),true,"returns to original scenarios");
   await page.locator('#gcatJourneyNav [data-view="terms"]').click();
   await page.locator("#gcatGamesFromTerms").click();
   await page.locator("#gcatGamesBack").click();
   assert.equal(await page.locator("#gcatTermPanel").isVisible(),true,"term reader remains usable");
   await page.goto(new URL("?view=games",base).href,{waitUntil:"networkidle",timeout:90000});
   assert.equal(await page.locator("#gcatGamesPanel").isVisible(),true,"direct game URL still works");
   assert.deepEqual(errors,[],name+" no JS errors");
   console.log(name+": PASS 2 interactive clue/help games, 12 stories, 3-case rounds, distinct branch responses, reference modal, mobile/desktop");
   await page.close();
  }
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exit(1);});
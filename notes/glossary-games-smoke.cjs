/* 알아봄 두 가지 게임: 실제 브라우저에서 모바일/태블릿/PC 클릭, 오답 복습, 출처 팝업, URL 및 오류 검증 */
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
(async()=>{
  const browser=await chromium.launch({headless:true});
  const base=process.env.GLOSSARY_QA_URL||"http://127.0.0.1:8765/notes/";
  const profiles=[
    {name:"mobile-small",width:360,height:780},
    {name:"mobile",width:390,height:844},
    {name:"tablet",width:768,height:1024},
    {name:"desktop",width:1440,height:900}
  ];
  const shots=path.resolve("glossary-qa-screenshots");
  fs.mkdirSync(shots,{recursive:true});
  try{
    for(const p of profiles){
      const page=await browser.newPage({viewport:{width:p.width,height:p.height},deviceScaleFactor:1});
      const errors=[];
      page.on("pageerror",e=>errors.push(String(e)));
      await page.goto(base,{waitUntil:"networkidle",timeout:90000});
      assert.equal(await page.locator("#gcatSituationPanel").isVisible(),true,"original learning start remains");
      assert.equal(await page.locator("#gcatGamesFromSituations").count(),1,"practice entry from situations");
      await page.locator("#gcatGamesFromSituations").click();
      assert.equal(await page.locator("#gcatGamesPanel").isVisible(),true,"games view open");
      assert.equal(new URL(page.url()).searchParams.get("view"),"games","games link shareable");
      assert.equal(await page.locator("#gcatGamesRoot").getAttribute("data-game-stage"),"hub","two games show immediately");
      assert.equal(await page.locator(".gcat-game-mode-card").count(),2,"two independent learning games");
      await page.screenshot({path:path.join(shots,p.name+"-game-hub.png")});
      for(const mode of ["terms","situations"]){
        for(const level of ["start","more"]){
          const choice=page.locator('[data-game-start="'+mode+'"][data-level="'+level+'"]');
          assert.equal(await choice.count(),1,"each game has both difficulty levels");
          await choice.click();
          assert.equal(await page.locator("#gcatGamesRoot").getAttribute("data-game-stage"),"question","question stage");
          const ids=new Set();
          for(let i=0;i<5;i++){
            assert.equal(await page.locator(".gcat-game-choice").count(),3,"3 options, one meaningful answer");
            ids.add(await page.locator(".gcat-game-question").getAttribute("data-game-question"));
            if(i===0)await page.locator('.gcat-game-choice[data-game-answer="false"]').first().click();
            else await page.locator('.gcat-game-choice[data-game-answer="true"]').first().click();
            assert.equal(await page.locator(".gcat-game-feedback").count(),1,"immediate explanation even on wrong answer");
            assert((await page.locator(".gcat-game-why").innerText()).length>23,"explanation meaningful");
            assert.equal(await page.locator(".gcat-game-choice.correct").count(),1,"correct answer is visible");
            assert.equal(await page.locator(".gcat-game-choice:disabled").count(),3,"cannot answer twice");
            if(i===0){
              await page.locator(".gcat-game-ref").click();
              assert.equal(await page.locator("#gcatDialog").evaluate(e=>e.open),true,"original cited glossary opens from game");
              assert((await page.locator("#gcatDialogBody").innerText()).length>50,"source note retained");
              await page.locator("#gcatDialogClose").click();
            }
            await page.locator(".gcat-game-next").click();
          }
          assert.equal(ids.size,5,"five different prompts per game round");
          assert.equal(await page.locator("#gcatGamesRoot").getAttribute("data-game-stage"),"done","round finishes");
          assert.equal(await page.locator('[data-game-review="true"]').count(),1,"wrong answer review offered");
          await page.locator('[data-game-review="true"]').click();
          assert.equal(await page.locator(".gcat-game-progress strong").textContent(),"1 / 1","only missed question returns");
          await page.locator('[data-game-skip="true"]').click();
          assert.equal(await page.locator(".gcat-game-feedback").count(),1,"don't-know option reveals explanation");
          await page.locator(".gcat-game-next").click();
          assert.equal(await page.locator("#gcatGamesRoot").getAttribute("data-game-stage"),"done","review finishes");
          await page.locator(".gcat-game-finish-actions .gcat-game-secondary").last().click();
          assert.equal(await page.locator("#gcatGamesRoot").getAttribute("data-game-stage"),"hub","can switch game modes");
        }
      }
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,"no horizontal overflow in games");
      await page.locator("#gcatGamesBack").click();
      assert.equal(await page.locator("#gcatSituationPanel").isVisible(),true,"original situation learning restored");
      await page.locator('#gcatJourneyNav [data-view="terms"]').click();
      await page.locator("#gcatGamesFromTerms").click();
      assert.equal(await page.locator("#gcatGamesPanel").isVisible(),true,"entry from glossary works too");
      await page.goto(new URL("?view=games",base).href,{waitUntil:"networkidle"});
      assert.equal(await page.locator("#gcatGamesPanel").isVisible(),true,"deep-link loads games on refresh");
      assert.equal(await page.locator(".gcat-game-mode-card").count(),2,"games initialize on direct link");
      assert.deepEqual(errors,[],p.name+" no browser JS errors");
      console.log(p.name+": PASS two games + 4 difficulty combinations, 5 question rounds, incorrect-review-skip, popup citations, responsive and direct URL");
      await page.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

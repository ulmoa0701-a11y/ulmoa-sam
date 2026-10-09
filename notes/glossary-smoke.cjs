const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
(async()=>{
  const browser=await chromium.launch({headless:true});
  const base=process.env.GLOSSARY_QA_URL||"http://127.0.0.1:8765/notes/";
  const screens=path.resolve("glossary-qa-screenshots");
  fs.mkdirSync(screens,{recursive:true});
  const profiles=[
    {name:"mobile-small",width:360,height:780,columns:1},
    {name:"mobile",width:390,height:844,columns:1},
    {name:"tablet",width:768,height:1024,columns:1},
    {name:"desktop",width:1440,height:900,columns:2}
  ];
  const counts={"cognitive":9,"memory-perception":6,"language":8,"intervention":7};
  const names=["working-memory","short-term-memory","processing-speed","attention","memory","visual-perception","auditory-processing","receptive-language","expressive-language","aac","prompting","reinforcement"];
  try{
    if(!process.env.GLOSSARY_QA_URL){
      const files=fs.readdirSync(path.resolve("assets/glossary/cards")).filter(x=>x.endsWith(".webp")).sort();
      assert.deepEqual(files,names.map(x=>x+".webp").sort(),"12 approved original cards remain available as separate image files");
    }
    for(const profile of profiles){
      const page=await browser.newPage({viewport:{width:profile.width,height:profile.height},deviceScaleFactor:1});
      const errors=[];
      page.on("pageerror",e=>errors.push(String(e)));
      await page.goto(base,{waitUntil:"networkidle",timeout:90000});
      const catalog=page.locator("#glossaryCatalog");
      assert.equal(await catalog.count(),1,"only one unified catalog");
      assert.equal(await page.locator("#glossaryApprovedGrid").count(),0,"remove long illustration gallery");
      assert.equal(await page.locator(".study-note").count(),30,"preserve existing thirty referenced notes");
      assert.equal(await page.locator(".study-sources").count(),30,"preserve thirty source groups");
      assert.equal(await page.locator(".glossary-explorer").evaluate(e=>getComputedStyle(e).display),"none","hide duplicated old explorer");
      const cards=page.locator("#gcatList .gcat-card");
      await cards.first().waitFor();
      assert.equal(await cards.count(),6,"curated home displays six choices, not thirty");
      assert.equal(await page.locator(".gcat-tab").count(),5,"five easy-to-discover categories");
      const x=await cards.evaluateAll(els=>els.map(el=>({x:el.getBoundingClientRect().x,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})));
      assert.equal(new Set(x.map(o=>Math.round(o.x))).size,profile.columns,"expected category list column count");
      assert(x.every(o=>o.height<=123),"compact single-row cards (may have wrapped title)");
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,"no sideways page scroll");
      if(profile.name.startsWith("mobile")){
        assert(x.every(o=>o.width>=230),"horizontal cards readable on phones");
        const listHeight=await page.locator("#gcatList").evaluate(el=>el.getBoundingClientRect().height);
        assert(listHeight<710,"six featured terms fit in a compact list");
      }
      await page.screenshot({path:path.join(screens,profile.name+"-catalog.png")});
      const noteOpener=cards.first();
      await noteOpener.click();
      const dialog=page.locator("#gcatDialog");
      assert.equal(await dialog.evaluate(el=>el.open),true,"tap opens the local dialog instead of scrolling");
      assert((await page.locator("#gcatDialogBody .study-paper").textContent()).length>80,"show original core and examples");
      await page.locator(".gcat-art-disclosure > summary").click();
      await page.locator(".gcat-art-panel img").waitFor({state:"visible"});
      await page.waitForFunction(()=>{const x=document.querySelector(".gcat-art-panel img");return x&&x.complete&&x.naturalWidth===1122});
      if(profile.name==="mobile")await page.screenshot({path:path.join(screens,"mobile-dialog.png")});
      await page.locator("#gcatDialogClose").click();
      assert.equal(await dialog.evaluate(el=>el.open),false,"close button works");
      assert.equal(await page.locator("#gcatRecent button").count(),1,"recently viewed term recorded");

      // Category switching must render only matching items, not make users scroll through other topics.
      for(const [category,n] of Object.entries(counts)){
        await page.locator('.gcat-tab[data-tab="'+category+'"]').click();
        assert.equal(await cards.count(),n,"category "+category+" correct item count");
      }
      await page.locator('.gcat-tab[data-tab="language"]').click();
      await page.locator(".gcat-card[data-id='memo-receptive-expressive']").click();
      await page.locator(".gcat-art-disclosure > summary").click();
      const coverTabs=page.locator(".gcat-art-choices button");
      assert.equal(await coverTabs.count(),2,"both approved speech illustrations retained");
      await coverTabs.nth(1).click();
      assert((await page.locator(".gcat-art-panel img").getAttribute("src")).endsWith("expressive-language.webp"));
      await page.keyboard.press("Escape");
      assert.equal(await dialog.evaluate(el=>el.open),false,"Escape closes detail");
      const search=page.locator("#gcatSearch");
      await search.fill("AAC");
      assert(await cards.count()>=1,"search whole glossary, regardless of selected category");
      assert.equal(await page.locator('.gcat-card[data-id="memo-aac"]').count(),1,"find AAC");
      await page.locator('.gcat-card[data-id="memo-aac"]').click();
      assert.equal(await dialog.evaluate(el=>el.open),true,"searched card opens detail");
      assert.equal((await page.locator("#gcatDialogTitle").textContent()).trim(),"AAC");
      const related=page.locator(".gcat-related-items button");
      assert(await related.count()>=1,"related concepts are reachable");
      await related.first().click();
      assert.notEqual((await page.locator("#gcatDialogTitle").textContent()).trim(),"AAC","related term opens within dialog");
      await page.locator("#gcatDialogClose").click();
      await search.fill("없는용어zzzz");
      assert.equal(await cards.count(),0,"no match empty state");
      assert.equal(await page.locator("#gcatEmpty").isVisible(),true,"empty search feedback");
      await page.locator("#gcatClear").click();
      assert.equal(await search.inputValue(),"","clear search works");
      assert.equal(await page.locator("#gcatEmpty").isVisible(),false,"clear restores category list");
      await page.locator('.gcat-tab[data-tab="featured"]').click();
      assert.equal(await cards.count(),6,"return to featured quick browse");
      await page.evaluate(()=>window.scrollTo(0,320));
      await page.waitForTimeout(100);
      const searchTop=await page.locator("#gcatSearch").evaluate(el=>el.getBoundingClientRect().top);
      assert(searchTop>=-1&&searchTop<150,"search stays sticky when browsing down");
      assert.deepEqual(errors,[],"no uncaught javascript errors");
      console.log(profile.name+": PASS - compact list, 30 notes, filters, search, sticky field, dialog, original artwork, related terms");
      await page.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

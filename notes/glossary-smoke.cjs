const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
(async()=>{
  const browser=await chromium.launch({headless:true});
  const base=process.env.GLOSSARY_QA_URL||"http://127.0.0.1:8765/notes/";
  const folder=path.resolve("glossary-qa-screenshots");
  fs.mkdirSync(folder,{recursive:true});
  const profiles=[
    {name:"mobile-small",width:360,height:780,columns:2},
    {name:"mobile",width:390,height:844,columns:2},
    {name:"tablet",width:768,height:1024,columns:3},
    {name:"desktop",width:1440,height:900,columns:4}
  ];
  const categories={"cognitive":4,"memory-perception":3,"language":3,"intervention":2};
  const imageFiles=["working-memory","short-term-memory","processing-speed","attention","memory","visual-perception","auditory-processing","receptive-language","expressive-language","aac","prompting","reinforcement"];
  try{
    if(!process.env.GLOSSARY_QA_URL){
      const files=fs.readdirSync(path.resolve("assets/glossary/cards")).filter(s=>s.endsWith(".webp")).sort();
      assert.deepEqual(files,imageFiles.map(s=>s+".webp").sort(),"12 distinct approved pictures");
    }
    for(const p of profiles){
      const page=await browser.newPage({viewport:{width:p.width,height:p.height},deviceScaleFactor:1});
      const errors=[];page.on("pageerror",e=>errors.push(String(e)));
      await page.goto(base,{waitUntil:"networkidle",timeout:90000});
      const tabs=page.locator("#gcatTabs .gcat-tab"),cards=page.locator("#gcatList .gcat-card");
      const modeAlbum=page.locator("#gcatModeAlbum"),modeAll=page.locator("#gcatModeAll");
      const paged=page.locator("#gcatPages");
      assert.equal(await page.locator(".study-note").count(),30,"30 source notes remain");
      assert.equal(await page.locator(".study-sources").count(),30,"30 source citations remain");
      assert.equal(await page.locator("#glossaryApprovedGrid").count(),0,"old long image board removed");
      assert.equal(await tabs.count(),5,"five quick topic filters");
      assert.equal(await modeAlbum.getAttribute("aria-pressed"),"true","picture album is default");
      assert.equal(await cards.count(),6,"six album covers per page");
      assert.equal(await paged.isVisible(),true,"album has page navigation");
      assert.equal(await page.locator("#gcatCount").textContent(),"12개","12 approved covers in album");
      assert.equal(await page.locator("#gcatPageCount").textContent(),"1 / 2");
      assert.equal(await page.locator("#gcatList .gcat-card-copy").count(),0,"no repeated title or description beside illustrations");
      const locs=await cards.evaluateAll(els=>els.map(el=>({x:Math.round(el.getBoundingClientRect().left),width:el.getBoundingClientRect().width,ratio:el.getBoundingClientRect().height/el.getBoundingClientRect().width,img:el.querySelector("img")?.src,ownText:el.innerText.trim()})));
      assert.equal(new Set(locs.map(x=>x.x)).size,p.columns,p.name+" has correct album columns");
      for(const x of locs){assert(!x.ownText,"album image has no duplicate overlay text");assert(x.ratio>1.18&&x.ratio<1.35,"original image proportions preserved");}
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,"no horizontal scroll");
      await page.screenshot({path:path.join(folder,p.name+"-album.png")});
      const first=cards.first();
      await first.click();
      const dialog=page.locator("#gcatDialog");
      assert.equal(await dialog.evaluate(el=>el.open),true,"album button opens detail dialog");
      assert((await page.locator("#gcatDialogBody .study-paper").textContent()).length>80,"full original detail available");
      await page.locator(".gcat-art-disclosure > summary").click();
      const big=page.locator(".gcat-art-panel img");
      await page.waitForFunction(()=>{const img=document.querySelector(".gcat-art-panel img");return img&&img.complete&&img.naturalWidth===1122&&img.naturalHeight===1402});
      if(p.name==="mobile")await page.screenshot({path:path.join(folder,"mobile-detail.png")});
      await page.keyboard.press("Escape");
      assert.equal(await dialog.evaluate(el=>el.open),false,"Escape closes dialog");

      await page.locator("#gcatNext").click();
      assert.equal(await cards.count(),6,"album second page has 6 pictures");
      assert.equal(await page.locator("#gcatPageCount").textContent(),"2 / 2");
      const pageTwoImages=await cards.locator("img").evaluateAll(els=>els.map(x=>x.src.split("/").at(-1)));
      assert(pageTwoImages.includes("expressive-language.webp"),"approved expressive picture exists as its own cover");
      await page.locator('#gcatList .gcat-card[data-album-cover="expressive-language"]'); // non-binding selector creation safe
      const expression=page.locator('.gcat-card[data-album-cover="expressive-language"]');
      await expression.click();
      assert.equal(await dialog.evaluate(el=>el.open),true);
      await page.locator(".gcat-art-disclosure > summary").click();
      assert((await big.getAttribute("src")).endsWith("expressive-language.webp"),"tapped art opens matching picture inside combined language detail");
      await page.locator("#gcatDialogClose").click();
      await page.locator("#gcatPrev").click();
      assert.equal(await page.locator("#gcatPageCount").textContent(),"1 / 2");

      for(const [cat,count] of Object.entries(categories)){
        await page.locator('.gcat-tab[data-tab="'+cat+'"]').click();
        assert.equal(await page.locator("#gcatCount").textContent(),count+"개",cat+" has the right number of illustrated covers");
        assert.equal(await cards.count(),count,"a category shows all its pictures without long scroll");
        assert.equal(await paged.isVisible(),false,"small categories do not have pagination");
      }
      await modeAll.click();
      assert.equal(await modeAll.getAttribute("aria-pressed"),"true","text-inclusive mode toggles correctly");
      await page.locator('.gcat-tab[data-tab="featured"]').click();
      assert.equal(await page.locator("#gcatCount").textContent(),"30개","all thirty original glossary entries discoverable");
      assert.equal(await cards.count(),6,"thirty entries are paginated, no 30-tile scroll");
      assert.equal(await page.locator("#gcatPageCount").textContent(),"1 / 5");
      await page.locator('.gcat-tab[data-tab="cognitive"]').click();
      assert.equal(await page.locator("#gcatCount").textContent(),"9개");
      await page.locator("#gcatNext").click();
      const textTile=page.locator('.gcat-album-text[data-id="memo-inhibition"]');
      // cognitive items contain nine originals and text-only terms on second page.
      assert(await page.locator("#gcatList .gcat-album-text").count()>0);
      await page.locator("#gcatList .gcat-album-text").first().click();
      assert.equal(await dialog.evaluate(el=>el.open),true,"nonillustrated concepts still open");
      await page.locator("#gcatDialogClose").click();

      const search=page.locator("#gcatSearch");
      await search.fill("AAC");
      assert.equal(await cards.count(),1,"search across all modes and categories");
      assert.equal(await page.locator("#gcatList .gcat-album-art").count(),1,"search result uses original approved picture");
      await cards.first().click();
      assert.equal((await page.locator("#gcatDialogTitle").textContent()).trim(),"AAC");
      const related=page.locator(".gcat-related-items button");
      assert(await related.count()>=1,"related terms retained");
      await related.first().click();
      assert.notEqual((await page.locator("#gcatDialogTitle").textContent()).trim(),"AAC","related terms open inside dialog");
      await page.locator("#gcatDialogClose").click();

      await search.fill("억제통제");
      assert.equal(await cards.count(),1,"find terminology without approved art");
      assert.equal(await page.locator("#gcatList .gcat-album-text").count(),1,"no fake picture for terms without art");
      await search.fill("글자없음zzzz");
      assert.equal(await cards.count(),0);assert.equal(await page.locator("#gcatEmpty").isVisible(),true);
      await page.locator("#gcatClear").click();
      assert.equal(await search.inputValue(),"");
      await modeAlbum.click();
      await page.locator('.gcat-tab[data-tab="featured"]').click();
      assert.equal(await page.locator("#gcatCount").textContent(),"12개");
      // Verify sticky input while browsing longer category - inherited overflow issue.
      await modeAll.click();
      await page.locator('.gcat-tab[data-tab="cognitive"]').click();
      await page.evaluate(()=>scrollTo(0,280));
      await page.waitForTimeout(120);
      const sticky=await page.locator(".gcat-search-rail").evaluate(el=>({top:el.getBoundingClientRect().top,position:getComputedStyle(el).position,scroll:scrollY}));
      assert.equal(sticky.position,"sticky");
      assert(sticky.scroll>100&&sticky.top>=-1&&sticky.top<140,"sticky search persists "+JSON.stringify(sticky));
      assert.deepEqual(errors,[],p.name+" no uncaught errors");
      console.log(p.name+": PASS album 12 images / 6 per page, clickable modal + original art, full 30, 5 categories, global search, sticky field");
      await page.close();
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});

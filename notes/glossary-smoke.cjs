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
  const categories={"cognitive":8,"memory-perception":7,"language":5,"intervention":2};
  const newArt=["executive-function","inhibitory-control","cognitive-flexibility","self-regulation","visual-attention","encoding","consolidation","retrieval","pragmatic-language","semantic-understanding"];
  const originalArt=["working-memory","short-term-memory","processing-speed","attention","memory","visual-perception","auditory-processing","receptive-language","expressive-language","aac","prompting","reinforcement"];
  const imageFiles=[...originalArt,...newArt];
  try{
    if(!process.env.GLOSSARY_QA_URL){
      const files=fs.readdirSync(path.resolve("assets/glossary/cards")).filter(s=>s.endsWith(".webp")).sort();
      assert.deepEqual(files,imageFiles.map(s=>s+".webp").sort(),"all 12 original + 10 new art files exist");
    }
    for(const p of profiles){
      const page=await browser.newPage({viewport:{width:p.width,height:p.height},deviceScaleFactor:1});
      const errors=[];page.on("pageerror",e=>errors.push(String(e)));
      await page.goto(base,{waitUntil:"networkidle",timeout:90000});
      const tabs=page.locator("#gcatTabs .gcat-tab"),cards=page.locator("#gcatList .gcat-card");
      const modeAlbum=page.locator("#gcatModeAlbum"),modeAll=page.locator("#gcatModeAll");
      const paged=page.locator("#gcatPages"),dialog=page.locator("#gcatDialog");
      const search=page.locator("#gcatSearch");
      assert.equal(await page.locator(".study-note").count(),30,"all thirty source notes remain");
      assert.equal(await page.locator(".study-sources").count(),30,"all thirty source citations remain");
      assert.equal(await page.locator("#glossaryApprovedGrid").count(),0,"old giant board removed");
      assert.equal(await tabs.count(),5,"all topic categories");
      assert.equal((await page.locator("#gcatTitle").textContent()).trim(),"한눈에 보는 용어");
      assert((await modeAlbum.textContent()).includes("그림으로 보기"));
      assert(!(await modeAlbum.textContent()).includes("그림앨범"));
      assert.equal(await modeAlbum.getAttribute("aria-pressed"),"true","art view is default");
      assert.equal(await cards.count(),6,"six album pictures on each page");
      assert.equal(await paged.isVisible(),true);
      assert.equal(await page.locator("#gcatCount").textContent(),"22개","new count must appear on page");
      assert.equal(await page.locator("#gcatPageCount").textContent(),"1 / 4","22 images = four pages");
      assert.equal(await page.locator("#gcatList .gcat-card-copy").count(),0,"no redundant text beside paintings");
      const locs=await cards.evaluateAll(els=>els.map(el=>({x:Math.round(el.getBoundingClientRect().left),w:el.getBoundingClientRect().width,ratio:el.getBoundingClientRect().height/el.getBoundingClientRect().width,text:el.innerText.trim()})));
      assert.equal(new Set(locs.map(x=>x.x)).size,p.columns,"correct album columns");
      for(const item of locs){assert(!item.text,"art button has no duplicated copy");assert(item.ratio>1.18&&item.ratio<1.35,"art aspect ratio preserved");}
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,"no horizontal scrolling");
      await page.screenshot({path:path.join(folder,p.name+"-album.png")});
      if(p.name==="mobile"){
        for(const file of imageFiles){
          const response=await page.request.get(new URL("../assets/glossary/cards/"+file+".webp",base).href);
          assert.equal(response.status(),200,"art file must resolve "+file);
          assert(response.headers()["content-type"].includes("image/webp"),"valid WebP "+file);
        }
      }
      await cards.first().click();
      assert.equal(await dialog.evaluate(x=>x.open),true,"tap opens explanation");
      assert((await page.locator("#gcatDialogBody .study-paper").textContent()).length>80,"original explanatory text retained");
      await page.locator(".gcat-art-disclosure > summary").click();
      await page.waitForFunction(()=>{const x=document.querySelector(".gcat-art-panel img");return x&&x.complete&&x.naturalWidth===1122&&x.naturalHeight===1402});
      if(p.name==="mobile")await page.screenshot({path:path.join(folder,"mobile-detail.png")});
      await page.keyboard.press("Escape");
      assert.equal(await dialog.evaluate(x=>x.open),false,"Escape closes overlay");

      // Every original + new picture is reachable via next/previous pages.
      const discovered=new Set();
      for(let idx=1;idx<=4;idx++){
        for(const slug of await cards.locator("img").evaluateAll(els=>els.map(x=>x.src.split("/").at(-1).replace(".webp",""))))discovered.add(slug);
        if(idx<4)await page.locator("#gcatNext").click();
      }
      assert.deepEqual([...discovered].sort(),imageFiles.slice().sort(),"all twenty-two art tiles reachable without scrolling");
      assert.equal(await page.locator("#gcatPageCount").textContent(),"4 / 4");
      await search.fill("표현언어");
      const expressive=page.locator('.gcat-card[data-album-cover="expressive-language"]');
      assert.equal(await expressive.count(),1,"art is reachable through an exact search on every page");
      await expressive.click();
      assert.equal(await dialog.evaluate(x=>x.open),true);
      await page.locator(".gcat-art-disclosure > summary").click();
      assert((await page.locator(".gcat-art-panel img").getAttribute("src")).endsWith("expressive-language.webp"),"matching language art in popup");
      await page.locator("#gcatDialogClose").click();
      await search.fill("");

      for(const [cat,count] of Object.entries(categories)){
        await page.locator('.gcat-tab[data-tab="'+cat+'"]').click();
        assert.equal(await page.locator("#gcatCount").textContent(),count+"개",cat+" artwork count");
        assert.equal(await cards.count(),Math.min(6,count),"topic pagination");
        assert.equal(await paged.isVisible(),count>6,"page navigation for longer groups");
      }
      await modeAll.click();
      await page.locator('.gcat-tab[data-tab="featured"]').click();
      assert.equal(await page.locator("#gcatCount").textContent(),"30개","thirty definitions accessible");
      assert.equal(await page.locator("#gcatPageCount").textContent(),"1 / 5");
      await search.fill("AAC");
      assert.equal(await cards.count(),1);
      await cards.first().click();
      assert.equal((await page.locator("#gcatDialogTitle").textContent()).trim(),"AAC");
      await page.locator("#gcatDialogClose").click();

      await search.fill("시각주의");
      assert.equal(await cards.count(),1,"specific visual-attention illustration match");
      assert.equal(await cards.first().getAttribute("data-album-cover"),"visual-attention");
      await cards.first().click();
      await page.locator(".gcat-art-disclosure > summary").click();
      assert((await page.locator(".gcat-art-panel img").getAttribute("src")).endsWith("visual-attention.webp"));
      await page.locator("#gcatDialogClose").click();

      await search.fill("억제통제");
      assert.equal(await cards.count(),1);
      assert.equal(await cards.first().getAttribute("data-album-cover"),"inhibitory-control","no obsolete text-only tile for approved new art");
      await search.fill("의미이해");
      assert.equal(await cards.count(),1);
      assert.equal(await cards.first().getAttribute("data-album-cover"),"semantic-understanding","friendly art alias mapped to source semantics");
      await search.fill("시간지연");
      assert.equal(await cards.count(),1,"unillustrated term still searchable");
      assert.equal(await page.locator("#gcatList .gcat-album-text").count(),1,"never fake an image for unillustrated term");
      await search.fill("없음zzzz");
      assert.equal(await cards.count(),0);
      assert.equal(await page.locator("#gcatEmpty").isVisible(),true);
      await page.locator("#gcatClear").click();
      assert.equal(await search.inputValue(),"");
      await modeAlbum.click();
      await page.locator('.gcat-tab[data-tab="featured"]').click();
      assert.equal(await page.locator("#gcatCount").textContent(),"22개");

      await modeAll.click();
      await page.locator('.gcat-tab[data-tab="cognitive"]').click();
      await page.evaluate(()=>scrollTo(0,280));
      await page.waitForTimeout(120);
      const sticky=await page.locator(".gcat-search-rail").evaluate(x=>({top:x.getBoundingClientRect().top,position:getComputedStyle(x).position,scroll:scrollY}));
      assert.equal(sticky.position,"sticky");
      assert(sticky.scroll>100&&sticky.top>=-1&&sticky.top<140,"sticky search "+JSON.stringify(sticky));
      assert.deepEqual(errors,[],p.name+" has no JS errors");
      console.log(p.name+": PASS 22 approved images, 30 definitions, album paging, all categories, detailed modal, search, sticky controls");
      await page.close();
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});

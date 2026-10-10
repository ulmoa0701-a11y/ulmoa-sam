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
  const categories={"cognitive":11,"memory-perception":9,"language":8,"intervention":4};
  const newArt=["executive-function","inhibitory-control","cognitive-flexibility","self-regulation","visual-attention","encoding","consolidation","retrieval","pragmatic-language","semantic-understanding"];
  const originalArt=["working-memory","short-term-memory","processing-speed","attention","memory","visual-perception","auditory-processing","receptive-language","expressive-language","aac","prompting","reinforcement"];
  const imageFiles=[...originalArt,...newArt].map(x=>x+".webp");
  const moreArt=["metacognition","planning-organization","performance-monitoring","phonological-working-memory","visuospatial-working-memory","narrative-discourse","inferential-comprehension","reading-fluency","functional-behavior-assessment","abc-observation"].map(x=>x+".png");
  const allImages=[...imageFiles,...moreArt];
  try{
    if(!process.env.GLOSSARY_QA_URL){
      const files=fs.readdirSync(path.resolve("assets/glossary/cards")).filter(s=>s.endsWith(".webp")).sort();
      assert.deepEqual(files,imageFiles.slice().sort(),"existing twenty-two WebP drawings untouched");
      const pngs=fs.readdirSync(path.resolve("assets/glossary/cards")).filter(s=>s.endsWith(".png")).sort();
      assert.deepEqual(pngs,moreArt.slice().sort(),"all ten newly-created PNG drawings are present");
    }
    for(const p of profiles){
      const page=await browser.newPage({viewport:{width:p.width,height:p.height},deviceScaleFactor:1});
      const errors=[];page.on("pageerror",e=>errors.push(String(e)));
      await page.goto(base,{waitUntil:"networkidle",timeout:90000});
      const tabs=page.locator("#gcatTabs .gcat-tab"),cards=page.locator("#gcatList .gcat-card");
      const modeAlbum=page.locator("#gcatModeAlbum"),modeAll=page.locator("#gcatModeAll");
      const paged=page.locator("#gcatPages"),dialog=page.locator("#gcatDialog");
      const search=page.locator("#gcatSearch");
      assert.equal(await page.locator(".study-note").count(),42,"all forty-two source notes remain");
      assert.equal(await page.locator(".study-sources").count(),42,"all forty-two source citations remain");
      assert.equal(await page.locator("#glossaryApprovedGrid").count(),0,"old giant board removed");
      assert.equal(await tabs.count(),5,"all topic categories");
      assert.equal((await page.locator("#gcatTitle").textContent()).trim(),"한눈에 보는 용어");
      assert((await modeAlbum.textContent()).includes("그림으로 보기"));
      assert(!(await modeAlbum.textContent()).includes("그림앨범"));
      assert.equal(await modeAlbum.getAttribute("aria-pressed"),"true","art view is default");
      assert.equal(await cards.count(),6,"six album pictures on each page");
      assert.equal(await paged.isVisible(),true);
      assert.equal(await page.locator("#gcatCount").textContent(),"32개","new count must appear on page");
      assert.equal(await page.locator("#gcatPageCount").textContent(),"1 / 6","32 images = six pages");
      assert.equal(await page.locator("#gcatList .gcat-card-copy").count(),0,"no redundant text beside paintings");
      const locs=await cards.evaluateAll(els=>els.map(el=>({x:Math.round(el.getBoundingClientRect().left),w:el.getBoundingClientRect().width,ratio:el.getBoundingClientRect().height/el.getBoundingClientRect().width,text:el.innerText.trim()})));
      assert.equal(new Set(locs.map(x=>x.x)).size,p.columns,"correct album columns");
      for(const item of locs){assert(!item.text,"art button has no duplicated copy");assert(item.ratio>1.18&&item.ratio<1.35,"art aspect ratio preserved");}
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,"no horizontal scrolling");
      await page.screenshot({path:path.join(folder,p.name+"-album.png")});
      if(p.name==="mobile"){
        for(const file of allImages){
          const response=await page.request.get(new URL("../assets/glossary/cards/"+file,base).href);
          assert.equal(response.status(),200,"art file must resolve "+file);
          assert(response.headers()["content-type"].includes(file.endsWith(".png")?"image/png":"image/webp"),"valid image format "+file);
        }
      }
      await cards.first().click();
      assert.equal(await dialog.evaluate(x=>x.open),true,"tap opens explanation");
      assert((await page.locator("#gcatDialogBody .study-paper").textContent()).length>80,"original explanatory text retained");
      const paperLook=await page.locator("#gcatDialogBody .study-paper").evaluate(paper=>{
        const style=getComputedStyle(paper);
        return {
          backgroundImage:style.backgroundImage,
          backgroundColor:style.backgroundColor,
          before:getComputedStyle(paper,"::before").content,
          after:getComputedStyle(paper,"::after").content,
          paddingLeft:parseFloat(style.paddingLeft),
          width:paper.getBoundingClientRect().width
        };
      });
      assert.equal(paperLook.backgroundImage,"none","dialog definition is no longer ruled notebook paper");
      assert.equal(paperLook.backgroundColor,"rgba(0, 0, 0, 0)","reading sheet itself is uncolored");
      assert.equal(paperLook.before,"none","margin pencil decoration removed inside dialog");
      assert.equal(paperLook.after,"none","no decorative pseudo-element in dialog");
      assert.equal(paperLook.paddingLeft,0,"reading layout is not offset by notebook gutter");
      assert.equal(await page.locator("#gcatDialogBody .gcat-definition-section").count(),1,"single clear definition section");
      assert.equal(await page.locator("#gcatDialogBody .gcat-example-section").count(),1,"real-life example follows definition");
      assert.equal(await page.locator("#gcatDialogBody .gcat-hints-section").count(),1,"optional distinction and keywords retained");
      const infoOrder=await page.locator("#gcatDialogBody .gcat-reading-sheet").evaluate(sheet=>[...sheet.children].map(x=>x.className));
      assert.equal(infoOrder[0],"gcat-definition-section","definition first");
      assert.equal(infoOrder[1],"gcat-example-section","example second");
      assert.equal(infoOrder[2],"gcat-hints-section","supporting notes third");
      const mainDefinition=await page.locator("#gcatDialogBody .gcat-definition-section").evaluate(el=>({bg:getComputedStyle(el).backgroundColor,size:parseFloat(getComputedStyle(el.querySelector(".gcat-definition-headline")).fontSize)}));
      assert.equal(mainDefinition.bg,"rgb(255, 249, 237)","one softly highlighted definition focus");
      assert(mainDefinition.size>=18,"definition headline legible");
      assert.equal(await page.locator(".gcat-reference-disclosure").count(),2,"large picture and references folded separately");
      assert.equal(await page.locator(".gcat-reference-disclosure[open]").count(),0,"optional details closed by default");
      assert.equal(await page.locator(".gcat-reference-disclosure .study-visual").isVisible(),false,"large source visual does not dominate initial view");
      const sourceRefs=await page.locator('.glossary-category #memo-working-memory .study-sources a').count();
      await page.locator(".gcat-reference-disclosure").last().locator("summary").click();
      assert.equal(await page.locator("#gcatDialogBody .study-sources a").count(),sourceRefs,"all original reference links available");
      const originalPaperImage=await page.locator(".glossary-category .study-paper").first().evaluate(el=>getComputedStyle(el).backgroundImage);
      assert.notEqual(originalPaperImage,"none","original non-popup study layout remains unchanged");
      if(p.name==="mobile"||p.name==="desktop")await page.screenshot({path:path.join(folder,p.name+"-reading-flow.png")});
      await page.locator(".gcat-art-disclosure > summary").click();
      await page.waitForFunction(()=>{const x=document.querySelector(".gcat-art-panel img");return x&&x.complete&&x.naturalWidth===1122&&x.naturalHeight===1402});
      if(p.name==="mobile")await page.screenshot({path:path.join(folder,"mobile-detail.png")});
      await page.keyboard.press("Escape");
      assert.equal(await dialog.evaluate(x=>x.open),false,"Escape closes overlay");

      // Every original + new picture is reachable via next/previous pages.
      const discovered=new Set();
      for(let idx=1;idx<=6;idx++){
        for(const filename of await cards.locator("img").evaluateAll(els=>els.map(x=>x.src.split("/").at(-1))))discovered.add(filename);
        if(idx<6)await page.locator("#gcatNext").click();
      }
      assert.deepEqual([...discovered].sort(),allImages.slice().sort(),"all thirty-two art tiles reachable across pages");
      assert.equal(await page.locator("#gcatPageCount").textContent(),"6 / 6");
      await search.fill("표현언어");
      const expressive=page.locator('.gcat-card[data-album-cover="expressive-language"]');
      assert.equal(await expressive.count(),1,"art is reachable through an exact search on every page");
      await expressive.click();
      assert.equal(await dialog.evaluate(x=>x.open),true);
      await page.locator(".gcat-art-disclosure > summary").click();
      assert((await page.locator(".gcat-art-panel img").getAttribute("src")).endsWith("expressive-language.webp"),"matching language art in popup");
      await page.locator("#gcatDialogClose").click();
      await search.fill("");

      if(p.name==="mobile"||p.name==="desktop"){
        const newMappings=[
          ["memo-metacognition","metacognition.png"],
          ["memo-planning-organization","planning-organization.png"],
          ["memo-performance-monitoring","performance-monitoring.png"],
          ["memo-phonological-working-memory","phonological-working-memory.png"],
          ["memo-visuospatial-working-memory","visuospatial-working-memory.png"],
          ["memo-narrative-discourse","narrative-discourse.png"],
          ["memo-inferential-comprehension","inferential-comprehension.png"],
          ["memo-reading-fluency","reading-fluency.png"],
          ["memo-fba","functional-behavior-assessment.png"],
          ["memo-abc-observation","abc-observation.png"]
        ];
        for(const [id,file] of newMappings){
          const title=(await page.locator('.glossary-category .study-note#'+id+' summary h3').textContent()).trim();
          await search.fill(title);
          const tile=page.locator('#gcatList .gcat-card[data-id="'+id+'"]');
          assert.equal(await tile.count(),1,"new image has its own tile "+id);
          assert((await tile.locator("img").getAttribute("src")).endsWith(file),"image tile links to original "+id);
          await tile.click();
          assert.equal((await page.locator("#gcatDialogTitle").textContent()).trim(),title,"new illustration opens correct term "+id);
          await page.locator(".gcat-art-disclosure > summary").click();
          assert((await page.locator(".gcat-art-panel img").getAttribute("src")).endsWith(file),"popup shows matching art "+id);
          await page.locator("#gcatDialogClose").click();
        }
        await search.fill("");
      }

      assert.equal(await page.locator("#gcatTopicLead").isVisible(),true,"clear picture category heading");
      assert.equal((await page.locator("#gcatTabs .gcat-tab-count").allTextContents()).join(","),"32,11,9,8,4","accurate illustration counts on topic tabs");
      assert.equal((await page.locator('.gcat-tab[data-tab="featured"]').textContent()).replace(/\\s+/g," ").trim().includes("전체 그림"),true,"clear all-images tab label");
      for(const [cat,count] of Object.entries(categories)){
        await page.locator('.gcat-tab[data-tab="'+cat+'"]').click();
        assert.equal(await page.locator("#gcatCount").textContent(),count+"개",cat+" artwork count");
        assert.equal(await cards.count(),Math.min(6,count),"topic pagination");
        assert.equal(await page.locator('.gcat-tab[data-tab="'+cat+'"]').getAttribute("aria-pressed"),"true","selected topic state");
        assert.equal(await paged.isVisible(),count>6,"page navigation for longer groups");
      }
      await page.locator('.gcat-tab[data-tab="featured"]').click();
      assert.equal(await page.locator("#gcatCount").textContent(),"32개","all pictures restored without hiding any");
      assert.equal(await page.locator("#gcatPageCount").textContent(),"1 / 6","category switching resets album pagination");
      await modeAll.click();
      assert.equal(await modeAll.getAttribute("aria-pressed"),"true","whole glossary text-map view selected");
      assert.equal(await page.locator("#gcatCount").textContent(),"42개","42 glossary entries on one map");
      assert.equal(await paged.isVisible(),false,"do not page through 42 terms in overview");
      assert.equal(await page.locator("#gcatList img").count(),0,"overview contains no image or picture tiles");
      assert.equal(await page.locator("#gcatList .gcat-card").count(),0,"no tall album cards in all view");
      assert.equal(await page.locator("#gcatList .gcat-map-group").count(),4,"four topic branches");
      assert.equal(await page.locator("#gcatList .gcat-map-term").count(),42,"all forty-two terms visible as text buttons");
      assert.equal(await page.locator("#gcatTabs").isVisible(),false,"redundant filters hidden in overview");
      assert.equal(await page.locator("#gcatTopicLead").isVisible(),false,"image topic heading hidden in text mind map");
      for(const [cat,num] of Object.entries({"cognitive":12,"memory-perception":8,"language":11,"intervention":11})){
        assert.equal(await page.locator(".gcat-map-"+cat+" .gcat-map-term").count(),num,"complete "+cat+" branch");
      }
      const textTiles=page.locator("#gcatList .gcat-map-term");
      const mapSizes=await textTiles.evaluateAll(els=>els.map(x=>({width:x.getBoundingClientRect().width,height:x.getBoundingClientRect().height})));
      assert(mapSizes.every(item=>item.height>=30&&item.width>=80),"text terms remain readable click targets");
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,"text map does not scroll horizontally");
      await page.screenshot({path:path.join(folder,p.name+"-text-overview.png"),fullPage:true});
      await page.locator('.gcat-map-term[data-id="memo-executive"]').click();
      assert.equal(await dialog.evaluate(el=>el.open),true,"text map buttons open original explanation");
      assert.equal((await page.locator("#gcatDialogTitle").textContent()).trim(),"실행기능");
      assert((await page.locator("#gcatDialogBody .study-paper").textContent()).trim().length>80,"original sourced notes remain");
      await page.locator("#gcatDialogClose").click();
      if(p.name==="desktop"){
        // All forty-two notes must preserve their original explanations and examples.
        const ids=await page.locator(".gcat-map-term").evaluateAll(els=>els.map(el=>el.dataset.id));
        assert.equal(ids.length,42);
        for(const id of ids){
          const selector='.gcat-map-term[data-id="'+id+'"]';
          await page.locator(selector).click();
          const content=await page.locator("#gcatDialogBody .gcat-reading-sheet").evaluate(el=>({
            hasDefinition:!!el.querySelector(".gcat-definition-section .gcat-definition-explanation, .gcat-definition-section .gcat-definition-pair"),
            hasExample:!!el.querySelector(".gcat-example-section .study-example"),
            hiddenLargeArt:!el.querySelector(".gcat-reference-disclosure[open]"),
            refs:el.querySelectorAll(".study-sources a").length
          }));
          assert(content.hasDefinition&&content.hasExample&&content.hiddenLargeArt&&content.refs>0,id+" retains a clear definition, example and references");
          await page.locator("#gcatDialogClose").click();
        }
      }
      if(p.name==="desktop"){
        const newIds=["memo-metacognition","memo-planning-organization","memo-performance-monitoring","memo-phonological-working-memory","memo-visuospatial-working-memory","memo-narrative-discourse","memo-inferential-comprehension","memo-reading-fluency","memo-fba","memo-abc-observation","memo-replacement-behavior","memo-udl"];
        assert.equal(new Set(newIds).size,12);
        for(const id of newIds){
          const entry=page.locator('.gcat-map-term[data-id="'+id+'"]');
          assert.equal(await entry.count(),1,"new glossary term is present in map: "+id);
          const title=await entry.textContent();
          await search.fill(title);
          assert.equal(await page.locator('.gcat-map-term[data-id="'+id+'"]').count(),1,"new term is searchable by title: "+title);
          await page.locator('.gcat-map-term[data-id="'+id+'"]').click();
          assert.equal(await dialog.evaluate(el=>el.open),true);
          assert.equal((await page.locator("#gcatDialogTitle").textContent()).trim(),title.trim());
          assert((await page.locator("#gcatDialogBody .gcat-definition-section").textContent()).length>40,"new definition meaningful");
          assert((await page.locator("#gcatDialogBody .gcat-example-section").textContent()).length>30,"new example meaningful");
          await page.locator("#gcatDialogClose").click();
          await search.fill("");
        }
      }
      await search.fill("AAC");
      assert.equal(await page.locator("#gcatList img").count(),0,"searched overview still has no art");
      assert.equal(await page.locator("#gcatList .gcat-map-term").count(),1,"title-match search gives one text result");
      await page.locator(".gcat-map-term").click();
      assert.equal((await page.locator("#gcatDialogTitle").textContent()).trim(),"AAC");
      await page.locator("#gcatDialogClose").click();
      await search.fill("시각주의");
      assert.equal(await page.locator("#gcatList .gcat-map-term").count(),1,"visual attention source is searchable by alias");
      assert.equal(await page.locator("#gcatList .gcat-map-term").first().getAttribute("data-id"),"memo-visual");
      await search.fill("억제통제");
      assert.equal(await page.locator("#gcatList .gcat-map-term").count(),1);
      await search.fill("의미이해");
      assert.equal(await page.locator("#gcatList .gcat-map-term").count(),1);
      await search.fill("시간지연");
      assert.equal(await page.locator("#gcatList .gcat-map-term").count(),1,"unillustrated term remains in overview");
      await search.fill("없는말zzzz");
      assert.equal(await page.locator("#gcatList .gcat-map-term").count(),0,"empty search");
      assert.equal(await page.locator("#gcatEmpty").isVisible(),true,"missing term message");
      await page.locator("#gcatClear").click();
      assert.equal(await search.inputValue(),"");
      assert.equal(await page.locator("#gcatList .gcat-map-term").count(),42,"clear restores full map");

      await modeAlbum.click();
      assert.equal(await page.locator("#gcatCount").textContent(),"32개","picture view preserved + new illustration cards");
      assert.equal(await cards.count(),6,"original album still uses six images per page");
      assert.equal(await paged.isVisible(),true,"album pagination still works");
      await page.locator('.gcat-tab[data-tab="cognitive"]').click();
      await page.evaluate(()=>scrollTo(0,280));
      await page.waitForTimeout(120);
      const sticky=await page.locator(".gcat-search-rail").evaluate(x=>({top:x.getBoundingClientRect().top,position:getComputedStyle(x).position,scroll:scrollY}));
      assert.equal(sticky.position,"sticky");
      if(sticky.scroll>100)assert(sticky.top>=-1&&sticky.top<140,"sticky search "+JSON.stringify(sticky));
      assert.deepEqual(errors,[],p.name+" has no JS errors");
      console.log(p.name+": PASS 32 images + 42-text-map, four branch counts, no art in all view, search, dialogs, responsive");
      await page.close();
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});

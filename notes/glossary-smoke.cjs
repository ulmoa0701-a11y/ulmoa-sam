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
  const addedArt=["metacognition","planning-organization","performance-monitoring","phonological-working-memory","visuospatial-working-memory","narrative-discourse","inferential-comprehension","reading-fluency","functional-behavior-assessment","abc-observation"];
  const imageFiles=[...originalArt,...newArt,...addedArt];
  const filesByName=[...originalArt,...newArt].map(s=>s+".webp").concat(addedArt.map(s=>s+".png"));
  try{
    if(!process.env.GLOSSARY_QA_URL){
      const files=fs.readdirSync(path.resolve("assets/glossary/cards")).filter(s=>/\.(?:webp|png)$/.test(s)).sort();
      assert.deepEqual(files,filesByName.slice().sort(),"all original and ten newly added art files exist");
    }
    for(const p of profiles){
      const page=await browser.newPage({viewport:{width:p.width,height:p.height},deviceScaleFactor:1});
      const errors=[];page.on("pageerror",e=>errors.push(String(e)));
      await page.goto(base,{waitUntil:"networkidle",timeout:90000});
      // 가상 이용자: 첫 방문 보호자가 선택 없이 대표 상황 4가지를 바로 읽을 수 있어야 한다.
      assert.equal(await page.locator("#gcatSituationPanel").isVisible(),true,"first-time visitor sees situations immediately");
      assert.equal(await page.locator("#gcatTermPanel").isVisible(),false,"catalog is optional, not first decision");
      assert.equal(await page.locator("#gcatJourneyNav button").count(),2,"two clear entry points, not three");
      assert.equal(await page.locator("#gcatSituationGrid .gcat-situation-card").count(),4,"four representative situations are visible");
      assert.equal(await page.locator("#gcatSituationGrid .gcat-first-concept").count(),4,"each situation teaches exactly one term without opening anything");
      assert.equal(await page.locator("#gcatSituationGrid .gcat-why-link").count(),4,"each situation explains the concept connection");
      assert.equal(await page.locator("#gcatSituationGrid .gcat-situation-more[open]").count(),0,"advanced terms stay optional");
      await page.locator('#gcatJourneyNav button[data-view="terms"]').click();
      assert.equal(await page.locator("#gcatTermPanel").isVisible(),true,"one selection opens the original glossary");
      const tabs=page.locator("#gcatTabs .gcat-tab"),cards=page.locator("#gcatList .gcat-card");
      const modeAlbum=page.locator("#gcatModeAlbum"),modeAll=page.locator("#gcatModeAll");
      const paged=page.locator("#gcatPages"),dialog=page.locator("#gcatDialog");
      const search=page.locator("#gcatSearch");
      assert.equal(await page.locator(".study-note").count(),42,"all forty-two source notes remain");
      assert.equal(await page.locator(".study-sources").count(),42,"all forty-two source citations remain");
      assert.equal(await page.locator("#glossaryApprovedGrid").count(),0,"old giant board removed");
      assert.equal(await tabs.count(),5,"all topic categories");
      assert.equal((await page.locator("#gcatTitle").textContent()).trim(),"알아봄");
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
        for(const file of filesByName){
          const response=await page.request.get(new URL("../assets/glossary/cards/"+file,base).href);
          assert.equal(response.status(),200,"art file must resolve "+file);
          assert(response.headers()["content-type"].includes(file.endsWith(".png")?"image/png":"image/webp"),"valid image mime "+file);
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
      assert.equal(await page.locator("#gcatDialogBody .gcat-original-definition-label").textContent(),"정확한 뜻","expert definition remains after one-line plain explanation");
      assert.equal(await page.locator("#gcatDialogBody .gcat-section-kicker").textContent(),"한마디로","plain language comes before professional meaning");
      assert.equal(await page.locator("#gcatDialogBody .gcat-example-section").count(),1,"real-life example follows definition");
      assert.equal(await page.locator("#gcatDialogBody .gcat-hints-section").count(),1,"optional distinction and keywords retained");
      const infoOrder=await page.locator("#gcatDialogBody .gcat-reading-sheet").evaluate(sheet=>[...sheet.children].map(x=>x.className));
      assert.equal(infoOrder[0],"gcat-definition-section","definition first");
      assert.equal(infoOrder[1],"gcat-inline-art","art preview second, without expansion click");
      assert.equal(infoOrder[2],"gcat-example-section","example after visible art");
      assert.equal(infoOrder[3],"gcat-hints-section","supporting notes after example");
      const mainDefinition=await page.locator("#gcatDialogBody .gcat-definition-section").evaluate(el=>({bg:getComputedStyle(el).backgroundColor,size:parseFloat(getComputedStyle(el.querySelector(".gcat-definition-headline")).fontSize)}));
      assert.equal(mainDefinition.bg,"rgb(255, 249, 237)","one softly highlighted definition focus");
      assert(mainDefinition.size>=18,"definition headline legible");
      assert.equal(await page.locator(".gcat-reference-disclosure").count(),2,"reference material retained");
      assert.equal(await page.locator(".gcat-resource-actions .gcat-reference-disclosure").count(),2,"secondary actions grouped horizontally");
      assert.equal(await page.locator(".gcat-reference-disclosure[open]").count(),0,"optional details closed by default");
      assert.equal(await page.locator(".gcat-reference-disclosure .study-visual").isVisible(),false,"large source visual does not dominate initial view");

      const artRect=await page.locator(".gcat-inline-art").boundingBox();
      const definitionRect=await page.locator(".gcat-definition-section").boundingBox();
      if(p.width>=720){
        assert(artRect.x>definitionRect.x+100,"image uses side-by-side free space on wide screens");
        assert(Math.abs(artRect.y-definitionRect.y)<25,"picture aligns with definition");
      }else{
        assert(artRect.y>=definitionRect.y,"mobile artwork follows the definition");
      }
      const sourceRefs=await page.locator('.glossary-category #memo-working-memory .study-sources a').count();
      await page.locator(".gcat-reference-disclosure").last().locator("summary").click();
      assert.equal(await page.locator("#gcatDialogBody .study-sources a").count(),sourceRefs,"all original reference links available");
      const originalPaperImage=await page.locator(".glossary-category .study-paper").first().evaluate(el=>getComputedStyle(el).backgroundImage);
      assert.notEqual(originalPaperImage,"none","original non-popup study layout remains unchanged");
      if(p.name==="mobile"||p.name==="desktop")await page.screenshot({path:path.join(folder,p.name+"-reading-flow.png")});
      const previewArt=page.locator(".gcat-inline-art-image");
      assert.equal(await previewArt.isVisible(),true,"original image appears in term detail without any extra click");
      await previewArt.evaluate(img=>img.decode());
      assert.equal(await previewArt.evaluate(img=>img.naturalWidth===1122&&img.naturalHeight===1402),true,"original resolution retained");
      await page.locator(".gcat-inline-art-zoom").click();
      assert.equal(await page.locator("#gcatImageViewer").evaluate(x=>x.open),true,"clicking picture opens zoom");
      assert.equal(await page.locator("#gcatImageViewerArt").evaluate(img=>img.src),await previewArt.evaluate(img=>img.src),"zoom uses identical source");
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#gcatImageViewer").evaluate(x=>x.open),false,"Escape dismisses only picture zoom");
      if(p.name==="mobile")await page.screenshot({path:path.join(folder,"mobile-detail.png")});
      await page.keyboard.press("Escape");
      assert.equal(await dialog.evaluate(x=>x.open),false,"Escape closes overlay");

      // Every original + new picture is reachable via next/previous pages.
      const discovered=new Set();
      for(let idx=1;idx<=6;idx++){
        for(const slug of await cards.locator("img").evaluateAll(els=>els.map(x=>x.src.split("/").at(-1).replace(/\.(webp|png)$/,""))))discovered.add(slug);
        if(idx<6)await page.locator("#gcatNext").click();
      }
      assert.deepEqual([...discovered].sort(),imageFiles.slice().sort(),"all thirty-two art tiles reachable without scrolling");
      assert.equal(await page.locator("#gcatPageCount").textContent(),"6 / 6");
      if(p.name==="desktop"){
        for(const [name,slug] of [
          ["메타인지","metacognition"],["계획과 조직화","planning-organization"],["수행점검","performance-monitoring"],
          ["음운작업기억","phonological-working-memory"],["시공간 작업기억","visuospatial-working-memory"],
          ["이야기담화","narrative-discourse"],["추론이해","inferential-comprehension"],
          ["읽기유창성","reading-fluency"],["기능적 행동평가(FBA)","functional-behavior-assessment"],
          ["ABC 관찰기록","abc-observation"]
        ]){
          await search.fill(name);
          const tile=page.locator('.gcat-card[data-album-cover="'+slug+'"]');
          assert.equal(await tile.count(),1,"new illustrated term searchable: "+name);
          await tile.click();
          assert.equal((await page.locator("#gcatDialogTitle").textContent()).trim(),name);
          const art=page.locator(".gcat-inline-art-image");
          assert.equal(await art.isVisible(),true,"new card art is visible without unfolding");
          await art.evaluate(img=>img.decode());
          assert((await art.getAttribute("src")).endsWith(slug+".png"),"matching full-sized art in popup: "+slug);
          await page.locator("#gcatDialogClose").click();
        }
        await search.fill("");
      }
      await search.fill("표현언어");
      const expressive=page.locator('.gcat-card[data-album-cover="expressive-language"]');
      assert.equal(await expressive.count(),1,"art is reachable through an exact search on every page");
      await expressive.click();
      assert.equal(await dialog.evaluate(x=>x.open),true);
      assert((await page.locator(".gcat-inline-art-image").getAttribute("src")).endsWith("expressive-language.webp"),"matching language art visible in popup");
      await page.locator("#gcatDialogClose").click();
      await search.fill("");

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
      assert.equal(await page.locator("#gcatCount").textContent(),"32개","picture view still preserved");
      assert.equal(await cards.count(),6,"original album still uses six images per page");
      assert.equal(await paged.isVisible(),true,"album pagination still works");
      await page.locator('.gcat-tab[data-tab="cognitive"]').click();
      await page.evaluate(()=>scrollTo(0,280));
      await page.waitForTimeout(120);
      const sticky=await page.locator(".gcat-search-rail").evaluate(x=>({top:x.getBoundingClientRect().top,position:getComputedStyle(x).position,scroll:scrollY}));
      assert.equal(sticky.position,"sticky");
      if(sticky.scroll>100)assert(sticky.top>=-1&&sticky.top<140,"sticky search "+JSON.stringify(sticky));
      assert.deepEqual(errors,[],p.name+" has no JS errors");

      // 알아봄: the twelve practical situations, five relationship maps and three deep-linkable views.
      const journey=page.locator("#gcatJourneyNav");
      assert.equal(await journey.locator("button").count(),2,"two recognizable first-step options");
      assert.equal(await page.locator("#gcatTermPanel").isVisible(),true,"illustrated catalog remains fully accessible");
      await journey.locator('[data-view="situations"]').click();
      assert.equal(await page.locator("#gcatTermPanel").isVisible(),false,"term gallery hidden rather than destroyed");
      assert.equal(await page.locator("#gcatSituationPanel").isVisible(),true,"situation view directly available");
      assert.equal(await page.locator("#gcatSituationGrid .gcat-situation-card").count(),4,"start with four situations, not twelve");
      assert.equal(await page.locator("#gcatSituationGrid .gcat-topic-term").count(),8,"only two advanced terms per default situation");
      assert.equal(await page.locator("#gcatSituationGrid .gcat-situation-more[open]").count(),0,"no advanced terms displayed without user choice");
      await page.locator('#gcatSituationFilters button[data-group="all"]').click();
      assert.equal(await page.locator("#gcatSituationGrid .gcat-situation-card").count(),12,"all twelve practical situations available on demand");
      assert.equal(await page.locator("#gcatSituationGrid .gcat-primary-term").count(),12,"one clear deeper learning button per situation");
      assert.equal(await page.locator("#gcatSituationGrid .gcat-topic-term").count(),24,"two optional advanced links per situation");
      assert.equal(await page.locator("#gcatSituationGrid .gcat-scene").count(),12,"twelve familiar daily-life scenes");
      assert.equal(await page.locator("#gcatSituationGrid .gcat-situation-focus").count(),12,"twelve clear one-concept learning blocks");
      assert.equal(await page.locator("#gcatSituationGrid .gcat-why-link").count(),12,"concept link explained in all situations");
      assert.equal(await page.locator("#gcatSituationGrid .gcat-learning-reference").count(),12,"related research links directly available");
      const refLinks=await page.locator("#gcatSituationGrid .gcat-learning-reference").evaluateAll(els=>els.every(a=>a.href.startsWith("https://")&&a.target==="_blank"));
      assert.equal(refLinks,true,"trusted reference links are external and explicit");
      const cardColumns=await page.locator("#gcatSituationGrid .gcat-situation-card").evaluateAll(els=>new Set(els.map(e=>Math.round(e.getBoundingClientRect().left))).size);
      assert.equal(cardColumns,p.width<=650?1:2,"readable one/two-column situation cards");
      assert.equal(new URL(page.url()).searchParams.get("view"),"situations","situation view can be shared");
      for(const category of ["attention","memory","language","support"]){
        await page.locator('#gcatSituationFilters button[data-group="'+category+'"]').click();
        assert.equal(await page.locator("#gcatSituationGrid .gcat-situation-card").count(),3,"three examples for "+category);
      }
      await page.locator('#gcatSituationFilters button[data-group="all"]').click();
      const scenarioChip=page.locator("#gcatSituationGrid .gcat-primary-term").first();
      await scenarioChip.click();
      assert.equal(await dialog.evaluate(x=>x.open),true,"situation term opens the same original glossary explanation");
      assert((await page.locator("#gcatDialogBody .study-paper").textContent()).length>80,"one source of truth in situation links");
      await page.locator("#gcatDialogClose").click();
      // 심화 관계 지도는 첫 선택지가 아니라 용어를 확인한 뒤 찾을 수 있다.
      await journey.locator('[data-view="terms"]').click();
      await page.locator("#gcatOpenConnections").click();
      assert.equal(await page.locator("#gcatConnectionPanel").isVisible(),true,"connections shown in same page");
      assert.equal(await page.locator("#gcatConnectionFilters button").count(),5,"five curated topic maps");
      assert.equal(await page.locator("#gcatConnectionDetail .gcat-concept-node").count(),4,"four readable concept steps");
      assert.equal(new URL(page.url()).searchParams.get("view"),"connections","connection map has a shareable URL");
      for(const map of ["executive","memory","language","behavior","teaching"]){
        await page.locator('#gcatConnectionFilters button[data-map="'+map+'"]').click();
        assert.equal(await page.locator("#gcatConnectionDetail .gcat-concept-node").count(),4,"linked steps for "+map);
        assert.equal(await page.locator("#gcatConnectionDetail .gcat-concept-bridge").count(),0,"unfounded sequential arrows removed for "+map);
        assert.equal(await page.locator("#gcatConnectionDetail .gcat-concept-related-list .gcat-concept-node").count(),3,"three concepts compared against a central concept");
        assert.equal(await page.locator("#gcatConnectionDetail .gcat-concept-takeaway").count(),1,"short key point to remember");
        assert.equal(await page.locator("#gcatConnectionDetail .gcat-learning-reference").count(),1,"topic has expert source");
      }
      await page.locator('#gcatConnectionFilters button[data-map="behavior"]').click();
      assert((await page.locator("#gcatConnectionDetail").textContent()).includes("기록 하나만으로"),"limits of behavior data are stated in everyday language");
      await page.locator("#gcatConnectionDetail .gcat-concept-node").last().click();
      assert.equal(await dialog.evaluate(x=>x.open),true,"map node opens original term modal");
      await page.locator("#gcatDialogClose").click();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,"no horizontal overflow in connection view");
      await page.screenshot({path:path.join(folder,p.name+"-connection.png")});
      await page.goto(new URL("?view=situations",base).href,{waitUntil:"networkidle"});
      assert.equal(await page.locator("#gcatSituationPanel").isVisible(),true,"situation deep link loads correct mode");
      await page.goto(new URL("?view=connections",base).href,{waitUntil:"networkidle"});
      assert.equal(await page.locator("#gcatConnectionPanel").isVisible(),true,"connection deep link loads correct mode");
      await journey.locator('[data-view="terms"]').click();
      assert.equal(await page.locator("#gcatTermPanel").isVisible(),true,"original glossary mode restored");
      assert.equal(await page.locator(".study-note").count(),42,"no original note lost on view switching");
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,"no horizontal scrolling on final restored view");
      console.log(p.name+": PASS first-visit four-card learning, 2 entry buttons, one term per card, 32 art + 42 glossary, 12 situations, 5 maps, search and responsive");
      await page.close();
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});

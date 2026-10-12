const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
(async()=>{
  const browser=await chromium.launch({headless:true});
  const notes=process.env.GLOSSARY_QA_URL||"http://127.0.0.1:8765/notes/";
  const parents=new URL("../parents/",notes).href;
  const out=path.resolve("glossary-qa-screenshots");
  fs.mkdirSync(out,{recursive:true});
  const profiles=[{name:"mobile-small",width:360,height:780},{name:"mobile",width:390,height:844},{name:"tablet",width:768,height:1024},{name:"desktop",width:1440,height:900}];
  try{
    for(const prof of profiles){
      const page=await browser.newPage({viewport:{width:prof.width,height:prof.height},acceptDownloads:true});
      const errors=[];page.on("pageerror",e=>errors.push(e.message));
      let response=await page.goto(parents,{waitUntil:"networkidle",timeout:90000});
      assert.equal(response.status(),200,"찾아봄 접속 성공");
      assert.equal(await page.locator("#parentsObservationForm").count(),1);
      assert.equal(await page.locator(".parents-topic").count(),6,"기존 6개 상황 분야 유지");
      assert.equal(await page.locator(".parents-context").count(),6,"연령/환경별 맥락 6개");
      assert.equal(await page.locator(".parents-source").count(),6,"주제별 전문기관 참고 링크");
      assert.equal(await page.locator('.parents-topic a[href*="../notes/?from=parents"]').count(),5,"관련 개념은 정확한 용어로 연결");
      const hrefs=await page.locator('.parents-topic a[href*="../notes/?from=parents"]').evaluateAll(els=>els.map(el=>el.getAttribute("href")));
      assert(hrefs.every(h=>h.includes("#memo-")&&h.includes("&topic=")),"딥링크에 개념ID와 돌아갈 주제 포함");
      const sizes=await page.locator(".parents-topic p").evaluateAll(els=>els.map(el=>parseFloat(getComputedStyle(el).fontSize)));
      assert(sizes.every(x=>x>=14),"부모/청소년 모두 모바일 본문 최소 14px");
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,"찾아봄 가로 넘침 없음");
      const refs=await page.locator(".parents-source").evaluateAll(els=>els.every(a=>a.href.startsWith("https://")&&a.target==="_blank"&&a.rel.includes("noopener")));
      assert(refs,"근거는 공개된 전문기관 자료로 새 창 표시");
      await page.screenshot({path:path.join(out,prof.name+"-chajabom.png"),fullPage:true,timeout:25000});
      // 보호자: AAC 자료에서 바로 용어 설명을 열고, 다시 원래 관찰 상황으로 복귀.
      await page.locator('#speech .parents-topic-links a[href*="../notes/"]').click();
      await page.waitForURL(/\/notes\/\?from=parents&topic=speech#memo-aac/,{timeout:15000});
      assert.equal(await page.locator("#gcatDialog").evaluate(el=>el.open),true,"AAC 설명 자동 열기");
      assert.equal(await page.locator("#gcatDialogTitle").textContent(),"AAC");
      assert.equal(await page.locator(".gcat-parent-return").count(),1,"원래 찾아봄으로 돌아가기");
      assert.equal(await page.locator(".gcat-self-check").count(),1,"선택형 20초 이해 점검");
      await page.locator(".gcat-parent-return").click();
      assert(page.url().endsWith("/parents/#speech"),"원래 상황으로 돌아가기");
      assert.equal(await page.locator("#speech").count(),1);
      // 전문가: 정확한 관련 용어와 출처에서 상황 관찰로 이동.
      await page.goto(notes+"?view=terms#memo-fba",{waitUntil:"networkidle"});
      assert.equal(await page.locator("#gcatDialog").evaluate(el=>el.open),true,"전문가가 기존 공유 링크로 전문 개념 바로 열기");
      const parentLink=page.locator('#gcatDialogBody>.gcat-parent-link');
      assert.equal(await parentLink.count(),1);
      await parentLink.click();
      assert(page.url().endsWith("/parents/#emotion"),"FBA→감정·행동 직접 연결");
      // 메모를 별도로 파일로 저장하고 다시 불러오기. 서버·자동 브라우저 저장은 없다.
      await page.locator('[name="when"]').fill("2026-10-12 오후");
      await page.locator('[name="where"]').fill("학교 교실");
      await page.locator('[name="what"]').fill("쉬는 시간 뒤에 자리에 앉기 전에 두 번 질문함");
      await page.locator('[name="beforeAfter"]').fill("앞: 과제 안내 / 뒤: 짧게 재안내함");
      await page.locator('[name="strengthsQuestions"]').fill("혼자 자리로 이동함 / 어떤 안내가 도움이 될까");
      assert((await page.locator("#parentsSaveStatus").textContent()).includes("저장하세요"));
      const event=page.waitForEvent("download");
      await page.locator("#parentsSave").click();
      const download=await event;
      const filename=download.suggestedFilename();
      assert(filename.startsWith("찾아봄-관찰메모-")&&filename.endsWith(".json"));
      const buffer=fs.readFileSync(await download.path());
      const data=JSON.parse(buffer.toString("utf8"));
      assert.equal(data.format,"habom-observation");
      assert.equal(data.values.what,"쉬는 시간 뒤에 자리에 앉기 전에 두 번 질문함");
      assert((await page.locator("#parentsSaveStatus").textContent()).includes("다운로드"));
      // Load restores fields; values stay local and no network submission.
      await page.locator('[name="when"]').fill("");
      await page.locator('[name="where"]').fill("");
      await page.locator('[name="what"]').fill("");
      await page.locator('[name="beforeAfter"]').fill("");
      await page.locator('[name="strengthsQuestions"]').fill("");
      await page.locator("#parentsFile").setInputFiles({name:filename,mimeType:"application/json",buffer});
      assert.equal(await page.locator('[name="what"]').inputValue(),data.values.what,"파일 내용을 원상 복구");
      assert.equal(await page.locator('[name="strengthsQuestions"]').inputValue(),data.values.strengthsQuestions);
      await page.locator("#parentsFile").setInputFiles({name:"bad.json",mimeType:"application/json",buffer:Buffer.from('{"notMyMemo":true}')});
      assert((await page.locator("#parentsSaveStatus").textContent()).includes("형식의 파일이 아니에요"),"유효하지 않은 파일 거부");
      assert.equal(await page.locator('[name="what"]').inputValue(),data.values.what,"잘못된 파일로 기존 내용 덮어쓰지 않음");
      await page.evaluate(()=>{window.print=()=>{window.__printedByTest=true;};});
      await page.locator("#parentsPrint").click();
      assert.equal(await page.evaluate(()=>window.__printedByTest),true,"PDF 인쇄 버튼 유지");
      await page.emulateMedia({media:"print"});
      assert.equal(await page.locator("#parentsObservationForm").isVisible(),true,"인쇄 시 본문 보존");
      assert.equal(await page.locator(".parents-save-actions").isVisible(),false,"인쇄 시 저장 버튼 숨김");
      assert.equal(errors.length,0,"JS 오류 없음: "+errors.join("; "));
      console.log(prof.name+": PASS 6 situations, age contexts, source links, AAC/FBA deep links, memo JSON download+restore, invalid file, print, mobile text.");
      await page.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
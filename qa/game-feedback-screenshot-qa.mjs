import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const BASE=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
const paths=[
 ['/thinking-garden/?game=memory','기억꽃길 이어가기'],
 ['/thinking-garden/?game=resetRescue','꼬인 신호 구조대'],
 ['/thinking-garden/games/rescue/','모아 구조대'],
 ['/thinking-garden/games/hand-mirror/','모아의 마법 꽃밭'],
 ['/thinking-garden/games/moa-missions/?game=money','모아의 화폐 가게'],
 ['/thinking-garden/games/moa-missions/?game=change','바뀐 준비물 찾기'],
 ['/thinking-garden/games/moa-missions/?game=feel','마음 이야기 탐험'],
 ['/thinking-garden/games/rhythm-touch/','박자꽃 톡톡'],
 ['/thinking-garden/recorder/','리코더 마법정원'],
 ['/breath-garden/?mode=strength','바람의 힘'],
 ['/breath-garden/?mode=long','오래 후'],
 ['/breath-garden/?mode=beat','박자 바람']
];
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
let count=0;
try{
 for(const viewport of [{width:390,height:844},{width:1280,height:900}]){
  const context=await browser.newContext({viewport});
  await context.addInitScript(()=>{
   window.html2canvas=async(element,opts)=>{
    const doc=document.implementation.createHTMLDocument('synthetic');
    doc.body.innerHTML='<input value="아이 실명" id="testPrivateInput"><video id="testPrivateCamera"></video><p id="testPrivateText">연락처: 010-1234-5678</p>';
    opts.onclone(doc);
    window.__feedbackCaptureScrub={input:doc.querySelector('#testPrivateInput').style.visibility,camera:doc.querySelector('#testPrivateCamera').style.visibility,text:doc.querySelector('#testPrivateText').textContent};
    const cv=document.createElement('canvas');cv.width=180;cv.height=90;
    cv.getContext('2d').fillStyle='#53a974';cv.getContext('2d').fillRect(0,0,180,90);
    return cv;
   };
  });
  const page=await context.newPage();
  for(const [route,name] of paths){
   let payload=null,submitted=0;
   await page.route('https://miohovwmhmtcvkurjamm.supabase.co/functions/v1/moa-game-feedback',async r=>{
    submitted++;payload=JSON.parse(r.request().postData()||'{}');
    await r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,receipt:'test-only',hasScreenshot:!!payload.screenshot})});
   });
   const res=await page.goto(BASE+route,{waitUntil:'domcontentloaded',timeout:40000});
   assert.ok(res?.ok(),'Page response bad: '+route);
   const button=page.locator('#habomFeedbackLauncher');
   await button.waitFor({state:'visible',timeout:12000});
   const box=await button.boundingBox();assert.ok(box?.width>=44&&box?.height>=44,'Too small feedback button '+route);
   await button.click();
   await page.locator('#habomFeedbackV2Dialog').waitFor({state:'visible'});
   assert.ok((await page.locator('#habomFbContext').innerText()).includes(name),'Wrong game context '+route);
   const shotExpected=!route.includes('/hand-mirror/');
   if(shotExpected){
    await page.locator('#habomFbPreview').waitFor({state:'visible',timeout:8000});
   }else{
    await page.waitForTimeout(350);
    assert.equal(await page.locator('#habomFbPreview').isVisible(),false,'Camera snapshot must be disabled');
   }
   if(viewport.width===390&&route.includes('?game=memory')){
    const scrub=await page.evaluate(()=>window.__feedbackCaptureScrub);
    assert.equal(scrub.input,'hidden');
    assert.equal(scrub.camera,'hidden');
    assert.ok(scrub.text.includes('[개인정보 가림]'));
    assert.equal(await page.locator('#habomFeedbackAtFinish').count(),1);
   }
   const sendOne=viewport.width===390&&(route.includes('?game=memory')||route.includes('/hand-mirror/'));
   if(sendOne){
    await page.locator('input[name="habomFeedbackKind"][value="bug"]').check();
    await page.locator('#habomFbDetails').fill('버튼이 반응하지 않아요');
    await page.locator('#habomFbSubmit').click();
    if(shotExpected){
     assert.equal(submitted,0,'Unapproved screenshot should never transmit');
     assert.ok((await page.locator('#habomFbWarning').innerText()).includes('개인정보'));
     await page.locator('#habomFbReviewed').check();
     await page.locator('#habomFbSubmit').click();
    }
    await page.waitForFunction(()=>document.querySelector('#habomFeedbackV2').hidden===true,{timeout:6000});
    assert.equal(submitted,1,'Expected exactly one submission');
    assert.equal(payload.gameId,route.includes('hand-mirror')?'handMirror':'memory');
    assert.equal(payload.gameName,name);
    assert.equal(payload.kind,'bug');
    if(shotExpected)assert.ok(payload.screenshot.startsWith('data:image/jpeg;base64,'));
    else assert.equal(payload.screenshot,undefined,'Camera screen must not be uploaded');
    assert.equal(await page.locator('#habomFeedbackV2').isVisible(),false);
   }else{
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#habomFeedbackV2').isVisible(),false);
   }
   assert.equal(page.url(),BASE+route,'Reporting should preserve same game URL');
   count++;
  }
  await context.close();
 }
 console.log('PASS: '+count+' mobile/desktop feedback routes, safe client redaction, camera exclusion, screenshot consent, mock submission, and game return');
}finally{await browser.close()}

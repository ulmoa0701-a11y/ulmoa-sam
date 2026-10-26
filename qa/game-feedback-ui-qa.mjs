import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const BASE=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
const cases=[
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
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];
try{
 for(const vp of [{width:390,height:844},{width:1280,height:900}]){
  const ctx=await browser.newContext({viewport:vp});
  const page=await ctx.newPage();
  for(const [route,name] of cases){
   const res=await page.goto(BASE+route,{waitUntil:'domcontentloaded',timeout:35000});
   assert.ok(res?.ok(),'Failed HTTP '+route);
   const launcher=page.locator('#habomFeedbackLauncher');
   await launcher.waitFor({state:'visible',timeout:10000});
   const box=await launcher.boundingBox();assert.ok(box.height>=44,'Too small launcher '+route);
   await launcher.click();
   const dialog=page.locator('#habomFeedbackSheet');
   await dialog.waitFor({state:'visible'});
   assert.equal(await dialog.getAttribute('role'),'dialog');
   const url=new URL(await page.locator('#habomFeedbackFrame').getAttribute('src'));
   assert.equal(url.hostname,'form.jotform.com');
   assert.equal(url.searchParams.get('gameName'),name,'Incorrect game auto context '+route);
   assert.ok(await page.locator('#habomFeedbackExternal').getAttribute('href'));
   await page.keyboard.press('Escape');
   assert.equal(await page.locator('#habomFeedbackBackdrop').isVisible(),false,'Escape should close '+route);
   results.push({route,name,device:vp.width,formContext:name});
  }
  await ctx.close();
 }
 console.log('PASS: '+results.length+' accessible game-feedback launchers on mobile/desktop, linked to dedicated Jotform, title context and Escape close');
}finally{await browser.close()}

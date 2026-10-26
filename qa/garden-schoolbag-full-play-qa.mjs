// Complete schoolbag-change sessions using visible instructions and real button presses.
// No game state or answer key is injected; this is a browser regression test,
// not evidence of learning outcomes in children.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const names=['연필','공책','물병','지우개','사과','파일','풀','자','수첩','휴지','필통','가위','간식','모자','손수건'];
const setsEqual=(a,b)=>a.length===b.length&&new Set(a).size===a.length&&a.every(x=>b.includes(x));
function targetFromText(before,note,level){
 const after=[...before];
 if(level==='easy'){
  const old=before.find(x=>note.includes(x+' 대신 '));
  const fresh=names.find(x=>note.includes('대신 '+x+'을 챙기세요')||note.includes('대신 '+x+'를 챙기세요'));
  assert.ok(old&&fresh,'cannot parse easy instruction '+note);
  after.splice(after.indexOf(old),1,fresh);
 }else if(level==='normal'){
  const pieces=note.split(', ');
  assert.equal(pieces.length,2,'normal mode must explain both replacements');
  for(const piece of pieces){
   const old=before.find(x=>piece.startsWith(x+'은 ')||piece.startsWith(x+'는 '));
   const fresh=names.find(x=>piece.includes(' '+x+'으로')||piece.includes(' '+x+'로'));
   assert.ok(old&&fresh,'cannot parse normal instruction '+piece);
   after.splice(after.indexOf(old),1,fresh);
  }
 }else{
  const removed=before.find(x=>note.includes(x+'은 빼')||note.includes(x+'는 빼'));
  const added=names.find(x=>note.includes(x+'을 추가하세요')||note.includes(x+'를 추가하세요'));
  assert.ok(removed||added,'hard instruction not actionable '+note);
  if(removed)after.splice(after.indexOf(removed),1);
  if(added)after.push(added);
 }
 return after;
}
async function visibleItems(root){return root.locator('.item-chip b').allTextContents().then(x=>x.map(s=>s.trim()));}
const results=[];
try{
 for(const vp of [{label:'mobile',width:390,height:844},{label:'desktop',width:1280,height:900}]){
  const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},reducedMotion:'reduce'});
  const page=await context.newPage();page.setDefaultTimeout(12000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const level of ['easy','normal','hard']){
   await page.goto(base+'/thinking-garden/games/moa-missions/?game=change',{waitUntil:'domcontentloaded'});
   await page.locator('.level-card[data-level="'+level+'"]').click();
   await page.locator('#roundOptions [data-rounds="20"]').click();
   await page.locator('#startGame').click();
   const variety={add:0,remove:0,replace:0};
   for(let round=0;round<20;round++){
    const before=await visibleItems(page.locator('.bag-scene'));
    assert.ok(before.length>=3,'cannot see starting supplies '+level+'/'+round);
    await page.locator('[data-action="changed-go"]').click();
    const note=(await page.locator('.change-note strong').innerText()).trim();
    const expected=targetFromText(before,note,level);
    assert.equal(new Set(expected).size,expected.length,'duplicate items in expected bag '+note);
    if(level==='hard'){
     if(expected.length>before.length)variety.add++;
     else if(expected.length<before.length)variety.remove++;
     else variety.replace++;
    }
    const assembling=await page.locator('.inventory-options').count()>0;
    if(assembling){
     if(round===0){
      await page.locator('[data-action="check-list"]').click();
      assert.equal(await page.locator('[data-action="next"]').count(),0,'empty bag earned completion');
     }
     for(const item of expected){
      const control=page.locator('.inventory-options .item-pick').filter({has:page.locator('b', {hasText:item})});
      assert.equal(await control.count(),1,'missing available bag item '+item);
      await control.click();
     }
     assert.ok(setsEqual(await visibleItems(page.locator('.assembled-cart')),expected),'bag content differs from instruction');
     await page.locator('[data-action="check-list"]').click();
    }else{
     const options=page.locator('.list-choice');
     const amount=await options.count();assert.equal(amount,3,'three lists expected');
     let right=-1,wrong=-1;
     for(let i=0;i<amount;i++){
      const items=await visibleItems(options.nth(i));
      if(setsEqual(items,expected))right=i;else wrong=i;
     }
     assert.ok(right>=0&&wrong>=0,'no distinct right/wrong option '+note);
     if(round===0){
      await options.nth(wrong).click();
      assert.equal(await page.locator('[data-action="next"]').count(),0,'wrong list earned completion');
     }
     await options.nth(right).click();
    }
    await page.locator('[data-action="next"]').waitFor({state:'visible'});
    await page.locator('[data-action="next"]').click();
    if(round<19)assert.ok((await page.locator('#roundCount').textContent()).startsWith((round+2)+' / 20'),'round did not advance');
   }
   assert.equal(await page.locator('#resultScreen').isVisible(),true,'20-round session did not finish');
   const summary=await page.locator('#resultText').innerText();
   assert.ok(summary.includes('20개의 바뀐 준비물')&&summary.includes('첫 시도에 맞힌 문제 19개'),summary);
   if(level==='hard')assert.ok(variety.add>=2&&variety.remove>=2&&variety.replace>=2,'hard mode did not vary all three operations '+JSON.stringify(variety));
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert.ok(overflow<=8,'horizontal overflow '+vp.label+'/'+level+': '+overflow);
   results.push({device:vp.label,level,finished:20,firstTryCorrect:19,variety});
  }
  assert.deepEqual(errors,[],'script errors in '+vp.label);
  await context.close();
 }
}finally{await browser.close()}
console.log('PASS schoolbag actual full-play '+JSON.stringify({sessions:results.length,rounds:results.reduce((n,x)=>n+x.finished,0),results}));

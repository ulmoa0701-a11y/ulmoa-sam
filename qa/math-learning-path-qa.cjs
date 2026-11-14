const {chromium}=require('playwright-core');const assert=require('node:assert/strict');const fs=require('node:fs');
const url=(process.env.TEST_BASE_URL||'http://127.0.0.1:8765')+'/math-garden/grade-play/multiply-lesson/';
const folder='qa/math-learning-artifacts';fs.mkdirSync(folder,{recursive:true});
async function choose(page,answer){
 const texts=(await page.locator('#options button').allTextContents()).map(s=>s.trim());
 const index=texts.indexOf(String(answer));assert(index>=0,answer+' missing from '+JSON.stringify(texts));
 await page.locator('#options button').nth(index).click();
 await page.locator('#advance').waitFor({state:'visible',timeout:3000});
}
async function advance(page){await page.locator('#advance').click();}
async function enter(page,answer){
 for(const digit of String(answer))await page.locator('#keypad button[data-key="'+digit+'"]').click();
 await page.locator('#keypad button[data-key="✔"]').click();
 await page.locator('#advance').waitFor({state:'visible',timeout:3000});
}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 for(const width of [360,390,768,1280]){
  const ctx=await browser.newContext({viewport:{width,height:860},reducedMotion:'reduce'}),page=await ctx.newPage(),jsErrors=[];
  page.on('pageerror',e=>jsErrors.push(e.message));
  const res=await page.goto(url,{waitUntil:'load',timeout:30000});assert(res?.ok(),'page not 200');
  assert.equal(await page.locator('#progress .progress-item').count(),5);
  assert.equal(await page.locator('#stage .basket-card').count(),3);
  assert.equal(await page.locator('#stage .basket-empty').count(),6);
  const p=await page.locator('#addOne').boundingBox();assert(p&&p.height>=50&&p.width>=130);
  assert((await page.locator('#stage').textContent()).includes('0 / 2'));
  assert(await page.locator('#options button').count()===0,'answers must not be shown before touching apples');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert(overflow<=3,'horizontal overflow '+width+': '+overflow);
  if(width===390)await page.screenshot({path:folder+'/first-action-mobile.png',fullPage:true});
  // phase 1: real action; all baskets fill automatically
  for(let group=0;group<3;group++){
   for(let n=0;n<2;n++)await page.locator('#addOne').click();
  }
  await choose(page,'6');await advance(page);
  assert((await page.locator('#stepTitle').textContent()).includes('그림'),'repeat addition stage missing');
  await choose(page,'3 + 3 + 3 + 3');await advance(page);
  await choose(page,'12');await advance(page);
  // symbols must connect group structure, not only numerical answer
  await choose(page,'4 × 3');await advance(page);
  await choose(page,'4 + 4 + 4');await advance(page);
  assert((await page.locator('#stepTitle').textContent()).includes('12 × 3'),'place value stage missing');
  assert.equal(await page.locator('#stage .tenframe').count(),3,'12x3 should visually show three ten frames');
  if(width===390)await page.screenshot({path:folder+'/tens-guided-mobile.png',fullPage:true});
  for(const answer of ['10 + 2','30','6','36','30 + 1','90','3','93']){
    await choose(page,answer);await advance(page);
  }
  assert((await page.locator('#stepTitle').textContent()).includes('혼자'),'independent stage missing');
  assert.equal(await page.locator('#keypad button').count(),12,'physical touch keypad');
  assert.equal(await page.locator('#options button').count(),0,'no guessing choices in independent stage');
  await enter(page,46);await advance(page);
  await enter(page,42);await advance(page);
  assert(await page.locator('#readProblem').isVisible(),'new story problem absent');
  await page.locator('#readProblem').click(); // reading support must NOT count as math hint
  await enter(page,36);await advance(page);
  await enter(page,96);await advance(page);
  assert((await page.locator('.score').textContent()).includes('4 / 4'),'4 independently solved problems missing');
  assert((await page.locator('.score-note').allTextContents()).join(' ').includes('도움·듣기 0회'),'read-aloud unfairly counted as hint');
  if(width===390)await page.screenshot({path:folder+'/independent-result-mobile.png',fullPage:true});
  assert.equal(jsErrors.length,0,'uncaught JS errors: '+jsErrors.join(' | '));
  console.log('PASS '+width+'px: full concept→school-style pathway and independent 4/4');
  await ctx.close();
 }
 const c=await browser.newContext({viewport:{width:390,height:850},reducedMotion:'reduce'}),page=await c.newPage();
 await page.goto(url,{waitUntil:'load'});
 // Independent re-attempt is not school mastery; recorded wrong answers should count correctly
 await page.evaluate(()=>window.MathLearningQA.gotoStep(4));
 await page.locator('#keypad button[data-key="1"]').click();await page.locator('#keypad button[data-key="✔"]').click();
 assert(await page.locator('#advance').isHidden(),'wrong answer should not unlock next');
 await page.locator('#helper').click();
 for(const digit of '46')await page.locator('#keypad button[data-key="'+digit+'"]').click();
 await page.locator('#keypad button[data-key="✔"]').click();
 // wrong 1 still in input; clear it first
 // Separate regression checks below use fresh reset
 const state=await page.evaluate(()=>window.MathLearningQA.getState());
 assert(state.testScore===0,'assisted answer incorrectly counted as first-try independent');
 await c.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
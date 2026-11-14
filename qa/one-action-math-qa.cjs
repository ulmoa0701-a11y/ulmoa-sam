const {chromium}=require('playwright-core'),assert=require('node:assert/strict'),fs=require('node:fs');
const levels=[{each:2,friends:2,p:0,o:2,answer:4},{each:3,friends:2,p:0,o:3,answer:6},{each:4,friends:3,p:0,o:4,answer:12},{each:12,friends:3,p:1,o:2,answer:36},{each:31,friends:3,p:3,o:1,answer:93},{each:31,friends:9,p:3,o:1,answer:279},{each:42,friends:3,p:4,o:2,answer:126}];
const route=(process.env.TEST_BASE_URL||'http://127.0.0.1:8765')+'/math-garden/grade-play/concept-multiply/';
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const folder='qa/one-action-math-screens';fs.mkdirSync(folder,{recursive:true});
try{
for(const width of [360,390,768,1280]){
 const context=await browser.newContext({viewport:{width,height:820},reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(route,{waitUntil:'load',timeout:30000});
 assert.equal((await page.locator('#goalMath').textContent()).trim(),'2 × 2');
 assert.equal(await page.locator('#basketItems .slot').count(),2);
 assert.equal(await page.locator('#sourceApple .apple-svg').count(),1);
 assert.equal(await page.locator('#packSource').isVisible(),false);
 const b=await page.locator('#appleSource').boundingBox();assert(b&&b.width>=120&&b.height>=85);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 assert(overflow<=3,'width '+width+' overflows '+overflow+'px');
 await page.screenshot({path:folder+'/first-'+width+'.png',fullPage:true});
 for(const lv of (width===390?[0,1,2,3,4,5,6]:[0,5])){
  const d=levels[lv];
  await page.goto(route+'?stage='+lv,{waitUntil:'load'});
  assert.equal(await page.locator('#friendTrack .friend-step').count(),d.friends);
  if(d.p)assert.equal(await page.locator('#sourcePack .tenframe .apple-svg').count(),10);
  for(let k=0;k<d.friends;k++){
   for(let x=0;x<d.p;x++)await page.locator('#packSource').click();
   for(let x=0;x<d.o;x++)await page.locator('#appleSource').click();
   assert.equal((await page.locator('#targetCount').textContent()).trim(),d.each+' / '+d.each);
   if(d.p)assert.equal(await page.locator('#basketItems .tenframe:not(.ghost) .apple-svg').count(),d.p*10);
   if(k<d.friends-1){
    await page.waitForFunction(i=>document.querySelectorAll('#friendTrack .friend-step.done').length===i+1,k,{timeout:3000});
    assert.equal((await page.locator('#targetCount').textContent()).trim(),'0 / '+d.each);
   }else await page.locator('#countScreen').waitFor({state:'visible',timeout:3500});
  }
  assert.equal(await page.locator('#collectedFriends .collected-basket').count(),d.friends);
  const options=(await page.locator('#choiceGrid button.choice').allTextContents()).map(x=>x.trim());
  const wrong=options.findIndex(x=>x!==String(d.answer));
  await page.locator('#choiceGrid button.choice').nth(wrong).click();
  assert.equal(await page.locator('#winScreen').isVisible(),false);
  await page.locator('#choiceGrid button.choice').nth(options.indexOf(String(d.answer))).click();
  await page.locator('#winScreen').waitFor({state:'visible',timeout:3500});
  assert((await page.locator('#winEquation').textContent()).includes(String(d.answer)));
  if(width===390&&lv===5)await page.screenshot({path:folder+'/large-result.png',fullPage:true});
  console.log('PASS '+width+'px: '+d.each+' × '+d.friends);
 }
 assert.equal(errors.length,0,'page errors: '+errors.join('; '));
 await context.close();
}
const ctx=await browser.newContext({viewport:{width:390,height:840},reducedMotion:'reduce'}),page=await ctx.newPage();
await page.goto(route+'?stage=3',{waitUntil:'load'});
await page.screenshot({path:folder+'/tens-before.png',fullPage:true});
await page.locator('#packSource').click();
assert.equal(await page.locator('#basketItems .tenframe:not(.ghost) .apple-svg').count(),10);
await page.screenshot({path:folder+'/tens-after.png',fullPage:true});
await ctx.close();
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
'use strict';
const {chromium}=require('playwright-core'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
const base='http://127.0.0.1:8765/thinking-garden/';
const dir='qa/practice-session-screenshots';fs.mkdirSync(dir,{recursive:true});
const ids=['memory','sameShape','flower','hide','path','calm','inside','targets','paint','water','slowScan','slowPlace','slowBlock','slowName','slowMemory','slowEveryday','resetRescue','classroomMove','festivalPlan','rulePost','mirrorPond','sceneDetect'];
for(const size of [{label:'mobile',width:390,height:844},{label:'desktop',width:1280,height:900}]){
const page=await browser.newPage({viewport:{width:size.width,height:size.height}});page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto(base,{waitUntil:'load'});assert.equal(await page.locator('.library-card').count(),25);
for(const id of ids){
await page.evaluate(x=>openPreview(x),id);
assert.equal(await page.locator('#extendedPracticeControls:visible').count(),1,id+' selector missing');
const count=id==='slowName'?24:20;await page.locator('#sessionRounds').selectOption(String(count));
await page.locator('#introStart').click();assert.equal(await page.locator('#stageLabel').innerText(),'1 / '+count);
let start='';
for(let i=1;i<=count;i++){
if(i===1)start=await page.locator('#gameArea').innerText();
if(i===6&&['slowName','festivalPlan','mirrorPond'].includes(id))assert.notEqual(start,await page.locator('#gameArea').innerText(),id+' repeated identical content');
await page.evaluate(()=>nextRound(0));
if(i===count){await page.locator('#resultScreen.active').waitFor();assert.ok((await page.locator('.practice-result-summary').innerText()).includes(count+'문제'));}
else if(i%5===0){await page.locator('#practiceContinue').waitFor();if(id==='festivalPlan'&&i===5)await page.screenshot({path:dir+'/'+size.label+'-break.png'});await page.locator('#practiceContinue').click();await page.waitForFunction(n=>document.querySelector('#stageLabel')?.textContent.trim()===n,(i+1)+' / '+count);}
else await page.waitForFunction(n=>document.querySelector('#stageLabel')?.textContent.trim()===n,(i+1)+' / '+count);
}
if(['slowScan','mirrorPond','festivalPlan'].includes(id))await page.screenshot({path:dir+'/'+size.label+'-'+id+'.png'});
await page.locator('#resultScreen [data-go=home]').click();
}
assert.deepEqual(errors,[],size.label+' errors');await page.close();
}
await browser.close();console.log('PASS 22 native games 20-24 stages mobile and desktop');
})().catch(e=>{console.error(e);process.exit(1)});
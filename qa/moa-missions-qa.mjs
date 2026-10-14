import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
const failures=[];
const verify=(condition,msg)=>{if(!condition)failures.push(msg)};
const base='http://127.0.0.1:8765';
const artifactDir='qa/moa-missions-artifacts';
fs.mkdirSync(artifactDir,{recursive:true});
async function testGame(game,width,level){
 const ctx=await browser.newContext({viewport:{width,height:width<=500?844:900},reducedMotion:'reduce'});
 const page=await ctx.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  const response=await page.goto(base+'/thinking-garden/games/moa-missions/?game='+game,{waitUntil:'domcontentloaded',timeout:25000});
  verify(response?.ok(),game+' failed HTTP');
  verify((await page.locator('#gameTitle').textContent()).length>5,game+' title missing');
  verify(await page.locator('.level-card').count()===3,game+' level buttons missing');
  await page.locator('.level-card[data-level="'+level+'"]').click();
  verify(await page.locator('.level-card[data-level="'+level+'"]').getAttribute('aria-pressed')==='true',game+' level is not selectable');
  await page.locator('#startGame').click();
  verify(await page.locator('#playScreen').isVisible(),game+' not started');
  if(game==='money'){
   if(level==='easy'){
    const amounts=[100,500,1000,5000];
    for(let i=0;i<4;i++){await page.locator('.choice[data-value="'+amounts[i]+'"]').click();verify(await page.locator('[data-action="next"]').count()===1,'money easy next missing, step '+i);await page.locator('[data-action="next"]').click();}
    verify(await page.locator('#resultScreen').isVisible(),'money easy did not finish');
   }else{
    const count=await page.locator('.money-pick[data-money="100"]').count();
    verify(count===1,'money add 100 button missing');
    await page.locator('[data-action="check"]').click();
    verify((await page.locator('#feedback').textContent()).includes('부족해요'),'money empty cart hint missing');
    const target=Number((await page.locator('.money-target strong').textContent()).replace(/[^0-9]/g,''));
    let remaining=target;
    for(const n of [1000,500,100])while(remaining>=n){await page.locator('.money-pick[data-money="'+n+'"]').click();remaining-=n;}
    await page.locator('[data-action="check"]').click();
    verify(await page.locator('[data-action="next"]').count()===1,'money correct amount not accepted');
   }
  }
  if(game==='change'){
    verify((await page.locator('.bag-scene').textContent()).includes('공책'),'changed easy original bag missing');
    await page.locator('[data-action="changed-go"]').click();
    verify(await page.locator('.list-choice').count()===3,'changed option count');
    await page.locator('[data-action="changed-back"]').click();
    verify(await page.locator('.bag-scene').isVisible(),'changed list cannot review the original');
    await page.locator('[data-action="changed-go"]').click();
    const matching=page.locator('.list-choice').filter({hasText:'지우개'}).filter({hasText:'물병'});
    verify(await matching.count()===1,'changed correct choice ambiguous');
    if(await matching.count()===1){await matching.click();verify(await page.locator('[data-action="next"]').count()===1,'changed correct result missing');}
  }
  if(game==='feel'){
    verify(await page.locator('.emotion-options .choice').count()===3,'feel emotion options missing');
    await page.locator('.emotion-options .choice').first().click();
    verify(await page.locator('.response-options .choice').count()===3,'feel response options missing');
    await page.locator('.response-options .choice').first().click();
    verify(await page.locator('.reflect-note').isVisible(),'feel reflective response missing');
    verify((await page.locator('#missionDescription').textContent()).includes('정답이 하나로'),'feel options should not be presented as one right answer');
    verify(await page.locator('[data-action="next"]').count()===1,'feel next not available');
    await page.locator('[data-action="next"]').click();
    verify((await page.locator('#roundCount').textContent()).includes('2 / 4'),'feel second round not reached');
  }
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  verify(overflow<=3,game+' '+width+'px horizontal overflow '+overflow);
  await page.screenshot({path:path.join(artifactDir,game+'-'+level+'-'+width+'.png'),fullPage:true});
  verify(errors.length===0,game+' script errors: '+errors.join('; '));
 }catch(e){failures.push(game+' '+width+' '+level+' interaction exception: '+String(e).slice(0,400));}
 finally{await ctx.close();}
}
await testGame('money',390,'easy');
await testGame('money',390,'normal');
await testGame('money',390,'hard');
await testGame('change',390,'easy');
await testGame('feel',390,'easy');
await testGame('money',1366,'easy');
await testGame('change',1366,'easy');
await testGame('feel',1366,'easy');
const ctx=await browser.newContext({viewport:{width:390,height:844}});
const portal=await ctx.newPage();
await portal.goto(base+'/gardens/',{waitUntil:'domcontentloaded'});
for(const [garden,game] of [['learning','money'],['cognitive','change'],['heart','feel']]){
 const links=portal.locator('#'+garden+' a.play-card[href*="game='+game+'"]');
 verify(await links.count()===1,'garden card missing or duplicated '+garden+' '+game);
}
await ctx.close();
await browser.close();
fs.writeFileSync(path.join(artifactDir,'report.json'),JSON.stringify({failures},null,2));
if(failures.length){console.error('MOA MISSIONS QA FAIL:',JSON.stringify(failures));process.exit(1)}
console.log('PASS: money 3 difficulty levels, four easy rounds and checkout, updated list review/answer, emotion/response reflection, 390px and 1366px layouts and garden links');

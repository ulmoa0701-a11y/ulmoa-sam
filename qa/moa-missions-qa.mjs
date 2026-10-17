import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
const failures=[];
const verify=(condition,msg)=>{if(!condition)failures.push(msg)};
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
const artifactDir='qa/moa-missions-artifacts';
fs.mkdirSync(artifactDir,{recursive:true});
async function testGame(game,width,level){
 const ctx=await browser.newContext({viewport:{width,height:width<=500?844:900},reducedMotion:'reduce'});
 const page=await ctx.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  const response=await page.goto(base+'/thinking-garden/games/moa-missions/?game='+game,{waitUntil:'domcontentloaded',timeout:25000});
  verify(response?.ok(),game+' failed HTTP');
  verify((await page.locator('#gameTitle').textContent()).includes(({money:'화폐',change:'준비물',feel:'마음'})[game]),game+' selected game title mismatched query');
  verify(await page.locator('.level-card').count()===3,game+' level buttons missing');
  await page.locator('.level-card[data-level="'+level+'"]').click();
  verify(await page.locator('.level-card[data-level="'+level+'"]').getAttribute('aria-pressed')==='true',game+' level is not selectable');
  await page.locator('#roundOptions [data-rounds="6"]').click();
  verify(await page.locator('#roundOptions [data-rounds="6"]').getAttribute('aria-pressed')==='true',game+' 6-round option not selected');
  await page.locator('#startGame').click();
  verify(await page.locator('#playScreen').isVisible(),game+' not started');
  if(game==='money'){
   if(level==='easy'){
    const amounts=[100,500,1000,5000,300,600];
    for(let i=0;i<6;i++){await page.locator('.choice[data-value="'+amounts[i]+'"]').click();verify(await page.locator('[data-action="next"]').count()===1,'money easy next missing, step '+i);await page.locator('[data-action="next"]').click();}
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
    verify((await page.locator('#roundCount').textContent()).includes('2 / 6'),'feel second round not reached');
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
 const card=portal.locator('#'+garden+' .play-card-enhanced[data-game="'+game+'"]');
 const links=card.locator('a.play-start-btn[href*="game='+game+'"]');
 verify(await card.count()===1&&await links.count()===1,'garden card or launch link missing/duplicated '+garden+' '+game);
}
await ctx.close();

/* A whole long session must actually have varied content, not four screens replayed. */
async function longFeel(level,width,rounds){
 const ctx=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/thinking-garden/games/moa-missions/?game=feel',{waitUntil:'domcontentloaded',timeout:25000});
  await page.locator('.level-card[data-level="'+level+'"]').click();
  await page.locator('#roundOptions [data-rounds="'+rounds+'"]').click();
  await page.locator('#startGame').click();
  const seen=[];
  for(let i=0;i<rounds;i++){
   verify(await page.locator('.emotion-options .choice').count()===3,'long feel options missing at '+i);
   seen.push((await page.locator('.story-card p').first().textContent()).trim());
   await page.locator('.emotion-options .choice').first().click();
   await page.locator('.response-options .choice').nth(i%3).click();
   verify(await page.locator('.reflect-note').isVisible(),'reflection missing at '+i);
   await page.locator('[data-action="next"]').click();
   if(i===3)verify((await page.locator('#seedCount').textContent()).includes('1송이'),'flower milestone not earned');
  }
  verify(await page.locator('#resultScreen').isVisible(),'20 feel rounds did not end');
  verify(new Set(seen).size===rounds,'emotion scenarios repeated too quickly '+new Set(seen).size+'/'+rounds);
  verify(errors.length===0,'long feel errors '+errors.join('; '));
  verify((await page.locator('#resultText').textContent()).includes(rounds+'가지'),'emotion count incorrect');
 }catch(e){failures.push('long feel '+level+' '+width+' '+String(e).slice(0,500))}
 finally{await ctx.close()}
}
async function longMoney(level,width,rounds){
 const ctx=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/thinking-garden/games/moa-missions/?game=money',{waitUntil:'domcontentloaded',timeout:25000});
  await page.locator('.level-card[data-level="'+level+'"]').click();
  await page.locator('#roundOptions [data-rounds="'+rounds+'"]').click();
  await page.locator('#startGame').click();
  const prices=[];
  for(let i=0;i<rounds;i++){
   const target=Number((await page.locator('.money-target strong').textContent()).replace(/[^0-9]/g,''));
   prices.push(target);
   let remaining=target;
   for(const n of [5000,1000,500,100])while(remaining>=n){await page.locator('.money-pick[data-money="'+n+'"]').click();remaining-=n}
   verify(remaining===0,'unpayable amount '+target);
   await page.locator('[data-action="check"]').click();
   verify(await page.locator('[data-action="next"]').count()===1,'long money next button missing '+i);
   await page.locator('[data-action="next"]').click();
  }
  verify(await page.locator('#resultScreen').isVisible(),'long money session not completed');
  verify(new Set(prices).size>=Math.min(rounds,11),'long money not varied '+new Set(prices).size);
  verify(errors.length===0,'long money JS errors '+errors.join('; '));
 }catch(e){failures.push('long money '+level+' '+width+' '+String(e).slice(0,550));}
 finally{await ctx.close()}
}
await longFeel('easy',390,20);
await longFeel('normal',390,20);
await longFeel('hard',1366,20);
await longMoney('normal',390,12);
await longMoney('hard',390,20);
await browser.close();
fs.writeFileSync(path.join(artifactDir,'report.json'),JSON.stringify({failures},null,2));
if(failures.length){console.error('MOA MISSIONS QA FAIL:',JSON.stringify(failures));process.exit(1)}
console.log('PASS: money / memory / emotion gameplay at 6, 12 and 20 missions, unique emotion episodes, hard-mode change-making, mobile and desktop layouts');

'use strict';
// Simulated caregiver/learner *workflows*, not observations of actual minors.
// Each persona is a set of accessibility/use-case constraints, not a diagnosis.
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base='http://127.0.0.1:8765/thinking-garden/';
function plan(items,{view='garden',level=1,rounds=5,settings={}}={}){
 const body={v:2,items,level,rounds,settings,view};
 return base+'?plan='+Buffer.from(JSON.stringify(body),'utf8').toString('base64url');
}
const personas=[
 {name:'preschool-nonreader',width:390,items:['sameShape','flower'],view:'garden',need:['moa-assigned-visual','moa-assigned-start']},
 {name:'young-limited-speech',width:320,items:['slowName','slowPdf'],view:'garden',need:['moa-assigned-visual','moa-assigned-start']},
 {name:'attention-short-practice',width:390,items:['calm','memory'],view:'garden',need:['moa-assigned-home-help']},
 {name:'anxiety-slow-recheck',width:390,items:['memory'],view:'garden',need:['moa-assigned-home-help']},
 {name:'teen-learning',width:390,items:['spacing','spelling'],view:'calm',need:['moa-assigned-visual']},
 {name:'teen-planning',width:1280,items:['classroomMove','festivalPlan'],view:'calm',need:['moa-assigned-visual']},
 {name:'older-motor-keyboard',width:1024,items:['sameShape','slowBlock'],view:'calm',need:['moa-assigned-start']},
 {name:'caregiver-pdf-only',width:390,items:['slowPdf'],view:'garden',need:['moa-assigned-home-help']}
];
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const dir='qa/curated-share-screenshots';fs.mkdirSync(dir,{recursive:true});
 try{
  for(const spec of personas){
   const page=await browser.newPage({viewport:{width:spec.width,height:844}});
   page.setDefaultTimeout(12000);const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(plan(spec.items,{view:spec.view}),{waitUntil:'load'});
   assert.equal(await page.locator('#moaAssignedHome').count(),1,spec.name+' missing homework menu');
   assert.equal(await page.locator('.moa-assigned-item').count(),spec.items.length,spec.name+' list count');
   assert.equal(await page.locator('#gardenGamePanel:visible').count(),0,spec.name+' exposed all games');
   assert.equal(await page.locator('#moaAssignedHome .moa-assigned-home-help').count(),1,'homework guide absent');
   assert.ok((await page.locator('.moa-assigned-home-help').textContent()).includes('결과는 선생님에게 자동으로 전송되지'),'misleading result delivery');
   assert.ok((await page.locator('.moa-assigned-foot').innerText()).includes('새로고침'),'progress persistence caveat missing');
   for(const key of spec.need)assert.ok(await page.locator('#moaAssignedHome .'+key).count()>0,spec.name+' missing '+key);
   assert.equal(await page.locator('body.moa-assigned-calm').count(),spec.view==='calm'?1:0,spec.name+' wrong neutral style');
   if(spec.view==='calm')assert.equal((await page.locator('.moa-assigned-hero h1').innerText()),'나에게 필요한 활동',spec.name+' juvenile title');
   assert.ok(await page.locator('.moa-assigned-hero').isVisible());
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+4);
   assert.equal(overflow,false,spec.name+' horizontal overflow');
   await page.locator('.moa-assigned-home-help summary').click();
   assert.ok(await page.locator('.moa-assigned-home-help-body').isVisible());
   await page.screenshot({path:dir+'/homework-'+spec.name+'.png',fullPage:true});
   const first=spec.items[0];
   await page.locator('.moa-assigned-item').first().locator('button.moa-assigned-start').click();
   if(first==='slowPdf'){
    assert.equal(await page.locator('#moaAssignedEmbed').count(),1,'PDF should open inside selected-only homework');
    await page.locator('#moaAssignedEmbed .moa-assigned-exit').click();
   }else{
    assert.equal(await page.locator('#introScreen.active').count(),1,spec.name+' missing preview');
    if(first==='slowName'){
     await page.locator('#slowTeacherDetails summary').click();
     await page.locator('#slowResponse').selectOption('point');
     assert.equal(await page.locator('#slowResponse').inputValue(),'point','limited speech pointing choice unavailable');
    }
    await page.locator('#introStart').click();
    assert.equal(await page.locator('#gameScreen.active').count(),1,spec.name+' did not enter game');
    await page.locator('#backHome').click();
   }
   assert.equal(await page.locator('#moaAssignedHome').count(),1,spec.name+' no homework return');
   assert.equal(await page.locator('.moa-assigned-item').count(),spec.items.length,spec.name+' unrelated activities appeared');
   assert.deepEqual(errors,[],spec.name+' browser errors');
   console.log('PASS persona '+spec.name+' | '+spec.items.length+' assigned activities');
   await page.close();
  }
  // Home task: no forced second game, child can close and reopen same anonymous link.
  const child=await browser.newPage({viewport:{width:390,height:844}});
  const home=plan(['memory','slowPdf'],{view:'garden',rounds:10});
  await child.goto(home,{waitUntil:'load'});
  await child.locator('.moa-assigned-item').first().locator('button').click();
  await child.locator('#introStart').click();
  await child.locator('.memory-ready').click();
  await child.locator('.memory-peek').click();
  await child.waitForTimeout(2100);
  assert.equal(await child.locator('.memory-choices.paused').count(),1,'review should not auto-expire');
  await child.locator('.memory-peek').click();
  assert.equal(await child.locator('.memory-choices.paused').count(),0,'choices did not unlock after child finishes looking');
  await child.locator('#backHome').click();
  await child.reload({waitUntil:'load'});
  assert.equal(await child.locator('.moa-assigned-item').count(),2,'link should reopen after reload');
  assert.equal(await child.locator('.moa-assigned-progress').count(),0,'do not fake saved homework completion');
  await child.close();
  // Builder semantics: teacher changes view but never puts personal data in the link.
  const teacher=await browser.newPage();
  await teacher.goto(base,{waitUntil:'load'});await teacher.locator('#moaPlannerLaunch').click();
  for(const id of ['slowName','festivalPlan'])await teacher.locator('#moaPlanSelection input[value="'+id+'"]').check();
  await teacher.locator('#moaPlanView').selectOption('calm');
  await teacher.locator('.moa-plan-create').click();
  const generated=await teacher.locator('#moaPlanLink').inputValue();
  assert.ok(generated.startsWith(base+'?plan='));
  assert.ok(!generated.includes('name=')&&!generated.includes('diagnosis='));
  const recipient=await browser.newPage();
  await recipient.goto(generated,{waitUntil:'load'});
  assert.equal(await recipient.locator('body.moa-assigned-calm').count(),1,'teacher display setting lost in link');
  await recipient.locator('.moa-assigned-editor summary').click();
  await recipient.locator('.moa-assigned-editor button').click();
  assert.equal(await recipient.locator('#moaPlanView').inputValue(),'calm','editing did not preserve neutral layout');
  await recipient.close();await teacher.close();
  console.log('PASS learner/homework journeys: eight simulated personas, child-paced review, reload, quiet view and editable link');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

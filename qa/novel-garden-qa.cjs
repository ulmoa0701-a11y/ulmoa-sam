'use strict';
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
 const base=process.env.NOVEL_GARDEN_BASE||'http://127.0.0.1:8765/thinking-garden/';
 const out='qa/novel-garden-screenshots';fs.mkdirSync(out,{recursive:true});
 const modes=['rulePost','mirrorPond','sceneDetect'],cats=['memory','space','visual'];
 for(const vp of [{label:'mobile',width:390,height:844},{label:'desktop',width:1280,height:900}]){
   const page=await browser.newPage({viewport:vp,deviceScaleFactor:1});page.setDefaultTimeout(12000);
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.goto(base,{waitUntil:'load'});
   assert.equal(await page.locator('#gardenGamePanel .library-card').count(),25,'25 independently accessible games');
   assert.equal(await page.locator('button.library-card[data-open^="slow"]').count(),6,'six original newer games retained');
   for(let m=0;m<modes.length;m++){
     const id=modes[m];
     await page.locator('.category-tab[data-category="'+cats[m]+'"]').click();
     const card=page.locator('button.library-card[data-open="'+id+'"]');
     assert.ok(await card.isVisible(),id+' card');
     assert.equal(await card.locator('.card-live-preview').count(),1,id+' unique preview');
     await card.click();
     assert.equal(await page.locator('#introScreen.active').count(),1,'native game intro '+id);
     assert.equal(await page.locator('#slowLookControls:visible').count(),1,'supports configuration');
     await page.screenshot({path:out+'/'+vp.label+'-'+id+'-intro.png'});
     if(vp.label==='desktop')await page.locator('#slowLevel').selectOption('3');
     await page.locator('#introStart').click();
     assert.equal(await page.locator('#gameScreen.active').count(),1,'native game screen '+id);
     assert.ok(page.url().endsWith('/thinking-garden/'),'must not navigate out of site');
     for(let round=0;round<5;round++){
       await page.locator('#gameArea .novel-quest').waitFor();
       if(id==='rulePost'){
         for(let parcel=0;parcel<3;parcel++){
           await page.waitForFunction(k=>document.querySelector('.novel-post-progress')?.textContent.includes('소포 '+k+' /'),parcel);
           const rule=await page.locator('.novel-rule-banner strong').innerText();
           const parcelStyle=await page.locator('.novel-parcel').getAttribute('style');
           const emblem=await page.locator('.novel-post-shape').innerText();
           const correct=rule.includes('색깔')?(parcelStyle.includes('#f7cf67')?0:1):(emblem.includes('⭐')?0:1);
           if(round===0&&parcel===0){
             await page.locator('.novel-mailbox[data-idx="'+(1-correct)+'"]').click();
             assert.ok(await page.locator('.novel-recovery').isVisible(),'wrong delivery needs recovery prompt');
             await page.locator('[data-novel-action=pause]').click();
           }
           await page.locator('.novel-mailbox[data-idx="'+correct+'"]').click();
         }
       }else if(id==='mirrorPond'){
         const rule=await page.locator('.novel-rule-banner strong').innerText();
         const source=await page.locator('.novel-mirror-scene .novel-pad').allTextContents();
         let target=rule.includes('좌우')?[source[1],source[0],source[3],source[2]]:rule.includes('위아래')?[source[2],source[3],source[0],source[1]]:[source[3],source[2],source[1],source[0]];
         const options=await page.locator('.novel-pond-choices>button').count();let correct=-1,wrong=-1;
         for(let j=0;j<options;j++){const icons=await page.locator('.novel-pond-choices>button').nth(j).locator('.novel-pad').allTextContents();
           if(icons.join('')===target.join(''))correct=j;else wrong=j;}
         assert.ok(correct>=0,'correct mirror exists for '+rule);
         if(round===0){await page.locator('.novel-pond-choices>button').nth(wrong).click();assert.ok(await page.locator('.novel-recovery').isVisible());await page.locator('[data-novel-action=pause]').click();}
         await page.locator('.novel-pond-choices>button').nth(correct).click();
       }else{
         const before=await page.locator('.novel-story-object').allTextContents();
         await page.locator('[data-novel-action=reveal]').click();
         const after=await page.locator('.novel-story-object').allTextContents();
         const target=after.findIndex((x,i)=>x!==before[i]);
         assert.ok(target>=0,'changed item should exist');
         if(round===0){
           const wrong=(target+1)%after.length;
           await page.locator('[data-novel-action=change][data-idx="'+wrong+'"]').click();
           assert.ok(await page.locator('.novel-recovery').isVisible());
           await page.locator('[data-novel-action=pause]').click();
           await page.locator('[data-novel-action=peek]').click();
           assert.ok(await page.locator('[data-novel-action=back]').isVisible());
           await page.locator('[data-novel-action=back]').click();
         }
         await page.locator('[data-novel-action=change][data-idx="'+target+'"]').click();
       }
       assert.ok(await page.locator('.novel-main-button[data-novel-action=next]').isVisible(),id+' round completion '+round);
       if(round===0)await page.screenshot({path:out+'/'+vp.label+'-'+id+'-mission.png',fullPage:true});
       await page.locator('.novel-main-button[data-novel-action=next]').click();
       if(round===4)await page.locator('#resultScreen.active').waitFor();
       else await page.waitForFunction(expected=>document.querySelector('#stageLabel')?.textContent.trim()===expected,(round+2)+' / 5');
     }
     assert.ok(await page.locator('.novel-results').isVisible(),id+' custom session report');
     assert.ok((await page.locator('.novel-result-lead').innerText()).includes('5/5'),'all five corrected');
     await page.screenshot({path:out+'/'+vp.label+'-'+id+'-results.png'});
     await page.locator('#resultScreen [data-go=home]').click();
     assert.equal(await page.locator('#homeScreen.active').count(),1);
   }
   assert.deepEqual(errors,[],vp.label+' page JS errors');
   await page.close();
 }

 for(const vp of [{label:'mobile',width:390,height:844},{label:'desktop',width:1280,height:900}]){
  const page=await browser.newPage({viewport:{width:vp.width,height:vp.height}});page.setDefaultTimeout(10000);
  await page.goto(base,{waitUntil:'load'});
  for(const [filter,n] of [['story',6],['basic',19],['all',25]]){
    await page.locator('[data-experience-filter="'+filter+'"]').click();
    assert.equal(await page.locator('#gardenGamePanel .library-card:visible').count(),n);
  }
  for(const id of ['resetRescue','classroomMove','festivalPlan']){
    const category=id==='classroomMove'?'life':'memory';
    await page.locator('.category-tab[data-category="'+category+'"]').click();
    await page.locator('[data-open="'+id+'"]').click();
    assert.equal(await page.locator('#strategyAutoGroup:visible').count(),1);
    await page.locator('#slowLevel').selectOption(vp.label==='desktop'?'3':'1');
    await page.locator('#introStart').click();
    assert.equal(await page.locator('#gameScreen.active').count(),1);
    for(let k=0;k<5;k++){
      let r=await page.evaluate(()=>state.strategy.r);
      if(id==='resetRescue'){
        if(r.suggested===r.target)await page.locator('[data-rec=trust]').click();
        else{
          if(k===1){await page.locator('[data-rec=trust]').click();await page.locator('[data-rec=recover]').click();}
          else await page.locator('[data-rec=question]').click();
          await page.locator('[data-rec=pick][data-id="'+r.target+'"]').click();
        }
      }else if(id==='classroomMove'){
        for(let j=0;j<r.tasks.length;j++){
          r=await page.evaluate(()=>state.strategy.r);
          const t=r.tasks[r.step];
          await page.locator('[data-room=item][data-i="'+t.item+'"]').click();
          if(k===0&&j===0){
            const wrong=[0,1,2,3,5,6,7,8].find(x=>x!==t.pos);
            await page.locator('[data-room=pos][data-i="'+wrong+'"]').click();
            await page.locator('[data-room=check]').click();
            assert.ok(await page.locator('.strategy-reset').isVisible());
            await page.locator('[data-room=recover]').click();
          }
          await page.locator('[data-room=pos][data-i="'+t.pos+'"]').click();
          await page.locator('[data-room=check]').click();
        }
      }else{
        const n=r.tasks.length;
        if(k===0){
          for(const x of [2,0,1,3].slice(0,n))await page.locator('[data-plan=choose][data-i="'+x+'"]').click();
          await page.locator('[data-plan=check]').click();
          assert.ok(await page.locator('.strategy-reset').isVisible());
          await page.locator('[data-plan=recover]').click();
        }
        for(let j=0;j<n;j++)await page.locator('[data-plan=choose][data-i="'+j+'"]').click();
        await page.locator('[data-plan=check]').click();
      }
      assert.equal(await page.locator('.strategy-done').count(),1,id+' round '+k);
      await page.locator('[data-core=next]').click();
      if(k===4)await page.locator('#resultScreen.active').waitFor();
      else await page.waitForFunction(n=>document.querySelector('#stageLabel')?.textContent.trim()===n,(k+2)+' / 5');
    }
    assert.equal(await page.locator('.strategy-results').count(),1);
    assert.equal(await page.locator('.strategy-export').count(),1);
    await page.screenshot({path:out+'/'+vp.label+'-'+id+'-result.png'});
    await page.locator('#resultScreen [data-go=home]').click();
  }
  await page.close();
 }

 await browser.close();
 console.log('PASS 3 novel game mechanics x 5 rounds x 2 viewport sizes, first error+recovery, correct answer path, direct previews, no separate page');
})().catch(e=>{console.error(e);process.exit(1)});

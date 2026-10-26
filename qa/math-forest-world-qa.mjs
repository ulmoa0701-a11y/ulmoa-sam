import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
const out='qa/math-forest-world-artifacts';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({
  headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  args:['--no-sandbox']
});
const errors=[];
const status=page=>page.evaluate(()=>window.__moaForestWorldQA());
const act=(page,action)=>page.locator('[data-mission="'+action+'"]');

async function solve(page){
  const s=await status(page),x=s.task;
  assert.equal(s.phase,'task');
  const mech=x.mech||s.concept;
  if(mech==='share'){
    for(let i=0;i<x.n;i++)await page.locator('.supply-items [data-mission="take"]').first().click();
    for(let i=0;i<x.n;i++)await page.locator('button.feed-friend:not([disabled])').first().click();
  }else if(mech==='compare'){
    const side=x.want==='more'?(x.a>x.b?'a':'b'):(x.a<x.b?'a':'b');
    await page.locator('[data-mission="choose"][data-side="'+side+'"]').click();
  }else if(mech==='make'){
    for(let i=x.have;i<x.total;i++)await page.locator('.supply-items [data-mission="take"]').first().click();
  }else if(mech==='bridge'){
    let pick=null;
    for(let mask=1;mask<(1<<x.pieces.length);mask++){
      const ids=x.pieces.map((_,i)=>i).filter(i=>mask&(1<<i));
      if(ids.reduce((sum,i)=>sum+x.pieces[i],0)===x.target){pick=ids;break}
    }
    assert.ok(pick,'bridge has no available correct combination');
    for(const i of pick)await page.locator('[data-mission="place-plank"][data-piece="'+i+'"]').click();
  }else if(mech==='shop'){
    for(let i=0;i<x.qty;i++)await page.locator('.supply-items [data-mission="take"]').first().click();
    await act(page,'submit').click();
  }else if(mech==='transform'){
    await page.locator('[data-mission="pick-match"][data-group="'+x.correct+'"]').click();
  }else throw new Error('Unhandled quest concept '+mech);
  assert.equal((await status(page)).phase,'success',mech+' solved outcome should be saved');
  assert.equal(await page.locator('.success').count(),1);
}
async function enterConcept(page,index){
  assert.equal((await status(page)).phase,'map');
  assert.equal(await page.locator('.map-node.current').count(),1);
  await page.locator('.map-node.current').click();
  assert.equal((await status(page)).conceptIndex,index);
  assert.equal((await status(page)).phase,'demo');
  await act(page,'continue').click();
  assert.equal((await status(page)).phase,'travel');
  await act(page,'arrive').click();
  assert.equal((await status(page)).step,1);
}
try{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',err=>errors.push(err.message));
  const response=await page.goto(base+'/math-garden/forest-world.html',{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200);
  assert.equal(await page.locator('#tabbar .tab-btn').count(),4);
  assert.equal(await page.locator('.panel:not([hidden])').count(),1);
  // New child-facing collection must be a small count-and-check task, not unlimited tapping.
  assert.match(await page.locator('#gatherGuide').textContent(),/도토리 2개, 딸기 1개/);
  assert.match(await page.locator('#gatherTargets').textContent(),/도토리 0 \/ 2/);
  await page.screenshot({path:path.join(out,'gather-purpose-390.png')});
  await page.setViewportSize({width:320,height:640});
  const gatherOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(gatherOverflow<=3,'gather should not overflow narrow phones: '+gatherOverflow);
  await page.screenshot({path:path.join(out,'gather-purpose-320.png')});
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-spot="berries"]').click();
  for(let k=0;k<3;k++)await page.locator('[data-spot="acorns"]').click();
  assert.equal((await status(page)).acorns,0,'uncounted draft items must not become spendable');
  assert.equal((await status(page)).gatherOrder.acorns,3);
  await page.locator('[data-gather="check"]').click();
  assert.match(await page.locator('#gatherStatus').textContent(),/도토리 1개 많아/);
  assert.equal((await status(page)).gatherOrder.phase,'collect','wrong quantities must not auto finish');
  await page.locator('[data-gather="undo-acorns"]').click();
  assert.equal((await status(page)).gatherOrder.acorns,2);
  await page.locator('[data-gather="check"]').click();
  assert.equal((await status(page)).gatherOrder.phase,'ready','only exact counts finish the basket');
  assert.equal((await status(page)).acorns,2);
  assert.equal((await status(page)).berries,1);
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal((await status(page)).gatherOrder.phase,'ready','basket completion survives reload');
  assert.equal((await status(page)).acorns,2,'reload must not award same order twice');
  await page.locator('[data-gather="pet"]').click();
  assert.equal((await status(page)).tab,'pet');
  await page.locator('[data-feed="acorns"]').click();
  await page.locator('[data-feed="acorns"]').click();
  await page.locator('[data-feed="berries"]').click();
  assert.equal((await status(page)).gatherOrder.phase,'done','delivering exact basket ends bear request');
  assert.equal((await status(page)).acorns,0);
  assert.equal((await status(page)).berries,0);
  await page.locator('[data-tab="gather"]').click();
  await page.locator('[data-gather="next"]').click();
  assert.equal((await status(page)).gatherOrder.round,1,'next request must exist');
  assert.match(await page.locator('#gatherGuide').textContent(),/도토리 3개, 딸기 2개/);
  // Original quest QA starts with a truly empty save.
  await page.evaluate(()=>localStorage.removeItem('moa-forest-world-v1'));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('[data-tab="quest"]').click();
  assert.equal(await page.locator('.map-node').count(),7);
  assert.equal((await status(page)).unlocked,0);
  assert.equal(await page.locator('#visualHint:visible').count(),0,'contextual visual hint must be hidden on map');
  const tabFirst=await page.evaluate(()=>document.querySelector('#tabbar').compareDocumentPosition(document.querySelector('#stage')) & Node.DOCUMENT_POSITION_FOLLOWING);
  assert.ok(tabFirst,'tab navigation must precede the stage in DOM and keyboard focus order');
  for(const width of [320,390,768,1280]){
    await page.setViewportSize({width,height:width===320?640:900});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    assert.ok(overflow<=3,'unexpected horizontal overflow at '+width+'px: '+overflow);
    const nav=await page.locator('#tabbar').boundingBox();
    assert.ok(nav&&nav.x>=0&&nav.x+nav.width<=width+1,'navigation must fit '+width+'px');
    await page.screenshot({path:path.join(out,'forest-map-'+width+'.png')});
  }
  await page.setViewportSize({width:390,height:844});
  // Skipping a chapter must not unlock it or give rewards.
  await page.locator('.map-node.current').click();
  assert.equal((await status(page)).phase,'demo');
  await page.locator('#change').click();
  const skipped=await status(page);
  assert.equal(skipped.phase,'map');
  assert.equal(skipped.unlocked,0);
  assert.equal(skipped.acorns,0);
  assert.equal(skipped.berries,0);
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal((await status(page)).phase,'map');

  let stepsSolved=0;
  for(let i=0;i<7;i++){
    if(i>0)await act(page,'next-chapter').click();
    await enterConcept(page,i);
    for(let step=1;step<=4;step++){
      assert.equal((await status(page)).step,step);
      assert.equal(await page.locator('#visualHint:visible').count(),1,'picture help should be discoverable on tasks');
      if(i===0&&step===1){
        await page.locator('.supply-items [data-mission="take"]').first().click();
        assert.equal(await page.locator('.undo-one').count(),1,'child-sized undo must appear when basket has food');
        const target=await page.locator('.undo-one').boundingBox();
        assert.ok(target&&target.height>=44&&target.width>=44,'undo tap target should be child sized');
        await page.locator('.undo-one').click();
        assert.equal((await status(page)).selected,0,'undo must remove one item');
      }
      if(i===3&&step===1){
        await page.locator('[data-mission="place-plank"][data-piece="2"]').click();
        const returned=page.locator('.plank-return-button');
        assert.equal(await returned.count(),1,'placed plank must have accessible removal button');
        const target=await returned.boundingBox();
        assert.ok(target&&target.height>=44&&target.width>=44,'plank correction target must be large');
        await returned.click();
        assert.equal((await status(page)).planksPlaced.length,0);
      }
      await solve(page);
      stepsSolved++;
      if(i===0&&step===1){
        const before=await status(page);
        await page.reload({waitUntil:'domcontentloaded'});
        const after=await status(page);
        assert.equal(after.phase,'success','reload should restore the completed step screen');
        assert.equal(after.results.length,before.results.length,'reload must not award duplicated successes');
        assert.equal(after.unlocked,0,'reload must not unlock chapters');
        assert.equal(after.acorns,0,'reload must not duplicate resources');
        await page.screenshot({path:path.join(out,'forest-resume-success-390.png')});
      }
      await act(page,'advance').click();
    }
    const done=await status(page);
    assert.equal(done.phase,'chapter-end','chapter '+i+' should end after clean probe+transfer');
    assert.equal(done.unlocked,i+1,'only genuinely completed chapters unlock');
    assert.equal(done.acorns,3*(i+1));
    assert.equal(done.berries,2*(i+1));
    assert.equal(done.review.criteriaMet,true,'independent probe and transfer required');
    if(i===0||i===6){
      const balance={acorns:done.acorns,berries:done.berries,unlocked:done.unlocked};
      await page.reload({waitUntil:'domcontentloaded'});
      const reloaded=await status(page);
      assert.equal(reloaded.phase,'chapter-end','refresh must restore chapter results');
      assert.deepEqual({acorns:reloaded.acorns,berries:reloaded.berries,unlocked:reloaded.unlocked},balance,'refresh must not pay rewards again');
      assert.equal(await page.locator('.chapter-result').count(),1);
    }
    if(i===0||i===6)await page.screenshot({path:path.join(out,'forest-end-'+i+'.png')});
  }
  await act(page,'next-chapter').click();
  assert.match(await page.locator('.overworld-complete').textContent(),/일곱 숲길/);

  // The three village tabs share, spend and persist rewards.
  await page.locator('[data-tab="pet"]').click();
  await page.locator('[data-feed="acorns"]').click();
  assert.equal((await status(page)).feedCount,1);
  await page.locator('[data-tab="build"]').click();
  await page.locator('[data-build="cottage"]').click();
  assert.ok((await status(page)).buildings.includes('cottage'));
  await page.locator('[data-tab="gather"]').click();
  await page.locator('[data-spot="acorns"]').click();
  const saved=await status(page);
  await page.reload({waitUntil:'domcontentloaded'});
  const resumed=await status(page);
  assert.equal(resumed.acorns,saved.acorns);
  assert.equal(resumed.berries,saved.berries);
  assert.equal(resumed.buildings.length,saved.buildings.length);
  assert.equal(resumed.feedCount,1);
  assert.deepEqual(errors,[],'browser JavaScript errors');
  await page.goto(base+'/math-garden/forest-pilot.html',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('select[data-field="first"]').count(),7,'pilot form must cover all concepts');
  assert.ok(await page.locator('#export').isVisible(),'CSV export option must exist');
  assert.ok(await page.locator('#print').isVisible(),'printable field form must exist');
  assert.equal(await page.locator('input[placeholder*="이름"]').count(),0,'do not solicit child identifying data');

  await context.close();
  console.log('PASS forest-world: 7 chapters / '+stepsSolved+' steps / 4 responsive widths / reload / skip guard / village persistence');
}catch(e){
  console.error('FAIL forest-world regression',e);
  process.exitCode=1;
}finally{await browser.close()}

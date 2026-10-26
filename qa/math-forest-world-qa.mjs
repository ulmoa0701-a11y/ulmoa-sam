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
  await page.locator('[data-tab="quest"]').click();
  assert.equal(await page.locator('.map-node').count(),7);
  assert.equal((await status(page)).unlocked,0);
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
  await context.close();
  console.log('PASS forest-world: 7 chapters / '+stepsSolved+' steps / 4 responsive widths / reload / skip guard / village persistence');
}catch(e){
  console.error('FAIL forest-world regression',e);
  process.exitCode=1;
}finally{await browser.close()}

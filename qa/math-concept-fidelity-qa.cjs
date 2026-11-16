/* Pedagogical model integrity checks: grade 5 unlike fractions and grade 6 spatial/decimal concepts. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const read=name=>fs.readFileSync('math-garden/grade-play/'+name,'utf8');
const context={window:{},console};vm.createContext(context);
for(const file of ['app.js','curriculum.js','unit-engine.js','hands-on-core.js'])vm.runInContext(read(file),context,{filename:file});
const C=context.window.MoaMathCurriculum,H=context.window.MoaHandsOnCore,E=context.window.MoaUnitEngine;
assert.equal(C.counts.topics,213);
assert.equal(H.family('shapeViews'),'spatial');
assert.equal(H.family('decimalDivDecimal'),'decimal-scale');
for(const mode of ['cubes','shapeViews','hiddenCubes']){
 for(let i=0;i<100;i++){
  const p=E.problem(mode),s=H.buildMode(H.family(mode,p.answer),mode,p);
  assert.equal(s.heights.length,4);assert(s.heights.every(x=>Number.isInteger(x)&&x>=0&&x<=3));
  assert(new Set(s.heights).size>=2,'each spatial task needs contrasting heights');
  assert.equal(s.count,s.heights.reduce((a,b)=>a+b,0));
  assert.equal(s.front[0],Math.max(s.heights[0],s.heights[2]));
  assert.equal(s.front[1],Math.max(s.heights[1],s.heights[3]));
  assert.equal(s.side[0],Math.max(s.heights[0],s.heights[1]));
  assert.equal(s.side[1],Math.max(s.heights[2],s.heights[3]));
  assert.equal((H.isoStacks(s.heights).match(/<polygon/g)||[]).length,s.count*3);
 }
}
for(let i=0;i<300;i++){
 const s=H.buildMode('decimal-scale','decimalDivDecimal',E.problem('decimalDivDecimal'));
 assert([10,100].includes(s.factor));
 assert(Number.isInteger(s.scaledDivisor));
 assert.equal(s.scaledDividend/s.scaledDivisor,s.quotient);
 assert(Math.abs(Number(s.dividend)/Number(s.divisor)-s.quotient)<1e-8);
}
for(const mode of ['fracUnlike','fracUnlikeSub']){
 for(let i=0;i<100;i++){
  const s=H.buildMode('fraction',mode,E.problem(mode));
  const [n1,d1]=s.firstText.split('/').map(Number),[n2,d2]=s.otherText.split('/').map(Number);
  assert.notEqual(d1,d2);
  assert(Math.abs(s.numer/s.den-(n1/d1+(mode==='fracUnlike'?1:-1)*n2/d2))<1e-8);
 }
}
for(const mode of ['fracDivN','fracDivSame','fracDivF','divisionFraction']){
 for(let i=0;i<100;i++){
  const scene=H.buildMode(H.family(mode),mode,E.problem(mode));
  assert.equal(scene.kind,'fraction-divide');
  if(mode==='fracDivN'){
    assert.equal(scene.operation,'share');
    assert.equal(scene.each*scene.people,scene.numer);
  }else{
    assert.equal(scene.operation,'group');
    assert.equal(scene.quotient*scene.groupSize,scene.units);
    assert.equal(scene.answer,scene.quotient);
    if(mode==='fracDivSame')assert.equal(scene.left.split('/')[1],scene.right.split('/')[1]);
    if(mode==='fracDivF')assert.notEqual(scene.left.split('/')[1],scene.right.split('/')[1]);
  }
 }
}
console.log('PASS MODEL: 3D stacks, decimal equivalence, unlike fraction bars and 4 fraction-division modes');

(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
 try{
  for(const width of [390,1280]){
   const page=await browser.newPage({viewport:{width,height:850}});
   for(let sub=0;sub<3;sub++){
    await page.goto(base+'/math-garden/grade-play/?g=6&t=2&u=1&s='+sub);
    const result=await page.evaluate(()=>{
     const a=window.MoaUnitApp;
     const click=(sel)=>document.querySelector(sel).click();
     click('.hands-check');click('#next');
     click('.hands-help');click('.hands-check');click('#next');
     const s=a.state.activity.scene;
     const buttons=(cls,i,n)=>{for(let k=0;k<n;k++)document.querySelectorAll(cls)[i].click()};
     const i=s.heights.findIndex(v=>v!==s.heights[0]);
     if(i<0)throw Error('must have distinct heights');
     const wrong=[...s.heights];wrong[0]=s.heights[i];wrong[i]=s.heights[0];
     wrong.forEach((v,j)=>buttons('.hands-spatial-plus',j,v));
     click('.hands-check');
     if(!document.querySelector('#next').hidden)throw Error('same sum, wrong 3D shape was accepted');
     wrong.forEach((v,j)=>{
      if(v>s.heights[j])buttons('.hands-spatial-minus',j,v-s.heights[j]);
      if(v<s.heights[j])buttons('.hands-spatial-plus',j,s.heights[j]-v);
     });
     click('.hands-check');if(document.querySelector('#next').hidden)throw Error('correct stack rejected');
     if(a.state.firstTry!==0)throw Error('corrected answer counted as independent');
     click('#next');
     const t=a.state.activity.scene;
     t.heights.forEach((v,j)=>buttons('.hands-spatial-plus',j,v));
     click('.hands-check');
     if(!a.state.solved||a.state.firstTry!==1)throw Error('unassisted transfer did not count');
     return {mode:s.mode,firstTry:a.state.firstTry,poly:(document.querySelectorAll('.hands-spatial-iso polygon').length)};
    });
    assert.equal(result.firstTry,1);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    assert(overflow<=3,'spatial overflow '+width);
   }
   await page.goto(base+'/math-garden/grade-play/?g=6&t=2&u=2&s=0');
   const decimal=await page.evaluate(()=>{
    const a=window.MoaUnitApp,click=s=>document.querySelector(s).click();
    click('.hands-check');click('#next');click('.hands-help');click('.hands-check');click('#next');
    const s=a.state.activity.scene;
    click('[data-factor="'+(s.factor===10?100:10)+'"]');
    document.querySelector('.hands-entry').value=String(s.quotient);
    click('.hands-check');
    if(!document.querySelector('#next').hidden)throw Error('wrong divisor scale was accepted');
    click('[data-factor="'+s.factor+'"]');click('.hands-check');
    if(!a.state.solved||a.state.firstTry!==0)throw Error('corrected decimal counted as independent');
    click('#next');
    const t=a.state.activity.scene;
    click('[data-factor="'+t.factor+'"]');
    document.querySelector('.hands-entry').value=String(t.quotient);
    click('.hands-check');
    return {solved:a.state.solved,firstTry:a.state.firstTry};
   });
   assert(decimal.solved&&decimal.firstTry===1,'decimal transfer failure');
   await page.goto(base+'/math-garden/grade-play/?g=5&t=1&u=4&s=0');
   const frac=await page.evaluate(()=>{
    const a=window.MoaUnitApp,click=s=>document.querySelector(s).click();
    click('.hands-check');click('#next');click('.hands-help');click('.hands-check');click('#next');
    const s=a.state.activity.scene,[,d1]=s.firstText.split('/'),[,d2]=s.otherText.split('/');
    const bars=[...document.querySelectorAll('.hands-given-fractions .hands-fraction-bar')];
    if(bars.length!==2||bars[0].children.length!==+d1||bars[1].children.length!==+d2)throw Error('incorrect original unlike bars');
    return {d1:+d1,d2:+d2};
   });
   assert.notEqual(frac.d1,frac.d2);
   for(const item of [{g:6,t:1,u:0,s:1,mode:'fracDivN'},{g:6,t:2,u:0,s:0,mode:'fracDivSame'},{g:6,t:2,u:0,s:1,mode:'fracDivF'},{g:6,t:2,u:0,s:2,mode:'divisionFraction'}]){
    await page.goto(base+'/math-garden/grade-play/?g='+item.g+'&t='+item.t+'&u='+item.u+'&s='+item.s);
    const r=await page.evaluate(()=>{
     const app=window.MoaUnitApp;
     const click=s=>{const el=document.querySelector(s);if(!el)throw Error('missing '+s);el.click()};
     click('.hands-check');click('#next');
     click('.hands-help');click('.hands-check');click('#next');
     const scene=app.state.activity.scene;
     if(scene.operation==='share'){
      for(let i=0;i<scene.people;i++)for(let k=0;k<scene.each;k++)document.querySelectorAll('.hands-divide-add')[i].click();
     }else{
      for(let i=0;i<scene.quotient;i++)click('.hands-divide-group');
     }
     click('.hands-check');
     return {mode:scene.mode,solved:app.state.solved,firstTry:app.state.firstTry};
    });
    assert(r.solved&&r.firstTry===1,item.mode+' did not solve independently');
    assert.equal(r.mode,item.mode);
   }
   await page.close();
   console.log('PASS BROWSER '+width+'px: all three 3D spatial modes, true positional grading, decimal scaling, fraction source bars');
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

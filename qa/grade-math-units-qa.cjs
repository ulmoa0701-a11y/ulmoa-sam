const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const ROOT='math-garden/grade-play',read=name=>fs.readFileSync(path.join(ROOT,name),'utf8');
for(const name of ['app.js','unit-app.js','curriculum.js','unit-engine.js'])new vm.Script(read(name),{filename:name});
const sandbox={window:{},console};vm.createContext(sandbox);
for(const name of ['app.js','curriculum.js','unit-engine.js'])vm.runInContext(read(name),sandbox,{filename:name});
const C=sandbox.window.MoaMathCurriculum,E=sandbox.window.MoaUnitEngine;
assert.equal(C.counts.terms,12);assert.equal(C.counts.units,71);assert.equal(C.counts.topics,213);
let total=0;
for(const [term,units] of Object.entries(C.C))for(const unit of units)for(const topic of unit.subtopics)for(let k=0;k<100;k++){
 let p;try{p=E.problem(topic.mode)}catch(e){throw Error(term+' '+topic.title+' / '+topic.mode+': '+e.message)}
 assert(p.question&&p.art&&p.hint,term+' incomplete '+topic.mode);
 assert.equal(p.options.length,4,term+' '+topic.mode+' four choices');
 assert.equal(new Set(p.options).size,4,term+' '+topic.mode+' unique');
 assert(p.options.includes(p.answer),term+' '+topic.mode+' answer');
 total++;
}
console.log('DATA_QA: '+C.counts.terms+' terms '+C.counts.units+' units '+C.counts.topics+' topics '+total+' questions passed');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
 const dir='qa/grade-math-unit-artifacts';fs.mkdirSync(dir,{recursive:true});
 try{
  for(const width of [360,390,768,1280]){
   const ctx=await browser.newContext({viewport:{width,height:850}});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   const response=await page.goto(base+'/'+ROOT+'/',{waitUntil:'load',timeout:30000});
   assert(response&&response.ok(),'main math route not 200 at '+width);
   await page.waitForSelector('#unitList .unit-card');
   let current=await page.evaluate(()=>({terms:document.querySelectorAll('#terms button').length,grades:document.querySelectorAll('#grades button').length,units:document.querySelectorAll('#unitList details').length,sub:document.querySelectorAll('#unitList button.subunit').length,stats:document.querySelector('#catalogStats').textContent,over:document.documentElement.scrollWidth-innerWidth}));
   assert.equal(current.grades,6);assert.equal(current.terms,2);assert.equal(current.units,6);assert.equal(current.sub,18);
   assert(current.stats.includes('213'));assert(current.over<=3,width+'px overflow '+current.over);
   if(width===390){
    await page.screenshot({path:dir+'/mobile-units.png',fullPage:true});
    for(let g=1;g<=6;g++)for(let t=1;t<=2;t++){
      await page.locator('#grades button[data-grade="'+g+'"]').click();
      await page.locator('#terms button[data-term="'+t+'"]').click();
      const expected=C.get(g,t);
      assert.equal(await page.locator('#unitList details').count(),expected.length,g+'-'+t+' units');
      assert.equal(await page.locator('#unitList button.subunit').count(),expected.length*3,g+'-'+t+' topics');
      assert.equal(await page.locator('#unitList details[open]').count(),1);
    }
    const result=await page.evaluate(()=>{
      let tested=0;
      for(let grade=1;grade<=6;grade++)for(let term=1;term<=2;term++){
       window.MoaUnitApp.select(grade,term,false);
       const units=window.MoaMathCurriculum.get(grade,term);
       for(let i=0;i<units.length;i++)for(let j=0;j<units[i].subtopics.length;j++){
        window.MoaUnitApp.play(i,j,false);
        for(let r=0;r<5;r++){
         const p=window.MoaUnitApp.state.current;
         if(!p||document.querySelectorAll('#answers button').length!==4)throw Error('missing question');
         const buttons=[...document.querySelectorAll('#answers button')];
         const answer=buttons.find(b=>b.dataset.answer===p.answer);
         if(!answer)throw Error('correct answer missing');
         answer.click();
         if(document.querySelector('#next').hidden)throw Error('next button unavailable');
         document.querySelector('#next').click();
        }
        if(document.querySelector('#done').hidden)throw Error('session incomplete');
        tested++;
       }
      }
      return {tested,done:!document.querySelector('#done').hidden};
    });
    assert.equal(result.tested,213);assert(result.done);
    console.log('BROWSER_QA: 213 full five-question subunit sessions passed');
    await page.goto(base+'/'+ROOT+'/?g=3&t=2&u=2&s=1',{waitUntil:'load'});
    assert.equal(await page.locator('#play').isVisible(),true);
    await page.screenshot({path:dir+'/mobile-circle-game.png'});
   }
   const quick=await page.goto(base+'/'+ROOT+'/quick.html',{waitUntil:'load'});
   assert(quick&&quick.ok(),'49 games fallback unreachable');
   assert.equal(await page.locator('#gradeGrid button.grade').count(),6,'old grade chooser missing');
   const garden=await page.goto(base+'/gardens/',{waitUntil:'load'});
   assert(garden&&garden.ok(),'learning garden unreachable');
   assert.equal(await page.locator('a[href="../math-garden/grade-play/"]').count(),1,'garden full unit link missing');
   assert.equal(errors.length,0,'page errors '+width+' '+errors.join('; '));
   await ctx.close();console.log('VIEWPORT_QA '+width+'px passed');
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
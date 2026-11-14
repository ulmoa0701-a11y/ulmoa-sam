/* Full math-curriculum and hands-on browser regression; no diagnosis claimed. */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const ROOT='math-garden/grade-play',read=name=>fs.readFileSync(path.join(ROOT,name),'utf8');
for(const name of ['app.js','curriculum.js','unit-engine.js','hands-on-core.js','hands-on.js','unit-app.js'])new vm.Script(read(name),{filename:name});
const sandbox={window:{},console};vm.createContext(sandbox);
for(const name of ['app.js','curriculum.js','unit-engine.js','hands-on-core.js'])vm.runInContext(read(name),sandbox,{filename:name});
const C=sandbox.window.MoaMathCurriculum,E=sandbox.window.MoaUnitEngine,H=sandbox.window.MoaHandsOnCore;
assert.equal(C.counts.terms,12);assert.equal(C.counts.units,71);assert.equal(C.counts.topics,213);
let total=0;const kinds=new Set();
for(const [term,units] of Object.entries(C.C))for(const unit of units)for(const topic of unit.subtopics)for(let k=0;k<70;k++){
 const p=E.problem(topic.mode);
 assert(p.question&&p.art&&p.hint,term+' '+topic.mode+' missing prompt');
 assert.equal(p.options.length,4,term+' '+topic.mode+' legacy generator available');
 assert(p.options.includes(p.answer),term+' '+topic.mode+' legacy answer');
 let type=H.family(topic.mode,p.answer),activity=H.buildMode(type,topic.mode,p);
 assert(activity.question&&activity.hint&&activity.answer!==undefined,term+' '+topic.mode+' hands-on activity incomplete');
 kinds.add(type);total++;
}
console.log('DATA_QA:',total,'generated; 213 subunit activities,',kinds.size,'activity families', [...kinds].join(','));
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765',dir='qa/grade-math-unit-artifacts';
fs.mkdirSync(dir,{recursive:true});
try{
 for(const width of [360,390,768,1280]){
 const ctx=await browser.newContext({viewport:{width,height:844}}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto(base+'/'+ROOT+'/',{waitUntil:'load',timeout:30000});
 assert(response?.ok(),'math portal unreachable '+width);
 await page.waitForSelector('.unit-card');
 const measured=await page.evaluate(()=>({width:document.documentElement.scrollWidth-innerWidth,grades:document.querySelectorAll('#grades button').length,units:document.querySelectorAll('.unit-card').length,sub:document.querySelectorAll('.subunit').length}));
 assert.equal(measured.grades,6);assert.equal(measured.units,6);assert.equal(measured.sub,18);
 assert(measured.width<=3,width+' horizontal overflow '+measured.width);
 if(width===390){
 await page.screenshot({path:dir+'/hands-on-portal-mobile.png',fullPage:true});
 for(let grade=1;grade<=6;grade++)for(let term=1;term<=2;term++){
   await page.locator('[data-grade="'+grade+'"]').click();
   await page.locator('[data-term="'+term+'"]').click();
   assert.equal(await page.locator('.unit-card').count(),C.get(grade,term).length,grade+'-'+term+' units');
   assert.equal(await page.locator('.subunit').count(),C.get(grade,term).length*3,grade+'-'+term+' subunits');
 }
 const result=await page.evaluate(()=>{
   const doneKinds=new Set(),fail=[];
   for(let grade=1;grade<=6;grade++)for(let term=1;term<=2;term++){
     window.MoaUnitApp.select(grade,term,false);
     const units=window.MoaMathCurriculum.get(grade,term);
     for(let u=0;u<units.length;u++)for(let s=0;s<units[u].subtopics.length;s++){
       window.MoaUnitApp.play(u,s,false);
       for(let round=0;round<5;round++){
         const shell=document.querySelector('.hands-shell');
         if(!shell||document.querySelectorAll('#answers button.answer').length)throw Error('4-choice legacy UI remains');
         doneKinds.add(shell.dataset.kind);
         if(round===0){
           const go=shell.querySelector('.hands-actions .hands-check');if(!go)throw Error('model missing');
           go.click();
         }else{
           const help=shell.querySelector('.hands-actions .hands-help');
           if(!help)throw Error('guided support missing '+shell.dataset.kind+' phase='+shell.dataset.phase+' round='+window.MoaUnitApp.state.round+' solved='+window.MoaUnitApp.state.solved+' html='+shell.outerHTML.slice(0,1000));
           help.click();
           const check=shell.querySelector('.hands-actions .hands-check');
           if(!check)throw Error('check missing');
           check.click();
         }
         if(document.querySelector('#next').hidden)throw Error('cannot continue '+grade+' '+term+' '+u+' '+s+' '+round);
         document.querySelector('#next').click();
       }
       if(document.querySelector('#done').hidden)throw Error('not finished');
     }
   }
   return {kinds:[...doneKinds],count:Object.values(window.MoaMathCurriculum.C).reduce((a,x)=>a+x.reduce((b,u)=>b+u.subtopics.length,0),0)};
 });
 assert.equal(result.count,213);assert(result.kinds.length>=11,'not enough distinct manipulative activities');
 console.log('PLAY_QA: all 213 subunits finished five phases, kinds=',result.kinds.join(','));
 await page.goto(base+'/'+ROOT+'/?g=3&t=2&u=2&s=1',{waitUntil:'load'});
 assert(await page.locator('#play').isVisible(),'deep-link not play');
 assert.equal(await page.locator('.hands-shell').count(),1,'hands-on component not loaded');
 await page.screenshot({path:dir+'/hands-on-lesson-mobile.png'});
 const independent=await page.evaluate(()=>{
  // Count matching: demonstrate, practice, then solve independently by touching actual cells.
  window.MoaUnitApp.select(1,1,false);window.MoaUnitApp.play(0,0,false);
  document.querySelector('.hands-actions .hands-check').click();document.querySelector('#next').click();
  document.querySelector('.hands-actions .hands-help').click();document.querySelector('.hands-actions .hands-check').click();document.querySelector('#next').click();
  const count=window.MoaUnitApp.state.activity.scene.count;
  const cells=[...document.querySelectorAll('.hands-tenframe button')];
  for(let i=0;i<count;i++)cells[i].click();
  document.querySelector('.hands-actions .hands-check').click();
  return {success:window.MoaUnitApp.state.solved,independent:window.MoaUnitApp.state.firstTry,count,filled:[...document.querySelectorAll('.hands-cell[aria-pressed=true]')].length};
 });
 assert(independent.success&&independent.independent===1&&independent.filled===independent.count,'independent manipulative answer not recognized');
 }
 const quick=await page.goto(base+'/'+ROOT+'/quick.html',{waitUntil:'load'});
 assert(quick?.ok(),'original 49 mini-games missing');
 assert.equal(await page.locator('#gradeGrid button.grade').count(),6);
 const garden=await page.goto(base+'/gardens/',{waitUntil:'load'});
 assert(garden?.ok());assert.equal(await page.locator('a[href="../math-garden/grade-play/"]').count(),1);
 assert.deepEqual(errors,[],'browser errors '+width);
 await ctx.close();console.log('VIEWPORT_QA:',width,'passed');
 }
}finally{await browser.close()}
})().catch(err=>{console.error(err);process.exit(1)});
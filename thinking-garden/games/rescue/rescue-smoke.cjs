const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const BASE=process.env.RESCUE_URL||'http://127.0.0.1:8765/thinking-garden/games/rescue/';
fs.mkdirSync('rescue-qa-screenshots',{recursive:true});
async function test(label,viewport,wide,touch=false,fullRun=true){
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport,isMobile:touch,hasTouch:touch,deviceScaleFactor:1});
 const page=await context.newPage();
 const errors=[];
 const webpResponses=[];
 page.on('pageerror',e=>errors.push('pageerror: '+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
 page.on('response',r=>{if(r.url().includes('/art/illustrated/')&&r.url().includes('.webp'))webpResponses.push({url:r.url(),status:r.status(),type:r.headers()['content-type']});if(r.status()>=400&&r.url().includes('/rescue/'))errors.push('HTTP '+r.status()+' '+r.url())});
 try{
  const response=await page.goto(BASE,{waitUntil:'load',timeout:40000});
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>window.moaRescueGame?.scene?.isActive(window.moaRescueGame.config.width>720?'landtitle':'title'),{timeout:20000});
  const initial=await page.evaluate(()=>({width:window.moaRescueGame.config.width,height:window.moaRescueGame.config.height,canvasWidth:document.querySelector('canvas').getBoundingClientRect().width,canvasHeight:document.querySelector('canvas').getBoundingClientRect().height}));
  const textures=await page.evaluate(()=>{
    const textures=window.moaRescueGame.textures,animals=['rabbit','pig','cow','duck'],colors=['yellow','blue','green','red'];
    const expected=animals.flatMap(a=>colors.map(c=>'sprite-'+a+'-'+c)).concat(
      Array.from({length:5},(_,i)=>'world-tall-'+i),Array.from({length:5},(_,i)=>'world-wide-'+i)
    );
    return {
      missing:expected.filter(k=>!textures.exists(k)),
      loaded:expected.length,
      sourceSamples:animals.slice(0,2).map(a=>{
        const k='sprite-'+a+'-yellow',texture=textures.get(k);
        return {key:k,images:texture?.source?.map(x=>({src:x.image?.src,sourceType:x.image?.constructor?.name}))};
      })
    };
  });
  assert.deepEqual(textures.missing,[],'Missing required game textures');
  assert.equal(webpResponses.length,16,'Browser must request exactly 16 separate illustrated raster WebP assets, '+JSON.stringify({webpResponses,textures}));
  assert.ok(webpResponses.every(x=>x.status===200),'All raster textures must respond HTTP 200');
  console.log('ILLUSTRATED WEBP SOURCES',JSON.stringify(textures.sourceSamples));
  assert.equal(textures.loaded,26);
  assert.equal(initial.width,wide?1200:720);
  assert.equal(initial.height,wide?760:1280);
  assert.ok(initial.canvasWidth>= (wide?760:280),JSON.stringify(initial));
  assert.ok(initial.canvasHeight>= (wide?420:400),JSON.stringify(initial));
  async function clickAt(x,y){
   const box=await page.locator('#game canvas').boundingBox();
   const w=wide?1200:720,h=wide?760:1280;
   await page.mouse.click(box.x+box.width*x/w,box.y+box.height*y/h);
  }
  await page.screenshot({path:'rescue-qa-screenshots/'+label+'-title.png'});
  await clickAt(wide?600:360,wide?619:1030);
  const missionName=wide?'landmission':'mission';
  await page.waitForFunction(n=>window.moaRescueGame.scene.isActive(n),missionName,{timeout:8000});
  await page.screenshot({path:'rescue-qa-screenshots/'+label+'-briefing.png'});
  await clickAt(wide?750:360,wide?356:825);
  await page.waitForFunction(n=>{const sc=window.moaRescueGame.scene.getScene(n);return sc&&sc.lock===false},missionName,{timeout:8000});
  await page.screenshot({path:'rescue-qa-screenshots/'+label+'-gameplay.png'});
  for(let round=0;round<(fullRun?5:1);round++){
   const scene=await page.evaluate(n=>{const s=window.moaRescueGame.scene.getScene(n);return {round:s.round,need:s.m.need,focus:s.m.focus,color:s.m.color,size:s.m.size,targetSpecies:s.m.species,animals:(n==='landmission'?s.targets:s.actors).filter(a=>a.active&&a.data&&a.data.get('species')||n==='landmission'&&a.active&&a.data&&a.data.get('item')).map(a=>n==='landmission'?{x:a.x,y:a.y,visualBodyHeight:a.data.get('visualBodyHeight'),...a.data.get('item')}:{x:a.x,y:a.y,visualBodyHeight:a.data.get('visualBodyHeight'),species:a.data.get('species'),color:a.data.get('color'),size:a.data.get('size')})}},missionName);
   assert.equal(scene.round,round);
   assert.equal(scene.need,[1,1,2,3,4][round],'Difficulty must increase 1,1,2,3,4');
   assert.equal(scene.animals.length,[4,4,4,7,8][round],'Candidate count follows discriminative skill, not just rising visual clutter');
   assert.equal(scene.focus,['species','color','size','color-species','combined'][round]);
   assert.ok(scene.animals.every(a=>a.visualBodyHeight===(a.size==='큰'?165:96)),'Rendered characters must use measured silhouette height calibration');
   if(scene.focus==='species'){
     assert.equal(new Set(scene.animals.map(a=>a.color)).size,1,'Species recognition must not be solvable by color');
     assert.equal(new Set(scene.animals.map(a=>a.size)).size,1,'Species recognition must not be solvable by size');
     assert.equal(new Set(scene.animals.map(a=>a.species)).size,4);
   }
   if(scene.focus==='color'){
     assert.equal(new Set(scene.animals.map(a=>a.species)).size,1,'Color recognition must keep the species fixed');
     assert.equal(new Set(scene.animals.map(a=>a.size)).size,1,'Color recognition must keep size fixed');
     assert.equal(new Set(scene.animals.map(a=>a.color)).size,4);
   }
   if(scene.focus==='size'){
     assert.equal(new Set(scene.animals.map(a=>a.color)).size,1,'Size comparison must keep color fixed');
     for(const sp of scene.targetSpecies){
       assert.deepEqual(scene.animals.filter(a=>a.species===sp).map(a=>a.size).sort(),['작은','큰'],'Each same-species pair must contain one large and one small');
       const large=scene.animals.find(a=>a.species===sp&&a.size==='큰'),small=scene.animals.find(a=>a.species===sp&&a.size==='작은');
       assert.ok(large.visualBodyHeight/small.visualBodyHeight>=1.7,'Visible size ratio must be unambiguous');
       assert.ok(Math.abs(large.y-small.y)<2 && Math.abs(large.x-small.x)<=300,'Compare paired species at same baseline and near each other');
     }
   }
   await page.screenshot({path:'rescue-qa-screenshots/'+label+'-round'+(round+1)+'-gameplay.png'});
   assert.equal(new Set(scene.animals.map(a=>[a.species,a.color,a.size].join('|'))).size,scene.animals.length,'No two visually identical animals may have contradictory answers');
   assert.equal(scene.animals.filter(a=>a.color===scene.color&&a.size===scene.size&&scene.targetSpecies.includes(a.species)).length,scene.need,'Exactly one instance of each target');
   if(!wide) {
    const banner=await page.evaluate(n=>{const x=window.moaRescueGame.scene.getScene(n).missionChip;return {exists:!!x,copy:x?.list.filter(k=>typeof k.text==='string').map(k=>k.text).join(' | ')||'',audio:x?.list.some(k=>k.type==='Container'&&k.list.some(z=>z.text?.includes('다시'))) }},missionName);
    assert.ok(banner.exists && banner.copy.includes(scene.color+'색') && banner.copy.includes(scene.size),'Missing persistent child-readable mission prompt '+JSON.stringify(banner));
    assert.ok(banner.audio,'Missing repeat-audio button');
   }
   // Negative tests: every distractor must stay wrong, including same-species size pairs.
   for(const wrong of scene.animals.filter(a=>!(a.color===scene.color&&a.size===scene.size&&scene.targetSpecies.includes(a.species)))){
    await clickAt(wrong.x,wrong.y);
    await page.waitForTimeout(85);
    const count=await page.evaluate(n=>window.moaRescueGame.scene.getScene(n).found.size,missionName);
    assert.equal(count,0,'Wrong animal must never be rescued: '+JSON.stringify({wrong,scene:scene.focus}));
   }
   const eligible=scene.animals.filter(a=>a.color===scene.color&&a.size===scene.size&&scene.targetSpecies.includes(a.species));
   const seen=new Set();
   const correct=eligible.filter(a=>{if(seen.has(a.species))return false;seen.add(a.species);return true;}).slice(0,scene.need);
   assert.equal(correct.length,scene.need,'Not enough target animal species '+JSON.stringify(scene));
   for(const item of correct){
    await clickAt(item.x,item.y);
    await page.waitForFunction(([n,count])=>window.moaRescueGame.scene.getScene(n).found.size===count,[missionName,correct.indexOf(item)+1],{timeout:6000});
    await page.waitForTimeout(wide?120:1150);
   }
   await page.waitForFunction(n=>window.moaRescueGame.scene.getScene(n).completeOverlayShown===true,missionName,{timeout:8000});
   await page.waitForTimeout(200);
   await page.screenshot({path:'rescue-qa-screenshots/'+label+'-round'+(round+1)+'-complete.png'});
   if(wide)await clickAt(605,514);
   else await clickAt(360,775);
   await page.waitForTimeout(400);
   console.log('AFTER NEXT',label,'round',round,JSON.stringify(await page.evaluate(n=>{const sc=window.moaRescueGame.scene.getScene(n);return {round:sc.round,lock:sc.lock,found:sc.found?.size,active:window.moaRescueGame.scene.isActive(n)}} ,missionName)));
   if(round<4&&fullRun){
    await page.waitForFunction(([n,r])=>{const s=window.moaRescueGame.scene.getScene(n);return s.round===r && s.lock===true},[missionName,round+1],{timeout:8000});
    if(!wide){await clickAt(360,825);await page.waitForFunction(n=>window.moaRescueGame.scene.getScene(n).lock===false,missionName,{timeout:8000});}
    else{await clickAt(750,356);await page.waitForFunction(n=>window.moaRescueGame.scene.getScene(n).lock===false,missionName,{timeout:8000});}
   }
  }
  if(fullRun){
   await page.waitForFunction(n=>window.moaRescueGame.scene.isActive(n),wide?'landresult':'result',{timeout:9000});
   await page.screenshot({path:'rescue-qa-screenshots/'+label+'-result.png'});
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('moa-garden:completed')||'{}').rescue);
   assert.equal(saved,true);
  }
  assert.deepEqual(errors,[],'Browser errors detected');
  process.stdout.write('PASS '+label+' '+JSON.stringify(initial)+' rounds='+ (fullRun?5:1)+'\n');
 }catch(error){
  await page.screenshot({path:'rescue-qa-screenshots/'+label+'-FAILED.png'}).catch(()=>{});
  process.stderr.write('FAIL '+label+' '+String(error)+' Browser errors: '+errors.join(';')+'\n');
  throw error;
 }finally{await context.close();await browser.close()}
}
(async()=>{
 await test('desktop-1440x900',{width:1440,height:900},true,false,true);
 await test('tablet-1024x768',{width:1024,height:768},true,true,true);
 await test('mobile-390x844',{width:390,height:844},false,true,true);
 await test('portrait-tablet-768x1024',{width:768,height:1024},false,true,true);
})().catch(e=>{console.error(e);process.exitCode=1});
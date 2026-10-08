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
 page.on('pageerror',e=>errors.push('pageerror: '+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
 page.on('response',r=>{if(r.status()>=400&&r.url().includes('/rescue/'))errors.push('HTTP '+r.status()+' '+r.url())});
 try{
  const response=await page.goto(BASE,{waitUntil:'load',timeout:40000});
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>window.moaRescueGame?.scene?.isActive(window.moaRescueGame.config.width>720?'landtitle':'title'),{timeout:20000});
  const initial=await page.evaluate(()=>({width:window.moaRescueGame.config.width,height:window.moaRescueGame.config.height,canvasWidth:document.querySelector('canvas').getBoundingClientRect().width,canvasHeight:document.querySelector('canvas').getBoundingClientRect().height}));
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
   const scene=await page.evaluate(n=>{const s=window.moaRescueGame.scene.getScene(n);return {round:s.round,need:s.m.need,color:s.m.color,size:s.m.size,targetSpecies:s.m.species,animals:(n==='landmission'?s.targets:s.actors).filter(a=>a.active&&a.data&&a.data.get('species')||n==='landmission'&&a.active&&a.data&&a.data.get('item')).map(a=>n==='landmission'?{x:a.x,y:a.y,...a.data.get('item')}:{x:a.x,y:a.y,species:a.data.get('species'),color:a.data.get('color'),size:a.data.get('size')})}},missionName);
   assert.equal(scene.round,round);
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
 await test('tablet-1024x768',{width:1024,height:768},true,true,false);
 await test('mobile-390x844',{width:390,height:844},false,true,false);
 await test('portrait-tablet-768x1024',{width:768,height:1024},false,true,false);
})().catch(e=>{console.error(e);process.exitCode=1});
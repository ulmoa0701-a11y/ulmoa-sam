import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const base='http://127.0.0.1:8765';
const out=path.resolve('thinking-garden/games/rhythm-touch/qa-artifacts');fs.mkdirSync(out,{recursive:true});
const chrome=process.env.CHROME_BIN||'/usr/bin/google-chrome';
const browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox']});
const results=[],failures=[];
function check(ok,msg){if(!ok)failures.push(msg)}
for(const [name,w,h] of [['desktop1366',1366,900],['mobile390',390,844]]){
 const context=await browser.newContext({viewport:{width:w,height:h},isMobile:w<=700,hasTouch:w<=700});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push('pageerror '+e.message));
 const testPage=await page.goto(base+'/test/',{waitUntil:'networkidle'});
 check(testPage.ok()&&await page.locator('a[href="../boomwhacker/"]').count()===1,
   name+': Boomwhacker Studio is not listed in website Test category');
 const home=await page.goto(base+'/thinking-garden/',{waitUntil:'networkidle'});
 check(home.ok(),name+': garden home HTTP failure');
 check(await page.locator('.library-card').count()===15,name+': game library count mismatch');
 await page.locator('.category-tab[data-category="music"]').click();
 check(await page.locator('.library-card:not([hidden])').count()===2,name+': music tab should show recorder and rhythm');
 await page.locator('.subtopic-tab[data-subtopic="rhythm"]').click();
 check(await page.locator('.library-card:not([hidden])').count()===1,name+': rhythm subtopic did not filter game');
 check(await page.locator('[data-open="rhythmTouch"]').isVisible(),name+': rhythm card missing');
 await page.locator('[data-open="rhythmTouch"]').click();
 await page.waitForURL('**/thinking-garden/games/rhythm-touch/');
 check((await page.title()).includes('박자꽃 톡톡'),name+': game page wrong');
 check(await page.locator('.key').count()===8,name+': 8 large touch note keys required');
 check((await page.locator('.key[data-note="높은도"]').innerText()).includes('도↑'),
    name+': mobile high C button should be compact and readable');
 check(await page.locator('.noteTile').count()===14,name+': first song note sequence mismatch');
 check(await page.locator('#noteTrack').count()===1&&await page.locator('#currentCue').count()===0&&
   await page.locator('#nextCue').count()===0&&await page.locator('.sheetHead').count()===0,
   name+': duplicate top circular cue or second score is still stealing attention');
 const scoreLayout=await page.evaluate(()=>{
   const stage=document.querySelector('#mainStage'),track=document.querySelector('#noteTrack'),
     first=track.firstElementChild,grid=getComputedStyle(track);
   const full=x=>{const r=x.getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,top:r.top,right:r.right,bottom:r.bottom}};
   const note=first.querySelector('.scoreNoteBubble'),lyric=first.querySelector('.tileLyric');
   return {stage:full(stage),grid:full(track),first:full(first),note:full(note),lyric:full(lyric),
     cols:grid.gridTemplateColumns.split(' ').length,overflowY:grid.overflowY,
     scrollHeight:track.scrollHeight,clientHeight:track.clientHeight};
 });
 check(scoreLayout.cols===(w<=700?4:7)&&scoreLayout.grid.width>scoreLayout.stage.width*.92&&
   scoreLayout.first.width>=(w<=700?65:110)&&scoreLayout.note.width>=(w<=700?42:55),
   name+': score grid is too narrow or notes too small '+JSON.stringify(scoreLayout));
 if(w<=700)check(scoreLayout.scrollHeight>scoreLayout.clientHeight,
   name+': long mobile score must scroll inside its own grid '+JSON.stringify(scoreLayout));
 const scrolling=await page.evaluate(()=>{
   const grid=document.querySelector('#noteTrack');
   const before=window.scrollY;
   changeCue(state.events.length-1);
   return {after:window.scrollY,before,scroll: grid.scrollTop,
     active:[...grid.querySelectorAll('.noteTile.active')].map(x=>Number(x.dataset.i)),
     next:grid.querySelectorAll('.noteTile.next').length};
 });
 check(scrolling.active.join(',')==='13'&&scrolling.next===0&&
   (w>700||scrolling.scroll>5)&&Math.abs(scrolling.after-scrolling.before)<=1,
   name+': score must follow current note without scrolling page '+JSON.stringify(scrolling));
 await page.evaluate(()=>{state.lastUi=-1;changeCue(0);document.querySelector('#noteTrack').scrollTop=0});
 await page.screenshot({path:out+'/'+name+'-score-ready.png',fullPage:false});
 const initial=await page.evaluate(()=>window.__rhythmQA.state());
 check(initial.song==='twinkle'&&initial.events[0].note==='도'&&initial.events[1].note==='도',name+': incorrect two opening notes');
 check(Math.abs(initial.bpm-66)<.1,name+': song tempo must be 66 BPM');
 check(initial.events.every((e,i)=>i===0||e.ms>initial.events[i-1].ms),name+': timeline order invalid');
 const before=await page.evaluate(()=>{window.__rhythmQA.simulateStart();return window.__rhythmQA.tapAt('도',0)});
 check(before.grade==='great',name+': perfectly timed first 도 not marked great');
 const spam=await page.evaluate(()=>window.__rhythmQA.tapAt('도',0));
 check(spam.grade==='extra',name+': repeated spam must not count as another hit');
 const second=await page.evaluate(()=>{const s=window.__rhythmQA.state();return window.__rhythmQA.tapAt('도',s.events[1].ms)});
 check(second.grade==='great'&&second.index===1,name+': second 도 not correctly scored');
 const wrong=await page.evaluate(()=>{const s=window.__rhythmQA.state();return window.__rhythmQA.tapAt('레',s.events[2].ms)});
 check(wrong.grade==='wrong'&&wrong.index===2,name+': wrong pitch not penalized');
 const partly=await page.evaluate(()=>window.__rhythmQA.state());
 check(partly.stats.great===2&&partly.stats.wrong===1&&partly.extra===1&&partly.score<20,
   name+': scoring inflated by repeated or wrong taps '+JSON.stringify(partly));
 await page.evaluate(()=>{const s=window.__rhythmQA.state();for(let i=3;i<s.events.length;i++)window.__rhythmQA.expire(i);window.__rhythmQA.finish()});
 check(await page.locator('#results').isVisible(),name+': song completion result missing');
 check((await page.locator('#finalScore').innerText())!=='100',name+': partial accuracy should not show perfect karaoke score');
 check(await page.evaluate(()=>!!JSON.parse(localStorage.getItem('moa-garden:completed')||'{}').rhythmTouch),
   name+': Thinking Garden completion state not recorded');
 // Scoring audit: every correctly timed right note, exactly once, must yield 100.
 const perfect=await page.evaluate(()=>{
   window.__rhythmQA.reset();window.__rhythmQA.simulateStart();
   const items=window.__rhythmQA.state().events;
   return {grade:items.map(x=>window.__rhythmQA.tapAt(x.note,x.ms).grade),score:window.__rhythmQA.finish()};
 });
 check(perfect.grade.every(g=>g==='great')&&perfect.score===100,
   name+': 100% on every exact note not achievable '+JSON.stringify(perfect));
 // Different note spacing must preserve early/late tolerance for half-beat rhythms.
 await page.locator('#songSelect').selectOption('butterfly');
 const butterfly=await page.evaluate(()=>window.__rhythmQA.state());
 check(butterfly.events.length===13&&butterfly.events[0].note==='솔'&&butterfly.events[1].note==='미'&&
  Math.abs(butterfly.events[1].ms-butterfly.events[0].ms-butterfly.bpm**-1*30000)<2,
  name+': half-beat timing in butterfly broken');
 await page.evaluate(()=>window.__rhythmQA.reset());
 await page.locator('#songSelect').selectOption('twinkle');
 await page.locator('#startBtn').click();
 const count=await page.evaluate(()=>window.__rhythmQA.state());
 check(count.phase==='count'&&count.countLen===6,name+': six-beat 1-2-1-2-시-작 count-in missing');
 await page.evaluate(()=>{
   state.countStart=performance.now()-state.countLen*state.beat-35;
   state.origin=performance.now()-35;
 });
 await page.waitForTimeout(95);
 const playing=await page.evaluate(()=>window.__rhythmQA.state());
 const firstTile=await page.evaluate(()=>({active:[...document.querySelectorAll('#noteTrack .noteTile.active')].map(e=>Number(e.dataset.i)),
   next:[...document.querySelectorAll('#noteTrack .noteTile.next')].map(e=>Number(e.dataset.i)),
   first:document.querySelector('#noteTrack .noteTile.active .scoreNoteBubble')?.textContent}));
 check(playing.phase==='play'&&firstTile.first==='도'&&firstTile.active.join(',')==='0'&&
   firstTile.next.join(',')==='1'&&await page.locator('#countOverlay').isHidden(),
   name+': first 도 must glow directly on the sole score after 작 '+JSON.stringify(firstTile));
 const visibleTogether=await page.evaluate(()=>{
   const score=document.querySelector('#noteTrack').getBoundingClientRect(),
     key=document.querySelector('.key').getBoundingClientRect();
   return {scoreTop:score.top,scoreBottom:score.bottom,keyTop:key.top,keyBottom:key.bottom,viewH:innerHeight,pageY:scrollY};
 });
 if(w<=700)check(visibleTogether.scoreTop>=-2&&visibleTogether.keyBottom<visibleTogether.viewH+3,
   name+': mobile score and note buttons are not visible together at playback '+JSON.stringify(visibleTogether));
 check(await page.locator('.key').first().isVisible(),name+': click/touch targets hidden');
 if(w<=700)await page.locator('.key').first().tap();else await page.locator('.key').first().click();
 check((await page.locator('#scoreLabel').innerText())!=='0',
   name+': visible touch/click key did not update score');
 const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth));
 check(overflow<=2,name+': screen horizontal overflow '+overflow);
 await page.screenshot({path:out+'/'+name+'.png',fullPage:true});
 results.push({name,notes:initial.events.length,perfect:perfect.score,partial:partly.score,
   halfBeat:butterfly.events[1].ms,overflow,errors});
 check(errors.length===0,name+': Javascript errors '+errors.join('; '));
 await context.close();
}
await browser.close();
fs.writeFileSync(out+'/report.json',JSON.stringify({results,failures},null,2));
console.log(JSON.stringify({results,failures},null,2));
if(failures.length)process.exitCode=1;
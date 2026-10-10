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
for(const [name,w,h] of [['desktop1600',1600,900],['desktop1366',1366,768],['mobile390',390,844],['mobile360short',360,640],['tablet768',768,1024]]){
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
 check(await page.locator('.pianoKeys .key').count()===8,
   name+': piano-style playing keys not present');
 const keyVsSheet=await page.evaluate(()=>{
   const score=document.querySelector('#noteTrack .noteTile');
   const sheetNote=score.querySelector('.scoreNoteBubble');
   const scoreTile=score.querySelector('.tileNote');
   const instrument=document.querySelector('#keys'),key=document.querySelector('.key');
   const style=e=>getComputedStyle(e);
   const rect=e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height}};
   return {keyBoardBg:style(instrument).backgroundImage,
     keyBg:style(key).backgroundImage,
     keyColor:key.style.getPropertyValue('--key-color'),
     scoreCardBg:style(scoreTile).backgroundColor,
     noteBg:style(sheetNote).backgroundColor,
     scoreNote:rect(sheetNote),key:rect(key),
     keyGroup:rect(instrument),
     pressedLabel:key.getAttribute('aria-label'),
     keyGridCols:style(instrument).gridTemplateColumns.split(' ').length};
 });
 check(keyVsSheet.keyBg.includes('linear-gradient')&&
   keyVsSheet.keyBoardBg.includes('linear-gradient')&&
   keyVsSheet.keyColor.startsWith('#')&&
   keyVsSheet.pressedLabel.includes('건반'),
   name+': score and instrument still look identical or lack key affordance '+JSON.stringify(keyVsSheet));
 check(keyVsSheet.key.height>keyVsSheet.scoreNote.height*1.12&&
   keyVsSheet.keyGridCols===(w<=350?4:8),
   name+': finger targets are too small or grid wrong '+JSON.stringify(keyVsSheet));
 check(await page.locator('#keyLayoutSelect').inputValue()==='piano',name+': default must be ordered piano keys');
 const ink=await page.evaluate(()=>({
   normal:getComputedStyle(document.querySelector('.key[data-note="도"]>span:first-child')).color,
   yellow:getComputedStyle(document.querySelector('.key[data-note="미"]>span:first-child')).color,
   high:getComputedStyle(document.querySelector('.key[data-note="높은도"]>span:first-child')).color,
   sheet:getComputedStyle(document.querySelector('.scoreNoteBubble')).color
 }));
 check(ink.normal==='rgb(21, 25, 30)'&&ink.yellow==='rgb(21, 25, 30)'&&
   ink.high==='rgb(255, 255, 255)'&&ink.sheet==='rgb(21, 25, 30)',
   name+': ordinary pitch labels must be black and high C white '+JSON.stringify(ink));
 // Changing the instrument is a presentation setting, not a different scoring engine.
 await page.locator('#keyLayoutSelect').selectOption('xylophone');
 const xyl=await page.evaluate(()=>({mode:state.keyLayout,
   cols:getComputedStyle(document.querySelector('#keys')).gridTemplateColumns.split(' ').length,
   notes:[...document.querySelectorAll('.key')].map(e=>e.dataset.note)}));
 check(xyl.mode==='xylophone'&&xyl.cols===(w<=350?4:8)&&xyl.notes.length===8,
   name+': one-row xylophone controls are missing '+JSON.stringify(xyl));
 if(name==='mobile390'||name==='desktop1366')
   await page.screenshot({path:out+'/'+name+'-xylophone.png',fullPage:false});
 await page.locator('#keyLayoutSelect').selectOption('shuffle');
 const shuffled=await page.evaluate(()=>({
   mode:state.keyLayout,
   positions:[...document.querySelectorAll('.key')].map(k=>Number(k.style.order)),
   cols:getComputedStyle(document.querySelector('#keys')).gridTemplateColumns.split(' ').length
 }));
 check(shuffled.mode==='shuffle'&&
   shuffled.positions.slice().sort((a,b)=>a-b).join(',')==='0,1,2,3,4,5,6,7'&&
   shuffled.positions.some((p,i)=>p!==i)&&shuffled.cols===(w<=700?4:8),
   name+': random mode did not shuffle the playable pitches once '+JSON.stringify(shuffled));
 if(name==='mobile390'||name==='desktop1366')
   await page.screenshot({path:out+'/'+name+'-random.png',fullPage:false});
 await page.locator('#keyLayoutSelect').selectOption('piano');
 check(await page.locator('#keys.pianoKeys .key').count()===8,name+': return to ordered piano failed');
 // A challenge layout gets a shuffled order when play is pressed and NEVER moves mid-song.
 await page.locator('#keyLayoutSelect').selectOption('shuffle');
 await page.locator('#startBtn').click();
 const lockedLayout=await page.evaluate(()=>({
   phase:state.phase,locked:document.querySelector('#keyLayoutSelect').disabled,
   order:window.__rhythmQA.state().keyOrders.map(x=>x.position).join(',')
 }));
 await page.waitForTimeout(85);
 const stableLayout=await page.evaluate(()=>window.__rhythmQA.state().keyOrders.map(x=>x.position).join(','));
 check(lockedLayout.phase==='intro'&&lockedLayout.locked&&
   lockedLayout.order===stableLayout&&lockedLayout.order.split(',').length===8,
   name+': shuffled keys moved during a song or layout selector remained enabled '+JSON.stringify(lockedLayout));
 await page.evaluate(()=>window.__rhythmQA.reset());
 await page.locator('#keyLayoutSelect').selectOption('piano');
 check(await page.locator('.mainStage .noteTile button').count()===0,
   name+': read-only score unexpectedly contains clickable buttons');

 const oneViewport=await page.evaluate(()=>{
   const get=sel=>{const r=document.querySelector(sel).getBoundingClientRect();
     return {x:r.left,y:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
   const track=document.querySelector('#noteTrack');
   const notes=[...track.querySelectorAll('.noteTile')].map(x=>x.getBoundingClientRect().toJSON());
   const keys=[...document.querySelectorAll('.key')].map(x=>x.getBoundingClientRect().toJSON());
   return {viewport:{width:innerWidth,height:innerHeight},bodyScroll:document.body.scrollHeight-innerHeight,
     documentScroll:document.documentElement.scrollHeight-innerHeight,
     app:get('.app'),settings:get('.settings'),hud:get('.hud'),score:get('#noteTrack'),
     firstNote:notes[0],lastNote:notes.at(-1),firstKey:keys[0],lastKey:keys.at(-1),
     keyCount:keys.length,keysInView:keys.every(k=>k.top>=0&&k.bottom<=innerHeight+1),
     notesInView:notes.every(n=>n.top>=0&&n.bottom<=innerHeight+1),
     scoreOverflow:track.scrollHeight-track.clientHeight,
     horizontalOverflow:document.documentElement.scrollWidth-innerWidth,
     disclaimer:get('.disclaimer')};
 });
 check(oneViewport.bodyScroll<=2&&oneViewport.documentScroll<=2&&
   oneViewport.horizontalOverflow<=2,name+': game page still scrolls '+JSON.stringify(oneViewport));
 check(oneViewport.notesInView&&oneViewport.keysInView&&
   oneViewport.hud.y>=0&&oneViewport.settings.y>=0&&
   oneViewport.disclaimer.bottom<=h+1,name+': score/buttons/controls are cut off '+JSON.stringify(oneViewport));
 check(oneViewport.scoreOverflow<=3&&oneViewport.lastNote.bottom<=oneViewport.score.bottom+2,
   name+': some notes are hidden below score grid '+JSON.stringify(oneViewport));
 check(oneViewport.firstKey.height>=40&&oneViewport.lastKey.height>=40,
   name+': touch targets too small '+JSON.stringify(oneViewport));
 await page.screenshot({path:out+'/'+name+'-single-screen.png',fullPage:false});

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
 check(scoreLayout.cols===(w<=700?4:w<=1080?6:7)&&scoreLayout.grid.width>scoreLayout.stage.width*.92&&
   scoreLayout.first.width>=(w<=700?62:w<=1080?105:110)&&scoreLayout.note.width>=(w<=700?22:31),
   name+': score grid is too narrow or notes too small '+JSON.stringify(scoreLayout));
 check(scoreLayout.scrollHeight<=scoreLayout.clientHeight+3,
   name+': all 14 notes must fit in the score without internal scrolling '+JSON.stringify(scoreLayout));
 const scrolling=await page.evaluate(()=>{
   const grid=document.querySelector('#noteTrack');
   const before=window.scrollY;
   changeCue(state.events.length-1);
   return {after:window.scrollY,before,scroll: grid.scrollTop,
     active:[...grid.querySelectorAll('.noteTile.active')].map(x=>Number(x.dataset.i)),
     next:grid.querySelectorAll('.noteTile.next').length};
 });
 check(scrolling.active.join(',')==='13'&&scrolling.next===0&&scrolling.scroll<=2&&
   Math.abs(scrolling.after-scrolling.before)<=1,
   name+': all score notes must remain visible with no page/grid scroll '+JSON.stringify(scrolling));
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
 check(count.phase==='intro'&&count.introBeats===2&&count.countLen===6&&
   Math.abs(count.origin-count.introStart-(count.introBeats+count.countLen)*60000/count.bpm)<5,
   name+': melodic preview + fixed 1-2-1-2-시-작 count-in timing broken '+JSON.stringify(count));
 check((await page.locator('#countInfo').textContent()).includes('간주'),
   name+': intro has no audible-melody preparation label');
 check(await page.locator('#keyLayoutSelect').isDisabled(),
   name+': layout must not move while preview/countdown is playing');
 await page.locator('.key').first().click();
 check((await page.evaluate(()=>window.__rhythmQA.state())).score===0,
   name+': children must not score accidental early taps during prelude');
 const introSound=await page.evaluate(()=>{
   clearGameFrame();state.introStart=performance.now()-state.beat*1.15;
   state.countStart=state.introStart+state.introBeats*state.beat;
   state.origin=state.countStart+state.countLen*state.beat;
   tick(performance.now());
   return {phase:state.phase,previewIndex:state.lastPreview};
 });
 check(introSound.phase==='intro'&&introSound.previewIndex>=1,
   name+': real song opening melody was not played during the preview '+JSON.stringify(introSound));
 // Pause and resume preserve BOTH clocks rather than starting the song too early.
 await page.locator('#pauseBtn').click();
 const paused=await page.evaluate(()=>({phase:state.phase,intro:state.introStart}));
 await page.locator('#pauseBtn').click();
 const resumed=await page.evaluate(()=>({phase:state.phase,intro:state.introStart}));
 check(paused.phase==='paused'&&resumed.phase==='intro'&&resumed.intro>=paused.intro,
   name+': preview pause/resume shifted the start unexpectedly');
 const firstCount=await page.evaluate(()=>{
   clearGameFrame();const n=performance.now();state.countStart=n-30;
   state.introStart=state.countStart-state.introBeats*state.beat;
   state.origin=state.countStart+state.countLen*state.beat;
   tick(n);
   return {phase:state.phase,text:document.querySelector('#countNumber').textContent,
     heading:document.querySelector('#countInfo').textContent};
 });
 check(firstCount.phase==='count'&&firstCount.text==='1'&&firstCount.heading.includes('박자'),
   name+': countdown did not follow melody preview cleanly '+JSON.stringify(firstCount));
 const lastCount=await page.evaluate(()=>{
   clearGameFrame();const n=performance.now();state.countStart=n-state.beat*(state.countLen-.5);
   state.introStart=state.countStart-state.introBeats*state.beat;
   state.origin=state.countStart+state.countLen*state.beat;
   tick(n);
   return {phase:state.phase,text:document.querySelector('#countNumber').textContent,
     active:document.querySelector('#countNumber .countChar.active')?.textContent};
 });
 check(lastCount.phase==='count'&&lastCount.text==='시작'&&lastCount.active==='작',
   name+': final 작 must be obvious just before the first note '+JSON.stringify(lastCount));
 await page.evaluate(()=>{
   clearGameFrame();const n=performance.now();
   state.origin=n-35;state.countStart=state.origin-state.countLen*state.beat;
   state.introStart=state.countStart-state.introBeats*state.beat;
   tick(n);
 });
 await page.waitForTimeout(85);
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
 check(visibleTogether.scoreTop>=-2&&visibleTogether.keyBottom<visibleTogether.viewH+3,
   name+': score and all instrument buttons must be visible together at playback '+JSON.stringify(visibleTogether));
 check(await page.locator('.key').first().isVisible(),name+': click/touch targets hidden');
 // Time measurements around screenshots/layout introspection can exceed the 285ms
 // hit window on slower CI phones. Reset only the playback clock just before the
 // actual pointer tap, while preserving the real input interaction.
 await page.evaluate(()=>{state.origin=performance.now();state.events[0].judged=false;
   state.events[0].grade=null;state.earned=0;state.extra=0;state.played=0;refreshScore()});
 if(w<=700)await page.locator('.key').first().tap();else await page.locator('.key').first().click();
 const physicalTap=await page.evaluate(()=>({phase:state.phase,score:state.score,
   firstGrade:state.events[0].grade,extra:state.extra,elapsed:performance.now()-state.origin}));
 check(physicalTap.score>0&&['great','good','okay'].includes(physicalTap.firstGrade),
   name+': physical pointer tap did not register first correct note '+JSON.stringify(physicalTap));
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
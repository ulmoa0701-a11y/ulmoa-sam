import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE='http://127.0.0.1:8765/boomwhacker/';
const CHROME=process.env.CHROME_BIN||'/usr/bin/google-chrome';
const out='boomwhacker/qa-artifacts';
fs.mkdirSync(out,{recursive:true});
const failures=[];
const report=[];
const check=(ok,msg)=>{if(!ok)failures.push(msg)};

const browser=await chromium.launch({headless:true,executablePath:CHROME,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});

async function basicCase(name,width,height){
  const context=await browser.newContext({viewport:{width,height}});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
  const response=await page.goto(BASE,{waitUntil:'networkidle'});
  check(response?.ok(),`${name}: HTTP response not OK`);
  check((await page.title()).includes('붐웨커 Studio'),`${name}: wrong title`);
  const robots=await page.locator('meta[name=robots]').getAttribute('content');
  check(robots==='noindex,nofollow',`${name}: robots guardrail changed (${robots})`);
  check(await page.locator('.tube').count()===8,`${name}: expected 8 tubes`);
  check(await page.locator('.laneLabel').count()===8,`${name}: expected 8 lanes`);
  check(await page.locator('.beat').count()>0,`${name}: score did not render`);
  const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth));
  check(overflow<=1,`${name}: horizontal overflow ${overflow}px`);

  await page.locator('#levels button[data-level="3"]').click();
  check(await page.locator('.tube:not(.inactive)').count()===3,`${name}: 3-note mode active tube count wrong`);
  await page.locator('#levels button[data-level="5"]').click();
  check(await page.locator('.tube:not(.inactive)').count()===5,`${name}: 5-note mode active tube count wrong`);
  await page.locator('#levels button[data-level="8"]').click();
  check(await page.locator('.tube:not(.inactive)').count()===8,`${name}: 8-note mode active tube count wrong`);

  await page.locator('#tempo').evaluate((el)=>{el.value='80';el.dispatchEvent(new Event('input',{bubbles:true}))});
  check((await page.locator('#bpmLabel').innerText()).includes('80 BPM'),`${name}: BPM control failed`);
  const lyricBefore=(await page.locator('.lyric').allInnerTexts()).join('').trim();
  await page.locator('#lyricBtn').click();
  const lyricAfter=(await page.locator('.lyric').allInnerTexts()).join('').trim();
  check(lyricBefore.length>0&&lyricAfter.length===0,`${name}: lyric toggle failed`);
  await page.locator('#lyricBtn').click();

  await page.locator('#soundBtn').click();
  check((await page.locator('#soundBtn').innerText()).includes('🔇'),`${name}: sound toggle failed`);
  await page.locator('#soundBtn').click();

  await page.locator('#startBtn').click();
  await page.waitForTimeout(550);
  const progress=parseFloat((await page.locator('#progressFill').evaluate(el=>getComputedStyle(el).width)))||0;
  check(progress>0,`${name}: playback progress did not advance`);
  await page.locator('#playBtn').click();
  await page.locator('#resetBtn').click();
  const fillStyle=await page.locator('#progressFill').getAttribute('style')||'';
  check(fillStyle.includes('0%'),`${name}: reset did not return progress to zero`);

  await page.locator('#fullBtn').click();
  check(await page.locator('body').evaluate(el=>el.classList.contains('fullscreen')),`${name}: fullscreen class not enabled`);
  await page.locator('#fullBtn').click();
  check(!(await page.locator('body').evaluate(el=>el.classList.contains('fullscreen'))),`${name}: fullscreen class not disabled`);

  await page.locator('.tube[data-note="도"]').click();
  await page.screenshot({path:`${out}/${name}.png`,fullPage:true});
  check(errors.length===0,`${name}: JS errors: ${errors.join(' | ')}`);
  report.push({name,width,height,overflow,errors,beats:await page.locator('.beat').count()});
  await context.close();
}

for(const [name,w,h] of [['mobile360',360,800],['mobile390',390,844],['mobile412',412,915],['tablet768',768,1024],['desktop1366',1366,900]]) await basicCase(name,w,h);

{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  await page.goto(BASE);
  const transfer={title:'QA 전달곡',timeN:3,timeD:4,bpm:72,measures:[[{note:'도',dur:1,lyric:'가'},{note:'미',dur:1,lyric:'나'},{note:'솔',dur:1,lyric:'다'}]]};
  await page.evaluate(x=>localStorage.setItem('ulmoaBoomTransfer',JSON.stringify(x)),transfer);
  await page.reload({waitUntil:'networkidle'});
  check((await page.locator('#songTitle').innerText())==='QA 전달곡','transfer: song title not loaded from localStorage');
  check((await page.locator('#songMeta').innerText()).includes('3/4'),'transfer: meter not loaded');
  check(await page.locator('.beat').count()===3,'transfer: note count mismatch');
  await page.screenshot({path:`${out}/transfer390.png`,fullPage:true});
  await context.close();
}

await browser.close();
fs.writeFileSync(`${out}/report.json`,JSON.stringify({failures,report},null,2));
console.log(JSON.stringify({failures,report},null,2));
if(failures.length) process.exit(1);

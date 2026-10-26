import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE=process.env.YOUTH_BASE||'http://127.0.0.1:8765/';
const chrome=process.env.CHROME_BIN||'/usr/bin/chromium';
const out='qa/youth-first-help-artifacts';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage']});
const problems=[];
async function check(cond,label){
 if(!cond){problems.push(label);console.error('FAIL '+label);}
 else console.log('PASS '+label);
}
async function fit(page,width,label){
 await check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),width+'px no horizontal scrolling at '+label);
}
async function screenshot(page,width,name){
 await page.screenshot({path:path.join(out,'myself-'+name+'-'+width+'.png'),fullPage:true});
}
for(const width of [390,1280]){
 const ctx=await browser.newContext({viewport:{width,height:870},deviceScaleFactor:1,locale:'ko-KR',permissions:['clipboard-read','clipboard-write']});
 const page=await ctx.newPage();
 const pageErrors=[],outbound=[];
 let inspectConversationRequests=false;
 page.on('pageerror',e=>pageErrors.push(e.message));
 page.on('request',r=>{
  if(!inspectConversationRequests)return;
  const host=new URL(r.url()).hostname;
  if(!['127.0.0.1','localhost','ulmoa0701-a11y.github.io'].includes(host))outbound.push(r.url());
 });
 const url=new URL('support-first/me/',BASE).href;
 await page.goto(new URL('support-first/',BASE).href,{waitUntil:'domcontentloaded'});
 await check(await page.locator('[data-key]').count()===6,width+'px original first-help entry preserved');
 await check(await page.locator('a[href="me/"]').count()===1,width+'px original link into first conversation preserved');
 // The unrelated entry page may load its own remote UI assets; audit only the newly rebuilt page.
 inspectConversationRequests=true;
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await check(await page.locator('#welcome-title').isVisible(),width+'px new story opening visible');
 await check(await page.locator('.world-moa').count()===1,width+'px original Moa visual retained');
 await check(await page.locator('#choice-grid button').count()===0,width+'px no form before voluntary start');
 await check(await page.locator('form[method="post"]').count()===0,width+'px no data submit form');
 await check(await page.locator('a[href="../make/"]').count()===1,width+'px original next activity route retained');
 await check(await page.locator('.about a').count()===4,width+'px four clinical evidence citations in app');
 await fit(page,width,'intro');
 await screenshot(page,width,'opening');
 await page.locator('#privacy-open').click();
 await check(await page.locator('#privacy-dialog').isVisible(),width+'px honest privacy explanation visible');
 await check((await page.locator('#privacy-dialog').innerText()).includes('자동'),width+'px privacy disclosure explains limits');
 await page.locator('#privacy-dialog button').click();
 await page.locator('#start').click();
 await check(await page.locator('#conversation').isVisible(),width+'px starts optional dialogue');
 await check(await page.locator('.choice').count()===4,width+'px opening conversation has four choices');
 await check(await page.locator('#next').isDisabled(),width+'px cannot advance silently without selecting skip');
 await page.locator('[data-choice="game"]').click();
 await check(await page.locator('#next').isEnabled(),width+'px selected response enables continuation');
 await page.locator('.detail-chip').first().click();
 await page.locator('#next').click();
 await check((await page.locator('#question-title').textContent()).includes('신경'),width+'px interest leads naturally to chosen concern');
 await check((await page.locator('#thread').textContent()).includes('게임·영상'),width+'px conversation remembers chosen interest');
 await page.locator('[data-choice="school"]').click();
 await page.locator('#own-toggle').click();
 await page.locator('#own-input').fill('요즘 시작이 쉽지 않아');
 await page.locator('#own-save').click();
 await check(await page.locator('[data-choice="school"]').getAttribute('aria-pressed')==='true',width+'px writing note does not erase previously chosen topic');
 await page.locator('#next').click();
 await check((await page.locator('#question-title').textContent()).includes('학교'),width+'px adaptive school situation is asked');
 await check(await page.locator('[data-choice="lesson"]').count()===1,width+'px relevant school choices are available');
 await page.locator('[data-choice="lesson"]').click();
 await page.locator('.detail-chip').first().click();
 await page.locator('#next').click();
 await check((await page.locator('#question-title').textContent()).includes('편할까'),width+'px choice of communication next');
 await page.locator('[data-choice="write"]').click();
 await page.locator('#next').click();
 await check((await page.locator('#question-title').textContent()).includes('다음'),width+'px next joint step');
 await page.locator('[data-choice="together"]').click();
 await screenshot(page,width,'dialogue');
 await page.locator('#next').click();
 await check(await page.locator('#result').isVisible(),width+'px youth-centered story summary shown');
 await check(await page.locator('#share-items input:checked').count()===0,width+'px all disclosure checkboxes off by default');
 await check(await page.locator('#copy').isDisabled(),width+'px cannot copy unconsented content');
 await check(await page.locator('#print').isDisabled(),width+'px cannot print unconsented content');
 await check(await page.locator('#print-sheet').isHidden(),width+'px no print document without consent');
 await check((await page.locator('#recap-items').textContent()).includes('요즘 시작이 쉽지 않아'),width+'px youth private notes retained only in local visible recap');
 await page.locator('input[data-share="topic"]').check();
 await check((await page.locator('#share-text').inputValue()).includes('학교·공부'),width+'px explicitly shared subject included');
 await check(!(await page.locator('#share-text').inputValue()).includes('요즘 시작이 쉽지 않아'),width+'px private note absent without separate consent');
 await page.locator('input[data-note="topic"]').check();
 await check((await page.locator('#share-text').inputValue()).includes('요즘 시작이 쉽지 않아'),width+'px separately agreed note included');
 await page.locator('input[data-share="topic"]').uncheck();
 await check(!(await page.locator('#share-text').inputValue()).includes('요즘 시작이 쉽지 않아'),width+'px withdrawing topic also withdraws note');
 await check(await page.locator('#print-sheet').isHidden(),width+'px withdrawn note not printable');
 await page.locator('input[data-share="topic"]').check();
 await check(!(await page.locator('input[data-note="topic"]').isChecked()),width+'px note consent not silently restored');
 await page.locator('input[data-share="pace"]').check();
 await check(!(await page.locator('#share-text').inputValue()).includes('게임·영상'),width+'px unselected interest not shared');
 await page.emulateMedia({media:'print'});
 await check(await page.locator('#print-sheet').isVisible(),width+'px print only opted-in text');
 await check(await page.locator('#result').isHidden(),width+'px private recap hidden in print');
 await check(await page.locator('#conversation').isHidden(),width+'px private conversation hidden in print');
 await page.emulateMedia({media:'screen'});
 await page.locator('#share-text').fill('먼저 함께 활동하며 이야기해보고 싶어요');
 await check((await page.locator('#print-text').textContent()).includes('함께 활동'),width+'px printable document follows youth edit');
 await screenshot(page,width,'share');
 await page.locator('#revise').click();
 await check(await page.locator('#print-sheet').isHidden(),width+'px old print data revoked immediately on revision');
 await check(await page.locator('#copy').isDisabled(),width+'px old copy permission revoked on revision');
 await page.locator('#next').click();
 await page.locator('[data-choice="people"]').click();
 await page.locator('#next').click();
 await check((await page.locator('#question-title').textContent()).includes('사람들'),width+'px changing context rebranches to people');
 await check(await page.locator('[data-choice="lesson"]').count()===0,width+'px stale school answer is removed');
 await page.locator('#pass').click();
 await page.locator('#pass').click();
 await page.locator('#pass').click();
 await check(await page.locator('#result').isVisible(),width+'px all optional skipped sections finish');
 await check(await page.locator('#copy').isDisabled(),width+'px no silent disclosure after revision');
 await page.reload({waitUntil:'domcontentloaded'});
 await check(await page.locator('#intro').isVisible(),width+'px reload clears private dialogue');
 await check(await page.locator('#result').isHidden(),width+'px reload clears shared content');
 await page.locator('#early-end').click();
 await check(await page.locator('#result').isVisible(),width+'px immediate voluntary early ending works');
 await check(await page.locator('#copy').isDisabled(),width+'px early ending shares nothing');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#start').click();
 await page.locator('#unknown').click();
 await page.locator('#next').click();
 await page.locator('[data-choice="none"]').click();
 await page.locator('#next').click();
 await check((await page.locator('#question-title').textContent()).includes('처음'),width+'px no concern gracefully skips inappropriate detailed probing');
 await page.locator('#pass').click();
 await page.locator('#unknown').click();
 await page.locator('#next').click();
 await check(await page.locator('#result').isVisible(),width+'px uncertain answers are valid, non-diagnostic');
 await check((await page.locator('#recap-items').textContent()).includes('잘 모르겠어'),width+'px uncertainty distinct from skipping');
 await check(outbound.length===0,width+'px no third party data or font requests '+outbound.join('|'));
 await check(pageErrors.length===0,width+'px no JavaScript runtime exceptions '+pageErrors.join('|'));
 await fit(page,width,'result');
 await ctx.close();
 // Verify all four topic branches at both sizes.
 for(const [key,expected] of [['school','lesson'],['people','reply'],['mood','night'],['day','change']]){
  const tab=await browser.newPage({viewport:{width,height:820}});
  await tab.goto(url,{waitUntil:'domcontentloaded'});
  await tab.locator('#start').click();
  await tab.locator('#pass').click();
  await tab.locator('[data-choice="'+key+'"]').click();
  await tab.locator('#next').click();
  await check(await tab.locator('[data-choice="'+expected+'"]').count()===1,width+'px branch '+key+' provides contextual situation');
  await tab.locator('[data-choice="'+expected+'"]').click();
  await tab.locator('#next').click();
  await tab.locator('#pass').click();
  await tab.locator('#pass').click();
  await check(await tab.locator('#result').isVisible(),width+'px branch '+key+' finishes');
  await tab.close();
 }
}
await browser.close();
if(problems.length){
 console.error('\nFAILED '+problems.length+' checks:\n'+problems.join('\n'));
 process.exit(1);
}
console.log('\nALL youth story-world tests PASSED (mobile & desktop, choices, branches, consent, print, accessibility, privacy).');

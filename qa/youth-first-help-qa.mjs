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
for(const width of [320,390,820,1440]){
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
 await check(await page.locator('.about a').count()===7,width+'px four clinical and three visual design source links');
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
 await check((await page.locator('#more-label').textContent()).includes('게임이나 영상'),width+'px interest follow-up is a clear question');
 await check((await page.locator('#more-help').textContent()).includes('그냥 이어가도'),width+'px optional follow-up is explained');
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
 await check((await page.locator('#more-label').textContent()).includes('수업이나 과제를 시작할 때'),width+'px school follow-up names selected situation');
 await check((await page.locator('#detail-choices').textContent()).includes('설명이 잘 이해되지 않아'),width+'px school follow-up answers match');
 await page.locator('.detail-chip').first().click();
 await page.locator('#next').click();
 await check((await page.locator('#question-title').textContent()).includes('편할까'),width+'px choice of communication next');
 await page.locator('[data-choice="write"]').click();
 await page.locator('#next').click();
 await check((await page.locator('#question-title').textContent()).includes('다음'),width+'px next joint step');
 await page.locator('[data-choice="together"]').click();
 await screenshot(page,width,'dialogue');
 await page.locator('#next').click();
 await check(await page.locator('#result').isVisible(),width+'px finished personal letter visible');
 await check(await page.locator('#letter-page').isVisible(),width+'px whole result rendered as keepsake letter');
 await check(await page.locator('#self-discovery').isVisible(),width+'px student self-discovery offered beyond static summary');
 await check(await page.locator('#discovery-feelings button').count()===4,width+'px moment-specific inner experience choices');
 await check(await page.locator('#discovery-needs button').count()===5,width+'px needed support choices');
 await check((await page.locator('#discovery-scene').textContent()).includes('수업·과제를 시작할 때'),width+'px actual scene is repeated for reflection');
 await check(await page.locator('#discovery-confirm').isHidden(),width+'px no validation without student responses');
 await page.locator('#discovery-feelings button').first().click();
 await check((await page.locator('#discovery-mirror-text').textContent()).includes('막막했어'),width+'px one thought reflected tentatively');
 await page.locator('#discovery-needs button').nth(1).click();
 await check((await page.locator('#discovery-mirror-text').textContent()).includes('함께 정하기'),width+'px linked situation and support');
 await check((await page.locator('.discovery-mirror-kicker').textContent()).includes('생각 중'),width+'px provisional until student confirms');
 await page.locator('[data-discovery-confirm="yes"]').click();
 await check((await page.locator('.discovery-mirror-kicker').textContent()).includes('내가 맞다고'),width+'px verified only with student approval');
 await page.locator('[data-discovery-confirm="different"]').click();
 await check((await page.locator('.discovery-mirror-kicker').textContent()).includes('조금 다르게'),width+'px disagreement recognized');
 await page.locator('#discovery-correction').fill('막막하기보다 설명을 다시 듣고 싶었어 <b>나의 말</b>');
 await check((await page.locator('#discovery-correction-visible').textContent()).includes('설명을 다시 듣고 싶었어'),width+'px student corrected wording visible');
 await check(await page.locator('#discovery-correction-visible b').count()===0,width+'px correction cannot inject markup');
 await screenshot(page,width,'self-discovery');
 await check(await page.locator('.memory-disclosure summary').isVisible(),width+'px complete transcript can be expanded');
 await check(await page.locator('#recap-items').isHidden(),width+'px repeated records are collapsed on first view');
 await check((await page.locator('#result-title').textContent()).includes('학교에서의 하루'),width+'px selected topic personalizes letter title');
 await check((await page.locator('#cover-name').textContent())==='별빛 탐험길',width+'px game choice yields story name');
 await check(await page.locator('#letter-page').getAttribute('data-story-theme')==='game',width+'px game choice yields blue cover');
 await check((await page.locator('#cover-reason').textContent()).includes('게임이나 영상'),width+'px personalized symbol grounded in selected interest');
 await check((await page.locator('#highlight-quote').textContent()).includes('요즘 시작이 쉽지 않아'),width+'px student own quote prominently emphasized');
 await check((await page.locator('#own-voice-list').textContent()).includes('요즘 시작이 쉽지 않아'),width+'px student own words separately highlighted');
 await check(await page.locator('.clue-item').count()===3,width+'px only actual three answer clues displayed');
 await check(await page.locator('.memory-card').count()===5,width+'px all five conversations gathered into one result');
 await check((await page.locator('#recap-items').textContent()).includes('요즘 시작이 쉽지 않아'),width+'px student written note included without separate checkbox');
 await check((await page.locator('#recap-items').textContent()).includes('설명이 잘 이해되지 않아'),width+'px contextual optional answer preserved');
 await check((await page.locator('#recap-items').textContent()).includes('게임·영상'),width+'px interest also retained, not excluded by selection');
 await check(await page.locator('#share-items').count()===0,width+'px no individual counselor disclosure checklist');
 await check(await page.locator('#share-text').count()===0,width+'px no big empty summary textarea');
 await check(await page.locator('#copy').isEnabled(),width+'px one action to copy complete finished report');
 await check(await page.locator('#print').isEnabled(),width+'px one action to print whole finished letter');
 await check((await page.locator('.paper-message').textContent()).includes('오늘 네가 골랐던 장면은'),width+'px letter emphasizes selected experience rather than listing traits');
 await check((await page.locator('#letter-next').textContent()).includes('함께 해보기'),width+'px personal next visit aspiration included');
 await check((await page.locator('#reflection-title').innerText()).includes('내 생각을 내 방식'),width+'px reflection follows chosen communication style');
 await check((await page.locator('#reflection-warm').innerText()).includes('네 표현이야'),width+'px warm message matches writing preference');
 await check((await page.locator('#reflection-parts').innerText()).includes('설명을 다시'),width+'px selected scene gets specific support suggestion');
 await check((await page.locator('#reflection-step').innerText()).includes('게임이나 활동'),width+'px next step respects explicit wish');
 await page.locator('.reflection-edit summary').click();
 await page.locator('[data-response="조금 달라요"]').click();
 await page.locator('#reflection-note').fill('글도 좋지만 익숙해지면 말하고 싶어 <b>내 말</b>');
 await check((await page.locator('#reflection-response').innerText()).includes('<b>내 말</b>'),width+'px reader correction rendered as text');
 await check(await page.locator('#reflection-response b').count()===0,width+'px correction cannot inject markup');
 await page.locator('#cover-choose').click();
 await check(await page.locator('#cover-options').isVisible(),width+'px student can choose a symbolic cover');
 await check(await page.locator('#cover-options button').count()===5,width+'px all cover options present');
 await page.locator('[data-theme="rest"]').click();
 await check((await page.locator('#cover-name').textContent())==='달빛 쉼터',width+'px new theme changes symbolic name');
 await check(await page.locator('#letter-page').getAttribute('data-story-theme')==='rest',width+'px new theme changes color');
 await check((await page.locator('#cover-reason').textContent()).includes('직접 고른 그림'),width+'px chosen motif does not claim personality category');
 await check((await page.locator('#recap-items').textContent()).includes('게임·영상'),width+'px changing symbol preserves original answer');
 await check((await page.locator('#reflection-response').textContent()).includes('조금 달라요'),width+'px cover switching preserves reader corrections');
 await screenshot(page,width,'custom-cover');
 await page.locator('#cover-choose').click();
 await page.locator('[data-theme="game"]').click();
 await fit(page,width,'personalized letter');
 await screenshot(page,width,'personal-letter');
 await page.locator('#copy').click();
 await page.waitForFunction(()=>document.querySelector('#share-status')?.textContent?.length>0,null,{timeout:4000});
 await check((await page.locator('#share-status').textContent()).length>0,width+'px full copy action provides status');
 const copied=await page.evaluate(async()=>await navigator.clipboard.readText());
 await check(copied.includes('요즘 시작이 쉽지 않아')&&copied.includes('게임·영상')&&copied.includes('설명이 잘 이해되지 않아')&&copied.includes('고르거나 글로 이야기하기'),width+'px clipboard includes all original choices detail and own words');
 await check(copied.includes('조금 달라요')&&copied.includes('익숙해지면 말하고 싶어')&&copied.includes('네 표현이야'),width+'px complete export includes reflection and reader correction');
 await check(copied.includes('한 장면 깊이 들여다보기')&&copied.includes('설명을 다시 듣고 싶었어')&&copied.includes('조금 다르게 느낀 말'),width+'px entire report preserves verified or corrected student words');
 await check(copied.includes('별빛 탐험길')&&copied.includes('학교에서의 하루를')&&copied.includes('오늘의 이야기 조각'),width+'px copy includes personalized title, motif and grounded clues');
 await check(!copied.includes('상담자의 판단')&&!copied.includes('우울증 진단'),width+'px full result adds no clinical diagnosis');
 await page.emulateMedia({media:'print'});
 await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
 await check(await page.locator('#letter-page').isVisible(),width+'px personal keepsake printed');
 await check(await page.locator('.memory-card').count()===5,width+'px printed letter retains all five conversation themes');
 await check(await page.locator('#recap-items').isVisible(),width+'px printing always reveals full collapsed answers');
 await check(await page.locator('#copy').isHidden(),width+'px copy control not shown on printed letter');
 await check(await page.locator('#guide-items').isHidden(),width+'px private counselor guide not on student print');
 await check(await page.locator('.reflection-edit').isHidden(),width+'px print hides input controls');
 await check(await page.locator('#cover-choose').isHidden(),width+'px print hides cover editor');
 await check(await page.locator('#highlight-quote').isVisible(),width+'px print shows original student quote');
 await check(await page.locator('#reflection-response').isVisible(),width+'px print includes reader correction');
 await check(await page.locator('#discovery-correction-visible').isVisible(),width+'px printed letter contains corrected discovery');
 await check(await page.locator('.discovery-questions').isHidden(),width+'px print hides unchosen questionnaire options');
 if(width===1440)await page.pdf({path:path.join(out,'personal-letter-print.pdf'),format:'A4',printBackground:true});
 await page.emulateMedia({media:'screen'});
 await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
 await check(await page.locator('#recap-items').isHidden(),width+'px screen restores concise collapsed record');
 await page.locator('.memory-disclosure summary').click();
 await check(await page.locator('#recap-items').isVisible(),width+'px original five answers unfold on request');
 await page.locator('#revise').click();
 await check(await page.locator('#result').isHidden(),width+'px previous letter hidden immediately on revision');
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
 await check(await page.locator('#reflection-response').isHidden(),width+'px changing answers clears obsolete interpretation feedback');
 await check(await page.locator('#copy').isEnabled(),width+'px revised full letter available only after student finishes');
 await check((await page.locator('#recap-items').textContent()).includes('친구·사람 관계'),width+'px revised complete letter uses changed topic');
 await check(!(await page.locator('#recap-items').textContent()).includes('요즘 시작이 쉽지 않아'),width+'px stale free text from old answer removed');
 await page.reload({waitUntil:'domcontentloaded'});
 await check(await page.locator('#intro').isVisible(),width+'px reload clears private dialogue');
 await check(await page.locator('#result').isHidden(),width+'px reload clears shared content');
 await page.locator('#early-end').click();
 await check(await page.locator('#result').isVisible(),width+'px immediate voluntary early ending works');
 await check((await page.locator('#reflection-title').innerText()).includes('아직 알아가는'),width+'px no-answer result does not invent a type');
 await check((await page.locator('#reflection-step').innerText()).includes('정하지 않아도'),width+'px no-answer result does not impose a task');
 await check(await page.locator('#copy').isEnabled(),width+'px early ending allows saving an honest empty conversation letter');
 await check((await page.locator('#recap-items').textContent()).includes('이번에는 이야기하지 않았어'),width+'px early ending is reflected without making up responses');
 await check(await page.locator('#self-discovery').getAttribute('data-active')==='false',width+'px early ending does not invent insights');
 await check((await page.locator('#cover-name').textContent())==='첫 장의 새싹',width+'px no-answer keeps neutral story cover');
 await check(await page.locator('.clue-item').count()===1,width+'px no invented three clues');
 await check((await page.locator('#clue-title').textContent()).includes('한 가지'),width+'px accurate clue count');
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

 // Every selected situation gets its own concrete question and corresponding response choices.
 const followCases={
  school:[['arrival','학교에 가거나 들어갈 때','집에서 나서기가 부담돼'],['lesson','수업이나 과제를 시작할 때','설명이 잘 이해되지 않아'],['people','학교에서 사람을 만날 때','먼저 말을 걸기 어려워'],['expect','성적이나 기대가 신경 쓰일 때','잘해야 한다는 부담이 있어']],
  people:[['begin','먼저 말을 꺼내야 할 때','어떻게 시작할지 모르겠어'],['reply','질문을 받으면 어떤 순간이 어려워','바로 대답해야 할 것 같아'],['alone','사람들과 함께 있어도 혼자 같을 때','대화에 끼기 어려워'],['trouble','오해나 갈등이 생길 때','내 뜻을 설명하기 어려워']],
  mood:[['wake','아침에 일어날 때','아직 잠이 덜 깬 것 같아'],['start','무언가 하려고 할 때','시작할 기운이 잘 안 나'],['night','저녁이나 잠들기 전에는','낮에 있었던 일이 생각나'],['unexpected','갑자기 기분이 달라질 때','어떤 기분인지 잘 모르겠어']],
  day:[['talk','집에서 누군가와 이야기할 때','내 말을 끝까지 하기 어려워'],['plan','해야 할 일을 시작할 때, 어떤 점이 가장 어려워','어디서부터 해야 할지 모르겠어'],['change','예상과 다르게 일이 흘러가면','그다음에 뭘 해야 할지 모르겠어'],['alone','혼자 해결해야 할 때','물어보거나 확인할 사람이 필요해']]
 };
 for(const [topic,cases] of Object.entries(followCases)){
  const tab=await browser.newPage({viewport:{width,height:820}});
  for(const [moment,prompt,expected] of cases){
   await tab.goto(url,{waitUntil:'domcontentloaded'});
   await tab.locator('#start').click();
   await tab.locator('#pass').click();
   await tab.locator('[data-choice="'+topic+'"]').click();
   await tab.locator('#next').click();
   await tab.locator('[data-choice="'+moment+'"]').click();
   await check((await tab.locator('#more-label').textContent()).includes(prompt),width+'px '+topic+'/'+moment+' follow-up matches selected scene');
   await check((await tab.locator('#detail-choices').textContent()).includes(expected),width+'px '+topic+'/'+moment+' responses fit question');
   await check((await tab.locator('#more-help').textContent()).includes('하나만'),width+'px '+topic+'/'+moment+' single response explained');
   await check(await tab.locator('.detail-chip').count()===3,width+'px '+topic+'/'+moment+' exactly three optional choices');
   await check(await tab.locator('#next').isEnabled(),width+'px '+topic+'/'+moment+' follow-up can be skipped');
   if(topic==='day'&&moment==='plan'){
    await screenshot(tab,width,'clear-day-plan-followup');
    await check(!(await tab.locator('#more-label').textContent()).includes('조금 더 이야기하고 싶다면'),width+'px screenshot ambiguous heading removed');
   }
   await tab.locator('.detail-chip').first().click();
   await tab.locator('.detail-chip').nth(1).click();
   await check(await tab.locator('.detail-chip[aria-pressed="true"]').count()===1,width+'px '+topic+'/'+moment+' only one detail selected');
   await tab.locator('#next').click();
   await check((await tab.locator('#question-title').textContent()).includes('처음 보는 사람'),width+'px '+topic+'/'+moment+' continues normally');
  }
  await tab.close();
 }
 for(const stage of ['spark','pace']){
  const tab=await browser.newPage({viewport:{width,height:820}});
  const options=stage==='spark'?[['game','게임이나 영상'],['create','무언가 만들어볼 때'],['rest','혼자 쉴 때'],['friend','좋아하는 사람과 있을 때']]:[['wait','생각할 시간을 줄 때'],['write','선택지나 글로 답할 때'],['play','함께 활동하며 시작한다면'],['talk','말로 이야기할 때']];
  for(const [choice,fragment] of options){
   await tab.goto(url,{waitUntil:'domcontentloaded'});
   await tab.locator('#start').click();
   if(stage==='pace'){await tab.locator('#pass').click();await tab.locator('#pass').click();}
   await tab.locator('[data-choice="'+choice+'"]').click();
   await check((await tab.locator('#more-label').textContent()).includes(fragment),width+'px '+stage+'/'+choice+' concrete follow-up');
   await check((await tab.locator('#more-help').textContent()).includes('그냥 이어가도'),width+'px '+stage+'/'+choice+' optional');
  }
  await tab.close();
 }
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

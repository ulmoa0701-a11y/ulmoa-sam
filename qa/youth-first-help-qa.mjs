import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE=process.env.YOUTH_BASE||'http://127.0.0.1:8765/';
const chrome=process.env.CHROME_BIN||'/usr/bin/chromium';
const out='qa/youth-first-help-artifacts';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage']});
let failures=[];
async function check(condition,description){if(!condition)failures.push(description);}
for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:850},deviceScaleFactor:1,locale:'ko-KR',permissions:['clipboard-read','clipboard-write']});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await page.goto(new URL('support-first/',BASE).href,{waitUntil:'domcontentloaded'});
  await check(await page.locator('[data-key]').count()===6, width+'px: six first-help options');
  for(const key of ['talk','friends','school','learn','life','unknown']){
    await page.locator('[data-key="'+key+'"]').click();
    await check(await page.locator('#result').isVisible(),width+'px first result '+key);
    await check(await page.locator('#result-steps li').count()===3,width+'px 3 support steps '+key);
    await check(await page.locator('[data-key="'+key+'"]').getAttribute('aria-pressed')==='true',width+'px pressed first '+key);
  }
  await check(await page.locator('a[href="try/"]').count()===1,width+'px practice link');
  await check(await page.locator('input,textarea,form').count()===0,width+'px no intake form');
  await check(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+3),width+'px first no horizontal overflow');
  await page.screenshot({path:path.join(out,'first-'+width+'.png'),fullPage:true});
  await check(await page.locator('a[href="me/"]').count()===1,width+'px: discover-self first-step link');
  await page.goto(new URL('support-first/me/',BASE).href,{waitUntil:'domcontentloaded'});
  await check(await page.locator('button.option').count()===4,width+'px initial conversation four illustrated cards');
  await check(await page.locator('button.option svg').count()===4,width+'px pictorial options');
  await check(await page.locator('#moa-prompt').isVisible(),width+'px Moa guide visible');
  await check((await page.locator('#question').innerText()).includes('편해'),width+'px rapport-first question');
  await check(await page.locator('form').count()===0,width+'px no public submit form');
  await check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),width+'px intake fits viewport');
  await page.screenshot({path:path.join(out,'myself-start-'+width+'.png'),fullPage:true});
  await page.locator('button[data-option="game"]').click();
  await check(await page.locator('#reply-flow').isVisible(),width+'px Moa reacts to interest');
  await page.locator('#own-words summary').click();
  await page.locator('#own-input').fill('나는 게임이 좋아');
  await page.locator('#own-send').click();
  await check(await page.locator('#typed-exchange').isVisible(),width+'px typed message visible without NLP');
  await page.locator('#next').click();
  await check((await page.locator('#question').innerText()).includes('신경'),width+'px current-concerns question');
  await page.locator('button[data-option="school"]').click();
  await check((await page.locator('#moa-reaction').innerText()).includes('학교'),width+'px school-specific neutral response');
  await page.locator('#own-words summary').click();
  await page.locator('#own-input').fill('학교 가는 길이 힘들어');
  await page.locator('#next').click();
  await check((await page.locator('#question').innerText()).includes('학교'),width+'px school specific context branch');
  await check(await page.locator('button[data-option="enter"]').count()===1,width+'px entering-classroom choice');
  await page.locator('button[data-option="enter"]').click();
  await page.locator('#next').click();
  await check((await page.locator('#question').innerText()).includes('편'),width+'px support preferences');
  await page.locator('button[data-option="text"]').click();
  await page.locator('#next').click();
  await check((await page.locator('#question').innerText()).includes('도움'),width+'px desired assistance');
  await page.locator('button[data-option="express"]').click();
  await page.locator('#next').click();
  await check(await page.locator('#result').isVisible(),width+'px initial consultation summary rendered');
  await check(await page.locator('.discovery').count()===5,width+'px five observation facets');
  await check(await page.locator('[data-share]').count()===5,width+'px youth controls handoff subjects');
  await check(await page.locator('#copy').isDisabled(),width+'px default no disclosure');
  await check(await page.locator('#print').isDisabled(),width+'px default printing disabled');
  await check((await page.locator('#print-safe-body').textContent())==='',width+'px no printable personal data without consent');
  await check((await page.locator('#intro-text').inputValue())==='',width+'px default blank handoff');
  await page.locator('input[data-share="concern"]').check();
  await check((await page.locator('#intro-text').inputValue()).includes('학교·공부'),width+'px chosen concern reflected');
  await check(!(await page.locator('#intro-text').inputValue()).includes('게임하는'),width+'px undisclosed interests excluded');
  await check(!(await page.locator('#intro-text').inputValue()).includes('학교 가는 길'),width+'px student free text excluded by default');
  await page.locator('input[data-note="concern"]').check();
  await check((await page.locator('#intro-text').inputValue()).includes('학교 가는 길'),width+'px separately consented free text included');
  await page.locator('input[data-share="concern"]').uncheck();
  await check(await page.locator('input[data-note="concern"]').isDisabled(),width+'px note consent disabled after topic withdrawal');
  await check(!(await page.locator('#intro-text').inputValue()).includes('학교 가는 길'),width+'px withdrawn note no longer present in shared text');
  await check(!(await page.locator('#print-safe-body').textContent()).includes('학교 가는 길'),width+'px withdrawn note no longer printable');
  await page.locator('input[data-share="concern"]').check();
  await check(await page.locator('input[data-note="concern"]').isEnabled(),width+'px note permission available only after topic reselected');
  await check(!(await page.locator('input[data-note="concern"]').isChecked()),width+'px old note consent not restored silently');
  await check(!(await page.locator('#intro-text').inputValue()).includes('학교 가는 길'),width+'px unapproved note excluded after reselect');
  await page.locator('input[data-note="concern"]').check();
  await check((await page.locator('#intro-text').inputValue()).includes('학교 가는 길'),width+'px explicit new note consent required');
  await page.locator('input[data-share="support"]').check();
  await check((await page.locator('#intro-text').inputValue()).includes('글·선택지'),width+'px requested communication style');
  // Print media must never reveal hidden/unshared notes, choice lists or clinician sections.
  await check((await page.locator('#print-safe-body').textContent()).includes('학교·공부'),width+'px print contains consented subject');
  await check(!(await page.locator('#print-safe-body').textContent()).includes('게임하는'),width+'px print excludes unshared interest');
  await page.locator('.clinician-guide summary').click();
  await page.locator('.discovery-toggle summary').click();
  await page.emulateMedia({media:'print'});
  await check(await page.locator('#print-safe').isVisible(),width+'px safe print document visible');
  await check(await page.locator('#handoff-select').isHidden(),width+'px hidden checkbox labels in print');
  await check(await page.locator('.clinician-guide').isHidden(),width+'px hidden clinician guidance in print');
  await check(await page.locator('.discovery-toggle').isHidden(),width+'px hidden unshared reflection in print');
  await check(await page.locator('.welcome-note').isHidden(),width+'px hidden starting note in print');
  await page.emulateMedia({media:'screen'});
  await page.locator('.clinician-guide summary').click();
  await page.locator('.discovery-toggle summary').click();
  await page.screenshot({path:path.join(out,'myself-story-'+width+'.png'),fullPage:true});
  await page.locator('#intro-text').fill('먼저 문자로 얘기하고 싶어요.');
  await check((await page.locator('#intro-text').inputValue()).includes('먼저 문자'),width+'px student edits disclosure');
  await check((await page.locator('#print-safe-body').textContent()).includes('먼저 문자'),width+'px print reflects student-edited summary');
  await page.locator('#rebuild').click();
  await check((await page.locator('#intro-text').inputValue()).includes('학교·공부'),width+'px explicit reset to selected fields');
  await page.locator('#copy').click();
  await page.waitForFunction(()=>document.querySelector('#copy-feedback')?.textContent?.length>5,{timeout:4000});
  await check(await page.locator('a[href="../make/"]').count()===1,width+'px optional next creative step preserved');
  await page.locator('#revisit').click();
  await check(await page.locator('button[data-option="express"]').getAttribute('aria-pressed')==='true',width+'px revisiting keeps choices');
  await page.locator('#back').click();
  await check(await page.locator('button[data-option="text"]').getAttribute('aria-pressed')==='true',width+'px back retains support choice');
  // A previously consented topic must NOT remain auto-shared after any revision.
  await page.locator('button[data-option="example"]').click();
  await check((await page.locator('#print-safe-body').textContent())==='',width+'px old printable draft cleared immediately after revision');
  await check(await page.locator('#print').isDisabled(),width+'px old print permission withdrawn before returning to summary');
  await check(await page.locator('#copy').isDisabled(),width+'px old copy permission withdrawn before returning to summary');
  await page.locator('#next').click();
  await page.locator('#next').click();
  await check(!(await page.locator('input[data-share="support"]').isChecked()),width+'px support choice change revokes previous consent');
  await check(!(await page.locator('#intro-text').inputValue()).includes('글·선택지'),width+'px previous support is no longer shared');
  // Directly changing student wording also revokes the old note consent.
  await page.locator('#revisit').click();
  for(let i=0;i<3;i++)await page.locator('#back').click();
  await check((await page.locator('#question').innerText()).includes('신경'),width+'px revisiting concern for privacy test');
  await page.locator('#own-words summary').click();
  await page.locator('#own-input').fill('상담에서 천천히 얘기하고 싶어');
  for(let i=0;i<4;i++)await page.locator('#next').click();
  await check(!(await page.locator('input[data-share="concern"]').isChecked()),width+'px editing private note revokes all concern sharing');
  await check(!(await page.locator('#intro-text').inputValue()).includes('상담에서 천천히'),width+'px newly typed note never silently shared');
  await page.locator('#revisit').click();
  for(let i=0;i<3;i++)await page.locator('#back').click();
  await page.locator('button[data-option="people"]').click();
  await page.locator('#next').click();
  await check((await page.locator('#question').innerText()).includes('사람'),width+'px changed concern branches immediately');
  await check(await page.locator('button.option[aria-pressed="true"]').count()===0,width+'px outdated school moment cleared');
  for(let i=0;i<3;i++)await page.locator('#next').click();
  await check(!(await page.locator('input[data-share="concern"]').isChecked()),width+'px topic change leaves consent off');
  await check(!(await page.locator('#intro-text').inputValue()).includes('학교 가는 길'),width+'px old school note remains private');
  await page.reload({waitUntil:'domcontentloaded'});
  await check(await page.locator('button.option[aria-pressed="true"]').count()===0,width+'px reload clears personal answers');
  // "Unsure" is a meaningful answer, distinct from refusal and from a diagnosis.
  await page.locator('button[data-option="game"]').click();
  await page.locator('#own-words summary').click();
  await page.locator('#own-input').fill('이전 답변에 쓰던 말');
  await page.locator('#unsure').click();
  await check(await page.locator('#unsure').getAttribute('aria-pressed')==='true',width+'px unsure choice shows selected state');
  await check((await page.locator('#moa-reaction').textContent()).includes('정하지 않아도'),width+'px Moa neutrally accepts uncertainty');
  await page.locator('#next').click();
  await page.locator('#unsure').click();
  await page.locator('#next').click();
  await check((await page.locator('#question').textContent()).includes('어느 순간'),width+'px unsure concern falls back to neutral scene');
  await check(!(await page.locator('#moa-prompt').textContent()).includes('‘’'),width+'px no blank concern name');
  for(let i=0;i<3;i++)await page.locator('#skip').click();
  await check(await page.locator('#result').isVisible(),width+'px uncertain and skipped answers finish normally');
  await check((await page.locator('#discoveries').textContent()).includes('아직 잘 모르겠어'),width+'px unsure remains an explicit answer');
  await check(!(await page.locator('#discoveries').textContent()).includes('이전 답변에 쓰던 말'),width+'px old free text not carried into unsure');
  await check(await page.locator('#copy').isDisabled(),width+'px unsure never triggers automatic sharing');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#finish-early').click();
  await check(await page.locator('#result').isVisible(),width+'px youth can stop immediately');
  await check(await page.locator('#copy').isDisabled(),width+'px no sharing from unanswered visit');
  await page.locator('#revisit').click();
  for(let i=0;i<5;i++)await page.locator('#skip').click();
  await check(await page.locator('#result').isVisible(),width+'px all consultation prompts optional');
  await check((await page.locator('#intro-text').inputValue())==='',width+'px no automatic handoff after all skips');
  await check(await page.locator('#print').isDisabled(),width+'px print remains disabled after all skipped');
  await check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),width+'px intake result no horizontal overflow');
  // Conversation branches: school attendance, friendship stress, energy and routine.
  for(const [topic,expected] of [['school','enter'],['people','reply'],['feeling','night'],['daily','change']]){
    await page.goto(new URL('support-first/me/',BASE).href,{waitUntil:'domcontentloaded'});
    await page.locator('#skip').click();
    await page.locator('button[data-option="'+topic+'"]').click();
    await page.locator('#next').click();
    await check(await page.locator('button[data-option="'+expected+'"]').count()===1,width+'px context-specific option '+topic);
    await page.locator('button[data-option="'+expected+'"]').click();
    const selectedLabel=await page.locator('button[data-option="'+expected+'"] .option-label').textContent();
    await check((await page.locator('#moa-reaction').textContent()).includes(selectedLabel),width+'px grounded Moa reaction '+topic);
    const extra={school:'더 편하게',people:'생각할 시간',feeling:'잠과 기분',daily:'필요한 도움'}[topic];
    await check((await page.locator('#moa-reaction').textContent()).includes(extra),width+'px specific non-diagnostic reflection '+topic);
    await page.locator('#next').click();
    await page.locator('#skip').click();
    await page.locator('#skip').click();
    await check(await page.locator('#result').isVisible(),width+'px branch '+topic+' completes without forced text');
    if(topic==='people'){
      await page.locator('#revisit').click();
      await page.locator('#back').click();
      await page.locator('#back').click();
      await page.locator('#back').click();
      await page.locator('button[data-option="school"]').click();
      await page.locator('#next').click();
      await check((await page.locator('#question').innerText()).includes('학교'),width+'px changing concern adjusts follow-up context');
      await check(await page.locator('button.option[aria-pressed="true"]').count()===0,width+'px previous context answer erased after changing concern');
    }
  }
  await page.goto(new URL('support-first/make/',BASE).href,{waitUntil:'domcontentloaded'});
  await check(await page.locator('a[href="../me/"]').count()>=1,width+'px: workshop links back to self discovery');
  await page.goto(new URL('support-first/try/',BASE).href,{waitUntil:'domcontentloaded'});
  await check(await page.locator('[data-topic]').count()===4,width+'px four practice scenarios');
  for(const k of ['reply','school','exam','trade']){
    await page.locator('[data-topic="'+k+'"]').click();
    await check(await page.locator('#answers button').count()===3,width+'px three responses '+k);
    for(const answer of await page.locator('#answers button').all()){
      await answer.click();
      await check(await page.locator('#feedback').isVisible(),width+'px feedback '+k);
      await check(await page.locator('#next-steps li').count()===3,width+'px three next steps '+k);
      await check((await page.locator('#example-message').innerText()).length>10,width+'px prepared message '+k);
    }
    await check(await page.locator('[data-topic="'+k+'"]').getAttribute('aria-pressed')==='true',width+'px active '+k);
  }
  await check(await page.locator('input,textarea,form').count()===0,width+'px no practice intake form');
  await check(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+3),width+'px practice no horizontal overflow');
  await page.screenshot({path:path.join(out,'practice-'+width+'.png'),fullPage:true});
  await page.goto(new URL('support-first/service/',BASE).href,{waitUntil:'domcontentloaded'});
  await check(await page.locator('[data-need]').count()===5,width+'px 5 support need options');
  await check(await page.locator('[data-method]').count()===5,width+'px 5 communication preferences');
  await page.locator('[data-need="학교생활·등교"]').click();
  await page.locator('[data-method="글·채팅부터"]').click();
  const msg=await page.locator('#message').innerText();
  await check(msg.includes('학교생활·등교')&&msg.includes('글·채팅부터'),width+'px generated starter message');
  await check(await page.locator('a[href="https://pf.kakao.com/_wEGJn"]').count()===1,width+'px official kakao channel');
  await check(await page.locator('input,textarea,form').count()===0,width+'px no sensitive-data intake form');
  await check(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+3),width+'px support guide no horizontal overflow');
  await page.screenshot({path:path.join(out,'service-'+width+'.png'),fullPage:true});
  await page.goto(new URL('support-first/programs/',BASE).href,{waitUntil:'domcontentloaded'});
  await check(await page.locator('[data-code]').count()===5,width+'px five curriculum options');
  for(const code of ['C01','C02','C03','C04','C05']){
    await page.locator('[data-code="'+code+'"]').click();
    await check(await page.locator('#detail').isVisible(),width+'px details open '+code);
    await check(await page.locator('#lessons tr').count()===8,width+'px eight practical sessions '+code);
    await check((await page.locator('#objective').innerText()).length>12,width+'px measurable objective '+code);
    await check((await page.locator('#caution').innerText()).length>15,width+'px caution note '+code);
    await check(await page.locator('[data-code="'+code+'"]').getAttribute('aria-pressed')==='true',width+'px chosen '+code);
  }
  await check(await page.locator('input,textarea,form').count()===0,width+'px no patient data form');
  await check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),width+'px curriculum no overflow');
  await page.screenshot({path:path.join(out,'curricula-'+width+'.png'),fullPage:true});
  await page.goto(new URL('support-first/make/',BASE).href,{waitUntil:'domcontentloaded'});
  await check(await page.locator('button[data-world]').count()===3,width+'px 3 worlds');
  await check(await page.locator('button[data-hero]').count()===3,width+'px 3 characters');
  await check(await page.locator('[data-quest]').count()===3,width+'px 3 story goals');
  await check(await page.locator('a[href="make/"]').count()===0,width+'px no broken self-link');
  for(const world of ['space','ocean','forest']){
    await page.locator('button[data-world="'+world+'"]').click();
    await check(await page.locator('.stage').getAttribute('data-world')===world,width+'px world changes '+world);
    await check(await page.locator('button[data-world="'+world+'"]').getAttribute('aria-pressed')==='true',width+'px world selected '+world);
  }
  for(const hero of ['guardian','explorer','maker']){
    await page.locator('button[data-hero="'+hero+'"]').click();
    await check(await page.locator('.stage').getAttribute('data-hero')===hero,width+'px hero changes '+hero);
  }
  for(const quest of ['friend','signal','bridge']){
    await page.locator('button[data-quest="'+quest+'"]').click();
    await check((await page.locator('#story-text').innerText()).length>30,width+'px story updates '+quest);
  }
  await page.locator('#my-idea').fill('작은 비밀 문을 만들자');
  await check((await page.locator('#idea-preview').innerText()).includes('작은 비밀 문'),width+'px typing appears safely in preview');
  await check((await page.locator('#char-count').innerText()).includes(' / 160'),width+'px length counter');
  for(const response of ['try','help','rest']){
    await page.locator('button[data-response="'+response+'"]').click();
    await check(await page.locator('#challenge-result').isVisible(),width+'px obstacle reflection '+response);
  }
  await page.locator('#again').click();
  await check(await page.locator('#challenge-result').isHidden(),width+'px allow different approach');
  for(const cheer of ['kind','ask','idea','quiet']){
    await page.locator('button[data-cheer="'+cheer+'"]').click();
    await check((await page.locator('#reaction-preview').innerText()).length>12,width+'px fictional encouragement '+cheer);
  }
  await page.locator('button[data-next="learn"]').click();
  await check((await page.locator('#closing-message').innerText()).includes('배우'),width+'px voluntary next challenge');
  await check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),width+'px workshop no horizontal overflow');
  await page.screenshot({path:path.join(out,'co-create-'+width+'.png'),fullPage:true});
  await page.reload({waitUntil:'domcontentloaded'});
  await check((await page.locator('#my-idea').inputValue())==='',width+'px no persisted student free text');
  await check((await page.locator('#scene-label').innerText()).includes('달빛 숲'),width+'px default scene after reload');
  await page.locator('#surprise').click();
  await check(await page.locator('.stage').getAttribute('data-world')==='space',width+'px predictable alternative combination');
  await page.locator('#reset').click();
  await check(await page.locator('.stage').getAttribute('data-world')==='forest',width+'px reset to initial world');
  await check((await page.locator('#my-idea').inputValue())==='',width+'px reset blank text');
  await check(errors.length===0,width+'px JS errors: '+errors.join('|'));
  await context.close();
}
await browser.close();
console.log(JSON.stringify({base:BASE,failures,screenshots:14},null,2));
if(failures.length)process.exit(1);

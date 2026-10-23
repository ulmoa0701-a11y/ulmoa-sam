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
  await check(await page.locator('button.choice[data-choice]').count()===4,width+'px: four illustrated cards only');
  await check(await page.locator('.choice .art svg').count()===4,width+'px: four visual choice illustrations');
  await check(await page.locator('#step-view').isVisible(),width+'px: single simple question displayed');
  await check(await page.locator('textarea,input,form').count()===0,width+'px: no writing fields or sensitive info form');
  await check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),width+'px: first step fits horizontally');
  await page.screenshot({path:path.join(out,'myself-start-'+width+'.png'),fullPage:true});
  await page.locator('button[data-choice="game"]').click();
  await page.locator('button[data-choice="create"]').click();
  await check(await page.locator('button.choice[aria-pressed="true"]').count()===2,width+'px: two student interests accepted');
  await page.locator('#continue').click();
  await check((await page.locator('#question-title').innerText()).includes('편해'),width+'px: communication preference next');
  await check(await page.locator('button.choice').count()===4,width+'px: still four options on second step');
  await page.locator('button[data-choice="text"]').click();
  await page.locator('#continue').click();
  await page.locator('button[data-choice="time"]').click();
  await page.locator('#continue').click();
  await page.locator('button[data-choice="make"]').click();
  await page.locator('#continue').click();
  await check(await page.locator('#outcome').isVisible(),width+'px: simple personal map shown');
  await check(await page.locator('.summary-item').count()===4,width+'px: four student-chosen aspects in map');
  await check((await page.locator('#summary').innerText()).includes('게임'),width+'px: interest reflected in own map');
  await check((await page.locator('#summary').innerText()).includes('기다려 주기'),width+'px: support preference reflected');
  await check(await page.locator('a.go-make[href="../make/"]').count()===1,width+'px: voluntary link to making');
  await page.locator('.export summary').click();
  await page.locator('#copy').click();
  await check((await page.locator('#export-status').innerText()).length>5,width+'px: optional copy feedback');
  await page.screenshot({path:path.join(out,'myself-map-'+width+'.png'),fullPage:true});
  await page.locator('#edit').click();
  await check(await page.locator('button[data-choice="game"]').getAttribute('aria-pressed')==='true',width+'px: choices preserved for revision');
  await page.reload({waitUntil:'domcontentloaded'});
  await check(await page.locator('button.choice[aria-pressed="true"]').count()===0,width+'px: preferences never persisted');
  for(let i=0;i<4;i++)await page.locator('#continue').click();
  await check((await page.locator('#summary').innerText()).includes('아직 모르겠어'),width+'px: optional skipping allowed');
  await check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),width+'px: result fits horizontally');
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

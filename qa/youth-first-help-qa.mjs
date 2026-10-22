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
  await check(errors.length===0,width+'px JS errors: '+errors.join('|'));
  await context.close();
}
await browser.close();
console.log(JSON.stringify({base:BASE,failures,screenshots:4},null,2));
if(failures.length)process.exit(1);

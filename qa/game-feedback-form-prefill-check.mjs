import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {chromium}=require('playwright-core');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1100,height:900}});
 const name='모아 자동 입력 확인';
 const keys=['gameName','q2_textbox0','q2_q2_textbox0','textbox0'];
 let working=null;const attempts=[];
 for(const key of keys){
  const url='https://form.jotform.com/262983367931066?'+new URLSearchParams({[key]:name}).toString();
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('#input_2').waitFor({state:'attached',timeout:15000});
  await page.waitForTimeout(500);
  const value=await page.locator('#input_2').inputValue();
  attempts.push({key,http:response?.status(),autofilled:value===name});
  if(value===name){working=key;break}
 }
 const gameFieldHidden=!(await page.locator('#input_2').isVisible());
 const visibleFields=await page.locator('li.form-line').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).display!=='none'&&n.getClientRects().length>0).map(n=>(n.querySelector('label')?.textContent||'').trim().replace(/\\s+/g,' ').slice(0,70)).filter(Boolean));
 console.log('JOTFORM PREFILL CHECK '+JSON.stringify({attempts,working,gameFieldHidden,visibleFields}));
 assert.ok(working,'None of the tested unique field names prefilled the public game title');
 assert.ok(gameFieldHidden,'Automatic game field should not be shown to respondents');
 if(working!=='q2_textbox0')console.log('CHANGE FIELD KEY TO '+working);
}finally{await browser.close()}

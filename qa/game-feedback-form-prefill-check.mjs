import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {chromium}=require('playwright-core');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1100,height:900}});
 const name='모아 자동 입력 확인';
 const url='https://form.jotform.com/262983367931066?gameName='+encodeURIComponent(name);
 const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForTimeout(1600);
 const fields=await page.locator('input,textarea,select').evaluateAll(nodes=>nodes.filter(el=>el.name||el.id).map(el=>({id:el.id,name:el.name,type:el.type||el.tagName,value:(el.value||'').slice(0,90),label:el.closest('li.form-line')?.querySelector('label')?.textContent?.trim().slice(0,80)})).filter(x=>x.label||x.value));
 const found=fields.some(x=>x.value.includes(name));
 console.log('JOTFORM FIELD INSPECTION '+JSON.stringify({http:response?.status(),fields,gameNamePrefilled:found}));
 // This test intentionally does not create a child submission.
 if(!response?.ok())process.exitCode=1;
}finally{await browser.close()}

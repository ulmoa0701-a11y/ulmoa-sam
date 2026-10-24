const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const width of [390,1360]){
   const page=await browser.newPage({viewport:{width,height:900},locale:'ko-KR'});
   await page.goto('https://ulmoa0701-a11y.github.io/ulmoa-sam/request/',{waitUntil:'domcontentloaded',timeout:55000});
   assert.ok((await page.title()).includes('이야기해봄'));
   assert.equal(await page.locator('#publicPostTab').count(),1);
   assert.equal(await page.locator('#privatePostTab').count(),1);
   assert.equal(await page.locator('.community-iframe').count(),1);
   assert.match(await page.locator('.community-iframe').getAttribute('src'),/script\.google\.com\/macros/);
   await page.locator('#privatePostTab').click();
   assert.equal(await page.locator('#privatePostPanel').isVisible(),true);
   assert.equal(await page.locator('#publicPostPanel').isHidden(),true);
   assert.match(await page.locator('#habomPrivateForm').getAttribute('src'),/form\.jotform\.com\/262832846022052/);
   await page.locator('#publicPostTab').click();
   assert.equal(await page.locator('#publicPostPanel').isVisible(),true);
   const over=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+4);
   assert.equal(over,false,'overflow at '+width);
   await page.screenshot({path:'habom-current-live-'+width+'.png',fullPage:true});
   console.log('PASS live production '+width+'px: old public/private entrypoints preserved');
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||String(e));process.exit(1);});

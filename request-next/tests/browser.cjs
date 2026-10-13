const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const width of [320,390,1360]){
   const page=await browser.newPage({viewport:{width,height:900},locale:'ko-KR'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   let submitted=false;
   await page.route('**/api/posts',route=>{
    if(route.request().method()==='POST'){
      submitted=true;
      return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,id:'11111111-1111-4111-8111-111111111111',receipt:'a'.repeat(64)})});
    }
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({posts:[],locked:[]})});
   });
   await page.route('**/api/mine/**',route=>route.fulfill({status:403,contentType:'application/json',body:'{"error":"blocked"}'}));
   await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:30000});
   assert.equal(await page.locator('#postForm').count(),1);
   assert.equal(await page.locator('input[name="visibility"]').count(),3);
   assert.equal(await page.locator('#secretOptions').isHidden(),true);
   await page.locator('input[value="list"]').check();
   assert.equal(await page.locator('#secretOptions').isVisible(),true);
   assert.equal(await page.locator('#publicSafety').isHidden(),true);
   await page.locator('input[value="hidden"]').check();
   assert.equal(await page.locator('#secretOptions').isVisible(),true);
   await page.locator('input[value="public"]').check();
   assert.equal(await page.locator('#secretOptions').isHidden(),true);
   assert.equal(await page.locator('.note-hero').count(),1,'memo delivery hero should exist');
   assert.equal(await page.locator('.prompt-chip').count(),5,'five useful starters should exist');
   await page.locator('.prompt-chip[data-kind="사용 후기"]').click();
   assert.equal(await page.locator('#category').inputValue(),'사용 후기');
   assert.match(await page.locator('#body').inputValue(),/직접 써보니/);
   assert.match(await page.locator('#memoCount').innerText(),/2,000/);
   await page.locator('#body').fill('이미 적고 있는 메모');
   await page.locator('.prompt-chip[data-kind="질문"]').click();
   assert.equal(await page.locator('#body').inputValue(),'이미 적고 있는 메모','starter must not erase existing memo');
   assert.equal(await page.locator('#category').inputValue(),'질문');
   await page.locator('#anonymous').check();
   assert.equal(await page.locator('#nickname').isDisabled(),true);
   await page.locator('#body').fill('자동화로 작성한 테스트용 공개글입니다.');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2);
   assert.equal(overflow,false,'horizontal overflow at '+width);
   await page.locator('#sendButton').click();
   await page.locator('#receiptPanel').waitFor({state:'visible',timeout:9000});
   assert.ok(submitted,'did not submit');
   const code=await page.locator('#receiptCode').inputValue();
   assert.ok(code.includes('11111111')&&code.endsWith('a'.repeat(64)));
   await page.locator('#openMine').click();
   assert.equal(await page.locator('#postToken').inputValue(),'a'.repeat(64));
   assert.deepEqual(errors,[],'browser JS errors');
   await page.screenshot({path:'habom-staging-'+width+'.png',fullPage:true});
   console.log('PASS '+width+'px unified public/list/hidden form, anonymous, posting, receipt, scroll');
   await page.close();
  }
  const page=await browser.newPage({viewport:{width:390,height:844},locale:'ko-KR'});
  await page.route('**/api/posts',route=>route.fulfill({status:200,contentType:'application/json',body:'{"posts":[],"locked":[]}'}));
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
  const roles=['보호자','특수교사','음악치료사','언어재활사','인지치료사','아동·청소년'];
  assert.equal(await page.locator('.step').count(),3,'first-time writer should see three ordered sections');
  await page.locator('.step details.more').last().locator('summary').click();
  for(const role of roles){
    await page.locator('#role').selectOption({label:role});
    assert.equal(await page.locator('#role').inputValue(),role,'persona role '+role);
  }
  await page.locator('input[value="public"]').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('input[value="list"]').isChecked(),true,'keyboard should select locked mode');
  assert.equal(await page.locator('#secretOptions').isVisible(),true);
  await page.locator('input[value="hidden"]').check();
  await page.locator('#secretOptions details summary').click();
  await page.locator('#email').fill('privacy-persona@example.test');
  await page.locator('#body').fill('안전성 검사: 실제 전송 없음');
  await page.locator('#nickname').fill('가상 이용자');
  await page.locator('#sendButton').click();
  assert.match(await page.locator('#formStatus').innerText(),/비공개 쪽지 보관·이용 동의/);
  console.log('PASS personas: parent, special educator, music/speech/cognitive therapist, child, keyboard, privacy-sensitive visitor');
  await page.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||String(e));process.exit(1)});

const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

(async()=>{
  const browser=await chromium.launch({headless:true});
  const base=process.env.GLOSSARY_QA_URL||'http://127.0.0.1:8765/notes/';
  const screens=path.resolve('glossary-qa-screenshots');
  fs.mkdirSync(screens,{recursive:true});
  const targets=['memo-working-memory','memo-short-term-memory','memo-processing-speed','memo-attention','memo-memory','memo-visual','memo-auditory','memo-receptive-expressive','memo-receptive-expressive','memo-aac','memo-prompting','memo-reinforcement'];
  const profiles=[
    {name:'mobile-small',width:360,height:780,columns:2},
    {name:'mobile',width:390,height:844,columns:2},
    {name:'tablet',width:768,height:1024,columns:2},
    {name:'desktop',width:1440,height:900,columns:4}
  ];
  try{
    for(const profile of profiles){
      const page=await browser.newPage({viewport:{width:profile.width,height:profile.height},deviceScaleFactor:1});
      const errors=[];
      page.on('pageerror',error=>errors.push(String(error)));
      await page.goto(base,{waitUntil:'networkidle',timeout:90000});
      await page.locator('.glossary-approved-card img').evaluateAll(els=>els.forEach(el=>{el.loading='eager'}));
      await page.waitForFunction(()=>Array.from(document.querySelectorAll('.glossary-approved-card img')).every(el=>el.complete&&el.naturalWidth>0),{timeout:30000});
      const cards=page.locator('.glossary-approved-card');
      assert.equal(await cards.count(),12,profile.name+' must contain 12 independent images');
      assert.equal(await page.locator('.glossary-original-board').count(),0,'old giant horizontally scrolling image must be gone');
      const data=await cards.evaluateAll(els=>els.map(x=>({
        x:x.getBoundingClientRect().x,
        w:x.getBoundingClientRect().width,
        imageName:x.querySelector('img')?.getAttribute('src'),
        naturalWidth:x.querySelector('img')?.naturalWidth,
        naturalHeight:x.querySelector('img')?.naturalHeight,
        loaded:x.querySelector('img')?.complete,
        imageWidth:x.querySelector('img')?.getBoundingClientRect().width
      })));
      for(const [i,card] of data.entries()){
        assert(card.imageName.endsWith('.webp'),'image must be a separate webp file');
        assert.equal(card.naturalWidth,1122,'full-resolution approved image '+i+' on '+profile.name);
        assert.equal(card.naturalHeight,1402,'full image '+i+' on '+profile.name);
        assert(card.loaded,'loaded image '+i);
        assert(card.x>=0&&card.x+card.w<=profile.width+2,'card must not exceed viewport '+i);
      }
      assert.equal(new Set(data.map(x=>Math.round(x.x))).size,profile.columns,profile.name+' columns');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,profile.name+' must have no horizontal page scroll');
      if(profile.name.startsWith('mobile')){
        assert(data[0].imageWidth>=120,'compact mobile card retains adequate tap surface');
        const availableHeight=await page.locator('.glossary-approved-grid').evaluate(n=>n.getBoundingClientRect().height);
        assert(availableHeight<1700,'compact mobile grid should not require excessive scrolling');
      }
      assert.equal(await page.locator('.study-note').count(),30,'all original 30 detailed entries must remain');
      await page.screenshot({path:path.join(screens,profile.name+'-cards.png'),fullPage:false});
      const dialog=page.locator('#glossaryCardDialog');
      for(let i=0;i<12;i++){
        await cards.nth(i).click();
        assert.equal(await dialog.evaluate(n=>n.open),true,profile.name+' dialog must open from image card '+i);
        assert((await page.locator('#glossaryDialogTitle').textContent()).trim().length>0,'dialog title must be readable');
        assert((await page.locator('#glossaryDialogBody').textContent()).trim().length>70,'dialog should show the real explanation and examples');
        assert.equal(await page.locator('#'+targets[i]).evaluate(n=>n.open),false,'original note must not scroll open');
        await page.locator('#glossaryDialogClose').click();
        assert.equal(await dialog.evaluate(n=>n.open),false,'dialog close should work');
      }
      if(profile.name==='mobile'){
        await page.locator('#glossarySearch').fill('작업기억');
        await cards.nth(9).click();
        assert.equal(await dialog.evaluate(n=>n.open),true,'AAC dialog must work after search');
        assert.equal(await page.locator('#glossarySearch').inputValue(),'작업기억','image dialog must preserve search query');
        await page.keyboard.press('Escape');
        assert.equal(await dialog.evaluate(n=>n.open),false,'Escape should close image dialog');
        const toggle=page.locator('#glossaryViewSwitch');
        await toggle.click();
        assert.equal(await page.locator('#glossaryApprovedGrid').evaluate(n=>n.classList.contains('is-large')),true,'one-column optional large view');
        assert.equal(await page.locator('.glossary-approved-card').first().evaluate(n=>n.getBoundingClientRect().width>=250),true,'large view card');
        await toggle.click();
        assert.equal(await page.locator('#glossaryApprovedGrid').evaluate(n=>n.classList.contains('is-large')),false,'restore compact default view');
      }
      if(profile.name==='mobile') await page.locator('#glossarySearch').fill('');
      // Non-image text entries still expand as original accordion.
      await page.locator('#memo-executive > summary').click();
      assert.equal(await page.locator('#memo-executive').evaluate(n=>n.open),true,'remaining glossary entries still expand');
      assert.deepEqual(errors,[],profile.name+' uncaught JS errors');
      console.log(profile.name+': PASS 12 images, '+profile.columns+' columns, dialogs + closing, original 30 entries');
      await page.close();
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

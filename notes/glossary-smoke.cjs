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
    {name:'mobile',width:390,height:844,columns:1},
    {name:'tablet',width:768,height:1024,columns:2},
    {name:'desktop',width:1440,height:900,columns:4}
  ];
  try{
    for(const profile of profiles){
      const page=await browser.newPage({viewport:{width:profile.width,height:profile.height},deviceScaleFactor:1});
      const errors=[];
      page.on('pageerror',error=>errors.push(String(error)));
      await page.goto(base,{waitUntil:'networkidle',timeout:90000});
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
      const firstRow=data.filter(x=>Math.abs(x.x-data[0].x)<3);
      if(profile.columns===1){assert.equal(firstRow.length,12,'mobile one column to preserve readable image text');assert(data[0].imageWidth>=270,'mobile card image must be large enough');}
      else{assert.equal(new Set(data.map(x=>Math.round(x.x))).size,profile.columns,profile.name+' columns');}
      assert.equal(await page.locator('.study-note').count(),30,'all original 30 detailed entries must remain');
      await page.screenshot({path:path.join(screens,profile.name+'-cards.png'),fullPage:false});
      for(let i=0;i<12;i++){
        await cards.nth(i).click();
        await page.waitForTimeout(130);
        assert.equal(await page.locator('#'+targets[i]).evaluate(n=>n.open),true,profile.name+' click target '+i);
      }
      if(profile.name==='mobile'){
        await page.locator('#glossarySearch').fill('작업기억');
        await cards.nth(9).click();
        assert.equal(await page.locator('#glossarySearch').inputValue(),'','card click must reset filters');
        assert.equal(await page.locator('#memo-aac').evaluate(n=>n.open),true,'AAC opens even after searching another term');
      }
      assert.deepEqual(errors,[],profile.name+' uncaught JS errors');
      console.log(profile.name+': PASS 12 images, '+profile.columns+' grid columns, clickable details, 30 preserved entries');
      await page.close();
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

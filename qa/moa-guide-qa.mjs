import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const root=process.env.MOA_BASE||'http://127.0.0.1:8765/';
const out='qa/moa-guide-artifacts';
const specs=[
 ['home','',false],['brain-map','brain-map/',false],['gardens','gardens/',true],
 ['thinking-garden','thinking-garden/',true],['music-garden','music-garden/',true],
 ['materials','materials/',false],['notes','notes/',false],['parents','parents/',false],
 ['info','info/',false],['request','request/',false],['test','test/',false],
 ['heart-score','heart-score/',false],['boomwhacker','boomwhacker/',false]
];
const modes=[['desktop',1440,900],['tablet',820,920],['mobile',390,844],['small-mobile',320,720]];
await mkdir(out,{recursive:true});
const browser=await chromium.launch({
 executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',
 headless:true,args:['--no-sandbox','--disable-dev-shm-usage']
});
const results=[];
try{
 for(const [mode,width,height] of modes){
  for(const [name,path,useExistingMoa] of specs){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<500,isMobile:width<500});
   const errors=[];page.on('pageerror',error=>errors.push(String(error)));
   try{
    const res=await page.goto(root+path,{waitUntil:'domcontentloaded',timeout:35000});
    assert.equal(res?.status(),200,name+' HTTP 200');
    const selector=useExistingMoa?'.moa-guide-line':'.moa-site-guide';
    const item=page.locator(selector);
    assert.equal(await item.count(),1,name+' exactly one guide');
    if(name==='boomwhacker'&&width<=900){
      // Play-first adaptation: keep existing compact Moa image and sentence in
      // the title area; a second banner would move the playing field offscreen.
      assert.equal(await item.isVisible(),false,'hide redundant full banner on active mobile instrument');
      const compact=page.locator('.top .brand p');
      assert.equal(await compact.isVisible(),true);
      assert.match(await compact.innerText(),/모아의 안내/);
      const bg=await compact.evaluate(el=>getComputedStyle(el,'::before').backgroundImage);
      assert.match(bg,/moa-hello-wave-20261012\.webp/);
      results.push({name,mode,width,status:'PASS',adaptation:'compact guide in existing header'});
      continue;
    }
    await item.waitFor({state:'visible',timeout:10000});
    const check=await item.evaluate(el=>{
     const box=el.getBoundingClientRect();
     const p=el.querySelector('p'),st=getComputedStyle(el),ps=p?getComputedStyle(p):null;
     const picture=el.querySelector('img');
     const text=(p?.textContent||'').trim();
     return {
      left:box.left,right:box.right,top:box.top,width:box.width,height:box.height,
      pos:st.position,display:st.display,paragraphFont:ps?.fontSize||'',
      textLength:text.length,hasGuideName:!!el.querySelector('.moa-site-guide__name,.moa-guide-line__name'),
      hasImage:!!picture,imgNaturalWidth:picture?.naturalWidth||0,
      speechInside:!!el.querySelector('.moa-site-guide__speech'),
      cssLoaded:[...document.styleSheets].some(sheet=>(sheet.href||'').includes('moa-site-guide.css'))
     };
    });
    assert.ok(check.hasGuideName && check.textLength>=25 && check.textLength<190,name+' useful short guide');
    assert.ok(check.width>160 && check.height>37,name+' meaningful visible layout: '+JSON.stringify(check));
    assert.ok(check.left>=-1 && check.right<=width+1,name+' guide extends past viewport: '+JSON.stringify(check));
    assert.notEqual(check.pos,'fixed',name+' must not obscure interactions');
    assert.notEqual(check.pos,'absolute',name+' must stay in document flow');
    assert.ok(check.cssLoaded,name+' common guide stylesheet loaded');
    if(useExistingMoa){
     assert.equal(check.hasImage,false,name+' does not duplicate the mascot');
     assert.ok((await page.locator('.garden-hero img,.library-hero img,.music-hero img').count())>=1,
       name+' existing approved mascot retained');
    }else{
     assert.ok(check.hasImage && check.speechInside,name+' approved mascot and real speech bubble present');
     const image=page.locator(selector+' img');
     assert.match(await image.getAttribute('src'),/moa-hello-wave-20261012\.webp/,'approved wave asset');
     const loaded=await image.evaluate(async img=>{
      if(!img.complete)await new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});});
      return img.naturalWidth>0;
     });
     assert.equal(loaded,true,name+' approved mascot image loaded');
    }
    if(name==='brain-map'){
      await page.locator('[data-lobe-scene="ball"]').click();
      assert.match(await page.locator('#brainFocusName').innerText(),/후두엽|두정엽|소뇌/,'brain interactions preserved');
      assert.equal(await page.locator('#brainMap [data-brain-region]').count(),6);
    }
    if(name==='home'){
      assert.equal(await page.locator('.hb-shortcut-card').filter({hasText:'뇌지도'}).count(),1,'shortcut label is 뇌지도');
    }
    if(['home','brain-map','gardens','thinking-garden','music-garden','notes','materials','parents','info','request'].includes(name) && (mode==='desktop'||mode==='mobile')){
      const filename=out+'/'+name+'-'+mode+'.png';
      await page.screenshot({path:filename,fullPage:false,animations:'disabled'});
    }
    results.push({name,mode,width,status:'PASS',guideHeight:Math.round(check.height),pageErrors:errors.slice(0,3)});
   }finally{await page.close();}
  }
 }
 // Existing approved guides should not be replaced or duplicated.
 const extra=await browser.newPage();
 await extra.goto(root+'about/',{waitUntil:'domcontentloaded'});
 assert.equal(await extra.locator('.story-hello-bubble').count(),1,'approved about-page greeting preserved');
 assert.equal(await extra.locator('.moa-site-guide').count(),0,'do not duplicate existing about-page guide');
 await extra.goto(root+'math-garden/',{waitUntil:'domcontentloaded'});
 assert.equal(await extra.locator('.story-guide').count(),1,'math-game internal storytelling guide preserved');
 await extra.close();
 await writeFile(out+'/result.json',JSON.stringify({passed:true,checked:results.length,results},null,2));
 console.log('MOA_GUIDE_QA_PASS '+JSON.stringify({checked:results.length,views:modes.map(x=>x[0]),pages:specs.map(x=>x[0])}));
} catch(error){
 await writeFile(out+'/result.json',JSON.stringify({passed:false,error:String(error),results},null,2));
 console.error('MOA_GUIDE_QA_FAIL',error);process.exitCode=1;
}finally{await browser.close();}

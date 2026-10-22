import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.MOA_BASE||'http://127.0.0.1:8765/';
const out='qa/moa-speaking-artifacts';
const pages=[
 ['home','',true],['brain-map','brain-map/',true],['materials','materials/',true],
 ['notes','notes/',true],['parents','parents/',true],['info','info/',true],
 ['request','request/',true],['gardens','gardens/',false],
 ['music-garden','music-garden/',false],['thinking-garden','thinking-garden/',false]
];
const viewports=[['desktop',1440,900],['tablet',820,920],['mobile',390,844],['small-phone',320,720]];
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const summary=[];
try{
 for(const [size,width,height] of viewports){
  for(const [name,path,hasPortrait] of pages){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   try{
    const res=await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:30000});
    assert.equal(res?.status(),200,name+' HTTP 200');
    const guide=page.locator('.moa-page-guide');
    assert.equal(await guide.count(),1,name+' has exactly one Moa introduction');
    await guide.waitFor({state:'visible'});
    await page.locator('.moa-page-guide__bubble').waitFor({state:'visible'});
    const state=await guide.evaluate(el=>{
      const r=el.getBoundingClientRect(),bubble=el.querySelector('.moa-page-guide__bubble');
      const style=getComputedStyle(bubble),m=el.querySelector('.moa-page-guide__message');
      const ms=getComputedStyle(m);
      const image=el.querySelector('img');
      return {x:r.x,y:r.y,right:r.right,width:r.width,height:r.height,
        borderWidth:parseFloat(style.borderTopWidth),
        background:style.backgroundColor,
        messageSize:parseFloat(ms.fontSize),font:ms.fontFamily,text:m.textContent.trim(),
        imageSrc:image?.getAttribute('src')||'',imageLoaded:!!image?.naturalWidth,
        cssPresent:[...document.styleSheets].some(x=>(x.href||'').includes('moa-page-guide.css?v=20261022-speak1'))};
    });
    assert.ok(state.cssPresent,'updated guide stylesheet used: '+name);
    assert.ok(state.x>=-1&&state.right<=width+1,'horizontal guide fits: '+name+' '+size+' '+JSON.stringify(state));
    assert.ok(state.height>=55&&state.borderWidth>=2,'visible conversation bubble: '+name+' '+size);
    assert.ok(state.text.length>=25,'clear purpose in speech bubble: '+name);
    assert.ok(state.font.includes('Nanum Pen Script'),'hand-lettering applied: '+name+' '+state.font);
    assert.ok(state.messageSize>=20,'handwritten speech is legible: '+name);
    if(hasPortrait){
     const img=guide.locator('.moa-page-guide__portrait');
     await img.evaluate(async im=>{if(!im.complete){await new Promise(r=>{im.addEventListener('load',r,{once:true});im.addEventListener('error',r,{once:true});});}});
     assert.ok(await img.evaluate(im=>im.naturalWidth>0),'approved Moa illustration loads: '+name);
     assert.match(state.imageSrc,/moa-hello-wave-20261012\.webp/);
    }else{
     assert.equal(await guide.locator('img').count(),0,'existing hero Moa is not duplicated');
     assert.ok(await page.locator('.garden-hero img,.music-hero img,.library-hero img').count()>0,'old hero Moa remains');
    }
    if(name==='brain-map'){
     assert.ok(state.y<440,'Moa greeting starts above main map and visible without initial scroll: '+size+' '+state.y);
     const tabs=page.locator('#lobesTab,#hemispheresTab');
     assert.equal(await tabs.count(),2);
     await page.locator('[data-lobe-scene="ball"]').click();
     assert.match(await page.locator('#lobeSceneTitle').innerText(),/공놀이/,'brain map scene still works');
     await page.locator('#hemispheresTab').click();
     assert.equal(await page.locator('#hemispheresTab').getAttribute('aria-selected'),'true');
    }
    if(name==='home'||name==='brain-map'){
     if(width===1440||width===390){
       const nav=page.locator('.hb-nav-link[href*="brain-map/"]');
       await nav.first().waitFor({state:'attached',timeout:12000});
       assert.equal((await nav.first().innerText()).trim().includes('뇌지도'),true,'navigation label updated');
       assert.equal((await nav.first().innerText()).includes('3D 뇌지도'),false,'outdated 3D-only menu gone');
     }
    }
    if(size==='desktop'||size==='mobile'){
     await page.screenshot({path:`${out}/${name}-${size}.png`,fullPage:false,animations:'disabled'});
    }
    summary.push({name,size,width,height,guideTop:Math.round(state.y),textSize:state.messageSize,image:hasPortrait});
   }finally{await page.close();}
  }
 }
 await writeFile(out+'/result.json',JSON.stringify({success:true,checks:summary.length,summary},null,2));
 console.log('MOA_SPEAKING_GUIDE_PASS '+JSON.stringify({checks:summary.length,pages:pages.map(x=>x[0]),viewports:viewports.map(x=>x[0])}));
}catch(e){
 await writeFile(out+'/result.json',JSON.stringify({success:false,error:String(e),summary},null,2));
 console.error('MOA_SPEAKING_GUIDE_FAIL',e);process.exitCode=1;
}finally{await browser.close();}

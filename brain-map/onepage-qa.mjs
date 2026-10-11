import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const out='brain-map/qa-artifacts';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({
 executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',
 headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']
});
const report=[];
const base=process.env.BRAIN_BASE||'http://127.0.0.1:8765/';
const specs=[['desktop',1440,900],['tablet',820,920],['mobile',390,844],['small-mobile',320,720]];
try{
 for(const [name,width,height] of specs){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,isMobile:width<500,hasTouch:width<500});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const response=await page.goto(base+'brain-map/',{waitUntil:'networkidle',timeout:30000});
  assert.equal(response?.status(),200,'homepage HTTP 200');
  await page.locator('#brainMap').waitFor({state:'visible'});
  const photo=page.locator('.brain-one-panel');
  assert.equal(await page.locator('.lobe-card').count(),6,'six main functions are visible');
  assert.equal(await page.locator('.hemi-fact').count(),2,'both hemispheres immediately visible');
  assert.equal(await page.locator('.both-work').count(),1,'brain cooperation statement visible');
  assert.equal(await page.locator('#brainMap [data-brain-region]').count(),6,'six interactive regions');
  assert.equal(await page.locator('.brain-hero,.brain3d-feature,.brain-explorer,.brain-networks,.brain-faq').count(),0,'no prior scrolling sections');
  assert.equal(await page.locator('#simpleDetail').isHidden(),true,'optional detail starts closed');
  assert.equal(await page.locator('.more-learn').getAttribute('open'),null,'advanced features closed by default');
  assert.notEqual(await page.locator('.sub-footer .footer-social').evaluate(el=>getComputedStyle(el).position),'fixed','shared social links must not float over educational content');
  const allText=await page.locator('.lobe-list').innerText();
  for(const label of ['전두엽','두정엽','측두엽','후두엽','소뇌','뇌줄기'])assert.ok(allText.includes(label),'missing '+label);
  const fit=await page.evaluate(()=>({
   scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,
   cards:[...document.querySelectorAll('.lobe-card')].map(x=>{let b=x.getBoundingClientRect();return{left:b.left,right:b.right,height:b.height}}),
   title:document.querySelector('.map-intro h1')?.getBoundingClientRect().top,
   hemi:document.querySelector('.hemisphere-inline')?.getBoundingClientRect().top,
   diagram:document.querySelector('#brainMap')?.getBoundingClientRect().width
  }));
  assert.ok(fit.scroll<=fit.client+1,'horizontal overflow: '+JSON.stringify(fit));
  assert.ok(fit.cards.every(c=>c.left>=0&&c.right<=width+1&&c.height>=66),'cards clipped: '+JSON.stringify(fit.cards));
  assert.ok(fit.diagram>=250,'brain picture too narrow');
  if(width>=1020)assert.ok(fit.hemi<820,'left-right diagram must be in first desktop viewport, got '+fit.hemi);
  if(width<500)assert.ok(fit.cards.every(c=>c.height>=75),'mobile child-friendly tap target too small');
  await page.screenshot({path:out+'/'+name+'-initial.png',fullPage:true});
  for(const [key,label] of [['frontal','전두엽'],['parietal','두정엽'],['temporal','측두엽'],['occipital','후두엽'],['cerebellum','소뇌'],['brainstem','뇌줄기']]){
   await page.locator('.lobe-card[data-region="'+key+'"]').click();
   assert.equal(await page.locator('#simpleDetail').isVisible(),true);
   assert.equal(await page.locator('#simpleDetailTitle').innerText(),label);
   assert.equal(await page.locator('.lobe-card[data-region="'+key+'"]').getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('#brainMap [data-brain-region="'+key+'"]').evaluate(el=>el.hasAttribute('data-active')),true);
  }
  await page.locator('#detailClose').click();
  assert.equal(await page.locator('#simpleDetail').isHidden(),true);
  await page.locator('#brainMap [data-brain-region="occipital"]').click();
  assert.equal(await page.locator('#simpleDetailTitle').innerText(),'후두엽');
  await page.locator('.more-learn summary').click();
  assert.equal(await page.locator('.more-learn').getAttribute('open'),'');
  assert.match(await page.locator('.more-links a').first().getAttribute('href'),/3d\/explore/);
  assert.deepEqual(errors,[],'unexpected browser errors');
  report.push({name,status:'PASS',viewport:width,firstViewHemisphereTop:Math.round(fit.hemi),buttons:6,noOverflow:true});
  await page.close();
 }
 await writeFile(out+'/result.json',JSON.stringify({passed:true,report},null,2));
 console.log('BRAIN MAP QA PASS '+JSON.stringify(report));
}catch(e){
 report.push({status:'FAIL',error:String(e.stack||e)});
 await writeFile(out+'/result.json',JSON.stringify({passed:false,report},null,2));
 console.error('BRAIN MAP QA FAIL '+String(e.stack||e));
 process.exitCode=1;
}finally{await browser.close();}

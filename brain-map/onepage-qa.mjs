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
  // Font hierarchy must be real in the browser rather than a nominal CSS declaration.
  const fontCheck=await page.evaluate(async()=>{
    await document.fonts.load('600 22px "MaruBuriSemiBold"','좌뇌 우뇌');
    await document.fonts.load('400 34px "Nanum Pen Script"','우리 뇌');
    await document.fonts.ready;
    const read=(selector)=>{
      const style=getComputedStyle(document.querySelector(selector));
      return {family:style.fontFamily,size:parseFloat(style.fontSize),weight:style.fontWeight};
    };
    const faces=[...document.fonts].filter(x=>/MaruBuriSemiBold|Nanum Pen Script|Pretendard/i.test(x.family))
      .map(x=>({family:x.family,status:x.status}));
    return {body:read('.brain-main .map-intro p'),title:read('.map-intro h1'),
      subheading:read('.map-panel-heading h2'),card:read('.lobe-card small'),
      cardTitle:read('.lobe-card strong'),faces,hasGamjaOverride:!!document.querySelector('link[href*="habom-gamja-font"]')};
  });
  assert.match(fontCheck.body.family,/Pretendard/i,'main body must use Pretendard: '+JSON.stringify(fontCheck));
  assert.match(fontCheck.subheading.family,/MaruBuriSemiBold/,'subheading font family: '+JSON.stringify(fontCheck));
  assert.match(fontCheck.cardTitle.family,/MaruBuriSemiBold/,'small section headings: '+JSON.stringify(fontCheck));
  assert.match(fontCheck.title.family,/Nanum Pen Script/,'headline handwriting fallback must be present: '+JSON.stringify(fontCheck));
  assert.equal(fontCheck.hasGamjaOverride,false,'shared Gamja !important must not override the brain map');
  assert.ok(fontCheck.faces.some(x=>x.family.includes('MaruBuriSemiBold')&&x.status==='loaded'),
    'real MaruBuri SemiBold webfont missing: '+JSON.stringify(fontCheck));
  assert.ok(fontCheck.faces.some(x=>x.family.includes('Nanum Pen Script')&&x.status==='loaded'),
    'real Nanum Pen Script webfont missing: '+JSON.stringify(fontCheck));
  console.log('BRAIN_FONT_QA_'+name+'='+JSON.stringify(fontCheck));
  const photo=page.locator('.brain-one-panel');
  assert.equal(await page.locator('.lobe-card').count(),6,'approved six main functions are preserved');
  assert.equal(await page.locator('#lobeDirectory').getAttribute('open'),null,'anatomy detail is collapsed by default');
  assert.equal(await page.locator('.lobe-science-note').getAttribute('open'),null,'scientific detail initially collapsed');
  assert.match(await page.locator('.lobe-science-note a').getAttribute('href'),/^https:\/\/www\.ninds\.nih\.gov\//,'primary NINDS source is available');
  assert.equal(await page.locator('#lobeSceneRead').count(),1,'one optional selected-process read-aloud control');
  assert.equal(await page.locator('#lobeSceneRead').getAttribute('aria-label'),'현재 선택한 과정과 관련 뇌 부위 설명 듣기');
  assert.equal(await page.locator('#lobeSceneRead').getAttribute('aria-pressed'),'false','read button begins stopped');
  assert.equal(await page.locator('#lobeSceneRead').evaluate(el=>el.getBoundingClientRect().height>=44),true,'read-aloud tap target accessible');

  assert.equal(await page.locator('[data-lobe-scene]').count(),8,'all eight existing everyday scenes available beside six-lobe map');
  assert.equal(await page.locator('[data-lobe-scene="talk"]').getAttribute('aria-pressed'),'true','initial daily scene is active');
  assert.equal(await page.locator('#lobeSceneRoles > li').count(),3,'glanceable roles for selected scene');
  assert.match(await page.locator('#lobeSceneNotice').innerText(),/여러 부분이 함께 일해요/,'no inactive brain implication');
  assert.match(await page.locator('#lobeSceneNotice').innerText(),/실제 뇌 활동을 측정한 결과가 아니에요/,'avoid mistaken brain activation claim');
  assert.match(await page.locator('.lobe-science-note').textContent(),/어려움·뇌 활성도·치료효과를 판단하지 않아요|개인의 원인을 판단하지 않아요/,'scientific limits remain available in optional details');
  assert.equal(await page.locator('.sub-footer > div').count(),1,'footer brand must be valid and grouped in its own div');
  assert.equal(await page.locator('.hemisphere-inline, .hemi-fact, .both-work').count(),0,'no duplicate hemisphere teaser on lobe tab');
  assert.match(await page.locator('.brain-bottom > p').innerText(),/여러 부분은 연결되어 함께 일해요/,'retain one concise cooperation reminder');
  assert.equal(await page.locator('#brainMap [data-brain-region]').count(),6,'six interactive regions');
  assert.equal(await page.locator('.brain-diagram-label').count(),6,'all six regions have visible in-map name and function');
  assert.equal(await page.locator('#brainMap .brain-label-back').count(),0,'no opaque sticker panels obscure the brain');
  assert.equal(await page.locator('#brainMap .cortex-grooves').count(),6,'illustrated folds are tied to each existing region');
  const atlasFit=await page.locator('#brainMap').evaluate(svg=>{
    const view=svg.viewBox.baseVal, labels=[...svg.querySelectorAll('.brain-diagram-label')].map(el=>{
      const box=el.getBBox();return {name:el.dataset.labelRegion,x:box.x,y:box.y,right:box.x+box.width,bottom:box.y+box.height};
    });
    return {x:view.x,y:view.y,right:view.x+view.width,bottom:view.y+view.height,labels};
  });
  assert.ok(atlasFit.labels.every(box=>box.x>atlasFit.x&&box.y>atlasFit.y&&box.right<atlasFit.right&&box.bottom<atlasFit.bottom),
    'all region labels must fit the actual SVG viewport: '+JSON.stringify(atlasFit));
  if(width<=760){
    assert.equal(await page.locator('.brain-mobile-legend-details').count(),1,'narrow view retains readable complete region details');
    assert.equal(await page.locator('.brain-mobile-legend-details').getAttribute('open'),null,'full legend stays folded instead of duplicating six visible cards');
    await page.locator('.brain-mobile-legend-details summary').click();
    assert.equal(await page.locator('.brain-mobile-legend-item').count(),6,'all mobile legend items present');
    await page.locator('.brain-mobile-legend-details summary').click();
  }

  for(const label of ['전두엽','두정엽','측두엽','후두엽','소뇌','뇌줄기'])assert.ok((await page.locator('.brain-diagram-labels').textContent()).includes(label),'missing diagram name '+label);
  assert.equal(await page.locator('.brain-hero,.brain3d-feature,.brain-explorer,.brain-networks,.brain-faq').count(),0,'no prior scrolling sections');
  assert.equal(await page.locator('#simpleDetail').isHidden(),true,'optional detail starts closed');
  assert.equal(await page.locator('.more-learn, .more-links').count(),0,'remove redundant 3D link panel from main map');
  assert.notEqual(await page.locator('.sub-footer .footer-social').evaluate(el=>getComputedStyle(el).position),'fixed','shared social links must not float over educational content');
  const footerColor=await page.locator('.sub-footer .footer-social a').first().evaluate(el=>getComputedStyle(el).color);
  assert.ok(footerColor==='rgb(241, 248, 242)','social links should have readable contrast on dark footer, got '+footerColor);
  await page.locator('#lobeDirectory summary').click();
  assert.equal(await page.locator('#lobeDirectory').getAttribute('open'),'','six-lobe anatomy directory opens when requested');
  const allText=await page.locator('.lobe-list').innerText();
  for(const label of ['전두엽','두정엽','측두엽','후두엽','소뇌','뇌줄기'])assert.ok(allText.includes(label),'missing '+label);
  const fit=await page.evaluate(()=>({
   scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,
   cards:[...document.querySelectorAll('.lobe-card')].map(x=>{let b=x.getBoundingClientRect();return{left:b.left,right:b.right,height:b.height}}),
   title:document.querySelector('.map-intro h1')?.getBoundingClientRect().top,
   bottom:document.querySelector('.brain-bottom')?.getBoundingClientRect().top,
   lastCard:document.querySelector('.lobe-card[data-region="brainstem"]')?.getBoundingClientRect().bottom,
   diagram:document.querySelector('#brainMap')?.getBoundingClientRect().width
  }));
  assert.ok(fit.scroll<=fit.client+1,'horizontal overflow: '+JSON.stringify(fit));
  assert.ok(fit.cards.every(c=>c.left>=0&&c.right<=width+1&&c.height>=66),'cards clipped: '+JSON.stringify(fit.cards));
  assert.ok(fit.diagram>=250,'brain picture too narrow');
  if(width>=1020)assert.ok(fit.diagram>470,'visual diagram must be legible on desktop');
  if(width<500)assert.ok(fit.cards.every(c=>c.height>=(width<=380?64:75)),'mobile touch target too small');
  const textSize=await page.evaluate(()=>({
   cards:parseFloat(getComputedStyle(document.querySelector('.lobe-card small')).fontSize),
   columns:getComputedStyle(document.querySelector('.lobe-list')).gridTemplateColumns.split(' ').length
  }));
  const minimum=width<500?12.5:13;
  assert.ok(textSize.cards>=minimum,'brain function descriptions too small: '+JSON.stringify(textSize));
  if(width<=380)assert.equal(textSize.columns,1,'small phones use readable one-column cards');
  if(width<=380){
   const titleHeight=await page.locator('.map-panel-heading h2').evaluate(el=>el.getBoundingClientRect().height);
   assert.ok(titleHeight<95,'purpose heading should not overflow on narrow screens: '+titleHeight);
  }
  await page.locator('#lobeDirectory summary').click();
  assert.equal(await page.locator('#lobeDirectory').getAttribute('open'),null,'daily-life lesson does not require six anatomy cards');
  const sceneLayout=await page.evaluate(()=>{
   const rect=selector=>document.querySelector(selector).getBoundingClientRect().toJSON();
   return {choice:rect('.lobe-scene-choices'),roles:rect('#lobeSceneRoles'),
    focus:rect('#lobeSceneSelection'),svg:rect('#brainMap')};
  });
  if(width>=941){
   assert.ok(sceneLayout.choice.right < sceneLayout.svg.left+24,
    'desktop everyday tasks should appear beside the brain, not above its faraway result: '+JSON.stringify(sceneLayout));
  }else{
   assert.ok(sceneLayout.choice.bottom<sceneLayout.roles.top &&
    sceneLayout.roles.bottom<sceneLayout.focus.top &&
    sceneLayout.focus.bottom<sceneLayout.svg.top,
    'mobile shows one continuous daily task -> process -> explanation -> brain flow: '+JSON.stringify(sceneLayout));
  }
  assert.equal(await page.locator('#lobeSceneRoles button').count(),3,'three process choices, not a brain-name test');
  assert.match(await page.locator('#lobeSceneRoles button').first().locator('b').innerText(),/말소리/,
   'visible main labels describe everyday processes before anatomy');
  if(width<=390){
   const roleFit=await page.locator('#lobeSceneRoles button').evaluateAll(els=>els.map(el=>({
    w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height,
    textW:el.querySelector('b').getBoundingClientRect().width
   })));
   assert.ok(roleFit.every(x=>x.w>=220&&x.h>=54),'phone uses readable full-width process rows: '+JSON.stringify(roleFit));
  }
  await page.screenshot({path:out+'/'+name+'-initial.png',fullPage:true});
  const sceneToRegions={
   talk:['temporal','frontal','occipital'],read:['occipital','temporal','frontal'],
   map:['occipital','parietal','frontal'],ball:['occipital','parietal','cerebellum'],
   music:['temporal','frontal','cerebellum'],draw:['occipital','parietal','frontal'],
   bag:['occipital','parietal','frontal'],feeling:['temporal','occipital','frontal']
  };
  for(const [key,regions] of Object.entries(sceneToRegions)){
   await page.locator('[data-lobe-scene="'+key+'"]').click();
   assert.equal(await page.locator('[data-lobe-scene][aria-pressed="true"]').count(),1,'exactly one scene: '+key);
   assert.equal(await page.locator('[data-lobe-scene="'+key+'"]').getAttribute('aria-pressed'),'true');
   const choices=page.locator('#lobeSceneRoles button[data-scene-region]');
   assert.equal(await choices.count(),3,'all three distinct roles remain available: '+key);
   const actual=await choices.evaluateAll(els=>els.map(el=>el.dataset.sceneRegion));
   assert.deepEqual(actual,regions,'scientifically plausible example regions preserved: '+key);
   assert.equal(await page.locator('#brainMap [data-scene-related]').count(),3,'three representative co-operating areas: '+key);
   for(const [step,region] of regions.entries()){
    await choices.nth(step).click();
    assert.equal(await page.locator('#lobeSceneRoles button[aria-pressed="true"]').count(),1,'one chosen role');
    assert.equal(await page.locator('#brainMap [data-scene-focus]').count(),1,'ONE brain region spotlighted');
    assert.equal(await page.locator('.brain-diagram-label[data-label-active]').getAttribute('data-label-region'),region,
      'the selected diagram label and selected process point to the same territory');

    assert.equal(await page.locator('.brain-diagram-label[data-label-active]').count(),1,'one matching label active');
    assert.match(await page.locator('#brainFocusName').innerText(),new RegExp(region==='frontal'?'전두엽':region==='parietal'?'두정엽':region==='temporal'?'측두엽':region==='occipital'?'후두엽':region==='cerebellum'?'소뇌':'뇌줄기'),'diagram names the focused region prominently');
    assert.equal(await page.locator('.brain-mobile-legend-item[data-legend-active]').count(),1,'one matching mobile legend active');
    assert.equal(await page.locator('.lobe-card[data-scene-focus]').count(),1,'ONE matching large lobe card highlighted');
    assert.equal(await page.locator('#brainMap [data-scene-focus]').getAttribute('data-brain-region'),region);
    assert.equal(await page.locator('.lobe-card[data-scene-focus]').getAttribute('data-region'),region);
    const number=await page.locator('#brainMap [data-brain-region="'+region+'"] .zone-number').textContent();
    const name=(await page.locator('.lobe-card[data-region="'+region+'"] strong').textContent()).trim();
    const label=await page.locator('#lobeSceneFocusTitle').innerText();
    const hint=await page.locator('#lobeSceneRegionHint').innerText();
    assert.ok(hint.includes(number.trim())&&hint.includes(name),'area number and name appear as supporting information: '+hint);
    assert.ok(!label.includes(name),'large focus heading must describe the process, not demand remembering region names: '+label);
    const processLabel=await choices.nth(step).locator('b').innerText();
    assert.equal(label,processLabel,'selected process word is the large heading, not an anatomy term: '+key);
    assert.match(await choices.nth(step).locator('small').innerText(),/관련 영역 예시/,'region details remain clearly secondary');

    assert.ok((await page.locator('#lobeSceneFocusText').innerText()).length>18,'specific educational clue, not just a name');
   }
   await page.waitForFunction(()=>{
    const el=document.querySelector('#brainMap [data-scene-focus] .zone-shape');
    return el&&parseFloat(getComputedStyle(el).strokeWidth)>=9;
   },{timeout:3000});
   const strokeInfo=await page.locator('#brainMap [data-scene-focus] .zone-shape').evaluate(el=>({
    width:getComputedStyle(el).strokeWidth,
    matched:el.matches('.brain-page .brain-svg[data-scene-mode="focus"] .brain-zone[data-scene-focus] .zone-shape'),
    mapMode:document.querySelector('#brainMap').getAttribute('data-scene-mode')
   }));
   assert.ok(parseFloat(strokeInfo.width)>=9 && parseFloat(strokeInfo.width)<=11 && strokeInfo.matched,
    'active outline must be clear after transition: '+JSON.stringify(strokeInfo));
   const unfocusedOpacity=await page.locator('#brainMap [data-brain-region]:not([data-scene-focus])').first().evaluate(el=>parseFloat(getComputedStyle(el).opacity));
   assert.ok(unfocusedOpacity>0.2&&unfocusedOpacity<0.55,'other areas recede but remain visible: '+unfocusedOpacity);
   assert.equal(await page.locator('#simpleDetail').isHidden(),true,'no unrelated detailed popup');
   const metrics=await page.evaluate(()=>({
    buttons:[...document.querySelectorAll('[data-lobe-scene],.lobe-scene-role-choice')].map(el=>el.getBoundingClientRect().toJSON()),
    scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth
   }));
   assert.ok(metrics.buttons.every(r=>r.height>=44&&r.left>=0&&r.right<=width+1),'tap targets and bounds: '+JSON.stringify(metrics));
   assert.ok(metrics.scroll<=metrics.client+1,'no horizontal overflow: '+JSON.stringify(metrics));
  }
  await page.locator('[data-lobe-scene="map"]').click();
  const mapClues=await page.locator('#lobeSceneRoles li').evaluateAll(els=>els.map(el=>el.querySelector('b').textContent));
  const mapRoles=await page.locator('#brainMap [data-scene-related]').evaluateAll(els=>els.map(el=>el.dataset.brainRegion).sort());
  await page.locator('[data-lobe-scene="bag"]').click();
  const bagClues=await page.locator('#lobeSceneRoles li').evaluateAll(els=>els.map(el=>el.querySelector('b').textContent));
  const bagRoles=await page.locator('#brainMap [data-scene-related]').evaluateAll(els=>els.map(el=>el.dataset.brainRegion).sort());
  assert.deepEqual(mapRoles,bagRoles,'do not fabricate different neural regions for different tasks');
  assert.notDeepEqual(mapClues,bagClues,'same areas should have task-specific clues');
  await page.screenshot({path:out+'/'+name+'-scene-bag.png',fullPage:true});
  await page.locator('[data-lobe-scene="ball"]').click();
  await page.locator('#lobeSceneRoles button[data-scene-region="parietal"]').click();
  await page.screenshot({path:out+'/'+name+'-scene-ball.png',fullPage:true});
  if(name==='desktop'||name==='mobile'){
   const preview=await page.locator('.lobe-figure').screenshot({type:'jpeg',quality:55,animations:'disabled'});
   console.log('BRAIN_SCENE_PREVIEW_'+name+'='+preview.toString('base64'));
  }

  if(name==='desktop'||name==='small-mobile'){
   const jpeg=await page.screenshot({type:'jpeg',quality:45,animations:'disabled'});
   console.log('BRAIN_LOBES_PREVIEW_'+name+'='+jpeg.toString('base64'));
  }
  const sixRegions=['frontal','parietal','temporal','occipital','cerebellum','brainstem'];
  await page.locator('#lobeDirectory summary').click();
  assert.equal(await page.locator('#lobeDirectory').getAttribute('open'),'','on-demand anatomy panel supports all six detail cards');
  for(const [index,[key,label]] of [['frontal','전두엽'],['parietal','두정엽'],['temporal','측두엽'],['occipital','후두엽'],['cerebellum','소뇌'],['brainstem','뇌줄기']].entries()){
   await page.locator('.lobe-card[data-region="'+key+'"]').click();
   assert.equal(await page.locator('#brainMap [data-scene-active]').count(),0,'individual region selection clears multiregion explanation');
   assert.equal(await page.locator('#lobeSceneResult').isHidden(),true,'scene role panel folds when examining an individual area');
   assert.equal(await page.locator('#lobeSceneSelection').isHidden(),true,'hide example summary while inspecting one lobe');
   assert.equal(await page.locator('.lobe-card[data-scene-example]').count(),0,'clear scene-only emphasis in single-lobe view');
   assert.equal(await page.locator('#simpleDetail').isVisible(),true);
   assert.equal(await page.locator('#simpleDetailTitle').innerText(),label);
   assert.equal(await page.locator('.lobe-card[data-region="'+key+'"]').getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('#brainMap [data-brain-region="'+key+'"]').evaluate(el=>el.hasAttribute('data-active')),true);
   const expectedPrevious=width<=380?key:sixRegions[Math.min(index+(index%2===0?1:0),5)];
   assert.equal(await page.locator('#simpleDetail').evaluate(el=>el.previousElementSibling?.dataset.region),expectedPrevious,'explanation directly follows selected card row');
   assert.equal(await page.locator('#simpleDetail').evaluate(el=>el.parentElement?.classList.contains('lobe-list')),true,'detail remains with its six cards');
   if(width<500){
    await page.waitForTimeout(80);
    const rect=await page.locator('#simpleDetail').boundingBox();
    assert.ok(rect.y>=-1 && rect.y+rect.height<=height+2,'selected explanation must be visible on mobile: '+JSON.stringify(rect));
   }
  }
  await page.screenshot({path:out+'/'+name+'-lobe-detail.png',fullPage:true});
  await page.locator('#detailClose').click();
  assert.equal(await page.locator('#lobeSceneRoles button[data-scene-region="parietal"]').evaluate(el=>document.activeElement===el),true,'close restores keyboard focus to the selected everyday process');
  assert.equal(await page.locator('#lobeDirectory').getAttribute('open'),null,'returns to uncluttered lesson after closing anatomy detail');
  assert.equal(await page.locator('#simpleDetail').isHidden(),true);
  assert.equal(await page.locator('[data-lobe-scene="ball"]').getAttribute('aria-pressed'),'true',
   'closing single-lobe explanation restores the earlier daily-scene context');
  assert.equal(await page.locator('#brainMap [data-scene-focus]').count(),1,
   'exactly one focused region returns after closing single-lobe explanation');
  assert.equal(await page.locator('#brainMap [data-scene-focus]').getAttribute('data-brain-region'),'parietal',
   'the previously selected ball-game role is restored');
  assert.equal(await page.locator('#lobeSceneSelection').isVisible(),true,'focus explanation returns after closing individual region');
  assert.equal(await page.locator('.lobe-card[data-scene-focus]').count(),1,'exactly one highlighted lobe card returns');
  await page.locator('#brainMap [data-brain-region="occipital"]').click();
  assert.equal(await page.locator('#simpleDetailTitle').innerText(),'후두엽');
  assert.equal(await page.locator('#lobeDirectory').getAttribute('open'),'','diagram allows requesting anatomy detail without losing it');
  // Newly added native HTML/SVG side-by-side hemispheres view.
  assert.equal(await page.locator('#lobesView').isVisible(),true,'Original six-lobe map is default');
  assert.equal(await page.locator('#hemispheresView').isHidden(),true,'Comparison should not replace the approved default');
  assert.equal(await page.locator('.brain-view-tabs button').count(),2);
  await page.locator('[data-brain-view="hemispheres"]').click();
  assert.equal(await page.locator('#hemispheresView').isVisible(),true);
  assert.equal(await page.locator('#lobesView').isHidden(),true);
  assert.equal(await page.locator('.hemi-ability-list').count(),2);
  assert.equal(await page.locator('.hemi-ability-list li').count(),8,'four concrete features per side');
  assert.equal(await page.locator('.hemi-team-examples button').count(),8,'eight selectable daily-life scenarios');
  await page.locator('[data-brain-scene="music"]').click();
  assert.equal(await page.locator('[data-lobe-scene="music"]').getAttribute('aria-pressed'),'true',
    'existing scenario buttons keep lobe diagram synchronized');
  await page.locator('[data-brain-scene="talk"]').click();
  assert.equal(await page.locator('#hemiMascot').count(),1,'brand character graphic exists');
  assert.equal(await page.locator('#hemiMoaOriginal').count(),1,'original Moa image is rendered, not recreated');
  assert.equal(await page.locator('#hemiMoaOriginal').getAttribute('href'),'../thinking-garden/assets/moa-default.png','must use the existing Moa asset');
  const moaLoaded=await page.evaluate(async()=>{
    const url=document.querySelector('#hemiMoaOriginal').href.baseVal;
    const img=new Image(); img.src=new URL(url,location.href).href;
    try{await img.decode();return {width:img.naturalWidth,height:img.naturalHeight};}
    catch(error){return {error:String(error)};}
  });
  assert.ok(moaLoaded.width>200&&moaLoaded.height>200,'original Moa asset must load in browser: '+JSON.stringify(moaLoaded));
  assert.equal(await page.locator('#hemiBrainGraphic [data-hemi-select]').count(),2,'both brain hemispheres stay clickable');
  assert.match(await page.locator('#hemiSvgTitle').textContent(),/기존 모아 캐릭터/);
  const artFit=await page.evaluate(()=>{
    const svg=document.querySelector('.hemi-hero-svg');
    const brain=document.querySelector('#hemiBrainGraphic').getBBox();
    const rabbit=document.querySelector('#hemiMascot').getBBox();
    const art=svg.getBoundingClientRect();
    return {brainBottom:brain.y+brain.height,rabbitTop:rabbit.y,viewBox:svg.viewBox.baseVal.width,
      artWidth:art.width,visible:!!art.width};
  });
  assert.ok(artFit.visible && artFit.artWidth>=(width<=370?120:width<500?145:120),'mascot must be readable in every viewport: '+JSON.stringify(artFit));
  assert.ok(artFit.rabbitTop >= artFit.brainBottom-8,
    'brain drawing should float above mascot, not look like an exposed head: '+JSON.stringify(artFit));
  assert.match(await page.locator('.hemi-caution').innerText(),/좌뇌형·우뇌형/);
  assert.equal(await page.locator('.hemi-ability-btn').count(),8,'eight feature squares become individually clickable');
  const topics=['speech','phonics','syntax','right-hand','space','intonation','attention','left-hand'];
  const expectedWords=['어휘','음운','통사','운동 피질','시공간 처리','억양','공간 주의','양손 협응'];
  for(let i=0;i<topics.length;i++){
    const opener=page.locator('[data-hemi-topic="'+topics[i]+'"]');
    assert.equal(await opener.getAttribute('aria-haspopup'),'dialog');
    await opener.click();
    const dialog=page.locator('#hemiTopicDialog');
    assert.equal(await dialog.isVisible(),true,'modal visible for '+topics[i]);
    assert.equal(await dialog.getAttribute('open'),'','native accessible modal opened');
    assert.equal(await page.locator('#hemiTopicMore').getAttribute('open'),null,'advanced details start closed');
    assert.ok((await page.locator('#hemiTopicEasyExample').innerText()).length>12,'each topic has a plain-life quick example');
    assert.match(await page.locator('#hemiTopicEvidence').getAttribute('href'),/^https:\/\//,'source link should be valid absolute URL');
    if(i===0 && (name==='desktop'||name==='mobile')){
      const simple=await page.screenshot({type:'jpeg',quality:55,animations:'disabled'});
      console.log('BRAIN_SIMPLE_PREVIEW_'+name+'='+simple.toString('base64'));
    }
    await page.locator('#hemiTopicMore summary').click();
    assert.equal(await page.locator('#hemiTopicMore').getAttribute('open'),'','advanced content expands');
    assert.equal(await page.locator('#hemiTopicSteps > li').count(),3,'three nested skill explanations');
    assert.equal(await page.locator('#hemiTopicExamples > li').count(),2,'two concrete examples');
    assert.equal(await page.locator('#hemiTopicWords .hemi-topic-term').count(),3,'three defined terms');
    assert.ok((await page.locator('#hemiTopicIntro').innerText()).length>40,'intro too short: '+topics[i]);
    assert.ok((await page.locator('#hemiTopicBoundary').innerText()).length>40,'scientific caution missing: '+topics[i]);
    assert.match(await page.locator('#hemiTopicWords').innerText(),new RegExp(expectedWords[i]),'matching glossary term expected');
    const modalFit=await page.evaluate(()=>{
      const d=document.querySelector('#hemiTopicDialog').getBoundingClientRect();
      const header=document.querySelector('.hemi-topic-header').getBoundingClientRect();
      const footer=document.querySelector('.hemi-topic-footer').getBoundingClientRect();
      const scrollBox=document.querySelector('.hemi-topic-body');
      return {left:d.left,right:d.right,top:d.top,bottom:d.bottom,headerTop:header.top,
       footerBottom:footer.bottom,docWidth:document.documentElement.scrollWidth,
       docClient:document.documentElement.clientWidth,scrollHeight:scrollBox.scrollHeight,
       scrollClient:scrollBox.clientHeight};
    });
    assert.ok(modalFit.left>=-1 && modalFit.right<=width+1 && modalFit.top>=-1 && modalFit.bottom<=height+1,
      'dialog clipped: '+JSON.stringify({topic:topics[i],modalFit}));
    assert.ok(modalFit.footerBottom<=height+1 && modalFit.scrollClient>60,'close footer not reachable: '+JSON.stringify(modalFit));
    assert.ok(modalFit.docWidth<=modalFit.docClient+1,'opening dialog causes horizontal page overflow');
    if(i===0 && (name==='desktop'||name==='mobile')){
      const detailed=await page.screenshot({type:'jpeg',quality:55,animations:'disabled'});
      console.log('BRAIN_DRILLDOWN_PREVIEW_'+name+'='+detailed.toString('base64'));
    }
    if(i%2===0){
      await page.keyboard.press('Escape');
    }else{
      await page.locator('#hemiTopicDone').click();
    }
    assert.equal(await dialog.isHidden(),true,'dialog closes for '+topics[i]);
    assert.equal(await opener.evaluate(el=>document.activeElement===el),true,'focus returns to opened square');
  }
  await page.locator('[data-hemi-topic="attention"]').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#hemiTopicDialog').isVisible(),true,'keyboard Enter opens subtopic');
  await page.locator('#hemiTopicClose').click();
  assert.equal(await page.locator('#hemiTopicDialog').isHidden(),true,'X closes modal');
  // A concept explanation must lead to a related, usable practice guide.
  for(const [topic,scene,label] of [
    ['speech','talk','친구와 질문'],
    ['phonics','read','읽고 위치'],
    ['right-hand','ball','공을 굴리고'],
    ['space','map','작은 길 찾아가기'],
    ['intonation','feeling','말투와 상황'],
    ['attention','bag','가방 챙기는'],
    ['left-hand','draw','보고 그림 완성하기']
  ]){
    await page.locator('[data-hemi-topic="'+topic+'"]').click();
    assert.equal(await page.locator('#hemiTopicDialog').isVisible(),true);
    await page.locator('#hemiTopicToActivity').click();
    assert.equal(await page.locator('#hemiTopicDialog').isHidden(),true,'topic to practice closes modal');
    assert.equal(await page.locator('[data-brain-scene="'+scene+'"]').getAttribute('aria-pressed'),'true','selects related scene: '+topic);
    assert.match(await page.locator('#hemiActivityTitle').innerText(),new RegExp(label),'showing matching activity: '+topic);
    assert.equal(await page.locator('#hemiActivitySteps > li').count(),3,'three usable activity steps: '+topic);
    await page.waitForFunction(()=>document.activeElement?.id==='hemiActivityHeading',null,{timeout:2500});
  }
  assert.equal(await page.locator('#hemiTopicDialog').isHidden(),true);
  await page.locator('[data-brain-scene="talk"]').click();
  const detailSummary=page.locator('[data-hemi-topic="speech"]');
  assert.match(await detailSummary.innerText(),/자세히 보기/,'cards clearly signal further details');
  // Classroom view is an explicit reversible display preference, no persistence.
  const classToggle=page.locator('#hemiClassMode');
  await classToggle.click();
  assert.equal(await classToggle.getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('brain-class-mode')),true);
  await classToggle.click();
  assert.equal(await classToggle.getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('brain-class-mode')),false);
  assert.match(await page.locator('.hemi-purpose-note').innerText(),/판단하지 않아요/);
  assert.equal(await page.locator('.hemi-teacher-notes').getAttribute('open'),null);
  await page.locator('.hemi-teacher-notes summary').click();
  assert.match(await page.locator('.hemi-teacher-steps').innerText(),/진단하지/);
  await page.locator('.hemi-teacher-notes summary').click();
  assert.equal(await page.locator('#hemiQuizQuestion, #hemiPracticeMode, #hemiQuizProgress').count(),0,'no simplistic brain quiz');
  assert.equal(await page.locator('#hemiTopicToActivity').count(),1,'related activity action available');
  assert.equal(await page.locator('.hemi-study-sources').innerText().then(t=>t.includes('인출 연습')),false,'no obsolete quiz rationale');
  assert.match(await page.locator('.hemi-activity-disclaimer').innerText(),/검증된 프로그램은 아니에요/,'activities have scientific limitations');
  assert.equal(await page.locator('#hemiActivityGuide').isVisible(),true,'activity guide shown');
  assert.equal(await page.locator('#hemiActivitySteps > li').count(),3);
  assert.equal(await page.locator('#hemiActivityOptions').getAttribute('open'),null);
  const listening=page.locator('#hemiReadOverview');
  assert.equal(await listening.count(),1,'optional spoken summary available');
  assert.equal(await page.locator('#hemiTopicRead').count(),1,'topic speech entry is accessible');
  assert.equal(await page.locator('#hemiReadScene').count(),1);
  assert.equal(await page.locator('#hemiReadQuiz').count(),0);
  await page.locator('#leftStudyTitle').click();
  assert.equal(await page.locator('#leftStudyTitle').getAttribute('aria-pressed'),'true');
  assert.match(await page.locator('#hemiFocus').innerText(),/좌뇌를 살펴/);
  assert.equal(await page.locator('.hemi-hero-svg').getAttribute('data-focused'),'left');
  await page.locator('[data-hemi-select="right"].hemi-svg-side').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#rightStudyTitle').getAttribute('aria-pressed'),'true');
  assert.match(await page.locator('#hemiFocus').innerText(),/우뇌를 살펴/);
  await page.locator('#hemiTogether').click();
  assert.equal(await page.locator('#hemiTogether').getAttribute('aria-pressed'),'true');
  assert.match(await page.locator('#hemiFocus').innerText(),/한 팀/);
  const speechFont=await page.locator('.hemi-focus b').evaluate(el=>getComputedStyle(el).fontFamily);
  assert.match(speechFont,/Nanum Pen Script/,'speech cue uses handwriting only');
  const conceptFont=await page.locator('.hemi-ability-copy b').first().evaluate(el=>getComputedStyle(el).fontFamily);
  assert.match(conceptFont,/MaruBuriSemiBold/,'clickable concept headings use MaruBuri');
  assert.equal(await page.locator('#hemiSceneTitle').innerText(),'💬 친구와 대화할 때');
  await page.locator('[data-brain-scene="ball"]').click();
  assert.equal(await page.locator('[data-brain-scene="ball"]').getAttribute('aria-pressed'),'true');
  assert.match(await page.locator('#hemiSceneText').innerText(),/공의 위치/);
  assert.equal(await page.locator('#hemiTogether').getAttribute('aria-pressed'),'true','daily scenes reinforce both hemispheres');
  await page.locator('[data-brain-scene="read"]').click();
  assert.match(await page.locator('#hemiSceneText').innerText(),/글자 모양/);
  assert.match(await page.locator('#hemiActivityTitle').innerText(),/읽고 위치/);
  assert.match(await page.locator('#hemiActivityPrep').innerText(),/문장/);
  await page.locator('#hemiActivityOptions summary').click();
  assert.equal(await page.locator('#hemiActivityOptions').getAttribute('open'),'');
  for(const id of ['hemiActivityEasy','hemiActivityChallenge','hemiActivityObserve']){
    assert.ok((await page.locator('#'+id).innerText()).length>25,'guide needs usable detail '+id);
  }
  await page.locator('#hemiActivityOptions summary').click();
  for(const scene of ['talk','read','map','ball','music','draw','bag','feeling']){
    await page.locator('[data-brain-scene="'+scene+'"]').click();
    assert.equal(await page.locator('[data-brain-scene="'+scene+'"]').getAttribute('aria-pressed'),'true');
    assert.ok((await page.locator('#hemiSceneText').innerText()).length>35,'scene details should be concrete: '+scene);
    assert.equal(await page.locator('#hemiActivitySteps > li').count(),3,'step instructions for '+scene);
    assert.ok((await page.locator('#hemiActivityPrep').innerText()).length>12,'materials for '+scene);
    assert.ok((await page.locator('#hemiActivityAim').innerText()).length>15,'goal for '+scene);
    assert.ok((await page.locator('#hemiActivityWhy').innerText()).length>25,'functional rationale for '+scene);
    assert.ok((await page.locator('#hemiActivityNote').innerText()).length>25,'safe caveat for '+scene);
    assert.equal(await page.locator('#hemiActivityOptions').getAttribute('open'),null,'fold between scenes');
  }
  // Distinct learning goals: conversation turn-taking, actual route, visual construction.
  for(const [scene,goal,step,access] of [
    ['talk',/차례를 주고받아요/,/질문 그림/,/AAC/],
    ['map',/지나갈 곳/,/길 따라가기/,/손가락|시선/],
    ['draw',/작은 그림/,/나란히 비교하기/,/시선 선택/]
  ]){
    await page.locator('[data-brain-scene="'+scene+'"]').click();
    assert.match(await page.locator('#hemiActivityAim').innerText(),goal,'distinct goal: '+scene);
    assert.match(await page.locator('#hemiActivitySteps').innerText(),step,'distinct action: '+scene);
    await page.locator('#hemiActivityOptions summary').click();
    const adaptation=(await page.locator('#hemiActivityEasy').innerText())+' '+(await page.locator('#hemiActivityNote').innerText());
    assert.match(adaptation,access,'accessible response option: '+scene);
    await page.locator('#hemiActivityOptions summary').click();
  }
  await page.locator('[data-brain-scene="talk"]').click();
  assert.equal(await page.locator('.hemi-more-facts').getAttribute('open'),null,'extra science detail stays folded by default');
  await page.locator('.hemi-more-facts summary').click();
  assert.match(await page.locator('.hemi-fact-details').innerText(),/뇌량/);
  assert.match(await page.locator('.hemi-fact-details').innerText(),/미술/);
  await page.locator('.hemi-more-facts summary').click();
  assert.equal(await page.locator('.hemi-more-facts').getAttribute('open'),null);
  assert.equal(await page.locator('.hemi-study-sources').getAttribute('open'),null);
  await page.locator('.hemi-study-sources summary').click();
  assert.match(await page.locator('.hemi-study-sources').innerText(),/체계적 문헌고찰/);
  await page.locator('.hemi-study-sources summary').click();
  const lessonFit=await page.evaluate(()=>({
    scenes:[...document.querySelectorAll('.hemi-team-examples button')].map(e=>{const b=e.getBoundingClientRect();return {w:b.width,h:b.height,left:b.left,right:b.right};}),
    activity:document.querySelector('#hemiActivityGuide').getBoundingClientRect().toJSON(),
    stepFont:parseFloat(getComputedStyle(document.querySelector('.hemi-activity-steps p')).fontSize),
    sceneText:parseFloat(getComputedStyle(document.querySelector('#hemiSceneText')).fontSize)
  }));
  assert.ok(lessonFit.scenes.every(x=>x.h>=44&&x.left>=0&&x.right<=width+1),'scene touch size or clipping: '+JSON.stringify(lessonFit));
  assert.ok(lessonFit.activity.width>=250&&lessonFit.activity.left>=0&&lessonFit.activity.right<=width+1,
    'activity guide clipped: '+JSON.stringify(lessonFit.activity));
  assert.ok(lessonFit.stepFont>=12.5 && lessonFit.sceneText>=12.5,'activity text too small: '+JSON.stringify(lessonFit));
  if(name==='desktop'||name==='mobile'){
    const guidePreview=await page.locator('.hemi-activity-guide').screenshot({type:'jpeg',quality:60,animations:'disabled'});
    console.log('BRAIN_ACTIVITY_PREVIEW_'+name+'='+guidePreview.toString('base64'));
  }
  const compareFit=await page.evaluate(()=>({
    pageWidth:document.documentElement.scrollWidth,
    clientWidth:document.documentElement.clientWidth,
    panels:[...document.querySelectorAll('.hemi-study-card')].map(e=>{
      const r=e.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width};
    })
  }));
  assert.ok(compareFit.pageWidth<=compareFit.clientWidth+1,
    'Hemispheres view horizontal overflow: '+JSON.stringify(compareFit));
  assert.ok(compareFit.panels.every(p=>p.left>=0&&p.right<=width+1&&p.width>110),
    'Hemispheres cards are clipped: '+JSON.stringify(compareFit));
  const comparisonA11y=await page.evaluate(()=>{
    const px=(selector)=>parseFloat(getComputedStyle(document.querySelector(selector)).fontSize);
    const rect=(selector)=>document.querySelector(selector).getBoundingClientRect();
    return {
      ability: px('.hemi-ability-list small'),
      example: px('.hemi-example p'),
      tabHint: px('.brain-view-tabs button small'),
      heroHeight:rect('.hemi-hero').height,
      buttonHeight:rect('#leftStudyTitle').height,
      footerTop:rect('.sub-footer').top,
      contentBottom:rect('.brain-main').bottom
    };
  });
  if(width<=760){
    const min=width<=370?12:12.5;
    assert.ok(comparisonA11y.ability>=min,'mobile comparison descriptions too small '+JSON.stringify(comparisonA11y));
    assert.ok(comparisonA11y.example>=min,'mobile examples too small '+JSON.stringify(comparisonA11y));
    assert.ok(comparisonA11y.tabHint>=11.5,'tab hint unreadable '+JSON.stringify(comparisonA11y));
    assert.ok(comparisonA11y.heroHeight<=255,'hero pushes comparison cards too far down '+JSON.stringify(comparisonA11y));
    assert.ok(comparisonA11y.buttonHeight>=44,'side title touch target too short '+JSON.stringify(comparisonA11y));
  }
  assert.ok(comparisonA11y.footerTop>=comparisonA11y.contentBottom-1,'footer overlaps main content '+JSON.stringify(comparisonA11y));
  // A full-page capture from scroll offset makes the site's sticky mobile menu
  // appear halfway down the image; reset to top for an honest screenshot.
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.waitForTimeout(170);
  await page.screenshot({path:out+'/'+name+'-hemispheres.png',fullPage:true});
  // Small review previews are printed into CI logs for independent visual review.
  // Full-resolution screenshots remain in the artifact, not the repository.
  if(name==='desktop'||name==='mobile'){
    const preview=await page.screenshot({type:'jpeg',quality:50,animations:'disabled'});
    console.log('BRAIN_HEMI_PREVIEW_'+name+'='+preview.toString('base64'));
  }
  assert.equal(await page.locator('#mapIntroText').innerText(),'좌뇌와 우뇌가 맡는 일을 비교하고, 함께하는 활동도 살펴봐요.');
  await page.locator('[data-brain-view="lobes"]').click();
  assert.equal(await page.locator('#lobesView').isVisible(),true,'Returning to original map should work');
  assert.equal(await page.locator('.lobe-card').count(),6,'Original cards preserved');
  assert.equal(await page.locator('.more-learn, .more-links').count(),0,'main map has no duplicate advanced links');
  assert.equal(await page.locator('.hemi-study-sources').count(),1,'scientific background remains accessible on comparison tab');
  assert.deepEqual(errors,[],'unexpected browser errors');
  report.push({name,status:'PASS',viewport:width,lobeSummaryTop:Math.round(fit.bottom),buttons:6,noOverflow:true});
  await page.close();
 }
 // Headless Chromium may not have Korean device voices. Test control semantics with
 // an explicit in-page speech mock; this is not evidence of audible device output.
 const speechPage=await browser.newPage({viewport:{width:390,height:844}});
 await speechPage.addInitScript(()=>{
  window.__qaSpeech={utterances:[],cancelCount:0};
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
   cancel(){window.__qaSpeech.cancelCount++;},
   getVoices(){return [{name:'QA Korean voice',lang:'ko-KR'}];},
   speak(u){window.__qaSpeech.utterances.push(u.text);}
  }});
  window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;this.lang='';this.rate=1;}};
 });
 await speechPage.goto(base+'brain-map/',{waitUntil:'networkidle',timeout:30000});
 const speakButton=speechPage.locator('#lobeSceneRead');
 assert.equal(await speakButton.getAttribute('aria-pressed'),'false');
 await speakButton.click();
 assert.equal(await speakButton.getAttribute('aria-label'),'현재 설명 읽기 멈추기','screen reader gets correct active button purpose');
 assert.equal(await speakButton.getAttribute('aria-pressed'),'true');
 const spoken=await speechPage.evaluate(()=>window.__qaSpeech.utterances[0]);
 assert.match(spoken,/친구와 대화할 때/,'speech includes the selected daily-life scene');
 assert.match(spoken,/말소리 살피기/,'speech includes the selected process');
 await speakButton.click();
 assert.equal(await speakButton.getAttribute('aria-label'),'현재 선택한 과정과 관련 뇌 부위 설명 듣기');
 assert.equal(await speakButton.getAttribute('aria-pressed'),'false');
 await speechPage.locator('[data-lobe-scene="ball"]').click();
 await speechPage.locator('#lobeSceneRoles [data-scene-region="occipital"]').click();
 assert.match(await speechPage.locator('#lobeSceneFocusText').innerText(),/굴러오거나 날아오는 공/,'brain-process wording includes guided rolling-ball activity');
 await speakButton.click();
 const spokenBall=await speechPage.evaluate(()=>window.__qaSpeech.utterances.at(-1));
 assert.match(spokenBall,/공놀이할 때/);
 await speechPage.locator('[data-lobe-scene="read"]').click();
 assert.equal(await speakButton.getAttribute('aria-pressed'),'false','changing scene cancels speech and resets accessible button');
 await speechPage.close();
 await writeFile(out+'/result.json',JSON.stringify({passed:true,report,speechControl:'PASS (mocked synthesis control; audible voice unverified)'},null,2));
 console.log('BRAIN MAP QA PASS '+JSON.stringify(report));
}catch(e){
 report.push({status:'FAIL',error:String(e.stack||e)});
 await writeFile(out+'/result.json',JSON.stringify({passed:false,report},null,2));
 console.error('BRAIN MAP QA FAIL '+String(e.stack||e));
 process.exitCode=1;
}finally{await browser.close();}

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
  assert.equal(await page.locator('.lobe-card').count(),6,'six main functions are visible');
  assert.equal(await page.locator('.sub-footer > div').count(),1,'footer brand must be valid and grouped in its own div');
  assert.equal(await page.locator('.hemi-fact').count(),2,'both hemispheres immediately visible');
  assert.equal(await page.locator('.both-work').count(),1,'brain cooperation statement visible');
  assert.equal(await page.locator('#brainMap [data-brain-region]').count(),6,'six interactive regions');
  assert.equal(await page.locator('.brain-hero,.brain3d-feature,.brain-explorer,.brain-networks,.brain-faq').count(),0,'no prior scrolling sections');
  assert.equal(await page.locator('#simpleDetail').isHidden(),true,'optional detail starts closed');
  assert.equal(await page.locator('.more-learn').getAttribute('open'),null,'advanced features closed by default');
  assert.notEqual(await page.locator('.sub-footer .footer-social').evaluate(el=>getComputedStyle(el).position),'fixed','shared social links must not float over educational content');
  const footerColor=await page.locator('.sub-footer .footer-social a').first().evaluate(el=>getComputedStyle(el).color);
  assert.ok(footerColor==='rgb(241, 248, 242)','social links should have readable contrast on dark footer, got '+footerColor);
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
  const textSize=await page.evaluate(()=>({
   cards:parseFloat(getComputedStyle(document.querySelector('.lobe-card small')).fontSize),
   hemisphere:parseFloat(getComputedStyle(document.querySelector('.hemi-fact p')).fontSize)
  }));
  const minimum=width<=380?11.5:width<500?12.5:13;
  assert.ok(textSize.cards>=minimum,'brain function descriptions too small: '+JSON.stringify(textSize));
  assert.ok(textSize.hemisphere>=(width<381?11:width<500?12:13),'hemisphere explanation too small');
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
  if(name==='desktop'||name==='mobile'){
    const sceneAction=page.locator('#hemiTryScene');
    await sceneAction.click();
    assert.equal(await page.locator('#hemiSceneAction').isVisible(),true,'hands-on action must be shown');
    assert.match(await page.locator('#hemiSceneAction').innerText(),/직접 해보기/);
    await page.locator('[data-brain-scene="ball"]').click();
    assert.equal(await page.locator('#hemiSceneAction').isHidden(),true,'switching scenes clears stale activity');
    await page.locator('[data-brain-scene="talk"]').click();
  }
  const listening=page.locator('#hemiReadOverview');
  assert.equal(await listening.count(),1,'optional spoken summary available');
  assert.equal(await page.locator('#hemiTopicRead').count(),1,'topic speech entry is accessible');
  assert.equal(await page.locator('#hemiReadScene').count(),1);
  assert.equal(await page.locator('#hemiReadQuiz').count(),1);
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
  assert.equal(await page.locator('#hemiQuizProgress').innerText(),'1 / 3');
  await page.locator('[data-hemi-answer="0"]').click();
  assert.equal(await page.locator('#hemiQuizResponse').isVisible(),true);
  assert.match(await page.locator('#hemiQuizResponse').innerText(),/우뇌도 함께/);
  assert.equal(await page.locator('[data-hemi-answer="1"]').isDisabled(),true);
  await page.locator('#hemiQuizNext').click();
  assert.equal(await page.locator('#hemiQuizProgress').innerText(),'2 / 3');
  await page.locator('[data-hemi-answer="0"]').click();
  assert.equal(await page.locator('#hemiQuizResponse').getAttribute('data-result'),'review');
  assert.match(await page.locator('#hemiQuizResponse').innerText(),/우뇌가 상대적으로/);
  await page.locator('#hemiQuizNext').click();
  assert.equal(await page.locator('#hemiQuizProgress').innerText(),'3 / 3');
  await page.locator('[data-hemi-answer="1"]').click();
  assert.match(await page.locator('#hemiQuizResponse').innerText(),/양쪽 뇌/);
  assert.equal(await page.locator('#hemiQuizNext').innerText(),'다른 3문제 →');
  await page.locator('#hemiQuizNext').click();
  assert.equal(await page.locator('#hemiQuizProgress').innerText(),'1 / 3');
  assert.match(await page.locator('#hemiQuizQuestion').innerText(),/왼손을 움직일 때/,'new recall set must differ');
  assert.equal(await page.locator('#hemiQuizResponse').isHidden(),true);
  await page.locator('[data-hemi-answer="1"]').click();
  assert.match(await page.locator('#hemiQuizResponse').innerText(),/우뇌 운동 영역/);
  await page.locator('#hemiQuizNext').click();
  assert.match(await page.locator('#hemiQuizQuestion').innerText(),/친구 기분/);
  await page.locator('[data-hemi-answer="0"]').click();
  assert.equal(await page.locator('#hemiQuizResponse').getAttribute('data-result'),'review');
  await page.locator('#hemiQuizNext').click();
  assert.match(await page.locator('#hemiQuizQuestion').innerText(),/연결 통로/);
  await page.locator('[data-hemi-answer="0"]').click();
  assert.match(await page.locator('#hemiQuizResponse').innerText(),/뇌량/);
  await page.locator('#hemiQuizNext').click();
  assert.match(await page.locator('#hemiQuizQuestion').innerText(),/물건의 위치/);
  await page.locator('[data-hemi-answer="1"]').click();
  await page.locator('#hemiQuizNext').click();
  assert.match(await page.locator('#hemiQuizQuestion').innerText(),/그림을 그리고/);
  await page.locator('[data-hemi-answer="1"]').click();
  await page.locator('#hemiQuizNext').click();
  assert.match(await page.locator('#hemiQuizQuestion').innerText(),/오른손잡이/);
  await page.locator('[data-hemi-answer="1"]').click();
  await page.locator('#hemiQuizNext').click();
  assert.match(await page.locator('#hemiQuizQuestion').innerText(),/말과 문장을 만드는/,'all three groups rotate');
  assert.equal(await page.locator('#hemiQuizProgress').innerText(),'1 / 3');
  const apply=page.locator('#hemiPracticeMode');
  await apply.click();
  assert.equal(await apply.getAttribute('aria-pressed'),'true');
  assert.match(await page.locator('#hemiQuizQuestion').innerText(),/민지가/,'real-life practice question');
  await page.locator('[data-hemi-answer="1"]').click();
  assert.match(await page.locator('#hemiQuizResponse').innerText(),/여러 뇌 영역/);
  await page.locator('#hemiQuizNext').click();
  assert.match(await page.locator('#hemiQuizQuestion').innerText(),/공을 잡는/);
  await page.locator('[data-hemi-answer="0"]').click();
  await page.locator('#hemiQuizNext').click();
  assert.match(await page.locator('#hemiQuizQuestion').innerText(),/글씨 쓰기/);
  await page.locator('[data-hemi-answer="0"]').click();
  assert.equal(await page.locator('#hemiQuizNext').innerText(),'생활 문제 다시 풀기');
  await apply.click();
  assert.equal(await apply.getAttribute('aria-pressed'),'false');
  assert.match(await page.locator('#hemiQuizQuestion').innerText(),/말과 문장을 만드는/,'switching back resets basic exercise');
  for(const scene of ['talk','read','map','ball','music','draw','bag','feeling']){
    await page.locator('[data-brain-scene="'+scene+'"]').click();
    assert.equal(await page.locator('[data-brain-scene="'+scene+'"]').getAttribute('aria-pressed'),'true');
    assert.ok((await page.locator('#hemiSceneText').innerText()).length>35,'scene details should be concrete: '+scene);
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
    quiz:[...document.querySelectorAll('.hemi-quiz-options button')].map(e=>{const b=e.getBoundingClientRect();return {w:b.width,h:b.height,left:b.left,right:b.right};}),
    answerText:parseFloat(getComputedStyle(document.querySelector('.hemi-quiz-options button')).fontSize),
    sceneText:parseFloat(getComputedStyle(document.getElementById('hemiSceneText')).fontSize)
  }));
  assert.ok(lessonFit.scenes.every(x=>x.h>=44&&x.left>=0&&x.right<=width+1),'scene touch size or clipping: '+JSON.stringify(lessonFit));
  assert.ok(lessonFit.quiz.every(x=>x.h>=44&&x.left>=0&&x.right<=width+1),'quiz touch size or clipping: '+JSON.stringify(lessonFit));
  assert.ok(lessonFit.answerText>=13 && lessonFit.sceneText>=12.5,'lesson typography too small: '+JSON.stringify(lessonFit));
  if(name==='desktop'||name==='mobile'){
    const storyPreview=await page.locator('.hemi-team').screenshot({type:'jpeg',quality:60,animations:'disabled'});
    console.log('BRAIN_SCENE_PREVIEW_'+name+'='+storyPreview.toString('base64'));
    const recallPreview=await page.locator('.hemi-quick-check').screenshot({type:'jpeg',quality:60,animations:'disabled'});
    console.log('BRAIN_RECALL_PREVIEW_'+name+'='+recallPreview.toString('base64'));
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

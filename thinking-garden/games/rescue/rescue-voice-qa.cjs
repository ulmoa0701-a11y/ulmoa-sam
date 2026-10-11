const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const URL=process.env.RESCUE_URL||'http://127.0.0.1:8765/thinking-garden/games/rescue/';
(async()=>{
 const browser=await chromium.launch({headless:true});
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport});
  const page=await context.newPage();
  await page.addInitScript(()=>{
   // Emulate the browser's Korean voice metadata; no audio recording/actual acoustic judgement.
   const voices=[
    {name:'Korean Adult OS',lang:'ko-KR',voiceURI:'test-adult',localService:true},
    {name:'Google 한국어',lang:'ko-KR',voiceURI:'google-online-ko',localService:false},
    {name:'Google 한국어 (기기)',lang:'ko-KR',voiceURI:'google-local-ko',localService:true},
    {name:'English Voice',lang:'en-US',voiceURI:'test-english',localService:true}
   ];
   window.__voiceCaptured={spoken:[],cancelCount:0};
   Object.defineProperty(window,'speechSynthesis',{value:{
    getVoices:()=>voices,
    cancel:()=>window.__voiceCaptured.cancelCount++,
    speak:u=>window.__voiceCaptured.spoken.push({
     text:u.text,lang:u.lang,rate:u.rate,pitch:u.pitch,volume:u.volume,voiceURI:u.voice?.voiceURI||null
    }),
    addEventListener:()=>{}
   },configurable:true});
   window.SpeechSynthesisUtterance=class {constructor(text){this.text=text}};
  });
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.goto(URL,{waitUntil:'load'});
  await page.locator('#voiceBtn').click();
  assert.equal(await page.locator('#voicePanel').isVisible(),true);
  assert.equal(await page.locator('#voiceBtn').getAttribute('aria-expanded'),'true');
  const labels=await page.locator('#voiceSelect option').allTextContents();
  assert.equal(labels.length,3,'Only Google Korean voices plus default');
  assert.ok(labels.some(s=>s.includes('Google 한국어')));
  assert.ok(!labels.some(s=>s.includes('Adult')),'Adult/system voice options must be hidden');
  assert.ok(!labels.some(s=>s.includes('English')));
  assert.equal(await page.locator('#voiceSelect').inputValue(),'google-auto','Google must be default');
  await page.locator('#voicePreview').click();
  const automatic=await page.evaluate(()=>window.__voiceCaptured.spoken.at(-1));
  assert.equal(automatic.voiceURI,'google-online-ko','Online Google Korean preferred over local Google');
  assert.equal(automatic.lang,'ko-KR');
  assert.equal(automatic.pitch,1,'Do not unnaturally distort TTS pitch');
  assert.equal(automatic.rate,1,'Natural, clear speech pacing');
  await page.locator('#voiceSelect').selectOption('google-local-ko');
  await page.locator('#voicePreview').click();
  const picked=await page.evaluate(()=>window.__voiceCaptured.spoken.at(-1));
  assert.equal(picked.voiceURI,'google-local-ko','A different Google Korean voice may be selected');
  await page.locator('#soundBtn').click();
  const count=await page.evaluate(()=>window.__voiceCaptured.spoken.length);
  await page.locator('#voicePreview').click();
  assert.equal(await page.evaluate(()=>window.__voiceCaptured.spoken.length),count,'Mute must suppress playback');
  await page.locator('#soundBtn').click();
  await page.locator('#voiceClose').click();
  assert.equal(await page.locator('#voicePanel').isVisible(),false);
  const rects=await page.locator('.audio-tools button').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().toJSON()));
  assert.ok(rects.every(b=>b.width>=32&&b.right<=viewport.width),'Controls remain within mobile viewport');
  await page.reload({waitUntil:'load'});
  await page.locator('#voiceBtn').click();
  assert.equal(await page.locator('#voiceSelect').inputValue(),'google-local-ko','Google choice persisted');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#voicePanel').isVisible(),false);
  assert.deepEqual(errors,[]);
  console.log('GOOGLE VOICE QA PASS',viewport.width+'x'+viewport.height,{default:automatic.voiceURI,chosen:picked.voiceURI});
  await context.close();
 }
 // No Google voice available: never speak with an arbitrary adult/system voice.
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const page=await context.newPage();
 await page.addInitScript(()=>{
  window.__speechEvents=[];
  Object.defineProperty(window,'speechSynthesis',{value:{
   getVoices:()=>[{name:'Korean Adult OS',lang:'ko-KR',voiceURI:'adult-only',localService:true}],
   cancel:()=>{},speak:u=>window.__speechEvents.push(u.text),addEventListener:()=>{}
  },configurable:true});
  window.SpeechSynthesisUtterance=class {constructor(text){this.text=text}};
 });
 await page.goto(URL,{waitUntil:'load'});
 await page.locator('#voiceBtn').click();
 assert.equal(await page.locator('#voicePreview').isDisabled(),true);
 assert.ok((await page.locator('#voiceNote').textContent()).includes('찾지 못했어요'));
 assert.equal(await page.evaluate(()=>speak('오리를 찾아 구조해요')),false);
 assert.deepEqual(await page.evaluate(()=>window.__speechEvents),[],'No forced adult/system fallback');
 assert.equal(await page.locator('#voiceSelect option').count(),1);
 console.log('GOOGLE VOICE UNAVAILABLE QA PASS — written instructions preserved, no adult voice substitution');
 await context.close();
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});

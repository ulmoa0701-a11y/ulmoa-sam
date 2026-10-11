const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const URL=process.env.RESCUE_URL||'http://127.0.0.1:8765/thinking-garden/games/rescue/';
(async()=>{
 const browser=await chromium.launch({headless:true});
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport});
  const page=await context.newPage();
  await page.addInitScript(()=>{
   const voices=[
    {name:'Korean Standard',lang:'ko-KR',voiceURI:'test-ko-standard',localService:true},
    {name:'Korean Female Natural',lang:'ko-KR',voiceURI:'test-ko-gentle',localService:true},
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
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(URL,{waitUntil:'load'});
  await page.locator('#voiceBtn').click();
  assert.equal(await page.locator('#voicePanel').isVisible(),true);
  assert.equal(await page.locator('#voiceBtn').getAttribute('aria-expanded'),'true');
  const choices=await page.locator('#voiceSelect option').allTextContents();
  assert.equal(choices.length,3,'Only two Korean voices plus auto should appear');
  assert.ok(choices.some(x=>x.includes('Korean Female Natural')));
  assert.ok(!choices.some(x=>x.includes('English Voice')));
  await page.locator('#voiceSelect').selectOption('test-ko-gentle');
  await page.locator('#voicePreview').click();
  const got=await page.evaluate(()=>window.__voiceCaptured.spoken.at(-1));
  assert.ok(got.text.includes('모아 구조대'));
  assert.equal(got.lang,'ko-KR');
  assert.equal(got.voiceURI,'test-ko-gentle');
  assert.ok(got.rate>=.95 && got.rate<=1.1,'Use natural, non-dragging Korean rate');
  assert.ok(got.pitch>=1 && got.pitch<=1.25,'Use slight, not shrill, pitch lift');
  assert.ok(got.volume<=1 && got.volume>=.75);
  await page.locator('#soundBtn').click();
  const before=await page.evaluate(()=>window.__voiceCaptured.spoken.length);
  await page.locator('#voicePreview').click();
  assert.equal(await page.evaluate(()=>window.__voiceCaptured.spoken.length),before,'Muted speech must stay silent');
  assert.ok((await page.locator('#voiceNote').textContent()).includes('소리'));
  await page.locator('#soundBtn').click();
  await page.locator('#voiceClose').click();
  assert.equal(await page.locator('#voicePanel').isVisible(),false);
  const xs=await page.locator('.audio-tools button').evaluateAll(els=>els.map(e=>e.getBoundingClientRect()));
  assert.ok(xs.every(b=>b.width>=32&&b.right<=viewport.width),'Voice icons stay onscreen on mobile');
  await page.reload({waitUntil:'load'});
  await page.locator('#voiceBtn').click();
  assert.equal(await page.locator('#voiceSelect').inputValue(),'test-ko-gentle','Chosen voice must persist');
  assert.equal(await page.locator('#voiceBtn').getAttribute('aria-expanded'),'true');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#voicePanel').isVisible(),false);
  assert.deepEqual(errors,[]);
  console.log('VOICE QA PASS',viewport.width+'x'+viewport.height,{chosen:got.voiceURI,rate:got.rate,pitch:got.pitch,voices:choices.length});
  await context.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});

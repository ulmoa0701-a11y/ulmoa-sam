const { chromium, devices } = require('playwright');
const fs = require('node:fs');
const target = 'https://ulmoa0701-a11y.github.io/ulmoa-sam/heart-score/ai/?v=702';
(async () => {
  const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const profiles = [
    {name:'Android-Chrome-Pixel7',settings:devices['Pixel 7']},
    {name:'Android-Chrome-Galaxy-sized',settings:{viewport:{width:412,height:915},isMobile:true,hasTouch:true,deviceScaleFactor:3,userAgent:devices['Pixel 7'].userAgent}}
  ];
  const summary=[];
  for(const profile of profiles){
    const context=await browser.newContext(profile.settings);
    const page=await context.newPage(); page.setDefaultTimeout(90000);
    const consoleMessages=[], failures=[], responses=[];
    page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')consoleMessages.push(m.type()+': '+m.text())});
    page.on('pageerror',e=>consoleMessages.push('pageerror: '+e.message));
    page.on('requestfailed',r=>failures.push({url:r.url(),error:r.failure()?.errorText}));
    page.on('response',r=>{if(/onnx|ort\.min\.js|omr-ai-v702|omr-line\.fp16|pdfjs|tesseract/i.test(r.url()))responses.push({url:r.url(),status:r.status()})});
    const result={profile:profile.name,url:target,ready:false,modelLoaded:false,uploadOutcome:null,consoleMessages,failures,responses};
    try{
      await page.goto(target,{waitUntil:'domcontentloaded',timeout:90000});
      const iframe=page.locator('#app');await iframe.waitFor({state:'attached'});
      const frame=await iframe.contentFrame();
      await page.waitForFunction(()=>document.getElementById('app')?.contentDocument?.querySelector('#imageScoreFile')?.dataset?.aiOmr==='v702',{},{timeout:90000});
      result.ready=true;
      result.initialStatus=await frame.locator('#imageStatus').innerText().catch(()=>'(no imageStatus)');
      result.loadingText=await page.locator('#loading').innerText().catch(()=>'removed');
      const b64=await page.evaluate(()=>{
        const canvas=document.createElement('canvas'),c=canvas.getContext('2d');
        canvas.width=1500;canvas.height=1000;c.fillStyle='#fff';c.fillRect(0,0,1500,1000);
        c.lineWidth=2;c.strokeStyle='#111';c.fillStyle='#111';
        for(let row=0;row<4;row++){
          const y=130+row*205;
          for(let i=0;i<5;i++){c.beginPath();c.moveTo(75,y+i*15);c.lineTo(1410,y+i*15);c.stroke()}
          for(let m=0;m<4;m++){
            if(m>0){c.beginPath();c.moveTo(75+m*334,y);c.lineTo(75+m*334,y+60);c.stroke()}
            for(let k=0;k<4;k++){
              const x=105+m*334+k*73,ny=y+60-(k%4)*7.5;
              c.beginPath();c.ellipse(x,ny,10,6,-.2,0,Math.PI*2);c.fill();
              c.beginPath();c.moveTo(x+9,ny);c.lineTo(x+9,ny-48);c.stroke()
            }
          }
        }
        return canvas.toDataURL('image/png').split(',')[1];
      });
      const uploadStarted=Date.now(); await frame.locator('button.tab[data-tab="image"]').tap(); const chooserPromise=page.waitForEvent('filechooser',{timeout:15000}); await frame.locator('label[for="imageScoreFile"] .btn').tap(); const chooser=await chooserPromise; result.fileChooserViaTap=true; await chooser.setFiles({name:'synthetic-staff-mobile-smoke.png',mimeType:'image/png',buffer:Buffer.from(b64,'base64')});
      await page.waitForFunction(()=>{const d=document.getElementById('app')?.contentDocument;return /초안 완료|결과 검증|분석 실패|자동 변환|오선보가 아니라|불러오지 못|본체 연결 실패/.test(d?.querySelector('#imageStatus')?.textContent||'')||!!d?.querySelector('#pages')?.innerText?.includes('자동 변환을 중단')},{},{timeout:115000}).catch(e=>{result.waitError=String(e)});
      const state=await page.evaluate(()=>{const w=document.getElementById('app').contentWindow,d=w.document;return {
        status:d.querySelector('#imageStatus')?.textContent||'',
        pageInfo:d.querySelector('#pageInfo')?.textContent||'',
        pageText:d.querySelector('#pages')?.innerText?.slice(0,400)||'',
        ort:!!w.ort,modelStatus:typeof w.importScoreFromFileAI,
        isAI:d.querySelector('#imageScoreFile')?.dataset?.aiOmr
      }});
      result.uploadElapsedMs=Date.now()-uploadStarted; result.uploadOutcome=state;
      result.modelLoaded=state.ort;
      result.successfulRuntime=state.ort && !/AI 실행 엔진 다운로드 실패|Failed to fetch|failed to fetch|WebAssembly|Unable to load|이용할 수 없|연결 실패/i.test(state.status+' '+state.pageText);
      await page.screenshot({path:'mobile-'+profile.name+'.png',fullPage:true}).catch(()=>{});
    }catch(e){result.error=String(e)}
    summary.push(result);console.log('MOBILE_SMOKE '+JSON.stringify(result));
    await context.close();
  }
  await browser.close();
  fs.writeFileSync('mobile-live-result.json',JSON.stringify(summary,null,2));
  if(summary.some(s=>!s.ready||!s.modelLoaded||!s.successfulRuntime||s.error)) process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});

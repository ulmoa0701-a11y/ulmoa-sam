import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const base=(process.env.TEST_BASE_URL||'http://127.0.0.1:8765').replace(/\/$/,'');
const output='qa/breath-recorder-artifacts/'+(process.env.LIVE_TEST?'live':'staging');
fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN, args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
const checks=[];
async function run(width,height,label) {
 const context=await browser.newContext({viewport:{width,height},permissions:['microphone'],locale:'ko-KR'});
 const p=await context.newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/breath-garden/',{waitUntil:'domcontentloaded',timeout:30000});
 assert.equal(await p.locator('#chooseCalm').isVisible(),true,'Calm choice available');
 assert.equal(await p.locator('#chooseLong').isVisible(),true,'Long breath choice available');
 await p.screenshot({path:output+'/breath-home-'+label+'.png',fullPage:true});
 await p.locator('#chooseCalm').click();
 assert.equal(await p.locator('#calmEnough').isVisible(),true);
 assert.equal(await p.locator('#calmScene').getAttribute('data-preset'),'flower');
 for(const kind of ['balloon','star','wave','leaf','flower']){
  await p.locator('#calmPresets [data-calm="'+kind+'"]').click();
  assert.equal(await p.locator('#calmScene').getAttribute('data-preset'),kind,'Unique visual preset '+kind);
 }
 await p.screenshot({path:output+'/calm-'+label+'.png',fullPage:true});
 await p.locator('#calmEnough').click();
 assert.equal(await p.locator('#successScreen').isVisible(),true,'Optional early finish leads to clear completion');
 await p.locator('#chooseAgain').click();
 await p.locator('#chooseLong').click();
 assert.equal(await p.locator('#longProgress').isVisible(),true,'Two attempt progress shown');
 await p.locator('#longDuration [data-seconds="3"]').click();
 assert.match(await p.locator('#targetDuration').innerText(),/3초/);
 await p.screenshot({path:output+'/long-'+label+'.png',fullPage:true});
 await p.locator('#backHome').click();
 await p.locator('#chooseStrength').click();
 assert.equal(await p.locator('#featherStage').isVisible(),true);
 await p.locator('#backHome').click();
 await p.locator('#chooseBeat').click();
 assert.equal(await p.locator('#beatScene').isVisible(),true);
 await p.goto(base+'/thinking-garden/recorder/',{waitUntil:'domcontentloaded'});
 assert.equal(await p.locator('.rec-main-start').isVisible(),true);
 assert.equal(await p.locator('.rec-advanced').getAttribute('open'),null,'Optional routes start collapsed');
 await p.screenshot({path:output+'/recorder-home-'+label+'.png',fullPage:true});
 await p.locator('.rec-main-start').click();
 assert.equal(await p.locator('#practiceScreen').isVisible(),true);
 await p.locator('#playerRecorder [data-hole="0"]').click();
 await p.locator('#playerRecorder [data-hole="1"]').click();
 await p.waitForTimeout(950);
 assert.equal(await p.locator('#nextBtn').isVisible(),true,'Easy fingering detects success without check-button');
 assert.match(await p.locator('#feedback').innerText(),/손가락 완성/);
 await p.waitForTimeout(4650);
 assert.match(await p.locator('#roundTitle').innerText(),/2 \/ 6/,'Advances automatically after visible reward');
 await p.screenshot({path:output+'/recorder-practice-'+label+'.png',fullPage:true});
 const overflow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 assert.ok(overflow<=2,'No horizontal overflow: '+overflow);
 assert.deepEqual(errors,[], 'No uncaught JavaScript errors in '+label);
 checks.push({label,ok:true,width,height});
 await context.close();
}
try {
 await run(1280,800,'desktop');
 await run(390,844,'mobile');
 console.log('PASS integrated recorder + breathing QA',JSON.stringify(checks));
} finally { await browser.close() }

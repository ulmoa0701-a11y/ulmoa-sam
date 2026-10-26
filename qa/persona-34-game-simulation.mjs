// Automated scenario coverage, NOT testing conducted with real people.
// Seven fictional users vary access conditions; age is descriptive and does not
// imply uniform abilities, literacy, diagnosis, preference or likely success.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');

const BASE=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
const OUT='qa/persona-34-artifacts';
fs.mkdirSync(OUT,{recursive:true});

const SHARED=['memory','spacing','spelling','sameShape','flower','hide','path',
 'calm','inside','targets','resetRescue','classroomMove','festivalPlan',
 'rulePost','mirrorPond','sceneDetect','slowScan','slowPlace','slowBlock',
 'slowName','slowMemory','slowEveryday','paint','water'];
const STANDALONE=[
 ['rescue','/thinking-garden/games/rescue/'],
 ['hand-mirror','/thinking-garden/games/hand-mirror/'],
 ['money','/thinking-garden/games/moa-missions/?game=money'],
 ['change','/thinking-garden/games/moa-missions/?game=change'],
 ['feel','/thinking-garden/games/moa-missions/?game=feel'],
 ['rhythm-touch','/thinking-garden/games/rhythm-touch/'],
 ['recorder','/thinking-garden/recorder/'],
 ['strength','/breath-garden/?mode=strength'],
 ['long','/breath-garden/?mode=long'],
 ['beat','/breath-garden/?mode=beat']
];
const PROFILES=[
 {id:'early-reader',label:'유아·초기 읽기 학습 예시',age:'5–7',width:360,height:780,touch:true,large:1,reduce:true,mute:true,reading:'nonreader'},
 {id:'primary-touch',label:'초등 터치 사용 예시',age:'8–12',width:390,height:844,touch:true,large:1,reduce:false,mute:false,reading:'basic'},
 {id:'adolescent-tablet',label:'청소년 태블릿 사용 예시',age:'13–17',width:768,height:1024,touch:true,large:1,reduce:false,mute:true,reading:'fluent'},
 {id:'teen-keyboard',label:'청소년 키보드 접근 예시',age:'13–17',width:1280,height:800,touch:false,keyboard:true,large:1,reduce:true,mute:true,reading:'fluent'},
 {id:'adult-mobile',label:'성인 휴대전화 사용 예시',age:'18–59',width:390,height:844,touch:true,large:1,reduce:false,mute:false,reading:'fluent'},
 {id:'motor-keyboard',label:'정교한 터치가 어려운 이용자 예시',age:'전 연령',width:1024,height:768,touch:false,keyboard:true,large:1.2,reduce:true,mute:true,reading:'basic'},
 {id:'older-large-text',label:'큰 글씨가 필요한 장년·실버 이용자 예시',age:'60+',width:768,height:950,touch:false,keyboard:true,large:1.5,reduce:true,mute:true,reading:'basic'}
];
if(SHARED.length!==24||STANDALONE.length!==10)throw Error('34-game registry changed; update profile mapping first');
const browser=await chromium.launch({headless:true,
 executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
 args:['--no-sandbox','--disable-dev-shm-usage']});
const rows=[],failures=[],issues=[];
function check(ok,message){if(!ok)failures.push(message)}
function note(profile,game,type,detail){issues.push({profile,game,type,detail})}
function brief(error){return String(error?.message||error).slice(0,240)}
async function zoomText(page,profile){
 if(profile.large>1)await page.evaluate(scale=>{document.documentElement.style.fontSize=(16*scale)+'px'},profile.large);
}
async function pushMetrics(page,profile,id,kind){
 const info=await page.evaluate(()=>{
  const root=document.querySelector('#gameArea')||document.body;
  const buttons=[...root.querySelectorAll('button,[role="button"],[tabindex="0"]')]
   .filter(el=>{const r=el.getBoundingClientRect(),style=getComputedStyle(el);return r.width>0&&r.height>0&&style.visibility!=='hidden'&&style.display!=='none'})
   .slice(0,45);
  const small=buttons.filter(el=>{const r=el.getBoundingClientRect();return r.width<24||r.height<24})
   .map(el=>({text:(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,30),
      size:[Math.round(el.getBoundingClientRect().width),Math.round(el.getBoundingClientRect().height)]})).slice(0,5);
  const targets=buttons.length;
  const overflow=Math.max(0,document.documentElement.scrollWidth-innerWidth);
  const guide=document.querySelector('.moa-play-compass')||document.querySelector('.moa-quick-guide');
  const guideLength=(guide?.textContent||'').replace(/\s+/g,' ').trim().length;
  return {overflow,targets,small,guideLength};
 });
 if(info.overflow>18)note(profile.id,id,'horizontal-overflow',String(info.overflow)+' px');
 if(info.small.length)note(profile.id,id,'small-target',JSON.stringify(info.small));
 if(profile.reading==='nonreader'&&info.guideLength>160)
  note(profile.id,id,'text-load','Visible/expandable guide has '+info.guideLength+' characters; comprehension not tested');
 if(info.targets===0&&kind==='shared')note(profile.id,id,'no-standard-control','Game may require drag, canvas, gesture or alternate interaction');
 return info;
}
const actionMap={
 memory:'.memory-ready',sameShape:'.basic-choice',flower:'.object-btn',
 hide:'.leaf-has-clue',path:'.trail-node.ready',calm:'#signalBtn',
 inside:'#insideZone',targets:'.wake-target',paint:'#paintGrid',
 water:'.wilt[data-good="1"]'
};
async function firstAction(page,profile,id){
 const selector=actionMap[id]||'#gameArea button, #gameArea [role="button"], #gameArea [tabindex="0"]';
 const locator=page.locator(selector).first();
 if(!await locator.count())return 'no-control';
 try{
  if(!await locator.isVisible())return 'hidden-control';
  if(profile.keyboard){
   await locator.focus({timeout:2500});
   if(await locator.getAttribute('tabindex')==='-1')return 'not-keyboard-target';
   await page.keyboard.press('Enter');
   return 'keyboard-enter';
  }
  if(id==='paint'){await locator.focus();await page.keyboard.press('Enter');return 'paint-keyboard';}
  if(profile.touch){try{await locator.tap({timeout:3000});return 'touch-tap'}catch(e){
    await locator.click({timeout:3000});return 'pointer-click-fallback';
   }}
  await locator.click({timeout:3000});return 'pointer-click';
 }catch(e){return 'action-error: '+brief(e)}
}
try{
 for(const profile of PROFILES){
  const context=await browser.newContext({
   viewport:{width:profile.width,height:profile.height},
   hasTouch:!!profile.touch,isMobile:profile.width<=390,
   reducedMotion:profile.reduce?'reduce':'no-preference',
   deviceScaleFactor:profile.width<=390?2:1
  });
  const page=await context.newPage();
  page.setDefaultTimeout(5000);
  let jsErrors=[];
  page.on('pageerror',e=>jsErrors.push(brief(e)));
  const profileRows=[];
  for(const id of SHARED){
   const mark=profile.id+'/'+id;
   jsErrors=[];
   try{
    const response=await page.goto(BASE+'/thinking-garden/?game='+encodeURIComponent(id),{waitUntil:'domcontentloaded',timeout:20000});
    check(response?.ok(),mark+' HTTP failed');
    const intro=page.locator('#introStart');
    await intro.waitFor({state:'visible',timeout:6000});
    await zoomText(page,profile);
    if(profile.mute&&await page.locator('#soundToggle').count()){
      const title=await page.locator('#soundToggle').getAttribute('aria-label');
      if(title?.includes('소리 끄기'))await page.locator('#soundToggle').click();
    }
    if(profile.keyboard){await intro.focus();await page.keyboard.press('Enter')}
    else if(profile.touch)await intro.tap({timeout:4000});
    else await intro.click();
    await page.locator('#gameScreen.active').waitFor({state:'visible',timeout:6000});
    const gameArea=page.locator('#gameArea');
    check(await gameArea.isVisible(),mark+' no play area');
    check((await gameArea.innerHTML()).length>70,mark+' no playable content');
    const guide=page.locator('.moa-play-compass');
    check(await guide.count()===1,mark+' mission guidance missing');
    const objective=(await page.locator('#missionText').textContent())?.trim()||'';
    check(objective.length>0,mark+' no task information');
    const metrics=await pushMetrics(page,profile,id,'shared');
    const action=await firstAction(page,profile,id);
    if(action.startsWith('action-error')||action==='no-control')
      note(profile.id,id,'action','First physical action: '+action);
    if(profile.keyboard&&['no-control','hidden-control','not-keyboard-target'].includes(action))
      note(profile.id,id,'keyboard-gap','Cannot confirm keyboard action with ordinary focusable control');
    if(jsErrors.length)failures.push(mark+' JavaScript '+jsErrors.join(' | '));
    const row={profile:profile.id,game:id,kind:'shared',loaded:true,
      action,objectiveLength:objective.length,...metrics,scriptErrors:jsErrors.length};
    rows.push(row);profileRows.push(row);
    if(profile.id==='early-reader'&&['sameShape','memory','paint','flower','slowBlock'].includes(id))
      await page.screenshot({path:path.join(OUT,profile.id+'-'+id+'.png'),timeout:9000});
   }catch(e){
    failures.push(mark+' '+brief(e));
    rows.push({profile:profile.id,game:id,kind:'shared',loaded:false,error:brief(e)});
   }
  }
  for(const [id,url] of STANDALONE){
   const mark=profile.id+'/'+id;jsErrors=[];
   try{
    const response=await page.goto(BASE+url,{waitUntil:'domcontentloaded',timeout:20000});
    check(response?.ok(),mark+' HTTP failed');
    await page.locator('body').waitFor({state:'visible'});
    await zoomText(page,profile);
    const help=page.locator('.moa-quick-guide');
    await help.waitFor({state:'visible',timeout:7000});
    const goal=help.locator('.moa-quick-goal');
    const objective=(await goal.textContent())?.trim()||'';
    check(objective.length>=8,mark+' missing standalone instruction');
    const button=help.locator('.moa-quick-toggle');
    if(profile.keyboard){await button.focus();await page.keyboard.press('Enter')}
    else if(profile.touch)await button.tap({timeout:3500});
    else await button.click();
    check(await help.locator('.moa-quick-steps li').count()===3,mark+' guide lacks three actions');
    const metrics=await pushMetrics(page,profile,id,'standalone');
    if(jsErrors.length)failures.push(mark+' JavaScript '+jsErrors.join(' | '));
    const row={profile:profile.id,game:id,kind:'standalone',loaded:true,
      action:'open-three-step-guide',objectiveLength:objective.length,
      ...metrics,scriptErrors:jsErrors.length};
    rows.push(row);profileRows.push(row);
    if(profile.id==='early-reader'&&['money','rescue','rhythm-touch'].includes(id))
      await page.screenshot({path:path.join(OUT,profile.id+'-'+id+'.png'),timeout:9000});
   }catch(e){
    failures.push(mark+' '+brief(e));
    rows.push({profile:profile.id,game:id,kind:'standalone',loaded:false,error:brief(e)});
   }
  }
  console.log('PROFILE '+profile.id+' '+profileRows.filter(x=>x.loaded).length+'/34 scenarios loaded; '+failures.length+' cumulative blocking failures');
  await context.close();
 }
}finally{await browser.close()}

const byGame={};
for(const r of rows){(byGame[r.game]??=[]).push(r)}
const byType={};
for(const i of issues)byType[i.type]=(byType[i.type]||0)+1;
const report={method:'scripted fictional-user accessibility and operation scenarios; no real people participated',
  limitations:['Does not establish reading comprehension, therapeutic benefit, engagement or real motor accuracy',
   'Ages are example contexts, not assumptions about people of that age',
   'Standalone games: the three-step entry guide, not full completion, is tested here',
   'Native game full sessions are covered by independent existing workflow'],
  profiles:PROFILES,expected:PROFILES.length*(SHARED.length+STANDALONE.length),
  scenarios:rows.length,loaded:rows.filter(x=>x.loaded).length,
  passed:failures.length===0,failures,issueCount:issues.length,issueTypes:byType,
  issues,byGame,rows};
fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));
let md=['# 모아의 다섯 정원 34개 게임: 가상 이용자 접근·플레이 시뮬레이션',
 '','실제 이용자가 참여한 연구가 아닙니다. 프로필별 기기, 읽기 부담, 입력방식, 큰 글씨, 움직임·소리 설정을 바꾼 자동 브라우저 검사입니다.',
 '', '- 가상 프로필: '+PROFILES.length, '- 게임: '+(SHARED.length+STANDALONE.length),
 '- 시나리오: '+report.scenarios, '- 게임 진입 성공: '+report.loaded,
 '- 치명적 오류: '+failures.length, '- 접근성/이용성 관찰점: '+issues.length,
 '', '## 관찰점 유형'];
for(const [key,count] of Object.entries(byType))md.push('- '+key+': '+count+'건');
md.push('','## 검증 한계','- 실제 사람의 재미, 이해, 집중 유지, 임상 효과를 검사한 결과가 아닙니다.',
 '- 24개 통합 게임은 시작 후 첫 조작 시도, 10개 독립 게임은 첫 화면·도움말 검증입니다.',
 '- 독립된 전체 회기 검사가 10종 이상 별도 자동 QA로 실행되며 모든 34종의 완주를 뜻하지 않습니다.',
 '', '## 가상 프로필별 결과');
for(const p of PROFILES){const subset=rows.filter(x=>x.profile===p.id);
 md.push('- '+p.label+' ('+p.age+'): '+subset.filter(x=>x.loaded).length+'/34 진입, 관찰점 '+issues.filter(x=>x.profile===p.id).length+'건')}
md.push('','## 주요 조사 필요 항목');
for(const i of issues.slice(0,70))md.push('- '+i.profile+' / '+i.game+' / '+i.type+': '+i.detail);
md.push('','## 차단 오류');if(failures.length)md.push(...failures.map(x=>'- '+x));else md.push('- 없음');
fs.writeFileSync(path.join(OUT,'report.md'),md.join('\n')+'\n');
console.log(JSON.stringify({profiles:PROFILES.length,games:34,scenarios:rows.length,
 loaded:report.loaded,blockingFailures:failures.length,issues:byType},null,2));
if(failures.length){console.error('PERSONA 34 SIMULATION FAIL '+JSON.stringify(failures.slice(0,24)));process.exitCode=1;}

'use strict';
// Traceable inventory / QA coverage; source inspection does NOT certify human
// accessibility, hardware performance, learning outcomes or all 34 full plays.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const nativeBasic=['memory','sameShape','flower','hide','path','calm','inside','targets','paint','water'];
const nativeLiteracy=['spacing','spelling'];
const nativeSlow=['slowScan','slowPlace','slowBlock','slowName','slowMemory','slowEveryday'];
const nativeNovel=['rulePost','mirrorPond','sceneDetect','resetRescue','classroomMove','festivalPlan'];
const independent=['rescue','hand-mirror','money','change','feel','rhythm-touch','recorder','strength','long','beat'];
const all=[...nativeBasic,...nativeLiteracy,...nativeSlow,...nativeNovel,...independent];
assert.equal(all.length,34,'Expected exactly 34 games');
assert.equal(new Set(all).size,34,'Duplicate game ID');
const checks=[
 {ids:nativeBasic,script:'qa/garden-actual-play-qa.cjs',level:'full session, real browser button actions'},
 {ids:nativeLiteracy,script:'qa/garden-literacy-full-play-qa.cjs',level:'full 10/20-item sessions, real browser button actions'},
 {ids:nativeSlow,script:'qa/slow-look-qa.cjs',level:'5/6-round sessions, UI actions, some programmatic DOM button events'},
 {ids:nativeNovel,script:'qa/novel-garden-qa.cjs',level:'5-round sessions, real browser actions'},
 {ids:['rescue'],script:'thinking-garden/games/rescue/rescue-smoke.cjs',level:'five stages, 3 difficulties, canvas pointer actions; synthetic players'},
 {ids:['hand-mirror'],script:'qa/hand-mirror-qa.mjs',level:'virtual gesture rounds; camera input is simulated (not validated on physical device)'},
 {ids:['money','change','feel'],script:'qa/moa-missions-qa.mjs',level:'money/feeling scenarios; some longer virtual sessions'},
 {ids:['change'],script:'qa/garden-schoolbag-full-play-qa.mjs',level:'6 full sessions and 120 UI button rounds'},
 {ids:['rhythm-touch'],script:'thinking-garden/games/rhythm-touch/qa.mjs',level:'5 viewports and scored simulated timeline; includes physical key taps but not live music performance'},
 {ids:['recorder'],script:'qa/recorder-full-play-qa.cjs',level:'4 full virtual fingering sessions / 32 physical button rounds; no actual instrument/camera accuracy'},
 {ids:['strength','long','beat'],script:'qa/breath-recorder-integrated-qa.mjs',level:'entry and settings only; no full microphone play or real wind accuracy'},
 {ids:['strength','long','beat'],script:'qa/breath-synthetic-full-goal-qa.cjs',level:'full goals on desktop/mobile with mocked microphone and synthetic analyser; not actual breath or physical microphone'},
];
const index=new Map(all.map(id=>[id,[]]));
for(const test of checks){
 assert.ok(fs.existsSync(test.script),'Missing QA file: '+test.script);
 for(const id of test.ids){
  assert.ok(index.has(id),'Unknown game '+id);
  index.get(id).push({script:test.script,level:test.level});
 }
}
for(const [id,tests] of index)assert.ok(tests.length>0,'No assigned test '+id);
const hardwareGaps=['hand-mirror','rhythm-touch','strength','long','beat','recorder'];
const fullUnknown=['strength','long','beat'];
const report={scope:'34-game code and synthetic-browser regression mapping, NOT real child or hardware validation',
 at:new Date().toISOString(),count:all.length,native:24,independent:10,
 actualFullBreathModeCoverage:false,
 syntheticBreathFullGoalCoverage:true,
 humanTesting:false,
 gameSummaries:[...index].map(([id,tests])=>({
  id,tests,needsPhysicalDevice:hardwareGaps.includes(id),
  noRealMicrophoneFullGameplayProven:fullUnknown.includes(id),
  syntheticAudioFullGoalProven:fullUnknown.includes(id)
 })),
 openGaps:['Real microphone/wind-controlled full sessions for strength, long and beat',
   'Real camera tracking / real recorder fingering and sound',
   'Real human comprehension, enjoyment, motion accessibility and educational/clinical outcomes'],
 limitations:'Synthetic audio completes three breath goals via the production analyser path but does NOT measure physical breathing or real microphones. CI virtual browsers, simulated gestures, demo mode, source-only checks and page opens are not equivalent to real-device or human validation.'
};
fs.mkdirSync('qa/34-audit-artifacts',{recursive:true});
fs.writeFileSync('qa/34-audit-artifacts/report.json',JSON.stringify(report,null,2)+'\n');
console.log('QA-MAP PASS '+JSON.stringify({games:all.length,native:24,independent:10,fullyUnprovenBreath:fullUnknown,report:'qa/34-audit-artifacts/report.json'}));

import assert from 'node:assert/strict';
import {diagnoseScoreIssue as d} from '../omr-quality-guidance-v1.mjs';

const cases=[
 [{stage:'unsupported'},'UNSUPPORTED_FILE','JPG'],
 [{stage:'pdf-limit'},'PDF_PAGE_LIMIT','4쪽'],
 [{stage:'load-error'},'FILE_READ_ERROR','JPG'],
 [{stage:'engine-error'},'ENGINE_ERROR','새로고침'],
 [{stage:'no-staff'},'STAFF_NOT_FOUND','오선'],
 [{stage:'staff-split'},'STAFF_UNSTABLE','오선'],
 [{width:400,height:250,staffDetected:true},'LOW_IMAGE_RESOLUTION','원본'],
 [{width:1200,height:1000,staffSpacing:6.1,staffDetected:true},'SMALL_STAFF_SYMBOLS','고화질'],
 [{width:1200,height:1000,staffSpacing:10,skewDegrees:4.2,skewConfidence:2},'IMAGE_TILTED','평행'],
 [{width:1200,height:1000,staffSpacing:10,correctionAvg:.34,rawExactRatio:.45},'RHYTHM_UNCERTAIN','점음표'],
 [{width:1200,height:1000,staffSpacing:10,modelDisagreementRatio:.5},'DECODER_DISAGREEMENT','다른'],
 [{width:1200,height:1000,staffSpacing:10,notEnough:true},'NOTES_UNCERTAIN','음표'],
 [{width:1200,height:1000,staffSpacing:10,lowConfidence:true},'LOW_CONFIDENCE','신뢰'],
 [{width:1200,height:1000,staffSpacing:10,rawExactRatio:.93,correctionAvg:.04},'NOTATION_UNCERTAIN','원본']
];
for(const [data,code,hint] of cases){
 const p=d(data);
 assert.equal(p.code,code,'Unexpected issue diagnosis '+JSON.stringify(data));
 assert.ok(p.title.length>=8&&p.reason.length>=10&&p.action.length>=15);
 assert.ok(p.reason.includes(hint)||p.action.includes(hint)||p.title.includes(hint),'No useful action: '+JSON.stringify(p));
 assert.ok(!p.reason.includes('100%'),'Must not claim certainty');
 console.log(JSON.stringify({code,title:p.title,action:p.action}));
}
// A modest 1.3° camera rotation alone is not enough to blame tilt.
assert.notEqual(d({width:1760,height:1480,staffSpacing:12,skewDegrees:1.28,skewConfidence:3.32}).code,'IMAGE_TILTED');
// No fabricated certainty that the original camera quality or pitch is known.
assert.equal(d({staffSpacing:6.25}).code,'SMALL_STAFF_SYMBOLS');
console.log('PASS: 14 diagnostic cases, priority ordering, camera-tilt uncertainty');

import assert from 'node:assert/strict';
import {planBarRows} from '../omr-bar-consensus-v1.mjs';

const mk=(x,side)=>({x,side});
const rows=[
  {x0:71,x1:1426,strong:[mk(495,0),mk(782.5,0),mk(1217.5,.0149)],moderate:[mk(495,0),mk(782.5,0),mk(1175,.1101),mk(1217.5,.0149)],extended:[]},
  {x0:71,x1:1426,strong:[mk(465.5,.0089),mk(759,.0071),mk(1204,.0116)],moderate:[mk(465.5,.0089),mk(498,.1179),mk(575,.0830),mk(650,.1196),mk(759,.0071),mk(1099,.1170),mk(1158.5,.1107),mk(1204,.0116)],extended:[]},
  {x0:71,x1:1426,strong:[mk(520.5,.0043),mk(755.5,.0053),mk(1189.5,.0085)],moderate:[mk(322,.0983),mk(520.5,.0043),mk(755.5,.0053),mk(971.5,.1154),mk(1189.5,.0085)],extended:[]},
  {x0:71,x1:1427,strong:[mk(561,.0149),mk(851,.0129),mk(1126,.0337)],moderate:[mk(337,.1171),mk(561,.0149),mk(851,.0129),mk(948.5,.1181),mk(1126,.0337),mk(1287,.0853)],extended:[]},
  {x0:71,x1:1427,strong:[mk(437,.0089),mk(1000,.0069)],moderate:[mk(437,.0089),mk(744,.1091),mk(810.5,.1181),mk(1000,.0069)],extended:[mk(437,.0089),mk(744,.1091),mk(810.5,.1181),mk(1000,.0069),mk(674,.1498)]},
];
for(const r of rows) if(!r.extended.length) r.extended=[...r.moderate];
const result=planBarRows(rows);
assert.deepEqual(result.perLine,[4,4,4,4,3]);
assert.equal(result.measures,19);
assert.equal(result.modalInternalBars,3);
assert.ok(result.support>=3);
console.log(JSON.stringify({ok:true,perLine:result.perLine,measures:result.measures,modalInternalBars:result.modalInternalBars,support:result.support}));

const faintCoordinates=[
  [497,899,1071,1136,1302],
  [280,497,899,927,1266,1302],
  [412,497,899,1136,1302],
  [303,497,899,1020,1302],
  [631,929,1168]
];
const fadedRows=faintCoordinates.map(xs=>({x0:155,x1:1704,sp:10,
   strong:[],moderate:xs.map(x=>({x,side:.09})),extended:xs.map(x=>({x,side:.09}))}));
const faded=planBarRows(fadedRows);
assert.deepEqual(faded.perLine,[4,4,4,4,3],'Repeated faint barlines, not isolated stem-like distractors, must define measures');
assert.deepEqual(faded.plans[4].chosen.map(q=>q.x),[631,1168],'Last staff must prefer well-supported spacing without inventing an extra bar');
console.log(JSON.stringify({ok:true,fadedPerLine:faded.perLine,fadedBars:faded.plans.map(p=>p.chosen.map(q=>q.x)),support:faded.support}));

/* A low-resolution JPEG fixture produced three true printed bars per complete
   system but added equally-dark false vertical strokes inside the notes.
   The final system has two true bars and one stem-like false candidate. */
const scanRows=[
  {moderate:[[228,.03],[317,0],[335,.03],[460,.05],[574,0],[642,.07],[767,.05],[831,0]]},
  {moderate:[[117,0],[290,.05],[317,0],[394,0],[574,0],[831,0]]},
  {moderate:[[317,0],[574,0],[684,.05],[831,0]]},
  {moderate:[[317,0],[574,0],[651,.07],[831,0]]},
  {moderate:[[403,0],[550,.025],[745,0]]}
].map((r,i)=>({
  x0:61,x1:1089,sp:6,
  moderate:r.moderate.map(([x,side])=>mk(x,side)),
  strong:r.moderate.filter(([x,side])=>side<=.04).map(([x,side])=>mk(x,side)),
  extended:r.moderate.map(([x,side])=>mk(x,side))
}));
const scan=planBarRows(scanRows);
assert.deepEqual(scan.perLine,[4,4,4,4,3],'JPEG stem-like vertical strokes must not cause 20 measures');
assert.deepEqual(scan.plans[1].chosen.map(p=>p.x),[317,574,831],'Do not prefer equally-dark note stems at x117 and x394');
assert.deepEqual(scan.plans[4].chosen.map(p=>p.x),[403,745],'Do not promote x550 false stem into a fifth-row measure');
console.log(JSON.stringify({ok:true,fixture:'lowres JPEG vertical-stem distractors',bars:scan.plans.map(p=>p.chosen.map(x=>x.x)),perLine:scan.perLine}));

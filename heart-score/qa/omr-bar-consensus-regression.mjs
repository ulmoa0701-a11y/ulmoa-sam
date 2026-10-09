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

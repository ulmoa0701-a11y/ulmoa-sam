const assert=require('node:assert/strict');
const {buildSeries,valid,LEVELS,message,errorFeatures}=require('./rescue-core.js');
const seen=new Map();
for(const level of LEVELS){
 const variants=new Set();
 for(let run=0;run<64;run++){
  const stages=buildSeries(level,run);
  assert.equal(stages.length,5);
  for(const [i,m] of stages.entries()){
   assert.ok(message(m).includes('찾아'),'Child prompt must be actionable');
   assert.equal(m.choices.length,new Set(m.choices.map(c=>[c.species,c.color,c.size].join('|'))).size);
   assert.equal(m.choices.filter(it=>valid(m,it)).length,m.need);
   assert.ok(m.choices.every(c=>valid(m,c)===c.good));
   if(m.focus==='size'){
    for(const sp of m.species)assert.deepEqual(m.choices.filter(c=>c.species===sp).map(c=>c.size).sort(),['작은','큰']);
    assert.equal(new Set(m.choices.map(c=>c.color)).size,1,'Size pair uses one color only');
   }
   if(m.focus==='species')assert.equal(new Set(m.choices.map(c=>c.color)).size,1,'Species alone is relevant');
   if(m.focus==='color')assert.equal(new Set(m.choices.map(c=>c.species)).size,1,'Color alone is relevant');
   if(m.focus==='combined'){
    for(const omitted of ['species','color','size']){
      const wrong=m.choices.filter(c=>!valid(m,c)).filter(c=>['species','color','size'].every(k=>
       k===omitted|| (k==='species'?m.species.includes(c.species):m[k]===c[k])));
      assert.ok(wrong.length>0,'Combined stage should require '+omitted+' even when other features match');
    }
    assert.ok(m.choices.some(c=>!c.good&&errorFeatures(m,c).length===1),'Need isolated wrong-feature candidates');
   }
   assert.ok(m.need<=4);
  }
  variants.add(stages.map(m=>m.species.join('+')+'@'+m.color+m.size).join('|'));
 }
 assert.ok(variants.size>=16,'Repeat practice should offer at least sixteen distinct problem sets');
 seen.set(level,variants.size);
}
assert.equal(buildSeries('basic',0)[4].need,2,'Default final stage should check all three features');
assert.equal(buildSeries('challenge',0)[4].need,3);
console.log('COGNITIVE MISSION QA PASS',Object.fromEntries(seen),'64 variants x 3 modes x 5 stages');

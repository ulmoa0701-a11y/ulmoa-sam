/* 2022 elementary maths curriculum content checks (not learning-effect validation). */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=n=>fs.readFileSync('math-garden/grade-play/'+n,'utf8');
const sandbox={window:{},console};vm.createContext(sandbox);
for(const n of ['app.js','curriculum.js','unit-engine.js','hands-on-core.js'])vm.runInContext(read(n),sandbox,{filename:n});
const C=sandbox.window.MoaMathCurriculum,E=sandbox.window.MoaUnitEngine,H=sandbox.window.MoaHandsOnCore;
assert.deepEqual([C.counts.terms,C.counts.units,C.counts.topics],[12,71,213]);
let visited=0;const modes=new Set();
for(let grade=1;grade<=6;grade++)for(let term=1;term<=2;term++){
 const units=C.get(grade,term);assert(units.length>=5,grade+'-'+term+' missing large units');
 for(const unit of units){assert(unit.subtopics.length===3,unit.id);
  const p=C.prerequisiteFor(unit.id);
  if(p){const previous=C.get(p.g,p.t)[p.u]?.subtopics[p.s];
   assert(previous,'broken prerequisite '+unit.id);
   assert(p.g<grade||(p.g===grade&&p.t<=term),'future prerequisite '+unit.id);
  }
  for(const topic of unit.subtopics){visited++;modes.add(topic.mode);
   for(let j=0;j<8;j++){const q=E.problem(topic.mode);
    assert(q.question&&q.answer!==undefined&&q.art,topic.id+' has incomplete exercise');
    const activity=H.buildMode(H.family(topic.mode,q.answer),topic.mode,q);
    assert(activity.question&&activity.answer!==undefined,topic.id+' has incomplete interaction');
   }
  }
 }
}
assert.equal(visited,213);
const names=(g,t,u)=>C.get(g,t)[u].subtopics.map(x=>x.title);
assert(names(2,1,5).join(' ').includes('같은 수'),'grade2 multiplication meaning missing');
assert(names(2,2,1).join(' ').includes('곱셈'),'grade2 multiplication tables missing');
assert(names(3,1,3).join(' ').includes('두 자리 수 × 한 자리 수'),'grade3 semester1 multiplication base missing');
assert(!names(3,1,3).join(' ').includes('세 자리 수 × 한 자리 수'),'grade3 semester1 includes next semester scope');
assert(names(3,2,0).join(' ').includes('세 자리 수 × 한 자리 수'),'grade3 semester2 needs 3-digit multiply');
assert(names(3,2,0).join(' ').includes('두 자리 수 × 두 자리 수'),'grade3 semester2 needs 2-digit multiply');
assert(names(4,1,2).join(' ').includes('세 자리 수 × 두 자리 수'),'grade4 multiplication scope needs explicit model');
assert(names(5,1,4).join(' ').includes('분모 다른 분수'),'grade5 unlike denominator absent');
assert(names(6,1,3).join(' ').includes('비율'),'grade6 ratio missing');
assert(names(6,2,1).join(' ').includes('앞·위·옆'),'grade6 spatial views missing');
for(const mode of ['multTens','multTriple','times2','wordMultiply2','multTriple2']){
 for(let i=0;i<50;i++){const p=E.problem(mode);assert(p.options.includes(p.answer)&&p.options.length===4,mode+' broken generator');}
}
for(const mode of ['fracUnlike','fracUnlikeSub']){
 for(let i=0;i<150;i++){
  const p=E.problem(mode),s=H.buildMode(H.family(mode,p.answer),mode,p);
  const [n1,d1]=s.firstText.split('/').map(Number),[n2,d2]=s.otherText.split('/').map(Number);
  assert.notEqual(d1,d2,mode+' must not disguise equal denominators as unlike');
  const expected=(n1/d1+(mode==='fracUnlike'?1:-1)*n2/d2)*s.den;
  assert(Math.abs(expected-s.numer)<1e-8,mode+' incorrect equivalent parts');
  assert(Number.isInteger(s.numer)&&s.numer>0&&s.numer<=s.den,mode+' invalid visual');
 }
}
console.log('PASS 2022 curriculum boundary QA: 1–6 grades, 12 terms, 71 units, 213 subunits, '+modes.size+' exercise modes, cross-grade prerequisites, fraction equivalence');
console.log('NOTE: conceptual validity, textbook sequencing and real-child transfer still require manual educational review.');

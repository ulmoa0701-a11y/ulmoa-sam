// Independent assertions: no output is repaired or forced to match the fixture.
export function compareNotation(analysis, state, truth) {
  const errors=[];
  const check=(ok,message)=>{if(!ok)errors.push(message);};
  check(analysis?.accepted===true,'Recognition rejected or no analysis result');
  check(analysis?.staves===truth.staves,'Wrong body staff count');
  check(JSON.stringify(analysis?.barGeometry?.perLine)===JSON.stringify(truth.perLine),'Wrong per-line bar structure');
  check(state?.timeN===truth.timeN&&state?.timeD===truth.timeD,'Wrong meter');
  const measures=state?.measures||[],events=measures.flat();
  check(measures.length===truth.measures.length,`Measure count ${measures.length}`);
  check(events.filter(e=>e.note!=='쉼').length===truth.noteCount,'Wrong note count');
  check(events.filter(e=>e.note==='쉼').length===truth.restCount,'Wrong rest count');
  for(let m=0;m<truth.measures.length;m++){
    const actual=measures[m]||[],expected=truth.measures[m];
    check(actual.length===expected.length,`Bar ${m+1}: event count ${actual.length}, expected ${expected.length}`);
    for(let e=0;e<expected.length;e++){
      check(actual[e]?.note===expected[e].note,`Bar ${m+1}, event ${e+1}: pitch ${actual[e]?.note}, expected ${expected[e].note}`);
      check(Math.abs((actual[e]?.dur??NaN)-expected[e].dur)<1e-8,`Bar ${m+1}, event ${e+1}: duration ${actual[e]?.dur}, expected ${expected[e].dur}`);
    }
    check(Math.abs(actual.reduce((n,e)=>n+e.dur,0)-4)<1e-8,`Bar ${m+1}: not 4 beats`);
  }
  return {ok:errors.length===0,errors,measures:measures.length,notes:events.filter(e=>e.note!=='쉼').length,rests:events.filter(e=>e.note==='쉼').length,eventsCompared:truth.measures.flat().length};
}

// Independent assertions: no output is repaired or forced to match the fixture.
export function compareNotation(analysis, state, truth) {
  const errors=[];
  const check=(ok,message)=>{if(!ok)errors.push(message);};
  check(analysis?.accepted===true,'Recognition rejected or no analysis result');
  check(analysis?.staves===truth.staves,'Wrong body staff count');
  check(JSON.stringify(analysis?.barGeometry?.perLine)===JSON.stringify(truth.perLine),'Wrong per-line bar structure');
  check(state?.timeN===truth.timeN&&state?.timeD===truth.timeD,'Wrong meter');
  const measures=Array.isArray(state?.measures)?state.measures:[],events=measures.flat();
  const beatsPerBar=truth.timeN*4/truth.timeD;
  check(Number.isFinite(beatsPerBar)&&beatsPerBar>0,'Invalid reference meter');
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
    const durationsValid=actual.every(e=>Number.isFinite(e?.dur)&&e.dur>0);
    check(durationsValid,`Bar ${m+1}: invalid or non-positive duration`);
    const total=actual.reduce((n,e)=>n+(Number.isFinite(e?.dur)?e.dur:0),0);
    check(durationsValid&&Math.abs(total-beatsPerBar)<1e-8,`Bar ${m+1}: ${total} quarter-note beats, expected ${beatsPerBar}`);
  }
  return {ok:errors.length===0,errors,measures:measures.length,notes:events.filter(e=>e.note!=='쉼').length,rests:events.filter(e=>e.note==='쉼').length,eventsCompared:truth.measures.flat().length};
}

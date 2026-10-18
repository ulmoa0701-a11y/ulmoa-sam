"use strict";
/* Source: the existing boomwhacker/index.html original studio scores. The melodies,
   rhythmic values, measure order, lyrics and time signatures below are intentionally
   copied without reinterpretation. The audio will always play the full arrangement. */
(function(){

const E=(note,dur,lyric='')=>({note,dur,lyric});
const song=(key,title,bpm,timeN,timeD,measures,category='동요')=>({key,title,bpm,timeN,timeD,measures,category});
// like music. Timing remains the SINGLE target; a simple 3-note melody is
// used first and 3/5/custom pitch filtering still changes falling balls ONLY.
const RHYTHM_TUNES_EASY=[
 ['도','미','솔','미'],['도','미','솔','솔'],
 ['미','솔','미','도'],['솔','미','도','도'],
 ['도','미','솔','미'],['솔','솔','미','도'],
 ['미','미','솔','미'],['솔','미','도','도']
];
const RHYTHM_TUNES_FIVE=[
 ['도','미','솔','미'],['레','미','솔','미'],
 ['도','미','솔','라'],['솔','미','레','도'],
 ['도','레','미','솔'],['라','솔','미','레'],
 ['미','솔','미','레'],['솔','미','레','도']
];
// Map each strike to a note in a four-beat tune without changing its
// authored duration. Sixteenth pairs alternate neighbouring pitches, and
// the final sixteenth of a dotted beat anticipates the next melody note.
function rhythmBar(lengths,contour){
 let beat=0;
 return lengths.map(d=>{
  const index=Math.min(3,Math.floor(beat+1e-7));
  const secondHalf=d<=.25&&(beat-Math.floor(beat))>=.5-1e-7;
  const note=contour[Math.min(3,index+(secondHalf?1:0))];
  beat+=d;
  return E(note,d);
 });
}
const basicBeat=song('beat-basic','① 한 박씩 · 일정하게',76,4,4,
 RHYTHM_TUNES_EASY.map(tune=>rhythmBar([1,1,1,1],tune)),'박자 연습');
const halfBeat=song('beat-half','② 반 박씩 · 두 번',72,4,4,
 RHYTHM_TUNES_FIVE.map(tune=>rhythmBar(Array(8).fill(.5),tune)),'박자 연습');
const sixteenth=song('sixteenth','③ 빠른 박 · 네 번',68,4,4,[
 rhythmBar([1,1,1,1],RHYTHM_TUNES_EASY[0]),
 rhythmBar([1,1,1,1],RHYTHM_TUNES_EASY[1]),
 rhythmBar(Array(8).fill(.5),RHYTHM_TUNES_EASY[2]),
 rhythmBar(Array(8).fill(.5),RHYTHM_TUNES_EASY[3]),
 rhythmBar(Array(16).fill(.25),RHYTHM_TUNES_EASY[4]),
 rhythmBar(Array(16).fill(.25),RHYTHM_TUNES_EASY[5]),
 rhythmBar([1,.25,.25,.25,.25,1,1],RHYTHM_TUNES_EASY[6]),
 rhythmBar([.25,.25,.25,.25,.25,.25,.25,.25,.5,.5,.5,.5],RHYTHM_TUNES_EASY[7])
],'박자 연습');
const dotted=song('dotted','④ 길게·짧게 · 점리듬',72,4,4,[
 rhythmBar([.75,.25,.75,.25,.75,.25,.75,.25],RHYTHM_TUNES_FIVE[0]),
 rhythmBar([.75,.25,.75,.25,.75,.25,.75,.25],RHYTHM_TUNES_FIVE[1]),
 rhythmBar([.75,.25,1,.75,.25,1],RHYTHM_TUNES_FIVE[2]),
 rhythmBar([.75,.25,1,.75,.25,1],RHYTHM_TUNES_FIVE[3]),
 rhythmBar([1,.75,.25,.75,.25,1],RHYTHM_TUNES_FIVE[4]),
 rhythmBar([1,.75,.25,.75,.25,1],RHYTHM_TUNES_FIVE[5]),
 rhythmBar([.75,.25,.5,.5,.75,.25,1],RHYTHM_TUNES_FIVE[6]),
 rhythmBar([.75,.25,.5,.5,.75,.25,1],RHYTHM_TUNES_FIVE[7])
],'박자 연습');
// Short, newly composed C-major classroom motifs (melodies, rhythms and lyrics),
// not copies of commercial songs. 3/5 notes can be played in their entirety.
const moaSignal=song('moa-signal','모아의 출발 신호',108,2,4,[
 [E('도',.5,'준'),E('미',.5,'비'),E('솔',1,'해')],[E('솔',.5,'출'),E('미',.5,'발'),E('도',1,'!')],
 [E('도',.5,'톡'),E('도',.5,'톡'),E('미',.5,'짝'),E('솔',.5,'짝')],[E('미',1,'시'),E('도',1,'작')],
 [E('도',.5,'함'),E('미',.5,'께'),E('솔',1,'가')],[E('솔',.5,'하'),E('미',.5,'나'),E('도',1,'둘')],
 [E('솔',.5,'쨘'),E('미',.5,'쨘'),E('도',.5,'다'),E('미',.5,'시')],[E('도',2,'작')]
],'붐웨커 연습곡');
const moaSpace=song('moa-space','우주 톡톡',116,4,4,[
 [E('도',1,'반'),E('미',.5,'짝'),E('솔',.5,''),E('라',1,'별'),E('솔',1,'')],
 [E('미',.5,'하'),E('솔',.5,'늘'),E('라',1,'로'),E('솔',1,''),E('미',1,'')],
 [E('도',.5,'톡'),E('도',.5,'톡'),E('미',1,''),E('솔',1,'출'),E('라',1,'발')],
 [E('솔',2,'슈'),E('미',1,'웅'),E('도',1,'')],
 [E('미',.5,'빛'),E('솔',.5,'나'),E('라',1,'는'),E('솔',1,''),E('미',1,'')],
 [E('도',1,'발'),E('미',1,'견'),E('솔',.5,'했'),E('라',.5,'다'),E('솔',1,'')],
 [E('라',1,'저'),E('솔',.5,'멀'),E('미',.5,'리'),E('도',1,''),E('미',1,'')],
 [E('솔',1,'돌'),E('미',1,'아'),E('도',2,'와')]
],'붐웨커 연습곡');
const moaParty=song('moa-party','오늘은 리듬파티',120,4,4,[
 [E('도',.5,'쿵'),E('미',.5,'짝'),E('솔',1,''),E('라',.5,'쿵'),E('솔',.5,'짝'),E('미',1,'')],
 [E('도',1,'하'),E('레',1,'나'),E('미',1,'둘'),E('솔',1,'셋')],
 [E('라',.5,'다'),E('솔',.5,'같'),E('미',.5,'이'),E('레',.5,''),E('도',2,'춤')],
 [E('미',1,'다'),E('솔',1,'시'),E('라',1,''),E('솔',1,'')],
 [E('도',.5,'쿵'),E('미',.5,'짝'),E('솔',1,''),E('라',.5,'쿵'),E('솔',.5,'짝'),E('미',1,'')],
 [E('레',1,'눈'),E('미',1,'빛'),E('솔',1,''),E('라',1,'')],
 [E('솔',1,'같'),E('미',1,'이'),E('레',1,'웃'),E('도',1,'어')],
 [E('미',1,'오'),E('레',1,'늘'),E('도',2,'끝')]
],'붐웨커 연습곡');
const moaBreeze=song('moa-breeze','바람이 살랑',84,3,4,[
 [E('도',1,'바'),E('미',1,'람'),E('솔',1,'이')],
 [E('솔',2,'살'),E('미',1,'랑')],
 [E('도',1,'천'),E('미',1,'천'),E('솔',1,'히')],
 [E('미',2,'쉬'),E('도',1,'고')],
 [E('솔',1,'숨'),E('미',1,'한'),E('도',1,'번')],
 [E('도',3,'후')]
],'붐웨커 연습곡');
const SCORES=[moaSignal,moaSpace,moaParty,moaBreeze,basicBeat,halfBeat,sixteenth,dotted].map(src=>{
 let beats=0,events=[],bars=[];const meter=src.timeN*(4/src.timeD);
 src.measures.forEach((measure,i)=>{const start=beats;let sum=0;
 measure.forEach((e,j)=>{const evt={id:events.length,bar:i,note:e.note,dur:e.dur,lyric:e.lyric||"",start:beats};events.push(evt);beats+=e.dur;sum+=e.dur});
 if(Math.abs(sum-meter)>.0000001)throw Error(src.title+": bar "+i+" has "+sum+" beats but expects "+meter);
 bars.push({index:i,start,end:beats,events:events.filter(e=>e.bar===i)})
 });
 return {key:src.key,title:src.title,bpm:src.bpm,timeN:src.timeN,timeD:src.timeD,meter,beats,events,bars,category:src.category};
});
window.__PERFORMANCE_SCORES__=Object.freeze(SCORES);
})();
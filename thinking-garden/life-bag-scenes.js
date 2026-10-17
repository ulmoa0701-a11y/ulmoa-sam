/* Moa's everyday packing quests: concrete, pictured situations, not diagnosis.
   Every task states a fictional mission; "correct" is a game-specific set, NOT
   a universal judgment about which belongings are necessary in real life. */
(()=>{
'use strict';
const ITEMS={
 umbrella:['우산','☂️'],coat:['겉옷','🧥'],boots:['장화','👢'],
 brush:['칫솔','🪥'],paste:['치약','🧴'],cup:['컵','🥛'],
 crayon:['색연필','🖍️'],paper:['종이','📄'],paint:['붓','🖌️'],
 shoes:['운동화','👟'],water:['물','🥤'],hat:['모자','🧢'],
 book:['책','📖'],card:['카드','💳'],bag:['가방','🎒'],
 lunch:['도시락','🍱'],spoon:['숟가락','🥄'],tissue:['휴지','🧻'],
 seed:['씨앗','🌱'],watering:['물뿌리개','🚿'],pot:['화분','🪴'],
 mat:['돗자리','🧺'],fruit:['사과','🍎'],ticket:['표','🎟️'],
 map:['지도','🗺️'],camera:['카메라','📷'],soap:['비누','🧼'],
 pajamas:['잠옷','👕'],pillow:['베개','🛏️'],blanket:['이불','🛌'],
 music:['악보','🎼'],drum:['북','🥁'],flute:['리코더','🪈'],
 ball:['공','⚽'],rope:['줄','🪢'],flag:['깃발','🚩'],
 block:['블록','🧱'],scissors:['가위','✂️'],ruler:['자','📏'],
 pencil:['연필','✏️'],gloves:['장갑','🧤'],socks:['양말','🧦'],
 broom:['빗자루','🧹'],bin:['휴지통','🗑️'],bucket:['양동이','🪣'],
 shovel:['삽','🛠️'],comb:['빗','🪮'],mirror:['거울','🪞'],keys:['열쇠','🔑'],
 bicycle:['자전거','🚲'],leash:['목줄','🦮'],dog:['강아지','🐶'],
 glue:['풀','🧴'],shell:['조개','🐚'],flower:['꽃','🌼']
};
// 20 distinct situations. Distractors are deliberately unrelated to the shown task.
// Target icons alone never appear as selectable alternatives or "hints".
const STORIES=[
 ['비 오는 날 산책','🌧️🚶',['umbrella','coat','boots'],['drum','block','brush','flag','spoon']],
 ['그림 그리는 시간','🎨🖼️',['paper','crayon','paint'],['boots','ticket','pillow','ball','keys']],
 ['운동장 달리기','🏃🏟️',['shoes','water','hat'],['pot','flute','comb','bin','spoon']],
 ['도서관 책 읽기','📚🤫',['book','card','bag'],['shovel','drum','boots','broom','ball']],
 ['점심 도시락 시간','🍱😋',['lunch','spoon','tissue'],['flag','block','flute','gloves','scissors']],
 ['화분에 씨앗 심기','🌱🪴',['pot','seed','watering'],['pillow','ticket','comb','flute','book']],
 ['공원에서 돗자리 피기','🏞️🧺',['mat','fruit','water'],['mirror','drum','scissors','boots','paste']],
 ['공연장에 가는 날','🎭🎟️',['ticket','card','bag'],['watering','bucket','broom','seed','pillow']],
 ['놀이터에서 공놀이','🛝⚽',['ball','shoes','water'],['brush','flute','paint','bin','pillow']],
 ['연주회 준비','🎵🎼',['music','flute','drum'],['shovel','umbrella','toothbrush','bucket','mat']],
 ['블록 놀이터 만들기','🏠🧱',['block','flag','rope'],['paste','ticket','boots','brush','pillow']],
 ['색종이 오려 붙이기','✂️🌈',['paper','scissors','glue'],['ball','ticket','boots','watering','pillow']],
 ['교실에서 길이 재기','📏✏️',['ruler','pencil','paper'],['umbrella','drum','shovel','blanket','hat']],
 ['세면대에서 손 씻기','🚰🤲',['soap','water','tissue'],['ticket','block','flute','boots','broom']],
 ['잠자러 가는 시간','🌙😴',['pajamas','pillow','blanket'],['shovel','drum','ball','ticket','broom']],
 ['이를 깨끗이 닦아요','🪥😁',['brush','paste','cup'],['map','pot','flag','drum','block']],
 ['추운 날 밖에 나가기','❄️🧣',['coat','gloves','socks'],['paint','watering','spoon','pillow','paper']],
 ['바닷가 모래놀이','🏖️🪣',['bucket','shovel','hat'],['drum','pillow','brush','music','bin']],
 ['정원의 낙엽 정리','🍂🧹',['broom','gloves','bin'],['flute','pillow','ticket','cup','block']],
 ['버스를 타고 나들이','🚌🚏',['card','map','bag'],['watering','brush','drum','shovel','pot']]
];
function makePlan(round,level){
 const l=Math.max(1,Math.min(3,Number(level)||1)),scene=STORIES[((round%STORIES.length)+STORIES.length)%STORIES.length];
 const targets=scene[2].slice(0,l),distractors=scene[3];
 const choices=[...targets,...distractors].map((id,i)=>({id,label:ITEMS[id][0],icon:ITEMS[id][1],correct:targets.includes(id),sort:(i*7+round*3)%11}));
 choices.sort((a,b)=>a.sort-b.sort);
 return {round,level:l,title:scene[0],scene:scene[1],targets,choices};
}
function validate(){
 if(STORIES.length<20)throw Error('Not enough real-life scenarios');
 STORIES.forEach((scene,i)=>{
  if(scene[2].length!==3||scene[3].length!==5)throw Error('Invalid situation '+i);
  const ids=[...scene[2],...scene[3]];
  if(new Set(ids).size!==ids.length)throw Error('Ambiguous/duplicate choice '+i);
  if(ids.some(id=>!ITEMS[id]))throw Error('Unknown object in '+i);
  for(const l of [1,2,3]){
   const p=makePlan(i,l);
   if(p.choices.filter(x=>x.correct).length!==l||p.choices.length!==l+5)throw Error('Invalid answer set '+i+'/'+l);
  }
 });
 return true;
}
validate();
window.MoaBagScenes={makePlan,validate,storyCount:STORIES.length};
})();
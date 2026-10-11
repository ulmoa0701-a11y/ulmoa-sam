/* Shared, testable cognitive mission designer. No child-identifying data. */
(function(root){
'use strict';
const ANIMALS=['토끼','돼지','소','오리'],HUES=['노란','파란','초록','빨간'];
const LEVELS=['starter','basic','challenge'];
function rotate(list,start){return list.map((_,i)=>list[(i+start)%list.length]);}
function alternate(value,list){return list.find(v=>v!==value);}
function item(species,color,size,good){return{species,color,size,good:!!good};}
function valid(m,it){return m.species.includes(it.species)&&m.color===it.color&&m.size===it.size;}
function validate(m){
 const ids=m.choices.map(a=>[a.species,a.color,a.size].join('|'));
 if(ids.length!==new Set(ids).size)throw Error('Duplicated animal silhouette in '+m.place);
 if(m.choices.filter(it=>valid(m,it)).length!==m.need)throw Error('Ambiguous target count at '+m.place);
 if(!m.choices.every(it=>valid(m,it)===it.good))throw Error('Contradictory target metadata at '+m.place);
 if(m.focus==='combined'){
  for(const feature of ['species','color','size']){
   const confusable=m.choices.filter(it=>!it.good&&['species','color','size'].every(k=>k===feature?true:k==='species'?m.species.includes(it.species):m[k]===it[k]));
   if(!confusable.length)throw Error('Combined mission does not require '+feature);
  }
 }
 return m;
}
function buildSeries(mode='basic',run=0){
 if(!LEVELS.includes(mode))mode='basic';
 const colors=rotate(HUES,run%4),species=rotate(ANIMALS,run%4);
 const [c0,c1,c2,c3]=colors,[s0,s1,s2,s3]=species;
 const size=run%2?'작은':'큰',otherSize=size==='큰'?'작은':'큰';
 const stages=[];
 function add(place,focus,color,sz,targets,choices){
  const m={place,focus,color,size:sz,species:targets,need:targets.length,choices};
  stages.push(validate(m));
 }
 const three=mode==='starter';
 add('연못','species',c0,'큰',[s0],[item(s0,c0,'큰',true),...species.slice(1,three?3:4).map(sp=>item(sp,c0,'큰',false))]);
 add('초원','color',c1,'큰',[s1],[item(s1,c1,'큰',true),...colors.filter(c=>c!==c1).slice(0,three?2:3).map(c=>item(s1,c,'큰',false))]);
 if(three){
  add('개울','size',c2,size,[s2],[item(s2,c2,size,true),item(s2,c2,otherSize,false)]);
  add('숲길','species',c3,'큰',[s3],[item(s3,c3,'큰',true),item(s0,c3,'큰',false),item(s1,c3,'큰',false)]);
  add('노을숲','color',c0,'큰',[s2],[item(s2,c0,'큰',true),item(s2,c1,'큰',false),item(s2,c2,'큰',false)]);
 }else{
  add('개울','size',c2,size,[s2,s3],[item(s2,c2,size,true),item(s2,c2,otherSize,false),item(s3,c2,size,true),item(s3,c2,otherSize,false)]);
  const target3=[s0,s1,s2];
  add('숲길','color-species',c3,'큰',target3,[
   ...target3.map(sp=>item(sp,c3,'큰',true)),
   item(s3,c3,'큰',false),
   item(s0,c0,'큰',false),item(s1,c1,'큰',false),item(s2,c2,'큰',false),
   ...(mode==='challenge'?[item(s3,c2,'큰',false)]:[])
  ]);
  const targetEnd=mode==='challenge'?[s1,s2,s3]:[s1,s2];
  const rest=species.filter(sp=>!targetEnd.includes(sp));
  const alt=alternate(c0,HUES);
  const choices=[
   ...targetEnd.map(sp=>item(sp,c0,otherSize,true)),
   item(rest[0],c0,otherSize,false),
   item(targetEnd[0],alt,otherSize,false),
   item(targetEnd[1],c0,size,false),
   item(rest[0],alt,size,false),
   item(targetEnd[0],alt,size,false),
   ...(mode==='basic'?[item(rest[1],alt,otherSize,false)]:[])
  ];
  add('노을숲','combined',c0,otherSize,targetEnd,choices);
 }
 return stages;
}
function message(m){
 const names=m.species.join('·');
 if(m.focus==='species')return `${names}를 찾아 구조해요`;
 if(m.focus==='color')return `${m.color}색 ${names}를 찾아요`;
 if(m.focus==='size')return m.need===1?`${m.size} ${names}를 찾아요`:`${m.size} ${m.species[0]}와 ${m.size} ${m.species[1]}를 찾아요`;
 return `${m.color}색 ${m.focus==='combined'?m.size+' ':''}${names}를 찾아요`;
}
function headline(m){
 if(m.focus==='species')return m.species[0]+' 찾기';
 if(m.focus==='color')return m.color+'색 '+m.species[0];
 if(m.focus==='size')return m.size+' '+m.species.join('·');
 return m.color+'색 '+(m.focus==='combined'?m.size+' ':'')+m.species.join('·');
}
function description(m){
 const map={species:'동물 종류를 살펴요',color:'색깔을 살펴요',size:'같은 종류끼리 크기를 비교해요','color-species':'색깔과 동물 종류를 살펴요',combined:'동물 종류 · 색깔 · 크기를 모두 살펴요'};
 return map[m.focus];
}
function errorFeatures(m,it){
 const errors=[];
 if(!m.species.includes(it.species))errors.push('species');
 if(m.color!==it.color)errors.push('color');
 if(m.size!==it.size)errors.push('size');
 return errors;
}
function reason(m,it){
 const errors=errorFeatures(m,it);
 if(errors.includes('species'))return '동물 종류를 다시 볼까?';
 if(errors.includes('color'))return '색깔을 다시 볼까?';
 if(errors.includes('size'))return '큰지 작은지 비교해 볼까?';
 return '찾을 동물을 다시 살펴봐요';
}
const api={buildSeries,valid,message,headline,description,errorFeatures,reason,LEVELS};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.MoaRescueCore=api;
})(typeof window!=='undefined'?window:globalThis);

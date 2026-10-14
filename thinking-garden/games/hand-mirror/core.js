/* Pose matching is about visible finger extension, not grip force or object manipulation. */
(function(root){
'use strict';
const FINGER_JOINTS=[[5,6,8],[9,10,12],[13,14,16],[17,18,20]];
const PATTERNS={palm:[1,1,1,1],fist:[0,0,0,0],one:[1,0,0,0],two:[1,1,0,0],three:[1,1,1,0]};
const TITLES={palm:'손바닥 활짝',fist:'주먹 꼭',one:'검지 하나',two:'검지와 중지',three:'세 손가락'};
const EMOJI={palm:'✋',fist:'✊',one:'☝️',two:'✌️',three:'🤟'};
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function pose(landmarks){
 if(!Array.isArray(landmarks)||landmarks.length<21)return null;
 const state=FINGER_JOINTS.map(([m,p,t])=>{
  const d=distance(landmarks[p],landmarks[m]);
  if(d<.008)return null;
  const ratio=distance(landmarks[t],landmarks[m])/d;
  if(ratio>1.65)return 1;
  if(ratio<1.38)return 0;
  return null;
 });
 if(state.includes(null))return null;
 const found=Object.entries(PATTERNS).find(([,pattern])=>pattern.every((v,i)=>v===state[i]));
 return found?.[0]||null;
}
function match(hands, expected){
 if(!Array.isArray(hands)||!Array.isArray(expected)||hands.length<expected.length)return false;
 const labels=hands.map(pose).filter(Boolean);
 if(labels.length<expected.length)return false;
 const target=[...expected];
 for(const label of labels){const i=target.indexOf(label);if(i>=0)target.splice(i,1);}
 return target.length===0;
}
const api={FINGER_JOINTS,PATTERNS,TITLES,EMOJI,pose,match};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.HandMirrorCore=api;
})(typeof window!=='undefined'?window:globalThis);

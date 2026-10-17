/* Pose matching is about visible finger extension, not grip force or object manipulation. */
(function(root){
'use strict';
const FINGER_JOINTS=[[5,6,8],[9,10,12],[13,14,16],[17,18,20]];
const PATTERNS={palm:[1,1,1,1],fist:[0,0,0,0],one:[1,0,0,0],two:[1,1,0,0],three:[1,1,1,0]};
const TITLES={palm:'손가락 모두 펴기',fist:'손가락 모두 접기',one:'한 개만 쭉 펴기',two:'두 개만 쭉 펴기',three:'세 개만 쭉 펴기'};
const EMOJI={palm:'✋',fist:'✊',one:'☝️',two:'✌️',three:'3️⃣'};
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function fingerStates(landmarks){
 if(!Array.isArray(landmarks)||landmarks.length<21)return null;
 return FINGER_JOINTS.map(([m,p,t])=>{
  const d=distance(landmarks[p],landmarks[m]);
  if(!Number.isFinite(d)||d<.008)return null;
  const ratio=distance(landmarks[t],landmarks[m])/d;
  if(ratio>1.65)return 1;
  if(ratio<1.38)return 0;
  return null;
 });
}
function fingerFeedback(landmarks,expectedPose){
 const expected=PATTERNS[expectedPose],actual=fingerStates(landmarks);
 if(!expected||!actual)return null;
 const matched=expected.map((v,i)=>actual[i]===v);
 return {expected:[...expected],actual,matched,count:matched.filter(Boolean).length,total:4,
  unknown:actual.filter(v=>v===null).length};
}
function pose(landmarks){
 const state=fingerStates(landmarks);
 if(!state||state.includes(null))return null;
 const found=Object.entries(PATTERNS).find(([,pattern])=>pattern.every((v,i)=>v===state[i]));
 return found?.[0]||null;
}
// In the star-count adventure, the task is NUMBER of raised fingers, not WHICH finger.
// Other game modes continue to use exact poses for gesture imitation.
function countMatch(hands,expectedPose){
 const requested={one:1,two:2,three:3}[expectedPose];
 if(!requested||!Array.isArray(hands)||hands.length!==1)return false;
 const states=fingerStates(hands[0]);
 return !!states&&!states.includes(null)&&states.reduce((n,v)=>n+v,0)===requested;
}
function match(hands, expected){
 if(!Array.isArray(hands)||!Array.isArray(expected)||hands.length!==expected.length||expected.length<1||expected.length>2)return false;
 const labels=hands.map(pose).filter(Boolean);
 // Extra hands must not score someone else's pose for the learner; use one visible hand
 // for one-handed games and two visible hands for bilateral games.
 if(labels.length<expected.length)return false;
 const target=[...expected];
 for(const label of labels){const i=target.indexOf(label);if(i>=0)target.splice(i,1);}
 return target.length===0;
}
const api={FINGER_JOINTS,PATTERNS,TITLES,EMOJI,fingerStates,fingerFeedback,pose,match,countMatch};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.HandMirrorCore=api;
})(typeof window!=='undefined'?window:globalThis);

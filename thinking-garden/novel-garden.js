/* Three genuinely different cognitive-garden mechanics; no external APIs. */
(()=>{
'use strict';
const IDS=['rulePost','mirrorPond','sceneDetect'];
const title={rulePost:'바뀌는 바람우체국',mirrorPond:'거울연못의 비밀',sceneDetect:'숲속 장면 탐정'};
const friendly={rulePost:'지금 규칙을 보고 소포를 배달해요.',mirrorPond:'연못에 비친 모양을 찾아요.',sceneDetect:'아까 본 장면에서 달라진 곳을 찾아요.'};
const stamps=['⭐','🍀'];
const colors=[{color:'#f7cf67',name:'노랑'},{color:'#77b6f0',name:'파랑'}];
const objects=['🌳','🌷','🏡','🐰','🦋','🎈','🍄','🐸','🍎','🦆'];
const alternates=['🌲','🌻','🏠','🐱','🐞','🎁','🌺','🐧','🍐','🐢'];
const sourceSets=[
 ['🌼','🐸','🦋',''],['🐞','','🌻','🐢'],['🍀','🌸','','🦆'],['🐠','🍄','🦋',''],['','🐰','🌲','🌻'],
 ['🌷','🦊','','🍓'],['🪻','🐙','🎈',''],['🍄','','🐦','🍎'],['🐢','🌙','🪁',''],
 ['🌲','🐝','','🥕'],['🐧','🌸','🧁',''],['','🐥','🌾','🍇'],['🎁','🌼','','🚗'],
 ['🦋','🍐','🐻',''],['','🍀','🐳','🎨'],['🌻','🐞','','⛵'],['🐰','','🌷','🍎'],
 ['🌼','🐨','🐳',''],['🍉','🍃','','🪿'],['🦉','🌴','🥕','']
];
const transforms={
  horizontal:a=>[a[1],a[0],a[3],a[2]],
  vertical:a=>[a[2],a[3],a[0],a[1]],
  rotate:a=>[a[3],a[2],a[1],a[0]]
};
const transformCopy={
 horizontal:{short:'↔ 좌우 뒤집기',description:'오른쪽과 왼쪽이 서로 바뀌어요.'},
 vertical:{short:'↕ 위아래 뒤집기',description:'위쪽과 아래쪽이 서로 바뀌어요.'},
 rotate:{short:'↻ 반 바퀴 돌리기',description:'그림 전체를 180도 돌려요.'}
};
function isNew(id){return IDS.includes(id)}
function setup(id,config={}){return {id,level:Math.min(3,Math.max(1,Number(config.level)||1)),cue:config.cue||'guide',activeRound:-1,roundData:null,records:[],mistakes:0,resetCount:0,switchedMistakes:0,firstCorrect:null,retries:0,awaitingPause:false,done:false,answerCount:0}}
function rounds(){return 5}
function makePackages(round){
 // 4 possible colour/stamp pairs -> 64 ordered three-parcel challenges.
 // A stride coprime to 64 avoids repeating any complete prompt in 20 rounds.
 const pairs=[[0,0],[0,1],[1,0],[1,1]];
 const index=(round*13+7)%64;
 return Array.from({length:3},(_,i)=>{
  const [color,stamp]=pairs[Math.floor(index/(4**i))%4];
  return {color,stamp};
 });
}
function makeRound(id,round,level){
 if(id==='rulePost'){
  const schedule=level===1?['color','color','stamp','stamp','color']:level===2?['color','stamp','color','stamp','color']:['stamp','color','stamp','color','stamp'];const step=round%5;
  return {rule:schedule[step],packages:makePackages(round),parcel:0,rightFirst:0,shipped:[],lastRule:round===0?null:(step===0?schedule[4]:schedule[step-1])};
 }
 if(id==='mirrorPond'){
  const step=round%5;const operation=level===1?'horizontal':level===2?(step>=3?'vertical':'horizontal'):['horizontal','vertical','rotate','horizontal','rotate'][step];
  const source=sourceSets[round%sourceSets.length];
  const choices=['horizontal','vertical','rotate'].map(type=>({type,icons:transforms[type](source)}));
  return {operation,source,choices:choices.slice(round%3).concat(choices.slice(0,round%3))};
 }
 const n=level===1?3:level===2?4:5;
 // Balanced target locations, with a different full scene across 20 questions.
 const start=round%objects.length;
 const changed=(round+Math.floor(round/objects.length))%n;
 const indices=Array.from({length:n},(_,i)=>(start+i)%objects.length);
 return {before:indices.map(i=>objects[i]),after:indices.map((i,pos)=>pos===changed?alternates[i]:objects[i]),changed,phase:'study',peeks:0};
}
function summary(s,parent){
 parent.querySelector('.novel-results')?.remove();
 const successes=s.records.filter(x=>x.last==='맞음').length;
 const first=s.records.filter(x=>x.first==='맞음').length;
 const div=document.createElement('div');div.className='novel-results';
 div.innerHTML='<p class="novel-result-lead">첫 시도 정확 '+first+'/'+s.records.length+' · 최종 정확 '+successes+'/'+s.records.length+' · 다시 확인한 횟수 '+s.resetCount+'</p><details class="novel-teacher"><summary>선생님 관찰기록 · CSV</summary><div class="novel-log"></div><button type="button" data-action="export">CSV로 저장</button><small>치료효과나 진단 점수가 아닌 과제 내 수행기록입니다.</small></details>';
 div.querySelector('.novel-log').textContent=s.records.map(x=>x.round+'번 '+x.first+' → '+x.last+' / 오반응 '+x.errors+'회 / 지원 '+x.help+' / '+x.note).join(' · ');
 div.querySelector('[data-action=export]').addEventListener('click',()=>csv(s));
 parent.appendChild(div);
}
function csv(s){
 const rows=[['게임','단계','최초반응','최종반응','오반응횟수','재확인횟수','도움','관찰'],...s.records.map(r=>[title[s.id],r.round,r.first,r.last,r.errors,r.resets,r.help,r.note])];
 const csv='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const uri=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=uri;a.download='모아_새로운_생각놀이_'+s.id+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(uri),1000);
}
function pond(icons){return '<div class="novel-pond-grid">'+icons.map(icon=>'<span class="novel-pad">'+(icon||'<span class="novel-empty">·</span>')+'</span>').join('')+'</div>'}
function render(id,d){
 const {state,area,missionText,missionSub,guide,addSeeds,sfx,nextRound}=d,s=state.novel;
 if(!s||!isNew(id))return;
 const round=state.round,level=s.level;
 if(s.activeRound!==round){
  s.activeRound=round;s.roundData=makeRound(id,round,level);
  s.firstCorrect=null;s.retries=0;s.awaitingPause=false;s.done=false;s.resetCountRound=0;
 }
 const data=s.roundData;
 const msg={
 rulePost:'바람이 불면 배달 규칙이 바뀌어요. 지금 표시를 확인해요.',
 mirrorPond:'거울에 비친 그림은 위치가 달라져요. 천천히 비교해요.',
 sceneDetect:'이전 장면을 충분히 보고 달라진 곳을 확인해요.'
 };
 missionText.textContent=title[id];missionSub.textContent=msg[id];
 guide.src=id==='sceneDetect'?'assets/friend-hong.png':id==='mirrorPond'?'assets/friend-ru.png':'assets/friend-saem.png';
 const cue=s.cue==='guide'?'👀 보기 → 🧠 생각하기 → ✋ 준비되면 답하기':s.cue==='wait'?'⏳ 충분히 기다렸다가 선택하기':'🌱 스스로 확인하기';
 const parts=['<div class="novel-quest" data-novel="'+id+'"><div class="novel-sequence">'+cue+'</div>'];
 if(id==='rulePost'){
  const isColor=data.rule==='color';
  const labels=isColor?['노란 우체통','파란 우체통']:['별 우체통','클로버 우체통'];
  const icons=isColor?['🟨','🟦']:stamps;
  const parcel=data.packages[data.parcel];
  parts.push('<div class="novel-rule-banner"><span>📯 지금 배달 규칙</span><strong>'+(isColor?'색깔을 보고 배달하기':'그림을 보고 배달하기')+'</strong><p>'+(isColor?'소포 그림은 잠시 잊고 색깔만 살펴봐요.':'소포 색깔은 잠시 잊고 그림만 살펴봐요.')+'</p></div>');
  parts.push('<div class="novel-airmail"><div class="novel-post-progress">보낸 소포 '+data.parcel+' / 3</div><div class="novel-parcel" style="--stamp:'+colors[parcel.color].color+'"><span class="novel-post-shape">'+stamps[parcel.stamp]+'</span><small>오늘의 소포</small></div><div class="novel-delivery-trail" role="status" aria-label="배달한 소포 표시">'+[0,1,2].map(i=>'<span class="'+(i<data.shipped.length?'sent':'waiting')+'" aria-label="'+(i<data.shipped.length?'배달 완료':'남은 배달')+'">'+(i<data.shipped.length?'✓':'·')+'</span>').join('')+'</div></div>');
  parts.push('<div class="novel-letterboxes">'+labels.map((t,i)=>'<button type="button" class="novel-mailbox" data-novel-action="deliver" data-idx="'+i+'"><span>'+icons[i]+'</span><strong>'+t+'</strong><small>이곳으로 배달하기 →</small></button>').join('')+'</div>');
  if(data.lastRule!==null&&data.rule!==data.lastRule)parts.push('<p class="novel-change-note">💨 바람이 불었어요! 규칙이 바뀌었는지 다시 확인해요.</p>');
 }else if(id==='mirrorPond'){
  const task=transformCopy[data.operation];
  parts.push('<div class="novel-rule-banner"><span>🪞 연못의 마법</span><strong>'+task.short+'</strong><p>'+task.description+'</p></div>');
  parts.push('<div class="novel-mirror-scene"><div><b>🪷 원래 자리</b>'+pond(data.source)+'</div><span class="novel-mirror-line">✦</span><div class="novel-water"><b>🌊 거울연못</b><span>어떤 모습으로 보일까요?</span></div></div>');
  parts.push('<div class="novel-choose-label">연못에 비친 그림을 골라요.</div><div class="novel-pond-choices">'+data.choices.map((choice,i)=>'<button type="button" data-novel-action="chooseReflection" data-idx="'+i+'"><b>'+['A','B','C'][i]+'번 섬</b>'+pond(choice.icons)+'</button>').join('')+'</div>');
 }else if(id==='sceneDetect'){
  const study=data.phase==='study',lookingBack=data.phase==='peek';
  parts.push('<div class="novel-rule-banner"><span>🔎 숲속 탐정의 관찰 노트</span><strong>'+(study?'첫 번째 장면을 살펴봐요':lookingBack?'처음 장면을 다시 확인해요':'무엇이 달라졌을까요?')+'</strong><p>'+(study||lookingBack?'시간 제한 없이 충분히 살펴봐도 돼요.':'이전 장면이 헷갈리면 다시 볼 수 있어요.')+'</p></div>');
  parts.push('<div class="novel-story-scene"><div class="novel-landscape"><span class="novel-skydecor">☁️　☀️　☁️</span><div class="novel-story-objects">'+(study||lookingBack?data.before:data.after).map((icon,i)=>(study||lookingBack)?'<span class="novel-story-object">'+icon+'</span>':'<button type="button" class="novel-story-object" data-novel-action="change" data-idx="'+i+'" aria-label="장면 '+(i+1)+'번째 자리">'+icon+'</button>').join('')+'</div><div class="novel-ground">🌿　🌼　🌿　🌼</div></div></div>');
  if(study)parts.push('<button type="button" class="novel-main-button" data-novel-action="reveal">충분히 살펴봤어요 → 지금 장면 보기</button>');
  else parts.push('<div class="novel-scene-tools"><button type="button" class="novel-side-button" data-novel-action="peek">👀 이전 장면 다시 보기</button><small>'+(level===1?'비교하며 천천히 찾아요.':'다시 본 횟수도 관찰기록에 남아요.')+'</small></div>');
  if(lookingBack)parts.push('<div class="novel-peek"><button type="button" class="novel-side-button" data-novel-action="back">다 봤어요 · 달라진 장면으로 돌아가기</button></div>');
 }
 parts.push('<div class="novel-feedback" role="status" aria-live="polite"></div><div class="novel-recovery" hidden><p>괜찮아요. 이전 선택에서 벗어나 현재 규칙이나 장면을 다시 확인해요.</p><button type="button" data-novel-action="pause">⏸ 잠깐 멈춰서 다시 확인하기</button></div>');
 parts.push('<div class="novel-bottom-actions"><button type="button" class="novel-side-button" data-novel-action="rest">어려워요 · 쉬어가기</button></div>');
 parts.push('<details class="novel-teacher"><summary>교사용 관찰 안내</summary><p>정답을 바로 알려주기보다 먼저 스스로 확인할 시간을 제공해요. 첫 오반응과 회복 여부를 구분해 기록합니다.</p></details></div>');
 area.innerHTML=parts.join('');
 const root=area.querySelector('.novel-quest'),feedback=root.querySelector('.novel-feedback'),recovery=root.querySelector('.novel-recovery');
 const completedMessage=id==='rulePost'?'우체국에 소포를 잘 배달했어요!':id==='mirrorPond'?'거울연못의 비밀을 찾았어요!':'숲속 장면을 정확히 비교했어요!';
 function finish(correct,note){
  if(s.done)return;
  s.done=true;
  const first=s.firstCorrect===true?'맞음':s.firstCorrect===false?'틀림':'미평가';
  s.records.push({round:round+1,first,last:correct===null?'쉬어감':correct?'맞음':'틀림',errors:s.retries,resets:s.resetCountRound,help:s.resetCountRound>0?'확인 전략':'없음',note});
  if(correct){addSeeds(s.retries?7:10);sfx('ok')}
  else if(correct===false)sfx('tap');
  root.querySelectorAll('button').forEach(b=>b.disabled=true);
  recovery.hidden=true;
  feedback.textContent=correct===null?'잠시 쉬어가도 괜찮아요.':correct?completedMessage:'이 문제는 잠시 두고 다음으로 넘어가요.';
  const button=document.createElement('button');button.className='novel-main-button';button.type='button';button.dataset.novelAction='next';button.textContent=round+1===state.roundTotal?'탐험 결과 보기 →':'다음 이야기로 →';root.appendChild(button);
 }
 function failure(message,oldRuleInterference=false){
  if(s.firstCorrect===null)s.firstCorrect=false;
  s.retries++;s.mistakes++;
  if(oldRuleInterference)s.switchedMistakes++;
  if(s.retries>=3){feedback.textContent='같은 문제가 계속 헷갈린다면 여기까지 하고 잠시 쉬어갈 수 있어요.';recovery.hidden=false;return;}
  feedback.textContent=message;
  recovery.hidden=false;
 }
 function success(note){
  if(s.firstCorrect===null)s.firstCorrect=true;
  finish(true,note);
 }
 root.addEventListener('click',event=>{
  const b=event.target.closest('button[data-novel-action]');if(!b||b.disabled||s.done&&b.dataset.novelAction!=='next')return;
  const action=b.dataset.novelAction,index=Number(b.dataset.idx);
  if(action==='next'){b.disabled=true;nextRound(0);return;}
  if(action==='rest'){finish(null,'과제 중단 또는 휴식 요청');return;}
  if(action==='pause'){s.resetCount++;s.resetCountRound++;s.awaitingPause=false;recovery.hidden=true;feedback.textContent='준비되면 다시 해봐요. 빠르게 대답할 필요 없어요.';return;}
  if(action==='deliver'){
   const p=data.packages[data.parcel],correct=data.rule==='color'?p.color:p.stamp;
   if(index===correct){
    if(s.firstCorrect===null)s.firstCorrect=true;
    data.shipped.push(p);data.parcel++;
    if(level===3&&data.parcel===1){data.lastRule=data.rule;data.rule=data.rule==='color'?'stamp':'color';}
    if(data.parcel===data.packages.length){
      const trail=root.querySelector('.novel-delivery-trail');
      if(trail){trail.innerHTML='<span class="sent">✓</span><span class="sent">✓</span><span class="sent">✓</span>';trail.classList.add('all-sent');}
      success(s.retries?'규칙 확인 후 3개 배달':'첫 시도로 3개 배달');return;
     }
    s.awaitingPause=false;render(id,d);return;
   }
   const other=data.rule==='color'?p.stamp:p.color;
   failure('현재 규칙을 다시 확인하고 소포를 살펴봐요.',data.lastRule!==null&&data.rule!==data.lastRule&&index===other);
   return;
  }
  if(action==='chooseReflection'){
   if(data.choices[index].type===data.operation){
      b.classList.add('novel-reflection-solved');
      const water=root.querySelector('.novel-water');
      if(water){
       water.classList.add('novel-water-revealed');
       water.querySelector('span').textContent='거울에 비친 모양';
       const reflection=document.createElement('div');
       reflection.className='novel-result-reflection';
       reflection.innerHTML=pond(data.choices[index].icons);
       water.appendChild(reflection);
      }
      success(s.retries?'다시 비교 후 선택':'첫 선택 정답');return;
     }
   failure('좌우·위아래·회전 중 어떤 움직임인지 다시 확인해요.');return;
  }
  if(action==='reveal'){data.phase='after';render(id,d);return;}
  if(action==='peek'){data.phase='peek';data.peeks++;s.resetCount++;s.resetCountRound++;render(id,d);return;}
  if(action==='back'){data.phase='after';render(id,d);return;}
  if(action==='change'){
   if(data.phase==='peek')return;
   if(index===data.changed){
      b.classList.add('novel-difference-solved');
      const review=document.createElement('div');review.className='novel-scene-review';review.setAttribute('role','status');
      const before=document.createElement('span'),arrow=document.createElement('span'),after=document.createElement('span');
      before.className='novel-difference-before';after.className='novel-difference-after';
      before.textContent=data.before[index]||'빈 자리';after.textContent=data.after[index]||'빈 자리';
      arrow.textContent='→';arrow.setAttribute('aria-hidden','true');
      review.append(before,arrow,after);
      root.querySelector('.novel-story-scene')?.appendChild(review);
      success((data.peeks?'이전 장면 재확인 '+data.peeks+'회 후 ':'')+'달라진 위치 선택');return;
     }
   failure('한 곳씩 처음 장면과 비교해 보세요.');return;
  }
 });
}
window.NovelGarden={IDS,title,isNew,setup,rounds,render,summary};
})();

/* Six independent, native Moa cognitive garden activities.
   No diagnosis, no user account, no server persistence. */
(() => {
'use strict';
const IDS=['slowScan','slowPlace','slowBlock','slowName','slowMemory','slowEveryday'];
const names={slowScan:'꽃과 단서 찾기',slowPlace:'정원 지도 따라 놓기',slowBlock:'블록 건축가',slowName:'친구 이름 탐정',slowMemory:'꽃자리 기억하기',slowEveryday:'가방 준비 탐험'};
const icons={slowScan:'🌼',slowPlace:'🧭',slowBlock:'🧩',slowName:'🐰',slowMemory:'🌸',slowEveryday:'🎒'};
const animals=[['강아지','🐶'],['고양이','🐱'],['토끼','🐰'],['곰','🐻'],['돼지','🐷'],['개구리','🐸']];
const colors=[['노란색','#efc15d'],['파란색','#448dcc'],['초록색','#53a87a'],['빨간색','#d56e64'],['보라색','#946ec0'],['주황색','#ef955a']];
// Situation-based everyday materials live in life-bag-scenes.js.
const simple=[[[0,1],[1,1]],[[1,0],[1,1]],[[0,0],[0,1]],[[1,1],[2,1]],[[0,0],[1,0]]];
const medium=[[[0,1],[1,1],[1,2]],[[0,0],[0,1],[1,0]],[[1,0],[1,1],[2,1]],[[0,1],[1,0],[1,1]],[[0,0],[1,0],[1,1]]];
const hard=[[[0,1],[1,0],[1,1],[2,1]],[[1,1],[1,2],[2,0],[2,1]],[[0,0],[0,1],[1,1],[2,1]],[[0,1],[1,1],[1,2],[2,2]],[[0,0],[1,0],[1,1],[2,1]]];
function isNew(id){return IDS.includes(id)}
function rounds(id){return id==='slowName'?6:5}
function newNameOrder(){
 const order=[0,1,2,3,4,5];
 for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 return order;
}
function setUp(id, options){return {nameOrder:newNameOrder(),id,level:Math.max(1,Math.min(3,Number(options.level)||1)),cue:options.cue||'guide',kind:options.kind||'animal',response:options.response||'speech',records:[],activeRound:-1,selected:new Set(),attempts:0,firstCorrect:null,hint:false,pauses:0,finished:false}}
function csv(s){
 const headers=['활동','난이도','지원방식','제시번호','최초정확','최종정확','재시도','단서','쉬기','반응'];
 const rows=[headers,...s.records.map(r=>[names[s.id],s.level,{guide:'전략 안내',wait:'기다리기',self:'스스로'}[s.cue],r.round,r.first,r.final,r.retries,r.hint?'사용':'없음',r.pauses||0,r.note])];
 const safe=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 const csv='\uFEFF'+rows.map(r=>r.map(safe).join(',')).join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),link=document.createElement('a'),uri=URL.createObjectURL(blob);
 link.href=uri;link.download='차근차근_인지정원_'+new Date().toISOString().slice(0,10)+'.csv';
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(uri),600);
}
function addSummary(s,container) {
 container.querySelector('.slow-result-extra')?.remove();
 const root=document.createElement('div');root.className='slow-result-extra';
 const correct=s.records.filter(r=>r.final==='O').length;
 const initial=s.records.filter(r=>r.first==='O').length;
 root.innerHTML='<p class="slow-result-info">처음 정확 '+initial+'/'+s.records.length+' · 마지막 정확 '+correct+'/'+s.records.length+' · 전략은 결과보다 과정이 중요해요.</p><details class="slow-teacher-details"><summary>선생님 관찰기록 열기</summary><div class="slow-result-lines"></div><button type="button" class="slow-csv">CSV 기록 저장</button><p>저장하지 않으면 기록은 사이트로 전송되지 않아요. 진단 점수가 아닙니다.</p></details>';
 root.querySelector('.slow-result-lines').textContent=s.records.map(r=>r.round+'번: 첫 '+r.first+', 마지막 '+r.final+', 재시도 '+r.retries+(r.hint?', 단서 사용':'')+' · 쉬기 '+(r.pauses||0)+'회 · '+r.note).join(' / ');
 root.querySelector('.slow-csv').addEventListener('click',()=>csv(s));
 container.appendChild(root);
}
function render(id,d) {
 const {state,area,missionText,missionSub,guide,say,flash,addSeeds,sfx,nextRound}=d;
 const s=state.slowLook;
 if(!s || !isNew(id))return;
 const newRound=s.activeRound!==state.round;
 if(newRound){s.activeRound=state.round;s.selected=new Set();s.attempts=0;s.firstCorrect=null;s.hint=false;s.pauses=0;s.finished=false;s.nameReady=false;s.memoryHidden=-1;if(id==='slowBlock')window.MoaBlockBuilder.fresh(s);}
 const round=state.round;
 const cues={guide:'눈으로 보고, 생각하고, 준비되면 표현해요.',wait:'천천히 살펴볼 시간을 가져요.',self:'스스로 확인한 뒤 준비되면 시작해요.'};
 guide.src=id==='slowMemory'?'assets/friend-ru.png':id==='slowScan'?'assets/friend-hong.png':'assets/friend-saem.png';
 missionText.textContent=({slowScan:'꽃을 빠뜨리지 않고 찾아요!',slowPlace:'정원의 같은 위치에 꽃을 심어요!',slowBlock:'같은 블록 모양의 정원을 만들어요!',slowName:'친구의 이름을 차근차근 말해요!',slowMemory:'꽃이 있던 자리를 기억해요!',slowEveryday:'가방에 넣을 물건을 찾아요!'})[id];
 missionSub.textContent=cues[s.cue];
 if(s.cue==='guide'&&id!=='slowEveryday'&&newRound)say(missionText.textContent); // no automatic repetition in wait/self mode
 const n=s.level===3?4:3;
 const blockHard=[[[0,1],[1,1],[2,1],[2,2]],...hard.slice(1)];
 const baseShape=(s.level===1?simple:s.level===2?medium:id==='slowBlock'?blockHard:hard)[round%simple.length];
  const rotation=Math.floor(round/5)%4;
  const shape=baseShape.map(([r,c])=>{let a=r,b=c;for(let k=0;k<rotation;k++){const t=a;a=b;b=n-1-t}return[a,b]});
 const selected=s.selected;
 const pattern=shape.map(([r,c])=>r+','+c);
 const target=new Set(pattern);
 const cells=Math.pow(n,2);
 // Every six-round block contains every target exactly once.
 // The starting order varies by session; a later block rotates to avoid rote response.
 const itemIndex=s.nameOrder[(round+Math.floor(round/6))%6];
 const pool=s.kind==='color'?colors:animals;
 const item=pool[itemIndex];
 const bag=id==='slowEveryday'?window.MoaBagScenes?.makePlan(round,s.level):null;
 if(id==='slowEveryday'&&!bag)throw Error('Moa everyday scenario bank unavailable');
 let scanTargets=new Set();
 if(id==='slowScan'){const rows=[[0,0],[0,n-1],[n-1,0],[n-1,n-1],[1,1],[2,1]];rows.slice(0,s.level+1).forEach(([r,c])=>scanTargets.add(((r+round)%n)+','+((c+round*2)%n)));}
 const objectTargets=new Set(bag?bag.choices.map((x,i)=>x.correct?Math.floor(i/n)+','+(i%n):null).filter(Boolean):[]);
 const el=(html)=>{area.innerHTML='<div class="slow-task '+(id==='slowName'?'slow-name-task':'')+'">'+html+'</div>';return area.querySelector('.slow-task');};
 const info='<p class="slow-step"><span>① 자세히 보기</span><span>② 생각하기</span><span>③ 준비되면 표현하기</span></p>';
 const teacher='<details class="slow-teacher-details"><summary>선생님 도움·관찰</summary><p>정답을 알려주지 않고 스스로 확인할 시간을 제공해요. 이전 반응 간섭이나 어려움을 보이면 쉬어갈 수 있어요.</p><button type="button" data-slow="hint">다시 확인하는 방법 안내</button></details>';
 function grid(sample, mode) {
  return '<div class="slow-board" style="--side:'+n+'" role="group" aria-label="'+(sample?'보기':'답을 만드는 칸')+'">'+Array.from({length:cells},(_,i)=>{
    const r=Math.floor(i/n),c=i%n,key=r+','+c,marked=sample&&target.has(key),chosen=selected.has(key);
    let content=marked?(id==='slowBlock'?'🧱':'🌼'):'';
    return sample?'<div class="slow-tile '+(marked?'shown':'')+'" aria-label="'+(r+1)+'행 '+(c+1)+'열">'+content+'</div>':'<button type="button" class="slow-tile '+(chosen?'picked':'')+'" data-slow="cell" data-key="'+key+'" aria-label="'+(r+1)+'행 '+(c+1)+'열" aria-pressed="'+chosen+'">'+(chosen?(id==='slowBlock'?'🧱':'🌼'):'')+'</button>';
  }).join('')+'</div>';
 }
 let html=info;
 if(id==='slowScan') {
  html+='<div class="slow-mission-label">숨어 있는 꽃 '+scanTargets.size+'송이를 찾아요.</div><div class="slow-board slow-scan" style="--side:'+n+'">'+Array.from({length:cells},(_,i)=>{
   const key=Math.floor(i/n)+','+(i%n),yes=scanTargets.has(key),icons=['🍃','🌱','🪨','🌿'];
   return '<button type="button" data-slow="cell" data-key="'+key+'" aria-label="그림 '+(i+1)+'" aria-pressed="'+selected.has(key)+'" class="slow-tile '+(selected.has(key)?'picked':'')+'">'+(yes?'🌼':icons[(i+round)%4])+'</button>';
  }).join('')+'</div>';
 }else if(id==='slowPlace') {
  html+='<div class="slow-map-pair"><div><b>보기</b>'+grid(true)+'</div><div><b>내가 만드는 정원</b>'+grid(false)+'</div></div>';
 }else if(id==='slowBlock'){
  html+=window.MoaBlockBuilder.model(s,pattern,n);
 }else if(id==='slowMemory'){
  const hidden=s.memoryHidden===round;
  html+=hidden?'<div class="slow-mission-label">어디에 꽃이 있었을까요?</div><div class="slow-map-pair"><div><b>가려진 보기</b><div class="slow-board slow-covered">🙈<small>잠깐 기억해요</small></div></div><div><b>내가 기억한 자리</b>'+grid(false)+'</div></div>':'<div class="slow-mission-label">꽃이 있는 위치를 기억해요.</div><div class="slow-map-pair"><div><b>기억할 정원</b>'+grid(true)+'</div><div><b>기억할 수 있으면 눌러요</b><div class="slow-board slow-covered">🌿<small>준비되면 시작해요</small></div></div></div>';
  if(!hidden)html+='<button type="button" class="slow-primary" data-slow="hide">기억했어요 · 보기 가리기 →</button>';
  else html+='<button type="button" class="slow-secondary" data-slow="show">잠깐 다시 보기</button>';
 }else if(id==='slowName') {
  const visual=s.kind==='animal'?item[1]:'<span class="slow-color" style="background:'+item[1]+'"></span>';
  html+='<div class="slow-name-quest"><img src="assets/friend-saem.png" alt="" class="slow-name-guide"><span aria-hidden="true">🌿</span><strong>누가 정원 문 앞에 왔을까?</strong><span aria-hidden="true">🚪</span></div>';
  html+='<div class="slow-name-picture" aria-label="이름을 생각할 그림">'+visual+'</div>';
  if(!s.nameReady)html+='<button type="button" class="slow-primary" data-slow="ready">충분히 봤어요 · 이제 말할게요 →</button>';
  else if(s.response==='speech')html+='<div class="slow-teacher-choice"><p>아동이 말한 뒤 선생님이 결과를 기록합니다.</p><button data-slow="name-right">정확하게 말함</button><button data-slow="name-wrong">다른 이름을 말함</button><button data-slow="skip">모르겠어요 · 쉬어가기</button></div>';
  else {
   const distractors=[(itemIndex+2+round)%6,(itemIndex+4+round)%6].filter(i=>i!==itemIndex);
   for(let j=0;j<6&&distractors.length<2;j++)if(j!==itemIndex&&!distractors.includes(j))distractors.push(j);
   const ix=[itemIndex,...distractors].sort((a,b)=>((a+round*3)%7)-((b+round*3)%7));
   html+='<div class="slow-name-choice" role="group" aria-label="글자로 이름 고르기">'+ix.map(i=>'<button type="button" data-slow="word" data-word="'+i+'">'+pool[i][0]+'</button>').join('')+'</div>';
  }
 }else if(id==='slowEveryday'){
  missionText.textContent=bag.title+' 준비해요!';
  missionSub.textContent='그림 속 상황에 어울리는 준비물 '+bag.targets.length+'개를 골라요.';
  if(s.cue==='guide')say(missionText.textContent+' '+missionSub.textContent);
  const chosenIcons=bag.choices.filter((o,i)=>selected.has(Math.floor(i/n)+','+(i%n))).map(o=>o.icon);
  html+='<div class="slow-bag-quest"><div class="slow-bag-story"><img src="assets/friend-saem.png" alt=""><div><span class="slow-bag-scene" aria-hidden="true">'+bag.scene+'</span><strong>'+bag.title+'</strong><small>모아의 오늘 준비 이야기</small></div></div><div class="slow-bag-progress" aria-live="polite"><span aria-hidden="true">🎒</span><strong id="moaBagCounter">'+selected.size+' / '+bag.targets.length+'</strong><div id="moaBagContents">'+(chosenIcons.join(' ')||'🌱')+'</div></div></div>';
  html+='<p class="slow-mission-label">가방에 알맞은 물건 '+bag.targets.length+'개를 담아요.</p>';
  html+='<div class="slow-board slow-bag" style="--side:'+n+'" role="group" aria-label="준비물 고르기">'+bag.choices.map((obj,i)=>{const key=Math.floor(i/n)+','+(i%n);return '<button type="button" class="slow-tile '+(selected.has(key)?'picked':'')+'" data-slow="cell" data-key="'+key+'" aria-pressed="'+selected.has(key)+'" aria-label="'+obj.label+'">'+obj.icon+'</button>'}).join('')+'</div>';
 }
 if(id!=='slowName'&&(id!=='slowMemory'||s.memoryHidden===round))html+='<div class="slow-actions"><button type="button" class="slow-primary" data-slow="check">확인했어요 ✓</button><button type="button" class="slow-secondary" data-slow="skip">쉬어가기</button></div>';
 html+='<button type="button" class="slow-secondary slow-pause-button" data-slow="pause">🌿 잠깐 쉬기</button><div class="slow-feedback" role="status" aria-live="polite"></div>'+teacher;
 const root=el(html),feed=root.querySelector('.slow-feedback');
 
 function finish(outcome,note){
  if(s.finished)return;
  s.finished=true;const correct=outcome===true;
  s.records.push({round:round+1,first:s.firstCorrect===true?'O':s.firstCorrect===false?'X':'미확인',final:outcome===null?'미평가':correct?'O':'X',retries:s.attempts,hint:s.hint,pauses:s.pauses,note:id==='slowBlock'?note+' · 조립 수정 '+(s.blockEdits||0)+'회':note});
  if(correct){addSeeds(s.attempts?7:10);sfx('ok');}else if(outcome===false){sfx('tap');}
  root.querySelectorAll('button[data-slow]').forEach(b=>{if(b.dataset.slow!=='next')b.disabled=true;});
  feed.textContent=outcome===null?'쉬어가도 괜찮아요.':correct?'정원을 정확하게 살폈어요!':'어려웠던 문제는 잠시 두고 다음 길로 가요.';
  if(correct&&id==='slowBlock'){
   const home=document.createElement('div');home.className='slow-block-built';home.setAttribute('role','status');home.innerHTML='<span aria-hidden="true">🧱 🏡 🌼</span><strong>샘의 집이 완성됐어요!</strong><p>블록을 돌리고 연결해서 집을 만들었어요.</p>';root.appendChild(home);
  }
  if(correct&&id==='slowEveryday'){
   const arrival=document.createElement('div');arrival.className='slow-bag-arrival';arrival.setAttribute('role','status');
   const packed=bag.targets.map(id=>bag.choices.find(c=>c.id===id).icon).join(' ');
   arrival.innerHTML='<div class="slow-bag-ready-icons" aria-hidden="true">🎒 '+packed+' 🌼</div><strong>모아가 준비를 마쳤어요!</strong><p>필요한 것을 골라 가방에 담았어요.</p>';
   root.appendChild(arrival);
  }
  if(correct&&id==='slowName'){
   const visit=document.createElement('div');visit.className='slow-name-arrival';visit.setAttribute('role','status');
   const art=document.createElement('span');art.className='slow-name-arrival-art';art.setAttribute('aria-hidden','true');art.textContent=(s.kind==='animal'?item[1]:'🚩')+' 🌷';
   const caption=document.createElement('strong');caption.textContent=s.kind==='animal'?'🌼 정원 문이 열리고 친구가 들어왔어요!':'🌼 색깔 깃발을 정원에 세웠어요!';
   visit.append(art,caption);root.appendChild(visit);
  }
  const btn=document.createElement('button');btn.type='button';btn.className='slow-primary';btn.dataset.slow='next';btn.textContent=round+1===state.roundTotal?'탐험 결과 보기 →':'다음 길로 가기 →';root.appendChild(btn);
 }
 function check(){
  let sol=id==='slowScan'?scanTargets:id==='slowEveryday'?objectTargets:target;
  const okay=selected.size===sol.size&&[...selected].every(k=>sol.has(k));
  if(s.firstCorrect===null)s.firstCorrect=okay;
  if(okay){finish(true,s.attempts?'다시 확인 후 정확':'첫 반응 정확');return;}
  s.attempts++;
  if(s.attempts>=2){finish(false,'재확인 후에도 위치·선택이 다름');return;}
  feed.textContent='잠깐 멈춰서 다시 확인해요. 틀린 곳을 바로 알려주지 않을게요.';
  flash('천천히 한 번 더 확인해요.');
 }
 function nameScore(okay,note){if(s.firstCorrect===null)s.firstCorrect=okay;if(okay)finish(true,note);else {s.attempts++;if(s.attempts>=2){finish(false,note);return;}s.nameReady=false;s.hint=true;feed.textContent='다시 천천히 눈으로 보고 생각할 시간을 가져요.';let btn=root.querySelector('[data-slow="ready"]');if(!btn){btn=document.createElement('button');btn.type='button';btn.className='slow-primary slow-retry-name';btn.dataset.slow='retryName';btn.textContent='다시 보고 말하기 →';root.appendChild(btn)}else btn.disabled=false;root.querySelectorAll('.slow-teacher-choice button,.slow-name-choice button').forEach(x=>x.disabled=true)}}
 root.addEventListener('click',e=>{
  const block=e.target.closest('button[data-block]');
  if(id==='slowBlock'&&block&&!block.disabled){
   window.MoaBlockBuilder.action(s,block.dataset.block,block.dataset.key,n,pattern.length);
   render(id,d);
   return;
  }
  const b=e.target.closest('button[data-slow]');if(!b||b.disabled)return;const a=b.dataset.slow;
  if(a==='pause'){
   s.pauses++;root.classList.add('slow-paused');
   const panel=document.createElement('div');panel.className='slow-pause-panel';panel.setAttribute('role','status');
   panel.innerHTML='<span aria-hidden="true">🌿</span><strong>잠깐 쉬어가요</strong><p>같은 곳에서 다시 시작할 수 있어요.</p><button type="button" class="slow-primary" data-slow="resume">준비됐어요 · 이어하기 →</button>';
   root.appendChild(panel);panel.querySelector('button').focus();return;
  }
  if(a==='resume'){
   root.querySelector('.slow-pause-panel')?.remove();root.classList.remove('slow-paused');return;
  }
  if(a==='cell'){
   const key=b.dataset.key;
   if(selected.has(key))selected.delete(key);else selected.add(key);
   b.classList.toggle('picked',selected.has(key));b.setAttribute('aria-pressed',String(selected.has(key)));
   if(id==='slowPlace'||id==='slowBlock')b.textContent=selected.has(key)?id==='slowBlock'?'🧱':'🌼':'';
   if(id==='slowEveryday'){
    root.querySelector('#moaBagCounter').textContent=selected.size+' / '+bag.targets.length;
    root.querySelector('#moaBagContents').textContent=bag.choices.filter((obj,i)=>selected.has(Math.floor(i/n)+','+(i%n))).map(obj=>obj.icon).join(' ')||'🌱';
   }
   return;
  }
  if(a==='check')return check();
  if(a==='skip')return finish(null,'쉬어감/미응답');
  if(a==='next'){b.disabled=true;nextRound(0);return;}
  if(a==='hide'){s.memoryHidden=round;render(id,d);return;}
  if(a==='show'){s.hint=true;s.memoryHidden=-1;render(id,d);return;}
  if(a==='ready'){s.nameReady=true;render(id,d);return;}
  if(a==='retryName'){s.nameReady=true;render(id,d);return;}
  if(a==='name-right')return nameScore(true,'교사 관찰: 말로 명명 (정확)');
  if(a==='name-wrong')return nameScore(false,'교사 관찰: 말로 명명 (오반응)');
  if(a==='word')return nameScore(Number(b.dataset.word)===itemIndex,'글자로 선택 (말하기 수행 아님)');
  if(a==='hint'){s.hint=true;feed.textContent='한 칸씩 비교한 뒤 대답해요. 필요하면 쉬었다가 다시 해요.';return;}
 });
}
window.SlowLookNative={IDS,isNew,rounds,setUp,render,addSummary,names,icons};
})();

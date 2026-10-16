/* Six independent, native Moa cognitive garden activities.
   No diagnosis, no user account, no server persistence. */
(() => {
'use strict';
const IDS=['slowScan','slowPlace','slowBlock','slowName','slowMemory','slowEveryday'];
const names={slowScan:'꽃과 단서 찾기',slowPlace:'정원 지도 따라 놓기',slowBlock:'블록 건축가',slowName:'친구 이름 탐정',slowMemory:'꽃자리 기억하기',slowEveryday:'가방 준비 탐험'};
const icons={slowScan:'🌼',slowPlace:'🧭',slowBlock:'🧩',slowName:'🐰',slowMemory:'🌸',slowEveryday:'🎒'};
const animals=[['강아지','🐶'],['고양이','🐱'],['토끼','🐰'],['곰','🐻'],['돼지','🐷'],['개구리','🐸']];
const colors=[['노란색','#efc15d'],['파란색','#448dcc'],['초록색','#53a87a'],['빨간색','#d56e64'],['보라색','#946ec0'],['주황색','#ef955a']];
const objects=[['책','📖'],['연필','✏️'],['가위','✂️'],['지우개','🧽'],['물병','🍼'],['자','📏']];
const simple=[[[0,1],[1,1]],[[1,0],[1,1]],[[0,0],[0,1]],[[1,1],[2,1]],[[0,0],[1,0]]];
const medium=[[[0,1],[1,1],[1,2]],[[0,0],[0,1],[1,0]],[[1,0],[1,1],[2,1]],[[0,1],[1,0],[1,1]],[[0,0],[1,0],[1,1]]];
const hard=[[[0,1],[1,0],[1,1],[2,1]],[[1,1],[1,2],[2,0],[2,1]],[[0,0],[0,1],[1,1],[2,1]],[[0,1],[1,1],[1,2],[2,2]],[[0,0],[1,0],[1,1],[2,1]]];
function isNew(id){return IDS.includes(id)}
function rounds(id){return id==='slowName'?6:5}
function setUp(id, options){return {id,level:Math.max(1,Math.min(3,Number(options.level)||1)),cue:options.cue||'guide',kind:options.kind||'animal',response:options.response||'speech',records:[],activeRound:-1,selected:new Set(),attempts:0,firstCorrect:null,hint:false,finished:false}}
function csv(s){
 const headers=['활동','난이도','지원방식','제시번호','최초정확','최종정확','재시도','단서','반응'];
 const rows=[headers,...s.records.map(r=>[names[s.id],s.level,{guide:'전략 안내',wait:'기다리기',self:'스스로'}[s.cue],r.round,r.first,r.final,r.retries,r.hint?'사용':'없음',r.note])];
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
 root.querySelector('.slow-result-lines').textContent=s.records.map(r=>r.round+'번: 첫 '+r.first+', 마지막 '+r.final+', 재시도 '+r.retries+(r.hint?', 단서 사용':'')+' · '+r.note).join(' / ');
 root.querySelector('.slow-csv').addEventListener('click',()=>csv(s));
 container.appendChild(root);
}
function render(id,d) {
 const {state,area,missionText,missionSub,guide,say,flash,addSeeds,sfx,nextRound}=d;
 const s=state.slowLook;
 if(!s || !isNew(id))return;
 if(s.activeRound!==state.round){s.activeRound=state.round;s.selected=new Set();s.attempts=0;s.firstCorrect=null;s.hint=false;s.finished=false;s.nameReady=false;s.memoryHidden=-1;}
 const round=state.round;
 const cues={guide:'눈으로 보고, 생각하고, 준비되면 표현해요.',wait:'천천히 살펴볼 시간을 가져요.',self:'스스로 확인한 뒤 준비되면 시작해요.'};
 guide.src=id==='slowMemory'?'assets/friend-ru.png':id==='slowScan'?'assets/friend-hong.png':'assets/friend-saem.png';
 missionText.textContent=({slowScan:'꽃을 빠뜨리지 않고 찾아요!',slowPlace:'정원의 같은 위치에 꽃을 심어요!',slowBlock:'같은 블록 모양의 정원을 만들어요!',slowName:'친구의 이름을 차근차근 말해요!',slowMemory:'꽃이 있던 자리를 기억해요!',slowEveryday:'가방에 넣을 물건을 찾아요!'})[id];
 missionSub.textContent=cues[s.cue];
 if(s.cue==='guide')say(missionText.textContent); // deliberately avoid reading answer or repeating prompts under wait/self
 const n=s.level===3?4:3;
 const baseShape=(s.level===1?simple:s.level===2?medium:hard)[round%simple.length];
  const rotation=Math.floor(round/5)%4;
  const shape=baseShape.map(([r,c])=>{let a=r,b=c;for(let k=0;k<rotation;k++){const t=a;a=b;b=n-1-t}return[a,b]});
 const selected=s.selected;
 const pattern=shape.map(([r,c])=>r+','+c);
 const target=new Set(pattern);
 const cells=Math.pow(n,2);
 const nameSequence=[0,1,2,0,2,1];
 const itemIndex=(nameSequence[round%6]+Math.floor(round/6))%6;
 const pool=s.kind==='color'?colors:animals;
 const item=pool[itemIndex];
 const targetObject=[...objects[(round*2+1)%objects.length]];
 let objectArr=Array.from({length:Math.max(6,cells)},(_,i)=>objects[(i*5+round+i%3)%objects.length]);
 let scanTargets=new Set();
 if(id==='slowScan'){const rows=[[0,0],[0,n-1],[n-1,0],[n-1,n-1],[1,1],[2,1]];rows.slice(0,s.level+1).forEach(([r,c])=>scanTargets.add(((r+round)%n)+','+((c+round*2)%n)));}
 let objectTargets=new Set();
 if(id==='slowEveryday'){objectArr=Array.from({length:cells},(_,i)=>objects[(i+round*2+i%3)%objects.length]);const ix=(round*2+2)%objectArr.length;const chosen=objectArr[ix];targetObject[0]=chosen[0];targetObject[1]=chosen[1];objectArr.forEach((x,i)=>{if(x[0]===chosen[0])objectTargets.add(Math.floor(i/n)+','+(i%n))});}
 const el=(html)=>{area.innerHTML='<div class="slow-task">'+html+'</div>';return area.querySelector('.slow-task');};
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
 }else if(id==='slowPlace'||id==='slowBlock') {
  html+='<div class="slow-map-pair"><div><b>보기</b>'+grid(true)+'</div><div><b>내가 만드는 정원</b>'+grid(false)+'</div></div>';
 }else if(id==='slowMemory'){
  const hidden=s.memoryHidden===round;
  html+=hidden?'<div class="slow-mission-label">어디에 꽃이 있었을까요?</div><div class="slow-map-pair"><div><b>가려진 보기</b><div class="slow-board slow-covered">🙈<small>잠깐 기억해요</small></div></div><div><b>내가 기억한 자리</b>'+grid(false)+'</div></div>':'<div class="slow-mission-label">꽃이 있는 위치를 기억해요.</div><div class="slow-map-pair"><div><b>기억할 정원</b>'+grid(true)+'</div><div><b>기억할 수 있으면 눌러요</b><div class="slow-board slow-covered">🌿<small>준비되면 시작해요</small></div></div></div>';
  if(!hidden)html+='<button type="button" class="slow-primary" data-slow="hide">기억했어요 · 보기 가리기 →</button>';
  else html+='<button type="button" class="slow-secondary" data-slow="show">잠깐 다시 보기</button>';
 }else if(id==='slowName') {
  const visual=s.kind==='animal'?item[1]:'<span class="slow-color" style="background:'+item[1]+'"></span>';
  html+='<div class="slow-name-picture" aria-label="이름을 생각할 그림">'+visual+'</div>';
  if(!s.nameReady)html+='<button type="button" class="slow-primary" data-slow="ready">충분히 봤어요 · 이제 말할게요 →</button>';
  else if(s.response==='speech')html+='<div class="slow-teacher-choice"><p>아동이 말한 뒤 선생님이 결과를 기록합니다.</p><button data-slow="name-right">정확하게 말함</button><button data-slow="name-wrong">다른 이름을 말함</button><button data-slow="skip">모르겠어요 · 쉬어가기</button></div>';
  else {const ix=[itemIndex,(itemIndex+2)%6,(itemIndex+4)%6].sort((a,b)=>(a*3+round)%7-(b*3+round)%7);html+='<div class="slow-name-choice">'+ix.map(i=>'<button type="button" data-slow="word" data-word="'+i+'">'+pool[i][0]+'</button>').join('')+'</div>'}
 }else if(id==='slowEveryday'){
  html+='<div class="slow-mission-label">가방에 넣을 '+targetObject[0]+'을(를) 모두 찾아요.</div><div class="slow-board slow-bag" style="--side:'+n+'">'+objectArr.map((obj,i)=>{const key=Math.floor(i/n)+','+(i%n);return '<button type="button" class="slow-tile '+(selected.has(key)?'picked':'')+'" data-slow="cell" data-key="'+key+'" aria-pressed="'+selected.has(key)+'" aria-label="물건 '+(i+1)+'">'+obj[1]+'</button>'}).join('')+'</div>';
 }
 if(id!=='slowName'&&(id!=='slowMemory'||s.memoryHidden===round))html+='<div class="slow-actions"><button type="button" class="slow-primary" data-slow="check">확인했어요 ✓</button><button type="button" class="slow-secondary" data-slow="skip">쉬어가기</button></div>';
 html+='<div class="slow-feedback" role="status" aria-live="polite"></div>'+teacher;
 const root=el(html),feed=root.querySelector('.slow-feedback');
 
 function finish(outcome,note){
  if(s.finished)return;
  s.finished=true;const correct=outcome===true;
  s.records.push({round:round+1,first:s.firstCorrect===true?'O':s.firstCorrect===false?'X':'미확인',final:outcome===null?'미평가':correct?'O':'X',retries:s.attempts,hint:s.hint,note});
  if(correct){addSeeds(s.attempts?7:10);sfx('ok');}else if(outcome===false){sfx('tap');}
  root.querySelectorAll('button[data-slow]').forEach(b=>{if(b.dataset.slow!=='next')b.disabled=true;});
  feed.textContent=outcome===null?'쉬어가도 괜찮아요.':correct?'정원을 정확하게 살폈어요!':'어려웠던 문제는 잠시 두고 다음 길로 가요.';
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
  const b=e.target.closest('button[data-slow]');if(!b||b.disabled)return;const a=b.dataset.slow;
  if(a==='cell'){const key=b.dataset.key;if(selected.has(key))selected.delete(key);else selected.add(key);b.classList.toggle('picked',selected.has(key));b.setAttribute('aria-pressed',String(selected.has(key)));if(id==='slowPlace'||id==='slowBlock')b.textContent=selected.has(key)?id==='slowBlock'?'🧱':'🌼':'';return;}
  if(a==='check')return check();
  if(a==='skip')return finish(null,'쉬어감/미응답');
  if(a==='next'){b.disabled=true;nextRound(0);return;}
  if(a==='hide'){s.memoryHidden=round;render(id,d);return;}
  if(a==='show'){s.hint=true;s.memoryHidden=-1;render(id,d);return;}
  if(a==='ready'){s.nameReady=true;render(id,d);return;}
  if(a==='retryName'){s.nameReady=true;render(id,d);return;}
  if(a==='name-right')return nameScore(true,'교사 관찰: 정확한 명명');
  if(a==='name-wrong')return nameScore(false,'교사 관찰: 다른 이름으로 명명');
  if(a==='word')return nameScore(Number(b.dataset.word)===itemIndex,'글자 보기 선택');
  if(a==='hint'){s.hint=true;feed.textContent='한 칸씩 비교한 뒤 대답해요. 필요하면 쉬었다가 다시 해요.';return;}
 });
}
window.SlowLookNative={IDS,isNew,rounds,setUp,render,addSummary,names,icons};
})();

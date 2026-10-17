/* StrategyGarden: three distinct Moa thinking-garden adventures.
   Educational activities, not a diagnostic measure. Observations are in-memory only unless exported. */
(()=>{
'use strict';
const IDS=['resetRescue','classroomMove','festivalPlan'];
const TITLES={resetRescue:'꼬인 신호 구조대',classroomMove:'우리 교실 이사작전',festivalPlan:'축제 준비 대작전'};
const impl={};
const isNew=id=>IDS.includes(id);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function setup(id,config={}){
 const level=clamp(Number(config.level)||1,1,3);
 return {id,level,maxLevel:Math.min(3,level+1),currentLevel:level,cue:config.cue||'guide',adaptive:config.adaptive!==false,round:-1,r:null,records:[],correctStreak:0,recoveries:0};
}
function rounds(){return 5;}
function register(id,game){if(!isNew(id))throw Error('Unknown thinking game '+id);impl[id]=game;}
function csv(s){
 const rows=[['게임','문제','시작 단계','적용 단계','처음 정확','마지막 완료','오류 수','재확인 수','비고'],...s.records.map(r=>[TITLES[s.id],r.round,s.level,r.level,r.first,r.final,r.errors,r.support,r.note])];
 const data='\uFEFF'+rows.map(x=>x.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const u=URL.createObjectURL(new Blob([data],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
 a.href=u;a.download='생각정원_수업관찰_'+s.id+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),900);
}
function summary(s,parent){
 parent.querySelector('.strategy-results')?.remove();
 const first=s.records.filter(r=>r.first==='O').length,final=s.records.filter(r=>r.final==='O').length;
 const el=document.createElement('div');el.className='strategy-results';
 el.innerHTML='<p class="strategy-result">첫 반응 정확 '+first+'/'+s.records.length+' · 마지막 완수 '+final+'/'+s.records.length+' · 전략 도움·재확인 '+s.recoveries+'회</p><details class="strategy-teacher"><summary>교사용 관찰 · CSV 기록</summary><div class="strategy-observations"></div><button type="button" class="strategy-export">CSV 다운로드</button><small>선택하지 않으면 기록은 서버에 저장되지 않습니다. 진단점수가 아닙니다.</small></details>';
 el.querySelector('.strategy-observations').textContent=s.records.map(r=>r.round+'번 첫 '+r.first+' / 최종 '+r.final+' / 오반응 '+r.errors+' / 확인 '+r.support+' · '+r.note).join('　');
 el.querySelector('.strategy-export').addEventListener('click',()=>csv(s));
 parent.appendChild(el);
}
function render(id,ctx){
 const {state,area,missionText,missionSub,guide,addSeeds,sfx,nextRound}=ctx;
 const s=state.strategy;if(!s||!isNew(id))return;
 if(!impl[id])throw Error('Thinking game not registered: '+id);
 if(s.round!==state.round){
  s.round=state.round;s.r={level:s.currentLevel,phase:'start',errors:0,support:0,first:null,done:false,note:'',message:''};
  impl[id].begin(s,s.r,state.round);
 }
 const r=s.r,game=impl[id];
 missionText.textContent=TITLES[id];
 missionSub.textContent=s.cue==='guide'?'천천히 보고, 생각하고, 확인해요.':s.cue==='wait'?'준비될 때까지 기다려도 좋아요.':'스스로 확인한 다음 진행해요.';
 guide.src=id==='resetRescue'?'assets/friend-hong.png':id==='classroomMove'?'assets/friend-saem.png':'assets/friend-ru.png';
 const levelName=['','쉬움','보통','확장'][r.level];
 area.innerHTML='<section class="strategy-quest" data-game="'+id+'"><div class="strategy-caption"><span>🌱 '+levelName+'</span><span>시간 제한 없음</span></div><div class="strategy-content"></div><div class="strategy-feedback" role="status" aria-live="polite"></div><div class="strategy-actions"><button type="button" data-core="rest">어려워요 · 쉬어가기</button></div><details class="strategy-teacher"><summary>선생님 참고 · 지원과 기록</summary><p>틀린 답을 곧바로 알려주기보다 현재 목표를 다시 확인할 기회를 제공합니다. 연속 오류가 있으면 자동조절 설정에 따라 다음 문제의 부담을 낮춥니다.</p></details></section>';
 const root=area.querySelector('.strategy-quest'),body=root.querySelector('.strategy-content'),feedback=root.querySelector('.strategy-feedback');
 const actions=root.querySelector('.strategy-actions');
 feedback.textContent=r.message||'';
 function rerender(){render(id,ctx);}
 function assist(message='잠깐 멈추어 지금 필요한 정보를 다시 살펴봐요.'){
  r.support++;s.recoveries++;r.message=message;rerender();
 }
 function fail(message='이번 선택을 다시 확인해 볼까요?'){
  if(r.first===null)r.first=false;
  r.errors++;r.phase='reset';r.message=message;rerender();
 }
 function complete(correct,note='활동 완료'){
  if(r.done)return;
  if(r.first===null)r.first=correct===true;
  r.done=true;r.note=note;
  s.records.push({round:state.round+1,level:r.level,first:r.first?'O':'X',final:correct===null?'-':correct?'O':'X',errors:r.errors,support:r.support,note});
  if(correct===true){addSeeds(r.errors?7:10);sfx('ok');}else if(correct===false)sfx('tap');
  if(r.first&&correct===true){s.correctStreak++;if(s.adaptive&&s.correctStreak>=2&&s.currentLevel<s.maxLevel){s.currentLevel++;s.correctStreak=0;}}
  else s.correctStreak=0;
  if(s.adaptive&&r.errors>=2&&s.currentLevel>1){s.currentLevel--;s.correctStreak=0;}
  r.message=correct===null?'쉬어가도 괜찮아요.':correct?'이번 활동도 완성했어요!':'잠깐 쉬고 다시 시도할 수 있어요.';
  rerender();
 }
 if(r.done){
  body.innerHTML='<div class="strategy-done"><span>🌼</span><h3>이번 이야기 마침!</h3><p>'+r.message+'</p></div>';
  actions.innerHTML='<button type="button" data-core="next" class="strategy-primary">'+(state.round+1===state.roundTotal?'활동 결과 보기 →':'다음 이야기로 →')+'</button>';
 }else{
  game.view({s,r,round:state.round,body,feedback,rerender,assist,fail,complete,ctx});
 }
 actions.addEventListener('click',e=>{
  const b=e.target.closest('button[data-core]');if(!b||b.disabled)return;
  if(b.dataset.core==='rest')complete(null,'아동이 쉬어가기 선택');
  if(b.dataset.core==='next'){b.disabled=true;nextRound(0);}
 });
}
window.StrategyGarden={IDS,TITLES,isNew,setup,rounds,register,render,summary};
})();
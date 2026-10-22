/* Moa Number Forest: observable learning-process rules, not clinical diagnosis or proof of mastery.
 * No accounts, identifying information, external telemetry, paywalls, or speech synthesis.
 * Pure engine: can be tested independently of the browser.
 */
(function(root){
'use strict';
const PHASES=Object.freeze(['explore','model','independent','transfer','review']);
const PHASE_LABELS=Object.freeze({
 explore:'먼저 만나보기',model:'함께 살펴보기',independent:'혼자 해결하기',
 transfer:'다른 모양에서도',review:'한 번 더 확인하기'
});
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
function createSession(stageId){
 return {stageId,rounds:[],phase:PHASES[0],sinceLastGuide:0};
}
function phaseFor(round){return PHASES[clamp(Number(round)||0,0,PHASES.length-1)]}
function classifyRound({phase,attempts=0,hints=0,model=false,completed=true,representation='original'}={}){
 const p=PHASES.includes(phase)?phase:'explore';
 const errors=Math.max(0,Math.floor(Number(attempts)||0));
 const supports=Math.max(0,Math.floor(Number(hints)||0))+(model?1:0);
 const independentlySolved=!!completed&&errors===0&&supports===0&&(p==='independent'||p==='transfer'||p==='review');
 return {
  phase:p,representation:String(representation),
  completed:!!completed, errors, supported:supports>0,
  independentlySolved, transferCandidate:independentlySolved&&p==='transfer'
 };
}
function summarize(rounds=[]){
 const a=(Array.isArray(rounds)?rounds:[]).filter(Boolean);
 const attempts=a.length,independent=a.filter(r=>r.independentlySolved).length;
 const transfer=a.filter(r=>r.transferCandidate).length;
 const supported=a.filter(r=>r.supported).length;
 const errors=a.reduce((n,r)=>n+(Number(r.errors)||0),0);
 const review=a.some(r=>r.phase==='review'&&r.independentlySolved);
 const ready=attempts>=5&&independent>=2&&transfer>=1&&review;
 // Provisional practice indicator: NOT validated ability, generalization, or clinical improvement.
 return {attempts,independent,transfer,supported,errors,review,ready,
   note:ready?'이 놀이의 확인 문제를 도움 없이 풀었어요. 다른 날 다시 확인해야 해요.':'도움받은 문제와 스스로 푼 문제를 구분했어요. 더 연습해도 좋아요.'};
}
function nextTier(profile={}){
 // A stage begins with 1-3 objects, not V2 legacy "clean" counts, and expands only after
 // repeated verified sessions containing independent and variant attempts.
 const verified=clamp(Math.floor(Number(profile.verifiedSessions)||0),0,99);
 return verified>=3?9:verified>=1?5:3;
}
function combine(profile={},rounds=[]){
 const sum=summarize(rounds);
 const completed=clamp(Number(profile.completedSessions)||0,0,10000);
 const verified=clamp(Number(profile.verifiedSessions)||0,0,10000);
 return {
  completedSessions:completed+1,verifiedSessions:verified+(sum.ready?1:0),
  independentTotal:clamp(Number(profile.independentTotal)||0,0,100000)+sum.independent,
  supportedTotal:clamp(Number(profile.supportedTotal)||0,0,100000)+sum.supported,
  transferAttempts:clamp(Number(profile.transferAttempts)||0,0,100000)+sum.transfer,
  lastStatus:sum.ready?'practice-check-passed':'needs-more-practice',
  lastSummary:sum
 };
}
root.NumberForestLearning=Object.freeze({
 PHASES,PHASE_LABELS,createSession,phaseFor,classifyRound,summarize,nextTier,combine
});
})(typeof window!=='undefined'?window:globalThis);

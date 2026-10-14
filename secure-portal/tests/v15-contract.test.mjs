import test from 'node:test';
import assert from 'node:assert/strict';
import {ENTRY_KEYS,SESSION_KEYS,ORIGIN_CHOICES,validateEntry,validateSessionEntry,sharedSelection,drivePolicyEnabled} from '../lib/record-contract.mjs';

test('every v15 student/caregiver field is recognized and parent words survive',()=>{
 const e=validateEntry({date:'2026-10-13',observation:'책을 다시 보았다',origin:'그 밖의 사람에게 들음',childWords:'아이가 직접 한 말',body:'기분',sketch:'[[[1,2],[3,4]]]',experienceImpact:'작은 변화'});
 assert.equal(e.childWords,'아이가 직접 한 말');assert.equal(e.origin,ORIGIN_CHOICES.at(-1));assert.equal(e.experienceImpact,'작은 변화');
 assert(ENTRY_KEYS.includes('childWords'));
});
test('invalid date, time, source, signals and drawing are rejected',()=>{
 for(const entry of [
  {date:'2026-02-30',note:'hello'},{time:'24:22',note:'hello'}, {origin:'진단 확정',note:'hello'},
  {signals:'여러 번 한 행동 / 여러 번 한 행동',observation:'관찰'},
  {sketch:'[[[999,3]]]',note:'hi'}
 ])assert.throws(()=>validateEntry(entry));
});
test('unknown fields and prototype pollution fields never enter persisted records',()=>{
 const e=validateEntry({note:'good',diagnosis:'OCD',__proto__:{evil:true},guardianSecret:'secret'});
 assert.deepEqual(Object.keys(e),['note']);assert.equal(e.evil,undefined);
});
test('parent shared observation includes disclosed day, clock, location, but not child quotes by default',()=>{
 const record=validateEntry({date:'2026-10-13',time:'09:50',place:'home',observation:'looked at notebook',origin:'직접 관찰',childWords:'help me',context:'private preceding scene'});
 const out=sharedSelection(record,['observation'],true);
 assert.equal(out.observation,'looked at notebook');assert.equal(out.date,'2026-10-13');
 assert.equal(out.time,'09:50');assert.equal(out.place,'home');assert(!('childWords' in out));assert(!('origin' in out));assert(!('context' in out));
});
test('sharing only parent actual quote never silently attaches date/time/observation',()=>{
 const record=validateEntry({date:'2026-10-13',time:'09:50',observation:'private factual note',origin:'직접 관찰',childWords:'I am tired'});
 const out=sharedSelection(record,['childWords'],true);
 assert.deepEqual(out,{childWords:'I am tired'});
});
test('student quick chosen note does not expose detailed fields',()=>{
 const e=validateEntry({date:'2026-10-13',note:'hello',experience:'keep private',thought:'hidden'});
 assert.deepEqual(sharedSelection(e,['note'],false),{note:'hello'});
 assert.throws(()=>sharedSelection(e,['title'],false));assert.throws(()=>sharedSelection(e,['notExistingField'],false));
});
test('all clinician v15 columns survive independent source assignment',()=>{
 const raw=Object.fromEntries(SESSION_KEYS.map(k=>[k,'가상 기록']));
 raw.erpReview='적합성 평가가 필요함';raw.cbitReview='이번 회기에 해당 없음';raw.burdenReview='부담 또는 반복 확인이 보고됨';
 const valid=validateSessionEntry(raw);assert.equal(Object.keys(valid).length,SESSION_KEYS.length);
 assert.equal(valid.workingHypothesis,'가상 기록');assert.equal(valid.studentReport,'가상 기록');assert.equal(valid.parentReport,'가상 기록');
});
test('malicious or mistaken automatic therapy judgments rejected by select controls',()=>{
 assert.throws(()=>validateSessionEntry({erpReview:'강박 치료 필수'}));
 assert.throws(()=>validateSessionEntry({cbitReview:'틱 진단 확정'}));
 assert.throws(()=>validateSessionEntry({burdenReview:'위험 100%'}));
 assert.throws(()=>validateSessionEntry({workingHypothesis:{diagnosis:'certain'}}));
});
test('stored free text has limits; no free-text conclusions auto-generated',()=>{
 const entry=validateSessionEntry({workingHypothesis:'x'.repeat(5000)});
 assert.equal(entry.workingHypothesis.length,1000);assert.equal(Object.keys(entry).length,1);
 assert.throws(()=>validateSessionEntry({}));
});
test('no Google Drive transmission without explicit server opt-in',()=>{
 assert.equal(drivePolicyEnabled(undefined),false);
 assert.equal(drivePolicyEnabled('TRUE'),false);
 assert.equal(drivePolicyEnabled('false'),false);
 assert.equal(drivePolicyEnabled('true'),true);
});

test('optional ABC data for ordinary daily events persists without claiming causality',()=>{
 const entry=validateEntry({date:'2026-10-14',note:'오늘 재미있었다',abcBefore:'점심을 먹었음',abcBehavior:'친구가 같이 놀자고 함',abcAfter:'같이 걸어감'});
 assert.equal(entry.abcBefore,'점심을 먹었음');
 assert.equal(entry.abcBehavior,'친구가 같이 놀자고 함');
 assert.equal(entry.abcAfter,'같이 걸어감');
 assert.equal('diagnosis' in entry,false);
 const shared=sharedSelection(entry,['note'],false);
 assert.deepEqual(shared,{note:'오늘 재미있었다'});
 assert.equal(shared.abcBefore,undefined);
});
test('user explicitly choosing ABC items may share only selected ABC fields',()=>{
 const entry=validateEntry({abcBefore:'전',abcBehavior:'중',abcAfter:'후',note:'비공개'});
 assert.deepEqual(sharedSelection(entry,['abcBefore','abcAfter'],false),{abcBefore:'전',abcAfter:'후'});
 assert.throws(()=>validateEntry({abcBehavior:{prediction:'certain'}}));
 assert.equal(validateEntry({abcBefore:'x'.repeat(800)}).abcBefore.length,500);
});
test('caregiver context and after fields remain distinct alongside direct observation',()=>{
 const record=validateEntry({observation:'책을 읽었음',context:'외출 전',after:'산책',origin:'직접 관찰'});
 assert.deepEqual(sharedSelection(record,['observation','after'],true),{observation:'책을 읽었음',after:'산책'});
});

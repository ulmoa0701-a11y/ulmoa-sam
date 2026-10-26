// Creates one synthetic anonymous QA entry, no screenshot or personal data.
// The repository operator must delete this test row after the CI run.
import assert from "node:assert/strict";
const API="https://miohovwmhmtcvkurjamm.supabase.co/functions/v1/moa-game-feedback";
const request={
 gameId:"memory",gameName:"[QA] 자동 제보 검증",kind:"bug",
 screenName:"QA 모의 화면",round:"",version:"qa-live-20261027",
 description:"Synthetic automatic test only. No personal information.",
 viewportWidth:390,viewportHeight:844,imageReviewed:false
};
const r=await fetch(API,{method:"POST",headers:{Origin:"https://ulmoa0701-a11y.github.io","Content-Type":"application/json"},body:JSON.stringify(request)});
const response=await r.json();
assert.equal(r.status,201,"Expected a successful private feedback insert: "+JSON.stringify(response));
assert.equal(response.ok,true);
assert.ok(typeof response.receipt==="string");
assert.equal(response.hasScreenshot,false);
console.log("LIVE_PRIVATE_INSERT_OK receipt="+response.receipt+" (synthetic record; must be removed)");

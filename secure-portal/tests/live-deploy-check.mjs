#!/usr/bin/env node
// Non-destructive PRE-RELEASE infrastructure smoke test. No private data, passkeys or tokens.
const base=String(process.argv[2]||process.env.ILDAN_SECURE_URL||'').replace(/\/$/,'');
if(!/^https:\/\/[^/]+$/.test(base)){
 console.error('FAIL: Provide the actual HTTPS secure portal URL. Example: node tests/live-deploy-check.mjs https://example.netlify.app');
 process.exit(2);
}
const checks=[];
const run=async(name,fn)=>{
 try{const ok=await fn();checks.push({name,pass:ok===true});console.log((ok===true?'PASS':'FAIL')+' '+name);}
 catch(e){checks.push({name,pass:false});console.log('FAIL '+name+' ('+String(e.message).slice(0,130)+')');}
};
const get=(path,options={})=>fetch(base+path,{redirect:'manual',signal:AbortSignal.timeout(11000),headers:{'cache-control':'no-cache',...options.headers},...options});
await run('HTTPS landing page is reachable, without SSO redirect',async()=>{
 const r=await get('/');return r.status===200&&r.headers.get('content-type')?.includes('text/html');
});
await run('Backend health endpoint is deployed and does not return 404',async()=>{
 const r=await get('/api/health');if(!r.ok)return false;
 const json=await r.json();return json.ready===true;
});
await run('Unauthenticated visitor cannot read user session',async()=>{
 const r=await get('/api/me');return r.status===401||r.status===403;
});
await run('Unauthenticated visitor cannot read student records',async()=>{
 const r=await get('/api/records');return r.status===401||r.status===403;
});
await run('Unauthenticated visitor cannot read clinical notes',async()=>{
 const r=await get('/api/session-notes');return r.status===401||r.status===403;
});
await run('Unauthenticated visitor cannot create health/school record',async()=>{
 const r=await get('/api/records',{method:'POST',headers:{'content-type':'application/json',origin:base},body:JSON.stringify({entry:{note:'synthetic access probe'}})});
 return r.status===401||r.status===403;
});
const passed=checks.filter(x=>x.pass).length;
console.log('Infrastructure smoke '+passed+'/'+checks.length+'; real credentials, consent, role isolation, encrypted database and backups require further independent tests.');
if(passed!==checks.length)process.exitCode=1;

import assert from 'node:assert/strict';
const endpoint='https://habom-unified-private-staging.netlify.app/api/posts';
const controller=new AbortController();
const timeout=setTimeout(()=>controller.abort(),14000);
try {
 const res=await fetch(endpoint,{method:'GET',redirect:'manual',cache:'no-store',signal:controller.signal});
 console.log('Netlify isolated staging unauthenticated HTTP status:',res.status);
 assert.notEqual(res.status,200,'Unsafe: unauthenticated visitors can access posts on private staging');
 assert.ok([301,302,303,307,308,401,403].includes(res.status),
   'Unexpected unauthenticated status '+res.status+'; verify Netlify site password/SSO before allowing private content');
 console.log('PASS STAGING SSO: request to /api/posts rejected or redirected without credentials');
} finally {clearTimeout(timeout)}

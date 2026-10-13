/* Temporary Netlify build environment discovery. Never print actual secret values. */
import {writeFile} from 'node:fs/promises';
const identity='f9c910bc-97fe-482e-8b84-dc2ba8584907';
const branch='feature/habom-unified-secure-20261012';
const yes=x=>x?'yes':'no';
const context= ['production','deploy-preview','branch-deploy'].includes(process.env.CONTEXT)?
 process.env.CONTEXT:'other';
const bits=[
 'netlify-'+yes(process.env.NETLIFY==='true'),
 'site-'+yes(process.env.SITE_ID===identity),
 'branch-'+yes(process.env.BRANCH===branch),
 'context-'+context,
 'dburl-'+yes(!!process.env.NETLIFY_DB_URL),
 'secretkeys-'+yes(!!process.env.HABOM_ADMIN_KEY&&!!process.env.HABOM_RATE_SALT)
];
const name='habom-buildenv-'+bits.join('-')+'.html';
await writeFile('site/'+name,'<!doctype html><html lang="ko"><head><title>Temporary CI environment presence only</title></head><body><p>No secrets recorded. Temporary diagnostic; not a successful data-write check.</p></body></html>');
console.log('HABOM BUILD ENV CHECK: '+bits.join(' '));

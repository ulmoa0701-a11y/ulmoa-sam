/* Hosting entrypoint for a separate, isolated Netlify Free staging site.
 * Requires Netlify Database migrations and a private Blob store.
 * DO NOT publish before privacy and live end-to-end verification.
 */
import {getDatabase} from '@netlify/database';
import {getStore,getDeployStore} from '@netlify/blobs';
import worker from '../../src/worker.js';
import {createNetlifyEnv} from '../adapter.mjs';

export const config={
 path:'/api/*',
 method:['GET','POST']
};
export default async function handler(req,context){
 try{
  const adminKey=Netlify.env.get('HABOM_ADMIN_KEY');
  const rateSalt=Netlify.env.get('HABOM_RATE_SALT');
  const live=context.deploy?.published===true;
  // Never let preview uploads write to the production file store.
  const files=live?getStore({name:'habom-private-files',consistency:'strong'})
    :getDeployStore({name:'habom-private-files',consistency:'strong'});
  const env=createNetlifyEnv({database:getDatabase(),files,adminKey,rateSalt});
  return worker.fetch(req,env);
 }catch(e){
  console.error('habom staging backend unavailable',e instanceof Error?e.message:'unknown');
  return new Response(JSON.stringify({error:'현재 쪽지를 받을 수 없습니다.'}),{
   status:503,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}
  });
 }
}

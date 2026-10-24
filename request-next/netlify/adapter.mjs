/* Adapter between Netlify Database/Blobs and the verified Cloudflare-style API core.
 * This file must never appear in the static publish directory.
 * The SQL text comes exclusively from first-party server code. Only '?' placeholders
 * are replaced with bound $1..$N parameters. No raw user input is interpolated.
 */
export function createNetlifyEnv({database,files,adminKey,rateSalt}){
  if(!database?.sql?.unsafe)throw Error('Netlify database unavailable');
  if(!files?.get||!files?.set||!files?.delete)throw Error('Private blob store unavailable');
  if(!adminKey||adminKey.length<32||!rateSalt||rateSalt.length<32)throw Error('Required secrets not configured');
  const DB={
    prepare(sql){
      if(typeof sql!=='string'||!sql.trim())throw Error('Invalid SQL');
      let params=[];
      return {
        bind(...args){params=args;return this;},
        async first(){
          const rows=await database.sql.unsafe(convert(sql,params.length),params);
          return rows[0]??null;
        },
        async all(){
          const rows=await database.sql.unsafe(convert(sql,params.length),params);
          return {results:rows};
        },
        async run(){
          await database.sql.unsafe(convert(sql,params.length),params);
          return {success:true};
        },
      };
    }
  };
  const FILES={
    async put(key,stream){await files.set(key,await new Response(stream).blob());},
    async get(key){
      const blob=await files.get(key,{type:'blob',consistency:'strong'});
      return blob?{body:blob.stream()}:null;
    },
    async delete(key){await files.delete(key);}
  };
  return {DB,FILES,ADMIN_KEY:adminKey,RATE_SALT:rateSalt,
    ASSETS:{fetch(){return new Response('Not found',{status:404});}}};
}
function convert(query,count){
  let index=0;
  const transformed=query.replace(/\?/g,()=>'$'+(++index));
  if(index!==count)throw Error('Query parameter count mismatch');
  return transformed;
}

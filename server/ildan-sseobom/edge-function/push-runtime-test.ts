// Test the same missing typed-array APIs found on hosted Supabase Edge Runtime.
const ctor=Uint8Array as any;
const proto=Uint8Array.prototype as any;
Deno.test("webpush works when native typed-array Base64 methods are absent",async()=>{
 const originalFrom=Object.getOwnPropertyDescriptor(ctor,"fromBase64");
 const originalTo=Object.getOwnPropertyDescriptor(proto,"toBase64");
 try{
  Reflect.deleteProperty(ctor,"fromBase64");
  Reflect.deleteProperty(proto,"toBase64");
  await import("./push-service.ts");
  const lib=await import("jsr:@daaku/webpush@0.2.0");
  const test=Uint8Array.of(251,255,255,0,1);
  const encoded=(test as any).toBase64({alphabet:"base64url",omitPadding:true});
  if(encoded!=="-___AAE")throw Error("base64url encoding mismatch");
  if(String(ctor.fromBase64(encoded,{alphabet:"base64url"}))!==String(test))throw Error("base64url decoding mismatch");
  const vapid=await lib.generateVapidKey();
  const key=await lib.vapidPublicKey(vapid);
  if(!/^[A-Za-z0-9_-]{87}$/.test(key))throw Error("VAPID public key mismatch");
  const client=await crypto.subtle.generateKey({name:"ECDH",namedCurve:"P-256"},true,["deriveBits"]);
  const pub=new Uint8Array(await crypto.subtle.exportKey("raw",client.publicKey));
  const encode=(x:Uint8Array)=>(x as any).toBase64({alphabet:"base64url",omitPadding:true});
  const subscription={endpoint:"https://fcm.googleapis.com/fcm/send/synthetic-runtime-test",keys:{p256dh:encode(pub),auth:encode(crypto.getRandomValues(new Uint8Array(16)))}};
  // Encrypt and authenticate locally; never contact a push provider or any device.
  const result=await lib.encrypt(subscription,"synthetic test",{vapid,subscriber:"https://ulmoa.co.kr",ttl:60,urgency:"normal"});
  if(!(result.body instanceof Uint8Array)||!result.body.length)throw Error("encrypted payload missing");
 }finally{
  if(originalFrom)Object.defineProperty(ctor,"fromBase64",originalFrom);else Reflect.deleteProperty(ctor,"fromBase64");
  if(originalTo)Object.defineProperty(proto,"toBase64",originalTo);else Reflect.deleteProperty(proto,"toBase64");
 }
});


/* HOTEL GARDEN CHILD FEEDBACK V2 — isolated playable enhancements, 2026-10-19.
   Kept in the Babylon bundle's scene closure to use the existing meshes/stages. */
const __hgDefeated=new Set(),__hgFlowers=new Map();
const __hgOriginalDm=Dm,__hgOriginalXp=xp,__hgOriginalZm=zm,__hgOriginalPour=__uPourWater;
let __hgSprinting=false,__hgCollecting=null,__hgCollectSince=0,__hgPouring=false,__hgPourUntil=0;
const __hgTravel={oldX:Rp.position.x,oldZ:Rp.position.z,phase:0},__hgEyeTravel={x:Up.position.x,z:Up.position.z,phase:0};
const __hgFlowerHint=document.createElement("div");
__hgFlowerHint.id="hgFlowerHint";
__hgFlowerHint.style.cssText="display:none;pointer-events:none;z-index:23;position:fixed;bottom:148px;left:50%;transform:translateX(-50%);width:min(300px,80vw);border-radius:15px;padding:9px 12px;background:#163a2feF;color:#fff;text-align:center;font:900 16px Arial,sans-serif;box-shadow:0 5px 16px #0007";
document.body.appendChild(__hgFlowerHint);
const __hgSprintButton=document.createElement("button");
__hgSprintButton.id="hgSprint";__hgSprintButton.textContent="달리기";
__hgSprintButton.setAttribute("aria-label","달리기 버튼 길게 누르기");
__hgSprintButton.style.cssText="position:fixed;z-index:25;left:12px;bottom:142px;min-width:84px;min-height:42px;border-radius:14px;border:2px solid #274a37;background:#fff3c3;color:#173525;font:900 15px Arial;touch-action:none;display:none";
document.body.appendChild(__hgSprintButton);
const __hgSetSprint=on=>{__hgSprinting=on&&qp&&!Jp;__hgSprintButton.style.background=__hgSprinting?"#f2c44d":"#fff3c3"};
for(const ev of ["pointerdown","pointerup","pointercancel","pointerleave"])
 __hgSprintButton.addEventListener(ev,e=>{e.preventDefault();__hgSetSprint(ev==="pointerdown")});
const __hgBucketHud=document.createElement("div");
__hgBucketHud.id="hgBucketArt";
__hgBucketHud.style.cssText="position:fixed;top:172px;left:12px;z-index:22;display:none;padding:5px 9px;border-radius:12px;background:#f6fcff;border:2px solid #37617a;color:#204a67;font:900 13px Arial;box-shadow:0 3px 10px #0003;pointer-events:none";
__hgBucketHud.innerHTML='<svg width="38" height="43" viewBox="0 0 44 48" aria-hidden="true" style="vertical-align:middle"><path d="M11 13 V9 C11 0 33 0 33 9 V13" fill="none" stroke="#596f7e" stroke-width="4"/><path d="M7 14 L37 14 L33 42 Q22 48 11 42 Z" fill="#5cb8eb" stroke="#265779" stroke-width="3"/><path d="M9 16 Q22 23 35 16" fill="none" stroke="#e7f8ff" stroke-width="4"/><path d="M14 26 L14 38" stroke="#ccf0ff" stroke-width="4" stroke-linecap="round"/></svg> 물양동이';
document.body.appendChild(__hgBucketHud);
let __hgBucketMesh=new fc("hgCarryBucket",Yf);
__hgBucketMesh.parent=Rp;__hgBucketMesh.position.set(-.75,1.28,.1);
__uCyl("hgBucketBody",__hgBucketMesh,new R(0,0,0),new R(.48,.56,.48),new H(.23,.54,.78));
__uCyl("hgBucketRim",__hgBucketMesh,new R(0,.28,0),new R(.56,.06,.56),new H(.78,.9,.93));
__uCyl("hgBucketWater",__hgBucketMesh,new R(0,.30,0),new R(.42,.02,.42),new H(.27,.85,1));
const __hgBucketHandle=Df.CreateTorus("hgBucketHandle",{diameter:.67,thickness:.055,tessellation:18},Yf);
__hgBucketHandle.parent=__hgBucketMesh;__hgBucketHandle.rotation.x=Math.PI/2;__hgBucketHandle.position.y=.29;
__hgBucketHandle.material=up("hgBucketMetalMat",new H(.56,.63,.68));
__hgBucketMesh.setEnabled(false);
function __hgBucketSync(){__hgBucketHud.style.display=__uHasBucket?"block":"none";__hgBucketMesh.setEnabled(__uHasBucket||__hgPouring)}
function __hgClosestFlower(){
 let best=null,dist=Infinity;
 for(const [boss,node] of __hgFlowers){if(!node||node.isDisposed())continue;const d=R.Distance(Rp.position,node.position);if(d<dist){best={boss,node,d};dist=d}}
 return best;
}
function __hgCollectFlower(boss){
 const node=__hgFlowers.get(boss);if(!node||node.isDisposed())return false;
 if(R.Distance(Rp.position,node.position)>4.5)return false;
 __hgFlowers.delete(boss);node.dispose(false,true);
 __uLotusCount=Math.min(3,__uLotusCount+1);__uSyncHud();
 __uXp0("FLOWER_COLLECTED",{boss:boss,lotusCount:__uLotusCount});
 km("연꽃을 주웠어요! "+__uLotusCount+"/3",2400);
 __hgCollecting=null;__hgFlowerHint.style.display="none";return true;
}
function __hgStartCollect(){
 if(!qp||Jp)return false;
 const c=__hgClosestFlower();if(!c||c.d>4.5)return false;
 if(__hgCollecting!==c.boss){__hgCollecting=c.boss;__hgCollectSince=performance.now()}
 return true;
}
function __hgCancelCollect(){__hgCollecting=null;__hgFlowerHint.style.display="none"}
function __hgFlowerUi(){
 const slash=document.querySelector('[data-action="slash"]');
 if(slash){if(Kp===4)slash.classList.remove("hidden");else slash.classList.add("hidden")}
 const c=__hgClosestFlower(),near=!!c&&c.d<=4.5;
 let button=document.querySelector('[data-action="talk"]');
 if(button){
   const talking=Kp===0||Kp===3||Kp===5;
   button.classList.toggle("hidden",!near&&!talking);
   button.innerHTML=near?"E<br><small>연꽃 줍기</small>":"E<br><small>말걸기</small>";
 }
 if(!near){__hgCancelCollect();return}
 const pct=__hgCollecting===c.boss?Math.min(100,Math.round((performance.now()-__hgCollectSince)/10)):0;
 __hgFlowerHint.style.display="block";
 __hgFlowerHint.textContent="연꽃 발견! E 꾹 누르기 "+(pct?pct+"%":"");
 if(pct>=100)__hgCollectFlower(c.boss);
}
document.addEventListener("keydown",e=>{if(e.code==="ShiftLeft"||e.code==="ShiftRight")__hgSetSprint(true)});
document.addEventListener("keyup",e=>{if(e.code==="ShiftLeft"||e.code==="ShiftRight")__hgSetSprint(false);if(e.code==="KeyE")__hgCancelCollect()});
document.addEventListener("visibilitychange",()=>{if(document.hidden){__hgSetSprint(false);__hgCancelCollect()}});
window.addEventListener("blur",()=>{__hgSetSprint(false);__hgCancelCollect()});
for(const b of document.querySelectorAll('[data-action="talk"]'))for(const ev of ["pointerup","pointercancel","pointerleave"])b.addEventListener(ev,__hgCancelCollect);
xp=function(event,payload={}){
 __hgOriginalXp(event,payload);
 if(event==="BOSS_DEFEATED"&&payload.boss&&!__hgDefeated.has(payload.boss)){
   const boss=payload.boss,node=boss==="woods"?Hp:boss==="eye"?Up:Wp;
   __hgDefeated.add(boss);
   node.setEnabled(false);
   const flower=Yf.getTransformNodeByName("rewardLotus"+boss);
   if(flower)__hgFlowers.set(boss,flower);
   km(boss.toUpperCase()+" 공략 성공! 보스를 물리쳤어요. 연꽃은 E 꾹 눌러 주워요.",3700);
   __uSyncHud();
 }
};
Dm=function(stage){
 __hgOriginalDm(stage);
 for(const boss of __hgDefeated){const node=boss==="woods"?Hp:boss==="eye"?Up:Wp;node.setEnabled(false)}
 __hgBucketSync();__hgFlowerUi();
 const f=document.querySelector('[data-action="slash"]');if(f)f.classList.toggle("hidden",stage!==4);
};
zm=function(action){
 if(action==="slash"&&Kp!==4)return;
 if(action==="talk"&&__hgStartCollect())return;
 if(__hgPouring&&action==="trap")return;
 return __hgOriginalZm(action);
};
const __hgV2LegNames=["playerLeg-1","playerLeg1","eyeLegL","eyeLegR"];
function __hgExtraBossDetail(){
 // Preserve each child's source silhouette: white bark / green vines / eye-lotus / candle-smoke.
 const bark=new H(.87,.86,.75),twig=new H(.72,.7,.58),vine=new H(.06,.33,.12),leaf=new H(.12,.49,.18);
 for(let i=0;i<7;i++){
   const y=1.35+i*.49,x=(i%2?-.15:.17),z=-.55-(i%3)*.015;
   const strip=__uBox("hgWoodsBark"+i,Hp,new R(x,y,z),new R(.10,.37,.075),i%2?bark:twig);
   strip.rotation.z=(i%2?-.23:.17);
 }
 for(let i=0;i<4;i++){const y=2+i*.81;
   vp("hgWoodsCreeper"+i,y,.65+(.15*(i%2)),.72,1.6,vine,Hp,i*.8);
   __uSphere("hgWoodsBud"+i,Hp,new R(1.2*Math.sin(i),y+.15,-.8),new R(.34,.18,.14),leaf);
 }
 for(let i=0;i<5;i++){const x=(i-2)*.28;
   __uSphere("hgWoodsHeadLobe"+i,Hp,new R(.95+x,5.51+Math.sin(i)*.16,-.55),new R(.56,.35,.3),bark);
 }
 for(let i=0;i<5;i++){const x=(i-2)*.16;
   __uBox("hgEyeBark"+i,Up,new R(x,1.3+i*.58,-.56),new R(.09,.32,.08),twig);
 }
 for(let i=0;i<3;i++)vp("hgEyeVine"+i,1.3+i*1.1,1.01,.69,1.35,vine,Up,i*.8);
 for(let i=0;i<4;i++){const x=(i%2?1:-1)*(.8+i*.1);
   __uSphere("hgEyeThorn"+i,Up,new R(x,2.35+i*.27,-.22),new R(.19,.30,.18),leaf);
 }
 for(let i=0;i<6;i++){const y=1.2+i*.56;
   __uBox("hgSmogBark"+i,Wp,new R(Math.sin(i)*.28,y,-.68),new R(.10,.36,.08),bark);
   if(i<4)vp("hgSmogWrappedVine"+i,y,.78,1.02,1.5,vine,Wp,i*.7);
 }
 __uSphere("hgSmogFlameCore",Wp,new R(0,4.97,.02),new R(.19,.54,.22),new H(1,.79,.17));
 for(let i=0;i<3;i++)__uSphere("hgSmogSmokePuff"+i,Wp,new R((i-1)*.30,6.2+i*.55,.1),new R(.65+i*.12,.44+i*.09,.55+i*.10),new H(.16,.19,.18)).material.alpha=.65;
}
__hgExtraBossDetail();
const __hgWalkNodes=[Rp,zp,Bp,Vp].map(node=>({
 node,
 torso:Yf.getMeshByName(node.name+"Torso"),
 leftArm:Yf.getMeshByName(node.name+"Arm-1"),
 rightArm:Yf.getMeshByName(node.name+"Arm1"),
 leftLeg:Yf.getMeshByName(node.name+"Leg-1"),
 rightLeg:Yf.getMeshByName(node.name+"Leg1"),
}));
const __hgEyeParts={leftLeg:Yf.getMeshByName("eyeLegL"),rightLeg:Yf.getMeshByName("eyeLegR"),leftArm:Yf.getMeshByName("eyeArmL"),rightArm:Yf.getMeshByName("eyeArmR"),body:Yf.getMeshByName("eyeBody")};
function __hgAnimate(){
 const moving=Gp.up||Gp.down||Gp.left||Gp.right;
 const now=performance.now(),t=now/1000;
 __hgSprintButton.style.display=innerWidth<=700?"block":"none";
 const p=__hgWalkNodes[0],amp=moving?(__hgSprinting?.78:.5):0;
 __hgTravel.phase+=moving?Math.min(.075,Jf.getDeltaTime()/1000)*(__hgSprinting?13:8):0;
 const swing=Math.sin(__hgTravel.phase)*amp;
 if(p.leftLeg)p.leftLeg.rotation.x=swing;
 if(p.rightLeg)p.rightLeg.rotation.x=-swing;
 if(p.leftArm)p.leftArm.rotation.x=-swing*.85;
 if(p.rightArm)p.rightArm.rotation.x=swing*.85;
 if(p.torso){p.torso.rotation.x=moving?(__hgSprinting?.17:.07):0;p.torso.position.y=1.42+(moving?Math.abs(Math.sin(__hgTravel.phase))*.065:Math.sin(t*2)*.01)}
 for(const char of __hgWalkNodes.slice(1)){if(char.torso)char.torso.scaling.y=1+.012*Math.sin(t*1.45+char.node.position.x)}
 if(Kp===4&&Up.isEnabled()){
   const delta=Math.hypot(Up.position.x-__hgEyeTravel.x,Up.position.z-__hgEyeTravel.z);
   __hgEyeTravel.x=Up.position.x;__hgEyeTravel.z=Up.position.z;
   __hgEyeTravel.phase+=delta*3.9;
   const chase=im==="chase"||im==="cooldown",step=chase?Math.min(.55,delta*.8)*Math.sin(__hgEyeTravel.phase):0;
   if(__hgEyeParts.leftLeg)__hgEyeParts.leftLeg.rotation.x=step;
   if(__hgEyeParts.rightLeg)__hgEyeParts.rightLeg.rotation.x=-step;
   if(__hgEyeParts.leftArm)__hgEyeParts.leftArm.rotation.x=-step*.8+(im==="windup"?.55:0);
   if(__hgEyeParts.rightArm)__hgEyeParts.rightArm.rotation.x=step*.8+(im==="windup"?.55:0);
   if(__hgEyeParts.body)__hgEyeParts.body.rotation.z=.045*Math.sin(t*4)+(im==="windup"?.11:0);
 }
 for(const [node,names,speed] of [
   [Hp,["woodsVine1","woodsVine2","hgWoodsCreeper0","hgWoodsCreeper1"],1.5],
   [Up,["eyeVineTorso","eyeVineArmR","hgEyeVine0"],2.8],
   [Wp,["smogVine1","smogVine2","hgSmogWrappedVine0"],1.2]
 ])if(node.isEnabled())for(const [i,name] of names.entries()){const mesh=Yf.getMeshByName(name);if(mesh)mesh.rotation.z=.10*Math.sin(t*speed+i*.9)}
 if(Wp.isEnabled()){const candle=Yf.getMeshByName("flame");if(candle)candle.scaling.y=1+.15*Math.sin(t*8)}
 __hgBucketSync();
 __hgFlowerUi();
}
Yf.onBeforeRenderObservable.add(__hgAnimate);
function __hgPourAnimation(){
 if(Kp!==6||!__uHasBucket||__hgPouring||dm!=="water"||jm(Wp)>7)return false;
 __hgPouring=true;__hgPourUntil=performance.now()+1150;
 __hgBucketMesh.setEnabled(true);
 const splashes=[];
 for(let i=0;i<14;i++){
   const drop=__uSphere("hgWaterDrop"+i,null,Rp.position.add(new R(-.6,1.4,0)),new R(.10,.16,.1),new H(.24,.75,.99));
   drop.isPickable=false;splashes.push(drop);
 }
 const start=performance.now();
 let ob=Yf.onBeforeRenderObservable.add(()=>{
   const q=Math.min(1,(performance.now()-start)/1150);
   __hgBucketMesh.rotation.z=-Math.sin(q*Math.PI)*1.2;
   for(let i=0;i<splashes.length;i++){const a=Math.max(0,Math.min(1,q*1.5-i*.035)),src=Rp.position.add(new R(-.75,1.8,0)),dst=Wp.position.add(new R(0,2.6,0));
     splashes[i].position=R.Lerp(src,dst,a).add(new R(0,Math.sin(a*Math.PI)*1.1,Math.sin(i*1.9)*.30));splashes[i].scaling.setAll(a>0&&a<1?.16:.001)
   }
   if(q>=1){Yf.onBeforeRenderObservable.remove(ob);__hgBucketMesh.rotation.z=0;
     for(const p of splashes)p.dispose();
     __hgOriginalPour();__hgPouring=false;__hgBucketSync();
   }
 });
 __uXp0("BUCKET_POUR_STARTED",{boss:"smog"});
 return true;
}
__uPourWater=function(){return __hgPourAnimation()};
window.__ulmoaGardenV2={
 state:()=>({sprinting:__hgSprinting,stage:Kp,flowers:[...__hgFlowers.keys()],collected:__uLotusCount,bucket:__uHasBucket,pouring:__hgPouring,bosses:[...__hgDefeated],eyeSlashVisible:!document.querySelector('[data-action="slash"]')?.classList.contains("hidden")}),
 holdPickup:async(boss)=>{const node=__hgFlowers.get(boss);if(!node)return false;Rp.position.copyFrom(node.position.add(new R(-1.3,0,0)));__hgStartCollect();await new Promise(r=>setTimeout(r,1250));return !__hgFlowers.has(boss)},
 runSmoke:async()=>{
   const sleep=ms=>new Promise(r=>setTimeout(r,ms)),out={};
   try{
     qp=true;Jp=false;
     out.geometry=["hgWoodsBark0","hgEyeVine0","hgSmogWrappedVine0","hgBucketBody"].every(n=>!!Yf.getMeshByName(n));
     Dm(2);Hp.setEnabled(true);__uDamage.woods=0;
     xp("BOSS_ATTACKED",{boss:"woods"});xp("BOSS_ATTACKED",{boss:"woods"});xp("BOSS_ATTACKED",{boss:"woods"});
     await sleep(45);out.restartDialog=__uRestartPending&&ap.classList.contains("show");
     if(out.restartDialog){sp.click();await sleep(40)}
     out.restart=Kp===2&&!__uRestartPending;
     xp("BOSS_HIT",{boss:"woods",hits:1});xp("BOSS_DEFEATED",{boss:"woods"});await sleep(40);
     out.woodsHidden=!Hp.isEnabled();out.woodsDropped=__hgFlowers.has("woods")&&__uLotusCount===0;
     out.woodsPicked=await window.__ulmoaGardenV2.holdPickup("woods");
     Dm(4);Up.setEnabled(true);
     out.slashInEye=!document.querySelector('[data-action="slash"]').classList.contains("hidden");
     xp("BOSS_DEFEATED",{boss:"eye"});await sleep(40);
     out.eyeHidden=!Up.isEnabled();out.eyePicked=await window.__ulmoaGardenV2.holdPickup("eye");
     Dm(5);Rp.position.copyFrom(Vp.position.add(new R(-1,0,0)));em=0;Nm();await sleep(40);
     out.bucket=__uHasBucket&&!!Yf.getMeshByName("hgBucketBody");
     if(ap.classList.contains("show"))sp.click();
     Dm(6);dm="water";pm=3;Rp.position.copyFrom(Wp.position.add(new R(-2,0,0)));
     __uPourWater();await sleep(1600);
     out.pour=Kp===7&&!__hgPouring&&!__uHasBucket;
     out.smogHidden=!Wp.isEnabled();out.smogPicked=await window.__ulmoaGardenV2.holdPickup("smog");
     Dm(7);
     out.slashHidden=!document.querySelector('[data-action="slash"]').classList.contains("hidden");
     out.threeLotus=__uLotusCount===3;
     out.stage7=Kp===7;
     out.pass=Object.values(out).every(Boolean);
   }catch(e){out.error=String(e);out.pass=false}
   return out;
 }
};
__hgBucketSync();


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
 previewBoss:(boss)=>{
   const stage={woods:2,eye:4,smog:6}[boss],node={woods:Hp,eye:Up,smog:Wp}[boss];
   if(!stage||__hgDefeated.has(boss))return false;
   qp=true;Jp=false;Dm(stage);node.setEnabled(true);
   Rp.position.copyFrom(node.position.add(new R(-6,0,-6)));ap.classList.remove("show");
   return true;
 },
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
     out.slashHidden=document.querySelector('[data-action="slash"]').classList.contains("hidden");
     out.threeLotus=__uLotusCount===3;
     out.stage7=Kp===7;
     out.pass=Object.values(out).every(Boolean);
   }catch(e){out.error=String(e);out.pass=false}
   return out;
 }
};
__hgBucketSync();

/* v3: boss silhouette, animation and reward wayfinding.
   Extra meshes are lightweight and keep the child-defined boss identities. */
const __hgV3Meshes={woods:[],eye:[],smog:[]};
function __hgV3Tube(name,boss,points,color=.12,radius=.055) {
 const mesh=Df.CreateTube(name,{path:points.map(p=>new R(p[0],p[1],p[2])),radius,tessellation:7,cap:2},Yf);
 mesh.parent=boss;mesh.material=__uMat(name+"Material",new H(.06,.25+color*.4,.09));
 mesh.isPickable=false;return mesh;
}
function __hgV3Leaves(name,boss,positions,shade) {
 for(const [i,p] of positions.entries()){
  const m=__uSphere(name+i,boss,new R(...p),new R(.19,.36,.10),shade);
  m.rotation.z=(i%2?-.45:.65);m.isPickable=false;
 }
}
function __hgV3Shape() {
 // Narrow the duplicated circular pipe-like wraps from the previous build.
 for(const name of ["hgWoodsCreeper0","hgWoodsCreeper1","hgWoodsCreeper2","hgWoodsCreeper3",
                    "hgEyeVine0","hgEyeVine1","hgEyeVine2",
                    "hgSmogWrappedVine0","hgSmogWrappedVine1","hgSmogWrappedVine2","hgSmogWrappedVine3"]) {
  const mesh=Yf.getMeshByName(name);if(mesh)mesh.setEnabled(false);
 }
 const pale=new H(.85,.83,.73),ivory=new H(.96,.93,.83),green=new H(.12,.40,.15);
 // WOODS has NO eyes. Its wide, irregular mushroom canopy and a bent branch are the silhouette.
 const crown=Yf.getMeshByName("woodsCap");
 if(crown){crown.scaling.x*=1.14;crown.scaling.z*=1.1}
 for(const [i,pos] of [[-1.1,5.52,-.2],[-.3,5.67,-.48],[1.45,5.44,-.3],[2.08,5.37,-.04]].entries()){
  let m=__uSphere("hgWoodsIvoryCanopy"+i,Hp,new R(...pos),new R(.52,.30,.36),i%2?pale:ivory);
  m.rotation.z=(i-1)*.13;
 }
 const branch=__uCyl("hgWoodsAttackBranch",Hp,new R(-1.8,3.02,-.12),new R(.36,2.2,.38),pale);
 branch.rotation.z=-1.0;
 const woodVines=[
  [[-.15,1.1,-.58],[.02,1.8,-.64],[.50,2.65,-.62],[.2,3.4,-.54],[-.15,4.2,-.43]],
  [[.65,1.35,-.33],[1.05,2.2,-.54],[1.44,3.0,-.47],[.96,3.85,-.28],[1.38,4.7,-.36]],
  [[-1.35,2.6,-.58],[-1.72,3.05,-.54],[-2.20,3.44,-.29],[-2.78,3.24,.04]],
 ];
 woodVines.forEach((v,i)=>__hgV3Meshes.woods.push(__hgV3Tube("hgV3WoodsVine"+i,Hp,v,.22,.068)));
 __hgV3Leaves("hgV3WoodsLeaf",Hp,[[-.08,3.95,-.59],[.6,2.7,-.77],[1.2,3.85,-.37],[-1.96,3.25,-.54],[1.4,4.64,-.44]],green);
 // EYE: the multiple eyes should read as eyes (pale sclera, green iris, black pupil)
 // on the BODY, not as a decorative row of small blobs.
 for(const [i,[x,y,z,scale]] of [[0,3.20,-1.12,.45],[-.52,2.56,-1.17,.36],[.55,2.30,-1.15,.39],[-.42,1.77,-1.1,.31],[.35,1.42,-1.12,.31]].entries()){
  __uSphere("hgV3EyeWhite"+i,Up,new R(x,y,z),new R(scale*1.40,scale,scale*.34),ivory);
  __uSphere("hgV3EyeIris"+i,Up,new R(x,y,z-scale*.30),new R(scale*.48,scale*.50,scale*.14),new H(.16,.47,.28));
  __uSphere("hgV3EyePupil"+i,Up,new R(x,y,z-scale*.44),new R(scale*.22,scale*.25,scale*.09),new H(.025,.035,.035));
 }
 for(const [i,points] of [
  [[-.3,.9,-.57],[-.8,1.8,-.65],[-.94,2.8,-.48],[-.5,3.65,-.4]],
  [[.85,1.0,-.6],[1.38,1.78,-.52],[1.60,2.61,-.35],[1.25,3.27,-.42]],
 ].entries()) __hgV3Meshes.eye.push(__hgV3Tube("hgV3EyeVine"+i,Up,points,.2,.06));
 __hgV3Leaves("hgV3EyeLeaves",Up,[[-1.08,2.20,-.62],[1.65,2.42,-.44],[-.6,3.62,-.46]],green);
 const eyePetal=Yf.getMeshByName("lotus0");if(eyePetal)eyePetal.scaling.multiplyInPlace(new R(1.1,1.15,1));
 // SMOG: make flame and smoke unmistakable rather than an opaque pile of spheres.
 for(const mesh of Wp.getChildMeshes()){
  if(mesh.name.startsWith("smoke")||mesh.name.startsWith("hgSmogSmokePuff")){
   mesh.material.alpha=Math.min(mesh.material.alpha,.30);
   if(mesh.name.startsWith("hgSmogSmokePuff"))__hgV3Meshes.smog.push(mesh);
  }
 }
 const flame=Yf.getMeshByName("flame");
 if(flame){flame.scaling.y*=1.22;flame.material.emissiveColor=new H(.85,.43,.05)}
 for(const [i,points] of [
  [[-.5,.8,-.68],[-.9,1.7,-.78],[-1.16,2.6,-.52],[-.85,3.46,-.52],[-.35,4.15,-.24]],
  [[.68,1.12,-.73],[1.07,1.78,-.73],[1.33,2.55,-.45],[.82,3.4,-.54]],
 ].entries()) __hgV3Meshes.smog.push(__hgV3Tube("hgV3SmogVine"+i,Wp,points,.25,.068));
 __hgV3Leaves("hgV3SmogLeaves",Wp,[[-1.07,2.31,-.70],[.98,2.95,-.57],[-.42,3.79,-.50]],green);
}
__hgV3Shape();
const __hgRewardNav=document.createElement("div");
__hgRewardNav.id="hgRewardNav";
__hgRewardNav.style.cssText="display:none;position:fixed;top:155px;left:50%;transform:translateX(-50%);padding:7px 11px;border-radius:12px;border:2px solid #f6ca73;background:#203c30eb;color:#fff;font:900 14px Arial,sans-serif;z-index:20;pointer-events:none;white-space:nowrap";
document.body.appendChild(__hgRewardNav);
const __hgV3OrigAnimate=__hgAnimate;
function __hgV3Animate(){
 const seconds=performance.now()/1000;
 if(Hp.isEnabled()){
  const attacking=Kp===2&&(_m==="windup"||_m==="vulnerable");
  const branch=Yf.getMeshByName("hgWoodsAttackBranch");
  if(branch)branch.rotation.z=-1+(attacking?-.36*Math.sin(seconds*6):.07*Math.sin(seconds*1.8));
  const crown=Yf.getMeshByName("woodsCap");
  if(crown)crown.rotation.z=.035*Math.sin(seconds*1.7);
 }
 if(Up.isEnabled()&&Kp===4){
  const charging=im==="windup"||im==="vulnerable",r=Yf.getMeshByName("eyeArmR");
  if(r)r.rotation.z=.22+(charging?.58*Math.sin(seconds*9):.10*Math.sin(seconds*4));
  const l=Yf.getMeshByName("eyeArmL");if(l)l.rotation.z=-.35-(charging?.55*Math.sin(seconds*9):.10*Math.sin(seconds*4));
 }
 if(Wp.isEnabled()){
  __hgV3Meshes.smog.forEach((m,i)=>{if(!m||m.isDisposed()||!m.name.startsWith("hgSmogSmokePuff"))return;
   m.position.x=(i-1)*.3+.24*Math.sin(seconds*.6+i);
   m.position.y=6.0+i*.48+.23*Math.sin(seconds*.9+i);
   m.scaling.y=.55+i*.12+.09*Math.sin(seconds*1.2+i);
  });
 }
 const flower=__hgClosestFlower();
 if(flower&&!__hgFlowers.get(flower.boss)?.isDisposed()){
  const d=Math.round(flower.d);
  __hgRewardNav.style.display="block";
  __hgRewardNav.textContent=d<=4?"연꽃 가까이! E를 1초 누르기":"🌸 연꽃 보상 "+d+"m · 가까이 가서 E 누르기";
 }else __hgRewardNav.style.display="none";
}
Yf.onBeforeRenderObservable.add(__hgV3Animate);
const __hgV3OldSmoke=window.__ulmoaGardenV2.runSmoke;
window.__ulmoaGardenV2.runSmoke=async()=>{
 const out=await __hgV3OldSmoke();
 out.v3Models=["hgWoodsAttackBranch","hgV3WoodsVine0","hgV3EyeWhite0","hgV3EyePupil0","hgV3SmogVine0"].every(n=>!!Yf.getMeshByName(n));
 out.v3RewardUi=!!document.getElementById("hgRewardNav");
 out.pass=out.pass&&out.v3Models&&out.v3RewardUi;
 return out;
};

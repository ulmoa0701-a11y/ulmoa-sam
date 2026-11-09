
/* HOTEL GARDEN V5 — real collisions, close-range WOODS, footwear,
   animated sickle, post-clear soil, right-side walkable manor and silhouette.
   Add after V4 + underground DLC, before the initial Dm(0) invocation. */
const __hg6OriginalKm=Km,__hg6OriginalGm=Gm,__hg6OriginalEnterManor=__hg5EnterManor;
const __hg6Feet=new H(.12,.15,.20),__hg6Soles=new H(.05,.06,.08),__hg6Laces=new H(.91,.85,.59);
for(const side of [-1,1]){
 const px=side*.22;
 __uBox("hg6PlayerShoe"+side,Rp,new R(px,.12,.24),new R(.39,.24,.74),__hg6Feet);
 __uBox("hg6PlayerSole"+side,Rp,new R(px,.045,.28),new R(.43,.09,.81),__hg6Soles);
 __uBox("hg6PlayerShoeToe"+side,Rp,new R(px,.135,.56),new R(.40,.19,.26),__hg6Feet);
 for(let t=0;t<3;t++)__uBox("hg6Shoelace"+side+"_"+t,Rp,new R(px,.254,.20+t*.11),new R(.28,.022,.035),__hg6Laces);
}
// The dirt patch is completely absent until Kp==7 and all three lotus are held.
__hg5Soil.root.setEnabled(false);
__hg5Soil.hole.setEnabled(false);
// Move the whole intact manor to the RIGHT of the eastbound avenue.
__hg5Manor.position.z=7;
__hg5DoorPos.z=.1;
__hg5Fountain.position.set(7,-60,-22);
for(let i=0;i<8;i++){
 const angle=i*Math.PI/4;
 for(const kind of ["Trunk","Canopy"]){
  const mesh=Yf.getMeshByName("hg5ManorGardenTree"+kind+i);
  if(mesh){mesh.position.x=17+Math.cos(angle)*16;mesh.position.z=7+Math.sin(angle)*19}
 }
}
__hg5Block("hg6MansionRightTurnDriveway",__hg5Under,new R(17,-59.92,-7.6),new R(6,.10,13),new H(.72,.69,.61));
for(const x of [13.82,20.18])__hg5Block("hg6MansionDrivewayEdge"+x,__hg5Under,new R(x,-59.83,-7.6),new R(.16,.12,13),__hg5Color.gold);
// Remove the decorative fake staircase and the solid floor over its head.
for(const id of ["hg5CurvedGrandStairs","hg5MansionUpperFloor"]){
 const old=Yf.getMeshByName(id);if(old)old.setEnabled(false);
}
__hg5MBox("hg6UpperFloorLeft",-6.88,8.18,1,8.25,.3,14,__hg5Color.ivory);
__hg5MBox("hg6UpperFloorRight",6.88,8.18,1,8.25,.3,14,__hg5Color.ivory);
__hg5MBox("hg6UpperLandingFront",0,8.18,-4.89,5.5,.3,2.22,__hg5Color.ivory);
__hg5MBox("hg6UpperLandingRear",0,8.18,7.54,5.5,.3,.92,__hg5Color.ivory);
const __hg6StairStartZ=-3,__hg6StairStepZ=.445,__hg6StairRise=(8.33-1.155)/23;
for(let i=0;i<23;i++){
 const z=__hg6StairStartZ+i*__hg6StairStepZ,top=1.155+(i+1)*__hg6StairRise;
 __hg5MBox("hg6WalkableMarbleStep"+i,0,top/2,z,4.10,top,.465,__hg5Color.ivory);
 __hg5MBox("hg6GoldenStairNosing"+i,0,top+.026,z-.22,4.03,.05,.08,__hg5Color.gold);
 if(i%2===0)for(const side of [-1,1]){
  const x=side*2.32;
  __hg5Cylinder("hg6GrandBanister"+side+"_"+i,__hg5Manor,new R(x,top+.51,z),new R(.13,1.02,.13),__hg5Color.ivory);
  __hg5Ball("hg6GrandBanisterTop"+side+"_"+i,__hg5Manor,new R(x,top+1.03,z),new R(.17,.17,.17),__hg5Color.gold);
 }
}
__hg5MBox("hg6GrandStairTopLanding",0,8.36,7.34,5.35,.18,1.0,__hg5Color.ivory);
// Fill unfinished upper facade, and add detailed roof line, dormers and ornaments.
__hg5MBox("hg6UpperFrontLeft",-6.65,10.65,-6.15,8.52,4.85,.65,__hg5MansionWall);
__hg5MBox("hg6UpperFrontRight",6.65,10.65,-6.15,8.52,4.85,.65,__hg5MansionWall);
__hg5MBox("hg6UpperFrontCentral",0,11.72,-6.15,4.85,2.65,.65,__hg5MansionWall);
for(const x of [-8,-4,0,4,8]){
 __hg5MBox("hg6DormerWall"+x,x,16.10,-5.52,2.12,2.15,1.54,__hg5MansionWall);
 __hg5MBox("hg6DormerWindow"+x,x,16.12,-6.35,1.43,1.39,.12,__hg5Color.windows);
 __hg5MBox("hg6DormerRoof"+x,x,17.40,-5.52,2.73,.49,1.83,__hg5Color.roof);
 __hg5MBox("hg6DormerMullion"+x,x,16.12,-6.48,.12,1.35,.1,__hg5Color.gold);
}
for(const x of [-9,-5,5,9]){
 __hg5MBox("hg6SecondFloorWindowTrim"+x,x,10.1,-6.89,2.42,3.17,.19,__hg5Color.ivory);
 __hg5MBox("hg6SecondFloorWindowCross"+x,x,10.1,-7.03,.13,3.1,.13,__hg5Color.gold);
}
__hg5MBox("hg6EntrancePediment",0,7.72,-8.34,11.9,.42,4.45,__hg5Color.ivory);
__hg5MBox("hg6PedimentGoldLine",0,8.01,-8.38,11.1,.18,4.65,__hg5Color.gold);
for(const x of [-4,-2,0,2,4])__hg5Ball("hg6GoldRosette"+x,__hg5Manor,new R(x,7.53,-10.66),new R(.22,.22,.15),__hg5Color.gold);
__hg5EnterManor=function(){
 const entered=__hg6OriginalEnterManor();
 if(entered){Rp.position.set(17,-58.82,1.90);__hg5Mission("🏰 대저택 · 로비와 실제로 올라갈 수 있는 대리석 계단을 살펴보세요")}
 return entered;
};
// Solid 2-D footprints for the outdoor world. Camera collision is not a
// substitute for character collision in Babylon's free-position controller.
const __hg6Trees=[
 [-11,-8,.95],[-9,6,1.08],[-2,8,.92],[5,9,1.04],[11,6,.9],[13,3,.88],[-1,-9,.88],
 [-30,-24,.88],[-29,18,.95],[-20,29,1.05],[0,30,.92],[18,28,1],[33,13,.93],[34,-28,1.05],[5,-31,.92],[-31,-5,.98]
];
const __hg6Lamps=[[-2,-6],[6,1],[8,-7]];
function __hg6Rect(x,z,cx,cz,hx,hz){return Math.abs(x-cx)<hx+.36&&Math.abs(z-cz)<hz+.36}
function __hg6GardenBlocked(x,z){
 if(__hg6Rect(x,z,-5,-4,3.70,2.63))return true; // original house / 360-degree racks
 if(Math.hypot(x-4,z+3)<3.45)return true; // pond water and stones
 for(const t of __hg6Trees)if(Math.hypot(x-t[0],z-t[1])<.33+t[2]*.38)return true;
 for(const p of __hg6Lamps)if(Math.hypot(x-p[0],z-p[1])<.52)return true;
 return false;
}
function __hg6UnderBlocked(x,z){
 const lx=x-17,lz=z-7,inside=__hg5Phase==="mansion";
 for(let i=0;i<7;i++)if(Math.hypot(x-(-22+i*7.4),z+18)<.48)return true;
 if(Math.hypot(x-7,z+22)<2.3)return true; // fountain basin
 for(const t of __hg6Trees){} // garden obstacles are not duplicated underground
 // Mansion's raised foundation and closed doors cannot be walked through.
 if(!inside){
  if(Math.abs(lx)<11.75&&lz>-7.65&&lz<8.4)return true;
 }else{
  if((Math.abs(lx)>2.08&&Math.abs(lx)<11.35&&lz>-6.87&&lz<-5.65)
     ||(Math.abs(lx)>10.25&&Math.abs(lx)<11.35&&lz>-6.6&&lz<8.35)
     ||(Math.abs(lx)<11.35&&lz>7.3&&lz<8.45))return true;
  // Banister: don't fall off the side of a flight while halfway upstairs.
  if(lz>-3.05&&lz<6.75&&Math.abs(lx)>2.1&&Math.abs(lx)<2.75&&Rp.position.y>-58.38&&Rp.position.y<-52.2)return true;
 }
 for(const side of [-1,1]){
  if(Math.abs(lx-side*13.5)<3.04&&Math.abs(lz-.8)<6.34)return true;
 }
 return false;
}
function __hg6MansionFoot(x,z,oldY){
 const lx=x-17,lz=z-7;
 const isUpstairs=oldY>-55.0;
 if(Math.abs(lx)<2.2&&lz>__hg6StairStartZ-.26&&lz<7.28){
  const step=Math.max(0,Math.min(22,Math.floor((lz-__hg6StairStartZ+.23)/__hg6StairStepZ)));
  return -60+1.155+(step+1)*__hg6StairRise;
 }
 if(isUpstairs)return -60+8.35;
 return -60+1.155;
}
Km=function(dt){
 const before=Rp.position.clone();
 __hg6OriginalKm(dt);
 if(__hg5Transition)return;
 const under=__hg5Phase==="underground"||__hg5Phase==="mansion";
 const blocked=under?__hg6UnderBlocked:__hg6GardenBlocked;
 if(blocked(Rp.position.x,Rp.position.z)){
  const nx=Rp.position.x,nz=Rp.position.z;
  if(!blocked(nx,before.z))Rp.position.z=before.z;
  else if(!blocked(before.x,nz))Rp.position.x=before.x;
  else {Rp.position.x=before.x;Rp.position.z=before.z}
 }
 if(under){
  const base=__hg5Phase==="mansion"?__hg6MansionFoot(Rp.position.x,Rp.position.z,before.y):-60;
  const jump=nm?Math.max(0,Math.sin(Math.min(1,tm/.72)*Math.PI)*1.15):0;
  Rp.position.y=base+jump;
 }
};
// Far away from WOODS: no invisible hits, alerts, or pursuit damage.
Gm=function(dt){
 if(Kp!==2)return;
 const dist=Math.hypot(Rp.position.x-Hp.position.x,Rp.position.z-Hp.position.z);
 if(dist>8.2){
  if(_m==="windup"){_m="cooldown";vm=performance.now()+850;Hp.scaling.set(1,1,1);ep.textContent="③ WOODS 공격 범위 밖 · 가까이 가서 다시 도전"}
  else if(_m==="vulnerable"&&performance.now()>=vm){_m="cooldown";vm=performance.now()+800}
  return;
 }
 return __hg6OriginalGm(dt);
};
// A higher-quality wooden/steel sickle, animated together with the player's right arm.
const __hg6BladeSilver=__uMat("hg6SteelEdge",new H(.86,.93,.96));
__hg6BladeSilver.specularColor=new H(.96,.98,1);
const __hg6SickleDark=__uMat("hg6SickleFerrule",new H(.18,.22,.25));
const __hg6SickleTrailMat=__uMat("hg6SickleTrail",new H(.54,.92,1),.58);
__hg6SickleTrailMat.emissiveColor=new H(.12,.38,.49);
__hg6SickleTrailMat.backFaceCulling=false;
__uCyl("hg6SickleSteelFerrule",__hg4Sickle,new R(0,.61,0),new R(.21,.30,.20),new H(.28,.31,.32));
for(let i=0;i<5;i++)__uCyl("hg6SickleGripBinding"+i,__hg4Sickle,new R(0,-.15+i*.14,0),new R(.14,.055,.14),new H(.22,.15,.09));
const __hg6BladePath=[];
for(let i=0;i<=24;i++){const a=-.5+i/24*Math.PI*1.2;__hg6BladePath.push(new R(.38+Math.cos(a)*.57,.5+Math.sin(a)*.50,.02))}
const __hg6SickleSteel=Df.CreateTube("hg6SickleBrightSteelEdge",{path:__hg6BladePath,radius:.074,tessellation:10},Yf);
__hg6SickleSteel.parent=__hg4Sickle;__hg6SickleSteel.material=__hg6BladeSilver;
const __hg6SickleRidge=Df.CreateTube("hg6SickleBackRidge",{path:__hg6BladePath.map(v=>new R(v.x-.075,v.y-.035,-.12)),radius:.052,tessellation:9},Yf);
__hg6SickleRidge.parent=__hg4Sickle;__hg6SickleRidge.material=__hg6SickleDark;
const __hg6SickleTrail=Df.CreateTube("hg6SickleSlashAir",{path:Array.from({length:19},(_,i)=>{const a=-.88+i/18*Math.PI*.95;return new R(Math.cos(a)*1.13,.52+Math.sin(a)*.91,.08)}),radius:.085,tessellation:8},Yf);
__hg6SickleTrail.parent=Rp;__hg6SickleTrail.material=__hg6SickleTrailMat;__hg6SickleTrail.setEnabled(false);
const __hg6RightArm=Yf.getMeshByName("playerArm1");
const __hg6DefaultArmRotation=__hg6RightArm?.rotation.z||0;
const __hg6OriginalZm=zm;
zm=function(action){
 if(action==="slash"&&Kp===4&&__hg4HasSickle&&qp&&!Jp)__hg4SwingUntil=performance.now()+520;
 return __hg6OriginalZm(action);
};
Yf.onBeforeRenderObservable.add(()=>{
 // Note: the old V4 weapon render callback may run first; this more detailed animation wins.
 if(__hg5Phase==="locked")__hg5Soil.root.setEnabled(false);
 else if(__hg5Phase==="meet"||__hg5Phase==="dig")__hg5Soil.root.setEnabled(true);
 const enabled=Kp===4&&__hg4HasSickle&&qp&&!Jp&&!__hg5Underground();
 const progress=enabled?Math.max(0,Math.min(1,(__hg4SwingUntil-performance.now())/520)):0;
 const swinging=progress>0;
 if(enabled){
  __hg4Sickle.rotation.z=swinging?-1.10*Math.sin((1-progress)*Math.PI):-.15;
  __hg4Sickle.rotation.x=swinging?-.48*Math.sin((1-progress)*Math.PI):0;
  __hg4Sickle.rotation.y=swinging?-.72*Math.sin((1-progress)*Math.PI):0;
 }else __hg4Sickle.rotation.set(0,0,0);
 if(__hg6RightArm)__hg6RightArm.rotation.z=enabled&&swinging?__hg6DefaultArmRotation-1.10*Math.sin((1-progress)*Math.PI):__hg6DefaultArmRotation;
 __hg6SickleTrail.setEnabled(enabled&&swinging&&progress<.86&&progress>.18);
});
// Draw the player silhouette only if a solid object physically occludes the camera ray.
const __hg6Silhouette=document.createElement("div");
__hg6Silhouette.id="hg6PlayerSilhouette";
__hg6Silhouette.setAttribute("aria-label","가려진 내 캐릭터 위치");
__hg6Silhouette.style.cssText="position:fixed;display:none;pointer-events:none;z-index:19;width:52px;height:93px;transform:translate(-50%,-65%);filter:drop-shadow(0 2px 4px #000a)";
__hg6Silhouette.innerHTML='<svg viewBox="0 0 52 93" xmlns="http://www.w3.org/2000/svg" width="52" height="93"><g fill="#1c3342" stroke="#ffdc69" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="26" cy="17" r="12"/><path d="M14 34Q26 29 38 34L42 62 32 67 31 86 25 86 23 67 19 86 12 86 14 60 9 47Z"/></g><text x="26" y="12" font-size="9" text-anchor="middle" font-weight="900" fill="white">나</text></svg>';
document.body.appendChild(__hg6Silhouette);
let __hg6NextOcclusionCheck=0;
function __hg6Occluder(m){
 const n=m?.name||"";
 return m?.isEnabled()&&/^(hotel$|hotelRoof$|tree\d+Trunk$|tree\d+Crown|farTree\d+Trunk$|farTree\d+Crown|lamp\d+$|hg5Mansion|hg5Manor|hg5Grand|hg6Upper|hg6Walkable|hg6Dormer|hg4House|hg4Roof|hg4MarketRack|hg4TallMarket)/.test(n);
}
Yf.onAfterRenderObservable.add(()=>{
 if(performance.now()<__hg6NextOcclusionCheck)return;
 __hg6NextOcclusionCheck=performance.now()+190;
 if(!qp||!Rp.isEnabled()||ap.classList.contains("show")){__hg6Silhouette.style.display="none";return}
 const rw=Jf.getRenderWidth(),rh=Jf.getRenderHeight();
 const vp=Xf.viewport.toGlobal(rw,rh);
 const pt=R.Project(new R(0,1.45,0),Rp.getWorldMatrix(),Yf.getTransformMatrix(),vp);
 if(!Number.isFinite(pt.x)||pt.z<=0||pt.z>=1||pt.x<2||pt.x>rw-2||pt.y<2||pt.y>rh-2){__hg6Silhouette.style.display="none";return}
 const canvas=Jf.getRenderingCanvas();
 const sx=pt.x/rw*canvas.clientWidth,sy=pt.y/rh*canvas.clientHeight;
 const picked=Yf.pick(sx,sy,__hg6Occluder,false,Xf);
 const occluded=!!picked?.hit&&!!picked.pickedPoint&&R.Distance(Xf.position,picked.pickedPoint)+.45<R.Distance(Xf.position,Rp.position.add(new R(0,1.45,0)));
 __hg6Silhouette.style.display=occluded?"block":"none";
 if(occluded){__hg6Silhouette.style.left=pt.x/rw*innerWidth+"px";__hg6Silhouette.style.top=pt.y/rh*innerHeight+"px"}
});
window.__ulmoaGardenFeedbackV5={
 state:()=>({shoes:[-1,1].every(i=>!!Yf.getMeshByName("hg6PlayerShoe"+i)),woodsDistance:+Math.hypot(Rp.position.x-Hp.position.x,Rp.position.z-Hp.position.z).toFixed(2),woodsDangerRadius:8.2,soilVisible:__hg5Soil.root.isEnabled(),manorLocation:[__hg5Manor.position.x,__hg5Manor.position.z],door:[__hg5DoorPos.x,__hg5DoorPos.z],stairCount:23,silhouetteVisible:__hg6Silhouette.style.display!=="none",stage:Kp,phase:__hg5Phase,player:[+Rp.position.x.toFixed(2),+Rp.position.y.toFixed(2),+Rp.position.z.toFixed(2)]}),
 probeCollision:(x,z,area)=>area==="underground"?__hg6UnderBlocked(x,z):__hg6GardenBlocked(x,z),
 version:"player-collision-manor-v5"
};

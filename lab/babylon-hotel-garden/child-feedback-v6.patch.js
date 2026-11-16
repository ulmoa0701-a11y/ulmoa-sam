
/* HOTEL GARDEN V6 — child feedback / 2026-11-16.
 * Keeps original seed-shop artwork, boss quests and DLC progression.
 */
const __hg6Ink=new H(.105,.12,.17),__hg6Sole=new H(.23,.25,.27),__hg6Metal=new H(.77,.86,.91),__hg6Gold=new H(.87,.67,.31);
// Clearly visible boots, with raised toe caps and soles (both feet of the actual player).
for(const side of [-1,1]){
 __uBox("hg6PlayerShoe"+side,Rp,new R(side*.225,.16,.18),new R(.34,.27,.61),__hg6Ink);
 __uBox("hg6PlayerSole"+side,Rp,new R(side*.225,.045,.24),new R(.36,.095,.67),__hg6Sole);
 __uBox("hg6PlayerToeCap"+side,Rp,new R(side*.225,.205,.46),new R(.33,.12,.18),new H(.26,.32,.38));
 __uBox("hg6PlayerLace"+side,Rp,new R(side*.225,.315,.28),new R(.23,.018,.14),new H(.85,.87,.83));
}
// Existing street lamp #0 intersects the original seed-shop wall at (-2,-6).
// Relocate the entire lamp including the light (no deletion of scenery).
const __hg6StreetLampPos={x:-12,z:-4};
for(const n of ["lamp0","lampGlow0"]){const m=Yf.getMeshByName(n);if(m){m.position.x=__hg6StreetLampPos.x;m.position.z=__hg6StreetLampPos.z}}
const __hg6LampLight=Yf.getLightByName("lampLight0");if(__hg6LampLight){__hg6LampLight.position.x=__hg6StreetLampPos.x;__hg6LampLight.position.z=__hg6StreetLampPos.z}
// The base house is solid, and nearby trees, lamp posts, and pond are obstacles.
// A light geometric movement guard avoids adding physics cost to every scene mesh.
function __hg6Rect(x,z,cx,cz,hx,hz,r=.30){return Math.abs(x-cx)<hx+r&&Math.abs(z-cz)<hz+r}
function __hg6Circle(x,z,cx,cz,r){return Math.hypot(x-cx,z-cz)<r}
function __hg6GardenBlocked(x,z){
 if(__hg6Rect(x,z,-5,-4,3.65,2.55,.26))return true;
 for(const [tx,tz,rad] of [[-11,-8,.90],[-9,6,1.01],[-2,8,.88],[5,9,.98],[11,6,.83],[13,3,.79],[-1,-9,.81]])if(__hg6Circle(x,z,tx,tz,rad+.40))return true;
 for(const [lx,lz] of [[-12,-4],[6,1],[8,-7]])if(__hg6Circle(x,z,lx,lz,.43))return true;
 return __hg6Circle(x,z,4,-3,3.05);
}
// The mansion is located on the right of the central avenue (positive screen-right
// for the game's isometric camera), with a dedicated paved access lane.
const __hg6ManorRightZ=12, __hg6ManorOffset=__hg6ManorRightZ-(-5);
__hg5Manor.position.z=__hg6ManorRightZ;
__hg5DoorPos.z+=__hg6ManorOffset;
__hg5Fountain.position.z+=__hg6ManorOffset;
__hg5Block("hg6MansionRightTurnWalk",__hg5Under,new R(17,-59.91,-.2),new R(5.2,.10,25),new H(.73,.69,.60));
for(const side of [-1,1])__hg5Block("hg6MansionRightTurnGoldEdging"+side,__hg5Under,new R(17+side*2.65,-59.86,-.2),new R(.15,.16,25),__hg5Color.gold);
// More recognizable mansion architecture: a triangular pediment, two ornate skylights,
// upper columns, doorway relief and low-cost relief details (no external meshes).
const __hg6MansionMat=new H(.97,.95,.86);
for(let i=0;i<7;i++){
 const x=(i-3)*1.3;
 __hg5MBox("hg6GrandPedimentStep"+i,x,14.55+(4-Math.abs(i-3))*.40,-8.30,1.36,.42,2.5,__hg6MansionMat);
}
for(const side of [-1,1]){
 __hg5MBox("hg6Dormer"+side,side*5,16,-7.5,2.5,2.4,1.6,__hg5Color.ivory);
 __hg5MBox("hg6DormerGlass"+side,side*5,16,-8.33,1.7,1.45,.13,__hg5Color.windows);
 __hg5MBox("hg6DormerRoof"+side,side*5,17.35,-7.5,3.1,.48,2.05,__hg5Color.roof);
 for(const dx of [-.37,.37])__hg5Cylinder("hg6DoorReliefPillar"+side+"_"+dx,__hg5Manor,new R(side*2.35+dx,2.86,-7.12),new R(.13,4.15,.13),__hg5Color.gold);
}
for(let k=0;k<6;k++){
 const angle=k*Math.PI/3;
 __hg5MBall("hg6MansionGoldCrest"+k,Math.cos(angle)*.85,18.15+Math.sin(angle)*.48,-8.22,.20,.20,.20,__hg5Color.gold);
}
__hg5MBox("hg6MansionDoorCrown",0,5.72,-7.24,4.75,.28,.43,__hg5Color.gold);
// Real walking steps outside and an interior stair flight, not a single tall solid cube.
const oldStairs=Yf.getMeshByName("hg5CurvedGrandStairs");if(oldStairs)oldStairs.setEnabled(false);
for(let i=0;i<7;i++){
 __hg5MBox("hg6LobbyStep"+i,0,1.08+i*.23,3.1+i*.43,5.6,.27,1.0,__hg5Color.ivory);
 __hg5MBox("hg6LobbyStepNosing"+i,0,1.22+i*.23,2.66+i*.43,5.7,.055,.10,__hg5Color.gold);
}
// The purple soil must not be visible before ALL bosses and all three lotuses.
__hg5Soil.root.setEnabled(__hg5Phase!=="locked");
const __hg6OriginalUnlock=__hg5SetUnlocked;
__hg5SetUnlocked=function(){
 const before=__hg5Phase;
 __hg6OriginalUnlock();
 if(before==="locked"&&__hg5Phase==="meet")__hg5Soil.root.setEnabled(true);
};
// Prevent walking through mansion walls. Exterior stairs remain walkable and
// the scripted door interaction is still used to enter the building.
function __hg6MansionBlocked(x,z){
 const localX=x-__hg5Manor.position.x,localZ=z-__hg5Manor.position.z;
 if(__hg5Phase==="mansion"){
  return Math.abs(localX)>10.25||localZ>7.32||localZ<-5.86;
 }
 if(__hg5Phase==="underground"){
  // Public courtyard and steps are passable; the physical house starts at the front wall.
  if(Math.abs(localX)<17.35&&localZ>-6.68&&localZ<7.9)return true;
  if(Math.abs(localX-13.5)<2.9&&localZ>-5.45&&localZ<7.0)return true;
  if(Math.abs(localX+13.5)<2.9&&localZ>-5.45&&localZ<7.0)return true;
 }
 return false;
}
const __hg6PriorMovement=Km;
Km=function(dt){
 const old=Rp.position.clone();
 __hg6PriorMovement(dt);
 if(__hg5Transition)return;
 const below=__hg5Phase==="underground"||__hg5Phase==="mansion";
 const blocked=below?__hg6MansionBlocked(Rp.position.x,Rp.position.z):__hg6GardenBlocked(Rp.position.x,Rp.position.z);
 if(blocked){
  // Resolve per axis so the avatar slides alongside the wall instead of freezing.
  const allowX=!(below?__hg6MansionBlocked(Rp.position.x,old.z):__hg6GardenBlocked(Rp.position.x,old.z));
  const allowZ=!(below?__hg6MansionBlocked(old.x,Rp.position.z):__hg6GardenBlocked(old.x,Rp.position.z));
  if(allowX)Rp.position.z=old.z;
  else if(allowZ)Rp.position.x=old.x;
  else{Rp.position.x=old.x;Rp.position.z=old.z}
 }
 if(below){
  const lx=Rp.position.x-__hg5Manor.position.x,lz=Rp.position.z-__hg5Manor.position.z;
  // Exterior steps rise toward the front door; interior steps rise toward the hall.
  let height=0;
  if(__hg5Phase==="underground"&&Math.abs(lx)<4.9&&lz>=-11.55&&lz<=-7.75)
   height=Math.max(0,Math.min(.80,(lz+11.55)*.21));
  if(__hg5Phase==="mansion"&&Math.abs(lx)<3.05&&lz>=2.5&&lz<=6.35)
   height=Math.max(0,Math.min(1.55,(lz-2.5)*.41));
  if(!nm)Rp.position.y=__hg5EarthY+height;
 }
};
// Improve the original sickle itself without changing its EYE-only use condition.
// A thicker wooden grip, metal collar, visibly sharp inner edge and an actual
// 3D arc animation across the body are easier to recognize than the static tube.
__uCyl("hg6SickleMetalFerrule",__hg4Sickle,new R(0,.63,0),new R(.18,.19,.18),__hg6Metal);
__uCyl("hg6SickleGripBand",__hg4Sickle,new R(0,-.11,0),new R(.15,.14,.15),__hg6Gold);
const __hg6EdgePoints=[];for(let k=0;k<=20;k++){const a=-.5+k/20*Math.PI*1.2;__hg6EdgePoints.push(new R(.38+Math.cos(a)*.48,.50+Math.sin(a)*.43,-.036))}
const __hg6Edge=Df.CreateTube("hg6SickleSharpEdge",{path:__hg6EdgePoints,radius:.035,tessellation:9},Yf);
__hg6Edge.parent=__hg4Sickle;__hg6Edge.material=__uMat("hg6SickleBrightEdge",new H(.92,.96,.99));
const __hg6BaseSickleX=__hg4Sickle.position.x;
const __hg6BaseSickleY=__hg4Sickle.position.y;
// Silhouette is drawn as a 2D overlay ONLY when the player is hidden by the
// shop or manor, using segment/rectangle crossing (not the avatar's distance).
const __hg6Silhouette=document.createElement("div");__hg6Silhouette.id="hg6PlayerSilhouette";
__hg6Silhouette.textContent="●";
__hg6Silhouette.setAttribute("aria-hidden","true");
__hg6Silhouette.style.cssText="position:fixed;pointer-events:none;z-index:19;display:none;width:28px;height:50px;transform:translate(-50%,-72%);filter:drop-shadow(0 0 4px white);color:#fff;opacity:.78;text-align:center;font:900 40px/50px system-ui;text-shadow:0 0 3px #183b2a";
document.body.appendChild(__hg6Silhouette);
function __hg6SegmentHitsBox(ax,az,bx,bz,cx,cz,rx,rz){
 let tmin=0,tmax=1;
 for(const [p,d,min,max] of [[ax,bx-ax,cx-rx,cx+rx],[az,bz-az,cz-rz,cz+rz]]){
  if(Math.abs(d)<1e-6){if(p<min||p>max)return false;continue}
  const a=(min-p)/d,b=(max-p)/d,lo=Math.min(a,b),hi=Math.max(a,b);
  tmin=Math.max(tmin,lo);tmax=Math.min(tmax,hi);if(tmax<tmin)return false;
 }
 return tmin<.92&&tmax>.03;
}
Yf.onAfterRenderObservable.add(()=>{
 if(!qp||Jp||__hg5Transition){__hg6Silhouette.style.display="none";return}
 const camera=Xf.position,player=Rp.position;
 const under=__hg5Phase==="underground"||__hg5Phase==="mansion";
 const shop=!under&&__hg6SegmentHitsBox(camera.x,camera.z,player.x,player.z,-5,-4,3.5,2.4);
 const house=under&&__hg6SegmentHitsBox(camera.x,camera.z,player.x,player.z,__hg5Manor.position.x,__hg5Manor.position.z,18,8);
 if(!shop&&!house){__hg6Silhouette.style.display="none";return}
 const viewport=Xf.viewport.toGlobal(Jf.getRenderWidth(),Jf.getRenderHeight());
 const pt=R.Project(new R(0,1.55,0),Rp.getWorldMatrix(),Yf.getTransformMatrix(),viewport);
 const px=pt.x*(innerWidth/Jf.getRenderWidth()),py=pt.y*(innerHeight/Jf.getRenderHeight());
 if(!Number.isFinite(px)||!Number.isFinite(py)||pt.z<0||pt.z>1){__hg6Silhouette.style.display="none";return}
 __hg6Silhouette.style.left=px+"px";__hg6Silhouette.style.top=py+"px";__hg6Silhouette.style.display="block";
});
Yf.onBeforeRenderObservable.add(()=>{
 if(__hg4HasSickle&&Kp===4&&qp&&!Jp&&__hg4SwingUntil>performance.now()){
  const phase=1-(__hg4SwingUntil-performance.now())/380;
  __hg4Sickle.rotation.x=-.2+Math.sin(phase*Math.PI)*1.4;
  __hg4Sickle.rotation.y=-1.0+phase*2.0;
  __hg4Sickle.position.x=__hg6BaseSickleX-.25*Math.sin(phase*Math.PI);
  __hg4Sickle.position.y=__hg6BaseSickleY+.32*Math.sin(phase*Math.PI);
 }else{
  __hg4Sickle.rotation.x=0;__hg4Sickle.rotation.y=0;
  __hg4Sickle.position.x=__hg6BaseSickleX;__hg4Sickle.position.y=__hg6BaseSickleY;
 }
});
window.__ulmoaGardenV6={state:()=>({
 shoes:Yf.meshes.filter(m=>m.name.startsWith("hg6PlayerShoe")).length,
 woodsAttackRange:8.5,
 lampMoved:Math.abs(Yf.getMeshByName("lamp0").position.x+12)<.01,
 soilVisible:__hg5Soil.root.isEnabled(),phase:__hg5Phase,
 manorRightZ:__hg5Manor.position.z,doorRightZ:__hg5DoorPos.z,
 mansionDetail:!!Yf.getMeshByName("hg6GrandPedimentStep3"),
 innerStairs:Yf.meshes.filter(m=>m.name.startsWith("hg6LobbyStep")&&!m.name.includes("Nosing")).length,
 collisionShop:__hg6GardenBlocked(-5,-4),
 collisionMansion:__hg6MansionBlocked(__hg5Manor.position.x,__hg5Manor.position.z),
 silhouetteDisplay:__hg6Silhouette.style.display,
 sharpSickle:!!Yf.getMeshByName("hg6SickleSharpEdge")
})};

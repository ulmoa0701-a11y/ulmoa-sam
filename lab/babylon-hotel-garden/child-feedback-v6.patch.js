
/* HOTEL GARDEN V6 — child playtest: attached footwear, solid people,
   clear combat messages, paused victory, player-centred SMOG,
   hand flashlight at night, screen-consistent DLC movement and stable jumps. */
const __hg7OriginalKm=Km,__hg7OriginalHm=Hm,__hg7OriginalGm=Gm,__hg7OriginalWm=Wm;
const __hg7OriginalQm=qm,__hg7OriginalZm=zm;
const __hg7LegLinks=[];
for(const side of [-1,1]){
 const leg=Yf.getMeshByName("playerLeg"+side);
 if(!leg)continue;
 for(const name of ["hg6PlayerShoe","hg6PlayerSole","hg6PlayerShoeToe"]){
  const mesh=Yf.getMeshByName(name+side);
  if(mesh){mesh.parent=leg;mesh.position.x-=leg.position.x;mesh.position.y-=leg.position.y;mesh.position.z-=leg.position.z;__hg7LegLinks.push(mesh.name)}
 }
 for(let i=0;i<3;i++){
  const lace=Yf.getMeshByName("hg6Shoelace"+side+"_"+i);
  if(lace){lace.parent=leg;lace.position.x-=leg.position.x;lace.position.y-=leg.position.y;lace.position.z-=leg.position.z;__hg7LegLinks.push(lace.name)}
 }
}
for(const role of ["gardener","keeper","traveler"]){
 const node=role==="gardener"?zp:role==="keeper"?Bp:Vp;
 for(const side of [-1,1]){
  const leg=Yf.getMeshByName(node.name+"Leg"+side);
  const boot=Yf.getMeshByName("hg4"+role+"Boot"+side);
  if(!leg||!boot)continue;
  boot.parent=leg;
  boot.position.x-=leg.position.x;boot.position.y-=leg.position.y;boot.position.z-=leg.position.z;
  __hg7LegLinks.push(boot.name);
 }
}
// Physical character radii, not merely visible textures. NPCs wander during the mission.
const __hg7People=[zp,Bp,Vp];
function __hg7HumanBlocked(x,z){
 if(__hg5Underground()||__hg5Transition)return false;
 for(const npc of __hg7People){
  if(!npc.isEnabled())continue;
  if(Math.hypot(x-npc.position.x,z-npc.position.z)<.83)return true;
 }
 return false;
}
function __hg7CollisionBacktrack(before,blocked){
 if(!blocked(Rp.position.x,Rp.position.z))return;
 const x=Rp.position.x,z=Rp.position.z;
 if(!blocked(x,before.z))Rp.position.z=before.z;
 else if(!blocked(before.x,z))Rp.position.x=before.x;
 else {Rp.position.x=before.x;Rp.position.z=before.z}
}
function __hg7UiPaused(){
 return !qp||Jp||ap.classList.contains("show")||__hg4ShopOpen||!!__hg5Transition;
}
// Original controls were hard-coded to the upper-garden camera while the DLC
// camera looks from the opposite side. Use screen-relative axes in both DLC areas.
Km=function(dt){
 if(__hg7UiPaused())return;
 const before=Rp.position.clone();
 const dlc=__hg5Phase==="underground"||__hg5Phase==="mansion";
 if(!dlc){
  __hg7OriginalKm(dt);
  __hg7CollisionBacktrack(before,__hg7HumanBlocked);
  return;
 }
 const controls={up:Gp.up,down:Gp.down,left:Gp.left,right:Gp.right};
 const h=Number(controls.right)-Number(controls.left),v=Number(controls.up)-Number(controls.down);
 const length=Math.hypot(h,v);
 Gp.up=Gp.down=Gp.left=Gp.right=false;
 try{__hg7OriginalKm(dt)}finally{
  Gp.up=controls.up;Gp.down=controls.down;Gp.left=controls.left;Gp.right=controls.right;
 }
 if(length){
  const speed=(__hgSprinting?11.2:6.5)*dt/length;
  const dx=-h*speed,dz=v*speed;
  const start=Rp.position.clone();
  const blocked=(x,z)=>__hg6UnderBlocked(x,z);
  const nx=Math.max(-42,Math.min(42,start.x+dx));
  if(!blocked(nx,start.z))Rp.position.x=nx;
  const nz=Math.max(-34,Math.min(34,start.z+dz));
  if(!blocked(Rp.position.x,nz))Rp.position.z=nz;
  Rp.rotation.y=Math.atan2(dx,dz);
 }
 const ground=__hg5Phase==="mansion"?__hg6MansionFoot(Rp.position.x,Rp.position.z,before.y):-60;
 Rp.position.y=ground+(nm?Math.max(0,Math.sin(Math.min(1,tm/.72)*Math.PI)*1.15):0);
};
// Repeated Space keydown events previously restarted an existing DLC jump
// every ~30ms, making the child stamp/teleport rather than jump normally.
zm=function(action){
 if(__hg7UiPaused())return;
 if(action==="jump"&&(__hg5Phase==="underground"||__hg5Phase==="mansion")){
  if(nm)return;
  nm=true;tm=0;
  xp("JUMP_USED",{area:__hg5Phase,stage:Kp});
  return;
 }
 return __hg7OriginalZm(action);
};
// Ignore keyboard auto-repeat for single-shot actions; E-hold lotus uses keyup.
document.addEventListener("keydown",event=>{
 if(event.repeat&&["Space","KeyE","KeyQ","KeyF"].includes(event.code)){
  event.preventDefault();event.stopImmediatePropagation();
 }
 if(event.code==="Space")event.preventDefault();
},true);
// Any dialog (including the success card) freezes combat and its countdown.
Hm=function(dt){
 if(__hg7UiPaused()||!Up.isEnabled()){if(Kp===4&&__hg7UiPaused())am+=dt*1000;return}
 return __hg7OriginalHm(dt);
};
Gm=function(dt){
 if(__hg7UiPaused()||!Hp.isEnabled()){if(Kp===2&&__hg7UiPaused())vm+=dt*1000;return}
 return __hg7OriginalGm(dt);
};
Wm=function(dt){
 if(__hg7UiPaused()||!Wp.isEnabled()){if(Kp===6&&__hg7UiPaused())fm+=dt*1000;return}
 return __hg7OriginalWm(dt);
};
// On the SMOG encounter the child is the visual focus, not a distant boss.
qm=function(){
 if(Kp===6&&__hg5Phase==="locked"&&!__hg5Transition){
  const focus=Rp.position.add(new R(0,1.55,0));
  const desired=Rp.position.add(new R(9.6,11.1,12.4));
  Xf.position=R.Lerp(Xf.position,desired,.22);
  Xf.setTarget(focus);
  return;
 }
 return __hg7OriginalQm();
};
const __hg7Styles=document.createElement("style");
__hg7Styles.textContent="#hg4Combat{top:clamp(222px,29vh,320px)!important}#hg7FlashHint{position:fixed;top:190px;left:12px;z-index:21;display:none;color:#fff3bd;background:#233837dc;border:1px solid #e2c67e;padding:5px 8px;border-radius:9px;font:800 12px system-ui;pointer-events:none}@media(max-width:700px){#hg4Combat{top:clamp(185px,29vh,250px)!important}#hg7FlashHint{top:140px;left:10px;font-size:11px}}";
document.head.appendChild(__hg7Styles);
const __hg7FlashHint=document.createElement("div");
__hg7FlashHint.id="hg7FlashHint";__hg7FlashHint.textContent="🔦 밤길 손전등 켜짐";document.body.appendChild(__hg7FlashHint);
const __hg7FlashBody=__uCyl("hg7HandFlashlight",Yf.getMeshByName("playerArm1")||Rp,new R(0,-.51,.24),new R(.19,.47,.19),new H(.18,.21,.25));
__hg7FlashBody.material.emissiveColor=new H(.09,.10,.11);
const __hg7FlashLens=__uCyl("hg7FlashLens",__hg7FlashBody,new R(0,-.24,0),new R(.20,.06,.20),new H(1,.91,.60));
__hg7FlashLens.material.emissiveColor=new H(.8,.65,.23);
const __hg7Beam=Df.CreateCylinder("hg7FlashBeam",{height:6.6,diameterTop:3.3,diameterBottom:.10,tessellation:28},Yf);
__hg7Beam.parent=Rp;
__hg7Beam.position.set(.62,1.09,3.5);
__hg7Beam.rotation.x=Math.PI/2;
__hg7Beam.material=__uMat("hg7VisibleBeam",new H(.95,.91,.60),.082);
__hg7Beam.material.emissiveColor=new H(.26,.22,.11);
__hg7Beam.material.disableLighting=true;
__hg7Beam.material.backFaceCulling=false;
__hg7Beam.isPickable=false;
const __hg7Light=new Is("hg7FlashlightGlow",Rp.position.clone(),Yf);
__hg7Light.diffuse=new H(1,.89,.62);
__hg7Light.specular=new H(.45,.39,.25);
__hg7Light.range=10;
__hg7Light.intensity=0;
__hg7FlashBody.setEnabled(false);
__hg7Beam.setEnabled(false);
let __hg7NightOn=false;
function __hg7NightWanted(){return qp&&!Jp&&Xp/Tm>=.68&&!(__hg5Phase==="descending"||__hg5Phase==="ascending")}
Yf.onBeforeRenderObservable.add(()=>{
 const show=__hg7NightWanted();
 if(show!==__hg7NightOn){
  __hg7NightOn=show;
  __hg7FlashBody.setEnabled(show);
  __hg7Beam.setEnabled(show);
  __hg7Light.intensity=show?1.45:0;
  __hg7FlashHint.style.display=show?"block":"none";
 }
 if(show){
  const a=Rp.rotation.y;
  __hg7Light.position.set(Rp.position.x+.65*Math.cos(a)+3.1*Math.sin(a),Rp.position.y+1.23,Rp.position.z-.65*Math.sin(a)+3.1*Math.cos(a));
 }
 // Hide stale dig progress once the ladder is revealed or in the new world.
 if(__hg5Phase!=="dig")__hg5DigProgress.style.display="none";
 // A victory/dialog card must not have a second combat overlay behind it.
 if(__hg7UiPaused())__hg4Combat.style.display="none";
});
// Read-only QA diagnostics; no teleport or game-state mutation exposed.
window.__ulmoaGardenFeedbackV6={
 state:()=>({
  shoesAttached:__hg7LegLinks.filter(x=>x.startsWith("hg6")).length===12,
  linkedFootwear:__hg7LegLinks.length,
  peopleSolid:__hg7HumanBlocked(zp.position.x,zp.position.z),
  gardener:[+zp.position.x.toFixed(3),+zp.position.z.toFixed(3)],
  modalPaused:__hg7UiPaused(),
  stage:Kp,phase:__hg5Phase,
  flashlightOn:__hg7NightOn,nightEligible:__hg7NightWanted(),
  jumpActive:nm,jumpTime:+tm.toFixed(3),digDisplay:__hg5DigProgress.style.display,
  combatDisplay:__hg4Combat.style.display,
  smogPlayerFocus:Kp===6&&typeof Xf.getTarget==="function"?+R.Distance(Xf.getTarget(),Rp.position.add(new R(0,1.55,0))).toFixed(3):null,
  player:[+Rp.position.x.toFixed(2),+Rp.position.y.toFixed(2),+Rp.position.z.toFixed(2)]
 }),
 probeHuman:(x,z)=>__hg7HumanBlocked(x,z),
 previewNight:()=>{if(__hg5Underground())return false;qp=true;Jp=false;ap.classList.remove("show");Xp=Tm*.73;Yp=performance.now()-Xp*1000;Vm();return true;},
 version:"child-playtest-v6"
};

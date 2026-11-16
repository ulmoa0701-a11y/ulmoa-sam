
/* HOTEL GARDEN V6 — player footwear, solid scenery, staircase traversal, sickle animation, and occlusion. */
const __hg6ShoeMat=__uMat("hg6PlayerBootLeather",new H(.12,.16,.24));
const __hg6SoleMat=__uMat("hg6PlayerBootSole",new H(.075,.08,.10));
for(const side of [-1,1]){
  __uBox("hg6PlayerShoe"+side,Rp,new R(side*.22,.105,.17),new R(.37,.23,.66),__hg6ShoeMat.diffuseColor);
  __uBox("hg6PlayerSole"+side,Rp,new R(side*.22,.027,.20),new R(.41,.055,.72),__hg6SoleMat.diffuseColor);
  __uBox("hg6ShoeLace"+side,Rp,new R(side*.22,.231,.34),new R(.23,.04,.13),new H(.84,.84,.78));
}
// The original player shoe meshes are descendants of Rp, so their motion tracks the character.
const __hg6SolidGarden=[
 {name:"seed-shop",kind:"box",x:-5,z:-4,rx:4.2,rz:3.0},
 {name:"pond",kind:"circle",x:4,z:-3,r:3.22},
 ...[[-11,-8,.95],[-9,6,1.08],[-2,8,.92],[5,9,1.04],[11,6,.9],[13,3,.88],[-1,-9,.88]].map(([x,z,s],i)=>({name:"tree"+i,kind:"circle",x,z,r:.43*s+.43})),
 ...[[-2,-6],[6,1],[8,-7]].map(([x,z],i)=>({name:"lamp"+i,kind:"circle",x,z,r:.48}))
];
function __hg6CircleTouch(x,z,b){return Math.hypot(x-b.x,z-b.z)<b.r+.40}
function __hg6HitGarden(x,z){
 for(const b of __hg6SolidGarden){
  if(b.kind==="circle"&&__hg6CircleTouch(x,z,b))return b.name;
  if(b.kind==="box"&&Math.abs(x-b.x)<b.rx+.32&&Math.abs(z-b.z)<b.rz+.32)return b.name;
 }
 return null;
}
function __hg6HitUnder(x,z){
 if(__hg5Phase==="underground"){
  // The ornamental portico remains approachable; the mansion itself requires E at the entrance.
  if(x>5.7&&x<28.3&&z>-11.65&&z<3.5)return "mansion-wall";
  const trees=Array.from({length:8},(_,i)=>({x:17+Math.cos(i*Math.PI/4)*16,z:5+Math.abs(Math.sin(i*Math.PI/4))*13,r:.85}));
  if(trees.some(t=>__hg6CircleTouch(x,z,t)))return "manor-tree";
  if(Math.hypot(x-23,z-6)<2.4)return "fountain";
 }
 if(__hg5Phase==="mansion"){
  // A real room boundary; the doors open via their scripted E interaction.
  if(x<6.7||x>27.3||z< -11.0||z>2.45)return "mansion-wall";
 }
 return null;
}
function __hg6Hit(x,z){
 if(__hg5Phase==="underground"||__hg5Phase==="mansion")return __hg6HitUnder(x,z);
 if(__hg5Phase==="descending"||__hg5Phase==="ascending")return null;
 return __hg6HitGarden(x,z);
}
function __hg6MansionFloor(x,z,previousY){
 const lx=x-17,lz=z+5;
 const ground=-59.0;
 if(lx>-.8&&lx<3.6&&lz>=.05&&lz<=6.85&&previousY>-55.5){
  const idx=Math.max(0,Math.min(17,Math.floor((6.68-lz)/.37)));
  return -60+4.88+(idx+1)*.202;
 }
 if(lz>=6.43&&lz<=7.65&&lx>=-3.8&&lx<=3.8)return -60+4.885;
 if(lx>=-3.55&&lx<=-.80&&lz>=-.1&&lz<=6.85){
  const idx=Math.max(0,Math.min(17,Math.floor(Math.max(0,lz)/.37)));
  return -60+1.24+(idx+1)*.202;
 }
 if(previousY> -53.5)return -60+8.33;
 return ground;
}
const __hg6PriorMovement=Km;
Km=function(dt){
 if(__hg5Transition){__hg6PriorMovement(dt);return}
 const before=Rp.position.clone();
 __hg6PriorMovement(dt);
 const after=Rp.position.clone();
 let hit=__hg6Hit(after.x,after.z);
 if(hit){
  // Axis-separated movement permits sliding along walls without ghosting through corners.
  if(!__hg6Hit(after.x,before.z)){Rp.position.z=before.z}
  else if(!__hg6Hit(before.x,after.z)){Rp.position.x=before.x}
  else {Rp.position.x=before.x;Rp.position.z=before.z}
 }
 if(__hg5Phase==="mansion"){
  Rp.position.y=__hg6MansionFloor(Rp.position.x,Rp.position.z,before.y);
 }else if(__hg5Phase==="underground"){
  Rp.position.y=__hg5EarthY+(nm?Math.max(0,Math.sin(Math.min(1,tm/.72)*Math.PI)*1.15):0);
 }
};
const __hg6SickleDark=__uMat("hg6SickleShadowSteel",new H(.29,.37,.41));
const __hg6SickleSilver=__uMat("hg6SicklePolishedEdge",new H(.88,.95,.97));
__hg6SickleSilver.specularColor=new H(.75,.82,.86);__hg6SickleSilver.specularPower=92;
__uCyl("hg6SicklePommel",__hg4Sickle,new R(0,-.27,0),new R(.21,.16,.21),new H(.83,.63,.27));
for(let i=0;i<5;i++)__uCyl("hg6SickleHandleWrap"+i,__hg4Sickle,new R(0,-.15+i*.14,0),new R(.125,.035,.125),new H(.18,.12,.08));
__uBox("hg6SickleGuard",__hg4Sickle,new R(.04,.64,.02),new R(.52,.10,.20),new H(.78,.59,.19));
const __hg6BladeOuter=[],__hg6BladeEdge=[];
for(let k=0;k<=23;k++){
 const a=-.52+k/23*Math.PI*1.17;
 __hg6BladeOuter.push(new R(.38+Math.cos(a)*.59,.52+Math.sin(a)*.52,0));
 __hg6BladeEdge.push(new R(.38+Math.cos(a)*.67,.52+Math.sin(a)*.61,-.042));
}
const __hg6BladeBacking=Df.CreateTube("hg6SickleForgedBlade",{path:__hg6BladeOuter,radius:.10,tessellation:9,cap:2},Yf);
__hg6BladeBacking.parent=__hg4Sickle;__hg6BladeBacking.material=__hg6SickleDark;
const __hg6BladeSharp=Df.CreateTube("hg6SickleSharpEdge",{path:__hg6BladeEdge,radius:.036,tessellation:8,cap:2},Yf);
__hg6BladeSharp.parent=__hg4Sickle;__hg6BladeSharp.material=__hg6SickleSilver;
const __hg6Arm=Yf.getMeshByName("playerArm1");
const __hg6SlashTrail=__uSphere("hg6SickleSlashFlash",__hg4Sickle,new R(.55,.75,-.18),new R(.15,.15,.12),new H(.82,.96,1));
__hg6SlashTrail.material.emissiveColor=new H(.23,.42,.51);
__hg6SlashTrail.setEnabled(false);
const __hg6PersonOutline=document.createElement("div");
__hg6PersonOutline.id="hg6PersonOutline";
__hg6PersonOutline.setAttribute("aria-hidden","true");
__hg6PersonOutline.style.cssText="display:none;position:fixed;left:0;top:0;transform:translate(-50%,-76%);pointer-events:none;z-index:19;filter:drop-shadow(0 0 4px #053f43)";
__hg6PersonOutline.innerHTML='<svg width="32" height="58" viewBox="0 0 32 58" xmlns="http://www.w3.org/2000/svg"><g stroke="#04343d" stroke-width="2.2" fill="#b5fbff"><circle cx="16" cy="9" r="7"/><path d="M10 18 Q16 15 22 18 L26 34 L21 36 L19 29 L19 43 L25 54 L20 56 L15 45 L12 56 L7 55 L11 42 L11 29 L7 37 L3 34 Z"/></g></svg>';
document.body.appendChild(__hg6PersonOutline);
let __hg6Frame=0;
Yf.onAfterRenderObservable.add(()=>{
 const active=Kp===4&&__hg4HasSickle&&qp&&!Jp;
 const left=Math.max(0,__hg4SwingUntil-performance.now());
 if(active&&left>0){
  const t=1-Math.min(1,left/380);
  const arc=Math.sin(t*Math.PI);
  __hg4Sickle.rotation.x=-.6*arc;
  __hg4Sickle.rotation.y=-1.25*arc;
  if(__hg6Arm)__hg6Arm.rotation.z=-1.05*arc;
  __hg6SlashTrail.setEnabled(true);
 }else{
  __hg4Sickle.rotation.x=0;__hg4Sickle.rotation.y=0;
  if(__hg6Arm)__hg6Arm.rotation.z=0;
  __hg6SlashTrail.setEnabled(false);
 }
 if(++__hg6Frame%10!==0)return;
 if(!qp||__hg5Transition){__hg6PersonOutline.style.display="none";return}
 try{
  const playerHead=Rp.getAbsolutePosition().add(new R(0,1.65,0));
  const projected=R.Project(new R(0,1.65,0),Rp.getWorldMatrix(),Yf.getTransformMatrix(),{x:0,y:0,width:innerWidth,height:innerHeight});
  if(projected.z<=0||projected.z>=1||projected.x<0||projected.y<0||projected.x>innerWidth||projected.y>innerHeight){__hg6PersonOutline.style.display="none";return}
  const result=Yf.pick(projected.x,projected.y,m=>{
   if(!m.isEnabled()||!m.isVisible||m.visibility===0)return false;
   if(m===Ap||m===jp||m===Mp||m===__hg5UnderFloor||m.name==="ground"||m.name.startsWith("path"))return false;
   if(m===Rp||m.parent===Rp||m.isDescendantOf?.(Rp))return false;
   return /hotel|hg4|tree.*Crown|hg5Mansion|hg5Manor|hg5Grand|hg5Wing|hg5Side|hg5Cave|hg5Portico|hg6Entrance|hg6Wing/i.test(m.name);
  });
  const depth=playerHead.subtract(Xf.position).length();
  const obscured=!!(result?.hit&&result.pickedPoint&&R.Distance(result.pickedPoint,Xf.position)<depth-1.0);
  __hg6PersonOutline.style.display=obscured?"block":"none";
  if(obscured){__hg6PersonOutline.style.left=projected.x+"px";__hg6PersonOutline.style.top=projected.y+"px";}
 }catch(err){__hg6PersonOutline.style.display="none";}
});
window.__ulmoaGardenV6={
 version:"2026-11-16",
 state:()=>({shoes:!!Yf.getMeshByName("hg6PlayerShoe1")&&!!Yf.getMeshByName("hg6PlayerShoe-1"),collisionEnabled:true,woodsSafeDistance:10,soilShown:__hg5Soil.root.isEnabled(),phase:__hg5Phase,stairSteps:Yf.meshes.filter(m=>m.name.startsWith("hg6StairFirst")||m.name.startsWith("hg6StairSecond")).length,upperFloor:__hg5Phase==="mansion"&&Rp.position.y> -53.5,silhouetteExists:!!__hg6PersonOutline,sickleBlade:!!Yf.getMeshByName("hg6SickleSharpEdge")}),
 collisionCheck:(x,z)=>__hg6Hit(x,z),
};

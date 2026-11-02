
/* HOTEL GARDEN DLC V1 — garden beneath the garden.
 * Unlock strictly after stage 7 AND collecting three lotus rewards.
 * Independent scene meshes remain disabled until the ladder descent.
 */
const __hg5OriginalZm=zm,__hg5OriginalJm=Jm,__hg5OriginalVm=Vm,__hg5OriginalKm=Km;
const __hg5HomePos=new R(-17,0,-12),__hg5DoorPos=new R(17,-60,-11),__hg5LadderBottom=new R(-27,-60,-12);
const __hg5EarthY=-60;
let __hg5Phase="locked",__hg5DigCount=0,__hg5Transition=null,__hg5DoorOpen=false,__hg5HoldIntro=false,__hg5DigCooldown=0;
const __hg5Stats={shovel:false,ladder:false,entered:false,seenMansion:false};
const __hg5Color={soil:new H(.77,.38,.71),stone:new H(.34,.38,.40),cream:new H(.91,.87,.73),ivory:new H(.98,.95,.86),gold:new H(.81,.63,.29),roof:new H(.13,.24,.34),windows:new H(.81,.72,.44),wood:new H(.36,.21,.13),grass:new H(.16,.25,.22)};
const __hg5Styles=document.createElement("style");
__hg5Styles.textContent="#hg5Quest{position:fixed;left:50%;transform:translateX(-50%);bottom:16px;z-index:29;display:none;max-width:min(90vw,460px);padding:12px 17px;background:#182c35f0;color:#fff;border:2px solid #deb889;border-radius:17px;text-align:center;font:800 14px/1.4 system-ui;box-shadow:0 5px 18px #0005;pointer-events:none}#hg5Action{position:fixed;right:12px;bottom:258px;z-index:32;padding:12px 15px;border:2px solid #d9af5e;border-radius:15px;background:#fdf1ce;color:#243b35;font:900 14px system-ui;cursor:pointer;display:none}#hg5DigProgress{display:none;position:fixed;bottom:76px;left:50%;transform:translateX(-50%);z-index:30;color:#fff;background:#37283adf;padding:8px 12px;border-radius:12px;font:900 15px system-ui;pointer-events:none}#hg5Location{display:none;position:fixed;top:142px;left:50%;transform:translateX(-50%);z-index:22;background:#112a32cf;border:1px solid #f9d58d;border-radius:11px;padding:6px 10px;color:#fff;font:800 14px system-ui;white-space:nowrap;pointer-events:none}@media(max-width:700px){#hg5Quest{bottom:9px;font-size:12px;padding:9px 12px;max-width:78vw}#hg5Action{right:8px;bottom:263px;padding:11px 9px;font-size:12px}#hg5DigProgress{bottom:91px;font-size:12px}#hg5Location{top:110px;font-size:12px}}";
document.head.appendChild(__hg5Styles);
const __hg5Quest=document.createElement("div");__hg5Quest.id="hg5Quest";document.body.appendChild(__hg5Quest);
const __hg5Action=document.createElement("button");__hg5Action.id="hg5Action";__hg5Action.type="button";document.body.appendChild(__hg5Action);
const __hg5DigProgress=document.createElement("div");__hg5DigProgress.id="hg5DigProgress";document.body.appendChild(__hg5DigProgress);
const __hg5Location=document.createElement("div");__hg5Location.id="hg5Location";__hg5Location.textContent="DLC · 정원 밑 세계";document.body.appendChild(__hg5Location);
function __hg5Block(n,p,pos,scale,color){return __uBox(n,p,pos,scale,color)}
function __hg5Ball(n,p,pos,scale,color){return __uSphere(n,p,pos,scale,color)}
function __hg5Cylinder(n,p,pos,scale,color){return __uCyl(n,p,pos,scale,color)}
function __hg5Range(x,z){return Math.hypot(Rp.position.x-x,Rp.position.z-z)}
function __hg5Unlocked(){return Kp===7&&__uLotusCount===3}
function __hg5Underground(){return __hg5Phase==="underground"||__hg5Phase==="mansion"||(__hg5Transition?.toUnderground===true)}
function __hg5BuildSoil(){
 const root=new fc("hg5PurpleSoilRoot",Yf);root.position.copyFrom(__hg5HomePos);
 __hg5Cylinder("hg5DifferentColorSoil",root,new R(0,.06,0),new R(3,.12,2.8),__hg5Color.soil);
 for(let i=0;i<10;i++){const a=i*Math.PI*.2;__hg5Ball("hg5SoilClump"+i,root,new R(Math.cos(a)*1.02,.17,Math.sin(a)*1.00),new R(.33,.19,.27),i%2?new H(.54,.29,.50):__hg5Color.soil)}
 const hole=new fc("hg5Hole",Yf);hole.parent=root;hole.setEnabled(false);
 __hg5Cylinder("hg5HoleDark",hole,new R(0,.035,0),new R(3.0,.045,3.0),new H(.075,.055,.085));
 const rim=__hg5Cylinder("hg5LadderRim",hole,new R(0,.10,0),new R(3.7,.16,3.7),__hg5Color.wood);
 rim.material.alpha=.65;
 const ladder=new fc("hg5Ladder",Yf);ladder.parent=hole;ladder.position.set(.15,-.1,.12);
 for(const x of [-.56,.56])__hg5Cylinder("hg5LadderRail"+(x<0?"L":"R"),ladder,new R(x,-2.2,0),new R(.17,4.9,.16),new H(.66,.46,.23));
 for(let j=0;j<8;j++)__hg5Block("hg5LadderRung"+j,ladder,new R(0,-.25-j*.52,0),new R(1.34,.17,.27),__hg5Color.gold);
 return {root,hole};
}
const __hg5Soil=__hg5BuildSoil();
const __hg5Shovel=new fc("hg5Shovel",Yf);__hg5Shovel.parent=Rp;__hg5Shovel.position.set(-.66,1.22,-.08);
__hg5Cylinder("hg5ShovelWoodHandle",__hg5Shovel,new R(0,.25,0),new R(.11,1.36,.12),new H(.57,.33,.17));
const shovelBlade=__hg5Block("hg5ShovelMetalSpade",__hg5Shovel,new R(0,-.57,.02),new R(.53,.75,.19),new H(.57,.71,.75));
shovelBlade.rotation.z=.12;
__hg5Block("hg5ShovelGrip",__hg5Shovel,new R(0,.99,0),new R(.39,.12,.18),new H(.24,.18,.12));__hg5Shovel.setEnabled(false);
const __hg5Under=new fc("hg5UndergroundWorld",Yf);__hg5Under.setEnabled(false);
const __hg5UnderFloor=__hg5Block("hg5UndergroundFloor",__hg5Under,new R(0,-60.12,0),new R(86,.25,70),__hg5Color.grass);
__hg5Block("hg5MansionAvenue",__hg5Under,new R(-4,-59.95,-13),new R(52,.08,5.2),new H(.70,.67,.57));
__hg5Block("hg5MansionAvenueBorderN",__hg5Under,new R(-4,-59.9,-16),new R(53,.16,.18),__hg5Color.gold);
__hg5Block("hg5MansionAvenueBorderS",__hg5Under,new R(-4,-59.9,-10),new R(53,.16,.18),__hg5Color.gold);
for(let i=0;i<7;i++){
 const x=-22+i*7.4,zz=-18;
 const stem=__hg5Cylinder("hg5CavernLampPost"+i,__hg5Under,new R(x,-58.8,zz),new R(.14,2.3,.14),__hg5Color.gold);
 const globe=__hg5Ball("hg5CavernLampGlow"+i,__hg5Under,new R(x,-57.55,zz),new R(.36,.36,.36),new H(1,.86,.51));
 globe.material.emissiveColor=new H(.35,.22,.08);
}
const __hg5CaveRoof=__hg5Block("hg5CaveCeiling",__hg5Under,new R(0,-32,0),new R(88,2,70),new H(.11,.16,.22));
for(let i=0;i<14;i++){
 const a=i*2.4;const x=-32+(i%7)*10,z= i<7?-27:27;
 const stal= Df.CreateCylinder("hg5Stalactite"+i,{height:3+i%3,diameterTop:1.3,diameterBottom:0,tessellation:8},Yf);
 stal.parent=__hg5Under;stal.position.set(x,-35,z);stal.material=__uMat("hg5CaveStoneMat",__hg5Color.stone);
 const crystal=__hg5Ball("hg5CaveCrystal"+i,__hg5Under,new R(x,-38.1,z),new R(.25,.7,.25),new H(.36,.66,.78));
 crystal.material.emissiveColor=new H(.09,.21,.28);
}
const __hg5Manor=new fc("hg5GrandMansion",Yf);__hg5Manor.parent=__hg5Under;__hg5Manor.position.set(17,-60,-5);
const __hg5MansionWall=__hg5Color.cream,__hg5WindowMat=__uMat("hg5WarmWindows",__hg5Color.windows);
__hg5WindowMat.emissiveColor=new H(.30,.19,.065);
const __hg5MansionRoofMat=__uMat("hg5DarkSlateRoof",__hg5Color.roof);
function __hg5MBox(n,x,y,z,w,h,d,c){return __hg5Block(n,__hg5Manor,new R(x,y,z),new R(w,h,d),c)}
function __hg5MBall(n,x,y,z,w,h,d,c){return __hg5Ball(n,__hg5Manor,new R(x,y,z),new R(w,h,d),c)}
// Intact, opulent two-storey mansion: broad facade, paired wings, slate roofs and gilded detailing.
__hg5MBox("hg5MansionRaisedFoundation",0,.5,0,24,1.0,16,new H(.62,.61,.56));
__hg5MBox("hg5MansionGroundFloor",0,1.03,1.0,22,.25,14,__hg5Color.ivory);
__hg5MBox("hg5MansionSideWallL",-10.7,4.35,1,.5,7.8,14,__hg5MansionWall);
__hg5MBox("hg5MansionSideWallR",10.7,4.35,1,.5,7.8,14,__hg5MansionWall);
__hg5MBox("hg5MansionBackWall",0,4.35,7.85,22,7.8,.5,__hg5MansionWall);
__hg5MBox("hg5MansionUpperFloor",0,8.18,1.0,22,.3,14,__hg5Color.ivory);
__hg5MBox("hg5UpperSideL",-10.7,10.65,1,.5,5,14,__hg5MansionWall);
__hg5MBox("hg5UpperSideR",10.7,10.65,1,.5,5,14,__hg5MansionWall);
__hg5MBox("hg5UpperBack",0,10.65,7.85,22,5,.5,__hg5MansionWall);
__hg5MBox("hg5MansionFrontLeft",-6.7,3.7,-6.15,8.6,6.8,.65,__hg5MansionWall);
__hg5MBox("hg5MansionFrontRight",6.7,3.7,-6.15,8.6,6.8,.65,__hg5MansionWall);
__hg5MBox("hg5DoorLintel",0,6.35,-6.15,5.1,1.4,.65,__hg5MansionWall);
__hg5MBox("hg5GrandCornice",0,8.3,-6.55,23.6,.37,1.12,__hg5Color.ivory);
__hg5MBox("hg5UpperCornice",0,13.6,-6.55,24.6,.46,1.3,__hg5Color.ivory);
__hg5MBox("hg5MansionSlateRoof",0,15.13,1,24.2,2.4,16.2,__hg5MansionRoofMat.diffuseColor);
__hg5MBox("hg5RoofRidge",0,16.36,1,24.8,.34,.8,__hg5Color.gold);
for(const side of [-1,1]){
 __hg5MBox("hg5ManorWing"+side,side*13.5,7,.8,5.5,13,12,__hg5MansionWall);
 __hg5MBox("hg5WingRoof"+side,side*13.5,14.3,.8,6.8,1.75,13.6,__hg5Color.roof);
 __hg5MBox("hg5SideTower"+side,side*11.8,15.8,-5.8,3.8,5.2,3.9,__hg5MansionWall);
 __hg5MBox("hg5TowerRoof"+side,side*11.8,19,-5.8,4.8,1.4,4.8,__hg5Color.roof);
 __hg5MBall("hg5GoldenFinial"+side,side*11.8,19.9,-5.8,.55,.75,.55,__hg5Color.gold);
}
for(const y of [3.7,10.1])for(const x of [-9,-5,5,9]){
 __hg5MBox("hg5WindowFrame"+y+x,x,y,-6.67,2.32,3.1,.26,__hg5Color.ivory);
 __hg5MBox("hg5WindowGlow"+y+x,x,y,-6.83,1.88,2.65,.16,__hg5Color.windows);
 __hg5MBox("hg5WindowCrossH"+y+x,x,y,-6.95,2.05,.13,.16,__hg5Color.gold);
 __hg5MBox("hg5WindowCrossV"+y+x,x,y,-6.96,.12,2.85,.16,__hg5Color.gold);
}
for(let x=-3;x<=3;x+=2){
 __hg5Cylinder("hg5MarblePorticoPillar"+x,__hg5Manor,new R(x*1.2,3.15,-8.3),new R(.58,6.3,.58),__hg5Color.ivory);
 __hg5MBox("hg5PillarCapital"+x,x*1.2,6.35,-8.3,.85,.35,.8,__hg5Color.gold);
}
__hg5MBox("hg5GrandPortico",0,6.8,-8.3,10,.85,4.6,__hg5Color.ivory);
__hg5MBox("hg5PorticoCrown",0,7.4,-8.3,11.2,.25,5.0,__hg5Color.gold);
for(let i=0;i<4;i++)__hg5MBox("hg5WideMarbleStair"+i,0,.2+i*.18,-10.5+i*.55,10-i*.75,.28,1.4,__hg5Color.ivory);
const __hg5EntranceLeft=__hg5MBox("hg5ManorLeftDoor",-.95,3.0,-6.9,1.9,4.6,.25,__hg5Color.wood);
const __hg5EntranceRight=__hg5MBox("hg5ManorRightDoor",.95,3.0,-6.9,1.9,4.6,.25,__hg5Color.wood);
for(const d of [__hg5EntranceLeft,__hg5EntranceRight])__hg5MBall("hg5GoldDoorKnob"+d.name,d.position.x<0?-.1:.1,3,-7.1,.17,.17,.17,__hg5Color.gold);
__hg5MBox("hg5MansionBalcony",0,8.85,-7.3,7.8,.28,2.1,__hg5Color.ivory);
for(let x=-3.4;x<=3.4;x+=.8)__hg5Cylinder("hg5BalconyBaluster"+x,__hg5Manor,new R(x,9.4,-8.1),new R(.14,.93,.14),__hg5Color.ivory);
__hg5MBox("hg5BalconyHandrail",0,10,-8.1,7.7,.22,.24,__hg5Color.gold);
const __hg5Fountain=new fc("hg5Fountain",Yf);__hg5Fountain.parent=__hg5Under;__hg5Fountain.position.set(17,-60,-21);
__hg5Cylinder("hg5FountainBase",__hg5Fountain,new R(0,.4,0),new R(4.4,.7,4.4),__hg5Color.ivory);
__hg5Cylinder("hg5FountainWater",__hg5Fountain,new R(0,.78,0),new R(3.7,.06,3.7),new H(.35,.71,.84));
__hg5Cylinder("hg5FountainSpire",__hg5Fountain,new R(0,1.75,0),new R(.56,2.2,.56),__hg5Color.gold);
__hg5Ball("hg5FountainPearl",__hg5Fountain,new R(0,3.05,0),new R(.58,.58,.58),new H(.72,.94,1));
for(let i=0;i<8;i++){
 const a=i*Math.PI/4,x=17+Math.cos(a)*16,z=-5+Math.sin(a)*19;
 __hg5Cylinder("hg5ManorGardenTreeTrunk"+i,__hg5Under,new R(x,-58.8,z),new R(.50,2.4,.50),__hg5Color.wood);
 __hg5Ball("hg5ManorGardenTreeCanopy"+i,__hg5Under,new R(x,-56.8,z),new R(2.4,2.3,2.4),new H(.15,.38,.26));
}
const __hg5BottomLadder=new fc("hg5BottomLadder",Yf);__hg5BottomLadder.parent=__hg5Under;__hg5BottomLadder.position.copyFrom(__hg5LadderBottom);
for(const x of [-.6,.6])__hg5Cylinder("hg5UndergroundLadderRail"+x,__hg5BottomLadder,new R(x,2.3,0),new R(.13,5,.13),__hg5Color.gold);

for(let i=0;i<9;i++)__hg5Block("hg5BottomLadderRung"+i,__hg5BottomLadder,new R(0,.4+i*.52,0),new R(1.4,.12,.22),__hg5Color.wood);
// A welcoming undamaged lobby, not a ruined house.
const __hg5Lobby=new fc("hg5ManorInterior",Yf);__hg5Lobby.parent=__hg5Manor;
__hg5MBox("hg5MansionRedRunner",0,.99,1,4.2,.04,10,new H(.60,.11,.16));
for(const x of [-4.8,4.8]){
 __hg5MBox("hg5LobbyTable"+x,x,1.65,2.4,2.4,.24,1.4,__hg5Color.wood);
 __hg5Cylinder("hg5LobbyVase"+x,__hg5Manor,new R(x,2.1,2.4),new R(.55,.77,.55),__hg5Color.gold);
}
__hg5Cylinder("hg5ChandelierRod",__hg5Manor,new R(0,11,1),new R(.13,3,.13),__hg5Color.gold);
for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const m=__hg5MBall("hg5ChandelierCrystal"+i,Math.cos(a)*1.5,9.6,1+Math.sin(a)*1.5,.37,.65,.37,new H(.95,.88,.57));m.material.emissiveColor=new H(.18,.16,.09)}
const __hg5Bannister=__hg5MBox("hg5CurvedGrandStairs",0,1.8,6,8,1.7,3.2,__hg5Color.ivory);
__hg5Under.setEnabled(false);
function __hg5Mission(text){ep.textContent=text;__hg5Quest.textContent=text;__hg5Quest.style.display="block"}
function __hg5ActionButton(label){__hg5Action.textContent=label;__hg5Action.style.display="block"}
function __hg5SetUnlocked(){
 if(__hg5Phase!=="locked"||!__hg5Unlocked())return;
 __hg5Phase="meet";__hg5Mission("🔎 숨겨진 이야기 · 정원사에게 돌아가 E로 말 걸기");
 __hg5Action.style.display="none";__hg5Location.style.display="block";
 km("🌿 정원에서 새로운 일이 생겼어요. 정원사에게 돌아가 보세요.",4400);
 xp("DLC_UNLOCKED",{id:"garden-beneath",lotus:__uLotusCount});
}
function __hg5TalkGardener(){
 if(__hg5Phase!=="meet"||__hg5Range(zp.position.x,zp.position.z)>5.8)return false;
 Am("<b>정원사</b><br>보스들이 사라진 뒤 정원에 <b>평소와 다른 보랏빛 흙</b>이 나왔어!<br>이 <b>삽</b>을 줄게. 함께 흙 아래를 조사해 보자.","삽 받기",()=>{
  __hg5Stats.shovel=true;__hg5Phase="dig";
  __hg5Shovel.setEnabled(true);__hg5Mission("🪏 삽 획득! 보랏빛 흙을 찾아 E로 세 번 파기");
  km("삽을 받았어요! 정원 바닥의 보랏빛 흙으로 가세요.",2800);xp("DLC_SHOVEL_RECEIVED",{id:"garden-beneath"});
 });
 return true;
}
function __hg5Dig(){
 if(__hg5Phase!=="dig"||!__hg5Stats.shovel||__hg5Range(__hg5HomePos.x,__hg5HomePos.z)>4.5)return false;
 if(performance.now()<__hg5DigCooldown)return true;
 __hg5DigCooldown=performance.now()+600;__hg5DigCount++;
 __hg5Shovel.rotation.z=-.65;setTimeout(()=>{if(__hg5Shovel.parent)__hg5Shovel.rotation.z=0},280);
 __hg5DigProgress.textContent="흙 파기 · "+__hg5DigCount+"/3";__hg5DigProgress.style.display="block";
 __hg5Soil.root.scaling.y=Math.max(.25,1-__hg5DigCount*.22);
 __hg5Soil.root.position.y=-__hg5DigCount*.075;
 xp("DLC_DIG_PROGRESS",{count:__hg5DigCount});
 if(__hg5DigCount>=3){
  __hg5Phase="ladder";__hg5Stats.ladder=true;__hg5Soil.root.setEnabled(false);
  __hg5Soil.hole.parent=null;__hg5Soil.hole.position.copyFrom(__hg5HomePos);__hg5Soil.hole.setEnabled(true);
  __hg5Mission("🪜 흙 아래 사다리 발견! 가까이 가서 E로 내려가기");
  Am("흙을 파자 깊은 구멍 속에 <b>낡았지만 튼튼한 사다리</b>가 나타났어요.<br>사다리를 내려가면 무엇이 있을까요?","사다리 확인");
  xp("DLC_LADDER_DISCOVERED",{digs:3});
 }
 return true;
}
function __hg5StartDescent(toUnderground){
 if(__hg5Transition)return false;
 __hg5Transition={start:performance.now(),duration:1900,from:Rp.position.clone(),to:toUnderground?__hg5LadderBottom.clone():new R(__hg5HomePos.x,0,__hg5HomePos.z),toUnderground};
 Gp.up=Gp.down=Gp.left=Gp.right=false;nm=false;
 if(toUnderground){__hg5Under.setEnabled(true);__hg5Phase="descending";__hg5Mission("🪜 사다리를 내려가는 중…");xp("DLC_LADDER_DESCENDED",{area:"underground"})}
 else {__hg5Phase="ascending";__hg5Mission("🪜 정원으로 돌아가는 중…");xp("DLC_LADDER_ASCENDED",{area:"garden"})}
 return true;
}
function __hg5EnterManor(){
 if(__hg5Phase!=="underground"||__hg5Range(__hg5DoorPos.x,__hg5DoorPos.z)>5)return false;
 __hg5Phase="mansion";__hg5DoorOpen=true;__hg5Stats.entered=true;
 __hg5EntranceLeft.setEnabled(false);__hg5EntranceRight.setEnabled(false);
 Rp.position.set(17,__hg5EarthY,-4.5);Gp.up=Gp.down=Gp.left=Gp.right=false;
 __hg5Mission("🏰 정원 밑 세계의 커다란 저택 발견! 저택을 자유롭게 살펴보세요");
 Am("눈앞에 <b>아주 크고 멀쩡한 저택</b>이 있어요!<br>대리석 기둥, 금빛 장식, 따뜻한 창문이 가득해요.<br>정원 아래에 어떻게 이런 저택이 있었을까요?","저택 둘러보기");
 xp("DLC_MANSION_ENTERED",{location:"grand-mansion"});
 return true;
}
function __hg5PressAction(){
 if(ap.classList.contains("show"))return false;
 if(__hg5Phase==="meet")return __hg5TalkGardener();
 if(__hg5Phase==="dig")return __hg5Dig();
 if(__hg5Phase==="ladder"&&__hg5Range(__hg5HomePos.x,__hg5HomePos.z)<4.5)return __hg5StartDescent(true);
 if((__hg5Phase==="underground"||__hg5Phase==="mansion")&&__hg5Range(__hg5LadderBottom.x,__hg5LadderBottom.z)<4.7)return __hg5StartDescent(false);
 if(__hg5Phase==="underground"&&__hg5Range(__hg5DoorPos.x,__hg5DoorPos.z)<5)return __hg5EnterManor();
 return false;
}
__hg5Action.addEventListener("click",__hg5PressAction);
zm=function(action){
 if(__hg5Phase==="locked")return __hg5OriginalZm(action);
 if(__hg5Transition)return;
 if(action==="talk"){
  if(__hg5PressAction())return;
  if(["dig","ladder","underground","mansion","meet"].includes(__hg5Phase))return;
 }
 if(__hg5Phase==="underground"||__hg5Phase==="mansion"){
  if(action==="jump"){nm=true;tm=0;return}
  if(action==="trap"||action==="slash")return;
 }
 return __hg5OriginalZm(action);
};
Jm=function(){
 if(__hg5Phase!=="locked"){np.textContent="DLC";Yp=performance.now()-Math.min(Xp,419)*1000;return}
 __hg5OriginalJm();
};
Vm=function(){
 if(__hg5Underground()){
  tp.textContent="정원 밑 세계 · 숨겨진 대저택";
  Yf.clearColor=new xn(.095,.125,.175,1);
  Yf.fogDensity=.0015;Yf.fogColor=new H(.13,.16,.20);
  Qf.intensity=.85;Zf.intensity=.67;
  return;
 }
 __hg5OriginalVm();
 if(__hg5Phase!=="locked")tp.textContent="호텔 밖 정원 · 숨겨진 입구";
};
Km=function(dt){
 if(__hg5Transition)return;
 __hg5OriginalKm(dt);
 if(__hg5Phase==="underground"||__hg5Phase==="mansion")Rp.position.y=__hg5EarthY+Math.max(0,Rp.position.y);
};
const __hg5OriginalQm=qm;
qm=function(){
 if(__hg5Phase==="mansion"&&!__hg5Transition){
  const p=Rp.position.clone(),wanted=p.add(new R(4,4,4));
  Xf.position=R.Lerp(Xf.position,wanted,.23);Xf.setTarget(p.add(new R(0,1.5,0)));
  return;
 }
 __hg5OriginalQm();
};
const __hg5OriginalDm=Dm;
Dm=function(stage){__hg5OriginalDm(stage);if(stage<7&&__hg5Phase!=="locked"){__hg5Phase="locked";__hg5Quest.style.display="none";__hg5Action.style.display="none";__hg5Under.setEnabled(false)}};
Yf.onBeforeRenderObservable.add(()=>{
 if(__hg5Phase==="locked")__hg5SetUnlocked();
 if(__hg5Phase==="locked")return;
 const tick=performance.now();
 if(__hg5Transition){
  const x=__hg5Transition,t=Math.min(1,(tick-x.start)/x.duration),e=t*t*(3-2*t);
  Rp.position.copyFrom(R.Lerp(x.from,x.to,e));
  if(t>=1){
   __hg5Transition=null;
   if(x.toUnderground){__hg5Phase="underground";__hg5Stats.seenMansion=true;__hg5Shovel.setEnabled(false);__hg5Mission("🌌 정원 밑 세계 · 멀리 보이는 대저택으로 가기");Am("사다리 아래에는 <b>넓고 고요한 또 하나의 세계</b>가 있었어요.<br>저 멀리 금빛 불빛이 켜진 거대한 저택이 보입니다.","저택을 찾아가기");xp("DLC_UNDERGROUND_REACHED",{area:"underworld"})}
   else {__hg5Phase="ladder";__hg5Under.setEnabled(false);__hg5Shovel.setEnabled(true);__hg5Mission("🌿 정원으로 돌아왔어요. 사다리에서 E를 누르면 다시 내려가요.");xp("DLC_GARDEN_RETURNED",{})}
  }
 }
 const active=__hg5Phase==="underground"||__hg5Phase==="mansion";
 __hg5Location.style.display="block";__hg5Location.textContent=active?"DLC · 정원 밑 세계":"DLC · 정원 아래 비밀";
 if(__hg5Transition){__hg5Action.style.display="none"}
 else if(__hg5Phase==="meet"&&__hg5Range(zp.position.x,zp.position.z)<5.8)__hg5ActionButton("E · 정원사에게 말 걸기");
 else if(__hg5Phase==="dig"&&__hg5Range(__hg5HomePos.x,__hg5HomePos.z)<4.5)__hg5ActionButton("E · 삽으로 흙 파기 "+__hg5DigCount+"/3");
 else if(__hg5Phase==="ladder"&&__hg5Range(__hg5HomePos.x,__hg5HomePos.z)<4.5)__hg5ActionButton("E · 사다리 내려가기");
 else if(active&&__hg5Range(__hg5LadderBottom.x,__hg5LadderBottom.z)<4.7)__hg5ActionButton("E · 사다리 올라가기");
 else if(__hg5Phase==="underground"&&__hg5Range(__hg5DoorPos.x,__hg5DoorPos.z)<5)__hg5ActionButton("E · 저택 문 열기");
 else __hg5Action.style.display="none";
 if(__hg5Phase==="underground"||__hg5Phase==="mansion"){
  __hg4ShopButton.style.display="none";__hg4Sickle.setEnabled(false);__hg4SickleNote.style.display="none";
  __hg5Shovel.setEnabled(false);
  document.getElementById("hg4Combat").style.display="none";
 }
 if(__hg5Phase==="dig"||__hg5Phase==="ladder")__hg5Shovel.setEnabled(true);
 if(__hg5Phase==="mansion")__hg5Location.textContent="DLC · 대저택 발견";
});
window.__ulmoaGardenDlc={
 state:()=>({phase:__hg5Phase,unlocked:__hg5Phase!=="locked",shovel:__hg5Stats.shovel,digs:__hg5DigCount,ladder:__hg5Stats.ladder,transition:!!__hg5Transition,underground:__hg5Underground(),mansion3D:!!Yf.getMeshByName("hg5GrandPortico"),mansionVisible:__hg5Under.isEnabled(),mansionEntered:__hg5Stats.entered,player:[+Rp.position.x.toFixed(2),+Rp.position.y.toFixed(2),+Rp.position.z.toFixed(2)],gardener:[+zp.position.x.toFixed(2),+zp.position.z.toFixed(2)],quest:ep.textContent,mainStage:Kp,lotus:__uLotusCount}),
 // Read-only marker, no skip or teleport helper; QA must actually press keys.
 version:"garden-beneath-v1"
};


/* HOTEL GARDEN V4 — child feedback: NPCs, boss timer, sickle, seed shop. */
const __hg4OrigDm=Dm, __hg4OrigZm=zm, __hg4OrigNm=Nm, __hg4OrigXp=xp;
const __hg4BossStages=new Set([2,4,6]);
const __hg4SeedCatalog=[
 {id:"clover",name:"클로버 씨앗",cost:1,color:[.25,.67,.34]},
 {id:"sun",name:"해바라기 씨앗",cost:2,color:[.98,.76,.15]},
 {id:"bell",name:"종꽃 씨앗",cost:1,color:[.26,.46,.87]},
 {id:"pink",name:"분홍 꽃씨",cost:2,color:[.97,.42,.68]},
 {id:"moon",name:"달빛 씨앗",cost:2,color:[.65,.53,.93]},
 {id:"sky",name:"하늘 꽃씨",cost:1,color:[.38,.8,.87]}
];
let __hg4Coins=4,__hg4Bag={},__hg4Offers=[],__hg4ShopOpen=false,__hg4HasSickle=false,__hg4SwingUntil=0;
const __hg4Rewards=new Set();
try{const saved=JSON.parse(localStorage.getItem("hg-garden-seeds-v4")||"null");if(saved&&Number.isInteger(saved.coins)&&saved.coins>=0&&saved.coins<=999){__hg4Coins=saved.coins;__hg4Bag=saved.bag&&typeof saved.bag==="object"?saved.bag:{}}}catch{}
function __hg4Save(){try{localStorage.setItem("hg-garden-seeds-v4",JSON.stringify({coins:__hg4Coins,bag:__hg4Bag}))}catch{}}
function __hg4Shuffle(){const pool=[...__hg4SeedCatalog];for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}return pool.slice(0,3)}
const __hg4Css=document.createElement("style");
__hg4Css.textContent='#hg4Combat{position:fixed;z-index:25;right:12px;top:159px;width:158px;padding:8px;text-align:center;border:2px solid #f8ce87;border-radius:13px;background:#1c342eee;color:#fff;font:800 13px system-ui}#hg4Combat strong{display:block;font:900 24px system-ui;font-variant-numeric:tabular-nums}#hg4Seeds{position:fixed;top:92px;right:12px;z-index:22;padding:6px 9px;background:#fff9eadd;border:2px solid #668752;border-radius:12px;font:800 13px system-ui;color:#2a4a32}#hg4ShopButton{position:fixed;bottom:80px;right:12px;z-index:25;background:#f8f3cd;color:#21432d;border:2px solid #467a4e;border-radius:13px;padding:11px;font:800 14px system-ui;cursor:pointer}#hg4SickleNote{position:fixed;right:12px;top:137px;z-index:24;background:#e5efdc;color:#20432a;border-radius:9px;padding:4px 8px;font:800 12px system-ui}#hg4Shop{position:fixed;inset:0;z-index:120;display:none;align-items:center;justify-content:center;padding:15px;background:#05190dbd}#hg4Shop.open{display:flex}#hg4ShopCard{width:min(560px,100%);max-height:90vh;overflow:auto;border-radius:19px;border:3px solid #558158;background:#fff9e9;padding:19px;color:#27462f;font-family:system-ui}#hg4ShopCard h2{font-size:25px;margin:0 0 8px}#hg4Offers{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:13px 0}#hg4Shop button{border-radius:12px;border:2px solid #679365;background:#fff;padding:11px 7px;font:750 13px system-ui;color:#25442d;cursor:pointer;min-height:45px}#hg4Shop button:disabled{opacity:.45}#hg4Shop .shop-actions{display:flex;gap:10px}#hg4Shop .shop-actions button{flex:1;background:#dbeecf}#hg4Shop small{color:#63745b}#hg4Shop .icon{display:block;font-size:25px}@media(max-width:700px){#hg4Combat{right:8px;top:132px;width:123px;font-size:11px;padding:5px}#hg4Combat strong{font-size:19px}#hg4Seeds{right:8px;top:82px;font-size:11px}#hg4SickleNote{right:8px;top:116px}#hg4ShopButton{right:8px;bottom:206px;padding:8px}#hg4Offers{grid-template-columns:1fr}#hg4ShopCard{padding:13px}}';
document.head.appendChild(__hg4Css);
const __hg4Combat=document.createElement("div");__hg4Combat.id="hg4Combat";__hg4Combat.style.display="none";document.body.appendChild(__hg4Combat);
const __hg4Seeds=document.createElement("div");__hg4Seeds.id="hg4Seeds";document.body.appendChild(__hg4Seeds);
const __hg4ShopButton=document.createElement("button");__hg4ShopButton.type="button";__hg4ShopButton.id="hg4ShopButton";__hg4ShopButton.style.display="none";__hg4ShopButton.textContent="🌱 큰집 씨앗 상점 · 문 열기 (E/B)";document.body.appendChild(__hg4ShopButton);
const __hg4SickleNote=document.createElement("div");__hg4SickleNote.id="hg4SickleNote";__hg4SickleNote.style.display="none";__hg4SickleNote.textContent="낫 획득 · EYE에서 F 베기";document.body.appendChild(__hg4SickleNote);
const __hg4Shop=document.createElement("div");__hg4Shop.id="hg4Shop";__hg4Shop.setAttribute("role","dialog");__hg4Shop.setAttribute("aria-label","정원 씨앗 가게");
__hg4Shop.innerHTML='<div id="hg4ShopCard"><h2>🌱 정원의 큰집 · 씨앗 상점</h2><p id="hg4Wallet"></p><div id="hg4Offers"></div><p id="hg4Bag"></p><small>3가지 씨앗이 방문마다 무작위로 나와요. 게임 속 씨앗 토큰을 사용하며 실제 결제는 없어요.</small><div class="shop-actions"><button id="hg4PlantButton" type="button">씨앗 심기 (P)</button><button id="hg4CloseShop" type="button">가게 닫기</button></div></div>';
document.body.appendChild(__hg4Shop);
function __hg4Balance(){__hg4Seeds.textContent="🌰 씨앗 토큰 "+__hg4Coins+" · 🌱 "+Object.values(__hg4Bag).reduce((sum,n)=>sum+(Number(n)||0),0)+"개"}
function __hg4ShopDraw(){
 __hg4Balance();document.getElementById("hg4Wallet").textContent="보유 씨앗 토큰 "+__hg4Coins+"개";
 const offers=document.getElementById("hg4Offers");offers.replaceChildren();
 for(const item of __hg4Offers){const b=document.createElement("button");b.type="button";b.disabled=__hg4Coins<item.cost;
  const ico=document.createElement("span");ico.className="icon";ico.textContent="🌱";b.appendChild(ico);
  const tx=document.createElement("span");tx.textContent=item.name+" · 토큰 "+item.cost+"개";b.appendChild(tx);
  b.onclick=()=>{if(__hg4Coins<item.cost)return;__hg4Coins-=item.cost;__hg4Bag[item.id]=(__hg4Bag[item.id]||0)+1;__hg4Save();__hg4ShopDraw()};offers.appendChild(b)}
 document.getElementById("hg4Bag").textContent="내 씨앗: "+(__hg4SeedCatalog.filter(x=>__hg4Bag[x.id]>0).map(x=>x.name+" ×"+__hg4Bag[x.id]).join(" · ")||"아직 없어요");
 document.getElementById("hg4PlantButton").disabled=!Object.values(__hg4Bag).some(n=>Number(n)>0);
}
function __hg4NearShop(){const dx=Math.max(Math.abs(Rp.position.x+5)-3.5,0),dz=Math.max(Math.abs(Rp.position.z+4)-2.4,0);return Rp.position.y>-5&&Math.abs(Rp.position.x+5)<6.3&&Math.abs(Rp.position.z+4)<5.0&&dx*dx+dz*dz<5.5}
function __hg4Open(){if(!qp||Jp||__hg4BossStages.has(Kp)||!__hg4NearShop())return;__hg4ShopOpen=true;__hg4Offers=__hg4Shuffle();Gp.up=Gp.down=Gp.left=Gp.right=false;__hg4ShopDraw();__hg4Shop.classList.add("open")}
function __hg4Close(){__hg4ShopOpen=false;__hg4Shop.classList.remove("open")}
__hg4ShopButton.onclick=__hg4Open;
__hg4Shop.addEventListener("click",e=>{if(e.target===__hg4Shop)__hg4Close()});
document.getElementById("hg4CloseShop").onclick=__hg4Close;
// THE EXISTING 7m × 4.8m HOUSE IS A REAL 360° GARDEN SEED MARKET.
// All four house walls must read "plant and seed shop" without reading text.
// Keep the original house, its footprint and original main door, never add another building.
Np.metadata={...(Np.metadata||{}),purpose:"seed-shop",sourceBuilding:"existing-hotel"};
const __hg4ShopFront=new fc("hg4ShopFrontOnExistingHouse",Yf);__hg4ShopFront.position.set(-5,0,-4);
const __hg4Timber=new H(.40,.24,.13),__hg4Cream=new H(.97,.89,.69),__hg4Green=new H(.14,.43,.29),__hg4Gold=new H(.92,.68,.27);
const __hg4Mint=new H(.65,.83,.63),__hg4PetalPink=new H(.95,.34,.53),__hg4PinkLight=new H(.99,.66,.78);
const __hg4Sun=new H(1,.72,.14),__hg4Sky=new H(.32,.69,.85),__hg4Purple=new H(.65,.43,.86),__hg4SoilBrown=new H(.32,.20,.10);
const __hg4Box=(id,x,y,z,sx,sy,sz,c,parent=__hg4ShopFront)=>__uBox(id,parent,new R(x,y,z),new R(sx,sy,sz),c);
const __hg4Ball=(id,x,y,z,sx,sy,sz,c,parent=__hg4ShopFront)=>__uSphere(id,parent,new R(x,y,z),new R(sx,sy,sz),c);
const __hg4Cylinder=(id,x,y,z,sx,sy,sz,c,parent=__hg4ShopFront)=>__uCyl(id,parent,new R(x,y,z),new R(sx,sy,sz),c);
// Warm buttercream walls, deep greenhouse-green roof: replaces the plain gray block.
Np.material=__uMat("hg4SeedShopSagePlaster",new H(.83,.89,.73));
Pp.material=__uMat("hg4SeedShopForestRoof",new H(.20,.39,.30));
Fp.material=__uMat("hg4SeedShopOldDoorRepainted",__hg4Green);
const __hg4RoofRibbon=__hg4Box("hg4RoofOverhangTrim",0,3.63,0,8.0,.19,5.57,__hg4Timber);
for(const x of [-3.45,3.45]){
 for(const z of [-2.39,2.39])__hg4Box("hg4HouseCornerPost"+x+"_"+z,x,1.78,z,.21,3.5,.21,__hg4Timber);
}
for(const z of [-2.38,2.38])__hg4Box("hg4LongWallBottomTrim"+z,0,.37,z,6.82,.24,.12,__hg4Timber);
for(const x of [-3.52,3.52])__hg4Box("hg4SideWallBottomTrim"+x,x,.37,0,.12,.24,4.54,__hg4Timber);
// Four protruding striped awnings, not a single inaccessible facade.
for(const [face,z,rotation] of [["front",-2.43,0],["back",2.43,Math.PI]]){
 const stall=new fc("hg4MarketAwning"+face,Yf);stall.parent=__hg4ShopFront;stall.position.z=z;stall.rotation.y=rotation;
 __uBox("hg4"+face+"AwningTop",stall,new R(0,2.79,-.56),new R(6.7,.22,1.20),__hg4Green);
 for(let i=0;i<9;i++)__uBox("hg4"+face+"CanopyCreamStripe"+i,stall,new R(-2.91+i*.73,2.91,-.57),new R(.33,.09,1.18),i%2?__hg4Cream:__hg4Sun);
 __uBox("hg4"+face+"AwningEdge",stall,new R(0,2.66,-1.16),new R(6.85,.27,.16),__hg4Gold);
}
for(const x of [-3.53,3.53]){
 const side=new fc("hg4MarketSideAwning"+x,Yf);side.parent=__hg4ShopFront;side.position.x=x;side.rotation.y=x<0?-Math.PI/2:Math.PI/2;
 __uBox("hg4SideAwningRoof"+x,side,new R(0,2.78,-.52),new R(4.57,.18,1.12),__hg4Green);
 for(let i=0;i<7;i++)__uBox("hg4SideAwningStripe"+x+"_"+i,side,new R(-1.9+i*.64,2.9,-.50),new R(.30,.09,1.06),i%2?__hg4Cream:__hg4Sun);
 __uBox("hg4SideAwningEdge"+x,side,new R(0,2.65,-1.04),new R(4.6,.23,.13),__hg4Gold);
}
// Big real entrance with an arched floral motif.
__hg4Box("hg4SeedShopFacadeBoard",0,3.30,-2.66,5.70,.48,.18,__hg4Green);
__hg4Box("hg4ShopDoor",0,1.13,-2.56,1.34,2.18,.12,__hg4Timber);
__hg4Box("hg4ShopDoorGlass",0,1.58,-2.65,.88,1.14,.08,new H(.47,.76,.78));
__hg4Box("hg4ShopDoorGlassCross",0,1.58,-2.71,.1,1.15,.08,__hg4Cream);
__hg4Ball("hg4GoldHandle",.46,1.08,-2.73,.13,.13,.14,__hg4Gold);
__hg4Box("hg4ShopEntranceStep",0,.13,-3.19,2.45,.21,1.12,__hg4Cream);
for(const x of [-2.1,2.1]){
 __hg4Box("hg4ShopWindowFrame"+x,x,1.62,-2.66,1.63,1.65,.16,__hg4Timber);
 __hg4Box("hg4ShopWindowGlass"+x,x,1.64,-2.79,1.35,1.34,.1,new H(.55,.78,.71));
 __hg4Box("hg4ShopWindowShelf"+x,x,.95,-2.96,1.90,.20,.48,__hg4Gold);
}
// Oversized botanical emblems: not text-only signs or emoji-only decorations.
function __hg4Flower(id,x,y,z,color,size=1,parent=__hg4ShopFront,face=0){
 const root=new fc(id,Yf);root.parent=parent;root.position.set(x,y,z);root.rotation.y=face;
 __uCyl(id+"Stem",root,new R(0,-.37,0),new R(.10,.68,.10),__hg4Green);
 for(let p=0;p<5;p++){
  const a=p*2*Math.PI/5;
  const leaf=__uSphere(id+"Petal"+p,root,new R(Math.sin(a)*.43*size,Math.cos(a)*.43*size,.08),new R(.42*size,.49*size,.20*size),color);
  leaf.rotation.z=-a;
 }
 __uSphere(id+"SeedCenter",root,new R(0,0,-.07),new R(.39*size,.39*size,.26*size),__hg4SoilBrown);
 return root;
}
function __hg4Pot(id,x,z,palette,size=1,parent=__hg4ShopFront){
 const group=new fc(id,Yf);group.parent=parent;group.position.set(x,0,z);
 __uCyl(id+"TerracottaPot",group,new R(0,.46*size,0),new R(.77*size,.80*size,.72*size),new H(.72,.36,.21));
 __uCyl(id+"PotRim",group,new R(0,.83*size,0),new R(.89*size,.18*size,.86*size),new H(.90,.54,.28));
 __uCyl(id+"PotSoil",group,new R(0,.93*size,0),new R(.73*size,.08*size,.70*size),__hg4SoilBrown);
 __uCyl(id+"GrowingStem",group,new R(0,1.35*size,0),new R(.10*size,.9*size,.10*size),__hg4Green);
 __uSphere(id+"LeafL",group,new R(-.30*size,1.26*size,0),new R(.57*size,.19*size,.30*size),__hg4Mint);
 __uSphere(id+"LeafR",group,new R(.30*size,1.48*size,0),new R(.57*size,.19*size,.30*size),__hg4Green);
 __hg4Flower(id+"BigBlossom",0,1.95*size,-.02,palette,.66*size,group);
 return group;
}
// Market stalls on both long visible sides and the rear, facing the camera from EVERY direction.
// Each rack has unmistakable 3D seed packet displays, leaves, and large potted flowers.
const __hg4MarketFaces=[
 {n:"east",x:3.55,z:0,a:Math.PI/2,w:4.6},
 {n:"west",x:-3.55,z:0,a:-Math.PI/2,w:4.6},
 {n:"rear",x:0,z:2.48,a:Math.PI,w:6.5},
 {n:"front",x:0,z:-2.48,a:0,w:6.5}
];
const __hg4PacketColors=[__hg4Sun,__hg4PetalPink,__hg4Sky,__hg4Purple,__hg4Mint,__hg4Gold];
for(const f of __hg4MarketFaces){
 const rack=new fc("hg4MarketRack"+f.n,Yf);rack.parent=__hg4ShopFront;
 rack.position.set(f.x,0,f.z);rack.rotation.y=f.a;
 const cols=f.n==="front"?2:3;
 const spacing=f.n==="front"?4.5:1.27;
 const left=f.n==="front"?-2.35:-(cols-1)*spacing/2;
 for(let i=0;i<cols;i++){
  const x=left+i*spacing,c=__hg4PacketColors[(i+(f.n==="rear"?3:f.n==="east"?1:0))%6];
  // Raised produce table projects outside the existing wall and clearly shows merchandise.
  __uBox("hg4MerchCounter"+f.n+i,rack,new R(x,.83,-.82),new R(f.n==="front"?1.30:1.05,.16,1.18),__hg4Timber);
  for(const xx of [-.40,.40])__uBox("hg4CounterLeg"+f.n+i+"_"+xx,rack,new R(x+xx,.43,-.81),new R(.10,.82,.10),__hg4Timber);
  // Two bright vertical illustrated seed packets on every table.
  for(let j=0;j<2;j++){
   const bx=x+(-.22+j*.43),color=__hg4PacketColors[(i+j+2)%6];
   __uBox("hg4SeedPacket"+f.n+i+"_"+j,rack,new R(bx,1.40,-.86),new R(.35,.65,.10),color);
   __uSphere("hg4SeedPacketFlower"+f.n+i+"_"+j,rack,new R(bx,1.45,-.93),new R(.21,.24,.09),j?__hg4PinkLight:__hg4Cream);
   __uBox("hg4PacketSoilMark"+f.n+i+"_"+j,rack,new R(bx,1.14,-.94),new R(.23,.08,.03),__hg4SoilBrown);
  }
  // Large, unmistakable physical pot with blooming sunflower or tulip.
  const pot=new fc("hg4StallPot"+f.n+i,Yf);pot.parent=rack;pot.position.set(x,.84,-1.02);
  __uCyl("hg4VisibleFlowerPot"+f.n+i,pot,new R(0,.22,0),new R(.55,.40,.55),new H(.78,.42,.25));
  __uCyl("hg4PotSoil"+f.n+i,pot,new R(0,.44,0),new R(.49,.07,.48),__hg4SoilBrown);
  __uCyl("hg4PotStem"+f.n+i,pot,new R(0,.74,0),new R(.08,.65,.08),__hg4Green);
  __uSphere("hg4PotLeaf"+f.n+i,pot,new R(.24,.69,0),new R(.42,.15,.25),__hg4Green);
  __hg4Flower("hg4DisplayFlower"+f.n+i,0,1.10,0,c,.58,pot);
 }
 // Oversized freestanding wooden flower crates in front of long side walls.
 for(const side of [-1,1]){
  if(f.n==="front")continue;
  const x=side*(f.n==="rear"?2.55:1.65);
  __uBox("hg4FlowerCrate"+f.n+side,rack,new R(x,.33,-1.90),new R(.98,.66,.86),__hg4Timber);
  __uBox("hg4FlowerCrateSoil"+f.n+side,rack,new R(x,.7,-1.9),new R(.90,.11,.76),__hg4SoilBrown);
  const basketFlower=__hg4Flower("hg4FlowersFromCrate"+f.n+side,x,1.20,-1.93,side>0?__hg4PetalPink:__hg4Sun,.56,rack);
 }
}
// Five huge terracotta flowerpots around the building corners: visible even when zoomed out.
for(const [id,x,z,color,sz] of [
 ["entryL",-2.4,-3.30,__hg4PetalPink,1.02],["entryR",2.4,-3.30,__hg4Sun,1.02],
 ["sideEast",4.05,.65,__hg4Purple,1.08],["sideWest",-4.05,.6,__hg4Sky,1.08],
 ["backCorner",1.8,3.45,__hg4Sun,.98]
])__hg4Pot("hg4LargeOutdoorPot"+id,x,z,color,sz);
// Landmark sprout growing from a terracotta roof planter; unmistakable from aerial camera.
__hg4Box("hg4RoofPlanterBase",0,4.32,0,2.7,.5,1.7,__hg4Timber);
__hg4Box("hg4RoofPlanterSoil",0,4.62,0,2.45,.15,1.52,__hg4SoilBrown);
__hg4Cylinder("hg4RoofSproutStem",0,5.21,0,.23,1.22,.23,__hg4Green);
const leafL=__hg4Ball("hg4RoofGiantSproutLeafLeft",-.7,5.77,0,1.36,.55,.56,__hg4Mint);leafL.rotation.z=-.28;
const leafR=__hg4Ball("hg4RoofGiantSproutLeafRight",.7,5.87,0,1.36,.55,.56,__hg4Green);leafR.rotation.z=.28;
__hg4Ball("hg4RoofSproutTip",0,6.0,0,.36,.43,.35,__hg4Green);
// Make the actual purchase window feel like browsing physical picture-backed packets.
const __hg4MarketStyles=document.createElement("style");
__hg4MarketStyles.textContent='#hg4ShopCard{background:linear-gradient(155deg,#f4f7e6 0%,#fff7e5 65%,#f3e8ce 100%);border:5px solid #537c51;box-shadow:0 13px 50px #0005}#hg4ShopCard h2{color:#24583b;font-size:clamp(20px,3vw,29px)}#hg4Offers button{background:linear-gradient(#fffef6,#eaf1d5);min-height:155px;border:2px solid #7aa16a;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:7px;box-shadow:0 4px 0 #4f724032}#hg4Offers button .icon{font-size:42px;filter:drop-shadow(0px 3px 2px #0002)}#hg4Offers button:hover:not(:disabled){border-color:#b58a2d;transform:translateY(-2px)}#hg4Wallet,#hg4Bag{font-size:16px;font-weight:800}#hg4ShopButton{background:#d9ecb8;border-color:#3a7747;box-shadow:0 4px 13px #0003}@media(max-width:700px){#hg4Offers{grid-template-columns:repeat(3,minmax(0,1fr))}#hg4Offers button{min-height:108px;font-size:11px;padding:5px;gap:3px}#hg4Offers button .icon{font-size:28px}}';
document.head.appendChild(__hg4MarketStyles);
const __hg4SeedVisuals={clover:"🍀",sun:"🌻",bell:"🪻",pink:"🌷",moon:"🌸",sky:"🌼"};
function __hg4UpdatePacketIcons(){const bs=document.querySelectorAll("#hg4Offers button");for(let i=0;i<bs.length;i++){const flower=__hg4SeedVisuals[__hg4Offers[i]?.id]||"🌱";bs[i].querySelector(".icon").textContent=flower;}}
const __hg4ShopDrawBeforeMarket=__hg4ShopDraw;
__hg4ShopDraw=function(){__hg4ShopDrawBeforeMarket();__hg4UpdatePacketIcons()};
const __hg4ShopWorldLabel=document.createElement("div");
__hg4ShopWorldLabel.id="hg4ShopWorldLabel";__hg4ShopWorldLabel.textContent="🌱 씨앗 상점";
__hg4ShopWorldLabel.style.cssText="position:fixed;z-index:17;pointer-events:none;display:none;white-space:nowrap;text-align:center;padding:4px 12px;border-radius:10px;background:#e6f1dff0;color:#214735;border:2px solid #4c774d;box-shadow:0 2px 9px #0006;font:900 16px system-ui;transform:translate(-50%,-50%)";
document.body.appendChild(__hg4ShopWorldLabel);
const __hg4ShopSignAnchor=new fc("hg4SeedShopSignAnchor",Yf);
__hg4ShopSignAnchor.position.set(-5,5.15,-4);
Yf.onAfterRenderObservable.add(()=>{
 if(!__hg4ShopFront.isEnabled()||__hg4ShopOpen||Rp.position.y<-5){__hg4ShopWorldLabel.style.display="none";return}
 const w=Jf.getRenderWidth(),h=Jf.getRenderHeight(),v=Xf.viewport.toGlobal(w,h);
 const pt=R.Project(new R(0,0,0),__hg4ShopSignAnchor.getWorldMatrix(),Yf.getTransformMatrix(),v);
 const x=pt.x/w*innerWidth,y=pt.y/h*innerHeight;
 if(pt.z<0||pt.z>1||x<30||x>innerWidth-30||y<100||y>innerHeight-20){__hg4ShopWorldLabel.style.display="none";return}
 __hg4ShopWorldLabel.style.display="block";__hg4ShopWorldLabel.style.left=x+"px";__hg4ShopWorldLabel.style.top=y+"px";
});
function __hg4Plant(){
 const seed=__hg4SeedCatalog.find(x=>__hg4Bag[x.id]>0);if(!seed){km("먼저 씨앗을 구해요.",1700);return false}
 if(__hg4BossStages.has(Kp)||!qp||Jp){km("보스전이 끝나면 심을 수 있어요.",1800);return false}
 __hg4Bag[seed.id]--;__hg4Save();__hg4Balance();
 const root=new fc("hg4Planted_"+seed.id+"_"+Date.now(),Yf);
 root.position.set(Rp.position.x+1.6,0,Rp.position.z+1.4);
 __uCyl("hg4Stem"+root.name,root,new R(0,.38,0),new R(.09,.75,.09),new H(.2,.57,.23));
 __uSphere("hg4Bloom"+root.name,root,new R(0,.89,0),new R(.65,.49,.65),new H(...seed.color));
 for(let i=0;i<5;i++){const p=__uSphere("hg4Petal"+i+root.name,root,new R(Math.cos(i*1.256)*.41,.89,Math.sin(i*1.256)*.41),new R(.40,.28,.38),new H(...seed.color));p.isPickable=false}
 km(seed.name+"을 심었어요! 🌼",1700);return true;
}
document.getElementById("hg4PlantButton").onclick=()=>{__hg4Close();__hg4Plant()};
const __hg4NpcAnchors=[zp,Bp,Vp].map(n=>({n,base:n.position.clone()}));
function __hg4KeepPeople(){for(const v of __hg4NpcAnchors)v.n.setEnabled(true)}
// Distinct visible clothing and accessories on existing 3D characters.
function __hg4Dress(node,role,i){
 const coat=[new H(.20,.51,.25),new H(.16,.45,.69),new H(.65,.38,.16)][i];
 const boots=new H(.17,.18,.15);
 for(const side of [-1,1]){
  __uBox("hg4"+role+"Boot"+side,node,new R(side*.23,.19,.21),new R(.3,.39,.53),boots);
  __uSphere("hg4"+role+"Ear"+side,node,new R(side*.52,2.52,.08),new R(.15,.23,.13),new H(.79,.59,.45));
 }
 __uBox("hg4"+role+"Collar",node,new R(0,2.20,.40),new R(.63,.15,.13),coat);
 __uBox("hg4"+role+"Belt",node,new R(0,1.09,.34),new R(.78,.12,.14),new H(.27,.20,.13));
 if(i===0){__uBox("hg4GardenerPocket",node,new R(.28,1.50,.48),new R(.29,.26,.09),new H(.77,.61,.32));}
 if(i===1){__uSphere("hg4KeeperBadge",node,new R(.29,1.91,.47),new R(.22,.22,.08),new H(.95,.76,.20));}
 if(i===2){__uBox("hg4TravelerSatchel",node,new R(-.67,1.48,.36),new R(.43,.67,.24),new H(.55,.34,.16));}
}
__hg4Dress(zp,"gardener",0);__hg4Dress(Bp,"keeper",1);__hg4Dress(Vp,"traveler",2);
const __hg4Sickle=new fc("hg4Sickle",Yf);__hg4Sickle.parent=Rp;__hg4Sickle.position.set(.62,1.4,.15);
__uCyl("hg4SickleHandle",__hg4Sickle,new R(0,.19,0),new R(.11,.91,.11),new H(.52,.31,.13));
const __hg4BladePoints=[];for(let k=0;k<=12;k++){const a=-.5+k/12*Math.PI*1.2;__hg4BladePoints.push(new R(.38+Math.cos(a)*.54,.50+Math.sin(a)*.48,0))}
const __hg4Blade=Df.CreateTube("hg4SickleCurvedSteel",{path:__hg4BladePoints,radius:.066,tessellation:9},Yf);
__hg4Blade.parent=__hg4Sickle;__hg4Blade.material=__uMat("hg4SilverBladeMaterial",new H(.80,.88,.89));__hg4Sickle.setEnabled(false);
function __hg4Equip(){__hg4HasSickle=true;__hg4Sickle.setEnabled(true);__hg4SickleNote.style.display="block";km("연못 관리인에게 낫을 받았어요! EYE의 빈틈에 F를 눌러요.",3000)}
// Make individual boss silhouettes noticeably different from ordinary trees.
const __hg4Ivory=new H(.97,.92,.79),__hg4Vine=new H(.08,.42,.14),__hg4Night=new H(.14,.18,.18);
for(let k=0;k<4;k++){const y=3.1+k*.58;const m=__uCyl("hg4WoodsKnot"+k,Hp,new R(k%2?-.62:.72,y,-.43),new R(.42,.47,.20),k%2?__hg4Ivory:__hg4Vine);m.rotation.z=(k%2?-.35:.25)}
for(let k=0;k<5;k++){const a=k*Math.PI*2/5;__uSphere("hg4WoodsWideCrown"+k,Hp,new R(1+Math.cos(a)*1.75,5.48+Math.sin(a)*.23,Math.sin(a)*.62),new R(.69,.38,.52),__hg4Ivory)}
for(let k=0;k<5;k++){const y=1.2+k*.7;__uSphere("hg4EyeGlow"+k,Up,new R(.9*Math.sin(k*2.4),y,-1.42),new R(.25,.25,.12),new H(.33,.78,.37))}
for(let k=0;k<3;k++){const plume=__uSphere("hg4SmogSmoke"+k,Wp,new R((k-1)*.4,5.8+k*.52,-.15),new R(.65+k*.13,.52,.51),__hg4Night);plume.material.alpha=.24}
const __hg4Flame=Df.CreateCylinder("hg4SmogFlameTip",{height:1.25,diameterTop:0,diameterBottom:.74,tessellation:16},Yf);
__hg4Flame.parent=Wp;__hg4Flame.position.set(0,5.6,-.12);__hg4Flame.material=__uMat("hg4FlameGlow",new H(1,.53,.13));
// Keep all human NPCs present; retain all boss spawning and quest state.
Dm=function(stage){__hg4OrigDm(stage);__hg4KeepPeople();rp.style.display="none";__hg4Sickle.setEnabled(__hg4HasSickle)};
Nm=function(){const giveSickle=Kp===3&&jm(Bp)<5.5&&qp&&!Jp;__hg4OrigNm();if(giveSickle&&!__hg4HasSickle)__hg4Equip()};
zm=function(action){
 if(__hg4ShopOpen)return;
 const nearFlower=__hgClosestFlower()?.d<=6;
 if(action==="talk"&&__hg4NearShop()&&!__hg4BossStages.has(Kp)){__hg4Open();return}
 if(action==="talk"&&__hg4BossStages.has(Kp)&&!nearFlower)return;
 if(action==="trap"&&Kp!==2&&!(Kp===6&&dm==="water"&&__uHasBucket))return;
 if(action==="slash"&&Kp===4&&__hg4HasSickle)__hg4SwingUntil=performance.now()+380;
 return __hg4OrigZm(action);
};
xp=function(event,payload={}){__hg4OrigXp(event,payload);if(event==="BOSS_DEFEATED"&&payload.boss&&!__hg4Rewards.has(payload.boss)){__hg4Rewards.add(payload.boss);__hg4Coins=Math.min(999,__hg4Coins+3);__hg4Save();__hg4Balance();km("🌰 씨앗 토큰 3개를 받았어요!",2000)}};
document.addEventListener("keydown",e=>{
 if(e.code==="Enter"&&ap.classList.contains("show")&&!__hg4ShopOpen){e.preventDefault();sp.click()}
 if(__hg4ShopOpen){if(e.code==="Escape"){e.preventDefault();__hg4Close()}return}
 if(e.code==="KeyB"&&!e.repeat&&!["INPUT","TEXTAREA"].includes(e.target?.tagName)){e.preventDefault();__hg4Open()}
 if(e.code==="KeyP"&&!e.repeat&&!["INPUT","TEXTAREA"].includes(e.target?.tagName)){e.preventDefault();__hg4Plant()}
});
const __hg4BossModes={cooldown:"다음 공격 준비",windup:"⚠️ 지금 피하기",vulnerable:"✅ 지금 공격하기",chase:"추격 중",approach:"변화 관찰",danger:"🔥 열기 피하기",water:"🪣 물 붓기"};
Yf.onBeforeRenderObservable.add(()=>{
 // All NPCs stay in the world and casually walk within reach of their original locations.
 const t=performance.now()/1000;
 for(let i=0;i<__hg4NpcAnchors.length;i++){const {n,base}=__hg4NpcAnchors[i];const a=t*.19+i*2.1;
  n.position.x=base.x+Math.sin(a)*.80;n.position.z=base.z+Math.cos(a)*.72;
  const legL=Yf.getMeshByName(n.name+"Leg-1"),legR=Yf.getMeshByName(n.name+"Leg1");if(legL)legL.rotation.x=.22*Math.sin(t*2.4+i);if(legR)legR.rotation.x=-.22*Math.sin(t*2.4+i);
 }
 __hg4SickleNote.style.display=__hg4HasSickle&&[4,5,6,7].includes(Kp)?"block":"none";
 if(__hg4HasSickle){const swing=Math.max(0,(__hg4SwingUntil-performance.now())/380);__hg4Sickle.rotation.z=swing>0?Math.sin((1-swing)*Math.PI)*-.95:0;__hg4Sickle.setEnabled(Kp>=4)}
 const combat=__hg4BossStages.has(Kp)&&qp&&!Jp;
 __hg4Combat.style.display=combat?"block":"none";
 if(combat){const mode=Kp===2?_m:Kp===4?im:dm;
  const until=Kp===2?vm:Kp===4?am:fm;
  const secs=Number.isFinite(until)&&until>performance.now()?((until-performance.now())/1000).toFixed(1):"—";
  const caption=__hg4BossModes[mode]||"상태 확인";
  const progress=Kp===2?Zp+"/2":Kp===4?Qp+"/3":pm+"/3";
  __hg4Combat.innerHTML="<span>"+caption+"</span><strong>"+secs+"초</strong><small>공략 "+progress+"</small>";
 }
 __hg4ShopButton.style.display=__hg4NearShop()&&!__hg4BossStages.has(Kp)&&qp&&!Jp?"block":"none";
});
__hg4Balance();rp.style.display="none";
window.__ulmoaGardenV4={state:()=>({hasSickle:__hg4HasSickle,shopExists:!!Yf.getMeshByName("hg4SeedShopFacadeBoard"),shopIsOriginalBuilding:Np.metadata?.purpose==="seed-shop"&&Math.abs(__hg4ShopFront.position.x-Np.position.x)<.1&&Math.abs(__hg4ShopFront.position.z-Np.position.z)<.1,detachedShopExists:!!Yf.getTransformNodeByName("hg4ShopBuilding"),visualShopFacades:["hg4MarketRackeast","hg4MarketRackwest","hg4MarketRackrear","hg4MarketRackfront"].every(n=>!!Yf.getTransformNodeByName(n)),roofSprout:!!Yf.getMeshByName("hg4RoofGiantSproutLeafLeft"),seedPackets:Yf.meshes.filter(m=>m.name.startsWith("hg4SeedPacket")&&!m.name.includes("Flower")).length,flowerPots:Yf.meshes.filter(m=>m.name.startsWith("hg4VisibleFlowerPot")).length,coins:__hg4Coins,bag:{...__hg4Bag},allNpcs:[zp.isEnabled(),Bp.isEnabled(),Vp.isEnabled()],bossTimer:__hg4Combat.style.display!=="none",nearShop:__hg4NearShop()})};

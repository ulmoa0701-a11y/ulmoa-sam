
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
const __hg4ShopButton=document.createElement("button");__hg4ShopButton.type="button";__hg4ShopButton.id="hg4ShopButton";__hg4ShopButton.style.display="none";__hg4ShopButton.textContent="🌱 씨앗 가게 (B)";document.body.appendChild(__hg4ShopButton);
const __hg4SickleNote=document.createElement("div");__hg4SickleNote.id="hg4SickleNote";__hg4SickleNote.style.display="none";__hg4SickleNote.textContent="낫 획득 · EYE에서 F 베기";document.body.appendChild(__hg4SickleNote);
const __hg4Shop=document.createElement("div");__hg4Shop.id="hg4Shop";__hg4Shop.setAttribute("role","dialog");__hg4Shop.setAttribute("aria-label","정원 씨앗 가게");
__hg4Shop.innerHTML='<div id="hg4ShopCard"><h2>🌱 정원 씨앗 가게</h2><p id="hg4Wallet"></p><div id="hg4Offers"></div><p id="hg4Bag"></p><small>3가지 씨앗이 방문마다 무작위로 나와요. 게임 속 씨앗 토큰을 사용하며 실제 결제는 없어요.</small><div class="shop-actions"><button id="hg4PlantButton" type="button">씨앗 심기 (P)</button><button id="hg4CloseShop" type="button">가게 닫기</button></div></div>';
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
function __hg4NearShop(){return Math.hypot(Rp.position.x+10,Rp.position.z+9)<6.2}
function __hg4Open(){if(!qp||Jp||__hg4BossStages.has(Kp)||!__hg4NearShop())return;__hg4ShopOpen=true;__hg4Offers=__hg4Shuffle();Gp.up=Gp.down=Gp.left=Gp.right=false;__hg4ShopDraw();__hg4Shop.classList.add("open")}
function __hg4Close(){__hg4ShopOpen=false;__hg4Shop.classList.remove("open")}
__hg4ShopButton.onclick=__hg4Open;
__hg4Shop.addEventListener("click",e=>{if(e.target===__hg4Shop)__hg4Close()});
document.getElementById("hg4CloseShop").onclick=__hg4Close;
const __hg4ShopBuilding=new fc("hg4ShopBuilding",Yf);__hg4ShopBuilding.position.set(-10,0,-9);
const __hg4Timber=new H(.51,.33,.16),__hg4Cream=new H(.92,.83,.61),__hg4Green=new H(.30,.49,.31);
__uBox("hg4ShopFloor",__hg4ShopBuilding,new R(0,.1,0),new R(3.9,.2,2.9),__hg4Timber);
__uBox("hg4ShopRearWall",__hg4ShopBuilding,new R(0,1.38,1.25),new R(3.75,2.65,.15),__hg4Cream);
for(const side of [-1,1]){
 __uBox("hg4ShopPost"+side,__hg4ShopBuilding,new R(side*1.8,1.42,-1.12),new R(.19,2.85,.18),__hg4Timber);
 const roof=__uBox("hg4Roof"+side,__hg4ShopBuilding,new R(side*.93,3.12,0),new R(2.28,.22,3.5),__hg4Green);roof.rotation.z=side*.30;
 __uBox("hg4Shelf"+side,__hg4ShopBuilding,new R(side*.80,.72,.63),new R(1.42,.14,.67),__hg4Timber);
}
__uBox("hg4Counter",__hg4ShopBuilding,new R(0,.87,-.8),new R(3.23,.61,.58),__hg4Cream);
for(let i=0;i<6;i++){
 const seed=__uSphere("hg4MarketSeeds"+i,__hg4ShopBuilding,new R(-1.25+(i%3)*1.25,1.34,-.78+Math.floor(i/3)*.22),new R(.24,.27,.24),new H(...__hg4SeedCatalog[i].color));
 seed.isPickable=false;
}
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
window.__ulmoaGardenV4={state:()=>({hasSickle:__hg4HasSickle,shopExists:!!Yf.getMeshByName("hg4ShopRearWall"),coins:__hg4Coins,bag:{...__hg4Bag},allNpcs:[zp.isEnabled(),Bp.isEnabled(),Vp.isEnabled()],bossTimer:__hg4Combat.style.display!=="none",nearShop:__hg4NearShop()})};

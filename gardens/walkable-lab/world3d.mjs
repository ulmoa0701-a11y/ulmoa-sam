/* Moa Garden World — handcrafted lightweight 3D scenery.
   Only decoration; movement, game routing and accessibility stay in walk.js.
   Local vendored Three.js (MIT), no API calls or user tracking. */
import * as THREE from './vendor/three.min.mjs';

const root=document.getElementById('scene');
const original=root?.querySelector('svg.terrain');
if(root&&original&&new URLSearchParams(location.search).get('mode')!=='2d'){
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const random=(()=>{let x=29337;return()=>((x^=x<<13,x^=x>>>17,x^=x<<5)>>>0)/4294967295})();
 const rand=(a,b)=>a+(b-a)*random();
 const col=v=>new THREE.Color(v);
 const materials={
   grass:new THREE.MeshStandardMaterial({color:0xa6c88a,roughness:1}),
   path:new THREE.MeshStandardMaterial({color:0xf5dfae,roughness:.92}),
   edge:new THREE.MeshStandardMaterial({color:0xc9b581,roughness:1}),
   lightStone:new THREE.MeshStandardMaterial({color:0xf9eac8,roughness:.94}),
   wood:new THREE.MeshStandardMaterial({color:0xb98d64,roughness:.83}),
   darkWood:new THREE.MeshStandardMaterial({color:0x795742,roughness:.86}),
   cream:new THREE.MeshStandardMaterial({color:0xf5dcab,roughness:.88}),
   roof:new THREE.MeshStandardMaterial({color:0xaf6e67,roughness:.82}),
   green:new THREE.MeshStandardMaterial({color:0x72a77b,roughness:1}),
   hedge:new THREE.MeshStandardMaterial({color:0x588f6d,roughness:1}),
   gold:new THREE.MeshStandardMaterial({color:0xf7d986,roughness:.58,metalness:.08}),
   stage:new THREE.MeshStandardMaterial({color:0xa78ec6,roughness:.85}),
   pink:new THREE.MeshStandardMaterial({color:0xe5a7c5,roughness:.9}),
   water:new THREE.MeshPhysicalMaterial({color:0x68c8c6,roughness:.24,metalness:.08,transparent:true,opacity:.94,clearcoat:.7,clearcoatRoughness:.08}),
   wall:new THREE.MeshStandardMaterial({color:0xffedc8,roughness:1}),
   glass:new THREE.MeshStandardMaterial({color:0xf7d8a2,emissive:0xf0ac55,emissiveIntensity:.55,roughness:.22})
 };
 const viewport=document.getElementById('viewport');
 const canvas=document.createElement('canvas');
 canvas.className='three-landscape';canvas.setAttribute('aria-hidden','true');
 canvas.style.cssText='position:absolute;inset:0;display:block;width:100%;height:100%;pointer-events:auto;touch-action:none;z-index:2';
 const webgl=(()=>{try{return new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});}catch(e){console.warn('3D garden unavailable; keeping original map',e);return null}})();
 if(webgl){
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xb8d9c1);
  scene.fog=new THREE.Fog(0xb8d9c1,37,72);
  const camera=new THREE.PerspectiveCamera(57,1,.1,130);
  camera.position.set(0,6,11);camera.lookAt(0,0,0);
  const X=x=>(x-800)/50,Z=y=>(y-500)/50;
  const place=(x,y)=>new THREE.Vector3(X(x),0,Z(y));
  const ground=new THREE.Group();scene.add(ground);
  const scenery=new THREE.Group();scene.add(scenery);
  const props=new THREE.Group();scene.add(props);
  const meshes=[];
  function put(geometry,material,x,y,z,group=scenery,shadow=true){
   const m=new THREE.Mesh(geometry,material);
   m.position.set(x,y,z);if(shadow){m.castShadow=true;m.receiveShadow=true}
   group.add(m);meshes.push(m);return m;
  }
  const box=(x,y,z,w,h,d,mat,group=scenery)=>put(new THREE.BoxGeometry(w,h,d),mat,x,y,z,group);
  const ball=(x,y,z,r,mat,group=scenery)=>put(new THREE.SphereGeometry(r,12,9),mat,x,y,z,group);
  const cyl=(x,y,z,top,bottom,height,mat,sides=10,group=scenery)=>put(new THREE.CylinderGeometry(top,bottom,height,sides),mat,x,y,z,group);
  const cone=(x,y,z,r,h,mat,sides=4,group=scenery)=>put(new THREE.ConeGeometry(r,h,sides,1),mat,x,y,z,group);
  function mat(hex){return new THREE.MeshStandardMaterial({color:hex,roughness:.94})}
  const foliage=[0x74b488,0x6eae7e,0x97c68b,0x5f9975,0x8dbd87,0x6aa482,0x9aca91].map(mat);
  const blossom=[0xf1c5d2,0xf8dfe2,0xeac7e1].map(mat);
  const slate=[0xb37682,0xb27b79,0x886980].map(mat);
  const grassCanvas=document.createElement('canvas');grassCanvas.width=256;grassCanvas.height=256;
  const c=grassCanvas.getContext('2d');c.fillStyle='#a5c98e';c.fillRect(0,0,256,256);
  for(let i=0;i<5200;i++){
   c.fillStyle=['#e0edb3','#cce1a1','#75ad7d','#8cbd88','#a0c58a'][Math.floor(rand(0,5))];
   c.globalAlpha=rand(.12,.5);const x=rand(0,256),y=rand(0,256);
   c.fillRect(x,y,rand(.5,2.2),rand(1,3.4));
  }c.globalAlpha=1;
  const grassTexture=new THREE.CanvasTexture(grassCanvas);
  grassTexture.wrapS=grassTexture.wrapT=THREE.RepeatWrapping;grassTexture.repeat.set(7,5);
  grassTexture.colorSpace=THREE.SRGBColorSpace;
  const turf=put(new THREE.PlaneGeometry(70,70),new THREE.MeshStandardMaterial({map:grassTexture,roughness:1}),0,-.22,0,ground,false);
  turf.rotation.x=-Math.PI/2;turf.receiveShadow=true;
  function outline(x,z,r,color){
   const m=cyl(x,-.10,z,r,r,.12,mat(color),40,ground);m.castShadow=false;
   const center=cyl(x,-.03,z,r-.17,r-.17,.13,materials.grass,40,ground);center.receiveShadow=true;
  }
  const fcn=points=>new THREE.CatmullRomCurve3(points.map(([a,b])=>new THREE.Vector3(X(a),0,Z(b))),false,'centripetal');
  function ribbon(curve,width,y,material){
   const steps=48, vertices=[], indices=[],uv=[];
   for(let i=0;i<=steps;i++){
    const t=i/steps,p=curve.getPoint(t),d=curve.getTangent(t);
    const perp=new THREE.Vector3(-d.z,0,d.x).normalize().multiplyScalar(width/2);
    for(const k of [-1,1]){const q=p.clone().addScaledVector(perp,k);vertices.push(q.x,y,q.z);uv.push(k===1?1:0,t*18)}
    if(i<steps){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2)}
   }
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
   const m=put(g,material,0,0,0,ground,false);m.receiveShadow=true;return m;
  }
  const roads=[
   [[800,540],[625,425],[444,320],[314,278]],
   [[800,540],[919,456],[1029,386],[1085,343]],
   [[800,540],[640,642],[450,702],[359,758]],
   [[800,540],[973,610],[1086,675],[1160,736]],
   [[800,540],[799,660],[801,750],[802,839]]
  ];
  for(const route of roads){
   const cv=fcn(route);ribbon(cv,2.03,-.14,materials.hedge);ribbon(cv,1.76,-.11,materials.edge);ribbon(cv,1.53,-.08,materials.path);
   for(let i=1;i<22;i++){
    const p=cv.getPoint(i/22);
    const s=put(new THREE.CylinderGeometry(rand(.22,.39),rand(.22,.39),.035,8),materials.lightStone,p.x,-.035,p.z,ground,false);
    s.scale.set(rand(1.0,1.4),1,rand(.59,.9));s.rotation.y=rand(0,Math.PI);
   }
  }
  // plaza
  const central=place(800,533);
  cyl(central.x,-.055,central.z,1.94,1.98,.27,materials.edge,64,ground);
  cyl(central.x,.012,central.z,1.78,1.82,.20,materials.lightStone,64,ground);
  for(let a=0;a<12;a++){const theta=a*Math.PI/6;const tile=put(new THREE.BoxGeometry(.35,.04,.5),materials.cream,central.x+1.46*Math.cos(theta),.14,central.z+1.46*Math.sin(theta),ground,false);tile.rotation.y=-theta}
  cyl(central.x,.11,central.z,.65,.80,.22,materials.hedge,40,ground);
  cyl(central.x,.19,central.z,.54,.60,.11,materials.water,40,ground);
  ball(central.x,.40,central.z,.22,materials.glass);
  // pond
  const pond=place(1090,287);
  const ring=cyl(pond.x,-.06,pond.z,3.7,3.8,.20,materials.hedge,64,ground);ring.scale.set(1.16,1,.81);
  const shore=cyl(pond.x,.005,pond.z,3.45,3.48,.20,mat(0xa6d4a2),64,ground);shore.scale.set(1.16,1,.79);
  const water=cyl(pond.x,.11,pond.z,3.15,3.15,.07,materials.water,64,ground);water.scale.set(1.16,1,.74);
  const rippleMaterial=new THREE.MeshBasicMaterial({color:0xe4ffff,transparent:true,opacity:.5,depthWrite:false});
  const ripples=[];
  for(const [dx,dz,r] of [[-1.6,.2,.55],[1.3,-.6,.37],[-.25,-.9,.68]]){
   const circle=put(new THREE.TorusGeometry(r,.026,5,48),rippleMaterial.clone(),pond.x+dx,.155,pond.z+dz,props,false);
   circle.rotation.x=Math.PI/2;circle.scale.set(1,.65,1);ripples.push(circle);
  }
  // water lilies
  for(const [dx,dz] of [[-2,-.55],[1.9,0],[.35,.8],[-.7,1.0]]){
   const lily=cyl(pond.x+dx,.18,pond.z+dz,.34,.38,.035,materials.green,10,props);
   lily.scale.z=.65;
   const flower=cyl(pond.x+dx+.04,.23,pond.z+dz,.14,.03,.13,materials.pink,7,props);
  }
  // A bridge at front edge of thinking pond; walk on dry land
  const bridge=box(pond.x,.32,pond.z+2.48,4.4,.32,.95,materials.wood);
  for(let i=0;i<9;i++)box(pond.x-1.95+i*.5,.5,pond.z+2.48,.06,.15,1.03,materials.darkWood);
  for(const side of [-.54,.54]){
   for(let i=0;i<6;i++)cyl(pond.x-2.1+i*.83,.78,pond.z+2.48+side,.07,.07,.6,materials.darkWood,6);
   box(pond.x,.99,pond.z+2.48+side,4.5,.09,.1,materials.cream);
  }
  // buildings built from genuine primitives, not stickers
  const houses=[
   {x:300,z:268,kind:'tree'},
   {x:355,z:760,kind:'book'},
   {x:1160,z:738,kind:'stage'},
   {x:803,z:843,kind:'heart'}
  ];
  function foundation(px,pz,rx,rz,color){
   const p=place(px,pz);
   const m=cyl(p.x,-.015,p.z,rx,rx,.22,mat(color),48,ground);m.scale.z=rz/rx;
   return p;
  }
  function cottage(px,pz,kind){
   const p=foundation(px,pz,3.75,2.8,0x97bb8e);
   const wall=box(p.x,1.04,p.z,3.52,2.0,3.05,materials.wall);
   const door=box(p.x,.72,p.z+1.555,.79,1.45,.11,materials.darkWood);
   const knob=ball(p.x+.22,.72,p.z+1.64,.09,materials.gold);
   for(const off of [-1.1,1.1]){
    const win=box(p.x+off,1.25,p.z+1.574,.59,.72,.12,materials.glass);
    box(p.x+off,1.25,p.z+1.65,.07,.8,.13,materials.wood);
    box(p.x+off,1.25,p.z+1.65,.67,.07,.13,materials.wood);
   }
   const material=kind==='book'?slate[0]:slate[1];
   const top=cone(p.x,3.15,p.z,2.9,1.53,material,4);
   top.rotation.y=Math.PI/4;top.scale.z=1.06;
   box(p.x,2.28,p.z+1.61,3.75,.17,.29,materials.wood);
   if(kind==='book'){
     for(let i=0;i<5;i++){
      const hues=[0x9fb7cf,0xc7a3aa,0xefcd85,0xb5cba2,0xb8a6c5].map(mat);
      const book=box(p.x-1.45+i*.2,.43,p.z+1.73,.16,.65+rand(-.11,.2),.23,hues[i]);book.rotation.z=rand(-.14,.14);
     }
     const round=cyl(p.x,3.12,p.z+1.48,.36,.36,.11,materials.gold,16);
     round.rotation.x=Math.PI/2;
   }
   return p;
  }
  function treehouse(px,pz){
   const p=foundation(px,pz,3.7,2.7,0x90c080);
   cyl(p.x,1.5,p.z,.47,.8,3,materials.wood,11);
   for(let b=0;b<5;b++){
    const bd=ball(p.x+rand(-1.1,1.1),3.08,p.z+rand(-.8,.8),rand(.9,1.25),foliage[b]);bd.scale.y=.8;
   }
   box(p.x,2.25,p.z,3.4,.29,2.8,materials.darkWood);
   box(p.x,3.23,p.z,2.70,1.7,2.34,materials.wall);
   const r=cone(p.x,4.43,p.z,2.2,1.23,slate[0],4);r.rotation.y=Math.PI/4;
   const window=box(p.x,3.25,p.z+1.24,.85,.83,.16,materials.glass);
   box(p.x,2.32,p.z+1.6,3.1,.09,.2,materials.cream);
   for(let i=0;i<6;i++){
     box(p.x-1.56+i*.62,2.65,p.z+1.58,.13,.68,.13,materials.wood);
   }
   // steps/ladder in front
   for(let i=0;i<8;i++){
     box(p.x+1.46,2.0-i*.2,p.z+1.2+i*.19,.57,.07,.22,materials.wood)
   }
   return p;
  }
  function stage(px,pz){
   const p=foundation(px,pz,3.7,2.8,0x9ab67d);
   const st=cyl(p.x,.35,p.z,2.9,3.05,.75,materials.wood,12);
   st.scale.z=.82;
   for(let i=0;i<8;i++){
    const a=i*Math.PI/4;
    cyl(p.x+2.15*Math.cos(a),1.96,p.z+1.8*Math.sin(a),.10,.13,2.6,materials.darkWood,7);
   }
   const roof=cone(p.x,3.66,p.z,3.15,1.85,materials.stage,8);roof.scale.z=.86;
   const trim=cyl(p.x,2.98,p.z,3.15,3.15,.16,materials.pink,8);trim.scale.z=.86;
   for(let i=0;i<5;i++){
    const a=i*1.2;
    const ballm=ball(p.x+Math.cos(a)*1.75,1.0,p.z+Math.sin(a)*1.25,.15,materials.gold);
   }
   const drum=cyl(p.x-.5,1.05,p.z+.65,.42,.42,.55,materials.wall,16);
   const piano=box(p.x+.85,1.15,p.z-.25,1.1,.7,.65,materials.darkWood);
   for(let i=0;i<7;i++)box(p.x+.45+i*.14,1.55,p.z+.1,.12,.035,.19,materials.lightStone)
   return p;
  }
  function gazebo(px,pz){
   const p=foundation(px,pz,3.7,2.7,0xa3c48c);
   for(let i=0;i<4;i++){
    const a=i*Math.PI/2;
    const bx=p.x+2.25*Math.cos(a),bz=p.z+1.6*Math.sin(a);
    cyl(bx,1.55,bz,.1,.12,2.5,materials.wood,8);
   }
   const roof=cone(p.x,3.0,p.z,2.9,1.45,materials.pink,8);roof.scale.z=.75;
   const floor=cyl(p.x,.25,p.z,2.55,2.6,.38,materials.wall,8);
   floor.scale.z=.84;
   // bench
   box(p.x,.76,p.z+.5,1.8,.23,.58,materials.wood);
   box(p.x,1.12,p.z+.82,1.8,.72,.15,materials.darkWood);
   for(const bx of [-.7,.7])box(p.x+bx,.45,p.z+.5,.12,.45,.13,materials.darkWood);
   // trailing vines / blossoms
   for(let i=0;i<17;i++){
     const a=rand(0,Math.PI*2),rr=rand(1.6,2.6);
     ball(p.x+Math.cos(a)*rr,rand(1.75,2.6),p.z+Math.sin(a)*rr*.76,.14+rand(0,.12),blossom[i%3])
   }
   return p;
  }
  treehouse(300,270);cottage(355,744,'book');stage(1160,731);gazebo(801,839);
  // architecture accents and tree avenue. Keep path corridors clear.
  function tree(px,pz,size,kind=0){
   const p=place(px,pz);
   cyl(p.x,.47*size,p.z,.12*size,.18*size,.94*size,materials.wood,7);
   const palette=kind===2?blossom:foliage;
   const mats=kind===1?foliage.slice(2):palette;
   for(const [ox,oy,oz,r] of [[0,1.19,0,.65],[-.45,1.05,.15,.55],[.4,1.12,-.08,.51],[.06,1.54,-.22,.52]]){
    const crown=ball(p.x+ox*size,oy*size,p.z+oz*size,r*size,mats[Math.floor(rand(0,mats.length))]);crown.scale.set(1.09,.92,1.06);
   }
  }
  const treeLocations=[
   [95,258,1.4],[176,122,1.03],[505,169,.97],[694,129,1.1],[885,160,1.1],
   [1431,239,1.48],[1528,476,1.1],[102,612,1.0],[170,929,1.12],
   [548,935,1.08],[1452,927,1.2],[1391,544,1.0],[53,854,.99],
   [1405,128,.91],[1523,111,.93],[640,214,.78],[1337,425,.8],[1338,897,.85],
   [92,408,.77],[442,912,.76],[634,866,.76],[986,928,.72],[1201,978,.81]
  ];
  for(const [x,z,s] of treeLocations)tree(x,z,s,Math.random()<.12?2:0);
  // shrubs/rocks/garden details
  const areas=[[300,270,230,177],[1090,290,270,192],[355,744,248,181],[1160,731,242,200],[801,838,221,163],[800,532,132,120]];
  const near=(x,y,margin=0)=>areas.some(([a,b,rx,ry])=>((x-a)/(rx+margin))**2+((y-b)/(ry+margin))**2<1);
  for(let i=0;i<65;i++){
   const px=rand(28,1572),pz=rand(175,990);
   if(near(px,pz,20))continue;
   const p=place(px,pz),s=rand(.12,.27);
   const bush=ball(p.x,s*.82,p.z,s*1.7,foliage[i%foliage.length]);bush.scale.set(1.5,.9,1.3);
  }
  for(let i=0;i<42;i++){
   const px=rand(30,1570),pz=rand(150,986);
   if(near(px,pz,5))continue;
   const p=place(px,pz),s=rand(.07,.26);
   const rock=put(new THREE.IcosahedronGeometry(s,0),mat(i%3===0?0xc3bc9a:0xe8d7ae),p.x,.06,p.z);
   rock.rotation.y=rand(0,4);rock.scale.set(1.2,.45,1.8)
  }
  // Instanced flowers: visually rich without hundreds of draw calls.
  const flowerGeo=new THREE.SphereGeometry(.055,7,5);
  const stems=new THREE.InstancedMesh(new THREE.CylinderGeometry(.011,.018,.23,5),materials.hedge,220);
  const blooms=new THREE.InstancedMesh(flowerGeo,new THREE.MeshStandardMaterial({color:0xffffff,roughness:1}),220);
  const dummy=new THREE.Object3D(),tempColor=new THREE.Color();
  const flowerColors=[0xf7d7e0,0xffe4a1,0xedcce8,0xffffff,0xdedffa,0xf4b3ca];
  for(let i=0;i<220;i++){
   let px=rand(20,1575),pz=rand(160,995);if(near(px,pz,30)){
    px=rand(80,1550);pz=rand(180,990)
   }
   const p=place(px,pz),sz=rand(.85,1.7);
   dummy.position.set(p.x,.12,p.z);dummy.rotation.set(0,rand(0,6),0);dummy.scale.set(sz,sz,sz);dummy.updateMatrix();stems.setMatrixAt(i,dummy.matrix);
   dummy.position.set(p.x,.29*sz,p.z);dummy.scale.set(sz,sz,sz);dummy.updateMatrix();blooms.setMatrixAt(i,dummy.matrix);
   tempColor.setHex(flowerColors[i%flowerColors.length]);blooms.setColorAt(i,tempColor);
  }
  stems.instanceMatrix.needsUpdate=true;blooms.instanceMatrix.needsUpdate=true;
  scenery.add(stems,blooms);
  // park lanterns
  const lanterns=[[502,374],[1309,425],[526,756],[1045,738],[920,880],[654,470],[881,473]];
  for(const [px,pz] of lanterns){
   const p=place(px,pz);
   cyl(p.x,.52,p.z,.07,.08,1.05,materials.darkWood,6);
   box(p.x,1.13,p.z,.28,.31,.28,materials.glass);
   cone(p.x,1.39,p.z,.29,.25,materials.roof,4).rotation.y=Math.PI/4;
   const light=new THREE.PointLight(0xffe6a2,.35,2.7,2);light.position.set(p.x,1.24,p.z);scene.add(light);
  }
  // gentle atmosphere: baked only by actual lights, not fake UI labels.
  scene.add(new THREE.HemisphereLight(0xf5ffe8,0x739a83,1.5));
  const sunlight=new THREE.DirectionalLight(0xffe6be,2.1);
  sunlight.position.set(-17,28,-9);sunlight.castShadow=true;
  sunlight.shadow.mapSize.set(2048,2048);
  sunlight.shadow.camera.left=-24;sunlight.shadow.camera.right=24;
  sunlight.shadow.camera.top=21;sunlight.shadow.camera.bottom=-21;
  sunlight.shadow.camera.near=.5;sunlight.shadow.camera.far=65;
  sunlight.shadow.normalBias=.06;sunlight.shadow.bias=-.0002;
  scene.add(sunlight);
  scene.add(new THREE.AmbientLight(0xfaf8e0,.2));
  const nearRings={};
  for(const [key,xy] of Object.entries({cognitive:[300,270],thinking:[1090,290],learning:[355,744],music:[1160,731],heart:[801,839]})){
   const p=place(...xy),m=new THREE.Mesh(new THREE.TorusGeometry(2.1,.075,5,64),new THREE.MeshBasicMaterial({color:0xfff4bf,transparent:true,opacity:0.0,depthWrite:false}));
   m.position.set(p.x,.2,p.z);m.rotation.x=Math.PI/2;scene.add(m);nearRings[key]=m;
  }
  webgl.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));
  webgl.outputColorSpace=THREE.SRGBColorSpace;
  webgl.toneMapping=THREE.ACESFilmicToneMapping;
  webgl.toneMappingExposure=1.04;
  webgl.shadowMap.enabled=true;webgl.shadowMap.type=THREE.PCFSoftShadowMap;
  const layer=document.createElement('div');layer.className='three-hotspots';
  layer.setAttribute('aria-label','다섯 정원 진입');
  layer.style.cssText='position:absolute;inset:0;z-index:5;pointer-events:none;overflow:hidden';
  const spots=[...root.querySelectorAll('.place')];
  for(const spot of spots){spot.classList.add('three-portal');layer.append(spot)}
  viewport.insertBefore(canvas,viewport.firstChild);
  viewport.append(layer);
  const actor=document.createElement('img');
  actor.className='three-actor';actor.src='../../assets/moa-hello-wave-20261012.webp';actor.alt='모아';
  actor.draggable=false;actor.style.cssText='position:absolute;width:92px;height:106px;object-fit:contain;pointer-events:none;z-index:4;filter:drop-shadow(1px 9px 7px #2b5b4b80)';
  viewport.append(actor);
  const actorName=document.createElement('span');
  actorName.textContent='모아';actorName.className='three-actor-name';
  actorName.style.cssText='position:absolute;z-index:4;pointer-events:none;min-width:34px;text-align:center;font-size:12px;font-weight:850;border:1px solid #c9dabb;border-radius:99px;background:#fffdf3e9;padding:2px 7px;box-shadow:0 3px 9px #33584470';
  viewport.append(actorName);
  root.style.display='none';
  document.body.classList.add('three-world-ready','third-person');
  const raycaster=new THREE.Raycaster();
  const plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  const tmp=new THREE.Vector3();
  function resize(){
   const w=Math.max(1,viewport.clientWidth),h=Math.max(1,viewport.clientHeight);
   camera.aspect=w/h;camera.updateProjectionMatrix();
   webgl.setSize(w,h,false);
  }
  resize();window.addEventListener('resize',resize,{passive:true});
  function projected(vec){
   const v=vec.clone().project(camera);
   const w=viewport.clientWidth,h=viewport.clientHeight;
   return{x:(v.x*.5+.5)*w,y:(-.5*v.y+.5)*h,on:v.z<1.0&&v.z>-1&&v.x>-1.45&&v.x<1.45&&v.y>-1.6&&v.y<1.6}
  }
  canvas.addEventListener('pointerup',event=>{
   if(event.button!==0||document.querySelector('dialog[open]'))return;
   const box=canvas.getBoundingClientRect();
   const n=new THREE.Vector2(((event.clientX-box.left)/box.width)*2-1,-((event.clientY-box.top)/box.height)*2+1);
   raycaster.setFromCamera(n,camera);
   if(raycaster.ray.intersectPlane(plane,tmp)){
    const x=tmp.x*50+800,y=tmp.z*50+500;
    window.dispatchEvent(new CustomEvent('moa-world-move',{detail:{x,y}}));
   }
  });
  let last=0,visible=true;
  document.addEventListener('visibilitychange',()=>visible=!document.hidden);
  function animate(t){
   requestAnimationFrame(animate);
   if(!visible)return;
   if(t-last<(innerWidth<760?33:24))return;last=t;
   if(!reduce)for(let i=0;i<ripples.length;i++){
    ripples[i].scale.set(1+Math.sin(t/1600+i)*.08,1,1+Math.cos(t/1500+i)*.08);
   }
   const originalActor=document.getElementById('player');
   const playerX=Number.parseFloat(originalActor.style.left)||800;
   const playerY=Number.parseFloat(originalActor.style.top)||610;
   const avatar=place(playerX,playerY);
   const desired=new THREE.Vector3(avatar.x,10.3,avatar.z-13.2);
   camera.position.lerp(desired,.11);
   camera.lookAt(avatar.x,1.05,avatar.z+2.6);
   const screen=projected(new THREE.Vector3(avatar.x,1.05,avatar.z));
   actor.style.left=screen.x+'px';actor.style.top=screen.y+'px';
   const moving=originalActor.classList.contains('moving');
   actor.style.transform='translate(-50%,-90%) '+(moving&&!reduce?'rotate('+Math.sin(t/100)*2.4+'deg)':'');
   actorName.style.left=screen.x+'px';actorName.style.top=(screen.y+9)+'px';
   actorName.style.transform='translate(-50%,0)';
   for(const spot of spots){
    const point=spot.dataset.place;
    const coords={cognitive:[300,270],thinking:[1090,290],learning:[355,744],music:[1160,731],heart:[801,839]}[point];
    const p=place(...coords);
    const projectedSpot=projected(new THREE.Vector3(p.x,2.4,p.z));
    spot.style.left=projectedSpot.x+'px';spot.style.top=projectedSpot.y+'px';
    spot.style.display=projectedSpot.on?'':'none';
   }
   const near=document.querySelector('.place.near')?.dataset.place;
   for(const [key,m] of Object.entries(nearRings)){
    const target=key===near?.64:0;
    m.material.opacity+=(target-m.material.opacity)*.18;
   }
   webgl.render(scene,camera);
  }
  requestAnimationFrame(animate);
  canvas.addEventListener('webglcontextlost',e=>{
   e.preventDefault();document.body.classList.remove('three-world-ready','third-person');
   root.style.display='';layer.remove();canvas.remove();actor.remove();actorName.remove();
   for(const spot of spots)root.append(spot);
  });
  console.info('MoA 3D walking village ready: five places, active 3D camera, approved avatar');
 }
}
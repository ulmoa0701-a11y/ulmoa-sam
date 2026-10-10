import * as THREE from 'three';

const canvas = document.getElementById('brainCanvas');
const holder = document.getElementById('stageShell');
const fallback = document.getElementById('viewerFallback');
const hint = document.getElementById('stageHint');
const orient = document.getElementById('orientationLabel');
const viewButtons = [...document.querySelectorAll('[data-view]')];
const splitButtons = [...document.querySelectorAll('[data-split]')];
const partButtons = [...document.querySelectorAll('[data-part]')];
const range = document.getElementById('separation');
const rangeText = document.getElementById('separationValue');
const rangeOutput = document.getElementById('separationOutput');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const info = {
 'hemisphere-left':{
  name:'좌뇌 · 왼쪽 대뇌반구',category:'좌뇌와 우뇌',
  summary:'대부분의 사람에서 언어 처리의 일부는 좌뇌 쪽에 더 편재합니다. 그렇다고 언어가 왼쪽에만 있는 것은 아닙니다.',
  example:'말을 듣고 이해하거나 글을 읽는 일에도 양쪽 뇌의 넓은 네트워크가 함께 작동해요.'},
 'hemisphere-right':{
  name:'우뇌 · 오른쪽 대뇌반구',category:'좌뇌와 우뇌',
  summary:'일부 공간적 주의 기능에서는 우뇌 쪽이 더 큰 역할을 하기도 합니다. 뇌의 기능을 좌·우 둘로 나눌 수는 없어요.',
  example:'그림의 위치를 살피거나 공간에서 움직일 때 여러 뇌 영역이 협력해요.'},
 frontal:{name:'전두엽',category:'뇌 부위',
  summary:'계획을 세우고 주의·행동을 조절하는 과정에 여러 뇌 영역과 함께 관여합니다.',
  example:'해야 할 일을 순서대로 정하거나 상황에 맞게 행동을 바꿀 때.'},
 parietal:{name:'두정엽',category:'뇌 부위',
  summary:'몸에서 오는 감각과 공간·위치 정보의 통합에 중요한 역할을 합니다.',
  example:'몸과 물체가 어디에 있는지 파악하고 여러 물건 사이의 위치를 비교할 때.'},
 temporal:{name:'측두엽',category:'뇌 부위',
  summary:'소리와 말소리 처리에 관여하며, 깊은 곳의 해마는 새로운 사건 기억을 만드는 데 중요해요.',
  example:'친구의 말을 듣고 이해하거나 어제 있었던 일을 떠올릴 때.'},
 occipital:{name:'후두엽',category:'뇌 부위',
  summary:'눈으로 들어온 시각 정보를 초기 단계에서 분석하는 데 중요한 역할을 합니다.',
  example:'글자와 그림의 선이나 모양을 분석할 때. 의미 이해에는 다른 영역도 필요해요.'},
 cerebellum:{name:'소뇌',category:'뇌 부위',
  summary:'움직임의 정확도와 타이밍, 균형 조절에 중요한 역할을 합니다.',
  example:'공을 잡으려고 손을 뻗거나 몸의 균형을 잡을 때.'},
 brainstem:{name:'뇌줄기',category:'뇌 부위',
  summary:'호흡·심장박동·각성 상태 같은 기본적인 생명 유지 기능에 관여합니다.',
  example:'우리가 의식적으로 생각하지 않아도 숨을 쉬고 몸의 기본 상태를 유지할 때.'}
};
const parts = [
 {key:'frontal',side:'left',p:[ .62,.21,.80],s:[.56,.61,.73],color:0xecaa8a,seed:1},
 {key:'parietal',side:'left',p:[ .62,.49,-.21],s:[.56,.62,.73],color:0xe9c878,seed:2},
 {key:'temporal',side:'left',p:[ .69,-.42,.21],s:[.53,.37,.66],color:0x8ac2a4,seed:3},
 {key:'occipital',side:'left',p:[ .60,.06,-1.09],s:[.49,.54,.51],color:0xaaa2d9,seed:4},
 {key:'frontal',side:'right',p:[-.62,.21,.80],s:[.56,.61,.73],color:0xecaa8a,seed:5},
 {key:'parietal',side:'right',p:[-.62,.49,-.21],s:[.56,.62,.73],color:0xe9c878,seed:6},
 {key:'temporal',side:'right',p:[-.69,-.42,.21],s:[.53,.37,.66],color:0x8ac2a4,seed:7},
 {key:'occipital',side:'right',p:[-.60,.06,-1.09],s:[.49,.54,.51],color:0xaaa2d9,seed:8},
 {key:'cerebellum',side:'left',p:[ .39,-.80,-.98],s:[.40,.34,.46],color:0x82b6d5,seed:9},
 {key:'cerebellum',side:'right',p:[-.39,-.80,-.98],s:[.40,.34,.46],color:0x82b6d5,seed:10},
 {key:'brainstem',side:'center',p:[0,-1.13,-.39],s:[.24,.56,.27],color:0xa7b4c6,seed:11}
];
let renderer,scene,camera,brainGroup,raycaster;
const meshes=[];
let selected = null;
let splitMode = 'together';
let splitAmount = 0;
let yaw = .7, pitch = .25, distance = 5.8;
let targetYaw = yaw, targetPitch = pitch;
let currentView='free';
let activePointer = new Map(), moved=0, pinchLast=null;
let needsRender = true;
const defaultMessage = {
 name:'관심 있는 부분을 골라보세요',
 type:'시작 안내',
 intro:'모형을 직접 누르거나 아래 이름을 선택하면 해당 부위를 강조하고 설명합니다.',
 example:'앞에서 보기는 좌뇌·우뇌를 확인할 때, 옆에서 보기는 주요 대뇌엽의 위치를 알아볼 때 유용해요.'
};
function setNotice(str){
 fallback.hidden=false;
 fallback.querySelector('strong').textContent=str;
}
function makeFoldedGeometry(scale, seed){
 const geometry=new THREE.SphereGeometry(1,38,27);
 const pos=geometry.getAttribute('position');
 const point=new THREE.Vector3();
 for(let i=0;i<pos.count;i++){
  point.fromBufferAttribute(pos,i);
  const longitude=Math.atan2(point.z,point.x);
  const lat=point.y;
  const fold=Math.sin(longitude*13.0 + Math.sin(lat*7+seed)*2.0 + seed*1.11);
  const ridge=Math.sin(lat*13 + longitude*2.5 + seed*.8);
  const wrinkle=Math.sin(longitude*21-lat*10+seed);
  const amount=1 + fold*ridge*.046 + wrinkle*.016;
  pos.setXYZ(i,point.x*amount*scale[0],point.y*amount*scale[1],point.z*amount*scale[2]);
 }
 pos.needsUpdate=true;
 geometry.computeVertexNormals();
 return geometry;
}
function init() {
 try {
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'default'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.8));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.33;
 }catch(error){setNotice('이 기기에서 3D 그래픽을 시작하지 못했습니다.');return false;}
 scene=new THREE.Scene();
 camera=new THREE.PerspectiveCamera(38,1,.1,100);
 brainGroup=new THREE.Group();scene.add(brainGroup);
 scene.add(new THREE.HemisphereLight(0xfff5de,0x71918a,2.2));
 const light=new THREE.DirectionalLight(0xfff9ed,3.1);light.position.set(-3,5,7);scene.add(light);
 const back=new THREE.DirectionalLight(0xaac9dc,1.8);back.position.set(4,2,-5);scene.add(back);
 const under=new THREE.DirectionalLight(0xe3ddfa,.8);under.position.set(0,-3,3);scene.add(under);
 // Each model part is a simplified, independently selectable educational region.
 for(const data of parts){
   const material=new THREE.MeshStandardMaterial({
    color:data.color,roughness:.91,metalness:0,flatShading:false,
    emissive:0x000000,emissiveIntensity:.22
   });
   const mesh=new THREE.Mesh(makeFoldedGeometry(data.s,data.seed),material);
   mesh.position.set(...data.p);
   mesh.userData={key:data.key,side:data.side,base:new THREE.Vector3(...data.p)};
   brainGroup.add(mesh);meshes.push(mesh);
 }
 // Subtle ground disk anchors the 3D model visually without hiding anatomy.
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(1.65,72),new THREE.MeshBasicMaterial({color:0x74887c,transparent:true,opacity:.09,depthWrite:false}));
 shadow.rotation.x=-Math.PI/2;shadow.position.set(0,-1.76,0);scene.add(shadow);
 raycaster=new THREE.Raycaster();
 resize();
 if('ResizeObserver' in window)new ResizeObserver(resize).observe(holder);
 else window.addEventListener('resize',resize);
 bindEvents();
 applyMode('together');
 applySplit(true);
 refreshSelection();
 fallback.hidden=true;
 setView('free',true);
 requestAnimationFrame(renderFrame);
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();setNotice('3D 연결이 끊겼습니다. 페이지를 새로고침해 주세요.');});
 return true;
}
function resize(){
 if(!renderer||!camera)return;
 const w=Math.max(1,holder.clientWidth),h=Math.max(1,holder.clientHeight);
 renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();needsRender=true;
}
function partOffset(mesh){
 const id=mesh.userData,base=id.base;
 const sign=id.side==='left'?1:id.side==='right'?-1:0;
 if(splitMode==='together')return base.clone();
 const t=splitAmount/100;
 const out=base.clone();
 if(splitMode==='hemispheres'){
   if(sign)out.x+=sign*t*.94;
   if(id.key==='cerebellum')out.y-=t*.13;
 }else{
   if(sign)out.x+=sign*t*.85;
   const regionMoves={frontal:[0,.2,.65],parietal:[0,.58,-.12],
    temporal:[0,-.44,.32],occipital:[0,.08,-.75],
    cerebellum:[0,-.83,-.55],brainstem:[0,-.9,.20]};
   const m=regionMoves[id.key]||[0,0,0];
   out.add(new THREE.Vector3(m[0]*t,m[1]*t,m[2]*t));
 }
 return out;
}
function applySplit(instant=false){
 for(const mesh of meshes){const p=partOffset(mesh);if(instant)mesh.position.copy(p);else mesh.userData.destination=p;}
 needsRender=true;
}
function applyMode(mode){
 splitMode=mode;
 splitAmount=mode==='together'?0:Math.max(60,splitAmount);
 range.disabled=mode==='together';
 range.value=String(splitAmount);
 rangeText.textContent=splitAmount+'%';
 rangeOutput.textContent=splitAmount+'%';
 splitButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.split===mode)));
 applySplit();
}
function viewHeading(key){
 return {front:'앞에서: 화면 오른쪽이 아이의 좌뇌',back:'뒤에서: 화면 왼쪽이 아이의 좌뇌',
 left:'아이의 왼쪽 옆모습',right:'아이의 오른쪽 옆모습',
 top:'위에서: 화면 왼쪽이 아이의 좌뇌',free:'드래그하면 원하는 방향으로 돌릴 수 있어요'}[key]||'';
}
function setView(which,instant=false){
 const target={front:[0,.10],back:[Math.PI,.10],left:[Math.PI/2,.18],
  right:[-Math.PI/2,.18],top:[0,1.53],free:[.7,.25]}[which];
 if(!target)return;
 currentView=which;
 targetYaw=target[0];targetPitch=target[1];
 if(which==='top') instant=true;
 if(instant){yaw=targetYaw;pitch=targetPitch;}
 orient.textContent=viewHeading(which);
 viewButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===which)));
 needsRender=true;
}
function updateCamera(){
 // A near-vertical top view requires a stable explicit screen-up direction.
 const isTop=currentView==='top' && Math.abs(pitch-1.53)<.02;
 camera.up.set(0,isTop?0:1,isTop?1:0);
 camera.position.set(
  distance*Math.sin(yaw)*Math.cos(pitch),
  distance*Math.sin(pitch),
  distance*Math.cos(yaw)*Math.cos(pitch)
 );
 camera.lookAt(0,-.12,0);
}
function refreshSelection(){
 for(const mesh of meshes){
  const match=!selected||(selected.startsWith('hemisphere-')
   ?mesh.userData.side===selected.split('-')[1]
   :mesh.userData.key===selected);
  mesh.material.transparent=Boolean(selected&&!match);
  mesh.material.opacity=match?1:.28;
  mesh.material.depthWrite=match;
  mesh.material.emissive.setHex(selected&&match?0x203525:0x000000);
  mesh.material.emissiveIntensity=selected&&match?.20:0;
 }
 const item=selected?info[selected]:null;
 document.getElementById('selectedType').textContent=item?item.category:defaultMessage.type;
 document.getElementById('selectedName').textContent=item?item.name:defaultMessage.name;
 document.getElementById('selectedIntro').textContent=item?item.summary:defaultMessage.intro;
 document.getElementById('selectedExample').textContent=item?item.example:defaultMessage.example;
 partButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.part===selected)));
 needsRender=true;
}
function setSelected(key){selected=info[key]?key:null;refreshSelection();}
function bindEvents(){
 viewButtons.forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
 splitButtons.forEach(button=>button.addEventListener('click',()=>applyMode(button.dataset.split)));
 range.addEventListener('input',()=>{
  splitAmount=Number(range.value);
  if(splitMode==='together'&&splitAmount>0)splitMode='hemispheres';
  rangeText.textContent=splitAmount+'%';rangeOutput.textContent=splitAmount+'%';
  applySplit();needsRender=true;
 });
 partButtons.forEach(button=>button.addEventListener('click',()=>setSelected(button.dataset.part)));
 document.getElementById('clearSelection').addEventListener('click',()=>setSelected(null));
 document.getElementById('resetCamera').addEventListener('click',()=>{distance=5.8;setView('free');});
 canvas.addEventListener('wheel',event=>{event.preventDefault();distance=THREE.MathUtils.clamp(distance+event.deltaY*.005,3.0,9.0);needsRender=true;},{passive:false});
 canvas.addEventListener('pointerdown',event=>{
  canvas.setPointerCapture(event.pointerId);
  activePointer.set(event.pointerId,{x:event.clientX,y:event.clientY});
  moved=0;
 });
 canvas.addEventListener('pointermove',event=>{
  if(!activePointer.has(event.pointerId))return;
  const last=activePointer.get(event.pointerId);
  const dx=event.clientX-last.x,dy=event.clientY-last.y;
  activePointer.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(activePointer.size===2){
   const pts=[...activePointer.values()];
   const gap=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
   if(pinchLast!==null)distance=THREE.MathUtils.clamp(distance-(gap-pinchLast)*.018,3,9);
   pinchLast=gap;moved+=15;needsRender=true;return;
  }
  moved+=Math.abs(dx)+Math.abs(dy);
  if(moved<2)return;
  currentView='free';viewButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view==='free')));
  yaw-=dx/(holder.clientWidth||600)*Math.PI*2;
  pitch=THREE.MathUtils.clamp(pitch+dy/(holder.clientHeight||500)*Math.PI*1.1,-1.27,1.48);
  targetYaw=yaw;targetPitch=pitch;
  orient.textContent=viewHeading('free');needsRender=true;
 });
 const endPointer=(event)=>{
  if(!activePointer.has(event.pointerId))return;
  if(moved<8&&activePointer.size===1)pickAt(event);
  activePointer.delete(event.pointerId);
  if(activePointer.size<2)pinchLast=null;
 };
 canvas.addEventListener('pointerup',endPointer);
 canvas.addEventListener('pointercancel',event=>{activePointer.delete(event.pointerId);pinchLast=null;});
 canvas.addEventListener('keydown',event=>{
  if(event.key==='ArrowLeft'){yaw-=.16;targetYaw=yaw;needsRender=true;}
  else if(event.key==='ArrowRight'){yaw+=.16;targetYaw=yaw;needsRender=true;}
  else if(event.key==='ArrowUp'){pitch=THREE.MathUtils.clamp(pitch+.12,-1.27,1.48);targetPitch=pitch;needsRender=true;}
  else if(event.key==='ArrowDown'){pitch=THREE.MathUtils.clamp(pitch-.12,-1.27,1.48);targetPitch=pitch;needsRender=true;}
  else return;
  event.preventDefault();currentView='free';orient.textContent=viewHeading('free');
 });
}
function pickAt(event){
 const box=canvas.getBoundingClientRect();
 const mouse=new THREE.Vector2(
  (event.clientX-box.left)/box.width*2-1,
  -((event.clientY-box.top)/box.height*2-1));
 raycaster.setFromCamera(mouse,camera);
 const hits=raycaster.intersectObjects(meshes,false);
 if(hits.length){
  const id=hits[0].object.userData;
  if(id.key==='cerebellum'||id.key==='brainstem')setSelected(id.key);
  else setSelected(id.key);
 }
}
function renderFrame(){
 if(!renderer)return;
 requestAnimationFrame(renderFrame);
 if(document.hidden)return;
 let dirty=needsRender;
 if(Math.abs(targetYaw-yaw)>.0004||Math.abs(targetPitch-pitch)>.0004){
  const factor=reducedMotion?1:.19;
  yaw+=(targetYaw-yaw)*factor;pitch+=(targetPitch-pitch)*factor;dirty=true;
 }
 for(const mesh of meshes){
  const to=mesh.userData.destination;
  if(to&&mesh.position.distanceToSquared(to)>.000005){
   if(reducedMotion)mesh.position.copy(to);else mesh.position.lerp(to,.16);
   dirty=true;
  }
 }
 if(dirty){updateCamera();renderer.render(scene,camera);needsRender=false;}
}
if(!init()) console.warn('3D brain fallback active');

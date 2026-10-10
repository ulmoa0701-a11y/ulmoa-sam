import * as THREE from 'three';

const canvas = document.getElementById('brainCanvas');
const holder = document.getElementById('stageShell');
const fallback = document.getElementById('viewerFallback');
const hint = document.getElementById('stageHint');
const orient = document.getElementById('orientationLabel');
const viewButtons = [...document.querySelectorAll('[data-view]')];
const splitButtons = [...document.querySelectorAll('[data-split]')];
const partButtons = [...document.querySelectorAll('[data-part]')];
const calloutButtons = [...document.querySelectorAll('[data-callout]')];
const modeButtons = [...document.querySelectorAll('[data-map-mode]')];
const activityButtons = [...document.querySelectorAll('[data-activity]')];
const leaderLines = document.getElementById('leaderLines');
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
 {key:'frontal',side:'left',p:[ .62,.21,.80],s:[.56,.61,.73],color:0xba9ae9,seed:1},
 {key:'parietal',side:'left',p:[ .62,.49,-.21],s:[.56,.62,.73],color:0xf4d47c,seed:2},
 {key:'temporal',side:'left',p:[ .69,-.42,.21],s:[.53,.37,.66],color:0xa6dcb2,seed:3},
 {key:'occipital',side:'left',p:[ .60,.06,-1.09],s:[.49,.54,.51],color:0xf0ad91,seed:4},
 {key:'frontal',side:'right',p:[-.62,.21,.80],s:[.56,.61,.73],color:0xba9ae9,seed:5},
 {key:'parietal',side:'right',p:[-.62,.49,-.21],s:[.56,.62,.73],color:0xf4d47c,seed:6},
 {key:'temporal',side:'right',p:[-.69,-.42,.21],s:[.53,.37,.66],color:0xa6dcb2,seed:7},
 {key:'occipital',side:'right',p:[-.60,.06,-1.09],s:[.49,.54,.51],color:0xf0ad91,seed:8},
 {key:'cerebellum',side:'left',p:[ .39,-.80,-.98],s:[.40,.34,.46],color:0x95c5ee,seed:9},
 {key:'cerebellum',side:'right',p:[-.39,-.80,-.98],s:[.40,.34,.46],color:0x95c5ee,seed:10},
 {key:'brainstem',side:'center',p:[0,-1.13,-.39],s:[.24,.56,.27],color:0xb5adc7,seed:11}
];
let renderer,scene,camera,brainGroup,raycaster;
const meshes=[];
let selected = 'frontal';
let activeFunction = null;
let activeActivity = null;
let mapMode = 'regions';
const regionSummary = {
 frontal:{name:'전두엽',skills:'계획 · 집중 · 조절',icon:'💡',color:'#ba9ae9'},
 parietal:{name:'두정엽',skills:'공간 · 감각 · 수 개념',icon:'✋',color:'#f4d47c'},
 temporal:{name:'측두엽',skills:'언어 · 듣기 · 기억',icon:'💬',color:'#a6dcb2'},
 occipital:{name:'후두엽',skills:'보기 · 시각 처리',icon:'👁️',color:'#f0ad91'},
 cerebellum:{name:'소뇌',skills:'균형 · 움직임',icon:'🏃',color:'#95c5ee'},
 brainstem:{name:'뇌줄기',skills:'호흡 · 깨어 있기',icon:'💗',color:'#b5adc7'}
};
const functionDetails={
 frontal:{name:'계획·주의집중',skills:'전두엽 · 두정엽 등',icon:'💡',color:'#ba9ae9',category:'함께 작동하는 인지기능',regions:['frontal','parietal'],summary:'계획을 세우고 필요한 정보에 주의를 기울이는 과정에는 여러 뇌 영역이 함께 참여해요.',example:'숙제를 시작하기 전에 순서를 정하고, 다른 소음이 들려도 과제에 주의를 돌릴 때.'},
 parietal:{name:'공간·몸 감각',skills:'두정엽 · 후두엽 등',icon:'✋',color:'#f4d47c',category:'함께 작동하는 인지기능',regions:['parietal','occipital'],summary:'물체의 위치와 몸의 움직임을 이해하는 데 감각·시각·주의 네트워크가 함께 참여해요.',example:'퍼즐 조각의 위치를 맞추고 공이 오는 방향을 살필 때.'},
 temporal:{name:'말 듣기·이해',skills:'측두엽 · 전두엽 등',icon:'💬',color:'#a6dcb2',category:'함께 작동하는 인지기능',regions:['temporal','frontal'],summary:'소리를 듣고 말뜻을 파악하고 답하는 과정에는 여러 언어 관련 뇌 영역이 연결되어 작동해요.',example:'친구의 이야기를 듣고 질문에 적절히 답할 때.'},
 occipital:{name:'시각 정보 이해',skills:'후두엽 · 두정엽 등',icon:'👁️',color:'#f0ad91',category:'함께 작동하는 인지기능',regions:['occipital','parietal'],summary:'눈으로 본 선과 모양을 분석하고 위치를 알아보는 과정에는 여러 시각 관련 경로가 필요해요.',example:'그림 속 물건을 찾고 글자의 모양을 구별할 때.'},
 cerebellum:{name:'균형·움직임 조절',skills:'소뇌 · 두정엽 · 전두엽 등',icon:'🏃',color:'#95c5ee',category:'함께 작동하는 인지기능',regions:['cerebellum','parietal','frontal'],summary:'움직임을 계획하고 몸의 위치를 느끼며 정확한 타이밍으로 행동할 때 여러 뇌 영역이 협력해요.',example:'공을 잡으려고 손을 뻗거나 균형을 유지할 때.'},
 brainstem:{name:'호흡·각성 유지',skills:'뇌줄기와 연결된 여러 회로',icon:'💗',color:'#b5adc7',category:'기본적인 생명 유지 기능',regions:['brainstem'],summary:'뇌줄기는 호흡, 심장박동과 깨어 있는 상태의 조절에 중요해요.',example:'우리가 의식적으로 생각하지 않아도 숨을 쉬고 기본적인 신체 상태를 유지할 때.'}
};
const activityDetails={
 reading:{name:'책 읽기',icon:'📖',color:'#a6dcb2',skills:'보기 · 언어 이해 · 주의',regions:['occipital','temporal','frontal'],category:'생활 속 인지기능',summary:'글자 모양을 보고 말소리와 뜻을 연결할 때 여러 영역이 협력해요.',example:'짧은 문장을 눈으로 따라가고 읽은 내용을 이해할 때.'},
 instructions:{name:'지시 따르기',icon:'📝',color:'#ba9ae9',skills:'듣기 · 작업기억 · 계획',regions:['temporal','frontal','parietal'],category:'생활 속 인지기능',summary:'말을 듣고 이해한 내용을 잠깐 유지하면서 행동 순서를 정하는 과정이에요.',example:'“가방 놓고 손 씻자”라는 말을 듣고 순서대로 실행할 때.'},
 ball:{name:'공놀이',icon:'⚽',color:'#95c5ee',skills:'시각 · 공간 · 균형',regions:['occipital','parietal','cerebellum'],category:'생활 속 인지기능',summary:'공이 오는 방향을 보고 몸을 움직이고 손동작 타이밍을 조절해요.',example:'날아오는 공을 눈으로 좇고 팔을 뻗어 잡으려고 할 때.'},
 memory:{name:'기억하기',icon:'💭',color:'#a6dcb2',skills:'측두엽 안쪽 해마 등 · 전두엽',regions:['temporal','frontal'],category:'생활 속 인지기능',summary:'새로운 사건을 기억하고 나중에 떠올리는 일에는 해마를 포함해 여러 영역이 참여해요.',example:'어제 있었던 일을 이야기하거나 전에 들은 지시를 떠올릴 때.'}
};
let splitMode = 'together';
let splitAmount = 0;
let yaw = .7, pitch = .25, distance = 5.8;
let targetYaw = yaw, targetPitch = pitch;
let currentView='free';
let activePointer = new Map(), moved=0, pinchLast=null;
let needsRender = true;
const defaultMessage = {
 name:'전두엽',
 type:'지금 보는 부위',
 intro:'계획을 세우고 주의를 조절하는 과정에 여러 뇌 영역과 함께 관여합니다.',
 example:'해야 할 일을 순서대로 정하거나 상황에 맞게 행동을 바꿀 때.'
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
  // 동글동글한 장난감 같은 인상: 주름 변형을 줄여 징그러운 질감을 피합니다.
  const amount=1 + fold*ridge*.009 + wrinkle*.003;
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
   // 하나의 뇌 부위가 부드러운 작은 곡면들로 연결된 파스텔 장난감처럼 보이게 표현
   // 자식 메시는 부모와 색상·선택 상태를 공유하므로 분리 기능에 영향이 없습니다.
   if(data.key!=='brainstem'){
     const sign=data.side==='left'?1:-1;
     const puffPositions=[
      [-.17,.25,.33,.41],[.15,.28,.30,.36],[.30,-.02,.25,.38],
      [-.27,-.10,.26,.36],[.04,-.25,.37,.40]
     ];
     for(const [xx,yy,zz,rr] of puffPositions){
       const puff=new THREE.Mesh(new THREE.SphereGeometry(1,24,17),material);
       puff.position.set(xx*data.s[0]*sign,yy*data.s[1],zz*data.s[2]);
       puff.scale.set(rr*data.s[0]*1.25,rr*data.s[1]*1.22,rr*data.s[2]*.9);
       mesh.add(puff);
     }
   }
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
 updateCalloutMode();
 fallback.hidden=true;
 setView('free',true);
 requestAnimationFrame(renderFrame);
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();setNotice('3D 연결이 끊겼습니다. 페이지를 새로고침해 주세요.');});
 return true;
}
function resize(){
 if(!renderer||!camera)return;
 const w=Math.max(1,canvas.clientWidth||holder.clientWidth),h=Math.max(1,canvas.clientHeight||holder.clientHeight);
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

function regionsToHighlight(){
 if(activeActivity)return activityDetails[activeActivity].regions;
 if(activeFunction)return functionDetails[activeFunction].regions;
 return selected&&!selected.startsWith('hemisphere-')?[selected]:null;
}
function refreshSelection(){
 const regionKeys=regionsToHighlight();
 for(const mesh of meshes){
  const match=regionKeys?regionKeys.includes(mesh.userData.key):
   !selected||(selected.startsWith('hemisphere-')?mesh.userData.side===selected.split('-')[1]:mesh.userData.key===selected);
  mesh.material.transparent=Boolean((selected||activeFunction||activeActivity)&&!match);
  mesh.material.opacity=match?1:.25;
  mesh.material.depthWrite=match;
  mesh.material.emissive.setHex((selected||activeFunction||activeActivity)&&match?0x162b1b:0);
  mesh.material.emissiveIntensity=match?.12:0;
 }
 const item=activeActivity?activityDetails[activeActivity]:
  activeFunction?functionDetails[activeFunction]:selected?info[selected]:null;
 const display=item||defaultMessage;
 const region=selected?regionSummary[selected]:null;
 document.getElementById('selectedType').textContent=display.category||display.type||'지금 보는 부위';
 document.getElementById('selectedName').textContent=display.name;
 document.getElementById('selectedIntro').textContent=display.summary||display.intro;
 document.getElementById('selectedExample').textContent=display.example;
 document.getElementById('selectedSkills').textContent=display.skills||region?.skills||'여러 영역이 함께 작동해요';
 document.getElementById('selectedSymbol').textContent=display.icon||region?.icon||'🧠';
 const header=document.querySelector('.selected-heading');
 if(header)header.style.background=display.color||region?.color||'#eef6ed';
 partButtons.forEach(b=>b.setAttribute('aria-pressed',String(!activeActivity&&!activeFunction&&b.dataset.part===selected)));
 calloutButtons.forEach(b=>b.setAttribute('aria-pressed',String((activeFunction&&b.dataset.callout===activeFunction)||(!activeFunction&&!activeActivity&&b.dataset.callout===selected))));
 activityButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.activity===activeActivity)));
 needsRender=true;
}
function setSelected(key){selected=info[key]?key:null;activeFunction=null;activeActivity=null;refreshSelection();}
function setFunction(key){if(!functionDetails[key])return;activeFunction=key;selected=null;activeActivity=null;refreshSelection();}
function setActivity(key){if(!activityDetails[key])return;activeActivity=key;activeFunction=null;selected=null;refreshSelection();}
function updateCalloutMode(){
 const fnLabels={frontal:'계획·집중',parietal:'공간지각',temporal:'말 듣기',occipital:'시각처리',cerebellum:'움직임 조절',brainstem:'호흡·각성'};
 for(const button of calloutButtons){
  const region=regionSummary[button.dataset.callout];
  button.querySelector('b').textContent=mapMode==='functions'?fnLabels[button.dataset.callout]:region.name;
  button.querySelector('small').textContent=mapMode==='functions'?'관련 부위 함께 보기':region.skills;
 }
 modeButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mapMode===mapMode)));
 needsRender=true;
}
function setMapMode(mode){
 if(mode!=='regions'&&mode!=='functions')return;
 mapMode=mode;
 if(mode==='functions')setFunction('frontal');else setSelected('frontal');
 updateCalloutMode();
}
function drawLeaders(){
 if(!leaderLines)return;
 if(window.innerWidth<=680){leaderLines.replaceChildren();return;}
 const stage=holder.getBoundingClientRect(),view=canvas.getBoundingClientRect();
 if(!stage.width||!stage.height)return;
 leaderLines.setAttribute('viewBox',`0 0 ${stage.width} ${stage.height}`);
 leaderLines.replaceChildren();
 for(const button of calloutButtons){
  const key=button.dataset.callout;
  const mesh=meshes.find(m=>m.userData.key===key&&(m.userData.side==='left'||key==='brainstem'));
  if(!mesh)continue;
  const projected=mesh.getWorldPosition(new THREE.Vector3()).project(camera);
  const x=view.left-stage.left+(projected.x+1)*view.width/2;
  const y=view.top-stage.top+(1-projected.y)*view.height/2;
  if(x<0||y<0||x>stage.width||y>stage.height)continue;
  const b=button.getBoundingClientRect();
  const cx=b.left-stage.left+b.width/2,cy=b.top-stage.top+b.height/2;
  const fromX=cx<x?b.right-stage.left:b.left-stage.left;
  const color=regionSummary[key].color;
  const line=document.createElementNS('http://www.w3.org/2000/svg','line');
  for(const [attr,val] of [['x1',fromX],['y1',cy],['x2',x],['y2',y],['stroke',color]])line.setAttribute(attr,String(val));
  const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');
  for(const [attr,val] of [['cx',x],['cy',y],['r',6],['fill',color]])dot.setAttribute(attr,String(val));
  leaderLines.append(line,dot);
 }
}
function bindEvents(){
 viewButtons.forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
 modeButtons.forEach(b=>b.addEventListener('click',()=>setMapMode(b.dataset.mapMode)));
 calloutButtons.forEach(b=>b.addEventListener('click',()=>mapMode==='functions'?setFunction(b.dataset.callout):setSelected(b.dataset.callout)));
 activityButtons.forEach(b=>b.addEventListener('click',()=>setActivity(b.dataset.activity)));
 splitButtons.forEach(button=>button.addEventListener('click',()=>applyMode(button.dataset.split)));
 range.addEventListener('input',()=>{
  splitAmount=Number(range.value);
  if(splitMode==='together'&&splitAmount>0)splitMode='hemispheres';
  rangeText.textContent=splitAmount+'%';rangeOutput.textContent=splitAmount+'%';
  applySplit();needsRender=true;
 });
 partButtons.forEach(button=>button.addEventListener('click',()=>mapMode==='functions'&&functionDetails[button.dataset.part]?setFunction(button.dataset.part):setSelected(button.dataset.part)));
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
 const hits=raycaster.intersectObjects(meshes,true);
 if(hits.length){
  let source=hits[0].object;
  while(source&&!source.userData?.key)source=source.parent;
  if(!source)return;
  const id=source.userData;
  if(mapMode==='functions')setFunction(id.key);
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
 if(dirty){updateCamera();renderer.render(scene,camera);drawLeaders();needsRender=false;}
}
if(!init()) console.warn('3D brain fallback active');

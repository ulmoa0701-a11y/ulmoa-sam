(() => {
'use strict';
const regions={
 frontal:{name:'전두엽',skills:'계획 · 집중 · 조절',icon:'💡',color:'#f1e3ff',
 summary:'계획을 세우고 주의를 조절하며 상황에 맞게 행동을 바꾸는 일에 여러 뇌 영역과 함께 관여해요.',
 example:'해야 할 일의 순서를 정하거나 하고 싶은 행동을 잠깐 멈추려고 노력할 때'},
 parietal:{name:'두정엽',skills:'공간 · 감각 · 수개념',icon:'✋',color:'#fff2cf',
 summary:'몸에서 오는 감각을 통합하고 물체와 공간의 위치를 파악하는 과정에 중요한 역할을 해요.',
 example:'퍼즐 조각의 위치를 맞추고, 몸과 물건이 어디에 있는지 살펴볼 때'},
 temporal:{name:'측두엽',skills:'언어 · 듣기 · 기억',icon:'💬',color:'#e0f6e6',
 summary:'소리를 처리하고 말의 뜻을 이해하는 일에 관여해요. 측두엽 안쪽의 해마는 새로운 사건 기억 형성에 중요해요.',
 example:'친구의 이야기를 듣고 뜻을 이해하거나 어제 있었던 일을 기억할 때'},
 occipital:{name:'후두엽',skills:'보기 · 시각처리',icon:'👁️',color:'#ffede5',
 summary:'눈으로 들어온 글자·그림의 선과 모양 같은 시각 정보를 초기 단계에서 분석해요.',
 example:'그림의 특징을 보고 글자의 모양을 구별할 때. 뜻을 이해하려면 다른 영역도 필요해요.'},
 cerebellum:{name:'소뇌',skills:'균형 · 움직임',icon:'🏃',color:'#e6f2ff',
 summary:'몸의 균형과 움직임의 정확도, 타이밍을 맞추는 과정에 중요한 역할을 해요.',
 example:'공을 잡으려고 팔을 뻗거나 걸을 때 몸의 균형을 유지할 때'},
 brainstem:{name:'뇌줄기',skills:'호흡 · 깨어있기',icon:'💗',color:'#f0edf7',
 summary:'호흡과 심장박동, 깨어 있는 상태처럼 생명 유지의 기본 기능에 중요한 역할을 해요.',
 example:'우리가 특별히 생각하지 않아도 숨을 쉬고 몸의 기본 상태를 유지할 때'}
};
const functions={
 frontal:{name:'계획 · 주의집중',skills:'전두엽 · 두정엽 등',icon:'💡',color:'#f1e3ff',related:['frontal','parietal'],
 summary:'계획하고 필요한 정보에 주의를 기울이는 과정에는 전두엽과 두정엽 등을 포함하는 넓은 뇌 네트워크가 함께 작동해요.',
 example:'먼저 할 일을 정한 뒤, 주변 소리가 들려도 과제로 다시 주의를 돌릴 때'},
 parietal:{name:'공간 · 몸 감각',skills:'두정엽 · 후두엽 등',icon:'✋',color:'#fff2cf',related:['parietal','occipital'],
 summary:'공간의 위치를 알고 몸의 움직임을 이해할 때 감각·시각·주의 영역들이 협력해요.',
 example:'책상의 물건 위치를 찾거나 공이 오는 방향을 알아볼 때'},
 temporal:{name:'언어 이해',skills:'측두엽 · 전두엽 등',icon:'💬',color:'#e0f6e6',related:['temporal','frontal'],
 summary:'소리를 듣고 말뜻을 이해하는 일은 한 부위만 담당하지 않고 여러 언어 네트워크가 함께 처리해요.',
 example:'“가방 놓고 손 씻자”라는 말을 이해할 때'},
 occipital:{name:'시각 정보 처리',skills:'후두엽 · 두정엽 등',icon:'👁️',color:'#ffede5',related:['occipital','parietal'],
 summary:'시각 정보를 분석한 뒤 물체와 위치를 알아보는 과정에는 후두엽과 다른 뇌 영역이 연결돼 작동해요.',
 example:'글자 모양을 살펴보고 그림에서 필요한 물건을 찾을 때'},
 cerebellum:{name:'운동 조절',skills:'소뇌 · 전두엽 · 두정엽 등',icon:'🏃',color:'#e6f2ff',related:['cerebellum','frontal','parietal'],
 summary:'움직임을 계획하고 몸 위치를 느끼면서 정확한 타이밍으로 동작을 조절할 때 여러 영역이 함께 움직여요.',
 example:'공을 눈으로 따라가면서 손을 뻗어 잡으려고 할 때'},
 brainstem:{name:'호흡 · 각성 조절',skills:'뇌줄기와 연결된 여러 회로',icon:'💗',color:'#f0edf7',related:['brainstem'],
 summary:'뇌줄기는 호흡, 심장박동과 깨어 있음에 필요한 기본적인 기능에 관여해요.',
 example:'의식적으로 생각하지 않아도 호흡과 기본 신체 기능을 유지할 때'}
};
const activities={
 reading:{name:'읽기',skills:'후두엽 · 측두엽 · 전두엽 등',icon:'📖',color:'#e6f4e7',related:['occipital','temporal','frontal'],
 summary:'글자를 보고 말소리와 뜻을 연결하면서 문장 흐름에 주의를 기울여요.',
 example:'그림책의 짧은 문장을 보고 내용을 이해할 때'},
 instructions:{name:'지시 따르기',skills:'측두엽 · 전두엽 · 두정엽 등',icon:'📝',color:'#f5edff',related:['temporal','frontal','parietal'],
 summary:'말을 듣고 이해한 뒤 내용을 잠깐 기억하면서 행동 순서를 정해요.',
 example:'“가방 놓고 손 씻자”는 말을 듣고 순서대로 실행할 때'},
 ball:{name:'공놀이',skills:'후두엽 · 두정엽 · 소뇌 등',icon:'⚽',color:'#e6f2ff',related:['occipital','parietal','cerebellum'],
 summary:'공의 위치를 보고 몸을 움직이며 타이밍과 균형을 조절해요.',
 example:'날아오는 공을 눈으로 좇고 팔을 뻗어 잡으려고 할 때'},
 memory:{name:'기억하기',skills:'측두엽 안쪽 해마 · 전두엽 등',icon:'💭',color:'#eaf7eb',related:['temporal','frontal'],
 summary:'새로운 경험을 기억하고 나중에 떠올리는 일에는 해마를 포함한 여러 영역이 참여해요.',
 example:'어제 있었던 일을 다시 이야기할 때'}
};
let mode='region',current='frontal',activity=null;
const buttons=[...document.querySelectorAll('[data-region]')];
const quick=[...document.querySelectorAll('[data-quick]')];
const callouts=[...document.querySelectorAll('.map-callout')];
const examples=[...document.querySelectorAll('[data-activity]')];
const modeBtns=[...document.querySelectorAll('[data-mode]')];
const viewBtns=[...document.querySelectorAll('[data-view]')];
const frame=document.getElementById('brainViewerFrame');
const viewerLayer=document.getElementById('inline3D');
const loading=document.getElementById('inlineLoading');
let liveView='side',viewerReady=false;
let pendingDrag={dx:0,dy:0};
let stagePointer=null;
function sendDrag(dx,dy){
 if(viewerReady)sendViewer('brain-drag',{dx,dy});
 else {pendingDrag.dx+=dx;pendingDrag.dy+=dy;}
}
function wireStageDrag(){
 const stage=$('mapStage');
 stage.addEventListener('pointerdown',event=>{
  if(liveView!=='side'||event.button>0||event.target.closest('button'))return;
  stagePointer={id:event.pointerId,x:event.clientX,y:event.clientY,dragged:false};
  stage.setPointerCapture?.(event.pointerId);
 });
 stage.addEventListener('pointermove',event=>{
  if(!stagePointer||stagePointer.id!==event.pointerId)return;
  const dx=event.clientX-stagePointer.x,dy=event.clientY-stagePointer.y;
  stagePointer.x=event.clientX;stagePointer.y=event.clientY;
  if(Math.abs(dx)+Math.abs(dy)>3){
    if(!stagePointer.dragged){stagePointer.dragged=true;changeView('free');}
    sendDrag(dx,dy);
  }
 });
 const finish=event=>{if(stagePointer?.id===event.pointerId)stagePointer=null;};
 stage.addEventListener('pointerup',finish);
 stage.addEventListener('pointercancel',finish);
}

function sendViewer(type,extras={}){
 if(frame?.contentWindow&&viewerReady)frame.contentWindow.postMessage({type,...extras},location.origin);
}
function changeView(view){
 if(!['side','front','back','top','free'].includes(view))return;
 liveView=view;
 viewBtns.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
 const show3D=view!=='side';
 viewerLayer.hidden=!show3D;
 $('mapStage').classList.toggle('show-3d',show3D);
 $('mapStage').dataset.view=view;
 if(show3D){
  if(!frame.src){
   loading.hidden=false;
   frame.src=frame.dataset.src;
  }
  sendViewer('brain-view',{view});
  if(current)sendViewer('brain-part',{part:current});
 }
}
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
 if(event.data?.type==='brain-3d-ready'){
  viewerReady=true;
  loading.hidden=true;
  sendViewer('brain-view',{view:liveView==='side'?'left':liveView});
  if(pendingDrag.dx||pendingDrag.dy){sendDrag(pendingDrag.dx,pendingDrag.dy);pendingDrag={dx:0,dy:0};}
 }else if(event.data?.type==='brain-3d-error'){
  loading.hidden=false;
  loading.textContent='3D 그래픽을 사용할 수 없어요. 옆에서 보기로 돌아가 주세요.';
 }else if(event.data?.type==='brain-3d-selected'&&regions[event.data.part]){
  choose(event.data.part);
 }
});
viewBtns.forEach(b=>b.addEventListener('click',()=>changeView(b.dataset.view)));

const $=id=>document.getElementById(id);
function showData(d){
 $('detailName').textContent=d.name;
 $('detailSkills').textContent=d.skills;
 $('detailSummary').textContent=d.summary;
 $('detailExample').textContent=d.example;
 $('detailIcon').textContent=d.icon;
 $('detailBanner').style.background=d.color;
}
function choose(key){
 if(!regions[key])return;
 current=key;activity=null;
 draw();
 sendViewer("brain-part",{part:key});
}
function draw(){
 const selected=activity?activities[activity]:mode==='function'?functions[current]:regions[current];
 const related=selected.related||[current];
 showData(selected);
 buttons.forEach(b=>{
  const active=!activity&&b.dataset.region===current;
  b.setAttribute('aria-pressed',String(active));
  b.classList.toggle('is-active',active);
 });
 quick.forEach(b=>{
  const key=b.dataset.quick;
  const active=related.includes(key);
  b.setAttribute('aria-pressed',String(active));
  b.classList.toggle('is-related',active);
 });
 examples.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.activity===activity)));
 modeBtns.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
 document.querySelectorAll('.map-callout').forEach(b=>{
  const key=b.dataset.region;
  const title=b.querySelector('strong'),subtitle=b.querySelector('small');
  if(mode==='function'&&!activity){
   title.textContent=functions[key].name;
   subtitle.textContent=functions[key].skills;
  }else{
   title.textContent=regions[key].name;
   subtitle.textContent=regions[key].skills;
  }
  b.classList.toggle('is-related',related.includes(key));
 });
 $('mapStage').dataset.viewmode=mode;
}
buttons.forEach(b=>b.addEventListener('click',()=>choose(b.dataset.region)));
quick.forEach(b=>b.addEventListener('click',()=>choose(b.dataset.quick)));
examples.forEach(b=>b.addEventListener('click',()=>{
 activity=activity===b.dataset.activity?null:b.dataset.activity;
 draw();
}));
modeBtns.forEach(b=>b.addEventListener('click',()=>{
 mode=b.dataset.mode;
 activity=null;
 draw();
}));
draw();
changeView('side');
wireStageDrag();
})();
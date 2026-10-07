/* 모아모아 나래반 놀이터 V6.3 — IMMEDIATE PLAY
   PUBLICATION_HOLD: branch-only. Load after V6.2 patch.
*/
(() => {
  'use strict';
  if (window.__naraeV63) return;

  const title=document.getElementById('title');
  const game=document.getElementById('game');
  const backBtn=document.getElementById('backBtn');
  const startBtn=document.getElementById('startBtn');

  const resetMotion=()=>{
    try{keys?.clear?.()}catch{}
    try{holdLeft=false;holdRight=false}catch{}
    try{
      player.vx=0;
      player.targetX=null;
      player.locked=false;
      document.getElementById('runBtn')?.classList.remove('on');
    }catch{}
  };

  const showWelcome=()=>{
    let el=document.getElementById('worldWelcome');
    if(!el){
      el=document.createElement('div');
      el.id='worldWelcome';
      el.className='world-welcome';
      el.setAttribute('aria-live','polite');
      el.textContent='오늘은 뭐 하고 놀까?';
      game?.appendChild(el);
    }
    requestAnimationFrame(()=>el.classList.add('show'));
    clearTimeout(showWelcome._t1);
    clearTimeout(showWelcome._t2);
    showWelcome._t1=setTimeout(()=>el.classList.add('hide'),1450);
    showWelcome._t2=setTimeout(()=>el.classList.remove('show','hide'),1850);
  };

  const enterWorld=()=>{
    title?.classList.remove('active');
    game?.classList.add('active');
    document.title='모아모아 나래반 · 놀이터';
    resetMotion();
    try{setPlayerPos()}catch{}
    requestAnimationFrame(()=>{
      try{fitCamera()}catch{}
      showWelcome();
    });
  };

  if(startBtn)startBtn.onclick=enterWorld;

  try{
    const oldShow=show;
    show=function v63Show(id){
      if(id==='title')return enterWorld();
      return oldShow(id);
    };
  }catch{}

  const plates={
    누리:document.querySelector('#npcNuri + .questmark + .nameplate'),
    여름:document.querySelector('#npcYeoreum + .questmark + .nameplate'),
    가람:document.querySelector('#npcGaram + .questmark + .nameplate')
  };
  Object.entries(plates).forEach(([name,el])=>{if(el)el.textContent=name});

  try{
    const oldNearbyV63=updateNearby;
    updateNearby=function v63UpdateNearby(){
      oldNearbyV63();
      Object.values(plates).forEach(el=>el?.classList.remove('v63-near'));
      if(nearNpc==='누리'||nearNpc==='여름'||nearNpc==='가람'){
        plates[nearNpc]?.classList.add('v63-near');
      }
    };
  }catch{}

  const qNuri=document.querySelector('#qNuri small');
  const qYeoreum=document.querySelector('#qYeoreum small');
  const qGaram=document.querySelector('#qGaram small');
  if(qNuri)qNuri.textContent='누리가 잃어버린 물건 같이 찾기';
  if(qYeoreum)qYeoreum.textContent='깃발 규칙으로 한 판 놀기';
  if(qGaram)qGaram.textContent='가람이 부탁한 물건 챙겨주기';
  const qGaramIcon=document.querySelector('#qGaram .qico');
  if(qGaramIcon)qGaramIcon.textContent='🧺';

  window.v63ResumePlay=function(){
    try{closePanel()}catch{}
    resetMotion();
    requestAnimationFrame(()=>{try{fitCamera()}catch{}});
  };

  window.v63ReturnStart=function(){
    try{closePanel()}catch{}
    resetMotion();
    try{
      player.x=365;player.y=825;
      setPlayerPos();fitCamera();frame('idle');
      flash('처음 자리로 왔어');
    }catch{}
  };

  if(backBtn)backBtn.onclick=()=>{
    resetMotion();
    try{
      openPanel(
        '<span class="tag" style="background:#e6f1e7;color:#315b49">나래반 놀이터</span>'+
        '<h2>잠깐 쉬어갈까?</h2>'+
        '<p class="v63-pause-copy">바로 이어서 놀거나 처음 자리로 돌아갈 수 있어.</p>'+
        '<div class="buttons">'+
        '<button class="subbtn" onclick="v63ReturnStart()">처음 자리</button>'+
        '<button class="subbtn primary" onclick="v63ResumePlay()">계속 놀기</button>'+
        '</div>'
      );
    }catch{enterWorld()}
  };

  const boot=()=>setTimeout(enterWorld,0);
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else boot();

  window.__naraeV63={
    version:'6.3-immediate-play',
    publicationHold:true,
    enterWorld,
    showWelcome
  };
})();
/* 일단 해봄 · 34개 게임 공통 클레이 아트
 * 실제 자극의 색·형태·방향·거리·손동작·글자/화폐를 변경하지 않고
 * 게임 카드·소개·진행 제목·완료 화면에만 장식 그림을 추가합니다.
 * 34개 도안은 사용자 제공 Canva 파일에서 선별, 하나의 960×960 WebP 아틀라스로 묶었습니다.
 */
(() => {
  'use strict';
  const KEYS='hand-mirror rescue memory sameShape flower hide path calm inside targets sceneDetect slowScan slowPlace slowBlock slowName slowMemory paint water resetRescue classroomMove change rulePost mirrorPond festivalPlan spacing spelling slowEveryday money rhythm-touch recorder beat strength long feel'.split(' ');
  const INDEX=new Map(KEYS.map((k,i)=>[k,i]));
  function artwork(key,extra=''){
    if(!INDEX.has(key))return null;
    const i=INDEX.get(key),span=document.createElement('span');
    span.className='moa-clay-sprite '+extra;
    span.style.backgroundPosition=(i%6)*20+'% '+Math.floor(i/6)*20+'%';
    span.setAttribute('aria-hidden','true');
    span.dataset.clayKey=key;
    return span;
  }
  function mount(target,key,cls){
    if(!target||!INDEX.has(key))return;
    const direct=[...target.children].find(x=>x.classList?.contains('moa-clay-sprite'));
    if(direct?.dataset.clayKey===key)return;
    if(direct)direct.remove();
    const art=artwork(key,cls);
    if(art)target.append(art);
  }
  function decorateCatalog(){
    document.querySelectorAll('.play-card-enhanced[data-game]').forEach(card=>{
      const key=card.dataset.game;
      const media=card.querySelector('.play-card-media');
      mount(media,key,'moa-clay-card-corner');
      if(!media||!INDEX.has(key))return;
      // A missing gameplay screenshot should never look like an empty frame.
      // Keep true gameplay captures, but show the game-specific art as a large fallback.
      function syncFallback(){
        if(!media.classList.contains('no-real-shot'))return;
        const caption=media.querySelector('.shot-caption');
        const img=media.querySelector('img.real-shot');
        if(caption)caption.textContent='게임 대표 그림';
        if(img)img.alt='';
      }
      new MutationObserver(syncFallback).observe(media,{attributes:true,attributeFilter:['class']});
      syncFallback();
    });
    // The same non-empty fallback must work in the preview dialog.
    document.addEventListener('click',e=>{
      const button=e.target.closest('.play-preview-btn');
      const key=button?.closest('.play-card-enhanced')?.dataset.game;
      if(!INDEX.has(key))return;
      const media=document.querySelector('.preview-visual');
      mount(media,key,'moa-clay-preview-art');
      if(!media||media.dataset.clayFallbackObserved)return;
      media.dataset.clayFallbackObserved='true';
      new MutationObserver(()=>{
        if(!media.classList.contains('no-real-shot'))return;
        const img=media.querySelector('#previewShot');
        if(img)img.alt='';
      }).observe(media,{attributes:true,attributeFilter:['class']});
    },true);
  }
  function decorateLibrary(){
    document.querySelectorAll('#gardenGamePanel .library-card[data-open]').forEach(card=>{
      const key=card.dataset.open;
      if(!INDEX.has(key))return;
      mount(card,key,'moa-clay-library-badge');
      // Swap generic repeated character thumbnails for the matching game cover.
      // The original character still appears in stories and in the MoA hero.
      card.classList.add('has-clay-leading-art');
    });
  }
  function thinkingGame(key){
    if(!INDEX.has(key))return;
    mount(document.querySelector('#introScreen .intro-copy'),key,'moa-clay-intro-badge');
    mount(document.querySelector('#gameScreen .game-name'),key,'moa-clay-playing-badge');
    const target=document.querySelector('#resultScreen .result-actions');
    if(target)mount(target.parentElement,key,'moa-clay-result-badge');
  }
  function decorateBreath(){
    for(const [id,key] of [['chooseBeat','beat'],['chooseStrength','strength'],['chooseLong','long']]){
      const button=document.getElementById(id);
      if(button)mount(button,key,'moa-clay-breath-choice');
    }
    const keyFromMode={beat:'beat',strength:'strength',long:'long'};
    const mode=new URLSearchParams(location.search).get('mode');
    if(keyFromMode[mode])mount(document.querySelector('#playScreen .play-title'),mode,'moa-clay-playing-badge');
    document.addEventListener('click',e=>{
      const b=e.target.closest('#chooseBeat,#chooseStrength,#chooseLong');
      if(b)mount(document.querySelector('#playScreen .play-title'),({chooseBeat:'beat',chooseStrength:'strength',chooseLong:'long'})[b.id],'moa-clay-playing-badge');
    });
  }
  function initialize(){
    const p=location.pathname,q=new URLSearchParams(location.search);
    if(/\/gardens\/?$/.test(p)){decorateCatalog();return;}
    if(/\/thinking-garden\/games\/moa-missions\/?$/.test(p)){
      const key=['change','feel','money'].includes(q.get('game'))?q.get('game'):'money';
      mount(document.querySelector('.mission-banner'),key,'moa-clay-mission-badge');
      mount(document.querySelector('#resultScreen'),key,'moa-clay-result-badge');
      return;
    }
    if(/\/thinking-garden\/games\/hand-mirror\/?$/.test(p)){
      mount(document.querySelector('#intro .eyebrow'), 'hand-mirror','moa-clay-hand-badge');
      mount(document.querySelector('#finish'), 'hand-mirror','moa-clay-result-badge');
      return;
    }
    if(/\/thinking-garden\/games\/rescue\/?$/.test(p)){
      mount(document.querySelector('.topbar .brand'),'rescue','moa-clay-header-badge');
      return;
    }
    if(/\/thinking-garden\/games\/rhythm-touch\/?$/.test(p)){
      mount(document.querySelector('.heading'),'rhythm-touch','moa-clay-intro-badge');
      mount(document.querySelector('#results'),'rhythm-touch','moa-clay-result-badge');
      return;
    }
    if(/\/thinking-garden\/recorder\/?$/.test(p)){
      mount(document.querySelector('.rec-welcome'),'recorder','moa-clay-recorder-badge');
      return;
    }
    if(/\/breath-garden\/?$/.test(p)){decorateBreath();return;}
    if(/\/thinking-garden\/?$/.test(p)){
      decorateLibrary();
      const key=q.get('game');
      if(INDEX.has(key))thinkingGame(key);
      document.addEventListener('click',e=>{
        const b=e.target.closest('[data-open]');
        if(b&&INDEX.has(b.dataset.open))thinkingGame(b.dataset.open);
      },true);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
  window.MoaClayArt=Object.freeze({keys:KEYS.slice(),artwork,mount});
})();
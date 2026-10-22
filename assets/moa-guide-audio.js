/* Optional, user-triggered Korean speech for Moa's single-line welcome.
   No autoplay, no recording, no paid audio API. */
(()=>{
 'use strict';
 let active=null;
 const btns=[...document.querySelectorAll('.moa-page-guide__listen')];
 if(!btns.length)return;
 const synth=window.speechSynthesis;
 const supported=!!(synth&&window.SpeechSynthesisUtterance);
 const reset=(button)=>{
  if(!button)return;
  button.setAttribute('aria-pressed','false');
  button.setAttribute('aria-label','모아 안내 듣기');
  button.textContent='▶ 듣기';
  const status=button.parentElement?.querySelector('.moa-page-guide__status');
  if(status)status.textContent='';
 };
 if(!supported){for(const button of btns){button.disabled=true;button.title='이 브라우저에서는 읽어주기를 지원하지 않아요';button.setAttribute('aria-label','읽어주기 미지원');}return;}
 for(const button of btns){
  button.setAttribute('aria-pressed','false');
  button.addEventListener('click',()=>{
   if(active===button){synth.cancel();reset(button);active=null;return;}
   if(active){synth.cancel();reset(active);active=null;}
   const speech=button.closest('.moa-page-guide')?.querySelector('.moa-page-guide__message')?.textContent?.trim();
   if(!speech)return;
   const utterance=new SpeechSynthesisUtterance(speech);
   utterance.lang='ko-KR';utterance.rate=.94;utterance.pitch=1.08;
   const voices=synth.getVoices?.()||[];
   const korean=voices.find(v=>v.lang.toLowerCase()==='ko-kr')||voices.find(v=>v.lang.toLowerCase().startsWith('ko'));
   if(korean)utterance.voice=korean;
   active=button;
   button.setAttribute('aria-pressed','true');button.setAttribute('aria-label','모아 안내 읽어주기 멈추기');button.textContent='■ 멈추기';
   const status=button.parentElement?.querySelector('.moa-page-guide__status');
   if(status)status.textContent='안내를 읽고 있어요';
   const finish=()=>{if(active===button){active=null;reset(button);}};
   utterance.onend=finish;utterance.onerror=finish;
   try{synth.cancel();synth.speak(utterance);}
   catch(e){finish();if(status)status.textContent='이 기기에서 읽어주기를 시작하지 못했어요';}
  });
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&active){synth.cancel();reset(active);active=null;}});
 window.addEventListener('pagehide',()=>{if(active){synth.cancel();reset(active);active=null;}});
})();

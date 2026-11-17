/* 울모아 일단 해봄 — 소리 합성·연속 재생 공용 도구. 외부 파일/샘플 없음. */
(()=>{'use strict';
let audio=null, serial=0;
const voices=new Set(),timers=new Set();
const $=id=>document.getElementById(id);
function schedule(fn,ms){const id=setTimeout(()=>{timers.delete(id);fn()},Math.max(0,ms));timers.add(id);return id}
function ensure(){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('이 브라우저에서 소리를 재생할 수 없어요.');if(!audio)audio=new Audio();if(audio.state==='suspended')audio.resume();return audio}
function halt(){serial++;timers.forEach(clearTimeout);timers.clear();voices.forEach(v=>{try{v.stop()}catch(e){}});voices.clear()}
function oscillator(frequency,duration=.25,volume=.15,type='sine',sweep=null,delay=0){
 const a=ensure(),at=a.currentTime+Math.max(0,delay),o=a.createOscillator(),g=a.createGain();
 o.type=type;o.frequency.setValueAtTime(Math.max(25,frequency),at);
 if(sweep)o.frequency.exponentialRampToValueAtTime(Math.max(25,sweep),at+Math.min(duration,.18));
 const loud=Math.max(.0001,Math.min(.24,volume));
 g.gain.setValueAtTime(.0001,at);
 g.gain.exponentialRampToValueAtTime(loud,at+.008);
 g.gain.exponentialRampToValueAtTime(.0001,at+Math.max(.05,duration));
 o.connect(g);g.connect(a.destination);voices.add(o);o.onended=()=>{voices.delete(o);try{o.disconnect();g.disconnect()}catch(e){}};
 o.start(at);o.stop(at+Math.max(.05,duration)+.02);
}
function tone(freq=330,volume=.14,duration=.32,wave='sine'){
 oscillator(freq,duration,volume,wave);
}
function instrument(type,volume=.13){
 const v=Math.max(.008,Math.min(.2,Number(volume)||.13));
 switch(type){
 case 'drum': oscillator(125,.24,v,'sine',53);break;
 case 'clap': oscillator(315,.105,v*.58,'triangle',215);oscillator(1250,.045,v*.13,'square');break;
 case 'click': oscillator(950,.07,v*.32,'square',640);break;
 case 'bell': oscillator(783.99,.75,v*.64,'sine');oscillator(1567.98,.35,v*.12,'sine');break;
 case 'piano': oscillator(392,.43,v*.55,'triangle');oscillator(783.99,.26,v*.12,'sine');break;
 case 'guitar': oscillator(261.63,.33,v*.42,'triangle');oscillator(523.25,.19,v*.09,'sawtooth');break;
 default: oscillator(392,.24,v,'sine');
 }
}
function sequence(count,interval,step,done){
 halt();const key=serial;try{ensure()}catch(e){if(done)done(e);return false}
 for(let i=0;i<count;i++)schedule(()=>{if(serial!==key)return;step(i)},i*interval+20);
 schedule(()=>{if(serial!==key)return;if(done)done(null)},count*interval+60);
 return true;
}
function flash(el,className='pressed',duration=150){if(!el)return;el.classList.add(className);schedule(()=>{el.classList.remove(className)},duration)}
function putStatus(id,message,kind=''){const x=typeof id==='string'?$(id):id;if(!x)return;x.textContent=message;x.dataset.kind=kind}
function save(key,data){try{localStorage.setItem('ulmoa-'+key,JSON.stringify(data));return true}catch(e){return false}}
function load(key){try{return JSON.parse(localStorage.getItem('ulmoa-'+key)||'null')}catch(e){return null}}
function copy(text,el){const msg=()=>putStatus(el,'기록을 복사했어요.');
 if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(text).then(msg).catch(()=>fallback());
 return fallback();
 function fallback(){const ta=document.createElement('textarea');ta.value=text;ta.setAttribute('aria-label','복사할 기록');ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand('copy')}catch(e){}ta.remove();putStatus(el,ok?'기록을 복사했어요.':'복사가 제한됐어요. 화면에서 직접 선택해 복사해 주세요.',ok?'':'warn')}
}
function noteText(title,lines){return title+'\n'+lines.filter(Boolean).join('\n')+'\n(울모아 학습 보조활동 관찰 메모 · 개인정보 제외)'}
window.MoaPlay={$,ensure,halt,tone,instrument,sequence,flash,putStatus,save,load,copy,noteText,schedule};
})();

'use strict';
/* Independent musical timing game. Song snippets are transcribed from Boomwhacker
 * Studio's built-in samples; scoring measures taps, not acoustic instrument skills. */
const NOTES=['도','레','미','파','솔','라','시','높은도'];
const COLORS={도:'#EB2427',레:'#F6851F',미:'#FBED1B',파:'#73C84A',솔:'#00A39A',라:'#4B4AA8',시:'#D83A9B',높은도:'#EB2427'};
const FREQ={도:261.63,레:293.66,미:329.63,파:349.23,솔:392,라:440,시:493.88,높은도:523.25};
const song=(id,title,bpm,meter,parts)=>({id,title,bpm,meter,parts});
const SONGS=[
 song('twinkle','작은별',66,2,[['도',1,'반'],['도',1,'짝'],['솔',1,'반'],['솔',1,'짝'],['라',1,'작'],['라',1,'은'],['솔',2,'별'],['파',1,'아'],['파',1,'름'],['미',1,'답'],['미',1,'게'],['레',1,'비'],['레',1,'치'],['도',2,'네']]),
 song('butterfly','나비야',69,2,[['솔',.5,'나'],['미',.5,'비'],['미',1,'야'],['파',.5,'나'],['레',.5,'비'],['레',1,'야'],['도',.5,'이'],['레',.5,'리'],['미',.5,'날'],['파',.5,'아'],['솔',.5,'오'],['솔',.5,'너'],['솔',1,'라']]),
 song('bear','곰 세 마리',75,4,[['도',1,'곰'],['도',.5,'세'],['도',.5,'마'],['도',1,'리'],['도',1,'가'],['미',1,'한'],['솔',.5,'집'],['솔',.5,'에'],['미',1,'있'],['도',1,'어'],['솔',.5,'아'],['솔',.5,'빠'],['미',1,'곰'],['솔',.5,'엄'],['솔',.5,'마'],['미',1,'곰']])
];
const $=s=>document.querySelector(s);
let keyMode='piano';
try{const saved=localStorage.getItem('moa-rhythm-key-mode');if(['piano','xylophone','shuffle'].includes(saved))keyMode=saved}catch(e){}
const state={song:SONGS[0],ratio:1,beat:60000/66,events:[],phase:'idle',origin:0,countStart:0,countLen:6,lastCount:-1,lastSound:-1,lastUi:-1,raf:0,pausedAt:0,played:0,earned:0,extra:0,stats:{great:0,good:0,okay:0,miss:0,wrong:0},melody:true,audio:null,score:0,introPreview:[],keyOrder:NOTES.slice()};
function mkEvents(){
 state.beat=60000/(state.song.bpm*state.ratio);
 let time=0;
 state.events=state.song.parts.map((part,i)=>{
  const event={note:part[0],dur:part[1]*state.beat,lyric:part[2],ms:time,i,judged:false,grade:null,sounded:false,previewed:false};
  time+=event.dur;return event;
 });
 state.duration=time;
 state.countLen=state.song.meter===2?6:state.song.meter+2;
 state.lastSound=-1;state.lastUi=-1;
 state.earned=0;state.extra=0;state.played=0;state.score=0;
 state.stats={great:0,good:0,okay:0,miss:0,wrong:0};
}
function clearGameFrame(){if(state.raf)cancelAnimationFrame(state.raf);state.raf=0}
function setSettings(){const locked=['count','play','paused'].includes(state.phase);$('#songSelect').disabled=locked;$('#speedSelect').disabled=locked;$('#startBtn').disabled=locked;$('#keyModeSelect').disabled=locked}
function selectSong(){
 if(state.phase!=='idle'&&state.phase!=='done')return;
 state.song=SONGS.find(s=>s.id===$('#songSelect').value)||SONGS[0];
 state.ratio=Number($('#speedSelect').value)||1;
 mkEvents();renderTrack();resetView();
 $('#songMeta').textContent=Math.round(state.song.bpm*state.ratio)+' BPM · '+state.song.meter+'/4박자';
}
function tone(note,volume=.2,duration=.22,kind='note'){
 if(!state.melody)return;
 try{
  if(!state.audio)state.audio=new(window.AudioContext||window.webkitAudioContext)();
  if(state.audio.state==='suspended')state.audio.resume().catch(()=>{});
  const ac=state.audio,o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime;
  o.type=kind==='beat'?'sine':'triangle';
  o.frequency.value=kind==='beat'?(note==='high'?820:660):FREQ[note]||392;
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.012);
  g.gain.exponentialRampToValueAtTime(.0001,t+duration);
  o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+duration+.03);
 }catch(err){/* muted/unavailable audio does not block visual play */}
}
function keyOrderForMode(){
  const notes=NOTES.slice();
  if(keyMode==='shuffle'){
    for(let i=notes.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[notes[i],notes[j]]=[notes[j],notes[i]]}
    if(notes.every((n,i)=>n===NOTES[i]))[notes[0],notes[1]]=[notes[1],notes[0]];
  }
  return notes;
}
function renderKeys(){
 const group=$('#keys');group.innerHTML='';
 group.className='keys '+(keyMode==='xylophone'?'xylophoneKeys':keyMode==='shuffle'?'shuffleKeys':'pianoKeys');
 group.setAttribute('aria-label',(keyMode==='xylophone'?'색깔 실로폰':keyMode==='shuffle'?'순서가 섞인 색깔 피아노':'색깔 피아노')+' 건반 8개 · 한 줄');
 const order=keyOrderForMode();state.keyOrder=order;
 order.forEach(note=>{
  const i=NOTES.indexOf(note),b=document.createElement('button');
  b.className='key';b.type='button';b.dataset.note=note;
  b.style.setProperty('--key-color',COLORS[note]);
  b.style.setProperty('--key-ink',note==='높은도'?'#ffffff':'#111827');
  b.style.setProperty('--key-step',String(i));
  b.style.setProperty('--key-offset',`${i*3}px`);
  b.style.setProperty('--key-mobile-offset',`${i*2}px`);
  b.style.setProperty('--key-small-offset',`${i}px`);
  b.setAttribute('aria-label',note+' 건반 누르기');
  b.innerHTML='<span>'+(note==='높은도'?'도↑':note)+'</span><span class="hotkey">'+(i+1)+'</span>';
  b.addEventListener('click',()=>tap(note,b));group.appendChild(b);
 });
 $('#instrumentHeading').textContent=keyMode==='xylophone'?'🎶 색깔 실로폰':keyMode==='shuffle'?'🔀 섞인 건반 (한 곡 동안 고정)':'🎹 색깔 피아노 건반';
 $('#keyModeSelect').value=keyMode;
}
function changeKeyMode(mode){
 if(['count','play','paused'].includes(state.phase))return;
 keyMode=['piano','xylophone','shuffle'].includes(mode)?mode:'piano';
 try{localStorage.setItem('moa-rhythm-key-mode',keyMode)}catch(e){}
 renderKeys();
}
function renderTrack(){
 const track=$('#noteTrack');track.innerHTML='';
 track.scrollTop=0;
 state.events.forEach(e=>{
  const el=document.createElement('div');el.className='noteTile';el.dataset.i=String(e.i);el.dataset.note=e.note;
  el.style.setProperty('--score-note-color',COLORS[e.note]);
  el.style.setProperty('--score-note-ink',e.note==='높은도'?'#ffffff':'#111827');
  el.setAttribute('aria-label',(e.i+1)+'번째 '+e.note+' · '+e.lyric);
  const display=e.note==='높은도'?'도↑':e.note;
  const long=e.dur/state.beat>=1.75?'<span class="longNote">길게</span>':'';
  el.innerHTML='<div class="tileNote"><span class="scoreNoteBubble">'+display+'</span>'+long+'</div><div class="tileLyric">'+e.lyric+'</div>';
  track.appendChild(el);
 });
 track.firstElementChild?.classList.add('ready');
}
function setFeedback(txt){$('#feedback').textContent=txt}
function refreshScore(){
 const n=state.events.length,raw=Math.round(state.earned/(n*100)*100);
 state.score=Math.max(0,Math.min(100,raw-Math.min(20,state.extra*3)));
 $('#scoreLabel').textContent=String(state.score);
 $('#progressLabel').textContent=state.played+' / '+n;
 $('#progressFill').style.width=(state.played/n*100)+'%';
}
function timeWindows(i){
 const e=state.events[i],left=i?e.ms-state.events[i-1].ms:Infinity;
 const right=i<state.events.length-1?state.events[i+1].ms-e.ms:Infinity;
 const spacing=Math.min(left,right);
 return {great:Math.min(100,Math.max(56,state.beat*.105)),good:Math.min(180,Math.max(100,state.beat*.20)),
   okay:Math.min(285,Math.max(105,state.beat*.33),spacing*.42)};
}
function judge(i,grade,point){
 const e=state.events[i];if(!e||e.judged)return false;
 e.judged=true;e.grade=grade;state.stats[grade]++;state.earned+=point;state.played++;
 const el=$('#noteTrack [data-i="'+i+'"]');
 if(el)el.classList.add(grade==='miss'?'missed':grade==='wrong'?'wrong':'correct');
 refreshScore();return true;
}
function tap(note,button){
 if(button){button.classList.add('hit');setTimeout(()=>button.classList.remove('hit'),110)}
 if(state.phase!=='play'){
  if(state.phase==='count')setFeedback('멜로디를 듣고, 시작 박자에 눌러요 🎵');
  else if(state.melody)tone(note,.34,.24);
  return;
 }
 if(state.melody)tone(note,.34,.24);
 judgeTap(note,performance.now()-state.origin);
}
function judgeTap(note,relativeMs){
 if(state.phase!=='play')return {grade:'not-playing'};
 const eligible=state.events.map((e,i)=>({e,i,offset:relativeMs-e.ms,limit:timeWindows(i)}))
  .filter(x=>!x.e.judged&&Math.abs(x.offset)<=x.limit.okay)
  .sort((a,b)=>Math.abs(a.offset)-Math.abs(b.offset));
 if(!eligible.length){
  state.extra++;refreshScore();setFeedback(relativeMs<0?'아직 기다려요!':'박자를 보고 다시 톡!');
  return {grade:'extra'};
 }
 const {e,i,offset,limit}=eligible[0];
 if(note!==e.note){judge(i,'wrong',0);setFeedback('다른 계이름이에요! 다음 음을 들어봐요');return {grade:'wrong',index:i}}
 const abs=Math.abs(offset);
 const grade=abs<=limit.great?'great':abs<=limit.good?'good':'okay';
 const points=grade==='great'?100:grade==='good'?80:55;
 judge(i,grade,points);
 setFeedback(grade==='great'?'반짝! 딱 맞았어요 ✨':grade==='good'?'좋아요! 박자에 가까워요 🌼':'조금 '+(offset<0?'빨랐어요':'늦었어요')+' 🥁');
 return {grade,index:i,offsetMs:Math.round(offset)};
}
function resetView(){
 $('#noteTrack').scrollTop=0;
 $('#noteTrack').querySelectorAll('.noteTile').forEach((tile,i)=>{
   tile.classList.remove('active','next','correct','missed','wrong');
   tile.classList.toggle('ready',i===0);
 });
 $('#countOverlay').hidden=true;$('#results').hidden=true;
 $('#pauseBtn').hidden=true;$('#startBtn').disabled=false;$('#startBtn').textContent='▶ 시작하기';
 setFeedback('준비되면 시작해요 🌼');refreshScore();setSettings();
}
function changeCue(index){
 if(index===state.lastUi)return;
 state.lastUi=index;
 const track=$('#noteTrack'),tiles=track.children;
 for(let i=0;i<tiles.length;i++){
   tiles[i].classList.toggle('active',i===index);
   tiles[i].classList.toggle('next',i===index+1);
   tiles[i].classList.remove('ready');
   if(i===index){tiles[i].classList.remove('pulse');void tiles[i].offsetWidth;tiles[i].classList.add('pulse')}
 }
 // The full score and every instrument button remain in the viewport.
 // No automatic page movement is needed between notes.
}
function countWord(i){
 if(i<state.countLen-2)return String(i%state.song.meter+1);
 return '<span class="countChar '+(i===state.countLen-2?'active':'')+'">시</span><span class="countChar '+(i===state.countLen-1?'active':'')+'">작</span>';
}
function tick(now){
 if(state.phase==='count'){
  const elapsed=now-state.countStart,previewBeats=state.countLen-2;
  const previewEnd=previewBeats*state.beat;
  const i=Math.min(state.countLen-1,Math.floor(elapsed/state.beat));
  if(i!==state.lastCount&&i>=0){
   state.lastCount=i;
   const el=$('#countNumber');el.classList.toggle('syllables',i>=previewBeats);
   el.innerHTML=countWord(i);
   $('#countInfo').textContent=i>=previewBeats?'이제 곧 건반을 눌러요!':'먼저 짧은 멜로디를 들어요 🎵';
   // In the final '시' / '작' beats there are clear timing ticks, no melody.
   if(i>=previewBeats)tone(i===previewBeats?'high':'low',.18,.13,'beat');
  }
  // The real opening notes, not a random jingle, play during 1·2·1·2.
  // These beats are not scored; the first playable note remains after '작'.
  if(elapsed>=0&&elapsed<previewEnd){
   for(const e of state.events){
    if(e.ms>=previewEnd)break;
    if(!e.previewed&&elapsed>=e.ms){
     e.previewed=true;state.introPreview.push({note:e.note,index:e.i});
     tone(e.note,.26,Math.min(.36,e.dur/1500));
    }
   }
  }
  if(now>=state.origin){
   state.phase='play';$('#countOverlay').hidden=true;state.lastUi=-1;
   setFeedback('🎹 지금! 첫 음을 눌러요');
  }
 }
 if(state.phase==='play'){
  const t=now-state.origin;
  let current=0;
  state.events.forEach((e,i)=>{
   if(t>=e.ms){current=i;if(!e.sounded){e.sounded=true;tone(e.note,.10,Math.min(.27,e.dur/1200));}}
   if(!e.judged&&t>e.ms+timeWindows(i).okay)judge(i,'miss',0);
  });
  changeCue(current);
  if(t>=state.duration+Math.max(400,state.beat*.5)){finish();return}
 }
 if(state.phase==='count'||state.phase==='play')state.raf=requestAnimationFrame(tick);
}
function start(){
 clearGameFrame();state.phase='count';selectSongAfterStart();state.lastCount=-1;
 state.introPreview=[];
 if(keyMode==='shuffle')renderKeys();
 // The compact single-screen layout keeps the score and keys visible already.
 // Do not scroll the page when playback starts.
 const now=performance.now();state.countStart=now;state.origin=now+state.countLen*state.beat;
 $('#countOverlay').hidden=false;$('#countNumber').textContent='1';
 $('#countInfo').textContent='먼저 짧은 멜로디를 들어요 🎵';
 $('#pauseBtn').hidden=false;$('#pauseBtn').textContent='⏸ 잠깐 쉬기';
 $('#results').hidden=true;setSettings();
 if(state.melody){try{state.audio=new(window.AudioContext||window.webkitAudioContext)();state.audio.resume().catch(()=>{})}catch{}}
 state.raf=requestAnimationFrame(tick);
}
function selectSongAfterStart(){
 // start() is invoked only after the selection UI has already rebuilt the events.
 mkEvents();renderTrack();refreshScore();state.lastUi=-1;state.lastCount=-1;
 $('#noteTrack').scrollTop=0;$('#noteTrack').firstElementChild?.classList.add('ready');
}
function pause(){
 if(state.phase==='count'||state.phase==='play'){
  state.beforePause=state.phase;state.phase='paused';state.pausedAt=performance.now();
  clearGameFrame();$('#pauseBtn').textContent='▶ 계속하기';setFeedback('잠깐 쉬어요. 준비되면 계속!');
 }else if(state.phase==='paused'){
  const d=performance.now()-state.pausedAt;state.countStart+=d;state.origin+=d;
  state.phase=state.beforePause;$('#pauseBtn').textContent='⏸ 잠깐 쉬기';
  state.raf=requestAnimationFrame(tick);
 }
}
function finish(){
 clearGameFrame();state.phase='done';$('#countOverlay').hidden=true;$('#pauseBtn').hidden=true;
 state.events.forEach((e,i)=>{if(!e.judged)judge(i,'miss',0)});
 setSettings();$('#results').hidden=false;
 const score=state.score;
 $('#finalScore').textContent=score;
 $('#resultTitle').textContent=score>=90?'박자꽃이 활짝 피었어요! 🌼':score>=60?'음악정원에 꽃이 피었어요! 🌱':'끝까지 연주했어요! 🥁';
 $('#resultText').textContent='잘 맞춘 음 '+(state.stats.great+state.stats.good)+'개 · '+state.events.length+'개 중 연주를 확인했어요.';
 $('#scoreBreakdown').innerHTML='<span>✨ 정확 '+state.stats.great+'</span><span>🌼 가까움 '+state.stats.good+'</span><span>🎵 연습 '+state.stats.okay+'</span><span>↔ 다른 음 '+state.stats.wrong+'</span><span>⌛ 놓침 '+state.stats.miss+'</span><span>➕ 추가 누름 '+state.extra+'</span>';
 try{
  const completed=JSON.parse(localStorage.getItem('moa-garden:completed')||'{}');completed.rhythmTouch=true;localStorage.setItem('moa-garden:completed',JSON.stringify(completed));
  const key='moa-rhythm-best:'+state.song.id;
  const old=Number(localStorage.getItem(key))||0;if(score>old)localStorage.setItem(key,String(score));
 }catch{}
 // Results open above the game as a fixed overlay (no page scroll).
}
function newGame(){if(state.phase==='count'||state.phase==='play'||state.phase==='paused'){clearGameFrame();state.phase='idle'}selectSong()}
function soundToggle(){state.melody=!state.melody;$('#soundBtn').textContent=state.melody?'🔊 노래 소리 켜짐':'🔇 노래 소리 꺼짐';$('#soundBtn').setAttribute('aria-pressed',String(state.melody))}
$('#songSelect').onchange=selectSong;$('#speedSelect').onchange=selectSong;
$('#keyModeSelect').onchange=e=>changeKeyMode(e.target.value);
$('#startBtn').onclick=start;$('#pauseBtn').onclick=pause;$('#againBtn').onclick=()=>{state.phase='idle';selectSong();start()};
$('#soundBtn').onclick=soundToggle;
document.addEventListener('keydown',e=>{
 if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||/SELECT|INPUT|TEXTAREA/.test(document.activeElement?.tagName||''))return;
 const i=Number(e.key)-1;if(i>=0&&i<8){e.preventDefault();tap(NOTES[i],$('#keys [data-note="'+NOTES[i]+'"]'));}
 if(e.key===' '&&['play','count','paused'].includes(state.phase)){e.preventDefault();pause()}
});
renderKeys();selectSong();
// Public, deterministic browser QA helpers. No health/identity data and no score submission.
window.__rhythmQA={
 songs:()=>SONGS.map(s=>({id:s.id,count:s.parts.length,bpm:s.bpm,meter:s.meter})),
 state:()=>({phase:state.phase,song:state.song.id,bpm:60000/state.beat,events:state.events.map(e=>({note:e.note,ms:e.ms,dur:e.dur,grade:e.grade})),score:state.score,earned:state.earned,extra:state.extra,stats:{...state.stats},countLen:state.countLen,origin:state.origin,preview:state.introPreview.slice(),keyMode,keyOrder:state.keyOrder.slice()}),
 simulateStart:()=>{clearGameFrame();state.phase='play';mkEvents();renderTrack();state.origin=performance.now();$('#countOverlay').hidden=true;return true},
 tapAt:(note,timeMs)=>judgeTap(note,timeMs),
 expire:(i)=>{judge(i,'miss',0);return state.score},
 finish:()=>{finish();return state.score},
 reset:()=>{clearGameFrame();state.phase='idle';selectSong()}
};
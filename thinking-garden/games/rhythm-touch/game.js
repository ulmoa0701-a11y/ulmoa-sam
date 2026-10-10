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
const state={song:SONGS[0],ratio:1,beat:60000/66,events:[],phase:'idle',origin:0,countStart:0,countLen:6,lastCount:-1,lastSound:-1,lastUi:-1,raf:0,pausedAt:0,played:0,earned:0,extra:0,stats:{great:0,good:0,okay:0,miss:0,wrong:0},melody:true,audio:null,score:0};
function mkEvents(){
 state.beat=60000/(state.song.bpm*state.ratio);
 let time=0;
 state.events=state.song.parts.map((part,i)=>{
  const event={note:part[0],dur:part[1]*state.beat,lyric:part[2],ms:time,i,judged:false,grade:null,sounded:false};
  time+=event.dur;return event;
 });
 state.duration=time;
 state.countLen=state.song.meter===2?6:state.song.meter+2;
 state.lastSound=-1;state.lastUi=-1;
 state.earned=0;state.extra=0;state.played=0;state.score=0;
 state.stats={great:0,good:0,okay:0,miss:0,wrong:0};
}
function clearGameFrame(){if(state.raf)cancelAnimationFrame(state.raf);state.raf=0}
function setSettings(){const locked=['count','play','paused'].includes(state.phase);$('#songSelect').disabled=locked;$('#speedSelect').disabled=locked;$('#startBtn').disabled=locked}
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
function renderKeys(){
 $('#keys').innerHTML='';
 NOTES.forEach((note,i)=>{
  const b=document.createElement('button');b.className='key';b.type='button';b.dataset.note=note;
  b.style.background=COLORS[note];b.setAttribute('aria-label',note+' 소리 내기');
  b.innerHTML='<span>'+note+'</span><span class="hotkey">'+(i+1)+'</span>';
  b.addEventListener('click',()=>tap(note,b));$('#keys').appendChild(b);
 });
}
function renderTrack(){
 const track=$('#noteTrack');track.innerHTML='';
 state.events.forEach(e=>{
  const el=document.createElement('div');el.className='noteTile';el.dataset.i=String(e.i);
  el.innerHTML='<div class="tileNote" style="background:'+COLORS[e.note]+'">'+e.note+'</div><div class="tileLyric">'+e.lyric+'</div>';
  track.appendChild(el);
 });
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
 if(state.melody)tone(note,.34,.24);
 if(state.phase!=='play'){if(state.phase==='count')setFeedback('숫자가 끝나면 시작해요!');return}
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
 $('#currentCue').className='cue muted';$('#currentCue').textContent='♪';
 $('#currentCue').style.background='';$('#currentLyric').textContent='연습 준비';
 $('#nextCue').textContent='♪';$('#nextCue').style.background='';
 $('#countOverlay').hidden=true;$('#results').hidden=true;
 $('#pauseBtn').hidden=true;$('#startBtn').disabled=false;$('#startBtn').textContent='▶ 시작하기';
 $('#noteTrack').scrollLeft=0;setFeedback('준비되면 시작해요 🌼');refreshScore();setSettings();
}
function changeCue(index){
 if(index===state.lastUi)return;
 state.lastUi=index;
 const e=state.events[Math.max(0,Math.min(index,state.events.length-1))],next=state.events[index+1];
 const cue=$('#currentCue');cue.classList.remove('muted','beatGlow');void cue.offsetWidth;
 cue.classList.add('beatGlow');cue.textContent=e.note;cue.style.background=COLORS[e.note];
 $('#currentLyric').textContent=e.lyric?e.lyric:'이 음을 톡!';
 $('#nextCue').textContent=next?next.note:'완료';
 $('#nextCue').style.background=next?COLORS[next.note]:'#e7eee9';
 document.querySelectorAll('.noteTile').forEach((el,i)=>el.classList.toggle('active',i===index));
 const target=$('#noteTrack [data-i="'+index+'"]');
 if(target&&typeof target.scrollIntoView==='function')target.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});
}
function countWord(i){
 if(i<state.countLen-2)return String(i%state.song.meter+1);
 return '<span class="countChar '+(i===state.countLen-2?'active':'')+'">시</span><span class="countChar '+(i===state.countLen-1?'active':'')+'">작</span>';
}
function tick(now){
 if(state.phase==='count'){
  const i=Math.min(state.countLen-1,Math.floor((now-state.countStart)/state.beat));
  if(i!==state.lastCount&&i>=0){
   state.lastCount=i;
   const el=$('#countNumber');el.classList.toggle('syllables',i>=state.countLen-2);
   el.innerHTML=countWord(i);
   tone(i%state.song.meter===0?'high':'low',.12,.12,'beat');
  }
  if(now>=state.origin){
   state.phase='play';$('#countOverlay').hidden=true;state.lastUi=-1;
   setFeedback('첫 음부터 박자를 맞춰요!');
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
 const now=performance.now();state.countStart=now;state.origin=now+state.countLen*state.beat;
 $('#countOverlay').hidden=false;$('#countNumber').textContent='1';
 $('#pauseBtn').hidden=false;$('#pauseBtn').textContent='⏸ 잠깐 쉬기';
 $('#results').hidden=true;setSettings();
 if(state.melody){try{state.audio=new(window.AudioContext||window.webkitAudioContext)();state.audio.resume().catch(()=>{})}catch{}}
 state.raf=requestAnimationFrame(tick);
}
function selectSongAfterStart(){
 // start() is invoked only after the selection UI has already rebuilt the events.
 mkEvents();renderTrack();refreshScore();state.lastUi=-1;state.lastCount=-1;
 $('#currentCue').className='cue muted';$('#currentCue').textContent='♪';$('#currentLyric').textContent='연습 준비';
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
 $('#results').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function newGame(){if(state.phase==='count'||state.phase==='play'||state.phase==='paused'){clearGameFrame();state.phase='idle'}selectSong()}
function soundToggle(){state.melody=!state.melody;$('#soundBtn').textContent=state.melody?'🔊 노래 소리 켜짐':'🔇 노래 소리 꺼짐';$('#soundBtn').setAttribute('aria-pressed',String(state.melody))}
$('#songSelect').onchange=selectSong;$('#speedSelect').onchange=selectSong;
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
 state:()=>({phase:state.phase,song:state.song.id,bpm:60000/state.beat,events:state.events.map(e=>({note:e.note,ms:e.ms,dur:e.dur,grade:e.grade})),score:state.score,earned:state.earned,extra:state.extra,stats:{...state.stats},countLen:state.countLen,origin:state.origin}),
 simulateStart:()=>{clearGameFrame();state.phase='play';mkEvents();renderTrack();state.origin=performance.now();$('#countOverlay').hidden=true;return true},
 tapAt:(note,timeMs)=>judgeTap(note,timeMs),
 expire:(i)=>{judge(i,'miss',0);return state.score},
 finish:()=>{finish();return state.score},
 reset:()=>{clearGameFrame();state.phase='idle';selectSong()}
};
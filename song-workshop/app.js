/* 모아의 노래공방: 원곡 가사 + WebAudio 멜로디·반주 + 기기내 저장. 라이브러리·API·외부 음원 없음. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const THEMES={
 cheer:{icon:'🌟',title:'나는 빛나는 별',lines:['오늘도 웃으며 가요','나는 오늘도 신나요'],words:['나는','오늘도','할 수 있어','웃어요','신나요','괜찮아','빛나요','우리','함께','힘내요','다시','시작해']},
 friend:{icon:'🤝',title:'우리 함께 노래해',lines:['우리 모두 함께해요','너와 나는 친구야'],words:['우리','친구','너와','나는','함께','웃어요','고마워','안녕','손잡고','좋아요','반가워','노래해']},
 animal:{icon:'🐶',title:'동물들의 신나는 춤',lines:['강아지가 뛰어요','고양이가 춤춰요'],words:['강아지','고양이','토끼','멍멍','야옹','뛰어요','춤춰요','신나게','살금살금','함께','꼬리','놀아요']},
 weather:{icon:'🌈',title:'비가 와도 좋아',lines:['비가 와도 웃어요','무지개가 떠올라'],words:['비가','햇살','무지개','바람','반짝','와요','웃어요','좋아요','눈이','구름','춤춰요','하늘']},
 school:{icon:'🎒',title:'오늘의 작은 모험',lines:['오늘 학교에 가요','친구와 인사해요'],words:['학교','오늘','친구','선생님','교실','놀이터','인사해','배워요','신나요','다녀와','안녕','함께']},
 free:{icon:'🎨',title:'나의 새 노래',lines:['내 마음을 노래해','내 이야기를 들어줘'],words:['나는','나의','오늘','내일','마음','꿈','별빛','노래해','좋아요','반짝','신나요','함께']}
};
const PITCHES=[{name:'도',freq:261.63,color:'#ffe1a7'},{name:'레',freq:293.66,color:'#b6e3bd'},{name:'미',freq:329.63,color:'#a9d8f1'},{name:'솔',freq:392,color:'#d2c6f9'},{name:'라',freq:440,color:'#f3b9cf'}];
const NOTE_PATTERNS=[
 [[0,2,3,3,2,0,2,3],[3,2,0,2,3,3,2,0]],
 [[0,0,2,3,3,2,0,0],[2,3,2,0,2,3,2,0]],
 [[3,2,0,2,3,2,0,null],[0,2,3,2,0,2,0,null]],
 [[0,2,2,3,2,0,0,null],[3,3,2,0,2,0,0,null]]
];
const STORAGE_DRAFT='ulmoa-song-workshop-draft-v1',STORAGE_LIBRARY='ulmoa-song-workshop-library-v1';
const normalizeLyrics=t=>String(t||'').normalize('NFC').replace(/[\u0000-\u001f\u007f]/g,'').slice(0,30);
const syllables=t=>Array.from(normalizeLyrics(t).replace(/\s+/g,''));
const trimEight=t=>{const out=[];let n=0;for(const char of Array.from(normalizeLyrics(t))){if(!/\s/.test(char)){if(n>=8)break;n++}else if(!out.length||out[out.length-1]===' ')continue;out.push(char)}return out.join('').trim()};
const copy=v=>JSON.parse(JSON.stringify(v));
function template(theme='cheer'){
 const source=THEMES[theme]||THEMES.cheer;
 return{version:1,theme,title:source.title,lyrics:source.lines.slice(),notes:copy(NOTE_PATTERNS[0]),level:1,tempo:96,voice:'bell',backing:'both'};
}
function scrub(input){
 if(!input||typeof input!=='object'||input.version!==1||!Object.hasOwn(THEMES,input.theme))throw Error('지원하는 노래 파일이 아니에요.');
 const s=template(input.theme);
 s.title=String(input.title||s.title).replace(/[\u0000-\u001f\u007f]/g,'').slice(0,40);
 if(!Array.isArray(input.lyrics)||input.lyrics.length!==2)throw Error('가사 두 줄이 필요해요.');
 s.lyrics=input.lyrics.map(x=>trimEight(x));
 if(!Array.isArray(input.notes)||input.notes.length!==2||input.notes.some(line=>!Array.isArray(line)||line.length!==8))throw Error('음표는 줄마다 8칸이어야 해요.');
 s.notes=input.notes.map(line=>line.map(n=>{if(n===null)return null;if(!Number.isInteger(n)||n<0||n>4)throw Error('알 수 없는 음표가 들어 있어요.');return n}));
 s.level=[1,2,3].includes(input.level)?input.level:1;
 s.tempo=[72,96,120].includes(Number(input.tempo))?Number(input.tempo):96;
 s.voice=['piano','bell','soft'].includes(input.voice)?input.voice:'bell';
 s.backing=['none','beat','chord','both'].includes(input.backing)?input.backing:'both';
 return s;
}
let song=template(),selectedLine=0,patternIndex=0,playing=false,token=0,audio=null,nodes=new Set(),timers=[],saved=[];
function status(t,kind=''){const el=$('songStatus');el.textContent=t;el.dataset.kind=kind}
function getStorage(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch(e){return null}}
function putStorage(key,v){try{localStorage.setItem(key,JSON.stringify(v));return true}catch(e){return false}}
function updateDraft(){putStorage(STORAGE_DRAFT,song)}
function drawTheme(){document.querySelectorAll('[data-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===song.theme)));$('songTitle').value=song.title}
function drawVerseTabs(){document.querySelectorAll('[data-line]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.line)===selectedLine)))}
function drawWords(){const cards=$('wordCards');cards.replaceChildren();THEMES[song.theme].words.forEach(w=>{const b=document.createElement('button');b.type='button';b.className='word-card';b.textContent=w;b.setAttribute('aria-label',w+' 가사에 넣기');b.addEventListener('click',()=>addWord(w));cards.append(b)})}
function drawLyrics(){
 const chars=syllables(song.lyrics[selectedLine]),slots=$('lyricSlots');slots.replaceChildren();
 for(let i=0;i<8;i++){const div=document.createElement('span');div.className='lyric-slot '+(i<chars.length?'filled':'rest');div.textContent=chars[i]||'·';div.setAttribute('aria-label',(i+1)+'번째 '+(chars[i]||'빈 칸'));slots.append(div)}
 $('lyricCount').textContent='가사 8칸 중 '+chars.length+'칸 사용'+(chars.length===8?' · 완성!':' · 남은 '+(8-chars.length)+'칸');
 $('lyricInput').value=song.lyrics[selectedLine];
 $('verse0').textContent='💛 '+(song.lyrics[0]||'(첫 줄 비어 있어요)');
 $('verse1').textContent='💙 '+(song.lyrics[1]||'(두 번째 줄 비어 있어요)');
 drawGridSyllables();drawKaraoke();
}
function allowed(){return song.level===1?[0,2,3]:[0,1,2,3,4]}
function drawLevels(){document.querySelectorAll('[data-level]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.level)===song.level)))}
function drawGrid(){
 $('gridTitle').textContent=selectedLine===0?'💛 첫 번째 줄의 멜로디':'💙 두 번째 줄의 멜로디';
 const grid=$('noteGrid');grid.replaceChildren();
 const rows=[4,3,2,1,0],allowedPitches=allowed();
 for(const row of rows){
  const label=document.createElement('div');label.className='note-label';label.textContent=PITCHES[row].name;grid.append(label);
  for(let col=0;col<8;col++){
   const b=document.createElement('button');b.type='button';b.className='note-btn';b.dataset.col=col;b.dataset.pitch=row;b.style.setProperty('--tone',PITCHES[row].color);
   const on=song.notes[selectedLine][col]===row,enabled=allowedPitches.includes(row);
   b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-disabled',String(!enabled));b.setAttribute('aria-label',(col+1)+'번째 박 '+PITCHES[row].name+(on?' 선택됨':' 선택하기')+(enabled?'':' 현재 단계에서 선택 불가'));
   b.textContent=on?'♪':'·';if(!enabled)b.disabled=true;
   b.addEventListener('click',()=>{stop();song.notes[selectedLine][col]=on?null:row;updateDraft();drawGrid();previewPitch(row);status((col+1)+'번째 칸을 '+(on?'쉼으로 바꿨어요.':PITCHES[row].name+' 음으로 바꿨어요.'))});
   grid.append(b);
  }
 }
 if(song.level===3){const label=document.createElement('div');label.className='note-label';label.textContent='쉼';grid.append(label);
  for(let col=0;col<8;col++){const b=document.createElement('button');b.type='button';b.className='note-btn';b.dataset.col=col;b.dataset.rest='1';const on=song.notes[selectedLine][col]===null;b.textContent=on?'쉼':'○';b.setAttribute('aria-label',(col+1)+'번째 박 쉬기');b.setAttribute('aria-pressed',String(on));b.addEventListener('click',()=>{stop();song.notes[selectedLine][col]=null;updateDraft();drawGrid();status((col+1)+'번째 칸을 쉬는 박으로 바꿨어요.')});grid.append(b)}
 }
 drawGridSyllables();
}
function drawGridSyllables(active=-1){const el=$('gridSyllables');el.replaceChildren();const n=document.createElement('span');n.textContent='가사';el.append(n);
 const chars=syllables(song.lyrics[selectedLine]);for(let i=0;i<8;i++){const span=document.createElement('span');span.textContent=chars[i]||'·';span.dataset.col=i;if(i===active)span.classList.add('now');el.append(span)}
}
function drawKaraoke(active=-1){for(let r=0;r<2;r++){const div=$('playLine'+r),chars=syllables(song.lyrics[r]);div.replaceChildren();div.classList.toggle('empty',chars.length===0);
  if(!chars.length){div.textContent=r===0?'💛 첫 번째 줄에 가사를 넣어 주세요':'💙 두 번째 줄에 가사를 넣어 주세요';continue}
  chars.forEach((ch,i)=>{const s=document.createElement('span');s.textContent=ch;if(r*8+i===active)s.className='now';div.append(s)})}}
function render(){drawTheme();drawVerseTabs();drawWords();drawLyrics();drawLevels();drawGrid();$('tempo').value=String(song.tempo);$('voice').value=song.voice;$('backing').value=song.backing}
function setLine(n){stop();selectedLine=n;drawVerseTabs();drawLyrics();drawGrid();status((n===0?'첫':'두 번째')+' 줄을 편집해요.')}
function addWord(word){const old=song.lyrics[selectedLine],joined=old+(old.trim()?' ':'')+word;if(syllables(joined).length>8){status('이 줄은 8칸까지! 다른 낱말을 골라 보세요.','warn');return}
 song.lyrics[selectedLine]=joined;updateDraft();drawLyrics();status('💬 '+word+'를 가사에 넣었어요.')}
function applyTheme(theme){stop();song=template(theme);selectedLine=0;patternIndex=0;updateDraft();render();status(THEMES[theme].icon+' '+THEMES[theme].title+' 예시가 나왔어요. 가사와 음표를 바꿔 보세요!')}
function chooseLevel(level){stop();song.level=level;if(level===1){song.notes=song.notes.map(line=>line.map(n=>n===1?0:n===4?3:n))}updateDraft();drawLevels();drawGrid();
 status(['도·미·솔 3음부터 시작해요.','도·레·미·솔·라 5음을 골라요.','쉼표까지 넣어 자유롭게 만들어요.'][level-1])}
function idea(){stop();patternIndex=(patternIndex+1)%NOTE_PATTERNS.length;const base=NOTE_PATTERNS[patternIndex][selectedLine],pitches=allowed();
 song.notes[selectedLine]=base.map(n=>n===null?null:pitches.includes(n)?n:pitches[Math.min(pitches.length-1,Math.floor(n/2))]);updateDraft();drawGrid();status('🎲 멜로디 아이디어를 바꿨어요. 들어 보고 또 고쳐 보세요.')}
function audioContext(){const A=window.AudioContext||window.webkitAudioContext;if(!A)throw Error('이 브라우저는 오디오를 지원하지 않아요.');if(!audio)audio=new A();if(audio.state==='suspended')audio.resume();return audio}
function beep(ctx,freq,at,duration,volume,wave='sine',nodesList=null){
 const o=ctx.createOscillator(),g=ctx.createGain(),stopAt=at+Math.max(.04,duration);
 o.type=wave;o.frequency.setValueAtTime(Math.max(30,freq),at);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(Math.max(.00015,volume),at+.009);g.gain.exponentialRampToValueAtTime(.0001,stopAt);
 o.connect(g);g.connect(ctx.destination);o.start(at);o.stop(stopAt+.012);
 if(nodesList){nodesList.add(o);o.onended=()=>{nodesList.delete(o);try{o.disconnect();g.disconnect()}catch(e){}}}
 return o;
}
function drum(ctx,at,strong,nodesList){
 const o=ctx.createOscillator(),g=ctx.createGain(),end=at+(strong?.16:.09);
 o.type=strong?'sine':'triangle';o.frequency.setValueAtTime(strong?126:430,at);o.frequency.exponentialRampToValueAtTime(strong?52:230,end);
 g.gain.setValueAtTime(strong?.12:.055,at);g.gain.exponentialRampToValueAtTime(.0001,end);
 o.connect(g);g.connect(ctx.destination);o.start(at);o.stop(end+.015);
 if(nodesList){nodesList.add(o);o.onended=()=>{nodesList.delete(o);try{o.disconnect();g.disconnect()}catch(e){}}}
}
function scheduleSong(ctx,start,from=0,to=16,nodesList=null){
 const step=(60/song.tempo)/2, notes=[...song.notes[0],...song.notes[1]];
 const withBeat=['beat','both'].includes(song.backing),withChord=['chord','both'].includes(song.backing);
 const chords=[[261.63,329.63,392],[196,246.94,293.66],[220,261.63,329.63],[174.61,220,261.63]];
 for(let i=from;i<to;i++){
  const at=start+(i-from)*step;
  if(notes[i]!==null){const freq=PITCHES[notes[i]].freq;const wave=song.voice==='piano'?'triangle':song.voice==='soft'?'sine':'sine';
   const volume=song.voice==='bell'?.13:.17;beep(ctx,freq,at,step*.84,volume,wave,nodesList);
   if(song.voice==='bell')beep(ctx,freq*2,at,step*.48,.032,'sine',nodesList);
   if(song.voice==='piano')beep(ctx,freq*2,at,step*.25,.018,'sine',nodesList);
  }
  if(withBeat && i%2===0)drum(ctx,at,i%4===0,nodesList);
  if(withChord&&i%4===0){const chord=chords[Math.floor(i/4)];
   chord.forEach((freq,j)=>beep(ctx,freq/2,at,step*3.75,.025,j===0?'sine':'triangle',nodesList));
  }
 }
 return (to-from)*step;
}
function clearTimers(){timers.forEach(clearTimeout);timers=[]}
function stop(){token++;playing=false;clearTimers();nodes.forEach(o=>{try{o.stop()}catch(e){}});nodes.clear();
 $('playSong').disabled=false;$('demoNote').disabled=false;
 document.querySelectorAll('.note-btn.now').forEach(x=>x.classList.remove('now'));drawGridSyllables();drawKaraoke();
}
function tick(fn,ms){timers.push(setTimeout(fn,ms))}
function highlight(step){const line=Math.floor(step/8),col=step%8;
 drawKaraoke(step);if(line===selectedLine){drawGridSyllables(col);document.querySelectorAll('.note-btn').forEach(x=>x.classList.toggle('now',x.dataset.col===String(col)))}else{drawGridSyllables();document.querySelectorAll('.note-btn.now').forEach(x=>x.classList.remove('now'))}}
function play(start=0,stopAt=16){
 stop();let ctx;
 try{ctx=audioContext()}catch(e){status(e.message,'warn');return}
 const me=token,step=60/song.tempo/2;playing=true;$('playSong').disabled=true;$('demoNote').disabled=true;
 try{scheduleSong(ctx,ctx.currentTime+.1,start,stopAt,nodes)}catch(e){stop();status('오디오 재생 중 문제가 생겼어요. '+e.message,'warn');return}
 for(let i=start;i<stopAt;i++){tick(()=>{if(token!==me)return;highlight(i)},100+(i-start)*step*1000)}
 tick(()=>{if(token!==me)return;stop();status('🎉 내 노래를 들었어요! 가사나 음표를 더 바꿔 볼까요?','win')},100+(stopAt-start)*step*1000+80);
 status(start===0?'▶ 내가 만든 노래가 재생 중이에요. 가사 칸을 따라가 보세요.':'🎵 선택한 줄을 듣고 있어요.');
}
function previewPitch(p){try{const ctx=audioContext();beep(ctx,PITCHES[p].freq,ctx.currentTime+.01,.2,.075,'sine',nodes)}catch(e){status(e.message,'warn')}}
function wavBuffer(buffer){const pcm=buffer.getChannelData(0),len=pcm.length,bytes=44+len*2,d=new DataView(new ArrayBuffer(bytes));
 const str=(offset,v)=>{for(let i=0;i<v.length;i++)d.setUint8(offset+i,v.charCodeAt(i))};
 str(0,'RIFF');d.setUint32(4,bytes-8,true);str(8,'WAVE');str(12,'fmt ');d.setUint32(16,16,true);d.setUint16(20,1,true);d.setUint16(22,1,true);
 const rate=buffer.sampleRate;d.setUint32(24,rate,true);d.setUint32(28,rate*2,true);d.setUint16(32,2,true);d.setUint16(34,16,true);str(36,'data');d.setUint32(40,len*2,true);
 for(let i=0;i<len;i++){const value=Math.max(-1,Math.min(1,pcm[i]));d.setInt16(44+i*2,value<0?value*32768:value*32767,true)}return d.buffer;
}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function filename(){return(song.title.replace(/[\\/:*?"<>|\u0000-\u001f]/g,'').trim()||'내노래').slice(0,32)}
async function exportAudio(){stop();const b=$('downloadWav');b.disabled=true;status('🎧 내가 만든 연주 음원을 만들고 있어요.');
 try{const O=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!O)throw Error('이 브라우저에서는 WAV 만들기가 지원되지 않아요.');
  const sec=16*(60/song.tempo/2)+1,offline=new O(1,Math.ceil(sec*44100),44100);
  scheduleSong(offline,.1,0,16,null);const rendered=await offline.startRendering();
  download(new Blob([wavBuffer(rendered)],{type:'audio/wav'}),filename()+'_연주.wav');status('🎶 연주 음원 WAV를 저장했어요. 가창 목소리는 포함되지 않아요.','win');
 }catch(e){status('WAV 저장 실패: '+e.message,'warn')}finally{b.disabled=false}
}
function lyricsText(){return '모아의 노래공방\n제목: '+song.title+'\n\n[첫 번째 줄]\n'+song.lyrics[0]+'\n\n[두 번째 줄]\n'+song.lyrics[1]+'\n\n(내가 만든 노래 · 연주 음원은 WAV 파일로 별도 저장)'}
function library(){const v=getStorage(STORAGE_LIBRARY);saved=Array.isArray(v)?v.filter(x=>x&&typeof x.id==='string'&&x.project).slice(0,20):[]}
function drawLibrary(pick=''){const el=$('savedSongs');el.replaceChildren();
 if(!saved.length){const opt=document.createElement('option');opt.value='';opt.textContent='아직 저장한 곡이 없어요';el.append(opt);return}
 for(const entry of saved){const opt=document.createElement('option');opt.value=entry.id;opt.textContent=String(entry.project.title||'제목 없는 노래').slice(0,40)+' · '+new Date(entry.savedAt||Date.now()).toLocaleDateString('ko-KR');el.append(opt)}
 if(saved.some(e=>e.id===pick))el.value=pick;
}
function saveSong(){const title=song.title.trim()||'내 노래',id=String(Date.now());
 const entry={id,savedAt:new Date().toISOString(),project:copy({...song,title})};saved.unshift(entry);saved=saved.slice(0,20);
 if(putStorage(STORAGE_LIBRARY,saved)){drawLibrary(id);status('💾 '+title+' 곡을 저장했어요. 최대 20곡까지 이 기기에 보관해요.','win')}else status('이 브라우저에서 저장을 사용할 수 없어요. 수정용 곡 파일로 내려받아 주세요.','warn')}
function loadSong(){const id=$('savedSongs').value,item=saved.find(e=>e.id===id);if(!item){status('먼저 저장한 곡을 목록에서 골라 주세요.','warn');return}
 try{stop();song=scrub(item.project);selectedLine=0;updateDraft();render();status('📂 '+song.title+' 저장곡을 불러왔어요.','win')}catch(e){status('저장한 곡을 읽을 수 없어요: '+e.message,'warn')}}
async function importSong(file){if(!file)return;if(file.size>120000){status('곡 파일이 너무 커요. 120KB 이하 JSON 파일을 선택해 주세요.','warn');return}
 try{const raw=await file.text(),parsed=JSON.parse(raw),p=scrub(parsed);stop();song=p;selectedLine=0;updateDraft();render();status('🎉 곡 파일을 불러왔어요. 계속 수정할 수 있어요!','win')}catch(e){status('올바른 모아의 노래공방 곡 파일인지 확인해 주세요: '+e.message,'warn')}}
function speechLyrics(){if(!('speechSynthesis' in window)){status('이 브라우저는 한국어 가사 읽기를 지원하지 않아요.','warn');return}
 try{speechSynthesis.cancel();const utter=new SpeechSynthesisUtterance(song.lyrics.filter(Boolean).join('. '));utter.lang='ko-KR';utter.rate=.82;utter.pitch=1;speechSynthesis.speak(utter);status('🔈 가사를 말로 읽어 줘요. 노래를 부르는 목소리는 아니에요.')}
 catch(e){status('음성 읽기 기능을 사용할 수 없어요.','warn')}}
function bind(){
 document.querySelectorAll('[data-theme]').forEach(x=>x.addEventListener('click',()=>{const theme=x.dataset.theme;if(theme===song.theme)return;applyTheme(theme)}));
 $('songTitle').addEventListener('input',e=>{song.title=String(e.target.value).slice(0,40);updateDraft()});
 document.querySelectorAll('[data-line]').forEach(x=>x.addEventListener('click',()=>setLine(Number(x.dataset.line))));
 $('lyricInput').addEventListener('input',e=>{const text=normalizeLyrics(e.target.value);const capped=trimEight(text),truncated=syllables(text).length>8;song.lyrics[selectedLine]=capped;updateDraft();drawLyrics();if(truncated)status('이 줄은 8글자까지만 넣을 수 있어요.','warn')});
 $('wordBack').addEventListener('click',()=>{const chars=Array.from(song.lyrics[selectedLine]);chars.pop();song.lyrics[selectedLine]=chars.join('').trimEnd();updateDraft();drawLyrics();status('마지막 글자를 지웠어요.')});
 $('wordClear').addEventListener('click',()=>{song.lyrics[selectedLine]='';updateDraft();drawLyrics();status('이 줄을 지웠어요.')});
 $('wordExample').addEventListener('click',()=>{song.lyrics[selectedLine]=THEMES[song.theme].lines[selectedLine];updateDraft();drawLyrics();status('🌟 예시 가사를 다시 넣었어요.')});
 document.querySelectorAll('[data-level]').forEach(x=>x.addEventListener('click',()=>chooseLevel(Number(x.dataset.level))));
 $('melodyIdea').addEventListener('click',idea);$('melodyClear').addEventListener('click',()=>{stop();song.notes[selectedLine]=Array(8).fill(null);updateDraft();drawGrid();status('이 줄의 음표를 모두 지웠어요.')});
 $('demoNote').addEventListener('click',()=>play(selectedLine*8,selectedLine*8+8));
 ['tempo','voice','backing'].forEach(k=>$(k).addEventListener('change',e=>{stop();song[k]=k==='tempo'?Number(e.target.value):e.target.value;updateDraft();status('재생 설정을 바꿨어요. ▶ 내 노래 듣기를 눌러요.')}));
 $('playSong').addEventListener('click',()=>play());$('stopSong').addEventListener('click',()=>{stop();status('■ 재생을 멈췄어요.')});
 $('readLyrics').addEventListener('click',speechLyrics);
 $('saveSong').addEventListener('click',saveSong);$('loadSong').addEventListener('click',loadSong);
 $('downloadWav').addEventListener('click',exportAudio);
 $('downloadLyrics').addEventListener('click',()=>{download(new Blob(['\ufeff'+lyricsText()],{type:'text/plain;charset=utf-8'}),filename()+'_가사.txt');status('📝 가사 TXT 파일을 저장했어요.','win')});
 $('downloadProject').addEventListener('click',()=>{download(new Blob([JSON.stringify(song,null,2)],{type:'application/json;charset=utf-8'}),filename()+'_수정용곡.json');status('📁 수정용 곡 파일을 저장했어요. 다른 기기에서도 다시 열 수 있어요.','win')});
 $('importProject').addEventListener('click',()=>$('projectFile').click());$('projectFile').addEventListener('change',async e=>{await importSong(e.target.files?.[0]);e.target.value=''});
 $('printSong').addEventListener('click',()=>window.print());
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&playing){stop();status('■ 재생을 멈췄어요.')}});
}
try{const v=getStorage(STORAGE_DRAFT);if(v)song=scrub(v)}catch(e){song=template()}
library();render();drawLibrary();bind();
})();

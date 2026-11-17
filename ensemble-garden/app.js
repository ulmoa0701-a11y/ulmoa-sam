(()=>{'use strict';
const M=window.MoaPlay,$=M.$;
const defs=[{id:'drum',name:'북',emoji:'🥁',color:'#f9ddba',edge:'#e4af78'},{id:'piano',name:'피아노',emoji:'🎹',color:'#d8edc7',edge:'#a7c990'},{id:'guitar',name:'기타',emoji:'🎸',color:'#e2dffc',edge:'#b6a9e1'},{id:'bell',name:'벨',emoji:'🔔',color:'#ffdfeb',edge:'#dfafc3'}];
let tracks=defs.map((d,i)=>({steps:(i===0?[1,0,1,0,1,0,1,0]:i===1?[1,0,0,0,1,0,0,0]:i===2?[0,0,1,0,0,0,1,0]:[0,0,0,1,0,0,0,1]).map(Boolean),muted:false,volume:75})),parts=2,solo=null,liveHits=0,view='compose';
function volume(i){return .16*tracks[i].volume/100}
function isAudible(i,only=null){return i<parts&&!tracks[i].muted&&tracks[i].volume>0&&(only===null||only===i)}
function playNote(i){try{if(tracks[i].volume>0)M.instrument(defs[i].id,volume(i))}catch(e){M.putStatus('mixStatus',e.message,'warn')}}
function renderTracks(){const root=$('tracks');root.replaceChildren();
 for(let i=0;i<parts;i++){const d=defs[i],state=tracks[i],row=document.createElement('div');row.className='track';row.dataset.track=i;
 const head=document.createElement('div');head.className='trackhead';
 const name=document.createElement('strong');name.className='trackname';name.textContent=d.emoji+' '+d.name;head.append(name);
 const tools=document.createElement('div');tools.className='tracktools';
 const only=document.createElement('button');only.type='button';only.className='tiny';only.textContent='혼자 듣기';only.setAttribute('aria-pressed',String(solo===i));only.setAttribute('aria-label',d.name+' 혼자 듣기');only.addEventListener('click',()=>{M.halt();solo=solo===i?null:i;renderTracks();M.putStatus('mixStatus',solo===null?'모든 악기를 다시 들을 수 있어요.':d.name+'만 선택했어요. ▶ 재생해 보세요.')});
 const mute=document.createElement('button');mute.type='button';mute.className='tiny';mute.textContent=state.muted?'음소거 해제':'음소거';mute.setAttribute('aria-pressed',String(state.muted));mute.addEventListener('click',()=>{M.halt();state.muted=!state.muted;renderTracks();M.putStatus('mixStatus',d.name+' '+(state.muted?'소리를 껐어요.':'소리를 켰어요.'))});
 tools.append(only,mute);head.append(tools);
 const lbl=document.createElement('label');lbl.className='controlrow';lbl.textContent='음량 ';const range=document.createElement('input');range.className='trackvol';range.type='range';range.min='0';range.max='100';range.step='10';range.value=String(state.volume);range.setAttribute('aria-label',d.name+' 음량');const val=document.createElement('span');val.textContent=state.volume+'%';range.addEventListener('input',()=>{state.volume=Number(range.value);val.textContent=range.value+'%'});lbl.append(range,val);head.append(lbl);row.append(head);
 const cells=document.createElement('div');cells.className='trackgrid';cells.style.setProperty('--track-color',d.color);cells.style.setProperty('--track-line',d.edge);cells.setAttribute('role','group');cells.setAttribute('aria-label',d.name+' 8박 패턴');
 state.steps.forEach((on,col)=>{const b=document.createElement('button');b.type='button';b.dataset.step=col;b.textContent=on?'●':'·';b.setAttribute('aria-label',d.name+' '+(col+1)+'번째 박 '+(on?'켜짐':'꺼짐'));b.setAttribute('aria-pressed',String(on));b.addEventListener('click',()=>{M.halt();state.steps[col]=!state.steps[col];renderTracks();if(state.steps[col])playNote(i);M.putStatus('mixStatus',d.name+' '+(col+1)+'번째 칸을 '+(state.steps[col]?'켰어요.':'껐어요.'))});cells.append(b)});
 row.append(cells);root.append(row)}
}
function liveRender(){const root=$('liveKeys');root.replaceChildren();for(let i=0;i<parts;i++){const d=defs[i],b=document.createElement('button');b.type='button';b.className='livekey';b.style.setProperty('--key-bg',d.color);b.style.setProperty('--key-line',d.edge);b.setAttribute('aria-label',d.name+' 소리 내기');const icon=document.createElement('b');icon.setAttribute('aria-hidden','true');icon.textContent=d.emoji;const name=document.createElement('span');name.textContent=d.name+' 눌러보기';b.append(icon,name);b.addEventListener('click',()=>{playNote(i);M.flash(b,'pressed',170);liveHits++;$('liveCount').textContent='누른 횟수 '+liveHits+'회';M.putStatus('liveStatus',d.emoji+' '+d.name+' 소리를 냈어요.')});root.append(b)}}
function setParts(n){M.halt();parts=n;if(solo!==null&&solo>=parts)solo=null;document.querySelectorAll('[data-parts]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.parts)===n)));renderTracks();liveRender();M.putStatus('mixStatus',n+'개 악기로 시작해 보세요. 칸을 누르고 들어보기를 눌러요.')}
document.querySelectorAll('[data-parts]').forEach(b=>b.addEventListener('click',()=>setParts(Number(b.dataset.parts))));
function play(only){M.halt();if(only!==null&&!isAudible(only,only)){M.putStatus('mixStatus','해당 악기의 음소거를 해제하거나 음량을 높여 보세요.','warn');return}
 M.putStatus('mixStatus','🎵 재생 중이에요. 불이 켜지는 칸을 따라가요.');
 M.sequence(8,60000/Number($('tempo').value),step=>{
  document.querySelectorAll('#tracks .track').forEach(row=>{row.querySelectorAll('.trackgrid button').forEach(b=>b.classList.toggle('current',Number(b.dataset.step)===step))});
  for(let i=0;i<parts;i++)if(tracks[i].steps[step]&&isAudible(i,only))playNote(i);
 },err=>{document.querySelectorAll('#tracks .trackgrid button').forEach(b=>b.classList.remove('current'));M.putStatus('mixStatus',err?err.message:'재생이 끝났어요. 악기를 하나씩 꺼서 비교해 보세요.',err?'warn':'')});
}
$('playAll').addEventListener('click',()=>{solo=null;renderTracks();play(null)});
$('playOnce').addEventListener('click',()=>{let i=solo===null?0:solo;solo=i;renderTracks();play(i)});
$('stop').addEventListener('click',()=>{M.halt();document.querySelectorAll('#tracks .trackgrid button').forEach(b=>b.classList.remove('current'));M.putStatus('mixStatus','재생을 멈췄어요.')});
$('sample').addEventListener('click',()=>{M.halt();tracks.forEach((track,i)=>{const arr=[[1,0,1,0,1,0,1,0],[1,0,0,0,1,0,0,0],[0,0,1,0,0,0,1,0],[0,0,0,1,0,0,0,1]][i];track.steps=arr.map(Boolean);track.muted=false});solo=null;renderTracks();M.putStatus('mixStatus','예시 합주를 만들었어요. ▶ 모두 듣기를 눌러요.')});
$('clear').addEventListener('click',()=>{M.halt();tracks.forEach(t=>t.steps.fill(false));solo=null;renderTracks();M.putStatus('mixStatus','모든 박자 칸을 지웠어요.')});
$('save').addEventListener('click',()=>M.putStatus('mixStatus',M.save('ensemble-v1',{tracks,parts,tempo:$('tempo').value})?'이 브라우저에 저장했어요.':'저장 기능이 차단됐어요.',M.load('ensemble-v1')?'':'warn'));
$('load').addEventListener('click',()=>{const d=M.load('ensemble-v1');if(!d||![1,2,4].includes(Number(d.parts))||!Array.isArray(d.tracks)||d.tracks.length!==4||d.tracks.some(t=>!Array.isArray(t.steps)||t.steps.length!==8)){M.putStatus('mixStatus','저장한 합주가 없거나 읽을 수 없어요.','warn');return}
 tracks=d.tracks.map(t=>({steps:t.steps.map(Boolean),muted:!!t.muted,volume:Math.max(0,Math.min(100,Number(t.volume)||0))}));$('tempo').value=['70','90','110'].includes(String(d.tempo))?String(d.tempo):'90';setParts(Number(d.parts));M.putStatus('mixStatus','저장한 합주를 불러왔어요.')});
$('copy').addEventListener('click',()=>M.copy(M.noteText('악기합주 관찰 메모',[
 '보인 악기 수: '+parts+'개','활성화된 소리 칸: '+tracks.slice(0,parts).reduce((sum,t)=>sum+t.steps.filter(Boolean).length,0),
 '빠르기: '+$('tempo').selectedOptions[0].textContent,'실시간 악기 버튼 누름: '+liveHits+'회'
]),'mixStatus'));
$('resetCount').addEventListener('click',()=>{liveHits=0;$('liveCount').textContent='누른 횟수 0회';M.putStatus('liveStatus','다시 하나씩 눌러 보세요.')});
function changeView(v){M.halt();view=v;$('composePanel').hidden=v!=='compose';$('livePanel').hidden=v!=='live';document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.view===v)));const url=new URL(location.href);url.searchParams.set('view',v);history.replaceState(null,'',url)}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>changeView(b.dataset.view)));
setParts(2);const query=new URLSearchParams(location.search).get('view');if(['compose','live'].includes(query))changeView(query);
})();

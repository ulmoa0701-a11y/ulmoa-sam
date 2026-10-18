"use strict";
(function(){
const NOTE_ORDER=["도","레","미","파","솔","라","시","높은 도"];
const COLORS={"도":"#e87e74","레":"#edaf77","미":"#e9d375","파":"#9dcd82","솔":"#84bcc8","라":"#b09add","시":"#e6a3c5","높은 도":"#e87e74"};
const FREQ={"도":261.6256,"레":293.6648,"미":329.6276,"파":349.2282,"솔":391.9954,"라":440,"시":493.8833,"높은 도":523.2511};
const WORLD={
 garden:{name:"음악정원",title:"꽃씨가 잠에서 깨어나요",help:"음악이 흐르면 꽃들이 하나씩 피어나요.",hint:"꽃씨를 따라 선율을 연주해요.",song:"garden-song",accent:"#3b9178"},
 train:{name:"리듬기차",title:"칙칙폭폭, 음악 마을로",help:"한 마디씩 지나가며 다음 마을에 가까워져요.",hint:"기차표를 따라 리듬을 연주해요.",song:"train-song",accent:"#5a80b4"},
 bridge:{name:"리듬다리",title:"알록달록 징검다리 건너기",help:"음악이 진행되면 징검다리가 차례로 나타나요.",hint:"돌에 쓰인 음을 보고 연주해요.",song:"bridge-song",accent:"#398d99"},
 orchestra:{name:"숲속 합주단",title:"동물 친구들의 첫 합주",help:"차례가 오면 동물 친구들이 소리를 보태요.",hint:"친구의 색깔 음을 찾아 연주해요.",song:"orchestra-song",accent:"#777ab3"},
 stars:{name:"별빛 탐험",title:"밤하늘에 선율을 그려요",help:"음악에 따라 별들이 하나둘 연결돼요.",hint:"별빛 음표를 따라 연주해요.",song:"stars-song",accent:"#596bb7"},
 bakery:{name:"리듬빵집",title:"오늘은 특별한 음악빵",help:"한 마디가 끝날 때마다 빵이 하나씩 완성돼요.",hint:"재료에 적힌 음을 따라 연주해요.",song:"bakery-song",accent:"#bc796c"}
};
const RAW=[
 ["garden-song","꽃씨의 인사",92,[
 "도:1,미:1,솔:1,미:1","레:1,미:1,솔:2","미:.5,솔:.5,라:1,솔:1,미:1","레:1,도:1,레:1,미:1",
 "도:1,미:1,솔:1,높은 도:1","라:1,솔:1,미:1,레:1","파:.5,미:.5,레:1,도:2","미:1,레:1,도:2"]],
 ["train-song","리듬기차 출발",110,[
 "도:.5,미:.5,솔:1,도:.5,미:.5,솔:1","라:1,솔:1,미:1,레:1","도:.5,레:.5,미:.5,솔:.5,라:2","솔:1,미:1,레:1,도:1",
 "미:.5,솔:.5,라:1,솔:.5,미:.5,레:1","도:1,미:1,솔:2","라:.5,솔:.5,미:1,레:1,미:1","솔:1,레:1,도:2"]],
 ["bridge-song","무지개 돌다리",88,[
 "도:1,레:1,미:1,솔:1","라:2,솔:1,미:1","레:.5,미:.5,파:1,솔:2","미:1,레:1,도:2",
 "도:.5,미:.5,솔:1,시:1,높은 도:1","시:.5,라:.5,솔:1,미:2","파:1,미:1,레:1,시:1","높은 도:1,솔:1,도:2"]],
 ["orchestra-song","숲속의 첫 합주",96,[
 "도:1,미:1,솔:1,미:1","레:1,파:1,라:1,파:1","미:.5,솔:.5,라:1,솔:1,미:1","레:1,미:1,도:2",
 "솔:1,라:1,시:1,높은 도:1","시:.5,라:.5,솔:1,미:1,레:1","파:1,미:1,레:1,솔:1","미:1,레:1,도:2"]],
 ["stars-song","별이 되어 반짝",78,[
 "도:2,솔:1,라:1","높은 도:2,시:1,솔:1","라:1,솔:1,미:2","파:1,미:1,레:2",
 "도:1,미:1,솔:2","높은 도:1,시:1,라:2","솔:1,미:1,레:1,시:1","높은 도:1,솔:1,도:2"]],
 ["bakery-song","노릇노릇 리듬빵",104,[
 "도:.5,도:.5,미:.5,미:.5,솔:1,미:1","레:1,미:1,솔:.5,라:.5,솔:1","미:.5,솔:.5,라:.5,솔:.5,미:2","레:1,도:1,레:1,미:1",
 "파:.5,파:.5,미:.5,솔:.5,라:1,솔:1","미:1,레:1,도:1,솔:1","라:.5,솔:.5,미:.5,레:.5,도:2","미:1,레:1,도:2"]]
];
function rhythmSong(key,title,bpm,lens,mel){
 const out=[];for(let bar=0;bar<8;bar++){let pat=lens[bar%lens.length],pos=0,items=[];for(let i=0;i<pat.length;i++){items.push(mel[(bar*4+Math.floor(pos))%mel.length]+":"+pat[i]);pos+=pat[i]}out.push(items.join(","))}
 return [key,title,bpm,out]
}
RAW.push(
 rhythmSong("beat-basic","한 박씩 걸어요",80,[[1,1,1,1]],["도","미","솔","미","레","미","솔","레","도","미","라","솔","파","미","레","도"]),
 rhythmSong("beat-half","반 박씩 두 번",76,[[.5,.5,.5,.5,.5,.5,.5,.5]],["도","미","솔","미","레","미","솔","레","도","미","라","솔","파","미","레","도"]),
 rhythmSong("sixteenth","빠른 박 네 번",68,[[1,1,1,1],[.5,.5,.5,.5,1,1],[.25,.25,.25,.25,1,1,1],[.25,.25,.25,.25,.5,.5,.5,.5,1]],["도","미","솔","미","레","미","솔","레","도","미","라","솔","파","미","레","도"]),
 rhythmSong("dotted","길고 짧은 리듬",82,[[1.5,.5,1.5,.5],[.75,.25,.75,.25,1.5,.5]],["도","미","솔","미","레","미","솔","레","도","미","라","솔","파","미","레","도"])
);
const SONGS=RAW.map(([id,title,bpm,bars])=>{
 let events=[],beat=0;for(const [barIndex,bar] of bars.entries()){let sum=0;for(const piece of bar.split(",")){const parts=piece.split(":"),dur=Number(parts[1]);if(!FREQ[parts[0]]||!Number.isFinite(dur)||dur<=0)throw Error("잘못된 음표: "+piece);events.push({id:events.length,note:parts[0],beat,dur,bar:barIndex});beat+=dur;sum+=dur}
 if(Math.abs(sum-4)>1e-7)throw Error(title+" "+(barIndex+1)+"마디가 4박이 아닙니다: "+sum);
 }return {id,title,bpm,bars:bars.length,events,totalBeat:beat};
});
const byId=Object.fromEntries(SONGS.map(s=>[s.id,s]));
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
let world="garden",song=byId[WORLD.garden.song],notesMode=5,speed=1,section="all",loop=false,motionReduced=matchMedia("(prefers-reduced-motion: reduce)").matches,soundOn=true;
let playing=false,ended=false,pos=-4,startedAtPerf=0,ctxAudio=null,startAtAudio=0,raf=0,matched=new Set(),tapCount=0,hitCount=0,flashNote="",flashUntil=0,exporting=false,loopRound=0;
const canvas=$("#scene"),ctx=canvas.getContext("2d"),padElements=$$(".pad");
const modeNotes=()=>notesMode===3?["도","미","솔"]:notesMode===5?["도","레","미","솔","라"]:NOTE_ORDER;
const sectionStart=()=>section==="all"?0:Number(section)*4;
const sectionEnd=()=>section==="all"?song.totalBeat:Math.min(song.totalBeat,sectionStart()+16);
const beatSec=()=>60/(song.bpm*speed);
const readPos=()=>!playing?pos:ctxAudio?(ctxAudio.currentTime-startAtAudio)/beatSec():(performance.now()-startedAtPerf)/1000/beatSec();
const activeEvents=()=>song.events.filter(e=>e.beat>=sectionStart()&&e.beat<sectionEnd());
function showToast(s){const el=$("#toast");el.textContent=s;el.classList.add("show");clearTimeout(showToast._t);showToast._t=setTimeout(()=>el.classList.remove("show"),2600)}
function status(s){$("#status").textContent=s}
function updatePads(){const mask=new Set(modeNotes());padElements.forEach(p=>{const on=mask.has(p.dataset.note);p.classList.toggle("inactive",!on);p.setAttribute("aria-pressed",on?"true":"false")})}
function updateWorldUi(){
 $$(".world-card").forEach(b=>{const on=b.dataset.world===world;b.classList.toggle("active",on);b.setAttribute("aria-pressed",String(on))});
 const w=WORLD[world];$("#worldTitle").textContent=w.title;$("#missionLabel").textContent="모아의 "+w.name;$("#missionHelp").textContent=w.help;$("#overlayKicker").textContent=w.name;
 document.documentElement.style.setProperty("--leaf",w.accent);$("#noteHint").textContent=w.hint;
}
function updateSongUI(){
 $("#songSelect").value=song.id;$("#notesSelect").value=String(notesMode);$("#speedSelect").value=String(speed);$("#sectionSelect").value=section;
 $("#loopToggle").checked=loop;$("#motionToggle").checked=motionReduced;updatePads();updateProgress();
}
function updateProgress(){
 const p=Math.max(0,Math.min(1,(Math.max(sectionStart(),pos)-sectionStart())/Math.max(1,sectionEnd()-sectionStart())));
 $("#progressText").textContent=Math.round(p*100)+"%";$("#progressFill").style.width=(p*100)+"%";
 $("#tapCounter").textContent="화면 터치 "+tapCount+"회 · 맞는 순간 "+hitCount+"회";
 if(!playing){$("#beatHint").textContent=ended?"한 곡이 끝났어요":"연주 준비";return}
 $("#beatHint").textContent=pos<sectionStart()?"전주 · 음악을 먼저 들어요":(Math.floor((pos-sectionStart())/4)+1)+"마디 · "+(Math.floor(pos%4)+1)+"박";
}
function overlay(kicker,title,help,button){$("#overlayKicker").textContent=kicker;$("#overlayTitle").textContent=title;$("#overlayHelp").textContent=help;$("#startBig").firstChild.textContent=button+" ";$("#startOverlay").hidden=false}
function clearOverlay(){$("#startOverlay").hidden=true}
function fresh(resetTaps=true){stopClock();pos=sectionStart()-4;ended=false;loopRound=0;if(resetTaps){matched.clear();hitCount=0;tapCount=0}overlay(WORLD[world].name,"준비됐나요?","전주를 듣고, 내 색이 올 때 함께 연주해요.","연주 시작");$("#playBtn").textContent="연주 시작";updateProgress();drawFrame(performance.now())}
function stopClock(){playing=false;if(ctxAudio){try{ctxAudio.close().catch(()=>{})}catch(e){}ctxAudio=null}cancelAnimationFrame(raf);raf=0}
function createContext(){const A=window.AudioContext||window.webkitAudioContext;return A?new A():null}
function voice(ac,dest,frequency,when,duration,vol=.12,style="melody"){
 if(!ac||!dest||when+duration<ac.currentTime)return;
 const t=Math.max(ac.currentTime+.003,when),delay=t-when,len=Math.max(.06,duration-delay),gain=ac.createGain();
 gain.gain.setValueAtTime(.0001,t);
 gain.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),t+.018);
 gain.gain.exponentialRampToValueAtTime(.0001,t+len);
 gain.connect(dest);
 const osc=ac.createOscillator();osc.type=style==="bass"?"sine":"triangle";osc.frequency.setValueAtTime(frequency,t);osc.connect(gain);osc.start(t);osc.stop(t+len+.025);
 if(style==="melody"){const shine=ac.createOscillator(),g=ac.createGain();shine.type="sine";shine.frequency.setValueAtTime(frequency*2,t);g.gain.value=.12;shine.connect(g);g.connect(gain);shine.start(t);shine.stop(t+len+.025)}
}
const chordSets=[[130.81,164.81,196],[174.61,220,261.63],[196,246.94,293.66],[130.81,164.81,196],[174.61,220,261.63],[196,246.94,293.66],[174.61,220,261.63],[130.81,164.81,196]];
function scheduleAudio(ac,dest,zeroTime,fromBeat,toBeat){
 const step=beatSec(),actualStart=sectionStart(),actualEnd=sectionEnd();
 const last=song.events.filter(e=>e.bar===Math.min(song.bars-1,Math.floor(actualEnd/4)-1));
 if(fromBeat<actualStart){let sum=actualStart-4;for(const e of last){if(sum>=actualStart)break;const when=zeroTime+sum*step;voice(ac,dest,FREQ[e.note],when,Math.min(e.dur*step*.75,.7),.052,"melody");sum+=e.dur}}
 for(const e of song.events){if(e.beat<Math.max(fromBeat,actualStart)||e.beat>=Math.min(actualEnd,toBeat))continue;const when=zeroTime+e.beat*step;voice(ac,dest,FREQ[e.note],when,Math.min(e.dur*step*.82,1.2),.13,"melody")}
 for(let b=actualStart;b<actualEnd;b+=4){if(b+3.99<fromBeat)continue;const chord=chordSets[Math.floor(b/4)%chordSets.length];for(const f of chord){voice(ac,dest,f,zeroTime+b*step,Math.min(step*3.8,2.3),.022,"bass")}}
}
async function play(){
 if(exporting)return;
 if(ended)fresh();
 if(pos>=sectionEnd())pos=sectionStart()-4;
 try{ctxAudio=createContext();if(ctxAudio){await ctxAudio.resume();startAtAudio=ctxAudio.currentTime-pos*beatSec();if(soundOn){const gain=ctxAudio.createGain();gain.gain.value=.72;gain.connect(ctxAudio.destination);scheduleAudio(ctxAudio,gain,startAtAudio,pos,sectionEnd())}}}catch(e){ctxAudio=null;status("소리가 제한됐지만 화면 연주는 계속할 수 있어요.")}
 startedAtPerf=performance.now()-pos*beatSec()*1000;playing=true;clearOverlay();$("#playBtn").textContent="일시정지";status("음악이 흐르는 중이에요. 실제 붐웨커를 연주해도 좋아요.");cancelAnimationFrame(raf);raf=requestAnimationFrame(tick)
}
function pause(){if(!playing)return;pos=readPos();stopClock();overlay(WORLD[world].name,"잠시 쉬어요","현재 자리에서 이어서 연주할 수 있어요.","이어 연주");$("#playBtn").textContent="이어 연주";updateProgress();drawFrame(performance.now())}
function finish(){stopClock();pos=sectionEnd();ended=true;$("#playBtn").textContent="다시 연주";overlay(WORLD[world].name,"음악여행이 끝났어요","음악이 끝났어요. 화면에서 맞게 누른 음: "+hitCount+"개. 실제 악기 연주는 채점하지 않았어요.","다시 연주");status("음악이 끝났어요. 다음 여행도 골라볼까요?");updateProgress();drawFrame(performance.now())}
function tick(now){
 if(!playing)return;pos=readPos();
 if(pos>=sectionEnd()){if(loop){loopRound++;const keepHits=false;const again=()=>{stopClock();pos=sectionStart()-4;matched.clear();hitCount=0;if(!keepHits)tapCount=0;play()};again();return}finish();return}
 updateProgress();drawFrame(now);raf=requestAnimationFrame(tick)
}
function playTap(note){
 tapCount++;flashNote=note;flashUntil=performance.now()+260;
 const p=padElements.find(e=>e.dataset.note===note);if(p){p.classList.add("hit");clearTimeout(p._hitTimeout);p._hitTimeout=setTimeout(()=>p.classList.remove("hit"),190)}
 if(soundOn){try{const ac=createContext();if(ac){ac.resume().then(()=>{const dest=ac.createGain();dest.gain.value=.72;dest.connect(ac.destination);voice(ac,dest,FREQ[note],ac.currentTime+.015,.28,.17);setTimeout(()=>ac.close().catch(()=>{}),600)}).catch(()=>{})}}catch(e){}}
 if(playing&&pos>=sectionStart()&&pos<sectionEnd()&&modeNotes().includes(note)){
  let best=null,dist=.34;for(const e of activeEvents()){const d=Math.abs(e.beat-pos);if(e.note===note&&!matched.has(e.id)&&d<=dist){dist=d;best=e}}
  if(best){matched.add(best.id);hitCount++;flashUntil=performance.now()+580;status("좋아요! "+note+" 음을 찾았어요.");}
 }
 updateProgress();drawFrame(performance.now())
}
function switchWorld(next){if(!WORLD[next]||exporting)return;world=next;song=byId[WORLD[next].song];fresh();updateWorldUi();updateSongUI();status(WORLD[next].name+" 여행을 골랐어요.")}
function switchSong(id){if(!byId[id]||exporting)return;song=byId[id];fresh();updateSongUI();status(song.title+" 연주곡을 불러왔어요.")}
function sectionChanged(){fresh();updateSongUI()}
function font(ctx,size,weight="800"){ctx.font=weight+" "+size+"px Pretendard,SUIT,'Malgun Gothic',sans-serif"}
function pathRound(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();if(c.roundRect){c.roundRect(x,y,w,h,r);return}c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function rect(c,x,y,w,h,col,r=0){c.fillStyle=col;if(r){pathRound(c,x,y,w,h,r);c.fill()}else c.fillRect(x,y,w,h)}
function circle(c,x,y,r,col){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=col;c.fill()}
function line(c,x,y,X,Y,col="#fff",width=2){c.beginPath();c.moveTo(x,y);c.lineTo(X,Y);c.strokeStyle=col;c.lineWidth=width;c.stroke()}
function text(c,t,x,y,size=20,color="#263d44",align="left",weight="800"){c.textAlign=align;c.textBaseline="middle";font(c,size,weight);c.fillStyle=color;c.fillText(String(t),x,y)}
function grad(c,top,bottom,h=410){const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,top);g.addColorStop(1,bottom);rect(c,0,0,1120,h,g)}
function cloud(c,x,y,size=1,alpha=.8){c.save();c.globalAlpha=alpha;circle(c,x,y,23*size,"#fff");circle(c,x+23*size,y-12*size,31*size,"#fff");circle(c,x+59*size,y,25*size,"#fff");rect(c,x-4*size,y,68*size,21*size,"#fff",11*size);c.restore()}
function flower(c,x,y,r,color,opened=true){line(c,x,y+r*.25,x,y+r*1.9,"#408a6d",4);circle(c,x-9,y+r*1.4,8,"#68ab82");circle(c,x+9,y+r*1.15,8,"#68ab82");if(!opened){circle(c,x,y,r*.7,color);return}for(let i=0;i<6;i++){const a=i*Math.PI/3;circle(c,x+Math.cos(a)*r*.7,y+Math.sin(a)*r*.7,r*.55,color)}circle(c,x,y,r*.48,"#ffe9a0")}
function animal(c,x,y,type,active){const fur={rabbit:"#f3dfc6",bear:"#bb8f73",fox:"#efb98a",owl:"#cca6a0"}[type],bop=active?Math.sin(performance.now()/140)*4:0;c.save();c.translate(x,y+bop);circle(c,0,0,35,fur);if(type==="rabbit"){rect(c,-24,-58,17,40,fur,9);rect(c,7,-58,17,40,fur,9)}else if(type==="bear"){circle(c,-24,-25,15,fur);circle(c,24,-25,15,fur)}else if(type==="fox"){c.beginPath();c.moveTo(-33,-15);c.lineTo(-25,-48);c.lineTo(-4,-25);c.moveTo(33,-15);c.lineTo(25,-48);c.lineTo(4,-25);c.closePath();c.fillStyle=fur;c.fill()}else {circle(c,-28,-30,14,fur);circle(c,28,-30,14,fur)}circle(c,-12,-2,4,"#455d64");circle(c,12,-2,4,"#455d64");circle(c,0,13,5,"#efc0b6");rect(c,-21,30,42,36,fur,12);if(active){circle(c,0,-70,8,"#ffd875");text(c,"♪",0,-75,26,"#426d8b","center")}c.restore()}
function progressCount(b){return Math.max(0,Math.min(8,Math.floor(Math.max(0,b)/4)+.00001))}
function drawGarden(c,b,t){
 grad(c,"#dff5eb","#afdac4");circle(c,941,84,43,"#f6e9a8");cloud(c,125,84,1.1,.72);cloud(c,657,130,.72,.55);
 c.beginPath();c.moveTo(0,318);c.bezierCurveTo(290,172,480,354,722,270);c.bezierCurveTo(873,217,970,240,1120,306);c.lineTo(1120,412);c.lineTo(0,412);c.fillStyle="#93c7a4";c.fill();
 c.beginPath();c.moveTo(0,343);c.bezierCurveTo(240,290,340,425,670,327);c.bezierCurveTo(820,272,1000,390,1120,325);c.lineTo(1120,418);c.lineTo(0,418);c.fillStyle="#77b88f";c.fill();
 rect(c,61,287,997,108,"#aed39e",32);
 for(let i=0;i<8;i++){const x=116+i*127,done=b>=(i+1)*4,seed=b>=i*4;if(seed)flower(c,x,316,done?24:12,["#f7b4bd","#f7dca3","#eab0d4","#f7b4bd"][i%4],done);else{circle(c,x,333,6,"#607c64");line(c,x-10,344,x+10,344,"#6da17a",2)}}
 const p=Math.max(0,Math.min(1,b/32));circle(c,100+p*920,230+Math.sin(t/500)*5,23,"#fff1b5");text(c,"모아",100+p*920,230+Math.sin(t/500)*5,11,"#547b76","center");
}
function drawTrain(c,b,t){
 grad(c,"#d5e5f2","#9ac6c7");cloud(c,200,89,.8,.66);cloud(c,840,70,1,.5);
 c.beginPath();c.moveTo(0,315);c.lineTo(160,192);c.lineTo(335,304);c.lineTo(530,163);c.lineTo(768,319);c.lineTo(920,237);c.lineTo(1120,321);c.lineTo(1120,415);c.lineTo(0,415);c.fillStyle="#8ebcba";c.fill();
 rect(c,0,318,1120,95,"#94b9a0");
 for(let i=0;i<7;i++){const x=i*183+24,y=229+(i%2)*27;rect(c,x,y,106,88,"#ffdfb2",8);c.beginPath();c.moveTo(x-12,y);c.lineTo(x+53,y-45);c.lineTo(x+120,y);c.fillStyle="#d48886";c.fill();rect(c,x+20,y+29,29,30,"#9bc9d6",5);rect(c,x+66,y+29,23,35,"#8eaac0",4)}
 line(c,0,370,1120,370,"#506a77",6);for(let x=0;x<1120;x+=37)line(c,x,357,x,382,"#647988",7);
 const p=Math.max(0,Math.min(1,b/32)),x=120+p*820;
 rect(c,x-95,309,161,55,"#e79b75",13);rect(c,x-73,287,47,26,"#ebc497",7);rect(c,x-10,285,54,34,"#f7d59f",7);rect(c,x+30,262,14,30,"#a97686",3);
 rect(c,x-56,291,16,14,"#cfeaf1",3);rect(c,x+3,291,19,17,"#cfeaf1",3);
 for(const xx of [-58,10])circle(c,x+xx,364,15,"#4b6471");
 for(let j=0;j<3;j++)circle(c,x+27-j*22-Math.sin(t/300+j)*3,232-j*12,10+j*4,"#fff8ed");
 text(c,"다음 마을",915,50,23,"#456d7e","center");text(c,(Math.min(8,Math.max(1,Math.floor(b/4)+1)))+"번째 역",915,83,17,"#456d7e","center")
}
function drawBridge(c,b,t){
 grad(c,"#d8f3ee","#8bcad3");cloud(c,98,91,.75,.68);cloud(c,940,116,.8,.47);
 rect(c,0,227,1120,179,"#6fb4cb");
 for(let i=0;i<7;i++){c.beginPath();c.ellipse(i*200-40,256+i%2*35,140,25,0,0,Math.PI*2);c.strokeStyle="rgba(226,251,247,.5)";c.lineWidth=3;c.stroke()}
 c.beginPath();c.moveTo(0,316);c.bezierCurveTo(170,310,260,380,398,375);c.lineTo(398,415);c.lineTo(0,415);c.fillStyle="#92bf91";c.fill();
 c.beginPath();c.moveTo(710,365);c.bezierCurveTo(880,350,1030,302,1120,293);c.lineTo(1120,415);c.lineTo(710,415);c.fillStyle="#a7cb9b";c.fill();
 for(let i=0;i<8;i++){const x=188+i*104,y=338-(i%2)*31,done=b>=(i+1)*4;rect(c,x-35,y-13,70,38,done?"#e8d1a4":"#bed9d0",19);if(done)circle(c,x,y+1,8,"#f2e4b9");text(c,["도","레","미","솔","라","솔","미","도"][i],x,y+1,15,done?"#6f6b5f":"#7b9e9a","center")}
 const p=Math.max(0,Math.min(1,b/32)),x=137+p*780;
 circle(c,x,245-15*Math.sin(p*Math.PI)+Math.sin(t/270)*4,23,"#ffefcd");circle(c,x-8,243-15*Math.sin(p*Math.PI),3,"#486475");circle(c,x+8,243-15*Math.sin(p*Math.PI),3,"#486475");rect(c,x-16,265,32,35,"#cf9a8c",12);
}
function drawOrchestra(c,b,t){
 grad(c,"#dfece6","#b2d7c6");circle(c,1017,66,39,"#f7e5ba");
 for(let i=0;i<8;i++){const x=i*160+12;rect(c,x,107,30,210,"#8bab84",12);for(let j=0;j<3;j++)circle(c,x+17+(j%2)*16,130+j*36,57-j*7,"#83b6a1")}
 rect(c,95,298,930,103,"#b8b1a3",25);rect(c,127,326,865,75,"#d7b99f",16);
 const types=["rabbit","bear","fox","owl"];for(let i=0;i<4;i++){const x=246+i*207,ev=song.events.filter(e=>e.beat<=b&&e.beat>b-1.05).some(e=>NOTE_ORDER.indexOf(e.note)%4===i);animal(c,x,251,types[i],ev&&playing)}
 rect(c,171,346,780,15,"#9e7f77",7);text(c,"우리의 첫 합주",560,56,29,"#507b73","center");
 for(let i=0;i<4;i++){const count=Math.min(4,Math.floor(Math.max(0,b)/8)+1);if(i<count)circle(c,440+i*45,106,10,["#edb2a9","#f8d68b","#b6d2ac","#add4e4"][i])}
}
function drawStars(c,b,t){
 grad(c,"#1d3358","#546ba0");circle(c,920,91,49,"#f5dfae");circle(c,943,71,47,"#334b7e");
 for(let i=0;i<48;i++){const x=(i*173+79)%1115,y=(i*79+21)%356,shine=.45+.35*Math.sin((motionReduced?0:t)/830+i);c.save();c.globalAlpha=shine;circle(c,x,y,2.1+(i%3),"#f7f3d7");c.restore()}
 const pts=[[145,274],[257,176],[361,235],[447,133],[550,219],[653,136],[779,227],[925,182]];
 const completed=Math.min(pts.length,Math.max(0,Math.floor(b/4)));
 for(let i=1;i<completed;i++)line(c,pts[i-1][0],pts[i-1][1],pts[i][0],pts[i][1],"#a5d9de",4);
 for(let i=0;i<pts.length;i++){const p=pts[i],on=i<completed;circle(c,p[0],p[1],on?15:9,on?"#fff1b6":"#849abc");if(on){c.strokeStyle="#fae8a5";c.lineWidth=2;c.beginPath();c.arc(p[0],p[1],22,0,Math.PI*2);c.stroke()}}
 text(c,"별자리가 조금씩 이어져요",561,53,25,"#eef3f9","center");
 rect(c,0,338,1120,73,"#253b64");for(let i=0;i<7;i++){const x=66+i*180;rect(c,x,315,52,31,"#36517a",4);circle(c,x+28,315,17,"#415d85")}
}
function bread(c,x,y,type,done){const color=done?"#dfad76":"#f5dec4";c.save();c.translate(x,y);if(type%3===0){rect(c,-31,-22,62,44,color,19);for(let i=0;i<3;i++)line(c,-19+i*19,-11,-13+i*19,2,"#fff0cf",3)}else if(type%3===1){circle(c,0,0,28,color);circle(c,0,-12,19,done?"#f8d39c":"#f3e4d4");circle(c,-11,-10,4,"#cc8d89");circle(c,11,-10,4,"#cc8d89")}else{rect(c,-28,-18,56,34,color,14);circle(c,0,-16,18,done?"#e9a7a7":"#ead0c4")}c.restore()}
function drawBakery(c,b,t){
 grad(c,"#ffefe0","#e8c4ac");rect(c,0,324,1120,90,"#c39585");
 for(let i=0;i<4;i++){const x=44+i*274;rect(c,x,96,204,190,"#fff5e7",18);rect(c,x+17,110,171,101,"#cfb9a4",10);rect(c,x+27,121,150,78,"#d6e8e0",9);rect(c,x+24,220,159,13,"#d7b08e",5)}
 rect(c,72,289,973,85,"#b98279",12);rect(c,73,280,969,22,"#edd6b8",10);
 rect(c,110,228,853,54,"#a97a76",22);for(let i=0;i<18;i++)circle(c,115+i*48,256,7,"#f2dec8");
 const completed=progressCount(b);
 for(let i=0;i<8;i++){const x=166+i*106;bread(c,x,247,i,i<completed)}
 const x=120+Math.max(0,b%4)/4*150;bread(c,x,183,Math.floor(b/4),false);
 rect(c,832,35,245,54,"#fff8ef",13);text(c,"오늘 완성된 빵 "+completed+"개",954,62,19,"#986e5d","center");
}
const DRAW={garden:drawGarden,train:drawTrain,bridge:drawBridge,orchestra:drawOrchestra,stars:drawStars,bakery:drawBakery};
function drawToken(c,e,x,y,selected,now){
 const w=Math.min(154,54+Math.max(0,e.dur-1)*26);c.save();c.globalAlpha=selected?1:.16;const color=COLORS[e.note],bright=Math.abs(now-e.beat)<.23;
 if(world==="stars"){circle(c,x,y,26,bright?"#fff3b8":color);c.strokeStyle="#fffcde";c.lineWidth=3;c.stroke()}
 else if(world==="bakery"){rect(c,x-w/2,y-22,w,44,color,18);circle(c,x,y-21,6,"#fff1d0")}
 else if(world==="train"){rect(c,x-w/2,y-26,w,52,color,12);rect(c,x-w/2+7,y-32,w-14,9,"#f9ead8",4)}
 else if(world==="bridge"){rect(c,x-w/2,y-26,w,52,color,25)}
 else if(world==="orchestra"){circle(c,x,y,28,color);c.strokeStyle="#fff";c.lineWidth=3;c.stroke()}
 else {circle(c,x,y,28,color);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;circle(c,x+Math.cos(a)*25,y+Math.sin(a)*25,6,color)}}
 if(bright){c.beginPath();c.arc(x,y,37,0,Math.PI*2);c.strokeStyle="#fff9d3";c.lineWidth=4;c.stroke()}
 text(c,e.note==="높은 도"?"도↑":e.note,x,y,19,"#243d47","center","900");
 c.restore()
}
function drawScoreLine(c,b,t){
 const y=468,target=165,pace=159,windowEnd=1120;
 rect(c,24,410,1072,158,world==="stars"?"rgba(21,39,75,.70)":"rgba(255,255,255,.86)",26);
 rect(c,53,y-38,1027,76,world==="stars"?"rgba(123,148,198,.22)":"rgba(196,221,218,.35)",33);
 line(c,62,y,1061,y,world==="stars"?"#a1b5d4":"#b5cfc9",3);
 c.save();c.setLineDash([8,8]);line(c,target,432,target,526,world==="stars"?"#ffe5a0":"#367c70",5);c.setLineDash([]);
 const g=c.createRadialGradient(target,y,0,target,y,64);g.addColorStop(0,"rgba(255,237,155,.4)");g.addColorStop(1,"rgba(255,237,155,0)");circle(c,target,y,64,g);c.restore();
 const mask=new Set(modeNotes());
 for(const e of activeEvents()){const x=target+(e.beat-b)*pace;if(x<70||x>windowEnd)continue;drawToken(c,e,x,y,mask.has(e.note),b)}
 text(c,"여기서 연주",target,550,15,world==="stars"?"#d3e6ee":"#4e8278","center");
 const next=activeEvents().find(e=>e.beat>=Math.max(sectionStart(),b-.15)&&mask.has(e.note));if(next){const duration=Math.max(0,next.beat-b);text(c,"다음 내 음   "+(next.note==="높은 도"?"높은 도":next.note),1060,550,16,world==="stars"?"#e5eaf1":"#4b7970","right");if(duration<.4){circle(c,1030,550,8,COLORS[next.note])}}
}
function drawScene(c,b,t,video=false){
 c.save();const W=c.canvas.width,H=c.canvas.height;c.setTransform(W/1120,0,0,H/620,0,0);
 DRAW[world](c,Math.max(0,b),motionReduced?0:t);
 drawScoreLine(c,b,t);
 text(c,WORLD[world].name,44,43,25,world==="stars"?"#f1f4ff":"#365c63");
 rect(c,902,21,182,37,world==="stars"?"rgba(255,255,255,.15)":"rgba(255,255,255,.78)",19);
 text(c,Math.max(0,Math.min(8,Math.floor((Math.max(0,b)-sectionStart())/4)+1))+" / "+(Math.max(1,(sectionEnd()-sectionStart())/4))+" 마디",993,40,16,world==="stars"?"#fff":"#345e63","center");
 if(b<sectionStart()){rect(c,376,333,369,55,"rgba(255,255,255,.9)",19);text(c,"선율 전주 · 잠시 후 함께 연주해요",561,360,20,"#3b7474","center")}
 if(flashUntil>performance.now()&&flashNote&&playing){rect(c,431,332,258,50,"rgba(255,252,227,.92)",20);text(c,flashNote+" 음을 들었어요",559,358,19,"#457e72","center")}
 if(video){rect(c,18,576,1084,31,"rgba(255,255,255,.8)",12);text(c,"일단 해봄 · 울모아쌤    /    모아의 여섯 음악여행",45,592,15,"#365f67");text(c,"자체 제작 음악·그래픽",1073,592,13,"#547c7e","right")}
 c.restore()
}
function drawFrame(t=performance.now()){drawScene(ctx,pos,t)}
function checkAudio(){try{if(!createContext()){status("이 브라우저는 소리 재생이 제한될 수 있어요.")}}catch(e){}}
function attach(){
 for(const b of $$(".world-card"))b.addEventListener("click",()=>switchWorld(b.dataset.world));
 $("#songSelect").innerHTML=SONGS.map((s,i)=>'<option value="'+s.id+'">'+s.title+(i>=6?" · 박자 연습":" · 창작곡")+"</option>").join("");
 $("#songSelect").addEventListener("change",e=>switchSong(e.target.value));
 $("#notesSelect").addEventListener("change",e=>{notesMode=Number(e.target.value);updatePads();status("노래는 그대로, 연주할 "+notesMode+"개 음만 강조해요.");drawFrame()});
 $("#speedSelect").addEventListener("change",e=>{const was=playing;if(was)pause();speed=Number(e.target.value);if(was)play();status("연주 속도를 바꿨어요.")});
 $("#sectionSelect").addEventListener("change",e=>{section=e.target.value;sectionChanged()});
 $("#loopToggle").addEventListener("change",e=>{loop=e.target.checked;status(loop?"연주 구간을 반복해요.":"반복 연주를 해제했어요.")});
 $("#motionToggle").addEventListener("change",e=>{motionReduced=e.target.checked;drawFrame()});
 $("#soundBtn").addEventListener("click",()=>{const was=playing;if(was)pause();soundOn=!soundOn;$("#soundBtn").textContent=soundOn?"소리 켜짐":"소리 꺼짐";$("#soundBtn").setAttribute("aria-pressed",String(soundOn));if(was)play()});
 $("#playBtn").addEventListener("click",()=>playing?pause():play());$("#startBig").addEventListener("click",()=>play());
 $("#resetBtn").addEventListener("click",()=>{fresh();status("첫 음부터 다시 준비해요.")});
 $("#exportBtn").addEventListener("click",exportVideo);
 padElements.forEach(p=>p.addEventListener("pointerdown",()=>playTap(p.dataset.note)));
 window.addEventListener("keydown",e=>{if(e.altKey||e.ctrlKey||e.metaKey||/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName))return;if(/^[1-8]$/.test(e.key)){e.preventDefault();if(!e.repeat)playTap(NOTE_ORDER[Number(e.key)-1])}if(e.code==="Space"){e.preventDefault();if(!e.repeat){if(playing)pause();else play()}}});
 document.addEventListener("visibilitychange",()=>{if(document.hidden&&playing)pause()});
 window.addEventListener("pagehide",()=>{if(playing)pause()});
}
function chooseMime(){if(!window.MediaRecorder)return "";for(const s of ["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm","video/mp4"]){if(MediaRecorder.isTypeSupported(s))return s}return ""}
function safeName(s){return s.replace(/[\\/:*?"<>|]/g,"").replace(/\s+/g,"-")}
async function exportVideo(){
 if(exporting)return;
 if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream||!chooseMime()){showToast("이 브라우저는 영상 저장을 지원하지 않아요. PC 크롬에서 이용해 주세요.");return}
 if(playing)pause();exporting=true;
 const btn=$("#exportBtn");btn.disabled=true;btn.textContent="영상 제작 중";
 let rec=null,stream=null,ac=null,rafId=0;
 try{
 const cvs=document.createElement("canvas");cvs.width=1280;cvs.height=720;const painter=cvs.getContext("2d");stream=cvs.captureStream(30);const mime=chooseMime(),tracks=[...stream.getVideoTracks()];
 const audioClass=window.AudioContext||window.webkitAudioContext;
 if(soundOn&&audioClass){ac=new audioClass();await ac.resume();const dest=ac.createMediaStreamDestination(),gain=ac.createGain();gain.gain.value=.75;gain.connect(dest);gain.connect(ac.destination);tracks.push(...dest.stream.getAudioTracks());
 const start=ac.currentTime+1.4+4*beatSec();scheduleAudio(ac,gain,start-sectionStart()*beatSec(),sectionStart()-4,sectionEnd());
 }
 const combined=new MediaStream(tracks);rec=new MediaRecorder(combined,{mimeType:mime,videoBitsPerSecond:5500000});const chunks=[];
 rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
 const stopped=new Promise((resolve,reject)=>{rec.onstop=resolve;rec.onerror=e=>reject(e.error||Error("영상 인코딩 실패"))});
 const start=performance.now(),pre=1400,lead=4*beatSec()*1000,main=(sectionEnd()-sectionStart())*beatSec()*1000,tail=1700,total=pre+lead+main+tail;
 rec.start(300);status("영상 녹화 중이에요. 연주곡 길이만큼 기다려 주세요.");
 await new Promise((resolve,reject)=>{const frame=()=>{
 try{const elapsed=performance.now()-start,rawBeat=sectionStart()-4+Math.max(0,elapsed-pre)/1000/beatSec();
 painter.clearRect(0,0,1280,720);drawScene(painter,Math.min(sectionEnd(),rawBeat),elapsed,true);
 if(elapsed<pre){rect(painter,0,0,1280,720,"rgba(24,60,59,.47)");text(painter,WORLD[world].name,640,238,40,"#fff","center");text(painter,song.title,640,316,65,"#fff","center");text(painter,"일단 해봄 · 울모아쌤",640,407,23,"#f4fffa","center")}
 if(elapsed>pre+lead+main){rect(painter,0,0,1280,720,"rgba(27,65,67,.90)");text(painter,"음악여행을 함께했어요",640,297,53,"#fff","center");text(painter,"일단 해봄 · 울모아쌤",640,366,26,"#c8e9df","center");text(painter,"웹 브라우저에서 직접 만든 그래픽과 악기 소리",640,423,16,"#e5eee9","center")}
 const pr=Math.min(100,Math.round(elapsed/total*100));btn.textContent="영상 저장 "+pr+"%";
 if(elapsed>=total){resolve();return}rafId=requestAnimationFrame(frame)
 }catch(e){reject(e)}};
 rafId=requestAnimationFrame(frame)});
 rec.stop();await stopped;const blob=new Blob(chunks,{type:mime});if(blob.size<1000)throw Error("저장된 영상 데이터가 너무 작아요");
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="ulmoa-"+safeName(WORLD[world].name)+"-"+safeName(song.title)+"."+(mime.includes("mp4")?"mp4":"webm");a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
 showToast("영상이 저장됐어요. 게시하기 전에 음악과 화면을 최종 확인해 주세요.");status("영상 제작 완료: "+(blob.size/1024/1024).toFixed(1)+"MB");
 }catch(err){status("영상 저장 중 문제가 생겼어요: "+err.message);showToast("영상 저장에 실패했어요. 다른 브라우저에서 다시 시도해 주세요.")}
 finally{if(rafId)cancelAnimationFrame(rafId);try{if(rec&&rec.state==="recording")rec.stop()}catch(e){}if(stream)for(const t of stream.getTracks())t.stop();if(ac)ac.close().catch(()=>{});btn.disabled=false;btn.textContent="영상 저장";exporting=false;drawFrame()}
}
attach();updateWorldUi();updateSongUI();fresh();requestAnimationFrame(function idle(t){if(!playing&&!exporting)drawFrame(t);requestAnimationFrame(idle)});
window.__rhythmWorldsQA={
 worlds:Object.keys(WORLD),songs:SONGS.map(s=>({id:s.id,bpm:s.bpm,bars:s.bars,beats:s.totalBeat,events:s.events.length,notes:new Set(s.events.map(e=>e.note)).size})),
 state:()=>({world,song:song.id,notesMode,speed,section,loop,playing,ended,pos,tapCount,hitCount,visible:modeNotes(),sequence:activeEvents().map(e=>[e.note,e.beat,e.dur]),style:DRAW[world].name,exporting}),
 switchWorld:switchWorld,switchSong:switchSong,play,pause,reset:()=>fresh(),frame:()=>drawFrame(performance.now()),scene:()=>canvas,matchAt:(note,beat)=>{pos=beat;playing=true;playTap(note);playing=false;return hitCount}
};
})();
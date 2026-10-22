"use strict";
(()=>{
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const ORDER=["도","레","미","파","솔","라","시","높은도"];
const COLORS={도:"#EB2427",레:"#F6851F",미:"#FBED1B",파:"#73C84A",솔:"#00A39A",라:"#4B4AA8",시:"#D83A9B",높은도:"#EB2427",쉼:"#f2f4f7"};
const FREQ={도:261.6256,레:293.6648,미:329.6276,파:349.2282,솔:391.9954,라:440,시:493.8833,높은도:523.2511};
const VIEW={
 road:{name:"하트 리듬길",desc:"색깔 하트가 선에 도착하면 연주해요."},
 score:{name:"하트 색깔악보",desc:"한 박에 하트 하나, 안쪽 색깔로 박자를 읽어요."},
 bar:{name:"한 마디 하트판",desc:"지금 마디의 하트만 크게 따라가요."},
 two:{name:"두 줄 고정 하트길",desc:"하트악보 두 줄은 가만히, 모아만 음을 따라가요. 두 줄이 끝나면 다음 악보로 바뀌어요."},
 next:{name:"지금·다음 하트",desc:"지금 박을 크게, 다음 박을 미리 봐요."},
 stairs:{name:"하트 계단악보",desc:"높은 음은 위에, 낮은 음은 아래에! 악보 두 줄은 그대로, 모아만 움직여요."}
};
const scores=window.__PERFORMANCE_SCORES__;
if(!Array.isArray(scores)||scores.length<8)throw Error("기존 붐웨커 악보를 불러오지 못했어요.");
let song=scores[0],view="two",notes=5,speed=1,section="all",metronome=false,loop=false,motion=matchMedia("(prefers-reduced-motion: reduce)").matches,sound=true;
const THEMES={
 classroom:{name:"포근한 교실",sky:["#f7ecd9","#e7eee1"],top:"#fffaf3",first:"#fffdf9",second:"#f8fcf4",border:"#e8d4c1",heading:"#426d61",sub:"#678279",footer:"#fff7e6"},
 forest:{name:"숲 산책길",sky:["#d5eadd","#eef7e4"],top:"#f9ffef",first:"#fcfff6",second:"#f3fbf3",border:"#b7d7bd",heading:"#326d57",sub:"#6a977c",footer:"#f0f9df"},
 night:{name:"별밤 음악길",sky:["#263a61","#7171a2"],top:"#fff9ed",first:"#fffdfa",second:"#f4f4ff",border:"#beb6db",heading:"#475079",sub:"#79749b",footer:"#e6e4f8"}
};
let theme="classroom";
try{const saved=localStorage.getItem("ulmoa-heart-theme");if(THEMES[saved])theme=saved}catch(e){};
let position=-song.meter,playing=false,ended=false,acc=null,audioBase=0,audioDest=null,raf=0,exporting=false,exportAudio=null,exportRaf=0,flash={note:"",until:0};
const canvas=$("#display"),ctx=canvas.getContext("2d",{alpha:false});
const result={updates:0};

/* Performance cue model: uses exact NOTE ONSETS, never heart counts.
   Existing full song/audio still plays; student mask changes the guide only. */
const moaDefault=new Image(),moaCheer=new Image();
moaDefault.src="../../thinking-garden/assets/moa-default.png";
moaCheer.src="../../thinking-garden/assets/moa-cheer.png";
function assignedEvents(){return song.events.filter(e=>e.note!=="쉼"&&isSelected(e.note)&&e.start>=startBeat()-.00001&&e.start<endBeat()-.00001)}
function cueAt(b){
 const owned=assignedEvents(),now=owned.find(e=>b>=e.start-.015&&b<e.start+Math.min(.22,e.dur)*.98);
 const next=owned.find(e=>e.start>b+.015)||null;
 const later=next?owned.find(e=>e.start>next.start+.001)||null:null;
 return {now:now||null,next,later,waiting:!now,beats:next?Math.max(0,next.start-b):null};
}
function beatUntil(d){
 if(d===null)return "내 차례 끝";if(d<=.19)return "곧!";
 const quarters=Math.ceil((d-.00001)*4)/4;
 if(quarters===.25)return "¼박 뒤";
 if(quarters===.5)return "반 박 뒤";
 if(quarters===.75)return "¾박 뒤";
 if(quarters%1===.25)return Math.floor(quarters)+"¼박 뒤";
 if(quarters%1===.5)return Math.floor(quarters)+"½박 뒤";
 if(quarters%1===.75)return Math.floor(quarters)+"¾박 뒤";
 return quarters+"박 뒤";
}
function updateCueUI(){
 const c=cueAt(position),cur=$("#cueNow"),next=$("#cueNext"),after=$("#cueAfter");
 if(!cur||!next||!after)return;
 cur.textContent=c.now?"지금 "+fixedNote(c.now.note)+"!":position<startBeat()?"전주를 들어요":"다른 음을 듣는 중";
 cur.style.setProperty("--note-color",c.now?col(c.now.note):"#a4c8bc");
 next.textContent=c.next?"다음 내 음 "+fixedNote(c.next.note)+" · "+beatUntil(c.beats):"내 연주 순서가 끝났어요";
 next.style.setProperty("--note-color",c.next?col(c.next.note):"#a4c8bc");
 after.textContent=c.later?"그다음 "+fixedNote(c.later.note):"";
}

const fixedNote=n=>n==="높은도"?"도↑":n;
const selected=()=>notes===3?["도","미","솔"]:notes===5?["도","레","미","솔","라"]:ORDER;
const isSelected=n=>selected().includes(n);
const beatTime=()=>60/(song.bpm*speed),startBeat=()=>section==="all"?0:song.bars[Number(section)]?.start||0,endBeat=()=>section==="all"?song.beats:song.bars[Math.min(song.bars.length-1,Number(section)+3)]?.end||song.beats;
const frameBeats=()=>Math.max(1,endBeat()-startBeat());
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const barAt=b=>song.bars[clamp(Math.floor(clamp(b,0,song.beats-.0001)/song.meter),0,song.bars.length-1)];
const nextEvents=(b,count=5)=>song.events.filter(e=>e.note!=="쉼"&&e.start>=b-.06&&e.start<endBeat()).slice(0,count);
const activeAt=b=>song.events.find(e=>e.start<=b+.00001&&e.start+e.dur>b+.00001)||null;
const almostHit=(e,b,window=.17)=>e&&e.note!=="쉼"&&Math.abs(e.start-b)<=window;
const progressText=()=>playing?"연주 중":ended?"연주 완료":"연주 준비";
function setStatus(s){$("#status").textContent=s}
function updateControls(){
 $("#viewName").textContent=VIEW[view].name;$("#title").textContent=song.title;$("#subtitle").textContent=VIEW[view].desc;
 $("#song").value=song.key;$("#notes").value=String(notes);$("#tempo").value=String(speed);$("#section").value=section;
 $("#metronome").checked=metronome;$("#loop").checked=loop;$("#motion").checked=motion;
 $("#sound").textContent=sound?"소리 켜짐":"소리 꺼짐";$("#sound").setAttribute("aria-pressed",String(sound));
 $$(".view-choice").forEach(b=>{const yes=b.dataset.view===view;b.classList.toggle("active",yes);b.setAttribute("aria-pressed",String(yes))});
 $$("#keys button").forEach(k=>k.classList.toggle("off",!isSelected(k.dataset.note)));
 $("#noteHelp").textContent=notes+"음 강조 · 하트 1개=1박 · 원곡 그대로";
 $("#stairStyleWrap").hidden=view!=="stairs";
 $$(".theme-choice").forEach(button=>{const active=button.dataset.theme===theme;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active))});
 document.body.dataset.theme=theme;
 const bar=barAt(position),number=clamp(Math.floor(clamp(position,0,song.beats-.001)/song.meter)+1,1,song.bars.length);
 $("#measure").textContent=number+" / "+song.bars.length+" 마디";
 $("#currentBeat").textContent=position<startBeat()?"전주 · 준비":position>=endBeat()?"연주 끝":(Math.floor(((position-bar.start)%song.meter))+1)+"박 / "+song.meter+"박";
 updateCueUI();
 $("#stagePlay").textContent=playing?"일시정지":ended?"다시 연주":"연주 시작";
 $("#play").textContent=playing?"일시정지":ended?"처음부터 연주":position>startBeat()-song.meter+.01?"이어 연주":"연주 시작";
 $("#play").disabled=exporting;$("#record").disabled=exporting;$("#record").textContent=exporting?"영상 제작 중":"영상 저장";
 result.updates++;
}
function overlay(show,title="연주 준비",desc="전주를 듣고 내 음이 올 때 함께 연주해요."){
 $("#startOverlay").hidden=!show;
 if(show){$("#overlayTitle").textContent=title;$("#overlayDescription").textContent=desc;$("#overlayPlay").textContent=ended?"다시 연주":position>=startBeat()?"이어 연주":"연주 시작"}
}
function stopAudio(){if(acc){try{acc.close().catch(()=>{})}catch(e){}acc=null}audioDest=null}
function stop(){if(playing)position=nowBeat();playing=false;cancelAnimationFrame(raf);raf=0;stopAudio()}
function reset(){stop();position=startBeat()-song.meter;ended=false;overlay(true);updateControls();draw(ctx,position)}
function chooseView(v){if(!VIEW[v]||exporting)return;view=v;updateControls();draw(ctx,nowBeat());setStatus(VIEW[v].name+" · 같은 곡의 연주 화면만 바꿨어요.")}
function chooseTheme(next){
 if(!THEMES[next]||exporting||theme===next)return;
 theme=next;
 try{localStorage.setItem("ulmoa-heart-theme",theme)}catch(e){}
 twoPageCache=null;stairPageCache=null;
 updateControls();draw(ctx,playing?nowBeat():position);
 setStatus(THEMES[theme].name+" 배경으로 바뀌었어요. 음악과 박자는 그대로예요.");
}
function chooseSong(key){if(exporting)return;const found=scores.find(s=>s.key===key);if(!found)return;song=found;rebuildSections();reset();setStatus("기존 Studio의 "+song.title+" 악보를 불러왔어요.")}
function rebuildSections(){const el=$("#section");el.replaceChildren(new Option("곡 전체","all"));for(let i=0;i<song.bars.length;i+=4)el.add(new Option((i+1)+"~"+Math.min(i+4,song.bars.length)+"마디",String(i)));section="all"}
function nowBeat(){return playing&&acc?(acc.currentTime-audioBase)/beatTime():position}
function tone(ac,dest,note,at,dur,amp=.10,type="triangle"){
 if(!ac||!dest||!FREQ[note]||at+dur<ac.currentTime)return;
 const st=Math.max(at,ac.currentTime+.004),remaining=Math.max(.05,dur-(st-at)),env=ac.createGain();
 env.gain.setValueAtTime(.0003,st);env.gain.exponentialRampToValueAtTime(amp,st+.022);
 env.gain.exponentialRampToValueAtTime(.0002,st+remaining);
 env.connect(dest);
 const o=ac.createOscillator();o.type=type;o.frequency.setValueAtTime(FREQ[note],st);o.connect(env);o.start(st);o.stop(st+remaining+.02);
 if(type==="triangle"){const shine=ac.createOscillator(),g=ac.createGain();g.gain.value=.13;shine.type="sine";shine.frequency.value=FREQ[note]*2;shine.connect(g);g.connect(env);shine.start(st);shine.stop(st+remaining+.02)}
}
function clickTone(ac,dest,at,accent){const o=ac.createOscillator(),gain=ac.createGain();o.type="sine";o.frequency.value=accent?880:630;gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(accent?.035:.018,at+.004);gain.gain.exponentialRampToValueAtTime(.0001,at+.05);o.connect(gain);gain.connect(dest);o.start(at);o.stop(at+.055)}
function scheduleMusic(ac,dest,zero,from,includeIntro=true){
 const time=beatTime(),end=endBeat(),start=startBeat();
 for(const e of song.events){if(e.note==="쉼"||e.start<Math.max(start,from-.001)||e.start>=end)continue;
  tone(ac,dest,e.note,zero+e.start*time,Math.min(1.3,e.dur*time*.84),.12);
 }
 // Typical instrumental prelude: the ending phrase leads into the opening.
 if(includeIntro&&from<start){const prev=song.bars[clamp((section==="all"?song.bars.length:Math.floor(start/song.meter))-1,0,song.bars.length-1)];
  for(const e of prev.events){if(e.note==="쉼")continue;const relative=e.start-prev.start-song.meter;const at=zero+(start+relative)*time;
   tone(ac,dest,e.note,at,Math.min(1.2,e.dur*time*.8),.085);
  }
 }
 if(metronome){const begin=Math.ceil(Math.max(from,start-song.meter));for(let beat=begin;beat<end;beat++)clickTone(ac,dest,zero+beat*time,Math.abs(((beat-start)%song.meter))<.001)}
}
async function play(){
 if(exporting||playing)return;
 if(ended){position=startBeat()-song.meter;ended=false}
 const AC=window.AudioContext||window.webkitAudioContext;let ac=null;
 try{if(sound&&AC){ac=new AC();await ac.resume()}}catch(e){setStatus("소리 재생이 제한되어 화면 안내만 실행해요.");ac=null}
 if(playing||exporting)return;
 acc=ac;
 const delay=.11,sec=beatTime();audioBase=(acc?acc.currentTime:performance.now()/1000)+delay-position*sec;
 if(acc){const dest=acc.createGain();dest.gain.value=.9;dest.connect(acc.destination);audioDest=dest;scheduleMusic(acc,dest,audioBase,position,position<startBeat())}
 else audioBase=performance.now()/1000+delay-position*sec;
 playing=true;overlay(false);setStatus("연주 중 · 맡은 음에 맞춰 실제 붐웨커를 함께 두드려요.");cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);updateControls()
}
function nowBeat(){if(!playing)return position;const now=acc?acc.currentTime:performance.now()/1000;return (now-audioBase)/beatTime()}
function pause(){if(!playing)return;stop();overlay(true,"잠깐 쉬어요","현재 위치에서 이어서 연주해요.");setStatus("일시정지했어요.");updateControls();draw(ctx,position)}
function tick(){if(!playing)return;position=nowBeat();if(position>=endBeat()){
  stop();position=endBeat();ended=true;updateControls();
  if(loop){ended=false;position=startBeat()-song.meter;play();return}
  overlay(true,"연주 끝!","음악 한 곡을 끝까지 연주했어요.");setStatus("곡이 끝났어요. 다음 방식으로도 연주해 볼 수 있어요.");draw(ctx,position);return
 }draw(ctx,position);updateControls();raf=requestAnimationFrame(tick)}
function tap(key){flash={note:key,until:performance.now()+180};const k=$$("#keys button").find(x=>x.dataset.note===key);if(k){k.classList.add("hit");clearTimeout(k._tm);k._tm=setTimeout(()=>k.classList.remove("hit"),185)}
 if(sound){const AC=window.AudioContext||window.webkitAudioContext;if(AC){const ac=new AC();ac.resume().then(()=>{const dest=ac.createGain();dest.gain.value=.85;dest.connect(ac.destination);tone(ac,dest,key,ac.currentTime+.02,.26,.17);setTimeout(()=>ac.close().catch(()=>{}),600)}).catch(()=>{})}}
 draw(ctx,playing?nowBeat():position)
}
const labels={rest:"쉼"};
function col(n){return COLORS[n]||"#d9e4e4"}
function font(ctx,size=22,weight="800"){ctx.font=weight+" "+size+"px 'Noto Sans CJK KR','NanumGothic','Malgun Gothic',sans-serif"}
function txt(c,t,x,y,size=20,color="#2a4755",align="center",weight="800"){c.save();c.textAlign=align;c.textBaseline="middle";font(c,size,weight);c.fillStyle=color;c.fillText(String(t),x,y);c.restore()}
function rr(c,x,y,w,h,r,fill){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h);if(fill){c.fillStyle=fill;c.fill()}return c}
function disk(c,x,y,r,fill,stroke="",sw=2){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=sw;c.stroke()}}
function ln(c,x,y,X,Y,color,width=3){c.beginPath();c.moveTo(x,y);c.lineTo(X,Y);c.strokeStyle=color;c.lineWidth=width;c.lineCap="round";c.stroke()}
function noteBadge(c,e,x,y,r=34,alpha=1,detail=true){if(!e)return;c.save();const visible=isSelected(e.note)||e.note==="쉼";c.globalAlpha=alpha*(visible?1:.18);disk(c,x,y,r,col(e.note),visible?"#fff":"#d1dcd7",3);txt(c,e.note==="쉼"?"쉼":fixedNote(e.note),x,y,r*.60,"#263f48");if(detail&&e.dur>1.01)txt(c,Number(e.dur).toString()+"박",x,y+r+18,13,"#658382");c.restore()}
function head(c,v){
 themeBackground(c);
 rr(c,28,20,330,43,20,"rgba(255,255,255,.84)");txt(c,VIEW[v].name,48,42,21,"#3f716b","left");
 txt(c,song.title,600,42,26,"#244650");
 rr(c,974,20,195,42,17,"rgba(255,255,255,.86)");
 const bar=barAt(position);const nr=Math.min(song.bars.length,Math.floor(Math.max(0,position)/song.meter)+1);txt(c,position<startBeat()?"선율 전주":nr+" / "+song.bars.length+" 마디",1070,42,16,"#537b78");
 rr(c,24,565,1152,41,17,"rgba(255,255,255,.62)");
 txt(c,position<startBeat()?"전주 중 · 첫 음을 기다려요":position>=endBeat()?"마지막 음까지 연주했어요":"연주할 음은 진하게, 다른 음은 연하게 표시돼요",51,586,17,"#527974","left");
 txt(c,"일단 해봄 · 울모아쌤",1154,586,15,"#64847b","right");
}
function currentBar(b){return barAt(Math.max(startBeat(),b))}
function eventAt(b){return song.events.find(e=>e.start<=b+.00001&&e.start+e.dur>b+.00001)||null}
function eventsNear(b,front=6,back=2){return song.events.filter(e=>e.start>=b-back&&e.start<=b+front&&e.start>=startBeat()&&e.start<endBeat())}
function drawRoad(c,b){
 rr(c,58,108,1085,405,30,"#dcece8");
 for(let k=0;k<8;k++){const y=137+k*43;ln(c,78,y,1125,y,"#ffffff",2)}
 const hitX=228,pace=144;rr(c,hitX-10,101,20,423,8,"#79b0a3");
 rr(c,112,283,125,62,28,"#f8fff2");txt(c,"여기서",175,299,19,"#3f887b");txt(c,"연주",175,326,23,"#3f887b");
 for(const e of eventsNear(b,7,1.5)){
 const x=hitX+(e.start-b)*pace;if(x<65||x>1138)continue;
 const yi=222+Math.sin((ORDER.indexOf(e.note)+1)*.64)*56;
 if(e.note==="쉼"){rr(c,x-25,yi-20,50,41,14,"#f6fbfc");txt(c,"쉼",x,yi,17);continue}
 ln(c,x,yi+30,x,435,"#a9c5bc99",2);noteBadge(c,e,x,yi,31,1,false);
 if(e.dur!==1)txt(c,e.dur+"박",x,yi+47,14,"#6d8781");
 }
}
function drawClock(c,b){
 const x=434,y=301,r=190,bar=currentBar(b),local=clamp(b-bar.start,0,song.meter),angle=-Math.PI/2+(local/song.meter)*Math.PI*2;
 disk(c,x,y,r+45,"#ffffffa9");disk(c,x,y,r,"#f8fdf9","#b7d4c9",8);disk(c,x,y,9,"#558b80");
 for(let i=0;i<song.meter;i++){const a=-Math.PI/2+(i/song.meter)*Math.PI*2;const xx=x+Math.cos(a)*r,yy=y+Math.sin(a)*r;disk(c,xx,yy,5,"#a7c9c1");txt(c,i+1,x+Math.cos(a)*(r-45),y+Math.sin(a)*(r-45),16,"#738e8b")}
 for(const e of bar.events){const a=-Math.PI/2+((e.start-bar.start)/song.meter)*Math.PI*2;noteBadge(c,e,x+Math.cos(a)*(r-5),y+Math.sin(a)*(r-5),24,1,false)}
 ln(c,x,y,x+Math.cos(angle)*(r-78),y+Math.sin(angle)*(r-78),"#478b78",9);
 txt(c,"다음 마디",918,157,26,"#4b7973");
 const n=song.bars[bar.index+1];if(n){for(let i=0;i<Math.min(5,n.events.length);i++)noteBadge(c,n.events[i],786+i%3*115,231+Math.floor(i/3)*114,23,1,false)}
 else txt(c,"마지막 마디",909,254,23,"#69908b");
}
function beatCell(c,e,x,y,w,h,now){
 let color=e.note==="쉼"?"#dfe8e9":col(e.note),on=e.start<=now&&e.start+e.dur>now;
 const active=on&&isSelected(e.note);c.save();c.globalAlpha=e.note==="쉼"||isSelected(e.note)?1:.23;
 rr(c,x+3,y+3,w-6,h-6,14,color);
 if(active){c.strokeStyle="#fff";c.lineWidth=6;c.stroke();c.strokeStyle="#3e8a78";c.lineWidth=3;c.stroke()}
 txt(c,e.note==="쉼"?"쉼":fixedNote(e.note),x+w/2,y+h/2-4,Math.min(24,w*.33),"#29414b");if(e.dur!==1&&w>48)txt(c,e.dur+"박",x+w/2,y+h/2+27,12,"#617872");c.restore()
}
function drawFour(c,b){
 const start=currentBar(b).index;
 for(let row=0;row<2;row++){const bar=song.bars[start+row];if(!bar)continue;let yy=148+row*195;
 rr(c,70,yy,1050,169,24,row?"#f0f6f3":"#ffffffcc");txt(c,(bar.index+1)+"마디",118,yy+29,22,"#63887b");
 for(let beat=0;beat<song.meter;beat++){const x=196+(beat/song.meter)*890;txt(c,(beat+1)+"박",x+890/song.meter/2,yy+35,16,"#78958f");if(beat)ln(c,x,yy+53,x,yy+155,"#c4d9d2",2)}
 for(const e of bar.events){const x=196+((e.start-bar.start)/song.meter)*890,w=e.dur/song.meter*890;beatCell(c,e,x,yy+68,w,91,b)}
 if(b>=bar.start&&b<bar.end){const x=196+((b-bar.start)/song.meter)*890;ln(c,x,yy+64,x,yy+160,"#317b6d",4)}
 }
}
function drawStairs(c,b){
 const bar=currentBar(b);rr(c,72,116,1056,406,31,"#ffffffb3");
 const x0=129,w=940;
 for(let k=0;k<8;k++){const y=475-k*42;ln(c,120,y,1090,y,"#dceae5",1)}
 let prev=null;const whole=bar.events.filter(e=>e.note!=="쉼");
 for(const e of whole){const i=ORDER.indexOf(e.note),x=x0+((e.start-bar.start+e.dur/2)/song.meter)*w,y=468-i*40;
  if(prev)ln(c,prev.x,prev.y,x,y,"#83b8aa",6);
  const width=clamp(e.dur/song.meter*w-12,43,210);
  c.save();c.globalAlpha=isSelected(e.note)?1:.2;rr(c,x-width/2,y-27,width,54,15,col(e.note));txt(c,fixedNote(e.note),x,y,22,"#2b4854");c.restore();prev={x,y}
 }
 if(b>=bar.start){const xx=x0+((b-bar.start)/song.meter)*w;ln(c,xx,137,xx,505,"#4a9c88",4)}
 txt(c,"높은 음",1090,162,15,"#74928d","right");txt(c,"낮은 음",1090,493,15,"#74928d","right");
}
function drawSpotlight(c,b){
 const list=nextEvents(b-.20,3),now=eventAt(b),toStrike=nextEvents(b-.15,1)[0],cue=(toStrike&&Math.abs(toStrike.start-b)<.22)?toStrike:null;
 const thisNote=cue||((now&&now.note!=="쉼")?now:null);
 const real=thisNote&&isSelected(thisNote.note);
 rr(c,80,116,1040,414,33,"#ffffffbb");
 const largeX=400,largeY=323;
 if(thisNote){disk(c,largeX,largeY,125,real?col(thisNote.note):"#dce5e2","#fff",7);txt(c,fixedNote(thisNote.note),largeX,largeY,82,real?"#2c4249":"#84938e");
 if(real){txt(c,cue?"지금 연주!":"소리가 이어져요",largeX,470,31,"#397a6e")}else txt(c,"다른 음을 들어요",largeX,470,27,"#648983")}
 else{disk(c,largeX,largeY,112,"#e1edeb");txt(c,"쉼",largeX,largeY,59,"#5a817b");txt(c,"잠시 기다려요",largeX,469,24,"#5d8078")}
 txt(c,"다음 차례",840,186,26,"#648680");for(let j=0;j<Math.min(2,list.length);j++){noteBadge(c,list[j],762+j*155,309,51,1,true)}
}
function drawRibbon(c,b){
 const bar=currentBar(b);
 txt(c,"음의 길이만큼 색깔이 길어져요",120,113,21,"#5e867f","left");
 for(let row=0;row<2;row++){const ba=song.bars[bar.index+row];if(!ba)continue;const y=163+row*168,xx=111,width=983;
 rr(c,75,y-10,1040,137,27,"#ffffffad");txt(c,(ba.index+1)+"마디",101,y+21,17,"#72918a","left");
 for(const e of ba.events){const x=xx+(e.start-ba.start)/song.meter*width,w=e.dur/song.meter*width;
  c.save();c.globalAlpha=isSelected(e.note)||e.note==="쉼"?1:.2;rr(c,x+3,y+41,Math.max(4,w-6),64,13,col(e.note));txt(c,e.note==="쉼"?"쉼":fixedNote(e.note),x+w/2,y+72,Math.min(23,Math.max(12,w*.38)),"#263f49");c.restore()
 }
 if(row===0){const x=xx+clamp((b-ba.start)/song.meter,0,1)*width;ln(c,x,y+38,x,y+114,"#367d72",5)}
 }
}
function drawEnsemble(c,b){
 const current=nextEvents(b-.12,1)[0];
 for(let i=0;i<8;i++){
 const note=ORDER[i],x=86+(i%4)*267,y=143+Math.floor(i/4)*180;
 const near=song.events.find(e=>e.note===note&&e.start>=b-.18&&e.start<endBeat()),active=near&&Math.abs(near.start-b)<.22&&isSelected(note);
 c.save();c.globalAlpha=isSelected(note)?1:.19;rr(c,x,y,246,156,24,active?col(note):"#ffffffcc");if(active){c.strokeStyle="#5f9b91";c.lineWidth=5;c.stroke()}
 disk(c,x+69,y+78,49,col(note),"#fff",3);txt(c,fixedNote(note),x+69,y+78,29,"#283e4a");
 if(near){txt(c,active?"지금!":"다음 차례",x+163,y+61,18,active?"#276e62":"#647f78");txt(c,near.start>b?(near.start-b).toFixed(1)+"박 후":"연주",x+167,y+97,19,"#3e6b66")}
 else txt(c,"기다려요",x+167,y+80,19,"#819893");c.restore()
 }
}
function drawLyrics(c,b){
 const bar=currentBar(b),next=song.bars[bar.index+1],panels=[bar,next].filter(Boolean);
 for(let ri=0;ri<panels.length;ri++){const ba=panels[ri],y=144+ri*199;
 rr(c,66,y-9,1068,182,26,ri?"#ffffff99":"#ffffffdc");txt(c,(ba.index+1)+"마디",117,y+23,22,"#5b887c","left");
 const chars=ba.events.map(e=>e.lyric?e.lyric:"♪"),len=chars.length,ww=Math.min(132,(994-34)/len),start=600-ww*len/2;
 for(let i=0;i<len;i++){const e=ba.events[i],x=start+i*ww+ww/2,on=e.start<=b&&e.start+e.dur>b,masked=!isSelected(e.note);
  c.save();c.globalAlpha=masked?.32:1;
  rr(c,x-ww*.44,y+44,ww*.88,112,15,on?col(e.note):"#f5f9f5");
  txt(c,chars[i],x,y+91,Math.min(35,ww*.38),on?"#253f4a":"#506b70");
  txt(c,e.note==="쉼"?"쉼":fixedNote(e.note),x,y+135,17,"#57716d");c.restore()
 }
 }
}
function drawWave(c,b){
 rr(c,66,105,1065,415,29,"#ffffffcc");
 const baseX=244,step=151,y0=315;
 ln(c,78,y0,1105,y0,"#bdd7d3",2);
 const near=eventsNear(b,6,1),visible=near.filter(e=>e.note!=="쉼");
 // Each sound has a localized smooth pulse, silence remains flat.
 c.beginPath();for(let x=83;x<=1123;x+=4){
  let wave=0;for(const e of visible){const center=baseX+(e.start-b)*step,dist=(x-center)/Math.max(17,e.dur*step*.46);wave+=Math.exp(-dist*dist*2)*Math.sin(dist*8)*clamp((ORDER.indexOf(e.note)+2)/8, .18,1)*90}
  if(x===83)c.moveTo(x,y0-wave);else c.lineTo(x,y0-wave)
 }c.strokeStyle="#5c9db0";c.lineWidth=6;c.stroke();
 for(const e of near){const x=baseX+(e.start-b)*step;if(x<100||x>1100)continue;if(e.note==="쉼"){txt(c,"쉼",x,y0+72,19);continue}
  noteBadge(c,e,x,y0-124,29,1,false);ln(c,x,y0-87,x,y0-34,col(e.note),4)}
 ln(c,baseX,133,baseX,478,"#3e867b",5);txt(c,"지금",baseX,493,19,"#397c71");
}
function drawScore(c,b){
 const bar=currentBar(b),panels=[bar,song.bars[bar.index+1]].filter(Boolean);
 for(let ri=0;ri<panels.length;ri++){const ba=panels[ri],top=151+ri*205;
 rr(c,63,top-24,1074,186,28,ri?"#ffffff91":"#ffffffde");txt(c,(ba.index+1)+"마디",100,top+7,20,"#5d827a","left");
 for(let s=0;s<5;s++)ln(c,138,top+45+s*23,1103,top+45+s*23,"#9ebeb5",1.5);
 for(const e of ba.events){const x=172+((e.start-ba.start+e.dur*.25)/song.meter)*850;
 if(e.note==="쉼"){txt(c,"쉼",x,top+93,21,"#869e98");continue}
 const i=ORDER.indexOf(e.note),y=top+140-i*16;
 c.save();c.globalAlpha=isSelected(e.note)?1:.2;disk(c,x,y,18,col(e.note),"#fff",2);ln(c,x+17,y,x+17,y-56,"#556e73",3);txt(c,fixedNote(e.note),x,y-59,17,"#476b6d");if(e.dur<1)txt(c,"♪",x+26,y-26,18,"#6b8790");c.restore();
 }
 if(b>=ba.start&&b<ba.end){const x=172+((b-ba.start)/song.meter)*850;ln(c,x,top+25,x,top+159,"#438b7c",5)}
 }
}

/* Accessible child-first alternatives: every event is positioned by the original
 * onset/duration. Inactive pitches remain in the full audio and are faded only. */
function easyCard(c,e,x,y,w,h,current=false,dim=false){
 c.save();const vis=e.note==="쉼"||isSelected(e.note);
 c.globalAlpha=(vis?1:.25)*(dim?.62:1);
 const bg=e.note==="쉼"?"#e1e9e5":col(e.note);
 rr(c,x,y,w,h,Math.min(23,h/4),bg);
 if(current){c.strokeStyle="#fff";c.lineWidth=7;c.stroke();c.strokeStyle="#357e71";c.lineWidth=4;c.stroke()}
 const size=clamp(h*.40,18,50);
 txt(c,e.note==="쉼"?"쉼":fixedNote(e.note),x+w/2,y+h/2-3,size,"#253e49");
 if(e.dur>1.01&&h>100)txt(c,e.dur+"박",x+w/2,y+h-25,16,"#47665f");
 c.restore()
}
function safeCues(bar){return bar.events.filter(e=>e.start>=startBeat()&&e.start<endBeat())}
function userCue(e,b){return e&&isSelected(e.note)&&Math.abs(e.start-b)<.26}
function drawEasyRoad(c,b){
 rr(c,61,121,1076,408,29,"rgba(255,255,255,.77)");
 const lead=256,pace=175,y=314;ln(c,108,y,1114,y,"#b4d4cc",5);
 rr(c,lead-9,139,18,357,9,"#65a897");rr(c,105,219,120,72,22,"#e5f4e9");
 txt(c,"여기에서",166,243,18,"#478575");txt(c,"연주!",166,272,25,"#3e8173");
 for(const e of eventsNear(b,6,1.25)){
   const x=lead+(e.start-b)*pace;if(x<90||x>1110)continue;
   if(e.note==="쉼"){txt(c,"쉼",x,y+5,22,"#839e98");continue}
   const selectedNote=isSelected(e.note);
   if(!selectedNote){noteBadge(c,e,x,y,35,.46,false);continue}
   const active=Math.abs(e.start-b)<.23;
   disk(c,x,y,active?57:47,col(e.note),"#fff",4);
   if(active){c.beginPath();c.arc(x,y,62,0,Math.PI*2);c.strokeStyle="#438d80";c.lineWidth=4;c.stroke()}
   txt(c,fixedNote(e.note),x,y,active?37:31,"#254551");
   if(e.dur>1.01)txt(c,e.dur+"박",x,y+78,17,"#6d8b7c");
 }
 txt(c,"공이 선을 통과하는 순간 연주해요",598,488,19,"#618a80");
}
function drawEasyScore(c,b){
 const bar=currentBar(b),next=song.bars[bar.index+1];
 rr(c,66,127,1068,274,29,"rgba(255,255,255,.82)");
 txt(c,(bar.index+1)+"마디",124,167,26,"#528577","left");
 txt(c,"지금 연주",1070,167,19,"#699188","right");
 const events=safeCues(bar),width=980,x0=110,available=width/song.meter;
 for(const e of events){
   const x=x0+(e.start-bar.start)*available,w=Math.max(5,e.dur*available-8);
   easyCard(c,e,x,211,w,154,e.start<=b+.0001&&e.start+e.dur>b+.0001);
 }
 if(b>=bar.start){const px=x0+clamp((b-bar.start)/song.meter,0,1)*width;ln(c,px,202,px,371,"#387f74",5)}
 if(next){rr(c,67,420,1066,106,23,"rgba(255,255,255,.65)");
   txt(c,"다음 마디",127,445,17,"#79948b","left");
   for(const e of safeCues(next)){const x=213+(e.start-next.start)/song.meter*847,w=e.dur/song.meter*847-7;
     easyCard(c,e,x,461,Math.max(5,w),54,false,true);
   }
 }else txt(c,"마지막 마디예요",605,464,23,"#71938a");
}
function drawEasyBar(c,b){
 const bar=currentBar(b),yy=148;
 rr(c,66,112,1068,419,29,"rgba(255,255,255,.83)");
 txt(c,(bar.index+1)+"마디",124,155,28,"#4e8677","left");
 const cw=974/song.meter,x0=114,top=215;
 for(let beat=0;beat<song.meter;beat++){
  const xx=x0+beat*cw,hit=b>=bar.start+beat&&b<bar.start+beat+1;
  rr(c,xx+3,top-18,cw-6,265,21,hit?"#e6f5e9":"#f3f8f5");
  if(hit){c.save();c.beginPath();c.roundRect(xx+3,top-18,cw-6,265,21);c.strokeStyle="#74ac99";c.lineWidth=4;c.stroke();c.restore()}
  txt(c,(beat+1)+"박",xx+cw/2,top+14,20,hit?"#347b6b":"#80998e");
  const events=bar.events.filter(e=>e.start>=bar.start+beat-.00001&&e.start<bar.start+beat+1-.00001);
  if(!events.length){const carry=bar.events.find(e=>e.start<bar.start+beat&&e.start+e.dur>bar.start+beat+.001);
    txt(c,carry?"이어서":"쉬어요",xx+cw/2,top+139,22,"#91a39a");continue}
  const spacing=events.length>3?3:6,actual=(cw-16-(events.length-1)*spacing)/events.length;
  for(let j=0;j<events.length;j++){const e=events[j];easyCard(c,e,xx+8+j*(actual+spacing),top+84,actual,118,userCue(e,b))}
 }
 txt(c,"현재 박자가 진해져요. 여러 번 치는 박은 음이 나뉘어 보여요.",602,499,18,"#608b80");
}
function drawEasyTwo(c,b){
 const bar=currentBar(b);
 for(let row=0;row<2;row++){
  const ba=song.bars[bar.index+row];if(!ba)continue;const y=123+row*202;
  rr(c,65,y,1070,183,26,row?"rgba(255,255,255,.65)":"rgba(255,255,255,.88)");
  txt(c,row?"다음 줄":"지금 연주",130,y+31,22,row?"#8a9a90":"#397f71","left");
  txt(c,(ba.index+1)+"마디",1062,y+31,19,"#718d84","right");
  const x0=109,unit=980/song.meter;
  for(const e of safeCues(ba)){const x=x0+(e.start-ba.start)*unit,w=Math.max(6,e.dur*unit-7);
   easyCard(c,e,x,y+68,w,101,row===0&&e.start<=b+.0001&&e.start+e.dur>b+.0001,row===1)}
  if(row===0&&b>=ba.start){const xx=x0+clamp((b-ba.start)/song.meter,0,1)*980;ln(c,xx,y+59,xx,y+174,"#438d80",4)}
 }
}
function drawEasyNext(c,b){
 rr(c,74,123,1051,403,30,"rgba(255,255,255,.82)");
 const future=song.events.filter(e=>e.note!=="쉼"&&isSelected(e.note)&&e.start>=Math.max(startBeat(),b-.26)&&e.start<endBeat());
 const cue=future.find(e=>Math.abs(e.start-b)<.26);
 const first=cue||future.find(e=>e.start>=b-.25)||null;
 const second=first?future.find(e=>e.start>first.start+.0001):null;
 const centerX=378,centerY=318,waiting=!cue;
 if(first){
  disk(c,centerX,centerY,130,col(first.note),"#fff",7);
  txt(c,fixedNote(first.note),centerX,centerY-4,104,"#263e48");
  txt(c,waiting?"다음에 칠 음":"지금 연주!",centerX,470,30,"#3e8a7a");
  if(waiting){const diff=Math.max(0,first.start-b);txt(c,diff.toFixed(1)+"박 뒤",centerX,181,24,"#69968b")}
 }else{disk(c,centerX,centerY,123,"#e2eee8");txt(c,"쉬어요",centerX,centerY,58,"#6c9388");txt(c,"맡은 음이 남지 않았어요",centerX,466,25,"#71958a")}
 txt(c,"그다음",852,190,27,"#678b81");
 if(second){disk(c,850,326,78,col(second.note),"#fff",5);txt(c,fixedNote(second.note),850,326,54,"#29424b")}
 else{disk(c,850,326,70,"#e5efec");txt(c,"끝",850,326,39,"#698d82")}
}


/* Exact contour + time grammar based on heart-score/index.html:
   one V-shaped heart per quarter beat, 4 sixteenth slots within that heart.
   Musical event onsets are never synthesized from the number of color regions. */
const HEART_PATH="M50 84 C44 77 9 55 6 29 C3 9 20 0 35 5 C43 7 48 13 50 19 C52 13 57 7 65 5 C80 0 97 9 94 29 C91 55 56 77 50 84Z";
const HEART=new Path2D(HEART_PATH),E=.00001;
function beatParts(beat){return song.events.filter(e=>e.start<beat+1-E&&e.start+e.dur>beat+E).map(e=>({note:e.note,from:Math.max(0,e.start-beat),to:Math.min(1,e.start+e.dur-beat),onset:e.start>=beat-E&&e.start<beat+1-E,source:e}));}
function heart(c,beat,x,y,w,h,now,muted=false){
 const parts=beatParts(beat),active=now>=beat-E&&now<beat+1-E;
 // Scale both axes uniformly: V-heart outline and Korean text never stretch.
 const k=Math.min(w/100,h/90);
 c.save();c.translate(x+(w-100*k)/2,y+(h-90*k)/2);c.scale(k,k);
 c.fillStyle="#fff";c.fill(HEART);
 c.save();c.clip(HEART);
 for(const p of parts){c.globalAlpha=!isSelected(p.note)&&p.note!=="쉼"?.23:muted?.55:1;c.fillStyle=col(p.note);c.fillRect(p.from*100,0,(p.to-p.from)*100+.01,90);}
 c.globalAlpha=1;
 const complex=parts.some(p=>Math.abs((p.to-p.from)-.25)<.001);
 for(const p of parts)if(p.onset&&p.from>0.001)ln(c,p.from*100,10,p.from*100,81,"#fff",complex?2:3);
 if(complex){for(let j=1;j<4;j++){if(parts.some(p=>Math.abs(p.from*100-j*25)<.01))continue;c.setLineDash([1.2,3]);ln(c,j*25,12,j*25,77,"#ffffffbd",.9);c.setLineDash([])}}
 c.restore();
 c.save();c.clip(HEART);
 const gloss=c.createLinearGradient(0,0,0,90);
 gloss.addColorStop(0,"#ffffff21");gloss.addColorStop(.35,"#ffffff06");gloss.addColorStop(1,"#1829230b");
 c.fillStyle=gloss;c.fillRect(0,0,100,90);c.restore();
 c.strokeStyle=active&&!muted?"#368470":"#719083";c.lineWidth=active&&!muted?3:1.2;c.stroke(HEART);
 for(const p of parts){if(!p.onset)continue;const width=p.to-p.from,cx=50*(p.from+p.to);
   c.globalAlpha=!isSelected(p.note)&&p.note!=="쉼"?.35:1;
   const label=p.note==="높은도"?"도":p.note==="쉼"?"쉼":fixedNote(p.note);
   const fs=Math.min(30,Math.max(12,Math.floor((width*100-10)/(label.length+0.22))));
   txt(c,label,cx,38,fs,["도","솔","라","시","높은도"].includes(p.note)?"#fff":"#253e47","center","700");
   if(p.note==="높은도")txt(c,"↑",cx,58,Math.max(11,Math.min(15,fs*.62)),"#fff");
 }
 c.globalAlpha=1;
 if(parts.length===1&&!parts[0].onset)txt(c,"길게",50,48,18,["도","라","높은도"].includes(parts[0].note)?"#fff":"#29434a","center","700");
 if(active&&!muted){
  c.save();c.clip(HEART);ln(c,clamp(now-beat,0,1)*100,7,clamp(now-beat,0,1)*100,80,"#ffffffc9",1.8);c.restore();
  const struck=parts.find(p=>p.onset&&isSelected(p.note)&&now>=p.source.start-.015&&now<p.source.start+Math.min(.24,p.source.dur)*.9);
  if(struck){
    const cx=50*(struck.from+struck.to),radius=Math.min(20,Math.max(13,(struck.to-struck.from)*45));
    c.save();c.globalAlpha=.96;c.fillStyle="#fff";c.beginPath();c.arc(cx,37,radius+4,0,Math.PI*2);c.fill();
    c.fillStyle=col(struck.note);c.beginPath();c.arc(cx,37,radius,0,Math.PI*2);c.fill();
    txt(c,struck.note==="높은도"?"도":fixedNote(struck.note),cx,37,Math.min(22,radius*.95),["도","라","높은도"].includes(struck.note)?"white":"#203d46");
    c.restore();
  }
}
 c.restore();
}

/* Moa follows student's actual onset positions (including 8th/16th notes)
   on the original score without covering the beat subdivisions. */
function moaSprite(c,x,y,b,at,dim=false){
 if(dim)return;const alert=cueAt(b).now,cheer=alert&&Math.abs(alert.start-at)<.025;
 const sprite=cheer?moaCheer:moaDefault,swing=!motion&&(playing||exporting)&&!(view==="two"&&moaTravel==="walk")?(Math.sin(performance.now()/185)*1.1):0;
 c.save();const size=view==="two"?49:view==="stairs"?38:65;
 if(sprite.complete&&sprite.naturalWidth>0){
  c.drawImage(sprite,x-size/2,y-size+12+swing,size,size);
 }else{
  disk(c,x,y-25,25,"#fff3de","#639c8a",3);txt(c,"모아",x,y-25,14,"#3c776c");
 }
 c.restore()
}
function moaOnRow(c,bar,y,width,left,gap,b,dim=false){
 if(dim||b<bar.start-.01||b>=bar.end+.01)return;
 const owned=assignedEvents().filter(e=>e.start>=bar.start-.0001&&e.start<bar.end-.0001);
 if(!owned.length)return;
 const anchor=(e)=>{
  const step=e.start-bar.start,whole=Math.floor(step),part=step-whole;
  const inBeat=Math.min(e.dur,1-part);
  return left+whole*(width+gap)+(part+inBeat/2)*width;
 };
 let previous=owned[0],following=null;
 for(const e of owned){if(e.start<=b+.015)previous=e;else{following=e;break}}
 let x=anchor(previous);
 if(following&&previous.start<b&&following.start>previous.start){
  const ratio=clamp((b-previous.start)/(following.start-previous.start),0,1);
  x=anchor(previous)+(anchor(following)-anchor(previous))*ratio;
  if(!motion&&playing)y-=Math.sin(ratio*Math.PI)*25;
 }
 moaSprite(c,x,y,b,previous.start)
}
function canvasForecast(c,b){
 const q=cueAt(b);
 rr(c,203,76,794,36,15,"rgba(255,255,255,.95)");
 const now=q.now?"지금 "+fixedNote(q.now.note)+"!":b<startBeat()?"전주 듣기":"내 차례 기다리기";
 const next=q.next?"다음 "+fixedNote(q.next.note)+" · "+beatUntil(q.beats):"담당 음 끝";
 disk(c,224,94,7,q.now?col(q.now.note):"#9cc8b8");
 txt(c,now,247,94,18,"#356c60","left");
 disk(c,568,94,7,q.next?col(q.next.note):"#b6ccc4");
 txt(c,next,590,94,18,"#49796f","left");
}
function heartsInBar(c,bar,y,maxWidth,height,b,{muted=false,xleft=90,gap=14}={}){
 const n=song.meter,w=Math.min(maxWidth,(1200-2*xleft-(n-1)*gap)/n),left=(1200-(n*w+(n-1)*gap))/2;
 for(let i=0;i<n;i++){const x=left+i*(w+gap);heart(c,bar.start+i,x,y,w,height,b,muted);txt(c,(i+1)+"박",x+w/2,y+height+17,16,muted?"#94a7a0":"#56877a");}
 moaOnRow(c,bar,y,w,left,gap,b,muted);
}
function heartRoad(c,b){
 rr(c,55,111,1090,424,30,"#ffffffbb");
 const mark=323,step=202,w=157,h=146;
 ln(c,88,402,1126,402,"#bfdacd",4);
 rr(c,mark-5,185,10,268,5,"#4e9982");
 txt(c,"여기서 연주",mark,158,23,"#397d6b");
 // Look ahead at no more than four upcoming beats. Each heart is separate.
 const first=Math.max(startBeat(),Math.ceil(b-.87));
 for(let beat=first;beat<Math.min(endBeat(),first+5);beat++){
   const x=mark+(beat-b)*step;
   if(x<110||x>1120)continue;
   heart(c,beat,x-w/2,249,w,h,b);
 }
 const g=cueAt(b),e=g.now||g.next;if(e){const x=mark+(e.start-b)*step; if(x>120&&x<1100)moaSprite(c,x,246,b,e.start);}
 txt(c,"하트 1개 = 1박     ·     안의 색깔 조각이 리듬을 보여줘요",602,493,21,"#528478");
}
function heartScore(c,b){
 const bar=currentBar(b);rr(c,61,113,1079,298,27,"#ffffffd9");txt(c,(bar.index+1)+"마디",101,155,22,"#4c8275","left");
 heartsInBar(c,bar,185,227,174,b);
 const next=song.bars[bar.index+1];rr(c,61,432,1079,114,23,"#ffffff99");txt(c,"다음",106,465,20,"#7e9990","left");
 if(next)heartsInBar(c,next,455,106,75,b,{muted:true,xleft:180});else txt(c,"마지막 마디",620,485,23,"#729187");
}
function heartBar(c,b){
 const bar=currentBar(b);rr(c,61,111,1079,431,29,"#ffffffd9");txt(c,"지금 "+(bar.index+1)+"마디",104,150,25,"#3e8371","left");
 heartsInBar(c,bar,212,242,223,b);
 txt(c,"각 하트 안의 색깔 경계에서 새 음을 연주해요",600,511,20,"#5a877c");
}
function heartTwo(c,b){
 const bar=currentBar(b);for(let j=0;j<2;j++){const x=song.bars[bar.index+j];if(!x)continue;const top=119+j*220;rr(c,59,top,1083,203,26,j?"#ffffff9c":"#ffffffeb");txt(c,j?"다음 줄":"지금 연주",103,top+31,22,j?"#819f93":"#3d7e71","left");
 heartsInBar(c,x,top+45,j?173:199,134,b,{muted:!!j,xleft:110});
 }
}
function heartNext(c,b){
 rr(c,70,116,1060,422,33,"#ffffffd9");
 const current=clamp(Math.floor(b+E),startBeat(),endBeat()-1),next=current+1;
 txt(c,"지금 박",367,177,30,"#3e8172");heart(c,current,182,212,370,292,b);txt(c,(current%song.meter+1)+"박",367,531,19,"#518779");
 const g=cueAt(b);if(g.now&&Math.floor(g.now.start)===current)moaSprite(c,182+370*(g.now.start-current+Math.min(g.now.dur,1-(g.now.start-current))/2),214,b,g.now.start);
 txt(c,"다음 박",862,185,27,"#75968a");
 if(next<endBeat()){heart(c,next,729,261,263,210,b,true);txt(c,(next%song.meter+1)+"박",862,496,18,"#77978d")}
 else txt(c,"마지막 박이에요",862,365,28,"#71948a");
}


/* FIXED two-row score: immutable page background.
   Desktop shows two measures per line (4 measures per page); small phones
   show one measure per line (2 measures per page) so hearts stay readable.
   No scrolling, sliding, enlarging, fading or pulsing of score objects.
   The only moving drawing is the actual Moa mascot. */
let twoPageCache=null,stairPageCache=null,moaTravel="hop",stairStyle="simple";
/* Keep a FULL musical phrase on each stationary line rather than one measure.
    2/4 = 10 hearts desktop / 8 hearts mobile; 3/4 = 9 / 6;
    4/4 = 8 / 8. Whole measures remain intact and each page holds two lines. */
const twoBarsPerLine=()=>{
 const beatTarget=window.matchMedia("(max-width:620px)").matches?8:10;
 return Math.max(1,Math.floor(beatTarget/song.meter));
};
// Equal page capacity keeps both lines balanced (8 bars in 2/4 -> 4+4).
function balancedBarsPerLine(total){
 const capacity=twoBarsPerLine(),pages=Math.ceil(total/(capacity*2));
 return Math.max(1,Math.min(capacity,Math.ceil(total/(pages*2))));
}
function twoPageAt(b){
 const first=Math.round(startBeat()/song.meter),
       total=Math.round((endBeat()-startBeat())/song.meter),
       barsPerLine=balancedBarsPerLine(total),
       pageBars=2*barsPerLine,
       current=clamp(Math.floor((b-startBeat())/song.meter),0,Math.max(0,total-1)),
       page=Math.floor(current/pageBars),startBar=first+page*pageBars;
 return {page,startBar,barsPerLine,pageBars,first,total,
    endBar:Math.min(first+total,startBar+pageBars),
    pageCount:Math.ceil(total/pageBars)};
}
function twoBaseKey(info){return [song.key,notes,section,theme,info.startBar,info.endBar,info.barsPerLine].join(":")}
function twoGeometry(info,row){
 const count=info.barsPerLine*song.meter,gap=count>=9?7:11,
       width=Math.min(126,(960-gap*(count-1))/count);
 const left=(1200-count*width-(count-1)*gap)/2;
 return {width,gap,left,count,top:row===0?204:408,height:count>=9?110:120};
}
function twoBarBeatPoint(info,absoluteBeat){
 const barIndex=Math.floor(absoluteBeat/song.meter),
       rel=barIndex-info.startBar,
       row=Math.floor(rel/info.barsPerLine),
       ordinal=(rel%info.barsPerLine)*song.meter+(absoluteBeat-barIndex*song.meter),
       geo=twoGeometry(info,row);
 return {x:geo.left+ordinal*(geo.width+geo.gap),y:geo.top,row,...geo};
}

/* Illustrated theme backgrounds are drawn into STATIC cached score pages.
   They are not external downloads and are also present in MediaRecorder output.
   All marks are deterministic: only Moa is allowed to move. */
function themePalette(){return THEMES[theme]}
function drawSparkle(c,x,y,r,color="#fff7ce"){
 c.save();c.strokeStyle=color;c.lineWidth=2.4;c.lineCap="round";
 ln(c,x-r,y,x+r,y,color,2);ln(c,x,y-r,x,y+r,color,2);
 c.restore();
}
function themeBackground(c){
 const p=themePalette(),g=c.createLinearGradient(0,0,170,620);
 g.addColorStop(0,p.sky[0]);g.addColorStop(1,p.sky[1]);
 c.fillStyle=g;c.fillRect(0,0,1200,620);
 c.save();
 if(theme==="night"){
   // Quiet cinematic night: a halo, crescent, small stellar glints and distant hills.
   const halo=c.createRadialGradient(882,73,5,882,73,155);
   halo.addColorStop(0,"#f5d3b93b");halo.addColorStop(1,"#f5d3b900");
   c.fillStyle=halo;c.fillRect(680,0,360,220);
   disk(c,882,64,25,"#f8e1ad");
   disk(c,892,51,24,p.sky[0]);
   for(const [x,y,r] of [[53,72,2],[204,34,2],[350,101,1.6],[722,29,1.5],[981,83,2],[1122,51,2.6],[1164,174,1.5],[29,390,2],[1162,475,2.3]]){
     disk(c,x,y,r,"#f8e8c7");
   }
   for(const [x,y,r] of [[760,78,4],[1065,115,4],[1110,24,3]])drawSparkle(c,x,y,r,"#edd9b7");
   c.fillStyle="#354461";c.beginPath();c.moveTo(0,594);
   c.bezierCurveTo(220,541,470,605,700,570);c.bezierCurveTo(910,550,1040,568,1200,545);
   c.lineTo(1200,620);c.lineTo(0,620);c.fill();
   c.fillStyle="#273953";c.beginPath();c.moveTo(0,612);
   c.bezierCurveTo(290,585,480,620,750,593);c.bezierCurveTo(940,571,1100,613,1200,584);
   c.lineTo(1200,620);c.lineTo(0,620);c.fill();
 }else if(theme==="forest"){
   // Layered watercolor landscape stays BEHIND the score, not on the notes.
   c.fillStyle="#cbe1cd";c.beginPath();c.moveTo(0,580);c.bezierCurveTo(220,516,405,577,635,551);c.bezierCurveTo(870,527,990,522,1200,571);c.lineTo(1200,620);c.lineTo(0,620);c.fill();
   c.fillStyle="#9dc6b3";c.beginPath();c.moveTo(0,610);c.bezierCurveTo(300,555,450,613,710,591);c.bezierCurveTo(960,568,1017,593,1200,568);c.lineTo(1200,620);c.lineTo(0,620);c.fill();
   const leaf=(x,y,size,color,angle=0)=>{c.save();c.translate(x,y);c.rotate(angle);c.fillStyle=color;c.beginPath();c.moveTo(0,0);c.bezierCurveTo(size*.8,-size*.7,size*1.25,size*.1,size*.24,size);c.bezierCurveTo(-size*.6,size*.55,-size*.45,size*.15,0,0);c.fill();c.restore()};
   ln(c,0,0,80,118,"#739d8b",8);
   for(const [x,y,z,colr,angle] of [[3,26,43,"#8cb99e",-.45],[50,9,39,"#a7ccb1",.3],[72,67,29,"#a3c4a5",.65],[1148,0,39,"#91bda4",.35],[1183,75,28,"#6fa88e",.8],[1119,43,31,"#b4cfad",-.35]]){
     leaf(x,y,z,colr,angle);
   }
   for(const [x,y] of [[50,532],[1127,561],[874,40]])disk(c,x,y,5,"#fbf4d8a6");
 }else{
   // Warm classroom: an arched sunlit window and the hint of a reading corner.
   const haze=c.createRadialGradient(826,79,12,826,79,230);
   haze.addColorStop(0,"#fff5db9c");haze.addColorStop(1,"#fff5db00");
   c.fillStyle=haze;c.fillRect(590,0,500,350);
   c.save();c.globalAlpha=.76;
   rr(c,760,13,157,91,38,"#fffaf0");
   rr(c,776,19,126,78,30,"#b6d6ca");
   c.fillStyle="#f9dfa6";c.beginPath();c.arc(848,44,18,0,Math.PI*2);c.fill();
   ln(c,840,21,840,97,"#fffef5",5);ln(c,780,61,901,61,"#fffef5",5);
   rr(c,750,100,179,8,4,"#c6a88b");c.restore();
   // Natural paper-toned floor, never emoji or flat clip-art decorations.
   c.fillStyle="#eadcc9";c.fillRect(0,597,1200,23);
   ln(c,0,595,1200,595,"#cfb89d",2);
   c.fillStyle="#bdd5ba";c.beginPath();c.ellipse(1182,557,27,51,-.3,0,Math.PI*2);c.fill();
   c.fillStyle="#93baa3";c.beginPath();c.ellipse(23,561,25,43,.3,0,Math.PI*2);c.fill();
 }
 c.restore();
}

/* A single quiet sheet, not two floating white dashboards. */
function themeSheet(c,x,y,w,h,splitY){
 const paper=theme==="night"?"#fbfaf8":theme==="forest"?"#fffef9":"#fffdf9";
 c.save();c.shadowColor=theme==="night"?"#121e3766":"#55705e2d";
 c.shadowBlur=24;c.shadowOffsetY=9;rr(c,x,y,w,h,26,paper);c.restore();
 c.save();c.strokeStyle=theme==="night"?"#d8d8e4":"#e0e4d9";c.lineWidth=1.3;
 c.beginPath();c.roundRect(x+.6,y+.6,w-1.2,h-1.2,26);c.stroke();c.restore();
 ln(c,x+28,splitY,x+w-28,splitY,theme==="night"?"#e9e8ef":"#e8eee7",1.5);
}

function themeCard(c,x,y,w,h,row,mode="two"){
 // Row distinction is typography and spacious grouping within ONE sheet.
 const ink=theme==="night"?"#4b526e":"#46665c";
 const tag=row===0?"01":"02",tagY=y+(mode==="stairs"?20:28);
 rr(c,x+21,tagY-12,38,25,10,theme==="night"?"#e9e7f0":theme==="forest"?"#e8f2e8":"#f2ebdf");
 txt(c,tag,x+40,tagY,15,ink,"center","700");
 ln(c,x+83,y+(mode==="stairs"?42:60),x+w-29,y+(mode==="stairs"?42:60),"#e9ece8",1);
}

function themeHeader(c,title,start,end){
 const white=theme==="night",headline=white?"#f6f4f1":"#355d55",caption=white?"#c8cce0":"#66877c";
 ln(c,58,27,58,91,white?"#dcbb97":"#b48d6b",4);
 txt(c,title,78,51,35,headline,"left","700");
 txt(c,"ULMOA  ·  HEART PLAY-ALONG",80,86,12,caption,"left","650");
 const progress=(Math.max(0,end-start)/Math.max(song.bars.length,1));
 rr(c,995,31,158,54,18,white?"#ffffff1b":"#ffffffad");
 txt(c,(start+1)+"–"+end+" / "+song.bars.length+"마디",1074,52,19,headline,"center","700");
 rr(c,1019,71,108,3,2,white?"#ffffff45":"#9fbdb150");
 rr(c,1019,71,Math.max(9,108*progress),3,2,white?"#e1c9a7":"#6ca999");
}

function themeFooter(c,message){
 const textColor=theme==="night"?"#d7dcec":"#597e70";
 txt(c,"♪  "+message,600,582,17,textColor,"center","650");
}
/* One beat uses one visual slot. Two eighths are TWO complete little hearts,
   not a jagged two-color heart, with a subtle shared-beat connector. */
function paintFixedBeat(c,beat,x,y,w,h){
 const pair=stairHalfBeatPair(beat);
 if(!pair){heart(c,beat,x,y,w,h,-100,false);return}
 const miniW=Math.min(55,(w-9)/2);
 const miniH=miniW*.9,yy=y+(h-miniH)/2-4;
 const left=x+(w/2-miniW)/2,right=x+w/2+(w/2-miniW)/2;
 miniStairHeart(c,pair[0].note,left,yy,miniW);
 miniStairHeart(c,pair[1].note,right,yy,miniW);
 // One beat shared by two 1/2-beat notes.
 const bottom=yy+miniH+8;
 c.save();c.strokeStyle="#abc6b9";c.lineWidth=1.8;c.lineCap="round";
 c.beginPath();c.moveTo(left+7,bottom-5);c.lineTo(left+7,bottom);c.lineTo(right+miniW-7,bottom);c.lineTo(right+miniW-7,bottom-5);c.stroke();c.restore();
 txt(c,"½",left+miniW/2,yy-12,13,"#688b7f","center","700");
 txt(c,"½",right+miniW/2,yy-12,13,"#688b7f","center","700");
}

function scorePageBackground(info){
 const background=document.createElement("canvas");background.width=1200;background.height=620;
 const c=background.getContext("2d");
 themeBackground(c);themeHeader(c,"모아의 하트길",info.startBar,info.endBar);
 themeSheet(c,50,120,1100,423,331);
 for(let row=0;row<2;row++){
   const beginning=info.startBar+row*info.barsPerLine,ending=Math.min(info.endBar,beginning+info.barsPerLine),
         top=row===0?123:335;
   themeCard(c,50,top,1100,202,row);
   txt(c,row===0?"첫 번째 줄":"두 번째 줄",149,top+27,17,"#47665d","left","700");
   if(beginning>=ending){txt(c,"이 줄은 비어 있어요",594,top+106,22,"#90a89e");continue}
   txt(c,(beginning+1)+"–"+ending+"마디",1092,top+27,16,"#7f928d","right","600");
   const g=twoGeometry(info,row);
   for(let i=0;i<g.count;i++){
     const beatIndex=beginning*song.meter+i;if(beatIndex>=ending*song.meter)break;
     const x=g.left+i*(g.width+g.gap);
     paintFixedBeat(c,beatIndex,x,g.top,g.width,g.height);
     if(i>0&&i%song.meter===0){
       const dividerX=x-g.gap/2;
       ln(c,dividerX,g.top-4,dividerX,g.top+g.height-5,"#d8e2dc",1.35);
     }
   }
 }
 themeFooter(c,"악보는 그대로 · 모아만 따라가요");
 return background;
}
function fixedTwoBackground(info){
 const key=twoBaseKey(info);
 if(!twoPageCache||twoPageCache.key!==key)twoPageCache={key,canvas:scorePageBackground(info)};
 return twoPageCache.canvas;
}
function twoSpriteAnchor(info,e){
 const beat=Math.floor(e.start),p=twoBarBeatPoint(info,beat),part=e.start-beat;
 const visible=Math.min(e.dur,1-part);
 return {x:p.x+(part+visible/2)*p.width,y:p.y+2,p:p,row:p.row};
}
function twoMoaPosition(b,info){
 const min=info.startBar*song.meter,max=info.endBar*song.meter;
 const owned=assignedEvents().filter(e=>e.start>=min-.00001&&e.start<max-.00001);
 if(!owned.length||b<owned[0].start-.001)return null;
 let previous=owned[0],next=null;
 for(const e of owned){if(e.start<=b+.001)previous=e;else{next=e;break}}
 const first=twoSpriteAnchor(info,previous);
 // Keep Moa on the last played note until the final part of the next approach.
 if(!next||b<previous.start)return {...first,progress:0,hop:0,beat:previous.start};
 const second=twoSpriteAnchor(info,next);
 if(second.row!==first.row){
   // Move to the first target of row 2 near its start, without moving score.
   if(b<next.start-.28)return {...first,progress:0,hop:0,beat:previous.start};
   return {...second,progress:0,hop:0,beat:next.start};
 }
 const departure=Math.max(previous.start,next.start-.75);
 const progress=motion?0:clamp((b-departure)/Math.max(.001,next.start-departure),0,1);
 const arc=(playing||exporting)&&!motion&&moaTravel==="hop"?Math.sin(Math.PI*progress)*29:0;
 return {x:first.x+(second.x-first.x)*progress,y:first.y+(second.y-first.y)*progress-arc,
         row:first.row,progress,hop:arc,beat:progress>=1?next.start:previous.start};
}

function drawScorePosition(c,b,info,stair=false){
 if(b<startBeat()||b>=endBeat())return;
 const owned=assignedEvents().filter(e=>e.start>=info.startBar*song.meter-.001&&e.start<info.endBar*song.meter-.001);
 const active=owned.findLast(e=>e.start<=b+.002);
 if(!active)return;
 const point=stair?stairPoint(info,active):twoSpriteAnchor(info,active);
 const geo=stair?stairGeometry(info,point.row):twoGeometry(info,point.row);
 const base=(stair?stairHeartTop(point.row,active.note):geo.top)+geo.height+8;
 c.save();rr(c,point.x-20,base,40,5,3,theme==="night"?"#657c9b":"#428872");c.restore();
}
function drawFixedTwoPage(c,b){
 const info=twoPageAt(b);
 c.drawImage(fixedTwoBackground(info),0,0);
 drawScorePosition(c,b,info,false);
 const place=twoMoaPosition(b,info);
 if(place){
  moaSprite(c,place.x,place.y,b,place.beat);
 }else if(b>=startBeat()){
  txt(c,"모아가 함께할게요",598,298,23,"#6c9688");
 }
}


/* Heart stair score: two FULLY STATIC rows per page, same musical beats
   as the canonical V-heart score; only Moa sprite is animated.
   Timeline x is strict 1-heart-per-beat, y uses original 8-pitch positions.
   For beats containing multiple note onsets, the heart keeps its original
   quarter-beat color subdivisions and small event pitch dots show true height. */
const STAIR_NOTE_ORDER=["도","레","미","파","솔","라","시","높은도"];
function stairPitchIndex(note){return STAIR_NOTE_ORDER.indexOf(note)}
function stairPrimary(beat){
 const parts=beatParts(beat);
 const musical=parts.find(p=>p.note!=="쉼");
 return musical?musical.note:null;
}
function stairPage(info){
 const cacheKey=twoBaseKey(info)+":stairs:"+stairStyle;
 if(!stairPageCache||stairPageCache.key!==cacheKey){
  stairPageCache={key:cacheKey,canvas:buildStairPage(info)};
 }
 return stairPageCache.canvas;
}
function stairGeometry(info,row){
 const count=info.barsPerLine*song.meter,gap=count>=9?6:10;
 const width=Math.min(113,(950-gap*(count-1))/count);
 const left=(1200-count*width-gap*(count-1))/2;
 return {count,width,gap,left,rowTop:row===0?146:377,heartHeight:80};
}
function stairHeartTop(row,pitch){
 const pitchIndex=stairPitchIndex(pitch);
 return (row===0?146:377)+(7-(pitchIndex<0?3.5:pitchIndex))*11.2;
}
function stairPoint(info,e){
 const beat=Math.floor(e.start+E),bar=Math.floor((beat+E)/song.meter),offset=bar-info.startBar;
 const row=Math.floor(offset/info.barsPerLine),g=stairGeometry(info,row);
 const ordinal=(offset%info.barsPerLine)*song.meter+(beat-bar*song.meter);
 const fraction=Math.max(0,e.start-beat),within=Math.min(1-fraction,e.dur);
 return {x:g.left+ordinal*(g.width+g.gap)+(fraction+within/2)*g.width,
         y:stairHeartTop(row,e.note)+6,row};
}
function stairEvents(info){
 const first=info.startBar*song.meter,end=info.endBar*song.meter;
 return song.events.filter(e=>e.start>=first-E&&e.start<end-E&&e.note!=="쉼");
}

/* Eighth + eighth inside ONE beat: render a fixed left and right heart half
   independently at the respective note's height, without changing audio
   timing or allocating any additional beats. Dotted/16th stay in one heart. */
function stairHalfBeatPair(beat){
 const events=beatParts(beat).filter(p=>p.onset&&p.note!=="쉼");
 if(events.length!==2)return null;
 if(Math.abs(events[0].from)>E||Math.abs(events[0].to-.5)>E||
    Math.abs(events[1].from-.5)>E||Math.abs(events[1].to-1)>E)return null;
 return events;
}

/* Two eighth notes share ONE beat cell. Draw complete, round small hearts
   at their independent pitches, never hard-clipped wedges or stretched glyphs. */
function miniStairHeart(c,note,x,y,width){
 const k=width/100,hh=90*k;
 c.save();c.translate(x,y);c.scale(k,k);
 c.fillStyle=col(note);c.fill(HEART);
 c.strokeStyle="#7b9c8e";c.lineWidth=1.5;c.stroke(HEART);
 c.save();c.clip(HEART);
 const sheen=c.createLinearGradient(0,0,0,90);
 sheen.addColorStop(0,"#ffffff2a");sheen.addColorStop(1,"#152a240b");
 c.fillStyle=sheen;c.fillRect(0,0,100,90);c.restore();
 txt(c,note==="높은도"?"도":fixedNote(note),50,38,39,
   ["도","솔","라","시","높은도"].includes(note)?"#fff":"#263e47","center","650");
 if(note==="높은도")txt(c,"↑",50,63,14,"#fff");
 c.restore();
 return hh;
}
function paintStairBeat(c,beat,x,y,w,h,row){
 const pair=stairHalfBeatPair(beat);
 if(!pair){heart(c,beat,x,y,w,h,-100,false);return}
 const miniW=Math.min(54,(w-7)/2);
 const y0=stairHeartTop(row,pair[0].note),y1=stairHeartTop(row,pair[1].note);
 const left=x+(w/2-miniW)/2,right=x+w/2+(w/2-miniW)/2;
 const h0=miniStairHeart(c,pair[0].note,left,y0,miniW);
 const h1=miniStairHeart(c,pair[1].note,right,y1,miniW);
 // Beat grouping line: the two notes are each a half beat, not two quarters.
 const foot=Math.max(y0+h0,y1+h1)+7;
 c.save();c.strokeStyle="#aac2b8";c.lineWidth=1.8;c.lineCap="round";
 c.beginPath();c.moveTo(left+9,foot-6);c.lineTo(left+9,foot);c.lineTo(right+miniW-9,foot);c.lineTo(right+miniW-9,foot-6);c.stroke();
 c.restore();
}
function buildStairPage(info){
 const bg=document.createElement("canvas");bg.width=1200;bg.height=620;
 const c=bg.getContext("2d");
 themeBackground(c);themeHeader(c,"모아의 하트 계단악보",info.startBar,info.endBar);
 themeSheet(c,44,103,1112,451,330);
 for(let row=0;row<2;row++){
  const first=info.startBar+row*info.barsPerLine,last=Math.min(info.endBar,first+info.barsPerLine);
  const top=row===0?104:334;
  themeCard(c,44,top,1112,row===0?218:215,row,"stairs");
  txt(c,row===0?"첫 번째 줄":"두 번째 줄",150,top+19,16,"#47665d","left","700");
  if(first>=last){txt(c,"이 줄은 비어 있어요",600,top+113,22,"#98aaa3");continue}
  const g=stairGeometry(info,row);
  // Small elevation guide, NOT moving lanes or a scrolling piano-roll.
  txt(c,"높은 음",1111,top+66,12,"#8e9b95","right","600");
  txt(c,"낮은 음",1111,top+193,12,"#8e9b95","right","600");
  if(stairStyle==="path"){
   let previous=null;
   for(let beat=first*song.meter;beat<last*song.meter;beat++){
    const p=stairPrimary(beat);if(!p){previous=null;continue}
    const idx=beat-first*song.meter;
    const item={x:g.left+idx*(g.width+g.gap)+g.width/2,y:stairHeartTop(row,p)+g.heartHeight*.54};
    if(previous)ln(c,previous.x,previous.y,item.x,item.y,"#d8e5d7",5);
    previous=item;
   }
  }
  for(let beat=first*song.meter;beat<last*song.meter;beat++){
   const idx=beat-first*song.meter,x=g.left+idx*(g.width+g.gap),p=stairPrimary(beat),
         y=stairHeartTop(row,p);
   paintStairBeat(c,beat,x,y,g.width,g.heartHeight,row);
   // Keep the stepped score visually quiet. The original heart itself
   // retains every eighth/sixteenth onset as a separate colored segment
   // with its note name; extra floating dots would clutter this pitch map.
   // Thin unobtrusive measure boundary for reading the score, not animation.
   if(idx>0&&idx%song.meter===0){
    const cut=x-g.gap/2;ln(c,cut,top+44,cut,top+207,"#d9e8de",1.5);
   }
  }
 }
 themeFooter(c,"가로는 박 순서 · 세로는 음 높이 · 모아만 이동해요");
 return bg;
}
function stairMoaPosition(beat,info){
 const owned=assignedEvents().filter(e=>e.start>=info.startBar*song.meter-E&&e.start<info.endBar*song.meter-E);
 if(!owned.length||beat<owned[0].start-.001)return null;
 let prev=owned[0],next=null;
 for(const e of owned){if(e.start<=beat+.001)prev=e;else{next=e;break}}
 const current=stairPoint(info,prev);
 if(beat<prev.start||!next)return {...current,at:prev.start,progress:0};
 const upcoming=stairPoint(info,next);
 if(current.row!==upcoming.row){
  if(beat<next.start-.27)return {...current,at:prev.start,progress:0};
  return {...upcoming,at:next.start,progress:1};
 }
 const depart=Math.max(prev.start,next.start-.78);
 const progress=motion?0:clamp((beat-depart)/Math.max(.001,next.start-depart),0,1);
 const lift=(playing||exporting)&&!motion&&moaTravel==="hop"?Math.sin(Math.PI*progress)*22:0;
 return {x:current.x+(upcoming.x-current.x)*progress,
         y:current.y+(upcoming.y-current.y)*progress-lift,
         row:current.row,at:progress>=1?next.start:prev.start,progress};
}
function drawStairPage(c,b){
 const info=twoPageAt(b);
 c.drawImage(stairPage(info),0,0);
 drawScorePosition(c,b,info,true);
 const avatar=stairMoaPosition(b,info);
 if(avatar){moaSprite(c,avatar.x,avatar.y,b,avatar.at)}
 else if(b>=startBeat()){txt(c,"지금은 다른 악기 차례예요",599,302,20,"#688b83")}
}

const drawKinds={road:heartRoad,score:heartScore,bar:heartBar,two:drawFixedTwoPage,next:heartNext,stairs:drawStairPage};
function draw(c,b,exportFrame=false){c.save();c.setTransform(c.canvas.width/1200,0,0,c.canvas.height/620,0,0);
 c.fillStyle="#f4f9f7";c.fillRect(0,0,1200,620);const oldPosition=position;position=b;if(view==="two"||view==="stairs"){drawKinds[view](c,b)}else{head(c,view);drawKinds[view](c,b);canvasForecast(c,b)}
 if(view!=="two"&&view!=="stairs"&&flash.until>performance.now())txt(c,"직접 눌렀어요 · "+fixedNote(flash.note),600,542,19,"#3f877a");position=oldPosition;c.restore()
}
function videoMime(){if(!window.MediaRecorder)return"";return ["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm","video/mp4"].find(m=>MediaRecorder.isTypeSupported(m))||""}
async function exportVideo(){
 if(exporting||!videoMime()||!HTMLCanvasElement.prototype.captureStream){setStatus("Chrome 또는 Edge에서 영상 저장을 지원해요.");return}
 stop();overlay(true,"영상 저장 중","곡 길이만큼 자동으로 녹화해요.");exporting=true;updateControls();
 let recorder,stream,ac,workCanvas,workCtx,output,frameId=0;
 try{
  workCanvas=document.createElement("canvas");
  workCanvas.width=1920;workCanvas.height=1080;workCtx=workCanvas.getContext("2d");
  const scoreCanvas=document.createElement("canvas");scoreCanvas.width=1200;scoreCanvas.height=620;
  const scoreCtx=scoreCanvas.getContext("2d");
  stream=workCanvas.captureStream(30);const tracks=[...stream.getVideoTracks()];
  if(sound){const A=window.AudioContext||window.webkitAudioContext;if(A){ac=new A();await ac.resume();output=ac.createMediaStreamDestination();tracks.push(...output.stream.getAudioTracks())}}
  const videoStream=new MediaStream(tracks),mime=videoMime(),chunks=[];
  recorder=new MediaRecorder(videoStream,{mimeType:mime,videoBitsPerSecond:6000000});
  recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
  const stopped=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=e=>reject(e.error||Error("영상 저장 오류"))});
  const pre=950,lead=song.meter*beatTime()*1000,main=frameBeats()*beatTime()*1000,tail=1150;
  const all=pre+lead+main+tail,begin=performance.now();
  if(ac&&output){
   // Video playback was substantially quieter than normal classroom clips.
   // Raise export-only volume; a fast limiter prevents peak overload when
   // several notes and the metronome overlap. Live classroom volume is unchanged.
   const master=ac.createGain();master.gain.value=3.6;
   const limiter=ac.createDynamicsCompressor();
   limiter.threshold.value=-8;limiter.knee.value=5;limiter.ratio.value=10;
   limiter.attack.value=.003;limiter.release.value=.22;
   master.connect(limiter);limiter.connect(output);
   const zero=ac.currentTime+(pre+lead)/1000-startBeat()*beatTime();
   scheduleMusic(ac,master,zero,startBeat()-song.meter,true)
  }
  recorder.start(250);await new Promise((resolve,reject)=>{
   const tick=()=>{try{const elapsed=performance.now()-begin;
    const p=elapsed<pre?startBeat()-song.meter:elapsed<pre+lead?startBeat()-song.meter+(elapsed-pre)/1000/beatTime():startBeat()+(elapsed-pre-lead)/1000/beatTime();
    draw(scoreCtx,Math.min(endBeat(),p),true);
    if(elapsed<pre){rr(scoreCtx,0,0,1200,620,0,"rgba(32,71,66,.80)");txt(scoreCtx,song.title,600,255,61,"white");txt(scoreCtx,VIEW[view].name+" · 울모아쌤",600,330,33,"white")}
    if(elapsed>pre+lead+main){rr(scoreCtx,0,0,1200,620,0,"rgba(32,70,64,.87)");txt(scoreCtx,"함께 연주했어요",600,280,54,"white");txt(scoreCtx,"일단 해봄 · 울모아쌤",600,355,26,"#d9f4ed")}
    // Preserve the un-stretched score; center 1200×620 artwork in true Full-HD 16:9.
    workCtx.setTransform(1,0,0,1,0,0);
    workCtx.fillStyle="#e9f3ef";workCtx.fillRect(0,0,1920,1080);
    workCtx.drawImage(scoreCanvas,0,44,1920,992);
    $("#record").textContent=Math.min(100,Math.floor(elapsed/all*100))+"% 저장 중";
    if(elapsed>=all){resolve();return}frameId=requestAnimationFrame(tick)
   }catch(err){reject(err)}};
   frameId=requestAnimationFrame(tick)
  });
  recorder.stop();await stopped;const blob=new Blob(chunks,{type:mime});
  if(blob.size<2000)throw Error("영상 데이터가 비어 있습니다.");
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;
  a.download="ulmoa-"+song.key+"-"+view+"."+(mime.includes("mp4")?"mp4":"webm");a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  setStatus("16:9 Full HD 영상 저장 완료 · "+(blob.size/1024/1024).toFixed(1)+"MB. 업로드 전 소리와 글씨를 확인해 주세요.");
 }catch(e){setStatus("영상 저장에 실패했어요: "+e.message)}
 finally{cancelAnimationFrame(frameId);try{if(recorder?.state==="recording")recorder.stop()}catch(e){}for(const t of stream?.getTracks()||[])t.stop();if(ac)ac.close().catch(()=>{});exporting=false;overlay(true);updateControls();draw(ctx,position)}
}
function bind(){
 $("#song").replaceChildren(...scores.map(s=>new Option(s.title+(s.category==="박자 연습"?" · 박자 연습":""),s.key)));
 $$(".view-choice").forEach(b=>b.onclick=()=>chooseView(b.dataset.view));
 $$(".theme-choice").forEach(b=>b.onclick=()=>chooseTheme(b.dataset.theme));
 $("#play").onclick=()=>playing?pause():play();$("#overlayPlay").onclick=()=>play();$("#reset").onclick=reset;$("#record").onclick=exportVideo;
 $("#stagePlay").onclick=()=>playing?pause():play();
 $("#stageReset").onclick=reset;
 $("#stageExit").onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen()}catch(e){setStatus("전체 화면을 종료하지 못했어요.")}};
 const enterScoreFullscreen=async()=>{
   const el=$("#stage");try{
     if(document.fullscreenElement){await document.exitFullscreen();return}
     if(!el.requestFullscreen){setStatus("이 브라우저에서 전체 화면이 지원되지 않아요.");return}
     await el.requestFullscreen();
     // Orientation lock is optional: Safari and some mobile browsers do not permit it.
     // Failure must never close the usable fullscreen score.
     if(matchMedia("(max-width: 620px) and (orientation: portrait)").matches&&screen.orientation?.lock){
       try{await screen.orientation.lock("landscape")}catch(e){}
     }
   }catch(e){setStatus("전체 화면을 사용할 수 없어요. 휴대폰을 가로로 돌려 주세요.")}
 };
 $("#fullscreen").onclick=enterScoreFullscreen;
 $("#mobileLandscape").onclick=enterScoreFullscreen;
 document.addEventListener("fullscreenchange",()=>{
  $("#fullscreen").textContent=document.fullscreenElement?"전체화면 종료":"악보 크게";
  $("#stagePlay").textContent=playing?"일시정지":ended?"다시 연주":"연주 시작";
 });
 $("#sound").onclick=()=>{const was=playing;if(was)pause();sound=!sound;updateControls();if(was)play()};
 $("#song").onchange=e=>chooseSong(e.target.value);
 $("#notes").onchange=e=>{notes=Number(e.target.value);updateControls();draw(ctx,nowBeat());setStatus("원곡은 그대로 유지하고 "+notes+"음만 강조해요.")};
 $("#tempo").onchange=e=>{const was=playing;if(was)pause();speed=Number(e.target.value);if(was)play();else updateControls()};
 $("#section").onchange=e=>{section=e.target.value;reset()};
 $("#metronome").onchange=e=>{const was=playing;if(was)pause();metronome=e.target.checked;if(was)play();else updateControls()};
 $("#loop").onchange=e=>{loop=e.target.checked;updateControls()};
 $("#motion").onchange=e=>{motion=e.target.checked;updateControls();draw(ctx,nowBeat())};
 $("#moaMove").onchange=e=>{moaTravel=e.target.value;draw(ctx,playing?nowBeat():position)};
 $("#stairStyle").onchange=e=>{stairStyle=e.target.value;stairPageCache=null;draw(ctx,playing?nowBeat():position)};
 $$("#keys button").forEach(b=>b.onpointerdown=()=>tap(b.dataset.note));
 document.addEventListener("keydown",e=>{if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName))return;if(/^[1-8]$/.test(e.key)){e.preventDefault();tap(ORDER[Number(e.key)-1])}else if(e.code==="Space"){e.preventDefault();playing?pause():play()}});
 document.addEventListener("visibilitychange",()=>{if(document.hidden&&playing)pause()});
 window.addEventListener("pagehide",()=>{if(playing)stop()});
}
bind();rebuildSections();reset();
window.addEventListener("resize",()=>{twoPageCache=null;stairPageCache=null;draw(ctx,playing?nowBeat():position)});
moaDefault.onload=()=>{if(view==="two"||view==="stairs")draw(ctx,position)};
moaCheer.onload=()=>{if(view==="two")draw(ctx,position)};
window.__performanceViewsQA__={balancedBarsPerLine,drawScorePosition,themes:Object.keys(THEMES),theme:()=>theme,selectTheme:chooseTheme,stairHalfBeatPair,videoExportSize:()=>({width:1920,height:1080,contentY:44,contentHeight:992}),heartScale:(w,h)=>Math.min(w/100,h/90),stairPageAt:twoPageAt,stairBackground:()=>stairPageCache?.canvas,stairGeometry,stairHeartTop,stairPoint,stairMoaPosition,stairStyle:()=>stairStyle,stairPrimary,twoPageAt,twoMoaPosition,twoBaseKey,twoBarsPerLine,twoBackground:()=>twoPageCache?.canvas,moaTravel:()=>moaTravel,beatParts,heartPath:HEART_PATH,modes:Object.keys(VIEW),scores:scores.map(s=>({key:s.key,bpm:s.bpm,meter:s.meter,measures:s.bars.length,beats:s.beats,events:s.events.length,rests:s.events.filter(e=>e.note==="쉼").length})),
 cueAt,assignedEvents,beatUntil,state:()=>({view,song:song.key,notes,speed,section,playing,ended,position,measure:barAt(position).index,score:song.events.map(e=>[e.note,e.start,e.dur,e.lyric]),mask:selected(),clockAudio:!!acc,exporting}),
 selectView:chooseView,selectSong:chooseSong,play,pause,reset,at:(b)=>{if(playing)pause();position=b;draw(ctx,b);updateControls()},render:()=>draw(ctx,position),testMime:videoMime
};
})();

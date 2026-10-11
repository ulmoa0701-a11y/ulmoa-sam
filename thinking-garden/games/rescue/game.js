const LANDSCAPE_MODE=window.matchMedia('(min-width: 850px) and (orientation: landscape)').matches;
const W=720,H=1280;
const COLORS={노란:0xF5C84C,파란:0x59A7EF,초록:0x62BE78,빨간:0xEF6E68};
const SPECIES=['토끼','돼지','소','오리'];
const RESCUE=window.MoaRescueCore;
if(!RESCUE)throw Error('Missing rescue-core.js');
const MODE_KEY='moa-rescue:mode-v1',RUN_KEY='moa-rescue:variant-index-v1',LOG_KEY='moa-rescue:anonymous-records-v1';
let rescueMode=RESCUE.LEVELS.includes(localStorage.getItem(MODE_KEY))?localStorage.getItem(MODE_KEY):'basic';
let runCycle=Number(localStorage.getItem(RUN_KEY)||'0')||0;
const MISSIONS=RESCUE.buildSeries(rescueMode,runCycle);
let runRecord=null;
const SPECIES_KEYS={토끼:'rabbit',돼지:'pig',소:'cow',오리:'duck'};
const COLOR_KEYS={노란:'yellow',파란:'blue',초록:'green',빨간:'red'};
const BODY_HEIGHT={토끼:191,돼지:159,소:186,오리:190};
const BODY_PIXELS_BIG=165,BODY_PIXELS_SMALL=96;
function targetLabel(m){return RESCUE.message(m)}
function targetHeadline(m){return RESCUE.headline(m)}
function targetDescription(m){return RESCUE.description(m)}
function wrongReason(m,it){return RESCUE.reason(m,it)}
function isTarget(m,it){return RESCUE.valid(m,it)}
function makeChoices(round){
 const m=MISSIONS[round],items=m.choices.map(v=>({...v}));
 if(m.focus==='size')return m.species.flatMap(sp=>Phaser.Utils.Array.Shuffle(items.filter(v=>v.species===sp)));
 return Phaser.Utils.Array.Shuffle(items);
}
function beginRescueRun(){
 rescueMode=RESCUE.LEVELS.includes(localStorage.getItem(MODE_KEY))?localStorage.getItem(MODE_KEY):'basic';
 runCycle=(Number(localStorage.getItem(RUN_KEY)||'0')||0)+1;
 try{localStorage.setItem(RUN_KEY,String(runCycle))}catch{}
 MISSIONS.splice(0,MISSIONS.length,...RESCUE.buildSeries(rescueMode,runCycle));
 runRecord={startedAt:new Date().toISOString(),mode:rescueMode,rounds:[]};
}
function beginTrial(scene){
 scene.metrics={started:Date.now(),firstChoiceCorrect:null,attempts:0,wrong:0,hints:0,correct:0,wrongFeatures:{species:0,color:0,size:0}};
}
function recordChoice(scene,item,good){
 if(!scene.metrics)beginTrial(scene);
 const r=scene.metrics;r.attempts++;
 if(r.firstChoiceCorrect===null)r.firstChoiceCorrect=good;
 if(good)r.correct++;
 else{r.wrong++;RESCUE.errorFeatures(scene.m,item).forEach(f=>r.wrongFeatures[f]++)}
}
function recordRound(scene){
 if(!runRecord||!scene.metrics)return;
 const m=scene.metrics;
 runRecord.rounds[scene.round]={round:scene.round+1,focus:scene.m.focus,firstChoiceCorrect:!!m.firstChoiceCorrect,
  attempts:m.attempts,wrong:m.wrong,correct:m.correct,hints:m.hints,wrongFeatures:{...m.wrongFeatures},
  elapsedSeconds:Math.max(0,Math.round((Date.now()-m.started)/1000))};
 try{
  let old=JSON.parse(localStorage.getItem(LOG_KEY)||'[]');if(!Array.isArray(old))old=[];
  old=old.filter(v=>v.startedAt!==runRecord.startedAt);
  old.unshift({...runRecord,rounds:runRecord.rounds.filter(Boolean)});
  localStorage.setItem(LOG_KEY,JSON.stringify(old.slice(0,20)));
 }catch{}
 refreshTeacherSummary();
}
function showComparisonHint(scene,clicked,actors){
 if(!scene.metrics||scene.metrics.hints>=1)return;
 const itemOf=a=>a.data?.get('item')||{species:a.data?.get('species'),color:a.data?.get('color'),size:a.data?.get('size')};
 const source=itemOf(clicked);
 const correct=actors.find(a=>a!==clicked&&a.active&&!a.data?.get('rescuing')&&
   itemOf(a).species===source.species&&isTarget(scene.m,itemOf(a)))||
   actors.find(a=>a!==clicked&&a.active&&!a.data?.get('rescuing')&&isTarget(scene.m,itemOf(a)));
 if(!correct)return;
 scene.metrics.hints++;
 [clicked,correct].forEach(a=>{
  const ring=scene.add.ellipse(a.x,a.y,225,225,0xffffff,0).setStrokeStyle(6,0xffd45e,1).setDepth(46);
  scene.tweens.add({targets:ring,alpha:0,scale:1.14,duration:1900,onComplete:()=>ring.destroy()});
 });
 const w=Number(scene.sys.game.config.width),h=Number(scene.sys.game.config.height);
 const text=scene.add.text(w/2,h*.43,'두 친구를 비교해 볼까?',{fontFamily:FONT,fontSize:'26px',
  fontStyle:'bold',color:'#184533',backgroundColor:'#fffbed',padding:{x:15,y:9}}).setOrigin(.5).setDepth(70);
 scene.tweens.add({targets:text,alpha:0,delay:550,duration:1900,onComplete:()=>text.destroy()});
}
function refreshTeacherSummary(){
 const root=document.getElementById('rescueRecordSummary');if(!root)return;
 let logs=[];try{logs=JSON.parse(localStorage.getItem(LOG_KEY)||'[]')}catch{}
 if(!Array.isArray(logs)||!logs.length){root.textContent='아직 기록이 없어요. 게임을 플레이하면 익명 기록이 저장돼요.';return;}
 root.replaceChildren();
 logs.slice(0,8).forEach(v=>{
  const rounds=Array.isArray(v.rounds)?v.rounds:[],attempts=rounds.filter(x=>x.attempts>0);
  const first=attempts.filter(x=>x.firstChoiceCorrect).length,wrong=rounds.reduce((n,x)=>n+(x.wrong||0),0);
  const hints=rounds.reduce((n,x)=>n+(x.hints||0),0);
  const entry=document.createElement('div');entry.className='rescue-record-entry';
  const title=document.createElement('strong');title.textContent=
   String(v.startedAt||'').slice(0,10)+' · '+({starter:'기초',basic:'기본',challenge:'도전'}[v.mode]||'기본');
  const detail=document.createElement('span');detail.textContent=
   `진행 ${rounds.length}/5 · 첫 선택 정답 ${first}/${attempts.length} · 오답 ${wrong}회 · 도움 ${hints}회`;
  const errors=rounds.reduce((o,x)=>{for(const k of ['species','color','size'])o[k]+=(x.wrongFeatures?.[k]||0);return o},{species:0,color:0,size:0});
  const breakdown=document.createElement('small');breakdown.textContent=
   `오답 조건(중복): 종류 ${errors.species} · 색깔 ${errors.color} · 크기 ${errors.size}`;
  entry.append(title,detail,breakdown);root.append(entry);
 });
}
const FONT='Pretendard, Noto Sans KR, Apple SD Gothic Neo, sans-serif';
let soundOn=localStorage.getItem('moa-rescue:sound')!=='off';
// Google Korean voices are the only offered voices; do not silently substitute adult/system TTS.
const SPEECH_KEY='moa-rescue:voice-v2-google';
let savedVoiceUri=localStorage.getItem(SPEECH_KEY)||'google-auto';
let googleVoices=[];
const ui={
 back:document.getElementById('backBtn'),
 sound:document.getElementById('soundBtn'),
 voice:document.getElementById('voiceBtn'),
 panel:document.getElementById('voicePanel'),
 select:document.getElementById('voiceSelect'),
 note:document.getElementById('voiceNote'),
 preview:document.getElementById('voicePreview'),
 close:document.getElementById('voiceClose')
};
ui.back.onclick=()=>location.href='../../';
function stopVoice(){
 if('speechSynthesis' in window)try{window.speechSynthesis.cancel()}catch{}
}
function syncSoundButton(){
 ui.sound.textContent=soundOn?'🔊':'🔇';
 ui.sound.setAttribute('aria-label',soundOn?'소리 끄기':'소리 켜기');
}
ui.sound.onclick=()=>{
 soundOn=!soundOn;
 localStorage.setItem('moa-rescue:sound',soundOn?'on':'off');
 if(!soundOn)stopVoice();
 syncSoundButton();
};
syncSoundButton();
function isGoogleKoreanVoice(v){
 const lang=String(v.lang||'').replace('_','-');
 const name=String(v.name||'')+' '+String(v.voiceURI||'');
 return /^ko(?:-|$)/i.test(lang)&&/(google|구글)/i.test(name);
}
function preferredGoogleVoice(){
 if(!googleVoices.length)return null;
 return [...googleVoices].sort((a,b)=>{
  const online=v=>v.localService===false||/online|온라인|network/i.test(v.name+' '+v.voiceURI);
  const onlineDiff=Number(online(b))-Number(online(a));
  if(onlineDiff)return onlineDiff;
  return String(a.name).localeCompare(String(b.name),'ko');
 })[0];
}
function selectedGoogleVoice(){
 return googleVoices.find(v=>v.voiceURI===savedVoiceUri)||preferredGoogleVoice();
}
function refreshKoreanVoices(){
 const hasApi='speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
 if(!hasApi){
  googleVoices=[];
  ui.select.replaceChildren(new Option('Google 한국어 음성 사용 불가','google-auto'));
  ui.note.textContent='이 브라우저에서는 음성을 지원하지 않아요. 화면의 문구로 게임을 계속할 수 있어요.';
  ui.preview.disabled=true;
  return;
 }
 googleVoices=window.speechSynthesis.getVoices().filter(isGoogleKoreanVoice);
 ui.select.replaceChildren(new Option('Google 한국어 · 자동 추천','google-auto'));
 // Only Google Korean voices are offered: generic adult system voices cannot be selected.
 googleVoices.forEach(v=>ui.select.add(new Option(v.name+(v.localService?' · 기기':' · 온라인'),v.voiceURI)));
 ui.select.value=savedVoiceUri!=='google-auto'&&googleVoices.some(v=>v.voiceURI===savedVoiceUri)?savedVoiceUri:'google-auto';
 ui.note.textContent=googleVoices.length
  ? 'Google 한국어 음성을 기본으로 사용해요. ▶ 들어보기로 확인할 수 있어요.'
  : '이 기기에서는 Google 한국어 음성을 찾지 못했어요. 다른 성인 음성으로 자동 변경하지 않고, 화면 글로 안내해요. Vrew 음성 MP3를 추가할 수도 있어요.';
 ui.preview.disabled=!googleVoices.length;
}
function speak(t,{preview=false}={}){
 if(!soundOn){
  if(preview)ui.note.textContent='오른쪽 🔇 버튼으로 소리를 켠 뒤 들어볼 수 있어요.';
  return false;
 }
 if(!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window))return false;
 // Some browsers populate Korean voices only after their initial async voiceschanged event.
 if(!googleVoices.length)refreshKoreanVoices();
 const voice=selectedGoogleVoice();
 if(!voice)return false;
 try{
  const synth=window.speechSynthesis;
  synth.cancel();
  const utterance=new SpeechSynthesisUtterance(String(t));
  utterance.lang='ko-KR';
  utterance.voice=voice;
  // Google's original voice character is preserved: artificial pitch increases made it less natural.
  utterance.rate=1;
  utterance.pitch=1;
  utterance.volume=.95;
  utterance.onerror=event=>{
   if(preview&&!['interrupted','canceled'].includes(event.error))
    ui.note.textContent='Google 음성 재생에 실패했어요. 인터넷 연결과 브라우저 음성 설정을 확인해 주세요.';
  };
  synth.speak(utterance);
  return true;
 }catch{
  if(preview)ui.note.textContent='Google 음성 재생에 실패했어요. 잠시 후 다시 시도해 주세요.';
  return false;
 }
}
function setVoicePanel(open){
 ui.panel.hidden=!open;
 ui.voice.setAttribute('aria-expanded',String(open));
 if(open)refreshKoreanVoices();
}
ui.voice.onclick=()=>setVoicePanel(ui.panel.hidden);
ui.close.onclick=()=>setVoicePanel(false);
ui.select.onchange=()=>{
 savedVoiceUri=ui.select.value;
 localStorage.setItem(SPEECH_KEY,savedVoiceUri);
 stopVoice();
};
ui.preview.onclick=()=>speak('안녕! 나는 모아 구조대야. 귀여운 동물을 함께 찾아볼까?',{preview:true});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&!ui.panel.hidden){stopVoice();setVoicePanel(false);}
});
refreshKoreanVoices();
if('speechSynthesis' in window){
 window.speechSynthesis.addEventListener?.('voiceschanged',refreshKoreanVoices);
 ui.voice.addEventListener('click',refreshKoreanVoices);
}
function tone(ok=true){if(!soundOn)return;try{const A=window.AudioContext||window.webkitAudioContext,a=new A(),o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.setValueAtTime(ok?620:180,a.currentTime);o.frequency.exponentialRampToValueAtTime(ok?940:130,a.currentTime+.16);g.gain.setValueAtTime(.06,a.currentTime);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+.2);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+.21)}catch{}}
function roundRect(scene,x,y,w,h,r,fill,alpha=1,stroke=null,sw=0){const g=scene.add.graphics();g.fillStyle(fill,alpha);g.fillRoundedRect(x,y,w,h,r);if(stroke!==null){g.lineStyle(sw,stroke,1);g.strokeRoundedRect(x,y,w,h,r)}return g}
function label(scene,x,y,text,size=28,color='#17382f',weight='800',align='center'){return scene.add.text(x,y,text,{fontFamily:FONT,fontSize:`${size}px`,fontStyle:weight==='900'?'bold':'normal',fontWeight:weight,color,align,wordWrap:{width:620}}).setOrigin(.5)}
function button(scene,x,y,w,h,text,fill=0x17382f){const c=scene.add.container(x,y),bg=scene.add.graphics();bg.fillStyle(fill,1);bg.fillRoundedRect(-w/2,-h/2,w,h,24);bg.lineStyle(3,0xffffff,.25);bg.strokeRoundedRect(-w/2,-h/2,w,h,24);const t=scene.add.text(0,0,text,{fontFamily:FONT,fontSize:'29px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);c.add([bg,t]);c.setSize(w,h).setInteractive({useHandCursor:true});c.on('pointerover',()=>scene.tweens.add({targets:c,scale:1.035,duration:100}));c.on('pointerout',()=>scene.tweens.add({targets:c,scale:1,duration:100}));return c}
function animal(scene,type,colorHex,size='큰'){
  // Sprites are original illustration assets, not Phaser circle/ellipse drawings.
  const kind=SPECIES_KEYS[type];
  const color=Object.entries(COLORS).find(([,code])=>code===colorHex)?.[0]||'노란',hue=COLOR_KEYS[color];
  // Normalize the ACTUAL drawn animal silhouette, not its padded 384px image.
  // All species share a 165px visible height at '큰' and 96px at '작은'.
  const visibleHeight=size==='큰'?BODY_PIXELS_BIG:BODY_PIXELS_SMALL;
  const pictureSize=visibleHeight*384/BODY_HEIGHT[type];
  const c=scene.add.container(0,0);
  const shadow=scene.add.ellipse(0,visibleHeight*.54,visibleHeight*.8,11,0x274f37,.16);
  const picture=scene.add.image(0,0,`sprite-${kind}-${hue}`).setDisplaySize(pictureSize,pictureSize);
  c.add([shadow,picture]);
  c.setSize(Math.max(94,pictureSize*.51),Math.max(102,visibleHeight+20));
  c.setDataEnabled();c.data.set('visualBodyHeight',visibleHeight);
  return c;
}
function makeTargetPortrait(scene,m){
 const box=scene.add.container(0,0),bg=roundRect(scene,-75,-75,150,150,26,0xffffff,.97,0xd8eadf,3);
 box.add(bg);
 if(m.need===1){box.add(animal(scene,m.species[0],COLORS[m.color],m.size).setScale(m.size==='큰'?.59:.43))}
 else m.species.forEach((sp,i)=>{
  const n=m.species.length,columns=n===2?2:2,x=(i%columns)*70-35,y=Math.floor(i/columns)*66-(n>2?32:0);
  box.add(animal(scene,sp,COLORS[m.color],m.size).setScale(.29).setPosition(x,y));
 });
 return box;
}
class BootScene extends Phaser.Scene{
 constructor(){super('boot')}
 preload(){
  this.load.image('hong','../../assets/friend-hong.png');
  this.load.image('moaDiscovery','../../assets/moa-discovery.png');
  this.load.image('moaCheer','../../assets/moa-cheer.png');
  const animals=['rabbit','pig','cow','duck'],colors=['yellow','blue','green','red'];
  animals.forEach(a=>colors.forEach(c=>this.load.image(`sprite-${a}-${c}`,`art/illustrated/${a}-${c}.webp`)));
  for(let i=0;i<5;i++){
    this.load.svg(`world-wide-${i}`,`art/world-wide-${i}.svg`,{width:1200,height:760});
    this.load.svg(`world-tall-${i}`,`art/world-tall-${i}.svg`,{width:720,height:1280});
  }
  this.load.on('loaderror',file=>console.error('Rescue asset failed:',file.key,file.src));
}
 create(){this.scene.start(LANDSCAPE_MODE?'landtitle':'title')}
}
class TitleScene extends Phaser.Scene{
 constructor(){super('title')}
 create(){
  this.cameras.main.setBackgroundColor('#132f27');this.drawBackdrop('title');
  const glow=this.add.circle(W/2,270,190,0xf7cf66,.18);this.tweens.add({targets:glow,scale:1.15,alpha:.05,yoyo:true,repeat:-1,duration:1800});
  label(this,W/2,190,'모아 구조대!',62,'#ffffff','900');label(this,W/2,250,'무전을 듣고 숲속 친구들을 구조해요',25,'#dfeee6','800');
  const van=this.makeVan(W/2,760,1.35);this.tweens.add({targets:van,y:748,yoyo:true,repeat:-1,duration:900,ease:'Sine.easeInOut'});
  const hong=this.add.image(W/2-150,575,'hong').setDisplaySize(230,230).setDepth(12);const moa=this.add.image(W/2+145,610,'moaDiscovery').setDisplaySize(210,210).setDepth(12);this.tweens.add({targets:[hong,moa],y:'-=12',yoyo:true,repeat:-1,duration:1200,stagger:180,ease:'Sine.easeInOut'});
  const start=button(this,W/2,1030,430,92,'🚨 구조 출동하기',0x1d5a47);start.on('pointerdown',()=>{tone(true);this.tweens.add({targets:start,scale:.94,duration:90,yoyo:true,onComplete:()=>this.scene.start('mission',{round:0})})});
  label(this,W/2,1110,'시간 제한 없이 천천히 찾아도 괜찮아요',20,'#cfe6da','800');
  this.add.text(W/2,1215,'ULMOA · MOA GARDEN',{fontFamily:FONT,fontSize:'15px',fontStyle:'bold',color:'#8fb5a2',letterSpacing:2}).setOrigin(.5);
 }
 drawBackdrop(){
  this.add.image(W/2,H/2,'world-tall-0').setDisplaySize(W,H).setDepth(-20);
  this.add.rectangle(W/2,H/2,W,H,0x11382f,.44).setDepth(-19);
 }
 makeVan(x,y,scale=1){const c=this.add.container(x,y).setScale(scale),g=this.add.graphics();g.fillStyle(0xf6f2d8,1);g.fillRoundedRect(-105,-48,210,88,22);g.fillStyle(0x4aa36d,1);g.fillRoundedRect(-105,-48,210,38,22);g.fillRect(-105,-25,210,20);g.fillStyle(0x2d5f52,1);g.fillRoundedRect(-80,-22,55,34,10);g.fillRoundedRect(10,-22,55,34,10);g.fillStyle(0x233f39,1);g.fillCircle(-65,44,22);g.fillCircle(66,44,22);g.fillStyle(0xd9efe3,1);g.fillCircle(-65,44,9);g.fillCircle(66,44,9);c.add(g);c.add(label(this,0,8,'모아 구조대',18,'#1e4e3d','900'));return c}
}
class MissionScene extends Phaser.Scene{
 constructor(){super('mission');this.round=0;this.found=new Set();this.lock=false;this.actors=[]}
 init(data){this.round=data.round||0;this.found=new Set();this.lock=false;this.actors=[];this.missionChip=null;this.van=null;this.seatLayer=null;this.completeOverlayShown=false}
 create(){this.m=MISSIONS[this.round];this.cameras.main.setBackgroundColor('#bfe7f5');this.drawWorld();this.drawHud();this.showBriefing()}
 drawWorld(){
  this.add.image(W/2,H/2,`world-tall-${this.round}`).setDisplaySize(W,H).setDepth(-50);
  this.van=this.makeVan(W/2,1148,.95);this.van.setDepth(40);
  this.seatLayer=this.add.container(W/2,1090).setDepth(45);
  this.rescuer=this.add.image(620,1090,'moaDiscovery').setDisplaySize(96,96).setDepth(42);
  this.tweens.add({targets:this.rescuer,y:1084,yoyo:true,repeat:-1,duration:950,ease:'Sine.easeInOut'});
 }
 addWorldProps(){for(let i=0;i<8;i++){const x=55+(i%4)*205+(i%2)*26,y=470+Math.floor(i/4)*390;const tree=this.add.container(x,y);const g=this.add.graphics();g.fillStyle(0x6e5230,1);g.fillRoundedRect(-12,16,24,90,10);g.fillStyle(i%2?0x3e8e52:0x347b49,1);g.fillCircle(0,0,52);g.fillCircle(-34,18,35);g.fillCircle(35,18,36);tree.add(g);tree.setDepth(18);this.tweens.add({targets:tree,angle:{from:-1,to:1},yoyo:true,repeat:-1,duration:1600+i*120,ease:'Sine.easeInOut'})}
  for(let i=0;i<10;i++){const x=55+(i*79)%620,y=535+(i*131)%430;const bush=this.add.container(x,y);const g=this.add.graphics();g.fillStyle(i%3?0x4ea85d:0x5cb469,1);g.fillCircle(-20,12,29);g.fillCircle(0,0,35);g.fillCircle(24,13,27);g.fillStyle(0x89cf70,.6);g.fillCircle(-8,-9,12);bush.add(g);bush.setDepth(26);this.actors.push({bush,x,y})}
  for(let i=0;i<6;i++){const r=this.add.ellipse(80+(i*117)%600,600+(i*173)%420,46,29,0xb9c2b5).setDepth(15);r.setAngle((i*17)%30-15)}
 }
 addClouds(){for(let i=0;i<3;i++){const c=this.add.container(-90+i*300,90+i*80);const g=this.add.graphics();g.fillStyle(0xffffff,.55);g.fillEllipse(0,0,130,45);g.fillCircle(-35,-10,28);g.fillCircle(30,-16,32);c.add(g);c.setDepth(2);this.tweens.add({targets:c,x:W+120,duration:18000+i*5000,repeat:-1,delay:i*1300})}}
 makeVan(x,y,s=1){const c=this.add.container(x,y).setScale(s),g=this.add.graphics();g.fillStyle(0xf8f2d9,1);g.fillRoundedRect(-110,-50,220,92,22);g.fillStyle(0x3e9564,1);g.fillRoundedRect(-110,-50,220,42,22);g.fillRect(-110,-25,220,22);g.fillStyle(0x284f46,1);g.fillRoundedRect(-82,-20,58,36,10);g.fillRoundedRect(12,-20,58,36,10);g.fillStyle(0x203a34,1);g.fillCircle(-68,44,23);g.fillCircle(69,44,23);g.fillStyle(0xd6eee0,1);g.fillCircle(-68,44,9);g.fillCircle(69,44,9);c.add(g);c.add(label(this,0,8,'모아 구조대',18,'#1b4d3b','900'));return c}
 drawHud(){roundRect(this,20,18,W-40,125,28,0x12392f,.95,0xffffff,2);label(this,75,51,`현장 ${this.round+1}/5`,20,'#cfe8da','900','left').setOrigin(0,.5);label(this,75,91,this.m.place,28,'#ffffff','900','left').setOrigin(0,.5);this.countText=label(this,W-85,76,`0/${this.m.need}`,30,'#ffffff','900');roundRect(this,W-145,48,110,58,24,0x23664d,1);this.countText.setDepth(5);this.progress=this.add.graphics().setDepth(5);for(let i=0;i<5;i++){this.progress.fillStyle(i<=this.round?0xf4d75a:0xffffff,i<=this.round?1:.25);this.progress.fillCircle(310+i*28,52,6)}}
 showBriefing(){this.lock=true;const shade=this.add.rectangle(W/2,H/2,W,H,0x0b241e,.62).setDepth(80).setInteractive();const card=this.add.container(W/2,H/2-20).setDepth(81);const bg=roundRect(this,-290,-265,580,530,34,0xf8fff9,1,0xffffff,3);card.add(bg);const guidePic=this.add.image(-205,-190,'hong').setDisplaySize(92,92);card.add(guidePic);const tag=label(this,25,-215,'📡 구조 무전 도착',25,'#1e6a4c','900');card.add(tag);const portrait=makeTargetPortrait(this,this.m).setPosition(0,-85);card.add(portrait);const target=targetLabel(this.m);
  const headlineSize=target.length>18?29:target.length>12?34:39;
  const t=this.add.text(0,54,target,{
   fontFamily:FONT,fontSize:headlineSize+'px',fontStyle:'bold',color:'#17382f',
   align:'center',wordWrap:{width:510,useAdvancedWrap:true},lineSpacing:6
  }).setOrigin(.5);
  card.add(t);
  const sub=label(this,0,133,this.m.need===1?'한 마리를 찾아요':this.m.focus==='size'?'같은 종류끼리 크기를 비교해요':'한 마리씩 차례대로 찾아요',22,'#527066','800');
  card.add(sub);
  const go=button(this,0,207,330,78,'출동! 🚨',0x1c694d);card.add(go);
  this.briefingTargetText=t;this.briefingStartButton=go;
  go.on('pointerdown',()=>{tone(true);speak(target);this.tweens.add({targets:card,y:-420,alpha:0,duration:380,ease:'Back.easeIn',onComplete:()=>{card.destroy();shade.destroy();this.lock=false;this.spawnAnimals();this.installTouchAssist();this.showMissionChip()}})})
 }
 showMissionChip(){
  const c=this.add.container(0,0).setDepth(65);
  c.add(roundRect(this,14,158,692,130,26,0xfffdf3,.98,0xffffff,4));
  const pic=animal(this,this.m.species[0],COLORS[this.m.color],this.m.size).setPosition(103,223).setScale(.48);
  c.add(pic);
  const main=targetHeadline(this.m);
  const note=this.m.focus==='size'?'토끼끼리 · 돼지끼리':this.m.focus==='combined'?'작고 빨간 동물 4마리':this.m.focus==='color-species'?'토끼 · 돼지 · 소':targetDescription(this.m);
  c.add(label(this,205,199,main,main.length>9?28:33,'#154936','900').setOrigin(0,.5));
  c.add(label(this,205,248,note,23,'#536e5e','800').setOrigin(0,.5));
  const repeat=button(this,602,225,162,68,'🔊 다시',0x1c694d);
  repeat.on('pointerdown',()=>speak(targetLabel(this.m)));
  c.add(repeat);
  this.missionChip=c;
 }
 spawnAnimals(){
  const items=makeChoices(this.round);
  const spots=this.m.focus==='size'?[[190,495],[440,495],[190,790],[440,790]]:
      [[120,405],[360,405],[600,405],[120,630],[360,630],[600,630],[120,855],[360,855],[600,855]];
  if(this.m.focus!=='size')Phaser.Utils.Array.Shuffle(spots);
  if(this.m.focus==='size'){
   // Equal, neutral rescue platforms keep each size pair grounded and comparable.
   [495,790].forEach(base=>roundRect(this,54,base-4,590,38,18,0xf5eed9,.94,0xb9c9a8,2).setDepth(12));
  }
  items.forEach((it,i)=>{
   const [x,baseY]=spots[i],a=animal(this,it.species,COLORS[it.color],it.size);
   // Compare big/small animals with their feet on the same ground line.
   const y=this.m.focus==='size'?baseY-(it.size==='큰'?BODY_PIXELS_BIG:BODY_PIXELS_SMALL)/2:baseY;
   a.setPosition(x,y).setDepth(20+i);
   a.setDataEnabled();a.data.set({species:it.species,color:it.color,size:it.size,rescuing:false});
   a.setInteractive(new Phaser.Geom.Rectangle(-111,-111,222,222),Phaser.Geom.Rectangle.Contains);
   // No automatic bouncing: a stable target is easier for small fingers to select.
   this.actors.push(a);
  });
 }
 installTouchAssist(){
  const onTap=(pointer,currentlyOver)=>{
    if(this.lock)return;
    const choices=this.actors.filter(a=>a&&a.active&&a.data?.get('species')&&!a.data.get('rescuing'));
    // Always select the nearest animal center; Phaser may report the wrong overlapped sprite.
    let nearest=null,smallest=Infinity;
    for(const a of choices){
      const dx=pointer.x-a.x,dy=pointer.y-a.y;
      const isSmall=a.data.get('size')==='작은';
      const maxX=isSmall?90:119,maxY=isSmall?90:115;
      const metric=(dx/maxX)**2+(dy/maxY)**2;
      if(metric<smallest){smallest=metric;nearest=a}
    }
    if(nearest&&smallest<=1.08)this.pickAnimal(nearest);
  };
  this.input.on('pointerdown',onTap);
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.input.off('pointerdown',onTap));
 }
 pickAnimal(a){if(this.lock||a.data.get('rescuing'))return;const sp=a.data.get('species'),basic=a.data.get('color')===this.m.color&&a.data.get('size')===this.m.size,good=basic&&this.m.species.includes(sp)&&!this.found.has(sp);if(!good){
   const reason=wrongReason(this.m,{species:sp,color:a.data.get('color'),size:a.data.get('size')});
   tone(false);
   const q=this.add.text(a.x,a.y-120,reason,{fontFamily:FONT,fontSize:'28px',fontStyle:'bold',color:'#6c4531',backgroundColor:'#fff9ef',padding:{x:13,y:9}}).setOrigin(.5).setDepth(72);
   this.tweens.add({targets:q,y:q.y-20,alpha:0,duration:1200,onComplete:()=>q.destroy()});
   return;
  }
  a.data.set('rescuing',true);this.found.add(sp);tone(true);this.rescueBurst(a.x,a.y);this.showToast(`${sp} 구조 성공!`);this.tweens.killTweensOf(a);this.tweens.add({targets:a,scaleX:a.scaleX*1.15,scaleY:a.scaleY*1.15,duration:130,yoyo:true,onComplete:()=>{this.tweens.add({targets:a,x:W/2,y:1050,scaleX:.22,scaleY:.22,angle:360,duration:850,ease:'Cubic.easeInOut',onComplete:()=>{a.destroy();this.addSeat(sp);this.countText.setText(`${this.found.size}/${this.m.need}`);if(this.found.size>=this.m.need)this.completeMission()}})}})
 }
 rescueBurst(x,y){const ring=this.add.circle(x,y,54,0xffffff,0).setStrokeStyle(6,0xffef9a,1).setDepth(65);this.tweens.add({targets:ring,scale:1.8,alpha:0,duration:520,onComplete:()=>ring.destroy()});for(let i=0;i<10;i++){const p=this.add.circle(x,y,5+(i%3)*2,i%2?0xffdc68:0xffffff,1).setDepth(66),ang=Math.PI*2*i/10,dist=55+Math.random()*40;this.tweens.add({targets:p,x:x+Math.cos(ang)*dist,y:y+Math.sin(ang)*dist,alpha:0,scale:.2,duration:500+Math.random()*250,onComplete:()=>p.destroy()})}}
 addSeat(sp){const i=SPECIES.indexOf(sp),slots=this.m.need===1?[0]:[0,1,2,3],idx=this.m.need===1?0:slots[i],x=(idx-(this.m.need===1?0:1.5))*52;const mini=animal(this,sp,COLORS[this.m.color],this.m.size).setScale(.32).setPosition(x,0);const badge=this.add.circle(x,0,27,0xf8fff9,1).setStrokeStyle(3,0x5fba78,1);this.seatLayer.add([badge,mini]);mini.setDepth(2);this.tweens.add({targets:[badge,mini],scale:'+=.15',duration:120,yoyo:true})}
 showToast(text){const c=this.add.container(W/2,1010).setDepth(75);const bg=roundRect(this,-170,-34,340,68,22,0x133e32,.94);const t=label(this,0,0,`✨ ${text}`,22,'#ffffff','900');c.add([bg,t]);this.tweens.add({targets:c,y:970,duration:180,ease:'Back.easeOut'});this.time.delayedCall(850,()=>this.tweens.add({targets:c,alpha:0,y:940,duration:220,onComplete:()=>c.destroy()}))}
 completeMission(){this.lock=true;this.completeOverlayShown=true;this.missionChip?.destroy();const shade=this.add.rectangle(W/2,H/2,W,H,0x0d2d24,.45).setDepth(79).setInteractive();const card=this.add.container(W/2,640).setDepth(82);const bg=roundRect(this,-290,-210,580,420,34,0xfffdf4,1,0xffffff,4);card.add(bg);card.add(label(this,0,-145,'구조 성공! ✨',43,'#194c3a','900'));card.add(label(this,0,-88,`${this.m.place}의 친구들이 안전해졌어요`,23,'#547064','800'));const row=this.add.container(0,0);this.m.species.slice(0,this.m.need).forEach((sp,i)=>{const a=animal(this,sp,COLORS[this.m.color],this.m.size).setScale(.47);a.setPosition((i-(this.m.need-1)/2)*122,0);row.add(a)});card.add(row);const last=this.round===4;const next=button(this,0,135,340,76,last?'구조 완료 보기 🏕️':'다음 현장으로 ▶',0x1e664d);card.add(next);let advancing=false;const advance=()=>{if(advancing)return;advancing=true;this.input.off('pointerdown',tapHandler);tone(true);if(last)this.scene.start('result');else this.scene.restart({round:this.round+1})};
 const tapHandler=(p)=>{if(p.x>=190&&p.x<=530&&p.y>=737&&p.y<=813)advance()};
 next.on('pointerdown',advance);
 this.input.on('pointerdown',tapHandler);
 this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.input.off('pointerdown',tapHandler));
 speak('구조 성공! 친구들이 안전해졌어요.')
 }
}
class ResultScene extends Phaser.Scene{
 constructor(){super('result')}
 create(){this.cameras.main.setBackgroundColor('#15382e');const g=this.add.graphics();g.fillStyle(0x214d3d,1);g.fillRect(0,0,W,H);g.fillStyle(0x2f6848,1);g.fillEllipse(100,720,500,360);g.fillEllipse(640,730,620,390);g.fillStyle(0x397751,1);g.fillRect(0,690,W,590);for(let i=0;i<22;i++){g.fillStyle(i%3===0?0xffd965:0xbce18a,.5);g.fillCircle((i*93)%W,80+(i*151)%600,3+(i%4))}
  label(this,W/2,150,'모아 구조대 임무 완료!',48,'#ffffff','900');label(this,W/2,214,'5개의 구조 현장을 모두 안전하게 지나왔어요',23,'#d5eadf','800');
  roundRect(this,65,280,590,470,38,0xfffdf2,1,0xffffff,4);label(this,W/2,335,'구조 기록',25,'#5d7569','900');for(let i=0;i<5;i++){const y=405+i*64,m=MISSIONS[i];this.add.circle(125,y,19,COLORS[m.color],1).setStrokeStyle(3,0xffffff,1);label(this,165,y,`${i+1}. ${m.place}`,22,'#17382f','900','left').setOrigin(0,.5);label(this,405,y,targetHeadline(m),20,'#537067','800','left').setOrigin(0,.5)}
  const friends=this.add.container(W/2,835);SPECIES.forEach((sp,i)=>{const a=animal(this,sp,[COLORS.노란,COLORS.파란,COLORS.초록,COLORS.빨간][i],'큰').setScale(.58).setPosition((i-1.5)*125,0);friends.add(a);this.tweens.add({targets:a,y:-12,yoyo:true,repeat:-1,duration:800+i*160,ease:'Sine.easeInOut'})});
  const cheer=this.add.image(W/2,900,'moaCheer').setDisplaySize(180,180);this.tweens.add({targets:cheer,y:886,yoyo:true,repeat:-1,duration:900,ease:'Sine.easeInOut'});label(this,W/2,1000,'친구들이 무사히 구조차에 탔어요!',26,'#ffffff','900');const replay=button(this,W/2,1090,390,82,'한 번 더 출동하기',0x1f6b50);replay.on('pointerdown',()=>this.scene.start('title'));const back=button(this,W/2,1150,390,76,'생각정원으로 돌아가기',0x43685b);back.on('pointerdown',()=>location.href='../../');this.saveProgress();speak('모든 구조 임무를 완료했어요! 정말 멋진 구조대원이었어요.')
 }
 saveProgress(){try{const key='moa-garden:completed',done=JSON.parse(localStorage.getItem(key)||'{}');done.rescue=true;localStorage.setItem(key,JSON.stringify(done));const rewardKey='moa-rescue:rewarded';if(!localStorage.getItem(rewardKey)){const seedKey='moa-garden:seeds',n=Number(localStorage.getItem(seedKey)||0)+50;localStorage.setItem(seedKey,String(n));localStorage.setItem(rewardKey,'1')}}catch{}}
}
const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:LANDSCAPE_MODE?LW:W,height:LANDSCAPE_MODE?LH:H,backgroundColor:'#16382d',scene:[BootScene,TitleScene,MissionScene,ResultScene,LandscapeTitleScene,LandscapeMissionScene,LandscapeResultScene],render:{antialias:true,pixelArt:false,roundPixels:false},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:LANDSCAPE_MODE?LW:W,height:LANDSCAPE_MODE?LH:H}});
window.moaRescueGame=game;
window.addEventListener('orientationchange',()=>{document.getElementById('rotateHint').hidden=window.innerHeight>=window.innerWidth});

// A layout change needs a new Phaser world; retain the current round until the user reloads.

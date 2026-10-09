const LANDSCAPE_MODE=window.matchMedia('(min-width: 850px) and (orientation: landscape)').matches;
const W=720,H=1280;
const COLORS={노란:0xF5C84C,파란:0x59A7EF,초록:0x62BE78,빨간:0xEF6E68};
const SPECIES=['토끼','돼지','소','오리'];
const MISSIONS=[
 {place:'연못',color:'노란',size:'큰',species:['오리'],need:1},
 {place:'초원',color:'파란',size:'큰',species:['토끼'],need:1},
 {place:'개울',color:'파란',size:'큰',species:SPECIES,need:4},
 {place:'숲길',color:'초록',size:'큰',species:SPECIES,need:4},
 {place:'노을숲',color:'빨간',size:'작은',species:SPECIES,need:4}
];
const FONT='Pretendard, Noto Sans KR, Apple SD Gothic Neo, sans-serif';
let soundOn=localStorage.getItem('moa-rescue:sound')!=='off';
const ui={back:document.getElementById('backBtn'),sound:document.getElementById('soundBtn')};
ui.back.onclick=()=>location.href='../../';
ui.sound.onclick=()=>{soundOn=!soundOn;localStorage.setItem('moa-rescue:sound',soundOn?'on':'off');ui.sound.textContent=soundOn?'🔊':'🔇';};
ui.sound.textContent=soundOn?'🔊':'🔇';
function speak(t){if(!soundOn||!('speechSynthesis'in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='ko-KR';u.rate=.9;speechSynthesis.speak(u)}
function tone(ok=true){if(!soundOn)return;try{const A=window.AudioContext||window.webkitAudioContext,a=new A(),o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.setValueAtTime(ok?620:180,a.currentTime);o.frequency.exponentialRampToValueAtTime(ok?940:130,a.currentTime+.16);g.gain.setValueAtTime(.06,a.currentTime);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+.2);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+.21)}catch{}}
function roundRect(scene,x,y,w,h,r,fill,alpha=1,stroke=null,sw=0){const g=scene.add.graphics();g.fillStyle(fill,alpha);g.fillRoundedRect(x,y,w,h,r);if(stroke!==null){g.lineStyle(sw,stroke,1);g.strokeRoundedRect(x,y,w,h,r)}return g}
function label(scene,x,y,text,size=28,color='#17382f',weight='800',align='center'){return scene.add.text(x,y,text,{fontFamily:FONT,fontSize:`${size}px`,fontStyle:weight==='900'?'bold':'normal',fontWeight:weight,color,align,wordWrap:{width:620}}).setOrigin(.5)}
function button(scene,x,y,w,h,text,fill=0x17382f){const c=scene.add.container(x,y),bg=scene.add.graphics();bg.fillStyle(fill,1);bg.fillRoundedRect(-w/2,-h/2,w,h,24);bg.lineStyle(3,0xffffff,.25);bg.strokeRoundedRect(-w/2,-h/2,w,h,24);const t=scene.add.text(0,0,text,{fontFamily:FONT,fontSize:'29px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);c.add([bg,t]);c.setSize(w,h).setInteractive({useHandCursor:true});c.on('pointerover',()=>scene.tweens.add({targets:c,scale:1.035,duration:100}));c.on('pointerout',()=>scene.tweens.add({targets:c,scale:1,duration:100}));return c}
function animal(scene,type,colorHex,size='큰'){
  // Sprites are original illustration assets, not Phaser circle/ellipse drawings.
  const kind={토끼:'rabbit',돼지:'pig',소:'cow',오리:'duck'}[type];
  const color=Object.entries(COLORS).find(([,code])=>code===colorHex)?.[0]||'노란';
  const hue={노란:'yellow',파란:'blue',초록:'green',빨간:'red'}[color];
  const c=scene.add.container(0,0).setScale(size==='큰'?1:.62);
  const picture=scene.add.image(0,0,`sprite-${kind}-${hue}`).setDisplaySize(200,200);
  c.add(picture);
  c.setSize(150,194);
  return c;
}
function makeTargetPortrait(scene,m){const box=scene.add.container(0,0);const bg=roundRect(scene,-55,-55,110,110,28,0xffffff,.96,0xd8eadf,3);box.add(bg);if(m.species.length===1){const a=animal(scene,m.species[0],COLORS[m.color],m.size).setScale(m.size==='큰'?.6:.45);box.add(a)}else{m.species.forEach((sp,i)=>{const a=animal(scene,sp,COLORS[m.color],m.size).setScale(m.size==='큰'?.3:.22);a.setPosition((i%2)*42-21,Math.floor(i/2)*42-21);box.add(a)})}return box}
class BootScene extends Phaser.Scene{
 constructor(){super('boot')}
 preload(){
  this.load.image('hong','../../assets/friend-hong.png');
  this.load.image('moaDiscovery','../../assets/moa-discovery.png');
  this.load.image('moaCheer','../../assets/moa-cheer.png');
  const animals=['rabbit','pig','cow','duck'],colors=['yellow','blue','green','red'];
  animals.forEach(a=>colors.forEach(c=>this.load.svg(`sprite-${a}-${c}`,`art/${a}-${c}.svg`,{width:360,height:360})));
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
  this.rescuer=this.add.image(610,1040,'moaDiscovery').setDisplaySize(125,125).setDepth(42);
  this.tweens.add({targets:this.rescuer,y:1028,yoyo:true,repeat:-1,duration:950,ease:'Sine.easeInOut'});
 }
 addWorldProps(){for(let i=0;i<8;i++){const x=55+(i%4)*205+(i%2)*26,y=470+Math.floor(i/4)*390;const tree=this.add.container(x,y);const g=this.add.graphics();g.fillStyle(0x6e5230,1);g.fillRoundedRect(-12,16,24,90,10);g.fillStyle(i%2?0x3e8e52:0x347b49,1);g.fillCircle(0,0,52);g.fillCircle(-34,18,35);g.fillCircle(35,18,36);tree.add(g);tree.setDepth(18);this.tweens.add({targets:tree,angle:{from:-1,to:1},yoyo:true,repeat:-1,duration:1600+i*120,ease:'Sine.easeInOut'})}
  for(let i=0;i<10;i++){const x=55+(i*79)%620,y=535+(i*131)%430;const bush=this.add.container(x,y);const g=this.add.graphics();g.fillStyle(i%3?0x4ea85d:0x5cb469,1);g.fillCircle(-20,12,29);g.fillCircle(0,0,35);g.fillCircle(24,13,27);g.fillStyle(0x89cf70,.6);g.fillCircle(-8,-9,12);bush.add(g);bush.setDepth(26);this.actors.push({bush,x,y})}
  for(let i=0;i<6;i++){const r=this.add.ellipse(80+(i*117)%600,600+(i*173)%420,46,29,0xb9c2b5).setDepth(15);r.setAngle((i*17)%30-15)}
 }
 addClouds(){for(let i=0;i<3;i++){const c=this.add.container(-90+i*300,90+i*80);const g=this.add.graphics();g.fillStyle(0xffffff,.55);g.fillEllipse(0,0,130,45);g.fillCircle(-35,-10,28);g.fillCircle(30,-16,32);c.add(g);c.setDepth(2);this.tweens.add({targets:c,x:W+120,duration:18000+i*5000,repeat:-1,delay:i*1300})}}
 makeVan(x,y,s=1){const c=this.add.container(x,y).setScale(s),g=this.add.graphics();g.fillStyle(0xf8f2d9,1);g.fillRoundedRect(-110,-50,220,92,22);g.fillStyle(0x3e9564,1);g.fillRoundedRect(-110,-50,220,42,22);g.fillRect(-110,-25,220,22);g.fillStyle(0x284f46,1);g.fillRoundedRect(-82,-20,58,36,10);g.fillRoundedRect(12,-20,58,36,10);g.fillStyle(0x203a34,1);g.fillCircle(-68,44,23);g.fillCircle(69,44,23);g.fillStyle(0xd6eee0,1);g.fillCircle(-68,44,9);g.fillCircle(69,44,9);c.add(g);c.add(label(this,0,8,'모아 구조대',18,'#1b4d3b','900'));return c}
 drawHud(){roundRect(this,20,18,W-40,125,28,0x12392f,.95,0xffffff,2);label(this,75,51,`현장 ${this.round+1}/5`,20,'#cfe8da','900','left').setOrigin(0,.5);label(this,75,91,this.m.place,28,'#ffffff','900','left').setOrigin(0,.5);this.countText=label(this,W-85,76,`0/${this.m.need}`,30,'#ffffff','900');roundRect(this,W-145,48,110,58,24,0x23664d,1);this.countText.setDepth(5);this.progress=this.add.graphics().setDepth(5);for(let i=0;i<5;i++){this.progress.fillStyle(i<=this.round?0xf4d75a:0xffffff,i<=this.round?1:.25);this.progress.fillCircle(310+i*28,52,6)}}
 showBriefing(){this.lock=true;const shade=this.add.rectangle(W/2,H/2,W,H,0x0b241e,.62).setDepth(80).setInteractive();const card=this.add.container(W/2,H/2-20).setDepth(81);const bg=roundRect(this,-290,-265,580,530,34,0xf8fff9,1,0xffffff,3);card.add(bg);const guidePic=this.add.image(-205,-190,'hong').setDisplaySize(92,92);card.add(guidePic);const tag=label(this,25,-215,'📡 구조 무전 도착',25,'#1e6a4c','900');card.add(tag);const portrait=makeTargetPortrait(this,this.m).setPosition(0,-85);card.add(portrait);const target=this.m.need===1?`${this.m.color} ${this.m.size} ${this.m.species[0]}`:`${this.m.color} ${this.m.size} 동물 4종`;
  const t=label(this,0,55,target,38,'#17382f','900');card.add(t);const sub=label(this,0,112,this.m.need===1?'현장 어딘가에 숨어 있어요':'토끼 · 돼지 · 소 · 오리를 한 마리씩!',22,'#527066','800');card.add(sub);const go=button(this,0,205,330,78,'출동! 🚨',0x1c694d);card.add(go);go.on('pointerdown',()=>{tone(true);speak(`${target}를 찾아 구조해 줘!`);this.tweens.add({targets:card,y:-420,alpha:0,duration:380,ease:'Back.easeIn',onComplete:()=>{card.destroy();shade.destroy();this.lock=false;this.spawnAnimals();this.installTouchAssist();this.showMissionChip()}})})
 }
 showMissionChip(){const c=this.add.container(105,180).setDepth(60);const bg=roundRect(this,-80,-34,160,68,22,0xffffff,.94,0xd4e8dc,2);c.add(bg);const p=makeTargetPortrait(this,this.m).setScale(.42).setPosition(-42,0);c.add(p);const txt=label(this,20,0,this.m.need===1?'찾아!':`${this.m.need}마리`,19,'#21473b','900');c.add(txt);this.tweens.add({targets:c,y:187,yoyo:true,repeat:-1,duration:1000,ease:'Sine.easeInOut'});this.missionChip=c}
 spawnAnimals(){
  const m=this.m,items=[];if(m.need===1){const target=m.species[0];items.push({species:target,color:m.color,size:m.size,good:true});items.push({species:target,color:m.color,size:m.size==='큰'?'작은':'큰'});items.push({species:target,color:m.color==='노란'?'파란':'노란',size:m.size});items.push({species:SPECIES[(SPECIES.indexOf(target)+1)%4],color:m.color,size:m.size});while(items.length<7){const sp=Phaser.Utils.Array.GetRandom(SPECIES),cs=Phaser.Utils.Array.GetRandom(Object.keys(COLORS)),sz=Math.random()>.5?'큰':'작은';if(!items.some(x=>x.species===sp&&x.color===cs&&x.size===sz))items.push({species:sp,color:cs,size:sz})}}
  else{SPECIES.forEach(sp=>items.push({species:sp,color:m.color,size:m.size,good:true}));items.push({species:SPECIES[0],color:m.color,size:m.size});items.push({species:SPECIES[1],color:m.color,size:m.size==='큰'?'작은':'큰'});items.push({species:SPECIES[2],color:m.color==='초록'?'노란':'초록',size:m.size});items.push({species:SPECIES[3],color:m.color==='빨간'?'파란':'빨간',size:m.size})}
  Phaser.Utils.Array.Shuffle(items);const spots=[[110,350],[330,320],[575,365],[180,520],[520,535],[95,720],[350,690],[610,750],[190,900],[530,910]];
  Phaser.Utils.Array.Shuffle(spots);items.forEach((it,i)=>{const [x,y]=spots[i],a=animal(this,it.species,COLORS[it.color],it.size);a.setPosition(x,y);a.setDepth(i%3===0?20:30);a.setDataEnabled();a.data.set({species:it.species,color:it.color,size:it.size,rescuing:false});a.setInteractive(new Phaser.Geom.Rectangle(-108,-124,216,248),Phaser.Geom.Rectangle.Contains);a.on('pointerover',()=>{if(!this.lock)this.tweens.add({targets:a,scaleX:a.scaleX*1.05,scaleY:a.scaleY*1.05,duration:90})});a.on('pointerout',()=>{if(!a.data.get('rescuing'))this.tweens.add({targets:a,scaleX:it.size==='큰'?1:.62,scaleY:it.size==='큰'?1:.62,duration:90})});a.on('pointerdown',()=>this.pickAnimal(a));this.tweens.add({targets:a,y:y-8,yoyo:true,repeat:-1,duration:900+(i%4)*170,ease:'Sine.easeInOut'});this.actors.push(a)})
 }
 installTouchAssist(){
  const onTap=(pointer,currentlyOver)=>{
    if(this.lock)return;
    const choices=this.actors.filter(a=>a&&a.active&&a.data?.get('species')&&!a.data.get('rescuing'));
    if((currentlyOver||[]).some(o=>choices.includes(o)))return;
    let nearest=null,smallest=Infinity;
    for(const a of choices){
      const dx=pointer.x-a.x,dy=pointer.y-a.y;
      const maxX=a.scaleX<.8?75:109,maxY=a.scaleY<.8?84:124;
      const metric=(dx/maxX)**2+(dy/maxY)**2;
      if(metric<smallest){smallest=metric;nearest=a}
    }
    if(nearest&&smallest<=1.08)this.pickAnimal(nearest);
  };
  this.input.on('pointerdown',onTap);
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.input.off('pointerdown',onTap));
 }
 pickAnimal(a){if(this.lock||a.data.get('rescuing'))return;const sp=a.data.get('species'),basic=a.data.get('color')===this.m.color&&a.data.get('size')===this.m.size,good=basic&&this.m.species.includes(sp)&&!this.found.has(sp);if(!good){tone(false);this.cameras.main.shake(80,.0025);const q=this.add.text(a.x,a.y-95,basic&&this.found.has(sp)?'이미 구조했어!':'앗, 다른 친구!',{fontFamily:FONT,fontSize:'19px',fontStyle:'bold',color:'#8b3b37',backgroundColor:'#fff6f1',padding:{x:10,y:6}}).setOrigin(.5).setDepth(70);this.tweens.add({targets:a,x:a.x+18,duration:70,yoyo:true,repeat:3});this.tweens.add({targets:q,y:q.y-25,alpha:0,duration:700,onComplete:()=>q.destroy()});return}
  a.data.set('rescuing',true);this.found.add(sp);tone(true);this.rescueBurst(a.x,a.y);this.showToast(`${sp} 구조 성공!`);this.tweens.killTweensOf(a);this.tweens.add({targets:a,scaleX:a.scaleX*1.15,scaleY:a.scaleY*1.15,duration:130,yoyo:true,onComplete:()=>{this.tweens.add({targets:a,x:W/2,y:1050,scaleX:.22,scaleY:.22,angle:360,duration:850,ease:'Cubic.easeInOut',onComplete:()=>{a.destroy();this.addSeat(sp);this.countText.setText(`${this.found.size}/${this.m.need}`);if(this.found.size>=this.m.need)this.completeMission()}})}})
 }
 rescueBurst(x,y){const ring=this.add.circle(x,y,54,0xffffff,0).setStrokeStyle(6,0xffef9a,1).setDepth(65);this.tweens.add({targets:ring,scale:1.8,alpha:0,duration:520,onComplete:()=>ring.destroy()});for(let i=0;i<10;i++){const p=this.add.circle(x,y,5+(i%3)*2,i%2?0xffdc68:0xffffff,1).setDepth(66),ang=Math.PI*2*i/10,dist=55+Math.random()*40;this.tweens.add({targets:p,x:x+Math.cos(ang)*dist,y:y+Math.sin(ang)*dist,alpha:0,scale:.2,duration:500+Math.random()*250,onComplete:()=>p.destroy()})}}
 addSeat(sp){const i=SPECIES.indexOf(sp),slots=this.m.need===1?[0]:[0,1,2,3],idx=this.m.need===1?0:slots[i],x=(idx-(this.m.need===1?0:1.5))*52;const mini=animal(this,sp,COLORS[this.m.color],this.m.size).setScale(.25).setPosition(x,0);const badge=this.add.circle(x,0,27,0xf8fff9,1).setStrokeStyle(3,0x5fba78,1);this.seatLayer.add([badge,mini]);mini.setDepth(2);this.tweens.add({targets:[badge,mini],scale:'+=.15',duration:120,yoyo:true})}
 showToast(text){const c=this.add.container(W/2,1010).setDepth(75);const bg=roundRect(this,-170,-34,340,68,22,0x133e32,.94);const t=label(this,0,0,`✨ ${text}`,22,'#ffffff','900');c.add([bg,t]);this.tweens.add({targets:c,y:970,duration:180,ease:'Back.easeOut'});this.time.delayedCall(850,()=>this.tweens.add({targets:c,alpha:0,y:940,duration:220,onComplete:()=>c.destroy()}))}
 completeMission(){this.lock=true;this.completeOverlayShown=true;this.missionChip?.destroy();const shade=this.add.rectangle(W/2,H/2,W,H,0x0d2d24,.45).setDepth(79).setInteractive();const card=this.add.container(W/2,640).setDepth(82);const bg=roundRect(this,-290,-210,580,420,34,0xfffdf4,1,0xffffff,4);card.add(bg);card.add(label(this,0,-145,'구조 성공! ✨',43,'#194c3a','900'));card.add(label(this,0,-88,`${this.m.place}의 친구들이 안전해졌어요`,23,'#547064','800'));const row=this.add.container(0,0);this.m.species.slice(0,this.m.need).forEach((sp,i)=>{const a=animal(this,sp,COLORS[this.m.color],this.m.size).setScale(this.m.size==='큰'?.36:.28);a.setPosition((i-(this.m.need-1)/2)*88,0);row.add(a)});card.add(row);const last=this.round===4;const next=button(this,0,135,340,76,last?'구조 완료 보기 🏕️':'다음 현장으로 ▶',0x1e664d);card.add(next);let advancing=false;const advance=()=>{if(advancing)return;advancing=true;this.input.off('pointerdown',tapHandler);tone(true);if(last)this.scene.start('result');else this.scene.restart({round:this.round+1})};
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
  roundRect(this,65,280,590,470,38,0xfffdf2,1,0xffffff,4);label(this,W/2,335,'구조 기록',25,'#5d7569','900');const colors=['노란','파란','파란','초록','빨간'];const sizes=['큰','큰','큰','큰','작은'];for(let i=0;i<5;i++){const y=405+i*64;this.add.circle(125,y,19,COLORS[colors[i]],1).setStrokeStyle(3,0xffffff,1);const sp=i<2?MISSIONS[i].species[0]:'4종';label(this,165,y,`${i+1}. ${MISSIONS[i].place}`,22,'#17382f','900','left').setOrigin(0,.5);label(this,420,y,`${colors[i]} · ${sizes[i]} · ${sp}`,20,'#537067','800','left').setOrigin(0,.5)}
  const friends=this.add.container(W/2,835);SPECIES.forEach((sp,i)=>{const a=animal(this,sp,[COLORS.노란,COLORS.파란,COLORS.초록,COLORS.빨간][i],'큰').setScale(.58).setPosition((i-1.5)*125,0);friends.add(a);this.tweens.add({targets:a,y:-12,yoyo:true,repeat:-1,duration:800+i*160,ease:'Sine.easeInOut'})});
  const cheer=this.add.image(W/2,900,'moaCheer').setDisplaySize(180,180);this.tweens.add({targets:cheer,y:886,yoyo:true,repeat:-1,duration:900,ease:'Sine.easeInOut'});label(this,W/2,1000,'친구들이 무사히 구조차에 탔어요!',26,'#ffffff','900');const replay=button(this,W/2,1090,390,82,'한 번 더 출동하기',0x1f6b50);replay.on('pointerdown',()=>this.scene.start('title'));const back=button(this,W/2,1150,390,76,'생각정원으로 돌아가기',0x43685b);back.on('pointerdown',()=>location.href='../../');this.saveProgress();speak('모든 구조 임무를 완료했어요! 정말 멋진 구조대원이었어요.')
 }
 saveProgress(){try{const key='moa-garden:completed',done=JSON.parse(localStorage.getItem(key)||'{}');done.rescue=true;localStorage.setItem(key,JSON.stringify(done));const rewardKey='moa-rescue:rewarded';if(!localStorage.getItem(rewardKey)){const seedKey='moa-garden:seeds',n=Number(localStorage.getItem(seedKey)||0)+50;localStorage.setItem(seedKey,String(n));localStorage.setItem(rewardKey,'1')}}catch{}}
}
const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:LANDSCAPE_MODE?LW:W,height:LANDSCAPE_MODE?LH:H,backgroundColor:'#16382d',scene:[BootScene,TitleScene,MissionScene,ResultScene,LandscapeTitleScene,LandscapeMissionScene,LandscapeResultScene],render:{antialias:true,pixelArt:false,roundPixels:false},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:LANDSCAPE_MODE?LW:W,height:LANDSCAPE_MODE?LH:H}});
window.moaRescueGame=game;
window.addEventListener('orientationchange',()=>{document.getElementById('rotateHint').hidden=window.innerHeight>=window.innerWidth});

// A layout change needs a new Phaser world; retain the current round until the user reloads.

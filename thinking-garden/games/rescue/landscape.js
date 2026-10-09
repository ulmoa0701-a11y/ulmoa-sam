// Wide-screen play mode. Kept separate from the established portrait game.
const LW=1200,LH=760;
class LandscapeTitleScene extends Phaser.Scene{
 constructor(){super('landtitle')}
 create(){
  this.cameras.main.setBackgroundColor('#d7f1e9');
  landscapeBackdrop(this,'title');
  label(this,600,106,'모아 구조대!',57,'#173f32','900');
  label(this,600,167,'숲속 친구들을 찾아 안전하게 구조해요',28,'#325d4d','800');
  const species=['토끼','돼지','소','오리'];
  const colors=[COLORS.파란,COLORS.노란,COLORS.초록,COLORS.빨간];
  species.forEach((sp,i)=>{
   const x=340+i*174,y=400;
   const p=roundRect(this,x-74,y-110,148,213,26,0xffffff,.94,0xb9dcca,3).setDepth(12);
   p.setInteractive();
   const a=animal(this,sp,colors[i],'큰').setPosition(x,y-8).setDepth(13);
   this.add.text(x,y+82,sp,{fontFamily:FONT,fontSize:'25px',fontStyle:'bold',color:'#214636'}).setOrigin(.5).setDepth(14);
   this.tweens.add({targets:a,y:y-17,duration:1200+i*170,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
  });
  const start=button(this,600,619,350,82,'🚨 구조 출동하기',0x226b51).setDepth(50);
  start.on('pointerdown',()=>{tone(true);this.scene.start('landmission',{round:0})});
  label(this,600,708,'마우스로 클릭하거나 화면을 터치해요 · 시간 제한 없음',21,'#3d6354','800').setDepth(10);
 }
}
function landscapeBackdrop(scene,place='초원'){
 const idx=Math.max(0,MISSIONS.findIndex(m=>m.place===place));
 scene.add.image(LW/2,LH/2,`world-wide-${idx}`).setDisplaySize(LW,LH).setDepth(-20);
}
class LandscapeMissionScene extends Phaser.Scene{
 constructor(){super('landmission')}
 init(data){this.round=data.round||0;this.found=new Set();this.lock=true;this.targets=[];this.completeOverlayShown=false}
 create(){
  this.m=MISSIONS[this.round];landscapeBackdrop(this,this.m.place);
  const panel=roundRect(this,22,22,290,716,30,0xffffff,.96,0xe1ece4,3).setDepth(20);
  label(this,166,78,`현장 ${this.round+1} / 5`,26,'#3c7760','900').setDepth(21);
  label(this,166,128,this.m.place,43,'#173f32','900').setDepth(21);
  this.portrait=makeTargetPortrait(this,this.m).setPosition(166,265).setScale(1.32).setDepth(21);
  this.targetText=this.m.need===1?`${this.m.color} ${this.m.size} ${this.m.species[0]}`:`${this.m.color} ${this.m.size} 동물`;
  label(this,166,385,this.targetText,29,'#173f32','900').setDepth(21);
  label(this,166,432,'찾아서 눌러요!',23,'#567567','800').setDepth(21);
  this.count=label(this,166,500,`구조 0 / ${this.m.need}`,29,'#1b6a4b','900').setDepth(21);
  const instruction=this.m.need===1?'색깔 · 크기 · 동물을 확인해요':'토끼, 돼지, 소, 오리\n각각 한 마리씩 찾아요';
  this.add.text(166,578,instruction,{fontFamily:FONT,fontSize:'21px',fontStyle:'bold',color:'#436958',align:'center',lineSpacing:10,wordWrap:{width:247}}).setOrigin(.5).setDepth(21);
  const back=button(this,166,680,215,58,'처음으로',0x526e60).setDepth(22);
  back.on('pointerdown',()=>this.scene.start('landtitle'));
  roundRect(this,329,18,849,78,24,0x153d32,.9).setDepth(14);
  label(this,751,56,'무전을 듣고 알맞은 동물을 구조해요',28,'#ffffff','900').setDepth(15);
  const start=button(this,750,356,370,88,'출동! 🚨',0x226c50).setDepth(55);
  const shade=this.add.rectangle(754,413,875,630,0x0a291e,.42).setDepth(50);
  start.on('pointerdown',()=>{tone(true);speak(`${this.targetText}를 찾아줘`);shade.destroy();start.destroy();this.lock=false;this.spawn()});
 }
 spawn(){
  const m=this.m,items=[];
  if(m.need===1){
   const target=m.species[0];items.push({species:target,color:m.color,size:m.size});
   items.push({species:target,color:m.color,size:m.size==='큰'?'작은':'큰'});
   items.push({species:target,color:m.color==='노란'?'파란':'노란',size:m.size});
   items.push({species:SPECIES[(SPECIES.indexOf(target)+1)%4],color:m.color,size:m.size});
   while(items.length<8){
    const sp=Phaser.Utils.Array.GetRandom(SPECIES),color=Phaser.Utils.Array.GetRandom(Object.keys(COLORS)),size=Math.random()>.5?'큰':'작은';
    if(!items.some(it=>it.species===sp&&it.color===color&&it.size===size))items.push({species:sp,color,size});
   }
  }else{
   SPECIES.forEach(sp=>items.push({species:sp,color:m.color,size:m.size}));
   items.push({species:'토끼',color:m.color,size:m.size});
   items.push({species:'돼지',color:m.color,size:m.size==='큰'?'작은':'큰'});
   items.push({species:'소',color:m.color==='초록'?'파란':'초록',size:m.size});
   items.push({species:'오리',color:m.color==='빨간'?'노란':'빨간',size:m.size});
  }
  Phaser.Utils.Array.Shuffle(items);
  // Species-aware world positions: mammals stay on ground, ducks may enter water.
  const watery=this.round===0||this.round===2;
  const bankPositions=[[391,338],[533,328],[674,337],[815,328],[958,336],[1096,330]];
  const waterPositions=[[478,552],[673,560],[868,550],[1075,568]];
  const meadowPositions=[[430,335],[640,335],[850,335],[1060,335],[430,572],[640,572],[850,572],[1060,572]];
  Phaser.Utils.Array.Shuffle(bankPositions);Phaser.Utils.Array.Shuffle(waterPositions);Phaser.Utils.Array.Shuffle(meadowPositions);
  items.forEach((it,i)=>{
   const pos=watery?(it.species==='오리'&&waterPositions.length?waterPositions.pop():bankPositions.pop()||meadowPositions.pop()):meadowPositions[i];
   const [x,y]=pos,a=animal(this,it.species,COLORS[it.color],it.size);
   a.setPosition(x,y).setDepth(8);a.setDataEnabled();a.data.set('item',it);
   a.setInteractive(new Phaser.Geom.Rectangle(-68,-99,136,198),Phaser.Geom.Rectangle.Contains);
   a.on('pointerdown',()=>this.pick(a));
   a.on('pointerover',()=>{if(!this.lock)this.tweens.add({targets:a,scaleX:(it.size==='큰'?1:.62)*1.07,scaleY:(it.size==='큰'?1:.62)*1.07,duration:110})});
   a.on('pointerout',()=>{if(a.active)this.tweens.add({targets:a,scaleX:it.size==='큰'?1:.62,scaleY:it.size==='큰'?1:.62,duration:110})});
   this.targets.push(a);
  });
 }
 pick(a){
  if(this.lock||!a.active)return;
  const it=a.data.get('item'),good=it.color===this.m.color&&it.size===this.m.size&&this.m.species.includes(it.species)&&!this.found.has(it.species);
  if(!good){
   tone(false);const t=label(this,a.x,a.y-112,'다른 친구예요',19,'#8a332f','900').setDepth(40);
   this.tweens.add({targets:t,y:t.y-28,alpha:0,duration:650,onComplete:()=>t.destroy()});
   return;
  }
  this.found.add(it.species);a.disableInteractive();tone(true);
  const x=a.x,y=a.y;
  this.tweens.add({targets:a,y:y-33,alpha:0,scale:.25,duration:450,onComplete:()=>a.destroy()});
  const success=label(this,x,y,'구조 성공! ✨',23,'#125b3d','900').setDepth(40);
  this.tweens.add({targets:success,y:y-58,alpha:0,duration:950,onComplete:()=>success.destroy()});
  this.count.setText(`구조 ${this.found.size} / ${this.m.need}`);
  if(this.found.size===this.m.need){this.lock=true;this.time.delayedCall(650,()=>this.completed())}
 }
 completed(){
  this.completeOverlayShown=true;
  const shade=this.add.rectangle(600,380,LW,LH,0x0c2a21,.55).setDepth(80).setInteractive();
  roundRect(this,375,184,460,408,32,0xfffdf4,1,0xffffff,4).setDepth(81);
  label(this,605,270,'구조 성공! ✨',43,'#18543d','900').setDepth(82);
  label(this,605,352,`${this.m.place} 임무 완료`,30,'#345e4d','900').setDepth(82);
  label(this,605,414,`${this.found.size}마리 구조했어요`,24,'#547064','800').setDepth(82);
  const last=this.round===4;
  const next=button(this,605,514,333,77,last?'전체 결과 보기':'다음 현장으로 ▶',0x1e684d).setDepth(83);
  let advancing=false;
  const advance=()=>{if(advancing)return;advancing=true;this.input.off('pointerdown',wideClickHandler);tone(true);if(last)this.scene.start('landresult');else this.scene.restart({round:this.round+1})};
  const wideClickHandler=(pointer)=>{if(pointer.x>=605-166&&pointer.x<=605+166&&pointer.y>=514-39&&pointer.y<=514+39)advance()};
  next.on('pointerdown',advance);
  this.input.on('pointerdown',wideClickHandler);
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.input.off('pointerdown',wideClickHandler));
 }
}
class LandscapeResultScene extends Phaser.Scene{
 constructor(){super('landresult')}
 create(){
  landscapeBackdrop(this,'초원');
  roundRect(this,230,60,740,636,40,0xffffff,.94,0xe2eee5,3);
  label(this,600,138,'모아 구조대 임무 완료! 🎉',48,'#17553d','900');
  label(this,600,195,'5개 현장의 친구들을 구조했어요',28,'#426a57','800');
  ['토끼','돼지','소','오리'].forEach((sp,i)=>{
   const a=animal(this,sp,[COLORS.파란,COLORS.노란,COLORS.초록,COLORS.빨간][i]);
   a.setPosition(360+i*160,364).setScale(.9);
   label(this,360+i*160,471,sp,25,'#214938','900');
  });
  const again=button(this,600,563,355,79,'다시 출동하기',0x226b51);
  again.on('pointerdown',()=>this.scene.start('landtitle'));
  const back=button(this,600,658,355,68,'생각정원으로 돌아가기',0x476f5d);
  back.on('pointerdown',()=>location.href='../../');
  try{
   const key='moa-garden:completed',done=JSON.parse(localStorage.getItem(key)||'{}');done.rescue=true;localStorage.setItem(key,JSON.stringify(done));
   if(!localStorage.getItem('moa-rescue:rewarded')){
    localStorage.setItem('moa-garden:seeds',String(Number(localStorage.getItem('moa-garden:seeds')||0)+50));
    localStorage.setItem('moa-rescue:rewarded','1');
   }
  }catch{}
 }
}

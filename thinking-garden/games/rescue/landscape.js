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
  this.targetText=targetLabel(this.m);
  label(this,166,383,targetHeadline(this.m),27,'#173f32','900').setDepth(21);
  label(this,166,426,this.m.focus==='size'?'큰 토끼 · 큰 돼지':this.m.need===1?'한 마리를 찾아요':`${this.m.need}마리 · ${this.m.species.join('·')}`,21,'#567567','800').setDepth(21);
  this.count=label(this,166,500,`구조 0 / ${this.m.need}`,29,'#1b6a4b','900').setDepth(21);
  const instruction=this.m.focus==='species'?'모두 같은 색깔이에요':this.m.focus==='color'?'모두 토끼예요 · 색깔을 봐요':this.m.focus==='size'?'같은 종류끼리 크기를 비교해요':this.m.focus==='color-species'?'색깔과 동물 종류를 봐요':'색깔 · 크기를 모두 살펴요';
  this.add.text(166,578,instruction,{fontFamily:FONT,fontSize:'21px',fontStyle:'bold',color:'#436958',align:'center',lineSpacing:10,wordWrap:{width:247}}).setOrigin(.5).setDepth(21);
  const back=button(this,166,680,215,58,'처음으로',0x526e60).setDepth(22);
  back.on('pointerdown',()=>this.scene.start('landtitle'));
  roundRect(this,329,18,849,78,24,0x153d32,.9).setDepth(14);
  // The same concrete task stays visible after the team starts searching.
  this.missionBarText=label(this,689,56,this.targetText,this.targetText.length>18?22:26,'#ffffff','900').setDepth(15);
  const replay=button(this,1094,57,142,60,'🔊 다시',0x2a7858).setDepth(18);
  replay.on('pointerdown',()=>speak(this.targetText));
  const shade=this.add.rectangle(754,413,875,630,0x0a291e,.42).setDepth(50);
  const briefingCard=roundRect(this,393,241,722,340,32,0xfffdf6,.99,0xcde9d8,3).setDepth(52);
  // Child's reading order: What should I find? -> reassurance -> Dispatch.
  const missionSize=this.targetText.length>18?31:this.targetText.length>13?34:39;
  const title=this.add.text(754,330,this.targetText,{
   fontFamily:FONT,fontSize:missionSize+'px',fontStyle:'bold',color:'#163c30',
   align:'center',wordWrap:{width:650,useAdvancedWrap:true},lineSpacing:7
  }).setOrigin(.5).setDepth(54);
  const helper=this.m.need===1?'한 마리를 찾아요':this.m.focus==='size'?'같은 종류끼리 크기를 비교해요':'한 마리씩 차례대로 찾아요';
  const subtitle=label(this,754,411,helper,23,'#587264','800').setDepth(54);
  const start=button(this,754,498,350,78,'출동! 🚨',0x226c50).setDepth(55);
  this.briefingTargetText=title;
  this.briefingStartButton=start;
  start.on('pointerdown',()=>{
   tone(true);speak(this.targetText);
   [shade,briefingCard,title,subtitle,start].forEach(item=>item.destroy());
   this.lock=false;this.spawn();
  });
 }
 spawn(){
  const items=makeChoices(this.round),top=Math.ceil(items.length/2),bottom=items.length-top;
  if(this.m.focus==='size'){
   [320,595].forEach(base=>roundRect(this,442,base-4,485,38,18,0xf5eed9,.94,0xb9c9a8,2).setDepth(5));
  }
  const xAt=(index,count)=>750+(index-(count-1)/2)*218;
  items.forEach((it,i)=>{
   const row=i<top?0:1,j=row===0?i:i-top,n=row===0?top:bottom;
   const x=this.m.focus==='size'?(j===0?525:810):xAt(j,n),baseY=row===0?320:595;
   const y=this.m.focus==='size'?baseY-(it.size==='큰'?BODY_PIXELS_BIG:BODY_PIXELS_SMALL)/2:row===0?248:509;
   const a=animal(this,it.species,COLORS[it.color],it.size);
   a.setPosition(x,y).setDepth(8);
   a.setDataEnabled();a.data.set('item',it);
   // Use scene coordinates instead of overlapping Phaser Container hit areas.
   this.targets.push(a);
  });
  const onTap=pointer=>{
    if(this.lock)return;
    let closest=null,score=Infinity;
    for(const a of this.targets){
      if(!a.active||a.data?.get('rescuing'))continue;
      const small=a.data.get('item').size==='작은';
      const x=(pointer.x-a.x)/(small?90:119),y=(pointer.y-a.y)/(small?90:115);
      const d=x*x+y*y;
      if(d<score){score=d;closest=a}
    }
    if(closest&&score<=1.06)this.pick(closest);
  };
  // Do not interpret the same click that dismissed the briefing as an animal tap.
  this.input.once('pointerup',()=>this.input.on('pointerdown',onTap));
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.input.off('pointerdown',onTap));
 }
 pick(a){
  if(this.lock||!a.active)return;
  const it=a.data.get('item'),good=it.color===this.m.color&&it.size===this.m.size&&this.m.species.includes(it.species)&&!this.found.has(it.species);
  if(!good){
   const reason=wrongReason(this.m,it);
   tone(false);
   const t=this.add.text(a.x,a.y-126,reason,{fontFamily:FONT,fontSize:'24px',fontStyle:'bold',color:'#6c4531',backgroundColor:'#fff9ef',padding:{x:12,y:8}}).setOrigin(.5).setDepth(40);
   this.tweens.add({targets:t,y:t.y-20,alpha:0,duration:1150,onComplete:()=>t.destroy()});
   return;
  }
  this.found.add(it.species);a.data.set('rescuing',true);a.disableInteractive();tone(true);
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

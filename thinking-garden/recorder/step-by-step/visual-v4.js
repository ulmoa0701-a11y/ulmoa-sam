/* Recorder learning sequence: face recognition -> observe finger -> real instrument -> short reward.
   This module intentionally does not equate a screen tap with real finger control. */
(function(){
'use strict';
var lessons=[
 {finger:'왼손 엄지',title:'엄지는 리코더 뒤쪽에!',short:'뒷면의 엄지 구멍',face:'back',hole:0,emoji:'🌱',
  explain:'리코더 뒤쪽에는 구멍이 하나 있어요. 왼손 엄지가 이 구멍을 덮어요.',
  cue:'앞면이 아니라 뒷면! 리코더를 실제로 돌려서 찾아봐요.'},
 {finger:'왼손 검지',title:'검지는 앞면 맨 위에!',short:'앞면 맨 위 1번 구멍',face:'front',hole:1,emoji:'🌷',
  explain:'입으로 부는 부분 아래를 보면 앞면 구멍이 차례로 있어요. 맨 위 구멍이 1번, 왼손 검지 자리예요.',
  cue:'입구 아래에서 처음 만나는 구멍 = 1번. 손가락 끝의 넓은 부분을 살짝 올려봐요.'},
 {finger:'왼손 중지',title:'중지는 바로 그 아래!',short:'1번 아래 2번 구멍',face:'front',hole:2,emoji:'🌼',
  explain:'검지가 올려진 첫 번째 구멍 바로 아래가 2번이에요. 왼손 중지를 올려봐요.',
  cue:'검지는 그대로 둔 채 중지만 하나 더 올려요.'},
 {finger:'왼손 약지',title:'약지는 세 번째 자리에!',short:'2번 아래 3번 구멍',face:'front',hole:3,emoji:'🌻',
  explain:'중지가 올려진 두 번째 구멍 바로 아래가 3번이에요. 왼손 약지를 올려봐요.',
  cue:'엄지·검지·중지를 유지하고, 약지만 한 개 더 올려봐요.'}
];
var state={phase:'explore',face:'front',step:0,demo:false,realAttempts:0,realStatus:[],voice:true,exploredFront:false,exploredBack:false};
var byId=function(s){return document.getElementById(s)};
var colors={wood:'#efcf96',dark:'#aa7a48'};
var holeYs={1:260,2:312,3:364,4:428,5:477,6:531,7:573};
function speak(msg){
 if(!state.voice||!('speechSynthesis' in window))return;
 try{window.speechSynthesis.cancel();var a=new SpeechSynthesisUtterance(msg);a.lang='ko-KR';a.rate=.84;window.speechSynthesis.speak(a)}catch(e){}
}
function line(x1,y1,x2,y2){return '<path d="M'+x1+' '+y1+' L'+x2+' '+y2+'" fill="none" stroke="#738a76" stroke-width="3" stroke-dasharray="4 6" stroke-linecap="round"/>'}
function hole(cx,cy,r,index,isCovered,fade){
 return '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+(isCovered?'#32483d':'#f5f0df')+'" stroke="#7b6548" stroke-width="3" '+(fade?'opacity=".48"':'')+'/>'+
 (isCovered?'<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+Math.max(3,r-3)+'" ry="'+Math.max(3,r-3)+'" fill="#284b36" opacity=".5"/>':'');
}
/* V4 educational illustration: one complete recorder + one magnified fingering area.
   No stretched SVG body or fake human arm. The magnified part is a diagram, not a photograph. */
function diagram(face,focus,covered){
 var back=face==='back',selected=back?0:((typeof focus==='number')?focus:1);
 var labels={0:'왼손 엄지',1:'왼손 검지',2:'왼손 중지',3:'왼손 약지'};
 var name=labels[selected]||'왼손 검지';
 var holeY={1:258,2:299,3:339,4:393,5:436,6:484,7:525};
 var zoomY={0:338,1:317,2:397,3:477};
 var fy=back?258:(holeY[selected]||258),zy=zoomY[selected]||317;
 var s='<svg viewBox="0 0 640 700" role="img" aria-label="소프라노 리코더 '+(back?'뒷면과 엄지 구멍':'앞면 전체와 왼손 손가락 자리 확대 그림')+'" xmlns="http://www.w3.org/2000/svg">'+
 '<defs>'+
 '<linearGradient id="ivory"><stop stop-color="#b7a17f"/><stop offset=".2" stop-color="#e5d3b1"/><stop offset=".49" stop-color="#fff7e0"/><stop offset=".77" stop-color="#ead7b4"/><stop offset="1" stop-color="#bfa786"/></linearGradient>'+
 '<linearGradient id="ivory2"><stop stop-color="#bba07c"/><stop offset=".23" stop-color="#e8d4ac"/><stop offset=".55" stop-color="#fff4d9"/><stop offset="1" stop-color="#bca07c"/></linearGradient>'+
 '<filter id="recShadow" x="-40%" width="180%" y="-10%" height="135%"><feDropShadow dx="4" dy="9" stdDeviation="6" flood-color="#385544" flood-opacity=".18"/></filter>'+
 '</defs>'+
 '<rect x="3" y="3" width="634" height="694" rx="29" fill="#f0f7f1"/>'+
 '<rect x="29" y="24" width="230" height="645" rx="26" fill="#ffffff" fill-opacity=".82" stroke="#dfece1" stroke-width="2"/>'+
 '<text x="144" y="66" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="850" font-size="20" fill="#37634e">'+(back?'리코더 뒷면':'리코더 앞면')+'</text>'+
 '<text x="144" y="89" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="730" fill="#718575">입구가 위로!</text>'+
 /* full instrument, normal proportions */
 '<g filter="url(#recShadow)">'+
 '<path d="M128 216 L160 216 L158 553 Q159 572 168 586 L118 586 Q130 572 130 553 Z" fill="url(#ivory)" stroke="#b8a382" stroke-width="2"/>'+
 '<path d="M126 201 H160 L162 225 L125 225Z" fill="url(#ivory2)" stroke="#ab9270" stroke-width="2"/>'+
 '<path d="M126 143 Q128 136 132 133 L157 133 Q160 146 164 156 L163 205 Q159 213 153 214 H130 Q122 211 122 201 L122 149 Z" fill="url(#ivory2)" stroke="#b6a081" stroke-width="2"/>'+
 '<path d="M126 145 Q141 140 157 145 L157 161 L126 161Z" fill="#f5e6c9"/>'+
 (back?'':'<rect x="132" y="173" width="23" height="8" rx="3" fill="#72583d"/>')+
 '<path d="M127 552 H159" stroke="#aa9371" stroke-width="2"/>'+
 '<path d="M122 583 Q144 591 165 583 L169 605 Q144 614 117 605Z" fill="url(#ivory2)" stroke="#aa9471" stroke-width="2"/>'+
 '</g>';
 if(back){
  s+='<circle cx="144" cy="258" r="9" fill="#413a30" stroke="#a58d70" stroke-width="2"/>';
 }else{
  for(var i=1;i<=5;i++)s+='<circle cx="144" cy="'+holeY[i]+'" r="'+(i===1?9:8)+'" fill="#413a30" stroke="#a58d70" stroke-width="2"/>';
  for(var j=6;j<=7;j++){
    var y=holeY[j];s+='<circle cx="138" cy="'+y+'" r="4.7" fill="#413a30" stroke="#a58d70" stroke-width="1.8"/><circle cx="149" cy="'+(y+1)+'" r="4" fill="#413a30" stroke="#a58d70" stroke-width="1.8"/>';
  }
 }
 s+='<circle cx="144" cy="'+fy+'" r="18" fill="none" stroke="#b3773c" stroke-width="3"/>'+
    '<path d="M164 '+fy+' H276" stroke="#7d9b87" stroke-width="2.5" stroke-dasharray="5 5"/>'+
    '<text x="144" y="639" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="750" fill="#6c8171">'+(back?'뒷면 엄지 자리':'위쪽부터 1번 · 2번 · 3번')+'</text>'+
 /* right zoom window */
 '<rect x="276" y="82" width="345" height="493" rx="27" fill="#fffefa" stroke="#d7e7dc" stroke-width="3"/>'+
 '<text x="301" y="124" font-family="system-ui,sans-serif" font-size="21" font-weight="900" fill="#305c47">'+name+' 자리</text>'+
 '<text x="301" y="152" font-family="system-ui,sans-serif" font-size="14" font-weight="750" fill="#6c8171">'+(back?'악기를 돌려 뒷면을 봐요':'입구 아래 구멍을 크게 볼게요')+'</text>'+
 '<g filter="url(#recShadow)">'+
 '<path d="M405 232 H481 L477 538 H411Z" fill="url(#ivory)" stroke="#bca681" stroke-width="3"/>'+
 '<path d="M407 227 H479 V245 H406Z" fill="url(#ivory2)" stroke="#ad9171" stroke-width="2"/>'+
 '<path d="M407 194 Q410 174 420 172 L469 172 Q477 193 486 210 L486 228 Q487 239 476 242 H416 Q405 240 405 228 Z" fill="url(#ivory2)" stroke="#ad9671" stroke-width="3"/>'+
 '<path d="M409 180 H471 L476 196 H409Z" fill="#fff1d1"/>'+
 (back?'':'<rect x="421" y="208" width="49" height="10" rx="5" fill="#6e543b"/>')+
 '</g>';
 if(back){
  s+='<circle cx="445" cy="338" r="22" fill="#41392e" stroke="#ab9575" stroke-width="3"/>';
 }else{
  for(var k=1;k<=3;k++)s+='<circle cx="445" cy="'+zoomY[k]+'" r="22" fill="#41392e" stroke="#ab9575" stroke-width="3"/>';
 }
 s+='<circle cx="445" cy="'+zy+'" r="35" fill="none" stroke="#d49b5d" stroke-width="5" stroke-dasharray="8 7"/>'+
 '<rect x="294" y="'+(zy-28)+'" width="118" height="56" rx="17" fill="#e7f3e8" stroke="#d1e7d4" stroke-width="2"/>'+
 '<text x="353" y="'+(zy+7)+'" text-anchor="middle" font-family="system-ui,sans-serif" font-size="17" font-weight="900" fill="#2c6144">'+name+'</text>'+
 '<path d="M411 '+zy+' H424" stroke="#4d8261" stroke-width="3"/>';
 if(!back){for(var n=1;n<=3;n++)s+='<text x="492" y="'+(zoomY[n]+7)+'" font-family="system-ui,sans-serif" font-size="19" font-weight="'+(n===selected?'900':'750')+'" fill="'+(n===selected?'#305e45':'#839486')+'">'+n+'번</text>';}
 if(covered){
   s+='<g class="finger-group" aria-hidden="true">'+
   '<circle cx="445" cy="'+zy+'" r="23" fill="#458865" stroke="#eaf9e6" stroke-width="3" />'+
   '<path d="M435 '+zy+' l8 8 l14 -17" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>'+
   '</g>';
 }
 s+='<rect x="293" y="596" width="315" height="69" rx="20" fill="#dff2e3" stroke="#cbe6d0" stroke-width="1.5"/>'+
 '<text x="451" y="624" text-anchor="middle" font-family="system-ui,sans-serif" font-size="17" font-weight="900" fill="#355e48">확대 그림에서 자리 확인</text>'+
 '<text x="451" y="647" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" font-weight="750" fill="#48715b">실제 리코더에도 손가락 올려보기</text>'+
 '</svg>';
 return s;
}
function scene(face,focus,showPosition){
 byId('scene').innerHTML=diagram(face,focus,showPosition);
 byId('scene').classList.remove('demonstrating');
 if(showPosition){
  requestAnimationFrame(function(){requestAnimationFrame(function(){byId('scene').classList.add('demonstrating')})});
 }
}
function setPhase(phase){
 state.phase=phase;
 update();
 window.scrollTo({top:0,behavior:'instant'});
}
function update(){
 var p=state.phase,L=lessons[state.step],isExplore=p==='explore',isDone=p==='done';
 byId('barExplore').className=isExplore?'active': 'done';
 byId('barObserve').className=['observe','real','reward'].includes(p)?'active':isDone?'done':'';
 byId('barActual').className=p==='real'?'active':(p==='reward'||isDone)?'done':'';
 byId('barFinish').className=isDone?'active':'';
 var face=isExplore?state.face:L.face;
 byId('faceName').textContent=face==='front'?'리코더 앞면':'리코더 뒷면';
 byId('visualHint').textContent=isExplore?(face==='front'?'맨 위 구멍(1번) = 왼손 검지 자리':'뒷면 구멍 = 왼손 엄지 자리'):L.short;
 byId('faceGroup').hidden=!isExplore;
 byId('frontButton').setAttribute('aria-pressed',String(face==='front'));
 byId('backButton').setAttribute('aria-pressed',String(face==='back'));
 byId('panelExplore').hidden=!isExplore;
 byId('panelObserve').hidden=!(p==='observe');
 byId('panelReal').hidden=!(p==='real');
 byId('panelReward').hidden=!(p==='reward');
 byId('panelDone').hidden=!isDone;
 byId('stageLabel').textContent=isExplore?'먼저 악기 모양부터 확인해요':isDone?'오늘의 연습 완료':(state.step+1)+' / '+lessons.length+' · '+L.finger;
 var focus=isExplore?(face==='front'?1:0):L.hole,drawHand=isExplore||(p==='real'||p==='reward'||state.demo||p==='done');
 scene(face,focus,drawHand);
 if(isExplore){
   byId('exploreTitle').textContent=face==='front'?'맨 위 1번은 검지 자리!':'뒷구멍은 엄지 자리!';
   byId('exploreDescription').textContent=face==='front'?'입구 아래 첫 구멍이 왼손 검지 자리예요. 화면 속 손가락을 따라 실제 리코더에서도 찾아보자!':'실제 리코더를 돌려 뒷면을 보면 엄지손가락을 놓는 구멍이 하나 있어요.';
   byId('exploreCue').textContent=face==='front'?'입구 아래 맨 위 = 왼손 검지':'리코더 뒤의 구멍 1개 = 왼손 엄지';
   byId('startBtn').textContent='진짜 손가락 연습 시작! →';
 }else if(!isDone){
   for(var id of ['observe','real','reward']){
    byId(id+'Title').textContent=L.title;
    byId(id+'Description').textContent=L.explain;
   }
   byId('observeCue').textContent=L.cue;
   byId('realCue').textContent='실제 리코더를 입구가 위로 오도록 놓고 '+L.finger+'를 같은 자리에 놓아봐요.';
   byId('observeFinger').textContent=L.finger+' 움직임 보기';
   byId('observeTip').textContent=state.demo?'실제 리코더에서도 해볼 차례예요.':'그림의 입구·구멍 위치를 먼저 살펴봐요.';
   byId('rewardEmoji').textContent=L.emoji;
   byId('rewardSub').textContent=state.realStatus[state.step]==='yes'?'화면만 본 게 아니라 실제 리코더에도 손가락을 올려봤네!':'오늘은 위치를 살펴봤어. 실제 악기는 다음에 해도 괜찮아.';
   byId('rewardNext').textContent=state.step===3?'연습 마치기 →':'다음 손가락 →';
 }else{
   byId('doneNumbers').textContent='화면에서 '+(state.step+1)+'개의 손가락 자리를 살펴봤어요.';
   byId('doneAttempts').textContent='실제 리코더에 올려 본 횟수: '+state.realAttempts;
 }
}
function chooseFace(face){
 state.face=face;state.exploredFront=state.exploredFront||face==='front';state.exploredBack=state.exploredBack||face==='back';update();
}
function startLessons(){state.step=0;state.demo=false;state.realAttempts=0;state.realStatus=[];setPhase('observe');}
function nextLesson(){
 if(state.step===lessons.length-1){setPhase('done');return;}
 state.step++;state.demo=false;setPhase('observe');
}
function recordReal(answer){
 if(answer==='yes')state.realAttempts++;
 state.realStatus[state.step]=answer;
 setPhase('reward');
}
function repeatStep(){state.demo=false;setPhase('observe')}
function closeEarly(){setPhase('done')}
byId('frontButton').addEventListener('click',function(){chooseFace('front')});
byId('backButton').addEventListener('click',function(){chooseFace('back')});
byId('startBtn').addEventListener('click',startLessons);
byId('observeFinger').addEventListener('click',function(){state.demo=false;update();state.demo=true;scene(lessons[state.step].face,lessons[state.step].hole,true)});
byId('observeReal').addEventListener('click',function(){state.demo=true;setPhase('real')});
byId('realYes').addEventListener('click',function(){recordReal('yes')});
byId('realLater').addEventListener('click',function(){recordReal('later')});
byId('rewardNext').addEventListener('click',nextLesson);
byId('rewardRepeat').addEventListener('click',repeatStep);
byId('startAgain').addEventListener('click',function(){state.face='front';setPhase('explore')});
byId('readGuide').addEventListener('click',function(){
 var L=lessons[state.step],p=state.phase;
 speak(p==='explore'? (state.face==='front'?'입으로 부는 부분이 위쪽이에요. 앞면 맨 위 구멍이 1번이에요.':'뒷면에는 엄지 구멍이 하나 있어요.'):(p==='done'?'오늘도 리코더를 살펴봤어. 잘했어!':L.explain));
});
byId('voiceToggle').addEventListener('click',function(){state.voice=!state.voice;byId('voiceToggle').textContent=state.voice?'🔊 읽어주기 켜짐':'🔇 읽어주기 꺼짐';if(!state.voice&&window.speechSynthesis)window.speechSynthesis.cancel()});
chooseFace('front');
})();
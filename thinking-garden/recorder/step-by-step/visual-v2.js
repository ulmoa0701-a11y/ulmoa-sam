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
function toolSvg(){
 return '<defs>'+
 '<linearGradient id="fluteGradient" x1="0" x2="1"><stop offset="0" stop-color="#9e7145"/><stop offset=".14" stop-color="#c39a63"/><stop offset=".39" stop-color="#f8e2b3"/><stop offset=".72" stop-color="#eed0a0"/><stop offset="1" stop-color="#b4864e"/></linearGradient>'+
 '<linearGradient id="headGradient" x1="0" x2="1"><stop offset="0" stop-color="#b07e4b"/><stop offset=".4" stop-color="#fbe5bd"/><stop offset=".75" stop-color="#f2d5a4"/><stop offset="1" stop-color="#a87545"/></linearGradient>'+
 '<linearGradient id="fingerSkin" x1="0" x2=".4" y1="0" y2="1"><stop offset="0" stop-color="#fce2cc"/><stop offset=".55" stop-color="#eebc9b"/><stop offset="1" stop-color="#dba785"/></linearGradient>'+
 '<filter id="shadow"><feDropShadow dx="3" dy="7" stdDeviation="5" flood-color="#5d5033" flood-opacity=".23"/></filter>'+
 '<marker id="tipArrow" markerWidth="10" markerHeight="10" refX="5" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="#4b8269"/></marker>'+
 '</defs>'+
 '<g filter="url(#shadow)">'+
 '<path d="M224 132 L284 132 L284 587 Q286 603 298 608 L301 626 Q265 637 204 626 L207 608 Q221 603 222 587 Z" fill="url(#fluteGradient)" stroke="#a78055" stroke-width="3"/>'+
 '<rect x="220" y="128" width="68" height="29" rx="9" fill="url(#headGradient)" stroke="#ac7d4c" stroke-width="3"/>'+
 '<path d="M207 53 Q206 44 217 43 L273 43 Q287 46 290 62 L290 136 Q290 146 279 146 L215 146 Q204 145 204 135 L204 79 Q202 69 207 53" fill="url(#headGradient)" stroke="#956e46" stroke-width="3"/>'+
 '<path d="M206 58 Q243 42 282 58 L281 91 Q246 79 206 93 Z" fill="#d8a975" opacity=".4"/>'+
 '<rect x="220" y="76" width="54" height="12" rx="5" fill="#65492d" stroke="#ae885e" stroke-width="1.5"/>'+
 '<path d="M220 151 Q250 157 285 151" fill="none" stroke="#97714e" stroke-width="3"/>'+
 '<path d="M217 603 Q250 611 290 603" fill="none" stroke="#92704c" stroke-width="3"/>'+
 '<path d="M206 625 Q249 633 300 625" fill="none" stroke="#97714e" stroke-width="3"/>'+
 '</g>';
}
function holesSvg(face){
 if(face==='back'){
  return hole(255,270,17,0,false,false)+
   '<path d="M253 326 L253 592" stroke="#fff1d0" stroke-opacity=".3" stroke-width="4"/>';
 }
 var out='';
 for(var i=1;i<=5;i++){out+=hole(254,holeYs[i],i===1?17:15,i,false,false)}
 // On soprano recorders the bottom two finger locations comprise paired small holes.
 for(var j=6;j<=7;j++){
  out+=hole(245,holeYs[j],9,j,false,false)+hole(266,holeYs[j]+2,7,j,false,false);
 }
 return out;
}
function labelsSvg(face,focus){
 var items='<g font-family="system-ui, sans-serif">';
 items+='<rect x="17" y="38" rx="13" width="151" height="42" fill="#fffdf4" stroke="#dbe8d9" stroke-width="2"/>'+
 '<text x="29" y="65" font-size="15" font-weight="850" fill="#315947">입으로 부는 곳</text>'+line(169,62,205,74);
 if(face==='back'){
  items+='<rect x="326" y="238" rx="13" width="142" height="61" fill="#fffdf6" stroke="#dce5d6" stroke-width="2"/>'+
  '<text x="337" y="263" font-size="15" font-weight="850" fill="#315947">뒷구멍</text>'+
  '<text x="337" y="284" font-size="12" font-weight="750" fill="#64776b">엄지가 가는 자리</text>'+line(324,269,277,269);
 }else{
  items+='<text x="351" y="202" font-size="12" font-weight="800" fill="#456d58">위에서 아래로</text>'+
  '<path d="M353 213 L353 357" stroke="#8da99a" stroke-width="3" stroke-linecap="round" marker-end="url(#tipArrow)"/>';
  for(var i=1;i<=5;i++){
   items+='<text x="296" y="'+(holeYs[i]+5)+'" font-size="15" font-weight="'+(i<=3?'900':'650')+'" fill="'+(i<=3?'#345c43':'#809486')+'">'+i+'번</text>';
  }
  items+='<text x="296" y="536" font-size="14" fill="#809486">6번</text><text x="296" y="579" font-size="14" fill="#809486">7번</text>';
 }
 if(focus==='mouth'){
  items+='<circle cx="249" cy="83" r="45" fill="none" stroke="#e5aa59" stroke-width="7" stroke-dasharray="13 8"/>';
 }
 items+='</g>';
 return items;
}
function fingerImage(target,face){
 if(target===null||target===undefined)return '';
 var cx=face==='back'?255:254;
 var cy=face==='back'?270:holeYs[target];
 var starts={0:280,1:300,2:347,3:394};
 var sy=starts[target]||300;
 var ghost='';
 if(face==='front'&&target>1){
  for(var f=1;f<target;f++){
   var fromY=starts[f],endY=holeYs[f];
   ghost+='<path d="M92 '+(fromY+14)+' Q150 '+(fromY+2)+' 190 '+(endY+12)+' Q216 '+endY+' 249 '+endY+'" fill="none" stroke="#c79a78" stroke-width="25" opacity=".34" stroke-linecap="round"/>';
  }
 }
 return '<g class="finger-group finger-shadow" aria-hidden="true">'+ghost+
 '<path d="M63 410 C96 392 119 353 128 326 C138 308 146 304 165 303" fill="none" stroke="#d3a17d" stroke-width="63" opacity=".3" stroke-linecap="round"/>'+
 '<path d="M90 '+sy+' Q146 '+(sy-7)+' 185 '+(cy+8)+' Q216 '+cy+' '+(cx-4)+' '+cy+'" stroke="#a8785e" stroke-width="33" stroke-linecap="round" fill="none"/>'+
 '<path d="M88 '+(sy-4)+' Q143 '+(sy-11)+' 184 '+(cy+4)+' Q219 '+(cy-4)+' '+(cx-4)+' '+(cy-4)+'" stroke="url(#fingerSkin)" stroke-width="28" stroke-linecap="round" fill="none"/>'+
 '<ellipse cx="'+(cx-3)+'" cy="'+(cy-3)+'" rx="14" ry="13" fill="#eec1a6"/>'+
 '<path d="M'+(cx-17)+' '+(cy-4)+' Q'+(cx-2)+' '+(cy-17)+' '+(cx+10)+' '+(cy-4)+'" fill="none" stroke="#b88770" stroke-width="1.4" opacity=".6"/>'+
 '</g>';
}
function glow(target,face){
 if(target===null||target===undefined)return '';
 var y=face==='back'?270:holeYs[target];
 return '<g class="target-ring" transform-origin="254px '+y+'px"><circle cx="254" cy="'+y+'" r="38" fill="none" stroke="#e8ae62" stroke-width="5" stroke-dasharray="9 7"/></g>';
}
function scene(face,focus,showHand){
 var chosen=(typeof focus==='number')?focus:null;
 var art='<svg viewBox="0 0 500 680" role="img" aria-label="'+(face==='front'?'실제 소프라노 리코더 앞면과 구멍 순서':'실제 소프라노 리코더 뒷면과 엄지 구멍')+'" xmlns="http://www.w3.org/2000/svg">'+
 toolSvg()+holesSvg(face)+labelsSvg(face,focus)+glow(chosen,face)+(showHand?fingerImage(chosen,face):'')+
 '<text x="253" y="662" text-anchor="middle" font-size="13" font-weight="800" fill="#728e79">소프라노 리코더 · 세로 방향</text></svg>';
 byId('scene').innerHTML=art;
 byId('scene').classList.remove('demonstrating');
 if(showHand){
  // Double animation-frame forces transition after SVG injection.
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
 byId('visualHint').textContent=isExplore?(face==='front'?'입구 바로 아래에서 앞구멍이 시작돼요.':'뒷면에는 엄지 구멍 하나가 있어요.'):L.short;
 byId('faceGroup').hidden=!isExplore;
 byId('frontButton').setAttribute('aria-pressed',String(face==='front'));
 byId('backButton').setAttribute('aria-pressed',String(face==='back'));
 byId('panelExplore').hidden=!isExplore;
 byId('panelObserve').hidden=!(p==='observe');
 byId('panelReal').hidden=!(p==='real');
 byId('panelReward').hidden=!(p==='reward');
 byId('panelDone').hidden=!isDone;
 byId('stageLabel').textContent=isExplore?'먼저 악기 모양부터 확인해요':isDone?'오늘의 연습 완료':(state.step+1)+' / '+lessons.length+' · '+L.finger;
 var focus=isExplore?null:L.hole,drawHand=!isExplore&&(p==='real'||p==='reward'||state.demo||p==='done');
 scene(face,focus,drawHand);
 if(isExplore){
   byId('exploreTitle').textContent=face==='front'?'앞에는 구멍이 7개 있어!':'뒤에는 엄지 구멍이 1개 있어!';
   byId('exploreDescription').textContent=face==='front'?'입으로 부는 부분이 위쪽이에요. 그 아래 맨 위 구멍부터 1번, 2번, 3번 순서예요.':'리코더를 뒤집어 보면 엄지가 닿는 구멍이 하나 있어요. 앞면과 혼동하지 않아도 돼요.';
   byId('exploreCue').textContent=face==='front'?'입구 → 맨 위 구멍(1번) → 그 아래(2번)':'뒤에 있는 1개의 구멍 = 왼손 엄지 자리';
   byId('startBtn').textContent='손가락 놓는 연습 시작하기 →';
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
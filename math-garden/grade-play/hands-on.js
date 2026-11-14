/* 일단해봄 초등 수학: 개념별 조작 도구.
 * 2022 개정 주요 주제에 맞춘 자체 활동이며 성취도 진단·치료 효과 판정이 아니다.
 * Keyboard + touch buttons work; no network, account, timer, or tracking.
 */
(function(root){'use strict';
const rand=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pick=x=>x[rand(0,x.length-1)];
const inSet=(m,list)=>list.split(' ').includes(m);
const family=(mode,answer='')=>{
 if(mode==='count')return 'count';
 if(inSet(mode,'divide groupDiv remainder'))return 'share';
 if(inSet(mode,'groupMult times'))return 'groups';
 if(inSet(mode,'fractionParts fracDecimal fracCompare fracEquivalent fracAdd fracSub fracUnlike fracUnlikeSub fractionKinds fractionMix'))return 'fraction';
 if(inSet(mode,'angles anglesMeasure angleSum rightAngle'))return 'angle';
 if(inSet(mode,'clock elapsed'))return 'clock';
 if(inSet(mode,'chart pictograph barGraph lineChart lineChange pieChart tableRead graphChoice'))return 'graph';
 if(inSet(mode,'tens50 tens100 tens hundreds thousands placeValue placeValue4'))return 'place';
 if(inSet(mode,'numberLine numberLine50 numberLine100 numberOrder numberOrder50 numberOrder100 numberOrder999 numberOrder4 numberOrderBig compare'))return 'line';
 if(inSet(mode,'pattern patternShapes'))return 'pattern';
 if(inSet(mode,'reflection'))return 'symmetry';
 if(mode==='rotation')return 'spin';
 if(inSet(mode,'transformation2d transformation'))return 'move';
 if(inSet(mode,'symmetry pointSym'))return 'symmetry';
 if(inSet(mode,'shape2d shape3d shapeMatch shape3dObject shape3dClass polygonSides triangles triangleClass shapeQuadrilaterals quadrilateral regularPolygon diagonals congruence prism netCube solids faces shapeViews solidProperties boxEdges cubes'))return 'shape';
 if(inSet(mode,'circleParts circleRadius circleDiameter'))return 'circle';
 if(inSet(mode,'capacity weight unitConvert'))return 'units';
 if(inSet(mode,'ruler length lengthCompare'))return 'measure';
 return /^[-\d,.]+(?:cm|m|g|kg|mL|L|분|개|상자|cm²|cm³|m³|%)?$/.test(String(answer)) ? 'build' : 'write';
};
const h=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el};
const btn=(text,click,cls='hands-button')=>{const b=h('button',cls,text);b.type='button';b.addEventListener('click',click);return b};
const visual=(type,d)=>{if(type==='fraction'){const n=d.n||0,den=d.d||4;return '<div class="hands-fraction-bar">'+Array.from({length:den},(_,i)=>'<span class="'+(i<n?'filled':'')+'"></span>').join('')+'</div>'}
 if(type==='angle'){const a=d.angle||0,r=a*Math.PI/180;return '<svg class="hands-angle-svg" viewBox="0 0 240 150" role="img" aria-label="만든 각의 모습"><path d="M108 125H214 M108 125L'+(108+105*Math.cos(r)).toFixed(1)+' '+(125-105*Math.sin(r)).toFixed(1)+'" stroke="#417b61" stroke-width="6" stroke-linecap="round" fill="none"/><circle cx="108" cy="125" r="5" fill="#d58a5b"/><text x="116" y="115" font-size="14" fill="#5c7d61">'+a+'°</text></svg>'}
 if(type==='clock'){const hour=d.hour||12,minute=d.minute||0,hr=(hour%12+minute/60)*Math.PI/6,mi=minute*Math.PI/30;return '<svg class="hands-clock-svg" viewBox="0 0 210 210" role="img" aria-label="조작한 시계"><circle cx="105" cy="105" r="91" fill="#fffaf0" stroke="#6b9d7c" stroke-width="6"/>'+Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return '<text x="'+(105+75*Math.sin(a)).toFixed(1)+'" y="'+(110-75*Math.cos(a)).toFixed(1)+'" text-anchor="middle" font-size="16" fill="#35684b">'+(i||12)+'</text>'}).join('')+'<path d="M105 105L'+(105+51*Math.sin(hr)).toFixed(1)+' '+(105-51*Math.cos(hr)).toFixed(1)+'" stroke="#365b45" stroke-width="8" stroke-linecap="round"/><path d="M105 105L'+(105+65*Math.sin(mi)).toFixed(1)+' '+(105-65*Math.cos(mi)).toFixed(1)+'" stroke="#c67c5b" stroke-width="5" stroke-linecap="round"/></svg>'}
 return ''};
function buildMode(kind,mode,p){
 if(kind==='share'){const n=rand(7,19),boxes=rand(2,4),remainder=mode==='remainder'?rand(1,boxes-1):0,total=mode==='remainder'?boxes*rand(2,4)+remainder:boxes*rand(2,4);
 return {kind:'share',question:total+'개의 도토리를 '+boxes+'명에게 똑같이 나눠 주자.',hint:'한 명씩 돌아가면서 하나씩 담으면 공평해져.',total,boxes,remainder:mode==='remainder'?total%boxes:0,answer:Math.floor(total/boxes)};}
 if(kind==='groups'){const groups=rand(2,4),per=rand(2,6);return {kind:'groups',question:groups+'개 바구니에 '+per+'개씩 담아 보자.',hint:'바구니마다 개수가 같은지 살펴봐.',groups,per,answer:groups*per};}
 if(kind==='graph'){const data=Array.from({length:3},()=>rand(1,8));return {kind:'graph',question:'조사표와 똑같은 막대그래프를 직접 만들어 보자.',hint:'왼쪽 표의 숫자만큼 막대를 높여 봐.',data,answer:data.join(',')};}
 if(kind==='clock'){const hour=rand(1,11),minute=pick([0,30]),elapsed=mode==='elapsed',plus=30;const targetHour=elapsed?(minute===30?hour+1:hour):hour,targetMinute=elapsed?(minute===30?0:30):minute;return {kind:'clock',question:elapsed?'시계에서 30분 뒤의 시각을 직접 만들어 보자.':'모아의 시계와 똑같은 시각을 만들어 보자.',hint:elapsed?'긴 바늘을 반 바퀴 움직이면 30분이야.':'짧은 바늘은 시, 긴 바늘은 분을 나타내.',hour:targetHour,minute:targetMinute,startHour:hour,startMinute:minute,elapsed,answer:targetHour+'|'+targetMinute};}
 if(kind==='angle'){let angle=mode==='rightAngle'?90:mode==='angles'?pick([30,60,90,120,150]):rand(2,12)*15;let a=null,b=null;if(mode==='angleSum'){a=rand(3,8)*10;b=rand(2,6)*10;angle=a+b;}return {kind:'angle',question:a? a+'°와 '+b+'°를 합친 각을 만들어 보자.':angle+'° 각을 직접 만들어 보자.',hint:'90°는 직각, 더 작으면 예각, 더 크면 둔각이야.',angle,first:a,second:b,answer:angle};}
 if(kind==='fraction'){
  const den=pick([3,4,5,6]);let numer=rand(1,den-1),task='parts',other=0,first=0;
  if(inSet(mode,'fracAdd fracUnlike')){task='add';first=rand(1,2);other=rand(1,den-first-1);numer=first+other}
  else if(inSet(mode,'fracSub fracUnlikeSub')){task='sub';first=rand(2,den-1);other=rand(1,first-1);numer=first-other}
  else if(mode==='fracEquivalent'){task='equivalent';first=numer;other=den;numer*=2;return {kind:'fraction',task,question:first+'/'+den+'과 크기가 같은 분수를 만들자. 전체 칸을 두 배로 나누었어.',hint:'칸 수를 2배로 나누면 색칠할 칸 수도 2배야.',den:den*2,numer,first,originalDen:den,answer:numer}}
  else if(mode==='fracCompare'){task='compare';first=rand(1,den-2);other=rand(first+1,den-1);numer=other}
  else if(mode==='fractionKinds'||mode==='fractionMix'){task='improper';numer=den+rand(1,den-1);return {kind:'fraction',task,question:den+'칸짜리 한 판을 먼저 채우고, '+(numer-den)+'칸을 더 색칠해서 가분수를 만들어 보자.',hint:'한 판을 모두 채워도 끝이 아니야. 분자가 분모보다 큰 분수야.',den:den*2,denPerWhole:den,numer,answer:numer}}
  const question=task==='add'?first+'/'+den+' + '+other+'/'+den+'을 그림으로 합쳐 보자.':task==='sub'?first+'/'+den+' − '+other+'/'+den+'의 남은 양을 만들자.':task==='compare'?first+'/'+den+'와 '+other+'/'+den+'를 비교해 더 큰 분수를 색칠해 보자.':'전체 '+den+'칸 중 '+numer+'칸을 색칠해서 '+numer+'/'+den+'을 만들어 보자.';
  return {kind:'fraction',task,question,hint:'같은 크기의 조각을 보고 분자만큼 색칠해 보자.',den,numer,first,other,answer:numer};
 }
 if(kind==='circle'){const radius=rand(2,9);
  if(mode==='circleParts'){const part=pick(['중심','반지름','지름']);return {kind:'circle',part,question:'원의 '+part+'에 해당하는 곳을 그림에서 눌러 봐.',hint:'가운데 점은 중심, 가운데부터 테두리는 반지름, 양쪽 끝을 잇는 선은 지름이야.',answer:part}}
  if(mode==='circleRadius')return {kind:'circle',part:'반지름',question:'지름이 '+(radius*2)+'cm인 원의 반지름을 만들어 보자.',hint:'반지름 두 개 길이가 지름과 같아.',radius,answer:radius};
  return {kind:'circle',part:'지름',question:'반지름이 '+radius+'cm인 원의 지름을 만들어 보자.',hint:'반지름을 두 배 하면 지름이야.',radius,answer:radius*2};
 }
 if(kind==='units'){const liter=mode==='capacity',big=rand(1,4),small=rand(1,8)*100,unit=liter?'L':'kg',minor=liter?'mL':'g';return {kind:'units',question:big+unit+' '+small+minor+'을 직접 계량해서 만들어 보자.',hint:'1'+unit+'은 1000'+minor+'이야.',big,small,unit,minor,answer:big*1000+small}}
 if(kind==='move'){const x=rand(1,3),y=rand(1,3),dx=rand(1,2),dy=mode==='transformation2d'?0:rand(0,2);return {kind:'move',question:'꽃을 오른쪽으로 '+dx+'칸'+(dy?' 위로 '+dy+'칸':'')+' 이동시켜 보자.',hint:'오른쪽은 한 칸씩 오른쪽, 위는 한 줄 위로 움직여.',x,y,dx,dy,answer:(x+dx)+'|'+(y+dy)};}
 if(kind==='pattern'){const step=rand(2,7),start=rand(1,11);return {kind:'pattern',question:'수의 규칙을 찾아 빈칸을 완성하자.',hint:'앞의 수에서 매번 얼마씩 커지는지 살펴봐.',start,step,answer:start+step*4};}
 if(kind==='line'){const start=rand(0,10),step=rand(1,5),target=start+step*rand(1,7);return {kind:'line',question:'수직선에서 '+target+'을 찾아 표시해 보자.',hint:'시작점부터 같은 간격으로 한 칸씩 세어 봐.',start,step,target,answer:target};}
 if(kind==='count'){const count=rand(2,9);return {kind:'count',question:'도토리를 세고 같은 개수를 열 칸 틀에 채워 보자.',hint:'왼쪽부터 하나씩 누르면서 개수를 맞춰 봐.',count,answer:count};}
 if(kind==='place'){const labels=inSet(mode,'thousands placeValue4')?['천','백','십','일']:inSet(mode,'hundreds placeValue')?['백','십','일']:['십','일'];const places=labels.map((label,i)=>({label,value:i===0?rand(1,label==='십'&&mode==='tens50'?5:8):rand(0,9)}));if(mode==='tens50'&&places[0].value===5)places[1].value=0;if(mode==='tens100'&&places[0].value===8)places[1].value=rand(0,9);const multipliers={천:1000,백:100,십:10,일:1};const answer=places.reduce((n,x)=>n+x.value*multipliers[x.label],0);return {kind:'place',question:places.map(x=>x.label+' '+x.value+'개').join(', ')+'를 직접 만들어 보자.',hint:'한 자리씩 세면서 각 자릿값을 맞춰 보자.',places,answer};}
 if(kind==='measure'){const target=rand(2,15);return {kind:'measure',question:'자 위에서 '+target+'cm 위치에 표시를 놓자.',hint:'0부터 눈금을 한 칸씩 따라가 봐.',target,answer:target};}
 if(kind==='symmetry'){const point=mode==='pointSym';return {kind:'symmetry',point,question:point?'그림을 가운데 점 기준으로 반 바퀴 돌리면 꽃은 어디로 갈까?':'세로 대칭선 반대편에 같은 위치의 꽃을 심어 보자.',hint:point?'가로와 세로 위치 모두 중심의 반대편으로 옮겨.':'대칭선을 기준으로 같은 거리만큼 반대쪽에 있어야 해.',x:rand(0,1),y:rand(0,3),answer:'mirror'}}
 if(kind==='spin'){const turns=pick([90,180,270]);return {kind:'spin',question:'위쪽 화살표를 시계 방향으로 '+turns+'° 돌려 보자.',hint:'90°는 네 방향 중 한 칸, 180°는 반 바퀴야.',turns,answer:turns}}

 if(kind==='shape'){const solids=inSet(mode,'shape3d shape3dObject shape3dClass prism netCube solids faces shapeViews solidProperties boxEdges cubes');if(solids){const types=[['상자 모양','📦'],['둥근기둥 모양','🥫'],['공 모양','⚽']];const [name,emoji]=pick(types);return {kind:'shape',solid:true,question:'어떤 입체 모양인지 살펴보고 그림 카드를 모양 바구니에 넣자.',hint:'평평한 면과 둥근 면, 꼭짓점을 비교해 보자.',name,emoji,answer:name}}
 const types=[['세모',3],['네모',4],['오각형',5],['육각형',6]];const [name,sides]=pick(types);return {kind:'shape',question:'변이 '+sides+'개인 도형을 찾아 모양 바구니로 보내자.',hint:'그림 테두리의 변을 하나씩 세어 봐.',sides,name,answer:name};}
 return {kind:kind==='write'?'write':'build',question:p.question,hint:p.hint,answer:p.answer,art:p.art};
}
const typeDescriptions={
count:'수 세기·일대일 대응',share:'하나씩 공평하게 나누기',groups:'같은 수씩 묶기',
graph:'표에서 그래프 만들기',clock:'시계 바늘 움직이기',angle:'각도 직접 만들기',
fraction:'분수 조각 색칠하기',move:'격자에서 이동하기',pattern:'수 규칙 찾기',
line:'수직선 눈금 찾기',place:'십과 낱개 묶기',measure:'자로 길이 표시하기',
shape:'모양 구성·분류하기',symmetry:'대칭·점대칭 꽃 심기',spin:'화살표를 실제로 회전시키기',circle:'원 구성·반지름·지름',units:'들이와 무게 직접 계량',build:'그림 보고 답 만들기',write:'생각한 답을 직접 쓰기'};
root.MoaHandsOnCore=Object.freeze({family,buildMode,visual,typeDescriptions,h,btn});
})(window);

/* Manipulative UI for elementary maths. Buttons, not four-choice quizzes. */
(function(root){'use strict';
const Core=root.MoaHandsOnCore;
if(!Core)return;
const {family,buildMode,visual,typeDescriptions,h,btn}=Core;
const norm=v=>String(v).trim().replaceAll(',','').replace(/\s+/g,' ').toLowerCase();
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
let current=null;
function render({mode,problem,round,container,onSolved,onWrong,onSupport,setScene}){
 const kind=family(mode,problem.answer),scene=buildMode(kind,mode,problem);
 const phase=['model','guided','independent','transfer','review'][Math.max(0,Math.min(4,round))];
 container.replaceChildren();
 const main=h('section','hands-shell');main.dataset.kind=kind;main.dataset.phase=phase;
 const head=h('div','hands-head');
 head.append(h('span','hands-category',typeDescriptions[scene.kind]||'직접 해결하기'));
 head.append(h('span','hands-phase',({model:'① 먼저 살펴보기',guided:'② 함께 해보기',independent:'③ 혼자 해보기',transfer:'④ 다른 문제에 적용',review:'⑤ 다시 확인하기'})[phase]));
 main.append(head);
 const label=h('p','hands-directions',phase==='model'?'모아가 먼저 보여줄게. 어떻게 하는지 살펴보고 다음으로 가자.':'직접 눌러서 만들고, 다 되었으면 ‘확인하기’를 눌러 줘.');
 main.append(label);
 const work=h('div','hands-work');main.append(work);
 const actions=h('div','hands-actions');main.append(actions);
 container.append(main);
 let active=true,tries=0;
 const support=()=>{onSupport?.()};
 const success=()=>{if(!active)return;active=false;onSolved?.({phase,assisted:phase==='model'||phase==='guided'||tries>0})};
 const fail=()=>{tries++;onWrong?.('조금 달라. 그림과 수를 다시 확인해 보자.');};
 function check(get){actions.append(btn('내가 만든 것 확인하기',()=>{if(!active)return;if(get()){success()}else{fail()}},'hands-check'))}
 function preset(help){actions.append(btn('시범 한 번 더 보기',()=>{support();help()},'hands-help'))}
 function modelAnswer(){
   const m=h('div','hands-model');
   const note=h('p','', '모아의 시범');
   m.append(note);
   if(scene.kind==='fraction')m.insertAdjacentHTML('beforeend',visual('fraction',{n:scene.numer,d:scene.den}));
   else if(scene.kind==='angle')m.insertAdjacentHTML('beforeend',visual('angle',{angle:scene.angle}));
   else if(scene.kind==='clock')m.insertAdjacentHTML('beforeend',visual('clock',{hour:scene.hour,minute:scene.minute}));
   else if(scene.kind==='share')m.append(h('p','hands-explain',Array.from({length:scene.boxes},()=>scene.answer+'개').join(' · ')+' / 남은 것 '+scene.remainder+'개'));
   else if(scene.kind==='groups')m.append(h('p','hands-explain',scene.groups+'묶음 × '+scene.per+'개 = '+scene.answer+'개'));
   else if(scene.kind==='graph')m.append(h('p','hands-explain','표의 숫자만큼 막대 높이: '+scene.data.join(' · ')));
   else if(scene.kind==='place')m.append(h('p','hands-explain',scene.places.map(x=>x.label+' '+x.value+'개').join(' · ')+' → '+scene.answer));
   else if(scene.kind==='count')m.append(h('p','hands-explain','도토리를 하나씩 짚으면서 '+scene.count+'개 세어 봐.'));
   else if(scene.kind==='move')m.append(h('p','hands-explain','오른쪽 '+scene.dx+'칸, 위 '+scene.dy+'칸 움직이면 목적지야.'));
   else if(scene.kind==='line')m.append(h('p','hands-explain','시작점부터 한 칸씩 같은 간격으로 이동해.'));
   else if(scene.kind==='measure')m.append(h('p','hands-explain','자에서 0을 찾고 '+scene.target+'cm만큼 이동해.'));
   else if(scene.kind==='pattern')m.append(h('p','hands-explain','매번 '+scene.step+'씩 커져. 규칙은 '+scene.answer+'에서 계속돼.'));
   else if(scene.kind==='symmetry')m.append(h('p','hands-explain',scene.point?'중심점을 기준으로 반 바퀴 돌린 반대쪽 자리에 꽃을 놓아.':'대칭선 기준으로 같은 거리의 오른쪽 칸에 꽃을 심어.'));
   else if(scene.kind==='spin')m.append(h('p','hands-explain','위쪽 화살표를 시계 방향으로 '+scene.turns+'° 돌리면 돼.'));
   else if(scene.kind==='circle')m.append(h('p','hands-explain',typeof scene.answer==='string'?'원의 '+scene.part+' 부분을 찾아보자.':'원의 '+scene.part+' 길이는 '+scene.answer+'cm야.'));
   else if(scene.kind==='units')m.append(h('p','hands-explain',scene.big+scene.unit+' + '+scene.small+scene.minor+' = '+scene.answer+scene.minor));
   else if(scene.kind==='shape')m.append(h('p','hands-explain',scene.solid?'평평한 면과 둥근 부분을 살펴보면 '+scene.name+'이야.':'변을 하나씩 세면 '+scene.sides+'개. '+scene.name+'이야.'));
   else m.append(h('p','hands-explain',problem.question+' → '+problem.answer));
   m.append(h('p','hands-small',scene.hint||problem.hint||'한 번 더 천천히 확인해 보자.'));
   work.append(m);
 }
 if(phase==='model'){
    setScene?.(scene.question,scene.kind==='write'||scene.kind==='build'?scene.art:'');
    modelAnswer();
    actions.append(btn('나도 해볼래요 →',success,'hands-check'));
    current={kind,scene,phase};
    return {kind,phase,scene};
 }
 setScene?.(scene.question,scene.kind==='write'||scene.kind==='build'?scene.art:'');
 const say=x=>{const p=h('p','hands-small',x);work.append(p);return p};
 const addStepper=(row,caption,onMinus,onPlus)=>{const wrap=h('div','hands-stepper');const minus=btn('−',onMinus,'hands-step');minus.setAttribute('aria-label',caption+' 하나 줄이기');const val=h('strong','hands-step-value',caption);const plus=btn('+',onPlus,'hands-step');plus.setAttribute('aria-label',caption+' 하나 늘리기');wrap.append(minus,val,plus);row.append(wrap);return {val,minus,plus}};
 const addScene=(html)=>{const el=h('div','hands-visual');el.innerHTML=html;work.append(el);return el};
 const guide=()=>{if(phase==='guided')say('모아와 함께 하나씩 움직여 보자. 정답이 아니어도 다시 해볼 수 있어.')};
 if(scene.kind==='count'){
   let selected=new Set();
   say('도토리를 세어 보고 빈칸을 같은 개수만큼 채워 줘.');
   const dots=h('div','hands-prompt-seeds','🌰 '.repeat(scene.count).trim());work.append(dots);
   const grid=h('div','hands-tenframe');work.append(grid);
   const update=()=>{grid.replaceChildren();for(let i=0;i<10;i++){const b=btn(selected.has(i)?'🌰':'·',()=>{selected.has(i)?selected.delete(i):selected.add(i);update()},'hands-cell');b.setAttribute('aria-label',(i+1)+'번째 칸 '+(selected.has(i)?'채워짐':'비어 있음'));b.setAttribute('aria-pressed',String(selected.has(i)));grid.append(b)}};
   update();guide();check(()=>selected.size===scene.count);preset(()=>{selected=new Set(Array.from({length:scene.count},(_,i)=>i));update()});
 }else if(scene.kind==='share'){
   const boxes=Array(scene.boxes).fill(0);let rest=scene.total;
   say('한 친구에게 한 개씩 나눠 줘. 바구니를 누르면 담기고, −를 누르면 되돌릴 수 있어.');
   const info=h('p','hands-left');work.append(info);
   const board=h('div','hands-baskets');work.append(board);
   const update=()=>{info.textContent='남은 도토리 '+rest+'개 / '+scene.total+'개';board.replaceChildren();
    boxes.forEach((n,i)=>{const slot=h('div','hands-basket');slot.append(h('span','hands-basket-title',(i+1)+'번 친구'));slot.append(btn('🧺 '+('🌰'.repeat(Math.min(8,n)))+' '+n+'개',()=>{if(rest===0)return;boxes[i]++;rest--;update()},'hands-basket-add'));slot.append(btn('− 되돌리기',()=>{if(boxes[i]){boxes[i]--;rest++;update()}},'hands-undo'));board.append(slot)})};
   update();guide();check(()=>boxes.every(n=>n===scene.answer)&&rest===scene.remainder);preset(()=>{boxes.fill(scene.answer);rest=scene.remainder;update()});
 }else if(scene.kind==='groups'){
   const boxes=Array(scene.groups).fill(0),board=h('div','hands-baskets');work.append(board);
   say('한 바구니씩 눌러 같은 개수의 열매를 만들어.');
   const update=()=>{board.replaceChildren();boxes.forEach((n,i)=>{const slot=h('div','hands-basket');slot.append(h('span','hands-basket-title',(i+1)+'번 바구니'));slot.append(btn('🍎 '+n+'개',()=>{if(boxes[i]<12){boxes[i]++;update()}},'hands-basket-add'));slot.append(btn('−',()=>{if(boxes[i]){boxes[i]--;update()}},'hands-undo'));board.append(slot)})};
   update();guide();check(()=>boxes.every(x=>x===scene.per));preset(()=>{boxes.fill(scene.per);update()});
 }else if(scene.kind==='fraction'){
   const chosen=new Set(),bar=h('div','hands-fraction-bar');work.append(bar);
   if(scene.task==='add'||scene.task==='sub')say('먼저 '+scene.first+'/'+scene.den+'과 '+scene.other+'/'+scene.den+'을 보고, 결과만큼 색칠해 보자.');
   else if(scene.task==='compare')say('두 분수를 비교해 더 큰 쪽을 그림으로 만들어 보자.');
   else if(scene.task==='equivalent')say('원래 분수와 같은 양이 되도록 두 배로 나눈 칸을 색칠해 보자.');
   else if(scene.task==='improper')say('한 판을 가득 채우고, 나머지까지 색칠해 보자.');
   else say('아래 조각을 하나씩 눌러 색칠해 봐. 다시 누르면 색칠이 사라져.');
   if(['add','sub','compare','equivalent'].includes(scene.task)){
     const given=h('div','hands-given-fractions');
     if(scene.task==='equivalent'){given.innerHTML='<div><strong>원래 분수 '+scene.first+'/'+scene.originalDen+'</strong>'+visual('fraction',{n:scene.first,d:scene.originalDen})+'</div>'}
     else given.innerHTML='<div><strong>첫 번째 '+scene.first+'/'+scene.den+'</strong>'+visual('fraction',{n:scene.first,d:scene.den})+'</div><div><strong>'+({add:'더할 분수',sub:'뺄 분수',compare:'비교할 분수'})[scene.task]+' '+scene.other+'/'+scene.den+'</strong>'+visual('fraction',{n:scene.other,d:scene.den})+'</div>';
     work.append(given);
   }
   const count=h('p','hands-left');work.append(count);
   const update=()=>{bar.replaceChildren();for(let i=0;i<scene.den;i++){const cell=btn(chosen.has(i)?'●':'',()=>{chosen.has(i)?chosen.delete(i):chosen.add(i);update()},'hands-frac-cell'+(chosen.has(i)?' filled':''));cell.setAttribute('aria-label',(i+1)+'번째 분수 칸');cell.setAttribute('aria-pressed',String(chosen.has(i)));bar.append(cell)}count.textContent='전체 '+scene.den+'칸 중 '+chosen.size+'칸 색칠했어.'};
   update();guide();check(()=>chosen.size===scene.numer);preset(()=>{chosen.clear();for(let i=0;i<scene.numer;i++)chosen.add(i);update()});
 }else if(scene.kind==='clock'){
   let hour=12,minute=0;
   say('시침과 분침을 바꿔서 같은 시각을 만들어 봐.');
   const target=addScene('<p class="hands-small">'+(scene.elapsed?'현재 시각에서 30분 뒤를 만들어 봐':'모아가 보여주는 시각')+'</p>'+visual('clock',{hour:scene.elapsed?scene.startHour:scene.hour,minute:scene.elapsed?scene.startMinute:scene.minute}));
   const mine=addScene('<p class="hands-small">내가 만든 시각</p>');
   const row=h('div','hands-steppers');work.append(row);
   const update=()=>{mine.innerHTML='<p class="hands-small">내가 만든 시각</p>'+visual('clock',{hour,minute});stepH.val.textContent=hour+'시';stepM.val.textContent=minute+'분'};
   const stepH=addStepper(row,'시',()=>{hour=hour===1?12:hour-1;update()},()=>{hour=hour===12?1:hour+1;update()});
   const stepM=addStepper(row,'분',()=>{minute=minute===0?30:0;update()},()=>{minute=minute===30?0:30;update()});update();guide();
   check(()=>hour===scene.hour&&minute===scene.minute);preset(()=>{hour=scene.hour;minute=scene.minute;update()});
 }else if(scene.kind==='angle'){
   say('바늘을 움직여 각을 맞춰 봐. 손가락으로 밀거나 ◀ ▶를 눌러도 돼.');
   let angle=0;const picture=addScene(''),slider=h('input','hands-range');slider.type='range';slider.min='0';slider.max='180';slider.step='5';slider.value='0';slider.setAttribute('aria-label','각도 조절');
   const label=h('p','hands-left');const row=h('div','hands-steppers');
   const update=()=>{slider.value=String(angle);picture.innerHTML=visual('angle',{angle});label.textContent='지금 만든 각: '+angle+'°';};
   slider.addEventListener('input',()=>{angle=+slider.value;update()});
   row.append(btn('◀ 5°',()=>{angle=Math.max(0,angle-5);update()},'hands-step'),slider,btn('5° ▶',()=>{angle=Math.min(180,angle+5);update()},'hands-step'));work.append(row,label);update();guide();
   check(()=>Math.abs(angle-scene.angle)<=5);preset(()=>{angle=scene.angle;update()});
 }else if(scene.kind==='graph'){
   const data=Array(3).fill(0);
   say('조사표의 수만큼 각 그래프의 막대를 쌓아 줘.');
   const names=['토끼','곰','여우'];
   const table=h('div','hands-data-table');
   names.forEach((n,i)=>{const line=h('p','',n+' : '+scene.data[i]+'개');table.append(line)});
   work.append(table);
   const area=h('div','hands-graph');work.append(area);
   const update=()=>{area.replaceChildren();data.forEach((v,i)=>{const col=h('div','hands-graph-col');col.append(h('strong','',names[i]));const track=h('div','hands-graph-track');for(let y=9;y>=1;y--){const seg=h('div','hands-graph-segment'+(y<=v?' active':''));track.append(seg)}col.append(track);col.append(h('b','',v+'개'));col.append(btn('＋',()=>{data[i]=Math.min(9,data[i]+1);update()},'hands-step'));col.append(btn('−',()=>{data[i]=Math.max(0,data[i]-1);update()},'hands-step'));area.append(col)})};
   update();guide();check(()=>data.every((v,i)=>v===scene.data[i]));preset(()=>{scene.data.forEach((v,i)=>data[i]=v);update()});
 }else if(scene.kind==='circle'){
   if(typeof scene.answer==='string'){
     say('원의 그림에서 알맞은 부분을 직접 눌러 표시해 보자.');
     let chosen=null;
     const diagram=h('div','hands-circle-select');
     const svg='<svg viewBox="0 0 260 260" width="265" style="max-width:100%" role="img" aria-label="원, 중심점, 반지름과 지름을 선택하는 그림">'+
     '<circle cx="130" cy="130" r="100" fill="#f4fbef" stroke="#467a5d" stroke-width="5"/>'+
     '<line data-part="지름" role="button" tabindex="0" aria-label="지름: 원의 양끝을 잇는 선" x1="30" y1="130" x2="230" y2="130" stroke="#e8b36e" stroke-width="15" stroke-linecap="round"/>'+
     '<line data-part="반지름" role="button" tabindex="0" aria-label="반지름: 중심과 원의 테두리를 잇는 선" x1="130" y1="130" x2="130" y2="30" stroke="#80ae8a" stroke-width="18" stroke-linecap="round"/>'+
     '<circle data-part="중심" role="button" tabindex="0" aria-label="원의 중심점" cx="130" cy="130" r="17" fill="#467c61"/>'+
     '</svg>';
     diagram.innerHTML=svg;work.append(diagram);
     diagram.querySelectorAll('[data-part]').forEach(el=>{
       const activate=()=>{chosen=el.dataset.part;diagram.querySelectorAll('[data-part]').forEach(x=>x.classList.toggle('selected',x===el))};
       el.addEventListener('click',activate);el.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();activate()}});
     });
     guide();check(()=>chosen===scene.answer);preset(()=>{diagram.querySelector('[data-part="'+scene.answer+'"]').dispatchEvent(new Event('click',{bubbles:true}))});
   }else{
     say('반지름은 중심에서 테두리까지, 지름은 원을 가로지르는 길이야.');
     let length=1;const img=addScene('');
     const row=h('div','hands-steppers');work.append(row);
     const step=addStepper(row,'길이',()=>{length=Math.max(1,length-1);update()},()=>{length=Math.min(20,length+1);update()});
     const update=()=>{step.val.textContent=length+'cm';img.innerHTML='<svg viewBox="0 0 270 210" width="260" style="max-width:90%" role="img" aria-label="반지름과 지름"><circle cx="135" cy="110" r="80" fill="#e8f4e5" stroke="#427c60" stroke-width="5"/><line x1="'+(scene.part==='지름'?55:135)+'" y1="110" x2="215" y2="110" stroke="#c97a58" stroke-width="7"/><circle cx="135" cy="110" r="6" fill="#4d7e5f"/><text x="135" y="195" text-anchor="middle" font-size="20" fill="#356245">'+scene.part+' '+length+'cm</text></svg>'};
     update();guide();check(()=>length===scene.answer);preset(()=>{length=scene.answer;update()});
   }
 }else if(scene.kind==='units'){
   say('큰 단위 한 개는 작은 단위 1000개야. 두 단위를 나눠서 맞춰 봐.');
   let big=0,small=0;const row=h('div','hands-steppers');work.append(row);
   const meter=h('div','hands-capacity');work.append(meter);
   const update=()=>{stepBig.val.textContent=big+scene.unit;stepSmall.val.textContent=small+scene.minor;
     meter.replaceChildren();const bigTokens=h('div','hands-big-units');for(let i=0;i<big;i++)bigTokens.append(h('span','',scene.unit==='L'?'🧃':'⚖️'));
     meter.append(bigTokens,h('strong','',big+scene.unit+' + '+small+scene.minor+' = '+(big*1000+small)+scene.minor))};
   const stepBig=addStepper(row,scene.unit,()=>{big=Math.max(0,big-1);update()},()=>{big=Math.min(8,big+1);update()});
   const stepSmall=addStepper(row,scene.minor,()=>{small=Math.max(0,small-100);update()},()=>{small=Math.min(900,small+100);update()});
   update();guide();check(()=>big===scene.big&&small===scene.small);preset(()=>{big=scene.big;small=scene.small;update()});
 }else if(scene.kind==='move'){
   let x=scene.x,y=scene.y;const grid=h('div','hands-move-grid');work.append(grid);
   say('꽃을 화살표로 움직여 목적지에 보내 줘.');
   const update=()=>{grid.replaceChildren();for(let yy=5;yy>=1;yy--)for(let xx=1;xx<=5;xx++){const tile=h('div','hands-grid-tile'+(xx===scene.x+scene.dx&&yy===scene.y+scene.dy?' target':''),x===xx&&y===yy?'🌼':'');tile.setAttribute('aria-label',xx+'열 '+yy+'행 '+(x===xx&&y===yy?'꽃 있음':''));grid.append(tile)}};
   const arrows=h('div','hands-arrows');
   [['←',-1,0],['→',1,0],['↑',0,1],['↓',0,-1]].forEach(([text,dx,dy])=>arrows.append(btn(text,()=>{x=Math.max(1,Math.min(5,x+dx));y=Math.max(1,Math.min(5,y+dy));update()},'hands-step')));
   work.append(arrows);update();guide();check(()=>x===scene.x+scene.dx&&y===scene.y+scene.dy);preset(()=>{x=scene.x+scene.dx;y=scene.y+scene.dy;update()});
 }else if(scene.kind==='pattern'){
   const seq=h('div','hands-pattern');work.append(seq);
   for(let i=0;i<4;i++)seq.append(h('span','',scene.start+i*scene.step));
   const out=h('strong','hands-pattern-slot','?');seq.append(out);
   let val=0;const steps=h('div','hands-steppers');work.append(steps);
   const update=()=>{out.textContent=String(val);step.val.textContent=val};
   const step=addStepper(steps,'빈칸',()=>{val=Math.max(0,val-1);update()},()=>{val=Math.min(100,val+1);update()});
   const add=h('div','hands-jump');add.append(btn('+5',()=>{val=Math.min(100,val+5);update()},'hands-step'),btn('+10',()=>{val=Math.min(100,val+10);update()},'hands-step'));work.append(add);update();guide();
   check(()=>val===scene.answer);preset(()=>{val=scene.answer;update()});
 }else if(scene.kind==='line'){
   const marks=h('div','hands-number-marks');work.append(marks);const target=scene.target??scene.start;
   say('같은 간격의 수직선에서 목표 수를 눌러 줘.');
   for(let i=0;i<9;i++){const v=scene.start+scene.step*i;const mark=btn(String(v),()=>{marks.querySelectorAll('button').forEach(b=>b.classList.remove('selected'));mark.classList.add('selected');marks.dataset.value=String(v)},'hands-number-mark');marks.append(mark)}
   guide();check(()=>+marks.dataset.value===target);preset(()=>{const m=[...marks.children].find(b=>b.textContent===String(target));m?.click()});
 }else if(scene.kind==='place'){
   const values=scene.places.map(()=>0),row=h('div','hands-steppers');work.append(row);const summary=h('div','hands-place-blocks');work.append(summary);
   say('자릿값 블록을 하나씩 늘리거나 줄여서 같은 수를 만들어 보자.');
   const steps=[];
   const update=()=>{
     summary.replaceChildren();
     scene.places.forEach((place,i)=>{
       steps[i].val.textContent=place.label+' '+values[i]+'개';
       const tile=h('div','hands-place-column');tile.append(h('strong','',place.label));
       tile.append(h('span','hands-place-icons',('▮').repeat(values[i])||'·'));
       summary.append(tile);
     });
   };
   scene.places.forEach((place,i)=>{steps.push(addStepper(row,place.label,()=>{values[i]=Math.max(0,values[i]-1);update()},()=>{values[i]=Math.min(9,values[i]+1);update()}))});
   update();guide();
   check(()=>values.every((v,i)=>v===scene.places[i].value));
   preset(()=>{scene.places.forEach((p,i)=>values[i]=p.value);update()});
 }else if(scene.kind==='measure'){
   say('0cm부터 시작해 목표 눈금을 표시하자.');
   const ruler=h('div','hands-ruler');let value=-1;work.append(ruler);
   for(let i=0;i<=16;i++){const m=btn(String(i),()=>{value=i;ruler.querySelectorAll('button').forEach(x=>x.classList.remove('selected'));m.classList.add('selected')},'hands-ruler-mark');m.setAttribute('aria-label',i+'센티미터 표시하기');ruler.append(m)}
   guide();check(()=>value===scene.target);preset(()=>{ruler.children[scene.target].click()});
 }else if(scene.kind==='spin'){
   let turns=0;const face=h('div','hands-spin-arrow');work.append(face);
   say('화살표를 90°씩 실제로 돌려 봐. 반대 방향도 눌러 볼 수 있어.');
   const update=()=>{face.textContent='↑';face.style.transform='rotate('+turns+'deg)';face.setAttribute('aria-label','현재 '+turns+'도 회전한 화살표')};
   const arrows=h('div','hands-arrows');work.append(arrows);
   arrows.append(btn('↶ 90°',()=>{turns=(turns+270)%360;update()},'hands-step'),btn('↷ 90°',()=>{turns=(turns+90)%360;update()},'hands-step'));
   update();guide();check(()=>turns===scene.turns);preset(()=>{turns=scene.turns;update()});
 }else if(scene.kind==='symmetry'){
   say(scene.point?'가운데 점에서 반 바퀴 돌렸을 때의 반대편 자리를 찾아 봐.':'가운데 선을 기준으로 같은 높이·같은 거리에 꽃을 심어 보자.');
   const grid=h('div','hands-mirror-grid');work.append(grid);
   let chosen=-1;const target=(scene.point?3-scene.y:scene.y)*6+(5-scene.x);
   const draw=()=>{grid.replaceChildren();for(let y=0;y<4;y++)for(let x=0;x<6;x++){
     const idx=y*6+x,b=btn(y===scene.y&&x===scene.x?'🌼':idx===chosen?'🌼':'',()=>{if(x<3)return;chosen=idx;draw()},'hands-mirror-cell'+(x===2?' split':'')+(idx===chosen?' selected':''));
     if(y===scene.y&&x===scene.x)b.disabled=true;
     b.setAttribute('aria-label',(x+1)+'열 '+(y+1)+'행 '+(idx===chosen?'내가 심은 꽃':(y===scene.y&&x===scene.x?'처음 꽃':'빈칸')));
     grid.append(b);
   }};
   draw();guide();check(()=>chosen===target);preset(()=>{chosen=target;draw()});
 }else if(scene.kind==='shape'){
   say('모양을 손으로 눌러 바구니에 넣어 보자. 변의 수가 맞으면 성공!');
   const candidates=scene.solid?[['상자 모양','📦'],['둥근기둥 모양','🥫'],['공 모양','⚽']]:[['세모',3],['네모',4],['오각형',5],['육각형',6]];
   const board=h('div','hands-shapes');let chosen='';work.append(board);const svg=n=>'<svg viewBox="0 0 100 100" width="75" height="75" role="img" aria-label="'+n+'각형"><polygon points="'+Array.from({length:n},(_,i)=>{const r=2*Math.PI*i/n-Math.PI/2;return (50+38*Math.cos(r)).toFixed(0)+','+(50+38*Math.sin(r)).toFixed(0)}).join(' ')+'" fill="#b4d8b6" stroke="#477e60" stroke-width="5"/></svg>';
   if(scene.solid)work.prepend(h('p','hands-prompt-seeds',scene.emoji));
   candidates.forEach(([name,n])=>{const b=btn('',()=>{chosen=name;board.querySelectorAll('button').forEach(x=>x.classList.remove('selected'));b.classList.add('selected')},'hands-shape-card');b.innerHTML=(scene.solid?'<span class="hands-big-emoji">'+n+'</span>':svg(n))+'<span>'+name+'</span>';board.append(b)});
   guide();check(()=>chosen===scene.name);preset(()=>{board.children[candidates.findIndex(a=>a[0]===scene.name)].click()});
 }else{
   say('그림과 문장을 살펴보고 답을 직접 완성해 보자.');
   const input=h('input','hands-entry');input.type='text';input.autocomplete='off';input.spellcheck=false;input.setAttribute('aria-label','직접 생각한 답 입력');input.placeholder=/^[\d.,-]/.test(String(scene.answer))?'숫자만 써도 돼':'이름 또는 답 쓰기';input.inputMode=/^[\d.,-]/.test(String(scene.answer))?'decimal':'text';work.append(input);
   const numeric=/^[\d.,-]+/.test(String(scene.answer));
   if(numeric){const keys=h('div','hands-numberpad');work.append(keys);
    for(const digit of ['1','2','3','4','5','6','7','8','9','/','0','.','지우기'])keys.append(btn(digit,()=>{if(digit==='지우기')input.value=input.value.slice(0,-1);else input.value+=digit;input.focus()},'hands-key'));
   }else{const reveal=btn('글자 도움 보기',()=>{support();const suggest=h('div','hands-wordbank');const options=[scene.answer,...(problem.options||[]).filter(x=>x!==scene.answer)].slice(0,6);
      options.forEach(v=>suggest.append(btn(v,()=>{input.value=v;input.focus()},'hands-word')));reveal.replaceWith(suggest)},'hands-help');work.append(reveal)}
   input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const submit=actions.querySelector('.hands-check');submit?.click()}});
   guide();check(()=>{const actual=norm(input.value),goal=norm(scene.answer);if(actual===goal)return true;const m=goal.match(/^(-?\d+(?:\.\d+)?)(cm³|cm²|cm|m|g|kg|ml|l|분|개|상자|m³|%)$/);return !!m&&actual===m[1]});preset(()=>{input.value=scene.answer;input.focus()});
 }
 current={kind:scene.kind,mode,phase,scene};
 return current;
}
root.MoaHandsOn=Object.freeze({render,family,buildMode});
})(window);
/* 일단해봄 초등 수학: 개념별 조작 도구.
 * 2022 개정 주요 주제에 맞춘 자체 활동이며 성취도 진단·치료 효과 판정이 아니다.
 * Keyboard + touch buttons work; no network, account, timer, or tracking.
 */
(function(root){'use strict';
const rand=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pick=x=>x[rand(0,x.length-1)];
const inSet=(m,list)=>list.split(' ').includes(m);
const family=(mode,answer='')=>{
 if(inSet(mode,'count shapeCount classify'))return 'count';
 if(inSet(mode,'divide groupDiv remainder'))return 'share';
 if(inSet(mode,'groupMult times'))return 'groups';
 if(inSet(mode,'fractionParts fracDecimal fracCompare fracEquivalent fracAdd fracSub fracUnlike fracUnlikeSub fractionKinds fractionMix'))return 'fraction';
 if(inSet(mode,'angles anglesMeasure angleSum rightAngle'))return 'angle';
 if(inSet(mode,'clock elapsed'))return 'clock';
 if(inSet(mode,'chart pictograph barGraph lineChart lineChange pieChart tableRead graphChoice'))return 'graph';
 if(inSet(mode,'tens50 tens100 tens hundreds thousands placeValue placeValue4 placeValueBig'))return 'place';
 if(inSet(mode,'numberLine numberLine50 numberLine100 numberOrder numberOrder50 numberOrder100 numberOrder999 numberOrder4 numberOrderBig compare'))return 'line';
 if(inSet(mode,'pattern patternShapes'))return 'pattern';
 if(inSet(mode,'transformation2d transformation reflection rotation pointSym'))return 'move';
 if(inSet(mode,'symmetry pointSym'))return 'symmetry';
 if(inSet(mode,'shape2d shape3d shapeMatch shape3dObject shape3dClass polygonSides triangles triangleClass shapeQuadrilaterals quadrilateral regularPolygon diagonals congruence prism netCube solids faces shapeViews solidProperties boxEdges cubes'))return 'shape';
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
 if(kind==='clock'){const hour=rand(1,12),minute=pick([0,30]);return {kind:'clock',question:'오른쪽 시계와 똑같은 시각을 만들어 보자.',hint:'짧은 바늘은 시, 긴 바늘은 분을 나타내.',hour,minute,answer:hour+'|'+minute};}
 if(kind==='angle'){const angle=mode==='rightAngle'?90:mode==='angles'?pick([30,60,90,120,150]):rand(2,12)*15;return {kind:'angle',question:angle+'° 각을 직접 만들어 보자.',hint:'90°는 직각, 더 작으면 예각, 더 크면 둔각이야.',angle,answer:angle};}
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
 if(kind==='move'){const x=rand(1,3),y=rand(1,3),dx=rand(1,2),dy=mode==='transformation2d'?0:rand(0,2);return {kind:'move',question:'꽃을 오른쪽으로 '+dx+'칸'+(dy?' 위로 '+dy+'칸':'')+' 이동시켜 보자.',hint:'오른쪽은 한 칸씩 오른쪽, 위는 한 줄 위로 움직여.',x,y,dx,dy,answer:(x+dx)+'|'+(y+dy)};}
 if(kind==='pattern'){const step=rand(2,7),start=rand(1,11);return {kind:'pattern',question:'수의 규칙을 찾아 빈칸을 완성하자.',hint:'앞의 수에서 매번 얼마씩 커지는지 살펴봐.',start,step,answer:start+step*4};}
 if(kind==='line'){const start=rand(0,10),step=rand(1,5),target=start+step*rand(1,7);return {kind:'line',question:'수직선에서 '+target+'을 찾아 표시해 보자.',hint:'시작점부터 같은 간격으로 한 칸씩 세어 봐.',start,step,target,answer:target};}
 if(kind==='count'){const count=rand(2,9);return {kind:'count',question:'도토리를 세고 같은 개수를 열 칸 틀에 채워 보자.',hint:'왼쪽부터 하나씩 누르면서 개수를 맞춰 봐.',count,answer:count};}
 if(kind==='place'){const tens=rand(1,8),ones=rand(0,9);return {kind:'place',question:'십 모형 '+tens+'개와 낱개 '+ones+'개를 직접 만들어 보자.',hint:'십 한 묶음은 10개, 낱개는 1개야.',tens,ones,answer:tens*10+ones};}
 if(kind==='measure'){const target=rand(2,15);return {kind:'measure',question:'자 위에서 '+target+'cm 위치에 표시를 놓자.',hint:'0부터 눈금을 한 칸씩 따라가 봐.',target,answer:target};}
 if(kind==='symmetry'){return {kind:'symmetry',question:'세로 대칭선 반대편에 같은 위치의 꽃을 심어 보자.',hint:'대칭선을 기준으로 같은 거리만큼 반대쪽에 있어야 해.',x:rand(0,1),y:rand(0,3),answer:'mirror'}}
 if(kind==='shape'){const solids=inSet(mode,'shape3d shape3dObject shape3dClass prism netCube solids faces shapeViews solidProperties boxEdges cubes');if(solids){const types=[['상자 모양','📦'],['둥근기둥 모양','🥫'],['공 모양','⚽']];const [name,emoji]=pick(types);return {kind:'shape',solid:true,question:'어떤 입체 모양인지 살펴보고 그림 카드를 모양 바구니에 넣자.',hint:'평평한 면과 둥근 면, 꼭짓점을 비교해 보자.',name,emoji,answer:name}}
 const types=[['세모',3],['네모',4],['오각형',5],['육각형',6]];const [name,sides]=pick(types);return {kind:'shape',question:'변이 '+sides+'개인 도형을 찾아 모양 바구니로 보내자.',hint:'그림 테두리의 변을 하나씩 세어 봐.',sides,name,answer:name};}
 return {kind:kind==='write'?'write':'build',question:p.question,hint:p.hint,answer:p.answer,art:p.art};
}
const typeDescriptions={
count:'수 세기·일대일 대응',share:'하나씩 공평하게 나누기',groups:'같은 수씩 묶기',
graph:'표에서 그래프 만들기',clock:'시계 바늘 움직이기',angle:'각도 직접 만들기',
fraction:'분수 조각 색칠하기',move:'격자에서 이동하기',pattern:'수 규칙 찾기',
line:'수직선 눈금 찾기',place:'십과 낱개 묶기',measure:'자로 길이 표시하기',
shape:'모양 구성·분류하기',symmetry:'대칭선에 맞춰 꽃 심기',build:'그림 보고 답 만들기',write:'생각한 답을 직접 쓰기'};
root.MoaHandsOnCore=Object.freeze({family,buildMode,visual,typeDescriptions,h,btn});
})(window);
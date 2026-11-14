/* Original questions and diagrams authored for 일단해봄. No publisher questions copied. */
(function(root){'use strict';
const LEGACY=root.MoaGradeMath; 
const rand=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pick=a=>a[rand(0,a.length-1)];
const fmt=n=>Number.isInteger(n)?String(n):String(Number(n.toFixed(4)));
const gcd=(a,b)=>b?gcd(b,a%b):Math.abs(a);
const fract=(n,d)=>{const g=gcd(n,d);return (n/g)+'/'+(d/g)};
const fraction=(n,d)=>'<span class="fraction"><b>'+n+'</b><b>'+d+'</b></span>';
const dots=(n,emo='🌰')=>'<span class="dots">'+Array.from({length:Math.min(n,30)},()=>'<b>'+emo+'</b>').join('')+'</span>';
const bold=x=>'<span class="math-big">'+x+'</span>';
const bar=(n,d)=>'<div class="unit-fraction-bar">'+Array.from({length:d},(_,i)=>'<span style="background:'+(i<n?'#87bc99':'#fff')+'"></span>').join('')+'</div>';
const line=(start,step,blank)=>'<div class="unit-numberline">'+Array.from({length:6},(_,i)=>'<span>'+(i===blank?'?':start+i*step)+'</span>').join('')+'</div>';
const drawAngle=a=>{const r=a*Math.PI/180;return '<svg viewBox="0 0 250 170" width="260" style="max-width:95%" role="img" aria-label="각을 보여주는 선"><path d="M121 144 L231 144 M121 144 L'+(121+105*Math.cos(r)).toFixed(1)+' '+(144-105*Math.sin(r)).toFixed(1)+'" stroke="#46785b" fill="none" stroke-width="7" stroke-linecap="round"/><circle cx="121" cy="144" r="6" fill="#f7b66f"/></svg>'};
const shapeSvg=(kind)=>{const s={circle:'<circle cx="110" cy="85" r="58"/>',square:'<rect x="55" y="30" width="110" height="110"/>',triangle:'<polygon points="110,18 40,148 180,148"/>',rectangle:'<rect x="34" y="48" width="150" height="82"/>',pentagon:'<polygon points="110,14 184,72 157,154 63,154 36,72"/>',hexagon:'<polygon points="65,30 155,30 193,85 155,140 65,140 27,85"/>'};return '<svg width="215" viewBox="0 0 220 175" role="img" aria-label="수학 도형" class="shape-img"><g fill="#b8ddbe" stroke="#437d62" stroke-width="5">'+(s[kind]||s.circle)+'</g></svg>'};
const barGraph=(n)=>'<div class="unit-bars">'+n.map((v,i)=>'<div><span>'+['월','화','수','목'][i]+'</span><b style="width:'+Math.min(100,v/15*100)+'%"></b><strong>'+v+'</strong></div>').join('')+'</div>';
const clock=(h,m)=>{const a=(h%12+m/60)*Math.PI/6,b=m*Math.PI/30;return '<svg width="190" viewBox="0 0 200 200" role="img" aria-label="시계"><circle cx="100" cy="100" r="86" fill="#fffaf0" stroke="#6c9c7b" stroke-width="5"/>'+[12,3,6,9].map((n,i)=>{const c=i*Math.PI/2;return '<text x="'+(100+69*Math.sin(c))+'" y="'+(104-69*Math.cos(c))+'" fill="#355d46" font-size="17" text-anchor="middle">'+n+'</text>'}).join('')+'<path d="M100 100L'+(100+50*Math.sin(a))+' '+(100-50*Math.cos(a))+'" stroke="#46785b" stroke-width="8" stroke-linecap="round"/><path d="M100 100L'+(100+66*Math.sin(b))+' '+(100-66*Math.cos(b))+'" stroke="#d27c5c" stroke-width="5" stroke-linecap="round"/></svg>'};
const sh=a=>{const r=[...a];for(let i=r.length-1;i>0;i--){const j=rand(0,i);[r[i],r[j]]=[r[j],r[i]]}return r};
function mk(q,art,answer,wrong,hint,kind='choice'){
 const a=String(answer),options=[a,...wrong.map(String)].filter((x,i,z)=>z.indexOf(x)===i);
 if(options.length<4){
  const n=Number(a);if(Number.isFinite(n)){for(let v=1;options.length<4&&v<100;v++){for(const w of [n+v,n-v])if(w>=0&&!options.includes(fmt(w)))options.push(fmt(w))}}
  else{const m=a.match(/^(-?\d+(?:\.\d+)?)(cm|m|g|kg|mL|L|분|개|cm²|cm³|m³|%|°)$/);if(m){for(let i=1;options.length<4&&i<20;i++){for(const v of [Number(m[1])+i,Number(m[1])-i])if(v>=0&&!options.includes(fmt(v)+m[2]))options.push(fmt(v)+m[2])}}}
 }
 if(options.length<4){
  const m=a.match(/^(\d+)(번째|번|상자)$/);
  if(m){for(let v=1;options.length<4&&v<=30;v++){const k=v+m[2];if(k!==a&&!options.includes(k))options.push(k)}}
  const frac=a.match(/^(\d+)\/(\d+)$/);
  if(frac){const n=+frac[1],d=+frac[2];for(let i=1;options.length<4&&i<40;i++){for(const t of [fract(n+i,d),fract(n,d+i),fract(Math.max(1,n-i),d)])if(t!==a&&!options.includes(t))options.push(t)}}
  const ratio=a.match(/^(\d+):(\d+)$/);
  if(ratio){for(let i=1;options.length<4&&i<15;i++){for(const t of [ratio[1]+':'+(+ratio[2]+i),(+ratio[1]+i)+':'+ratio[2]])if(t!==a&&!options.includes(t))options.push(t)}}
 }
 if(options.length<4)throw Error('답 선택지가 부족함: '+q+' / '+options.join(','));
 return {question:q,art,answer:a,options:sh(options.slice(0,4)),hint,kind};
}
function problem(mode){
 let a,b,c,d,n,s,t,z,arr;
 switch(mode){
 case 'wordProblemsBig':a=rand(120,460);b=rand(110,350);return mk('창고에 열매가 '+a+'개 있었어. '+b+'개를 더 가져오면?',bold('🍎 '+a+'개 + '+b+'개'),a+b,[a+b+10,a+b-10,a+b+1],'백·십·일의 자리끼리 더해.');
 case 'multTriple':a=rand(112,235);b=rand(2,7);return mk('세 자리 수와 한 자리 수를 곱하면?',bold(a+' × '+b+' = ?'),a*b,[a*b+a,a*b+b,a*b-10],'백·십·일 자리를 나누어 곱해.');
 case 'fracDecimal':a=rand(1,9);return mk('분수를 소수로 바꾸면?',fraction(a,10),fmt(a/10),[fmt((a+1)/10),fmt((a-1)/10),fmt(a/100)],'10분의 1은 0.1이야.');
 case 'transformation2d':a=rand(1,4);b=rand(1,3);return mk('꽃을 오른쪽으로 '+b+'칸 옮기면 어느 칸일까?',bold('가로 1 · 2 · 3 · 4 · 5 · 6 · 7 · 8<br>꽃은 '+a+'번 칸'),a+b+'번 칸',[a+'번 칸',(a+b+1)+'번 칸',(a+b+2)+'번 칸'],'방향은 그대로 두고 위치만 옮겨.');
 case 'pointSym':s=pick(['평행사변형','직사각형','정삼각형']);return mk('도형을 중심 기준으로 180° 돌려도 겹칠까?',bold(s),s==='정삼각형'?'아니요':'네',s==='정삼각형'?['네','항상','모르겠어요']:['아니요','항상 안 돼요','모르겠어요'],'점대칭은 반 바퀴 돌렸을 때 같은 모양이 돼.', 'choice');
 case 'decimalPoint':a=rand(12,50);b=rand(2,5);return mk('소수를 자연수로 나누는 몫은?',bold(fmt(a*b/10)+' ÷ '+b),fmt(a/10),[fmt(a/10+1),fmt(a/100),fmt(a/10+.1)],'소수점 위치를 맞추어 자연수 나눗셈처럼 계산해.');
 case 'hiddenCubes':a=rand(2,4);b=rand(2,4);return mk('쌓기나무 탑의 위에 '+a+'개, 아래에 '+b+'개가 있어. 전체 개수는?',bold('🧱 위 '+a+'개 · 아래 '+b+'개'),a+b,[a,b,a+b+1],'보이지 않는 아래층까지 모두 포함해.');
 case 'ordinal':a=rand(1,5);return mk('앞에서 몇 번째 친구에게 꽃을 줄까?',bold(['🐻','🐰','🐱','🐸','🐶'].map((x,i)=>'<span style="background:'+(i===a-1?'#f8dd89':'none')+';padding:6px;border-radius:9px">'+x+'</span>').join(' ')),a+'번째',[a+1+'번째',Math.max(1,a-1)+'번째',a+2+'번째'],'왼쪽부터 하나씩 순서를 세어 봐.');
 case 'shape2d':s=pick([['세모','triangle'],['네모','square'],['동그라미','circle'],['직사각형','rectangle']]);return mk('그림의 모양 이름은?',shapeSvg(s[1]),s[0],['세모','네모','동그라미','직사각형'].filter(x=>x!==s[0]),'선과 꼭짓점이 몇 개인지 살펴보자.');
 case 'shapeMatch':s=pick([['세모','triangle'],['네모','square'],['동그라미','circle']]);return mk('가장 닮은 모양 이름은?',shapeSvg(s[1]),s[0],['세모','네모','동그라미','오각형'].filter(x=>x!==s[0]),'모양의 테두리를 따라가며 비교해 보자.');
 case 'shapeCount':a=rand(2,5);b=rand(1,4);return mk('동그라미는 몇 개일까?',bold('🟢'.repeat(a)+'<br>'+'🔺'.repeat(b)),a,[a+1,a-1,a+2],'동그라미만 찾아 하나씩 세어 봐.');
 case 'make10':a=rand(1,9);return mk('몇 개를 더하면 열 개가 될까?',dots(a)+'<span class="symbol">+</span>'+bold('? = 10'),10-a,[9-a,11-a,8-a],'10에서 지금 있는 개수를 빼면 돼.');
 case 'lengthCompare':a=rand(3,7);b=a+rand(1,5);return mk('더 긴 리본은 몇 cm짜리일까?',bold('🌿 '+a+'cm<br>🌿🌿 '+b+'cm'),b+'cm',[a+'cm',(b+1)+'cm',(b+2)+'cm'],'센티미터 숫자가 더 큰 쪽이 더 길어.');
 case 'weightCompare':a=rand(1,7);b=a+rand(1,5);return mk('더 무거운 바구니는 몇 kg일까?',bold('🧺 '+a+'kg　⚖️　🧺 '+b+'kg'),b+'kg',[a+'kg',b+1+'kg',Math.max(0,b-2)+'kg'],'kg이 더 큰 바구니를 골라 봐.');
 case 'numberOrder':a=rand(10,9000);b=a+rand(5,70);return mk('둘 중 더 큰 수는 무엇일까?',bold(a+'　　'+b),b,[a,a-1,b+10],'가장 왼쪽 자리부터 비교해.');
 case 'numberLine':a=rand(1,50);b=rand(1,8);c=rand(1,4);return mk('물음표에 들어갈 수는?',line(a,b,c),a+b*c,[a+b*(c-1),a+b*(c+1),a+b*c+1],'한 칸씩 몇씩 커지는지 살펴봐.');
 case 'patternShapes':s=pick([['🌼','🍄'],['🔴','🔵'],['🐰','🐻']]);return mk('다음에 올 모양은?',bold(s[0]+' '+s[1]+' '+s[0]+' '+s[1]+' '+s[0]+' ?'),s[1],[s[0],'⭐','🍀'].filter(x=>x!==s[1]),'두 모양이 번갈아 나와.');
 case 'wordProblems':a=rand(16,39);b=rand(5,18);return mk('가게에 사과가 '+a+'개 있었어. '+b+'개를 더 사 왔으면?',bold('🍎 '+a+'개 + '+b+'개'),a+b,[a+b+1,a+b-1,a-b],'처음 개수에 새로 온 개수를 더해.');
 case 'placeValue':a=rand(2,7);b=rand(1,9);c=rand(0,8);return mk('이 수에서 십의 자리가 나타내는 값은?',bold((a*100+b*10+c).toLocaleString('ko-KR')),b*10,[b,c,a*100],'십의 자리는 10개씩 몇 묶음인지 나타내.');
 case 'ruler':a=rand(2,9);return mk('0에서 표시까지 몇 cm일까?','<div class="unit-ruler">'+Array.from({length:11},(_,i)=>'<span class="'+(i===a?'on':'')+'">'+i+'</span>').join('')+'</div>',a+'cm',[(a+1)+'cm',(a-1)+'cm',(a+2)+'cm'],'0부터 표시까지 눈금 칸을 세어.');
 case 'classify':a=rand(2,5);b=rand(2,4);return mk('빨간 열매는 모두 몇 개일까?',bold('🔴'.repeat(a)+'🟡'.repeat(b)),a,[b,a+1,a+b],'색 한 가지만 골라서 세어 봐.');
 case 'tableRead':a=rand(3,9);b=rand(1,7);c=rand(2,8);return mk('표에서 토끼가 모은 열매는 몇 개야?','<table class="unit-table"><tr><th>친구</th><th>열매 수</th></tr><tr><td>토끼</td><td>'+a+'</td></tr><tr><td>곰</td><td>'+b+'</td></tr><tr><td>여우</td><td>'+c+'</td></tr></table>',a,[b,c,a+1],'토끼 행을 먼저 찾아 읽어 봐.');
 case 'pictograph':a=rand(2,6);b=a+rand(1,3);return mk('누가 열매를 더 많이 모았을까?',bold('🐰 '+('🍓'.repeat(a))+'<br>🐻 '+('🍓'.repeat(b))),'곰',['토끼','둘 다 같아','아직 몰라'],'열매를 한 줄씩 세고 비교해.');
 case 'compareUnit':a=rand(1,5);b=rand(10,90);return mk(a+'m '+b+'cm는 몇 cm일까?',bold('1m = 100cm'),a*100+b+'cm',[(a*100+b+10)+'cm',(a*100+b-10)+'cm',(a*10+b)+'cm'],'m는 100을 곱하고 cm와 합쳐.');
 case 'elapsed':a=rand(1,9);b=rand(1,5)*10;return mk(a+'시부터 '+b+'분이 지나면 몇 시 몇 분?',clock(a,0),a+'시 '+b+'분',[a+'시 '+(b+10)+'분',(a+1)+'시 '+b+'분',a+'시 '+(b-10)+'분'],'시계의 긴 바늘이 몇 칸 움직이는지 살펴봐.');
 case 'groupDiv':a=rand(2,8);b=rand(2,6);return mk((a*b)+'개를 '+a+'개씩 묶으면 몇 묶음?',dots(a*b,'🍎'),b,[a,b+1,b-1],'같은 개수씩 묶어 몇 묶음인지 세어.');
 case 'multDigit':a=rand(11,49);b=rand(2,9);return mk('몇 개의 열매가 모일까?',bold(a+' × '+b+' = ?'),a*b,[a*b+b,a*b-b,a*b+10],'십의 자리와 일의 자리를 나눠 곱해.');
 case 'wordMultiply':a=rand(12,23);b=rand(2,5);return mk('한 상자에 '+a+'개씩, '+b+'상자가 있어. 모두 몇 개?',bold(a+'개 × '+b+'상자'),a*b,[a+b,a*b+a,a*b-b],'같은 개수의 상자가 여러 개 있으니 곱셈해.');
 case 'decimalPlace':a=rand(1,9);b=rand(0,9);return mk('수 '+a+'.'+b+'에서 소수 첫째 자리 숫자는?',bold(a+'.'+b),b,[a,b+1,(b+2)%10],'소수점 바로 오른쪽 숫자를 봐.');
 case 'polygonSides':a=pick([3,4,5,6]);return mk('이 도형의 변은 몇 개일까?',shapeSvg(({3:'triangle',4:'square',5:'pentagon',6:'hexagon'})[a]),a,[a+1,a-1,a+2],'테두리를 따라 변을 하나씩 세어.');
 case 'fractionParts':d=rand(3,9);a=rand(1,d-1);return mk('색칠한 부분은 전체의 몇 분의 몇?',bar(a,d),a+'/'+d,[(a+1)+'/'+d,(a)+'/'+(d+1),(Math.max(1,a-1))+'/'+d],'전체 칸이 분모, 색칠한 칸이 분자야.');
 case 'circleParts':s=pick(['반지름','지름','중심']);return mk('붉은 표시의 이름은?','<svg width="220" viewBox="0 0 220 180" role="img" aria-label="원의 구성"><circle cx="110" cy="90" r="72" stroke="#52836a" stroke-width="5" fill="#e3f3dd"/>'+(s==='지름'?'<path d="M38 90H182" stroke="#b55f55" stroke-width="6"/>':s==='반지름'?'<path d="M110 90H182" stroke="#b55f55" stroke-width="6"/>':'<circle cx="110" cy="90" r="9" fill="#b55f55"/>')+'<circle cx="110" cy="90" r="4" fill="#3b705a"/></svg>',s,['반지름','지름','중심','원주'].filter(x=>x!==s),'중심은 가운데 점, 반지름은 중심부터 테두리, 지름은 중심을 지나는 양 끝 선이야.');
 case 'circleRadius':a=rand(2,9);return mk('반지름이 '+a+'cm인 원의 지름은?',bold('◯ 반지름 '+a+'cm'),a*2+'cm',[(a+1)+'cm',a+'cm',(a*2+2)+'cm'],'지름은 반지름 두 개 길이야.');
 case 'circleDiameter':a=rand(2,9);return mk('지름이 '+(a*2)+'cm인 원의 반지름은?',bold('◯ 지름 '+(a*2)+'cm'),a+'cm',[(a*2)+'cm',(a+1)+'cm',(a-1)+'cm'],'반지름은 지름의 절반이야.');
 case 'fractionKinds':d=rand(3,7);a=rand(1,d-1);s=pick(['진분수','가분수','대분수']);t=s==='진분수'?fraction(a,d):s==='가분수'?fraction(d+a,d):bold('1 '+a+'/'+d);return mk('이 분수의 종류는?',t,s,['진분수','가분수','대분수','자연수'].filter(x=>x!==s),'분자가 작은지, 분모보다 큰지, 자연수 부분이 있는지 봐.');
 case 'fractionMix':d=rand(3,8);a=rand(1,d-1);b=rand(1,3);return mk('가분수를 대분수로 바꾸면?',fraction(b*d+a,d),b+'와 '+a+'/'+d,[(b+1)+'와 '+a+'/'+d,b+'와 '+(a+1)+'/'+d,(b-1)+'와 '+a+'/'+d],'분자가 분모에 몇 번 들어가는지 먼저 찾아.');
 case 'capacity':a=rand(1,4);b=rand(1,9)*100;return mk(a+'L '+b+'mL는 모두 몇 mL?',bold('1L = 1000mL'),a*1000+b+'mL',[(a*100+b)+'mL',(a*1000+b+100)+'mL',(a*1000+b-100)+'mL'],'L를 1000mL씩 바꿔.');
 case 'unitConvert':a=rand(1,5);b=rand(1,8)*100;return mk(a+'kg '+b+'g에 100g을 더하면?',bold('⚖️ '+a+'kg '+b+'g'),a*1000+b+100+'g',[a*1000+b+'g',a*1000+b+200+'g',(a*100+b+100)+'g'],'kg을 g으로 바꾼 뒤 100g을 더해.');
 case 'anglesMeasure':a=pick([30,45,60,90,110,120,135,150]);return mk('이 각의 크기는 몇 도일까?',drawAngle(a)+'<p class="unit-subnote">각의 벌어진 정도를 살펴봐</p>',a+'°',[(a+10)+'°',Math.max(10,a-20)+'°',(a+20)+'°'],'직각 90°와 비교하여 생각해.');
 case 'angleSum':a=rand(3,9)*10;b=rand(2,7)*10;return mk('두 각의 크기를 더하면?',bold(a+'° + '+b+'° = ?'),a+b+'°',[(a+b+10)+'°',(a+b-10)+'°',(a+b+20)+'°'],'도 단위를 그대로 두고 수끼리 더해.');
 case 'transformation':a=rand(1,4);b=rand(1,4);return mk('꽃이 오른쪽으로 '+b+'칸 이동하면 몇 번째 칸?',bold('🌼 '+a+'번 칸　→ '+b+'칸'),a+b+'번',[(a+b+1)+'번',(a+b-1)+'번',a+'번'],'오른쪽으로 이동하면 번호가 커져.');
 case 'reflection':s=pick([['왼쪽','오른쪽'],['위쪽','아래쪽']]);return mk('거울에 뒤집으면 어느 쪽이 반대일까?',bold('🪞 '+s[0]),s[1],[s[0],'가운데','그대로'],'반대쪽을 찾아 봐.');
 case 'rotation':a=pick([90,180,270]);return mk('오른쪽으로 '+a+'° 돌면 방향은?',bold('↑ 시작'),({90:'오른쪽',180:'아래쪽',270:'왼쪽'})[a],['위쪽','아래쪽','왼쪽','오른쪽'].filter(x=>x!==({90:'오른쪽',180:'아래쪽',270:'왼쪽'})[a]),'시계 방향으로 화살표를 돌려 봐.');
 case 'barGraph':a=rand(2,7);b=a+rand(2,5);return mk('화요일은 월요일보다 몇 개 더 많아?',barGraph([a,b,a+1]),b-a,[b,a,b-a+1],'화요일 값에서 월요일 값을 빼.');
 case 'correspondence':a=rand(2,6);b=rand(2,5);return mk('한 상자에 '+a+'개씩이면 '+b+'상자에 몇 개?',bold('1 → '+a+'<br>2 → '+(a*2)+'<br>'+b+' → ?'),a*b,[a+b,a*b+a,a*b-1],'한 상자당 개수와 상자 수를 곱해.');
 case 'ruleEquation':a=rand(2,5);b=rand(3,7);return mk('규칙을 보고 ?에 들어갈 수는?',bold('x × '+a+' = y<br>'+b+' × '+a+' = ?'),a*b,[a+b,a*b+1,a*(b+1)],'앞의 수에 같은 수를 곱하는 규칙이야.');
 case 'fracSub':d=rand(4,9);a=rand(2,d-1);b=rand(1,a-1);return mk('분모가 같은 분수를 빼면?',fraction(a,d)+'<span class="symbol">−</span>'+fraction(b,d),(a-b)+'/'+d,[(a+b)+'/'+d,(a-b+1)+'/'+d,(a-b)+'/'+(d*2)],'분모는 그대로 두고 분자끼리 빼.');
 case 'triangles':s=pick(['정삼각형','이등변삼각형','부등변삼각형']);return mk('설명에 맞는 삼각형은?',bold(s==='정삼각형'?'세 변의 길이가 모두 같아요.':s==='이등변삼각형'?'두 변만 길이가 같고 나머지 한 변은 달라요.':'세 변 길이가 모두 달라요.'),s,['정삼각형','이등변삼각형','부등변삼각형','직사각형'].filter(x=>x!==s),'같은 길이의 변이 몇 개인지 살펴봐.');
 case 'triangleClass':s=pick(['예각삼각형','직각삼각형','둔각삼각형']);return mk('각의 설명에 맞는 삼각형은?',bold(s==='예각삼각형'?'세 각이 모두 예각이에요.':s==='직각삼각형'?'직각이 하나 있어요.':'둔각이 하나 있어요.'),s,['예각삼각형','직각삼각형','둔각삼각형','정사각형'].filter(x=>x!==s),'직각보다 큰 각이 있는지 확인해.');
 case 'decimalSub':a=rand(20,65);b=rand(1,19);return mk('소수 뺄셈을 계산하면?',bold(fmt(a/10)+' − '+fmt(b/10)),fmt((a-b)/10),[fmt((a-b+1)/10),fmt((a-b-1)/10),fmt((a+b)/10)],'소수점 자리를 맞추어 빼.');
 case 'shapeQuadrilaterals':s=pick(['사다리꼴','마름모','평행사변형']);return mk('설명에 맞는 사각형은?',bold(s==='사다리꼴'?'마주 보는 변 중 꼭 한 쌍만 평행한 사각형':s==='마름모'?'네 변의 길이가 모두 같은 사각형':'마주 보는 두 쌍의 변이 평행한 사각형'),s,['사다리꼴','마름모','평행사변형','삼각형'].filter(x=>x!==s),'변의 길이와 평행한 변을 확인해.');
 case 'lineChange':a=rand(3,8);b=a+rand(2,5);c=b-rand(1,3);return mk('화요일에서 수요일로 몇 개 줄었을까?',barGraph([a,b,c]),b-c,[b-a,c,c+1],'화요일 수에서 수요일 수를 빼.');
 case 'regularPolygon':a=pick([3,4,5,6]);return mk('모든 변의 길이와 각이 같은 '+a+'각형의 이름은?',shapeSvg(({3:'triangle',4:'square',5:'pentagon',6:'hexagon'})[a]),({3:'정삼각형',4:'정사각형',5:'정오각형',6:'정육각형'})[a],['정삼각형','정사각형','정오각형','정육각형'].filter(x=>x!==({3:'정삼각형',4:'정사각형',5:'정오각형',6:'정육각형'})[a]),'변과 각이 모두 같은지 생각해.');
 case 'diagonals':a=rand(4,7);n=a*(a-3)/2;return mk('꼭짓점이 '+a+'개인 다각형의 대각선 수는?',bold('대각선은 이웃하지 않은 두 꼭짓점을 이어.'),n,[n+1,n-1,n+2],'한 꼭짓점에서 대각선은 (꼭짓점 수−3)개야.');
 case 'mixedOps':a=rand(10,30);b=rand(1,9);c=rand(1,9);return mk('왼쪽부터 계산해 볼까?',bold(a+' + '+b+' − '+c),a+b-c,[a+b+c,a-b-c,a+b-c+1],'덧셈과 뺄셈은 왼쪽부터 차례로 해.');
 case 'mixedMult':a=rand(3,8);b=rand(2,6);c=rand(2,5);return mk('곱셈과 나눗셈이 섞인 식을 계산하면?',bold(a+' × '+b+' ÷ '+c+' × '+c),a*b,[a*b+c,a*b-c,a+b],'곱셈과 나눗셈은 왼쪽부터 계산해.');
 case 'parentheses':a=rand(2,7);b=rand(3,8);c=rand(2,6);return mk('괄호부터 계산하면?',bold(a+' × ('+b+' + '+c+')'),a*(b+c),[a*b+c,a*b+c*a+1,a*(b+c)+a],'괄호 안을 먼저 더하고 곱해.');
 case 'gcd':a=pick([4,6,8,10,12]);b=pick([2,3,4]);c=rand(2,4);return mk((a*b)+'와 '+(a*c)+'의 최대공약수는?',bold((a*b)+'　'+(a*c)),a*gcd(b,c),[a,a*b,a*c].filter(v=>v!==a*gcd(b,c)),'공통으로 나누는 수 중 가장 큰 수를 찾아.');
 case 'fracEquivalent':d=rand(3,8);a=rand(1,d-1);b=rand(2,5);return mk('크기가 같은 분수는?',fraction(a,d)+'<span class="symbol">= ?</span>',(a*b)+'/'+(d*b),[(a*b+1)+'/'+(d*b),(a*b)+'/'+(d*b+1),a+'/'+(d*b)],'분자와 분모에 같은 수를 곱해.');
 case 'lcmFractions':a=pick([2,3,4]);b=pick([3,5,6]);if(a===b)b=5;const l=a*b/gcd(a,b);return mk('통분할 때 사용할 수 있는 공통 분모는?',bold('1/'+a+'　와　1/'+b),l,[a+b,l+1,l+2],'두 분모의 공배수를 찾아.');
 case 'fracUnlikeSub':d=pick([4,6,8]);a=rand(1,d/2-1);return mk('분모가 다른 분수를 빼면?',fraction(1,2)+'<span class="symbol">−</span>'+fraction(a,d),fract(d/2-a,d),[fract(d/2+a,d),fract(a,d),fract(d/2-a+1,d)],'먼저 1/2을 '+d+'분의 몇으로 바꿔.');
 case 'perimeter':a=rand(2,9);b=rand(2,8);return mk('가로 '+a+'cm, 세로 '+b+'cm 직사각형 둘레는?',bold('▭ 가로 '+a+'cm · 세로 '+b+'cm'),(a+b)*2+'cm',[(a*b)+'cm',(a+b)+'cm',((a+b)*2+2)+'cm'],'가로 두 번, 세로 두 번 더해.');
 case 'rectangleArea':a=rand(2,9);b=rand(2,9);return mk('직사각형 넓이는 몇 cm²?',bold('▭ 가로 '+a+'cm · 세로 '+b+'cm'),a*b+'cm²',[(a+b)*2+'cm²',(a*b+1)+'cm²',(a+b)+'cm²'],'가로×세로를 계산해.');
 case 'triangleArea':a=rand(2,8)*2;b=rand(2,9);return mk('밑변 '+a+'cm, 높이 '+b+'cm인 삼각형 넓이는?',shapeSvg('triangle')+bold(a+'cm × '+b+'cm ÷ 2'),a*b/2+'cm²',[(a*b)+'cm²',(a*b/2+2)+'cm²',(a+b)+'cm²'],'밑변×높이를 2로 나눠.');
 case 'inequalities':a=rand(5,20);s=pick(['이상','이하','초과','미만']);b=s==='이상'?a:s==='이하'?a:s==='초과'?a+1:a-1;return mk('기준 '+a+' '+s+' 조건을 만족하는 '+(s==='이상'||s==='초과'?'가장 작은':'가장 큰')+' 자연수는?',bold('조건: '+a+' '+s),b,[b-1,b+1,b+2].filter(v=>v>=0),'이상·이하에는 기준 수를 포함해.');
 case 'roundUse':a=rand(25,90);return mk('한 상자에 10개씩 담아야 해. '+a+'개면 최소 몇 상자?',bold(a+' ÷ 10 → 올림'),Math.ceil(a/10)+'상자',[(Math.floor(a/10))+'상자',(Math.ceil(a/10)+1)+'상자',(Math.ceil(a/10)+2)+'상자'],'남는 게 있으면 상자를 하나 더 써.');
 case 'fracMultN':a=rand(1,3);b=rand(4,8);c=rand(2,5);return mk('분수 × 자연수는?',fraction(a,b)+'<span class="symbol">× '+c+'</span>',fract(a*c,b),[fract(a+c,b),fract(a,b*c),fract(a*c,b+1)],'분자에 자연수를 곱해 약분해.');
 case 'congruence':s=pick(['정사각형','직사각형','정삼각형']);return mk('두 도형이 완전히 겹치려면 무엇이 같아야 할까?',bold('🔷　↔　🔷'), '모양과 크기',['색깔만','방향만','위치만'],'합동은 돌리거나 뒤집어도 모양과 크기가 같아.');
 case 'decimalMulti':a=rand(12,39);b=rand(12,34);return mk('소수 × 소수를 계산하면?',bold(fmt(a/10)+' × '+fmt(b/10)),fmt(a*b/100),[fmt(a*b/10),fmt(a*b/100+0.1),fmt(a*b/100+1)],'자연수처럼 곱한 다음 소수 자릿수를 세어.');
 case 'boxEdges':s=pick(['면','모서리','꼭짓점']);a=({면:6,모서리:12,꼭짓점:8})[s];return mk('직육면체의 '+s+'은 몇 개일까?',bold('▣ 직육면체'),a,[4,6,8,12,10].filter(x=>x!==a),'면 6개·모서리 12개·꼭짓점 8개야.');
 case 'netCube':s=pick(['6개','5개','8개']);return mk('정육면체의 전개도는 정사각형 몇 개일까?',bold('🧊 펼치면 정사각형 조각이 보여.'),'6개',[s,'4개','7개','8개'].filter(x=>x!=='6개'),'정육면체에는 면이 여섯 개야.');
 case 'mean':a=rand(3,9);b=rand(4,10);c=rand(3,8);return mk('세 친구가 '+a+', '+b+', '+c+'개를 모았어. 평균은?',bold(a+'　'+b+'　'+c),fmt((a+b+c)/3),[fmt((a+b+c)/3+1),fmt(a+b+c),fmt((a+b+c)/3-1)],'모두 합한 뒤 사람 수 3으로 나눠.');
 case 'possibility':a=rand(0,10);b=10-a;s=a===10?'반드시':a===0?'불가능':a===5?'반반':a>5?'가능성이 높음':'가능성이 낮음';return mk('빨간 공을 뽑을 가능성은?',bold('🔴'.repeat(a)+'🔵'.repeat(b)),s,['반드시','불가능','반반','가능성이 높음','가능성이 낮음'].filter(x=>x!==s),'빨간 공과 파란 공이 각각 몇 개인지 비교해.');
 case 'fractionDivInt':a=rand(1,8);b=rand(2,8);return mk(a+'개를 '+b+'명에게 똑같이 나눈 양은?',bold(a+' ÷ '+b),fract(a,b),[fract(b,a),fract(a+1,b),fract(a,b+1)],'자연수÷자연수는 분수로 나타낼 수 있어.');
 case 'prism':s=pick(['각기둥','각뿔']);return mk('이 입체도형의 특징은?',bold(s==='각기둥'?'위아래 밑면이 합동이고 평행해.':'밑면 하나와 한 꼭짓점에서 모이는 옆면이 있어.'),s,['각기둥','각뿔','원기둥','구'].filter(x=>x!==s),'밑면이 몇 개 있고, 옆면이 어떻게 모이는지 봐.');
 case 'faces':s=pick([['삼각기둥',5],['사각기둥',6],['사각뿔',5]]);return mk(s[0]+'의 면은 모두 몇 개일까?',bold('면을 한 장씩 세어 보자'),s[1],[4,5,6,7,8].filter(x=>x!==s[1]),'밑면과 옆면을 따로 세어.');
 case 'ratio':a=rand(2,5);b=rand(3,9);return mk('사과 '+a+'개, 배 '+b+'개. 사과 수와 배 수의 비는?',bold('🍎'.repeat(a)+'<br>'+'🍐'.repeat(b)),a+':'+b,[b+':'+a,a+':'+(b+1),(a+b)+':'+b],'비교하는 순서를 지켜서 써.');
 case 'proportion':a=rand(2,5);b=rand(3,7);c=rand(2,4);return mk('비례식의 □에 들어갈 수는?',bold(a+' : '+b+' = '+(a*c)+' : □'),b*c,[a*c,b*c+1,b+c],'양쪽 비의 두 수에 같은 수를 곱해.');
 case 'pieChart':a=pick([20,25,40,50,60,75]);return mk('전체 중 초록색이 차지하는 비율은?','<div class="unit-fraction-bar"><span style="background:#84bd91;flex:'+a+'"></span><span style="background:#f4d38c;flex:'+(100-a)+'"></span></div>'+bold('전체 100칸'),a+'%',[(a+10)+'%',Math.max(5,a-10)+'%',(100-a)+'%'],'전체 100칸 중 초록색이 몇 칸인지 봐.');
 case 'graphChoice':s=pick([['시간 흐름에 따른 기온 변화','꺾은선그래프'],['음식별 판매량 비교','막대그래프'],['전체 중 항목별 비율','원그래프']]);return mk('다음 자료를 나타내기 알맞은 그래프는?',bold(s[0]),s[1],['꺾은선그래프','막대그래프','원그래프','표'].filter(x=>x!==s[1]),'변화인지, 항목별 비교인지, 비율인지 생각해.');
 case 'surfaceArea':a=rand(2,7);b=rand(2,6);c=rand(2,5);return mk('가로 '+a+', 세로 '+b+', 높이 '+c+'cm인 직육면체 겉넓이는?',bold('2×('+a+'×'+b+' + '+b+'×'+c+' + '+a+'×'+c+')'),2*(a*b+b*c+a*c)+'cm²',[(a*b*c)+'cm²',(a*b+b*c+a*c)+'cm²',(2*(a*b+b*c+a*c)+2)+'cm²'],'세 쌍의 같은 면 넓이를 두 배로 해.');
 case 'unitVolume':a=rand(1,4);return mk(a+'m³는 몇 cm³일까?',bold('1m³ = 1,000,000cm³'),(a*1000000).toLocaleString('en-US')+'cm³',[(a*1000).toLocaleString('en-US')+'cm³',(a*10000).toLocaleString('en-US')+'cm³',(a*100000).toLocaleString('en-US')+'cm³'],'1m는 100cm. 부피는 가로·세로·높이 모두 바꿔.');
 case 'divisionFraction':a=rand(2,6);b=rand(1,3);c=rand(b+1,6);return mk('자연수를 분수로 나누면?',bold(a+' ÷ '+b+'/'+c),fract(a*c,b),[fract(a*b,c),fract(a,b*c),fract(a*c,b+1)],'뒤의 분수를 거꾸로 하여 곱해.');
 case 'cubes':a=rand(1,3);b=rand(2,4);c=rand(1,3);return mk('왼쪽 탑 '+a+'개, 가운데 '+b+'개, 오른쪽 '+c+'개. 모두 몇 개?',bold('🟩 × '+a+'　🟩 × '+b+'　🟩 × '+c),a+b+c,[a+b,b+c,a+b+c+1],'보이지 않는 아래층도 포함해.');
 case 'shapeViews':a=rand(2,4);b=rand(1,3);return mk('두 탑을 위에서 보면 칸이 몇 개 보일까?',bold('앞 탑 높이 '+a+'칸 / 뒤 탑 높이 '+b+'칸'),2,[a,b,a+b],'위에서는 탑의 높이가 아니라 자리를 세어.');
 case 'decimalDivDecimal':a=rand(11,49);b=rand(2,6);return mk('소수를 소수로 나눈 몫은?',bold(fmt(a*b/10)+' ÷ '+fmt(b/10)),a,[a+1,a-1,a*10],'나누는 수를 자연수로 만든 뒤 함께 자릿수를 옮겨.');
 case 'roundQuotient':a=rand(100,299);b=rand(2,6);n=Math.round(a/b)/100;return mk('나눗셈 몫을 소수 첫째 자리까지 나타내면?',bold(fmt(a/100)+' ÷ '+b+' ≈ ?'),fmt(Number((a/b/100).toFixed(1))),[fmt(Number((a/b/100).toFixed(1))+0.1),fmt(Number((a/b/100).toFixed(1))-0.1),fmt(Number((a/b/100).toFixed(1))+0.2)],'소수 둘째 자리 숫자를 보고 반올림해.');
 case 'circumference':a=rand(2,9);return mk('지름 '+a+'cm인 원의 둘레는? (원주율 3.14)',bold('◯ 지름 '+a+'cm'),fmt(a*3.14)+'cm',[fmt(a*2*3.14)+'cm',fmt(a+3.14)+'cm',fmt(a*3.14+1)+'cm'],'원의 둘레 = 지름 × 원주율이야.');
 case 'solidProperties':s=pick(['원기둥','원뿔','구']);return mk('입체도형 '+s+'의 바른 특징은?',bold('◯ '+s),s==='원기둥'?'평평한 원 모양 면이 2개':s==='원뿔'?'평평한 원 모양 면이 1개':'평평한 면이 없음',['평평한 원 모양 면이 2개','평평한 원 모양 면이 1개','평평한 면이 없음','뾰족한 꼭짓점이 2개'].filter(x=>x!==(s==='원기둥'?'평평한 원 모양 면이 2개':s==='원뿔'?'평평한 원 모양 면이 1개':'평평한 면이 없음')),'밑면의 개수와 꼭짓점을 살펴봐.');
 default:
  if(LEGACY&&Object.values(LEGACY.DATA).flat().some(x=>x[2]===mode))return LEGACY.problem(mode);
  throw Error('소단원 문제 유형 미구현: '+mode);
 }
}
root.MoaUnitEngine=Object.freeze({problem});
})(window);
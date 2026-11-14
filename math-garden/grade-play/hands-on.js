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
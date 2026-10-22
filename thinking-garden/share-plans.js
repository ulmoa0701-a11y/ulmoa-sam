/* Moa garden curated assignment links.
   Contains public activity identifiers and teacher-selected settings ONLY.
   No child name, diagnosis, session score or personal data is encoded.
   Links are curated menus, NOT access restrictions or account authentication. */
(function(){
'use strict';
const CODE='plan',LIMIT=12;
const MATERIALS=[
 {id:'slowPdf',title:'차근차근 인지활동지 16쪽 (PDF)',desc:'시각탐색·공간위치·명명·시각기억',href:'../materials/slow-look/worksheets-16p.pdf'},
 {id:'slowSheets',title:'차근차근 활동지 보기',desc:'A4 인쇄 가능한 기초 활동',href:'../materials/slow-look/'},
 {id:'clinicalGuide',title:'교사·보호자 연계활동 안내',desc:'게임별 일상 연결 활동과 관찰 방법',href:'../materials/cognitive-practice/guide.html'}
];
const STANDALONE_GAMES=[
 {id:'moaMoney',title:'모아의 화폐 가게',desc:'동전·지폐를 알아보고 물건값을 맞추는 생활학습',category:'life'},
 {id:'moaChange',title:'바뀐 준비물 찾기',desc:'기억한 물건 목록에 추가·변경된 정보를 반영해요',category:'memory'},
 {id:'moaFeel',title:'마음 이야기 탐험',desc:'친구의 마음과 여러 선택을 생각해요',category:'life'},
 {id:'rhythmTouch',title:'박자꽃 톡톡',desc:'소리와 박자에 맞춰 색깔 건반을 연주해요',category:'music'},
 {id:'recorderPlay',title:'리코더 손가락 연습',desc:'운지 구멍을 눌러 실제 연주 동작을 익혀요',category:'music'},
 {id:'breathStrength',title:'바람의 힘',desc:'마이크로 바람의 세기를 조절하는 놀이',category:'breath'},
 {id:'breathLong',title:'오래 후~',desc:'길고 편안하게 숨을 내쉬는 놀이',category:'breath'},
 {id:'breathBeat',title:'박자 바람',desc:'노래와 박자의 변화에 맞춰 숨을 내쉬어요',category:'breath'}
];
const external={
 rescue:'games/rescue/',handMirror:'games/hand-mirror/',
 moaMoney:'games/moa-missions/?game=money',
 moaChange:'games/moa-missions/?game=change',
 moaFeel:'games/moa-missions/?game=feel',
 rhythmTouch:'games/rhythm-touch/',
 recorderPlay:'recorder/',
 breathStrength:'../breath-garden/?mode=strength',
 breathLong:'../breath-garden/?mode=long',
 breathBeat:'../breath-garden/?mode=beat'
};
const REAL_PLAY_IMAGES={
 // Match the real in-game photos already used by the five-garden cards.
 // A parent's assigned menu should show the task, not placeholder symbols.
 handMirror:'hand-mirror',moaMoney:'money',moaChange:'change',moaFeel:'feel',
 rhythmTouch:'rhythm-touch',recorderPlay:'recorder',
 breathStrength:'strength',breathLong:'long',breathBeat:'beat'
};
let active=null,library=[],materialMap=new Map(MATERIALS.map(x=>[x.id,x])),hooks={},lastPlayed=null,visited=new Set();
const $=q=>document.querySelector(q), E=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e};
const allGames=()=>[...[...document.querySelectorAll('.library-card[data-open]')].map(c=>({id:c.dataset.open,title:c.querySelector('h3')?.textContent.trim()||c.dataset.open,desc:c.querySelector('p')?.textContent.trim()||'',category:c.dataset.category||'all'})),...STANDALONE_GAMES].filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i);
function pack(x){return btoa(unescape(encodeURIComponent(JSON.stringify(x)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function unpack(input){
 if(!input||input.length>2800)return null;
 try{const json=decodeURIComponent(escape(atob(input.replace(/-/g,'+').replace(/_/g,'/'))));return JSON.parse(json)}catch{return null}
}
function roundChoices(id){
 if(id==='slowName')return [6,12,18,24];
 if(id==='spacing'||id==='spelling')return [10,20,30];
 return [5,10,15,20];
}
function safePlan(o){
 if(!o||![1,2].includes(o.v)||!Array.isArray(o.items))return null;
 const valid=new Set(library.map(x=>x.id)),picked=[],seen=new Set();
 for(const item of o.items){
  if(typeof item!=='string'||item.length>40||seen.has(item))continue;
  if(valid.has(item)||materialMap.has(item)){picked.push(item);seen.add(item)}
  if(picked.length>=LIMIT)break;
 }
 if(!picked.length)return null;
 const level=[1,2,3].includes(Number(o.level))?Number(o.level):1;
 const rounds=[5,10,15,20].includes(Number(o.rounds))?Number(o.rounds):5;
 const view=o.view==='calm'?'calm':'garden';
 const settings={};
 if(o.v===2&&o.settings&&typeof o.settings==='object'&&!Array.isArray(o.settings)){
  for(const id of picked){
   if(!valid.has(id)||external[id])continue;
   const opt=o.settings[id];if(!opt||typeof opt!=='object'||Array.isArray(opt))continue;
   const clean={};
   if([1,2,3].includes(Number(opt.level)))clean.level=Number(opt.level);
   if(roundChoices(id).includes(Number(opt.rounds)))clean.rounds=Number(opt.rounds);
   if(Object.keys(clean).length)settings[id]=clean;
  }
 }
 return {v:2,items:picked,level,rounds,settings,view};
}
function shareUrl(plan){const u=new URL(location.pathname,location.origin);u.searchParams.set(CODE,pack(plan));return u.href}
// Reuse the game's existing visual examples rather than making generic thumbnails.
// The source preview cards are built by card-previews.js later in the page load.
const FALLBACK_SCENES={
 handMirror:{icons:['✊','🌰','→','✋','🌼'],caption:'도토리를 잡고 꽃 피우기'},
 moaMoney:{icons:['🪙','🪙','→','🧸'],caption:'돈을 모아 물건값 내기'},
 moaChange:{icons:['🎒','📗','✏️','→','🖍️'],caption:'준비물에서 달라진 것 찾기'},
 moaFeel:{icons:['🧒','💭','🙂','😟'],caption:'같은 상황, 여러 마음 살펴보기'},
 slowPdf:{icons:['👀','🔎','🧩','📄'],caption:'그림을 보고 찾아보고 맞춰보기'},
 slowSheets:{icons:['✏️','🧩','📄'],caption:'그림 활동지 펼쳐보기'},
 clinicalGuide:{icons:['🎮','→','🏠','📖'],caption:'게임과 생활 놀이 이어보기'}
};
function fillAssignedScene(host){
 const id=host.dataset.previewId;
 const source=[...document.querySelectorAll('.library-card[data-open]')].find(x=>x.dataset.open===id)?.querySelector('.card-live-preview');
 if(!source)return;
 const scene=host.querySelector('.moa-assigned-scene');
 // A genuine screenshot takes priority over the catalog's simulated preview.
 if(!scene||scene.querySelector('img.moa-assigned-real-shot')||scene.querySelector('.card-live-preview'))return;
 scene.replaceChildren(source.cloneNode(true));
 host.classList.add('moa-assigned-has-source');
}
function refreshAssignedScenes(){
 document.querySelectorAll('#moaAssignedHome .moa-assigned-visual[data-preview-id]').forEach(fillAssignedScene);
}
function makeAssignedVisual(id,isGame){
 const wrap=E('div','moa-assigned-visual');
 wrap.dataset.previewId=id;
 wrap.setAttribute('aria-hidden','true');
 wrap.append(E('small','moa-assigned-visual-label',isGame?'🎮 이런 놀이예요':'📄 이런 자료예요'));
 const scene=E('div','moa-assigned-scene');
 // Reuse the validated game-play photos for hand movements, missions,
 // rhythm, recorder and breath work; retain illustrations as offline fallback.
 if(REAL_PLAY_IMAGES[id]){
  const shot=E('img','moa-assigned-real-shot');
  shot.src='../gardens/previews/'+REAL_PLAY_IMAGES[id]+'-play.jpg?v=20261022-curated-realplay5';
  shot.alt='';shot.loading='eager';shot.decoding='async';
  shot.addEventListener('error',()=>{shot.remove();wrap.classList.remove('moa-assigned-has-source');},{once:true});
  scene.append(shot);wrap.classList.add('moa-assigned-has-source');
 }
 const model=FALLBACK_SCENES[id]||{icons:['🌱','👀','🧩'],caption:'보고 생각하며 풀어보기'};
 const drawing=E('div','moa-assigned-fallback');
 const icons=E('div','moa-assigned-fallback-icons');
 for(const icon of model.icons)icons.append(E('span','',icon));
 drawing.append(icons,E('small','moa-assigned-fallback-caption',model.caption));
 scene.append(drawing);wrap.append(scene);
 fillAssignedScene(wrap);
 return wrap;
}
function updateSharedMenu(){
 if(!active)return;
 document.body.classList.add('moa-assigned');
 document.body.classList.toggle('moa-assigned-calm',active.view==='calm');
 const old=$('#moaAssignedHome');if(old)old.remove();
 const panel=E('section','moa-assigned-home');panel.id='moaAssignedHome';panel.setAttribute('aria-label','선택된 연습 활동');
 const calm=active.view==='calm';
 const hero=E('div','moa-assigned-hero');
 hero.append(
  E('span','moa-assigned-eyebrow',calm?'선택한 활동':'🌱 모아의 오늘 연습'),
  E('h1','',calm?'나에게 필요한 활동':'준비한 활동만 모아뒀어요'),
  E('p','',calm?'필요한 활동을 골라 진행하면 됩니다. 전부 한 번에 할 필요는 없어요.':'마음에 드는 활동부터 시작해요. 오늘은 한 가지만 해도 괜찮아요.')
 );
 const notice=E('p','moa-assigned-detail',active.items.length+'개 활동 · 게임마다 연습량이 다를 수 있어요.');
 hero.append(notice);if(visited.size){hero.append(E('p','moa-assigned-progress',(calm?'✓ ':'🌱 ')+visited.size+'개 활동을 이 화면에서 해봤어요.'));}panel.append(hero);
 const grid=E('div','moa-assigned-list');
 active.items.forEach((id,i)=>{
  const game=library.find(x=>x.id===id),material=materialMap.get(id),card=E('article','moa-assigned-item');
  const n=E('span','moa-assigned-number',visited.has(id)?(calm?'✓ 해봤어요':'🌼 해봤어요'):String(i+1).padStart(2,'0'));card.append(n);
  card.append(makeAssignedVisual(id,!!game));
  const title=E('h2','',game?.title||material?.title||id);card.append(title);
  const desc=E('p','',game?.desc||material?.desc||'');card.append(desc);
  if(game&&!external[id]){
   const opt=active.settings?.[id]||{},n=opt.rounds||roundChoices(id).find(x=>x>=active.rounds)||roundChoices(id).at(-1);
   card.append(E('small','moa-assigned-options',(['','쉬움','보통','확장'][opt.level||active.level])+' · '+n+'문제'));
  }
  if(game){
   const action=E('button','moa-assigned-start','🎮 게임 시작하기 →');
   action.type='button';action.addEventListener('click',()=>play(id));card.append(action);
  }else{
   const a=E('button','moa-assigned-start','📄 '+material.title+' 열기 →');
   a.type='button';a.addEventListener('click',()=>embed(material.href,material.title,true));card.append(a);
  }
  grid.append(card);
 });
 panel.append(grid);
 const homeHelp=E('details','moa-assigned-home-help');
 homeHelp.append(E('summary','','🏠 집에서 함께할 때'));
 const tips=E('div','moa-assigned-home-help-body');
 const points=[
  '오늘은 한 가지 활동만 해도 괜찮아요. 쉬고 싶으면 멈춰도 됩니다.',
  '아이가 읽기 어렵다면 설명을 짧게 읽어주고, 답은 대신 골라주지 않아요.',
  '아이가 화가 나거나 피곤해하면 쉬었다가 다른 날 해도 됩니다.',
  '활동 결과는 선생님에게 자동으로 전송되지 않아요. 필요할 때 해본 활동이나 어려웠던 점만 직접 전해주세요.'
 ];
 points.forEach(tipsText=>tips.append(E('p','',tipsText)));homeHelp.append(tips);panel.append(homeHelp);
 const foot=E('p','moa-assigned-foot','선택된 활동만 표시하는 공개 메뉴입니다. 로그인이나 접근 제한 기능이 아니며, 링크에 개인정보를 넣지 않았습니다. “해봤어요” 표시는 현재 열린 페이지에서만 유지되고, 새로고침이나 다른 기기에서는 초기화됩니다.');
 const editor=E('details','moa-assigned-editor');
 editor.append(E('summary','','선생님용 · 선택 목록 수정'));
 const edit=E('button','moa-assigned-exit','이 목록을 복사해 수정하기');edit.type='button';edit.onclick=()=>$('#moaPlannerLaunch')?.click();
 editor.append(edit,E('p','','수정하면 새로운 링크가 만들어져요. 이미 보낸 링크는 그대로 유지돼요.'));
 panel.append(foot,editor);
 $('#homeScreen').prepend(panel);
 refreshAssignedScenes();
}
function embed(path,title,isMaterial){
 const overlay=E('div','moa-assigned-embed');overlay.id='moaAssignedEmbed';
 const bar=E('div','moa-assigned-embedbar');
 const back=E('button','moa-assigned-exit','← 선택한 활동으로');back.type='button';back.onclick=()=>{overlay.remove();hooks.goHome();};
 bar.append(back,E('strong','',title));
 if(isMaterial){
  const a=E('a','moa-assigned-pdf-link','새 창에서 열기 ↗');a.href=path;a.target='_blank';a.rel='noopener';bar.append(a);
 }
 const frame=E('iframe','moa-assigned-frame');frame.src=path;frame.title=title;
 // Only the assigned activity that needs capture receives the matching
 // iframe capability. The browser still requests user permission on use.
 const modulePath=new URL(path,location.href).pathname;
 const mediaPermissions=[];
 if(!isMaterial&&modulePath.includes('/games/hand-mirror/'))mediaPermissions.push('camera');
 if(!isMaterial&&(modulePath.includes('/recorder/')||modulePath.includes('/breath-garden/')))
  mediaPermissions.push('microphone');
 mediaPermissions.push('fullscreen');
 frame.setAttribute('allow',mediaPermissions.join('; '));frame.loading='eager';
 // Standalone games run in this same-origin frame. Their normal 'back to all games'
 // links must not escape the caregiver's selected-only list.
 if(!isMaterial){
  const allowed=new URL(path,location.href);
  const selectedMission=allowed.pathname.includes('/moa-missions/')?allowed.searchParams.get('game'):null;
  const selectedMode=allowed.searchParams.get('mode');
  frame.addEventListener('load',()=>{
   if(!overlay.isConnected)return;
   try{
    const current=new URL(frame.contentWindow.location.href);
    // Match the exact selected game path. A different mission within the same
    // standalone module is not part of this child's curated assignment.
    const sameGame=current.origin===allowed.origin&&current.pathname===allowed.pathname
      &&(!selectedMission||current.searchParams.get('game')===selectedMission)
      &&(!selectedMode||current.searchParams.get('mode')===selectedMode);
    if(sameGame)return;
   }catch{}
   overlay.remove();hooks.goHome();
  });
 }
 overlay.append(bar,frame);document.body.append(overlay);
}
function play(id){
 lastPlayed=id;
 if(external[id]){embed(external[id],library.find(x=>x.id===id)?.title||'선택한 게임',false);return;}
 hooks.openPreview(id);
 const itemSettings=active.settings?.[id]||{};
 const level=$('#slowLevel');if(level)level.value=String(itemSettings.level||active.level);
 const count=$('#sessionRounds');
 if(count&&count.options.length){
  const opts=[...count.options].map(x=>Number(x.value));
  count.value=String(opts.find(x=>x>=(itemSettings.rounds||active.rounds))||opts[opts.length-1]);
 }
 if(id==='spacing'||id==='spelling'){
  const levels=['easy','normal','hard'],sel=levels[(itemSettings.level||active.level)-1];
  $('#literacyPracticeControls [data-level="'+sel+'"]')?.click();
  const amounts=[...document.querySelectorAll('#literacyPracticeControls [data-count]')].map(x=>Number(x.dataset.count));
  const n=amounts.find(x=>x>=(itemSettings.rounds||active.rounds))||amounts[amounts.length-1];
  $('#literacyPracticeControls [data-count="'+n+'"]')?.click();
 }
}
function returnToPlan(){if(!active)return false;updateSharedMenu();return true}
function afterResult(id){
 if(!active||!active.items.includes(id))return;
 visited.add(id);updateSharedMenu();
 const area=$('#resultScreen .result-actions');if(!area)return;
 area.querySelectorAll('.moa-assigned-next').forEach(b=>b.remove());
 const btn=E('button','moa-assigned-next','🌿 선택한 활동으로 돌아가기');btn.onclick=()=>hooks.goHome();area.prepend(btn);
 const next=active.items.find(x=>!visited.has(x));if(next){const item=library.find(x=>x.id===next)||materialMap.get(next);const move=E('button','moa-assigned-next','✨ 다음 활동: '+(item?.title||'모아의 모험'));move.onclick=()=>{if(materialMap.has(next)){hooks.goHome();embed(materialMap.get(next).href,materialMap.get(next).title,true)}else play(next)};area.prepend(move)}
}
function makeBuilder(){
 const entry=E('button','moa-planner-launch','🧺 필요한 활동만 골라 링크 만들기');entry.id='moaPlannerLaunch';entry.type='button';
 $('#gardenGamePanel')?.prepend(entry);
 const dialog=E('dialog','moa-plan-builder');dialog.id='moaPlanBuilder';
 const top=E('div','moa-plan-top');top.append(E('h2','','선생님이 골라주는 연습 🌱'),E('p','','게임·활동지를 고르면 선택한 것만 나오는 링크가 만들어져요. 아동 이름과 민감한 정보는 넣지 않아요.'));
 const close=E('button','moa-plan-close','×');close.type='button';close.setAttribute('aria-label','닫기');close.onclick=()=>dialog.close();top.prepend(close);
 const settings=E('div','moa-plan-settings');
 const lev=E('label','','권장 난이도 '),levels=E('select');levels.id='moaPlanLevel';[['1','쉬움'],['2','보통'],['3','확장']].forEach(([v,t])=>{const o=E('option','',t);o.value=v;levels.append(o)});lev.append(levels);
 const rnd=E('label','','기본 연습량 '),rounds=E('select');rounds.id='moaPlanRounds';[5,10,15,20].forEach(n=>{const o=E('option','',n+'문제');o.value=String(n);rounds.append(o)});rnd.append(rounds);const viewLabel=E('label','','공유 화면 '),viewSelect=E('select');viewSelect.id='moaPlanView';[['garden','모아 정원'],['calm','차분하게']].forEach(([v,t])=>{const option=E('option','',t);option.value=v;viewSelect.append(option)});viewLabel.append(viewSelect);settings.append(lev,rnd,viewLabel);
 const presetBox=E('div','moa-plan-presets');
 const presetTitle=E('strong','','활동 조합 예시');presetBox.append(presetTitle);
 const presets=[
  ['👀 시각탐색',['slowScan','sceneDetect','slowPdf']],
  ['🧩 시공간 구성',['slowPlace','slowBlock','mirrorPond','slowPdf']],
  ['✋ 멈춤·규칙 변경',['calm','resetRescue','rulePost']],
  ['🗣 명명·대답 조절',['slowName','resetRescue','slowSheets']],
  ['🎒 생활·계획',['slowEveryday','classroomMove','festivalPlan','clinicalGuide']],
  ['✍️ 읽기·쓰기',['spacing','spelling','clinicalGuide']]
 ];
 const presetList=E('div','moa-plan-preset-buttons');presetBox.append(presetList);
 const selection=E('div','moa-plan-selection');selection.id='moaPlanSelection';
 const rows=[...library.map(x=>({...x,resource:false})),...MATERIALS.map(x=>({...x,resource:true}))];
 rows.forEach(item=>{
  const label=E('label','moa-plan-row');const check=E('input');check.type='checkbox';check.value=item.id;check.name='moaPlanPick';
  const body=E('span');body.append(E('strong','',item.title),E('small','',item.resource?'📄 활동지·자료':item.desc));label.append(check,body);selection.append(label);
 });
 const chosenOrder=[],perItem={};
 const orderBox=E('section','moa-plan-order');orderBox.id='moaPlanOrder';
 orderBox.append(E('strong','','선택한 활동 순서'));
 const orderList=E('div','moa-plan-order-list');orderBox.append(orderList);
 function dirty(){output.hidden=true;}
 function renderOrder(){
  orderList.replaceChildren();
  if(!chosenOrder.length){orderList.append(E('p','moa-plan-empty','활동을 고르면 이곳에서 순서를 바꿀 수 있어요.'));return;}
  chosenOrder.forEach((id,index)=>{
   const info=rows.find(x=>x.id===id),line=E('div','moa-choice-row');line.dataset.choice=id;
   const heading=E('div','moa-choice-head');heading.append(E('span','moa-choice-num',String(index+1)),E('strong','',info?.title||id));
   const controls=E('div','moa-choice-arrows');
   for(const [dir,label] of [[-1,'↑'],[1,'↓']]){
    const b=E('button','moa-choice-shift',label);b.type='button';b.disabled=index+dir<0||index+dir>=chosenOrder.length;
    b.setAttribute('aria-label',(info?.title||id)+' '+(dir<0?'위로':'아래로')+' 이동');
    b.onclick=()=>{[chosenOrder[index],chosenOrder[index+dir]]=[chosenOrder[index+dir],chosenOrder[index]];renderOrder();dirty();};
    controls.append(b);
   }
   heading.append(controls);line.append(heading);
   if(!info?.resource&&!external[id]){
    const details=E('details','moa-choice-settings');details.append(E('summary','','이 게임만 다르게 설정'));
    const fields=E('div','moa-choice-fields');
    const lv=E('label','','난이도'),lvSel=E('select');lvSel.dataset.setting='level';
    [['','전체 설정'],['1','쉬움'],['2','보통'],['3','확장']].forEach(([v,t])=>{const opt=E('option','',t);opt.value=v;lvSel.append(opt)});
    lvSel.value=String(perItem[id]?.level||'');lvSel.onchange=()=>{perItem[id]??={};if(lvSel.value)perItem[id].level=Number(lvSel.value);else delete perItem[id].level;dirty();};lv.append(lvSel);
    const rd=E('label','','문제 수'),rdSel=E('select');rdSel.dataset.setting='rounds';
    [['','전체 설정'],...roundChoices(id).map(x=>[String(x),x+'문제'])].forEach(([v,t])=>{const opt=E('option','',t);opt.value=v;rdSel.append(opt)});
    rdSel.value=String(perItem[id]?.rounds||'');rdSel.onchange=()=>{perItem[id]??={};if(rdSel.value)perItem[id].rounds=Number(rdSel.value);else delete perItem[id].rounds;dirty();};rd.append(rdSel);
    fields.append(lv,rd);details.append(fields);line.append(details);
   }else if(external[id])line.append(E('small','moa-choice-note','이 게임은 자체 난이도·진행 방식을 사용해요.'));
   orderList.append(line);
  });
 }
 function syncOrder(){
  const checked=[...selection.querySelectorAll('input:checked')].map(x=>x.value);
  for(let i=chosenOrder.length-1;i>=0;i--)if(!checked.includes(chosenOrder[i]))chosenOrder.splice(i,1);
  for(const id of checked)if(!chosenOrder.includes(id))chosenOrder.push(id);
  renderOrder();
 }
 presets.forEach(([title,ids])=>{const btn=E('button','moa-plan-preset',title);btn.type='button';btn.onclick=()=>{selection.querySelectorAll('input').forEach(input=>{input.checked=ids.includes(input.value)});chosenOrder.splice(0,chosenOrder.length,...ids.filter(id=>rows.some(x=>x.id===id)));selection.dispatchEvent(new Event('change'));};presetList.append(btn);});
 const msg=E('p','moa-plan-status','필요한 게임과 활동지를 선택하세요.');msg.id='moaPlanStatus';msg.setAttribute('role','status');
 const output=E('div','moa-plan-output');output.hidden=true;output.id='moaPlanOutput';
 const url=E('input');url.readOnly=true;url.setAttribute('aria-label','생성한 맞춤 연습 링크');url.id='moaPlanLink';
 const copy=E('button','moa-assigned-start','링크 복사');copy.type='button';copy.id='moaPlanCopy';copy.onclick=async()=>{try{await navigator.clipboard.writeText(url.value);msg.textContent='링크를 복사했어요. 카카오톡으로 공유할 수 있어요.';}catch{url.focus();url.select();msg.textContent='링크를 선택했어요. 복사해서 카카오톡에 붙여 넣으세요.';}};
 const preview=E('a','','만든 화면 미리보기 ↗');preview.id='moaPlanPreview';preview.target='_blank';preview.rel='noopener';
 output.append(url,copy,preview);
 const create=E('button','moa-plan-create','선택한 활동 링크 만들기');create.type='button';create.onclick=()=>{
  const ids=[...chosenOrder];
  if(!ids.length){msg.textContent='게임이나 활동지를 하나 이상 골라주세요.';output.hidden=true;return}
  if(ids.length>LIMIT){msg.textContent='한 링크에는 최대 '+LIMIT+'개까지 담을 수 있어요. 중요한 활동만 골라주세요.';output.hidden=true;return}
  const model=safePlan({v:2,items:ids,level:Number(levels.value),rounds:Number(rounds.value),settings:perItem,view:viewSelect.value});
  if(!model){msg.textContent='선택 항목을 확인해 주세요.';return}
  const link=shareUrl(model);url.value=link;preview.href=link;output.hidden=false;
  msg.textContent=model.items.length+'개 활동으로 만들었어요. 복사해서 보호자에게 전달할 수 있어요.';
 };
 selection.addEventListener('change',()=>{syncOrder();const count=chosenOrder.length;msg.textContent='선택한 활동 '+count+'개 (최대 '+LIMIT+'개)';output.hidden=true});
 levels.onchange=dirty;rounds.onchange=dirty;viewSelect.onchange=dirty;
 dialog.append(top,settings,presetBox,selection,orderBox,create,msg,output);document.body.append(dialog);
 renderOrder();
 entry.onclick=()=>{
  if(active){
   selection.querySelectorAll('input').forEach(input=>{input.checked=active.items.includes(input.value)});
   chosenOrder.splice(0,chosenOrder.length,...active.items);
   Object.keys(perItem).forEach(k=>delete perItem[k]);
   Object.assign(perItem,JSON.parse(JSON.stringify(active.settings||{})));
   levels.value=String(active.level);rounds.value=String(active.rounds);viewSelect.value=active.view||'garden';
   syncOrder();dirty();msg.textContent='기존 목록을 불러왔어요. 바꾼 뒤 새 링크를 만들 수 있어요.';
  }
  dialog.showModal();
 };
}
function init(o){
 if(!$('#homeScreen')||!o?.openPreview)return;
 hooks=o;library=allGames();makeBuilder();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refreshAssignedScenes,{once:true});
 const token=new URLSearchParams(location.search).get(CODE);
 if(token){const plan=safePlan(unpack(token));
  if(plan){active=plan;updateSharedMenu();hooks.show('home');}
  else{const warning=E('p','moa-plan-invalid','활동 링크가 유효하지 않습니다. 선생님에게 새 링크를 요청해 주세요.');$('#homeScreen').prepend(warning);}
 }
}
window.MoaAssignment={init,returnToPlan,afterResult,get active(){return active}};
})();

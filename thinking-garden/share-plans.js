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
const external={rescue:'games/rescue/',handMirror:'games/hand-mirror/'};
let active=null,library=[],materialMap=new Map(MATERIALS.map(x=>[x.id,x])),hooks={},lastPlayed=null,visited=new Set();
const $=q=>document.querySelector(q), E=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e};
const allGames=()=>[...document.querySelectorAll('.library-card[data-open]')].map(c=>({id:c.dataset.open,title:c.querySelector('h3')?.textContent.trim()||c.dataset.open,desc:c.querySelector('p')?.textContent.trim()||'',category:c.dataset.category||'all'})).filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i);
function pack(x){return btoa(unescape(encodeURIComponent(JSON.stringify(x)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function unpack(input){
 if(!input||input.length>2800)return null;
 try{const json=decodeURIComponent(escape(atob(input.replace(/-/g,'+').replace(/_/g,'/'))));return JSON.parse(json)}catch{return null}
}
function safePlan(o){
 if(!o||o.v!==1||!Array.isArray(o.items))return null;
 const valid=new Set(library.map(x=>x.id));
 const picked=[],seen=new Set();
 for(const item of o.items){
  if(typeof item!=='string'||item.length>40||seen.has(item))continue;
  if(valid.has(item)||materialMap.has(item)){picked.push(item);seen.add(item)}
  if(picked.length>=LIMIT)break;
 }
 if(!picked.length)return null;
 return {v:1,items:picked,level:Math.min(3,Math.max(1,Number(o.level)||1)),rounds:[5,10,15,20].includes(Number(o.rounds))?Number(o.rounds):5};
}
function shareUrl(plan){const u=new URL(location.pathname,location.origin);u.searchParams.set(CODE,pack(plan));return u.href}
function updateSharedMenu(){
 if(!active)return;
 document.body.classList.add('moa-assigned');
 const old=$('#moaAssignedHome');if(old)old.remove();
 const panel=E('section','moa-assigned-home');panel.id='moaAssignedHome';panel.setAttribute('aria-label','선택된 연습 활동');
 const hero=E('div','moa-assigned-hero');hero.append(E('span','moa-assigned-eyebrow','🌱 모아의 오늘 연습'),E('h1','', '준비한 활동만 모아뒀어요'),E('p','', '원하는 활동부터 시작해요. 서두르지 않아도 괜찮아요.'));
 const notice=E('p','moa-assigned-detail',active.items.length+'개 활동 · '+(['','쉬움','보통','확장'][active.level])+' 난이도 · '+active.rounds+'문제 기본 연습');
 hero.append(notice);if(visited.size){hero.append(E('p','moa-assigned-progress','🌱 '+visited.size+'개 활동을 해봤어요. 다음 활동도 천천히 이어갈 수 있어요.'));}panel.append(hero);
 const grid=E('div','moa-assigned-list');
 active.items.forEach((id,i)=>{
  const game=library.find(x=>x.id===id),material=materialMap.get(id),card=E('article','moa-assigned-item');
  const n=E('span','moa-assigned-number',visited.has(id)?'🌼 해봤어요':String(i+1).padStart(2,'0'));card.append(n);
  const title=E('h2','',game?.title||material?.title||id);card.append(title);
  const desc=E('p','',game?.desc||material?.desc||'');card.append(desc);
  if(game){
   const action=E('button','moa-assigned-start','🎮 '+game.title+' 시작 →');
   action.type='button';action.addEventListener('click',()=>play(id));card.append(action);
  }else{
   const a=E('button','moa-assigned-start','📄 '+material.title+' 열기 →');
   a.type='button';a.addEventListener('click',()=>embed(material.href,material.title,true));card.append(a);
  }
  grid.append(card);
 });
 panel.append(grid);
 const foot=E('p','moa-assigned-foot','선생님이 선택한 활동만 표시합니다. 개인정보는 링크에 들어 있지 않아요.');panel.append(foot);
 $('#homeScreen').prepend(panel);
}
function embed(path,title,isMaterial){
 const overlay=E('div','moa-assigned-embed');overlay.id='moaAssignedEmbed';
 const bar=E('div','moa-assigned-embedbar');
 const back=E('button','moa-assigned-exit','← 선택한 활동으로');back.type='button';back.onclick=()=>{overlay.remove();hooks.goHome();};
 bar.append(back,E('strong','',title));
 if(isMaterial){
  const a=E('a','moa-assigned-pdf-link','새 창에서 열기 ↗');a.href=path;a.target='_blank';a.rel='noopener';bar.append(a);
 }
 const frame=E('iframe','moa-assigned-frame');frame.src=path;frame.title=title;frame.setAttribute('allow','camera; microphone; fullscreen');frame.loading='eager';
 overlay.append(bar,frame);document.body.append(overlay);
}
function play(id){
 lastPlayed=id;
 if(external[id]){embed(external[id],library.find(x=>x.id===id)?.title||'선택한 게임',false);return;}
 hooks.openPreview(id);
 const level=$('#slowLevel');if(level)level.value=String(active.level);
 const count=$('#sessionRounds');
 if(count&&count.options.length){
  const opts=[...count.options].map(x=>Number(x.value));
  count.value=String(opts.find(x=>x>=active.rounds)||opts[opts.length-1]);
 }
 if(id==='spacing'||id==='spelling'){
  const levels=['easy','normal','hard'],sel=levels[active.level-1];
  $('#literacyPracticeControls [data-level="'+sel+'"]')?.click();
  const amounts=[...document.querySelectorAll('#literacyPracticeControls [data-count]')].map(x=>Number(x.dataset.count));
  const n=amounts.find(x=>x>=active.rounds)||amounts[amounts.length-1];
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
 const rnd=E('label','','기본 연습량 '),rounds=E('select');rounds.id='moaPlanRounds';[5,10,15,20].forEach(n=>{const o=E('option','',n+'문제');o.value=String(n);rounds.append(o)});rnd.append(rounds);settings.append(lev,rnd);
 const selection=E('div','moa-plan-selection');selection.id='moaPlanSelection';
 const rows=[...library.map(x=>({...x,resource:false})),...MATERIALS.map(x=>({...x,resource:true}))];
 rows.forEach(item=>{
  const label=E('label','moa-plan-row');const check=E('input');check.type='checkbox';check.value=item.id;check.name='moaPlanPick';
  const body=E('span');body.append(E('strong','',item.title),E('small','',item.resource?'📄 활동지·자료':item.desc));label.append(check,body);selection.append(label);
 });
 const msg=E('p','moa-plan-status','필요한 게임과 활동지를 선택하세요.');msg.id='moaPlanStatus';msg.setAttribute('role','status');
 const output=E('div','moa-plan-output');output.hidden=true;output.id='moaPlanOutput';
 const url=E('input');url.readOnly=true;url.setAttribute('aria-label','생성한 맞춤 연습 링크');url.id='moaPlanLink';
 const copy=E('button','moa-assigned-start','링크 복사');copy.type='button';copy.id='moaPlanCopy';copy.onclick=async()=>{try{await navigator.clipboard.writeText(url.value);msg.textContent='링크를 복사했어요. 카카오톡으로 공유할 수 있어요.';}catch{url.focus();url.select();msg.textContent='링크를 선택했어요. 복사해서 카카오톡에 붙여 넣으세요.';}};
 const preview=E('a','','만든 화면 미리보기 ↗');preview.id='moaPlanPreview';preview.target='_blank';preview.rel='noopener';
 output.append(url,copy,preview);
 const create=E('button','moa-plan-create','선택한 활동 링크 만들기');create.type='button';create.onclick=()=>{
  const ids=[...selection.querySelectorAll('input:checked')].map(x=>x.value);
  if(!ids.length){msg.textContent='게임이나 활동지를 하나 이상 골라주세요.';output.hidden=true;return}
  if(ids.length>LIMIT){msg.textContent='한 링크에는 최대 '+LIMIT+'개까지 담을 수 있어요. 중요한 활동만 골라주세요.';output.hidden=true;return}
  const model=safePlan({v:1,items:ids,level:Number(levels.value),rounds:Number(rounds.value)});
  if(!model){msg.textContent='선택 항목을 확인해 주세요.';return}
  const link=shareUrl(model);url.value=link;preview.href=link;output.hidden=false;
  msg.textContent=model.items.length+'개 활동으로 만들었어요. 복사해서 보호자에게 전달할 수 있어요.';
 };
 selection.addEventListener('change',()=>{const count=selection.querySelectorAll('input:checked').length;msg.textContent='선택한 활동 '+count+'개 (최대 '+LIMIT+'개)';output.hidden=true});
 dialog.append(top,settings,selection,create,msg,output);document.body.append(dialog);
 entry.onclick=()=>dialog.showModal();
}
function init(o){
 if(!$('#homeScreen')||!o?.openPreview)return;
 hooks=o;library=allGames();makeBuilder();
 const token=new URLSearchParams(location.search).get(CODE);
 if(token){const plan=safePlan(unpack(token));
  if(plan){active=plan;updateSharedMenu();hooks.show('home');}
  else{const warning=E('p','moa-plan-invalid','활동 링크가 유효하지 않습니다. 선생님에게 새 링크를 요청해 주세요.');$('#homeScreen').prepend(warning);}
 }
}
window.MoaAssignment={init,returnToPlan,afterResult,get active(){return active}};
})();

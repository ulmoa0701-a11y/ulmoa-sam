/* The shared MoA play HUD improves clarity, not the underlying game's rules.
   Labels describe the actual actions, not claimed treatment outcomes. */
(()=>{
'use strict';
const DETAILS={"모아 구조대!":{"icon":"🎯","action":"목표 단서 확인","description":"색·크기·동물을 모두 비교해 친구를 찾아요.","steps":["📡 무전 듣기","👀 색·크기·동물 확인","🚐 조건에 맞는 친구 선택"],"tag":"찾기·집중"},"기억꽃길 이어가기":{"icon":"🧠","action":"순서 기억하기","description":"주문표를 보고 순서대로 바구니에 담아요.","steps":["👀 주문표 자세히 보기","🧠 순서 떠올리기","🧺 같은 순서로 담기"],"tag":"기억하기"},"쌍둥이 모양 찾기":{"icon":"🔷","action":"모양만 비교하기","description":"색이 달라도 모양이 같은 것을 골라요.","steps":["👁️ 위의 기준 모양 보기","🔎 색보다 모양 비교","👆 같은 모양 누르기"],"tag":"모양 구별"},"꽃만 쏙쏙 찾기":{"icon":"🌼","action":"꽃만 골라 누르기","description":"잎·돌·버섯은 두고 꽃을 모두 찾아요.","steps":["🌷 꽃 그림 확인","👀 전체 그림 살펴보기","✅ 꽃만 빠짐없이 선택"],"tag":"찾기·집중"},"잎사귀 숨은친구":{"icon":"🐾","action":"발자국 있는 잎사귀 찾기","description":"발자국을 보고 무당벌레가 있는 잎사귀를 골라요.","steps":["🐾 발자국 모양 살피기","🍃 그 잎사귀 열기","🐞 친구 찾기"],"tag":"탐색·확인"},"반짝이 길 따라가기":{"icon":"🦋","action":"빛난 자리부터 누르기","description":"차례로 표시되는 자리를 따라가요.","steps":["👀 지금 빛나는 자리 보기","👆 표시된 자리 누르기","➡️ 다음 표시 따라가기"],"tag":"차례대로 따라가기"},"초록불에 톡!":{"icon":"🚦","action":"신호 보고 기다리기","description":"빨강·노랑에는 기다리고 초록에만 눌러요.","steps":["🔴 기다리기","🟢 초록 신호 확인","👆 초록일 때 누르기"],"tag":"신호·억제"},"정원 안에 별 심기":{"icon":"⭐","action":"울타리 안쪽 누르기","description":"정해진 영역 안에만 별을 심어요.","steps":["👀 울타리 경계 확인","📍 안쪽 자리 찾기","⭐ 울타리 안에 별 심기"],"tag":"공간·손 조절"},"하나씩 깨우기":{"icon":"🌱","action":"꽃씨를 빠뜨리지 않고 깨우기","description":"아직 잠든 꽃씨를 찾아 한 번씩 눌러 꽃을 피워요.","steps":["👀 아직 잠든 꽃씨 찾기","☝️ 꽃씨 한 개씩 누르기","🌼 꽃이 모두 폈는지 확인"],"tag":"하나씩 확인"},"정원길 쓱싹 칠하기":{"icon":"🖌️","action":"길 안쪽 칠하기","description":"선 안쪽을 손으로 움직여 채워요.","steps":["🛤️ 칠할 길 확인","☝️ 선 안에서 움직이기","🎨 빈 곳 채우기"],"tag":"눈손협응"},"시든 꽃 깨우기":{"icon":"💧","action":"시든 꽃 찾아 물주기","description":"시든 꽃을 찾아 하나씩 물을 줘요.","steps":["👀 시든 꽃 구별하기","💧 꽃에 물 주기","🌸 남은 꽃 확인"],"tag":"찾기·마무리"},"꽃과 단서 찾기":{"icon":"🔍","action":"단서에 맞는 꽃 찾기","description":"잎과 돌 사이에서 목표 꽃만 찾아요.","steps":["🔎 목표 단서 확인","🌿 여러 위치 차근차근 보기","🌼 조건에 맞는 꽃 선택"],"tag":"시각탐색"},"정원 지도 따라 놓기":{"icon":"🗺️","action":"보고 같은 위치에 놓기","description":"지도에서 본 위치에 꽃을 배치해요.","steps":["👀 지도에서 자리 보기","📍 같은 자리 확인","🌷 해당 위치에 놓기"],"tag":"공간위치"},"블록 건축가":{"icon":"🧱","action":"모양 보고 블록 놓기","description":"방향과 맞닿는 부분을 비교해 모양을 만들어요.","steps":["🧩 목표 모양 살펴보기","🔎 블록 방향 비교","🧱 같은 구조 만들기"],"tag":"공간구성"},"친구 이름 탐정":{"icon":"🐰","action":"보고 이름 말하기","description":"그림 속 친구의 이름을 확인해 말하거나 골라요.","steps":["👀 친구 그림 보기","🗣️ 이름 생각하기","✅ 반응 뒤 다시 확인"],"tag":"명칭·표현"},"꽃자리 기억하기":{"icon":"🌸","action":"꽃이 있던 자리 기억하기","description":"가려진 뒤 처음 꽃이 있던 위치를 찾아요.","steps":["👀 꽃 위치 보기","🧠 가려진 위치 떠올리기","📍 같은 자리 누르기"],"tag":"위치기억"},"가방 준비 탐험":{"icon":"🎒","action":"필요한 준비물 고르기","description":"목적에 맞는 물건을 골라 가방을 꾸려요.","steps":["📋 필요한 물건 확인","👀 물건 중에서 찾기","🎒 가방에 넣고 확인"],"tag":"생활학습"},"꼬인 신호 구조대":{"icon":"📻","action":"안내가 맞는지 점검","description":"길잡이 말이 틀릴 수도 있어요. 직접 확인해요.","steps":["🎯 찾을 친구 확인","🤖 추천과 목표 비교","✋ 맞는지 판단 후 선택"],"tag":"자기점검"},"우리 교실 이사작전":{"icon":"🏫","action":"지시에 따라 자리 정하기","description":"오른쪽·왼쪽 등 위치 지시에 맞게 물건을 놓아요.","steps":["👂 물건과 위치 지시 확인","📍 책상 기준 방향 찾기","🧺 물건 배치하고 확인"],"tag":"공간·지시"},"축제 준비 대작전":{"icon":"🎪","action":"단서로 순서 계획하기","description":"여러 단서를 연결해 준비 순서를 정해요.","steps":["📋 할 일과 단서 확인","🔁 먼저 할 것 연결","✅ 순서 완성하고 점검"],"tag":"계획·추론"},"바뀌는 바람우체국":{"icon":"✉️","action":"바뀐 규칙 적용하기","description":"지금 규칙이 색인지 모양인지 확인해요.","steps":["🔎 현재 규칙 읽기","🔄 규칙이 바뀌면 다시 보기","📮 지금 기준으로 배달"],"tag":"규칙전환"},"거울연못의 비밀":{"icon":"🪞","action":"뒤집힌 모양 비교하기","description":"좌우·상하·회전에 따라 바뀐 위치를 찾아요.","steps":["👀 처음 그림 보기","↔️ 어떻게 뒤집히는지 보기","🧩 바뀐 모양 선택"],"tag":"공간추론"},"숲속 장면 탐정":{"icon":"🕵️","action":"달라진 부분 찾기","description":"처음 장면과 나중 장면을 비교해요.","steps":["👀 처음 장면 기억","🔄 다음 장면 확인","🔎 달라진 위치 찾기"],"tag":"변화탐지"},"띄어쓰기 다리 놓기":{"icon":"📝","action":"띄어쓸 자리 고르기","description":"붙어 있는 문장에서 말 덩어리 사이를 찾아요.","steps":["📖 문장 끝까지 읽기","👆 띄어쓸 자리 표시","✅ 띄어쓰기 확인"],"tag":"한글·국어"},"고장 난 간판 고치기":{"icon":"🪧","action":"맞는 글자 골라 고치기","description":"헷갈리는 표현을 비교해 간판을 고쳐요.","steps":["👀 간판 글자 살펴보기","🧠 두 표현 비교하기","🛠️ 알맞게 고쳐보기"],"tag":"맞춤법"}};
const title=document.getElementById('gameTitle'), screen=document.getElementById('gameScreen');
const area=document.getElementById('gameArea');
if(!title||!screen||!area)return;
const hud=document.createElement('aside');
hud.className='moa-play-compass';
hud.setAttribute('aria-label','현재 게임의 목표와 방법');
hud.innerHTML='<div class="moa-compass-main"><div class="moa-compass-icon" aria-hidden="true">🌱</div><div class="moa-compass-copy"><span class="moa-compass-tag">오늘 할 일</span><strong class="moa-compass-goal">게임을 준비하고 있어요.</strong><p class="moa-compass-desc"></p></div><button type="button" class="moa-compass-help" aria-expanded="false" aria-controls="moaCompassSteps">방법 보기 <span aria-hidden="true">▾</span></button></div><div class="moa-compass-steps" id="moaCompassSteps" hidden><ol></ol><p>틀려도 다시 살펴볼 수 있어요. 서두르지 않아도 돼요.</p></div>';
area.before(hud);
const icon=hud.querySelector('.moa-compass-icon'),tag=hud.querySelector('.moa-compass-tag'),goal=hud.querySelector('.moa-compass-goal'),desc=hud.querySelector('.moa-compass-desc'),steps=hud.querySelector('.moa-compass-steps'),showButton=hud.querySelector('.moa-compass-help');
let previous='';
showButton.addEventListener('click',()=>{const expanded=showButton.getAttribute('aria-expanded')==='true';showButton.setAttribute('aria-expanded',String(!expanded));steps.hidden=expanded;showButton.querySelector('span').textContent=expanded?'▾':'▴'});
function update(){
 if(!screen.classList.contains('active'))return;
 const game=DETAILS[title.textContent?.trim()];
 if(!game){hud.hidden=true;return}
 hud.hidden=false;
 if(previous!==title.textContent){
  previous=title.textContent;icon.textContent=game.icon;tag.textContent=game.tag;goal.textContent=game.action;desc.textContent=game.description;
  steps.querySelector('ol').innerHTML='';
  for(const [i,step] of game.steps.entries()){
   const li=document.createElement('li'),num=document.createElement('span'),txt=document.createElement('span');
   num.className='moa-step-number';num.textContent=String(i+1);txt.textContent=step;li.append(num,txt);steps.querySelector('ol').append(li);
  }
  steps.hidden=true;showButton.setAttribute('aria-expanded','false');showButton.querySelector('span').textContent='▾';
 }
}
const observer=new MutationObserver(update);
observer.observe(title,{subtree:true,childList:true,characterData:true});
observer.observe(screen,{attributes:true,attributeFilter:['class']});
document.querySelector('#backHome')?.addEventListener('click',()=>{steps.hidden=true;showButton.setAttribute('aria-expanded','false')});
update();
})();
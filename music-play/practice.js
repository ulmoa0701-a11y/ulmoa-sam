/* 실제 악기 연계 활동: 4개 악기 × 3단계, 한 번에 한 장 출력 */
(()=>{'use strict';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const data={
guitar:{name:'🎸 기타',levels:[
{title:'줄 하나 톡! 쉬어요',goal:'기타 줄 한 개를 연주하는 박과 쉬는 박을 구별해요.',notes:['🎸','○','🎸','○'],legend:'🎸 줄 한 번 튕기기　　○ 소리 없이 쉬기',action:'선생님이 정해 준 줄 하나만 사용해요. 네 박을 천천히 세며 그림에 맞춰 튕겨 보세요.',target:'소리 나는 두 박을 구별하여 시도하기',teacher:'연주 직전에 손의 위치를 확인하세요. 코드를 요구하지 않고 한 줄만 연습합니다.',links:[['🥁 2박·4박 리듬 따라하기','../rhythm-garden/?mode=echo']]},
{title:'한 박 쉬고 다시!',goal:'같은 기타 줄 한 개로 4박 리듬을 만들어요.',notes:['🎸','🎸','○','🎸'],legend:'🎸 같은 줄 한 번 튕기기　　○ 쉬기',action:'선생님과 손뼉으로 네 박을 확인해요. 그 리듬 그대로 줄 하나를 연주해 보세요.',target:'동일한 줄에서 소리/쉼을 일정한 순서로 유지하기',teacher:'코드·줄 번호는 바꾸지 않습니다. 속도나 리듬 중 한 조건만 조절하세요.',links:[['🥁 리듬을 직접 만들기','../rhythm-garden/?mode=make']]},
{title:'한 코드에서 다음 코드로',goal:'이미 익힌 코드 두 개를 4박씩 유지하며 바꿔요.',notes:['①','①','①','①'],legend:'① = 이미 배운 코드 한 가지, 4박 동안 유지',action:'먼저 아는 코드 ①로 4번 다운 스트럼해요. 다음 네 박에서는 이미 배운 코드 ②로 바꿔 연주해요.',target:'익힌 한 가지 리듬을 유지하면서 마디 사이에 코드만 바꿔 보기',teacher:'새 코드 운지부터 배우는 날에는 코드 바꾸기까지 동시에 요구하지 않습니다. 곡의 원본 반주와 별도로 연습합니다.',links:[['🎼 악기 리듬을 합쳐 보기','../ensemble-garden/?view=compose']]}
]},
piano:{name:'🎹 피아노',levels:[
{title:'건반 하나 톡톡',goal:'선생님이 지정한 건반 하나를 한 박씩 눌러요.',notes:['🎹','○','🎹','○'],legend:'🎹 같은 건반 누르기　　○ 소리 없이 쉬기',action:'한 건반을 스티커로 표시해요. 같은 건반을 두 번 눌러 소리와 쉼을 구별해요.',target:'선택된 건반 1개에서 연주/쉼을 구별하기',teacher:'손가락 번호·화음 등 다른 요구는 추가하지 않습니다.',links:[['🥁 리듬정원 듣고 따라하기','../rhythm-garden/?mode=echo']]},
{title:'높은 소리? 낮은 소리?',goal:'두 건반의 높낮이만 비교해요.',notes:['⬇️','⬆️','⬇️','⬆️'],legend:'⬇️ 낮은 건반　　⬆️ 높은 건반',action:'선생님이 정한 낮은 건반과 높은 건반을 차례로 들어요. 그림에 따라 맞는 건반을 눌러 보세요.',target:'두 건반 중 높은 소리/낮은 소리 구별하기',teacher:'건반 사이 거리는 유지하고, 빠르기·음량은 같게 제시합니다.',links:[['🎧 높낮이 소리 구별하기','../music-explore/?concept=pitch']]},
{title:'도·미·솔 순서',goal:'도·미·솔 세 건반을 눈과 귀로 따라가요.',notes:['도','미','솔','미'],legend:'도 → 미 → 솔 → 미 (동일한 속도로)',action:'스티커로 도·미·솔 위치를 표시해요. 먼저 한 음씩 듣고, 네 칸을 왼쪽에서 오른쪽으로 연주해 보세요.',target:'악보 네 음의 순서를 보고 연주해 보기',teacher:'음높이 순서가 목표이므로 양손 연주나 박자 정확도는 동시에 요구하지 않습니다.',links:[['🌈 멜로디 만들기','../sound-garden/']]}
]},
boom:{name:'🟧 붐웨커',levels:[
{title:'한 색으로 쿵! 쉼!',goal:'정해진 붐웨커 하나로 소리/쉼을 구별해요.',notes:['🟧','○','🟧','○'],legend:'🟧 정한 붐웨커로 한 번 소리 내기　　○ 쉬기',action:'한 가지 붐웨커만 선택해요. 매트 등 안전한 곳을 치거나 적절한 방식으로 소리를 내요.',target:'같은 악기로 소리/쉼을 순서대로 시도하기',teacher:'색깔과 음이름은 보유한 붐웨커의 실제 표기를 확인해 주세요. 색이 음을 뜻한다는 일반화는 피합니다.',links:[['🥁 한 가지 리듬 따라하기','../rhythm-garden/?mode=echo']]},
{title:'두 악기가 번갈아',goal:'붐웨커 두 개를 순서에 맞게 선택해요.',notes:['①','②','①','②'],legend:'① 선생님이 정한 첫 악기　② 두 번째 악기',action:'실물 붐웨커에 ①·② 번호를 붙여요. 번갈아 소리 내는 순서를 따라가 보세요.',target:'서로 다른 두 악기의 순서 구별하기',teacher:'악기 소리 크기나 연주 방법은 같게 두고 두 악기 중 하나만 선택하게 해요.',links:[['🎼 악기 눌러보기','../ensemble-garden/?view=live']]},
{title:'서로의 차례 지키기',goal:'두 사람이 한 박씩 번갈아 연주해요.',notes:['①','②','①','②'],legend:'① 선생님 차례　　② 아이 차례',action:'각자 하나의 붐웨커를 맡아요. 한 박씩 번갈아 소리 내고, 끝나면 함께 만든 리듬을 들어요.',target:'자기 차례에만 연주하기',teacher:'초반에는 교사가 명확히 차례를 알려주고, 익숙해지면 신호를 줄여 보세요.',links:[['🥁 번갈아 연주하기','../rhythm-garden/?mode=turn']]}
]},
recorder:{name:'🪈 리코더',levels:[
{title:'손가락으로 막고 떼기',goal:'불기 전에 구멍 덮기와 떼기를 연습해요.',notes:['●','○','●','○'],legend:'● 지정한 구멍 덮기　　○ 손가락 떼기',action:'선생님이 고른 구멍 하나를 손가락으로 막았다 떼어 봐요. 이 단계에서는 소리를 내지 않아도 됩니다.',target:'지정한 구멍 위치를 구별해 손가락 움직이기',teacher:'손가락 위치가 목표이므로 호흡과 음정은 아직 요구하지 않습니다.',links:[['🪈 리코더 마법정원','../thinking-garden/recorder/']]},
{title:'한 음과 쉬는 박',goal:'한 가지 운지에서 소리와 쉼을 구별해요.',notes:['🪈','○','🪈','○'],legend:'🪈 배운 운지로 짧게 한 음　　○ 입에서 떼고 쉬기',action:'이미 배운 한 가지 운지를 잡아요. 짧고 편안하게 한 번 소리 낸 뒤 쉬는 박을 지켜요.',target:'한 가지 운지로 소리/쉼 패턴 따라하기',teacher:'악기에 무리하게 숨을 불어 넣지 않도록 하고, 필요하면 호흡·손가락 움직임을 분리해 연습합니다.',links:[['🥁 소리·쉼 듣고 따라하기','../rhythm-garden/?mode=echo']]},
{title:'두 가지 운지로 이어가기',goal:'익힌 두 가지 손 모양의 순서를 유지해요.',notes:['①','②','①','②'],legend:'① 배운 첫 운지　　② 배운 두 번째 운지',action:'교사가 이미 익힌 운지 두 개를 ①·②로 정해요. 손가락 모양을 바꾸는 연습 후 천천히 소리로 연결해요.',target:'두 운지를 순서대로 전환해 보기',teacher:'소리와 손가락 전환을 동시에 수행하기 어려우면 소리 없이 운지만 먼저 익힙니다.',links:[['🌈 소리 순서 따라하기','../sound-garden/']]}
]}
};
let instrument=['guitar','piano','boom','recorder'].includes(params.get('instrument'))?params.get('instrument'):'guitar';
let level=[1,2,3].includes(Number(params.get('level')))?Number(params.get('level')):1;
function render(){
 document.querySelectorAll('[data-instrument]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.instrument===instrument)));
 document.querySelectorAll('[data-practice-level]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.practiceLevel)===level)));
 const item=data[instrument],x=item.levels[level-1];
 $('pageLevel').textContent=['① 처음','② 연습','③ 도전'][level-1];
 $('pageTitle').textContent=item.name+' 이어하기';
 $('pageSubtitle').textContent=x.title;$('pageGoal').textContent=x.goal;
 $('pagePattern').textContent=x.legend;$('pageAction').textContent=x.action;$('pageTarget').textContent=x.target;
 $('teacherNote').textContent='선생님 참고 · '+x.teacher;
 const container=$('pageSteps');container.replaceChildren();
 x.notes.forEach((n,i)=>{const cell=document.createElement('div');cell.className='beat-card';const symbol=document.createElement('span');symbol.textContent=n;const number=document.createElement('small');number.textContent=String(i+1)+'번째';cell.append(symbol,number);container.append(cell)});
 const links=$('practiceLinks');links.replaceChildren();
 x.links.forEach(([label,url])=>{const a=document.createElement('a');a.href=url;a.textContent=label+' →';links.append(a)});
 const all=document.createElement('a');all.href='../music-play/guide.html';all.textContent='📋 30·50분 지도안·관찰지 →';links.append(all);
 const loc=new URL(location.href);loc.searchParams.set('instrument',instrument);loc.searchParams.set('level',String(level));history.replaceState(null,'',loc);
}
document.querySelectorAll('[data-instrument]').forEach(b=>b.addEventListener('click',()=>{instrument=b.dataset.instrument;render()}));
document.querySelectorAll('[data-practice-level]').forEach(b=>b.addEventListener('click',()=>{level=Number(b.dataset.practiceLevel);render()}));
$('printButton').addEventListener('click',()=>window.print());render();
})();

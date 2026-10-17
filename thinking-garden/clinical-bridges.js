/* Clinical transfer prompts are educational suggestions, not diagnoses or efficacy claims.
   Accessible on demand, never forced on a child before gameplay. */
(function(){
'use strict';
const templates={
 visual:{goal:'목표를 누락하거나 방해자극과 혼동하는지 살펴봅니다.',method:'시작 전 목표를 가리켜 확인하고, 끝난 뒤 놓친 곳을 다시 살펴봅니다.',offline:'책상 위에 서로 다른 물건 6개를 놓고 필요한 물건 2개를 찾아 실제로 옮겨봅니다.'},
 memory:{goal:'보았던 순서·위치를 유지하는지, 뒤로 갈수록 오반응이 늘어나는지 살펴봅니다.',method:'2~3개로 시작해 필요하면 소리 내어 반복하거나 위치를 다시 확인합니다.',offline:'간단한 물건 3개를 보여주고 가린 뒤 원래 순서대로 놓아봅니다.'},
 space:{goal:'위치·방향·인접 관계를 구별하는지 관찰합니다.',method:'한 번에 많은 자극을 제시하기보다 기준이 되는 물건부터 확인합니다.',offline:'실제 블록과 장난감을 사용해 왼쪽·오른쪽·위·아래에 물건을 배치합니다.'},
 language:{goal:'그림을 알아보는 수행과 말로 이름을 표현하는 수행을 구분합니다.',method:'가리키기와 말하기를 별도로 관찰하고, 서둘러 답하도록 재촉하지 않습니다.',offline:'실물 동물·색 카드 3개를 먼저 가리키고 충분히 기다린 뒤 이름을 말하게 합니다.'},
 life:{goal:'지시를 이해해 순서대로 수행하는지, 오류 후 도움에 반응하는지 관찰합니다.',method:'조건을 한 가지씩 짚어보고 실제 물건이나 그림을 사용합니다.',offline:'실제 가방에 오늘 필요한 물건을 준비하고 마지막에 스스로 확인합니다.'},
 literacy:{goal:'낱글자·어절 이해와 선택 반응을 구별합니다.',method:'정답을 반복해서 누르는 것뿐 아니라 이유를 다른 예로 설명할 수 있는지 확인합니다.',offline:'게임에서 사용한 표현으로 짧은 메모나 안내문을 직접 만들어 봅니다.'}
};
const details={
 rescue:['두 가지 조건을 동시에 유지하는지','조건을 한 번 더 들은 뒤 실물 분류하기'],
 memory:['몇 번째 순서에서 혼란이 시작되는지','장난감 세 개를 순서대로 놓아보고 다시 말하기'],
 sameShape:['색깔이 비슷해도 모양만 보고 비교하는지','종이 도형과 같은 모양 생활 물건 찾기'],
 flower:['꽃과 비슷한 방해자극을 빠뜨리지 않고 구별하는지','책 속 꽃 그림을 처음부터 끝까지 표시하기'],
 hide:['본 위치를 다시 살피는지, 탐색 순서를 유지하는지','컵 세 개 아래 숨은 물건을 체계적으로 찾아보기'],
 path:['빛나는 다음 위치를 찾아 차례를 유지하는지, 순서를 놓쳤을 때 다시 찾는지','바닥 스티커 3~5개를 빛나는 순서대로 밟아보기'],
 calm:['신호 전 누르기를 참는지와 기다린 후 시작하는지','교사가 든 빨강·초록 카드에 맞춰 멈춤·시작하기'],
 inside:['울타리 경계 밖을 터치하는지','테이프로 구역을 만들어 그 안에 블록 놓기'],
 targets:['같은 자리를 중복 누르지 않고 끝까지 확인하는지','종이의 빈 원에 차례로 스티커 붙이기'],
 paint:['경계를 보며 손 움직임을 조절하는지','굵은 선 안을 천천히 색칠하기'],
 water:['시든 것만 선택하고 이미 확인한 꽃은 넘기는지','실제 식물 사진에서 물이 필요한 징후를 구분해 보기'],
 slowScan:['탐색 범위 확대 시 누락이 늘어나는지','가방이나 서랍에서 지정한 물건을 순서대로 찾아보기'],
 slowPlace:['행·열 위치를 보고 같은 위치로 옮기는지','실물 3×3 칸에 같은 자리에 단추 놓기'],
 slowBlock:['인접성·방향·부분 대 전체 구성에서 어디서 막히는지','패턴블록이나 조립 블록으로 보기를 직접 구성하기'],
 slowName:['알지만 서둘러 대답할 때 혼동하는지, 천천히 보면 회복하는지','실물 색 카드 가리키기→기다리기→이름 말하기'],
 slowMemory:['보기 가린 뒤 위치 정보를 유지하는지','물건을 놓은 자리 기억한 뒤 가리고 다시 놓기'],
 slowEveryday:['그림으로 제시한 상황과 물건의 용도를 연결하는지, 잘못 담은 물건을 스스로 바꾸는지','게임과 별개로 실제 다음 날 일정과 날씨를 살펴보고 본인에게 필요한 물건을 직접 챙기기'],
 resetRescue:['오답 이후 멈춤·목표 확인·새 선택을 스스로 하는지','일부러 잘못 제안한 간단한 심부름을 한 번 더 확인하기'],
 classroomMove:['언어로 들은 위치 관계를 실제 배치로 바꾸는지','책상 오른쪽에 물병, 왼쪽에 연필을 놓기'],
 festivalPlan:['각 단서를 연결하고 준비 순서를 바꿀 수 있는지','외출 준비카드 배열 후 갑자기 비가 올 때 순서 수정하기'],
 rulePost:['규칙이 바뀐 후 이전 기준에 따른 반응이 나타나는지','장난감을 색으로 나누다가 종류별로 다시 나누기'],
 mirrorPond:['좌우 반전과 회전을 구분하는지','거울 또는 실물 도형으로 좌우 반전 확인하기'],
 sceneDetect:['첫 장면을 기억하고 바뀐 위치를 찾는지','책상 물건 한 개를 바꾼 뒤 변화 찾기'],
 spacing:['어절 경계를 의미단위로 이해하는지','짧은 편지를 쓰고 단어 사이 간격 확인하기'],
 spelling:['정답 형태를 비교하고 근거를 설명하는지','실제 안내문에서 헷갈리는 낱말을 확인하기'],
 handMirror:['손가락 개별 움직임과 동작 모방이 가능한지','카메라 없이 따라하기 또는 손가락 놀이로 다시 수행하기']
};
const materialByCategory={visual:'slowPdf',memory:'slowSheets',space:'slowPdf',language:'slowSheets',life:'clinicalGuide',literacy:'clinicalGuide'};
function dataFor(id){
 const card=document.querySelector('.library-card[data-open="'+id+'"]');if(!card)return null;
 const category=card.dataset.category||'visual',defaults=templates[category]||templates.visual,override=details[id]||[];
 return {id,category,goal:override[0]||defaults.goal,method:defaults.method,offline:override[1]||defaults.offline,material:materialByCategory[category]||'clinicalGuide'};
}
function makeBlock(id,result=false){
 const data=dataFor(id);if(!data)return null;
 const box=document.createElement('details');box.className='moa-clinical-bridge';
 const summary=document.createElement('summary');summary.textContent=result?'🌿 게임 다음에 실제로 해볼 활동':'📋 선생님·보호자 활용 노트';
 box.append(summary);
 const info=document.createElement('div');info.className='moa-clinical-bridge-body';
 const p1=document.createElement('p');const label1=document.createElement('b');label1.textContent=result?'게임에서 살펴본 점':'관찰할 점';p1.append(label1,document.createTextNode(' '+data.goal));
 const p2=document.createElement('p');const label2=document.createElement('b');label2.textContent=result?'짧은 생활 활동':'연습할 때';p2.append(label2,document.createTextNode(' '+(result?data.offline:data.method)));
 const link=document.createElement('a');link.href='../materials/cognitive-practice/guide.html';link.textContent='전체 게임별 활용 가이드 →';link.target='_blank';link.rel='noopener';
 const note=document.createElement('small');note.textContent='참고용 활동 제안입니다. 수행 결과만으로 진단하거나 치료효과를 판단하지 않습니다.';
 info.append(p1,p2,link,note);box.append(info);
 return box;
}
function intro(id){document.querySelector('#introScreen .moa-clinical-bridge')?.remove();const el=makeBlock(id);if(!el)return;const anchor=document.querySelector('#introScreen .intro-actions');anchor?.parentNode?.insertBefore(el,anchor);}
function result(id){document.querySelector('#resultScreen .moa-clinical-bridge')?.remove();const el=makeBlock(id,true);if(!el)return;document.querySelector('#resultScreen .result-garden')?.append(el);}
window.MoaClinicalBridge={intro,result,dataFor};
})();

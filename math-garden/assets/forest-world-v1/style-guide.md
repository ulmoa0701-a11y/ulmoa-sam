# 숲 세계 — style-guide (forest-world-v1)

## 스타일 앵커

새 그림체·새 자산 없음. mission-v4/village-v1이 이미 확립한 클레이 스타일 생태계(나무·바구니·도토리·딸기·곰·꽃·클레이 배경)를 그대로 재사용했다. 이번 라운드는 **구조(두 게임을 하나의 세계로 합치는 것)**가 작업의 전부이지, 새 미술 자산 제작이 아니다. Canva 호출 없음.

## CSS 병합 방식

`mission.css`를 베이스로 복사해 시작했다(지도·이동비트·아이콘 버튼·flashFeedback 등 더 완성된 디자인 시스템을 갖추고 있어서) + `village.css`의 고유 컴포넌트 규칙(resource-bar/.res, gather-spots/.spot, pet-scene/.pet-wrap, build-plot/.palette-item, tabbar/.tab-btn)을 그 뒤에 추가했다. 두 파일 모두 `.shell`/`.mast`/`.stage`/`.sr-only`/반응형 reduced-motion 전역 규칙을 각자 가지고 있었는데, mission.css 쪽 값을 유지하고 village.css의 중복 선언은 가져오지 않았다(class 이름이 겹치는 부분만 — `.gather-spots` 등 village 고유 class는 전부 그대로 가져옴).

## 새로 추가한 레이아웃 요소

- **`.resource-bar`**: 네 탭 전체에서 항상 보이도록 `.scenecontent`(패널들이 들어있는 컨테이너) 바깥, `.stage` 바로 아래 배치. `position:relative;z-index:1`을 명시해 배경 장식(`.scenery`, z-index:0)보다 위에 뜨게 했다.
- **`.panel-quest`**: 기존 `.panel`(모으기/반려동물/짓기가 쓰는, 가운데 정렬 flex 패딩 박스) class와 다르게 `padding:0;gap:0;display:block`으로 오버라이드 — 퀘스트 탭 안의 콘텐츠(`.topline`/`.storybar`/`#play`/`.lower`)는 mission.html 원본 레이아웃 그대로 가져와야 해서, village식 중앙정렬 패딩을 쓰면 레이아웃이 깨진다.
- **`.quest-reward`/`.reward-chip`**: 챕터 완료 화면에 보상(도토리/딸기 개수)을 보여주는 작은 칩. `unit()` 함수로 만드는 `.food` 아이콘을 재사용하되 인라인 텍스트 옆에 작게 쓰도록 24px로 축소.

## 탭 아이콘

4개 탭(모으기/숲길 모험/반려동물/짓기) 아이콘은 전부 mission.js·village.js에 이미 있던 SVG를 재사용했다 — "숲길 모험" 탭에는 새 아이콘을 만드는 대신 mission.js의 `mapReturn`(접힌 지도 모양) 아이콘을 그대로 썼다. 같은 지도 아이콘이 "지도로 돌아가기" 버튼과 "모험" 탭 둘 다에 쓰이는데, 의미상 둘 다 "지도/모험"을 가리켜서 자연스럽게 겹친다.

## 수량 표시 숫자에 대한 메모

자원 칩(도토리 N개)과 퀘스트 보상(+3/+2)은 숫자로 표시한다. mission.js 4차(아이콘 우선) 작업 때도 "숫자 자체는 비교적 일찍 익히는 상징이라 우선순위 낮음"으로 남겨뒀던 것과 같은 판단 — 핵심 조작(탭 전환/먹이주기/짓기/제출)은 전부 아이콘이고, 수량 표시만 숫자를 쓴다.


## 2차 업데이트 — 모험 B: 끊어진 다리 복구

### 자산

- `objects/bridge_gap.png` — 끊어진 다리 디오라마. 3곳에 재사용: 지도 노드 아이콘(`.map-node-badge.icon-bridge`), 이동 장면 배지(`.travel-badge`는 범용 class라 같은 icon-bridge 규칙을 그대로 씀), 과제/시범/성공 화면의 장식 헤더(`.bridge-icon`).
- `objects/wood_plank.png` — 판자 1개. `background-size:100% 100%`로 늘려서 `.plank-1`(30px)~`.plank-4`(84px) 너비 클래스로 길이 1~4를 표현 — 자산을 4개 만드는 대신 CSS로 재사용(acorn_single.png이 여러 수량에 재사용되는 기존 패턴과 동일 원리).
- 소재 전환(transfer 단계, "이끼 낀 판자"): 새 자산 생성 대신 `.plank.mossy{filter:sepia(.35) hue-rotate(55deg) saturate(1.4) brightness(.94)}`로 같은 판자 이미지의 색조만 바꿔 재사용.

### 레이아웃 교훈 (실패 후 수정)

처음에는 `bridge_gap.png`를 배경으로 깔고 그 위에 놓은 판자를 절대위치로 겹쳐 그렸는데, 다리 그림 자체의 돌기둥·개울 색이 복잡해서 작은 판자가 잘 안 보였다(스크린샷으로 확인 후 바로 발견). 장식용 다리 아이콘(`​.bridge-icon`, 상호작용 없음)과 실제 "놓은 판자" 영역(`.gap-fill`, 연두 테두리 점선 박스 — "쓸 수 있는 판자" 상자 `.plank-palette`의 베이지 톤과 색으로 구분)을 완전히 분리해서 해결했다. 장식 이미지와 상호작용 요소를 같은 자리에 겹치지 말고 분리하라는 교훈을 남긴다(기존 acorn_tree/basket_empty는 이 문제가 없었던 이유: 칩이 배경의 단순한 빈 공간 위에 떨어져서 덜 섞였음 — 다리 배경은 상대적으로 디테일이 많아 같은 기법이 안 통했다).

### 수량/길이 표현 방식

판자 길이는 전부 너비 차이로만 표현하고 숫자를 쓰지 않는다 — 두 판자를 나란히 놓으면 눈으로 길이를 비교할 수 있어야 한다는 원칙(mission-v4 style-guide의 "수량 표현 방식"과 동일 철학의 연장). `help()`(힌트) 패널에서만 "지금까지 놓은 길이: N · 필요한 길이: M" 텍스트를 보여준다 — 핵심 조작에는 숫자가 없지만, 도움을 요청했을 때는 보호자/큰 아이를 위해 숫자로도 설명한다.
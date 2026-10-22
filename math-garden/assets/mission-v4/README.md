# mission-v4 자산 (도토리 배달 대작전 리디자인 1차)

작업지시서: https://docs.google.com/document/d/1lo4IqNcJKsRdCLa4_TM-Rpn5S6gTszwozmTbdlbQ20U/edit

## 현재 상태: P0 "첫 네 가지" 스타일 승인 대기

작업지시서 3절이 요구한 "우선 네 가지(나무, 도토리, 바구니, 곰)로 일관된 스타일의 첫 장면을 완성해 디자인 품질 검수를 받는다"에 따라, 이번 1차 납품은 그 네 가지(+곰의 happy 표정)로 제한했다. 나머지 동물·배경·UI 아이콘 확장은 이 스타일이 승인된 뒤 진행한다.

## 포함된 것

- `objects/acorn_tree.png`, `objects/acorn_single.png`, `objects/basket_empty.png`
- `characters/bear_waiting.png`, `characters/bear_happy.png`
- `style-guide.md` — 스타일 앵커, 제작 경로(Canva 예외 승인 기록 포함), 팔레트
- `asset-manifest.json` — 파일별 용도/크기/프롬프트/미완료 목록
- `previews/` — 적용 전/후 PC·태블릿·모바일 스크린샷 + 성공(happy) 화면
- `qa/test-results.md` — 검증 결과

## 연동된 코드 변경 (branch: `redesign/math-garden-forest-assets-v4`)

- `math-garden/mission.css` — `.food.acorn`, `.supply-items`/`.tree-pile`, `.packed-food`/`.basket-pile`, `.forest-friend.bear-photo` 등 순수 스타일 교체. 게임 로직·상태 변수는 건드리지 않음.
- `math-garden/mission.js` — `fruitTray()`에 래퍼 div 2개 추가(구조만, 기존 data-mission 클릭 핸들러·state 변경 없음), `friend()`에 bear 전용 PNG 분기 추가.
- `math-garden/mission.html` — storybar의 정적 곰 아이콘을 `bear_waiting.png`로 교체.
- 원본 파일은 전부 그대로 유지했고 삭제/덮어쓰기 없음. 신규 자산은 전부 `math-garden/assets/mission-v4/` 하위 새 경로에만 추가했다.

## 공개 배포 안 함

- 이 브랜치는 아직 `main`에 병합하지 않았고 GitHub Pages에도 반영되지 않았다. 사용자 승인 후 병합을 진행한다.

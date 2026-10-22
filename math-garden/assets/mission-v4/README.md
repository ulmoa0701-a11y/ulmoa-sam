# mission-v4 자산 (도토리 배달 대작전 리디자인 1차)

작업지시서: https://docs.google.com/document/d/1lo4IqNcJKsRdCLa4_TM-Rpn5S6gTszwozmTbdlbQ20U/edit

## 현재 상태: 스타일 승인 완료 → 전체 캐릭터 확장 + 게임감 개선 적용

1차 체크포인트(나무·도토리·바구니·곰)를 사용자가 승인했고, "나머지들 싹다 만들어 / 학습지 말고 게임처럼 느껴지게"라는 후속 지시에 따라:
- 실제 코드에서 쓰이는 나머지 동물(rabbit/fox/frog/bird) waiting+happy, 접시(plate)까지 같은 클레이 스타일로 확장
- 클릭 피드백, 아이들 애니메이션, 챕터 완료 시 색종이(confetti) 축하 연출 등 "게임처럼 느껴지는" 동작 추가 (상태/로직 변경 없음)

남은 것(배경 재제작, 미구현 기능용 소품, UI 아이콘)은 여전히 다음 단계로 분리되어 있다 — `asset-manifest.json`의 `notDone` 참고.

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

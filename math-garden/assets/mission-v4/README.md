# mission-v4 자산 (도토리 배달 대작전 리디자인 1차)

작업지시서: https://docs.google.com/document/d/1lo4IqNcJKsRdCLa4_TM-Rpn5S6gTszwozmTbdlbQ20U/edit

## 현재 상태: 4차 — 아이콘 우선(글 없이도 조작 가능) 적용

사용자 지시: "글은 최소화하고... 어린아이들도 글 못 읽어도 잘 참여하고 알아서 게임 다하잖아 그 전략으로 해봐." 핵심 조작(시작/제출/이동/계속하기/재도전/지도복귀, 소리·새모험·힌트·다른 놀이 버튼)을 전부 인라인 SVG 아이콘으로 바꾸고, 기존 한글 라벨은 삭제 대신 `sr-only`로 화면엔 안 보이고 스크린리더에만 들리게 유지했다. 제출 직후 정답/오답을 알려주는 큰 체크(✓)/엑스(✗) 아이콘 플래시를 새로 추가해 소리·텍스트 상태문구와 함께 3중으로 신호를 준다. 점수/판정 로직은 `flashFeedback()` 훅 한 줄 추가 외에 전혀 건드리지 않았다. 지시문 문장·지도 캡션·단계 라벨 텍스트 자체는 아직 남아있다(보호자/스크린리더용으로 의도적으로 유지, `notDone` 참고).

## 3차 — 구조 재설계(오버월드/맵) 적용

1~2차는 "나무·도토리·바구니·곰"과 전체 동물 roster를 클레이 스타일로 바꾸고 애니메이션을 더한 **자산 교체** 작업이었다. 사용자가 이를 보고 "학습지 구조 아니냐, 길 가다 나무 발견하는 스토리가 없지 않냐"고 직접 지적했고, 범위를 확인(AskUserQuestion)한 뒤 **전체 구조 재설계(오버월드/맵)**를 선택받아 3차 작업을 진행했다:

- **숲속 지도(오버월드) 화면 신규 추가**: `CONCEPTS` 배열에 이미 있었지만 화면에 쓰이지 않던 "첫 번째 숲길/두 번째 숲길/세 번째 숲길" 이름을 실제 지도 노드로 보여준다. 잠김→현재→완료 진행 상태 표시.
- **챕터당 1회 "이동(travel)" 발견 비트 추가**: 시범 직후, 실제 과제 전에 짧은 한 줄 서사("오솔길을 따라 걷다 보니...")로 "장소에 도착하는" 느낌을 준다.
- **배경을 클레이 스타일로 확정**: 1~2차에서 "사용자 결정 필요"로 남겨뒀던 항목. PC/태블릿/모바일 비교 후 기본값으로 채택.
- **berry 자산 누락 발견·보완**: 실제 코드에서 acorn만큼 쓰이는 두 번째 과일(berry)이 여태 평면 CSS 그라디언트였던 것을 발견해 같은 클레이 스타일로 교체.
- **첫 화면(intro-bag) 바구니 비주얼 교체**: 기존 CSS 도형 → `basket_empty.png` 재사용.
- 점수·판정 로직(`feedback`/`assess`/`advance`/`handle`의 take·undo·submit·choose)은 **단 한 줄도 변경하지 않았다** — 전환 화면만 기존 진입점 주변에 끼워 넣었다.

남은 것(0~10 전체 수량 실측, UI 아이콘, 미구현 기능 소품)은 여전히 분리되어 있다 — `asset-manifest.json`의 `notDone` 참고.

## 포함된 것

- `objects/acorn_tree.png`, `objects/acorn_single.png`, `objects/berry_single.png`, `objects/basket_empty.png`, `objects/plate_empty.png`, `objects/reward_flower.png`
- `background/forest_background_clay.png` — `.stage` 기본 배경으로 채택
- `map/path_fork.png` — 오버월드 지도 'compare' 노드 아이콘
- `characters/{bear,rabbit,fox,frog,bird}_{waiting,happy}.png`
- `style-guide.md` — 스타일 앵커, 제작 경로(Canva 예외 승인 기록 포함), 팔레트, 3차 구조 재설계 설명
- `asset-manifest.json` — 파일별 용도/크기/프롬프트/미완료 목록, 3차 구조 변경 상세
- `previews/` — 적용 전/후 PC·태블릿·모바일 스크린샷, 오버월드 지도·이동 비트 스크린샷
- `qa/test-results.md` — 검증 결과 (1~3차)

## 연동된 코드 변경 (branch: `redesign/math-garden-forest-assets-v4`)

- `math-garden/mission.css` — `.food.acorn`/`.food.berry`, `.supply-items`/`.tree-pile`, `.packed-food`/`.basket-pile`, `.forest-friend.clay-photo`, `.intro-bag`, `.stage` 배경, `.overworld`/`.map-node`/`.travel-scene` 등 전부 순수 스타일. 게임 로직·상태 변수는 건드리지 않음.
- `math-garden/mission.js` — `fruitTray()` 래퍼 div(구조만), `friend()` PNG 렌더링, 그리고 3차: `showMap()`/`travelBeat()` 신규 함수 + `handle()`에 `travel-to`/`arrive` 분기 추가, `start`/`continue`/`next-chapter` 라우팅을 지도·이동 화면 경유로 변경, `state.unlocked` 필드 추가(지도 진행도 추적용, 점수 로직과 무관). `feedback`/`assess`/`advance`와 take/undo/submit/choose 분기는 무변경.
- `math-garden/mission.html` — storybar의 정적 곰 아이콘을 `bear_waiting.png`로 교체.
- 원본 파일은 전부 그대로 유지했고 삭제/덮어쓰기 없음. 신규 자산은 전부 `math-garden/assets/mission-v4/` 하위 새 경로에만 추가했다.

## 공개 배포 안 함

- 이 브랜치는 아직 `main`에 병합하지 않았고 GitHub Pages에도 반영되지 않았다. 사용자 승인 후 병합을 진행한다.

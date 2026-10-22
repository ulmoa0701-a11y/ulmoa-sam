# 숲 세계 (forest-world-v1) — 숲 마을 + 숲길 모험 융합

사용자가 숲 마을(village.html)과 도토리 배달 모험(mission.html) 중 뭐가 더 나은지 묻고, "융합 안 돼?"라고 제안 → Claude가 "숲 마을을 지속되는 세계로 두고, 각 수학 개념을 그 세계 안의 퀘스트 장소로 만들자. 퀘스트를 깨면 반려동물 먹이고 마을 지을 자원을 번다"는 구체적 융합안을 제안했고, 사용자가 "해 그럼"으로 승인해 제작.

## 핵심 아이디어

**학습이 재밌는 걸 얻는 방법이 되게 한다.** 숲길 모험(share/compare/make 세 개념, mission.js의 교수 구조 그대로)을 깨면 도토리·딸기를 보상으로 받고, 그 자원으로 반려동물을 먹이고 마을을 짓는다. "학습을 해야 재밌는 걸 할 수 있다"가 아니라 "학습 자체가 재밌는 걸 얻는 길"이 되도록 했다.

## 네 개 탭, 하나의 세계

모으기 / 숲길 모험 / 반려동물 / 짓기 — 네 탭을 순서 없이 자유롭게 오간다. 자원 칩(도토리·딸기 개수)은 네 탭 전부에서 항상 보여서, 모험을 깨는 것과 자원이 느는 것의 연결이 눈에 보인다.

## 건드리지 않은 것 (중요)

`math-garden/mission.html`/`mission.js`/`mission.css`와 `math-garden/village.html`/`village.js`/`village.css`는 **전혀 수정하지 않았다** — 둘 다 독립 페이지로 그대로 남아있고 각자 정상 동작한다(diff로 확인, Playwright로 재검증). 이 융합은 완전히 새로운 파일(`forest-world.html`/`.js`/`.css`) 세 개로만 만들었고, 두 기존 파일에서 로직을 **이식(port)**했다 — 특히 mission.js의 점수·독립수행 판정 로직(`feedback`/`assess`/`advance`)은 한 글자도 바꾸지 않고 그대로 옮겼다.

## 새로 생긴 연결점 (딱 하나)

`chapterEnd()`에서 숲길을 하나 깨면 **고정 보상**(도토리 +3, 딸기 +2)을 준다. 성과(도움 없이 풀었는지, 몇 번 틀렸는지)에 따라 보상을 다르게 주지 않는다 — 보상을 성적에 비례시키면 보상이 암묵적 처벌 신호가 되어, 이 프로젝트 전체의 "벌점 없음" 원칙과 충돌하기 때문이다. 보상 액수(+3/+2) 자체는 연구에서 도출된 값이 아니라 균형을 위한 임의 설정이다.

## 포함된 것

- `forest-world.html`/`.js`/`.css` (새 경로: `math-garden/` 바로 아래, mission/village와 같은 위치)
- 새 이미지 자산 없음 — `mission-v4/`와 `village-v1/`의 기존 자산만 재사용
- `style-guide.md`, `asset-manifest.json`, `qa/test-results.md`, `previews/`

## 점검 중 발견한 기존 버그 (mission.css, 수정 안 함)

`mission.css`의 `#sound,#restart,#help,#change{display:inline-flex}` 규칙(4차 아이콘화 작업 때 추가)이 `[hidden]` 속성보다 CSS 명시도가 높아서, 지도 화면에서도 `#help`/`#change` 버튼이 숨겨지지 않고 보이는 버그를 발견했다. **라이브 mission.html에서도 재현 확인**(Playwright로 `.isVisible()` 체크). 이 파일은 건드리지 않기로 한 작업 범위라 `forest-world.css`에만 `#help[hidden],#change[hidden]{display:none!important}`로 고쳤다. mission.css 자체를 고칠지는 별도 결정 필요 — qa/test-results.md에 상세 기록.

## 공개 배포 안 함

이 브랜치는 main에 병합하지 않았고 GitHub Pages에도 반영되지 않았다. `index.html`(15종 허브)에 링크도 추가하지 않았다 — 공개 노출 여부는 사용자가 따로 결정한다.

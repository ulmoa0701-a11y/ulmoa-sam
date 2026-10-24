# 숲 마을 — style-guide (village-v1)

## 스타일 앵커

mission-v4와 완전히 동일한 "cute 3D clay toy" 스타일을 그대로 이어받는다 — 새 월드를 또 다른 그림체로 만들지 않고 기존 숲 생태계(나무·바구니·도토리·딸기·곰·꽃·클레이 배경) 안에 새 게임 루프만 얹는 방식을 택했다. 그래서 신규 생성 자산은 오두막(cottage) 1개뿐이다.

## 제작 경로 (예외 승인 연장)

`mission-v4/style-guide.md`에 기록된 "이번 math-garden 작업 한정 Canva 예외 승인"을 이어받아 사용했다. 새 저장소 전역 승인이 아니다.

- `objects/cottage.png` 프롬프트: "A cute 3D clay-style toy miniature cottage house, small round wooden cabin with a triangular thatched roof and a round door, smooth matte toy material, soft pastel cream and brown color palette, gentle studio lighting with soft shadows, centered single subject, three-quarter view, plain soft pastel solid background, no text, no realistic photography"

## 재사용한 기존 자산 (mission-v4)

- `objects/acorn_tree.png` — 모으기 탭의 나무(도토리 자원 노드)
- `objects/berry_single.png` — 모으기 탭의 딸기 노드 겸 자원 아이콘(큰 사이즈로 재사용, 별도 "덤불" 자산은 만들지 않음)
- `objects/acorn_single.png` — 도토리 자원 아이콘, 먹이주기 아이콘, 건물 비용 표시
- `objects/basket_empty.png` — 짓기 탭의 "바구니 장식" 아이템
- `objects/reward_flower.png` — 짓기 탭의 "꽃밭" 아이템 + 반려동물 2단계 성장 시 왕관 장식(재사용 2곳)
- `characters/bear_waiting.png`/`bear_happy.png` — 반려동물 본체(평상시/먹이 직후)
- `background/forest_background_clay.png` — 전체 월드 배경 (mission.html의 `.stage`와 동일)

## 색/인터랙션 원칙

- 버튼은 전부 mission.js 4차 업데이트(아이콘 우선) 때 확립한 패턴을 그대로 가져옴 — 인라인 SVG 아이콘 + `sr-only` 텍스트, 투명 `.interaction`이 아니라 명확한 원형 버튼 배경.
- 정답/오답 평가가 없으므로 mission.js의 `flashFeedback()`(체크/엑스 아이콘 반짝임)은 이식하지 않았다 — 대신 "모으기=통통 튀는 애니메이션", "짓기 불가=살짝 흔들림", "먹이 성공=행복 표정 전환"처럼 전부 긍정/중립 피드백만 존재한다(부정적 "틀렸다" 신호 자체가 없음).

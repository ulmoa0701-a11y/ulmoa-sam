# 나래반 놀이터 V6.3 — IMMEDIATE PLAY

**Status:** PUBLICATION_HOLD / NOT RELEASED

2026-10-08 모바일 캡처에서 첫 진입 화면이 큰 제목·긴 설명·강한 어두운 오버레이로 시작해
아이에게 "놀이터에 들어왔다"보다 "설명 페이지를 읽는다"는 인상을 주는 문제가 확인됨.

## V6.3 correction
- 첫 프레임부터 실제 놀이터 게임 화면 진입.
- 큰 랜딩 제목 / 긴 설명 / 스크롤형 CTA를 첫 진입에서 제거.
- "오늘은 뭐 하고 놀까?"만 약 1.5초 표시 후 사라짐.
- NPC 이름표는 항상 노출하지 않고 가까이 갔을 때만 보임.
- 이름표의 "보물찾기 / 깃발놀이 / 기억미션" 같은 기능 라벨을 제거하고 친구 이름만 표시.
- 오늘의 부탁 문구를 생활놀이 문장으로 변경.
- 게임 내 뒤로가기 버튼은 긴 소개 화면으로 되돌아가지 않고 작은 일시정지 선택창을 엶.
- V6.2의 실제 물건찾기 루프를 유지.

## Local test artifact
별도 로컬 패처는 기존 HTML을 덮어쓰지 않고 새 V6.3 HTML을 생성하며,
승인된 가람 CURRENT 외형 정본에서 추출한 앉은 포즈도 적용한다.

## Load order
1. V6.1 base runtime
2. V6.2 fix CSS/JS
3. V6.3 immediate-play CSS/JS

## Publication rule
Do not link this build from `main`, existing 13 games, or GitHub Pages until explicit approval.

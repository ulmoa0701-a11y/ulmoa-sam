# 울모아 무료 오케스트레이션 파일럿

## 역할
GitHub Actions, GitHub Pages, 기존 QA 실행결과를 하나의 보고서로 모으는 비용 0원·읽기 전용 첫 단계입니다.
AI API나 n8n 서버, Google 계정 권한이 필요하지 않습니다.

## 결과
- ops-report/status.md 및 ops-report/status.json 생성
- 파일 존재/HTML 제목 검사: 정적 구조 검사
- 공개 사이트의 HTTP 200/HTML 검사: 접속 상태 검사
- GitHub Pages 및 기존 CI 실행결과: 이전 실행 기록만 검사
- 실사용 UX, 오선 인식 정확도, 모바일 입력 기능은 별도 브라우저 E2E 및 사람이 확인해야 합니다.
- Actions는 추가/수정된 파일에 대한 PR이나 수동 실행에만 동작합니다. 정기 실행 없음.
- main 배포, 커밋, 비밀정보 수집, 고객 메시지 발송, 공개 자료 변경을 수행하지 않습니다.

## 사용법
로컬 (외부 접속 없이 정적 확인):
    python3 -m unittest discover -s ops -p 'test_health_report.py' -v
    python3 ops/health_report.py --root . --out ops-report

공개 사이트 및 Actions 상태까지 확인:
    python3 ops/health_report.py --root . --live --github --out ops-report

GitHub Actions에서는 Ulmoa Orchestration Pilot (read-only) 실행 후 ulmoa-ops-qa-report 다운로드.

## 다음 단계 (이번 파일럿 범위 밖)
1. 각 게임별 브라우저/모바일 E2E 결과를 표준 JSON으로 수집
2. 배포 SHA와 공개 페이지 빌드 버전 매칭
3. 결과를 검토용 비공개 Sheet에 저장 — 계정 접근 승인과 개인정보 보호 설계 후 구현
4. AI 요약은 ChatGPT에서 수동 검토하거나, API 비용 승인 후 연결

이 브랜치를 main에 병합하기 전까지 기존 공개 사이트는 달라지지 않습니다.

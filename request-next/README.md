# 이야기해봄 통합 게시판 v2 — 격리된 개발판

## 상태 (2026-10-12)
**배포 금지 / 검증 단계.** 이 코드는 기존 GitHub Pages \`request/\`, Google Apps Script 게시판, Jotform을 수정·삭제하지 않습니다. 현재 공개 홈페이지의 실제 접수는 기존 경로에만 남아 있습니다.

### 개발 구조
- \`site/index.html\`, \`styles.css\`, \`app.js\`: 모든 공개 범위를 선택하는 **하나의 네이티브 HTML 입력 폼**
- \`src/worker.js\`: 단일 API 서비스. Cloudflare Workers 환경을 가정한 격리 구현
- \`schema.sql\`: D1 DB 스키마
- \`wrangler.jsonc.example\`: 배포 전 필요 설정 예시 (실제 ID/키는 저장소에 절대 커밋 금지)
- \`tests/security.test.mjs\`: 공개·비밀 분리, 작성자 복구, 운영자 인증, 첨부 권한 보안 회귀
- \`tests/browser.cjs\`: PC/모바일 반응형·선택 동작 테스트 (서버는 전용 모의 응답)

### 공개/비공개 권한
- \`GET /api/posts\`: 공개글 + 운영자 승인된 잠금글 **검토 메타데이터만**. 연락처/본문/파일 URL/비밀 토큰 반환 금지.
- \`POST /api/posts\`: 모든 타입이 같은 API/DB로 입력. 비밀글에는 서버 발급 난수 확인 코드 반환. 서버에는 코드의 SHA-256 해시만 저장.
- \`GET /api/mine/:id\`: \`X-Receipt-Token\` 인증을 통과한 작성자에게만 본문/연락처/답변 반환. 작성자가 확인 코드를 분실하면 현재 구조에서 재발급할 수 없음.
- \`GET /api/mine/:id/file\`: 같은 확인 코드 필요.
- \`GET /api/public/:id/file\`: 공개글이며 **운영자의 첨부 공개 승인 후**에만 허용. URL은 일반 게시글 렌더링에 자동 노출하지 않음.
- \`/api/admin/*\`: 환경 비밀 \`ADMIN_KEY\` 를 가진 운영자만. 화면에 입력한 키는 브라우저 메모리에만 보관.
- 첨부 파일: 비공개 R2 버킷, 4MB 제한, MIME + 매직바이트 점검, 강제 다운로드, 공개 URL 없음. 악성 코드·개인정보 자동 검사 기능을 의미하지 않음.
- 스팸 제한: 동일 IP 해시 기준 10분간 3회, \`RATE_SALT\` 필수; 실사용 단계의 스팸/운영 정책 개선 필요.

### 기존 데이터
- 기존 Apps Script 공개글 데이터 **이관하지 않음**. UI에 보존된 기존 공개글 서비스 링크만 제공.
- Jotform 비밀글 제출 건수 확인 시점 0건. 추후 신규 접수가 있는지 마이그레이션 전에 다시 확인해야 함.
- 기존 데이터 마이그레이션은 소스 DB/실제 저장 목록 접근 권한, 형식, 개인정보 법적 근거 확인 뒤 별도 수행.
- 현재 두 AppDeploy 앱은 과거 별도 데이터 저장소를 가짐. 이 개발판과 자동 연결되지 않음.

### 배포 선행 조건
1. 사용 가능한 호스팅·스토리지 연결 및 비밀키 설정. Cloudflare Worker+D1+R2는 하나의 후보일 뿐 현재 계정/버킷 생성·연결이 **완료되지 않음**. R2 가입은 결제 플로우 및 초과 사용 청구 가능성이 있어 사용자의 사전 승인 없이는 진행하지 않음.
2. 개인정보 처리방침을 운영자와 법률·실무 기준으로 확정: 처리 항목, 처리 목적, 보유 기간, 위탁/국외 이전, 삭제 요청 방식, 미성년자 이용 안내. 공개 전 수정 필수.
3. 부하 제한·봇 방지·파일 악성 콘텐츠 방어, 운영자 키 관리/회전, R2 직접 접근 차단, 개인정보 오기재 대응, 관리 UI XSS/권한 테스트와 실제 서버 QA.
4. 기존 공개글/답글 DB 백업 후 읽기 전용 병행 검증, 데이터 보존·이관 검증.
5. 스테이징 서버에 실제 배포하여 개인정보 전파, 첨부/회수/답변/모바일 실기기 동작 확인 후 메인 \`request/\` 라우팅 변경.

### 무료/유료 현황
- GitHub 무료 저장소/Actions만으로는 비밀글을 안전하게 저장하는 장기 실행 서버를 제공할 수 없음.
- AppDeploy 기존 앱은 확인됐으나 **크레딧 소진**으로 신규 배포 불가 (최소 14 크레딧 요구).
- Workers 및 D1에는 공식 무료 한도가 있으나, R2는 무료 포함량을 넘어서는 과금 가능성이 있고 구독 활성화 시 checkout 절차가 있음. **무조건 추가 비용 0원이라고 보증할 수 없으므로 무승인 활성화 금지**.

### 개발판 QA
CI 보안 테스트는 자체 D1/R2 모의 환경의 **단위 테스트**이며, 실제 배포 DB·접속 제어·파일 저장 운영 테스트를 대신하지 않음. 브라우저 QA 역시 테스트 모의 API를 사용하므로 실제 저장 성공을 보증하지 않음.


## 2026-10-13 보안 강화 및 격리 실통신 검증
- 기존 쪽지/메모형 UI와 기존 공개본은 유지, 신규 기능은 개발 브랜치에만 적용.
- Netlify 함수에서 스팸 제한용 IP는 사용자가 보낸 헤더 대신 신뢰되는 Netlify Context IP를 사용.
- 비밀글 보관 동의는 연락처 유무와 관계없이 필수; 동의 없으면 API가 거부.
- POST/DELETE 교차 출처 요청 차단, 작성자용 확인 코드 검증 후 본인 글과 첨부 삭제 구현. 기존 Google Apps Script/Jotform 데이터에는 영향 없음.
- request-next/tests/http-e2e.mjs: Chrome에서 실제 HTTP 요청으로 공개/비밀/잠금 작성·PDF·관리자 답변·본인 열람·삭제·비공개 데이터 미노출 검증.
- request-next/tests/postgres-integration.test.mjs: GitHub Actions 임시 PostgreSQL 16에 실제 스키마를 생성하여 SQL 바인딩, 공개/비밀 저장 및 삭제 검증.
- 통과한 GitHub Actions 6개 job: https://github.com/ulmoa0701-a11y/ulmoa-sam/actions/runs/38342014695
- 외부 Netlify 배포 전 요건: GitHub 개발 브랜치 연결, base directory request-next 지정, 환경비밀 HABOM_ADMIN_KEY·HABOM_RATE_SALT 설정, Database 프로비저닝, private Blobs 연결, SSO 스테이징의 최종 개인정보 검증, 보유기간 및 개인정보 처리방침 확정, 기존 글 데이터 이관.
- 현재 Netlify 연결 도구에는 GitHub 저장소 링크/환경변수 수정/배포 실행 기능이 없음. 원격 PC 도구 월 호출 한도는 0%. 실제 외부 서버 배포는 하지 않음.
- Netlify Free 사용은 현금 결제 0원이지만 월 300크레딧을 소비하고 무료 한도 도달 시 같은 팀의 다른 앱도 영향받을 수 있음.
- 공식 플랜: https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/


## 2026-10-13 실제 Netlify 운영자 검증 절차
- 확인된 기본 인프라: SSO 전용 staging Netlify 자동 배포, /api/health 정상 JSON(운영자 브라우저 확인), 실제 PostgreSQL 마이그레이션 완료. 환경변수 HABOM_ADMIN_KEY/HABOM_RATE_SALT는 Netlify UI에서 secret 등록 확인; 값 자체는 공유하거나 소스에 보관하지 않는다.
- staging https://habom-unified-private-staging.netlify.app/ 에서 운영자 관리 details 펼치기 → 첫 번째로 생성해 Netlify HABOM_ADMIN_KEY에 넣은 값을 운영자 키에 직접 입력 → 글 관리 열기 → 인증 성공 후 나타나는 테스트 한 번 실행하기 누르기.
- 이 버튼은 API /api/health, POST /api/posts (완전 비공개 가상 글+소형 PDF), GET public feed 비노출 확인, GET mine 무단/정상 접근, PDF 무단/정상 접근, 운영자 답변 POST, 작성자 답변 재조회, DELETE 후 403 확인 순서로 동작한다. 키와 receipt는 화면/로그에 기록하지 않는다.
- 테스트는 관리자 인증 시에만 노출되고 사용자가 직접 눌러야 시작된다. 테스트 1건은 10분간 3건 작성 제한에 포함된다. 실패해도 finally에서 생성된 시험 글 삭제를 재시도하며, 실패하면 명시적 경고를 보여준다.
- 이전 프론트엔드의 credentials: omit를 credentials: same-origin으로 수정하여 Netlify 비공개 스테이징 로그인 세션을 API 요청에 전달한다. 교차 출처 요청은 허용하지 않는다.
- 실제 API에 로그인된 사용자의 수동 시험은 남아 있으며, 자동 CI의 임시 저장소 테스트만으로 실제 Netlify Blobs/DB 완전 통과를 주장하지 않는다.
- [2026-10-13 QA 7 jobs](https://github.com/ulmoa0701-a11y/ulmoa-sam/actions/runs/38397619560) 통과. 실제 Netlify 배포 commit 25af56aa80715c0a5c286cf2c5dda1f3c5e08226 ready.

## 2026-10-14 운영 배포 검증 기록
- 운영 이벤트 함수의 검사 결과는 이전 배포 기록을 조회하는 빌드 아티팩트 이름으로 식별함. 개인정보/인증값을 기록하지 않음.
- 미리보기 배포에서 postgres-smoke DB 검증 및 라이브 검증 상태 아티팩트 생성 성공. 미리보기 첫 상태 pending은 최종 통과를 의미하지 않음.
- 실제 공개 전 SSO 보호 유지 및 운영 런타임 점검 passed 결과 필수.

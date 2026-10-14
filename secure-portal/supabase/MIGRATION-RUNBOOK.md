# 일단써봄 · Supabase 이전 작업 기록 (2026-10-14)

**상태: 미배포 개발본 / 실제 아동·청소년·보호자의 상담정보 입력 금지.**

이전 소스: `secure-portal/public` (Netlify 전용 비밀 쿠키/패스키 방식).
새 별도 소스: `secure-portal/supabase/web` + `supabase/functions/ildan-api` + `supabase/migrations`.
이전 공개 GitHub Pages 체험판을 덮어쓰지 않는다.

## 실사용 조건과 지금의 장애물

- Supabase 플러그인이 사용자 계정에 아직 **연결되지 않았으므로** 실제 프로젝트·SQL 마이그레이션·Edge Function 배포·SMTP 구성은 수행하지 못했다.
- `web/config.js`는 빈 값이다. **브라우저는 로그인을 비활성화하고 실제 자료 입력 금지를 안내**한다.
- Supabase 기본 발신 메일은 조직 구성원 주소에 제한된다. 학생·보호자가 OTP 로그인하려면 **별도 실사용 SMTP 발송 구성**이 필요할 수 있으며 비용/이용약관 검토가 선행되어야 한다.
- 무료 프로젝트가 일시 정지될 수 있고 운영 SLA, PITR, 자동 복구·보존, 보안감사가 필요한 상담정보 업무에는 무료 플랜이 충분하다고 보장할 수 없다.
- 코드의 역할별 제한은 GitHub Actions의 합성자료 PostgreSQL+Node 검증 대상으로서만 확인한다. 실제 Supabase 가입·권한·로그인·백업·동시성/침해테스트는 별도이다.
- 법정대리인 동의 및 개인정보 수집 목적·보존기간·삭제방법·접근로그·유출대응을 운영자가 마련할 때까지 실제 민감정보를 받지 않는다.

## 개발 구조

```text
GitHub Pages (별도 staging 경로, 배포 전)
   └─ Supabase Auth 이메일 6자리 OTP (각 계정 별도 이메일)
   └─ Bearer Supabase 세션 토큰 → HTTPS Edge Function
Supabase Edge Function /ildan-api
   ├─ auth.getUser(token) 실제 계정 확인
   ├─ RLS 클라이언트: 본인 프로필·접근 가능한 암호문만 조회
   ├─ 역할과 담당 관계 재검사
   ├─ AES-256-GCM 기록·회기 메모 (비밀키는 Edge 서버 환경변수 전용)
   └─ 제한된 서비스 클라이언트: 검증된 기록 저장·공유·철회·삭제만 실행
Supabase Postgres
   ├─ ildan_members         역할 (학생/보호자/치료사; 사용자 임의 승격 불가)
   ├─ ildan_invites         48시간 단회 초대 토큰의 SHA-256 요약만 보관
   ├─ ildan_records         학생/보호자 암호문 + 선택 공유 암호문만 구분 저장
   └─ ildan_session_notes   담당 치료사만 읽는 회기 메모 암호문
```

**중요:** 역할을 HTML에서 선택하지 않고 인증된 `auth.uid()`와 서버가 고정한 프로필을 사용한다. 보호자는 본인 작성 기록만, 학생은 본인 작성 기록만, 치료사는 명시적으로 공유받은 암호문과 본인 회기 메모만 조회한다.

### Supabase 이전 버전이 바꾸는 로그인 방식

기존 자체 패스키/기기재등록 코드는 Supabase Auth 로그인 방식과 서로 호환되지 않으므로 그대로 재사용하지 않는다. 이 새 버전은 **이메일 OTP**를 사용한다. Supabase에서 기본 이메일 템플릿이 Magic Link라면 Authentication → Email Templates → Magic link 템플릿을 확인해 본문에 `{{ .Token }}`을 넣는 OTP 메일로 바꿔야 한다.

학생이 개인 이메일 주소가 없는 경우(또는 보호자 이메일 하나로 여러 아이를 구분하려는 경우) 계정 소유권·대리접근·복구·동의 설계를 **먼저** 결정해야 한다. 학생에게 이메일 계정을 새로 만들어야 한다고 강요하지 않는다.

## Supabase 연결이 완료된 후 필요한 작업

1. 사용자가 ChatGPT의 Supabase 연결을 명시적으로 완료하거나 직접 [Supabase Dashboard](https://supabase.com/dashboard)에서 별도 개발 프로젝트를 만든다. 지역은 **Seoul 지원 여부·실제 저장 리전**을 확인해 선택한다.
2. Supabase CLI 또는 안전하게 연결된 도구로 `supabase/migrations/20261014000100_ildan_secure_roles.sql`을 **새 개발 프로젝트에만** 적용한다. `auth.users`는 Supabase Auth가 제공하며 테스트용 `tests/00_stub_supabase_auth.sql`은 절대 실제 프로젝트에 적용하지 않는다.
3. JWT 없는 기본 공개 API를 열지 않는다. `supabase/config.toml`의 `verify_jwt=false`는 OPTIONS와 health 때문에 사용되며, 실제 의료/기록 API는 **항상** 서버 `auth.getUser(token)`으로 검증한다.
4. Supabase Edge Function Secrets에 `RECORD_ENCRYPTION_KEY` (보안 난수 정확히 32바이트의 base64)와 `PUBLIC_SITE_ORIGIN=https://ulmoa0701-a11y.github.io`를 등록한다. Supabase 환경의 내장 `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 공급 여부를 확인한다. **서버 비밀키를 채팅/HTML/GitHub/브라우저 config.js에 붙여 넣지 않는다.**
5. 먼저 `deno check supabase/functions/ildan-api/index.ts`와 SQL/RLS CI가 통과해야 한다. 이후 Supabase CLI에서 `supabase functions deploy ildan-api`를 실행한다. Functions 경로는 `https://<project-ref>.supabase.co/functions/v1/ildan-api/<endpoint>` 형태다.
6. 등록된 테라피스트 한 명이 이메일 OTP로 Auth 계정을 만들고 실제 신원 확인 후 운영자가 Supabase SQL 편집기에서 다음 **개발 테스트 계정**의 프로필만 수동 지정한다. `<확인된-Auth-UUID>`는 이메일 인증된 해당 계정의 UUID다.
   ```sql
   INSERT INTO public.ildan_members(user_id,role,display_alias)
   VALUES ('<확인된-Auth-UUID>', 'therapist','가상 담당 치료사');
   ```
   불특정 사용자가 스스로 치료사 역할을 선택하거나 등록할 수 없다.
7. Supabase Authentication → Email Templates의 `{{ .Token }}` 이메일 코드와 실사용 SMTP 설정/발송 제한을 확인한다. 학생·보호자의 신원 확인과 법정대리인 동의를 거친 경우에만 개인별 초대코드를 발급한다.
8. 공개 가능한 **publishable key만** `supabase/web/config.js`에 설정한다. `url`, `apiUrl`, `publishableKey`는 공개 클라이언트 값이지만, `SERVICE_ROLE_KEY`나 `RECORD_ENCRYPTION_KEY`는 절대로 삽입하지 않는다.
9. 검증 전에는 별도 **staging** 경로로 배포하고 자동/수동 Chrome PC·모바일, Apple Safari, 인증 이메일, UI 사용성 시험을 진행한다. 개발본에서 실제 건강·상담 내용을 시험에 쓰지 않는다.
10. 계정 4개(치료사 A, 학생 A, 보호자 A, 무관한 치료사 B)를 **가상 신원**으로 만들어 서로 다른 브라우저에서 로그인한다. 직접 API 요청으로 다른 사람의 기록 UUID를 바꿔 읽기/삭제/공유/초대 승격을 시도해 모두 거부되는지 검사하고, 공유 철회 후 B 및 치료사 A의 조회가 즉시 바뀌는지 확인한다.
11. 가입·동의·퇴사 및 치료사 변경, 정보주체의 삭제·열람, 보존 기간, 데이터 백업/키 복구, 비정상 트래픽, 공급업체 위탁/국외 이전, 유료 및 SLA의 필요성을 검토한 뒤에만 실운영 전환을 논의한다.

## 현재 검증 수단

- `.github/workflows/ildan-supabase-migration-ci.yml` — Node 기본 기록 계약 검사, 실제 PostgreSQL 16의 역할별 RLS·권한승격 시도·초대 토큰 재사용 검사, Deno Edge Function 타입 검사 및 브라우저 JS 구문 검사.
- `supabase/tests/00_stub_supabase_auth.sql` — 테스트 환경 Auth 흉내이며 운영 프로젝트에 반영하지 않는다.
- `supabase/tests/01_role_isolation.sql` — 가상 학생·보호자·담당/무관 치료사·재사용 초대코드 구별.
- GitHub Pages의 기존 `design-v15/` 체험판은 계속 가상 데이터 전용이다.

## 현재 기능 차이 및 사용 금지 사유

- 기존 패스키와 재등록 시스템은 **새 방식에서 아직 지원하지 않는다**.
- 선택형 ABC, 감정, 보호자 간편·자세히, 회기 메모 화면은 기존 UI를 복사해 유지하되, **실제 계정으로 전체 사용자 흐름을 검증하지 않았다**.
- Supabase 기본 OTP 발신 SMTP/학생 이메일 소유권은 아직 미해결이다.
- Google Drive 백업은 이 새 버전에서 명시적으로 **비활성화**, 외부 복사본 자동 회수를 약속하지 않는다.
- `sessionStorage`의 임시 로그인 토큰은 탭 종료 후 사라지는 방식이며 계정 공유 단말 및 XSS 검토가 필요하다.
- 웹 폼에서 역할을 변경하는 기능은 없지만, 서버가 실제로 규칙을 적용하는지는 Supabase 계정이 연결된 후 별도 통합 테스트가 필수다.

**정리:** 코드를 옮길 준비와 합성자료 검사 != 실제 아동 개인정보 사용 승인.

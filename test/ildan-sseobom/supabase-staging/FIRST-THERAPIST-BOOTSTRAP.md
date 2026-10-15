# 일단써봄 — 최초 치료사 등록/승인 절차 (2026-10-15)

실제 환아·보호자 상담정보 입력 **금지**. Supabase Free 개발 프로젝트 대상. 계정 검증은 테스트 참여한 치료사 본인만 가능하며 운영자의 신원 확인 없이 자동 권한을 부여하지 않는다.

1. `/test/ildan-sseobom/supabase-staging/` → **처음 이용해요** → 본인 이메일. Supabase 기본 발송기는 프로젝트 **팀원 이메일만** 받으므로 이 단계는 프로젝트 팀원으로 제한된다. 신규 이메일 발송 서비스 유료 신청/추가하지 않는다.
2. 수신한 인증 링크에서 돌아왔을 때 Supabase Auth의 사용자가 확인되었는지 검증. 로그인 리디렉션 허용 주소에 `https://ulmoa0701-a11y.github.io/ulmoa-sam/test/ildan-sseobom/supabase-staging/`가 있는지 Supabase Dashboard → Authentication → URL Configuration에서 확인한다. **현재 실제 메일 수신·콜백은 검증 전**.
3. 등록된 사용자는 **계정 연결 확인 중** 화면에 자신의 Auth 사용자 ID가 나온다. 운영자는 실제 신원 및 이메일 소유를 별도로 확인하고, Supabase Dashboard → Authentication → Users에서 `email_confirmed_at`과 사용자 ID가 일치하는지 확인한다.
4. 승인 가능한 신원에 한해 Supabase SQL Editor에서 다음 내용을 **사용자 ID를 직접 확인하여 교체한 뒤** 실행한다. 승인 대상자가 아니라면 실행하지 않는다.

```sql
-- 예시 UUID 그대로 실행하지 말 것: 실제 인증 완료한 승인 대상 ID로 바꿀 것.
insert into public.ildan_members (user_id, role, therapist_id, student_id, display_alias)
select u.id, 'therapist', null, null, '치료사'
from auth.users u
where u.id = '00000000-0000-0000-0000-000000000000'::uuid
  and u.email_confirmed_at is not null
on conflict (user_id) do nothing;
```

5. 사용자가 **권한 다시 확인**을 누르면, 서버가 등록된 치료사 역할을 확인한 후에만 치료사 화면을 보여준다.
6. 로그인된 치료사 화면의 **이 기기 등록**을 눌러 패스키를 등록한다. Supabase Authentication → Passkeys를 활성화하고 WebAuthn RP ID를 `ulmoa0701-a11y.github.io`, Origin을 `https://ulmoa0701-a11y.github.io`로 설정해야 한다(프로젝트 설정과 도메인 적합성 검증 필요). 실험적 기능으로 실제 기기 테스트 전에는 성공 표시 금지.
7. 이후 **이미 등록했어요**에서 패스키로 재접속한다. 계정과 복구 경로 확인 전에는 실제 자료를 기록하지 않는다.

주의:
- Supabase 기본 SMTP는 개발/팀원 이메일로 제한되고 실운영용 SLA가 없다. 다른 치료사에게 이메일을 보낼 실운영 단계에는 승인된 무료 SMTP 등의 검토가 필요하다. SMS OTP는 통상 별도 문자 공급자 계약 및 발송 비용이 든다.
- 학생·보호자의 일회용 카카오톡 초대 링크는 **본인 확인과 패스키 등록 트랜잭션이 안전하게 완성되기 전에는 사용할 수 없다**. 보호자 권한은 학생 접근과 별개이며 단순 링크만으로 지속적인 열람을 열지 않는다.
- `INVITE_REGISTRATION_ENABLED`와 `CLINICAL_WRITES_ENABLED`를 켜지 않는다. 레거시 `invite-register`의 토큰-해시 전달 구조는 추가 검토가 필요하다.
- 원본 디자인-v15, 실운영 데이터, 기존 Supabase 테이블을 덮어쓰지 않는다.

검증 절차: PR의 Chrome 390px/1440px mock UI 테스트, GitHub Actions 백엔드 비인가 401/403/초대 등록 503 확인; **실제 삼성 인터넷/카카오톡/Chrome/Safari passkey 테스트는 별도로 필요**.

출처:
- https://supabase.com/docs/guides/auth/passkeys
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/phone-login

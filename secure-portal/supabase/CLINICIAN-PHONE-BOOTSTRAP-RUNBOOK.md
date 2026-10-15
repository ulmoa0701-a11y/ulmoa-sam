# 일단써봄 · 첫 치료사 휴대전화 인증 → 학생·보호자 초대 안내 (2026-10-15)

## 역할별 최초 등록
- **치료사**: 문자 SMS 6자리 인증을 통해 Supabase Auth에 가입하고, 기관 관리자가 실제 치료사 신원을 확인한 다음 `ildan_members`에 `therapist` 권한을 등록합니다. 휴대전화 인증만으로는 치료사 역할 자동 부여 **금지**.
- **보호자**: 치료사가 보호자 전용 일회용 카카오톡/웹 링크 발급. 이후 보호자 본인·법정대리인 확인과 기기 인증을 마친 뒤 계정 연결. 현재 개발본의 최종 가입은 `INVITE_REGISTRATION_ENABLED` 환경설정이 없으면 503으로 차단됩니다.
- **학생**: 전화번호가 없는 아이도 있으므로 SMS 필수 등록 금지. 치료사의 학생용 일회용 링크와 감독된 최초 기기 등록으로 처리합니다. 학생 계정과 보호자 계정은 별도.
- 휴대전화 번호는 Supabase Auth에만 전달하며, 기록 테이블에는 저장하지 않습니다.

## 현재 SMS 인증 상태
Supabase 전화 OTP는 **Auth → Providers → Phone 활성화와 Twilio/MessageBird/Vonage 등 SMS 제공업체 설정**이 필요합니다. 문자 제공업체 이용 요금이 별도로 발생할 수 있습니다. 사용자가 **비용을 명시적으로 승인하기 전에는 연결/결제/발송하지 마세요**.
- 공개 프런트 설정: `test/ildan-sseobom/supabase-staging/config.js` 안 `phoneOtpEnabled: false`(기본).
- 사용자 승인 → SMS 제공업체 설정 → 실제 문자 발송 확인 후 `phoneOtpEnabled:true`로 켜는 순서입니다.
- Supabase Auth `signInWithOtp({phone:'+8210...',options:{shouldCreateUser:true}})` → `verifyOtp({phone,token,type:'sms'})` 이용. 전화번호 자체는 서버에 전송하지 않고 Supabase로 전송합니다.
- 현재 첫 로그인 대체 수단은 치료사의 기존 이메일 OTP 항목이지만, Supabase 이메일 템플릿을 실제 6자리 OTP로 맞추고 이메일 전달 가능 여부를 검증해야 사용할 수 있습니다.
- 패스키는 Supabase Auth → Passkeys 기능을 별도로 활성화하고 실제 기기에서 검증해야 합니다. 현재 실험 기능입니다.

## 첫 치료사 계정 수동 승인 (운영 관리자 전용)
1. 실제 SMS 연동이 완료된 후 치료사가 **본인 휴대전화로 OTP를 받아 인증**.
2. 인증된 사용자 화면에서 본인 `user_id`를 확인합니다. 식별번호는 로그인 비밀번호나 인증코드가 아니며, 불특정 다수에게 공유하지 않습니다.
3. Supabase Dashboard → Authentication → Users에서 해당 UUID의 **phone verified** 및 기관이 알고 있는 실제 치료사와의 관계를 확인합니다.
4. 기관 관리자 권한으로만 **SQL Editor**에서 검증 완료된 UUID를 사용해 다음 쿼리를 실행합니다. 아래 `REPLACE_WITH_VERIFIED_USER_UUID`는 관리자만 자신의 프로젝트에 입력합니다. 이 쿼리는 확인되지 않은 계정에 치료사 권한을 부여하지 않습니다.

```sql
BEGIN;
INSERT INTO public.ildan_members (user_id, role, display_alias)
SELECT id, 'therapist', '울모아쌤'
FROM auth.users
WHERE id = 'REPLACE_WITH_VERIFIED_USER_UUID'::uuid
  AND phone_confirmed_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.ildan_members WHERE role = 'therapist');
COMMIT;
```

5. 치료사는 기존 로그인 세션에서 **승인 확인하기**를 누릅니다. 권한이 확인되면 치료사 계정관리 화면이 열립니다.
6. 신규 치료사는 인증번호만으로 역할 변경 불가. 향후 다른 치료사 승인용 관리자 기능 별도 구축 필요.

**주의**: 최초 치료사 등록은 사용자 본인에 대한 신원확인과 운영자 승인 없이는 실행하지 않습니다. 이메일/전화번호 인증은 실제 치료사 자격·고용관계를 증명하지 않습니다.

## 완료·미완료
- ✅ 전화번호 입력 정규화(+82), SMS OTP 요청/검증 UI·SDK 코딩.
- ✅ 인증된 전화번호 기반 Supabase JWT를 Edge API에서도 승인하도록 수정. RLS·배정학생·기록작성 제한 유지.
- ✅ SMS 미설정 개발본에서는 OTP 발송 버튼 기본 비활성; Chrome 모바일/PC QA.
- ✅ Supabase Edge `ildan-api` v4 배포, 기존 임상 기록 쓰기 비활성.
- ❌ 실제 SMS 제공업체 연결 및 OTP 실수신 검증 미완료.
- ❌ 실제 첫 치료사 신원 확인/계정 생성/수동 권한 등록 미완료.
- ❌ 보호자·학생 실가입/패스키 기기등록/재발급/법정대리인 동의 검증 미완료.
- ❌ 실제 치료·상담정보 사용 승인 아님.

**실제 상담정보 입력 금지**. 초기에는 가상 계정/가상 데이터만 테스트하세요.

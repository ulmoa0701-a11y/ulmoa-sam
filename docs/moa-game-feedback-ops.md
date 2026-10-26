# 모아의 다섯 정원 · 게임 제보 운영 지침 (2026-10-27)

## 구현 상태
- 34개 게임을 포함하는 7개 게임 진입점에서 ‘이 화면 제보’ 제공
- 현재 게임·화면 유형·라운드 표기·버전·화면 크기만 자동 첨부. **정답·실명·진단명·학생 ID·계정·얼굴 원본 미수집**
- 화면 캡처는 이용자 브라우저 안에서 html2canvas 1.4.1로 시도함. 카메라·비디오·iframe·입력칸·프로필·닉네임 영역 등은 렌더링 전에 제거. 가능한 브라우저에서 FaceDetector 보조 가림. 손동작 카메라 게임은 캡처 자체를 비활성화
- 앱이 알 수 없는 이름·얼굴을 전부 자동 발견하는 것은 **보장 불가능**. 사용자가 미리보기에서 추가로 불투명하게 가리고 확인을 선택해야만 JPEG를 전송함. 화면이 안전하게 캡처되지 않으면 **사진 없이 글만 제출** 가능
- 결과 화면에 ‘피드백 남기기’, 진행 중에도 작은 ‘이 화면 제보’ 표시. 같은 페이지에서 게임을 이어갈 수 있게 유지하되 **실시간 타이머의 일시정지는 게임별 별도 구현 대상**임

## 접수 방식
- POST https://miohovwmhmtcvkurjamm.supabase.co/functions/v1/moa-game-feedback
- 테이블: public.moa_game_feedback (RLS on; public/select 권한 없음)
- 사진: 스토리지 private bucket moa-game-feedback-private (image/jpeg 180KB 이하, 공개 URL 없음)
- 응답에는 접수번호만 반환. 익명 IP를 일별 salted SHA-256 해시해 남용을 제한(1일 8건). 클라이언트에 Supabase 관리자 API key를 넣지 않음
- 사진을 보내기 전 이용자에게 확인 받기. **어떤 얼굴과 개인정보도 100% 탐지한다고 주장하지 않기**
- 기존 Jotform '게임 신고 접수'는 접수 실패 시 백업 링크. 새 시스템과 자료 저장 위치가 다르므로 중복 접수 여부 수동 확인
- Jotform과 신규 Supabase는 별개이며, 기존 ‘일단써봄’ 학생기록·아이디어 채널을 공개하거나 수정하지 않음

## 새 제보를 검토하는 법
Supabase Dashboard > Table Editor > `moa_game_feedback`에서 상태와 내용을 볼 수 있습니다. 사진은 Storage > `moa-game-feedback-private` 버킷에서 접수 레코드의 `image_path`를 사용해 제한적으로 확인합니다. **비공개 스크린샷 경로를 공개 링크로 전환하거나 외부에 전달하지 말 것.**

사용자가 요청하면 assistant는 연결된 Supabase 도구로 읽기 전용 SQL을 먼저 수행합니다:

```sql
select id, created_at, game_id, game_name, kind,
       screen_name, round_label, app_version, description,
       image_attached, image_path, status, reviewer_note
from public.moa_game_feedback
where status in ('needs_review','triaged','reproduced','needs_owner_check')
order by created_at desc
limit 100;
```

권장 상태:
- `needs_review`: 신규
- `triaged`: 동일·유사 제보 분류 후
- `reproduced`: 별도 환경에서 재현 성공
- `needs_owner_check`: 판단 어려운 사항·사용자 수동 확인 목록
- `approved`: 실제 수정 승인
- `fixed`: 수정·검증·배포 완료
- `wont_fix`: 정책·임상·서비스 목적과 맞지 않아 수정하지 않음
- `duplicate`: 동일 오류가 이미 제보됨

**금지:** 사용자 제보만 보고 자동으로 GitHub 코드를 바꾸거나 배포하지 않기. 캡처가 있어도 재현 검증 없이 ‘버그 확정’이라고 하지 않기. 아동의 진단·성취도를 추정하거나 보상 포인트를 자동 지급하지 않기.

## 점검과 보존
- 변경 전 실제 URL·문제 상황을 Playwright에서 재현하고, 수정 후 해당 게임 및 34개 게임 회귀 검사
- 저장 이미지 보존 기간과 삭제 정책은 운영자가 별도 확정해야 함. 실제 개인정보가 발견되면 우선 비공개 유지하고 즉시 삭제·차단하며 공유 금지
- 외부 저장 서비스의 무료 이용량 초과 가능성을 확인해야 하며, 서비스에 과금/자동 업그레이드를 요청하지 말 것
- 제출 후 응답 유실 시 중복 접수 위험이 있으므로 새로 고침 없이 접수 기록을 확인하는 절차 마련

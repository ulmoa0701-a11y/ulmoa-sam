\set ON_ERROR_STOP on
INSERT INTO auth.users(id,email_confirmed_at) VALUES
('00000000-0000-4000-8000-000000000008',now()),
('00000000-0000-4000-8000-000000000009',now()),
('00000000-0000-4000-8000-000000000010',now());
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',false);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
SELECT public.ildan_issue_invite(repeat('d',64),'student',NULL);
SELECT public.ildan_issue_invite(repeat('e',64),'parent','00000000-0000-4000-8000-000000000002');
DO $$BEGIN
 BEGIN
  PERFORM public.ildan_claim_invite_for_user(repeat('d',64),'00000000-0000-4000-8000-000000000008');
  RAISE EXCEPTION 'client could enroll without server authorization';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END$$;
RESET ROLE;
SET ROLE service_role;
SELECT set_config('request.jwt.claim.role','service_role',false);
DO $$BEGIN
 IF public.ildan_claim_invite_for_user(repeat('d',64),'00000000-0000-4000-8000-000000000008')<>'student' THEN
  RAISE EXCEPTION 'student role mismatch'; END IF;
 IF public.ildan_claim_invite_for_user(repeat('e',64),'00000000-0000-4000-8000-000000000009')<>'parent' THEN
  RAISE EXCEPTION 'parent role mismatch'; END IF;
 BEGIN
  PERFORM public.ildan_claim_invite_for_user(repeat('d',64),'00000000-0000-4000-8000-000000000010');
  RAISE EXCEPTION 'replayed clinic invite accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END$$;
RESET ROLE;
DO $$BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.ildan_members WHERE user_id='00000000-0000-4000-8000-000000000008' AND role='student') THEN RAISE EXCEPTION 'student not enrolled';END IF;
 IF NOT EXISTS (SELECT 1 FROM public.ildan_members WHERE user_id='00000000-0000-4000-8000-000000000009' AND role='parent' AND student_id='00000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'parent linked incorrectly';END IF;
END$$;
SELECT 'PASS: student/guardian single-use enrollment, service role enforcement, no client elevation' AS result;

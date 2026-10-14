\set ON_ERROR_STOP on
-- Distinct synthetic staff/child/guardian accounts only. No real names or health details.
INSERT INTO auth.users(id,email_confirmed_at) VALUES
 ('00000000-0000-4000-8000-000000000001',now()),
 ('00000000-0000-4000-8000-000000000002',now()),
 ('00000000-0000-4000-8000-000000000003',now()),
 ('00000000-0000-4000-8000-000000000004',now()),
 ('00000000-0000-4000-8000-000000000005',now()),
 ('00000000-0000-4000-8000-000000000006',now()),
 ('00000000-0000-4000-8000-000000000007',NULL);
INSERT INTO public.ildan_members(user_id,role,display_alias) VALUES
 ('00000000-0000-4000-8000-000000000001','therapist','가상T1'),
 ('00000000-0000-4000-8000-000000000004','therapist','가상T2');
INSERT INTO public.ildan_members(user_id,role,therapist_id,display_alias) VALUES
 ('00000000-0000-4000-8000-000000000002','student','00000000-0000-4000-8000-000000000001','가상S1'),
 ('00000000-0000-4000-8000-000000000005','student','00000000-0000-4000-8000-000000000004','가상S2');
INSERT INTO public.ildan_members(user_id,role,therapist_id,student_id,display_alias) VALUES
 ('00000000-0000-4000-8000-000000000003','parent','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','가상P1');
INSERT INTO public.ildan_records(id,author_id,student_id,therapist_id,kind,private_nonce,private_ciphertext,shared_nonce,shared_ciphertext,shared_at)
VALUES
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','student','AAAAAAAAAAAAAA12','ciphertexts1private',NULL,NULL,NULL),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','parent','AAAAAAAAAAAAAA34','ciphertextp1private','BBBBBBBBBBBBBB12','ciphertextp1selected',now()),
 ('10000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000004','student','AAAAAAAAAAAAAA56','ciphertexts2private','BBBBBBBBBBBBBB34','ciphertexts2selected',now());
INSERT INTO public.ildan_session_notes(id,therapist_id,student_id,nonce,ciphertext) VALUES
 ('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','XXXXXXXXXXXXXXX1','encryptednote1'),
 ('20000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000005','XXXXXXXXXXXXXXX2','encryptednote2');

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
DO $$BEGIN
 IF (SELECT count(*) FROM public.ildan_records)<>1 THEN RAISE EXCEPTION 'student can read other records'; END IF;
 IF (SELECT count(*) FROM public.ildan_session_notes)<>0 THEN RAISE EXCEPTION 'student can read therapist private notes'; END IF;
END$$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
DO $$BEGIN
 IF (SELECT count(*) FROM public.ildan_records)<>1 THEN RAISE EXCEPTION 'parent can read child or other parents records'; END IF;
 IF (SELECT count(*) FROM public.ildan_session_notes)<>0 THEN RAISE EXCEPTION 'parent can read private therapist notes'; END IF;
END$$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
DO $$BEGIN
 IF (SELECT count(*) FROM public.ildan_records)<>0 THEN RAISE EXCEPTION 'therapist can directly SELECT child encrypted private payload'; END IF;
 IF (SELECT count(*) FROM public.ildan_session_notes)<>1 THEN RAISE EXCEPTION 'therapist note scope wrong'; END IF;
 IF EXISTS(SELECT 1 FROM public.ildan_records WHERE author_id='00000000-0000-4000-8000-000000000002') THEN
  RAISE EXCEPTION 'therapist can see student private entry'; END IF;
END$$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',false);
DO $$BEGIN
 IF (SELECT count(*) FROM public.ildan_records)<>0 THEN RAISE EXCEPTION 'unrelated therapist can directly read child records'; END IF;
 IF (SELECT count(*) FROM public.ildan_session_notes)<>1 THEN RAISE EXCEPTION 'unrelated therapist notes wrong'; END IF;
END$$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
DO $$BEGIN
 BEGIN
  UPDATE public.ildan_members SET role='therapist' WHERE user_id='00000000-0000-4000-8000-000000000003';
  RAISE EXCEPTION 'parent elevated their own role';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO public.ildan_records(author_id,student_id,therapist_id,kind,private_nonce,private_ciphertext)
   VALUES ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','parent','AAAAAAAAAAAAAA78','fakeciphertext');
  RAISE EXCEPTION 'direct forged record write accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END$$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
-- Only the assigned therapist can issue one-time invitation.
SELECT public.ildan_issue_invite(repeat('a',64),'student',NULL);
DO $$BEGIN
 BEGIN
  PERFORM public.ildan_issue_invite(repeat('b',64),'parent','00000000-0000-4000-8000-000000000005');
  RAISE EXCEPTION 'therapist assigned parent to foreign student';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END$$;
-- Valid previously-confirmed test user uses exactly once.
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',false);
DO $$BEGIN
 IF public.ildan_claim_invite(repeat('a',64))<>'student' THEN RAISE EXCEPTION 'invite claim wrong role';END IF;
 BEGIN
  PERFORM public.ildan_claim_invite(repeat('a',64));
  RAISE EXCEPTION 'replayed invitation accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END$$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
SELECT public.ildan_issue_invite(repeat('c',64),'student',NULL);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000007',false);
DO $$BEGIN
 BEGIN
  PERFORM public.ildan_claim_invite(repeat('c',64));
  RAISE EXCEPTION 'unverified auth account joined';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END$$;
RESET ROLE;
SELECT 'PASS: role isolation, encrypted-only access, one-time verified invitations' AS result;

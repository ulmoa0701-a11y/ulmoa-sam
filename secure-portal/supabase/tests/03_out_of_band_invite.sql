\set ON_ERROR_STOP on
-- Runs after legacy invite tests; new invite link ALONE must fail.
insert into auth.users(id,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000011',now()),
 ('00000000-0000-4000-8000-000000000012',now());
insert into public.ildan_invites
 (code_digest,verification_digest,role,therapist_id,issued_by,expires_at)
values(repeat('1',64),repeat('2',64),'student',
 '00000000-0000-4000-8000-000000000001',
 '00000000-0000-4000-8000-000000000001',now()+interval '48 hours');
set role authenticated;
select set_config('request.jwt.claim.role','authenticated',false);
do $$ begin
 begin
  perform public.ildan_claim_invite_for_user(repeat('1',64),
   '00000000-0000-4000-8000-000000000011',repeat('2',64));
  raise exception 'Browser could elevate its own role';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set role service_role;
select set_config('request.jwt.claim.role','service_role',false);
do $$ begin
 begin
  perform public.ildan_claim_invite_for_user(repeat('1',64),
   '00000000-0000-4000-8000-000000000011',repeat('9',64));
  raise exception 'Bearer invite alone accepted';
 exception when insufficient_privilege then null; end;
 if public.ildan_claim_invite_for_user(repeat('1',64),
  '00000000-0000-4000-8000-000000000011',repeat('2',64))<>'student'
 then raise exception 'verified second-code claim failed'; end if;
 begin
  perform public.ildan_claim_invite_for_user(repeat('1',64),
   '00000000-0000-4000-8000-000000000012',repeat('2',64));
  raise exception 'one-time invite replay succeeded';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: out-of-band code required, browser RPC blocked, one-use enrollment' as result;

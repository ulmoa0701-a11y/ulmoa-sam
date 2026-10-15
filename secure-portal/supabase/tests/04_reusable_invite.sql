\set ON_ERROR_STOP on
-- Previous tests enrolled test student 11 and used invitations 1 and 3.
-- Migration must preserve used links and extend their valid access window.
do $$ begin
 if not exists(select 1 from public.ildan_invites
  where code_digest=repeat('1',64) and used_by='00000000-0000-4000-8000-000000000011'
   and revoked_at is null and expires_at>now()+interval '1 year')
 then raise exception 'Used student link was not preserved as reusable'; end if;
 if not exists(select 1 from public.ildan_invites
  where code_digest=repeat('3',64) and used_by='00000000-0000-4000-8000-000000000011'
   and revoked_at is null and expires_at>now()+interval '1 year')
 then raise exception 'Existing account link not preserved as reusable'; end if;
end $$;
insert into public.ildan_invites
(code_digest,verification_digest,role,therapist_id,issued_by,target_user_id,expires_at)
values(repeat('5',64),repeat('6',64),'student',
 '00000000-0000-4000-8000-000000000001',
 '00000000-0000-4000-8000-000000000001',
 '00000000-0000-4000-8000-000000000011',
 now()+interval '10 year');
update public.ildan_invites set revoked_at=now() where code_digest=repeat('5',64);
set role service_role;
select set_config('request.jwt.claim.role','service_role',false);
do $$ begin
 begin
  perform public.ildan_claim_invite_for_user(repeat('5',64),
   '00000000-0000-4000-8000-000000000011',repeat('6',64));
  raise exception 'Revoked invite was claimed after revocation';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: previously issued links preserved and revoked invites cannot enroll' as result;

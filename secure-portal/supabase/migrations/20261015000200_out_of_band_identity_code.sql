-- 2026-10-15: keep email-free enrollment passwordless without relying on disabled hosted passkeys.
-- A link alone never authorizes account creation: a separate 96-bit check code is
-- conveyed only AFTER the treating clinician verifies identity through an existing trusted channel.
-- No existing clients have enrolled; all active invitations require both factors.
alter table public.ildan_invites
  add column if not exists verification_digest text;
alter table public.ildan_invites
  add column if not exists target_user_id uuid references auth.users(id) on delete cascade;
-- The enrollment project had no issued invitations at implementation; a fail-closed migration
-- expires any previously issued invitations rather than making them usable without a second factor.
update public.ildan_invites set expires_at=now()
 where verification_digest is null and used_by is null;
alter table public.ildan_invites
  add constraint ildan_invite_verification_digest_check
  check (verification_digest ~ '^[0-9a-f]{64}$');
-- Reject legacy bearer-link-only RPC enrollment paths completely.
drop function if exists public.ildan_claim_invite(text);
drop function if exists public.ildan_issue_invite(text,text,uuid);
drop function if exists public.ildan_claim_invite_for_user(text,uuid);

create function public.ildan_claim_invite_for_user(
 p_code_digest text, p_user_id uuid, p_verification_digest text
) returns text
language plpgsql security definer set search_path=''
as $$
declare v_inv public.ildan_invites%rowtype;
begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role'
 then raise exception 'Service role required' using errcode='42501'; end if;
 if p_code_digest !~ '^[0-9a-f]{64}$'
  or p_verification_digest !~ '^[0-9a-f]{64}$'
  or p_user_id is null
 then raise exception 'Invalid enrollment' using errcode='22023'; end if;
 if not exists(select 1 from auth.users where id=p_user_id and email_confirmed_at is not null)
 then raise exception 'Confirmed account required' using errcode='42501'; end if;

 select * into v_inv from public.ildan_invites
  where code_digest=p_code_digest and used_by is null and expires_at>now()
  for update;
 if not found or v_inv.verification_digest is distinct from p_verification_digest
 then raise exception 'Link or verification code invalid' using errcode='42501'; end if;
 if not exists(select 1 from public.ildan_members
  where user_id=v_inv.therapist_id and role='therapist')
 then raise exception 'Therapist inactive' using errcode='42501'; end if;
 if v_inv.target_user_id is not null then
  if v_inv.target_user_id is distinct from p_user_id
   or not exists(
    select 1 from public.ildan_members m
    where m.user_id=p_user_id and m.role=v_inv.role
     and m.therapist_id=v_inv.therapist_id
     and (v_inv.role='student' or m.student_id=v_inv.student_id)
   )
  then raise exception 'Existing account ownership mismatch' using errcode='42501'; end if;
 else
  if exists(select 1 from public.ildan_members where user_id=p_user_id)
  then raise exception 'Account already enrolled' using errcode='42501'; end if;
 if v_inv.role='parent' and not exists(select 1 from public.ildan_members
  where user_id=v_inv.student_id and role='student' and therapist_id=v_inv.therapist_id)
 then raise exception 'Student assignment mismatch' using errcode='42501'; end if;
 if v_inv.role='student' and v_inv.student_id is not null
 then raise exception 'Invalid student invitation' using errcode='42501'; end if;
 insert into public.ildan_members(user_id,role,therapist_id,student_id)
 values(p_user_id,v_inv.role,v_inv.therapist_id,v_inv.student_id);
 end if;
 update public.ildan_invites set used_by=p_user_id
  where code_digest=p_code_digest and used_by is null;
 if not found then raise exception 'Invitation already claimed' using errcode='42501'; end if;
 return v_inv.role;
end $$;
revoke all on function public.ildan_claim_invite_for_user(text,uuid,text)
 from public,anon,authenticated;
grant execute on function public.ildan_claim_invite_for_user(text,uuid,text) to service_role;
comment on function public.ildan_claim_invite_for_user(text,uuid,text) is
 'Service-only atomic claim; verifies independent out-of-band identity check code before assigning roles.';

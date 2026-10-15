-- Keep high-entropy invite links reusable; PIN is a shorter, separate proof.
-- The PUBLIC browser never receives privileged access. Only the Edge Function
-- may check hashed secrets and update attempt counters via service_role.
alter table public.ildan_invites
 add column if not exists failed_pin_attempts integer not null default 0,
 add column if not exists pin_locked_until timestamptz;
alter table public.ildan_invites
 add constraint ildan_invite_failed_pin_attempts_check check(failed_pin_attempts between 0 and 5);
create or replace function public.ildan_claim_invite_for_user(
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
  where code_digest=p_code_digest and used_by is null and revoked_at is null and expires_at>now()
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

create or replace function public.ildan_validate_invite_pin(
 p_code_digest text,p_verification_digest text
) returns boolean
language plpgsql security definer set search_path=''
as $$
declare v_inv public.ildan_invites%rowtype;
begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role'
 then raise exception 'Service role required' using errcode='42501'; end if;
 if p_code_digest !~ '^[0-9a-f]{64}$' or p_verification_digest !~ '^[0-9a-f]{64}$'
 then return false; end if;
 select * into v_inv from public.ildan_invites
 where code_digest=p_code_digest and revoked_at is null and expires_at>now()
 for update;
 if not found then return false; end if;
 if v_inv.pin_locked_until is not null and v_inv.pin_locked_until > now() then return false; end if;
 if v_inv.verification_digest is distinct from p_verification_digest then
  update public.ildan_invites
   set failed_pin_attempts=case when v_inv.pin_locked_until is not null and v_inv.pin_locked_until<=now()
     then 1 else least(v_inv.failed_pin_attempts+1,5) end,
    pin_locked_until=case when v_inv.pin_locked_until is not null and v_inv.pin_locked_until<=now()
     then null when v_inv.failed_pin_attempts>=4
     then now()+interval '30 minutes' else null end
  where code_digest=p_code_digest;
  return false;
 end if;
 update public.ildan_invites set failed_pin_attempts=0,pin_locked_until=null where code_digest=p_code_digest;
 return true;
end $$;
revoke all on function public.ildan_validate_invite_pin(text,text) from public,anon,authenticated;
grant execute on function public.ildan_validate_invite_pin(text,text) to service_role;
comment on function public.ildan_validate_invite_pin(text,text) is
 'Service-only atomic rate limiter. 4-digit PIN works only with 256-bit link; 5 bad attempts locks invitation for 30m.';

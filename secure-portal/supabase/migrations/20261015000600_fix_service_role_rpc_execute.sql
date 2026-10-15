-- Supabase's server-only secret reaches PostgREST with database role service_role
-- but does not necessarily populate legacy request.jwt.claim.role.
-- EXECUTE privilege, not a legacy JWT GUC, is the authoritative trust boundary.
-- Never give EXECUTE to anon/authenticated. The Edge endpoint verifies its
-- user auth and role before it can ever call this service-only RPC.
create or replace function public.ildan_claim_invite_for_user(
 p_code_digest text, p_user_id uuid, p_verification_digest text
) returns text
language plpgsql security definer set search_path=''
as $$
declare v_inv public.ildan_invites%rowtype;
begin
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

REVOKE ALL ON FUNCTION public.ildan_claim_invite_for_user(text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ildan_claim_invite_for_user(text,uuid,text) TO service_role;
COMMENT ON FUNCTION public.ildan_claim_invite_for_user(text,uuid,text) IS
 'Atomic account claim. SECURITY DEFINER callable only by service_role via database grant; checks user/therapist ownership, revocation, role and one-time first claim.';

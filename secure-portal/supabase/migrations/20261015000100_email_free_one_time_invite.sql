-- Server-only one-time invite claim for email-free, passkey-bound account enrollment.
-- NEVER callable by clients. Enroll only after explicit user confirmation on the invite page.
CREATE OR REPLACE FUNCTION public.ildan_claim_invite_for_user(
  p_code_digest text,
  p_user_id uuid
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_inv public.ildan_invites%ROWTYPE;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
   RAISE EXCEPTION 'Service authorization required' USING ERRCODE='42501';
 END IF;
 IF p_code_digest !~ '^[0-9a-f]{64}$' OR p_user_id IS NULL THEN
   RAISE EXCEPTION 'Invalid claim' USING ERRCODE='22023';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM auth.users
   WHERE id=p_user_id AND email_confirmed_at IS NOT NULL
 ) THEN
   RAISE EXCEPTION 'Confirmed account required' USING ERRCODE='42501';
 END IF;
 IF EXISTS(SELECT 1 FROM public.ildan_members WHERE user_id=p_user_id) THEN
   RAISE EXCEPTION 'Account already enrolled' USING ERRCODE='23505';
 END IF;
 SELECT * INTO v_inv FROM public.ildan_invites
   WHERE code_digest=p_code_digest AND used_by IS NULL AND expires_at>now()
   FOR UPDATE;
 IF NOT FOUND THEN
   RAISE EXCEPTION 'Invite expired or used' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS(
   SELECT 1 FROM public.ildan_members
   WHERE user_id=v_inv.therapist_id AND role='therapist'
 ) THEN
   RAISE EXCEPTION 'Therapist no longer available' USING ERRCODE='42501';
 END IF;
 IF v_inv.role='parent' AND NOT EXISTS(
   SELECT 1 FROM public.ildan_members
   WHERE user_id=v_inv.student_id AND role='student' AND therapist_id=v_inv.therapist_id
 ) THEN
   RAISE EXCEPTION 'Guardian student assignment invalid' USING ERRCODE='42501';
 END IF;
 INSERT INTO public.ildan_members(user_id,role,therapist_id,student_id)
 VALUES(p_user_id,v_inv.role,v_inv.therapist_id,v_inv.student_id);
 UPDATE public.ildan_invites SET used_by=p_user_id
 WHERE code_digest=p_code_digest AND used_by IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invite already claimed' USING ERRCODE='42501'; END IF;
 RETURN v_inv.role;
END
$$;
REVOKE ALL ON FUNCTION public.ildan_claim_invite_for_user(text,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ildan_claim_invite_for_user(text,uuid)
  TO service_role;
COMMENT ON FUNCTION public.ildan_claim_invite_for_user(text,uuid) IS
 'Service-only atomic clinic invitation enrollment; authorizes exact one-time linked role.';

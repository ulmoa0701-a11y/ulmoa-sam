-- 일단써봄 Supabase development schema. DO NOT apply to a clinical production project until independent review.
-- All personal journal content must be AES-GCM encrypted BEFORE insertion by the server-side Edge Function.
-- Apply on an isolated NEW Supabase project. Never expose a service-role secret to the browser.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.ildan_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('therapist','student','parent')),
  therapist_id uuid REFERENCES public.ildan_members(user_id),
  student_id uuid REFERENCES public.ildan_members(user_id),
  display_alias text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ildan_members_shape CHECK (
    (role='therapist' AND therapist_id IS NULL AND student_id IS NULL)
    OR (role='student' AND therapist_id IS NOT NULL AND student_id IS NULL)
    OR (role='parent' AND therapist_id IS NOT NULL AND student_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS ildan_members_teacher_idx ON public.ildan_members (therapist_id);
CREATE INDEX IF NOT EXISTS ildan_members_student_idx ON public.ildan_members (student_id);

CREATE TABLE IF NOT EXISTS public.ildan_invites (
  code_digest text PRIMARY KEY CHECK (code_digest ~ '^[0-9a-f]{64}$'),
  role text NOT NULL CHECK (role IN ('student','parent')),
  therapist_id uuid NOT NULL REFERENCES public.ildan_members(user_id),
  student_id uuid REFERENCES public.ildan_members(user_id),
  issued_by uuid NOT NULL REFERENCES public.ildan_members(user_id),
  used_by uuid REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ildan_invite_role_shape CHECK (
    (role='student' AND student_id IS NULL) OR
    (role='parent' AND student_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.ildan_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.ildan_members(user_id),
  student_id uuid NOT NULL REFERENCES public.ildan_members(user_id),
  therapist_id uuid NOT NULL REFERENCES public.ildan_members(user_id),
  kind text NOT NULL CHECK (kind IN ('student','parent')),
  private_nonce text NOT NULL CHECK (length(private_nonce) BETWEEN 12 AND 128),
  private_ciphertext text NOT NULL CHECK (length(private_ciphertext) BETWEEN 8 AND 50000),
  shared_nonce text,
  shared_ciphertext text,
  shared_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ildan_shared_complete CHECK (
    (shared_at IS NULL AND shared_nonce IS NULL AND shared_ciphertext IS NULL)
    OR (shared_at IS NOT NULL AND shared_nonce IS NOT NULL AND shared_ciphertext IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS ildan_records_author_idx ON public.ildan_records(author_id,created_at DESC);
CREATE INDEX IF NOT EXISTS ildan_records_shared_idx ON public.ildan_records(therapist_id,shared_at)
  WHERE shared_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.ildan_session_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES public.ildan_members(user_id),
  student_id uuid NOT NULL REFERENCES public.ildan_members(user_id),
  nonce text NOT NULL CHECK (length(nonce) BETWEEN 12 AND 128),
  ciphertext text NOT NULL CHECK (length(ciphertext) BETWEEN 8 AND 60000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ildan_notes_teacher_idx
  ON public.ildan_session_notes(therapist_id,student_id,created_at DESC);

ALTER TABLE public.ildan_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ildan_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ildan_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ildan_session_notes ENABLE ROW LEVEL SECURITY;

-- Grant only the minimum exposed Data API permissions. No anonymous client may see any tables.
REVOKE ALL ON public.ildan_members, public.ildan_invites, public.ildan_records,
 public.ildan_session_notes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ildan_members TO authenticated;
GRANT SELECT ON public.ildan_records TO authenticated;
GRANT SELECT ON public.ildan_session_notes TO authenticated;
-- Invitation claiming/issuing, inserting records and revocation are performed via explicit
-- SQL RPCs or by the verified Edge Function with a service client; no direct table writes.

CREATE POLICY ildan_member_read ON public.ildan_members FOR SELECT TO authenticated
 USING (user_id=(select auth.uid()) OR therapist_id=(select auth.uid()));

CREATE POLICY ildan_record_read ON public.ildan_records FOR SELECT TO authenticated
 USING (
  author_id=(select auth.uid())
  OR (
   therapist_id=(select auth.uid())
   AND shared_at IS NOT NULL
   AND shared_ciphertext IS NOT NULL
   AND EXISTS (
    SELECT 1 FROM public.ildan_members m
    WHERE m.user_id=student_id AND m.role='student' AND m.therapist_id=(select auth.uid())
   )
  )
 );

CREATE POLICY ildan_note_therapist_read ON public.ildan_session_notes FOR SELECT TO authenticated
 USING (
  therapist_id=(select auth.uid()) AND EXISTS (
   SELECT 1 FROM public.ildan_members m
   WHERE m.user_id=student_id AND m.role='student' AND m.therapist_id=(select auth.uid())
  )
 );

-- Sensitive mutations happen ONLY in the server-side Edge Function after getUser()
-- and explicit membership verification, never via unaudited direct client inserts/updates.
-- If using service-role client, it bypasses RLS: the Edge Function must always authorize
-- the user before ANY operation. Client-side user-token reads still use the RLS policies.

-- Create a one-time non-guessable invitation digest, only by the authenticated therapist.
CREATE OR REPLACE FUNCTION public.ildan_issue_invite(
 p_code_digest text, p_role text, p_student_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_teacher uuid := auth.uid();
BEGIN
 IF v_teacher IS NULL OR NOT EXISTS (
   SELECT 1 FROM public.ildan_members
   WHERE user_id=v_teacher AND role='therapist'
 ) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 IF p_code_digest !~ '^[0-9a-f]{64}$'
    OR p_role NOT IN ('student','parent') THEN
   RAISE EXCEPTION 'Invalid invitation data';
 END IF;
 IF (p_role='student' AND p_student_id IS NOT NULL)
    OR (p_role='parent' AND NOT EXISTS (
     SELECT 1 FROM public.ildan_members
     WHERE user_id=p_student_id AND role='student' AND therapist_id=v_teacher
    )) THEN
   RAISE EXCEPTION 'Student assignment mismatch' USING ERRCODE='42501';
 END IF;
 INSERT INTO public.ildan_invites
  (code_digest,role,therapist_id,student_id,issued_by,expires_at)
 VALUES (p_code_digest,p_role,v_teacher,p_student_id,v_teacher,now()+interval '48 hours');
END
$$;

-- Claim is transactional: one code -> one verified Supabase Auth user -> fixed role.
-- No self-registration is allowed to choose therapist role.
CREATE OR REPLACE FUNCTION public.ildan_claim_invite(
 p_code_digest text
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_uid uuid := auth.uid(); v_inv public.ildan_invites%ROWTYPE;
BEGIN
 IF v_uid IS NULL OR p_code_digest !~ '^[0-9a-f]{64}$'
   THEN RAISE EXCEPTION 'Invalid session or invitation' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS (
   SELECT 1 FROM auth.users
   WHERE id=v_uid AND email_confirmed_at IS NOT NULL
 ) THEN RAISE EXCEPTION 'Verified login required' USING ERRCODE='42501'; END IF;
 IF EXISTS (SELECT 1 FROM public.ildan_members WHERE user_id=v_uid)
   THEN RAISE EXCEPTION 'Already enrolled' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_inv FROM public.ildan_invites
  WHERE code_digest=p_code_digest AND used_by IS NULL AND expires_at>now()
  FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invitation expired or used' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS (
   SELECT 1 FROM public.ildan_members WHERE user_id=v_inv.therapist_id AND role='therapist'
 ) THEN RAISE EXCEPTION 'Therapist is no longer active' USING ERRCODE='42501'; END IF;
 IF v_inv.role='parent' AND NOT EXISTS (
   SELECT 1 FROM public.ildan_members WHERE user_id=v_inv.student_id
    AND role='student' AND therapist_id=v_inv.therapist_id
 ) THEN RAISE EXCEPTION 'Student link is invalid' USING ERRCODE='42501'; END IF;
 INSERT INTO public.ildan_members(user_id,role,therapist_id,student_id)
 VALUES (v_uid,v_inv.role,v_inv.therapist_id,v_inv.student_id);
 UPDATE public.ildan_invites SET used_by=v_uid WHERE code_digest=p_code_digest;
 RETURN v_inv.role;
END
$$;
REVOKE ALL ON FUNCTION public.ildan_issue_invite(text,text,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.ildan_claim_invite(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ildan_issue_invite(text,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ildan_claim_invite(text) TO authenticated;

-- No user-facing client may set role=therapist. Bootstrap a therapist only after
-- manual identity verification through the trusted project SQL dashboard.
COMMENT ON TABLE public.ildan_records IS 'AES-GCM encrypted client records. DO NOT store plaintext, names or diagnosis.';
COMMENT ON TABLE public.ildan_session_notes IS 'AES-GCM encrypted therapist-only clinical notes.';

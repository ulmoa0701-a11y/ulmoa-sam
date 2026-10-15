-- Reusable student/guardian access invitations for the non-clinical trial.
-- Previously valid invitations are kept; revoked or expired invitations stay disabled.
-- A link + the independent identity code always reconnects to the SAME account.
-- No additional students/guardians are created when an invitation is reused.
ALTER TABLE public.ildan_invites
 ADD COLUMN IF NOT EXISTS revoked_at timestamptz;
UPDATE public.ildan_invites
 SET expires_at = '9999-12-31T23:59:59+00'::timestamptz
 WHERE expires_at > now() AND revoked_at IS NULL;
COMMENT ON COLUMN public.ildan_invites.revoked_at IS
 'Manually revoked by assigned therapist; reusable links are rejected as soon as this is set.';

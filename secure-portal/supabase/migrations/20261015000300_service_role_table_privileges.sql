-- Server API access only; never give these writes to anon or authenticated users.
-- Existing 20261014 initial migration revoked PUBLIC, unintentionally removing
-- service_role's SELECT/INSERT/UPDATE/DELETE grants in the new Supabase project.
-- Supabase service_role is RLS-bypassing; the Edge handler MUST perform
-- verified-JWT, therapist/student/guardian ownership and clinical-write checks.
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
 ON public.ildan_members,
    public.ildan_invites,
    public.ildan_records,
    public.ildan_session_notes
 TO service_role;
-- Explicitly keep browser and ordinary authenticated users read-only;
-- existing SELECT RLS policies continue to restrict visibility.
REVOKE INSERT, UPDATE, DELETE
 ON public.ildan_members, public.ildan_invites,
    public.ildan_records, public.ildan_session_notes
 FROM anon, authenticated;
COMMENT ON TABLE public.ildan_members IS
 'Development role membership. service_role only performs writes through authorization-checked Edge code; browser roles are RLS-scoped and read-only.';

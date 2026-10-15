-- Dedicated non-clinical practice data. No actual patient information is authorized.
-- Keep entirely separate from the production clinical encrypted records.
CREATE TABLE IF NOT EXISTS public.ildan_practice_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 therapist_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK (kind IN ('student','parent')),
 private_nonce text NOT NULL,
 private_ciphertext text NOT NULL,
 shared_nonce text,
 shared_ciphertext text,
 shared_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((shared_at IS NULL AND shared_nonce IS NULL AND shared_ciphertext IS NULL)
     OR (shared_at IS NOT NULL AND shared_nonce IS NOT NULL AND shared_ciphertext IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS ildan_practice_author_created_idx ON public.ildan_practice_records(author_id,created_at DESC);
CREATE INDEX IF NOT EXISTS ildan_practice_therapist_shared_idx ON public.ildan_practice_records(therapist_id,shared_at DESC) WHERE shared_at IS NOT NULL;
ALTER TABLE public.ildan_practice_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ildan_practice_records FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.ildan_practice_records TO service_role;
COMMENT ON TABLE public.ildan_practice_records IS
 'SIMULATION ONLY: encrypted synthetic records accessible exclusively through authorization-checked Edge endpoints. Not an approved clinical records system.';
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES ('ildan-practice-media','ildan-practice-media',false,2097152,ARRAY['image/jpeg'])
 ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=2097152,allowed_mime_types=ARRAY['image/jpeg'];
-- File uploads/downloads use only signed URLs issued by Edge with verified membership,
-- and are not available through public storage.objects RLS permissions.
COMMENT ON TABLE public.ildan_practice_records IS
 'Practice-only encrypted records; image paths use a PRIVATE signed-URL bucket. NO real minors health, identity or therapy data.';

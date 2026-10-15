-- Version guard for editing existing encrypted practice-only records.
-- Existing records remain unchanged; a write replaces ciphertext rather than creating duplicates.
ALTER TABLE public.ildan_practice_records
 ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS ildan_practice_author_updated_idx
 ON public.ildan_practice_records(author_id,updated_at DESC);
COMMENT ON COLUMN public.ildan_practice_records.updated_at IS
 'Optimistic concurrency version: author edits must submit the last observed timestamp';

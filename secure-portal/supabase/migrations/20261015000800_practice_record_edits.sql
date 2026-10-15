-- Non-clinical record edit revisions; existing practice records remain unchanged.
ALTER TABLE public.ildan_practice_records
 ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
COMMENT ON COLUMN public.ildan_practice_records.updated_at IS
 'Last practice-record revision, used for compare-and-swap editing to prevent overwriting changes.';
CREATE INDEX IF NOT EXISTS ildan_practice_updated_idx
 ON public.ildan_practice_records(author_id,updated_at DESC);

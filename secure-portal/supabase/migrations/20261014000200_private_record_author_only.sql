-- Harden access: the encrypted private payload is never readable to a therapist over the Data API.
-- Therapists only retrieve separately encrypted, explicitly selected shared fields through
-- the JWT-verified Edge API after assignment checks; that API uses a service-role client.
DROP POLICY IF EXISTS ildan_record_read ON public.ildan_records;
CREATE POLICY ildan_author_read_only ON public.ildan_records
  FOR SELECT TO authenticated USING (author_id=(select auth.uid()));
COMMENT ON TABLE public.ildan_records IS
 'Private AES-GCM ciphertext visible to the author only via Data API; therapists use authorization-checked Edge API for selected shared ciphertext. No plaintext stored.';

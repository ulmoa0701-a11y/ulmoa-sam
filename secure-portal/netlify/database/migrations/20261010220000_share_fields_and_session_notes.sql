-- Add private author-controlled field sharing; no legacy full-record fallback is provided.
ALTER TABLE portal_records ADD COLUMN IF NOT EXISTS shared_nonce TEXT;
ALTER TABLE portal_records ADD COLUMN IF NOT EXISTS shared_auth_tag TEXT;
ALTER TABLE portal_records ADD COLUMN IF NOT EXISTS encrypted_shared_payload TEXT;
CREATE TABLE IF NOT EXISTS portal_session_notes (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 student_id UUID NOT NULL REFERENCES portal_users(id),
 therapist_id UUID NOT NULL REFERENCES portal_users(id),
 nonce TEXT NOT NULL,
 auth_tag TEXT NOT NULL,
 encrypted_payload TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_session_notes_owner ON portal_session_notes(therapist_id,student_id,created_at DESC);
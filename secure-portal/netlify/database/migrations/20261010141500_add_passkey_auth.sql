-- New accounts use passkeys, not a password stored on the server.
ALTER TABLE portal_users ALTER COLUMN pass_salt DROP NOT NULL;
ALTER TABLE portal_users ALTER COLUMN pass_hash DROP NOT NULL;
CREATE TABLE IF NOT EXISTS portal_passkeys (
 credential_id TEXT PRIMARY KEY,
 user_id UUID NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
 public_key TEXT NOT NULL,
 counter BIGINT NOT NULL DEFAULT 0,
 transports TEXT NOT NULL DEFAULT '[]',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 last_used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_portal_passkeys_user ON portal_passkeys(user_id);
CREATE TABLE IF NOT EXISTS portal_passkey_challenges (
 challenge_hash TEXT PRIMARY KEY,
 kind TEXT NOT NULL CHECK(kind IN ('login','invite','recovery','setup')),
 user_id UUID,
 nickname TEXT,
 role TEXT,
 invite_hash TEXT,
 reset_hash TEXT,
 selected_therapist_id UUID,
 expires_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portal_passkey_challenges_exp ON portal_passkey_challenges(expires_at);

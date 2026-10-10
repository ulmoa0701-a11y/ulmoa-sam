CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS portal_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('admin','therapist','student','parent')),
  pass_salt TEXT NOT NULL,
  pass_hash TEXT NOT NULL,
  therapist_id UUID REFERENCES portal_users(id),
  student_id UUID REFERENCES portal_users(id),
  failures INTEGER NOT NULL DEFAULT 0,
  lock_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portal_users_therapist ON portal_users(therapist_id);
CREATE INDEX IF NOT EXISTS idx_portal_users_student ON portal_users(student_id);
CREATE TABLE IF NOT EXISTS portal_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_expires ON portal_sessions(expires_at);
CREATE TABLE IF NOT EXISTS portal_invites (
  code_hash TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('therapist','student','parent')),
  therapist_id UUID REFERENCES portal_users(id),
  student_id UUID REFERENCES portal_users(id),
  created_by UUID NOT NULL REFERENCES portal_users(id),
  used_by UUID REFERENCES portal_users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS portal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES portal_users(id),
  therapist_id UUID NOT NULL REFERENCES portal_users(id),
  student_id UUID NOT NULL REFERENCES portal_users(id),
  kind TEXT NOT NULL CHECK (kind IN ('student','parent')),
  nonce TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  encrypted_payload TEXT NOT NULL,
  shared_at TIMESTAMPTZ,
  drive_file_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portal_records_author ON portal_records(author_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_records_teacher ON portal_records(therapist_id,shared_at);
CREATE TABLE IF NOT EXISTS portal_oauth (
  therapist_id UUID PRIMARY KEY REFERENCES portal_users(id),
  encrypted_refresh_token TEXT NOT NULL,
  nonce TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  folder_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS portal_oauth_states (
  state_hash TEXT PRIMARY KEY,
  therapist_id UUID NOT NULL REFERENCES portal_users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS portal_password_resets (
  code_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  issued_by UUID NOT NULL REFERENCES portal_users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

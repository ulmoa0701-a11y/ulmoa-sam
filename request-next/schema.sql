-- 이야기해봄 v2. 기존 공개 Google Apps Script/Jotform 자료를 변경하지 않습니다.
CREATE TABLE IF NOT EXISTS posts (
 id TEXT PRIMARY KEY,
 visibility TEXT NOT NULL CHECK (visibility IN ('public','list','hidden')),
 category TEXT NOT NULL,
 title TEXT NOT NULL DEFAULT '',
 body TEXT NOT NULL,
 link TEXT NOT NULL DEFAULT '',
 display_name TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT '',
 email TEXT NOT NULL DEFAULT '',
 phone TEXT NOT NULL DEFAULT '',
 consent_at TEXT,
 access_hash TEXT NOT NULL,
 created_at TEXT NOT NULL,
 reply TEXT NOT NULL DEFAULT '',
 replied_at TEXT,
 status TEXT NOT NULL DEFAULT '접수',
 public_title TEXT NOT NULL DEFAULT '비밀글입니다',
 metadata_approved INTEGER NOT NULL DEFAULT 0,
 attachment_approved INTEGER NOT NULL DEFAULT 0,
 attachment_key TEXT,
 attachment_name TEXT,
 attachment_type TEXT
);
CREATE INDEX IF NOT EXISTS posts_public_feed ON posts(visibility,created_at DESC);
CREATE TABLE IF NOT EXISTS rate_limits (
 key TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limit_lookup ON rate_limits(key,created_at);

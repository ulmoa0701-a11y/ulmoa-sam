-- No personal data, only the outcome of the most recent isolated runtime check.
CREATE TABLE IF NOT EXISTS habom_runtime_checks (
 id TEXT PRIMARY KEY,
 deploy_id TEXT NOT NULL,
 checked_at TEXT NOT NULL,
 result TEXT NOT NULL CHECK (result IN ('passed','failed')),
 stage TEXT NOT NULL,
 persisted_across_deploys INTEGER NOT NULL DEFAULT 0
);

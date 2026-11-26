-- 일단써봄 student opt-in Web Push reminders. Sandbox-only; never store notes or diagnosis.
-- The tables are server-only. Direct web client table access is forbidden.
CREATE TABLE IF NOT EXISTS public.ildan_student_reminder_preferences (
 student_id uuid PRIMARY KEY REFERENCES public.ildan_members(user_id) ON DELETE CASCADE,
 enabled boolean NOT NULL DEFAULT false,
 local_time text NOT NULL DEFAULT '19:00' CHECK (local_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
 timezone text NOT NULL DEFAULT 'Asia/Seoul' CHECK (timezone='Asia/Seoul'),
 last_attempt_day date,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ildan_student_reminder_subscriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 student_id uuid NOT NULL REFERENCES public.ildan_student_reminder_preferences(student_id) ON DELETE CASCADE,
 endpoint text NOT NULL,
 endpoint_hash text UNIQUE NOT NULL CHECK(endpoint_hash ~ '^[0-9a-f]{64}$'),
 p256dh text NOT NULL,
 auth_key text NOT NULL,
 device_label text NOT NULL DEFAULT '내 휴대폰',
 last_test_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ildan_student_reminder_history (
 student_id uuid NOT NULL REFERENCES public.ildan_student_reminder_preferences(student_id) ON DELETE CASCADE,
 day date NOT NULL,
 attempted_at timestamptz NOT NULL DEFAULT now(),
 provider_accepted_count smallint NOT NULL DEFAULT 0 CHECK(provider_accepted_count BETWEEN 0 AND 3),
 PRIMARY KEY (student_id,day)
);
CREATE INDEX IF NOT EXISTS ildan_student_reminder_due_idx
 ON public.ildan_student_reminder_preferences(local_time) WHERE enabled;
CREATE INDEX IF NOT EXISTS ildan_student_push_owner_idx
 ON public.ildan_student_reminder_subscriptions(student_id);
ALTER TABLE public.ildan_student_reminder_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ildan_student_reminder_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ildan_student_reminder_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ildan_student_reminder_preferences,
 public.ildan_student_reminder_subscriptions,
 public.ildan_student_reminder_history FROM PUBLIC,anon,authenticated;
COMMENT ON TABLE public.ildan_student_reminder_preferences IS
 'Opt-in daily generic practice reminders; no identity, text, mood, diagnosis or clinical note in notification payload.';
COMMENT ON TABLE public.ildan_student_reminder_subscriptions IS
 'Private Web Push endpoints and encryption keys for opted-in student devices; service-role only.';
COMMENT ON TABLE public.ildan_student_reminder_history IS
 'Generic daily reminder attempt log visible to owner only via authorized Edge; NOT device delivery proof. Retain max 30 days.';

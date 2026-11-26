-- Only the trusted Edge Function's service role may access these private tables.
-- Preserve RLS and existing revocations from anon/authenticated.
GRANT SELECT, INSERT, UPDATE ON TABLE public.ildan_student_reminder_preferences TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ildan_student_reminder_subscriptions, public.ildan_student_reminder_history TO service_role;

-- Supabase free-tier asynchronous delivery retries, no paid messaging provider.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

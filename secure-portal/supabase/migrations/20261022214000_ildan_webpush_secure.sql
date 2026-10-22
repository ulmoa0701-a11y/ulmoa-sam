-- Practice-only therapist web push; no record text, photos or student names in payloads.
-- The subscriptions are secret bearer endpoints: RLS and no direct Data API grants.
create table if not exists public.ildan_push_subscriptions(
 id uuid primary key default gen_random_uuid(),
 therapist_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null check(length(endpoint) between 35 and 2048),
 endpoint_hash text not null unique check(length(endpoint_hash)=64),
 p256dh text not null check(length(p256dh) between 32 and 140),
 auth_key text not null check(length(auth_key) between 15 and 100),
 device_label text not null default '휴대폰' check(length(device_label)<=28),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists ildan_push_owner on public.ildan_push_subscriptions(therapist_id);
alter table public.ildan_push_subscriptions enable row level security;
revoke all on public.ildan_push_subscriptions from public,anon,authenticated;

create table if not exists public.ildan_push_deliveries(
 id uuid primary key default gen_random_uuid(),
 notification_id uuid not null references public.ildan_share_notifications(id) on delete cascade,
 subscription_id uuid not null references public.ildan_push_subscriptions(id) on delete cascade,
 attempts integer not null default 0 check(attempts between 0 and 5),
 next_attempt_at timestamptz not null default now(),
 leased_until timestamptz,
 provider_accepted_at timestamptz,
 last_error text,
 created_at timestamptz not null default now(),
 unique(notification_id,subscription_id)
);
create index if not exists ildan_push_pending on public.ildan_push_deliveries(next_attempt_at)
 where provider_accepted_at is null and attempts < 5;
alter table public.ildan_push_deliveries enable row level security;
revoke all on public.ildan_push_deliveries from public,anon,authenticated;

-- Automatic transactional enqueue only when record-sharing notification exists.
create or replace function public.ildan_enqueue_webpush() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 insert into public.ildan_push_deliveries(notification_id,subscription_id)
 select new.id,s.id from public.ildan_push_subscriptions s
 where s.therapist_id=new.therapist_id
 on conflict(notification_id,subscription_id) do nothing;
 return new;
end $$;
revoke all on function public.ildan_enqueue_webpush() from public,anon,authenticated;
drop trigger if exists ildan_enqueue_webpush_notification on public.ildan_share_notifications;
create trigger ildan_enqueue_webpush_notification
 after insert on public.ildan_share_notifications for each row
 execute function public.ildan_enqueue_webpush();

-- Server-only accessor: Supabase Vault never returns VAPID private key to a browser.
create or replace function public.ildan_push_secret_vapid()
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select decrypted_secret::jsonb from vault.decrypted_secrets where name='ildan_push_vapid_jwk_v1' limit 1
$$;
create or replace function public.ildan_push_secret_dispatch()
returns text language sql stable security definer set search_path=public,pg_temp as $$
 select decrypted_secret from vault.decrypted_secrets where name='ildan_push_dispatch_token_v1' limit 1
$$;
revoke all on function public.ildan_push_secret_vapid() from public,anon,authenticated;
revoke all on function public.ildan_push_secret_dispatch() from public,anon,authenticated;
grant execute on function public.ildan_push_secret_vapid() to service_role;
grant execute on function public.ildan_push_secret_dispatch() to service_role;
-- All data access occurs through the existing JWT-authenticating Edge API.

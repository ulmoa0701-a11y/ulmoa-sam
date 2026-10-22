-- A staging-only singleton used by the authenticated server API.
-- Private signing material never goes to browsers, GitHub or tool output.
create table if not exists public.ildan_push_server_config(
  singleton boolean primary key default true check(singleton),
  vapid_jwk jsonb not null,
  dispatch_token text not null check(length(dispatch_token)>=40),
  created_at timestamptz not null default now()
);
alter table public.ildan_push_server_config enable row level security;
revoke all on public.ildan_push_server_config from public,anon,authenticated;

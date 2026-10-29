-- Isolated sandbox-only features: encrypted therapist feedback and optional daily tallies.
-- Neither table is exposed directly to student or anonymous Data API clients.
create table if not exists public.ildan_practice_feedback (
  record_id uuid primary key references public.ildan_practice_records(id) on delete cascade,
  therapist_id uuid not null references auth.users(id) on delete cascade,
  reaction text check (reaction is null or reaction in ('heart','star','clap','cheer','smile')),
  private_nonce text,
  private_ciphertext text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feedback_has_content check (reaction is not null or private_ciphertext is not null),
  constraint feedback_encryption_pair check ((private_nonce is null) = (private_ciphertext is null))
);
create index if not exists ildan_feedback_owner_idx on public.ildan_practice_feedback(therapist_id);
alter table public.ildan_practice_feedback enable row level security;
revoke all on public.ildan_practice_feedback from public,anon,authenticated;
grant select,insert,update,delete on public.ildan_practice_feedback to service_role;

create table if not exists public.ildan_daily_checkins (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  therapist_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('student','parent')),
  day date not null,
  waking_count smallint check(waking_count between 0 and 3),
  movement_count smallint check(movement_count between 0 and 3),
  worry_count smallint check(worry_count between 0 and 3),
  shared_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_check_has_answer check(waking_count is not null or movement_count is not null or worry_count is not null),
  constraint daily_check_author_day unique(author_id,day)
);
create index if not exists ildan_daily_student_idx on public.ildan_daily_checkins(therapist_id,student_id,day desc);
alter table public.ildan_daily_checkins enable row level security;
revoke all on public.ildan_daily_checkins from public,anon,authenticated;
grant select,insert,update,delete on public.ildan_daily_checkins to service_role;

-- Revocation clears feedback to prevent old therapist comments resurfacing after re-sharing.
create or replace function public.ildan_clear_feedback_on_unshare()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if old.shared_at is not null and new.shared_at is null then
  delete from public.ildan_practice_feedback where record_id=new.id;
 end if;
 return new;
end $$;
revoke all on function public.ildan_clear_feedback_on_unshare() from public,anon,authenticated;
grant execute on function public.ildan_clear_feedback_on_unshare() to service_role;
drop trigger if exists ildan_clear_feedback_on_unshare on public.ildan_practice_records;
create trigger ildan_clear_feedback_on_unshare
after update of shared_at on public.ildan_practice_records
for each row execute function public.ildan_clear_feedback_on_unshare();

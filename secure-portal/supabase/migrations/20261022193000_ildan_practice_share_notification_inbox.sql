-- Nonclinical / sandbox-only, server-authored notification metadata.
-- No note bodies, images, personal names, or device tokens in notification rows.
create table if not exists public.ildan_share_notifications (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.ildan_practice_records(id) on delete cascade,
  therapist_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('shared','updated')),
  event_key timestamptz not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (record_id, event_type, event_key)
);
create index if not exists ildan_share_notifications_owner_created
 on public.ildan_share_notifications(therapist_id, created_at desc);
create index if not exists ildan_share_notifications_unread
 on public.ildan_share_notifications(therapist_id, created_at desc)
 where read_at is null;
alter table public.ildan_share_notifications enable row level security;
revoke all on table public.ildan_share_notifications from public, anon, authenticated;
-- Runs with existing server-side service-role writes, never as a public RPC.
create or replace function public.ildan_capture_practice_share_event()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
declare kind text;
declare instant timestamptz;
begin
  if TG_OP = 'UPDATE' and old.shared_at is not null and new.shared_at is null then
    delete from public.ildan_share_notifications where record_id = new.id;
    return new;
  end if;
  if new.shared_at is null then return new; end if;
  if TG_OP = 'INSERT' or (TG_OP='UPDATE' and old.shared_at is null) then
    kind := 'shared';
    instant := new.shared_at;
  elsif TG_OP='UPDATE' and
        (old.shared_ciphertext is distinct from new.shared_ciphertext) then
    kind := 'updated';
    instant := new.updated_at;
  else
    return new;
  end if;
  insert into public.ildan_share_notifications(record_id, therapist_id, student_id, event_type, event_key)
  values(new.id,new.therapist_id,new.student_id,kind,instant)
  on conflict(record_id,event_type,event_key) do nothing;
  return new;
end $$;
drop trigger if exists ildan_practice_share_notify on public.ildan_practice_records;
create trigger ildan_practice_share_notify
 after insert or update of shared_at, shared_ciphertext, updated_at
 on public.ildan_practice_records for each row
 execute function public.ildan_capture_practice_share_event();
revoke all on function public.ildan_capture_practice_share_event() from public, anon, authenticated;

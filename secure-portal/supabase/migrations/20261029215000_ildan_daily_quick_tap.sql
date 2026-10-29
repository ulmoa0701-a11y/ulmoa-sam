-- Daily check-in version 2: concrete sleep and functional impact checks.
-- Keep all original daily check-ins and old count fields, preserving past interpretation.
alter table public.ildan_daily_checkins
 add column if not exists sleep_onset_level smallint check(sleep_onset_level between 0 and 3),
 add column if not exists repeat_level smallint check(repeat_level between 0 and 3),
 add column if not exists worry_impact_level smallint check(worry_impact_level between 0 and 3),
 add column if not exists tic_bother_level smallint check(tic_bother_level between 0 and 3);
-- 0/1/2 = answer severity; 3 means 'not sure', never treat it as a severity level.
alter table public.ildan_daily_checkins drop constraint if exists daily_check_has_answer;
alter table public.ildan_daily_checkins add constraint daily_check_has_answer
check (waking_count is not null or movement_count is not null or worry_count is not null
 or sleep_onset_level is not null or repeat_level is not null
 or worry_impact_level is not null or tic_bother_level is not null);
alter table public.ildan_daily_checkins drop constraint if exists ildan_daily_checkins_waking_count_check;
alter table public.ildan_daily_checkins add constraint ildan_daily_checkins_waking_count_check
check(waking_count between 0 and 4);
comment on column public.ildan_daily_checkins.waking_count is '0,1,2,3=3+ awakenings,4=not sure. Existing 0..3 retained.';
comment on column public.ildan_daily_checkins.sleep_onset_level is '0=no,1=a little,2=a lot,3=not sure. Not a clinical score.';
comment on column public.ildan_daily_checkins.repeat_level is '0=no,1=once/twice,2=many,3=not sure. Self report, not diagnosis.';
comment on column public.ildan_daily_checkins.worry_impact_level is '0=no daily disruption,1=some,2=a lot,3=not sure.';
comment on column public.ildan_daily_checkins.tic_bother_level is 'Optional: 0=no bother,1=some,2=a lot,3=not sure. Not tic frequency.';

-- Cron runs only after an opted-in therapist initializes the private key singleton.
-- The bearer is looked up server-side at runtime; never written to cron SQL or GitHub.
select cron.schedule(
 'ildan-webpush-delivery-minute',
 '* * * * *',
 $job$
 select net.http_post(
  url:='https://miohovwmhmtcvkurjamm.supabase.co/functions/v1/ildan-api/push-dispatch',
  headers:=jsonb_build_object(
   'Content-Type','application/json',
   'x-ildan-push-dispatch',(select dispatch_token from public.ildan_push_server_config where singleton=true)
  ),
  body:='{}'::jsonb,
  timeout_milliseconds:=10000
 )
 where exists(select 1 from public.ildan_push_server_config where singleton=true);
 $job$
);

-- Service-role permissions for non-public tables: ordinary JWT roles remain denied.
grant select,insert,update,delete on public.ildan_push_subscriptions to service_role;
grant select,insert,update,delete on public.ildan_push_deliveries to service_role;
grant select,insert,update,delete on public.ildan_push_server_config to service_role;
grant select,insert,update,delete on public.ildan_share_notifications to service_role;
grant execute on function public.ildan_enqueue_webpush() to service_role;
grant execute on function public.ildan_capture_practice_share_event() to service_role;

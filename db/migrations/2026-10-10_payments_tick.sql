-- The payments clock. Once a minute:
--   1. unpaid checkouts past their 15 minutes are expired (their booking is freed)
--   2. a paid community event counts as done one day after it starts (events
--      have no end time), which starts its complaint period
--   3. releases whose complaint period has passed are paid to the payee's balance
--   4. if payouts or refunds are queued, the payments edge function is asked to
--      send them. The URL and shared secret live in Vault:
--        select vault.create_secret('https://qievymkkprhbvxrsdukb.supabase.co/functions/v1/payments', 'payments_function_url');
--        select vault.create_secret('<random 32+ chars>', 'payments_cron_secret');
-- Guarded: on Supabase even a no-op CREATE EXTENSION re-runs an after-create hook that fails once pg_cron is installed.
do $$ begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    create extension pg_cron with schema pg_catalog;
  end if;
end $$;

create or replace function private.payments_tick() returns void
language plpgsql security definer set search_path = public, private, extensions as $$
declare r record; v_url text; v_secret text;
begin
  for r in select id from payments where status = 'awaiting_payment' and expires_at <= now()
           for update skip locked loop
    perform private.fail_payment(r.id, 'expired');
  end loop;

  for r in select p.id, p.subject_id from payments p join events e on e.id = p.subject_id
            where p.kind = 'event' and p.status = 'held' and e.starts_at < now() - interval '1 day'
              and not exists (select 1 from payment_releases rel where rel.payment_id = p.id) loop
    perform private.add_release(r.id, r.subject_id);
  end loop;

  perform private.release_due();

  if exists (select 1 from payee_payouts where status = 'queued') or exists (select 1 from refunds where status = 'queued') then
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'payments_function_url';
    select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'payments_cron_secret';
    if v_url is not null and v_secret is not null then
      perform net.http_post(
        url := v_url,
        body := jsonb_build_object('action', 'run-queue'),
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-payments-secret', v_secret));
    end if;
  end if;
end $$;
revoke all on function private.payments_tick() from public, anon, authenticated;
-- service_role may call it directly (the SQL test does; cron runs as the owner).
grant execute on function private.payments_tick() to service_role;

create or replace function public.payments_cron_secret_matches(p_secret text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(p_secret <> '' and p_secret = (select decrypted_secret from vault.decrypted_secrets
                                                  where name = 'payments_cron_secret'), false);
$$;
revoke execute on function public.payments_cron_secret_matches(text) from public, anon, authenticated;
grant execute on function public.payments_cron_secret_matches(text) to service_role;

select cron.unschedule('payments-tick') where exists (select 1 from cron.job where jobname = 'payments-tick');
select cron.schedule('payments-tick', '* * * * *', $$select private.payments_tick()$$);

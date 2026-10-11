-- Payments clock, review fix. One row that throws must not stall every later run.
-- Each step of private.payments_tick() now runs in its own sub-block: a failing
-- payment or release is skipped and logged as a warning, and the other steps
-- still run. The http call to the edge function stays last, in its own block, so
-- a pg_net error cannot undo rows already expired or released in the same run.
-- Grants on the function are unchanged (create or replace keeps them).
--
-- Also: the queued request headers carry the shared secret, so anon and
-- authenticated must not read net.http_request_queue. The schema is managed by
-- Supabase; if the revoke is refused it is skipped.
create or replace function private.payments_tick() returns void
language plpgsql security definer set search_path = public, private, extensions as $$
declare r record; v_url text; v_secret text;
begin
  for r in select id from payments where status = 'awaiting_payment' and expires_at <= now()
           for update skip locked loop
    begin
      perform private.fail_payment(r.id, 'expired');
    exception when others then
      raise warning 'payments_tick: expire failed on %: %', r.id, sqlerrm;
    end;
  end loop;

  for r in select p.id, p.subject_id from payments p join events e on e.id = p.subject_id
            where p.kind = 'event' and p.status = 'held' and e.starts_at < now() - interval '1 day'
              and not exists (select 1 from payment_releases rel where rel.payment_id = p.id) loop
    begin
      perform private.add_release(r.id, r.subject_id);
    exception when others then
      raise warning 'payments_tick: event release failed on %: %', r.id, sqlerrm;
    end;
  end loop;

  begin
    perform private.release_due();
  exception when others then
    raise warning 'payments_tick: release_due failed: %', sqlerrm;
  end;

  begin
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
  exception when others then
    raise warning 'payments_tick: queue call failed: %', sqlerrm;
  end;
end $$;

do $$ begin
  revoke select on net.http_request_queue from anon, authenticated;
exception when others then null;
end $$;

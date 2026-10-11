-- Payments follow-ups found while applying 2026-09-22_fulfilment_and_free_cancel.
--
-- 1. An unpaid session could be completed. With payments on, `pending` means
--    "not paid yet", and `confirm_session_fulfilled` accepted a pending booking
--    and completed it: a free session, counted toward the pack. It now refuses.
--
-- 2. A negotiated pack cancellation approved for less than what is still held
--    stranded the rest: the refund took its share and nothing ever released
--    the remainder to the coach. It is released now, through the same dispute
--    window as any other release.

-- ---------------------------------------------------------------------------
-- 1. Only a paid session can be confirmed
-- ---------------------------------------------------------------------------
-- Same function as 2026-09-22, plus the `pending` refusal after the cancelled
-- check.
create or replace function public.confirm_session_fulfilled(p_booking uuid)
returns table (id uuid, status text, coach_confirmed boolean, client_confirmed boolean)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_me  uuid := require_app_user();
  v_row bookings%rowtype;
begin
  select * into v_row from bookings b where b.id = p_booking;
  if v_row.id is null then
    raise exception 'That session no longer exists.';
  end if;
  if v_me <> v_row.client_id and v_me <> v_row.coach_id then
    raise exception 'That session is not yours.';
  end if;
  -- Nothing to confirm about a session that was called off.
  if v_row.status not in ('pending', 'confirmed', 'completed') then
    raise exception 'That session was cancelled.';
  end if;
  -- Pending is an unpaid hold. Completing it would hand over a free session.
  if v_row.status = 'pending' then
    raise exception 'This session has not been paid for yet.';
  end if;
  -- Asking before it has happened invites confirming a session that then does
  -- not, and the client cannot take a confirmation back.
  if v_row.scheduled_for > now() then
    raise exception 'That session has not started yet.';
  end if;

  if v_me = v_row.coach_id then
    update bookings b set coach_confirmed_at = coalesce(b.coach_confirmed_at, now())
     where b.id = p_booking returning * into v_row;
  else
    update bookings b set client_confirmed_at = coalesce(b.client_confirmed_at, now())
     where b.id = p_booking returning * into v_row;
  end if;

  -- The second stamp is what completes it. One stamp leaves the session live,
  -- which is what keeps it in the list still asking for the other answer.
  if v_row.coach_confirmed_at is not null
     and v_row.client_confirmed_at is not null
     and v_row.status <> 'completed' then
    -- The booking guard exempts the payment system's own writes, and this
    -- function is the completion signal the payment system reads.
    perform set_config('app.payments_internal', 'on', true);
    update bookings b set status = 'completed'
     where b.id = p_booking returning * into v_row;
    perform set_config('app.payments_internal', 'off', true);
  end if;

  return query select v_row.id, v_row.status::text,
                      v_row.coach_confirmed_at is not null,
                      v_row.client_confirmed_at is not null;
end $function$;

revoke execute on function public.confirm_session_fulfilled(uuid) from public, anon;
grant execute on function public.confirm_session_fulfilled(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Whatever a pack cancellation does not refund goes to the coach
-- ---------------------------------------------------------------------------
-- Same body as before, with two changes:
--   * after the refund loop, every held payment of the pack still holding money
--     gets a release for the remainder, subject = the cancellation row;
--   * an approval at 0 no longer returns early. "Even if it is nothing" is a
--     valid answer from the coach, and it strands the whole pack otherwise.
--
-- The release is written here rather than through private.add_release: that
-- function releases one session's share (price / sessions) until the last, and
-- a cancelled pack has no more sessions to wait for. The row is otherwise what
-- add_release writes.
create or replace function private.package_cancellation_money()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'private'
as $function$
declare v_left int; v_take int; v_rest int; v_hours int; r record;
begin
  if new.status <> 'approved' then return null; end if;
  if tg_op = 'UPDATE' and old.status = 'approved' then return null; end if;
  v_left := coalesce(new.refund_cents, 0);
  for r in
    select p.id from payments p
     where p.kind = 'package' and p.status = 'held'
       and p.id in (select b.payment_id from bookings b
                     where b.client_id = new.client_id and b.package_id = new.package_id
                       and b.payment_id is not null)
     order by p.created_at
  loop
    exit when v_left <= 0;
    v_take := least(v_left, private.payment_unallocated(r.id));
    if v_take > 0 then
      perform private.refund_payment(r.id, v_take, 'package cancellation');
      v_left := v_left - v_take;
    end if;
  end loop;

  select dispute_window_hours into v_hours from payment_settings;
  for r in
    select p.id, p.rate_bps from payments p
     where p.kind = 'package' and p.status = 'held'
       and p.id in (select b.payment_id from bookings b
                     where b.client_id = new.client_id and b.package_id = new.package_id
                       and b.payment_id is not null)
  loop
    v_rest := private.payment_unallocated(r.id);
    if v_rest > 0 then
      insert into payment_releases (payment_id, subject_id, amount_cents, commission_cents, release_at)
      values (r.id, new.id, v_rest, round(v_rest * r.rate_bps / 10000.0)::int,
              now() + make_interval(hours => v_hours))
      on conflict (payment_id, subject_id) do nothing;
    end if;
  end loop;
  return null;
end $function$;

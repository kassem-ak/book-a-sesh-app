-- Review fixes to 2026-10-11_payments_followups.
--
-- 1. Free cancel of an unused pack refunded the pack's current listing price,
--    not what the client paid. With the remainder of a cancelled pack now going
--    to the coach, a price cut after purchase would have sent the difference to
--    a coach who delivered nothing. It now refunds what is still held on the
--    pack's payments. The listing price is only used when the pack has no
--    payment at all (bought while payments were off).
--
-- 2. The remainder release read `payment_unallocated` without a lock on the
--    payment, so a concurrent release could allocate the same cents. Both loops
--    in `package_cancellation_money` now lock the payment rows first.
--
-- 3. Confirming a `pending` session with payments off said it was unpaid.
--    Pending then means the coach has not answered; the message says so.
--
-- 4. `confirm_session_fulfilled` put `app.payments_internal` back to 'off' even
--    if its caller had set it on. It restores the previous value.

-- ---------------------------------------------------------------------------
-- 3 and 4. confirm_session_fulfilled
-- ---------------------------------------------------------------------------
create or replace function public.confirm_session_fulfilled(p_booking uuid)
returns table (id uuid, status text, coach_confirmed boolean, client_confirmed boolean)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_me   uuid := require_app_user();
  v_row  bookings%rowtype;
  v_prev text;
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
  -- Pending is not yet a session: with payments on it is an unpaid hold,
  -- with payments off it is a booking the coach has not answered. Completing
  -- it would hand over a session nobody agreed to or paid for.
  if v_row.status = 'pending' then
    raise exception '%', case
      when private.payments_enabled('session') or private.payments_enabled('package')
        then 'This session has not been paid for yet.'
      else 'This session has not been confirmed by the coach yet.' end;
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
    v_prev := current_setting('app.payments_internal', true);
    perform set_config('app.payments_internal', 'on', true);
    update bookings b set status = 'completed'
     where b.id = p_booking returning * into v_row;
    perform set_config('app.payments_internal', coalesce(v_prev, 'off'), true);
  end if;

  return query select v_row.id, v_row.status::text,
                      v_row.coach_confirmed_at is not null,
                      v_row.client_confirmed_at is not null;
end $function$;

revoke execute on function public.confirm_session_fulfilled(uuid) from public, anon;
grant execute on function public.confirm_session_fulfilled(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. package_cancellation_money: lock the payments before reading them
-- ---------------------------------------------------------------------------
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
       for update of p
  loop
    exit when v_left <= 0;
    v_take := least(v_left, private.payment_unallocated(r.id));
    if v_take > 0 then
      perform private.refund_payment(r.id, v_take, 'package cancellation');
      v_left := v_left - v_take;
    end if;
  end loop;

  select dispute_window_hours into v_hours from payment_settings;
  -- Locked before `payment_unallocated` is read: a release being added at the
  -- same moment would otherwise allocate the same cents.
  for r in
    select p.id, p.rate_bps from payments p
     where p.kind = 'package' and p.status = 'held'
       and p.id in (select b.payment_id from bookings b
                     where b.client_id = new.client_id and b.package_id = new.package_id
                       and b.payment_id is not null)
       for update of p
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

-- ---------------------------------------------------------------------------
-- 1. cancel_unused_package refunds what was paid
-- ---------------------------------------------------------------------------
create or replace function public.cancel_unused_package(p_coach uuid, p_package uuid)
returns table (id uuid, refund_cents int)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_me      uuid := require_app_user();
  v_taken   int;
  v_price   int;
  v_paid_n  int;
  v_request uuid;
begin
  -- Only the client cancels their own purchase this way; a coach handing money
  -- back unprompted is a different act and has no button.
  if not exists (
    select 1 from bookings b
     where b.client_id = v_me and b.coach_id = p_coach and b.package_id = p_package
  ) then
    raise exception 'You have no sessions on that package.';
  end if;

  if exists (
    select 1 from package_cancellations r
     where r.client_id = v_me and r.coach_id = p_coach and r.package_id = p_package
       and r.status in ('requested', 'offered', 'approved')
  ) then
    raise exception 'There is already a cancellation open on that package.';
  end if;

  select count(*)::int into v_taken
    from bookings b
   where b.client_id = v_me and b.coach_id = p_coach
     and b.package_id = p_package and b.status = 'completed';

  -- The caller is supposed to have checked, but the rule lives here: the
  -- client's screen must not be the thing deciding what a refund is worth.
  if v_taken > 0 then
    raise exception 'This package has a session you both confirmed. Ask to cancel instead, and settle the amount together.';
  end if;

  -- What comes back is what the client paid and is still held, not what the
  -- coach lists the pack for today. Locked so nothing is allocated between
  -- this read and the refund the cancellation row triggers.
  perform 1 from payments p join bookings f on f.id = p.subject_id
   where p.kind = 'package' and p.payer_id = v_me and f.package_id = p_package
     for update of p;
  select count(*)::int,
         coalesce(sum(case when p.status = 'held' then private.payment_unallocated(p.id) else 0 end), 0)::int
    into v_paid_n, v_price
    from payments p join bookings f on f.id = p.subject_id
   where p.kind = 'package' and p.payer_id = v_me and f.package_id = p_package;

  -- A pack with no payment at all was bought while payments were off: the
  -- listing price is the only figure there is.
  if v_paid_n = 0 then
    select p.price_cents into v_price from packages p where p.id = p_package;
  end if;

  -- Booked slots on an abandoned pack are given back, so the coach's calendar
  -- is not held by sessions nobody is going to attend.
  update bookings b set status = 'cancelled'
   where b.client_id = v_me and b.coach_id = p_coach
     and b.package_id = p_package and b.status in ('pending', 'confirmed');

  insert into package_cancellations
    (client_id, coach_id, package_id, reason, status, refund_cents, decided_by, decided_at)
  values
    (v_me, p_coach, p_package, 'No sessions taken', 'approved',
     coalesce(v_price, 0), v_me, now())
  returning package_cancellations.id into v_request;

  return query
    select v_request, coalesce(v_price, 0);
end $function$;

revoke execute on function public.cancel_unused_package(uuid, uuid) from public, anon;
grant execute on function public.cancel_unused_package(uuid, uuid) to authenticated;

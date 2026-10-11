-- Bind each booking to the payment that pays for it.
--
-- payments_subjects found a pack's payment by "the newest package payment of this
-- member for this pack", and confirmed or cancelled "every pending booking of
-- this member for this pack". Both guess. A second purchase, a re-booked
-- session or a free sibling of an unpaid pack all hit the wrong payment.
-- bookings.payment_id says which payment a booking belongs to, and every money
-- path reads it instead of guessing.
--
-- Also here:
--   * A pack that already has a live payment is not charged a second time when
--     its only session is cancelled and booked again (book_package_sessions
--     computed "first booking" from live sessions alone).
--   * The AFTER INSERT payment openers check that the kind is switched on, so a
--     raw insert that defaults to 'pending' does not open a payment while
--     payments are off.
--   * A pack cancellation refunds across every held payment its bookings point
--     to, and cancelling a free sibling session of an unpaid pack no longer
--     cancels the whole purchase.
--
-- No grant or revoke lines: create or replace keeps every function's existing
-- privileges, and the column rides on the table's existing select grants.

alter table public.bookings add column if not exists payment_id uuid references public.payments(id);
create index if not exists bookings_payment_idx on public.bookings (payment_id) where payment_id is not null;

-- Payments opened before this column existed: bind the booking each one is for.
update public.bookings b set payment_id = p.id
  from public.payments p
 where b.payment_id is null and p.subject_id = b.id and p.kind in ('session','package');

create or replace function private.booking_payment(p_booking bookings) returns uuid
language sql stable security definer set search_path = public as $$
  select p_booking.payment_id;
$$;

-- ---- bookings ---------------------------------------------------------------------
create or replace function private.bookings_hold_unpaid() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare v_pay uuid;
begin
  if new.package_id is null then
    if private.payments_enabled('session') and new.total_cents > 0 then new.status := 'pending'; end if;
  elsif private.payments_enabled('package') then
    if new.total_cents > 0 then
      -- The first booking of a pack carries its price; its payment is opened after insert.
      new.status := 'pending';
    else
      -- A later session of the same purchase waits for that payment while it is
      -- open, or joins it once it is held and still has money to release.
      select p.id into v_pay from payments p join bookings first on first.id = p.subject_id
       where p.kind = 'package' and p.payer_id = new.client_id and first.package_id = new.package_id
         and p.status in ('awaiting_payment','charging')
       order by p.created_at desc limit 1;
      if v_pay is not null then
        new.status := 'pending';
        new.payment_id := v_pay;
      else
        select p.id into v_pay from payments p join bookings first on first.id = p.subject_id
         where p.kind = 'package' and p.payer_id = new.client_id and first.package_id = new.package_id
           and p.status = 'held' and private.payment_unallocated(p.id) > 0
         order by p.created_at desc limit 1;
        if v_pay is not null then new.payment_id := v_pay; end if;
      end if;
    end if;
  end if;
  return new;
end $$;

create or replace function private.bookings_open_payment() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare v_kind text := case when new.package_id is null then 'session' else 'package' end; v_id uuid;
begin
  if new.status = 'pending' and new.total_cents > 0 and private.payments_enabled(v_kind) then
    v_id := private.open_payment(v_kind, new.id, new.client_id, new.coach_id, new.total_cents,
                                 (select sessions from packages where id = new.package_id));
    -- Status is unchanged, so the status trigger does not fire.
    update bookings set payment_id = v_id where id = new.id;
  end if;
  return null;
end $$;

create or replace function private.bookings_status_money() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare v_pay uuid; v_status text; v_price int; v_subject uuid;
begin
  v_pay := private.booking_payment(new);
  if v_pay is null then return null; end if;
  select status, price_cents, subject_id into v_status, v_price, v_subject from payments where id = v_pay;

  if new.status in ('completed','no_show') then
    perform private.add_release(v_pay, new.id);
  elsif new.status = 'cancelled' then
    if v_status = 'awaiting_payment' then
      -- Only the booking the payment was opened for ends it. A free sibling of an
      -- unpaid pack just stays cancelled; the purchase goes on.
      if new.id = v_subject then perform private.fail_payment(v_pay, 'cancelled'); end if;
    elsif v_status = 'held' and new.package_id is null then
      perform private.refund_payment(v_pay, v_price, 'cancelled before the session');
    end if;
    -- A cancelled session of a paid pack moves no money on its own: unused
    -- sessions are refunded through the package cancellation.
  end if;
  return null;
end $$;

-- ---- paying and failing a pack act on the bookings bound to it ----------------------
create or replace function private.confirm_subject(p_payment payments) returns boolean
language plpgsql security definer set search_path = public, private as $$
declare v_ok boolean := false; v_n int;
begin
  perform set_config('app.payments_internal', 'on', true);
  if p_payment.kind = 'session' then
    update bookings set status = 'confirmed' where id = p_payment.subject_id and status = 'pending';
    v_ok := found;
  elsif p_payment.kind = 'package' then
    update bookings set status = 'confirmed' where payment_id = p_payment.id and status = 'pending';
    get diagnostics v_n = row_count;
    v_ok := v_n > 0;
  elsif p_payment.kind = 'court' then
    update court_reservations set status = 'confirmed' where id = p_payment.subject_id and status = 'pending';
    v_ok := found;
  elsif p_payment.kind = 'tournament' then
    update venue_event_entries set status = 'confirmed' where id = p_payment.subject_id and status = 'pending';
    v_ok := found;
  elsif p_payment.kind = 'event' then
    if exists (select 1 from event_attendees
                where event_id = p_payment.subject_id and user_id = p_payment.payer_id and payment = 'pending') then
      perform public.mark_event_payment_settled(p_payment.subject_id, p_payment.payer_id,
                                                p_payment.provider_ref, p_payment.price_cents);
      v_ok := true;
    end if;
  end if;
  perform set_config('app.payments_internal', 'off', true);
  return v_ok;
end $$;

create or replace function private.cancel_subject(p_payment payments) returns void
language plpgsql security definer set search_path = public, private as $$
declare v_pkg uuid; v_coach uuid;
begin
  perform set_config('app.payments_internal', 'on', true);
  if p_payment.kind = 'session' then
    update bookings set status = 'cancelled' where id = p_payment.subject_id and status = 'pending';
  elsif p_payment.kind = 'package' then
    select package_id, coach_id into v_pkg, v_coach from bookings where id = p_payment.subject_id;
    update bookings set status = 'cancelled' where payment_id = p_payment.id and status = 'pending';
    -- The pack was never bought: drop its balance unless a session of it is still live.
    delete from client_package_balances
     where client_id = p_payment.payer_id and coach_id = v_coach and package_id = v_pkg
       and not exists (select 1 from bookings where client_id = p_payment.payer_id and package_id = v_pkg
                        and status in ('confirmed','completed','no_show'));
  elsif p_payment.kind = 'court' then
    update court_reservations set status = 'cancelled' where id = p_payment.subject_id and status = 'pending';
  elsif p_payment.kind = 'tournament' then
    update venue_event_entries set status = 'cancelled' where id = p_payment.subject_id and status = 'pending';
  elsif p_payment.kind = 'event' then
    delete from event_attendees
     where event_id = p_payment.subject_id and user_id = p_payment.payer_id and payment = 'pending';
  end if;
  perform set_config('app.payments_internal', 'off', true);
end $$;

-- ---- package refunds -------------------------------------------------------------------
create or replace function private.package_cancellation_money() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare v_left int; v_take int; r record;
begin
  if new.status <> 'approved' or coalesce(new.refund_cents, 0) <= 0 then return null; end if;
  if tg_op = 'UPDATE' and old.status = 'approved' then return null; end if;
  v_left := new.refund_cents;
  -- Every held payment this pack's bookings point to, oldest first, each giving
  -- only what it still holds until the refund is used up.
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
  return null;
end $$;

-- ---- courts and tournaments: only open a payment when the kind is on ---------------------
create or replace function private.court_open_payment() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  if new.status = 'pending' and new.total_cents > 0 and private.payments_enabled('court') then
    perform private.open_payment('court', new.id, new.client_id,
      (select v.owner_id from courts c join venues v on v.id = c.venue_id where c.id = new.court_id),
      new.total_cents);
  end if;
  return null;
end $$;

create or replace function private.entry_open_payment() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  if new.status = 'pending' and new.total_cents > 0 and private.payments_enabled('tournament') then
    perform private.open_payment('tournament', new.id, new.client_id,
      (select v.owner_id from venue_events e join venues v on v.id = e.venue_id where e.id = new.venue_event_id),
      new.total_cents);
  end if;
  return null;
end $$;

-- ---- no second charge when a pack's only session is cancelled and booked again ------------
-- The live body of private.book_package_sessions, with one block added after
-- v_first is computed. Its privileges are kept by create or replace.
create or replace function private.book_package_sessions(p_coach uuid, p_package_id uuid, p_slots jsonb)
 returns integer
 language plpgsql
 security definer
 set search_path to 'private', 'public', 'extensions'
as $function$
declare
  v_user uuid := require_app_user();
  v_sessions int;
  v_price int;
  v_pct numeric;
  v_wanted int;
  v_used int;
  v_has_schedule boolean;
  v_slot jsonb;
  v_at timestamptz;
  v_label text;
  v_weekday int;
  v_first boolean := true;
  v_charge int;
begin
  if p_package_id is null then
    raise exception 'Pick a package first.';
  end if;
  v_wanted := coalesce(jsonb_array_length(p_slots), 0);
  if v_wanted = 0 then
    raise exception 'Pick at least one session.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_user::text || ':' || p_package_id::text, 0));

  if package_is_cancelled(v_user, p_coach, p_package_id) then
    raise exception 'That package was cancelled. Buy it again to book more sessions.';
  end if;

  select sessions, price_cents into v_sessions, v_price
    from packages
   where id = p_package_id and coach_id = p_coach and active;
  if v_price is null then
    raise exception 'That package is not available from this coach.';
  end if;

  select count(*) into v_used
    from bookings
   where client_id = v_user and coach_id = p_coach and package_id = p_package_id
     and status in ('pending', 'confirmed', 'completed');

  if v_used + v_wanted > v_sessions then
    raise exception 'That package has % of % sessions left.', v_sessions - v_used, v_sessions;
  end if;

  select exists (select 1 from coach_availability where coach_id = p_coach)
    into v_has_schedule;
  select pct into v_pct from platform_margins where key = 'session';

  v_first := v_used = 0;

  -- The pack is already paid for, or being paid for, even though none of its
  -- sessions is live right now: do not charge it again.
  if v_first and private.payments_enabled('package') and exists (
       select 1 from payments p join bookings f on f.id = p.subject_id
        where p.kind = 'package' and p.payer_id = v_user and f.package_id = p_package_id
          and (p.status in ('awaiting_payment','charging')
               or (p.status = 'held' and private.payment_unallocated(p.id) > 0))) then
    v_first := false;
  end if;

  for v_slot in select * from jsonb_array_elements(p_slots)
  loop
    v_at := (v_slot ->> 'at')::timestamptz;
    v_label := v_slot ->> 'label';
    if v_at is null then
      raise exception 'One of those sessions has no time.';
    end if;
    if v_at < now() - interval '1 day' then
      raise exception 'One of those times has already passed.';
    end if;
    if exists (select 1 from coach_blackouts b
                where b.coach_id = p_coach and b.on_date = v_at::date) then
      raise exception 'That coach is not available on %.', to_char(v_at, 'FMDay DD Mon');
    end if;
    if v_has_schedule and v_label is not null then
      v_weekday := extract(isodow from v_at)::int - 1;
      if not exists (
        select 1 from coach_availability
         where coach_id = p_coach and weekday = v_weekday and slot = v_label
      ) then
        raise exception 'That coach is not available at % on %.',
          v_label, to_char(v_at, 'FMDay DD Mon');
      end if;
    end if;

    v_charge := case when v_first then v_price else 0 end;
    v_first := false;

    insert into bookings (client_id, coach_id, package_id, scheduled_for, slot_label,
                          status, total_cents, commission_cents)
    values (v_user, p_coach, p_package_id, v_at, v_label,
            'confirmed', v_charge, round(v_charge * coalesce(v_pct, 12) / 100.0));
  end loop;

  insert into client_package_balances (client_id, coach_id, package_id, label, used, total)
  values (v_user, p_coach, p_package_id, v_sessions || '-session pack', v_used + v_wanted, v_sessions)
  on conflict (client_id, coach_id, package_id) where package_id is not null
  do update set used = least(excluded.used, client_package_balances.total),
                total = excluded.total;

  return v_wanted;
end $function$;

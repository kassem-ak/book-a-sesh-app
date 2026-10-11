-- Payments on the things people pay for.
--
-- The existing booking RPCs are untouched: they still insert 'confirmed'. With
-- a kind switched on in payment_settings.enabled_kinds, a BEFORE INSERT
-- trigger holds the row at 'pending' and an AFTER INSERT trigger opens its
-- payment. Paying confirms it (private.confirm_subject); not paying in time
-- cancels it (private.fail_payment). Completion adds a release; cancellation
-- refunds a paid subject or cancels an unpaid one. Switched off, nothing here
-- changes anything.

-- ---- bookings (single sessions and package sessions) -------------------------
create or replace function private.booking_payment(p_booking bookings) returns uuid
language sql stable security definer set search_path = public as $$
  select p.id from payments p
   where p_booking.package_id is null and p.kind = 'session' and p.subject_id = p_booking.id
  union all
  select * from (
    select p.id from payments p join bookings first on first.id = p.subject_id
     where p_booking.package_id is not null and p.kind = 'package'
       and p.payer_id = p_booking.client_id and first.package_id = p_booking.package_id
     order by p.created_at desc limit 1) pack
  limit 1;
$$;

create or replace function private.bookings_hold_unpaid() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  if new.package_id is null then
    if private.payments_enabled('session') and new.total_cents > 0 then new.status := 'pending'; end if;
  elsif private.payments_enabled('package') then
    -- The first booking of a pack carries its price; the rest of the same
    -- purchase carry 0 and wait for that payment too.
    if new.total_cents > 0 or exists (
      select 1 from payments p join bookings first on first.id = p.subject_id
       where p.kind = 'package' and p.payer_id = new.client_id
         and first.package_id = new.package_id and p.status in ('awaiting_payment','charging'))
    then new.status := 'pending'; end if;
  end if;
  return new;
end $$;

create or replace function private.bookings_open_payment() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  if new.status = 'pending' and new.total_cents > 0 then
    perform private.open_payment(
      case when new.package_id is null then 'session' else 'package' end,
      new.id, new.client_id, new.coach_id, new.total_cents,
      (select sessions from packages where id = new.package_id));
  end if;
  return null;
end $$;

create or replace function private.bookings_status_money() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare v_pay uuid; v_status text; v_price int;
begin
  v_pay := private.booking_payment(new);
  if v_pay is null then return null; end if;
  select status, price_cents into v_status, v_price from payments where id = v_pay;

  if new.status in ('completed','no_show') then
    perform private.add_release(v_pay, new.id);
  elsif new.status = 'cancelled' then
    if v_status = 'awaiting_payment' then
      perform private.fail_payment(v_pay, 'cancelled');
    elsif v_status = 'held' and new.package_id is null then
      perform private.refund_payment(v_pay, v_price, 'cancelled before the session');
    end if;
    -- A cancelled session of a paid pack moves no money on its own: unused
    -- sessions are refunded through the package cancellation.
  end if;
  return null;
end $$;

drop trigger if exists trg_bookings_hold_unpaid on public.bookings;
create trigger trg_bookings_hold_unpaid before insert on public.bookings
  for each row execute function private.bookings_hold_unpaid();
drop trigger if exists trg_bookings_open_payment on public.bookings;
create trigger trg_bookings_open_payment after insert on public.bookings
  for each row execute function private.bookings_open_payment();
drop trigger if exists trg_bookings_status_money on public.bookings;
create trigger trg_bookings_status_money after update of status on public.bookings
  for each row when (old.status is distinct from new.status)
  execute function private.bookings_status_money();

-- ---- package refunds (negotiated or free cancel) -----------------------------
create or replace function private.package_cancellation_money() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare v_pay uuid;
begin
  if new.status <> 'approved' or coalesce(new.refund_cents, 0) <= 0 then return null; end if;
  if tg_op = 'UPDATE' and old.status = 'approved' then return null; end if;
  select p.id into v_pay from payments p join bookings first on first.id = p.subject_id
   where p.kind = 'package' and p.payer_id = new.client_id and first.package_id = new.package_id
     and p.status = 'held'
   order by p.created_at desc limit 1;
  if v_pay is not null then
    perform private.refund_payment(v_pay, new.refund_cents, 'package cancellation');
  end if;
  return null;
end $$;

drop trigger if exists trg_package_cancellation_money on public.package_cancellations;
create trigger trg_package_cancellation_money after insert or update of status on public.package_cancellations
  for each row execute function private.package_cancellation_money();

-- ---- courts and tournaments ----------------------------------------------------
create or replace function private.venue_rows_hold_unpaid() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  if private.payments_enabled(tg_argv[0]) and new.total_cents > 0 then new.status := 'pending'; end if;
  return new;
end $$;

create or replace function private.court_open_payment() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  if new.status = 'pending' and new.total_cents > 0 then
    perform private.open_payment('court', new.id, new.client_id,
      (select v.owner_id from courts c join venues v on v.id = c.venue_id where c.id = new.court_id),
      new.total_cents);
  end if;
  return null;
end $$;

create or replace function private.entry_open_payment() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  if new.status = 'pending' and new.total_cents > 0 then
    perform private.open_payment('tournament', new.id, new.client_id,
      (select v.owner_id from venue_events e join venues v on v.id = e.venue_id where e.id = new.venue_event_id),
      new.total_cents);
  end if;
  return null;
end $$;

create or replace function private.venue_rows_status_money() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare v_pay uuid; v_status text; v_price int;
begin
  select id, status, price_cents into v_pay, v_status, v_price from payments
   where kind = tg_argv[0] and subject_id = new.id order by created_at desc limit 1;
  if v_pay is null then return null; end if;
  if new.status in ('completed','no_show') then
    perform private.add_release(v_pay, new.id);
  elsif new.status = 'cancelled' then
    if v_status = 'awaiting_payment' then perform private.fail_payment(v_pay, 'cancelled');
    elsif v_status = 'held' then perform private.refund_payment(v_pay, v_price, 'cancelled before the booking');
    end if;
  end if;
  return null;
end $$;

drop trigger if exists trg_court_hold_unpaid on public.court_reservations;
create trigger trg_court_hold_unpaid before insert on public.court_reservations
  for each row execute function private.venue_rows_hold_unpaid('court');
drop trigger if exists trg_court_open_payment on public.court_reservations;
create trigger trg_court_open_payment after insert on public.court_reservations
  for each row execute function private.court_open_payment();
drop trigger if exists trg_court_status_money on public.court_reservations;
create trigger trg_court_status_money after update of status on public.court_reservations
  for each row when (old.status is distinct from new.status)
  execute function private.venue_rows_status_money('court');

drop trigger if exists trg_entry_hold_unpaid on public.venue_event_entries;
create trigger trg_entry_hold_unpaid before insert on public.venue_event_entries
  for each row execute function private.venue_rows_hold_unpaid('tournament');
drop trigger if exists trg_entry_open_payment on public.venue_event_entries;
create trigger trg_entry_open_payment after insert on public.venue_event_entries
  for each row execute function private.entry_open_payment();
drop trigger if exists trg_entry_status_money on public.venue_event_entries;
create trigger trg_entry_status_money after update of status on public.venue_event_entries
  for each row when (old.status is distinct from new.status)
  execute function private.venue_rows_status_money('tournament');

-- ---- paid community events -------------------------------------------------------
-- rsvp_to_event already writes payment = 'pending' with the fee. The organiser
-- is the community's owner.
create or replace function private.event_attendance_money() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare v_pay uuid;
begin
  if tg_op = 'DELETE' then
    select id into v_pay from payments where kind = 'event' and subject_id = old.event_id
       and payer_id = old.user_id and status = 'awaiting_payment';
    if v_pay is not null then perform private.fail_payment(v_pay, 'cancelled'); end if;
    return null;
  end if;

  if new.payment = 'pending' and coalesce(new.fee_cents, 0) > 0 and private.payments_enabled('event')
     and (tg_op = 'INSERT' or old.payment is distinct from 'pending') then
    perform private.open_payment('event', new.event_id, new.user_id,
      (select cm.user_id from events e join community_members cm
          on cm.community_id = e.community_id and cm.role = 'owner'
        where e.id = new.event_id limit 1),
      new.fee_cents);
  elsif tg_op = 'UPDATE' and new.payment = 'refunded' and old.payment = 'paid' then
    select id into v_pay from payments where kind = 'event' and subject_id = new.event_id
       and payer_id = new.user_id and status = 'held';
    if v_pay is not null then
      perform private.refund_payment(v_pay, new.fee_cents, 'left the event');
    end if;
  end if;
  return null;
end $$;

drop trigger if exists trg_event_attendance_money on public.event_attendees;
create trigger trg_event_attendance_money after insert or update of payment or delete on public.event_attendees
  for each row execute function private.event_attendance_money();

-- Trigger functions are invoked by the triggers themselves, never called by a
-- role, so they need no grants. Never `revoke ... on all functions in schema
-- private`: the schema also holds the older RPC bodies that members call
-- through non-definer public wrappers, and a blanket revoke takes the app down.

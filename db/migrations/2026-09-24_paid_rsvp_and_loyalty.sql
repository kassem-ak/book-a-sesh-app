-- Paying for an event when you RSVP, and earning loyalty points for it.
--
-- READ THIS BEFORE APPLYING.
--
-- There is no payment processor in this app. `price_cents` appears on coach
-- packages and shop orders, but nothing has ever taken a card: no Stripe keys,
-- no webhook, no payouts table with a provider in it. This migration builds
-- the shape a paid RSVP needs and stops exactly where the money would change
-- hands.
--
-- The consequence, stated plainly: after this migration a paid event's RSVP
-- sits at 'pending' forever, because nothing exists to move it to 'paid'. That
-- is deliberate. The alternative -- treating an unpaid RSVP as attendance --
-- would quietly make every paid event free, and a community would find out at
-- the door. A free event (fee_cents = 0) is unaffected and confirms instantly.
--
-- To finish it you need: a Stripe account, its secret key stored as a Supabase
-- secret, an edge function that creates a PaymentIntent for
-- (event_id, user_id, fee_cents), and a webhook that calls
-- mark_event_payment_settled() below. The last of those is already written.

-- ============================================================================
-- 1. Loyalty points actually move
-- ============================================================================
--
-- loyalty_accounts and loyalty_ledger have existed since the first schema and
-- nothing has ever written to them -- the policies are select-only and the
-- balances come from the seed. This is the first writer.

create or replace function award_loyalty(p_user uuid, p_delta int, p_reason text)
returns int language plpgsql security definer set search_path = public as $$
declare v_balance int;
begin
  if p_delta = 0 then
    select balance into v_balance from loyalty_accounts where user_id = p_user;
    return coalesce(v_balance, 0);
  end if;

  insert into loyalty_accounts (user_id, balance) values (p_user, 0)
  on conflict (user_id) do nothing;

  -- The ledger is the record and the balance is a cache of it. Both, in one
  -- statement each, so a crash between them is the worst case rather than a
  -- balance that drifted from its own history.
  insert into loyalty_ledger (user_id, delta, reason) values (p_user, p_delta, p_reason);

  update loyalty_accounts
     set balance = greatest(0, balance + p_delta)
   where user_id = p_user
  returning balance into v_balance;

  return coalesce(v_balance, 0);
end $$;

comment on function award_loyalty(uuid, int, text) is
  'The only writer to loyalty_ledger and loyalty_accounts. SECURITY DEFINER '
  'because the tables are select-only to their owner -- a user must not be '
  'able to award themselves points.';

-- One point per whole unit of currency spent, rounded down. A deliberate,
-- boring rule: it is the one people already expect, it needs no tier table,
-- and it is a single number to change when somebody wants it to be different.
create or replace function loyalty_points_for_spend(p_cents int)
returns int language sql immutable as $$
  select greatest(0, p_cents / 100);
$$;

-- ============================================================================
-- 2. An RSVP can owe money
-- ============================================================================

do $$ begin
  create type attendance_payment as enum ('not_required', 'pending', 'paid', 'refunded');
exception when duplicate_object then null; end $$;

alter table event_attendees
  -- 'not_required' is right for every row that exists: they were all free.
  add column if not exists payment    attendance_payment not null default 'not_required',
  -- The price when they said yes. An admin raising the fee later must not
  -- retroactively make a settled attendee underpaid.
  add column if not exists fee_cents  int not null default 0,
  add column if not exists paid_at    timestamptz,
  -- The processor's own id, once there is a processor. Unique so the same
  -- webhook delivered twice cannot be counted twice.
  add column if not exists payment_ref text;

create unique index if not exists event_attendees_payment_ref
  on event_attendees (payment_ref) where payment_ref is not null;

-- Counted in attendees_count, and let through the door: a confirmed RSVP.
create or replace function attendance_is_confirmed(p_payment attendance_payment)
returns boolean language sql immutable as $$
  select p_payment in ('not_required', 'paid');
$$;

-- ============================================================================
-- 3. Saying yes
-- ============================================================================
--
-- Replaces set_event_attendance, which inserted a row and incremented a
-- counter with no idea that an event could cost anything.

create or replace function rsvp_to_event(p_event uuid, p_going boolean)
returns table(attendees int, payment attendance_payment, owed_cents int)
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := require_app_user();
  v_event events;
  v_existing event_attendees;
  v_payment attendance_payment;
  v_rows int;
begin
  select * into v_event from events where id = p_event;
  if v_event.id is null then
    raise exception 'That event no longer exists.' using errcode = 'no_data_found';
  end if;
  if not can_see_event(v_user, v_event) then
    raise exception 'That event is not open to you.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_existing from event_attendees
   where event_id = p_event and user_id = v_user;

  if not p_going then
    -- Leaving a paid event they already paid for is a refund somebody has to
    -- action; the row is marked, not deleted, so the money is not forgotten.
    if v_existing.user_id is not null and v_existing.payment = 'paid' then
      update event_attendees set payment = 'refunded'
       where event_id = p_event and user_id = v_user;
      update events set attendees_count = greatest(0, attendees_count - 1) where id = p_event;
    else
      delete from event_attendees where event_id = p_event and user_id = v_user;
      get diagnostics v_rows = row_count;
      if v_rows > 0 and attendance_is_confirmed(coalesce(v_existing.payment, 'not_required')) then
        update events set attendees_count = greatest(0, attendees_count - 1) where id = p_event;
      end if;
    end if;
    return query
      select e.attendees_count, 'not_required'::attendance_payment, 0 from events e where e.id = p_event;
    return;
  end if;

  -- Already in, and settled. Saying yes twice is not a second ticket.
  if v_existing.user_id is not null and v_existing.payment in ('not_required', 'paid', 'pending') then
    return query
      select e.attendees_count, v_existing.payment,
             case when v_existing.payment = 'pending' then v_existing.fee_cents else 0 end
        from events e where e.id = p_event;
    return;
  end if;

  v_payment := case when coalesce(v_event.fee_cents, 0) > 0
                    then 'pending'::attendance_payment
                    else 'not_required'::attendance_payment end;

  insert into event_attendees (event_id, user_id, payment, fee_cents)
  values (p_event, v_user, v_payment, coalesce(v_event.fee_cents, 0))
  on conflict (event_id, user_id) do update
    set payment = excluded.payment, fee_cents = excluded.fee_cents;

  -- Only a confirmed RSVP is counted. A pending one is somebody standing at
  -- the till, not somebody coming.
  if attendance_is_confirmed(v_payment) then
    update events set attendees_count = attendees_count + 1 where id = p_event;
  end if;

  return query
    select e.attendees_count, v_payment,
           case when v_payment = 'pending' then coalesce(v_event.fee_cents, 0) else 0 end
      from events e where e.id = p_event;
end $$;

grant execute on function rsvp_to_event(uuid, boolean) to authenticated;

-- The old name, kept so nothing breaks while the client catches up. It cannot
-- express a pending payment, so it reports a paid event as not-yet-attending
-- rather than lying about it.
create or replace function set_event_attendance(p_event uuid, p_going boolean)
returns int language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  select attendees into v_count from rsvp_to_event(p_event, p_going);
  return coalesce(v_count, 0);
end $$;

-- ============================================================================
-- 4. Where the webhook will land
-- ============================================================================
--
-- Called by the payment webhook, never by the app. It is the only thing that
-- turns 'pending' into 'paid', and it is where the loyalty points are earned:
-- points for money that actually arrived, not for an intention to pay.

create or replace function mark_event_payment_settled(
  p_event uuid, p_user uuid, p_reference text, p_amount_cents int
)
returns attendance_payment
language plpgsql security definer set search_path = public as $$
declare v_row event_attendees; v_points int;
begin
  select * into v_row from event_attendees where event_id = p_event and user_id = p_user;
  if v_row.user_id is null then
    raise exception 'No RSVP to settle for that person and event.'
      using errcode = 'no_data_found';
  end if;

  -- The same webhook delivered twice settles once. Providers retry; this is
  -- not a hypothetical.
  if v_row.payment = 'paid' then
    return 'paid'::attendance_payment;
  end if;

  update event_attendees
     set payment = 'paid', paid_at = now(), payment_ref = p_reference
   where event_id = p_event and user_id = p_user;

  update events set attendees_count = attendees_count + 1 where id = p_event;

  v_points := loyalty_points_for_spend(coalesce(p_amount_cents, v_row.fee_cents));
  if v_points > 0 then
    perform award_loyalty(p_user, v_points, 'Event fee');
  end if;

  return 'paid'::attendance_payment;
end $$;

-- service_role only. An `authenticated` grant here would let anyone mark their
-- own RSVP paid, which is the entire fee, given away.
revoke all on function mark_event_payment_settled(uuid, uuid, text, int) from public;
revoke all on function mark_event_payment_settled(uuid, uuid, text, int) from authenticated;
grant execute on function mark_event_payment_settled(uuid, uuid, text, int) to service_role;

-- A manager marking somebody paid by hand -- cash at the door, a bank
-- transfer. The same settlement, with a human as the reference.
create or replace function settle_event_payment_by_hand(p_event uuid, p_user uuid)
returns attendance_payment
language plpgsql security definer set search_path = public as $$
declare v_actor uuid := require_app_user(); v_comm uuid;
begin
  select community_id into v_comm from events where id = p_event;
  if not can_manage_community(v_actor, v_comm) then
    raise exception 'Only an admin or moderator can mark a fee paid.'
      using errcode = 'insufficient_privilege';
  end if;
  return mark_event_payment_settled(
    p_event, p_user, 'by-hand:' || v_actor::text || ':' || p_event::text, null
  );
end $$;

grant execute on function settle_event_payment_by_hand(uuid, uuid) to authenticated;

-- Attendees are visible to whoever can see the event, so a manager can work
-- the door. Previously event_attendees was self-only, which meant nobody could
-- see who was coming -- tolerable for a free meetup, useless for a paid one.
drop policy if exists attend_read on event_attendees;
create policy attend_read on event_attendees for select
  using (exists (
    select 1 from events e where e.id = event_id and can_see_event(current_app_user(), e)
  ));

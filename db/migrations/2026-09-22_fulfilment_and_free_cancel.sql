-- Who says a session happened, and what a cancellation costs.
--
-- Two changes that belong together, because the first one decides the second.
--
-- 1. A session was marked done by the coach alone, on their own screen, after
--    the start time had passed. The coach is the only party to the session who
--    benefits from saying it happened, which is the wrong person to ask on
--    their own. Both sides stamp it now, and the session is only `completed`
--    once both have.
--
-- 2. Cancelling a package always opened a negotiation, even when the client
--    had not had a single session out of it. There is nothing to argue about
--    when nothing has been delivered: the pack comes back in full and neither
--    party has to haggle. The negotiation stays for the case it was built for,
--    which is a pack that has been partly used.
--
-- "Fulfilled" now means exactly one thing -- `status = 'completed'`, which now
-- means both parties confirmed -- and both rules read it from the same place.

-- ---------------------------------------------------------------------------
-- Both sides say so
-- ---------------------------------------------------------------------------

alter table public.bookings
  add column if not exists coach_confirmed_at  timestamptz,
  add column if not exists client_confirmed_at timestamptz;

-- Sessions already closed out by a coach under the old one-sided rule keep
-- their status. Back-dating the coach's stamp to the row's own completion is
-- honest -- a coach did say it happened -- while leaving the client's stamp
-- empty, which is the truth: they were never asked.
update public.bookings
   set coach_confirmed_at = coalesce(coach_confirmed_at, updated_at, scheduled_for)
 where status = 'completed'
   and coach_confirmed_at is null;

comment on column public.bookings.coach_confirmed_at is
  'When the coach confirmed the session happened. Both stamps make it completed.';
comment on column public.bookings.client_confirmed_at is
  'When the client confirmed the session happened. Both stamps make it completed.';

-- Either party stamps their own side. Nobody can stamp the other's.
--
-- SECURITY DEFINER because the last stamp also moves `status` to 'completed',
-- and the status guard on bookings does not let a client do that -- correctly,
-- since a client must not be able to close a session out on their own. The
-- function is the only path that may, and it only does it when both stamps are
-- present.
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
    update bookings b set status = 'completed'
     where b.id = p_booking returning * into v_row;
  end if;

  return query select v_row.id, v_row.status::text,
                      v_row.coach_confirmed_at is not null,
                      v_row.client_confirmed_at is not null;
end $function$;

revoke execute on function public.confirm_session_fulfilled(uuid) from public, anon;
grant execute on function public.confirm_session_fulfilled(uuid) to authenticated;

-- Tell the other party, so the second confirmation is something they know to
-- give rather than something they have to go looking for. The notifications
-- table is also what the push trigger reads, so this is the push as well.
create or replace function public.notify_session_confirmation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_to uuid; v_from text; v_both boolean;
begin
  if new.coach_confirmed_at is not distinct from old.coach_confirmed_at
     and new.client_confirmed_at is not distinct from old.client_confirmed_at then
    return new;
  end if;

  v_both := new.coach_confirmed_at is not null and new.client_confirmed_at is not null;

  if new.coach_confirmed_at is distinct from old.coach_confirmed_at then
    v_to := new.client_id;
    select name into v_from from users where id = new.coach_id;
  else
    v_to := new.coach_id;
    select name into v_from from users where id = new.client_id;
  end if;

  insert into notifications (user_id, type, title, body)
  values (
    v_to,
    'booking'::notif_type,
    case when v_both
      then 'Session confirmed by both of you'
      else coalesce(v_from, 'They') || ' confirmed your session happened' end,
    case when v_both
      then 'Nothing else to do -- it is settled.'
      else 'Confirm it too, and the session is settled.' end
  );
  return new;
end $function$;

drop trigger if exists trg_notify_session_confirmation on public.bookings;
create trigger trg_notify_session_confirmation
  after update on public.bookings
  for each row execute function public.notify_session_confirmation();

-- ---------------------------------------------------------------------------
-- What counts as used
-- ---------------------------------------------------------------------------

-- `taken` used to count a confirmed session whose time had simply passed,
-- which under the old one-sided rule was the closest thing to "it happened".
-- Now that both parties say so explicitly, a session nobody has confirmed is
-- not a session anybody had -- so it is still owed, not spent.
--
-- The pack's remaining count is deliberately NOT changed to match: a slot that
-- has been booked and has passed is gone whether or not it was confirmed, and
-- handing it back would let somebody re-book a time that has already gone by.
create or replace view public.package_progress
with (security_invoker = true) as
select b.client_id,
       b.coach_id,
       b.package_id,
       p.sessions as total,
       count(*) filter (where b.status = 'pending')::int as pending,
       count(*) filter (where b.status = 'confirmed' and b.scheduled_for >= now())::int as booked,
       count(*) filter (where b.status = 'completed')::int as taken,
       -- Unconfirmed and in the past: had its slot, but neither party has said
       -- it happened. Its own count, because it is the number the free-cancel
       -- rule and the "confirm it" prompt are both about.
       count(*) filter (
         where b.status = 'confirmed' and b.scheduled_for < now()
       )::int as awaiting_confirmation,
       greatest(
         p.sessions - count(*) filter (
           where b.status in ('pending', 'confirmed', 'completed')
         )::int,
         0
       )::int as remaining
  from bookings b
  join packages p on p.id = b.package_id
 where b.package_id is not null
 group by b.client_id, b.coach_id, b.package_id, p.sessions;

grant select on public.package_progress to authenticated;

-- ---------------------------------------------------------------------------
-- Nothing delivered, nothing to argue about
-- ---------------------------------------------------------------------------

-- A pack with no fulfilled session comes back in full, on the client's own say
-- so. No request, no offer, no waiting on a coach who has not yet given them
-- anything.
--
-- It writes the same `package_cancellations` row the negotiated path writes,
-- already approved at the full price, so both sides read one history and the
-- pack freezes through the same `package_is_cancelled` check.
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

  select p.price_cents into v_price from packages p where p.id = p_package;

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

-- ---------------------------------------------------------------------------
-- NOT APPLIED
-- ---------------------------------------------------------------------------
--
-- This session had no database access, so none of the above has been run or
-- checked against the live schema. Before applying it, two things are worth
-- confirming, because neither could be read from here:
--
--   * `bookings` has an `updated_at` column. The back-fill above reads it; if
--     it does not exist, drop that term and the coalesce falls through to
--     `scheduled_for`.
--   * `guard_booking_status_transition()` -- the trigger on bookings -- is not
--     in this repo, so its rules could not be read. `confirm_session_fulfilled`
--     is SECURITY DEFINER and should pass it, but the guard may reject a
--     client-authored update even from a definer function depending on how it
--     reads the actor. Check it, and if so, have the function set the actor or
--     exempt itself the way the venues guard exempts `service_role`.
--
-- Checks to run once it is applied, in a transaction that is rolled back:
--   coach confirms, client has not          -> status stays 'confirmed'
--   client then confirms                    -> status 'completed', one push each
--   either confirms twice                   -> stamp does not move
--   a stranger confirms                     -> refused
--   confirming before scheduled_for         -> refused
--   confirming a cancelled session          -> refused
--   cancel_unused_package with 0 completed  -> approved at the full price
--   cancel_unused_package with 1 completed  -> refused, pointing at the ask
--   cancel_unused_package twice             -> refused, one open request

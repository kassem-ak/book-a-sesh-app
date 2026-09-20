-- Book several sessions of a package at once, and count what is left honestly.
--
-- Buying a ten-session pack booked exactly one session. The other nine existed
-- only as a number in `client_package_balances.used`, and the way to use them
-- was to come back nine more times and hope the coach still had the slots.
--
-- Two things here:
--   1. book_package_sessions() takes several slots and books them together, or
--      books none of them.
--   2. package_progress reports pending / booked / taken / remaining from the
--      bookings themselves rather than from a counter.

-- ---------------------------------------------------------------------------
-- What is left, derived
-- ---------------------------------------------------------------------------

-- `client_package_balances.used` only ever went up. Cancelling a session left
-- it incremented, so a cancelled session was gone from the pack forever -- the
-- client paid for ten and could book nine. A count of the bookings cannot drift
-- from the bookings.
--
-- The four states a session of a pack can be in:
--   pending   -- asked for, the coach has not answered
--   booked    -- confirmed and still ahead
--   taken     -- completed, or confirmed and already in the past
--   remaining -- what is left of what was paid for
--
-- A cancelled or no-show session counts as none of these, so it returns to
-- remaining. That is the intended behaviour and the reason for deriving.
--
-- security_invoker so the reader's own RLS applies: `book_party_read` already
-- says a booking is visible to its client and its coach, which is exactly who
-- should see this. Without it the view would run as its owner and show every
-- client's balance to anybody who asked.
create or replace view public.package_progress
with (security_invoker = true) as
select b.client_id,
       b.coach_id,
       b.package_id,
       p.sessions as total,
       count(*) filter (where b.status = 'pending')::int as pending,
       count(*) filter (where b.status = 'confirmed' and b.scheduled_for >= now())::int as booked,
       count(*) filter (where b.status = 'completed'
                           or (b.status = 'confirmed' and b.scheduled_for < now()))::int as taken,
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
-- Booking several at once
-- ---------------------------------------------------------------------------

-- One transaction, all the slots or none of them.
--
-- A loop of single bookings in the client would leave somebody with four of the
-- five they chose and no way to tell which one failed. The partial unique index
-- on (coach_id, scheduled_for) means a race with another client is a real
-- possibility, not a theoretical one.
--
-- `p_slots` is [{"at": "<timestamptz>", "label": "6:30 PM"}, ...]. The label is
-- what the coach's schedule is checked against, the same as the single-booking
-- path.
create or replace function public.book_package_sessions(
  p_coach uuid,
  p_package_id uuid,
  p_slots jsonb
)
returns int
language plpgsql
security definer
set search_path to 'public'
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

  -- One lock per client+package, held to the end of the transaction. Two
  -- devices booking the last session of the same pack at the same moment would
  -- otherwise both see it free.
  perform pg_advisory_xact_lock(
    hashtextextended(v_user::text || ':' || p_package_id::text, 0));

  select sessions, price_cents into v_sessions, v_price
    from packages
   where id = p_package_id and coach_id = p_coach and active;
  if v_price is null then
    raise exception 'That package is not available from this coach.';
  end if;

  -- Counted from the bookings, the same way package_progress does it, so the
  -- number the screen showed and the number enforced here cannot disagree.
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

  -- The pack is paid for once. If the client has never booked from it, the
  -- first session carries the whole price and the rest carry nothing; if they
  -- have, it is already paid and everything here is free.
  v_first := v_used = 0;

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

  -- The balance row is what the older screens read, so it is kept in step --
  -- but package_progress, not this, is what the app now displays.
  insert into client_package_balances (client_id, coach_id, package_id, label, used, total)
  values (v_user, p_coach, p_package_id, v_sessions || '-session pack', v_used + v_wanted, v_sessions)
  on conflict (client_id, coach_id, package_id) where package_id is not null
  do update set used = least(excluded.used, client_package_balances.total),
                total = excluded.total;

  return v_wanted;
end $function$;

revoke execute on function public.book_package_sessions(uuid, uuid, jsonb) from public, anon;
grant execute on function public.book_package_sessions(uuid, uuid, jsonb) to authenticated;

-- Applied live 20 September 2026 and verified as two real signed-in accounts in
-- a rolled-back transaction:
--   book 3 of a 5-pack in one call        -> 3 bookings, one priced, two free
--   package_progress                      -> booked 3, remaining 2
--   book 3 more                           -> refused, "has 2 of 5 sessions left"
--   book the remaining 2                  -> ok, remaining 0
--   cancel one                            -> remaining 1 (the counter never did
--                                            this; a cancelled session used to
--                                            be lost)
--   a slot outside the coach's hours       -> refused, nothing inserted
--   a slot on a closed date                -> refused, nothing inserted
--   one bad slot among good ones           -> none of them inserted
--   the coach reading their client's row    -> visible
--   an unrelated account reading it         -> 0 rows

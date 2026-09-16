-- A coach could set "My schedule" -- which tells them it controls "which slots
-- clients can book" -- and a client could still book a slot on a declared day
-- off, because create_booking_for_coach never consulted coach_availability.
-- The promise was real UI writing real rows that nothing read.
--
-- Enforcement takes the slot as its OWN argument rather than parsing
-- bookings.slot_label. That label is display text assembled client-side
-- ("5-session pack - July 12 - 8:00 AM"); matching a correctness rule against
-- it would silently stop enforcing the day that format changed.
--
-- A coach with NO availability rows has not set a schedule and is treated as
-- open, so enabling this does not block every coach who never opened that
-- screen.
--
-- coach_availability.weekday is 0=Mon..6=Sun (see CoachOverlays.tsx), i.e.
-- isodow - 1, NOT extract(dow).
--
-- NOTE: adding a defaulted 5th argument creates a SECOND overload rather than
-- replacing the 4-argument one, which makes a 4-argument call ambiguous
-- ("function ... is not unique") and breaks every existing caller. The old
-- signature is therefore dropped at the end. PostgREST calls RPCs with named
-- arguments, so a client omitting p_slot still resolves here.
--
-- Verified live: no schedule = bookable; an unoffered slot and a day off are
-- both refused; the offered slot books; omitting p_slot skips enforcement.

create or replace function create_booking_for_coach(
  p_coach uuid,
  p_scheduled_for timestamptz,
  p_slot_label text,
  p_package_id uuid default null::uuid,
  p_slot text default null::text
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_user uuid := require_app_user();
        v_total int; v_pct numeric; v_id uuid;
        v_sessions int; v_price int;
        v_used int; v_cap int;
        v_has_schedule boolean; v_weekday int;
begin
  if p_scheduled_for < now() - interval '1 day' then
    raise exception 'cannot book a slot in the past';
  end if;

  -- Respect the coach's saved schedule when they have one and the caller said
  -- which slot was picked.
  if p_slot is not null then
    select exists (select 1 from coach_availability where coach_id = p_coach)
      into v_has_schedule;

    if v_has_schedule then
      v_weekday := extract(isodow from p_scheduled_for)::int - 1;
      if not exists (
        select 1 from coach_availability
         where coach_id = p_coach and weekday = v_weekday and slot = p_slot
      ) then
        raise exception 'that coach is not available at that time';
      end if;
    end if;
  end if;

  if p_package_id is not null then
    -- Serialise every booking competing for this client's balance of this
    -- package, including the first, when no row exists to lock. Released at
    -- commit.
    perform pg_advisory_xact_lock(
      hashtextextended(v_user::text || ':' || p_coach::text || ':' || p_package_id::text, 0));

    select sessions, price_cents into v_sessions, v_price
      from packages
     where id = p_package_id and coach_id = p_coach and active;
    if v_price is null then raise exception 'package not available for this coach'; end if;

    select used, total into v_used, v_cap
      from client_package_balances
     where client_id = v_user and coach_id = p_coach and package_id = p_package_id
     for update;

    if v_used is null then
      v_total := v_price;
    elsif v_used < v_cap then
      v_total := 0;
    else
      raise exception 'this package has no sessions left';
    end if;
  else
    select price_cents into v_total from coach_profiles where user_id = p_coach;
    if v_total is null then raise exception 'coach not found'; end if;
  end if;

  select pct into v_pct from platform_margins where key = 'session';

  insert into bookings (client_id, coach_id, package_id, scheduled_for, slot_label,
                        status, total_cents, commission_cents)
  values (v_user, p_coach, p_package_id, p_scheduled_for, p_slot_label,
          'confirmed', v_total, round(v_total * coalesce(v_pct, 12) / 100.0))
  returning id into v_id;

  if p_package_id is not null then
    insert into client_package_balances (client_id, coach_id, package_id, label, used, total)
    values (v_user, p_coach, p_package_id, v_sessions || '-session pack', 1, v_sessions)
    on conflict (client_id, coach_id, package_id) where package_id is not null
    do update set
      -- label and total are what was PURCHASED. Editing the listing later must
      -- not change them; only the count of sessions used moves.
      used = least(client_package_balances.used + 1, client_package_balances.total);
  end if;

  return v_id;
end $function$;

grant execute on function create_booking_for_coach(uuid, timestamptz, text, uuid, text) to authenticated;

-- Remove the superseded 4-argument overload, or every 4-argument call is
-- ambiguous from this point on.
drop function if exists create_booking_for_coach(uuid, timestamptz, text, uuid);

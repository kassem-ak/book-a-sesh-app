-- Two money defects in create_booking_for_coach, found by a commercial review
-- of the booking path.
--
-- 1. The purchase-versus-redemption decision was unserialised. It read
--    client_package_balances with no lock, and on a first purchase there is no
--    row to lock at all, so two concurrent calls could both see "no balance"
--    and each record the full pack price and commission -- a duplicated
--    liability. At the other end, two calls could both see used < total and
--    each take the last session for free; `least(...)` then capped `used` and
--    hid the extra booking.
--
--    A row lock cannot cover the first-purchase case because the row does not
--    exist yet, so this takes a transaction-scoped advisory lock on the
--    (client, coach, package) triple. It serialises only bookings competing for
--    the same package balance; unrelated bookings never contend.
--
-- 2. Redemption rewrote the buyer's entitlement from the package's CURRENT
--    session count (`total = excluded.total`). A coach lowering their pack from
--    10 sessions to 5 shrank what an existing buyer had already paid for;
--    raising it granted extra sessions with no purchase and no commission. What
--    someone bought must not move because the seller edited the listing, so the
--    stored label and total are preserved once a balance exists.
--
-- Verified against the live database: with a 5-session pack purchased and the
-- listing then edited down to 2, the balance stays 5/5, all five redeem at
-- zero, and the sixth is refused.

create or replace function create_booking_for_coach(
  p_coach uuid,
  p_scheduled_for timestamptz,
  p_slot_label text,
  p_package_id uuid default null::uuid
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
begin
  if p_scheduled_for < now() - interval '1 day' then
    raise exception 'cannot book a slot in the past';
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

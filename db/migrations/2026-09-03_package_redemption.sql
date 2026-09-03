-- Fix: a multi-session package was charged in full on every session.
--
-- create_booking_for_coach set total_cents = packages.price_cents whenever a
-- package id was passed, and separately advanced client_package_balances.used.
-- Booking all five sessions of a $203 five-session pack therefore wrote five
-- bookings at $203 each -- $1,015 billed, plus five commission snapshots.
--
-- A package is bought once and then redeemed. The first booking against a
-- package is the purchase and carries the price; later bookings draw down the
-- balance at zero, and are refused once the pack is used up.
create or replace function create_booking_for_coach(
  p_coach uuid,
  p_scheduled_for timestamptz,
  p_slot_label text,
  p_package_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_user uuid := require_app_user();
        v_total int; v_pct numeric; v_id uuid;
        v_sessions int; v_price int;
        v_used int; v_cap int;
begin
  if p_scheduled_for < now() - interval '1 day' then
    raise exception 'cannot book a slot in the past';
  end if;

  if p_package_id is not null then
    select sessions, price_cents into v_sessions, v_price
      from packages
     where id = p_package_id and coach_id = p_coach and active;
    if v_price is null then raise exception 'package not available for this coach'; end if;

    select used, total into v_used, v_cap
      from client_package_balances
     where client_id = v_user and coach_id = p_coach and package_id = p_package_id;

    if v_used is null then
      v_total := v_price;                -- purchase: charge the pack once
    elsif v_used < v_cap then
      v_total := 0;                      -- redemption: already paid for
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
      label = excluded.label,
      total = excluded.total,
      used  = least(client_package_balances.used + 1, excluded.total);
  end if;

  return v_id;
end $$;
grant execute on function create_booking_for_coach(uuid, timestamptz, text, uuid) to authenticated;

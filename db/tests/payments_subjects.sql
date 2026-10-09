-- Payments on real subjects. Passes when it raises 'ALL PAYMENTS SUBJECT CHECKS PASSED'.
do $$
declare
  v_auth uuid := gen_random_uuid(); v_coach_auth uuid := gen_random_uuid();
  v_me uuid; v_coach uuid; v_pkg uuid; v_booking uuid; v_pay uuid; v_venue uuid; v_court uuid;
  v_slot timestamptz := date_trunc('day', now()) + interval '3 days' + interval '10 hours';
  v_err text; v_status text; v_n int;
begin
  insert into auth.users (id) values (v_auth), (v_coach_auth);
  set local role service_role;
  select id into v_me from users where auth_id = v_auth;
  select id into v_coach from users where auth_id = v_coach_auth;
  insert into coach_profiles (user_id, headline, price_cents) values (v_coach, 'ZZ pay coach', 5000);
  insert into packages (coach_id, sessions, price_cents, active) values (v_coach, 4, 20000, true) returning id into v_pkg;
  insert into venues (slug, name, city, sport, status, equipment_cents_per_hour, timezone, opens_at, closes_at)
  values ('zz-pay-venue', 'ZZ Pay Venue', 'Beirut', 'Paddle', 'open', 0, 'UTC', '00:00', '23:59') returning id into v_venue;
  insert into courts (venue_id, name, price_cents_per_hour, active) values (v_venue, 'ZZ PAY COURT', 3000, true) returning id into v_court;
  update payment_settings set enabled_kinds = array['session','package','court'], fee_bps = 0, fee_flat_cents = 0;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_auth::text, 'role', 'authenticated')::text, true);

  -- 1. A paid single session is pending until paid, with a payment open.
  v_booking := create_booking_for_coach(v_coach, v_slot, 'ZZ single', null, null);
  select status into v_status from bookings where id = v_booking;
  if v_status <> 'pending' then raise exception 'FAIL 1: booking is %', v_status; end if;
  select id into v_pay from payments where kind = 'session' and subject_id = v_booking;
  if v_pay is null then raise exception 'FAIL 1b: no payment opened'; end if;

  -- 2. Paying confirms it.
  set local role service_role;
  perform payments_begin_charge(v_pay);
  perform payments_mark_held(v_pay, 'zz_sub_1', 0, null);
  if (select status from bookings where id = v_booking) <> 'confirmed' then raise exception 'FAIL 2: not confirmed after payment'; end if;

  -- 3. The member cancels a paid session: the price is refunded.
  set local role authenticated;
  update bookings set status = 'cancelled' where id = v_booking;
  set local role service_role;
  if (select coalesce(sum(amount_cents),0) from refunds where payment_id = v_pay) <> 5000 then
    raise exception 'FAIL 3: cancelled paid session not refunded';
  end if;

  -- 4. Cancelling an unpaid booking cancels the payment, no money moves.
  set local role authenticated;
  v_booking := create_booking_for_coach(v_coach, v_slot + interval '1 day', 'ZZ unpaid', null, null);
  update bookings set status = 'cancelled' where id = v_booking;
  set local role service_role;
  select status into v_status from payments where kind = 'session' and subject_id = v_booking;
  if v_status <> 'cancelled' then raise exception 'FAIL 4: payment is % after cancelling unpaid booking', v_status; end if;

  -- 5. Expiry cancels the booking.
  set local role authenticated;
  v_booking := create_booking_for_coach(v_coach, v_slot + interval '2 days', 'ZZ expire', null, null);
  set local role service_role;
  select id into v_pay from payments where kind = 'session' and subject_id = v_booking;
  update payments set expires_at = now() - interval '1 second' where id = v_pay;
  perform private.fail_payment(v_pay, 'expired');
  if (select status from bookings where id = v_booking) <> 'cancelled' then raise exception 'FAIL 5: expired booking still live'; end if;

  -- 6. Completion by both sides adds a release.
  set local role authenticated;
  v_booking := create_booking_for_coach(v_coach, v_slot + interval '3 days', 'ZZ complete', null, null);
  set local role service_role;
  select id into v_pay from payments where kind = 'session' and subject_id = v_booking;
  perform payments_begin_charge(v_pay);
  perform payments_mark_held(v_pay, 'zz_sub_6', 0, null);
  update bookings set status = 'completed' where id = v_booking;
  if not exists (select 1 from payment_releases where payment_id = v_pay) then raise exception 'FAIL 6: no release on completion'; end if;

  -- 7. Package: one payment for the pack; per-session releases; refund capped at what is held.
  set local role authenticated;
  perform book_package_sessions(v_coach, v_pkg, jsonb_build_array(
    jsonb_build_object('at', v_slot + interval '10 days', 'label', 'A'),
    jsonb_build_object('at', v_slot + interval '11 days', 'label', 'B')));
  set local role service_role;
  select p.id into v_pay from payments p where p.kind = 'package' and p.payer_id = v_me;
  select count(*) into v_n from bookings where client_id = v_me and package_id = v_pkg and status = 'pending';
  if v_n <> 2 then raise exception 'FAIL 7: % pack bookings pending, expected 2', v_n; end if;
  perform payments_begin_charge(v_pay);
  perform payments_mark_held(v_pay, 'zz_sub_7', 0, null);
  select count(*) into v_n from bookings where client_id = v_me and package_id = v_pkg and status = 'confirmed';
  if v_n <> 2 then raise exception 'FAIL 7b: paying did not confirm both pack bookings'; end if;
  update bookings set status = 'completed' where client_id = v_me and package_id = v_pkg and slot_label = 'A';
  if (select amount_cents from payment_releases where payment_id = v_pay) <> 5000 then raise exception 'FAIL 7c: per-session release'; end if;
  insert into package_cancellations (client_id, coach_id, package_id, status, refund_cents)
  values (v_me, v_coach, v_pkg, 'approved', 999999);
  if (select sum(amount_cents) from refunds where payment_id = v_pay) <> 15000 then
    raise exception 'FAIL 7d: pack refund % not capped at the 15000 still held', (select sum(amount_cents) from refunds where payment_id = v_pay);
  end if;

  -- 8. A court at a venue with no owner cannot be paid for.
  set local role authenticated;
  begin
    perform reserve_court(v_court, v_slot + interval '20 days', 1, 'Single', false);
    raise exception 'FAIL 8: ownerless venue took a reservation with payments on';
  exception when others then
    get stacked diagnostics v_err = message_text;
    if v_err like 'FAIL%' then raise; end if;
    if v_err <> 'This venue cannot take payments yet.' then raise exception 'FAIL 8b: %', v_err; end if;
  end;

  -- 9. With payments off, bookings behave exactly as before.
  set local role service_role;
  update payment_settings set enabled_kinds = '{}';
  set local role authenticated;
  v_booking := create_booking_for_coach(v_coach, v_slot + interval '30 days', 'ZZ off', null, null);
  if (select status from bookings where id = v_booking) <> 'confirmed' then raise exception 'FAIL 9: payments off changed booking'; end if;

  raise exception 'ALL PAYMENTS SUBJECT CHECKS PASSED';
end $$;

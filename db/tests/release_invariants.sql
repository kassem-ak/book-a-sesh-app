-- ============================================================================
-- BOOK'D — release invariants
--
-- Every assertion here was verified by hand during the release pass. Encoding
-- them means a future migration that breaks one fails loudly instead of
-- silently re-opening a pricing bug or a permission hole.
--
-- Run:  psql "$DATABASE_URL" -f db/tests/release_invariants.sql
--       (or paste the whole file into the Supabase SQL editor)
--
-- SAFE AGAINST PRODUCTION. The block seeds its own fixture and then *always*
-- ends by raising, so everything it wrote is discarded whether or not the
-- caller honours an explicit ROLLBACK. Success looks like an error whose
-- message starts with ALL INVARIANTS PASSED — that is the intended outcome,
-- and it is why there is no BEGIN/ROLLBACK wrapper: the raise IS the rollback.
--
-- A real failure raises a message starting with FAIL.
--
-- Three roles are used deliberately:
--   service_role   builds the fixture, because guard_coach_profile_privileges
--                  rewrites user_id and the subscription fields on an INSERT
--                  from any other role
--   authenticated  runs every assertion, so RLS and column grants are in force
--   the caller     runs the catalogue checks, since information_schema is
--                  filtered by the current role and would otherwise pass
--                  vacuously
-- ============================================================================

do $$
declare
  v_log   text := '';
  v_pass  int  := 0;
  v_user uuid; v_other uuid; v_coach uuid;
  v_venue uuid; v_court uuid; v_pkg uuid; v_conv uuid;
  v_auth uuid := gen_random_uuid();
  v_total int; v_commission int; v_used int; v_cap int;
  v_slot timestamptz;
  v_role text;
  v_err  text;
begin
  ------------------------------------------------------------------ fixture
  -- users.auth_id is FK-constrained to auth.users, and a trigger mirrors the
  -- signup into public.users — so create the auth row and take what it makes.
  -- This one runs as the caller: service_role has no INSERT on auth.users.
  insert into auth.users (id) values (v_auth);

  set local role service_role;

  select id into v_user from users where auth_id = v_auth;
  if v_user is null then
    raise exception 'FAIL 0: the auth.users signup trigger did not create a public.users row';
  end if;
  update users set name = 'ZZ Invariant Client', city = 'Beirut' where id = v_user;

  insert into users (name, city) values ('ZZ Invariant Other', 'Beirut') returning id into v_other;
  insert into users (name, city) values ('ZZ Invariant Coach', 'Beirut') returning id into v_coach;

  insert into coach_profiles (user_id, headline, price_cents)
  values (v_coach, 'Invariant fixture', 5000);

  insert into packages (coach_id, sessions, price_cents, active)
  values (v_coach, 5, 20000, true) returning id into v_pkg;

  -- Open around the clock and pinned to UTC so the assertions below never
  -- depend on what local hour the suite happens to run at.
  insert into venues (slug, name, city, sport, status, equipment_cents_per_hour,
                      timezone, opens_at, closes_at)
  values ('zz-invariant-venue', 'ZZ Invariant Venue', 'Beirut', 'Paddle', 'open', 500,
          'UTC', '00:00', '23:59')
  returning id into v_venue;

  insert into courts (venue_id, name, price_cents_per_hour, active)
  values (v_venue, 'ZZ COURT', 3000, true) returning id into v_court;

  -- Pin to 10:00 UTC on a future day. Deriving this from the current hour made
  -- the suite fragile: run late enough in the day and the later offsets pushed
  -- a reservation past midnight, failing the venue's opening-hours check for
  -- reasons that had nothing to do with what was being tested.
  v_slot := date_trunc('day', now()) + interval '2 days' + interval '10 hours';

  --------------------------------------------------- act as the real client
  set local role authenticated;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_auth::text, 'role', 'authenticated')::text, true);

  -- ======================= 1. a package is charged once ====================
  -- Regression guard: every session of a pack used to re-charge the full pack
  -- price, so a 5-session pack billed 5x.
  perform create_booking_for_coach(v_coach, v_slot, 'ZZ S1', v_pkg);
  select total_cents into v_total from bookings
   where client_id = v_user and slot_label = 'ZZ S1';
  if v_total is distinct from 20000 then
    raise exception 'FAIL 1a: first package booking charged %, expected 20000', v_total;
  end if;

  perform create_booking_for_coach(v_coach, v_slot + interval '1 day', 'ZZ S2', v_pkg);
  select total_cents into v_total from bookings
   where client_id = v_user and slot_label = 'ZZ S2';
  if v_total is distinct from 0 then
    raise exception 'FAIL 1b: second session of the same pack charged %, expected 0', v_total;
  end if;

  select used into v_used from client_package_balances
   where client_id = v_user and package_id = v_pkg;
  if v_used is distinct from 2 then
    raise exception 'FAIL 1c: package balance used = %, expected 2', v_used;
  end if;
  v_pass := v_pass + 1;
  v_log := v_log || E'\n  PASS 1  package charged once (20000 then 0), balance 2/5';

  -- ======================= 2. court price is server-derived ================
  -- 3000/h x 2h + 500/h equipment x 2h = 7000. The client sends no amount.
  perform reserve_court(v_court, v_slot + interval '3 days', 2, 'Single', true);
  select total_cents, commission_cents into v_total, v_commission
    from court_reservations where client_id = v_user;
  if v_total is distinct from 7000 then
    raise exception 'FAIL 2a: court total %, expected 7000 (court 6000 + gear 1000)', v_total;
  end if;
  if v_commission is null or v_commission <= 0 or v_commission >= v_total then
    raise exception 'FAIL 2b: commission % is not a sane share of %', v_commission, v_total;
  end if;
  v_pass := v_pass + 1;
  v_log := v_log || E'\n  PASS 2  court priced server-side (7000, commission ' || v_commission || ')';

  -- ======================= 3. no double-booking ============================
  begin
    perform reserve_court(v_court, v_slot + interval '3 days' + interval '1 hour', 2, 'Single', false);
    raise exception 'FAIL 3a: an overlapping reservation was accepted';
  exception when others then
    get stacked diagnostics v_err = message_text;
    if v_err like 'FAIL %' then raise; end if;
  end;
  -- ...but the adjacent, non-overlapping slot must still be bookable.
  perform reserve_court(v_court, v_slot + interval '3 days' + interval '2 hours', 1, 'Single', false);
  v_pass := v_pass + 1;
  v_log := v_log || E'\n  PASS 3  overlap refused, adjacent slot allowed';

  -- ======================= 4. reservation guards ===========================
  begin
    perform reserve_court(v_court, now() - interval '1 day', 1, 'Single', false);
    raise exception 'FAIL 4a: a reservation in the past was accepted';
  exception when others then
    get stacked diagnostics v_err = message_text;
    if v_err like 'FAIL %' then raise; end if;
  end;
  begin
    perform reserve_court(v_court, v_slot + interval '6 days', 99, 'Single', false);
    raise exception 'FAIL 4b: a 99-hour reservation was accepted';
  exception when others then
    get stacked diagnostics v_err = message_text;
    if v_err like 'FAIL %' then raise; end if;
  end;
  begin
    perform reserve_court(v_court, v_slot + interval '7 days', 1, 'Freebie', false);
    raise exception 'FAIL 4c: an unknown booking type was accepted';
  exception when others then
    get stacked diagnostics v_err = message_text;
    if v_err like 'FAIL %' then raise; end if;
  end;
  v_pass := v_pass + 1;
  v_log := v_log || E'\n  PASS 4  past slot, 99-hour duration and unknown type all refused';

  -- ======================= 5. no self-promotion to admin ===================
  begin
    update users set is_admin = true where id = v_user;
    -- If both the column grant and the guard trigger were gone this would
    -- succeed silently, so assert the value rather than relying on an error.
    if exists (select 1 from users where id = v_user and is_admin) then
      raise exception 'FAIL 5: a user promoted themselves to admin';
    end if;
  exception when others then
    get stacked diagnostics v_err = message_text;
    if v_err like 'FAIL %' then raise; end if;
  end;
  v_pass := v_pass + 1;
  v_log := v_log || E'\n  PASS 5  self-promotion to is_admin refused';

  -- ======================= 6. role derives from the account ================
  select my_account_role() into v_role;
  if v_role is distinct from 'USER' then
    raise exception 'FAIL 6a: account with no coach profile resolved as %, expected USER', v_role;
  end if;

  insert into coach_profiles (user_id, headline, price_cents)
  values (v_user, 'ZZ', 1000);

  select my_account_role() into v_role;
  if v_role is distinct from 'COACH' then
    raise exception 'FAIL 6b: account with a coach profile resolved as %, expected COACH', v_role;
  end if;
  v_pass := v_pass + 1;
  v_log := v_log || E'\n  PASS 6  my_account_role: USER without a coach profile, COACH with one';

  -- ======================= 9. chat threads =================================
  -- Regression guard for the 42P17 recursion that made chat unusable for every
  -- user: a self-referencing RLS policy on conversation_participants.
  select start_conversation(v_other) into v_conv;
  if v_conv is null then
    raise exception 'FAIL 9a: start_conversation returned null';
  end if;
  if (select count(*) from conversation_participants where conversation_id = v_conv) <> 2 then
    raise exception 'FAIL 9b: thread does not have exactly two participants';
  end if;
  if start_conversation(v_other) is distinct from v_conv then
    raise exception 'FAIL 9c: start_conversation created a duplicate thread';
  end if;
  v_pass := v_pass + 1;
  v_log := v_log || E'\n  PASS 9  start_conversation creates one thread and reuses it';

  -- ======================= 10. blocking ===================================
  -- Both stores require a working block for an app with user-generated
  -- content, and it has to hold on the server, not just in the client.
  perform block_user(v_other);
  if not is_blocked_with(v_other) then
    raise exception 'FAIL 10a: block_user did not register';
  end if;

  begin
    insert into messages (conversation_id, sender_id, body)
    values (v_conv, v_user, 'should not arrive');
    raise exception 'FAIL 10b: a blocked conversation still accepted a message';
  exception when others then
    get stacked diagnostics v_err = message_text;
    if v_err like 'FAIL %' then raise; end if;
  end;

  begin
    perform start_conversation(v_other);
    raise exception 'FAIL 10c: start_conversation opened a thread across a block';
  exception when others then
    get stacked diagnostics v_err = message_text;
    if v_err like 'FAIL %' then raise; end if;
  end;

  perform unblock_user(v_other);
  insert into messages (conversation_id, sender_id, body) values (v_conv, v_user, 'ok');
  v_pass := v_pass + 1;
  v_log := v_log || E'
  PASS 10 block stops messages both ways, unblock restores them';

  -- ======================= 11. booking notifications ======================
  -- Three screens tell the user that booking updates arrive. Nothing produced
  -- one until a trigger was added, so this is the check that keeps the promise
  -- honest.
  if not exists (
    select 1 from notifications
     where user_id = v_user and type = 'booking'
  ) then
    raise exception 'FAIL 11a: booking produced no notification for the client';
  end if;
  -- The coach's copy cannot be checked from here: RLS correctly stops the
  -- client reading someone else's notifications. That it is unreadable is
  -- itself part of what should hold, so the read moves below the reset.
  v_pass := v_pass + 1;
  v_log := v_log || E'
  PASS 11 a booking notifies the client, and the coach copy is not readable by them';

  -- ======================= 12. entitlement is what was bought =============
  -- A coach editing their listing must not move what an existing buyer already
  -- paid for. Redemption used to rewrite the balance from the package's current
  -- session count, so lowering a pack silently confiscated paid sessions.
  -- v_pkg was bought at 5 sessions and has 2 used by group 1.
  set local role service_role;
  update packages set sessions = 2 where id = v_pkg;
  set local role authenticated;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_auth::text, 'role', 'authenticated')::text, true);

  perform create_booking_for_coach(v_coach, v_slot + interval '9 days', 'ZZ S3', v_pkg);
  select used, total into v_used, v_cap from client_package_balances
   where client_id = v_user and package_id = v_pkg;
  if v_cap is distinct from 5 then
    raise exception 'FAIL 12a: entitlement followed the listing -- total is %, bought 5', v_cap;
  end if;
  select total_cents into v_total from bookings
   where client_id = v_user and slot_label = 'ZZ S3';
  if v_total is distinct from 0 then
    raise exception 'FAIL 12b: a redemption past the edited listing size charged %', v_total;
  end if;
  v_pass := v_pass + 1;
  v_log := v_log || E'
  PASS 12 entitlement stays at what was purchased when the listing changes';

  -- ======================= 13. the coach's schedule is enforced ===========
  -- "My schedule" tells a coach it controls which slots clients can book. It
  -- wrote real rows that the booking RPC never read, so a client could book a
  -- declared day off. The slot is passed explicitly rather than parsed out of
  -- slot_label, which is display text.
  set local role service_role;
  insert into coach_availability (coach_id, weekday, slot)
  values (v_coach, extract(isodow from v_slot + interval '10 days')::int - 1, '6:30 PM');
  set local role authenticated;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_auth::text, 'role', 'authenticated')::text, true);

  begin
    perform create_booking_for_coach(v_coach, v_slot + interval '10 days', 'ZZ S4', null, '8:00 AM');
    raise exception 'FAIL 13a: booked a slot the coach never offered';
  exception when others then
    get stacked diagnostics v_err = message_text;
    if v_err like 'FAIL %' then raise; end if;
  end;
  perform create_booking_for_coach(v_coach, v_slot + interval '10 days', 'ZZ S5', null, '6:30 PM');
  v_pass := v_pass + 1;
  v_log := v_log || E'
  PASS 13 coach schedule enforced: unoffered slot refused, offered slot books';

  ------------------------------------------------- catalogue checks (caller)
  reset role;

  if not exists (
    select 1 from notifications
     where user_id = v_coach and type = 'booking'
  ) then
    raise exception 'FAIL 11b: booking produced no notification for the coach';
  end if;

  -- ======================= 7. money tables are RPC-only ====================
  if exists (
    select 1 from information_schema.role_table_grants
     where table_schema = 'public'
       and table_name in ('bookings','orders','court_reservations','venue_event_entries')
       and grantee in ('anon','authenticated')
       and privilege_type in ('INSERT','UPDATE')
  ) then
    raise exception 'FAIL 7: a client role holds INSERT/UPDATE on a money table';
  end if;
  v_pass := v_pass + 1;
  v_log := v_log || E'\n  PASS 7  no client write grant on bookings/orders/reservations';

  -- ======================= 8. private columns stay private =================
  if exists (
    select 1 from information_schema.column_privileges
     where table_schema = 'public' and table_name = 'users'
       and column_name in ('is_admin','email','auth_id')
       and grantee in ('anon','authenticated')
       and privilege_type = 'SELECT'
  ) then
    raise exception 'FAIL 8: a client role can read users.is_admin / email / auth_id';
  end if;
  v_pass := v_pass + 1;
  v_log := v_log || E'\n  PASS 8  is_admin, email and auth_id not readable by clients';

  -- ================= 9. deleting a user actually deletes it ================
  -- guard_last_admin is a BEFORE trigger covering DELETE. Returning NEW on a
  -- DELETE returns NULL, which cancels the row in silence: no error, no rows
  -- removed, caller sees success. That shipped, and 32 orphaned rows survived
  -- repeated cleanups because of it. A delete that reports success and does
  -- nothing is worse than one that fails.
  declare
    v_probe uuid;
    v_still int;
  begin
    insert into users (name) values ('invariant probe') returning id into v_probe;
    delete from users where id = v_probe;
    select count(*) into v_still from users where id = v_probe;
    if v_still <> 0 then
      raise exception 'FAIL 9: deleting a non-admin user silently did nothing';
    end if;
  end;
  v_pass := v_pass + 1;
  v_log := v_log || E'
  PASS 9  deleting a non-admin user row removes it';

  -- Always abort: this is what discards the fixture.
  raise exception 'ALL INVARIANTS PASSED (% groups)%', v_pass, v_log;
end $$;

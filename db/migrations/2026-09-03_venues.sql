-- ============================================================================
-- BOOK'D — Courts: venues, courts, tournaments and the reservation money path.
--
-- Replaces the hardcoded `venues` array in expo-app/src/state/courtsData.ts.
-- The client currently prices a reservation entirely in memory (store.ts
-- `rsvpTotal`: price/h x hours + a hardcoded $6/h for gear) and then pushes the
-- resulting number into `courtReservations`. That is exactly the shape the
-- audit closed for coach bookings in hardening.sql section 13: a client-supplied
-- total means a $40/h court can be booked for $0.
--
-- So this migration follows the same rules hardening.sql already applies to
-- bookings and orders:
--   * no insert/update/delete grants on the money tables;
--   * one SECURITY DEFINER RPC per money path, deriving every cent from the
--     venue's own rows and the platform margin;
--   * row filters for who may READ, column grants for what may be READ.
--
-- Idempotent: safe to re-run. Run AFTER hardening.sql.
-- ============================================================================
begin;

-- btree_gist lets an exclusion constraint mix an equality test on a uuid with
-- an overlap test on a range, which is what "one court, one time window" needs.
create extension if not exists "btree_gist";

-- ----------------------------------------------------------------------------
-- 0. Types. No `create type if not exists`, so guard on the catalogue.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'venue_status') then
    create type venue_status as enum ('open', 'closed');
  end if;
  if not exists (select 1 from pg_type where typname = 'court_booking_kind') then
    -- Mirrors RSVP_TYPES in expo-app/src/overlays/RsvpSheet.tsx
    -- ('Single' | 'Teams' | 'Member of team'); the RPC normalises the labels.
    create type court_booking_kind as enum ('single', 'teams', 'member_of_team');
  end if;
end $$;

-- Reservation status deliberately reuses `booking_status` from schema.sql
-- rather than minting a parallel enum: a court reservation moves through the
-- same lifecycle as a coach booking, and the admin screens already read it.

-- ----------------------------------------------------------------------------
-- 1. venues
-- ----------------------------------------------------------------------------
create table if not exists venues (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique,                    -- matches the ids the app already uses
  name          text not null,
  code          text,                            -- avatar initials, as on communities/shops
  tint          text,                            -- hex
  city          text not null default 'Beirut',
  -- Free text rather than a sports(id) FK on purpose: `sports` is the coaching /
  -- partner-matching catalogue and gates on an admin approvals queue. A venue
  -- listing must not be blocked because "Paddle" has not been approved yet.
  sport         text not null,
  location      geography(point, 4326),
  status        venue_status not null default 'open',
  -- Opening hours are stored twice: `open_days` is the string the cards render
  -- ("Mon to Sat"), `open_weekdays` is the machine-readable form the reservation
  -- RPC can actually enforce. 0 = Mon .. 6 = Sun, the same convention as
  -- coach_availability.weekday.
  open_days     text not null default 'Mon to Sun',
  open_weekdays smallint[] not null default '{0,1,2,3,4,5,6}'::smallint[],
  opens_at      time not null default '09:00',
  closes_at     time not null default '22:00',
  -- Needed to turn a timestamptz into the venue's own wall clock before the
  -- opening-hours check. Without it "11:00 am" is meaningless.
  timezone      text not null default 'Asia/Beirut',
  image_url     text,                            -- list thumbnail
  cover_image_url text,                          -- venue profile cover
  -- Equipment hire rate lives with the venue, never in the client. NULL means
  -- "this venue does not hire equipment" and the RPC refuses the request rather
  -- than quietly charging zero. The app's hardcoded $6/h (GEAR_PER_HOUR in
  -- RsvpSheet.tsx) becomes this column.
  equipment_cents_per_hour int check (equipment_cents_per_hour >= 0),
  owner_id      uuid references users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists venues_location_gist on venues using gist (location);
create index if not exists venues_city_idx on venues (city);

-- ----------------------------------------------------------------------------
-- 2. courts
-- ----------------------------------------------------------------------------
create table if not exists courts (
  id            uuid primary key default gen_random_uuid(),
  venue_id      uuid not null references venues(id) on delete cascade,
  name          text not null,
  capacity      int not null default 2 check (capacity between 1 and 64),  -- "4 Players"
  price_cents_per_hour int not null check (price_cents_per_hour >= 0),
  image_url     text,
  -- Per-court override of the venue rate (a show court may include rackets).
  -- NULL = fall back to venues.equipment_cents_per_hour.
  equipment_cents_per_hour int check (equipment_cents_per_hour >= 0),
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (venue_id, name)
);
create index if not exists courts_venue_idx on courts (venue_id);

-- ----------------------------------------------------------------------------
-- 3. venue_events — tournaments. price_cents is a FLAT per-team entry fee, not
--    an hourly rate; the column name is deliberately different from
--    courts.price_cents_per_hour so the two can never be swapped by accident.
-- ----------------------------------------------------------------------------
create table if not exists venue_events (
  id          uuid primary key default gen_random_uuid(),
  venue_id    uuid not null references venues(id) on delete cascade,
  name        text not null,
  starts_on   date not null,
  ends_on     date not null,
  price_cents int not null check (price_cents >= 0),
  image_url   text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (venue_id, name),
  check (ends_on >= starts_on)
);
create index if not exists venue_events_venue_idx on venue_events (venue_id, starts_on);

-- ----------------------------------------------------------------------------
-- 4. court_reservations — the money path.
--    Every price column here is a SNAPSHOT written by reserve_court(), so a
--    later price change on the court cannot rewrite history. Same reasoning as
--    bookings.commission_cents and order_items.price_cents.
-- ----------------------------------------------------------------------------
create table if not exists court_reservations (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references users(id) on delete cascade,
  court_id     uuid not null references courts(id) on delete restrict,
  starts_at    timestamptz not null,
  hours        int not null check (hours between 1 and 12),
  -- Derived by the RPC. It is not a generated column because timestamptz +
  -- interval is only STABLE (it depends on the session time zone), and stored
  -- generated columns require an IMMUTABLE expression.
  ends_at      timestamptz not null,
  -- ...but tstzrange() IS immutable, so the range the exclusion constraint
  -- indexes can be generated and therefore can never drift from starts_at/ends_at.
  -- '[)' so a 10:00-11:00 booking and an 11:00-12:00 booking do not collide.
  slot         tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  booking_kind court_booking_kind not null default 'single',
  equipment_rented boolean not null default false,
  price_cents_per_hour     int not null check (price_cents_per_hour >= 0),  -- charged rate
  equipment_cents_per_hour int not null default 0 check (equipment_cents_per_hour >= 0),
  total_cents      int not null check (total_cents >= 0),        -- what was actually charged
  commission_cents int not null default 0 check (commission_cents >= 0),
  status       booking_status not null default 'confirmed',
  created_at   timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists court_reservations_client_idx on court_reservations (client_id);
create index if not exists court_reservations_court_idx on court_reservations (court_id, starts_at);

-- Double-booking guard.
--
-- A unique index on (court_id, starts_at) -- the trick hardening.sql uses for
-- coach slots -- is not enough here: courts are booked for a variable number of
-- hours, so two reservations can collide without sharing a start time (10:00 for
-- 3h vs 12:00 for 1h). An EXCLUDE ... USING gist constraint is the only guard
-- that is correct under concurrency; checking for overlaps with a SELECT inside
-- the RPC would still let two simultaneous transactions both see a free court.
-- Partial, so a cancelled or no-show reservation frees the slot again.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'court_reservations_no_overlap') then
    alter table court_reservations
      add constraint court_reservations_no_overlap
      exclude using gist (court_id with =, slot with &&)
      where (status in ('pending', 'confirmed'));
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 5. venue_event_entries — a team's entry into a tournament. Flat fee, so there
--    is no hours/rate pair to snapshot, only the total that was charged.
-- ----------------------------------------------------------------------------
create table if not exists venue_event_entries (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references users(id) on delete cascade,
  venue_event_id uuid not null references venue_events(id) on delete restrict,
  total_cents      int not null check (total_cents >= 0),
  commission_cents int not null default 0 check (commission_cents >= 0),
  status         booking_status not null default 'confirmed',
  created_at     timestamptz not null default now()
);
create index if not exists venue_event_entries_client_idx on venue_event_entries (client_id);
create index if not exists venue_event_entries_event_idx on venue_event_entries (venue_event_id);

-- One live entry per team per tournament; cancelling releases the seat.
create unique index if not exists venue_event_entries_live_unique
  on venue_event_entries (venue_event_id, client_id)
  where status in ('pending', 'confirmed');

-- ----------------------------------------------------------------------------
-- 6. Predicate helpers.
--    SECURITY DEFINER for the same reason as is_shop_manager(): the column
--    grants below hide venues.owner_id from clients, and a policy that reads a
--    hidden column through an ordinary function would be brittle. search_path
--    is pinned on every one of them (hardening.sql section 11).
-- ----------------------------------------------------------------------------
create or replace function is_venue_owner(p_venue uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from venues v where v.id = p_venue and v.owner_id = current_app_user());
$$;

create or replace function is_court_host(p_court uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from courts c join venues v on v.id = c.venue_id
    where c.id = p_court and v.owner_id = current_app_user()
  );
$$;

create or replace function is_venue_event_host(p_event uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from venue_events e join venues v on v.id = e.venue_id
    where e.id = p_event and v.owner_id = current_app_user()
  );
$$;

-- Is the requested window inside the venue's advertised opening hours?
-- Evaluated in the venue's own time zone, and handles the wrap-around case
-- ("11:00 am - 12:00 am" stores closes_at = 00:00, which is the NEXT midnight).
create or replace function venue_slot_is_open(p_venue uuid, p_starts_at timestamptz, p_hours int)
returns boolean
language plpgsql stable security definer set search_path = public as $$
declare v venues%rowtype; v_local timestamp; v_day int; v_open timestamp; v_close timestamp;
begin
  select * into v from venues where id = p_venue;
  if not found then return false; end if;

  v_local := p_starts_at at time zone v.timezone;
  v_day   := extract(isodow from v_local)::int - 1;      -- 0 = Mon .. 6 = Sun
  if not (v_day = any (v.open_weekdays)) then return false; end if;

  v_open  := date_trunc('day', v_local) + v.opens_at;
  v_close := date_trunc('day', v_local) + v.closes_at;
  if v.closes_at <= v.opens_at then
    v_close := v_close + interval '1 day';               -- closes at or after midnight
  end if;

  return v_local >= v_open and v_local + make_interval(hours => p_hours) <= v_close;
end $$;

-- ----------------------------------------------------------------------------
-- 7. Grants.
--
--    Supabase's default privileges hand `anon` and `authenticated` full DML on
--    every NEW table in public. hardening.sql's blanket revoke only covered the
--    tables that existed when it ran, so these five have to be revoked here or
--    the deny-by-default posture silently does not apply to them.
-- ----------------------------------------------------------------------------
revoke insert, update, delete on venues, courts, venue_events,
  court_reservations, venue_event_entries from authenticated, anon;

-- venues carries owner_id, which ties a real platform user to a business, and
-- is the same class of data as users.email / users.location. Treat it the same
-- way hardening.sql section 1 treats users: keep the ROWS public so the Courts
-- list keeps rendering, but drop the sensitive COLUMN from the grant. Ownership
-- is answered by is_venue_owner() instead of by reading the column.
revoke select on venues from anon, authenticated;
grant select (
  id, slug, name, code, tint, city, sport, location, status,
  open_days, open_weekdays, opens_at, closes_at, timezone,
  image_url, cover_image_url, equipment_cents_per_hour, created_at
) on venues to anon, authenticated;

-- courts / venue_events are a public price list. Nothing here is sensitive, so
-- a table-level grant is honest; the RPCs, not the reader, guard the money.
grant select on courts, venue_events to anon, authenticated;

-- Reservations are never public. Cutting `anon` off at the grant is belt and
-- braces on top of RLS, which would already deny it (current_app_user() is null
-- for a signed-out caller). No column split for `authenticated`: unlike users,
-- every column here is either the client's own record or their host's, and the
-- row filter below is the right tool for that.
revoke select on court_reservations, venue_event_entries from anon;
grant select on court_reservations, venue_event_entries to authenticated;

-- Venue owners run their own listing. Column-scoped so owner_id can never be
-- reassigned and so nothing outside this list becomes client-writable later.
grant update (
  name, code, tint, city, sport, location, status,
  open_days, open_weekdays, opens_at, closes_at, timezone,
  image_url, cover_image_url, equipment_cents_per_hour
) on venues to authenticated;
grant insert, update, delete on courts to authenticated;
grant insert, update, delete on venue_events to authenticated;

-- Deliberately NO insert on venues: a venue is created by an admin after a
-- registration request is approved (the app's openRegistration('venue') flow),
-- exactly like shops. Self-serve venue creation would let anyone mint a
-- payable listing.

-- Status is the only client-writable column on the money tables: a client
-- cancels, a host progresses. Money columns stay RPC-only.
grant update (status) on court_reservations to authenticated;
grant update (status) on venue_event_entries to authenticated;

-- ----------------------------------------------------------------------------
-- 8. RLS. policies.sql enables RLS by looping over pg_tables, but that ran long
--    before these tables existed, so enable it explicitly here. A table without
--    RLS in this schema is world-writable by any authenticated caller.
-- ----------------------------------------------------------------------------
alter table venues enable row level security;
alter table courts enable row level security;
alter table venue_events enable row level security;
alter table court_reservations enable row level security;
alter table venue_event_entries enable row level security;

-- Discovery is public (mirrors shop_read / prod_read). Inactive courts and
-- past tournaments are still visible so a reservation history renders; it is
-- the RPCs that refuse to CHARGE for them.
drop policy if exists venue_read on venues;
create policy venue_read on venues for select using (true);

drop policy if exists court_read on courts;
create policy court_read on courts for select using (true);

drop policy if exists venue_event_read on venue_events;
create policy venue_event_read on venue_events for select using (true);

drop policy if exists venue_owner_update on venues;
create policy venue_owner_update on venues for update
  using (is_venue_owner(id)) with check (is_venue_owner(id));

drop policy if exists court_owner_manage on courts;
create policy court_owner_manage on courts for all
  using (is_venue_owner(venue_id)) with check (is_venue_owner(venue_id));

drop policy if exists venue_event_owner_manage on venue_events;
create policy venue_event_owner_manage on venue_events for all
  using (is_venue_owner(venue_id)) with check (is_venue_owner(venue_id));

-- A client sees their own reservations; the venue owner sees everything booked
-- at their venue. Nobody else, including other venues' owners.
drop policy if exists court_resv_read on court_reservations;
create policy court_resv_read on court_reservations for select
  using (client_id = current_app_user() or is_court_host(court_id));

drop policy if exists event_entry_read on venue_event_entries;
create policy event_entry_read on venue_event_entries for select
  using (client_id = current_app_user() or is_venue_event_host(venue_event_id));

-- There is no INSERT policy on either money table, and no INSERT grant. The
-- SECURITY DEFINER RPCs in section 9 are the only write path, which is what
-- keeps totals server-derived (hardening.sql section 6).

drop policy if exists court_resv_client_cancel on court_reservations;
create policy court_resv_client_cancel on court_reservations for update
  using (client_id = current_app_user()) with check (client_id = current_app_user());

drop policy if exists court_resv_host_status on court_reservations;
create policy court_resv_host_status on court_reservations for update
  using (is_court_host(court_id)) with check (is_court_host(court_id));

drop policy if exists event_entry_client_cancel on venue_event_entries;
create policy event_entry_client_cancel on venue_event_entries for update
  using (client_id = current_app_user()) with check (client_id = current_app_user());

drop policy if exists event_entry_host_status on venue_event_entries;
create policy event_entry_host_status on venue_event_entries for update
  using (is_venue_event_host(venue_event_id)) with check (is_venue_event_host(venue_event_id));

-- The UPDATE grant is column-scoped to `status`, but a mis-grant later must not
-- be enough to rewrite a price, and a client must not be able to mark their own
-- reservation 'completed'. Same shape as guard_booking_status_transition().
create or replace function guard_court_reservation_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_actor uuid;
begin
  if current_setting('role', true) = 'service_role' then return new; end if;

  if new.total_cents is distinct from old.total_cents
     or new.commission_cents is distinct from old.commission_cents
     or new.price_cents_per_hour is distinct from old.price_cents_per_hour
     or new.equipment_cents_per_hour is distinct from old.equipment_cents_per_hour
     or new.equipment_rented is distinct from old.equipment_rented
     or new.hours is distinct from old.hours
     or new.starts_at is distinct from old.starts_at
     or new.ends_at is distinct from old.ends_at
     or new.court_id is distinct from old.court_id
     or new.client_id is distinct from old.client_id then
    raise exception 'reservation price and slot are set at booking time';
  end if;

  if new.status = old.status then return new; end if;

  v_actor := current_app_user();
  if v_actor = new.client_id then
    if new.status <> 'cancelled' or old.status not in ('pending', 'confirmed') then
      raise exception 'clients may only cancel pending or confirmed reservations';
    end if;
  elsif is_court_host(new.court_id) then
    if new.status not in ('confirmed', 'completed', 'no_show', 'cancelled') then
      raise exception 'unsupported venue reservation status transition';
    end if;
  else
    raise exception 'not authorized to update this reservation';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_court_reservation_write on court_reservations;
create trigger trg_guard_court_reservation_write
  before update on court_reservations
  for each row execute function guard_court_reservation_write();

create or replace function guard_event_entry_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_actor uuid;
begin
  if current_setting('role', true) = 'service_role' then return new; end if;

  if new.total_cents is distinct from old.total_cents
     or new.commission_cents is distinct from old.commission_cents
     or new.venue_event_id is distinct from old.venue_event_id
     or new.client_id is distinct from old.client_id then
    raise exception 'entry fee is set at entry time';
  end if;

  if new.status = old.status then return new; end if;

  v_actor := current_app_user();
  if v_actor = new.client_id then
    if new.status <> 'cancelled' or old.status not in ('pending', 'confirmed') then
      raise exception 'clients may only cancel pending or confirmed entries';
    end if;
  elsif is_venue_event_host(new.venue_event_id) then
    if new.status not in ('confirmed', 'completed', 'no_show', 'cancelled') then
      raise exception 'unsupported tournament entry status transition';
    end if;
  else
    raise exception 'not authorized to update this entry';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_event_entry_write on venue_event_entries;
create trigger trg_guard_event_entry_write
  before update on venue_event_entries
  for each row execute function guard_event_entry_write();

-- Defence in depth on the listing itself: ownership and the slug are not
-- self-writable even if a future grant widens by accident (mirrors
-- guard_shop_status).
create or replace function guard_venue_ownership() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if current_setting('role', true) = 'service_role' then return new; end if;
  if new.owner_id is distinct from old.owner_id
     or new.slug is distinct from old.slug then
    if not is_platform_admin() then
      raise exception 'venue ownership and slug are platform-managed';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_venue_ownership on venues;
create trigger trg_guard_venue_ownership
  before update on venues
  for each row execute function guard_venue_ownership();

-- ============================================================================
-- 9. The money paths.
--
--    Both RPCs take ids and intent only. No amount crosses the wire, so
--    store.ts's `rsvpTotal()` becomes a display estimate and the DB stays the
--    single source of truth for what is charged -- the same correction
--    hardening.sql section 13 made to create_booking_for_coach.
--
--    Platform commission: read from platform_margins, key = 'session'.
--    `margin_key` is an enum ('session','shop','boost') with no court member,
--    and ALTER TYPE ... ADD VALUE cannot be used by the same transaction that
--    inserts the row, so a dedicated 'court' key needs its own migration.
--    Court hire bills on the session margin until then; the fallback of 12
--    matches create_booking_for_coach.
-- ============================================================================
create or replace function reserve_court(
  p_court uuid,
  p_starts_at timestamptz,
  p_hours int default 1,
  p_booking_kind text default 'Single',
  p_equipment boolean default false
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_user uuid := require_app_user();
        v_venue uuid; v_venue_status venue_status; v_active boolean;
        v_rate int; v_gear int; v_kind court_booking_kind;
        v_total int; v_pct numeric; v_id uuid; v_ends timestamptz;
begin
  if p_hours is null or p_hours < 1 or p_hours > 12 then
    raise exception 'a court is booked for 1 to 12 hours';
  end if;

  -- 'Single' | 'Teams' | 'Member of team' come straight off the RSVP sheet.
  v_kind := (case lower(trim(coalesce(p_booking_kind, 'Single')))
               when 'single'         then 'single'
               when 'teams'          then 'teams'
               when 'member of team' then 'member_of_team'
               when 'member_of_team' then 'member_of_team'
             end)::court_booking_kind;
  if v_kind is null then
    raise exception 'unknown booking type: %', p_booking_kind;
  end if;

  -- Never trust the caller for the past: a back-dated reservation would both
  -- dodge the overlap guard and fabricate revenue.
  if p_starts_at is null or p_starts_at < now() then
    raise exception 'cannot reserve a court in the past';
  end if;

  select c.venue_id, c.active, c.price_cents_per_hour,
         coalesce(c.equipment_cents_per_hour, v.equipment_cents_per_hour), v.status
    into v_venue, v_active, v_rate, v_gear, v_venue_status
    from courts c join venues v on v.id = c.venue_id
   where c.id = p_court;

  if v_venue is null then raise exception 'court not found'; end if;
  if not v_active then raise exception 'this court is not bookable'; end if;
  if v_venue_status <> 'open' then raise exception 'this venue is closed'; end if;

  if not venue_slot_is_open(v_venue, p_starts_at, p_hours) then
    raise exception 'the venue is not open for that time window';
  end if;

  -- Gear rate comes from the court, else the venue. NULL means the venue does
  -- not hire equipment at all -- refuse rather than hand it over for free.
  if p_equipment and v_gear is null then
    raise exception 'this venue does not hire equipment';
  end if;

  v_total := v_rate * p_hours
           + case when p_equipment then coalesce(v_gear, 0) * p_hours else 0 end;

  select pct into v_pct from platform_margins where key = 'session';
  v_ends := p_starts_at + make_interval(hours => p_hours);

  begin
    insert into court_reservations (
      client_id, court_id, starts_at, hours, ends_at, booking_kind,
      equipment_rented, price_cents_per_hour, equipment_cents_per_hour,
      total_cents, commission_cents, status
    ) values (
      v_user, p_court, p_starts_at, p_hours, v_ends, v_kind,
      p_equipment, v_rate, case when p_equipment then coalesce(v_gear, 0) else 0 end,
      v_total, round(v_total * coalesce(v_pct, 12) / 100.0), 'confirmed'
    ) returning id into v_id;
  exception when exclusion_violation then
    -- Raised by court_reservations_no_overlap. Turning it into a plain message
    -- keeps the DB error text out of the app.
    raise exception 'that court is already reserved for this time';
  end;

  return v_id;
end $$;

revoke all on function reserve_court(uuid, timestamptz, int, text, boolean) from public;
grant execute on function reserve_court(uuid, timestamptz, int, text, boolean) to authenticated;

create or replace function enter_venue_event(p_event uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_user uuid := require_app_user();
        v_active boolean; v_venue_status venue_status;
        v_ends date; v_total int; v_pct numeric; v_id uuid;
begin
  -- Flat per-team entry fee, read from the tournament row. There is no hours
  -- multiplier and no equipment line here -- that is what separates
  -- venue_events.price_cents from courts.price_cents_per_hour.
  select e.active, e.price_cents, e.ends_on, v.status
    into v_active, v_total, v_ends, v_venue_status
    from venue_events e join venues v on v.id = e.venue_id
   where e.id = p_event;

  if v_total is null then raise exception 'tournament not found'; end if;
  if not v_active then raise exception 'entries are closed for this tournament'; end if;
  if v_venue_status <> 'open' then raise exception 'this venue is closed'; end if;
  if v_ends < current_date then raise exception 'this tournament has already finished'; end if;

  select pct into v_pct from platform_margins where key = 'session';

  begin
    insert into venue_event_entries (client_id, venue_event_id, total_cents, commission_cents, status)
    values (v_user, p_event, v_total, round(v_total * coalesce(v_pct, 12) / 100.0), 'confirmed')
    returning id into v_id;
  exception when unique_violation then
    -- venue_event_entries_live_unique
    raise exception 'you have already entered this tournament';
  end;

  return v_id;
end $$;

revoke all on function enter_venue_event(uuid) from public;
grant execute on function enter_venue_event(uuid) to authenticated;

-- The predicate functions are re-created above with search_path already pinned;
-- restate it so a future `create or replace` that forgets the clause is caught
-- here rather than in production (hardening.sql section 11).
alter function is_venue_owner(uuid) set search_path = public;
alter function is_court_host(uuid) set search_path = public;
alter function is_venue_event_host(uuid) set search_path = public;
alter function venue_slot_is_open(uuid, timestamptz, int) set search_path = public;

-- ============================================================================
-- 10. Seed — the three venues the app currently hardcodes in
--     expo-app/src/state/courtsData.ts. Slugs match the client's ids so the
--     screens can be repointed at the DB without re-keying anything.
--
--     Coordinates are the real Beirut / Tyre / Jounieh city points; the
--     prototype's identical "1.6 km" captions were placeholders, and distance
--     is now derived at query time with ST_Distance(users.location,
--     venues.location) like the coach and shop cards already do.
--
--     image_url stays NULL: the prototype held caption strings ("court A
--     photo"), not URLs, and inventing image URLs would be worse than an empty
--     tile. owner_id stays NULL until the venue accounts are created.
-- ============================================================================
insert into venues (
  slug, name, code, tint, city, sport, location, status,
  open_days, open_weekdays, opens_at, closes_at, equipment_cents_per_hour
) values
  ('lgp', 'Let''s Go Paddle', 'LGP', '#2A3A2E', 'Beirut, Lebanon', 'Paddle',
   st_setsrid(st_makepoint(35.5018, 33.8938), 4326)::geography, 'open',
   'Mon to Sat', '{0,1,2,3,4,5}'::smallint[], '11:00', '00:00', 600),
  ('gp1', 'Go Paddle', 'GP', '#2A333A', 'Tyre, Lebanon', 'Paddle',
   st_setsrid(st_makepoint(35.2038, 33.2705), 4326)::geography, 'open',
   'Mon to Sun', '{0,1,2,3,4,5,6}'::smallint[], '09:00', '23:00', 600),
  -- Basketball: no rackets to hire, so equipment_cents_per_hour is NULL and
  -- reserve_court() refuses an equipment request instead of charging $0.
  ('iy', 'Iron Yard Courts', 'IY', '#3A2E2A', 'Jounieh, Lebanon', 'Basketball',
   st_setsrid(st_makepoint(35.6178, 33.9808), 4326)::geography, 'closed',
   'Mon to Sat', '{0,1,2,3,4,5}'::smallint[], '07:00', '22:00', null)
on conflict (slug) do nothing;

insert into courts (venue_id, name, capacity, price_cents_per_hour)
select v.id, x.name, x.capacity, x.price_cents
  from venues v
  join (values
    ('lgp', 'PADDLE COURT A', 4, 4000),   -- $40/h
    ('lgp', 'PADDLE COURT B', 2, 2000),   -- $20/h
    ('gp1', 'CENTER COURT',   4, 3600),   -- $36/h
    ('iy',  'HALF COURT 1',   6, 2800)    -- $28/h
  ) as x(slug, name, capacity, price_cents) on x.slug = v.slug
on conflict (venue_id, name) do nothing;

-- The prototype captions the tournaments "21 Aug - 25 Aug" with no year. Seeded
-- against the next August so the dates are still enterable; enter_venue_event()
-- refuses anything already finished.
insert into venue_events (venue_id, name, starts_on, ends_on, price_cents)
select v.id, x.name, x.starts_on, x.ends_on, x.price_cents
  from venues v
  join (values
    ('lgp', 'PADDLE ADULT TOURNAMENT',  date '2027-08-21', date '2027-08-25', 4000),  -- $40/TEAM flat
    ('lgp', 'PADDLE JUNIOR TOURNAMENT', date '2027-08-18', date '2027-08-20', 4000)
  ) as x(slug, name, starts_on, ends_on, price_cents) on x.slug = v.slug
on conflict (venue_id, name) do nothing;

commit;

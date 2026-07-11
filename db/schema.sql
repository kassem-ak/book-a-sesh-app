-- ============================================================================
-- Spotter — PostgreSQL schema
-- Trainer & partner finder + communities + partner shop marketplace + admin.
-- Target: Postgres 15+ (Supabase-compatible). All money in integer cents.
-- Conventions: snake_case, uuid PKs, timestamptz, soft-delete via deleted_at
-- where useful, updated_at maintained by trigger (see bottom).
-- ============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "citext";        -- case-insensitive email/phone text
create extension if not exists "postgis";        -- geography(Point) for distance

-- ============================================================================
-- ENUMS
-- ============================================================================
create type platform_role   as enum ('user', 'coach', 'admin');
create type community_role   as enum ('owner', 'admin', 'moderator', 'member');
create type shop_role        as enum ('owner', 'manager');            -- shop staff
create type sport_kind       as enum ('sport', 'hobby');
create type event_type       as enum ('meetup', 'event');
create type suggestion_status as enum ('pending', 'approved', 'dismissed');
create type request_status   as enum ('pending', 'approved', 'rejected');
create type booking_status   as enum ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
create type appt_kind        as enum ('new_booking', 'change_request');
create type appt_status      as enum ('pending', 'approved', 'declined');
create type sub_status       as enum ('active', 'overdue', 'cancelled');
create type cal_provider     as enum ('google', 'apple', 'outlook');
create type cert_status      as enum ('pending', 'verified', 'rejected');
create type recurrence       as enum ('one_time', 'weekly', 'monthly', 'yearly');
create type coupon_kind      as enum ('percent', 'amount');
create type promo_audience   as enum ('all', 'new', 'inactive_30d');
create type order_status     as enum ('cart', 'placed', 'paid', 'fulfilled', 'cancelled');
create type margin_key       as enum ('session', 'shop', 'boost');
create type proposal_type    as enum ('margins', 'shares', 'margins_shares');
create type proposal_status  as enum ('pending', 'applied', 'withdrawn');
create type report_status    as enum ('open', 'decided');
create type report_decision  as enum ('ban', 'suspend', 'dismiss');
create type flag_verdict     as enum ('reinstated', 'suspended');
create type account_status   as enum ('active', 'paused', 'banned', 'suspended');
create type notif_type       as enum ('platform_update', 'daily_plan', 'booking', 'partner_nearby', 'system');

-- ============================================================================
-- IDENTITY
-- ============================================================================
create table users (
  id             uuid primary key default gen_random_uuid(),
  email          citext unique,
  phone          text unique,
  name           text not null,
  initials       text generated always as (upper(left(name,1))) stored, -- app derives 2 chars; keep 1 here
  avatar_url     text,
  city           text default 'Beirut',
  location       geography(point, 4326),
  platform_role  platform_role not null default 'user',   -- highest capability the account holds
  is_admin       boolean not null default false,          -- hardcoded 3-admin console access
  account_state  account_status not null default 'active',
  suspended_until timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index on users using gist (location);

create table user_goals (
  user_id uuid references users(id) on delete cascade,
  goal    text not null,
  primary key (user_id, goal)
);

-- Per-user notification / reachability preferences (Profile screen).
create table notification_prefs (
  user_id             uuid primary key references users(id) on delete cascade,
  push_enabled        boolean not null default true,
  daily_plan_enabled  boolean not null default true,
  calendar_sync       boolean not null default false,
  cal_provider        cal_provider default 'google',
  active_from         time,
  active_to           time,
  reachable_coaches   boolean not null default true,
  reachable_partners  boolean not null default true
);

-- OAuth calendar tokens (Google/Apple/Outlook) — tokens encrypted at rest.
create table calendar_integrations (
  user_id       uuid references users(id) on delete cascade,
  provider      cal_provider not null,
  access_token  text,
  refresh_token text,
  expires_at    timestamptz,
  primary key (user_id, provider)
);

-- ============================================================================
-- SPORTS / HOBBIES  (+ user requests that feed the admin Approvals queue)
-- ============================================================================
create table sports (
  id       uuid primary key default gen_random_uuid(),
  name     text not null unique,
  kind     sport_kind not null default 'sport',
  approved boolean not null default true
);

create table sport_requests (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  kind         sport_kind not null default 'sport',
  requested_by uuid references users(id) on delete set null,
  votes        int not null default 1,
  status       request_status not null default 'pending',
  reviewed_by  uuid references users(id),
  created_at   timestamptz not null default now()
);

-- ============================================================================
-- COACHES & TRAINING PARTNERS (discovery)
-- ============================================================================
create table coach_profiles (
  user_id         uuid primary key references users(id) on delete cascade,
  headline        text,           -- "Elite coach"
  bio             text,
  sport_id        uuid references sports(id),
  level           text,
  price_cents     int not null default 0,     -- per session
  reply_time      text,           -- "~1h" (display); real impl = derived metric
  sessions_count  int not null default 0,
  rating_avg      numeric(2,1) not null default 0,   -- cached from reviews
  reviews_count   int not null default 0,
  boosted         boolean not null default false,
  verified        boolean not null default false,
  subscription_status sub_status not null default 'active',
  sub_period_end  date,
  created_at      timestamptz not null default now()
);

create table partner_profiles (
  user_id     uuid primary key references users(id) on delete cascade,
  sport_id    uuid references sports(id),
  level       text,            -- Beginner/Intermediate/Advanced
  goal        text,            -- "5k under 22min"
  bio         text,
  looking_for text
);

-- Free-text tags/specialties on either profile.
create table profile_tags (
  user_id uuid references users(id) on delete cascade,
  tag     text not null,
  primary key (user_id, tag)
);

-- Coach qualifications (Profile → Qualifications).
create table certifications (
  id       uuid primary key default gen_random_uuid(),
  coach_id uuid not null references users(id) on delete cascade,
  name     text not null,
  issuer   text,
  year     text,
  status   cert_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- Reviews written about a coach/partner by a trained client.
create table reviews (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid not null references users(id) on delete cascade,  -- reviewed
  author_id   uuid not null references users(id) on delete cascade,  -- reviewer
  stars       int  not null check (stars between 1 and 5),
  body        text,
  created_at  timestamptz not null default now(),
  unique (subject_id, author_id)
);

-- Paid discovery boost (BOOSTED featured cards; boost fee feeds accounting).
create table boosts (
  id        uuid primary key default gen_random_uuid(),
  coach_id  uuid not null references users(id) on delete cascade,
  starts_at timestamptz not null default now(),
  ends_at   timestamptz not null,
  fee_cents int not null
);

-- ============================================================================
-- COACH TOOLS
-- ============================================================================
create table packages (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references users(id) on delete cascade,
  sessions    int  not null check (sessions >= 1),
  price_cents int  not null check (price_cents >= 0),
  active      boolean not null default true
);

-- Weekly bookable slots (schedule editor). weekday 0=Mon..6=Sun.
create table coach_availability (
  coach_id uuid references users(id) on delete cascade,
  weekday  int  check (weekday between 0 and 6),
  slot     text not null,           -- "6:30 AM"
  primary key (coach_id, weekday, slot)
);

create table coach_promos (
  id       uuid primary key default gen_random_uuid(),
  coach_id uuid not null references users(id) on delete cascade,
  code     text not null,
  pct      int  not null check (pct between 1 and 100),
  active   boolean not null default true,
  created_at timestamptz not null default now(),
  unique (coach_id, code)
);

-- Booking + change-request approvals shown in coach's "Appointment requests".
create table appointment_requests (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references users(id) on delete cascade,
  client_id   uuid not null references users(id) on delete cascade,
  kind        appt_kind not null,
  requested   text,        -- "Single session · Thu 09 · 6:30 PM"
  note        text,
  status      appt_status not null default 'pending',
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- BOOKINGS
-- ============================================================================
create table bookings (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references users(id) on delete cascade,
  coach_id       uuid not null references users(id) on delete cascade,
  package_id     uuid references packages(id),
  scheduled_for  timestamptz not null,
  slot_label     text,
  status         booking_status not null default 'pending',
  total_cents    int not null default 0,
  commission_cents int,               -- snapshot of platform cut at booking time
  calendar_event_id text,             -- id in the synced provider calendar
  created_at     timestamptz not null default now()
);
create index on bookings (client_id);
create index on bookings (coach_id);

-- Remaining sessions in a purchased pack (Bookings → Packages progress).
create table client_package_balances (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references users(id) on delete cascade,
  coach_id    uuid not null references users(id) on delete cascade,
  package_id  uuid references packages(id),
  label       text,
  used        int not null default 0,
  total       int not null,
  expires_on  date
);

-- ============================================================================
-- COMMUNITIES  (roles: owner / admin / moderator / member)
-- ============================================================================
create table communities (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  code          text not null,               -- avatar initials
  tint          text,                         -- hex
  about         text,
  official      boolean not null default false,   -- granted by platform admins
  created_by    uuid references users(id) on delete set null,  -- becomes owner
  members_count int not null default 1,
  created_at    timestamptz not null default now()
);

-- Membership + role. The creator gets 'owner'; owners/admins assign the rest.
-- owner/admin/moderator may edit community content & create events;
-- member may only submit event suggestions.
create table community_members (
  community_id uuid references communities(id) on delete cascade,
  user_id      uuid references users(id) on delete cascade,
  role         community_role not null default 'member',
  assigned_by  uuid references users(id),
  joined_at    timestamptz not null default now(),
  primary key (community_id, user_id)
);
create index on community_members (user_id);

-- helper: is this user allowed to manage the community?
create or replace function can_manage_community(p_user uuid, p_comm uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from community_members m
    where m.community_id = p_comm and m.user_id = p_user
      and m.role in ('owner','admin','moderator')
  );
$$;

create table subgroups (
  id            uuid primary key default gen_random_uuid(),
  community_id  uuid not null references communities(id) on delete cascade,
  name          text not null,
  area          text,
  members_count int not null default 0
);

create table subgroup_members (
  subgroup_id uuid references subgroups(id) on delete cascade,
  user_id     uuid references users(id) on delete cascade,
  primary key (subgroup_id, user_id)
);

create table events (
  id            uuid primary key default gen_random_uuid(),
  community_id  uuid not null references communities(id) on delete cascade,
  subgroup_id   uuid references subgroups(id) on delete set null,
  type          event_type not null default 'meetup',
  title         text not null,
  starts_at     timestamptz,
  when_label    text,             -- display "Sat 05 · 7:00 AM"
  location      text,
  host_id       uuid references users(id) on delete set null,
  created_by    uuid references users(id),   -- must be a manager of community_id
  attendees_count int not null default 0,
  created_at    timestamptz not null default now()
);
create index on events (community_id);

create table event_attendees (
  event_id uuid references events(id) on delete cascade,
  user_id  uuid references users(id) on delete cascade,
  primary key (event_id, user_id)
);

-- Members submit these; managers approve (→ events) or dismiss.
create table event_suggestions (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  title        text not null,
  when_label   text,
  proposed_by  uuid references users(id) on delete set null,
  status       suggestion_status not null default 'pending',
  reviewed_by  uuid references users(id),
  event_id     uuid references events(id),   -- set when approved
  created_at   timestamptz not null default now()
);

-- Official-status applications for a community → admin Approvals queue.
create table community_official_requests (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  status       request_status not null default 'pending',
  reviewed_by  uuid references users(id),
  created_at   timestamptz not null default now()
);

-- ============================================================================
-- SHOP MARKETPLACE  (owner manages info, items, sales, prices, links, coupons)
-- ============================================================================
create table shops (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid references users(id) on delete set null,
  slug          text unique,
  name          text not null,
  initials      text,
  tint          text,
  category      text,
  about         text,
  deal_text     text,                 -- "10% off in-app"
  website_url   text,
  location      geography(point, 4326),
  rating_avg    numeric(2,1) not null default 0,
  reviews_count int not null default 0,
  is_partner    boolean not null default false,
  status        request_status not null default 'pending',  -- pending→active on approval
  created_at    timestamptz not null default now()
);
create index on shops using gist (location);

-- Extra staff the owner can add to help manage (mirrors community roles).
create table shop_members (
  shop_id uuid references shops(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role    shop_role not null default 'manager',
  primary key (shop_id, user_id)
);

-- "Be a Shop" registration → admin Approvals (with contact preferences).
create table shop_registration_requests (
  id           uuid primary key default gen_random_uuid(),
  shop_name    text not null,
  category     text,
  category_other text,
  phone        text,
  email        text,
  contact_pref text,          -- Phone call / WhatsApp / Email / In-app chat
  best_time    text,
  submitted_by uuid references users(id) on delete set null,
  status       request_status not null default 'pending',
  reviewed_by  uuid references users(id),
  shop_id      uuid references shops(id),   -- set when approved
  created_at   timestamptz not null default now()
);

-- Catalog. Owner uploads items, flags featured, sets position + price + link.
create table products (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references shops(id) on delete cascade,
  name        text not null,
  price_cents int not null check (price_cents >= 0),
  image_url   text,
  link_url    text,               -- external product link
  is_featured boolean not null default false,
  position    int not null default 0,   -- display order
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index on products (shop_id, position);

-- Time-boxed price drops / sales on a product or the whole shop.
create table shop_sales (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null references shops(id) on delete cascade,
  product_id   uuid references products(id) on delete cascade, -- null = storewide
  discount_pct int check (discount_pct between 1 and 100),
  starts_at    timestamptz not null default now(),
  ends_at      timestamptz,
  active       boolean not null default true
);

-- Coupons / discount codes created by the shop owner.
create table shop_coupons (
  id            uuid primary key default gen_random_uuid(),
  shop_id       uuid not null references shops(id) on delete cascade,
  code          text not null,
  kind          coupon_kind not null,         -- percent | amount
  value         int not null,                 -- pct (1-100) or cents
  min_order_cents int not null default 0,
  audience      promo_audience not null default 'all',
  max_uses      int,
  used_count    int not null default 0,
  starts_at     timestamptz not null default now(),
  ends_at       timestamptz,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (shop_id, code)
);

create table shop_reviews (
  id        uuid primary key default gen_random_uuid(),
  shop_id   uuid not null references shops(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  stars     int not null check (stars between 1 and 5),
  body      text,
  created_at timestamptz not null default now(),
  unique (shop_id, author_id)
);

-- Cart / order (in-app checkout with the shop's deal applied).
create table orders (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users(id) on delete cascade,
  shop_id        uuid not null references shops(id) on delete cascade,
  coupon_id      uuid references shop_coupons(id),
  status         order_status not null default 'cart',
  subtotal_cents int not null default 0,
  discount_cents int not null default 0,
  total_cents    int not null default 0,
  commission_cents int,                 -- platform shop-sale cut snapshot
  created_at     timestamptz not null default now()
);

create table order_items (
  order_id    uuid references orders(id) on delete cascade,
  product_id  uuid references products(id),
  qty         int not null default 1,
  price_cents int not null,             -- price at add time
  primary key (order_id, product_id)
);

-- ============================================================================
-- CHAT
-- ============================================================================
create table conversations (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table conversation_participants (
  conversation_id uuid references conversations(id) on delete cascade,
  user_id         uuid references users(id) on delete cascade,
  last_read_at    timestamptz,
  primary key (conversation_id, user_id)
);

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references users(id) on delete cascade,
  body            text not null,
  created_at      timestamptz not null default now()
);
create index on messages (conversation_id, created_at);

-- ============================================================================
-- NOTIFICATIONS + ADS
-- ============================================================================
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  type       notif_type not null default 'system',
  title      text not null,
  body       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, created_at desc);

create table ads (
  id        uuid primary key default gen_random_uuid(),
  placement text not null,          -- 'discover' | 'community'
  brand     text not null,
  logo      text,
  tint      text,
  headline  text,
  body      text,
  cta       text,
  targeting jsonb,                  -- interest/goal targeting for "Why this ad?"
  active    boolean not null default true
);

-- ============================================================================
-- PLATFORM PROMOTIONS & LOYALTY (admin)
-- ============================================================================
create table platform_promos (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  pct        int not null check (pct between 1 and 100),
  audience   promo_audience not null default 'all',
  created_by uuid references users(id),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table loyalty_rewards (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  point_cost int not null check (point_cost >= 0)
);

create table loyalty_accounts (
  user_id uuid primary key references users(id) on delete cascade,
  balance int not null default 0
);

create table loyalty_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  delta      int not null,          -- + earned, - redeemed
  reason     text,
  reward_id  uuid references loyalty_rewards(id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- ACCOUNTING  (admin-only; 3-admin approval for margin/share changes)
-- ============================================================================
-- Current live platform margins (one row per key).
create table platform_margins (
  key margin_key primary key,
  pct numeric(5,2) not null check (pct between 0 and 100)
);

-- Current admin profit-share split (must total 100%).
create table admin_shares (
  admin_id uuid primary key references users(id) on delete cascade,
  pct      numeric(5,2) not null check (pct between 0 and 100)
);

-- Monthly recurring/one-time expenses.
create table expenses (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  amount_cents int not null,
  recurrence  recurrence not null default 'monthly',
  created_by  uuid references users(id),
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- A proposed change to margins and/or shares. Applies on the 3rd approval.
create table accounting_proposals (
  id         uuid primary key default gen_random_uuid(),
  type       proposal_type not null,
  diff       jsonb not null,        -- [{key, from, to}, ...] for the History card
  payload    jsonb not null,        -- the full target margins/shares to apply
  status     proposal_status not null default 'pending',
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  applied_at timestamptz
);

-- One row per distinct admin approval. 3 distinct rows ⇒ auto-apply.
create table proposal_approvals (
  proposal_id uuid references accounting_proposals(id) on delete cascade,
  admin_id    uuid references users(id) on delete cascade,
  approved_at timestamptz not null default now(),
  primary key (proposal_id, admin_id)   -- enforces distinct approvers
);

-- Append-only audit log powering the History page.
create table accounting_history (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,          -- "Margins updated"
  detail     text,                   -- "Coach session commission: 12% → 10%"
  meta       text,                   -- "Approved by 3 admins · users notified"
  actor_id   uuid references users(id),
  created_at timestamptz not null default now()
);

create table payouts (
  id           uuid primary key default gen_random_uuid(),
  admin_id     uuid references users(id),
  amount_cents int not null,
  period       date not null,        -- month
  distributed_at timestamptz not null default now()
);

-- ============================================================================
-- MODERATION / SAFETY
-- ============================================================================
create table reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references users(id) on delete set null,
  subject_id  uuid not null references users(id) on delete cascade,
  reason      text not null,
  summary     text,
  status      report_status not null default 'open',
  decision    report_decision,
  decided_by  uuid references users(id),
  created_at  timestamptz not null default now()
);

-- Evidence auto-attached to a case (chat messages, bookings, events).
create table report_evidence (
  id        uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  kind      text not null,           -- 'chat' | 'booking' | 'event'
  ref_id    uuid,
  snapshot  jsonb                     -- frozen copy for the review UI
);

-- Auto-flagged content (sexual-content filter) awaiting a safety decision.
create table safety_flags (
  id           uuid primary key default gen_random_uuid(),
  subject_type text not null,        -- 'user' | 'community'
  subject_id   uuid not null,
  source       text,                 -- "Community name", "Chat message"
  content      text,
  auto         boolean not null default true,
  verdict      flag_verdict,
  decided_by   uuid references users(id),
  created_at   timestamptz not null default now()
);

-- ============================================================================
-- updated_at trigger
-- ============================================================================
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_users_updated
  before update on users
  for each row execute function set_updated_at();

-- ============================================================================
-- NOTES
-- * Row-Level Security (Supabase): enable RLS on every table; policies key off
--   auth.uid(). Examples:
--     - community content writable only when can_manage_community(auth.uid(), community_id);
--     - event_suggestions insertable by any community member, readable by managers;
--     - products/shop_coupons/shop_sales writable only by shops.owner_id or shop_members(manager);
--     - accounting_* readable/writable only where users.is_admin.
-- * 3-admin rule: a DB trigger on proposal_approvals can, on the 3rd distinct
--   row, copy payload → platform_margins/admin_shares, set status='applied',
--   write accounting_history, and fan out notifications when margins changed.
-- * Distances (coach/shop "600 m away") computed at query time:
--     ST_Distance(users.location, shops.location).
-- ============================================================================

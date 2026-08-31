-- ============================================================================
-- Spotter / BOOK'D — security hardening (beta gate)
-- Run AFTER policies.sql. Idempotent: safe to re-run.
--
-- Root causes this closes:
--   1. `USING`-only policies silently reused as WITH CHECK on writes.
--   2. Row-level checks standing in for COLUMN-level ones (privilege columns
--      like is_admin / role / verified / status were client-writable).
--   3. Direct table DML bypassing the SECURITY DEFINER RPCs that enforce the
--      real business rules (commission math, 3-admin approval).
-- ============================================================================
begin;

-- ----------------------------------------------------------------------------
-- 0. Deny-by-default writes, then re-grant only what clients legitimately need.
-- ----------------------------------------------------------------------------
revoke insert, update, delete on all tables in schema public from authenticated, anon;

-- Policies and SECURITY DEFINER routines rely on these helpers after column
-- grants hide privileged columns like users.auth_id and users.is_admin.
create or replace function current_app_user() returns uuid
language sql stable security definer set search_path = public as $$
  select id from users where auth_id = auth.uid();
$$;

create or replace function is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from users where auth_id = auth.uid()), false);
$$;

create or replace function can_manage_community(p_user uuid, p_comm uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from community_members m
    where m.community_id = p_comm and m.user_id = p_user
      and m.role in ('owner','admin','moderator')
  );
$$;

create or replace function is_community_owner(p_user uuid, p_comm uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from community_members m
    where m.community_id = p_comm and m.user_id = p_user and m.role = 'owner'
  );
$$;

create or replace function is_shop_manager(p_shop uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from shops s where s.id = p_shop and s.owner_id = current_app_user())
      or exists (select 1 from shop_members m where m.shop_id = p_shop and m.user_id = current_app_user());
$$;

-- ----------------------------------------------------------------------------
-- 1. users — stop self-promotion to admin and ban evasion (C1, H1)
-- ----------------------------------------------------------------------------
grant update (name, avatar_url, city, location, phone) on users to authenticated;

drop policy if exists users_update on users;
create policy users_update on users for update
  using (auth_id = auth.uid())
  with check (auth_id = auth.uid());

-- Defence in depth: even a mis-grant cannot flip privilege columns.
create or replace function guard_user_privileges() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if current_setting('role', true) = 'service_role' then return new; end if;
  if new.is_admin is distinct from old.is_admin
     or new.platform_role is distinct from old.platform_role
     or new.account_state is distinct from old.account_state
     or new.suspended_until is distinct from old.suspended_until
     or new.auth_id is distinct from old.auth_id then
    raise exception 'privileged user columns are not self-writable';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_user_privileges on users;
create trigger trg_guard_user_privileges
  before update on users
  for each row execute function guard_user_privileges();

-- Personal data (email, phone, GPS) is no longer world-readable. Rows stay
-- visible so existing joins (coach names, event hosts) keep working, but the
-- sensitive COLUMNS are removed from the grant instead.
revoke select on users from anon, authenticated;
grant select (id, name, avatar_url, city, platform_role, created_at) on users to anon, authenticated;
-- users_read policy is left as-is (row visibility); column grants do the work.

-- ----------------------------------------------------------------------------
-- 2. community_members — stop self-appointed owners (C2)
-- ----------------------------------------------------------------------------
grant insert, delete on community_members to authenticated;
grant update on community_members to authenticated;

drop policy if exists member_join on community_members;
create policy member_join on community_members for insert
  with check (
    -- joining yourself: role is forced to 'member'
    (user_id = current_app_user() and role = 'member')
    -- managers can add non-owner roles; only owners can mint later owners
    or (role <> 'owner' and can_manage_community(current_app_user(), community_id))
    or (role = 'owner' and is_community_owner(current_app_user(), community_id))
  );

drop policy if exists member_manage on community_members;
create policy member_manage on community_members for update
  using (can_manage_community(current_app_user(), community_id))
  with check (can_manage_community(current_app_user(), community_id));

-- A community must never be left ownerless, and only an owner may mint owners.
create or replace function guard_community_roles() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_actor community_role;
begin
  -- BEFORE DELETE fires with new = NULL; returning NULL would cancel the
  -- delete, so always hand back a non-null row.
  if current_setting('role', true) = 'service_role' then return coalesce(new, old); end if;

  select role into v_actor from community_members
    where community_id = coalesce(new.community_id, old.community_id)
      and user_id = current_app_user();

  if tg_op = 'INSERT' and new.role = 'owner'
     and exists (select 1 from community_members where community_id = new.community_id)
     and coalesce(v_actor, 'member') <> 'owner' then
    raise exception 'only an owner can grant ownership';
  end if;

  if tg_op = 'UPDATE' and new.role = 'owner' and old.role <> 'owner'
     and coalesce(v_actor, 'member') <> 'owner' then
    raise exception 'only an owner can grant ownership';
  end if;

  if (tg_op = 'DELETE' and old.role = 'owner')
     or (tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner') then
    -- allow cascade when the community itself is going away
    if exists (select 1 from communities where id = old.community_id)
       and (select count(*) from community_members
        where community_id = old.community_id and role = 'owner') <= 1 then
      raise exception 'community must keep at least one owner';
    end if;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_guard_community_roles on community_members;
create trigger trg_guard_community_roles
  before insert or update or delete on community_members
  for each row execute function guard_community_roles();

-- ----------------------------------------------------------------------------
-- 3. communities — official status is admin-granted, not self-granted (H6)
-- ----------------------------------------------------------------------------
grant update (about, tint, code) on communities to authenticated;
grant insert on communities to authenticated;

drop policy if exists comm_manage on communities;
create policy comm_manage on communities for update
  using (can_manage_community(current_app_user(), id))
  with check (can_manage_community(current_app_user(), id));

create or replace function guard_community_official() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_actor uuid;
begin
  if current_setting('role', true) = 'service_role' then return new; end if;

  if tg_op = 'INSERT' then
    v_actor := current_app_user();
    if v_actor is null then raise exception 'signed-in app user required'; end if;
    new.created_by := v_actor;
    new.members_count := 1;
    if not is_platform_admin() then new.official := false; end if;
    return new;
  end if;

  if new.official is distinct from old.official
     or new.created_by is distinct from old.created_by
     or new.members_count is distinct from old.members_count then
    if not is_platform_admin() then
      raise exception 'official status, creator and member counts are platform-managed';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_community_official on communities;
create trigger trg_guard_community_official
  before insert or update on communities
  for each row execute function guard_community_official();

-- ----------------------------------------------------------------------------
-- 4. coach_profiles / certifications — no self-verification (H3)
-- ----------------------------------------------------------------------------
grant update (headline, bio, sport_id, level, price_cents, reply_time) on coach_profiles to authenticated;
grant insert (user_id, headline, bio, sport_id, level, price_cents, reply_time) on coach_profiles to authenticated;
grant insert, delete on certifications to authenticated;

drop policy if exists coach_self on coach_profiles;
drop policy if exists coach_self_write on coach_profiles;
create policy coach_self_write on coach_profiles for update
  using (user_id = current_app_user()) with check (user_id = current_app_user());
drop policy if exists coach_self_insert on coach_profiles;
create policy coach_self_insert on coach_profiles for insert
  with check (user_id = current_app_user());

create or replace function guard_coach_profile_privileges() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if current_setting('role', true) = 'service_role' then return new; end if;

  if tg_op = 'INSERT' then
    if not is_platform_admin() then
      new.user_id := current_app_user();
      new.sessions_count := 0;
      new.rating_avg := 0;
      new.reviews_count := 0;
      new.boosted := false;
      new.verified := false;
      new.subscription_status := 'active';
      new.sub_period_end := null;
    end if;
    return new;
  end if;

  if not is_platform_admin()
     and (new.sessions_count is distinct from old.sessions_count
       or new.rating_avg is distinct from old.rating_avg
       or new.reviews_count is distinct from old.reviews_count
       or new.boosted is distinct from old.boosted
       or new.verified is distinct from old.verified
       or new.subscription_status is distinct from old.subscription_status
       or new.sub_period_end is distinct from old.sub_period_end) then
    raise exception 'coach verification, ratings and subscription fields are platform-managed';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_coach_profile_privileges on coach_profiles;
create trigger trg_guard_coach_profile_privileges
  before insert or update on coach_profiles
  for each row execute function guard_coach_profile_privileges();

drop policy if exists certs_self on certifications;
drop policy if exists certs_self_insert on certifications;
create policy certs_self_insert on certifications for insert
  with check (coach_id = current_app_user() and status = 'pending');
drop policy if exists certs_self_delete on certifications;
create policy certs_self_delete on certifications for delete
  using (coach_id = current_app_user());

-- ----------------------------------------------------------------------------
-- 5. shops — owner-only, and partner status stays admin-granted (H5)
-- ----------------------------------------------------------------------------
grant update (name, about, category, deal_text, website_url, initials, tint, location) on shops to authenticated;
grant insert, update, delete on products to authenticated;
grant insert, update, delete on shop_sales to authenticated;
grant insert, update, delete on shop_coupons to authenticated;
grant insert, update, delete on shop_members to authenticated;

drop policy if exists shop_owner on shops;
create policy shop_owner on shops for update
  using (is_shop_manager(id)) with check (is_shop_manager(id));

create or replace function guard_shop_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if current_setting('role', true) = 'service_role' then return new; end if;
  if new.status is distinct from old.status
     or new.is_partner is distinct from old.is_partner
     or new.owner_id is distinct from old.owner_id
     or new.rating_avg is distinct from old.rating_avg
     or new.reviews_count is distinct from old.reviews_count then
    if not is_platform_admin() then
      raise exception 'shop status, ownership and ratings are not self-writable';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_shop_status on shops;
create trigger trg_guard_shop_status
  before update on shops
  for each row execute function guard_shop_status();

-- shop_members: only the true owner manages staff (is_shop_manager is too broad)
drop policy if exists shopmem_owner on shop_members;
create policy shopmem_owner on shop_members for all
  using (exists (select 1 from shops s where s.id = shop_id and s.owner_id = current_app_user()))
  with check (exists (select 1 from shops s where s.id = shop_id and s.owner_id = current_app_user()));

-- ----------------------------------------------------------------------------
-- 6. Money: orders / bookings are RPC-only (H4)
--    No INSERT/UPDATE grant — checkout_shop_order and create_booking_for_coach
--    (SECURITY DEFINER) remain the only write paths, so totals and commission
--    are always server-computed.
-- ----------------------------------------------------------------------------
drop policy if exists order_self on orders;
drop policy if exists order_self_read on orders;
create policy order_self_read on orders for select using (user_id = current_app_user());

drop policy if exists orderitem_self on order_items;
drop policy if exists orderitem_self_read on order_items;
create policy orderitem_self_read on order_items for select
  using (exists (select 1 from orders o where o.id = order_id and o.user_id = current_app_user()));

drop policy if exists book_party on bookings;
drop policy if exists book_party_read on bookings;
create policy book_party_read on bookings for select
  using (client_id = current_app_user() or coach_id = current_app_user());

-- Coaches need to progress a booking's status; clients may only cancel their own.
grant update (status) on bookings to authenticated;
drop policy if exists book_coach_status on bookings;
drop policy if exists book_client_cancel on bookings;
create policy book_coach_status on bookings for update
  using (coach_id = current_app_user())
  with check (coach_id = current_app_user());
create policy book_client_cancel on bookings for update
  using (client_id = current_app_user())
  with check (client_id = current_app_user());

create or replace function guard_booking_status_transition() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_actor uuid;
begin
  if current_setting('role', true) = 'service_role' then return new; end if;
  if new.status = old.status then return new; end if;

  v_actor := current_app_user();
  if v_actor = new.client_id then
    if new.status <> 'cancelled' or old.status not in ('pending','confirmed') then
      raise exception 'clients may only cancel pending or confirmed bookings';
    end if;
  elsif v_actor = new.coach_id then
    if new.status not in ('confirmed','completed','no_show','cancelled') then
      raise exception 'unsupported coach booking status transition';
    end if;
  else
    raise exception 'not authorized to update booking status';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_booking_status_transition on bookings;
create trigger trg_guard_booking_status_transition
  before update on bookings
  for each row execute function guard_booking_status_transition();

-- ----------------------------------------------------------------------------
-- 7. Accounting: 3-admin approval becomes real (C3)
--    Direct DML is revoked above; approvals go through an RPC that asserts
--    admin identity, and the apply trigger re-verifies approvers itself.
-- ----------------------------------------------------------------------------
drop policy if exists margins_adm on platform_margins;
drop policy if exists margins_read_all on platform_margins;
create policy margins_read_all on platform_margins for select using (true);

drop policy if exists shares_adm on admin_shares;
drop policy if exists shares_adm_read on admin_shares;
create policy shares_adm_read on admin_shares for select using (is_platform_admin());

drop policy if exists prop_adm on accounting_proposals;
drop policy if exists prop_adm_read on accounting_proposals;
drop policy if exists prop_adm_insert on accounting_proposals;
create policy prop_adm_read on accounting_proposals for select using (is_platform_admin());
create policy prop_adm_insert on accounting_proposals for insert
  with check (is_platform_admin() and created_by = current_app_user() and status = 'pending');

drop policy if exists appr_adm on proposal_approvals;
drop policy if exists appr_adm_read on proposal_approvals;
create policy appr_adm_read on proposal_approvals for select using (is_platform_admin());

create or replace function approve_accounting_proposal(p_proposal uuid)
returns int language plpgsql security definer set search_path = public as $$
declare v_admin uuid; v_count int;
begin
  if not is_platform_admin() then raise exception 'admin only'; end if;
  v_admin := current_app_user();
  insert into proposal_approvals (proposal_id, admin_id)
  values (p_proposal, v_admin)
  on conflict (proposal_id, admin_id) do nothing;
  select count(distinct pa.admin_id) into v_count
    from proposal_approvals pa join users u on u.id = pa.admin_id
    where pa.proposal_id = p_proposal and u.is_admin;
  return v_count;
end $$;
grant execute on function approve_accounting_proposal(uuid) to authenticated;

-- Re-verify approvers inside the trigger rather than trusting RLS, and refuse
-- to apply a share split that does not total 100%.
create or replace function apply_proposal_if_ready() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_count int; v_type proposal_type; v_payload jsonb; v_diff jsonb;
        v_margins_changed boolean; v_total numeric; v_share_rows int; v_payload_rows int;
begin
  select count(distinct pa.admin_id) into v_count
    from proposal_approvals pa join users u on u.id = pa.admin_id
    where pa.proposal_id = new.proposal_id and u.is_admin;
  if v_count < 3 then return new; end if;

  select type, payload, diff into v_type, v_payload, v_diff
    from accounting_proposals where id = new.proposal_id and status = 'pending';
  if v_type is null then return new; end if;

  if v_type in ('shares','margins_shares') then
    select count(*) into v_share_rows from admin_shares;
    select count(*) into v_payload_rows
      from jsonb_object_keys(coalesce(v_payload->'shares', '{}'::jsonb));
    if v_payload_rows <> v_share_rows
       or exists (select 1 from admin_shares s where not (v_payload->'shares' ? s.admin_id::text)) then
      raise exception 'admin shares payload must include every current share row';
    end if;

    select sum((value)::numeric) into v_total
      from jsonb_each_text(v_payload->'shares');
    if abs(coalesce(v_total, 0) - 100) > 0.005 then
      raise exception 'admin shares must total 100%%, got %', v_total;
    end if;
  end if;

  if v_type in ('margins','margins_shares') then
    update platform_margins m set pct = (v_payload->'margins'->>m.key::text)::numeric
      where v_payload->'margins' ? m.key::text;
  end if;
  if v_type in ('shares','margins_shares') then
    update admin_shares s set pct = (v_payload->'shares'->>s.admin_id::text)::numeric
      where v_payload->'shares' ? s.admin_id::text;
  end if;

  v_margins_changed := v_type in ('margins','margins_shares');
  update accounting_proposals set status='applied', applied_at=now() where id=new.proposal_id;

  insert into accounting_history (title, detail, meta, actor_id)
  values (case when v_margins_changed then 'Margins updated' else 'Profit shares updated' end,
          (select string_agg(d->>'line', ' · ') from jsonb_array_elements(v_diff) d),
          'Approved by 3 admins' || case when v_margins_changed then ' · users notified' else ' · internal' end,
          new.admin_id);

  if v_margins_changed then
    insert into notifications (user_id, type, title, body)
    select id, 'platform_update', 'Platform fees updated',
           'Platform fees changed. Applies to all new transactions starting now.'
    from users where deleted_at is null;
  end if;
  return new;
end $$;

-- ----------------------------------------------------------------------------
-- 8. Conversations — no self-joining someone else's thread (H2)
-- ----------------------------------------------------------------------------
drop policy if exists convpart_self on conversation_participants;
drop policy if exists convpart_read on conversation_participants;
create policy convpart_read on conversation_participants for select
  using (exists (select 1 from conversation_participants me
                 where me.conversation_id = conversation_participants.conversation_id
                   and me.user_id = current_app_user()));
grant insert on messages to authenticated;
grant update (last_read_at) on conversation_participants to authenticated;
drop policy if exists convpart_touch on conversation_participants;
create policy convpart_touch on conversation_participants for update
  using (user_id = current_app_user()) with check (user_id = current_app_user());

-- ----------------------------------------------------------------------------
-- 9. Appointment requests — the coach decides, not the client (M1)
-- ----------------------------------------------------------------------------
grant insert on appointment_requests to authenticated;
grant update (status) on appointment_requests to authenticated;

drop policy if exists appt_party on appointment_requests;
drop policy if exists appt_read on appointment_requests;
create policy appt_read on appointment_requests for select
  using (coach_id = current_app_user() or client_id = current_app_user());
drop policy if exists appt_client_insert on appointment_requests;
create policy appt_client_insert on appointment_requests for insert
  with check (client_id = current_app_user() and status = 'pending');
drop policy if exists appt_coach_decide on appointment_requests;
create policy appt_coach_decide on appointment_requests for update
  using (coach_id = current_app_user()) with check (coach_id = current_app_user());

-- ----------------------------------------------------------------------------
-- 10. Remaining write grants for legitimately client-owned rows
-- ----------------------------------------------------------------------------
grant insert, update, delete on notification_prefs to authenticated;
grant insert, update, delete on user_goals to authenticated;
grant insert, update, delete on calendar_integrations to authenticated;
grant insert, update, delete on profile_tags to authenticated;
grant insert, update, delete on event_attendees to authenticated;
grant insert, update, delete on subgroup_members to authenticated;
grant insert, update on reviews to authenticated;
grant insert, update on shop_reviews to authenticated;
grant insert on reports to authenticated;
grant insert on sport_requests to authenticated;
grant insert on shop_registration_requests to authenticated;
grant insert, update, delete on packages to authenticated;
grant insert, update, delete on coach_availability to authenticated;
grant insert, update, delete on coach_promos to authenticated;
grant insert, update on event_suggestions to authenticated;
grant insert, update, delete on events to authenticated;
grant insert, update, delete on subgroups to authenticated;
grant update on notifications to authenticated;

-- Admin-managed tables: admins act through the app, so keep DML but the
-- policies already gate on is_platform_admin().
grant insert, update, delete on expenses to authenticated;
grant insert, update, delete on platform_promos to authenticated;
grant insert, update, delete on loyalty_rewards to authenticated;
grant insert, update on reports to authenticated;
grant insert, update on safety_flags to authenticated;
grant insert, update on community_official_requests to authenticated;
grant insert on accounting_proposals to authenticated;
grant update on shop_registration_requests to authenticated;

-- Registrations must be reviewable by admins (L1)
drop policy if exists shopreg_adm_update on shop_registration_requests;
create policy shopreg_adm_update on shop_registration_requests for update
  using (is_platform_admin()) with check (is_platform_admin());

-- ----------------------------------------------------------------------------
-- 11. Pin search_path on the predicate functions used by every policy (M2)
-- ----------------------------------------------------------------------------
alter function current_app_user() set search_path = public;
alter function is_platform_admin() set search_path = public;
alter function can_manage_community(uuid, uuid) set search_path = public;
alter function is_community_owner(uuid, uuid) set search_path = public;
alter function is_shop_manager(uuid) set search_path = public;

-- ----------------------------------------------------------------------------
-- 12. Demo bootstrap must not hand guests real community ownership (M3)
-- ----------------------------------------------------------------------------
create or replace function bootstrap_demo_session() returns uuid
language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  if auth.uid() is null then raise exception 'signed-in app user required'; end if;
  insert into users (auth_id, email, name, city)
  values (auth.uid(), nullif(auth.jwt()->>'email', '')::citext, 'Guest', 'Beirut')
  on conflict (auth_id) do update set city = coalesce(users.city, 'Beirut')
  returning id into v_user;
  insert into notification_prefs (user_id) values (v_user) on conflict do nothing;
  -- No community roles are granted to guests any more.
  return v_user;
end $$;

-- ============================================================================
-- 13. Booking integrity (audit findings M3, B1)
--     The old RPC trusted a client-supplied total, so a $200 coach could be
--     booked for 0. Derive the price server-side and block double-booking.
-- ============================================================================
drop function if exists create_booking_for_coach(uuid, timestamptz, text, int);

do $$
begin
  if exists (
    select 1 from bookings
    where status in ('pending', 'confirmed')
    group by coach_id, scheduled_for
    having count(*) > 1
  ) then
    raise exception 'duplicate active booking slots exist; dedupe before creating bookings_coach_slot_unique';
  end if;
end $$;

create unique index if not exists bookings_coach_slot_unique
  on bookings (coach_id, scheduled_for)
  where status in ('pending', 'confirmed');

do $$
begin
  if exists (
    select 1 from client_package_balances
    where package_id is not null
    group by client_id, coach_id, package_id
    having count(*) > 1
  ) then
    raise exception 'duplicate client package balances exist; dedupe before creating client_package_balances_client_coach_package_unique';
  end if;
end $$;

create unique index if not exists client_package_balances_client_coach_package_unique
  on client_package_balances (client_id, coach_id, package_id)
  where package_id is not null;

create or replace function create_booking_for_coach(
  p_coach uuid,
  p_scheduled_for timestamptz,
  p_slot_label text,
  p_package_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_user uuid := require_app_user();
        v_total int; v_pct numeric; v_id uuid;
begin
  if p_scheduled_for < now() - interval '1 day' then
    raise exception 'cannot book a slot in the past';
  end if;

  -- price comes from the package or the coach's rate, never from the client
  if p_package_id is not null then
    select price_cents into v_total from packages
      where id = p_package_id and coach_id = p_coach and active;
    if v_total is null then raise exception 'package not available for this coach'; end if;
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

  -- a package booking creates or advances the client's session balance.
  if p_package_id is not null then
    insert into client_package_balances (client_id, coach_id, package_id, label, used, total)
    select v_user, p_coach, p_package_id,
           (select sessions || '-session pack' from packages where id = p_package_id),
           1, (select sessions from packages where id = p_package_id)
    on conflict (client_id, coach_id, package_id) where package_id is not null
    do update set
      label = excluded.label,
      total = excluded.total,
      used = least(client_package_balances.used + 1, excluded.total);
  end if;

  return v_id;
end $$;
grant execute on function create_booking_for_coach(uuid, timestamptz, text, uuid) to authenticated;

commit;

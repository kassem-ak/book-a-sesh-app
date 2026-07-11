-- ============================================================================
-- Spotter — Supabase Auth integration + server-side RPCs
-- Run AFTER schema.sql (and before or after seed.sql — order-independent).
-- ============================================================================

-- Link public.users to Supabase auth.users.
alter table users add column if not exists auth_id uuid unique references auth.users(id) on delete cascade;

-- id of the current app user (public.users.id) for the signed-in auth user.
create or replace function current_app_user() returns uuid
language sql stable as $$
  select id from users where auth_id = auth.uid();
$$;

-- true if the signed-in user is a platform admin.
create or replace function is_platform_admin() returns boolean
language sql stable as $$
  select coalesce((select is_admin from users where auth_id = auth.uid()), false);
$$;

-- ============================================================================
-- RPC helpers for authenticated app writes.
-- ============================================================================

alter table event_suggestions add column if not exists type event_type not null default 'meetup';
alter table event_suggestions add column if not exists location text;

-- On auth signup, create a matching public.users profile. Anonymous users rely on
-- raw metadata; email signups fall back to the email prefix.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (auth_id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Guest User')
  )
  on conflict (auth_id) do update
    set email = coalesce(public.users.email, excluded.email),
        name = coalesce(nullif(public.users.name, ''), excluded.name);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function require_app_user() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v_user uuid;
begin
  select id into v_user from users where auth_id = auth.uid();
  if v_user is null then
    raise exception 'signed-in app user required';
  end if;
  return v_user;
end $$;

create or replace function bootstrap_demo_session() returns uuid
language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  if auth.uid() is null then
    raise exception 'signed-in app user required';
  end if;

  insert into users (auth_id, email, name, city)
  values (auth.uid(), nullif(auth.jwt()->>'email', '')::citext, 'Alex Morgan', 'Beirut')
  on conflict (auth_id) do update
    set name = 'Alex Morgan', city = coalesce(users.city, 'Beirut')
  returning id into v_user;

  insert into notification_prefs (user_id) values (v_user) on conflict do nothing;

  insert into community_members (community_id, user_id, role)
  select id, v_user, 'owner'::community_role from communities where slug = 'running'
  on conflict (community_id, user_id) do update set role = excluded.role;

  insert into community_members (community_id, user_id, role)
  select id, v_user, 'moderator'::community_role from communities where slug = 'strength'
  on conflict (community_id, user_id) do update set role = excluded.role;

  return v_user;
end $$;

create or replace function resolve_community(p_community text) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v_comm uuid;
begin
  select id into v_comm from communities where slug = p_community or id::text = p_community limit 1;
  if v_comm is null then raise exception 'community not found'; end if;
  return v_comm;
end $$;

create or replace function resolve_shop(p_shop text) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v_shop uuid;
begin
  select id into v_shop from shops where slug = p_shop or id::text = p_shop limit 1;
  if v_shop is null then raise exception 'shop not found'; end if;
  return v_shop;
end $$;

create or replace function create_community_with_owner(p_name text)
returns table(id uuid, slug text, name text, code text, tint text, about text, official boolean, members_count int)
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := require_app_user();
  v_base text;
  v_slug text;
  v_suffix int := 2;
  v_id uuid;
  v_code text;
begin
  if length(trim(coalesce(p_name, ''))) = 0 then raise exception 'community name required'; end if;
  v_base := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then v_base := 'community'; end if;
  v_slug := v_base;
  while exists (select 1 from communities c where c.slug = v_slug) loop
    v_slug := v_base || '-' || v_suffix;
    v_suffix := v_suffix + 1;
  end loop;
  v_code := upper(left(nullif(regexp_replace(trim(p_name), '[^A-Za-z0-9]', '', 'g'), ''), 2));
  if v_code is null then v_code := 'CM'; end if;

  insert into communities (slug, name, code, tint, about, official, created_by, members_count)
  values (v_slug, trim(p_name), v_code, '#2F3A2A', trim(p_name) || ' community started by Alex Morgan. Share plans, create events, and grow the crew.', false, v_user, 1)
  returning communities.id into v_id;

  insert into community_members (community_id, user_id, role)
  values (v_id, v_user, 'owner');

  return query select c.id, c.slug, c.name, c.code, c.tint, c.about, c.official, c.members_count from communities c where c.id = v_id;
end $$;

create or replace function update_community_about_by_slug(p_community text, p_about text)
returns table(id uuid, slug text, name text, code text, tint text, about text, official boolean, members_count int)
language plpgsql security definer set search_path = public as $$
declare v_user uuid := require_app_user(); v_comm uuid := resolve_community(p_community);
begin
  if not can_manage_community(v_user, v_comm) then raise exception 'not authorized to manage this community'; end if;
  update communities set about = p_about where communities.id = v_comm;
  return query select c.id, c.slug, c.name, c.code, c.tint, c.about, c.official, c.members_count from communities c where c.id = v_comm;
end $$;

create or replace function set_community_membership(p_community text, p_join boolean)
returns community_role language plpgsql security definer set search_path = public as $$
declare v_user uuid := require_app_user(); v_comm uuid := resolve_community(p_community); v_role community_role; v_rows int;
begin
  if p_join then
    insert into community_members (community_id, user_id, role) values (v_comm, v_user, 'member') on conflict do nothing;
    get diagnostics v_rows = row_count;
    if v_rows > 0 then update communities set members_count = members_count + 1 where id = v_comm; end if;
  else
    delete from community_members where community_id = v_comm and user_id = v_user;
    get diagnostics v_rows = row_count;
    if v_rows > 0 then update communities set members_count = greatest(0, members_count - 1) where id = v_comm; end if;
  end if;
  select role into v_role from community_members where community_id = v_comm and user_id = v_user;
  return coalesce(v_role, 'member');
end $$;

create or replace function set_event_attendance(p_event uuid, p_going boolean)
returns int language plpgsql security definer set search_path = public as $$
declare v_user uuid := require_app_user(); v_rows int; v_count int;
begin
  if p_going then
    insert into event_attendees (event_id, user_id) values (p_event, v_user) on conflict do nothing;
    get diagnostics v_rows = row_count;
    if v_rows > 0 then update events set attendees_count = attendees_count + 1 where id = p_event; end if;
  else
    delete from event_attendees where event_id = p_event and user_id = v_user;
    get diagnostics v_rows = row_count;
    if v_rows > 0 then update events set attendees_count = greatest(0, attendees_count - 1) where id = p_event; end if;
  end if;
  select attendees_count into v_count from events where id = p_event;
  return coalesce(v_count, 0);
end $$;

create or replace function create_event_for_community(p_community text, p_type text, p_title text, p_when_label text, p_location text default 'TBD')
returns table(id uuid, community_slug text, subgroup_id uuid, type event_type, title text, when_label text, location text, attendees_count int, host_name text)
language plpgsql security definer set search_path = public as $$
declare v_user uuid := require_app_user(); v_comm uuid := resolve_community(p_community); v_event uuid; v_type event_type;
begin
  if not can_manage_community(v_user, v_comm) then raise exception 'not authorized to manage this community'; end if;
  v_type := case when lower(coalesce(p_type, 'meetup')) = 'event' then 'event'::event_type else 'meetup'::event_type end;
  insert into events (community_id, type, title, when_label, location, host_id, created_by, attendees_count)
  values (v_comm, v_type, trim(p_title), p_when_label, coalesce(nullif(trim(p_location), ''), 'TBD'), v_user, v_user, 1)
  returning events.id into v_event;
  insert into event_attendees (event_id, user_id) values (v_event, v_user) on conflict do nothing;
  return query
    select e.id, c.slug, e.subgroup_id, e.type, e.title, e.when_label, e.location, e.attendees_count, u.name
    from events e join communities c on c.id = e.community_id left join users u on u.id = e.host_id
    where e.id = v_event;
end $$;

create or replace function submit_event_suggestion_for_community(p_community text, p_type text, p_title text, p_when_label text, p_location text default 'TBD')
returns table(id uuid, community_slug text, type event_type, title text, when_label text, location text, requested_by text, status suggestion_status)
language plpgsql security definer set search_path = public as $$
declare v_user uuid := require_app_user(); v_comm uuid := resolve_community(p_community); v_suggestion uuid; v_type event_type;
begin
  if not exists (select 1 from community_members where community_id = v_comm and user_id = v_user) then
    raise exception 'join this community before suggesting events';
  end if;
  v_type := case when lower(coalesce(p_type, 'meetup')) = 'event' then 'event'::event_type else 'meetup'::event_type end;
  insert into event_suggestions (community_id, type, title, when_label, location, proposed_by, status)
  values (v_comm, v_type, trim(p_title), p_when_label, coalesce(nullif(trim(p_location), ''), 'TBD'), v_user, 'pending')
  returning event_suggestions.id into v_suggestion;
  return query
    select s.id, c.slug, s.type, s.title, s.when_label, s.location, u.name, s.status
    from event_suggestions s join communities c on c.id = s.community_id left join users u on u.id = s.proposed_by
    where s.id = v_suggestion;
end $$;

-- Manager approves an event suggestion -> creates the event.
create or replace function approve_event_suggestion(p_suggestion uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_comm uuid; v_title text; v_when text; v_location text; v_type event_type; v_event uuid;
begin
  select community_id, title, when_label, location, type into v_comm, v_title, v_when, v_location, v_type
  from event_suggestions where id = p_suggestion and status = 'pending';
  if v_comm is null then raise exception 'suggestion not found or already handled'; end if;
  if not can_manage_community(current_app_user(), v_comm) then
    raise exception 'not authorized to manage this community';
  end if;

  insert into events (community_id, type, title, when_label, location, created_by, host_id, attendees_count)
  values (v_comm, coalesce(v_type, 'meetup'), v_title, v_when, coalesce(v_location, 'TBD'), current_app_user(), current_app_user(), 1)
  returning id into v_event;

  insert into event_attendees (event_id, user_id) values (v_event, current_app_user()) on conflict do nothing;

  update event_suggestions
    set status = 'approved', reviewed_by = current_app_user(), event_id = v_event
    where id = p_suggestion;
  return v_event;
end $$;

create or replace function submit_sport_request(p_name text, p_kind text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_user uuid := require_app_user(); v_id uuid; v_kind sport_kind;
begin
  if length(trim(coalesce(p_name, ''))) = 0 then raise exception 'request name required'; end if;
  v_kind := case when lower(coalesce(p_kind, 'sport')) = 'hobby' then 'hobby'::sport_kind else 'sport'::sport_kind end;
  insert into sport_requests (name, kind, requested_by)
  values (trim(p_name), v_kind, v_user)
  returning id into v_id;
  return v_id;
end $$;

create or replace function create_booking_for_coach(p_coach uuid, p_scheduled_for timestamptz, p_slot_label text, p_total_cents int)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_user uuid := require_app_user(); v_id uuid; v_commission int; v_pct numeric;
begin
  if not exists (select 1 from coach_profiles where user_id = p_coach) then raise exception 'coach not found'; end if;
  select pct into v_pct from platform_margins where key = 'session';
  v_commission := round(greatest(p_total_cents, 0) * coalesce(v_pct, 12) / 100.0);
  insert into bookings (client_id, coach_id, scheduled_for, slot_label, status, total_cents, commission_cents)
  values (v_user, p_coach, p_scheduled_for, p_slot_label, 'confirmed', greatest(p_total_cents, 0), v_commission)
  returning id into v_id;
  return v_id;
end $$;

create or replace function submit_shop_registration(p_shop_name text, p_category text, p_category_other text, p_phone text, p_email text, p_contact_pref text, p_best_time text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_user uuid := require_app_user(); v_id uuid;
begin
  if length(trim(coalesce(p_shop_name, ''))) = 0 then raise exception 'shop name required'; end if;
  insert into shop_registration_requests (shop_name, category, category_other, phone, email, contact_pref, best_time, submitted_by)
  values (trim(p_shop_name), p_category, p_category_other, p_phone, p_email, p_contact_pref, p_best_time, v_user)
  returning id into v_id;
  return v_id;
end $$;

create or replace function checkout_shop_order(p_shop text, p_items jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := require_app_user();
  v_shop uuid := resolve_shop(p_shop);
  v_order uuid;
  v_item jsonb;
  v_product uuid;
  v_qty int;
  v_price int;
  v_subtotal int := 0;
  v_commission int;
  v_pct numeric;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'cart is empty'; end if;
  insert into orders (user_id, shop_id, status) values (v_user, v_shop, 'placed') returning id into v_order;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_product := (v_item->>'product_id')::uuid;
    v_qty := greatest(coalesce((v_item->>'qty')::int, 1), 1);
    select price_cents into v_price from products where id = v_product and shop_id = v_shop and active;
    if v_price is null then raise exception 'product not available'; end if;
    insert into order_items (order_id, product_id, qty, price_cents) values (v_order, v_product, v_qty, v_price);
    v_subtotal := v_subtotal + (v_price * v_qty);
  end loop;

  select pct into v_pct from platform_margins where key = 'shop';
  v_commission := round(v_subtotal * coalesce(v_pct, 8) / 100.0);
  update orders set subtotal_cents = v_subtotal, total_cents = v_subtotal, commission_cents = v_commission where id = v_order;
  return v_order;
end $$;

grant execute on function bootstrap_demo_session() to anon, authenticated;
grant execute on function create_community_with_owner(text) to authenticated;
grant execute on function update_community_about_by_slug(text, text) to authenticated;
grant execute on function set_community_membership(text, boolean) to authenticated;
grant execute on function set_event_attendance(uuid, boolean) to authenticated;
grant execute on function create_event_for_community(text, text, text, text, text) to authenticated;
grant execute on function submit_event_suggestion_for_community(text, text, text, text, text) to authenticated;
grant execute on function approve_event_suggestion(uuid) to authenticated;
grant execute on function submit_sport_request(text, text) to authenticated;
grant execute on function create_booking_for_coach(uuid, timestamptz, text, int) to authenticated;
grant execute on function submit_shop_registration(text, text, text, text, text, text, text) to authenticated;
grant execute on function checkout_shop_order(text, jsonb) to authenticated;
-- ============================================================================
create or replace function apply_proposal_if_ready() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_count int; v_type proposal_type; v_payload jsonb; v_diff jsonb; v_margins_changed boolean;
begin
  select count(*) into v_count from proposal_approvals where proposal_id = new.proposal_id;
  if v_count < 3 then return new; end if;

  select type, payload, diff into v_type, v_payload, v_diff
  from accounting_proposals where id = new.proposal_id and status = 'pending';
  if v_type is null then return new; end if;

  -- apply margins
  if v_type in ('margins','margins_shares') then
    update platform_margins m set pct = (v_payload->'margins'->>m.key::text)::numeric
      where v_payload->'margins' ? m.key::text;
  end if;
  -- apply shares
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

  -- fan out platform-fee notification to all users when margins changed
  if v_margins_changed then
    insert into notifications (user_id, type, title, body)
    select id, 'platform_update', 'Platform fees updated',
           'Platform fees changed. Applies to all new transactions starting now.'
    from users where deleted_at is null;
  end if;
  return new;
end $$;

drop trigger if exists trg_apply_proposal on proposal_approvals;
create trigger trg_apply_proposal
  after insert on proposal_approvals
  for each row execute function apply_proposal_if_ready();

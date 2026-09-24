-- Who runs a community, who may join it, and what it is about.
--
-- Four things, in one migration because they are one idea:
--
--   1. A community is about a sport or a hobby, and says so.
--   2. It is open (anyone joins) or closed (an admin or moderator answers).
--   3. An admin and a moderator are no longer the same thing.
--   4. It has a face: a picture, and a small gallery.
--
-- The permission split is the part with teeth. `can_manage_community` returns
-- true for owner, admin AND moderator, and `community_members` UPDATE is gated
-- on it -- so today a moderator can set their own role to 'admin'. That is a
-- privilege-escalation bug, not a design, and the split below closes it.

-- ============================================================================
-- 1. What the community is about, and who may walk in
-- ============================================================================

do $$ begin
  create type community_privacy as enum ('open', 'closed');
exception when duplicate_object then null; end $$;

alter table communities
  add column if not exists privacy    community_privacy not null default 'open',
  -- Nullable: every community that exists predates this column and none of
  -- them can be guessed into a sport. The editor asks; nothing breaks until
  -- an admin answers.
  add column if not exists sport_id   uuid references sports(id) on delete set null,
  add column if not exists avatar_url text;

create index if not exists communities_sport_idx on communities (sport_id);

-- ============================================================================
-- 2. Admin is not moderator
-- ============================================================================
--
-- `can_manage_community` keeps its name and its meaning -- owner, admin or
-- moderator -- because a dozen policies and RPCs already read it as "may act
-- on this community's content", which is still true of a moderator. What it
-- must stop being is the check for "may change the community itself".

-- SECURITY DEFINER with a fixed search_path, matching private.can_manage_community
-- exactly. Not decoration: this function reads community_members and is used in
-- a policy ON community_members, so without the definer bit the policy would
-- re-enter itself. The search_path is pinned for the usual reason -- a
-- SECURITY DEFINER function that resolves names through the caller's path is
-- a privilege-escalation primitive.
create or replace function private.is_community_admin(p_user uuid, p_comm uuid)
returns boolean language sql stable security definer
set search_path to 'private', 'public', 'extensions' as $$
  select exists (
    select 1 from community_members m
    where m.community_id = p_comm and m.user_id = p_user
      and m.role in ('owner', 'admin')
  );
$$;

revoke all on function private.is_community_admin(uuid, uuid) from public;
grant execute on function private.is_community_admin(uuid, uuid) to authenticated, service_role;

comment on function private.is_community_admin(uuid, uuid) is
  'Owner or admin. The check for changing the community: its name, privacy, '
  'description, sport, picture, and who holds which role. A moderator is '
  'deliberately NOT included -- they police the room, they do not own it.';

-- The community itself: admins only. A moderator could rename a community and
-- change what it is about, which is not monitoring.
drop policy if exists comm_manage on communities;
create policy comm_manage on communities for update
  using (private.is_community_admin(private.current_app_user(), id))
  with check (private.is_community_admin(private.current_app_user(), id));

-- Roles: admins only. This is the escalation fix.
drop policy if exists member_manage on community_members;
create policy member_manage on community_members for update
  using (private.is_community_admin(private.current_app_user(), community_id))
  with check (private.is_community_admin(private.current_app_user(), community_id));

-- Subgroups are structure, not content, so they follow the community.
drop policy if exists sub_manage on subgroups;
create policy sub_manage on subgroups for all
  using (private.is_community_admin(private.current_app_user(), community_id))
  with check (private.is_community_admin(private.current_app_user(), community_id));

-- Kicking someone out IS moderation, so a moderator may do it. The existing
-- policy only let a person delete their own row.
drop policy if exists member_remove on community_members;
create policy member_remove on community_members for delete
  using (
    user_id = private.current_app_user()
    or private.can_manage_community(private.current_app_user(), community_id)
  );

-- No one may assign a role at or above their own, and the owner's row is not
-- anyone else's to touch. A policy cannot express "compared to the actor", so
-- this is a trigger.
create or replace function community_members_guard_role()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := private.current_app_user();
  v_actor_role community_role;
begin
  -- A SECURITY DEFINER RPC acting with no app user (a backfill, the seed) is
  -- left alone; the policies above are what gate ordinary traffic.
  if v_actor is null then return new; end if;

  select role into v_actor_role from community_members
  where community_id = new.community_id and user_id = v_actor;

  if tg_op = 'UPDATE' and old.role is distinct from new.role then
    if old.role = 'owner' or new.role = 'owner' then
      raise exception 'The owner of a community cannot be changed here.'
        using errcode = 'check_violation';
    end if;
    -- An admin may make admins and moderators. A moderator may make nobody:
    -- they never reach here, because member_manage already refused them.
    if v_actor_role is distinct from 'owner' and v_actor_role is distinct from 'admin' then
      raise exception 'Only an admin can change what someone is in this community.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists trg_community_members_guard_role on community_members;
create trigger trg_community_members_guard_role
  before update on community_members
  for each row execute function community_members_guard_role();

-- The creator is the owner. It was done in application code, which means a
-- community created any other way had no owner at all.
create or replace function communities_seed_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is not null then
    insert into community_members (community_id, user_id, role)
    values (new.id, new.created_by, 'owner')
    on conflict (community_id, user_id) do update set role = 'owner';
  end if;
  return new;
end $$;

drop trigger if exists trg_communities_seed_owner on communities;
create trigger trg_communities_seed_owner
  after insert on communities
  for each row execute function communities_seed_owner();

-- ============================================================================
-- 3. Asking to join a closed community
-- ============================================================================

create table if not exists community_join_requests (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  note         text,
  status       request_status not null default 'pending',
  decided_by   uuid references users(id) on delete set null,
  decided_at   timestamptz,
  created_at   timestamptz not null default now()
);

-- One open request per person per community. Partial, so a rejected request
-- does not stop them asking again after they have talked to somebody.
create unique index if not exists community_join_requests_one_open
  on community_join_requests (community_id, user_id)
  where status = 'pending';

create index if not exists community_join_requests_queue
  on community_join_requests (community_id, status);

alter table community_join_requests enable row level security;

drop policy if exists joinreq_read on community_join_requests;
create policy joinreq_read on community_join_requests for select
  using (
    user_id = private.current_app_user()
    or private.can_manage_community(private.current_app_user(), community_id)
  );

drop policy if exists joinreq_ask on community_join_requests;
create policy joinreq_ask on community_join_requests for insert
  with check (user_id = private.current_app_user());

-- A manager answers it; the asker may withdraw it, which is the same UPDATE.
drop policy if exists joinreq_answer on community_join_requests;
create policy joinreq_answer on community_join_requests for update
  using (
    user_id = private.current_app_user()
    or private.can_manage_community(private.current_app_user(), community_id)
  );

grant select, insert, update on community_join_requests to authenticated;

-- Joining, now that a community can say no.
--
-- Replaces the old set_community_membership, which let anyone into anything.
-- Returns the role they ended up with, or 'member' with a pending request --
-- the caller reads request_status to tell the two apart.
create or replace function request_community_membership(p_community text, p_note text default null)
returns table(role community_role, request_status text)
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := require_app_user();
  v_comm uuid := resolve_community(p_community);
  v_privacy community_privacy;
  v_role community_role;
  v_rows int;
begin
  select c.privacy into v_privacy from communities c where c.id = v_comm;

  -- Already in: nothing to ask for.
  select m.role into v_role from community_members m
  where m.community_id = v_comm and m.user_id = v_user;
  if v_role is not null then
    return query select v_role, 'joined'::text;
    return;
  end if;

  if v_privacy = 'open' then
    insert into community_members (community_id, user_id, role)
    values (v_comm, v_user, 'member') on conflict do nothing;
    get diagnostics v_rows = row_count;
    if v_rows > 0 then
      update communities set members_count = members_count + 1 where id = v_comm;
    end if;
    return query select 'member'::community_role, 'joined'::text;
    return;
  end if;

  -- Closed. Asking twice is not an error; it is the same ask.
  insert into community_join_requests (community_id, user_id, note)
  values (v_comm, v_user, nullif(btrim(coalesce(p_note, '')), ''))
  on conflict (community_id, user_id) where status = 'pending' do nothing;

  return query select 'member'::community_role, 'pending'::text;
end $$;

grant execute on function request_community_membership(text, text) to authenticated;

create or replace function decide_join_request(p_request uuid, p_approve boolean)
returns request_status
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := require_app_user();
  v_req community_join_requests;
  v_rows int;
begin
  select * into v_req from community_join_requests where id = p_request;
  if v_req.id is null then
    raise exception 'That request no longer exists.' using errcode = 'no_data_found';
  end if;
  if not private.can_manage_community(v_actor, v_req.community_id) then
    raise exception 'Only an admin or moderator can answer that.'
      using errcode = 'insufficient_privilege';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'That request has already been answered.'
      using errcode = 'check_violation';
  end if;

  update community_join_requests
     set status = case when p_approve then 'approved' else 'rejected' end::request_status,
         decided_by = v_actor, decided_at = now()
   where id = p_request;

  if p_approve then
    insert into community_members (community_id, user_id, role)
    values (v_req.community_id, v_req.user_id, 'member') on conflict do nothing;
    get diagnostics v_rows = row_count;
    if v_rows > 0 then
      update communities set members_count = members_count + 1 where id = v_req.community_id;
    end if;
  end if;

  return (case when p_approve then 'approved' else 'rejected' end)::request_status;
end $$;

grant execute on function decide_join_request(uuid, boolean) to authenticated;

-- Removing someone, and keeping members_count honest.
create or replace function remove_community_member(p_community uuid, p_user uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := require_app_user();
  v_target community_role;
  v_actor_role community_role;
  v_rows int;
begin
  if not private.can_manage_community(v_actor, p_community) then
    raise exception 'Only an admin or moderator can remove someone.'
      using errcode = 'insufficient_privilege';
  end if;

  select role into v_target from community_members
  where community_id = p_community and user_id = p_user;
  select role into v_actor_role from community_members
  where community_id = p_community and user_id = v_actor;

  if v_target is null then return 0; end if;
  if v_target = 'owner' then
    raise exception 'The owner cannot be removed from their own community.'
      using errcode = 'check_violation';
  end if;
  -- A moderator polices members. Removing another moderator or an admin is a
  -- change to who runs the place, which is an admin's call.
  if v_target in ('admin', 'moderator') and v_actor_role not in ('owner', 'admin') then
    raise exception 'Only an admin can remove another moderator or admin.'
      using errcode = 'insufficient_privilege';
  end if;

  delete from community_members where community_id = p_community and user_id = p_user;
  get diagnostics v_rows = row_count;
  if v_rows > 0 then
    update communities set members_count = greatest(0, members_count - 1) where id = p_community;
    -- A removed person should not still be holding an approved request.
    update community_join_requests set status = 'rejected', decided_by = v_actor, decided_at = now()
     where community_id = p_community and user_id = p_user and status = 'pending';
  end if;
  return v_rows;
end $$;

grant execute on function remove_community_member(uuid, uuid) to authenticated;

-- ============================================================================
-- 4. A face: one picture, and five more
-- ============================================================================

create table if not exists community_photos (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  url          text not null,
  path         text,              -- storage key, so a delete can clean up
  caption      text,
  position     int  not null default 0,
  added_by     uuid references users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists community_photos_gallery
  on community_photos (community_id, position);

-- Five, enforced where it cannot be argued with. A count in the client is a
-- suggestion; two admins uploading at once would both pass it.
create or replace function community_photos_cap()
returns trigger language plpgsql as $$
begin
  if (select count(*) from community_photos where community_id = new.community_id) >= 5 then
    raise exception 'A community gallery holds five pictures. Remove one first.'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists trg_community_photos_cap on community_photos;
create trigger trg_community_photos_cap
  before insert on community_photos
  for each row execute function community_photos_cap();

alter table community_photos enable row level security;

drop policy if exists commphoto_read on community_photos;
create policy commphoto_read on community_photos for select using (true);

-- The gallery is part of the community's face, so it follows the community:
-- admins only, same as its name and its picture.
drop policy if exists commphoto_manage on community_photos;
create policy commphoto_manage on community_photos for all
  using (private.is_community_admin(private.current_app_user(), community_id))
  with check (private.is_community_admin(private.current_app_user(), community_id));

grant select, insert, update, delete on community_photos to authenticated;

-- ============================================================================
-- 5. Pictures live somewhere
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'communities', 'communities', true, 5242880,
  array['image/jpeg','image/png','image/webp','image/heic']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "community pictures are publicly readable" on storage.objects;
create policy "community pictures are publicly readable"
  on storage.objects for select
  using (bucket_id = 'communities');

-- Keyed <community_id>/<something>, so the first path segment says which
-- community a file belongs to and an admin of that community may write it.
-- The uuid cast is guarded: a name whose first segment is not a uuid would
-- raise inside the policy rather than simply failing the check, and an error
-- from a policy is a 500 where a refusal was wanted.
create or replace function storage_community_id(p_name text)
returns uuid language sql immutable as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
      then (split_part(p_name, '/', 1))::uuid
  end;
$$;

drop policy if exists "an admin writes their own community's pictures" on storage.objects;
create policy "an admin writes their own community's pictures"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'communities'
    and private.is_community_admin(private.current_app_user(), storage_community_id(name))
  );

drop policy if exists "an admin removes their own community's pictures" on storage.objects;
create policy "an admin removes their own community's pictures"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'communities'
    and private.is_community_admin(private.current_app_user(), storage_community_id(name))
  );

-- ============================================================================
-- 6. The old front door
-- ============================================================================
--
-- set_community_membership let anyone into anything, which was correct when
-- every community was open. Its join branch now goes through the privacy
-- check; leaving is unchanged, because nobody needs permission to leave.

create or replace function set_community_membership(p_community text, p_join boolean)
returns community_role language plpgsql security definer set search_path = public as $$
declare v_user uuid := require_app_user(); v_comm uuid := resolve_community(p_community); v_role community_role; v_rows int;
begin
  if p_join then
    -- Privacy lives in one place. A closed community answers with a pending
    -- request and no membership, which reads here as still 'member'-by-default
    -- -- callers that need to tell the difference use
    -- request_community_membership, which says which of the two happened.
    perform request_community_membership(p_community, null);
  else
    delete from community_members
     where community_id = v_comm and user_id = v_user and role <> 'owner';
    get diagnostics v_rows = row_count;
    if v_rows > 0 then update communities set members_count = greatest(0, members_count - 1) where id = v_comm; end if;
  end if;
  select role into v_role from community_members where community_id = v_comm and user_id = v_user;
  return coalesce(v_role, 'member');
end $$;

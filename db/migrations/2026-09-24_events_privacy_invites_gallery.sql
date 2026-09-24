-- An event is its own place, not a line on a community's wall.
--
-- It gets a description, a picture, a gallery, a price, and its own answer to
-- "who can see this and who can bring someone". A closed community can run an
-- open event; an open community can run one that is invitation only.
--
-- Depends on 2026-09-24_community_governance.sql for is_community_admin.

-- ============================================================================
-- 1. Who can see it, and who can bring someone
-- ============================================================================

do $$ begin
  create type event_privacy as enum ('public', 'members', 'invite');
exception when duplicate_object then null; end $$;

do $$ begin
  -- Who may send an invitation. 'managers' is admins and moderators;
  -- 'members' is anyone who is in the community.
  create type invite_policy as enum ('managers', 'members');
exception when duplicate_object then null; end $$;

alter table events
  -- 'public' is the default because that is what every existing event already
  -- is: event_read was `using (true)`. A default of anything else would hide
  -- events people can currently see.
  add column if not exists privacy       event_privacy not null default 'public',
  add column if not exists invite_policy invite_policy not null default 'managers',
  add column if not exists description   text,
  add column if not exists cover_url     text,
  -- 0 is free, which is every event that exists today.
  add column if not exists fee_cents     int not null default 0;

alter table events
  drop constraint if exists events_fee_nonneg;
alter table events
  add constraint events_fee_nonneg check (fee_cents >= 0) not valid;
alter table events validate constraint events_fee_nonneg;

-- ============================================================================
-- 2. Invitations
-- ============================================================================

create table if not exists event_invitations (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  invited_by uuid references users(id) on delete set null,
  -- The person invited. An invitation is always to somebody on the app: there
  -- is no link-for-anyone, because a link cannot be withdrawn and an
  -- invite-only event whose link escaped is a public event nobody chose.
  user_id    uuid not null references users(id) on delete cascade,
  note       text,
  status     request_status not null default 'pending',
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists event_invitations_one_each
  on event_invitations (event_id, user_id);

create index if not exists event_invitations_inbox
  on event_invitations (user_id, status);

alter table event_invitations enable row level security;

-- May this person invite somebody to this event?
create or replace function can_invite_to_event(p_user uuid, p_event uuid)
returns boolean language sql stable as $$
  select exists (
    select 1
      from events e
      join community_members m
        on m.community_id = e.community_id and m.user_id = p_user
     where e.id = p_event
       and (
         e.invite_policy = 'members'
         or m.role in ('owner', 'admin', 'moderator')
       )
  );
$$;

comment on function can_invite_to_event(uuid, uuid) is
  'The event''s invite_policy decides: managers only, or anyone in the '
  'community. Either way the inviter must be IN the community -- a stranger '
  'cannot populate somebody else''s event.';

-- Can this person see this event at all? Used by the read policy below and by
-- anything that lists events.
create or replace function can_see_event(p_user uuid, p_event events)
returns boolean language sql stable as $$
  select case p_event.privacy
    when 'public' then true
    when 'members' then exists (
      select 1 from community_members m
      where m.community_id = p_event.community_id and m.user_id = p_user
    )
    when 'invite' then exists (
      select 1 from community_members m
      where m.community_id = p_event.community_id and m.user_id = p_user
        and m.role in ('owner', 'admin', 'moderator')
    ) or exists (
      select 1 from event_invitations i
      where i.event_id = p_event.id and i.user_id = p_user
    )
  end;
$$;

drop policy if exists eventinv_read on event_invitations;
create policy eventinv_read on event_invitations for select
  using (
    user_id = current_app_user()
    or invited_by = current_app_user()
    or exists (
      select 1 from events e
      where e.id = event_id and can_manage_community(current_app_user(), e.community_id)
    )
  );

drop policy if exists eventinv_send on event_invitations;
create policy eventinv_send on event_invitations for insert
  with check (
    invited_by = current_app_user()
    and can_invite_to_event(current_app_user(), event_id)
  );

-- The invited person answers it. A manager may withdraw one.
drop policy if exists eventinv_answer on event_invitations;
create policy eventinv_answer on event_invitations for update
  using (
    user_id = current_app_user()
    or exists (
      select 1 from events e
      where e.id = event_id and can_manage_community(current_app_user(), e.community_id)
    )
  );

drop policy if exists eventinv_withdraw on event_invitations;
create policy eventinv_withdraw on event_invitations for delete
  using (
    invited_by = current_app_user()
    or exists (
      select 1 from events e
      where e.id = event_id and can_manage_community(current_app_user(), e.community_id)
    )
  );

grant select, insert, update, delete on event_invitations to authenticated;

-- An invitation is worth a notification; that is the whole point of sending
-- one. trg_push_notification already fires on every notifications insert, so
-- this reaches the phone without any further wiring.
create or replace function event_invitations_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_title text; v_comm text;
begin
  select e.title, c.name into v_title, v_comm
    from events e join communities c on c.id = e.community_id
   where e.id = new.event_id;

  insert into notifications (user_id, type, title, body)
  values (
    new.user_id, 'system',
    'You are invited to ' || coalesce(v_title, 'an event'),
    coalesce(v_comm, 'A community') || ' invited you. Tap to see the details.'
  );
  return new;
end $$;

drop trigger if exists trg_event_invitations_notify on event_invitations;
create trigger trg_event_invitations_notify
  after insert on event_invitations
  for each row execute function event_invitations_notify();

-- ============================================================================
-- 3. Events stop being readable by everyone
-- ============================================================================
--
-- Was `using (true)`. Now the row decides. `public` is the default, so nothing
-- that is visible today stops being visible.

drop policy if exists event_read on events;
create policy event_read on events for select
  using (can_see_event(current_app_user(), events));

-- Admins and moderators both run events -- that was already true and the spec
-- keeps it. `event_manage` is unchanged and still reads can_manage_community.

-- ============================================================================
-- 4. The event's own gallery
-- ============================================================================

create table if not exists event_photos (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  url        text not null,
  path       text,
  caption    text,
  position   int not null default 0,
  added_by   uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists event_photos_gallery on event_photos (event_id, position);

alter table event_photos enable row level security;

-- Seen by whoever can see the event. A gallery that outlived its event's
-- privacy would be the leak the privacy setting was for.
drop policy if exists eventphoto_read on event_photos;
create policy eventphoto_read on event_photos for select
  using (exists (
    select 1 from events e where e.id = event_id and can_see_event(current_app_user(), e)
  ));

drop policy if exists eventphoto_manage on event_photos;
create policy eventphoto_manage on event_photos for all
  using (exists (
    select 1 from events e
    where e.id = event_id and can_manage_community(current_app_user(), e.community_id)
  ))
  with check (exists (
    select 1 from events e
    where e.id = event_id and can_manage_community(current_app_user(), e.community_id)
  ));

grant select, insert, update, delete on event_photos to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'events', 'events', true, 5242880,
  array['image/jpeg','image/png','image/webp','image/heic']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "event pictures are publicly readable" on storage.objects;
create policy "event pictures are publicly readable"
  on storage.objects for select using (bucket_id = 'events');

-- Keyed <event_id>/<something>. The bucket is public, which is what makes an
-- <Image> src work without a signed URL -- the privacy that matters is on the
-- event_photos row, which is what the app reads to know a picture exists.
create or replace function storage_event_id(p_name text)
returns uuid language sql immutable as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
      then (split_part(p_name, '/', 1))::uuid
  end;
$$;

drop policy if exists "a manager writes their own event's pictures" on storage.objects;
create policy "a manager writes their own event's pictures"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'events'
    and exists (
      select 1 from events e
      where e.id = storage_event_id(name)
        and can_manage_community(current_app_user(), e.community_id)
    )
  );

drop policy if exists "a manager removes their own event's pictures" on storage.objects;
create policy "a manager removes their own event's pictures"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'events'
    and exists (
      select 1 from events e
      where e.id = storage_event_id(name)
        and can_manage_community(current_app_user(), e.community_id)
    )
  );

-- ============================================================================
-- 5. Suggesting a community to somebody
-- ============================================================================
--
-- Every community, by any user, to any user -- including a closed one, because
-- the point of suggesting a closed community is that the person then asks to
-- join it. A suggestion carries no access.

create table if not exists community_suggestions (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  from_user    uuid not null references users(id) on delete cascade,
  to_user      uuid not null references users(id) on delete cascade,
  note         text,
  created_at   timestamptz not null default now(),
  constraint community_suggestions_not_self check (from_user <> to_user)
);

-- The same person suggesting the same community twice is one suggestion, not
-- a way to message somebody repeatedly.
create unique index if not exists community_suggestions_once
  on community_suggestions (community_id, from_user, to_user);

create index if not exists community_suggestions_inbox
  on community_suggestions (to_user, created_at desc);

alter table community_suggestions enable row level security;

drop policy if exists commsug_read on community_suggestions;
create policy commsug_read on community_suggestions for select
  using (to_user = current_app_user() or from_user = current_app_user());

-- Not to somebody who blocked you, and not from somebody you blocked.
drop policy if exists commsug_send on community_suggestions;
create policy commsug_send on community_suggestions for insert
  with check (
    from_user = current_app_user()
    and not exists (
      select 1 from user_blocks b
      where (b.blocker_id = to_user and b.blocked_id = from_user)
         or (b.blocker_id = from_user and b.blocked_id = to_user)
    )
  );

drop policy if exists commsug_dismiss on community_suggestions;
create policy commsug_dismiss on community_suggestions for delete
  using (to_user = current_app_user() or from_user = current_app_user());

grant select, insert, delete on community_suggestions to authenticated;

create or replace function community_suggestions_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_comm text; v_from text;
begin
  select name into v_comm from communities where id = new.community_id;
  select name into v_from from users where id = new.from_user;
  insert into notifications (user_id, type, title, body)
  values (
    new.to_user, 'system',
    coalesce(v_from, 'Someone') || ' suggested ' || coalesce(v_comm, 'a community'),
    coalesce(new.note, 'Tap to take a look.')
  );
  return new;
end $$;

drop trigger if exists trg_community_suggestions_notify on community_suggestions;
create trigger trg_community_suggestions_notify
  after insert on community_suggestions
  for each row execute function community_suggestions_notify();

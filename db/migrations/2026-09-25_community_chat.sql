-- A community's own thread: a room, or a noticeboard.
--
-- One table either way. The mode decides who may WRITE, and nothing else --
-- reading, ordering, notifying and deleting are the same in both. Two tables
-- would have been two sets of policies to keep in step for a difference that
-- lives in a single boolean question: "may this member post?"
--
-- Applied to production as `community_chat`.

do $$ begin
  create type community_chat_mode as enum ('chatroom', 'newsletter');
exception when duplicate_object then null; end $$;

alter table communities
  -- 'chatroom' is the friendlier default and the one a small crew wants. An
  -- admin turns it down to a newsletter when the room gets too loud, which is
  -- the direction people actually travel.
  add column if not exists chat_mode community_chat_mode not null default 'chatroom';

grant update (chat_mode) on communities to authenticated;
grant select (chat_mode) on communities to authenticated, anon;

create table if not exists community_messages (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  author_id    uuid references users(id) on delete set null,
  body         text not null,
  created_at   timestamptz not null default now(),
  constraint community_messages_body_len check (char_length(btrim(body)) between 1 and 2000)
);

create index if not exists community_messages_thread
  on community_messages (community_id, created_at);

alter table community_messages enable row level security;

-- Members only, in both modes. A newsletter is still addressed to the
-- community, not to the public -- and a closed community's room must not be
-- readable by someone it refused at the door.
drop policy if exists commmsg_read on community_messages;
create policy commmsg_read on community_messages for select
  using (exists (
    select 1 from community_members m
    where m.community_id = community_messages.community_id
      and m.user_id = private.current_app_user()
  ));

-- The one rule that differs between the two modes.
create or replace function private.can_post_to_community(p_user uuid, p_comm uuid)
returns boolean language sql stable security definer
set search_path to 'private', 'public', 'extensions' as $$
  select exists (
    select 1
      from communities c
      join community_members m
        on m.community_id = c.id and m.user_id = p_user
     where c.id = p_comm
       and (c.chat_mode = 'chatroom' or m.role in ('owner', 'admin', 'moderator'))
  );
$$;

revoke all on function private.can_post_to_community(uuid, uuid) from public;
grant execute on function private.can_post_to_community(uuid, uuid) to authenticated, anon;

drop policy if exists commmsg_post on community_messages;
create policy commmsg_post on community_messages for insert
  with check (
    author_id = private.current_app_user()
    and private.can_post_to_community(private.current_app_user(), community_id)
  );

-- Your own words, or a moderator clearing up someone else's. There is no
-- editing: a message that can be rewritten after people have replied to it is
-- a different message wearing the same timestamp.
drop policy if exists commmsg_delete on community_messages;
create policy commmsg_delete on community_messages for delete
  using (
    author_id = private.current_app_user()
    or private.can_manage_community(private.current_app_user(), community_id)
  );

grant select, insert, delete on community_messages to authenticated;

-- A newsletter is worth a notification; a chatroom is not. Telling every
-- member about every message in a busy room is how people turn notifications
-- off altogether, and then they miss the ones that mattered.
create or replace function community_messages_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_mode community_chat_mode; v_name text; v_from text;
begin
  select chat_mode, name into v_mode, v_name from communities where id = new.community_id;
  if v_mode is distinct from 'newsletter' then return new; end if;

  select name into v_from from users where id = new.author_id;

  insert into notifications (user_id, type, title, body)
  select m.user_id, 'system',
         coalesce(v_name, 'A community') || ' posted an update',
         left(new.body, 140)
    from community_members m
   where m.community_id = new.community_id
     and m.user_id <> coalesce(new.author_id, '00000000-0000-0000-0000-000000000000'::uuid);

  return new;
end $$;

drop trigger if exists trg_community_messages_notify on community_messages;
create trigger trg_community_messages_notify
  after insert on community_messages
  for each row execute function community_messages_notify();

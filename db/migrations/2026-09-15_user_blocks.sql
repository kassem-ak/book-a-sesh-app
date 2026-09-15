-- ============================================================================
-- Blocking another member.
--
-- Required before release, not optional: App Store Guideline 1.2 makes a way to
-- block abusive users a condition of shipping any app with user-generated
-- content, and BOOK'D has chat, profiles and community events. Reporting
-- already exists (`reports`), but reporting asks an admin to act later —
-- blocking is the thing the user can do right now.
--
-- Enforcement is server-side on purpose. Hiding a blocked person in the client
-- is a courtesy; refusing the message is the guarantee.
-- ============================================================================

create table if not exists user_blocks (
  blocker_id uuid not null references users(id) on delete cascade,
  blocked_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);

-- Looking up "who have I blocked" and "who has blocked me" both need to be fast
-- because every conversation listing consults them.
create index if not exists user_blocks_blocked_idx on user_blocks (blocked_id);

alter table user_blocks enable row level security;

-- A block is private to the person who made it. The blocked user is never told,
-- which is the behaviour these guidelines expect.
drop policy if exists user_blocks_own on user_blocks;
create policy user_blocks_own on user_blocks
  for all to authenticated
  using (blocker_id = current_app_user())
  with check (blocker_id = current_app_user());

revoke all on user_blocks from anon, authenticated;
grant select, insert, delete on user_blocks to authenticated;

-- ---------------------------------------------------------------------------
-- Is there a block in either direction between me and someone else?
-- Symmetric on purpose: if either side blocked, neither side gets through.
-- ---------------------------------------------------------------------------
create or replace function is_blocked_with(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from user_blocks
     where (blocker_id = current_app_user() and blocked_id = p_other)
        or (blocker_id = p_other and blocked_id = current_app_user())
  );
$$;

create or replace function block_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_me uuid := current_app_user();
begin
  if v_me is null then
    raise exception 'Sign in to block someone';
  end if;
  if p_user is null or p_user = v_me then
    raise exception 'You cannot block yourself';
  end if;
  if not exists (select 1 from users where id = p_user) then
    raise exception 'That member no longer exists';
  end if;

  insert into user_blocks (blocker_id, blocked_id)
  values (v_me, p_user)
  on conflict do nothing;
end $$;

create or replace function unblock_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_me uuid := current_app_user();
begin
  if v_me is null then
    raise exception 'Sign in to manage blocks';
  end if;
  delete from user_blocks where blocker_id = v_me and blocked_id = p_user;
end $$;

-- The people I have blocked, for the client to hide and for a manage-blocks
-- list. Only ever returns my own blocks.
create or replace function my_blocked_users()
returns table (user_id uuid, name text, created_at timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $$
  select u.id, u.name, b.created_at
    from user_blocks b
    join users u on u.id = b.blocked_id
   where b.blocker_id = current_app_user()
   order by b.created_at desc;
$$;

grant execute on function is_blocked_with(uuid)  to authenticated;
grant execute on function block_user(uuid)       to authenticated;
grant execute on function unblock_user(uuid)     to authenticated;
grant execute on function my_blocked_users()     to authenticated;

-- ---------------------------------------------------------------------------
-- Enforcement.
--
-- A trigger rather than an edit to the existing message policies: the policies
-- already work and are the thing chat regressed on once before (the 42P17
-- recursion), so this adds a check beside them instead of rewriting them.
-- ---------------------------------------------------------------------------
create or replace function guard_message_block()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if current_setting('role', true) = 'service_role' then return new; end if;

  if exists (
    select 1
      from conversation_participants cp
      join user_blocks b
        on (b.blocker_id = new.sender_id and b.blocked_id = cp.user_id)
        or (b.blocker_id = cp.user_id and b.blocked_id = new.sender_id)
     where cp.conversation_id = new.conversation_id
  ) then
    raise exception 'You cannot message someone you have blocked';
  end if;

  return new;
end $$;

drop trigger if exists trg_guard_message_block on messages;
create trigger trg_guard_message_block
  before insert on messages
  for each row execute function guard_message_block();

-- Starting a thread with someone you have blocked (or who blocked you) should
-- not silently create an unusable conversation. This is the shipped body with
-- one check added -- the reuse query in particular must keep requiring exactly
-- two participants, or blocking would start reusing group threads.
create or replace function start_conversation(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_me   uuid := require_app_user();
  v_conv uuid;
begin
  if p_other is null or p_other = v_me then
    raise exception 'pick someone else to message';
  end if;

  if not exists (select 1 from users u where u.id = p_other and u.deleted_at is null) then
    raise exception 'that person is not available';
  end if;

  if is_blocked_with(p_other) then
    raise exception 'this conversation is not available';
  end if;

  select c.id into v_conv
    from conversations c
   where exists (select 1 from conversation_participants p
                  where p.conversation_id = c.id and p.user_id = v_me)
     and exists (select 1 from conversation_participants p
                  where p.conversation_id = c.id and p.user_id = p_other)
     and (select count(*) from conversation_participants p
           where p.conversation_id = c.id) = 2
   limit 1;

  if v_conv is not null then
    return v_conv;
  end if;

  insert into conversations default values returning id into v_conv;
  insert into conversation_participants (conversation_id, user_id)
  values (v_conv, v_me), (v_conv, p_other);

  return v_conv;
end $function$;

grant execute on function start_conversation(uuid) to authenticated;

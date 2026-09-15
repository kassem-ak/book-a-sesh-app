-- Applied to the live project on 2026-09-15.
--
-- Chat could read and send, but never begin. hardening.sql grants the client
-- INSERT on messages only -- conversations and conversation_participants are
-- SELECT-only, deliberately, so nobody can add themselves to someone else's
-- thread (finding H2). The consequence was that a first message between two
-- people was impossible and the Message action on a profile had nothing to open.
--
-- A SECURITY DEFINER RPC is the right shape: it creates the thread and BOTH
-- participant rows itself, so the caller never needs write access to either
-- table and still cannot join a conversation they were not put in.
--
-- Idempotent by design: an existing one-to-one thread with the same two people
-- is returned rather than duplicated, so tapping Message twice does not create
-- a second inbox entry.
create or replace function public.start_conversation(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
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
end $$;

revoke all on function public.start_conversation(uuid) from public;
grant execute on function public.start_conversation(uuid) to authenticated;

-- Applied to the live project on 2026-09-14.
--
-- Fix: chat was unreadable for every user (42P17 infinite recursion).
--
-- hardening.sql replaced the flat convpart_self policy with one that asks
-- "is there a row in conversation_participants for me in this conversation?"
-- -- but the policy is itself ON conversation_participants, so evaluating it
-- re-enters the same policy. Postgres detects the cycle and aborts. The blast
-- radius was wider than the one table: messages.msg_read and
-- conversations.conv_part both reference it, so every chat read and every
-- send failed.
--
-- A SECURITY DEFINER helper bypasses RLS for the membership lookup inside it,
-- which breaks the cycle. Own-row access is kept as a non-recursive first
-- branch so the common case never needs the function at all.
create or replace function public.is_conversation_participant(p_conv uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from conversation_participants p
    where p.conversation_id = p_conv
      and p.user_id = current_app_user()
  );
$$;

revoke all on function public.is_conversation_participant(uuid) from public;
grant execute on function public.is_conversation_participant(uuid) to authenticated, anon;

drop policy if exists convpart_read on conversation_participants;
create policy convpart_read on conversation_participants for select
  using (
    user_id = current_app_user()
    or is_conversation_participant(conversation_id)
  );

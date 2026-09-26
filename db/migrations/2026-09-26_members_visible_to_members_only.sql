-- Who is in a community is the community's business.
--
-- `member_read` was `using (true)`: anyone with the anon key could list the
-- full membership of every community, including closed ones that had refused
-- them at the door. The member COUNT is public and stays public -- it lives on
-- `communities` and is the sort of thing a joining decision needs -- but the
-- names are not.
--
-- The first attempt at this policy read community_members from inside a policy
-- ON community_members, which Postgres answers with
--
--   42P17: infinite recursion detected in policy for relation "community_members"
--
-- taking the whole table down for authenticated users. That is the same reason
-- private.can_manage_community and private.is_community_admin are SECURITY
-- DEFINER: a membership test used by a membership policy has to step outside
-- RLS to answer, or it re-enters itself.
--
-- Applied to production as `members_visible_to_members_only_fix_recursion`.

create or replace function private.is_community_member(p_user uuid, p_comm uuid)
returns boolean language sql stable security definer
set search_path to 'private', 'public', 'extensions' as $$
  select exists (
    select 1 from community_members m
    where m.community_id = p_comm and m.user_id = p_user
  );
$$;

revoke all on function private.is_community_member(uuid, uuid) from public;
grant execute on function private.is_community_member(uuid, uuid) to authenticated, anon;

drop policy if exists member_read on community_members;
create policy member_read on community_members for select
  using (
    -- Own row regardless: the app asks "what am I here?" before it can know
    -- whether to show anything, and a non-member must be able to learn that
    -- they are a non-member.
    user_id = private.current_app_user()
    or private.is_community_member(private.current_app_user(), community_id)
  );

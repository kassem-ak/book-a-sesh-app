-- Deleting a community failed with "community must keep at least one owner".
--
-- `delete_community` cleared community_members BEFORE the community row, and
-- `guard_community_roles` refuses the removal of the last owner while the
-- community still exists. The comment on the original claimed an owner
-- "legitimately may" clear the memberships first. They may not, and that guard
-- is right to stop them: a community with members and no owner is unrunnable.
--
-- The guard already has the escape hatch -- it checks whether the community
-- still exists, precisely so a cascade can take the memberships with it. So
-- the fix is to stop hand-deleting children and delete the parent, which is
-- what every one of those foreign keys is already declared to handle.
--
-- The single exception is event_suggestions.event_id, which is ON DELETE NO
-- ACTION. It cascades from communities by its OWN community_id, but a
-- suggestion pointing at an event the same cascade is removing can be refused
-- depending on the order the cascade happens to take. Clearing those rows
-- first removes the ambiguity.
--
-- Applied to production as `fix_delete_community_owner_guard`.

create or replace function delete_community(p_community uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_actor uuid := require_app_user();
begin
  if not private.is_community_owner(v_actor, p_community) then
    raise exception 'Only the owner can delete this community.'
      using errcode = 'insufficient_privilege';
  end if;

  -- The one foreign key into this graph that does not cascade.
  delete from event_suggestions where community_id = p_community;

  -- Everything else -- members, events and their attendees, invitations and
  -- photos, join requests, the gallery, suggestions, the message thread and
  -- the official-status request -- is ON DELETE CASCADE from here. The
  -- last-owner guard stands down because the community is already gone by the
  -- time the membership rows are removed.
  delete from communities where id = p_community;

  return true;
end $$;

revoke execute on function delete_community(uuid) from public, anon;
grant execute on function delete_community(uuid) to authenticated;

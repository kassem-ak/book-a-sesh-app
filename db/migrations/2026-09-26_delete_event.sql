-- Deleting an event.
--
-- `event_manage` is already `for all` on can_manage_community and DELETE is
-- already granted, so a plain delete from the client nearly works. What stops
-- it is `event_suggestions.event_id`, which is ON DELETE NO ACTION: any event
-- that began life as an approved member suggestion cannot be removed while
-- that row still points at it.
--
-- The suggestion is NOT deleted with the event. It is the record that somebody
-- proposed something and a manager said yes; that happened, and it stays.
-- Only the link is cleared.
--
-- Everything else -- attendees, invitations, photos -- is ON DELETE CASCADE
-- from events.
--
-- Applied to production as `delete_event`.

create or replace function delete_event(p_event uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_actor uuid := require_app_user(); v_comm uuid;
begin
  select community_id into v_comm from events where id = p_event;
  if v_comm is null then
    -- Already gone. Saying so as an error would make a double tap look like a
    -- failure when the outcome is exactly what was asked for.
    return true;
  end if;
  if not private.can_manage_community(v_actor, v_comm) then
    raise exception 'Only an admin or moderator of this community can delete an event.'
      using errcode = 'insufficient_privilege';
  end if;

  update event_suggestions set event_id = null where event_id = p_event;
  delete from events where id = p_event;
  return true;
end $$;

revoke execute on function delete_event(uuid) from public, anon;
grant execute on function delete_event(uuid) to authenticated;

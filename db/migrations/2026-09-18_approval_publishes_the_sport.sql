-- Approving a sport request only ever flipped the request's own status. It
-- never inserted into `sports`, so an approved sport never entered the
-- catalogue: it could not be picked on a profile, could not be filtered for in
-- Discover or Maps, and could not be chosen as a community category. The admin
-- decision looked like it worked and changed nothing a member could see.
--
-- Approval now publishes the sport in the same statement that records the
-- decision, so the two cannot disagree.
create or replace function public.decide_sport_request(p_id uuid, p_status text)
returns table (id uuid, status text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_admin uuid := current_app_user();
  v_name  text;
  v_kind  sport_kind;
begin
  if not is_platform_admin() then
    raise exception 'only a platform admin can decide a request';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'a request is either approved or rejected';
  end if;

  -- Only a still-pending row moves, so a second decision cannot overwrite the
  -- first one silently.
  update sport_requests r
     set status = p_status::request_status,
         reviewed_by = v_admin
   where r.id = p_id
     and r.status = 'pending'
  returning r.name, r.kind into v_name, v_kind;

  -- Nothing moved: already decided, or no such request. Return no rows, which
  -- is what the caller already treats as "this did not apply".
  if v_name is null then
    return;
  end if;

  if p_status = 'approved' then
    -- Idempotent on the UNIQUE(name): re-approving an existing name must not
    -- fail, and must not silently create a duplicate the pickers would show
    -- twice. An existing row is made visible rather than left hidden.
    insert into sports (name, kind, approved)
    values (v_name, v_kind, true)
    on conflict (name) do update set approved = true;
  end if;

  return query select p_id, p_status;
end $function$;

revoke execute on function public.decide_sport_request(uuid, text) from public;
grant execute on function public.decide_sport_request(uuid, text) to authenticated;

-- Applied live 18 September 2026 and verified as a real admin in a rolled-back
-- transaction: pending request -> approved -> the sport appears in `sports`
-- with approved = true, the fetchSports query returns it, and a second
-- decision returns no rows and creates no duplicate.

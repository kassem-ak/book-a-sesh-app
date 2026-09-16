-- The admin approvals queue wrote status and reviewed_by straight to
-- sport_requests. An RLS policy (sportreq_adm) allowed it, but hardening
-- revoked UPDATE from `authenticated` and re-granted INSERT only -- and RLS
-- cannot restore a missing SQL privilege. Verified against the live project:
-- `authenticated` holds SELECT and INSERT on sport_requests and nothing else,
-- so Approve/Reject failed with permission denied for every admin.
--
-- An RPC rather than a table grant. An app "ADMIN" is still an ordinary
-- authenticated database client; every other privileged write in this schema
-- goes through SECURITY DEFINER for exactly that reason, and granting UPDATE
-- would open every column to every authenticated role with only RLS holding it
-- back.
--
-- Returns the decided row so the client can tell a real decision from one that
-- someone else already made, instead of reporting success either way.

create or replace function decide_sport_request(p_id uuid, p_status text)
returns table (id uuid, status text)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_admin uuid := current_app_user();
begin
  if not is_platform_admin() then
    raise exception 'only a platform admin can decide a request';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'a request is either approved or rejected';
  end if;

  -- Only a still-pending row moves, so a second decision cannot quietly
  -- overwrite the first.
  return query
    update sport_requests r
       set status = p_status::request_status,
           reviewed_by = v_admin
     where r.id = p_id
       and r.status = 'pending'
    returning r.id, r.status::text;
end $$;

revoke all on function decide_sport_request(uuid, text) from public, anon;
grant execute on function decide_sport_request(uuid, text) to authenticated;

-- How many sport requests are waiting for the AI to categorise them.
--
-- admin_sport_requests hides a pending request until it has a category, which
-- is the point -- but it also meant an admin could not tell "nobody asked for
-- anything" from "requests are waiting and the AI cannot run". With a rejected
-- Anthropic key the queue simply looked empty. This is the one number that
-- tells them apart: a count and the age of the oldest, never the requests
-- themselves, which still reach the queue only once categorised.
--
-- service_role only, like every other admin_* view: the console reads it with
-- the service key, and no app user can.

create or replace view public.admin_sport_requests_held
with (security_invoker = true) as
select count(*)::int        as held,
       min(r.created_at)    as oldest
  from public.sport_requests r
 where r.status = 'pending'::request_status
   and r.category_id is null;

revoke all on public.admin_sport_requests_held from public, anon, authenticated;
grant select on public.admin_sport_requests_held to service_role;

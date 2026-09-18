-- users.location is deliberately NOT selectable by clients: raw coordinates
-- must never be readable, not even your own, because a column grant applies to
-- every row RLS lets you see, not just your own row. But the profile has to be
-- able to say whether YOU are currently sharing, or "Stop sharing" is a control
-- with no state and a reload forgets it.
--
-- A boolean about your own row only. It exposes no coordinate, and nothing
-- about anybody else.
create or replace function public.my_location_shared()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select location is not null from users where id = current_app_user();
$function$;

revoke execute on function public.my_location_shared() from public;
grant execute on function public.my_location_shared() to authenticated;

-- Applied live 18 September 2026.

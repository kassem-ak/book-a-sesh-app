-- Every account was silently stamped with the city "Beirut" -- a real-looking
-- location the user never supplied and the device never reported. It came from
-- two places: the column default on users.city, and bootstrap_demo_session,
-- which wrote it explicitly for anonymous sessions and back-filled it on
-- conflict.
--
-- Onboarding treats the area as a display label and starts empty, so nothing
-- else established this value. A city the user did not give is invented data,
-- and it would have shipped looking like profile information.
--
-- city stays nullable; unknown is now represented as null.

alter table users alter column city drop default;

create or replace function bootstrap_demo_session()
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_user uuid;
begin
  if auth.uid() is null then raise exception 'signed-in app user required'; end if;
  -- No city: an anonymous guest has not said where they are, and device
  -- location is asked for separately and may be declined.
  insert into users (auth_id, email, name)
  values (auth.uid(), nullif(auth.jwt()->>'email', '')::citext, 'Guest')
  on conflict (auth_id) do update set name = coalesce(nullif(users.name, ''), 'Guest')
  returning id into v_user;
  insert into notification_prefs (user_id) values (v_user) on conflict do nothing;
  return v_user;
end $function$;

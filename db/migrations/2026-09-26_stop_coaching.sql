-- Stopping coaching.
--
-- Being a coach is one row in coach_profiles, so stopping is deleting it. The
-- app said "there is no undo, ask us if you change your mind", which is a
-- support ticket standing in for a button.
--
-- It has to be an RPC rather than a delete from the client:
--
--  * coach_profiles has no DELETE policy, and a policy-gated delete that
--    matches no row is not an error -- it changes nothing and reports success.
--    The app would have shown "done" every time and changed nothing, ever.
--
--  * Leaving is refused while anybody is still owed something. A coach who
--    vanishes with sessions on the books leaves clients holding a booking
--    against somebody the app no longer lists, and requests waiting on an
--    answer that can no longer be given -- the coach tools disappear with the
--    row. One rule for both: settle what is outstanding, then leave.
--
-- What survives: packages, certificates, working hours and past bookings all
-- key on users.id, not on this row, so they are still there if the account
-- coaches again. What does not: coach_sports cascades, and
-- guard_coach_profile_privileges zeroes sessions_count, rating_avg and
-- reviews_count on insert, so a returning coach starts from nothing. The app
-- says so before asking.

create or replace function public.stop_coaching()
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  me uuid := private.current_app_user();
  booked integer;
  waiting integer;
begin
  if me is null then
    raise exception 'Sign in first.' using errcode = 'P0001';
  end if;

  select count(*) into booked
  from public.bookings
  where coach_id = me
    and status in ('pending', 'confirmed')
    and scheduled_for >= now();
  if booked > 0 then
    raise exception
      'You still have % session(s) booked. Finish or cancel them before you stop coaching.', booked
      using errcode = 'P0001';
  end if;

  select count(*) into waiting
  from public.appointment_requests
  where coach_id = me and status = 'pending';
  if waiting > 0 then
    raise exception
      'You still have % request(s) waiting on an answer. Reply to them before you stop coaching.', waiting
      using errcode = 'P0001';
  end if;

  delete from public.coach_profiles where user_id = me;
end;
$$;

-- `revoke from public` does not reach anon or authenticated: Supabase grants
-- those roles separately, so both have to be named.
revoke all on function public.stop_coaching() from public;
revoke all on function public.stop_coaching() from anon;
grant execute on function public.stop_coaching() to authenticated;

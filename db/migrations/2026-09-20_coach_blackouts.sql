-- Days a coach is not available, whatever their weekly schedule says.
--
-- `coach_availability` answers "which slots on a Tuesday". It cannot answer
-- "not this Tuesday" -- a holiday, a competition, an injury -- and a coach whose
-- only way to close a date was to delete Tuesday from their whole schedule and
-- put it back afterwards will not bother.
create table if not exists public.coach_blackouts (
  coach_id uuid not null references public.users(id) on delete cascade,
  -- A date, not a timestamp. "I am away on the 4th" is a statement about a
  -- calendar day in the coach's own life, and giving it a time zone would mean
  -- deciding whose.
  on_date  date not null,
  reason   text,
  created_at timestamptz not null default now(),
  primary key (coach_id, on_date)
);

create index if not exists coach_blackouts_date_idx on public.coach_blackouts (coach_id, on_date);

alter table public.coach_blackouts enable row level security;

-- Public, like the weekly schedule it overrides: the booking screen has to know
-- which days to grey out before anyone tries.
drop policy if exists blackout_read on public.coach_blackouts;
create policy blackout_read on public.coach_blackouts for select using (true);

drop policy if exists blackout_self on public.coach_blackouts;
create policy blackout_self on public.coach_blackouts
  for all
  using (coach_id = current_app_user())
  with check (coach_id = current_app_user());

grant select, insert, update, delete on public.coach_blackouts to authenticated;

-- The booking RPC already refuses a slot outside the weekly schedule. A closed
-- date has to be refused in the same place, for the same reason: the client
-- greys the day out, but the client is not the boundary.
--
-- Checked against the coach's own calendar day. `p_scheduled_for::date` uses
-- the database's time zone, which is what the weekday test above it already
-- does -- keeping one notion of "which day is this" rather than two that can
-- disagree at midnight.
create or replace function public.create_booking_for_coach(
  p_coach uuid,
  p_scheduled_for timestamptz,
  p_slot_label text,
  p_package_id uuid,
  p_slot text
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_user uuid := require_app_user();
        v_total int; v_pct numeric; v_id uuid;
        v_sessions int; v_price int;
        v_used int; v_cap int;
        v_has_schedule boolean; v_weekday int;
begin
  if p_scheduled_for < now() - interval '1 day' then
    raise exception 'cannot book a slot in the past';
  end if;

  -- A date the coach has closed beats the weekly schedule.
  if exists (
    select 1 from coach_blackouts b
     where b.coach_id = p_coach and b.on_date = p_scheduled_for::date
  ) then
    raise exception 'that coach is not available on that date';
  end if;

  -- Respect the coach's saved schedule when they have one and the caller told
  -- us which slot was picked.
  if p_slot is not null then
    select exists (select 1 from coach_availability where coach_id = p_coach)
      into v_has_schedule;

    if v_has_schedule then
      v_weekday := extract(isodow from p_scheduled_for)::int - 1;
      if not exists (
        select 1 from coach_availability
         where coach_id = p_coach and weekday = v_weekday and slot = p_slot
      ) then
        raise exception 'that coach is not available at that time';
      end if;
    end if;
  end if;

  if p_package_id is not null then
    perform pg_advisory_xact_lock(
      hashtextextended(v_user::text || ':' || p_coach::text || ':' || p_package_id::text, 0));

    select sessions, price_cents into v_sessions, v_price
      from packages
     where id = p_package_id and coach_id = p_coach and active;
    if v_price is null then raise exception 'package not available for this coach'; end if;

    select used, total into v_used, v_cap
      from client_package_balances
     where client_id = v_user and coach_id = p_coach and package_id = p_package_id
     for update;

    if v_used is null then
      v_total := v_price;
    elsif v_used < v_cap then
      v_total := 0;
    else
      raise exception 'this package has no sessions left';
    end if;
  else
    select price_cents into v_total from coach_profiles where user_id = p_coach;
    if v_total is null then raise exception 'coach not found'; end if;
  end if;

  select pct into v_pct from platform_margins where key = 'session';

  insert into bookings (client_id, coach_id, package_id, scheduled_for, slot_label,
                        status, total_cents, commission_cents)
  values (v_user, p_coach, p_package_id, p_scheduled_for, p_slot_label,
          'confirmed', v_total, round(v_total * coalesce(v_pct, 12) / 100.0))
  returning id into v_id;

  if p_package_id is not null then
    insert into client_package_balances (client_id, coach_id, package_id, label, used, total)
    values (v_user, p_coach, p_package_id, v_sessions || '-session pack', 1, v_sessions)
    on conflict (client_id, coach_id, package_id) where package_id is not null
    do update set
      used = least(client_package_balances.used + 1, client_package_balances.total);
  end if;

  return v_id;
end $function$;

-- Applied live 20 September 2026 and verified as a real signed-in account in a
-- rolled-back transaction:
--   book an open slot                      -> ok
--   close that date, book the same slot    -> "that coach is not available on
--                                             that date"
--   book a different, open date            -> still ok
--   close a date for another coach         -> refused
--   read another coach's closed dates      -> allowed (it is public)
--   an existing booking on a closed date   -> untouched; closing a date is
--                                             about new bookings, and cancelling
--                                             somebody's session without telling
--                                             them would be worse than the gap

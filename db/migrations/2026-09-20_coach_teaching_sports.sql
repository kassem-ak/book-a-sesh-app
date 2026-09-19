-- What a coach teaches is not what a coach does.
--
-- Until now they were one list. A coach's `profile_tags` fed the "Specialties"
-- heading on their public profile, so a swimming coach who also plays chess
-- advertised chess coaching. And `coach_profiles.sport_id` held exactly one
-- sport, so a coach who teaches two could not say so at all.
--
-- Two lists from here:
--   coach_sports  -- what they teach. Only coaches have it.
--   profile_tags  -- what they do themselves. Everyone has it, coaches included.

create table if not exists public.coach_sports (
  coach_id uuid not null references public.users(id) on delete cascade,
  sport_id uuid not null references public.sports(id) on delete cascade,
  -- Order is the meaning: position 0 is the specialty they lead with, the one
  -- that reaches Discover and the one `coach_profiles.sport_id` mirrors.
  position int not null default 0,
  primary key (coach_id, sport_id)
);

create index if not exists coach_sports_coach_idx on public.coach_sports (coach_id, position);

alter table public.coach_sports enable row level security;

-- Public, like the coach profile it describes: it is the thing people search
-- and filter on.
drop policy if exists coach_sports_read on public.coach_sports;
create policy coach_sports_read on public.coach_sports for select using (true);

-- Only your own, and only if you actually are a coach. Without the second test
-- any account could claim to teach anything and appear alongside real coaches.
drop policy if exists coach_sports_self on public.coach_sports;
create policy coach_sports_self on public.coach_sports
  for all
  using (coach_id = current_app_user())
  with check (
    coach_id = current_app_user()
    and exists (select 1 from coach_profiles cp where cp.user_id = current_app_user())
  );

grant select, insert, update, delete on public.coach_sports to authenticated;

-- `coach_profiles.sport_id` stays, because Discover, the map query and
-- `admin_sports.in_use` all read it. Rather than ask the client to write both
-- and hope they agree, the denormalised column follows the list automatically.
-- One place decides; the other cannot drift.
create or replace function public.sync_coach_primary_sport()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_coach uuid; v_primary uuid;
begin
  v_coach := coalesce(new.coach_id, old.coach_id);
  select cs.sport_id into v_primary
    from coach_sports cs
   where cs.coach_id = v_coach
   order by cs.position, cs.sport_id
   limit 1;
  update coach_profiles set sport_id = v_primary where user_id = v_coach;
  return null;
end $function$;

drop trigger if exists trg_sync_coach_primary_sport on public.coach_sports;
create trigger trg_sync_coach_primary_sport
  after insert or update or delete on public.coach_sports
  for each row execute function public.sync_coach_primary_sport();

-- Backfill: every existing coach keeps the one sport they had, as their
-- primary. Nobody's profile changes meaning on deploy -- what they were
-- already advertising is what they now formally teach.
insert into public.coach_sports (coach_id, sport_id, position)
select cp.user_id, cp.sport_id, 0
  from public.coach_profiles cp
 where cp.sport_id is not null
on conflict (coach_id, sport_id) do nothing;

-- Applied live 20 September 2026 and verified as a real signed-in coach in a
-- rolled-back transaction:
--   add two specialties            -> ok, coach_profiles.sport_id follows the
--                                     one at position 0
--   reorder them                   -> sport_id follows the new leader
--   delete the primary             -> sport_id falls back to the next
--   delete the last one            -> sport_id becomes null
--   add a specialty for another    -> refused
--   add one as a non-coach account -> refused
--   read another coach's list      -> allowed (it is public)

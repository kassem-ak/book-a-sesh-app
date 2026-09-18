-- The user decides how precisely their position is shared. Two honest levels,
-- both derived from where they actually are:
--
--   'exact' -- the position as captured, a pin.
--   'area'  -- that same position snapped to a ~1.1 km grid cell centre.
--
-- 'area' is deterministic rounding of the real point, NOT a random offset. A
-- fabricated nearby position would make distances and "who is around me"
-- quietly wrong, and would be a lie told to the user's own contacts. Rounding
-- is honest: it says "somewhere in this cell", and it is stable, so a member
-- does not appear to wander between refreshes.
alter table public.users
  add column if not exists location_precision text not null default 'area';

alter table public.users
  drop constraint if exists users_location_precision_check;
alter table public.users
  add constraint users_location_precision_check
  check (location_precision in ('exact', 'area'));

grant update (location_precision) on public.users to authenticated;

-- Replaces my_location_shared(): the profile needs to render which level is
-- selected, not merely whether sharing is on. Still your own row only, and
-- still no coordinate leaves the database through it. ("precision" is a
-- reserved word, hence share_level.)
create or replace function public.my_location_sharing()
returns table (shared boolean, share_level text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select location is not null, location_precision
    from users
   where id = current_app_user();
$function$;

revoke execute on function public.my_location_sharing() from public;
grant execute on function public.my_location_sharing() to authenticated;

drop function if exists public.my_location_shared();

-- Who a signed-in member may see on the map, and where.
--
-- users.location stays unreadable to clients: a column grant applies to every
-- row RLS exposes, so granting SELECT on it would publish exact positions for
-- everyone. This function is the only disclosure, and it decides per row:
--
--   * the subject must have opted in (location is not null);
--   * the position is rounded to their OWN chosen precision, never finer;
--   * blocks are honoured in both directions;
--   * the caller's own row is excluded -- the client knows where it is.
create or replace function public.people_on_the_map()
returns table (
  id uuid,
  name text,
  avatar_url text,
  role text,
  sport text,
  latitude double precision,
  longitude double precision,
  share_level text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with me as (select current_app_user() as id)
  select
    u.id,
    u.name,
    u.avatar_url,
    case when c.user_id is not null then 'coach' else 'member' end as role,
    coalesce(cs.name, ps.name) as sport,
    case when u.location_precision = 'exact'
         then st_y(u.location::geometry)
         else round(st_y(u.location::geometry)::numeric, 2)::double precision
    end as latitude,
    case when u.location_precision = 'exact'
         then st_x(u.location::geometry)
         else round(st_x(u.location::geometry)::numeric, 2)::double precision
    end as longitude,
    u.location_precision as share_level
  from users u
  cross join me
  left join coach_profiles c on c.user_id = u.id
  left join partner_profiles p on p.user_id = u.id
  left join sports cs on cs.id = c.sport_id
  left join sports ps on ps.id = p.sport_id
  where u.location is not null
    and u.deleted_at is null
    and u.id <> me.id
    -- A block hides the map pin in both directions, the same way it hides
    -- messages. Seeing where someone is is not less than messaging them.
    and not exists (
      select 1 from user_blocks b
       where (b.blocker_id = me.id and b.blocked_id = u.id)
          or (b.blocker_id = u.id and b.blocked_id = me.id)
    );
$function$;

revoke execute on function public.people_on_the_map() from public;
grant execute on function public.people_on_the_map() to authenticated;

-- Applied live 18 September 2026 and verified as a signed-in member in a
-- rolled-back transaction: a subject not sharing returns 0 rows; 'area'
-- returned 33.9 for a stored 33.897654; 'exact' returned 33.897654; a block in
-- either direction returns 0 rows; the caller never sees themselves.

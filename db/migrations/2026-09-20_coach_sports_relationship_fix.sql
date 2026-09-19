-- Fixes a regression shipped in "What a coach teaches is not what a coach does"
-- (#55): every coach disappeared from Discover.
--
-- That change added `coach_sports(...)` to the coach query. `coach_sports.
-- coach_id` referenced users(id), which is true but is not the relationship the
-- app reads: Discover selects FROM coach_profiles and embeds the specialties,
-- and PostgREST can only embed across a foreign key it can see. It found none,
-- refused the whole query with PGRST200, and the screen fell back to no
-- coaches at all -- not to coaches without specialties.
--
-- The key to coach_profiles is also the more accurate statement: only a coach
-- has coaching specialties. The RLS policy already tested for a coach profile
-- on write; this makes it true of the data rather than only of the path that
-- wrote it.
alter table public.coach_sports
  drop constraint if exists coach_sports_coach_profile_fk;

alter table public.coach_sports
  add constraint coach_sports_coach_profile_fk
  foreign key (coach_id) references public.coach_profiles(user_id) on delete cascade;

-- Two foreign keys to the same row by two paths left PostgREST unable to
-- choose, and the embed became "300 Multiple Choices" -- the same screen broken
-- a second way. The users key is the redundant one: coach_profiles.user_id
-- already references users(id) ON DELETE CASCADE, so deleting a user still
-- cascades through the profile into the specialties.
alter table public.coach_sports drop constraint if exists coach_sports_coach_id_fkey;

notify pgrst, 'reload schema';

-- One consequence, handled in the client rather than here: with coach_sports
-- keyed to coach_profiles it is a junction table, so `sports` is now reachable
-- from coach_profiles two ways -- directly via sport_id, and many-to-many
-- through coach_sports. Embeds of `sports` from `coach_profiles` therefore name
-- the constraint: `sport:sports!coach_profiles_sport_id_fkey(name)`.

-- Verified live against the anon endpoint the app actually uses:
--   before  -> 400 PGRST200, 0 coaches
--   FK only -> 300 PGRST201 (ambiguous), 0 coaches
--   after   -> 200, coaches returned with their specialties embedded

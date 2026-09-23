-- Nobody trains with themselves.
--
-- Most of the app already said so: follows, blocks, partner sessions, package
-- cancellations and session feedback all carry a not-self CHECK. The two that
-- did not are the two that matter most -- a booking, and a rating.
--
-- A coach who is also a member (the app encourages exactly that: "you can
-- teach one thing and play another") could find their own profile in Discover
-- and book themselves. That puts a fake appointment on their own calendar,
-- holds a slot a real client wanted, and -- once they rate it -- lifts their
-- own public average.
--
-- The client is filtered separately so nobody sees themselves in a list, but
-- the client is not the boundary. This is.

-- ---------------------------------------------------------------------------
-- Step 1: how much of it is there
-- ---------------------------------------------------------------------------
--
-- Run this FIRST and read the numbers. Steps 2 and 3 delete rows.
--
--   select 'bookings' as what, count(*) from bookings where client_id = coach_id
--   union all
--   select 'reviews', count(*) from reviews where subject_id = author_id;
--
-- If both are zero, skip to step 4 and the constraints will validate against
-- existing data with nothing to clean.

-- ---------------------------------------------------------------------------
-- Step 2: the rule, applied to everything written from now on
-- ---------------------------------------------------------------------------

-- NOT VALID on purpose. It is enforced for every insert and update
-- immediately, and it does NOT scan what is already there -- so applying this
-- can never fail on historic rows, and the app is protected before anybody has
-- decided what to do about them.
alter table public.bookings
  drop constraint if exists bookings_not_self;
alter table public.bookings
  add constraint bookings_not_self check (client_id <> coach_id) not valid;

alter table public.reviews
  drop constraint if exists reviews_not_self;
alter table public.reviews
  add constraint reviews_not_self check (subject_id <> author_id) not valid;

-- The RPCs refuse it with a sentence rather than a constraint violation, since
-- a constraint name is not something to show somebody.
create or replace function public.guard_not_self(p_other uuid, p_what text)
returns void
language plpgsql
immutable
set search_path to 'public'
as $function$
begin
  if p_other = current_app_user() then
    raise exception 'You cannot % with yourself.', p_what;
  end if;
end $function$;

revoke execute on function public.guard_not_self(uuid, text) from public, anon;
grant execute on function public.guard_not_self(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Step 3: the rows that are already there -- DESTRUCTIVE
-- ---------------------------------------------------------------------------
--
-- Commented out. Read step 1's counts, decide, then run these deliberately.
--
-- These are deletes rather than cancellations because the constraint in step 4
-- applies to every row whatever its status: a cancelled self-booking would
-- still fail validation. A self-booking is not an appointment anybody had, so
-- there is no history being lost -- but that is a judgement, which is why it
-- is yours to make and not this file's.
--
-- Deleting a self-review changes that person's public average, which is the
-- point: it was their own vote on themselves. Expect `rating_avg` to move.
--
--   -- reviews first: reviews.booking_id references bookings.
--   delete from reviews where subject_id = author_id;
--   delete from bookings where client_id = coach_id;
--
-- Anything derived from bookings recomputes on read (`package_progress` is a
-- view). If `client_package_balances` holds a counter rather than deriving
-- one, check it afterwards for a client whose self-bookings were removed.

-- ---------------------------------------------------------------------------
-- Step 4: promote the constraints once the data agrees with them
-- ---------------------------------------------------------------------------
--
-- Only after step 3, and only if step 1 found something. VALIDATE takes a scan
-- but not a write lock on readers.
--
--   alter table public.bookings validate constraint bookings_not_self;
--   alter table public.reviews  validate constraint reviews_not_self;

-- ---------------------------------------------------------------------------
-- NOT APPLIED
-- ---------------------------------------------------------------------------
--
-- No database access this session. Steps 2 is safe to run as written; steps 1,
-- 3 and 4 are the commented sequence above and want a person reading the
-- counts between them.
--
-- The two RPC guards are in the migration that follows this line -- they are
-- here rather than in their original files so that one file carries the whole
-- rule.

-- create_booking_for_coach: refuse before anything else, so a self-booking
-- never reaches the availability checks and cannot fail with a message about
-- the coach's schedule.
--
-- Written as a wrapper rather than a rewrite: the body of these two functions
-- is long and lives in its own migration, and copying it here to add one line
-- would leave two versions to keep in step. This adds the check to the table
-- instead, where it cannot be bypassed by a future caller either.
create or replace function public.bookings_refuse_self()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if new.client_id = new.coach_id then
    raise exception 'You cannot book a session with yourself.';
  end if;
  return new;
end $function$;

drop trigger if exists trg_bookings_refuse_self on public.bookings;
create trigger trg_bookings_refuse_self
  before insert or update on public.bookings
  for each row execute function public.bookings_refuse_self();

create or replace function public.reviews_refuse_self()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if new.subject_id = new.author_id then
    raise exception 'You cannot rate yourself.';
  end if;
  return new;
end $function$;

drop trigger if exists trg_reviews_refuse_self on public.reviews;
create trigger trg_reviews_refuse_self
  before insert or update on public.reviews
  for each row execute function public.reviews_refuse_self();

-- Checks to run once applied, in a transaction that is rolled back:
--   booking yourself through create_booking_for_coach  -> refused, by sentence
--   booking yourself through book_package_sessions     -> refused, by sentence
--   inserting a self-booking directly                  -> refused by the trigger
--   rating yourself                                    -> refused
--   booking somebody else                              -> unaffected
--   a coach who is also a member booking a real coach  -> unaffected

-- Who may rate whom, and where a private note is allowed to live.
--
-- Three directions, which the app had one of:
--
--   member  -> coach    one number: attitude. This is what Discover sorts on
--                       and what a coach's profile shows, and until now no
--                       member could leave one -- `reviews` only ever had the
--                       coach's rating of the trainee written to it.
--   member  -> member   the same one number, for the two people in a partner
--                       session.
--   coach   -> trainee  the same attitude number, plus a second for skill, plus
--                       a written note that is private between those two.
--
-- So `stars` means attitude for everybody, and `skill_stars` is the coach's
-- extra read that only they can give. One column means one thing regardless of
-- who wrote the row, which is what keeps an average over `stars` honest.
--
-- The private note is the reason this is not one `body` column on `reviews`.
-- `reviews` is publicly readable, which is the whole point of a public rating,
-- so a text column on it would be a public column: a coach's candid note about
-- a trainee would be readable by anyone who asked for it. Private feedback
-- gets its own table with its own rule instead. Adding a column to a public
-- table and then trying to hide it is how that kind of leak happens.

-- ---------------------------------------------------------------------------
-- The public rating gains a second number and a session it belongs to
-- ---------------------------------------------------------------------------

alter table public.reviews
  add column if not exists skill_stars int,
  add column if not exists booking_id  uuid references public.bookings(id) on delete set null;

alter table public.reviews
  drop constraint if exists reviews_skill_stars_range;
alter table public.reviews
  add constraint reviews_skill_stars_range
  check (skill_stars is null or (skill_stars >= 1 and skill_stars <= 5));

comment on column public.reviews.stars is
  'Attitude, from whoever left it -- member of a coach, member of a partner, or coach of a trainee.';
comment on column public.reviews.skill_stars is
  'The coach''s second read: the trainee''s skill. Null on a rating left by a member, who does not give one.';
comment on column public.reviews.booking_id is
  'The session this rating came out of, when it came out of one. Null for a '
  'rating left against a person rather than a session.';

-- ---------------------------------------------------------------------------
-- The private note
-- ---------------------------------------------------------------------------

-- One note per author per session. Replacing it is an upsert; there is no
-- history, because a coach rewriting their own note is not an event anybody
-- needs to audit.
-- `session_id` rather than `booking_id`: a session is a row in `bookings` or
-- in `partner_sessions`, and a foreign key can only point at one of them. The
-- kind is carried alongside so a reader knows which table to look in.
create table if not exists public.session_feedback (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null,
  session_kind text not null default 'coach',
  author_id   uuid not null references public.users(id) on delete cascade,
  subject_id  uuid not null references public.users(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint session_feedback_body_not_blank check (btrim(body) <> ''),
  constraint session_feedback_not_self check (author_id <> subject_id),
  constraint session_feedback_kind check (session_kind in ('coach', 'partner')),
  unique (session_id, author_id)
);

create index if not exists session_feedback_subject_idx
  on public.session_feedback (subject_id, created_at desc);

alter table public.session_feedback enable row level security;

-- Between the two of them and nobody else. Not the other party to some other
-- session, not an admin reading the table, not a public profile.
drop policy if exists session_feedback_parties_read on public.session_feedback;
create policy session_feedback_parties_read on public.session_feedback
  for select using (
    author_id = current_app_user() or subject_id = current_app_user()
  );

-- Writing is through the function below, which is what checks that the two of
-- you were actually in a session together.
grant select on public.session_feedback to authenticated;

-- ---------------------------------------------------------------------------
-- Leaving a rating
-- ---------------------------------------------------------------------------

-- You may rate the other party to a session you were in, once that session has
-- happened. Not before it, and not somebody you have never trained with.
--
-- SECURITY DEFINER because the check is "were you two in this booking
-- together", which is a read across bookings that the caller's own policies do
-- not have to permit in general.
create or replace function public.rate_session(
  p_session uuid,
  p_stars int,
  p_skill_stars int default null,
  p_feedback text default null,
  p_kind text default 'coach'
)
returns table (subject_id uuid, stars int, skill_stars int)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_me       uuid := require_app_user();
  v_row      bookings%rowtype;
  v_partner  partner_sessions%rowtype;
  v_subject  uuid;
  v_coach    boolean;
  v_when     timestamptz;
  v_dead     boolean;
begin
  if p_stars is null or p_stars < 1 or p_stars > 5 then
    raise exception 'A rating is between 1 and 5.';
  end if;

  if p_kind = 'partner' then
    select * into v_partner from partner_sessions s where s.id = p_session;
    if v_partner.id is null then
      raise exception 'That session no longer exists.';
    end if;
    -- Neither side of a partner session coaches the other, so neither gives a
    -- skill rating: they are two people who trained together.
    if v_me = v_partner.proposer_id then v_subject := v_partner.partner_id;
    elsif v_me = v_partner.partner_id then v_subject := v_partner.proposer_id;
    else raise exception 'That session is not yours.';
    end if;
    v_coach := false;
    v_when := v_partner.scheduled_for;
    v_dead := v_partner.status in ('declined', 'cancelled');
  else
    select * into v_row from bookings b where b.id = p_session;
    if v_row.id is null then
      raise exception 'That session no longer exists.';
    end if;
    if v_me = v_row.client_id then
      v_subject := v_row.coach_id;
      v_coach := false;
    elsif v_me = v_row.coach_id then
      v_subject := v_row.client_id;
      v_coach := true;
    else
      raise exception 'That session is not yours.';
    end if;
    v_when := v_row.scheduled_for;
    v_dead := v_row.status = 'cancelled';
  end if;

  -- Rating a session that has not happened is rating an intention.
  if v_when > now() then
    raise exception 'That session has not happened yet.';
  end if;
  if v_dead then
    raise exception 'That session was called off, so there is nothing to rate.';
  end if;

  -- Everybody rates attitude. Only a coach adds the skill number, and only a
  -- coach leaves the private note.
  if not v_coach and (p_skill_stars is not null or p_feedback is not null) then
    raise exception 'Only a coach records a skill rating or private feedback.';
  end if;
  if p_skill_stars is not null and (p_skill_stars < 1 or p_skill_stars > 5) then
    raise exception 'A skill rating is between 1 and 5.';
  end if;

  insert into reviews (subject_id, author_id, stars, skill_stars, booking_id)
  values (v_subject, v_me, p_stars, p_skill_stars,
          case when p_kind = 'partner' then null else p_session end)
  on conflict (subject_id, author_id) do update
    set stars = excluded.stars,
        skill_stars = coalesce(excluded.skill_stars, reviews.skill_stars),
        booking_id = excluded.booking_id;

  if p_feedback is not null and btrim(p_feedback) <> '' then
    insert into session_feedback (session_id, session_kind, author_id, subject_id, body)
    values (p_session, p_kind, v_me, v_subject, btrim(p_feedback))
    on conflict (session_id, author_id) do update
      set body = excluded.body, updated_at = now();
  end if;

  return query
    select v_subject, p_stars, p_skill_stars;
end $function$;

revoke execute on function public.rate_session(uuid, int, int, text, text) from public, anon;
grant execute on function public.rate_session(uuid, int, int, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- NOT APPLIED
-- ---------------------------------------------------------------------------
--
-- This session had no database access, so none of the above has been run or
-- checked against the live schema. `reviews` predates this repo's migrations
-- and its definition could not be read from here, so before applying:
--
--   * Confirm `reviews` has the unique constraint this relies on. The client
--     upserts with `onConflict: 'subject_id,author_id'`, so a constraint by
--     that name or shape should exist -- but `on conflict (subject_id,
--     author_id)` above needs it to be a real unique index, not just a pair of
--     columns the client hopes are unique.
--   * Confirm `reviews.stars` already has a 1..5 check. If it does not, add
--     one: rate_session validates, but the table should not depend on its
--     callers.
--   * Confirm nothing already reads `reviews` with `select *` into a typed
--     row, which two new columns would widen.
--
-- Checks to run once applied, in a transaction that is rolled back:
--   member rates their coach after the session   -> row written, stars only
--   member sends a skill rating or feedback      -> refused
--   coach rates trainee with skill + feedback    -> both written
--   either rates before scheduled_for            -> refused
--   either rates a cancelled session             -> refused
--   a stranger rates the session                 -> refused
--   the subject reads the feedback               -> visible
--   a third party reads session_feedback         -> 0 rows
--   rating twice                                 -> replaces, does not duplicate

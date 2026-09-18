-- Three faults in one dataset: two identical "Freediving" requests, both marked
-- approved, and neither present in `sports` -- so the sport was invisible in
-- every picker while the console showed it as approved.

create extension if not exists pg_trgm with schema extensions;

-- Title Case, with acronyms left alone. initcap() alone turns MMA into "Mma"
-- and BJJ into "Bjj", which looks like a bug to anyone who knows the sport, so
-- a short all-caps token is left as typed.
create or replace function public.normalise_sport_name(p_name text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select string_agg(
           case when word ~ '^[A-Z0-9]{2,4}$' then word else initcap(word) end,
           ' ' order by ord)
    from unnest(
           string_to_array(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'), ' ')
         ) with ordinality as t(word, ord);
$function$;

-- Publishing lives in a TRIGGER, not in the approval functions.
--
-- There were two approval paths: decide_sport_request (the app) and
-- admin_decide_sport_request (the web console). Only the first was ever taught
-- to insert into `sports`, so every approval made from the console -- which is
-- where approvals actually happen -- published nothing. Fixing the second
-- function would have left the same trap for a third caller.
create or replace function public.publish_approved_sport()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_name text;
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    v_name := normalise_sport_name(new.name);

    -- sports.name is UNIQUE but case-sensitive, so check case-insensitively
    -- first: otherwise "freediving" and "Freediving" both live in the
    -- catalogue and both appear in the picker.
    if exists (select 1 from sports where lower(name) = lower(v_name)) then
      update sports set approved = true, kind = new.kind where lower(name) = lower(v_name);
    else
      insert into sports (name, kind, approved) values (v_name, new.kind, true);
    end if;

    -- The request keeps the spelling that was published, so the console and
    -- the catalogue cannot disagree about what was approved.
    new.name := v_name;
  end if;
  return new;
end $function$;

drop trigger if exists trg_publish_approved_sport on public.sport_requests;
create trigger trg_publish_approved_sport
  before update on public.sport_requests
  for each row execute function public.publish_approved_sport();

-- decide_sport_request no longer publishes; the trigger owns it.
create or replace function public.decide_sport_request(p_id uuid, p_status text)
returns table (id uuid, status text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_admin uuid := current_app_user();
begin
  if not is_platform_admin() then
    raise exception 'only a platform admin can decide a request';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'a request is either approved or rejected';
  end if;
  return query
    update sport_requests r
       set status = p_status::request_status,
           reviewed_by = v_admin
     where r.id = p_id
       and r.status = 'pending'
    returning r.id, r.status::text;
end $function$;

revoke execute on function public.decide_sport_request(uuid, text) from public;
grant execute on function public.decide_sport_request(uuid, text) to authenticated;

-- Submitting accepted anything, including a name already in the catalogue and
-- a name already requested. Three checks, cheapest first.
--
-- Raised WITHOUT errcode 23505 deliberately: the client maps 23505 to "That
-- slot is already booked. Pick another time." -- correct for a booking,
-- nonsense here. Left as P0001, errorMessage() passes the text through.
create or replace function public.submit_sport_request(p_name text, p_kind text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user  uuid := require_app_user();
  v_id    uuid;
  v_kind  sport_kind;
  v_name  text;
  v_match text;
begin
  v_name := normalise_sport_name(p_name);
  if length(coalesce(v_name, '')) = 0 then
    raise exception 'Enter a name for the sport or hobby.';
  end if;
  v_kind := case when lower(coalesce(p_kind, 'sport')) = 'hobby'
                 then 'hobby'::sport_kind else 'sport'::sport_kind end;

  select name into v_match
    from sports
   where lower(name) = lower(v_name) and approved
   limit 1;
  if v_match is not null then
    raise exception '% is already there to choose - no need to request it.', v_match;
  end if;

  -- Already requested and waiting: record the demand rather than refusing. The
  -- votes column exists for exactly this and nothing was writing to it.
  select id into v_id
    from sport_requests
   where lower(name) = lower(v_name) and status = 'pending'
   order by created_at
   limit 1;
  if v_id is not null then
    update sport_requests set votes = votes + 1 where id = v_id;
    return v_id;
  end if;

  -- Near-duplicate detection, NOT a spell checker: Postgres has no dictionary
  -- here. It catches a typo or variant of a name the catalogue already has,
  -- and cannot catch a misspelling of a word nobody has entered. An admin
  -- reads the name before approving, and approval normalises the spelling.
  select name into v_match
    from sports
   where approved and extensions.similarity(lower(name), lower(v_name)) > 0.55
   order by extensions.similarity(lower(name), lower(v_name)) desc
   limit 1;
  if v_match is not null then
    raise exception 'Did you mean "%"? If not, check the spelling and try again.', v_match;
  end if;

  insert into sport_requests (name, kind, requested_by)
  values (v_name, v_kind, v_user)
  returning id into v_id;
  return v_id;
end $function$;

revoke execute on function public.submit_sport_request(text, text) from public;
grant execute on function public.submit_sport_request(text, text) to authenticated;

-- Backfill: requests already marked approved published nothing, and the
-- trigger only fires on the transition.
with approved as (
  select distinct on (lower(normalise_sport_name(name)))
         normalise_sport_name(name) as name, kind
    from sport_requests
   where status = 'approved'
   order by lower(normalise_sport_name(name)), created_at
)
insert into sports (name, kind, approved)
select a.name, a.kind, true
  from approved a
 where not exists (select 1 from sports s where lower(s.name) = lower(a.name));

update sport_requests
   set name = normalise_sport_name(name)
 where status = 'approved' and name is distinct from normalise_sport_name(name);

-- Applied live 18 September 2026 and verified as a real admin in a rolled-back
-- transaction:
--   normalise: "  mountain   BIKING " -> "Mountain Biking";
--              "MMA" -> "MMA"; "cross-country skiing" -> "Cross-Country Skiing"
--   admin_decide_sport_request (the console path) now publishes, and renames
--     the request to the published spelling
--   a duplicate of a published sport is refused, naming it
--   "deep water soloin" -> 'Did you mean "Deep Water Soloing"?'
--   a duplicate of a PENDING request returns the same row with votes 1 -> 2
--   all three refusals raise P0001, so the message reaches the user unchanged
-- Backfill published "Freediving", which two approved requests had failed to.

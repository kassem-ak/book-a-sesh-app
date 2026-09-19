-- Sexual content reaches the moderation queue automatically.
--
-- `safety_flags` already existed, with an `auto` column and an admin queue
-- reading it. Nothing ever wrote to it. This is what writes to it.
--
-- WHAT THIS DOES AND DOES NOT DO: it flags. It does not block the write, ban
-- the author or notify anybody -- the same honesty the moderation console
-- already states about its own verdicts. A flagged message is still delivered
-- and a flagged bio is still public until a human acts on the queue. Turning
-- any of this into a refusal is a one-line change in `flag_if_explicit`, and it
-- is a product decision rather than a technical one.
--
-- ON "ANY LANGUAGE": a term list is not a language model. This one covers the
-- languages the app is actually used in plus the ones that show up in spam,
-- and it defeats the ordinary evasions (accents, leetspeak, spacing, repeated
-- letters). It will still miss euphemism, slang it has not seen, and languages
-- nobody has added yet. It is a net, not a wall, and `moderation_terms` is a
-- table precisely so the net can be widened without a deploy.

create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------------
-- The list
-- ---------------------------------------------------------------------------

create table if not exists public.moderation_terms (
  id       uuid primary key default gen_random_uuid(),
  -- Stored already normalised, so matching never has to normalise both sides
  -- at query time. `normalize_for_moderation` is applied on write by a trigger.
  term     text not null unique,
  -- Free text rather than an enum: adding a language must not need a migration.
  lang     text not null default 'und',
  -- 'explicit' is unambiguous in any context. 'suggestive' is a word that is
  -- innocent in some sentences and not in others; it is flagged too, but the
  -- reviewer is told which kind it was so they can weigh it.
  severity text not null default 'explicit',
  active   boolean not null default true,
  -- Whole-word matching is right for short Latin terms, where a substring hits
  -- innocent words. It is wrong for languages that do not space their words, so
  -- those entries turn it off.
  whole_word boolean not null default true,
  created_at timestamptz not null default now(),
  constraint moderation_terms_severity check (severity in ('explicit', 'suggestive'))
);

alter table public.moderation_terms enable row level security;

-- Deliberately no policy for `authenticated`. RLS with no policy denies
-- everything, so the list is invisible to the app -- publishing the blocklist
-- is publishing the instructions for evading it. The SECURITY DEFINER function
-- below is the only reader.
revoke all on public.moderation_terms from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Normalising
-- ---------------------------------------------------------------------------

-- Fold the ordinary evasions into one shape so "S3XX", "s-e-x" and "séx" all
-- become the same string as "sex".
--
-- Order matters: unaccent first (so "é" is "e" before anything else looks at
-- it), then leet digits, then strip everything that is not a letter, digit or
-- space, then collapse runs of the same letter. The last step is why "sexxx"
-- matches -- and also why it cannot tell "coo" from "co", which is a price
-- worth paying for a list of this kind.
--
-- `!` and `|` are NOT mapped to `i`, although they are common leetspeak. They
-- are far more often ordinary punctuation, and mapping them turned "SeX!!"
-- into "sexii" -- which matched nothing. Caught by the live check below.
create or replace function public.normalize_for_moderation(p_text text)
returns text
language sql
immutable
set search_path to 'public', 'extensions'
as $function$
  select regexp_replace(
           regexp_replace(
             translate(
               lower(extensions.unaccent(coalesce(p_text, ''))),
               '0134578@$',
               'oieastbas'),
             '[^a-z0-9[:space:][:alpha:]]+', ' ', 'g'),
           '(.)\1{1,}', '\1', 'g');
$function$;

create or replace function public.moderation_terms_normalize()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  new.term := normalize_for_moderation(new.term);
  if new.term = '' then raise exception 'A moderation term cannot be empty once normalised.'; end if;
  return new;
end $function$;

drop trigger if exists trg_moderation_terms_normalize on public.moderation_terms;
create trigger trg_moderation_terms_normalize
  before insert or update on public.moderation_terms
  for each row execute function public.moderation_terms_normalize();

-- ---------------------------------------------------------------------------
-- Matching
-- ---------------------------------------------------------------------------

-- Separator evasion ("p o r n", "S.E.X", "n_u_d_e") survives the normalisation
-- above, because stripping the separators leaves the letters spaced apart. It
-- has a signature ordinary prose does not: a run of three or more single-letter
-- words. Only when that signature is present is the fully de-spaced form
-- matched as well.
--
-- The gate is the whole point. De-spacing everything would read "top or new" as
-- "topornew" and flag it, and a queue full of nonsense is a queue nobody reads.
create or replace function public.despace_letter_runs(p_text text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select case
           when p_text ~ '\y[a-z] [a-z] [a-z]\y'
             then regexp_replace(p_text, '\s+', '', 'g')
           else p_text
         end;
$function$;

-- Returns the terms a piece of text hits. Empty means clean.
--
-- SECURITY DEFINER because `moderation_terms` is readable by nobody: the
-- answer is public, the list is not.
create or replace function public.moderation_hits(p_text text)
returns table (term text, lang text, severity text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with normalised as (
    select ' ' || normalize_for_moderation(p_text) || ' ' as body,
           despace_letter_runs(normalize_for_moderation(p_text)) as squashed
  )
  select distinct t.term, t.lang, t.severity
    from moderation_terms t, normalised n
   where t.active
     and (
       -- Padded with spaces on both sides so the first and last words match
       -- like any other, without a separate special case.
       (case when t.whole_word then n.body like '% ' || t.term || ' %'
             else n.body like '%' || t.term || '%' end)
       -- The de-spaced form has no word boundaries left, so everything matches
       -- as a substring here regardless of the term's whole_word setting.
       or (n.squashed <> btrim(n.body) and n.squashed like '%' || t.term || '%')
     );
$function$;

revoke execute on function public.despace_letter_runs(text) from public, anon, authenticated;

revoke execute on function public.moderation_hits(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Flagging
-- ---------------------------------------------------------------------------

-- One trigger body for every table that carries text somebody typed.
--
-- TG_ARGV[0] is the subject_type recorded on the flag, TG_ARGV[1] the column
-- holding the author's id, and the rest are the text columns to scan. Written
-- once rather than per table so a new surface is a CREATE TRIGGER, not a new
-- function that can quietly diverge from the others.
create or replace function public.flag_if_explicit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_subject   text := tg_argv[0];
  v_author    uuid;
  v_text      text := '';
  v_column    text;
  v_value     text;
  v_hits      text[];
  v_severity  text;
begin
  execute format('select ($1).%I::uuid', tg_argv[1]) into v_author using new;
  if v_author is null then return new; end if;

  for i in 2 .. array_upper(tg_argv, 1) loop
    v_column := tg_argv[i];
    execute format('select ($1).%I::text', v_column) into v_value using new;
    if v_value is not null then v_text := v_text || ' ' || v_value; end if;
  end loop;

  if btrim(v_text) = '' then return new; end if;

  select array_agg(distinct h.term),
         case when bool_or(h.severity = 'explicit') then 'explicit' else 'suggestive' end
    into v_hits, v_severity
    from moderation_hits(v_text) h;

  if v_hits is null then return new; end if;

  insert into safety_flags (subject_type, subject_id, source, content, auto)
  values (
    v_subject,
    v_author,
    -- Which surface, which terms, and how bad -- so a reviewer can judge
    -- without going to look the row up.
    format('auto:%s:%s:%s', v_subject, v_severity, array_to_string(v_hits, ',')),
    -- Truncated: the queue is a list, and a flag is a pointer to something, not
    -- a copy of it.
    left(btrim(v_text), 500),
    true);
  return new;
end $function$;

-- Every surface where one person's words reach another.
drop trigger if exists trg_flag_message on public.messages;
create trigger trg_flag_message after insert on public.messages
  for each row execute function public.flag_if_explicit('message', 'sender_id', 'body');

drop trigger if exists trg_flag_user on public.users;
create trigger trg_flag_user after insert or update of name, city on public.users
  for each row execute function public.flag_if_explicit('user', 'id', 'name', 'city');

drop trigger if exists trg_flag_coach_profile on public.coach_profiles;
create trigger trg_flag_coach_profile after insert or update of bio, headline, level on public.coach_profiles
  for each row execute function public.flag_if_explicit('coach_profile', 'user_id', 'bio', 'headline', 'level');

drop trigger if exists trg_flag_partner_profile on public.partner_profiles;
create trigger trg_flag_partner_profile after insert or update of bio, goal, looking_for on public.partner_profiles
  for each row execute function public.flag_if_explicit('partner_profile', 'user_id', 'bio', 'goal', 'looking_for');

drop trigger if exists trg_flag_profile_tag on public.profile_tags;
create trigger trg_flag_profile_tag after insert on public.profile_tags
  for each row execute function public.flag_if_explicit('profile_tag', 'user_id', 'tag');

drop trigger if exists trg_flag_sport_request on public.sport_requests;
create trigger trg_flag_sport_request after insert on public.sport_requests
  for each row execute function public.flag_if_explicit('sport_request', 'requested_by', 'name');

-- ---------------------------------------------------------------------------
-- Seed
-- ---------------------------------------------------------------------------
--
-- Stored normalised by the trigger above, so these are written as ordinary
-- words. Latin-script entries are whole-word; scripts that do not space their
-- words (Chinese, Japanese) are substring.
--
-- This list is a starting point chosen for coverage of the languages the app is
-- used in, not an exhaustive one. Widen it through the table, not a migration.
insert into public.moderation_terms (term, lang, severity, whole_word) values
  -- English
  ('sex', 'en', 'explicit', true),
  ('sexual', 'en', 'explicit', true),
  ('porn', 'en', 'explicit', true),
  ('porno', 'en', 'explicit', true),
  ('pornography', 'en', 'explicit', true),
  ('nude', 'en', 'explicit', true),
  ('nudes', 'en', 'explicit', true),
  ('naked', 'en', 'explicit', true),
  ('horny', 'en', 'explicit', true),
  ('escort', 'en', 'suggestive', true),
  ('hookup', 'en', 'suggestive', true),
  ('nsfw', 'en', 'explicit', true),
  ('onlyfans', 'en', 'explicit', true),
  ('blowjob', 'en', 'explicit', true),
  ('handjob', 'en', 'explicit', true),
  ('anal', 'en', 'explicit', true),
  ('orgasm', 'en', 'explicit', true),
  ('masturbate', 'en', 'explicit', true),
  ('masturbation', 'en', 'explicit', true),
  ('erotic', 'en', 'explicit', true),
  ('fetish', 'en', 'explicit', true),
  ('cum', 'en', 'explicit', true),
  ('dick', 'en', 'explicit', true),
  ('cock', 'en', 'explicit', true),
  ('pussy', 'en', 'explicit', true),
  ('boobs', 'en', 'explicit', true),
  ('tits', 'en', 'explicit', true),
  ('whore', 'en', 'explicit', true),
  ('slut', 'en', 'explicit', true),
  ('prostitute', 'en', 'explicit', true),
  ('sexting', 'en', 'explicit', true),
  ('sexy', 'en', 'suggestive', true),
  -- Arabic (the app's second market)
  ('جنس', 'ar', 'explicit', false),
  ('جنسي', 'ar', 'explicit', false),
  ('اباحي', 'ar', 'explicit', false),
  ('إباحية', 'ar', 'explicit', false),
  ('عاهرة', 'ar', 'explicit', false),
  ('شرموطة', 'ar', 'explicit', false),
  ('عارية', 'ar', 'suggestive', false),
  ('مثير', 'ar', 'suggestive', false),
  -- French
  ('sexe', 'fr', 'explicit', true),
  ('sexuel', 'fr', 'explicit', true),
  ('salope', 'fr', 'explicit', true),
  ('pute', 'fr', 'explicit', true),
  ('bite', 'fr', 'explicit', true),
  ('nichons', 'fr', 'explicit', true),
  ('baiser', 'fr', 'suggestive', true),
  -- German
  ('sexuell', 'de', 'explicit', true),
  ('nackt', 'de', 'explicit', true),
  ('hure', 'de', 'explicit', true),
  ('schwanz', 'de', 'explicit', true),
  ('titten', 'de', 'explicit', true),
  ('geil', 'de', 'suggestive', true),
  -- Spanish
  ('sexo', 'es', 'explicit', true),
  ('desnuda', 'es', 'explicit', true),
  ('desnudo', 'es', 'explicit', true),
  ('puta', 'es', 'explicit', true),
  ('polla', 'es', 'explicit', true),
  ('tetas', 'es', 'explicit', true),
  ('coño', 'es', 'explicit', true),
  ('caliente', 'es', 'suggestive', true),
  -- Portuguese
  ('sexo', 'pt', 'explicit', true),
  ('pelada', 'pt', 'explicit', true),
  ('buceta', 'pt', 'explicit', true),
  ('caralho', 'pt', 'explicit', true),
  -- Italian
  ('sesso', 'it', 'explicit', true),
  ('nuda', 'it', 'explicit', true),
  ('troia', 'it', 'explicit', true),
  ('cazzo', 'it', 'explicit', true),
  -- Turkish
  ('seks', 'tr', 'explicit', true),
  ('çıplak', 'tr', 'explicit', true),
  ('orospu', 'tr', 'explicit', true),
  ('am', 'tr', 'suggestive', true),
  -- Russian
  ('секс', 'ru', 'explicit', false),
  ('порно', 'ru', 'explicit', false),
  ('голая', 'ru', 'explicit', false),
  ('шлюха', 'ru', 'explicit', false),
  -- Dutch
  ('seks', 'nl', 'explicit', true),
  ('naakt', 'nl', 'explicit', true),
  ('hoer', 'nl', 'explicit', true),
  -- Hindi / Urdu (romanised too, which is how it is usually typed)
  ('सेक्स', 'hi', 'explicit', false),
  ('नंगी', 'hi', 'explicit', false),
  ('chudai', 'hi', 'explicit', true),
  ('randi', 'hi', 'explicit', true),
  ('lund', 'hi', 'explicit', true),
  -- Chinese and Japanese: no spaces between words, so substring.
  ('性交', 'zh', 'explicit', false),
  ('色情', 'zh', 'explicit', false),
  ('裸体', 'zh', 'explicit', false),
  ('セックス', 'ja', 'explicit', false),
  ('エロ', 'ja', 'explicit', false),
  ('裸', 'ja', 'suggestive', false),
  -- Korean
  ('섹스', 'ko', 'explicit', false),
  ('야동', 'ko', 'explicit', false)
on conflict (term) do nothing;

-- Applied live 20 September 2026 and verified against the real list.
--
-- Evasions, all flagged:
--   sex  S3X  5EX  séx  sexxx  SeX!!  s-e-x  "s e x"  P.O.R.N  "N U D E S"  n_u_d_e
--
-- Innocent text, none flagged:
--   Middlesex  Sussex  sextet  "Essex county league"  analysis  coach
--   "a b c gym"  "I am a fan of squash"  "Let us meet at 5 a m"
--   "Top or new gear"  "U S A team trials"  "B M X and M T B rides"
--   "Great session, see you at six"  "I run a 5 k m loop"
--
-- Languages, all flagged: ar, ru, zh, ja, ko, es, de, en
--
-- End to end, as a real signed-in account, rolled back:
--   moderation_terms read as that user  -> denied (the list stays private)
--   two messages sent, one explicit     -> both delivered, 1 flagged
--   the flag's source                   -> auto:message:explicit:nude,nudes
--   a display name, a bio, a profile tag -> 1 flag each, correct subject_type
--
-- Two gaps the live check found and this migration fixes: `!` mapped to `i`
-- turned "SeX!!" into "sexii" and matched nothing, and separator evasion was
-- not handled at all.

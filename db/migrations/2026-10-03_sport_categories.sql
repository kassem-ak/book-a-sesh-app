-- Categories: a layer between "sport or hobby" and the entry itself.
--
--   Sport  >  Combat sports  >  Boxing
--   Hobby  >  Music          >  Guitar
--
-- A controlled vocabulary, not free text, and that is the whole design. The
-- sports list stays usable because one gate -- an admin deciding a request --
-- stops it sprawling. Categories need the same thing: if the AI engine could
-- coin a category, every new entry would arrive with a slightly different one
-- ("Martial arts", "Fighting", "Combat") and the layer would be noise. So Gwin
-- picks from this table, its reply is checked against the table in code, and an
-- admin is the only one who can add a row.
--
-- Nullable on both sports and requests. An entry with no category shows under
-- "Other" rather than vanishing, and a deleted category drops its entries back
-- there rather than deleting them.

create table if not exists public.sport_categories (
  id        uuid primary key default gen_random_uuid(),
  kind      sport_kind not null,
  name      text not null,
  position  int  not null default 0,
  unique (kind, name)
);

alter table public.sport_categories enable row level security;

-- Readable by everyone: the picker needs it before anybody has signed in, on the
-- sign-up interests step. Nothing here is private.
drop policy if exists sport_categories_read on public.sport_categories;
create policy sport_categories_read on public.sport_categories for select using (true);

grant select on public.sport_categories to anon, authenticated;

alter table public.sports
  add column if not exists category_id uuid references public.sport_categories(id) on delete set null;
alter table public.sport_requests
  add column if not exists category_id uuid references public.sport_categories(id) on delete set null;

grant select (category_id) on public.sports to anon, authenticated;

-- The vocabulary. "Other" in each kind is the honest home for anything that
-- does not fit, and is where an uncategorised entry is shown.
insert into public.sport_categories (kind, name, position) values
  ('sport', 'Combat sports',        10),
  ('sport', 'Strength & fitness',   20),
  ('sport', 'Endurance',            30),
  ('sport', 'Water sports',         40),
  ('sport', 'Mind & body',          50),
  ('sport', 'Climbing & outdoor',   60),
  ('sport', 'Racquet sports',       70),
  ('sport', 'Team sports',          80),
  ('sport', 'Other sports',        999),
  ('hobby', 'Games & strategy',     10),
  ('hobby', 'Music',                20),
  ('hobby', 'Outdoor & adventure',  30),
  ('hobby', 'Dance',                40),
  ('hobby', 'Arts & crafts',        50),
  ('hobby', 'Other hobbies',       999)
on conflict (kind, name) do nothing;

-- The entries that already exist, seeded by hand rather than by the engine.
-- Fifteen rows reviewed once is better than fifteen guesses, and the engine
-- needs a key that may not be configured yet. Every entry from here on is
-- classified automatically when it is requested.
with seed(name, category) as (values
  ('Boxing',                  'Combat sports'),
  ('Muay Thai',               'Combat sports'),
  ('Calisthenics',            'Strength & fitness'),
  ('Strength',                'Strength & fitness'),
  ('Strength & Conditioning', 'Strength & fitness'),
  ('Running',                 'Endurance'),
  ('Running & Endurance',     'Endurance'),
  ('Freediving',              'Water sports'),
  ('Yoga & Mobility',         'Mind & body'),
  ('Climbing',                'Climbing & outdoor'),
  ('Padel',                   'Racquet sports'),
  ('Chess',                   'Games & strategy'),
  ('Guitar',                  'Music'),
  ('Scuba Diving',            'Outdoor & adventure'),
  ('Salsa',                   'Dance')
)
update public.sports s
   set category_id = c.id
  from seed
  join public.sport_categories c on c.name = seed.category
 where s.name = seed.name
   and c.kind = s.kind
   and s.category_id is null;

-- Approval carries the category across. The engine classifies at request time,
-- so the admin sees the proposed category beside the name when deciding, and
-- whatever they approve arrives already in its place.
create or replace function public.publish_approved_sport()
returns trigger
language plpgsql
security definer
-- The same search path it already had: normalise_sport_name and friends are
-- resolved through it, and narrowing it would break approval outright.
set search_path = public, private, extensions
as $$
declare v_name text;
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    v_name := normalise_sport_name(new.name);

    -- sports.name is UNIQUE but case-sensitive, so a case-insensitive check
    -- first: otherwise "freediving" and "Freediving" both live in the
    -- catalogue and both show up in the picker.
    if exists (select 1 from sports where lower(name) = lower(v_name)) then
      update sports
         set approved = true,
             kind = new.kind,
             -- Never overwrite a category somebody already set with a guess.
             category_id = coalesce(sports.category_id, new.category_id)
       where lower(name) = lower(v_name);
    else
      insert into sports (name, kind, approved, category_id)
      values (v_name, new.kind, true, new.category_id);
    end if;

    -- The request keeps the spelling that was actually published, so the
    -- console and the catalogue cannot disagree about what was approved.
    new.name := v_name;
  end if;
  return new;
end
$$;

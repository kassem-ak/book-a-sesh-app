-- Instagram, Facebook, TikTok on a profile.
--
-- Three columns on each of two tables rather than a polymorphic
-- social_links(owner_kind, owner_id, ...) table. A polymorphic owner cannot
-- have a foreign key, so it cannot cascade on delete and cannot be trusted to
-- point at a row that exists -- and it would need its own RLS spelling out
-- rules that these columns inherit from the row they sit on for free.
--
-- Stored as the handle the person typed, not a URL. A handle is what people
-- know, it survives a platform changing its domain, and it cannot be used to
-- point "my Instagram" at an arbitrary website.

-- A handle, or nothing. Deliberately permissive about the character set --
-- the three platforms disagree with each other and all of them have changed
-- their rules -- but strict about the things that make a handle not a handle:
-- no spaces, no slashes, no scheme.
create or replace function is_social_handle(p_handle text)
returns boolean language sql immutable as $$
  select p_handle is null
      or p_handle ~ '^[A-Za-z0-9._-]{1,40}$';
$$;

alter table users
  add column if not exists instagram text,
  add column if not exists facebook  text,
  add column if not exists tiktok    text;

alter table users drop constraint if exists users_social_handles;
alter table users add constraint users_social_handles check (
  is_social_handle(instagram) and is_social_handle(facebook) and is_social_handle(tiktok)
) not valid;
alter table users validate constraint users_social_handles;

alter table communities
  add column if not exists instagram text,
  add column if not exists facebook  text,
  add column if not exists tiktok    text;

alter table communities drop constraint if exists communities_social_handles;
alter table communities add constraint communities_social_handles check (
  is_social_handle(instagram) and is_social_handle(facebook) and is_social_handle(tiktok)
) not valid;
alter table communities validate constraint communities_social_handles;

-- users is written through column-level grants, so a new column is not
-- writable until it is named. Without this the field saves nothing and says
-- nothing about why.
grant update (instagram, facebook, tiktok) on users to authenticated;
grant update (instagram, facebook, tiktok) on communities to authenticated;

-- SELECT is granted per column too, and granting only UPDATE was the bug:
-- the profile read asks for these three columns, took a 403, and broke profile
-- setup for every signed-in user -- not just the social fields. They are public
-- by design, sitting next to the name and the bio that anon already reads.
grant select (instagram, facebook, tiktok) on users to authenticated, anon;
grant select (instagram, facebook, tiktok) on communities to authenticated, anon;

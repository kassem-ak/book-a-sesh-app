-- Registration now states whether someone joined as a coach or a member, and
-- lets them set interests and a profile picture. Three things had to exist
-- server-side before any of that could work.
--
-- 1. AVATARS BUCKET. There was no storage bucket in the project at all, so
--    users.avatar_url could only ever have held a URL nothing produced.
--    Public read, because an avatar shows next to a member on every public
--    surface. Writes are locked to the owner BY PATH: the first path segment
--    must equal the writer's auth uid. 2 MiB and image mime types only, so a
--    client bug or a hostile caller cannot fill storage with arbitrary files.
--
--    Note the two different identifiers: storage paths use the AUTH uid, while
--    database rows use public.users.id. They are not the same value.
--
-- 2. MEMBERS COULD NOT CREATE A PROFILE. Discover's Partners tab reads
--    partner_profiles, and no client role held any write grant on it -- so that
--    tab could never contain a single person. The RLS was already correct
--    (partner_self scopes every command to the owner; partner_read allows
--    public read); only the SQL privilege was missing. Same shape as the
--    sport_requests bug found the day before.
--
-- 3. A GUARD FOR partner_profiles mirroring guard_coach_profile_privileges, so
--    user_id is forced to the caller. RLS already restricts the row; this means
--    a client still cannot create a profile for somebody else if a policy is
--    ever loosened by mistake.
--
-- Verified live: a member creates their own partner profile, cannot create one
-- for another user, interests persist to profile_tags, and name/avatar_url are
-- user-writable.
--
-- The base service is free for coaches and members alike, so nothing here gates
-- a role behind a subscription.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 2097152,
  array['image/jpeg','image/png','image/webp','image/heic']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars are publicly readable" on storage.objects;
create policy "avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "a user writes only their own avatar" on storage.objects;
create policy "a user writes only their own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "a user replaces only their own avatar" on storage.objects;
create policy "a user replaces only their own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "a user deletes only their own avatar" on storage.objects;
create policy "a user deletes only their own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Column-level, not table-level: a member sets what they are looking for,
-- never anything the platform owns.
grant insert (user_id, sport_id, level, goal, looking_for, bio)
  on partner_profiles to authenticated;
grant update (sport_id, level, goal, looking_for, bio)
  on partner_profiles to authenticated;
grant delete on partner_profiles to authenticated;

create or replace function guard_partner_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if current_setting('role', true) = 'service_role' then return new; end if;
  new.user_id := current_app_user();
  if new.user_id is null then
    raise exception 'sign in to set up your profile';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_partner_profile_privileges on partner_profiles;
create trigger trg_guard_partner_profile_privileges
  before insert or update on partner_profiles
  for each row execute function guard_partner_profile_privileges();

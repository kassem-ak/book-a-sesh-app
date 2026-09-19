-- Certificates were a name, an issuer and a year with nothing behind them --
-- anyone could type "Level 3 Strength Coach" and the profile would show it.
-- A file is what makes the claim checkable.
alter table public.certifications
  add column if not exists file_path text;

-- Images only, deliberately. A PDF needs a viewer the app does not have, and a
-- half-rendered document on a profile is worse than asking for a photo, which
-- is what people take of a certificate anyway.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('certificates', 'certificates', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic'];

-- Same shape as avatars: the first path segment is the uploader's auth id, so
-- a member can only write under their own prefix.
drop policy if exists "a coach writes only their own certificate" on storage.objects;
create policy "a coach writes only their own certificate"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'certificates'
    and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "a coach replaces only their own certificate" on storage.objects;
create policy "a coach replaces only their own certificate"
  on storage.objects for update to authenticated
  using (bucket_id = 'certificates'
    and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "a coach deletes only their own certificate" on storage.objects;
create policy "a coach deletes only their own certificate"
  on storage.objects for delete to authenticated
  using (bucket_id = 'certificates'
    and (storage.foldername(name))[1] = auth.uid()::text);

-- Readable by anyone, because the point is to show it on a public profile.
-- The UI says so before the picker opens: a certificate often carries a full
-- legal name, and someone should know that before uploading one.
drop policy if exists "certificates are publicly readable" on storage.objects;
create policy "certificates are publicly readable"
  on storage.objects for select
  using (bucket_id = 'certificates');

-- Note: the existing certifications policies already do the important work and
-- are unchanged. certs_self_insert requires status = 'pending', which is what
-- stops a coach marking their own certificate approved; certs_read is public,
-- which is what lets a profile show someone else's credentials.
--
-- Applied live 19 September 2026.

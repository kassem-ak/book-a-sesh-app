-- A website alongside the social handles, on profiles and communities.
--
-- Not stored like the others. A handle is a name on a platform whose URL this
-- app builds, which is why the existing columns cannot be pointed anywhere
-- except instagram.com, facebook.com or tiktok.com. A website is by definition
-- an arbitrary URL, so the safety that came free for the handles has to be
-- written down here instead:
--
--   * http and https only. A stored 'javascript:' or 'data:' URL would be
--     handed straight to the browser by the tap target on the profile.
--   * a host with a dot in it, so the field cannot hold prose.
--   * no credentials in the URL -- 'https://user:pass@host' renders as the
--     host and goes somewhere else, which is the oldest phishing trick there
--     is and is worth more to somebody abusing this than to anybody using it.
--
-- The client normalises to this shape before sending; this is the backstop, and
-- the two are kept in step by hand exactly as is_social_handle already is.

create or replace function public.is_web_url(p_url text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_url is null
      or (
        length(p_url) <= 200
        and p_url ~* '^https?://[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?\.[A-Za-z]{2,}(?::[0-9]{1,5})?(?:/[^[:space:]]*)?$'
      );
$$;

alter table public.users        add column if not exists website text;
alter table public.communities  add column if not exists website text;

alter table public.users
  drop constraint if exists users_website_url,
  add constraint users_website_url check (public.is_web_url(website));

alter table public.communities
  drop constraint if exists communities_website_url,
  add constraint communities_website_url check (public.is_web_url(website));

-- Column grants, mirrored exactly on the three handle columns beside it.
-- Granting UPDATE without SELECT is what broke profile setup when those landed:
-- the client wrote the value and then could not read back the row it had just
-- written, so the whole save failed.
grant select (website), update (website) on public.users to authenticated;
grant select (website), update (website) on public.communities to authenticated;
grant insert (website) on public.communities to authenticated;

-- A profile and a community are both public reads, same as the handles.
grant select (website) on public.users to anon;
grant select (website) on public.communities to anon;

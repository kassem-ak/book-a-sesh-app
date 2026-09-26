-- Creating a community sets everything, not just the name.
--
-- Starting a community asked for a name and nothing else: you made the thing,
-- then had to go and find the settings screen to say what sport it was about,
-- who could join and what it was for. The RPC was the reason -- it took one
-- argument and hard-coded about = '', leaving privacy and chat_mode on their
-- column defaults.
--
-- The new arguments all default, so the old one-argument call still works and
-- nothing that already calls this breaks.
--
-- Why one call rather than create-then-PATCH from the client: a PATCH that
-- fails leaves a half-made community sitting in the list with a name and
-- nothing else, which is the exact state this is meant to remove. The insert
-- carries the lot or none of it.
--
-- The picture and the gallery deliberately stay out. Both upload into storage
-- under the community's own uuid and the bucket policy checks that the caller
-- administers that community, so neither can exist before the row does.
--
-- Nothing from the client is trusted to be well formed, and nothing malformed
-- is allowed to sink the creation. An unknown privacy or chat mode falls back
-- to the column default, a sport that does not exist is dropped, and a social
-- handle that `communities_social_handles` would reject is stored as null --
-- the community is the thing being made here, and losing all of it over a
-- mistyped Instagram handle is the wrong trade.

create or replace function private.create_community_with_owner(
  p_name       text,
  p_about      text default '',
  p_privacy    text default 'open',
  p_sport_id   uuid default null,
  p_chat_mode  text default 'chatroom',
  p_instagram  text default null,
  p_facebook   text default null,
  p_tiktok     text default null
)
returns table(id uuid, slug text, name text, code text, tint text, about text, official boolean, members_count integer)
language plpgsql
security definer
set search_path to 'private', 'public', 'extensions'
as $function$
declare
  v_user uuid := require_app_user();
  v_base text;
  v_slug text;
  v_suffix int := 2;
  v_id uuid;
  v_code text;
  v_privacy community_privacy;
  v_chat community_chat_mode;
  v_sport uuid;
begin
  if length(trim(coalesce(p_name, ''))) = 0 then raise exception 'community name required'; end if;
  v_base := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then v_base := 'community'; end if;
  v_slug := v_base;
  while exists (select 1 from communities c where c.slug = v_slug) loop
    v_slug := v_base || '-' || v_suffix;
    v_suffix := v_suffix + 1;
  end loop;
  v_code := upper(left(nullif(regexp_replace(trim(p_name), '[^A-Za-z0-9]', '', 'g'), ''), 2));
  if v_code is null then v_code := 'CM'; end if;

  -- A value the enum does not know is the caller's mistake, not a reason to
  -- refuse to create the community. Fall back to what the column would have
  -- chosen anyway.
  v_privacy := case when p_privacy in (select unnest(enum_range(null::community_privacy))::text)
                    then p_privacy::community_privacy else 'open'::community_privacy end;
  v_chat := case when p_chat_mode in (select unnest(enum_range(null::community_chat_mode))::text)
                 then p_chat_mode::community_chat_mode else 'chatroom'::community_chat_mode end;

  -- A sport that does not exist would fail the foreign key and take the whole
  -- creation with it. The column is nullable on purpose, so drop it instead.
  select s.id into v_sport from sports s where s.id = p_sport_id and s.approved;

  -- The client reduces what was typed to a bare handle before sending it.
  -- This is the backstop for anything that arrives still looking like a URL.
  p_instagram := nullif(trim(coalesce(p_instagram, '')), '');
  p_facebook  := nullif(trim(coalesce(p_facebook, '')), '');
  p_tiktok    := nullif(trim(coalesce(p_tiktok, '')), '');
  if not is_social_handle(p_instagram) then p_instagram := null; end if;
  if not is_social_handle(p_facebook)  then p_facebook  := null; end if;
  if not is_social_handle(p_tiktok)    then p_tiktok    := null; end if;

  insert into communities (
    slug, name, code, tint, about, official, created_by, members_count,
    privacy, sport_id, chat_mode, instagram, facebook, tiktok
  )
  values (
    v_slug, trim(p_name), v_code, '#2F3A2A', coalesce(trim(p_about), ''), false, v_user, 1,
    v_privacy, v_sport, v_chat, p_instagram, p_facebook, p_tiktok
  )
  returning communities.id into v_id;

  -- Idempotent: trg_communities_seed_owner has very likely already written
  -- this row from the insert above.
  insert into community_members (community_id, user_id, role)
  values (v_id, v_user, 'owner')
  on conflict (community_id, user_id) do update set role = 'owner';

  return query select c.id, c.slug, c.name, c.code, c.tint, c.about, c.official, c.members_count
    from communities c where c.id = v_id;
end $function$;

-- The public wrapper mirrors the signature so PostgREST sees the new arguments.
create or replace function public.create_community_with_owner(
  p_name       text,
  p_about      text default '',
  p_privacy    text default 'open',
  p_sport_id   uuid default null,
  p_chat_mode  text default 'chatroom',
  p_instagram  text default null,
  p_facebook   text default null,
  p_tiktok     text default null
)
returns table(id uuid, slug text, name text, code text, tint text, about text, official boolean, members_count integer)
language plpgsql
set search_path to ''
as $function$
begin
  return query select * from private.create_community_with_owner(
    $1, $2, $3, $4, $5, $6, $7, $8
  );
end $function$;

-- `revoke from public` does not reach anon or authenticated: Supabase grants
-- those roles separately, so both have to be named.
revoke all on function public.create_community_with_owner(text, text, text, uuid, text, text, text, text) from public;
revoke all on function public.create_community_with_owner(text, text, text, uuid, text, text, text, text) from anon;
grant execute on function public.create_community_with_owner(text, text, text, uuid, text, text, text, text) to authenticated;

-- The old one-argument overload is dropped so PostgREST cannot resolve a call
-- to it and silently ignore every new field.
drop function if exists public.create_community_with_owner(text);
drop function if exists private.create_community_with_owner(text);

-- Remove the prototype attribution from newly created communities.
begin;

create or replace function create_community_with_owner(p_name text)
returns table(id uuid, slug text, name text, code text, tint text, about text, official boolean, members_count int)
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := require_app_user();
  v_base text;
  v_slug text;
  v_suffix int := 2;
  v_id uuid;
  v_code text;
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

  insert into communities (slug, name, code, tint, about, official, created_by, members_count)
  values (v_slug, trim(p_name), v_code, '#2F3A2A', '', false, v_user, 1)
  returning communities.id into v_id;

  insert into community_members (community_id, user_id, role)
  values (v_id, v_user, 'owner');

  return query select c.id, c.slug, c.name, c.code, c.tint, c.about, c.official, c.members_count from communities c where c.id = v_id;
end $$;

commit;

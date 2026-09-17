-- supabase db query --linked --file db/check_release_defaults.sql
-- Uses one existing account; every profile/community write is rolled back.
begin;
set local statement_timeout = '15s';
do $$
declare
  v_auth uuid;
  v_user uuid;
  v_name text;
  v_members bigint;
  v_community record;
begin
  select auth_id, id, name into v_auth, v_user, v_name
    from users where auth_id is not null order by created_at limit 1;
  if v_auth is null then raise exception 'Check requires one existing signed-in app account'; end if;
  perform set_config('request.jwt.claim.sub', v_auth::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_auth)::text, true);
  select count(*) into v_members from community_members where user_id = v_user;

  -- There is no guest tier any more. bootstrap_demo_session used to mint an
  -- app identity for an anonymous session; it must now refuse outright, and
  -- must not have touched the caller's name or memberships on the way out.
  begin
    perform bootstrap_demo_session();
    raise exception 'Guest bootstrap still succeeds';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm not like '%guest sessions are not supported%' then raise; end if;
  end;
  if (select name from users where id = v_user) is distinct from v_name then
    raise exception 'Guest bootstrap overwrote the account name';
  end if;
  if (select count(*) from community_members where user_id = v_user) <> v_members then
    raise exception 'Guest bootstrap granted a community role';
  end if;

  select * into v_community from create_community_with_owner('Release check ' || gen_random_uuid());
  if v_community.about is distinct from '' or v_community.official or v_community.members_count <> 1 then
    raise exception 'New community includes fabricated details';
  end if;
  if not exists (select 1 from community_members
      where community_id = v_community.id and user_id = v_user and role = 'owner') then
    raise exception 'Creator did not receive ownership';
  end if;
end $$;
rollback;
select 'Release defaults passed; all test writes rolled back' as result;

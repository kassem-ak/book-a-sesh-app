-- Applied to the live project on 2026-09-03.
--
-- The client has no SELECT on public.users (hardening.sql revokes it and
-- re-grants only non-sensitive columns), so the app cannot read is_admin to
-- work out who it is. This exposes the derived role and nothing else.
--
-- Precedence: designated platform admin > active, unexpired coach
-- subscription > regular user.
create or replace function public.my_account_role()
returns text
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_user  uuid;
  v_admin boolean;
  v_prole text;
  v_sub   text;
  v_end   date;
begin
  select id, is_admin, platform_role::text
    into v_user, v_admin, v_prole
    from users
   where auth_id = auth.uid();

  if v_user is null then
    return 'USER';
  end if;

  if coalesce(v_admin, false) or v_prole = 'admin' then
    return 'ADMIN';
  end if;

  select subscription_status::text, sub_period_end
    into v_sub, v_end
    from coach_profiles
   where user_id = v_user;

  if v_sub = 'active' and (v_end is null or v_end >= current_date) then
    return 'COACH';
  end if;

  return 'USER';
end $$;

revoke all on function public.my_account_role() from public;
grant execute on function public.my_account_role() to authenticated, anon;

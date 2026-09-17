-- BOOK'D has no guest tier: every account is a registered one. The app no
-- longer calls signInAnonymously, but removing the button is not enforcement --
-- anyone holding the publishable anon key could still mint a guest and call
-- this. The database is where that has to be refused.
--
-- bootstrap_demo_session linked an anonymous session to its own public.users
-- row. It was granted to PUBLIC, which is every role including anon.
revoke execute on function public.bootstrap_demo_session() from public;
revoke execute on function public.bootstrap_demo_session() from anon;
revoke execute on function public.bootstrap_demo_session() from authenticated;

-- An anonymous JWT carries the `authenticated` role with is_anonymous = true,
-- so role grants alone do not distinguish it. Refuse inside the function too:
-- a future grant, or any other caller, still cannot create a guest identity.
create or replace function public.bootstrap_demo_session()
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  raise exception 'guest sessions are not supported: register an account';
end $function$;

-- Applied live 17 September 2026. Grants afterwards: postgres, service_role.
--
-- NOT covered here: "Allow anonymous sign-ins" in the Supabase dashboard
-- (Authentication -> Sign In / Providers). While that is on, signInAnonymously
-- still issues a token -- it just cannot bootstrap an app identity any more.
-- Turn it off for defence in depth; it is a dashboard setting, not SQL.

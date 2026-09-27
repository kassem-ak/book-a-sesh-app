-- Take TRUNCATE away from anon and authenticated.
--
-- Supabase's setup grants ALL on every table in public to both roles and relies
-- on row-level security to hold the line. That works for select, insert, update
-- and delete. It does not work for TRUNCATE: row security has no rows to filter
-- there, so the policy is not consulted at all. A single truncate empties a
-- table whatever its policies say -- including safety_flags, reports and
-- bookings.
--
-- It is not reachable today. PostgREST has no TRUNCATE verb, so nothing holding
-- only an anon or authenticated key can issue one over the REST API. This is
-- removing the blast radius rather than closing a live hole: the day something
-- gains a way to run statements as those roles -- a SECURITY INVOKER helper
-- that builds SQL, a direct connection, a future feature -- the grant is
-- already there waiting.
--
-- Nothing legitimate truncates through these roles. Every destructive path the
-- app has goes through a SECURITY DEFINER function that deletes rows.

revoke truncate on all tables in schema public from anon, authenticated;

-- Tables created later must not quietly arrive with it again. The default
-- privileges Supabase installs are owned by the roles that create tables here.
alter default privileges in schema public revoke truncate on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke truncate on tables from anon, authenticated;
alter default privileges for role supabase_admin in schema public
  revoke truncate on tables from anon, authenticated;

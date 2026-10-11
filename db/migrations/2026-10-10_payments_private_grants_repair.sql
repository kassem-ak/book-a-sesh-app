-- Repair record. The first version of 2026-10-10_payments_core.sql section 4
-- ended with `revoke all on all functions in schema private from public, anon,
-- authenticated`. Schema private also holds the bodies of the older member
-- RPCs and the helpers that RLS policies call through NON-definer public
-- wrappers (current_app_user, is_platform_admin, can_manage_community, ...),
-- so that one line took member and logged-out reads down on production for a
-- few minutes ("permission denied for function current_app_user").
--
-- The committed payments_core.sql no longer contains the blanket revoke, so a
-- fresh replay never needs this file. It exists so the repo matches what was
-- applied live, as three migrations:
--   payments_core_flow_restore_private_grants   (authenticated back on helpers listing service_role)
--   payments_core_flow_restore_community_create (authenticated on private.create_community_with_owner)
--   payments_core_flow_restore_private_anon     (anon + authenticated on every non-payment private function)
--   payments_core_flow_restore_private_anon_tighten (anon off the three unreachable ones, below)
--
-- Idempotent: granting an existing privilege is a no-op.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'private'
       and p.proname not in ('post_entry','ensure_account','ledger_append_only','ledger_entry_balances',
                             'payments_enabled','payment_unallocated','close_if_settled','open_payment',
                             'confirm_subject','cancel_subject','mark_payment_held','fail_payment',
                             'add_release','release_due','refund_payment')
  loop
    execute format('grant execute on function %s to anon, authenticated', f.sig);
  end loop;
end $$;

-- Fourth entry, payments_core_flow_restore_private_anon_tighten: anon is only
-- kept where it is reachable -- a function named in an RLS policy, or the body
-- behind a public wrapper anon can already execute (whose body refuses anon
-- through require_app_user). Three are reachable only through wrappers anon
-- cannot run, so anon comes off them again.
revoke execute on function private.create_community_with_owner(text, text, text, uuid, text, text, text, text, text) from anon;
revoke execute on function private.set_community_membership(text, boolean) from anon;
revoke execute on function private.set_event_attendance(uuid, boolean) from anon;

-- Rule for every later payments migration: never `revoke ... on all functions
-- in schema private`. Revoke and grant the new functions by name.

-- guard_last_admin is a BEFORE trigger on users for INSERT/UPDATE/DELETE. On
-- DELETE of a non-admin row it fell through to `return new`, and `new` is NULL
-- in a DELETE trigger. A BEFORE trigger returning NULL silently cancels the
-- row operation -- no error, no rows deleted, and the caller sees success.
--
-- So every delete of a non-admin user row has been a no-op. That is how 32
-- orphaned "Guest" rows survived repeated cleanups that each reported success,
-- with their auth.users rows already gone and users.auth_id left dangling --
-- which is also why users_auth_id_fkey (ON DELETE CASCADE) never cleared them:
-- the cascade tried, and the trigger cancelled it.
--
-- DELETE must return OLD. The last-administrator protection is unchanged.
create or replace function public.guard_last_admin()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_remaining int;
begin
  -- Only interested in an account ceasing to be a usable admin: either the flag
  -- is being cleared, or the account is being soft-deleted while still admin.
  if tg_op = 'UPDATE'
     and old.is_admin
     and (new.is_admin is distinct from true or new.deleted_at is not null)
  then
    select count(*) into v_remaining
      from users
     where is_admin
       and deleted_at is null
       and id <> old.id;

    if v_remaining = 0 then
      raise exception 'refusing to remove the last platform administrator'
        using hint = 'Grant admin to another live account first.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    if old.is_admin then
      select count(*) into v_remaining
        from users
       where is_admin and deleted_at is null and id <> old.id;
      if v_remaining = 0 then
        raise exception 'refusing to delete the last platform administrator'
          using hint = 'Grant admin to another live account first.';
      end if;
    end if;
    -- Returning NEW here would be NULL, which cancels the delete in silence.
    return old;
  end if;

  return new;
end $function$;

-- Applied live 17 September 2026, then the 32 orphans were purged. Ownership of
-- community "Walid" was handed to its remaining real member first, so deleting
-- its guest owner did not leave it ownerless. Afterwards: 2 app users, 2 auth
-- users, 0 guests, 0 orphans, 0 ownerless communities, member counts consistent.

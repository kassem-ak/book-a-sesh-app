-- The three gates that never learned about 'offered'.
--
-- When the refund negotiation was added, `offered` went into the status CHECK
-- and into `package_is_cancelled`, so a pack with a figure on the table froze
-- correctly. It did not go into the three places that decide what either party
-- may DO with a request, all of which still read `status = 'requested'` and
-- therefore stop working the moment somebody makes an offer:
--
--   1. The client's withdraw policy. Its USING clause matches no row once the
--      status is 'offered', so the UPDATE affects zero rows and succeeds. "Take
--      it back" appeared to work and changed nothing.
--   2. `decide_package_cancellation`, which refuses any status but 'requested'.
--      The coach's "Decline the cancellation" button, which is only shown
--      during a negotiation, could therefore never succeed.
--   3. The one-open-request index, which is partial on 'requested'. Once a
--      request moved to 'offered' it stopped being covered, so a client could
--      open a second request on the same pack and end up with two negotiations
--      and two possible approvals over one purchase.
--
-- All three are the same omission, so they are fixed together.

-- ---------------------------------------------------------------------------
-- 1. Taking it back
-- ---------------------------------------------------------------------------

-- A figure being on the table is exactly when somebody most wants to stop. The
-- WITH CHECK still only permits 'withdrawn' as the destination, so this widens
-- what can be withdrawn and not what a client may write.
drop policy if exists cancel_client_withdraw on public.package_cancellations;
create policy cancel_client_withdraw on public.package_cancellations
  for update
  using (client_id = current_app_user() and status in ('requested', 'offered'))
  with check (client_id = current_app_user() and status in ('requested', 'offered', 'withdrawn'));

-- ---------------------------------------------------------------------------
-- 2. Declining during a negotiation
-- ---------------------------------------------------------------------------

create or replace function public.decide_package_cancellation(
  p_id uuid,
  p_status text,
  p_refund_cents int default null
)
returns table (id uuid, status text, refund_cents int)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_me uuid := require_app_user();
  v_row package_cancellations%rowtype;
begin
  if p_status not in ('approved', 'rejected') then
    raise exception 'A request is approved or rejected.';
  end if;

  select * into v_row from package_cancellations r where r.id = p_id;
  if v_row.id is null then
    raise exception 'That request no longer exists.';
  end if;
  if v_me <> v_row.coach_id then
    raise exception 'Only the coach can answer this request.';
  end if;
  -- 'offered' is still open: a coach who has been countered can still decide
  -- the whole thing is off rather than keep haggling.
  if v_row.status not in ('requested', 'offered') then
    raise exception 'That request has already been answered.';
  end if;

  -- An approval without an amount is half an answer: the client is left knowing
  -- the pack is cancelled and not knowing what they are getting back.
  if p_status = 'approved' and p_refund_cents is null then
    raise exception 'Say how much you are giving back, even if it is nothing.';
  end if;
  if p_refund_cents is not null and p_refund_cents < 0 then
    raise exception 'A refund cannot be negative.';
  end if;

  return query
    update package_cancellations r
       set status = p_status,
           refund_cents = case when p_status = 'approved' then p_refund_cents else null end,
           decided_by = v_me,
           decided_at = now()
     where r.id = p_id
    returning r.id, r.status, r.refund_cents;
end $function$;

revoke execute on function public.decide_package_cancellation(uuid, text, int) from public, anon;
grant execute on function public.decide_package_cancellation(uuid, text, int) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. One open request per pack, for both senses of open
-- ---------------------------------------------------------------------------

drop index if exists public.package_cancellations_one_open;
create unique index if not exists package_cancellations_one_open
  on public.package_cancellations (client_id, coach_id, package_id)
  where status in ('requested', 'offered');

-- ---------------------------------------------------------------------------
-- NOT APPLIED
-- ---------------------------------------------------------------------------
--
-- No database access this session. The index rebuild is the only part that can
-- fail on existing data: if any pack already has two open requests -- which the
-- gap above made possible -- the unique index will refuse to build. Find them
-- first:
--
--   select client_id, coach_id, package_id, count(*), array_agg(id)
--     from package_cancellations
--    where status in ('requested', 'offered')
--    group by 1, 2, 3
--   having count(*) > 1;
--
-- Withdraw the older of each pair before building the index; the newer one is
-- the live conversation.
--
-- Checks to run once applied, in a transaction that is rolled back:
--   client withdraws a 'requested'        -> withdrawn
--   client withdraws an 'offered'         -> withdrawn, not a silent no-op
--   client withdraws an 'approved'        -> refused
--   coach declines an 'offered'           -> rejected
--   coach approves an 'offered' with cash -> approved, amount recorded
--   second request while one is 'offered' -> refused by the index
--   coach tries to withdraw the client's  -> refused

-- Review fixes to 2026-10-11_payments_promo_codes.
--
-- 1. A code could be used twice. The use is only recorded when a payment lands,
--    so one code applied to two open checkouts passed on both, and both could
--    be paid at the discount. `apply_promo_code` now takes a lock per member and
--    code, and refuses the code while another of the member's payments carries
--    it (open, being charged, held or closed). Removing it from the first
--    checkout frees it. If a second capture still arrives, `mark_payment_held`
--    logs a warning instead of dropping the duplicate in silence.
--
-- 2. A complaint on a free session (a release of 0) decided with no refund was
--    marked refunded, so the coach was never paid the list price. A release is
--    now marked refunded only when something was refunded and nothing is left;
--    otherwise it goes back to waiting and is released.
--
-- 3. Codes are unique regardless of case, as they are matched. A coach code
--    typed on a court, tournament or event checkout says it only works for
--    coach sessions.
--
-- 4. A 100% code on a session pack left one zero-amount release worth the
--    whole list price, so the coach was paid for the full pack on the first
--    session even if the rest was cancelled. A code that makes a pack free is
--    refused; smaller codes on packs still apply.

-- ---------------------------------------------------------------------------
-- 3. Case-insensitive uniqueness (no live rows collide)
-- ---------------------------------------------------------------------------
create unique index if not exists platform_promos_code_upper_key on public.platform_promos (upper(code));
create unique index if not exists coach_promos_coach_code_upper_key on public.coach_promos (coach_id, upper(code));

-- ---------------------------------------------------------------------------
-- 1, 3 and 4. apply_promo_code
-- ---------------------------------------------------------------------------
create or replace function public.apply_promo_code(p_payment uuid, p_code text)
returns table (price_cents int, discount_cents int, fee_cents int, total_cents int, promo_kind text)
language plpgsql
security definer
set search_path to 'public', 'private'
as $function$
#variable_conflict use_column
declare
  v_me    uuid := require_app_user();
  v       payments;
  v_s     payment_settings;
  v_code  text := upper(btrim(coalesce(p_code, '')));
  v_kind  text; v_id uuid; v_pct int; v_aud promo_audience;
  v_orig  int; v_disc int; v_price int;
begin
  select * into v from payments p where p.id = p_payment for update;
  if not found or v.payer_id <> v_me then raise exception 'Payment not found.'; end if;
  if v.status <> 'awaiting_payment' or v.expires_at <= now() then
    raise exception 'This payment can no longer be changed.';
  end if;

  select 'coach', c.id, c.pct into v_kind, v_id, v_pct
    from coach_promos c
   where upper(c.code) = v_code and c.active and c.coach_id = v.payee_id and v.kind in ('session', 'package');
  if v_id is null then
    select 'platform', pp.id, pp.pct, pp.audience into v_kind, v_id, v_pct, v_aud
      from platform_promos pp where upper(pp.code) = v_code and pp.active;
  end if;
  if v_id is null then
    if exists (select 1 from coach_promos c where upper(c.code) = v_code and c.active) then
      if v.kind in ('session', 'package') then
        raise exception 'That code is for a different coach.';
      end if;
      raise exception 'That code only works for coach sessions.';
    end if;
    raise exception 'That code does not exist or has ended.';
  end if;

  if v_aud = 'new' and not exists (select 1 from users u where u.id = v_me and u.created_at > now() - interval '30 days') then
    raise exception 'That code is not available to your account.';
  end if;
  -- Activity before this checkout: the subject being paid for was created with the payment, so it does not count.
  -- Event attendance has no creation time; an event that took place in the last 30 days counts.
  if v_aud = 'inactive_30d' and (
       exists (select 1 from bookings b where b.client_id = v_me
                and b.created_at >= now() - interval '30 days' and b.created_at < v.created_at)
    or exists (select 1 from court_reservations cr where cr.client_id = v_me
                and cr.created_at >= now() - interval '30 days' and cr.created_at < v.created_at)
    or exists (select 1 from venue_event_entries ve where ve.client_id = v_me
                and ve.created_at >= now() - interval '30 days' and ve.created_at < v.created_at)
    or exists (select 1 from event_attendees ea join events e on e.id = ea.event_id
                where ea.user_id = v_me and e.starts_at >= now() - interval '30 days' and e.starts_at <= now())) then
    raise exception 'That code is not available to your account.';
  end if;

  -- One member, one code: serialise concurrent applies, then refuse it while another payment carries it.
  perform pg_advisory_xact_lock(hashtext(v_kind || ':' || v_id::text || ':' || v_me::text));
  if exists (select 1 from promo_redemptions r where r.promo_kind = v_kind and r.promo_id = v_id and r.user_id = v_me)
     or exists (select 1 from payments p
                 where p.payer_id = v_me and p.id <> p_payment and p.promo_kind = v_kind and p.promo_id = v_id
                   and p.status in ('awaiting_payment', 'charging', 'held', 'closed')) then
    raise exception 'You have already used that code.';
  end if;

  v_orig  := v.price_cents + v.discount_cents;
  v_disc  := round(v_orig * v_pct / 100.0)::int;
  v_price := v_orig - v_disc;
  if v.kind = 'package' and v_price = 0 then
    raise exception 'A 100%% code cannot be used on a session pack.';
  end if;
  select * into v_s from payment_settings;
  update payments p
     set price_cents      = v_price,
         discount_cents   = v_disc,
         list_price_cents = case when v_kind = 'platform' then v_orig else v_price end,
         fee_cents        = case when v_price = 0 then 0 else round(v_price * v_s.fee_bps / 10000.0)::int + v_s.fee_flat_cents end,
         promo_kind       = v_kind,
         promo_id         = v_id,
         promo_code       = v_code
   where p.id = p_payment
  returning * into v;
  return query select v.price_cents, v.discount_cents, v.fee_cents, v.price_cents + v.fee_cents, v.promo_kind;
end $function$;

-- ---------------------------------------------------------------------------
-- 1. mark_payment_held: a duplicate redemption is logged, not dropped in silence
-- ---------------------------------------------------------------------------
create or replace function private.mark_payment_held(p_payment uuid, p_ref text, p_cost integer, p_method uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'private'
as $function$
declare v payments; v_red uuid;
begin
  select * into v from payments where id = p_payment for update;
  if v.status in ('held','closed') then return; end if;
  if v.status <> 'charging' then raise exception 'This payment is %, not being charged.', v.status; end if;

  update payments set status = 'held', provider_ref = p_ref, method_id = p_method, held_at = now()
   where id = p_payment returning * into v;

  perform private.post_entry('checkout', 'checkout:' || v.id, 'payment', v.id, jsonb_build_array(
    jsonb_build_object('account', 'company_cash', 'amount', v.price_cents + v.fee_cents),
    jsonb_build_object('account', 'held',         'amount', -v.price_cents),
    jsonb_build_object('account', 'fee_income',   'amount', -v.fee_cents)));
  if p_cost > 0 then
    perform private.post_entry('gateway_cost', 'gateway_cost:' || v.id, 'payment', v.id, jsonb_build_array(
      jsonb_build_object('account', 'gateway_cost', 'amount', p_cost),
      jsonb_build_object('account', 'company_cash', 'amount', -p_cost)));
  end if;

  -- Captured money is always recorded above. If the subject is gone, give it back (the fee stays).
  if not private.confirm_subject(v) then
    perform private.refund_payment(v.id, v.price_cents, 'cancelled before the payment landed');
  elsif v.promo_id is not null then
    insert into promo_redemptions (promo_kind, promo_id, user_id, payment_id)
    values (v.promo_kind, v.promo_id, v.payer_id, v.id)
    on conflict do nothing
    returning id into v_red;
    if v_red is null then
      raise warning 'promo % already redeemed by %; payment % captured without a fresh redemption', v.promo_code, v.payer_id, v.id;
    end if;
  end if;
end $function$;

-- ---------------------------------------------------------------------------
-- 2. resolve_dispute: a zero release decided with no refund is released
-- ---------------------------------------------------------------------------
create or replace function public.resolve_dispute(p_dispute uuid, p_refund_cents integer, p_actor uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'private'
as $function$
declare d disputes; r payment_releases; v_rate int; v_left int;
begin
  select * into d from disputes where id = p_dispute for update;
  if not found then raise exception 'Complaint % not found.', p_dispute; end if;
  if d.status <> 'open' then raise exception 'This complaint is already decided.'; end if;
  select * into r from payment_releases where id = d.release_id for update;
  if not found then raise exception 'Release for complaint % not found.', p_dispute; end if;
  if p_refund_cents is null or p_refund_cents < 0 or p_refund_cents > r.amount_cents then raise exception 'Refund must be between 0 and %.', r.amount_cents; end if;

  if p_refund_cents > 0 then
    perform private.refund_payment(r.payment_id, p_refund_cents, 'complaint upheld', r.id);
  end if;
  v_left := r.amount_cents - p_refund_cents;
  select rate_bps into v_rate from payments where id = r.payment_id;
  if v_left = 0 and p_refund_cents > 0 then
    update payment_releases set status = 'refunded' where id = r.id;
  else
    update payment_releases
       set amount_cents = v_left, commission_cents = round(v_left * v_rate / 10000.0)::int,
           status = 'waiting', release_at = now() where id = r.id;
  end if;
  update disputes set status = case when p_refund_cents > 0 then 'refunded' else 'released' end,
                      refund_cents = p_refund_cents, resolved_by = p_actor, resolved_at = now()
   where id = p_dispute;
  perform private.release_due();
  perform private.close_if_settled(r.payment_id);
end $function$;

revoke execute on function public.apply_promo_code(uuid, text) from public, anon;
grant execute on function public.apply_promo_code(uuid, text) to authenticated;
revoke execute on function private.mark_payment_held(uuid, text, integer, uuid) from public, anon, authenticated;
grant execute on function private.mark_payment_held(uuid, text, integer, uuid) to service_role;
revoke execute on function public.resolve_dispute(uuid, integer, uuid) from public, anon, authenticated;
grant execute on function public.resolve_dispute(uuid, integer, uuid) to service_role;

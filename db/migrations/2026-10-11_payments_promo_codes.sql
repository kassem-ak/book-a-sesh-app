-- Promo codes at checkout: coach codes and platform codes.
--
-- A member types a code on an unpaid checkout. A coach code lowers the coach's
-- price: the coach bears the discount and commission is taken on the lower
-- price. A platform code is borne by the company: the member pays less, the
-- coach is paid the full price minus the normal commission, and the difference
-- is posted to `promo_expense` when the money is released.
--
-- `payments.price_cents` keeps its meaning (what the member pays, what is held
-- and what can be refunded). `list_price_cents` is what the payee's side is
-- worth; it differs from the price only under a platform code. A 100% code
-- leaves a price of 0, which is captured without a gateway call
-- (`payments_mark_held('free:' || id, 0, null)`).
--
-- One code per payment; each code once per member. The use is recorded when
-- the payment lands and its booking is confirmed, not when the code is typed.
--
-- Free payments needed two small changes outside the promo lines:
-- `add_release` makes one zero-amount release for a free payment so the coach
-- is still paid the list price, and `refund_payment` accepts a refund of 0
-- (nothing to give back) and closes the payment instead of raising, so a free
-- booking can be cancelled.

-- ---------------------------------------------------------------------------
-- Payments: list price, discount and the code used
-- ---------------------------------------------------------------------------
alter table public.payments
  add column if not exists list_price_cents int,
  add column if not exists discount_cents   int not null default 0 check (discount_cents >= 0),
  add column if not exists promo_kind       text check (promo_kind in ('coach', 'platform')),
  add column if not exists promo_id         uuid,
  add column if not exists promo_code       text;

update public.payments set list_price_cents = price_cents where list_price_cents is null;
alter table public.payments alter column list_price_cents set not null;
alter table public.payments add constraint payments_list_price_cents_check check (list_price_cents >= 0);

alter table public.payments drop constraint payments_price_cents_check;
alter table public.payments add constraint payments_price_cents_check
  check (price_cents >= 0 and (price_cents > 0 or discount_cents > 0));

-- ---------------------------------------------------------------------------
-- Redemptions: one use of each code per member
-- ---------------------------------------------------------------------------
create table if not exists public.promo_redemptions (
  id         uuid primary key default gen_random_uuid(),
  promo_kind text not null check (promo_kind in ('coach', 'platform')),
  promo_id   uuid not null,
  user_id    uuid not null references public.users(id) on delete restrict,
  payment_id uuid not null references public.payments(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (promo_kind, promo_id, user_id)
);
alter table public.promo_redemptions enable row level security;
revoke all on public.promo_redemptions from public, anon, authenticated;
grant all on public.promo_redemptions to service_role;
grant select on public.promo_redemptions to authenticated;
drop policy if exists promo_redemptions_own on public.promo_redemptions;
create policy promo_redemptions_own on public.promo_redemptions for select to authenticated
  using (user_id = current_app_user());

insert into public.ledger_accounts (code, kind) values ('promo_expense', 'expense') on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- open_payment: every payment starts with list price = price
-- ---------------------------------------------------------------------------
create or replace function private.open_payment(p_kind text, p_subject uuid, p_payer uuid, p_payee uuid, p_price integer, p_sessions integer DEFAULT NULL::integer)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public', 'private'
as $function$
declare v_id uuid; v_s payment_settings; v_rate int;
begin
  if p_payee is null then raise exception 'This venue cannot take payments yet.'; end if;
  if p_payee = p_payer then raise exception 'You cannot pay yourself.'; end if;
  if p_price is null or p_price <= 0 then raise exception 'Nothing to pay.'; end if;
  select * into v_s from payment_settings;
  select coalesce(
           (select round(pct * 100)::int from platform_margins where key::text = p_kind),
           (select round(pct * 100)::int from platform_margins where key = 'session'),
           1200)
    into v_rate;
  insert into payments (kind, subject_id, payer_id, payee_id, price_cents, list_price_cents, fee_cents, rate_bps,
                        package_sessions, provider, expires_at)
  values (p_kind, p_subject, p_payer, p_payee, p_price, p_price,
          case when p_price = 0 then 0 else round(p_price * v_s.fee_bps / 10000.0)::int + v_s.fee_flat_cents end,
          v_rate, p_sessions, v_s.provider, now() + make_interval(mins => v_s.checkout_minutes))
  returning id into v_id;
  return v_id;
end $function$;

-- ---------------------------------------------------------------------------
-- apply_promo_code / remove_promo_code (the member, on an unpaid checkout)
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
      raise exception 'That code is for a different coach.';
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

  if exists (select 1 from promo_redemptions r where r.promo_kind = v_kind and r.promo_id = v_id and r.user_id = v_me) then
    raise exception 'You have already used that code.';
  end if;

  v_orig  := v.price_cents + v.discount_cents;
  v_disc  := round(v_orig * v_pct / 100.0)::int;
  v_price := v_orig - v_disc;
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

create or replace function public.remove_promo_code(p_payment uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'private'
as $function$
declare v_me uuid := require_app_user(); v payments; v_s payment_settings; v_price int;
begin
  select * into v from payments p where p.id = p_payment for update;
  if not found or v.payer_id <> v_me then raise exception 'Payment not found.'; end if;
  if v.status <> 'awaiting_payment' or v.expires_at <= now() then
    raise exception 'This payment can no longer be changed.';
  end if;
  v_price := v.price_cents + v.discount_cents;
  select * into v_s from payment_settings;
  update payments p
     set price_cents      = v_price,
         discount_cents   = 0,
         list_price_cents = v_price,
         fee_cents        = case when v_price = 0 then 0 else round(v_price * v_s.fee_bps / 10000.0)::int + v_s.fee_flat_cents end,
         promo_kind       = null,
         promo_id         = null,
         promo_code       = null
   where p.id = p_payment;
end $function$;

revoke execute on function public.apply_promo_code(uuid, text) from public, anon;
grant execute on function public.apply_promo_code(uuid, text) to authenticated;
revoke execute on function public.remove_promo_code(uuid) from public, anon;
grant execute on function public.remove_promo_code(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- mark_payment_held: record the code's use once the booking is confirmed
-- ---------------------------------------------------------------------------
create or replace function private.mark_payment_held(p_payment uuid, p_ref text, p_cost integer, p_method uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'private'
as $function$
declare v payments;
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
    on conflict do nothing;
  end if;
end $function$;

-- ---------------------------------------------------------------------------
-- release_due: pay the payee on the list price; the company bears a platform code
-- ---------------------------------------------------------------------------
create or replace function private.release_due()
 returns integer
 language plpgsql
 security definer
 set search_path to 'public', 'private'
as $function$
declare r record; v_n int := 0; v_method uuid; v_share int; v_gross int; v_commission int;
begin
  for r in
    select rel.*, p.payee_id, p.price_cents, p.list_price_cents, p.rate_bps
      from payment_releases rel join payments p on p.id = rel.payment_id
     where rel.status = 'waiting' and rel.release_at <= now()
     for update of rel skip locked
  loop
    -- What this release is worth to the payee: above the amount held only under a platform code.
    v_gross := case when r.price_cents > 0 then round(r.amount_cents::numeric * r.list_price_cents / r.price_cents)::int
                    else r.list_price_cents end;
    v_commission := case when v_gross = r.amount_cents then r.commission_cents
                         else round(v_gross * r.rate_bps / 10000.0)::int end;
    v_share := v_gross - v_commission;
    perform private.ensure_account('payee:' || r.payee_id, 'liability', r.payee_id);
    perform private.post_entry('release', 'release:' || r.id, 'payment_release', r.id, jsonb_build_array(
      jsonb_build_object('account', 'held',                 'amount', r.amount_cents),
      jsonb_build_object('account', 'payee:' || r.payee_id, 'amount', -v_share),
      jsonb_build_object('account', 'commission_revenue',   'amount', -v_commission),
      jsonb_build_object('account', 'promo_expense',        'amount', v_gross - r.amount_cents)));
    update payment_releases set status = 'released', released_at = now(), commission_cents = v_commission where id = r.id;

    if v_share > 0 then
      select id into v_method from payment_methods
       where user_id = r.payee_id and default_receive and removed_at is null;
      insert into payee_payouts (payee_id, release_id, method_id, amount_cents, status)
      values (r.payee_id, r.id, v_method, v_share, case when v_method is null then 'waiting_method' else 'queued' end);
    end if;

    perform private.close_if_settled(r.payment_id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $function$;

-- ---------------------------------------------------------------------------
-- add_release: a free payment gets one zero-amount release (the payee is paid the list price)
-- ---------------------------------------------------------------------------
create or replace function private.add_release(p_payment uuid, p_subject uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'private'
as $function$
declare v payments; v_n int; v_amount int; v_left int; v_hours int;
begin
  select * into v from payments where id = p_payment for update;
  if v.status <> 'held' then return; end if;
  v_left := private.payment_unallocated(p_payment);
  if v.kind = 'package' and v.package_sessions is not null then
    select count(*) into v_n from payment_releases where payment_id = p_payment;
    v_amount := case when v_n + 1 >= v.package_sessions then v_left
                     else v.price_cents / v.package_sessions end;
  else
    v_amount := v_left;
  end if;
  v_amount := least(v_amount, v_left);
  if v_amount <= 0 and (v.price_cents > 0 or exists (select 1 from payment_releases where payment_id = p_payment)) then
    return;
  end if;

  select dispute_window_hours into v_hours from payment_settings;
  insert into payment_releases (payment_id, subject_id, amount_cents, commission_cents, release_at)
  values (p_payment, p_subject, v_amount, round(v_amount * v.rate_bps / 10000.0)::int,
          now() + make_interval(hours => v_hours))
  on conflict (payment_id, subject_id) do nothing;
end $function$;

-- ---------------------------------------------------------------------------
-- refund_payment: nothing to refund (a free payment) closes instead of raising
-- ---------------------------------------------------------------------------
create or replace function private.refund_payment(p_payment uuid, p_amount integer, p_reason text, p_release uuid DEFAULT NULL::uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'private'
as $function$
declare v payments; v_amount int; v_id uuid;
begin
  if p_amount is null or p_amount < 0 then raise exception 'Refund amount must be positive.'; end if;
  select * into v from payments where id = p_payment for update;
  if not found then raise exception 'Payment % not found.', p_payment; end if;
  if v.status <> 'held' then return; end if;
  if p_release is null then
    v_amount := least(p_amount, private.payment_unallocated(p_payment));
  else
    v_amount := least(p_amount, coalesce((select amount_cents from payment_releases
                                           where id = p_release and payment_id = p_payment and status = 'disputed'), 0));
  end if;
  if coalesce(v_amount, 0) <= 0 then
    if p_release is null then perform private.close_if_settled(p_payment); end if;
    return;
  end if;

  insert into refunds (payment_id, release_id, member_id, amount_cents, reason)
  values (p_payment, p_release, v.payer_id, v_amount, p_reason) returning id into v_id;
  perform private.ensure_account('member_refund:' || v.payer_id, 'liability', v.payer_id);
  perform private.post_entry('refund', 'refund:' || v_id, 'refund', v_id, jsonb_build_array(
    jsonb_build_object('account', 'held',                         'amount', v_amount),
    jsonb_build_object('account', 'member_refund:' || v.payer_id, 'amount', -v_amount)));
  if p_release is null then perform private.close_if_settled(p_payment); end if;
end $function$;

revoke execute on function private.open_payment(text, uuid, uuid, uuid, integer, integer) from public, anon, authenticated;
grant execute on function private.open_payment(text, uuid, uuid, uuid, integer, integer) to service_role;
revoke execute on function private.mark_payment_held(uuid, text, integer, uuid) from public, anon, authenticated;
grant execute on function private.mark_payment_held(uuid, text, integer, uuid) to service_role;
revoke execute on function private.release_due() from public, anon, authenticated;
grant execute on function private.release_due() to service_role;
revoke execute on function private.add_release(uuid, uuid) from public, anon, authenticated;
grant execute on function private.add_release(uuid, uuid) to service_role;
revoke execute on function private.refund_payment(uuid, integer, text, uuid) from public, anon, authenticated;
grant execute on function private.refund_payment(uuid, integer, text, uuid) to service_role;

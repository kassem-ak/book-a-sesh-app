-- Payments core: what was paid, by whom, for what, and where it is now.
--
-- payments          one checkout (price + fee), held until the service is done
-- payment_releases  one release per completed session/reservation/event; waits
--                   out the complaint period, then moves money to the payee
-- refunds / payouts the money-out queue the payments edge function works through
-- disputes          a member's "report a problem" on one release
--
-- Members read their own rows. Nobody writes these tables directly: every
-- change goes through the functions below, which also post the ledger.

-- ============================================================================
-- 1. Settings and rates
-- ============================================================================
insert into public.platform_margins (key, pct)
select k::public.margin_key, coalesce((select pct from public.platform_margins where key = 'session'), 12)
  from unnest(array['package','court','tournament','event']) as k
on conflict (key) do nothing;

create table if not exists public.payment_settings (
  id                   boolean primary key default true check (id),
  mode                 text not null default 'test' check (mode in ('test','live')),
  provider             text not null default 'test',
  enabled_kinds        text[] not null default '{}'
                       check (enabled_kinds <@ array['session','package','court','tournament','event']),
  fee_bps              int not null default 0 check (fee_bps between 0 and 2000),
  fee_flat_cents       int not null default 0 check (fee_flat_cents between 0 and 10000),
  dispute_window_hours int not null default 48 check (dispute_window_hours between 0 and 720),
  checkout_minutes     int not null default 15 check (checkout_minutes between 5 and 120),
  updated_at           timestamptz not null default now(),
  check ((mode = 'test') = (provider = 'test'))
);
insert into public.payment_settings default values on conflict (id) do nothing;
alter table public.payment_settings enable row level security;
drop policy if exists payment_settings_read on public.payment_settings;
create policy payment_settings_read on public.payment_settings for select to anon, authenticated using (true);
revoke insert, update, delete, truncate on public.payment_settings from public, anon, authenticated;
grant select on public.payment_settings to anon, authenticated;

-- ============================================================================
-- 2. Tables
-- ============================================================================
create table if not exists public.payment_methods (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  kind            text not null check (kind in ('card','whish')),
  provider        text not null,
  token           text not null,
  display         text not null,
  can_pay         boolean not null default true,
  can_receive     boolean not null default false,
  default_pay     boolean not null default false,
  default_receive boolean not null default false,
  created_at      timestamptz not null default now(),
  removed_at      timestamptz,
  check (not default_receive or can_receive),
  check (not default_pay or can_pay)
);
create unique index if not exists payment_methods_one_default_pay
  on public.payment_methods (user_id) where default_pay and removed_at is null;
create unique index if not exists payment_methods_one_default_receive
  on public.payment_methods (user_id) where default_receive and removed_at is null;

create table if not exists public.payments (
  id               uuid primary key default gen_random_uuid(),
  kind             text not null check (kind in ('session','package','court','tournament','event')),
  subject_id       uuid not null,
  payer_id         uuid not null references public.users(id) on delete restrict,
  payee_id         uuid not null references public.users(id) on delete restrict,
  price_cents      int not null check (price_cents > 0),
  fee_cents        int not null check (fee_cents >= 0),
  rate_bps         int not null check (rate_bps between 0 and 10000),
  package_sessions int check (package_sessions > 0),
  status           text not null default 'awaiting_payment'
                   check (status in ('awaiting_payment','charging','held','closed','failed','expired','cancelled')),
  provider         text not null,
  provider_ref     text unique,
  method_id        uuid references public.payment_methods(id),
  expires_at       timestamptz not null,
  held_at          timestamptz,
  created_at       timestamptz not null default now()
);
create unique index if not exists payments_one_open_per_subject
  on public.payments (kind, subject_id, payer_id) where status in ('awaiting_payment','charging','held');
create index if not exists payments_payer_idx on public.payments (payer_id, created_at desc);
create index if not exists payments_payee_idx on public.payments (payee_id, created_at desc);

create table if not exists public.payment_releases (
  id               uuid primary key default gen_random_uuid(),
  payment_id       uuid not null references public.payments(id) on delete restrict,
  subject_id       uuid not null,
  amount_cents     int not null check (amount_cents >= 0),
  commission_cents int not null check (commission_cents >= 0),
  release_at       timestamptz not null,
  status           text not null default 'waiting' check (status in ('waiting','disputed','released','refunded')),
  released_at      timestamptz,
  created_at       timestamptz not null default now(),
  unique (payment_id, subject_id)
);

create table if not exists public.refunds (
  id           uuid primary key default gen_random_uuid(),
  payment_id   uuid not null references public.payments(id) on delete restrict,
  release_id   uuid references public.payment_releases(id),
  member_id    uuid not null references public.users(id) on delete restrict,
  amount_cents int not null check (amount_cents > 0),
  reason       text not null,
  status       text not null default 'queued' check (status in ('queued','sending','sent','failed')),
  provider_ref text,
  failure      text,
  created_at   timestamptz not null default now(),
  sent_at      timestamptz
);

create table if not exists public.payee_payouts (
  id           uuid primary key default gen_random_uuid(),
  payee_id     uuid not null references public.users(id) on delete restrict,
  release_id   uuid references public.payment_releases(id),
  method_id    uuid references public.payment_methods(id),
  amount_cents int not null check (amount_cents > 0),
  fee_cents    int not null default 0,
  status       text not null default 'queued' check (status in ('waiting_method','queued','sending','sent','failed')),
  provider_ref text,
  failure      text,
  created_at   timestamptz not null default now(),
  sent_at      timestamptz
);

create table if not exists public.disputes (
  id           uuid primary key default gen_random_uuid(),
  release_id   uuid not null unique references public.payment_releases(id),
  raised_by    uuid not null references public.users(id) on delete restrict,
  reason       text not null,
  status       text not null default 'open' check (status in ('open','released','refunded')),
  refund_cents int,
  resolved_by  uuid references public.users(id),
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- ============================================================================
-- 3. Who may read what. No member writes anything here directly.
-- ============================================================================
alter table public.payment_methods  enable row level security;
alter table public.payments         enable row level security;
alter table public.payment_releases enable row level security;
alter table public.refunds          enable row level security;
alter table public.payee_payouts          enable row level security;
alter table public.disputes         enable row level security;

revoke all on public.payment_methods, public.payments, public.payment_releases,
              public.refunds, public.payee_payouts, public.disputes from public, anon, authenticated;
grant all on public.payment_methods, public.payments, public.payment_releases,
             public.refunds, public.payee_payouts, public.disputes to service_role;

-- The token never leaves the server.
grant select (id, user_id, kind, display, can_pay, can_receive, default_pay, default_receive, created_at)
  on public.payment_methods to authenticated;
grant select on public.payments, public.payment_releases, public.refunds, public.payee_payouts, public.disputes to authenticated;

drop policy if exists payment_methods_own on public.payment_methods;
create policy payment_methods_own on public.payment_methods for select to authenticated
  using (user_id = current_app_user() and removed_at is null);

drop policy if exists payments_party on public.payments;
create policy payments_party on public.payments for select to authenticated
  using (payer_id = current_app_user() or payee_id = current_app_user());

drop policy if exists payment_releases_party on public.payment_releases;
create policy payment_releases_party on public.payment_releases for select to authenticated
  using (exists (select 1 from public.payments p where p.id = payment_id
                  and (p.payer_id = current_app_user() or p.payee_id = current_app_user())));

drop policy if exists refunds_party on public.refunds;
create policy refunds_party on public.refunds for select to authenticated
  using (exists (select 1 from public.payments p where p.id = payment_id
                  and (p.payer_id = current_app_user() or p.payee_id = current_app_user())));

drop policy if exists payee_payouts_own on public.payee_payouts;
create policy payee_payouts_own on public.payee_payouts for select to authenticated
  using (payee_id = current_app_user());

drop policy if exists disputes_party on public.disputes;
create policy disputes_party on public.disputes for select to authenticated
  using (exists (select 1 from public.payment_releases r join public.payments p on p.id = r.payment_id
                  where r.id = release_id
                    and (p.payer_id = current_app_user() or p.payee_id = current_app_user())));

create or replace function public.remove_payment_method(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := require_app_user();
begin
  update payment_methods set removed_at = now(), default_pay = false, default_receive = false
   where id = p_id and user_id = v_me and removed_at is null;
  if not found then raise exception 'That payment method is not yours.'; end if;
end $$;

create or replace function public.set_default_payment_method(p_id uuid, p_purpose text) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := require_app_user(); v_m payment_methods;
begin
  select * into v_m from payment_methods where id = p_id and user_id = v_me and removed_at is null;
  if not found then raise exception 'That payment method is not yours.'; end if;
  if p_purpose = 'pay' then
    if not v_m.can_pay then raise exception 'This method cannot be used to pay.'; end if;
    update payment_methods set default_pay = false where user_id = v_me and default_pay;
    update payment_methods set default_pay = true where id = p_id;
  elsif p_purpose = 'receive' then
    if not v_m.can_receive then raise exception 'Money can only be received into a Whish account.'; end if;
    update payment_methods set default_receive = false where user_id = v_me and default_receive;
    update payment_methods set default_receive = true where id = p_id;
    -- Anything that was waiting for somewhere to go can go now.
    update payee_payouts set method_id = p_id, status = 'queued' where payee_id = v_me and status = 'waiting_method';
  else
    raise exception 'Unknown purpose %', p_purpose;
  end if;
end $$;

revoke execute on function public.remove_payment_method(uuid) from public, anon;
grant execute on function public.remove_payment_method(uuid) to authenticated;
revoke execute on function public.set_default_payment_method(uuid, text) from public, anon;
grant execute on function public.set_default_payment_method(uuid, text) to authenticated;

-- ============================================================================
-- 4. Payment state. Every function sets app.payments_internal so the existing
--    booking/reservation status guards let the payment system through (4f).
-- ============================================================================

-- 4a. Helpers ----------------------------------------------------------------
create or replace function private.payments_enabled(p_kind text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p_kind = any(enabled_kinds) from payment_settings), false);
$$;

create or replace function private.payment_unallocated(p_payment uuid) returns int
language sql stable security definer set search_path = public as $$
  select p.price_cents
       - coalesce((select sum(r.amount_cents) from payment_releases r where r.payment_id = p.id and r.status <> 'refunded'), 0)
       - coalesce((select sum(f.amount_cents) from refunds f where f.payment_id = p.id), 0)
    from payments p where p.id = p_payment;
$$;

create or replace function private.close_if_settled(p_payment uuid) returns void
language plpgsql security definer set search_path = public, private as $$
begin
  update payments set status = 'closed'
   where id = p_payment and status = 'held'
     and private.payment_unallocated(p_payment) = 0
     and not exists (select 1 from payment_releases where payment_id = p_payment and status in ('waiting','disputed'));
end $$;

-- 4b. Opening ----------------------------------------------------------------
create or replace function private.open_payment(
  p_kind text, p_subject uuid, p_payer uuid, p_payee uuid, p_price int, p_sessions int default null)
returns uuid language plpgsql security definer set search_path = public, private as $$
declare v_id uuid; v_s payment_settings; v_rate int;
begin
  if p_payee is null then raise exception 'This venue cannot take payments yet.'; end if;
  if p_payee = p_payer then raise exception 'You cannot pay yourself.'; end if;
  select * into v_s from payment_settings;
  select coalesce(
           (select round(pct * 100)::int from platform_margins where key::text = p_kind),
           (select round(pct * 100)::int from platform_margins where key = 'session'),
           1200)
    into v_rate;
  insert into payments (kind, subject_id, payer_id, payee_id, price_cents, fee_cents, rate_bps,
                        package_sessions, provider, expires_at)
  values (p_kind, p_subject, p_payer, p_payee, p_price,
          round(p_price * v_s.fee_bps / 10000.0)::int + v_s.fee_flat_cents,
          v_rate, p_sessions, v_s.provider, now() + make_interval(mins => v_s.checkout_minutes))
  returning id into v_id;
  return v_id;
end $$;

-- 4c. Subjects: confirm when paid, cancel when not ----------------------------
create or replace function private.confirm_subject(p_payment payments) returns void
language plpgsql security definer set search_path = public, private as $$
begin
  perform set_config('app.payments_internal', 'on', true);
  if p_payment.kind = 'session' then
    update bookings set status = 'confirmed' where id = p_payment.subject_id and status = 'pending';
  elsif p_payment.kind = 'package' then
    update bookings b set status = 'confirmed'
      from bookings first
     where first.id = p_payment.subject_id
       and b.client_id = first.client_id and b.package_id = first.package_id and b.status = 'pending';
  elsif p_payment.kind = 'court' then
    update court_reservations set status = 'confirmed' where id = p_payment.subject_id and status = 'pending';
  elsif p_payment.kind = 'tournament' then
    update venue_event_entries set status = 'confirmed' where id = p_payment.subject_id and status = 'pending';
  elsif p_payment.kind = 'event' then
    perform public.mark_event_payment_settled(p_payment.subject_id, p_payment.payer_id,
                                              p_payment.provider_ref, p_payment.price_cents);
  end if;
  perform set_config('app.payments_internal', 'off', true);
end $$;

create or replace function private.cancel_subject(p_payment payments) returns void
language plpgsql security definer set search_path = public, private as $$
declare v_pkg uuid; v_coach uuid;
begin
  perform set_config('app.payments_internal', 'on', true);
  if p_payment.kind = 'session' then
    update bookings set status = 'cancelled' where id = p_payment.subject_id and status = 'pending';
  elsif p_payment.kind = 'package' then
    select package_id, coach_id into v_pkg, v_coach from bookings where id = p_payment.subject_id;
    update bookings set status = 'cancelled'
     where client_id = p_payment.payer_id and package_id = v_pkg and status = 'pending';
    -- The pack was never bought: drop its balance unless a session of it is still live.
    delete from client_package_balances
     where client_id = p_payment.payer_id and coach_id = v_coach and package_id = v_pkg
       and not exists (select 1 from bookings where client_id = p_payment.payer_id and package_id = v_pkg
                        and status in ('confirmed','completed','no_show'));
  elsif p_payment.kind = 'court' then
    update court_reservations set status = 'cancelled' where id = p_payment.subject_id and status = 'pending';
  elsif p_payment.kind = 'tournament' then
    update venue_event_entries set status = 'cancelled' where id = p_payment.subject_id and status = 'pending';
  elsif p_payment.kind = 'event' then
    delete from event_attendees
     where event_id = p_payment.subject_id and user_id = p_payment.payer_id and payment = 'pending';
  end if;
  perform set_config('app.payments_internal', 'off', true);
end $$;

-- 4d. Money in, money held, money released -----------------------------------
create or replace function private.mark_payment_held(p_payment uuid, p_ref text, p_cost int, p_method uuid)
returns void language plpgsql security definer set search_path = public, private as $$
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

  perform private.confirm_subject(v);
end $$;

create or replace function private.fail_payment(p_payment uuid, p_status text) returns void
language plpgsql security definer set search_path = public, private as $$
declare v payments;
begin
  if p_status not in ('failed','expired','cancelled') then raise exception 'Unknown failure %', p_status; end if;
  -- Only an unpaid checkout can fail. 'charging' is left alone: the gateway is mid-call.
  update payments set status = p_status where id = p_payment and status = 'awaiting_payment' returning * into v;
  if not found then return; end if;
  perform private.cancel_subject(v);
end $$;

create or replace function private.add_release(p_payment uuid, p_subject uuid) returns void
language plpgsql security definer set search_path = public, private as $$
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
  if v_amount <= 0 then return; end if;

  select dispute_window_hours into v_hours from payment_settings;
  insert into payment_releases (payment_id, subject_id, amount_cents, commission_cents, release_at)
  values (p_payment, p_subject, v_amount, round(v_amount * v.rate_bps / 10000.0)::int,
          now() + make_interval(hours => v_hours))
  on conflict (payment_id, subject_id) do nothing;
end $$;

create or replace function private.release_due() returns int
language plpgsql security definer set search_path = public, private as $$
declare r record; v_n int := 0; v_method uuid; v_share int;
begin
  for r in
    select rel.*, p.payee_id
      from payment_releases rel join payments p on p.id = rel.payment_id
     where rel.status = 'waiting' and rel.release_at <= now()
     for update of rel skip locked
  loop
    v_share := r.amount_cents - r.commission_cents;
    perform private.ensure_account('payee:' || r.payee_id, 'liability', r.payee_id);
    perform private.post_entry('release', 'release:' || r.id, 'payment_release', r.id, jsonb_build_array(
      jsonb_build_object('account', 'held',                 'amount', r.amount_cents),
      jsonb_build_object('account', 'payee:' || r.payee_id, 'amount', -v_share),
      jsonb_build_object('account', 'commission_revenue',   'amount', -r.commission_cents)));
    update payment_releases set status = 'released', released_at = now() where id = r.id;

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
end $$;

create or replace function private.refund_payment(p_payment uuid, p_amount int, p_reason text, p_release uuid default null)
returns void language plpgsql security definer set search_path = public, private as $$
declare v payments; v_amount int; v_id uuid;
begin
  select * into v from payments where id = p_payment for update;
  if v.status <> 'held' then return; end if;
  if p_release is null then
    v_amount := least(p_amount, private.payment_unallocated(p_payment));
  else
    v_amount := least(p_amount, (select amount_cents from payment_releases where id = p_release and status = 'disputed'));
  end if;
  if coalesce(v_amount, 0) <= 0 then return; end if;

  insert into refunds (payment_id, release_id, member_id, amount_cents, reason)
  values (p_payment, p_release, v.payer_id, v_amount, p_reason) returning id into v_id;
  perform private.ensure_account('member_refund:' || v.payer_id, 'liability', v.payer_id);
  perform private.post_entry('refund', 'refund:' || v_id, 'refund', v_id, jsonb_build_array(
    jsonb_build_object('account', 'held',                         'amount', v_amount),
    jsonb_build_object('account', 'member_refund:' || v.payer_id, 'amount', -v_amount)));
  if p_release is null then perform private.close_if_settled(p_payment); end if;
end $$;

-- 4e. Edge-function RPCs (service_role) and the member's complaint -------------
create or replace function public.payments_begin_charge(p_payment uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update payments set status = 'charging'
   where id = p_payment and status = 'awaiting_payment' and expires_at > now();
  return found;
end $$;

create or replace function public.payments_end_charge(p_payment uuid) returns void
language sql security definer set search_path = public as $$
  update payments set status = 'awaiting_payment' where id = p_payment and status = 'charging';
$$;

create or replace function public.payments_mark_held(p_payment uuid, p_ref text, p_cost int, p_method uuid)
returns void language sql security definer set search_path = public, private as $$
  select private.mark_payment_held(p_payment, p_ref, p_cost, p_method);
$$;

create or replace function public.payments_claim_queue(p_limit int)
returns table(item_kind text, item_id uuid, amount_cents int, token text, charge_ref text)
language plpgsql security definer set search_path = public as $$
begin
  -- A member can remove their receiving account while a payout is queued: park those.
  update payee_payouts o set status = 'waiting_method', method_id = null
   where o.status = 'queued'
     and exists (select 1 from payment_methods m where m.id = o.method_id and m.removed_at is not null);

  return query
  with p as (
    update payee_payouts o set status = 'sending'
     where o.id in (select id from payee_payouts where status = 'queued' order by created_at limit p_limit for update skip locked)
    returning o.id, o.amount_cents, o.method_id
  )
  select 'payout'::text, p.id, p.amount_cents, m.token, null::text
    from p join payment_methods m on m.id = p.method_id and m.removed_at is null;

  return query
  with f as (
    update refunds r set status = 'sending'
     where r.id in (select id from refunds where status = 'queued' order by created_at limit p_limit for update skip locked)
    returning r.id, r.amount_cents, r.payment_id
  )
  select 'refund'::text, f.id, f.amount_cents, null::text, pay.provider_ref
    from f join payments pay on pay.id = f.payment_id;
end $$;

create or replace function public.payments_queue_sent(p_kind text, p_id uuid, p_ref text, p_fee int) returns void
language plpgsql security definer set search_path = public, private as $$
declare v_who uuid; v_amount int;
begin
  if p_kind = 'payout' then
    update payee_payouts set status = 'sent', provider_ref = p_ref, fee_cents = p_fee, sent_at = now()
     where id = p_id and status = 'sending' returning payee_id, amount_cents into v_who, v_amount;
    if not found then return; end if;
    perform private.post_entry('payout', 'payout:' || p_id, 'payout', p_id, jsonb_build_array(
      jsonb_build_object('account', 'payee:' || v_who, 'amount', v_amount),
      jsonb_build_object('account', 'company_cash',    'amount', -v_amount)));
  elsif p_kind = 'refund' then
    update refunds set status = 'sent', provider_ref = p_ref, sent_at = now()
     where id = p_id and status = 'sending' returning member_id, amount_cents into v_who, v_amount;
    if not found then return; end if;
    perform private.post_entry('refund_sent', 'refund_sent:' || p_id, 'refund', p_id, jsonb_build_array(
      jsonb_build_object('account', 'member_refund:' || v_who, 'amount', v_amount),
      jsonb_build_object('account', 'company_cash',            'amount', -v_amount)));
  end if;
end $$;

create or replace function public.payments_queue_failed(p_kind text, p_id uuid, p_message text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_kind = 'payout' then
    update payee_payouts set status = 'failed', failure = left(p_message, 500) where id = p_id and status = 'sending';
  elsif p_kind = 'refund' then
    update refunds set status = 'failed', failure = left(p_message, 500) where id = p_id and status = 'sending';
  end if;
end $$;

create or replace function public.raise_dispute(p_release uuid, p_reason text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_me uuid := require_app_user(); v_payer uuid; v_status text; v_at timestamptz; v_id uuid;
begin
  select p.payer_id, r.status, r.release_at into v_payer, v_status, v_at
    from payment_releases r join payments p on p.id = r.payment_id
   where r.id = p_release for update of r;
  if v_payer is distinct from v_me then raise exception 'That payment is not yours.'; end if;
  if v_status <> 'waiting' or v_at <= now() then raise exception 'The complaint period for this payment has ended.'; end if;
  if length(trim(coalesce(p_reason, ''))) < 5 then raise exception 'Say briefly what went wrong.'; end if;
  update payment_releases set status = 'disputed' where id = p_release;
  insert into disputes (release_id, raised_by, reason) values (p_release, v_me, trim(p_reason)) returning id into v_id;
  return v_id;
end $$;

create or replace function public.resolve_dispute(p_dispute uuid, p_refund_cents int, p_actor uuid) returns void
language plpgsql security definer set search_path = public, private as $$
declare d disputes; r payment_releases; v_rate int; v_left int;
begin
  select * into d from disputes where id = p_dispute for update;
  if d.status <> 'open' then raise exception 'This complaint is already decided.'; end if;
  select * into r from payment_releases where id = d.release_id for update;
  if p_refund_cents < 0 or p_refund_cents > r.amount_cents then raise exception 'Refund must be between 0 and %.', r.amount_cents; end if;

  if p_refund_cents > 0 then
    perform private.refund_payment(r.payment_id, p_refund_cents, 'complaint upheld', r.id);
  end if;
  v_left := r.amount_cents - p_refund_cents;
  select rate_bps into v_rate from payments where id = r.payment_id;
  if v_left = 0 then
    update payment_releases set status = 'refunded' where id = r.id;
  else
    update payment_releases
       set amount_cents = v_left, commission_cents = round(v_left * v_rate / 10000.0)::int,
           status = 'waiting', release_at = now()
     where id = r.id;
  end if;
  update disputes set status = case when p_refund_cents > 0 then 'refunded' else 'released' end,
                      refund_cents = p_refund_cents, resolved_by = p_actor, resolved_at = now()
   where id = p_dispute;
  perform private.release_due();
  perform private.close_if_settled(r.payment_id);
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.payments_begin_charge(uuid)', 'public.payments_end_charge(uuid)',
    'public.payments_mark_held(uuid, text, int, uuid)', 'public.payments_claim_queue(int)',
    'public.payments_queue_sent(text, uuid, text, int)', 'public.payments_queue_failed(text, uuid, text)',
    'public.resolve_dispute(uuid, int, uuid)']
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
revoke execute on function public.raise_dispute(uuid, text) from public, anon;
grant execute on function public.raise_dispute(uuid, text) to authenticated;
-- Only the payment helpers: a blanket revoke over schema private also stripped authenticated from the
-- older private helpers that RLS policies call (repaired live by payments_core_flow_restore_private_grants).
revoke all on function
  private.payments_enabled(text), private.payment_unallocated(uuid), private.close_if_settled(uuid),
  private.open_payment(text, uuid, uuid, uuid, int, int), private.confirm_subject(payments),
  private.cancel_subject(payments), private.mark_payment_held(uuid, text, int, uuid),
  private.fail_payment(uuid, text), private.add_release(uuid, uuid), private.release_due(),
  private.refund_payment(uuid, int, text, uuid)
  from public, anon, authenticated;
-- service_role may call them directly (the older private helpers already allow it; the SQL test does).
grant execute on function
  private.payments_enabled(text), private.payment_unallocated(uuid), private.close_if_settled(uuid),
  private.open_payment(text, uuid, uuid, uuid, int, int), private.confirm_subject(payments),
  private.cancel_subject(payments), private.mark_payment_held(uuid, text, int, uuid),
  private.fail_payment(uuid, text), private.add_release(uuid, uuid), private.release_due(),
  private.refund_payment(uuid, int, text, uuid)
  to service_role;

-- 4f. Let the payment system through the existing status guards. The guards
--     check current_setting('role') = 'service_role'; a cron job or a trigger
--     fired by a member is neither, so each guard gets one line that honours
--     app.payments_internal, which only the functions above set. The live
--     definition is patched in place so newer edits to a guard are kept.
do $$
declare f text; def text;
begin
  foreach f in array array['public.guard_booking_status_transition',
                           'public.guard_court_reservation_write',
                           'public.guard_event_entry_write'] loop
    def := pg_get_functiondef(f::regproc);
    if position('app.payments_internal' in def) = 0 then
      def := regexp_replace(def, E'\nbegin\n',
        E'\nbegin\n  if current_setting(''app.payments_internal'', true) = ''on'' then return new; end if;\n');
      execute def;
    end if;
  end loop;
end $$;

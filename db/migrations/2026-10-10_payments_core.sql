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

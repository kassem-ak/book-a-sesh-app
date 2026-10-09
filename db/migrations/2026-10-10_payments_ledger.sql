-- Payments ledger.
--
-- Every movement of money is one entry with balanced lines (positive = debit).
-- Balances are always summed from the lines; nothing ever stores or edits a
-- balance. The ledger is append-only: a mistake is corrected by a reversing
-- entry, never by an update. Only company_cash is a real account (the company
-- Whish account); every other account is a soft split of that same money.

create table if not exists public.ledger_accounts (
  code       text primary key,
  kind       text not null check (kind in ('asset','liability','income','expense','equity')),
  owner_id   uuid references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.ledger_entries (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null,
  idempotency_key text not null unique,
  subject_type    text,
  subject_id      uuid,
  created_at      timestamptz not null default now()
);

create table if not exists public.ledger_lines (
  id           bigint generated always as identity primary key,
  entry_id     uuid not null references public.ledger_entries(id) on delete restrict,
  account      text not null references public.ledger_accounts(code) on delete restrict,
  amount_cents bigint not null check (amount_cents <> 0)
);
create index if not exists ledger_lines_account_idx on public.ledger_lines (account);
create index if not exists ledger_lines_entry_idx on public.ledger_lines (entry_id);

alter table public.ledger_accounts enable row level security;
alter table public.ledger_entries  enable row level security;
alter table public.ledger_lines    enable row level security;
revoke all on public.ledger_accounts, public.ledger_entries, public.ledger_lines from public, anon, authenticated;
grant select on public.ledger_accounts, public.ledger_entries, public.ledger_lines to service_role;

insert into public.ledger_accounts (code, kind) values
  ('company_cash','asset'), ('held','liability'), ('commission_revenue','income'),
  ('fee_income','income'), ('gateway_cost','expense'),
  ('undistributed_profit','equity'), ('company_capital','equity')
on conflict (code) do nothing;

-- security definer: a deferred check fires at commit, after any definer
-- function has returned, i.e. as the member whose action posted the entry --
-- and members cannot read the ledger.
create or replace function private.ledger_entry_balances() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_sum bigint;
begin
  select coalesce(sum(amount_cents), 0) into v_sum from ledger_lines where entry_id = new.entry_id;
  if v_sum <> 0 then
    raise exception 'ledger entry % does not balance (%)', new.entry_id, v_sum;
  end if;
  return null;
end $$;

drop trigger if exists ledger_lines_balance on public.ledger_lines;
create constraint trigger ledger_lines_balance
  after insert on public.ledger_lines deferrable initially deferred
  for each row execute function private.ledger_entry_balances();

create or replace function private.ledger_append_only() returns trigger
language plpgsql as $$
begin
  raise exception 'the ledger is append-only: post a reversing entry instead';
end $$;

drop trigger if exists ledger_entries_append_only on public.ledger_entries;
create trigger ledger_entries_append_only before update or delete on public.ledger_entries
  for each row execute function private.ledger_append_only();
drop trigger if exists ledger_lines_append_only on public.ledger_lines;
create trigger ledger_lines_append_only before update or delete on public.ledger_lines
  for each row execute function private.ledger_append_only();
drop trigger if exists ledger_entries_no_truncate on public.ledger_entries;
create trigger ledger_entries_no_truncate before truncate on public.ledger_entries
  for each statement execute function private.ledger_append_only();
drop trigger if exists ledger_lines_no_truncate on public.ledger_lines;
create trigger ledger_lines_no_truncate before truncate on public.ledger_lines
  for each statement execute function private.ledger_append_only();

create or replace function private.ensure_account(p_code text, p_kind text, p_owner uuid default null)
returns text language plpgsql security definer set search_path = public as $$
begin
  insert into ledger_accounts (code, kind, owner_id) values (p_code, p_kind, p_owner)
  on conflict (code) do nothing;
  return p_code;
end $$;

create or replace function private.post_entry(
  p_kind text, p_key text, p_subject_type text, p_subject_id uuid, p_lines jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_line jsonb;
begin
  select id into v_id from ledger_entries where idempotency_key = p_key;
  if v_id is not null then return v_id; end if;

  insert into ledger_entries (kind, idempotency_key, subject_type, subject_id)
  values (p_kind, p_key, p_subject_type, p_subject_id)
  returning id into v_id;

  for v_line in select value from jsonb_array_elements(p_lines) loop
    if (v_line->>'amount')::bigint <> 0 then
      insert into ledger_lines (entry_id, account, amount_cents)
      values (v_id, v_line->>'account', (v_line->>'amount')::bigint);
    end if;
  end loop;
  return v_id;
end $$;

revoke all on function private.ensure_account(text, text, uuid) from public, anon, authenticated;
revoke all on function private.post_entry(text, text, text, uuid, jsonb) from public, anon, authenticated;

create or replace view public.ledger_balances as
select a.code, a.kind, a.owner_id,
       case when a.kind in ('asset','expense') then coalesce(sum(l.amount_cents), 0)
            else -coalesce(sum(l.amount_cents), 0) end as balance_cents
  from public.ledger_accounts a
  left join public.ledger_lines l on l.account = a.code
 group by a.code, a.kind, a.owner_id;
revoke all on public.ledger_balances from public, anon, authenticated;
grant select on public.ledger_balances to service_role;

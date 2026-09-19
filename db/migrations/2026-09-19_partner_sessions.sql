-- Training with a peer, free.
--
-- Deliberately NOT the bookings table. bookings carries total_cents and
-- commission_cents and is what the admin console's revenue views read; putting
-- free peer sessions through it would write a zero-money row for every one of
-- them, and every revenue view would then need to remember to filter them out.
-- One forgotten filter and the platform's own numbers are wrong.
--
-- Symmetric by nature: either person can propose, and the other accepts. There
-- is no coach and no client here, so the columns are named for that.
create table if not exists public.partner_sessions (
  id           uuid primary key default gen_random_uuid(),
  proposer_id  uuid not null references public.users(id) on delete cascade,
  partner_id   uuid not null references public.users(id) on delete cascade,
  scheduled_for timestamptz not null,
  slot_label   text,
  sport_id     uuid references public.sports(id) on delete set null,
  note         text,
  status       text not null default 'proposed',
  created_at   timestamptz not null default now(),
  constraint partner_sessions_not_self check (proposer_id <> partner_id),
  constraint partner_sessions_status check (status in ('proposed','accepted','declined','cancelled'))
);

create index if not exists partner_sessions_proposer_idx on public.partner_sessions (proposer_id, scheduled_for);
create index if not exists partner_sessions_partner_idx  on public.partner_sessions (partner_id, scheduled_for);

alter table public.partner_sessions enable row level security;

-- Both sides see the session; nobody else does.
drop policy if exists partner_sessions_participants on public.partner_sessions;
create policy partner_sessions_participants on public.partner_sessions
  for select
  using (proposer_id = current_app_user() or partner_id = current_app_user());

-- You may only propose as yourself, and only ever as 'proposed'. Inserting an
-- already-accepted row would let someone put a session in another person's
-- calendar without asking.
drop policy if exists partner_sessions_propose on public.partner_sessions;
create policy partner_sessions_propose on public.partner_sessions
  for insert
  with check (proposer_id = current_app_user() and status = 'proposed');

grant select, insert on public.partner_sessions to authenticated;

-- Status changes go through an RPC rather than a column grant, because who may
-- make which change differs per status: only the invited partner can accept or
-- decline, while either side can cancel. A grant cannot express that.
create or replace function public.decide_partner_session(p_id uuid, p_status text)
returns table (id uuid, status text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_me uuid := require_app_user();
  v_row partner_sessions%rowtype;
begin
  if p_status not in ('accepted','declined','cancelled') then
    raise exception 'A session is accepted, declined or cancelled.';
  end if;

  select * into v_row from partner_sessions s where s.id = p_id;
  if v_row.id is null then
    raise exception 'That session no longer exists.';
  end if;
  if v_me <> v_row.proposer_id and v_me <> v_row.partner_id then
    raise exception 'That session is not yours.';
  end if;

  -- Accepting or declining is the invited person's call. The proposer
  -- accepting their own invitation would make the other person's agreement
  -- meaningless.
  if p_status in ('accepted','declined') and v_me <> v_row.partner_id then
    raise exception 'Only the person invited can accept or decline.';
  end if;

  -- A decided session does not silently flip: declining something already
  -- accepted has to go through cancel, which both sides can see happened.
  if p_status in ('accepted','declined') and v_row.status <> 'proposed' then
    raise exception 'That session has already been answered.';
  end if;
  if p_status = 'cancelled' and v_row.status = 'cancelled' then
    return;
  end if;

  return query
    update partner_sessions s
       set status = p_status
     where s.id = p_id
    returning s.id, s.status;
end $function$;

revoke execute on function public.decide_partner_session(uuid, text) from public;
grant execute on function public.decide_partner_session(uuid, text) to authenticated;

-- Proposing to someone who blocked you, or whom you blocked, is refused for
-- the same reason messaging and map pins are. A session in the past is refused
-- here too, so the calendar cannot be seeded with history.
create or replace function public.guard_partner_session_blocks()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if exists (
    select 1 from user_blocks b
     where (b.blocker_id = new.proposer_id and b.blocked_id = new.partner_id)
        or (b.blocker_id = new.partner_id and b.blocked_id = new.proposer_id)
  ) then
    raise exception 'You cannot arrange a session with this member.';
  end if;
  if new.scheduled_for < now() - interval '1 day' then
    raise exception 'Pick a time that has not already passed.';
  end if;
  return new;
end $function$;

drop trigger if exists trg_guard_partner_session_blocks on public.partner_sessions;
create trigger trg_guard_partner_session_blocks
  before insert on public.partner_sessions
  for each row execute function public.guard_partner_session_blocks();

-- Applied live 19 September 2026 and verified as two real signed-in accounts in
-- a rolled-back transaction:
--   propose                                  -> ok
--   insert an already-'accepted' row         -> refused
--   propose as somebody else                 -> refused
--   a time in the past                       -> refused
--   proposer accepts their own invitation    -> "Only the person invited can
--                                               accept or decline."
--   the invited person accepts               -> status becomes 'accepted'
--   answering a second time                  -> refused

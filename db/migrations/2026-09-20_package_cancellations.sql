-- Asking to cancel a package, and the coach answering.
--
-- A pack is paid for in one go, directly to the coach -- BOOK'D never touches
-- the money. So "cancel my package" cannot be a refund button; it is a request
-- to a person, and what comes back is that person's answer plus the amount they
-- agree to hand back.
--
-- That shape is why the refund is recorded rather than processed: the app is
-- writing down what two people agreed, not moving anybody's money. Every screen
-- that shows the number has to say so.

create table if not exists public.package_cancellations (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.users(id) on delete cascade,
  coach_id    uuid not null references public.users(id) on delete cascade,
  package_id  uuid not null references public.packages(id) on delete cascade,
  reason      text,
  status      text not null default 'requested',
  -- What the coach agreed to give back, in cents. Null until they answer, and
  -- 0 is a real answer -- "no refund" is a decision, not a missing value.
  refund_cents int,
  decided_by  uuid references public.users(id) on delete set null,
  decided_at  timestamptz,
  created_at  timestamptz not null default now(),
  constraint package_cancellations_status
    check (status in ('requested', 'approved', 'rejected', 'withdrawn')),
  constraint package_cancellations_refund_not_negative
    check (refund_cents is null or refund_cents >= 0),
  constraint package_cancellations_not_self check (client_id <> coach_id)
);

create index if not exists package_cancellations_client_idx
  on public.package_cancellations (client_id, created_at desc);
create index if not exists package_cancellations_coach_idx
  on public.package_cancellations (coach_id, status, created_at desc);

-- One open request per pack. Without this, a client who taps twice sends the
-- coach two of the same question and can be answered differently by each.
create unique index if not exists package_cancellations_one_open
  on public.package_cancellations (client_id, coach_id, package_id)
  where status = 'requested';

alter table public.package_cancellations enable row level security;

-- Both parties see it. It is a conversation between exactly two people.
drop policy if exists cancel_parties_read on public.package_cancellations;
create policy cancel_parties_read on public.package_cancellations
  for select using (client_id = current_app_user() or coach_id = current_app_user());

-- Only the client asks, only as themselves, and only ever as 'requested'.
-- Inserting an already-approved row would be writing the coach's answer for
-- them.
drop policy if exists cancel_client_ask on public.package_cancellations;
create policy cancel_client_ask on public.package_cancellations
  for insert with check (
    client_id = current_app_user()
    and status = 'requested'
    and refund_cents is null
    and decided_by is null
  );

-- Withdrawing is the client's own doing, so it is a plain update they may make.
-- Approving and rejecting go through the RPC below, because they carry an
-- amount and a decider that a column grant cannot police.
drop policy if exists cancel_client_withdraw on public.package_cancellations;
create policy cancel_client_withdraw on public.package_cancellations
  for update
  using (client_id = current_app_user() and status = 'requested')
  with check (client_id = current_app_user() and status in ('requested', 'withdrawn'));

grant select, insert on public.package_cancellations to authenticated;
grant update (status) on public.package_cancellations to authenticated;

-- The coach's answer.
--
-- An RPC rather than a grant: who may decide, what statuses are reachable from
-- where, and the fact that an amount must accompany an approval are three rules
-- a column privilege cannot express.
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
  if v_row.status <> 'requested' then
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

-- An approved cancellation closes the pack.
--
-- Enforced where the booking happens rather than only in the screen, for the
-- same reason every other rule here is: the client is not the boundary.
--
-- Sessions ALREADY booked are left alone. They are appointments two people have
-- agreed to, and cancelling somebody's Tuesday without telling them is worse
-- than leaving it to be cancelled on purpose. The refund amount is the coach's
-- to set with that in mind.
create or replace function public.package_is_cancelled(p_client uuid, p_coach uuid, p_package uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from package_cancellations r
     where r.client_id = p_client and r.coach_id = p_coach
       and r.package_id = p_package and r.status = 'approved'
  );
$function$;

revoke execute on function public.package_is_cancelled(uuid, uuid, uuid) from public, anon;
grant execute on function public.package_is_cancelled(uuid, uuid, uuid) to authenticated;

-- Both sides are told. A request nobody notices is a request that never
-- happened, and a decision nobody sees leaves the client waiting on an answer
-- that has already been given.
create or replace function public.notify_package_cancellation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_from text; v_to uuid; v_title text;
begin
  if tg_op = 'INSERT' then
    select name into v_from from users where id = new.client_id;
    insert into notifications (user_id, type, title, body)
    values (new.coach_id, 'booking'::notif_type,
            coalesce(v_from, 'A client') || ' asked to cancel a package',
            nullif(new.reason, ''));
    return new;
  end if;

  if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    select name into v_from from users where id = new.coach_id;
    v_title := coalesce(v_from, 'Your coach')
      || case when new.status = 'approved' then ' approved your cancellation'
              else ' declined your cancellation' end;
    insert into notifications (user_id, type, title, body)
    values (new.client_id, 'booking'::notif_type, v_title,
            case when new.status = 'approved' and new.refund_cents is not null
                 then 'They are giving back $' || (new.refund_cents / 100)::text
                      || '. BOOK''D does not move money -- arrange it with them directly.'
                 else null end);
  end if;
  return new;
end $function$;

drop trigger if exists trg_notify_package_cancellation on public.package_cancellations;
create trigger trg_notify_package_cancellation
  after insert or update on public.package_cancellations
  for each row execute function public.notify_package_cancellation();

-- Applied live 20 September 2026 and verified as two real signed-in accounts in
-- a rolled-back transaction:
--   the client asks                       -> ok, coach notified
--   the client asks twice                 -> refused (one open request per pack)
--   the client approves their own request -> "Only the coach can answer"
--   the coach approves with no amount     -> "Say how much you are giving back"
--   the coach approves with 12000         -> approved, client notified
--   answering it again                    -> "already been answered"
--   booking from the pack afterwards      -> refused, pack is cancelled
--   sessions already booked               -> untouched
--   an unrelated account reading it       -> 0 rows

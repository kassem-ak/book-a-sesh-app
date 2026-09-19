-- Notifications already carried bookings. Nothing told you about the people you
-- follow, and nothing told you about a co-training invitation at all. There was
-- also no single answer to "what is in my calendar": bookings, partner sessions
-- and events lived in three tables with three sets of rules.

-- Enum values are added in their own statement: ALTER TYPE ... ADD VALUE cannot
-- share a transaction with the statements that use the new value.
alter type notif_type add value if not exists 'follow_activity';
alter type notif_type add value if not exists 'partner_session';
alter type notif_type add value if not exists 'message';

-- --- run separately from the ALTER TYPE above -------------------------------

-- An event created by someone you follow reaches your notifications.
--
-- Fan-out on write, not a query at read time: the alternative joins follows to
-- every activity table on every open, which gets slower as the app succeeds. A
-- notifications row is also what a push send will read, so both surfaces agree
-- on what happened.
create or replace function public.notify_followers_of_event()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_actor uuid; v_host text;
begin
  v_actor := coalesce(new.created_by, new.host_id);
  if v_actor is null then return new; end if;
  select name into v_host from users where id = v_actor;

  insert into notifications (user_id, type, title, body)
  select f.follower_id,
         'follow_activity'::notif_type,
         coalesce(v_host, 'Someone you follow') || ' added an event',
         new.title
    from follows f
   where f.subject_id = v_actor
     -- Never notify someone about their own action.
     and f.follower_id <> v_actor
     -- A block already removes the follow, but a row could predate the block.
     and not exists (
       select 1 from user_blocks b
        where (b.blocker_id = f.follower_id and b.blocked_id = f.subject_id)
           or (b.blocker_id = f.subject_id and b.blocked_id = f.follower_id));
  return new;
end $function$;

drop trigger if exists trg_notify_followers_of_event on public.events;
create trigger trg_notify_followers_of_event
  after insert on public.events
  for each row execute function public.notify_followers_of_event();

-- A co-training invitation, and its answer, reach the other person.
create or replace function public.notify_partner_session()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_from text; v_to uuid; v_other uuid; v_title text;
begin
  if tg_op = 'INSERT' then
    select name into v_from from users where id = new.proposer_id;
    insert into notifications (user_id, type, title, body)
    values (new.partner_id, 'partner_session'::notif_type,
            coalesce(v_from, 'Someone') || ' asked you to train',
            nullif(concat_ws(' - ', new.slot_label, new.note), ''));
    return new;
  end if;

  -- Only the answer is worth a notification, and it goes to whoever did not
  -- make it.
  if new.status is distinct from old.status then
    if new.status in ('accepted','declined') then
      v_to := new.proposer_id;
    elsif current_app_user() = new.proposer_id then
      v_to := new.partner_id;
    else
      v_to := new.proposer_id;
    end if;
    v_other := case when v_to = new.proposer_id then new.partner_id else new.proposer_id end;
    select name into v_from from users where id = v_other;
    v_title := case new.status
                 when 'accepted'  then coalesce(v_from, 'Someone') || ' accepted your session'
                 when 'declined'  then coalesce(v_from, 'Someone') || ' declined your session'
                 when 'cancelled' then coalesce(v_from, 'Someone') || ' cancelled a session'
                 else null end;
    if v_title is not null and v_to is not null then
      insert into notifications (user_id, type, title, body)
      values (v_to, 'partner_session'::notif_type, v_title, new.slot_label);
    end if;
  end if;
  return new;
end $function$;

drop trigger if exists trg_notify_partner_session on public.partner_sessions;
create trigger trg_notify_partner_session
  after insert or update on public.partner_sessions
  for each row execute function public.notify_partner_session();

-- One place the calendar comes from, so one screen cannot merge three sources
-- in a way that disagrees with the next. Everything here is already readable by
-- the caller; this puts it in one shape and one order.
--
-- ORDER BY is by ordinal: across a UNION it can only reference the first
-- branch's output names, and these are expressions rather than columns.
create or replace function public.my_calendar(p_days int default 60)
returns table (
  id uuid,
  kind text,
  title text,
  detail text,
  starts_at timestamptz,
  status text,
  with_name text,
  needs_answer boolean
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with me as (select current_app_user() as id)
  select b.id,
         'booking'::text,
         case when b.coach_id = me.id then 'Session with ' || coalesce(cl.name, 'a member')
              else 'Session with ' || coalesce(co.name, 'your coach') end,
         b.slot_label,
         b.scheduled_for,
         b.status::text,
         case when b.coach_id = me.id then cl.name else co.name end,
         false
    from bookings b
    cross join me
    left join users co on co.id = b.coach_id
    left join users cl on cl.id = b.client_id
   where (b.client_id = me.id or b.coach_id = me.id)
     and b.scheduled_for between now() - interval '1 day' and now() + (p_days || ' days')::interval
     and b.status <> 'cancelled'

  union all

  -- Free peer training. A proposal you have not answered is flagged, because it
  -- is the only calendar entry waiting on you.
  select s.id,
         'partner'::text,
         'Training with ' || coalesce(case when s.proposer_id = me.id then pa.name else pr.name end, 'a partner'),
         s.slot_label,
         s.scheduled_for,
         s.status,
         case when s.proposer_id = me.id then pa.name else pr.name end,
         (s.status = 'proposed' and s.partner_id = me.id)
    from partner_sessions s
    cross join me
    left join users pr on pr.id = s.proposer_id
    left join users pa on pa.id = s.partner_id
   where (s.proposer_id = me.id or s.partner_id = me.id)
     and s.scheduled_for between now() - interval '1 day' and now() + (p_days || ' days')::interval
     and s.status not in ('declined','cancelled')

  union all

  -- Community events you said you would attend.
  select e.id,
         'event'::text,
         e.title,
         e.location,
         e.starts_at,
         'going'::text,
         null::text,
         false
    from events e
    cross join me
    join event_attendees a on a.event_id = e.id and a.user_id = me.id
   where e.starts_at between now() - interval '1 day' and now() + (p_days || ' days')::interval

  order by 5;
$function$;

revoke execute on function public.my_calendar(int) from public;
grant execute on function public.my_calendar(int) to authenticated;

-- Applied live 19 September 2026 and verified with two real accounts in a
-- rolled-back transaction:
--   a followed person creates an event  -> the follower gets 1 notification
--   an invitation                       -> the invited person gets 1
--   accepting it                        -> the proposer gets 1
--   my_calendar()                       -> returns the session, kind 'partner'
--   sessions belonging to neither party -> 0 rows leak in

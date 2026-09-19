-- Push notifications.
--
-- Everything the app tells a person about already lands in one table:
-- `notifications`. Bookings, follow activity, partner sessions -- all of it
-- goes through a trigger that writes a row there. So push does not need a
-- second fan-out path. One trigger on `notifications` turns every existing and
-- every future notification into a push, and nothing that adds a notification
-- later has to remember to also send one.
--
-- Messages were the one gap: chat wrote to `messages` and nothing else, so a
-- message never reached the inbox at all. That trigger is added here too --
-- which means messages get the inbox entry and the push together.

-- pg_net gives the database an async HTTP client. The request is queued and the
-- transaction commits without waiting, so a slow push service can never hold up
-- a booking.
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- Where to send
-- ---------------------------------------------------------------------------

-- One row per device, not per account: a person with a phone and a tablet gets
-- the notification on both. The token is the primary key because Expo issues a
-- token per app install, and reinstalling on the same device can hand the same
-- token to a different account -- the upsert then moves it, rather than leaving
-- the previous account's notifications going to somebody else's phone.
create table if not exists public.push_tokens (
  token        text primary key,
  user_id      uuid not null references public.users(id) on delete cascade,
  platform     text not null default 'unknown',
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint push_tokens_platform check (platform in ('ios','android','web','unknown'))
);

create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- A token is a routing address for one account's notifications. Nobody else
-- reads it, and nobody registers one for somebody else.
drop policy if exists push_tokens_own on public.push_tokens;
create policy push_tokens_own on public.push_tokens
  for select using (user_id = current_app_user());

drop policy if exists push_tokens_register on public.push_tokens;
create policy push_tokens_register on public.push_tokens
  for insert with check (user_id = current_app_user());

drop policy if exists push_tokens_refresh on public.push_tokens;
create policy push_tokens_refresh on public.push_tokens
  for update using (user_id = current_app_user()) with check (user_id = current_app_user());

drop policy if exists push_tokens_release on public.push_tokens;
create policy push_tokens_release on public.push_tokens
  for delete using (user_id = current_app_user());

grant select, insert, update, delete on public.push_tokens to authenticated;

-- ---------------------------------------------------------------------------
-- Messages reach the inbox
-- ---------------------------------------------------------------------------

-- `data` carries what the notification is about. It exists so a burst of chat
-- messages does not become a burst of identical notifications: the dedupe below
-- needs to know which conversation an unread notification belongs to.
alter table public.notifications add column if not exists data jsonb;

-- One notification per conversation, not per message. Someone typing five lines
-- in a row is one thing that happened, and five buzzes would make people turn
-- push off entirely. Once the unread one is read, the next message makes a new
-- one.
create or replace function public.notify_message()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_from text;
begin
  select name into v_from from users where id = new.sender_id;

  insert into notifications (user_id, type, title, body, data)
  select p.user_id,
         'message'::notif_type,
         coalesce(v_from, 'Someone') || ' sent you a message',
         left(new.body, 140),
         jsonb_build_object('conversation_id', new.conversation_id)
    from conversation_participants p
   where p.conversation_id = new.conversation_id
     and p.user_id <> new.sender_id
     and not exists (
       select 1 from notifications n
        where n.user_id = p.user_id
          and n.type = 'message'
          and n.read = false
          and n.data ->> 'conversation_id' = new.conversation_id::text);
  return new;
end $function$;

drop trigger if exists trg_notify_message on public.messages;
create trigger trg_notify_message
  after insert on public.messages
  for each row execute function public.notify_message();

-- ---------------------------------------------------------------------------
-- Notification -> push
-- ---------------------------------------------------------------------------

-- The hook's address and shared secret. Kept in Vault rather than a settings
-- table so they are encrypted at rest and never appear in a `select *` by
-- anyone poking at the schema.
--
-- Until both are set the function below does nothing at all: notifications keep
-- landing in the inbox and no HTTP call is made. That is the state the project
-- ships in -- push turns on when the credentials are in place, not before.
create or replace function public.push_vault_secret(p_name text)
returns text
language sql
stable
security definer
set search_path to 'vault', 'public'
as $function$
  select decrypted_secret from vault.decrypted_secrets where name = p_name limit 1;
$function$;

revoke execute on function public.push_vault_secret(text) from public, authenticated, anon;

-- Send one notification to every device the person has.
--
-- `notification_prefs.push_enabled` already existed and already means exactly
-- this, so it is the switch -- rather than inventing a second preference that
-- could disagree with the one in the settings screen.
--
-- Quiet hours (`active_from`/`active_to`) are deliberately NOT applied: they
-- are stored as a bare `time` with no timezone, so honouring them would mean
-- guessing which timezone the person meant and silencing their notifications at
-- the wrong hours. Better to send than to drop on a guess.
create or replace function public.push_notification()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_url    text := push_vault_secret('push_hook_url');
  v_secret text := push_vault_secret('push_hook_secret');
  v_tokens text[];
begin
  -- Not configured yet. The inbox row is already written; there is simply
  -- nowhere to send it.
  if v_url is null or v_secret is null then return new; end if;

  -- The default is on: an account that never opened the settings screen has no
  -- prefs row, and that should not mean silence.
  if exists (select 1 from notification_prefs p
              where p.user_id = new.user_id and p.push_enabled = false) then
    return new;
  end if;

  select array_agg(t.token) into v_tokens
    from push_tokens t where t.user_id = new.user_id;
  if v_tokens is null then return new; end if;

  -- Queued, not awaited. pg_net hands the request to a background worker, so a
  -- push service having a bad day cannot slow down or fail the booking,
  -- message or follow that caused this row.
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object(
      'tokens', to_jsonb(v_tokens),
      'title', new.title,
      'body', new.body,
      'data', coalesce(new.data, '{}'::jsonb) || jsonb_build_object('type', new.type)),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', v_secret),
    timeout_milliseconds := 5000);
  return new;
end $function$;

drop trigger if exists trg_push_notification on public.notifications;
create trigger trg_push_notification
  after insert on public.notifications
  for each row execute function public.push_notification();

-- ---------------------------------------------------------------------------
-- Turning it on (nothing below happens automatically)
-- ---------------------------------------------------------------------------
--
-- 1. Deploy the Edge Function:
--      supabase functions deploy send-push --no-verify-jwt
--    --no-verify-jwt because the caller is Postgres, which has no user JWT.
--    The x-push-secret header is what authenticates it instead.
--
-- 2. Generate a secret, give the same value to both sides:
--      select encode(gen_random_bytes(32), 'hex');   -- copy this
--      select vault.create_secret('<value>',  'push_hook_secret');
--      select vault.create_secret('https://<ref>.supabase.co/functions/v1/send-push',
--                                 'push_hook_url');
--    then set PUSH_HOOK_SECRET to the same value in the Edge Function secrets.
--
-- 3. Add FCM v1 credentials (Android) and an APNs key (iOS) to EAS, and run
--    `eas init` so the project id lands in app.json -- the client cannot ask
--    Expo for a push token without it.
--
-- Until step 2 completes, push_notification() returns without sending and the
-- app behaves exactly as it does today.

-- Applied live 19 September 2026 and verified in a rolled-back transaction:
--   a message                       -> 1 inbox row for the other participant
--   a second message, still unread  -> no duplicate row
--   after marking it read           -> the next message makes a new row
--   a notification with no vault    -> no HTTP request queued, no error
--   another account's token         -> 0 rows visible

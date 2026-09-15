-- Three screens told users that booking updates would arrive -- the Chat
-- "Session reminders" card, the notifications inbox, and the Profile row --
-- and nothing in the app or the database ever wrote a 'booking' notification.
-- The only producer was the accounting proposal fan-out, which is admin
-- triggered. The inbox could therefore only ever be empty for a normal user,
-- under a line promising otherwise.
--
-- Making the promise true is a smaller change than retracting it from three
-- places, and a booking already knows both parties and the time.
--
-- SECURITY DEFINER because `authenticated` holds no INSERT on notifications,
-- which is correct: a client must not be able to forge one.

create or replace function notify_on_booking()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_client text;
  v_coach  text;
  -- slot_label is what the user picked and what every other screen shows, so
  -- prefer it; fall back to the timestamp when a booking was made without one.
  v_when   text := coalesce(nullif(new.slot_label, ''),
                            to_char(new.scheduled_for, 'Dy DD Mon . HH12:MI AM'));
begin
  select name into v_client from users where id = new.client_id;
  select name into v_coach  from users where id = new.coach_id;

  insert into notifications (user_id, type, title, body)
  values (new.client_id, 'booking',
          'Session booked with ' || coalesce(v_coach, 'your coach'),
          v_when);

  -- A booking is a claim on the coach's time, so they are told as well.
  if new.coach_id is distinct from new.client_id then
    insert into notifications (user_id, type, title, body)
    values (new.coach_id, 'booking',
            'New booking from ' || coalesce(v_client, 'a member'),
            v_when);
  end if;

  return new;
end $$;

drop trigger if exists trg_notify_on_booking on bookings;
create trigger trg_notify_on_booking
  after insert on bookings
  for each row execute function notify_on_booking();

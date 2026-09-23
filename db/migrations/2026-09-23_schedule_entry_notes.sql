-- A note on a schedule entry.
--
-- "When you coach" shows periods -- "9:00 AM – 12:00 PM" -- but a period is not
-- a row. It is derived from however many 30-minute slots happen to be
-- contiguous, so there is nothing to hang a note on except a slot.
--
-- The note rides the period's FIRST slot. That keeps it in the table that
-- already exists, with the policies that already work, and deletes it for free
-- when the coach takes those hours away: no orphan rows, no cleanup job, no
-- second table to keep in step with this one. The cost is that a note is
-- invisible if the coach later extends the period earlier, because its first
-- slot moved -- saveDayPeriods carries the note to the new start rather than
-- leaving it stranded.
--
-- Public, like the hours themselves. avail_read is `using (true)` and this is
-- part of the same answer to "when can I book you": "Outdoor only", "Juniors",
-- "Bring your own mat". A coach writing something private would be writing it
-- on their shop window, so the editor says so in as many words.

alter table coach_availability
  add column if not exists note text;

-- Long enough for a sentence, short enough that it stays a label rather than
-- becoming a second bio. NOT VALID so an existing row can never fail the
-- migration; nothing has written this column yet, but the habit costs nothing.
alter table coach_availability
  drop constraint if exists coach_availability_note_len;
alter table coach_availability
  add constraint coach_availability_note_len
  check (note is null or char_length(note) <= 140) not valid;
alter table coach_availability
  validate constraint coach_availability_note_len;

-- hardening.sql grants insert/update/delete on the table rather than per
-- column, so the new column is already writable by its owner under avail_self.
-- Re-stated here so this file stands alone if the grants are ever narrowed.
grant update (note) on coach_availability to authenticated;

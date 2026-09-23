import { dateKey } from './calendarGrid';
import { markScheduleNotesSchemaMissing, scheduleNotesSchemaReady } from './schema';
import { currentAppUserId } from './session';
import { supabase } from './supabase';

// When a coach works.
//
// Two tables answering two different questions. `coach_availability` answers
// "which slots on a Tuesday" -- the repeating week. `coach_blackouts` answers
// "not this Tuesday" -- a holiday, a competition, an injury.
//
// The second exists because the first cannot express it. A coach whose only way
// to close one date was to delete Tuesday from their whole schedule and put it
// back afterwards would simply not bother, and would take a booking they cannot
// honour.

/** Keyed 0=Mon..6=Sun, matching `coach_availability.weekday`. */
export type Week = Record<number, string[]>;

// ---- working hours as ranges -----------------------------------------------
//
// A coach thinks in "I work 9 to 12, then 4 to 8", not in eighteen separate
// half-hour checkboxes. The editor works in ranges.
//
// What is STORED is still the half-hour slots, because that is what
// `coach_availability` holds, what `create_booking_for_coach` checks against
// and what the booking picker offers. Ranges are expanded on the way in and
// read back out of the stored slots on the way out -- so nothing about booking
// had to change, and a schedule set before this existed still reads correctly.
//
// Two periods a day is not an arbitrary cap: it is the shape of a working day
// with a break in it. A third would be a timetable, and a timetable wants a
// different screen.
export const SLOT_MINUTES = 30;
export const DAY_STARTS_AT = 5 * 60;        // 5:00 AM, the first bookable slot
export const DAY_ENDS_AT = 23 * 60;         // 11:00 PM, one slot past the last
export const MAX_PERIODS_PER_DAY = 2;

/** Minutes from midnight. `endsAt` is exclusive: a period ending at 12:00 PM
 *  has its last bookable start at 11:30.
 *
 *  `note` is the coach's own comment on this entry -- "Juniors only", "Outdoor,
 *  weather permitting". It is stored on the period's first slot and is public,
 *  because it answers the same question the hours do. */
export type Period = { startsAt: number; endsAt: number; note?: string | null };

/** The longest note the column will take. Matched in the editor so the coach
 *  is stopped while typing rather than by a 400 on save. */
export const MAX_NOTE_LENGTH = 140;

/** Notes keyed by the slot they ride on, `${weekday}|${slot}`. */
export type SlotNotes = Record<string, string>;

export function noteKey(weekday: number, slot: string): string {
  return `${weekday}|${slot}`;
}

/** Empty, whitespace and null all mean "no note" -- one shape for the rest of
 *  the code, so nothing has to decide whether "  " counts. */
export function cleanNote(note: string | null | undefined): string | null {
  const trimmed = (note ?? '').trim();
  return trimmed ? trimmed.slice(0, MAX_NOTE_LENGTH) : null;
}

/** "9:30 AM" -> 570. Returns null for anything that is not a slot label, so a
 *  stray row cannot silently become midnight. */
export function minutesFromLabel(label: string): number | null {
  const match = label.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hour += 12;
  const minute = Number(match[2]);
  if (minute >= 60) return null;
  return hour * 60 + minute;
}

/** 570 -> "9:30 AM". */
export function labelFromMinutes(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(wrapped / 60);
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour}:${String(wrapped % 60).padStart(2, '0')} ${hour24 < 12 ? 'AM' : 'PM'}`;
}

/** Every start time a period offers. */
export function slotsInPeriod(period: Period): string[] {
  const out: string[] = [];
  for (let at = period.startsAt; at < period.endsAt; at += SLOT_MINUTES) out.push(labelFromMinutes(at));
  return out;
}

export function slotsForPeriods(periods: Period[]): string[] {
  return [...new Set(periods.flatMap(slotsInPeriod))];
}

/** Read the stored slots back as the ranges they came from.
 *
 *  A gap of more than one slot ends a period, which is exactly how "9 to 12,
 *  then 4 to 8" comes back from eighteen rows. A schedule saved before this
 *  editor existed reads as however many runs it happens to contain -- and if
 *  that is more than two, they are kept rather than silently merged or
 *  truncated. Showing a coach fewer hours than they actually offer would be the
 *  worse error.
 */
export function periodsFromSlots(slots: string[], noteAt?: (slot: string) => string | null | undefined): Period[] {
  const starts = [...new Set(slots.map(minutesFromLabel).filter((m): m is number => m !== null))]
    .sort((a, b) => a - b);
  const periods: Period[] = [];
  for (const start of starts) {
    const last = periods[periods.length - 1];
    if (last && start === last.endsAt) last.endsAt = start + SLOT_MINUTES;
    else {
      // The note hangs off the slot the period starts on, so it is read here
      // and nowhere else. A note on a slot in the middle of a run is not a
      // period's note and is ignored rather than guessed at.
      const note = noteAt ? cleanNote(noteAt(labelFromMinutes(start))) : null;
      // The key is only set when there is something to say: a period without a
      // note is `{startsAt, endsAt}`, the same shape it has always been.
      periods.push(note
        ? { startsAt: start, endsAt: start + SLOT_MINUTES, note }
        : { startsAt: start, endsAt: start + SLOT_MINUTES });
    }
  }
  return periods;
}

/** "9:00 AM – 12:00 PM" */
export function periodLabel(period: Period): string {
  return `${labelFromMinutes(period.startsAt)} – ${labelFromMinutes(period.endsAt)}`;
}

/** Read a time somebody typed.
 *
 *  Accepts what people actually write: "9", "9:30", "9:30am", "9:30 AM",
 *  "17:30", "5 pm". Returns the minutes, or a reason the input cannot be used
 *  -- a reason rather than null, because "that is not a time" and "we only book
 *  on the half hour" are different problems and the person can only fix the one
 *  they are told about.
 */
export type TimeParse = { minutes: number } | { error: string };

export function parseTimeInput(text: string): TimeParse {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed) return { error: 'Enter a time, like 9:00 AM.' };

  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return { error: `"${text.trim()}" is not a time. Try 9:00 AM or 17:30.` };

  let hour = Number(match[1]);
  const minute = match[2] === undefined ? 0 : Number(match[2]);
  const meridiem = match[3];

  if (minute > 59) return { error: 'Minutes go up to 59.' };
  if (meridiem) {
    if (hour < 1 || hour > 12) return { error: 'With AM or PM the hour is 1 to 12.' };
    hour = hour % 12 + (meridiem === 'pm' ? 12 : 0);
  } else if (hour > 23) {
    return { error: 'Hours go up to 23.' };
  }

  const minutes = hour * 60 + minute;
  // The schedule is stored as half-hour slots and the booking picker offers
  // them, so a time between two of them cannot be honoured. Saying so beats
  // rounding it into something the coach did not ask for.
  if (minutes % SLOT_MINUTES !== 0) {
    return { error: 'Times are on the hour or half hour, like 9:00 or 9:30.' };
  }
  if (minutes < DAY_STARTS_AT || minutes > DAY_ENDS_AT) {
    return {
      error: `Bookable hours run from ${labelFromMinutes(DAY_STARTS_AT)} to ${labelFromMinutes(DAY_ENDS_AT)}.`,
    };
  }
  return { minutes };
}

/** Shape what someone is typing into a time, as they type it.
 *
 *  Digits fall into H:MM left to right, so "930" reads back "9:30" and "1730"
 *  reads back "17:30" -- the colon appears on its own and never has to be
 *  typed. An "a" or "p" anywhere becomes the meridiem.
 *
 *  Where the hour ends is decided by the first digit, which is the only thing
 *  that can decide it while the field is still half-typed. A leading 3 to 9
 *  cannot begin a two-digit hour, so it is the whole hour. A leading 0, 1 or 2
 *  might, so it waits for the second digit and falls back if the pair turns out
 *  to be more than 23.
 *
 *  This SHAPES, it does not validate: "9:99" masks happily and is refused by
 *  parseTimeInput. Rejecting keystrokes as they are typed makes a field feel
 *  broken, because half of every valid time is an invalid prefix of it.
 */
export function maskTimeInput(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '').slice(0, 4);
  // Only a deliberate meridiem counts. Matching any stray "a" turned "abc"
  // into "AM", which is a time nobody typed.
  const letters = raw.toLowerCase().replace(/[^a-z]/g, '');
  const meridiem = letters === 'a' || letters === 'am' ? ' AM'
    : letters === 'p' || letters === 'pm' ? ' PM'
    : '';
  if (!digits) return meridiem.trim();

  let hour: string;
  let minutes: string;
  if (digits[0] >= '3' || digits.length === 1) {
    hour = digits.slice(0, 1);
    minutes = digits.slice(1, 3);
  } else {
    hour = digits.slice(0, 2);
    if (Number(hour) > 23) {
      hour = digits.slice(0, 1);
      minutes = digits.slice(1, 3);
    } else {
      minutes = digits.slice(2, 4);
    }
  }
  return `${hour}${minutes ? `:${minutes}` : ''}${meridiem}`;
}

/** Tidy a finished time into the form the rest of the app prints.
 *
 *  Runs when the field loses focus, so "9" becomes "9:00 AM" and "1730" becomes
 *  "5:30 PM" without anyone typing a colon or a meridiem. Anything that does
 *  not parse is left exactly as typed -- rewriting someone's invalid input
 *  while they are trying to fix it is worse than leaving it alone, and the
 *  error message is already telling them what is wrong.
 */
export function normaliseTimeInput(raw: string): string {
  // Masked first, so four bare digits settle too. The field has normally masked
  // them already, but this must hold for anything handed to it -- a paste, or a
  // value restored from elsewhere.
  const parsed = parseTimeInput(maskTimeInput(raw));
  return 'minutes' in parsed ? labelFromMinutes(parsed.minutes) : raw;
}

/** Read a typed pair as a period, or say why it is not one. */
export function parsePeriodInput(startText: string, endText: string): { period: Period } | { error: string } {
  const start = parseTimeInput(startText);
  if ('error' in start) return { error: start.error };
  const end = parseTimeInput(endText);
  if ('error' in end) return { error: end.error };
  if (end.minutes <= start.minutes) {
    return { error: 'The finish has to be after the start.' };
  }
  return { period: { startsAt: start.minutes, endsAt: end.minutes } };
}

/** The weekdays a range covers, inclusive, 0=Mon..6=Sun.
 *
 *  Wraps: "Saturday to Monday" is a weekend that runs into the week, which is a
 *  real shift pattern and not an error to refuse. */
export function daysInRange(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < 7; i += 1) {
    const day = (from + i) % 7;
    out.push(day);
    if (day === to) break;
  }
  return out;
}

/** Add a period to a day's existing ones.
 *
 *  Overlapping or touching periods merge rather than sitting side by side: the
 *  stored slots cannot tell them apart anyway, so two entries claiming the same
 *  hour would be one entry the moment it was saved and read back. */
export function addPeriod(existing: Period[], period: Period): Period[] {
  const all = [...existing, period];
  const merged = periodsFromSlots(slotsForPeriods(all));
  // A merge swallows whole entries, and with them their notes. The survivor
  // keeps the earliest note it absorbed: dropping all of them would lose a
  // coach's words silently, and concatenating them would invent a sentence
  // nobody wrote.
  return merged.map((m) => {
    const note = cleanNote(
      all.filter((p) => p.startsAt >= m.startsAt && p.startsAt < m.endsAt && cleanNote(p.note))
        .sort((a, b) => a.startsAt - b.startsAt)[0]?.note,
    );
    return note ? { ...m, note } : m;
  });
}

/** The period a coach gets when they add one: an hour, mid-morning, or the
 *  first free hour after an existing period. One hour rather than a whole day
 *  because it is easier to stretch a range than to notice you have accidentally
 *  offered every hour you own. */
export function suggestedPeriod(existing: Period[]): Period {
  const last = existing[existing.length - 1];
  const startsAt = last ? Math.min(last.endsAt + 60, DAY_ENDS_AT - 60) : 9 * 60;
  return { startsAt, endsAt: startsAt + 60 };
}

/** Consecutive weekdays that share exactly the same hours.
 *
 *  A coach who works nine to five Monday to Friday set one range and should see
 *  one row. Five identical cards is the same fact copied five times, and it
 *  pushes everything else off the screen.
 */
export type DayGroup = { days: number[]; periods: Period[] };

// The note is part of the signature, so Tuesday's "Juniors only" does not get
// folded into Monday's identical hours and quietly disappear.
const signature = (periods: Period[]) =>
  periods.map((p) => `${p.startsAt}-${p.endsAt}-${cleanNote(p.note) ?? ''}`).join(',');

/** Days that work, grouped into runs, Monday first.
 *
 *  Deliberately does NOT wrap Sunday into Monday. The list reads top to bottom
 *  starting at Monday, and a row labelled "Saturday – Monday" sitting above
 *  Tuesday would be harder to read than the two rows it replaced. A coach who
 *  set a wrapping range still gets what they asked for; it is only shown in the
 *  order the week runs.
 */
export function groupWeek(week: Week, notes?: SlotNotes): DayGroup[] {
  const groups: DayGroup[] = [];
  for (let day = 0; day < 7; day += 1) {
    const periods = periodsFromSlots(
      week[day] ?? [],
      notes ? (slot) => notes[noteKey(day, slot)] : undefined,
    );
    if (!periods.length) continue;
    const last = groups[groups.length - 1];
    const runs = last && last.days[last.days.length - 1] === day - 1;
    if (runs && signature(last.periods) === signature(periods)) last.days.push(day);
    else groups.push({ days: [day], periods });
  }
  return groups;
}

export type Blackout = { date: string; reason: string | null };

// One implementation of "which local day is this", shared with the calendars.
export { dateKey } from './calendarGrid';

/** "Sat 4 Oct" for a yyyy-mm-dd, in the reader's own locale. */
export function blackoutLabel(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return date;
  return new Date(year, month - 1, day)
    .toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export async function fetchMyWeek(): Promise<{ week: Week; notes: SlotNotes }> {
  const coachId = await currentAppUserId();

  // `note` is asked for first and dropped on 42703. PostgREST refuses the whole
  // query over one missing column, so a client shipped ahead of the migration
  // would show the coach no schedule at all rather than a schedule without
  // notes -- see lib/schema.ts.
  // Two whole calls rather than one with a conditional column list: the client
  // reads the select string as a literal type, and a union of two strings parses
  // as neither.
  const read = async (withNote: boolean) => (withNote
    ? supabase.from('coach_availability').select('weekday, slot, note').eq('coach_id', coachId)
    : supabase.from('coach_availability').select('weekday, slot').eq('coach_id', coachId));

  let { data, error } = await read(scheduleNotesSchemaReady());
  if (error && (error as { code?: string }).code === '42703') {
    markScheduleNotesSchemaMissing();
    ({ data, error } = await read(false));
  }
  if (error) throw error;

  const week: Week = {};
  const notes: SlotNotes = {};
  for (const row of (data ?? []) as { weekday: number; slot: string; note?: string | null }[]) {
    week[row.weekday] = [...(week[row.weekday] ?? []), row.slot];
    const note = cleanNote(row.note);
    if (note) notes[noteKey(row.weekday, row.slot)] = note;
  }
  return { week, notes };
}

/** Replace one weekday's hours with exactly these periods.
 *
 *  A diff, not delete-then-insert. Wiping the day first would leave the coach
 *  unbookable on it for the length of a round trip, and anyone reading the
 *  schedule in that window would see a day they do not work.
 */
export async function saveDayPeriods(weekday: number, periods: Period[]): Promise<void> {
  const coachId = await currentAppUserId();
  const wanted = slotsForPeriods(periods);

  const current = await supabase
    .from('coach_availability').select('slot')
    .eq('coach_id', coachId).eq('weekday', weekday);
  if (current.error) throw current.error;
  const existing = ((current.data ?? []) as { slot: string }[]).map((row) => row.slot);

  const gone = existing.filter((slot) => !wanted.includes(slot));
  if (gone.length) {
    const removed = await supabase.from('coach_availability').delete()
      .eq('coach_id', coachId).eq('weekday', weekday).in('slot', gone);
    if (removed.error) throw removed.error;
  }

  const added = wanted.filter((slot) => !existing.includes(slot));
  if (added.length) {
    // The primary key is (coach_id, weekday, slot), so the insert is its own
    // duplicate guard -- no read-then-write race to worry about.
    const written = await supabase.from('coach_availability')
      .insert(added.map((slot) => ({ coach_id: coachId, weekday, slot })));
    if (written.error) throw written.error;
  }

  await writeDayNotes(coachId, weekday, periods, wanted);
}

/** Put each period's note on the slot it now starts on, and clear the rest.
 *
 *  Slots survive edits -- widening 9–12 to 8–12 keeps every original row -- so
 *  a note left where it was would sit in the middle of a run and stop being
 *  anyone's note. Rather than chase which start moved where, every slot in the
 *  day is set: the starts get their note, everything else gets null. One write
 *  each, and the day cannot end up with a note the editor never showed.
 */
async function writeDayNotes(
  coachId: string, weekday: number, periods: Period[], wanted: string[],
): Promise<void> {
  if (!scheduleNotesSchemaReady()) return;

  const noteFor = new Map<string, string | null>(wanted.map((slot) => [slot, null]));
  for (const period of periods) noteFor.set(labelFromMinutes(period.startsAt), cleanNote(period.note));

  // Grouped by value: at most three statements for a day (two notes and the
  // nulls) instead of one per half hour.
  const byNote = new Map<string | null, string[]>();
  for (const [slot, note] of noteFor) byNote.set(note, [...(byNote.get(note) ?? []), slot]);

  for (const [note, slots] of byNote) {
    if (!slots.length) continue;
    const { error } = await supabase.from('coach_availability')
      .update({ note })
      .eq('coach_id', coachId).eq('weekday', weekday).in('slot', slots);
    // A note is a comment on hours that did save. Failing the whole write here
    // would tell the coach their hours did not take, which is not true.
    if (error) {
      if ((error as { code?: string }).code === '42703') markScheduleNotesSchemaMissing();
      return;
    }
  }
}

/** Closed dates from today onwards.
 *
 *  Past ones are left in the table rather than deleted -- they are a record of
 *  what happened -- but there is no reason to show a coach a holiday they have
 *  already taken. */
export async function fetchMyBlackouts(): Promise<Blackout[]> {
  const coachId = await currentAppUserId();
  const { data, error } = await supabase
    .from('coach_blackouts').select('on_date, reason')
    .eq('coach_id', coachId)
    .gte('on_date', dateKey(new Date()))
    .order('on_date');
  if (error) throw error;
  return ((data ?? []) as { on_date: string; reason: string | null }[])
    .map((row) => ({ date: row.on_date, reason: row.reason }));
}

export async function closeDate(date: string, reason?: string): Promise<void> {
  const coachId = await currentAppUserId();
  const { error } = await supabase.from('coach_blackouts').upsert(
    { coach_id: coachId, on_date: date, reason: reason?.trim() || null },
    { onConflict: 'coach_id,on_date' },
  );
  if (error) throw error;
}

export async function openDate(date: string): Promise<void> {
  const coachId = await currentAppUserId();
  const { error } = await supabase
    .from('coach_blackouts').delete().eq('coach_id', coachId).eq('on_date', date);
  if (error) throw error;
}

/** A coach's closed dates, for the booking screen. Public, because the picker
 *  has to grey the day out before anyone tries to book it. */
export async function fetchBlackouts(coachId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('coach_blackouts').select('on_date')
    .eq('coach_id', coachId)
    .gte('on_date', dateKey(new Date()));
  if (error) throw error;
  return ((data ?? []) as { on_date: string }[]).map((row) => row.on_date);
}

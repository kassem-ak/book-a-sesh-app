import { dateKey } from './calendarGrid';
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
 *  has its last bookable start at 11:30. */
export type Period = { startsAt: number; endsAt: number };

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
export function periodsFromSlots(slots: string[]): Period[] {
  const starts = [...new Set(slots.map(minutesFromLabel).filter((m): m is number => m !== null))]
    .sort((a, b) => a - b);
  const periods: Period[] = [];
  for (const start of starts) {
    const last = periods[periods.length - 1];
    if (last && start === last.endsAt) last.endsAt = start + SLOT_MINUTES;
    else periods.push({ startsAt: start, endsAt: start + SLOT_MINUTES });
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
  return periodsFromSlots(slotsForPeriods([...existing, period]));
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

const signature = (periods: Period[]) =>
  periods.map((p) => `${p.startsAt}-${p.endsAt}`).join(',');

/** Days that work, grouped into runs, Monday first.
 *
 *  Deliberately does NOT wrap Sunday into Monday. The list reads top to bottom
 *  starting at Monday, and a row labelled "Saturday – Monday" sitting above
 *  Tuesday would be harder to read than the two rows it replaced. A coach who
 *  set a wrapping range still gets what they asked for; it is only shown in the
 *  order the week runs.
 */
export function groupWeek(week: Week): DayGroup[] {
  const groups: DayGroup[] = [];
  for (let day = 0; day < 7; day += 1) {
    const periods = periodsFromSlots(week[day] ?? []);
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

export async function fetchMyWeek(): Promise<Week> {
  const coachId = await currentAppUserId();
  const { data, error } = await supabase
    .from('coach_availability').select('weekday, slot').eq('coach_id', coachId);
  if (error) throw error;
  const week: Week = {};
  for (const row of (data ?? []) as { weekday: number; slot: string }[]) {
    week[row.weekday] = [...(week[row.weekday] ?? []), row.slot];
  }
  return week;
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
  if (!added.length) return;
  // The primary key is (coach_id, weekday, slot), so the insert is its own
  // duplicate guard -- no read-then-write race to worry about.
  const written = await supabase.from('coach_availability')
    .insert(added.map((slot) => ({ coach_id: coachId, weekday, slot })));
  if (written.error) throw written.error;
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

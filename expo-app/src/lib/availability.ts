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

export type Blackout = { date: string; reason: string | null };

/** A local yyyy-mm-dd. Never `toISOString().slice(0, 10)`: that converts to UTC
 *  first, so an evening anywhere east of it files the day as tomorrow. */
export function dateKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

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

/** The primary key is (coach_id, weekday, slot), so the insert is its own
 *  duplicate guard -- no read-then-write race to worry about. */
export async function openSlot(weekday: number, slot: string): Promise<void> {
  const coachId = await currentAppUserId();
  const { error } = await supabase
    .from('coach_availability').insert({ coach_id: coachId, weekday, slot });
  if (error) throw error;
}

export async function closeSlot(weekday: number, slot: string): Promise<void> {
  const coachId = await currentAppUserId();
  const { error } = await supabase
    .from('coach_availability').delete()
    .eq('coach_id', coachId).eq('weekday', weekday).eq('slot', slot);
  if (error) throw error;
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

import { currentAppUserId } from './bookings';
import { supabase } from './supabase';

// One calendar, from one place.
//
// Coach bookings, free partner sessions and community events you are attending
// all live in different tables with different rules. Merging them in the client
// would mean every screen that shows a schedule has to merge them the same way,
// and the first one to forget a status filter shows a cancelled session as if
// it were still on. `my_calendar()` does it once, server-side.

export type CalendarKind = 'booking' | 'partner' | 'event';

export type CalendarItem = {
  id: string;
  kind: CalendarKind;
  title: string;
  detail: string | null;
  startsAt: string;
  status: string;
  withName: string | null;
  /** True only for a co-training invitation waiting on this account. It is the
   *  one calendar entry that is a question rather than a fact. */
  needsAnswer: boolean;
};

const asKind = (value: unknown): CalendarKind =>
  value === 'partner' || value === 'event' ? value : 'booking';

/** Upcoming schedule, soonest first. Defaults to the next 60 days. */
export async function fetchCalendar(days = 60): Promise<CalendarItem[]> {
  await currentAppUserId();
  const { data, error } = await supabase.rpc('my_calendar', { p_days: days });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[])
    .map((row) => ({
      id: String(row.id),
      kind: asKind(row.kind),
      title: (row.title as string) ?? 'Session',
      detail: (row.detail as string) ?? null,
      startsAt: String(row.starts_at),
      status: (row.status as string) ?? '',
      withName: (row.with_name as string) ?? null,
      needsAnswer: row.needs_answer === true,
    }))
    .filter((item) => Number.isFinite(new Date(item.startsAt).getTime()));
}

/** "Fri 19 Sep · 6:30 PM", in the reader's own locale and timezone. */
export function calendarWhen(startsAt: string): string {
  const at = new Date(startsAt);
  if (!Number.isFinite(at.getTime())) return '';
  return `${at.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · ${
    at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

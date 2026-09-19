// Drawing a month, shared by the bookings calendar and the date picker.
//
// Hand-rolled rather than a calendar dependency: the whole of it is "which
// weekday does the 1st fall on, and how many days are in the month", and both
// come free from the Date constructor -- `new Date(y, m + 1, 0).getDate()` even
// handles leap years. A calendar library would be a bigger download than the
// feature.

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/** A local yyyy-mm-dd.
 *
 *  Never `toISOString().slice(0, 10)`: that converts to UTC first, so an
 *  evening anywhere east of it files the day as tomorrow -- and a coach closing
 *  "the 4th" would be open on it. */
export function dateKey(value: string | Date): string {
  const at = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(at.getTime())) return '';
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`;
}

/** The cells of a month grid, Monday-first: leading blanks so the 1st lands on
 *  its own weekday, then every day of the month. Trailing blanks are not
 *  needed -- the grid simply ends. */
export function monthCells(year: number, month: number): (number | null)[] {
  // getDay() is Sunday-first; the app's week starts on Monday, the same as
  // `coach_availability.weekday`.
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  // Day 0 of the next month is the last day of this one.
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  return cells;
}

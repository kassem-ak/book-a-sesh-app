// Bookings data-access for the signed-in client.
//
// `bookings` holds both sides of every session and RLS (`book_party_read`) lets
// either party read the row, so an unfiltered select would mix the sessions you
// booked with the ones you coach. The explicit client_id filter is what makes
// this "My bookings".
import { ensureAppSession } from './session';
import { supabase } from './supabase';

// Exactly the live `booking_status` enum — never widen or invent members here.
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export type MyBooking = {
  id: string;
  coachId: string;
  coachName: string;
  scheduledFor: string;
  slotLabel: string | null;
  status: BookingStatus;
  totalCents: number;
};

export type PackageBalance = {
  id: string;
  coachName: string;
  label: string;
  used: number;
  total: number;
  expiresOn: string | null;
};

export type MyBookings = { upcoming: MyBooking[]; past: MyBooking[] };

// PostgREST returns an embedded to-one relation as an object, but the generated
// types model it as either shape depending on the join, so normalise once.
type Related<T> = T | T[] | null | undefined;

function firstRelated<T>(value: Related<T>): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

type CoachName = { name?: string | null };

type BookingRow = {
  id: string;
  coach_id: string;
  scheduled_for: string;
  slot_label: string | null;
  status: BookingStatus;
  total_cents: number | null;
  coach?: Related<CoachName>;
};

type BalanceRow = {
  id: string;
  label: string | null;
  used: number | null;
  total: number | null;
  expires_on: string | null;
  coach?: Related<CoachName>;
};

// `ensureAppSession()` only returns a public.users id on the anonymous demo
// path; a real email/SSO account gets its auth id back, which is not what these
// tables key on. Ask the server which app user we are instead of guessing.
export async function currentAppUserId(): Promise<string> {
  await ensureAppSession();
  const { data, error } = await supabase.rpc('current_app_user');
  if (error) throw error;
  const id = typeof data === 'string' ? data : null;
  if (!id) throw new Error('This account has no profile yet.');
  return id;
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
  no_show: 'No-show',
};

export function bookingStatusLabel(status: BookingStatus) {
  return STATUS_LABEL[status] ?? status;
}

// `guard_booking_status_transition` lets a client move only pending/confirmed
// to cancelled, so the button must not be offered anywhere else.
export function canCancel(status: BookingStatus) {
  return status === 'pending' || status === 'confirmed';
}

// Money is stored in cents and was charged in cents. Print the exact amount:
// drop the decimals only when there genuinely are none.
export function formatCents(cents: number) {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.trunc(cents));
  const rem = abs % 100;
  const whole = (abs - rem) / 100;
  return `${sign}$${whole}${rem === 0 ? '' : `.${String(rem).padStart(2, '0')}`}`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Hand-rolled rather than Intl: `toLocaleString` options are unreliable on
// Hermes across platforms, and the board's format is fixed ("Thu 09 · 6:30 PM").
export function formatSessionWhen(booking: Pick<MyBooking, 'scheduledFor' | 'slotLabel'>) {
  const at = new Date(booking.scheduledFor);
  if (Number.isNaN(at.getTime())) return booking.slotLabel ?? 'Time to be confirmed';
  const hours = at.getHours();
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const minutes = String(at.getMinutes()).padStart(2, '0');
  return `${WEEKDAYS[at.getDay()]} ${String(at.getDate()).padStart(2, '0')} · ${hour12}:${minutes} ${period}`;
}

export function formatExpiry(expiresOn: string | null) {
  if (!expiresOn) return null;
  const on = new Date(expiresOn);
  if (Number.isNaN(on.getTime())) return null;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Valid until ${months[on.getMonth()]} ${on.getDate()}`;
}

function toBooking(row: BookingRow): MyBooking {
  return {
    id: row.id,
    coachId: row.coach_id,
    coachName: firstRelated(row.coach)?.name ?? 'Coach',
    scheduledFor: row.scheduled_for,
    slotLabel: row.slot_label,
    status: row.status,
    totalCents: row.total_cents ?? 0,
  };
}

/**
 * Upcoming = still live (pending/confirmed) and not yet past its start time.
 * Everything else — cancelled, completed, no-show, or simply elapsed — is past,
 * so a session the coach forgot to close out still leaves the Upcoming list.
 */
export async function fetchMyBookings(): Promise<MyBookings> {
  const clientId = await currentAppUserId();
  const { data, error } = await supabase
    .from('bookings')
    // users exposes only the non-sensitive columns; asking for more is refused.
    .select('id, coach_id, scheduled_for, slot_label, status, total_cents, coach:users!bookings_coach_id_fkey(name)')
    .eq('client_id', clientId)
    .order('scheduled_for', { ascending: false });
  if (error) throw error;

  const now = Date.now();
  const upcoming: MyBooking[] = [];
  const past: MyBooking[] = [];
  for (const row of (data ?? []) as unknown as BookingRow[]) {
    const booking = toBooking(row);
    const startsAt = new Date(booking.scheduledFor).getTime();
    const live = booking.status === 'pending' || booking.status === 'confirmed';
    if (live && (Number.isNaN(startsAt) || startsAt >= now)) upcoming.push(booking);
    else past.push(booking);
  }
  // The query sorts newest-first, which is right for Past and backwards for
  // Upcoming — the next session belongs at the top.
  upcoming.reverse();
  return { upcoming, past };
}

export async function fetchMyPackageBalances(): Promise<PackageBalance[]> {
  const clientId = await currentAppUserId();
  const { data, error } = await supabase
    .from('client_package_balances')
    .select('id, label, used, total, expires_on, coach:users!client_package_balances_coach_id_fkey(name)')
    .eq('client_id', clientId);
  if (error) throw error;

  return ((data ?? []) as unknown as BalanceRow[]).map((row) => ({
    id: row.id,
    coachName: firstRelated(row.coach)?.name ?? 'Coach',
    label: row.label ?? 'Session pack',
    used: row.used ?? 0,
    total: row.total ?? 0,
    expiresOn: row.expires_on,
  }));
}

/**
 * Cancels one of the signed-in client's bookings. Only `status` is grantable on
 * `bookings`, and the guard trigger rejects anything but pending/confirmed →
 * cancelled. Selecting the row back is deliberate: RLS turns a forbidden update
 * into a silent zero-row success, and `.single()` turns that into an error
 * rather than a lie on screen.
 */
export async function cancelBooking(bookingId: string): Promise<BookingStatus> {
  await ensureAppSession();
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)
    .select('id, status')
    .single();
  if (error) throw error;
  return (data as { status: BookingStatus }).status;
}

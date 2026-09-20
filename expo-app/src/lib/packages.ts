import { currentAppUserId } from './session';
import { supabase } from './supabase';

// What is left of a package, and booking several of its sessions at once.
//
// A ten-session pack used to book exactly one session; the other nine were a
// number in a counter and the way to use them was to come back nine times.
//
// The counts come from `package_progress`, which derives them from the bookings
// rather than reading a counter. A counter only ever went up -- cancelling a
// session left it incremented, so a cancelled session was gone from the pack
// forever and a client who paid for ten could book nine.

/** One client's use of one package.
 *
 *  `taken + booked + pending + remaining` is the size of the pack. A cancelled
 *  or no-show session is in none of them, which is how it returns to
 *  `remaining`. */
export type PackageProgress = {
  packageId: string;
  clientId: string;
  coachId: string;
  /** The other party: the coach for a client's view, the client for a coach's. */
  withName: string;
  total: number;
  /** Asked for, the coach has not answered. */
  pending: number;
  /** Confirmed and still ahead. */
  booked: number;
  /** Completed, or confirmed and already in the past. */
  taken: number;
  remaining: number;
};

/** One session of a package: when, and which slot of the coach's day it is. */
export type SessionSlot = {
  /** ISO instant. */
  at: string;
  /** The coach's own slot label, which is what the server checks their schedule
   *  against. Display text would stop enforcing the day its format changed. */
  label: string;
};

const PROGRESS_COLUMNS = 'package_id, client_id, coach_id, total, pending, booked, taken, remaining';

type ProgressRow = {
  package_id: string;
  client_id: string;
  coach_id: string;
  total: number;
  pending: number;
  booked: number;
  taken: number;
  remaining: number;
};

const toProgress = (row: ProgressRow, withName: string): PackageProgress => ({
  packageId: row.package_id,
  clientId: row.client_id,
  coachId: row.coach_id,
  withName,
  total: row.total,
  pending: row.pending,
  booked: row.booked,
  taken: row.taken,
  remaining: row.remaining,
});

/** Names for the other party, in one round trip rather than one each. */
async function namesFor(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();
  const { data, error } = await supabase.from('users').select('id, name').in('id', unique);
  if (error) throw error;
  return new Map(((data ?? []) as { id: string; name: string | null }[])
    .map((row) => [row.id, row.name ?? 'Member']));
}

/** The packages this account has bought, and what is left of each. */
export async function fetchMyPackages(): Promise<PackageProgress[]> {
  const me = await currentAppUserId();
  const { data, error } = await supabase
    .from('package_progress').select(PROGRESS_COLUMNS).eq('client_id', me);
  if (error) throw error;
  const rows = (data ?? []) as ProgressRow[];
  const names = await namesFor(rows.map((row) => row.coach_id));
  return rows.map((row) => toProgress(row, names.get(row.coach_id) ?? 'Coach'));
}

/** The packages this coach's clients are working through.
 *
 *  Same view, read from the other side. `book_party_read` on bookings already
 *  says a booking is visible to its coach, and the view runs with the reader's
 *  own permissions -- so this is the coach's half of exactly the same rows the
 *  client sees, not a second calculation that could disagree. */
export async function fetchClientPackages(): Promise<PackageProgress[]> {
  const me = await currentAppUserId();
  const { data, error } = await supabase
    .from('package_progress').select(PROGRESS_COLUMNS).eq('coach_id', me);
  if (error) throw error;
  const rows = (data ?? []) as ProgressRow[];
  const names = await namesFor(rows.map((row) => row.client_id));
  return rows.map((row) => toProgress(row, names.get(row.client_id) ?? 'Member'));
}

/** Book several sessions of one package, or none of them.
 *
 *  One call rather than a loop: a loop would leave somebody with four of the
 *  five they chose and no way to tell which one failed. The server takes the
 *  whole list in one transaction and checks each slot against the coach's
 *  hours, their days off and what is left of the pack.
 *
 *  Returns how many were booked.
 */
export async function bookPackageSessions(
  coachId: string,
  packageId: string,
  slots: SessionSlot[],
): Promise<number> {
  await currentAppUserId();
  if (!slots.length) throw new Error('Pick at least one session.');
  const { data, error } = await supabase.rpc('book_package_sessions', {
    p_coach: coachId,
    p_package_id: packageId,
    p_slots: slots.map((slot) => ({ at: slot.at, label: slot.label })),
  });
  if (error) throw error;
  return typeof data === 'number' ? data : slots.length;
}

/** "3 booked · 1 waiting · 2 done · 4 left", skipping whatever is zero.
 *
 *  Zeroes are noise: a pack nobody has cancelled from has no pending sessions,
 *  and printing "0 waiting" invites the reader to wonder what it means. */
export function progressSummary(progress: PackageProgress): string {
  const parts: string[] = [];
  if (progress.booked) parts.push(`${progress.booked} booked`);
  if (progress.pending) parts.push(`${progress.pending} waiting`);
  if (progress.taken) parts.push(`${progress.taken} done`);
  parts.push(`${progress.remaining} left`);
  return parts.join(' · ');
}

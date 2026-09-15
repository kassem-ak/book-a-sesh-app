// Display helpers for the Courts feature. All venue/court/tournament data now
// comes from the server (src/lib/courts.ts); nothing is invented here.
import { Court, Tournament, Venue, equipmentRateCents } from '../lib/courts';
import { formatCents } from '../lib/bookings';

/** A specific court or tournament, addressed by ids rather than a display name. */
export type RsvpRef = {
  venueId: string;
  kind: 'court' | 'event';
  id: string;
};

export type RsvpSubject = {
  ref: RsvpRef;
  venue: Venue;
  court: Court | null;
  event: Tournament | null;
  title: string;
  /** Per-hour for courts; a flat per-team entry fee for tournaments. */
  priceCents: number;
  perHour: boolean;
  detail: string;
  /** null = this venue hires no equipment, so the toggle must not be offered. */
  equipmentCentsPerHour: number | null;
};

export const venueById = (venues: Venue[], id: string | null | undefined) =>
  venues.find((v) => v.id === id) ?? null;

/**
 * Resolve a court/tournament to its venue and price. Ids are only unique within
 * a venue, so both parts are required — matching on display name alone
 * mispriced same-named courts across venues.
 */
export const rsvpSubject = (venues: Venue[], ref: RsvpRef | null | undefined): RsvpSubject | null => {
  if (!ref) return null;
  const venue = venueById(venues, ref.venueId);
  if (!venue) return null;

  if (ref.kind === 'court') {
    const court = venue.courts.find((c) => c.id === ref.id);
    if (!court) return null;
    return {
      ref,
      venue,
      court,
      event: null,
      title: court.name,
      priceCents: court.priceCentsPerHour,
      perHour: true,
      detail: capacityLabel(court.capacity),
      equipmentCentsPerHour: equipmentRateCents(venue, court),
    };
  }

  const event = venue.events.find((e) => e.id === ref.id);
  if (!event) return null;
  // Tournaments are a flat per-team entry fee, not an hourly rate.
  return {
    ref,
    venue,
    court: null,
    event,
    title: event.name,
    priceCents: event.priceCents,
    perHour: false,
    detail: eventDatesLabel(event),
    equipmentCentsPerHour: null,
  };
};

export const capacityLabel = (capacity: number) => `${capacity} ${capacity === 1 ? 'Player' : 'Players'}`;

/** "$40/h" — exact cents, matching what reserve_court will charge per hour. */
export const perHourLabel = (cents: number) => `${formatCents(cents)}/h`;

/** "$40/TEAM" — a tournament's flat entry fee. */
export const entryFeeLabel = (cents: number) => `${formatCents(cents)}/TEAM`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// `starts_on` is a plain date ('2026-08-21'); `new Date()` on that string is
// parsed as UTC midnight and can render as the previous day west of Greenwich,
// so split the parts instead.
function formatDay(isoDate: string) {
  const [, month, day] = isoDate.split('-');
  const monthName = MONTHS[Number(month) - 1];
  if (!monthName || !day) return isoDate;
  return `${Number(day)} ${monthName}`;
}

export const eventDatesLabel = (event: Pick<Tournament, 'startsOn' | 'endsOn'>) =>
  event.startsOn === event.endsOn
    ? formatDay(event.startsOn)
    : `${formatDay(event.startsOn)} - ${formatDay(event.endsOn)}`;

/** '11:00:00' -> '11:00 am'. Postgres `time` always arrives as HH:MM[:SS]. */
export function formatTimeOfDay(time: string) {
  const [rawHour, rawMinute] = time.split(':');
  const hour = Number(rawHour);
  if (!Number.isFinite(hour)) return time;
  const period = hour >= 12 && hour < 24 ? 'pm' : 'am';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${rawMinute ?? '00'} ${period}`;
}

export const venueHoursLabel = (venue: Pick<Venue, 'opensAt' | 'closesAt'>) =>
  `${formatTimeOfDay(venue.opensAt)} - ${formatTimeOfDay(venue.closesAt)}`;

export const venueStatusLabel = (venue: Pick<Venue, 'status'>) =>
  venue.status === 'open' ? 'OPEN' : 'CLOSED';

/**
 * The gallery tab used to render nine invented "Album N" tiles. The real venue
 * rows carry only the photos they actually have, so the tab shows those and
 * otherwise says so.
 */
export function venuePhotoCaptions(venue: Venue) {
  const captions: string[] = [];
  if (venue.coverImageUrl) captions.push(`${venue.name} cover`);
  if (venue.imageUrl) captions.push(venue.name);
  for (const court of venue.courts) if (court.imageUrl) captions.push(court.name);
  for (const event of venue.events) if (event.imageUrl) captions.push(event.name);
  return captions;
}

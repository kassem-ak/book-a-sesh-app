// Courts data-access: venues + their courts and tournaments, the signed-in
// client's reservations, and the two money RPCs.
//
// No amount crosses the wire on a write. `reserve_court` / `enter_venue_event`
// derive every cent from the venue's own rows, so anything this module computes
// is a display estimate only (db/migrations/2026-09-03_venues.sql section 9).
import { BookingStatus, currentAppUserId } from './bookings';
import { GeoPoint, parseGeoPoint } from './geo';
import { ensureAppSession } from './session';
import { supabase } from './supabase';

export type VenueStatus = 'open' | 'closed';

/** Exactly the labels `reserve_court` accepts for p_booking_kind. */
export type CourtBookingKind = 'Single' | 'Teams' | 'Member of team';

export type Court = {
  id: string;
  name: string;
  capacity: number;
  priceCentsPerHour: number;
  /** Per-court override; null falls back to the venue rate. */
  equipmentCentsPerHour: number | null;
  imageUrl: string | null;
  active: boolean;
};

export type Tournament = {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string;
  /** Flat per-team entry fee — never multiplied by hours. */
  priceCents: number;
  imageUrl: string | null;
  active: boolean;
};

export type Venue = {
  id: string;
  slug: string | null;
  name: string;
  code: string | null;
  tint: string | null;
  city: string;
  sport: string;
  point: GeoPoint | null;
  status: VenueStatus;
  openDays: string;
  openWeekdays: number[];
  opensAt: string;
  closesAt: string;
  timezone: string;
  imageUrl: string | null;
  coverImageUrl: string | null;
  /** null = this venue does not hire equipment at all. */
  equipmentCentsPerHour: number | null;
  courts: Court[];
  events: Tournament[];
};

export type MyCourtReservation = {
  id: string;
  courtName: string;
  venueName: string;
  startsAt: string;
  hours: number;
  bookingKind: string;
  equipmentRented: boolean;
  totalCents: number;
  status: BookingStatus;
};

// `owner_id` is not in the client's column grant — asking for it fails the whole
// select, so the column list here is deliberate rather than `*`.
const VENUE_COLUMNS =
  'id, slug, name, code, tint, city, sport, location, status, open_days, open_weekdays, ' +
  'opens_at, closes_at, timezone, image_url, cover_image_url, equipment_cents_per_hour, ' +
  'courts(id, name, capacity, price_cents_per_hour, equipment_cents_per_hour, image_url, active), ' +
  'venue_events(id, name, starts_on, ends_on, price_cents, image_url, active)';

type CourtRow = {
  id: string;
  name: string;
  capacity: number | null;
  price_cents_per_hour: number | null;
  equipment_cents_per_hour: number | null;
  image_url: string | null;
  active: boolean | null;
};

type EventRow = {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  price_cents: number | null;
  image_url: string | null;
  active: boolean | null;
};

type VenueRow = {
  id: string;
  slug: string | null;
  name: string;
  code: string | null;
  tint: string | null;
  city: string | null;
  sport: string | null;
  location: unknown;
  status: VenueStatus | null;
  open_days: string | null;
  open_weekdays: number[] | null;
  opens_at: string | null;
  closes_at: string | null;
  timezone: string | null;
  image_url: string | null;
  cover_image_url: string | null;
  equipment_cents_per_hour: number | null;
  courts: CourtRow[] | null;
  venue_events: EventRow[] | null;
};

function toVenue(row: VenueRow): Venue {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    code: row.code,
    tint: row.tint,
    city: row.city ?? '',
    sport: row.sport ?? '',
    point: parseGeoPoint(row.location),
    status: row.status === 'closed' ? 'closed' : 'open',
    openDays: row.open_days ?? '',
    openWeekdays: row.open_weekdays ?? [],
    opensAt: row.opens_at ?? '09:00:00',
    closesAt: row.closes_at ?? '22:00:00',
    timezone: row.timezone ?? 'Asia/Beirut',
    imageUrl: row.image_url,
    coverImageUrl: row.cover_image_url,
    equipmentCentsPerHour: row.equipment_cents_per_hour,
    courts: (row.courts ?? [])
      .filter((court) => court.active !== false && court.price_cents_per_hour !== null)
      .map((court) => ({
        id: court.id,
        name: court.name,
        capacity: court.capacity ?? 2,
        priceCentsPerHour: court.price_cents_per_hour ?? 0,
        equipmentCentsPerHour: court.equipment_cents_per_hour,
        imageUrl: court.image_url,
        active: court.active !== false,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    events: (row.venue_events ?? [])
      .filter((event) => event.active !== false)
      .map((event) => ({
        id: event.id,
        name: event.name,
        startsOn: event.starts_on,
        endsOn: event.ends_on,
        priceCents: event.price_cents ?? 0,
        imageUrl: event.image_url,
        active: event.active !== false,
      }))
      .sort((a, b) => a.startsOn.localeCompare(b.startsOn)),
  };
}

/** Public browsing read — no session needed, `venue_read` is `using (true)`. */
export async function fetchVenues(): Promise<Venue[]> {
  const { data, error } = await supabase.from('venues').select(VENUE_COLUMNS).order('name');
  if (error) throw error;
  return ((data ?? []) as unknown as VenueRow[]).map(toVenue);
}

type Related<T> = T | T[] | null | undefined;

function firstRelated<T>(value: Related<T>): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

type ReservationRow = {
  id: string;
  starts_at: string;
  hours: number | null;
  booking_kind: string | null;
  equipment_rented: boolean | null;
  total_cents: number | null;
  status: BookingStatus;
  court?: Related<{ name?: string | null; venue?: Related<{ name?: string | null }> }>;
};

/**
 * "My reservations". `court_resv_read` also lets a venue owner see everything
 * booked at their venue, so the explicit client_id filter is what keeps an
 * owner's own list from swallowing their customers' rows — same reasoning as
 * fetchMyBookings().
 */
export async function fetchMyCourtReservations(): Promise<MyCourtReservation[]> {
  const clientId = await currentAppUserId();
  const { data, error } = await supabase
    .from('court_reservations')
    .select(
      'id, starts_at, hours, booking_kind, equipment_rented, total_cents, status, ' +
        'court:courts(name, venue:venues(name))',
    )
    .eq('client_id', clientId)
    .order('starts_at', { ascending: false });
  if (error) throw error;

  return ((data ?? []) as unknown as ReservationRow[]).map((row) => {
    const court = firstRelated(row.court);
    return {
      id: row.id,
      courtName: court?.name ?? 'Court',
      venueName: firstRelated(court?.venue)?.name ?? 'Venue',
      startsAt: row.starts_at,
      hours: row.hours ?? 1,
      bookingKind: row.booking_kind ?? 'single',
      equipmentRented: Boolean(row.equipment_rented),
      totalCents: row.total_cents ?? 0,
      status: row.status,
    };
  });
}

async function callRpc<T>(name: string, args: Record<string, unknown>) {
  // Every write goes through a session first: both RPCs start with
  // require_app_user() and would otherwise fail with a raw auth error.
  await ensureAppSession();
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data as T;
}

/**
 * Books a court. Returns the new reservation id. The server raises plain-English
 * errors ('this venue is closed', 'that court is already reserved for this
 * time', …) that are safe to show verbatim, so nothing is translated here.
 */
export async function reserveCourt(input: {
  courtId: string;
  startsAt: string;
  hours: number;
  kind: CourtBookingKind;
  equipment: boolean;
}) {
  return callRpc<string>('reserve_court', {
    p_court: input.courtId,
    p_starts_at: input.startsAt,
    p_hours: input.hours,
    p_booking_kind: input.kind,
    p_equipment: input.equipment,
  });
}

/** Enters a tournament at its flat per-team fee. Returns the new entry id. */
export async function enterVenueEvent(eventId: string) {
  return callRpc<string>('enter_venue_event', { p_event: eventId });
}

/** null = the venue does not hire equipment, so the RSVP toggle must not show. */
export function equipmentRateCents(venue: Venue, court: Court | null | undefined) {
  return court?.equipmentCentsPerHour ?? venue.equipmentCentsPerHour;
}

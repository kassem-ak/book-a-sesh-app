// Courts sample data — mirrors the `VENUES` array in the v2 prototype
// (design/handoff-v2/BOOKD App.dc.html, ~line 1404).
export interface CourtItem {
  id: string;
  name: string;
  players: string;
  price: string;
  /** Placeholder caption for the court photo tile. */
  photo?: string;
}

export interface CourtEvent {
  id: string;
  title: string;
  dates: string;
  price: string;
  /** Placeholder caption for the event photo tile. */
  photo?: string;
}

export interface Venue {
  id: string;
  name: string;
  code: string;
  tint: string;
  /** 'OPEN' | 'CLOSED' — derived from `open`, kept as a string for existing callers. */
  status: string;
  /** Raw open state from the prototype (`open: true/false`). */
  open: boolean;
  days: string;
  hours: string;
  city: string;
  distance: string;
  sport: string;
  courts: CourtItem[];
  events: CourtEvent[];
  albums: string[];
  /** Placeholder captions for the list thumbnail and the profile cover. */
  photo?: string;
  coverPhoto?: string;
}

const albums = (n: number) => Array.from({ length: n }, (_, i) => `Album ${i + 1}`);

export const venues: Venue[] = [
  {
    id: 'lgp',
    name: "Let's Go Paddle",
    code: 'LGP',
    tint: '#2A3A2E',
    status: 'OPEN',
    open: true,
    days: 'Mon to Sat',
    hours: '11:00 am - 12:00 am',
    city: 'Beirut, Lebanon',
    distance: '1.6 km',
    sport: 'Paddle',
    photo: 'venue photo',
    coverPhoto: 'court photo',
    courts: [
      { id: 'a', name: 'PADDLE COURT A', players: '4 Players', price: '$40/h', photo: 'court A photo' },
      { id: 'b', name: 'PADDLE COURT B', players: '2 Players', price: '$20/h', photo: 'court B photo' },
    ],
    events: [
      { id: 'e1', title: 'PADDLE ADULT TOURNAMENT', dates: '21 Aug - 25 Aug', price: '$40/TEAM', photo: 'tournament photo' },
      { id: 'e2', title: 'PADDLE JUNIOR TOURNAMENT', dates: '18 Aug - 20 Aug', price: '$40/TEAM', photo: 'juniors photo' },
    ],
    albums: albums(9),
  },
  {
    id: 'gp1',
    name: 'Go Paddle',
    code: 'GP',
    tint: '#2A333A',
    status: 'OPEN',
    open: true,
    days: 'Mon to Sun',
    hours: '9:00 am - 11:00 pm',
    city: 'Tyre, Lebanon',
    distance: '1.6 km',
    sport: 'Paddle',
    photo: 'venue photo',
    coverPhoto: 'court photo',
    courts: [{ id: 'a', name: 'CENTER COURT', players: '4 Players', price: '$36/h', photo: 'court photo' }],
    events: [],
    albums: albums(6),
  },
  {
    id: 'iy',
    name: 'Iron Yard Courts',
    code: 'IY',
    tint: '#3A2E2A',
    status: 'CLOSED',
    open: false,
    days: 'Mon to Sat',
    hours: '7:00 am - 10:00 pm',
    city: 'Jounieh, Lebanon',
    distance: '3.2 km',
    sport: 'Basketball',
    photo: 'venue photo',
    coverPhoto: 'court photo',
    courts: [{ id: 'a', name: 'HALF COURT 1', players: '6 Players', price: '$28/h', photo: 'court photo' }],
    events: [],
    albums: albums(6),
  },
];

export const venueById = (id: string) => venues.find((v) => v.id === id) ?? venues[0];

/**
 * Pull the integer out of a price string ("$40/h" -> 40, "$40/TEAM" -> 40).
 * Returns null when nothing sensible parses — callers must not invent a price.
 */
export const parsePrice = (price: string | null | undefined): number | null => {
  const match = String(price ?? '').match(/(\d[\d,]*)/);
  if (!match) return null;
  const n = parseInt(match[1].replace(/,/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** A specific court or event, addressed by ids rather than a display name. */
export type RsvpRef = {
  venueId: string;
  kind: 'court' | 'event';
  id: string;
};

export type RsvpSubject = {
  ref: RsvpRef;
  venue: Venue;
  title: string;
  /** Per-hour for courts; a flat entry fee for events. */
  price: number;
  perHour: boolean;
  detail: string;
};

/**
 * Resolve a court/event to its venue and price. Ids are only unique within a
 * venue, so both parts are required — matching on display name alone mispriced
 * same-named courts across venues.
 */
export const rsvpSubject = (ref: RsvpRef | null | undefined): RsvpSubject | null => {
  if (!ref) return null;
  const venue = venues.find((v) => v.id === ref.venueId);
  if (!venue) return null;

  if (ref.kind === 'court') {
    const court = venue.courts.find((c) => c.id === ref.id);
    const price = parsePrice(court?.price);
    if (!court || price === null) return null;
    return { ref, venue, title: court.name, price, perHour: true, detail: court.players };
  }

  const event = venue.events.find((e) => e.id === ref.id);
  const price = parsePrice(event?.price);
  if (!event || price === null) return null;
  // Tournaments are a flat per-team entry fee, not an hourly rate.
  return { ref, venue, title: event.title, price, perHour: false, detail: event.dates };
};

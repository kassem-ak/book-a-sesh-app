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
 * Pull the integer out of a price string ("$40/h" -> 40), per delta section C.
 * Falls back to the prototype's default of 40 when nothing parses.
 */
export const parsePrice = (price: string | null | undefined): number => {
  const n = parseInt(String(price ?? '').replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 40;
};

/** The venue that owns a court/event with this name. */
export const venueForTarget = (target: string | null | undefined): Venue | undefined => {
  if (!target) return undefined;
  return venues.find(
    (v) => v.courts.some((c) => c.name === target) || v.events.some((e) => e.title === target),
  );
};

/** Per-hour base price used by the RSVP maths, keyed by court/event name. */
export const priceForTarget = (target: string | null | undefined): number => {
  if (!target) return 40;
  for (const v of venues) {
    const court = v.courts.find((c) => c.name === target);
    if (court) return parsePrice(court.price);
    const event = v.events.find((e) => e.title === target);
    if (event) return parsePrice(event.price);
  }
  return 40;
};

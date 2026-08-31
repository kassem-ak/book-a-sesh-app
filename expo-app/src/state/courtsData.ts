// Courts sample data — mirrors the venues on the redesign board.
export interface CourtItem {
  id: string;
  name: string;
  players: string;
  price: string;
}

export interface CourtEvent {
  id: string;
  title: string;
  dates: string;
  price: string;
}

export interface Venue {
  id: string;
  name: string;
  code: string;
  tint: string;
  status: string;
  days: string;
  hours: string;
  city: string;
  distance: string;
  sport: string;
  courts: CourtItem[];
  events: CourtEvent[];
  albums: string[];
}

export const venues: Venue[] = [
  {
    id: 'lgp',
    name: "Let's Go Paddle",
    code: 'LGP',
    tint: '#2A3A2E',
    status: 'OPEN',
    days: 'Mon to Sat',
    hours: '11:00 am - 12:00 am',
    city: 'Beirut, Lebanon',
    distance: '1.6 km',
    sport: 'Paddle',
    courts: [
      { id: 'a', name: 'PADDLE COURT A', players: '4 Players', price: '$40/h' },
      { id: 'b', name: 'PADDLE COURT B', players: '2 Players', price: '$20/h' },
    ],
    events: [
      { id: 'e1', title: 'PADDLE ADULT TOURNAMENT', dates: '21st Aug - 15th AUG', price: '$40/TEAM' },
      { id: 'e2', title: 'PADDLE JUNIOR TOURNAMENT', dates: '18th Aug - 20th AUG', price: '$40/TEAM' },
    ],
    albums: ['Album 1', 'Album 2', 'Album 3', 'Album 4', 'Album 5', 'Album 6'],
  },
  {
    id: 'gp1',
    name: 'Go Paddle',
    code: 'GP',
    tint: '#2A333A',
    status: 'OPEN',
    days: 'Mon to Sun',
    hours: '09:00 am - 11:00 pm',
    city: 'Tyre, Lebanon',
    distance: '1.6 km',
    sport: 'Paddle',
    courts: [{ id: 'a', name: 'PADDLE COURT A', players: '4 Players', price: '$35/h' }],
    events: [],
    albums: ['Album 1', 'Album 2', 'Album 3'],
  },
  {
    id: 'gp2',
    name: 'Go Paddle',
    code: 'GP',
    tint: '#3A2E2A',
    status: 'OPEN',
    days: 'Mon to Sun',
    hours: '08:00 am - 10:00 pm',
    city: 'Tyre, Lebanon',
    distance: '1.6 km',
    sport: 'Paddle',
    courts: [{ id: 'a', name: 'PADDLE COURT A', players: '4 Players', price: '$30/h' }],
    events: [],
    albums: ['Album 1', 'Album 2'],
  },
];

export const venueById = (id: string) => venues.find((v) => v.id === id) ?? venues[0];

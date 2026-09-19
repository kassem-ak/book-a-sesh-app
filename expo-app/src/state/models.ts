export interface Person {
  id: string;
  name: string;
  avatarUrl?: string | null;
  sport: string;
  rating: number;
  reviews: number;
  price?: number;
  boosted: boolean;
  distance: number;
  level: string;
  sessions: string;
  reply: string;
  bio: string;
  /** Everything about this person, for search and the card. */
  tags: string[];
  /** A coach's subjects, in the order they lead with. Empty for members. */
  teaches?: string[];
  /** Sports and hobbies they do themselves, minus anything they teach --
   *  repeating a subject under both headings says nothing. */
  plays?: string[];
  goal?: string;
  isCoach: boolean;
  packages?: CoachPkg[];
}

export const initials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const firstName = (name: string) => name.split(' ')[0];
export const personMeta = (p: Person) =>
  [p.sport, p.isCoach ? null : p.goal].filter(Boolean).join(' - ');

export interface Review {
  name: string;
  whenLabel: string;
  initials: string;
  stars: number;
  text: string;
}

export interface Product {
  id?: string;
  name: string;
  price: number;
  ph: string;
}

export interface Shop {
  id: string;
  name: string;
  initials: string;
  tint: string;
  category: string;
  dist: number;
  rating: number;
  reviews: number;
  deal: string;
  pinTop: number;
  pinLeft: number;
  products: Product[];
}

export const shopDistLabel = (d: number) =>
  d < 1 ? `${Math.round(d * 1000)} m` : `${Math.round(d * 10) / 10} km`;

export interface SubGroup {
  id: string;
  name: string;
  area: string;
  members: string;
}

export interface Community {
  id: string;
  sport: string;
  code: string;
  tint: string;
  members: string;
  about: string;
  official: boolean;
  createdBy?: string;
}

export type CommunityRole = 'ADMIN' | 'MODERATOR' | 'MEMBER';

export interface CommunityMember {
  id: string;
  name: string;
  initials: string;
}

export interface EventItem {
  id: string;
  communityId: string;
  subId: string | null;
  type: 'Meetup' | 'Event';
  title: string;
  whenLabel: string;
  loc: string;
  attendees: number;
  host: string;
}

export const isMeetup = (e: EventItem) => e.type === 'Meetup';

export interface EventSuggestion {
  id: string;
  communityId: string;
  type: 'Meetup' | 'Event';
  title: string;
  whenLabel: string;
  loc: string;
  requestedBy: string;
  status: 'PENDING' | 'APPROVED';
}

export interface Chat {
  id: string;
  name: string;
  initials: string;
  last: string;
  whenLabel: string;
  unread: number;
  online: boolean;
}

export interface Message {
  text: string;
  me: boolean;
}

export interface Expense {
  id: string;
  label: string;
  amt: number;
  recur: string;
}

export interface HistoryEntry {
  whenLabel: string;
  title: string;
  detail: string;
  meta: string;
}

export type MarginKey = 'session' | 'shop' | 'boost';
export type ShareKey = string;
export type Margins = Record<MarginKey, number>;
export type Shares = Record<ShareKey, number>;

export interface MarginsShares {
  margins: Margins;
  shares: Shares;
}

export interface Proposal {
  to: MarginsShares;
  lines: string[];
  approvals: string[];
}

export interface Notif {
  whenLabel: string;
  title: string;
  body: string;
}

export type Role = 'USER' | 'COACH' | 'ADMIN';
export type CalProvider = 'GOOGLE' | 'APPLE' | 'OUTLOOK';
export const calProviderLabel: Record<CalProvider, string> = {
  GOOGLE: 'Google',
  APPLE: 'Apple',
  OUTLOOK: 'Outlook',
};

export interface Cert {
  id: string;
  name: string;
  issuer: string;
  year: string;
  verified: boolean;
}

export interface CoachPkg {
  id: string;
  sessions: number;
  price: number;
}

export interface BookingPackageOption {
  name: string;
  price: number;
  note: string;
  packageId: string | null;
  /** How many sessions the pack contains, so the booking screen can show how
   *  many are left. 1 for a single session. */
  sessions: number;
}

export const coachPackageOptions = (p: Person): BookingPackageOption[] => {
  const realPackages = (p.packages ?? [])
    .filter((pkg) => pkg.id && pkg.sessions > 0)
    .sort((a, b) => a.sessions - b.sessions)
    .map((pkg) => ({
      name: pkg.sessions === 1 ? 'Single session' : `${pkg.sessions}-session pack`,
      price: pkg.price,
      // Packages carry a session count, but no duration.
      note: pkg.sessions === 1 ? '1 session' : `${pkg.sessions} sessions`,
      packageId: pkg.id,
      sessions: pkg.sessions,
    }));

  // A coach who had defined any package lost the single session entirely:
  // the packages replaced the fallback rather than joining it, so the only way
  // to train with them once was to buy ten. Their per-session rate exists
  // precisely to price one session, so it is always offered alongside.
  const alreadyHasSingle = realPackages.some((pkg) => pkg.sessions === 1);
  const rate = p.price ?? 0;
  // Offered when the coach has actually set a rate. A 0 with packages present
  // would be quoting a price nobody chose; with no packages at all it is the
  // long-standing fallback, and the booking screen says "no price on file"
  // rather than printing $0.
  const offerSingle = !alreadyHasSingle && (rate > 0 || realPackages.length === 0);
  if (!offerSingle) return realPackages;

  return [
    { name: 'Single session', price: rate, note: '1 session', packageId: null, sessions: 1 },
    ...realPackages,
  ];
};

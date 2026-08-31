export interface Person {
  id: string;
  name: string;
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
  tags: string[];
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
  p.isCoach ? `${p.sport} · ${p.distance} km` : `${p.sport} · ${p.goal ?? ''}`;

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
export type ShareKey = 'alex' | 'rima' | 'karim';
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

export interface AdDef {
  key: string;
  brand: string;
  logo: string;
  tint: string;
  headline: string;
  body: string;
  cta: string;
  why: string;
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
}

export const coachPackageOptions = (p: Person): BookingPackageOption[] => {
  const realPackages = (p.packages ?? [])
    .filter((pkg) => pkg.id && pkg.sessions > 0)
    .sort((a, b) => a.sessions - b.sessions)
    .map((pkg) => ({
      name: pkg.sessions === 1 ? 'Single session' : `${pkg.sessions}-session pack`,
      price: pkg.price,
      note: pkg.sessions === 1 ? '60 min' : `${pkg.sessions} sessions`,
      packageId: pkg.id,
    }));
  if (realPackages.length > 0) return realPackages;
  return [{ name: 'Single session', price: p.price ?? 30, note: '60 min', packageId: null }];
};

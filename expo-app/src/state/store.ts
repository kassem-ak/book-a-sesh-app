import { create } from 'zustand';
import {
  Cert,
  CoachPkg,
  Community,
  CommunityRole,
  EventItem,
  EventSuggestion,
  Expense,
  HistoryEntry,
  MarginKey,
  Margins,
  MarginsShares,
  Notif,
  Proposal,
  Role,
  ShareKey,
  Shares,
  CalProvider,
} from './models';
import * as D from './sampleData';

// ---- number helpers (mirror the Kotlin/JS behavior) ----
const round2 = (x: number) => Math.round(x * 100) / 100;
const clampRound = (x: number) => round2(Math.max(0, Math.min(100, x)));
export const numStr = (d: number) => String(round2(d));
export const pct = (d: number) => numStr(d) + '%';
export const fmtMoney = (n: number) =>
  '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });

const EXPLICIT = ['sex', 'sexual', 'sexy', 'nude', 'naked', 'nsfw', 'xxx', 'porn', 'escort', 'erotic', 'onlyfans', 'hookup', 'fetish'];
export const isExplicit = (t: string) => {
  const l = t.toLowerCase();
  return EXPLICIT.some((w) => l.includes(w));
};

// weekly schedule time options (5:00 AM .. 10:30 PM)
export const SCHED_TIMES: string[] = (() => {
  const out: string[] = [];
  for (let h = 5; h <= 22; h++)
    for (const m of ['00', '30']) {
      const h12 = h % 12 === 0 ? 12 : h % 12;
      out.push(`${h12}:${m} ${h < 12 ? 'AM' : 'PM'}`);
    }
  return out;
})();
const byTime = (slots: string[]) => [...slots].sort((a, b) => SCHED_TIMES.indexOf(a) - SCHED_TIMES.indexOf(b));

const randCode = () =>
  Array.from({ length: 4 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 30)]).join('');

const CURRENT_USER_ID = 'alex';
const CURRENT_USER_NAME = 'Alex Morgan';
const EVENT_DAYS = [['WED', '02'], ['THU', '03'], ['FRI', '04'], ['SAT', '05'], ['SUN', '06'], ['MON', '07']];
const canModerateRole = (role: CommunityRole) => role === 'ADMIN' || role === 'MODERATOR';
const eventWhenLabel = (day: number, timeIdx: number) => {
  const [dow, num] = EVENT_DAYS[day] ?? EVENT_DAYS[0];
  const time = D.slotDefs[timeIdx] ?? D.slotDefs[0];
  return `${dow} ${num} · ${time}`;
};
const communitySlug = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || `community-${Date.now()}`;
const communityCode = (name: string) => {
  const letters = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join('')
    .toUpperCase();
  return (letters || name.slice(0, 2).toUpperCase()).slice(0, 2);
};

const marginGet = (m: Margins, k: string) => m[k as MarginKey];
const shareGet = (s: Shares, k: string) => s[k as ShareKey];

export interface SpotterState {
  // top level
  tab: string;
  role: Role;
  isDark: boolean;
  overlay: string | null;

  // discover / shop
  mode: string;
  sport: string;
  sortBy: string;
  discoverView: string;
  shopView: string;
  sportMenu: boolean;

  // selected ids
  openId: string;
  shopId: string;
  chatId: string;
  communityId: string;
  eventId: string;
  returnTo: string | null;

  // cart
  cart: Record<string, number>;

  // booking
  bookDay: number;
  bookSlot: number;
  bookPkg: number;
  booked: boolean;
  bookingChange: boolean;

  // prefs
  notifSeen: boolean;
  pushOn: boolean;
  dailyPlanOn: boolean;
  calSyncOn: boolean;
  calProvider: CalProvider;

  // ads
  adsHidden: Record<string, boolean>;

  // shop registration
  shopRegName: string;
  shopRegCat: string | null;
  shopRegCatOther: string;
  shopRegCatMenu: boolean;
  shopRegPhone: string;
  shopRegEmail: string;
  shopRegMeans: string | null;
  shopRegTime: string;
  shopRegDone: boolean;
  shopRegDoneName: string;
  shopRegDoneCat: string | null;
  shopRegDoneMeta: string;
  shopDecisions: Record<string, string>;

  // communities
  joinedCommunities: string[];
  joinedSubs: string[];
  goingEvents: string[];
  customCommunities: Community[];
  remoteCommunities: Community[];
  communityRoles: Record<string, CommunityRole>;
  communityMemberRoles: Record<string, Record<string, CommunityRole>>;
  communityAboutEdits: Record<string, string>;
  eventSuggestions: EventSuggestion[];

  // community + event creation
  customEvents: EventItem[];
  newType: string;
  newSport: string;
  newSub: string | null;
  newDay: number;
  newTime: number;
  newTitle: string;
  evtCreated: boolean;
  eventSuggested: boolean;
  commName: string;
  commCreated: boolean;
  editCommunityAbout: string;
  reqName: string;
  reqType: string;
  reqSent: boolean;

  // accounting
  acctMargins: Margins;
  acctShares: Shares;
  acctDraft: MarginsShares | null;
  acctProposal: Proposal | null;
  acctAppliedNote: string | null;
  acctNotif: Notif | null;
  acctEdits: Record<string, string>;
  acctExpItems: Expense[];
  acctHistory: HistoryEntry[];
  acctExpId: string | null;
  acctExpName: string;
  acctExpAmt: string;
  acctExpRecur: string;

  // coach
  myCerts: Cert[];
  apptDecisions: Record<string, string>;
  coachRate: number;
  schedDay: string;
  addTimeIdx: number;
  schedule: Record<string, string[]>;
  myPackages: CoachPkg[];
  newPkgSessions: number;
  newPkgPrice: number;
  cPromoPct: number;
  cPromoCode: string | null;

  // admin
  hobbyDecisions: Record<string, string>;
  caseDecisions: Record<string, string>;
  caseId: string;
  flagVerdicts: Record<string, string>;
  safetyCaseId: string;
  promoPct: number;
  promoAud: string;
  promoCode: string | null;
  loyaltyPts: Record<string, number>;

  // ---- generic setter ----
  set<K extends keyof SpotterState>(key: K, value: SpotterState[K]): void;

  // ---- actions ----
  toggleCommunity(id: string): void;
  toggleSub(id: string): void;
  toggleGoing(id: string): void;
  communities(): Community[];
  setRemoteCommunities(communities: Community[]): void;
  communityById(id: string): Community;
  communityAbout(id: string): string;
  currentCommunityRole(id?: string): CommunityRole;
  canAdminCommunity(id?: string): boolean;
  canModerateCommunity(id?: string): boolean;
  setCommunityMemberRole(communityId: string, memberId: string, role: CommunityRole): void;
  openEditCommunity(): void;
  saveCommunityContent(): void;
  openStartCommunity(): void;
  openRequest(): void;
  openCreateEvent(): void;
  openSuggestEvent(): void;
  submitEvent(): void;
  submitEventSuggestion(): void;
  approveEventSuggestion(id: string): void;
  submitCommunity(): void;
  submitRequest(): void;
  allEvents(): EventItem[];

  toggleCartItem(key: string, price: number): void;
  cartCount(): number;
  cartTotal(): number;

  openPerson(id: string): void;
  openBooking(): void;
  backToPerson(): void;
  confirmBooking(): void;
  goToBookings(): void;
  openBookings(): void;
  openShop(id: string): void;
  openChat(id: string): void;
  openCommunity(id: string): void;
  openEvent(id: string, from: string | null): void;
  openNotifs(): void;
  closeOverlay(): void;

  // accounting
  revenue: number;
  expTotal(): number;
  net(): number;
  effective(): MarginsShares;
  acctDirty(): boolean;
  acctEditable(): boolean;
  sharesTotal(): number;
  sharesOk(): boolean;
  acctAdjust(group: string, key: string, delta: number): void;
  acctEditRaw(group: string, key: string, text: string): void;
  acctRawText(group: string, key: string): string;
  submitProposal(): void;
  discardDraft(): void;
  approveAs(name: string): void;
  cancelProposal(): void;
  openExpenseNew(): void;
  openExpenseEdit(e: Expense): void;
  canSaveExpense(): boolean;
  saveExpense(): void;
  deleteExpense(): void;
  payoutLabel(key: string): string;

  // coach
  addCert(name: string): void;
  removeCert(id: string): void;
  openCase(id: string): void;
  openSafetyCase(id: string): void;
  backToReports(): void;
  decideCase(v: string): void;
  decideFlag(v: string): void;
  genPromo(): void;
  loyaltyAdjust(key: string, delta: number): void;
  daySlots(): string[];
  addTimeLabel(): string;
  canAddSlot(): boolean;
  addSlot(): void;
  removeSlot(t: string): void;
  setDayOff(): void;
  updPkg(id: string, dSessions?: number, dPrice?: number): void;
  removePkg(id: string): void;
  addPackage(): void;
  genCoachPromo(): void;
}

const current = (s: SpotterState): MarginsShares => ({ margins: s.acctMargins, shares: s.acctShares });
const eq = (a: MarginsShares, b: MarginsShares) =>
  JSON.stringify(a) === JSON.stringify(b);

const chgLines = (from: MarginsShares, to: MarginsShares): string[] => {
  const lines: string[] = [];
  for (const [k, label] of D.marginDefs)
    if (marginGet(from.margins, k) !== marginGet(to.margins, k))
      lines.push(`${label}: ${pct(marginGet(from.margins, k))} → ${pct(marginGet(to.margins, k))}`);
  for (const [k, label] of D.shareDefs)
    if (shareGet(from.shares, k) !== shareGet(to.shares, k))
      lines.push(`${label} share: ${pct(shareGet(from.shares, k))} → ${pct(shareGet(to.shares, k))}`);
  return lines;
};

export const useStore = create<SpotterState>((set, get) => ({
  tab: 'discover',
  role: 'USER',
  isDark: true,
  overlay: null,

  mode: 'coaches',
  sport: 'All',
  sortBy: 'rating',
  discoverView: 'cards',
  shopView: 'list',
  sportMenu: false,

  openId: 'c1',
  shopId: 's1',
  chatId: 'm1',
  communityId: 'running',
  eventId: 'ev1',
  returnTo: null,

  cart: {},

  bookDay: 9,
  bookSlot: 4,
  bookPkg: 2,
  booked: false,
  bookingChange: false,

  notifSeen: false,
  pushOn: true,
  dailyPlanOn: true,
  calSyncOn: false,
  calProvider: 'GOOGLE',

  adsHidden: {},

  shopRegName: '',
  shopRegCat: null,
  shopRegCatOther: '',
  shopRegCatMenu: false,
  shopRegPhone: '',
  shopRegEmail: '',
  shopRegMeans: null,
  shopRegTime: '',
  shopRegDone: false,
  shopRegDoneName: '',
  shopRegDoneCat: null,
  shopRegDoneMeta: '',
  shopDecisions: {},

  joinedCommunities: ['running', 'strength'],
  joinedSubs: ['run-downtown', 'str-iron'],
  goingEvents: ['ev1', 'ev3'],
  customCommunities: [],
  remoteCommunities: [],
  communityRoles: { running: 'ADMIN', strength: 'MODERATOR' },
  communityMemberRoles: {
    running: { rima: 'MODERATOR', karim: 'MEMBER', jordan: 'MEMBER', mei: 'MEMBER' },
    strength: { rima: 'MEMBER', karim: 'ADMIN', jordan: 'MEMBER', mei: 'MEMBER' },
  },
  communityAboutEdits: {},
  eventSuggestions: [
    {
      id: 'sg1',
      communityId: 'running',
      type: 'Meetup',
      title: 'Recovery jog for new runners',
      whenLabel: 'SAT 05 · 8:00 AM',
      loc: 'TBD',
      requestedBy: 'Jordan K.',
      status: 'PENDING',
    },
  ],

  customEvents: [],
  newType: 'Meetup',
  newSport: 'running',
  newSub: null,
  newDay: 3,
  newTime: 1,
  newTitle: '',
  evtCreated: false,
  eventSuggested: false,
  commName: '',
  commCreated: false,
  editCommunityAbout: '',
  reqName: '',
  reqType: 'Hobby',
  reqSent: false,

  acctMargins: { session: 12, shop: 8, boost: 15 },
  acctShares: { alex: 40, rima: 30, karim: 30 },
  acctDraft: null,
  acctProposal: null,
  acctAppliedNote: null,
  acctNotif: null,
  acctEdits: {},
  acctExpItems: [...D.initialExpenses],
  acctHistory: [...D.initialHistory],
  acctExpId: null,
  acctExpName: '',
  acctExpAmt: '',
  acctExpRecur: 'Monthly',

  myCerts: [{ id: 'ct1', name: 'First Aid & CPR', issuer: 'Red Cross Lebanon', year: '2025', verified: true }],
  apptDecisions: {},
  coachRate: 0,
  schedDay: 'THU',
  addTimeIdx: 4,
  schedule: {
    MON: ['6:30 AM', '8:00 AM', '5:30 PM', '6:30 PM'],
    TUE: ['6:30 AM', '8:00 AM', '5:30 PM', '6:30 PM'],
    WED: ['6:30 AM', '5:30 PM', '6:30 PM'],
    THU: ['6:30 AM', '8:00 AM', '5:30 PM', '6:30 PM'],
    FRI: ['6:30 AM', '8:00 AM', '5:30 PM'],
    SAT: ['8:00 AM', '12:00 PM'],
    SUN: [],
  },
  myPackages: [
    { id: 'pk1', sessions: 1, price: 45 },
    { id: 'pk2', sessions: 5, price: 203 },
    { id: 'pk3', sessions: 12, price: 421 },
  ],
  newPkgSessions: 10,
  newPkgPrice: 380,
  cPromoPct: 15,
  cPromoCode: null,

  hobbyDecisions: {},
  caseDecisions: {},
  caseId: 'r1',
  flagVerdicts: {},
  safetyCaseId: 'sf-demo1',
  promoPct: 15,
  promoAud: 'All users',
  promoCode: null,
  loyaltyPts: { l1: 500, l2: 900, l3: 1500 },

  set: (key, value) => set({ [key]: value } as Partial<SpotterState>),

  toggleCommunity: (id) =>
    set((s) => {
      const joined = s.joinedCommunities.includes(id);
      if (joined) return { joinedCommunities: s.joinedCommunities.filter((x) => x !== id) };
      return {
        joinedCommunities: [...s.joinedCommunities, id],
        communityRoles: { ...s.communityRoles, [id]: s.communityRoles[id] ?? 'MEMBER' },
      };
    }),
  toggleSub: (id) =>
    set((s) => ({
      joinedSubs: s.joinedSubs.includes(id) ? s.joinedSubs.filter((x) => x !== id) : [...s.joinedSubs, id],
    })),
  toggleGoing: (id) =>
    set((s) => ({
      goingEvents: s.goingEvents.includes(id) ? s.goingEvents.filter((x) => x !== id) : [...s.goingEvents, id],
    })),

  communities: () => {
    const remote = get().remoteCommunities;
    return [...get().customCommunities, ...(remote.length > 0 ? remote : D.communities)];
  },
  setRemoteCommunities: (communities) => set({ remoteCommunities: communities }),
  communityById: (id) =>
    get().customCommunities.find((cm) => cm.id === id) ?? get().remoteCommunities.find((cm) => cm.id === id) ?? D.communityById(id),
  communityAbout: (id) => get().communityAboutEdits[id] ?? get().communityById(id).about,
  currentCommunityRole: (id) => get().communityRoles[id ?? get().communityId] ?? 'MEMBER',
  canAdminCommunity: (id) => get().currentCommunityRole(id) === 'ADMIN',
  canModerateCommunity: (id) => canModerateRole(get().currentCommunityRole(id)),
  setCommunityMemberRole: (communityId, memberId, role) => {
    const s = get();
    if (!s.canAdminCommunity(communityId) || memberId === CURRENT_USER_ID) return;
    set({
      communityMemberRoles: {
        ...s.communityMemberRoles,
        [communityId]: { ...(s.communityMemberRoles[communityId] ?? {}), [memberId]: role },
      },
    });
  },
  openEditCommunity: () => {
    const s = get();
    if (!s.canModerateCommunity(s.communityId)) return;
    set({ overlay: 'editCommunity', editCommunityAbout: s.communityAbout(s.communityId) });
  },
  saveCommunityContent: () => {
    const s = get();
    const about = s.editCommunityAbout.trim();
    if (!s.canModerateCommunity(s.communityId) || about.length === 0 || isExplicit(about)) return;
    set({ communityAboutEdits: { ...s.communityAboutEdits, [s.communityId]: about }, overlay: 'community' });
  },

  openStartCommunity: () => set({ overlay: 'startCommunity', commCreated: false, commName: '' }),
  openRequest: () => set({ overlay: 'request', reqSent: false, reqName: '', reqType: 'Hobby' }),
  openCreateEvent: () => {
    const s = get();
    if (!s.canModerateCommunity(s.communityId)) {
      set({
        overlay: 'suggestEvent',
        eventSuggested: false,
        newTitle: '',
        newType: 'Meetup',
        newSport: s.communityId,
        newSub: null,
        newDay: 3,
        newTime: 1,
      });
      return;
    }
    set({
      overlay: 'createEvent',
      evtCreated: false,
      newTitle: '',
      newType: 'Meetup',
      newSport: s.communityId,
      newSub: null,
      newDay: 3,
      newTime: 1,
    });
  },
  openSuggestEvent: () => {
    const s = get();
    set({
      overlay: 'suggestEvent',
      eventSuggested: false,
      newTitle: '',
      newType: 'Meetup',
      newSport: s.communityId,
      newSub: null,
      newDay: 3,
      newTime: 1,
    });
  },

  submitEvent: () => {
    const s = get();
    if (!s.canModerateCommunity(s.newSport) || s.newTitle.trim() === '' || isExplicit(s.newTitle)) return;
    const ev: EventItem = {
      id: `cust${Date.now()}`,
      communityId: s.newSport,
      subId: s.newSub,
      type: s.newType as 'Meetup' | 'Event',
      title: s.newTitle.trim(),
      whenLabel: eventWhenLabel(s.newDay, s.newTime),
      loc: 'TBD',
      attendees: 1,
      host: CURRENT_USER_NAME,
    };
    set({ customEvents: [ev, ...s.customEvents], goingEvents: [...s.goingEvents, ev.id], evtCreated: true, overlay: 'community' });
  },
  submitEventSuggestion: () => {
    const s = get();
    if (s.newTitle.trim() === '' || isExplicit(s.newTitle)) return;
    const suggestion: EventSuggestion = {
      id: `sug${Date.now()}`,
      communityId: s.newSport,
      type: s.newType as 'Meetup' | 'Event',
      title: s.newTitle.trim(),
      whenLabel: eventWhenLabel(s.newDay, s.newTime),
      loc: 'TBD',
      requestedBy: `${CURRENT_USER_NAME} (you)`,
      status: 'PENDING',
    };
    set({ eventSuggestions: [suggestion, ...s.eventSuggestions], eventSuggested: true });
  },
  approveEventSuggestion: (id) => {
    const s = get();
    const suggestion = s.eventSuggestions.find((item) => item.id === id);
    if (!suggestion || suggestion.status !== 'PENDING' || !s.canModerateCommunity(suggestion.communityId)) return;
    const ev: EventItem = {
      id: `approved${Date.now()}`,
      communityId: suggestion.communityId,
      subId: null,
      type: suggestion.type,
      title: suggestion.title,
      whenLabel: suggestion.whenLabel,
      loc: suggestion.loc,
      attendees: 1,
      host: suggestion.requestedBy,
    };
    set({
      customEvents: [ev, ...s.customEvents],
      eventSuggestions: s.eventSuggestions.map((item) => (item.id === id ? { ...item, status: 'APPROVED' } : item)),
    });
  },
  submitCommunity: () => {
    const s = get();
    const name = s.commName.trim();
    if (name === '' || isExplicit(name)) return;
    const existing = new Set(s.communities().map((cm) => cm.id));
    const base = communitySlug(name);
    let id = base;
    let suffix = 2;
    while (existing.has(id)) id = `${base}-${suffix++}`;
    const community: Community = {
      id,
      sport: name,
      code: communityCode(name),
      tint: '#2F3A2A',
      members: '1',
      about: `${name} community started by ${CURRENT_USER_NAME}. Share plans, create events, and grow the crew.`,
      official: false,
      createdBy: CURRENT_USER_ID,
    };
    set({
      customCommunities: [community, ...s.customCommunities],
      joinedCommunities: [...s.joinedCommunities, id],
      communityRoles: { ...s.communityRoles, [id]: 'ADMIN' },
      communityMemberRoles: { ...s.communityMemberRoles, [id]: {} },
      communityId: id,
      commCreated: true,
    });
  },
  submitRequest: () => {
    const s = get();
    if (s.reqName.trim() === '' || isExplicit(s.reqName)) return;
    set({ reqSent: true });
  },
  allEvents: () => [...get().customEvents, ...D.events],

  toggleCartItem: (key, price) =>
    set((s) => {
      const cart = { ...s.cart };
      if (key in cart) delete cart[key];
      else cart[key] = price;
      return { cart };
    }),
  cartCount: () => Object.keys(get().cart).length,
  cartTotal: () => Object.values(get().cart).reduce((a, b) => a + b, 0),

  openPerson: (id) => set({ openId: id, overlay: 'person' }),
  openBooking: () => set({ overlay: 'booking', booked: false }),
  backToPerson: () => set({ overlay: 'person', booked: false }),
  confirmBooking: () => set({ booked: true }),
  goToBookings: () => set({ overlay: 'bookings', booked: false }),
  openBookings: () => set({ overlay: 'bookings' }),
  openShop: (id) => set({ shopId: id, overlay: 'shop' }),
  openChat: (id) => set({ chatId: id, overlay: 'conversation' }),
  openCommunity: (id) => set({ communityId: id, sportMenu: false, overlay: 'community' }),
  openEvent: (id, from) => set({ eventId: id, returnTo: from, overlay: 'event' }),
  openNotifs: () => set({ overlay: 'notifications', notifSeen: true }),
  closeOverlay: () => set({ overlay: null }),

  revenue: D.revenue,
  expTotal: () => get().acctExpItems.reduce((a, e) => a + e.amt, 0),
  net: () => round2(get().revenue - get().expTotal()),
  effective: () => get().acctDraft ?? current(get()),
  acctDirty: () => {
    const s = get();
    return s.acctDraft !== null && !eq(s.acctDraft, current(s));
  },
  acctEditable: () => get().acctProposal === null,
  sharesTotal: () => {
    const sh = get().effective().shares;
    return sh.alex + sh.rima + sh.karim;
  },
  sharesOk: () => Math.abs(get().sharesTotal() - 100) < 0.005,

  acctAdjust: (group, key, delta) => {
    const s = get();
    if (s.acctProposal !== null) return;
    const base = s.acctDraft ?? current(s);
    const draft: MarginsShares =
      group === 'margins'
        ? { ...base, margins: { ...base.margins, [key]: clampRound(marginGet(base.margins, key) + delta) } }
        : { ...base, shares: { ...base.shares, [key]: clampRound(shareGet(base.shares, key) + delta) } };
    const edits = { ...s.acctEdits };
    delete edits[`${group}:${key}`];
    set({ acctDraft: draft, acctEdits: edits });
  },
  acctEditRaw: (group, key, text) => {
    const s = get();
    if (s.acctProposal !== null) return;
    const edits = { ...s.acctEdits, [`${group}:${key}`]: text };
    const num = parseFloat(text);
    let draft = s.acctDraft;
    if (!isNaN(num) && num >= 0 && num <= 100) {
      const base = s.acctDraft ?? current(s);
      const r = round2(num);
      draft =
        group === 'margins'
          ? { ...base, margins: { ...base.margins, [key]: r } }
          : { ...base, shares: { ...base.shares, [key]: r } };
    }
    set({ acctEdits: edits, acctDraft: draft });
  },
  acctRawText: (group, key) => {
    const s = get();
    const raw = s.acctEdits[`${group}:${key}`];
    if (raw !== undefined) return raw;
    const eff = s.effective();
    return numStr(group === 'margins' ? marginGet(eff.margins, key) : shareGet(eff.shares, key));
  },

  submitProposal: () => {
    const s = get();
    if (!s.acctDirty() || !s.sharesOk() || s.acctProposal !== null) return;
    const d = s.acctDraft;
    if (!d) return;
    set({
      acctProposal: { to: d, lines: chgLines(current(s), d), approvals: ['Alex Morgan (you)'] },
      acctDraft: null,
      acctEdits: {},
      acctAppliedNote: null,
    });
  },
  discardDraft: () => set({ acctDraft: null, acctEdits: {} }),
  approveAs: (name) => {
    const s = get();
    const prop = s.acctProposal;
    if (!prop || prop.approvals.includes(name)) return;
    const approvals = [...prop.approvals, name];
    if (approvals.length >= 3) {
      const marginChanged = D.marginDefs.some(([k]) => marginGet(s.acctMargins, k) !== marginGet(prop.to.margins, k));
      const entry: HistoryEntry = {
        whenLabel: 'Just now',
        title: marginChanged ? 'Margins & shares updated' : 'Profit shares updated',
        detail: prop.lines.join(' · '),
        meta: 'Approved by 3 admins' + (marginChanged ? ' · affected users notified' : ' · internal only'),
      };
      const patch: Partial<SpotterState> = {
        acctMargins: prop.to.margins,
        acctShares: prop.to.shares,
        acctProposal: null,
        acctHistory: [entry, ...s.acctHistory],
        acctAppliedNote:
          'Approved by 3 admins — change is live.' +
          (marginChanged ? ' Affected users were notified.' : ' Internal change · no users affected.'),
      };
      if (marginChanged) {
        patch.acctNotif = {
          whenLabel: 'Just now',
          title: 'Platform fees updated',
          body:
            prop.lines.filter((l) => !l.includes(' share:')).join(' · ') +
            '. Applies to all new transactions starting now.',
        };
        patch.notifSeen = false;
      }
      set(patch);
    } else {
      set({ acctProposal: { ...prop, approvals } });
    }
  },
  cancelProposal: () => set({ acctProposal: null }),

  openExpenseNew: () => set({ acctExpId: null, acctExpName: '', acctExpAmt: '', acctExpRecur: 'Monthly', overlay: 'acctExpense' }),
  openExpenseEdit: (e) => set({ acctExpId: e.id, acctExpName: e.label, acctExpAmt: numStr(e.amt), acctExpRecur: e.recur, overlay: 'acctExpense' }),
  canSaveExpense: () => {
    const s = get();
    const amt = parseFloat(s.acctExpAmt);
    return s.acctExpName.trim().length > 1 && !isNaN(amt) && amt > 0;
  },
  saveExpense: () => {
    const s = get();
    if (!s.canSaveExpense()) return;
    const amt = round2(parseFloat(s.acctExpAmt));
    const id = s.acctExpId ?? `e${Date.now()}`;
    const item: Expense = { id, label: s.acctExpName.trim(), amt, recur: s.acctExpRecur };
    const editing = s.acctExpId !== null;
    const items = editing ? s.acctExpItems.map((x) => (x.id === s.acctExpId ? item : x)) : [...s.acctExpItems, item];
    const entry: HistoryEntry = {
      whenLabel: 'Just now',
      title: editing ? 'Expense updated' : 'Expense added',
      detail: `${item.label}: ${fmtMoney(amt)} (${item.recur})`,
      meta: 'By Alex Morgan (you)',
    };
    set({ acctExpItems: items, acctHistory: [entry, ...s.acctHistory], overlay: 'adminAccounting' });
  },
  deleteExpense: () => {
    const s = get();
    const e = s.acctExpItems.find((x) => x.id === s.acctExpId);
    if (e) {
      const entry: HistoryEntry = {
        whenLabel: 'Just now',
        title: 'Expense removed',
        detail: `${e.label}: ${fmtMoney(e.amt)} (${e.recur})`,
        meta: 'By Alex Morgan (you)',
      };
      set({ acctExpItems: s.acctExpItems.filter((x) => x.id !== s.acctExpId), acctHistory: [entry, ...s.acctHistory] });
    }
    set({ overlay: 'adminAccounting' });
  },
  payoutLabel: (key) => {
    const s = get();
    return fmtMoney(Math.round((s.net() * shareGet(s.effective().shares, key)) / 100)) + ' / mo';
  },

  addCert: (name) =>
    set((s) => ({ myCerts: [...s.myCerts, { id: `ct${Date.now()}`, name, issuer: 'Awaiting verification', year: '2026', verified: false }] })),
  removeCert: (id) => set((s) => ({ myCerts: s.myCerts.filter((x) => x.id !== id) })),
  openCase: (id) => set({ caseId: id, overlay: 'adminCase' }),
  openSafetyCase: (id) => set({ safetyCaseId: id, overlay: 'safetyCase' }),
  backToReports: () => set({ overlay: 'adminReports' }),
  decideCase: (v) => set((s) => ({ caseDecisions: { ...s.caseDecisions, [s.caseId]: v } })),
  decideFlag: (v) => set((s) => ({ flagVerdicts: { ...s.flagVerdicts, [s.safetyCaseId]: v } })),
  genPromo: () => set((s) => ({ promoCode: `SPOT${s.promoPct}-${randCode()}` })),
  loyaltyAdjust: (key, delta) =>
    set((s) => ({ loyaltyPts: { ...s.loyaltyPts, [key]: Math.max(100, (s.loyaltyPts[key] ?? 100) + delta) } })),

  daySlots: () => byTime(get().schedule[get().schedDay] ?? []),
  addTimeLabel: () => SCHED_TIMES[get().addTimeIdx] ?? SCHED_TIMES[0],
  canAddSlot: () => !(get().schedule[get().schedDay] ?? []).includes(get().addTimeLabel()),
  addSlot: () => {
    const s = get();
    if (!s.canAddSlot()) return;
    set({ schedule: { ...s.schedule, [s.schedDay]: byTime([...(s.schedule[s.schedDay] ?? []), s.addTimeLabel()]) } });
  },
  removeSlot: (t) => set((s) => ({ schedule: { ...s.schedule, [s.schedDay]: (s.schedule[s.schedDay] ?? []).filter((x) => x !== t) } })),
  setDayOff: () => set((s) => ({ schedule: { ...s.schedule, [s.schedDay]: [] } })),
  updPkg: (id, dSessions = 0, dPrice = 0) =>
    set((s) => ({
      myPackages: s.myPackages.map((p) =>
        p.id === id ? { ...p, sessions: Math.max(1, p.sessions + dSessions), price: Math.max(5, p.price + dPrice) } : p
      ),
    })),
  removePkg: (id) => set((s) => ({ myPackages: s.myPackages.filter((x) => x.id !== id) })),
  addPackage: () =>
    set((s) => ({ myPackages: [...s.myPackages, { id: `pk${Date.now()}`, sessions: s.newPkgSessions, price: s.newPkgPrice }] })),
  genCoachPromo: () => set((s) => ({ cPromoCode: `ALEX-${randCode()}-${s.cPromoPct}` })),
}));

// Data-access layer for Supabase. Public reads power browsing screens; writes are gated by RLS.
import { currentAppUserId } from './bookings';
import { ensureAppSession } from './session';
import { supabase } from './supabase';
import { CoachPkg, Person } from '../state/models';
import { GeoPoint, parseGeoPoint } from './geo';

export type DiscoverSort = 'rating' | 'price' | 'distance';
export type EventKind = 'Meetup' | 'Event';

export type CartCheckoutItem = {
  product_id: string;
  qty: number;
};

async function callRpc<T>(name: string, args?: Record<string, unknown>) {
  await ensureAppSession();
  const { data, error } = await supabase.rpc(name, args ?? {});
  if (error) throw error;
  return data as T;
}

function firstRow<T>(rows: T[] | T | null): T {
  if (Array.isArray(rows)) {
    if (!rows[0]) throw new Error('No row returned');
    return rows[0];
  }
  if (!rows) throw new Error('No row returned');
  return rows;
}

// --- health check: confirms env + connectivity + a readable table ---
export async function pingSupabase() {
  const { count, error } = await supabase
    .from('coach_profiles')
    .select('*', { count: 'exact', head: true });
  return { ok: !error, count: count ?? 0, error: error?.message };
}

type RelatedProfile = { name?: string | null; avatar_url?: string | null; profile_tags?: { tag: string }[] };
type RelatedName = RelatedProfile | RelatedProfile[] | null;

type GeoPerson = Person & {
  coordinates?: GeoPoint | null;
};

type RemotePackage = {
  id: string;
  sessions?: number | null;
  price_cents?: number | null;
  active?: boolean | null;
};

type RemoteCoach = {
  user_id: string;
  headline?: string | null;
  bio?: string | null;
  level?: string | null;
  price_cents?: number | null;
  reply_time?: string | null;
  sessions_count?: number | null;
  rating_avg?: number | string | null;
  reviews_count?: number | null;
  boosted?: boolean | null;
  user?: RelatedName;
  sport?: RelatedName;
  location?: unknown;
  packages?: RemotePackage[] | null;
};

function firstRelated<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

function toNumber(value: number | string | null | undefined) {
  const num = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function fromRemoteCoach(row: RemoteCoach): GeoPerson {
  const name = firstRelated(row.user)?.name ?? 'Coach';
  const sport = firstRelated(row.sport)?.name ?? 'Coaching';
  const packages: CoachPkg[] = (row.packages ?? [])
    .filter((pkg) => pkg.active !== false && (pkg.sessions ?? 0) > 0)
    .map((pkg) => ({ id: pkg.id, sessions: pkg.sessions ?? 1, price: (pkg.price_cents ?? 0) / 100 }))
    .filter((pkg) => pkg.id && pkg.price >= 0)
    .sort((a, b) => a.sessions - b.sessions);
  const headline = row.headline ?? row.level ?? 'Coach';
  const coordinates = parseGeoPoint(row.location ?? row);
  return {
    id: row.user_id,
    name,
    avatarUrl: firstRelated(row.user)?.avatar_url,
    sport,
    rating: toNumber(row.rating_avg),
    reviews: row.reviews_count ?? 0,
    price: (row.price_cents ?? 0) / 100,
    boosted: Boolean(row.boosted),
    distance: Number.POSITIVE_INFINITY,
    level: row.level ?? headline,
    sessions: String(row.sessions_count ?? 0),
    reply: row.reply_time ?? '',
    bio: row.bio ?? row.headline ?? '',
    tags: [...new Set([...(firstRelated(row.user)?.profile_tags ?? []).map((tag) => tag.tag), headline, sport].filter(Boolean))],
    isCoach: true,
    packages,
    coordinates,
  };
}

// --- Discover: coaches ordered by rating or price, with joined name + sport ---
type CoachPackageRow = {
  id: string;
  coach_id: string;
  sessions: number;
  price_cents: number;
  active: boolean;
};

export async function fetchCoaches(sort: DiscoverSort = 'rating') {
  const order =
    sort === 'price'
      ? { column: 'price_cents', ascending: true }
      : { column: 'rating_avg', ascending: false };
  const { data, error } = await supabase
    .from('coach_profiles')
    .select('user_id, headline, bio, level, price_cents, reply_time, sessions_count, rating_avg, reviews_count, boosted, user:users(name, avatar_url, profile_tags(tag)), sport:sports(name)')
    .order(order.column, { ascending: order.ascending });
  if (error) throw error;

  const coachIds = (data ?? []).map((row) => row.user_id).filter(Boolean);
  if (coachIds.length === 0) return [];

  const { data: packageRows, error: packageError } = await supabase
    .from('packages')
    .select('id, coach_id, sessions, price_cents, active')
    .in('coach_id', coachIds)
    .eq('active', true)
    .order('sessions', { ascending: true });
  if (packageError) throw packageError;

  const packagesByCoach = new Map<string, CoachPackageRow[]>();
  for (const pkg of (packageRows ?? []) as CoachPackageRow[]) {
    const list = packagesByCoach.get(pkg.coach_id) ?? [];
    list.push(pkg);
    packagesByCoach.set(pkg.coach_id, list);
  }

  return (data ?? []).map((row) => fromRemoteCoach({ ...row, packages: packagesByCoach.get(row.user_id) ?? [] }));
}

// Public partner profiles share the same discovery list; no private user fields.
export async function fetchPartners(): Promise<Person[]> {
  const { data, error } = await supabase.from('partner_profiles')
    .select('user_id, level, goal, bio, looking_for, user:users(name, avatar_url, profile_tags(tag)), sport:sports(name)');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.user_id,
    name: firstRelated(row.user)?.name ?? 'Training partner',
    avatarUrl: firstRelated(row.user)?.avatar_url,
    sport: firstRelated(row.sport)?.name ?? 'Training',
    level: row.level ?? '',
    goal: row.goal ?? undefined,
    bio: row.bio ?? '',
    tags: [...new Set([...(firstRelated(row.user)?.profile_tags ?? []).map((tag) => tag.tag), row.looking_for, row.goal].filter((tag): tag is string => Boolean(tag)))],
    rating: 0,
    reviews: 0,
    boosted: false,
    distance: Number.POSITIVE_INFINITY,
    sessions: '0',
    reply: '',
    isCoach: false,
  }));
}

// --- Shop marketplace: approved partner shops with active catalog items ---
export async function fetchShops() {
  const { data, error } = await supabase
    .from('shops')
    .select('id, slug, name, initials, tint, category, deal_text, rating_avg, reviews_count, products(id, name, price_cents, image_url, is_featured, position, active)')
    .eq('status', 'approved')
    .eq('is_partner', true)
    .order('rating_avg', { ascending: false });
  if (error) throw error;
  return data;
}

// --- Communities list ---
export async function fetchCommunities() {
  const { data, error } = await supabase
    .from('communities')
    .select('id, slug, name, code, tint, about, official, members_count');
  if (error) throw error;
  return data;
}

// --- Public community events, joined to their community slug and host name ---
export async function fetchEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('id, community_id, subgroup_id, type, title, starts_at, when_label, location, attendees_count, community:communities(slug), host:users!events_host_id_fkey(name)')
    // Label-only events have no timestamp and must remain discoverable.
    .or(`starts_at.gte.${new Date().toISOString()},starts_at.is.null`)
    .order('starts_at', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function fetchEventSuggestions() {
  await ensureAppSession();
  const { data, error } = await supabase
    .from('event_suggestions')
    .select('id, community_id, type, title, when_label, location, status, community:communities(slug), requester:users!event_suggestions_proposed_by_fkey(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Fetch memberships together; a signed-out browse must not create a session.
export async function fetchMyCommunityMemberships(): Promise<{ community_id: string; role: string }[]> {
  const { data: session, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session.session) return [];
  // Memberships reference public.users.id, which can differ from the auth id.
  const me = await currentAppUserId();
  const { data, error } = await supabase
    .from('community_members')
    .select('community_id, role')
    .eq('user_id', me);
  if (error) throw error;
  return data ?? [];
}

// --- My role in a community (drives manage vs suggest UI) ---
export async function fetchMyRole(communityId: string) {
  const { data } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .maybeSingle();
  return data?.role ?? 'member';
}

export async function joinCommunity(communityId: string) {
  return callRpc<'owner' | 'admin' | 'moderator' | 'member'>('set_community_membership', {
    p_community: communityId,
    p_join: true,
  });
}

export async function leaveCommunity(communityId: string) {
  return callRpc<'owner' | 'admin' | 'moderator' | 'member'>('set_community_membership', {
    p_community: communityId,
    p_join: false,
  });
}

export async function setEventAttendance(eventId: string, going: boolean) {
  return callRpc<number>('set_event_attendance', { p_event: eventId, p_going: going });
}

export async function createCommunity(name: string) {
  return firstRow(await callRpc<unknown[]>('create_community_with_owner', { p_name: name }));
}

export async function updateCommunityAbout(communityId: string, about: string) {
  return firstRow(await callRpc<unknown[]>('update_community_about_by_slug', {
    p_community: communityId,
    p_about: about,
  }));
}

export async function createEvent(communityId: string, type: EventKind, title: string, whenLabel: string, location = 'TBD') {
  return firstRow(await callRpc<unknown[]>('create_event_for_community', {
    p_community: communityId,
    p_type: type,
    p_title: title,
    p_when_label: whenLabel,
    p_location: location,
  }));
}

// --- Member submits an event suggestion (RLS: any community member) ---
export async function suggestEvent(communityId: string, type: EventKind, title: string, whenLabel: string, location = 'TBD') {
  return firstRow(await callRpc<unknown[]>('submit_event_suggestion_for_community', {
    p_community: communityId,
    p_type: type,
    p_title: title,
    p_when_label: whenLabel,
    p_location: location,
  }));
}

// --- Manager approves a suggestion -> real event (RLS: managers only) ---
export async function approveSuggestion(suggestionId: string) {
  return callRpc<string>('approve_event_suggestion', { p_suggestion: suggestionId });
}

export async function submitSportRequest(name: string, kind: string) {
  return callRpc<string>('submit_sport_request', { p_name: name, p_kind: kind });
}

export type SportRequest = {
  id: string;
  name: string;
  kind: 'sport' | 'hobby';
  votes: number | null;
};

export async function fetchPendingSportRequests(): Promise<SportRequest[]> {
  await ensureAppSession();
  const { data, error } = await supabase
    .from('sport_requests')
    .select('id, name, kind, votes')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SportRequest[];
}

export async function decideSportRequest(id: string, status: 'approved' | 'rejected') {
  const rows = await callRpc<{ id: string; status: string }[]>('decide_sport_request', {
    p_id: id,
    p_status: status,
  });
  if (!rows?.length) {
    throw new Error('This request was already decided by someone else. Refresh requests to see the latest queue.');
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// `create_booking_for_coach` expects a users.id uuid. Coaches loaded from the
// database already carry one; the offline sample rows ('c1'…) do not, and the
// client cannot read public.users to translate them, so those are simply not
// bookable.
async function resolveCoachId(coach: { id: string; name: string }) {
  if (UUID_RE.test(coach.id)) return coach.id;
  throw new Error(`${coach.name} is not bookable yet.`);
}

export async function createBooking(
  coach: { id: string; name: string },
  scheduledFor: string,
  slotLabel: string,
  packageId?: string | null,
  // The picked slot on its own. `slotLabel` is display text the client
  // assembles ("5-session pack - July 12 - 8:00 AM"); the server checks this
  // against coach_availability, and matching a correctness rule against a
  // display string would stop enforcing the day that format changed.
  slot?: string | null,
) {
  const coachId = await resolveCoachId(coach);
  return callRpc<string>('create_booking_for_coach', {
    p_coach: coachId,
    p_scheduled_for: scheduledFor,
    p_slot_label: slotLabel,
    p_package_id: packageId ?? null,
    p_slot: slot ?? null,
  });
}

export async function submitShopRegistration(input: {
  shopName: string;
  category: string | null;
  categoryOther: string;
  phone: string;
  email: string;
  contactPref: string | null;
  bestTime: string;
}) {
  return callRpc<string>('submit_shop_registration', {
    p_shop_name: input.shopName,
    p_category: input.category,
    p_category_other: input.categoryOther,
    p_phone: input.phone,
    p_email: input.email,
    p_contact_pref: input.contactPref,
    p_best_time: input.bestTime,
  });
}

export async function checkoutShopOrder(shopId: string, items: CartCheckoutItem[]) {
  return callRpc<string>('checkout_shop_order', { p_shop: shopId, p_items: items });
}

// --- Shop owner adds a coupon (RLS: owner/manager of the shop) ---
export async function addCoupon(shopId: string, code: string, pct: number) {
  const { error } = await supabase
    .from('shop_coupons')
    .insert({ shop_id: shopId, code, kind: 'percent', value: pct });
  if (error) throw error;
}
// ---- account role -----------------------------------------------------------
// The role is a property of the account, not a demo switch: a designated
// platform admin outranks everything; having a coach profile enables the free
// coach tools. Legacy subscription dates must not gate the free base model.
export type AccountRole = 'USER' | 'COACH' | 'ADMIN';

export async function fetchAccountRole(): Promise<AccountRole> {
  await ensureAppSession();
  // Read through the RPC, not the table: the client has no SELECT on
  // public.users (it holds emails and is_admin), and must not get one.
  const role = await callRpc<string>('my_account_role');
  if (role === 'ADMIN') return 'ADMIN';
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user || session.session.user.is_anonymous) return 'USER';
  const me = await currentAppUserId();
  const { data: coach, error } = await supabase.from('coach_profiles').select('user_id').eq('user_id', me).maybeSingle();
  if (error) throw error;
  return coach ? 'COACH' : 'USER';
}

export type PackageUsage = Record<string, { used: number; total: number }>;

// Purchased totals survive listing edits. Null means unknown, while an empty
// map means the read succeeded and this client has no purchased balances.
export async function fetchPackageUsage(): Promise<PackageUsage | null> {
  try {
    await ensureAppSession();
    const me = await currentAppUserId();
    const { data, error } = await supabase
      .from('client_package_balances')
      .select('package_id, used, total')
      .eq('client_id', me);
    if (error) throw error;
    const out: PackageUsage = {};
    for (const row of (data ?? []) as { package_id: string | null; used: number; total: number }[]) {
      if (row.package_id) out[row.package_id] = { used: row.used, total: row.total };
    }
    return out;
  } catch {
    return null;
  }
}

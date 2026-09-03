// Data-access layer for Supabase. Public reads power browsing screens; writes are gated by RLS.
import { ensureAppSession } from './session';
import { supabase } from './supabase';

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
    .select('user_id, headline, bio, level, price_cents, reply_time, sessions_count, rating_avg, reviews_count, boosted, user:users(name), sport:sports(name)')
    .order(order.column, { ascending: order.ascending });
  if (error) throw error;

  const coachIds = (data ?? []).map((row) => row.user_id).filter(Boolean);
  if (coachIds.length === 0) return data;

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

  return data?.map((row) => ({ ...row, packages: packagesByCoach.get(row.user_id) ?? [] })) ?? data;
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
) {
  const coachId = await resolveCoachId(coach);
  return callRpc<string>('create_booking_for_coach', {
    p_coach: coachId,
    p_scheduled_for: scheduledFor,
    p_slot_label: slotLabel,
    p_package_id: packageId ?? null,
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
// platform admin outranks everything, otherwise an active coach subscription
// makes you a coach, and everyone else is a regular user.
export type AccountRole = 'USER' | 'COACH' | 'ADMIN';

export async function fetchAccountRole(): Promise<AccountRole> {
  await ensureAppSession();
  // Read through the RPC, not the table: the client has no SELECT on
  // public.users (it holds emails and is_admin), and must not get one.
  const role = await callRpc<string>('my_account_role');
  return role === 'ADMIN' || role === 'COACH' ? role : 'USER';
}

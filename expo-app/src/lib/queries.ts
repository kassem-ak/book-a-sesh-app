// Data-access layer for Supabase. Public reads power browsing screens; writes are gated by RLS.
import { supabase } from './supabase';

export type DiscoverSort = 'rating' | 'price' | 'distance';

// --- health check: confirms env + connectivity + a readable table ---
export async function pingSupabase() {
  const { count, error } = await supabase
    .from('coach_profiles')
    .select('*', { count: 'exact', head: true });
  return { ok: !error, count: count ?? 0, error: error?.message };
}

// --- Discover: coaches ordered by rating or price, with joined name + sport ---
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
  return data;
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

// --- My role in a community (drives manage vs suggest UI) ---
export async function fetchMyRole(communityId: string) {
  const { data } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .maybeSingle();
  return data?.role ?? 'member';
}

// --- Member submits an event suggestion (RLS: any community member) ---
export async function suggestEvent(communityId: string, title: string, whenLabel: string) {
  const { error } = await supabase
    .from('event_suggestions')
    .insert({ community_id: communityId, title, when_label: whenLabel });
  if (error) throw error;
}

// --- Manager approves a suggestion -> real event (RLS: managers only) ---
export async function approveSuggestion(suggestionId: string) {
  const { error } = await supabase.rpc('approve_event_suggestion', { p_suggestion: suggestionId });
  if (error) throw error;
}

// --- Shop owner adds a coupon (RLS: owner/manager of the shop) ---
export async function addCoupon(shopId: string, code: string, pct: number) {
  const { error } = await supabase
    .from('shop_coupons')
    .insert({ shop_id: shopId, code, kind: 'percent', value: pct });
  if (error) throw error;
}

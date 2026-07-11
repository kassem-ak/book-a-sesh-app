// Example data-access layer. Mirrors the schema; swap sampleData reads in the
// store for these incrementally. Every write is additionally gated by RLS.
import { supabase } from './supabase';

// --- health check: confirms env + connectivity + a readable table ---
export async function pingSupabase() {
  const { count, error } = await supabase
    .from('coach_profiles')
    .select('*', { count: 'exact', head: true });
  return { ok: !error, count: count ?? 0, error: error?.message };
}

// --- Discover: coaches ordered by rating (with joined name + sport) ---
export async function fetchCoaches(sort: 'rating' | 'price' | 'distance' = 'rating') {
  const order =
    sort === 'price'
      ? { column: 'price_cents', ascending: true }
      : { column: 'rating_avg', ascending: false };
  const { data, error } = await supabase
    .from('coach_profiles')
    .select('user_id, headline, level, price_cents, rating_avg, reviews_count, boosted, user:users(name), sport:sports(name)')
    .order(order.column, { ascending: order.ascending });
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

// --- Manager approves a suggestion → real event (RLS: managers only) ---
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

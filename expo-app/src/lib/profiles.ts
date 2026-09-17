import { currentAppUserId } from './bookings';
import { clearSignupDraft, readSignupDraft, saveSignupDraft, SignupDraft, SignupRole } from './signup';
import { supabase } from './supabase';

export type Sport = { id: string; name: string; kind: 'sport' | 'hobby' };
export type Profile = {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: SignupRole;
  bio: string;
  headline: string;
  level: string;
  sportIds: string[];
};

export async function fetchSports(): Promise<Sport[]> {
  const { data, error } = await supabase.from('sports').select('id, name, kind').eq('approved', true).order('name');
  if (error) throw error;
  return (data ?? []) as Sport[];
}

export async function realProfileIdentity() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user || data.user.is_anonymous) throw new Error('Sign in to save your profile.');
  return { user: data.user, appId: await currentAppUserId() };
}

const applying = new Map<string, Promise<boolean>>();

export function applySignupProfile(authUid: string): Promise<boolean> {
  const existing = applying.get(authUid);
  if (existing) return existing;
  const pending = applySignup(authUid).finally(() => applying.delete(authUid));
  applying.set(authUid, pending);
  return pending;
}

async function applySignup(authUid: string): Promise<boolean> {
  const { user, appId } = await realProfileIdentity();
  if (user.id !== authUid) return false;
  const saved = await readSignupDraft();
  // A confirmation pending for another email must never alter this account.
  const matches = saved && (!saved.authUid || saved.authUid === user.id)
    && (!saved.email || saved.email === user.email?.toLowerCase());
  const metadata = user.user_metadata;
  let draft: SignupDraft | null = matches ? saved : null;
  if (!draft && (metadata.signup_role === 'coach' || metadata.signup_role === 'member')) {
    draft = { role: metadata.signup_role, sportIds: Array.isArray(metadata.signup_sports) ? metadata.signup_sports : [] };
  }
  const [coach, partner] = await Promise.all([
    supabase.from('coach_profiles').select('user_id').eq('user_id', appId).maybeSingle(),
    supabase.from('partner_profiles').select('user_id').eq('user_id', appId).maybeSingle(),
  ]);
  if (coach.error) throw coach.error;
  if (partner.error) throw partner.error;
  if (!draft && (coach.data || partner.data)) return false;
  draft ??= { role: 'member', sportIds: [] };
  if (matches) await saveSignupDraft({ ...draft, authUid: user.id });
  const sports = draft.sportIds.length ? await fetchSports() : [];
  const selected = draft.sportIds.map((id) => sports.find((sport) => sport.id === id)).filter((sport): sport is Sport => !!sport);
  const table = draft.role === 'coach' ? 'coach_profiles' : 'partner_profiles';
  // ON CONFLICT DO NOTHING preserves an existing profile and handles retries.
  // Platform-owned verification, ratings and subscription fields stay server-owned.
  const { error } = await supabase.from(table).upsert({
    user_id: appId, sport_id: selected[0]?.id ?? null,
  }, { onConflict: 'user_id', ignoreDuplicates: true });
  if (error) throw error;
  if (selected.length) {
    const tags = await supabase.from('profile_tags').upsert(selected.map((sport) => ({ user_id: appId, tag: sport.name })), {
      onConflict: 'user_id,tag', ignoreDuplicates: true,
    });
    if (tags.error) throw tags.error;
  }
  if (metadata.signup_role) {
    const result = await supabase.auth.updateUser({ data: { signup_role: null, signup_sports: null } });
    if (result.error) throw result.error;
  }
  if (matches) await clearSignupDraft();
  return true;
}

export async function fetchMyProfile(): Promise<Profile> {
  const { appId } = await realProfileIdentity();
  const [account, coach, partner, tags, sports] = await Promise.all([
    supabase.from('users').select('id, name, avatar_url').eq('id', appId).single(),
    supabase.from('coach_profiles').select('bio, headline, level, sport_id').eq('user_id', appId).maybeSingle(),
    supabase.from('partner_profiles').select('bio, sport_id').eq('user_id', appId).maybeSingle(),
    supabase.from('profile_tags').select('tag').eq('user_id', appId),
    fetchSports(),
  ]);
  for (const result of [account, coach, partner, tags]) if (result.error) throw result.error;
  const row = coach.data ?? partner.data;
  const selected = sports.filter((sport) => tags.data?.some((tag) => tag.tag === sport.name)).map((sport) => sport.id);
  return {
    id: appId, name: account.data!.name, avatarUrl: account.data!.avatar_url,
    role: coach.data ? 'coach' : 'member', bio: row?.bio ?? '',
    headline: coach.data?.headline ?? '', level: coach.data?.level ?? '',
    sportIds: [...new Set([...(row?.sport_id ? [row.sport_id] : []), ...selected])],
  };
}

export async function saveMyProfile(profile: Profile) {
  const { appId } = await realProfileIdentity();
  if (appId !== profile.id) throw new Error('Your account changed. Reopen the profile editor.');
  if (!profile.name.trim()) throw new Error('Enter a display name.');
  const sports = await fetchSports();
  const selected = profile.sportIds.map((id) => sports.find((sport) => sport.id === id));
  if (selected.some((sport) => !sport)) throw new Error('An interest is no longer available. Reload your profile.');
  const account = await supabase.from('users').update({ name: profile.name.trim() }).eq('id', appId).select('id').single();
  if (account.error) throw account.error;
  const fields = { user_id: appId, bio: profile.bio.trim(), sport_id: profile.sportIds[0] ?? null };
  const result = profile.role === 'coach'
    ? await supabase.from('coach_profiles').upsert({ ...fields, headline: profile.headline.trim(), level: profile.level.trim() }, { onConflict: 'user_id' })
    : await supabase.from('partner_profiles').upsert(fields, { onConflict: 'user_id' });
  if (result.error) throw result.error;
  const names = selected.map((sport) => sport!.name);
  if (names.length) {
    const added = await supabase.from('profile_tags').upsert(names.map((tag) => ({ user_id: appId, tag })), { onConflict: 'user_id,tag', ignoreDuplicates: true });
    if (added.error) throw added.error;
  }
  // Delete only deselected catalogue interests; preserve unrelated free-text tags.
  const removed = sports.filter((sport) => !names.includes(sport.name)).map((sport) => sport.name);
  if (removed.length) {
    const deleted = await supabase.from('profile_tags').delete().eq('user_id', appId).in('tag', removed);
    if (deleted.error) throw deleted.error;
  }
}

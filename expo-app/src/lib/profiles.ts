import { currentAppUserId } from './bookings';
import { GeoPoint } from './geo';
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
  /** The area the user typed. Free text, shown to other members. */
  city: string;
  /** Whether a device position is stored. The coordinates themselves are not
   *  readable by any client, so this comes from my_location_sharing(). */
  sharesLocation: boolean;
  /** How precisely that position is shown to other members. */
  shareLevel: ShareLevel;
};

/** 'exact' shows a pin. 'area' shows the same position snapped to a ~1.1 km
 *  cell. Both are derived from where the user actually is -- the app never
 *  invents a nearby position, because a fabricated point would make distances
 *  quietly wrong and would mislead the people the user chose to share with. */
export type ShareLevel = 'exact' | 'area';

/** Store the captured device position.
 *
 *  Written as EWKT because users.location is geography(point, 4326). The point
 *  is stored as captured; the rounding that 'area' implies is applied by the
 *  server when the position is disclosed, not here. Coarsening on write would
 *  make the choice irreversible -- switching back to a pin would need the user
 *  to physically re-capture, and would silently degrade the distance maths for
 *  everyone.
 *
 *  `level` is written in the same call so a position can never sit in the
 *  database under a precision the user did not choose. */
export async function shareMyLocation(point: GeoPoint, level: ShareLevel): Promise<void> {
  const { appId } = await realProfileIdentity();
  const { error } = await supabase.from('users')
    .update({
      location: `SRID=4326;POINT(${point.longitude} ${point.latitude})`,
      location_precision: level,
    })
    .eq('id', appId);
  if (error) throw error;
}

/** Change how precisely an already-shared position is shown. */
export async function setMyShareLevel(level: ShareLevel): Promise<void> {
  const { appId } = await realProfileIdentity();
  const { error } = await supabase.from('users').update({ location_precision: level }).eq('id', appId);
  if (error) throw error;
}

/** Forget the stored position. The OS permission is the user's to revoke; this
 *  is what the app can do about data it already holds. */
export async function stopSharingMyLocation(): Promise<void> {
  const { appId } = await realProfileIdentity();
  const { error } = await supabase.from('users').update({ location: null }).eq('id', appId);
  if (error) throw error;
}

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

/** Whether this sign-in is the one that created the account. `created_at` and
 *  `last_sign_in_at` are both issued by the auth server, so comparing them is
 *  safe across a device whose clock is wrong. */
function isFirstSignIn(user: { created_at?: string; last_sign_in_at?: string }) {
  if (!user.created_at || !user.last_sign_in_at) return false;
  const gap = new Date(user.last_sign_in_at).getTime() - new Date(user.created_at).getTime();
  return Number.isFinite(gap) && gap < 5 * 60 * 1000;
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
  const bound = saved && (!!saved.authUid || !!saved.email);
  const addressed = saved && (!saved.authUid || saved.authUid === user.id)
    && (!saved.email || saved.email === user.email?.toLowerCase());
  // An SSO sign-up saves the draft before leaving for the provider and has no
  // email or uid to bind it to. Abandon that round trip and the draft outlives
  // it, so the NEXT person to sign in on this device would be converted to the
  // abandoned role and interests. An unbound draft is therefore only honoured
  // for an account that has just been created: both timestamps come from the
  // auth server, so this does not depend on the device clock.
  const fresh = isFirstSignIn(user);
  const matches = addressed && (bound || fresh);
  // Refused for good — do not leave it to ambush a later sign-in.
  if (saved && !matches) await clearSignupDraft();
  const metadata = user.user_metadata;
  let draft: SignupDraft | null = matches ? saved : null;
  if (!draft && (metadata.signup_role === 'coach' || metadata.signup_role === 'member')) {
    draft = { role: metadata.signup_role, sportIds: Array.isArray(metadata.signup_sports) ? metadata.signup_sports : [] };
  }
  // No draft and no signup metadata means this is a sign-in, not a sign-up.
  // Inventing a 'member' draft here sent every returning user to the profile
  // editor instead of the home tab.
  if (!draft) return false;
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
  const [account, coach, partner, tags, sports, shared] = await Promise.all([
    supabase.from('users').select('id, name, avatar_url, city').eq('id', appId).single(),
    supabase.from('coach_profiles').select('bio, headline, level, sport_id').eq('user_id', appId).maybeSingle(),
    supabase.from('partner_profiles').select('bio, sport_id').eq('user_id', appId).maybeSingle(),
    supabase.from('profile_tags').select('tag').eq('user_id', appId),
    fetchSports(),
    supabase.rpc('my_location_sharing'),
  ]);
  for (const result of [account, coach, partner, tags]) if (result.error) throw result.error;
  const sharingRow = shared.error ? null : shared.data;
  const sharing = (Array.isArray(sharingRow) ? sharingRow[0] : sharingRow) as
    { shared?: boolean; share_level?: string } | null;
  const row = coach.data ?? partner.data;
  const selected = sports.filter((sport) => tags.data?.some((tag) => tag.tag === sport.name)).map((sport) => sport.id);
  return {
    id: appId, name: account.data!.name, avatarUrl: account.data!.avatar_url,
    role: coach.data ? 'coach' : 'member', bio: row?.bio ?? '',
    headline: coach.data?.headline ?? '', level: coach.data?.level ?? '',
    sportIds: [...new Set([...(row?.sport_id ? [row.sport_id] : []), ...selected])],
    city: account.data!.city ?? '',
    // A failed lookup means unknown, and unknown must not read as "sharing":
    // claiming to hold a position we may not hold is the worse error. The RPC
    // returns a single row; PostgREST gives it as an array.
    sharesLocation: sharing?.shared === true,
    shareLevel: sharing?.share_level === 'exact' ? 'exact' : 'area',
  };
}

export async function saveMyProfile(profile: Profile) {
  const { appId } = await realProfileIdentity();
  if (appId !== profile.id) throw new Error('Your account changed. Reopen the profile editor.');
  if (!profile.name.trim()) throw new Error('Enter a display name.');
  const sports = await fetchSports();
  const selected = profile.sportIds.map((id) => sports.find((sport) => sport.id === id));
  if (selected.some((sport) => !sport)) throw new Error('An interest is no longer available. Reload your profile.');
  // An emptied area clears the column rather than storing '', so "unknown" has
  // one representation -- the same reason the Beirut default was removed.
  const city = profile.city.trim();
  const account = await supabase.from('users')
    .update({ name: profile.name.trim(), city: city || null })
    .eq('id', appId).select('id').single();
  if (account.error) throw account.error;
  // UPDATE first, INSERT only if there was no row -- NOT an upsert.
  //
  // `authenticated` deliberately holds no UPDATE privilege on user_id: that is
  // what stops a profile row being re-keyed onto another account. An upsert's
  // ON CONFLICT DO UPDATE assigns every column in the payload, user_id
  // included, so Postgres refused the whole statement with 42501 for anyone
  // whose profile row already existed -- i.e. everybody editing their profile.
  // Sign-up was unaffected because applySignup upserts with ignoreDuplicates,
  // which compiles to ON CONFLICT DO NOTHING and never updates.
  const table = profile.role === 'coach' ? 'coach_profiles' : 'partner_profiles';
  const fields = profile.role === 'coach'
    ? { bio: profile.bio.trim(), sport_id: profile.sportIds[0] ?? null, headline: profile.headline.trim(), level: profile.level.trim() }
    : { bio: profile.bio.trim(), sport_id: profile.sportIds[0] ?? null };
  const updated = await supabase.from(table).update(fields).eq('user_id', appId).select('user_id');
  if (updated.error) throw updated.error;
  if (!updated.data?.length) {
    // No row yet: an account that never completed the sign-up profile step.
    // user_id is allowed on INSERT, just not on UPDATE.
    const inserted = await supabase.from(table).insert({ user_id: appId, ...fields });
    if (inserted.error) throw inserted.error;
  }
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

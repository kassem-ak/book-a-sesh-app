import { currentAppUserId } from './bookings';
import { supabase } from './supabase';

// Your circle: the people whose activity you want to hear about.
//
// One relationship rather than separate follow / favourite / bookmark lists.
// All three would hold the same pair of ids and mean the same thing, and three
// of them would need a rule for what it means to bookmark someone you do not
// follow. If a "saved, but do not tell me about them" list is wanted later,
// that is a column on `follows`, not another table.

export type CirclePerson = {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: 'coach' | 'member';
  sport: string | null;
  followedAt: string;
};

/** Who this account follows, newest first. */
export async function fetchCircle(): Promise<CirclePerson[]> {
  const appId = await currentAppUserId();
  const { data, error } = await supabase
    .from('follows')
    .select('subject_id, created_at, subject:users!follows_subject_id_fkey(id, name, avatar_url)')
    .eq('follower_id', appId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as {
    subject_id: string;
    created_at: string;
    subject: { id: string; name: string; avatar_url: string | null } | { id: string; name: string; avatar_url: string | null }[] | null;
  }[];
  const ids = rows.map((row) => row.subject_id);
  if (ids.length === 0) return [];

  // Which of them coach, and in what. Two small reads rather than a join the
  // client has no view for; the lists are a person's own circle, so they are
  // short by nature.
  const [coaches, partners] = await Promise.all([
    supabase.from('coach_profiles').select('user_id, sport:sports!coach_profiles_sport_id_fkey(name)').in('user_id', ids),
    supabase.from('partner_profiles').select('user_id, sport:sports(name)').in('user_id', ids),
  ]);
  if (coaches.error) throw coaches.error;
  if (partners.error) throw partners.error;

  const sportOf = (rows: { user_id: string; sport: unknown }[] | null) => {
    const map = new Map<string, string | null>();
    for (const row of rows ?? []) {
      const sport = Array.isArray(row.sport) ? row.sport[0] : row.sport;
      map.set(row.user_id, (sport as { name?: string } | null)?.name ?? null);
    }
    return map;
  };
  const coachSport = sportOf(coaches.data as never);
  const partnerSport = sportOf(partners.data as never);

  return rows.map((row) => {
    const subject = Array.isArray(row.subject) ? row.subject[0] : row.subject;
    const isCoach = coachSport.has(row.subject_id);
    return {
      id: row.subject_id,
      // A follow outlives the profile read that named it; showing the id would
      // be worse than showing nothing recognisable.
      name: subject?.name ?? 'Member',
      avatarUrl: subject?.avatar_url ?? null,
      role: isCoach ? ('coach' as const) : ('member' as const),
      sport: (isCoach ? coachSport.get(row.subject_id) : partnerSport.get(row.subject_id)) ?? null,
      followedAt: row.created_at,
    };
  });
}

/** Just the ids, for deciding what a Follow button says. */
export async function fetchFollowedIds(): Promise<string[]> {
  const appId = await currentAppUserId();
  const { data, error } = await supabase.from('follows').select('subject_id').eq('follower_id', appId);
  if (error) throw error;
  return (data ?? []).map((row) => row.subject_id as string);
}

export async function followPerson(subjectId: string): Promise<void> {
  const appId = await currentAppUserId();
  if (appId === subjectId) throw new Error('You cannot follow yourself.');
  // Following twice is the same as following once, and a double tap should not
  // read as an error.
  const { error } = await supabase
    .from('follows')
    .upsert({ follower_id: appId, subject_id: subjectId }, { onConflict: 'follower_id,subject_id', ignoreDuplicates: true });
  if (error) throw error;
}

export async function unfollowPerson(subjectId: string): Promise<void> {
  const appId = await currentAppUserId();
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', appId)
    .eq('subject_id', subjectId);
  if (error) throw error;
}

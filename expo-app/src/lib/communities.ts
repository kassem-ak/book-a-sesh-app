// Running a community: who is in it, who runs it, and what it looks like.
//
// The role words come from the database enum, lower case, and stay that way
// through this whole file. `state/models.ts` has an upper-case CommunityRole
// for the older screens; translating between the two anywhere but at the edge
// is how 'ADMIN' ends up being compared against 'admin'.

import {
  communitySchemaReady, isMissingColumn, isMissingFunction, isMissingTable,
  markCommunitySchemaMissing,
} from './schema';
import { currentAppUserId } from './bookings';
import { PickedAvatar } from './avatars';
import { cleanNote } from './availability';
import { handlesFrom, SocialHandles } from './socialLinks';
import { supabase } from './supabase';

export type CommunityPrivacy = 'open' | 'closed';
export type Role = 'owner' | 'admin' | 'moderator' | 'member';

/** Who may change the community itself: its name, privacy, sport, picture and
 *  who holds which role. Deliberately excludes a moderator. */
export const isAdmin = (role: Role | null | undefined) => role === 'owner' || role === 'admin';

/** Who may police the room and run events: admins and moderators both. */
export const canModerate = (role: Role | null | undefined) =>
  isAdmin(role) || role === 'moderator';

export type CommunityDetail = {
  id: string;
  slug: string;
  name: string;
  about: string;
  privacy: CommunityPrivacy;
  sportId: string | null;
  avatarUrl: string | null;
  membersCount: number;
  official: boolean;
  socials: SocialHandles;
};

export type Member = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: Role;
  joinedAt: string;
};

export type JoinRequest = {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  note: string | null;
  createdAt: string;
};

export type Photo = {
  id: string;
  url: string;
  path: string | null;
  caption: string | null;
  position: number;
};

/** The gallery holds five. Also enforced by a trigger, because a count taken
 *  in the client is a suggestion two admins uploading at once both pass. */
export const MAX_GALLERY = 5;

const GOVERNANCE_COLUMNS =
  'id, slug, name, about, official, members_count, privacy, sport_id, avatar_url, instagram, facebook, tiktok';
const BASE_COLUMNS = 'id, slug, name, about, official, members_count';

const missingColumn = isMissingColumn;

const missingFunction = isMissingFunction;

const missingTable = isMissingTable;

/** Refused by a GRANT rather than by a policy. PostgREST answers 42501, and
 *  Postgres words it as "permission denied for table". */
function deniedColumn(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === '42501';
}

/** The store calls a community by its slug, not its id.
 *
 *  `fromRemoteCommunity` maps `id: row.slug ?? row.id`, so everything the UI
 *  holds -- `s.communityId`, the keys in `communityRoles` -- is a slug like
 *  "freedive". Sending that to `.eq('id', ...)` compares text against a uuid
 *  column, which is not a no-match: Postgres raises 22P02 and the read throws.
 *  That is what took the settings screen down.
 *
 *  So a reference is either, and the column is chosen to match it. Everything
 *  after the first read uses the real uuid off the row. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function refColumn(ref: string): 'id' | 'slug' {
  return UUID.test(ref) ? 'id' : 'slug';
}

/** A slug or an id in, the real uuid out. */
export async function resolveCommunityId(ref: string): Promise<string> {
  if (UUID.test(ref)) return ref;
  const { data, error } = await supabase
    .from('communities').select('id').eq('slug', ref).maybeSingle();
  if (error) throw error;
  const found = (data as { id?: string } | null)?.id;
  if (!found) throw new Error('That community is no longer listed.');
  return found;
}

function detailFrom(row: Record<string, unknown>): CommunityDetail {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: (row.name as string) ?? '',
    about: (row.about as string) ?? '',
    // Every community that predates the migration is open, which is what it
    // was: nothing could refuse anybody.
    privacy: (row.privacy as CommunityPrivacy) ?? 'open',
    sportId: (row.sport_id as string) ?? null,
    avatarUrl: (row.avatar_url as string) ?? null,
    membersCount: (row.members_count as number) ?? 0,
    official: Boolean(row.official),
    socials: handlesFrom(row),
  };
}

/** Takes a slug or an id. Every other function in this file takes the real
 *  uuid, which callers get from the `id` on what this returns. */
export async function fetchCommunity(ref: string): Promise<CommunityDetail | null> {
  const column = refColumn(ref);
  // Two whole calls rather than one conditional column list: the client reads
  // the select string as a literal type, and a union of two parses as neither.
  const read = async (full: boolean) => (full
    ? supabase.from('communities').select(GOVERNANCE_COLUMNS).eq(column, ref).maybeSingle()
    : supabase.from('communities').select(BASE_COLUMNS).eq(column, ref).maybeSingle());

  let { data, error } = await read(communitySchemaReady());
  if (error && missingColumn(error)) {
    markCommunitySchemaMissing();
    ({ data, error } = await read(false));
  }
  if (error) throw error;
  return data ? detailFrom(data as Record<string, unknown>) : null;
}

/** Change the community. Admins only -- the policy refuses a moderator, and a
 *  refused UPDATE changes no rows and reports success, so the row is read back
 *  to find out which of the two happened. */
export async function updateCommunity(
  communityId: string,
  changes: Partial<Pick<CommunityDetail, 'name' | 'about' | 'privacy' | 'sportId' | 'avatarUrl'>>
    & { socials?: SocialHandles },
): Promise<void> {
  const fields: Record<string, unknown> = {};
  if (changes.name !== undefined) {
    const name = changes.name.trim();
    if (!name) throw new Error('A community needs a name.');
    fields.name = name;
  }
  if (changes.about !== undefined) fields.about = cleanNote(changes.about) ?? null;
  if (communitySchemaReady()) {
    if (changes.privacy !== undefined) fields.privacy = changes.privacy;
    if (changes.sportId !== undefined) fields.sport_id = changes.sportId;
    if (changes.avatarUrl !== undefined) fields.avatar_url = changes.avatarUrl;
    if (changes.socials) {
      fields.instagram = changes.socials.instagram;
      fields.facebook = changes.socials.facebook;
      fields.tiktok = changes.socials.tiktok;
    }
  }
  if (!Object.keys(fields).length) return;

  const { data, error } = await supabase
    .from('communities').update(fields).eq('id', communityId).select('id');
  if (error) {
    if (missingColumn(error)) {
      markCommunitySchemaMissing();
      throw new Error('That setting is not available yet. The database is still being updated.');
    }
    // 403 is a column GRANT, not a policy: an RLS mismatch changes no rows and
    // reports success. `authenticated` holds UPDATE on (about, tint, code)
    // only, so a payload naming any other column is refused whole -- which is
    // how an unchanged name made a description edit fail.
    if (deniedColumn(error)) {
      throw new Error(
        'This database does not allow that field to be changed yet. '
        + 'The description saves; the rest needs the community migration applied.',
      );
    }
    throw error;
  }
  // A policy-gated UPDATE that matches no row is not an error. It changed
  // nothing and said it was fine, which is exactly what a moderator trying to
  // rename a community would see.
  if (!data?.length) {
    throw new Error('Only an admin of this community can change that.');
  }
}

// --- Who is in it -----------------------------------------------------------

export async function fetchMembers(communityId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from('community_members')
    .select('user_id, role, joined_at, user:users!community_members_user_id_fkey(name, avatar_url)')
    .eq('community_id', communityId);
  if (error) throw error;
  const rows = (data ?? []) as unknown as {
    user_id: string; role: Role; joined_at: string;
    user: { name: string; avatar_url: string | null } | null;
  }[];
  return rows
    .map((row) => ({
      userId: row.user_id,
      name: row.user?.name ?? 'Someone',
      avatarUrl: row.user?.avatar_url ?? null,
      role: row.role,
      joinedAt: row.joined_at,
    }))
    // Owner, admins, moderators, then everyone else -- the list is read to find
    // who to talk to, and that is the order people look in.
    .sort((a, b) => RANK[a.role] - RANK[b.role] || a.name.localeCompare(b.name));
}

const RANK: Record<Role, number> = { owner: 0, admin: 1, moderator: 2, member: 3 };

/** Promote or demote. Admins only; the owner's row cannot be changed at all,
 *  which a trigger enforces regardless of what is sent. */
export async function setMemberRole(
  communityId: string, userId: string, role: Exclude<Role, 'owner'>,
): Promise<void> {
  const { data, error } = await supabase
    .from('community_members')
    .update({ role })
    .eq('community_id', communityId).eq('user_id', userId)
    .select('user_id');
  if (error) throw error;
  if (!data?.length) {
    throw new Error('Only an admin can change what someone is in this community.');
  }
}

export async function removeMember(communityId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_community_member', {
    p_community: communityId,
    p_user: userId,
  });
  if (error) {
    if (missingFunction(error)) {
      markCommunitySchemaMissing();
      throw new Error('Removing someone is not available yet. The database is still being updated.');
    }
    throw error;
  }
}

// --- Getting in -------------------------------------------------------------

export type JoinOutcome = { role: Role; status: 'joined' | 'pending' };

/** Join an open community, or ask to join a closed one. One call either way:
 *  the server knows which kind it is, and a client that decided for itself
 *  would be a second copy of the rule. */
export async function requestMembership(
  ref: string, note?: string,
): Promise<JoinOutcome> {
  const { data, error } = await supabase.rpc('request_community_membership', {
    p_community: ref,
    p_note: cleanNote(note) ?? null,
  });

  if (error) {
    // The RPC arrives with the governance migration. Until it does, joining
    // still has to work: every community is open, because nothing in the
    // database can refuse anybody yet. Falling through to the old front door
    // is the difference between "no closed communities" and "nobody can join
    // anything", and only one of those is acceptable in production.
    if (missingFunction(error)) {
      markCommunitySchemaMissing();
      const legacy = await supabase.rpc('set_community_membership', {
        p_community: ref,
        p_join: true,
      });
      if (legacy.error) throw legacy.error;
      return { role: (legacy.data as Role) ?? 'member', status: 'joined' };
    }
    throw error;
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    { role?: Role; request_status?: string } | null;
  return {
    role: row?.role ?? 'member',
    status: row?.request_status === 'pending' ? 'pending' : 'joined',
  };
}

export async function fetchJoinRequests(communityId: string): Promise<JoinRequest[]> {
  if (!communitySchemaReady()) return [];
  const { data, error } = await supabase
    .from('community_join_requests')
    .select('id, user_id, note, created_at, user:users!community_join_requests_user_id_fkey(name, avatar_url)')
    .eq('community_id', communityId).eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) {
    // The table arrives with the governance migration. Until then a closed
    // community cannot exist, so there is nothing to queue.
    if (missingColumn(error) || missingTable(error)) {
      markCommunitySchemaMissing();
      return [];
    }
    throw error;
  }
  return ((data ?? []) as unknown as {
    id: string; user_id: string; note: string | null; created_at: string;
    user: { name: string; avatar_url: string | null } | null;
  }[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.user?.name ?? 'Someone',
    avatarUrl: row.user?.avatar_url ?? null,
    note: row.note,
    createdAt: row.created_at,
  }));
}

/** Whether I have asked and not been answered. Drives "Requested" instead of
 *  "Join" on a closed community I am waiting on. */
export async function myPendingRequest(communityId: string): Promise<boolean> {
  if (!communitySchemaReady()) return false;
  const me = await currentAppUserId().catch(() => null);
  if (!me) return false;
  const { data, error } = await supabase
    .from('community_join_requests')
    .select('id')
    .eq('community_id', communityId).eq('user_id', me).eq('status', 'pending')
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

export async function decideJoinRequest(requestId: string, approve: boolean): Promise<void> {
  const { error } = await supabase.rpc('decide_join_request', {
    p_request: requestId,
    p_approve: approve,
  });
  if (error) {
    if (missingFunction(error)) {
      markCommunitySchemaMissing();
      throw new Error('Answering requests is not available yet. The database is still being updated.');
    }
    throw error;
  }
}

// --- The gallery ------------------------------------------------------------

export async function fetchPhotos(communityId: string): Promise<Photo[]> {
  if (!communitySchemaReady()) return [];
  const { data, error } = await supabase
    .from('community_photos')
    .select('id, url, path, caption, position')
    .eq('community_id', communityId)
    .order('position', { ascending: true });
  if (error) {
    if (missingTable(error)) {
      markCommunitySchemaMissing();
      return [];
    }
    throw error;
  }
  return (data ?? []) as Photo[];
}

/** Upload a picture and hang it on the community.
 *
 *  Keyed <community_id>/<timestamp>, because the storage policy reads the
 *  first path segment to decide whether the uploader runs that community. */
export async function addPhoto(
  communityId: string, picked: PickedAvatar, caption?: string,
): Promise<Photo> {
  const existing = await fetchPhotos(communityId);
  if (existing.length >= MAX_GALLERY) {
    throw new Error(`A gallery holds ${MAX_GALLERY} pictures. Remove one first.`);
  }

  const path = `${communityId}/${Date.now()}`;
  const bucket = supabase.storage.from('communities');
  const uploaded = await bucket.upload(path, picked.bytes, {
    contentType: picked.mimeType,
    upsert: false,
  });
  if (uploaded.error) throw uploaded.error;

  const url = bucket.getPublicUrl(path).data.publicUrl;
  const { data, error } = await supabase
    .from('community_photos')
    .insert({
      community_id: communityId,
      url,
      path,
      caption: cleanNote(caption) ?? null,
      position: existing.length,
    })
    .select('id, url, path, caption, position')
    .single();
  // The row is what makes the file a picture in this gallery. If it did not
  // land, the upload is litter and is cleaned up rather than left paid for.
  if (error) {
    await bucket.remove([path]).catch(() => {});
    throw error;
  }
  return data as Photo;
}

export async function removePhoto(photo: Photo): Promise<void> {
  const { error } = await supabase.from('community_photos').delete().eq('id', photo.id);
  if (error) throw error;
  // The row is gone either way; a file left behind is invisible, so a failed
  // cleanup is not worth failing the removal over.
  if (photo.path) await supabase.storage.from('communities').remove([photo.path]).catch(() => {});
}

/** The community's own picture, which is not part of the five. */
export async function setCommunityAvatar(
  communityId: string, picked: PickedAvatar,
): Promise<string> {
  const path = `${communityId}/avatar-${Date.now()}`;
  const bucket = supabase.storage.from('communities');
  const uploaded = await bucket.upload(path, picked.bytes, {
    contentType: picked.mimeType,
    upsert: true,
  });
  if (uploaded.error) throw uploaded.error;
  const url = bucket.getPublicUrl(path).data.publicUrl;
  await updateCommunity(communityId, { avatarUrl: url });
  return url;
}

// --- Passing it on ----------------------------------------------------------

/** Suggest a community to somebody. Any community, by any user, to any user:
 *  a suggestion carries no access, so suggesting a closed one is fine -- the
 *  point is that they then ask to join it. */
export async function suggestCommunity(
  ref: string, toUserId: string, note?: string,
): Promise<void> {
  const me = await currentAppUserId();
  if (me === toUserId) throw new Error('You are already looking at it.');
  // The store hands out slugs, and community_id is a uuid column -- sending
  // "freedive" at it raises 22P02 rather than simply matching nothing. Every
  // entry point has to resolve, so this one resolves for its caller.
  const communityId = await resolveCommunityId(ref);
  const { error } = await supabase.from('community_suggestions').insert({
    community_id: communityId,
    from_user: me,
    to_user: toUserId,
    note: cleanNote(note) ?? null,
  });
  if (error) {
    // The unique index: suggesting the same community to the same person twice
    // is one suggestion, not a way to message them repeatedly.
    if ((error as { code?: string }).code === '23505') {
      throw new Error('You have already suggested this to them.');
    }
    if (missingTable(error)) {
      markCommunitySchemaMissing();
      throw new Error('Suggestions are not available yet.');
    }
    throw error;
  }
}

export type Suggestion = {
  id: string;
  communityId: string;
  communityName: string;
  fromName: string;
  note: string | null;
  createdAt: string;
};

export async function fetchSuggestionsForMe(): Promise<Suggestion[]> {
  if (!communitySchemaReady()) return [];
  const me = await currentAppUserId().catch(() => null);
  if (!me) return [];
  const { data, error } = await supabase
    .from('community_suggestions')
    .select('id, community_id, note, created_at, community:communities(name), from:users!community_suggestions_from_user_fkey(name)')
    .eq('to_user', me)
    .order('created_at', { ascending: false });
  if (error) {
    if (missingTable(error)) {
      markCommunitySchemaMissing();
      return [];
    }
    throw error;
  }
  return ((data ?? []) as unknown as {
    id: string; community_id: string; note: string | null; created_at: string;
    community: { name: string } | null; from: { name: string } | null;
  }[]).map((row) => ({
    id: row.id,
    communityId: row.community_id,
    communityName: row.community?.name ?? 'A community',
    fromName: row.from?.name ?? 'Someone',
    note: row.note,
    createdAt: row.created_at,
  }));
}

export async function dismissSuggestion(id: string): Promise<void> {
  const { error } = await supabase.from('community_suggestions').delete().eq('id', id);
  if (error) throw error;
}

// --- Ending it, and asking to be made official -------------------------------

/** Delete the community and everything hanging off it.
 *
 *  The owner only. An admin changes what the community is; the owner decides
 *  whether it exists -- and the cascade takes every membership, event,
 *  suggestion, photo and join request with it. */
export async function deleteCommunity(communityId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_community', { p_community: communityId });
  if (error) {
    if (isMissingFunction(error)) {
      markCommunitySchemaMissing();
      throw new Error('Deleting a community is not available yet.');
    }
    throw error;
  }
}

export type OfficialStatus = 'none' | 'pending' | 'approved' | 'rejected';

/** Where an accreditation request stands. `none` means nobody has asked. */
export async function fetchOfficialStatus(communityId: string): Promise<OfficialStatus> {
  const { data, error } = await supabase
    .from('community_official_requests')
    .select('status, created_at')
    .eq('community_id', communityId)
    .order('created_at', { ascending: false })
    .limit(1);
  // A read that fails must not stop the settings screen loading; the button
  // simply offers to ask again, which the one-open index makes harmless.
  if (error) return 'none';
  const status = (data?.[0] as { status?: string } | undefined)?.status;
  return status === 'pending' || status === 'approved' || status === 'rejected'
    ? status
    : 'none';
}

/** Ask the platform to mark this community official. Admins and moderators
 *  may both ask -- the insert policy has always allowed it -- and the answer
 *  comes from a platform admin, not from anyone here. */
export async function requestOfficialStatus(communityId: string): Promise<void> {
  const { error } = await supabase
    .from('community_official_requests')
    .insert({ community_id: communityId });
  if (error) {
    // The one-open index: asking twice is the same ask.
    if ((error as { code?: string }).code === '23505') {
      throw new Error('You have already asked. An admin will answer it.');
    }
    throw error;
  }
}

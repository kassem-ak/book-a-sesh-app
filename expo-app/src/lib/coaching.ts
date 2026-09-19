import { PickedAvatar, pickAvatar } from './avatars';
import { realProfileIdentity } from './profiles';
import { supabase } from './supabase';

// Becoming a coach, and the certificates that back it up.

export type Certification = {
  id: string;
  name: string;
  issuer: string;
  year: string;
  /** 'pending' until an admin reviews it. Shown as such, never as approved. */
  status: string;
  fileUrl: string | null;
};

/** Anyone's certificates, for showing on their profile. Readable by design:
 *  a credential nobody can see proves nothing. */
export async function fetchCertifications(coachId: string): Promise<Certification[]> {
  const { data, error } = await supabase
    .from('certifications')
    .select('id, name, issuer, year, status, file_path')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const bucket = supabase.storage.from('certificates');
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: (row.name as string) ?? '',
    issuer: (row.issuer as string) ?? '',
    year: (row.year as string) ?? '',
    status: (row.status as string) ?? 'pending',
    fileUrl: row.file_path ? bucket.getPublicUrl(row.file_path as string).data.publicUrl : null,
  }));
}

/** The same OS picker the avatar uses: image-only, no library permission. */
export const pickCertificateImage = pickAvatar;

/** Add a certificate, with an optional photo of it.
 *
 *  The file is uploaded first. A row pointing at an object that failed to
 *  upload would render a broken image on a public profile, which reads as a
 *  fake credential rather than a failed upload. */
export async function addCertification(input: {
  name: string;
  issuer: string;
  year: string;
  image: PickedAvatar | null;
}): Promise<void> {
  const { user, appId } = await realProfileIdentity();
  const name = input.name.trim();
  if (!name) throw new Error('Enter the name of the certificate.');

  let filePath: string | null = null;
  if (input.image) {
    // Keyed by auth id to match the storage policy, then a unique suffix so a
    // second certificate does not overwrite the first.
    filePath = `${user.id}/${Date.now()}`;
    const uploaded = await supabase.storage
      .from('certificates')
      .upload(filePath, input.image.bytes, { contentType: input.image.mimeType, upsert: false });
    if (uploaded.error) throw uploaded.error;
  }

  // status is left to its 'pending' default: the RLS check refuses any other
  // value from a client, which is what stops someone marking their own
  // certificate approved.
  const { error } = await supabase.from('certifications').insert({
    coach_id: appId,
    name,
    issuer: input.issuer.trim(),
    year: input.year.trim(),
    file_path: filePath,
  });
  if (error) {
    // Do not leave an orphan object behind in a public bucket.
    if (filePath) await supabase.storage.from('certificates').remove([filePath]);
    throw error;
  }
}

export async function removeCertification(id: string, fileUrl: string | null): Promise<void> {
  const { appId } = await realProfileIdentity();
  const { error } = await supabase.from('certifications').delete().eq('id', id).eq('coach_id', appId);
  if (error) throw error;

  // The row is gone either way; a leftover object is untidy, not harmful, so a
  // failure here must not report the delete as failed.
  if (fileUrl) {
    const marker = '/certificates/';
    const at = fileUrl.indexOf(marker);
    if (at >= 0) {
      const path = decodeURIComponent(fileUrl.slice(at + marker.length).split('?')[0]);
      await supabase.storage.from('certificates').remove([path]).catch(() => {});
    }
  }
}

/** Whether this account already has a coach profile. */
export async function isCoach(): Promise<boolean> {
  const { appId } = await realProfileIdentity();
  const { data, error } = await supabase
    .from('coach_profiles').select('user_id').eq('user_id', appId).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

/** Turn this account into a coach.
 *
 *  Creating the row is the whole act: `guard_coach_profile_privileges` sets the
 *  subscription server-side, and `refreshRole()` then reports COACH. There is
 *  no client-side role switch, and there should not be -- the role is derived
 *  from what the account owns. */
/** What a coach teaches, and how experienced they are at it.
 *
 *  Lives with the rest of the coaching settings rather than in Edit profile:
 *  Edit profile is who you are, this is what you sell. `sport_id` is not
 *  written here -- `sync_coach_primary_sport` derives it from whatever sits
 *  first in coach_sports, so sending it too would be a second writer for one
 *  value.
 */
export type CoachBasics = { headline: string; level: string; teachingIds: string[] };

export async function fetchCoachBasics(): Promise<CoachBasics> {
  const { appId } = await realProfileIdentity();
  const [profile, teaching] = await Promise.all([
    supabase.from('coach_profiles').select('headline, level').eq('user_id', appId).maybeSingle(),
    supabase.from('coach_sports').select('sport_id, position').eq('coach_id', appId).order('position'),
  ]);
  if (profile.error) throw profile.error;
  if (teaching.error) throw teaching.error;
  return {
    headline: profile.data?.headline ?? '',
    level: profile.data?.level ?? '',
    teachingIds: ((teaching.data ?? []) as { sport_id: string }[]).map((row) => row.sport_id),
  };
}

export async function saveCoachBasics(basics: CoachBasics): Promise<void> {
  const { appId } = await realProfileIdentity();
  const written = await supabase.from('coach_profiles')
    .update({ headline: basics.headline.trim(), level: basics.level.trim() })
    .eq('user_id', appId);
  if (written.error) throw written.error;

  // A diff, not delete-then-insert: a wholesale delete would briefly leave the
  // coach teaching nothing, and the trigger would null their primary sport and
  // drop them out of Discover mid-save.
  const current = await supabase.from('coach_sports').select('sport_id').eq('coach_id', appId);
  if (current.error) throw current.error;
  const gone = ((current.data ?? []) as { sport_id: string }[])
    .map((row) => row.sport_id)
    .filter((id) => !basics.teachingIds.includes(id));
  if (gone.length) {
    const removed = await supabase.from('coach_sports').delete().eq('coach_id', appId).in('sport_id', gone);
    if (removed.error) throw removed.error;
  }
  if (!basics.teachingIds.length) return;
  // The upsert carries position too: order IS the meaning, so a reorder with no
  // additions still has to be written.
  const rows = basics.teachingIds.map((sport_id, position) => ({ coach_id: appId, sport_id, position }));
  const saved = await supabase.from('coach_sports').upsert(rows, { onConflict: 'coach_id,sport_id' });
  if (saved.error) throw saved.error;
}

export async function becomeCoach(headline: string): Promise<void> {
  const { appId } = await realProfileIdentity();
  const { error } = await supabase.from('coach_profiles').insert({
    user_id: appId,
    headline: headline.trim(),
  });
  if (error) throw error;
}

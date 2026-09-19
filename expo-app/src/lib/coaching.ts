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
export async function becomeCoach(headline: string): Promise<void> {
  const { appId } = await realProfileIdentity();
  const { error } = await supabase.from('coach_profiles').insert({
    user_id: appId,
    headline: headline.trim(),
  });
  if (error) throw error;
}

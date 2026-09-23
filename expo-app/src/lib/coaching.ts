import * as DocumentPicker from 'expo-document-picker';
import { decodeBase64, PickedAvatar } from './avatars';
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
/** The largest certificate we will take. Matches the avatar limit: a scan of
 *  an A4 page is comfortably under it, and anything much bigger is a photo
 *  nobody needs at full resolution on a profile. */
const MAX_CERT_BYTES = 2 * 1024 * 1024;

/** What a certificate can be.
 *
 *  A photo of a certificate and a PDF of one are the same credential, and
 *  people have whichever their awarding body sent them. Anything else is
 *  refused here rather than uploaded and puzzled over later.  */
const CERT_EXTENSION: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

const CERT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];

/** Pick a certificate: an image or a PDF.
 *
 *  The document picker rather than the image picker, because the image picker
 *  cannot see a PDF at all -- a coach whose certificate arrived as one had no
 *  way to add it. */
export async function pickCertificateFile(): Promise<PickedAvatar | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['image/*', 'application/pdf'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  if (asset.size && asset.size > MAX_CERT_BYTES) {
    throw new Error('Choose a file no larger than 2 MiB.');
  }

  const blob = await (await fetch(asset.uri)).blob();
  if (blob.size > MAX_CERT_BYTES) throw new Error('Choose a file no larger than 2 MiB.');

  // Same FileReader path the avatar picker uses: RN's upload needs an
  // ArrayBuffer, and this works for a native blob and a web File alike without
  // another filesystem dependency.
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file. Please choose it again.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
  const bytes = decodeBase64(dataUrl.slice(dataUrl.indexOf(',') + 1));

  // The picker's own mimeType is the file's claim about itself. Trust the
  // bytes: a PDF starts %PDF- and the image formats have their own headers,
  // and an upload typed as something it is not renders as a broken tile on a
  // public profile.
  const mimeType = certificateMimeType(bytes, asset.mimeType ?? blob.type);
  return { uri: asset.uri, bytes: bytes.buffer, mimeType };
}

/** True when this certificate is a PDF rather than a picture of one. */
export function isPdf(mimeTypeOrUrl: string | null | undefined): boolean {
  if (!mimeTypeOrUrl) return false;
  return mimeTypeOrUrl === 'application/pdf' || /\.pdf($|\?)/i.test(mimeTypeOrUrl);
}

function certificateMimeType(bytes: Uint8Array, claimed: string): string {
  if (!bytes.length) throw new Error('That file is empty.');
  const text = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (text(0, 5) === '%PDF-') return 'application/pdf';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  // Byte-wise rather than an escaped string: the PNG signature is control
  // characters, and those do not survive being retyped.
  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (PNG.every((byte, at) => bytes[at] === byte)) return 'image/png';
  if (text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP') return 'image/webp';
  if (text(4, 8) === 'ftyp') return 'image/heic';
  if (CERT_TYPES.includes(claimed)) return claimed;
  throw new Error('Choose a JPEG, PNG, WebP, HEIC or PDF.');
}

/** @deprecated Images only. `pickCertificateFile` takes a PDF as well. */
export const pickCertificateImage = pickCertificateFile;

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
    // The extension is how a reader knows what it got. The object's
    // contentType is correct either way, but the public URL is what the app
    // holds, and a tile has to decide between an <Image> and a PDF card
    // without fetching the file to find out.
    //
    // Rows written before PDFs were possible have no extension at all, which
    // is the right answer for them: they are all images.
    filePath = `${user.id}/${Date.now()}${CERT_EXTENSION[input.image.mimeType] ?? ''}`;
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

import * as ImagePicker from 'expo-image-picker';
import { realProfileIdentity } from './profiles';
import { supabase } from './supabase';

const MAX_BYTES = 2 * 1024 * 1024;

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Decode base64 without `atob`.
 *
 *  `atob` is a browser global. Hermes does not provide it and Expo does not
 *  polyfill it, so the web build decoded photos fine while every native build
 *  threw ReferenceError the moment one was chosen -- which is exactly what
 *  "photo upload doesn't work" looked like on a phone.
 *
 *  FileReader on React Native implements readAsDataURL but not
 *  readAsArrayBuffer, so the base64 hop is not avoidable here; only `atob` was.
 *  base64-js is present in node_modules but only as a transitive dependency of
 *  a build-time plugin, which is not something to import from app code. */
export function decodeBase64(input: string): Uint8Array<ArrayBuffer> {
  const clean = input.replace(/\s/g, '').replace(/=+$/, '');
  const out = new Uint8Array(new ArrayBuffer((clean.length * 3) >> 2));
  let acc = 0;
  let bits = 0;
  let at = 0;
  for (const char of clean) {
    const value = B64_ALPHABET.indexOf(char);
    if (value < 0) throw new Error('Could not read that photo. Please choose it again.');
    acc = (acc << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[at] = (acc >> bits) & 0xff;
      at += 1;
    }
  }
  // An exact-size array, so callers can hand `.buffer` straight to the upload.
  return at === out.length ? out : out.slice(0, at);
}
export type PickedAvatar = { uri: string; bytes: ArrayBuffer; mimeType: string };

export function avatarMimeType(bytes: Uint8Array): string {
  if (!bytes.length || bytes.length > MAX_BYTES) throw new Error('Choose a photo no larger than 2 MiB.');
  const text = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (text(0, 8) === '\x89PNG\r\n\x1a\n') return 'image/png';
  if (text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP') return 'image/webp';
  if (text(4, 8) === 'ftyp') {
    const boxSize = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
    // HEIC can use mif1 as the major brand and heic as a compatible brand.
    for (let offset = 8; offset + 4 <= Math.min(boxSize, bytes.length); offset += 4) {
      if (offset !== 12 && ['heic', 'heix', 'hevc', 'hevx'].includes(text(offset, offset + 4))) return 'image/heic';
    }
  }
  throw new Error('Choose a JPEG, PNG, WebP or HEIC photo.');
}

export async function pickAvatar(): Promise<PickedAvatar | null> {
  // The system image-only picker grants access to the chosen photo. No camera
  // or broad library permission request is needed (including on the web).
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset.fileSize && asset.fileSize > MAX_BYTES) throw new Error('Choose a photo no larger than 2 MiB.');
  const blob = asset.file ?? await (await fetch(asset.uri)).blob();
  if (blob.size > MAX_BYTES) throw new Error('Choose a photo no larger than 2 MiB.');
  // RN's upload path needs an ArrayBuffer. FileReader works with native blobs
  // as well as web Files without another filesystem/base64 dependency.
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that photo. Please choose it again.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
  const bytes = decodeBase64(dataUrl.slice(dataUrl.indexOf(',') + 1));
  return { uri: asset.uri, bytes: bytes.buffer, mimeType: avatarMimeType(bytes) };
}

export function avatarObjectPath(publicUrl: string | null, bucketUrl: string, authUid: string): string | null {
  // Reuse an existing owned object even if its original filename differs.
  // One key per avatar avoids orphaning an object on each replacement.
  if (publicUrl) {
    try {
      const url = new URL(publicUrl);
      const prefix = new URL(bucketUrl + '/');
      if (url.origin === prefix.origin && url.pathname.startsWith(prefix.pathname)) {
        const path = decodeURIComponent(url.pathname.slice(prefix.pathname.length));
        if (path.startsWith(authUid + '/') && !path.split('/').some((part) => !part || part === '.' || part === '..')) return path;
      }
    } catch { /* External or invalid URLs are never deletion/upload targets. */ }
  }
  return null;
}

export async function uploadAvatar(avatar: PickedAvatar, expectedAppId: string): Promise<string> {
  const { user, appId } = await realProfileIdentity();
  if (appId !== expectedAppId) throw new Error('Your account changed. Reopen the profile editor.');
  const mimeType = avatarMimeType(new Uint8Array(avatar.bytes));
  const current = await supabase.from('users').select('avatar_url').eq('id', appId).single();
  if (current.error) throw current.error;
  const bucket = supabase.storage.from('avatars');
  const baseUrl = bucket.getPublicUrl('').data.publicUrl.replace(/\/$/, '');
  // user.id comes from auth.getUser(), NEVER currentAppUserId().
  const oldPath = avatarObjectPath(current.data.avatar_url, baseUrl, user.id);
  const path = oldPath ?? `${user.id}/avatar`;
  const uploaded = await bucket.upload(path, avatar.bytes, { contentType: mimeType, upsert: true, cacheControl: '0' });
  if (uploaded.error) throw uploaded.error;
  const url = `${bucket.getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
  const updated = await supabase.from('users').update({ avatar_url: url }).eq('id', appId).select('id').single();
  if (updated.error) {
    // An overwritten owned avatar still has its old URL pointing to it. Keep
    // that object; clean up a first upload if the database write failed.
    if (!oldPath) {
      const cleanup = await bucket.remove([path]);
      if (cleanup.error) throw new Error('Photo could not be linked or cleaned up. Retry saving to reuse the same photo object.');
    }
    throw updated.error;
  }
  return url;
}

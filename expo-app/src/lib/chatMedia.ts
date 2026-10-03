import { supabase } from './supabase';
import { PickedAvatar } from './avatars';

// Pictures in chats.
//
// The bucket is private, unlike every other bucket here: a profile photo is
// public by nature, a picture somebody sent one other person is not. So a chat
// image is stored by PATH on its message row, and is turned into a short-lived
// signed URL only when a participant opens the thread. The storage rules decide
// who can sign one -- a participant of that conversation, a member of that
// community -- which is the same set of people who can read the text.
//
// The path carries the room, and a check constraint on each message table ties
// a row's image to its own room: dm/<conversation>/<file>,
// community/<community>/<file>.

export type ChatRoom = { kind: 'dm' | 'community'; id: string };

const BUCKET = 'chat-media';
/** Long enough to read a thread and scroll back; short enough that a link
 *  copied out of the app stops working by tomorrow. */
const SIGNED_FOR_SECONDS = 60 * 60;

const EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic',
};

/** Upload a picked image into the room and return its path. The picker has
 *  already checked the file by its own bytes (JPEG, PNG, WebP, HEIC, 2 MiB);
 *  the bucket checks the same again, because a client can skip the picker. */
export async function uploadChatImage(room: ChatRoom, picked: PickedAvatar): Promise<string> {
  // Not crypto.randomUUID: it is not reliably there on Hermes, and a name only
  // has to be unique within one room.
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${EXTENSION[picked.mimeType] ?? 'jpg'}`;
  const path = `${room.kind}/${room.id}/${name}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, picked.bytes, {
    contentType: picked.mimeType,
    upsert: false,
  });
  if (error) {
    // The write rule is the same one that decides who may post. A refusal
    // here, in an announcements-only community, is that rule saying no.
    if (/row-level security|unauthorized|403/i.test(error.message)) {
      throw new Error('You cannot post pictures here.');
    }
    throw error;
  }
  return path;
}

// Signed links are reused until they are near expiry. The direct-message
// thread polls every ten seconds, and a fresh signature is a fresh URL -- so
// without this every picture in the thread reloaded, and flickered, every ten
// seconds, and each poll asked storage to sign the whole page again.
const cache = new Map<string, { url: string; until: number }>();
const REUSE_UNTIL_MS = (SIGNED_FOR_SECONDS - 10 * 60) * 1000;

/** Signed URLs for a thread's images, in one request. A path that cannot be
 *  signed -- removed, or the reader has left -- is simply absent from the map,
 *  and its bubble shows that the picture is no longer available. */
export async function signChatImages(paths: (string | null | undefined)[]): Promise<Map<string, string>> {
  const now = Date.now();
  const signed = new Map<string, string>();
  const wanted: string[] = [];
  for (const path of new Set(paths.filter((entry): entry is string => !!entry))) {
    const hit = cache.get(path);
    if (hit && hit.until > now) signed.set(path, hit.url);
    else wanted.push(path);
  }
  if (!wanted.length) return signed;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(wanted, SIGNED_FOR_SECONDS);
  if (error) return signed;
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl && !entry.error) {
      signed.set(entry.path, entry.signedUrl);
      cache.set(entry.path, { url: entry.signedUrl, until: now + REUSE_UNTIL_MS });
    }
  }
  return signed;
}

/** Best effort: take a picture back out of storage. Only its uploader can --
 *  the delete rule is ownership -- so a moderator removing somebody else's
 *  message leaves the file behind with nothing pointing at it. */
export async function removeChatImage(path: string | null | undefined): Promise<void> {
  if (!path) return;
  cache.delete(path);
  await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
}

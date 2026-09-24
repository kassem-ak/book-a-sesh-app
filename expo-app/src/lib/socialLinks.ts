// Instagram, Facebook and TikTok on a profile.
//
// A handle is stored, not a URL. It is what people know about themselves, it
// survives a platform moving domains, and it cannot be used to point "my
// Instagram" at an arbitrary website -- which a free-text URL field can, and
// which is worth more to somebody abusing it than to anybody using it.

import { markSocialLinksSchemaMissing, socialLinksSchemaReady } from './schema';
import { supabase } from './supabase';

export type SocialPlatform = 'instagram' | 'facebook' | 'tiktok';

export type SocialHandles = {
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
};

export const NO_SOCIALS: SocialHandles = { instagram: null, facebook: null, tiktok: null };

export const SOCIAL_PLATFORMS: {
  key: SocialPlatform; label: string; icon: string; prefix: string; hint: string;
}[] = [
  { key: 'instagram', label: 'Instagram', icon: 'instagram', prefix: '@', hint: 'yourname' },
  // No `@` on Facebook: a page is facebook.com/yourname and nobody writes it
  // with one.
  { key: 'facebook', label: 'Facebook', icon: 'facebook', prefix: '', hint: 'your.page' },
  { key: 'tiktok', label: 'TikTok', icon: 'music', prefix: '@', hint: 'yourname' },
];

/** The column check in the database, so the field can refuse before the save
 *  does. Kept in step with `is_social_handle` by hand -- there is one rule and
 *  two places that have to know it. */
const HANDLE = /^[A-Za-z0-9._-]{1,40}$/;

/** What somebody typed, reduced to a handle.
 *
 *  People paste the whole URL, or the @, or a trailing slash, or all three.
 *  Taking the last non-empty path segment handles every shape of it without
 *  needing to know each platform's URL layout. */
export function normaliseHandle(raw: string | null | undefined): string | null {
  let text = (raw ?? '').trim();
  if (!text) return null;

  // A pasted URL. Query strings are tracking, not identity.
  text = text.split('?')[0].split('#')[0];
  if (/^(https?:)?\/\//i.test(text) || /\b(instagram|facebook|fb|tiktok)\.com\b/i.test(text)) {
    const parts = text.split('/').filter(Boolean);
    text = parts[parts.length - 1] ?? '';
  }
  return text.replace(/^@+/, '').trim() || null;
}

/** null when it is fine, a reason when it is not. */
export function handleProblem(handle: string | null): string | null {
  if (!handle) return null;
  if (handle.length > 40) return 'That is longer than a username can be.';
  if (!HANDLE.test(handle)) {
    return 'Use letters, numbers, dots, dashes and underscores only.';
  }
  return null;
}

const BASE: Record<SocialPlatform, string> = {
  instagram: 'https://instagram.com/',
  facebook: 'https://facebook.com/',
  tiktok: 'https://tiktok.com/@',
};

export function socialUrl(platform: SocialPlatform, handle: string): string {
  return BASE[platform] + encodeURIComponent(handle);
}

/** Read the three columns off any row that has them. */
export function handlesFrom(row: Record<string, unknown> | null | undefined): SocialHandles {
  return {
    instagram: normaliseHandle(row?.instagram as string | null),
    facebook: normaliseHandle(row?.facebook as string | null),
    tiktok: normaliseHandle(row?.tiktok as string | null),
  };
}

export function hasAnyHandle(handles: SocialHandles): boolean {
  return Boolean(handles.instagram || handles.facebook || handles.tiktok);
}

// --- Reading somebody else's -------------------------------------------------

/** The handles on a public profile.
 *
 *  Its own read rather than a widening of fetchCoaches/fetchPartners: a
 *  profile already loads its certificates, hours and days off independently so
 *  that one failure does not blank the others, and this is the same kind of
 *  detail. It also means the 42703 fallback is contained here instead of
 *  taking the Discover list down with it.
 */
export async function fetchSocialHandles(userId: string): Promise<SocialHandles> {
  if (!socialLinksSchemaReady()) return NO_SOCIALS;
  const { data, error } = await supabase
    .from('users').select('instagram, facebook, tiktok').eq('id', userId).maybeSingle();
  if (error) {
    if ((error as { code?: string }).code === '42703') markSocialLinksSchemaMissing();
    return NO_SOCIALS;
  }
  return handlesFrom(data as Record<string, unknown> | null);
}

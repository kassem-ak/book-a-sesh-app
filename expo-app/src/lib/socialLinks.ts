// Where to find somebody: three social accounts and their own website.
//
// The social three store a handle, not a URL. It is what people know about
// themselves, it survives a platform moving domains, and it cannot be used to
// point "my Instagram" at an arbitrary website -- which a free-text URL field
// can, and which is worth more to somebody abusing it than to anybody using it.
//
// A website is the one entry that has no choice but to be a URL, so the safety
// the handles get for free is spelled out instead: http or https only (a stored
// 'javascript:' URL would be handed straight to the browser by the tap target
// on the profile), a host with a dot in it, and no credentials in the URL,
// because 'https://user:pass@host' renders as the host and goes somewhere else.
// `is_web_url` in the database enforces the same thing; the two are kept in
// step by hand, exactly as `is_social_handle` and HANDLE already are.

import { markSocialLinksSchemaMissing, socialLinksSchemaReady } from './schema';
import { supabase } from './supabase';

export type SocialPlatform = 'instagram' | 'facebook' | 'tiktok' | 'website';

export type SocialHandles = {
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  website: string | null;
};

export const NO_SOCIALS: SocialHandles = {
  instagram: null, facebook: null, tiktok: null, website: null,
};

export const SOCIAL_PLATFORMS: {
  key: SocialPlatform;
  label: string;
  icon: string;
  prefix: string;
  hint: string;
  /** A handle this app turns into a URL, or a URL the person owns. The two are
   *  cleaned, checked and displayed by different rules, and every place that
   *  touches a value asks this rather than testing the key. */
  kind: 'handle' | 'url';
}[] = [
  { key: 'instagram', label: 'Instagram', icon: 'instagram', prefix: '@', hint: 'yourname', kind: 'handle' },
  // No `@` on Facebook: a page is facebook.com/yourname and nobody writes it
  // with one.
  { key: 'facebook', label: 'Facebook', icon: 'facebook', prefix: '', hint: 'your.page', kind: 'handle' },
  { key: 'tiktok', label: 'TikTok', icon: 'music', prefix: '@', hint: 'yourname', kind: 'handle' },
  // Last, because it is the one that is not a social account.
  { key: 'website', label: 'Website', icon: 'globe', prefix: '', hint: 'yoursite.com', kind: 'url' },
];

const KIND: Record<SocialPlatform, 'handle' | 'url'> = {
  instagram: 'handle', facebook: 'handle', tiktok: 'handle', website: 'url',
};

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

// --- A website, which is a URL and not a handle -------------------------------

/** The same rule as `is_web_url` in the database. */
const WEB_URL =
  /^https?:\/\/[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?\.[A-Za-z]{2,}(?::[0-9]{1,5})?(?:\/\S*)?$/i;

/** What somebody typed, made into a URL.
 *
 *  Nobody types the scheme, so `bookd.com` is assumed to mean `https://`. What
 *  is never assumed is a scheme somebody did type: 'javascript:alert(1)' is not
 *  quietly turned into a website, it is refused below and shown as a problem. */
export function normaliseWebsite(raw: string | null | undefined): string | null {
  const text = (raw ?? '').trim().replace(/\s+/g, '');
  if (!text) return null;
  // Only a missing scheme is filled in. Anything that already declared one --
  // including the dangerous ones -- is left exactly as typed so that the check
  // below sees it and says so.
  const withScheme = /^[A-Za-z][A-Za-z0-9+.-]*:/.test(text) ? text : `https://${text}`;
  return withScheme.replace(/\/+$/, '') || null;
}

/** null when it is fine, a reason when it is not. */
export function websiteProblem(url: string | null): string | null {
  if (!url) return null;
  if (url.length > 200) return 'That is longer than a web address can be.';
  if (/^(?!https?:)[A-Za-z][A-Za-z0-9+.-]*:/.test(url)) {
    return 'Only http and https addresses can be linked.';
  }
  if (/@/.test(url.replace(/^https?:\/\//i, '').split('/')[0])) {
    return 'Leave the username and password out of a web address.';
  }
  if (!WEB_URL.test(url)) return 'That does not look like a web address.';
  return null;
}

// --- Either kind --------------------------------------------------------------

/** Clean a value the way its own platform needs it cleaned. */
export function normaliseValue(platform: SocialPlatform, raw: string | null | undefined): string | null {
  return KIND[platform] === 'url' ? normaliseWebsite(raw) : normaliseHandle(raw);
}

/** null when it is fine, a reason when it is not. */
export function valueProblem(platform: SocialPlatform, value: string | null): string | null {
  return KIND[platform] === 'url' ? websiteProblem(value) : handleProblem(value);
}

const BASE: Record<SocialPlatform, string> = {
  instagram: 'https://instagram.com/',
  facebook: 'https://facebook.com/',
  tiktok: 'https://tiktok.com/@',
  website: '',
};

export function socialUrl(platform: SocialPlatform, handle: string): string {
  // A website is already the destination. Prefixing or re-encoding it would
  // break the path and the query the person gave.
  if (KIND[platform] === 'url') return handle;
  return BASE[platform] + encodeURIComponent(handle);
}

/** What the reader sees on the chip. A handle reads as a handle; a URL reads as
 *  the site, without the scheme and the www nobody needs to look at. */
export function socialLabel(platform: SocialPlatform, value: string): string {
  if (KIND[platform] !== 'url') return value;
  return value.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
}

/** Read the columns off any row that has them. */
export function handlesFrom(row: Record<string, unknown> | null | undefined): SocialHandles {
  return {
    instagram: normaliseHandle(row?.instagram as string | null),
    facebook: normaliseHandle(row?.facebook as string | null),
    tiktok: normaliseHandle(row?.tiktok as string | null),
    website: normaliseWebsite(row?.website as string | null),
  };
}

/** True when any account or website differs.
 *
 *  Driven by SOCIAL_PLATFORMS rather than written out field by field: the three
 *  places that needed this each listed the platforms by hand, so adding the
 *  website meant a change detected on two screens and silently ignored on the
 *  third. Adding the next one now needs no edit here at all. */
export function socialsDiffer(a: SocialHandles, b: SocialHandles): boolean {
  return SOCIAL_PLATFORMS.some((platform) => a[platform.key] !== b[platform.key]);
}

export function hasAnyHandle(handles: SocialHandles): boolean {
  return Boolean(handles.instagram || handles.facebook || handles.tiktok || handles.website);
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
    .from('users').select('instagram, facebook, tiktok, website').eq('id', userId).maybeSingle();
  if (error) {
    if ((error as { code?: string }).code === '42703') markSocialLinksSchemaMissing();
    return NO_SOCIALS;
  }
  return handlesFrom(data as Record<string, unknown> | null);
}

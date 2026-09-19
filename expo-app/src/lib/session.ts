import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { identify, track } from './analytics';
import { supabase, assertSupabaseConfigured, supabaseUrl } from './supabase';
import { unregisterPushToken } from './push';
import { bindSignupEmail, readSignupDraft } from './signup';

WebBrowser.maybeCompleteAuthSession();

let pendingSession: Promise<string> | null = null;
// Auth ids already checked against a live public.users row this launch. Every
// write calls ensureAppSession, and the check is a round trip -- doing it once
// per account rather than once per write.
const verified = new Set<string>();

// Ensures a Supabase session before a write. BOOK'D has no guest tier: every
// account is a registered one, so this reports the signed-in identity and
// refuses rather than creating anything. It used to mint an anonymous account
// on first launch, before the user had chosen anything at all.
//
// A session whose account no longer exists. PostgREST reports the failed
// foreign key as 23503; the auth layer reports the missing subject separately.
function isStaleSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  if (e.code === '23503') return true;
  const message = (e.message ?? '').toLowerCase();
  return message.includes('users_auth_id_fkey')
    || message.includes('user from sub claim')
    || message.includes('user not found');
}

/** Thrown when a write is attempted with no signed-in account. The UI that
 *  allowed it is the bug; this makes that visible instead of writing as
 *  somebody else. */
export class NotSignedInError extends Error {
  constructor() {
    super('Sign in to continue.');
    this.name = 'NotSignedInError';
  }
}

export async function ensureAppSession() {
  assertSupabaseConfigured();
  if (pendingSession) return pendingSession;

  pendingSession = (async () => {
    const { data: existing, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const user = existing.session?.user ?? null;
    if (!user) throw new NotSignedInError();

    // The stored token can outlive its account: deleted from another device,
    // or removed by an admin. auth.uid() then points at a row that is gone and
    // every write fails its foreign key forever, wedging the app on a session
    // it can never complete. Sign out so the landing gate can take over --
    // there is no anonymous identity to fall back to any more.
    if (!verified.has(user.id)) {
      const { error } = await supabase.rpc('current_app_user');
      if (error) {
        if (!isStaleSessionError(error)) throw error;
        verified.delete(user.id);
        await supabase.auth.signOut();
        throw new NotSignedInError();
      }
      verified.add(user.id);
    }
    return user.id;
  })();

  try {
    return await pendingSession;
  } finally {
    pendingSession = null;
  }
}

/** The signed-in account's public.users id.
 *
 *  Lives here rather than in bookings.ts, where it used to. Half the app asks
 *  for it, including partners.ts -- and once bookings.ts needed partner
 *  sessions in the same list, the two files imported each other. Metro does not
 *  guarantee which side of a cycle resolves first, and the failure looks like a
 *  function that is undefined only sometimes.
 *
 *  `ensureAppSession()` returns an AUTH id, which is not what these tables key
 *  on. Ask the server which app user we are rather than guessing.
 */
export async function currentAppUserId(): Promise<string> {
  await ensureAppSession();
  const { data, error } = await supabase.rpc('current_app_user');
  if (error) throw error;
  const id = typeof data === 'string' ? data : null;
  if (!id) throw new Error('This account has no profile yet.');
  return id;
}

// ---- real auth (email/password) -------------------------------------------

export async function signInEmail(email: string, password: string) {
  await bindSignupEmail(email);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  track('email_sign_in');
}

// Returns true when the project requires email confirmation (no session yet).
export async function signUpEmail(name: string, email: string, password: string) {
  await bindSignupEmail(email);
  const draft = await readSignupDraft();
  // Drop any anonymous guest session first so the signup creates a clean user.
  const { data: existing } = await supabase.auth.getSession();
  if (existing.session?.user?.is_anonymous) await supabase.auth.signOut();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Metadata also carries the choices if confirmation happens on another device.
    options: { data: { name, signup_role: draft?.role ?? 'member', signup_sports: draft?.sportIds ?? [] } },
  });
  if (error) throw error;
  track('email_sign_up', { confirmation_required: !data.session });
  return !data.session;
}

export async function signOutUser() {
  // Before the sign-out, not after: deleting the row is gated by
  // `user_id = current_app_user()`, so once the session is gone the token
  // cannot be removed -- and the next account on this phone would keep
  // receiving the previous one's notifications.
  await unregisterPushToken();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ---- SSO (Facebook / Google / Microsoft / Apple) --------------------------
// Web: full-page redirect to the provider and back (PKCE code parsed by the
// client via detectSessionInUrl). Native: system browser session that returns
// through the bookd:// deep link, then we exchange the code manually.
// 'azure' is Supabase's id for Microsoft Entra / Microsoft accounts.
export type SsoProvider = 'google' | 'facebook' | 'azure' | 'apple';

export const SSO_LABELS: Record<SsoProvider, string> = {
  google: 'Google',
  facebook: 'Facebook',
  azure: 'Microsoft',
  apple: 'Apple',
};

/** Thrown when the provider is switched off in Supabase Auth. */
export class ProviderDisabledError extends Error {
  constructor(public provider: SsoProvider) {
    super(`${SSO_LABELS[provider]} sign-in is not set up yet. Use your email and password for now.`);
    this.name = 'ProviderDisabledError';
  }
}

// GoTrue only reports a disabled provider when the authorize URL is actually
// requested, so handing that URL straight to the browser showed the raw
// {"msg":"Unsupported provider..."} JSON in a tab. Probe the plain authorize
// endpoint first and fail with something a person can read. Cached per
// session; a network failure falls through so the real flow reports it.
const providerChecked = new Set<SsoProvider>();

async function assertProviderEnabled(provider: SsoProvider) {
  if (providerChecked.has(provider)) return;
  let disabled = false;
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/authorize?provider=${provider}`);
    if (res.status === 400) {
      const body = (await res.json().catch(() => null)) as { msg?: string } | null;
      disabled = /not enabled|unsupported provider/i.test(body?.msg ?? '');
    }
  } catch {
    return; // offline or blocked — let the normal flow surface it
  }
  if (disabled) {
    track('sso_unavailable', { provider });
    throw new ProviderDisabledError(provider);
  }
  providerChecked.add(provider);
}

export async function signInWithProvider(provider: SsoProvider) {
  track('sso_attempted', { provider });
  assertSupabaseConfigured();
  await assertProviderEnabled(provider);
  // Drop any anonymous guest session so the SSO account is a clean identity.
  const { data: existing } = await supabase.auth.getSession();
  if (existing.session?.user?.is_anonymous) await supabase.auth.signOut();

  // Supabase needs Microsoft's email claim to identify the account.
  const scopes = provider === 'azure' ? 'email' : undefined;
  if (Platform.OS === 'web') {
    const redirectTo = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : undefined;
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo, scopes } });
    if (error) throw error;
    return false; // browser navigates away
  }

  const redirectTo = Linking.createURL('auth-callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, scopes, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('No auth URL returned');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return false; // user cancelled

  const code = new URL(result.url).searchParams.get('code');
  if (!code) throw new Error('No auth code in callback');
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
  return true;
}

/** The word someone types to confirm deleting their account.
 *
 *  A second tap is something a thumb does by accident on a list where the row
 *  above it is Sign out. Typing a word is not -- it is the smallest gesture
 *  that cannot happen without having read the sentence above it.
 */
export const DELETE_WORD = 'delete';

/** Whether what was typed confirms deletion.
 *
 *  Case and surrounding space are forgiven: someone who typed "Delete" on a
 *  phone keyboard that capitalises the first letter meant it, and refusing them
 *  would only teach them to distrust the field. Anything else is not a
 *  confirmation, including the empty string -- which is what the field holds
 *  before anyone has decided.
 */
export function confirmsDeletion(typed: string): boolean {
  return typed.trim().toLowerCase() === DELETE_WORD;
}

/**
 * Delete the signed-in account.
 *
 * Both stores require this in-app wherever an app allows account creation, so
 * it is a release gate, not a nicety. The work happens in the `delete-account`
 * Edge Function because removing the auth user needs the service role, which
 * must never reach the client.
 *
 * It anonymises rather than hard-deletes: public.users is the parent of
 * thirteen NO ACTION foreign keys, and a coach's booking history is their
 * record as much as the client's. Identity is stripped, personal rows and
 * stored OAuth tokens are removed, and the credentials are destroyed.
 */
export async function deleteAccount(): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error('Sign in first.');

  await unregisterPushToken();
  const { data, error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw error;
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(String((data as { error: unknown }).error));
  }
  identify(null);
  track('account_deleted');
  // The credentials are gone; drop the local session so the app returns to the
  // landing gate instead of holding a token that no longer resolves.
  await supabase.auth.signOut();
}

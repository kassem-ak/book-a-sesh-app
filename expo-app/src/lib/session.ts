import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured, supabaseUrl } from './supabase';

WebBrowser.maybeCompleteAuthSession();

let pendingSession: Promise<string> | null = null;

// Ensures a Supabase session before a write. The legacy-named bootstrap RPC
// links an anonymous session to its own Guest row without demo memberships.
// Real email users get their public.users row from handle_new_user at signup.
export async function ensureAppSession() {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  if (pendingSession) return pendingSession;

  pendingSession = (async () => {
    const { data: existing, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    let user = existing.session?.user ?? null;
    if (!user) {
      const { data, error } = await supabase.auth.signInAnonymously({
        // A guest is not a specific person. This metadata lands on the
        // real public.users row, so naming it after a demo character put
        // "Alex Morgan" on every anonymous account's bookings.
        options: { data: { name: 'Guest' } },
      });
      if (error) throw error;
      user = data.user;
    }

    if (user?.is_anonymous) {
      const { data, error } = await supabase.rpc('bootstrap_demo_session');
      if (error) throw error;
      return data as string;
    }
    return user?.id ?? '';
  })();

  try {
    return await pendingSession;
  } finally {
    pendingSession = null;
  }
}

// ---- real auth (email/password) -------------------------------------------

export async function signInEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

// Returns true when the project requires email confirmation (no session yet).
export async function signUpEmail(name: string, email: string, password: string) {
  // Drop any anonymous guest session first so the signup creates a clean user.
  const { data: existing } = await supabase.auth.getSession();
  if (existing.session?.user?.is_anonymous) await supabase.auth.signOut();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  return !data.session;
}

export async function signOutUser() {
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
  if (disabled) throw new ProviderDisabledError(provider);
  providerChecked.add(provider);
}

export async function signInWithProvider(provider: SsoProvider) {
  await assertProviderEnabled(provider);
  // Drop any anonymous guest session so the SSO account is a clean identity.
  const { data: existing } = await supabase.auth.getSession();
  if (existing.session?.user?.is_anonymous) await supabase.auth.signOut();

  if (Platform.OS === 'web') {
    const redirectTo = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : undefined;
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) throw error;
    return; // browser navigates away
  }

  const redirectTo = Linking.createURL('auth-callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('No auth URL returned');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return; // user cancelled

  const code = new URL(result.url).searchParams.get('code');
  if (!code) throw new Error('No auth code in callback');
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
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

  const { data, error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw error;
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(String((data as { error: unknown }).error));
  }
  // The credentials are gone; drop the local session so the app returns to the
  // landing gate instead of holding a token that no longer resolves.
  await supabase.auth.signOut();
}

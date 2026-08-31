import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from './supabase';

WebBrowser.maybeCompleteAuthSession();

let pendingSession: Promise<string> | null = null;

// Ensures there is *some* Supabase session before a write. Guests get an
// anonymous session bootstrapped into the demo user (Alex, with community
// roles). Real email users skip the demo bootstrap — their public.users row
// is created by the handle_new_user trigger at signup.
export async function ensureAppSession() {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  if (pendingSession) return pendingSession;

  pendingSession = (async () => {
    const { data: existing, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    let user = existing.session?.user ?? null;
    if (!user) {
      const { data, error } = await supabase.auth.signInAnonymously({
        options: { data: { name: 'Alex Morgan' } },
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

// ---- SSO (Google / Apple) ---------------------------------------------------
// Web: full-page redirect to the provider and back (PKCE code parsed by the
// client via detectSessionInUrl). Native: system browser session that returns
// through the spotter:// deep link, then we exchange the code manually.
export type SsoProvider = 'google' | 'apple';

export async function signInWithProvider(provider: SsoProvider) {
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

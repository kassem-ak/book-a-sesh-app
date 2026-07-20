import { supabase, isSupabaseConfigured } from './supabase';

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

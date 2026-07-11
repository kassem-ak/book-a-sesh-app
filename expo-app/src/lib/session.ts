import { supabase, isSupabaseConfigured } from './supabase';

let pendingSession: Promise<string> | null = null;

export async function ensureAppSession() {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  if (pendingSession) return pendingSession;

  pendingSession = (async () => {
    const { data: existing, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    if (!existing.session) {
      const { error } = await supabase.auth.signInAnonymously({
        options: { data: { name: 'Alex Morgan' } },
      });
      if (error) throw error;
    }

    const { data, error } = await supabase.rpc('bootstrap_demo_session');
    if (error) throw error;
    return data as string;
  })();

  try {
    return await pendingSession;
  } finally {
    pendingSession = null;
  }
}
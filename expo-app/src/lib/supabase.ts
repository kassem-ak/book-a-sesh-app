import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Values come from env (EXPO_PUBLIC_* are inlined at build time).
// Set them in expo-app/.env (see .env.example). The anon key is publishable
// and safe to ship in the client; RLS enforces access server-side.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anon);

export const supabase = createClient(url ?? 'http://localhost', anon ?? 'anon', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    flowType: 'pkce',
    // Web: parse the OAuth code from the redirect URL after SSO round-trips.
    // Native: the deep-link callback is handled manually in session.ts.
    detectSessionInUrl: Platform.OS === 'web',
  },
});

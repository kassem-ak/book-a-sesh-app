import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Which app modules the signed-in account may reach.
 *
 * The server decides, not the build. A module absent from the answer is not
 * reachable, so this fails closed twice over: an unrecognised key is hidden,
 * and a failed lookup returns nothing rather than falling back to "show
 * everything". The cost of the safe default is a visible empty state; the cost
 * of the unsafe one is shipping an unreleased screen to everybody.
 */
export async function fetchVisibleModules(): Promise<string[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase.rpc('my_modules');
  if (error || !Array.isArray(data)) return [];

  return data.filter((key): key is string => typeof key === 'string');
}

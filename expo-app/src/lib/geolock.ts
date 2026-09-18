import { supabase, isSupabaseConfigured } from './supabase';

export type GeoStatus = { allowed: boolean; country: string | null; mode: string };

/**
 * Whether the app may operate where this device is connecting from.
 *
 * The country is resolved at the edge from the connecting IP, so this is a
 * property of the network rather than anything the app reports about itself.
 * The same rule is enforced on every data policy server-side; this call only
 * lets the app say so plainly instead of rendering screens that all come back
 * empty.
 *
 * Fails OPEN: a lookup that errors returns allowed. The server is the lock, so
 * a client that cannot reach this answer must not lock the user out on its own
 * guess — that would strand people over a flaky connection while blocking
 * nobody the server would have served anyway.
 *
 * Kept separate from `geo.ts`, which is about distances and device position.
 * This one is about permission to operate at all.
 */
export async function fetchGeoStatus(): Promise<GeoStatus> {
  const open: GeoStatus = { allowed: true, country: null, mode: 'off' };
  if (!isSupabaseConfigured || !supabase) return open;
  const { data, error } = await supabase.rpc('geo_status');
  if (error || !Array.isArray(data) || data.length === 0) return open;
  const row = data[0] as Partial<GeoStatus>;
  if (typeof row.allowed !== 'boolean') return open;

  return {
    allowed: row.allowed,
    country: typeof row.country === 'string' ? row.country : null,
    mode: typeof row.mode === 'string' ? row.mode : 'off',
  };
}

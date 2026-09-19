import { currentAppUserId } from './bookings';
import { supabase } from './supabase';

// What a coach charges.
//
// Three tables, all of which already existed and already had the right RLS --
// `coach_profiles.price_cents` for the per-session rate, `packages` for blocks
// of sessions, `coach_promos` for discount codes. Nothing here needed a new
// column; it needed a screen.
//
// Money is stored in cents and typed in whole currency units. The conversion
// lives here, once, because doing it at each call site is how a price ends up
// a hundred times too large in exactly one place.

export type SessionPackage = {
  id: string;
  sessions: number;
  priceCents: number;
  active: boolean;
  /** What each session works out at. The reason to buy a block is that it is
   *  cheaper per session, so the coach should see that number while setting
   *  the price rather than working it out themselves. */
  perSessionCents: number;
};

export type Promo = {
  id: string;
  code: string;
  pct: number;
  active: boolean;
};

export type CoachPricing = {
  rateCents: number;
  packages: SessionPackage[];
  promos: Promo[];
};

/** "45", "45.5" and "$45.50" all mean the same thing to someone typing a price.
 *  Returns null for anything that does not, so the caller can refuse rather
 *  than storing a silent 0. */
export function parseMoney(input: string): number | null {
  // Checked before the strip, not after. Stripping a minus turns "-20" into a
  // perfectly valid $20, so the `< 0` test below could never fire and a coach
  // typing a negative rate would have got a positive one.
  if (input.includes('-')) return null;
  const cleaned = input.replace(/[^0-9.]/g, '');
  if (!cleaned || (cleaned.match(/\./g) ?? []).length > 1) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  // Round rather than truncate: 45.555 is a typo, and 4555 is the closer
  // reading of it than 4555.4999 floored by binary floating point.
  return Math.round(value * 100);
}

/** Cents to the string that goes back in the input. No currency symbol -- the
 *  field shows one beside it, and baking it in would mean parsing it off. */
export function money(cents: number): string {
  const whole = Math.round(cents) / 100;
  return Number.isInteger(whole) ? String(whole) : whole.toFixed(2);
}

export async function fetchMyPricing(): Promise<CoachPricing> {
  const me = await currentAppUserId();
  const [profile, packages, promos] = await Promise.all([
    supabase.from('coach_profiles').select('price_cents').eq('user_id', me).maybeSingle(),
    supabase.from('packages').select('id, sessions, price_cents, active').eq('coach_id', me).order('sessions'),
    supabase.from('coach_promos').select('id, code, pct, active').eq('coach_id', me).order('created_at'),
  ]);
  if (profile.error) throw profile.error;
  if (packages.error) throw packages.error;
  if (promos.error) throw promos.error;

  return {
    rateCents: (profile.data?.price_cents as number | undefined) ?? 0,
    packages: ((packages.data ?? []) as Record<string, unknown>[]).map((row) => {
      const sessions = Number(row.sessions) || 1;
      const priceCents = Number(row.price_cents) || 0;
      return {
        id: String(row.id),
        sessions,
        priceCents,
        active: row.active !== false,
        perSessionCents: Math.round(priceCents / sessions),
      };
    }),
    promos: ((promos.data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      code: String(row.code),
      pct: Number(row.pct) || 0,
      active: row.active !== false,
    })),
  };
}

/** The per-session rate. 0 is allowed and means "no rate set" -- the app
 *  already reads it that way and quotes nothing rather than inventing a
 *  figure. Negative is refused by the database as well as here. */
export async function setSessionRate(cents: number): Promise<void> {
  const me = await currentAppUserId();
  if (!Number.isFinite(cents) || cents < 0) throw new Error('Enter a rate of 0 or more.');
  const { error } = await supabase.from('coach_profiles')
    .update({ price_cents: Math.round(cents) })
    .eq('user_id', me);
  if (error) throw error;
}

/** Add a block of sessions, or change one. */
export async function savePackage(input: {
  id?: string; sessions: number; priceCents: number; active?: boolean;
}): Promise<void> {
  const me = await currentAppUserId();
  if (!Number.isInteger(input.sessions) || input.sessions < 2) {
    // A one-session "package" is the per-session rate wearing a hat, and having
    // both means two prices for the same thing that can disagree.
    throw new Error('A package is two or more sessions. Use the rate above for a single session.');
  }
  if (!Number.isFinite(input.priceCents) || input.priceCents < 0) {
    throw new Error('Enter a package price of 0 or more.');
  }
  const row = {
    coach_id: me,
    sessions: input.sessions,
    price_cents: Math.round(input.priceCents),
    active: input.active ?? true,
  };
  const { error } = input.id
    ? await supabase.from('packages').update(row).eq('id', input.id)
    : await supabase.from('packages').insert(row);
  if (error) throw error;
}

export async function setPackageActive(id: string, active: boolean): Promise<void> {
  await currentAppUserId();
  const { error } = await supabase.from('packages').update({ active }).eq('id', id);
  if (error) throw error;
}

/** Remove a package outright.
 *
 *  Switching it off is the gentler option and the one the UI offers first:
 *  `client_package_balances` refers to a package by id, so a coach who deletes
 *  one their clients already bought loses the label those balances read from.
 *  Deletion is still allowed -- it is the coach's price list -- but it is not
 *  the default gesture. */
export async function removePackage(id: string): Promise<void> {
  await currentAppUserId();
  const { error } = await supabase.from('packages').delete().eq('id', id);
  if (error) throw error;
}

/** A discount code. Codes are upper-cased so that a client typing `summer20`
 *  and a coach creating `SUMMER20` are talking about the same thing. */
export async function addPromo(code: string, pct: number): Promise<void> {
  const me = await currentAppUserId();
  const normalised = code.trim().toUpperCase().replace(/\s+/g, '');
  if (normalised.length < 3) throw new Error('A code needs at least three characters.');
  if (!Number.isInteger(pct) || pct < 1 || pct > 100) throw new Error('A discount is between 1% and 100%.');
  const { error } = await supabase.from('coach_promos')
    .insert({ coach_id: me, code: normalised, pct });
  // The table is unique on (coach_id, code). 23505 here means the coach already
  // has that code -- not the "slot is taken" the generic handler would say.
  if (error) {
    if ((error as { code?: string }).code === '23505') throw new Error(`You already have a code called ${normalised}.`);
    throw error;
  }
}

export async function setPromoActive(id: string, active: boolean): Promise<void> {
  await currentAppUserId();
  const { error } = await supabase.from('coach_promos').update({ active }).eq('id', id);
  if (error) throw error;
}

export async function removePromo(id: string): Promise<void> {
  await currentAppUserId();
  const { error } = await supabase.from('coach_promos').delete().eq('id', id);
  if (error) throw error;
}

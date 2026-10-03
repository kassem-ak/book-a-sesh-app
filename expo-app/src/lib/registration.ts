import { supabase } from './supabase';
import { currentAppUserId } from './bookings';
import { createProfileRows } from './profiles';

// One registration, whatever the way in.
//
// It used to depend on the door. Email went through four screens -- role,
// interests, area, then the account -- while every single-sign-on button
// skipped all of them and dropped a brand-new account straight into the app
// with no role, no interests and no area. Two people who joined on the same day
// by different buttons ended up with different kinds of account.
//
// Now every method signs in first and then lands on the same form. What the
// provider already told us -- a name, an email, a photo -- is filled in, and
// the rest is filled in by hand. Email sign-up is simply the provider that
// tells us the least.
//
// "Registered" means the account has a coach or member profile row. Nothing
// creates one automatically (checked: no trigger on users or auth.users writes
// either table), so the row is exactly the evidence that the form was finished.

export type RegistrationPrefill = {
  name: string;
  email: string;
  avatarUrl: string | null;
  /** 'google', 'apple', 'facebook', 'azure' -- or 'email'. */
  provider: string;
};

export type RegistrationState = { complete: boolean; prefill: RegistrationPrefill };

const PROVIDER_LABEL: Record<string, string> = {
  google: 'Google', apple: 'Apple', facebook: 'Facebook', azure: 'Microsoft', email: 'email',
};
export const providerLabel = (provider: string) => PROVIDER_LABEL[provider] ?? provider;

/** The name a provider gave, if it gave one.
 *
 *  Providers do not agree on the key: Google and Microsoft send `full_name` and
 *  `name`, Apple sends `full_name` only on the very first sign-in and nothing
 *  after, Facebook sends `name`. What is never used is the fallback the
 *  database invents when none of them did -- the part of the email before the
 *  @, or "Guest User". That is not something anybody told us, so it is not
 *  filled in as though they had. */
export function nameFromMetadata(metadata: Record<string, unknown> | null | undefined): string {
  for (const key of ['full_name', 'name', 'user_name', 'preferred_username']) {
    const value = metadata?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

/** A provider's photo, if it sent one. Google calls it `avatar_url` and
 *  `picture`; Facebook and Microsoft vary. Only http(s) is accepted -- this
 *  goes straight into an <Image>. */
export function avatarFromMetadata(metadata: Record<string, unknown> | null | undefined): string | null {
  for (const key of ['avatar_url', 'picture']) {
    const value = metadata?.[key];
    if (typeof value === 'string' && /^https:\/\//i.test(value.trim())) return value.trim();
  }
  return null;
}

export async function fetchRegistration(): Promise<RegistrationState> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const user = data.user;
  if (!user) throw new Error('Sign in first.');
  const appId = await currentAppUserId();

  const [coach, member] = await Promise.all([
    supabase.from('coach_profiles').select('user_id').eq('user_id', appId).maybeSingle(),
    supabase.from('partner_profiles').select('user_id').eq('user_id', appId).maybeSingle(),
  ]);
  if (coach.error) throw coach.error;
  if (member.error) throw member.error;

  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const provider = typeof user.app_metadata?.provider === 'string' ? user.app_metadata.provider : 'email';
  return {
    complete: Boolean(coach.data || member.data),
    prefill: {
      name: nameFromMetadata(metadata),
      email: user.email ?? '',
      avatarUrl: avatarFromMetadata(metadata),
      provider,
    },
  };
}

export type RegistrationInput = {
  name: string;
  role: 'coach' | 'member';
  sportIds: string[];
  area: string;
  /** The provider's photo, when the person kept it. */
  avatarUrl: string | null;
};

/** Finish registering. The account row is updated first and the profile row is
 *  written last, so a failure part-way leaves the form still showing -- the
 *  profile row is what marks it done, and it only exists once everything
 *  before it has been saved. */
export async function completeRegistration(input: RegistrationInput): Promise<void> {
  const name = input.name.trim();
  if (name.length < 2) throw new Error('Add your name.');
  const appId = await currentAppUserId();

  const fields: Record<string, unknown> = { name, city: input.area.trim() || null };
  if (input.avatarUrl) fields.avatar_url = input.avatarUrl;
  const account = await supabase.from('users').update(fields).eq('id', appId).select('id').single();
  if (account.error) throw account.error;

  await createProfileRows(appId, input.role, input.sportIds);
}

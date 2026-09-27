import { supabase } from './supabase';
import { ensureAppSession } from './session';

// Gwin, from the app's side.
//
// Two calls into the `gwin` Edge Function, which holds the Anthropic key and
// decides whether a capability is switched on at all. Nothing here asserts what
// the server enforces:
//
//  * The switches live in `ai_agent_config`, which this client cannot read. A
//    capability that is off answers 409 and the caller carries on without it. A
//    client-side copy of the switch would be a second source of truth that goes
//    stale between an operator's save and the app's next fetch.
//
//  * The safety flag is written by the function, with the service role. This
//    client has no business writing one: a client that can write a flag can
//    forge one against anybody.
//
// `capabilities()` exists only so the app does not offer an affordance that is
// going to refuse. It is presentation, never permission.

/** What the surface is, in the queue an admin reads. These are the same six
 *  `flag_if_explicit` already triggers on; the function refuses anything else. */
export type ModeratedSurface =
  | 'messages'
  | 'users'
  | 'coach_profiles'
  | 'partner_profiles'
  | 'profile_tags'
  | 'sport_requests';

export type Screening = {
  flagged: boolean;
  reason: string;
  /** What the operator chose should happen to flagged content. Reported for
   *  completeness; nothing in the app hides anything yet. */
  action: 'flag' | 'hide_and_flag';
  /** Whether the flag reached the queue. False means the verdict stands but
   *  nobody will see it. */
  stored: boolean;
};

export type SportMapping = {
  /** A name already on the curated list, checked against it by the function
   *  rather than taken on the model's word. */
  match: string | null;
  /** What to credit the member with requesting, when nothing matched. */
  request: string | null;
};

export type Capabilities = {
  moderatesContent: boolean;
  suggestsSports: boolean;
  moderationAction: 'flag' | 'hide_and_flag';
};

const OFF: Capabilities = {
  moderatesContent: false,
  suggestsSports: false,
  moderationAction: 'flag',
};

async function callGwin<T>(body: Record<string, unknown>): Promise<T> {
  await ensureAppSession();
  const { data, error } = await supabase.functions.invoke('gwin', { method: 'POST', body });
  if (error) throw error;
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(String((data as { error: unknown }).error));
  }
  return data as T;
}

/** Screen one piece of content the signed-in person is about to publish.
 *
 *  The function writes the flag when it decides to; this returns the verdict so
 *  a caller can say something if it wants to. Screening is a second pass over
 *  the keyword triggers in the database, not a replacement: the term list
 *  catches the obvious instantly and for free, and Gwin catches the euphemism
 *  the list misses. */
export function screenContent(surface: ModeratedSurface, content: string): Promise<Screening> {
  return callGwin<Screening>({ action: 'screen', subject: surface, content });
}

/** Screen, and never let it matter to the person who wrote the content.
 *
 *  Called after the write has already succeeded, deliberately, for two reasons.
 *  The keyword triggers in the database fire on write and flag without blocking
 *  either, so this keeps the same timing and the queue reads consistently. And
 *  an API call inside a save is a save that is slow when Anthropic is slow and
 *  fails when Anthropic fails -- for a check whose only output is a row in a
 *  review queue.
 *
 *  So every error is swallowed, including the capability being off, which is
 *  the ordinary case until an operator turns it on. Nothing here is shown to
 *  the member: they are not being accused of anything, a human decides. */
export function screenQuietly(surface: ModeratedSurface, content: string): void {
  const text = content.trim();
  if (!text) return;
  void screenContent(surface, text).catch(() => {});
}

/** Map what somebody typed onto the curated sports list.
 *
 *  `match` is an existing entry spelled the list's way. `request` is what to put
 *  in front of an admin. Gwin never adds to the list itself -- `decide_sport_request`
 *  stays the single gate. */
export function mapSport(typed: string): Promise<SportMapping> {
  return callGwin<SportMapping>({ action: 'map-sport', typed });
}

/** Which capabilities are on, for deciding what to render.
 *
 *  Fails to "everything off": an app that cannot reach the function should show
 *  the plain path rather than an affordance that will not work. Never used to
 *  decide whether something is *allowed* -- the function settles that. */
export async function fetchCapabilities(): Promise<Capabilities> {
  try {
    const raw = await callGwin<{
      moderates_content?: boolean;
      suggests_sports?: boolean;
      moderation_action?: string;
    }>({ action: 'capabilities' });
    return {
      moderatesContent: raw.moderates_content === true,
      suggestsSports: raw.suggests_sports === true,
      moderationAction: raw.moderation_action === 'hide_and_flag' ? 'hide_and_flag' : 'flag',
    };
  } catch {
    return OFF;
  }
}

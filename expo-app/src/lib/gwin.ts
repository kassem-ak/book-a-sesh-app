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
  | 'community_messages'
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
  /** Whether an Anthropic key is configured. A switch that is on with no key
   *  behind it does nothing, so callers check both. */
  engineReady: boolean;
  moderationAction: 'flag' | 'hide_and_flag';
};

const OFF: Capabilities = {
  moderatesContent: false,
  suggestsSports: false,
  engineReady: false,
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

/** The same second pass, for a picture someone sent in a chat. After the
 *  send, never inside it, and every error swallowed -- exactly as for text. The
 *  function only screens images from the chat folders, and only for the person
 *  who uploaded them. */
export function screenImageQuietly(surface: 'messages' | 'community_messages', path: string): void {
  void callGwin<Screening>({ action: 'screen-image', subject: surface, path }).catch(() => {});
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
export type FiledRequest = {
  requestId: string;
  /** What the engine decided it is, or the caller's guess when it is off. */
  kind: 'sport' | 'hobby';
  /** Where it will sit once approved, or null when the engine was not asked. */
  category: string | null;
  /** Whether the engine actually placed it. When it could not run, `category`
   *  is the Other fallback -- a placeholder for an admin, not a decision. */
  placedByEngine: boolean;
};

/** Ask for an entry that is not in the catalogue.
 *
 *  Works whether or not the engine is on -- a member who cannot find their
 *  sport must always be able to ask for it. When the engine is on, it decides
 *  sport-or-hobby and the category before an admin sees the request; when it
 *  is off, `kind` is used as given and the request arrives unplaced.
 *
 *  The server's own refusals come through as the error message, and they are
 *  written to be shown: "Did you mean Football?", "Chess is already there to
 *  choose". */
export async function requestSport(typed: string): Promise<FiledRequest> {
  // The member is never asked where it belongs: the engine decides sport or
  // hobby and the category. If it cannot run, the request lands under Other
  // and the admin who approves it places it.
  const raw = await callGwin<Omit<FiledRequest, 'placedByEngine'> & { placed_by_engine?: boolean }>({
    action: 'request-sport', typed,
  });
  const filed: FiledRequest = { ...raw, placedByEngine: raw.placed_by_engine === true };
  // A request name is member-written text that an admin reads, so it gets the
  // same second pass the old request form gave it.
  screenQuietly('sport_requests', typed);
  return filed;
}

export async function fetchCapabilities(): Promise<Capabilities> {
  try {
    const raw = await callGwin<{
      moderates_content?: boolean;
      suggests_sports?: boolean;
      engine_ready?: boolean;
      moderation_action?: string;
    }>({ action: 'capabilities' });
    return {
      moderatesContent: raw.moderates_content === true,
      suggestsSports: raw.suggests_sports === true,
      engineReady: raw.engine_ready === true,
      moderationAction: raw.moderation_action === 'hide_and_flag' ? 'hide_and_flag' : 'flag',
    };
  } catch {
    return OFF;
  }
}

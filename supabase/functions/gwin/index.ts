import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Gwin, reached from the app.
//
// The console has its own Gwin (app/Services/Gwin.php in kassem-ak/bookd-admin)
// and the app cannot call it: that is PHP behind an admin login, and it reads
// the configuration with the service-role key, which is not in this app and
// never will be. This is the app's path to the same configuration and the same
// prompts.
//
// The prompts and the parse rules below are copied from that console, from
// config/anthropic.php and Gwin.php. They are the safety boundary rather than a
// preference, so they are mirrored rather than reinvented. If either side
// changes, change both.
//
// Two things this function does that the client must never do:
//
//  1. It decides whether a capability is on. The switches live in
//     ai_agent_config, which anon and authenticated cannot read at all. A
//     client-side check would be a second source of truth that goes stale
//     between an operator's save and the app's next fetch.
//
//  2. It writes the safety_flag, with the service role. A client that can write
//     a flag can forge one against anybody.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

// --- the shipped prompts, verbatim from config/anthropic.php -----------------

const PROMPTS = {
  moderation:
    "You are Gwin, screening one piece of member content for the BOOK'D safety queue. Decide only whether it is suspected sexual content.\n\n"
    + "Answer with exactly one line. Either FLAG followed by one short sentence of reason, or CLEAR followed by nothing.\n\n"
    + "Flag sexual content, sexual solicitation and sexual harassment. Do not flag profanity, insults, or ordinary bodies in a sporting context. Where you are unsure whether something is sexual, flag it: a human reviews every flag, and nothing is deleted, hidden permanently or acted on against an account on your word alone.",
  suggestion:
    "You are Gwin, matching what a BOOK'D member typed against the curated list of sports and hobbies given to you.\n\n"
    + "Answer with exactly one line. Either MATCH followed by an entry's name copied character for character from the list, or NEW followed by the name the member should be credited with requesting.\n\n"
    + "Match only a genuine synonym, translation, abbreviation or spelling variant of an entry already on the list. Never invent an entry, and never widen one to cover something adjacent: a near neighbour is a NEW request for a human to decide, not a match.",
};

// New, and app-side only: the console has no classification capability, so
// there is no console copy of this one to keep in step. Same house rules as the
// two above -- one line, a closed vocabulary, checked in code, and a failure
// that lands somewhere harmless rather than somewhere wrong.
const CLASSIFY_PROMPT =
  "You are Gwin, sorting one new entry for the BOOK'D catalogue of sports and hobbies into the categories given to you.\n\n"
  + "Answer with exactly one line: SPORT or HOBBY, then the name of one category copied character for character from that kind's list. For example: SPORT Combat sports\n\n"
  + "A sport is a physical activity people train at or compete in. A hobby is a pastime that is not mainly physical training. Choose the closest category. If none genuinely fits, choose the one whose name begins with Other. Never invent a category.";

// The surfaces flag_if_explicit already triggers on. subject_type is written
// into the queue an admin reads, so it comes from this list rather than from
// whatever the caller sent.
const SURFACES = [
  "messages",
  "users",
  "coach_profiles",
  "partner_profiles",
  "profile_tags",
  "sport_requests",
];

const MODELS = ["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5-20251001"];
const EFFORTS = ["low", "medium", "high", "xhigh", "max"];

// The row is trusted less than the form that wrote it: these values go into an
// outbound request, so an unexpected one falls back rather than being sent.
const pick = (value: unknown, allowed: string[], fallback: string) =>
  typeof value === "string" && allowed.includes(value) ? value : fallback;

/** The operator's instruction, or the one shipped above. A null column means
 *  "use the code's prompt", so a deployment that has never opened the console's
 *  Gwin page still screens against a reviewed instruction. */
const promptFor = (stored: unknown, shipped: string) =>
  typeof stored === "string" && stored.trim() !== "" ? stored : shipped;

class Unavailable extends Error {}

/** One request to Anthropic.
 *
 *  `thinking` is adaptive and carries NO budget_tokens: a budget is rejected
 *  with a 400 on this model generation, so sending one would break every call
 *  rather than cap it. Effort rides in output_config, which is where the API
 *  reads it. */
async function ask(
  settings: Record<string, unknown>,
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key || !key.trim()) {
    throw new Unavailable("No Anthropic API key is configured, so Gwin cannot run.");
  }

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: pick(settings.model, MODELS, "claude-opus-5"),
        max_tokens: maxTokens,
        system,
        thinking: { type: "adaptive" },
        output_config: { effort: pick(settings.effort, EFFORTS, "high") },
        messages: [{ role: "user", content: user }],
      }),
    });
  } catch {
    // Never log the request: it holds the key in a header and whatever was
    // being screened in its body.
    throw new Unavailable("Gwin could not reach Anthropic.");
  }

  if (!response.ok) {
    console.warn("Gwin request failed", { status: response.status });
    throw new Unavailable("Gwin could not reach Anthropic.");
  }

  const message = await response.json();
  if (message?.stop_reason === "refusal") throw new Unavailable("Gwin declined to answer that.");

  // Content is a list of polymorphic blocks and a thinking block comes first
  // whenever the model thought, so the type is checked rather than the first
  // block being assumed to be the answer.
  const parts = (Array.isArray(message?.content) ? message.content : [])
    .filter((block: { type?: string }) => block?.type === "text")
    .map((block: { text?: string }) => block.text ?? "");
  if (parts.length === 0) throw new Unavailable("Gwin returned no answer.");
  return parts.join("\n");
}

// --- the two actions ---------------------------------------------------------

/** Screen one piece of member content.
 *
 *  Every failure resolves to flagged. A refusal, a truncated reply, a line that
 *  is neither FLAG nor CLEAR, an unreachable provider: none of those is a
 *  clearance, and the safe reading of "did not clear" is "a human should look".
 *  The cost of being wrong that way is one click in a queue an admin already
 *  works. */
function verdictFrom(reply: string, action: string) {
  const text = reply.trim();
  if (/^CLEAR\b/i.test(text)) return { flagged: false, reason: "", action };
  const reason = text.replace(/^FLAG\b[:.\s-]*/i, "").trim();
  return {
    flagged: true,
    reason: reason !== "" ? reason : "Held for review: Gwin gave no usable verdict.",
    action,
  };
}

/** A match is only ever a name already on the list, checked here rather than
 *  taken on the model's word -- the reply is text, and text that looks like an
 *  entry is not an entry. Everything else is a request, so the taxonomy keeps
 *  exactly one gate and Gwin is not it. */
function mappingFrom(reply: string, curated: string[], typed: string) {
  const found = reply.trim().match(/^MATCH\b[:.\s-]*(.+)$/i);
  if (found) {
    const named = found[1].trim().toLowerCase();
    const hit = curated.find((name) => name.toLowerCase() === named);
    if (hit) return { match: hit, request: null };
  }
  // Including a name Gwin invented: credited to the member as a request, and a
  // human decides whether the list grows.
  return { match: null, request: typed };
}

type Category = { id: string; kind: "sport" | "hobby"; name: string };

/** A category is only ever a row already in sport_categories, checked here
 *  rather than taken on the model's word -- the same rule mappingFrom follows
 *  for sports. A kind it cannot read falls back to the caller's guess, and a
 *  category that is not on that kind's list falls back to that kind's Other:
 *  wrongly filed under Other is a thing an admin fixes in a second, and an
 *  invented category is a thing the layer never recovers from. */
function classificationFrom(reply: string, categories: Category[], fallbackKind: "sport" | "hobby") {
  const found = reply.trim().match(/^(SPORT|HOBBY)\b[:.\s-]*(.*)$/i);
  const kind = found ? (found[1].toLowerCase() as "sport" | "hobby") : fallbackKind;
  const named = (found?.[2] ?? "").trim().toLowerCase();
  const ofKind = categories.filter((category) => category.kind === kind);
  const hit = ofKind.find((category) => category.name.toLowerCase() === named)
    ?? ofKind.find((category) => category.name.toLowerCase().startsWith("other"))
    ?? null;
  return { kind, category: hit };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  // This endpoint costs money per call, so an unauthenticated caller gets
  // nothing. Same shape as delete-account: identify from the caller's own JWT,
  // then act with the service role.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Sign in first." }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const asCaller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: auth, error: authErr } = await asCaller.auth.getUser();
  if (authErr || !auth?.user) return json({ error: "Sign in first." }, 401);
  const authId = auth.user.id;

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Send JSON." }, 400);
  }
  const action = String(body.action ?? "");

  // Absent reads as off, not as on: a row this function cannot see must not be
  // the reason an agent starts acting on members' content.
  const { data: settingsRow } = await admin.from("admin_ai_agent").select("*").maybeSingle();
  const settings = (settingsRow ?? {}) as Record<string, unknown>;

  if (action === "capabilities") {
    // moderation_action is reported as the operator set it. Nothing in the app
    // hides content yet, so 'hide_and_flag' currently behaves as 'flag' on this
    // side; the console should not offer it until that is built.
    // Presentation only -- so the app does not offer an affordance that will be
    // refused. Three booleans and the action; never the prompts, the model or
    // who last saved.
    return json({
      moderates_content: settings.moderates_content === true,
      suggests_sports: settings.suggests_sports === true,
      moderation_action:
        settings.moderation_action === "hide_and_flag" ? "hide_and_flag" : "flag",
    });
  }

  if (action === "screen") {
    if (settings.moderates_content !== true) {
      return json({ error: "Content moderation is switched off for Gwin." }, 409);
    }
    const content = String(body.content ?? "").trim();
    if (!content) return json({ error: "Nothing to screen." }, 400);

    const subject = String(body.subject ?? "");
    if (!SURFACES.includes(subject)) return json({ error: "Unknown surface." }, 400);

    // safety_flags.subject_id is the AUTHOR, which is how flag_if_explicit
    // writes it -- not the id of the row. It comes from the caller's own JWT
    // rather than from the body: on every one of these surfaces you are writing
    // your own content, and a body-supplied id would let anyone file a flag
    // against anybody.
    const { data: me } = await admin
      .from("users").select("id").eq("auth_id", authId).maybeSingle();
    if (!me?.id) return json({ error: "No profile for this account." }, 403);

    const moderationAction =
      settings.moderation_action === "hide_and_flag" ? "hide_and_flag" : "flag";

    let verdict: { flagged: boolean; reason: string; action: string };
    try {
      const reply = await ask(
        settings,
        promptFor(settings.moderation_prompt, PROMPTS.moderation),
        content,
        8000,
      );
      verdict = verdictFrom(reply, moderationAction);
    } catch (failure) {
      if (!(failure instanceof Unavailable)) throw failure;
      verdict = {
        flagged: true,
        reason: "Held for review: Gwin could not screen this.",
        action: moderationAction,
      };
    }

    if (verdict.flagged) {
      // Written here, with the service role, and shaped exactly like the row
      // flag_if_explicit writes so the queue an admin already works stays
      // legible. The client is never allowed to write this.
      const { error: flagErr } = await admin.from("safety_flags").insert({
        subject_type: subject,
        subject_id: me.id,
        source: `gwin:${subject}:${verdict.reason}`.slice(0, 200),
        content: content.slice(0, 500),
        auto: true,
      });
      // A flag that could not be stored is worth saying out loud: the caller
      // asked for this to be reviewed and it will not be.
      if (flagErr) {
        console.error("Gwin could not write the safety flag", { code: flagErr.code });
        return json({ ...verdict, stored: false }, 200);
      }
    }

    return json({ ...verdict, stored: verdict.flagged });
  }

  if (action === "map-sport") {
    if (settings.suggests_sports !== true) {
      return json({ error: "Suggesting sports and hobbies is switched off for Gwin." }, 409);
    }
    const typed = String(body.typed ?? "").trim();
    if (!typed) return json({ error: "Nothing to map." }, 400);

    const { data: sports } = await admin
      .from("sports").select("name").eq("approved", true).order("name");
    const curated = (sports ?? [])
      .map((row: { name?: string }) => row.name)
      .filter((name: unknown): name is string => typeof name === "string");

    try {
      const reply = await ask(
        settings,
        promptFor(settings.suggestion_prompt, PROMPTS.suggestion),
        `List:\n${curated.join("\n")}\n\nMember typed:\n${typed}`,
        8000,
      );
      return json(mappingFrom(reply, curated, typed));
    } catch (failure) {
      if (!(failure instanceof Unavailable)) throw failure;
      // Unlike screening, failing here is not dangerous -- it just means the
      // member asks for the entry the ordinary way.
      return json({ match: null, request: typed });
    }
  }

  if (action === "request-sport") {
    // Filing a request is not an AI decision and must not depend on the engine
    // being switched on: a member who cannot find their sport should always be
    // able to ask for it. What the engine adds, when it is on, is sorting the
    // request into the right kind and category before an admin sees it.
    const typed = String(body.typed ?? "").trim();
    if (!typed) return json({ error: "Nothing to request." }, 400);
    const callerKind = body.kind === "hobby" ? "hobby" : "sport";

    let kind: "sport" | "hobby" = callerKind;
    let categoryId: string | null = null;
    let categoryName: string | null = null;

    if (settings.suggests_sports === true) {
      const { data: rows } = await admin
        .from("sport_categories").select("id, kind, name").order("position");
      const categories = (rows ?? []) as Category[];
      try {
        const lists = (["sport", "hobby"] as const).map((each) =>
          `${each.toUpperCase()} categories:\n${
            categories.filter((category) => category.kind === each).map((category) => category.name).join("\n")
          }`).join("\n\n");
        const reply = await ask(settings, CLASSIFY_PROMPT, `${lists}\n\nNew entry:\n${typed}`, 4000);
        const sorted = classificationFrom(reply, categories, callerKind);
        kind = sorted.kind;
        categoryId = sorted.category?.id ?? null;
        categoryName = sorted.category?.name ?? null;
      } catch (failure) {
        if (!(failure instanceof Unavailable)) throw failure;
        // Unsorted is fine: it files under the caller's kind and shows under
        // Other until an admin places it.
      }
    }

    // Filed AS THE CALLER, through the same RPC the request form always used,
    // so requested_by is the member and the existing rules all still apply --
    // a duplicate pending request becomes a vote, and a near-miss of something
    // already listed comes back as "Did you mean ...?".
    const { data: requestId, error: requestErr } = await asCaller
      .rpc("submit_sport_request", { p_name: typed, p_kind: kind });
    if (requestErr) return json({ error: requestErr.message }, 422);

    if (categoryId && typeof requestId === "string") {
      // The one write the caller cannot make themselves: proposing where the
      // entry belongs. Never overwrites a category an admin already set on a
      // request somebody else filed first.
      await admin.from("sport_requests")
        .update({ category_id: categoryId })
        .eq("id", requestId)
        .is("category_id", null);
    }

    return json({ requestId, kind, category: categoryName });
  }

  return json({ error: "Unknown action." }, 400);
});

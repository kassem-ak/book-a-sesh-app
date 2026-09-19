import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Relays one notification to Expo's push service.
//
// Deliberately thin. The database already decided WHO should be told and
// WHETHER they want to be told -- it has the notification, the preference and
// the tokens, and asking it twice would mean two places that can disagree. This
// takes the tokens it is given and does the one thing Postgres cannot: an
// authenticated call to an outside service.
//
// The caller is a database trigger, not a person, so there is no user JWT to
// verify. Deploy with --no-verify-jwt; the shared secret below is what stands
// in for it.

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
// Expo's documented limit for one request.
const CHUNK = 100;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

type Payload = {
  tokens?: unknown;
  title?: unknown;
  body?: unknown;
  data?: unknown;
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  const expected = Deno.env.get("PUSH_HOOK_SECRET");
  // Inert rather than open. Without the secret this function has no way to tell
  // its own database from anyone who found the URL, so it refuses everything.
  if (!expected) return json({ error: "Push is not configured." }, 503);
  if (req.headers.get("x-push-secret") !== expected) {
    return json({ error: "Not allowed." }, 401);
  }

  const payload = (await req.json().catch(() => null)) as Payload | null;
  const tokens = Array.isArray(payload?.tokens)
    ? payload.tokens.filter((t): t is string => typeof t === "string" && t.length > 0)
    : [];
  const title = typeof payload?.title === "string" ? payload.title : null;
  if (!title || tokens.length === 0) return json({ sent: 0 });

  const base = {
    title,
    body: typeof payload?.body === "string" ? payload.body : undefined,
    data: payload?.data ?? undefined,
    sound: "default" as const,
    // Android needs a channel that exists on the device; the client creates
    // this one at registration time.
    channelId: "default",
  };

  // Tokens Expo tells us are dead. An uninstalled app keeps its row forever
  // otherwise, and every later notification pays for a send that cannot arrive.
  const dead: string[] = [];
  let sent = 0;

  for (let i = 0; i < tokens.length; i += CHUNK) {
    const batch = tokens.slice(i, i + CHUNK);
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept-Encoding": "gzip, deflate" },
      body: JSON.stringify(batch.map((to) => ({ to, ...base }))),
    });

    if (!res.ok) {
      // Report it rather than swallowing it: pg_net records the response, so a
      // misconfigured FCM key is findable instead of silently doing nothing.
      return json({ error: `Expo replied ${res.status}`, sent }, 502);
    }

    const result = (await res.json().catch(() => null)) as
      | { data?: Array<{ status?: string; details?: { error?: string } }> }
      | null;
    const tickets = result?.data ?? [];
    tickets.forEach((ticket, index) => {
      if (ticket?.status === "ok") { sent += 1; return; }
      if (ticket?.details?.error === "DeviceNotRegistered") dead.push(batch[index]);
    });
  }

  if (dead.length > 0) {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    await admin.from("push_tokens").delete().in("token", dead);
  }

  return json({ sent, pruned: dead.length });
});

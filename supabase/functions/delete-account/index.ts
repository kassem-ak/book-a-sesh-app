import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// In-app account deletion. Both the App Store (5.1.1(v)) and Google Play
// require this wherever an app lets people create an account.
//
// It anonymises rather than hard-deletes, on purpose. public.users is the
// parent of 13 NO ACTION foreign keys -- events, reports, safety flags,
// accounting history, community memberships -- so a DELETE would simply fail
// for anyone who has used the app. It would also destroy the other side of
// shared records: a coach's booking and payout history is their business
// record, not only the client's.
//
// So: strip every identifying field, delete the rows that are personal to the
// account alone, detach the auth link, then remove the auth user so the
// credentials can never sign in again.
//
// The auth_id FK is ON DELETE CASCADE, so the detach has to happen before the
// auth user is removed -- otherwise the delete cascades into public.users and
// is rejected by those NO ACTION children.
//
// `initials` is a generated column derived from `name`; it regenerates itself
// and must not appear in the update.

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Sign in first." }, 401);
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Identify the caller from their own JWT. Never trust an id in the body --
  // that would let anyone delete anyone.
  const asCaller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: auth, error: authErr } = await asCaller.auth.getUser();
  if (authErr || !auth?.user) return json({ error: "Sign in first." }, 401);
  const authId = auth.user.id;

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: rows, error: lookupErr } = await admin
    .from("users").select("id").eq("auth_id", authId).limit(1);
  if (lookupErr) return json({ error: lookupErr.message }, 500);
  const appUserId = rows?.[0]?.id as string | undefined;

  if (appUserId) {
    // 1. Rows that belong to this account alone and carry personal detail.
    //    calendar_integrations holds OAuth tokens and must not linger.
    const personal: Array<[string, string]> = [
      ["calendar_integrations", "user_id"],
      ["notification_prefs", "user_id"],
      ["profile_tags", "user_id"],
      ["user_goals", "user_id"],
      ["partner_profiles", "user_id"],
      ["loyalty_ledger", "user_id"],
      ["loyalty_accounts", "user_id"],
      ["coach_availability", "coach_id"],
      ["certifications", "coach_id"],
      ["conversation_participants", "user_id"],
    ];
    for (const [table, column] of personal) {
      const { error } = await admin.from(table).delete().eq(column, appUserId);
      if (error) return json({ error: `${table}: ${error.message}` }, 500);
    }

    // 2. Strip identity, and detach before the auth user goes.
    const { error: anonErr } = await admin.from("users").update({
      name: "Deleted account",
      email: null,
      phone: null,
      avatar_url: null,
      city: null,
      location: null,
      deleted_at: new Date().toISOString(),
      auth_id: null,
    }).eq("id", appUserId);
    if (anonErr) return json({ error: anonErr.message }, 500);
  }

  // 3. Remove the credentials. After this the account cannot sign in again.
  const { error: delErr } = await admin.auth.admin.deleteUser(authId);
  if (delErr) return json({ error: delErr.message }, 500);

  return json({ deleted: true, anonymised_app_user: appUserId ?? null });
});

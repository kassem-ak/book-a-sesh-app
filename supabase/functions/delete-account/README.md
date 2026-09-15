# delete-account

In-app account deletion. Deployed to the live project on 2026-09-15 (version 2).

Both the App Store (guideline 5.1.1(v)) and Google Play require an in-app
deletion path wherever an app allows account creation, so this is a release
gate rather than a nicety.

## Why it anonymises instead of hard-deleting

`public.users` is the parent of **13 NO ACTION foreign keys** — events, reports,
safety flags, accounting history, community memberships, sport requests. A plain
`DELETE` fails outright for anyone who has actually used the app. Beyond that, a
coach's booking and payout history is *their* business record as much as the
client's, so destroying shared rows would damage a third party.

So the function:

1. deletes rows that belong to the account alone and carry personal detail —
   including `calendar_integrations`, which stores OAuth access and refresh
   tokens that must not linger;
2. strips every identifying field from `users` (`name` becomes
   "Deleted account", email / phone / avatar / city / location nulled) and
   stamps `deleted_at`;
3. detaches `auth_id`;
4. deletes the `auth.users` row, so the credentials can never sign in again.

Step 3 must precede step 4: `users_auth_id_fkey` is `ON DELETE CASCADE`, so
removing the auth user first cascades into `public.users` and is then rejected
by those NO ACTION children.

`initials` is a generated column derived from `name` — it regenerates itself and
must not be included in the update. (It was, in version 1, and the deploy failed
with `column "initials" can only be updated to DEFAULT`.)

## Security

`verify_jwt` is on, and the caller is identified from their own JWT via
`auth.getUser()`. No id is accepted from the request body — that would let
anyone delete anyone. The service-role key stays server-side; the client only
invokes the function.

Note that Supabase access tokens are stateless, so a token minted before
deletion stays cryptographically valid until it expires. The account cannot
obtain a new one, and `current_app_user()` no longer resolves, so it carries no
identity.

## Verified

Against the live project: created an anonymous account, bootstrapped its app
row, invoked the function. Result `{"deleted":true}`; the row became
`Deleted account` with email/phone/avatar/city null, `auth_link=detached`,
`deleted_at` set, `notification_prefs` removed, and `initials` regenerated to
"D". Other accounts untouched. Test accounts cleaned up afterwards.

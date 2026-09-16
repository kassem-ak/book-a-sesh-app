# BOOK'D — store submission runbook

What is left before BOOK'D can be submitted, and the exact values to use. Every
item here needs an account or a credential that only you can supply — that is
why it is a document and not a commit.

The app side of all of it is already built and verified.

---

## 1. Enable the four SSO providers

The app already ships Google, Facebook, Microsoft and Apple sign-in, renders all
four buttons, and probes each provider before redirecting so a disabled one
fails with a clear message instead of a blank browser tab. What is missing is
the provider-side app registration. Each provider issues a **client ID** and a
**client secret**, which you paste into the Supabase dashboard.

**Use these exact values everywhere a redirect or callback URL is asked for:**

| Field | Value |
|---|---|
| Authorised redirect URI (all four providers) | `https://qievymkkprhbvxrsdukb.supabase.co/auth/v1/callback` |
| App deep-link scheme (already configured) | `bookd://` |
| Bundle ID / package name | `com.bookd.app` |

Then in **Supabase Dashboard → Authentication → Providers**, enable the provider
and paste its client ID and secret.

### Google
1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID** → Web application.
2. Add the redirect URI above.
3. Configure the OAuth consent screen (app name, support email, privacy policy URL from §3).
4. For native builds you also want an **iOS** and an **Android** client, using bundle id `com.bookd.app`.

### Facebook
1. developers.facebook.com → **Create App** → *Consumer*.
2. Add the **Facebook Login** product → Settings → Valid OAuth Redirect URIs → the URI above.
3. Facebook requires a privacy policy URL and a data-deletion URL before the app can leave development mode — §3 covers both.
4. Submit for App Review with the `email` and `public_profile` permissions.

### Microsoft
1. Azure Portal → **Microsoft Entra ID** → App registrations → New registration.
2. Supported account types: *Accounts in any organizational directory and personal Microsoft accounts*.
3. Redirect URI, platform **Web**, the URI above.
4. Certificates & secrets → New client secret.
5. In Supabase this provider is named **Azure**.

### Apple — not optional
Apple requires Sign in with Apple in any app that offers third-party sign-in.
Shipping the other three without it is an automatic rejection.
1. Apple Developer → Certificates, Identifiers & Profiles.
2. Register an **App ID** for `com.bookd.app` with *Sign in with Apple* enabled.
3. Register a **Services ID** (this is the client ID), and set its Return URL to the URI above.
4. Create a **Sign in with Apple key** (.p8), and note the Key ID and your Team ID.

> I did not create any of these, and did not handle any client secret. Paste
> them straight into the Supabase dashboard — they should not enter this repo.

### Current state, measured

Every provider was probed against the live project. All four answer
identically today:

```
GET /auth/v1/authorize?provider=<google|facebook|azure|apple>
400 {"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}
```

The app handles that correctly rather than opening a dead tab — each button
reports "<Provider> sign-in is not set up yet. Use your email and password for
now." So the client is finished; enabling is purely the dashboard step above.

To confirm a provider went live, re-run the probe and look for a `302` instead
of the `400`:

```bash
curl -s -o /dev/null -w "%{http_code}" "https://qievymkkprhbvxrsdukb.supabase.co/auth/v1/authorize?provider=facebook&redirect_to=bookd://"
```

Repeat with `provider=google`, `provider=azure` (Microsoft) and
`provider=apple`. A `302` means that provider is enabled and the redirect URI
was accepted; a `400` means it is still not configured.

After enabling each one, the in-app probe stops reporting it as unavailable;
that is the fastest way to confirm it took.

---

## 2. Set the EAS build environment

Without this a release build points at `http://localhost` and the installed app
reaches nothing. See `expo-app/DEPLOY.md` for the full note.

```bash
eas env:set --name EXPO_PUBLIC_SUPABASE_URL --value "https://qievymkkprhbvxrsdukb.supabase.co" --environment production --visibility plaintext
```

```bash
eas env:set --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon key from the Supabase dashboard>" --environment production --visibility plaintext
```

The project also needs `extra.eas.projectId` in `app.json`, which `eas init`
writes for you when you link the project. `eas.json` uses
`appVersionSource: remote`, so EAS owns the version code once linked.

---

## 3. Host the privacy policy

`PRIVACY.md` is written from the live schema — it describes what the app
actually collects, not a template. Fill in the three `[PLACEHOLDERS]` (legal
entity, support email, jurisdiction), have it reviewed, and host it at a public
URL. Both consoles require that URL before the listing can be submitted, and
Facebook requires it before your app leaves development mode.

Facebook additionally asks for a **data deletion** URL or callback. The app has
in-app deletion under Profile, so that page can simply document the in-app path.

---

## 4. Data safety / privacy nutrition answers

Derived from the live schema, so these answers are defensible.

| Question | Answer |
|---|---|
| Personal info collected | Name, email address, approximate location |
| Payment info | **None.** There is no payment path in the app; clients pay the coach directly |
| Messages | Yes — in-app chat content |
| Photos / camera / contacts / calendar / microphone / health | None requested |
| Location precision | **Approximate only.** The code requests `Accuracy.Balanced`, and `ACCESS_FINE_LOCATION` is explicitly blocked in `app.json` |
| Advertising ID / tracking | None. No ad networks, no analytics SDK, no crash SDK |
| Data shared with third parties | None for advertising. Processors only: Supabase (hosting/auth), and your chosen sign-in provider |
| Data encrypted in transit | Yes |
| Can users request deletion? | Yes — in-app, under Profile |
| User-generated content | Yes: profiles, chat, community events |
| Content moderation | Report **and** block, both reachable from a member's profile; blocking is enforced server-side |
| Age rating inputs | Answer *yes* to user interaction and user-generated content. Set a 13+ minimum to match `PRIVACY.md` §6 |

You will also need a **support URL or contact email** in both listings. There is
no support route in the app today; the simplest fix is to use the same address
as the privacy policy contact.

---

## 5. Remaining decisions that are yours

- **`admin_shares` is empty.** The launch truncate cascaded it away. It needs
  re-setting once you decide who the platform admins are; until then nothing
  computes an admin revenue share.
- **The COACH role is free.** Creating a coach profile makes you a coach
  permanently — `guard_coach_profile_privileges` forces `subscription_status`
  to `active` with no expiry, and nothing charges. Correct if coaching is free
  in v1, a revenue hole if not.
- **Courts and Shop code still ships in the binary** even though both are
  deferred. They are unreachable from the four tabs; confirm that holds before
  submitting, because a reachable half-finished screen is a common rejection.
- **No crash reporting.** `ErrorBoundary` catches render crashes and shows a
  recovery screen, but only logs to the console. You will be blind to crashes
  in the field.

---

## 6. What is already done

- Four tabs only — Discover, Maps, Community, Chat. Courts is removed from navigation.
- All test data truncated; every list renders real server rows with honest empty states.
- Money paths verified against the live database and pinned by `db/tests/release_invariants.sql` (10 invariant groups).
- In-app account deletion, deployed and verified.
- Report and block, both server-enforced.
- Native identity, icons and splash rebuilt as `com.bookd.app` / BOOK'D.

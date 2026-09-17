# BOOK'D — final pre-release report

**16 September 2026.** Branch `design-final-set`, open as PR #19 against `main`
(PR #18 is merged). Every claim below was verified against the live Supabase
project, a running build, or both — not inferred from code alone.

---

## 1. What this pass covered

Orchestrated across both workers plus in-process agents:

| Worker | Job | Output |
|---|---|---|
| gemma4 | Literal design spec from 25 artboards | `.orchestration/design-spec-extract.md` |
| gemma4 | Design-vs-code delta | `.orchestration/design-delta.md` |
| gemma4 | Prototype-residue sweep, all 52 source files | `.orchestration/residue-sweep.md` |
| gemma4 | Dummy-data and API/endpoint audit, 88 files | `.orchestration/final-data-api-audit.md` |
| codex | Commercial review: 8 revenue paths | `.orchestration/business-review.md` |
| codex | Functional test matrix, 349 scenarios | `.orchestration/final-test-matrix.md` |
| codex | Implementation of accepted findings | across the commits below |

Worker output was treated as advisory. Several findings were rejected after
checking them, and two were wrong in a way that would have made things worse —
both are recorded in §6.

---

## 2. Money and data correctness

Every item verified against the live database.

- **A 5-session package billed its full price on every session.** A $203 pack
  charged $1,015. Purchase now charges once, redemptions record zero, an
  exhausted pack is refused.
- **Concurrent package bookings could double-charge.** The purchase-vs-redemption
  decision read the balance with no lock, and on a first purchase there is no
  row to lock at all — two concurrent calls could each record the full price
  *and* commission. Two could also each take the last session free, with
  `least(...)` then hiding the extra booking. Serialised with an advisory lock
  on the (client, coach, package) triple.
- **Editing a package rewrote what buyers had already paid for.** Redemption set
  the balance from the package's *current* session count, so a coach dropping a
  pack from 10 sessions to 5 confiscated 5 paid sessions; raising it handed out
  free ones with no commission. The purchased total is now preserved.
- **The booking screen quoted the wrong amount.** It always showed the pack
  price, so session 2 of a 5-pack said $203 was payable when nothing was owed.
  It now reads the real balance, and shows the *purchased* total rather than the
  current listing.
- **A failed or in-flight balance read silently quoted the full price.** Unknown
  is now distinguishable from zero; the app no longer asserts an amount it does
  not have.
- **Court pricing and commission** are derived server-side; the client sends no
  amount.

## 3. Security and access

- **Blocking another member**, enforced server-side: a trigger on `messages`
  refuses both directions and `start_conversation` refuses the thread. Required
  by App Store 1.2. The block is private, symmetric, and only the blocker can
  lift it.
- **Reporting was routed but unreachable** — nothing opened it. Both are now on
  a member's profile.
- **Admin approvals could never have worked.** Approve/Reject wrote directly to
  `sport_requests`, but `authenticated` holds SELECT and INSERT only; RLS
  allowed the row without supplying the SQL privilege, so every decision failed
  with permission denied. Now a SECURITY DEFINER RPC that checks
  `is_platform_admin()`, rejects an invalid status, and only moves a
  still-pending row.
- **Chat was dead for every user** (`42P17` recursion in the
  `conversation_participants` policy), fixed with a SECURITY DEFINER helper.
- **Coach schedules are enforced.** "My schedule" wrote rows the booking RPC
  never read, so a client could book a declared day off. The slot is passed
  explicitly, not parsed from display text.
- `is_admin`, `email` and `auth_id` are not readable by clients, and no client
  role holds INSERT/UPDATE on a money table. Both pinned as invariants.

## 4. Dummy data and API links

**Live database contains exactly one row of user data: your own account.** All
demo and test data is gone, and three anonymous "Guest" rows created by my own
browser testing were removed after confirming they had no bookings, messages,
memberships, events or reports.

Kept deliberately: `sports` (12, taxonomy) and `platform_margins` (3, config).
`admin_shares` is empty and needs re-setting once you name the admins.

- **Every account was stamped with the city "Beirut"** — from the column default
  and from the guest bootstrap. Nobody supplied it; no device reported it.
  Unknown is now null.
- **A new coach package pre-filled 10 sessions at $380** and could be published
  unchanged. The draft starts empty.
- **Admin approvals showed fabricated demand** — Padel from "214 users", Salsa
  from "89", a Chess community with "640 members" — while real requests piled up
  unread. It now reads the real table.
- **Missing Supabase config silently pointed the client at `http://localhost`.**
  It now fails loudly, naming both variables and `DEPLOY.md`.
- **A release build would have shipped pointing at localhost**: the EAS profiles
  declared no `environment`, so the config never reached a cloud build.

API surface: every `supabase.from(...)` table and every RPC was checked against
the schema. One drift found (the approvals grant above) and fixed. The only
Edge Function invoked is `delete-account`, which is deployed — and whose source
was running in production with only a README committed until this pass.

## 5. Honesty pass — claims the app could not keep

Roughly a dozen, each either made true or removed:

- booking notifications did not exist, while three screens promised them — a
  trigger now notifies both parties
- a document "upload" that toggled a hardcoded filename and announced it as
  attached
- "Approved — onboarding sent", where nothing opened a deal or messaged anyone
- "Already paid for" on a pack whose counter increments at booking
- "60 min" as a session length no package supplies
- ratings "shown on their public profile", with no surface showing them
- blocked text "sent for review" that never leaves the form
- moderation advertising bans it never applies
- promo codes implying money comes off a price
- the community official-entity form, whose application died on restart —
  the link is gone; creating a community is real and persists

## 6. Corrections to worker output

Worth recording, because both would have shipped a new defect:

- codex rewrote the onboarding radius copy to say it "does not currently narrow
  results". It does — both Discover and the map apply
  `distanceKm <= searchRadius`; only unknown-distance profiles pass through.
  That would have replaced one false claim with another.
- I emitted `booking_confirmed` under a `kind` prop, which the analytics guard
  restricts to event types, so the values would have been silently stripped.
  Corrected to `booking_type`.

Rejected from the design delta, each reversing a decision already made: the ad
cards (no ad backend — fabricated content), User/Coach/Admin role pills (role is
server-derived), the Calendar sync row (no integration), "Confirm and pay"
(no payment), and dropping to two SSO buttons (Apple and Microsoft are store
requirements).

## 7. Runtime fixes

- **A crash I introduced**: `BookingOverlay` had its missing-coach early return
  above the usage hooks, so a people-list refresh mid-booking changed the hook
  count and React threw, taking the app to the error screen. Fixed and the other
  overlays scanned for the same shape.
- Account deletion could run twice concurrently against a non-atomic server
  path. Guarded.
- "Happening soon" opened events with a Back target that led to a
  missing-subject screen or an unrelated community.
- An unhandled promise rejection on the map.
- Community membership was never restored from the server — a returning member,
  or a community *owner*, was told they had joined nothing.
- "Happening soon" showed the *oldest* events in the database.
- A session whose account no longer exists wedged the app permanently; it now
  recovers with one clean retry. Reachable in production, because deleting an
  account removes the auth user.

## 8. Analytics

A seam, not a vendor integration — no SDK, no dependency, nothing transmitted.

- 32 typed events, 52 call sites across 16 files.
- Collection starts at launch (`track('app_open')` as `App.tsx` loads).
- Per-launch anonymous UUID; `identify` uses `public.users.id`, never an email.
- Buffer caps at 300 and drops the oldest, so it cannot grow unbounded.
- **Privacy enforced in code**: props pass an allowlist; keys matching
  email/phone/name/message/body/text/query/lat/lng/address/title/content/bio/
  search are rejected, strings are restricted to fixed vocabularies, and errors
  carry a code or standard error type — never a raw message that could embed
  what a user typed.
- Attach a provider later with `setSink`; buffered events flush to it then.

`PRIVACY.md` and `SUBMISSION.md` §4 describe both states, and say exactly what
must change before a provider is connected.

## 9. Verification

- `db/tests/release_invariants.sql` — **13 invariant groups, all passing against
  the live database.** It seeds its own fixture and always ends by raising, so it
  discards everything it wrote.
- `expo-app/tests/analytics.test.cjs` — 6 passing.
- `expo-app/tests/sport-requests.test.cjs` — 5 passing.
- `expo-app/scripts/check-community.cjs` — passing.
- `tsc --noEmit` clean.
- All four modules walked in a browser at 375×812 and desktop, no console errors.
- All four SSO providers probed against the live project.

---

## 10. What is NOT done

**SSO is not enabled.** All four providers are implemented, render, and probe
before redirecting so a disabled one fails with a clear message. Measured
against your live project, all four return
`400 provider is not enabled`. Enabling them means registering OAuth apps inside
your own Google, Facebook, Microsoft and Apple developer accounts and pasting
the client secrets those issue — account access and credential handling I do not
do on your behalf. `SUBMISSION.md` §1 has the exact redirect URI, bundle id,
per-provider steps and a one-line curl to confirm each one flips to `302`.

**The APK is a debug-variant build, and that is not a shortcut.** Two separate
reasons:

1. `android/app/build.gradle` signs the *release* variant with the debug key, so
   even a release APK from this tree could not be uploaded to Play.
2. The release variant cannot finish compiling on this machine at all. The C++
   codegen step composes object paths from the full source path, and under this
   project directory that exceeds the Windows 260-character limit:
   `ninja: error: Stat(...RNCSafeAreaViewShadowNode.cpp.o): Filename longer than
   260 characters`. Raising that limit is a system-wide setting I do not change.

This is why `plugins/withBookdAndroid.js` sets `debuggableVariants = []` — it
makes the debug variant embed the JS bundle, so the APK is standalone and runs
without a Metro server. It is the right artifact for installing and testing this
build; it is not the artifact you submit.

A store-ready AAB comes from `eas build --profile production --platform android`,
which builds on EAS Linux workers (no path limit) with your own release keystore
— yours to generate and keep permanently, and which I deliberately did not
create for you.

**Decisions only you can make:**

1. **No cancellation or no-show policy exists.** Cancelling a package session
   neither returns the session nor adjusts what was recorded, and nothing is
   disclosed to the user.
2. ~~The COACH role is free and permanent.~~ **Resolved 17 September 2026:** the
   owner confirmed the base service is free for coaches and members alike. This
   is the intended model, and sign-up now says "Free for coaches and members".
3. **`admin_shares` is empty** — nothing computes an admin revenue share.
4. **Community News/Gallery**: the design draws them; only events have a
   backend.
5. **Revenue is recorded but never collected.** Commission is written on every
   booking, and nothing reconciles it against what a coach actually owes.

**Also outstanding:** no crash reporter, no support URL, privacy policy needs its
three placeholders and legal review, promos are recorded but not redeemable, and
moderation records decisions without enforcing them — the last two now say so.

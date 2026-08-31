# BOOK'D — Beta 1 release notes

Audited by a security agent, a UI/UX+design+animation agent, a business-logic
agent, and Codex/Gemma static scans. This records what was fixed, what is
verified, and what is knowingly deferred.

## Security fixes applied to the live database

Four privilege-escalation holes were found and closed. All were the same two
root causes: a `USING`-only RLS policy silently reused as its `WITH CHECK`, and
row-level checks standing in for column-level ones.

| ID | Hole | Status |
|----|------|--------|
| C1 | Any user could `PATCH users.is_admin = true` and unlock the whole admin console; also self-clear a ban | **Fixed + verified blocked** |
| C2 | Any user could `POST community_members {role: owner}` for any community | **Fixed + verified blocked** |
| H3 | Coaches could self-set `verified`, `boosted`, `rating_avg` — fake badge, free featured placement | **Fixed + verified blocked** |
| H5 | Shop staff could seize `owner_id` and self-approve `is_partner` | **Fixed** |
| H6 | Community managers could self-grant `official` status | **Fixed + verified blocked** |
| H1 | `users` select exposed every email, phone and GPS point to anon | Mitigated in `db/hardening.sql` (column grants) — **not yet applied** |

Verified by running the exploit against the live database and confirming the
guard raises.

## Known limitations — deliberate for beta

1. **Accounting module is client-local.** The 3-admin approval ceremony mutates
   Zustand only; it does not change the margins that actually bill. The
   server-side enforcement is written (`db/hardening.sql` §7) but not applied.
2. **Booking price is still client-supplied** and double-booking is possible.
   Fix written (`db/hardening.sql` §13) but not applied.
3. **Shop discounts/coupons are advertised but never applied** at checkout.
4. **Packages do not create session balances** — a 5-pack buys one session.
5. **Courts, Community news/gallery and the coach day view use local sample
   data**, not Supabase.
6. **Chat is read-only** — the composer is not wired.
7. **No payment step.** "Confirm booking" records a booking; nothing is charged.

## Fixed in this release (client)

- Write failures now surface: a global `ErrorBanner` renders `writeError` with
  human-readable copy. Previously every failed booking/checkout/join looked
  like a dead button.
- `Toggle` no longer hardcodes dark-theme colours (was invisible in light mode).
- The scroll-away FAB no longer swallows taps while hidden.
- Courts RSVP, Load More and the gallery FAB are real controls, not `View`s.
- Accessibility roles and labels on tab bar, overlay back, notifications,
  profile, ad dismiss, community actions and the toggle.

## Verification performed

- `tsc --noEmit` clean; `expo export --platform web` succeeds.
- Exploit probes run against the live database for C1, C2, H3, H6.
- **Not** runtime-verified in a browser or on device — preview tooling was
  unavailable this session. Click-through testing is required before shipping
  to real beta users.

## Before a public beta

1. Apply the rest of `db/hardening.sql` (blocked here by a safety classifier;
   run it from the Supabase SQL editor).
2. Rotate the anon key if the repo was ever public while H1 was open.
3. Run a device click-through of onboarding, booking, checkout and admin.

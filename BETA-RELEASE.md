# BOOK'D first-release status

Updated **2026-09-15**. This is a progress and verification record, not a
launch-ready declaration. Release one covers **Discover, Maps, Community, and
Chat**, with profile available from the header. **Courts and Shop are second
release.** The updated SVG board is the visual reference; prototype people,
posts, reviews, statistics, and advertisements are not production content.

## Implemented on the release branch

- Onboarding, Discover/Maps, Community, Chat, and Profile follow the updated
  board's structure and shared visual tokens. Onboarding carries search into
  Discover; choosing Coach/Teacher expresses intent without granting a role.
  The drifting onboarding gradient and blinking/pulsing own-location marker
  use React Native animation. The map marker honors reduced-motion preference.
- Browse lists and missing-profile lookups no longer substitute sample entities
  when data is empty, unavailable, or stale. Accounting's fabricated revenue,
  admin names, expenses, and history start empty/zero.
- Training partners are read from the existing `partner_profiles` table.
  Discovery and Maps share loading/retry state; failures keep successful reads.
  A person with both profile types opens the selected coach/partner version.
  Public profile publication and editing remain incomplete.
- Public profiles omit fake verification, gallery pictures, unknown statistics,
  and buttons that opened the viewer's coach settings. Real descriptions,
  packages, booking, messaging, and supplied coach statistics remain.
- Anonymous sessions use `Guest`; the legacy-named `bootstrap_demo_session`
  preserves existing names and grants no demo community membership.
- New communities have a blank description, one real owner, and no automatic
  official status. Community news/gallery display unavailable states.
- Chat uses `start_conversation` to open/reuse a one-to-one thread; it can read,
  send, and mark messages read. The recursive chat RLS policy was replaced by
  a membership helper in the 2026-09-14 migration.
- Coach appointment requests, package balances, schedule, packages, day view,
  reviews, and admin promotions/loyalty tools use their real tables. These are
  separate from the still-local accounting screen. Role-gated profile links
  retain the real admin promotions and loyalty tools.
- Web deployment now uses Node 22 and typechecks before exporting.

Review of onboarding, home, map, and event-action screenshots confirmed the
board's overall structure and behavior. Minor icon-glyph and inactive Partners
color differences remain; complete visual parity is not claimed. Integrated
test evidence and remaining checks are recorded below.

## Live database and authentication: verified 2026-09-15

| Check | Result |
|---|---|
| Read-only content inventory | Before/after counts identical: 55 content tables empty |
| Accounts/configuration retained | 2 app accounts, 2 notification preferences, 12 sports, 3 platform margins |
| Data deletion in this run | None; the inventory was already clean |
| Guest/community defaults regression check | Passed; all test writes rolled back |
| New community description | Blank default applied live |
| Supabase provider flags | Apple, Facebook, Google, Azure disabled; email enabled |
| Public coach-map coordinates | No public location model; private user GPS remains protected |

These counts describe the inventory at verification time. New anonymous visits
can create additional accounts.

Repeat the checks from the repository root:

```bash
supabase db query --linked --file db/release_inventory.sql -o json
supabase db query --linked --file db/check_release_defaults.sql
```

`release_inventory.sql` returns counts, not account details. The defaults check
uses one existing account and rolls back its profile/community test writes.
See [db/README.md](db/README.md) for details and the migration path.

Automatic seeding is disabled in `supabase/config.toml`. `db/seed.sql` and the
prototype venue inserts require `SET bookd.demo_seed = 'on'` in the same
connection. That opt-in is for disposable development databases only.

## Verification of the integrated changes

| Check | Status |
|---|---|
| TypeScript (`npx tsc --noEmit`) | Passed on the final production changes |
| Web export (`npm run build:web`) | Passed; bundle `index-f80f894e07700a754f084410f8b565a1.js` |
| Mocked browser regression | Passed; coverage below |
| SVG comparison | Onboarding/home/map/event-action screenshots reviewed; complete visual parity not claimed |
| Android/iOS runtime and native build | Not verified for these changes |
| Email signup/login and authenticated writes | Not verified end to end for these changes |
| Two-user chat, community roles, booking/package redemption | Not re-verified for these changes |

The browser check passed for guest onboarding, carried-over search, Coach/Teacher
intent without privilege changes, mixed and same-user coach/partner profiles,
map-first loading, retry after a partial 503, and no private GPS queries. It
also checked four tabs, empty Community/Chat, dark/light layouts and a 360-pixel
viewport, own-marker blink/pulse and reduced motion, the event action hiding
and returning on scroll, and absence of invented profile/news/gallery content.
No browser page exceptions occurred. API responses were mocked throughout.
Marker movement/stillness was observed; its 1.6-second blink and 2-second pulse
periods were checked in source, not frame-timed. Radius exclusion with real
public coordinates was not exercised. Runtime coverage is Chromium web at
390/360-pixel widths, not Android/iOS.

### Repeat the browser check

Install Python Playwright/Chromium (`python -m pip install playwright`, then
`python -m playwright install chromium`). With the exported app served at the
preview URL, run from the repository root:

```bash
python expo-app/scripts/check-discovery.py http://127.0.0.1:4173/book-a-sesh-app/ .artifacts/launch-2026-09-15
```

Keep the configured `/book-a-sesh-app/` base path. The screenshot-directory
argument is optional. This is a standalone browser check with mocked Supabase
responses: guest auth and fixture profiles are never written to the live
backend. It covers onboarding/search, role boundaries, coach/partner profile
resolution, loading/retry, four tabs, empty states, both themes, animation,
reduced motion, the scroll-aware event action, horizontal overflow, and browser
exceptions. It does not test real provider
credentials, email delivery, database writes, or native runtime behavior.

An earlier Android emulator run recorded a court RSVP with server-calculated
`total_cents = 5200` and `commission_cents = 624` (commit `c38c211`). That is
historical evidence for the deferred Courts flow, not verification of the
current first-release build or a payment integration.

## Next-phase checklist

- [ ] **Approve real app-icon/splash artwork.** The old `BOOKD-logo.svg` was an
   entire UI board mislabeled as a logo, and is not a logo source. Current
   image assets include generic Expo artwork; no replacement brand was invented.
- [ ] **Finish visual detail review.** Resolve the remaining icon-glyph and
   inactive Partners color differences against the approved SVG artwork.
- [ ] **Finish public profile publication/editing and map locations.** Reading an
   empty partners table alone does not let users publish a discoverable profile.
   Coach pins need an intentionally public location model, separate from
   private account GPS.
- [ ] **Configure the requested SSO providers.** Client flows exist, but enabling
   them needs provider credentials and validated web/native redirects.
- [ ] **Validate email auth and authenticated flows.** Exercise signup, email
   confirmation, login/logout, two-user chat, community role boundaries, and
   booking/package redemption against the real backend.
- [ ] **Build and validate native apps.** Compare all onboarding steps, four
   tabs, and profiles with the SVG board on Android/iOS, including permissions,
   keyboard behavior, safe areas, reduced motion, and auth callbacks.
- [ ] **Resolve community media scope.** Implement news/gallery publishing or
   explicitly defer those unavailable sections for launch.

## Unsupported or deferred behavior

- There is no payment collection. Booking totals are recorded by the server;
  this does not charge a card. Package redemption has a migration but needs
  current end-to-end validation.
- Accounting still changes local state; removing invented figures did not
  connect it to the real ledger or server approval workflow.
- Community news/gallery publishing has no backend. Empty sections do not
  imply those features are complete.
- Courts/Shop are outside first-release navigation. Shop discounts, coupons,
  and saved promotions are not redeemed at checkout.

## Earlier security audit

Previous live exploit probes recorded blocked self-promotion to platform admin,
community-owner injection, coach verification/boost/rating edits, and community
official-status edits; shop-owner/partner-status guards were also added. Those
historical results do not replace a fresh security regression check. The schema,
column grants, RLS policies, and dated fixes live in `db/hardening.sql` and
`db/migrations/`; review the live state before applying SQL again.

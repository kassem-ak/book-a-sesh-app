# BOOK'D

Find sports coaches and training partners, join communities, and message people
nearby. BOOK'D is an Expo app for Android, iOS, and web, initially focused on
Beirut, Lebanon.

**Status: pre-release, launch work in progress (2026-09-15).** The first release
has four tabs: **Discover, Maps, Community, Chat**. Courts and Shop are deferred
to the second release. See [BETA-RELEASE.md](BETA-RELEASE.md) for verified work,
remaining launch gaps, and testing status.

## Stack

| Layer | What |
|---|---|
| App | Expo SDK 57 / React Native 0.86 / React 19, TypeScript |
| State | Zustand (`expo-app/src/state/store.ts`) |
| Backend | Supabase: Postgres, RLS, Auth (`db/`) |
| Web deploy | Expo web export to GitHub Pages (`.github/workflows/deploy-web.yml`) |
| Native builds | EAS Build (`expo-app/eas.json`) |

App identity: `BOOK'D`, slug `bookd`, bundle id / package `com.bookd.app`.

## Run it

Use Node.js 22.13 or newer on the Node 22 line; CI uses Node 22.

```bash
cd expo-app
npm ci
cp .env.example .env     # fill in EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY
npm start                # Expo dev server; press a / i / w
```

```bash
npm run web              # web dev server
npm run android          # local native Android build + run
npm run ios              # local native iOS build + run
npx tsc --noEmit         # typecheck
npm run build:web        # static export to expo-app/dist
```

Without Supabase credentials the client starts but cannot load real data.
Empty lists and failed reads do not fall back to fabricated profiles or content.
See [expo-app/DEPLOY.md](expo-app/DEPLOY.md) for deployment settings.

For the standalone browser check, install Python Playwright and Chromium once:

```bash
python -m pip install playwright
python -m playwright install chromium
```

With the web export served at the preview URL below, run from the repository
root. Keep `/book-a-sesh-app/`, which is the configured web base path:

```bash
python expo-app/scripts/check-discovery.py http://127.0.0.1:4173/book-a-sesh-app/
```

The check mocks Supabase responses and writes no live data. An optional second
argument selects a screenshot directory. It checks guest onboarding, four-tab
navigation, discovery loading/retry, coach/partner profiles, empty states,
dark/light layouts, animation/reduced motion, and the scroll-aware event action.
It does not validate real sign-in or writes.

## Where the code lives

| Path | Purpose |
|---|---|
| `expo-app/src/screens/` | Tabs, onboarding, profile |
| `expo-app/src/overlays/` | Auth, booking, community, chat, coach/admin tools |
| `expo-app/src/navigation/` | Root, tab bar, overlay and sheet routers |
| `expo-app/src/state/` | Store, models, static taxonomy/calendar options |
| `expo-app/src/lib/` | Supabase reads/writes, session, bookings, chat, location |
| `expo-app/src/theme/` | Shared colors and typography |
| `db/` | Schema, grants, RLS, migrations, release checks |
| `design/handoff-v2/` | Design board and older interactive prototype |

Profile opens from the header person icon. Store state routes overlays and
bottom sheets. The updated `design/handoff-v2/assets/design-board.svg`, copied
from `D:\BOOK'D SVG.svg`, takes precedence where the older prototype differs.

## This release pass

Onboarding and the four launch tabs now follow the updated board's structure,
colors, and motion. Discovery reads both coach and partner profiles, shares
loading/retry state with Maps, and preserves the selected profile type when
one person has both roles. Unsupported locations and content show empty states.

Public profiles no longer claim verification, invent gallery images, or open
the viewer's coach settings. Available descriptions, packages, messaging, and
booking actions remain. Coach/admin tools are shown by the server-provided
account role; real admin promotions and loyalty tools remain accessible.

The final TypeScript check, web export, and mocked browser check passed. The
browser run covered both themes, mobile widths, loading/retry, profile type,
and animation without page exceptions. Real email auth and native builds remain
unverified for this pass; see the release record for the full limits.

## Database and release data

The independent 2026-09-15 live inventories before and after the defaults check
matched: **55 empty content tables**,
2 app accounts, 2 notification preferences, 12 sports, and 3 platform margins.
No rows were deleted in that verification; accounts and reference/configuration
rows were preserved. Subsequent visits can create anonymous accounts.

Automatic seeding is disabled. Demo fixtures require an explicit development
opt-in. [db/README.md](db/README.md) documents the read-only inventory and the
transactional check that rolls its test writes back. Anonymous bootstrap
preserves existing names and memberships; new communities start with a blank
description. Public reads use restricted columns and RLS; private user GPS
coordinates must stay private.

## Current gaps

- **SSO setup:** Apple, Facebook, Google, and Microsoft/Azure are disabled in
  live Supabase Auth; email is enabled. Provider credentials and callback
  configuration are still required for SSO.
- **Public profiles and maps:** training-partner reads use `partner_profiles`,
  but profile publication/editing is incomplete. No public coach-map location
  model exists, so maps cannot show real nearby coach pins yet.
- **Community media:** news and gallery show their unavailable state; there
  is no connected publishing backend for either.
- **Payments:** booking RPCs record server-priced bookings; no payment is
  collected. Package redemption exists but still needs current release testing.
- **Accounting:** invented seed figures/names are removed, but the accounting
  screen still uses local state and is not a connected financial ledger.
- **Deferred commerce:** Courts and Shop code remains in the tree. Coupons and
  promotions are not redeemed at checkout; second-release flows need validation.
- **Artwork and validation:** approved app-icon artwork is missing; current
  assets include generic Expo artwork. Current test evidence and the next-phase
  checklist are in [BETA-RELEASE.md](BETA-RELEASE.md#next-phase-checklist).

Chat can start or reuse a one-to-one thread through `start_conversation`, read
messages, send, and mark a thread read. Current release testing is tracked in
[BETA-RELEASE.md](BETA-RELEASE.md).

## Legacy Android app

The Kotlin `app/` directory is the original Spotter implementation, retained
for reference. It is superseded by `expo-app/`, carries the old branding, and
is outside the BOOK'D release and web CI.

## License

See [expo-app/LICENSE](expo-app/LICENSE).

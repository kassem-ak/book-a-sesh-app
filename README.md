# BOOK'D

Book coaches, courts, communities, and partner-store gear in one app.

BOOK'D is a cross-platform mobile app (Android, iOS, web) for finding sports
coaches and training partners nearby, booking sessions, joining communities and
events, and buying from partner stores. The product is set in Beirut, Lebanon
and uses a dark athletic visual system with a volt accent.

**Status: pre-release beta.** The app runs end to end against a live Supabase
backend, but it is not feature-complete and has not been through a public beta.
See [Known gaps](#known-gaps) before assuming any flow is production-ready, and
[`BETA-RELEASE.md`](BETA-RELEASE.md) for the full audit record.

## Stack

| Layer | What |
|---|---|
| App | Expo SDK 57 / React Native 0.86 / React 19, TypeScript |
| State | Zustand (single store, `expo-app/src/state/store.ts`) |
| Backend | Supabase — Postgres + RLS + Auth (`db/`) |
| Web deploy | Expo web export → GitHub Pages (`.github/workflows/deploy-web.yml`) |
| Native builds | EAS Build (`expo-app/eas.json`) |

App identity: `BOOK'D`, slug `bookd`, bundle id / package `com.bookd.app`.

## Run it

```bash
cd expo-app
npm install
cp .env.example .env     # fill in EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY
npm start                # Expo dev server; press a / i / w
```

Other entry points:

```bash
npm run web              # web dev server
npm run android          # local native Android build + run
npm run ios              # local native iOS build + run
npm run build:web        # static export to expo-app/dist
npx tsc --noEmit         # typecheck
```

Without Supabase credentials the client still starts (`isSupabaseConfigured` is
false) but no real data loads. Deployment options are in
[`expo-app/DEPLOY.md`](expo-app/DEPLOY.md).

## Where the code lives

```text
expo-app/
|-- App.tsx                  # root component
|-- app.json                 # Expo config: name, ids, plugins, web baseUrl
|-- src/
|   |-- navigation/          # Root, TabBar, OverlayRouter, SheetRouter
|   |-- screens/             # Discover, DiscoverMap, Maps, Community, Courts,
|   |                        # Shop, Chat, Profile, AuthLanding
|   |-- overlays/            # full-screen flows: booking, shop, community,
|   |                        # admin/accounting, auth, chat conversation
|   |-- components/          # Overlay, Sheet, ErrorBanner, ScrollAwareFab, ui
|   |-- state/               # store.ts (Zustand), models.ts, sampleData.ts
|   |-- lib/                 # supabase.ts, session.ts, queries.ts, bookings.ts,
|   |                        # chat.ts, notifications.ts, moderation.ts, geo.ts
|   |-- theme/               # colors, typography
db/                          # schema.sql, policies.sql, hardening.sql, migrations/
design/                      # BOOK'D design specs + handoff-v2 (current source of truth)
.github/workflows/           # web deploy, Supabase keep-alive cron
```

Navigation is a five-tab shell — **Discover, Maps, Courts, Community, Chat** —
with a full-screen overlay host and a bottom-sheet host layered above it.
Overlay and sheet ids are routed from the Zustand store rather than a navigation
library. Profile is reached from the header person icon rather than a tab, and
the Shop tab is deferred to a second release (`ShopScreen.tsx` and the shop
overlays are still in the tree but not reachable from the tab bar).

## Database

Postgres schema, RLS policies, and migrations live in [`db/`](db/README.md) —
~45 tables, money in integer cents, `uuid` PKs, PostGIS for distances. Row-level
security is the only access control; the anon key is publishable by design.

`db/hardening.sql` contains security fixes that are **written but not fully
applied** to the live database. See `BETA-RELEASE.md` for which ones landed.

## Known gaps

Accurate as of this branch. None of these are blockers for internal testing;
all of them are blockers for charging real money.

- **No payment step.** "Confirm booking" records a booking; nothing is charged.
- **Booking price is client-supplied** and double-booking is not prevented
  server-side. Fix written in `db/hardening.sql` §13, not applied.
- **Google/Apple SSO is wired in the client but the providers are not enabled
  server-side**, so those buttons do not complete a sign-in yet.
- **Accounting module is client-local.** The 3-admin approval ceremony mutates
  Zustand only; it does not change margins that bill.
- **Shop discounts and coupons are advertised but not applied** at checkout.
- **Packages do not create session balances** — a 5-pack buys one session.
- **Some surfaces still read local sample data** rather than Supabase; those
  fallbacks are being removed incrementally.
- **No automated tests.** Verification so far is `tsc --noEmit`, a successful
  web export, and manual device click-through.

## Legacy: the Kotlin `app/` directory

`app/` is a native Android/Kotlin Compose implementation — the original v1 of
this product, built when it was named *Spotter*. It is **superseded** by
`expo-app/` and is no longer developed:

- Last commit touching `app/` was 2026-07-20 (`22abd14`, "Kotlin app v1.0.0
  release prep"); `expo-app/` has been the only app under development since.
- The Expo app began as a port of it (`74dc800`, 2026-07-09, "Add Expo (React
  Native) port"), so the screen set and overlay structure deliberately mirror it.
- It still carries the old branding throughout — package `com.spotter.app`,
  `SpotterViewModel`, `rootProject.name = "Spotter"` in `settings.gradle.kts`.
  That branding has **not** been migrated, because the directory is not shipping.

It is kept in the tree for reference only. It is not built by CI, not deployed,
and not part of the BOOK'D release. If you are looking for the shipping app,
it is `expo-app/`.

The original Spotter HTML design handoff it was built from is in
`extracted/design_handoff_spotter_app/`; the current BOOK'D design source of
truth is `design/handoff-v2/`.

The Gradle build is still configured at the repo root (`./gradlew assembleDebug`,
JDK 17, AGP 8.7.3, Kotlin 2.0.21, compileSdk 36, minSdk 26). It last built
successfully at the v1.0.0 tag; it has not been rebuilt since and is not
verified against the current tree.

## License

See [`expo-app/LICENSE`](expo-app/LICENSE).

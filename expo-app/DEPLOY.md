# Deploy BOOK'D web (partner-reachable URL)

The web build is a static single-page app in `dist/` (rebuild any time with
`npm run build:web`). Host it anywhere static. Pick one:

## Option A — GitHub Pages (automated, no login, permanent) ← default

A workflow at `.github/workflows/deploy-web.yml` builds and publishes the web
app automatically. **Public URL: https://www.app-bookd.com/**

One-time setup: in the repo, **Settings → Pages → Build and deployment →
Source = GitHub Actions** (the workflow also tries to enable this for you).
Then:

- It deploys automatically on every push to `main` that touches `expo-app/`.
- Or trigger it now: **Actions → "Deploy BOOK'D web" → Run workflow**.

The site is served from the **domain root**, so `experiments.baseUrl` in
`app.json` is `/`. That is tied to the custom domain: a Pages project site
without one lives at `/<repo-name>/`, and the two settings have to agree or
every asset 404s. The workflow writes `dist/CNAME` before uploading the
artifact, because Pages reads the custom domain from the published artifact and
a deploy without it can clear the setting.

DNS: `www.app-bookd.com` is a CNAME to `kassem-ak.github.io` (GoDaddy). The apex
`app-bookd.com` is not served by Pages and still resolves to GoDaddy parking;
pointing it here would need four A records instead, or a forward to `www`.

Requires a public repo (or GitHub Pro for private Pages).

## Google Maps key (native builds)

The map uses **Google Maps on iOS and Android** and the raster tile map on web.
`react-native-maps` has no web build, and Google's terms forbid rendering their
tiles in a non-Google renderer, so the two platforms genuinely use different
renderers -- see `src/components/MapCanvas.tsx` and `MapCanvas.native.tsx`.

The Maps SDKs for Android and iOS are **free with no monthly cap**. The web
tile map costs nothing either, so the map has no running cost.

The key is read at **build** time, not runtime: react-native-maps bakes it into
the native project (an Android manifest entry, an iOS AppDelegate call), so it
must be set when `expo prebuild` or the EAS build runs.

```bash
export GOOGLE_MAPS_API_KEY="your-key"
```

```bash
eas env:set --name GOOGLE_MAPS_API_KEY --value "your-key" --environment production
```

Create it in the same Google Cloud project as the OAuth client, enable **Maps
SDK for Android** and **Maps SDK for iOS**, and enable billing on the project
(Google requires a billing account even for the free-tier SDKs).

**Restrict the key before shipping.** A Maps key is extractable from any APK,
and an unrestricted one can be used by anyone and billed to you:

- Android: restrict to the package name `com.bookd.app` plus your signing SHA-1.
- iOS: restrict to the bundle id `com.bookd.app`.
- Restrict the API list to the two Maps SDKs above and nothing else.

Without the key the native build **falls back to the raster tile map**, which
works everywhere. Google is an upgrade, not a prerequisite. `app.config.js`
prints a build-time warning so the difference is not silent. Web is unaffected
either way.

The name is deliberately **not** prefixed `EXPO_PUBLIC_`: nothing in the JS
bundle needs the key. The config plugin puts it in the native project, and the
app only needs to know *whether* it was configured, which `app.config.js`
publishes as `extra.googleMapsConfigured` and the app reads with
`expo-constants`.

That indirection exists because the obvious approach failed silently. Metro
inlines `EXPO_PUBLIC_*` from whatever environment the bundler subprocess has,
and Gradle's embed step did not have it: the value became `undefined`, the map
fell back to raster tiles, and the build looked correct in every other respect.

Related trap: adding a **new** `EXPO_PUBLIC_*` variable needs `expo-app/.expo`
deleted, or the CLI keeps exporting its cached set and silently ignores it.
`expo export --clear` does not help -- that clears Metro's cache, not this one.

## Map tiles (optional)

The map defaults to CARTO's dark/light OpenStreetMap basemaps, which need no
key. Both CARTO and OSM serve these freely but intend it for modest use; a
product at volume is expected to hold an account. Point the map at any XYZ
provider by setting these, with the key already in the URL:

```bash
EXPO_PUBLIC_MAP_TILES_DARK="https://api.maptiler.com/maps/streets-v2-dark/{z}/{x}/{y}.png?key=YOUR_KEY"
```

```bash
EXPO_PUBLIC_MAP_TILES_LIGHT="https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=YOUR_KEY"
```

```bash
EXPO_PUBLIC_MAP_ATTRIBUTION="© MapTiler © OpenStreetMap contributors"
```

Set the same three as GitHub repo variables so the deployed web build picks them
up, next to the Supabase ones. Each is independent: setting only the dark URL
leaves light on the default.

**These are baked into the published bundle and readable by anyone who opens
it.** That is unavoidable for a client-side map, which is why providers expect
such keys to be restricted by HTTP referrer in their dashboard. Restrict yours
to `www.app-bookd.com` or it can be used on any site, at your expense.
Attribution is a licence condition for every provider, so set it to match
whichever you choose.

## Option B — EAS Hosting (Expo-native, free tier, needs Expo login)

```bash
cd expo-app
npm run build:web                 # exports dist/
npx eas-cli@latest login          # your Expo account (free) — one time only
npx eas-cli@latest deploy --prod  # uploads dist/, prints https://<name>.expo.app
```

The `--prod` URL is stable and shareable with partners. Re-run the last two
lines to publish updates.

## Option C — Netlify Drop (instant, no account, temporary)

1. Run `npm run build:web`.
2. Open <https://app.netlify.com/drop> in a browser.
3. Drag the `expo-app/dist` folder onto the page.
4. Copy the `*.netlify.app` URL it gives you.

Fast for a quick share; sign in to make it permanent + custom name.

## Option D — Vercel / Cloudflare Pages

Any static host works — point it at `dist/` as the publish directory, no build
command needed (build is already done). For Vercel: `npx vercel --prod` from
`expo-app/` after `npm run build:web` (output dir `dist`).

## Notes

- The web build reads Supabase config from EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY at build time. GitHub Pages gets these from repo variables/secrets.
- Native builds (real iOS/Android apps) use `npx eas-cli build -p android|ios`.

## Native store builds (EAS)

The build profiles in `eas.json` declare `"environment"`, so EAS injects the
Supabase config from variables stored on EAS rather than from `.env` (which is
gitignored and never reaches a cloud build). Set them once per environment:

```bash
eas env:set --name EXPO_PUBLIC_SUPABASE_URL --value "https://<project>.supabase.co" --environment production --visibility plaintext
```

```bash
eas env:set --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon key>" --environment production --visibility plaintext
```

Repeat with `--environment preview` for internal builds. Plain-text visibility is
correct here: both values are embedded in the client anyway, and RLS — not
secrecy — is what enforces access.

Without these, the app shows a configuration error naming both variables
and pointing to this guide before browsing or sign-in can start.

Then:

```bash
eas build --profile production --platform android
```

Requires EAS CLI 14 or newer (`eas.json` pins `>= 14.0.0`); older CLIs ignore the
`environment` field and would produce a build showing the configuration error described above.

### Building the APK locally

`android/local.properties` is gitignored and must exist, pointing at your
Android SDK. Use forward slashes — a Java properties file treats a single
backslash as an escape, so a Windows path written with `\` silently resolves to
nonsense and Gradle reports "SDK location not found":

```bash
echo 'sdk.dir=C:/Users/<you>/AppData/Local/Android/Sdk' > android/local.properties
```

```bash
cd android && ./gradlew assembleRelease
```

The APK lands at `android/app/build/outputs/apk/release/app-release.apk`.

Note that `android/app/build.gradle` signs the release variant with the DEBUG
key, so this artifact installs for testing but cannot be uploaded to Play. A
store-ready AAB comes from `eas build --profile production --platform android`
with your own release credentials.

Gradle's wrapper can exit 0 on a failed build here, so check the log for
`BUILD SUCCESSFUL` rather than trusting the exit code.

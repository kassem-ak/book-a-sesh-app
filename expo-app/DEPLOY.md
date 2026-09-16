# Deploy BOOK'D web (partner-reachable URL)

The web build is a static single-page app in `dist/` (rebuild any time with
`npm run build:web`). Host it anywhere static. Pick one:

## Option A — GitHub Pages (automated, no login, permanent) ← default

A workflow at `.github/workflows/deploy-web.yml` builds and publishes the web
app automatically. **Public URL: https://kassem-ak.github.io/book-a-sesh-app/**

One-time setup: in the repo, **Settings → Pages → Build and deployment →
Source = GitHub Actions** (the workflow also tries to enable this for you).
Then:

- It deploys automatically on every push to `main` that touches `expo-app/`.
- Or trigger it now: **Actions → "Deploy BOOK'D web" → Run workflow**.

The site is served under the `/book-a-sesh-app/` path (set via
`experiments.baseUrl` in `app.json`) so the repo-name subpath resolves.
Requires a public repo (or GitHub Pro for private Pages).

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

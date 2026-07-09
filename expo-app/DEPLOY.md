# Deploy Spotter web (partner-reachable URL)

The web build is a static single-page app in `dist/` (rebuild any time with
`npm run build:web`). Host it anywhere static. Pick one:

## Option A — GitHub Pages (automated, no login, permanent) ← default

A workflow at `.github/workflows/deploy-web.yml` builds and publishes the web
app automatically. **Public URL: https://kassem-ak.github.io/book-a-sesh-app/**

One-time setup: in the repo, **Settings → Pages → Build and deployment →
Source = GitHub Actions** (the workflow also tries to enable this for you).
Then:

- It deploys automatically on every push to `main` that touches `expo-app/`.
- Or trigger it now: **Actions → "Deploy Spotter web" → Run workflow**.

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

- The app is a **demo**: all data is in-memory, resets on refresh. No backend.
- Native builds (real iOS/Android apps) use `npx eas-cli build -p android|ios`.

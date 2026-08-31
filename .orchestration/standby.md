# Standby brief — BOOK'D redesign

## Objective
Apply the artboard changes in `design/BOOKD-redesign-spec.md` to the Expo app
(`expo-app/`). That spec is authoritative; re-read it before acting.

## Constraints
- Do not redefine scope. Do not force-push. No destructive Git operations.
- Keep the volt `#C6F24E` design tokens and existing component library.
- Shop stays implemented but leaves the primary nav (SECOND RELEASE).
- Supabase reads/writes already exist; do not rewrite the data layer.

## Project
- Root: `C:\Users\kasse\Documents\Claued proj\Book-a-sesh` (git repo)
- App: `expo-app/` — Expo SDK 57, RN 0.86, TypeScript, Zustand store
- Verify with: `cd expo-app && npx tsc --noEmit && npx expo export --platform web`

## Phases (execution order)
1. **Nav restructure** — tabs become Discover · Maps · Courts · Community · Chat;
   Profile moves to a top-right person icon; Shop removed from nav.
2. **Onboarding** — 3-step Get Started / Are you? / Where are we looking?,
   replacing the current single-screen landing gate.
3. **Discover + Maps** — Maps promoted to its own tab; blinking user marker.
4. **Courts** — new tab: venue profile, Courts/Events/Gallery tabs, ALL Courts view.
5. **Community** — My Communities entry, registration form, News/Events/Gallery profile.
6. **Calendar/booking** — month + day view, session-end confirmation, confirmed, overview.
7. **Profile** — restructured sections incl. My Communities; coach gallery/active hours/packages.

## Decisions already made
- Existing auth (email/password + Google/Apple SSO) is kept and folded into step 1
  of the new onboarding rather than rebuilt.
- Shared behaviours to implement once and reuse: scroll-aware FAB, story ring,
  volt field icon on focus, blinking map marker.

## State
- Branch at time of writing: see `git branch --show-current`.
- Phase 1 in progress by Claude.

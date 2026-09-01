# Standby brief — BOOK'D handoff v2

Objective: apply `design/handoff-v2` (BOOK'D) to the Expo app and fit the
business logic to it. Spec delta: `design/BOOKD-v2-delta.md`.

Root: C:\Users\kasse\Documents\Claued proj\Book-a-sesh
Branch: bookd-redesign-phase1 (PR #14, base main)

## File ownership this round (parallel agents)
- A design system: expo-app/src/theme/*, components/ui.tsx, components/Overlay.tsx, components/Sheet.tsx
- B courts+rsvp:  expo-app/src/screens/CourtsScreen.tsx, overlays/RsvpSheet.tsx, state/courtsData.ts
- C onboarding+chat+profile: screens/AuthLanding.tsx, screens/ChatScreen.tsx, screens/ProfileScreen.tsx
- D registration+community: overlays/RegistrationOverlay.tsx, screens/CommunityScreen.tsx, overlays/CommunityProfileOverlay.tsx
- Claude (integrator): state/store.ts, navigation/*, verification, commits

## Acceptance
- npx tsc --noEmit clean
- npx expo export --platform web succeeds
- No client-supplied money totals (RSVP total derived server-side)

## Done so far
Nav/onboarding/Courts/Community/Calendar from the SVG board; security hardening
(db/hardening.sql); Apple SSO removed per board (Facebook + Google only).

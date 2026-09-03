# Journal — BOOK'D redesign

## 2026-07-20 — Claude (no failover triggered)
- Extracted artboards from `D:\BOOK'D SVG.svg` (rendered via headless Chrome,
  cropped with Pillow) and wrote `design/BOOKD-redesign-spec.md`.
- Phase 1 implemented: nav restructure + onboarding + shared behaviours.
- Verified: `npx tsc --noEmit` clean, `npx expo export --platform web` succeeds.
- Not yet done: phases 3–7 (Discover polish, Courts data wiring, Community
  profiles, Calendar/booking rework, Profile/coach extras).

## 2026-07-20 — Claude, phase 2 (no failover triggered)
- Discover: removed the Cards/Map toggle now that Maps is a tab.
- Community: "My Communities" header icon + MyCommunitiesOverlay (managing vs
  following, role badges); CommunityRegisterOverlay (category, contact,
  official-entity YES/NO + document upload).
- Calendar: CoachDayViewOverlay (week strip, capacity chips, Mark as Done,
  session-end confirmation modal).
- Verified: tsc --noEmit clean, web export succeeds.

## 2026-07-20 — Claude, phase 3 (no failover triggered)
- Coach profile: gallery strip with "Add images", Active hours row linking to
  the schedule editor, and a "Create a new package" action — the three red
  annotations on the Coach profile artboard.
- Verified: tsc --noEmit clean, web export succeeds.

## 2026-09-01 — handoff v2, 4 parallel agents (no failover triggered)
- A design system: v2 tokens (card 20 / input 16 / avatar 17,58 / tracking 1.6 /
  light accent #5E7B10 / ph + scrim), new Sheet component, FAB motion 250ms/28px.
- B courts+rsvp: prototype venue data, venue top bar + story ring, RSVP sheet.
- C onboarding+chat+profile: progress dots, two-blob gradient on all steps,
  radius default 12, Session reminders card, TRAINING/SETTINGS groups.
- D registration+community: shared RegistrationOverlay (community|venue|shop),
  My Communities dot, community cover + federation pill.
- Integrator: sheet layer + SheetRouter, RSVP/registration/onboarding store
  fields, server-derived RSVP total, registration approvals queue, Field a11y
  label, cyan token, radius lifted into the store.
- Corrected my own delta spec against the prototype: light volt #B4E13A and
  light --ph 0.05 (spec had said otherwise).
- Verified: tsc --noEmit clean, expo export succeeds.

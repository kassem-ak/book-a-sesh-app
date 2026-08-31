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

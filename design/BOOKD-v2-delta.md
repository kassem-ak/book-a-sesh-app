# BOOK'D handoff v2 — delta against the current app

Source of truth: `design/handoff-v2/BOOKD App.dc.html` (markup on top, `Component`
class from line ~1337 holds state + data) and `design/handoff-v2/README.md`.

This file lists **only what differs** from what is already built, so parallel
work can be partitioned without re-reading the whole prototype.

---

## A. Design tokens that changed

| Token | Current | v2 |
| --- | --- | --- |
| Card radius | 18 | **20** |
| Input / filter row radius | 14 | **16** |
| Button radius | 15 | 15–16 (keep 15) |
| Avatar tile radius | 14 | **17** |
| Avatar sizes | 54 / 58 / 64 | **58** list · **64** store hero · **66** venue |
| Section heading tracking | 1.4 | **1.6** |
| Light accent | `#5E8A00` | **`#5E7B10`** |
| Placeholder fill | ad-hoc | **`--ph` = `rgba(255,255,255,.04)`** |
| Card padding | 14–15 | 15 |
| List gap | 11 | 12 |

Motion (board annotations, exact):
- **animated gradient** — two blurred radial blobs (volt + cyan) drifting on
  14 s / 18 s `ease-in-out infinite` loops.
- **blinking marker** — 1.6 s opacity+scale blink **plus** a 2 s expanding pulse ring.
- **scroll-aware FAB** — translateY 28px + fade, **250 ms**, direction-aware.
- **overlays** — slide up 14px + fade, 280 ms. Toggles/tabs 150–200 ms.

---

## B. New: `sheet` layer (separate from `overlay`)

The prototype has **two** presentation layers:
- `overlay` — full screen: `venue, rsvp, community, profile, coach, booking, booked, bookings, coachDay, thread, notifs, shop, store, reg`
- `sheet` — bottom sheet: `story, hours, pkg, myComm, admin`

A sheet slides up from the bottom over a scrim, does not fill the screen, and
dismisses on scrim tap. Overlays remain full-screen.

---

## C. New: RSVP sheet (Courts)

Opened from a court or event card's `RSVP` button. Fields:
- **Booking type** — `Single` | `Teams` | `Member of team`
- **Number of hours** — stepper, min 1
- **Equipment rent** — toggle, **+$6/h**
- **Add a coach** — toggle, **+$45** flat (routes into the coach calendar)
- **Live total** = `courtPricePerHour × hours + (gear ? 6 × hours : 0) + (coach ? 45 : 0)`
- Confirm button

Court prices come from the venue data: `$40/h` court A, `$20/h` court B, etc.
Parse the integer out of the price string for the maths.

---

## D. Screen-level deltas

### Discover
- Header icon buttons are **46px rounded squares** (notifications + profile).
- "Chosen Sport" label + sport icon row sits **on the left**, the
  `coaches | Partners` segmented control **on the right**, same row.
- Search field is **live** (`discSearch` filters name + sport).
- Sort chips: rating / price / distance.
- BOOSTED pill renders **inline after the name**, not as a separate column.
- Card meta format: `"Sport - distance"` with distance as `600 m` / `1.2 km`.
- Partners show **level** where coaches show price, with sub-label `level` vs `per session`.

### Maps
- Chip row: `GYM'S · BOXING · FOOTBALL · PADDLE · RUNNING`.
- Docked card titled **"Nearest boosted coach"**.

### Courts
- Venue card meta: `"City · Sport"` plus distance **and open state**.
- Venue profile top bar: back · "Courts" · **gallery icon** · **+**.
- Venue avatar has a story ring **and an "Add story" affordance** → `sheet: 'story'`.
- Tabs are **divided** (border between).

### Community
- **My Communities** icon shows a **dot** when the user has crews.
- Community profile: **cover photo**, verified check, avatar card with
  name + edit, `OFFICIAL FEDERATION` pill, member count, `"Sports, Running"`
  tag line, Bio.
- Sample naming is federation-style: `Lebanese Running Federation`.

### Chat
- List gains a **"Session reminders"** card with an **"Open booking"** action.
- Composer: `Message <first name>` with a **round + button**.

### Profile
Restructure into two labelled groups:
- **TRAINING** — My bookings (badge count), My communities, Notifications,
  Calendar sync (`Google · sessions auto pushed`, On).
- **SETTINGS** — Appearance (dark/light), Shop, Admin console (admins only),
  **My day view (coaches only)**, Sign out.
- Role pills `User | Coach | Admin` stay as the demo switch.

### Onboarding
- Step 1 has **email + "Search Coach, Mentor"** field, then NEXT, then
  Facebook / Google.
- **Progress dots** at the bottom of all three steps.
- Default radius is **12 km**.
- Animated gradient behind **all three** steps (currently only step 1).

### Registration (community · venue · shop) — ONE shared form
`regKind` = `community | venue | shop`. Fields: name, category dropdown, phone,
email, **preferred contact channel** (Phone call / WhatsApp / Email / In-app chat),
**best time to contact**, official-entity YES/NO, document upload,
`Send request to admins` → confirmation. Every submission is an admin approval item.

---

## E. Business logic to fit

- Court RSVP must persist: booking type, hours, equipment, optional coach, and the
  computed total. Reuse the existing `bookings` money path — do **not** trust a
  client-supplied total; derive it server-side from the court price.
- "Add a coach" on an RSVP routes into the coach calendar flow.
- Registrations of all three kinds land in the **admin approvals queue**.
- Shop stays reachable from Profile → Shop and the sponsored card (not in nav).

---

## F. Still to port from v1 (`legacy/Spotter (v1 app).dc.html`)

Admin console screens, restyled into BOOK'D: approvals queue, misconduct reports,
promotions, loyalty, and the Accounting module (P&L, expenses with recurrence,
margins, profit shares, **3-admin approval**, instant notification, History).
Behaviour spec in the v2 README is authoritative; the DB already enforces the
3-admin rule (`db/hardening.sql`).

# BOOK’D — developer handoff

BOOK’D is a mobile app for finding sports coaches and training partners nearby, booking courts and venues, joining sport communities, and buying from partner sports/hobby shops in-app. Prototype market: **Lebanon (Beirut)**.

## What's in this folder

| File | What it is |
| --- | --- |
| `BOOKD App.dc.html` | **The design source of truth.** Full interactive prototype — one file: markup on top, a `Component` logic class near the bottom holding all state, data and handlers. |
| `BOOKD App (standalone).html` | Self-contained build. Open in any browser (phone or desktop) to click through the app. |
| `assets/design-board.svg` | The client's original design board (all screens + annotations, vector). |
| `assets/design-board-overview.png` | Readable wireframe render of that board — use it as the screen index. |
| `assets/BOOKD-logo.svg` | Client brand artwork (multi-panel board; extract the lockup from it). |
| `android-frame.jsx`, `support.js` | Prototype runtime only (device bezel + template engine). **Not** part of the product. |
| `legacy/Spotter (v1 app).dc.html` | Earlier version. Contains the **Shop admin + Accounting module** screens that are not yet ported into the new app (see "Not yet in the new app"). |

## About the design files

These are **design references written in HTML** — interactive specs of look and behaviour, not production code. Recreate them in the target stack (Flutter / React Native / Kotlin / SwiftUI) using its own patterns. Read the `Component` class for exact data shapes and state transitions; lift the literal values (hex, px, copy) from the markup.

**Fidelity: high.** Colours, type, spacing, radii, copy and interactions are final intent. All imagery is placeholder (flat blocks with a monospace caption naming the shot) — swap in real photography.

---

## Design tokens

### Colour — dark theme (default)
| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#0D0E11` | page |
| `--nav` | `#101216` | bottom nav, floating chips |
| `--surface` | `#16181D` | cards, inputs |
| `--surface2` | `#1C1F26` | raised/inset pills, toggles |
| `--line` / `--line2` | `rgba(255,255,255,.07)` / `.05` | borders, dividers |
| `--txt` / `--strong` / `--soft` | `#F2F3F5` / `#E7E9EC` / `#C5CAD2` | text ladder |
| `--txt2` / `--txt3` | `#9BA1AC` / `#6B7280` | secondary / tertiary |
| `--volt` (accent) | **`#C6F24E`** | primary buttons (ink text `#0D0E11`), active states, prices, links |
| `--amber` | `#F2C84B` | ratings ★, BOOSTED |
| danger | `#E8543F` | destructive |
| `--ph` | `rgba(255,255,255,.04)` | image placeholders |

Light theme exists (Profile → Appearance): bg `#F4F5F7`, surfaces `#FFFFFF`, borders `rgba(0,0,0,.09)`, accent text `#5E7B10`. All variables are declared in the file's `:root` / `[data-theme="light"]`.

### Type
- Display / numbers: **Archivo** 800–900 — page titles 27px, overlay titles 19–20px, prices 15–17px, section headers 12px uppercase `letter-spacing:1.6px`.
- Body: **Hanken Grotesk** 400–700 — body 13–15px, meta 12.5px.
- Micro-badges (BOOSTED, PARTNER, AD, OFFICIAL): 9px / 800 / `letter-spacing:.8px`, pill.

### Shape & spacing
Cards `20px` radius · inputs & filter rows `16px` · buttons `15–16px` · avatar tiles `17px` · chips & segmented `999px`. Screen padding 18px, card padding 15px, list gap 12px. Avatar tiles 58×58 (list), 64×64 (store hero), 66×66 (venue). Primary CTA 52–54px tall, Archivo 800 15px. Toggles 46×26 with 20px knob. Minimum tap target 44px.

### Motion (from the client's board annotations)
| Note on board | Implementation |
| --- | --- |
| "animated gradient" | Sign-up background: two blurred radial blobs (volt + cyan) drifting on 14 s / 18 s `ease-in-out infinite` loops. |
| "icon switches color when typing to HEX: c6f24e" | Email / search / location field icons turn `#C6F24E` while the field has content. |
| "blinking marker" | User's own map marker: 1.6 s opacity+scale blink plus a 2 s expanding pulse ring. |
| "Icon Disappears when scrolling Down and appears when scrolling up" | Gallery/post FAB: direction-aware hide (translateY 28px + fade, 250 ms). Implemented with a native capture-phase scroll listener comparing against the previous offset. |
| "Stories can be added" | Venue avatar carries a volt ring + “+” badge; opens the add-to-gallery sheet. |
| — | Overlays slide up 14px + fade, 280 ms (`ovUp`); toggles/tabs 150–200 ms. |

---

## Information architecture

Bottom nav (5): **Discover · Maps · Courts · Community · Chat**. Profile opens from the avatar icon in the Discover header. (The board also sketched two other nav variants — one swapping Courts for Shop, one adding Profile. Shop currently opens from Profile → Shop and from the sponsored card; move it into the nav if you prefer that variant.)

### 1. Discover
Eyebrow "Lets" · title "Find your coach or partner" · "Beirut, Lebanon". Two 46px rounded-square icon buttons: notifications (volt dot when unread) and profile.
"Chosen Sport" label + sport icon row on the left; **coaches | Partners** segmented control (single bordered container) on the right.
Sport dropdown ("All sports and hobbies") → search ("Search Coach, Mentor") → **FEATURED COACHES** (BOOSTED pill inline after the name) → **AD card** (plain ✕ to dismiss, "AD" pill, whole card taps to the sponsor) → **ALL COACHES**.
Card anatomy: avatar tile · name (+ badge) · "Sport - distance" · "★ rating (reviews)" · right column price + "per session" (partners show their level instead).

### 2. Maps
Full-bleed dark grid map. Top: "Search this area" pill, then a horizontal chip row (GYM'S · BOXING · FOOTBALL · PADDLE · RUNNING). Circular avatar pins with a rating bubble; the user's own marker blinks. Docked bottom card: "Nearest boosted coach" → name, "Sport - distance", price.

### 3. Courts
**All courts view:** sport dropdown + search, then venue cards (photo, name, "City · Sport", distance + open state).
**Venue profile:** top bar (back · "Courts" · gallery icon · +) above the cover photo; venue avatar with story ring and "Add story"; name, OPEN pill, "Open : Mon to Sat", "Operation hours : 11:00 am - 12:00 am", city; divided tabs **Courts | Events | Gallery**.
- *Courts*: card = photo, "PADDLE COURT A", "4 Players", price ("$40/h"), **RSVP**.
- *Events*: same card with a TOURNAMENT pill, date range and "$40/TEAM".
- *Gallery*: 3-up album grid, "Load More", scroll-aware add-photo FAB.
**RSVP sheet:** booking type (Single / Teams / Member of team) · number of hours stepper · equipment rent toggle (+$6/h) · add-a-coach toggle (routes into the coach calendar) · live total · confirm.

### 4. Community
Header with **My Communities** icon (dot when you have crews) and **+** (community registration). "HAPPENING SOON" horizontal event cards → sponsored card → community list with Join / Joined.
**Community profile:** cover, verified check, card with avatar, name + edit, OFFICIAL FEDERATION pill, member count, "Sports, Running", Bio, tabs **News | Events | Gallery**; news posts have reactions (like/comment/share); events and gallery both end in "Load More" with the scroll-aware FAB.

### 5. Chat
List (avatar, online dot, preview, time, unread count) + "Session reminders" card with "Open booking". Thread: right-aligned volt bubbles for the user, surface bubbles for the other party, composer "Message <first name>" with a round + button.

### 6. Profile
Avatar card with role pills **User | Coach | Admin** (demo role switch). **TRAINING**: My bookings (badge), My communities, Notifications, Calendar sync ("Google · sessions auto pushed", On). **SETTINGS**: Appearance (dark/light), Shop, Admin console (admins only), My day view (coaches only), Sign out.

### 7. Booking (calendar)
Month grid ("July 2026", pill dates) → TIME SLOT chips (3-up) → PACKAGE selection → Total → "Confirm and pay" → **"You are booked!"** with "Added to Google Calendar / Changes sync automatically" → Bookings (active package progress, Upcoming with "In calendar ✓" + Change, Past with Rate).
**Coach day view:** week strip, time list with attendance counts (`1/10`), "Mark as Done" → modal *"Did you finish your 6:30 pm session?"* YES / NO.

### 8. Shop
List | Map toggle; "CLOSEST FIRST" partner stores (logo, name + PARTNER pill, category, rating · deal, distance). **Partner store**: hero, deal banner ("10% off in-app · applied at in-app checkout"), 2-up product grid with Add / Added ✓, sticky "Checkout · N items · $X". **"Be a Shop"** → registration.

### 9. Registration forms (community · venue · shop)
One shared form: name, category dropdown, phone, email, preferred contact channel (Phone call / WhatsApp / Email / In-app chat), best time to contact, official-entity YES/NO, document upload, "Send request to admins" → confirmation screen. Every submission is an **admin approval item**.

### 10. Sign-up / onboarding
1. "Lets / Get Started" — email + "Search Coach, Mentor", NEXT, Facebook / Google.
2. "What / Are you?" — Coach/Teacher | Trainee/Student.
3. "Hey Champ — / Where are we looking?" — location field with locate icon, **Search Radius** slider 1–100 Km with a running-figure thumb.
Progress dots at the bottom; animated gradient behind all three.

---

## State model (see the `Component` class)
`tab` · `overlay` (single id: venue, rsvp, community, profile, coach, booking, booked, bookings, coachDay, thread, notifs, shop, store, reg) · `sheet` (story, hours, pkg, myComm, admin) · `authStep` · `mode` (coaches/partners) · `sport` · `venueId`/`venueTab` · `communityId`/`commTab` · `rsvpType/rsvpHours/rsvpGear/rsvpCoach` · `coachId`/`pkgId`/`day`/`slot` · `joined` · `likes` · `cart` · `shopId`/`shopView` · `reg*` fields · `role` · `theme` · `fabUp`.

## Backend requirements
- Auth (email + Facebook/Google), role model: user / coach / venue owner / shop owner / admin.
- Geo search with radius (the onboarding slider) for coaches, partners, venues and shops.
- Booking engine: coach availability ("active hours"), packages/session credits, court slots with hours + equipment + optional coach, payment and refunds.
- Calendar OAuth (Google / Apple / Outlook): create, update and cancel events on booking changes.
- Communities: membership, official-entity verification, posts, events with RSVP, albums.
- Marketplace: partner stores, catalogue, cart, in-app checkout, commission per transaction.
- Admin: approval queues (hobby/community, venue, shop), misconduct reports, promotions, and the **accounting module** — expenses with recurrence, per-transaction margins, admin profit shares, and the rule that *any margin or share change needs three distinct admin approvals before it takes effect, after which affected users are notified immediately*; every change is written to an append-only audit log (History).

## Not yet in the new app
`legacy/Spotter (v1 app).dc.html` still holds the **admin console** screens built earlier: approvals queue (hobby/community/shop requests), misconduct reports, promotions, loyalty and the full **Accounting module** (this-month P&L, editable expenses with One-time/Weekly/Monthly/Yearly recurrence, margins per transaction, admin profit shares, 3-admin approval flow, instant user notification on apply, and History). Port those screens into the BOOK'D visual language when you build the admin side — the behaviour spec above is authoritative.

## Suggested build order
1. Design system (tokens, buttons, cards, chips, segmented, sheets, overlays).
2. Auth/onboarding → Discover + Maps (search & geo).
3. Coach profile → booking → bookings + calendar sync.
4. Courts (venue, RSVP) → Community (profiles, events, gallery).
5. Chat → Shop → registrations.
6. Admin console + accounting (from the legacy file).

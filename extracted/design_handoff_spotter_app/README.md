# Handoff: Spotter — Trainer & Partner Finder App

## Overview
Spotter is a mobile app for finding sports coaches and training partners nearby (prototype is set in Beirut, Lebanon). It covers: discovery of coaches/partners (card list + map), booking sessions with packages and calendar sync, communities and events, chat, a partner Shop marketplace (local sports/hobby stores selling in-app), shop partnership registration, and an admin console including moderation, approvals and a full internal Accounting module with 3-admin change approval.

## About the Design Files
The files in this bundle are **design references created in HTML** — interactive prototypes showing intended look and behavior, not production code to copy directly. Your task is to **recreate these designs in the target codebase's environment** (e.g. Flutter / React Native / Kotlin / SwiftUI) using its established patterns and libraries. If no codebase exists yet, choose the most appropriate cross-platform or native framework and implement the designs there.

- `Spotter.dc.html` — the full app prototype (single file: markup template + a `Component` logic class near the bottom containing all state, data and handlers; the state model there is the authoritative behavior spec).
- `Spotter Figma Board.dc.html` — a board rendering 16 key screens side by side (useful visual index).
- `Spotter App (standalone).html` — self-contained build; open in any browser to click through the live prototype.
- `android-frame.jsx`, `support.js` — prototype runtime helpers (device bezel + template engine). Not part of the design.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, copy and interactions are final intent. Recreate pixel-perfectly with the tokens below. (Product images are placeholders — striped blocks with monospace captions — replace with real photography.)

## Design Tokens

### Color — dark theme (default)
- Page background: `#0D0E11` (`--bg`); nav bar `#101216`
- Surface (cards, inputs): `#16181D`; raised surface `#1C1F26`
- Borders: `rgba(255,255,255,0.07)` primary, `rgba(255,255,255,0.05)` subtle
- Text: primary `#F2F3F5`, strong `#E7E9EC`, soft `#C5CAD2`, secondary `#9BA1AC`, tertiary `#6B7280`
- **Accent (volt)**: `#C6F24E` — primary buttons (with ink `#0D0E11` text), active states, prices, links
- Amber: `#F2C84B` — ratings ★, BOOSTED/PENDING badges
- Danger: `#E8543F`
- Accent tints: chip/badge backgrounds use `rgba(198,242,78,0.10–0.16)`; amber tints `rgba(242,200,75,0.14–0.30)`
- A light theme exists (toggle in Profile): bg `#F4F5F7`, surfaces `#FFFFFF`, borders `rgba(0,0,0,0.09)`. All colors are defined as CSS variables in `Spotter.dc.html` `:root` / `[data-theme="light"]`.

### Typography
- Display/headings & numbers: **Archivo**, weight 800 (page titles 27px, overlay titles 19px, prices 15–17px)
- Body: **Hanken Grotesk** (body 13–15px, weight 400–700)
- Section headings: Archivo 800, 12px, uppercase, letter-spacing 1.4px, tertiary color
- Micro-badges (PARTNER, AD, BOOSTED, PENDING): 9px, weight 800, letter-spacing 0.6–0.8px, pill radius

### Shape & spacing
- Card radius 18px; inputs/filter rows 14px; buttons 13–15px; avatar tiles 13–17px; chips/pills 999px
- Screen padding 18px horizontal; card padding 14–15px; list gap 11px
- Avatar tiles: 54×54 (list), 58×58 (featured), 64×64 (storefront hero); initials in Archivo 800 on muted color tints
- Toggles: 46×26 track, 20px knob; volt when on, `#3A3F47` when off
- Primary CTA button: height 52px, radius 15px, volt bg, ink text, Archivo 800 15–16px
- Min tap target 44px

## Navigation (bottom bar, 5 tabs)
Discover · Community · Shop · Chat · Profile. Icons 23px stroke style, 10px labels; active = volt, inactive = tertiary. (The former Map tab was merged into Discover as a subview.)

## Screens / Views

### 1. Discover (default tab)
- Header: "Hey Alex —" eyebrow, "Find your coach or partner" (Archivo 800 27px), location row "Beirut, Lebanon", 44px notification bell (volt dot badge when unread).
- Search field (placeholder "Search sports, hobbies, coaches…").
- Segmented control **Coaches | Training partners** (volt active pill).
- Filter dropdown "All sports & hobbies" with menu + "Request a sport or hobby" footer action (submits request to admin Approvals).
- Segmented control **Cards | Map** (subview toggle):
  - **Cards**: "Featured coaches" (BOOSTED amber-tinted cards, amber border), an AD card (surface style, AD badge + dismiss ✕, whole card taps through to sponsor; no CTA button), then "All coaches/partners" list sortable by Rating / Price / Distance. Card: avatar tile, name (+verified check), meta "Sport · distance", ★ rating (reviews); right side: price "$45 / per session" (coaches) or level pill (partners). Tap → Person profile overlay.
  - **Map**: full-bleed dark map (grid texture), search pill + the same Cards|Map toggle floating on top, circular avatar pins with rating chips, boosted lightning badge, user location volt dot, bottom docked nearest-person card.

### 2. Community
- Header + volt "+" button → **Start community** flow.
- "Happening soon" horizontal event cards (striped image area, type pill, title, meta, when, attendees). Tap → Event detail.
- Sponsored AD card (dismissable), communities list (join/leave), community detail overlay with events + create event.

### 3. Shop (marketplace of partner stores)
- Header "Shop / Partner sports & hobby stores · buy in-app".
- Segmented **List | Map**:
  - **List**: "Closest first" — shops ordered by proximity. Card: logo tile, name + PARTNER badge, category, ★ rating (reviews) · deal ("10% off in-app"), right side distance in volt ("600 m / away"). Tap → Storefront.
  - **Map**: rounded 520px map panel, rounded-square shop pins with distance chips, bottom nearest-shop card.
- **"Own a sports or hobby shop?"** promo card (volt-tinted) with **"Be a Shop"** CTA → Shop registration.

### 4. Shop storefront (overlay)
Back header "Partner store"; hero (64px logo tile, name, category · distance, ★ rating + PARTNER STORE badge); deal banner (volt tint, "applied at in-app checkout"); "Popular items" 2-col product grid (image placeholder 92px, name, volt price, Add/Added ✓ pill toggle); floating checkout bar when cart non-empty: "Checkout · 2 items · $147".

### 5. Shop registration ("Be a Shop")
Form: Shop name; Category **dropdown** (Running/Strength/Boxing/Yoga/Cycling/Tennis/Other — selecting Other reveals a free-text "what your shop sells" input); Phone; Email; "Preferred way to reach you" chips (Phone call / WhatsApp / Email / In-app chat); "Best time to contact" free text. Submit ("Send request to admins") enabled when name + (phone or email) present. Success state: check, "Request sent", explanation that admins will contact to make the deal. **The request appears in the admin Approvals queue** with contact + preference metadata.

### 6. Chat
Conversation list (avatar, online dot, preview, time, unread volt count) → conversation overlay with bubbles (own = volt/ink, other = surface).

### 7. Profile
Avatar, name, goals chips, qualifications, notification prefs card containing: push toggles, **Daily plan briefing** toggle, **Calendar sync** toggle → when on, provider segmented picker (Google / Apple / Outlook) + note "Confirmed sessions and changes are pushed to your calendar automatically." Settings list, role switcher (user / coach / admin — demo affordance), sign out.

### 8. Booking flow (from coach profile)
Coach profile overlay (stats, reviews, packages) → booking overlay (month calendar, time slots, package selection, total) → confirmation "You're booked!" with **"Added to your Google Calendar"** line when calendar sync is on. Bookings overlay: packages progress bars, Upcoming (status pills; "In calendar ✓" chip when sync on; request-change action), Past (rate).

### 9. Admin console (admin accounts only)
Profile (admin role) lists queues: **Approvals** (hobby requests, official community requests, **shop partnership requests** with Open deal / Decline → "Deal opened — onboarding sent"), Misconduct reports, Promotions, Loyalty, **Accounting**.

### 10. Accounting module (admin-only) — `overlay: adminAccounting`
- Header: back, "Accounting", volt **History** link, ADMINS ONLY badge.
- **This month** card: Revenue, expense rows (label + recurrence pill + −$amount, tap to edit), "+ Add expense" volt row, divider, Net profit (volt, computed = revenue − Σ expenses).
- **Margins per transaction**: Coach session commission, Shop sale commission, Boost fee margin. Each row: − stepper, **direct-entry numeric field accepting decimals**, + stepper. Changed values show volt + "was X%" note.
- **Admin profit shares**: one row per admin with monthly payout preview ($ = net × share). Same stepper + decimal input. Shares must total 100% (tolerant float check); total shown red otherwise; submit disabled.
- **3-admin approval rule (hard requirement)**: any change to margins or shares creates a *pending proposal* — editing locks, a PENDING card lists the diff lines ("Coach session commission: 12% → 10%"), approval progress "1 of 3", approver chips, approve actions per remaining admin, and Withdraw. **On the 3rd approval the change applies immediately**; if margins changed (user-facing) a push notification "Platform fees updated" is sent instantly to all affected users (appears at top of Notifications + bell badge); share-only changes are internal (no user notification). Green applied banner summarizes the outcome.
- **Expense editor** (`acctExpense`): name, amount (USD, decimals), Recurrence chips (One-time / Weekly / Monthly / Yearly) with hint text; Save; Delete when editing. Expense changes do **not** need approval but are logged.
- **History page** (`acctHistory`): reverse-chronological log cards (title, date, detail, meta: who made/approved it) covering expense add/update/remove, approved proposals, payout distributions.

### 11. Notifications
Overlay from bell: platform update card (volt-tinted, from accounting approvals), daily plan briefing card, standard items.

## Interactions & Behavior
- All overlays slide up 14px + fade, 280ms ease (`ovUp`); toggles/segments 150–200ms transitions.
- Ads: card tap opens sponsor destination; ✕ dismisses (stopPropagation) and persists hidden for session; "Why this ad?" transparency line required.
- Sorting (Rating/Price/Distance) re-ranks instantly; boosted entries always in Featured section.
- Cart: Add toggles item; checkout bar sums live.
- Form gating pattern: primary button renders disabled style (surface2 bg, tertiary text) until validation passes; never hidden.
- Decimal inputs: accept raw text, parse float, clamp 0–100, round to 2 decimals; keep raw text while typing (e.g. "12.").

## State Management (see `Component` class in Spotter.dc.html for exact shapes)
- `tab`, `overlay` (single overlay id or null), `discoverView` (cards|map), `shopView` (list|map)
- `cart` (productKey→price), `shopId`, shop registration fields
- `calSyncOn`, `calProvider`
- Accounting: `acctMargins {session, shop, boost}`, `acctShares {per admin}`, `acctDraft`, `acctEdits` (raw input text), `acctProposal {to, lines, approvals[]}`, `acctExpItems [{id,label,amt,recur}]`, `acctHistory[]`, `acctNotif`
- Real backend needs: proposals persisted with per-admin auth (each approval from a distinct authenticated admin account), server-side enforcement of the 3-approval rule, immediate push notification fan-out on apply, append-only audit log for the History page, calendar OAuth (Google/Apple/Outlook) with event create/update on booking confirm/change.

## Assets
No external imagery — avatars are initials on tinted tiles; product/event images are striped placeholders to be replaced with real photos. Icons are 24px-grid stroke icons (2–2.4px stroke); use a matching icon set (e.g. Lucide). Fonts: Archivo + Hanken Grotesk (Google Fonts).

## Files
- `Spotter.dc.html` — full prototype (template + logic/state)
- `Spotter Figma Board.dc.html` — 16-screen visual board
- `Spotter App (standalone).html` — clickable single-file build (open in browser)
- `android-frame.jsx`, `support.js` — prototype runtime only

# Spotter - Trainer and Training-Partner Finder

Spotter is an Android-first mobile app for finding sports coaches, training partners, communities, events, and partner shops nearby. The product prototype is set in Beirut, Lebanon and uses a dark athletic visual system with a volt accent.

This repository currently contains two things:

- The original HTML design handoff, kept as the source of truth for intended screens, copy, tokens, state, and interactions.
- A native Android/Kotlin Compose implementation that has started recreating the handoff in app code.

## Current Status

The Android app builds successfully and now contains clickable prototype UI for all five tabs: Discover, Community, Shop, Chat, and Profile. The major state-backed overlays for booking, shops, communities, events, chat, notifications, admin approvals, and accounting are wired. The remaining work is mostly polish, test coverage, real search/filter depth, persistence, and backend integrations.

Last verified command:

```powershell
.\gradlew.bat assembleDebug
```

Output APK:

```text
app/build/outputs/apk/debug/app-debug.apk
```

## Product Scope From The Handoff

The full Spotter handoff describes:

- Discover coaches and training partners using card and map views.
- Search, sport/hobby filters, sorting, boosted profiles, and sponsored ads.
- Coach and partner profiles with stats, qualifications, reviews, and tags.
- Booking flow with calendar day picker, time slots, packages, confirmation, and calendar sync messaging.
- Bookings view with active packages, upcoming sessions, change requests, and past sessions.
- Community tab with events, community detail, start-community, request-hobby, create-event, RSVP, join, and leave flows.
- Shop marketplace with list/map views, store profiles, product grid, cart, and checkout bar.
- Shop partnership registration form that feeds admin approvals.
- Chat list and conversation overlays.
- Profile preferences, role switcher, notifications, calendar provider picker, and light/dark appearance.
- Admin console with approvals, reports, promotions, loyalty, and accounting.
- Accounting module with expenses, margins, admin profit shares, 3-admin approval, notifications, and history.

## Implemented In Android

### App Shell

- Android Compose project with Gradle wrapper.
- Single `MainActivity` entry point.
- Edge-to-edge Compose layout.
- Central `SpotterViewModel` for prototype-like state.
- Five-tab bottom navigation:
  - Discover
  - Community
  - Shop
  - Chat
  - Profile
- Full-screen overlay host with slide/fade transition.

### Design System

- Dark and light semantic color tokens.
- Archivo and Hanken Grotesk local font assets.
- Shape/radius tokens matching the handoff.
- Shared UI primitives:
  - Cards
  - Avatar tiles
  - Badges
  - Segmented controls
  - Toggles
  - Sort pills
  - Volt CTA buttons
  - Overlay scaffold/header
  - Striped placeholders
  - Sponsored ad card

### Discover

- Header, location, notification bell, and search field UI.
- Coaches/training-partners segmented control.
- Sport/hobby dropdown with request action.
- Cards/map segmented control.
- Featured boosted coach cards.
- Sponsored ad card with dismiss behavior.
- Coach/partner list cards.
- Sorting by rating, price, and distance where applicable.
- Basic ranked data filtering.
- Dark map mock with grid texture, avatar pins, boosted marker, user location dot, floating search pill, view toggle, and nearest-person dock card.

### Community

- Community tab with happening-soon event cards.
- Sponsored community ad with dismiss behavior.
- Community list with official badges and join/leave state.
- Community detail overlay with location groups and event list.
- Event detail overlay with RSVP state.
- Start-community, request-sport/hobby, and create-event overlays.

### Shop

- Shop tab with List/Map segmented control.
- Closest-first partner store cards.
- Map panel with shop pins, distance chips, and nearest-shop dock card.
- Storefront overlay with partner badge, deal banner, product grid, add/added toggles, and live checkout bar.
- Shop partnership registration form with validation and success state.

### Chat

- Conversation list with online dots, unread counts, previews, and timestamps.
- Conversation overlay with message bubbles and composer UI.

### Profile, Admin, And Booking

- Profile tab with user card, training links, notification toggles, calendar sync/provider picker, theme toggle, and role switcher.
- Admin role surface with approvals and accounting entry points.
- Notifications overlay with platform update support.
- Admin approvals overlay for hobby/community/shop requests.
- Admin accounting overlay with expenses, margins, shares, 3-admin proposal approvals, notifications, expense editor, and history.
- Person profile overlay for coaches and partners.
- Stats, bio, tags, qualifications, packages, and reviews.
- Coach booking overlay with:
  - Month calendar
  - Unavailable/full days
  - Time slots
  - Package selection
  - Confirm/pay action
  - Success state
  - Calendar-sync success line when enabled in state
- Bookings overlay with:
  - Active package progress bars
  - Upcoming sessions
  - Calendar chip when calendar sync is on
  - Request-change action
  - Past sessions and rate affordance

### Data And State

Sample data is already ported for:

- Coaches
- Training partners
- Reviews
- Shops and products
- Communities and sub-groups
- Events
- Chats and messages
- Booking calendar metadata
- Accounting revenue, expenses, margins, shares, history
- Ads

State and behavior are scaffolded for:

- Top-level tab and overlay routing
- Discover/shop view modes
- Cart
- Booking
- Notification state
- Calendar sync/provider
- Ad dismissal
- Shop registration fields
- Community/event/request flows
- Admin accounting proposals, approvals, expenses, history, and notifications

## Not Yet Implemented As Real UI

These areas still need production work or deeper fidelity:

- Real ad tap destinations.
- Real search behavior across coaches, partners, communities, shops, and chats.
- Deeper filtering and sorting beyond the current prototype-level interactions.
- Payment checkout implementation.
- Real profile/report moderation workflow beyond the queued prototype screen.
- Backend persistence for users, bookings, cart, events, shop requests, approvals, and accounting history.
- Authentication and distinct admin identities for real 3-admin approval enforcement.
- Push notifications and calendar OAuth integrations.
- Automated unit and Compose UI tests.
- Visual polish pass against the original HTML handoff on device/emulator screenshots.

## Handoff Files
The design handoff is tracked in:

```text
extracted/design_handoff_spotter_app/
```

Important files:

```text
extracted/design_handoff_spotter_app/README.md
extracted/design_handoff_spotter_app/Spotter.dc.html
extracted/design_handoff_spotter_app/Spotter App (standalone).html
extracted/design_handoff_spotter_app/Spotter Figma Board.dc.html
extracted/design_handoff_spotter_app/android-frame.jsx
extracted/design_handoff_spotter_app/support.js
```

Use `README.md` and `Spotter.dc.html` in that folder as the source of truth for remaining behavior and screen details. The HTML files are design references, not production code.

## Repository Layout

```text
.
|-- app/
|   |-- build.gradle.kts
|   |-- src/main/AndroidManifest.xml
|   |-- src/main/java/com/spotter/app/
|   |   |-- MainActivity.kt
|   |   |-- data/
|   |   |-- state/
|   |   |-- ui/
|   |   |   |-- components/
|   |   |   |-- nav/
|   |   |   |-- overlays/
|   |   |   |-- screens/
|   |   |   |-- theme/
|   |-- src/main/res/font/
|   |-- src/main/res/values/
|-- extracted/design_handoff_spotter_app/
|-- gradle/wrapper/
|-- build.gradle.kts
|-- settings.gradle.kts
```

## Important Android Files

- `app/src/main/java/com/spotter/app/MainActivity.kt` - app entry point.
- `app/src/main/java/com/spotter/app/ui/SpotterApp.kt` - tab shell and overlay host.
- `app/src/main/java/com/spotter/app/ui/OverlayRouter.kt` - overlay id router.
- `app/src/main/java/com/spotter/app/state/SpotterViewModel.kt` - central app state and behavior.
- `app/src/main/java/com/spotter/app/data/SampleData.kt` - static prototype data.
- `app/src/main/java/com/spotter/app/data/Models.kt` - data models.
- `app/src/main/java/com/spotter/app/ui/screens/DiscoverScreen.kt` - Discover cards view.
- `app/src/main/java/com/spotter/app/ui/screens/DiscoverMap.kt` - Discover map view.
- `app/src/main/java/com/spotter/app/ui/overlays/PersonOverlay.kt` - person profile overlay.
- `app/src/main/java/com/spotter/app/ui/overlays/BookingOverlay.kt` - booking flow.
- `app/src/main/java/com/spotter/app/ui/overlays/BookingsOverlay.kt` - bookings overlay.
- `app/src/main/java/com/spotter/app/ui/theme/` - color, type, shape, and theme definitions.

## Build Requirements

- Android Studio or Android command-line tooling.
- JDK 17.
- Android Gradle Plugin 8.7.3.
- Kotlin 2.0.21.
- Compile SDK 36.
- Min SDK 26.

## Build

From the repository root:

```powershell
.\gradlew.bat assembleDebug
```

The debug APK will be written to:

```text
app/build/outputs/apk/debug/app-debug.apk
```

## Tests

There are currently no automated tests in the repo. The following directories do not exist yet:

```text
app/src/test
app/src/androidTest
```

Recommended future test coverage:

- Unit tests for ranking/filtering logic.
- Unit tests for booking calendar and slot selection logic.
- Unit tests for accounting proposal approval behavior.
- Compose UI tests for critical flows once the remaining screens are built.

## Suggested Next Priorities

1. Add unit tests for ranking, booking, cart, community/event, and accounting proposal logic.
2. Add Compose UI tests for the main tab and overlay flows.
3. Polish spacing/copy against the extracted HTML handoff on emulator screenshots.
4. Implement real search and richer filters.
5. Add backend persistence/auth boundaries for bookings, events, shop requests, approvals, and accounting.
6. Replace sample-only payment, push notification, and calendar behavior with real integrations when product direction is ready.

## Notes
- The current app is a high-fidelity prototype implementation, not a production backend-connected app.
- Product images are still placeholders in the handoff and should be replaced with real photography later.
- The design handoff calls for high fidelity: keep colors, typography, spacing, radii, copy, and interactions aligned with the extracted handoff files.
- The repo is currently Android-native; the original handoff HTML remains useful for reference and visual comparison only.

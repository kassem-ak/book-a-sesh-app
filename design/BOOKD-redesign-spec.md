# BOOK'D — redesign spec (from `BOOK'D SVG.svg` artboards)

Source: `D:\BOOK'D SVG.svg` (5172×6055 Illustrator board, 8 sections).
Red text in the file = explicit change annotations; captured verbatim below.

## Global

- **Bottom nav becomes 5 tabs: Discover · Maps · Courts · Community · Chat.**
  - `Maps` is promoted from a Discover subview to its own tab.
  - `Courts` is a brand-new tab.
  - **Shop is removed from the nav** — stamped `SECOND RELEASE` on the board.
  - **Profile leaves the nav** — reached via a person icon top-right of Discover/Profile headers.
- Accent stays volt `#C6F24E`; dark surfaces unchanged.
- Header pattern on primary screens: eyebrow + big title + volt location line, with
  bell (unread dot) and person icons at top-right.

### Shared behaviours (annotated)
- *"Icon Disappears when scrolling Down and appears when scrolling up"* — the floating
  add/FAB button on Courts Gallery and Community Profile Gallery/Events/News.
- *"icon switches color when typing to HEX: c6f24e"* — leading field icons (@ / ***)
  turn volt while the field has focus/text.
- *"Stories can be added"* — circular venue/community logo doubles as a story ring.
- *"blinking marker"* — the user-location dot on Maps pulses.
- *"animated gradient"* — animated gradient background on the Get Started screen.

## 1. Login and signup (3 steps, replaces current landing gate)
1. **Get Started** — "Let's / Get Started"; Email field (@ icon); password field (*** icon);
   `NEXT` volt pill; Facebook + Google icon buttons; animated gradient bg.
2. **Are you?** — "What / Are you?"; choice pills `Coach/Teacher` vs `Trainee/Student`
   (volt = selected); `NEXT`.
3. **Where are we looking?** — "Hey Champ - / Where are we looking?"; Location field with
   locate icon; `Search Radius` slider 1 Km – 100 Km with runner-figure thumb; `NEXT`.

## 2. Discover
- Header "Lets / Find your coach or partner / Beirut, Lebanon" + bell + person icons.
- `Chosen Sport` row with small sport icons; segmented `coaches | Partners`.
- `All sports and hobbies` dropdown; `Search Coach, Mentor` field.
- `FEATURED COACHES` boosted cards (amber tint, BOOSTED badge, price + "per session").
- AD card with dismiss ×. Then `ALL COACHES`.

## 3. Maps (own tab)
- `Search this area` field; filter chips (GYM'S / BOXING / FOOTBALL).
- Circular avatar pins with rating chips; boosted = filled amber, others = volt outline.
- Blinking volt user-location marker.
- Docked bottom card: "Nearest boosted coach".

## 4. Courts (new tab)
Header: back, `Courts`, calendar icon + volt `+`.
Venue hero image; circular logo (story ring); name; `OPEN` badge; "Open : Mon to Sat";
"Operation hours : 11:00 am - 12:00 am"; volt location line.
Tabs `Courts | Events | Gallery`:
- **Courts** — court cards: image, `PADDLE COURT A`, "4 Players", `$40/h`, volt `RSVP`.
- **Events** — `PADDLE ADULT TOURNAMENT`, date range, `$40/TEAM`, `RSVP`.
- **Gallery** — album grid (Album 1–6), `Load More`, scroll-aware add-image FAB.
- **ALL Courts view** — `All sports and hobbies` dropdown + search + venue list
  (image, name, city, distance e.g. "1.6 km").

## 5. Community
- List header gains a **My Communities** icon beside the volt `+` (annotated "My Communities").
- `HAPPENING SOON` horizontal cards (Meetup/Event pills), AD card, `COMMUNITIES` with Join/Joined.
- **Community registration** — name, category dropdown, phone, email,
  "Is it an official Entity? (federation, institute, etc..)" YES/NO,
  `Upload official Documents` dropzone, `Send request to admins`.
- **Community profile** — avatar, name + verified check, `Official Federation` badge,
  member count, category line, bio, edit pencil; tabs `News | Events | Gallery`:
  - News: post feed (author, image, reactions row, pager dots) + volt `+` FAB.
  - Events: event cards + `Load More` + volt `+` FAB.
  - Gallery: album grid + `Load More` + scroll-aware add FAB.
- **Community detail** (e.g. Running): `LOCATION GROUPS` (name + "N members nearby"),
  `EVENTS`, volt `Create event`.

## 6. Calendar / booking (replaces current booking overlay)
1. **Calendar** — "Book Marcus"; month grid (JULY 2026) with dimmed unavailable days;
   `TIME SLOT` chips; `PACKAGE` card; `Total`; volt `Confirm and pay`.
2. **Day view** (coach) — week strip with arrows; time rows with client name +
   capacity chip (1/10, 5/5…); volt `Mark as Done`.
3. **Session end confirmation** — modal "Hey Champ! Did you finish your 6:30 pm session?"
   `YES` / `NO`.
4. **Booking confirmed** — volt check, "You are booked!", approval line,
   "Added to Google Calendar / Changes sync automatically", `View in bookings`.
5. **My session overview (Bookings)** — `ACTIVE PACKAGE` with progress bar,
   `UPCOMING` (In calendar chip / Change), `PAST` (Rate).

## 7. Profile
- Header `Profile` + "Alex Morgan - Beirut" + bell and person icons.
- Identity card: avatar, name, "Strength - Running - Boxing", role chips User/Coach/Admin, edit.
- `TRAINING`: My bookings (count), Notifications, Calendar sync (On), **+ My Communities** (annotated).
- `SETTINGS`: Appearance (Dark/light), Admin console (count).
- **Coach profile** annotations: *"Add gallery images and setting page (active hours)"*,
  *"create a new package"*.

## 8. Shop — SECOND RELEASE
Board stamps `SECOND RELEASE` across the Shop section. Keep the existing implementation
but drop Shop from the primary nav for this release.

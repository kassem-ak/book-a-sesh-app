# BOOK'D release residue sweep

**52 source files read in full · 21 BLOCKER findings · 6 MINOR findings.**

All files under `expo-app/src/` were covered: screens (9), overlays (17), components (6), state (4), lib (9), navigation (4), and theme (3). Findings below concern the shipping scope; supporting app-entry and SQL code was read where necessary to verify behavior and is not included in the 52-file count. This is a static code audit; citations are relative to the project root.

## BLOCKER

### B01 — The admin approvals queue contains invented requests and counts

**Invented data / dead controls.** Opening Profile → Approvals renders fixed requests for Padel from “214 users,” Salsa from “89 users,” and a “Chess community” with “640 members”; their Approve/Reject handlers only change local `hobbyDecisions` (`expo-app/src/overlays/AdminApprovalsOverlay.tsx:13`, `expo-app/src/overlays/AdminApprovalsOverlay.tsx:14`, `expo-app/src/overlays/AdminApprovalsOverlay.tsx:15`). Real sport requests are submitted remotely, but this queue never loads or decides them, despite the request confirmation promising admin review and addition to the app (`expo-app/src/state/store.ts:933`, `expo-app/src/overlays/CommunityOverlays.tsx:227`). An admin therefore sees fabricated demand and can mark sample requests approved without changing any real request or available sport.

### B02 — Uploading official-community documents fabricates an attachment

**Invented data / dead control.** The reachable official-community form's upload button merely toggles the literal filename `official-documents.pdf`; it then displays that filename and announces it as “Attached,” without selecting or uploading a file (`expo-app/src/overlays/CommunityOverlays.tsx:211`, `expo-app/src/overlays/RegistrationOverlay.tsx:262`, `expo-app/src/overlays/RegistrationOverlay.tsx:264`, `expo-app/src/overlays/RegistrationOverlay.tsx:280`). Someone applying for official status can believe supporting documents were attached even though submission neither reads nor sends `docs` (`expo-app/src/overlays/RegistrationOverlay.tsx:107`).

### B03 — “Send request to admins” only stores the community application in memory

**Unbacked claims / placeholder scaffolding.** Community registration offers “Send request to admins” and then says “Request sent” and “Saved on this device for review” (`expo-app/src/overlays/RegistrationOverlay.tsx:160`, `expo-app/src/overlays/RegistrationOverlay.tsx:136`, `expo-app/src/overlays/RegistrationOverlay.tsx:143`). Its submission only appends a name and contact summary to the in-memory Zustand store, omitting the selected category and official-entity answer; there is no server submission or durable device save (`expo-app/src/overlays/RegistrationOverlay.tsx:107`, `expo-app/src/state/store.ts:517`, `expo-app/src/state/store.ts:1123`). An admin on another device receives nothing, and restarting the app loses the application.

### B04 — “Open deal” claims onboarding was sent without sending anything

**Unbacked claim / dead control.** For a locally queued registration, the admin's “Open deal” action writes the visible decision “Approved — onboarding sent” (`expo-app/src/overlays/AdminApprovalsOverlay.tsx:24`, `expo-app/src/overlays/AdminApprovalsOverlay.tsx:27`, `expo-app/src/overlays/AdminApprovalsOverlay.tsx:44`). The entire decision handler only replaces a string in `pendingRegistrations`, so no deal opens and no onboarding message reaches the applicant (`expo-app/src/state/store.ts:1130`).

### B05 — Booking offers invented availability instead of the coach's saved schedule

**Invented data / unbacked claims.** Clients can select every day of the next calendar month and the same six fixed times for every coach: the full-days list is always empty, and the times come from `slotDefs` (`expo-app/src/overlays/BookingOverlay.tsx:20`, `expo-app/src/overlays/BookingOverlay.tsx:113`, `expo-app/src/overlays/BookingOverlay.tsx:136`, `expo-app/src/state/sampleData.ts:12`, `expo-app/src/state/sampleData.ts:26`). Meanwhile, My schedule promises “Set which slots clients can book” and labels empty weekdays as days off, although its persisted availability is never consulted by this booking flow (`expo-app/src/overlays/CoachOverlays.tsx:184`, `expo-app/src/overlays/CoachOverlays.tsx:633`, `expo-app/src/overlays/CoachOverlays.tsx:790`). The booking RPC also omits an availability check before inserting a confirmed booking, so a client can actually book one of these offered times on a coach's declared day off (`db/migrations/2026-09-03_package_redemption.sql:22`, `db/migrations/2026-09-03_package_redemption.sql:51`).

### B06 — A previous reservation is presented as proof that a package was paid for

**Unbacked payment claim.** After a package has any recorded usage, booking displays “Already paid for” and can confirm “nothing to pay” solely from its usage counter (`expo-app/src/overlays/BookingOverlay.tsx:35`, `expo-app/src/overlays/BookingOverlay.tsx:59`, `expo-app/src/overlays/BookingOverlay.tsx:86`, `expo-app/src/lib/queries.ts:373`). That counter increments when a booking is created, while the first-booking copy says payment is due directly to the coach at the future session (`db/migrations/2026-09-03_package_redemption.sql:58`, `expo-app/src/overlays/BookingOverlay.tsx:61`). A client booking a second session before attending or paying for the first therefore receives an unsupported statement that payment has already happened.

### B07 — Session duration is hardcoded as 60 minutes

**Invented business data.** Every single-session option, including the fallback when a coach has no packages, is labelled “60 min,” while the coach's package list says “60 min each” (`expo-app/src/state/models.ts:207`, `expo-app/src/state/models.ts:214`, `expo-app/src/overlays/CoachOverlays.tsx:883`). The package fetch and schema contain session counts and prices but no duration, yet the constant is rendered as the duration of the selected coach's service in booking (`expo-app/src/lib/queries.ts:135`, `db/schema.sql:185`, `expo-app/src/overlays/BookingOverlay.tsx:156`). A buyer is consequently given a specific service length that was not supplied by that coach's package data.

### B08 — The location step promises an area/radius search that is not connected

**Unbacked claims / ineffective controls.** Onboarding asks “Where are we looking?”, offers a search radius, and tells users denied device location to “type your area instead,” but finishing only stores the entered area as `authLoc`, which Discover uses as a displayed label (`expo-app/src/screens/AuthLanding.tsx:126`, `expo-app/src/screens/AuthLanding.tsx:128`, `expo-app/src/screens/AuthLanding.tsx:259`, `expo-app/src/screens/AuthLanding.tsx:43`, `expo-app/src/screens/DiscoverScreen.tsx:126`). Distance calculations use the device position instead of the entered area, and the current coach/partner queries do not supply coordinates; unknown distances all pass the radius filter (`expo-app/src/screens/DiscoverScreen.tsx:72`, `expo-app/src/screens/DiscoverScreen.tsx:85`, `expo-app/src/lib/queries.ts:126`, `expo-app/src/lib/queries.ts:154`). A user can choose an area and radius without constraining the returned people, and Maps discards all of those coordinate-less profiles before creating pins (`expo-app/src/screens/DiscoverMap.tsx:58`, `expo-app/src/screens/DiscoverMap.tsx:79`).

### B09 — Trainee ratings are said to appear publicly, but partner profiles never show them

**Unbacked claim.** Rating a trainee genuinely saves a review, after which the coach sees “You rated … — shown on their public profile” (`expo-app/src/overlays/CoachOverlays.tsx:166`, `expo-app/src/overlays/CoachOverlays.tsx:477`). Public partner loading never reads reviews, and the person overlay explicitly restricts its rating display to coaches, so a rated training partner's public profile cannot display that rating (`expo-app/src/lib/queries.ts:152`, `expo-app/src/lib/queries.ts:164`, `expo-app/src/overlays/PersonOverlay.tsx:67`).

### B10 — “My bookings” advertises past ratings that it cannot display

**Unbacked claim.** Profile describes My bookings as including “past ratings” in both its loading and loaded labels (`expo-app/src/screens/ProfileScreen.tsx:111`, `expo-app/src/screens/ProfileScreen.tsx:112`). The destination fetches only bookings and package balances, and its Past section renders session cards containing booking details without ratings or review controls (`expo-app/src/overlays/BookingsOverlay.tsx:42`, `expo-app/src/overlays/BookingsOverlay.tsx:123`, `expo-app/src/overlays/BookingsOverlay.tsx:167`). A user following that label has no way to view the promised past ratings there.

### B11 — Coach request handling directs users to session actions that do not exist

**Unbacked claims.** Profile promises “Approve bookings & change requests,” but the request handler only records a status on `appointment_requests`, and the overlay tells coaches to move or cancel the booking “from the session itself” (`expo-app/src/screens/ProfileScreen.tsx:94`, `expo-app/src/overlays/CoachOverlays.tsx:96`, `expo-app/src/overlays/CoachOverlays.tsx:451`). The coach session view only offers completion, while new client bookings are already inserted as confirmed without producing an appointment request (`expo-app/src/overlays/CoachDayViewOverlay.tsx:77`, `expo-app/src/overlays/CoachDayViewOverlay.tsx:207`, `db/migrations/2026-09-03_package_redemption.sql:51`). A coach cannot approve those new bookings through this queue or follow the instruction to reschedule/cancel a client's session.

### B12 — Blocked text is said to be flagged or sent for review, but never leaves the form

**Unbacked claims.** Event creation, event suggestions, community edits, community creation, and official registration display variants of “flagged to admins,” “this will be flagged,” or “this will be sent for review” when the local word filter matches (`expo-app/src/overlays/CommunityOverlays.tsx:136`, `expo-app/src/overlays/CommunityOverlays.tsx:160`, `expo-app/src/overlays/CommunityOverlays.tsx:185`, `expo-app/src/overlays/CommunityOverlays.tsx:206`, `expo-app/src/overlays/RegistrationOverlay.tsx:171`). Those paths disable submission and/or return before any remote call, and `isExplicit` only performs a substring check (`expo-app/src/state/store.ts:62`, `expo-app/src/state/store.ts:794`, `expo-app/src/state/store.ts:853`, `expo-app/src/state/store.ts:865`, `expo-app/src/state/store.ts:910`, `expo-app/src/overlays/RegistrationOverlay.tsx:85`). Users are told a moderation handoff happened or will happen when no flag or review item is created.

### B13 — Community creation tells owners to add moderators without providing that capability

**Unbacked claim.** The community-created confirmation instructs the owner to “Add moderators, edit details, and host the first event” (`expo-app/src/overlays/CommunityOverlays.tsx:199`). The community view has no member-role controls, and the only `setCommunityMemberRole` implementation has no caller and only changes local state, so an owner cannot carry out the advertised moderator assignment (`expo-app/src/overlays/CommunityOverlays.tsx:77`, `expo-app/src/state/store.ts:776`).

### B14 — Community news is promised in the notifications inbox without a producer

**Unbacked claim.** Profile promises “Booking and community updates,” and the empty inbox says “Booking updates and community news land here” (`expo-app/src/screens/ProfileScreen.tsx:130`, `expo-app/src/overlays/UtilityOverlays.tsx:351`). The inbox only reads stored notifications; the implemented notification producers in the checked SQL cover booking creation and platform-fee changes, while community creation/event actions have no community-notification producer (`expo-app/src/lib/notifications.ts:36`, `db/migrations/2026-09-15_booking_notifications.sql:31`, `db/hardening.sql:443`, `expo-app/src/state/store.ts:851`, `expo-app/src/state/store.ts:907`). Joining a community or having a new event created therefore does not deliver the community news advertised by this inbox.

### B15 — Promo tools advertise discounts that cannot be redeemed

**Unbacked claims / placeholder scaffolding.** Coach and admin Profile entries advertise creating discounts, and a saved coach promo is displayed under “Your active promos” as a percentage “off your sessions” (`expo-app/src/screens/ProfileScreen.tsx:97`, `expo-app/src/screens/ProfileScreen.tsx:155`, `expo-app/src/overlays/CoachOverlays.tsx:1012`, `expo-app/src/overlays/CoachOverlays.tsx:1021`). Both promo screens also explicitly admit that checkout does not redeem their codes yet, and booking has no promo input or redemption argument (`expo-app/src/overlays/CoachOverlays.tsx:1032`, `expo-app/src/overlays/AdminOverlays.tsx:578`, `expo-app/src/lib/queries.ts:295`). Codes really are saved, but the advertised active discount cannot change a customer's booking price.

### B16 — The moderation entry advertises bans and suspensions that the app cannot apply

**Unbacked claim.** Profile describes Misconduct reports as “Review evidence · ban or suspend” (`expo-app/src/screens/ProfileScreen.tsx:154`). The decision functions only update the report/flag record, and the case UI itself warns that this “does not change the account or notify anyone — handle enforcement separately” (`expo-app/src/lib/moderation.ts:240`, `expo-app/src/lib/moderation.ts:257`, `expo-app/src/overlays/AdminOverlays.tsx:123`). An admin entering this tool to ban or suspend someone cannot perform the advertised account action.

### B17 — Accounting's “Propose changes” cannot become enabled

**Dead control / placeholder scaffolding.** An admin can edit transaction margins, but “Propose changes” requires profit shares to total 100%, while `acctShares` starts empty and the share-control definitions are an empty array (`expo-app/src/overlays/AccountingOverlays.tsx:22`, `expo-app/src/overlays/AccountingOverlays.tsx:66`, `expo-app/src/overlays/AccountingOverlays.tsx:76`, `expo-app/src/state/store.ts:636`, `expo-app/src/state/sampleData.ts:35`). With no share rows or loading path to populate them, `sharesOk()` remains false and no UI interaction can satisfy the submission guard (`expo-app/src/state/store.ts:1158`, `expo-app/src/state/store.ts:1199`). The user can change numbers on screen but cannot submit those accounting changes.

### B18 — Expense saving and automatic recurrence are only an in-memory simulation

**Unbacked claims / placeholder scaffolding.** Save expense returns the admin to Accounting with a new ledger item, while recurrence choices promise “Automatically re-added every week/month/year” (`expo-app/src/overlays/AccountingOverlays.tsx:168`, `expo-app/src/overlays/AccountingOverlays.tsx:188`, `expo-app/src/state/sampleData.ts:42`). The save function only updates `acctExpItems` and local history; expenses start from an empty array on a new app instance, and the recurrence value is stored as a label without a re-addition mechanism (`expo-app/src/state/store.ts:1256`, `expo-app/src/state/store.ts:1270`, `expo-app/src/state/store.ts:642`, `expo-app/src/state/sampleData.ts:38`). An admin's apparently saved expenses disappear after restart and never recur as promised.

### B19 — The crash screen guarantees no data was lost without preserving drafts

**Unbacked guarantee.** The error boundary always tells a user that “no data was lost,” then replaces its children and offers a reset that remounts them (`expo-app/src/components/ErrorBoundary.tsx:35`, `expo-app/src/components/ErrorBoundary.tsx:47`, `expo-app/src/components/ErrorBoundary.tsx:60`). That boundary wraps the app's Root, while an unsent chat message, for example, exists only in component state (`expo-app/App.tsx:59`, `expo-app/src/overlays/UtilityOverlays.tsx:116`). A render failure can discard that draft while the recovery screen assures the user that nothing was lost.

### B20 — Returning community members are told they have never joined a community

**Unbacked claim / placeholder state.** My Communities says “You have not joined a community yet” whenever its filter over local `joinedCommunities` is empty (`expo-app/src/overlays/MyCommunitiesOverlay.tsx:20`, `expo-app/src/overlays/MyCommunitiesOverlay.tsx:29`). Membership and community-role state start empty, are only populated by join/create actions in the current app instance, and are not restored by the community data fetch (`expo-app/src/state/store.ts:604`, `expo-app/src/state/store.ts:609`, `expo-app/src/state/store.ts:682`, `expo-app/src/state/store.ts:917`, `expo-app/src/screens/CommunityScreen.tsx:116`). A returning member or owner therefore sees a false “not joined” statement and loses access to the corresponding management UI until rejoining in that instance.

### B21 — “Happening soon” can present historical events as upcoming

**Unbacked temporal claim.** Community labels its first six events “Happening soon,” but obtains them by slicing the complete list without checking dates (`expo-app/src/screens/CommunityScreen.tsx:107`, `expo-app/src/screens/CommunityScreen.tsx:179`). The remote query returns all events in ascending start-date order without a future-date condition, and the display mapper drops the start timestamp (`expo-app/src/lib/queries.ts:199`, `expo-app/src/lib/queries.ts:200`, `expo-app/src/screens/CommunityScreen.tsx:49`). Once historical events exist, users can be shown the oldest events under a heading that claims they are about to happen.

## MINOR

### M01 — An unopened registration route and superseded mock form remain

**Dead route / unreachable scaffolding.** `OverlayRouter` still accepts `communityRegister`, but no code opens that case; the real entry point sets `registration` instead (`expo-app/src/navigation/OverlayRouter.tsx:53`, `expo-app/src/state/store.ts:1139`). The separate, unmounted `CommunityRegisterOverlay` still fakes submission with `setSent(true)` and an attachment called `federation-charter.pdf` (`expo-app/src/overlays/CommunityRegisterOverlay.tsx:47`, `expo-app/src/overlays/CommunityRegisterOverlay.tsx:90`). These remnants currently have no user impact because the router renders `RegistrationOverlay` for the registration cases (`expo-app/src/navigation/OverlayRouter.tsx:55`).

### M02 — Unused store actions retain fabricated identity/year values and a magic points fallback

**Unreachable scaffolding / magic fallback.** The old store helpers still create certifications with fixed year `2026` and issuer “Awaiting verification,” generate coach codes prefixed `ALEX-`, and substitute 100 loyalty points when a reward key has no value (`expo-app/src/state/store.ts:1292`, `expo-app/src/state/store.ts:1320`, `expo-app/src/state/store.ts:1299`). These helpers have no callers in the scanned app, so the fabricated values are dormant rather than data currently shown to a user.

### M03 — Unreachable accounting approval completion still fabricates rollout and notification success

**Unreachable scaffolding / unbacked claims.** The local `approveAs` path constructs “Approved by 3 admins — change is live” and “Affected users were notified,” then only updates the Zustand store (`expo-app/src/state/store.ts:1210`, `expo-app/src/state/store.ts:1228`, `expo-app/src/state/store.ts:1242`). Its simulated notification is also only assigned to local `acctNotif`, rather than written to the notification table (`expo-app/src/state/store.ts:1233`). This is currently unreachable through ordinary UI because the proposal gate cannot pass and the approval-admin list is empty, so users cannot currently reach that false completion message (`expo-app/src/state/store.ts:1199`, `expo-app/src/state/sampleData.ts:36`).

### M04 — Permanent image stand-ins remain on community and event surfaces

**Cosmetic placeholder scaffolding.** Community event cards, community-profile event cards, and event detail permanently render `StripedPlaceholder` with an empty caption (`expo-app/src/screens/CommunityScreen.tsx:214`, `expo-app/src/overlays/CommunityProfileOverlay.tsx:82`, `expo-app/src/overlays/CommunityOverlays.tsx:103`). That component is an image stand-in consisting of a flat box and an outlined monospace caption container, with no image or loading transition, so users see the empty mock image treatment even after content has loaded (`expo-app/src/components/ui.tsx:302`, `expo-app/src/components/ui.tsx:317`).

### M05 — Loyalty configuration explicitly exposes unfinished functionality

**Placeholder scaffolding.** Profile exposes Loyalty offers, whose screen states that “earning and redeeming points are not live yet” (`expo-app/src/screens/ProfileScreen.tsx:156`, `expo-app/src/overlays/AdminOverlays.tsx:636`). An admin can edit the saved reward catalogue, but the visible flow explicitly remains configuration for an unavailable feature; this is minor because it discloses that limitation instead of claiming redemption works.

### M06 — Disabled-provider errors retain “not set up yet” / “for now” copy

**Cosmetic placeholder copy.** Both auth paths can show “[provider] sign-in is not set up yet” and “Use your email and password for now” (`expo-app/src/lib/session.ts:92`, `expo-app/src/overlays/AuthOverlay.tsx:61`). This development-stage wording reaches a user if the provider-disabled branch is triggered; the code alone does not establish that any provider is currently disabled in the deployed project.

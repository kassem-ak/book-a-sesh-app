# Workflow scenarios — read-only source audit

Date: 2026-09-17. Project: Book-a-sesh.

## Scope and evidence

This audit traces the current working tree. No application source, database, configuration, or test file was changed. The only audit artifact is this report. No production calls, real signups, bookings, messages, or account deletions were performed.

Paths below are relative to the project root. **PASS** means the specified happy path is connected in the source, assuming its external services and deployed policies work. It does not mean a device or production test passed. **BREAKS** means a concrete failure, missing transition, stale state, or false statement was found. SQL-dependent findings describe the checked-in definitions, not a verified live database.

The 2026-09-17 module/moderation migration is a narrative record, explicitly referring to authoritative migrations stored in Supabase; it does not contain executable definitions of the deployed RPCs (`db/migrations/2026-09-17_module_gate_and_moderation.sql:9`). I did not read those live definitions. Provider enablement, redirect configuration, email delivery, installed database grants/triggers, Storage ownership cleanup, and deployed Edge Function behavior remain unverified.

The release contract is retained: Discover, Maps, Community, Chat; Profile is off-nav. No proposal in this report reopens Courts or Shop, introduces in-app payment, adds a role selector, or charges for the base service. The first four destinations and Profile are rendered at `expo-app/src/navigation/Root.tsx:150` and `expo-app/src/navigation/Root.tsx:158`; server module lookup remains `expo-app/src/lib/modules.ts:14`. Booking explicitly tells clients to pay the coach directly (`expo-app/src/overlays/BookingOverlay.tsx:115`). Account role is read from the server/account profile (`expo-app/src/lib/queries.ts:401`).

An in-memory Node/TypeScript harness executed the actual store actions, Root auth callback, package-option builder, and signup-profile applier with network functions stubbed. It confirmed four client behaviors: guest booking/join/RSVP reach writes; signing in keeps Profile and old membership/attendance state while clearing the overlay; a listed one-session package removes the no-package option; an unbound coach signup draft applies to a returning member. This establishes client control flow, not database acceptance. The harness made no network calls or file writes.

## Scenario matrix

| Scenario | Result | What completes / first meaningful failure |
|---|---|---|
| A. New MEMBER, interests, email/password | PASS | The guided signup persists role/interests through local draft and auth metadata, then creates the member profile and tags. The subsequent editor has a separate SQL-grant conflict covered under J. `expo-app/src/overlays/AuthOverlay.tsx:40` → `expo-app/src/lib/session.ts:87` → `expo-app/src/lib/profiles.ts:59`. |
| B. New COACH, interests, SSO through signup | PASS | Signup mode saves coach/interests before the provider round-trip; Root applies them afterward. The first-screen SSO shortcut bypasses those choices; see B2. `expo-app/src/overlays/AuthOverlay.tsx:57` → `expo-app/src/lib/session.ts:158` → `expo-app/src/navigation/Root.tsx:72`. |
| C. Returning user, email and SSO | BREAKS | Fresh-process sign-in without a signup draft reaches Discover, but same-process sign-out/sign-in stays on Profile, and an abandoned unbound signup draft can turn sign-in into profile setup. `expo-app/src/state/store.ts:529`; `expo-app/src/navigation/Root.tsx:47`; `expo-app/src/lib/profiles.ts:45`. |
| D. Guest browsing → book/chat/join/RSVP | BREAKS | Browsing is connected. These actions have no real-account gate; they use an anonymous Supabase identity, or expose a write error without a sign-in handoff if the deployed server refuses them. `expo-app/src/lib/session.ts:37`; `expo-app/src/overlays/PersonOverlay.tsx:19`; `expo-app/src/state/store.ts:687`, `expo-app/src/state/store.ts:712`, `expo-app/src/state/store.ts:1020`. |
| E. Guest → signup mid-session | BREAKS | Signup drops the anonymous identity; no activity migration or action resumption is called. Native retains some search/form state but closes overlays; web SSO reload loses nonpersisted store state. `expo-app/src/lib/session.ts:90`, `expo-app/src/lib/session.ts:162`; `expo-app/src/navigation/Root.tsx:47`; `expo-app/src/lib/signup.ts:4`. |
| F. Single session; package purchase/redemption/exhaustion | BREAKS | Offered valid first bookings/redemptions connect to the RPC, but dates/times exclude valid choices; a listed single session is exhaustible, exhausted packs cannot be bought again, and retiring a pack prevents remaining redemptions. `expo-app/src/state/sampleData.ts:12`; `expo-app/src/state/models.ts:201`; `db/migrations/2026-09-16_enforce_coach_availability.sql:73`. |
| G. Coach receives booking; notifications/day view/schedule | BREAKS | Insert notifications and day-view reads are connected. The reminder opens the client-only list; clearing the final availability row reopens all slots under the checked-in RPC. `db/migrations/2026-09-15_booking_notifications.sql:38`; `expo-app/src/screens/ChatScreen.tsx:156`; `db/migrations/2026-09-16_enforce_coach_availability.sql:52`. |
| H. Community discovery/join/leave/create/RSVP/cancel | BREAKS | Event creation and same-session RSVP toggling are connected. Checked-in membership/count triggers conflict; attendance is never rehydrated; owners are told to transfer ownership through a UI that is absent. `db/auth.sql:147`; `db/hardening.sql:179`; `expo-app/src/state/store.ts:622`; `expo-app/src/overlays/CommunityOverlays.tsx:77`. |
| I. Chat start/send/receive/block mid-thread | BREAKS | Starting/sending works on the connected route; new incoming messages do not appear while the thread stays open, and the thread offers neither block nor a link to the counterpart's profile. `expo-app/src/overlays/PersonOverlay.tsx:22`; `expo-app/src/overlays/UtilityOverlays.tsx:121`, `expo-app/src/overlays/UtilityOverlays.tsx:188`. |
| J. Profile edit/preferences/delete | BREAKS | Editor inputs and avatar upload are connected, but merge-upsert conflicts with checked-in column grants; partner looking-for/goal fields cannot be edited; deletion omits coach profile cleanup and avatar-object removal. `expo-app/src/lib/profiles.ts:109`; `expo-app/src/overlays/EditProfileOverlay.tsx:81`; `supabase/functions/delete-account/index.ts:68`. |
| K. Offline/unreachable/RLS/module withdrawal | BREAKS | Several writes preserve input and surface errors, but a failed module read traps the normal landing destination; community failures masquerade as empty data; module withdrawal is not refreshed during ordinary use. `expo-app/src/lib/modules.ts:15`; `expo-app/src/navigation/Root.tsx:119`; `expo-app/src/screens/CommunityScreen.tsx:135`. |

## The 12 highest-severity findings

### F01 — Profile Save conflicts with both profile tables' checked-in column grants

**Scenarios:** J; the optional editor after A/B. **Evidence:** client + checked-in SQL; not reproduced against the live database.

Path: `expo-app/src/screens/ProfileScreen.tsx:93` → `expo-app/src/navigation/OverlayRouter.tsx:49` → `expo-app/src/overlays/EditProfileOverlay.tsx:46` → `expo-app/src/lib/profiles.ts:107` → `expo-app/src/lib/profiles.ts:109`.

The name UPDATE runs first. Next, `saveMyProfile` sends a merge-upsert containing `user_id` to either profile table. The installed SDK defaults to merge-duplicates and submits that complete body (`expo-app/node_modules/@supabase/postgrest-js/src/PostgrestQueryBuilder.ts:1372`, `expo-app/node_modules/@supabase/postgrest-js/src/PostgrestQueryBuilder.ts:1393`, `expo-app/node_modules/@supabase/postgrest-js/src/PostgrestQueryBuilder.ts:1416`). The checked-in hardening revokes table-wide UPDATE, then grants coach UPDATE without `user_id`; the member migration also grants UPDATE without `user_id` (`db/hardening.sql:17`, `db/hardening.sql:197`, `db/migrations/2026-09-17_registration_profiles.sql:77`). A merge-upsert that updates that key conflicts with these privileges.

**Impact:** with these grants, Save cannot finish even for ordinary existing profiles. The name can already have changed, while bio/interests and the subsequent avatar upload have not. The draft and a partial-save error stay visible, but retrying the same request cannot repair a privilege mismatch (`expo-app/src/lib/profiles.ts:113`; `expo-app/src/overlays/EditProfileOverlay.tsx:47`, `expo-app/src/overlays/EditProfileOverlay.tsx:57`).

**Expected:** save the permitted editable fields without rewriting the identity key; preserve the current error/draft behavior for genuine partial failures. Initial signup uses ignore-duplicates and is a different operation (`expo-app/src/lib/profiles.ts:64`).

### F02 — A failed module lookup strands users on an empty screen with no recovery

**Scenario:** K. **Evidence:** client source.

Path: `expo-app/src/navigation/Root.tsx:123` → `expo-app/src/lib/modules.ts:14` → `expo-app/src/lib/modules.ts:15` → `expo-app/src/navigation/Root.tsx:126` → `expo-app/src/navigation/Root.tsx:161`.

A Supabase error becomes `[]`, indistinguishable from a successful “nothing released” response. On Discover, Root changes the tab to an empty string; TabBar disappears. The empty screen says Profile is available “from the header,” but this branch renders no header/profile button. The actual Profile entry is inside Discover, which is no longer rendered (`expo-app/src/navigation/Root.tsx:128`, `expo-app/src/navigation/TabBar.tsx:33`, `expo-app/src/navigation/Root.tsx:167`, `expo-app/src/screens/DiscoverScreen.tsx:137`).

**Impact:** a transient offline/RPC failure becomes a dead end even after connectivity returns. The module effect does not depend on reconnect/focus and this state has no Retry or sign-out button (`expo-app/src/navigation/Root.tsx:134`). A user already on Profile is an exception: Profile remains rendered (`expo-app/src/navigation/Root.tsx:158`).

**Expected:** keep the gate fail-closed, distinguish a failed lookup from no releases, and expose retry/Profile in the actual fallback view.

### F03 — Account deletion leaves the coach listing/bio and does not remove avatar objects

**Scenario:** J. **Evidence:** Edge Function and client source; live deletion/Storage behavior unverified.

Path: `expo-app/src/screens/ProfileScreen.tsx:213` → `expo-app/src/lib/session.ts:204` → `supabase/functions/delete-account/index.ts:65` → `supabase/functions/delete-account/index.ts:86` → `supabase/functions/delete-account/index.ts:100`.

The function deletes `partner_profiles`, tags, availability and other personal rows, but omits `coach_profiles`, active packages, and Storage objects from its cleanup. It nulls `users.avatar_url`, detaches `auth_id`, retains the app-user row and then deletes the auth user (`supabase/functions/delete-account/index.ts:68`, `supabase/functions/delete-account/index.ts:86`). Coach profile cascade deletion therefore does not occur: its FK targets the retained app-user row (`db/schema.sql:118`). Discovery still selects all coach profiles and their bios, and the checked-in coach read policy is unconditional (`expo-app/src/lib/queries.ts:126`; `db/policies.sql:35`).

The avatar upload creates a public object in the user's auth-UID folder; clearing its database URL is not an object-removal call (`expo-app/src/lib/avatars.ts:71`; `db/migrations/2026-09-17_registration_profiles.sql:34`). The deletion function contains no Storage cleanup. I did not verify whether the live auth deletion additionally fails or performs any external cleanup for owned objects.

**Impact:** the promise that profile/personal data is removed is not fulfilled by the checked-in coach deletion path (`expo-app/src/screens/ProfileScreen.tsx:209`). The remaining coach row can still be listed; the booking RPC also has no deleted-coach check in its rate/package lookup (`db/migrations/2026-09-16_enforce_coach_availability.sql:73`, `db/migrations/2026-09-16_enforce_coach_availability.sql:91`).

**Expected:** finish removal of public personal profile/photo data and prevent new bookings against the deleted account while retaining necessary shared booking history.

### F04 — Guest actions write under an identity that signup abandons

**Scenarios:** D/E. **Evidence:** client behavior reproduced in memory; anonymous acceptance supported by checked-in RPCs, not live-tested.

Paths:
- Book: `expo-app/src/overlays/PersonOverlay.tsx:52` → `expo-app/src/state/store.ts:1015` → `expo-app/src/state/store.ts:1032` → `expo-app/src/lib/queries.ts:355` → `expo-app/src/lib/queries.ts:17`.
- Chat: `expo-app/src/overlays/PersonOverlay.tsx:22` → `expo-app/src/lib/chat.ts:241`.
- Join/RSVP: `expo-app/src/screens/CommunityScreen.tsx:216` / `expo-app/src/overlays/CommunityOverlays.tsx:96` → `expo-app/src/state/store.ts:692` / `expo-app/src/state/store.ts:717` → `expo-app/src/lib/queries.ts:245` / `expo-app/src/lib/queries.ts:259`.

None first requires a non-anonymous account or opens Auth. `ensureAppSession` signs guests in anonymously and bootstraps an app-user row (`expo-app/src/lib/session.ts:37`, `expo-app/src/lib/session.ts:48`). The checked-in `require_app_user` checks only for an auth-linked row (`db/auth.sql:50`); membership has the additional independent F10 SQL conflict.

Email signup and SSO explicitly sign out the anonymous identity, then create/sign into another account; neither path transfers activity (`expo-app/src/lib/session.ts:90`, `expo-app/src/lib/session.ts:162`). Root closes overlays but keeps guest `joinedCommunities` and `goingEvents`; these are not among the fields it resets (`expo-app/src/navigation/Root.tsx:47`; `expo-app/src/state/store.ts:620`). Booking reads correctly filter the new client ID, making old anonymous bookings disappear from that account (`expo-app/src/lib/bookings.ts:143`).

**Impact:** a guest can be shown successful activity which becomes inaccessible after signup, while some membership/RSVP badges falsely survive. If the deployed RPC instead denies anonymous writes, the app presents a generic error rather than the expected sign-in/resume flow (`expo-app/src/state/store.ts:145`; `expo-app/src/overlays/PersonOverlay.tsx:26`).

**Expected:** enforce the stated real-account gate at these actions and return to the chosen action after auth; any activity intentionally allowed to guests needs to remain associated with the user's account.

### F05 — An open conversation never receives newly arriving messages

**Scenario:** I. **Evidence:** client source.

Path: `expo-app/src/overlays/PersonOverlay.tsx:22` → `expo-app/src/state/store.ts:1048` → `expo-app/src/overlays/UtilityOverlays.tsx:121` → `expo-app/src/lib/chat.ts:188`.

The conversation loads messages only on mount, conversation ID change, or error retry. A successful send appends only the sender's returned row. There is no subscription, polling, focus refresh, or ordinary refresh control on this screen (`expo-app/src/overlays/UtilityOverlays.tsx:152`, `expo-app/src/overlays/UtilityOverlays.tsx:174`, `expo-app/src/overlays/UtilityOverlays.tsx:243`). Chat list loading likewise depends only on closing an overlay/reloads, not arrival of messages (`expo-app/src/screens/ChatScreen.tsx:20`, `expo-app/src/screens/ChatScreen.tsx:54`).

**Impact:** two users with the same conversation open see their own sends but not each other's replies until leaving/reopening. Successful writes alone do not complete a conversation.

**Expected:** incoming messages should appear in the open thread and update the list/unread state without requiring users to close and reopen it.

### F06 — Setting every day off makes the coach fully bookable again

**Scenario:** G, also F. **Evidence:** UI + checked-in booking RPC.

Path: `expo-app/src/screens/ProfileScreen.tsx:103` → `expo-app/src/overlays/CoachOverlays.tsx:693` → `expo-app/src/overlays/CoachOverlays.tsx:207` → `db/migrations/2026-09-16_enforce_coach_availability.sql:52`.

“Set day off” deletes availability rows. The screen labels every empty day as a day off (`expo-app/src/overlays/CoachOverlays.tsx:790`). But the RPC treats a coach with zero remaining rows as having no schedule and skips availability validation entirely (`db/migrations/2026-09-16_enforce_coach_availability.sql:55`).

**Impact:** deleting the last slot turns “all days off” into “all offered times allowed.” The UI's “which slots clients can book” promise is reversed (`expo-app/src/overlays/CoachOverlays.tsx:633`).

**Expected:** a coach who deliberately clears their schedule must remain unavailable; absence of setup must not be conflated with a saved closed week.

### F07 — The booking calendar excludes this month and most saved coach times

**Scenario:** F; practical effect on G. **Evidence:** client + checked-in availability check.

Path: `expo-app/src/overlays/BookingOverlay.tsx:144` → `expo-app/src/state/sampleData.ts:12`; time buttons at `expo-app/src/overlays/BookingOverlay.tsx:178` → `expo-app/src/state/sampleData.ts:26` → `expo-app/src/state/store.ts:1034` → `db/migrations/2026-09-16_enforce_coach_availability.sql:57`.

The calendar is initialized to next month and has no month navigation. Time choices are exactly six literals. Coach schedule editing offers every half hour from 05:00 to 22:30 (`expo-app/src/state/store.ts:69`; `expo-app/src/overlays/CoachOverlays.tsx:610`). Booking never fetches that schedule and only learns that a choice is unavailable after submission (`expo-app/src/overlays/BookingOverlay.tsx:47`).

**Impact:** a coach offering only 09:00 can never receive an in-app booking at their offered time; every selectable time is rejected. A member cannot book a valid session later this month. These are workflow dead ends, not calendar cosmetics.

**Expected:** expose actual future availability, including valid dates this month and all saved bookable times, and make unavailable choices apparent before confirmation.

### F08 — Retiring a package strands its remaining sessions

**Scenario:** F package redemption; G package management. **Evidence:** client + checked-in RPC.

Path: `expo-app/src/overlays/CoachOverlays.tsx:889` → `expo-app/src/overlays/CoachOverlays.tsx:257` → `expo-app/src/lib/queries.ts:139` → `expo-app/src/state/models.ts:201`; attempted redemption → `db/migrations/2026-09-16_enforce_coach_availability.sql:73`.

The coach's “Stop selling” control sets `active=false`. Discovery drops that package from booking options. The RPC requires an active listing before it even reads the client's existing balance (`db/migrations/2026-09-16_enforce_coach_availability.sql:75`, `db/migrations/2026-09-16_enforce_coach_availability.sql:78`). My bookings still displays that balance and its sessions left (`expo-app/src/lib/bookings.ts:168`; `expo-app/src/overlays/BookingsOverlay.tsx:147`).

**Impact:** a client sees remaining entitlement but cannot use it after the coach stops selling the listing. Paying the coach directly does not change this missing redemption path.

**Expected:** retiring sales should not erase the ability to use an already acquired balance; the remaining entitlement needs a usable booking route.

### F09 — A listed single session is usable once; exhausted packs have no repeat-purchase route

**Scenario:** F. **Evidence:** option builder reproduced in memory; exhaustion behavior in UI/RPC.

Path: `expo-app/src/state/models.ts:201` → `expo-app/src/overlays/BookingOverlay.tsx:55` → `expo-app/src/overlays/BookingOverlay.tsx:120` → `db/migrations/2026-09-16_enforce_coach_availability.sql:83`.

If the coach has packages, options are only those packages; the no-package single-session alternative is returned only when there are no packages (`expo-app/src/state/models.ts:213`). This includes a package with `sessions=1`, labelled “Single session” (`expo-app/src/state/models.ts:206`). First booking creates a balance with one used; the next visit disables confirmation as exhausted. The RPC also always rejects an existing exhausted balance instead of allowing another acquisition (`db/migrations/2026-09-16_enforce_coach_availability.sql:88`, `db/migrations/2026-09-16_enforce_coach_availability.sql:104`).

**Impact:** a coach offering one “Single session” product becomes unbookable to that member after one booking. Multi-session clients also hit “Pick another option” when no other option exists (`expo-app/src/overlays/BookingOverlay.tsx:112`).

**Expected:** prevent over-redemption while allowing a new direct-pay single session or a new pack after the prior entitlement is exhausted.

### F10 — Checked-in community count guard rejects ordinary join/leave RPCs

**Scenario:** H, and D join. **Evidence:** checked-in SQL conflict; deployed trigger unverified.

Path: `expo-app/src/screens/CommunityScreen.tsx:259` → `expo-app/src/state/store.ts:692` → `expo-app/src/lib/queries.ts:245` / `expo-app/src/lib/queries.ts:252` → `db/auth.sql:140` → `db/hardening.sql:179`.

A real join/leave changes a membership and then updates `communities.members_count` (`db/auth.sql:147`, `db/auth.sql:151`). The installed-by-source BEFORE UPDATE trigger rejects any member-count change by a non-platform-admin. Its only early bypass checks `current_setting('role')='service_role'`; a SECURITY DEFINER RPC does not change that session role (`db/hardening.sql:168`, `db/hardening.sql:179`, `db/hardening.sql:189`).

**Impact:** with the checked-in trigger, ordinary join/leave rolls back rather than completing. The UI retains the previous state and shows the error (`expo-app/src/state/store.ts:704`). The later migration documents a similar effective-role repair for `guard_user_privileges` only; it does not provide a replacement for this community trigger (`db/migrations/2026-09-17_module_gate_and_moderation.sql:85`).

**Expected:** the authorized membership RPC should be able to maintain the count while direct client attempts to forge counts stay prohibited.

### F11 — RSVP status is forgotten on restart and can belong to the previous account

**Scenario:** H; also E/C. **Evidence:** client source and store/account transition check.

Path: `expo-app/src/screens/CommunityScreen.tsx:138` → `expo-app/src/lib/queries.ts:199` → `expo-app/src/overlays/CommunityOverlays.tsx:89` → `expo-app/src/state/store.ts:714`.

Event loading reads aggregate counts, not the user's attendance. `goingEvents` starts empty and is modified only by local successful toggles/event creation; there is no `event_attendees` read anywhere in the app source (`expo-app/src/state/store.ts:622`, `expo-app/src/state/store.ts:719`, `expo-app/src/state/store.ts:880`). Root also leaves it intact on account changes (`expo-app/src/navigation/Root.tsx:47`).

**Impact:** after restart, an attendee sees “I'm going” rather than their existing RSVP. Their first tap re-adds the existing attendance idempotently; only a second tap cancels. After an account switch, the new account can inherit “You're going” and its first tap sends cancellation for an attendance it never owned (`expo-app/src/overlays/CommunityOverlays.tsx:97`; `db/auth.sql:161`, `db/auth.sql:166`).

**Expected:** read attendance for the current account, clear it when identities change, and make the cancel action explicit.

### F12 — Module withdrawal is not observed during ordinary use, and overlays are ungated

**Scenario:** K. **Evidence:** client source; no claim of server authorization bypass.

Path: `expo-app/src/navigation/Root.tsx:119` → `expo-app/src/lib/modules.ts:14` → `expo-app/src/navigation/Root.tsx:134` → `expo-app/src/navigation/Root.tsx:173`.

Modules are re-read only when admission, auth UID, or profile revision changes. Ordinary tab changes, time passing, app resume, and incoming admin release changes do not trigger the read. Even when a new response removes a module, Root only corrects the tab; it neither closes nor gates existing overlays/sheets (`expo-app/src/navigation/Root.tsx:128`, `expo-app/src/navigation/Root.tsx:173`; `expo-app/src/navigation/OverlayRouter.tsx:45`). Profile's My communities entry and a person's Message entry can also open those overlays without checking the relevant module (`expo-app/src/screens/ProfileScreen.tsx:132`; `expo-app/src/overlays/PersonOverlay.tsx:22`).

**Impact:** a withdrawn screen remains visible until an unrelated refresh, and an already-open conversation/community overlay survives even a successful gate refresh. Whether subsequent server operations are refused depends on the deployed policies, which were not inspected.

**Expected:** re-evaluate the authoritative gate during continued use and apply its result to every entry point and already-open surface, while preserving fail-closed behavior.

## Detailed scenario walks and additional findings

### A — MEMBER signup with interests and email/password

**Call path:** `expo-app/src/screens/AuthLanding.tsx:96` (Next) → `expo-app/src/screens/AuthLanding.tsx:130` (role) → `expo-app/src/screens/AuthLanding.tsx:140` / `expo-app/src/components/SportsPicker.tsx:43` (interests) → `expo-app/src/screens/AuthLanding.tsx:143` (persist draft) → `expo-app/src/screens/AuthLanding.tsx:166` (Create account) → `expo-app/src/overlays/AuthOverlay.tsx:40` → `expo-app/src/lib/session.ts:87` → `db/auth.sql:30` (auth-user trigger) → `expo-app/src/navigation/Root.tsx:41` → `expo-app/src/navigation/Root.tsx:72` → `expo-app/src/lib/profiles.ts:40`.

**Completion:** the signup form saves member/interests/email, auth metadata carries role and sport IDs, and the post-auth applier inserts the partner profile and profile tags. The first selected sport is primary (`expo-app/src/lib/session.ts:98`; `expo-app/src/lib/profiles.ts:62`, `expo-app/src/lib/profiles.ts:67`). Role is subsequently fetched from the account, not assigned by a runtime selector (`expo-app/src/navigation/Root.tsx:89`; `expo-app/src/lib/queries.ts:401`).

**Confirmation-required branch:** no session means “Confirm your email”; the button returns to sign-in. Successful email sign-in eventually re-enters the same Root/applier path, and metadata can supply the choices on another device (`expo-app/src/overlays/AuthOverlay.tsx:42`, `expo-app/src/overlays/AuthOverlay.tsx:76`; `expo-app/src/lib/session.ts:79`; `expo-app/src/lib/profiles.ts:49`). Delivery/callback configuration was not tested.

**Post-signup destination:** Root opens Edit profile after application, with Discover selected in a fresh store. The editor can be closed, but saving its complete profile is affected by F01 (`expo-app/src/navigation/Root.tsx:79`; `expo-app/src/state/store.ts:529`; `expo-app/src/overlays/EditProfileOverlay.tsx:64`).

**Failure/input behavior:** account-submit errors retain the local form; sports lookup has Retry/Skip; profile-application failure keeps the signup draft and exposes a retry banner (`expo-app/src/overlays/AuthOverlay.tsx:45`; `expo-app/src/components/SportsPicker.tsx:30`; `expo-app/src/lib/profiles.ts:65`, `expo-app/src/lib/profiles.ts:76`; `expo-app/src/navigation/Root.tsx:143`). One silent-loss edge remains: sports no longer in the approved catalogue are filtered out during signup application rather than reported, and the draft is then cleared (`expo-app/src/lib/profiles.ts:57`, `expo-app/src/lib/profiles.ts:58`, `expo-app/src/lib/profiles.ts:76`).

### B — COACH signup with interests and SSO

**B1, guided signup — PASS. Call path:** role/interests at `expo-app/src/screens/AuthLanding.tsx:130` → signup AuthForm at `expo-app/src/screens/AuthLanding.tsx:169` → SSO button at `expo-app/src/overlays/AuthOverlay.tsx:114` → `expo-app/src/overlays/AuthOverlay.tsx:57` → `expo-app/src/lib/session.ts:158`.

On web, OAuth redirects to origin + pathname; on native, a browser session returns a code which is exchanged for a session (`expo-app/src/lib/session.ts:166`, `expo-app/src/lib/session.ts:173`, `expo-app/src/lib/session.ts:184`). Root → `applySignupProfile` reads the persistent coach draft, creates `coach_profiles` and tags, then refreshes account role. The applied coach defaults to partner discovery and receives coach tools (`expo-app/src/navigation/Root.tsx:72`, `expo-app/src/navigation/Root.tsx:87`; `expo-app/src/lib/profiles.ts:59`; `expo-app/src/screens/ProfileScreen.tsx:97`). Provider settings and a real native/web round-trip were not tested.

**B2, first-screen “Continue with …” — BREAKS for someone intending coach onboarding.** It calls SSO immediately before role/interests, never saves a draft, and provides no post-auth role step. A brand-new provider account without saved draft/signup metadata makes `applySignup` return false, so neither coach nor member discovery profile is created by that path (`expo-app/src/screens/AuthLanding.tsx:65`, `expo-app/src/screens/AuthLanding.tsx:110`; `expo-app/src/lib/profiles.ts:48`, `expo-app/src/lib/profiles.ts:55`). Later Edit profile defaults a profile-less account to member (`expo-app/src/lib/profiles.ts:94`). Expected: a new SSO account must complete its signup role/interests choice; returning accounts should bypass onboarding.

**Cancellation/disabled provider:** a disabled provider produces a readable error; native cancellation returns false and leaves the user at the form (`expo-app/src/lib/session.ts:139`, `expo-app/src/lib/session.ts:182`; `expo-app/src/overlays/AuthOverlay.tsx:61`). However, a signup SSO draft remains stored after cancellation or provider failure because the form persists it before starting SSO and does not clear it in catch/finally (`expo-app/src/overlays/AuthOverlay.tsx:57`, `expo-app/src/overlays/AuthOverlay.tsx:61`). This feeds C2.

### C — Returning user sign-in must reach Discover

**C1, clean-launch email/SSO — PASS. Call paths:**
- Email: `expo-app/src/screens/AuthLanding.tsx:117` → `expo-app/src/overlays/AuthOverlay.tsx:37` → `expo-app/src/lib/session.ts:79`.
- SSO: `expo-app/src/screens/AuthLanding.tsx:68` or `expo-app/src/overlays/AuthOverlay.tsx:58` → `expo-app/src/lib/session.ts:158`.
- Both → `expo-app/src/navigation/Root.tsx:41` → `expo-app/src/lib/profiles.ts:55` → `expo-app/src/navigation/Root.tsx:81` → default Discover (`expo-app/src/state/store.ts:529`, `expo-app/src/navigation/Root.tsx:150`).

With no draft/signup metadata, `applySignup` does not invent a signup and Root does not open registration/profile editing (`expo-app/src/lib/profiles.ts:52`). The official-entity RegistrationOverlay is not part of this auth route (`expo-app/src/navigation/OverlayRouter.tsx:55`).

**C2, abandoned signup then sign in — BREAKS; reproduced.** The interests step and SSO signup save an unbound draft. Email sign-in binds any such draft to the email being signed in; SSO sign-in leaves it unbound. The applier accepts either and can create a coach profile on an existing member account, add stale interests, and open Edit profile as if registration just occurred (`expo-app/src/screens/AuthLanding.tsx:143`; `expo-app/src/lib/session.ts:80`; `expo-app/src/lib/signup.ts:17`; `expo-app/src/lib/profiles.ts:45`, `expo-app/src/lib/profiles.ts:59`; `expo-app/src/navigation/Root.tsx:79`). Ignore-duplicates protects an existing row in the same table; it does not prevent inserting the opposite role's row. Expected: explicit sign-in should not consume another/abandoned signup intent.

**C3, sign out from Profile then sign back in — BREAKS; reproduced.** Profile's sign-out invokes auth sign-out; Root returns to the landing gate but never resets `tab`. Successful email or native SSO sign-in therefore returns to Profile. The module normalizer deliberately exempts Profile (`expo-app/src/screens/ProfileScreen.tsx:197` → `expo-app/src/lib/session.ts:105` → `expo-app/src/navigation/Root.tsx:60`; `expo-app/src/navigation/Root.tsx:128`). Web SSO reloads the process and therefore gets the default Discover tab instead (`expo-app/src/lib/session.ts:166`; `expo-app/src/state/store.ts:529`). Expected: successful returning-user sign-in should select Discover consistently.

**C4, stale account state:** Root clears identity/role/blocks/overlays but leaves memberships, attendance, custom communities/events and filters. My communities can show the prior account's affiliations until the Community screen refreshes; attendance has no refresh at all (F11). `expo-app/src/navigation/Root.tsx:47` → `expo-app/src/overlays/MyCommunitiesOverlay.tsx:19`; refresh owner: `expo-app/src/screens/CommunityScreen.tsx:115`. This is stale UI state, not proof that RLS allows access as the former account.

### D — Guest browse, then gated action

**Browse path — PASS subject to K:** `expo-app/src/screens/AuthLanding.tsx:172` → `expo-app/src/screens/AuthLanding.tsx:54` → `expo-app/src/navigation/Root.tsx:97` → people/module fetches at `expo-app/src/navigation/Root.tsx:104`, `expo-app/src/navigation/Root.tsx:123` → Discover. Guest access is only exposed after the role/interests/area sequence (`expo-app/src/screens/AuthLanding.tsx:121`, `expo-app/src/screens/AuthLanding.tsx:137`, `expo-app/src/screens/AuthLanding.tsx:172`).

**Book/chat/join/RSVP — BREAKS as gated workflows:** exact paths are in F04. No route switches to Auth and no pending-action continuation exists in those handlers. The only in-app Auth opener found in the read release paths is Profile → Sign in or create account (`expo-app/src/screens/ProfileScreen.tsx:226`). `ErrorBanner` can say “Sign in to continue” but has only a dismiss action (`expo-app/src/components/ErrorBanner.tsx:44`, `expo-app/src/components/ErrorBanner.tsx:74`).

**Maps browsing limitation:** Maps accepts only profiles with coordinates, while the actual coach/partner SELECTs do not fetch public coordinates (`expo-app/src/screens/MapsScreen.tsx:36` → `expo-app/src/screens/DiscoverMap.tsx:58`; `expo-app/src/lib/queries.ts:128`, `expo-app/src/lib/queries.ts:156`). It can render an honest “No public map locations available yet” state (`expo-app/src/screens/MapsScreen.tsx:31`). No proposal here exposes users' private location.

### E — Guest signs up mid-session

**Path:** leave the action → Discover header Profile (`expo-app/src/screens/DiscoverScreen.tsx:137`) → `expo-app/src/screens/ProfileScreen.tsx:230` → `expo-app/src/navigation/OverlayRouter.tsx:47` → `expo-app/src/overlays/AuthOverlay.tsx:220` → switch to signup at `expo-app/src/overlays/AuthOverlay.tsx:157` → email or SSO submit → `expo-app/src/navigation/Root.tsx:47`.

**What survives:** with email/native SSO, the existing Zustand store remains, so `discSearch`, `authLoc`, selected person/day and other non-cleared values survive in memory. Role/interests are also explicitly persisted in the signup draft (`expo-app/src/state/store.ts:549`, `expo-app/src/state/store.ts:572`, `expo-app/src/state/store.ts:583`; `expo-app/src/lib/signup.ts:12`). Surviving values are not a resumed task: the auth listener clears the overlay/sheet and signup opens Edit profile (`expo-app/src/navigation/Root.tsx:54`, `expo-app/src/navigation/Root.tsx:79`).

**What is lost/misleading:** a conversation draft is local component state and disappears when leaving its overlay (`expo-app/src/overlays/UtilityOverlays.tsx:117`; `expo-app/src/navigation/OverlayRouter.tsx:81`). Web SSO makes a full-page redirect; the persisted draft contains only role/sports/email/auth UID, not current tab, coach, event, search or booking selection (`expo-app/src/lib/session.ts:166`; `expo-app/src/lib/signup.ts:4`). Previously committed anonymous activity belongs to the abandoned identity (F04). Thus context is partly retained in native memory, lost on web reload, and never deliberately resumed.

### F — Member books a coach

**Common path:** `expo-app/src/screens/DiscoverScreen.tsx:215` → `expo-app/src/state/store.ts:977` → `expo-app/src/overlays/PersonOverlay.tsx:52` → `expo-app/src/state/store.ts:1015` → `expo-app/src/overlays/BookingOverlay.tsx:127` → `expo-app/src/state/store.ts:1032` → `expo-app/src/lib/queries.ts:343` → `db/migrations/2026-09-16_enforce_coach_availability.sql:27`.

**Single session without packages — connected.** The option builder uses the coach rate with a null package ID; the RPC reads the actual coach rate and inserts confirmed status (`expo-app/src/state/models.ts:216`; `db/migrations/2026-09-16_enforce_coach_availability.sql:91`, `db/migrations/2026-09-16_enforce_coach_availability.sql:97`). It can complete only for a date/time the picker exposes and server accepts (F07).

**Package acquisition — connected.** UI loads balances; first booking with no balance records the package price, creates `used=1,total=sessions`, and confirms the booking. The transaction locks that member/coach/package combination (`expo-app/src/overlays/BookingOverlay.tsx:36`; `expo-app/src/lib/queries.ts:419`; `db/migrations/2026-09-16_enforce_coach_availability.sql:70`, `db/migrations/2026-09-16_enforce_coach_availability.sql:83`, `db/migrations/2026-09-16_enforce_coach_availability.sql:104`). This is a recorded amount owed directly to the coach, not app payment (`expo-app/src/overlays/BookingOverlay.tsx:86`).

**Redemption — connected while active and unexhausted.** An existing balance below its stored total produces zero additional recorded amount and increments used; purchased total/label stay unchanged after listing edits (`db/migrations/2026-09-16_enforce_coach_availability.sql:85`, `db/migrations/2026-09-16_enforce_coach_availability.sql:108`). A retired listing breaks this route (F08).

**Exhaustion — protected but dead-ended.** F09 covers both single-session listings and packs. There is no new acquisition path for the same exhausted package.

**View/cancel:** confirmation → `expo-app/src/overlays/BookingOverlay.tsx:92` → `expo-app/src/state/store.ts:1045` → `expo-app/src/overlays/BookingsOverlay.tsx:43` → `expo-app/src/lib/bookings.ts:142`. Cancel uses two taps and a selected-back status write, surfacing RLS/no-row failure (`expo-app/src/overlays/BookingsOverlay.tsx:114`, `expo-app/src/overlays/BookingsOverlay.tsx:65`; `expo-app/src/lib/bookings.ts:193`). Under the checked-in SQL, cancelling does not decrement package usage: cancellation only changes status and the status trigger only validates transitions (`expo-app/src/lib/bookings.ts:197`; `db/hardening.sql:325`). No cancellation-entitlement policy was supplied, so this is an observed consequence needing truthful display, not an assertion that every cancellation must restore credit.

**Stale or unknown quote:** an unavailable balance read returns null, yet Confirm remains enabled; the screen explicitly permits booking without knowing the balance (`expo-app/src/lib/queries.ts:433`; `expo-app/src/overlays/BookingOverlay.tsx:110`, `expo-app/src/overlays/BookingOverlay.tsx:121`). On known quotes, confirmation uses the pre-submit client price even though the RPC re-reads current server price and returns only an ID (`expo-app/src/overlays/BookingOverlay.tsx:125`, `expo-app/src/overlays/BookingOverlay.tsx:86`; `expo-app/src/lib/queries.ts:355`). A concurrent rate edit can therefore make the displayed amount differ from the booking record. No money is collected by the app.

**Unpriced coach label:** Discover and Person print “$0”/“$0 per session” when `price_cents` is zero, while booking later says “price not set / agree directly” (`expo-app/src/lib/queries.ts:98`; `expo-app/src/screens/DiscoverScreen.tsx:240`; `expo-app/src/overlays/PersonOverlay.tsx:52`; `expo-app/src/overlays/BookingOverlay.tsx:117`). These screens should agree on what zero means.

### G — Coach receives and manages bookings

**Notification producer — connected:** member booking RPC insert at `db/migrations/2026-09-16_enforce_coach_availability.sql:97` → INSERT trigger at `db/migrations/2026-09-15_booking_notifications.sql:48` → coach notification at `db/migrations/2026-09-15_booking_notifications.sql:38`.

**Inbox consumer — connected:** header bell `expo-app/src/screens/DiscoverScreen.tsx:133` → `expo-app/src/state/store.ts:1054` → `expo-app/src/navigation/OverlayRouter.tsx:83` → `expo-app/src/overlays/UtilityOverlays.tsx:285` → `expo-app/src/lib/notifications.ts:36`. This is an inbox read when opened, not push delivery or automatic arrival while viewing it; the effect only depends on `reloads` (`expo-app/src/overlays/UtilityOverlays.tsx:297`).

**Notification action dead end:** tapping an inbox entry only marks it read, and Chat's “Open booking” always opens `My bookings`, which filters `client_id`. A coach receiving a new-booking reminder therefore cannot reach the referenced coaching session via that button (`expo-app/src/overlays/UtilityOverlays.tsx:303`; `expo-app/src/screens/ChatScreen.tsx:156` → `expo-app/src/state/store.ts:1046` → `expo-app/src/lib/bookings.ts:148`). Expected: route that action to the relevant booking side.

**See session/complete — connected:** `expo-app/src/screens/ProfileScreen.tsx:104` → `expo-app/src/navigation/OverlayRouter.tsx:59` → `expo-app/src/overlays/CoachDayViewOverlay.tsx:121` → `expo-app/src/overlays/CoachDayViewOverlay.tsx:50` reads coach-owned bookings in local day bounds. Week arrows/date buttons reach future bookings (`expo-app/src/overlays/CoachDayViewOverlay.tsx:159`, `expo-app/src/overlays/CoachDayViewOverlay.tsx:172`). Mark done requires a started live session and confirmation, updates status and reloads (`expo-app/src/overlays/CoachDayViewOverlay.tsx:91`, `expo-app/src/overlays/CoachDayViewOverlay.tsx:246`, `expo-app/src/overlays/CoachDayViewOverlay.tsx:78`).

**Schedule edit — connected with F06/F07:** Profile → `expo-app/src/overlays/CoachOverlays.tsx:582` → `expo-app/src/overlays/CoachOverlays.tsx:183` → add/remove at `expo-app/src/overlays/CoachOverlays.tsx:197`, `expo-app/src/overlays/CoachOverlays.tsx:207`; mutations reload and show errors (`expo-app/src/overlays/CoachOverlays.tsx:614`). The all-days-off bug and mismatch with client times prevent this from being a reliable end-to-end schedule.

**Actual booked-session management is limited:** Appointment requests reads `appointment_requests`, not the newly confirmed `bookings`; the booking RPC does not insert a request (`expo-app/src/overlays/CoachOverlays.tsx:73`; `db/migrations/2026-09-16_enforce_coach_availability.sql:97`). The screen honestly states its decisions do not reschedule/cancel bookings (`expo-app/src/overlays/CoachOverlays.tsx:451`). Day view offers only Mark done, although the server status policy allows coach cancellation; no coach-facing cancel/reschedule control occurs in these read tools (`expo-app/src/overlays/CoachDayViewOverlay.tsx:209`; `db/hardening.sql:337`). The distinction is functional scope, not a proposed payment/approval flow.

**Cancellation updates stay stale:** the notification trigger runs only after insert, not status change. A cancelled booking can remain the latest “Session reminder,” because Chat chooses the latest notification of type booking without reading its current booking status (`db/migrations/2026-09-15_booking_notifications.sql:48`; `expo-app/src/screens/ChatScreen.tsx:47`). Existing day/inbox views also do not subscribe to changes (`expo-app/src/overlays/CoachDayViewOverlay.tsx:130`; `expo-app/src/overlays/UtilityOverlays.tsx:297`).

### H — Community lifecycle

**Discover — connected:** TabBar `expo-app/src/navigation/TabBar.tsx:50` → Root `expo-app/src/navigation/Root.tsx:153` → `expo-app/src/screens/CommunityScreen.tsx:115` → `expo-app/src/lib/queries.ts:190`, `expo-app/src/lib/queries.ts:199`. Membership UUIDs are translated to the same slug keys used by cards (`expo-app/src/screens/CommunityScreen.tsx:126`). Errors are falsely rendered as empty content (K).

**Join/leave — conditional SQL BREAKS:** card action at `expo-app/src/screens/CommunityScreen.tsx:259` → `expo-app/src/state/store.ts:687` → membership RPC; see F10. If deployed SQL has repaired that trigger, the client updates joined state only after success. It does not update `cm.members`, so the displayed count stays stale until re-fetch (`expo-app/src/state/store.ts:694`; `expo-app/src/screens/CommunityScreen.tsx:256`).

**Owner leave dead end:** the server correctly refuses removing the last owner (`db/hardening.sql:136`). The error tells the user to transfer ownership first, but the roles roster was removed; the leftover role mutator is in-memory only and does not offer ownership (`expo-app/src/components/ErrorBanner.tsx:76`; `expo-app/src/overlays/CommunityOverlays.tsx:77`; `expo-app/src/state/store.ts:797`). A sole owner has no in-app completion path for Leave. Expected: explain the restriction with an actionable supported route.

**Create an event as owner/moderator — connected:** open community at `expo-app/src/screens/CommunityScreen.tsx:216` → `expo-app/src/overlays/CommunityProfileOverlay.tsx:112` → `expo-app/src/state/store.ts:827` → `expo-app/src/overlays/CommunityOverlays.tsx:136` → `expo-app/src/state/store.ts:872` → `expo-app/src/lib/queries.ts:274` → `db/auth.sql:174`. The RPC checks manager role, writes the event, makes the host an attendee, and returns the new event; the store inserts it and opens community detail (`db/auth.sql:179`, `db/auth.sql:184`; `expo-app/src/state/store.ts:880`).

**Ordinary member event request — connected:** My communities → community detail → Suggest event (`expo-app/src/overlays/MyCommunitiesOverlay.tsx:49` → `expo-app/src/overlays/CommunityOverlays.tsx:47` → `expo-app/src/state/store.ts:857` → `expo-app/src/overlays/CommunityOverlays.tsx:158` → `expo-app/src/lib/queries.ts:285` → `db/auth.sql:191`). The server requires actual membership. Approval creates an event (`expo-app/src/overlays/CommunityOverlays.tsx:71` → `expo-app/src/state/store.ts:908` → `expo-app/src/lib/queries.ts:296` → `db/auth.sql:210`). The normal member's inability to directly publish is the existing role contract, not treated as a defect.

**Event-date workflow is incomplete:** the form offers real upcoming dates, but submits only a display string. The RPC never sets `starts_at`; that field is nullable with no default. Event loading explicitly retains null timestamps, so these app-created events never age out of “Happening soon” (`expo-app/src/overlays/CommunityOverlays.tsx:259` → `expo-app/src/state/store.ts:98` → `expo-app/src/lib/queries.ts:279` → `db/auth.sql:181`; `db/schema.sql:313`; `expo-app/src/lib/queries.ts:204`; `expo-app/src/screens/CommunityScreen.tsx:108`). Expected: the chosen instant must drive expiry/order, not just its label.

**RSVP/cancel in the same session — connected:** event card `expo-app/src/screens/CommunityScreen.tsx:200` → `expo-app/src/state/store.ts:1053` → `expo-app/src/overlays/CommunityOverlays.tsx:96` → `expo-app/src/state/store.ts:712` → `expo-app/src/lib/queries.ts:259` → `db/auth.sql:157`. Successful toggle updates the count and local attendance. “You're going” is also the cancel button, without a cancel label (`expo-app/src/overlays/CommunityOverlays.tsx:97`). After restart/account change, F11 applies.

**Duplicate-submit behavior:** create-event/community/suggestion buttons do not pass `writeBusy` to the shared button; the store writes have no busy guard. Two taps can create multiple events or duplicate-name communities (`expo-app/src/overlays/CommunityOverlays.tsx:136`, `expo-app/src/overlays/CommunityOverlays.tsx:158`, `expo-app/src/overlays/CommunityOverlays.tsx:206`; `expo-app/src/state/store.ts:872`, `expo-app/src/state/store.ts:931`; `expo-app/src/components/ui.tsx:81`). The community RPC generates another slug when the name exists (`db/migrations/2026-09-15_release_community_defaults.sql:19`).

**Local/server duplicates:** created communities/events remain in custom arrays; a later Community remount also fetches the same records into remote arrays. Accessors concatenate without deduplication, so repeated rows appear (`expo-app/src/state/store.ts:941`, `expo-app/src/state/store.ts:880`, `expo-app/src/state/store.ts:783`, `expo-app/src/state/store.ts:965`; `expo-app/src/screens/CommunityScreen.tsx:121`, `expo-app/src/screens/CommunityScreen.tsx:140`).

**My communities before opening Community:** Profile opens an overlay that only reads store state. Returning users initially have empty memberships, so it says “You have not joined a community yet” until they visit the Community tab, which owns the fetch (`expo-app/src/screens/ProfileScreen.tsx:132` → `expo-app/src/overlays/MyCommunitiesOverlay.tsx:19`, `expo-app/src/overlays/MyCommunitiesOverlay.tsx:29`; `expo-app/src/state/store.ts:620`; `expo-app/src/screens/CommunityScreen.tsx:123`). Expected: an unloaded membership list should not be presented as proof of no memberships.

### I — Chat start, send, receive, block

**Start — connected:** `expo-app/src/overlays/PersonOverlay.tsx:19` → `expo-app/src/lib/chat.ts:240` → `db/migrations/2026-09-15_user_blocks.sql:156` → `expo-app/src/state/store.ts:1048` → `expo-app/src/navigation/OverlayRouter.tsx:81`. The server rejects self/deleted/blocked counterparts and reuses an existing two-person thread (`db/migrations/2026-09-15_user_blocks.sql:166`, `db/migrations/2026-09-15_user_blocks.sql:174`, `db/migrations/2026-09-15_user_blocks.sql:178`).

**Send — connected:** `expo-app/src/overlays/UtilityOverlays.tsx:169` → `expo-app/src/lib/chat.ts:205` → message insert/select → append actual server row at `expo-app/src/overlays/UtilityOverlays.tsx:177`. Draft clearing occurs only after success; failures retain input and display a banner (`expo-app/src/overlays/UtilityOverlays.tsx:176`, `expo-app/src/overlays/UtilityOverlays.tsx:178`). If the user closes a failed-send thread, its component-local draft is discarded without persistence (`expo-app/src/overlays/UtilityOverlays.tsx:117`, `expo-app/src/overlays/UtilityOverlays.tsx:188`).

**Receive — BREAKS:** F05. Reads recover existing messages on reopen, but there is no live receive while open.

**Block mid-thread — BREAKS as an in-thread workflow:** the thread only retains the counterpart name and renders a back-only header; it discards the counterpart ID returned by the read. There is no block/report/profile control in the composer or thread (`expo-app/src/lib/chat.ts:181` → `expo-app/src/overlays/UtilityOverlays.tsx:136`, `expo-app/src/overlays/UtilityOverlays.tsx:188`). The user must leave and find that person in Discover.

**Block through a discoverable profile — connected:** `expo-app/src/overlays/PersonOverlay.tsx:137` → `expo-app/src/state/store.ts:1002` → `expo-app/src/lib/moderation.ts:287` → `db/migrations/2026-09-15_user_blocks.sql:57`. A trigger prevents subsequent messages in either direction, including a counterpart who kept their thread open (`db/migrations/2026-09-15_user_blocks.sql:124`). That counterpart's composer stays enabled and gets only the generic send error because the client handles an Error instance but Supabase commonly returns a plain error object (`expo-app/src/overlays/UtilityOverlays.tsx:35`, `expo-app/src/overlays/UtilityOverlays.tsx:167`, `expo-app/src/overlays/UtilityOverlays.tsx:180`).

**Unblock dead end after leaving:** blocked people are removed from Discover and their conversations are filtered out. ProfileScreen has no blocked-users management row. Although an already-open Person overlay can unblock, there is no normal route back once it is closed (`expo-app/src/state/store.ts:734`; `expo-app/src/screens/ChatScreen.tsx:38`; `expo-app/src/overlays/PersonOverlay.tsx:144`; `expo-app/src/screens/ProfileScreen.tsx:143`). Expected: the actual counterpart should be reachable for block/unblock from a supported safety entry point.

### J — Profile edit, looking-for, delete

**Load/edit fields — connected:** `expo-app/src/screens/ProfileScreen.tsx:93` → `expo-app/src/overlays/EditProfileOverlay.tsx:26` → `expo-app/src/lib/profiles.ts:80`; name/bio/interests inputs at `expo-app/src/overlays/EditProfileOverlay.tsx:81`, `expo-app/src/overlays/EditProfileOverlay.tsx:84`, `expo-app/src/overlays/EditProfileOverlay.tsx:94`.

**Save — F01 under checked-in grants.** If the deployed privileges permit the upsert, the rest of the connected path updates the account, profile and tags, uploads a selected photo, updates auth display state/revision, refreshes role and closes (`expo-app/src/lib/profiles.ts:107`, `expo-app/src/lib/profiles.ts:115`, `expo-app/src/lib/profiles.ts:119`; `expo-app/src/overlays/EditProfileOverlay.tsx:47`, `expo-app/src/overlays/EditProfileOverlay.tsx:50`). Failures retain the draft and explicitly warn that some changes may already be saved (`expo-app/src/overlays/EditProfileOverlay.tsx:55`).

**Avatar path — connected, runtime untested:** `expo-app/src/overlays/EditProfileOverlay.tsx:35` → `expo-app/src/lib/avatars.ts:24` → size/signature validation at `expo-app/src/lib/avatars.ts:8` → upload at `expo-app/src/lib/avatars.ts:61` → authenticated-owned object path at `expo-app/src/lib/avatars.ts:71` → selected-back account URL update at `expo-app/src/lib/avatars.ts:75`. User cancellation leaves the existing selection; oversized/unsupported files surface errors without discarding other editor fields (`expo-app/src/lib/avatars.ts:28`, `expo-app/src/lib/avatars.ts:30`; `expo-app/src/overlays/EditProfileOverlay.tsx:36`). Deletion of this object is missing from account cleanup (F03).

**Change “what I am looking for” — BREAKS for the persisted partner preference.** Partner discovery reads `goal` and `looking_for`, but the profile model, fetch and save omit them, and the member editor only offers name/bio/interests (`expo-app/src/lib/queries.ts:156`, `expo-app/src/lib/queries.ts:166`; `expo-app/src/lib/profiles.ts:6`, `expo-app/src/lib/profiles.ts:85`, `expo-app/src/lib/profiles.ts:109`; `expo-app/src/overlays/EditProfileOverlay.tsx:81`). The database contains and permits those fields (`db/schema.sql:139`; `db/migrations/2026-09-17_registration_profiles.sql:77`). Editing interests will not clear an old `looking_for`/goal still shown publicly.

If “looking for” means changing discovery between coaches/partners or changing search text, that does work through the segmented control and search field, without changing account role (`expo-app/src/screens/DiscoverScreen.tsx:156`, `expo-app/src/screens/DiscoverScreen.tsx:187`). This is distinct from the persisted public preference.

**Delete — connected initiation, incomplete cleanup:** Profile requires two taps and protects against concurrent deletion (`expo-app/src/screens/ProfileScreen.tsx:214`); the Edge Function validates the caller from their JWT, performs cleanup and auth deletion, and the client signs out (`supabase/functions/delete-account/index.ts:54`; `expo-app/src/lib/session.ts:217`). F03 covers missing personal cleanup. Writes are sequential: an intermediate failure returns after earlier deletes, leaving the account partially modified (`supabase/functions/delete-account/index.ts:80`, `supabase/functions/delete-account/index.ts:96`). The UI reports an error but does not restore those deletions (`expo-app/src/screens/ProfileScreen.tsx:218`). I did not execute this destructive path or inspect any deployed replacement.

### K — Offline, unreachable Supabase, RLS denial, withdrawn module

**K1. Admission/module lookup offline — BREAKS:** F02. The startup anonymous-session failure is only logged; it does not offer a user-facing recovery itself (`expo-app/src/navigation/Root.tsx:38`). A successful later action may retry session creation through `ensureAppSession`, but this does not repair the empty-module trap (`expo-app/src/lib/session.ts:27`; `expo-app/src/navigation/Root.tsx:134`).

**K2. Discovery read failure after admission — connected recovery:** Root uses all-settled, keeps whichever coach/partner reads succeeded, and sets a visible error. Discover and Maps expose Retry (`expo-app/src/navigation/Root.tsx:104`, `expo-app/src/navigation/Root.tsx:109`; `expo-app/src/screens/DiscoverScreen.tsx:210`; `expo-app/src/screens/MapsScreen.tsx:51`). A failed refresh can remove a currently open person from the store; Person/Booking then show an unavailable-subject message rather than distinguishing temporary fetch failure from removal (`expo-app/src/navigation/Root.tsx:107`; `expo-app/src/overlays/PersonOverlay.tsx:16`; `expo-app/src/overlays/BookingOverlay.tsx:45`).

**K3. Community read failure — BREAKS/misleading:** `expo-app/src/screens/CommunityScreen.tsx:135`, `expo-app/src/screens/CommunityScreen.tsx:142`, `expo-app/src/screens/CommunityScreen.tsx:149` convert failed fetches to empty loaded arrays. The user sees “No communities yet” or “No events scheduled yet,” with no retry control (`expo-app/src/screens/CommunityScreen.tsx:196`, `expo-app/src/screens/CommunityScreen.tsx:212`). Membership failure silently retains the previous store value (`expo-app/src/screens/CommunityScreen.tsx:131`), including previous-account state. Expected: distinguish unknown/offline from authoritative emptiness and offer recovery.

**K4. Write offline/RLS denial — generally preserves input and reports failure:** booking/community/event stores catch errors and clear busy state without success transitions (`expo-app/src/state/store.ts:145`, `expo-app/src/state/store.ts:704`, `expo-app/src/state/store.ts:881`, `expo-app/src/state/store.ts:1040`). Error text maps SQL permission and constraint failures; ErrorBanner renders above overlays, then dismisses after six seconds (`expo-app/src/state/store.ts:126`; `expo-app/src/components/ErrorBanner.tsx:24`, `expo-app/src/components/ErrorBanner.tsx:38`). Chat drafts and profile drafts survive failed writes (`expo-app/src/overlays/UtilityOverlays.tsx:178`; `expo-app/src/overlays/EditProfileOverlay.tsx:55`). Client cancel and coach-completion writes select the row back to detect RLS zero-row updates (`expo-app/src/lib/bookings.ts:199`; `expo-app/src/overlays/CoachDayViewOverlay.tsx:84`). These are working defenses; F01/F10 are specific permanent server-contract conflicts, not evidence that all errors are silent.

**K5. Silently missing coach tools after a role-read failure:** Root resets role to USER on identity change, then `refreshRole` swallows a failed lookup. Profile may show Member and omit all coach tools without a retry error, even though profile loading succeeded (`expo-app/src/navigation/Root.tsx:52`, `expo-app/src/navigation/Root.tsx:89`; `expo-app/src/state/store.ts:984`; `expo-app/src/screens/ProfileScreen.tsx:79`, `expo-app/src/screens/ProfileScreen.tsx:97`). The function keeps the old/default value; it does not establish that the account is a member.

**K6. Notification-state false success:** marking one notification read is optimistic; failure shows a banner but does not roll back the local read flag or refresh that item (`expo-app/src/overlays/UtilityOverlays.tsx:303`). Mark-all does trigger reload on failure (`expo-app/src/overlays/UtilityOverlays.tsx:314`). The notification helpers do not select/count the updated rows, so an RLS no-row update can also look successful (`expo-app/src/lib/notifications.ts:57`, `expo-app/src/lib/notifications.ts:68`).

**K7. Withdrawal mid-session — BREAKS:** F12. The decision to use server `my_modules()` and fail closed is retained; the defect is applying a stale answer and failing to apply the latest answer to overlays, not the release model itself.

## Verification limits

- Read and traced auth, signup draft/profile application, Root/tab/overlay routing, Discover/Maps, member bookings, coach requests/schedule/packages/day view, Community and its event/membership overlays, chat, moderation block helpers, notifications, profile/avatar editing and the account-deletion function at the citations above.
- Reviewed the SQL definitions relevant to those paths and searched later migrations for replacements. The module/moderation and admin-web migration records explicitly summarize some live-only definitions; this audit does not certify those deployed bodies (`db/migrations/2026-09-17_module_gate_and_moderation.sql:9`).
- Did not read or exercise Courts/Shop transaction workflows, unrelated admin/accounting operations, payment integrations, or provider console settings. Courts/Shop are outside the first-release paths specified by the task.
- Did not infer push delivery, a guest-activity migration, a deployed grant repair, or external deletion cleanup from comments. Where only a connected path was established, the report says so.


# BOOK'D — Privacy Policy

**Last updated: 18 September 2026**

> **Before you publish this.** Everything below describes what the app and the
> database actually do today — it was written from the live schema, not from a
> template. But three things are placeholders only you can fill in, marked
> `[LIKE THIS]`: the legal entity that operates BOOK'D, the contact address, and
> the governing jurisdiction. It also has not been reviewed by a lawyer. Both
> app stores require a reachable URL for this document before you can submit.

BOOK'D connects people who want coaching or a training partner with people who
offer it. This policy explains what we collect, why, and what you can do about
it.

BOOK'D is operated by **[LEGAL ENTITY NAME, REGISTERED ADDRESS]** ("we", "us").

---

## 1. What we collect

### You give us this directly

| Data | Where it comes from | Why |
|---|---|---|
| Email address | Sign-up, or your Google / Facebook / Microsoft / Apple account if you use one of those to sign in | To identify your account and let you sign back in |
| Display name | Sign-up or your sign-in provider | Shown to other members on your profile, messages and community posts |
| City / area | You type it during onboarding | To show you people and venues near you |
| Profile details — headline, bio, sport, level, session price, specialties | You, if you set up a coach profile | Shown publicly to other members so they can decide whether to book you |
| Whether you joined as a coach or a member, and the sports or hobbies you pick | You, at sign-up, and editable later | Decides which side of Discover you appear on and helps people find you. The base service is free for coaches and members alike |
| Profile picture | You, if you choose one — the app never browses your photo library | Shown next to you across the app. **Your avatar is publicly readable**, so treat it as public |
| Message content | You, when you chat with another member | To deliver your messages |
| Community content — events you create, their title, place and time | You | Shown to members of that community |
| Reports you file about another member | You | So we can review conduct on the platform |

### Collected automatically

| Data | Why | Can you refuse? |
|---|---|---|
| Your location, if you turn it on | To show how far away people are, and to place you on the map | Yes. The app asks first and works without it — you can type your area instead. **You choose how precisely it is shared** (see §1a). |
| Booking records — who, when, the amount and our commission | To show you your bookings and to account for platform commission | No, if you make a booking |

### 1a. Your location, and who sees it

Location is **off until you turn it on**, under Profile → Edit profile. If you
never turn it on, you are not on the map and no position is stored.

When you turn it on you choose one of two levels, and you can change or revoke
it at any time:

| Level | What other members see |
|---|---|
| **Approximate area** (the default) | Your position rounded to about a kilometre. Enough to tell roughly where you train, not enough to find you. |
| **Pin point** | Your position as your device reports it. |

Both show **where you actually are**. We never place you at a made-up nearby
spot: a fake position would mislead the very people you chose to share with,
and would make distances wrong.

Choosing *Pin point* asks your device for precise location. Your operating
system may still give only an approximate fix if that is what you granted it —
that is your choice and we do not work around it.

What is stored is the position your device reported. What is *disclosed* is
rounded to the level you picked, by the server, before it reaches anyone.
**Your stored coordinates are not readable by other members' apps at all** —
not your exact position, and not anyone else's. The only thing published is the
position at your chosen precision.

Blocking applies here: if either of you has blocked the other, neither appears
on the other's map. Turning sharing off removes the stored position and takes
you off the map.

### Local app activity and diagnostics

Starting at each launch, BOOK'D records a limited activity log in device memory:
app launch, onboarding steps and role choices, sign-in actions/provider,
search use (only whether input exists), filter/sort and package selections,
profile/conversation/booking opens, successful community/event/chat/safety and
account actions, and sanitized error codes or standard error types. It never includes contact
details, names, message/chat content, event titles, community names, bios,
search words, precise coordinates, or raw error messages/stacks in that log.

Each record has a sequence number, time, app version when available, and a new
anonymous random session ID generated at launch. That ID is not a device ID
and is not saved between launches. Before account identification the records
are anonymous; after identification, new records can also contain your
internal account ID (`public.users.id`, never your email). Those records are
**pseudonymous and account-linked**, not fully anonymous. Signing out clears
the account ID for subsequent records; earlier records are not relabeled.

**Today, no monitoring provider is connected.** No analytics or crash SDK is
installed, and none of this activity log leaves your device. Collection starts
automatically and has no in-app toggle today. Only the newest 300 pending
records are kept in memory; older records are dropped. The log is not written
to disk and disappears when the app process ends (or the web app reloads).
This does not change the service data sent to Supabase to operate the app.

**Before connecting a monitoring provider**, we must update this policy and
the store privacy/data-safety disclosures and tell you in the app which
provider receives which activity, diagnostic and account-ID fields, why,
whether they are linked to you, where and how long they are retained, and how
to exercise access/deletion and any applicable consent or opt-out choices.
Any required consent must precede connection: connecting a provider can send
the already buffered records as well as future records. At that point the
claim that analytics stays on your device will no longer apply. A failed
provider is paused; collection remains bounded while it is unavailable.

### We do **not** collect

- Payment card details. **BOOK'D does not process payments.** You pay your coach
  directly, at your session. No card, bank or payment credential ever reaches
  us, because there is nowhere in the app to enter one.
- Background location. We only ask for location while the app is open, and
  only after you turn sharing on.
- Camera, contacts, calendar, microphone or health data. The app does not
  request these permissions.
- Your photo library. We never browse it. The picker is the operating system's
  own, and only the single image you choose is sent to us.
- Advertising identifiers. There are currently no ad networks, analytics SDKs
  or connected third-party trackers. The local activity log above is separate
  from advertising or cross-app tracking.

---

## 2. Who can see what

- **Your public profile** — name, city, and (for coaches) headline, bio, sport,
  level and price — is visible to other members. Treat it as public.
- **Your messages** are visible to the people in that conversation, and to us
  only where we need to investigate a report.
- **Your email, phone number and account identifiers are never shown to other
  members.** This is enforced in the database itself: the client application has
  no permission to read those columns at all, not merely a rule against showing
  them.
- **Blocking is private.** If you block someone, they are not told. Neither of
  you can message the other.

---

## 3. Who we share it with

We do not sell your personal data, and we do not share it for advertising.

We use these processors to run the service:

| Processor | What it handles |
|---|---|
| Supabase | Hosts the database, your account and authentication |
| Google / Meta / Microsoft / Apple | Only if you choose to sign in with them, and only to confirm who you are |

We disclose data otherwise only where the law requires it, or where it is
necessary to investigate abuse or protect someone's safety.

---

## 4. How long we keep it

We keep your data while your account exists.

**You can delete your account from inside the app**, under Profile. When you do:

- Your identifying details — name, email, phone, avatar, city and precise
  location — are erased immediately, and your sign-in credential is removed so
  the account cannot be used again.
- Some records are kept in anonymised form, no longer linked to you by name or
  contact details: booking and commission records, which we must retain for
  accounting, and messages you already sent, which belong to the conversation
  the other person also took part in. Deleting your account cannot un-send a
  message someone else has already read, and we do not claim otherwise.

---

## 5. Your rights

Depending on where you live, you can ask us to give you a copy of your data,
correct it, delete it, or stop certain processing. Account deletion is in the
app; for anything else, contact us at **[SUPPORT EMAIL]** and we will respond
within 30 days.

---

## 6. Children

BOOK'D is not intended for children under 13 (or the minimum age in your
country, if it is higher). We do not knowingly collect their data. If you
believe a child has an account, contact us and we will remove it.

---

## 7. Security

Access is enforced in the database by row-level security, so a rule about who
may read a row is applied by the server on every request rather than trusted to
the app. Money amounts are calculated server-side and cannot be set by the app.
No system is perfectly secure, and we will not pretend otherwise.

---

## 8. Changes

If we change this policy we will update the date at the top and, for a
significant change, tell you in the app.

---

## 9. Contact

**[SUPPORT EMAIL]** — questions, requests or complaints.
Governing law: **[JURISDICTION]**.

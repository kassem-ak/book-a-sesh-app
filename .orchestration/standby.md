# Standby brief — BOOK'D design-update pass

Refreshed 2026-09-16. Live document: update after each completed step.

## Objective

The user delivered a new, final design set (25 SVG artboards, now at
`design/svg/`) and asked that the app be brought in line with it, orchestrated
across codex and gemma4.

## Absolute project root

`C:\Users\kasse\Documents\Claued proj\Book-a-sesh` — pass as `cwd` on every
worker call. It is a git repository.

## Branch and state

- Branch: `release-readiness-claude-mem-20260903`, open as PR #18 against `main`.
- Last commit before this pass: `cca292a`.
- 31 commits of release-readiness work already landed; do not revisit them.

## Scope constraint — important

First release ships FOUR modules only: **Discover, Maps, Community, Chat**,
plus the Profile screen and the auth landing gate.

**Courts is deferred to a second release, and Shop is dropped.** The design set
contains `COURTS 1-4.svg` and `Calender 1-5.svg`. Courts artboards are
reference only — do not wire Courts back into navigation. Calendar artboards
apply to the booking flow, which does ship.

## Decisions already made (do not re-litigate)

- Palette comes from the SVGs, not from the older HTML prototype.
- BOOK'D does not take payment; the client pays the coach directly.
- Role is derived server-side from the account, never from a client selector.
- Identity is `com.bookd.app`, scheme `bookd://`.
- Courts/Shop code stays in the tree but unreferenced and unbundled.

## Task list, in execution order

1. gemma4 (read-only): extract a structured spec from all 25 artboards.
2. Claude: review that spec against the running app, cut it to a bounded brief.
3. codex (workspace-write): implement the brief.
4. Claude: review the diff, typecheck, verify in the browser, commit.

## Constraints

- `tsc --noEmit` must stay clean.
- Verify in the browser before claiming a visual change works.
- Do not touch `db/`, `supabase/`, or the release invariants in this pass.
